import Link from "next/link";
import { HeroTrace } from "@/components/HeroTrace";
import { buttonClass, Wordmark } from "@/components/ui";
import { APP_NAME, TAGLINE } from "@/lib/config";

const LOOP = [
  { name: "Fight", text: "The class plays a quiz on today's objective. Before each answer, students tap Sure or Guess." },
  { name: "Find", text: "Mistakes become evidence. Patch traces them back through the skills underneath and confirms the one that's really broken." },
  { name: "Fix", text: "A four-minute Root Gap Mission repairs that skill: one idea, a worked example, practice, bridge checks." },
  { name: "Prove", text: "A Boss Fight returns to the original topic with a question the student has never seen." },
  { name: "Master", text: "The Knowledge Map updates, and the teacher sees the class's shared root cause, not thirty scores." },
];

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-5 sm:px-6">
        <Wordmark>{APP_NAME}</Wordmark>
        <nav aria-label="Main" className="flex items-center gap-1 sm:gap-2">
          <Link href="/join" className="min-h-11 rounded-card px-3 py-2.5 text-base font-semibold text-muted hover:bg-ink-800 hover:text-text">
            Join a class
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
            <p className="mt-6 max-w-xl text-xl leading-relaxed text-muted">
              Most quizzes tell students what they got wrong. Patch finds out why: it traces each mistake back to the earlier
              skill that&apos;s really in the way, turns fixing it into a short mission, and checks the fix on the original
              topic.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/demo" className={buttonClass({ size: "lg" })}>
                Try the demo
              </Link>
              <Link href="/join" className={buttonClass({ variant: "secondary", size: "lg" })}>
                Join a class
              </Link>
            </div>
            <p className="mt-5 text-base text-faint">Three minutes, runs in your browser, no sign-up.</p>
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
            <ol className="mt-10 grid gap-8 md:grid-cols-5 md:gap-6">
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
                  <p className="mt-3 text-base text-muted">{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section aria-labelledby="fair-h" className="border-t border-line/60">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2">
            <div>
              <h2 id="fair-h" className="font-display text-3xl font-bold tracking-tight text-balance">Built so the weakest player has a reason to keep going</h2>
              <p className="mt-4 text-lg text-muted">
                Points measure growth against your own level, not raw speed, and mastery is shown separately so nothing is
                hidden. Everyone works on the same objective. What changes is the support and the repair path.
              </p>
            </div>
            <div>
              <h2 className="font-display text-3xl font-bold tracking-tight text-balance">Explainable, not magic</h2>
              <p className="mt-4 text-lg text-muted">
                Diagnosis is plain rules on a skill graph, with no AI guessing. A gap is only confirmed after two different
                wrong answers, and every root gap comes with the evidence behind it, plus a &quot;That doesn&apos;t sound
                right&quot; button.
              </p>
            </div>
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
