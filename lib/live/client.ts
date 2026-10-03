"use client";

// Browser-side helpers for Live Mode. Tokens live in localStorage only (never in
// URLs). Every storage access is guarded: private windows can throw.

import { useMemo, useSyncExternalStore } from "react";
import type { Action } from "../demo/flow";
import type { ClassInfo, LiveView } from "./types";

const STUDENT = "patch.student";
const TEACHER = "patch.teacher";

export type StudentSession = { token: string; classId: string; className: string; nickname: string };
export type TeacherClass = { id: string; name: string; joinCode: string; teacherKey: string };

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
const listeners = new Set<() => void>();
function write(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable: the session lasts until the tab closes */
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}
function rawItem(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
/**
 * Read a stored value in render without hydration mismatches: the server
 * snapshot is `undefined` ("not known yet"), the client snapshot the raw string.
 */
function useStored<T>(key: string): T | null | undefined {
  const raw = useSyncExternalStore(subscribe, () => rawItem(key), () => undefined);
  return useMemo(() => {
    if (raw === undefined) return undefined;
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }, [raw]);
}

/** undefined while not known (server render), null when absent. */
export const useStudentSession = () => useStored<StudentSession>(STUDENT);
export const useTeacherClasses = () => useStored<TeacherClass[]>(TEACHER);

export const studentSession = () => read<StudentSession>(STUDENT);
export const saveStudentSession = (s: StudentSession | null) => write(STUDENT, s);
export const teacherClasses = () => read<TeacherClass[]>(TEACHER) ?? [];
export const teacherClass = (id: string) => teacherClasses().find((c) => c.id === id) ?? null;
export function saveTeacherClass(c: TeacherClass) {
  write(TEACHER, [c, ...teacherClasses().filter((x) => x.id !== c.id)].slice(0, 20));
}
export function forgetTeacherClass(id: string) {
  write(TEACHER, teacherClasses().filter((x) => x.id !== id));
}

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

async function api<T>(url: string, init: RequestInit & { headers?: Record<string, string> } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init.headers }, cache: "no-store" });
  } catch {
    throw new ApiError("You're offline or the connection dropped. Check your connection and try again.", 0);
  }
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(body.error ?? "Something went wrong. Please try again.", res.status);
  return body as T;
}

export type PublicCourse = { title: string; objective: string; targetSkillId: string; skills: unknown[] } | null;
export type PlayResponse = { class: ClassInfo; nickname: string; view: LiveView; course: PublicCourse };

export const joinClass = (code: string, nickname: string) =>
  api<{ token: string; class: ClassInfo; nickname: string }>("/api/join", { method: "POST", body: JSON.stringify({ code, nickname }) });

export const getPlay = (token: string) => api<PlayResponse>("/api/play", { headers: { "x-student-token": token } });

export const sendAction = (token: string, action: Action) =>
  api<PlayResponse>("/api/play", { method: "POST", headers: { "x-student-token": token }, body: JSON.stringify(action) });

export const deleteMyData = (token: string) => api<void>("/api/play", { method: "DELETE", headers: { "x-student-token": token } });

export const createClass = (name: string, course?: unknown) =>
  api<{ class: ClassInfo; teacherKey: string }>("/api/classes", { method: "POST", body: JSON.stringify({ name, course }) });

export const getDashboard = <T,>(id: string, key: string) => api<T>(`/api/classes/${id}`, { headers: { "x-teacher-key": key } });

export const setClassState = (id: string, key: string, state: "live" | "finished") =>
  api<void>(`/api/classes/${id}/state`, { method: "POST", headers: { "x-teacher-key": key }, body: JSON.stringify({ state }) });

export const deleteClass = (id: string, key: string) => api<void>(`/api/classes/${id}`, { method: "DELETE", headers: { "x-teacher-key": key } });
