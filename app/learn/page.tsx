import type { Metadata } from "next";
import { LearningApp } from "@/components/learning/LearningApp";

export const metadata: Metadata = { title: "Study your notes · Patch", description: "Turn lecture notes into a quiz, Knowledge Map and personalised repair session." };
export default function LearnPage() { return <LearningApp />; }
