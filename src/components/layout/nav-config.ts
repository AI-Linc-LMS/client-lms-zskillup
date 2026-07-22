import {
  Award,
  BarChart3,
  Brain,
  Building2,
  CalendarClock,
  ClipboardCheck,
  ClipboardList,
  Code2,
  Compass,
  CreditCard,
  Crown,
  FileCheck2,
  FileText,
  GraduationCap,
  MonitorPlay,
  LayoutDashboard,
  IndianRupee,
  Layers,
  LifeBuoy,
  ListChecks,
  type LucideIcon,
  MessagesSquare,
  Megaphone,
  MessageSquare,
  Newspaper,
  Quote,
  School,
  ScrollText,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  Users,
  Video,
  Wallet,
} from 'lucide-react';

/**
 * Sidebar navigation model (frontend/CLAUDE.md §4), now ROLE/ROUTE-AWARE.
 *
 * The AppShell is shared by the student, super-admin and TPO route groups, so
 * the sidebar must adapt to where the user is - an admin should never see
 * "My Learning". `navForPath()` selects the right section list from the current
 * pathname (which also makes the super-admin "view as student" preview render
 * the student nav automatically, since it lives on `/dashboard`).
 *
 * Every link here points to a page that is actually wired to live data - no
 * placeholder routes in the primary nav.
 */
export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Optional one-line explainer shown via an (ⓘ) tooltip next to the item - for
   *  platform-specific concepts a first-time user may not recognise. */
  tip?: string;
}

export interface NavSection {
  heading: string;
  items: NavItem[];
  /** Render each item as an INDIVIDUAL top-level nav link - no group header, no
   *  accordion. Used for Plans & Support so Explore Plans / Upgrade & Renew /
   *  Help & Support each stand on their own rather than nesting under a heading. */
  standalone?: boolean;
}

export const STUDENT_NAV: NavSection[] = [
  {
    heading: 'WORKSPACE',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, tip: 'Your personalized home - progress, streak, readiness and your next best step at a glance.' },
      { label: 'Study Plan', href: '/study-plan', icon: ListChecks, tip: 'Your day-by-day placement roadmap, generated from the Placement Readiness Test.' },
      { label: 'Performance', href: '/performance', icon: TrendingUp, tip: 'Detailed analytics - accuracy, speed and readiness across sections and topics.' },
      { label: 'Leaderboard', href: '/leaderboard', icon: Trophy, tip: 'See how you rank against peers - nationally, by college, company or city.' },
      { label: 'Community', href: '/community', icon: MessagesSquare, tip: 'Ask doubts, share tips and connect with other students in discussion threads.' },
      { label: 'Live Sessions', href: '/live-sessions', icon: Video, tip: 'Scheduled live classes and webinars (Zoom/Meet) you can join.' },
    ],
  },
  {
    heading: 'PRACTICE',
    items: [
      { label: 'Adaptive', href: '/practice', icon: Target, tip: 'Questions adapt to your performance - difficulty rises or falls as you answer.' },
      { label: 'Non-Adaptive', href: '/practice-wish', icon: Sparkles, tip: 'Questions stay at a fixed difficulty throughout the session.' },
    ],
  },
  {
    heading: 'ASSESSMENT',
    items: [
      { label: 'Mock Assessment', href: '/mock-assessment', icon: Brain, tip: 'Build customizable mock tests from your chosen sections, topics, question count and duration.' },
      { label: 'Assessments', href: '/assessments', icon: FileCheck2, tip: 'View and attempt scheduled or assigned assessments.' },
    ],
  },
  {
    heading: 'CAREER',
    items: [
      { label: 'Resume Builder', href: '/resume-builder', icon: FileText, tip: 'Build an ATS-ready resume with templates, AI tailoring to a target role, and PDF export.' },
      { label: 'Mock Interview', href: '/mock-interview', icon: MessageSquare, tip: 'Practice AI-driven, role-aware mock interviews with instant rubric feedback.' },
      { label: 'Certificates', href: '/certificates', icon: Award, tip: 'Earn and download shareable, verifiable certificates as you hit XP milestones.' },
    ],
  },
  {
    // Single destination - render it as one standalone top-level item rather than a
    // "COMPANY HUBS" header ABOVE a "Company Hubs" link (which read as a duplicate).
    heading: 'COMPANY HUBS',
    standalone: true,
    items: [{ label: 'Company Hubs', href: '/dashboard/company', icon: Building2, tip: 'Company-specific prep: hiring process, study material, practice, previous-year questions, mocks and interview prep.' }],
  },
  {
    // Section-organized prep (Numerical / Logical / Verbal / Technical …) - the
    // sibling of Company Hubs, one standalone top-level destination.
    heading: 'SECTIONAL HUBS',
    standalone: true,
    items: [{ label: 'Sectional Hubs', href: '/dashboard/section', icon: Layers, tip: 'Section-by-section prep: syllabus, study material and topic-wise practice. Unlock a single topic or the whole section.' }],
  },
  {
    // Individual top-level items - deliberately NOT grouped under a "Plans &
    // Support" header (the heading is kept only as a stable React key / icon lookup).
    heading: 'PLANS & SUPPORT',
    standalone: true,
    items: [
      { label: 'Explore Plans', href: '/shop', icon: Compass, tip: 'View and compare the available subscription plans.' },
      { label: 'Upgrade & Renew', href: '/upgrade', icon: Crown, tip: 'Upgrade your subscription or renew an existing plan.' },
      { label: 'Help & Support', href: '/support', icon: LifeBuoy, tip: 'Get assistance, report issues, or contact the support team.' },
    ],
  },
];

