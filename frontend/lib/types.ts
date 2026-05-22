export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export interface Memory {
  id: string;
  memory: string;
  hash?: string;
  metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
  category?: "Personal" | "Professional" | "Preference" | "Goal";
}

export interface MemoryCountResponse {
  total: number;
  user_id: string;
}

export interface MemoriesResponse {
  memories: Memory[];
}

export interface HealthResponse {
  status: string;
  qdrant_connected: boolean;
}
