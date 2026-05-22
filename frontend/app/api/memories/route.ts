import { NextRequest } from "next/server";
import { getAllMemories } from "@/lib/server/memory";

export async function GET(req: NextRequest) {
  const userId =
    req.nextUrl.searchParams.get("user_id") ||
    process.env.DEFAULT_USER_ID ||
    "default_user";

  const memories = await getAllMemories(userId);
  return Response.json({ memories });
}
