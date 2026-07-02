import {
  BarChart3,
  Brain,
  Building2,
  CalendarClock,
  ClipboardCheck,
  ClipboardList,
  Code2,
  CreditCard,
  FileCheck2,
  GraduationCap,
  LayoutDashboard,
  LifeBuoy,
  ListChecks,
  type LucideIcon,
  Mail,
  Megaphone,
  Newspaper,
  Quote,
  School,
  ScrollText,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  Users,
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
    heading: 'EXPLORE',
    items: [
      { label: 'Company Hubs', href: '/dashboard/company', icon: Building2 },
      { label: 'Help & Support', href: '/support', icon: LifeBuoy },
    ],
  },
];

export const SUPERADMIN_NAV: NavSection[] = [
  {
    heading: 'OVERVIEW',
    items: [{ label: 'Dashboard', href: '/superadmin/dashboard', icon: LayoutDashboard }],
  },
  {
    heading: 'PEOPLE',
    items: [
      { label: 'Student Reports', href: '/superadmin/students', icon: BarChart3 },
      { label: 'Users', href: '/superadmin/users', icon: Users },
      { label: 'College Requests', href: '/superadmin/college-requests', icon: ClipboardCheck },
    ],
  },
  {
    heading: 'CONTENT',
    items: [
      { label: 'Question Bank', href: '/superadmin/questions', icon: ClipboardList },
      { label: 'Coding Bank', href: '/superadmin/coding', icon: Code2 },
      { label: 'Mock Tests', href: '/superadmin/mocks', icon: FileCheck2 },
      { label: 'Assessments', href: '/superadmin/scheduled-assessments', icon: CalendarClock },
      { label: 'Companies', href: '/superadmin/companies', icon: Building2 },
    ],
  },
  {
    heading: 'MARKETING',
    items: [
      { label: 'Blog', href: '/superadmin/blogs', icon: Newspaper },
      { label: 'Testimonials', href: '/superadmin/testimonials', icon: Quote },
    ],
  },
  {
    heading: 'OPERATIONS',
    items: [
      { label: 'Subscriptions', href: '/superadmin/subscriptions', icon: CreditCard },
      { label: 'Broadcasts', href: '/superadmin/broadcasts', icon: Megaphone },
      { label: 'Support', href: '/superadmin/support', icon: LifeBuoy },
      { label: 'Audit Log', href: '/superadmin/audit-logs', icon: ScrollText },
    ],
  },
];

export const TPO_NAV: NavSection[] = [
  {
    heading: 'PLACEMENT OFFICE',
    items: [
      { label: 'Dashboard', href: '/tpo/dashboard', icon: LayoutDashboard },
      { label: 'Cohorts', href: '/tpo/cohorts', icon: Users },
      { label: 'Invitations', href: '/tpo/invitations', icon: Mail },
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
      { label: 'College Requests', href: '/admin/college-requests', icon: ClipboardCheck },
    ],
  },
  {
    heading: 'INSIGHTS',
    items: [
      { label: 'Student Reports', href: '/admin/students', icon: BarChart3 },
      { label: 'Colleges', href: '/admin/colleges', icon: School },
    ],
  },
  {
    heading: 'ENGAGEMENT',
    items: [
      { label: 'Broadcasts', href: '/admin/broadcasts', icon: Megaphone },
      { label: 'Subscriptions', href: '/admin/subscriptions', icon: CreditCard },
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
