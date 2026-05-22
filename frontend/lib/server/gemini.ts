import { GoogleGenerativeAI } from "@google/generative-ai";

let genai: GoogleGenerativeAI | null = null;

export function getGenAI(): GoogleGenerativeAI {
  if (!genai) {
    genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  }
  return genai;
}

export const EMBEDDING_MODEL = "text-embedding-004";
export const CHAT_MODEL = "gemini-2.0-flash";
