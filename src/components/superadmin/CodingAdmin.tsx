'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { BadgeCheck, Code2, ExternalLink, Loader2, Pencil, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { StatusPill } from '@/components/student/StatusPill';
import { DialogShell } from '@/components/superadmin/assessment-wizard/DialogShell';
import { checkboxCls } from '@/components/superadmin/assessment-wizard/ui';
import {
  CompanyChips,
  DIFF_TONE,
  SOURCE_LABEL,
  SOURCE_TONE,
  TypeChip,
} from '@/components/superadmin/bank-labels';
import { ApiRequestError, describeApiError } from '@/lib/api/types';
import { listAdminCompanies, type AdminCompanyRow } from '@/lib/api/admin';
import {
  MAX_CODING_PROBLEM_COMPANIES,
  listAdminCodingProblems,
  previewAdminCodingProblems,
  setCodingProblemActive,
  unknownCompaniesFrom,
  updateCodingProblemCompanies,
  type AdminCodingProblemSummary,
} from '@/lib/api/coding';
import {
  CODING_QUESTION_TYPE,
  CODING_SECTION_LABEL,
  QUESTION_TYPE_LABEL,
} from '@/shared/question-taxonomy';

/**
 * How a coding problem is filed, next to the question bank's Section / Topic / Type: the
 * section and type are fixed for the whole coding bank, the topic is the primary tag. An
 * API that predates the classification fields falls back to the same values.
 */
function classify(p: AdminCodingProblemSummary) {
  return {
    section: p.section || CODING_SECTION_LABEL,
    type: QUESTION_TYPE_LABEL[p.questionType ?? CODING_QUESTION_TYPE],
    topic: p.topic ?? p.tags?.[0] ?? null,
  };
}

/**
 * Superadmin coding-bank console. Lists every coding problem with its classification
 * (Section / Type / Topic), company tags (editable), provenance (source + year), Judge0
 * verification status, and its SOURCE CITATION (clickable link to where a PYQ came from).
 * The list is small (~hundreds) so filtering is client-side.
 */
