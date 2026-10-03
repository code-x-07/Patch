import type { Metadata } from "next";
import { DemoApp } from "@/components/demo/DemoApp";

export const metadata: Metadata = {
  title: "Demo",
  description: "Play one quiz, trace your root gap, repair it and prove it. Runs entirely in your browser.",
};

export default function DemoPage() {
  return <DemoApp />;
}
