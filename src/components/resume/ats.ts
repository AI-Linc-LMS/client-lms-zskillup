import type { ResumeData } from './types';

/**
 * Client-side ATS (Applicant Tracking System) heuristic scorer. Runs entirely in
 * the browser (no network). Produces an overall 0–100 score, per-dimension
 * breakdown, actionable suggestions, and — when a job description is supplied —
 * matched/missing keyword sets.
 *
 * Two things used to make this wildly over-score incomplete resumes:
 *   1. `keywordMatch` defaulted to 100 when no JD was given, handing every resume
 *      a free full-marks dimension worth ~18% of the total.
 *   2. Every dimension scored on mere PRESENCE, so placeholder junk ("ww",
 *      "highlights", "project / description") earned the same marks as real
 *      content.
 * Now keyword match is simply NOT SCORED without a JD (its weight is redistributed),
 * and entries must contain real content to count — see `isFiller`.
 */

export interface AtsBreakdown {
  format: number; // structure/sections present WITH real content
  completeness: number; // contact + summary
  contentDepth: number; // bullets, skills, projects
  /** vs job description. `null` = no JD supplied → not scored (NOT a free 100). */
  keywordMatch: number | null;
  experience: number; // roles + quantified impact
  education: number; // education + certifications
}

export interface AtsResult {
  overall: number;
  breakdown: AtsBreakdown;
  suggestions: string[];
  matchedKeywords: string[];
  missingKeywords: string[];
}

const STOP = new Set([
  'the', 'and', 'for', 'with', 'you', 'your', 'our', 'are', 'will', 'has', 'have', 'this', 'that',
  'from', 'was', 'were', 'their', 'they', 'them', 'a', 'an', 'to', 'of', 'in', 'on', 'as', 'at',
  'be', 'is', 'it', 'or', 'we', 'us', 'by', 'able', 'who', 'what', 'when', 'where', 'which', 'work',
  'role', 'team', 'job', 'plus', 'etc', 'per', 'via', 'must', 'should', 'looking', 'candidate',
  'experience', 'years', 'year', 'strong', 'good', 'excellent', 'knowledge', 'skills', 'ability',
]);

/** Words that are obviously the field's own placeholder rather than real content. */
const FILLER = new Set([
  'description', 'descriptions', 'highlight', 'highlights', 'project', 'projects',
  'company', 'position', 'title', 'name', 'institution', 'degree', 'school', 'college',
  'summary', 'skill', 'skills', 'role', 'text', 'placeholder', 'sample', 'example',
  'lorem', 'ipsum', 'test', 'testing', 'todo', 'tbd', 'na', 'abc', 'xyz', 'asdf', 'qwerty',
]);

/**
 * True when a value is empty or obvious filler, so it shouldn't earn credit.
 * Catches the real-world junk we saw: "ww", "111 — 111", "highlights",
 * "project" / "description".
 */
export function isFiller(raw: string | null | undefined): boolean {
  const s = (raw ?? '').trim().toLowerCase();
  if (!s) return true;
  if (s.length < 3) return true; // "ww", "aa"
  if (!/[a-z]/.test(s)) return true; // "111", "111 - 111", "---"
  if (/^(.)\1+$/.test(s.replace(/[\s-]/g, ''))) return true; // "wwww", "aaaa"
  const words = s.split(/\s+/).filter(Boolean);
  // A one/two-word value that is just the field's placeholder word.
  if (words.length <= 2 && words.every((w) => FILLER.has(w.replace(/[^a-z]/g, '')))) return true;
  return false;
}

const hasText = (s: string | null | undefined) => !isFiller(s);

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean);

/** Strong action verbs recruiters/ATS look for at the start of a bullet. */
const ACTION_VERBS = new Set([
  'built', 'led', 'designed', 'implemented', 'improved', 'reduced', 'cut', 'launched',
  'developed', 'automated', 'migrated', 'optimized', 'optimised', 'delivered', 'owned',
  'drove', 'created', 'architected', 'scaled', 'shipped', 'managed', 'increased', 'boosted',
  'streamlined', 'refactored', 'engineered', 'spearheaded', 'coordinated', 'analyzed',
  'analysed', 'resolved', 'integrated', 'deployed', 'mentored', 'saved', 'grew', 'achieved',
]);

