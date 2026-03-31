import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { useTheme } from "../theme";
import { formatTimer } from "../utils/formatTime";
import { useTimer, ActivityType } from "../hooks/useTimer";
import { createLog } from "../api/logs";

const ACTIVITY_CONFIG: Record<
  ActivityType,
  { label: string; icon: string; hasSide: boolean; hasTimer: boolean }
> = {
  pump: { label: "Pump", icon: "🍼", hasSide: true, hasTimer: true },
  feed: { label: "Feed", icon: "🤱", hasSide: true, hasTimer: true },
  sleep: { label: "Sleep", icon: "😴", hasSide: false, hasTimer: true },
  diaper: { label: "Diaper", icon: "👶", hasSide: false, hasTimer: false },
  shower: { label: "Shower", icon: "🚿", hasSide: false, hasTimer: true },
};

const DIAPER_OPTIONS = [
  { value: "empty", icon: "✅", label: "Empty" },
  { value: "wet", icon: "💧", label: "Wet" },
  { value: "dirty", icon: "💩", label: "Dirty" },
  { value: "wet_and_dirty", icon: "💧💩", label: "Wet & Dirty" },
];

interface Props {
  type: ActivityType;
  babyId: number;
  babyName: string;
  enteredByName: string;
  onLogSaved: () => void;
}

