'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ExternalLink, Loader2, MessageCircle, Search } from 'lucide-react';
import {
  listAdminCompanies,
  setCompanyWhatsappCommunity,
  type AdminCompanyRow,
} from '@/lib/api/admin';
import { ApiRequestError } from '@/lib/api/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Dedicated WhatsApp Community management surface. Every recruiter hub in one place,
 * with its invite link inline — so the control is discoverable rather than buried as a
 * per-row button in the Companies table. Setting a link is the on/off switch: the
 * "Join WhatsApp Community" CTA appears on that company's hub the moment a link is saved,
 * and disappears when it is removed (backend re-validates the host).
 */
export function WhatsAppCommunityAdmin() {
  const [companies, setCompanies] = useState<AdminCompanyRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const refresh = useCallback(async () => {
    try {
      setCompanies(await listAdminCompanies());
    } catch (err) {
      setLoadError(err instanceof ApiRequestError ? err.message : 'Could not load companies.');
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const q = query.trim().toLowerCase();
  const filtered = useMemo(
    () => (companies ?? []).filter((c) => !q || c.name.toLowerCase().includes(q) || c.slug.includes(q)),
    [companies, q],
  );
  const setCount = (companies ?? []).filter((c) => !!c.whatsappCommunityUrl).length;
  const total = companies?.length ?? 0;

  if (loadError) {
    return (
      <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700" role="alert">
        {loadError}
      </p>
    );
  }
  if (!companies) {
    return <div className="h-96 animate-pulse rounded-xl border border-slate-200 bg-white shadow-sm" />;
  }

  return (
    <div className="space-y-5">
      {/* summary + search */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
            <MessageCircle className="size-5" />
          </span>
          <div>
            <p className="text-sm font-bold text-navy">
              {setCount} of {total} compan{total === 1 ? 'y' : 'ies'} have a WhatsApp community
            </p>
            <p className="text-xs text-slate-500">
              Students see a &ldquo;Join WhatsApp Community&rdquo; button on a company&apos;s hub while its link is set.
            </p>
          </div>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search companies…"
            aria-label="Search companies"
            className="h-10 w-56 rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-navy focus:border-orange focus:outline-none focus-visible:ring-2 focus-visible:ring-orange/30"
          />
        </div>
      </div>

      {/* per-company editors */}
      <div className="space-y-3">
        {filtered.map((c) => (
          <CompanyRow key={c.id} company={c} onSaved={refresh} />
        ))}
        {filtered.length === 0 && (
          <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
            No companies match &ldquo;{query.trim()}&rdquo;.
          </p>
        )}
      </div>
    </div>
  );
}

function CompanyRow({ company, onSaved }: { company: AdminCompanyRow; onSaved: () => void }) {
  const [url, setUrl] = useState(company.whatsappCommunityUrl ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<'set' | 'cleared' | null>(null);
  const isSet = !!company.whatsappCommunityUrl;

  const save = async (next: string) => {
    setSaving(true);
    setError(null);
    setSaved(null);
    try {
      const res = await setCompanyWhatsappCommunity(company.id, next);
      setUrl(res.whatsappCommunityUrl ?? '');
      setSaved(res.whatsappCommunityUrl ? 'set' : 'cleared');
      onSaved();
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : 'Could not save the community link.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex min-w-0 flex-wrap items-center gap-2.5">
        <span className="text-base font-bold text-navy">{company.name}</span>
        {!company.isPublished && (
          <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-500 ring-1 ring-inset ring-slate-200">
            Draft
          </span>
        )}
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset',
            isSet ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-slate-50 text-slate-600 ring-slate-200',
          )}
        >
          {isSet ? 'Live' : 'Not set'}
        </span>
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setSaved(null);
            setError(null);
          }}
          placeholder="https://chat.whatsapp.com/…"
          aria-label={`WhatsApp community link for ${company.name}`}
          aria-invalid={error ? true : undefined}
          className="h-10 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy focus:border-orange focus:outline-none focus-visible:ring-2 focus-visible:ring-orange/30"
        />
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" onClick={() => save(url.trim())} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : 'Save'}
          </Button>
          {(isSet || url.trim()) && (
            <Button type="button" size="sm" variant="outline" onClick={() => save('')} disabled={saving}>
              Remove
            </Button>
          )}
        </div>
      </div>

      <div role="status" aria-live="polite" className="min-h-0">
        {error && (
          <p role="alert" className="mt-2 text-xs font-medium text-red-600">
            {error}
          </p>
        )}
        {saved === 'set' && (
          <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs font-medium text-emerald-600">
            Saved — the hub now shows the Join button.
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 underline underline-offset-2"
              >
                Open <ExternalLink className="size-3" />
              </a>
            )}
          </p>
        )}
        {saved === 'cleared' && (
          <p className="mt-2 text-xs font-medium text-emerald-600">Removed — the hub no longer shows the button.</p>
        )}
      </div>
    </div>
  );
}
