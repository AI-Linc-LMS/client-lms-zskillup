'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Check, Code2, Loader2, Sparkles, Swords, Trophy, X, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getChallenge,
  listChallenges,
  submitChallenge,
  type ApiChallenge,
  type ApiChallengeDetail,
} from '@/lib/api/challenges';
import type { GamificationSummary } from '@/lib/api/gamification-types';
import { RewardOverlay } from '@/components/gamification/RewardOverlay';
import { notifyXpUpdated } from '@/lib/xp-events';

const DIFF_TONE: Record<string, string> = {
  EASY: 'bg-emerald-50 text-emerald-700',
  MEDIUM: 'bg-amber-50 text-amber-700',
  HARD: 'bg-red-50 text-red-700',
};

export function Challenges() {
  const [list, setList] = useState<ApiChallenge[] | null>(null);
  const [reward, setReward] = useState<GamificationSummary | null>(null);

  const load = () =>
    listChallenges()
      .then(setList)
      .catch(() => setList([]));

  useEffect(() => {
    load();
  }, []);

  if (list && list.length === 0) return null; // nothing authored yet

  return (
    <section className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_18px_50px_-30px_rgba(244,63,94,0.3)]">
      {reward ? <RewardOverlay summary={reward} onClose={() => setReward(null)} passed /> : null}
      <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-rose-500 via-pink-500 to-rose-400" />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-12 size-40 rounded-full bg-rose-300/25 blur-3xl"
      />
      <span className="relative mb-4 inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-rose-600 ring-1 ring-inset ring-rose-100">
        <Swords className="size-3.5" /> Challenges
      </span>

      {!list ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="size-5 animate-spin text-slate-400" />
        </div>
      ) : (
        <div className="relative grid gap-3 sm:grid-cols-2">
          {list.map((c) => (
            <ChallengeCard
              key={c.id}
              c={c}
              onCompleted={(summary) => {
                setReward(summary);
                load();
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function ChallengeCard({
  c,
  onCompleted,
}: {
  c: ApiChallenge;
  onCompleted: (s: GamificationSummary | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const coding = c.type === 'CODING';
  // CODING challenges complete by solving the linked problem in the workspace.
  const codingLink = coding && !c.completed && c.codingProblemSlug;

  const cardClass = cn(
    'group relative block overflow-hidden rounded-xl border p-4 text-left transition-all',
    c.completed
      ? 'border-emerald-200 bg-emerald-50/50'
      : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-rose-300 hover:shadow-md',
  );

  const inner = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span
          className={cn(
            'flex size-9 items-center justify-center rounded-lg text-white',
            c.completed
              ? 'bg-gradient-to-br from-emerald-400 to-emerald-600'
              : coding
                ? 'bg-gradient-to-br from-violet-500 to-indigo-600'
                : 'bg-gradient-to-br from-rose-400 to-rose-600',
          )}
        >
          {c.completed ? (
            <Check className="size-4" />
          ) : coding ? (
            <Code2 className="size-4" />
          ) : (
            <Sparkles className="size-4" />
          )}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-600">
          <Zap className="size-3 fill-amber-400 text-amber-500" /> {c.xpReward}
        </span>
      </div>
      <p className="mt-2.5 text-sm font-bold text-navy">{c.title}</p>
      {c.description ? (
        <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{c.description}</p>
      ) : null}
      <div className="mt-2 flex items-center gap-1.5">
        {c.difficulty ? (
          <span
            className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', DIFF_TONE[c.difficulty])}
          >
            {c.difficulty}
          </span>
        ) : null}
        {codingLink ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600">
            Solve problem <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
          </span>
        ) : null}
        {coding && !c.completed && !c.codingProblemSlug ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
            <Code2 className="size-2.5" /> Coding
          </span>
        ) : null}
        {c.completed ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600">
            <Trophy className="size-3" /> Completed
          </span>
        ) : null}
      </div>
    </>
  );

  // CODING (with a linked problem) → deep-link to the workspace; it auto-completes
  // on an accepted submission. MCQ/OTHER → open the in-place solve modal.
  if (codingLink) {
    return (
      <Link href={`/coding/${c.codingProblemSlug}`} className={cardClass}>
        {inner}
      </Link>
    );
  }

  return (
    <>
      <button
        type="button"
        disabled={c.completed || coding}
        onClick={() => !coding && setOpen(true)}
        className={cn(cardClass, 'w-full')}
      >
        {inner}
      </button>

      <AnimatePresence>
        {open ? (
          <ChallengeSolveModal
            id={c.id}
            onClose={() => setOpen(false)}
            onCompleted={(s) => {
              setOpen(false);
              onCompleted(s);
            }}
          />
        ) : null}
      </AnimatePresence>
    </>
  );
}

function ChallengeSolveModal({
  id,
  onClose,
  onCompleted,
}: {
  id: string;
  onClose: () => void;
  onCompleted: (s: GamificationSummary | null) => void;
}) {
  const [detail, setDetail] = useState<ApiChallengeDetail | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [wrong, setWrong] = useState(false);

  useEffect(() => {
    getChallenge(id)
      .then(setDetail)
      .catch(() => onClose());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const q = detail?.question;
  const multi = q?.type === 'MULTI_SELECT';

  const toggle = (oid: string) => {
    setWrong(false);
    setSelected((p) => (multi ? (p.includes(oid) ? p.filter((x) => x !== oid) : [...p, oid]) : [oid]));
  };

  const submit = async () => {
    if (selected.length === 0) return;
    setBusy(true);
    try {
      const r = await submitChallenge(id, selected);
      if (r.correct && r.completed) {
        notifyXpUpdated();
        onCompleted(r.gamification);
      } else setWrong(true);
    } catch {
      setWrong(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-[150] grid place-items-center bg-[#0b1220]/70 px-5 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.92, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-rose-500">
            <Swords className="size-3.5" /> {detail?.title ?? 'Challenge'}
          </p>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="size-5" />
          </button>
        </div>

        {!detail ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="size-5 animate-spin text-slate-400" />
          </div>
        ) : !q ? (
          <p className="py-8 text-center text-sm text-slate-400">
            This challenge isn&apos;t answerable here yet.
          </p>
        ) : (
          <>
            <p className="text-[15px] font-semibold leading-relaxed text-navy">{q.stem}</p>
            {multi ? <p className="mt-1 text-xs text-slate-400">Select all that apply.</p> : null}
            <div className="mt-3 space-y-2">
              {q.options.map((opt, i) => {
                const isSel = selected.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => toggle(opt.id)}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-xl border p-2.5 text-left text-sm transition-colors',
                      isSel
                        ? 'border-rose-400 bg-rose-50 text-navy'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300',
                    )}
                  >
                    <span
                      className={cn(
                        'grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold',
                        isSel ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-500',
                      )}
                    >
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="flex-1">{opt.text}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex items-center justify-between">
              {wrong ? (
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-red-600">
                  <X className="size-4" /> Not quite — try again
                </span>
              ) : (
                <span />
              )}
              <button
                onClick={submit}
                disabled={selected.length === 0 || busy}
                className="inline-flex items-center gap-1.5 rounded-full bg-rose-600 px-5 py-2 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : null} Submit
              </button>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}
