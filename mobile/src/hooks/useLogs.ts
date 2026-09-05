import { useState, useEffect, useCallback, useRef } from "react";
import { fetchLogs, deleteLog, LogEntry } from "../api/logs";
import { getErrorMessage } from "../lib/errors";
import { useBaby } from "../context/BabyContext";

export interface UseLogsOptions {
  /**
   * Fetch only this activity type, on the server.
   *
   * A screen that shows one kind of entry has no business downloading every
   * other kind and discarding them — Medical wants fourteen health rows, not
   * three thousand rows it will filter down to fourteen.
   */
  type?: string | null;
  /**
   * Fetch a page at a time and expose `loadMore`. Without it the hook keeps
   * its old behaviour: one request, everything up to `limit`.
   */
  paginate?: boolean;
}

export interface UseLogsResult {
  logs: LogEntry[];
  loading: boolean;
  refresh: () => Promise<void>;
  handleDelete: (id: number) => Promise<void>;
  /** Fetch the next page. No-op unless `paginate` is set. */
  loadMore: () => void;
  loadingMore: boolean;
  /** False once a short page comes back — there is nothing after it. */
  hasMore: boolean;
  /**
   * Why the last refresh failed, or null if it didn't.
   *
   * The rows themselves deliberately survive a failure — blanking a screen a
   * parent is reading because one poll didn't land would be worse than showing
   * it a moment stale. But "kept the old rows" and "these are the current rows"
   * are not the same claim, and for a long time this hook made both of them
   * identically, by swallowing the error and returning the stale array with no
   * way to tell. That is what made an outage read as the app merely being slow.
   */
  error: string | null;
}

export function useLogs(
  limit: number | "all" = 200,
  options: UseLogsOptions = {}
): UseLogsResult {
  const { activeBaby } = useBaby();
  /**
   * Keyed on the id, not on the baby object.
   *
   * BabyContext sets activeBaby twice on a cold start — once from its cached
   * list, then again from /me — and those are two different objects describing
   * the same baby. Depending on the object made `refresh` a new function each
   * time, which re-ran the effect below and fetched the whole log a second time
   * for no new data. The id only changes when the baby actually does.
   */
  const babyId = activeBaby?.id;
  const { type = null, paginate = false } = options;

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pageSize = typeof limit === "number" ? limit : 0;

  /**
   * Guards a page request against the one before it.
   *
   * FlatList fires onEndReached more than once around the threshold, and a
   * refresh can land mid-page. Both would otherwise append the same rows twice
   * or resurrect entries from a baby you've just switched away from.
   */
  const requestRef = useRef(0);

  const refresh = useCallback(async () => {
    const request = ++requestRef.current;
    if (!babyId) {
      setLogs([]);
      setHasMore(false);
      setError(null);
      setLoading(false);
      return;
    }
    try {
      const data = await fetchLogs(babyId, limit, { type });
      if (request !== requestRef.current) return;
      setLogs(data);
      setHasMore(paginate && pageSize > 0 && data.length === pageSize);
      setError(null);
    } catch (err) {
      // Whatever is on screen stays there — see `error` on the result type.
      if (request === requestRef.current) setError(getErrorMessage(err));
    } finally {
      if (request === requestRef.current) setLoading(false);
    }
  }, [babyId, limit, type, paginate, pageSize]);

  const loadMore = useCallback(() => {
    if (!paginate || !babyId || !hasMore || loadingMore || loading) return;
    const cursor = logs[logs.length - 1]?.id;
    if (!cursor) return;

    const request = requestRef.current;
    setLoadingMore(true);
    fetchLogs(babyId, limit, { type, cursor })
      .then((page) => {
        // A refresh or a baby switch happened while this page was in flight;
        // appending it now would splice old rows into a new list.
        if (request !== requestRef.current) return;
        setLogs((prev) => {
          const seen = new Set(prev.map((l) => l.id));
          return [...prev, ...page.filter((l) => !seen.has(l.id))];
        });
        setHasMore(pageSize > 0 && page.length === pageSize);
      })
      .catch(() => {
        // Leave hasMore alone: a failed page is worth another scroll, whereas
        // clearing it would end the list at whatever happened to be loaded.
      })
      .finally(() => {
        if (request === requestRef.current) setLoadingMore(false);
      });
  }, [paginate, babyId, hasMore, loadingMore, loading, logs, limit, type, pageSize]);

  useEffect(() => {
    setLoading(true);
    refresh();
  }, [refresh]);

  const handleDelete = useCallback(
    async (id: number) => {
      // Optimistic remove
      setLogs((prev) => prev.filter((l) => l.id !== id));
      try {
        await deleteLog(id);
      } catch {
        // Revert on error
        refresh();
      }
    },
    [refresh]
  );

  return { logs, loading, refresh, handleDelete, loadMore, loadingMore, hasMore, error };
}
