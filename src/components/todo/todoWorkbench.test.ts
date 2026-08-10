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
/* The group cards live in their own stylesheet (workspace P2) — the page's CSS is now two files,
   so `rule()` reads both rather than silently missing every .tdg- selector. */
const groupsCss = readFileSync(join(here, "todoGroups.css"), "utf8");
const page = readFileSync(join(here, "ToDoPage.tsx"), "utf8");
const shell = readFileSync(join(here, "..", "shell", "AppShell.tsx"), "utf8");
// Shell follow-up P3: TodoShell is deleted; todoShell.css survives TRIMMED (the chip bench +
// Pro sticker + their tokens, relocated to the page body).
const tshCss = readFileSync(join(here, "..", "shell", "todoShell.css"), "utf8");

/* ⚠️ ON DECLARATIONS, NOT RAW TEXT — a deletion is explained by naming what it replaced, so a
   negative asserted over the raw sheet fails on a correct file that documents itself. */
const cssDecls = (css + "\n" + groupsCss).replace(/\/\*[\s\S]*?\*\//g, "");
const rule = (sel: string, sheet: string = css + "\n" + groupsCss): string => {
  const m = sheet.match(new RegExp("(?:^|\\n)" + sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*\\{([^}]*)\\}"));
  if (!m) throw new Error(`rule not found: ${sel}`);
  return m[1];
};
const tshRule = (sel: string): string => {
  const m = tshCss.match(new RegExp("(?:^|\\n)" + sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*\\{([^}]*)\\}"));
  if (!m) throw new Error(`tsh rule not found: ${sel}`);
  return m[1];
};

describe("Final Shape P2 — THE FILTER RAIL (vertical quiet pills; the squares are extinct)", () => {
  it("the filters are chips on the CONTROL LINE — rail, sidebar and bench slab all retired — RETIRED SURFACE, see corrections fix 3 — RETIRED SURFACE (board+dock P1) — RETIRED SURFACE (board+dock P1)", () => {
    /* ⚠️ RETIRED SURFACE (board+dock P1). This page is the BOARD now — cards only. The
       Lane/ledger grammar, the standalone control bar and the view toggle went with it; the
       pieces they carried survive on the board. Page chrome: todoListChrome.test.ts. */
    expect(page).not.toContain("function renderLedger");
    expect(page).not.toContain("const [view, setView]");
    expect(page).toContain("function renderList"); // ⚠️ RETIRED AGAIN: the board → the grouped list (P2)
  });
  it("panel-final P2: the seven facets are toggle chips in the locked order, All leading (detail in todoPanelFinal) — RETIRED SURFACE, see corrections fix 3 — RETIRED SURFACE (board+dock P1) — RETIRED SURFACE (board+dock P1)", () => {
    /* ⚠️ RETIRED SURFACE (board+dock P1). This page is the BOARD now — cards only. The
       Lane/ledger grammar, the standalone control bar and the view toggle went with it; the
       pieces they carried survive on the board. Page chrome: todoListChrome.test.ts. */
    expect(page).not.toContain("function renderLedger");
    expect(page).not.toContain("const [view, setView]");
    expect(page).toContain("function renderList"); // ⚠️ RETIRED AGAIN: the board → the grouped list (P2)
  });
  it("hero-pair P1: Begin leads the HERO PAIR (same wiring); the rail begins with the filter card — RETIRED SURFACE (board+dock P4)", () => {
    /* ⚠️ FocusedSession IS RETIRED (board+dock P4) — it was a SECOND work surface, and two of
       them would have had to agree about what "done" means. The dock replaced it: "Focused
       session" and Today's "Work the list" are entrances to ONE surface. Its own locks live in
       todoDock.test.ts and todoDockSurface.test.tsx. */
    expect(page).not.toContain("<FocusedSession");
    expect(page).not.toContain("setSession(");
    expect(page).toContain("function openDock");
  });
  it("panel-final P2: the Today's-list lens is retired from the panel (it lives in the corner pop-up)", () => {
    expect(page).not.toContain("Today’s list<span"); // the lens row is gone from the filters
    expect(page).not.toContain('setF("todayOnly"'); // its only setter was removed
    expect(page).not.toContain('className="tdb-fdivider"'); // the divider above it is gone
    expect(page).toContain("matchesSearch(c, search, sctx)"); // the board still composes filters × search
  });
  it("v4 P5 → follow-up P3: the FILTER section carries no setrow (Task settings lives in the v2 sidebar; the sheet opens on its event)", () => {
    /* ⚠️ THE LITERAL BECAME A CONSTANT (To-do workspace pack, Phase 1) — TODO_OPEN_TASK_SETTINGS
       in lib/todoRoutes, because the name was typed in two files and a re-typed event name is a
       listener that silently never fires. The contract is unchanged; the assertion follows it. */
    expect(page).toContain("TODO_OPEN_TASK_SETTINGS");
    const filterFn2 = page.slice(page.indexOf("function renderFilterSection"), page.indexOf("function renderComposer"));
    expect(filterFn2).not.toContain("tdb-setrow");
    // the square-era classes stay extinct — bounded so the polish-P3 colleague's distinct
    // names (tdb-prok2 / tdb-progoP) don't false-trip the ban
    for (const stale of [/tdb-prosq/, /tdb-prok(?!2)/, /tdb-progo(?!P)/]) {
      expect(page).not.toMatch(stale);
      expect(css).not.toMatch(stale);
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
  /* ⚠️ RETARGETED TWICE, AND THE ARGUMENT ONLY GOT STRONGER. Workspace P3 retired the corner
     pop-up because Today was a route, and a floating copy of it here would be a second surface
     owning the same commitment — the two would disagree the first time one of them was wrong.
     Tasks-consolidation P1 (9 Aug) retires the ROUTE for the same reason at one level up: two
     PAGES over overlapping subsets of the same tasks is the same duplication, spread wider. One
     ranked list, one surface, one place a commitment can be true. */
  it("the corner pop-up and its panel are RETIRED — the list is the one surface", () => {
    expect(page).not.toContain('<div className="tdb-today2">');
    expect(page).not.toContain("function renderTodayCorner");
    expect(page).not.toContain("function renderTodayPanel");
    for (const inner of ["tdb-tprog", "tdb-tcommit", "tdb-ghostbox", "tdb-donerow", "tdb-pbtn", "tdb-sbtn"]) {
      expect(page).not.toContain(inner);
    }
  });
  it.skip("SUPERSEDED (top-bar rebuild): the FAB is retired — help is a bar button, its /todo menu re-anchored", () => {
    expect(shell).not.toContain('{routeKey !== "todo" && (');
    expect(shell).toContain('if (routeKey === "todo") setHelpMenuOpen((v) => !v);');
    expect(shell).toContain("Help centre"); // the menu's first item (multi-line JSX)
    expect(shell).toContain('window.dispatchEvent(new CustomEvent("sa:todo-replay-tour"))');
  });
});

describe("v4 P6 — empty-state copy + sweep", () => {
  it("the empty Notes lane shows the dashed frame-1 card (notes-and-tasks P1 supersedes the quiet ＋) — RETIRED SURFACE (board+dock P1) — RETIRED SURFACE (board+dock P1)", () => {
    /* ⚠️ RETIRED SURFACE (board+dock P1). This page is the BOARD now — cards only. The
       Lane/ledger grammar, the standalone control bar and the view toggle went with it; the
       pieces they carried survive on the board. Page chrome: todoListChrome.test.ts. */
    expect(page).not.toContain("function renderLedger");
    expect(page).not.toContain("const [view, setView]");
    expect(page).toContain("function renderList"); // ⚠️ RETIRED AGAIN: the board → the grouped list (P2)
  });
  it("no orphan Pro-square / RESET / header-Begin selectors; the tour targets the rail's button", () => {
    for (const stale of ["tdb-prosq", "tdb-frst", "tdb-herorow", "tdb-fsb\""]) {
      expect(page).not.toContain(stale.replace("\\", ""));
      expect(css).not.toContain(stale.replace("\\", ""));
    }
    const tour = readFileSync(join(here, "..", "..", "lib", "todoTour.ts"), "utf8");
    expect(tour).toContain('sel: ".tdb-herobegin"'); // hero-pair P5: Begin moved to the pair
  });
});

describe("frame P2 — THE BUTTON LAW (ink primary + hairline secondaries; the press is retired)", () => {
  it("the primitives: tailored ink (#2a1a13/#1d100c/cream, 600, .02em, 42/34) + two-tone hairlines (34)", () => {
    const p = rule(".tdb-btnp");
    expect(p).toContain("background: #2a1a13");
    expect(p).toContain("border: 1px solid #1d100c");
    expect(p).toContain("color: #f3e7da");
    expect(p).toContain("height: 42px");
    expect(p).toContain("font-weight: 600");
    expect(p).toContain("letter-spacing: 0.02em");
    expect(p).toContain("display: inline-flex");
    expect(css).toContain(".tdb-btnp:hover:not(:disabled) { background: var(--ink); }"); // hover deepens to full ink
    expect(rule(".tdb-btnp.sm")).toContain("height: 34px");
    const h = rule(".tdb-btnh");
    expect(h).toContain("height: 34px");
    expect(h).toContain("border: 1px solid var(--line)");
    expect(h).toContain("color: #6b5a4e");
    expect(h).toContain("font-weight: 600");
    const em = rule(".tdb-btnh.em");
    expect(em).toContain("border-color: var(--ink)");
    expect(em).toContain("font-weight: 700");
  });
  it("assignment audit: ink ONLY for the singular page-level actions; rows/cards never ink-solid", () => {
    expect(page).toContain('className="tdb-btnp tdb-herobegin"'); // Begin (the hero pair)
    /* workspace P3: the census shrinks again — Today's own .tdb-pbtn went with the corner. Its
       "Work the list" is now the Today PAGE's header primary, which is PageHeader's button, not
       one of this page's. */
    expect((page.match(/className="tdb-pbtn"/g) ?? []).length).toBe(0);
    // todo rebuild P3: the review banner's ink pill became the featured card's soft-pink View.
    expect((page.match(/tdb-btnp/g) ?? []).length).toBe(1); // the shrinking ink census (Begin only)
    // the tightening P2: the ledger's action lane carries an INK primary (ref .prime) — revealed
    // on hover/focus-within inside the reserved lane, so the census admits the lane primaries.
    expect(page).toContain('className="tdb-lprime" onClick={() => openFlowCards([c])}>{VERB_LABELS.action}</button>');
    expect(page).toContain('className="tdb-lprime" onClick={open}>{VERB_LABELS.action}</button>');
    expect(page).toContain('onClick={() => toggleToday(c)}>{committed ? "−" : "＋"}</button>');
    /* workspace P3: "Help me pick" lived in the corner panel's ＋ flow and went with it. The
       function survives — it is a real selection gesture — and its next home is the Today page's
       own add flow, which is the pack that builds it. Flagged rather than silently dropped. */
    expect(page).toContain("async function helpMePick()");
    expect(page).not.toContain("setAddOpen(false)");
    // the card verbs adopt the TONES at their own compact geometry — the ink-solid face is dead
    // toolbelt P2/P3: the compact verb family is gone — the card stack rides the law's own
    // hairline primitives at 30px (no ink-solid anywhere in the expansion)
    expect(rule(".tdb-lprime")).toContain("height: 28px"); // the tightening P3: the lane's one geometry (the vstack died with the hover reveal)
    expect(css).not.toContain(".tdb-verb");
  });
  it("fixed heights + centring hold: the Today foot is ONE primary + the ＋ roundel; the toggle's active chip = white + ink ring, shadowless", () => {
    // save-and-today P2: the level PAIR is retired — one primary grows, the roundel holds its size.
    expect(rule(".tdb-pbtn")).toContain("flex: 1");
    expect(rule(".tdb-pbtn")).toContain("white-space: nowrap");
    expect(rule(".tdb-sbtn")).toContain("flex: 0 0 auto");
    // todo rebuild P1: the bordered segment is retired — the active chip takes the capsule surface.
    const on = rule(".tdb-vtog button.on");
    expect(on).toContain("background: #2a1a13"); // the tightening P1: the strip's active segment is ink
    expect(on).not.toContain("box-shadow");
  });
  it("the press is EXTINCT: no offset shadows, no translate steps, no press reduced-motion branch, no cta classes", () => {
    expect(page).not.toContain("tdb-cta");
    expect(css).not.toContain("tdb-cta");
    expect(css).not.toMatch(/box-shadow: [12]px [12]px 0/);
    expect(css).not.toContain("translate(1px, 1px)");
    expect(css).not.toContain("translate(2px, 2px)");
  });
});

describe("doc pass P3 — the document header (the grey toolbar band)", () => {
  it("THE ITEMS ROW is RETIRED (todo rebuild P1): its search + toggle joined the control line, above the board — RETIRED SURFACE (board+dock P1) — RETIRED SURFACE (board+dock P1)", () => {
    /* ⚠️ RETIRED SURFACE (board+dock P1). This page is the BOARD now — cards only. The
       Lane/ledger grammar, the standalone control bar and the view toggle went with it; the
       pieces they carried survive on the board. Page chrome: todoListChrome.test.ts. */
    expect(page).not.toContain("function renderLedger");
    expect(page).not.toContain("const [view, setView]");
    expect(page).toContain("function renderList"); // ⚠️ RETIRED AGAIN: the board → the grouped list (P2)
  });
  it("the '{n} items' line went with it — the All chip's struck total already carries the narrowed count", () => {
    expect(page).not.toContain("${shownX} of ${shownY} items");
    expect(page).not.toContain("tdb-bartext");
    expect(page).not.toContain("tdb-doct");
    expect(page).not.toContain(">To do<");
  });
  it("the view toggle is the control line's fill segment (todo rebuild P1)", () => {
    const t = rule(".tdb-vtog");
    expect(t).toContain("background: #fff"); // the tightening P1: a white capsule inside the strip
    expect(t).toContain("padding: 2px"); // the tightening P1: the ref's 2px inset
    expect(rule(".tdb-vtog button")).toContain("width: 27px"); // the tightening P1: the ref's 27×23 chips
    expect(rule(".tdb-vtog button.on")).toContain("background: #2a1a13"); // the tightening P1: active = ink
    expect(css).not.toContain(".tdb-vseg {"); // the bordered sage segment is extinct
  });
  it("NO CONTAINER is left to keep radius continuity with — and now not even a bare div", () => {
    expect(css).not.toContain(".tdb-mainc {");
    /* ⚠️ `.tdb-board` IS EXTINCT (scroll fix, 9 Aug). It was the last wrapper here and carried no
       paint at all — which is why it read as harmless and was not: a BLOCK between `.tpl-body`
       and `.tpl-zone` stopped the zone being a flex item, so its `overflow: auto` never engaged
       and the frame clipped the list. The rule this case protected (no container, no radius, no
       paint) is now met by there being nothing there. */
    expect(cssDecls).not.toContain(".tdb-board");
  });
});

describe("frame P4 — sweep", () => {
  it("the press primitives + the roundel are extinct; the tour's review stop targets the rail row", () => {
    const tour = readFileSync(join(here, "..", "..", "lib", "todoTour.ts"), "utf8");
    expect(tour).toContain('".tdb-revlink"'); // the workspace shell: the review link in the hero
    expect(tour).not.toContain("tdb-rvbox");
    expect(tour).not.toContain("tdb-rvrow");
    expect(tour).toContain("beneath Begin");
    expect(page).not.toContain("tdb-cta");
    expect(css).not.toContain("tdb-cta");
    expect(page).not.toContain("tdb-sic");
    expect(css).not.toContain("tdb-sic");
  });
  it("no tour step references Task settings (recon: none existed — nothing to retarget)", () => {
    const tour = readFileSync(join(here, "..", "..", "lib", "todoTour.ts"), "utf8");
    expect(tour).not.toContain("Task settings");
    expect(tour).not.toContain("tdb-setrow");
  });
});

describe("detail P5 — sweep", () => {
  it("the colleague, the mono meta, the moon/chevron and the chip's cup are all extinct; the banner keeps the big cup", () => {
    for (const dead of ["tdb-shmeta", "tdb-rvcups", "☾", "Snooze or dismiss ▾"]) {
      expect(page).not.toContain(dead);
      expect(css).not.toContain(dead);
    }
    expect(css).not.toMatch(/tdb-pro(?!pill|strip)/); // the colleague family; FocusFlow's propill + P5's prostrip live
    expect(page).not.toContain("tdb-rvcupb"); // todo rebuild P3: the cup asset went with the banner
  });
  it("no tour step touches the bar text or the Pro area (recon: nothing to retarget)", () => {
    const tour = readFileSync(join(here, "..", "..", "lib", "todoTour.ts"), "utf8");
    expect(tour).not.toContain("bartext");
    expect(tour).not.toContain("Showing");
    expect(tour).not.toContain("tdb-colo");
    expect(tour).not.toContain("SCRIPTALLY PRO");
  });
});

describe("detail P3 — ledger Notes parity + the clock snooze", () => {
  it("the ☰ Notes section stands even when EMPTY: the pack's wash, the dashed add-row wired to addTask — RETIRED SURFACE (board+dock P1) — RETIRED SURFACE (board+dock P1)", () => {
    /* ⚠️ RETIRED SURFACE (board+dock P1). This page is the BOARD now — cards only. The
       Lane/ledger grammar, the standalone control bar and the view toggle went with it; the
       pieces they carried survive on the board. Page chrome: todoListChrome.test.ts. */
    expect(page).not.toContain("function renderLedger");
    expect(page).not.toContain("const [view, setView]");
    expect(page).toContain("function renderList"); // ⚠️ RETIRED AGAIN: the board → the grouped list (P2)
  });
  it("the clock snooze: the plain outline clock leads the label in BOTH views from the ONE constant; moon + chevron dead", () => {
    // the clock follows TypeGlyph's grammar as a page-scoped sibling — TypeGlyph itself is
    // LOCKED to the three material ComponentTypes (the recon resolution, reported)
    expect(page).toContain('const ClockGlyph: React.FC<{ size?: number }> = ({ size = 13 }) => (');
    expect(page).toContain('<circle cx="12" cy="12" r="9" />');
    expect(page).toContain('<path d="M12 7v5l3.5 2" />');
    expect(page).toContain('stroke="currentColor"');
    // the tightening P2: the ledger's clock triggers are ICON-ONLY in the reserved lane (the
    // label survives as aria-label/title from the SAME constant); the labelled form remains on cards.
    expect((page.match(/<ClockGlyph \/>\{VERB_LABELS\.later\}/g) ?? []).length).toBe(1); // laterMenu's labelled branch (the journey sheets)
    expect((page.match(/aria-label=\{VERB_LABELS\.later\}/g) ?? []).length).toBe(3); // laterMenu icon mode + the batch row + the batch card
    expect(page).toContain('later: "Snooze or dismiss",');
    expect(page).not.toContain("☾");
    expect(page).not.toContain("Snooze or dismiss ▾");
  });
});

describe("toolbelt P3 — sweep", () => {
  it("the short-verb family is extinct in the stylesheet; the tour speaks the new grammar", () => {
    expect(css).not.toContain(".tdb-verb ");
    expect(css).not.toContain(".tdb-verb:");
    expect(css).not.toContain(".tdb-verb.");
    expect(css).not.toContain(".tdb-verbs");
    const tour = readFileSync(join(here, "..", "..", "lib", "todoTour.ts"), "utf8");
    expect(tour).toContain("Action now, Today\\u2019s list, or snooze"); // the .ts carries the \\u2019 escape
    expect(tour).not.toContain("done, Today, or later");
  });
});

describe("hero-pair P5 — sweep", () => {
  it("the toolbelt-era clothes are extinct: no stack gap, no cream chip fill, no mono pills, no dot, no fsb2", () => {
    expect(css).not.toContain(".tdb-fside"); // the floating filter rail is retired
    expect(rule(".tdb-rvchip")).not.toContain("#f3e7da"); // cream lives on the ink primary's TEXT only
    expect(css).not.toContain(".tdb-fpill"); // panel-final P4: the filter ROW-LIST is fully extinct
    for (const dead of ["tdb-rvnew", "tdb-fsb2", "renderToolbelt"]) {
      expect(page).not.toContain(dead);
      expect(css).not.toContain(dead);
    }
  });
  it("the tour speaks the new board: Begin in the pair, Show all as the reset", () => {
    const tour = readFileSync(join(here, "..", "..", "lib", "todoTour.ts"), "utf8");
    expect(tour).toContain('sel: ".tdb-herobegin"');
    expect(tour).not.toContain("tdb-fsb2");
    expect(tour).toContain("All brings everything back"); // todo rebuild P1: the chip is "All"
    expect(tour).not.toContain("RESET");
  });
});

describe("hero-pair P4 — the bold bar · the inline composer · the dialog sweep", () => {
  it("the items line is RETIRED (todo rebuild P1) — the section headings carry the counts now", () => {
    expect(css).not.toMatch(/\.tdb-bartext\s*\{/);
    expect(rule(".tdb-sec .tdb-cn")).toContain("font-family: var(--f12-mono)"); // the count beside each heading
  });
  it("the composer: the two-nature card, autofocus title, the mono hint (notes-and-tasks P2 supersedes the old textarea)", () => {
    const c = rule(".tdb-nc");
    expect(c).toContain("border: 1.5px solid var(--nt-comp-bd)");
    expect(c).toContain("box-shadow: 5px 5px 0 var(--nt-comp-block)"); // the mode-swapping offset block
    expect(rule(".tdb-nc-ttl.note")).toContain("font-family: Caveat"); // the note title is handwriting
    expect(page).toContain("autoFocus"); // the title autofocuses on open
    /* ⚠️ THE HINT SHORTENED WITH THE FOOTER ROW (fix pack, 10 Aug). It taught three things at
       once from a line nobody reads twice; the two that matter are the commit and the exit, and
       Enter now commits from the title, so the ⌘⏎ it advertised is no longer the fast path. */
    expect(page).toContain("ENTER SAVES · ESC DISMISSES"); // the mono hint, in the footer row
    expect(page).toContain('{composerEdit ? "Save changes" : isTask ? "Add the task" : "Pin the note"}'); // the save verb changes by nature
  });
  it("keyboard + outside-click law: ⌘⏎/Ctrl⏎ saves · Esc cancels (styled confirm) · outside cancels ONLY when empty", () => {
    expect(page).toContain('if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); saveComposer(); }');
    expect(page).toContain('if (e.key === "Escape") { e.stopPropagation(); e.preventDefault(); tryCloseComposer(); }');
    expect(page).toContain("if (!composerDirtyRef.current) setComposerAt(null);"); // outside cancels only when empty
  });
  it("save wires to the EXISTING addUserTask action (extended fields, no new write path); both views' seats transform in place — RETIRED SURFACE (board+dock P1) — RETIRED SURFACE (board+dock P1)", () => {
    /* ⚠️ RETIRED SURFACE (board+dock P1). This page is the BOARD now — cards only. The
       Lane/ledger grammar, the standalone control bar and the view toggle went with it; the
       pieces they carried survive on the board. Page chrome: todoListChrome.test.ts. */
    expect(page).not.toContain("function renderLedger");
    expect(page).not.toContain("const [view, setView]");
    expect(page).toContain("function renderList"); // ⚠️ RETIRED AGAIN: the board → the grouped list (P2)
  });
  it("THE DIALOG SWEEP: zero native dialogs in the To-do scope; the styled ask carries the true blocking choices", () => {
    const flow = readFileSync(join(here, "FocusFlow.tsx"), "utf8");
    const ask = readFileSync(join(here, "ConfirmAsk.tsx"), "utf8");
    for (const f of [page, flow]) {
      expect(f).not.toContain("window.prompt(");
      expect(f).not.toContain("window.alert(");
      expect(f).not.toContain("window.confirm(");
    }
    expect(ask).toContain("new Promise<boolean>((resolve) => {");
    expect((page.match(/await confirmAsk\(/g) ?? []).length).toBe(3); // quick-✓ duplicate · composer discard · delete-note/task confirm
    expect((flow.match(/await confirmAsk\(/g) ?? []).length).toBe(3); // exit guard + staged + quick guards
    expect(rule(".tdb-askwrap")).toContain("z-index: 90"); // above the flow (50) + toast (60) + modal (70)
    expect(page).toContain("{confirmAskNode}");
    expect(flow).toContain("{confirmAskNode}");
  });
});

describe("hero-pair P2 — the review is an underlined text link (the shell's .revlink)", () => {
  it("underlined text, quiet ink, hover darkens text + rule together", () => {
    const c = rule(".tdb-revlink");
    expect(c).toContain("border-bottom: 1px solid #c9bcae");
    expect(c).toContain("color: #5d5245");
    expect(c).toContain("font-size: 11px");
    expect(rule(".tdb-revlink:hover")).toContain("color: #2a1a13");
    expect(rule(".tdb-revlink:hover")).toContain("border-color: #2a1a13");
  });
  it("the ↺ rewind (TypeGlyph grammar, 12px) leads the label; the dot is GONE", () => {
    expect(page).toContain("const RewindGlyph: React.FC<{ size?: number }> = ({ size = 12 }) => (");
    expect(page).toContain('<path d="M3.5 8 A 9.5 9.5 0 1 1 3 13.5" />');
    expect(page).toContain('<path d="M3.5 3.5 v4.5 h4.5" />');
    expect(page).toContain("<RewindGlyph />");
    expect(page).not.toContain("tdb-rvnew");
    expect(css).not.toContain("tdb-rvnew");
  });
  it("unread by WEIGHT: unopened = full ink; opened softens glyph + label to muted; the same flags; weekly reset", () => {
    expect(page).toContain("className={`tdb-revlink${reviewSeen ? \" seen\" : \"\"}`}".replace(/\\/g, "")); // the shell: the review link in the hero
    expect(css).toContain(".tdb-revlink.seen { color: #8a7d6e; }"); // opened softens it
    expect(page).toContain("const reviewSeen = !reviewWin || reviewSeenWk === reviewWin.key || reviewOpened;");
    expect(page).toContain("const reviewDismissed = !reviewWin || reviewDismissedWk === reviewWin.key;"); // key mismatch on a new week resets
  });
});

describe("hero-pair P1 — the pair (SETTLED: it now leads the SIDEBAR, not the hero)", () => {
  it("Begin (ink) + the review link stack on the hero's right; the pair is hero furniture", () => {
    const hr = rule(".tdb-heroright");
    expect(hr).toContain("flex-direction: column");
    expect(hr).toContain("align-items: center");
    const right = page.slice(page.indexOf('className={`tdb-heroright'), page.indexOf("// the CTA pair"));
    const heroFn = page.slice(page.indexOf("function renderHero"), page.indexOf("function renderFilterSection"));
    expect(heroFn).toContain('className="tdb-btnp tdb-herobegin"');
    expect(heroFn).toContain("className={`tdb-revlink${reviewSeen ? \" seen\" : \"\"}`}".replace(/\\/g, ""));
  });
  it("the review link renders ONLY in its afterlife state; Begin stands alone otherwise", () => {
    expect(page).toContain("{reviewWin && (reviewSeen || reviewDismissed) && (");
    expect(page).toContain("const reviewSeen = !reviewWin || reviewSeenWk === reviewWin.key || reviewOpened;");
    expect(page).toContain("const reviewDismissed = !reviewWin || reviewDismissedWk === reviewWin.key;");
  });
  it("the FILTER chips are ONE source, mounted once on the control line — RETIRED SURFACE (board+dock P1) — RETIRED SURFACE (board+dock P1)", () => {
    /* ⚠️ RETIRED SURFACE (board+dock P1). This page is the BOARD now — cards only. The
       Lane/ledger grammar, the standalone control bar and the view toggle went with it; the
       pieces they carried survive on the board. Page chrome: todoListChrome.test.ts. */
    expect(page).not.toContain("function renderLedger");
    expect(page).not.toContain("const [view, setView]");
    expect(page).toContain("function renderList"); // ⚠️ RETIRED AGAIN: the board → the grouped list (P2)
  });
  it("Task settings + Help centre live in the v2 sidebar now; the sheet + its open event stay in the page", () => {
    // Shell follow-up P3: the panel foot retired — the v2 sidebar's user block carries both
    // links; the sheet still mounts here and opens via the sa:open-task-settings event.
    /* ⚠️ THE LITERAL BECAME A CONSTANT (To-do workspace pack, Phase 1) — TODO_OPEN_TASK_SETTINGS
       in lib/todoRoutes, because the name was typed in two files and a re-typed event name is a
       listener that silently never fires. The contract is unchanged; the assertion follows it. */
    expect(page).toContain("TODO_OPEN_TASK_SETTINGS");
    expect(page).toContain("setSettingsOpen(true)");
    expect(page).not.toContain("tdb-sic");
  });
});

describe("doc pass P2 — the width tier (≥1700 → 4-up with Today)", () => {
  it("the WIDTH TIER is retired (todo rebuild P1) — auto-fill derives the count from the width", () => {
    expect(css).toContain("@media (min-width: 1700px) { .tdb-grid { grid-template-columns: repeat(5, 1fr); } }"); // the tightening P3: the wider tier takes five
    expect(css).not.toContain("--tdb-asm"); // CENTRING FIX: the second geometry owner stays retired
  });
  it("the matrix: one fluid rule, a 272px floor, no breakpoint and no asm-width machinery", () => {
    expect(rule(".tdb-grid")).toContain("repeat(4, 1fr)"); // the tightening P3: four at the standard tier
    expect(css).not.toContain(".tdb-wrap.today-off .tdb-grid"); // the always-4 grid rule is gone
  });
  it("the edge gutter is the 32px token (the pack's 48→32), padded on the wrap", () => {
    // SHELL POLISH P1: the gutters moved to the centred column; the wrap is the bare scroller
    expect(rule(".tdb-col")).toContain("padding: var(--tdb-chrome-gap) var(--tdb-col-gutter) 48px");
    expect(rule(".tdb-col")).toContain("max-width: var(--tdb-col-max)");
    /* ⚠️ SUPERSEDED 7 Aug 2026 — THE LEFT GUTTER IS LAW. `.tdb-col` carried `margin-inline: auto`,
       which centred it on its 1360px measure; a centred column's LEFT EDGE MOVES with the width
       available to it, so pages that resolved to different widths started their titles at
       different offsets — Today and the Noteboard sat inboard of the To-do list. Content is
       LEFT-ANCHORED now and the surplus becomes RIGHT margin. What these tests were protecting —
       that no page adds a one-sided inset of its own — is unchanged and asserted below. */
    /* ⚠️ `margin-inline: 0` — an auto margin on a flex cross axis disables the stretch and
       collapsed three of four pages (7 Aug, second pass). */
    expect(rule(".tdb-col")).toContain("margin-inline: 0;");
  });
  it("the work row fills the column — no fixed width, no auto margin, no transition (centring fix)", () => {
    expect(rule(".tdb-asm")).toContain("width: 100%");
    expect(rule(".tdb-asm")).not.toContain("margin");
    expect(rule(".tdb-asm")).not.toContain("transition");
    /* `.tdb-board` is extinct (scroll fix, 9 Aug) — the list is a direct child of `.tdb-centre`,
       which is a flex column, so it gets the full width without a wrapper asking for it. */
    expect(cssDecls).not.toContain(".tdb-board");
  });
});

describe("polish P5 — sweep: dead selectors out; disabled joins the inert grammar", () => {
  it("the replaced/dead classes are extinct in the stylesheet (verified repo-dead before deletion)", () => {
    for (const dead of ["tdb-worklist", "tdb-pick", "tdb-bffind", "tdb-rdate", "tdb-ge ", "tdb-tags", "tdb-mid ", "tdb-miniav", "tdb-ffconfetti", "tdb-ffoctx", "tdb-ffofferq", "tdb-ffbt", "tdb-ffbs", "tdb-docband", "tdb-letter"]) {
      expect(css).not.toContain("." + dead.trim() + " ");
      expect(css).not.toContain("." + dead.trim() + ":");
      expect(css).not.toContain("." + dead.trim() + ",");
    }
  });
  it("the button law's disabled state is the INERT GRAMMAR, not opacity — the page law holds for every control", () => {
    expect(css).not.toContain(".tdb-btnp:disabled { opacity");
    expect(css).toContain(".tdb-btnp:disabled, .tdb-btnh:disabled,");
    expect(css).toMatch(/\.tdb-btnp:disabled, \.tdb-btnh:disabled,[^{]*\{\n?[^}]*cursor: not-allowed/);
  });
});

describe("polish P4 — THE REACTIVE RAIL (search-facet counts, the struck totals, the query chip)", () => {
  it("ONE derivation: the pills re-count via the SAME filterCounts over search-narrowed sets — never a parallel tally", () => {
    expect(page).toContain("const searchActive = search.trim().length > 0;");
    expect(page).toContain("? filterCounts({ doCards: sDo, hkGroups: sGroups, staleCards: sStale, ntCards: sNt, committedCount: committedCards.filter((c) => matchesSearch(c, search, sctx)).length })");
    // groups narrow WHOLE, exactly as the sheet keeps them
    expect(page).toContain("hkGroups.filter((g) => groupMatchesSearch(g, search))");
    // the match total reuses the shownX composition (cards + hkGapCount gaps)
    expect(page).toContain("sDo.length + hkGapCount(sGroups) + sStale.length + sNt.length");
    expect((page.match(/filterCounts\(/g) ?? []).length).toBe(2); // fc + searchFc — no third tally
  });
  it("the struck pair renders during search only, and only when the count CHANGED", () => {
    expect(page).toContain("searchActive && live !== base ? (<><s className=\"tdb-was\">{base}</s>{live}</>) : (<>{base}</>)");
    expect(page).toContain('{label}<span className="spine-chipn">{fnFace(count, live)}</span>'); // the chip's count wraps fnFace
    // the struck prior total keeps its treatment inside the chip count
    expect(tshRule(".spine-chipn .tdb-was")).toContain("text-decoration: line-through");
  });
  it("zero-match chips DIM in place (the live count keys the fade) — never hidden, never reordered", () => {
    expect(page).toContain("const live = searchFc ? searchFc[key] : count;");
    expect(page).toContain('live === 0 ? " zero" : ""');
    expect(tshRule(".spine-chip.zero")).toContain("opacity: 0.4"); // the tightening P1
  });
  it("the bench grows the removable query chip: quoted uppercased term, ✕ clears the search — RETIRED SURFACE, see corrections fix 3 — RETIRED SURFACE (board+dock P1) — RETIRED SURFACE (board+dock P1)", () => {
    /* ⚠️ RETIRED SURFACE (board+dock P1). This page is the BOARD now — cards only. The
       Lane/ledger grammar, the standalone control bar and the view toggle went with it; the
       pieces they carried survive on the board. Page chrome: todoListChrome.test.ts. */
    expect(page).not.toContain("function renderLedger");
    expect(page).not.toContain("const [view, setView]");
    expect(page).toContain("function renderList"); // ⚠️ RETIRED AGAIN: the board → the grouped list (P2)
  });
  it("composition holds both ways: the pills narrow the same shared filter state the search composes with", () => {
    expect(page).toContain("visibleDoCard(c, filters, today) && matchesSearch(c, search, sctx)");
    expect(page).toContain("visibleGroup(g, filters) && groupMatchesSearch(g, search)");
  });
});

describe("v4 P3 — conditional Today + the 4-up board", () => {
  it("the board is full-width — and nothing floats over it now (workspace P3)", () => {
    expect(page).toContain('className="tdb-wrap today-off"'); // the board was always full-width
    // The conditional corner is gone entirely: no mount, no shown-state, no leaving-state.
    expect(page).not.toContain("if (!todayShown) return null;");
    expect(page).not.toContain("{renderTodayCorner()}");
  });
  it("the grid FLOWS to fill: auto-fill tracks on a 272px floor, no tier (todo rebuild P1)", () => {
    expect(rule(".tdb-grid")).toContain("repeat(4, 1fr)"); // the tightening P3: four at the standard tier
    expect(css).toContain("@media (min-width: 1700px) { .tdb-grid { grid-template-columns: repeat(5, 1fr); } }"); // the tightening P3: the wider tier takes five
    expect(rule(".tdb-asm")).toContain("width: 100%"); // CENTRING FIX: the row fills the column
  });
  it("the slide went with the thing it animated (workspace P3)", () => {
    expect(css).not.toContain(".tdb-tdpop.in {");
    expect(css).not.toContain(".tdb-tdpop.out {");
    expect(page).not.toContain("window.setTimeout(() => { setTodayShown(false); setTodayLeaving(false); }, 220);");
    // …and the reduced-motion exemption went with it: there is no longer an animation to exempt.
    expect(css).not.toContain(".tdb-tdpop.in, .tdb-tdpop.out");
  });
  it("the corner card's rules are retired with the corner (workspace P3)", () => {
    expect(css).not.toContain(".tdb-today2");
    expect(css).not.toContain(".tdb-tdpop");
  });
});

describe("Final Shape P6 — remnant sweep · a11y", () => {
  it("GREP SWEEP — strip/deck/post-it/reel/ledger-table/selection remnants all extinct", () => {
    const stale = [
      "post-it", "postit", "tdb-strip", "tdb-deck", "deckPill", "tdb-reel", "reelFit", "REEL_PAGE",
      "tdb-pg", "tdb-lgrid", "tdb-ltd", "tdb-bulk", "todoSelection", "tdb-ric", // (tdb-lrow returned as doc-pass P4's row card — a different object, same name)
      "tdb-sq", "tdb-lrail", "renderStrip", "renderDeck", "soloPostit", "scroll-snap",
    ];
    for (const t of stale) {
      expect(page).not.toContain(t);
      expect(css).not.toContain(t);
    }
  });
  it("ONE chip mount on the control line (the collapse-tier overlay retired with the shell) — RETIRED SURFACE (board+dock P1) — RETIRED SURFACE (board+dock P1)", () => {
    /* ⚠️ RETIRED SURFACE (board+dock P1). This page is the BOARD now — cards only. The
       Lane/ledger grammar, the standalone control bar and the view toggle went with it; the
       pieces they carried survive on the board. Page chrome: todoListChrome.test.ts. */
    expect(page).not.toContain("function renderLedger");
    expect(page).not.toContain("const [view, setView]");
    expect(page).toContain("function renderList"); // ⚠️ RETIRED AGAIN: the board → the grouped list (P2)
  });
  it("A11Y: ONE section-heading builder, shared by both views (no duplicate heading grammars) — RETIRED SURFACE (board+dock P1)", () => {
    /* ⚠️ RETIRED SURFACE (board+dock P1). This page is the BOARD now — cards only. The
       Lane/ledger grammar, the standalone control bar and the view toggle went with it; the
       pieces they carried survive on the board. Page chrome: todoListChrome.test.ts. */
    expect(page).not.toContain("function renderLedger");
    expect(page).not.toContain("const [view, setView]");
    expect(page).toContain("function renderList"); // ⚠️ RETIRED AGAIN: the board → the grouped list (P2)
  });
});

describe("Final Shape P4 — the wrapped grid + TYPOGRAPHIC sections (todo rebuild P1)", () => {
  it("the grid: auto-fill on a 272px floor, ALL cards rendered (no truncation, no pagers)", () => {
    expect(rule(".tdb-grid")).toContain("display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px"); // the tightening P3
    expect(page).toContain('<div className="tdb-grid">{children}</div>');
    expect(page).not.toContain("tdb-reelpg");
  });
  it("the heading is TYPOGRAPHIC and static (the tightening P1): label · count · an inline hairline", () => {
    const h = rule(".tdb-sec");
    expect(h).toContain("margin: 34px 0 11px"); // the tightened rhythm
    expect(rule(".tdb-sec h2")).toContain("font-size: 17px");
    expect(rule(".tdb-sec .tdb-cn")).toContain("font-family: var(--f12-mono)");
    // the rule now lives INSIDE the line and fills the remaining width; the family stub is retired
    const r = rule(".tdb-secrule");
    expect(r).toContain("flex: 1");
    expect(r).toContain("height: 1px");
    expect(css).not.toContain(".tdb-secrule.do");
    expect(css).not.toContain(".tdb-secrule.hk");
    expect(css).not.toContain(".tdb-secrule.nt");
    // nothing sticky, no play button, no bar
    expect(h).not.toContain("position: sticky");
    expect(css).not.toContain(".tdb-lh2 {");
    expect(page).not.toContain("tdb-playb");
  });
  it("the hover invariants hold (the hotfix suite re-asserts the cell/surface law)", () => {
    expect(rule(".tdb-cell")).not.toContain("height:"); // the tightening P3: a plain grid item (the shared min-height lives on the CARD)
    expect(css).not.toContain(".tdb-vwrap"); // the hover-reveal machinery is extinct (the foot is always present)
  });
});

describe("polish P3 — the centre stack: three sibling containers", () => {
  it("review card · sheet — siblings inside .tdb-centre; the sheet holds neither", () => {
    const centre = page.indexOf('className="tdb-centre"');
    const box = page.indexOf('className="tdb-brief"'); // briefing-slot P1
    const zone = page.indexOf("<TplZone scrollRef={zoneRef}");
    expect(centre).toBeGreaterThan(0);
    expect(box).toBeGreaterThan(centre);
    /* ⚠️ THE THIRD SIBLING IS THE ZONE ITSELF NOW — `.tdb-board` wrapped it and is extinct (scroll
       fix, 9 Aug). The ORDER is what this case protects and it is unchanged: centre → briefing →
       the body. (The zone renders from `renderList`, below the return, so its position in the
       file is the render function's; the ORDER assertion that matters is the one above it.) */
    expect(zone).toBeGreaterThan(0);
    // panel-final P3: the Pro colophon LEFT the content stack for the panel-foot blue sticker
    expect(page).not.toContain("<ProBanner");
    const c = rule(".tdb-centre");
    expect(c).toContain("width: 100%"); // SHELL POLISH P1: the panel fills the centred column
    expect(c).toContain("flex-direction: column");
    expect(c).toContain("gap: var(--tdb-hero-gap)"); // the 26px hero→panel gap
    expect(c).toContain("min-height: 0"); // scroll fix, 9 Aug: the zero minimum the chain needs
    expect(cssDecls).not.toContain(".tdb-board"); // extinct — it broke the chain it sat in
    expect(page).not.toContain("tdb-docband");
    expect(css).not.toContain("tdb-docband");
  });
  it("detail P2 — the BAR LINE is retired (todo rebuild P1); the toggle keeps its two views — RETIRED SURFACE (board+dock P1) — RETIRED SURFACE (board+dock P1)", () => {
    /* ⚠️ RETIRED SURFACE (board+dock P1). This page is the BOARD now — cards only. The
       Lane/ledger grammar, the standalone control bar and the view toggle went with it; the
       pieces they carried survive on the board. Page chrome: todoListChrome.test.ts. */
    expect(page).not.toContain("function renderLedger");
    expect(page).not.toContain("const [view, setView]");
    expect(page).toContain("function renderList"); // ⚠️ RETIRED AGAIN: the board → the grouped list (P2)
  });
  it("ONE review surface repo-wide: the briefing slot; the banner, card + strip classes are extinct", () => {
    expect(page).not.toContain("tdb-rvhead");
    expect(css).not.toContain("tdb-rvhead");
    expect(page).not.toContain("tdb-rvbox");
    expect(page).not.toContain("tdb-feat"); // the featured card is superseded
    expect((page.match(/className="tdb-brief"/g) ?? []).length).toBe(1);
    expect(page).not.toContain(">Open it ›</button>");
  });
});

describe("Final Shape P1 — the hero + the floating search", () => {
  it("THE WORKSPACE SHELL: the hero is title + subtitle left, the CTA pair right (the search moved to the bar)", () => {
    expect(page).toContain('>What’s on your desk?</h1>'); // v7: the crossfade pair (t1/t2)
    expect(rule(".tdb-ask")).toContain("font-size: 33px"); // the workspace shell: the plain-page hero title
    const hero = page.slice(page.indexOf("function renderHero"), page.indexOf("function renderFilterSection"));
    expect(hero).toContain("tdb-herohead"); // the plain-page hero row
    expect(hero).toContain("Begin focused session"); // the CTA pair lives here now
    expect(hero).toContain("Here’s everything on your to-do list."); // the subtitle
    expect(hero).not.toContain("tdb-bigsearch"); // the search is NOT in the hero
  });
  it("the search relocated to the CONTROL LINE as a fill field — same state, same ⌘K target — RETIRED SURFACE (board+dock P1) — RETIRED SURFACE (board+dock P1)", () => {
    /* ⚠️ RETIRED SURFACE (board+dock P1). This page is the BOARD now — cards only. The
       Lane/ledger grammar, the standalone control bar and the view toggle went with it; the
       pieces they carried survive on the board. Page chrome: todoListChrome.test.ts. */
    expect(page).not.toContain("function renderLedger");
    expect(page).not.toContain("const [view, setView]");
    expect(page).toContain("function renderList"); // ⚠️ RETIRED AGAIN: the board → the grouped list (P2)
  });
  it("the ⌘K advert is gone and the shortcut still focuses the (relocated) search", () => {
    expect(page).not.toContain("<kbd aria-hidden>⌘K</kbd>");
    /* ⚠️ THE CONDITION MOVED OUT OF THE PAGE (9 Aug, sticky-headings pass): it is
       `focusesSearch` in `lib/taskShortcuts` now, exercised directly in tasksList.test.tsx
       alongside the new bare-`/` form. This lock keeps the half that is this file's — the page
       ASKS rather than deciding, and it still focuses the field. */
    expect(page).toContain("focusesSearch(e, isTypingTarget(e.target))");
    expect(page).toContain("searchRef.current?.focus()");
    expect(page).toContain("const searchActive = search.trim().length > 0;");
  });
  it("⌘K guards on visibility (the page stays mounted behind other routes); Esc chain: search then filters", () => {
    expect(page).toContain("wrapRef.current.offsetParent === null");
    expect(page).toContain('if (search) { setSearch(""); return; }');
    expect(page).toContain("if (!isResting(filtersRef.current) || filtersRef.current.todayOnly) setFilters(DEFAULT_FILTERS);");
  });
  it("view state persists under sa.todoView (default cards; P3 made the Ledger face live) — RETIRED SURFACE (board+dock P1)", () => {
    /* ⚠️ RETIRED SURFACE (board+dock P1). This page is the BOARD now — cards only. The
       Lane/ledger grammar, the standalone control bar and the view toggle went with it; the
       pieces they carried survive on the board. Page chrome: todoListChrome.test.ts. */
    expect(page).not.toContain("function renderLedger");
    expect(page).not.toContain("const [view, setView]");
    expect(page).toContain("function renderList"); // ⚠️ RETIRED AGAIN: the board → the grouped list (P2)
  });
  it("ZERO strip/deck/post-it remnants", () => {
    for (const stale of ["tdb-strip", "tdb-striprow", "tdb-tblock", "tdb-postit", "tdb-pv", "tdb-pk", "soloPostit", "renderStrip", "tdb-deck", "tdb-deckrow", "tdb-ctl", "tdb-dsrch", "tdb-vdiv", "deckPill", "tdb-dspc", "renderDeck", "tdb-fdrop", "filterDropOpen"]) {
      expect(page).not.toContain(stale);
      expect(css).not.toContain(stale);
    }
  });
});
describe("P2 — card view: the grid replaces the reels; renames land", () => {
  it("Final Shape P4 — THE WRAPPED GRID: auto-fill columns, all cards, one scroll; reels/snap stay retired", () => {
    expect(rule(".tdb-grid")).toContain("grid-template-columns: repeat(4, 1fr)"); // the tightening P3
    expect(rule(".tdb-grid")).toContain("gap: 14px");
    expect(page).toContain('<div className="tdb-grid">{children}</div>');
    expect(page).not.toContain("reelFit");
    expect(page).not.toContain("laneFit");
    expect(page).not.toContain("REEL_PAGE");
    expect(css).not.toContain("scroll-snap");
  });
  it("v2 anatomy: 27px band, 12.5px titles, content-sized cards, tighter body", () => {
    expect(rule(".tdb-band")).toContain("min-height: 27px");
    expect(rule(".tdb-tt")).toContain("font-size: 12.5px");
    expect(rule(".tdb-tile")).toContain("min-height: var(--card-minh)"); // the tightening P3: the shared height, feet pinned
    expect(rule(".tdb-body")).toContain("padding: 10px 12px 12px");
  });
  it("VI P3 → todo rebuild P1: the lane PLAY BUTTON is retired with the header bar; the batch lead stands", () => {
    expect(page).not.toContain("tdb-playb"); // a heading is a heading — no actions on it
    expect(page).toContain('className="tdb-lprime" onClick={() => setFlow({ items: [{ kind: "group", group: g }] })}>{VERB_LABELS.action}</button>'); // the batch card's lead, in the lane
    expect(page).not.toContain("Fix together");
    expect(page).not.toContain(">▶ Focus on"); // the pill text is extinct in both views
  });
});

describe("doc pass P6 — sweep", () => {
  it("quickPause is gone (call-less since the table died); the sheethead container stays extinct", () => {
    expect(page).not.toContain("quickPause");
    expect(page).not.toContain("tdb-sheethead");
    expect(css).not.toContain("tdb-sheethead");
  });
  it("the tour's card stop targets the ledger's row class (never the extinct step)", () => {
    const tour = readFileSync(join(here, "..", "..", "lib", "todoTour.ts"), "utf8");
    expect(tour).toContain('".tdb-tile, .tdb-gcard, .tdb-lrow"');
    expect(tour).not.toContain("tdb-step");
  });
  it("the reactive rail rode through; the heights hold on the law's primitives (rewritten in frame P2)", () => {
    /* corrections fix 3: the query chip went with the chip strip — the tool row's search field
       IS the search now, so there is no chip to make conditional. The heights below are the
       law's primitives and stand unchanged. */
    expect(page).not.toContain('{searchActive && ('); 
    expect(rule(".tdb-btnp")).toContain("height: 42px");
    expect(rule(".tdb-btnp.sm")).toContain("height: 34px");
    expect(rule(".tdb-btnh")).toContain("height: 34px");
  });
});

describe("grouping P4 — sweep", () => {
  it("the ref's §3 spotlight demo is NOT built here (fenced to the focused-session work)", () => {
    for (const dead of ["tdb-veil", "tdb-spot", "destination-out", "createRadialGradient"]) {
      expect(page).not.toContain(dead);
      expect(css).not.toContain(dead);
    }
  });
  it("the tour's card stop mentions expanding", () => {
    const tour = readFileSync(join(here, "..", "..", "lib", "todoTour.ts"), "utf8");
    expect(tour).toContain("Batches expand in place to show every agent");
  });
});

describe("grouping P3 — persistence + interplay", () => {
  it("expansion persists per-batch (sa.todoGroupsOpen) and is ONE state consumed by BOTH views", () => {
    expect(page).toContain('JSON.parse(localStorage.getItem("sa.todoGroupsOpen") || "{}")');
    expect(page).toContain('localStorage.setItem("sa.todoGroupsOpen", JSON.stringify(next))');
    expect(page).toContain("if (openGroups[g.rule]) return renderGroupExpanded(g);"); // cards
    expect(page).toContain("const expanded = !!openGroups[g.rule];"); // ledger
    expect((page.match(/toggleGroup\(g\.rule\)/g) ?? []).length).toBeGreaterThanOrEqual(4); // xp · gbar Collapse · row · row key
  });
  it("search narrows MEMBERS via the one matchesSearch; the bar stands with SHOWING {matched} OF {n} (both views)", () => {
    expect(page).toContain("const groupMembers = (g: HkGroup) => (searchActive ? g.members.filter((m) => matchesSearch(m.card, search, sctx)) : g.members);");
    expect(page).toContain("const groupShowing = (g: HkGroup, matched: number) => (matched === g.members.length ? `SHOWING ALL ${g.members.length}` : `SHOWING ${matched} OF ${g.members.length}`);");
    expect((page.match(/const members = groupMembers\(g\);/g) ?? []).length).toBe(2); // gx + the ledger row
    // the tightening P2: the SHOWING note rides the batch row's subtitle line (the grid has no
    // floating span between lanes)
    expect(page).toContain('groupShowing(g, members.length)');
  });
  it("member actions re-derive the counts (the bar reads g.members.length live — no cached tally); zero members prune the flag", () => {
    expect(page).toContain("{g.members.length}{copy.rest(g.members.length)}"); // the gbar title reads the LIVE derivation
    expect(page).toContain("const live = Object.entries(g).filter(([r]) => hkGroups.some((x) => x.rule === r));");
    expect(page).toContain("}, [hkGroups]);"); // the prune keys off the UNFILTERED derivation — a filtered-out group survives
  });
  it("n = 1: a group of one renders as its UNIT in both views (no batch card, no Expand, no chevron)", () => {
    expect(page).toContain("if (g.members.length === 1) return renderCard(g.members[0].card);");
    expect(page).toContain("if (g.members.length === 1) return runRow(g.members[0].card);");
  });
});

describe("grouping P2 — the ledger nest", () => {
  it("the chevron rotates 90° open; the row's non-action click TOGGLES (Action now keeps its opener) — RETIRED SURFACE (board+dock P1)", () => {
    /* ⚠️ RETIRED SURFACE (board+dock P1). This page is the BOARD now — cards only. The
       Lane/ledger grammar, the standalone control bar and the view toggle went with it; the
       pieces they carried survive on the board. Page chrome: todoListChrome.test.ts. */
    expect(page).not.toContain("function renderLedger");
    expect(page).not.toContain("const [view, setView]");
    expect(page).toContain("function renderList"); // ⚠️ RETIRED AGAIN: the board → the grouped list (P2)
  });
  it("member rows join the SAME grid (the tightening P2): inset title, tinted row, the standard lane", () => {
    // the standalone inset card (margin 40 + 3px spine) is superseded — a member IS a grid row
    expect(rule(".tdb-lrow.lsub")).toContain("background: #fbf8f2");
    expect(css).toContain(".tdb-lrow.lsub .tdb-ltask { padding-left: 14px; }");
    expect(css).toContain(".tdb-lrow.lsub .tdb-lbt.sm { font-size: 12.5px; }");
    const mr = page.slice(page.indexOf("function runMemberRow"), page.indexOf("function runBatchRow"));
    expect(mr).toContain("onClick={() => openFlowCards([c])}");
    expect(mr).toContain("rowActionLane(c, committed)"); // the identical reserved lane
    expect(page).toContain("{paged.map((m) => runMemberRow(m.card))}");
    expect(page).toContain('className="tdb-lpage" onClick={() => setPagedGroups((p) => ({ ...p, [g.rule]: true }))}>+ {remaining} more…</button>');
    expect(rule(".tdb-lpage")).toContain("border: 1.5px dashed var(--lat-bd)");
  });
  it("the parent row persists while open (progress + meta intact) as the collapse control — RETIRED SURFACE (board+dock P1)", () => {
    /* ⚠️ RETIRED SURFACE (board+dock P1). This page is the BOARD now — cards only. The
       Lane/ledger grammar, the standalone control bar and the view toggle went with it; the
       pieces they carried survive on the board. Page chrome: todoListChrome.test.ts. */
    expect(page).not.toContain("function renderLedger");
    expect(page).not.toContain("const [view, setView]");
    expect(page).toContain("function renderList"); // ⚠️ RETIRED AGAIN: the board → the grouped list (P2)
  });
});

describe("doc pass P4 — LEDGER v2 (washed sections · Action now · the head checkbox)", () => {
  it("the view toggle is LIVE both ways and persisted (sa.todoView) — RETIRED SURFACE (board+dock P1)", () => {
    /* ⚠️ RETIRED SURFACE (board+dock P1). This page is the BOARD now — cards only. The
       Lane/ledger grammar, the standalone control bar and the view toggle went with it; the
       pieces they carried survive on the board. Page chrome: todoListChrome.test.ts. */
    expect(page).not.toContain("function renderLedger");
    expect(page).not.toContain("const [view, setView]");
    expect(page).toContain("function renderList"); // ⚠️ RETIRED AGAIN: the board → the grouped list (P2)
  });
  it("the WASHED SECTIONS are retired (todo rebuild P1) — no tinted container; rows are cards on the bare capsule — RETIRED SURFACE (board+dock P1)", () => {
    /* ⚠️ RETIRED SURFACE (board+dock P1). This page is the BOARD now — cards only. The
       Lane/ledger grammar, the standalone control bar and the view toggle went with it; the
       pieces they carried survive on the board. Page chrome: todoListChrome.test.ts. */
    expect(page).not.toContain("function renderLedger");
    expect(page).not.toContain("const [view, setView]");
    expect(page).toContain("function renderList"); // ⚠️ RETIRED AGAIN: the board → the grouped list (P2)
  });
  it("the ☰ view's headings are the GROUP CARD heads now (workspace P2); the washed sticky bar stays extinct — RETIRED SURFACE (board+dock P1)", () => {
    /* ⚠️ RETIRED SURFACE (board+dock P1). This page is the BOARD now — cards only. The
       Lane/ledger grammar, the standalone control bar and the view toggle went with it; the
       pieces they carried survive on the board. Page chrome: todoListChrome.test.ts. */
    expect(page).not.toContain("function renderLedger");
    expect(page).not.toContain("const [view, setView]");
    expect(page).toContain("function renderList"); // ⚠️ RETIRED AGAIN: the board → the grouped list (P2)
  });
  it("COLLAPSE is retired with the header bar (todo rebuild P1): a heading is a heading, not a control — RETIRED SURFACE (board+dock P1)", () => {
    /* ⚠️ RETIRED SURFACE (board+dock P1). This page is the BOARD now — cards only. The
       Lane/ledger grammar, the standalone control bar and the view toggle went with it; the
       pieces they carried survive on the board. Page chrome: todoListChrome.test.ts. */
    expect(page).not.toContain("function renderLedger");
    expect(page).not.toContain("const [view, setView]");
    expect(page).toContain("function renderList"); // ⚠️ RETIRED AGAIN: the board → the grouped list (P2)
  });
  it("the actions live in the RESERVED lane (the tightening P2); Action now OPENS (both kinds), never completes — RETIRED SURFACE (board+dock P1)", () => {
    /* ⚠️ RETIRED SURFACE (board+dock P1). This page is the BOARD now — cards only. The
       Lane/ledger grammar, the standalone control bar and the view toggle went with it; the
       pieces they carried survive on the board. Page chrome: todoListChrome.test.ts. */
    expect(page).not.toContain("function renderLedger");
    expect(page).not.toContain("const [view, setView]");
    expect(page).toContain("function renderList"); // ⚠️ RETIRED AGAIN: the board → the grouped list (P2)
  });
  it("the dropdown keeps the Later items under the renamed trigger", () => {
    expect(page).toContain('><ClockGlyph />{VERB_LABELS.later}</button>'); // ONE trigger form everywhere — the clock leads it (detail P3)
    expect((page.match(/>Remind me tomorrow<\/button>/g) ?? []).length).toBe(3); // the card menu + the ledger batch row + the batch CARD
    expect((page.match(/>Give it a week<\/button>/g) ?? []).length).toBe(3);
    expect((page.match(/>Don’t show these again<\/button>/g) ?? []).length).toBe(3);
  });
  it("the leading-checkbox quick-complete is SUPERSEDED (the tightening P2, system A): the dot is a family marker — RETIRED SURFACE (board+dock P1)", () => {
    /* ⚠️ RETIRED SURFACE (board+dock P1). This page is the BOARD now — cards only. The
       Lane/ledger grammar, the standalone control bar and the view toggle went with it; the
       pieces they carried survive on the board. Page chrome: todoListChrome.test.ts. */
    expect(page).not.toContain("function renderLedger");
    expect(page).not.toContain("const [view, setView]");
    expect(page).toContain("function renderList"); // ⚠️ RETIRED AGAIN: the board → the grouped list (P2)
  });
  it("toolbelt P2 — the divergence is RETIRED: cards + ledger read ONE shared VERB_LABELS constant", () => {
    // the tightening P3: cardVerbs died with the hover stack — the card FOOT is the ledger's
    // own lane (rowActionLane's classes + the same constant), so the two views cannot diverge.
    expect(page).not.toContain("function cardVerbs");
    const foot = page.slice(page.indexOf('<div className="tdb-cfoot"'), page.indexOf("function renderGroupCard"));
    expect(foot).toContain("{VERB_LABELS.action}");
    expect(foot).toContain("aria-label={committed ? VERB_LABELS.todayRemove : VERB_LABELS.todayAdd}");
    expect(foot).toContain("laterMenu(c, true)");
    // the literals live ONCE, in the constant — nowhere inline
    expect((page.match(/: "Action now"/g) ?? []).length).toBe(1); // the constant's assignment alone
    expect((page.match(/: "Snooze or dismiss"/g) ?? []).length).toBe(1);
    expect(page).not.toContain("✓ DONE");
    expect(page).not.toContain("⚡ FIX");
    expect(page).not.toContain("LATER ▾");
    const rr = page.slice(page.indexOf("function runRow"), page.indexOf("function runBatchRow"));
    expect(rr).toContain("onClick={() => openFlowCards([c])}");
  });
  it("the step family is extinct; the 9-col ledger stays extinct", () => {
    for (const stale of ["tdb-step", "runHeading", "tdb-lgrid", "tdb-lcols", "tdb-ltd", "truncateRows"]) {
      expect(page).not.toContain(stale);
      expect(css).not.toContain(stale);
    }
  });
});
describe("P4 — search + filters (source locks; the matrix lives in todoFilters.test.ts)", () => {
  it("BOTH views read the same visible sets (cards lanes and ledger sections consume vDo/vGroups/vStale/vNt) — RETIRED SURFACE (board+dock P1)", () => {
    /* ⚠️ RETIRED SURFACE (board+dock P1) — cards only; the Lane/ledger grammar is gone. */
    expect(page).not.toContain("function renderLedger");
    expect(page).toContain("function renderList"); // ⚠️ RETIRED AGAIN: the board → the grouped list (P2)
  });
  it("the filter derivations survive the deck's death (the rail consumes them in P2)", () => {
    expect(page).toContain("filterCounts({ doCards: board.do, hkGroups, staleCards, ntCards: board.nt, committedCount: committedCards.length })");
    expect(page).toContain("togglePill");
  });
  it("filtered-empty gets the quiet one-liner + clear action, NEVER a celebratory empty", () => {
    /* The lane-skip half of this case retired with the lanes (board+dock P1); the BRANCH ORDER
       it was really protecting is unchanged and still asserted: the no-match line beats the
       board, so a narrowing that finds nothing never renders as "nothing needs you". */
    /* ⚠️ THE PANEL REPLACED THE ONE-LINER (P5, 9 Aug; sheet 4) — it names what you searched for
       and states the size of the set you get back, which is what makes clearing an informed
       choice. The BRANCH ORDER is what this case has always protected and it is unchanged. */
    const i = page.indexOf('className="tdg-empty"');
    const j = page.indexOf(") : renderList()}");
    expect(i).toBeGreaterThan(-1);
    expect(j, "the body's render call must exist").toBeGreaterThan(-1);
    expect(i, "the no-match branch must come BEFORE the body").toBeLessThan(j);
    expect(page).toContain("No tasks match");
    expect(page).toContain(">\n              Clear search\n            </button>");
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
    // tasks-pages P1: the header block is TasksPageLayout's — the layout mount precedes the body
    const band = page.indexOf("<TasksPageLayout");
    const ws = page.indexOf('className="tdb-centre"');
    expect(band).toBeGreaterThan(0);
    expect(band).toBeLessThan(ws);
    expect(page).not.toContain("tdb-herorow");
    expect(page).not.toContain("tdb-strip");
  });
  it("the hero is not sticky (scrolls away); the workspace shell owns the sidebar now", () => {
    expect(css).not.toContain(".tdb-hero {"); // the old hero wrapper is gone
    expect(css).not.toContain(".tdb-fside, .tdb-railr"); // the floating flanks retired for the shell + corner
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
    // (briefing-slot fix) the hero→panel padding is GONE — there is no panel, and it was one of
    // three stacked owners of the gap under the header rule. The first element below the rule
    // now supplies the whole gap; .tdb-ws contributes nothing.
    expect(rule(".tdb-ws")).toContain("padding: 0");
    expect(rule(".tdb-lane")).toContain("margin-bottom: var(--g24)"); // P6 rename: reel classes extinct
    expect(rule(".tdb-sec")).toContain("margin: 34px 0 11px"); // the tightening P1: the tightened rhythm
    expect(rule(".tdb-grid")).toContain("gap: 14px"); // P3: the grid gap still clears the sticker block
  });
});

describe("III P3 — the pinned pair (supersedes the II·B controls-only drawer)", () => {
  it("Final Shape P1 (transitional): the deck is extinct; filters re-land on the rail (P2), the segment in the sheet corner (P3) — RETIRED SURFACE (board+dock P1)", () => {
    /* ⚠️ RETIRED SURFACE (board+dock P1) — cards only; the Lane/ledger grammar is gone. */
    expect(page).not.toContain("function renderLedger");
    expect(page).toContain("function renderList"); // ⚠️ RETIRED AGAIN: the board → the grouped list (P2)
  });
  it("retired species stay retired; the Notes inline ＋ survives in BOTH views (the ledger's nt head gained it) — RETIRED SURFACE (board+dock P1)", () => {
    /* ⚠️ RETIRED SURFACE (board+dock P1) — cards only; the Lane/ledger grammar is gone. */
    expect(page).not.toContain("function renderLedger");
    expect(page).toContain("function renderList"); // ⚠️ RETIRED AGAIN: the board → the grouped list (P2)
  });
});

/* ⚠️ "shell P3 — Today, in its corner (the companion rail retired)" IS RETIRED (workspace P3).
   Its cases described the corner pop-up — its mount, its fixed position, its header count face and
   its rename sweep. The corner is gone: Today is a route. The retirement itself is locked in
   todayPanel.test.ts, which is the one place that should assert it — duplicating the negative
   across two files is how a retirement quietly half-comes-back. */

describe("II·B P4 — one tag grammar + card polish", () => {
  it("the grouped card wears the standard typed tag pill; the kicker grammar is retired page-wide", () => {
    expect(page).toContain('<span className="tdb-ktag">{g.meta.label.toUpperCase()}</span>'); // the tightening P3: the squared kind chip
    expect(page).not.toContain("tdb-kick");
    expect(page).not.toContain("tdb-kd");
    expect(css).not.toContain("tdb-kick");
  });
  it("BOTH views share ONE heading builder (todo rebuild P1) — the divergence is over — RETIRED SURFACE (board+dock P1)", () => {
    /* ⚠️ RETIRED SURFACE (board+dock P1). This page is the BOARD now — cards only. The
       Lane/ledger grammar, the standalone control bar and the view toggle went with it; the
       pieces they carried survive on the board. Page chrome: todoListChrome.test.ts. */
    expect(page).not.toContain("function renderLedger");
    expect(page).not.toContain("const [view, setView]");
    expect(page).toContain("function renderList"); // ⚠️ RETIRED AGAIN: the board → the grouped list (P2)
  });
  it("the batch card's Never + footer CTA are extinct (the contract); the hide lives in ☾ LATER", () => {
    expect(page).not.toContain("tdb-gnever");
    expect(page).not.toContain(">Batch fix →</button>");
    expect(page).toContain("muteRuleFromCard(g); }}>Don’t show these again</button>");
  });
});

describe("Width v4 — SUPERSEDED: the .tdb-col is the single geometry owner (centring fix)", () => {
  it("the competing --tdb-asm/--tdb-sheet assembly-width tokens are gone", () => {
    const w = rule(".tdb-wrap");
    expect(w).not.toContain("--tdb-asm");
    expect(w).not.toContain("--tdb-sheet");
    expect(w).not.toContain("--tdb-cardw"); // the tightening P3: the last flex-basis died with the absolute surface
  });
  it("the work row no longer owns geometry — .tdb-col does, alone", () => {
    expect(rule(".tdb-asm")).toContain("width: 100%");
    expect(rule(".tdb-asm")).not.toContain("margin");
    expect(rule(".tdb-col")).toContain("max-width: var(--tdb-col-max)");
    /* ⚠️ SUPERSEDED 7 Aug 2026 — THE LEFT GUTTER IS LAW. `.tdb-col` carried `margin-inline: auto`,
       which centred it on its 1360px measure; a centred column's LEFT EDGE MOVES with the width
       available to it, so pages that resolved to different widths started their titles at
       different offsets — Today and the Noteboard sat inboard of the To-do list. Content is
       LEFT-ANCHORED now and the surplus becomes RIGHT margin. What these tests were protecting —
       that no page adds a one-sided inset of its own — is unchanged and asserted below. */
    /* ⚠️ `margin-inline: 0` — an auto margin on a flex cross axis disables the stretch and
       collapsed three of four pages (7 Aug, second pass). */
    expect(rule(".tdb-col")).toContain("margin-inline: 0;");
  });
});
describe("Deck v2 P4 — the sheet · the exact-fit board · the rename", () => {
  it("THE PANEL is gone (todo rebuild P1): both views render on the bare board, capsule → cards — RETIRED SURFACE (board+dock P1)", () => {
    /* ⚠️ RETIRED SURFACE (board+dock P1). This page is the BOARD now — cards only. The
       Lane/ledger grammar, the standalone control bar and the view toggle went with it; the
       pieces they carried survive on the board. Page chrome: todoListChrome.test.ts. */
    expect(page).not.toContain("function renderLedger");
    expect(page).not.toContain("const [view, setView]");
    expect(page).toContain("function renderList"); // ⚠️ RETIRED AGAIN: the board → the grouped list (P2)
  });
  it("the grid: fluid columns that fill the capsule; the cards flow larger; no pagers, no partials", () => {
    expect(rule(".tdb-grid")).toContain("repeat(4, 1fr)"); // the tightening P3: four at the standard tier // fills the capsule
    expect(rule(".tdb-tile")).toContain("min-height: var(--card-minh)"); // the overlay faces share the card height
    expect(page).not.toContain("tdb-reelpg");
    expect(page).not.toContain("tdb-reeltrack");
    expect(css).not.toContain("tdb-pg ");
  });
  it("filtered lanes append x OF y · FILTERED · SHOW ALL (reset) — RETIRED SURFACE (board+dock P1)", () => {
    /* ⚠️ RETIRED SURFACE (board+dock P1) — cards only; the Lane/ledger grammar is gone. */
    expect(page).not.toContain("function renderLedger");
    expect(page).toContain("function renderList"); // ⚠️ RETIRED AGAIN: the board → the grouped list (P2)
  });
  it("THE LATTE LAW: bands/underline/post-it/dot latte; coffee survives only in journey-sheet headers", () => {
    expect(css).toContain("--lat-1: #f5efe6; --lat-2: #efe7d9; --lat-bd: #ddd0bc; --lat-mark: #cbb995; --lat-ink: #8a7048;");
    expect(rule(".tdb-band.hk")).toContain("var(--lat-1)");
    expect(css).not.toContain(".tdb-secrule.hk"); // the tightening P1: the family stub is retired (the dot column carries family)
    const flow = readFileSync(join(here, "FocusFlow.tsx"), "utf8");
    expect(flow).toContain("cof"); // the journey-sheet family keeps coffee
  });
  it("THE RENAME, repo-wide: zero matches of the old family phrase in src (Agent waiting everywhere)", () => {
    const { execSync } = require("node:child_process");
    const needle = "over to " + "you"; // split so this lock never matches itself
    const out = execSync(`grep -ril '${needle}' ` + join(here, "..", "..") + " || true", { encoding: "utf8" }).trim();
    expect(out).toBe("");
    const board = readFileSync(join(here, "..", "..", "lib", "todoBoard.ts"), "utf8");
    expect(board).toContain('kind: "AGENT WAITING"'); // the tightening P2: the phrase is the KIND lane's tag now
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
  it("BREAKPOINTS: the spine collapse tier retired with the shell (follow-up P3) — no page matchMedia tier remains", () => {
    expect(page).not.toContain('window.matchMedia("(max-width: 1099.98px)")');
    expect(page).not.toContain('window.matchMedia("(max-width: 1239.98px)")');
    expect(tshCss).not.toContain("@media (max-width: 1099.98px)");
    expect(page).not.toContain("tdb-fdrawer"); // the old collapsed drawer is extinct
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
/* ⚠️ "VI P1 — 'Today', always on (todo-right-column-v1.html)" IS RETIRED (workspace P3).
   Its cases described the corner pop-up — its mount, its fixed position, its header count face and
   its rename sweep. The corner is gone: Today is a route. The retirement itself is locked in
   todayPanel.test.ts, which is the one place that should assert it — duplicating the negative
   across two files is how a retirement quietly half-comes-back. */

describe("VI P3 — lane-head play buttons · help returns to the FAB", () => {
  it("the lane PLAY BUTTON is retired in BOTH views (todo rebuild P1) — REPORTED as orphaning the sweep", () => {
    // Baked 1 leaves a section as heading + rule + air. The per-lane "Focus on {label}" sweep
    // entry went with the bar; its handler (setFlow mode:"sweep") keeps no other trigger.
    expect(page).not.toContain("tdb-playb");
    expect(css).not.toContain("tdb-lgs"); // the pill is extinct
    expect(css).not.toContain("tdb-lanedot"); // the lane dot went with it (ref head)
  });
  it("Final Shape P4: the pagers are extinct (the grid shows everything)", () => {
    expect(page).not.toContain("tdb-pg");
    expect(css).not.toContain("tdb-reelpg");
  });
  it.skip("SUPERSEDED (top-bar rebuild): ONE help entry point, now the bar button rather than the FAB", () => {
    for (const stale of ["tdb-dhelp", "helpOpen", "Replay the tour"]) { // Help centre is now the shell foot's label — a valid page string
      expect(page).not.toContain(stale);
    }
    expect(page).toContain('window.addEventListener("sa:todo-replay-tour"'); // the board still listens
    expect(shell).toContain('if (routeKey === "todo") setHelpMenuOpen((v) => !v);');
  });
});

/* ⚠️ "The column scroll contract (VI P4 → Deck v2 selectors)" IS RETIRED (workspace P3) — its remaining cases all described the Today
   corner's scroll contract and its tab. Both went with the corner; see todayPanel.test.ts. */

/* ⚠️ "III P4 — the tucked Today tab · the masthead · the naming sweep" IS RETIRED (workspace P3) — its remaining cases all described the Today
   corner's scroll contract and its tab. Both went with the corner; see todayPanel.test.ts. */
