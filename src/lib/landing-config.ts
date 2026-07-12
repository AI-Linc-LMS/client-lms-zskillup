/**
 * Landing-page content config. Everything the public homepage shows that isn't
 * brand copy lives here so it can be tuned in ONE place (no values hardcoded in
 * the JSX). CTA destinations are centralized too — the old page pointed several
 * CTAs at `/prepare`, which is a dead redirect to the company hubs, so "today's
 * focus" and "coverage" wrongly dumped users on the Companies tab.
 */

/** Where the marketing CTAs should go (public visitors are logged out). */
export const LANDING_HREFS = {
  /** "Prepare" — the practice picker: sections, topics and coding. Deliberately NOT the
   *  company hubs: `prepare` and `companies` both pointed at /dashboard/company, so the
   *  navbar shipped two links that went to the same page. */
  prepare: '/practice',
  /** "Start a session" — practice needs an account, so start = sign up. */
  start: '/signup',
  /** "Browse the catalog" of topics — full catalog unlocks after sign-up. */
  catalog: '/signup',
  /** "Companies" — the company hubs (company-specific tracks). */
  companies: '/dashboard/company',
} as const;

/**
 * The public navbar's primary links. ONE list, consumed by both the desktop nav in the
 * landing header and the PublicMobileMenu hamburger — the mobile menu used to hand-copy
 * these, so the two could (and did) drift apart.
 */
export const LANDING_NAV = [
  { label: 'Companies', href: LANDING_HREFS.companies },
  { label: 'Prepare', href: LANDING_HREFS.prepare },
  { label: 'Leaderboard', href: '/leaderboard' },
  { label: 'Blog', href: '/blog' },
] as const;

export const LANDING_HERO_STATS = [
  { label: 'Students enrolled', value: '240,000+' },
  { label: 'Partner colleges', value: '1,200+' },
  { label: 'Average rating', value: '4.7★' },
  { label: 'Placement success', value: '82%' },
];

/** The "Today's focus" preview card in the gamification section. */
export const LANDING_TODAYS_FOCUS = {
  eyebrow: "Today's focus",
  topic: 'Probability & permutations',
  meta: '20-min drill · High weight for TCS & Infosys',
  ctaLabel: 'Start session',
  ctaHref: LANDING_HREFS.start,
};

/** Illustrative streak preview (a demo of the in-app streak widget, not a real user). */
export const LANDING_STREAK_DEMO = {
  days: 14,
  /** Relative bar heights (0–100) for the week, + day initials. */
  week: [42, 60, 38, 72, 88, 65, 90],
  labels: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
};

export const LANDING_COVERAGE_TOPICS = [
  'Quantitative Aptitude',
  'Logical Reasoning',
  'Verbal Ability',
  'Programming Fundamentals',
  'Data Structures',
  'OOPS',
  'DBMS · SQL',
  'Operating Systems',
  'Computer Networks',
  'HR Interview',
  'Group Discussion',
  'Resume & LinkedIn',
];

/** Footer link groups. Coverage items are now real links (were dead text). */
export const LANDING_FOOTER = {
  product: [
    { label: 'Prepare', href: LANDING_HREFS.prepare },
    { label: 'Mock tests', href: '/mock-assessment' },
    { label: 'Companies', href: LANDING_HREFS.companies },
    { label: 'Leaderboard', href: '/leaderboard' },
  ],
  account: [
    { label: 'Log in', href: '/login' },
    { label: 'Create account', href: '/signup' },
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Roadmap', href: '/roadmap' },
  ],
  coverage: [
    { label: 'Aptitude & Reasoning', href: LANDING_HREFS.catalog },
    { label: 'Coding & DSA', href: LANDING_HREFS.catalog },
    { label: 'Interview Prep', href: LANDING_HREFS.catalog },
    { label: 'Company Tracks', href: LANDING_HREFS.companies },
  ],
};
