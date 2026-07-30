'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Film, Loader2, PlayCircle, Video, X } from 'lucide-react';
import {
  listConceptVideoTopics,
  setTopicConceptVideo,
  type AdminTopicConceptVideoDto,
} from '@/lib/api/concept-videos';
import { VimeoPicker } from '@/components/media/VimeoPicker';

/**
 * Admin authoring for per-topic concept videos. Each topic can carry one Vimeo
 * concept video (paste a link or browse the Vimeo catalog). Students then see it in
 * the adaptive "Concept video" modal and the study-plan concept-video step. Topics
 * without a video stay "coming soon".
 */
export function ConceptVideosAdmin() {
  const [rows, setRows] = useState<AdminTopicConceptVideoDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');

  useEffect(() => {
    listConceptVideoTopics()
      .then(setRows)
      .catch(() => setError('Could not load topics.'));
  }, []);

  const patchRow = (updated: AdminTopicConceptVideoDto) =>
    setRows((rs) => (rs ? rs.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)) : rs));

  const bySection = useMemo(() => {
    const groups = new Map<string, AdminTopicConceptVideoDto[]>();
    for (const r of rows ?? []) {
      if (q && !`${r.name} ${r.sectionName}`.toLowerCase().includes(q.toLowerCase())) continue;
      const arr = groups.get(r.sectionName) ?? [];
      arr.push(r);
      groups.set(r.sectionName, arr);
    }
    return [...groups.entries()];
  }, [rows, q]);

  const withVideo = (rows ?? []).filter((r) => r.conceptVideoEmbedUrl).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Admin</p>
          <h1 className="flex items-center gap-2 text-[28px] font-extrabold tracking-tight text-navy">
            <Film className="size-6 text-slate-500" /> Concept videos
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Attach a Vimeo concept video to each topic. Shown in the adaptive Concept-video modal + the
            study-plan step. {rows ? `${withVideo}/${rows.length} topics have a video.` : ''}
          </p>
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search topics…"
          className="h-10 w-56 rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy focus:border-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/30"
        />
      </div>

      {error ? (
        <div className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200" role="alert">
          {error}
        </div>
      ) : null}

      {rows === null ? (
        <div className="grid place-items-center py-20">
          <Loader2 className="size-6 animate-spin text-slate-400" />
        </div>
      ) : (
        <div className="space-y-6">
          {bySection.map(([section, topics]) => (
            <div key={section}>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">{section}</p>
              <div className="space-y-2">
                {topics.map((t) => (
                  <TopicRow key={t.id} row={t} onSaved={patchRow} />
                ))}
              </div>
            </div>
          ))}
          {bySection.length === 0 ? <p className="text-sm text-slate-500">No topics match.</p> : null}
        </div>
      )}
    </div>
  );
}

function TopicRow({
  row,
  onSaved,
}: {
  row: AdminTopicConceptVideoDto;
  onSaved: (r: AdminTopicConceptVideoDto) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [url, setUrl] = useState(row.conceptVideoUrl ?? '');
  const [title, setTitle] = useState(row.conceptVideoTitle ?? '');
  const [picker, setPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const hasVideo = !!row.conceptVideoEmbedUrl;

  const save = async (nextUrl: string, nextTitle: string) => {
    setSaving(true);
    setErr(null);
    try {
      const updated = await setTopicConceptVideo(row.id, { url: nextUrl || null, title: nextTitle || null });
      onSaved(updated);
      setEditing(false);
    } catch {
      setErr('Save failed — try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-bold text-navy">
            {row.name}
            <span className="text-[11px] font-medium text-slate-400">· {row.questionCount} Qs</span>
          </p>
          {hasVideo ? (
            <p className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
              <PlayCircle className="size-3.5" /> {row.conceptVideoTitle || 'Concept video set'}
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-slate-400">No concept video yet</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasVideo ? (
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
              <Check className="mr-0.5 inline size-3" /> Video
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => {
              setUrl(row.conceptVideoUrl ?? '');
              setTitle(row.conceptVideoTitle ?? '');
              setEditing((v) => !v);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-navy transition-colors hover:bg-slate-50"
          >
            <Video className="size-3.5" /> {hasVideo ? 'Change' : 'Set video'}
          </button>
        </div>
      </div>

      {editing ? (
        <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste a Vimeo link…"
              className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 px-3 text-sm text-navy focus:border-orange focus-visible:outline-none"
            />
            <button
              type="button"
              onClick={() => setPicker(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-navy transition-colors hover:bg-slate-50"
            >
              <Film className="size-3.5" /> Browse Vimeo
            </button>
          </div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Optional title"
            className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm text-navy focus:border-orange focus-visible:outline-none"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => save(url, title)}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-full bg-navy px-4 py-1.5 text-xs font-bold text-white transition-colors hover:bg-navy/90 disabled:opacity-60"
            >
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />} Save
            </button>
            {hasVideo ? (
              <button
                type="button"
                onClick={() => save('', '')}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60"
              >
                <X className="size-3.5" /> Remove
              </button>
            ) : null}
            {err ? <span className="text-xs font-medium text-red-600">{err}</span> : null}
          </div>
        </div>
      ) : null}

      {picker ? (
        <VimeoPicker
          onClose={() => setPicker(false)}
          onPick={(v) => {
            setUrl(v.link);
            if (!title) setTitle(v.title);
          }}
        />
      ) : null}
    </div>
  );
}
