'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type {
  Achievement,
  Award,
  Certification,
  Course,
  Education,
  Extracurricular,
  Interest,
  Language,
  PositionOfResponsibility,
  Project,
  Publication,
  ResumeData,
  Skill,
  Volunteering,
  WorkExperience,
} from './types';
import { newId } from './types';
import {
  ChevronDown,
  GraduationCap,
  Lightbulb,
  Plus,
  Trash2,
  User,
  Wrench,
  Briefcase,
  FolderGit2,
  Award as AwardIcon,
  Trophy,
  Users,
  BookOpen,
  Sparkle,
  HeartHandshake,
  Languages as LanguagesIcon,
  Heart,
  Medal,
  Library,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const input =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange';
const lbl = 'mb-1 block text-[11px] font-medium text-slate-600';

interface Props {
  data: ResumeData;
  onChange: (next: ResumeData) => void;
  /** Optional slot rendered inside a section header (e.g. AI tailor button). */
  sectionAction?: (section: 'summary' | 'skills' | 'experience' | 'projects') => React.ReactNode;
}

export function ResumeForm({ data, onChange, sectionAction }: Props) {
  const patchBasic = (p: Partial<ResumeData['basicInfo']>) =>
    onChange({ ...data, basicInfo: { ...data.basicInfo, ...p } });

  const onPhoto = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => patchBasic({ photo: reader.result as string });
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-3" data-tour="resume:editor">
      {/* Basic info */}
      <Section title="Basic Information" icon={<User className="size-4" />} defaultOpen>
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name"><input className={input} value={data.basicInfo.firstName} onChange={(e) => patchBasic({ firstName: e.target.value })} /></Field>
          <Field label="Last name"><input className={input} value={data.basicInfo.lastName} onChange={(e) => patchBasic({ lastName: e.target.value })} /></Field>
          <Field label="Professional title" full><input className={input} value={data.basicInfo.professionalTitle} onChange={(e) => patchBasic({ professionalTitle: e.target.value })} placeholder="e.g. Frontend Engineer" /></Field>
          <Field label="Email"><input className={input} value={data.basicInfo.email} onChange={(e) => patchBasic({ email: e.target.value })} /></Field>
          <Field label="Phone"><input className={input} value={data.basicInfo.phone} onChange={(e) => patchBasic({ phone: e.target.value })} /></Field>
          <Field label="Location" full><input className={input} value={data.basicInfo.location} onChange={(e) => patchBasic({ location: e.target.value })} /></Field>
        </div>
        <div className="mt-3">
          <div className="flex items-center justify-between">
            <label className={lbl}>Professional summary</label>
            {sectionAction?.('summary')}
          </div>
          <textarea rows={4} className={input} value={data.basicInfo.summary} onChange={(e) => patchBasic({ summary: e.target.value })} placeholder="2-3 sentences about your strengths and impact." />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Field label="GitHub"><input className={input} value={data.basicInfo.github ?? ''} onChange={(e) => patchBasic({ github: e.target.value })} /></Field>
          <Field label="LinkedIn"><input className={input} value={data.basicInfo.linkedin ?? ''} onChange={(e) => patchBasic({ linkedin: e.target.value })} /></Field>
          <Field label="Portfolio"><input className={input} value={data.basicInfo.portfolio ?? ''} onChange={(e) => patchBasic({ portfolio: e.target.value })} /></Field>
          <Field label="LeetCode"><input className={input} value={data.basicInfo.leetcode ?? ''} onChange={(e) => patchBasic({ leetcode: e.target.value })} /></Field>
          <Field label="HackerRank"><input className={input} value={data.basicInfo.hackerrank ?? ''} onChange={(e) => patchBasic({ hackerrank: e.target.value })} /></Field>
          <Field label="Kaggle"><input className={input} value={data.basicInfo.kaggle ?? ''} onChange={(e) => patchBasic({ kaggle: e.target.value })} /></Field>
        </div>
        <div className="mt-3">
          <label className={lbl}>Photo (optional)</label>
          <div className="flex items-center gap-3">
            {data.basicInfo.photo && <img src={data.basicInfo.photo} alt="" className="size-12 rounded-full object-cover" />}
            <input type="file" accept="image/*" onChange={(e) => onPhoto(e.target.files?.[0])} className="text-xs" />
            {data.basicInfo.photo && (
              <button onClick={() => patchBasic({ photo: undefined })} className="text-xs font-medium text-red-500">Remove</button>
            )}
          </div>
        </div>
      </Section>

      {/* Experience */}
      <Section title="Work Experience" icon={<Briefcase className="size-4" />} count={data.workExperience.length} action={sectionAction?.('experience')}>
        {data.workExperience.map((w, i) => (
          <ItemCard key={w.id} onRemove={() => onChange({ ...data, workExperience: data.workExperience.filter((x) => x.id !== w.id) })}>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Position"><input className={input} value={w.position} onChange={(e) => updateArr(data, onChange, 'workExperience', i, { position: e.target.value })} /></Field>
              <Field label="Company"><input className={input} value={w.company} onChange={(e) => updateArr(data, onChange, 'workExperience', i, { company: e.target.value })} /></Field>
              <Field label="Location"><input className={input} value={w.location} onChange={(e) => updateArr(data, onChange, 'workExperience', i, { location: e.target.value })} /></Field>
              <div />
              <Field label="Start (YYYY-MM)"><input className={input} placeholder="2023-06" value={w.startDate} onChange={(e) => updateArr(data, onChange, 'workExperience', i, { startDate: e.target.value })} /></Field>
              <Field label="End (YYYY-MM)"><input className={input} placeholder="2024-01" value={w.endDate} disabled={w.current} onChange={(e) => updateArr(data, onChange, 'workExperience', i, { endDate: e.target.value })} /></Field>
            </div>
            <label className="mt-2 flex items-center gap-2 text-xs text-slate-600">
              <input type="checkbox" checked={w.current} onChange={(e) => updateArr(data, onChange, 'workExperience', i, { current: e.target.checked })} /> I currently work here
            </label>
            <div className="mt-2">
              <label className={lbl}>Highlights (one bullet per line)</label>
              <textarea rows={4} className={input} value={w.description.join('\n')} onChange={(e) => updateArr(data, onChange, 'workExperience', i, { description: e.target.value.split('\n') })} />
            </div>
          </ItemCard>
        ))}
        <AddButton label="Add experience" onClick={() => onChange({ ...data, workExperience: [...data.workExperience, blankExperience()] })} />
      </Section>

      {/* Education */}
      <Section title="Education" icon={<GraduationCap className="size-4" />} count={data.education.length}>
        {data.education.map((e, i) => (
          <ItemCard key={e.id} onRemove={() => onChange({ ...data, education: data.education.filter((x) => x.id !== e.id) })}>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Degree"><input className={input} value={e.degree} onChange={(ev) => updateArr(data, onChange, 'education', i, { degree: ev.target.value })} /></Field>
              <Field label="Institution"><input className={input} value={e.institution} onChange={(ev) => updateArr(data, onChange, 'education', i, { institution: ev.target.value })} /></Field>
              <Field label="Location"><input className={input} value={e.location} onChange={(ev) => updateArr(data, onChange, 'education', i, { location: ev.target.value })} /></Field>
              <Field label="GPA"><input className={input} value={e.gpa ?? ''} onChange={(ev) => updateArr(data, onChange, 'education', i, { gpa: ev.target.value })} /></Field>
              <Field label="Start (YYYY-MM)"><input className={input} value={e.startDate} onChange={(ev) => updateArr(data, onChange, 'education', i, { startDate: ev.target.value })} /></Field>
              <Field label="End (YYYY-MM)"><input className={input} value={e.endDate} onChange={(ev) => updateArr(data, onChange, 'education', i, { endDate: ev.target.value })} /></Field>
            </div>
            <div className="mt-2"><label className={lbl}>Description (optional)</label><textarea rows={2} className={input} value={e.description} onChange={(ev) => updateArr(data, onChange, 'education', i, { description: ev.target.value })} placeholder="Relevant coursework, honours, activities." /></div>
          </ItemCard>
        ))}
        <AddButton label="Add education" onClick={() => onChange({ ...data, education: [...data.education, blankEducation()] })} />
      </Section>

      {/* Skills */}
      <Section title="Skills" icon={<Wrench className="size-4" />} count={data.skills.length} action={sectionAction?.('skills')}>
        {data.skills.map((s, i) => (
          <div key={s.id} className="mb-2 flex items-center gap-2">
            <input className={cn(input, 'flex-1')} placeholder="Skill" value={s.name} onChange={(e) => updateArr(data, onChange, 'skills', i, { name: e.target.value })} />
            <input className={cn(input, 'w-32')} placeholder="Category" value={s.category ?? ''} onChange={(e) => updateArr(data, onChange, 'skills', i, { category: e.target.value })} />
            <select className={cn(input, 'w-20')} value={s.level ?? 3} onChange={(e) => updateArr(data, onChange, 'skills', i, { level: Number(e.target.value) })}>
              {[1, 2, 3, 4, 5].map((n) => (<option key={n} value={n}>{n}</option>))}
            </select>
            <button onClick={() => onChange({ ...data, skills: data.skills.filter((x) => x.id !== s.id) })} className="rounded-lg border border-red-200 p-2 text-red-500 hover:bg-red-50"><Trash2 className="size-4" /></button>
          </div>
        ))}
        <AddButton label="Add skill" onClick={() => onChange({ ...data, skills: [...data.skills, { id: newId(), name: '', level: 3, category: '' }] })} />
      </Section>

      {/* Projects */}
      <Section title="Projects" icon={<FolderGit2 className="size-4" />} count={data.projects.length}>
        {data.projects.map((p, i) => (
          <ItemCard key={p.id} onRemove={() => onChange({ ...data, projects: data.projects.filter((x) => x.id !== p.id) })}>
            <Field label="Name" full><input className={input} value={p.name} onChange={(e) => updateArr(data, onChange, 'projects', i, { name: e.target.value })} /></Field>
            <div className="mt-2"><label className={lbl}>Description</label><textarea rows={2} className={input} value={p.description} onChange={(e) => updateArr(data, onChange, 'projects', i, { description: e.target.value })} /></div>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <Field label="Technologies (comma-separated)"><input className={input} value={p.technologies.join(', ')} onChange={(e) => updateArr(data, onChange, 'projects', i, { technologies: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) })} /></Field>
              <Field label="Link"><input className={input} value={p.link ?? ''} onChange={(e) => updateArr(data, onChange, 'projects', i, { link: e.target.value })} /></Field>
            </div>
          </ItemCard>
        ))}
        <AddButton label="Add project" onClick={() => onChange({ ...data, projects: [...data.projects, blankProject()] })} />
      </Section>

      {/* Certifications */}
      <Section title="Certifications" icon={<AwardIcon className="size-4" />} count={data.certifications.length}>
        {data.certifications.map((c, i) => (
          <ItemCard key={c.id} onRemove={() => onChange({ ...data, certifications: data.certifications.filter((x) => x.id !== c.id) })}>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Name"><input className={input} value={c.name} onChange={(e) => updateArr(data, onChange, 'certifications', i, { name: e.target.value })} /></Field>
              <Field label="Issuer"><input className={input} value={c.issuer} onChange={(e) => updateArr(data, onChange, 'certifications', i, { issuer: e.target.value })} /></Field>
              <Field label="Date (YYYY-MM)"><input className={input} value={c.date} onChange={(e) => updateArr(data, onChange, 'certifications', i, { date: e.target.value })} /></Field>
              <Field label="Link"><input className={input} value={c.link ?? ''} onChange={(e) => updateArr(data, onChange, 'certifications', i, { link: e.target.value })} /></Field>
            </div>
          </ItemCard>
        ))}
        <AddButton label="Add certification" onClick={() => onChange({ ...data, certifications: [...data.certifications, blankCert()] })} />
      </Section>

      {/* Achievements */}
      <Section title="Achievements" icon={<Trophy className="size-4" />} count={data.achievements.length}>
        {data.achievements.map((a, i) => (
          <ItemCard key={a.id} onRemove={() => onChange({ ...data, achievements: data.achievements.filter((x) => x.id !== a.id) })}>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Title" full><input className={input} value={a.title} onChange={(e) => updateArr(data, onChange, 'achievements', i, { title: e.target.value })} /></Field>
              <Field label="Date (YYYY-MM)"><input className={input} value={a.date ?? ''} onChange={(e) => updateArr(data, onChange, 'achievements', i, { date: e.target.value })} /></Field>
            </div>
            <div className="mt-2"><label className={lbl}>Description (optional)</label><textarea rows={2} className={input} value={a.description ?? ''} onChange={(e) => updateArr(data, onChange, 'achievements', i, { description: e.target.value })} /></div>
          </ItemCard>
        ))}
        <AddButton label="Add achievement" onClick={() => onChange({ ...data, achievements: [...data.achievements, blankAchievement()] })} />
      </Section>

      {/* Positions of Responsibility */}
      <Section title="Positions of Responsibility" icon={<Users className="size-4" />} count={data.positionsOfResponsibility.length}>
        {data.positionsOfResponsibility.map((p, i) => (
          <ItemCard key={p.id} onRemove={() => onChange({ ...data, positionsOfResponsibility: data.positionsOfResponsibility.filter((x) => x.id !== p.id) })}>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Role"><input className={input} value={p.role} onChange={(e) => updateArr(data, onChange, 'positionsOfResponsibility', i, { role: e.target.value })} /></Field>
              <Field label="Organization"><input className={input} value={p.organization} onChange={(e) => updateArr(data, onChange, 'positionsOfResponsibility', i, { organization: e.target.value })} /></Field>
              <Field label="Start (YYYY-MM)"><input className={input} value={p.startDate ?? ''} onChange={(e) => updateArr(data, onChange, 'positionsOfResponsibility', i, { startDate: e.target.value })} /></Field>
              <Field label="End (YYYY-MM)"><input className={input} value={p.endDate ?? ''} disabled={p.current} onChange={(e) => updateArr(data, onChange, 'positionsOfResponsibility', i, { endDate: e.target.value })} /></Field>
            </div>
            <label className="mt-2 flex items-center gap-2 text-xs text-slate-600">
              <input type="checkbox" checked={p.current ?? false} onChange={(e) => updateArr(data, onChange, 'positionsOfResponsibility', i, { current: e.target.checked })} /> Currently holding this position
            </label>
            <div className="mt-2"><label className={lbl}>Description (optional)</label><textarea rows={2} className={input} value={p.description ?? ''} onChange={(e) => updateArr(data, onChange, 'positionsOfResponsibility', i, { description: e.target.value })} /></div>
          </ItemCard>
        ))}
        <AddButton label="Add position" onClick={() => onChange({ ...data, positionsOfResponsibility: [...data.positionsOfResponsibility, blankPosition()] })} />
      </Section>

      {/* Publications */}
      <Section title="Publications" icon={<BookOpen className="size-4" />} count={data.publications.length}>
        {data.publications.map((p, i) => (
          <ItemCard key={p.id} onRemove={() => onChange({ ...data, publications: data.publications.filter((x) => x.id !== p.id) })}>
            <Field label="Title" full><input className={input} value={p.title} onChange={(e) => updateArr(data, onChange, 'publications', i, { title: e.target.value })} /></Field>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <Field label="Venue / Journal"><input className={input} value={p.venue ?? ''} onChange={(e) => updateArr(data, onChange, 'publications', i, { venue: e.target.value })} /></Field>
              <Field label="Date (YYYY-MM)"><input className={input} value={p.date ?? ''} onChange={(e) => updateArr(data, onChange, 'publications', i, { date: e.target.value })} /></Field>
              <Field label="Link" full><input className={input} value={p.link ?? ''} onChange={(e) => updateArr(data, onChange, 'publications', i, { link: e.target.value })} /></Field>
            </div>
            <div className="mt-2"><label className={lbl}>Description (optional)</label><textarea rows={2} className={input} value={p.description ?? ''} onChange={(e) => updateArr(data, onChange, 'publications', i, { description: e.target.value })} /></div>
          </ItemCard>
        ))}
        <AddButton label="Add publication" onClick={() => onChange({ ...data, publications: [...data.publications, blankPublication()] })} />
      </Section>

      {/* Awards */}
      <Section title="Awards & Honors" icon={<Medal className="size-4" />} count={data.awards.length}>
        {data.awards.map((a, i) => (
          <ItemCard key={a.id} onRemove={() => onChange({ ...data, awards: data.awards.filter((x) => x.id !== a.id) })}>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Title"><input className={input} value={a.title} onChange={(e) => updateArr(data, onChange, 'awards', i, { title: e.target.value })} /></Field>
              <Field label="Issuer"><input className={input} value={a.issuer ?? ''} onChange={(e) => updateArr(data, onChange, 'awards', i, { issuer: e.target.value })} /></Field>
              <Field label="Date (YYYY-MM)"><input className={input} value={a.date ?? ''} onChange={(e) => updateArr(data, onChange, 'awards', i, { date: e.target.value })} /></Field>
            </div>
            <div className="mt-2"><label className={lbl}>Description (optional)</label><textarea rows={2} className={input} value={a.description ?? ''} onChange={(e) => updateArr(data, onChange, 'awards', i, { description: e.target.value })} /></div>
          </ItemCard>
        ))}
        <AddButton label="Add award" onClick={() => onChange({ ...data, awards: [...data.awards, blankAward()] })} />
      </Section>

      {/* Courses */}
      <Section title="Relevant Courses" icon={<Library className="size-4" />} count={data.courses.length}>
        {data.courses.map((c, i) => (
          <ItemCard key={c.id} onRemove={() => onChange({ ...data, courses: data.courses.filter((x) => x.id !== c.id) })}>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Name"><input className={input} value={c.name} onChange={(e) => updateArr(data, onChange, 'courses', i, { name: e.target.value })} /></Field>
              <Field label="Provider"><input className={input} value={c.provider ?? ''} onChange={(e) => updateArr(data, onChange, 'courses', i, { provider: e.target.value })} /></Field>
              <Field label="Date (YYYY-MM)"><input className={input} value={c.date ?? ''} onChange={(e) => updateArr(data, onChange, 'courses', i, { date: e.target.value })} /></Field>
              <Field label="Link"><input className={input} value={c.link ?? ''} onChange={(e) => updateArr(data, onChange, 'courses', i, { link: e.target.value })} /></Field>
            </div>
          </ItemCard>
        ))}
        <AddButton label="Add course" onClick={() => onChange({ ...data, courses: [...data.courses, blankCourse()] })} />
      </Section>

      {/* Volunteering */}
      <Section title="Volunteering" icon={<HeartHandshake className="size-4" />} count={data.volunteering.length}>
        {data.volunteering.map((v, i) => (
          <ItemCard key={v.id} onRemove={() => onChange({ ...data, volunteering: data.volunteering.filter((x) => x.id !== v.id) })}>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Role"><input className={input} value={v.role} onChange={(e) => updateArr(data, onChange, 'volunteering', i, { role: e.target.value })} /></Field>
              <Field label="Organization"><input className={input} value={v.organization} onChange={(e) => updateArr(data, onChange, 'volunteering', i, { organization: e.target.value })} /></Field>
              <Field label="Start (YYYY-MM)"><input className={input} value={v.startDate ?? ''} onChange={(e) => updateArr(data, onChange, 'volunteering', i, { startDate: e.target.value })} /></Field>
              <Field label="End (YYYY-MM)"><input className={input} value={v.endDate ?? ''} disabled={v.current} onChange={(e) => updateArr(data, onChange, 'volunteering', i, { endDate: e.target.value })} /></Field>
            </div>
            <label className="mt-2 flex items-center gap-2 text-xs text-slate-600">
              <input type="checkbox" checked={v.current ?? false} onChange={(e) => updateArr(data, onChange, 'volunteering', i, { current: e.target.checked })} /> Currently volunteering here
            </label>
            <div className="mt-2"><label className={lbl}>Description (optional)</label><textarea rows={2} className={input} value={v.description ?? ''} onChange={(e) => updateArr(data, onChange, 'volunteering', i, { description: e.target.value })} /></div>
          </ItemCard>
        ))}
        <AddButton label="Add volunteering" onClick={() => onChange({ ...data, volunteering: [...data.volunteering, blankVolunteering()] })} />
      </Section>

      {/* Extracurricular */}
      <Section title="Extracurricular" icon={<Sparkle className="size-4" />} count={data.extracurricular.length}>
        {data.extracurricular.map((x, i) => (
          <ItemCard key={x.id} onRemove={() => onChange({ ...data, extracurricular: data.extracurricular.filter((y) => y.id !== x.id) })}>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Title"><input className={input} value={x.title} onChange={(e) => updateArr(data, onChange, 'extracurricular', i, { title: e.target.value })} /></Field>
              <Field label="Organization"><input className={input} value={x.organization ?? ''} onChange={(e) => updateArr(data, onChange, 'extracurricular', i, { organization: e.target.value })} /></Field>
            </div>
            <div className="mt-2"><label className={lbl}>Description (optional)</label><textarea rows={2} className={input} value={x.description ?? ''} onChange={(e) => updateArr(data, onChange, 'extracurricular', i, { description: e.target.value })} /></div>
          </ItemCard>
        ))}
        <AddButton label="Add activity" onClick={() => onChange({ ...data, extracurricular: [...data.extracurricular, blankExtracurricular()] })} />
      </Section>

      {/* Languages */}
      <Section title="Languages" icon={<LanguagesIcon className="size-4" />} count={data.languages.length}>
        {data.languages.map((l, i) => (
          <div key={l.id} className="mb-2 flex items-center gap-2">
            <input className={cn(input, 'flex-1')} placeholder="Language" value={l.name} onChange={(e) => updateArr(data, onChange, 'languages', i, { name: e.target.value })} />
            <input className={cn(input, 'w-40')} placeholder="Proficiency" value={l.proficiency ?? ''} onChange={(e) => updateArr(data, onChange, 'languages', i, { proficiency: e.target.value })} />
            <button onClick={() => onChange({ ...data, languages: data.languages.filter((x) => x.id !== l.id) })} className="rounded-lg border border-red-200 p-2 text-red-500 hover:bg-red-50"><Trash2 className="size-4" /></button>
          </div>
        ))}
        <AddButton label="Add language" onClick={() => onChange({ ...data, languages: [...data.languages, blankLanguage()] })} />
      </Section>

      {/* Interests */}
      <Section title="Interests" icon={<Heart className="size-4" />} count={data.interests.length}>
        {data.interests.map((it, i) => (
          <div key={it.id} className="mb-2 flex items-center gap-2">
            <input className={cn(input, 'flex-1')} placeholder="Interest" value={it.name} onChange={(e) => updateArr(data, onChange, 'interests', i, { name: e.target.value })} />
            <button onClick={() => onChange({ ...data, interests: data.interests.filter((x) => x.id !== it.id) })} className="rounded-lg border border-red-200 p-2 text-red-500 hover:bg-red-50"><Trash2 className="size-4" /></button>
          </div>
        ))}
        <AddButton label="Add interest" onClick={() => onChange({ ...data, interests: [...data.interests, blankInterest()] })} />
      </Section>
    </div>
  );
}

