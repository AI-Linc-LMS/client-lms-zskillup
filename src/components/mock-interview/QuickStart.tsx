'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { aiInterviewStatus, createInterview } from '@/lib/api/mock-interviews';
import type { InterviewDifficulty, InterviewTypeValue } from '@/shared/dto/mock-interview.dto';
import { describeError } from '@/lib/api/errors';
import { Loader2, MessagesSquare, Mic, Play, Plus, Sparkles, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';

// Defined locally (not imported as a runtime value from the shared DTO, whose
// class-transformer decorators need reflect-metadata that the frontend doesn't load).
const INTERVIEW_DURATIONS = [5, 7, 10, 15, 20];
const RECOMMENDED_DURATION = 7;

const PRESET_TOPICS = [
  'JavaScript', 'React', 'TypeScript', 'Node.js', 'Python', 'SQL',
  'System Design', 'Data Structures & Algorithms', 'Database Design',
  'Cloud & DevOps', 'Behavioral', 'Product Management',
];
const ROLE_PRESETS = [
  'Software Engineer', 'Frontend Developer', 'Backend Developer', 'Full Stack Developer',
  'Data Analyst', 'Data Scientist', 'DevOps Engineer', 'QA / SDET',
  'Business Analyst', 'Product Manager',
];
const DIFFICULTIES: { value: InterviewDifficulty; hint: string }[] = [
  { value: 'Easy', hint: 'Supportive, surface-level' },
  { value: 'Medium', hint: 'Practical depth' },
  { value: 'Hard', hint: 'Deep probes & trade-offs' },
];
const TYPES: { value: InterviewTypeValue; label: string; hint: string; icon: typeof MessagesSquare }[] = [
  { value: 'mixed', label: 'Mixed', hint: 'Behavioral + technical', icon: MessagesSquare },
  { value: 'technical', label: 'Technical', hint: 'Concepts & problem-solving', icon: Wrench },
  { value: 'behavioral', label: 'Behavioral', hint: 'Experience & communication', icon: Sparkles },
];

function estimateQuestions(duration: number): number {
  return Math.max(4, Math.min(12, Math.round(duration * 0.8)));
}

export function QuickStart() {
  const router = useRouter();
  const [focus, setFocus] = useState<'topic' | 'role'>('topic');
  const [topic, setTopic] = useState('React');
  const [role, setRole] = useState('Software Engineer');
  const [customTopic, setCustomTopic] = useState('');
  const [difficulty, setDifficulty] = useState<InterviewDifficulty>('Medium');
  const [interviewType, setInterviewType] = useState<InterviewTypeValue>('mixed');
  const [duration, setDuration] = useState(7);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiOk, setAiOk] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    aiInterviewStatus().then((ok) => alive && setAiOk(ok));
    return () => {
      alive = false;
    };
  }, []);

  const isCustom = topic === '__custom';
  const effectiveTopic = focus === 'role' ? role : isCustom ? customTopic.trim() : topic;
  const estQuestions = useMemo(() => estimateQuestions(duration), [duration]);

  const start = async () => {
    if (!effectiveTopic) {
      setError('Please choose or enter a topic.');
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const created = await createInterview({ topic: effectiveTopic, difficulty, interviewType, durationMinutes: duration });
      router.push(`/mock-interview/${created.id}/take`);
    } catch (err) {
      setError(describeError(err, 'Could not create the interview. Please retry.'));
      setCreating(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    >
      {aiOk === false && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          <Sparkles className="mt-0.5 size-4 shrink-0" />
          AI isn&apos;t configured on this environment yet - interviews use a solid built-in question set and a
          length-based score. Adaptive questions + rubric feedback switch on once the AI key is set.
        </div>
      )}

      {/* Topic or job role */}
      <div data-tour="mi:focus">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <label className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            {focus === 'role' ? 'Interview for a role' : 'Practice a topic'}
          </label>
          <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-0.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setFocus('topic')}
              className={cn('rounded-full px-3 py-1 transition-colors', focus === 'topic' ? 'bg-white text-navy shadow-sm' : 'text-slate-500')}
            >
              By topic
            </button>
            <button
              type="button"
              onClick={() => setFocus('role')}
              className={cn('rounded-full px-3 py-1 transition-colors', focus === 'role' ? 'bg-white text-navy shadow-sm' : 'text-slate-500')}
            >
              By job role
            </button>
          </div>
        </div>

        {focus === 'topic' ? (
          <>
            <div className="flex flex-wrap gap-2">
              {PRESET_TOPICS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTopic(t)}
                  className={cn(
                    'rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all',
                    topic === t ? 'border-orange bg-orange/10 text-orange shadow-sm' : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50',
                  )}
                >
                  {t}
                </button>
              ))}
              <button
                onClick={() => setTopic('__custom')}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all',
                  isCustom ? 'border-orange bg-orange/10 text-orange shadow-sm' : 'border-dashed border-slate-300 text-slate-500 hover:bg-slate-50',
                )}
              >
                <Plus className="size-3.5" /> Custom
              </button>
            </div>
            {isCustom && (
              <motion.input
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                autoFocus
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                placeholder="e.g. Kubernetes, Machine Learning, Sales"
                className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm shadow-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
              />
            )}
          </>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {ROLE_PRESETS.map((r) => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className={cn(
                    'rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all',
                    role === r ? 'border-orange bg-orange/10 text-orange shadow-sm' : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50',
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
            <p className="mt-2.5 text-xs text-slate-400">
              A <span className="font-semibold text-navy">{role}</span> interview - questions span what that role is hired for.
            </p>
          </>
        )}
      </div>

      {/* Style */}
      <div data-tour="mi:style">
        <label className="mb-2.5 block text-xs font-semibold uppercase tracking-widest text-slate-400">Interview style</label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {TYPES.map((t) => {
            const active = interviewType === t.value;
            const Icon = t.icon;
            return (
              <button
                key={t.value}
                onClick={() => setInterviewType(t.value)}
                className={cn(
                  'flex items-start gap-3 rounded-xl border p-3 text-left transition-all sm:flex-col sm:gap-1.5',
                  active ? 'border-orange bg-orange/5 ring-1 ring-orange/30' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50',
                )}
              >
                <Icon className={cn('size-4 shrink-0', active ? 'text-orange' : 'text-slate-400')} />
                <div>
                  <p className={cn('text-sm font-semibold', active ? 'text-orange' : 'text-navy')}>{t.label}</p>
                  <p className="text-[11px] text-slate-400">{t.hint}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Difficulty */}
      <div>
        <label className="mb-2.5 block text-xs font-semibold uppercase tracking-widest text-slate-400">Difficulty</label>
        <div className="grid grid-cols-3 gap-2">
          {DIFFICULTIES.map((d) => {
            const active = difficulty === d.value;
            return (
              <button
                key={d.value}
                onClick={() => setDifficulty(d.value)}
                className={cn(
                  'rounded-xl border p-3 text-center transition-all',
                  active ? 'border-navy bg-navy text-white shadow-sm' : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50',
                )}
              >
                <p className="text-sm font-bold">{d.value}</p>
                <p className={cn('mt-0.5 text-[11px]', active ? 'text-white/70' : 'text-slate-400')}>{d.hint}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Length */}
      <div>
        <label className="mb-2.5 block text-xs font-semibold uppercase tracking-widest text-slate-400">Length</label>
        <div className="flex flex-wrap gap-2">
          {INTERVIEW_DURATIONS.map((m) => (
            <button
              key={m}
              onClick={() => setDuration(m)}
              className={cn(
                'relative rounded-lg border px-4 py-2 text-sm font-semibold transition-all',
                duration === m ? 'border-orange bg-orange/10 text-orange shadow-sm' : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50',
              )}
            >
              {m} min
              {m === RECOMMENDED_DURATION && (
                <span className="absolute -right-1.5 -top-2 rounded-full bg-orange px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-[#171717] shadow-sm">Best</span>
              )}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-400">The AI paces itself to wrap up naturally within this window - you won&apos;t be cut off mid-answer.</p>
      </div>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {/* Summary + CTA */}
      <div data-tour="mi:start" className="flex flex-col gap-4 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500">
          <span className="font-semibold text-navy">{effectiveTopic || 'Your topic'}</span> · {interviewType} · {difficulty} ·{' '}
          <span className="whitespace-nowrap">~{estQuestions} questions</span>
        </p>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1 text-xs text-slate-400"><Mic className="size-3.5" /> Spoken interview · mic recommended</span>
          <button
            onClick={start}
            disabled={creating}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange to-[#f5872f] px-6 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:shadow disabled:opacity-50"
          >
            {creating ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />} Start interview
          </button>
        </div>
      </div>
    </motion.div>
  );
}
