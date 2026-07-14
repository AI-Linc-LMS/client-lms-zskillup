'use client';

import Link from 'next/link';

import { useEffect, useState } from 'react';
import {
  Building2,
  ChevronDown,
  Crown,
  Flame,
  Globe2,
  GraduationCap,
  Loader2,
  MapPin,
  Minus,
  TrendingDown,
  TrendingUp,
  Trophy,
  ArrowRight,
} from 'lucide-react';
import {
  getLeaderboard,
  getLeaderboardCities,
  type ApiLeaderboard,
  type ApiLeaderboardEntry,
  type LeaderboardScope,
} from '@/lib/api/gamification';
import { getMe, type ApiMe } from '@/lib/api/me';
import { listCompanies, type ApiCompany } from '@/lib/api/catalog';
import { XpInfoButton } from '@/components/gamification/XpInfoButton';

const fmt = (n: number) => n.toLocaleString('en-IN');

/** ISO week number + time until the weekly (Sunday 23:59) reset — computed
 *  client-side to avoid an SSR/client hydration mismatch on the clock. */
function useSeason() {
  const [s, setS] = useState<{ week: number; days: number; hours: number } | null>(null);
  useEffect(() => {
    const compute = () => {
      const now = new Date();
      const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
      const day = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - day);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
      const end = new Date(now);
      end.setDate(end.getDate() + ((7 - now.getDay()) % 7));
      end.setHours(23, 59, 0, 0);
      if (end.getTime() <= now.getTime()) end.setDate(end.getDate() + 7);
      const ms = end.getTime() - now.getTime();
      setS({ week, days: Math.floor(ms / 86400000), hours: Math.floor((ms % 86400000) / 3600000) });
    };
    compute();
    const t = setInterval(compute, 60000);
    return () => clearInterval(t);
  }, []);
  return s;
}

function Avatar({ entry, size = 44 }: { entry: ApiLeaderboardEntry; size?: number }) {
  const px = { width: size, height: size };
  if (entry.avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={entry.avatarUrl} alt="" style={px} className="rounded-full object-cover ring-2 ring-white" />;
  }
  return (
    <span
      style={px}
      className="grid place-items-center rounded-full bg-gradient-to-br from-[#ffd24d] to-[#f5b400] text-sm font-black text-[#171717] ring-2 ring-white"
    >
      {entry.initials}
    </span>
  );
}

const SCOPE_TABS: { key: LeaderboardScope; label: string; icon: typeof Globe2 }[] = [
  { key: 'national', label: 'National', icon: Globe2 },
  { key: 'college', label: 'My College', icon: GraduationCap },
  { key: 'company', label: 'Company', icon: Building2 },
  { key: 'city', label: 'City', icon: MapPin },
];

// Podium visual config by finishing position (0=first … 2=third).
const PODIUM = [
  { pedestal: 'h-24 from-amber-200 to-amber-400', badge: 'bg-amber-400', medal: '#1' },
  { pedestal: 'h-16 from-slate-200 to-slate-300', badge: 'bg-slate-400', medal: '#2' },
  { pedestal: 'h-12 from-orange-200 to-orange-300', badge: 'bg-orange-400', medal: '#3' },
];

