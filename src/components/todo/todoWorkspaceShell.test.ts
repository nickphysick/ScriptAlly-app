/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE WORKSPACE SHELL (design-refs/todo-workspace-shell.html = todo-fix48): source/rule-text
 * locks over the shared TodoShell + its parchment chrome, and the ToDoPage wiring that mounts
 * it. jsdom mounts nothing; the browser eyeball is Nick's (the page is auth-gated). This suite
 * guards the frame — the sidebar anatomy, the parchment-only active law, the chrome tokens, the
 * relocated search, the retired hamburger and the collapse tier; the reactive filter behaviour
 * it carries over is locked in todoWorkbench.test.ts.
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

describe("shell P1 — the sidebar: anatomy, sections, counts", () => {
  it("one shared component with the three sections: brand → WORKSPACE → FILTER slot → foot", () => {
    expect(tsh).toContain("export const TodoShell");
    expect(tsh).toContain('<aside className="tsh-nav"');
    expect(tsh).toContain('<div className="tsh-brand">');
    // the two kickers, in order, and the foot after the spacer
    const iWork = tsh.indexOf(">WORKSPACE<");
    const iFilter = tsh.indexOf(">FILTER<");
    const iSpacer = tsh.indexOf('className="tsh-spacer"');
    const iFoot = tsh.indexOf("{foot.map(");
    expect(iWork).toBeGreaterThan(-1);
    expect(iFilter).toBeGreaterThan(iWork);
    expect(iSpacer).toBeGreaterThan(iFilter);
    expect(iFoot).toBeGreaterThan(iSpacer);
    // there is NO REVIEW section and NO CTA in the sidebar
    expect(tsh).not.toContain("REVIEW");
    expect(tsh).not.toContain("Begin focused session");
  });
  it("the WORKSPACE rows are Dashboard · Queries · Agents · To-do · Packages, with derived counts", () => {
    const order = ["Dashboard", "Queries", "Agents", "To-do", "Packages"];
    let last = -1;
    for (const l of order) { const i = page.indexOf(`label: "${l}"`); expect(i).toBeGreaterThan(last); last = i; }
    // the counts: live queries on Queries, the board total on To-do; the rest have none
    expect(page).toContain('label: "Queries", icon: "✉", count: liveQueryCount(queries)');
    expect(page).toContain('label: "To-do", icon: "✓", count: boardCards.length');
    expect(page).toContain("activeKey=\"todo\"");
    // the routes come from the current nav model (onNavigate)
    expect(page).toContain('onClick: () => onNavigate("dashboard")');
    expect(page).toContain('onClick: () => onNavigate("manuscripts", "Submission packages")');
  });
  it("the FILTER section is a page-owned SLOT carrying its reactive rows", () => {
    expect(page).toContain("filterSection={renderFilterSection()}");
    expect(tsh).toContain("{filterSection}"); // the shell renders whatever the page hands it
    // the reactive behaviour rides along: counts, the struck totals (fnFace) and the query chip
    expect(page).toContain('className="tdb-fq tsh-fq"'); // the active-search chip in the section
    expect(page).toContain("fnFace(shownY, searchTotal ?? shownY)"); // the struck old totals
    expect(page).toContain('railPill("Offers", "offers", fc.offers, "p")');
  });
});

describe("shell P1 — the active-state law: the white card, NEVER burgundy", () => {
  it("an active nav item inverts to the soft white card", () => {
    const on = rule(".tsh-ni.on");
    expect(on).toContain("background: var(--tsh-active-bg)");
    expect(on).toContain("border-color: var(--tsh-active-border)");
    expect(on).toContain("color: var(--tsh-active-ink)");
    expect(on).toContain("font-weight: 700");
    expect(rule(".tsh-root")).toContain("--tsh-active-bg: #fdfcfa");
    expect(rule(".tsh-root")).toContain("--tsh-active-border: #e0d6c6");
  });
  it("no burgundy fill anywhere in the nav styles (the law, asserted)", () => {
    for (const burgundy of ["#7c3a2a", "#5d4037", "#f5c7c2", "#f3e3dc", "#f5e2da"]) {
      // the sidebar chrome never wears the burgundy nav-pill fill
      expect(rule(".tsh-ni")).not.toContain(burgundy);
      expect(rule(".tsh-ni.on")).not.toContain(burgundy);
    }
    // the active class is one card treatment shared by nav items and the active filter row
    expect(tsh).toContain('${n.key === activeKey ? " on" : ""}');
  });
});

