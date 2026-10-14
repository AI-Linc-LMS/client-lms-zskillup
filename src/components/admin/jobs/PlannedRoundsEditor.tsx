'use client';

import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  ROUND_KIND_LABELS,
  RoundKind,
  roundLabel,
  sortRounds,
  validatePlannedRounds,
  type PlannedRound,
} from '@/shared/drive-rounds';

const input =
  'h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy focus:border-orange focus-visible:ring-2 focus-visible:ring-orange/30';
const label = 'text-[10px] font-semibold uppercase tracking-widest text-slate-400';

/** Stable ids without crypto.randomUUID, which is not guaranteed on every admin browser. */
function newId(): string {
  return `r_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * THE ROUNDS A DRIVE PLANS TO RUN (PRD §4 "Drive operations").
 *
 * A plan, not a record. What happens to a given candidate in one of these rounds is a
 * separate append-only history (§10), and the practice assessment generated for it is a
 * third thing (§23) — so this screen stays deliberately small: what the round is called,
 * when it is expected, and where to turn up.
 *
 * Both a tentative and a final date exist on purpose. Campus drives are scheduled months
 * ahead on a date everybody knows will move, and overwriting the guess with the
 * confirmation loses the fact that it moved. The student is always shown the confirmed
 * one when there is one.
 */
export function PlannedRoundsEditor({
  value,
  onChange,
}: {
  value: PlannedRound[];
  onChange: (next: PlannedRound[]) => void;
}) {
  const rounds = sortRounds(value ?? []);
  const problems = validatePlannedRounds(rounds);

  const renumber = (list: PlannedRound[]): PlannedRound[] =>
    list.map((r, i) => ({ ...r, sequence: i + 1 }));

  const patch = (id: string, change: Partial<PlannedRound>) =>
    onChange(rounds.map((r) => (r.id === id ? { ...r, ...change } : r)));

  const move = (id: string, by: -1 | 1) => {
    const i = rounds.findIndex((r) => r.id === id);
    const j = i + by;
    if (i < 0 || j < 0 || j >= rounds.length) return;
    const next = [...rounds];
    [next[i], next[j]] = [next[j]!, next[i]!];
    onChange(renumber(next));
  };

  return (
    <div className="space-y-3">
      {rounds.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
          No rounds planned yet. Add the stages the employer will run.
        </p>
      ) : null}

      {rounds.map((r, i) => (
        <div key={r.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-end gap-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
              {r.sequence}
            </span>

            <div className="w-44">
              <label className={label} htmlFor={`kind-${r.id}`}>
                Round type
              </label>
              <select
                id={`kind-${r.id}`}
                value={r.kind}
                onChange={(e) => patch(r.id, { kind: e.target.value as RoundKind })}
                className={cn(input, 'mt-1.5')}
              >
                {Object.values(RoundKind).map((k) => (
                  <option key={k} value={k}>
                    {ROUND_KIND_LABELS[k]}
                  </option>
                ))}
              </select>
            </div>

            <div className="min-w-[10rem] flex-1">
              <label className={label} htmlFor={`name-${r.id}`}>
                Name {r.kind === RoundKind.OTHER ? '(required)' : '(optional)'}
              </label>
              <input
                id={`name-${r.id}`}
                value={r.name ?? ''}
                placeholder={ROUND_KIND_LABELS[r.kind]}
                onChange={(e) => patch(r.id, { name: e.target.value })}
                className={cn(input, 'mt-1.5')}
              />
            </div>

            <div className="w-40">
              <label className={label} htmlFor={`tent-${r.id}`}>
                Expected date
              </label>
              <input
                id={`tent-${r.id}`}
                type="date"
                value={r.tentativeDate ?? ''}
                onChange={(e) => patch(r.id, { tentativeDate: e.target.value || null })}
                className={cn(input, 'mt-1.5')}
              />
            </div>

            <div className="w-40">
              <label className={label} htmlFor={`final-${r.id}`}>
                Confirmed date
              </label>
              <input
                id={`final-${r.id}`}
                type="date"
                value={r.finalDate ?? ''}
                onChange={(e) => patch(r.id, { finalDate: e.target.value || null })}
                className={cn(input, 'mt-1.5')}
              />
            </div>

            <div className="flex gap-1">
              <Button variant="ghost" size="sm" aria-label={`Move ${roundLabel(r)} earlier`}
                disabled={i === 0} onClick={() => move(r.id, -1)}>
                <ArrowUp className="size-4" />
              </Button>
              <Button variant="ghost" size="sm" aria-label={`Move ${roundLabel(r)} later`}
                disabled={i === rounds.length - 1} onClick={() => move(r.id, 1)}>
                <ArrowDown className="size-4" />
              </Button>
              <Button variant="ghost" size="sm" aria-label={`Remove ${roundLabel(r)}`}
                onClick={() => onChange(renumber(rounds.filter((x) => x.id !== r.id)))}>
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div>
              <label className={label} htmlFor={`venue-${r.id}`}>
                Venue
              </label>
              <input
                id={`venue-${r.id}`}
                value={r.venue ?? ''}
                onChange={(e) => patch(r.id, { venue: e.target.value || null })}
                className={cn(input, 'mt-1.5')}
              />
            </div>
            <div>
              <label className={label} htmlFor={`link-${r.id}`}>
                Meeting link
              </label>
              <input
                id={`link-${r.id}`}
                value={r.meetingLink ?? ''}
                onChange={(e) => patch(r.id, { meetingLink: e.target.value || null })}
                className={cn(input, 'mt-1.5')}
              />
            </div>
            <div>
              <label className={label} htmlFor={`mins-${r.id}`}>
                Duration (minutes)
              </label>
              <input
                id={`mins-${r.id}`}
                type="number"
                min={1}
                value={r.durationMinutes ?? ''}
                onChange={(e) =>
                  patch(r.id, { durationMinutes: e.target.value === '' ? null : Number(e.target.value) })
                }
                className={cn(input, 'mt-1.5')}
              />
            </div>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label className={label} htmlFor={`inst-${r.id}`}>
                Instructions for candidates
              </label>
              <input
                id={`inst-${r.id}`}
                value={r.instructions ?? ''}
                onChange={(e) => patch(r.id, { instructions: e.target.value || null })}
                className={cn(input, 'mt-1.5')}
              />
            </div>
            <div>
              <label className={label} htmlFor={`notes-${r.id}`}>
                Internal notes — never shown to students
              </label>
              <input
                id={`notes-${r.id}`}
                value={r.notes ?? ''}
                onChange={(e) => patch(r.id, { notes: e.target.value || null })}
                className={cn(input, 'mt-1.5')}
              />
            </div>
          </div>
        </div>
      ))}

      <Button
        variant="outline"
        onClick={() =>
          onChange([
            ...rounds,
            { id: newId(), kind: RoundKind.APTITUDE, sequence: rounds.length + 1 },
          ])
        }
      >
        <Plus className="size-4" /> Add a round
      </Button>

      {problems.length > 0 ? (
        <ul
          role="alert"
          className="space-y-1 rounded-md bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200"
        >
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
