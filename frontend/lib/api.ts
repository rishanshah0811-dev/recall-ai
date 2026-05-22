import { MemoriesResponse, MemoryCountResponse, HealthResponse } from "./types";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function fetchMemories(
  userId?: string
): Promise<MemoriesResponse> {
  const params = userId ? `?user_id=${userId}` : "";
  const res = await fetch(`${API_URL}/memories${params}`);
  if (!res.ok) throw new Error("Failed to fetch memories");
  return res.json();
}

export async function fetchMemoryCount(
  userId?: string
): Promise<MemoryCountResponse> {
  const params = userId ? `?user_id=${userId}` : "";
  const res = await fetch(`${API_URL}/memories/count${params}`);
  if (!res.ok) throw new Error("Failed to fetch memory count");
  return res.json();
}

export async function deleteMemory(memoryId: string, userId?: string) {
  const params = userId ? `?user_id=${userId}` : "";
  const res = await fetch(`${API_URL}/memories/${memoryId}${params}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete memory");
  return res.json();
}

export async function checkHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_URL}/health`);
  if (!res.ok) throw new Error("Health check failed");
  return res.json();
}

export function getChatStreamUrl(): string {
  return `${API_URL}/chat/stream`;
}
