/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Shell nav v3, Phase 2 — the tab strip (ref design-refs/shell-nav-v3.html). Rendered through the real shell
 * (server render, node environment): on every page the strip is the section's pages in nav order, the current one
 * marked in place; no group label anywhere in the bar; a nav landmark of buttons, not ARIA tabs. The fit is
 * `planStrip`, a pure function, tested here; the measured half (real widths at three sizes, the stability of the
 * strip across a click) is tests/e2e/shellNavV3.measure.ts.
 */
import type { Entitlement } from "../../lib/entitlements";
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { UserPlan } from "../../types";
import { workspaceSections, tabLabelOf } from "../../lib/workspaceNav";
import { planStrip } from "./FolderTab";

const user = { founding: true };
const ent = (basis: "free" | "founding"): Entitlement => ({ basis, pro: basis !== "free", prompts: basis === "free", trialEndsMs: null });
vi.mock("../../lib/db", () => ({
  useScriptAllyDb: () => ({
    tasks: [], userTasks: [], queries: [], agents: [], manuscripts: [], packages: [],
    versions: [], activities: [], taskFlags: [], notes: [], logout: () => {},
    currentUser: { id: "u1", name: "Isla Morven", email: "i@example.com", plan: UserPlan.FREE },
    entitlement: ent(user.founding ? "founding" : "free"),
  }),
}));
import { WorkspaceShell } from "./WorkspaceShell";

const ICONS: Record<string, React.ReactNode> = new Proxy({}, { get: (_, key) => <i data-icon={String(key)} /> }) as Record<string, React.ReactNode>;
const render = (path: string) => renderToStaticMarkup(
  <MemoryRouter initialEntries={[path]}>
    <WorkspaceShell sections={workspaceSections({ todo: 0 })} icons={ICONS} onNavigatePath={() => {}} onOpenSearch={() => {}} onOpenHelp={() => {}}>
      <div />
    </WorkspaceShell>
  </MemoryRouter>,
);
/** the live strip (the measurer is a span, aria-hidden; the strip is the nav) */
const strip = (h: string) => {
  const at = h.indexOf('<nav class="ws-fttabs"');
  expect(at, "the strip rendered").toBeGreaterThan(-1);
  return h.slice(at, h.indexOf("</nav>", at));
};
const bar = (h: string) => h.slice(h.indexOf('<header'), h.indexOf("</header>"));
const tabsOf = (h: string) => [...strip(h).matchAll(/<button[^>]*data-tab="([^"]+)"/g)].map((m) => m[1]);
const NAV = workspaceSections({ todo: 0 });

