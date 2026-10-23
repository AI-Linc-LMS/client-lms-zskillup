'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { ArrowDown, ArrowUp, Loader2, Star, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { describeError } from '@/lib/api/errors';
import {
  addJobCreative,
  deleteJobCreative,
  listJobCreatives,
  reorderJobCreatives,
  setJobCreativeCover,
} from '@/lib/api/jobs';
import type { JobCreativeDto } from '@/shared/dto/jobs.dto';

const inputCls =
  'h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy focus:border-orange focus-visible:ring-2 focus-visible:ring-orange/30';
const eyebrow = 'text-[10px] font-semibold uppercase tracking-widest text-slate-400';

/**
 * CREATIVES ON A DRIVE'S PUBLIC PAGE (additional requirement 3).
 *
 * URLs ONLY. Uploading goes through the platform's existing presigned-S3 path, so file
 * type, size and the bucket policy stay in one place rather than being re-implemented
 * here and drifting.
 *
 * ALT TEXT IS REQUIRED, not optional. WCAG 2.1 AA is a launch gate and a hiring poster
 * carries the role, the company and the deadline — it is informational, never decorative,
 * so a screen reader must be able to read it.
 */
export function JobCreativesManager({ jobId }: { jobId: string }) {
  const [items, setItems] = useState<JobCreativeDto[]>([]);
  const [url, setUrl] = useState('');
  const [alt, setAlt] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    try {
      setItems(await listJobCreatives(jobId));
    } catch (e) {
      setErr(describeError(e, 'Could not load this drive’s creatives.'));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  async function act(fn: () => Promise<unknown>, ok: string) {
    setBusy(true);
    setErr(null);
    try {
      await fn();
      await load();
      toast.success(ok);
    } catch (e) {
      const msg = describeError(e, 'That did not work.');
      setErr(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    void act(() => reorderJobCreatives(jobId, next.map((i) => i.id)), 'Reordered');
  };

  return (
    <div className="space-y-5">
      <div>
        <p className={eyebrow}>Public job board</p>
        <h2 className="mt-1 text-lg font-bold text-navy">Placement creatives</h2>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600">
          Posters and announcement images shown on this drive&rsquo;s public page. The cover
          is used wherever one image is shown; the rest scroll alongside it.
        </p>
      </div>

      {err ? (
        <div role="alert" className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200">
          {err}
        </div>
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="cr-url" className={eyebrow}>Image URL *</label>
            <input
              id="cr-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://…/poster.png"
              className={`mt-1 w-full ${inputCls}`}
            />
          </div>
          <div>
            <label htmlFor="cr-alt" className={eyebrow}>What the image says *</label>
            <input
              id="cr-alt"
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              placeholder="Infosys systems engineer, apply by 30 Oct"
              className={`mt-1 w-full ${inputCls}`}
            />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <Button
            disabled={!url.trim() || !alt.trim() || busy}
            onClick={() =>
              void act(
                async () => {
                  await addJobCreative(jobId, { url: url.trim(), alt: alt.trim() });
                  setUrl('');
                  setAlt('');
                },
                'Added',
              )
            }
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            Add creative
          </Button>
          <span className="text-xs text-slate-500">
            Alt text is required: it is what a screen reader, and Google, actually read.
          </span>
        </div>
      </div>

      {loading ? (
        <p className="p-6 text-center text-sm text-slate-500">
          <Loader2 className="mr-2 inline size-4 animate-spin" aria-hidden />Loading…
        </p>
      ) : items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
          No creatives yet. The public page falls back to the company logo.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((c, i) => (
            <li key={c.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="relative aspect-[16/9] bg-slate-50">
                {/* Unoptimised: these are operator-supplied absolute URLs on hosts the
                    image optimiser is not configured for, and a broken optimiser call
                    renders nothing at all rather than the image. */}
                <Image
                  src={c.url}
                  alt={c.alt ?? ''}
                  fill
                  unoptimized
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, 33vw"
                />
                {c.isCover ? (
                  <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                    <Star className="size-3 fill-current" aria-hidden /> Cover
                  </span>
                ) : null}
              </div>
              <div className="space-y-2 p-3">
                <p className="truncate text-xs text-slate-500" title={c.alt ?? ''}>
                  {c.alt || <span className="text-amber-700">No alt text</span>}
                </p>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Button variant="ghost" size="sm" disabled={busy || i === 0} onClick={() => move(i, i - 1)} aria-label="Move earlier">
                    <ArrowUp className="size-4" />
                  </Button>
                  <Button variant="ghost" size="sm" disabled={busy || i === items.length - 1} onClick={() => move(i, i + 1)} aria-label="Move later">
                    <ArrowDown className="size-4" />
                  </Button>
                  {!c.isCover ? (
                    <Button variant="outline" size="sm" disabled={busy}
                      onClick={() => void act(() => setJobCreativeCover(jobId, c.id), 'Cover updated')}>
                      Make cover
                    </Button>
                  ) : null}
                  <Button variant="ghost" size="sm" disabled={busy}
                    onClick={() => void act(() => deleteJobCreative(jobId, c.id), 'Removed')}
                    aria-label="Remove">
                    <Trash2 className="size-4 text-red-600" />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
