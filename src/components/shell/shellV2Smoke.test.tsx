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

import { FLYOUT_SECTIONS, ShellFlyout, ShellSide, ShellTopBar } from "./ShellV2";
import { ShellSidebarBody } from "./ShellSidebar";

const at = (path: string, node: React.ReactNode) =>
  renderToStaticMarkup(<MemoryRouter initialEntries={[path]}>{node}</MemoryRouter>);

describe("v2 shell — smoke renders", () => {
  // ONE SIDEBAR (one-sidebar pack): the rail and panel capsules merged. `sidebar()` renders the
  // merged capsule exactly as AppShell mounts it — ShellSide owns the flyouts and hands each row
  // its hooks; ShellSidebarBody renders the rows.
  const sidebar = (path: string, collapsed: boolean) =>
    at(path, (
      <ShellSide collapsed={collapsed} onNavigatePath={() => {}} onExpand={() => {}}>
        {(ribProps) => (
          <ShellSidebarBody onNavigate={() => {}} onNavigatePath={() => {}} openSection="querying" collapsed={collapsed} ribProps={ribProps} />
        )}
      </ShellSide>
    ));

  it("ONE capsule, not two: the rail element is gone and the sidebar is a single aside", () => {
    const html = sidebar("/queries", false);
    expect(html).toContain("sv2-side sv2-cap");
    expect(html).not.toContain("sv2-rail"); // the second capsule is retired
    const css = readFileSync(resolve(__dirname, "./shellV2.css"), "utf8");
    expect(css).not.toContain(".sv2-rail {");
    // the two widths + tones ride the container class, transitioning together
    expect(css).toMatch(/\.sv2-side \{[^}]*width: 280px/s);
    expect(css).toMatch(/\.sv2-side \{[^}]*background-color: var\(--shell-side\)/s);
    expect(css).toMatch(/\.sv2-collapsed \.sv2-side \{ width: 62px; background-color: var\(--shell-rail\); \}/);
    expect(css).toMatch(/\.sv2-side \{[^}]*transition: width 0\.28s cubic-bezier\(0\.4, 0, 0\.2, 1\), background-color 0\.28s ease/s);
    // NO SPINE, no tinted gutter, no divider
    expect(css).not.toContain(".sv2-side::before");
  });

  it("EVERY row is the same shape — a 48px glyph cell then a label region; collapsing hides labels ONLY", () => {
    const css = readFileSync(resolve(__dirname, "./shellV2.css"), "utf8");
    expect(css).toMatch(/\.sv2-g \{ width: 48px/);
    expect(css).toMatch(/\.sv2-row \{[^}]*height: 42px; margin: 0 7px 2px;[^}]*border-radius: 11px/s);
    expect(css).toMatch(/\.sv2-row\.tall \{ height: 50px; \}/);
    expect(css).toContain(".sv2-collapsed .sv2-l { display: none; }"); // the label region, and…
    expect(css).toContain(".sv2-collapsed .drop { display: none; }"); // …the non-surviving rows
    // the glyph cell is never repositioned or swapped between states
    expect(css).not.toMatch(/\.sv2-collapsed[^\n]*\.sv2-g \{/);
  });

  it("the SAME glyph set renders in both states for the surviving rows — nothing moves", () => {
    const expanded = sidebar("/queries", false);
    const collapsed = sidebar("/queries", true);
    const glyphCells = (html: string) => (html.match(/class="sv2-g"/g) ?? []).length;
    // every row in both renders carries its glyph cell (the drops are hidden by CSS, not unmounted)
    expect(glyphCells(collapsed)).toBe(glyphCells(expanded));
    for (const lb of ["Dashboard", "Querying", "Agents", "Shelf", ">Settings<"]) {
      expect(expanded).toContain(lb);
      expect(collapsed).toContain(lb); // the label text is present but CSS-hidden — never re-rendered
    }
  });

  it("collapse keeps nav, Settings and the avatar; brand, Working-on, manuscript, divider, New and Pro all `drop`", () => {
    const html = sidebar("/queries", true);
    // the survivors carry no drop class…
    expect(html).toContain("sv2-av"); // the user avatar
    expect(html).toContain(">Settings<"); // its OWN row now (it must survive collapse)
    // …and every dropped item is marked
    for (const marked of ["sv2-row sv2-brand drop", "sv2-slab drop", "sv2-hr drop"]) expect(html).toContain(marked);
    expect(html).toMatch(/sv2-popwrap drop/); // New
    expect(html).toMatch(/sv2-row pro tall drop/); // Upgrade to Pro
    // Settings is no longer a gear inside the user row
    expect(html).not.toContain('aria-label="Settings"');
  });

  it("the ORDER, top to bottom (Baked 4) — the manuscript switcher sits at the BOTTOM, no task-count line", () => {
    const html = sidebar("/queries", false);
    const idx = (needle: string) => html.indexOf(needle);
    expect(idx("sv2-brand")).toBeLessThan(idx("Dashboard"));
    expect(idx("Dashboard")).toBeLessThan(idx("Querying"));
    expect(idx("Querying")).toBeLessThan(idx("Agents"));
    expect(idx("Agents")).toBeLessThan(idx("Shelf"));
    expect(idx("Shelf")).toBeLessThan(idx("sv2-gap"));
    expect(idx("sv2-gap")).toBeLessThan(idx("Working on"));
    expect(idx("Working on")).toBeLessThan(idx("sv2-hr"));
    expect(idx("sv2-hr")).toBeLessThan(idx(">New<"));
    expect(idx(">New<")).toBeLessThan(idx(">Settings<"));
    expect(idx(">Settings<")).toBeLessThan(idx("sv2-av"));
    // the task-count one-liner is NOT included (baked)
    expect(html).not.toContain("sv2-tpill");
    expect(html).not.toContain("sv2-strip4"); // the four-tile strip became the New popover
  });

  it("the CREATE popover: kicker, four capture rows with a divider, ⌘L/⌘R hints", () => {
    const html = sidebar("/queries", false);
    expect(html).toContain("sv2-pop");
    expect(html).toContain("Create"); // the mono kicker
    for (const lb of ["Log a query", "Record a response", "Add an agent", "Add a manuscript"]) expect(html).toContain(lb);
    expect(html).toContain("⌘L");
    expect(html).toContain("⌘R");
    expect(html).toContain("sv2-pdiv"); // the hairline between the two pairs
    const css = readFileSync(resolve(__dirname, "./shellV2.css"), "utf8");
    expect(css).toMatch(/\.sv2-pop \{[^}]*background: var\(--shell-canvas\)/s); // content-capsule surface
    expect(css).toMatch(/\.sv2-pop \{[^}]*border-radius: 15px/s);
    expect(css).toMatch(/\.sv2-pop \{[^}]*box-shadow: 0 16px 40px rgba\(58, 28, 20, 0\.18\)/s);
    expect(css).toMatch(/\.sv2-pop \{[^}]*bottom: calc\(100% \+ 6px\)/s); // opens UPWARD
  });

  it("rail flyouts (flyouts pack): hover targets on the four sections while collapsed — never Dashboard, none expanded", () => {
    expect([...FLYOUT_SECTIONS]).toEqual(["querying", "agents", "shelf", "setup"]); // Dashboard absent (baked)
    const collapsed = sidebar("/queries", true);
    for (const key of FLYOUT_SECTIONS) expect(collapsed).toContain(`data-fly="${key}"`);
    expect(collapsed).not.toContain('data-fly="dashboard"');
    const expanded = sidebar("/queries", false);
    expect(expanded).not.toContain("data-fly");
    expect(expanded).not.toContain("sv2-fly"); // flyouts render only while collapsed (and on hover)
    // they anchor off the MERGED capsule's 62px width now
    const css = readFileSync(resolve(__dirname, "./shellV2.css"), "utf8");
    expect(css).toContain("left: calc(var(--shell-cap-gap) + 62px + 12px)");
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

  it("top bar: crumb left, search right, nothing else (the save-state chip is removed)", () => {
    const html = at("/manuscripts", <ShellTopBar routeKey="manuscripts" searchQuery="" setSearchQuery={() => {}} onNavigate={() => {}} />);
    expect(html).toContain("sv2-topbar");
    expect(html).toContain("Shelf"); // crumb section
    expect(html).toContain("Manuscripts"); // crumb page (bold current)
    expect(html).not.toContain("All changes saved"); // fixes pack Phase 4
    expect(html).not.toContain("sv2-state");
    expect(html).toContain("nav-search-field"); // the real NavSearch, not a fork
  });

  describe("the dashboard crumb slot (tone/crumb pack) — brand when the panel is gone", () => {
    const bar = (path: string, collapsed: boolean) =>
      at(path, <ShellTopBar routeKey={path === "/dashboard" ? "dashboard" : "manuscripts"} searchQuery="" setSearchQuery={() => {}} onNavigate={() => {}} collapsed={collapsed} />);

    it("dashboard + COLLAPSED renders the brand mark with its accessible name — the panel's own artwork", () => {
      const html = bar("/dashboard", true);
      expect(html).toContain("sv2-crumbmark");
      expect(html).toContain('alt="ScriptAlly"');
      expect(html).toContain("/scriptally-title-v2.png"); // the same asset the panel uses
      expect(html).not.toContain("Your dashboard");
    });

    it("dashboard + EXPANDED renders the text, styled as the crumb", () => {
      const html = bar("/dashboard", false);
      expect(html).toContain("sv2-crumb");
      expect(html).toContain("Your dashboard");
      expect(html).not.toContain("sv2-crumbmark");
      expect(html).not.toContain('alt="ScriptAlly"');
    });

    it("a NON-dashboard page keeps its normal crumb in BOTH states — no brand mark, no change", () => {
      for (const collapsed of [true, false]) {
        const html = bar("/manuscripts", collapsed);
        expect(html).toContain("Shelf");
        expect(html).toContain("Manuscripts");
        expect(html).not.toContain("sv2-crumbmark");
        expect(html).not.toContain("Your dashboard");
      }
    });
  });
});
