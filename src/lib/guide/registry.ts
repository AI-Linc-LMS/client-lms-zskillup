import type { GuideStep, GuideTour } from './types';

/**
 * The platform-guide script. Data-driven so the tour is easy to tune.
 *
 * `target` values are `data-tour` attributes placed on real elements:
 *   nav:<href>      — a sidebar nav item (added generically in Sidebar.tsx)
 *   chrome:<name>   — a persistent top-bar control
 *   <mod>:<key>     — an in-page sub-section (e.g. dash:performance, perf:focus-areas)
 *
 * The GRAND tour shows the chrome, walks every sidebar module ("where is
 * everything"), then drills the dashboard's own sections ("what's inside"). Each
 * route also has a mini-tour (PAGE_TOURS) launchable from the "?" menu on that page.
 * Sidebar/search steps are desktopOnly — filtered out on small screens.
 */

export const GRAND_TOUR_ID = 'grand';

const nav = (href: string) => `nav:${href}`;

const GRAND_STEPS: GuideStep[] = [
  {
    id: 'welcome',
    placement: 'center',
    title: 'Welcome to ZSkillup \u{1F44B}',
    body: "Let's take a quick tour of the platform \u2014 where everything lives and what each part does. You can skip or replay anytime.",
  },
  // \u2500\u2500 Chrome \u2500\u2500
  { id: 'chrome-search', target: 'chrome:search', placement: 'bottom', desktopOnly: true, eyebrow: 'Quick access', title: 'Search anything', body: 'Jump to any page, company, or topic instantly \u2014 hit \u2318K from anywhere.' },
  { id: 'chrome-streak', target: 'chrome:streak', placement: 'bottom', eyebrow: 'Momentum', title: 'Your streak & XP', body: 'Practice daily to keep your streak alive and climb levels \u2014 it powers the leaderboard.' },
  { id: 'chrome-notifications', target: 'chrome:notifications', placement: 'bottom', eyebrow: 'Stay in the loop', title: 'Notifications', body: 'Assessment invites, results, live sessions and reminders land here.' },
  { id: 'chrome-account', target: 'chrome:account', placement: 'bottom', eyebrow: 'Your account', title: 'Profile & settings', body: 'Open your profile, switch settings, and sign out from your avatar menu.' },
  // \u2500\u2500 Sidebar walk (where every module lives) \u2500\u2500
  { id: 'nav-dashboard', route: '/dashboard', target: nav('/dashboard'), placement: 'right', desktopOnly: true, eyebrow: 'Workspace', title: 'Dashboard \u2014 your home base', body: 'Your personalized hub: recommendations, readiness, daily challenges and quick practice, all in one place.' },
  { id: 'nav-study-plan', target: nav('/study-plan'), placement: 'right', desktopOnly: true, eyebrow: 'Workspace', title: 'Study Plan', body: 'Your fixed 90-day placement roadmap, built from your calibration result — one day unlocks at a time.' },
  { id: 'nav-performance', target: nav('/performance'), placement: 'right', desktopOnly: true, eyebrow: 'Workspace', title: 'Performance', body: 'Track accuracy, strengths and \u2014 at the bottom \u2014 your focus areas to work on next.' },
  { id: 'nav-leaderboard', target: nav('/leaderboard'), placement: 'right', desktopOnly: true, eyebrow: 'Workspace', title: 'Leaderboard', body: 'See how you rank against peers on XP. Friendly competition that keeps you sharp.' },
  { id: 'nav-community', target: nav('/community'), placement: 'right', desktopOnly: true, eyebrow: 'Workspace', title: 'Community', body: 'Ask questions, share tips and discuss problems with other students.' },
  { id: 'nav-live-sessions', target: nav('/live-sessions'), placement: 'right', desktopOnly: true, eyebrow: 'Workspace', title: 'Live Sessions', body: 'Join scheduled live classes and webinars \u2014 links appear here when they go live.' },
  { id: 'nav-practice', target: nav('/practice'), placement: 'right', desktopOnly: true, eyebrow: 'Practice', title: 'Practice', body: 'Sharpen skills with targeted question sets by topic and company. Unlocks after your calibration.' },
  { id: 'nav-practice-wish', target: nav('/practice-wish'), placement: 'right', desktopOnly: true, eyebrow: 'Practice', title: 'Practice as Wish', body: 'Build your own custom practice set \u2014 pick topics, difficulty and length exactly as you want.' },
  { id: 'nav-mock-assessment', target: nav('/mock-assessment'), placement: 'right', desktopOnly: true, eyebrow: 'Assessment', title: 'Mock Assessment', body: 'Full-length, timed practice tests that mirror real placement exams \u2014 with detailed reports.' },
  { id: 'nav-assessments', target: nav('/assessments'), placement: 'right', desktopOnly: true, eyebrow: 'Assessment', title: 'Assessments', body: 'Official assessments scheduled by your college or the platform show up here.' },
  { id: 'nav-resume', target: nav('/resume-builder'), placement: 'right', desktopOnly: true, eyebrow: 'Career', title: 'Resume Builder', body: 'Craft an ATS-friendly resume from proven templates \u2014 and tailor it to any job with AI.' },
  { id: 'nav-mock-interview', target: nav('/mock-interview'), placement: 'right', desktopOnly: true, eyebrow: 'Career', title: 'Mock Interview', body: 'Practice a realistic AI-driven interview and get instant feedback on your answers.' },
  { id: 'nav-certificates', target: nav('/certificates'), placement: 'right', desktopOnly: true, eyebrow: 'Career', title: 'Certificates', body: 'Earn shareable, verifiable certificates as you hit XP milestones \u2014 download them as PDFs for your applications.' },
  { id: 'nav-company', target: nav('/dashboard/company'), placement: 'right', desktopOnly: true, eyebrow: 'Explore', title: 'Company Hubs', body: 'Company-specific prep \u2014 past questions, patterns and your readiness for each target company.' },
  { id: 'nav-shop', target: nav('/shop'), placement: 'right', desktopOnly: true, eyebrow: 'Plans', title: 'Explore Plans', body: 'Go all-access with Full Platform, or build your own plan from the companies, sections and topics you need.' },
  { id: 'nav-upgrade', target: nav('/upgrade'), placement: 'right', desktopOnly: true, eyebrow: 'Plans', title: 'Upgrade & Renew', body: 'Manage your membership \u2014 see what you own, renew before it lapses, or add more access.' },
  { id: 'nav-support', target: nav('/support'), placement: 'right', desktopOnly: true, eyebrow: 'Explore', title: 'Help & Support', body: "Stuck on anything? Raise a ticket here and we'll help you out." },
  // ── Dashboard drill (what's inside your home base) ──
  { id: "dash-briefing-hero", route: "/dashboard", target: "dash:briefing-hero", placement: "auto", eyebrow: "Dashboard", title: "Your AI briefing", body: "A personalized AI greeting over the aurora hero shows your level, XP, streak, focus areas, and a one-tap next action." },
  { id: "dash-stats", route: "/dashboard", target: "dash:stats", placement: "auto", eyebrow: "Dashboard", title: "Your stats", body: "Five animated tiles count up your Level, Total XP, day streak, coins, and badges — your live progress at a glance." },
  { id: "dash-readiness", route: "/dashboard", target: "dash:readiness", placement: "auto", eyebrow: "Dashboard", title: "Placement readiness", body: "A big readiness gauge blends your practice, mocks, coding and coverage, then breaks it down per company and per topic." },
  { id: "dash-performance", route: "/dashboard", target: "dash:performance", placement: "auto", eyebrow: "Dashboard", title: "Performance vs participation", body: "A quadrant chart plots your accuracy against your effort as an orange dot among peers, with a verdict and a nudge." },
  { id: "dash-daily-quest", route: "/dashboard", target: "dash:daily-quest", placement: "auto", eyebrow: "Dashboard", title: "Today's focus", body: "Today's focus quest hands you one targeted task — a topic drill or mock — to keep your streak alive and earn XP." },
  { id: "dash-companies", route: "/dashboard", target: "dash:companies", placement: "auto", eyebrow: "Dashboard", title: "Company drives", body: "Browse target company drives and register for one in a single tap, or open All companies for the full list." },
  {
    id: 'outro',
    route: '/dashboard',
    placement: 'center',
    title: "You're all set \u{1F389}",
    body: 'That\u2019s the tour! Replay it anytime from the \u201C?\u201D help button in the top bar. Next up: take your calibration to personalize everything.',
  },
];