describe("shell P1 — the parchment chrome: one continuous shell", () => {
  it("the sidebar and the breadcrumb bar share the fill and are joined by matching borders", () => {
    expect(rule(".tsh-root")).toContain("--tsh-chrome: #f2ede7");
    expect(rule(".tsh-root")).toContain("--tsh-chrome-border: #e4dbcd");
    expect(rule(".tsh-nav")).toContain("background: var(--tsh-chrome)");
    expect(rule(".tsh-nav")).toContain("border-right: 1px solid var(--tsh-chrome-border)");
    expect(rule(".tsh-bcbar")).toContain("background: var(--tsh-chrome)");
    expect(rule(".tsh-bcbar")).toContain("border-bottom: 1px solid var(--tsh-chrome-border)");
  });
  it("the breadcrumb keeps its anatomy (QUERYING / To-do) and gains the search as a white pill", () => {
    expect(page).toContain('crumbCurrent="To-do"');
    expect(page).toContain('crumbParents={[{ label: "QUERYING"');
    expect(tsh).toContain("<b>{crumbCurrent}</b>");
    // the search white pill sits in the bar's right region, before the account block
    const iSearch = tsh.indexOf('className="tsh-search"');
    const iAccount = tsh.indexOf("<F12Account");
    expect(iSearch).toBeGreaterThan(-1);
    expect(iAccount).toBeGreaterThan(iSearch);
    expect(rule(".tsh-search")).toContain("background: #fff");
    expect(rule(".tsh-search")).toContain("border: 1px solid var(--tsh-active-border)");
    expect(rule(".tsh-search")).toContain("margin-left: auto");
  });
});

describe("shell P1 — the search relocation + the retired hamburger", () => {
  it("the search moved to the bar, same handler + the ⌘K target preserved", () => {
    expect(page).toContain("searchValue={search}");
    expect(page).toContain("onSearchChange={setSearch}");
    expect(page).toContain("searchRef={searchRef}");
    expect(tsh).toContain("onChange={(e) => onSearchChange(e.target.value)}");
    expect(tsh).toContain("ref={searchRef}");
    expect(page).toContain('e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)'); // ⌘K still lands
    // the old hero search pill is gone from the page
    expect(page).not.toContain("tdb-bigsearch");
  });
  it("the shell draws its own breadcrumb (no CrumbStrip / drawer hamburger on /todo)", () => {
    expect(page).not.toContain("F12Page"); // the To-do route no longer uses the F12 header wrapper
    expect(tsh).not.toContain("CrumbStrip");
    expect(tsh).not.toContain("drawer"); // no NavDrawer trigger in the shell
    expect(tsh).not.toContain("hamburger");
  });
});

describe("shell P1 — the collapse tier", () => {
  it("below --tsh-collapse the sidebar folds to an icon rail; the FILTER becomes an overlay icon", () => {
    expect(rule(".tsh-root")).toContain("--tsh-collapse: 1100px");
    expect(tshCss).toContain("@media (max-width: 1099.98px) {");
    // the labels become tooltips; the icon rail narrows
    expect(tshCss).toContain(".tsh-brandtx, .tsh-nlab, .tsh-n, .tsh-nk { display: none; }");
    expect(tsh).toContain('title={collapsed ? n.label : undefined}'); // the tooltip carries the label
    expect(tsh).toContain('className="tsh-ni tsh-filtericon"'); // the folded FILTER icon
    expect(page).toContain("onFilterIcon={() => setFilterDrawerOpen(true)}"); // opens the existing overlay
    expect(page).toContain('window.matchMedia("(max-width: 1099.98px)")'); // the state driver, tokened to match
  });
});

describe("shell P1 — HubHeaderBar source is UNTOUCHED (locked component)", () => {
  it("the pack added nothing of its own to HubHeaderBar", () => {
    for (const mine of ["tsh-", "TodoShell", "todo-fix48", "workspace shell"]) {
      expect(hub).not.toContain(mine);
    }
    // it still exports its own grammar, unchanged
    expect(hub).toContain("export const HubHeaderBar");
    expect(hub).toContain("qhbar");
  });
});

