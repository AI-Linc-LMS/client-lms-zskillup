import type { ReactNode } from 'react';
import type {
  Achievement,
  Award,
  Course,
  Extracurricular,
  Language,
  Publication,
  ResumeData,
  Skill,
} from '../types';
import { dateRange, formatMonth, fullName } from '../types';

/** Shared render helpers for resume templates. Plain divs + inline-ish styling so
 *  html-to-image serialises them cleanly for PDF export. */

export function socialList(d: ResumeData): { label: string; value: string }[] {
  const b = d.basicInfo;
  return [
    { label: 'Email', value: b.email },
    { label: 'Phone', value: b.phone },
    { label: 'Location', value: b.location },
    { label: 'GitHub', value: b.github ?? '' },
    { label: 'LinkedIn', value: b.linkedin ?? '' },
    { label: 'Portfolio', value: b.portfolio ?? '' },
    { label: 'LeetCode', value: b.leetcode ?? '' },
    { label: 'HackerRank', value: b.hackerrank ?? '' },
    { label: 'Kaggle', value: b.kaggle ?? '' },
    { label: 'Medium', value: b.medium ?? '' },
  ].filter((x) => x.value);
}

export function groupSkills(skills: Skill[]): Record<string, Skill[]> {
  const out: Record<string, Skill[]> = {};
  for (const s of skills) {
    const key = s.category?.trim() || 'Skills';
    (out[key] ??= []).push(s);
  }
  return out;
}

// ── Shared section renderers for the newer ATS sections ──────────────────────
// Each template supplies its own heading via `head`; these render only the body
// so the 9 new sections stay uniform across all 12 templates (DRY).

/** A timeline entry: role + organization + date range + optional description.
 *  Used by Positions of Responsibility and Volunteering. */
interface TimelineEntry {
  id: string;
  role: string;
  organization: string;
  startDate?: string;
  endDate?: string;
  current?: boolean;
  description?: string;
}

export function TimelineList({ items, accent = '#334155' }: { items: TimelineEntry[]; accent?: string }) {
  return (
    <>
      {items.map((it) => (
        <div key={it.id} className="mb-2.5">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[12.5px] font-bold text-slate-900">{it.role}</p>
            <span className="shrink-0 text-[11px] text-slate-600">{dateRange(it.startDate ?? '', it.endDate ?? '', it.current)}</span>
          </div>
          {it.organization && <p className="text-[12px] font-medium" style={{ color: accent }}>{it.organization}</p>}
          {it.description?.trim() ? <p className="mt-0.5 text-[12px] leading-snug text-slate-700">{it.description}</p> : null}
        </div>
      ))}
    </>
  );
}

/** A flat entry: title + optional right-aligned meta + optional description.
 *  Used by Achievements, Publications, Awards, Courses, Extracurricular. */
export interface SimpleEntry {
  id: string;
  title: string;
  meta?: string;
  description?: string;
}

export function SimpleList({ items }: { items: SimpleEntry[] }) {
  return (
    <>
      {items.map((it) => (
        <div key={it.id} className="mb-1.5">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[12.5px] font-semibold text-slate-900">{it.title}</p>
            {it.meta ? <span className="shrink-0 text-[11px] text-slate-600">{it.meta}</span> : null}
          </div>
          {it.description?.trim() ? <p className="text-[12px] leading-snug text-slate-700">{it.description}</p> : null}
        </div>
      ))}
    </>
  );
}

/** Inline chips for compact lists (Languages / Interests). */
export function ChipList({ items, chipClassName }: { items: string[]; chipClassName: string }) {
  const list = items.filter(Boolean);
  if (list.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {list.map((t, i) => (
        <span key={i} className={chipClassName}>{t}</span>
      ))}
    </div>
  );
}

const withDate = (date?: string): string => (date ? formatMonth(date) : '');
const joinMeta = (...parts: (string | undefined)[]): string | undefined =>
  parts.map((p) => p?.trim()).filter(Boolean).join(' · ') || undefined;

