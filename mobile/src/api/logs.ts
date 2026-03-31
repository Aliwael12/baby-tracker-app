import apiClient from "./client";

export interface LogEntry {
  id: number;
  type: string;
  side: string | null;
  diaperStatus: string | null;
  weightKg: number | null;
  heightCm: number | null;
  startTime: string;
  endTime: string | null;
  durationMinutes: number | null;
  comments: string | null;
  enteredByName: string;
  createdAt: string;
}

export async function fetchLogs(
  babyId: number,
  limit: number | "all" = 200
): Promise<LogEntry[]> {
  const res = await apiClient.get<LogEntry[]>("/logs", {
    params: { babyId, limit },
  });
  return res.data;
}

export async function createLog(data: {
  babyId: number;
  type: string;
  side?: string | null;
  diaperStatus?: string | null;
  weightKg?: number | null;
  heightCm?: number | null;
  startTime: string;
  endTime?: string | null;
  comments?: string | null;
  enteredByName: string;
}): Promise<LogEntry> {
  const res = await apiClient.post<LogEntry>("/logs", data);
  return res.data;
}

export async function deleteLog(id: number): Promise<void> {
  await apiClient.delete(`/logs/${id}`);
}
