"use client";

import { motion } from "motion/react";
import { Message } from "@/lib/types";

interface Props {
  message: Message;
  isStreaming?: boolean;
}

export default function MessageBubble({ message, isStreaming }: Props) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={`mb-5 ${isUser ? "flex justify-end" : "flex justify-start"}`}
    >
      {isUser ? (
        <div className="user-bubble max-w-[72%] px-4 py-3 rounded text-[var(--text-primary)] font-body text-[14.5px] leading-[1.7]">
          {message.content}
        </div>
      ) : (
        <div className="max-w-[82%] text-[var(--text-primary)] font-body text-[14.5px] leading-[1.7] whitespace-pre-wrap">
          {message.content}
          {isStreaming && (
            <span className="inline-block w-[1.5px] h-[16px] bg-[var(--accent)] ml-0.5 animate-cursor-blink align-text-bottom opacity-80" />
          )}
        </div>
      )}
    </motion.div>
  );
}
