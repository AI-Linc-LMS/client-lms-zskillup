import Link from 'next/link';
import { CheckCircle2, Circle, Lock, BookOpen, Building2, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/ui/progress-bar';
import { DEMO_ROADMAP_STEPS, DEMO_ROADMAP_PROGRESS, type RoadmapStatus } from '@/lib/demo-data-extra';

/**
 * Public roadmap (demo data, no auth required).
 * Matches the site spec exactly — progress bar, 6 steps, summit.
 */

const STATUS_CONFIG: Record<RoadmapStatus, { icon: typeof CheckCircle2; label: string; style: string }> = {
  done: { icon: CheckCircle2, label: 'Done', style: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  active: { icon: Circle, label: 'Active', style: 'text-sky-700 bg-sky-50 border-sky-200' },
  locked: { icon: Lock, label: 'Locked', style: 'text-slate-400 bg-slate-50 border-slate-200' },
};

export default function RoadmapPage() {
  const p = DEMO_ROADMAP_PROGRESS;

  return (
    <div className="min-h-screen bg-background">
      {/* Public navbar */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-white px-6">
        <Link href="/" className="flex items-center gap-1 text-xl font-extrabold">
          <span className="text-orange">Z</span>
          <span className="text-foreground">Skillup</span>
        </Link>
        <div className="flex items-center gap-3">
          <Button variant="ghost" asChild>
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild>
            <Link href="/signup">Create account</Link>
          </Button>
        </div>
      </header>

      {/* Hero (Zone C — dark navy) */}
      <section className="relative overflow-hidden bg-navy text-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_100%_0%,rgba(243,112,33,0.18),transparent),radial-gradient(50%_50%_at_0%_100%,rgba(56,189,248,0.12),transparent)]"
        />
        <div className="relative mx-auto max-w-3xl px-6 py-16 text-center sm:py-20">
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-orange">
            Your placement roadmap
          </span>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-[42px]">
            From foundation to first offer.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-white/70">
            Six steps. Each one unlocks when the previous is complete. Earn XP, unlock badges, and
            climb the leaderboard along the way.
          </p>
        </div>
      </section>

      <main className="mx-auto max-w-3xl px-6 py-10">
        {/* Progress summary */}
        <div className="mb-8 rounded-2xl border bg-white p-6 shadow-sm">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="text-center">
              <p className="text-2xl font-extrabold text-navy">{p.pct}%</p>
              <p className="text-xs text-muted-foreground">Roadmap progress</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-extrabold text-navy">
                {p.xpEarned.toLocaleString()}
                <span className="text-sm font-normal text-muted-foreground">
                  /{p.xpTotal.toLocaleString()}
                </span>
              </p>
              <p className="text-xs text-muted-foreground">XP earned</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-extrabold text-navy">
                {p.stepsCompleted}
                <span className="text-sm font-normal text-muted-foreground">/{p.stepsTotal}</span>
              </p>
              <p className="text-xs text-muted-foreground">Steps completed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-extrabold text-navy">Step {p.activeStep}</p>
              <p className="text-xs text-muted-foreground">Active step</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-5">
            <ProgressBar
              value={p.pct}
              className="h-3"
              barClassName="bg-gradient-to-r from-emerald-400 to-emerald-600"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Personalized path · 14-day streak active
            </p>
          </div>

          {/* Quick summary */}
          <div className="mt-4 flex flex-wrap items-center gap-4 border-t pt-4 text-sm">
            <span className="text-muted-foreground">1 done · 1 in progress · 4 locked</span>
            <span className="flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
              Level 12 · 1,400 XP
            </span>
            <Button variant="secondary" size="sm" className="ml-auto" asChild>
              <Link href="/prepare">Continue active step</Link>
            </Button>
          </div>
        </div>

        {/* 6-step cards */}
        <div className="relative space-y-4">
          {/* Connector line */}
          <div className="absolute left-[23px] top-8 h-full w-0.5 bg-border" aria-hidden="true" />

          {DEMO_ROADMAP_STEPS.map((step) => {
            const cfg = STATUS_CONFIG[step.status];
            const Icon = cfg.icon;
            const TypeIcon = step.type === 'topic' ? BookOpen : Building2;
            const isLocked = step.status === 'locked';

            return (
              <div
                key={step.number}
                className={cn(
                  'relative flex gap-4 rounded-xl border bg-white p-5 shadow-sm transition-opacity',
                  isLocked && 'opacity-60',
                )}
              >
                {/* Step indicator */}
                <div className="relative z-10 flex shrink-0 flex-col items-center gap-1">
                  <span
                    className={cn(
                      'grid size-12 place-items-center rounded-full border-2 text-lg font-extrabold',
                      step.status === 'done'
                        ? 'border-emerald-500 bg-emerald-500 text-white'
                        : step.status === 'active'
                        ? 'border-blue-500 bg-blue-500 text-white'
                        : 'border-slate-200 bg-white text-slate-400',
                    )}
                  >
                    {step.status === 'done' ? (
                      <CheckCircle2 className="size-6" />
                    ) : step.status === 'active' ? (
                      step.number
                    ) : (
                      <Lock className="size-4" />
                    )}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold',
                            cfg.style,
                          )}
                        >
                          <Icon className="size-3" />
                          {cfg.label}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                          <TypeIcon className="size-3" />
                          {step.type}
                        </span>
                      </div>
                      <h3 className="mt-1 font-bold text-navy">
                        Step {step.number} — {step.title}
                      </h3>
                    </div>
                    <span className="text-xs text-muted-foreground">{step.meta}</span>
                  </div>

                  <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-orange">Reward: {step.reward}</p>
                    {!isLocked ? (
                      <Button variant="secondary" size="sm" asChild>
                        <Link href={step.href}>
                          {step.status === 'done' ? 'Revisit' : 'Continue'}
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summit block */}
        <div className="mt-6 rounded-2xl bg-gradient-to-r from-navy to-indigo-900 p-6 text-center text-white">
          <div className="mx-auto mb-3 grid size-14 place-items-center rounded-full bg-white/10">
            <Trophy className="size-7 text-amber-400" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-white/60">
            Summit — Placement-ready
          </p>
          <p className="mt-2 text-white/80 text-sm max-w-md mx-auto">
            Reach the summit to unlock a 100% placement-probability score, a verified certificate,
            and recruiter introductions.
          </p>
        </div>
      </main>

      <footer className="mt-16 border-t px-6 py-8 text-center text-xs text-muted-foreground">
        © 2026 ZSkillup · Future-ready graduates, future-strong institutions
      </footer>
    </div>
  );
}