const GRAND_TOUR: GuideTour = { id: GRAND_TOUR_ID, label: 'Platform tour', steps: GRAND_STEPS };

/** Per-route mini-tours. Keyed by route; longest-prefix match resolves dynamics. */
export const PAGE_TOURS: Record<string, GuideTour> = {
  "/study-plan": { id: "plan", label: "Study Plan tour", steps: [
    { id: "plan-hero", route: "/study-plan", target: "plan:hero", placement: "auto", eyebrow: "Study Plan", title: "Your 90-day roadmap", body: "Built once from your calibration result — a fixed, day-by-day path to placement-ready that front-loads your weak areas. The ring shows how far you've come." },
    { id: "plan-today", route: "/study-plan", target: "plan:today", placement: "auto", eyebrow: "Study Plan", title: "Today's focus", body: "Just today's few tasks — practice, timed quizzes, mocks or coding. They tick off automatically when you finish the linked activity, or check them yourself." },
    { id: "plan-roadmap", route: "/study-plan", target: "plan:roadmap", placement: "auto", eyebrow: "Study Plan", title: "The road ahead", body: "All 90 days across three phases. Completed days fill in, today pulses, and future days unlock one at a time — tomorrow's unlocks tomorrow." },
  ] },
  "/practice": { id: "practice", label: "Practice tour", steps: [
    { id: "practice-hero", route: "/practice", target: "practice:hero", placement: "auto", eyebrow: "Practice", title: "Adaptive practice, your way", body: "Your practice home: it explains adaptive, non-proctored drilling and shows how many sections and topics are available to you." },
    { id: "practice-search", route: "/practice", target: "practice:search", placement: "auto", eyebrow: "Practice", title: "Search everything", body: "Type here to instantly filter companies, sections, and topics so you can jump straight to what you want to practise." },
    { id: "practice-by-company", route: "/practice", target: "practice:by-company", placement: "auto", eyebrow: "Practice", title: "By company", body: "Practise in a specific company's question style — tap a company chip to launch adaptive practice tuned to their pattern." },
    { id: "practice-by-section", route: "/practice", target: "practice:by-section", placement: "auto", eyebrow: "Practice", title: "By section or topic", body: "Practise a whole section or a single topic: use 'Practice whole section' or tap a topic chip; Coding links out separately." },
    { id: "practice-weak-topics", route: "/practice", target: "practice:weak-topics", placement: "auto", eyebrow: "Practice", title: "Your weak topics", body: "After you attempt questions, your weakest topics surface here with live accuracy so you know exactly where to focus." },
  ] },
  "/practice-wish": { id: "aswish", label: "Practice as Wish tour", steps: [
    { id: "aswish-hero", route: "/practice-wish", target: "aswish:hero", placement: "auto", eyebrow: "Practice as Wish", title: "Practice anything", body: "A purple banner introduces the mode: practice any topic, any amount, with adaptive questions that never run out." },
    { id: "aswish-topic-search", route: "/practice-wish", target: "aswish:topic-search", placement: "auto", eyebrow: "Practice as Wish", title: "Search a topic", body: "Type any topic here and hit Start practicing; no exact match just means we craft fresh AI questions for you." },
    { id: "aswish-coding", route: "/practice-wish", target: "aswish:coding", placement: "auto", eyebrow: "Practice as Wish", title: "Coding practice", body: "Jump into Judge0-evaluated DSA problems: pick a coding-topic chip or hit 'Practice all coding' to open the coding page." },
    { id: "aswish-browse-bank", route: "/practice-wish", target: "aswish:browse-bank", placement: "auto", eyebrow: "Practice as Wish", title: "Browse the bank", body: "Expand each section to reveal every topic, then click any chip to launch an instant adaptive session on it." },
  ] },
  "/mock-assessment": { id: "mock", label: "Mock Assessment tour", steps: [
    { id: "mock-hero", route: "/mock-assessment", target: "mock:hero", placement: "auto", eyebrow: "Mock Assessment", title: "How mocks work", body: "A quick intro banner: your custom mocks are camera-proctored, server-timed, and unlimited — the same experience as a real placement drive." },
    { id: "mock-pick-scope", route: "/mock-assessment", target: "mock:pick-scope", placement: "auto", eyebrow: "Mock Assessment", title: "Pick sections & topics", body: "Tap whole sections or individual topics to decide exactly what your mock covers across aptitude, reasoning, verbal and more." },
    { id: "mock-coding-topics", route: "/mock-assessment", target: "mock:coding-topics", placement: "auto", eyebrow: "Mock Assessment", title: "Add coding (optional)", body: "Optionally add coding problems by picking one or more coding topics to mix into your mock alongside the MCQs." },
    { id: "mock-config", route: "/mock-assessment", target: "mock:config", placement: "auto", eyebrow: "Mock Assessment", title: "Size, duration & start", body: "Set how many questions, the duration, and coding count, then hit Start mock assessment to launch the proctored test." },
    { id: "mock-history", route: "/mock-assessment", target: "mock:history", placement: "auto", eyebrow: "Mock Assessment", title: "Your past attempts", body: "Review every past mock: tests taken, average score, best percentile, plus each attempt's result card linking to its full report." },
  ] },
  "/assessments": { id: "assess", label: "Assessments tour", steps: [
    { id: "assess-hero", route: "/assessments", target: "assess:hero", placement: "auto", eyebrow: "Assessments", title: "Your drives at a glance", body: "A live snapshot: your next drive countdown, how many assessments are upcoming, and how many need a webcam for proctoring." },
    { id: "assess-upcoming", route: "/assessments", target: "assess:upcoming", placement: "auto", eyebrow: "Assessments", title: "Upcoming drives", body: "Cards for each upcoming or live drive — start a live assessment, view the company hub, or open its leaderboard once ended." },
    { id: "assess-calendar", route: "/assessments", target: "assess:calendar", placement: "auto", eyebrow: "Assessments", title: "Month calendar", body: "Browse your drives by month; tap any highlighted day to filter the timeline to the assessments scheduled then." },
    { id: "assess-history", route: "/assessments", target: "assess:history", placement: "auto", eyebrow: "Assessments", title: "Past assessments", body: "Your finished assessment attempts with scores and dates; each row deep-links to its full saved report." },
    { id: "assess-ranking", route: "/assessments", target: "assess:ranking", placement: "auto", eyebrow: "Assessments", title: "Your ranking", body: "See where you rank against other students on the assessment leaderboard." },
  ] },
  "/mock-interview": { id: "mi", label: "Mock Interview tour", steps: [
    { id: "mi-hero", route: "/mock-interview", target: "mi:hero", placement: "auto", eyebrow: "Mock Interview", title: "What is AI Mock Interview", body: "Your intro: pick a topic and difficulty, then hold a real adaptive conversation with an AI interviewer. It runs fullscreen and counts tab switches, like the real thing — but there's no camera." },
    { id: "mi-stats", route: "/mock-interview", target: "mi:stats", placement: "auto", eyebrow: "Mock Interview", title: "Your interview stats", body: "Track your totals here: interviews started, how many you completed, and your average rubric score across all scored sessions." },
    { id: "mi-tabs", route: "/mock-interview", target: "mi:tabs", placement: "auto", eyebrow: "Mock Interview", title: "New vs previous", body: "Switch between starting a fresh interview and reviewing your previous sessions, where you can resume, open results, or delete them." },
    { id: "mi-focus", route: "/mock-interview", target: "mi:focus", placement: "auto", eyebrow: "Mock Interview", title: "Pick a topic or role", body: "Choose what to be interviewed on: toggle By topic or By job role, then pick a preset chip or add your own custom topic." },
    { id: "mi-style", route: "/mock-interview", target: "mi:style", placement: "auto", eyebrow: "Mock Interview", title: "Tune style, difficulty & length", body: "Set the interview style (mixed, technical, behavioral); difficulty and length controls sit right below to shape depth and pacing." },
    { id: "mi-start", route: "/mock-interview", target: "mi:start", placement: "auto", eyebrow: "Mock Interview", title: "Start the interview", body: "Review your setup summary and hit Start interview — it's spoken, so a mic is recommended before you begin." },
  ] },
  "/dashboard": { id: "dash", label: "Dashboard tour", steps: [
    { id: "dash-briefing-hero", route: "/dashboard", target: "dash:briefing-hero", placement: "auto", eyebrow: "Dashboard", title: "Your AI briefing", body: "A personalized AI greeting over the aurora hero shows your level, XP, streak, focus areas, and a one-tap next action." },
    { id: "dash-stats", route: "/dashboard", target: "dash:stats", placement: "auto", eyebrow: "Dashboard", title: "Your stats", body: "Five animated tiles count up your Level, Total XP, day streak, coins, and badges — your live progress at a glance." },
    { id: "dash-readiness", route: "/dashboard", target: "dash:readiness", placement: "auto", eyebrow: "Dashboard", title: "Placement readiness", body: "A big readiness gauge blends your practice, mocks, coding and coverage, then breaks it down per company and per topic." },
    { id: "dash-performance", route: "/dashboard", target: "dash:performance", placement: "auto", eyebrow: "Dashboard", title: "Performance vs participation", body: "A quadrant chart plots your accuracy against your effort as an orange dot among peers, with a verdict and a nudge." },
    { id: "dash-daily-quest", route: "/dashboard", target: "dash:daily-quest", placement: "auto", eyebrow: "Dashboard", title: "Today's focus", body: "Today's focus quest hands you one targeted task — a topic drill or mock — to keep your streak alive and earn XP." },
    { id: "dash-companies", route: "/dashboard", target: "dash:companies", placement: "auto", eyebrow: "Dashboard", title: "Company drives", body: "Browse target company drives and register for one in a single tap, or open All companies for the full list." },
  ] },
  "/performance": { id: "perf", label: "Performance tour", steps: [
    { id: "perf-readiness-hero", route: "/performance", target: "perf:readiness-hero", placement: "auto", eyebrow: "Performance", title: "Placement readiness", body: "Your overall placement-readiness score front and center, split into Practice, Mock, Coding and Coverage bars; tap the info icon for the formula." },
    { id: "perf-company-readiness", route: "/performance", target: "perf:company-readiness", placement: "auto", eyebrow: "Performance", title: "Company readiness", body: "One card per target company shows how ready you are for each, with logo, score, level and questions attempted." },
    { id: "perf-topic-mastery", route: "/performance", target: "perf:topic-mastery", placement: "auto", eyebrow: "Performance", title: "Topic mastery", body: "A heatmap of your top topics — each chip shows accuracy and attempts, so you spot strong and weak areas fast." },
    { id: "perf-practice-accuracy", route: "/performance", target: "perf:practice-accuracy", placement: "auto", eyebrow: "Performance", title: "Practice accuracy", body: "Your practice accuracy ring plus key stats — correct, attempted, average time per question and mocks taken." },
    { id: "perf-score-trend", route: "/performance", target: "perf:score-trend", placement: "auto", eyebrow: "Performance", title: "Score trend", body: "A bar chart of your last fourteen mock and assessment scores, with your best and average called out above." },
    { id: "perf-focus-areas", route: "/performance", target: "perf:focus-areas", placement: "auto", eyebrow: "Performance", title: "Focus areas", body: "Topics scoring under 60% appear as tappable chips — click any to jump straight into an adaptive drill and lift your readiness." },
  ] },
  "/leaderboard": { id: "lb", label: "Leaderboard tour", steps: [
    { id: "lb-rank-hero", route: "/leaderboard", target: "lb:rank-hero", placement: "auto", eyebrow: "Leaderboard", title: "Your rank card", body: "See your current rank, what percentile you're in, exactly how much XP separates you from the next spot, and the weekly reset timer." },
    { id: "lb-scope-tabs", route: "/leaderboard", target: "lb:scope-tabs", placement: "auto", eyebrow: "Leaderboard", title: "Choose your league", body: "Switch the leaderboard between National, My College, Company, and City. Company and City reveal a dropdown to pick which one." },
    { id: "lb-podium", route: "/leaderboard", target: "lb:podium", placement: "auto", eyebrow: "Leaderboard", title: "Top 3 podium", body: "The three highest-XP learners in this league, shown on a gold/silver/bronze podium with avatars, colleges, and totals." },
    { id: "lb-you-card", route: "/leaderboard", target: "lb:you-card", placement: "auto", eyebrow: "Leaderboard", title: "Your highlighted row", body: "Your own row pulled out and highlighted, showing your XP, level, current streak, and how far you are from the next rank." },
    { id: "lb-table", route: "/leaderboard", target: "lb:table", placement: "auto", eyebrow: "Leaderboard", title: "Full rankings table", body: "Browse every ranked learner with rank, college, level, XP, streak, and weekly trend; tap View Full Leaderboard to expand." },
  ] },
  "/community": { id: "community", label: "Community tour", steps: [
    { id: "community-new-post", route: "/community", target: "community:new-post", placement: "auto", eyebrow: "Community", title: "Start a post", body: "Tap New post (or the prompt bar below it) to open the composer and ask a question, share a resource, or start a discussion." },
    { id: "community-filters", route: "/community", target: "community:filters", placement: "auto", eyebrow: "Community", title: "Filter & search", body: "Filter the feed by post type using the tabs, search posts by keyword, and toggle between Recent and Top sorting." },
    { id: "community-feed", route: "/community", target: "community:feed", placement: "auto", eyebrow: "Community", title: "The post feed", body: "Browse posts here — open any card to read the full thread, like helpful ones, and reply. Use Load more for older posts." },
    { id: "community-stats", route: "/community", target: "community:stats", placement: "auto", eyebrow: "Community", title: "Community pulse", body: "This right-rail panel shows live totals — posts, replies, and members — so you can gauge how active the community is." },
    { id: "community-tags", route: "/community", target: "community:tags", placement: "auto", eyebrow: "Community", title: "Popular tags", body: "Click a popular tag to filter the feed to that topic; the active tag highlights in orange and can be cleared anytime." },
  ] },
  "/live-sessions": { id: "live", label: "Live Sessions tour", steps: [
    { id: "live-intro", route: "/live-sessions", target: "live:intro", placement: "auto", eyebrow: "Live Sessions", title: "Live Sessions overview", body: "This is your live hub — masterclasses and webinars scheduled for you, with everything joinable directly from this page." },
    { id: "live-upcoming", route: "/live-sessions", target: "live:upcoming", placement: "auto", eyebrow: "Live Sessions", title: "Upcoming sessions", body: "Sessions coming up appear here as cards showing when they start and how long they run — check back before each one." },
    { id: "live-session-card", route: "/live-sessions", target: "live:session-card", placement: "auto", eyebrow: "Live Sessions", title: "Join a session", body: "Each card shows the status, audience, time and duration; hit Join (or Join now when it's live) to open the meeting." },
    { id: "live-past", route: "/live-sessions", target: "live:past", placement: "auto", eyebrow: "Live Sessions", title: "Past sessions & recordings", body: "Missed one or want a rewatch? Ended sessions land here, and where available you can watch the recording." },
  ] },
  "/resume-builder": { id: "resume", label: "Resume Builder tour", steps: [
    { id: "resume-ats", route: "/resume-builder", target: "resume:ats", placement: "auto", eyebrow: "Resume Builder", title: "Live ATS score", body: "Tap to open your ATS breakdown — see your score, section-by-section checks, and concrete fixes that make your resume more recruiter-friendly." },
    { id: "resume-save-export", route: "/resume-builder", target: "resume:save-export", placement: "auto", eyebrow: "Resume Builder", title: "Save & export PDF", body: "Save your resume to My Resumes, reopen saved versions from the drawer, and export a print-ready PDF in one click." },
    { id: "resume-templates", route: "/resume-builder", target: "resume:templates", placement: "auto", eyebrow: "Resume Builder", title: "Choose a template", body: "Switch between 12 designs — your live preview restyles instantly, so pick the look that fits the role you're targeting." },
    { id: "resume-starters", route: "/resume-builder", target: "resume:starters", placement: "auto", eyebrow: "Resume Builder", title: "Quick-start options", body: "Prefill from your student profile, load a sample to explore the layout, or clear everything to start fresh." },
    { id: "resume-editor", route: "/resume-builder", target: "resume:editor", placement: "auto", eyebrow: "Resume Builder", title: "Fill in your resume", body: "Fill collapsible sections — basics, experience, education, skills, projects — each with an AI tailor button on the key ones." },
    { id: "resume-preview", route: "/resume-builder", target: "resume:preview", placement: "auto", eyebrow: "Resume Builder", title: "Live preview", body: "Watch your resume update live as you type — this A4 page is exactly what your exported PDF will look like." },
  ] },
  "/dashboard/company": { id: "company", label: "Company Hubs tour", steps: [
    { id: "company-hero", route: "/dashboard/company", target: "company:hero", placement: "auto", eyebrow: "Company Hubs", title: "Pick your target company", body: "The header frames the module and shows live counts of recruiting companies and practice topics currently in the catalog." },
    { id: "company-filters", route: "/dashboard/company", target: "company:filters", placement: "auto", eyebrow: "Company Hubs", title: "Filter by company type", body: "Segmented tabs let you narrow hubs to All, Service, Product, or Consulting; a live counter shows how many match." },
    { id: "company-grid", route: "/dashboard/company", target: "company:grid", placement: "auto", eyebrow: "Company Hubs", title: "Company hubs grid", body: "Every recruiter appears as a card here; click any to open its full prep track. Filters instantly reshuffle this grid." },
    { id: "company-card", route: "/dashboard/company", target: "company:card", placement: "auto", eyebrow: "Company Hubs", title: "Inside a company card", body: "Each card shows the logo, difficulty, round count, and 'what's inside' chips (Practice Qs, Previous-year, Coding); 'Prepare now' opens the hub." },
  ] },
  "/shop": { id: "shop", label: "Explore Plans tour", steps: [
    { id: "plans-full", route: "/shop", target: "plans:full", placement: "auto", eyebrow: "Explore Plans", title: "Full Platform Access", body: "Go all-access — every company, section, topic, mock and career tool in one plan. Pick 1, 3 or 12 months on the next screen." },
    { id: "plans-build", route: "/shop", target: "plans:build", placement: "auto", eyebrow: "Explore Plans", title: "Build Your Own Plan", body: "Prefer to pay only for what you need? Hand-pick companies, sections and sub-topics, each with its own validity, then add them to your cart." },
  ] },
  "/upgrade": { id: "upgrade", label: "Upgrade & Renew tour", steps: [
    { id: "upgrade-hero", route: "/upgrade", target: "upgrade:title", placement: "auto", eyebrow: "Upgrade & Renew", title: "Your membership", body: "Everything about your plan lives here — what you own, how long it's valid, and one-tap ways to renew or add more access." },
  ] },
  "/support": { id: "support", label: "Help & Support tour", steps: [
    { id: "support-hero", route: "/support", target: "support:hero", placement: "auto", eyebrow: "Help & Support", title: "Support overview", body: "The banner sets expectations: replies usually land within a day, in private tickets tracked as one ongoing conversation right here." },
    { id: "support-topics", route: "/support", target: "support:topics", placement: "auto", eyebrow: "Help & Support", title: "Pick a help topic", body: "Choose what you need help with — Account, Billing, Course content, Assessments, or a bug — to start a ticket pre-tagged for you." },
    { id: "support-new-ticket", route: "/support", target: "support:new-ticket", placement: "auto", eyebrow: "Help & Support", title: "Open a new ticket", body: "See how many tickets are open, then hit New ticket to describe an issue with a subject, category, and details." },
    { id: "support-tickets", route: "/support", target: "support:tickets", placement: "auto", eyebrow: "Help & Support", title: "Your tickets", body: "Your open and past tickets live here — tap any one to open its thread and continue the conversation with support." },
  ] },
  "/profile": { id: "profile", label: "Profile tour", steps: [
    { id: "profile-hero", route: "/profile", target: "profile:hero", placement: "auto", eyebrow: "Profile", title: "Your profile at a glance", body: "See your avatar, name, email, college chips, and a completion ring showing how much of your profile is filled in." },
    { id: "profile-personal", route: "/profile", target: "profile:personal", placement: "auto", eyebrow: "Profile", title: "Personal details", body: "Enter your full name and phone number so we know how to address you and reach out." },
    { id: "profile-academic", route: "/profile", target: "profile:academic", placement: "auto", eyebrow: "Profile", title: "Academic details", body: "Add your course, year of study, college, and passout year to describe where you are in your degree." },
    { id: "profile-career", route: "/profile", target: "profile:career", placement: "auto", eyebrow: "Profile", title: "Skills & target roles", body: "Type skills (Enter to add) and pick target roles. These power your recommendations and resume, so fill them carefully." },
    { id: "profile-completion", route: "/profile", target: "profile:completion", placement: "auto", eyebrow: "Profile", title: "Completion checklist", body: "Track which of the eight profile fields are done; tick them all off to reach 100% and unlock gated features." },
  ] },
  "/certificates": { id: "certs", label: "Certificates tour", steps: [
    { id: "certs-hero", route: "/certificates", target: "certs:hero", placement: "auto", eyebrow: "Certificates", title: "Earn as you climb", body: "Seven certificates unlock at XP milestones as you practise — your total XP and how many you've unlocked show right here." },
    { id: "certs-journey", route: "/certificates", target: "certs:journey", placement: "auto", eyebrow: "Certificates", title: "Your milestone journey", body: "The full ladder of tiers with your live position filled in — see exactly how much XP stands between you and the next certificate." },
    { id: "certs-gallery", route: "/certificates", target: "certs:gallery", placement: "auto", eyebrow: "Certificates", title: "Your certificate gallery", body: "Every certificate as a card. Unlocked ones can be downloaded as a PDF and shared with a public, verifiable link." },
  ] },
  "/coding": { id: "coding", label: "Coding tour", steps: [
    { id: "coding-hero", route: "/coding", target: "coding:hero", placement: "auto", eyebrow: "Coding", title: "Practice coding by topic", body: "DSA problems grouped by topic, each graded on the self-hosted Judge0 — you earn XP the first time you solve one." },
    { id: "coding-progress", route: "/coding", target: "coding:progress", placement: "auto", eyebrow: "Coding", title: "Your solve count", body: "Track how many problems you've solved out of what's available; the ones you've cleared show as green cards below." },
    { id: "coding-search", route: "/coding", target: "coding:search", placement: "auto", eyebrow: "Coding", title: "Find a problem", body: "Search by problem title or tag to jump straight to what you want to practise." },
  ] },
};

const TOURS: Record<string, GuideTour> = { [GRAND_TOUR_ID]: GRAND_TOUR };

export function getTour(id?: string): GuideTour | null {
  return TOURS[id ?? GRAND_TOUR_ID] ?? null;
}

/**
 * Exact-route match only. A page mini-tour is offered solely on the page it
 * describes — never on a deeper detail route (e.g. /dashboard/company/[slug]),
 * which would otherwise resolve to the parent list tour and navigate the user
 * away from the page they asked to tour.
 */
export function pageTourFor(pathname: string): GuideTour | null {
  return PAGE_TOURS[pathname] ?? null;
}
