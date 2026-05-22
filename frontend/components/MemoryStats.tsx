"use client";

import { motion } from "motion/react";

interface Props {
  total: number;
  sessionAdded: number;
  lastUpdated: string | null;
}

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 10) return "now";
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export default function MemoryStats({ total, sessionAdded, lastUpdated }: Props) {
  const stats = [
    { value: String(total), label: "stored" },
    { value: `+${sessionAdded}`, label: "session", accent: sessionAdded > 0 },
    { value: lastUpdated ? timeAgo(lastUpdated) : "--", label: "latest" },
  ];

  return (
    <div className="flex items-center gap-6 mb-5 px-1">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05, duration: 0.3 }}
          className="flex items-baseline gap-1.5"
        >
          <span
            className={`text-[18px] font-display font-semibold tabular-nums ${
              stat.accent ? "text-[var(--accent)]" : "text-[var(--text-primary)]"
            }`}
          >
            {stat.value}
          </span>
          <span className="text-[10px] font-mono text-[var(--text-tertiary)] tracking-wide">
            {stat.label}
          </span>
        </motion.div>
      ))}
    </div>
  );
}
