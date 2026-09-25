'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  ArrowRight,
  BarChart3,
  CalendarClock,
  ChevronDown,
  ClipboardList,
  Loader2,
  Pencil,
  Plus,
  CopyPlus,
  Send,
  Trash2,
  Users,
  Video,
  X,
} from 'lucide-react';
import { AssessmentWizard } from '@/components/superadmin/AssessmentWizard';
import { ExtendDeadlineDialog } from '@/components/assessment/ExtendDeadlineDialog';
import { AdminAssessmentCreator } from '@/components/superadmin/AdminAssessmentCreator';
import { ResultsReport } from '@/components/assessment/ResultsReport';
import { RowActionsMenu } from '@/components/ui/RowActionsMenu';
import { DuplicateAssessmentDialog } from '@/components/assessment/DuplicateAssessmentDialog';
import { PublishAssessmentDialog } from '@/components/assessment/PublishAssessmentDialog';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ApiRequestError } from '@/lib/api/types';
import { describeAccessError, describeError } from '@/lib/api/errors';
import { listCompanies, type ApiCompany } from '@/lib/api/catalog';
import { listAdminMocks, type AdminMockRow } from '@/lib/api/admin';
import {
  createScheduledAssessment,
  assessmentWindowEndMs,
  deleteScheduledAssessment,
  getAssessmentResults,
  listScheduledAssessments,
  releaseAssessmentResults,
  updateScheduledAssessment,
  type ApiScheduledAssessment,
  type AssessmentResults,
} from '@/lib/api/scheduling';

