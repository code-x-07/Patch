import type { Metadata } from "next";
import Link from "next/link";
import { TeacherLive } from "@/components/live/TeacherLive";
import { Wordmark } from "@/components/ui";
import { APP_NAME } from "@/lib/config";

export const metadata: Metadata = { title: "Class dashboard" };

export default async function ClassDashboardPage({ params }: PageProps<"/teach/[id]">) {
  const { id } = await params;
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-5 sm:px-6">
        <Link href="/" className="rounded-md" aria-label={`${APP_NAME} home`}>
          <Wordmark>{APP_NAME}</Wordmark>
        </Link>
        <Link href="/teach" className="min-h-11 rounded-card px-3 py-2.5 text-base font-semibold text-muted hover:bg-ink-800 hover:text-text">
          All classes
        </Link>
      </header>
      <main className="flex-1">
        <TeacherLive classId={id} />
      </main>
    </div>
  );
}
