'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { StatusPill } from '@/components/student/StatusPill';
import { AdminToggle } from './AdminToggle';
import { MODULE_META, ACCENT_TILE } from './feature-lock-modules';
import {
  updateFeatureLock,
  type FeatureLocksSettings,
  type FeatureLockModule,
} from '@/lib/api/feature-locks';
import { describeError } from '@/lib/api/errors';

/**
 * The per-module lock matrix: one row per module, each with a Subscription and a Profile
 * completion toggle. Optimistic save per row; turning a profile lock ON confirms first
 * (it blocks un-calibrated students). A subscription toggle is shown "Not in effect" while
 * the master paywall is off, but stays operable so an admin can pre-stage.
 */
export function FeatureLockMatrix({
  settings,
  onChange,
  externalBusy = false,
  onBusyChange,
}: {
  settings: FeatureLocksSettings;
  onChange: (next: FeatureLocksSettings) => void;
  /** True while another flow on the page (the master paywall) is saving — blocks a
   *  module save so the two can't overlap and clobber each other's optimistic state. */
  externalBusy?: boolean;
  /** Reports whether a per-module save is in flight, so the parent can block the master. */
  onBusyChange?: (busy: boolean) => void;
}) {
  const [savingModule, setSavingModule] = useState<FeatureLockModule | null>(null);
  const masterOff = !settings.masterPaywallEnabled;
  // A save is in flight anywhere on the page (this matrix or the master toggle): disable
  // every control so a second click is never silently dropped.
  const anyBusy = savingModule !== null || externalBusy;

  useEffect(() => {
    onBusyChange?.(savingModule !== null);
  }, [savingModule, onBusyChange]);

  const save = async (
    module: FeatureLockModule,
    patch: { subscription?: boolean; profile?: boolean },
  ) => {
    if (anyBusy) return;
    const meta = MODULE_META.find((x) => x.module === module);
    if (patch.profile === true) {
      const ok = window.confirm(
        `Require students to complete their profile (Placement Readiness Test) before ${meta?.label ?? 'this module'}? Students who haven't will be blocked from it until they do.`,
      );
      if (!ok) return;
    }
    const prev = settings;
    onChange({
      ...settings,
      modules: settings.modules.map((x) => (x.module === module ? { ...x, ...patch } : x)),
    });
    setSavingModule(module);
    try {
      const fresh = await updateFeatureLock({ module, ...patch });
      onChange(fresh);
      const axis = patch.subscription !== undefined ? 'Subscription' : 'Profile';
      const val = (patch.subscription ?? patch.profile) ? 'on' : 'off';
      toast.success(`${meta?.label ?? 'Module'}: ${axis} lock turned ${val}.`);
    } catch (err) {
      onChange(prev);
      toast.error(describeError(err, 'Could not save. Please try again.'));
    } finally {
      setSavingModule(null);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="hidden items-center gap-4 border-b border-slate-100 px-5 py-3 md:grid md:grid-cols-[1fr_10rem_12rem]">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Module
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Subscription lock
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Profile completion lock
        </span>
      </div>

      <ul className="divide-y divide-slate-100">
        {MODULE_META.map((meta) => {
          const lock = settings.modules.find((x) => x.module === meta.module);
          if (!lock) return null;
          const Icon = meta.icon;
          return (
            <li
              key={meta.module}
              className="grid grid-cols-1 gap-3 px-5 py-4 md:grid-cols-[1fr_10rem_12rem] md:items-center"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`grid size-11 shrink-0 place-items-center rounded-xl ring-1 ${ACCENT_TILE[meta.accent]}`}
                >
                  <Icon className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-base font-bold text-navy">{meta.label}</p>
                  <p className="text-sm leading-relaxed text-slate-500">{meta.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-500 md:hidden">
                  Subscription lock
                </span>
                <AdminToggle
                  checked={lock.subscription}
                  disabled={anyBusy}
                  onChange={(v) => void save(meta.module, { subscription: v })}
                  label={`${meta.label} subscription lock`}
                />
                {masterOff && lock.subscription ? (
                  <StatusPill tone="neutral" label="Not in effect" />
                ) : null}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-500 md:hidden">
                  Profile completion lock
                </span>
                <AdminToggle
                  checked={lock.profile}
                  disabled={anyBusy}
                  onChange={(v) => void save(meta.module, { profile: v })}
                  label={`${meta.label} profile completion lock`}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
