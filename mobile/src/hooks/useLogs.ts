import { useState, useEffect, useCallback } from "react";
import { fetchLogs, deleteLog, LogEntry } from "../api/logs";
import { useBaby } from "../context/BabyContext";

export function useLogs(limit: number | "all" = 200) {
  const { activeBaby } = useBaby();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!activeBaby) {
      setLogs([]);
      setLoading(false);
      return;
    }
    try {
      const data = await fetchLogs(activeBaby.id, limit);
      setLogs(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [activeBaby, limit]);

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

  return { logs, loading, refresh, handleDelete };
}