export function CodingAdmin() {
  const [rows, setRows] = useState<AdminCodingProblemSummary[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  // Every catalog company, published or not - the companies PATCH accepts either.
  const [catalog, setCatalog] = useState<AdminCompanyRow[] | null>(null);
  const [catalogFailed, setCatalogFailed] = useState(false);
  const [search, setSearch] = useState('');
  const [company, setCompany] = useState('');
  const [source, setSource] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  // By id, so an in-place edit (companies) shows up in the open drawer too.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editOnOpen, setEditOnOpen] = useState(false);

  const load = () =>
    listAdminCodingProblems()
      .then(setRows)
      .catch((e) => setErr(e instanceof ApiRequestError ? e.message : 'Could not load coding problems.'));

  useEffect(() => {
    void load();
    listAdminCompanies()
      .then((cs) => setCatalog([...cs].sort((a, b) => a.name.localeCompare(b.name))))
      .catch(() => setCatalogFailed(true));
  }, []);

  const companyName = useMemo(
    () => Object.fromEntries((catalog ?? []).map((c) => [c.slug, c.name])),
    [catalog],
  );
  // The companies PATCH ships with the classification fields (one QB contract, one backend
  // release). Rows without them come from an API that predates it and would refuse the
  // PATCH on validation, so the editor stays hidden instead of dead-ending in an error.
  const canEditCompanies = useMemo(
    () => (rows ?? []).some((r) => r.section !== undefined || r.questionType !== undefined),
    [rows],
  );
  /** The problem's tags as the server has them right now — the editor's baseline, so the
   *  full-array PATCH can't drop a tag someone else added since this page loaded. (One
   *  problem, metadata only: the review endpoint, not another full-bank list.) */
  const fetchCurrentCompanies = useCallback(async (id: string) => {
    const { items } = await previewAdminCodingProblems([id]);
    return items[0]?.companies ?? null;
  }, []);
  const selected = useMemo(() => rows?.find((r) => r.id === selectedId) ?? null, [rows, selectedId]);

  const openProblem = (id: string, editCompanies = false) => {
    setEditOnOpen(editCompanies);
    setSelectedId(id);
  };

  /** Merge the PATCH response into the list (keeps fields the response may omit). */
  const applyUpdate = (updated: AdminCodingProblemSummary) =>
    setRows((rs) => rs?.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)) ?? rs);

  const companies = useMemo(() => {
    const s = new Set<string>();
    (rows ?? []).forEach((r) => (r.companies ?? []).forEach((c) => s.add(c)));
    return [...s].sort();
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (rows ?? []).filter(
      (r) =>
        (!q || r.title.toLowerCase().includes(q) || r.slug.toLowerCase().includes(q)) &&
        (!company || (r.companies ?? []).includes(company)) &&
        (!source || r.source === source),
    );
  }, [rows, search, company, source]);

  const stats = useMemo(() => {
    const s = rows ?? [];
    return {
      total: s.length,
      verified: s.filter((r) => r.verified).length,
      pyq: s.filter((r) => r.source === 'PREVIOUS_YEAR_QUESTIONS').length,
      active: s.filter((r) => r.isActive).length,
    };
  }, [rows]);

  const toggleActive = async (r: AdminCodingProblemSummary) => {
    setBusyId(r.id);
    try {
      await setCodingProblemActive(r.id, !r.isActive);
      await load();
    } catch (e) {
      window.alert(e instanceof ApiRequestError ? e.message : 'Could not update.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Total" value={stats.total} accent="text-navy" />
        <Metric label="Verified" value={stats.verified} accent="text-emerald-700" />
        <Metric label="PYQ" value={stats.pyq} accent="text-violet-700" />
        <Metric label="Active" value={stats.active} accent="text-sky-700" />
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search problem title / slug"
            className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-navy placeholder:text-slate-500 focus:border-[#ffc42d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffc42d]/30"
          />
        </div>
        <select
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-navy"
        >
          <option value="">All companies</option>
          {companies.map((c) => (
            <option key={c} value={c}>
              {companyName[c] ?? c}
            </option>
          ))}
        </select>
        <select
          value={source}
          onChange={(e) => setSource(e.target.value)}
          className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-navy"
        >
          <option value="">All sources</option>
          {Object.entries(SOURCE_LABEL).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </div>

      {err ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">{err}</div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1280px] text-left text-sm">
            <thead className="bg-slate-50/90">
              <tr className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                <th className="px-4 py-4">Problem</th>
                <th className="px-4 py-4">Section</th>
                <th className="px-4 py-4">Type</th>
                <th className="px-4 py-4">Topic</th>
                <th className="px-4 py-4">Difficulty</th>
                <th className="px-4 py-4">Company</th>
                <th className="px-4 py-4">Source</th>
                <th className="px-4 py-4">Citation</th>
                <th className="px-4 py-4">Verified</th>
                <th className="px-4 py-4 text-right">Active</th>
              </tr>
            </thead>
            <tbody>
              {rows === null ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center">
                    <Loader2 className="mx-auto size-5 animate-spin text-slate-500" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-sm text-slate-600">
                    No coding problems match this view.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100/80 align-top hover:bg-slate-50/60">
                    <td className="max-w-xs px-4 py-3.5">
                      <button
                        type="button"
                        onClick={() => openProblem(r.id)}
                        className="group/title block text-left"
                      >
                        <span className="block font-semibold text-navy group-hover/title:text-[#1a1a1a] group-hover/title:underline">
                          {r.title}
                        </span>
                        <span className="text-[11px] text-slate-500">{r.slug}</span>
                      </button>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-slate-600">{classify(r).section}</td>
                    <td className="px-4 py-3.5">
                      <TypeChip label={classify(r).type} />
                    </td>
                    <td className="max-w-[10rem] px-4 py-3.5 text-slate-600">
                      {classify(r).topic ?? <span className="text-slate-500">-</span>}
                    </td>
                    <td className="px-4 py-3.5">
                      <Pill tone={DIFF_TONE[r.difficulty]}>{cap(r.difficulty)}</Pill>
                    </td>
                    <td className="min-w-[15rem] px-4 py-3.5">
                      <div className="flex items-start gap-1.5">
                        <CompanyChips slugs={r.companies ?? []} nameBySlug={companyName} className="min-w-0" />
                        {canEditCompanies ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => openProblem(r.id, true)}
                            aria-label={`Edit companies for ${r.title}`}
                            title="Edit companies"
                            className="-my-1 h-7 shrink-0 px-2"
                          >
                            <Pencil aria-hidden />
                          </Button>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      {r.source ? (
                        <Pill tone={SOURCE_TONE[r.source] ?? SOURCE_TONE.PATTERN_BASED}>
                          {SOURCE_LABEL[r.source] ?? r.source}
                          {r.yearTags && r.yearTags.length ? ` · ${r.yearTags.join(', ')}` : ''}
                        </Pill>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>
                    <td className="max-w-[16rem] px-4 py-3.5">
                      {r.sourceRef ? (
                        /^https?:\/\//.test(r.sourceRef) ? (
                          <a
                            href={r.sourceRef}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 break-all text-[12px] font-medium text-sky-700 hover:underline"
                          >
                            {hostOf(r.sourceRef)} <ExternalLink className="size-3 shrink-0" />
                          </a>
                        ) : (
                          <span className="break-words text-[12px] text-slate-600">{r.sourceRef}</span>
                        )
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      {r.verified ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                          <BadgeCheck className="size-4" /> Verified
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-500">Unverified</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right">
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
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-100 px-4 py-3 text-sm text-slate-600">
          Showing {filtered.length} of {rows?.length ?? 0}
        </div>
      </div>

      <CodingDetailDrawer
        problem={selected}
        companyName={companyName}
        catalog={catalog}
        catalogFailed={catalogFailed}
        canEditCompanies={canEditCompanies}
        fetchCurrentCompanies={fetchCurrentCompanies}
        editOnOpen={editOnOpen}
        onSaved={applyUpdate}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}

type DrawerProps = {
  companyName: Record<string, string>;
  catalog: AdminCompanyRow[] | null;
  catalogFailed: boolean;
  /** False against an API that predates the companies PATCH — the tags are read-only then. */
  canEditCompanies: boolean;
  fetchCurrentCompanies: (id: string) => Promise<string[] | null>;
  /** Open with the companies editor already showing (the row's "Edit companies"). */
  editOnOpen: boolean;
  onSaved: (updated: AdminCodingProblemSummary) => void;
  onClose: () => void;
};

function CodingDetailDrawer({ problem, ...rest }: DrawerProps & { problem: AdminCodingProblemSummary | null }) {
  const titleId = useId();
  // The shared dialog shell traps Tab focus, closes on Esc / backdrop and returns focus to
  // the row that opened it.
  return (
    <DialogShell open={!!problem} onClose={rest.onClose} labelledBy={titleId} variant="drawer" maxWidth="max-w-2xl">
      {problem ? <CodingDetailBody key={problem.id} p={problem} titleId={titleId} {...rest} /> : null}
    </DialogShell>
  );
}

function CodingDetailBody({
  p,
  titleId,
  companyName,
  catalog,
  catalogFailed,
  canEditCompanies,
  fetchCurrentCompanies,
  editOnOpen,
  onSaved,
  onClose,
}: DrawerProps & { p: AdminCodingProblemSummary; titleId: string }) {
  const cases = p.testCases ?? [];
  const c = classify(p);
  const [editing, setEditing] = useState(editOnOpen && canEditCompanies);
  return (
    <>
      <div className="flex items-start justify-between gap-3 border-b border-slate-200 bg-white px-6 py-4">
        <div className="min-w-0">
          <h2 id={titleId} className="truncate text-lg font-extrabold text-navy">
            {p.title}
          </h2>
          <p className="text-[11px] text-slate-500">{p.slug}</p>
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close">
          <X aria-hidden />
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-5 px-6 py-5">
          {/* badges */}
          <div className="flex flex-wrap items-center gap-1.5">
            <Pill tone={DIFF_TONE[p.difficulty]}>{cap(p.difficulty)}</Pill>
            {p.source ? (
              <Pill tone={SOURCE_TONE[p.source] ?? SOURCE_TONE.PATTERN_BASED}>
                {SOURCE_LABEL[p.source] ?? p.source}
                {p.yearTags && p.yearTags.length ? ` · ${p.yearTags.join(', ')}` : ''}
              </Pill>
            ) : null}
            {p.verified ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                <BadgeCheck className="size-3.5" /> Judge0-verified
              </span>
            ) : (
              <Pill tone="bg-slate-50 text-slate-600 ring-slate-200">Unverified</Pill>
            )}
            <Pill tone={p.isActive ? 'bg-sky-50 text-sky-700 ring-sky-200' : 'bg-slate-100 text-slate-600 ring-slate-200'}>
              {p.isActive ? 'Active' : 'Inactive'}
            </Pill>
            {p.xpReward ? <Pill tone="bg-amber-50 text-amber-700 ring-amber-200">{p.xpReward} XP</Pill> : null}
          </div>

          {/* classification: section › topic, type, companies (editable) */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto]">
              <div className="min-w-0">
                <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Section › Topic</dt>
                <dd className="mt-1 text-sm font-semibold text-navy">
                  {c.topic ? `${c.section} › ${c.topic}` : c.section}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Type</dt>
                <dd className="mt-1">
                  <TypeChip label={c.type} />
                </dd>
              </div>
            </dl>
            <div className="mt-4 border-t border-slate-100 pt-4">
              <div className="flex min-h-8 items-center justify-between gap-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Companies</p>
                {!editing && canEditCompanies ? (
                  <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
                    <Pencil aria-hidden /> Edit companies
                  </Button>
                ) : null}
              </div>
              <div className="mt-2">
                {editing ? (
                  <CompaniesEditor
                    problem={p}
                    catalog={catalog}
                    catalogFailed={catalogFailed}
                    fetchCurrentCompanies={fetchCurrentCompanies}
                    onCancel={() => setEditing(false)}
                    onSaved={(updated) => {
                      onSaved(updated);
                      setEditing(false);
                    }}
                  />
                ) : (p.companies ?? []).length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {(p.companies ?? []).map((slug) => (
                      <Pill key={slug} tone="bg-slate-50 text-slate-600 ring-slate-200">
                        {companyName[slug] ?? slug}
                      </Pill>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">Untagged - not linked to any company hub.</p>
                )}
                {!canEditCompanies ? (
                  <p className="mt-2 text-xs text-slate-500">
                    Read-only here until the API ships company editing; tags can still be set by ingest.
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          {/* source citation - the whole point */}
          {p.sourceRef ? (
            <Field label="Source citation">
              {/^https?:\/\//.test(p.sourceRef) ? (
                <a
                  href={p.sourceRef}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 break-all text-[13px] font-medium text-sky-700 hover:underline"
                >
                  {p.sourceRef} <ExternalLink className="size-3.5 shrink-0" />
                </a>
              ) : (
                <span className="break-words text-[13px] text-slate-600">{p.sourceRef}</span>
              )}
            </Field>
          ) : null}

          {(p.roleTags ?? []).length ? (
            <Field label="Target roles">
              <div className="flex flex-wrap gap-1.5">
                {(p.roleTags ?? []).map((r) => (
                  <Pill key={r} tone="bg-violet-50 text-violet-700 ring-violet-200">
                    {r}
                  </Pill>
                ))}
              </div>
            </Field>
          ) : null}

          {p.statement ? (
            <Field label="Problem statement">
              <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-slate-700">{p.statement}</p>
            </Field>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            {p.inputFormat ? (
              <Field label="Input format">
                <p className="whitespace-pre-wrap text-[13px] text-slate-600">{p.inputFormat}</p>
              </Field>
            ) : null}
            {p.outputFormat ? (
              <Field label="Output format">
                <p className="whitespace-pre-wrap text-[13px] text-slate-600">{p.outputFormat}</p>
              </Field>
            ) : null}
          </div>

          {p.constraints ? (
            <Field label="Constraints">
              <p className="whitespace-pre-wrap text-[13px] text-slate-600">{p.constraints}</p>
            </Field>
          ) : null}

          {/* test cases */}
          {cases.length ? (
            <Field label={`Test cases (${cases.length})`}>
              <div className="space-y-2">
                {cases.map((t, i) => (
                  <div key={i} className="rounded-xl border border-slate-200 bg-slate-50/60 p-2.5">
                    <div className="mb-1.5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      Case {i + 1}
                      {t.isSample ? (
                        <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-emerald-700">Sample</span>
                      ) : (
                        <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-slate-600">Hidden</span>
                      )}
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <IoBox label="Input" text={t.input} />
                      <IoBox label="Expected" text={t.expectedOutput} />
                    </div>
                  </div>
                ))}
              </div>
            </Field>
          ) : null}

          {/* reference solution */}
          {p.referenceSolution?.source ? (
            <Field label={`Reference solution (${p.referenceSolution.language})`}>
              <pre className="max-h-80 overflow-auto rounded-xl bg-navy p-3 text-[12px] leading-relaxed text-slate-100">
                <code>{p.referenceSolution.source}</code>
              </pre>
            </Field>
          ) : (
            <p className="inline-flex items-center gap-1.5 text-[12px] text-slate-500">
              <Code2 className="size-3.5" /> No reference solution stored yet.
            </p>
          )}
        </div>
      </div>
    </>
  );
}

/** Same set of slugs, order ignored. */
function sameSlugs(a: string[], b: string[]): boolean {
  return a.length === b.length && [...a].sort().join(',') === [...b].sort().join(',');
}

/**
 * Multi-select of catalog companies for one coding problem → PATCH { companies }.
 *
 * Two things the bank's data shape forces:
 *  - the baseline is re-read from the server when the editor opens, so the full-array
 *    replace can't silently drop a tag another admin added since the page loaded;
 *  - tags the catalog doesn't know ("asked at Adobe") are provenance the ingest left on
 *    purpose, not errors: they stay ticked, are listed as off-catalog, and ride through an
 *    unrelated edit untouched (the server only validates slugs being ADDED). Only slugs an
 *    UNKNOWN_COMPANY refusal actually names are flagged as a problem.
 */
function CompaniesEditor({
  problem,
  catalog,
  catalogFailed,
  fetchCurrentCompanies,
  onSaved,
  onCancel,
}: {
  problem: AdminCodingProblemSummary;
  catalog: AdminCompanyRow[] | null;
  catalogFailed: boolean;
  fetchCurrentCompanies: (id: string) => Promise<string[] | null>;
  onSaved: (updated: AdminCodingProblemSummary) => void;
  onCancel: () => void;
}) {
  const uid = useId();
  // The row as the list had it - the fallback if the re-read fails.
  const listed = useRef(problem.companies ?? []);
  // The problem's tags on the server when the editor opened (null until the re-read lands):
  // the baseline for "changed?", for the off-catalog rows, and for what a save preserves.
  const [initial, setInitial] = useState<string[] | null>(null);
  const [draft, setDraft] = useState<string[]>([]);
  const [changedElsewhere, setChangedElsewhere] = useState(false);
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unknown, setUnknown] = useState<string[]>([]);

  useEffect(() => {
    let alive = true;
    fetchCurrentCompanies(problem.id)
      .then((fresh) => {
        if (!alive) return;
        const current = fresh ?? listed.current;
        setInitial(current);
        setDraft(current);
        setChangedElsewhere(!!fresh && !sameSlugs(current, listed.current));
      })
      .catch(() => {
        // The list already gave us a usable baseline; a failed re-read isn't worth blocking on.
        if (!alive) return;
        setInitial(listed.current);
        setDraft(listed.current);
      });
    return () => {
      alive = false;
    };
  }, [problem.id, fetchCurrentCompanies]);

  const options = useMemo(() => {
    const known = new Set((catalog ?? []).map((co) => co.slug));
    return [
      ...(initial ?? [])
        .filter((slug) => !known.has(slug))
        .map((slug) => ({ slug, name: slug, isPublished: true, inCatalog: false })),
      ...(catalog ?? []).map((co) => ({ slug: co.slug, name: co.name, isPublished: co.isPublished, inCatalog: true })),
    ];
  }, [catalog, initial]);

  const q = query.trim().toLowerCase();
  const visible = q ? options.filter((o) => o.name.toLowerCase().includes(q) || o.slug.includes(q)) : options;
  const picked = new Set(draft);
  const unknownSet = new Set(unknown);
  const offCatalog = options.filter((o) => !o.inCatalog).length;
  const over = draft.length > MAX_CODING_PROBLEM_COMPANIES;
  const dirty = initial !== null && !sameSlugs(draft, initial);
  const errorId = `${uid}-error`;

  const toggle = (slug: string) =>
    setDraft((d) => (d.includes(slug) ? d.filter((s) => s !== slug) : [...d, slug]));

  const save = async () => {
    setSaving(true);
    setError(null);
    setUnknown([]);
    try {
      onSaved(await updateCodingProblemCompanies(problem.id, draft));
    } catch (e) {
      const names = unknownCompaniesFrom(e);
      if (names) {
        setUnknown(names);
        setError(
          names.length
            ? `Not in the company catalog: ${names.join(', ')}. Untick ${names.length === 1 ? 'it' : 'them'} and save again.`
            : 'One or more companies are not in the company catalog.',
        );
      } else {
        setError(describeApiError(e, 'Could not update the companies.'));
      }
    } finally {
      setSaving(false);
    }
  };

  if (catalogFailed) {
    return (
      <p role="alert" className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200">
        Could not load the company catalog. Reload the page and try again.
      </p>
    );
  }
  if (!catalog || initial === null) {
    return <Loader2 className="size-4 animate-spin text-slate-400" aria-label="Loading companies" />;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" aria-hidden />
          <input
            id={`${uid}-search`}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search companies"
            aria-label="Search companies"
            className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-navy placeholder:text-slate-500 focus:border-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/30"
          />
        </div>
        <span className={cn('text-xs font-semibold', over ? 'text-red-700' : 'text-slate-500')} aria-live="polite">
          {draft.length} selected{over ? ` · at most ${MAX_CODING_PROBLEM_COMPANIES}` : ''}
        </span>
      </div>

      <fieldset aria-describedby={error ? errorId : undefined}>
        <legend className="sr-only">Companies for {problem.title}</legend>
        {visible.length ? (
          <ul className="max-h-60 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200">
            {visible.map((o) => {
              // Rejected = the server named it; off-catalog = an existing provenance tag.
              const rejected = unknownSet.has(o.slug);
              const note = rejected
                ? 'not in catalog'
                : !o.inCatalog
                  ? 'off catalog'
                  : !o.isPublished
                    ? 'unpublished'
                    : null;
              return (
                <li key={o.slug}>
                  <label
                    className={cn(
                      'flex cursor-pointer items-center gap-3 px-3 py-2 text-sm transition-colors',
                      rejected ? 'bg-red-50/60 hover:bg-red-50' : 'hover:bg-slate-50',
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={picked.has(o.slug)}
                      onChange={() => toggle(o.slug)}
                      aria-label={note ? `${o.name} (${note})` : o.name}
                      className={checkboxCls}
                    />
                    <span className="min-w-0 flex-1 truncate font-medium text-navy">{o.name}</span>
                    <span className="hidden text-[11px] text-slate-500 sm:inline">{o.slug}</span>
                    {rejected ? (
                      <StatusPill tone="negative" label="Not in catalog" />
                    ) : !o.inCatalog ? (
                      <StatusPill tone="neutral" label="Off catalog" />
                    ) : !o.isPublished ? (
                      <StatusPill tone="neutral" label="Unpublished" />
                    ) : null}
                  </label>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="rounded-lg border border-slate-200 px-3 py-4 text-sm text-slate-500">No company matches “{query}”.</p>
        )}
      </fieldset>

      {changedElsewhere ? (
        <p className="rounded-md bg-amber-50 p-3 text-sm font-medium text-amber-800 ring-1 ring-amber-200">
          These tags changed since the page loaded. Showing what the server has now.
        </p>
      ) : null}

      {offCatalog ? (
        <p className="text-xs leading-relaxed text-slate-500">
          {offCatalog === 1 ? '1 tag is' : `${offCatalog} tags are`} outside the company catalog — provenance
          kept from the import. Saving leaves {offCatalog === 1 ? 'it' : 'them'} in place; unticking removes
          {offCatalog === 1 ? ' it' : ' them'} for good.
        </p>
      ) : null}

      {error ? (
        <p id={errorId} role="alert" className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-end gap-2">
        {draft.length ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => setDraft([])} disabled={saving} className="mr-auto">
            Clear all
          </Button>
        ) : null}
        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="button" size="sm" onClick={() => void save()} disabled={saving || over || !dirty}>
          {saving ? <Loader2 className="animate-spin" aria-hidden /> : null}
          Save companies
        </Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
      {children}
    </div>
  );
}

function IoBox({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <p className="mb-1 text-[9px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
      <pre className="max-h-32 overflow-auto whitespace-pre-wrap break-words rounded-md border border-slate-200 bg-white px-2 py-1.5 font-mono text-[12px] text-slate-700">
        {text || '(empty)'}
      </pre>
    </div>
  );
}

function cap(s: string) {
  return s.charAt(0) + s.slice(1).toLowerCase();
}
function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url.slice(0, 40);
  }
}
function Pill({ tone, children }: { tone?: string; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        'whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset',
        tone ?? 'bg-slate-50 text-slate-600 ring-slate-200',
      )}
    >
      {children}
    </span>
  );
}
function Metric({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-black tracking-tight ${accent}`}>{value.toLocaleString()}</p>
    </div>
  );
}
