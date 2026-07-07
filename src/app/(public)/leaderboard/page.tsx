'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { BrandLogo } from '@/components/layout/BrandLogo';
import {
  ArrowRight,
  Building2,
  ChevronDown,
  Crown,
  Flame,
  Globe2,
  GraduationCap,
  LayoutDashboard,
  Medal,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  getLeaderboard,
  type ApiLeaderboard,
  type ApiLeaderboardEntry,
  type LeaderboardScope,
} from '@/lib/api/gamification';
import { getMe, type ApiMe } from '@/lib/api/me';
import { listCompanies, type ApiCompany } from '@/lib/api/catalog';

const SCOPE_TABS: { key: LeaderboardScope; label: string; icon: typeof Globe2 }[] = [
  { key: 'national', label: 'National', icon: Globe2 },
  { key: 'college', label: 'My college', icon: GraduationCap },
  { key: 'company', label: 'Company', icon: Building2 },
];

const ROLE_HOME: Record<ApiMe['role'], string> = {
  STUDENT: '/dashboard',
  COLLEGE_ADMIN: '/tpo/dashboard',
  ADMIN: '/admin/dashboard',
  SUPER_ADMIN: '/superadmin/dashboard',
};

// Podium: winner centre + tallest, runner-up left, third right.
const PODIUM_ORDER = ['order-1 sm:order-2', 'order-2 sm:order-1', 'order-3'];
const PODIUM = [
  { grad: 'from-amber-300 to-amber-500', ring: 'ring-amber-300', bar: 'h-28', badge: 'bg-amber-400' },
  { grad: 'from-slate-200 to-slate-400', ring: 'ring-slate-300', bar: 'h-20', badge: 'bg-slate-400' },
  { grad: 'from-orange-300 to-orange-500', ring: 'ring-orange-300', bar: 'h-16', badge: 'bg-orange-500' },
];

