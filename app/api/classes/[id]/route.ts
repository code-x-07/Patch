import { dashboard, deleteClass, errorResponse, sameOrigin } from "@/lib/live/server";

export const runtime = "nodejs";

const key = (r: Request) => r.headers.get("x-teacher-key") ?? "";

/** Teacher dashboard data (polled every 2 seconds). Class aggregates come from the same engine as the demo. */
export async function GET(request: Request, ctx: RouteContext<"/api/classes/[id]">) {
  try {
    const { id } = await ctx.params;
    return Response.json(await dashboard(id, key(request)), { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return errorResponse(e);
  }
}

/** Delete the class and every student and answer in it. */
export async function DELETE(request: Request, ctx: RouteContext<"/api/classes/[id]">) {
  try {
    sameOrigin(request);
    const { id } = await ctx.params;
    await deleteClass(id, key(request));
    return new Response(null, { status: 204 });
  } catch (e) {
    return errorResponse(e);
  }
}
