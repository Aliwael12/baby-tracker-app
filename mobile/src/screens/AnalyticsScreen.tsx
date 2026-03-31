import React, { useMemo, useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../theme";
import { useLogs } from "../hooks/useLogs";
import { useBaby } from "../context/BabyContext";
import BabySwitcher from "../components/BabySwitcher";
import StatCard from "../components/StatCard";
import { formatMinutes } from "../utils/formatDuration";
import type { LogEntry } from "../api/logs";

interface DayStats {
  dateKey: string;
  dateLabel: string;
  feedTime: number;
  pumpTime: number;
  sleepTime: number;
  diaperCount: number;
  showerCount: number;
  totalLogs: number;
}

function getDayKey(iso: string): string {
  return new Date(iso).toDateString();
}

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });
}

function computeAllDayStats(logs: LogEntry[]): DayStats[] {
  const groups = new Map<string, LogEntry[]>();
  for (const log of logs) {
    const key = getDayKey(log.startTime);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(log);
  }
  const results: DayStats[] = [];
  for (const [dateKey, dayLogs] of groups) {
    const totalTime = (type: string) =>
      dayLogs
        .filter((l) => l.type === type && l.durationMinutes)
        .reduce((s, l) => s + (l.durationMinutes ?? 0), 0);
    const count = (type: string) => dayLogs.filter((l) => l.type === type).length;
    results.push({
      dateKey,
      dateLabel: formatDateShort(dayLogs[0].startTime),
      feedTime: totalTime("feed"),
      pumpTime: totalTime("pump"),
      sleepTime: totalTime("sleep"),
      diaperCount: count("diaper"),
      showerCount: count("shower"),
      totalLogs: dayLogs.length,
    });
  }
  return results;
}

export default function AnalyticsScreen() {
  const theme = useTheme();
  const { activeBaby } = useBaby();
  const { logs, loading, refresh } = useLogs("all");
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const { dayStats, todayStats, avgStats, totalStats, dayCount } = useMemo(() => {
    const allDays = computeAllDayStats(logs);
    const count = allDays.length || 1;
    const todayKey = new Date().toDateString();
    const today = allDays.find((d) => d.dateKey === todayKey) || {
      feedTime: 0, pumpTime: 0, sleepTime: 0,
      diaperCount: 0, showerCount: 0, totalLogs: 0,
    };
    const sum = (fn: (d: DayStats) => number) =>
      allDays.reduce((s, d) => s + fn(d), 0);
    return {
      dayStats: allDays,
      todayStats: today,
      dayCount: count,
      avgStats: {
        feedTime: sum((d) => d.feedTime) / count,
        pumpTime: sum((d) => d.pumpTime) / count,
        sleepTime: sum((d) => d.sleepTime) / count,
        diaperCount: sum((d) => d.diaperCount) / count,
        showerCount: sum((d) => d.showerCount) / count,
      },
      totalStats: {
        feedTime: sum((d) => d.feedTime),
        pumpTime: sum((d) => d.pumpTime),
        sleepTime: sum((d) => d.sleepTime),
        diaperCount: sum((d) => d.diaperCount),
        showerCount: sum((d) => d.showerCount),
        totalLogs: sum((d) => d.totalLogs),
      },
    };
  }, [logs]);

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
            <Text style={styles.title}>Analytics</Text>
            <Text style={styles.subtitle}>
              {dayCount} day{dayCount !== 1 ? "s" : ""} tracked
              {activeBaby ? ` · ${activeBaby.name}` : ""}
            </Text>
          </View>
          <BabySwitcher />
        </View>

        {loading ? (
          <ActivityIndicator color={theme.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            <View style={styles.cards}>
              <StatCard
                icon="🤱"
                label="Feeding"
                today={formatMinutes(todayStats.feedTime)}
                avg={formatMinutes(Math.round(avgStats.feedTime))}
                total={formatMinutes(totalStats.feedTime)}
              />
              <StatCard
                icon="🍼"
                label="Pumping"
                today={formatMinutes(todayStats.pumpTime)}
                avg={formatMinutes(Math.round(avgStats.pumpTime))}
                total={formatMinutes(totalStats.pumpTime)}
              />
              <StatCard
                icon="😴"
                label="Sleep"
                today={formatMinutes(todayStats.sleepTime)}
                avg={formatMinutes(Math.round(avgStats.sleepTime))}
                total={formatMinutes(totalStats.sleepTime)}
              />
              <StatCard
                icon="👶"
                label="Diapers"
                today={String(todayStats.diaperCount)}
                avg={avgStats.diaperCount.toFixed(1)}
                total={String(totalStats.diaperCount)}
              />
              <StatCard
                icon="🚿"
                label="Showers"
                today={String(todayStats.showerCount)}
                avg={avgStats.showerCount.toFixed(1)}
                total={String(totalStats.showerCount)}
              />
            </View>

            {/* Daily breakdown table */}
            {dayStats.length > 1 && (
              <View style={styles.tableSection}>
                <Text style={[styles.tableTitle, { color: theme.primary }]}>
                  DAILY BREAKDOWN
                </Text>
                <View style={[styles.tableCard, { borderColor: theme.primaryLight }]}>
                  {/* Table header */}
                  <View style={[styles.tableRow, styles.tableHead, { backgroundColor: theme.primaryLighter }]}>
                    <Text style={[styles.thDate, styles.th]}>Date</Text>
                    <Text style={styles.th}>🤱</Text>
                    <Text style={styles.th}>🍼</Text>
                    <Text style={styles.th}>😴</Text>
                    <Text style={styles.th}>👶</Text>
                    <Text style={styles.th}>🚿</Text>
                  </View>
                  {dayStats.map((day, i) => (
                    <View
                      key={day.dateKey}
                      style={[
                        styles.tableRow,
                        { backgroundColor: i % 2 === 0 ? "#fff" : theme.primaryLighter },
                      ]}
                    >
                      <Text style={[styles.tdDate, styles.td]}>{day.dateLabel}</Text>
                      <Text style={styles.td}>
                        {day.feedTime > 0 ? formatMinutes(day.feedTime) : "—"}
                      </Text>
                      <Text style={styles.td}>
                        {day.pumpTime > 0 ? formatMinutes(day.pumpTime) : "—"}
                      </Text>
                      <Text style={styles.td}>
                        {day.sleepTime > 0 ? formatMinutes(day.sleepTime) : "—"}
                      </Text>
                      <Text style={styles.td}>
                        {day.diaperCount > 0 ? String(day.diaperCount) : "—"}
                      </Text>
                      <Text style={styles.td}>
                        {day.showerCount > 0 ? String(day.showerCount) : "—"}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </>
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
  cards: { gap: 12, marginBottom: 24 },
  tableSection: { marginTop: 8 },
  tableTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
    textAlign: "center",
    textTransform: "uppercase",
    marginBottom: 12,
  },
  tableCard: {
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#f0f0f0",
  },
  tableHead: { borderBottomWidth: 1, borderBottomColor: "#e8e8e8" },
  th: {
    flex: 1,
    fontSize: 13,
    textAlign: "center",
    fontWeight: "700",
    color: "#888",
  },
  thDate: { flex: 2, textAlign: "left" },
  td: {
    flex: 1,
    fontSize: 12,
    textAlign: "center",
    color: "#555",
  },
  tdDate: { flex: 2, textAlign: "left", color: "#333", fontWeight: "600" },
});
