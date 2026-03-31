import { useState, useEffect, useRef, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ActivityType = "pump" | "feed" | "sleep" | "diaper" | "shower";

export interface TimerState {
  startTimeISO: string;
  pausedElapsed: number; // seconds accumulated before current startTimeISO
  paused: boolean;
  activeSide: "left" | "right" | null;
  babyId: number;
}

function storageKey(type: ActivityType, babyId: number): string {
  return `babytracker_timer_${type}_${babyId}`;
}

async function saveTimerState(
  type: ActivityType,
  babyId: number,
  state: TimerState
): Promise<void> {
  try {
    await AsyncStorage.setItem(storageKey(type, babyId), JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

async function loadTimerState(
  type: ActivityType,
  babyId: number
): Promise<TimerState | null> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(type, babyId));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function clearTimerState(
  type: ActivityType,
  babyId: number
): Promise<void> {
  try {
    await AsyncStorage.removeItem(storageKey(type, babyId));
  } catch {
    /* ignore */
  }
}

export interface UseTimerResult {
  elapsed: number;
  paused: boolean;
  activeSide: "left" | "right" | null;
  startTime: Date | null;
  isActive: boolean;
  isRunning: boolean;
  handleStart: (side?: "left" | "right") => void;
  handlePause: () => void;
  handleResume: () => void;
  handleStop: () => void; // opens comment modal
  handleCancel: () => void;
  showComment: boolean;
  showDiaperStatus: boolean;
  handleDiaperStatusSelect: (status: string) => void;
  endTime: Date | null;
}

export function useTimer(
  type: ActivityType,
  babyId: number | undefined
): UseTimerResult {
  const [activeSide, setActiveSide] = useState<"left" | "right" | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [showComment, setShowComment] = useState(false);
  const [showDiaperStatus, setShowDiaperStatus] = useState(false);

  const pausedElapsedRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const endTimeRef = useRef<Date | null>(null);
  const restoredRef = useRef(false);

  // Restore persisted state on mount / babyId change
  useEffect(() => {
    if (!babyId) return;
    restoredRef.current = false;
    setStartTime(null);
    setElapsed(0);
    setPaused(false);
    setActiveSide(null);
    setShowComment(false);
    setShowDiaperStatus(false);
    pausedElapsedRef.current = 0;
    endTimeRef.current = null;

    loadTimerState(type, babyId).then((saved) => {
      if (!saved || restoredRef.current) return;
      restoredRef.current = true;
      const restored = new Date(saved.startTimeISO);
      if (isNaN(restored.getTime())) return;
      setActiveSide(saved.activeSide);
      pausedElapsedRef.current = saved.pausedElapsed;
      setPaused(saved.paused);
      setStartTime(restored);
      if (saved.paused) {
        setElapsed(saved.pausedElapsed);
      } else {
        setElapsed(
          saved.pausedElapsed +
            Math.floor((Date.now() - restored.getTime()) / 1000)
        );
      }
    });

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [type, babyId]);

  // Tick
  useEffect(() => {
    if (startTime && !showComment && !paused) {
      intervalRef.current = setInterval(() => {
        setElapsed(
          pausedElapsedRef.current +
            Math.floor((Date.now() - startTime.getTime()) / 1000)
        );
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startTime, showComment, paused]);

  const handleStart = useCallback(
    (side?: "left" | "right") => {
      if (!babyId) return;
      const now = new Date();
      setActiveSide(side || null);
      setStartTime(now);
      setElapsed(0);
      setPaused(false);
      pausedElapsedRef.current = 0;
      endTimeRef.current = null;
      saveTimerState(type, babyId, {
        startTimeISO: now.toISOString(),
        pausedElapsed: 0,
        paused: false,
        activeSide: side || null,
        babyId,
      });
    },
    [babyId, type]
  );

  const handlePause = useCallback(() => {
    if (!startTime || paused || !babyId) return;
    pausedElapsedRef.current = elapsed;
    setPaused(true);
    if (intervalRef.current) clearInterval(intervalRef.current);
    saveTimerState(type, babyId, {
      startTimeISO: startTime.toISOString(),
      pausedElapsed: elapsed,
      paused: true,
      activeSide,
      babyId,
    });
  }, [startTime, paused, elapsed, type, activeSide, babyId]);

  const handleResume = useCallback(() => {
    if (!paused || !babyId) return;
    const now = new Date();
    setStartTime(now);
    setPaused(false);
    saveTimerState(type, babyId, {
      startTimeISO: now.toISOString(),
      pausedElapsed: pausedElapsedRef.current,
      paused: false,
      activeSide,
      babyId,
    });
  }, [paused, type, activeSide, babyId]);

  const handleStop = useCallback(() => {
    if (!startTime || !babyId) return;
    endTimeRef.current = new Date();
    setShowComment(true);
    setPaused(false);
    clearTimerState(type, babyId);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, [startTime, type, babyId]);

  const handleDiaperStatusSelect = useCallback((status: string) => {
    void status; // used by caller
    setShowDiaperStatus(false);
    setShowComment(true);
  }, []);

  const handleCancel = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (babyId) clearTimerState(type, babyId);
    setStartTime(null);
    setElapsed(0);
    setPaused(false);
    pausedElapsedRef.current = 0;
    setActiveSide(null);
    setShowDiaperStatus(false);
    setShowComment(false);
    endTimeRef.current = null;
  }, [type, babyId]);

  // Expose endTime via ref wrapper
  const [endTimeState, setEndTimeState] = useState<Date | null>(null);
  useEffect(() => {
    setEndTimeState(endTimeRef.current);
  });

  const isActive = !!startTime && !showComment && !showDiaperStatus;
  const isRunning = isActive && !paused;

  return {
    elapsed,
    paused,
    activeSide,
    startTime,
    isActive,
    isRunning,
    handleStart,
    handlePause,
    handleResume,
    handleStop,
    handleCancel,
    showComment,
    showDiaperStatus,
    handleDiaperStatusSelect,
    endTime: endTimeRef.current,
  };
}
