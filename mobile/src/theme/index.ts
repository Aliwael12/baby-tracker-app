import { useContext } from "react";
import { BabyContext } from "../context/BabyContext";

export interface Theme {
  primary: string;
  primaryLight: string;
  primaryLighter: string;
  background: string;
  accent: string;
  cardBg: string;
  pillText: string;
}

export const girlTheme: Theme = {
  primary: "#ff6b95",
  primaryLight: "#ffe0e8",
  primaryLighter: "#fff5f7",
  background: "#fff5f7",
  accent: "#ff3d72",
  cardBg: "#ffffff",
  pillText: "#e02060",
};

export const boyTheme: Theme = {
  primary: "#4e9eff",
  primaryLight: "#dceeff",
  primaryLighter: "#f0f7ff",
  background: "#f0f7ff",
  accent: "#1a7de0",
  cardBg: "#ffffff",
  pillText: "#1a6bc8",
};

export const defaultTheme: Theme = girlTheme;

export function useTheme(): Theme {
  const ctx = useContext(BabyContext);
  if (!ctx) return defaultTheme;
  const gender = ctx.activeBaby?.gender;
  if (gender === "boy") return boyTheme;
  return girlTheme;
}
