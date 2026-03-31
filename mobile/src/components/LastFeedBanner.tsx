import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import type { LogEntry } from "../api/logs";
import { useTheme } from "../theme";

interface Props {
  logs: LogEntry[];
}

function formatAgo(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m ago`;
  return `${m}m ago`;
}

export default function LastFeedBanner({ logs }: Props) {
  const theme = useTheme();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const lastFeed = logs.find((l) => l.type === "feed");
  if (!lastFeed) return null;

  const elapsed = now - new Date(lastFeed.startTime).getTime();

  return (
    <View style={[styles.banner, { backgroundColor: theme.primaryLight }]}>
      <Text style={styles.emoji}>🤱</Text>
      <Text style={[styles.text, { color: theme.pillText }]}>
        Last feed was{" "}
        <Text style={styles.bold}>{formatAgo(elapsed)}</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  emoji: { fontSize: 18 },
  text: { fontSize: 13 },
  bold: { fontWeight: "700" },
});
