'use client';

import { useId } from 'react';
import { Plus, ShieldAlert, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  EligibilityField,
  EligibilityOperator,
  FIELD_LABELS,
  MissingDataPolicy,
  NUMERIC_FIELDS,
  PERCENTAGE_FIELDS,
  SENSITIVE_FIELDS,
  describeRule,
  validateRuleSet,
  type EligibilityRule,
  type EligibilityRuleSet,
} from '@/shared/drive-eligibility';

const input =
  'h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy focus:border-orange focus-visible:ring-2 focus-visible:ring-orange/30';
const label = 'text-[10px] font-semibold uppercase tracking-widest text-slate-400';

/** The fields on offer, grouped the way the PRD groups them so the menu reads like the brief. */
const FIELD_GROUPS: ReadonlyArray<{ title: string; fields: EligibilityField[] }> = [
  {
    title: 'Academics',
    fields: [
      EligibilityField.SCORE_10TH,
      EligibilityField.SCORE_12TH,
      EligibilityField.SCORE_DIPLOMA,
      EligibilityField.SCORE_GRADUATION,
      EligibilityField.SCORE_POSTGRADUATION,
      EligibilityField.ACTIVE_BACKLOGS,
      EligibilityField.TOTAL_BACKLOGS,
      EligibilityField.EDUCATION_GAP_YEARS,
      EligibilityField.GRADUATION_YEAR,
      EligibilityField.DEGREE,
      EligibilityField.BRANCH,
      EligibilityField.COLLEGE,
      EligibilityField.ENROLMENT_STATUS,
    ],
  },
  {
    title: 'Preferences & logistics',
    fields: [
      EligibilityField.WORK_AUTHORISATION,
      EligibilityField.WILLING_TO_RELOCATE,
      EligibilityField.PREFERRED_LOCATION,
      EligibilityField.LANGUAGE,
      EligibilityField.WILLING_NIGHT_SHIFT,
      EligibilityField.WILLING_TO_TRAVEL,
      EligibilityField.NOTICE_PERIOD_DAYS,
    ],
  },
  {
    title: 'Only where lawful and approved',
    fields: [EligibilityField.AGE, EligibilityField.GENDER],
  },
];

/** Which operators make sense for a field — a branch has no "greater than". */
function operatorsFor(field: EligibilityField): EligibilityOperator[] {
  if (NUMERIC_FIELDS.has(field)) {
    return [
      EligibilityOperator.GTE,
      EligibilityOperator.GT,
      EligibilityOperator.LTE,
      EligibilityOperator.LT,
      EligibilityOperator.RANGE,
      EligibilityOperator.EQUALS,
      EligibilityOperator.NOT_APPLICABLE,
    ];
  }
  return [
    EligibilityOperator.IN,
    EligibilityOperator.NOT_IN,
    EligibilityOperator.EQUALS,
    EligibilityOperator.NOT_APPLICABLE,
  ];
}

const OPERATOR_LABELS: Readonly<Record<EligibilityOperator, string>> = {
  [EligibilityOperator.GTE]: 'at least',
  [EligibilityOperator.GT]: 'more than',
  [EligibilityOperator.LTE]: 'at most',
  [EligibilityOperator.LT]: 'less than',
  [EligibilityOperator.RANGE]: 'between',
  [EligibilityOperator.EQUALS]: 'exactly',
  [EligibilityOperator.IN]: 'one of',
  [EligibilityOperator.NOT_IN]: 'not one of',
  [EligibilityOperator.NOT_APPLICABLE]: 'not applicable',
};

const POLICY_COPY: ReadonlyArray<{ key: MissingDataPolicy; title: string; blurb: string }> = [
  {
    key: MissingDataPolicy.REVIEW,
    title: 'Let them through, flag for review',
    blurb: 'They can apply, and you see a “data missing” flag beside them.',
  },
  {
    key: MissingDataPolicy.PASS,
    title: 'Give the benefit of the doubt',
    blurb: 'Treated as meeting the criterion.',
  },
  {
    key: MissingDataPolicy.BLOCK,
    title: 'Cannot apply until it is on file',
    blurb: 'Shown as “data missing”, never as “failed”.',
  },
];

