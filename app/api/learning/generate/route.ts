import { configuredKey, generateCourse, GenerationError } from "@/lib/learning/gemini";
import { enforceGenerationLimit } from "@/lib/learning/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 300;
const MAX_BYTES = 8 * 1024 * 1024;
let active = false;

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return Response.json({ error: "Use the upload form on this site." }, { status: 403 });
  if (!configuredKey()) return Response.json({ error: "AI sessions aren't set up on this server yet (missing GEMINI_API_KEY)." }, { status: 503 });
  if (active) return Response.json({ error: "Another session is being generated. Wait for it to finish, then retry." }, { status: 429 });
  active = true;
  try {
    // Enforce the size against actual bytes, including chunked requests.
    const reader = request.body?.getReader();
    if (!reader) throw new GenerationError("Upload a PDF or paste your notes.", 400);
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES + 100_000) { await reader.cancel(); throw new GenerationError("Use a PDF smaller than 8 MB.", 413); }
      chunks.push(value);
    }
    let form: FormData;
    try {
      form = await new Response(Buffer.concat(chunks), { headers: { "Content-Type": request.headers.get("content-type") ?? "" } }).formData();
    } catch { throw new GenerationError("The upload could not be read. Use the form to try again.", 400); }
    const objective = String(form.get("objective") ?? "").trim();
    const level = String(form.get("level") ?? "College / undergraduate").trim();
    const text = String(form.get("notes") ?? "").trim();
    const file = form.get("file");
    if (objective.length > 300 || level.length > 100 || text.length > 60_000) throw new GenerationError("Notes or session details are too long. Paste at most 60,000 characters.", 400);
    let pdf: Buffer | undefined;
    if (file instanceof File && file.size > 0) {
      if (file.size > MAX_BYTES) throw new GenerationError("Use a PDF smaller than 8 MB.", 413);
      pdf = Buffer.from(await file.arrayBuffer());
      if (!file.name.toLowerCase().endsWith(".pdf") || pdf.subarray(0, 5).toString() !== "%PDF-") throw new GenerationError("Upload a valid PDF, or paste text instead.", 400);
    }
    if (pdf && text) throw new GenerationError("Choose a PDF or pasted text, rather than both.", 400);
    if (!pdf && text.length < 100) throw new GenerationError("Upload a PDF or paste at least 100 characters of lecture notes.", 400);
    await enforceGenerationLimit(request);
    const course = await generateCourse({ pdf, text, objective, level: level || "College / undergraduate" }, request.signal);
    return Response.json({ course, sourceName: pdf && file instanceof File ? file.name : "Pasted lecture notes" }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof GenerationError ? error.message : "The session could not be generated. Please try again." }, { status: error instanceof GenerationError ? error.status : 500 });
  } finally { active = false; }
}
