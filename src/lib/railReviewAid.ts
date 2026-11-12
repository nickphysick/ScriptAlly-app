/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * railReviewAid — a DEV-ONLY review aid for the sidebar rail (sidebar rail v1).
 *
 * `window.__SA_RAIL_COUNT = 128` stands in for the To-do board's total, so the rail's "99+" badge can be
 * measured on an account whose board is small. It fabricates INPUT, never output: the badge is still
 * drawn by the rail's own `railCount`.
 *
 * `window.__SA_NAV_FREE = true` (sidebar materials v1) closes every nav entitlement's open-to-all switch, so the
 * nav's Pro marks can be seen as a Free writer will see them once gating returns. A Pro plan still has every mark
 * off: `navLockedFor` decides, as it does for real.
 *
 * ⚠️ THE CALL SITE CARRIES THE MODE GATE (`import.meta.env.MODE !== "production"`), so a production
 * build drops this module entirely — a guard inside the module is not absence from the bundle.
 */
export function railCountAid(real: number): number {
  const v = (globalThis as unknown as { __SA_RAIL_COUNT?: unknown }).__SA_RAIL_COUNT;
  return typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : real;
}

/** The open-to-all overrides `__SA_NAV_FREE` asks for: every switch shut, or none overridden. */
export function navOpenAid(): { discover: false; packages: false; versions: false; materials: false } | undefined {
  return (globalThis as unknown as { __SA_NAV_FREE?: unknown }).__SA_NAV_FREE === true
    ? { discover: false, packages: false, versions: false, materials: false }
    : undefined;
}

/**
 * Plan rules v1: `__SA_NAV_FREE` also stands the account in as a day-15 Free writer (not founding, plan Free, created long
 * ago), because a founding or trial account is Pro through the resolver and would otherwise see no gate at all. It
 * fabricates the resolver's INPUT, never its answer. A paid Pro plan is left as it is, so Pro still sees nothing.
 */
export function freeWriterAid(): boolean {
  return (globalThis as unknown as { __SA_NAV_FREE?: unknown }).__SA_NAV_FREE === true;
}
