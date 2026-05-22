import { NextRequest } from "next/server";
import { streamChatResponse } from "@/lib/server/chat";
import { addMemory } from "@/lib/server/memory";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { message, conversation_history = [], user_id } = body;

  if (!message || !message.trim()) {
    return new Response(JSON.stringify({ error: "Message cannot be empty" }), {
      status: 400,
    });
  }

  const userId = user_id || process.env.DEFAULT_USER_ID || "default_user";

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const fullParts: string[] = [];

      try {
        const generator = streamChatResponse(
          message,
          conversation_history,
          userId
        );

        let result = await generator.next();
        while (!result.done) {
          const token = result.value;
          fullParts.push(token);
          const data = JSON.stringify({ token });
          controller.enqueue(
            encoder.encode(`event: token\ndata: ${data}\n\n`)
          );
          result = await generator.next();
        }

        controller.enqueue(
          encoder.encode(
            `event: done\ndata: ${JSON.stringify({ status: "complete" })}\n\n`
          )
        );
      } catch (e) {
        console.error("Stream error:", e);
        controller.enqueue(
          encoder.encode(
            `event: error\ndata: ${JSON.stringify({ error: String(e) })}\n\n`
          )
        );
      } finally {
        const fullText = fullParts.join("");
        if (fullText) {
          addMemory(
            [
              { role: "user", content: message },
              { role: "assistant", content: fullText },
            ],
            userId
          ).catch((e) => console.error("Background memory add failed:", e));
        }
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
