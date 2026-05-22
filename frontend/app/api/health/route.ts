import { checkQdrantConnection } from "@/lib/server/memory";

export async function GET() {
  const qdrantOk = await checkQdrantConnection();
  return Response.json({ status: "ok", qdrant_connected: qdrantOk });
}