// ── helpers ────────────────────────────────────────────────────────────────
type ArrKey =
  | 'workExperience'
  | 'education'
  | 'skills'
  | 'projects'
  | 'certifications'
  | 'achievements'
  | 'positionsOfResponsibility'
  | 'publications'
  | 'extracurricular'
  | 'volunteering'
  | 'languages'
  | 'interests'
  | 'awards'
  | 'courses';
function updateArr<K extends ArrKey>(
  data: ResumeData,
  onChange: (d: ResumeData) => void,
  key: K,
  index: number,
  patch: Partial<ResumeData[K][number]>,
) {
  const arr = [...(data[key] as unknown[])] as ResumeData[K];
  arr[index] = { ...arr[index], ...patch } as ResumeData[K][number];
  onChange({ ...data, [key]: arr });
}

function blankExperience(): WorkExperience {
  return { id: newId(), position: '', company: '', location: '', startDate: '', endDate: '', current: false, description: [''] };
}
function blankEducation(): Education {
  return { id: newId(), degree: '', institution: '', location: '', startDate: '', endDate: '', gpa: '', description: '' };
}
function blankProject(): Project {
  return { id: newId(), name: '', description: '', technologies: [], link: '' };
}
function blankCert(): Certification {
  return { id: newId(), name: '', issuer: '', date: '', link: '' };
}
function blankAchievement(): Achievement {
  return { id: newId(), title: '', description: '', date: '' };
}
function blankPosition(): PositionOfResponsibility {
  return { id: newId(), role: '', organization: '', startDate: '', endDate: '', current: false, description: '' };
}
function blankPublication(): Publication {
  return { id: newId(), title: '', venue: '', date: '', link: '', description: '' };
}
function blankExtracurricular(): Extracurricular {
  return { id: newId(), title: '', organization: '', description: '' };
}
function blankVolunteering(): Volunteering {
  return { id: newId(), role: '', organization: '', startDate: '', endDate: '', current: false, description: '' };
}
function blankLanguage(): Language {
  return { id: newId(), name: '', proficiency: '' };
}
function blankInterest(): Interest {
  return { id: newId(), name: '' };
}
function blankAward(): Award {
  return { id: newId(), title: '', issuer: '', date: '', description: '' };
}
function blankCourse(): Course {
  return { id: newId(), name: '', provider: '', date: '', link: '' };
}

