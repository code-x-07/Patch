import Link from "next/link";
import { HeroTrace } from "@/components/HeroTrace";
import { buttonClass, Wordmark } from "@/components/ui";
import { APP_NAME, TAGLINE } from "@/lib/config";

const LOOP = [
  { name: "Fight" },
  { name: "Find" },
  { name: "Fix" },
  { name: "Prove" },
  { name: "Master" },
];

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-5 sm:px-6">
        <Wordmark>{APP_NAME}</Wordmark>
        <nav aria-label="Main" className="flex flex-wrap items-center gap-1 sm:gap-2">
          <Link href="/learn" className="min-h-11 rounded-card px-3 py-2.5 text-base font-semibold text-beam hover:bg-ink-800">Study your notes</Link>
          <Link href="/join" className="min-h-11 rounded-card px-3 py-2.5 text-base font-semibold text-muted hover:bg-ink-800 hover:text-text">
            Join a class
          </Link>
          <Link href="/teach" className="min-h-11 rounded-card px-3 py-2.5 text-base font-semibold text-muted hover:bg-ink-800 hover:text-text">
            Teach a class
          </Link>
          <Link href="/demo" className="min-h-11 rounded-card px-3 py-2.5 text-base font-semibold text-beam hover:bg-ink-800">
            Try the demo
          </Link>
        </nav>
      </header>

      <main className="flex-1">
        <section className="mx-auto grid max-w-7xl items-center gap-10 px-4 pt-6 pb-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:pt-10">
          <div>
            <h1 className="font-display text-[2.6rem] leading-[1.02] font-extrabold tracking-tight text-balance sm:text-6xl lg:text-7xl">
              {TAGLINE}
            </h1>
            <p className="mt-6 max-w-xl text-xl text-muted">Trace every mistake back to the skill that causes it.</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/learn" className={buttonClass({ size: "lg" })}>Study your notes</Link>
              <Link href="/demo" className={buttonClass({ variant: "secondary", size: "lg" })}>
                Try the demo
              </Link>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div aria-hidden className="absolute inset-[12%] rounded-full bg-beam/10 blur-3xl" />
            <HeroTrace />
          </div>
        </section>

        <section aria-labelledby="loop-h" className="border-t border-line/60">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
            <h2 id="loop-h" className="max-w-2xl font-display text-3xl font-bold tracking-tight text-balance sm:text-4xl">
              The quiz isn&apos;t the end of learning. It&apos;s where it starts.
            </h2>
            <ol className="mt-8 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 md:grid-cols-5">
              {LOOP.map((s, i) => (
                <li key={s.name} className="relative">
                  <div className="flex items-center gap-3">
                    <span
                      aria-hidden
                      className="grid size-9 shrink-0 place-items-center rounded-full border-2 font-display text-sm font-bold"
                      style={{
                        borderColor: i === 1 ? "var(--color-root)" : i >= 3 ? "var(--color-solid)" : "var(--color-beam)",
                        color: i === 1 ? "var(--color-root)" : i >= 3 ? "var(--color-solid)" : "var(--color-beam)",
                      }}
                    >
                      {i + 1}
                    </span>
                    <h3 className="font-display text-xl font-bold">{s.name}</h3>
                    {i < LOOP.length - 1 && <span aria-hidden className="hidden h-px flex-1 bg-line-strong md:block" />}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </main>

      <footer className="border-t border-line/60">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-sm text-faint sm:flex-row sm:justify-between sm:px-6">
          <p>{APP_NAME}: {TAGLINE}</p>
          <p>Demo content: a 19-skill algebra slice. Classmates in the demo are simulated.</p>
        </div>
      </footer>
    </div>
  );
}
