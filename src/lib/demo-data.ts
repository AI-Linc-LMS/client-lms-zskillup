/**
 * Seeded demo data (DEMO_TIMELINE: "responsive frontend demo only — seeded
 * data, no live backend" for content surfaces). The auth/onboarding spine uses
 * the real backend; these constants drive the dashboard, companies, prepare, and
 * company-hub screens for the presentation demo.
 *
 * The client NEVER computes XP/coins/level/PPS/rank — these are display values
 * exactly as a backend would return them (frontend/CLAUDE.md §4).
 */

// ── Student / dashboard ──────────────────────────────────────────────────────

export const DEMO_STUDENT = {
  firstName: 'Aditya',
  fullName: 'Aditya Kumar',
  initials: 'AK',
  identity: 'VIT Vellore · CSE 2026 · Coach: TCS NQT primary track',
  status: 'Active learner',
  level: 12,
  nextLevel: 13,
  currentXp: 2840,
  nextLevelXp: 3500,
  coins: 1420,
  rank: 228,
  streakDays: 14,
};

export const DEMO_PPS = {
  score: 71,
  delta: 4,
  contextLine: '12 days to TCS NQT 2026',
};

export interface Kpi {
  label: string;
  value: string;
  sub: string;
  trend: 'up' | 'down' | 'flat';
}

export const DEMO_KPIS: Kpi[] = [
  { label: 'Courses in Progress', value: '8', sub: '↑ 2 this month · Target 10', trend: 'up' },
  { label: 'Hours This Week', value: '14.5', sub: '↑ 18% vs last week', trend: 'up' },
  { label: 'Avg Assessment', value: '78%', sub: '↑ 4 pts · Pass mark 60%', trend: 'up' },
  { label: 'National Rank', value: '#228', sub: '↑ 12 places · Cohort 4,910', trend: 'up' },
];

export const DEMO_QUEST = {
  title: 'Solve 5 percentage shortcuts in < 8 minutes',
  reward: '+150 XP · 30 coins · Speedster badge',
};

export const DEMO_CONTINUE = {
  currentModule: 'Successive Percentage Change',
  moduleMeta: 'Module 3 of 7 · Numerical Reasoning · TCS NQT Prep',
  nextLesson: 'Multiplier Method Shortcut',
  nextLessonMeta: 'Video lesson · 4 min · Concept reel',
  outcome: 'Solve successive % problems in under 25 seconds using multiplier shortcuts',
  outcomeMeta: 'Assessment: 8 questions · Pass mark 70%',
  percent: 64,
  remaining: '~12 min remaining',
};

export type CourseStatus = 'In progress' | 'Due soon' | 'Completed' | 'Overdue';

export interface DemoCourse {
  title: string;
  category: string;
  instructor: string;
  lessons: number;
  hours: number;
  progress: number;
  score: number | null;
  due: string | null;
  status: CourseStatus;
  tab: 'Active' | 'Completed' | 'Due soon' | 'Overdue' | 'Watchlist';
}

export const DEMO_COURSES: DemoCourse[] = [
  { title: 'TCS NQT 2026 Complete Prep', category: 'Aptitude', instructor: 'Priya Menon', lessons: 82, hours: 24, progress: 68, score: 82, due: 'May 16', status: 'In progress', tab: 'Active' },
  { title: 'Infosys InfyTQ Specialist Track', category: 'Programming', instructor: 'Priya Menon', lessons: 82, hours: 24, progress: 55, score: 74, due: 'Jun 04', status: 'In progress', tab: 'Active' },
  { title: 'Wipro Elite NTH 2026', category: 'Mock Drive', instructor: 'Priya Menon', lessons: 82, hours: 24, progress: 42, score: 71, due: 'May 28', status: 'Due soon', tab: 'Due soon' },
  { title: 'Cognizant GenC Module Quiz', category: 'Aptitude', instructor: 'Priya Menon', lessons: 82, hours: 24, progress: 30, score: 64, due: 'May 21', status: 'Due soon', tab: 'Due soon' },
  { title: 'Capgemini Aptitude Mastery', category: 'Aptitude', instructor: 'Priya Menon', lessons: 82, hours: 24, progress: 88, score: 86, due: null, status: 'In progress', tab: 'Active' },
  { title: 'Verbal RC Assignment 4', category: 'Verbal', instructor: 'Priya Menon', lessons: 82, hours: 24, progress: 0, score: null, due: 'May 12', status: 'Due soon', tab: 'Due soon' },
];

export const DEMO_COURSE_TABS: { key: DemoCourse['tab']; count: number }[] = [
  { key: 'Active', count: 3 },
  { key: 'Completed', count: 0 },
  { key: 'Due soon', count: 3 },
  { key: 'Overdue', count: 0 },
  { key: 'Watchlist', count: 0 },
];

export interface Deadline {
  title: string;
  meta: string;
  due: string;
  urgency: 'high' | 'medium' | 'low';
}

export const DEMO_DEADLINES: Deadline[] = [
  { title: 'TCS NQT 2026 — Mock Drive', meta: 'Full mock · 80 questions · 90 min', due: 'Due in 5 days · 09 May, 10:00 IST', urgency: 'high' },
  { title: 'Verbal RC Assignment 4', meta: '5 passages · 20 questions', due: 'Due in 8 days · 12 May', urgency: 'medium' },
  { title: 'Cognizant GenC Module Quiz', meta: '15 questions · 25 min', due: 'Due 21 May', urgency: 'low' },
];

