'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Building2, Check, Loader2, Newspaper, Plus, Quote, Star, TrendingUp, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { uploadAdminImage } from '@/lib/api/media';
import type { MediaUploadPurpose } from '@/shared/dto/media.dto';
import {
  createBlog,
  createPlacement,
  createTestimonial,
  listAdminBlogs,
  listAdminPlacements,
  listAdminTestimonials,
} from '@/lib/api/content';
import { updateJob, type JobPostingDto } from '@/lib/api/jobs';
import type { BlogPostDto, PlacementRecordDto, TestimonialDto } from '@/shared/dto/content.dto';
import { describeError } from '@/lib/api/errors';
import { cn, safeHttpUrl } from '@/lib/utils';

const input =
  'mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy focus:border-orange focus-visible:ring-2 focus-visible:ring-orange/30';
const area =
  'mt-1 w-full rounded-lg border border-slate-200 bg-white p-3 text-sm text-navy focus:border-orange focus-visible:ring-2 focus-visible:ring-orange/30';
const label = 'text-[10px] font-semibold uppercase tracking-widest text-slate-400';

/** An image field that accepts either a pasted URL or a direct upload (presigned S3). */
function ImageUpload({
  labelText,
  value,
  onChange,
  purpose,
}: {
  labelText: string;
  value: string;
  onChange: (url: string) => void;
  purpose: MediaUploadPurpose;
}) {
  const [busy, setBusy] = useState(false);
  const onFile = async (file: File) => {
    setBusy(true);
    try {
      onChange(await uploadAdminImage(file, purpose));
      toast.success('Image uploaded');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  };
  return (
    <label className="block">
      <span className={label}>{labelText}</span>
      <div className="mt-1 flex items-center gap-2">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy focus:border-orange focus-visible:ring-2 focus-visible:ring-orange/30"
          placeholder="Paste a URL or upload…"
        />
        <label className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-navy transition-colors hover:bg-slate-50">
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />} Upload
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onFile(f);
              e.target.value = '';
            }}
          />
        </label>
        {safeHttpUrl(value) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={safeHttpUrl(value) ?? undefined}
            alt=""
            className="size-10 shrink-0 rounded-lg border border-slate-200 object-cover"
          />
        ) : null}
      </div>
    </label>
  );
}

/** Selected-state check dot, shared by both grids. */
function Dot({ on }: { on: boolean }) {
  return (
    <span
      className={cn(
        'mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border transition-colors',
        on ? 'border-orange bg-orange text-white' : 'border-slate-300 bg-white text-transparent',
      )}
      aria-hidden
    >
      <Check className="size-3" />
    </span>
  );
}

/**
 * Wizard step: attach SPECIFIC testimonials + blog posts to THIS posting.
 *
 * The job page shows only the related content chosen here - not a global pool - so a
 * Deloitte role can carry Deloitte placement stories while a Wipro role carries its own.
 * Admins select from the published library or add a new item inline (created published so
 * it renders immediately). Selection persists to the job on every change, matching the
 * rest of the wizard: each step is a PATCH, safe to close.
 *
 * Only PUBLISHED items are offered, because the public :slug/related endpoint returns
 * published items only - showing a draft here would be a selection that never appears.
 */
