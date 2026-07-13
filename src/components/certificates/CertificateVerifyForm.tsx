'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, Loader2, Search, ShieldCheck } from 'lucide-react';
import { verifyCertificate, type CertificateVerifyDto } from '@/lib/api/certificates';
import { PublicHeader } from './PublicCertificateView';

/** Public certificate-verification form: type an ID → confirm authenticity. */
export function CertificateVerifyForm({ initialId = '' }: { initialId?: string }) {
  const [value, setValue] = useState(initialId);
  const [result, setResult] = useState<CertificateVerifyDto | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const id = value.trim();
    if (!id) return;
    setLoading(true);
    setResult(null);
    try {
      setResult(await verifyCertificate(id));
    } catch {
      setResult({ valid: false, certificateId: id });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <PublicHeader />
      <main className="mx-auto w-full max-w-lg px-4 py-12 sm:py-16">
        <div className="text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-navy text-white">
            <ShieldCheck className="size-7" />
          </span>
          <h1 className="mt-4 font-display text-2xl font-bold tracking-tight text-navy">Verify a certificate</h1>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-slate-600">
            Enter the certificate ID (e.g. <span className="font-mono">ZS-PM-4K7Q2X9A</span>) printed on any ZSkillup certificate.
          </p>
        </div>

        <form onSubmit={submit} className="mt-6 flex gap-2">
          <input
            value={value}
            onChange={(e) => setValue(e.target.value.toUpperCase())}
            placeholder="ZS-XX-XXXXXXXX"
            className="h-12 flex-1 rounded-full border border-slate-200 bg-white px-5 font-mono text-sm uppercase tracking-wider text-navy shadow-sm outline-none transition focus:border-orange"
          />
          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-12 shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-r from-[#f7a14e] to-[#f37021] px-6 text-sm font-extrabold text-white shadow-sm transition hover:brightness-105 disabled:opacity-60"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />} Verify
          </button>
        </form>

        {result && (
          <div className="mt-6">
            {result.valid ? (
              <div className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm">
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-inset ring-emerald-200">
                  <ShieldCheck className="size-4" /> Authentic
                </span>
                <dl className="mt-4 space-y-2.5 text-sm">
                  <Row label="Awarded to" value={result.holderName ?? ''} strong />
                  <Row label="Certificate" value={result.name ?? ''} />
                  <Row label="Issued" value={result.issuedAt ? new Date(result.issuedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : ''} />
                  <Row label="XP achieved" value={result.xpAtIssue ? `${result.xpAtIssue.toLocaleString()} XP` : ''} />
                  <Row label="ID" value={result.certificateId} mono />
                </dl>
                <Link
                  href={`/certificate/${result.certificateId}`}
                  className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-navy px-5 py-2.5 text-sm font-bold text-white transition hover:bg-navy/90"
                >
                  View certificate <ArrowRight className="size-4" />
                </Link>
              </div>
            ) : (
              <div className="rounded-3xl border border-red-200 bg-white p-6 text-center shadow-sm">
                <span className="mx-auto grid size-12 place-items-center rounded-full bg-red-50 text-red-500 ring-1 ring-red-100">
                  <AlertTriangle className="size-6" />
                </span>
                <p className="mt-3 text-sm font-bold text-navy">No certificate matches that ID</p>
                <p className="mt-1 text-xs text-slate-600">Double-check the ID exactly as printed and try again.</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function Row({ label, value, strong, mono }: { label: string; value: string; strong?: boolean; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-slate-100 pb-2 last:border-0">
      <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</dt>
      <dd className={`text-right ${strong ? 'text-base font-black text-navy' : 'font-semibold text-navy'} ${mono ? 'font-mono text-xs' : ''}`}>{value}</dd>
    </div>
  );
}
