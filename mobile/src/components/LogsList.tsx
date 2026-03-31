import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import type { LogEntry } from "../api/logs";
import { formatTime, formatDateLabel } from "../utils/formatTime";
import { formatDuration, formatGapLabel } from "../utils/formatDuration";
import { useTheme } from "../theme";
import SwipeableRow from "./SwipeableRow";
import DeleteConfirmModal from "./DeleteConfirmModal";

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

const FILTER_OPTIONS = [
  { value: null, label: "All" },
  { value: "pump", icon: "🍼", label: "Pump" },
  { value: "feed", icon: "🤱", label: "Feed" },
  { value: "sleep", icon: "😴", label: "Sleep" },
  { value: "diaper", icon: "👶", label: "Diaper" },
  { value: "shower", icon: "🚿", label: "Shower" },
] as const;

function computeGaps(logs: LogEntry[]): Map<number, number | null> {
  const gaps = new Map<number, number | null>();
  const lastByType = new Map<string, Date>();
  const sorted = [...logs].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );
  for (const log of sorted) {
    const prev = lastByType.get(log.type);
    if (prev) {
      gaps.set(log.id, (new Date(log.startTime).getTime() - prev.getTime()) / 60000);
    } else {
      gaps.set(log.id, null);
    }
    lastByType.set(log.type, new Date(log.startTime));
  }
  return gaps;
}

interface Props {
  logs: LogEntry[];
  onDelete?: (id: number) => void;
}