describe("shell P2 — the hero: plain on the page, the CTA-over-link pair", () => {
  const pageCss = readFileSync(join(here, "todo.css"), "utf8");
  const cssRule = (sel: string): string => {
    const m = pageCss.match(new RegExp("(?:^|\\n)" + sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*\\{([^}]*)\\}"));
    if (!m) throw new Error(`rule not found: ${sel}`);
    return m[1];
  };
  it("the hero is plain on the page (no container): title + subtitle left, the pair right", () => {
    const hero = page.slice(page.indexOf("function renderHero"), page.indexOf("function renderFilterSection"));
    expect(hero).toContain("tdb-herohead");
    expect(hero).toContain(">What’s on your desk?</h1>");
    expect(hero).toContain("Urgent tasks, housekeeping, and notes. Here’s everything on your to-do list.");
    expect(cssRule(".tdb-herohead")).toContain("display: flex");
    expect(cssRule(".tdb-ask")).toContain("font-size: 33px"); // the ref's ~33px
    expect(cssRule(".tdb-herosub")).toContain("color: #8a7d6e"); // the quiet grey subtitle
  });
  it("the CTA pair: the ink Begin pill with the underlined review link beneath it (rewind via TypeGlyph)", () => {
    const right = cssRule(".tdb-heroright");
    expect(right).toContain("flex-direction: column");
    expect(right).toContain("align-items: center");
    expect(page).toContain("<RewindGlyph />"); // the TypeGlyph-grammar rewind on the link
    const l = cssRule(".tdb-revlink");
    expect(l).toContain("border-bottom: 1px solid #c9bcae");
    expect(cssRule(".tdb-revlink:hover")).toContain("color: #2a1a13"); // hover darkens text + rule
    // the search is NOT a hero element — it lives in the bar
    expect(page).not.toContain("tdb-bigsearch");
  });
});

describe("shell P2 — the panel + proportions", () => {
  const pageCss = readFileSync(join(here, "todo.css"), "utf8");
  const cssRule = (sel: string): string => {
    const m = pageCss.match(new RegExp("(?:^|\\n)" + sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*\\{([^}]*)\\}"));
    if (!m) throw new Error(`rule not found: ${sel}`);
    return m[1];
  };
  it("ONE bordered panel wraps the items row, both sections and the colophon", () => {
    const m = cssRule(".tdb-mainc");
    expect(m).toContain("border: 1px solid var(--tdb-panel-bd)");
    expect(m).toContain("border-radius: var(--tdb-panel-r)");
    expect(m).toContain("padding: var(--tdb-panel-pad)");
    expect(cssRule(".tdb-wrap")).toContain("--tdb-panel-bd: #e2dbd0");
    expect(cssRule(".tdb-wrap")).toContain("--tdb-panel-r: 14px");
    // the colophon moved INSIDE the panel, keeping its gating + copy
    const body = page.indexOf('className="tdb-sheetbody"');
    const banner = page.indexOf("<ProBanner");
    const maincClose = page.indexOf('{/* THE COLOPHON — moved INSIDE');
    expect(banner).toBeGreaterThan(body);
    expect(maincClose).toBeGreaterThan(body);
    expect(page).toContain("{!isProUser(currentUser) && ("); // gating intact
  });
  it("the items line has BOTH forms, driven by the filter state", () => {
    expect(page).toContain("`Showing ${shownX} of ${shownY} items`"); // narrowed
    expect(page).toContain("`${shownY} items`"); // unfiltered
    expect(page).toContain("{active ? `Showing"); // the filter state decides
    // the toggle is the unchanged component, the hairline beneath, no text tabs / Sort
    expect(page).toContain('className="tdb-vseg" role="group" aria-label="View"');
    expect(cssRule(".tdb-dochead")).toContain("border-bottom: 1px solid var(--tdb-panel-hair)");
    expect(page).not.toContain(">Cards</"); // no text tabs
    expect(page).not.toContain(">Sort<");
  });
  it("the spacing tokens: 26px hero→panel gap, ~40px workspace gutter", () => {
    expect(cssRule(".tdb-wrap")).toContain("--tdb-hero-gap: 26px");
    expect(cssRule(".tdb-centre")).toContain("gap: var(--tdb-hero-gap)");
    expect(cssRule(".tdb-ws")).toContain("padding: var(--tdb-hero-gap) 0 26px");
    expect(cssRule(".tdb-wrap")).toContain("--tdb-edge: 40px");
  });
  it("the pastille card bands are byte-untouched (the shell reframes, it does not retint)", () => {
    // the family band tokens + the card grammar stand exactly as deployed
    for (const t of ["--pink-t", "--lat-1", "--note-t"]) expect(pageCss).toContain(t);
    expect(pageCss).toContain(".tdb-band");
  });
});
