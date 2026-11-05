/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * railMemory — the page you last used in each section (sidebar rail v1, 5 Nov).
 *
 * Clicking a section on the rail goes back to where you were in it, not to its first page: Agents
 * after Discover is Discover. The first visit is the section's first page, and a remembered page the
 * section no longer has (renamed, retired) falls back to the first page rather than to nowhere.
 *
 * ⚠️ IT REMEMBERS A PAGE ID PER SECTION ID, AND ONLY IDS THE NAV HAS. Stored in localStorage so it
 * outlives the shell rebuilding on the settings routes and a reload.
 */
import { ShellHit, ShellSection } from "./workspaceShell";

export const RAIL_LAST_PAGE_KEY = "scriptally:rail-last-page";

type Memory = Record<string, string>;

function read(storage: Pick<Storage, "getItem"> | null): Memory {
  try {
    const raw = storage?.getItem(RAIL_LAST_PAGE_KEY);
    const v = raw ? JSON.parse(raw) : null;
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Memory) : {};
  } catch {
    return {};
  }
}

const store = (): Storage | null => (typeof localStorage === "undefined" ? null : localStorage);

/**
 * Note the page on screen as its section's last page. Off-nav routes (no hit) note nothing.
 *
 * ⚠️ IT ALSO DROPS WHAT THE NAV NO LONGER HAS. A page that was retired (Calendar, 29 Oct) or moved to another
 * section (Submission packages left Materials for Queries, 25 Oct) would otherwise sit in storage for ever. A
 * click on its section already falls back to the first page; pruning on the next write keeps the memory honest.
 */
export function noteRailPage(
  hit: ShellHit | null,
  storage: Pick<Storage, "getItem" | "setItem"> | null = store(),
  sections?: ShellSection[],
): void {
  if (!hit?.section || !hit.child) return;
  const mem = read(storage);
  let dirty = false;
  if (sections) {
    for (const [sec, page] of Object.entries(mem)) {
      const s = sections.find((x) => x.id === sec);
      if (!s || !(s.children ?? []).some((c) => c.id === page)) { delete mem[sec]; dirty = true; }
    }
  }
  if (mem[hit.section] !== hit.child) { mem[hit.section] = hit.child; dirty = true; }
  if (!dirty) return;
  try { storage?.setItem(RAIL_LAST_PAGE_KEY, JSON.stringify(mem)); } catch { /* not worth an error */ }
}

/**
 * Where a click on this section goes: the page last used in it, if the section still has that page;
 * otherwise its first page.
 */
export function railPageFor(sec: ShellSection, _hit: ShellHit | null, storage: Pick<Storage, "getItem"> | null = store()): string {
  const kids = sec.children ?? [];
  const last = read(storage)[sec.id];
  const ch = kids.find((c) => c.id === last) ?? kids[0];
  return ch?.path ?? sec.path ?? "/dashboard";
}
