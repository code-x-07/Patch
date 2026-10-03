import { Check, CircleDashed, Crosshair, Flame, Ghost, TriangleAlert, X, type LucideIcon } from "lucide-react";
import clsx from "clsx";
import type { Status } from "@/lib/engine/types";

export type StatusMeta = { label: string; icon: LucideIcon; color: string; text: string };

/** One source of truth for how every status looks: colour + icon + text label. */
export const STATUS: Record<Status, StatusMeta> = {
  unknown: { label: "Not tested", icon: CircleDashed, color: "var(--color-untested)", text: "text-untested" },
  known: { label: "Solid", icon: Check, color: "var(--color-solid)", text: "text-solid" },
  inferred_known: { label: "Solid", icon: Check, color: "var(--color-solid)", text: "text-solid" },
  suspect: { label: "Suspected", icon: TriangleAlert, color: "var(--color-suspect)", text: "text-suspect" },
  gap: { label: "Gap", icon: X, color: "var(--color-gap)", text: "text-gap" },
  root_gap: { label: "Root gap", icon: Crosshair, color: "var(--color-root)", text: "text-root" },
  repairing: { label: "Repairing", icon: Flame, color: "var(--color-repair)", text: "text-repair" },
  retention_due: { label: "Check due", icon: Ghost, color: "var(--color-beam)", text: "text-beam" },
};

export function StatusChip({ status, className, label }: { status: Status; className?: string; label?: string }) {
  const meta = STATUS[status];
  const Icon = meta.icon;
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-chip border px-2 py-0.5 text-sm font-semibold whitespace-nowrap",
        meta.text,
        className,
      )}
      style={{ borderColor: `color-mix(in oklab, ${meta.color} 45%, transparent)`, background: `color-mix(in oklab, ${meta.color} 12%, transparent)` }}
    >
      <Icon aria-hidden className="size-3.5 shrink-0" strokeWidth={2.5} />
      {label ?? meta.label}
    </span>
  );
}

/** The legend order shown on the map. Check due appears only with STRETCH retention. */
export const LEGEND: Status[] = ["known", "suspect", "gap", "root_gap", "repairing", "unknown"];

export function Legend({ className }: { className?: string }) {
  return (
    <ul className={clsx("flex flex-wrap gap-2", className)} aria-label="Status legend">
      {LEGEND.map((s) => (
        <li key={s}>
          <StatusChip status={s} />
        </li>
      ))}
    </ul>
  );
}
