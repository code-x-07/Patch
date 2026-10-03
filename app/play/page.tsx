import type { Metadata } from "next";
import { StudentLive } from "@/components/live/StudentLive";

export const metadata: Metadata = { title: "Class Fight" };

export default function PlayPage() {
  return <StudentLive />;
}
