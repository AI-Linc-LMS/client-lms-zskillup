import {
  BarChart3,
  Brain,
  Building2,
  CalendarClock,
  ClipboardList,
  Code2,
  FileCheck2,
  GraduationCap,
  LayoutDashboard,
  ListChecks,
  type LucideIcon,
  Mail,
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
    items: [{ label: 'Company Hubs', href: '/dashboard/company', icon: Building2 }],
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
];

export const TPO_NAV: NavSection[] = [
  {
    heading: 'PLACEMENT OFFICE',
    items: [
      { label: 'Dashboard', href: '/tpo/dashboard', icon: LayoutDashboard },
      { label: 'Invitations', href: '/tpo/invitations', icon: Mail },
    ],
  },
];

/** Pick the nav for the current route group. */
export function navForPath(pathname: string): NavSection[] {
  if (pathname.startsWith('/superadmin')) return SUPERADMIN_NAV;
  if (pathname.startsWith('/tpo')) return TPO_NAV;
  return STUDENT_NAV;
}

/** Workspace label shown under the logo, by route group. */
export function workspaceLabelForPath(pathname: string): string {
  if (pathname.startsWith('/superadmin')) return 'Admin Workspace';
  if (pathname.startsWith('/tpo')) return 'Placement Office';
  return 'Student Workspace';
}

export { GraduationCap };
