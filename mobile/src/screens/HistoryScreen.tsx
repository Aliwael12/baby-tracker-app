import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../theme";
import { useLogs } from "../hooks/useLogs";
import { useBaby } from "../context/BabyContext";
import BabySwitcher from "../components/BabySwitcher";
import DayStatsBar, { DayStats } from "../components/DayStatsBar";
import { formatTime, formatDateLabelLong } from "../utils/formatTime";
import { formatDuration } from "../utils/formatDuration";
import type { LogEntry } from "../api/logs";
import { useCallback } from "react";

const TYPE_META: Record<string, { icon: string; label: string }> = {
  pump: { icon: "🍼", label: "Pump" },
  feed: { icon: "🤱", label: "Feed" },
  sleep: { icon: "😴", label: "Sleep" },
  diaper: { icon: "👶", label: "Diaper" },
  shower: { icon: "🚿", label: "Shower" },
  growth: { icon: "📏", label: "Growth" },
};

const DIAPER_STATUS_META: Record<string, { icon: string; label: string }> = {
  empty: { icon: "✅", label: "Empty" },
  wet: { icon: "💧", label: "Wet" },
  dirty: { icon: "💩", label: "Dirty" },
  wet_and_dirty: { icon: "💧💩", label: "Wet & Dirty" },
};

interface DayGroup {
  dateKey: string;
  dateLabel: string;
  logs: LogEntry[];
  stats: DayStats;
}

function groupByDay(logs: LogEntry[]): DayGroup[] {
  const groups = new Map<string, LogEntry[]>();
  for (const log of logs) {
    const key = new Date(log.startTime).toDateString();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(log);
  }
  const result: DayGroup[] = [];
  for (const [dateKey, dayLogs] of groups) {
    const totalTime = (type: string) =>
      dayLogs
        .filter((l) => l.type === type && l.durationMinutes)
        .reduce((s, l) => s + (l.durationMinutes ?? 0), 0);
    const count = (type: string) => dayLogs.filter((l) => l.type === type).length;
    result.push({
      dateKey,
      dateLabel: formatDateLabelLong(dayLogs[0].startTime),
      logs: dayLogs,
      stats: {
        feedTime: totalTime("feed"),
        pumpTime: totalTime("pump"),
        sleepTime: totalTime("sleep"),
        diaperCount: count("diaper"),
        showerCount: count("shower"),
      },
    });
  }
  return result;
}