/**
 * A bullet counts as QUANTIFIED only with a real metric — a percentage, a
 * multiplier, or a number carrying a unit. Previously ANY digit qualified, so a
 * date ("2021") handed the resume a full 40-point impact bonus.
 */
function isQuantified(s: string): boolean {
  const t = s.toLowerCase().replace(/\b(?:19|20)\d{2}\b/g, ' '); // drop bare years
  if (/\d+\s*%/.test(t)) return true; // "cut latency by 40%"
  if (/\b\d+(\.\d+)?\s*x\b/.test(t)) return true; // "3x faster"
  if (/[$₹€£]\s*\d/.test(t)) return true; // "$1.2M"
  // a number followed by a unit / scale word
  if (/\b\d[\d,.]*\s*(k|m|bn|hrs?|hours?|days?|weeks?|months?|ms|seconds?|users?|customers?|clients?|requests?|records?|rows?|tickets?|students?|people)\b/.test(t)) return true;
  return false;
}

const isStrongBullet = (s: string) => hasText(s) && words(s).length >= 6;
const startsWithAction = (s: string) => ACTION_VERBS.has((words(s)[0] ?? '').toLowerCase().replace(/[^a-z]/g, ''));

function resumeText(d: ResumeData): string {
  const parts: string[] = [
    d.basicInfo.professionalTitle,
    d.basicInfo.summary,
    ...d.skills.map((s) => s.name),
    ...d.workExperience.flatMap((w) => [w.position, w.company, ...w.description]),
    ...d.projects.flatMap((p) => [p.name, p.description, ...p.technologies]),
    ...d.education.map((e) => `${e.degree} ${e.institution}`),
    ...d.certifications.map((c) => `${c.name} ${c.issuer}`),
  ];
  return parts.join(' ').toLowerCase();
}

