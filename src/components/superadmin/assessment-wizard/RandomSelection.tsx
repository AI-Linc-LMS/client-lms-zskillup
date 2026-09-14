'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Loader2, RefreshCw, Shuffle, Sparkles, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/ui/progress-bar';
import {
  generateOne,
  sampleQuestions,
  type AssessmentItemType,
  type CodingTopic,
  type SampleDifficulty,
} from '@/lib/api/assessment-builder';
import type { ApiCompany } from '@/lib/api/catalog';
import { parseSelectionError } from '@/lib/api/question-selection-errors';
import {
  DIFFICULTY_LABEL,
  LIMITS,
  nextKey,
  normId,
  skippedNote,
  type PickedItem,
  type RandomDraw,
  type SectionUpdater,
  type WizardSection,
} from './selection';
import { indentedLabel, type TopicOption } from './topic-tree';
import { ChipSwitch, ErrorAlert, NoticeBox, fieldLabelCls, inputCls } from './ui';

const ALL_CODING = '__all__';
const DIFFICULTIES: Array<{ value: SampleDifficulty; label: string }> = [
  { value: 'MIXED', label: 'Mixed' },
  { value: 'EASY', label: 'Easy' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HARD', label: 'Hard' },
];

/**
 * RANDOM selection for one section and one item type: pick a scope (section/topic subtree,
 * or a coding topic / the whole coding bank), a difficulty, an optional company and a
 * count; the server samples that many eligible bank items (never ones already selected),
 * and they join the section as fixed, reviewable picks. AI generation is offered only as
 * an explicit secondary action when the bank could not fill the request.
 */
export function RandomSelection({
  section,
  type,
  topicOptions,
  codingTopics,
  companies,
  driveCompanySlug,
  takenIds,
  update,
  trackWork,
}: {
  section: WizardSection;
  type: AssessmentItemType;
  topicOptions: TopicOption[];
  codingTopics: CodingTopic[];
  companies: ApiCompany[];
  /** The drive's company (pre-selected), or '' for none. */
  driveCompanySlug: string;
  /** Every id of this type already in the assessment (all sections + existing items). */
  takenIds: () => Set<string>;
  /** The wizard's guarded updater: anything already selected is left out and counted. */
  update: SectionUpdater;
  /** Holds the wizard's Review / Publish while a request is in flight. */
  trackWork: (work: () => Promise<void>) => Promise<void>;
}) {
  const uid = useId();
  const [topicId, setTopicId] = useState('');
  const [codingSel, setCodingSel] = useState('');
  const [difficulty, setDifficulty] = useState<SampleDifficulty>('MIXED');
  const [companySlug, setCompanySlug] = useState(driveCompanySlug);
  const [count, setCount] = useState(type === 'MCQ' ? 10 : 2);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [gen, setGen] = useState<{ drawId: string; done: number; total: number } | null>(null);
  const stopGen = useRef(false);

  // Leaving the panel (tab switch, wizard closed) stops an AI run between items.
  useEffect(
    () => () => {
      stopGen.current = true;
    },
    [],
  );

  const companyName = useMemo(() => new Map(companies.map((c) => [c.slug, c.name])), [companies]);
  const draws = section.draws.filter((d) => d.type === type);
  const inSectionOfType = section.items.filter((i) => i.type === type).length;
  const perSectionLimit = type === 'MCQ' ? LIMITS.mcqPerSection : LIMITS.codingPerSection;
  const room = perSectionLimit - inSectionOfType;
  const unit = type === 'MCQ' ? 'questions' : 'coding problems';

  /** Ids to keep out of a sample: everything of this type already selected, minus the
   *  RANDOM items of a draw that is being re-drawn (they are about to be replaced). */
  const excludeIds = (exceptDraw?: RandomDraw): string[] => {
    const replaced = new Set(
      exceptDraw ? section.items.filter((i) => i.drawId === exceptDraw.id && i.origin === 'RANDOM').map((i) => i.id) : [],
    );
    return [...takenIds()].filter((id) => !replaced.has(id)).slice(0, LIMITS.excludeIds);
  };

  // Nothing is filtered here: `update` drops (and counts) anything already selected, against
  // the selection as it is when the response lands — not when the button was clicked.
  const toItems = (drawId: string, items: Array<{ id: string; label: string; difficulty: string }>): PickedItem[] =>
    items.map((i) => ({ id: normId(i.id), type, label: i.label, difficulty: i.difficulty, origin: 'RANDOM' as const, drawId }));

  const draw = () =>
    trackWork(async () => {
      setErr(null);
      setNotice(null);
      if (type === 'CODING' && !codingSel) {
        setErr('Pick a coding topic, or the whole coding bank.');
        return;
      }
      const asked = Math.round(Number(count));
      if (!Number.isFinite(asked) || asked < 1 || asked > LIMITS.sampleCount) {
        setErr(`Draw between 1 and ${LIMITS.sampleCount} ${unit} at a time.`);
        return;
      }
      if (room <= 0) {
        setErr(`This section already has the maximum of ${perSectionLimit} ${unit}. Add another section.`);
        return;
      }
      const want = Math.min(asked, room);
      const topic = topicOptions.find((o) => o.id === topicId);
      const allCoding = type === 'CODING' && codingSel === ALL_CODING;
      const codingTopic = type === 'CODING' && !allCoding ? codingSel : undefined;
      setBusy('draw');
      try {
        const exclude = excludeIds();
        const res = await sampleQuestions({
          type,
          topicId: type === 'MCQ' && topicId ? topicId : undefined,
          codingTopic,
          allCoding: allCoding || undefined,
          difficulty,
          companySlug: companySlug || undefined,
          count: want,
          excludeIds: exclude.length ? exclude : undefined,
        });
        const row: RandomDraw = {
          id: nextKey('draw'),
          type,
          scopeLabel:
            type === 'MCQ' ? (topic?.path ?? 'Whole question bank') : allCoding ? 'Whole coding bank' : (codingTopic ?? ''),
          topicId: type === 'MCQ' && topicId ? topicId : undefined,
          topicName: type === 'MCQ' ? topic?.name : codingTopic,
          codingTopic,
          allCoding: allCoding || undefined,
          difficulty,
          companySlug: companySlug || undefined,
          requested: want,
          available: res.available,
          bankShort: res.returned < want,
        };
        const items = toItems(row.id, res.items);
        const canUseAi = aiPossible(row);
        if (items.length === 0 && !canUseAi) {
          setNotice(`No eligible ${unit} match this scope. Try another topic, difficulty or company.`);
          return;
        }
        // Only record the draw if something of it can still join (or AI can top it up).
        const outcome = { recorded: true };
        const { skipped } = update((s, isTaken) => {
          const inSection = new Set(s.items.filter((i) => i.type === type).map((i) => i.id));
          outcome.recorded = canUseAi || items.some((i) => !isTaken(type, i.id) && !inSection.has(i.id));
          return outcome.recorded ? { ...s, draws: [...s.draws, row], items: [...s.items, ...items] } : s;
        });
        if (!outcome.recorded) {
          setNotice(`${skippedNote(items.length)} No other eligible ${unit} match this scope.`);
          return;
        }
        const notes: string[] = [];
        if (res.returned < want) {
          notes.push(
            `The bank has ${res.available} of the ${want} ${unit} you asked for${
              canUseAi ? ' — you can generate the rest with AI below.' : '.'
            }`,
          );
        } else if (asked > want) {
          notes.push(`Drew ${want}: this section can hold ${perSectionLimit} ${unit}.`);
        }
        if (skipped) notes.push(skippedNote(skipped));
        if (notes.length) setNotice(notes.join(' '));
      } catch (e) {
        setErr(parseSelectionError(e, `Could not draw ${unit}.`).message);
      } finally {
        setBusy(null);
      }
    });

  /** Replace a draw's random items with a fresh sample of the same size and scope. */
  const redraw = (d: RandomDraw) =>
    trackWork(async () => {
      setErr(null);
      setNotice(null);
      const aiCount = section.items.filter((i) => i.drawId === d.id && i.origin === 'AI').length;
      const replacing = section.items.filter((i) => i.drawId === d.id && i.origin === 'RANDOM').length;
      // Same size as the draw, but never past the section limit (items may have been added since).
      const want = Math.min(Math.max(1, d.requested - aiCount), room + replacing, LIMITS.sampleCount);
      if (want <= 0) return;
      setBusy(d.id);
      try {
        const exclude = excludeIds(d);
        const res = await sampleQuestions({ ...sampleScope(d), count: want, excludeIds: exclude.length ? exclude : undefined });
        const { skipped } = update((s) => {
          const keep = s.items.filter((i) => !(i.drawId === d.id && i.origin === 'RANDOM'));
          return {
            ...s,
            items: [...keep, ...toItems(d.id, res.items)],
            draws: s.draws.map((x) => (x.id === d.id ? { ...x, available: res.available, bankShort: res.returned < want } : x)),
          };
        });
        const notes: string[] = [];
        if (res.returned < want) notes.push(`The bank has ${res.available} of the ${want} ${unit} for this draw.`);
        if (skipped) notes.push(skippedNote(skipped));
        if (notes.length) setNotice(notes.join(' '));
      } catch (e) {
        setErr(parseSelectionError(e, 'Could not re-draw.').message);
      } finally {
        setBusy(null);
      }
    });

  /** Top a draw back up from the bank (after removals, or a short first draw). */
  const fill = (d: RandomDraw, missing: number) =>
    trackWork(async () => {
      setErr(null);
      setNotice(null);
      const want = Math.min(missing, room, LIMITS.sampleCount);
      if (want <= 0) return;
      setBusy(d.id);
      try {
        const exclude = excludeIds();
        const res = await sampleQuestions({ ...sampleScope(d), count: want, excludeIds: exclude.length ? exclude : undefined });
        const { added, skipped } = update((s) => ({
          ...s,
          items: [...s.items, ...toItems(d.id, res.items)],
          draws: s.draws.map((x) => (x.id === d.id ? { ...x, available: res.available, bankShort: res.returned < want } : x)),
        }));
        const notes: string[] = [];
        if (res.returned < want) {
          notes.push(
            res.returned === 0
              ? `The bank has no more eligible ${unit} for this draw.`
              : `Added ${added}: that is all the bank has left for this draw.`,
          );
        }
        if (skipped) notes.push(skippedNote(skipped));
        if (notes.length) setNotice(notes.join(' '));
      } catch (e) {
        setErr(parseSelectionError(e, 'Could not draw more.').message);
      } finally {
        setBusy(null);
      }
    });

  /** Explicit AI top-up for a draw the bank couldn't fill. Items are badged AI. */
  const generate = (d: RandomDraw, missing: number) =>
    trackWork(async () => {
      setErr(null);
      setNotice(null);
      const total = Math.min(missing, room);
      if (total <= 0) return;
      stopGen.current = false;
      setGen({ drawId: d.id, done: 0, total });
      const avoid = section.items.filter((i) => i.type === type).map((i) => i.label);
      const band = d.difficulty === 'MIXED' ? undefined : d.difficulty;
      let skipped = 0;
      try {
        for (let i = 0; i < total; i += 1) {
          if (stopGen.current) break;
          const g = await generateOne({
            topicId: d.topicId ?? '',
            topicName: d.topicName ?? '',
            type,
            difficulty: band,
            avoid: avoid.slice(-60),
          });
          avoid.push(g.label);
          const item: PickedItem = {
            id: normId(g.id),
            type,
            label: g.label,
            // The generator defaults an unspecified band to MEDIUM.
            difficulty: band ?? 'MEDIUM',
            origin: 'AI',
            drawId: d.id,
          };
          skipped += update((s) => ({ ...s, items: [...s.items, item] })).skipped;
          setGen((x) => (x ? { ...x, done: x.done + 1 } : x));
        }
        if (skipped) setNotice(skippedNote(skipped));
      } catch (e) {
        setErr(parseSelectionError(e, 'AI generation failed. The questions generated so far were kept.').message);
      } finally {
        setGen(null);
      }
    });

  const removeDraw = (d: RandomDraw) =>
    update((s) => ({
      ...s,
      draws: s.draws.filter((x) => x.id !== d.id),
      items: s.items.filter((i) => i.drawId !== d.id),
    }));

  const working = busy !== null || gen !== null;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {type === 'MCQ' ? (
          <div className="sm:col-span-2">
            <label htmlFor={`${uid}-topic`} className={fieldLabelCls}>
              Section / topic
            </label>
            <select id={`${uid}-topic`} value={topicId} onChange={(e) => setTopicId(e.target.value)} className={`mt-1 ${inputCls}`}>
              <option value="">Whole question bank (every section)</option>
              {topicOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {indentedLabel(o)}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-500">Picking a section or topic includes every subtopic under it.</p>
          </div>
        ) : (
          <div className="sm:col-span-2">
            <label htmlFor={`${uid}-coding`} className={fieldLabelCls}>
              Coding topic
            </label>
            <select id={`${uid}-coding`} value={codingSel} onChange={(e) => setCodingSel(e.target.value)} className={`mt-1 ${inputCls}`}>
              <option value="">Select a coding topic…</option>
              <option value={ALL_CODING}>Whole coding bank (every topic)</option>
              {codingTopics.map((t) => (
                <option key={t.topic} value={t.topic}>
                  {t.topic}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="sm:col-span-2">
          <span className={fieldLabelCls} aria-hidden>
            Difficulty
          </span>
          <div className="mt-1.5">
            <ChipSwitch label="Difficulty" value={difficulty} options={DIFFICULTIES} onChange={setDifficulty} />
          </div>
        </div>

        <div>
          <label htmlFor={`${uid}-company`} className={fieldLabelCls}>
            Company
          </label>
          <select id={`${uid}-company`} value={companySlug} onChange={(e) => setCompanySlug(e.target.value)} className={`mt-1 ${inputCls}`}>
            <option value="">All companies</option>
            {companies.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
                {c.slug === driveCompanySlug ? ' (this drive)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor={`${uid}-count`} className={fieldLabelCls}>
            How many
          </label>
          <input
            id={`${uid}-count`}
            type="number"
            min={1}
            max={LIMITS.sampleCount}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className={`mt-1 ${inputCls}`}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="secondary" onClick={draw} disabled={working}>
          {busy === 'draw' ? <Loader2 className="animate-spin" aria-hidden /> : <Shuffle aria-hidden />}
          {Number.isFinite(count) && count > 0 ? `Draw ${Math.min(Math.round(count), LIMITS.sampleCount)} at random` : 'Draw at random'}
        </Button>
        <span className="text-xs text-slate-500">Never repeats anything already in this assessment.</span>
      </div>

      {err ? <ErrorAlert>{err}</ErrorAlert> : null}
      {notice ? <NoticeBox>{notice}</NoticeBox> : null}

      {draws.length ? (
        <ul className="space-y-2" aria-label="Random draws in this section">
          {draws.map((d) => {
            const inSection = section.items.filter((i) => i.drawId === d.id).length;
            const missing = Math.max(0, d.requested - inSection);
            const canAi = d.bankShort && missing > 0 && aiPossible(d);
            const running = gen?.drawId === d.id;
            return (
              <li key={d.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-navy">{d.scopeLabel}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {DIFFICULTY_LABEL[d.difficulty]} · {d.companySlug ? companyName.get(d.companySlug) ?? d.companySlug : 'All companies'}
                    </p>
                  </div>
                  <p className="text-xs font-semibold text-slate-600">
                    {inSection} of {d.requested} in section
                  </p>
                </div>
                {d.bankShort ? (
                  <p className="mt-2 text-xs font-semibold text-amber-700">
                    Bank has {d.available} of {d.requested}
                  </p>
                ) : null}
                {running && gen ? (
                  <div className="mt-3 space-y-1.5" aria-live="polite">
                    <p className="text-xs text-slate-600">
                      Generating with AI… {gen.done} of {gen.total}
                    </p>
                    <ProgressBar value={(gen.done / gen.total) * 100} className="h-1.5" label="AI generation progress" />
                  </div>
                ) : null}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {running ? (
                    <Button type="button" size="sm" variant="outline" onClick={() => (stopGen.current = true)}>
                      Stop generating
                    </Button>
                  ) : (
                    <>
                      <Button type="button" size="sm" variant="outline" disabled={working} onClick={() => redraw(d)}>
                        {busy === d.id ? <Loader2 className="animate-spin" aria-hidden /> : <RefreshCw aria-hidden />} Re-draw
                      </Button>
                      {missing > 0 && !d.bankShort ? (
                        <Button type="button" size="sm" variant="outline" disabled={working} onClick={() => fill(d, missing)}>
                          Draw {missing} more
                        </Button>
                      ) : null}
                      {canAi ? (
                        <Button type="button" size="sm" variant="outline" disabled={working} onClick={() => generate(d, missing)}>
                          <Sparkles aria-hidden /> Generate {missing} with AI
                        </Button>
                      ) : null}
                      <Button type="button" size="sm" variant="ghost" disabled={working} onClick={() => removeDraw(d)}>
                        <Trash2 aria-hidden /> Remove draw
                      </Button>
                    </>
                  )}
                </div>
                {d.bankShort && missing > 0 && !aiPossible(d) ? (
                  <p className="mt-2 text-xs text-slate-500">
                    {d.type === 'MCQ'
                      ? 'Pick a specific section or topic to generate the rest with AI.'
                      : 'AI generation needs a single coding topic.'}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

/** AI generation is keyed by a concrete topic: an MCQ topic id, or one coding tag. */
function aiPossible(d: RandomDraw): boolean {
  return d.type === 'MCQ' ? !!d.topicId && !!d.topicName : !!d.codingTopic && !d.allCoding;
}

function sampleScope(d: RandomDraw) {
  return {
    type: d.type,
    topicId: d.type === 'MCQ' ? d.topicId : undefined,
    codingTopic: d.type === 'CODING' ? d.codingTopic : undefined,
    allCoding: d.type === 'CODING' && d.allCoding ? true : undefined,
    difficulty: d.difficulty,
    companySlug: d.companySlug,
  };
}
