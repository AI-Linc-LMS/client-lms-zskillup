import type { TipContent } from '@/components/ui/InfoTip';
import type { ApiCompany, ApiTopic } from '@/lib/api/catalog';

/**
 * "What you get" copy for every buyable item on Build Your Own Plan.
 *
 * House rule (see PR #29): student-facing surfaces never lead with raw question
 * inventory — no "480 questions", no PYQ/coding tallies. Say what they GET, and
 * say it qualitatively. Structural **sub-section** counts are fine ("all 12
 * sub-sections"); it's the question tally that's banned.
 *
 * Only the COMPANY tip may promise Mock Interview + Resume Builder: the backend
 * sets `careerToolsEntitled` for Company-hub and Full-Platform plans only, so a
 * Section or Sub-section purchase does NOT bundle them. Don't promise them here.
 */

const trim = (s: string, max = 120) => (s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s);

export function companyTip(c: ApiCompany): TipContent {
  // Prefer the DB-authored tagline; a `description` is a paragraph, so trim it.
  const blurb = c.tagline?.trim() || (c.description?.trim() ? trim(c.description.trim()) : '');
  return {
    title: c.name,
    body: blurb || `Everything ${c.name} tests, in one place.`,
    bullets: [
      `Previous-year questions from real ${c.name} papers`,
      'Every section and sub-section this company asks',
      `${c.name}-pattern mock assessments`,
      'Mock Interview + Resume Builder included',
      'Performance analytics and All-India rankings',
    ],
  };
}

export function sectionTip(name: string, subs: ApiTopic[]): TipContent {
  const shown = subs.slice(0, 3).map((t) => t.name);
  return {
    title: name,
    body: `Unlocks the whole ${name} section, across every company.`,
    bullets: [
      subs.length
        ? `All ${subs.length} sub-sections - ${shown.join(', ')}${subs.length > shown.length ? ' and more' : ''}`
        : 'Every sub-section in this section',
      'Adaptive practice that adjusts to your level',
      'Timed section drills with step-by-step solutions',
      'Progress tracking and performance analytics',
    ],
  };
}

export function subsectionTip(name: string, sectionName: string): TipContent {
  return {
    title: name,
    body: `Focused practice on ${name}, from the ${sectionName} section.`,
    bullets: [
      'Adaptive practice that adjusts to your accuracy',
      'Step-by-step solutions for every question',
      'Progress tracking on this topic',
    ],
  };
}