export default function ActivityTimerCard({
  type,
  babyId,
  babyName,
  enteredByName,
  onLogSaved,
}: Props) {
  const theme = useTheme();
  const config = ACTIVITY_CONFIG[type];

  const timer = useTimer(type, babyId);
  const [diaperStatus, setDiaperStatus] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const startTimeRef = useRef<Date | null>(null);
  const endTimeRef = useRef<Date | null>(null);

  const handleDiaperTap = useCallback(() => {
    const now = new Date();
    startTimeRef.current = now;
    endTimeRef.current = now;
    timer.handleDiaperStatusSelect(""); // shows comment
  }, [timer]);

  const handleDiaperStatus = useCallback(
    (status: string) => {
      setDiaperStatus(status);
      timer.handleDiaperStatusSelect(status);
    },
    [timer]
  );

  const handleStart = useCallback(
    (side?: "left" | "right") => {
      startTimeRef.current = new Date();
      timer.handleStart(side);
    },
    [timer]
  );

  const handleStop = useCallback(() => {
    endTimeRef.current = new Date();
    timer.handleStop();
  }, [timer]);

  const handleSave = useCallback(async () => {
    const start = timer.startTime || startTimeRef.current;
    const end = endTimeRef.current || timer.endTime || new Date();
    if (!start) return;

    setSaving(true);
    try {
      await createLog({
        babyId,
        type,
        side: timer.activeSide,
        diaperStatus: type === "diaper" ? diaperStatus : null,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        comments: comment.trim() || null,
        enteredByName,
      });
      onLogSaved();
    } catch {
      Alert.alert("Error", "Could not save log. Please try again.");
      return;
    } finally {
      setSaving(false);
    }

    // Reset
    setComment("");
    setDiaperStatus(null);
    startTimeRef.current = null;
    endTimeRef.current = null;
    timer.handleCancel();
  }, [babyId, type, timer, diaperStatus, comment, enteredByName, onLogSaved]);

  const handleCancel = useCallback(() => {
    setComment("");
    setDiaperStatus(null);
    startTimeRef.current = null;
    endTimeRef.current = null;
    timer.handleCancel();
  }, [timer]);

  const s = StyleSheet.create({
    card: {
      backgroundColor: "#fff",
      borderRadius: 20,
      padding: 16,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
    },
    heading: {
      fontSize: 13,
      fontWeight: "700",
      color: "#888",
      textAlign: "center",
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 8,
    },
    babyLabel: {
      fontSize: 11,
      color: theme.primary,
      textAlign: "center",
      marginBottom: 8,
      fontWeight: "600",
    },
    elapsedPill: {
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 5,
      alignSelf: "center",
      marginBottom: 8,
    },
    elapsedText: {
      fontSize: 15,
      fontWeight: "700",
      color: "#fff",
    },
    sideRow: { flexDirection: "row", gap: 10 },
    sideBtn: {
      flex: 1,
      borderWidth: 2,
      borderColor: theme.primaryLight,
      backgroundColor: theme.primaryLighter,
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: "center",
    },
    sideEmoji: { fontSize: 26 },
    sideLetter: {
      fontSize: 12,
      fontWeight: "700",
      color: theme.pillText,
      marginTop: 2,
    },
    controlRow: { flexDirection: "row", gap: 10 },
    pauseBtn: {
      flex: 1,
      borderWidth: 2,
      borderColor: "#fcd34d",
      backgroundColor: "#fffbeb",
      borderRadius: 14,
      paddingVertical: 12,
      alignItems: "center",
    },
    pauseText: { fontSize: 13, fontWeight: "700", color: "#d97706" },
    resumeBtn: {
      flex: 1,
      borderWidth: 2,
      borderColor: "#86efac",
      backgroundColor: "#f0fdf4",
      borderRadius: 14,
      paddingVertical: 12,
      alignItems: "center",
    },
    resumeText: { fontSize: 13, fontWeight: "700", color: "#16a34a" },
    stopBtn: {
      flex: 1,
      borderWidth: 2,
      borderColor: "#fca5a5",
      backgroundColor: "#fef2f2",
      borderRadius: 14,
      paddingVertical: 12,
      alignItems: "center",
    },
    stopText: { fontSize: 13, fontWeight: "700", color: "#dc2626" },
    startBtn: {
      borderWidth: 2,
      borderColor: theme.primaryLight,
      backgroundColor: theme.primaryLighter,
      borderRadius: 14,
      paddingVertical: 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    startText: { fontSize: 15, fontWeight: "700", color: theme.pillText },
    input: {
      borderWidth: 2,
      borderColor: theme.primaryLight,
      backgroundColor: theme.primaryLighter,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 14,
      color: "#333",
      marginBottom: 10,
    },
    actionRow: { flexDirection: "row", gap: 10 },
    cancelBtn: {
      flex: 1,
      borderWidth: 1,
      borderColor: "#e5e5e5",
      borderRadius: 14,
      paddingVertical: 11,
      alignItems: "center",
    },
    cancelText: { fontSize: 14, fontWeight: "600", color: "#aaa" },
    saveBtn: {
      flex: 1,
      backgroundColor: theme.primary,
      borderRadius: 14,
      paddingVertical: 11,
      alignItems: "center",
    },
    saveText: { fontSize: 14, fontWeight: "700", color: "#fff" },
    diaperGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    diaperOption: {
      width: "47%",
      borderWidth: 2,
      borderColor: theme.primaryLight,
      backgroundColor: theme.primaryLighter,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: "center",
      gap: 4,
    },
    diaperEmoji: { fontSize: 22 },
    diaperLabel: { fontSize: 12, fontWeight: "700", color: theme.pillText },
  });

  // --- Diaper status picker view ---
  if (timer.showDiaperStatus) {
    return (
      <View style={s.card}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
          <Text style={s.heading}>{config.icon} {config.label}</Text>
          <TouchableOpacity onPress={handleCancel}>
            <Text style={{ color: "#aaa", fontSize: 12 }}>Cancel</Text>
          </TouchableOpacity>
        </View>
        <Text style={s.babyLabel}>Logging for: {babyName}</Text>
        <Text style={{ textAlign: "center", fontSize: 13, color: "#aaa", marginBottom: 12 }}>
          What&apos;s the status?
        </Text>
        <View style={s.diaperGrid}>
          {DIAPER_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={s.diaperOption}
              onPress={() => handleDiaperStatus(opt.value)}
              activeOpacity={0.7}
            >
              <Text style={s.diaperEmoji}>{opt.icon}</Text>
              <Text style={s.diaperLabel}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  // --- Comment / save view ---
  if (timer.showComment) {
    const foundDiaper = DIAPER_OPTIONS.find((o) => o.value === diaperStatus);
    return (
      <View style={s.card}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <Text style={s.heading}>
            {config.icon} {config.label}
            {timer.activeSide ? ` (${timer.activeSide === "left" ? "L" : "R"})` : ""}
            {foundDiaper ? ` — ${foundDiaper.label}` : ""}
          </Text>
          <View
            style={[
              s.elapsedPill,
              { backgroundColor: theme.primary, marginBottom: 0, paddingVertical: 3, paddingHorizontal: 10 },
            ]}
          >
            <Text style={s.elapsedText}>{formatTimer(timer.elapsed)}</Text>
          </View>
        </View>
        <Text style={s.babyLabel}>Logging for: {babyName}</Text>
        <TextInput
          style={s.input}
          value={comment}
          onChangeText={setComment}
          placeholder="Add a note (optional)"
          placeholderTextColor="#ccc"
        />
        <View style={s.actionRow}>
          <TouchableOpacity style={s.cancelBtn} onPress={handleCancel} activeOpacity={0.8}>
            <Text style={s.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.saveBtn, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            <Text style={s.saveText}>{saving ? "Saving..." : "Save"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // --- Active timer (with side) ---
  if (config.hasSide) {
    return (
      <View style={s.card}>
        <Text style={s.heading}>{config.icon} {config.label}</Text>
        <Text style={s.babyLabel}>Logging for: {babyName}</Text>
        {timer.isActive && (
          <View
            style={[
              s.elapsedPill,
              {
                backgroundColor: timer.paused ? "#f59e0b" : theme.primary,
              },
            ]}
          >
            <Text style={s.elapsedText}>
              {formatTimer(timer.elapsed)}{" "}
              — {timer.activeSide === "left" ? "L" : "R"}
              {timer.paused ? " (paused)" : ""}
            </Text>
          </View>
        )}
        {timer.isActive ? (
          <View style={s.controlRow}>
            {timer.paused ? (
              <TouchableOpacity style={s.resumeBtn} onPress={timer.handleResume} activeOpacity={0.8}>
                <Text style={s.resumeText}>▶ Resume</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={s.pauseBtn} onPress={timer.handlePause} activeOpacity={0.8}>
                <Text style={s.pauseText}>⏸ Pause</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={s.stopBtn} onPress={handleStop} activeOpacity={0.8}>
              <Text style={s.stopText}>⏹ Stop</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.sideRow}>
            <TouchableOpacity style={s.sideBtn} onPress={() => handleStart("left")} activeOpacity={0.7}>
              <Text style={s.sideEmoji}>🫲</Text>
              <Text style={s.sideLetter}>L</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.sideBtn} onPress={() => handleStart("right")} activeOpacity={0.7}>
              <Text style={s.sideEmoji}>🫱</Text>
              <Text style={s.sideLetter}>R</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  // --- Diaper (instant) ---
  if (!config.hasTimer) {
    return (
      <View style={s.card}>
        <Text style={s.babyLabel}>Logging for: {babyName}</Text>
        <TouchableOpacity style={s.startBtn} onPress={handleDiaperTap} activeOpacity={0.7}>
          <Text style={{ fontSize: 26 }}>{config.icon}</Text>
          <Text style={s.startText}>{config.label}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // --- Regular timer (sleep / shower) ---
  return (
    <View style={s.card}>
      <Text style={s.babyLabel}>Logging for: {babyName}</Text>
      {timer.isActive && (
        <View
          style={[
            s.elapsedPill,
            { backgroundColor: timer.paused ? "#f59e0b" : theme.primary },
          ]}
        >
          <Text style={s.elapsedText}>
            {formatTimer(timer.elapsed)}{timer.paused ? " (paused)" : ""}
          </Text>
        </View>
      )}
      {timer.isActive ? (
        <View style={s.controlRow}>
          {timer.paused ? (
            <TouchableOpacity style={s.resumeBtn} onPress={timer.handleResume} activeOpacity={0.8}>
              <Text style={s.resumeText}>▶ Resume</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={s.pauseBtn} onPress={timer.handlePause} activeOpacity={0.8}>
              <Text style={s.pauseText}>⏸ Pause</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={s.stopBtn} onPress={handleStop} activeOpacity={0.8}>
            <Text style={s.stopText}>⏹ Stop</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={s.startBtn} onPress={() => handleStart()} activeOpacity={0.7}>
          <Text style={{ fontSize: 26 }}>{config.icon}</Text>
          <Text style={s.startText}>{config.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
