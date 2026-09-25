'use client';

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentType,
} from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface RowAction {
  key: string;
  label: string;
  icon?: ComponentType<{ className?: string }>;
  onSelect: () => void;
  disabled?: boolean;
  /** Colour by meaning, not decoration: warning = changes a live window, danger = destroys. */
  tone?: 'default' | 'warning' | 'success' | 'danger';
  /** Renders a divider above this item — for the one action you can't undo. */
  separated?: boolean;
  /** Shown under the label when an action needs a word of warning. */
  hint?: string;
}

const TONE: Record<NonNullable<RowAction['tone']>, string> = {
  default: 'text-slate-700 hover:bg-slate-50',
  warning: 'text-orange-700 hover:bg-orange-50',
  success: 'text-emerald-700 hover:bg-emerald-50',
  danger: 'text-red-700 hover:bg-red-50',
};

/** Space to leave between the menu and the viewport edge. */
const GUTTER = 8;

/**
 * THE ROW'S ACTIONS, BEHIND ONE BUTTON.
 *
 * A table with six actions spelled out on every row is mostly chrome: the eye has to
 * cross five links it does not want to reach the one it does, and every new action
 * makes the wall wider. One trigger per row keeps the table scannable and gives each
 * action room for a real label.
 *
 * The menu portals to <body> and positions itself with `fixed`, because it has to
 * escape TWO clipping ancestors — the card's `overflow-hidden` and the table's
 * `overflow-x-auto`. Rendered in place it would simply be cut off, and on the last
 * row it would open below the fold, so it measures itself and flips upward when
 * there is no room beneath.
 *
 * Keyboard: Enter/Space/↓ opens onto the first item, ↑ onto the last, arrows move,
 * Home/End jump, Escape closes and returns focus to the trigger. Because the menu is
 * positioned against a rect taken at open time, any scroll or resize closes it rather
 * than letting it drift away from its row.
 */
export function RowActionsMenu({
  items,
  label,
  className,
}: {
  items: RowAction[];
  /** What the trigger opens, for screen readers — e.g. "Actions for Weekly assessment". */
  label: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; right: number } | null>(null);
  const [active, setActive] = useState(-1);
  const [mounted, setMounted] = useState(false);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const menuId = useId();

  useEffect(() => setMounted(true), []);

  const enabled = items.filter((i) => !i.disabled);
  const close = useCallback((focusTrigger = true) => {
    setOpen(false);
    setActive(-1);
    if (focusTrigger) triggerRef.current?.focus();
  }, []);

  const openAt = (index: number) => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    // Right-aligned to the trigger; `top` is refined once the menu can be measured.
    setCoords({ top: rect.bottom + 4, right: Math.max(GUTTER, window.innerWidth - rect.right) });
    setActive(index);
    setOpen(true);
  };

  // Flip above the trigger when the menu would otherwise run off the bottom — the
  // last row of a long table is exactly where these menus get used.
  useLayoutEffect(() => {
    if (!open || !menuRef.current || !triggerRef.current) return;
    const menu = menuRef.current.getBoundingClientRect();
    const trigger = triggerRef.current.getBoundingClientRect();
    const below = trigger.bottom + 4;
    if (below + menu.height + GUTTER > window.innerHeight) {
      const above = trigger.top - menu.height - 4;
      setCoords((c) => (c ? { ...c, top: Math.max(GUTTER, above) } : c));
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (active >= 0) itemRefs.current[active]?.focus();
  }, [open, active]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      const t = e.target as Node;
      if (menuRef.current?.contains(t) || triggerRef.current?.contains(t)) return;
      close(false);
    };
    // The menu is pinned to a rect captured when it opened, so movement invalidates it.
    const onMove = () => close(false);
    document.addEventListener('mousedown', onPointer);
    window.addEventListener('scroll', onMove, true);
    window.addEventListener('resize', onMove);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      window.removeEventListener('scroll', onMove, true);
      window.removeEventListener('resize', onMove);
    };
  }, [open, close]);

  const step = (delta: number) => {
    const n = enabled.length;
    if (!n) return;
    setActive((i) => {
      const from = i < 0 ? (delta > 0 ? -1 : 0) : i;
      return (from + delta + n) % n;
    });
  };

  const onTriggerKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openAt(0);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      openAt(Math.max(0, enabled.length - 1));
    }
  };

  const onMenuKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      step(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      step(-1);
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActive(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setActive(enabled.length - 1);
    } else if (e.key === 'Tab') {
      close(false);
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => (open ? close() : openAt(-1))}
        onKeyDown={onTriggerKey}
        className={cn(
          'grid size-8 place-items-center rounded-lg text-slate-500 transition-colors',
          'hover:bg-slate-100 hover:text-slate-700',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/40 focus-visible:ring-offset-2',
          open && 'bg-slate-100 text-slate-700',
          className,
        )}
      >
        <MoreVertical className="size-4" aria-hidden />
      </button>

      {mounted && open && coords
        ? createPortal(
            <div
              ref={menuRef}
              id={menuId}
              role="menu"
              aria-label={label}
              onKeyDown={onMenuKey}
              style={{ position: 'fixed', top: coords.top, right: coords.right }}
              className="z-[70] w-56 rounded-xl border border-slate-200 bg-white p-1 shadow-md"
            >
              {items.map((item) => {
                const Icon = item.icon;
                const index = enabled.indexOf(item);
                return (
                  <div key={item.key}>
                    {item.separated && <div className="my-1 h-px bg-slate-100" role="none" />}
                    <button
                      ref={(el) => {
                        if (index >= 0) itemRefs.current[index] = el;
                      }}
                      type="button"
                      role="menuitem"
                      disabled={item.disabled}
                      tabIndex={index === active ? 0 : -1}
                      onClick={() => {
                        close(false);
                        item.onSelect();
                      }}
                      className={cn(
                        'flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-semibold transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/40',
                        item.disabled
                          ? 'cursor-not-allowed text-slate-300'
                          : TONE[item.tone ?? 'default'],
                      )}
                    >
                      {Icon && <Icon className="mt-0.5 size-4 shrink-0" />}
                      <span className="min-w-0">
                        <span className="block truncate">{item.label}</span>
                        {item.hint && (
                          <span className="mt-0.5 block text-[11px] font-normal text-slate-400">
                            {item.hint}
                          </span>
                        )}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
