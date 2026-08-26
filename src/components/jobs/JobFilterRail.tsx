'use client';

import { useState } from 'react';
import { ChevronDown, SlidersHorizontal, Tag, X } from 'lucide-react';
import { EmploymentType, JobKind, WorkMode } from '@/shared/enums';
import { EMPLOYMENT_LABEL, JOB_KIND_LABEL, WORK_MODE_LABEL } from '@/lib/jobs/format';
import type { JobFacets } from '@/lib/api/jobs';
import { cn } from '@/lib/utils';

export interface JobFilterState {
  jobKind: JobKind | '';
  employmentType: EmploymentType[];
  workMode: WorkMode[];
  companyName: string;
  passoutYear: string;
  openOnly: boolean;
  skills: string[];
}

export const EMPTY_FILTERS: JobFilterState = {
  jobKind: '',
  employmentType: [],
  workMode: [],
  companyName: '',
  passoutYear: '',
  openOnly: false,
  skills: [],
};

export const activeFilterCount = (f: JobFilterState): number =>
  (f.jobKind ? 1 : 0) +
  f.employmentType.length +
  f.workMode.length +
  (f.companyName ? 1 : 0) +
  (f.passoutYear ? 1 : 0) +
  (f.openOnly ? 1 : 0) +
  f.skills.length;

/** A collapsible group. Open by default - a rail whose sections are all shut is a rail
 *  that looks empty, and the whole point of it is to advertise what can be narrowed. */
function Group({
  title,
  children,
  count,
}: {
  title: string;
  children: React.ReactNode;
  count?: number;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-b border-slate-100 py-4 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          {title}
          {count ? (
            <span className="rounded-full bg-orange/10 px-1.5 text-[10px] font-bold text-orange">
              {count}
            </span>
          ) : null}
        </span>
        <ChevronDown
          className={cn('size-4 text-slate-400 transition-transform', open && 'rotate-180')}
        />
      </button>
      {open ? <div className="mt-3">{children}</div> : null}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-full px-3 py-1 text-xs font-semibold transition-colors',
        active ? 'bg-navy text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
      )}
    >
      {children}
    </button>
  );
}

/**
 * Refine results.
 *
 * Every option here comes from the FACETS - the values present on jobs this caller can
 * actually see - not from the enums. Offering "Remote" when nothing is remote wastes a
 * click and teaches people the filters do not work; and deriving the list from the
 * caller's own jobs means the rail can never hint that a company is hiring through a
 * posting they are not allowed to see.
 */
