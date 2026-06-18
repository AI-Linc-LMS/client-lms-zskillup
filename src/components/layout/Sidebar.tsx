'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { navForPath } from './nav-config';

/**
 * Workspace sidebar — route-aware (student / super-admin / TPO). Pure
 * navigation: the placement-readiness (PPS) footer was removed with the rest of
 * the Sprint-7 surfaces, so nothing here renders fabricated data.
 */
export function Sidebar() {
  const pathname = usePathname();
  const sections = navForPath(pathname);

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-[var(--color-line)] bg-white md:flex">
      <nav className="scroll-soft flex-1 space-y-5 overflow-y-auto px-3 py-5" aria-label="Workspace">
        {sections.map((section) => (
          <div key={section.heading}>
            <p className="group-label mb-2 px-3">{section.heading}</p>
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
                          ? 'bg-[var(--color-primary-highlight)] font-semibold text-[var(--color-primary)]'
                          : 'font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]',
                      )}
                    >
                      <Icon
                        className={cn(
                          'size-4 shrink-0',
                          active ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-subtle)]',
                        )}
                        aria-hidden="true"
                      />
                      <span className="flex-1 truncate">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
