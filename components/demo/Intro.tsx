"use client";

import { Lock, Users, Zap } from "lucide-react";
import { OBJECTIVE_NAME } from "@/lib/content/skills";
import type { SkillId } from "@/lib/content/types";
import { CLASSMATE_COUNT, QUIZ_LENGTH } from "@/lib/demo/constants";
import { skillGraph } from "@/lib/engine/skillGraph";
import type { Status } from "@/lib/engine/types";
import { MapStage } from "../MapStage";
import { Button } from "../ui";

const UNTESTED = Object.fromEntries(skillGraph.ids.map((id) => [id, "unknown"])) as Record<SkillId, Status>;

export function Intro({ ready, fast, onStart, onToggleFast }: { ready: boolean; fast: boolean; onStart: () => void; onToggleFast: () => void }) {
  return (
    <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:py-16">
      <div className="anim-rise">
        <h1 className="font-display text-4xl font-bold tracking-tight text-balance sm:text-5xl">
          Play one quiz. Watch Patch find what&apos;s really in the way.
        </h1>
        <p className="mt-5 max-w-xl text-lg text-muted">
          You&apos;re a student in a class working on {OBJECTIVE_NAME.toLowerCase()}. Answer {QUIZ_LENGTH} questions, then follow
          the trail from your mistakes back to the skill that&apos;s causing them, fix it, and prove the fix works.
        </p>

        <ul className="mt-7 grid max-w-xl gap-3 text-base text-muted">
          <li className="flex gap-3">
            <Users aria-hidden className="mt-0.5 size-5 shrink-0 text-beam" />
            <span>
              Your class is {CLASSMATE_COUNT} <strong className="text-text">simulated classmates</strong>. Their answers run
              through the same engine, so the teacher view at the end is computed, not drawn.
            </span>
          </li>
          <li className="flex gap-3">
            <Zap aria-hidden className="mt-0.5 size-5 shrink-0 text-beam" />
            <span>
              <strong className="text-text">Script</strong> tags mark what the scripted student picks, so the demo lands the same
              way every time. Turn them off and answer your own way. The engine reacts honestly either way.
            </span>
          </li>
          <li className="flex gap-3">
            <Lock aria-hidden className="mt-0.5 size-5 shrink-0 text-beam" />
            <span>Nothing leaves this browser. No account, no data stored, no network calls once it&apos;s ready.</span>
          </li>
        </ul>

        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
          <Button size="lg" onClick={onStart} disabled={!ready} loading={!ready} className="sm:min-w-52">
            {ready ? "Start demo" : "Getting ready…"}
          </Button>
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-base font-semibold text-muted">
            <input
              type="checkbox"
              className="size-5 cursor-pointer accent-[var(--color-beam)]"
              checked={fast}
              onChange={onToggleFast}
            />
            Demo Fast Mode
            <span className="font-normal text-faint">(60-second mission, skips bridge checks)</span>
          </label>
        </div>
      </div>

      <div className="relative mx-auto w-full max-w-md lg:max-w-none" aria-hidden>
        <div className="absolute inset-[10%] rounded-full bg-beam/10 blur-3xl" />
        <MapStage status={UNTESTED} label="Your Knowledge Map, not tested yet" className="map-fit relative opacity-80" />
      </div>
    </div>
  );
}
