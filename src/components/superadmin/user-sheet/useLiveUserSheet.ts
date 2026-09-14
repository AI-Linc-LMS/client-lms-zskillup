'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getUserSheet, type UserSheetResult, type UserSheetRow } from '@/lib/api/admin';
import { describeAccessError, describeError } from '@/lib/api/errors';
import { ApiRequestError } from '@/lib/api/types';
import { applyDelta, applyFull, type ApplyOutcome } from './sheet-model';

/** Background refresh cadence while the tab is visible. */
export const POLL_INTERVAL_MS = 20_000;
/** Ceiling for the doubled interval after a 429 or a failed refresh. */
export const MAX_POLL_INTERVAL_MS = 120_000;
/** Focusing the tab refreshes at once, but not more often than this. */
const FOCUS_REFRESH_MIN_GAP_MS = 5_000;
/** How long a changed row stays highlighted. */
export const HIGHLIGHT_MS = 4_000;

/**
 * connecting - first snapshot loading; live - refreshing in the background;
 * paused - tab hidden, nothing is polled; retrying - the last refresh failed (or was rate
 * limited) and the next one is backed off; stopped - background refresh gave up (403 /
 * rejected cursor) until a manual Sync now succeeds.
 */
export type LiveState = 'connecting' | 'live' | 'paused' | 'retrying' | 'stopped';

function isRateLimited(err: unknown): boolean {
  return err instanceof ApiRequestError && (err.status === 429 || err.code === 'RATE_LIMITED');
}

function summarise(o: ApplyOutcome): string {
  const parts: string[] = [];
  if (o.added.length) parts.push(`${o.added.length} new`);
  if (o.changed.length) parts.push(`${o.changed.length} updated`);
  if (o.removed.length) parts.push(`${o.removed.length} removed`);
  return parts.length ? `User sheet: ${parts.join(', ')}.` : '';
}

/**
 * The live Super Admin user sheet (GET /admin/user-sheet).
 *
 * Reads:
 *   - a FULL snapshot only on first load, on Sync now, and for an export
 *     (purpose=export - audited server-side). A snapshot is a couple of MB;
 *   - every background refresh is a DELTA: `since=<cursor>` every 20 s, only while the
 *     tab is visible, plus once on focus / returning to the tab (at most every 5 s).
 *     Rows are upserted by id and removedIds dropped (see sheet-model); a row is
 *     highlighted only when its data actually changed, not each time the server's
 *     look-back window re-sends it.
 *
 * Failure handling never loops: a 429 or failed refresh doubles the interval (up to
 * 2 min) and shows a quiet notice; a 403 or a rejected cursor (400) stops background
 * refresh until Sync now reloads the sheet. Before the first snapshot arrives an error
 * is blocking (loadError) with a retry.
 *
 * Every read that finishes carries a generation: a full read bumps it, so a delta that
 * was in flight when Sync now / Export started can never be applied on top of the newer
 * snapshot. Only one delta is in flight at a time.
 */
