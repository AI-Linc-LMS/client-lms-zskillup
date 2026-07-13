'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { CommunityPostType } from '@/shared/enums';
import { createCommunityPost, type CommunityPostDto } from '@/lib/api/community';
import { describeError } from '@/lib/api/errors';
import { POST_TYPES, POST_TYPE_LIST } from './ui';

/**
 * Create-a-post modal. Supports the four post kinds; the RESOURCE kind reveals a
 * link field. Tags are comma/space separated (max 6). Calls onCreated with the
 * new post so the feed can prepend it optimistically.
 */
export function PostComposer({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (post: CommunityPostDto) => void;
}) {
  const [type, setType] = useState<CommunityPostType>(CommunityPostType.DISCUSSION);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setType(CommunityPostType.DISCUSSION);
    setTitle('');
    setBody('');
    setTags('');
    setLinkUrl('');
  };

  const submit = async () => {
    if (title.trim().length < 3) {
      toast.error('Give your post a title (at least 3 characters).');
      return;
    }
    setSaving(true);
    try {
      const post = await createCommunityPost({
        type,
        title: title.trim(),
        body: body.trim(),
        tags: tags
          .split(/[,\s]+/)
          .map((t) => t.trim().replace(/^#/, '').toLowerCase())
          .filter(Boolean)
          .slice(0, 6),
        linkUrl: type === CommunityPostType.RESOURCE ? linkUrl.trim() || null : null,
      });
      toast.success('Posted to the community.');
      onCreated(post);
      reset();
      onClose();
    } catch (err) {
      toast.error(describeError(err, 'Could not create the post.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="relative z-10 w-full max-w-xl rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="text-base font-black text-navy">Create a post</h2>
              <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Close">
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              {/* Type selector */}
              <div className="flex flex-wrap gap-2">
                {POST_TYPE_LIST.map((t) => {
                  const cfg = POST_TYPES[t];
                  const Icon = cfg.icon;
                  const active = type === t;
                  return (
                    <button
                      key={t}
                      onClick={() => setType(t)}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors',
                        active ? cfg.chip : 'border-slate-200 text-slate-500 hover:bg-slate-50',
                      )}
                    >
                      <Icon className="size-3.5" /> {cfg.label}
                    </button>
                  );
                })}
              </div>

              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                placeholder={
                  type === CommunityPostType.QUESTION ? 'What do you want to ask?' : 'Give it a clear title'
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-semibold text-navy shadow-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                autoFocus
              />

              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={20000}
                rows={5}
                placeholder="Share the details… (markdown-ish plain text)"
                className="w-full resize-y rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 shadow-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
              />

              {type === CommunityPostType.RESOURCE && (
                <input
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  maxLength={500}
                  placeholder="https://link-to-the-resource"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                />
              )}

              <input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="Tags (comma separated) - e.g. dsa, interview, react"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
              />
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-4">
              <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100">
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-orange px-4 py-2 text-sm font-bold text-[#171717] shadow-sm hover:bg-orange/90 disabled:opacity-50"
              >
                {saving ? <Loader2 className="size-4 animate-spin" /> : null} Post
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
