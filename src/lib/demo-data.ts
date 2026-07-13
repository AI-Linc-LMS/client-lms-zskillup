/**
 * Presentation content for the marketing / hub surfaces that do not yet have a
 * dedicated content API (company hub tiles, the Explore mega-menu, the practice
 * hub cards). The auth/onboarding spine and every dashboard metric use the real
 * backend — this file holds ONLY the static catalog copy that has no live
 * endpoint behind it.
 *
 * The client NEVER computes business values (XP/PPS/rank/scores) — those come
 * from the API exactly as the backend returns them (frontend/CLAUDE.md §4).
 */

// ── Status labels (shared by StatusPill) ─────────────────────────────────────

export type CourseStatus = 'In progress' | 'Due soon' | 'Completed' | 'Overdue';

// ── Companies ────────────────────────────────────────────────────────────────

export type CompanyType = 'Service' | 'Product' | 'Consulting';
export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export interface DemoCompany {
  slug: string;
  name: string;
  tagline: string;
  type: CompanyType;
  difficulty: Difficulty;
  rating: number;
  enrolled: string;
  package: string;
  mcqs: string;
  /** Real live count of published questions tagged to this company (from the API). */
  questionCount?: number;
  rounds: number;
  badge?: string;
  accent: string; // tailwind gradient classes
  /** Real company logo URL (from the API); falls back to the initials tile when absent. */
  logoUrl?: string | null;
}

export const DEMO_COMPANIES: DemoCompany[] = [
  { slug: 'accenture', name: 'Accenture', tagline: 'Cognitive + Tech + English tracks', type: 'Consulting', difficulty: 'Medium', rating: 4.4, enrolled: '12k+', package: '4.5 – 6.5 LPA', mcqs: '2.4k+ MCQs', rounds: 5, badge: 'Most enrolled', accent: 'from-violet-600 to-indigo-700' },
  { slug: 'tcs', name: 'TCS', tagline: 'NQT-style quant, verbal & reasoning', type: 'Service', difficulty: 'Medium', rating: 4.5, enrolled: '25k+', package: '3.3 – 7.0 LPA', mcqs: '3.1k+ MCQs', rounds: 5, badge: 'Recruiter-endorsed', accent: 'from-teal-600 to-emerald-700' },
  { slug: 'infosys', name: 'Infosys', tagline: 'Puzzle-heavy + specialist paths', type: 'Service', difficulty: 'Hard', rating: 4.6, enrolled: '18k+', package: '3.6 – 9.5 LPA', mcqs: '2.8k+ MCQs', rounds: 5, badge: 'New 2026', accent: 'from-orange-500 to-amber-600' },
  { slug: 'wipro', name: 'Wipro', tagline: 'Aptitude + OOP + coding fundamentals', type: 'Service', difficulty: 'Medium', rating: 4.7, enrolled: '10k+', package: '3.5 – 6.5 LPA', mcqs: '1.9k+ MCQs', rounds: 4, accent: 'from-purple-600 to-fuchsia-700' },
  { slug: 'cognizant', name: 'Cognizant', tagline: 'GenC + GenC Next tracks', type: 'Service', difficulty: 'Medium', rating: 4.3, enrolled: '9k+', package: '4.0 – 6.5 LPA', mcqs: '1.7k+ MCQs', rounds: 4, accent: 'from-rose-500 to-red-600' },
  { slug: 'capgemini', name: 'Capgemini', tagline: 'Game-based aptitude + pseudocode', type: 'Consulting', difficulty: 'Medium', rating: 4.2, enrolled: '8k+', package: '3.8 – 5.5 LPA', mcqs: '1.5k+ MCQs', rounds: 4, accent: 'from-sky-600 to-blue-700' },
  { slug: 'deloitte', name: 'Deloitte', tagline: 'Assessment + case + behavioural', type: 'Consulting', difficulty: 'Hard', rating: 4.5, enrolled: '6k+', package: '6.5 – 11 LPA', mcqs: '1.2k+ MCQs', rounds: 5, accent: 'from-slate-700 to-slate-900' },
  { slug: 'amazon', name: 'Amazon', tagline: 'DSA-heavy + leadership principles', type: 'Product', difficulty: 'Hard', rating: 4.8, enrolled: '14k+', package: '12 – 28 LPA', mcqs: '2.1k+ MCQs', rounds: 5, accent: 'from-blue-700 to-indigo-900' },
  { slug: 'google', name: 'Google', tagline: 'Advanced DSA + system design intro', type: 'Product', difficulty: 'Hard', rating: 4.9, enrolled: '11k+', package: '18 – 45 LPA', mcqs: '1.8k+ MCQs', rounds: 6, accent: 'from-emerald-600 to-teal-700' },
];

export const ASSESSMENT_PLATFORMS = [
  'AMCAT', 'CoCubes', 'eLitmus', 'HackerRank', 'Mettl', 'HirePro', 'DevSquare', 'MeritTrac',
];

// ── Explore mega-menu ────────────────────────────────────────────────────────

export const EXPLORE_TRACKS = [
  { label: 'Company hubs', href: '/dashboard/company' },
  { label: 'Topic mastery', href: '/practice' },
  { label: 'Full mock quiz', href: '/mock-assessment' },
];

// ── Practice hub (dashboard) ─────────────────────────────────────────────────

export const PRACTICE_HUB = [
  { title: 'Company prep', body: 'Target TCS, Infosys, Capgemini, and more with pattern-matched papers and hubs.', cta: 'Browse companies', href: '/dashboard/company' },
  { title: 'Adaptive', body: 'Adaptive, non-proctored practice - pick a section, a single topic, or a company, and resume any time.', cta: 'Start practicing', href: '/practice' },
  { title: 'Mock assessment', body: 'Build a proctored, server-timed mock from any sections, topics, or coding - instant percentile and full review.', cta: 'Build mock assessment', href: '/mock-assessment' },
];