export function RelatedContentPicker({
  jobId,
  initialTestimonialIds,
  initialBlogIds,
  initialPlacementIds,
  onSaved,
}: {
  jobId: string;
  initialTestimonialIds: string[];
  initialBlogIds: string[];
  initialPlacementIds: string[];
  /** Keep the parent's job in sync so the true selection survives step navigation. */
  onSaved?: (job: JobPostingDto) => void;
}) {
  const [testimonials, setTestimonials] = useState<TestimonialDto[]>([]);
  const [blogs, setBlogs] = useState<BlogPostDto[]>([]);
  const [placementLib, setPlacementLib] = useState<PlacementRecordDto[]>([]);
  const [selT, setSelT] = useState<string[]>(initialTestimonialIds);
  const [selB, setSelB] = useState<string[]>(initialBlogIds);
  const [selP, setSelP] = useState<string[]>(initialPlacementIds);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [addT, setAddT] = useState(false);
  const [tForm, setTForm] = useState({
    authorName: '',
    authorTitle: '',
    avatarUrl: '',
    imageUrl: '',
    quote: '',
    rating: '5',
  });
  const [addB, setAddB] = useState(false);
  const [bForm, setBForm] = useState({ title: '', excerpt: '', coverUrl: '', body: '' });
  const [addP, setAddP] = useState(false);
  const [pForm, setPForm] = useState({
    studentName: '',
    role: '',
    batch: '',
    avatarUrl: '',
    company: '',
    companyLogoUrl: '',
    packageLabel: '',
  });

  useEffect(() => {
    let alive = true;
    Promise.all([listAdminTestimonials(), listAdminBlogs(), listAdminPlacements()])
      .then(([t, b, p]) => {
        if (!alive) return;
        setTestimonials(t.filter((x) => x.isPublished));
        setBlogs(b.filter((x) => x.status === 'PUBLISHED'));
        setPlacementLib(p.filter((x) => x.isPublished));
      })
      .catch((err) => alive && toast.error(describeError(err, 'Could not load the content library.')))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const persist = async (nextT: string[], nextB: string[], nextP: string[]) => {
    setSaving(true);
    try {
      const saved = await updateJob(jobId, {
        testimonialIds: nextT,
        blogIds: nextB,
        placementIds: nextP,
      });
      onSaved?.(saved);
    } catch (err) {
      toast.error(describeError(err, 'Could not save the selection.'));
    } finally {
      setSaving(false);
    }
  };

  const toggleT = (id: string) => {
    const next = selT.includes(id) ? selT.filter((x) => x !== id) : [...selT, id];
    setSelT(next);
    void persist(next, selB, selP);
  };
  const toggleB = (id: string) => {
    const next = selB.includes(id) ? selB.filter((x) => x !== id) : [...selB, id];
    setSelB(next);
    void persist(selT, next, selP);
  };
  const toggleP = (id: string) => {
    const next = selP.includes(id) ? selP.filter((x) => x !== id) : [...selP, id];
    setSelP(next);
    void persist(selT, selB, next);
  };

  const submitTestimonial = async () => {
    if (tForm.authorName.trim().length < 2) {
      toast.error('A name is needed.');
      return;
    }
    if (!safeHttpUrl(tForm.imageUrl) && tForm.quote.trim().length < 3) {
      toast.error('Add either an image or a quote.');
      return;
    }
    setSaving(true);
    try {
      const created = await createTestimonial({
        authorName: tForm.authorName.trim(),
        authorTitle: tForm.authorTitle.trim() || null,
        avatarUrl: safeHttpUrl(tForm.avatarUrl) ?? null,
        imageUrl: safeHttpUrl(tForm.imageUrl) ?? null,
        quote: tForm.quote.trim() || undefined,
        rating: tForm.rating ? Number(tForm.rating) : null,
        isPublished: true,
      });
      setTestimonials((prev) => [created, ...prev]);
      const next = [...selT, created.id];
      setSelT(next);
      await persist(next, selB, selP);
      setTForm({ authorName: '', authorTitle: '', avatarUrl: '', imageUrl: '', quote: '', rating: '5' });
      setAddT(false);
      toast.success('Placement story added and attached.');
    } catch (err) {
      toast.error(describeError(err, 'Could not add that story.'));
    } finally {
      setSaving(false);
    }
  };

  const submitBlog = async () => {
    if (bForm.title.trim().length < 3) {
      toast.error('A title of at least 3 characters is needed.');
      return;
    }
    setSaving(true);
    try {
      const created = await createBlog({
        title: bForm.title.trim(),
        excerpt: bForm.excerpt.trim() || null,
        coverUrl: safeHttpUrl(bForm.coverUrl) ?? null,
        body: bForm.body,
        status: 'PUBLISHED',
      });
      setBlogs((prev) => [created, ...prev]);
      const next = [...selB, created.id];
      setSelB(next);
      await persist(selT, next, selP);
      setBForm({ title: '', excerpt: '', coverUrl: '', body: '' });
      setAddB(false);
      toast.success('Article added and attached.');
    } catch (err) {
      toast.error(describeError(err, 'Could not add that article.'));
    } finally {
      setSaving(false);
    }
  };

  const submitPlacement = async () => {
    if (pForm.studentName.trim().length < 2 || pForm.company.trim().length < 1) {
      toast.error('A student name and a company are needed.');
      return;
    }
    setSaving(true);
    try {
      const created = await createPlacement({
        studentName: pForm.studentName.trim(),
        role: pForm.role.trim() || null,
        batch: pForm.batch.trim() || null,
        avatarUrl: safeHttpUrl(pForm.avatarUrl) ?? null,
        company: pForm.company.trim(),
        companyLogoUrl: safeHttpUrl(pForm.companyLogoUrl) ?? null,
        packageLabel: pForm.packageLabel.trim() || null,
        isPublished: true,
      });
      setPlacementLib((prev) => [created, ...prev]);
      const next = [...selP, created.id];
      setSelP(next);
      await persist(selT, selB, next);
      setPForm({
        studentName: '',
        role: '',
        batch: '',
        avatarUrl: '',
        company: '',
        companyLogoUrl: '',
        packageLabel: '',
      });
      setAddP(false);
      toast.success('Placement record added and attached.');
    } catch (err) {
      toast.error(describeError(err, 'Could not add that placement record.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="grid place-items-center py-16">
        <Loader2 className="size-5 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <p className="text-sm leading-relaxed text-slate-600">
        Pick the placement highlights, stories and articles that should appear on{' '}
        <strong>this</strong> posting. Nothing here is global - each role carries its own. Select from
        the library below or add a new one; new items are published and attached straight away.
        {saving ? (
          <span className="ml-2 inline-flex items-center gap-1 text-xs text-slate-400">
            <Loader2 className="size-3 animate-spin" /> Saving…
          </span>
        ) : null}
      </p>

      {/* ── Placement records ────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between">
          <div>
            <p className={label}>Placement highlights</p>
            <p className="mt-0.5 text-sm text-slate-500">
              {selP.length} selected · student → company → package cards
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setAddP((v) => !v)}>
            {addP ? <X className="size-4" /> : <Plus className="size-4" />} {addP ? 'Cancel' : 'Add new'}
          </Button>
        </div>

        {addP ? (
          <div className="mt-3 rounded-xl border border-orange/25 bg-orange/[0.03] p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className={label}>Student name *</span>
                <input value={pForm.studentName} onChange={(e) => setPForm((f) => ({ ...f, studentName: e.target.value }))} className={input} placeholder="Rohan Mehta" />
              </label>
              <label className="block">
                <span className={label}>Role / batch</span>
                <input value={pForm.role} onChange={(e) => setPForm((f) => ({ ...f, role: e.target.value }))} className={input} placeholder="SDE · CSE 2025" />
              </label>
              <label className="block">
                <span className={label}>Company *</span>
                <input value={pForm.company} onChange={(e) => setPForm((f) => ({ ...f, company: e.target.value }))} className={input} placeholder="Google" />
              </label>
              <label className="block">
                <span className={label}>Package</span>
                <input value={pForm.packageLabel} onChange={(e) => setPForm((f) => ({ ...f, packageLabel: e.target.value }))} className={input} placeholder="₹18 LPA" />
              </label>
              <ImageUpload
                labelText="Student photo"
                value={pForm.avatarUrl}
                onChange={(v) => setPForm((f) => ({ ...f, avatarUrl: v }))}
                purpose="speaker-photo"
              />
              <ImageUpload
                labelText="Company logo"
                value={pForm.companyLogoUrl}
                onChange={(v) => setPForm((f) => ({ ...f, companyLogoUrl: v }))}
                purpose="job-logo"
              />
            </div>
            <div className="mt-3 flex justify-end">
              <Button size="sm" onClick={submitPlacement} disabled={saving}>
                Add &amp; attach
              </Button>
            </div>
          </div>
        ) : null}

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {placementLib.map((p) => {
            const on = selP.includes(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => toggleP(p.id)}
                className={cn(
                  'flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors',
                  on ? 'border-orange/50 bg-orange/5 ring-1 ring-orange/20' : 'border-slate-200 bg-white hover:bg-slate-50',
                )}
              >
                <Dot on={on} />
                {safeHttpUrl(p.avatarUrl) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={safeHttpUrl(p.avatarUrl) ?? undefined} alt="" className="size-10 shrink-0 rounded-full object-cover ring-1 ring-slate-200" />
                ) : (
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
                    {p.studentName.slice(0, 1).toUpperCase()}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-navy">{p.studentName}</span>
                  <span className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                    <Building2 className="size-3.5 shrink-0" />
                    <span className="truncate">{p.company}</span>
                  </span>
                </span>
                {p.packageLabel ? (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-200">
                    <TrendingUp className="size-3" />
                    {p.packageLabel}
                  </span>
                ) : null}
              </button>
            );
          })}
          {placementLib.length === 0 ? (
            <p className="text-sm text-slate-400">No placement records yet - add one above.</p>
          ) : null}
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between">
          <div>
            <p className={label}>Placement stories</p>
            <p className="mt-0.5 text-sm text-slate-500">
              {selT.length} selected · testimonials shown on the job page
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setAddT((v) => !v)}>
            {addT ? <X className="size-4" /> : <Plus className="size-4" />} {addT ? 'Cancel' : 'Add new'}
          </Button>
        </div>

        {addT ? (
          <div className="mt-3 rounded-xl border border-orange/25 bg-orange/[0.03] p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className={label}>Student name *</span>
                <input value={tForm.authorName} onChange={(e) => setTForm((f) => ({ ...f, authorName: e.target.value }))} className={input} placeholder="Ananya Sharma" />
              </label>
              <label className="block">
                <span className={label}>Role / company / batch</span>
                <input value={tForm.authorTitle} onChange={(e) => setTForm((f) => ({ ...f, authorTitle: e.target.value }))} className={input} placeholder="Placed at Acme · CSE 2025" />
              </label>
              <ImageUpload
                labelText="Student photo"
                value={tForm.avatarUrl}
                onChange={(v) => setTForm((f) => ({ ...f, avatarUrl: v }))}
                purpose="speaker-photo"
              />
              <label className="block">
                <span className={label}>Rating</span>
                <select value={tForm.rating} onChange={(e) => setTForm((f) => ({ ...f, rating: e.target.value }))} className={input}>
                  <option value="">No rating</option>
                  {[5, 4, 3, 2, 1].map((n) => (
                    <option key={n} value={n}>{n} ★</option>
                  ))}
                </select>
              </label>
              <div className="sm:col-span-2">
                <ImageUpload
                  labelText="Placement image (full graphic — shown full-width, e.g. a 'Congratulations' card)"
                  value={tForm.imageUrl}
                  onChange={(v) => setTForm((f) => ({ ...f, imageUrl: v }))}
                  purpose="blog-cover"
                />
              </div>
              <label className="block sm:col-span-2">
                <span className={label}>Quote (optional — used when no image is set)</span>
                <textarea rows={3} value={tForm.quote} onChange={(e) => setTForm((f) => ({ ...f, quote: e.target.value }))} className={area} placeholder="The company-wise practice felt exactly like the real thing…" />
              </label>
            </div>
            <div className="mt-3 flex justify-end">
              <Button size="sm" onClick={submitTestimonial} disabled={saving}>
                Add &amp; attach
              </Button>
            </div>
          </div>
        ) : null}

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {testimonials.map((t) => {
            const on = selT.includes(t.id);
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => toggleT(t.id)}
                className={cn(
                  'flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors',
                  on ? 'border-orange/50 bg-orange/5 ring-1 ring-orange/20' : 'border-slate-200 bg-white hover:bg-slate-50',
                )}
              >
                <Dot on={on} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-start gap-1.5">
                    <Quote className="mt-0.5 size-3.5 shrink-0 text-orange/60" />
                    <span className="line-clamp-2 text-sm leading-relaxed text-slate-700">
                      {t.quote || (t.imageUrl ? 'Image placement card' : '')}
                    </span>
                  </span>
                  <span className="mt-2 flex items-center gap-2">
                    {safeHttpUrl(t.avatarUrl) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={safeHttpUrl(t.avatarUrl) ?? undefined} alt="" className="size-6 rounded-full object-cover ring-1 ring-slate-200" />
                    ) : (
                      <span className="grid size-6 place-items-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500">
                        {t.authorName.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                    <span className="truncate text-xs font-bold text-navy">{t.authorName}</span>
                    {t.rating ? (
                      <span className="ml-auto flex items-center gap-0.5">
                        {Array.from({ length: t.rating }).map((_, i) => (
                          <Star key={i} className="size-3 fill-amber-400 text-amber-400" />
                        ))}
                      </span>
                    ) : null}
                  </span>
                </span>
              </button>
            );
          })}
          {testimonials.length === 0 ? (
            <p className="text-sm text-slate-400">No published testimonials yet - add one above.</p>
          ) : null}
        </div>
      </section>

      {/* ── Blogs ────────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between">
          <div>
            <p className={label}>Related reading</p>
            <p className="mt-0.5 text-sm text-slate-500">
              {selB.length} selected · articles shown in the sidebar rail
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setAddB((v) => !v)}>
            {addB ? <X className="size-4" /> : <Plus className="size-4" />} {addB ? 'Cancel' : 'Add new'}
          </Button>
        </div>

        {addB ? (
          <div className="mt-3 rounded-xl border border-orange/25 bg-orange/[0.03] p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className={label}>Title *</span>
                <input value={bForm.title} onChange={(e) => setBForm((f) => ({ ...f, title: e.target.value }))} className={input} placeholder="How to crack your first tech interview" />
              </label>
              <ImageUpload
                labelText="Cover image"
                value={bForm.coverUrl}
                onChange={(v) => setBForm((f) => ({ ...f, coverUrl: v }))}
                purpose="blog-cover"
              />
              <label className="block">
                <span className={label}>One-line summary</span>
                <input value={bForm.excerpt} onChange={(e) => setBForm((f) => ({ ...f, excerpt: e.target.value }))} className={input} placeholder="A practical, week-by-week plan." />
              </label>
              <label className="block sm:col-span-2">
                <span className={label}>Body</span>
                <textarea rows={4} value={bForm.body} onChange={(e) => setBForm((f) => ({ ...f, body: e.target.value }))} className={area} placeholder="Write the article…" />
              </label>
            </div>
            <div className="mt-3 flex justify-end">
              <Button size="sm" onClick={submitBlog} disabled={saving}>
                Add &amp; attach
              </Button>
            </div>
          </div>
        ) : null}

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {blogs.map((b) => {
            const on = selB.includes(b.id);
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => toggleB(b.id)}
                className={cn(
                  'flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors',
                  on ? 'border-orange/50 bg-orange/5 ring-1 ring-orange/20' : 'border-slate-200 bg-white hover:bg-slate-50',
                )}
              >
                <Dot on={on} />
                {safeHttpUrl(b.coverUrl) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={safeHttpUrl(b.coverUrl) ?? undefined} alt="" className="size-12 shrink-0 rounded-lg object-cover ring-1 ring-slate-200" />
                ) : (
                  <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-sky-50 text-sky-600 ring-1 ring-sky-100">
                    <Newspaper className="size-5" />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 text-sm font-bold text-navy">{b.title}</span>
                  {b.excerpt ? (
                    <span className="mt-0.5 line-clamp-1 block text-xs text-slate-500">{b.excerpt}</span>
                  ) : null}
                </span>
              </button>
            );
          })}
          {blogs.length === 0 ? (
            <p className="text-sm text-slate-400">No published articles yet - add one above.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