function Section({
  title,
  icon,
  count,
  defaultOpen,
  action,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  count?: number;
  defaultOpen?: boolean;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  return (
    <div className={cn('overflow-hidden rounded-xl border bg-white shadow-sm transition-colors', open ? 'border-orange/30' : 'border-slate-200')}>
      <div className="flex items-center justify-between px-3 py-2.5">
        <button onClick={() => setOpen((o) => !o)} className="flex flex-1 items-center gap-2.5 text-left">
          <span className={cn('grid size-7 shrink-0 place-items-center rounded-lg transition-colors', open ? 'bg-orange/10 text-orange' : 'bg-slate-100 text-slate-600')}>{icon}</span>
          <span className="text-sm font-bold text-navy">{title}</span>
          {count !== undefined && count > 0 && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">{count}</span>}
        </button>
        <div className="flex items-center gap-2">
          {action}
          <button onClick={() => setOpen((o) => !o)} className="rounded-lg p-1 hover:bg-slate-50">
            <ChevronDown className={cn('size-4 text-slate-500 transition-transform', open && 'rotate-180')} />
          </button>
        </div>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="border-t border-slate-100 p-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <label className={cn('block', full && 'col-span-2')}>
      <span className={lbl}>{label}</span>
      {children}
    </label>
  );
}

function ItemCard({ onRemove, children }: { onRemove: () => void; children: React.ReactNode }) {
  return (
    <div className="mb-3 rounded-lg border border-slate-100 bg-slate-50/60 p-3">
      <div className="mb-2 flex justify-end">
        <button onClick={onRemove} className="rounded-lg border border-red-200 p-1.5 text-red-500 hover:bg-red-50"><Trash2 className="size-3.5" /></button>
      </div>
      {children}
    </div>
  );
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:border-orange hover:text-orange">
      <Plus className="size-4" /> {label}
    </button>
  );
}

export { Lightbulb };
