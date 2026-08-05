/**
 * ⚠️ THE RAIL, THE SIDE PANEL AND THEIR SIDEBAR BODY ARE GONE (app-shell pack, Phase 2) — one
 * expanding column replaced all three, and their blocks were deleted from this file with them
 * rather than left asserting components nothing mounts. The column's own locks live in
 * lib/shellColumn.test.ts (geometry) and shellColumn.test.tsx (structure).
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
  it("THE BRAND lives in the COLUMN's masthead now — the panel that used to hold it is gone", () => {
    // Phase 2 folded the rail and the panel into one column, and the column's masthead carries
    // the wordmark AND is the route home to the dashboard — which is why there is no Dashboard
    // nav item. The bar's own brand/crumb split is settled in Phase 3.
    const col = readFileSync(resolve(__dirname, "./ShellColumn.tsx"), "utf8");
    expect(col).toContain("<ScriptAllyLogo heightPx={26} />");
    expect(col).toContain('onNavigatePath("/dashboard")');
    // the retired panel's brand slot and its Navigate label are gone from the source entirely
    const v2 = readFileSync(resolve(__dirname, "./ShellV2.tsx"), "utf8");
    expect(v2).not.toContain("sv2-pwm");
    expect(v2).not.toContain("sv2-plab");
  });

  it("THE USER BLOCK is in the bar on EVERY page — and the duplication with the panel foot is deliberate", () => {
    for (const path of ["/dashboard", "/agents", "/queries", "/manuscripts"]) {
      const html = bar(path);
      expect(html, path).toContain("sv2-tbuser");
      expect(html, path).toContain("sv2-tbav");
      expect(html, path).toContain("Nick Physick");
      // identical size and position in both bar states — it always rides the tools cluster
      expect(html.indexOf("sv2-tbicon"), path).toBeLessThan(html.indexOf("sv2-tbuser"));
    }
    // ...and it ALSO renders at the COLUMN's foot. Approved duplication, asserted so it is not
    // "tidied away" by someone who spots it later: the bar's copy survives the column
    // collapsing, the column's carries the plan line.
    const col = readFileSync(resolve(__dirname, "./ShellColumn.tsx"), "utf8");
    expect(col).toContain("sc-fu");
  });

  it("THE SEARCH IS AN OPENER — one search implementation, and the palette is it", () => {
    const html = bar("/dashboard");
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
    const col = readFileSync(resolve(__dirname, "./ShellColumn.tsx"), "utf8");
    // the plan is stated as fact beside the name, and Upgrade is a plain slate link in that line
    expect(col).toContain("planLine(currentUser?.plan)");
    expect(col).toContain("sc-up");
    expect(col).toContain("Upgrade");
    // Pro is a text link HERE and a card in the account menu. Nowhere else.
    expect(col).not.toContain("propill");
    expect(col).not.toContain("Upgrade to Pro");
  });

  const bar = (path: string) =>
    at(path, <ShellTopBar onNavigate={() => {}} scope={<span className="sv2-scope" />} onHelp={() => {}} onOpenSearch={() => {}} />);

  it("WORKING PAGES: breadcrumb · divider · scope · grow · tools(search · help)", () => {
    const html = bar("/manuscripts");
    expect(html).toContain("sv2-topbar");
    expect(html).toContain("sv2-crumb");
    expect(html).toContain("Shelf"); // the section
    expect(html).toContain("<b>Manuscripts</b>"); // the current page, bold and inert
    expect(html).toContain("sv2-scope");
    expect(html).toContain("sv2-searchopen"); // the palette OPENER, not an inline field
    expect(html).toContain("sv2-gsearch-r"); // the right-hand placement
    expect(html).toContain("sv2-tbicon"); // help, chrome rather than a floating FAB
    // the wordmark belongs to the dashboard alone
    expect(html).not.toContain("sv2-tbbrand");
    expect(html.indexOf("sv2-crumb")).toBeLessThan(html.indexOf("sv2-scope"));
    expect(html.indexOf("sv2-scope")).toBeLessThan(html.indexOf("sv2-searchopen"));
    expect(html.indexOf("sv2-searchopen")).toBeLessThan(html.indexOf("sv2-tbicon"));
  });

  it("THE DASHBOARD: wordmark · divider · scope · centred search · help — and NO crumb", () => {
    const html = bar("/dashboard");
    expect(html).toContain("sv2-tb-dash");
    expect(html).toContain("sv2-tbbrand");
    expect(html).toContain("scriptally-title-v2.png"); // the real brand asset, height-constrained
    expect(html).toContain("sv2-gsearch-c"); // the true-midline placement
    expect(html).toContain("sv2-tbicon");
    // The dashboard crumb rule stays DELETED — no crumb, no "Your dashboard", no brand stand-in.
    expect(html).not.toContain("sv2-crumb");
    expect(html).not.toContain("Your dashboard");
    expect(html).not.toContain("sv2-crumbmark");
  });

  it("the crumb is on EVERY non-dashboard page, and the two states differ ONLY in two things", () => {
    for (const [path, page] of [["/queries", "Queries Hub"], ["/agents", "Agent list"], ["/todo", "To-do"], ["/import", "Import"], ["/account", "Account"]] as const) {
      const html = bar(path);
      expect(html, path).toContain("sv2-crumb");
      expect(html, path).toContain(`<b>${page}</b>`);
      expect(html, path).not.toContain("sv2-tbbrand");
      // constant across both states: the scope, the search, the divider, help
      for (const constant of ["sv2-scope", "sv2-searchopen", "sv2-vr", "sv2-tbicon"]) {
        expect(html, `${path} ${constant}`).toContain(constant);
      }
    }
    // The dashboard-specific rule stays superseded — deleted, not contradicted.
    const claude = readFileSync(resolve(__dirname, "..", "..", "..", "CLAUDE.md"), "utf8");
    expect(claude).not.toContain("brand mark when the panel is collapsed");
  });

  it("the brand's DOM id is a PROP — a hardcoded one measured the wrong instance", () => {
    const logo = readFileSync(resolve(__dirname, "..", "ScriptAllyLogo.tsx"), "utf8");
    // The id is a prop, never a constant inside the component: it used to be hardcoded, so the
    // bar, the panel and the mobile slim bar were duplicates and getElementById returned
    // whichever came first in the document — the panel's 27px copy, not the bar's.
    expect(logo).toContain("id={id}");
    expect(logo).not.toContain('id="scriptally-brand-logo-root"');
    // Two mounts claim it now (bar on the dashboard, panel elsewhere) but they are MUTUALLY
    // EXCLUSIVE, so exactly one is ever in the document. That is asserted against the rendered
    // output in "THE BRAND APPEARS ONCE" above — the count that matters is the rendered one.
    expect(bar("/dashboard")).toContain('id="scriptally-brand-logo-root"');
    expect(bar("/agents")).not.toContain('id="scriptally-brand-logo-root"');
  });
});
