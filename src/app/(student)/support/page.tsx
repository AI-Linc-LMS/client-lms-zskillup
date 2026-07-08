import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { StudentSupport } from '@/components/support/StudentSupport';
import { Clock, Headset, ShieldCheck } from 'lucide-react';

const PILLS = [
  { icon: Clock, label: 'Usually replies within a day' },
  { icon: ShieldCheck, label: 'Tracked, private tickets' },
];

export default function SupportPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Home', href: '/dashboard' }, { label: 'Help & Support' }]} />

      {/* Hero */}
      <header data-tour="support:hero" className="night-hero rounded-2xl p-6 shadow-sm sm:p-8">
        <div className="relative z-[1]">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-xl bg-white/10 ring-1 ring-white/20 backdrop-blur">
              <Headset className="size-6 text-orange" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-white/50">Support</p>
              <h1 className="text-[26px] font-extrabold tracking-tight sm:text-[28px]">Help &amp; Support</h1>
            </div>
          </div>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/70">
            Stuck on something? Pick a topic or raise a ticket, and our team will get back to you — every reply
            lands right here in one tracked conversation.
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

      <StudentSupport />
    </div>
  );
}