/** Superadmin scheduler for company assessments (assessment lifecycle, Phase 2). */
export function SchedulingAdmin() {
  const [rows, setRows] = useState<ApiScheduledAssessment[] | null>(null);
  const [companies, setCompanies] = useState<ApiCompany[]>([]);
  const [mocks, setMocks] = useState<AdminMockRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  /** The list itself failed to load - shown with the table, not in the collapsed form. */
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // create form
  const [companyId, setCompanyId] = useState('');
  const [mockTestId, setMockTestId] = useState('');
  const [title, setTitle] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [proctored, setProctored] = useState(true);
  const [proctorAutoSubmit, setProctorAutoSubmit] = useState(false);
  const [proctorMaxWarnings, setProctorMaxWarnings] = useState(3);
  const [creating, setCreating] = useState(false);
  const [results, setResults] = useState<AssessmentResults | null>(null);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editWizardId, setEditWizardId] = useState<string | null>(null);
  /** Re-run a drive (same paper, new window) and announce one — both act on a row. */
  const [duplicating, setDuplicating] = useState<ApiScheduledAssessment | null>(null);
  const [publishing, setPublishing] = useState<ApiScheduledAssessment | null>(null);
  /** The row whose closing date is being moved (the one edit a drive with attempts takes). */
  const [extending, setExtending] = useState<ApiScheduledAssessment | null>(null);
  const [showExistingMock, setShowExistingMock] = useState(false);
  const [showQuickBuild, setShowQuickBuild] = useState(false);

  // filters
  const [fCompany, setFCompany] = useState('');
  const [fStatus, setFStatus] = useState<'all' | 'upcoming' | 'live' | 'past' | 'inactive'>('all');
  const [fDuration, setFDuration] = useState<'all' | 'short' | 'medium' | 'long'>('all');

  const filtered = useMemo(() => {
    if (!rows) return [];
    const now = Date.now();
    return rows.filter((r) => {
      if (fCompany && r.companyId !== fCompany) return false;
      if (fDuration === 'short' && r.durationMinutes > 30) return false;
      if (fDuration === 'medium' && (r.durationMinutes <= 30 || r.durationMinutes > 90)) return false;
      if (fDuration === 'long' && r.durationMinutes <= 90) return false;
      const start = +new Date(r.scheduledAt);
      const end = assessmentWindowEndMs(r);
      if (fStatus === 'inactive') return !r.isActive;
      if (fStatus === 'upcoming') return now < start;
      if (fStatus === 'live') return now >= start && now <= end;
      if (fStatus === 'past') return now > end;
      return true;
    });
  }, [rows, fCompany, fStatus, fDuration]);

  const openResults = async (id: string) => {
    setResultsLoading(true);
    setResults(null);
    try {
      setResults(await getAssessmentResults(id));
    } catch (e) {
      // Was swallowed, so the modal just vanished. A college-limited admin gets 403 on
      // another college's drive - say why.
      toast.error(describeAccessError(e, `You can't view these results ${NOT_YOUR_COLLEGE}`, 'Could not load results.'));
    } finally {
      setResultsLoading(false);
    }
  };

  const load = () =>
    listScheduledAssessments()
      .then((list) => {
        setRows(list);
        setLoadErr(null);
      })
      .catch((e) => setLoadErr(describeError(e, 'Could not load scheduled assessments.')));

  useEffect(() => {
    void load();
    listCompanies().then(setCompanies).catch(() => {});
    listAdminMocks().then(setMocks).catch(() => {});
  }, []);

  const companyName = useMemo(
    () => Object.fromEntries(companies.map((c) => [c.id, c.name])),
    [companies],
  );

  const create = async () => {
    if (!companyId || !title.trim() || !scheduledAt) {
      setErr('Company, title and date/time are required.');
      return;
    }
    setCreating(true);
    setErr(null);
    try {
      await createScheduledAssessment({
        companyId,
        mockTestId: mockTestId || undefined,
        title: title.trim(),
        scheduledAt: new Date(scheduledAt).toISOString(),
        durationMinutes,
        proctored,
        proctorAutoSubmit: proctored && proctorAutoSubmit,
        proctorMaxWarnings,
      });
      setTitle('');
      setScheduledAt('');
      setMockTestId('');
      await load();
    } catch (e) {
      setErr(e instanceof ApiRequestError ? e.message : 'Could not schedule.');
    } finally {
      setCreating(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm('Delete this scheduled assessment?')) return;
    setBusyId(id);
    try {
      await deleteScheduledAssessment(id);
      await load();
    } catch (e) {
      toast.error(describeAccessError(e, `You can't delete this assessment ${NOT_YOUR_COLLEGE}`, 'Could not delete the assessment.'));
    } finally {
      setBusyId(null);
    }
  };

  const toggleActive = async (r: ApiScheduledAssessment) => {
    setBusyId(r.id);
    try {
      await updateScheduledAssessment(r.id, { isActive: !r.isActive });
      await load();
    } catch (e) {
      // An isActive-only PATCH never touches the question set, so no lock message applies here.
      toast.error(describeAccessError(e, `You can't change this assessment ${NOT_YOUR_COLLEGE}`, 'Could not update the assessment.'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      {wizardOpen ? (
        <AssessmentWizard onClose={() => setWizardOpen(false)} onCreated={load} />
      ) : null}
      {editWizardId ? (
        <AssessmentWizard editId={editWizardId} onClose={() => setEditWizardId(null)} onCreated={load} />
      ) : null}
      {duplicating ? (
        <DuplicateAssessmentDialog
          assessmentId={duplicating.id}
          title={duplicating.title}
          scheduledAt={duplicating.scheduledAt}
          endsAt={duplicating.endsAt}
          durationMinutes={duplicating.durationMinutes}
          onClose={() => setDuplicating(null)}
          onDuplicated={(created) => {
            setDuplicating(null);
            toast.success(
              `"${created.title}" created with ${created.mcqCount + created.codingCount} questions. It is not published yet.`,
            );
            void load();
          }}
        />
      ) : null}
      {publishing ? (
        <PublishAssessmentDialog
          assessmentId={publishing.id}
          title={publishing.title}
          onClose={() => setPublishing(null)}
          onPublished={() => {
            setPublishing(null);
            toast.success('Published — its audience is being emailed.');
            void load();
          }}
        />
      ) : null}
      {extending ? (
        <ExtendDeadlineDialog
          assessmentId={extending.id}
          title={extending.title}
          onClose={() => setExtending(null)}
          onSaved={(saved) => {
            setExtending(null);
            toast.success(
              saved.endsAt
                ? `Closing time set to ${new Date(saved.endsAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}.`
                : 'Closing time updated.',
            );
            void load();
          }}
        />
      ) : null}

      {/* Primary entry point: the assessment wizard (random + manual selection, review,
          publish). One CTA on the page. */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-orange-50 text-orange-700 ring-1 ring-orange-100">
              <ClipboardList className="size-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Assessment builder</p>
              <h2 className="text-lg font-bold text-navy">Create an assessment</h2>
              <p className="text-sm text-slate-500">
                Draw questions at random from the bank or pick them by hand, review every question and the total marks,
                then publish.
              </p>
            </div>
          </div>
          <Button type="button" onClick={() => setWizardOpen(true)}>
            <Plus aria-hidden /> Create assessment
          </Button>
        </div>
      </div>

      {/* Cohort discoverability (#5): cohort CREATION (name, add students, import CSV)
          lives under Colleges, not here - the builder only PICKS an existing cohort. */}
      <Link
        href="/admin/colleges"
        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/40"
      >
        <span className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-sky-50 text-sky-600 ring-1 ring-sky-100">
            <Users className="size-5" aria-hidden />
          </span>
          <span>
            <span className="font-semibold text-navy">Create &amp; manage cohorts (batches)</span> — to assign an assessment to a group of
            students, first build a cohort (name, add students or import a CSV) under <span className="font-semibold">Colleges → open a college → Cohorts</span>, then pick it in the builder.
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1 font-semibold whitespace-nowrap text-navy">
          Manage cohorts <ArrowRight className="size-4" aria-hidden />
        </span>
      </Link>

      {/* Advanced: the one-shot bank-sampling build (mode → rounds → topics → counts), the
          same flow as the TPO Assessment Center. Collapsed — the wizard is the main path. */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <button
          type="button"
          onClick={() => setShowQuickBuild((v) => !v)}
          aria-expanded={showQuickBuild}
          aria-controls="quick-random-build"
          className="flex w-full items-center gap-2 rounded-lg text-left text-sm font-semibold text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/40"
        >
          <ChevronDown className={cn('size-4 text-slate-400 transition-transform', showQuickBuild && 'rotate-180')} aria-hidden />
          Advanced: quick random build
          <span className="ml-auto text-xs font-normal text-slate-500">
            Samples the bank at publish time — no question review
          </span>
        </button>
        {showQuickBuild ? (
          <div id="quick-random-build" className="mt-4 border-t border-slate-100 pt-4">
            <AdminAssessmentCreator onCreated={load} />
          </div>
        ) : null}
      </div>

      {/* Advanced: bind a pre-built mock (collapsed by default). */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <button
          type="button"
          onClick={() => setShowExistingMock((v) => !v)}
          aria-expanded={showExistingMock}
          className="flex w-full items-center gap-2 rounded-lg text-left text-sm font-semibold text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/40"
        >
          <ChevronDown className={cn('size-4 text-slate-400 transition-transform', showExistingMock && 'rotate-180')} aria-hidden />
          Advanced: bind a pre-built mock
          <span className="ml-auto text-xs font-normal text-slate-500">{showExistingMock ? 'Hide' : 'Show'}</span>
        </button>
        {showExistingMock && (
        <>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="space-y-1">
            <span className={labelCls}>Company</span>
            <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className={inputCls}>
              <option value="">Select company</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className={labelCls}>Title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. TCS NQT - Round 1"
              className={inputCls}
            />
          </label>
          <label className="space-y-1">
            <span className={labelCls}>Mock test (optional)</span>
            <select value={mockTestId} onChange={(e) => setMockTestId(e.target.value)} className={inputCls}>
              <option value="">- none -</option>
              {mocks.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className={labelCls}>Date &amp; time</span>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className={inputCls}
            />
          </label>
          <label className="space-y-1">
            <span className={labelCls}>Duration (min)</span>
            <input
              type="number"
              min={5}
              max={600}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              className={inputCls}
            />
          </label>
          <label className="flex items-center gap-2 pt-6">
            <input
              type="checkbox"
              checked={proctored}
              onChange={(e) => setProctored(e.target.checked)}
              className="size-4 accent-orange"
            />
            <span className="text-sm font-medium text-slate-600">Proctored</span>
          </label>
          {proctored ? (
            <div className="flex items-center gap-2 pt-6 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={proctorAutoSubmit}
                onChange={(e) => setProctorAutoSubmit(e.target.checked)}
                className="size-4 accent-orange"
              />
              <span className="font-medium">Auto-submit after</span>
              <input
                type="number"
                min={1}
                max={10}
                value={proctorMaxWarnings}
                disabled={!proctorAutoSubmit}
                onChange={(e) => setProctorMaxWarnings(Number(e.target.value) || 3)}
                className="w-14 rounded-lg border border-slate-200 px-2 py-1 disabled:opacity-50"
              />
              <span>warnings</span>
            </div>
          ) : null}
        </div>
        {err ? (
          <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{err}</p>
        ) : null}
        <Button type="button" variant="secondary" onClick={create} disabled={creating} className="mt-4">
          {creating ? <Loader2 className="animate-spin" aria-hidden /> : null} Schedule
        </Button>
        </>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Filter</span>
        <select value={fCompany} onChange={(e) => setFCompany(e.target.value)} className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-navy focus:border-orange focus:outline-none focus-visible:ring-2 focus-visible:ring-orange/30">
          <option value="">All companies</option>
          {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={fStatus} onChange={(e) => setFStatus(e.target.value as typeof fStatus)} className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-navy focus:border-orange focus:outline-none focus-visible:ring-2 focus-visible:ring-orange/30">
          <option value="all">Any status</option>
          <option value="upcoming">Upcoming</option>
          <option value="live">Live now</option>
          <option value="past">Past</option>
          <option value="inactive">Inactive</option>
        </select>
        <select value={fDuration} onChange={(e) => setFDuration(e.target.value as typeof fDuration)} className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-navy focus:border-orange focus:outline-none focus-visible:ring-2 focus-visible:ring-orange/30">
          <option value="all">Any duration</option>
          <option value="short">≤ 30 min</option>
          <option value="medium">31–90 min</option>
          <option value="long">&gt; 90 min</option>
        </select>
        {(fCompany || fStatus !== 'all' || fDuration !== 'all') ? (
          <button type="button" onClick={() => { setFCompany(''); setFStatus('all'); setFDuration('all'); }} className="rounded text-xs font-semibold text-navy underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/40">
            Clear
          </button>
        ) : null}
        {rows ? <span className="ml-auto text-xs font-medium text-slate-500">{filtered.length} of {rows.length}</span> : null}
      </div>

      {/* A failed REFRESH keeps the last list on screen; say it may be stale. */}
      {rows && loadErr ? (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200">
          {loadErr}
        </p>
      ) : null}

      {/* List */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="bg-slate-50/90">
            <tr className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              <th className="px-4 py-4">Assessment</th>
              <th className="px-4 py-4">Company</th>
              <th className="px-4 py-4">When</th>
              <th className="px-4 py-4">Duration</th>
              <th className="px-4 py-4">Proctored</th>
              <th className="px-4 py-4">Active</th>
              <th className="px-4 py-4" />
            </tr>
          </thead>
          <tbody>
            {rows === null ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  {loadErr ? (
                    <p role="alert" className="text-sm font-medium text-red-700">
                      {loadErr}
                    </p>
                  ) : (
                    <Loader2 className="mx-auto size-5 animate-spin text-slate-500" />
                  )}
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-600">
                  {rows.length === 0 ? 'No assessments scheduled yet.' : 'No assessments match these filters.'}
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id} className="border-t border-slate-100/80 hover:bg-slate-50/60">
                  <td className="px-4 py-3.5 font-semibold text-navy">{r.title}</td>
                  <td className="px-4 py-3.5 text-slate-600">{companyName[r.companyId] ?? r.companyName}</td>
                  <td className="px-4 py-3.5 text-slate-600">
                    {fmtWhen(r.scheduledAt)}
                    <CloseLine assessment={r} />
                  </td>
                  <td className="px-4 py-3.5 text-slate-600">{r.durationMinutes}m</td>
                  <td className="px-4 py-3.5">
                    {r.proctored ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-violet-700">
                        <Video className="size-3.5" /> Yes
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-500">No</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <button
                      type="button"
                      disabled={busyId === r.id}
                      onClick={() => toggleActive(r)}
                      className={cn(
                        'rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset disabled:opacity-50',
                        r.isActive
                          ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                          : 'bg-slate-100 text-slate-600 ring-slate-200',
                      )}
                    >
                      {r.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    {/* One trigger per row: six spelled-out links made the table mostly
                        chrome, and every action added widened the wall. */}
                    <div className="flex items-center justify-end">
                      <RowActionsMenu
                        label={`Actions for ${r.title}`}
                        items={[
                          {
                            key: 'edit',
                            label: 'Edit',
                            icon: Pencil,
                            onSelect: () => setEditWizardId(r.id),
                          },
                          {
                            key: 'extend',
                            label: 'Extend deadline',
                            icon: CalendarClock,
                            tone: 'warning',
                            hint: 'Works even after students have attempted it',
                            onSelect: () => setExtending(r),
                          },
                          {
                            key: 'duplicate',
                            label: 'Duplicate',
                            icon: CopyPlus,
                            hint: 'Same questions, new window',
                            onSelect: () => setDuplicating(r),
                          },
                          {
                            key: 'publish',
                            label: r.publishedAt ? 'Published' : 'Publish',
                            icon: Send,
                            tone: r.publishedAt ? 'default' : 'success',
                            hint: r.publishedAt
                              ? 'Send to anyone who was missed'
                              : 'Emails its audience — shows the count first',
                            onSelect: () => setPublishing(r),
                          },
                          {
                            key: 'results',
                            label: 'Results',
                            icon: BarChart3,
                            onSelect: () => openResults(r.id),
                          },
                          {
                            key: 'delete',
                            label: 'Delete',
                            icon: Trash2,
                            tone: 'danger',
                            separated: true,
                            disabled: busyId === r.id,
                            onSelect: () => remove(r.id),
                          },
                        ]}
                      />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* Results modal */}
      {resultsLoading || results ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close"
            onClick={() => setResults(null)}
            className="absolute inset-0 bg-slate-900/50"
          />
          <div className="relative flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
            {resultsLoading || !results ? (
              <div className="grid h-64 place-items-center">
                <Loader2 className="size-6 animate-spin text-slate-500" />
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
                  <div>
                    <h3 className="text-lg font-extrabold text-navy">{results.assessment.title}</h3>
                    <p className="text-xs text-slate-600">
                      {results.assessment.companyName} ·{' '}
                      {new Date(results.assessment.scheduledAt).toLocaleString([], {
                        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
                      })}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setResults(null)}
                    className="grid size-8 place-items-center rounded-full text-slate-500 hover:bg-slate-100"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                <ResultsReport
                  data={results}
                  onPublishResults={async () => {
                    const id = results.assessment.id;
                    try {
                      await releaseAssessmentResults(id);
                      toast.success('Results published — students can now see their report.');
                      await openResults(id); // refetch so the button reflects the released state
                    } catch (e) {
                      toast.error(describeAccessError(e, `You can't publish these results ${NOT_YOUR_COLLEGE}`, 'Could not publish results.'));
                    }
                  }}
                />
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

const fmtWhen = (iso: string) =>
  new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });

/**
 * The drive's close, under its start — the value that actually decides whether a student
 * can still start (never scheduledAt + durationMinutes, which is the per-attempt limit).
 * Reads "Closed" in amber once it has passed, so extending a drive visibly re-opens it.
 */
function CloseLine({ assessment }: { assessment: ApiScheduledAssessment }) {
  if (!assessment.endsAt) return <span className="mt-0.5 block text-xs text-slate-400">No closing time</span>;
  const closed = new Date(assessment.endsAt).getTime() < Date.now();
  return (
    <span className={cn('mt-0.5 block text-xs', closed ? 'font-semibold text-amber-700' : 'text-slate-400')}>
      {closed ? 'Closed' : 'Closes'} {fmtWhen(assessment.endsAt)}
    </span>

  );
}

/** 403 copy tail. The backend scopes a college-limited admin to their assigned colleges'
 *  drives (results / publish / update / delete); SUPER_ADMIN and unassigned admins see all. */
const NOT_YOUR_COLLEGE = "— this assessment belongs to a college that isn't assigned to you.";

const labelCls = 'text-xs font-semibold text-slate-600';
const inputCls =
  'flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy transition-colors focus:border-orange focus:outline-none focus-visible:ring-2 focus-visible:ring-orange/30';
