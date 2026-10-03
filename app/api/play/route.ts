import type { Action } from "@/lib/demo/flow";
import { act, deleteStudent, errorResponse, play, sameOrigin } from "@/lib/live/server";

export const runtime = "nodejs";

const token = (r: Request) => r.headers.get("x-student-token") ?? "";
const noStore = { "Cache-Control": "no-store" };

/**
 * The student's current screen. Questions arrive one at a time, without
 * correct-answer flags until the student has answered; marking happens here.
 */
export async function GET(request: Request) {
  try {
    return Response.json(await play(token(request)), { headers: noStore });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const action = (await request.json().catch(() => null)) as Action | null;
    if (!action || typeof action.type !== "string") return Response.json({ error: "Invalid request." }, { status: 400 });
    return Response.json(await act(token(request), action), { headers: noStore });
  } catch (e) {
    return errorResponse(e);
  }
}

/** Delete my data: removes this student and all their answers. */
export async function DELETE(request: Request) {
  try {
    sameOrigin(request);
    await deleteStudent(token(request));
    return new Response(null, { status: 204 });
  } catch (e) {
    return errorResponse(e);
  }
}
