/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The nav's Pro marks and the rail of places (shell nav v3, 13 Nov; ref design-refs/shell-nav-v3.html).
 *   · the marks are the PAGES' own: Query letters, Submission packages and Comparable titles carry "materials",
 *     Versions "versions", Discover "discover"; no section heading carries one, and the rail's rows carry none;
 *   · the rail is one row per section, lit on any page of that section, nothing lit off the nav; More is gone.
 * Today every switch is open, so a founding writer sees none. A Free writer is rendered with the switches shut.
 */
import type { Entitlement } from "../../lib/entitlements";
import React from "react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { UserPlan } from "../../types";
import { workspaceSections } from "../../lib/workspaceNav";
import { navLockedFor } from "../../lib/entitlements";

const user: { plan: UserPlan; founding: boolean } = { plan: UserPlan.FREE, founding: true };
const ent = (basis: "free" | "pro" | "founding" | "trial"): Entitlement => ({ basis, pro: basis !== "free", prompts: basis === "free" || basis === "trial", trialEndsMs: null });
vi.mock("../../lib/db", () => ({
  useScriptAllyDb: () => ({
    tasks: [], userTasks: [], queries: [], agents: [], manuscripts: [], packages: [],
    versions: [], activities: [], taskFlags: [], notes: [], logout: () => {},
    currentUser: { id: "u1", name: "Isla Morven", email: "i@example.com", plan: user.plan },
    /* plan rules v1: the shell reads the resolved entitlement — a day-15 Free writer, or a paid Pro one */
    entitlement: ent(user.founding ? "founding" : user.plan === UserPlan.PRO ? "pro" : "free"),
  }),
}));
import { WorkspaceShell } from "./WorkspaceShell";
import { SidebarRail } from "./SidebarRail";

const ICONS: Record<string, React.ReactNode> = new Proxy({}, { get: (_, key) => <i data-icon={String(key)} /> }) as Record<string, React.ReactNode>;
const render = (path: string) => renderToStaticMarkup(
  <MemoryRouter initialEntries={[path]}>
    <WorkspaceShell sections={workspaceSections({ todo: 0 })} icons={ICONS} onNavigatePath={() => {}} onOpenSearch={() => {}} onOpenHelp={() => {}}>
      <div />
    </WorkspaceShell>
  </MemoryRouter>,
);
const G = globalThis as unknown as { __SA_NAV_FREE?: unknown };
afterEach(() => { delete G.__SA_NAV_FREE; user.plan = UserPlan.FREE; user.founding = true; });