export const DEMO_WEEK = {
  days: [
    { d: 'MON', n: '04', dot: false, today: false },
    { d: 'TUE', n: '05', dot: false, today: true },
    { d: 'WED', n: '06', dot: true, today: false },
    { d: 'THU', n: '07', dot: false, today: false },
    { d: 'FRI', n: '08', dot: true, today: false },
    { d: 'SAT', n: '09', dot: true, today: false },
    { d: 'SUN', n: '10', dot: false, today: false },
  ],
  summary: '4 sessions scheduled · ~6.5 hrs planned',
};

export interface Activity {
  text: string;
  when: string;
}

export const DEMO_ACTIVITY: Activity[] = [
  { text: 'Coach Priya Menon reviewed your essay — score 8.2/10', when: '12 min ago' },
  { text: 'New course available: Capgemini Game-Based Aptitude 2026', when: '2 hrs ago' },
  { text: 'Certificate issued: Verbal Foundations Level 2', when: 'Yesterday' },
  { text: 'You completed Module 3 of TCS NQT Prep', when: '2 days ago' },
];

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
  rounds: number;
  badge?: string;
  accent: string; // tailwind gradient classes
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

export const COMPANY_TYPE_TABS: { key: 'All' | CompanyType; label: string }[] = [
  { key: 'All', label: 'All' },
  { key: 'Service', label: 'Service' },
  { key: 'Product', label: 'Product' },
  { key: 'Consulting', label: 'Consulting' },
];

export const ASSESSMENT_PLATFORMS = [
  'AMCAT', 'CoCubes', 'eLitmus', 'HackerRank', 'Mettl', 'HirePro', 'DevSquare', 'MeritTrac',
];

// ── Explore mega-menu ────────────────────────────────────────────────────────

export const EXPLORE_TRACKS = [
  { label: 'Company hubs', href: '/dashboard/company' },
  { label: 'Topic mastery', href: '/topic-mastery' },
  { label: 'Full mock quiz', href: '/dashboard/quiz' },
  { label: 'Roadmap', href: '/roadmap' },
  { label: 'Leaderboard', href: '/leaderboard' },
];

// ── Prepare catalog (tracks) ─────────────────────────────────────────────────

export interface PrepTrack {
  code: string;
  title: string;
  org: string;
  category: string;
  badge?: string;
  accent: string;
}

export const PREP_TRACKS: PrepTrack[] = [
  { code: 'TCS', title: 'TCS NQT 2026 — Complete', org: 'Tata Consultancy Services', category: 'Mock Drives', badge: 'Most enrolled', accent: 'from-blue-700 to-indigo-800' },
  { code: 'INF', title: 'InfyTQ Specialist & Power', org: 'Infosys', category: 'Programming Fundamentals', badge: 'Recruiter-endorsed', accent: 'from-teal-600 to-emerald-700' },
  { code: 'WIP', title: 'Wipro Elite National Talent Hunt', org: 'Wipro Limited', category: 'Aptitude & Reasoning', badge: 'New 2026 syllabus', accent: 'from-orange-500 to-amber-600' },
  { code: 'APT', title: 'Aptitude & Reasoning Mastery', org: 'ZSkillup Core', category: 'Aptitude & Reasoning', accent: 'from-violet-600 to-purple-700' },
  { code: 'DSA', title: 'Data Structures Foundations', org: 'ZSkillup Core', category: 'Data Structures', accent: 'from-rose-500 to-red-600' },
  { code: 'VRB', title: 'Verbal Ability Complete', org: 'ZSkillup Core', category: 'Verbal Ability', accent: 'from-sky-600 to-blue-700' },
];

export const PREP_TRACK_TABS = [
  { label: 'All Tracks', count: 15 },
  { label: 'Aptitude & Reasoning', count: 4 },
  { label: 'Programming Fundamentals', count: 1 },
  { label: 'Data Structures', count: 1 },
  { label: 'Verbal Ability', count: 1 },
  { label: 'Communication', count: 1 },
  { label: 'Mock Drives', count: 5 },
  { label: 'HR Interview', count: 1 },
];

export const PREP_STATS = [
  { value: '240,000+', label: 'Learners' },
  { value: '1,200+', label: 'Practice sets' },
  { value: '4.7★', label: 'Avg rating' },
  { value: '82%', label: 'Offer conversion' },
];

// ── Practice hub (dashboard) ─────────────────────────────────────────────────

export const PRACTICE_HUB = [
  { title: 'Company prep', body: 'Target TCS, Infosys, Capgemini, and more with pattern-matched papers and hubs.', cta: 'Browse companies', href: '/dashboard/company' },
  { title: 'Mock quiz', body: 'Timed MCQs with streaks, XP, and instant remediation — mirrors real assessment pressure.', cta: 'Start mock quiz', href: '/dashboard/quiz' },
  { title: 'Topic mastery', body: 'Drill quant, logical, verbal, and coding by sub-topic with adaptive difficulty.', cta: 'Open topic mode', href: '/topic-mastery' },
];
