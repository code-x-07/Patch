# Patch design system

Decisions made with `/ui-ux-pro-max`, `/frontend-design` and `/design:design-system` (Stage A). Later passes should keep these unless the spec changes.

## Direction: "knowledge lights up"

- **Night, not black.** The page is deep ink blue (`ink-950 #060a14`) with a faint static nebula. No neutral #000/#111.
- **One brand light: the trace beam** (`beam #8bcbff`). It's used for the primary action and for the trace travelling through the graph. Nothing else glows blue.
- **Status colours mean evidence only.** Solid `#5be3a6`, Suspected `#ffc14d`, Gap `#ff6b7a`, Root gap `#ff4f7b`, Repairing `#ff9a52`, Not tested `#8592b0`. Every status always has an icon and a text label as well (Check, TriangleAlert, X, Crosshair, Flame, CircleDashed).
- **The Knowledge Map is the screen, not a card.** It's never boxed inside a dashboard panel. Untested and out-of-scope nodes stay dim; nodes illuminate as evidence arrives.
- **Boldness goes in one place:** the trace and the Root Gap reveal. Everything around them is quiet.

The ui-ux-pro-max auto-recommendation (Baloo 2/Comic Neue, light background, "avoid dark mode") contradicted the spec's dark, serious-game direction and was not used.

## Type

- **Bricolage Grotesque** for display moments: hero, Boss Fight, Root Gap reveal, ROOT GAP DEFEATED, TRANSFER VERIFIED.
- **Atkinson Hyperlegible Next** for everything else, especially maths: it was designed to keep 1/l/I, 0/O and the minus sign distinct. Tabular lining numerals.
- Maths is authored as ASCII and rendered with a true minus (−) and superscript ² via `formatMath`.
- All caps only where the spec names a stamp (TRACE MY GAP, ROOT GAP DEFEATED, TRANSFER VERIFIED, BOSS FIGHT). Sentence case elsewhere; no eyebrow labels on every heading.

## Contrast

Every text and status colour is ≥ 4.5:1 against `ink-950`, `ink-800` and `ink-700` (lowest: root gap on `ink-700`, 5.0:1).

## Radius and surfaces

`chip 8px` for status chips, `card 14px` for answer options, `panel 22px` for the few panels. Surfaces step `ink-900 → ink-800 → ink-700`; borders `line` / `line-strong`.

## Motion

Durations: fast 140ms (press), base 220ms (state change), slow 420ms (entrances), hop 560ms (one trace step). Easing: `ease-out` to enter, `ease-in-out` for state changes, `ease-snap` (slight overshoot) for selections only.
CSS and SVG only, with no animation library. `prefers-reduced-motion` turns every animation into an immediate state change and hides decorative motion (`.motion-decor`).

## Components

Hand-built on native elements (no shadcn init, since it would replace these tokens with Geist/zinc): answer options are a native radio group, confidence is a two-option radio group, disclosure panels use `<button aria-expanded>`. Icons are `lucide-react`, statically imported so the offline demo never fetches a chunk.

## Offline demo constraints

`/demo` is one client component. Every stage is statically imported; no `next/dynamic`, no `next/link` inside the flow (prefetches would be network requests). Fonts are self-hosted by `next/font` and preloaded.
