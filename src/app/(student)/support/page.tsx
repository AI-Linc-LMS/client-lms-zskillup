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
      <header className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#101a30] via-navy to-[#1c2b4a] p-6 text-white shadow-sm sm:p-8">
        <span aria-hidden className="pointer-events-none absolute -right-10 -top-10 size-48 rounded-full bg-orange/20 blur-3xl" />
        <span aria-hidden className="pointer-events-none absolute -bottom-16 left-1/3 size-48 rounded-full bg-orange/10 blur-3xl" />
        <div className="relative">
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
