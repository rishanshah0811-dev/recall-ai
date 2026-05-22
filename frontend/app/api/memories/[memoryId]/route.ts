import { NextRequest } from "next/server";
import { deleteMemory } from "@/lib/server/memory";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ memoryId: string }> }
) {
  const { memoryId } = await params;

  const success = await deleteMemory(memoryId);
  if (!success) {
    return Response.json(
      { error: "Failed to delete memory" },
      { status: 500 }
    );
  }

  return Response.json({ success: true, memory_id: memoryId });
}
