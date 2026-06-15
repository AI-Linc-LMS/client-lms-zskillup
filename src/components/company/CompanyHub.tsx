'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  ClipboardList,
  FileText,
  LayoutGrid,
  ListChecks,
  MessageSquare,
  Trophy,
} from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { HUB_TABS, type HubContent, type HubTab } from '@/lib/hub-data';
import { LockedRow } from './LockedRow';

const TAB_ICONS: Record<HubTab, typeof BookOpen> = {
  Overview: LayoutGrid,
  Syllabus: ClipboardList,
  Material: BookOpen,
  'Practice Quiz': ListChecks,
  'Full Mock Assessment': Trophy,
  'Formula Sheet': FileText,
  'Interview Experience': MessageSquare,
};

/**
 * Company hub — the ONE 7-tab template (COMPANY_HUB_SPEC). All 9 hubs are
 * content instances of this. Client component because the tabs are interactive;
 * content is seeded and passed in from the server page. No left sidebar inside
 * the hub (spec §1) — top tabs only.
 */
export function CompanyHub({ content }: { content: HubContent }) {
  const [tab, setTab] = useState<HubTab>('Overview');
  const c = content.company;

  const onUnlock = () =>
    // Production opens <PurchasePromptDrawer/> with an API-computed price. Demo stub.
    window.alert('This unlocks with ZSkillup Plus. Pricing is computed server-side at checkout.');

  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Companies', href: '/dashboard/company' },
          { label: c.name },
        ]}
      />

      {/* Hub header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-lg bg-navy/10 text-sm font-bold text-navy">
            {c.name.slice(0, 2).toUpperCase()}
          </span>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              Company Hub
            </p>
            <h1 className="text-2xl font-bold text-navy">{c.name}</h1>
          </div>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" className="gap-2">
            <Link href={`/practice?company=${c.slug}`}>
              <BookOpen className="size-4" aria-hidden="true" /> Practice topics
            </Link>
          </Button>
          <Button asChild variant="secondary" className="gap-2">
            <Link href="/mock-tests">
              <Trophy className="size-4" aria-hidden="true" /> Timed assessment
            </Link>
          </Button>
        </div>
      </div>

      {/* Tabs (7, canonical) */}
      <div
        className="mt-6 flex gap-1 overflow-x-auto border-b border-slate-200"
        role="tablist"
        aria-label="Company hub"
      >
        {HUB_TABS.map((t) => {
          const Icon = TAB_ICONS[t];
          const active = tab === t;
          return (
            <button
              key={t}
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t)}
              className={cn(
                'flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'border-orange font-semibold text-navy'
                  : 'border-transparent text-slate-400 hover:text-slate-600',
              )}
            >
              <Icon className={cn('size-4', active ? 'text-navy' : 'text-slate-400')} aria-hidden="true" />
              {t}
            </button>
          );
        })}
      </div>

      {/* Content + quick-stats rail */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_18rem]">
        <div className="min-w-0">
          {tab === 'Overview' && <OverviewTab content={content} />}
          {tab === 'Syllabus' && <SyllabusTab content={content} />}
          {tab === 'Material' && <MaterialTab content={content} onUnlock={onUnlock} />}
          {tab === 'Practice Quiz' && <QuizTab content={content} onUnlock={onUnlock} />}
          {tab === 'Full Mock Assessment' && <MockTab content={content} onUnlock={onUnlock} />}
          {tab === 'Formula Sheet' && <FormulaTab content={content} onUnlock={onUnlock} />}
          {tab === 'Interview Experience' && <InterviewTab content={content} />}
        </div>

        <aside className="space-y-4">
          <div className="rounded-xl bg-navy p-4 text-white shadow-sm">
            <p className="text-sm font-semibold">Drive walkthrough</p>
            <p className="mt-1 text-xs text-white/70">Company-specific overview for this hub.</p>
            <button
              type="button"
              disabled
              title="Walkthrough videos arrive with the company-content release"
              className="mt-3 w-full rounded-full bg-white px-3 py-2 text-sm font-semibold text-navy shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60"
            >
              Watch overview
            </button>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              Quick stats
            </p>
            <Stat label="Total rounds" value={String(content.quickStats.rounds)} />
            <Stat label="Type of exam" value={content.quickStats.examType} />
            <Stat label="Negative marking" value={content.quickStats.negativeMarking} />
            <Stat label="Applicants (est.)" value={content.quickStats.applicants} />
            <Stat label="Company readiness" value={content.quickStats.readiness} accent />
            <Stat label="Open roles (est.)" value={content.quickStats.openRoles} />
          </div>
        </aside>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-2 text-sm last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className={cn('font-semibold', accent ? 'text-emerald-600' : 'text-navy')}>{value}</span>
    </div>
  );
}