export function useLiveUserSheet() {
  const [rows, setRows] = useState<readonly UserSheetRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [syncedAt, setSyncedAt] = useState<string | null>(null);
  const [liveState, setLiveState] = useState<LiveState>('connecting');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [highlighted, setHighlighted] = useState<ReadonlySet<string>>(() => new Set());
  const [announcement, setAnnouncement] = useState('');

  const mounted = useRef(false);
  const rowsRef = useRef<readonly UserSheetRow[]>([]);
  const loadedRef = useRef(false);
  const cursor = useRef<string | null>(null);
  const generation = useRef(0);
  const fullAbort = useRef<AbortController | null>(null);
  const deltaAbort = useRef<AbortController | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const interval = useRef(POLL_INTERVAL_MS);
  const lastReadAt = useRef(0);
  const stopped = useRef(false);
  const highlightUntil = useRef(new Map<string, number>());
  const highlightTimers = useRef(new Set<ReturnType<typeof setTimeout>>());
  /** Set by the lifecycle effect: (re)arm the next background refresh. */
  const scheduleRef = useRef<(delayMs: number) => void>(() => {});

  const flash = useCallback((ids: readonly string[]) => {
    if (ids.length === 0) return;
    const until = Date.now() + HIGHLIGHT_MS;
    for (const id of ids) highlightUntil.current.set(id, until);
    setHighlighted(new Set(highlightUntil.current.keys()));
    const t = setTimeout(() => {
      highlightTimers.current.delete(t);
      const now = Date.now();
      for (const [id, exp] of highlightUntil.current) if (exp <= now) highlightUntil.current.delete(id);
      if (mounted.current) setHighlighted(new Set(highlightUntil.current.keys()));
    }, HIGHLIGHT_MS + 50);
    highlightTimers.current.add(t);
  }, []);

  const commit = useCallback(
    (outcome: ApplyOutcome, res: UserSheetResult, highlight: boolean) => {
      rowsRef.current = outcome.rows;
      cursor.current = res.cursor;
      setRows(outcome.rows);
      setSyncedAt(res.serverTime);
      if (highlight) {
        flash([...outcome.added, ...outcome.changed]);
        const text = summarise(outcome);
        if (text) setAnnouncement(text);
      }
    },
    [flash],
  );

  /** A full snapshot (first load, Sync now, export). Throws on failure. */
  const readFull = useCallback(
    async (purpose?: 'export'): Promise<UserSheetResult | null> => {
      const gen = ++generation.current;
      deltaAbort.current?.abort();
      fullAbort.current?.abort();
      const controller = new AbortController();
      fullAbort.current = controller;
      setSyncing(true);
      lastReadAt.current = Date.now();
      try {
        const res = await getUserSheet(purpose ? { purpose } : {}, { signal: controller.signal });
        if (!mounted.current || gen !== generation.current) return res;
        const first = !loadedRef.current;
        commit(applyFull(first ? null : rowsRef.current, res.rows), res, !first);
        loadedRef.current = true;
        setLoaded(true);
        setLoadError(null);
        setNotice(null);
        stopped.current = false;
        interval.current = POLL_INTERVAL_MS;
        setLiveState(document.visibilityState === 'visible' ? 'live' : 'paused');
        scheduleRef.current(POLL_INTERVAL_MS);
        return res;
      } catch (err) {
        if (mounted.current && gen === generation.current && !controller.signal.aborted) {
          const message = isRateLimited(err)
            ? 'Too many requests right now. Wait a minute, then try again.'
            : describeAccessError(
                err,
                'Only Super Admins can open the user sheet.',
                'The user sheet could not be loaded.',
              );
          if (!loadedRef.current) {
            setLoadError(message);
            setLiveState('stopped');
          } else if (!purpose) {
            setNotice(`Sync failed: ${message}`);
          }
        }
        throw err;
      } finally {
        if (fullAbort.current === controller) fullAbort.current = null;
        if (mounted.current && gen === generation.current) setSyncing(false);
      }
    },
    [commit],
  );

  /** One background delta. Never throws; updates liveState / notice / interval. */
  const readDelta = useCallback(async () => {
    if (!cursor.current || stopped.current || deltaAbort.current || fullAbort.current) return;
    const gen = generation.current;
    const controller = new AbortController();
    deltaAbort.current = controller;
    lastReadAt.current = Date.now();
    try {
      const res = await getUserSheet({ since: cursor.current }, { signal: controller.signal });
      if (!mounted.current || gen !== generation.current || controller.signal.aborted) return;
      const outcome =
        res.mode === 'full' ? applyFull(rowsRef.current, res.rows) : applyDelta(rowsRef.current, res);
      commit(outcome, res, true);
      interval.current = POLL_INTERVAL_MS;
      setNotice(null);
      setLiveState('live');
    } catch (err) {
      if (!mounted.current || gen !== generation.current || controller.signal.aborted) return;
      if (err instanceof ApiRequestError && (err.status === 403 || err.status === 400)) {
        stopped.current = true;
        setLiveState('stopped');
        setNotice(
          err.status === 403
            ? 'Live updates stopped: this account can no longer open the user sheet.'
            : 'Live updates stopped because the server rejected the sync position. Use Sync now to reload the sheet.',
        );
        return;
      }
      interval.current = Math.min(interval.current * 2, MAX_POLL_INTERVAL_MS);
      const next = Math.round(interval.current / 1000);
      setLiveState('retrying');
      setNotice(
        isRateLimited(err)
          ? `Live updates slowed down after too many requests. Next refresh in ${next} s.`
          : `Live update failed (${describeError(err, 'network error')}). Retrying in ${next} s.`,
      );
    } finally {
      if (deltaAbort.current === controller) deltaAbort.current = null;
    }
  }, [commit]);

  // Lifecycle: first snapshot, the visible-only refresh loop, focus refresh, teardown.
  useEffect(() => {
    mounted.current = true;
    const visible = () => document.visibilityState === 'visible';
    const clearTimer = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
    };

    const tick = async () => {
      timer.current = null;
      if (!mounted.current) return;
      if (!visible()) {
        if (!stopped.current) setLiveState('paused');
        return; // resumes from the visibility listener
      }
      await readDelta();
      schedule(interval.current);
    };

    function schedule(delayMs: number) {
      clearTimer();
      if (!mounted.current || stopped.current || !loadedRef.current) return;
      timer.current = setTimeout(() => void tick(), Math.max(0, delayMs));
    }
    scheduleRef.current = schedule;

    const onWake = () => {
      if (!mounted.current || !loadedRef.current || stopped.current) return;
      if (!visible()) {
        clearTimer();
        setLiveState('paused');
        return;
      }
      const elapsed = Date.now() - lastReadAt.current;
      if (interval.current > POLL_INTERVAL_MS) {
        // Backing off (429 / failures): focus must not bypass the wait.
        setLiveState('retrying');
        schedule(interval.current - elapsed);
      } else if (elapsed >= FOCUS_REFRESH_MIN_GAP_MS) {
        clearTimer();
        setLiveState('live');
        void tick();
      } else {
        setLiveState('live');
        schedule(POLL_INTERVAL_MS - elapsed);
      }
    };

    document.addEventListener('visibilitychange', onWake);
    window.addEventListener('focus', onWake);
    void readFull().catch(() => {});

    const timers = highlightTimers.current;
    return () => {
      mounted.current = false;
      clearTimer();
      scheduleRef.current = () => {};
      document.removeEventListener('visibilitychange', onWake);
      window.removeEventListener('focus', onWake);
      deltaAbort.current?.abort();
      fullAbort.current?.abort();
      for (const t of timers) clearTimeout(t);
      timers.clear();
    };
  }, [readFull, readDelta]);

  /** Manual full refresh; failures surface as loadError / notice. */
  const syncNow = useCallback(async () => {
    await readFull().catch(() => {});
  }, [readFull]);

  /** A fresh, audited snapshot for a download; also refreshes the sheet. Throws on failure. */
  const fetchForExport = useCallback(async (): Promise<UserSheetResult> => {
    const res = await readFull('export');
    if (!res) throw new Error('Export was cancelled.');
    return res;
  }, [readFull]);

  return {
    rows,
    loaded,
    syncedAt,
    liveState,
    loadError,
    notice,
    syncing,
    highlighted,
    announcement,
    syncNow,
    fetchForExport,
  };
}
