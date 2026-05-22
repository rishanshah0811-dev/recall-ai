"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import { Message } from "@/lib/types";
import { fetchMemories, fetchMemoryCount } from "@/lib/api";
import { useSSE } from "@/hooks/useSSE";
import MessageBubble from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";

interface Props {
  onStreamingChange: (streaming: boolean) => void;
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 11);
}

const DEFAULT_WELCOME =
  "Hi — I'm Recall. I don't know anything about you yet, but I will. Tell me something.";

export default function ChatPanel({ onStreamingChange }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [waitingForFirst, setWaitingForFirst] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const initializedRef = useRef(false);
  const { streamMessage, streamingText, isStreaming } = useSSE();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText, scrollToBottom]);

  useEffect(() => {
    onStreamingChange(isStreaming);
  }, [isStreaming, onStreamingChange]);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    (async () => {
      try {
        const countData = await fetchMemoryCount();
        if (countData.total > 0) {
          const memData = await fetchMemories();
          const memContext = (memData.memories || [])
            .slice(0, 10)
            .map((m) => m.memory)
            .join("; ");

          setWaitingForFirst(true);
          streamMessage(
            `The user has returned. Here are things you know about them: ${memContext}. Greet them warmly and personally based on what you know. Keep it to 1-2 sentences.`,
            [],
            (fullText) => {
              setMessages([
                {
                  id: generateId(),
                  role: "assistant",
                  content: fullText,
                  timestamp: Date.now(),
                },
              ]);
              setWaitingForFirst(false);
            }
          );
        } else {
          setMessages([
            {
              id: generateId(),
              role: "assistant",
              content: DEFAULT_WELCOME,
              timestamp: Date.now(),
            },
          ]);
        }
      } catch {
        setMessages([
          {
            id: generateId(),
            role: "assistant",
            content: DEFAULT_WELCOME,
            timestamp: Date.now(),
          },
        ]);
      }
    })();
  }, [streamMessage]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    const userMessage: Message = {
      id: generateId(),
      role: "user",
      content: text,
      timestamp: Date.now(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");

    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }

    streamMessage(text, updatedMessages, (fullText) => {
      const aiMessage: Message = {
        id: generateId(),
        role: "assistant",
        content: fullText,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, aiMessage]);
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + "px";
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto px-8 py-6 custom-scrollbar">
        <div className="max-w-2xl mx-auto">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}

          {isStreaming && !waitingForFirst && streamingText && (
            <MessageBubble
              message={{
                id: "streaming",
                role: "assistant",
                content: streamingText,
                timestamp: Date.now(),
              }}
              isStreaming
            />
          )}

          {isStreaming && !streamingText && !waitingForFirst && (
            <TypingIndicator />
          )}

          {waitingForFirst && streamingText ? (
            <MessageBubble
              message={{
                id: "welcome-stream",
                role: "assistant",
                content: streamingText,
                timestamp: Date.now(),
              }}
              isStreaming
            />
          ) : (
            waitingForFirst && !streamingText && <TypingIndicator />
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="border-t border-[var(--border-subtle)] px-6 py-4">
        <div className="flex items-end gap-3 max-w-2xl mx-auto">
          <div className="flex-1 input-glow rounded-lg transition-shadow duration-300">
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Say something..."
              rows={1}
              className="w-full resize-none bg-[var(--surface)] border border-[var(--border)] rounded-lg px-4 py-3 text-[var(--text-primary)] font-body text-[14px] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]/30 transition-colors"
            />
          </div>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            className="send-btn px-5 py-3 text-white rounded-lg text-[13px] font-mono tracking-wide disabled:opacity-20 disabled:cursor-not-allowed disabled:transform-none shrink-0"
          >
            Send
          </motion.button>
        </div>
      </div>
    </div>
  );
}
