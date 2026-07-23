'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Search, Video, X } from 'lucide-react';
import { searchVimeoCatalog, type VimeoCatalogVideo } from '@/lib/api/vimeo';

function fmtDuration(s: number): string {
  if (!s || s < 0) return '';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

/**
 * Modal that searches the shared Vimeo library so an admin can pick a video
 * instead of pasting a URL. `onPick` receives the chosen video — callers use its
 * `link` as the field value (the existing provider auto-detect + hash-preserving
 * embed derivation handle the rest). Fail-soft: if the backend has no Vimeo token
 * (`configured: false`), it tells the admin to paste a link instead.
 */
export function VimeoPicker({
  onPick,
  onClose,
}: {
  onPick: (video: VimeoCatalogVideo) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(true);
  const [videos, setVideos] = useState<VimeoCatalogVideo[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 350);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    searchVimeoCatalog(debounced, 30)
      .then((res) => {
        if (!alive) return;
        setConfigured(res.configured);
        setVideos(res.videos);
      })
      .catch(() => {
        if (alive) setError('Could not load the Vimeo library. Try again, or paste a link instead.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [debounced]);

  const body = useMemo(() => {
    if (loading) {
      return (
        <div className="grid h-64 place-items-center">
          <Loader2 className="size-6 animate-spin text-slate-400" aria-hidden="true" />
        </div>
      );
    }
    if (!configured) {
      return (
        <div className="grid h-64 place-items-center px-6 text-center">
          <div>
            <Video className="mx-auto mb-2 size-8 text-slate-300" aria-hidden="true" />
            <p className="text-sm font-semibold text-navy">Vimeo library isn&apos;t connected</p>
            <p className="mt-1 text-xs text-slate-500">
              Close this and paste a Vimeo / Drive / YouTube link in the field instead.
            </p>
          </div>
        </div>
      );
    }
    if (error) {
      return <div className="grid h-64 place-items-center px-6 text-center text-sm text-red-600">{error}</div>;
    }
    if (videos.length === 0) {
      return (
        <div className="grid h-64 place-items-center text-sm text-slate-500">
          {debounced ? 'No videos match that search.' : 'No videos in the library yet.'}
        </div>
      );
    }
    return (
      <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3">
        {videos.map((v) => (
          <button
            key={v.vimeoId}
            type="button"
            onClick={() => {
              onPick(v);
              onClose();
            }}
            className="group overflow-hidden rounded-xl border border-slate-200 bg-white text-left transition-colors hover:border-[#ffc42d]"
          >
            <div className="relative aspect-video w-full bg-slate-100">
              {v.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={v.thumbnailUrl} alt="" className="absolute inset-0 size-full object-cover" />
              ) : (
                <div className="grid size-full place-items-center">
                  <Video className="size-6 text-slate-300" aria-hidden="true" />
                </div>
              )}
              {v.durationSeconds > 0 ? (
                <span className="absolute bottom-1.5 right-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  {fmtDuration(v.durationSeconds)}
                </span>
              ) : null}
            </div>
            <div className="p-2.5">
              <p className="line-clamp-2 text-xs font-semibold text-navy">{v.title}</p>
              <span className="mt-1 inline-block text-[10px] font-medium text-[#f5b400] opacity-0 transition-opacity group-hover:opacity-100">
                Use this video →
              </span>
            </div>
          </button>
        ))}
      </div>
    );
  }, [loading, configured, error, videos, debounced, onPick, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-slate-900/50" />
      <div className="relative flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search the Vimeo library…"
              className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-navy focus:border-[#ffc42d] focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 shrink-0 place-items-center rounded-full text-slate-500 hover:bg-slate-100"
            aria-label="Close picker"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="overflow-y-auto">{body}</div>
      </div>
    </div>
  );
}
