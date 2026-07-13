/**
 * SHARED DEMO DATA — leaderboard, roadmap, and homepage sections.
 * All display-only; client never computes scores, XP, or ranks.
 */

// ── Leaderboard ───────────────────────────────────────────────────────────────

export const DEMO_LEADERBOARD_GLOBAL_STATS = [
  { label: 'Active learners', value: '4,910' },
  { label: 'XP awarded this week', value: '12.4M' },
  { label: 'Top streak today', value: '92 days' },
  { label: 'Your rank', value: '#228' },
];

export interface LeaderboardEntry {
  rank: number;
  name: string;
  college: string;
  leading: string;
  level: number;
  streak: number;
  badges: number;
  xp: number;
  isYou?: boolean;
  initials: string;
}

export const DEMO_LEADERBOARD_PODIUM: LeaderboardEntry[] = [
  { rank: 1, name: 'Sneha Iyer', college: 'PSG Tech · IT 2025', leading: 'Amazon track', level: 22, streak: 38, badges: 14, xp: 14820, initials: 'SI' },
  { rank: 2, name: 'Karan Patel', college: 'IIIT-H · CSE 2025', leading: 'Infosys track', level: 21, streak: 28, badges: 12, xp: 13680, initials: 'KP' },
  { rank: 3, name: 'Rahul Krishnan', college: 'BITS Pilani · CSE 2026', leading: 'TCS track', level: 20, streak: 22, badges: 11, xp: 12740, initials: 'RK' },
];

export const DEMO_LEADERBOARD_TABLE: LeaderboardEntry[] = [
  { rank: 4, name: 'Anjali Verma', college: 'NIT Trichy', leading: 'Cognizant', level: 19, streak: 17, badges: 10, xp: 12120, initials: 'AV' },
  { rank: 5, name: 'Devansh Mehta', college: 'VIT Vellore', leading: 'Wipro', level: 18, streak: 19, badges: 9, xp: 11860, initials: 'DM' },
  { rank: 6, name: 'Riya Bansal', college: 'PES University', leading: 'Capgemini', level: 18, streak: 14, badges: 9, xp: 11420, initials: 'RB' },
  { rank: 7, name: 'Akshay Nair', college: 'SRM IST', leading: 'Accenture', level: 17, streak: 21, badges: 8, xp: 10980, initials: 'AN' },
  { rank: 228, name: 'Aditya Krishnan', college: 'VIT Vellore · CSE 2026', leading: 'TCS', level: 12, streak: 14, badges: 6, xp: 2840, isYou: true, initials: 'AK' },
];

export const DEMO_LEADERBOARD_SCOPE_TABS = [
  { key: 'national', label: 'National', count: 4910 },
  { key: 'college', label: 'My college', count: 312 },
  { key: 'cohort', label: 'My cohort', count: 84 },
  { key: 'friends', label: 'Friends', count: 12 },
];

export const DEMO_LEADERBOARD_TIME_TABS = ['This week', 'This month', 'All time'];

// ── Roadmap ───────────────────────────────────────────────────────────────────

export type RoadmapStatus = 'done' | 'active' | 'locked';

export interface RoadmapStep {
  number: number;
  title: string;
  type: 'topic' | 'company';
  description: string;
  reward: string;
  status: RoadmapStatus;
  meta: string;
  href: string;
}

export const DEMO_ROADMAP_STEPS: RoadmapStep[] = [
  {
    number: 1,
    title: 'Foundation topics',
    type: 'topic',
    description: 'Build basics in Percentages, Averages, Ratios the spine of every aptitude paper.',
    reward: '800 XP + Foundation badge + 200 XP bonus',
    status: 'done',
    meta: 'Completed 04 May',
    href: '/prepare',
  },
  {
    number: 2,
    title: 'TCS NQT readiness',
    type: 'company',
    description: 'Solve pattern-matched TCS drills with strict timing section weights match the live drive.',
    reward: '1,200 XP + TCS Pattern badge + Mentor session voucher',
    status: 'active',
    meta: '~12 days remaining',
    href: '/prepare',
  },
  {
    number: 3,
    title: 'Logical depth',
    type: 'topic',
    description: 'Strengthen Blood Relations, Syllogisms, and Coding-Decoding to consistently hit 85%+ accuracy.',
    reward: '900 XP + Logical Master badge + 250 XP bonus',
    status: 'locked',
    meta: 'Unlocks after step 2',
    href: '/prepare',
  },
  {
    number: 4,
    title: 'Infosys specialist track',
    type: 'company',
    description: 'Advance to coding-heavy sections InfyTQ specialist questions, Power Programmer drills.',
    reward: '1,400 XP + Specialist badge + Recruiter referral nomination',
    status: 'locked',
    meta: 'Unlocks after step 3',
    href: '/prepare',
  },
  {
    number: 5,
    title: 'Timed mock cycle',
    type: 'topic',
    description: 'Run full simulations with strict timing across 4 mock drives. Build muscle memory under pressure.',
    reward: '1,100 XP + Pressure-tested badge + College leaderboard boost',
    status: 'locked',
    meta: 'Unlocks after step 4',
    href: '/prepare',
  },
  {
    number: 6,
    title: 'Capgemini final prep',
    type: 'company',
    description: 'Adaptive assessment sequence game-based aptitude, English communication, and pseudocode.',
    reward: '1,600 XP + Placement-ready badge + Verified certificate',
    status: 'locked',
    meta: 'Unlocks after step 5',
    href: '/prepare',
  },
];

