# Patch

**Find the gap. Patch it. Prove it.**

A classroom quiz that traces each student's mistakes back to the earlier skill that's really in the way (the **Root Gap**), turns fixing it into a short mission, and proves the fix on the original topic with a Boss Fight.

**FIGHT → FIND → FIX → PROVE → MASTER**

- **Live URL:** _not deployed yet. The production deploy needs the owner's go-ahead (see "Status and blockers")._
- **Demo route:** `/demo` (fully in-browser; no account, no backend)
- **Teacher view:** inside the demo, after the Boss Fight ("See the teacher view"), with a **Present mode** button. No code needed; it's a simulated class.

## Run it

```bash
npm install
npm run dev            # http://localhost:3000
npm test               # engine + content unit tests (Vitest)
npm run test:e2e       # Playwright e2e against a local production build (uses installed Chrome)
PLAYWRIGHT_BASE_URL=https://<live-url> npm run test:e2e   # same suite against the live site
```

## How it works

| Module | What it does |
|---|---|
| `lib/content` | The 19-skill algebra graph, micro-lessons, 100 questions with a misconception tag on every wrong option, and the canonical skill names. Graph validated (no cycles, no missing prerequisites, coverage). |
| `lib/engine` | Pure TypeScript, deterministic, no AI. Direct evidence (two-question rule), `inferred_known` with provenance, contradiction handling, adaptive probe selection, root-gap verification, mastery updates (k = 0.15 / 0.07 / 0.20, ±0.2 per-session cap), improvement scoring (floor −0.5, hints −0.1), repair path. |
| `lib/demo` | Scripted demo student (section 10.3), 11 simulated classmates run through the same engine, class aggregates, and the UI state machine (`flow.ts`). |
| `components/` | Knowledge Map (SVG), demo stages, teacher view. |

**Scripted student result** (asserted in tests): 8 quiz answers, then 12 probes:
`S17✗ S13✗ S16✓ S10✗ S9✗ S8✗ S8✗ S11✓ S3✗ S3✗ S2✓ S2✓`. Root gap **S3, Multiplying and dividing integers (including negatives)**. S2 is directly known and S4 is inferred from S2. Repair path **S3 → S8 → S9 → S10 → S13 → S17**, ending in ROOT GAP DEFEATED and TRANSFER VERIFIED. Intermediate skills stay amber ("rising") until they have their own direct evidence; a Boss Fight pass never paints them green.

One deliberate engine rule beyond the spec's minimum: before a root gap is confirmed, any of its direct prerequisites that are only *inferred* get tested directly (`reason: "verify"`). This gives section 10.3's "S2: 2 correct, Sure" evidence instead of inferring S2 from S16.

## Verification (local production build, Chrome, 3 Oct 2026)

| Check | Result |
|---|---|
| Unit tests (`npm test`) | **138 passed**: content maths verified in code for every question (each correct answer computed, each distractor proven wrong), engine rules, Maya = 56 / Leo = 11, floor, cap, scripted profile, disputes, uncertainty, class aggregates, UI state machine |
| Offline loop | **Pass.** `/demo` loaded until **Start demo** was enabled, network set offline, then quiz → report → trace → reveal → mission → Boss Fight → victory → map → teacher → Present mode → reset. **0 requests** after readiness. |
| axe (WCAG 2.0/2.1 A + AA) | **0 violations of any severity** on landing, join, intro, quiz, Fight Report, trace, reveal (evidence panel open), mission, Boss Fight, victory, Knowledge Map, teacher, Present mode. Report: `artifacts/axe-report.json` |
| Keyboard only | **Pass.** Answer via radio group + Enter, focus moves to Continue, map nodes operable with Enter, Present mode is a native modal (focus trapped, Escape closes) |
| 375px overflow | **Pass.** No horizontal page scroll on landing, join, and after every step of the demo, map view and teacher view |
| Reduced motion | **Pass.** Demo completes; decorative motion hidden; reward beats shown immediately |
| CLS | **0.000** on landing and on the full demo flow at 375×812 and 1440×900 (`artifacts/cls.json`). Method: `PerformanceObserver` for `layout-shift`, buffered from page load, excluding shifts with `hadRecentInput` (the standard CLS definition). |
| Screenshots | `artifacts/screenshots/`: `mobile-375-*`, `laptop-1440-*` (landing, join, intro, quiz, fight-report, trace-start, trace-mid, reveal, mission, boss, victory, knowledge-map, teacher) and `wide-1920-present-mode*.png` |

