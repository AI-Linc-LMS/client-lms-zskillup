'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, FolderOpen, ListChecks, Loader2, Plus, Search, Video, X } from 'lucide-react';
import {
  listVimeoFolders,
  searchVimeoCatalog,
  type VimeoCatalogVideo,
  type VimeoFolder,
} from '@/lib/api/vimeo';
import { ApiRequestError } from '@/lib/api/types';
import { cn } from '@/lib/utils';

// The backend serves browse/search from a cached full library, so asking for a large
// slice returns the WHOLE catalog (not just the newest page) without extra Vimeo calls.
const BROWSE_LIMIT = 500;

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
  onPickMany,
  onClose,
}: {
  /** Single-pick mode (fills one URL field): picking closes the modal. */
  onPick?: (video: VimeoCatalogVideo) => void;
  /** Bulk mode: tick videos, then "Add N to platform" imports them all at once. When
   *  provided, the picker renders in multi-select mode instead of single-pick. */
  onPickMany?: (videos: VimeoCatalogVideo[]) => void;
  onClose: () => void;
}) {
  const multiple = !!onPickMany;
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(true);
  const [videos, setVideos] = useState<VimeoCatalogVideo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [folders, setFolders] = useState<VimeoFolder[]>([]);
  const [folderId, setFolderId] = useState(''); // '' = whole library
  // Multi-select: keep the full video objects (keyed by id) so we can return them + toggle.
  const [selected, setSelected] = useState<Map<string, VimeoCatalogVideo>>(new Map());

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 350);
    return () => clearTimeout(t);
  }, [query]);

  // Load the folder list once (best-effort — folder filter just doesn't appear if it fails).
  useEffect(() => {
    let alive = true;
    listVimeoFolders()
      .then((res) => alive && setFolders(res.folders))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    searchVimeoCatalog(debounced, BROWSE_LIMIT, folderId || null)
      .then((res) => {
        if (!alive) return;
        setConfigured(res.configured);
        setVideos(res.videos);
      })
      .catch((err) => {
        if (!alive) return;
        // Surface the backend's specific reason (e.g. "Vimeo is rate-limiting requests.
        // Try again in a moment.") instead of one generic string for every failure.
        setError(
          err instanceof ApiRequestError && err.message
            ? `${err.message} Or paste a link instead.`
            : 'Could not load the Vimeo library. Try again, or paste a link instead.',
        );
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [debounced, folderId]);

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
    const allSelected = videos.length > 0 && videos.every((v) => selected.has(v.vimeoId));
    return (
      <>
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-3">
          <p className="text-[11px] font-medium text-slate-500">
            {debounced
              ? `${videos.length} ${videos.length === 1 ? 'match' : 'matches'} for “${debounced}”`
              : `Browsing the full library · ${videos.length} video${videos.length === 1 ? '' : 's'}`}
          </p>
          {/* Select-all is deliberately scoped to a chosen FOLDER — never the whole library. */}
          {multiple && folderId ? (
            <button
              type="button"
              onClick={() =>
                setSelected((prev) => {
                  if (allSelected) return new Map();
                  const next = new Map(prev);
                  for (const v of videos) next.set(v.vimeoId, v);
                  return next;
                })
              }
              className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-navy hover:bg-slate-200"
            >
              <ListChecks className="size-3.5" /> {allSelected ? 'Clear all' : 'Select all'}
            </button>
          ) : null}
        </div>
        <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3">
          {videos.map((v) => {
            const isSel = selected.has(v.vimeoId);
            return (
              <button
                key={v.vimeoId}
                type="button"
                onClick={() => {
                  if (multiple) {
                    setSelected((prev) => {
                      const next = new Map(prev);
                      if (next.has(v.vimeoId)) next.delete(v.vimeoId);
                      else next.set(v.vimeoId, v);
                      return next;
                    });
                  } else {
                    onPick?.(v);
                    onClose();
                  }
                }}
                className={cn(
                  'group overflow-hidden rounded-xl border bg-white text-left transition-colors',
                  isSel ? 'border-[#f5b400] ring-2 ring-[#ffc42d]/60' : 'border-slate-200 hover:border-[#ffc42d]',
                )}
              >
                <div className="relative aspect-video w-full bg-slate-100">
                  {v.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={v.thumbnailUrl} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />
                  ) : (
                    <div className="grid size-full place-items-center">
                      <Video className="size-6 text-slate-300" aria-hidden="true" />
                    </div>
                  )}
                  {multiple ? (
                    <span
                      className={cn(
                        'absolute left-1.5 top-1.5 grid size-5 place-items-center rounded-full',
                        isSel ? 'bg-[#f5b400] text-white' : 'bg-black/40',
                      )}
                    >
                      {isSel ? <Check className="size-3.5" /> : <span className="size-3 rounded-full border border-white/70" />}
                    </span>
                  ) : null}
                  {v.durationSeconds > 0 ? (
                    <span className="absolute bottom-1.5 right-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      {fmtDuration(v.durationSeconds)}
                    </span>
                  ) : null}
                </div>
                <div className="p-2.5">
                  <p className="line-clamp-2 text-xs font-semibold text-navy">{v.title}</p>
                  {!multiple ? (
                    <span className="mt-1 inline-block text-[10px] font-medium text-[#f5b400] opacity-0 transition-opacity group-hover:opacity-100">
                      Use this video →
                    </span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </>
    );
  }, [loading, configured, error, videos, debounced, onPick, onClose, multiple, folderId, selected]);

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
          {folders.length > 0 && (
            <div className="relative hidden sm:block">
              <FolderOpen className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <select
                value={folderId}
                onChange={(e) => setFolderId(e.target.value)}
                aria-label="Filter by folder"
                className="h-10 max-w-[13rem] rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm font-semibold text-navy focus:border-[#ffc42d] focus:outline-none"
              >
                <option value="">All folders</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.videoCount})
                  </option>
                ))}
              </select>
            </div>
          )}
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
        {multiple ? (
          <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
            <span className="text-xs font-semibold text-slate-500">
              {selected.size} selected
            </span>
            <button
              type="button"
              disabled={selected.size === 0}
              onClick={() => {
                onPickMany?.([...selected.values()]);
                onClose();
              }}
              className="inline-flex items-center gap-1.5 rounded-full bg-orange px-4 py-2 text-sm font-bold text-[#171717] disabled:opacity-50"
            >
              <Plus className="size-4" /> Add{selected.size ? ` ${selected.size}` : ''} to platform
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
