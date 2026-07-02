import type { ResumeData, Skill } from '../types';
import { dateRange, fullName } from '../types';

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

export { dateRange, fullName };
