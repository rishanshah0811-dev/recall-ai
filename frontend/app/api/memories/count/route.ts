import { NextRequest } from "next/server";
import { getMemoryCount } from "@/lib/server/memory";

export async function GET(req: NextRequest) {
  const userId =
    req.nextUrl.searchParams.get("user_id") ||
    process.env.DEFAULT_USER_ID ||
    "default_user";

  const total = await getMemoryCount(userId);
  return Response.json({ total, user_id: userId });
}