/**
 * HARD ELIGIBILITY, BUILT A RULE AT A TIME (PRD §4 "Eligibility").
 *
 * Employers state criteria as sentences — "60% throughout, no current backlogs, 2027
 * passout, CSE or IT" — and each clause carries its own comparison. So the editor is a
 * list of sentences rather than a form of boxes: pick a field, pick how to compare it,
 * give the value. Each row renders back as the sentence it means, because a cut-off
 * typed into the wrong operator excludes an entire cohort and looks fine doing it.
 *
 * Two things this screen is deliberately opinionated about:
 *
 *   - MISSING DATA IS A POLICY, NOT A SILENT DEFAULT. Most students on the platform have
 *     no 10th or 12th mark on file at all, so "what happens to someone we never asked"
 *     is the single most consequential setting here. It is a visible choice, defaulting
 *     to the forgiving one, because the alternative is mass silent rejection.
 *
 *   - A SENSITIVE CRITERION HAS TO BE ARGUED FOR. Age and gender are offered, because a
 *     few roles lawfully require them, but they sit under their own heading and the row
 *     will not save without a written justification. The PRD's words: "never default
 *     filters".
 */
export function EligibilityRulesEditor({
  value,
  onChange,
}: {
  value: EligibilityRuleSet;
  onChange: (next: EligibilityRuleSet) => void;
}) {
  const addId = useId();
  const rules = value?.rules ?? [];
  const policy = value?.missingDataPolicy ?? MissingDataPolicy.REVIEW;
  const used = new Set(rules.map((r) => r.field));
  const problems = validateRuleSet({ rules, missingDataPolicy: policy });

  const set = (next: Partial<EligibilityRuleSet>) =>
    onChange({ rules, missingDataPolicy: policy, ...next });

  const patch = (index: number, change: Partial<EligibilityRule>) =>
    set({ rules: rules.map((r, i) => (i === index ? { ...r, ...change } : r)) });

  const add = (field: EligibilityField) => {
    if (!field || used.has(field)) return;
    const [first] = operatorsFor(field);
    set({
      rules: [
        ...rules,
        {
          field,
          operator: first,
          ...(NUMERIC_FIELDS.has(field) ? { value: null } : { options: [] }),
        },
      ],
    });
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className={label}>If we have never asked for a value</p>
        <p className="mt-1 text-sm text-slate-600">
          Most students have no 10th or 12th mark on file. This decides what happens to them —
          it is not the same as failing the criterion.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {POLICY_COPY.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => set({ missingDataPolicy: p.key })}
              aria-pressed={policy === p.key}
              className={cn(
                'rounded-xl border p-3 text-left transition-colors',
                policy === p.key
                  ? 'border-orange/40 bg-orange/5 ring-1 ring-orange/20'
                  : 'border-slate-200 bg-white hover:bg-slate-50',
              )}
            >
              <span className="block text-sm font-bold text-navy">{p.title}</span>
              <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">{p.blurb}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {rules.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
            No hard criteria yet — every targeted student is eligible to apply.
          </p>
        ) : null}

        {rules.map((rule, i) => {
          const sensitive = SENSITIVE_FIELDS.has(rule.field);
          const numeric = NUMERIC_FIELDS.has(rule.field);
          const needsOptions =
            rule.operator === EligibilityOperator.IN || rule.operator === EligibilityOperator.NOT_IN;
          const needsValue = !needsOptions && rule.operator !== EligibilityOperator.NOT_APPLICABLE;

          return (
            <div
              key={`${rule.field}-${i}`}
              className={cn(
                'rounded-xl border bg-white p-4 shadow-sm',
                sensitive ? 'border-amber-200' : 'border-slate-200',
              )}
            >
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-[10rem] flex-1">
                  <span className={label}>Criterion</span>
                  <p className="mt-1.5 h-10 truncate rounded-lg bg-slate-50 px-3 text-sm font-semibold leading-10 text-navy">
                    {FIELD_LABELS[rule.field]}
                  </p>
                </div>

                <div className="w-40">
                  <label className={label} htmlFor={`op-${i}`}>
                    Comparison
                  </label>
                  <select
                    id={`op-${i}`}
                    value={rule.operator}
                    onChange={(e) =>
                      patch(i, { operator: e.target.value as EligibilityOperator })
                    }
                    className={cn(input, 'mt-1.5')}
                  >
                    {operatorsFor(rule.field).map((op) => (
                      <option key={op} value={op}>
                        {OPERATOR_LABELS[op]}
                      </option>
                    ))}
                  </select>
                </div>

                {needsValue ? (
                  <div className="w-32">
                    <label className={label} htmlFor={`val-${i}`}>
                      {PERCENTAGE_FIELDS.has(rule.field) ? 'Percent' : 'Value'}
                    </label>
                    <input
                      id={`val-${i}`}
                      type={numeric ? 'number' : 'text'}
                      value={rule.value ?? ''}
                      onChange={(e) =>
                        patch(i, {
                          value: numeric
                            ? e.target.value === ''
                              ? null
                              : Number(e.target.value)
                            : e.target.value,
                        })
                      }
                      className={cn(input, 'mt-1.5')}
                    />
                  </div>
                ) : null}

                {rule.operator === EligibilityOperator.RANGE ? (
                  <div className="w-32">
                    <label className={label} htmlFor={`max-${i}`}>
                      Up to
                    </label>
                    <input
                      id={`max-${i}`}
                      type="number"
                      value={rule.valueMax ?? ''}
                      onChange={(e) =>
                        patch(i, { valueMax: e.target.value === '' ? null : Number(e.target.value) })
                      }
                      className={cn(input, 'mt-1.5')}
                    />
                  </div>
                ) : null}

                {needsOptions ? (
                  <div className="min-w-[12rem] flex-1">
                    <label className={label} htmlFor={`opts-${i}`}>
                      Values (comma separated)
                    </label>
                    <input
                      id={`opts-${i}`}
                      value={(rule.options ?? []).join(', ')}
                      placeholder="CSE, IT, ECE"
                      onChange={(e) =>
                        patch(i, {
                          options: e.target.value
                            .split(',')
                            .map((s) => s.trim())
                            .filter(Boolean),
                        })
                      }
                      className={cn(input, 'mt-1.5')}
                    />
                  </div>
                ) : null}

                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Remove ${FIELD_LABELS[rule.field]}`}
                  onClick={() => set({ rules: rules.filter((_, k) => k !== i) })}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>

              {sensitive ? (
                <div className="mt-3 rounded-lg bg-amber-50 p-3 ring-1 ring-amber-200">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-900">
                    <ShieldAlert className="size-3.5 shrink-0" aria-hidden />
                    This can only be used where it is lawful and necessary for the role.
                  </p>
                  <input
                    value={rule.justification ?? ''}
                    onChange={(e) => patch(i, { justification: e.target.value })}
                    placeholder="Why this role requires it"
                    aria-label={`Justification for ${FIELD_LABELS[rule.field]}`}
                    className={cn(input, 'mt-2 border-amber-200 bg-white')}
                  />
                </div>
              ) : null}

              {/* The rule read back as the sentence it means — a cut-off typed into the
                  wrong comparison excludes a cohort and looks perfectly fine doing it. */}
              <p className="mt-2 text-xs text-slate-500">
                Reads as: <span className="font-medium text-slate-700">{describeRule(rule)}</span>
              </p>
            </div>
          );
        })}
      </div>

      <div>
        <label className={label} htmlFor={addId}>
          Add a criterion
        </label>
        <div className="mt-1.5 flex gap-2">
          <select
            id={addId}
            value=""
            onChange={(e) => add(e.target.value as EligibilityField)}
            className={cn(input, 'max-w-sm')}
          >
            <option value="">Choose a criterion…</option>
            {FIELD_GROUPS.map((g) => (
              <optgroup key={g.title} label={g.title}>
                {g.fields
                  .filter((f) => !used.has(f))
                  .map((f) => (
                    <option key={f} value={f}>
                      {FIELD_LABELS[f]}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
          <span className="flex items-center text-xs text-slate-400">
            <Plus className="mr-1 size-3.5" aria-hidden /> each criterion can be used once
          </span>
        </div>
      </div>

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
