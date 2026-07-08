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
  { id: 'nav-study-plan', target: nav('/study-plan'), placement: 'right', desktopOnly: true, eyebrow: 'Workspace', title: 'Study Plan', body: 'A guided, day-by-day plan tailored to your goals. Unlocks once your profile is 100% complete.' },
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
  { id: 'nav-company', target: nav('/dashboard/company'), placement: 'right', desktopOnly: true, eyebrow: 'Explore', title: 'Company Hubs', body: 'Company-specific prep \u2014 past questions, patterns and your readiness for each target company.' },
  { id: 'nav-shop', target: nav('/shop'), placement: 'right', desktopOnly: true, eyebrow: 'Explore', title: 'Shop', body: 'Browse and buy company courses, topic bundles and add-ons that fit your goals.' },
  { id: 'nav-upgrade', target: nav('/upgrade'), placement: 'right', desktopOnly: true, eyebrow: 'Explore', title: 'Upgrade', body: 'Unlock the full platform \u2014 every company, every assessment, every feature.' },
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
  "/shop": { id: "shop", label: "Shop tour", steps: [
    { id: "shop-cart", route: "/shop", target: "shop:cart", placement: "auto", eyebrow: "Shop", title: "Your cart", body: "Everything you add collects here; open your cart any time to review picks and check out — the badge tracks your item count." },
    { id: "shop-controls", route: "/shop", target: "shop:controls", placement: "auto", eyebrow: "Shop", title: "Search & billing period", body: "Search for any topic or company, and switch between monthly, quarterly and annual billing — every price on the page updates instantly." },
    { id: "shop-platform", route: "/shop", target: "shop:platform", placement: "auto", eyebrow: "Shop", title: "Full platform unlock", body: "Unlock every topic, section, company hub and coding in one purchase — the best-value option, shown here with its price." },
    { id: "shop-companies", route: "/shop", target: "shop:companies", placement: "auto", eyebrow: "Shop", title: "Company hubs", body: "Browse recruiter PYQ banks by company and add any hub to your cart at the current billing period's price." },
    { id: "shop-sections", route: "/shop", target: "shop:sections", placement: "auto", eyebrow: "Shop", title: "Sections & topics", body: "Expand any section to see its topics; buy a single topic or the whole section, then add it to your cart." },
  ] },
  "/upgrade": { id: "upgrade", label: "Upgrade tour", steps: [
    { id: "upgrade-hero", route: "/upgrade", target: "upgrade:hero", placement: "auto", eyebrow: "Upgrade", title: "Your upgrade status", body: "See at a glance whether full platform access is already active with days left, or what upgrading unlocks for you." },
    { id: "upgrade-platform-plans", route: "/upgrade", target: "upgrade:platform-plans", placement: "auto", eyebrow: "Upgrade", title: "Full platform plans", body: "Compare monthly, quarterly and annual full-access plans, see each price and feature list, then buy your pick in one tap." },
    { id: "upgrade-mini-plans", route: "/upgrade", target: "upgrade:mini-plans", placement: "auto", eyebrow: "Upgrade", title: "Buy just what you need", body: "Prefer to pay less? Unlock a single topic, a whole section, or one company's PYQ hub instead of everything." },
    { id: "upgrade-history", route: "/upgrade", target: "upgrade:history", placement: "auto", eyebrow: "Upgrade", title: "Purchase history", body: "Review every past order here — item, plan, amount, payment status and date — so you can track your billing." },
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
