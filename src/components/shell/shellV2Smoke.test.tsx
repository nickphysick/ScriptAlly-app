/**
 * ⚠️ THE RAIL, THE SIDE PANEL AND THEIR SIDEBAR BODY ARE GONE (app-shell pack, Phase 2) — one
 * expanding column replaced all three, and their blocks were deleted from this file with them
 * rather than left asserting components nothing mounts.
 *
 * ⚠️ AND THAT COLUMN IS NOW GONE TOO (shell-rebuild pack, Phase 3): the DOUBLE-DECKER superseded
 * it, so every `ShellColumn.tsx` read below was repointed at WorkspaceShell or rewritten where
 * the rule itself changed. Its locks live in lib/workspaceShell.test.ts (grammar) and
 * workspaceShell.test.tsx (structure).
 *
 * ⚠️ ShellTopBar SURVIVES AS THE MOBILE BAR ONLY. Both rebuild mockups are desktop-only and
 * Mobile Pass 1 is live, so the new bar is a ≥768px replacement and this one still renders below
 * it. The bar assertions here therefore describe the PHONE's bar, not the desktop's.
 *
 * jsdom/static smoke render for the v2 shell chrome — structure and classes only (layout is a
 * browser check, per the pack's jsdom limits). The point: the chrome is auth-gated in the app,
 * so a runtime crash in these components would otherwise hide until Nick signs in. The db hook
 * is mocked with an empty-but-complete state; effects don't run under renderToStaticMarkup, so
 * this exercises the pure render paths (hooks, derivations, mapping) end to end.
 */
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { UserPlan } from "../../types";

vi.mock("../../lib/db", () => ({
  useScriptAllyDb: () => ({
    tasks: [],
    userTasks: [],
    queries: [],
    agents: [],
    manuscripts: [],
    packages: [],
    versions: [],
    activities: [],
    taskFlags: [],
    notes: [],
    currentUser: { id: "u1", name: "Nick Physick", plan: UserPlan.FREE },
  }),
}));

import { ShellTopBar } from "./ShellV2";

const at = (path: string, node: React.ReactNode) =>
  renderToStaticMarkup(<MemoryRouter initialEntries={[path]}>{node}</MemoryRouter>);

