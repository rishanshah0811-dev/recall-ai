import { getQdrantClient, COLLECTION_NAME } from "./qdrant";
import type { EmbedContentRequest } from "@google/generative-ai";
import { getGenAI, EMBEDDING_MODEL, EMBEDDING_DIMENSIONS, CHAT_MODEL } from "./gemini";
import { randomUUID } from "crypto";

const FACT_EXTRACTION_PROMPT = `You are a Personal Memory Manager. Extract important facts from this conversation as concise declarative sentences.

Categories:
1. Personal: Name, location, age, family, background, languages
2. Professional: Job, company, skills, projects, education, career
3. Preferences: Likes, dislikes, habits, routines, favorites, opinions
4. Goals: Aspirations, plans, deadlines, what they're working on

Rules:
- Only extract facts explicitly stated or strongly implied
- Each fact = one concise declarative sentence
- Skip greetings, filler, pleasantries
- Do not infer facts not supported by the conversation

Return a JSON array of objects with "fact" and "category" fields. Example:
[{"fact": "User's name is Alex", "category": "Personal"}]

If there are no facts to extract, return an empty array: []

Conversation:
`;

async function embed(text: string): Promise<number[]> {
  const genai = getGenAI();
  const model = genai.getGenerativeModel({ model: EMBEDDING_MODEL });
  // The legacy SDK's types lack outputDimensionality, but it forwards the request body as-is.
  const result = await model.embedContent({
    content: { role: "user", parts: [{ text }] },
    outputDimensionality: EMBEDDING_DIMENSIONS,
  } as EmbedContentRequest);
  return result.embedding.values as number[];
}

async function ensureCollection() {
  const client = getQdrantClient();
  try {
    await client.getCollection(COLLECTION_NAME);
  } catch {
    await client.createCollection(COLLECTION_NAME, {
      vectors: { size: EMBEDDING_DIMENSIONS, distance: "Cosine" },
    });
    await client.createPayloadIndex(COLLECTION_NAME, {
      field_name: "user_id",
      field_schema: "keyword",
    });
  }
}

export async function addMemory(
  messages: { role: string; content: string }[],
  userId: string
): Promise<{ added: number }> {
  const conversationText = messages
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n");

  const genai = getGenAI();
  const model = genai.getGenerativeModel({ model: CHAT_MODEL });

  let facts: { fact: string; category: string }[] = [];
  try {
    const result = await model.generateContent(
      FACT_EXTRACTION_PROMPT + conversationText
    );
    const text = result.response.text();
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    facts = JSON.parse(cleaned);
  } catch (e) {
    console.error("Fact extraction failed:", e);
    return { added: 0 };
  }

  if (!facts || facts.length === 0) return { added: 0 };

  await ensureCollection();
  const client = getQdrantClient();

  const existingMemories = await searchMemory("", userId, 50);

  let added = 0;
  for (const { fact, category } of facts) {
    const isDuplicate = existingMemories.some((m) => {
      const existing = (m.memory || "").toLowerCase();
      const newFact = fact.toLowerCase();
      return (
        existing === newFact ||
        existing.includes(newFact) ||
        newFact.includes(existing)
      );
    });

    if (isDuplicate) continue;

    const vector = await embed(fact);
    const id = randomUUID();

    await client.upsert(COLLECTION_NAME, {
      wait: true,
      points: [
        {
          id,
          vector,
          payload: {
            memory: fact,
            category,
            user_id: userId,
            created_at: new Date().toISOString(),
          },
        },
      ],
    });
    added++;
  }

  return { added };
}

export async function searchMemory(
  query: string,
  userId: string,
  limit: number = 5
): Promise<
  { id: string; memory: string; category?: string; created_at?: string }[]
> {
  await ensureCollection();
  const client = getQdrantClient();

  if (!query || query.trim() === "") {
    return getAllMemories(userId, limit);
  }

  try {
    const vector = await embed(query);
    const results = await client.search(COLLECTION_NAME, {
      vector,
      limit,
      filter: {
        must: [{ key: "user_id", match: { value: userId } }],
      },
      with_payload: true,
    });

    return results.map((r) => ({
      id: typeof r.id === "string" ? r.id : String(r.id),
      memory: (r.payload?.memory as string) || "",
      category: (r.payload?.category as string) || undefined,
      created_at: (r.payload?.created_at as string) || undefined,
    }));
  } catch (e) {
    console.error("Memory search failed:", e);
    return [];
  }
}

export async function getAllMemories(
  userId: string,
  limit: number = 100
): Promise<
  { id: string; memory: string; category?: string; created_at?: string }[]
> {
  await ensureCollection();
  const client = getQdrantClient();

  try {
    const results = await client.scroll(COLLECTION_NAME, {
      filter: {
        must: [{ key: "user_id", match: { value: userId } }],
      },
      limit,
      with_payload: true,
    });

    const memories = (results.points || []).map((p) => ({
      id: typeof p.id === "string" ? p.id : String(p.id),
      memory: (p.payload?.memory as string) || "",
      category: (p.payload?.category as string) || undefined,
      created_at: (p.payload?.created_at as string) || undefined,
    }));

    memories.sort(
      (a, b) =>
        new Date(b.created_at || 0).getTime() -
        new Date(a.created_at || 0).getTime()
    );

    return memories;
  } catch (e) {
    console.error("Get all memories failed:", e);
    return [];
  }
}

export async function deleteMemory(memoryId: string): Promise<boolean> {
  const client = getQdrantClient();
  try {
    await client.delete(COLLECTION_NAME, { points: [memoryId] });
    return true;
  } catch (e) {
    console.error("Delete memory failed:", e);
    return false;
  }
}

export async function getMemoryCount(userId: string): Promise<number> {
  const memories = await getAllMemories(userId);
  return memories.length;
}

export async function checkQdrantConnection(): Promise<boolean> {
  try {
    const client = getQdrantClient();
    await client.getCollections();
    return true;
  } catch {
    return false;
  }
}
