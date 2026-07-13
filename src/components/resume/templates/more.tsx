import type { TemplateProps } from '../types';
import { dateRange, fullName } from '../types';
import { groupSkills, socialList } from './parts';

/* Additional resume templates (R5). Same { data } contract as the core six. */

function Bullets({ items, color = 'text-slate-700' }: { items: string[]; color?: string }) {
  const list = items.filter((x) => x.trim());
  if (!list.length) return null;
  return (
    <ul className={`mt-1 list-disc space-y-0.5 pl-4 text-[12.5px] leading-snug ${color}`}>
      {list.map((b, i) => <li key={i}>{b}</li>)}
    </ul>
  );
}

// ─── Technical: skills matrix, mono headings ──────────────────────────────────
export function TechnicalTemplate({ data }: TemplateProps) {
  const b = data.basicInfo;
  const grouped = groupSkills(data.skills);
  const head = (t: string) => (
    <h2 className="mb-1.5 font-mono text-[12px] font-bold uppercase tracking-widest text-emerald-700">// {t}</h2>
  );
  return (
    <div className="px-10 py-9 text-slate-800">
      <header className="mb-4">
        <h1 className="font-mono text-[26px] font-black text-slate-900">{fullName(b) || 'Your Name'}</h1>
        <p className="text-sm font-semibold text-emerald-700">{b.professionalTitle}</p>
        <p className="mt-1 font-mono text-[11px] text-slate-500">{socialList(data).map((s) => `${s.value}`).join('  |  ')}</p>
      </header>
      {b.summary && <section className="mb-4">{head('summary')}<p className="text-[12.5px] leading-snug text-slate-700">{b.summary}</p></section>}
      {data.skills.length > 0 && (
        <section className="mb-4">{head('skills')}
          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
            {Object.entries(grouped).map(([cat, list]) => (
              <p key={cat} className="text-[12px]"><span className="font-mono font-semibold text-slate-600">{cat}:</span> {list.map((s) => s.name).join(', ')}</p>
            ))}
          </div>
        </section>
      )}
      {data.workExperience.length > 0 && (
        <section className="mb-4">{head('experience')}
          {data.workExperience.map((w) => (
            <div key={w.id} className="mb-2.5"><div className="flex items-baseline justify-between"><p className="text-[13px] font-bold">{w.position} · {w.company}</p><span className="font-mono text-[11px] text-slate-500">{dateRange(w.startDate, w.endDate, w.current)}</span></div><Bullets items={w.description} /></div>
          ))}
        </section>
      )}
      {data.projects.length > 0 && (
        <section className="mb-4">{head('projects')}
          {data.projects.map((p) => (<div key={p.id} className="mb-2"><p className="text-[12.5px] font-bold">{p.name} <span className="font-mono text-[11px] font-normal text-emerald-700">[{p.technologies.join(', ')}]</span></p><p className="text-[12px] text-slate-700">{p.description}</p></div>))}
        </section>
      )}
      {data.education.length > 0 && (
        <section>{head('education')}{data.education.map((e) => (<p key={e.id} className="text-[12px] text-slate-700">{e.degree} · {e.institution} · <span className="font-mono">{dateRange(e.startDate, e.endDate)}</span></p>))}</section>
      )}
    </div>
  );
}

