'use client';

import { useId } from 'react';
import { ChevronDown, Code2, ListChecks, Plus, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { AssessmentItemType, CodingTopic } from '@/lib/api/assessment-builder';
import type { ApiCompany } from '@/lib/api/catalog';
import { ManualSelection } from './ManualSelection';
import { RandomSelection } from './RandomSelection';
import { LIMITS, type WizardSection } from './selection';
import type { TopicOption } from './topic-tree';
import { ChipSwitch, DifficultyPill, OriginBadge, UnderlineTabs, fieldLabelCls, inputCls } from './ui';

export type SelectionMode = 'RANDOM' | 'MANUAL';

/**
 * One section of the assessment: name, marks per item type, the picked items, and the
 * "Add questions" panel (Random selection | Manual selection × MCQ | Coding).
 */
export function SectionEditor({
  section,
  sections,
  manualAllowed,
  panelOpen,
  onTogglePanel,
  mode,
  onMode,
  itemType,
  onItemType,
  topicOptions,
  codingTopics,
  companies,
  driveCompanySlug,
  existingItems,
  takenIds,
  update,
  onRemoveSection,
}: {
  section: WizardSection;
  sections: WizardSection[];
  /** Manual browsing uses Admin/Super Admin-only endpoints; hidden for a TPO. */
  manualAllowed: boolean;
  panelOpen: boolean;
  onTogglePanel: () => void;
  mode: SelectionMode;
  onMode: (m: SelectionMode) => void;
  itemType: AssessmentItemType;
  onItemType: (t: AssessmentItemType) => void;
  topicOptions: TopicOption[];
  codingTopics: CodingTopic[];
  companies: ApiCompany[];
  driveCompanySlug: string;
  existingItems: Array<{ id: string; type: AssessmentItemType }>;
  takenIds: (type: AssessmentItemType) => Set<string>;
  update: (fn: (s: WizardSection) => WizardSection) => void;
  onRemoveSection?: () => void;
}) {
  const uid = useId();
  const mcq = section.items.filter((i) => i.type === 'MCQ');
  const coding = section.items.filter((i) => i.type === 'CODING');
  const marks = mcq.length * section.mcqMarks + coding.length * section.codingMarks;
  const effectiveMode: SelectionMode = manualAllowed ? mode : 'RANDOM';
  const tabBase = `${uid}-mode`;

  const removeItem = (id: string) => update((s) => ({ ...s, items: s.items.filter((i) => i.id !== id) }));

  return (
    <section aria-labelledby={`${uid}-name-label`} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <label id={`${uid}-name-label`} htmlFor={`${uid}-name`} className="sr-only">
            Section name
          </label>
          <input
            id={`${uid}-name`}
            value={section.name}
            maxLength={100}
            onChange={(e) => update((s) => ({ ...s, name: e.target.value }))}
            className="h-10 w-full max-w-xs rounded-lg border border-transparent bg-white px-2 text-base font-bold text-navy hover:border-slate-200 focus:border-orange focus:outline-none focus-visible:ring-2 focus-visible:ring-orange/30"
          />
          <p className="px-2 text-xs text-slate-500">
            {mcq.length} MCQ · {coding.length} coding · {marks} marks
          </p>
        </div>
        {onRemoveSection ? (
          <Button type="button" variant="ghost" size="sm" onClick={onRemoveSection} aria-label={`Remove ${section.name}`}>
            <Trash2 aria-hidden /> Remove section
          </Button>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={`${uid}-mcq-marks`} className={fieldLabelCls}>
            Marks per MCQ
          </label>
          <input
            id={`${uid}-mcq-marks`}
            type="number"
            min={1}
            max={LIMITS.marks}
            value={section.mcqMarks}
            onChange={(e) => update((s) => ({ ...s, mcqMarks: Number(e.target.value) }))}
            className={`mt-1 ${inputCls}`}
          />
        </div>
        <div>
          <label htmlFor={`${uid}-coding-marks`} className={fieldLabelCls}>
            Marks per coding problem
          </label>
          <input
            id={`${uid}-coding-marks`}
            type="number"
            min={1}
            max={LIMITS.marks}
            value={section.codingMarks}
            onChange={(e) => update((s) => ({ ...s, codingMarks: Number(e.target.value) }))}
            className={`mt-1 ${inputCls}`}
          />
        </div>
      </div>

      {section.items.length ? (
        <ul className="mt-4 max-h-72 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200" aria-label={`Questions in ${section.name}`}>
          {[...mcq, ...coding].map((it) => (
            <li key={it.id} className="flex items-center gap-2 px-3 py-2">
              {it.type === 'MCQ' ? (
                <ListChecks className="size-4 shrink-0 text-slate-400" aria-hidden />
              ) : (
                <Code2 className="size-4 shrink-0 text-slate-400" aria-hidden />
              )}
              <span className="sr-only">{it.type === 'MCQ' ? 'MCQ:' : 'Coding:'}</span>
              <span className="min-w-0 flex-1 truncate text-sm text-navy" title={it.label}>
                {it.label}
              </span>
              <DifficultyPill value={it.difficulty} />
              <OriginBadge origin={it.origin} />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0"
                onClick={() => removeItem(it.id)}
                aria-label={`Remove: ${it.label.slice(0, 60)}`}
              >
                <X aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 rounded-lg border border-dashed border-slate-200 px-4 py-5 text-center text-sm text-slate-500">
          No questions yet — add some below.
        </p>
      )}

      <div className="mt-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onTogglePanel}
          aria-expanded={panelOpen}
          aria-controls={`${uid}-panel`}
        >
          <Plus aria-hidden /> Add questions
          <ChevronDown className={cn('transition-transform', panelOpen && 'rotate-180')} aria-hidden />
        </Button>
      </div>

      {panelOpen ? (
        <div id={`${uid}-panel`} className="mt-4 space-y-4 border-t border-slate-100 pt-4">
          {manualAllowed ? (
            <UnderlineTabs
              idBase={tabBase}
              label="How to choose questions"
              value={effectiveMode}
              onChange={onMode}
              tabs={[
                { value: 'RANDOM', label: 'Random selection' },
                { value: 'MANUAL', label: 'Manual selection' },
              ]}
            />
          ) : (
            <p className="text-sm font-semibold text-navy">Random selection</p>
          )}
          <ChipSwitch
            label="Question type"
            value={itemType}
            onChange={onItemType}
            options={[
              { value: 'MCQ', label: 'MCQ' },
              { value: 'CODING', label: 'Coding' },
            ]}
          />
          <div
            {...(manualAllowed
              ? { role: 'tabpanel', id: `${tabBase}-panel`, 'aria-labelledby': `${tabBase}-${effectiveMode}` }
              : {})}
          >
            {effectiveMode === 'RANDOM' ? (
              <RandomSelection
                key={`${section.key}-${itemType}`}
                section={section}
                type={itemType}
                topicOptions={topicOptions}
                codingTopics={codingTopics}
                companies={companies}
                driveCompanySlug={driveCompanySlug}
                takenIds={() => takenIds(itemType)}
                update={update}
              />
            ) : (
              <ManualSelection
                key={`${section.key}-${itemType}`}
                section={section}
                sections={sections}
                type={itemType}
                topicOptions={topicOptions}
                codingTopics={codingTopics}
                companies={companies}
                driveCompanySlug={driveCompanySlug}
                existingItems={existingItems}
                update={update}
              />
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
