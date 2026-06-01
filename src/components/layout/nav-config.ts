import {
  Award,
  BookOpen,
  Briefcase,
  ClipboardList,
  FileCheck2,
  GraduationCap,
  LayoutDashboard,
  LifeBuoy,
  Library,
  type LucideIcon,
  Network,
  TrendingUp,
  Users,
} from 'lucide-react';

/**
 * Sidebar navigation model (frontend/CLAUDE.md §4). Grouped into PERSONAL /
 * PROGRAMS / RESOURCES exactly as the reference image. Static for Block 2 —
 * `badge` counts and `active` state are wired to real data in a later phase.
 */
export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
}

export interface NavSection {
  heading: string;
  items: NavItem[];
}

export const SIDEBAR_SECTIONS: NavSection[] = [
  {
    heading: 'PERSONAL',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { label: 'My Learning', href: '/my-learning', icon: BookOpen, badge: 8 },
      { label: 'Assignments', href: '/assignments', icon: ClipboardList, badge: 3 },
      { label: 'Mock Tests', href: '/mock-tests', icon: FileCheck2 },
      { label: 'Certifications', href: '/certifications', icon: Award },
      { label: 'Performance', href: '/performance', icon: TrendingUp },
    ],
  },
  {
    heading: 'PROGRAMS',
    items: [
      { label: 'Campus Recruitment', href: '/campus-recruitment', icon: Briefcase },
      { label: 'Skill Tracks', href: '/skill-tracks', icon: Network },
      { label: 'Cohort Programs', href: '/cohort-programs', icon: Users },
    ],
  },
  {
    heading: 'RESOURCES',
    items: [
      { label: 'Knowledge Base', href: '/knowledge-base', icon: Library },
      { label: 'Help & Support', href: '/help', icon: LifeBuoy },
    ],
  },
];

/** Primary top-bar navigation (STUDENT_JOURNEY_SPEC §4 — no duplicate "Companies"). */
export const TOPBAR_NAV: { label: string; href: string }[] = [
  { label: 'Explore', href: '/explore' },
  { label: 'Company Hubs', href: '/company-hubs' },
  { label: 'Topic Mastery', href: '/topic-mastery' },
  { label: 'Mock Assessments', href: '/mock-assessments' },
];

export { GraduationCap };
