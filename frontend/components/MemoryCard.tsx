"use client";

import { motion } from "motion/react";
import { Memory } from "@/lib/types";
import { useState } from "react";

interface Props {
  memory: Memory;
  isNew?: boolean;
  onDelete: (id: string) => void;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Personal: { bg: "rgba(59,130,246,0.06)", text: "#5b9cf6", border: "rgba(59,130,246,0.12)" },
  Professional: { bg: "rgba(16,185,129,0.06)", text: "#34d399", border: "rgba(16,185,129,0.12)" },
  Preference: { bg: "rgba(245,158,11,0.06)", text: "#fbbf24", border: "rgba(245,158,11,0.12)" },
  Goal: { bg: "rgba(124,91,240,0.06)", text: "#a78bfa", border: "rgba(124,91,240,0.12)" },
};

function categorizeMemory(text: string): string {
  const lower = text.toLowerCase();
  if (
    lower.includes("want") ||
    lower.includes("goal") ||
    lower.includes("plan") ||
    lower.includes("aspir") ||
    lower.includes("working on") ||
    lower.includes("trying to")
  )
    return "Goal";
  if (
    lower.includes("like") ||
    lower.includes("prefer") ||
    lower.includes("favorite") ||
    lower.includes("enjoy") ||
    lower.includes("hate") ||
    lower.includes("dislike") ||
    lower.includes("love")
  )
    return "Preference";
  if (
    lower.includes("work") ||
    lower.includes("job") ||
    lower.includes("skill") ||
    lower.includes("project") ||
    lower.includes("engineer") ||
    lower.includes("study") ||
    lower.includes("degree") ||
    lower.includes("company") ||
    lower.includes("career")
  )
    return "Professional";
  return "Personal";
}

function timeAgo(dateStr?: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

export default function MemoryCard({ memory, isNew, onDelete }: Props) {
  const [isDeleting, setIsDeleting] = useState(false);
  const category = memory.category || categorizeMemory(memory.memory);
  const colors = CATEGORY_COLORS[category] || CATEGORY_COLORS.Personal;

  const handleDelete = async () => {
    setIsDeleting(true);
    await onDelete(memory.id);
  };

  return (
    <motion.div
      initial={isNew ? { opacity: 0, y: -10, scale: 0.98 } : false}
      animate={
        isDeleting
          ? { opacity: 0, scale: 0.95, transition: { duration: 0.2 } }
          : { opacity: 1, y: 0, scale: 1 }
      }
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className={`group relative p-3.5 bg-[var(--surface)] border border-[var(--border-subtle)] rounded-lg transition-colors duration-300 hover:border-[var(--border)] ${
        isNew ? "memory-glow" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="font-mono text-[12.5px] text-[var(--text-primary)] leading-[1.6] flex-1 opacity-90">
          {memory.memory}
        </p>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleDelete}
          className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-[var(--text-tertiary)] hover:text-red-400/80 shrink-0 w-5 h-5 flex items-center justify-center"
          aria-label="Delete memory"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M1 1l8 8M9 1l-8 8" />
          </svg>
        </motion.button>
      </div>
      <div className="flex items-center gap-2.5 mt-2.5">
        <span
          className="text-[9px] font-mono uppercase tracking-[0.08em] px-2 py-[3px] rounded"
          style={{
            background: colors.bg,
            color: colors.text,
            border: `1px solid ${colors.border}`,
          }}
        >
          {category}
        </span>
        {memory.created_at && (
          <span className="text-[10px] text-[var(--text-tertiary)] font-mono">
            {timeAgo(memory.created_at)}
          </span>
        )}
      </div>
    </motion.div>
  );
}