export default function LogsList({ logs, onDelete }: Props) {
  const theme = useTheme();
  const [filter, setFilter] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  if (logs.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>📋</Text>
        <Text style={styles.emptyText}>No activities logged yet.</Text>
      </View>
    );
  }

  const filteredLogs = filter ? logs.filter((l) => l.type === filter) : logs;
  const gaps = computeGaps(logs);
  let lastDate = "";

  return (
    <View>
      {/* Filter pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pillsRow}
      >
        {FILTER_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value ?? "all"}
            onPress={() => setFilter(opt.value)}
            style={[
              styles.pill,
              {
                backgroundColor:
                  filter === opt.value ? theme.primary : theme.primaryLighter,
              },
            ]}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.pillText,
                { color: filter === opt.value ? "#fff" : theme.pillText },
              ]}
            >
              {"icon" in opt && opt.icon ? `${opt.icon} ` : ""}
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Log rows */}
      <View style={styles.list}>
        {filteredLogs.map((log) => {
          const meta = TYPE_META[log.type] || { icon: "❓", label: log.type };
          const dateLabel = formatDateLabel(log.startTime);
          const showHeader = dateLabel !== lastDate;
          lastDate = dateLabel;
          const gap = gaps.get(log.id);
          const showGap = gap !== null && gap !== undefined && log.type === "feed";
          const diaperMeta =
            log.type === "diaper" && log.diaperStatus
              ? DIAPER_STATUS_META[log.diaperStatus]
              : null;

          return (
            <View key={log.id}>
              {showHeader && (
                <Text style={[styles.dateHeader, { color: theme.primary }]}>
                  {dateLabel}
                </Text>
              )}
              <SwipeableRow onDelete={() => setPendingDeleteId(log.id)}>
                <View style={styles.logCard}>
                  <View style={[styles.iconCircle, { backgroundColor: theme.primaryLighter }]}>
                    <Text style={styles.iconEmoji}>{meta.icon}</Text>
                  </View>
                  <View style={styles.logContent}>
                    <View style={styles.logTopRow}>
                      <Text style={styles.logTitle}>
                        {meta.label}
                        {log.side ? (
                          <Text style={[styles.sideLabel, { color: theme.primary }]}>
                            {" "}({log.side === "left" ? "L" : "R"})
                          </Text>
                        ) : null}
                      </Text>
                      {log.durationMinutes !== null && log.durationMinutes > 0 && (
                        <View style={[styles.durationBadge, { backgroundColor: theme.primaryLight }]}>
                          <Text style={[styles.durationText, { color: theme.pillText }]}>
                            {formatDuration(log.durationMinutes)}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.timeRow}>
                      <Text style={styles.timeText}>{formatTime(log.startTime)}</Text>
                      {log.endTime && (
                        <>
                          <Text style={styles.timeArrow}>→</Text>
                          <Text style={styles.timeText}>{formatTime(log.endTime)}</Text>
                        </>
                      )}
                    </View>
                    {showGap && (
                      <View style={styles.gapBadge}>
                        <Text style={styles.gapText}>
                          ⏱ {formatGapLabel(gap!)} since previous feed
                        </Text>
                      </View>
                    )}
                    {diaperMeta && (
                      <View style={styles.diaperBadge}>
                        <Text style={styles.diaperBadgeText}>
                          {diaperMeta.icon} {diaperMeta.label}
                        </Text>
                      </View>
                    )}
                    {log.type === "growth" && (log.weightKg || log.heightCm) && (
                      <View style={styles.growthRow}>
                        {log.weightKg !== null && (
                          <View style={styles.weightBadge}>
                            <Text style={styles.weightText}>⚖️ {log.weightKg} kg</Text>
                          </View>
                        )}
                        {log.heightCm !== null && (
                          <View style={styles.heightBadge}>
                            <Text style={styles.heightText}>📏 {log.heightCm} cm</Text>
                          </View>
                        )}
                      </View>
                    )}
                    {log.comments ? (
                      <Text style={styles.comments}>&ldquo;{log.comments}&rdquo;</Text>
                    ) : null}
                    <Text style={styles.byLine}>by {log.enteredByName}</Text>
                  </View>
                </View>
              </SwipeableRow>
            </View>
          );
        })}
      </View>

      <DeleteConfirmModal
        visible={pendingDeleteId !== null}
        onConfirm={() => {
          if (pendingDeleteId !== null) {
            onDelete?.(pendingDeleteId);
            setPendingDeleteId(null);
          }
        }}
        onCancel={() => setPendingDeleteId(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { paddingVertical: 48, alignItems: "center" },
  emptyIcon: { fontSize: 36, marginBottom: 8 },
  emptyText: { fontSize: 13, color: "#ccc" },
  pillsRow: { paddingHorizontal: 4, paddingBottom: 12, gap: 6 },
  pill: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  pillText: { fontSize: 12, fontWeight: "700" },
  list: { gap: 8 },
  dateHeader: {
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    paddingTop: 12,
    paddingBottom: 4,
  },
  logCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  iconEmoji: { fontSize: 20 },
  logContent: { flex: 1, minWidth: 0 },
  logTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  logTitle: { fontSize: 14, fontWeight: "700", color: "#1a1a1a" },
  sideLabel: { fontSize: 13, fontWeight: "400" },
  durationBadge: {
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  durationText: { fontSize: 11, fontWeight: "700" },
  timeRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  timeText: { fontSize: 12, color: "#aaa" },
  timeArrow: { fontSize: 12, color: "#ccc" },
  gapBadge: {
    marginTop: 4,
    backgroundColor: "#eff6ff",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  gapText: { fontSize: 11, color: "#3b82f6", fontWeight: "600" },
  diaperBadge: {
    marginTop: 4,
    backgroundColor: "#fffbeb",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  diaperBadgeText: { fontSize: 11, color: "#b45309", fontWeight: "600" },
  growthRow: { flexDirection: "row", gap: 6, marginTop: 4 },
  weightBadge: {
    backgroundColor: "#eff6ff",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  weightText: { fontSize: 11, color: "#3b82f6", fontWeight: "600" },
  heightBadge: {
    backgroundColor: "#f0fdf4",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  heightText: { fontSize: 11, color: "#16a34a", fontWeight: "600" },
  comments: { fontSize: 12, color: "#888", fontStyle: "italic", marginTop: 4 },
  byLine: { fontSize: 10, color: "#ccc", marginTop: 3 },
});
