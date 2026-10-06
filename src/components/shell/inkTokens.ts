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
