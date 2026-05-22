import { MemoriesResponse, MemoryCountResponse, HealthResponse } from "./types";

const API_URL = "";

export async function fetchMemories(
  userId?: string
): Promise<MemoriesResponse> {
  const params = userId ? `?user_id=${userId}` : "";
  const res = await fetch(`${API_URL}/api/memories${params}`);
  if (!res.ok) throw new Error("Failed to fetch memories");
  return res.json();
}

export async function fetchMemoryCount(
  userId?: string
): Promise<MemoryCountResponse> {
  const params = userId ? `?user_id=${userId}` : "";
  const res = await fetch(`${API_URL}/api/memories/count${params}`);
  if (!res.ok) throw new Error("Failed to fetch memory count");
  return res.json();
}

export async function deleteMemory(memoryId: string, userId?: string) {
  const params = userId ? `?user_id=${userId}` : "";
  const res = await fetch(`${API_URL}/api/memories/${memoryId}${params}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete memory");
  return res.json();
}

export async function checkHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_URL}/api/health`);
  if (!res.ok) throw new Error("Health check failed");
  return res.json();
}

export function getChatStreamUrl(): string {
  return `${API_URL}/api/chat/stream`;
}
