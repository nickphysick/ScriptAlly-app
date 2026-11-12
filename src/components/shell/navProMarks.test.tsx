/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The nav's Pro marks (sidebar materials v1, 6 Nov). A mark is drawn only for an entitlement the writer lacks:
 *   · rail (v2): the "Pro" tag on the Letters item (Materials is Pro); the More panel's marks are its own test;
 *   · full sidebar: a "PRO" tag after the MATERIALS heading, and on the Versions and Discover rows — never on Query
 *     letters, Comparable titles or Submission packages, because their heading already says it.
 * Today every switch is open, so a founding writer sees none. A Free writer is rendered with the switches shut
 * (`__SA_NAV_FREE`, the dev-only review aid), which is the nav they will see once gating returns.
 */
import type { Entitlement } from "../../lib/entitlements";
import React from "react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { UserPlan } from "../../types";
import { workspaceSections } from "../../lib/workspaceNav";
import { navLockedFor } from "../../lib/entitlements";

const user: { plan: UserPlan } = { plan: UserPlan.FREE };
const ent = (basis: "free" | "pro"): Entitlement => ({ basis, pro: basis === "pro", prompts: basis === "free", trialEndsMs: null });
vi.mock("../../lib/db", () => ({
  useScriptAllyDb: () => ({
    tasks: [], userTasks: [], queries: [], agents: [], manuscripts: [], packages: [],
    versions: [], activities: [], taskFlags: [], notes: [], logout: () => {},
    currentUser: { id: "u1", name: "Isla Morven", email: "i@example.com", plan: user.plan },
    /* plan rules v1: the shell reads the resolved entitlement — a day-15 Free writer, or a paid Pro one */
    entitlement: ent(user.plan === UserPlan.PRO ? "pro" : "free"),
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
  });

  it("a Free writer sees the Pro tag on the rail's Letters item only, and the sidebar's three tags", () => {
    G.__SA_NAV_FREE = true;
    const h = render("/manuscripts/versions");
    const items = [...h.matchAll(/<button[^>]*class="wsr-ni[^"]*"[^>]*data-go="([^"]+)"(?:(?!<\/button>).)*?<\/button>/gs)];
    expect(items.filter((m) => m[0].includes("wsr-pro")).map((m) => m[1])).toEqual(["m-letters"]);
    /* full sidebar: the MATERIALS heading, then Discover and Versions; no Materials row carries its own */
    expect(taggedHeads(h)).toEqual(["Materials"]);
    expect(taggedRows(h)).toEqual(["Discover", "Versions"]);
  });

  it("sidebar rail v2: More is a menu button, lit and named by the More page you are on", () => {
    const more = (path: string) => render(path).match(/<button[^>]*data-go="more"[^>]*>(?:(?!<\/button>).)*<\/button>/s)![0];
    const r = more("/queries/responses");
    expect(r).toContain('aria-haspopup="menu"');
    expect(r).toContain('aria-expanded="false"');
    expect(r).toContain("wsr-on");
    expect(r).toContain(">Responses<");
    expect(r).toContain('aria-label="More: Responses"');
    const q = more("/queries");
    expect(q).not.toContain("wsr-on");
    expect(q).toContain(">More<");
    expect(more("/manuscripts/comps")).toContain(">Comps<");
    /* the rail item lights only on its own page */
    const h = render("/queries/responses");
    expect(h).not.toMatch(/class="wsr-ni wsr-on"[^>]*data-go="q-centre"/);
    expect(render("/queries")).toMatch(/class="wsr-ni wsr-on"[^>]*data-go="q-centre"/);
  });

  it("a paid Pro writer sees none, even with the switches shut", () => {
    G.__SA_NAV_FREE = true;
    user.plan = UserPlan.PRO;
    expect(render("/manuscripts/versions")).not.toContain('data-shell="pro"');
  });

  it("navLockedFor: empty today; every entitlement for a Free writer once the switches shut; empty for Pro", () => {
    const shut = { discover: false, packages: false, versions: false, materials: false } as const;
    expect([...navLockedFor(ent("free"))]).toEqual([]);
    expect([...navLockedFor(ent("free"), shut)].sort()).toEqual(["discover", "materials", "packages", "versions"]);
    expect([...navLockedFor(ent("pro"), shut)]).toEqual([]);
    expect([...navLockedFor(ent("free"), { materials: false })]).toEqual(["materials"]);
  });
});
