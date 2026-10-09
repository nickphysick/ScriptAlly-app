/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD v58 — what the loading page should be the shape of.
 *
 * Three things on the page are sized by the writer's data and cannot be known before it arrives:
 * the focus card's height (a query shows its stages, everything else a sentence), whether anything
 * has closed (four tiles, or two lines of words), and whether the tab carries its "today" pill.
 * The page remembers them per device, so the loading boxes are the loaded boxes on every visit
 * after the first. A first visit uses the commonest shape.
 */
export const DASH_SHAPE_KEY = "sa.dash58Shape";

export interface DashShape { focusH: number; closed: "some" | "none"; today: boolean }

export const DEFAULT_SHAPE: DashShape = { focusH: 246, closed: "some", today: false };

export function readShape(): DashShape {
  try {
    const raw = typeof localStorage === "undefined" ? null : localStorage.getItem(DASH_SHAPE_KEY);
    if (!raw) return DEFAULT_SHAPE;
    const v = JSON.parse(raw) as Partial<DashShape>;
    return {
      focusH: typeof v.focusH === "number" && v.focusH >= 80 && v.focusH <= 600 ? v.focusH : DEFAULT_SHAPE.focusH,
      closed: v.closed === "none" ? "none" : "some",
      today: v.today === true,
    };
  } catch { return DEFAULT_SHAPE; }
}

export function writeShape(s: DashShape): void {
  try { localStorage.setItem(DASH_SHAPE_KEY, JSON.stringify(s)); } catch { /* private mode */ }
}
