/**
 * Resume Builder data model (ported from the AI-LINC resume builder). A single
 * ResumeData object drives the editor, every template, the ATS scorer, and PDF
 * export. Dates are stored as ISO-ish `YYYY-MM` strings; templates localise them.
 */

import type { ApiMe } from '@/lib/api/me';

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

export interface Achievement {
  id: string;
  title: string;
  description?: string;
  date?: string;
}

export interface PositionOfResponsibility {
  id: string;
  role: string;
  organization: string;
  startDate?: string;
  endDate?: string;
  current?: boolean;
  description?: string;
}

export interface Publication {
  id: string;
  title: string;
  venue?: string;
  date?: string;
  link?: string;
  description?: string;
}

export interface Extracurricular {
  id: string;
  title: string;
  organization?: string;
  description?: string;
}

export interface Volunteering {
  id: string;
  role: string;
  organization: string;
  startDate?: string;
  endDate?: string;
  current?: boolean;
  description?: string;
}

export interface Language {
  id: string;
  name: string;
  proficiency?: string; // e.g. Native / Fluent / Professional / Basic
}

export interface Interest {
  id: string;
  name: string;
}

export interface Award {
  id: string;
  title: string;
  issuer?: string;
  date?: string;
  description?: string;
}

export interface Course {
  id: string;
  name: string;
  provider?: string;
  date?: string;
  link?: string;
}

export interface ResumeData {
  basicInfo: BasicInfo;
  workExperience: WorkExperience[];
  education: Education[];
  skills: Skill[];
  projects: Project[];
  certifications: Certification[];
  achievements: Achievement[];
  positionsOfResponsibility: PositionOfResponsibility[];
  publications: Publication[];
  extracurricular: Extracurricular[];
  volunteering: Volunteering[];
  languages: Language[];
  interests: Interest[];
  awards: Award[];
  courses: Course[];
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
    achievements: [],
    positionsOfResponsibility: [],
    publications: [],
    extracurricular: [],
    volunteering: [],
    languages: [],
    interests: [],
    awards: [],
    courses: [],
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

/** "Jan 2022 - Present" style range for a role/education entry. */
export function dateRange(start: string, end: string, current?: boolean): string {
  const s = formatMonth(start);
  const e = current ? 'Present' : formatMonth(end);
  if (s && e) return `${s} - ${e}`;
  return s || e || '';
}

export function fullName(b: BasicInfo): string {
  return [b.firstName, b.lastName].filter(Boolean).join(' ').trim();
}

const TEMPLATE_KEYS: TemplateKey[] = [
  'modern', 'classic', 'minimal', 'creative', 'executive', 'technical',
  'twocolumn', 'accentbar', 'rightsidebar', 'western', 'luxsleek', 'bubble',
];

export function isTemplateKey(v: unknown): v is TemplateKey {
  return typeof v === 'string' && (TEMPLATE_KEYS as string[]).includes(v);
}

/**
 * Coerce arbitrary (possibly stale/partial) input - a localStorage draft or a
 * loaded record - into a complete ResumeData so templates never crash on a
 * missing section or field.
 */
export function normalizeResume(raw: unknown): ResumeData {
  const base = emptyResume();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Partial<ResumeData>;
  const bi = (r.basicInfo ?? {}) as Partial<BasicInfo>;
  const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
  return {
    basicInfo: {
      ...base.basicInfo,
      ...bi,
      firstName: bi.firstName ?? '',
      lastName: bi.lastName ?? '',
      professionalTitle: bi.professionalTitle ?? '',
      email: bi.email ?? '',
      phone: bi.phone ?? '',
      location: bi.location ?? '',
      summary: bi.summary ?? '',
    },
    workExperience: arr<WorkExperience>(r.workExperience).map((w) => ({
      ...w,
      id: w.id ?? newId(),
      description: Array.isArray(w.description) ? w.description : [],
    })),
    education: arr<Education>(r.education).map((e) => ({
      ...e,
      id: e.id ?? newId(),
      description: e.description ?? '',
    })),
    skills: arr<Skill>(r.skills).map((s) => ({ ...s, id: s.id ?? newId() })),
    projects: arr<Project>(r.projects).map((p) => ({
      ...p,
      id: p.id ?? newId(),
      technologies: Array.isArray(p.technologies) ? p.technologies : [],
    })),
    certifications: arr<Certification>(r.certifications).map((c) => ({ ...c, id: c.id ?? newId() })),
    achievements: arr<Achievement>(r.achievements).map((a) => ({ ...a, id: a.id ?? newId() })),
    positionsOfResponsibility: arr<PositionOfResponsibility>(r.positionsOfResponsibility).map((p) => ({
      ...p,
      id: p.id ?? newId(),
    })),
    publications: arr<Publication>(r.publications).map((p) => ({ ...p, id: p.id ?? newId() })),
    extracurricular: arr<Extracurricular>(r.extracurricular).map((e) => ({ ...e, id: e.id ?? newId() })),
    volunteering: arr<Volunteering>(r.volunteering).map((v) => ({ ...v, id: v.id ?? newId() })),
    languages: arr<Language>(r.languages).map((l) => ({ ...l, id: l.id ?? newId() })),
    interests: arr<Interest>(r.interests).map((i) => ({ ...i, id: i.id ?? newId() })),
    awards: arr<Award>(r.awards).map((a) => ({ ...a, id: a.id ?? newId() })),
    courses: arr<Course>(r.courses).map((c) => ({ ...c, id: c.id ?? newId() })),
  };
}

const BRANCH_LABEL: Record<string, string> = {
  CSE: 'Computer Science Engineering',
  IT: 'Information Technology',
  ECE: 'Electronics & Communication Engineering',
  EEE: 'Electrical & Electronics Engineering',
  MECH: 'Mechanical Engineering',
  CIVIL: 'Civil Engineering',
  OTHER: '',
};

/**
 * Seed a resume from the student's profile - name, contact, education, skills -
 * so an editor opens pre-filled instead of blank. Leaves summary/experience/
 * projects for the student (or the AI tailor) to complete. Shared by the Resume
 * Builder and the profile page so both seed from the SAME logic and back the
 * same `students.resumes` record.
 */
export function resumeFromProfile(me: ApiMe): ResumeData {
  const r = emptyResume();
  const p = me.studentProfile;
  const parts = (me.fullName ?? '').trim().split(/\s+/).filter(Boolean);
  r.basicInfo.firstName = parts[0] ?? '';
  r.basicInfo.lastName = parts.slice(1).join(' ');
  r.basicInfo.email = me.email ?? '';
  r.basicInfo.phone = p?.phone ?? '';
  if (p?.rolesInterested?.length) r.basicInfo.professionalTitle = p.rolesInterested[0];
  if (p?.collegeName || p?.course || p?.branch || p?.passoutYear) {
    r.education = [
      {
        id: newId(),
        degree: p?.course || (p?.branch ? BRANCH_LABEL[p.branch] ?? '' : '') || '',
        institution: p?.collegeName ?? '',
        location: '',
        startDate: p?.passoutYear ? `${p.passoutYear - 4}-08` : '',
        endDate: p?.passoutYear ? `${p.passoutYear}-06` : '',
        gpa: '',
        description: '',
      },
    ];
  }
  if (p?.skills?.length) {
    r.skills = p.skills.map((name) => ({ id: newId(), name }));
  }
  return r;
}
