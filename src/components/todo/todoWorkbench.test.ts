/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Workbench shell locks (workbench pack Phase 1; ref design-refs/todo-workbench-shell-v1.html,
 * Option B normative). Logic-only test policy → drawer fold, masthead composition, the corner
 * retirement and the panel transplant are pinned at the source/rule-text layer; feel checks are
 * Nick's in-browser list.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(here, "todo.css"), "utf8");
const page = readFileSync(join(here, "ToDoPage.tsx"), "utf8");
const shell = readFileSync(join(here, "..", "shell", "AppShell.tsx"), "utf8");

const rule = (sel: string): string => {
  const m = css.match(new RegExp("(?:^|\\n)" + sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*\\{([^}]*)\\}"));
  if (!m) throw new Error(`rule not found: ${sel}`);
  return m[1];
};

describe("Final Shape P2 — THE FILTER RAIL (vertical quiet pills; the squares are extinct)", () => {
  it("248px sticky white panel, locked left; the assembly is 1364", () => {
    expect(rule(".tdb-wrap")).toContain("--tdb-asm: 1364px; --tdb-rail: 248px;");
    expect(rule(".tdb-fside")).toContain("width: var(--tdb-rail)");
    expect(rule(".tdb-fside, .tdb-railr")).toContain("position: sticky; top: var(--tdb-gutter)");
    expect(page).toContain('<aside className="tdb-fside" aria-label="Filters">');
  });
  it("SHOW: seven vertical pills in the locked order, 34px rows, dot left + count right, zero 40%", () => {
    for (const call of ['railPill("OFFERS", "offers", fc.offers, "p")', 'railPill("AGENT WAITING", "overToYou", fc.overToYou, "p")', 'railPill("MATERIALS", "materials", fc.materials, "lat")', 'railPill("WISH LISTS", "mswl", fc.mswl, "lat")', 'railPill("STALE", "stale", fc.stale, "lat")', 'railPill("SNOOZED", "snoozed", fc.snoozed, "lat")', 'railPill("NOTES", "notes", fc.notes, "y")']) {
      expect(page).toContain(call);
    }
    const order = ["OFFERS", "AGENT WAITING", "MATERIALS", "WISH LISTS", "STALE", "SNOOZED", "NOTES"];
    let last = -1;
    for (const l of order) { const i = page.indexOf(`railPill("${l}"`); expect(i).toBeGreaterThan(last); last = i; }
    expect(rule(".tdb-fpill")).toContain("height: 34px");
    expect(rule(".tdb-fpill.z")).toContain("opacity: 0.4");
    expect(rule(".tdb-fpill .tdb-fn")).toContain("margin-left: auto");
  });
  it("v4 P2: SHOW ALL is the default-selected pill AND the reset; narrowing keeps nar/dim; no RESET row", () => {
    const nar = rule(".tdb-fpill.nar");
    expect(nar).toContain("border-color: #7c3a2a");
    expect(nar).toContain("font-weight: 700");
    expect(page).toContain('className={`tdb-fpill showall${resting ? " sel" : ""}`} aria-pressed={resting} onClick={() => setFilters({ ...DEFAULT_FILTERS })}');
    expect(page).toContain("SHOW ALL<span className=\"tdb-fn\">{shownY}</span>".replace(/\\/g, ""));
    expect(rule(".tdb-fpill.sel")).toContain("border-color: var(--ink)");
    expect(css).toContain('.tdb-fpill.sel::before { content: "✓"; font-size: 9px; }');
    expect(page).not.toContain("tdb-frst");
    expect(css).not.toContain("tdb-frst");
    // SHOW ALL sits first, directly under the FILTER header
    const sec = page.indexOf('className="tdb-fsec"');
    const sa = page.indexOf("SHOW ALL<span");
    expect(sa).toBeGreaterThan(sec);
    expect(sa).toBeLessThan(page.indexOf('railPill("OFFERS"'));
    expect(page).toContain(">FILTER</div>");
  });
  it("v4 P2: Begin focused session leads the rail (same wiring); the foot keeps Task settings only", () => {
    expect(page).toContain('className="tdb-fsb2" disabled={boardCards.length === 0} onClick={() => setFlow({ items: boardCards.map((card) => ({ kind: "card" as const, card })) })}>▶ Begin focused session</button>');
    expect(rule(".tdb-fsb2")).toContain("height: 42px");
    const panel = page.slice(page.indexOf("function renderFilterPanel"), page.indexOf("function renderRail"));
    expect(panel.indexOf("tdb-fsb2")).toBeLessThan(panel.indexOf("tdb-fsec"));
    expect(panel).toContain('className="tdb-setrow"');
  });
  it("the lens below a divider; the same state the search composes with", () => {
    expect(page.indexOf('className="tdb-fdivider"')).toBeLessThan(page.indexOf("TODAY’S LIST<span"));
    expect(page).toContain('aria-pressed={filters.todayOnly} onClick={() => setF("todayOnly", !filters.todayOnly)}');
    expect(page).toContain("matchesSearch(c, search, sctx)");
  });
  it("v4 P5: the foot keeps Task settings ONLY — the Pro square left for the letterhead banner", () => {
    expect(page).toContain('className="tdb-setrow" onClick={() => setSettingsOpen(true)}');
    expect(rule(".tdb-sic")).toContain("width: 26px; height: 26px; border-radius: 50%");
    for (const stale of ["tdb-prosq", "tdb-prok", "tdb-progo"]) {
      expect(page).not.toContain(stale);
      expect(css).not.toContain(stale);
    }
    expect(page).not.toContain("tdb-sq"); // the squares stay extinct
  });
});
describe("P1 — the corner retirement + the AppShell's one out-of-page line", () => {
  it("the FAB, pop-up chrome and fixed settings button are gone from the page", () => {
    expect(page).not.toContain("tdb-fab");
    expect(page).not.toContain("tdb-setbtn");
    expect(page).not.toContain("tdb-pop\"");
    expect(page).not.toContain("todayOpen");
    expect(css).not.toContain(".tdb-fab");
    expect(css).not.toContain(".tdb-setbtn");
    expect(css).not.toMatch(/\.tdb-pop\s*\{/);
  });
  it("the panel is the VI 'Today' card — ref anatomy, same state + handlers", () => {
    expect(page).toContain('<div className="tdb-today2">');
    for (const inner of ["tdb-th", "tdb-thr", "tdb-rollbar", "tdb-tcommit", "tdb-trow", "tdb-ghostbox", "tdb-grow", "tdb-donerow", "tdb-tdone", "tdb-drow", "tdb-tf2", "tdb-pick", "tdb-worklist"]) {
      expect(page).toContain(inner);
    }
    expect(rule(".tdb-th")).not.toContain("hk-sage"); // VI P1: plain paper header, no sage band
    // the add flow survives: Add more / Help me pick / ＋ Add + Work the list, same handlers
    expect(page).toContain(">＋ Add more</button>");
    expect(page).toContain(">Help me pick</button>");
    expect(page).toContain(">＋ Add</button>");
    // evening C2: Work the list is the RITUAL walk (sage whole-walk) over the same committed set
    expect(page).toContain('setFlow({ items: committedCards.map((card) => ({ kind: "card", card })), ritual: true });'); // III P1: review-free by construction, no filter
    expect(page).toContain(">Work the list</button>");
  });
  it("VI P3 reversed the route hide: the FAB shows on /todo with the two-item menu; elsewhere it navigates", () => {
    expect(shell).not.toContain('{routeKey !== "todo" && (');
    expect(shell).toContain('if (routeKey === "todo") setHelpMenuOpen((v) => !v);');
    expect(shell).toContain("Help centre"); // the menu's first item (multi-line JSX)
    expect(shell).toContain('window.dispatchEvent(new CustomEvent("sa:todo-replay-tour"))');
  });
});

describe("v4 P6 — empty-state copy + sweep", () => {
  it("the empty Notes lane shows ONLY the quiet ＋ (no placeholder sentence, repo-wide)", () => {
    expect(page).not.toContain("Nothing jotted yet");
    expect(page).toContain('className="tdb-ghostcard quiet" onClick={addTask} aria-label="Add a note"');
    expect(css).toContain(".tdb-ghostcard.quiet");
  });
  it("no orphan Pro-square / RESET / header-Begin selectors; the tour targets the rail's button", () => {
    for (const stale of ["tdb-prosq", "tdb-frst", "tdb-herorow", "tdb-fsb\""]) {
      expect(page).not.toContain(stale.replace("\\", ""));
      expect(css).not.toContain(stale.replace("\\", ""));
    }
    const tour = readFileSync(join(here, "..", "..", "lib", "todoTour.ts"), "utf8");
    expect(tour).toContain('sel: ".tdb-fsb2"');
  });
});

describe("v4 P3 — conditional Today + the 4-up board", () => {
  it("Today mounts only with content (committed OR done today); the wrap flags today-off", () => {
    expect(page).toContain("const todayActive = committedCards.length > 0 || doneN > 0;");
    expect(page).toContain("{!narrow && todayShown && (");
    expect(page).toContain('className={`tdb-wrap${todayShown ? "" : " today-off"}`}');
  });
  it("the grid steps 4-up ⇄ 3-up via tokens; cards stay 250 (only the count changes)", () => {
    expect(css).toContain(".tdb-wrap.today-off { --tdb-asm: 1344px; --tdb-sheet: 1072px; }");
    expect(css).toContain(".tdb-wrap.today-off .tdb-grid { grid-template-columns: repeat(4, var(--tdb-cardw)); }");
    expect(rule(".tdb-grid")).toContain("repeat(3, var(--tdb-cardw))");
    expect(rule(".tdb-mainc")).toContain("transition: width 220ms ease");
  });
  it("the slide: in/out 220ms ease; exit lags the unmount; reduced motion = instant", () => {
    expect(css).toContain(".tdb-railr.in { animation: tdbTodayIn 220ms ease; }");
    expect(css).toContain(".tdb-railr.out { animation: tdbTodayOut 220ms ease forwards; }");
    expect(page).toContain("window.setTimeout(() => { setTodayShown(false); setTodayLeaving(false); }, 220);");
    expect(page).toContain('window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;');
    expect(css).toContain("@media (prefers-reduced-motion: reduce) { .tdb-railr.in, .tdb-railr.out { animation: none; }");
  });
  it("the Today panel: lifted white card with the diary-sage header (the pack's hexes)", () => {
    expect(rule(".tdb-today2")).toContain("box-shadow: 0 8px 22px rgba(58, 28, 20, 0.14)");
    expect(rule(".tdb-th")).toContain("linear-gradient(180deg, #d7ddd5, #d5dbd3)");
    expect(rule(".tdb-th .tdb-t")).toContain("color: #3d4a3b");
    expect(rule(".tdb-th .tdb-thr")).toContain("color: #5a6e58");
  });
});

describe("Final Shape P6 — remnant sweep · a11y", () => {
  it("GREP SWEEP — strip/deck/post-it/reel/ledger-table/selection remnants all extinct", () => {
    const stale = [
      "post-it", "postit", "tdb-strip", "tdb-deck", "deckPill", "tdb-reel", "reelFit", "REEL_PAGE",
      "tdb-pg", "tdb-lgrid", "tdb-lrow", "tdb-ltd", "tdb-bulk", "todoSelection", "tdb-ric",
      "tdb-sq", "tdb-lrail", "renderStrip", "renderDeck", "soloPostit", "scroll-snap",
    ];
    for (const t of stale) {
      expect(page).not.toContain(t);
      expect(css).not.toContain(t);
    }
  });
  it("A11Y: the drawer is focus-trapped (Tab cycles, Esc closes, scrim click closes); one panel, two mounts", () => {
    expect(page).toContain('if (e.key === "Escape") { e.stopPropagation(); setFilterDrawerOpen(false); return; }');
    expect(page).toContain("if (e.shiftKey && document.activeElement === first)");
    expect(page).toContain('className="tdb-fdscrim" onClick={() => setFilterDrawerOpen(false)}');
    expect((page.match(/\{renderFilterPanel\(\)\}/g) ?? []).length).toBe(2);
  });
  it("A11Y: sticky headings are single elements (no aria-hidden duplicates to manage)", () => {
    expect((page.match(/className=\{`tdb-lh2 /g) ?? []).length).toBe(2); // the Lane + runHeading builders
  });
});

describe("Final Shape P4 — the wrapped grid + sticky headings", () => {
  it("the grid: repeat(3, cardw) + g12, ALL cards rendered (no truncation, no pagers)", () => {
    expect(rule(".tdb-grid")).toContain("display: grid; grid-template-columns: repeat(3, var(--tdb-cardw)); gap: var(--g12)");
    expect(page).toContain('<div className="tdb-grid">{children}</div>');
    expect(page).not.toContain("tdb-reelpg");
  });
  it("the heading is sticky within the page scroll, sheet-backed, at the final scale (28/19/24×3)", () => {
    const h = rule(".tdb-lh2");
    expect(h).toContain("position: sticky; top: 0;");
    expect(h).toContain("background: var(--white, #fff)");
    expect(rule(".tdb-lh2 .tdb-lgt")).toContain("font-size: 19px");
    expect(rule(".tdb-lh2 .tdb-lgt::after")).toContain("width: 24px; height: 3px");
    expect(rule(".tdb-playb")).toContain("width: 28px; height: 28px");
  });
  it("the hover invariants hold (the hotfix suite re-asserts the cell/surface law)", () => {
    expect(rule(".tdb-cell")).toContain("height: var(--tdb-cardh)");
    expect(rule(".tdb-vwrap")).toContain("grid-template-rows: 0fr");
  });
});

describe("Final Shape P3 — the sheet shell + the resident docband", () => {
  it("the corner row: derived mono meta (date · open · showing) left, the ▦/☰ segment right", () => {
    expect(page).toContain("{shortHeaderDate(now)} · {shownY} OPEN · SHOWING {shownX}");
    expect(rule(".tdb-shmeta")).toContain("text-transform: uppercase");
    expect(page).toContain('className="tdb-vseg" role="group" aria-label="View"');
    expect(page).toContain('onClick={() => pickView("cards")}>▦</button>');
    expect(page).toContain('onClick={() => pickView("ledger")}>☰</button>');
    expect(rule(".tdb-vseg")).toContain("margin-left: auto");
  });
  it("the docband sits at the top of BOTH views (before the desk/view branch), inside the sheet", () => {
    const mainc = page.indexOf('className="tdb-mainc"');
    const head = page.indexOf('className="tdb-sheethead"');
    const band = page.indexOf('className="tdb-docband"');
    const views = page.indexOf('desk === "new-desk"');
    expect(head).toBeGreaterThan(mainc);
    expect(band).toBeGreaterThan(head);
    expect(band).toBeLessThan(views);
  });
  it("ONE review surface repo-wide: the docband; the strip banner classes are extinct", () => {
    expect(page).not.toContain("tdb-rvhead");
    expect(css).not.toContain("tdb-rvhead");
    expect((page.match(/tdb-docband/g) ?? []).length).toBe(1);
    expect(page).toContain('{reviewOpened ? "View again" : "Open it ›"}');
  });
});

describe("Final Shape P1 — the hero + the floating search", () => {
  it("v4: the hero is CENTRED on the bare ground — no band, no border, title over search", () => {
    expect(rule(".tdb-hero")).toContain("text-align: center");
    expect(rule(".tdb-hero")).not.toContain("background");
    expect(rule(".tdb-hero")).not.toContain("border");
    expect(page).toContain('<h1 className="tdb-ask">What’s on your desk?</h1>');
    expect(rule(".tdb-ask")).toContain("font-size: 42px");
    const hero = page.slice(page.indexOf("function renderHero"), page.indexOf("// ── Final Shape P2"));
    expect(hero).not.toContain("Begin focused session"); // moved to the rail (v4 P2)
    expect(hero).not.toContain("tdb-fsb\""); // no focused-session control in the header
  });
  it("v4: the search sits centred directly beneath the title (the band overlap retired)", () => {
    const sr = rule(".tdb-srchrow");
    expect(sr).toContain("justify-content: center");
    expect(sr).toContain("margin: 18px 0 2px");
    const bs = rule(".tdb-bigsearch");
    expect(bs).toContain("width: 540px");
    expect(bs).toContain("height: 46px");
    expect(page).toContain('placeholder="Search your desk…"');
    expect(page).toContain("matchesSearch(c, search, sctx)");
  });
  it("⌘K guards on visibility (the page stays mounted behind other routes); Esc chain: search then filters", () => {
    expect(page).toContain("wrapRef.current.offsetParent === null");
    expect(page).toContain('if (search) { setSearch(""); return; }');
    expect(page).toContain("if (!isResting(filtersRef.current) || filtersRef.current.todayOnly) setFilters(DEFAULT_FILTERS);");
  });
  it("view state persists under sa.todoView (default cards; P3 made the Ledger face live)", () => {
    expect(page).toContain('localStorage.getItem("sa.todoView")');
  });
  it("ZERO strip/deck/post-it remnants", () => {
    for (const stale of ["tdb-strip", "tdb-striprow", "tdb-tblock", "tdb-postit", "tdb-pv", "tdb-pk", "soloPostit", "renderStrip", "tdb-deck", "tdb-deckrow", "tdb-ctl", "tdb-dsrch", "tdb-vdiv", "deckPill", "tdb-dspc", "renderDeck", "tdb-fdrop", "filterDropOpen"]) {
      expect(page).not.toContain(stale);
      expect(css).not.toContain(stale);
    }
  });
});
describe("P2 — card view: the grid replaces the reels; renames land", () => {
  it("Final Shape P4 — THE WRAPPED GRID: 3 fixed columns, all cards, one scroll; reels/snap stay retired", () => {
    expect(rule(".tdb-grid")).toContain("grid-template-columns: repeat(3, var(--tdb-cardw))");
    expect(rule(".tdb-grid")).toContain("gap: var(--g12)");
    expect(page).toContain('<div className="tdb-grid">{children}</div>');
    expect(page).not.toContain("reelFit");
    expect(page).not.toContain("laneFit");
    expect(page).not.toContain("REEL_PAGE");
    expect(css).not.toContain("scroll-snap");
  });
  it("v2 anatomy: 27px band, 12.5px titles, content-sized cards, tighter body", () => {
    expect(rule(".tdb-band")).toContain("min-height: 27px");
    expect(rule(".tdb-tt")).toContain("font-size: 12.5px");
    expect(rule(".tdb-tile")).not.toContain("min-height");
    expect(rule(".tdb-body")).toContain("padding: 10px 12px 12px");
  });
  it("VI P3: the Focus pill became the PLAY BUTTON — full wording in title/aria; Batch fix stands", () => {
    expect(page).toContain('className="tdb-playb" title={`Focus on ${label}`} aria-label={`Focus on ${label}`} onClick={onFocusedSession}');
    expect(page).toContain(">⚡ FIX {g.members.length} →</button>"); // the run-sheet primary (the quick → retired with the table)
    expect(page).not.toContain("Fix together");
    expect(page).not.toContain(">▶ Focus on"); // the pill text is extinct in both views
  });
});

describe("Final Shape P5 — THE RUN SHEET (the ☰ view; the 9-col ledger is extinct)", () => {
  it("the view toggle is LIVE both ways and persisted (sa.todoView)", () => {
    expect(page).toContain('view === "ledger" ? renderLedger() : (');
    expect(page).toContain('localStorage.setItem("sa.todoView"');
  });
  it("rows are UNNUMBERED: the 26px family-tinted roundel carries the FAMILY DOT (pack overrides the ref)", () => {
    expect(page).toContain('<span className="tdb-stepn" aria-hidden><span className="tdb-dotc" /></span>');
    expect(rule(".tdb-stepn")).toContain("width: 26px; height: 26px; border-radius: 50%");
    expect(css).toContain(".tdb-step.pk .tdb-stepn { background: linear-gradient(180deg, var(--pink-t), var(--pink-btn));");
    expect(css).toContain(".tdb-step.lt .tdb-stepn { background: linear-gradient(180deg, var(--lat-1), var(--lat-2));");
    expect(page).not.toContain("stepn\">{"); // never a number inside
  });
  it("row anatomy: tagline (+ ✓ TODAY chip) · Playfair 14 title (batch b 17) · italic ms; batch adds sub/progress/roundels", () => {
    expect(rule(".tdb-steptt")).toContain("font-size: 14px");
    expect(rule(".tdb-steptt.batch b")).toContain("font-size: 17px");
    expect(page).toContain('<h3 className="tdb-steptt batch"><b>{g.members.length}</b>{copy.rest(g.members.length)}</h3>');
    expect(rule(".tdb-minibar")).toContain("background: #ece5d8");
    expect(rule(".tdb-minibar i")).toContain("background: var(--ink)");
    expect(page).toContain('{committed && <span className="tdb-chipon">✓ TODAY</span>}');
  });
  it("verbs fade IN PLACE on hover/focus — same slots, same handlers as the cards; nothing grows", () => {
    expect(rule(".tdb-stepacts")).toContain("opacity: 0.35");
    expect(css).toContain(".tdb-step:hover .tdb-stepacts, .tdb-step:focus-within .tdb-stepacts { opacity: 1; }");
    const rr = page.slice(page.indexOf("function runRow"), page.indexOf("function runBatchRow"));
    expect(rr).toContain('onClick={() => quickDone(c)}>✓ DONE</button>');
    expect(rr).toContain("laterMenu(c)");
    expect(page).toContain(">⚡ FIX {g.members.length} →</button>");
  });
  it("row click opens the journey / Batch fix — parity with the cards; rows divided by hairlines", () => {
    const rr = page.slice(page.indexOf("function runRow"), page.indexOf("function renderLedger"));
    expect(rr).toContain("onClick={() => openFlowCards([c])}");
    expect(rr).toContain('onClick={() => setFlow({ items: [{ kind: "group", group: g }] })}');
    expect(rule(".tdb-step")).toContain("border-top: 1px solid var(--hairline)");
  });
  it("the run sheet shares the sticky lane headings; notes keep ＋; NO truncation, NO 9-col grid", () => {
    expect(page).toContain('runHeading("p", "tdb-lane-do", "Urgent"');
    expect(page).toContain('runHeading("lat", "tdb-lane-hk", "Housekeeping"');
    expect(page).toContain('runHeading("n", "tdb-lane-nt", "Notes to self"');
    for (const stale of ["tdb-lgrid", "tdb-lcols", "tdb-lrow", "tdb-ltd", "tdb-lagn", "tdb-lstack", "tdb-lmore", "tdb-tbl", "truncateRows", "SHOW ALL {opts.total}", "ledgerCardRow", "ledgerBatchRow", "ledgerSection"]) {
      expect(page).not.toContain(stale);
      expect(css).not.toContain(stale.startsWith("tdb") ? stale : "zz-no");
    }
  });
});
describe("P4 — search + filters (source locks; the matrix lives in todoFilters.test.ts)", () => {
  it("BOTH views read the same visible sets (cards lanes and ledger sections consume vDo/vGroups/vStale/vNt)", () => {
    expect(page).toContain("{vDo.map(renderCard)}");
    expect(page).toContain("{vGroups.map(renderGroupCard)}");
    expect(page).toContain("{vStale.map(renderCard)}");
    expect(page).toContain("{vNt.map(renderCard)}");
    expect(page).toContain("sortLedgerDo(vDo, lctx, now)"); // the ledger sorts the SAME set (review-free by construction)
  });
  it("the filter derivations survive the deck's death (the rail consumes them in P2)", () => {
    expect(page).toContain("filterCounts({ doCards: board.do, hkGroups, staleCards, ntCards: board.nt, committedCount: committedCards.length })");
    expect(page).toContain("togglePill");
  });
  it("filtered-empty gets the quiet one-liner + clear action, NEVER a celebratory empty (branch order + lane skips)", () => {
    expect(page).toContain("active && !anyVisible ? (");
    expect(page).toContain("Nothing matches —");
    expect(page).toContain('onClick={() => { setFilters(DEFAULT_FILTERS); setSearch(""); }}>clear filters');
    // the celebratory desk states sit BEFORE the filter branch (they need a truly empty desk)
    const branch = page.indexOf('desk === "new-desk" ? renderNewDesk()');
    expect(branch).toBeGreaterThan(0);
    expect(branch).toBeLessThan(page.indexOf("active && !anyVisible"));
    // a filtered-empty lane HIDES rather than celebrating
    expect(page).toContain("{(!active || vDo.length > 0 || overlayCards(\"do\").length > 0) && (");
  });
  it("search state: ⌘K focuses (visibility-guarded, P1); the input re-lands in the deck (P2)", () => {
    expect(page).toContain("matchesSearch(c, search, sctx)"); // the filter plumbing survives the move
    expect(page).toContain("searchRef");
  });
});

describe("Final Shape P5 — the ledger's selection machinery is extinct", () => {
  it("no checkboxes, no bulk bar, no kebab, no additive keyboard layer, no todoSelection import", () => {
    for (const stale of ["tdb-bulk", "selVisible", "applySelectClick", "moveFocus", "EMPTY_SEL", "kfocus", "kebabAt", "todoSelection", "data-lkey"]) {
      expect(page).not.toContain(stale);
    }
  });
});
describe("A1 → Final Shape — the hero band (supersedes the strip)", () => {
  it("v4: the hero band is gone — bare ground above the work row; the strip family stays extinct", () => {
    const band = page.indexOf("{renderHero()}");
    const ws = page.indexOf('className="tdb-asm tdb-ws"');
    expect(band).toBeGreaterThan(0);
    expect(band).toBeLessThan(ws);
    expect(page).not.toContain("tdb-herorow");
    expect(page).not.toContain("tdb-strip");
  });
  it("the hero is not sticky (scrolls away); the flanking columns keep the scroll contract", () => {
    expect(rule(".tdb-hero")).not.toContain("sticky");
    expect(rule(".tdb-fside, .tdb-railr")).toContain("position: sticky; top: var(--tdb-gutter)");
  });
});
describe("A2 → Final Shape — the batch copy + roundels live on the run-sheet row", () => {
  it("the batch row reads G3_COPY (one source) and the display roundels overlap −5px", () => {
    expect(page).toContain("const copy = G3_COPY[g.rule]");
    expect(css).toContain(".tdb-avs span:first-child { margin-left: 0; }");
  });
});
describe("II·B P1 — the 24-grid + the ref masthead (todo-workbench-rail-v1.html, Option B)", () => {
  it("the grid ships as named tokens with the vocabulary comment — no magic numbers at the seams", () => {
    expect(css).toContain("WIDTH v4 — THE CENTRED ASSEMBLY"); // the Final Shape law absorbed the vocabulary
    expect(rule(".tdb-wrap")).toContain("--g24: 24px; --g12: 12px;");
    expect(rule(".tdb-ws")).toContain("gap: var(--g24)");
    expect(rule(".tdb-ws")).toContain("padding: 22px 0 26px"); // the assembly work row (v2)
    expect(rule(".tdb-fside, .tdb-railr")).toContain("top: var(--tdb-gutter)"); // the contract (gutter rides --g24)
    expect(rule(".tdb-lane")).toContain("margin-bottom: var(--g24)"); // P6 rename: reel classes extinct
    expect(rule(".tdb-lh2")).toContain("margin: 0 0 16px"); // v2: 16px clear below the heading
    expect(rule(".tdb-grid")).toContain("gap: var(--g12)"); // P4: the grid is the card-gutter consumer
  });
});

describe("III P3 — the pinned pair (supersedes the II·B controls-only drawer)", () => {
  it("Final Shape P1 (transitional): the deck is extinct; filters re-land on the rail (P2), the segment in the sheet corner (P3)", () => {
    expect(page).not.toContain("renderDeck");
    expect(page).toContain("const shownX = vDo.length + hkGapCount(vGroups) + vStale.length + vNt.length;");
    expect(page).toContain("const shownY = tiles.urgent + tiles.housekeeping + tiles.notes;");
  });
  it("retired species stay retired; the Notes inline ＋ survives in BOTH views (the ledger's nt head gained it)", () => {
    for (const gone of ["YOUR DESK", "tdb-fgl", "tdb-frow", "tdb-cbi", "tdb-newnote", "tdb-dwalk"]) {
      expect(page).not.toContain(gone);
    }
    expect(page).toContain('{onAdd && <button type="button" className="tdb-cadd" onClick={onAdd} aria-label="Add a note">＋</button>}');
    expect(page).toContain('undefined, addTask)'); // the run sheet's Notes heading ＋
  });
});

describe("II·B P3 — the companion rail (one panel, two mounts, one state)", () => {
  it("mount parity: BOTH homes call the SAME renderTodayPanel, XOR'd on narrow (no fork — halt (c) clear)", () => {
    expect((page.match(/\{renderTodayPanel\(\)\}/g) ?? []).length).toBe(2);
    expect(page).toContain('"Today", ALWAYS ON'); // VI P1: the column is unconditional ≥1200
    expect(page).toContain("{narrow && (");
    expect(page).toContain('window.matchMedia("(max-width: 1239.98px)")');
  });
  it("the rail: 264 sticky at the 24 offset, after the main column; noted as the future companions' home", () => {
    expect(rule(".tdb-railr")).toContain("width: var(--tdb-today)");
    expect(rule(".tdb-fside, .tdb-railr")).toContain("position: sticky"); // the shared contract
    expect(page.indexOf('className="tdb-mainc"')).toBeLessThan(page.indexOf('tdb-railr${todayLeaving'));
  });
  it("the chip's count is the committed union — never a parallel tally — and the header slot pairs date ⇄ count", () => {
    expect(page).toContain("Today · {committedCards.length} TO GO");
    expect(page).toContain("`${committedCards.length} OF ${MAX_TODAY}`"); // VI P1: the header's count face
  });
  it("popover a11y: dialog role, aria-expanded on the chip, Esc + click-away close, reduced-motion honoured", () => {
    expect(page).toContain('aria-haspopup="dialog" aria-expanded={todayPopOpen}');
    expect(page).toContain('<div className="tdb-todaypop" role="dialog" aria-label="Today">');
    expect(page).toContain('if (e.key === "Escape") setTodayPopOpen(false);');
    expect(page).toContain('t.closest(".tdb-todaypop") || t.closest(".tdb-todaychip")');
    expect(css).toContain("@media (prefers-reduced-motion: reduce) { .tdb-todaypop { animation: none; } }");
  });
  it("the breakpoint belt: the column hides <1240 in CSS too; narrow closes the popover on widen", () => {
    expect(css).toContain("@media (max-width: 1239.98px) { .tdb-railr { display: none; } }");
    expect(page).toContain("useEffect(() => { if (!narrow) setTodayPopOpen(false); }, [narrow]);");
  });
});

describe("II·B P4 — one tag grammar + card polish", () => {
  it("the grouped card wears the standard typed tag pill; the kicker grammar is retired page-wide", () => {
    expect(page).toContain('<span className="tdb-tag due">{g.meta.label.toUpperCase()}</span>');
    expect(page).not.toContain("tdb-kick");
    expect(page).not.toContain("tdb-kd");
    expect(css).not.toContain("tdb-kick");
  });
  it("ONE section grammar in both views — the band-less lh2 heading (v2)", () => {
    expect(page).toContain("tdb-lh2 ${cls ===");
    expect(page).toContain('className={`tdb-lh2 ${cls}`}'); // runHeading shares the grammar
    expect((page.match(/tdb-playb/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });
  it("the batch card's Never + footer CTA are extinct (the contract); the hide lives in ☾ LATER", () => {
    expect(page).not.toContain("tdb-gnever");
    expect(page).not.toContain(">Batch fix →</button>");
    expect(page).toContain("muteRuleFromCard(g); }}>Don’t show these again</button>");
  });
});

describe("Width v4 — the centred assembly tokens (Final Shape)", () => {
  it("the token set on the wrap: asm 1364 · rail 248 · sheet 812 · vp 774 · cardw 250 · Today 256", () => {
    const w = rule(".tdb-wrap");
    expect(w).toContain("--tdb-asm: 1364px;");
    expect(w).toContain("--tdb-rail: 248px;");
    expect(w).toContain("--tdb-sheet: 812px;");
    expect(w).toContain("--tdb-vp: 774px;");
    expect(w).toContain("--tdb-cardw: 250px;");
    expect(w).toContain("--tdb-today: 256px;");
    expect(w).toContain("--tdb-gutter: var(--g24);");
    expect(w).toContain("--tdb-appnav: 49px;");
  });
  it("the assembly centres; the arithmetic is the LAWS' 248+24+812+24+256", () => {
    expect(rule(".tdb-asm")).toContain("width: var(--tdb-asm); margin: 0 auto;");
    expect(css).toContain("filter rail 248 · 24 · sheet 812");
    expect(css).toContain("Today 256 = 1364px");
    expect(rule(".tdb-railr")).toContain("width: var(--tdb-today)");
  });
});
describe("Deck v2 P4 — the sheet · the exact-fit board · the rename", () => {
  it("THE SHEET: both views render inside the white 812 panel (radius 16, hairline, 18/18/8)", () => {
    const m = rule(".tdb-mainc");
    expect(m).toContain("width: var(--tdb-sheet)");
    expect(m).toContain("border-radius: 16px");
    expect(m).toContain("padding: 18px 18px 8px");
    // one sheet, both views: the ledger + the lanes render inside .tdb-mainc (no second panel)
    const mainc = page.indexOf('className="tdb-mainc"');
    expect(mainc).toBeGreaterThan(0);
    expect(page.indexOf("renderLedger()")).toBeGreaterThan(0);
  });
  it("the grid: identical 250px columns from the one token; cards never stretch; no pagers, no partials", () => {
    expect(rule(".tdb-wrap")).toContain("--tdb-cardw: 250px;");
    expect(rule(".tdb-grid")).toContain("repeat(3, var(--tdb-cardw))");
    expect(rule(".tdb-tile")).toContain("flex: 0 0 var(--tdb-cardw)"); // the in-flow overlay faces keep the slot
    expect(page).not.toContain("tdb-reelpg");
    expect(page).not.toContain("tdb-reeltrack");
    expect(css).not.toContain("tdb-pg ");
  });
  it("filtered lanes append x OF y · FILTERED · SHOW ALL (reset)", () => {
    expect(page).toContain("{filtered.x} OF {filtered.y} · FILTERED ·");
    expect(page).toContain(">SHOW ALL</button>");
    expect(page).toContain("showAll: resetDeck");
  });
  it("THE LATTE LAW: bands/underline/post-it/dot latte; coffee survives only in journey-sheet headers", () => {
    expect(css).toContain("--lat-1: #f5efe6; --lat-2: #efe7d9; --lat-bd: #ddd0bc; --lat-mark: #cbb995; --lat-ink: #8a7048;");
    expect(rule(".tdb-band.hk")).toContain("var(--lat-1)");
    expect(rule(".tdb-lh2.lat .tdb-lgt::after")).toContain("var(--lat-mark)");
    const flow = readFileSync(join(here, "FocusFlow.tsx"), "utf8");
    expect(flow).toContain("cof"); // the journey-sheet family keeps coffee
  });
  it("THE RENAME, repo-wide: zero matches of the old family phrase in src (Agent waiting everywhere)", () => {
    const { execSync } = require("node:child_process");
    const needle = "over to " + "you"; // split so this lock never matches itself
    const out = execSync(`grep -ril '${needle}' ` + join(here, "..", "..") + " || true", { encoding: "utf8" }).trim();
    expect(out).toBe("");
    const board = readFileSync(join(here, "..", "..", "lib", "todoBoard.ts"), "utf8");
    expect(board).toContain('due: "AGENT WAITING"');
  });
});

describe("Final Shape — the deck is extinct (P1); the dots + reducer await the rail (P2)", () => {
  it("no deck markup or styles; the family-dot tokens survive for the rail's pills", () => {
    expect(page).not.toContain("tdb-deck");
    expect(css).not.toContain("tdb-deck");
    expect(css).toContain("--dot-p: #e59b8f; --dot-lat: #cbb995; --dot-y: #d9c87a; --dot-s: #9db29a;");
  });
});
describe("Deck v2 P5 — retirement sweep · breakpoints · a11y", () => {
  it("GREP SWEEP — every mapped remnant is extinct in page + css", () => {
    const stale = [
      "tdb-pair", "tdb-paircard", "tdb-fcard", "tdb-ftop", "tdb-fstatus", "tdb-fmid", "tdb-fgrp2",
      "tdb-fcloud", "tdb-fgh", "tdb-fp ", "fpill(", "tdb-freset", "tdb-vtg", "tdb-footrows",
      "tdb-fr2", "tdb-fric", "tdb-dic", "tdb-dfold", "tdb-dsp ", "tdb-focustx", "tdb-focush",
      "tdb-focusp", "tdb-focusgo", "tdb-focusart", "tdb-tacts", "tdb-pill", "tdb-tmeta",
      "tdb-hkdot", "tdb-who", "tdb-gstack", "tdb-gsav", "tdb-gmore", "tdb-gfix", "tdb-gnever",
      "tdb-qrail", "tdb-qbtn", "tdb-ttab", "tdb-rvbanner", "tdb-rvbar", "tdb-rvcard",
      "tdb-mastband", "tdb-mastcol", "tdb-mastspacer", "tdb-msrch", "GroupFlip", "reelFit",
      "sa.todoDrawer", "emptyRailOpen", "reviewSurface", "dismissReviewBanner",
    ];
    for (const t of stale) {
      expect(page).not.toContain(t);
      expect(css).not.toContain(t);
    }
  });
  it("BREAKPOINTS (P6 final): <1428 the rail is an overlay drawer behind ⚲ FILTER beside the search; <1240 the Today popover", () => {
    expect(page).toContain('window.matchMedia("(max-width: 1427.98px)")');
    expect(css).toContain("@media (max-width: 1427.98px) { .tdb-wrap { --tdb-asm: 1092px; } .tdb-wrap.today-off { --tdb-asm: 1072px; } }");
    expect(page).toContain("⚲ FILTER · {shownX}/{shownY}"); // (multi-line JSX — no leading >)
    expect(page).toContain('className="tdb-fdrawer" role="dialog" aria-modal="true" aria-label="Filters"');
    expect(page).toContain("{renderFilterPanel()}");
    expect((page.match(/\{renderFilterPanel\(\)\}/g) ?? []).length).toBe(2); // aside + drawer, one panel
    expect(page).toContain('window.matchMedia("(max-width: 1239.98px)")');
    expect(page).not.toContain("tdb-ric"); // the icon rail is extinct
  });
  it("A11Y: post-its/pills pressed; cards real buttons (Enter/Space, aria-expanded = the verb reveal)", () => {
    expect((page.match(/role="button"/g) ?? []).length).toBeGreaterThanOrEqual(4); // cards + run rows
    expect((page.match(/e\.key === "Enter" \|\| e\.key === " "/g) ?? []).length).toBeGreaterThanOrEqual(4);
  });
  it("A11Y: the Later menu is arrow-navigable; focus reveals the verbs as hover does", () => {
    expect(page).toContain("function latMenuKeys(");
    expect(page).toContain('if (e.key === "ArrowDown")');
    expect((page.match(/onKeyDown=\{latMenuKeys\}/g) ?? []).length).toBeGreaterThanOrEqual(2); // cards + run-sheet batch
    expect((page.match(/onFocus=\{\(\) => armVerbs\(/g) ?? []).length).toBe(2);
  });
});

describe("Final Shape — the strip + post-its are extinct (P1); latte tokens stay", () => {
  it("no strip markup/styles; the latte family survives for bands + the rail dots", () => {
    expect(page).not.toContain("tdb-strip");
    expect(css).not.toContain("tdb-postit");
    expect(css).toContain("--lat-1: #f5efe6; --lat-2: #efe7d9; --lat-bd: #ddd0bc; --lat-mark: #cbb995; --lat-ink: #8a7048;");
  });
});
describe("VI P1 — 'Today', always on (todo-right-column-v1.html)", () => {
  it("REGRESSION LOCK — no component-level const/let below the component's return (the TDZ dead zone)", () => {
    // The render helpers are declared BELOW the main return and survive only because function
    // declarations hoist. A component-body `const`/`let` down there is dead code — never
    // initialised — and any hoisted helper reading it throws a TDZ ReferenceError at first
    // render, which the root ErrorBoundary turns into an app-wide "Something went wrong"
    // (ToDoPage is a persistent slot on every workspace route). Bit twice: openSundayReview
    // (4d4fbed) and GHOST_BARS (this lock's trigger). Pure gates can't see it — this scan can.
    const ret = page.indexOf("return (\n    <F12Page");
    expect(ret).toBeGreaterThan(0);
    const deadZone = page.slice(ret);
    expect(deadZone).not.toMatch(/^  (const|let) /m);
    expect(page).toMatch(/^const GHOST_BARS = \[64, 78, 52\];/m); // lives at module scope instead
  });

  it("THE RENAME SWEEP — 'Today's list' is extinct across the board, the sheets, the tour and the libs", () => {
    const flow = readFileSync(join(here, "FocusFlow.tsx"), "utf8");
    const tour = readFileSync(join(here, "..", "..", "lib", "todoTour.ts"), "utf8");
    const board = readFileSync(join(here, "..", "..", "lib", "todoBoard.ts"), "utf8");
    const walk = readFileSync(join(here, "..", "..", "lib", "todoWalk.ts"), "utf8");
    for (const src of [page, css, flow, tour, board, walk]) {
      expect(src).not.toContain("oday’s list"); // catches Today's/today's alike
      // (Deck v2 legalised the uppercase form: the lens pill + sage chip are named TODAY'S LIST)
    }
    expect(page).toContain('<b className="tdb-t">Today</b>');
    expect(page).toContain(">✓ TODAY</span>"); // the committed chip; the lens pill re-lands on the rail (P2)
    expect(page).toContain('{committed ? "− TODAY" : "＋ TODAY"}'); // the verb row's Today toggle
  });
  it("the header's right slot: today's date when empty ⇄ '{n} OF 5' once anything is committed", () => {
    expect(page).toContain("{committedCards.length === 0 && doneN === 0 ? shortHeaderDate(now) : `${committedCards.length} OF ${MAX_TODAY}`}");
    expect(rule(".tdb-th .tdb-thr")).toContain("margin-left: auto");
    expect(rule(".tdb-th .tdb-thr")).toContain("font-size: 7px"); // v4: the diary head scale
  });
  it("the ghost invitation: dashed 11px-radius box, no fill; dashed 15px tick-boxes + faded bars; widths cycled", () => {
    const box = rule(".tdb-ghostbox");
    expect(box).toContain("border: 1.5px dashed rgba(58, 28, 20, 0.22)");
    expect(box).toContain("border-radius: 11px");
    expect(box).not.toContain("background"); // the card's parchment shows through
    expect(rule(".tdb-cbx")).toContain("width: 15px; height: 15px; border: 1.5px dashed rgba(58, 28, 20, 0.28)");
    expect(rule(".tdb-grow")).toContain("border-bottom: 1px dashed rgba(58, 28, 20, 0.16)");
    expect(page).toContain("const GHOST_BARS = [64, 78, 52];"); // module scope — see the regression lock
    expect(page).toContain("const ghosts = todayGhosts(committedCards.length, doneN);");
    expect(page).toContain("{ghosts > 0 && (");
  });
  it("footer verbs switch with the fill: empty = Help me pick + ink ＋ Add; filled = ＋ Add more + ink Work the list", () => {
    expect(page).toContain("{committedCards.length > 0 ? (");
    expect(page).toContain('className="tdb-worklist" onClick={() => scrollToLane("do")}>＋ Add</button>');
    expect(rule(".tdb-worklist")).toContain("background: var(--ink)");
    expect(rule(".tdb-pick")).toContain("flex: 1");
  });
});

describe("VI P3 — lane-head play buttons · help returns to the FAB", () => {
  it("a play button leads each lane head in BOTH views, full wording in title+aria, same handlers", () => {
    // cards view: the Lane's onFocusedSession; ledger view: the section's onSession — unchanged
    expect(page).toContain('className="tdb-playb" title={`Focus on ${label}`} aria-label={`Focus on ${label}`} onClick={onFocusedSession}');
    expect(page).toContain('className="tdb-playb" title={`Focus on ${label}`} aria-label={`Focus on ${label}`} onClick={onSession}'); // runHeading (run sheet)
    expect(page).toContain('<path d="M1.5 1.5 L9.5 6 L1.5 10.5 Z" fill="currentColor" />');
    const b = rule(".tdb-playb");
    expect(b).toContain("width: 28px; height: 28px; border-radius: 50%"); // Final Shape: 28
    expect(b).toContain("border: 1px solid rgba(58, 28, 20, 0.16)");
    expect(css).toContain(".tdb-playb:hover { transform: scale(1.06); }");
    expect(css).not.toContain("tdb-lgs"); // the pill is extinct
    expect(css).not.toContain("tdb-lanedot"); // the lane dot went with it (ref head)
  });
  it("Final Shape P4: the pagers are extinct (the grid shows everything)", () => {
    expect(page).not.toContain("tdb-pg");
    expect(css).not.toContain("tdb-reelpg");
  });
  it("ONE help entry point: the AppShell FAB (menu on /todo) — none on the page itself", () => {
    for (const stale of ["tdb-dhelp", "helpOpen", "Help centre", "Replay the tour"]) {
      expect(page).not.toContain(stale);
    }
    expect(page).toContain('window.addEventListener("sa:todo-replay-tour"'); // the board still listens
    expect(shell).toContain('if (routeKey === "todo") setHelpMenuOpen((v) => !v);');
  });
});

describe("The column scroll contract (VI P4 → Deck v2 selectors)", () => {
  it("the shared rule: sticky at the gutter, viewport-capped via the appnav token, flex column", () => {
    const shared = rule(".tdb-fside, .tdb-railr");
    expect(shared).toContain("position: sticky; top: var(--tdb-gutter)");
    expect(shared).toContain("max-height: calc(100vh - var(--tdb-appnav) - (var(--tdb-gutter) * 2))");
    expect(shared).toContain("display: flex; flex-direction: column;");
    expect(css).toContain("THE COLUMN SCROLL CONTRACT");
  });
  it("Today keeps fixed head/foot with ONE scrolling middle; verbs never scroll away", () => {
    expect(rule(".tdb-tmid2")).toContain("overflow-y: auto; min-height: 0;");
    expect(rule(".tdb-today2")).toContain("flex: 0 1 auto; min-height: 0;");
    const card = page.slice(page.indexOf('className="tdb-today2"'), page.indexOf('className="tdb-tf2"'));
    expect(card).toContain('className="tdb-tmid2"');
  });
  it("scrollbars: thin, hairline-coloured, hover/focus-visible, gutter stable", () => {
    const mids = rule(".tdb-tmid2");
    expect(mids).toContain("scrollbar-width: thin");
    expect(mids).toContain("scrollbar-gutter: stable");
    expect(css).toContain(".tdb-tmid2:hover, .tdb-tmid2:focus-within { scrollbar-color: var(--hairline) transparent; }");
  });
});

describe("III P4 — the tucked Today tab · the masthead · the naming sweep", () => {
  it("VI P1: ONE face — the column is always mounted ≥1200; the tab, drawer and empty-rail state are extinct", () => {
    expect((page.match(/\{renderTodayPanel\(\)\}/g) ?? []).length).toBe(2); // column + narrow popover — never a third copy
    for (const stale of ["tdb-ttab", "emptyRailOpen", "sa.todoRail"]) {
      expect(page).not.toContain(stale);
      expect(css).not.toContain(stale);
    }
  });
  it("THE NAMING SWEEP — no stale strings anywhere on the board or the sheets (grep-level)", () => {
    const flow = readFileSync(join(here, "FocusFlow.tsx"), "utf8");
    const tour = readFileSync(join(here, "..", "..", "lib", "todoTour.ts"), "utf8");
    for (const stale of ["Walk me through", "walkSublabel", "walkAria"]) { // "Begin focused session" is REINSTATED as the hero's button (Final Shape)
      expect(page).not.toContain(stale);
      expect(flow).not.toContain(stale);
      expect(tour).not.toContain(stale);
    }
    expect(page).toMatch(/aria-label=\{`Focus on \$\{label\}`\}/); // cards view (the play button)
    expect(page).toMatch(/onClick=\{onSession\}/); // the run sheet's heading shares the wording
    expect(page).toContain("Begin focused session"); // the rail owns the walk (v4 P2)
  });
});
