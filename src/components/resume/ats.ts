import type { ResumeData } from './types';

/**
 * Client-side ATS (Applicant Tracking System) heuristic scorer — ported from the
 * AI-LINC resume builder. Runs entirely in the browser (no network). Produces an
 * overall 0–100 score, per-dimension breakdown, actionable suggestions, and — when
 * a job description is supplied — matched/missing keyword sets.
 */

export interface AtsBreakdown {
  format: number; // structure/sections present
  completeness: number; // contact + summary
  contentDepth: number; // bullets, skills, projects
  keywordMatch: number; // vs job description (100 if no JD given)
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
  // Frequency-rank, keep the top distinct terms.
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

  // Format — key sections present.
  let format = 0;
  if (d.workExperience.length > 0) format += 40; else suggestions.push('Add at least one work experience entry.');
  if (d.education.length > 0) format += 25; else suggestions.push('Add your education.');
  if (d.skills.length > 0) format += 25; else suggestions.push('Add a skills section.');
  if (d.projects.length > 0) format += 10;
  format = clamp(format);

  // Completeness — contact + summary.
  let completeness = 0;
  if (b.email) completeness += 25; else suggestions.push('Add an email address.');
  if (b.phone) completeness += 20; else suggestions.push('Add a phone number.');
  if (b.location) completeness += 15;
  if (b.professionalTitle) completeness += 15; else suggestions.push('Add a professional title.');
  const summaryWords = b.summary.trim().split(/\s+/).filter(Boolean).length;
  if (summaryWords >= 25) completeness += 25;
  else if (summaryWords > 0) { completeness += 12; suggestions.push('Expand your summary to 2–3 full sentences.'); }
  else suggestions.push('Write a professional summary.');
  completeness = clamp(completeness);

  // Content depth — bullets, skills, projects.
  const bulletCount = d.workExperience.reduce((n, w) => n + w.description.filter((x) => x.trim()).length, 0);
  let contentDepth = 0;
  contentDepth += Math.min(bulletCount, 8) * 8; // up to 64
  contentDepth += Math.min(d.skills.length, 8) * 3; // up to 24
  contentDepth += Math.min(d.projects.length, 3) * 4; // up to 12
  if (bulletCount < 3) suggestions.push('Add more achievement bullets to your experience (aim for 3–5 per role).');
  contentDepth = clamp(contentDepth);

  // Experience — roles + quantified impact (numbers/%).
  let experience = 0;
  experience += Math.min(d.workExperience.length, 3) * 20; // up to 60
  const quantified = d.workExperience.some((w) => w.description.some((x) => /\d/.test(x)));
  if (quantified) experience += 40;
  else if (d.workExperience.length > 0) suggestions.push('Quantify impact with numbers/percentages (e.g. "cut latency by 40%").');
  experience = clamp(experience);

  // Education + certifications.
  let education = 0;
  if (d.education.length > 0) education += 70;
  if (d.certifications.length > 0) education += 30;
  education = clamp(education);

  // Keyword match vs JD.
  let keywordMatch = 100;
  let matchedKeywords: string[] = [];
  let missingKeywords: string[] = [];
  if (jobDescription.trim().length >= 15) {
    const kws = extractKeywords(jobDescription);
    const text = resumeText(d);
    matchedKeywords = kws.filter((k) => text.includes(k));
    missingKeywords = kws.filter((k) => !text.includes(k)).slice(0, 12);
    keywordMatch = kws.length === 0 ? 100 : clamp((matchedKeywords.length / kws.length) * 100);
    if (missingKeywords.length > 0) {
      suggestions.push(`Consider addressing these job keywords: ${missingKeywords.slice(0, 6).join(', ')}.`);
    }
  }

  const breakdown: AtsBreakdown = { format, completeness, contentDepth, keywordMatch, experience, education };

  // Weighted blend; keyword match weighs more when a JD is present.
  const hasJd = jobDescription.trim().length >= 15;
  const overall = clamp(
    format * 0.18 +
      completeness * 0.18 +
      contentDepth * 0.18 +
      experience * 0.18 +
      education * 0.1 +
      keywordMatch * (hasJd ? 0.18 : 0.18),
  );

  if (suggestions.length === 0) suggestions.push('Looks strong. Tailor keywords to each job for the best match.');

  return { overall, breakdown, suggestions, matchedKeywords, missingKeywords };
}