export function achievementItems(items: Achievement[]): SimpleEntry[] {
  return items.map((a) => ({ id: a.id, title: a.title, meta: withDate(a.date) || undefined, description: a.description }));
}
export function publicationItems(items: Publication[]): SimpleEntry[] {
  return items.map((p) => ({ id: p.id, title: p.title, meta: joinMeta(p.venue, withDate(p.date)), description: p.description }));
}
export function awardItems(items: Award[]): SimpleEntry[] {
  return items.map((a) => ({ id: a.id, title: a.title, meta: joinMeta(a.issuer, withDate(a.date)), description: a.description }));
}
export function courseItems(items: Course[]): SimpleEntry[] {
  return items.map((c) => ({ id: c.id, title: c.name, meta: joinMeta(c.provider, withDate(c.date)) }));
}
export function extracurricularItems(items: Extracurricular[]): SimpleEntry[] {
  return items.map((e) => ({ id: e.id, title: e.title, meta: e.organization || undefined, description: e.description }));
}

/** "English (Native)" style labels for the languages chip/inline list. */
export function languageLabels(items: Language[]): string[] {
  return items.map((l) => (l.proficiency?.trim() ? `${l.name} (${l.proficiency})` : l.name)).filter(Boolean);
}

/** True when at least one of the newer ATS sections has content — lets card-based
 *  templates avoid rendering an empty container. */
export function hasExtraSections(d: ResumeData): boolean {
  return (
    d.achievements.length > 0 ||
    d.positionsOfResponsibility.length > 0 ||
    d.publications.length > 0 ||
    d.awards.length > 0 ||
    d.courses.length > 0 ||
    d.volunteering.length > 0 ||
    d.extracurricular.length > 0 ||
    d.languages.length > 0 ||
    d.interests.length > 0
  );
}

/**
 * Renders the new ATS sections that belong in the MAIN column, in canonical
 * order, each guarded by a length check. `head` styles the heading per template;
 * `sectionClass` matches the template's own section spacing. Languages/Interests
 * are appended here only when the template has no sidebar to host them.
 */
export function ExtraSections({
  data,
  head,
  accent = '#334155',
  sectionClass = 'mb-4',
  withLanguagesInterests = true,
}: {
  data: ResumeData;
  head: (title: string) => ReactNode;
  accent?: string;
  sectionClass?: string;
  withLanguagesInterests?: boolean;
}) {
  return (
    <>
      {data.achievements.length > 0 && (
        <section className={sectionClass}>{head('Achievements')}<SimpleList items={achievementItems(data.achievements)} /></section>
      )}
      {data.positionsOfResponsibility.length > 0 && (
        <section className={sectionClass}>{head('Positions of Responsibility')}<TimelineList items={data.positionsOfResponsibility} accent={accent} /></section>
      )}
      {data.publications.length > 0 && (
        <section className={sectionClass}>{head('Publications')}<SimpleList items={publicationItems(data.publications)} /></section>
      )}
      {data.awards.length > 0 && (
        <section className={sectionClass}>{head('Awards')}<SimpleList items={awardItems(data.awards)} /></section>
      )}
      {data.courses.length > 0 && (
        <section className={sectionClass}>{head('Courses')}<SimpleList items={courseItems(data.courses)} /></section>
      )}
      {data.volunteering.length > 0 && (
        <section className={sectionClass}>{head('Volunteering')}<TimelineList items={data.volunteering} accent={accent} /></section>
      )}
      {data.extracurricular.length > 0 && (
        <section className={sectionClass}>{head('Extracurricular')}<SimpleList items={extracurricularItems(data.extracurricular)} /></section>
      )}
      {withLanguagesInterests && data.languages.length > 0 && (
        <section className={sectionClass}>{head('Languages')}<p className="text-[12px] text-slate-700">{languageLabels(data.languages).join(' · ')}</p></section>
      )}
      {withLanguagesInterests && data.interests.length > 0 && (
        <section className={sectionClass}>{head('Interests')}<p className="text-[12px] text-slate-700">{data.interests.map((i) => i.name).filter(Boolean).join(' · ')}</p></section>
      )}
    </>
  );
}

export { dateRange, fullName };