export default function LeaderboardPage() {
  const [scope, setScope] = useState<LeaderboardScope>('national');
  const [companyId, setCompanyId] = useState<string>('');
  const [companies, setCompanies] = useState<ApiCompany[]>([]);
  const [data, setData] = useState<ApiLeaderboard | null>(null);
  const [loading, setLoading] = useState(true);

  const [me, setMe] = useState<ApiMe | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Identity (for the header) + the company list (for the picker) — both public-safe.
  useEffect(() => {
    getMe()
      .then(setMe)
      .catch(() => setMe(null))
      .finally(() => setAuthChecked(true));
    listCompanies()
      .then(setCompanies)
      .catch(() => {});
  }, []);

  // Default to the first company the moment the Company tab is opened.
  useEffect(() => {
    if (scope === 'company' && !companyId && companies.length > 0) {
      setCompanyId(companies[0].id);
    }
  }, [scope, companyId, companies]);

  useEffect(() => {
    if (scope === 'company' && !companyId) {
      setData(null);
      return; // wait until a company is chosen
    }
    let alive = true;
    setLoading(true);
    getLeaderboard(scope, 50, scope === 'company' ? companyId : undefined)
      .then((d) => {
        if (alive) {
          setData(d);
          setLoading(false);
        }
      })
      .catch(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [scope, companyId]);

  const selectedCompany = companies.find((c) => c.id === companyId);
  const podium = data?.entries.slice(0, 3) ?? [];
  const tableRows = data?.entries.slice(3) ?? [];

  const { title, subtitle, eyebrow } = useMemo(() => {
    if (scope === 'college')
      return {
        eyebrow: 'Your campus',
        title: 'College leaderboard.',
        subtitle: 'See how you stack up against your own college — climb to the top of your batch.',
      };
    if (scope === 'company')
      return {
        eyebrow: 'Placement pool',
        title: selectedCompany ? `${selectedCompany.name} leaderboard.` : 'Company leaderboard.',
        subtitle: 'Ranked among students preparing for this company. Out-drill the competition.',
      };
    return {
      eyebrow: 'Compete · Climb · Earn rewards',
      title: 'National leaderboard.',
      subtitle:
        'Earn XP for every drill. Streaks multiply your gains. Top 100 each month win mentor calls, certificates, and recruiter referrals.',
    };
  }, [scope, selectedCompany]);

  return (
    <div className="min-h-screen bg-background">
      {/* ── Auth-aware navbar ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-white/90 px-4 backdrop-blur sm:px-6">
        <BrandLogo variant="dark" className="h-7" />
        <div className="flex items-center gap-2 sm:gap-3">
          {!authChecked ? (
            <div className="h-9 w-40 animate-pulse rounded-full bg-slate-100" />
          ) : me ? (
            <>
              <Button asChild variant="outline">
                <Link href={ROLE_HOME[me.role]} className="gap-1.5">
                  <LayoutDashboard className="size-4" />
                  <span className="hidden sm:inline">Dashboard</span>
                </Link>
              </Button>
              <Link href="/profile" aria-label="Your profile">
                <HeaderAvatar src={me.avatarUrl ?? null} name={me.fullName ?? me.email} />
              </Link>
            </>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link href="/login">Log in</Link>
              </Button>
              <Button asChild>
                <Link href="/signup">Create account</Link>
              </Button>
            </>
          )}
        </div>
      </header>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-navy text-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_100%_0%,rgba(243,112,33,0.20),transparent),radial-gradient(50%_50%_at_0%_100%,rgba(56,189,248,0.14),transparent)]"
        />
        <div className="relative mx-auto max-w-5xl px-4 py-16 text-center sm:px-6 sm:py-20">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-orange">
            <Trophy className="size-3.5" /> {eyebrow}
          </span>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-[44px]">{title}</h1>
          <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-relaxed text-white/70">{subtitle}</p>
        </div>
      </section>

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        {/* Global stats */}
        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard icon={<Users className="size-4" />} label="Active learners" value={data ? data.total.toLocaleString() : '—'} tint="#2563eb" />
          <StatCard icon={<GraduationCap className="size-4" />} label="Students on board" value={data ? data.totalStudents.toLocaleString() : '—'} tint="#7c3aed" />
          <StatCard icon={<Trophy className="size-4" />} label="Your rank" value={data?.myRank ? `#${data.myRank}` : '—'} tint="#f37021" />
          <StatCard icon={<Flame className="size-4" />} label="Top streak today" value={data ? `${data.topStreak} day${data.topStreak === 1 ? '' : 's'}` : '—'} tint="#dc2626" />
        </div>

        {/* My position strip */}
        {data?.myEntry && (
          <div className="mb-8 flex items-center gap-4 rounded-2xl border-2 border-orange/30 bg-gradient-to-r from-orange/10 to-transparent px-4 py-3">
            <LbAvatar src={data.myEntry.avatarUrl} initials={data.myEntry.initials} className="size-11 shrink-0 bg-navy text-sm" />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 font-semibold text-navy">
                <span className="truncate">{data.myEntry.fullName ?? 'You'}</span>
                <span className="rounded-full bg-orange px-2 py-0.5 text-[10px] font-bold text-white">You</span>
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {data.myEntry.collegeName ?? 'No college set'} · Level {data.myEntry.level} · {data.myEntry.currentStreakDays}d streak
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-lg font-extrabold text-navy">#{data.myEntry.rank}</p>
              <p className="text-xs text-muted-foreground">{data.myEntry.totalXp.toLocaleString()} XP</p>
            </div>
          </div>
        )}

        {/* Scope switcher + company picker */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="inline-flex gap-1 rounded-full bg-slate-100 p-1" role="tablist" aria-label="Leaderboard scope">
            {SCOPE_TABS.map((t) => {
              const Icon = t.icon;
              const active = scope === t.key;
              return (
                <button
                  key={t.key}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setScope(t.key)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors',
                    active ? 'bg-navy text-white shadow-sm' : 'text-slate-500 hover:text-navy',
                  )}
                >
                  <Icon className="size-4" /> {t.label}
                </button>
              );
            })}
          </div>

          {scope === 'company' && (
            <div className="relative">
              <select
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                className="appearance-none rounded-full border border-slate-200 bg-white py-2 pl-4 pr-9 text-sm font-semibold text-navy shadow-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
              >
                {companies.length === 0 && <option value="">No companies</option>}
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            </div>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : !data || data.entries.length === 0 ? (
          <div className="rounded-2xl border bg-white p-12 text-center shadow-sm">
            <Trophy className="mx-auto size-10 text-slate-300" />
            <p className="mt-3 text-sm text-muted-foreground">
              {scope === 'company'
                ? 'No ranked students for this company yet. Register for its drive and start earning XP!'
                : scope === 'college'
                  ? 'No one from your college is on the board yet. Be the first!'
                  : 'No students on the leaderboard yet. Be the first to earn XP!'}
            </p>
          </div>
        ) : (
          <>
            {/* Podium — top 3 */}
            {podium.length >= 3 && (
              <div className="mb-8 flex items-end justify-center gap-3 rounded-3xl bg-gradient-to-b from-navy/[0.06] to-transparent px-2 pb-8 pt-6 sm:gap-5 sm:px-6">
                {podium.map((entry, i) => (
                  <motion.div
                    key={entry.userId}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className={cn('flex min-w-0 flex-1 flex-col items-center sm:max-w-[9rem]', PODIUM_ORDER[i])}
                  >
                    <div className="relative">
                      <LbAvatar
                        src={entry.avatarUrl}
                        initials={entry.initials}
                        className={cn('size-14 text-base ring-4 sm:size-16', PODIUM[i].ring, entry.isYou ? 'bg-orange' : 'bg-navy')}
                      />
                      <span className={cn('absolute -right-1 -top-1 grid size-6 place-items-center rounded-full text-white shadow', PODIUM[i].badge)}>
                        {i === 0 ? <Crown className="size-3.5" /> : <Medal className="size-3.5" />}
                      </span>
                    </div>
                    <p className="mt-2 w-full truncate text-center text-xs font-bold text-navy sm:text-sm">{entry.fullName ?? 'Student'}</p>
                    <p className="w-full truncate text-center text-[11px] text-muted-foreground">{entry.collegeName ?? '—'}</p>
                    <div className={cn('mt-3 grid w-full place-items-center rounded-t-xl bg-gradient-to-b text-navy', PODIUM[i].grad, PODIUM[i].bar)}>
                      <span className="text-2xl font-black drop-shadow-sm sm:text-3xl">#{entry.rank}</span>
                    </div>
                    <div className="w-full rounded-b-xl bg-white px-2 py-2 text-center shadow-sm ring-1 ring-slate-100">
                      <p className="text-sm font-extrabold text-navy">{entry.totalXp.toLocaleString()}</p>
                      <p className="text-[10px] text-muted-foreground">
                        XP · Lv {entry.level} · {entry.currentStreakDays}d
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Table rows (4+) */}
            {tableRows.length > 0 && (
              <div className="mb-8 overflow-hidden rounded-2xl border bg-white shadow-sm">
                <div className="border-b px-4 py-3">
                  <h2 className="font-bold text-navy">Top performers</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead>
                      <tr className="border-b bg-slate-50/60 text-left text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                        <th className="px-4 py-3">Rank</th>
                        <th className="px-4 py-3">Learner</th>
                        <th className="px-4 py-3">Level</th>
                        <th className="px-4 py-3">Streak</th>
                        <th className="px-4 py-3">Badges</th>
                        <th className="px-4 py-3 text-right">XP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableRows.map((row) => (
                        <TableRow key={row.userId} entry={row} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* Boost CTA */}
        <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-navy to-indigo-900 p-6 text-white">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Zap className="size-4 text-orange" />
                Complete today&apos;s quest to earn XP and climb the ranks
              </div>
              <div className="flex items-center gap-2 text-sm text-white/80">
                <Trophy className="size-4 text-amber-400" />
                Streak multiplier: ×1.5 on day 14+
              </div>
              <p className="text-xs text-white/60">Top 100 each month win mentor calls + recruiter referrals.</p>
            </div>
            <Button size="lg" asChild>
              <Link href={me ? '/practice' : '/signup'} className="gap-1.5">
                {me ? 'Start practising' : 'Create account'} <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </main>

      <footer className="mt-16 border-t px-4 py-8 text-center text-xs text-muted-foreground sm:px-6">
        © 2026 ZSkillup · Future-ready graduates, future-strong institutions
      </footer>
    </div>
  );
}

function StatCard({ icon, label, value, tint }: { icon: React.ReactNode; label: string; value: string; tint: string }) {
  return (
    <div className="rounded-2xl border bg-white p-4 text-center shadow-sm">
      <span
        className="mx-auto mb-2 grid size-8 place-items-center rounded-lg"
        style={{ background: `color-mix(in srgb, ${tint} 12%, white)`, color: tint }}
      >
        {icon}
      </span>
      <p className="text-2xl font-extrabold text-navy">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function TableRow({ entry }: { entry: ApiLeaderboardEntry }) {
  return (
    <tr className={cn('border-b last:border-0 transition-colors', entry.isYou ? 'bg-orange/5' : 'hover:bg-slate-50')}>
      <td className="px-4 py-3 font-bold text-navy">
        <span className="tabular-nums">#{entry.rank}</span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <LbAvatar src={entry.avatarUrl} initials={entry.initials} className={cn('size-8 text-[10px]', entry.isYou ? 'bg-orange' : 'bg-navy')} />
          <div className="min-w-0">
            <p className="truncate font-medium text-navy">
              {entry.fullName ?? 'Student'}
              {entry.isYou && <span className="ml-1 rounded-full bg-orange px-1.5 py-0.5 text-[9px] font-bold text-white">You</span>}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {entry.collegeName ?? 'No college'}
              {entry.passoutYear ? ` · ${entry.passoutYear}` : ''}
            </p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-muted-foreground">Lv {entry.level}</td>
      <td className="px-4 py-3">
        <span className="inline-flex items-center gap-1 text-orange">
          <Flame className="size-3.5" /> {entry.currentStreakDays}d
        </span>
      </td>
      <td className="px-4 py-3 text-muted-foreground tabular-nums">{entry.badgesEarned}</td>
      <td className="px-4 py-3 text-right font-bold text-navy tabular-nums">{entry.totalXp.toLocaleString()}</td>
    </tr>
  );
}

/** Header avatar — Google photo with an initials fallback. */
function HeaderAvatar({ src, name }: { src: string | null; name: string }) {
  const [failed, setFailed] = useState(false);
  const initials = name.slice(0, 2).toUpperCase();
  return (
    <span className="grid size-9 place-items-center overflow-hidden rounded-full bg-navy text-xs font-bold text-white ring-2 ring-white">
      {src && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} referrerPolicy="no-referrer" onError={() => setFailed(true)} className="size-full object-cover" />
      ) : (
        initials
      )}
    </span>
  );
}

/** Leaderboard avatar — Google profile image (avatarUrl) with an initials fallback. */
function LbAvatar({ src, initials, className }: { src: string | null; initials: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className={cn('grid shrink-0 place-items-center overflow-hidden rounded-full font-bold text-white', className)}>
      {src && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={initials} referrerPolicy="no-referrer" onError={() => setFailed(true)} className="size-full object-cover" />
      ) : (
        initials
      )}
    </span>
  );
}
