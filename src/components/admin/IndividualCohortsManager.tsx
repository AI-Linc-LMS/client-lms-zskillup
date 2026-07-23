'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Pencil, Plus, Trash2, Upload, UserPlus, Users, X } from 'lucide-react';
import {
  addCohortUsers,
  createIndividualCohort,
  deleteIndividualCohort,
  listCohortMembers,
  listIndividualCohorts,
  removeCohortMember,
  updateIndividualCohort,
  type AddCohortUsersResult,
  type IndividualCohort,
  type IndividualCohortMember,
} from '@/lib/api/individual-cohorts';
import { describeError } from '@/lib/api/errors';
import { cn } from '@/lib/utils';

const inputCls =
  'h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy focus:border-orange focus:outline-none focus-visible:ring-2 focus-visible:ring-orange/30';

/** Pull {email, fullName?} entries out of pasted text or a CSV (Name,Email in any order). */
function parseEntries(text: string): Array<{ email: string; fullName?: string }> {
  const out: Array<{ email: string; fullName?: string }> = [];
  const seen = new Set<string>();
  for (const raw of text.split(/[\r\n]+/)) {
    const line = raw.trim();
    if (!line || /^(name|email)\b/i.test(line)) continue; // skip header rows
    const parts = line.split(/[,;\t]/).map((p) => p.trim()).filter(Boolean);
    const email = parts.find((p) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p));
    if (!email) continue;
    const key = email.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const fullName = parts.find((p) => p !== email && !/@/.test(p));
    out.push({ email, ...(fullName ? { fullName } : {}) });
  }
  return out;
}

