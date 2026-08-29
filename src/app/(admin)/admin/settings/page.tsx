'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { ConsoleHero } from '@/components/layout/ConsoleHero';
import { ArrowRight, CreditCard, Loader2, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  getPaywallSettings,
  updatePaywallSettings,
  type PaywallAdminSettings,
} from '@/lib/api/paywall-admin';

/**
 * Platform Admin — Feature Locks. Turn the platform-wide subscription paywall on or off
 * without a redeploy (the env default is only the fallback). The profile-completion
 * (calibration) lock lives on its own page; per-assessment lock toggles live on each mock.
 */
export default function AdminFeatureLocksPage() {
  const [data, setData] = useState<PaywallAdminSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getPaywallSettings()
      .then(setData)
      .catch(() => toast.error('Could not load the paywall setting.'))
      .finally(() => setLoading(false));
  }, []);

  const save = async (enabled: boolean) => {
    if (!data || saving) return;
    const prev = data;
    // Optimistic: reflect immediately, roll back on failure.
    setData({ ...data, enabled, source: 'db' });
    setSaving(true);
    try {
      const fresh = await updatePaywallSettings({ enabled });
      setData(fresh);
      toast.success(`Subscription paywall turned ${enabled ? 'on' : 'off'}.`);
    } catch {
      setData(prev);
      toast.error('Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Platform Admin', href: '/admin/dashboard' },
          { label: 'Feature Locks' },
        ]}
      />

      <ConsoleHero
        icon={SlidersHorizontal}
        eyebrow="Platform Admin"
        title="Feature Locks"
        description="Turn the platform's access locks on or off without a developer change. Each takes effect immediately."
      />

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="size-7 animate-spin text-slate-500" />
        </div>
      ) : !data ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-600">
          Could not load the paywall setting.
        </div>
      ) : (
        <div className="space-y-5">
          {/* Subscription / upgrade lock */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h2 className="flex items-center gap-2 text-base font-bold text-navy">
                  <CreditCard className="size-4 text-slate-500" /> Subscription / upgrade lock
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  When on, paid surfaces (mock assessments, practice beyond the free meter,
                  career tools, company drives) stay locked until a student has the required
                  plan. When off, they are open to everyone.
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  {data.source === 'db' ? (
                    <>
                      Set by an admin (overrides the env default of <b>{String(data.envDefault)}</b>
                      ).
                    </>
                  ) : (
                    <>
                      Following the env default{' '}
                      <code className="rounded bg-slate-100 px-1 py-0.5">
                        PAYWALL_ENABLED = {String(data.envDefault)}
                      </code>
                      . Toggling here saves an admin override.
                    </>
                  )}
                </p>
              </div>
              <Toggle checked={data.enabled} disabled={saving} onChange={(v) => void save(v)} />
            </div>
          </div>

          {/* Profile-completion lock — lives on the calibration page */}
          <Link
            href="/admin/calibration"
            className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 transition-colors hover:bg-slate-50"
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-sky-50 text-sky-600 ring-1 ring-sky-100">
              <ShieldCheck className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-base font-bold text-navy">Profile completion lock</span>
              <span className="mt-0.5 block text-sm text-slate-600">
                The platform-wide Placement Readiness Test gate is managed on the Calibration
                page. Individual assessments can also require it from each mock&apos;s settings.
              </span>
            </span>
            <ArrowRight className="size-4 shrink-0 text-slate-300" />
          </Link>

          {saving && (
            <p className="flex items-center gap-2 text-xs text-slate-500">
              <Loader2 className="size-3.5 animate-spin" /> Saving…
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/** Accessible on/off switch styled to the admin palette. */
function Toggle({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-emerald-500' : 'bg-slate-300',
      )}
    >
      <span
        className={cn(
          'inline-block size-5 transform rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0.5',
        )}
      />
    </button>
  );
}