export default function LeaderboardPage() {
  const [scope, setScope] = useState<LeaderboardScope>('national');
  const [companyId, setCompanyId] = useState('');
  const [companies, setCompanies] = useState<ApiCompany[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [city, setCity] = useState('');
  const [data, setData] = useState<ApiLeaderboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<ApiMe | null>(null);
  const [showAll, setShowAll] = useState(false);
  const season = useSeason();

  useEffect(() => {
    getMe().then(setMe).catch(() => setMe(null));
    listCompanies().then(setCompanies).catch(() => {});
    getLeaderboardCities().then(setCities).catch(() => {});
  }, []);

  useEffect(() => {
    if (scope === 'company' && !companyId && companies.length) setCompanyId(companies[0].id);
    if (scope === 'city' && !city && cities.length) setCity(cities[0]);
  }, [scope, companyId, companies, city, cities]);

  useEffect(() => {
    if ((scope === 'company' && !companyId) || (scope === 'city' && !city)) {
      setData(null);
      return;
    }
    let alive = true;
    setLoading(true);
    getLeaderboard(scope, 50, { companyId: scope === 'company' ? companyId : undefined, city: scope === 'city' ? city : undefined })
      .then((d) => alive && (setData(d), setLoading(false)))
      .catch(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [scope, companyId, city]);

  const entries = data?.entries ?? [];
  const podium = entries.slice(0, 3);
  const rest = entries.slice(3);
  const myEntry = data?.myEntry ?? null;
  const myRank = data?.myRank ?? null;
  const nextEntry = myRank && myRank > 1 ? entries.find((e) => e.rank === myRank - 1) ?? null : null;
  const xpAway = nextEntry && myEntry ? Math.max(0, nextEntry.totalXp - myEntry.totalXp) : null;
  const progress = nextEntry && myEntry && nextEntry.totalXp > 0 ? Math.min(100, (myEntry.totalXp / nextEntry.totalXp) * 100) : 0;
  const topPct = myRank && data?.totalStudents ? Math.max(1, Math.ceil((myRank / data.totalStudents) * 100)) : null;

  const scopeLabel =
    scope === 'college' ? 'College Leaderboard' : scope === 'company' ? 'Company Leaderboard' : 'National Leaderboard';
  const visibleRows = showAll ? rest : rest.slice(0, 7);

  return (
    <div className="space-y-6">
      {/* ── Hero rank card ─────────────────────────────────────────────────── */}
      <section data-tour="lb:rank-hero" className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#0a0a0c] via-[#0d0e13] to-[#141a2e] p-6 text-white sm:p-8">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -left-1/4 -top-1/2 size-[40vw] rounded-full bg-[#ffc42d]/15 blur-[120px]" />
          <div className="absolute -bottom-1/2 -right-1/4 size-[34vw] rounded-full bg-[#f5b400]/12 blur-[120px]" />
        </div>
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-[#ffc42d] lg:hidden">
            <Globe2 className="size-3.5" /> {scopeLabel}
          </div>
          {/* Rank */}
          <div className="min-w-[180px]">
            <p className="hidden items-center gap-2 text-[11px] font-black uppercase tracking-widest text-[#ffc42d] lg:flex">
              <Globe2 className="size-3.5" /> {scopeLabel}
              {season && <span className="text-white/50">· Week {season.week}</span>}
            </p>
            {myRank ? (
              <>
                <p className="mt-1 text-sm font-semibold text-white/70">You&apos;re Ranked</p>
                <p className="text-6xl font-black leading-none text-[#ffc42d]">#{myRank}</p>
                {topPct != null && (
                  <span className="mt-3 inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white ring-1 ring-inset ring-white/15 backdrop-blur">
                    Top {topPct}% of {fmt(data?.totalStudents ?? 0)} learners
                  </span>
                )}
              </>
            ) : (
              <>
                <p className="mt-1 text-2xl font-black text-white">Climb the ranks</p>
                <p className="mt-1 text-sm text-white/70">
                  {me ? 'Practise to earn XP and claim your spot.' : 'Sign in to see your rank.'}
                </p>
              </>
            )}
          </div>

          {/* Next-rank progress */}
          <div className="flex-1 lg:px-8">
            {xpAway != null && nextEntry ? (
              <>
                <p className="text-sm text-white/70">
                  You&apos;re only <span className="text-2xl font-black text-[#ffc42d]">{fmt(xpAway)} XP</span>
                </p>
                <p className="text-sm font-semibold text-white/70">away from Rank #{nextEntry.rank}</p>
                <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-white/10 ring-1 ring-inset ring-white/10">
                  <div className="h-full rounded-full bg-gradient-to-r from-[#ffc42d] to-[#f5b400]" style={{ width: `${progress}%` }} />
                </div>
                <div className="mt-1 flex justify-between text-[11px] font-semibold tabular-nums text-white/50">
                  <span>{fmt(myEntry?.totalXp ?? 0)} XP</span>
                  <span>{fmt(nextEntry.totalXp)} XP</span>
                </div>
              </>
            ) : (
              <p className="text-sm text-white/70">
                {myRank === 1 ? "You're #1 - defend your throne! 👑" : 'Every drill earns XP. Streaks multiply it.'}
              </p>
            )}
          </div>

          {/* Reset + trophy */}
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-white/[0.06] px-4 py-3 text-center ring-1 ring-inset ring-white/10 backdrop-blur">
              <p className="text-[10px] font-bold uppercase tracking-wide text-white/50">Resets in</p>
              <p className="text-lg font-black text-white">
                {season ? `${season.days}d ${season.hours}h` : '-'}
              </p>
              <p className="text-[10px] text-white/50">Sunday, 11:59 PM</p>
            </div>
            <Trophy className="size-16 text-[#ffc42d] drop-shadow-[0_8px_16px_rgba(245,180,0,0.4)]" />
          </div>
        </div>
      </section>

      {/* ── Filter tabs ────────────────────────────────────────────────────── */}
      <div data-tour="lb:scope-tabs" className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {SCOPE_TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setScope(key)}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition ${
                scope === key ? 'bg-orange text-[#171717] shadow-sm' : 'border border-slate-200 bg-white text-slate-600 hover:border-orange/40 hover:text-navy'
              }`}
            >
              <Icon className="size-4" /> {label}
              {(key === 'company' || key === 'city') && scope === key && <ChevronDown className="size-3.5" />}
            </button>
          ))}
          {scope === 'company' && companies.length > 0 && (
            <select
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-navy shadow-sm outline-none focus:border-orange"
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
          {scope === 'city' &&
            (cities.length > 0 ? (
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-navy shadow-sm outline-none focus:border-orange"
              >
                {cities.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            ) : (
              <span className="text-sm text-slate-500">No cities yet</span>
            ))}
        </div>
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600">
          <GraduationCap className="size-4 text-slate-500" /> {fmt(data?.totalStudents ?? 0)} learners
        </span>
      </div>

      {loading ? (
        <div className="grid h-64 place-items-center">
          <Loader2 className="size-7 animate-spin text-[#f5b400]" />
        </div>
      ) : data?.needsCollege ? (
        /* "My College" with no college on the account. This used to silently show
           the NATIONAL board; now we say so and send them to fix it. */
        <div className="rounded-3xl border border-amber-200 bg-amber-50/60 p-12 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-amber-100 text-amber-700">
            <GraduationCap className="size-6" />
          </span>
          <p className="mt-3 text-sm font-black text-navy">Pick your college first</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-600">
            We can only rank you against your college once we know which one it is.
            Choose it in your profile and this board will fill up.
          </p>
          <Link
            href="/profile"
            className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-orange px-5 py-2.5 text-sm font-bold text-[#171717] transition hover:bg-[#f5b400]"
          >
            Select your college <ArrowRight className="size-4" />
          </Link>
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-16 text-center text-sm text-slate-500">
          No ranked learners here yet - be the first to earn XP.
        </div>
      ) : (
        <>
          {/* ── Podium ───────────────────────────────────────────────────────── */}
          <section data-tour="lb:podium" className="rounded-3xl border border-slate-200 bg-white p-6 pb-0">
            <div className="mx-auto grid max-w-2xl grid-cols-3 items-end gap-3 sm:gap-6">
              {[podium[1], podium[0], podium[2]].map((e, i) => {
                if (!e) return <div key={i} />;
                const pos = e.rank - 1; // 0=first,1=second,2=third
                const cfg = PODIUM[pos] ?? PODIUM[2];
                const first = pos === 0;
                return (
                  <div key={e.userId} className="flex flex-col items-center">
                    {first && <Crown className="mb-1 size-6 text-amber-400" />}
                    <div className="relative">
                      <Avatar entry={e} size={first ? 72 : 56} />
                      <span
                        className={`absolute -bottom-1 left-1/2 grid size-6 -translate-x-1/2 place-items-center rounded-full text-[11px] font-black text-white ring-2 ring-white ${cfg.badge}`}
                      >
                        {e.rank}
                      </span>
                    </div>
                    <p className="mt-3 max-w-[9rem] truncate text-center text-sm font-bold text-navy">{e.fullName ?? 'Learner'}</p>
                    <p className="max-w-[9rem] truncate text-center text-xs text-slate-500">{e.collegeName ?? '-'}</p>
                    <p className={`mt-1 font-black tabular-nums ${first ? 'text-lg text-[#f5b400]' : 'text-navy'}`}>{fmt(e.totalXp)} XP</p>
                    <div className={`mt-2 w-full rounded-t-xl bg-gradient-to-b ${cfg.pedestal}`} />
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── YOU card ─────────────────────────────────────────────────────── */}
          {myEntry && (
            <section data-tour="lb:you-card" className="flex flex-wrap items-center gap-4 rounded-2xl border-2 border-orange/40 bg-orange-50/50 p-4">
              <span className="rounded-lg bg-orange px-2 py-1 text-[11px] font-black text-[#171717]">YOU</span>
              <Avatar entry={myEntry} size={44} />
              <div className="min-w-0">
                <p className="truncate font-bold text-navy">{myEntry.fullName ?? 'You'}</p>
                <p className="text-xs text-slate-600">
                  {myEntry.collegeName ?? 'No college set'} · <span className="font-semibold">Level {myEntry.level}</span>
                </p>
              </div>
              <div className="ml-auto flex flex-wrap items-center gap-x-8 gap-y-2">
                <div>
                  <p className="flex items-center gap-1.5 text-lg font-black tabular-nums text-navy">
                    {fmt(myEntry.totalXp)} XP <XpInfoButton />
                  </p>
                  {xpAway != null && nextEntry && (
                    <p className="text-xs text-slate-600">{fmt(xpAway)} XP to reach Rank #{nextEntry.rank}</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-[#ff7a1a]">
                  <Flame className="size-5 fill-[#ff7a1a]/20" />
                  <span className="font-black">{myEntry.currentStreakDays}</span>
                  <span className="text-xs font-semibold text-slate-600">day{myEntry.currentStreakDays === 1 ? '' : 's'}</span>
                </div>
              </div>
            </section>
          )}

          {/* ── Table ────────────────────────────────────────────────────────── */}
          <section data-tour="lb:table" className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-[11px] font-bold uppercase tracking-widest text-slate-500">
                    <th className="px-5 py-3">Rank</th>
                    <th className="px-2 py-3">Learner</th>
                    <th className="px-2 py-3">College</th>
                    <th className="px-2 py-3">Level</th>
                    <th className="px-2 py-3 text-right">XP</th>
                    <th className="px-2 py-3">Streak</th>
                    <th className="px-5 py-3 text-right">Trend</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleRows.map((e) => (
                    <tr key={e.userId} className={e.isYou ? 'bg-orange-50/60' : 'hover:bg-slate-50'}>
                      <td className="px-5 py-3 font-black tabular-nums text-slate-600">{e.rank}</td>
                      <td className="px-2 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar entry={e} size={32} />
                          <span className="font-semibold text-navy">{e.fullName ?? 'Learner'}</span>
                          {e.isYou && <span className="rounded bg-orange px-1.5 py-0.5 text-[10px] font-black text-[#171717]">You</span>}
                        </div>
                      </td>
                      <td className="px-2 py-3 text-slate-600">{e.collegeName ?? 'No college set'}</td>
                      <td className="px-2 py-3">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">Lv. {e.level}</span>
                      </td>
                      <td className="px-2 py-3 text-right font-bold tabular-nums text-navy">{fmt(e.totalXp)} XP</td>
                      <td className="px-2 py-3">
                        {e.currentStreakDays > 0 ? (
                          <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#ff7a1a]">
                            <Flame className="size-4" /> {e.currentStreakDays} day{e.currentStreakDays === 1 ? '' : 's'}
                          </span>
                        ) : (
                          <span className="text-sm text-slate-500">0 day</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end">
                          {e.trend == null || e.trend === 0 ? (
                            <Minus className="size-4 text-slate-400" />
                          ) : e.trend > 0 ? (
                            <span className="inline-flex items-center gap-0.5 text-sm font-bold text-emerald-600">
                              <TrendingUp className="size-4" /> {e.trend}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 text-sm font-bold text-rose-500">
                              <TrendingDown className="size-4" /> {Math.abs(e.trend)}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {rest.length > 7 && (
              <div className="border-t border-slate-100 p-4 text-center">
                <button
                  onClick={() => setShowAll((v) => !v)}
                  className="inline-flex items-center gap-2 rounded-full bg-navy px-6 py-2.5 text-sm font-bold text-white transition hover:brightness-110"
                >
                  {showAll ? 'Show less' : 'View Full Leaderboard'}
                  <ChevronDown className={`size-4 transition ${showAll ? 'rotate-180' : ''}`} />
                </button>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
