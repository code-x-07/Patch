"use client";

import { createContext, useContext } from "react";
import { formatMath } from "@/lib/content/math";
import { DEMO_INFO, type CourseInfo } from "@/lib/course";

const Ctx = createContext<CourseInfo>(DEMO_INFO);

/** Which course the screens are drawing. Defaults to the bundled algebra demo. */
export const CourseProvider = Ctx.Provider;
export const useCourse = () => useContext(Ctx);

const asWritten = (t: string) => t;
/** Text formatter: maths typography for the algebra course, text as written otherwise. */
export function useFmt() {
  return useCourse().conceptual ? asWritten : formatMath;
}
