import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { classReport, type ClassReport, type Member } from "../demo/classroom";
import { DEMO_COURSE, initialState, reducer } from "../demo/course";
import type { Action, DemoState } from "../demo/flow";
import { QUIZ } from "../demo/script";
import type { ClassInfo, LiveView } from "./types";
import { toLiveView } from "./view";

export class LiveError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

const url = () => process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = () => process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

export const liveConfigured = () => !!url() && !!secret();

let client: SupabaseClient | null = null;
export function db(): SupabaseClient {
  if (!liveConfigured()) throw new LiveError("Live classes aren't set up on this server yet (missing Supabase keys).", 503);
  return (client ??= createClient(url()!, secret()!, { auth: { persistSession: false, autoRefreshToken: false } }));
}

export const newToken = () => randomBytes(24).toString("base64url");
export const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");
function sameHash(a: string, b: string) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O or 1/I
const newJoinCode = () => Array.from({ length: 6 }, () => CODE_CHARS[randomInt(CODE_CHARS.length)]).join("");

type ClassRow = { id: string; name: string; join_code: string; teacher_key_hash: string; state: ClassInfo["state"] };
type StudentRow = { id: string; class_id: string; nickname: string; state: DemoState; stage: string; version: number };

const info = (c: ClassRow): ClassInfo => ({ id: c.id, name: c.name, joinCode: c.join_code, state: c.state });

function fail(error: { message: string; code?: string } | null, what: string): asserts error is null {
  if (error) {
    console.error(`[live] ${what}:`, error.code, error.message);
    throw new LiveError("Something went wrong saving that. Please try again.", 500);
  }
}

// ---------- Teacher ----------

export async function createClass(name: string) {
  const clean = name.trim().slice(0, 60);
  if (!clean) throw new LiveError("Give the class a name, like “Year 10 Maths”.");
  const teacherKey = newToken();
  for (let tries = 0; tries < 5; tries++) {
    const { data, error } = await db()
      .from("classes")
      .insert({ name: clean, join_code: newJoinCode(), teacher_key_hash: hashToken(teacherKey) })
      .select("id, name, join_code, teacher_key_hash, state")
      .single();
    if (error?.code === "23505") continue; // join code collision: try another
    fail(error, "create class");
    return { class: info(data as ClassRow), teacherKey };
  }
  throw new LiveError("Couldn't create a unique class code. Please try again.", 500);
}

async function teacherClass(classId: string, teacherKey: string): Promise<ClassRow> {
  if (!/^[0-9a-f-]{36}$/.test(classId)) throw new LiveError("Class not found.", 404);
  const { data, error } = await db().from("classes").select("id, name, join_code, teacher_key_hash, state").eq("id", classId).maybeSingle();
  fail(error, "load class");
  if (!data) throw new LiveError("Class not found. It may have been deleted.", 404);
  if (!teacherKey || !sameHash(hashToken(teacherKey), (data as ClassRow).teacher_key_hash)) {
    throw new LiveError("This browser doesn't hold the teacher key for that class.", 403);
  }
  return data as ClassRow;
}

export type Dashboard = {
  class: ClassInfo;
  roster: { nickname: string; stage: string; answered: number }[];
  report: ClassReport;
  quizTotal: number;
};

export async function dashboard(classId: string, teacherKey: string): Promise<Dashboard> {
  const c = await teacherClass(classId, teacherKey);
  const { data, error } = await db().from("students").select("id, nickname, state, stage").eq("class_id", c.id).order("created_at");
  fail(error, "load students");
  const rows = (data ?? []) as Pick<StudentRow, "id" | "nickname" | "state" | "stage">[];
  const members: Member[] = rows.map((r) => ({
    id: r.id,
    name: r.nickname,
    simulated: false,
    diagnosed: r.state.diagnosed ?? r.state.learner,
    current: r.state.learner,
    rootGaps: r.state.diagnosis?.rootGaps ?? [],
    uncertain: r.state.diagnosis?.uncertain ?? false,
    rootDefeated: r.state.result?.rootDefeated ?? false,
    transferVerified: r.state.result?.transferVerified ?? false,
    needsTeacher: r.state.result?.needsTeacher ?? false,
  }));
  return {
    class: info(c),
    roster: rows.map((r) => ({ nickname: r.nickname, stage: r.stage, answered: r.state.learner.attempts.length })),
    report: classReport(members),
    quizTotal: QUIZ.length,
  };
}

export async function setClassState(classId: string, teacherKey: string, state: "live" | "finished") {
  const c = await teacherClass(classId, teacherKey);
  const allowed = (c.state === "lobby" && state === "live") || (c.state === "live" && state === "finished");
  if (!allowed) throw new LiveError(`The class is already ${c.state}.`, 409);
  const { error } = await db()
    .from("classes")
    .update({ state, ...(state === "live" ? { started_at: new Date().toISOString() } : {}) })
    .eq("id", c.id);
  fail(error, "update class");
}

/** Delete a class and, by cascade, every student and answer in it. */
export async function deleteClass(classId: string, teacherKey: string) {
  const c = await teacherClass(classId, teacherKey);
  const { error } = await db().from("classes").delete().eq("id", c.id);
  fail(error, "delete class");
}

