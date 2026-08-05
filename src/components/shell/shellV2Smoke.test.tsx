/**
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
    // THE RAIL'S AVATAR IS RETIRED (canonical shell pack) — the account is in the bar on every
    // page and in the panel foot; the rail's was a third home.
    expect(html).not.toContain("sv2-railav");
  });

  it("panel frame: the head band, with the tuck beside it", () => {
    const html = at("/todo", <ShellSide onCollapse={() => {}} />);
    expect(html).toContain("sv2-ptop");
    expect(html).toContain('aria-label="Hide the panel"'); // the tuck toggle (fixes pack)
    expect(html).toContain("sv2-pbody"); // the contents scroll below the band
    expect(html).not.toContain("sv2-mhrule"); // the masthead rule is gone
  });

  it("THE BRAND APPEARS ONCE — panel on working pages, bar on the dashboard, never both", () => {
    const side = (path: string) => at(path, <ShellSide onCollapse={() => {}} />);
    // working page: the wordmark is in the PANEL and the bar shows the crumb
    for (const path of ["/todo", "/agents", "/queries", "/manuscripts"]) {
      expect(side(path), path).toContain("sv2-pwm");
      expect(side(path), path).toContain("scriptally-title-v2.png");
      expect(side(path), path).not.toContain("sv2-plab"); // no label where the brand is
      expect(bar(path), path).not.toContain("sv2-tbbrand");
      expect(bar(path), path).toContain("sv2-crumb");
    }
    // dashboard: the wordmark is in the BAR and the panel shows the Navigate label
    expect(side("/dashboard")).toContain("sv2-plab");
    expect(side("/dashboard")).toContain("Navigate");
    expect(side("/dashboard")).not.toContain("sv2-pwm");
    expect(side("/dashboard")).not.toContain("scriptally-title-v2.png");
    expect(bar("/dashboard")).toContain("sv2-tbbrand");
    expect(bar("/dashboard")).toContain("scriptally-title-v2.png");
    // exactly ONE brand in the document either way — so the shared id never collides
    for (const path of ["/dashboard", "/agents"]) {
      const both = side(path) + bar(path);
      expect(both.match(/scriptally-brand-logo-root/g), path).toHaveLength(1);
    }
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

  const panel = () =>
    at("/queries", <ShellSidebarBody onNavigate={() => {}} onNavigatePath={() => {}} openSection="querying" onToggleSection={() => {}} />);

  it("panel contents: accordion (Dashboard flat, the CONTROLLED open section renders open)", () => {
    // The accordion's open section is OWNED BY AppShell (rail-icon-toggle pack) — the sidebar
    // is controlled; here we pass the section AppShell would derive for /queries.
    const html = panel();
    expect(html).toContain("sv2-asec sv2-flat");
    for (const lb of ["Dashboard", "Querying", "Agents", "Shelf"]) expect(html).toContain(lb);
    expect(html).toContain("sv2-akids open");
    expect(html).toContain("Queries Hub");
    expect(html).toContain("sv2-akid on"); // /queries is the active child (pink fill only)
  });

  it("THE NOTIFICATION IS GONE ENTIRELY — urgency is one dot beside the To-do count", () => {
    const html = panel();
    // Not restyled, not relocated: removed. (It replaced the Urgent/House pills earlier the same
    // day; the canonical pack removes the whole block, and both are asserted gone here.)
    expect(html).not.toContain("sv2-notif");
    expect(html).not.toContain("Nothing needs you today");
    expect(html).not.toContain("require your attention");
    expect(html).not.toContain("sv2-tpill");
    expect(html).not.toContain("sv2-pip");
    // the dot's home is the nav row; the empty fixture desk has nothing urgent, so none renders
    expect(html).not.toContain("sv2-akdot");
    const body = readFileSync(resolve(__dirname, "./ShellSidebar.tsx"), "utf8");
    expect(body).toContain('page.key === "todo" && tiles.urgent > 0');
  });

  it("SETTINGS is in the panel foot AND stays a rail rib — it must survive the collapse", () => {
    expect(panel()).toContain("sv2-frow2");
    expect(panel()).toContain("Settings");
    // the rail keeps its own, because the rail IS the collapsed state
    expect(at("/queries", <ShellRail onNavigatePath={() => {}} />)).toContain('title="Setup"');
  });

  it("QUICK ACTIONS: two controls, and all FOUR old tile contracts survive", () => {
    const html = panel();
    // the two buttons, with real labels rather than unlabelled icons
    expect(html).toContain("sv2-b1");
    expect(html).toContain("New");
    expect(html).toContain("sv2-b2");
    expect(html).toContain("Record a response"); // PROMOTED to its own button
    // the four-tile strip is gone
    expect(html).not.toContain("sv2-strip4");
    expect(html).not.toContain("sv2-gcap");
    // ...and the three creates live in the popover, which the source dispatches to the SAME
    // capture contracts (the popover itself is closed at rest, so assert the source).
    const body = readFileSync(resolve(__dirname, "./ShellSidebar.tsx"), "utf8");
    for (const c of ['invokeCapture("query"', 'invokeCapture("agent"', 'invokeCapture("record"']) {
      expect(body, c).toContain(c);
    }
    expect(body).toContain('onNavigate("manuscripts", "Add a manuscript")');
    // no shortcut registry exists, so no key hint may be advertised
    expect(html).not.toContain("⌘L");
    expect(html).not.toContain("⌘N");
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
    // ...and it ALSO renders at the panel's foot. Approved duplication, asserted so it is not
    // "tidied away" by someone who spots it later.
    expect(panel()).toContain("sv2-usr");
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

  it("THE PRO UPSELL IS FOLDED INTO THE PLAN LINE — no row, no pill, no fill", () => {
    const html = panel();
    expect(html).toContain("Nick Physick");
    expect(html).toContain("Free plan");
    expect(html).toContain("sv2-uplink"); // a plain slate link, in the plan line
    expect(html).toContain("Upgrade");
    // the standalone row and its badge are retired (treatment 1, not treatment 2)
    expect(html).not.toContain("sv2-upg\"");
    expect(html).not.toContain("sv2-propill");
    expect(html).not.toContain("Upgrade to Pro");
    expect(html).not.toContain("sv2-iconbtn"); // the account row carries no utility buttons
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
