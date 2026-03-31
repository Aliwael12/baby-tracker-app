import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../theme";
import { useLogs } from "../hooks/useLogs";
import { useBaby } from "../context/BabyContext";
import { useAuth } from "../context/AuthContext";
import BabySwitcher from "../components/BabySwitcher";
import { createLog } from "../api/logs";
import { formatDateLabel } from "../utils/formatTime";

export default function GrowthScreen() {
  const theme = useTheme();
  const { activeBaby } = useBaby();
  const { account } = useAuth();
  const { logs, loading, refresh } = useLogs("all");
  const [showForm, setShowForm] = useState(false);
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const growthLogs = useMemo(
    () => logs.filter((l) => l.type === "growth"),
    [logs]
  );
  const latestWeight = useMemo(
    () => growthLogs.find((l) => l.weightKg !== null) || null,
    [growthLogs]
  );
  const latestHeight = useMemo(
    () => growthLogs.find((l) => l.heightCm !== null) || null,
    [growthLogs]
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const handleSave = async () => {
    if (!weight && !height) {
      Alert.alert("Error", "Enter weight or height");
      return;
    }
    if (!activeBaby) return;
    setSaving(true);
    const now = new Date();
    try {
      await createLog({
        babyId: activeBaby.id,
        type: "growth",
        weightKg: weight ? parseFloat(weight) : null,
        heightCm: height ? parseFloat(height) : null,
        startTime: now.toISOString(),
        endTime: now.toISOString(),
        comments: notes.trim() || null,
        enteredByName: account?.name || "Unknown",
      });
      await refresh();
      setShowForm(false);
      setWeight("");
      setHeight("");
      setNotes("");
    } catch {
      Alert.alert("Error", "Could not save measurement. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Growth</Text>
            <Text style={styles.subtitle}>
              Track weight &amp; height
              {activeBaby ? ` · ${activeBaby.name}` : ""}
            </Text>
          </View>
          <BabySwitcher />
        </View>

        {/* Current stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statEmoji}>⚖️</Text>
            <Text style={styles.statValue}>
              {latestWeight ? `${latestWeight.weightKg} kg` : "—"}
            </Text>
            <Text style={styles.statLabel}>
              {latestWeight
                ? `Last: ${formatDateLabel(latestWeight.startTime)}`
                : "No data"}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statEmoji}>📏</Text>
            <Text style={styles.statValue}>
              {latestHeight ? `${latestHeight.heightCm} cm` : "—"}
            </Text>
            <Text style={styles.statLabel}>
              {latestHeight
                ? `Last: ${formatDateLabel(latestHeight.startTime)}`
                : "No data"}
            </Text>
          </View>
        </View>

        {/* Add button */}
        {!showForm && (
          <TouchableOpacity
            style={[styles.addBtn, { borderColor: theme.primary }]}
            onPress={() => setShowForm(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.addBtnEmoji}>➕</Text>
            <Text style={[styles.addBtnText, { color: theme.primary }]}>
              Log Measurement
            </Text>
          </TouchableOpacity>
        )}

        {/* Entry form */}
        {showForm && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>New Measurement</Text>
            {activeBaby && (
              <Text style={[styles.forBaby, { color: theme.primary }]}>
                Logging for: {activeBaby.name}
              </Text>
            )}

            <Text style={styles.fieldLabel}>WEIGHT (KG)</Text>
            <TextInput
              style={[styles.input, { borderColor: theme.primaryLight, backgroundColor: theme.primaryLighter }]}
              value={weight}
              onChangeText={setWeight}
              placeholder="e.g. 4.5"
              placeholderTextColor="#ccc"
              keyboardType="decimal-pad"
            />

            <Text style={styles.fieldLabel}>HEIGHT (CM)</Text>
            <TextInput
              style={[styles.input, { borderColor: theme.primaryLight, backgroundColor: theme.primaryLighter }]}
              value={height}
              onChangeText={setHeight}
              placeholder="e.g. 52"
              placeholderTextColor="#ccc"
              keyboardType="decimal-pad"
            />

            <Text style={styles.fieldLabel}>NOTES</Text>
            <TextInput
              style={[styles.input, { borderColor: theme.primaryLight, backgroundColor: theme.primaryLighter }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Optional"
              placeholderTextColor="#ccc"
            />

            <View style={styles.formBtns}>
              <TouchableOpacity
                style={styles.formCancelBtn}
                onPress={() => {
                  setShowForm(false);
                  setWeight("");
                  setHeight("");
                  setNotes("");
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.formCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.formSaveBtn,
                  { backgroundColor: theme.primary },
                  ((!weight && !height) || saving) && { opacity: 0.4 },
                ]}
                onPress={handleSave}
                disabled={(!weight && !height) || saving}
                activeOpacity={0.8}
              >
                <Text style={styles.formSaveText}>
                  {saving ? "Saving..." : "Save"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* History */}
        <Text style={[styles.historyTitle, { color: theme.primary }]}>
          GROWTH HISTORY
        </Text>
        {loading ? (
          <ActivityIndicator color={theme.primary} />
        ) : growthLogs.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📏</Text>
            <Text style={styles.emptyText}>No measurements logged yet.</Text>
          </View>
        ) : (
          <View style={styles.historyList}>
            {growthLogs.map((log) => (
              <View key={log.id} style={styles.historyCard}>
                <View style={[styles.historyIconCircle, { backgroundColor: "#f5f3ff" }]}>
                  <Text style={styles.historyIcon}>📏</Text>
                </View>
                <View style={styles.historyInfo}>
                  <View style={styles.measureRow}>
                    {log.weightKg !== null && (
                      <View style={styles.weightBadge}>
                        <Text style={styles.weightBadgeText}>⚖️ {log.weightKg} kg</Text>
                      </View>
                    )}
                    {log.heightCm !== null && (
                      <View style={styles.heightBadge}>
                        <Text style={styles.heightBadgeText}>📏 {log.heightCm} cm</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.historyDate}>
                    {formatDateLabel(log.startTime)}
                  </Text>
                  {log.comments ? (
                    <Text style={styles.historyComment}>
                      &ldquo;{log.comments}&rdquo;
                    </Text>
                  ) : null}
                  <Text style={styles.historyBy}>by {log.enteredByName}</Text>
                </View>
              </View>
            ))}
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
  statsRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  statEmoji: { fontSize: 24, marginBottom: 6 },
  statValue: { fontSize: 20, fontWeight: "700", color: "#1a1a1a" },
  statLabel: { fontSize: 10, color: "#aaa", fontWeight: "600", marginTop: 4, textTransform: "uppercase", textAlign: "center" },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 2,
    borderStyle: "dashed",
    borderRadius: 18,
    paddingVertical: 14,
    marginBottom: 20,
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  addBtnEmoji: { fontSize: 18 },
  addBtnText: { fontSize: 14, fontWeight: "700" },
  formCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  formTitle: { fontSize: 15, fontWeight: "700", color: "#333", textAlign: "center", marginBottom: 4 },
  forBaby: { fontSize: 12, fontWeight: "600", textAlign: "center", marginBottom: 16 },
  fieldLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#aaa",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 6,
    marginTop: 2,
  },
  input: {
    borderWidth: 2,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: "#333",
    marginBottom: 12,
  },
  formBtns: { flexDirection: "row", gap: 10, marginTop: 4 },
  formCancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
  },
  formCancelText: { fontSize: 14, fontWeight: "600", color: "#aaa" },
  formSaveBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
  },
  formSaveText: { fontSize: 14, fontWeight: "700", color: "#fff" },
  historyTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
    textAlign: "center",
    textTransform: "uppercase",
    marginBottom: 12,
  },
  empty: { alignItems: "center", paddingVertical: 40 },
  emptyIcon: { fontSize: 36, marginBottom: 8 },
  emptyText: { fontSize: 13, color: "#ccc" },
  historyList: { gap: 10 },
  historyCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  historyIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  historyIcon: { fontSize: 20 },
  historyInfo: { flex: 1 },
  measureRow: { flexDirection: "row", gap: 6, flexWrap: "wrap", marginBottom: 4 },
  weightBadge: {
    backgroundColor: "#eff6ff",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  weightBadgeText: { fontSize: 12, color: "#3b82f6", fontWeight: "700" },
  heightBadge: {
    backgroundColor: "#f0fdf4",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  heightBadgeText: { fontSize: 12, color: "#16a34a", fontWeight: "700" },
  historyDate: { fontSize: 12, color: "#aaa" },
  historyComment: { fontSize: 12, color: "#888", fontStyle: "italic", marginTop: 3 },
  historyBy: { fontSize: 10, color: "#ccc", marginTop: 2 },
});