// ---------- Student ----------

export async function join(code: string, nickname: string) {
  const joinCode = code.trim().toUpperCase();
  const nick = nickname.trim().replace(/\s+/g, " ").slice(0, 24);
  if (!/^[A-Z0-9]{6}$/.test(joinCode)) throw new LiveError("Class codes are 6 letters or numbers.");
  if (!nick) throw new LiveError("Add a first name or nickname so your teacher knows it's you.");
  const { data: c, error } = await db().from("classes").select("id, name, join_code, teacher_key_hash, state").eq("join_code", joinCode).maybeSingle();
  fail(error, "find class");
  if (!c) throw new LiveError("No class has that code. Check the code on your teacher's screen.", 404);
  if ((c as ClassRow).state === "finished") throw new LiveError("That class has finished. Ask your teacher for a new code.", 409);
  const token = newToken();
  const { error: insertError } = await db()
    .from("students")
    .insert({ class_id: c.id, nickname: nick, token_hash: hashToken(token), state: initialState(), stage: "intro" });
  if (insertError?.code === "23505") throw new LiveError("Someone in this class already uses that name. Add an initial, like “Sam K”.", 409);
  fail(insertError, "join");
  return { token, class: info(c as ClassRow), nickname: nick };
}

async function student(token: string): Promise<{ s: StudentRow; c: ClassRow }> {
  if (!token) throw new LiveError("Join a class first.", 401);
  const { data, error } = await db()
    .from("students")
    .select("id, class_id, nickname, state, stage, version, classes (id, name, join_code, teacher_key_hash, state)")
    .eq("token_hash", hashToken(token))
    .maybeSingle();
  fail(error, "load student");
  if (!data) throw new LiveError("We couldn't find you in a class. Join again with the class code.", 401);
  const { classes, ...s } = data as unknown as StudentRow & { classes: ClassRow };
  return { s, c: classes };
}

export type PlayResponse = { class: ClassInfo; nickname: string; view: LiveView };

const STUDENT_ACTIONS = new Set<Action["type"]>(["answer", "continue", "trace", "dispute", "beginMission", "lessonDone", "goto"]);

/** Current view for a student; starts their quiz once the teacher has started the class. */
export async function play(token: string): Promise<PlayResponse> {
  const { s, c } = await student(token);
  let state = s.state;
  if (c.state !== "lobby" && state.stage === "intro") {
    state = await save(s, reducer(state, { type: "start" }));
  }
  return { class: info(c), nickname: s.nickname, view: toLiveView(state, DEMO_COURSE) };
}

export async function act(token: string, action: Action): Promise<PlayResponse> {
  const { s, c } = await student(token);
  if (!STUDENT_ACTIONS.has(action.type)) throw new LiveError("That action isn't available in a live class.");
  if (action.type === "goto" && !["map", "victory", "reveal", "report"].includes(action.stage)) throw new LiveError("That screen isn't available.");
  if (action.type === "answer" && !(Number.isInteger(action.optionIndex) && action.optionIndex >= 0 && action.optionIndex < 4 && ["sure", "guess"].includes(action.confidence))) {
    throw new LiveError("Invalid answer.");
  }
  if (c.state === "lobby") throw new LiveError("Your teacher hasn't started yet.", 409);
  const next = reducer(s.state, action);
  const state = next === s.state ? s.state : await save(s, next);
  return { class: info(c), nickname: s.nickname, view: toLiveView(state, DEMO_COURSE) };
}

/** Optimistic write: the version must match, so double taps can't apply twice. */
async function save(s: StudentRow, next: DemoState): Promise<DemoState> {
  const { data, error } = await db()
    .from("students")
    .update({ state: next, stage: next.stage, version: s.version + 1, last_seen: new Date().toISOString() })
    .eq("id", s.id)
    .eq("version", s.version)
    .select("id");
  fail(error, "save progress");
  if (!data?.length) throw new LiveError("That answer was already recorded. Refreshing your screen…", 409);
  const fresh = next.learner.attempts.slice(s.state.learner.attempts.length);
  if (fresh.length) {
    const { error: aErr } = await db().from("attempts").insert(
      fresh.map((a) => ({
        class_id: s.class_id,
        student_id: s.id,
        seq: a.seq,
        question_id: a.questionId,
        skill_id: a.skillId,
        phase: a.phase,
        chosen_index: a.optionIndex,
        correct: a.correct,
        confidence: a.confidence,
        hints_used: a.hintsUsed,
        m_before: a.mBefore,
        m_after: a.mAfter,
        baseline: a.baseline,
        misconception_id: a.misconceptionId ?? null,
      })),
    );
    fail(aErr, "record attempts");
  }
  s.version += 1;
  s.state = next;
  return next;
}

/** "Delete my data": removes the student and, by cascade, all their answers. */
export async function deleteStudent(token: string) {
  const { s } = await student(token);
  const { error } = await db().from("students").delete().eq("id", s.id);
  fail(error, "delete student");
}

export function errorResponse(e: unknown) {
  if (e instanceof LiveError) return Response.json({ error: e.message }, { status: e.status });
  console.error("[live] unexpected", e);
  return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}

/** Reject cross-site form posts. */
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) throw new LiveError("Use this site's own pages.", 403);
}