export const DEMO_ROADMAP_PROGRESS = {
  pct: 25,
  xpEarned: 1400,
  xpTotal: 7000,
  stepsCompleted: 1,
  stepsTotal: 6,
  activeStep: 2,
};

// ── Homepage ──────────────────────────────────────────────────────────────────

const wiki = 'https://upload.wikimedia.org/wikipedia/commons';

export interface HomepageTrack {
  slug: string;
  badge?: string;
  company: string;
  logoSrc: string;
  logoAlt: string;
  description: string;
  title: string;
  mcqs: string;
  rounds: number;
  rating: number;
  enrolled: string;
  hours: number;
  accent: string;
  /** Company card type — drives the explorer's Service/Product/Consulting filter. */
  type: 'SERVICE' | 'PRODUCT' | 'CONSULTING';
  /** Coming-soon: the hub isn't live yet. Renders locked (no "Prepare now", no link)
   *  on both the landing tracks and the Explore grid. */
  locked?: boolean;
}

/**
 * The featured company set — the SINGLE ordered source of truth for BOTH the landing-page
 * tracks and the Explore grid. Order is the display order on both surfaces.
 *
 * The first five are live hubs (published in the catalog) and render as normal tracks. The
 * last four are `locked` — their hubs aren't built yet, so they show a "Coming soon" card
 * and don't navigate. "LTIMindtree" and "HCLTech" are the current brand names for the DB's
 * `mindtree` / `hcl` rows (unpublished); the slug is unchanged, only the display name.
 *
 * A locked entry auto-unlocks the moment its catalog row is published — both surfaces treat
 * "present in GET /companies" as the unlock signal — so this list won't need editing then.
 */
export const HOMEPAGE_FEATURED_TRACKS: HomepageTrack[] = [
  { slug: 'accenture', badge: 'Most enrolled', company: 'Accenture', type: 'CONSULTING', logoSrc: `${wiki}/c/cd/Accenture.svg`, logoAlt: 'Accenture logo', description: 'Cognitive, Technical & English tracks with adaptive section timing.', title: 'Accenture - Complete preparation', mcqs: '2.4k+', rounds: 5, rating: 4.5, enrolled: '12k+', hours: 10, accent: 'from-violet-600 to-indigo-700' },
  { slug: 'tcs', badge: 'Recruiter-endorsed', company: 'TCS', type: 'SERVICE', logoSrc: `${wiki}/0/0e/Tata_Consultancy_Services_old_logo.svg`, logoAlt: 'TCS logo', description: 'NQT-style quant, verbal & reasoning updated to 2026 paper pattern.', title: 'TCS - Complete preparation', mcqs: '3.1k+', rounds: 5, rating: 4.6, enrolled: '25k+', hours: 12, accent: 'from-teal-600 to-emerald-700' },
  { slug: 'infosys', badge: 'New 2026 syllabus', company: 'Infosys', type: 'SERVICE', logoSrc: `${wiki}/9/95/Infosys_logo.svg`, logoAlt: 'Infosys logo', description: 'Puzzle-heavy specialist paths with InfyTQ Power Programmer drills.', title: 'Infosys - Complete preparation', mcqs: '2.8k+', rounds: 5, rating: 4.7, enrolled: '18k+', hours: 14, accent: 'from-orange-500 to-amber-600' },
  { slug: 'cognizant', company: 'Cognizant', type: 'SERVICE', logoSrc: `${wiki}/4/43/Cognizant_logo_2022.svg`, logoAlt: 'Cognizant logo', description: 'GenC and GenC Next tracks with game-based aptitude simulation.', title: 'Cognizant - Complete preparation', mcqs: '2.2k+', rounds: 4, rating: 4.5, enrolled: '15k+', hours: 18, accent: 'from-rose-500 to-red-600' },
  { slug: 'capgemini', company: 'Capgemini', type: 'CONSULTING', logoSrc: `${wiki}/9/9d/Capgemini_201x_logo.svg`, logoAlt: 'Capgemini logo', description: 'Pseudocode, game-based aptitude, and communication assessment prep.', title: 'Capgemini - Complete preparation', mcqs: '2.0k+', rounds: 5, rating: 4.6, enrolled: '12k+', hours: 20, accent: 'from-sky-600 to-blue-700' },
  { slug: 'tech-mahindra', company: 'Tech Mahindra', type: 'SERVICE', locked: true, logoSrc: `${wiki}/3/34/Tech_Mahindra_New_Logo.svg`, logoAlt: 'Tech Mahindra logo', description: 'Aptitude, coding and communication rounds for the ELCOT / campus track.', title: 'Tech Mahindra - Complete preparation', mcqs: '-', rounds: 4, rating: 4.4, enrolled: '-', hours: 0, accent: 'from-red-600 to-rose-700' },
  { slug: 'mindtree', company: 'LTIMindtree', type: 'SERVICE', locked: true, logoSrc: `${wiki}/9/9f/LTIMindtree_Logo.svg`, logoAlt: 'LTIMindtree logo', description: 'Quant, logical reasoning and coding for the merged LTI + Mindtree hiring track.', title: 'LTIMindtree - Complete preparation', mcqs: '-', rounds: 4, rating: 4.4, enrolled: '-', hours: 0, accent: 'from-orange-500 to-pink-600' },
  { slug: 'hcl', company: 'HCLTech', type: 'SERVICE', locked: true, logoSrc: `${wiki}/e/e5/HCLTech-new-logo.svg`, logoAlt: 'HCLTech logo', description: 'Aptitude and technical MCQs for the HCLTech TechBee / fresher drives.', title: 'HCLTech - Complete preparation', mcqs: '-', rounds: 4, rating: 4.3, enrolled: '-', hours: 0, accent: 'from-blue-600 to-indigo-700' },
];

