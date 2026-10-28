/**
 * The public, indexable representation of each logged-in student module (/features/<slug>).
 *
 * Shared and byte-identical in both repos (ADR-011): the backend turns each entry into one
 * SEO-module row, the frontend turns each into a page. Drift means a page with no editable
 * metadata, or a row governing nothing.
 *
 * The copy lives HERE rather than in the page because it is content, and content the team
 * replaces should be editable in one file without touching JSX. Every claim below describes
 * a module that exists today — a public page promising a feature the product does not have
 * converts once and churns, and it is the kind of thing nobody notices until a customer does.
 *
 * `appHref` is the in-app destination carried through `?redirect=`, so a visitor who signs up
 * from this page lands on the module it describes instead of the generic dashboard.
 */
export interface ProductFeature {
  slug: string;
  label: string;
  /** Where this module lives once you are signed in. */
  appHref: string;
  title: string;
  description: string;
  keywords: string;
  heading: string;
  /** The lead paragraph under the H1. */
  intro: string;
  /** H3 blocks — what the module actually does. */
  highlights: { title: string; body: string }[];
  /** "How it works", in order. */
  steps: string[];
  /** Rendered as visible Q&A AND as FAQPage structured data — the two must match. */
  faqs: { q: string; a: string }[];
}

export const PRODUCT_FEATURES: ProductFeature[] = [
  {
    slug: 'practice',
    label: 'Practice',
    appHref: '/practice',
    title: 'Placement Practice — Topic-Wise Aptitude, Reasoning & Technical | Prephasz',
    description:
      'Practise placement questions topic by topic with instant solutions. Real previous-year questions from company drives, graded the moment you answer.',
    keywords: 'placement practice, aptitude practice, reasoning questions, technical mcq, topic wise practice',
    heading: 'Placement Practice',
    intro:
      'Work through placement questions the way the tests are built — section by section, topic by topic — and see where you actually stand before a drive, not after it.',
    highlights: [
      { title: 'Real questions, not invented ones', body: 'The bank is built from previous-year papers of companies that hire freshers, so the patterns you drill are the patterns you will sit.' },
      { title: 'Graded on the server', body: 'Every attempt is scored and stored the moment you submit, so your accuracy per topic is a record rather than an estimate.' },
      { title: 'Weak topics surface themselves', body: 'Topic accuracy is tracked across attempts, so the topics costing you marks are visible without you having to go looking.' },
    ],
    steps: [
      'Pick a section, a topic, or a company you are preparing for.',
      'Answer at your own pace — there is no timer in practice mode.',
      'Read the solution for anything you got wrong, immediately.',
      'Come back to the topics your accuracy flags as weak.',
    ],
    faqs: [
      { q: 'Is placement practice free?', a: 'You can create a free account and start practising straight away. Some company-specific banks and full mock assessments need a plan.' },
      { q: 'Are the questions from real placement papers?', a: 'Yes. The bank is built from previous-year questions of actual company drives, grouped by the section that asked them.' },
      { q: 'Do I need to install anything?', a: 'No. Practice runs in the browser on a phone or a laptop.' },
    ],
  },
  {
    slug: 'mock-assessment',
    label: 'Mock assessments',
    appHref: '/mock-assessment',
    title: 'Free Mock Tests for Placements — Timed, Sectional, Company-Pattern | Prephasz',
    description:
      'Sit full-length placement mock tests built to real company patterns — same sections, same timing, same marking — and get a sectional score breakdown.',
    keywords: 'mock test, placement mock test, online test practice, timed mock assessment, company pattern test',
    heading: 'Mock Assessments',
    intro:
      'A mock is only useful if it behaves like the real thing. These are built to the actual company pattern — the same sections, the same minutes, the same marking rules — so your score means something.',
    highlights: [
      { title: 'Built to the real pattern', body: 'Section counts, durations, negative marking and sectional cut-offs follow the company the mock is modelled on.' },
      { title: 'A sectional breakdown, not just a total', body: 'A total hides the round that would have eliminated you. The report splits your score by section.' },
      { title: 'Timed the way the drive is timed', body: 'The clock is the part most students have never rehearsed, and it is the part that decides the outcome.' },
    ],
    steps: [
      'Choose a company pattern or a general full-length mock.',
      'Sit it in one go — the timer runs exactly as it would in the drive.',
      'Submit and get a sectional score with the questions you missed.',
      'Drill the weakest section, then re-sit.',
    ],
    faqs: [
      { q: 'Are the mock tests timed?', a: 'Yes. Each mock runs the same per-section timing as the pattern it is modelled on.' },
      { q: 'Do I get the answers afterwards?', a: 'Yes — a sectional score plus the questions you got wrong, with solutions.' },
      { q: 'Can I re-take a mock?', a: 'Yes. Re-sitting after drilling a weak section is the point.' },
    ],
  },
  {
    slug: 'mock-interview',
    label: 'Mock interviews',
    appHref: '/mock-interview',
    title: 'AI Mock Interview Practice for Placements — HR & Technical | Prephasz',
    description:
      'Practise placement interviews out loud and get scored feedback on your answers, structure and clarity before the real HR and technical rounds.',
    keywords: 'mock interview, ai mock interview, hr interview practice, technical interview practice, interview preparation',
    heading: 'Mock Interviews',
    intro:
      'Most students prepare answers in their head and say them out loud for the first time in the actual interview. This is where you get that first time out of the way.',
    highlights: [
      { title: 'Answer out loud', body: 'The gap between knowing an answer and delivering it is the whole interview, and it only closes with rehearsal.' },
      { title: 'Scored feedback', body: 'Each answer is assessed on substance, structure and clarity, so you get something more actionable than "that was fine".' },
      { title: 'HR and technical', body: 'Both round types, because candidates who clear the technical still get cut in the HR round.' },
    ],
    steps: [
      'Pick a round type — HR or technical — and a role.',
      'Answer the questions as you would in the interview.',
      'Read the per-answer feedback and the overall assessment.',
      'Re-run the round and compare.',
    ],
    faqs: [
      { q: 'Do I need a webcam?', a: 'A microphone is enough to practise answering out loud.' },
      { q: 'Are the questions role-specific?', a: 'Yes — questions follow the round type and role you select.' },
      { q: 'How is the feedback produced?', a: 'Answers are assessed on substance, structure and clarity, and scored per answer as well as overall.' },
    ],
  },
  {
    slug: 'resume-builder',
    label: 'Resume builder',
    appHref: '/resume',
    title: 'Free Resume Builder for Freshers — ATS-Friendly Templates | Prephasz',
    description:
      'Build a fresher placement resume that gets past screening: structured sections, ATS-friendly templates and a clean one-page PDF.',
    keywords: 'resume builder, fresher resume, ats resume, placement resume, cv maker for students',
    heading: 'Resume Builder',
    intro:
      'A fresher resume is rejected by a parser long before a recruiter reads it. This builds one with the structure screening software expects, and a layout a human will still want to read.',
    highlights: [
      { title: 'Structured, not free-form', body: 'Education, projects, skills, internships and positions of responsibility each have their own section, so nothing important ends up in a paragraph nobody reads.' },
      { title: 'Templates that parse', body: 'Clean single-column layouts — the kind applicant tracking systems read correctly.' },
      { title: 'One page, exported as PDF', body: 'A fresher resume that runs to two pages is read as one page plus padding.' },
    ],
    steps: [
      'Fill in each section — the builder prompts for what recruiters look for.',
      'Pick a template.',
      'Preview it as the recruiter will see it.',
      'Export the PDF and attach it to applications.',
    ],
    faqs: [
      { q: 'Is the resume builder free?', a: 'You can build and preview a resume with a free account.' },
      { q: 'Will it pass an ATS?', a: 'The templates are single-column with standard section headings, which is what parsers read most reliably.' },
      { q: 'Can I edit it later?', a: 'Yes — your resume is saved to your account and can be edited and re-exported any time.' },
    ],
  },
  {
    slug: 'placement-readiness',
    label: 'Placement readiness',
    appHref: '/placement-readiness',
    title: 'Placement Readiness Score — Know If You Are Drive-Ready | Prephasz',
    description:
      'A single readiness score across aptitude, technical, coding and communication, built from your real attempts — so you know what to fix before the drive.',
    keywords: 'placement readiness, placement readiness score, am i ready for placements, campus placement preparation tracker',
    heading: 'Placement Readiness',
    intro:
      '"Am I ready?" is the question every student asks and almost nobody can answer. This answers it from your actual attempts rather than from how much you have studied.',
    highlights: [
      { title: 'Built from attempts, not self-assessment', body: 'The score moves on what you scored, not on what you marked complete.' },
      { title: 'Broken down by skill', body: 'Aptitude, technical, coding and communication each carry their own score, because a strong total can hide one round that will eliminate you.' },
      { title: 'Tracked over time', body: 'The trend matters more than the number — it tells you whether your preparation is working.' },
    ],
    steps: [
      'Sit the calibration assessment so the score starts from real data.',
      'Keep practising and sitting mocks — the score updates as you go.',
      'Read the per-skill breakdown to see which round is your weakest.',
      'Drill that, and watch the trend.',
    ],
    faqs: [
      { q: 'How is the readiness score calculated?', a: 'From your real attempts across aptitude, technical, coding and communication — not from completion or time spent.' },
      { q: 'Does it change as I practise?', a: 'Yes. It updates as you complete practice sets and mocks, and the trend is tracked over time.' },
      { q: 'Can my college see it?', a: 'Placement cells see cohort-level readiness for the students they are responsible for.' },
    ],
  },
  {
    slug: 'study-plan',
    label: 'Study plan',
    appHref: '/study-plan',
    title: 'Personalised Placement Study Plan — Week by Week | Prephasz',
    description:
      'A placement study plan built around the topics you are actually weak at, scheduled week by week up to your drive.',
    keywords: 'placement study plan, preparation schedule, study timetable for placements, placement preparation plan',
    heading: 'Study Plan',
    intro:
      'A generic syllabus tells you everything you could study. A plan tells you what to study on Tuesday. This builds the second one, from where you actually are.',
    highlights: [
      { title: 'Starts from a calibration', body: 'The plan is built after an assessment that establishes your real starting point, so it does not send you back through what you already know.' },
      { title: 'Weighted to your weak topics', body: 'Time goes where your accuracy is lowest, which is rarely where motivation sends it.' },
      { title: 'Scheduled, not listed', body: 'Topics are placed on days, so "I will do reasoning this week" becomes something you can actually follow.' },
    ],
    steps: [
      'Sit the calibration assessment.',
      'Get a plan weighted to your weakest topics.',
      'Work through it day by day.',
      'Re-calibrate as your accuracy improves.',
    ],
    faqs: [
      { q: 'Do I need to take a test first?', a: 'Yes — a calibration assessment is what makes the plan yours rather than generic.' },
      { q: 'Can I change the plan?', a: 'The plan re-weights as your topic accuracy changes, and you can re-calibrate at any point.' },
      { q: 'How long is a plan?', a: 'It is scheduled against the time you have before your drive.' },
    ],
  },
  {
    slug: 'live-sessions',
    label: 'Live sessions',
    appHref: '/live-sessions',
    title: 'Live Placement Classes & Company Masterclasses | Prephasz',
    description:
      'Live classes and company masterclasses on aptitude shortcuts, coding patterns and interview rounds, with recordings you can re-watch.',
    keywords: 'live classes, placement classes, company masterclass, online placement training, recorded sessions',
    heading: 'Live Sessions',
    intro:
      'Some things are faster to be shown than to read — a shortcut, a coding pattern, how an interviewer actually probes an answer. Those are what the live sessions are for.',
    highlights: [
      { title: 'Company masterclasses', body: 'Sessions built around one recruiter\'s process, from the test pattern through to the interview rounds.' },
      { title: 'Ask while it is live', body: 'The question you have at the moment you are stuck is the one worth answering.' },
      { title: 'Recordings stay available', body: 'Miss one, or want it again before a drive — the recording is there.' },
    ],
    steps: [
      'Browse the upcoming schedule.',
      'Join the session from your account — nothing to install.',
      'Ask questions while it runs.',
      'Re-watch the recording before your drive.',
    ],
    faqs: [
      { q: 'Are sessions recorded?', a: 'Yes — recordings stay available in your account afterwards.' },
      { q: 'Do I need to install anything?', a: 'No. Sessions run in the browser.' },
      { q: 'Are they included in a plan?', a: 'Session access depends on your plan; the schedule shows what is open to you.' },
    ],
  },
  {
    slug: 'leaderboard',
    label: 'Leaderboard',
    appHref: '/leaderboard',
    title: 'Placement Prep Leaderboard — Top Performers & Rankings | Prephasz',
    description:
      'See where you rank against students preparing for the same drives, across practice, mocks and coding.',
    keywords: 'leaderboard, student ranking, top performers, coding leaderboard, placement ranking',
    heading: 'Leaderboard',
    intro:
      'Preparation done alone has no scale to it. The leaderboard supplies one: where you stand against students sitting the same drives.',
    highlights: [
      { title: 'Earned, not awarded', body: 'Rank comes from practice, mocks and coding attempts — from work, not from logging in.' },
      { title: 'Streaks count', body: 'Consistency beats intensity over a placement season, and the ranking reflects that.' },
      { title: 'Visible to placement cells', body: 'Colleges see cohort performance, which is how the ranking turns into something more than a number.' },
    ],
    steps: [
      'Practise and sit mocks — every scored attempt counts.',
      'Keep a streak going.',
      'Check where you sit against your cohort.',
    ],
    faqs: [
      { q: 'How do I climb the leaderboard?', a: 'Through scored attempts — practice sets, mocks and coding problems — and by keeping a streak.' },
      { q: 'Is the leaderboard public?', a: 'Rankings are visible to students on the platform; placement cells see their own cohorts.' },
      { q: 'Does it reset?', a: 'Rankings track the current preparation period.' },
    ],
  },
  {
    slug: 'coding-practice',
    label: 'Coding practice',
    appHref: '/coding',
    title: 'Coding Practice for Placements — Problems with Real Test Cases | Prephasz',
    description:
      'Solve placement coding problems in-browser in C, C++, Java, Python or JavaScript, graded against real test cases.',
    keywords: 'coding practice, dsa practice, placement coding questions, online compiler, coding round preparation',
    heading: 'Coding Practice',
    intro:
      'The coding round is where most placement funnels narrow hardest. These are the problems companies actually set, run against real test cases in the browser.',
    highlights: [
      { title: 'Five languages, in the browser', body: 'C, C++, Java, Python and JavaScript, with nothing to install.' },
      { title: 'Graded on real test cases', body: 'Including the edge cases that fail a solution which looked correct.' },
      { title: 'Organised by pattern and company', body: 'Because coding rounds repeat patterns, and the pattern is the transferable part.' },
    ],
    steps: [
      'Pick a topic, a pattern, or a company.',
      'Write your solution in the in-browser editor.',
      'Run it against the test cases.',
      'Read the editorial for anything you could not finish.',
    ],
    faqs: [
      { q: 'Which languages are supported?', a: 'C, C++, Java, Python and JavaScript.' },
      { q: 'Do I need to install a compiler?', a: 'No — code runs in the browser against real test cases.' },
      { q: 'Are problems company-specific?', a: 'Problems are organised by topic and pattern, and also grouped by the companies that have set them.' },
    ],
  },
  {
    slug: 'performance',
    label: 'Performance',
    appHref: '/performance',
    title: 'Placement Preparation Analytics — Track Your Progress | Prephasz',
    description:
      'Accuracy by topic, score trends across mocks and time spent per section — the evidence of whether your preparation is working.',
    keywords: 'performance analytics, preparation tracking, topic accuracy, score trends, placement progress',
    heading: 'Performance',
    intro:
      'Hours studied is not progress. Accuracy going up on the topics you were weakest at is. This is where that is visible.',
    highlights: [
      { title: 'Accuracy per topic', body: 'Down to the topic, so improvement is attributable to something specific.' },
      { title: 'Score trends across mocks', body: 'One mock is a data point; the trend across several is the signal.' },
      { title: 'Where your time goes', body: 'Time per section against accuracy per section — the mismatch is usually the finding.' },
    ],
    steps: [
      'Practise and sit mocks.',
      'Open performance to see accuracy by topic and your score trend.',
      'Find the topic with the worst accuracy-to-time ratio.',
      'Fix that one.',
    ],
    faqs: [
      { q: 'What does performance track?', a: 'Accuracy by topic, score trends across mocks, and time spent per section.' },
      { q: 'Is my data private?', a: 'Your detailed performance is yours; placement cells see cohort-level summaries for their own students.' },
      { q: 'How often does it update?', a: 'After every scored attempt.' },
    ],
  },
  {
    slug: 'community',
    label: 'Community',
    appHref: '/community',
    title: 'Placement Preparation Community — Ask, Share, Compare | Prephasz',
    description:
      'Ask questions, share interview experiences and compare notes with students preparing for the same companies.',
    keywords: 'placement community, interview experience, student forum, placement discussion, ask doubts',
    heading: 'Community',
    intro:
      'The most useful thing about a drive is usually what someone who sat it last week can tell you. That is what the community is for.',
    highlights: [
      { title: 'Interview experiences, first-hand', body: 'Round by round, from candidates who actually sat them.' },
      { title: 'Doubts answered', body: 'By students working the same problems and by the team.' },
      { title: 'Company-specific threads', body: 'So what you read is about the drive you are preparing for.' },
    ],
    steps: [
      'Find the company or topic thread.',
      'Read what candidates reported.',
      'Ask anything still unclear.',
      'Post your own experience after your drive.',
    ],
    faqs: [
      { q: 'Who can post?', a: 'Any student with an account.' },
      { q: 'Are interview experiences verified?', a: 'They are first-hand accounts from candidates, moderated for quality.' },
      { q: 'Can I ask about a specific company?', a: 'Yes — threads are organised by company and topic.' },
    ],
  },
];

export function productFeatureSeoKey(slug: string): string {
  return `/features/${slug}`;
}

export function findProductFeature(slug: string): ProductFeature | undefined {
  return PRODUCT_FEATURES.find((f) => f.slug === slug);
}