export function IndividualCohortsManager() {
  const [cohorts, setCohorts] = useState<IndividualCohort[] | null>(null);
  const [selId, setSelId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const load = useCallback(() => {
    listIndividualCohorts()
      .then((c) => setCohorts(c))
      .catch((e) => toast.error(describeError(e, 'Could not load cohorts')));
  }, []);
  useEffect(() => load(), [load]);

  const sel = useMemo(() => cohorts?.find((c) => c.id === selId) ?? null, [cohorts, selId]);

  const create = async () => {
    if (name.trim().length < 2) return;
    setCreating(true);
    try {
      const c = await createIndividualCohort({ name: name.trim(), description: desc.trim() || undefined });
      setName('');
      setDesc('');
      setCohorts((p) => [c, ...(p ?? [])]);
      setSelId(c.id);
      toast.success('Cohort created');
    } catch (e) {
      toast.error(describeError(e, 'Could not create cohort'));
    } finally {
      setCreating(false);
    }
  };

  const saveEdit = async (id: string) => {
    if (editName.trim().length < 2) return;
    try {
      const c = await updateIndividualCohort(id, { name: editName.trim() });
      setCohorts((p) => (p ?? []).map((x) => (x.id === id ? c : x)));
      setEditId(null);
      toast.success('Renamed');
    } catch (e) {
      toast.error(describeError(e, 'Could not rename'));
    }
  };

  const remove = async (c: IndividualCohort) => {
    if (!window.confirm(`Delete "${c.name}"? Its ${c.studentCount} member(s) will be detached.`)) return;
    try {
      await deleteIndividualCohort(c.id);
      setCohorts((p) => (p ?? []).filter((x) => x.id !== c.id));
      if (selId === c.id) setSelId(null);
      toast.success('Deleted');
    } catch (e) {
      toast.error(describeError(e, 'Could not delete'));
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[22rem_1fr]">
      {/* ── Cohort list + create ─────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="mb-2 text-sm font-bold text-navy">New individual cohort</p>
          <div className="space-y-2">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Cohort name" className={inputCls} />
            <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Description (optional)" className={inputCls} />
            <button
              type="button"
              onClick={create}
              disabled={creating || name.trim().length < 2}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-[#ffd24d] to-[#f5b400] py-2 text-sm font-extrabold text-[#171717] disabled:opacity-50"
            >
              {creating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Create cohort
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-2">
          {cohorts === null ? (
            <div className="grid h-24 place-items-center"><Loader2 className="size-5 animate-spin text-slate-400" /></div>
          ) : cohorts.length === 0 ? (
            <p className="p-4 text-center text-sm text-slate-500">No individual cohorts yet.</p>
          ) : (
            <ul className="space-y-1">
              {cohorts.map((c) => (
                <li key={c.id}>
                  {editId === c.id ? (
                    <div className="flex items-center gap-1.5 p-1.5">
                      <input value={editName} onChange={(e) => setEditName(e.target.value)} className={cn(inputCls, 'h-9')} autoFocus onKeyDown={(e) => e.key === 'Enter' && saveEdit(c.id)} />
                      <button type="button" onClick={() => saveEdit(c.id)} className="rounded-lg bg-navy px-2.5 py-1.5 text-xs font-bold text-white">Save</button>
                      <button type="button" onClick={() => setEditId(null)} className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"><X className="size-4" /></button>
                    </div>
                  ) : (
                    <div className={cn('group flex items-center gap-2 rounded-xl px-3 py-2.5 transition-colors', selId === c.id ? 'bg-sky-50' : 'hover:bg-slate-50')}>
                      <button type="button" onClick={() => setSelId(c.id)} className="min-w-0 flex-1 text-left">
                        <span className="block truncate text-sm font-semibold text-navy">{c.name}</span>
                        <span className="text-[11px] text-slate-500">{c.studentCount} member{c.studentCount === 1 ? '' : 's'}{c.description ? ` · ${c.description}` : ''}</span>
                      </button>
                      <button type="button" onClick={() => { setEditId(c.id); setEditName(c.name); }} className="grid size-7 shrink-0 place-items-center rounded-lg text-slate-400 opacity-0 hover:bg-slate-100 hover:text-navy group-hover:opacity-100"><Pencil className="size-3.5" /></button>
                      <button type="button" onClick={() => remove(c)} className="grid size-7 shrink-0 place-items-center rounded-lg text-slate-400 opacity-0 hover:bg-rose-50 hover:text-rose-500 group-hover:opacity-100"><Trash2 className="size-3.5" /></button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ── Members of the selected cohort ───────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        {!sel ? (
          <div className="grid h-64 place-items-center text-center">
            <div>
              <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#fff5ea] text-[#f5b400]"><Users className="size-6" /></span>
              <p className="mt-3 text-sm font-semibold text-navy">Select a cohort</p>
              <p className="text-xs text-slate-500">Pick a cohort on the left to manage its members.</p>
            </div>
          </div>
        ) : (
          <MembersPanel cohort={sel} onCountChange={(n) => setCohorts((p) => (p ?? []).map((c) => (c.id === sel.id ? { ...c, studentCount: n } : c)))} />
        )}
      </div>
    </div>
  );
}

function MembersPanel({ cohort, onCountChange }: { cohort: IndividualCohort; onCountChange: (n: number) => void }) {
  const [members, setMembers] = useState<IndividualCohortMember[] | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AddCohortUsersResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    setMembers(null);
    listCohortMembers(cohort.id)
      .then((m) => { setMembers(m); onCountChange(m.length); })
      .catch((e) => toast.error(describeError(e, 'Could not load members')));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cohort.id]);
  useEffect(() => load(), [load]);

  const entries = useMemo(() => parseEntries(text), [text]);

  const add = async () => {
    if (entries.length === 0) {
      toast.error('Add at least one valid email (paste emails or upload a CSV of Name, Email).');
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const res = await addCohortUsers(cohort.id, entries);
      setResult(res);
      setText('');
      toast.success(`${res.added} added · ${res.invited} invited${res.skipped ? ` · ${res.skipped} skipped` : ''}`);
      load();
    } catch (e) {
      toast.error(describeError(e, 'Could not add users'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (m: IndividualCohortMember) => {
    try {
      await removeCohortMember(cohort.id, m.id);
      setMembers((p) => (p ?? []).filter((x) => x.id !== m.id));
      onCountChange((members?.length ?? 1) - 1);
    } catch (e) {
      toast.error(describeError(e, 'Could not remove'));
    }
  };

  const onFile = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setText((t) => `${t ? t + '\n' : ''}${String(reader.result ?? '')}`);
    reader.readAsText(file);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-black text-navy">{cohort.name}</h2>
          <p className="text-xs text-slate-500">{members?.length ?? cohort.studentCount} member{(members?.length ?? cohort.studentCount) === 1 ? '' : 's'} · non-college</p>
        </div>
      </div>

      {/* Add users */}
      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/50 p-3">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-navy"><UserPlus className="size-4 text-[#f5b400]" /> Add users by email</p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder="Paste emails (comma or newline separated), or CSV rows: Name, Email"
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-navy focus:border-orange focus:outline-none focus-visible:ring-2 focus-visible:ring-orange/30"
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button type="button" onClick={add} disabled={busy || entries.length === 0} className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#ffd24d] to-[#f5b400] px-4 py-2 text-sm font-extrabold text-[#171717] disabled:opacity-50">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />} Add {entries.length ? `(${entries.length})` : ''}
          </button>
          <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-navy hover:bg-slate-50">
            <Upload className="size-3.5" /> Upload CSV
          </button>
          <input ref={fileRef} type="file" accept=".csv,text/csv,text/plain" className="hidden" onChange={(e) => { onFile(e.target.files?.[0] ?? null); e.target.value = ''; }} />
          <span className="text-[11px] text-slate-500">Existing non-college users are added; unknown emails are invited.</span>
        </div>
        {result ? (
          <div className="mt-2 max-h-28 overflow-y-auto rounded-lg border border-slate-100 bg-white p-2 text-[11px]">
            {result.rows.map((r, i) => (
              <div key={i} className="flex items-center justify-between gap-2 py-0.5">
                <span className="truncate text-slate-600">{r.email}</span>
                <span className={cn('shrink-0 font-semibold', r.status === 'added' || r.status === 'invited' ? 'text-emerald-600' : r.status === 'invalid' ? 'text-rose-600' : 'text-amber-600')}>
                  {r.status}{r.reason ? ` · ${r.reason}` : ''}
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {/* Members list */}
      <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
        {members === null ? (
          <div className="grid h-24 place-items-center"><Loader2 className="size-5 animate-spin text-slate-400" /></div>
        ) : members.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">No members yet. Add users above.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {members.map((m) => (
              <li key={m.id} className="flex items-center gap-3 py-2.5">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-600">
                  {(m.fullName ?? m.email).slice(0, 2).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-navy">{m.fullName ?? m.email}</span>
                  <span className="text-[11px] text-slate-500">{m.email} · {m.status.toLowerCase()}</span>
                </span>
                <button type="button" onClick={() => remove(m)} className="grid size-8 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-500"><Trash2 className="size-4" /></button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
