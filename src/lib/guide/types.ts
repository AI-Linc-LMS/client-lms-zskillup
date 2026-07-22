/**
 * Types for the in-app platform guide - a spotlight coachmark tour that walks a
 * student across modules, navigating between routes and scrolling sub-sections
 * into view. Steps are data-driven (see registry.ts) so the tour is easy to edit.
 */

export type Placement = 'top' | 'bottom' | 'left' | 'right' | 'auto' | 'center';

export interface GuideStep {
  /** Stable id (unique within a tour). */
  id: string;
  /**
   * Route this step lives on. When it differs from the current pathname the tour
   * navigates there first, then waits for the target to mount. Omit to stay put.
   */
  route?: string;
  /**
   * `data-tour` value of the element to spotlight. Omit (or 'center') for a
   * centered card with no highlight (intro / outro / section transitions).
   */
  target?: string;
  title: string;
  /** Supports plain text; keep it to ~1-2 short sentences. */
  body: string;
  /** Preferred card placement relative to the target. 'auto' picks the roomier side. */
  placement?: Placement;
  /** Extra spotlight padding (px) around the target's box. Default 8. */
  pad?: number;
  /** Optional eyebrow shown above the title, e.g. the module group ("PRACTICE"). */
  eyebrow?: string;
  /** Target only exists on ≥lg screens (sidebar / top-bar search) - filtered out
   *  of the tour on smaller viewports so mobile users don't get dead highlights. */
  desktopOnly?: boolean;
}

export interface GuideTour {
  id: string;
  label: string;
  steps: GuideStep[];
}
