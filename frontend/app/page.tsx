"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import ChatPanel from "@/components/ChatPanel";
import MemoryPanel from "@/components/MemoryPanel";
import { checkHealth } from "@/lib/api";

export default function Home() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [memoryCount, setMemoryCount] = useState(0);
  const [mobileMemoryOpen, setMobileMemoryOpen] = useState(false);
  const [qdrantDown, setQdrantDown] = useState(false);

  useEffect(() => {
    checkHealth()
      .then((data) => {
        if (!data.qdrant_connected) setQdrantDown(true);
      })
      .catch(() => setQdrantDown(true));
  }, []);

  return (
    <div className="h-screen flex flex-col bg-[var(--bg)] overflow-hidden relative">
      <div className="ambient-glow" />
      <div className="ambient-glow-br" />
      <div className="noise-overlay" />

      <AnimatePresence>
        {qdrantDown && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-red-950/30 border-b border-red-900/20 px-4 py-2 text-center text-[12px] text-red-400/80 font-mono relative z-10 overflow-hidden"
          >
            Memory database is unreachable
          </motion.div>
        )}
      </AnimatePresence>

      <motion.header
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)] relative z-10"
      >
        <div className="flex items-baseline gap-3">
          <h1 className="font-display italic text-[21px] text-[var(--text-primary)] tracking-tight">
            Recall
          </h1>
          <span className="text-[11px] font-mono text-[var(--text-tertiary)] tracking-wide">
            memory engine
          </span>
        </div>
        <button
          onClick={() => setMobileMemoryOpen(!mobileMemoryOpen)}
          className="md:hidden text-[12px] font-mono text-[var(--text-secondary)] px-3 py-1.5 border border-[var(--border)] rounded transition-all duration-200 hover:text-[var(--accent)] hover:border-[var(--accent)]/30"
        >
          Memory{memoryCount > 0 ? ` ${memoryCount}` : ""}
        </button>
      </motion.header>

      <div className="flex-1 flex overflow-hidden relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="flex-1 min-w-0"
        >
          <ChatPanel onStreamingChange={setIsStreaming} />
        </motion.div>

        <div className="hidden md:block w-px divider-gradient" />

        <motion.div
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="hidden md:block w-[360px] shrink-0"
        >
          <MemoryPanel
            shouldPoll={isStreaming}
            onMemoryCountChange={setMemoryCount}
          />
        </motion.div>

        <AnimatePresence>
          {mobileMemoryOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden"
                onClick={() => setMobileMemoryOpen(false)}
              />
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[var(--surface)] border-t border-[var(--border)] rounded-t-2xl max-h-[75vh] overflow-hidden"
              >
                <div className="flex justify-center py-3">
                  <div className="w-8 h-[3px] bg-[var(--border)] rounded-full" />
                </div>
                <MemoryPanel
                  shouldPoll={isStreaming}
                  onMemoryCountChange={setMemoryCount}
                />
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