export const HOMEPAGE_WHY_BLOCKS = [
  { title: 'Company-wise tracks', body: 'Pattern-matched papers for TCS NQT, Infosys InfyTQ, Wipro NTH, Cognizant GenC. Updated each season.' },
  { title: 'Adaptive quizzing', body: 'Difficulty re-tunes to accuracy and speed. Hint ladders, video walkthroughs, bookmarked weak spots.' },
  { title: 'Gamified progress', body: 'XP, streaks, daily quests, level badges, national leaderboard.' },
  { title: 'Institutional analytics', body: 'TPOs see cohort heat-maps, at-risk students, PPS distributions export-ready and audit-friendly.' },
];

export const HOMEPAGE_COVERAGE_TOPICS = [
  'Quantitative Aptitude', 'Logical Reasoning', 'Verbal Ability', 'Programming Fundamentals',
  'Data Structures', 'OOPS', 'DBMS & SQL', 'Operating Systems',
  'Computer Networks', 'HR Interview', 'Group Discussion', 'Resume & LinkedIn',
];

export const HOMEPAGE_TESTIMONIALS = [
  { quote: 'The TCS NQT track was very close to the actual paper pattern, difficulty, everything. Cleared it in my first attempt and daily quests kept me consistent.', name: 'Aditya Krishnan', detail: 'VIT Vellore · CSE 2025' },
  { quote: 'Adaptive difficulty actually works. My quant accuracy went from 58% to 84% in 8 weeks. I could see exactly which sub-topics were pulling me down.', name: 'Sneha Iyer', detail: 'PSG Tech · IT 2025' },
  { quote: 'The cohort heat-map is invaluable. We caught at-risk students 3 weeks before the placement window and had time to intervene.', name: 'Dr. Priya Menon', detail: 'TPO, VVIT' },
];

export const HOMEPAGE_COMPANY_LOGOS = [
  { name: 'Accenture', slug: 'accenture', logoSrc: `${wiki}/c/cd/Accenture.svg`, logoAlt: 'Accenture logo' },
  { name: 'TCS',       slug: 'tcs',       logoSrc: `${wiki}/0/0e/Tata_Consultancy_Services_old_logo.svg`, logoAlt: 'TCS logo' },
  { name: 'Infosys',   slug: 'infosys',   logoSrc: `${wiki}/9/95/Infosys_logo.svg`, logoAlt: 'Infosys logo' },
  { name: 'Wipro',     slug: 'wipro',     logoSrc: `${wiki}/a/a0/Wipro_Primary_Logo_Color_RGB.svg`, logoAlt: 'Wipro logo' },
  { name: 'Cognizant', slug: 'cognizant', logoSrc: `${wiki}/4/43/Cognizant_logo_2022.svg`, logoAlt: 'Cognizant logo' },
  { name: 'Capgemini', slug: 'capgemini', logoSrc: `${wiki}/9/9d/Capgemini_201x_logo.svg`, logoAlt: 'Capgemini logo' },
  { name: 'Deloitte',  slug: 'deloitte',  logoSrc: `${wiki}/e/ed/Logo_of_Deloitte.svg`, logoAlt: 'Deloitte logo' },
  { name: 'Amazon',    slug: 'amazon',    logoSrc: `${wiki}/a/a9/Amazon_logo.svg`, logoAlt: 'Amazon logo' },
];