export function JobFilterRail({
  facets,
  value,
  onChange,
  className,
}: {
  facets: JobFacets | null;
  value: JobFilterState;
  onChange: (next: JobFilterState) => void;
  className?: string;
}) {
  const [skillQuery, setSkillQuery] = useState('');
  const active = activeFilterCount(value);

  const toggle = <T,>(list: T[], item: T): T[] =>
    list.includes(item) ? list.filter((x) => x !== item) : [...list, item];

  const skills = (facets?.skills ?? []).filter((s) =>
    skillQuery.trim() ? s.toLowerCase().includes(skillQuery.trim().toLowerCase()) : true,
  );

  return (
    <aside className={cn('rounded-xl border border-slate-200 bg-white p-5 shadow-sm', className)}>
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-base font-bold text-navy">
          <SlidersHorizontal className="size-4 text-slate-400" /> Refine results
        </p>
        {active > 0 ? (
          <button
            type="button"
            onClick={() => onChange(EMPTY_FILTERS)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 transition-colors hover:text-navy"
          >
            <X className="size-3.5" /> Clear all
          </button>
        ) : null}
      </div>

      <label className="mt-4 flex cursor-pointer items-center justify-between rounded-lg border border-slate-200 px-3 py-2 transition-colors hover:bg-slate-50">
        <span className="text-sm font-semibold text-navy">Open roles only</span>
        <input
          type="checkbox"
          checked={value.openOnly}
          onChange={(e) => onChange({ ...value, openOnly: e.target.checked })}
          aria-label="Show only roles still accepting applications"
          className="size-4 rounded border-slate-300 text-orange focus-visible:ring-2 focus-visible:ring-orange/30"
        />
      </label>

      <Group title="Job type" count={value.jobKind ? 1 : 0}>
        <div className="flex flex-wrap gap-2">
          {(facets?.jobKinds?.length ? facets.jobKinds : Object.values(JobKind)).map((k) => (
            <Chip
              key={k}
              active={value.jobKind === k}
              onClick={() =>
                onChange({ ...value, jobKind: value.jobKind === k ? '' : (k as JobKind) })
              }
            >
              {JOB_KIND_LABEL[k as JobKind] ?? k}
            </Chip>
          ))}
        </div>
      </Group>

      {(facets?.employmentTypes.length ?? 0) > 0 ? (
        <Group title="Employment type" count={value.employmentType.length}>
          <div className="flex flex-wrap gap-2">
            {facets!.employmentTypes.map((t) => (
              <Chip
                key={t}
                active={value.employmentType.includes(t as EmploymentType)}
                onClick={() =>
                  onChange({
                    ...value,
                    employmentType: toggle(value.employmentType, t as EmploymentType),
                  })
                }
              >
                {EMPLOYMENT_LABEL[t as EmploymentType] ?? t}
              </Chip>
            ))}
          </div>
        </Group>
      ) : null}

      {(facets?.workModes.length ?? 0) > 0 ? (
        <Group title="Work mode" count={value.workMode.length}>
          <div className="flex flex-wrap gap-2">
            {facets!.workModes.map((m) => (
              <Chip
                key={m}
                active={value.workMode.includes(m as WorkMode)}
                onClick={() =>
                  onChange({ ...value, workMode: toggle(value.workMode, m as WorkMode) })
                }
              >
                {WORK_MODE_LABEL[m as WorkMode] ?? m}
              </Chip>
            ))}
          </div>
        </Group>
      ) : null}

      {(facets?.companies.length ?? 0) > 1 ? (
        <Group title="Company" count={value.companyName ? 1 : 0}>
          <select
            value={value.companyName}
            onChange={(e) => onChange({ ...value, companyName: e.target.value })}
            aria-label="Company"
            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy focus:border-orange focus-visible:ring-2 focus-visible:ring-orange/30"
          >
            <option value="">All companies</option>
            {facets!.companies.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Group>
      ) : null}

      {(facets?.passoutYears.length ?? 0) > 0 ? (
        <Group title="Passout year" count={value.passoutYear ? 1 : 0}>
          <div className="flex flex-wrap gap-2">
            {facets!.passoutYears.map((y) => (
              <Chip
                key={y}
                active={value.passoutYear === String(y)}
                onClick={() =>
                  onChange({
                    ...value,
                    passoutYear: value.passoutYear === String(y) ? '' : String(y),
                  })
                }
              >
                {y}
              </Chip>
            ))}
          </div>
        </Group>
      ) : null}

      {(facets?.skills.length ?? 0) > 0 ? (
        <Group title="Skills & tags" count={value.skills.length}>
          <div className="relative">
            <Tag className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={skillQuery}
              onChange={(e) => setSkillQuery(e.target.value)}
              placeholder="Search skills…"
              aria-label="Search skills"
              className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-xs text-navy focus:border-orange focus-visible:ring-2 focus-visible:ring-orange/30"
            />
          </div>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {skills.slice(0, 24).map((s) => (
              <Chip
                key={s}
                active={value.skills.includes(s)}
                onClick={() => onChange({ ...value, skills: toggle(value.skills, s) })}
              >
                {s}
              </Chip>
            ))}
            {skills.length === 0 ? (
              <p className="text-xs text-slate-400">Nothing matches that.</p>
            ) : null}
          </div>
        </Group>
      ) : null}
    </aside>
  );
}
