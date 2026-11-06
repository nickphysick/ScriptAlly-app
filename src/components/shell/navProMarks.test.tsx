/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The nav's Pro marks (sidebar materials v1, 6 Nov). A mark is drawn only for an entitlement the writer lacks:
 *   · rail: the "Pro" tag on the Materials section's head; a 5px outlined dot on Versions in Your book's card;
 *   · full sidebar: a "PRO" tag after the MATERIALS heading, and on the Versions and Discover rows — never on Query
 *     letters, Comparable titles or Submission packages, because their heading already says it.
 * Today every switch is open, so a founding writer sees none. A Free writer is rendered with the switches shut
 * (`__SA_NAV_FREE`, the dev-only review aid), which is the nav they will see once gating returns.
 */
import React from "react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { UserPlan } from "../../types";
import { workspaceSections } from "../../lib/workspaceNav";
import { navLockedFor } from "../../lib/entitlements";

const user: { plan: UserPlan } = { plan: UserPlan.FREE };
vi.mock("../../lib/db", () => ({
  useScriptAllyDb: () => ({
    tasks: [], userTasks: [], queries: [], agents: [], manuscripts: [], packages: [],
    versions: [], activities: [], taskFlags: [], notes: [], logout: () => {},
    currentUser: { id: "u1", name: "Isla Morven", email: "i@example.com", plan: user.plan },
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
const G = globalThis as unknown as { __SA_NAV_FREE?: unknown };
afterEach(() => { delete G.__SA_NAV_FREE; user.plan = UserPlan.FREE; });

/** the full sidebar's rows that carry a tag, by their accessible name */
const taggedRows = (h: string) => [...h.matchAll(/<button[^>]*class="ws-ni[^"]*"[^>]*aria-label="([^"]+)"[^>]*>(?:(?!<\/button>).)*ws-qpro/gs)].map((m) => m[1]);
/** the headings that carry a tag */
const taggedHeads = (h: string) => [...h.matchAll(/<div class="ws-glabel">([^<]+)<span class="ws-qpro ws-gpro"/g)].map((m) => m[1]);

describe("sidebar materials v1 — the nav's Pro marks", () => {
  it("a founding writer (every switch open, as today) sees no mark anywhere", () => {
    const h = render("/manuscripts/versions");
    expect(h).toContain("ws-glabel"); /* the full sidebar rendered */
    expect(h).toContain('data-shell="rail"'); /* and the rail */
    expect(h).not.toContain('data-shell="pro"');
    expect(h).not.toContain("wsr-pro");
    expect(h).not.toContain("wsr-spd");
  });

  it("a Free writer sees the Materials tag on the rail, the Versions dot, and the sidebar's three tags", () => {
    G.__SA_NAV_FREE = true;
    const h = render("/manuscripts/versions");
    /* rail: Materials' head carries "Pro"; no other section head does */
    const heads = [...h.matchAll(/<button[^>]*class="wsr-ni[^"]*"[^>]*data-sec="([^"]+)"(?:(?!<\/button>).)*?<\/button>/gs)];
    const withTag = heads.filter((m) => m[0].includes("wsr-pro")).map((m) => m[1]);
    expect(withTag).toEqual(["materials"]);
    /* rail card: Versions is a dot with no text, named Pro */
    expect(h).toMatch(/data-go="m-ver"(?:(?!<\/button>).)*<span class="wsr-spd" data-shell="pro" role="img" aria-label="Pro"><\/span>/s);
    /* every card's rows are in the DOM (a shut card is collapsed, not unmounted): Discover, the other Pro page, wears
       the same dot in the Agents card; Materials' rows wear none */
    const dotted = [...h.matchAll(/data-go="([^"]+)"(?:(?!<\/button>).)*?wsr-spd/gs)].map((m) => m[1]);
    expect(dotted).toEqual(["a-disc", "m-ver"]);
    /* full sidebar: the MATERIALS heading, then Discover and Versions; no Materials row carries its own */
    expect(taggedHeads(h)).toEqual(["Materials"]);
    expect(taggedRows(h)).toEqual(["Discover", "Versions"]);
  });

  it("on Query letters a Free writer's open Materials card carries no row dots, because the section says it", () => {
    G.__SA_NAV_FREE = true;
    const h = render("/materials/letters");
    for (const id of ["m-letters", "m-comps", "q-pkg"]) {
      expect(h, id).toMatch(new RegExp(`data-go="${id}"(?:(?!<\\/button>).)*<\\/button>`, "s"));
      expect(h.match(new RegExp(`data-go="${id}"(?:(?!<\\/button>).)*<\\/button>`, "s"))![0], id).not.toContain("wsr-spd");
    }
  });

  it("a paid Pro writer sees none, even with the switches shut", () => {
    G.__SA_NAV_FREE = true;
    user.plan = UserPlan.PRO;
    expect(render("/manuscripts/versions")).not.toContain('data-shell="pro"');
  });

  it("navLockedFor: empty today; every entitlement for a Free writer once the switches shut; empty for Pro", () => {
    const shut = { discover: false, packages: false, versions: false, materials: false } as const;
    expect([...navLockedFor({ plan: UserPlan.FREE })]).toEqual([]);
    expect([...navLockedFor({ plan: UserPlan.FREE }, shut)].sort()).toEqual(["discover", "materials", "packages", "versions"]);
    expect([...navLockedFor({ plan: UserPlan.PRO }, shut)]).toEqual([]);
    expect([...navLockedFor(null, { materials: false })]).toEqual(["materials"]);
  });
});
