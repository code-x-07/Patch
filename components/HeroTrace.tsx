"use client";

import { useEffect, useState } from "react";
import { skillById } from "@/lib/content/skills";
import type { SkillId } from "@/lib/content/types";
import type { Status } from "@/lib/engine/types";
import type { Edge } from "./KnowledgeMap";
import { KnowledgeMap } from "./KnowledgeMap";
import { useReducedMotion } from "./useReducedMotion";

/**
 * A looping, illustrative trace on the real map: a miss at Solving quadratics
 * traces back to Multiplying negatives, then the path repairs.
 */
const SPINE: SkillId[] = ["S17", "S13", "S10", "S9", "S8", "S3"];
const ALL: SkillId[] = Object.keys(skillById) as SkillId[];

type Frame = { status: Partial<Record<SkillId, Status>>; traced: Edge[]; repair: Edge[]; pulse: SkillId | null; focus: SkillId | null; caption: string; ms: number };

function buildFrames(): Frame[] {
  const frames: Frame[] = [];
  const base: Partial<Record<SkillId, Status>> = { S17: "gap" };
  frames.push({ status: { ...base }, traced: [], repair: [], pulse: null, focus: "S17", caption: "A student misses a quadratics question.", ms: 1400 });
  const traced: Edge[] = [];
  const st = { ...base };
  for (let i = 1; i < SPINE.length; i++) {
    traced.push([SPINE[i], SPINE[i - 1]]);
    st[SPINE[i]] = i === SPINE.length - 1 ? "root_gap" : "gap";
    if (i === SPINE.length - 1) st.S2 = "known";
    frames.push({
      status: { ...st },
      traced: [...traced],
      repair: [],
      pulse: i === SPINE.length - 1 ? "S3" : null,
      focus: SPINE[i],
      caption: i === SPINE.length - 1 ? "The real blocker: multiplying negatives." : "Patch follows the trail back, checking each step.",
      ms: i === SPINE.length - 1 ? 2600 : 650,
    });
  }
  const repaired: Partial<Record<SkillId, Status>> = { ...st, S3: "known", S8: "suspect", S9: "suspect", S10: "suspect", S13: "suspect", S17: "known" };
  const repair: Edge[] = [...SPINE].reverse().slice(0, -1).map((id, i, arr) => [id, i + 1 < arr.length ? arr[i + 1] : "S17"] as Edge);
  frames.push({ status: repaired, traced: [], repair, pulse: null, focus: "S17", caption: "Repair it, then prove it on a brand-new question.", ms: 2800 });
  return frames;
}

const FRAMES = buildFrames();

export function HeroTrace() {
  const reduced = useReducedMotion();
  const [i, setI] = useState(0);
  useEffect(() => {
    if (reduced) return;
    const t = setTimeout(() => setI((n) => (n + 1) % FRAMES.length), FRAMES[i].ms);
    return () => clearTimeout(t);
  }, [i, reduced]);
  // Reduced motion: a single, still frame that shows the whole idea.
  const f = reduced ? FRAMES[SPINE.length - 1] : FRAMES[i];
  const status = Object.fromEntries(ALL.map((id) => [id, f.status[id] ?? "unknown"])) as Record<SkillId, Status>;
  return (
    <figure className="relative">
      <KnowledgeMap
        status={status}
        traced={f.traced}
        active={f.traced.at(-1) ?? null}
        repair={f.repair}
        pulse={f.pulse}
        focus={f.focus}
        label="Illustration: a missed quadratics question traced back through the skill tree to multiplying negatives, then repaired"
        className="map-fit"
      />
      <figcaption className="mt-2 min-h-12 text-center text-base font-semibold text-muted" aria-live="off">
        {f.caption}
      </figcaption>
    </figure>
  );
}
