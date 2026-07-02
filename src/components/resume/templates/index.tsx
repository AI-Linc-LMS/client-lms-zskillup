import type { ComponentType } from 'react';
import type { ResumeData, TemplateKey, TemplateProps } from '../types';
import { dateRange, fullName } from '../types';
import { groupSkills, socialList } from './parts';
import {
  AccentBarTemplate,
  BubbleTemplate,
  LuxSleekTemplate,
  RightSidebarTemplate,
  TechnicalTemplate,
  WesternTemplate,
} from './more';

/*
 * Resume templates. Each is a pure component taking { data } and rendering an
 * A4-width block (the parent sets the 794px page). Concrete colors (no CSS vars)
 * so html-to-image → jsPDF export is faithful. Six ship here; more in R5.
 */

const H = ({ children, color = '#0f172a' }: { children: React.ReactNode; color?: string }) => (
  <h2 style={{ color }} className="mb-2 text-[13px] font-bold uppercase tracking-[0.14em]">
    {children}
  </h2>
);

function Bullets({ items }: { items: string[] }) {
  const list = items.filter((x) => x.trim());
  if (list.length === 0) return null;
  return (
    <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[12.5px] leading-snug text-slate-700">
      {list.map((b, i) => (
        <li key={i}>{b}</li>
      ))}
    </ul>
  );
}

