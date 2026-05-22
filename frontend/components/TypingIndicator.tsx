"use client";

import { motion } from "motion/react";

export default function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="flex items-center gap-1.5 py-4"
    >
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="typing-dot"
          style={{ animationDelay: `${i * 160}ms` }}
        />
      ))}
    </motion.div>
  );
}
