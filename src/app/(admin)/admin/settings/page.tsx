'use client';

import { useEffect, useState } from 'react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { ConsoleHero } from '@/components/layout/ConsoleHero';
import { CreditCard, Info, Loader2, SlidersHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { AdminToggle } from '@/components/admin/AdminToggle';
import { FeatureLockMatrix } from '@/components/admin/FeatureLockMatrix';
import { getFeatureLocks, type FeatureLocksSettings } from '@/lib/api/feature-locks';
import { updatePaywallSettings } from '@/lib/api/paywall-admin';
import { describeError } from '@/lib/api/errors';

/**
 * Platform Admin — Feature Locks. One page, no redirects: a master subscription paywall
 * (the kill switch) on top, then a per-module matrix where each module (mocks, practice,
 * coding, company hubs, mock interview, resume, study material) has an independently
 * configurable subscription lock and profile-completion lock. Everything takes effect
 * immediately — no redeploy, and the env values are only the fallback.
 */
export default function AdminFeatureLocksPage() {
  const [data, setData] = useState<FeatureLocksSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingMaster, setSavingMaster] = useState(false);

  useEffect(() => {
    getFeatureLocks()
      .then(setData)
      .catch(() => toast.error('Could not load the feature locks.'))
      .finally(() => setLoading(false));
  }, []);

  // The master paywall is the platform-wide subscription switch (PaywallConfigService).
  // FeatureLocksService reads it back as masterPaywallEnabled, so we toggle it through the
  // proven paywall endpoint and mirror the result into our local feature-locks state.
  const saveMaster = async (enabled: boolean) => {
    if (!data || savingMaster) return;
    const prev = data;
    setData({ ...data, masterPaywallEnabled: enabled, masterPaywallSource: 'db' });
    setSavingMaster(true);
    try {
      const fresh = await updatePaywallSettings({ enabled });
      setData((d) =>
        d ? { ...d, masterPaywallEnabled: fresh.enabled, masterPaywallSource: fresh.source } : d,
      );
      toast.success(`Master subscription paywall turned ${enabled ? 'on' : 'off'}.`);
    } catch (err) {
      setData(prev);
      toast.error(describeError(err, 'Could not save. Please try again.'));
    } finally {
      setSavingMaster(false);
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
        description="Control what every student can reach — per module, no developer change needed. Each toggle takes effect immediately."
      />

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="size-7 animate-spin text-slate-500" />
        </div>
      ) : !data ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-600">
          Could not load the feature locks.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Master subscription paywall — the kill switch for every subscription lock. */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                  Master switch
                </p>
                <h2 className="mt-1 flex items-center gap-2 text-lg font-bold text-navy">
                  <CreditCard className="size-4 text-slate-500" /> Master subscription paywall
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">
                  The kill switch for <b>every</b> subscription lock below. When off, no
                  subscription lock bites — paid surfaces are open to everyone regardless of the
                  per-module toggles. Profile-completion locks are independent and keep working.
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  {data.masterPaywallSource === 'db' ? (
                    'Set by an admin (overrides the env default).'
                  ) : (
                    <>
                      Following the env default{' '}
                      <code className="rounded bg-slate-100 px-1 py-0.5">PAYWALL_ENABLED</code>.
                      Toggling here saves an admin override.
                    </>
                  )}
                </p>
              </div>
              <AdminToggle
                checked={data.masterPaywallEnabled}
                disabled={savingMaster}
                onChange={(v) => void saveMaster(v)}
                label="Master subscription paywall"
              />
            </div>
          </section>

          {/* When the master paywall is off, every subscription lock is moot — say so once. */}
          {!data.masterPaywallEnabled && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <Info className="mt-0.5 size-4 shrink-0 text-amber-600" />
              <p className="text-sm leading-relaxed text-amber-800">
                The master paywall is <b>off</b>, so the subscription locks below are staged but
                not in effect. Profile-completion locks still apply. Turn the master paywall on to
                enforce subscriptions.
              </p>
            </div>
          )}

          {/* Per-module matrix. */}
          <section className="space-y-3">
            <div>
              <h2 className="text-lg font-bold text-navy">Per-module locks</h2>
              <p className="mt-1 text-sm text-slate-600">
                <b>Subscription lock</b> — requires an active plan (gated by the master switch
                above). <b>Profile completion lock</b> — requires the Placement Readiness Test,
                independent of subscriptions. Set each module how you like.
              </p>
            </div>
            <FeatureLockMatrix settings={data} onChange={setData} />
          </section>
        </div>
      )}
    </div>
  );
}
