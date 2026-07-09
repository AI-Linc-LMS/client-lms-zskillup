import {
  Award,
  BarChart3,
  Brain,
  Building2,
  CalendarClock,
  ClipboardCheck,
  ClipboardList,
  Code2,
  CreditCard,
  FileCheck2,
  FileText,
  GraduationCap,
  MonitorPlay,
  LayoutDashboard,
  IndianRupee,
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
  Settings,
  ShoppingBag,
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
 * the sidebar must adapt to where the user is — an admin should never see
 * "My Learning". `navForPath()` selects the right section list from the current
 * pathname (which also makes the super-admin "view as student" preview render
 * the student nav automatically, since it lives on `/dashboard`).
 *
 * Every link here points to a page that is actually wired to live data — no
 * placeholder routes in the primary nav.
 */
export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface NavSection {
  heading: string;
  items: NavItem[];
}

export const STUDENT_NAV: NavSection[] = [
  {
    heading: 'WORKSPACE',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { label: 'Study Plan', href: '/study-plan', icon: ListChecks },
      { label: 'Performance', href: '/performance', icon: TrendingUp },
      { label: 'Leaderboard', href: '/leaderboard', icon: Trophy },
      { label: 'Community', href: '/community', icon: MessagesSquare },
      { label: 'Live Sessions', href: '/live-sessions', icon: Video },
    ],
  },
  {
    heading: 'PRACTICE',
    items: [
      { label: 'Practice', href: '/practice', icon: Target },
      { label: 'Practice as Wish', href: '/practice-wish', icon: Sparkles },
    ],
  },
  {
    heading: 'ASSESSMENT',
    items: [
      { label: 'Mock Assessment', href: '/mock-assessment', icon: Brain },
      { label: 'Assessments', href: '/assessments', icon: FileCheck2 },
    ],
  },
  {
    heading: 'CAREER',
    items: [
      { label: 'Resume Builder', href: '/resume-builder', icon: FileText },
      { label: 'Mock Interview', href: '/mock-interview', icon: MessageSquare },
      { label: 'Certificates', href: '/certificates', icon: Award },
    ],
  },
  {
    heading: 'EXPLORE',
    items: [
      { label: 'Company Hubs', href: '/dashboard/company', icon: Building2 },
      { label: 'Shop', href: '/shop', icon: ShoppingBag },
      { label: 'Upgrade', href: '/upgrade', icon: Sparkles },
      { label: 'Help & Support', href: '/support', icon: LifeBuoy },
    ],
  },
];

/** Student features gated behind a 100%-complete profile (blur-locked in-page +
 *  shown with a lock in the sidebar until the profile is finished). */
export const PROFILE_GATED_HREFS = new Set<string>(['/practice-wish', '/mock-interview']);

/** Student features gated behind the one-time calibration assessment — all
 *  practice + assessment surfaces are locked until the student takes it. */
export const CALIBRATION_GATED_HREFS = new Set<string>([
  '/practice',
  '/practice-wish',
  '/mock-assessment',
  '/assessments',
  '/mock-interview',
  '/coding',
]);

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
];

/**
 * TPO / Placement Office console nav — the 11-module console (redesign). Rendered
 * by the dedicated `TpoShell` (not the shared Sidebar). Modules not yet built ship
 * as labeled scaffolds, so every link resolves — no 404s in the rail.
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
      { label: 'Cohort Access', href: '/tpo/billing', icon: Wallet },
      { label: 'Settings', href: '/tpo/settings', icon: Settings },
    ],
  },
];

/**
 * Platform Admin (internal operator, below Super Admin). Owns college
 * onboarding — registration requests, subscription activation, seeding imports.
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
      { label: 'Subscriptions', href: '/admin/subscriptions', icon: CreditCard },
      { label: 'Financials', href: '/admin/financials', icon: IndianRupee },
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
