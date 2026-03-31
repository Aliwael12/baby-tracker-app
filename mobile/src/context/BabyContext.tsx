import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Baby } from "../api/auth";
import { getMe } from "../api/auth";
import { createBaby } from "../api/babies";
import { useAuth } from "./AuthContext";

interface BabyContextValue {
  babies: Baby[];
  activeBaby: Baby | null;
  setActiveBaby: (baby: Baby) => Promise<void>;
  addBaby: (data: {
    name: string;
    gender: "girl" | "boy";
    dob?: string | null;
  }) => Promise<Baby>;
  refreshBabies: () => Promise<void>;
  loading: boolean;
}

export const BabyContext = createContext<BabyContextValue | null>(null);

export function BabyProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const [babies, setBabies] = useState<Baby[]>([]);
  const [activeBaby, setActiveBabyState] = useState<Baby | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshBabies = useCallback(async () => {
    if (!token) return;
    try {
      const me = await getMe();
      setBabies(me.babies);

      // Restore active baby from storage, or default to first
      const savedId = await AsyncStorage.getItem("babytracker_activeBabyId");
      const savedBaby = savedId
        ? me.babies.find((b) => b.id === parseInt(savedId))
        : null;
      setActiveBabyState(savedBaby || me.babies[0] || null);
    } catch {
      // ignore network errors
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      refreshBabies();
    } else {
      setBabies([]);
      setActiveBabyState(null);
      setLoading(false);
    }
  }, [token, refreshBabies]);

  const setActiveBaby = useCallback(async (baby: Baby) => {
    setActiveBabyState(baby);
    await AsyncStorage.setItem("babytracker_activeBabyId", String(baby.id));
  }, []);

  const addBaby = useCallback(
    async (data: { name: string; gender: "girl" | "boy"; dob?: string | null }) => {
      const baby = await createBaby(data);
      setBabies((prev) => [...prev, baby]);
      return baby;
    },
    []
  );

  return (
    <BabyContext.Provider
      value={{ babies, activeBaby, setActiveBaby, addBaby, refreshBabies, loading }}
    >
      {children}
    </BabyContext.Provider>
  );
}

export function useBaby(): BabyContextValue {
  const ctx = useContext(BabyContext);
  if (!ctx) throw new Error("useBaby must be used inside BabyProvider");
  return ctx;
}
