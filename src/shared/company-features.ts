/**
 * The company × feature page matrix behind /company/[slug]/[feature].
 *
 * Shared because BOTH repos generate from it and must not drift: the backend turns
 * each entry into one SEO-module template row, the frontend turns each into a
 * statically-generated public page. A feature present in one repo and absent from
 * the other is either a page with no editable metadata or a metadata row governing
 * nothing — so this file is duplicated byte-identical per ADR-011.
 *
 * Every feature here is backed by real hub data (`CompanyHubContentDto`). Adding one
 * that has no data source produces a thin page, which is the one thing a pSEO surface
 * must not ship: Google treats a set of near-empty templated pages as doorway pages,
 * and the penalty lands on the whole directory, not the single page.
 */
export interface CompanyFeature {
  /** URL segment: /company/accenture/<slug> */
  slug: string;
  /** Nav label, breadcrumb leaf, and the anchor text other hubs link to. */
  label: string;
  /** SEO-module key; `{company}` is substituted per page at render time. */
  titleTemplate: string;
  descriptionTemplate: string;
  keywordsTemplate: string;
  /** H1 on the page itself. Distinct from the meta title on purpose. */
  headingTemplate: string;
}

export const COMPANY_FEATURES: CompanyFeature[] = [
  {
    slug: 'syllabus',
    label: 'Syllabus',
    titleTemplate: '{company} Syllabus {year} — Complete Topic List & Exam Pattern | Prephasz',
    descriptionTemplate:
      'The full {company} syllabus for {year}: every round, the topics tested in each, question counts and durations, with practice for each topic.',
    keywordsTemplate:
      '{company} syllabus, {company} syllabus {year}, {company} exam topics, {company} online test syllabus',
    headingTemplate: '{company} Syllabus {year}',
  },
  {
    slug: 'test-pattern',
    label: 'Test pattern',
    titleTemplate: '{company} Test Pattern {year} — Rounds, Marks & Duration | Prephasz',
    descriptionTemplate:
      'The {company} test pattern for {year}: how many rounds, questions and minutes per section, negative marking, sectional cut-offs and what each round eliminates on.',
    keywordsTemplate:
      '{company} test pattern, {company} exam pattern, {company} online test pattern {year}, {company} selection process',
    headingTemplate: '{company} Test Pattern {year}',
  },
  {
    slug: 'previous-papers',
    label: 'Previous papers',
    titleTemplate: '{company} Previous Year Question Papers with Solutions | Prephasz',
    descriptionTemplate:
      'Real {company} previous-year questions by topic, with solutions. Papers from actual drives, grouped the way the test groups them.',
    keywordsTemplate:
      '{company} previous year questions, {company} placement papers, {company} question paper with solutions, {company} PYQ',
    headingTemplate: '{company} Previous Year Papers',
  },
  {
    slug: 'practice-questions',
    label: 'Practice questions',
    titleTemplate: '{company} Practice Questions — Topic-Wise Aptitude & Technical | Prephasz',
    descriptionTemplate:
      'Topic-wise {company} practice sets with instant solutions. Drill the exact sections the {company} test scores you on.',
    keywordsTemplate:
      '{company} practice questions, {company} aptitude questions, {company} technical questions, {company} quiz',
    headingTemplate: '{company} Practice Questions',
  },
  {
    slug: 'coding-questions',
    label: 'Coding questions',
    titleTemplate: '{company} Coding Questions {year} — Problems with Solutions | Prephasz',
    descriptionTemplate:
      'Coding problems asked in {company} drives, solvable in-browser in C, C++, Java, Python and JavaScript with real test cases.',
    keywordsTemplate:
      '{company} coding questions, {company} programming questions, {company} coding round, {company} coding test',
    headingTemplate: '{company} Coding Questions',
  },
  {
    slug: 'mock-test',
    label: 'Mock test',
    titleTemplate: '{company} Mock Test {year} — Free Full-Length Online Test | Prephasz',
    descriptionTemplate:
      'Sit a full-length {company} mock test built to the real pattern — same sections, same timing, same marking — and get a sectional score.',
    keywordsTemplate:
      '{company} mock test, {company} online test, {company} free mock test, {company} practice test',
    headingTemplate: '{company} Mock Test',
  },
  {
    slug: 'interview-questions',
    label: 'Interview questions',
    titleTemplate: '{company} Interview Questions & Experiences {year} | Prephasz',
    descriptionTemplate:
      'Technical and HR interview questions from real {company} candidates, with round-by-round experiences and what each interviewer probed.',
    keywordsTemplate:
      '{company} interview questions, {company} interview experience, {company} HR interview, {company} technical interview',
    headingTemplate: '{company} Interview Questions',
  },
  {
    slug: 'study-material',
    label: 'Study material',
    titleTemplate: '{company} Study Material — Notes, Videos & Prep Guide | Prephasz',
    descriptionTemplate:
      'Topic-wise {company} study material: concept videos, notes and worked examples for every section of the {company} test.',
    keywordsTemplate:
      '{company} study material, {company} preparation notes, {company} video lectures, {company} prep guide',
    headingTemplate: '{company} Study Material',
  },
  {
    slug: 'formula-sheet',
    label: 'Formula sheet',
    titleTemplate: '{company} Formula Sheet — Quant & Aptitude Shortcuts | Prephasz',
    descriptionTemplate:
      'Every formula and shortcut worth memorising for the {company} aptitude sections, grouped by topic and ready to revise the night before.',
    keywordsTemplate:
      '{company} formula sheet, {company} aptitude formulas, {company} quant shortcuts, {company} revision notes',
    headingTemplate: '{company} Formula Sheet',
  },
];

/** SEO-module key for one feature — the row an admin edits to retitle every company's page. */
export function companyFeatureSeoKey(slug: string): string {
  return `/company/[slug]/${slug}`;
}

export function findCompanyFeature(slug: string): CompanyFeature | undefined {
  return COMPANY_FEATURES.find((f) => f.slug === slug);
}
