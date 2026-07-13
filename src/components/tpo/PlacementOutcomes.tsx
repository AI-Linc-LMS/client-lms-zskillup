'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Building2, IndianRupee, Loader2, Plus, Trash2, TrendingUp, Trophy } from 'lucide-react';
import {
  deleteTpoPlacement,
  getTpoPlacementSummary,
  getTpoPlacements,
  recordTpoPlacement,
} from '@/lib/api/tpo';
import type { TpoPlacement, TpoPlacementSummary, TpoStudentRow } from '@/shared';
import { BentoCard } from '@/components/tpo/ui';
import { Button } from '@/components/ui/button';

const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange';

export function PlacementOutcomes({ cohortId, students }: { cohortId: string; students: TpoStudentRow[] }) {
  const [summary, setSummary] = useState<TpoPlacementSummary | null>(null);
  const [list, setList] = useState<TpoPlacement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    studentId: '',
    companyName: '',
    role: '',
    ctcLpa: '',
    offerType: 'FULL_TIME',
    status: 'OFFERED',
    offerDate: '',
  });

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([getTpoPlacementSummary(cohortId || undefined), getTpoPlacements(cohortId || undefined)])
      .then(([s, l]) => {
        setSummary(s);
        setList(l);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [cohortId]);

  useEffect(() => {
    load();
  }, [load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.studentId || !form.companyName.trim()) {
      toast.error('Pick a student and enter a company');
      return;
    }
    setSaving(true);
    try {
      await recordTpoPlacement({
        studentId: form.studentId,
        companyName: form.companyName.trim(),
        role: form.role.trim() || undefined,
        ctcLpa: form.ctcLpa ? Number(form.ctcLpa) : undefined,
        offerType: form.offerType,
        status: form.status,
        offerDate: form.offerDate || undefined,
      });
      toast.success('Placement recorded');
      setForm({ studentId: '', companyName: '', role: '', ctcLpa: '', offerType: 'FULL_TIME', status: 'OFFERED', offerDate: '' });
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not record placement');
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    setList((l) => l.filter((p) => p.id !== id));
    try {
      await deleteTpoPlacement(id);
      load();
    } catch {
      toast.error('Could not delete');
      load();
    }
  }

  return (
    <BentoCard
      title="Placement Outcomes"
      subtitle="Real offers recorded by your team - the funnel below is not the readiness proxy."
      source="TPO-recorded placements"
      action={
        <Button size="sm" onClick={() => setShowForm((s) => !s)}>
          <Plus className="size-4" /> Record
        </Button>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="size-5 animate-spin text-slate-500" />
        </div>
      ) : (
        <div className="space-y-5">
          {/* Funnel */}
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <Tile icon={Trophy} label="Placed" value={summary?.studentsPlaced ?? 0} />
            <Tile icon={TrendingUp} label="Placement rate" value={`${summary?.placementRatePct ?? 0}%`} />
            <Tile icon={Building2} label="Total offers" value={summary?.totalOffers ?? 0} />
            <Tile icon={IndianRupee} label="Avg CTC" value={summary?.avgCtcLpa != null ? `${summary.avgCtcLpa} LPA` : '-'} />
            <Tile icon={IndianRupee} label="Highest CTC" value={summary?.highestCtcLpa != null ? `${summary.highestCtcLpa} LPA` : '-'} />
          </div>

          {(summary?.byCompany.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-2">
              {summary!.byCompany.map((c) => (
                <span key={c.company} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-navy">
                  <Building2 className="size-3 text-slate-500" /> {c.company} · {c.offers}
                </span>
              ))}
            </div>
          )}

          {/* Record form */}
          {showForm && (
            <form onSubmit={submit} className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4 sm:grid-cols-2">
              <label className="text-xs font-semibold text-slate-600 sm:col-span-2">
                Student
                <select value={form.studentId} onChange={(e) => setForm((f) => ({ ...f, studentId: e.target.value }))} className={`mt-1 ${inputCls}`} required>
                  <option value="">Select a student…</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {(s.name ?? s.email) + (s.rollNumber ? ` (${s.rollNumber})` : '')}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Company
                <input value={form.companyName} onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))} className={`mt-1 ${inputCls}`} placeholder="e.g. TCS" required />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Role
                <input value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} className={`mt-1 ${inputCls}`} placeholder="e.g. SDE" />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                CTC (LPA)
                <input type="number" step="0.1" min="0" value={form.ctcLpa} onChange={(e) => setForm((f) => ({ ...f, ctcLpa: e.target.value }))} className={`mt-1 ${inputCls}`} placeholder="e.g. 12" />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Offer date
                <input type="date" value={form.offerDate} onChange={(e) => setForm((f) => ({ ...f, offerDate: e.target.value }))} className={`mt-1 ${inputCls}`} />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Type
                <select value={form.offerType} onChange={(e) => setForm((f) => ({ ...f, offerType: e.target.value }))} className={`mt-1 ${inputCls}`}>
                  <option value="FULL_TIME">Full-time</option>
                  <option value="INTERNSHIP">Internship</option>
                  <option value="PPO">PPO</option>
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Status
                <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className={`mt-1 ${inputCls}`}>
                  <option value="OFFERED">Offered</option>
                  <option value="ACCEPTED">Accepted</option>
                  <option value="DECLINED">Declined</option>
                </select>
              </label>
              <div className="flex items-center gap-2 sm:col-span-2">
                <Button type="submit" size="sm" disabled={saving}>
                  {saving ? 'Saving…' : 'Save placement'}
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          )}

          {/* Recent list */}
          {list.length === 0 ? (
            <p className="py-2 text-sm text-slate-500">No placements recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="text-left text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                  <tr>
                    <th className="px-2 pb-2">Student</th>
                    <th className="px-2 pb-2">Company</th>
                    <th className="px-2 pb-2">CTC</th>
                    <th className="px-2 pb-2">Status</th>
                    <th className="px-2 pb-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {list.map((p) => (
                    <tr key={p.id}>
                      <td className="px-2 py-2 font-semibold text-navy">{p.studentName ?? '-'}</td>
                      <td className="px-2 py-2 text-slate-600">
                        {p.companyName}
                        {p.role ? <span className="text-slate-500"> · {p.role}</span> : null}
                      </td>
                      <td className="px-2 py-2 tabular-nums text-slate-600">{p.ctcLpa != null ? `${p.ctcLpa} LPA` : '-'}</td>
                      <td className="px-2 py-2">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">{p.status}</span>
                      </td>
                      <td className="px-2 py-2 text-right">
                        <button type="button" onClick={() => remove(p.id)} className="text-slate-400 hover:text-red-500" aria-label="Delete">
                          <Trash2 className="size-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </BentoCard>
  );
}

function Tile({ icon: Icon, label, value }: { icon: typeof Trophy; label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
        <Icon className="size-3.5" /> {label}
      </span>
      <p className="mt-1 text-xl font-black tabular-nums text-navy">{typeof value === 'number' ? value.toLocaleString('en-IN') : value}</p>
    </div>
  );
}
