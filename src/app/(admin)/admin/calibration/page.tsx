'use client';

import { useEffect, useState } from 'react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { CalendarClock, CheckCircle2, Loader2, ShieldCheck, Target } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  getCalibrationSettings,
  updateCalibrationSettings,
  type CalibrationAdminSettings,
  type UpdateCalibrationSettingsPayload,
} from '@/lib/api/calibration-admin';

function fmtWhen(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

/** Platform Admin — the calibration (Placement Readiness Test) gate + which
 *  scheduled assessment IS the calibration. */
export default function AdminCalibrationPage() {
  const [data, setData] = useState<CalibrationAdminSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getCalibrationSettings()
      .then(setData)
      .catch(() => toast.error('Could not load calibration settings.'))
      .finally(() => setLoading(false));
  }, []);

  const save = async (patch: UpdateCalibrationSettingsPayload) => {
    if (!data || saving) return;
    const prev = data;
    // Optimistic: reflect the change immediately, roll back on failure.
    setData({
      ...data,
      enabled: patch.enabled ?? data.enabled,
      source: patch.enabled !== undefined ? 'db' : data.source,
      calibrationAssessmentId:
        patch.calibrationAssessmentId !== undefined
          ? patch.calibrationAssessmentId
          : data.calibrationAssessmentId,
      assessments:
        patch.calibrationAssessmentId !== undefined
          ? data.assessments.map((a) => ({
              ...a,
              isCalibration: a.id === patch.calibrationAssessmentId,
            }))
          : data.assessments,
    });
    setSaving(true);
    try {
      const fresh = await updateCalibrationSettings(patch);
      setData(fresh);
      toast.success('Calibration settings saved.');
    } catch {
      setData(prev);
      toast.error('Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Platform Admin', href: '/admin/dashboard' }, { label: 'Calibration' }]} />

      <header>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Assessment library</p>
        <h1 className="mt-1 flex items-center gap-2 text-[28px] font-extrabold tracking-tight text-navy">
          <Target className="size-6 text-[#f5b400]" /> Calibration
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Turn the Placement Readiness Test gate on or off platform-wide, and choose which scheduled assessment students take as their calibration.
        </p>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="size-7 animate-spin text-slate-500" />
        </div>
      ) : !data ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-600">
          Could not load calibration settings.
        </div>
      ) : (
        <div className="space-y-5">
          {/* Gate toggle */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h2 className="flex items-center gap-2 text-base font-bold text-navy">
                  <ShieldCheck className="size-4 text-slate-500" /> Require calibration for students
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  When on, a student must complete the Placement Readiness Test before study-plan and recommendations unlock.
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  {data.source === 'db' ? (
                    <>Set by an admin (overrides the env default of <b>{String(data.envDefault)}</b>).</>
                  ) : (
                    <>Following the env default <code className="rounded bg-slate-100 px-1 py-0.5">CALIBRATION_ENABLED = {String(data.envDefault)}</code>. Toggling here saves an admin override.</>
                  )}
                </p>
              </div>
              <Toggle
                checked={data.enabled}
                disabled={saving}
                onChange={(v) => void save({ enabled: v })}
              />
            </div>
          </div>

          {/* Which assessment is THE calibration */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="flex items-center gap-2 text-base font-bold text-navy">
              <CalendarClock className="size-4 text-slate-500" /> Calibration assessment
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Exactly one active scheduled assessment is the calibration. Picking one clears the flag from any other.
            </p>

            <div className="mt-4 space-y-2">
              <AssessmentRow
                label="None — no assessment is the calibration"
                selected={data.calibrationAssessmentId === null}
                disabled={saving}
                onSelect={() => void save({ calibrationAssessmentId: null })}
              />
              {data.assessments.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                  No active scheduled assessments yet. Create one under Assessments first.
                </p>
              ) : (
                data.assessments.map((a) => (
                  <AssessmentRow
                    key={a.id}
                    label={a.title}
                    meta={fmtWhen(a.scheduledAt)}
                    selected={a.id === data.calibrationAssessmentId}
                    disabled={saving}
                    onSelect={() => void save({ calibrationAssessmentId: a.id })}
                  />
                ))
              )}
            </div>
          </div>

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

/** One selectable calibration option (radio semantics). */
function AssessmentRow({
  label,
  meta,
  selected,
  disabled,
  onSelect,
}: {
  label: string;
  meta?: string;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        'flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60',
        selected ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-white hover:bg-slate-50',
      )}
    >
      <span
        className={cn(
          'flex size-4 shrink-0 items-center justify-center rounded-full border-2',
          selected ? 'border-emerald-500' : 'border-slate-300',
        )}
      >
        {selected && <span className="size-2 rounded-full bg-emerald-500" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-navy">{label}</span>
        {meta && <span className="block text-xs text-slate-500">{meta}</span>}
      </span>
      {selected && <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />}
    </button>
  );
}
