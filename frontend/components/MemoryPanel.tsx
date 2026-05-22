"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Memory } from "@/lib/types";
import { fetchMemories, deleteMemory as deleteMemoryApi } from "@/lib/api";
import MemoryCard from "./MemoryCard";
import MemoryStats from "./MemoryStats";

interface Props {
  shouldPoll: boolean;
  onMemoryCountChange?: (count: number) => void;
}

export default function MemoryPanel({ shouldPoll, onMemoryCountChange }: Props) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [newMemoryIds, setNewMemoryIds] = useState<Set<string>>(new Set());
  const [sessionAdded, setSessionAdded] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const prevIdsRef = useRef<Set<string>>(new Set());
  const initialLoadRef = useRef(true);
  const pollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const loadMemories = useCallback(async () => {
    try {
      const data = await fetchMemories();
      const mems = data.memories || [];
      setMemories(mems);
      onMemoryCountChange?.(mems.length);

      if (mems.length > 0 && mems[0].created_at) {
        setLastUpdated(mems[0].created_at);
      }

      if (initialLoadRef.current) {
        prevIdsRef.current = new Set(mems.map((m) => m.id));
        initialLoadRef.current = false;
        return;
      }

      const currentIds = new Set(mems.map((m) => m.id));
      const freshIds = new Set<string>();
      currentIds.forEach((id) => {
        if (!prevIdsRef.current.has(id)) {
          freshIds.add(id);
        }
      });

      if (freshIds.size > 0) {
        setNewMemoryIds((prev) => new Set([...prev, ...freshIds]));
        setSessionAdded((prev) => prev + freshIds.size);
        setTimeout(() => {
          setNewMemoryIds((prev) => {
            const next = new Set(prev);
            freshIds.forEach((id) => next.delete(id));
            return next;
          });
        }, 2500);
      }

      prevIdsRef.current = currentIds;
    } catch {
      // silent fail on poll
    }
  }, [onMemoryCountChange]);

  useEffect(() => {
    loadMemories();
  }, [loadMemories]);

  useEffect(() => {
    if (!shouldPoll) return;

    let active = true;
    const poll = () => {
      if (!active) return;
      loadMemories();
      pollTimeoutRef.current = setTimeout(poll, 3000);
    };
    pollTimeoutRef.current = setTimeout(poll, 3000);

    return () => {
      active = false;
      if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
    };
  }, [shouldPoll, loadMemories]);

  const handleDelete = async (memoryId: string) => {
    try {
      await deleteMemoryApi(memoryId);
      setMemories((prev) => prev.filter((m) => m.id !== memoryId));
      onMemoryCountChange?.(memories.length - 1);
    } catch {
      // silent fail
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)]">
        <h2 className="font-display text-[16px] text-[var(--text-primary)] tracking-tight">
          What I Know
        </h2>
        <motion.span
          key={memories.length}
          initial={{ scale: 1.2, opacity: 0.5 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 15, stiffness: 300 }}
          className="text-[11px] font-mono text-[var(--accent)] opacity-60"
        >
          {memories.length}
        </motion.span>
      </div>

      <div className="px-5 pt-4 pb-2 flex-1 overflow-y-auto custom-scrollbar">
        <MemoryStats
          total={memories.length}
          sessionAdded={sessionAdded}
          lastUpdated={lastUpdated}
        />

        {memories.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="py-16"
          >
            <p className="text-[var(--text-tertiary)] text-[13px] font-body leading-relaxed">
              No memories yet.
            </p>
            <p className="text-[var(--text-tertiary)] text-[13px] font-body leading-relaxed mt-1">
              Start chatting and I&apos;ll begin learning about you.
            </p>
          </motion.div>
        ) : (
          <div className="flex flex-col gap-2">
            <AnimatePresence mode="popLayout">
              {memories.map((memory) => (
                <MemoryCard
                  key={memory.id}
                  memory={memory}
                  isNew={newMemoryIds.has(memory.id)}
                  onDelete={handleDelete}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