describe("shell nav v3 — the tab strip", () => {
  it("SNV3-T1 on every page of Queries, Agents, Materials and Tasks the tabs are the section's pages in nav order", () => {
    let n = 0;
    for (const sec of NAV.filter((s) => ["queries", "agents", "materials", "tasks"].includes(s.id))) {
      const ids = sec.children!.map((c) => c.id);
      for (const page of sec.children!) {
        const h = render(page.path);
        expect(tabsOf(h), page.path).toEqual(ids);
        /* the current tab is marked where it stands, by its short name */
        const cur = strip(h).match(/<button[^>]*aria-current="page"[^>]*data-tab="([^"]+)"|<button[^>]*data-tab="([^"]+)"[^>]*aria-current="page"/);
        expect(cur && (cur[1] ?? cur[2]), page.path).toBe(page.id);
        expect(strip(h), page.path).toContain(`data-page-name="">${tabLabelOf(page)}</b>`);
        n++;
      }
    }
    expect(n).toBe(12);
  });

  it("SNV3-T2 no group label in the bar on any page, off-nav ones included", () => {
    for (const path of [...NAV.flatMap((s) => s.children!.map((c) => c.path)), "/your-notes", "/account/profile", "/help", "/plans", "/import"]) {
      const b = bar(render(path));
      expect(b, path).not.toContain("ws-ftg");
      expect(b, path).not.toMatch(/<small/);
    }
    expect(strip(render("/account/profile"))).toContain('data-page-name="">Settings</b>');
    expect(strip(render("/your-notes"))).toContain('data-page-name="">Your notes</b>');
  });

  it("SNV3-T3 a nav landmark of buttons, not ARIA tabs; one-page sections and off-nav pages show one tab", () => {
    const h = render("/manuscripts/comps");
    expect(strip(h)).toMatch(/^<nav class="ws-fttabs" aria-label="Pages" data-shell="tabs">/);
    expect(bar(h)).not.toContain('role="tablist"');
    expect(bar(h)).not.toContain('role="tab"');
    expect(tabsOf(render("/dashboard"))).toEqual(["dash"]);
    expect(tabsOf(render("/your-notes"))).toHaveLength(1);
  });

  it("SNV3-T4 the current tab carries the right fillet always, the left one only when it is not first", () => {
    const fil = (h: string) => ({ r: (strip(h).match(/class="ws-ftfl"/g) ?? []).length, l: (strip(h).match(/class="ws-ftfl-l"/g) ?? []).length });
    expect(fil(render("/materials/letters"))).toEqual({ r: 1, l: 0 });
    expect(fil(render("/manuscripts/comps"))).toEqual({ r: 1, l: 1 });
    expect(fil(render("/manuscripts"))).toEqual({ r: 1, l: 1 });
  });

  it("SNV3-T5 a locked page's tab carries the small PRO tag after its name", () => {
    user.founding = false;
    try {
      const s = strip(render("/manuscripts"));
      const locked = [...s.matchAll(/<button[^>]*data-tab="([^"]+)"(?:(?!<\/button>).)*?<\/button>/gs)].filter((m) => m[0].includes("ws-ftpro")).map((m) => m[1]);
      expect(locked).toEqual(["m-letters", "q-pkg", "m-comps", "m-ver"]);
    } finally { user.founding = true; }
    expect(strip(render("/manuscripts"))).not.toContain("ws-ftpro");
  });
});

describe("planStrip — names, then icons, then +N; resting tabs give way from the right; the current never does", () => {
  const rest = [100, 120, 90, 110, 130];
  const icon = [37, 37, 37, 37, 37];
  it("names every tab while they all fit", () => {
    expect(planStrip(rest, icon, 2, 140, 58, 2000)).toEqual(["full", "full", "cur", "full", "full"]);
  });
  it("turns resting tabs to icons from the right first", () => {
    /* full: 100+120+140+110+130 + 4×6 = 624; at 560 the last becomes an icon (531) */
    expect(planStrip(rest, icon, 2, 140, 58, 560)).toEqual(["full", "full", "cur", "full", "ic"]);
    expect(planStrip(rest, icon, 2, 140, 58, 480)).toEqual(["full", "full", "cur", "ic", "ic"]);
  });
  it("every resting tab is an icon before any leaves for +N, and +N takes them from the right", () => {
    /* all icons: 4×37 + 140 + 4×6 = 312 */
    expect(planStrip(rest, icon, 2, 140, 58, 312)).toEqual(["ic", "ic", "cur", "ic", "ic"]);
    /* one short: the rightmost leaves for +N — 3×37 + 140 + 58 + 4×6 = 333 > 311, so two leave: 2×37 + 140 + 58 + 3×6 = 290 */
    expect(planStrip(rest, icon, 2, 140, 58, 311)).toEqual(["ic", "ic", "cur", "hid", "hid"]);
    expect(planStrip(rest, icon, 2, 140, 58, 260)).toEqual(["ic", "hid", "cur", "hid", "hid"]);
  });
  it("the current tab is never an icon and never hidden, whatever the room", () => {
    for (let limit = 0; limit < 800; limit += 13) {
      for (let c = 0; c < 5; c++) {
        const m = planStrip(rest, icon, c, 150, 58, limit);
        expect(m[c], `limit ${limit}, current ${c}`).toBe("cur");
        expect(m.filter((x) => x === "cur")).toHaveLength(1);
      }
    }
  });
  it("the sequence from the right never names a tab to the right of an icon or a hidden one", () => {
    for (let limit = 0; limit < 800; limit += 7) {
      const m = planStrip(rest, icon, 0, 150, 58, limit).slice(1);
      expect(m.join(","), `limit ${limit}`).toMatch(/^(full,)*(full|ic)?(,?ic)*(,?hid)*$|^$/);
    }
  });
});
