/**
 * jsdom/static smoke render for the v2 shell chrome — structure and classes only (layout is a
 * browser check, per the pack's jsdom limits). The point: the chrome is auth-gated in the app,
 * so a runtime crash in these components would otherwise hide until Nick signs in. The db hook
 * is mocked with an empty-but-complete state; effects don't run under renderToStaticMarkup, so
 * this exercises the pure render paths (hooks, derivations, mapping) end to end.
 */
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { readFileSync } from "node:fs";
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

import { FLYOUT_SECTIONS, ShellFlyout, ShellRail, ShellSide, ShellTopBar } from "./ShellV2";
import { ShellSidebarBody } from "./ShellSidebar";

const at = (path: string, node: React.ReactNode) =>
  renderToStaticMarkup(<MemoryRouter initialEntries={[path]}>{node}</MemoryRouter>);

describe("v2 shell — smoke renders", () => {
  it("rail capsule: Dashboard + three section ribs + Setup + the avatar; pink active, no captions, no tongue", () => {
    const html = at("/queries", <ShellRail onNavigatePath={() => {}} />);
    expect(html).toContain("sv2-rail sv2-cap");
    for (const tip of ["Dashboard", "Querying", "Agents", "Shelf", "Setup"]) expect(html).toContain(`title="${tip}"`);
    expect(html).toContain("sv2-rib on");
    expect(html).not.toContain("sv2-railbtn"); // captioned buttons + the tab tongue are retired
    expect(html).toContain("sv2-railav"); // the rail-foot account chip
  });

  it("panel frame: the real wordmark artwork, large and centred, with the tuck toggle beside it", () => {
    const html = at("/todo", <ShellSide onCollapse={() => {}} />);
    expect(html).toContain("sv2-wm");
    expect(html).toContain("scriptally-title-v2.png"); // the brand asset, not Playfair text
    expect(html).toContain('alt="ScriptAlly"');
    expect(html).toContain('aria-label="Hide the panel"'); // the tuck toggle (fixes pack)
    expect(html).not.toContain("sv2-mhrule"); // the masthead rule is gone
    expect(html).not.toContain("week one"); // the kicker (weekOfQuerying) left the panel
  });

  it("panel collapse: the dedicated expand control is RETIRED (rail-section-select P2); the tuck + flyout footer carry the affordances", () => {
    const collapsed = at("/queries", <ShellRail onNavigatePath={() => {}} collapsed onExpand={() => {}} />);
    expect(collapsed).not.toContain("sv2-railtuck"); // the expand button is gone
    expect(collapsed).not.toContain('aria-label="Show the panel"');
    // the panel's tuck control stays (asserted in the panel-frame test: "Hide the panel"), and
    // the flyout footer's "Expand sidebar · ⌘\" stays (asserted in the flyout test) — both are
    // now load-bearing. The hide itself is still the container-class CSS transition:
    const css = readFileSync(resolve(__dirname, "./shellV2.css"), "utf8");
    expect(css).toMatch(/\.sv2-collapsed \.sv2-side \{[^}]*width: 0/s);
    expect(css).toMatch(/\.sv2-collapsed \.sv2-side \{[^}]*margin-left: calc\(-1 \* var\(--shell-cap-gap\)\)/s);
    expect(css).not.toContain(".sv2-railtuck {"); // its styles went with it
  });

  it("rail flyouts (flyouts pack): hover targets on the four sections while collapsed — never Dashboard, none expanded", () => {
    expect([...FLYOUT_SECTIONS]).toEqual(["querying", "agents", "shelf", "setup"]); // Dashboard absent (baked)
    const collapsed = at("/queries", <ShellRail onNavigatePath={() => {}} collapsed onExpand={() => {}} />);
    for (const key of FLYOUT_SECTIONS) expect(collapsed).toContain(`data-fly="${key}"`);
    expect(collapsed).not.toContain('data-fly="dashboard"');
    const expanded = at("/queries", <ShellRail onNavigatePath={() => {}} collapsed={false} />);
    expect(expanded).not.toContain("data-fly");
    expect(expanded).not.toContain("sv2-fly"); // flyouts render only while collapsed (and on hover)
  });

  it("the flyout capsule: kicker, page rows with counts, active row on the GROUND fill, the Expand footer", () => {
    const rows = [
      { key: "queries-hub", label: "Queries Hub", icon: <span />, count: 20, active: true, onClick: () => {} },
      { key: "todo", label: "To-do", icon: <span />, count: 44, active: false, onClick: () => {} },
    ];
    const html = renderToStaticMarkup(
      <ShellFlyout kicker="Querying" rows={rows} onExpand={() => {}} top={80} show onMouseEnter={() => {}} onMouseLeave={() => {}} />
    );
    expect(html).toContain("sv2-fly show");
    expect(html).toContain("Querying"); // the mono kicker
    expect(html).toContain("Queries Hub");
    expect(html).toContain(">20<"); // the mono count
    expect(html).toContain("sv2-frow on"); // the active row class…
    expect(html).toContain("Expand sidebar");
    expect(html).toContain("⌘\\");
    // …whose fill is the GROUND (the nav law), locked at the rule text:
    const css = readFileSync(resolve(__dirname, "./shellV2.css"), "utf8");
    expect(css).toMatch(/\.sv2-frow\.on \{ background: var\(--shell-ground\)/);
  });

  it("panel contents: accordion (Dashboard flat, the CONTROLLED open section renders open), pills, action strip, upgrade row, user block", () => {
    // The accordion's open section is OWNED BY AppShell (rail-icon-toggle pack) — the sidebar
    // is controlled; here we pass the section AppShell would derive for /queries.
    const html = at("/queries", <ShellSidebarBody onNavigate={() => {}} onNavigatePath={() => {}} openSection="querying" onToggleSection={() => {}} />);
    // the accordion — Dashboard flat + the three sections; the controlled section renders open
    expect(html).toContain("sv2-asec sv2-flat");
    for (const lb of ["Dashboard", "Querying", "Agents", "Shelf"]) expect(html).toContain(lb);
    expect(html).toContain("sv2-akids open");
    expect(html).toContain("Queries Hub");
    expect(html).toContain("sv2-akid on"); // /queries is the active child (pink fill only)
    // the two task pills (empty desk → zeros, still rendered)
    expect(html).toContain("sv2-tpill");
    expect(html).toContain("Urgent");
    expect(html).toContain("House");
    // the four capture tiles carry their tooltips
    for (const lb of ["Log query", "Record response", "Add agent", "Add manuscript"]) expect(html).toContain(`title="${lb}"`);
    // Free plan → the upgrade row with the capsule copy; the user block beneath (no utility buttons)
    expect(html).toContain("Upgrade to Pro");
    expect(html).toContain("sv2-propill");
    expect(html).toContain("Nick Physick");
    expect(html).toContain("Free plan");
    expect(html).not.toContain("sv2-iconbtn"); // the user block carries no utility buttons now
  });

  const bar = (path: string) =>
    at(path, <ShellTopBar routeKey="x" searchQuery="" setSearchQuery={() => {}} onNavigate={() => {}} scope={<span className="sv2-scope" />} onHelp={() => {}} />);

  it("WORKING PAGES: breadcrumb · divider · scope · grow · tools(search · help)", () => {
    const html = bar("/manuscripts");
    expect(html).toContain("sv2-topbar");
    expect(html).toContain("sv2-crumb");
    expect(html).toContain("Shelf"); // the section
    expect(html).toContain("<b>Manuscripts</b>"); // the current page, bold and inert
    expect(html).toContain("sv2-scope");
    expect(html).toContain("nav-search-field"); // the real NavSearch, not a fork
    expect(html).toContain("sv2-gsearch-r"); // the right-hand placement
    expect(html).toContain("sv2-tbicon"); // help, chrome rather than a floating FAB
    // the wordmark belongs to the dashboard alone
    expect(html).not.toContain("sv2-tbbrand");
    expect(html.indexOf("sv2-crumb")).toBeLessThan(html.indexOf("sv2-scope"));
    expect(html.indexOf("sv2-scope")).toBeLessThan(html.indexOf("nav-search-field"));
    expect(html.indexOf("nav-search-field")).toBeLessThan(html.indexOf("sv2-tbicon"));
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
      for (const constant of ["sv2-scope", "nav-search-field", "sv2-vr", "sv2-tbicon"]) {
        expect(html, `${path} ${constant}`).toContain(constant);
      }
    }
    // The dashboard-specific rule stays superseded — deleted, not contradicted.
    const claude = readFileSync(resolve(__dirname, "..", "..", "..", "CLAUDE.md"), "utf8");
    expect(claude).not.toContain("brand mark when the panel is collapsed");
  });

  it("the brand's DOM id is set at ONE call site — a duplicate id measures the wrong instance", () => {
    const logo = readFileSync(resolve(__dirname, "..", "ScriptAllyLogo.tsx"), "utf8");
    // the id is a prop, never a constant inside the component
    expect(logo).toContain("id={id}");
    expect(logo).not.toContain('id="scriptally-brand-logo-root"');
    // exactly one mount claims it, and it is the bar's
    const shell = readFileSync(resolve(__dirname, "./ShellV2.tsx"), "utf8");
    expect(shell.match(/id="scriptally-brand-logo-root"/g)).toHaveLength(1);
    expect(bar("/dashboard")).toContain('id="scriptally-brand-logo-root"');
  });
});