// ─── AccentBar: thin colored left bar ─────────────────────────────────────────
export function AccentBarTemplate({ data }: TemplateProps) {
  const b = data.basicInfo;
  const head = (t: string) => <h2 className="mb-1.5 text-[13px] font-bold uppercase tracking-[0.14em] text-rose-600">{t}</h2>;
  return (
    <div className="flex min-h-full">
      <div className="w-2 bg-rose-500" />
      <div className="flex-1 px-10 py-9 text-slate-800">
        <header className="mb-4 border-b border-slate-200 pb-3">
          <h1 className="text-[28px] font-black text-slate-900">{fullName(b) || 'Your Name'}</h1>
          <p className="text-sm font-semibold text-rose-600">{b.professionalTitle}</p>
          <p className="mt-1 text-[11px] text-slate-500">{socialList(data).map((s) => s.value).join('  •  ')}</p>
        </header>
        {b.summary && <section className="mb-4">{head('Summary')}<p className="text-[12.5px] leading-snug text-slate-700">{b.summary}</p></section>}
        {data.workExperience.length > 0 && (
          <section className="mb-4">{head('Experience')}{data.workExperience.map((w) => (<div key={w.id} className="mb-2.5"><div className="flex items-baseline justify-between"><p className="text-[13px] font-bold">{w.position}</p><span className="text-[11px] text-slate-500">{dateRange(w.startDate, w.endDate, w.current)}</span></div><p className="text-[12px] font-medium text-rose-600">{w.company}</p><Bullets items={w.description} /></div>))}</section>
        )}
        <div className="grid grid-cols-2 gap-6">
          {data.skills.length > 0 && <section>{head('Skills')}<p className="text-[12px] text-slate-700">{data.skills.map((s) => s.name).join(' · ')}</p></section>}
          {data.education.length > 0 && <section>{head('Education')}{data.education.map((e) => (<div key={e.id} className="mb-1"><p className="text-[12px] font-bold">{e.degree}</p><p className="text-[11.5px] text-slate-700">{e.institution} · {dateRange(e.startDate, e.endDate)}</p></div>))}</section>}
        </div>
        {data.projects.length > 0 && <section className="mt-4">{head('Projects')}{data.projects.map((p) => (<p key={p.id} className="mb-1 text-[12px] text-slate-700"><span className="font-bold">{p.name}:</span> {p.description}</p>))}</section>}
      </div>
    </div>
  );
}

