'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { aiInterviewStatus, createInterview } from '@/lib/api/mock-interviews';
import type { InterviewDifficulty, InterviewTypeValue } from '@/shared/dto/mock-interview.dto';
import { describeError } from '@/lib/api/errors';
import { Loader2, Mic, Play, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

// Defined locally (not imported as a runtime value from the shared DTO, whose
// class-transformer decorators need reflect-metadata that the frontend doesn't load).
const INTERVIEW_DURATIONS = [5, 7, 10, 15, 20];

const PRESET_TOPICS = [
  'JavaScript', 'React', 'TypeScript', 'Node.js', 'Python', 'SQL',
  'System Design', 'Data Structures & Algorithms', 'Database Design',
  'Cloud & DevOps', 'Behavioral', 'Product Management',
];
const DIFFICULTIES: InterviewDifficulty[] = ['Easy', 'Medium', 'Hard'];
const TYPES: { value: InterviewTypeValue; label: string }[] = [
  { value: 'mixed', label: 'Mixed' },
  { value: 'technical', label: 'Technical' },
  { value: 'behavioral', label: 'Behavioral' },
];

export function QuickStart() {
  const router = useRouter();
  const [topic, setTopic] = useState('React');
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

  const effectiveTopic = topic === '__custom' ? customTopic.trim() : topic;

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
    <div className="max-w-2xl space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      {aiOk === false && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          <Sparkles className="mt-0.5 size-4 shrink-0" />
          AI is not configured on this environment yet — interviews will use a solid built-in question
          set and a length-based score. Full adaptive questions + rubric feedback turn on once the AI key is set.
        </div>
      )}

      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-400">Topic / Role</label>
        <select value={topic} onChange={(e) => setTopic(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange">
          {PRESET_TOPICS.map((t) => (<option key={t} value={t}>{t}</option>))}
          <option value="__custom">Custom…</option>
        </select>
        {topic === '__custom' && (
          <input value={customTopic} onChange={(e) => setCustomTopic(e.target.value)} placeholder="e.g. Kubernetes, Machine Learning, Sales" className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm shadow-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange" />
        )}
      </div>

      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-400">Interview style</label>
        <div className="flex gap-2">
          {TYPES.map((t) => (
            <button key={t.value} onClick={() => setInterviewType(t.value)} className={cn('flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors', interviewType === t.value ? 'border-orange bg-orange/5 text-orange' : 'border-slate-200 text-slate-600 hover:bg-slate-50')}>{t.label}</button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-400">Difficulty</label>
        <div className="flex gap-2">
          {DIFFICULTIES.map((d) => (
            <button key={d} onClick={() => setDifficulty(d)} className={cn('flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors', difficulty === d ? 'border-navy bg-navy text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-50')}>{d}</button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-400">Length</label>
        <div className="flex flex-wrap gap-2">
          {INTERVIEW_DURATIONS.map((m) => (
            <button key={m} onClick={() => setDuration(m)} className={cn('rounded-lg border px-4 py-2 text-sm font-semibold transition-colors', duration === m ? 'border-orange bg-orange/5 text-orange' : 'border-slate-200 text-slate-600 hover:bg-slate-50')}>{m} min</button>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-400">The AI paces itself to wrap up naturally within this window — you won&apos;t be cut off mid-answer.</p>
      </div>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="flex items-center gap-3">
        <button onClick={start} disabled={creating} className="inline-flex items-center gap-2 rounded-lg bg-orange px-5 py-2.5 text-sm font-bold text-white hover:bg-orange/90 disabled:opacity-50">
          {creating ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />} Start interview
        </button>
        <span className="inline-flex items-center gap-1 text-xs text-slate-400"><Mic className="size-3.5" /> Type or speak your answers</span>
      </div>
    </div>
  );
}
