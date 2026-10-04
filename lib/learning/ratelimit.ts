import "server-only";
import { createHash } from "node:crypto";
import { db, liveConfigured } from "../live/server";
import { GenerationError } from "./gemini";

const DAY_MS = 24 * 60 * 60 * 1000;
const perVisitor = () => Number(process.env.GEMINI_DAILY_LIMIT_PER_VISITOR ?? 50);
const global = () => Number(process.env.GEMINI_DAILY_LIMIT_TOTAL ?? 100);

/** Visitor IP as a salted hash, so raw addresses are never stored. */
function visitorHash(request: Request) {
  const ip = request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const salt = process.env.RATE_LIMIT_SALT ?? process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "patch";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

/**
 * Daily limits for AI generation on the public site, so a shared Gemini key
 * can't be drained. Uses Supabase when configured; without it (local dev) no
 * limit is applied.
 */
export async function enforceGenerationLimit(request: Request) {
  if (!liveConfigured()) return;
  const since = new Date(Date.now() - DAY_MS).toISOString();
  const ip_hash = visitorHash(request);
  const [mine, all] = await Promise.all([
    db().from("generation_log").select("id", { count: "exact", head: true }).eq("ip_hash", ip_hash).gte("created_at", since),
    db().from("generation_log").select("id", { count: "exact", head: true }).gte("created_at", since),
  ]);
  if (mine.error || all.error) throw new GenerationError("Couldn't check the usage limit. Please try again shortly.", 503);
  if ((all.count ?? 0) >= global()) {
    throw new GenerationError("Patch has reached today's limit for generating sessions. Please try again tomorrow, or use the demo.", 429);
  }
  if ((mine.count ?? 0) >= perVisitor()) {
    throw new GenerationError(`You've generated ${perVisitor()} sessions today, the daily limit. Please come back tomorrow.`, 429);
  }
  const { error } = await db().from("generation_log").insert({ ip_hash });
  if (error) throw new GenerationError("Couldn't check the usage limit. Please try again shortly.", 503);
}
