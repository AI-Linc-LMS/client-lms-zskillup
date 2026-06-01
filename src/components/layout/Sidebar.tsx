'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { SIDEBAR_SECTIONS } from './nav-config';
import { PpsGauge } from './PpsGauge';
import { DEMO_PPS } from '@/lib/demo-data';

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-5" aria-label="Workspace">
        {SIDEBAR_SECTIONS.map((section) => (
          <div key={section.heading}>
            <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              {section.heading}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + '/');
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
                        active
                          ? 'bg-sky-50 font-semibold text-navy'
                          : 'font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-800',
                      )}
                    >
                      <Icon
                        className={cn('size-4 shrink-0', active ? 'text-navy' : 'text-slate-400')}
                        aria-hidden="true"
                      />
                      <span className="flex-1 truncate">{item.label}</span>
                      {typeof item.badge === 'number' ? (
                        <span className="grid min-w-[18px] place-items-center rounded-full bg-navy px-1.5 py-px text-[10px] font-bold text-white">
                          {item.badge}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-slate-200 p-3">
        <PpsGauge score={DEMO_PPS.score} delta={DEMO_PPS.delta} contextLine={DEMO_PPS.contextLine} />
      </div>
    </aside>
  );
}
