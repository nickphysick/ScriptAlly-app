/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The ink shell's ground as a JS value, for the one consumer that cannot read CSS: the browser
 * chrome's `theme-color` meta (INK1). `inkShell.test.ts` holds it equal to `--ink-shell` in index.css.
 *
 * ⚠️ ITS OWN MODULE, imported by the shell AND the test, because importing `WorkspaceShell` from a
 * unit test pulls in Firebase and the suite fails to load (`auth/invalid-api-key`).
 */
export const INK_THEME_COLOR = "#1b2433";

/**
 * How far in from the SHEET's bottom-right corner a floating tab sits (ink shell v1: 20px). ⚠️ ONE
 * owner for the four floats that measure the window themselves — the Birds-eye tab, FloatingTab, the
 * Analytics section tab and the Contact list's page guide — which each restated `24` before. Below
 * 768px the shell is the phone's and the floats keep their old 24 (INK19).
 */
export const FLOAT_INSET_DESKTOP = 20;
export const FLOAT_INSET_PHONE = 24;
export function floatInset(): number {
  if (typeof window === "undefined" || !window.matchMedia) return FLOAT_INSET_DESKTOP;
  return window.matchMedia("(min-width: 768px)").matches ? FLOAT_INSET_DESKTOP : FLOAT_INSET_PHONE;
}
