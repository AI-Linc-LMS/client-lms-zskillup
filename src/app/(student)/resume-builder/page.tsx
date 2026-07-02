import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { ResumeBuilder } from '@/components/resume/ResumeBuilder';

export const metadata = {
  title: 'Resume Builder · ZSkillup',
  description: 'Build a professional, ATS-friendly resume from scratch with live preview and PDF export.',
};

export default function ResumeBuilderPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Home', href: '/dashboard' }, { label: 'Resume Builder' }]} />
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Career</p>
        <h1 className="mt-1 text-[28px] font-extrabold tracking-tight text-navy">Resume Builder</h1>
        <p className="mt-1 text-sm text-slate-500">
          Craft a polished resume from scratch — pick a template, edit live, and export to PDF.
        </p>
      </header>
      <ResumeBuilder />
    </div>
  );
}
