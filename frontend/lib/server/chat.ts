import { getGenAI, CHAT_MODEL } from "./gemini";
import { searchMemory } from "./memory";

const SYSTEM_PROMPT = `You are Recall, a thoughtful and perceptive AI assistant. You listen carefully, remember everything meaningful, and over time develop a genuine understanding of the person you're talking to.

You have a persistent memory system. Below are things you know about this person from past conversations:

{memories}

How to use memories:
- Weave what you know into your responses naturally, the way a close friend would
- Do NOT prefix every response with "I remember you said..." — that feels mechanical
- Only explicitly reference a specific memory when it is directly and importantly relevant
- If you know their name, use it occasionally but not in every message
- If a memory is relevant to their question, use that context to give a more personalized answer
- If no memories are relevant to the current message, just respond naturally without forcing references

Your personality:
- Warm but not saccharine — genuine, not performative
- Curious — you ask follow-up questions that show you were actually listening
- Concise — you don't ramble. Short paragraphs, clear thinking
- You have opinions when asked, but you present them as your perspective, not as truth
- You occasionally use humor when it fits naturally

If this is the very first conversation and you have no memories yet, introduce yourself briefly and invite the person to share something about themselves. Keep it natural, not like a form.`;

function formatMemories(
  memories: { memory: string }[]
): string {
  if (!memories || memories.length === 0) {
    return "No memories stored yet — this appears to be a new conversation.";
  }
  return memories
    .filter((m) => m.memory)
    .map((m) => `- ${m.memory}`)
    .join("\n");
}

export async function* streamChatResponse(
  userMessage: string,
  conversationHistory: { role: string; content: string }[],
  userId: string
): AsyncGenerator<string, string, unknown> {
  const genai = getGenAI();

  const relevantMemories = await searchMemory(userMessage, userId, 5);
  const allMemories = await searchMemory("", userId, 20);

  const combined = new Map<string, { memory: string }>();
  for (const m of allMemories) combined.set(m.id, m);
  for (const m of relevantMemories) combined.set(m.id, m);

  const systemPrompt = SYSTEM_PROMPT.replace(
    "{memories}",
    formatMemories([...combined.values()])
  );

  const geminiHistory = conversationHistory.slice(-12).map((msg) => ({
    role: msg.role === "assistant" ? "model" : "user",
    parts: [{ text: msg.content }],
  }));

  const model = genai.getGenerativeModel({
    model: CHAT_MODEL,
    systemInstruction: systemPrompt,
  });

  const chat = model.startChat({ history: geminiHistory });

  let fullResponse = "";
  try {
    const result = await chat.sendMessageStream(userMessage);
    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        fullResponse += text;
        yield text;
      }
    }
  } catch (e) {
    console.error("Gemini streaming error:", e);
    const errorMsg = "I hit a snag processing that. Could you try again?";
    fullResponse = errorMsg;
    yield errorMsg;
  }

  return fullResponse;
}
