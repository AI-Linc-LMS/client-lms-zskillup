/**
 * Landing-page content config. Everything the public homepage shows that isn't
 * brand copy lives here so it can be tuned in ONE place (no values hardcoded in
 * the JSX). CTA destinations are centralized too - the old page pointed several
 * CTAs at `/prepare`, which is a dead redirect to the company hubs, so "today's
 * focus" and "coverage" wrongly dumped users on the Companies tab.
 */

/** Where the marketing CTAs should go (public visitors are logged out). */
/**
 * Where the PUBLIC surfaces link. Consumed by the navbar, the footer and the landing
 * page's CTAs — every one of them rendered to logged-out visitors and to crawlers.
 *
 * THESE MUST POINT AT PUBLIC URLS, AND TWO OF THEM DID NOT. `companies` pointed at
 * /dashboard/company and `prepare` at /practice: both are app surfaces, and
 * /dashboard is `Disallow`ed in robots.txt. So the header on every public page —
 * landing, blog, and all 23 of the new SEO pages — sent crawlers into a blocked area,
 * while the public /company and /section pages they should have been pointing at had no
 * internal links at all and were reachable only from the sitemap, which is the weakest
 * signal there is. A logged-out human fared no better: /practice needs an account.
 */
export const LANDING_HREFS = {
  /** "Prepare" - the public sections picker (numerical, logical, verbal, technical,
   *  interview prep, coding). The app's /practice needs an account; this does not. */
  prepare: '/section',
  /** "Start a session" - practice needs an account, so start = sign up. */
  start: '/signup',
  /** "Browse the catalog" of topics - full catalog unlocks after sign-up. */
  catalog: '/signup',
  /** "Companies" - the public company landing pages, NOT /dashboard/company, which is
   *  robots-disallowed and carries no sign-up CTA. */
  companies: '/company',
} as const;

/**
 * The public navbar's primary links. ONE list, consumed by both the desktop nav in the
 * landing header and the PublicMobileMenu hamburger - the mobile menu used to hand-copy
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

/**
 * Official social profiles for the footer "Follow us" row. LinkedIn is confirmed;
 * the Instagram + YouTube handles are best-guesses (prephasz / @ByLokeshMathur) -
 * update the hrefs here in one place if the exact handles differ.
 */
export const LANDING_SOCIALS = [
  { label: 'Instagram', href: 'https://www.instagram.com/prephasz' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/company/prephasz' },
  { label: 'YouTube', href: 'https://www.youtube.com/@ByLokeshMathur' },
] as const;