// ─── Modern: dark left sidebar ────────────────────────────────────────────────
function ModernTemplate({ data }: TemplateProps) {
  const b = data.basicInfo;
  return (
    <div className="flex min-h-full text-slate-800">
      <aside className="w-[34%] bg-[#0f2544] px-6 py-8 text-white">
        {b.photo && (
          <img src={b.photo} alt="" className="mb-4 size-24 rounded-full object-cover ring-2 ring-white/30" />
        )}
        <h1 className="text-2xl font-black leading-tight">{fullName(b) || 'Your Name'}</h1>
        <p className="mt-1 text-sm font-medium text-sky-300">{b.professionalTitle}</p>
        <div className="mt-6 space-y-2 text-[11.5px] text-slate-200">
          {socialList(data).map((s) => (
            <div key={s.label}>
              <span className="block text-[9px] font-bold uppercase tracking-widest text-sky-300">{s.label}</span>
              <span className="break-words">{s.value}</span>
            </div>
          ))}
        </div>
        {data.skills.length > 0 && (
          <div className="mt-6">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-sky-300">Skills</p>
            <div className="space-y-2">
              {data.skills.map((s) => (
                <div key={s.id}>
                  <div className="flex justify-between text-[11px]"><span>{s.name}</span></div>
                  {s.level ? (
                    <div className="mt-0.5 h-1 rounded bg-white/15">
                      <div className="h-1 rounded bg-sky-400" style={{ width: `${(s.level / 5) * 100}%` }} />
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        )}
      </aside>
      <main className="flex-1 px-7 py-8">
        {b.summary && (
          <section className="mb-5">
            <H>Summary</H>
            <p className="text-[12.5px] leading-snug text-slate-700">{b.summary}</p>
          </section>
        )}
        {data.workExperience.length > 0 && (
          <section className="mb-5">
            <H>Experience</H>
            {data.workExperience.map((w) => (
              <div key={w.id} className="mb-3">
                <div className="flex items-baseline justify-between">
                  <p className="text-[13px] font-bold text-slate-900">{w.position}</p>
                  <span className="text-[11px] text-slate-500">{dateRange(w.startDate, w.endDate, w.current)}</span>
                </div>
                <p className="text-[12px] font-medium text-[#0f2544]">{[w.company, w.location].filter(Boolean).join(' · ')}</p>
                <Bullets items={w.description} />
              </div>
            ))}
          </section>
        )}
        {data.projects.length > 0 && (
          <section className="mb-5">
            <H>Projects</H>
            {data.projects.map((p) => (
              <div key={p.id} className="mb-2">
                <p className="text-[12.5px] font-bold text-slate-900">{p.name}</p>
                <p className="text-[12px] text-slate-700">{p.description}</p>
                {p.technologies.length > 0 && (
                  <p className="text-[11px] text-slate-500">{p.technologies.join(' · ')}</p>
                )}
              </div>
            ))}
          </section>
        )}
        {data.education.length > 0 && (
          <section className="mb-5">
            <H>Education</H>
            {data.education.map((e) => (
              <div key={e.id} className="mb-2">
                <div className="flex items-baseline justify-between">
                  <p className="text-[12.5px] font-bold text-slate-900">{e.degree}</p>
                  <span className="text-[11px] text-slate-500">{dateRange(e.startDate, e.endDate)}</span>
                </div>
                <p className="text-[12px] text-slate-700">{[e.institution, e.location].filter(Boolean).join(' · ')}{e.gpa ? ` · ${e.gpa}` : ''}</p>
              </div>
            ))}
          </section>
        )}
        {data.certifications.length > 0 && (
          <section>
            <H>Certifications</H>
            {data.certifications.map((c) => (
              <p key={c.id} className="text-[12px] text-slate-700">
                <span className="font-semibold">{c.name}</span> — {c.issuer} {c.date ? `(${c.date})` : ''}
              </p>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}

// ─── Classic: centered header, single column ──────────────────────────────────
function ClassicTemplate({ data }: TemplateProps) {
  const b = data.basicInfo;
  const contact = socialList(data).map((s) => s.value);
  return (
    <div className="px-12 py-10 text-slate-800">
      <header className="border-b-2 border-slate-800 pb-3 text-center">
        <h1 className="text-3xl font-black tracking-tight text-slate-900">{fullName(b) || 'Your Name'}</h1>
        <p className="mt-1 text-sm font-semibold uppercase tracking-[0.2em] text-slate-600">{b.professionalTitle}</p>
        <p className="mt-2 text-[11.5px] text-slate-600">{contact.join('  •  ')}</p>
      </header>
      <div className="mt-5 space-y-5">
        {b.summary && (
          <section><H>Professional Summary</H><p className="text-[12.5px] leading-snug text-slate-700">{b.summary}</p></section>
        )}
        {data.workExperience.length > 0 && (
          <section>
            <H>Experience</H>
            {data.workExperience.map((w) => (
              <div key={w.id} className="mb-3">
                <div className="flex items-baseline justify-between">
                  <p className="text-[13px] font-bold">{w.position} — {w.company}</p>
                  <span className="text-[11px] text-slate-500">{dateRange(w.startDate, w.endDate, w.current)}</span>
                </div>
                {w.location && <p className="text-[11.5px] italic text-slate-500">{w.location}</p>}
                <Bullets items={w.description} />
              </div>
            ))}
          </section>
        )}
        {data.education.length > 0 && (
          <section>
            <H>Education</H>
            {data.education.map((e) => (
              <div key={e.id} className="mb-2 flex items-baseline justify-between">
                <div>
                  <p className="text-[12.5px] font-bold">{e.degree}</p>
                  <p className="text-[12px] text-slate-700">{e.institution}{e.gpa ? ` · ${e.gpa}` : ''}</p>
                </div>
                <span className="text-[11px] text-slate-500">{dateRange(e.startDate, e.endDate)}</span>
              </div>
            ))}
          </section>
        )}
        {data.skills.length > 0 && (
          <section><H>Skills</H><p className="text-[12.5px] text-slate-700">{data.skills.map((s) => s.name).join('  •  ')}</p></section>
        )}
        {data.projects.length > 0 && (
          <section>
            <H>Projects</H>
            {data.projects.map((p) => (
              <div key={p.id} className="mb-2">
                <p className="text-[12.5px] font-bold">{p.name}{p.technologies.length ? <span className="font-normal text-slate-500"> — {p.technologies.join(', ')}</span> : null}</p>
                <p className="text-[12px] text-slate-700">{p.description}</p>
              </div>
            ))}
          </section>
        )}
        {data.certifications.length > 0 && (
          <section><H>Certifications</H>{data.certifications.map((c) => (
            <p key={c.id} className="text-[12px] text-slate-700"><span className="font-semibold">{c.name}</span> — {c.issuer} {c.date ? `(${c.date})` : ''}</p>
          ))}</section>
        )}
      </div>
    </div>
  );
}

// ─── Minimal: airy, thin rules ────────────────────────────────────────────────
function MinimalTemplate({ data }: TemplateProps) {
  const b = data.basicInfo;
  return (
    <div className="px-12 py-12 text-slate-800">
      <h1 className="text-[32px] font-light tracking-tight text-slate-900">{fullName(b) || 'Your Name'}</h1>
      <p className="text-sm tracking-wide text-slate-500">{b.professionalTitle}</p>
      <p className="mt-2 text-[11.5px] text-slate-500">{socialList(data).map((s) => s.value).join('   /   ')}</p>
      <div className="mt-8 space-y-6">
        {b.summary && <p className="text-[13px] leading-relaxed text-slate-700">{b.summary}</p>}
        {data.workExperience.length > 0 && (
          <section>
            <p className="mb-3 border-b border-slate-200 pb-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Experience</p>
            {data.workExperience.map((w) => (
              <div key={w.id} className="mb-4">
                <div className="flex items-baseline justify-between">
                  <p className="text-[13px] font-semibold text-slate-900">{w.position}, {w.company}</p>
                  <span className="text-[11px] text-slate-400">{dateRange(w.startDate, w.endDate, w.current)}</span>
                </div>
                <Bullets items={w.description} />
              </div>
            ))}
          </section>
        )}
        {data.projects.length > 0 && (
          <section>
            <p className="mb-3 border-b border-slate-200 pb-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Projects</p>
            {data.projects.map((p) => (
              <div key={p.id} className="mb-3"><p className="text-[13px] font-semibold text-slate-900">{p.name}</p><p className="text-[12.5px] text-slate-700">{p.description}</p><p className="text-[11px] text-slate-400">{p.technologies.join(' · ')}</p></div>
            ))}
          </section>
        )}
        {data.education.length > 0 && (
          <section>
            <p className="mb-3 border-b border-slate-200 pb-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Education</p>
            {data.education.map((e) => (
              <div key={e.id} className="mb-2 flex items-baseline justify-between"><p className="text-[12.5px] text-slate-800">{e.degree} — {e.institution}</p><span className="text-[11px] text-slate-400">{dateRange(e.startDate, e.endDate)}</span></div>
            ))}
          </section>
        )}
        {data.skills.length > 0 && (
          <section>
            <p className="mb-3 border-b border-slate-200 pb-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Skills</p>
            <p className="text-[12.5px] text-slate-700">{data.skills.map((s) => s.name).join('   ·   ')}</p>
          </section>
        )}
      </div>
    </div>
  );
}

// ─── Creative: gradient sidebar ───────────────────────────────────────────────
function CreativeTemplate({ data }: TemplateProps) {
  const b = data.basicInfo;
  return (
    <div className="flex min-h-full text-slate-800">
      <aside className="w-[35%] bg-gradient-to-b from-[#6d3bf5] to-[#3b1e8f] px-6 py-8 text-white">
        {b.photo && <img src={b.photo} alt="" className="mb-4 size-24 rounded-2xl object-cover" />}
        <h1 className="text-2xl font-black leading-tight">{fullName(b) || 'Your Name'}</h1>
        <p className="mt-1 text-sm text-purple-200">{b.professionalTitle}</p>
        <div className="mt-6 space-y-1.5 text-[11.5px] text-purple-50">
          {socialList(data).map((s) => (
            <p key={s.label} className="break-words"><span className="font-semibold">{s.label}: </span>{s.value}</p>
          ))}
        </div>
        {data.skills.length > 0 && (
          <div className="mt-6">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-purple-200">Skills</p>
            <div className="flex flex-wrap gap-1.5">
              {data.skills.map((s) => (<span key={s.id} className="rounded-full bg-white/15 px-2 py-0.5 text-[11px]">{s.name}</span>))}
            </div>
          </div>
        )}
        {data.certifications.length > 0 && (
          <div className="mt-6">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-purple-200">Certifications</p>
            {data.certifications.map((c) => (<p key={c.id} className="text-[11.5px] text-purple-50">{c.name} — {c.issuer}</p>))}
          </div>
        )}
      </aside>
      <main className="flex-1 px-7 py-8">
        {b.summary && (<section className="mb-5"><H color="#6d3bf5">About</H><p className="text-[12.5px] leading-snug text-slate-700">{b.summary}</p></section>)}
        {data.workExperience.length > 0 && (
          <section className="mb-5"><H color="#6d3bf5">Experience</H>
            {data.workExperience.map((w) => (
              <div key={w.id} className="mb-3"><div className="flex items-baseline justify-between"><p className="text-[13px] font-bold">{w.position}</p><span className="text-[11px] text-slate-500">{dateRange(w.startDate, w.endDate, w.current)}</span></div><p className="text-[12px] font-medium text-[#6d3bf5]">{w.company}</p><Bullets items={w.description} /></div>
            ))}
          </section>
        )}
        {data.projects.length > 0 && (
          <section className="mb-5"><H color="#6d3bf5">Projects</H>
            {data.projects.map((p) => (<div key={p.id} className="mb-2"><p className="text-[12.5px] font-bold">{p.name}</p><p className="text-[12px] text-slate-700">{p.description}</p><p className="text-[11px] text-slate-500">{p.technologies.join(' · ')}</p></div>))}
          </section>
        )}
        {data.education.length > 0 && (
          <section><H color="#6d3bf5">Education</H>
            {data.education.map((e) => (<div key={e.id} className="mb-2"><p className="text-[12.5px] font-bold">{e.degree}</p><p className="text-[12px] text-slate-700">{e.institution}{e.gpa ? ` · ${e.gpa}` : ''} · {dateRange(e.startDate, e.endDate)}</p></div>))}
          </section>
        )}
      </main>
    </div>
  );
}

// ─── Executive: dark header band ──────────────────────────────────────────────
function ExecutiveTemplate({ data }: TemplateProps) {
  const b = data.basicInfo;
  return (
    <div className="text-slate-800">
      <header className="bg-slate-900 px-12 py-8 text-white">
        <h1 className="text-3xl font-black tracking-tight">{fullName(b) || 'Your Name'}</h1>
        <p className="mt-1 text-sm font-medium uppercase tracking-[0.22em] text-amber-300">{b.professionalTitle}</p>
        <p className="mt-3 text-[11.5px] text-slate-300">{socialList(data).map((s) => s.value).join('   |   ')}</p>
      </header>
      <div className="space-y-5 px-12 py-8">
        {b.summary && (<section><H color="#0f172a">Executive Summary</H><p className="text-[12.5px] leading-snug text-slate-700">{b.summary}</p></section>)}
        {data.workExperience.length > 0 && (
          <section><H color="#0f172a">Professional Experience</H>
            {data.workExperience.map((w) => (
              <div key={w.id} className="mb-3 border-l-2 border-amber-400 pl-3">
                <div className="flex items-baseline justify-between"><p className="text-[13px] font-bold">{w.position}</p><span className="text-[11px] text-slate-500">{dateRange(w.startDate, w.endDate, w.current)}</span></div>
                <p className="text-[12px] font-semibold text-slate-600">{[w.company, w.location].filter(Boolean).join(' · ')}</p>
                <Bullets items={w.description} />
              </div>
            ))}
          </section>
        )}
        <div className="grid grid-cols-2 gap-6">
          {data.education.length > 0 && (
            <section><H color="#0f172a">Education</H>{data.education.map((e) => (<div key={e.id} className="mb-2"><p className="text-[12px] font-bold">{e.degree}</p><p className="text-[11.5px] text-slate-700">{e.institution} · {dateRange(e.startDate, e.endDate)}</p></div>))}</section>
          )}
          {data.skills.length > 0 && (
            <section><H color="#0f172a">Core Competencies</H><p className="text-[12px] text-slate-700">{data.skills.map((s) => s.name).join(' · ')}</p></section>
          )}
        </div>
        {data.projects.length > 0 && (
          <section><H color="#0f172a">Selected Projects</H>{data.projects.map((p) => (<p key={p.id} className="mb-1 text-[12px] text-slate-700"><span className="font-bold">{p.name}:</span> {p.description}</p>))}</section>
        )}
      </div>
    </div>
  );
}

// ─── TwoColumn: balanced ──────────────────────────────────────────────────────
function TwoColumnTemplate({ data }: TemplateProps) {
  const b = data.basicInfo;
  const grouped = groupSkills(data.skills);
  return (
    <div className="px-10 py-9 text-slate-800">
      <header className="mb-5 border-b border-slate-300 pb-3">
        <h1 className="text-[28px] font-black tracking-tight text-slate-900">{fullName(b) || 'Your Name'}</h1>
        <p className="text-sm font-semibold text-teal-700">{b.professionalTitle}</p>
        <p className="mt-1 text-[11px] text-slate-500">{socialList(data).map((s) => s.value).join('  •  ')}</p>
      </header>
      <div className="grid grid-cols-[1.5fr_1fr] gap-7">
        <div>
          {b.summary && (<section className="mb-4"><H color="#0f766e">Summary</H><p className="text-[12.5px] leading-snug text-slate-700">{b.summary}</p></section>)}
          {data.workExperience.length > 0 && (
            <section className="mb-4"><H color="#0f766e">Experience</H>
              {data.workExperience.map((w) => (<div key={w.id} className="mb-3"><div className="flex items-baseline justify-between"><p className="text-[12.5px] font-bold">{w.position}</p><span className="text-[10.5px] text-slate-500">{dateRange(w.startDate, w.endDate, w.current)}</span></div><p className="text-[11.5px] font-medium text-teal-700">{w.company}</p><Bullets items={w.description} /></div>))}
            </section>
          )}
          {data.projects.length > 0 && (
            <section><H color="#0f766e">Projects</H>{data.projects.map((p) => (<div key={p.id} className="mb-2"><p className="text-[12px] font-bold">{p.name}</p><p className="text-[11.5px] text-slate-700">{p.description}</p></div>))}</section>
          )}
        </div>
        <div>
          {data.skills.length > 0 && (
            <section className="mb-4"><H color="#0f766e">Skills</H>{Object.entries(grouped).map(([cat, list]) => (<div key={cat} className="mb-2"><p className="text-[11px] font-semibold text-slate-600">{cat}</p><p className="text-[11.5px] text-slate-700">{list.map((s) => s.name).join(', ')}</p></div>))}</section>
          )}
          {data.education.length > 0 && (
            <section className="mb-4"><H color="#0f766e">Education</H>{data.education.map((e) => (<div key={e.id} className="mb-2"><p className="text-[11.5px] font-bold">{e.degree}</p><p className="text-[11px] text-slate-700">{e.institution}</p><p className="text-[10.5px] text-slate-500">{dateRange(e.startDate, e.endDate)}{e.gpa ? ` · ${e.gpa}` : ''}</p></div>))}</section>
          )}
          {data.certifications.length > 0 && (
            <section><H color="#0f766e">Certifications</H>{data.certifications.map((c) => (<p key={c.id} className="mb-1 text-[11px] text-slate-700"><span className="font-semibold">{c.name}</span><br />{c.issuer}{c.date ? ` · ${c.date}` : ''}</p>))}</section>
          )}
        </div>
      </div>
    </div>
  );
}

export interface TemplateMeta {
  key: TemplateKey;
  name: string;
  component: ComponentType<TemplateProps>;
}

export const TEMPLATES: TemplateMeta[] = [
  { key: 'modern', name: 'Modern', component: ModernTemplate },
  { key: 'classic', name: 'Classic', component: ClassicTemplate },
  { key: 'minimal', name: 'Minimal', component: MinimalTemplate },
  { key: 'creative', name: 'Creative', component: CreativeTemplate },
  { key: 'executive', name: 'Executive', component: ExecutiveTemplate },
  { key: 'twocolumn', name: 'Two Column', component: TwoColumnTemplate },
  { key: 'technical', name: 'Technical', component: TechnicalTemplate },
  { key: 'accentbar', name: 'Accent Bar', component: AccentBarTemplate },
  { key: 'rightsidebar', name: 'Right Sidebar', component: RightSidebarTemplate },
  { key: 'western', name: 'Western', component: WesternTemplate },
  { key: 'luxsleek', name: 'Lux Sleek', component: LuxSleekTemplate },
  { key: 'bubble', name: 'Bubble', component: BubbleTemplate },
];

export function templateByKey(key: TemplateKey): TemplateMeta {
  return TEMPLATES.find((t) => t.key === key) ?? TEMPLATES[0];
}

export type { ResumeData };
