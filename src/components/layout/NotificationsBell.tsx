'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  Award,
  BadgeCheck,
  Bell,
  BellRing,
  CalendarClock,
  CheckCheck,
  type LucideIcon,
  Megaphone,
  Sparkles,
  Target,
  Trophy,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { hasRoleHint } from '@/lib/session-hints';
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type ApiNotification,
} from '@/lib/api/notifications';

const EASE = [0.22, 1, 0.36, 1] as const;

/** Notification type → icon + gradient. */
const TYPE_STYLE: Record<string, { icon: LucideIcon; from: string; to: string }> = {
  REGISTRATION: { icon: BadgeCheck, from: '#34d399', to: '#059669' },
  ASSESSMENT_SCHEDULED: { icon: CalendarClock, from: '#7c6cf5', to: '#5b3bf5' },
  ASSESSMENT_REMINDER: { icon: BellRing, from: '#f7a14e', to: '#f37021' },
  RESULT: { icon: Trophy, from: '#f5c451', to: '#e0a91b' },
  BROADCAST: { icon: Megaphone, from: '#f7a14e', to: '#f37021' },
  GENERIC: { icon: Sparkles, from: '#94a3b8', to: '#64748b' },
};

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

/**
 * Top-bar notifications bell — live feed (assessment lifecycle, Phase 3).
 * Polls the feed for the unread count and renders rows with deep links; clicking
 * a row marks it read and navigates. Guests (no session) see the empty state.
 */
