/**
 * Seeded company-hub content (COMPANY_HUB_SPEC). ONE template, content instances
 * per company. The 7-tab structure is canonical — never 5 tabs (frontend/CLAUDE
 * §10). Freemium lock state is expressed visually; locked content stays visible
 * (frontend/CLAUDE §4b).
 */
import { DEMO_COMPANIES, type DemoCompany } from './demo-data';

export const HUB_TABS = [
  'Overview',
  'Syllabus',
  'Practice Quiz',
  'Full Mock Assessment',
] as const;
export type HubTab = (typeof HUB_TABS)[number];

export interface SyllabusRound {
  round: string;
  info: string;
  type: 'Elimination' | 'Final';
}

export interface MaterialTopic {
  topic: string;
  videos: number;
  locked: boolean;
}

export interface QuizSet {
  title: string;
  questions: number;
  locked: boolean;
}

export interface MockEntry {
  title: string;
  questions: number;
  minutes: number;
  kind: 'mock' | 'contest';
  locked: boolean;
}

export interface InterviewExp {
  role: string;
  year: string;
  rounds: number;
  verdict: 'Selected' | 'Rejected';
  excerpt: string;
}

export interface HubContent {
  company: DemoCompany;
  overview: {
    summary: string;
    process: { stage: string; detail: string }[];
    topicGrid: { group: string; topics: string[] }[];
  };
  syllabus: SyllabusRound[];
  quickStats: { rounds: number; examType: string; negativeMarking: string; applicants: string; readiness: string; openRoles: string };
  material: MaterialTopic[];
  quizzes: QuizSet[];
  mocks: MockEntry[];
  formulaSheets: { topic: string; locked: boolean }[];
  interviews: InterviewExp[];
}

function bySlug(slug: string): DemoCompany {
  const found = DEMO_COMPANIES.find((c) => c.slug === slug);
  if (found) return found;
  // Company exists in the backend but not the demo seed (e.g. zoho). Synthesize a
  // neutral shell from the slug so the generated copy reads "The Zoho drive…"
  // instead of falling back to DEMO_COMPANIES[0] (Accenture) and mislabelling the
  // hub. The [slug] page overlays the real name/tagline on top of this.
  const name = slug
    .split('-')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
  return { ...DEMO_COMPANIES[0], slug, name };
}

/** Generic content generator — all 9 hubs are instances of the same template. */
export function getHubContent(slug: string): HubContent {
  const company = bySlug(slug);
  return {
    company,
    overview: {
      summary: `The ${company.name} drive is usually structured in ${company.rounds} online stages before interviews. Use the topic links below to practice each area; mock scores and difficulty adapt per company in the prep workspace.`,
      process: [
        { stage: 'Online Assessment', detail: 'Aptitude, reasoning, and verbal sections — timed and sectional.' },
        { stage: 'Technical Round', detail: 'Coding / pseudocode, CS fundamentals, and domain questions.' },
        { stage: 'Technical + HR Interview', detail: 'Resume-driven discussion, projects, and behavioural fit.' },
      ],
      topicGrid: [
        { group: 'Cognitive', topics: ['Critical Reasoning', 'Problem Solving', 'Abstract Reasoning', 'English Ability'] },
        { group: 'Technical', topics: ['Pseudocode', 'Networking', 'Cloud', 'DBMS'] },
        { group: 'Coding', topics: ['Arrays & Strings', 'Recursion', 'Data Structures', 'Complexity'] },
      ],
    },
    syllabus: [
      { round: 'Cognitive Assessment', info: '90 Questions · 90 Minutes', type: 'Elimination' },
      { round: 'Technical Assessment', info: 'Pseudocode · Networking · Cloud', type: 'Elimination' },
      { round: 'Coding Assessment', info: '2 DSA Questions · 45 Minutes', type: 'Elimination' },
      { round: 'English Assessment', info: 'Fluency · Vocabulary · Listening', type: 'Elimination' },
      { round: 'Technical & HR Interview', info: '20–30 Minutes · Resume Focused', type: 'Final' },
    ],
    quickStats: {
      rounds: company.rounds,
      examType: 'Adaptive (section-level)',
      negativeMarking: 'No',
      applicants: '5,56,078',
      readiness: '74%',
      openRoles: '41,154',
    },
    material: [
      { topic: 'Quantitative Aptitude', videos: 12, locked: false },
      { topic: 'Logical Reasoning', videos: 9, locked: true },
      { topic: 'Verbal Ability', videos: 8, locked: true },
      { topic: 'Pseudocode & Coding', videos: 14, locked: true },
      { topic: 'CS Fundamentals', videos: 11, locked: true },
    ],
    quizzes: [
      { title: 'Percentages & Ratios — Set 1', questions: 20, locked: false },
      { title: 'Time, Speed & Distance', questions: 20, locked: true },
      { title: 'Logical Puzzles', questions: 25, locked: true },
      { title: 'Reading Comprehension', questions: 15, locked: true },
      { title: 'Pseudocode Basics', questions: 20, locked: true },
    ],
    mocks: [
      { title: 'Full Mock 1 (Free)', questions: 100, minutes: 90, kind: 'mock', locked: false },
      { title: 'Full Mock 2', questions: 100, minutes: 90, kind: 'mock', locked: true },
      { title: 'Full Mock 3', questions: 100, minutes: 90, kind: 'mock', locked: true },
      { title: 'Full Mock 4', questions: 100, minutes: 90, kind: 'mock', locked: true },
      { title: 'Full Mock 5', questions: 100, minutes: 90, kind: 'mock', locked: true },
      { title: 'Live Contest — Weekend Drive', questions: 100, minutes: 90, kind: 'contest', locked: true },
    ],
    formulaSheets: [
      { topic: 'Percentages & Profit-Loss', locked: false },
      { topic: 'Time & Work', locked: true },
      { topic: 'Permutations & Combinations', locked: true },
      { topic: 'Number System', locked: true },
    ],
    interviews: [
      { role: 'Software Engineer', year: '2025', rounds: 3, verdict: 'Selected', excerpt: 'OA was section-timed; coding round had 2 medium DSA questions. HR focused on projects and one behavioural scenario.' },
      { role: 'Systems Engineer', year: '2025', rounds: 3, verdict: 'Selected', excerpt: 'Aptitude was the main elimination filter. Pseudocode round needed clean logic, not syntax. Friendly HR.' },
      { role: 'Digital Specialist', year: '2024', rounds: 4, verdict: 'Rejected', excerpt: 'Cleared OA but coding round time management hurt me. Would prioritise speed practice next time.' },
    ],
  };
}
