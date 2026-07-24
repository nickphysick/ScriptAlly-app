/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE HARDBACK SPINE (design-refs/spine-shell.html = todo-fix54): source/rule-text locks over
 * the rebuilt TodoShell — the ink rail, the parchment panel, and the bar joining the panel as
 * one cream L. Supersedes the single-column workspace-shell suite. jsdom mounts nothing; the
 * pixels are Nick's in-browser list (the page is auth-gated).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const here = __dirname;
const page = readFileSync(join(here, "ToDoPage.tsx"), "utf8");
const tsh = readFileSync(join(here, "..", "shell", "TodoShell.tsx"), "utf8");
const tshCss = readFileSync(join(here, "..", "shell", "todoShell.css"), "utf8");
const hub = readFileSync(join(here, "..", "shell", "HubHeaderBar.tsx"), "utf8");
const rule = (sel: string): string => {
  const m = tshCss.match(new RegExp("(?:^|\\n)" + sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*\\{([^}]*)\\}"));
  if (!m) throw new Error(`rule not found: ${sel}`);
  return m[1];
};

describe("spine P1 — the ink rail", () => {
  it("geometry: 54px wide, full height, owning the top-left corner (first in the flex row)", () => {
    const r = rule(".spine-rail");
    expect(r).toContain("width: var(--spine-rail-w)");
    expect(rule(".spine-root")).toContain("--spine-rail-w: 54px");
    expect(r).toContain("flex: 0 0 auto");
    expect(r).toContain("flex-direction: column");
    // the rail renders FIRST — beside everything, incl. the bar (which lives in .tsh-mainwrap)
    expect(tsh.indexOf('className="spine-rail"')).toBeLessThan(tsh.indexOf('className="spine-panel"'));
    expect(tsh.indexOf('className="spine-panel"')).toBeLessThan(tsh.indexOf('className="tsh-mainwrap"'));
    expect(rule(".spine-root")).toContain("height: 100%"); // full height
  });
  it("material: ink #2a1a13, right rule #1d100c", () => {
    const root = rule(".spine-root");
    expect(root).toContain("--spine-rail-bg: #2a1a13");
    expect(root).toContain("--spine-rail-rule: #1d100c");
    expect(rule(".spine-rail")).toContain("background: var(--spine-rail-bg)");
    expect(rule(".spine-rail")).toContain("border-right: 1px solid var(--spine-rail-rule)");
  });
  it("the real logo mark sits at the rail's head, above navigation (no recreation)", () => {
    const railBlock = tsh.slice(tsh.indexOf('className="spine-rail"'), tsh.indexOf('className="spine-panel"'));
    expect(railBlock).toContain('src="/scriptally-logo-new.png"'); // the real asset
    expect(railBlock.indexOf("spine-logo")).toBeLessThan(railBlock.indexOf("spine-railnav")); // above the nav
    expect(railBlock).not.toContain("<svg"); // the mark is the image, never an inline recreation
  });
  it("the categories are icon buttons; Settings at the foot; active = the ink square (never burgundy)", () => {
    const order = ['label: "Dashboard"', 'label: "Querying"', 'label: "Agents"', 'label: "Manuscripts"'];
    let last = -1;
    for (const l of order) { const i = page.indexOf(l); expect(i).toBeGreaterThan(last); last = i; }
    expect(page).toContain('railFoot={railSettings}'); // Settings at the rail foot
    expect(page).toContain('key: "settings", label: "Settings"');
    const on = rule(".spine-rli.on");
    expect(on).toContain("background: var(--spine-ron)"); // #4a3226 square
    expect(on).toContain("color: var(--spine-ricon-on)"); // cream #f3e7da
    expect(rule(".spine-root")).toContain("--spine-ron: #4a3226");
    expect(rule(".spine-root")).toContain("--spine-ricon-on: #f3e7da");
    expect(rule(".spine-root")).toContain("--spine-ricon: #a8917f"); // idle
    for (const burgundy of ["#7c3a2a", "#f5c7c2"]) { expect(on).not.toContain(burgundy); expect(rule(".spine-rli")).not.toContain(burgundy); }
  });
  it("category routing: each routes to its category's default page; the rail reflects the route", () => {
    expect(page).toContain('label: "Querying", icon: <Send size={16} />, onClick: () => onNavigate("queries"), active: true'); // To-do is under Querying
    expect(page).toContain('label: "Agents", icon: <Users size={16} />, onClick: () => onNavigate("agents")');
    expect(page).toContain('label: "Manuscripts", icon: <Book size={16} />, onClick: () => onNavigate("manuscripts")');
    expect(page).toContain('label: "Dashboard", icon: <LayoutGrid size={16} />, onClick: () => onNavigate("dashboard")');
    // exactly one category is active (the current route's)
    expect((page.match(/active: true/g) ?? []).length).toBeGreaterThanOrEqual(1);
  });
  it("each rail icon: tooltip, aria-label, and aria-current on the active category", () => {
    expect(tsh).toContain("title={c.label}");
    expect(tsh).toContain("aria-label={c.label}");
    expect(tsh).toContain('aria-current={c.active ? "page" : undefined}');
  });
});

describe("spine P2 — the parchment panel", () => {
  it("geometry/material: ~196px, full height beside the rail, parchment #f5f0e8, right rule #e0d6c6", () => {
    const p = rule(".spine-panel");
    expect(p).toContain("width: var(--spine-panel-w)");
    expect(rule(".spine-root")).toContain("--spine-panel-w: 196px");
    expect(p).toContain("background: var(--spine-pan)");
    expect(p).toContain("border-right: 1px solid var(--spine-pbd)");
    expect(rule(".spine-root")).toContain("--spine-pan: #f5f0e8");
    expect(rule(".spine-root")).toContain("--spine-pbd: #e0d6c6");
  });
  it("the wordmark image sits at the panel's head (the rail carries the mark, the panel the name)", () => {
    const panelBlock = tsh.slice(tsh.indexOf('className="spine-panel"'), tsh.indexOf('className="tsh-mainwrap"'));
    expect(panelBlock.indexOf("ScriptAllyLogo")).toBeGreaterThan(-1); // the real wordmark component
    expect(panelBlock.indexOf("spine-word")).toBeLessThan(panelBlock.indexOf("spine-cat")); // at the head
    expect(tsh).toContain("import { ScriptAllyLogo }");
  });
  it("category zone: a mono label + the category's pages (icon + label + count)", () => {
    expect(page).toContain('panelCategory="QUERYING"');
    expect(tsh).toContain('<div className="spine-cat"');
    // Querying's pages, with derived counts
    expect(page).toContain('label: "Queries Hub", icon: <Send size={14} />, count: liveQueryCount(queries)');
    expect(page).toContain('label: "To-do", icon: <ListTodo size={14} />, count: boardCards.length, onClick: () => onNavigate("todo"), active: true');
    expect(tsh).toContain('{typeof pg.count === "number" && <span className="spine-n">{pg.count}</span>}');
  });
  it("context zone: a ruled mono label naming the page, then the migrated filter rows (To-do only)", () => {
    expect(page).toContain('contextLabel="TO-DO · FILTERS"');
    expect(page).toContain("contextContent={renderFilterSection()}");
    expect(tsh).toContain('<div className="spine-nk"'); // the ruled label
    expect(tsh).toContain('<div className="spine-ctx">{contextContent}</div>');
    expect(rule(".spine-nk")).toContain("border-bottom: 1px solid var(--spine-prule)"); // the rule
    // the filter section's reactive behaviour rides along, unchanged
    expect(page).toContain('className="tdb-fq tsh-fq"'); // the query chip
    expect(page).toContain("fnFace(shownY, searchTotal ?? shownY)"); // the struck totals
    expect(page).toContain('railPill("Offers", "offers", fc.offers, "p")');
    // context renders ONLY when a label is given (pages without context end after their list)
    expect(tsh).toContain("{contextLabel && (");
    // the migrated filter rows sit flush in the context zone, on the panel's warm tokens
    expect(rule(".spine-ctx .tdb-fpill")).toContain("height: 32px");
    expect(rule(".spine-ctx .tdb-fpill")).toContain("color: var(--spine-ptx)");
    expect(rule(".spine-ctx .tdb-fpill .tdb-fn")).toContain("color: var(--spine-pmut)");
  });
  it("the panel active law: the warm parchment fill ONLY (no border/shadow/outline; never burgundy)", () => {
    const on = rule(".spine-ni.on");
    expect(on).toContain("background: var(--spine-pon)");
    expect(on).not.toContain("border");
    expect(on).not.toContain("box-shadow");
    expect(on).not.toContain("outline");
    expect(rule(".spine-root")).toContain("--spine-pon: #e6ddcf");
    expect(rule(".spine-root")).toContain("--spine-phov: #ece5d9");
    for (const burgundy of ["#7c3a2a", "#f5c7c2", "#f3e3dc"]) expect(on).not.toContain(burgundy);
  });
  it("the foot carries the utility rows (Task settings + Help centre, same wiring)", () => {
    expect(page).toContain('label: "Task settings", icon: <SettingsIcon size={14} />, onClick: () => setSettingsOpen(true)');
    expect(page).toContain('label: "Help centre"');
    expect(tsh).toContain('<div className="spine-panelfoot">');
    expect(tsh).toContain("{foot.map(");
  });
});

describe("spine P3 — the bar joins the page", () => {
  it("the bar spans only the content region (inside .tsh-mainwrap, right of the panel)", () => {
    expect(tsh.indexOf('className="tsh-bcbar"')).toBeGreaterThan(tsh.indexOf('className="spine-panel"'));
    expect(tsh.indexOf('className="tsh-mainwrap"')).toBeLessThan(tsh.indexOf('className="tsh-bcbar"'));
  });
  it("the bar wears the PANEL's parchment + rule, so bar + panel read as one cream L", () => {
    const bar = rule(".tsh-bcbar");
    expect(bar).toContain("background: var(--spine-pan)"); // the same fill as the panel
    expect(bar).toContain("border-bottom: 1px solid var(--spine-pbd)"); // the same rule tone
    expect(rule(".spine-panel")).toContain("border-right: 1px solid var(--spine-pbd)"); // the shared rule
  });
  it("bar anatomy: breadcrumb + user (the search lives in the panel-header seat)", () => {
    expect(page).toContain('crumbCurrent="To-do"');
    expect(tsh).toContain("<b>{crumbCurrent}</b>");
    expect(tsh).toContain("<F12Account");
    expect(tsh).not.toContain("tsh-search"); // the search is not in the bar
    expect(page).toContain('<span className="tdb-hsearch">'); // it is the panel-header pill
  });
  it("the L is seamless: the bar's fill + rule are the SAME tokens as the panel's (not lookalikes)", () => {
    // the panel's right rule and the bar's bottom rule read the one --spine-pbd; both fills the
    // one --spine-pan — so the corner has no seam, and a retone moves both together
    expect(rule(".tsh-bcbar")).toContain("background: var(--spine-pan)");
    expect(rule(".spine-panel")).toContain("background: var(--spine-pan)");
    expect(rule(".tsh-bcbar")).toContain("border-bottom: 1px solid var(--spine-pbd)");
    expect(rule(".spine-panel")).toContain("border-right: 1px solid var(--spine-pbd)");
    // the content body below the bar is NOT parchment — the L is just the panel + bar
    expect(rule(".tsh-body")).not.toContain("var(--spine-pan)");
  });
  it("HubHeaderBar source is UNTOUCHED (the wrapper approach — the shell paints its own bar)", () => {
    for (const mine of ["spine-", "TodoShell", "todo-fix54", "hardback", "tsh-"]) expect(hub).not.toContain(mine);
    // the wrapper approach: the To-do bar is the shell's own .tsh-bcbar, never HubHeaderBar
    expect(page).not.toContain("HubHeaderBar");
    expect(hub).toContain("export const HubHeaderBar"); // its own grammar, intact
    expect(hub).toContain("qhbar");
  });
});

describe("spine P4 — session + width tiers", () => {
  it("the RAIL persists through the session; only the PANEL slides off left and returns", () => {
    expect(page).toContain("clearing={heroSession.clearing}");
    expect(tsh).toContain('${clearing ? " spine-clearing" : ""}');
    // in session the panel leaves the FLOW (absolute) so the content region reclaims its width —
    // the curtains + centred column recompute against the region right of the RAIL — then slides
    expect(rule(".spine-clearing .spine-panel")).toContain("position: absolute");
    expect(rule(".spine-clearing .spine-panel")).toContain("transform: translateX(-100%)");
    expect(rule(".spine-root")).toContain("position: relative"); // the absolute panel's context
    expect(tshCss).not.toContain(".spine-clearing .spine-rail"); // the rail stays (chrome)
    const stage = readFileSync(join(here, "..", "..", "lib", "sessionStage.ts"), "utf8");
    expect(stage).toContain('export const EXIT_LEFT = ".spine-panel"'); // the panel is the mover now
  });
  it("width tiers: below --tsh-collapse the panel collapses to a rail-triggered overlay; no hamburger", () => {
    expect(rule(".spine-root")).toContain("--tsh-collapse: 1100px");
    expect(tshCss).toContain("@media (max-width: 1099.98px) {");
    const collapse = tshCss.slice(tshCss.indexOf("@media (max-width: 1099.98px)"));
    expect(collapse).toContain("position: fixed"); // the panel becomes an overlay
    expect(collapse).toContain(".spine-panelopen .spine-panel { transform: translateX(0); }");
    expect(tshCss).toContain(".spine-scrim"); // the scrim
    expect(tsh).toContain("onClick={onPanelDismiss}"); // dismiss on outside click
    // the TRIGGER: when collapsed, tapping the active rail category opens the panel overlay
    expect(tsh).toContain("onClick={collapsed && c.active && onPanelOpen ? onPanelOpen : c.onClick}");
    expect(page).toContain("onPanelOpen={() => setPanelOpen(true)}");
    expect(page).toContain('if (e.key === "Escape") { e.stopPropagation(); setPanelOpen(false); }'); // Esc dismiss
    expect(page).not.toContain("hamburger");
    // the rail remains at every tier (never hidden by the collapse media)
    expect(collapse).not.toContain(".spine-rail { display: none");
  });
});

describe("spine — the search (panel header) + the brand, carried from the centring pack", () => {
  it("the search is the panel-header pill; the ⌘K target + handler preserved", () => {
    expect(page).toContain('<span className="tdb-hsearch">');
    expect(page).toContain("ref={searchRef}");
    expect(page).toContain('e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)');
  });
  it("the brand assets are the real files, relocated: mark → rail, wordmark → panel", () => {
    expect(tsh).toContain('src="/scriptally-logo-new.png"');
    expect(tsh).toContain("<ScriptAllyLogo heightPx={30} />");
    expect(tsh).toContain('aria-label="ScriptAlly — go to dashboard"');
    expect(page).toContain('onBrand={() => onNavigate("dashboard")}');
  });
});

describe("spine P5 — the sweep", () => {
  it("the single-column sidebar + its collapsed filter-drawer are extinct", () => {
    const css = readFileSync(join(here, "todo.css"), "utf8");
    for (const dead of [".tsh-nav", ".tsh-brand", ".tsh-brandword", ".tsh-ni ", ".tsh-nk", ".tsh-filter"]) {
      expect(tshCss).not.toContain(dead);
    }
    // the old collapsed filter drawer + its band are gone (the panel context zone replaced them)
    for (const dead of ["tdb-fdrawer", "tdb-fdpanel", "tdb-fdscrim", "tdb-rsech", "tdb-fbox"]) {
      expect(css).not.toContain(dead);
      expect(page).not.toContain(dead);
    }
  });
  it("themes.md records the hardback spine as the final shell", () => {
    const themes = readFileSync(join(here, "..", "..", "..", "design-refs", "themes.md"), "utf8");
    expect(themes).toContain("## The hardback spine (settled — the final To-do shell)");
    expect(themes).toContain("THE INK RAIL");
    expect(themes).toContain("THE PARCHMENT PANEL");
    expect(themes).toContain("THE PARCHMENT L");
  });
  it("the tour retargets: the category-rail step + the filters-in-panel step", () => {
    const tour = readFileSync(join(here, "..", "..", "lib", "todoTour.ts"), "utf8");
    expect(tour).toContain('sel: ".spine-rail"'); // the category rail step
    expect(tour).toContain('sel: ".tdb-fpill"'); // filters-in-panel (no .tsh-filtericon)
    expect(tour).not.toContain(".tsh-filtericon");
    for (const sel of [".tdb-herobegin", ".tdb-hsearch", ".tdb-revlink", ".tdb-today2"]) expect(tour).toContain(sel);
  });
});
