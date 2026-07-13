import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { ResumeBuilder } from '@/components/resume/ResumeBuilder';
import { SubscriptionLockGate } from '@/components/billing/SubscriptionLockGate';
import { FileText, Gauge, LayoutTemplate, Sparkles } from 'lucide-react';

export const metadata = {
  title: 'Resume Builder · ZSkillup',
  description: 'Build a professional, ATS-friendly resume from scratch with live preview and PDF export.',
};

const PILLS = [
  { icon: LayoutTemplate, label: '12 templates' },
  { icon: Gauge, label: 'Live ATS score' },
  { icon: Sparkles, label: 'AI tailoring' },
  { icon: FileText, label: 'One-click PDF' },
];

export default function ResumeBuilderPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Home', href: '/dashboard' }, { label: 'Resume Builder' }]} />

      {/* Hero */}
      <header className="night-hero rounded-2xl p-6 shadow-sm sm:p-8">
        <div className="relative z-[1]">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-xl bg-white/10 ring-1 ring-white/20 backdrop-blur">
              <FileText className="size-6 text-orange" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-white/50">Career</p>
              <h1 className="text-[26px] font-extrabold tracking-tight sm:text-[28px]">Resume Builder</h1>
            </div>
          </div>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/70">
            Craft a polished, ATS-friendly resume from scratch - pick a template, edit with live preview, check
            your ATS score, and export to PDF in one click.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {PILLS.map((p) => {
              const Icon = p.icon;
              return (
                <span key={p.label} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/80 ring-1 ring-white/15">
                  <Icon className="size-3.5 text-orange" /> {p.label}
                </span>
              );
            })}
          </div>
        </div>
      </header>

      <SubscriptionLockGate tool="resume" feature="Resume Builder">
        <ResumeBuilder />
      </SubscriptionLockGate>
    </div>
  );
}
