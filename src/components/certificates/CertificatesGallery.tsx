'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Award, Check, Copy, Download, ExternalLink, Loader2, Lock, ShieldCheck, Sparkles, X } from 'lucide-react';
import {
  getMyCertificates,
  issueCertificate,
  type IssuedCertificateDto,
  type MyCertificateDto,
  type MyCertificatesResponseDto,
} from '@/lib/api/certificates';
import { themeForTier } from '@/lib/certificates/themes';
import { CertificatePreview } from './CertificatePreview';
import { certificateToPdfBlob, downloadBlob } from '@/lib/certificates/pdf';

const CARD_W = 300;

export function CertificatesGallery() {
  const [data, setData] = useState<MyCertificatesResponseDto | null>(null);
  const [active, setActive] = useState<MyCertificateDto | null>(null);

  useEffect(() => {
    getMyCertificates().then(setData).catch(() => {});
  }, []);

  if (!data) {
    return (
      <div className="space-y-6">
        <div className="h-48 animate-pulse rounded-3xl bg-slate-100" />
        <div className="grid justify-items-center gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="w-full max-w-[340px] space-y-2.5">
              <div className="aspect-[1.55] w-full animate-pulse rounded-2xl bg-slate-100" />
              <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const earned = data.certificates.filter((c) => c.unlocked).length;
  const next = data.certificates.find((c) => !c.unlocked);
  const prevXp = earned > 0 ? data.certificates[earned - 1].xp : 0;
  const nextSegPct = next
    ? Math.min(100, Math.max(0, Math.round(((data.totalXp - prevXp) / (next.xp - prevXp)) * 100)))
    : 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div data-tour="certs:hero" className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="relative bg-gradient-to-br from-[#1f2d4d] via-[#16223f] to-[#0a0a0c] p-6 text-white sm:p-8">
          <span aria-hidden className="pointer-events-none absolute -right-10 -top-16 size-56 rounded-full bg-[#f5cf5a]/20 blur-3xl" />
          <span aria-hidden className="pointer-events-none absolute -left-16 bottom-0 size-56 rounded-full bg-[#3b82f6]/10 blur-3xl" />

          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-[#f5cf5a] ring-1 ring-inset ring-white/15">
                <Award className="size-3.5" /> Certificates
              </span>
              <h1 className="mt-3 font-display text-2xl font-bold tracking-tight sm:text-3xl">Earn as you climb</h1>
              <p className="mt-1.5 max-w-lg text-sm leading-relaxed text-white/70">
                Every certificate unlocks at an XP milestone - download it as a PDF and share a public, verifiable link.
              </p>
            </div>
            <div className="flex shrink-0 gap-6 sm:flex-col sm:items-end sm:gap-1 sm:text-right">
              <div>
                <div className="font-display text-4xl font-black tabular-nums text-[#f5cf5a]">{data.totalXp.toLocaleString()}</div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-white/60">Total XP</div>
              </div>
              <div className="self-end sm:mt-2">
                <div className="font-display text-2xl font-black tabular-nums sm:text-3xl">
                  {earned}<span className="text-white/40">/{data.certificates.length}</span>
                </div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-white/60">Unlocked</div>
              </div>
            </div>
          </div>

          {/* Milestone journey */}
          <div data-tour="certs:journey" className="relative mt-6">
            <JourneyRail certs={data.certificates} totalXp={data.totalXp} />
          </div>

          {/* Next up / summit */}
          {next ? (
            <div className="relative mt-3 flex items-center gap-3 rounded-2xl bg-white/[0.05] p-3 ring-1 ring-inset ring-white/10">
              <span
                className="grid size-9 shrink-0 place-items-center rounded-xl text-white ring-1 ring-inset ring-white/15"
                style={{ backgroundColor: `${themeForTier(next.tier).metal}33` }}
              >
                <Lock className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-white/85">
                  Next: {next.shortName}
                  <span className="font-normal text-white/45"> · {next.tagline}</span>
                </p>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/12">
                  <div className="h-full rounded-full bg-gradient-to-r from-[#ffd24d] to-[#f5cf5a] transition-[width] duration-700" style={{ width: `${nextSegPct}%` }} />
                </div>
              </div>
              <span className="shrink-0 text-right">
                <span className="block text-sm font-black tabular-nums text-[#f5cf5a]">{(next.xp - data.totalXp).toLocaleString()}</span>
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-white/50">XP to go</span>
              </span>
            </div>
          ) : (
            <div className="relative mt-3 flex items-center gap-2 rounded-2xl bg-emerald-500/15 p-3 text-sm font-semibold text-emerald-200 ring-1 ring-inset ring-emerald-400/25">
              <Sparkles className="size-4" /> All certificates unlocked - you&apos;ve reached the summit.
            </div>
          )}
        </div>
      </div>

      {/* Grid */}
      <div data-tour="certs:gallery" className="grid justify-items-center gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {data.certificates.map((c) => (
          <CertificateCard key={c.slug} cert={c} holderName={data.holderName} totalXp={data.totalXp} onOpen={() => setActive(c)} />
        ))}
      </div>

      {active && (
        <CertificateModal cert={active} holderName={data.holderName} onClose={() => setActive(null)} onIssued={refresh} />
      )}
    </div>
  );

  function refresh() {
    getMyCertificates().then(setData).catch(() => {});
  }
}

