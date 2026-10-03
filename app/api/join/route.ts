import { errorResponse, join, sameOrigin } from "@/lib/live/server";

export const runtime = "nodejs";

/** Student joins with a class code and a nickname. No email, no password. */
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const body = await request.json().catch(() => ({}));
    const joined = await join(String(body?.code ?? ""), String(body?.nickname ?? ""));
    return Response.json(joined, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return errorResponse(e);
  }
}
