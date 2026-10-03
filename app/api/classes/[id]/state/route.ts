import { errorResponse, LiveError, sameOrigin, setClassState } from "@/lib/live/server";

export const runtime = "nodejs";

/** Teacher starts (lobby → live) or ends (live → finished) the Class Fight. */
export async function POST(request: Request, ctx: RouteContext<"/api/classes/[id]/state">) {
  try {
    sameOrigin(request);
    const { id } = await ctx.params;
    const body = await request.json().catch(() => ({}));
    if (body?.state !== "live" && body?.state !== "finished") throw new LiveError("Unknown class state.");
    await setClassState(id, request.headers.get("x-teacher-key") ?? "", body.state);
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
