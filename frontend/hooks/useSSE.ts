"use client";

import { useState, useCallback, useRef } from "react";
import { getChatStreamUrl } from "@/lib/api";
import { Message } from "@/lib/types";

export function useSSE() {
  const [streamingText, setStreamingText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const streamMessage = useCallback(
    async (
      message: string,
      conversationHistory: Message[],
      onComplete: (fullText: string) => void
    ) => {
      setIsStreaming(true);
      setStreamingText("");

      const historyForApi = conversationHistory.slice(-12).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      abortRef.current = new AbortController();
      let accumulated = "";

      try {
        const res = await fetch(getChatStreamUrl(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message,
            conversation_history: historyForApi,
          }),
          signal: abortRef.current.signal,
        });

        if (!res.ok || !res.body) {
          throw new Error("Stream request failed");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("event: ")) {
              const eventType = line.slice(7).trim();

              if (eventType === "done") {
                setIsStreaming(false);
                onComplete(accumulated);
                return;
              }
              if (eventType === "error") {
                setIsStreaming(false);
                if (!accumulated) {
                  accumulated = "Something went wrong. Try again.";
                  setStreamingText(accumulated);
                }
                onComplete(accumulated);
                return;
              }
            }

            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.token) {
                  accumulated += data.token;
                  setStreamingText(accumulated);
                }
              } catch {
                // skip malformed data lines
              }
            }
          }
        }

        if (accumulated) {
          setIsStreaming(false);
          onComplete(accumulated);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setIsStreaming(false);
        if (!accumulated) {
          accumulated = "Connection interrupted. Try sending that again.";
          setStreamingText(accumulated);
        }
        onComplete(accumulated);
      }
    },
    []
  );

  const cancelStream = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
  }, []);

  return { streamMessage, streamingText, isStreaming, cancelStream };
}
