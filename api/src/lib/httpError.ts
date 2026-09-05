/**
 * An error that is safe to show a parent.
 *
 * Anything thrown that is NOT an AppError is treated as a bug: it gets logged
 * in full and the client receives a generic apology. That way a Prisma stack
 * trace or a null-dereference can never reach the app as "Internal server
 * error 500".
 */
export class AppError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    /** Machine-readable hint so the app can react (e.g. sign the user out). */
    public readonly code?: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const badRequest = (message: string, code?: string) =>
  new AppError(400, message, code);

export const unauthorized = (message = "Please sign in again.", code = "unauthorized") =>
  new AppError(401, message, code);

export const forbidden = (message: string, code?: string) =>
  new AppError(403, message, code);

export const notFound = (message: string, code?: string) =>
  new AppError(404, message, code);

export const conflict = (message: string, code?: string) =>
  new AppError(409, message, code);

/**
 * True when the database refused the query because there was no connection to
 * be had, rather than because of anything in the query itself.
 *
 * Matched on the message text, which is genuinely the only signal available: a
 * full pool arrives as a PrismaClientUnknownRequestError, and that class
 * carries neither `code` nor `errorCode` — just the pooler's own FATAL passed
 * through verbatim. The two strings cover Supabase's session mode
 * (EMAXCONNSESSION) and plain Postgres past max_connections; Prisma's own
 * pool timeout (P2024) is a code and is handled with the rest of them below.
 */
function isConnectionExhausted(message: unknown): boolean {
  if (typeof message !== "string") return false;
  return (
    message.includes("EMAXCONNSESSION") ||
    message.includes("max clients reached") ||
    message.includes("too many clients already")
  );
}

/** Busy, not broken: the caller should try the same request again. */
const dbBusy = () =>
  new AppError(
    503,
    "The server is busy right now. Please try again in a moment.",
    "db_busy"
  );

/**
 * Turn a Prisma failure into something a person can act on. These are the only
 * database errors that are really the user's doing; everything else is a bug on
 * our side and stays generic.
 *
 * "The user's doing" has one deliberate exception: a database that is refusing
 * connections is nobody's doing, but it is emphatically not a bug in the
 * request either, and answering it as a 500 tells the app the one thing that
 * isn't true — that trying again is pointless. Those get a 503 so the client
 * can retry and say something honest meanwhile.
 */
export function friendlyPrismaMessage(err: unknown): AppError | null {
  const e = err as {
    code?: string;
    errorCode?: string;
    message?: string;
    meta?: { target?: string[] | string };
  };

  // Checked before the code, because the error this fires on has no code at
  // all — see isConnectionExhausted.
  if (isConnectionExhausted(e?.message)) return dbBusy();

  /*
   * Prisma reports its error code under two different property names:
   * PrismaClientKnownRequestError carries `code`, while
   * PrismaClientInitializationError — which is what a database that cannot be
   * reached at all produces — carries `errorCode`. Reading only the first made
   * the P1001/P1002 branch below unreachable, so every connection failure fell
   * through to the generic 500 instead of the 503 it was written to return.
   */
  const code = typeof e?.code === "string" ? e.code : e?.errorCode;
  if (typeof code !== "string" || !code.startsWith("P")) return null;

  const target = Array.isArray(e.meta?.target)
    ? e.meta?.target.join(", ")
    : e.meta?.target;

  switch (code) {
    case "P2002":
      return conflict(
        target?.includes("email")
          ? "That email address is already in use."
          : "That already exists.",
        "duplicate"
      );
    case "P2003":
      return badRequest("That refers to something that no longer exists.", "fk");
    case "P2025":
      return notFound("That item no longer exists — it may have been deleted.", "gone");
    // Prisma's own pool ran dry waiting for a connection. Same situation as
    // isConnectionExhausted, one layer further out.
    case "P2024":
      return dbBusy();
    case "P1001":
    case "P1002":
      return new AppError(
        503,
        "Can't reach the server right now. Please try again in a moment.",
        "db_unreachable"
      );
    default:
      return null;
  }
}
