/**
 * Resume Builder data model (ported from the AI-LINC resume builder). A single
 * ResumeData object drives the editor, every template, the ATS scorer, and PDF
 * export. Dates are stored as ISO-ish `YYYY-MM` strings; templates localise them.
 */

export interface BasicInfo {
  firstName: string;
  lastName: string;
  professionalTitle: string;
  email: string;
  phone: string;
  location: string;
  photo?: string; // data URL
  summary: string;
  github?: string;
  linkedin?: string;
  portfolio?: string;
  leetcode?: string;
  hackerrank?: string;
  kaggle?: string;
  medium?: string;
}

export interface WorkExperience {
  id: string;
  position: string;
  company: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string[]; // bullet points
}

export interface Education {
  id: string;
  degree: string;
  institution: string;
  location: string;
  startDate: string;
  endDate: string;
  gpa?: string;
  description: string;
}

export interface Skill {
  id: string;
  name: string;
  level?: number; // 1-5
  category?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  technologies: string[];
  link?: string;
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  date: string;
  link?: string;
}

export interface ResumeData {
  basicInfo: BasicInfo;
  workExperience: WorkExperience[];
  education: Education[];
  skills: Skill[];
  projects: Project[];
  certifications: Certification[];
}

export type TemplateKey =
  | 'modern'
  | 'classic'
  | 'minimal'
  | 'creative'
  | 'executive'
  | 'technical'
  | 'twocolumn'
  | 'accentbar'
  | 'rightsidebar'
  | 'western'
  | 'luxsleek'
  | 'bubble';

export interface TemplateProps {
  data: ResumeData;
}

/** Empty resume for a from-scratch start. */
export function emptyResume(): ResumeData {
  return {
    basicInfo: {
      firstName: '',
      lastName: '',
      professionalTitle: '',
      email: '',
      phone: '',
      location: '',
      summary: '',
    },
    workExperience: [],
    education: [],
    skills: [],
    projects: [],
    certifications: [],
  };
}

/** Stable-ish id for new items (client-only; avoids crypto for SSR safety). */
export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Format a `YYYY-MM` (or free) date to e.g. "Jan 2024"; passthrough otherwise. */
export function formatMonth(value: string): string {
  if (!value) return '';
  const m = /^(\d{4})-(\d{2})$/.exec(value.trim());
  if (!m) return value;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const idx = parseInt(m[2], 10) - 1;
  return idx >= 0 && idx < 12 ? `${months[idx]} ${m[1]}` : value;
}

/** "Jan 2022 — Present" style range for a role/education entry. */
export function dateRange(start: string, end: string, current?: boolean): string {
  const s = formatMonth(start);
  const e = current ? 'Present' : formatMonth(end);
  if (s && e) return `${s} — ${e}`;
  return s || e || '';
}

export function fullName(b: BasicInfo): string {
  return [b.firstName, b.lastName].filter(Boolean).join(' ').trim();
}
