import type { Metadata } from "next";
import Link from "next/link";
import { TeacherHome } from "@/components/live/TeacherHome";
import { Wordmark } from "@/components/ui";
import { APP_NAME } from "@/lib/config";

export const metadata: Metadata = { title: "Start a class" };

export default function TeachPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-7xl items-center px-4 py-5 sm:px-6">
        <Link href="/" className="rounded-md" aria-label={`${APP_NAME} home`}>
          <Wordmark>{APP_NAME}</Wordmark>
        </Link>
      </header>
      <TeacherHome />
    </div>
  );
}