function extractKeywords(jd: string): string[] {
  const words = jd
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOP.has(w));
  const freq = new Map<string, number>();
  for (const w of words) freq.set(w, (freq.get(w) ?? 0) + 1);
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([w]) => w);
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export function computeAtsScore(d: ResumeData, jobDescription = ''): AtsResult {
  const b = d.basicInfo;
  const suggestions: string[] = [];

  // ── Only entries with REAL content count. Placeholder rows used to score full
  // marks, which is what let a skeleton resume reach 71.
  const roles = d.workExperience.filter(
    (w) => hasText(w.position) && hasText(w.company) && w.description.some(hasText),
  );
  const projects = d.projects.filter((p) => hasText(p.name) && hasText(p.description));
  const eduEntries = d.education.filter((e) => hasText(e.degree) && hasText(e.institution));
  const skills = d.skills.filter((s) => hasText(s.name));
  const certs = d.certifications.filter((c) => hasText(c.name));

  const dropped =
    d.workExperience.length - roles.length +
    (d.projects.length - projects.length) +
    (d.education.length - eduEntries.length);
  if (dropped > 0) {
    suggestions.push('Replace placeholder text with real details - empty or filler entries earn no credit.');
  }

  // Bullets only count when they say something — a 1–2 word stub is not an
  // achievement. Full marks require real, quantified, action-led bullets.
  const bullets = roles.flatMap((w) => w.description.filter(hasText));
  const strong = bullets.filter(isStrongBullet);
  const quantified = strong.filter(isQuantified);
  const actionLed = strong.filter(startsWithAction);

  // ── Structure — sections present, with real content. Deliberately hard to max:
  // a bare "has 4 sections" resume lands ~80, not 100.
  let format = 0;
  if (roles.length > 0) format += 35;
  else suggestions.push('Add a work experience entry with a real role, company and bullet points.');
  if (eduEntries.length > 0) format += 20;
  else suggestions.push('Add your education with both a degree and an institution.');
  if (skills.length >= 5) format += 25;
  else if (skills.length >= 3) format += 15;
  else if (skills.length > 0) { format += 8; suggestions.push('List at least 5–8 relevant skills.'); }
  else suggestions.push('Add a skills section.');
  if (projects.length > 0) format += 10;
  if (certs.length > 0) format += 10;
  format = clamp(format);

  // ── Contact & summary.
  let completeness = 0;
  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test((b.email ?? '').trim())) completeness += 25;
  else suggestions.push('Add a valid email address.');
  if ((b.phone ?? '').replace(/\D/g, '').length >= 7) completeness += 20;
  else suggestions.push('Add a phone number.');
  if (hasText(b.location)) completeness += 10;
  if (hasText(b.professionalTitle)) completeness += 15;
  else suggestions.push('Add a professional title.');
  const summaryWords = hasText(b.summary) ? words(b.summary).length : 0;
  if (summaryWords >= 40) completeness += 30;
  else if (summaryWords >= 25) { completeness += 20; suggestions.push('Strengthen your summary - aim for 40+ words with a clear specialism.'); }
  else if (summaryWords >= 12) { completeness += 10; suggestions.push('Expand your summary to 3–4 sentences (40+ words).'); }
  else suggestions.push('Write a professional summary (40+ words).');
  completeness = clamp(completeness);

  // ── Content depth — SUBSTANTIVE bullets carry it; 10 good bullets for full marks.
  let contentDepth = 0;
  contentDepth += Math.min(strong.length, 10) * 7; // up to 70
  contentDepth += Math.min(skills.length, 8) * 2.5; // up to 20
  contentDepth += Math.min(projects.length, 2) * 5; // up to 10
  if (strong.length < 6) {
    suggestions.push(`Add more substantive achievement bullets (aim for 3–5 per role, 6+ words each) - you have ${strong.length}.`);
  }
  contentDepth = clamp(contentDepth);

  // ── Experience — roles + the PROPORTION of bullets that are quantified and
  // action-led. Previously a single digit anywhere (even a year) earned +40.
  let experience = Math.min(roles.length, 3) * 15; // up to 45
  if (strong.length > 0) {
    experience += (quantified.length / strong.length) * 35;
    experience += (actionLed.length / strong.length) * 20;
  }
  if (roles.length > 0 && quantified.length === 0) {
    suggestions.push('Quantify your impact with real metrics (e.g. "cut latency by 40%", "served 10k users") - dates don\'t count.');
  }
  if (strong.length > 0 && actionLed.length / strong.length < 0.5) {
    suggestions.push('Start bullets with strong action verbs (Built, Led, Reduced, Automated…).');
  }
  experience = clamp(experience);

  // ── Education + certifications.
  let education = 0;
  if (eduEntries.length > 0) education += 60;
  else if (d.education.length > 0) { education += 20; suggestions.push('Complete your education entries (degree + institution).'); }
  if (eduEntries.length >= 2) education += 15;
  if (certs.length > 0) education += 25;
  else suggestions.push('Add a relevant certification to strengthen this section.');
  education = clamp(education);

  // ── Keyword match — ONLY scored when a JD is supplied. Previously defaulted to
  // 100, silently gifting ~18% of the score to every resume.
  const hasJd = jobDescription.trim().length >= 15;
  let keywordMatch: number | null = null;
  let matchedKeywords: string[] = [];
  let missingKeywords: string[] = [];
  if (hasJd) {
    const kws = extractKeywords(jobDescription);
    const text = resumeText(d);
    matchedKeywords = kws.filter((k) => text.includes(k));
    missingKeywords = kws.filter((k) => !text.includes(k)).slice(0, 12);
    keywordMatch = kws.length === 0 ? null : clamp((matchedKeywords.length / kws.length) * 100);
    if (missingKeywords.length > 0) {
      suggestions.push(`Consider addressing these job keywords: ${missingKeywords.slice(0, 6).join(', ')}.`);
    }
  } else {
    suggestions.push('Paste a job description to score keyword match against the role.');
  }

  const breakdown: AtsBreakdown = { format, completeness, contentDepth, keywordMatch, experience, education };

  // ── Weighted blend over the dimensions we ACTUALLY scored. With no JD the
  // keyword weight is redistributed across the rest rather than counting as 100.
  const parts: Array<[number, number]> = [
    [format, 0.18],
    [completeness, 0.18],
    [contentDepth, 0.18],
    [experience, 0.18],
    [education, 0.1],
  ];
  if (keywordMatch !== null) parts.push([keywordMatch, 0.18]);
  const totalWeight = parts.reduce((s, [, w]) => s + w, 0);
  const overall = clamp(parts.reduce((s, [v, w]) => s + v * w, 0) / totalWeight);

  if (suggestions.length === 0) suggestions.push('Looks strong. Tailor keywords to each job for the best match.');

  return { overall, breakdown, suggestions, matchedKeywords, missingKeywords };
}
