/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * A DEV-ONLY review aid for the folder tab's overflow (INK6 · "lots of pages"). Set
 * `window.__SA_INK_TABS = 5` and the current group gains five hypothetical pages after its real ones,
 * so names → icons → "+N" can be watched on a real page. It fabricates INPUT, never output: the
 * hypothetical pages go through the same fit as real ones.
 *
 * ⚠️ GATED AT ITS ONE CALL SITE (WorkspaceShell) on `import.meta.env.MODE`, so a production build drops
 * this module entirely — a guard inside the module would not, and an esbuild `@license` docblock ships
 * whole.
 */
import type { TabSibling } from "./FolderTab";

const EXTRA = ["Query letters", "Synopses", "Sample pages", "Bios", "Pitch notes", "Opening lines", "Loglines", "Cover notes"];

export function inkTabAid(siblings: TabSibling[]): TabSibling[] {
  if (typeof window === "undefined") return siblings;
  const n = Number((window as unknown as { __SA_INK_TABS?: unknown }).__SA_INK_TABS ?? 0);
  if (!Number.isFinite(n) || n <= 0 || siblings.length === 0) return siblings;
  const icon = siblings[0].icon;
  return [
    ...siblings,
    ...EXTRA.slice(0, Math.min(n, EXTRA.length)).map((label, i) => ({ id: `ink-aid-${i}`, label, path: siblings[0].path, icon })),
  ];
}
