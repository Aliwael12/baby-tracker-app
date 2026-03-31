import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  Platform,
  Alert,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useTheme } from "../theme";
import { createLog } from "../api/logs";

type ActivityType = "pump" | "feed" | "sleep" | "diaper" | "shower";

const ACTIVITY_OPTIONS: { value: ActivityType; icon: string; label: string }[] =
  [
    { value: "pump", icon: "🍼", label: "Pump" },
    { value: "feed", icon: "🤱", label: "Feed" },
    { value: "sleep", icon: "😴", label: "Sleep" },
    { value: "diaper", icon: "👶", label: "Diaper" },
    { value: "shower", icon: "🚿", label: "Shower" },
  ];

const DIAPER_OPTIONS = [
  { value: "empty", icon: "✅", label: "Empty" },
  { value: "wet", icon: "💧", label: "Wet" },
  { value: "dirty", icon: "💩", label: "Dirty" },
  { value: "wet_and_dirty", icon: "💧💩", label: "Wet & Dirty" },
];

function formatTimeDisplay(d: Date): string {
  return d.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDateDisplay(d: Date): string {
  return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

interface Props {
  visible: boolean;
  babyId: number;
  babyName: string;
  enteredByName: string;
  onSaved: () => void;
  onClose: () => void;
}

export default function ManualEntryModal({
  visible,
  babyId,
  babyName,
  enteredByName,
  onSaved,
  onClose,
}: Props) {
  const theme = useTheme();
  const [activityType, setActivityType] = useState<ActivityType | null>(null);
  const [side, setSide] = useState<"left" | "right" | null>(null);
  const [diaperStatus, setDiaperStatus] = useState<string | null>(null);
  const [date, setDate] = useState(new Date());
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());
  const [comments, setComments] = useState("");
  const [saving, setSaving] = useState(false);

  // Picker visibility states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const needsSide = activityType === "pump" || activityType === "feed";
  const isDiaper = activityType === "diaper";
  const canSave =
    activityType &&
    (!needsSide || side) &&
    (!isDiaper || diaperStatus);

  const combineDateAndTime = (d: Date, t: Date): Date => {
    const result = new Date(d);
    result.setHours(t.getHours(), t.getMinutes(), 0, 0);
    return result;
  };

  const handleSave = async () => {
    if (!canSave || !activityType) return;
    setSaving(true);

    const start = combineDateAndTime(date, startTime);
    const end = isDiaper ? start : combineDateAndTime(date, endTime);

    try {
      await createLog({
        babyId,
        type: activityType,
        side: needsSide ? side : null,
        diaperStatus: isDiaper ? diaperStatus : null,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        comments: comments.trim() || null,
        enteredByName,
      });
      onSaved();
      handleClose();
    } catch {
      Alert.alert("Error", "Could not save entry. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setActivityType(null);
    setSide(null);
    setDiaperStatus(null);
    setDate(new Date());
    setStartTime(new Date());
    setEndTime(new Date());
    setComments("");
    setShowDatePicker(false);
    setShowStartPicker(false);
    setShowEndPicker(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalEmoji}>📝</Text>
              <Text style={styles.modalTitle}>Manual Entry</Text>
              <Text style={[styles.forBaby, { color: theme.primary }]}>
                Logging for: {babyName}
              </Text>
            </View>

            {/* Activity type */}
            <Text style={styles.sectionLabel}>ACTIVITY</Text>
            <View style={styles.pillsRow}>
              {ACTIVITY_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.actPill,
                    activityType === opt.value && {
                      backgroundColor: theme.primary,
                    },
                    activityType !== opt.value && {
                      backgroundColor: theme.primaryLighter,
                    },
                  ]}
                  onPress={() => {
                    setActivityType(opt.value);
                    if (opt.value !== "pump" && opt.value !== "feed") setSide(null);
                    if (opt.value !== "diaper") setDiaperStatus(null);
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.actPillText,
                      {
                        color:
                          activityType === opt.value ? "#fff" : theme.pillText,
                      },
                    ]}
                  >
                    {opt.icon} {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Side (feed / pump only) */}
            {needsSide && (
              <>
                <Text style={styles.sectionLabel}>SIDE</Text>
                <View style={styles.sideRow}>
                  {(["left", "right"] as const).map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={[
                        styles.sideBtn,
                        side === s
                          ? { backgroundColor: theme.primary, borderColor: theme.primary }
                          : { borderColor: theme.primaryLight, backgroundColor: theme.primaryLighter },
                      ]}
                      onPress={() => setSide(s)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.sideBtnText, { color: side === s ? "#fff" : theme.pillText }]}>
                        {s === "left" ? "🫲 L" : "🫱 R"}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* Diaper status */}
            {isDiaper && (
              <>
                <Text style={styles.sectionLabel}>STATUS</Text>
                <View style={styles.diaperGrid}>
                  {DIAPER_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        styles.diaperOption,
                        diaperStatus === opt.value
                          ? { backgroundColor: theme.primary, borderColor: theme.primary }
                          : { borderColor: theme.primaryLight, backgroundColor: theme.primaryLighter },
                      ]}
                      onPress={() => setDiaperStatus(opt.value)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.diaperEmoji}>{opt.icon}</Text>
                      <Text
                        style={[
                          styles.diaperLabel,
                          { color: diaperStatus === opt.value ? "#fff" : theme.pillText },
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* Date */}
            <Text style={styles.sectionLabel}>DATE</Text>
            <TouchableOpacity
              style={[styles.pickerBtn, { borderColor: theme.primaryLight }]}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.pickerBtnText}>{formatDateDisplay(date)}</Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(_, d) => {
                  setShowDatePicker(Platform.OS === "ios");
                  if (d) setDate(d);
                }}
              />
            )}

            {/* Start / End time (not for diaper) */}
            {!isDiaper && (
              <>
                <View style={styles.timeRow}>
                  <View style={styles.timeCell}>
                    <Text style={styles.sectionLabel}>START TIME</Text>
                    <TouchableOpacity
                      style={[styles.pickerBtn, { borderColor: theme.primaryLight }]}
                      onPress={() => setShowStartPicker(true)}
                    >
                      <Text style={styles.pickerBtnText}>{formatTimeDisplay(startTime)}</Text>
                    </TouchableOpacity>
                    {showStartPicker && (
                      <DateTimePicker
                        value={startTime}
                        mode="time"
                        display={Platform.OS === "ios" ? "spinner" : "default"}
                        onChange={(_, t) => {
                          setShowStartPicker(Platform.OS === "ios");
                          if (t) setStartTime(t);
                        }}
                      />
                    )}
                  </View>
                  <View style={styles.timeCell}>
                    <Text style={styles.sectionLabel}>END TIME</Text>
                    <TouchableOpacity
                      style={[styles.pickerBtn, { borderColor: theme.primaryLight }]}
                      onPress={() => setShowEndPicker(true)}
                    >
                      <Text style={styles.pickerBtnText}>{formatTimeDisplay(endTime)}</Text>
                    </TouchableOpacity>
                    {showEndPicker && (
                      <DateTimePicker
                        value={endTime}
                        mode="time"
                        display={Platform.OS === "ios" ? "spinner" : "default"}
                        onChange={(_, t) => {
                          setShowEndPicker(Platform.OS === "ios");
                          if (t) setEndTime(t);
                        }}
                      />
                    )}
                  </View>
                </View>
              </>
            )}

            {/* Notes */}
            <Text style={styles.sectionLabel}>NOTES</Text>
            <TextInput
              style={[styles.notesInput, { borderColor: theme.primaryLight, backgroundColor: theme.primaryLighter }]}
              value={comments}
              onChangeText={setComments}
              placeholder="Optional"
              placeholderTextColor="#ccc"
            />

            {/* Actions */}
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={handleClose} activeOpacity={0.8}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.saveBtn,
                  { backgroundColor: theme.primary },
                  (!canSave || saving) && { opacity: 0.4 },
                ]}
                onPress={handleSave}
                disabled={!canSave || saving}
                activeOpacity={0.8}
              >
                <Text style={styles.saveText}>{saving ? "Saving..." : "Save Entry"}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    maxHeight: "92%",
  },
  modalHeader: { alignItems: "center", marginBottom: 20 },
  modalEmoji: { fontSize: 36, marginBottom: 6 },
  modalTitle: { fontSize: 20, fontWeight: "700", color: "#333" },
  forBaby: { fontSize: 12, fontWeight: "600", marginTop: 4 },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#aaa",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 8,
    marginTop: 4,
  },
  pillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  actPill: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  actPillText: { fontSize: 13, fontWeight: "700" },
  sideRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  sideBtn: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
  },
  sideBtnText: { fontSize: 15, fontWeight: "700" },
  diaperGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  diaperOption: {
    width: "47%",
    borderWidth: 2,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    gap: 4,
  },
  diaperEmoji: { fontSize: 22 },
  diaperLabel: { fontSize: 12, fontWeight: "700" },
  pickerBtn: {
    borderWidth: 2,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 16,
  },
  pickerBtnText: { fontSize: 14, color: "#333" },
  timeRow: { flexDirection: "row", gap: 12 },
  timeCell: { flex: 1 },
  notesInput: {
    borderWidth: 2,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: "#333",
    marginBottom: 20,
  },
  actionRow: { flexDirection: "row", gap: 10, marginBottom: 8 },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
  },
  cancelText: { fontSize: 14, fontWeight: "600", color: "#aaa" },
  saveBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
  },
  saveText: { fontSize: 14, fontWeight: "700", color: "#fff" },
});
