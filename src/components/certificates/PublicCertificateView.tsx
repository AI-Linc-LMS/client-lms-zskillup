'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Download, Loader2, Search, ShieldCheck } from 'lucide-react';
import { verifyCertificate, type CertificateVerifyDto } from '@/lib/api/certificates';
import { themeForTier } from '@/lib/certificates/themes';
import { CertificatePreview } from './CertificatePreview';
import { certificateToPdfBlob, downloadBlob } from '@/lib/certificates/pdf';

/** Public, shareable certificate page — anyone with the link can view + verify it. */
export function PublicCertificateView({ id }: { id: string }) {
  const [data, setData] = useState<CertificateVerifyDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [width, setWidth] = useState(880);
  const [busy, setBusy] = useState(false);
  const [dlError, setDlError] = useState<string | null>(null);
  const nodeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    verifyCertificate(id)
      .then(setData)
      .catch(() => setData({ valid: false, certificateId: id }))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    const fit = () => setWidth(Math.min(880, window.innerWidth - 40));
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  async function download() {
    if (!nodeRef.current) return;
    setBusy(true);
    setDlError(null);
    try {
      const blob = await certificateToPdfBlob(nodeRef.current);
      downloadBlob(blob, `ZSkillup-Certificate-${id}.pdf`);
    } catch {
      setDlError('Could not generate the PDF. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <PublicHeader />
      <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-12">
        {loading ? (
          <div className="grid h-72 place-items-center">
            <Loader2 className="size-7 animate-spin text-slate-300" />
          </div>
        ) : data?.valid ? (
          <>
            <div className="mx-auto mb-6 flex max-w-md flex-col items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-center">
              <span className="inline-flex items-center gap-2 text-sm font-black text-emerald-700">
                <ShieldCheck className="size-5" /> Verified certificate
              </span>
              <p className="text-xs text-emerald-700/80">
                Issued by ZSkillup to <strong>{data.holderName}</strong> on{' '}
                {data.issuedAt ? new Date(data.issuedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : ''}.
              </p>
            </div>

            <div className="mx-auto w-fit overflow-hidden rounded-xl shadow-xl ring-1 ring-slate-200">
              <CertificatePreview
                ref={nodeRef}
                width={width}
                theme={themeForTier(data.tier ?? 1)}
                holderName={data.holderName ?? ''}
                certificateId={data.certificateId}
                issuedAt={data.issuedAt ?? null}
                xp={data.xpAtIssue ?? 0}
              />
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={download}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#f7a14e] to-[#f37021] px-5 py-2.5 text-sm font-extrabold text-white shadow-sm transition hover:brightness-105 disabled:opacity-60"
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} Download PDF
              </button>
              <Link href="/verify" className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50">
                <Search className="size-4" /> Verify another
              </Link>
            </div>
            {dlError && <p className="mt-3 text-center text-sm font-semibold text-red-500">{dlError}</p>}
            <p className="mt-4 text-center text-xs text-slate-400">
              Certificate ID <span className="font-mono font-semibold text-slate-600">{data.certificateId}</span>
            </p>
          </>
        ) : (
          <div className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-red-50 text-red-500 ring-1 ring-red-100">
              <AlertTriangle className="size-7" />
            </span>
            <h1 className="mt-4 text-lg font-black text-navy">Certificate not found</h1>
            <p className="mt-1.5 text-sm text-slate-500">
              We couldn&apos;t verify <span className="font-mono font-semibold text-slate-700">{id}</span>. Please check the ID and try again.
            </p>
            <Link href="/verify" className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-navy px-5 py-2.5 text-sm font-bold text-white transition hover:bg-navy/90">
              <Search className="size-4" /> Verify a certificate
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}

export function PublicHeader() {
  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
      <Link href="/" className="flex items-center gap-2">
        <span className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-[#f7a14e] to-[#f37021] font-display text-lg font-black text-white">Z</span>
        <span className="font-display text-base font-bold tracking-tight text-navy">ZSkillup</span>
      </Link>
      <Link href="/dashboard" className="text-sm font-semibold text-orange hover:underline">
        Go to platform
      </Link>
    </header>
  );
}
