'use client';

import { useEffect, useState } from 'react';
import { Check, Copy, Link2, Loader2, ShieldAlert, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/Modal';
import {
  createUserSheetLink,
  listUserSheetLinks,
  revokeUserSheetLink,
  type UserSheetLink,
} from '@/lib/api/admin';
import { describeApiError } from '@/lib/api/types';

/**
 * THE SHEET THAT KEEPS ITSELF UP TO DATE.
 *
 * Exporting gives you a file, and a file is stale the moment it opens — staying
 * current meant downloading a new one and rebuilding whatever was around it. This
 * hands out one URL instead, which Google Sheets and Excel re-fetch on their own
 * schedule, so a single spreadsheet stays live.
 *
 * The URL is a credential and is treated as one on screen: it is shown ONCE, with
 * what it exposes said plainly, and every link can be killed from here. `lastUsedAt`
 * and `useCount` are what make a forgotten-but-still-pulling link visible.
 */
export function LiveLinkPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [links, setLinks] = useState<UserSheetLink[] | null>(null);
  const [label, setLabel] = useState('');
  const [minting, setMinting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** The one and only time this URL can be read. Cleared when the dialog closes. */
  const [fresh, setFresh] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    listUserSheetLinks()
      .then(setLinks)
      .catch((e: unknown) => setError(describeApiError(e, 'Could not load the links.')));
  }, [open]);

  const close = () => {
    // The URL is unrecoverable, so it never outlives the dialog that showed it.
    setFresh(null);
    setCopied(false);
    setLabel('');
    onClose();
  };

  const mint = async () => {
    setMinting(true);
    setError(null);
    try {
      const { link, url } = await createUserSheetLink(label.trim() || null);
      setFresh(url);
      setLinks((prev) => [link, ...(prev ?? [])]);
      setLabel('');
    } catch (e: unknown) {
      setError(describeApiError(e, 'Could not create the link.'));
    } finally {
      setMinting(false);
    }
  };

  const revoke = async (id: string) => {
    setRevoking(id);
    setError(null);
    try {
      const updated = await revokeUserSheetLink(id);
      setLinks((prev) => (prev ?? []).map((l) => (l.id === id ? updated : l)));
    } catch (e: unknown) {
      setError(describeApiError(e, 'Could not revoke the link.'));
    } finally {
      setRevoking(null);
    }
  };

  const copy = async () => {
    if (!fresh) return;
    try {
      await navigator.clipboard.writeText(fresh);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (insecure context, or permission denied) — the URL is
      // on screen and selectable, so this is a convenience, not the only way out.
      setCopied(false);
    }
  };

  const live = (links ?? []).filter((l) => !l.revokedAt);

  return (
    <Modal open={open} onClose={close} maxWidth="max-w-2xl">
      <div className="max-h-[80vh] overflow-y-auto p-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Live user sheet
        </p>
        <h2 className="mt-1 text-lg font-bold text-navy">A link your spreadsheet keeps pulling</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Paste this URL into Google Sheets or Excel once. It always returns the current sheet, so
          new registrations and profile changes appear in that same spreadsheet without anyone
          downloading a new file.
        </p>

        <p className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 ring-1 ring-amber-200">
          <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            Treat the URL like a password. Anyone who has it can read every user&rsquo;s name, email
            and phone — no sign-in required. Put it in the sheet, not in chat, and revoke it when
            the sheet is retired.
          </span>
        </p>

        {fresh && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-700">
              Shown once — copy it now
            </p>
            <code className="mt-2 block break-all rounded-lg bg-white p-3 text-xs text-navy ring-1 ring-emerald-200">
              {fresh}
            </code>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={() => void copy()}>
                {copied ? <Check /> : <Copy />}
                {copied ? 'Copied' : 'Copy URL'}
              </Button>
              <span className="text-xs text-slate-500">
                In Google Sheets, cell A1: <code>=IMPORTDATA(&quot;…&quot;)</code>
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Only the link&rsquo;s fingerprint is stored, so this URL cannot be shown again. If it
              is lost, revoke it and mint another.
            </p>
          </div>
        )}

        <div className="mt-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <label
            htmlFor="live-link-label"
            className="text-[10px] font-semibold uppercase tracking-widest text-slate-400"
          >
            Mint a link
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            <input
              id="live-link-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={120}
              placeholder="What is it for? e.g. Placement team sheet"
              className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy focus:border-orange focus-visible:ring-2 focus-visible:ring-orange/30"
            />
            <Button onClick={() => void mint()} disabled={minting}>
              {minting ? <Loader2 className="animate-spin" /> : <Link2 />}
              Create link
            </Button>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            A name makes a stale link recognisable later — it is the only thing that tells two
            links apart.
          </p>
        </div>

        {error && (
          <p role="alert" className="mt-4 rounded-md bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200">
            {error}
          </p>
        )}

        <p className="mt-6 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Links {links ? `(${live.length} live)` : ''}
        </p>
        {links === null ? (
          <p className="mt-2 text-sm text-slate-500">Loading…</p>
        ) : links.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No links yet.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {links.map((l) => (
              <li
                key={l.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-navy">
                    {l.label || 'Untitled link'}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Created {new Date(l.createdAt).toLocaleDateString('en-IN')} ·{' '}
                    {l.useCount === 0
                      ? 'never pulled'
                      : `pulled ${l.useCount} time${l.useCount === 1 ? '' : 's'}`}
                    {l.lastUsedAt
                      ? `, last ${new Date(l.lastUsedAt).toLocaleString('en-IN')}`
                      : ''}
                  </p>
                </div>
                {l.revokedAt ? (
                  <span className="rounded-full bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
                    Revoked
                  </span>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                      Live
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void revoke(l.id)}
                      disabled={revoking === l.id}
                    >
                      {revoking === l.id ? <Loader2 className="animate-spin" /> : <Trash2 />}
                      Revoke
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6 flex justify-end">
          <Button variant="outline" onClick={close}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}