/** Student nav items shown ONLY to users who already hold a paid plan
 *  (platform or any granular purchase). "Upgrade & Renew" is meaningless to a
 *  free user - they use "Explore Plans" to buy first. The Sidebar filters these
 *  out via the live subscription status (falls open while the paywall is off). */
export const PLAN_ONLY_HREFS = new Set<string>(['/upgrade']);

/** Student features gated behind a 100%-complete profile - "Complete your
 *  profile" card in-page + a lock in the sidebar until the profile is finished.
 *  Kept to core practice/assessment surfaces so a new user isn't walled off. */
export const PROFILE_GATED_HREFS = new Set<string>(['/practice', '/mock-assessment', '/assessments']);

/** Student features gated behind a paid plan - a premium-upgrade card in-page +
 *  a lock in the sidebar until the student has an active plan. */
export const PREMIUM_GATED_HREFS = new Set<string>(['/practice-wish', '/mock-interview']);

/** Student features GENERATED from the one-time Placement Readiness Test - locked
 *  until it's completed because they're derived from its result. Deliberately
 *  narrow (only these two) so calibration never makes the whole platform feel
 *  locked to a brand-new user. */
export const CALIBRATION_GATED_HREFS = new Set<string>(['/study-plan', '/recommendations']);

export const SUPERADMIN_NAV: NavSection[] = [
  {
    heading: 'OVERVIEW',
    items: [
      { label: 'Dashboard', href: '/superadmin/dashboard', icon: LayoutDashboard },
      { label: 'Platform Analytics', href: '/superadmin/analytics', icon: BarChart3 },
      { label: 'Adaptive Sessions', href: '/superadmin/adaptive-sessions', icon: Brain },
    ],
  },
  {
    heading: 'PEOPLE',
    items: [
      { label: 'Student Reports', href: '/superadmin/students', icon: BarChart3 },
      { label: 'Users', href: '/superadmin/users', icon: Users },
      { label: 'Colleges', href: '/superadmin/colleges', icon: School },
      { label: 'College Requests', href: '/superadmin/college-requests', icon: ClipboardCheck },
    ],
  },
  {
    heading: 'OPERATIONS',
    items: [
      { label: 'Subscriptions', href: '/superadmin/subscriptions', icon: CreditCard },
      { label: 'Billing & Revenue', href: '/superadmin/billing', icon: Wallet },
      { label: 'Financials', href: '/superadmin/financials', icon: IndianRupee },
      { label: 'Reports', href: '/superadmin/reports', icon: FileText },
      { label: 'Broadcasts', href: '/superadmin/broadcasts', icon: Megaphone },
      { label: 'Support', href: '/superadmin/support', icon: LifeBuoy },
      { label: 'Audit Log', href: '/superadmin/audit-logs', icon: ScrollText },
    ],
  },
  {
    heading: 'CATALOG',
    items: [
      { label: 'Companies', href: '/superadmin/companies', icon: Building2 },
      { label: 'Question Bank', href: '/superadmin/questions', icon: ClipboardList },
      { label: 'Coding Bank', href: '/superadmin/coding', icon: Code2 },
      { label: 'Mock Tests', href: '/superadmin/mocks', icon: FileCheck2 },
      { label: 'Assessments', href: '/superadmin/scheduled-assessments', icon: CalendarClock },
      { label: 'Challenges', href: '/superadmin/challenges', icon: Trophy },
      { label: 'Courses', href: '/superadmin/courses', icon: GraduationCap },
      { label: 'Study Material', href: '/superadmin/study-material', icon: MonitorPlay },
    ],
  },
  {
    heading: 'MARKETING',
    items: [
      { label: 'Blog', href: '/superadmin/blogs', icon: Newspaper },
      { label: 'Testimonials', href: '/superadmin/testimonials', icon: Quote },
      { label: "Today's Tips", href: '/superadmin/tips', icon: Sparkles },
    ],
  },
];

