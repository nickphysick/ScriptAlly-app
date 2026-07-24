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
    expect(page).toContain('label: "Queries", icon: <Send size={16} />, count: liveQueryCount(queries)');
    expect(page).toContain('label: "To-do", icon: <ListTodo size={16} />, count: boardCards.length');
    expect(page).toContain('import { LayoutGrid, Send, Users, ListTodo, FileStack'); // the drawer's lucide set
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
  it("an active nav item takes the drawer's faint parchment fill ONLY (P4: the white card retired)", () => {
    const on = rule(".tsh-ni.on");
    expect(on).toContain("background: var(--tsh-active-bg)");
    expect(on).toContain("color: var(--tsh-active-ink)");
    expect(on).toContain("font-weight: 600");
    expect(on).not.toContain("border"); // no border
    expect(on).not.toContain("box-shadow"); // no shadow
    expect(rule(".tsh-root")).toContain("--tsh-active-bg: #e6ddcf"); // ALIGNMENT FIX P2: the sidebar's own warm parchment (no green)
  });
  it("no burgundy fill anywhere in the nav styles (the law, asserted)", () => {
    for (const burgundy of ["#7c3a2a", "#f5c7c2", "#f3e3dc", "#f5e2da"]) {
      // the sidebar chrome never wears a burgundy fill
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
  it("the breadcrumb keeps its anatomy (QUERYING / To-do) + user; the search LEFT the bar", () => {
    expect(page).toContain('crumbCurrent="To-do"');
    expect(page).toContain('crumbParents={[{ label: "QUERYING"');
    expect(tsh).toContain("<b>{crumbCurrent}</b>");
    // CENTRING/SEARCH: the bar is breadcrumb + user only; the account holds the right on its own
    expect(tsh).not.toContain("tsh-search");
    expect(tsh).toContain("<F12Account");
    expect(rule(".tsh-bcbar .f12-who")).toContain("margin-left: auto");
  });
});

describe("shell P1 — the search relocation + the retired hamburger", () => {
  it("the search moved to the PANEL HEADER, same handler + the ⌘K target preserved", () => {
    expect(page).toContain('<span className="tdb-hsearch">');
    expect(page).toContain("value={search}");
    expect(page).toContain("onChange={(e) => setSearch(e.target.value)}");
    expect(page).toContain("ref={searchRef}");
    expect(page).toContain('e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)'); // ⌘K still lands
    expect(page).not.toContain("tdb-bigsearch");
    expect(tsh).not.toContain("tsh-search"); // gone from the bar
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
    expect(hero).toContain("Urgent tasks, housekeeping, notes. Here’s everything on your to-do list."); // P2: "and notes" → "notes"
    expect(cssRule(".tdb-herohead")).toContain("display: flex");
    expect(cssRule(".tdb-ask")).toContain("font-size: 33px"); // the ref's ~33px
    expect(cssRule(".tdb-herosub")).toContain("color: #7a6a5e"); // P2: the warm-grey Playfair subtitle
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
    expect(cssRule(".tdb-items")).toContain("border-bottom: none"); // CENTRING/SEARCH: no hairline beneath now
    expect(page).not.toContain(">Cards</"); // no text tabs
    expect(page).not.toContain(">Sort<");
  });
  it("the spacing tokens: 26px hero→panel gap, ~40px workspace gutter", () => {
    expect(cssRule(".tdb-wrap")).toContain("--tdb-hero-gap: 26px");
    expect(cssRule(".tdb-centre")).toContain("gap: var(--tdb-hero-gap)");
    expect(cssRule(".tdb-ws")).toContain("padding: var(--tdb-hero-gap) 0 0");
    // SHELL POLISH P1: the workspace gutter is the centred column's, not the wrap's edge
    expect(cssRule(".tdb-col")).toContain("padding: var(--tdb-chrome-gap) var(--tdb-col-gutter) 48px");
  });
  it("the pastille card bands are byte-untouched (the shell reframes, it does not retint)", () => {
    // the family band tokens + the card grammar stand exactly as deployed
    for (const t of ["--pink-t", "--lat-1", "--note-t"]) expect(pageCss).toContain(t);
    expect(pageCss).toContain(".tdb-band");
  });
});

describe("shell P3 — Today, back in its corner", () => {
  const pageCss = readFileSync(join(here, "todo.css"), "utf8");
  const cssRule = (sel: string): string => {
    const m = pageCss.match(new RegExp("(?:^|\\n)" + sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*\\{([^}]*)\\}"));
    if (!m) throw new Error(`rule not found: ${sel}`);
    return m[1];
  };
  it("the corner pop-up: floating white card bottom-right, #ddd2c2 border, deep shadow, ~250px", () => {
    const pop = cssRule(".tdb-tdpop");
    expect(pop).toContain("position: fixed");
    expect(pop).toContain("right: 26px");
    expect(pop).toContain("bottom: 24px");
    expect(pop).toContain("width: 250px");
    const card = cssRule(".tdb-today2");
    expect(card).toContain("border: 1px solid #ddd2c2");
    expect(card).toContain("border-radius: 14px");
    expect(card).toContain("box-shadow: 0 14px 38px rgba(58, 28, 20, 0.22)");
    // serif Today + mono count come from the reused renderTodayPanel header
    expect(page).toContain('<b className="tdb-t">Today</b>');
    expect(page).toContain("`${committedCards.length} OF ${MAX_TODAY}`");
  });
  it("minimise → the pill, the state persisted; restore reopens the card", () => {
    expect(page).toContain('localStorage.getItem("sa.todoTodayMin")');
    expect(page).toContain('localStorage.setItem("sa.todoTodayMin", v ? "1" : "0")');
    expect(page).toContain('onClick={() => toggleTodayMin(true)}'); // the minimise control
    expect(page).toContain('onClick={() => toggleTodayMin(false)}'); // the pill restores
    expect(page).toContain('if (todayMin) {'); // the pill branch
    expect(cssRule(".tdb-tdpill")).toContain("position: fixed");
    expect(cssRule(".tdb-tdmin")).toContain("position: absolute"); // top-right of the card
  });
  it("rows + footer are the EXISTING primitives (sage circles, Work the list), unchanged", () => {
    // the corner reuses the one renderTodayPanel — the completion primitives + the flow
    expect(page).toContain("function renderTodayPanel()");
    expect(page).toContain('{renderTodayPanel()}'); // the corner's body
    expect(page).toContain('setFlow({ items: committedCards.map((card) => ({ kind: "card", card })), ritual: true });'); // Work the list
    expect(page).toContain(">Work the list</button>");
    expect(cssRule(".tdb-tddot")).toContain("var(--hk-sage)"); // the pill's sage dot (existing glyph scale)
  });
  it("absent when empty; z above the panel and below the toasts", () => {
    expect(page).toContain("if (!todayShown) return null;");
    expect(cssRule(".tdb-tdpop")).toContain("z-index: 45"); // panel < 45 < toast 60
    expect(cssRule(".tdb-toast")).toContain("z-index: 60");
  });
});

describe("shell P4 — the session, rewired to the shell", () => {
  const ss = readFileSync(join(here, "FocusedSession.tsx"), "utf8");
  const stage = readFileSync(join(here, "..", "..", "lib", "sessionStage.ts"), "utf8");
  const pageCss = readFileSync(join(here, "todo.css"), "utf8");
  it("the engine/templates/carriage/close/quiet-line are UNCHANGED — only the choreography retargets", () => {
    expect(ss).toContain('const [phase, setPhase] = useState<"gather" | "session" | "close">("gather");');
    expect(ss).toContain("function goPrevious()"); // the carriage
    expect(ss).toContain(">END SESSION</button>"); // the quiet-line exit
    expect(ss).toContain("function backToDesk()"); // the reverse
  });
  it("the opening: the sidebar slides off left + the search fades via the shell class", () => {
    expect(page).toContain("clearing={heroSession.clearing}"); // driven by the session state
    expect(tsh).toContain('${clearing ? " tsh-clearing" : ""}');
    expect(tshCss).toContain(".tsh-clearing .tsh-nav { transform: translateX(-100%); opacity: 0; }");
    // CENTRING/SEARCH: the search left the bar — it fades with the panel via EXIT_FADE, no
    // orphaned bar-clearing rule survives
    expect(tshCss).not.toContain(".tsh-clearing .tsh-search");
    expect(stage).toContain(".tdb-hsearch"); // the header search is in the gather's fade list
    // EXIT_LEFT names the sidebar for intent; the in-wrap furniture exits through the gather
    expect(stage).toContain('export const EXIT_LEFT = ".tsh-nav"');
    expect(stage).toContain('export const EXIT_RIGHT = ".tdb-tdpop, .tdb-tdpill"'); // Today leaves
  });
  it("the bcbar STAYS (v9's app-bar exemption) — only its search fades", () => {
    // the curtains still begin at the measured board top (below the bcbar)
    expect(ss).toContain("const barBottom = Math.max(0, wrapEl?.getBoundingClientRect().top ?? 0);");
    // the bcbar has no clearing rule — it is not slid or faded
    expect(tshCss).not.toContain(".tsh-clearing .tsh-bcbar");
  });
  it("the session hero: title crossfades in place, the subtitle fades, the progress row takes its slot", () => {
    expect(page).toContain(">What’s on your desk?</h1>");
    expect(page).toContain(">In focus</h1>");
    expect(pageCss).toContain(".tdb-srchrow.insession .tdb-herosub"); // the subtitle fades
    expect(page).toContain('<div className="tdb-fsprog"'); // the progress row renders where the subtitle stood
    // the ≥48px clear-band law still governs (the region is measured from the sub-slot bottom)
    expect(ss).toContain("const region = sessionRegion(sr ? sr.bottom : slotTop + 30, window.innerHeight);");
  });
  it("the exit reverses to the NEW seats: nav slides home, search returns, Today comes back", () => {
    // clearing is false only at rest / after Back to your desk (backToDesk reports clearing:false)
    expect(ss).toContain("onHero({ clearing: false, slot: null })");
    // the pair + the Today corner remount by their normal conditions on exit (React), not orphaned
    expect(page).toContain('{heroSession.slot?.kind !== "session" && (');
    expect(page).toContain("{renderTodayCorner()}");
    // browser back still closes-first then reverses (unchanged v9 wiring)
    expect(ss).toContain("const onPop = () => backToDesk();");
  });
});

describe("shell P5 — the sweep + the record", () => {
  const pageCss = readFileSync(join(here, "todo.css"), "utf8");
  it("the retired seats + rail-Today + old hero search are extinct in source and styles", () => {
    for (const dead of ["tdb-bigsearch", "tdb-sbpair", "tdb-sbdiv", "tdb-barvt", "tdb-barpair",
                        "tdb-bardiv", "tdb-heropair", "tdb-railr", "tdb-todaypop", "tdb-todaychip",
                        "tdb-fpillbtn", "F12Page"]) {
      expect(page).not.toContain(dead);
      expect(pageCss).not.toContain(dead);
    }
    // the old filter-rail aside is gone; the sidebar is the shell's
    expect(page).not.toContain('<aside className="tdb-fside"');
    expect(page).not.toContain("renderRail");
  });
  it("the dead exploration tokens are gone (the search/pair seat tokens)", () => {
    for (const tok of ["--tdb-sbpair-h", "--tdb-sbpair-fs", "--tdb-search-w", "--tdb-search-clear"]) {
      expect(pageCss).not.toContain(tok);
    }
  });
  it("themes.md records the workspace shell as settled and marks the sage structure superseded", () => {
    const themes = readFileSync(join(here, "..", "..", "..", "design-refs", "themes.md"), "utf8");
    expect(themes).toContain("## To-do workspace shell (settled)");
    expect(themes).toContain("THE PARCHMENT CHROME PAIR");
    expect(themes).toContain("THE ACTIVE-STATE LAW (never burgundy)"); // amended by the polish (faint fill)
    expect(themes).toContain("THE PANEL");
    expect(themes).toContain("TODAY'S CORNER FORM");
    expect(themes).toContain("the pastille bands are SIGNAL");
    expect(themes).toContain("container structure SUPERSEDED by the workspace shell");
  });
  it("the tour lands on the new seats end to end", () => {
    const tour = readFileSync(join(here, "..", "..", "lib", "todoTour.ts"), "utf8");
    // Begin (hero) · search (bar) · filters (sidebar) · review (hero link) · cards · Today (corner)
    for (const sel of [".tdb-herobegin", ".tdb-hsearch", ".tdb-fpill, .tsh-filtericon", ".tdb-revlink", ".tdb-tile, .tdb-gcard, .tdb-lrow", ".tdb-today2"]) {
      expect(tour).toContain(sel);
    }
    // every anchor still exists in the board or the shell
    expect(pageCss).toContain(".tdb-fpill"); // filters in the sidebar section
    expect(pageCss).toContain(".tdb-today2"); // the corner card
    expect(pageCss).toContain(".tdb-revlink"); // the hero review link
    expect(pageCss).toContain(".tdb-hsearch"); // the panel-header search
  });
  it("the full state machine walks: board → filter → session (both views) → close → exit", () => {
    // filtering via the sidebar section (the reactive rows the shell hosts)
    expect(page).toContain("filterSection={renderFilterSection()}");
    // Begin launches the session over the engine's own queue
    expect(page).toContain("onClick={() => setSession({ queue: boardCards })}");
    // the session's phases + the reverse are intact
    const ss = readFileSync(join(here, "FocusedSession.tsx"), "utf8");
    expect(ss).toContain('const [phase, setPhase] = useState<"gather" | "session" | "close">("gather");');
    expect(ss).toContain("function backToDesk()");
    // both views (cards ⇄ ledger) still gather (the selector covers cells + ledger rows)
    const stage = readFileSync(join(here, "..", "..", "lib", "sessionStage.ts"), "utf8");
    expect(stage).toContain(".tdb-cell");
    expect(stage).toContain(".tdb-lrow");
  });
});