/** the full sidebar's rows that carry a tag, by their accessible name */
const taggedRows = (h: string) => [...h.matchAll(/<button[^>]*class="ws-ni[^"]*"[^>]*aria-label="([^"]+)"[^>]*>(?:(?!<\/button>).)*ws-qpro/gs)].map((m) => m[1]);
/** the headings that carry a tag */
const taggedHeads = (h: string) => [...h.matchAll(/<div class="ws-glabel">([^<]+)<span class="ws-qpro ws-gpro"/g)].map((m) => m[1]);

describe("shell nav v3 — the nav's Pro marks", () => {
  it("a founding writer sees no mark anywhere (plan rules v1: the flag, not a switch)", () => {
    const h = render("/manuscripts/versions");
    expect(h).toContain("ws-glabel"); /* the full sidebar rendered */
    expect(h).toContain('data-shell="rail"'); /* and the rail */
    expect(h).not.toContain('data-shell="pro"');
  });

  it("a Free writer sees the tag on each locked page's own row, none on a heading, none on the rail", () => {
    user.founding = false;
    const h = render("/manuscripts/versions");
    expect(taggedHeads(h)).toEqual([]);
    expect(taggedRows(h)).toEqual(["Discover", "Query letters", "Submission packages", "Comparable titles", "Versions"]);
    expect(h).not.toContain("wsr-pro");
  });

  it("a paid Pro writer sees none", () => {
    user.founding = false;
    user.plan = UserPlan.PRO;
    expect(render("/manuscripts/versions")).not.toContain('data-shell="pro"');
  });

  it("navLockedFor: every entitlement for a Free writer; none for founding, trial or Pro", () => {
    expect([...navLockedFor(ent("free"))].sort()).toEqual(["discover", "materials", "packages", "versions"]);
    for (const b of ["founding", "trial", "pro"] as const) expect([...navLockedFor(ent(b))], b).toEqual([]);
  });
});

/* ══ SNV3-R — the rail of places ══ */
const railRows = (h: string) => [...h.matchAll(/<button[^>]*class="(wsr-ni[^"]*)"[^>]*data-go="([^"]+)"(?:(?!<\/button>).)*?<\/button>/gs)];
const NAV_PATHS = workspaceSections({ todo: 0 }).flatMap((s) => (s.children ?? []).map((c) => [c.path, s.id] as const));

describe("shell nav v3 — the rail is five places", () => {
  it("SNV3-R1 five rows with the baked labels, in order, and no More", () => {
    const h = render("/dashboard");
    const rows = railRows(h);
    expect(rows.map((m) => m[2])).toEqual(["workspace", "queries", "agents", "materials", "tasks"]);
    expect(rows.map((m) => m[0].match(/<span class="wsr-lbl">([^<]+)</)![1])).toEqual(["Dashboard", "Queries", "Agents", "Materials", "Tasks"]);
    expect(h).not.toContain('data-go="more"');
    expect(h).not.toContain("wsm-");
  });

  it("SNV3-R2 on each of the thirteen pages the right row is lit, and only that one", () => {
    expect(NAV_PATHS).toHaveLength(13);
    for (const [path, sec] of NAV_PATHS) {
      const lit = railRows(render(path)).filter((m) => /\bwsr-on\b/.test(m[1])).map((m) => m[2]);
      expect(lit, path).toEqual([sec]);
    }
  });

  it("SNV3-R3 nothing is lit on /your-notes or /account", () => {
    for (const path of ["/your-notes", "/account"]) {
      expect(railRows(render(path)).filter((m) => /\bwsr-on\b/.test(m[1])).map((m) => m[2]), path).toEqual([]);
    }
  });

  it("SNV3-R4 the five rows carry no tooltip", () => {
    const tipProps = { "data-tip": "x" };
    const el = SidebarRail(railProps({ tip: () => tipProps })) as React.ReactElement;
    const rows = findButtons(el).filter((b) => typeof b.props["data-go"] === "string");
    expect(rows).toHaveLength(5);
    for (const r of rows) expect(r.props["data-tip"], String(r.props["data-go"])).toBeUndefined();
  });

  it("SNV3-R5 the Materials row sends a writer with Materials locked to /manuscripts", () => {
    const went: string[] = [];
    const locked = navLockedFor(ent("free"));
    const el = SidebarRail(railProps({ locked, onGo: (p: string) => went.push(p) })) as React.ReactElement;
    const btn = findButtons(el).find((b) => b.props["data-go"] === "materials")!;
    (btn.props.onClick as () => void)();
    expect(went).toEqual(["/manuscripts"]);
    const open: string[] = [];
    const el2 = SidebarRail(railProps({ onGo: (p: string) => open.push(p) })) as React.ReactElement;
    (findButtons(el2).find((b) => b.props["data-go"] === "materials")!.props.onClick as () => void)();
    expect(open).toEqual(["/materials/letters"]);
  });
});

type El = React.ReactElement<Record<string, unknown>>;
function findButtons(node: unknown, out: El[] = []): El[] {
  if (Array.isArray(node)) { for (const n of node) findButtons(n, out); return out; }
  if (!node || typeof node !== "object" || !("props" in (node as object))) return out;
  const el = node as El;
  if (el.type === "button") out.push(el);
  findButtons(el.props.children, out);
  return out;
}
function railProps(over: Record<string, unknown>): React.ComponentProps<typeof SidebarRail> {
  return {
    sections: workspaceSections({ todo: 0 }), icons: ICONS, hit: null, todoCount: 0, locked: new Set<string>(),
    onGo: () => {}, onExpand: () => {}, expanded: false, switcher: null, markSrc: "", settingsMode: false,
    settingsSection: null, onSettings: () => {}, onBack: () => {}, initials: "IM", who: "Isla", planLabel: "",
    tip: () => ({}), toggleKbd: "", ...over,
  } as React.ComponentProps<typeof SidebarRail>;
}