/**
 * TPO / Placement Office console nav - the 11-module console (redesign). Rendered
 * by the dedicated `TpoShell` (not the shared Sidebar). Modules not yet built ship
 * as labeled scaffolds, so every link resolves - no 404s in the rail.
 */
export const TPO_NAV: NavSection[] = [
  {
    heading: 'OVERVIEW',
    items: [
      { label: 'Executive Dashboard', href: '/tpo/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    heading: 'ANALYTICS',
    items: [
      { label: 'Student Analytics', href: '/tpo/analytics', icon: BarChart3 },
      { label: 'Placement Readiness', href: '/tpo/placement-readiness', icon: Target },
      { label: 'Company Readiness', href: '/tpo/company-readiness', icon: Building2 },
      { label: 'Skill Gap Analytics', href: '/tpo/skill-gaps', icon: TrendingUp },
      { label: 'Coding Analytics', href: '/tpo/coding-analytics', icon: Code2 },
      { label: 'Interview Analytics', href: '/tpo/interview-analytics', icon: MessageSquare },
    ],
  },
  {
    heading: 'MANAGE',
    items: [
      { label: 'Student Management', href: '/tpo/students', icon: Users },
      { label: 'Assessment Center', href: '/tpo/assessments', icon: ClipboardCheck },
      // Cohorts + Invitations are configured by the Platform Admin (per-college),
      // not the TPO. TPOs keep read-only cohort access via the dashboard batch filter.
    ],
  },
  {
    heading: 'ACCOUNT',
    items: [
      { label: 'Reports & Exports', href: '/tpo/reports', icon: FileText },
      { label: 'Subscription', href: '/tpo/subscription', icon: CreditCard },
    ],
  },
];

/**
 * Platform Admin (internal operator, below Super Admin). Owns college
 * onboarding - registration requests, subscription activation, seeding imports.
 * More items land as those batches ship; only wired pages appear here.
 */
export const ADMIN_NAV: NavSection[] = [
  {
    heading: 'PLATFORM ADMIN',
    items: [
      { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
      { label: 'User Management', href: '/admin/users', icon: Users },
      { label: 'College Requests', href: '/admin/college-requests', icon: ClipboardCheck },
    ],
  },
  {
    heading: 'INSIGHTS',
    items: [
      { label: 'Platform Analytics', href: '/admin/analytics', icon: TrendingUp },
      { label: 'Student Reports', href: '/admin/students', icon: BarChart3 },
      { label: 'Colleges', href: '/admin/colleges', icon: School },
      { label: 'Reports', href: '/admin/reports', icon: FileText },
    ],
  },
  {
    heading: 'ENGAGEMENT',
    items: [
      { label: 'Broadcasts', href: '/admin/broadcasts', icon: Megaphone },
      { label: 'Live Sessions', href: '/admin/live-sessions', icon: Video },
      { label: 'Support', href: '/admin/support', icon: LifeBuoy },
    ],
  },
  {
    heading: 'MARKETING',
    items: [
      { label: 'Blog', href: '/admin/blogs', icon: Newspaper },
      { label: 'Testimonials', href: '/admin/testimonials', icon: Quote },
    ],
  },
  {
    heading: 'CATALOG',
    items: [
      { label: 'Companies', href: '/admin/companies', icon: Building2 },
      { label: 'Question Bank', href: '/admin/questions', icon: ClipboardList },
      { label: 'Coding Bank', href: '/admin/coding', icon: Code2 },
      { label: 'Mock Tests', href: '/admin/mocks', icon: FileCheck2 },
      { label: 'Assessments', href: '/admin/scheduled-assessments', icon: CalendarClock },
      { label: 'Calibration', href: '/admin/calibration', icon: Target, tip: 'Toggle the Placement Readiness Test gate and pick which scheduled assessment is the calibration.' },
      { label: 'Courses', href: '/admin/courses', icon: GraduationCap },
      { label: 'Study Material', href: '/admin/study-material', icon: MonitorPlay },
    ],
  },
];

/** Pick the nav for the current route group. */
export function navForPath(pathname: string): NavSection[] {
  if (pathname.startsWith('/superadmin')) return SUPERADMIN_NAV;
  if (pathname.startsWith('/admin')) return ADMIN_NAV;
  if (pathname.startsWith('/tpo')) return TPO_NAV;
  return STUDENT_NAV;
}

/** Workspace label shown under the logo, by route group. */
export function workspaceLabelForPath(pathname: string): string {
  if (pathname.startsWith('/superadmin')) return 'Super Admin Workspace';
  if (pathname.startsWith('/admin')) return 'Platform Admin';
  if (pathname.startsWith('/tpo')) return 'Placement Office';
  return 'Student Workspace';
}

export { GraduationCap };