export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ApiNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const router = useRouter();
  const hasUnread = unreadCount > 0;

  const refresh = useCallback(() => {
    if (!hasRoleHint()) return;
    getNotifications()
      .then((feed) => {
        setItems(feed.items);
        setUnreadCount(feed.unreadCount);
      })
      .catch(() => {});
  }, []);

  // Poll the feed for the unread badge (and lazily materialise reminders).
  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 60_000);
    return () => clearInterval(t);
  }, [refresh]);

  // Refresh when the popover opens.
  useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

  const onRowClick = (n: ApiNotification) => {
    if (!n.read) {
      markNotificationRead(n.id).catch(() => {});
      setItems((prev) => prev.map((i) => (i.id === n.id ? { ...i, read: true } : i)));
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    setOpen(false);
    if (n.link) router.push(n.link);
  };

  const onMarkAll = () => {
    markAllNotificationsRead().catch(() => {});
    setItems((prev) => prev.map((i) => ({ ...i, read: true })));
    setUnreadCount(0);
  };

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref} data-tour="chrome:notifications">
      <motion.button
        type="button"
        aria-label={hasUnread ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        whileTap={reduce ? undefined : { scale: 0.92 }}
        className={cn(
          'group relative grid size-9 place-items-center rounded-full border transition-all duration-200',
          'text-slate-500 hover:text-[#f37021]',
          open
            ? 'border-[#f37021]/30 bg-[#f37021]/10 text-[#f37021] ring-2 ring-[#f37021]/15'
            : 'border-slate-200/80 bg-white hover:-translate-y-px hover:border-[#f37021]/30 hover:bg-[#f37021]/5 hover:shadow-sm',
        )}
      >
        {/* faint colored glow that intensifies on hover/open */}
        <span
          aria-hidden
          className={cn(
            'pointer-events-none absolute inset-0 rounded-full bg-[#f37021]/20 opacity-0 blur-md transition-opacity duration-300',
            open ? 'opacity-60' : 'group-hover:opacity-50',
          )}
        />
        <span className="relative">
          {hasUnread ? (
            <BellRing className="size-[18px]" aria-hidden="true" />
          ) : (
            <Bell className="size-[18px]" aria-hidden="true" />
          )}
        </span>

        {/* animated unread badge — only when there's something unread */}
        <AnimatePresence>
          {hasUnread ? (
            <motion.span
              key="badge"
              initial={reduce ? false : { scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={reduce ? undefined : { scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 520, damping: 22 }}
              className="absolute -right-1 -top-1 flex min-w-[18px] items-center justify-center"
              aria-hidden="true"
            >
              {!reduce ? (
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#f37021] opacity-60" />
              ) : null}
              <span className="relative inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-gradient-to-br from-[#ff8a4c] to-[#f5491e] px-1 text-[10px] font-bold leading-none text-white shadow-[0_2px_8px_-2px_rgba(243,73,30,0.7)] ring-2 ring-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            </motion.span>
          ) : null}
        </AnimatePresence>
      </motion.button>

      <AnimatePresence>
        {open ? (
          <motion.div
            role="dialog"
            aria-label="Notifications"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.22, ease: EASE }}
            style={{ transformOrigin: 'top right' }}
            className="absolute right-0 z-50 mt-3 w-[20rem] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_24px_60px_-24px_rgba(11,18,32,0.45)]"
          >
            {/* header — subtle aurora wash + gradient icon chip */}
            <div className="relative overflow-hidden border-b border-slate-100 px-4 py-3.5">
              <div
                aria-hidden
                className="pointer-events-none absolute -right-8 -top-10 size-28 rounded-full bg-[#f37021]/10 blur-2xl"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute -left-10 top-2 size-24 rounded-full bg-[#6d3bf5]/10 blur-2xl"
              />
              <div className="relative flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#f7a14e] to-[#f37021] text-white shadow-sm">
                    <Bell className="size-4" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                      Notifications
                    </p>
                    <p className="text-[13px] font-bold leading-tight text-navy">
                      {hasUnread ? `${unreadCount} new` : 'All caught up'}
                    </p>
                  </div>
                </div>
                {hasUnread ? (
                  <button
                    type="button"
                    onClick={onMarkAll}
                    className="inline-flex items-center gap-1 rounded-full bg-[#f37021]/10 px-2.5 py-1 text-[11px] font-semibold text-[#f37021] transition-colors hover:bg-[#f37021]/20"
                  >
                    <CheckCheck className="size-3.5" /> Mark all read
                  </button>
                ) : null}
              </div>
            </div>

            {items.length > 0 ? (
              <ul className="max-h-[22rem] divide-y divide-slate-100 overflow-y-auto">
                {items.map((n, i) => {
                  const style = TYPE_STYLE[n.type] ?? TYPE_STYLE.GENERIC;
                  const Icon = style.icon;
                  const unread = !n.read;
                  return (
                    <motion.li
                      key={n.id}
                      initial={reduce ? false : { opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.35, ease: EASE, delay: 0.04 * i }}
                    >
                      <button
                        type="button"
                        onClick={() => onRowClick(n)}
                        className={cn(
                          'group/row relative flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50',
                          unread && 'bg-[#f37021]/[0.03]',
                        )}
                      >
                        {unread ? (
                          <span
                            aria-hidden
                            className="absolute inset-y-0 left-0 w-[3px] rounded-r-full bg-gradient-to-b from-[#ff8a4c] to-[#f5491e]"
                          />
                        ) : null}
                        <span
                          className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
                          style={{ background: `linear-gradient(135deg, ${style.from}, ${style.to})` }}
                        >
                          <Icon className="size-[18px]" aria-hidden="true" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="truncate text-[13px] font-semibold text-navy">{n.title}</p>
                            {unread ? (
                              <span
                                aria-hidden
                                className="mt-1 size-2 shrink-0 rounded-full bg-[#f37021] ring-2 ring-[#f37021]/20"
                              />
                            ) : null}
                          </div>
                          <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-slate-500">
                            {n.body}
                          </p>
                          <p className="mt-1 text-[11px] font-medium text-slate-400">
                            {timeAgo(n.createdAt)}
                          </p>
                        </div>
                      </button>
                    </motion.li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState reduce={reduce ?? false} />
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function EmptyState({ reduce }: { reduce: boolean }) {
  return (
    <div className="relative px-6 py-9 text-center">
      {/* layered glow blobs for depth */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-6 size-32 -translate-x-1/2 rounded-full bg-[#f37021]/[0.07] blur-2xl"
      />
      <motion.div
        initial={reduce ? false : { scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: EASE }}
        className="relative mx-auto flex size-16 items-center justify-center"
      >
        {/* soft rings */}
        <span className="absolute inset-0 rounded-full bg-gradient-to-br from-slate-100 to-slate-50 ring-1 ring-inset ring-slate-200/80" />
        <span className="absolute inset-2 rounded-full bg-white ring-1 ring-slate-100" />
        <span className="relative flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-[#f7a14e] to-[#f37021] text-white shadow-[0_8px_20px_-8px_rgba(243,112,33,0.7)]">
          <Sparkles className="size-[18px]" aria-hidden="true" />
        </span>
      </motion.div>

      <p className="relative mt-4 text-sm font-bold text-navy">You&apos;re all caught up</p>
      <p className="relative mx-auto mt-1 max-w-[15rem] text-xs leading-relaxed text-slate-400">
        Badges, quest results, and drive invites will land here.
      </p>

      {/* preview chips of what's coming — gradient icon fills */}
      <div className="relative mt-5 flex items-center justify-center gap-2">
        {[
          { icon: Award, from: '#34d399', to: '#059669', label: 'Badges' },
          { icon: Trophy, from: '#f5c451', to: '#e0a91b', label: 'Quests' },
          { icon: Target, from: '#7c6cf5', to: '#5b3bf5', label: 'Drives' },
        ].map(({ icon: Icon, from, to, label }) => (
          <span
            key={label}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white py-1 pl-1 pr-2.5 text-[11px] font-semibold text-slate-500 shadow-sm"
          >
            <span
              className="flex size-5 items-center justify-center rounded-full text-white"
              style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
            >
              <Icon className="size-3" aria-hidden="true" />
            </span>
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
