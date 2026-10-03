import type { Metadata } from "next";
import Link from "next/link";
import { JoinForm } from "@/components/JoinForm";
import { Wordmark } from "@/components/ui";
import { APP_NAME } from "@/lib/config";

export const metadata: Metadata = { title: "Join a class" };

export default function JoinPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-7xl items-center px-4 py-5 sm:px-6">
        <Link href="/" className="rounded-md" aria-label={`${APP_NAME} home`}>
          <Wordmark>{APP_NAME}</Wordmark>
        </Link>
      </header>
      <main className="mx-auto w-full max-w-md flex-1 px-4 pt-6 pb-16">
        <h1 className="font-display text-4xl font-bold tracking-tight">Join your class</h1>
        <p className="mt-3 text-lg text-muted">Type the code on your teacher&apos;s screen and a first name or nickname.</p>
        <JoinForm />
      </main>
    </div>
  );
}
