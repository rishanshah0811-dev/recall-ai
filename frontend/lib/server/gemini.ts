import { GoogleGenerativeAI } from "@google/generative-ai";

let genai: GoogleGenerativeAI | null = null;

export function getGenAI(): GoogleGenerativeAI {
  if (!genai) {
    genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  }
  return genai;
}

// text-embedding-004 and gemini-2.0-flash were shut down in 2026 and now 404.
export const EMBEDDING_MODEL = "gemini-embedding-2";
// gemini-embedding-2 defaults to 3072 dims; pin to 768 to match the Qdrant collection.
export const EMBEDDING_DIMENSIONS = 768;
// 3.6 rather than the newest 3.x: in Oct 2026 tests 3.8 returned 503s under load, 3.6 did not.
export const CHAT_MODEL = "gemini-3.6-flash";
