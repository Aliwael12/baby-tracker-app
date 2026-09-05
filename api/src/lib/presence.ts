import prisma from "./prisma";

/**
 * "Active" means the account did something in the app in the last 36 hours.
 *
 * Thirty-six rather than twenty-four because of what this app is for: a parent
 * who logs the 2am feed and then the next night's 11pm one is plainly still
 * using it, and a 24-hour window would call them dormant in between. A day and
 * a half spans one skipped day without stretching so far that a genuinely
 * lapsed account looks alive.
 */
export const ACTIVE_WINDOW_HOURS = 36;

export function activeSince(now = new Date()): Date {
  return new Date(now.getTime() - ACTIVE_WINDOW_HOURS * 60 * 60 * 1000);
}

/**
 * How stale `lastSeenAt` has to be before a request bothers to rewrite it.
 *
 * The column exists so that reading counts as using the app — otherwise a
 * parent who opens the app ten times a day to check the last feed, without
 * ever writing anything, reads as dormant. But it is a heartbeat, not an audit
 * log: five-minute resolution is far finer than a 36-hour window needs, and it
 * turns a busy session's hundred requests into one write.
 */
const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000;

/**
 * When this container last actually wrote a heartbeat for a given account.
 *
 * The staleness test already rides in the UPDATE's WHERE clause, so a recently
 * seen account has always cost zero writes — but it still cost a *connection*,
 * on every authenticated request, to run a statement that matched no rows.
 * That is not free anywhere and it is expensive on a pooled database: the
 * heartbeat was competing for the same small pool as the queries a parent is
 * actually waiting on, and turned each screen load into half again as many
 * connection acquisitions as it had requests.
 *
 * Remembering the answer in the container skips the round trip entirely. It is
 * per-container rather than shared, so N warm containers write at most N
 * heartbeats per interval instead of one — which is still a rounding error
 * against one per request, and the column feeds a 36-hour window (see
 * ACTIVE_WINDOW_HOURS) that could not care less.
 */
const lastTouched = new Map<number, number>();

/**
 * A ceiling on that map, because it is keyed by account id and a long-lived
 * container would otherwise hold one entry per account that has ever used it.
 * Cleared wholesale rather than evicted one at a time: losing the memo costs
 * one redundant UPDATE per account, so there is nothing here worth the code to
 * keep an LRU honest.
 */
const MAX_REMEMBERED = 5_000;

/**
 * Stamp that this account was just seen.
 *
 * Deliberately not awaited by callers: this is telemetry sitting in front of
 * every authenticated request in the app, and no parent should wait on a round
 * trip for it. A single conditional UPDATE, with no SELECT first — the
 * staleness test rides in the WHERE clause, so an account seen a minute ago
 * costs one statement that matches no rows rather than a read plus a write.
 *
 * If it loses the race with a serverless container shutting down, nothing
 * breaks: the dashboard treats lastSeenAt as one of several candidates for
 * "last active", and any real use of the app leaves other traces with their own
 * timestamps.
 */
export function touchAccount(accountId: number): void {
  // A guard, not a formality. This is an updateMany, and Prisma treats an
  // `undefined` field in a where clause as "not filtering on it" rather than as
  // "matches nothing" — so a bad id here does not skip the write, it drops the
  // id condition and stamps every account in the table. That has happened
  // exactly once, from a token that carried no accountId, and the column is
  // cheap to defend at the door.
  if (!Number.isInteger(accountId) || accountId <= 0) return;

  const now = Date.now();
  const seen = lastTouched.get(accountId);
  if (seen !== undefined && now - seen < HEARTBEAT_INTERVAL_MS) return;

  if (lastTouched.size >= MAX_REMEMBERED) lastTouched.clear();
  // Recorded before the write rather than after it, so a burst of concurrent
  // requests sends one heartbeat between them instead of each seeing an
  // un-updated map and sending its own. A write that then fails simply waits
  // for the next interval — see the catch below for why that is fine.
  lastTouched.set(accountId, now);

  const stampedAt = new Date(now);
  prisma.account
    .updateMany({
      where: {
        id: accountId,
        OR: [
          { lastSeenAt: null },
          { lastSeenAt: { lt: new Date(now - HEARTBEAT_INTERVAL_MS) } },
        ],
      },
      data: { lastSeenAt: stampedAt },
    })
    .catch(() => {
      // A missed heartbeat is not worth failing, or even logging, a request the
      // parent is waiting on. Notably this now also swallows a pool that was
      // full — which is the point: the heartbeat must never be the thing that
      // takes the last connection, nor the thing that complains about it.
    });
}
