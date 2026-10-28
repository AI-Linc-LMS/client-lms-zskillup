/**
 * Per-question stopwatch for the mock runner.
 *
 * Measures how long each question was actually ON SCREEN AND FOCUSED, which is the only
 * place that figure exists — the server can see when an answer arrives but not when the
 * student was looking at the question.
 *
 * Deliberately a plain class with an injected `now`, not a hook: the accrual rules below
 * are the whole feature, and they are only testable if time is a parameter. The runner
 * holds one instance in a ref and feeds it focus/blur events.
 *
 * THE RULES
 * - Totals are CUMULATIVE per question. Revisiting a question adds to its total, because
 *   "time spent on question 3" includes the second look.
 * - Hidden tab does NOT count. A student who switches away for ten minutes did not spend
 *   ten minutes on the question, and counting it would make every average meaningless on
 *   exactly the attempts proctoring already flags.
 * - Accrual is idempotent: focusing the question already focused, or blurring twice, adds
 *   nothing. The runner fires these from several effects and must not double-count.
 * - A clock that jumps backwards (NTP correction, laptop sleep) contributes 0, never a
 *   negative, which would silently subtract from a real total.
 */
export class QuestionTimer {
  private readonly totals = new Map<string, number>();
  private activeId: string | null = null;
  private since: number | null = null;

  /**
   * Make `questionId` the one being timed, banking whatever the previous one accrued.
   * Re-focusing the already-active question is a no-op, so repeated effect runs are safe.
   */
  focus(questionId: string, now: number): void {
    if (this.activeId === questionId && this.since !== null) return;
    this.bank(now);
    this.activeId = questionId;
    this.since = now;
  }

  /** Stop the clock (tab hidden, runner unmounting, attempt submitted) and bank it. */
  blur(now: number): void {
    this.bank(now);
    this.since = null;
  }

  /** Resume the question that was active before `blur`, if any. */
  resume(now: number): void {
    if (this.activeId !== null && this.since === null) this.since = now;
  }

  /**
   * Cumulative ms on one question, INCLUDING the currently-running interval.
   *
   * Includes the live interval on purpose: this is read when an answer is about to be
   * sent, and the seconds the student just spent choosing are part of the answer.
   * Returns undefined for a question never focused, so the caller sends no `timeMs` and
   * the column stays NULL ("not recorded") rather than storing a wrong 0.
   */
  totalFor(questionId: string, now: number): number | undefined {
    const banked = this.totals.get(questionId);
    const live =
      this.activeId === questionId && this.since !== null ? Math.max(0, now - this.since) : 0;
    if (banked === undefined && live === 0 && this.activeId !== questionId) return undefined;
    return Math.round((banked ?? 0) + live);
  }

  /** Everything accrued so far, for a submit-time flush. */
  snapshot(now: number): Map<string, number> {
    const out = new Map(this.totals);
    if (this.activeId !== null && this.since !== null) {
      out.set(this.activeId, Math.round((out.get(this.activeId) ?? 0) + Math.max(0, now - this.since)));
    }
    return out;
  }

  private bank(now: number): void {
    if (this.activeId === null || this.since === null) return;
    // Math.max(0, …) so a backwards clock contributes nothing instead of subtracting.
    const delta = Math.max(0, now - this.since);
    this.totals.set(this.activeId, (this.totals.get(this.activeId) ?? 0) + delta);
    this.since = now;
  }
}