function OverviewTab({ content }: { content: HubContent }) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-navy">{content.company.name} hiring process 2026</h2>
        <p className="mt-2 text-sm text-slate-500">{content.overview.summary}</p>
        <div className="mt-4 space-y-3">
          {content.overview.process.map((p, i) => (
            <div key={p.stage} className="flex gap-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-orange/10 text-xs font-bold text-orange">
                {i + 1}
              </span>
              <div>
                <p className="text-sm font-semibold text-navy">{p.stage}</p>
                <p className="text-xs text-slate-500">{p.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-3 font-bold text-navy">Topic grid</h3>
        <div className="space-y-4">
          {content.overview.topicGrid.map((g) => (
            <div key={g.group} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                {g.group}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {g.topics.map((t) => (
                  <span key={t} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-navy">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SyllabusTab({ content }: { content: HubContent }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold text-navy">{content.company.name} syllabus 2026</h2>
      <p className="mt-1 text-sm text-slate-500">
        The drive is usually structured in {content.quickStats.rounds} online stages before interviews.
      </p>
      <table className="mt-4 w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            <th className="py-2">Round</th>
            <th className="py-2">Basic information</th>
            <th className="py-2">Type</th>
          </tr>
        </thead>
        <tbody>
          {content.syllabus.map((r) => (
            <tr key={r.round} className="border-b border-slate-100 last:border-0">
              <td className="py-3 font-medium text-navy">{r.round}</td>
              <td className="py-3 text-slate-500">{r.info}</td>
              <td className={cn('py-3', r.type === 'Final' ? 'text-emerald-600' : 'text-slate-500')}>
                {r.type}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MaterialTab({ content, onUnlock }: { content: HubContent; onUnlock: () => void }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500">
        Concept + question-solving videos. The first topic is free; the rest unlock with Plus.
      </p>
      {content.material.map((m) => (
        <LockedRow key={m.topic} locked={m.locked} onUnlockClick={onUnlock}>
          <div>
            <p className="font-medium text-navy">{m.topic}</p>
            <p className="text-xs text-slate-500">{m.videos} videos</p>
          </div>
          {!m.locked ? <span className="text-xs font-semibold text-emerald-600">Free</span> : null}
        </LockedRow>
      ))}
    </div>
  );
}

function QuizTab({ content, onUnlock }: { content: HubContent; onUnlock: () => void }) {
  // The free quiz drops into the real, server-graded practice flow filtered to
  // this company's question bank. Locked sets stay on the upsell path.
  const practiceHref = `/practice?company=${content.company.slug}`;
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500">
        Low-pressure practice — no timer, instant solutions. First quiz free.
      </p>
      {content.quizzes.map((q) => (
        <LockedRow
          key={q.title}
          locked={q.locked}
          href={q.locked ? undefined : practiceHref}
          onUnlockClick={onUnlock}
        >
          <div>
            <p className="font-medium text-navy">{q.title}</p>
            <p className="text-xs text-slate-500">{q.questions} questions · instant solutions</p>
          </div>
          {!q.locked ? <span className="text-xs font-semibold text-emerald-600">Free</span> : null}
        </LockedRow>
      ))}
    </div>
  );
}

function MockTab({ content, onUnlock }: { content: HubContent; onUnlock: () => void }) {
  // The free mock launches the real timed mock engine (catalog → start → graded
  // report). Locked mocks stay on the upsell path.
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500">
        5 full mocks + 1 live contest. 1 mock is free; analytics unlock after upgrade.
      </p>
      {content.mocks.map((m) => (
        <LockedRow
          key={m.title}
          locked={m.locked}
          href={m.locked ? undefined : '/mock-tests'}
          onUnlockClick={onUnlock}
        >
          <div>
            <p className="font-medium text-navy">
              {m.title}
              {m.kind === 'contest' ? (
                <span className="ml-2 rounded-full bg-orange/10 px-2 py-0.5 text-[10px] font-semibold text-orange">
                  LIVE
                </span>
              ) : null}
            </p>
            <p className="text-xs text-slate-500">
              {m.questions} questions · {m.minutes} min · timed
            </p>
          </div>
          {!m.locked ? <span className="text-xs font-semibold text-emerald-600">Free</span> : null}
        </LockedRow>
      ))}
    </div>
  );
}

function FormulaTab({ content, onUnlock }: { content: HubContent; onUnlock: () => void }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500">Quick-revision cheat sheets. Partial free, full sheet with Plus.</p>
      {content.formulaSheets.map((f) => (
        <LockedRow key={f.topic} locked={f.locked} onUnlockClick={onUnlock}>
          <div>
            <p className="font-medium text-navy">{f.topic}</p>
            <p className="text-xs text-slate-500">Formula & shortcut sheet</p>
          </div>
          {!f.locked ? <span className="text-xs font-semibold text-emerald-600">Free</span> : null}
        </LockedRow>
      ))}
    </div>
  );
}

function InterviewTab({ content }: { content: HubContent }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">Real candidate experiences — fully free.</p>
      {content.interviews.map((iv, i) => (
        <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-navy">
              {iv.role} · {iv.year}
            </p>
            <span
              className={cn(
                'rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1',
                iv.verdict === 'Selected'
                  ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                  : 'bg-red-50 text-red-700 ring-red-200',
              )}
            >
              {iv.verdict}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">{iv.rounds} rounds</p>
          <p className="mt-2 text-sm text-slate-700">{iv.excerpt}</p>
        </div>
      ))}
    </div>
  );
}