function fmtXp(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1).replace(/\.0$/, '')}k` : String(n);
}

/**
 * Horizontal milestone track — the 7 XP tiers as nodes with the student's live
 * position filled in. Nodes take each tier's metal colour; the next unearned one
 * is highlighted so the goal reads at a glance.
 */
function JourneyRail({ certs, totalXp }: { certs: MyCertificateDto[]; totalXp: number }) {
  const n = certs.length;
  const nodePos = (i: number) => ((i + 0.5) / n) * 100;
  const earned = certs.filter((c) => c.unlocked).length;
  const lastIdx = earned - 1;
  const nextCert = certs[earned];
  const prevXp = lastIdx >= 0 ? certs[lastIdx].xp : 0;
  const partial = nextCert
    ? Math.min(1, Math.max(0, (totalXp - prevXp) / (nextCert.xp - prevXp)))
    : 1;
  const prevPos = lastIdx >= 0 ? nodePos(lastIdx) : 0;
  const nextPos = nextCert ? nodePos(earned) : 100;
  const fillPct = prevPos + (nextPos - prevPos) * partial;

  return (
    <div className="relative overflow-x-auto scroll-soft pb-1">
      <div className="relative h-16 min-w-[560px]">
        <div className="absolute inset-x-0 top-5 h-1 rounded-full bg-white/12" />
        <div
          className="absolute left-0 top-5 h-1 rounded-full bg-gradient-to-r from-[#ffd24d] via-[#f0a844] to-[#f5cf5a] transition-[width] duration-700"
          style={{ width: `${fillPct}%` }}
        />
        {certs.map((c, i) => {
          const theme = themeForTier(c.tier);
          const isNext = i === earned;
          return (
            <div
              key={c.slug}
              className="absolute top-2 flex -translate-x-1/2 flex-col items-center"
              style={{ left: `${nodePos(i)}%` }}
              title={`${c.shortName} · ${c.xp.toLocaleString()} XP`}
            >
              <span
                className={`grid size-7 place-items-center rounded-full ring-2 transition ${
                  c.unlocked ? 'ring-white/25' : 'bg-white/10 ring-white/15'
                } ${isNext ? 'ring-amber-300/80' : ''}`}
                style={c.unlocked ? { backgroundColor: theme.metal, color: theme.metalInk } : undefined}
              >
                {c.unlocked ? <Check className="size-3.5" /> : <Lock className="size-3 text-white/50" />}
              </span>
              <span
                className={`mt-1.5 whitespace-nowrap text-[9px] font-bold tabular-nums ${
                  isNext ? 'text-amber-300' : 'text-white/50'
                }`}
              >
                {fmtXp(c.xp)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CertificateCard({
  cert,
  holderName,
  totalXp,
  onOpen,
}: {
  cert: MyCertificateDto;
  holderName: string;
  totalXp: number;
  onOpen: () => void;
}) {
  const theme = themeForTier(cert.tier);
  const pct = Math.min(100, Math.round((totalXp / cert.xp) * 100));

  return (
    <div className="w-full max-w-[340px]">
      <button
        type="button"
        onClick={cert.unlocked ? onOpen : undefined}
        disabled={!cert.unlocked}
        className={`group relative block w-full overflow-hidden rounded-2xl border shadow-sm transition ${
          cert.unlocked
            ? 'cursor-pointer border-slate-200 hover:-translate-y-1 hover:shadow-xl'
            : 'cursor-default border-slate-200'
        }`}
      >
        <div className={cert.unlocked ? '' : 'blur-[2px] saturate-[0.4] brightness-[0.97]'}>
          <CertificatePreview
            width={CARD_W}
            theme={theme}
            holderName={holderName}
            certificateId={cert.certificateId ?? `ZS-${theme.code}-••••••••`}
            issuedAt={cert.issuedAt}
            xp={cert.xp}
          />
        </div>

        {!cert.unlocked && (
          <div className="absolute inset-0 grid place-items-center bg-white/45 backdrop-blur-[1px]">
            <div className="flex flex-col items-center gap-2 rounded-2xl bg-white/85 px-5 py-4 text-center shadow ring-1 ring-slate-200">
              <span className="grid size-10 place-items-center rounded-full bg-slate-900/90 text-white">
                <Lock className="size-4" />
              </span>
              <span className="text-xs font-bold text-navy">{(cert.xp - totalXp).toLocaleString()} XP to unlock</span>
              <div className="h-1.5 w-32 overflow-hidden rounded-full bg-slate-200">
                <div className="h-full rounded-full bg-gradient-to-r from-[#ffd24d] to-[#f5b400]" style={{ width: `${pct}%` }} />
              </div>
            </div>
          </div>
        )}

        {cert.unlocked && (
          <span className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white shadow">
            <Check className="size-3" /> Unlocked
          </span>
        )}
      </button>

      <div className="mt-3 px-1">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-bold text-navy">{cert.shortName}</p>
              <span
                className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide"
                style={{ backgroundColor: `${theme.metal}22`, color: theme.metalDeep }}
              >
                {theme.metalLabel}
              </span>
            </div>
            <p className="text-xs text-slate-500">{cert.xp.toLocaleString()} XP</p>
          </div>
          {cert.unlocked ? (
            <button onClick={onOpen} className="inline-flex shrink-0 items-center gap-1 rounded-full bg-navy px-3 py-1.5 text-xs font-bold text-white transition hover:bg-navy/90">
              <Download className="size-3.5" /> Get
            </button>
          ) : (
            <Lock className="size-4 shrink-0 text-slate-400" />
          )}
        </div>
        <p className="mt-1 line-clamp-1 text-[11px] text-slate-500">{cert.tagline}</p>
      </div>
    </div>
  );
}

function CertificateModal({
  cert,
  holderName,
  onClose,
  onIssued,
}: {
  cert: MyCertificateDto;
  holderName: string;
  onClose: () => void;
  onIssued: () => void;
}) {
  const theme = themeForTier(cert.tier);
  const [issued, setIssued] = useState<IssuedCertificateDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [width, setWidth] = useState(880);
  const nodeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    issueCertificate(cert.slug)
      .then((d) => {
        if (!alive) return;
        setIssued(d);
        if (!cert.issued) onIssued(); // newly minted → refresh the list state
      })
      .catch(() => alive && setError('Could not open this certificate. Please try again.'));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cert.slug]);

  useEffect(() => {
    const fit = () => setWidth(Math.min(880, window.innerWidth - 48));
    fit();
    window.addEventListener('resize', fit);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('resize', fit);
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const shareUrl = issued && typeof window !== 'undefined' ? `${window.location.origin}/certificate/${issued.certificateId}` : '';

  async function download() {
    if (!nodeRef.current) return;
    setBusy(true);
    try {
      const blob = await certificateToPdfBlob(nodeRef.current);
      downloadBlob(blob, `ZSkillup-${cert.shortName.replace(/\s+/g, '-')}.pdf`);
    } catch {
      setError('Could not generate the PDF. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  function copy() {
    if (!shareUrl) return;
    navigator.clipboard?.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto p-4">
      <div aria-hidden onClick={onClose} className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" />
      <div className="relative my-auto w-full max-w-[940px] rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl sm:p-6">
        <button onClick={onClose} className="absolute right-3 top-3 z-10 grid size-8 place-items-center rounded-full bg-white/90 text-slate-600 shadow ring-1 ring-slate-200 transition hover:text-navy" aria-label="Close">
          <X className="size-4" />
        </button>

        <div className="mx-auto w-fit overflow-hidden rounded-xl shadow-lg ring-1 ring-slate-200">
          <CertificatePreview
            ref={nodeRef}
            width={width}
            theme={theme}
            holderName={holderName}
            certificateId={issued?.certificateId ?? cert.certificateId ?? `ZS-${theme.code}-........`}
            issuedAt={issued?.issuedAt ?? cert.issuedAt}
            xp={issued?.xpAtIssue ?? cert.xp}
          />
        </div>

        {error && <p className="mt-3 text-center text-sm font-semibold text-red-500">{error}</p>}

        <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <ShieldCheck className="size-4 text-emerald-500" />
            <span>
              Certificate ID <strong className="font-mono text-navy">{issued?.certificateId ?? '…'}</strong>
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={copy}
              disabled={!shareUrl}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              {copied ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
              {copied ? 'Copied' : 'Copy share link'}
            </button>
            {shareUrl && (
              <Link href={`/certificate/${issued?.certificateId}`} target="_blank" className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50">
                <ExternalLink className="size-4" /> Public page
              </Link>
            )}
            <button
              onClick={download}
              disabled={busy || !issued}
              className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#ffd24d] to-[#f5b400] px-5 py-2 text-sm font-extrabold text-[#171717] shadow-sm transition hover:brightness-105 disabled:opacity-60"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} Download PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