These need re-running against the live URL once it's deployed (command above).

## Scope

**CORE: done.** Bundled demo quiz, Sure/Guess, misconception feedback (longer explanation on confident mistakes, "This keeps coming up"), visible unscored timer, Fight Report with expected-vs-actual table, TRACE MY GAP, animated adaptive trace (with a mobile camera that follows the beam), two-question verification, reveal with "Why Patch thinks this" (direct vs inferred), "That doesn't sound right" (re-tests with unseen questions), Root Gap Mission (recap, micro-lesson with sign grid, practice, bridge checks), Boss Fight with confirmation variant and retry / "Ask your teacher", ROOT GAP DEFEATED → path repairs → TRANSFER VERIFIED, Knowledge Map with legend and evidence inspector, simulated teacher view (heatmap on the tree, Root Gap Distribution, class-wide misconception, repair progress, class status, recommended action with refresher preview), Present mode, Demo Fast Mode, Reset demo, landing page, join screen.

**MVP: deferred.** Live Mode (Supabase classes, join codes, server-side marking, live teacher dashboard, polling), Solo, hints, Comeback Challenges, momentum bars. The join screen validates input and then says plainly that live classes aren't switched on, sending nothing.

**STRETCH: not built.** Recognition boards, ghost opponents, duels, stretch-tier questions, simulated retention / fast-forward, student drill-down, feedback screen, delete-my-data UI, map zoom/pan, five-stage landing storytelling. Real persisted student data stays disabled until the deletion safeguard exists.

## Status and blockers

- **Vercel deploy:** blocked pending the owner's explicit approval of a production deploy. Everything is built and verified locally.
- **Supabase:** no credentials; Live Mode (MVP) is not built. This never blocks the demo.

## Content needing human review

All 100 questions, 19 micro-lessons, ~110 misconception messages and the prerequisite links in `lib/content/` were written for this build. The arithmetic is machine-verified, but wording, difficulty and the graph edges (especially S12, S19 and the S7 → S9 / S7 → S14 links) should be reviewed by a maths teacher before use with real classes. The simulated classmates' wrong-answer choices are scripted and are not real data.

## Design workflow record

Design decisions and their rationale are in `docs/DESIGN.md` (tokens, type, motion, contrast). Skills used, by stage:

- **A, direction:** `/ui-ux-pro-max` (auto pick contradicted the spec and was rejected; targeted searches used), `/frontend-design`, `/design:design-system`
- **B, build:** `/vercel:nextjs` (no `next/link` prefetch inside the demo), `/vercel:react-best-practices` (no dynamic imports, to keep the demo offline-safe), `/vercel:shadcn` (not adopted, as it would replace the visual system)
- **D, data viz:** `/dataviz`; the status palette was validated with its script: CVD ΔE 9.9, contrast pass
- **E, copy:** `/design:ux-copy`; feedback lines, terminology and the timer copy were revised
- **F, critique:** `/design:design-critique` on screenshots of the running app; fixed trace scroll-to-map on mobile, Present-mode fit, heat halos, confidence buttons, report label
- **G, accessibility:** `/design:accessibility-review` plus axe; fixed the Present-mode focus trap and map tap targets
- **H, consistency:** token audit; removed hardcoded colours, shared `buttonClass`, and moved SVG colour variables into `style` for Safari

Not installed, so not run: `/design-skills`, `/ux-ui-audit`, `/design-drift` and the Axe plugin (axe-core via Playwright was used instead).
