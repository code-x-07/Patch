"use client";

import clsx from "clsx";
import type { CSSProperties } from "react";
import { layout, MAP_W } from "@/lib/content/layout";
import type { SkillId } from "@/lib/content/types";
import { KnowledgeMap, type MapProps } from "./KnowledgeMap";

/**
 * The Knowledge Map as a stage. With `camera`, small screens zoom in and follow
 * that node (so labels stay readable); from 1024px the whole map is shown.
 */
export function MapStage({
  camera,
  zoom = 1.7,
  height = 300,
  className,
  ...map
}: MapProps & { camera?: SkillId | null; zoom?: number; height?: number }) {
  if (!camera) {
    return <KnowledgeMap {...map} className={clsx("mx-auto w-full", className)} />;
  }
  const { x, y } = layout[camera];
  const scale = 100 / MAP_W;
  const style = {
    "--cx": x * scale,
    "--cy": y * scale,
    "--z": zoom,
    "--camera-h": `${height}px`,
  } as CSSProperties;
  return (
    <div className={clsx("camera-stage", className)} style={style}>
      <KnowledgeMap {...map} className="camera-map map-fit" />
    </div>
  );
}
