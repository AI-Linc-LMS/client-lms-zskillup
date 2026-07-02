'use client';

import { useState } from 'react';
import type {
  Certification,
  Education,
  Project,
  ResumeData,
  Skill,
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
  Award,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const input =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange';
const lbl = 'mb-1 block text-[11px] font-medium text-slate-500';

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
    <div className="space-y-3">
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
      <Section title="Certifications" icon={<Award className="size-4" />} count={data.certifications.length}>
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
    </div>
  );
}

// ── helpers ────────────────────────────────────────────────────────────────
type ArrKey = 'workExperience' | 'education' | 'skills' | 'projects' | 'certifications';
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
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between px-4 py-3">
        <button onClick={() => setOpen((o) => !o)} className="flex flex-1 items-center gap-2 text-left">
          <span className="text-slate-500">{icon}</span>
          <span className="text-sm font-bold text-navy">{title}</span>
          {count !== undefined && count > 0 && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">{count}</span>}
        </button>
        <div className="flex items-center gap-2">
          {action}
          <button onClick={() => setOpen((o) => !o)}>
            <ChevronDown className={cn('size-4 text-slate-400 transition-transform', open && 'rotate-180')} />
          </button>
        </div>
      </div>
      {open && <div className="border-t border-slate-100 p-4">{children}</div>}
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