export default function HistoryScreen() {
  const theme = useTheme();
  const { activeBaby } = useBaby();
  const { logs, loading, refresh } = useLogs("all");
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);

  const days = useMemo(() => groupByDay(logs), [logs]);

  const toggleDay = (key: string) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>History</Text>
            <Text style={styles.subtitle}>
              {days.length} day{days.length !== 1 ? "s" : ""} of activity
              {activeBaby ? ` · ${activeBaby.name}` : ""}
            </Text>
          </View>
          <BabySwitcher />
        </View>

        {loading ? (
          <ActivityIndicator color={theme.primary} style={{ marginTop: 40 }} />
        ) : days.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>No history yet.</Text>
          </View>
        ) : (
          <View style={styles.dayList}>
            {days.map((day) => {
              const expanded = expandedDays.has(day.dateKey);
              return (
                <View key={day.dateKey} style={[styles.dayCard, { backgroundColor: theme.primaryLighter }]}>
                  <TouchableOpacity
                    onPress={() => toggleDay(day.dateKey)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.dayHeader}>
                      <Text style={styles.dayLabel}>{day.dateLabel}</Text>
                      <View style={styles.dayRight}>
                        <Text style={styles.logCount}>
                          {day.logs.length} log{day.logs.length !== 1 ? "s" : ""}
                        </Text>
                        <Text style={styles.chevron}>{expanded ? "▲" : "▼"}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                  <View style={styles.statsBar}>
                    <DayStatsBar stats={day.stats} />
                  </View>
                  {expanded && (
                    <View style={styles.logItems}>
                      {day.logs.map((log) => {
                        const meta = TYPE_META[log.type] || { icon: "❓", label: log.type };
                        const diaperMeta =
                          log.type === "diaper" && log.diaperStatus
                            ? DIAPER_STATUS_META[log.diaperStatus]
                            : null;
                        return (
                          <View
                            key={log.id}
                            style={[styles.logCard, { backgroundColor: "#fff" }]}
                          >
                            <View style={[styles.logIconCircle, { backgroundColor: theme.primaryLighter }]}>
                              <Text style={styles.logIcon}>{meta.icon}</Text>
                            </View>
                            <View style={styles.logInfo}>
                              <View style={styles.logTopRow}>
                                <Text style={styles.logName}>
                                  {meta.label}
                                  {log.side ? (
                                    <Text style={[styles.logSide, { color: theme.primary }]}>
                                      {" "}({log.side === "left" ? "L" : "R"})
                                    </Text>
                                  ) : null}
                                </Text>
                                {log.durationMinutes !== null && log.durationMinutes > 0 && (
                                  <View style={[styles.durBadge, { backgroundColor: theme.primaryLight }]}>
                                    <Text style={[styles.durText, { color: theme.pillText }]}>
                                      {formatDuration(log.durationMinutes)}
                                    </Text>
                                  </View>
                                )}
                              </View>
                              <View style={styles.logTimeRow}>
                                <Text style={styles.logTime}>{formatTime(log.startTime)}</Text>
                                {log.endTime && (
                                  <>
                                    <Text style={styles.logArrow}>→</Text>
                                    <Text style={styles.logTime}>{formatTime(log.endTime)}</Text>
                                  </>
                                )}
                              </View>
                              {diaperMeta && (
                                <View style={styles.diaperBadge}>
                                  <Text style={styles.diaperBadgeText}>
                                    {diaperMeta.icon} {diaperMeta.label}
                                  </Text>
                                </View>
                              )}
                              {log.comments ? (
                                <Text style={styles.logComment}>&ldquo;{log.comments}&rdquo;</Text>
                              ) : null}
                              <Text style={styles.logBy}>by {log.enteredByName}</Text>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  title: { fontSize: 24, fontWeight: "800", color: "#1a1a1a" },
  subtitle: { fontSize: 13, color: "#aaa", marginTop: 2 },
  empty: { alignItems: "center", paddingTop: 60 },
  emptyIcon: { fontSize: 40, marginBottom: 8 },
  emptyText: { fontSize: 14, color: "#ccc" },
  dayList: { gap: 14 },
  dayCard: { borderRadius: 18, padding: 14 },
  dayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dayLabel: { fontSize: 14, fontWeight: "700", color: "#1a1a1a" },
  dayRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  logCount: { fontSize: 11, color: "#aaa" },
  chevron: { fontSize: 11, color: "#aaa" },
  statsBar: { marginTop: 8 },
  logItems: { marginTop: 10, gap: 6 },
  logCard: {
    borderRadius: 14,
    padding: 10,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  logIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  logIcon: { fontSize: 17 },
  logInfo: { flex: 1 },
  logTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  logName: { fontSize: 13, fontWeight: "700", color: "#1a1a1a" },
  logSide: { fontSize: 12, fontWeight: "400" },
  durBadge: { borderRadius: 20, paddingHorizontal: 7, paddingVertical: 2 },
  durText: { fontSize: 10, fontWeight: "700" },
  logTimeRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 1 },
  logTime: { fontSize: 11, color: "#aaa" },
  logArrow: { fontSize: 11, color: "#ccc" },
  diaperBadge: {
    marginTop: 3,
    backgroundColor: "#fffbeb",
    borderRadius: 20,
    paddingHorizontal: 7,
    paddingVertical: 2,
    alignSelf: "flex-start",
  },
  diaperBadgeText: { fontSize: 10, color: "#b45309", fontWeight: "600" },
  logComment: { fontSize: 11, color: "#888", fontStyle: "italic", marginTop: 3 },
  logBy: { fontSize: 10, color: "#ccc", marginTop: 2 },
});