describe("v2 shell — smoke renders", () => {
  /* ⚠️ REWRITTEN TWICE, and the second time moved it out of the sidebar entirely. Phase 3 made
     the brand TYPE rather than the artwork; Amendment 1 (C) then took the wordmark OFF the
     sidebar and put it at the head of the breadcrumb, as the real asset — leaving the rail's "S"
     tile as the only mark in the sidebar. Dashboard is a real nav row throughout. */
  it("THE BRAND leads the crumb; the sidebar keeps only the S tile", () => {
    const ws = readFileSync(resolve(__dirname, "./WorkspaceShell.tsx"), "utf8");
    expect(ws).toContain("ws-tile");                       // the one sidebar mark
    expect(ws).toContain("ws-logotype");                   // the crumb's asset
    expect(ws).toContain('src="/scriptally-title-v2.png"');
    const nav = readFileSync(resolve(__dirname, "../../lib/workspaceNav.ts"), "utf8");
    expect(nav).toContain('path: "/dashboard"');
    // the retired panel's brand slot and its Navigate label are gone from the source entirely
    const v2 = readFileSync(resolve(__dirname, "./ShellV2.tsx"), "utf8");
    expect(v2).not.toContain("sv2-pwm");
    expect(v2).not.toContain("sv2-plab");
  });

  it("THE USER BLOCK is in the bar on EVERY page — and the duplication with the panel foot is deliberate", () => {
    for (const path of ["/agents", "/queries", "/manuscripts", "/todo"]) {
      const html = bar(path);
      expect(html, path).toContain("sv2-tbuser");
      expect(html, path).toContain("sv2-tbav");
      expect(html, path).toContain("Nick Physick");
      // it always rides the right-hand tools cluster, after the search
      expect(html.indexOf("sv2-searchopen"), path).toBeLessThan(html.indexOf("sv2-tbuser"));
    }
    // ...and it ALSO renders at the SHELL's foot (Baked 10), where it carries the plan line.
    // Approved duplication, asserted so it is not "tidied away" by someone who spots it later.
    const ws = readFileSync(resolve(__dirname, "./WorkspaceShell.tsx"), "utf8");
    expect(ws).toContain("ws-urow");
  });

  it("THE SEARCH IS AN OPENER — one search implementation, and the palette is it", () => {
    const html = bar("/queries");
    expect(html).toContain("sv2-searchopen");
    expect(html).toContain("⌘K");
    // it is a BUTTON, not a field: the palette takes the typing
    expect(html).not.toContain("nav-search-field");
    expect(html).not.toContain("<input");
    // and nothing in the shell mounts a second search
    const shell = readFileSync(resolve(__dirname, "./ShellV2.tsx"), "utf8");
    expect(shell).not.toContain("<NavSearch");
    // The legacy Nav.tsx — the slim bar's historical NavSearch mount — is DELETED outright
    // (Tier 3+4 · Phase 9, the dead-shell sweep), so "no second search" now holds by absence.
    expect(existsSync(resolve(__dirname, "..", "Nav.tsx"))).toBe(false);
  });

  it("THE PRO UPSELL IS FOLDED INTO THE PLAN LINE — a text link, no row, no pill, no card", () => {
    const col = readFileSync(resolve(__dirname, "./WorkspaceShell.tsx"), "utf8");
    // the plan is stated as fact beside the name, and Upgrade is a plain link in that line
    expect(col).toContain("planLine(currentUser?.plan)");
    expect(col).toContain("ws-up");
    expect(col).toContain("Upgrade");
    // Pro is a text link HERE and a card in the account menu. Nowhere else.
    expect(col).not.toContain("propill");
    expect(col).not.toContain("Upgrade to Pro");
  });

  const bar = (path: string) =>
    at(path, <ShellTopBar onNavigate={() => {}} scope={<span className="sv2-scope" />} onOpenSearch={() => {}} />);

  it("THE WORKSPACE BAR (Baked 8): tuck · breadcrumb · divider · scope · grow · search · account", () => {
    const html = bar("/manuscripts");
    expect(html).toContain("sv2-topbar");
    expect(html).toContain("sv2-tuck");        // the bar's only chrome control
    expect(html).toContain("sv2-crumb");
    expect(html).toContain("Shelf");           // the section
    expect(html).toContain("<b>Manuscripts</b>"); // the page, bold and inert
    expect(html).toContain("sv2-vr");
    expect(html).toContain("sv2-scope");
    expect(html).toContain("sv2-searchopen");
    expect(html).toContain("sv2-tbuser");
    // order: tuck → crumb → divider → scope → search → account
    expect(html.indexOf("sv2-tuck")).toBeLessThan(html.indexOf("sv2-crumb"));
    expect(html.indexOf("sv2-crumb")).toBeLessThan(html.indexOf("sv2-scope"));
    expect(html.indexOf("sv2-scope")).toBeLessThan(html.indexOf("sv2-searchopen"));
    expect(html.indexOf("sv2-searchopen")).toBeLessThan(html.indexOf("sv2-tbuser"));
  });

  it("⚠️ PER-PAGE ACTIONS DO NOT GO IN THE BAR — and the brand is not there either", () => {
    const html = bar("/queries");
    // Help left for the account menu; the brand left for the column's masthead; there is no
    // dashboard variant, because the dashboard is a TOP-NAV page now.
    expect(html).not.toContain("sv2-tbicon");
    expect(html).not.toContain("sv2-tbbrand");
    expect(html).not.toContain("scriptally-brand-logo-root");
    expect(html).not.toContain("sv2-tb-dash");
    // the bar answers where-am-I and which-manuscript, and nothing else
    const v2 = readFileSync(resolve(__dirname, "./ShellV2.tsx"), "utf8");
    const barFn = v2.slice(v2.indexOf("export const ShellTopBar"));
    expect(barFn).toContain("PER-PAGE ACTIONS DO NOT GO IN THIS BAR");
  });

  it("the crumb is on EVERY workspace page", () => {
    for (const [path, page] of [["/queries", "Queries Hub"], ["/agents", "Agent list"], ["/todo", "To-do"], ["/import", "Import"]] as const) {
      const html = bar(path);
      expect(html, path).toContain("sv2-crumb");
      expect(html, path).toContain(`<b>${page}</b>`);
      for (const constant of ["sv2-tuck", "sv2-scope", "sv2-searchopen", "sv2-tbuser"]) {
        expect(html, `${path} ${constant}`).toContain(constant);
      }
    }
  });

  it("⚠️ THE SCOPE still writes scriptally_active_manuscript_id — Packages/Comps/Manuscripts read it", () => {
    // It breaks SILENTLY without this: no error, just the wrong manuscript everywhere.
    const sidebar = readFileSync(resolve(__dirname, "./ShellSidebar.tsx"), "utf8");
    expect(sidebar).toContain('const ACTIVE_MS_KEY = "scriptally_active_manuscript_id"');
    expect(sidebar).toContain("localStorage.setItem(ACTIVE_MS_KEY, id)");
    const shell = readFileSync(resolve(__dirname, "./AppShell.tsx"), "utf8");
    expect(shell).toContain("<ShellScope");
  });
});
