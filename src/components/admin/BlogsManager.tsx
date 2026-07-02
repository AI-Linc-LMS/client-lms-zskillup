'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  createBlog,
  deleteBlog,
  listAdminBlogs,
  updateBlog,
} from '@/lib/api/content';
import type { BlogPostDto } from '@/shared/dto/content.dto';
import { describeError } from '@/lib/api/errors';
import { BadgeCheck, Loader2, Plus, Trash2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange';

const EMPTY = {
  id: '' as string,
  title: '',
  slug: '',
  excerpt: '',
  body: '',
  coverUrl: '',
  author: '',
  tags: '',
  status: 'DRAFT' as 'DRAFT' | 'PUBLISHED',
};

/** Blog CMS manager (Phase 5). Create / edit / publish / delete posts. */
export function BlogsManager() {
  const [posts, setPosts] = useState<BlogPostDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setPosts(await listAdminBlogs());
    } catch {
      setError('Failed to load posts.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const flash = (m: string) => {
    setSuccess(m);
    setError(null);
    setTimeout(() => setSuccess(null), 3000);
  };

  const edit = (p: BlogPostDto) => {
    setForm({
      id: p.id,
      title: p.title,
      slug: p.slug,
      excerpt: p.excerpt ?? '',
      body: p.body,
      coverUrl: p.coverUrl ?? '',
      author: p.author ?? '',
      tags: (p.tags ?? []).join(', '),
      status: p.status,
    });
    setEditing(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const reset = () => {
    setForm(EMPTY);
    setEditing(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      title: form.title.trim(),
      slug: form.slug.trim() || undefined,
      excerpt: form.excerpt.trim() || null,
      body: form.body,
      coverUrl: form.coverUrl.trim() || null,
      author: form.author.trim() || null,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      status: form.status,
    };
    try {
      if (editing && form.id) {
        await updateBlog(form.id, payload);
        flash('Post updated.');
      } else {
        await createBlog(payload);
        flash('Post created.');
      }
      reset();
      load();
    } catch (err) {
      setError(describeError(err, 'Failed to save the post.'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (p: BlogPostDto) => {
    if (!window.confirm(`Delete "${p.title}"? This cannot be undone.`)) return;
    try {
      await deleteBlog(p.id);
      flash('Post deleted.');
      if (form.id === p.id) reset();
      load();
    } catch (err) {
      setError(describeError(err, 'Failed to delete.'));
    }
  };

  return (
    <div className="space-y-5">
      {success && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          <BadgeCheck className="size-4 shrink-0" /> {success}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <XCircle className="size-4 shrink-0" /> {error}
        </div>
      )}

      <form onSubmit={submit} className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2">
        <p className="sm:col-span-2 text-sm font-bold text-navy">
          {editing ? 'Edit post' : 'New post'}
        </p>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">Title</span>
          <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputCls} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">Slug (blank = from title)</span>
          <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className={inputCls} placeholder="my-post" />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-medium text-slate-500">Excerpt</span>
          <input value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} className={inputCls} />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-medium text-slate-500">Body (markdown)</span>
          <textarea rows={6} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} className={inputCls} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">Cover image URL</span>
          <input value={form.coverUrl} onChange={(e) => setForm({ ...form, coverUrl: e.target.value })} className={inputCls} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">Author</span>
          <input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} className={inputCls} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">Tags (comma-separated)</span>
          <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} className={inputCls} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">Status</span>
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as 'DRAFT' | 'PUBLISHED' })} className={inputCls}>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
          </select>
        </label>
        <div className="sm:col-span-2 flex gap-2">
          <button type="submit" disabled={saving || !form.title.trim()} className="inline-flex items-center gap-2 rounded-lg bg-orange px-4 py-2 text-sm font-semibold text-white hover:bg-orange/90 disabled:opacity-50">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            {editing ? 'Save changes' : 'Create post'}
          </button>
          {editing && (
            <button type="button" onClick={reset} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="size-6 animate-spin text-slate-400" /></div>
        ) : posts.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">No posts yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                <tr>
                  <th className="px-4 py-3">Post</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Published</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {posts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-navy">{p.title}</p>
                      <p className="text-xs text-slate-400">/{p.slug}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-semibold', p.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500')}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {p.publishedAt ? new Date(p.publishedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button onClick={() => edit(p)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-navy hover:bg-slate-50">Edit</button>
                        <button onClick={() => remove(p)} className="rounded-lg border border-red-200 p-1.5 text-red-600 hover:bg-red-50" aria-label="Delete"><Trash2 className="size-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
