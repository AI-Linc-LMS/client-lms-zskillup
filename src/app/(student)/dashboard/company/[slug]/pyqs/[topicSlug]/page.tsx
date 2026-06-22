'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, ExternalLink, History, Lightbulb, Loader2 } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { getCompanyPyqs, type ApiCompanyPyq } from '@/lib/api/catalog';
import { cn } from '@/lib/utils';

const titleCase = (s: string) =>
  s.replace(/^section-\d+-[a-z-]+--/, '').replace(/[-_]/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());

export default function CompanyTopicPyqsPage({
  params,
}: {
  params: Promise<{ slug: string; topicSlug: string }>;
}) {
  const { slug, topicSlug } = use(params);
  const [pyqs, setPyqs] = useState<ApiCompanyPyq[] | null>(null);

  useEffect(() => {
    getCompanyPyqs(slug, topicSlug).then(setPyqs).catch(() => setPyqs([]));
  }, [slug, topicSlug]);

  const companyName = titleCase(slug);
  const topicName = pyqs?.[0]?.topicName ?? titleCase(topicSlug);

  return (
    <div className="mx-auto max-w-4xl">
      <Breadcrumb
        items={[
          { label: 'Companies', href: '/dashboard/company' },
          { label: companyName, href: `/dashboard/company/${slug}` },
          { label: 'PYQs' },
        ]}
      />

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-orange">
            <History className="size-3.5" /> Previous-year questions
          </p>
          <h1 className="mt-1 text-xl font-black tracking-tight text-navy sm:text-2xl">
            {topicName} <span className="text-slate-400">· {companyName}</span>
          </h1>
        </div>
        <Link href={`/dashboard/company/${slug}`} className="inline-flex shrink-0 items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-orange">
          <ArrowLeft className="size-4" /> Hub
        </Link>
      </div>

      {pyqs === null ? (
        <div className="grid h-64 place-items-center"><Loader2 className="size-6 animate-spin text-slate-400" /></div>
      ) : pyqs.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          No previous-year questions tagged for {companyName} in this topic yet.
        </div>
      ) : (
        <>
          <p className="mt-4 text-sm text-slate-500">{pyqs.length} previous-year question{pyqs.length === 1 ? '' : 's'} asked by {companyName}.</p>
          <div className="mt-4 space-y-4">
            {pyqs.map((q, i) => (
              <PyqCard key={q.id} q={q} index={i + 1} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function PyqCard({ q, index }: { q: ApiCompanyPyq; index: number }) {
  const [showSol, setShowSol] = useState(false);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold leading-relaxed text-navy">
          <span className="mr-1.5 text-slate-400">Q{index}.</span>
          {q.stem}
        </p>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {q.yearTags?.length ? (
            <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-700">PYQ · {q.yearTags.join(', ')}</span>
          ) : null}
          <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{q.difficulty}</span>
        </div>
      </div>

      <div className="mt-3 space-y-1.5">
        {q.options.map((o, i) => (
          <div
            key={i}
            className={cn(
              'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm',
              o.isCorrect ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-600',
            )}
          >
            <span className={cn('grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-bold', o.isCorrect ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500')}>
              {o.isCorrect ? <CheckCircle2 className="size-3.5" /> : String.fromCharCode(65 + i)}
            </span>
            {o.text}
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        {q.solution ? (
          <button type="button" onClick={() => setShowSol((v) => !v)} className="inline-flex items-center gap-1 text-xs font-bold text-orange hover:underline">
            <Lightbulb className="size-3.5" /> {showSol ? 'Hide' : 'Show'} solution
          </button>
        ) : null}
        {q.sourceRef && /^https?:\/\//.test(q.sourceRef) ? (
          <a href={q.sourceRef} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 break-all text-[11px] font-medium text-sky-700 hover:underline">
            source <ExternalLink className="size-3 shrink-0" />
          </a>
        ) : null}
      </div>
      {showSol && q.solution ? (
        <p className="mt-2 rounded-lg bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">{q.solution}</p>
      ) : null}
    </div>
  );
}