// ─── RightSidebar ─────────────────────────────────────────────────────────────
export function RightSidebarTemplate({ data }: TemplateProps) {
  const b = data.basicInfo;
  const head = (t: string) => <h2 className="mb-1.5 text-[13px] font-bold uppercase tracking-[0.14em] text-slate-800">{t}</h2>;
  return (
    <div className="flex min-h-full text-slate-800">
      <main className="flex-1 px-8 py-8">
        <header className="mb-4"><h1 className="text-[28px] font-black text-slate-900">{fullName(b) || 'Your Name'}</h1><p className="text-sm font-semibold text-indigo-600">{b.professionalTitle}</p></header>
        {b.summary && <section className="mb-4">{head('Summary')}<p className="text-[12.5px] leading-snug text-slate-700">{b.summary}</p></section>}
        {data.workExperience.length > 0 && <section className="mb-4">{head('Experience')}{data.workExperience.map((w) => (<div key={w.id} className="mb-2.5"><div className="flex items-baseline justify-between"><p className="text-[13px] font-bold">{w.position}</p><span className="text-[11px] text-slate-500">{dateRange(w.startDate, w.endDate, w.current)}</span></div><p className="text-[12px] font-medium text-indigo-600">{w.company}</p><Bullets items={w.description} /></div>))}</section>}
        {data.projects.length > 0 && <section>{head('Projects')}{data.projects.map((p) => (<div key={p.id} className="mb-2"><p className="text-[12.5px] font-bold">{p.name}</p><p className="text-[12px] text-slate-700">{p.description}</p></div>))}</section>}
      </main>
      <aside className="w-[32%] bg-slate-100 px-6 py-8">
        {b.photo && <img src={b.photo} alt="" className="mb-4 size-20 rounded-full object-cover" />}
        <div className="space-y-1.5 text-[11.5px] text-slate-700">{socialList(data).map((s) => (<p key={s.label} className="break-words"><span className="font-semibold text-slate-500">{s.label}: </span>{s.value}</p>))}</div>
        {data.skills.length > 0 && <div className="mt-6"><p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-indigo-600">Skills</p><div className="flex flex-wrap gap-1.5">{data.skills.map((s) => (<span key={s.id} className="rounded bg-white px-2 py-0.5 text-[11px] text-slate-700">{s.name}</span>))}</div></div>}
        {data.education.length > 0 && <div className="mt-6"><p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-indigo-600">Education</p>{data.education.map((e) => (<div key={e.id} className="mb-2"><p className="text-[11.5px] font-bold text-slate-800">{e.degree}</p><p className="text-[11px] text-slate-600">{e.institution}</p></div>))}</div>}
        {data.certifications.length > 0 && <div className="mt-6"><p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-indigo-600">Certifications</p>{data.certifications.map((c) => (<p key={c.id} className="text-[11px] text-slate-600">{c.name}</p>))}</div>}
      </aside>
    </div>
  );
}

// ─── Western (AltaCV-inspired) ────────────────────────────────────────────────
export function WesternTemplate({ data }: TemplateProps) {
  const b = data.basicInfo;
  const head = (t: string) => <h2 className="mb-1.5 border-b-2 border-amber-500 pb-0.5 text-[13px] font-black uppercase tracking-[0.12em] text-amber-700">{t}</h2>;
  return (
    <div className="px-9 py-8 text-slate-800">
      <header className="mb-5 flex items-center gap-5">
        {b.photo && <img src={b.photo} alt="" className="size-24 rounded-full object-cover ring-4 ring-amber-100" />}
        <div><h1 className="text-[30px] font-black leading-none text-slate-900">{fullName(b) || 'Your Name'}</h1><p className="mt-1 text-sm font-bold uppercase tracking-[0.2em] text-amber-700">{b.professionalTitle}</p><p className="mt-1.5 text-[11px] text-slate-500">{socialList(data).map((s) => s.value).join('  •  ')}</p></div>
      </header>
      <div className="grid grid-cols-[1.6fr_1fr] gap-7">
        <div>
          {b.summary && <section className="mb-4">{head('Profile')}<p className="text-[12.5px] leading-snug text-slate-700">{b.summary}</p></section>}
          {data.workExperience.length > 0 && <section className="mb-4">{head('Experience')}{data.workExperience.map((w) => (<div key={w.id} className="mb-2.5"><p className="text-[13px] font-bold">{w.position}</p><p className="text-[12px] font-semibold text-amber-700">{w.company} · <span className="font-normal text-slate-500">{dateRange(w.startDate, w.endDate, w.current)}</span></p><Bullets items={w.description} /></div>))}</section>}
          {data.projects.length > 0 && <section>{head('Projects')}{data.projects.map((p) => (<div key={p.id} className="mb-2"><p className="text-[12.5px] font-bold">{p.name}</p><p className="text-[12px] text-slate-700">{p.description}</p></div>))}</section>}
        </div>
        <div>
          {data.skills.length > 0 && <section className="mb-4">{head('Skills')}<div className="flex flex-wrap gap-1.5">{data.skills.map((s) => (<span key={s.id} className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] text-amber-800">{s.name}</span>))}</div></section>}
          {data.education.length > 0 && <section className="mb-4">{head('Education')}{data.education.map((e) => (<div key={e.id} className="mb-2"><p className="text-[12px] font-bold">{e.degree}</p><p className="text-[11px] text-slate-600">{e.institution}</p><p className="text-[10.5px] text-slate-500">{dateRange(e.startDate, e.endDate)}</p></div>))}</section>}
          {data.certifications.length > 0 && <section>{head('Certifications')}{data.certifications.map((c) => (<p key={c.id} className="mb-1 text-[11px] text-slate-700">{c.name}</p>))}</section>}
        </div>
      </div>
    </div>
  );
}

// ─── LuxSleek: elegant serif + gold ───────────────────────────────────────────
export function LuxSleekTemplate({ data }: TemplateProps) {
  const b = data.basicInfo;
  const head = (t: string) => <h2 className="mb-2 text-center text-[12px] font-semibold uppercase tracking-[0.3em] text-[#b08d57]">{t}</h2>;
  return (
    <div className="px-14 py-12 font-serif text-slate-800">
      <header className="mb-6 text-center">
        <h1 className="text-[34px] font-bold tracking-wide text-slate-900">{fullName(b) || 'Your Name'}</h1>
        <div className="mx-auto my-2 h-px w-24 bg-[#b08d57]" />
        <p className="text-sm uppercase tracking-[0.28em] text-[#b08d57]">{b.professionalTitle}</p>
        <p className="mt-2 text-[11px] text-slate-500">{socialList(data).map((s) => s.value).join('   ·   ')}</p>
      </header>
      <div className="space-y-5">
        {b.summary && <section>{head('Profile')}<p className="text-center text-[12.5px] leading-relaxed text-slate-700">{b.summary}</p></section>}
        {data.workExperience.length > 0 && <section>{head('Experience')}{data.workExperience.map((w) => (<div key={w.id} className="mb-3 text-center"><p className="text-[13px] font-bold">{w.position} - {w.company}</p><p className="text-[11px] italic text-slate-500">{dateRange(w.startDate, w.endDate, w.current)}</p><div className="mx-auto max-w-[90%]"><Bullets items={w.description} /></div></div>))}</section>}
        {data.education.length > 0 && <section>{head('Education')}{data.education.map((e) => (<p key={e.id} className="text-center text-[12px] text-slate-700">{e.degree}, {e.institution} · {dateRange(e.startDate, e.endDate)}</p>))}</section>}
        {data.skills.length > 0 && <section>{head('Skills')}<p className="text-center text-[12px] text-slate-700">{data.skills.map((s) => s.name).join('   ·   ')}</p></section>}
      </div>
    </div>
  );
}

// ─── Bubble: playful rounded cards ────────────────────────────────────────────
export function BubbleTemplate({ data }: TemplateProps) {
  const b = data.basicInfo;
  const head = (t: string) => <h2 className="mb-2 inline-block rounded-full bg-sky-500 px-3 py-0.5 text-[12px] font-bold uppercase tracking-wide text-white">{t}</h2>;
  return (
    <div className="bg-sky-50/40 px-9 py-8 text-slate-800">
      <header className="mb-5 flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm">
        {b.photo && <img src={b.photo} alt="" className="size-16 rounded-full object-cover" />}
        <div><h1 className="text-[26px] font-black text-slate-900">{fullName(b) || 'Your Name'}</h1><p className="text-sm font-semibold text-sky-600">{b.professionalTitle}</p><p className="mt-0.5 text-[11px] text-slate-500">{socialList(data).map((s) => s.value).join('  •  ')}</p></div>
      </header>
      {b.summary && <section className="mb-4 rounded-2xl bg-white p-4 shadow-sm">{head('About')}<p className="text-[12.5px] leading-snug text-slate-700">{b.summary}</p></section>}
      {data.workExperience.length > 0 && <section className="mb-4 rounded-2xl bg-white p-4 shadow-sm">{head('Experience')}{data.workExperience.map((w) => (<div key={w.id} className="mb-2.5"><div className="flex items-baseline justify-between"><p className="text-[13px] font-bold">{w.position}</p><span className="text-[11px] text-slate-500">{dateRange(w.startDate, w.endDate, w.current)}</span></div><p className="text-[12px] font-medium text-sky-600">{w.company}</p><Bullets items={w.description} /></div>))}</section>}
      <div className="grid grid-cols-2 gap-4">
        {data.skills.length > 0 && <section className="rounded-2xl bg-white p-4 shadow-sm">{head('Skills')}<div className="flex flex-wrap gap-1.5">{data.skills.map((s) => (<span key={s.id} className="rounded-full bg-sky-100 px-2.5 py-0.5 text-[11px] text-sky-700">{s.name}</span>))}</div></section>}
        {data.education.length > 0 && <section className="rounded-2xl bg-white p-4 shadow-sm">{head('Education')}{data.education.map((e) => (<div key={e.id} className="mb-1"><p className="text-[12px] font-bold">{e.degree}</p><p className="text-[11px] text-slate-600">{e.institution}</p></div>))}</section>}
      </div>
      {data.projects.length > 0 && <section className="mt-4 rounded-2xl bg-white p-4 shadow-sm">{head('Projects')}{data.projects.map((p) => (<p key={p.id} className="mb-1 text-[12px] text-slate-700"><span className="font-bold">{p.name}:</span> {p.description}</p>))}</section>}
    </div>
  );
}
