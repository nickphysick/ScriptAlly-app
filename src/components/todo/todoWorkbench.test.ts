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
// Shell follow-up P3: TodoShell is deleted; todoShell.css survives TRIMMED (the chip bench +
// Pro sticker + their tokens, relocated to the page body).
const tshCss = readFileSync(join(here, "..", "shell", "todoShell.css"), "utf8");

const rule = (sel: string): string => {
  const m = css.match(new RegExp("(?:^|\\n)" + sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*\\{([^}]*)\\}"));
  if (!m) throw new Error(`rule not found: ${sel}`);
  return m[1];
};
const tshRule = (sel: string): string => {
  const m = tshCss.match(new RegExp("(?:^|\\n)" + sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*\\{([^}]*)\\}"));
  if (!m) throw new Error(`tsh rule not found: ${sel}`);
  return m[1];
};

describe("Final Shape P2 — THE FILTER RAIL (vertical quiet pills; the squares are extinct)", () => {
  it("the filters are chips on the CONTROL LINE — rail, sidebar and bench slab all retired", () => {
    // todo rebuild P1: the last container went; the chips ride bare on the one control row.
    expect(page).toContain("{renderFilterChips()}");
    expect(page).toContain('<div className="tdb-ctrl">');
    expect(page).not.toContain('<aside className="tdb-fside" aria-label="Filters">');
    expect(page).not.toContain("tdb-benchgrow");
  });
  it("panel-final P2: the seven facets are toggle chips in the locked order, All leading (detail in todoPanelFinal)", () => {
    // the vertical row-list rail is RETIRED — the facets are wrapping chips (benchChip), same order
    const order = ["Offers", "Agent waiting", "Materials", "Wish lists", "Stale", "Snoozed", "Notes"];
    let last = -1;
    for (const l of order) { const i = page.indexOf(`benchChip("${l}"`); expect(i).toBeGreaterThan(last); last = i; }
    // All leads as the Show-all reset, before the facets, with the match total during search
    const all = page.indexOf("spine-chip all");
    expect(all).toBeGreaterThan(-1);
    expect(all).toBeLessThan(page.indexOf('benchChip("Offers"'));
    expect(page).toContain("fnFace(shownY, searchTotal ?? shownY)");
    // selected = the ink fill; a zero chip fades but renders (never hidden, never reordered)
    expect(tshRule(".spine-chip.on")).toContain("background: var(--spine-chip-on-bg)");
    expect(tshRule(".spine-chip.zero")).toContain("opacity: 0.45");
    // the ruled 'TO-DO · FILTERS' label + the old REVIEW & FILTER band are retired
    expect(page).not.toContain('contextLabel="TO-DO · FILTERS"');
    expect(page).not.toContain("REVIEW &amp; FILTER");
  });
  it("hero-pair P1: Begin leads the HERO PAIR (same wiring); the rail begins with the filter card", () => {
    expect(page).toContain('className="tdb-btnp tdb-herobegin" disabled={boardCards.length === 0}'); // the shell: Begin launches the session over the same engine queue
    expect(page).toContain("onClick={() => setSession({ queue: boardCards })}");
    expect(rule(".tdb-btnp")).toContain("height: 42px");
    // the CTA pair lives in the HERO (right side); there is no CTA in the sidebar
    const filterFn = page.slice(page.indexOf("function renderFilterSection"), page.indexOf("function renderComposer"));
    expect(filterFn).not.toContain("tdb-herobegin");
    expect(filterFn).not.toContain("Begin focused session");
    const heroFn = page.slice(page.indexOf("function renderHero"), page.indexOf("function renderFilterSection"));
    expect(heroFn).toContain("tdb-herobegin");
  });
  it("panel-final P2: the Today's-list lens is retired from the panel (it lives in the corner pop-up)", () => {
    expect(page).not.toContain("Today’s list<span"); // the lens row is gone from the filters
    expect(page).not.toContain('setF("todayOnly"'); // its only setter was removed
    expect(page).not.toContain('className="tdb-fdivider"'); // the divider above it is gone
    expect(page).toContain("matchesSearch(c, search, sctx)"); // the board still composes filters × search
  });
  it("v4 P5 → follow-up P3: the FILTER section carries no setrow (Task settings lives in the v2 sidebar; the sheet opens on its event)", () => {
    expect(page).toContain("sa:open-task-settings");
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
  it("the panel is the VI 'Today' card — ref anatomy, same state + handlers", () => {
    expect(page).toContain('<div className="tdb-today2">');
    // save-and-today P2: tdb-thr → the progress pair; the footer pair (btnh/btnp sm) → one primary + roundel
    for (const inner of ["tdb-th", "tdb-tprog", "tdb-rollbar", "tdb-tcommit", "tdb-trow", "tdb-ghostbox", "tdb-grow", "tdb-donerow", "tdb-tdone", "tdb-drow", "tdb-tf2", "tdb-pbtn", "tdb-sbtn"]) {
      expect(page).toContain(inner);
    }
    expect(rule(".tdb-th")).not.toContain("hk-sage"); // VI P1: plain paper header, no sage band
    // the add flow survives: Add more / Help me pick / ＋ Add + Work the list, same handlers
    expect(page).toContain("Work the list →"); // save-and-today P2: ONE primary replaces the ＋ Add more pair
    expect(page).toContain(">Help me pick</button>");
    expect(page).toContain('className="tdb-sbtn" aria-label="Add to Today"'); // P2: the ＋ is the roundel now
    // evening C2: Work the list is the RITUAL walk (sage whole-walk) over the same committed set
    expect(page).toContain('setFlow({ items: committedCards.map((card) => ({ kind: "card", card })), ritual: true });'); // III P1: review-free by construction, no filter
    expect(page).toContain("Work the list →"); // P2: the primary carries the arrow
  });
  it("VI P3 reversed the route hide: the FAB shows on /todo with the two-item menu; elsewhere it navigates", () => {
    expect(shell).not.toContain('{routeKey !== "todo" && (');
    expect(shell).toContain('if (routeKey === "todo") setHelpMenuOpen((v) => !v);');
    expect(shell).toContain("Help centre"); // the menu's first item (multi-line JSX)
    expect(shell).toContain('window.dispatchEvent(new CustomEvent("sa:todo-replay-tour"))');
  });
});

describe("v4 P6 — empty-state copy + sweep", () => {
  it("the empty Notes lane shows the dashed frame-1 card (notes-and-tasks P1 supersedes the quiet ＋)", () => {
    // notes-and-tasks P1: the empty Notes section now EXPLAINS what a note is for (frame 1). The
    // placeholder-free quiet ＋ + its .tdb-ghostcard CSS are retired.
    expect(page).not.toContain("Nothing jotted yet");
    expect(page).toContain('emptyNode={composerAt === "cards" ? renderComposer() : renderNotesEmpty()}');
    expect(page).toContain("Nothing pinned here yet");
    expect(page).not.toContain('className="tdb-ghostcard quiet"');
    expect(css).not.toContain(".tdb-ghostcard");
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
    // save-and-today P2: Today's primary is its own .tdb-pbtn (the ink census below shrinks by one)
    expect((page.match(/className="tdb-pbtn"/g) ?? []).length).toBe(1); // Work the list (Today)
    // todo rebuild P3: the review banner's ink pill became the featured card's soft-pink View.
    expect((page.match(/tdb-btnp/g) ?? []).length).toBe(1); // the shrinking ink census (Begin only)
    expect(page).toContain('className="tdb-btnh em" onClick={() => openFlowCards([c])}>{VERB_LABELS.action}</button>');
    expect(page).toContain('className="tdb-btnh em" onClick={open}>{VERB_LABELS.action}</button>');
    expect(page).toContain('className="tdb-btnh" onClick={() => toggleToday(c)}');
    expect(page).toContain('onClick={() => { setAddOpen(false); helpMePick(); }}>Help me pick</button>'); // relocated into the ＋ flow
    // the card verbs adopt the TONES at their own compact geometry — the ink-solid face is dead
    // toolbelt P2/P3: the compact verb family is gone — the card stack rides the law's own
    // hairline primitives at 30px (no ink-solid anywhere in the expansion)
    expect(css).toContain(".tdb-vstack .tdb-btnh { height: 30px; width: 100%; font-size: 10px; }");
    expect(css).not.toContain(".tdb-verb");
  });
  it("fixed heights + centring hold: the Today foot is ONE primary + the ＋ roundel; the toggle's active chip = white + ink ring, shadowless", () => {
    // save-and-today P2: the level PAIR is retired — one primary grows, the roundel holds its size.
    expect(rule(".tdb-pbtn")).toContain("flex: 1");
    expect(rule(".tdb-pbtn")).toContain("white-space: nowrap");
    expect(rule(".tdb-sbtn")).toContain("flex: 0 0 auto");
    // todo rebuild P1: the bordered segment is retired — the active chip takes the capsule surface.
    const on = rule(".tdb-vtog button.on");
    expect(on).toContain("background: var(--shell-canvas, #fdfbf8)");
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
  it("THE ITEMS ROW is RETIRED (todo rebuild P1): its search + toggle joined the control line, above the board", () => {
    const ctrl = page.indexOf('<div className="tdb-ctrl">');
    const board = page.indexOf('<div className="tdb-board">');
    const branch = page.indexOf('desk === "new-desk"');
    expect(ctrl).toBeLessThan(board);
    expect(board).toBeLessThan(branch); // the branch (cards ⇄ rows ⇄ desk states) lives inside the board
    expect(page).not.toContain("tdb-dochead");
    expect(page).not.toContain("tdb-sheetbody");
    expect(page).not.toContain("tdb-sheethead");
    expect(css).not.toContain("tdb-sheethead");
  });
  it("the '{n} items' line went with it — the All chip's struck total already carries the narrowed count", () => {
    expect(page).not.toContain("${shownX} of ${shownY} items");
    expect(page).not.toContain("tdb-bartext");
    expect(page).not.toContain("tdb-doct");
    expect(page).not.toContain(">To do<");
  });
  it("the view toggle is the control line's fill segment (todo rebuild P1)", () => {
    const t = rule(".tdb-vtog");
    expect(t).toContain("background: var(--shell-inset, #efe8df)"); // fill container
    expect(t).toContain("padding: 3px");
    expect(rule(".tdb-vtog button")).toContain("width: 30px");
    expect(rule(".tdb-vtog button.on")).toContain("background: var(--shell-canvas, #fdfbf8)"); // active takes the capsule
    expect(css).not.toContain(".tdb-vseg {"); // the bordered sage segment is extinct
  });
  it("NO CONTAINER is left to keep radius continuity with: the board is a bare div", () => {
    expect(css).not.toContain(".tdb-mainc {");
    const b = rule(".tdb-board");
    expect(b).not.toMatch(/border:|border-radius:/);
    expect(b).not.toContain("background:");
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
  it("the ☰ Notes section stands even when EMPTY: the pack's wash, the dashed add-row wired to addTask", () => {
    expect(page).toContain("{(!active || vNt.length > 0) && (");
    expect(page).toContain('<button type="button" className="tdb-laddrow" onClick={addTask}>＋ Add a note</button>');
    expect(page).toContain(') : composerAt === "ledger" ? renderComposer() : ('); // the add-row transforms in place
    const r = rule(".tdb-laddrow");
    expect(r).toContain("border: 1.5px dashed #d9c87a");
    expect(r).toContain("justify-content: center");
    // todo rebuild P1: the WASH is gone — sections are typographic, so no tinted container.
    expect(css).not.toContain(".tdb-lsec.n {");
    expect(rule(".tdb-lsec")).toContain("background: none");
  });
  it("the clock snooze: the plain outline clock leads the label in BOTH views from the ONE constant; moon + chevron dead", () => {
    // the clock follows TypeGlyph's grammar as a page-scoped sibling — TypeGlyph itself is
    // LOCKED to the three material ComponentTypes (the recon resolution, reported)
    expect(page).toContain('const ClockGlyph: React.FC<{ size?: number }> = ({ size = 13 }) => (');
    expect(page).toContain('<circle cx="12" cy="12" r="9" />');
    expect(page).toContain('<path d="M12 7v5l3.5 2" />');
    expect(page).toContain('stroke="currentColor"');
    expect((page.match(/<ClockGlyph \/>\{VERB_LABELS\.later\}/g) ?? []).length).toBe(3); // the card menu + ledger batch + batch card — one constant, one glyph
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
    expect(page).toContain("ESC CANCELS · ⌘⏎ SAVES · SWITCH TYPE ANY TIME BEFORE SAVING"); // the mono hint
    expect(page).toContain('{isTask ? "Add the task" : "Pin the note"}'); // the save verb changes by nature
  });
  it("keyboard + outside-click law: ⌘⏎/Ctrl⏎ saves · Esc cancels (styled confirm) · outside cancels ONLY when empty", () => {
    expect(page).toContain('if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); saveComposer(); }');
    expect(page).toContain('if (e.key === "Escape") { e.stopPropagation(); e.preventDefault(); tryCloseComposer(); }');
    expect(page).toContain("if (!composerDirtyRef.current) setComposerAt(null);"); // outside cancels only when empty
  });
  it("save wires to the EXISTING addUserTask action (extended fields, no new write path); both views' seats transform in place", () => {
    expect(page).toContain("await addUserTask({"); // the same action — extended, not forked
    expect(page).toContain("text: composerDraft.trim()");
    expect(page).toContain('setComposerAt(view === "ledger" ? "ledger" : "cards");'); // openComposer opens the seat
    expect(page).toContain('emptyNode={composerAt === "cards" ? renderComposer() :'); // the cards seat swaps
    expect(page).toContain(') : composerAt === "ledger" ? renderComposer() : ('); // the ledger add-row swaps
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
  it("the FILTER chips are ONE source, mounted once on the control line", () => {
    expect(page).not.toContain("renderToolbelt");
    expect(page).not.toContain("renderRail");
    expect(page).not.toContain("renderFilterDrawer"); // the collapsed drawer is retired
    expect((page.match(/renderFilterChips\(\)/g) ?? []).length).toBe(2); // the definition + the one mount
    const cardFn = page.slice(page.indexOf("function renderFilterChips"), page.indexOf("function renderTodayCorner"));
    expect(cardFn).not.toContain("tdb-herobegin"); // no CTA in the filters
    expect(cardFn).not.toContain("tdb-setrow");
  });
  it("Task settings + Help centre live in the v2 sidebar now; the sheet + its open event stay in the page", () => {
    // Shell follow-up P3: the panel foot retired — the v2 sidebar's user block carries both
    // links; the sheet still mounts here and opens via the sa:open-task-settings event.
    expect(page).toContain("sa:open-task-settings");
    expect(page).toContain("setSettingsOpen(true)");
    expect(page).not.toContain("tdb-sic");
  });
});

describe("doc pass P2 — the width tier (≥1700 → 4-up with Today)", () => {
  it("the WIDTH TIER is retired (todo rebuild P1) — auto-fill derives the count from the width", () => {
    expect(css).not.toContain("@media (min-width: 1700px)");
    expect(css).not.toContain("--tdb-asm"); // CENTRING FIX: the second geometry owner stays retired
  });
  it("the matrix: one fluid rule, a 272px floor, no breakpoint and no asm-width machinery", () => {
    expect(rule(".tdb-grid")).toContain("repeat(auto-fill, minmax(272px, 1fr))");
    expect(css).not.toContain(".tdb-wrap.today-off .tdb-grid"); // the always-4 grid rule is gone
  });
  it("the edge gutter is the 32px token (the pack's 48→32), padded on the wrap", () => {
    // SHELL POLISH P1: the gutters moved to the centred column; the wrap is the bare scroller
    expect(rule(".tdb-col")).toContain("padding: var(--tdb-chrome-gap) var(--tdb-col-gutter) 48px");
    expect(rule(".tdb-col")).toContain("max-width: var(--tdb-col-max)");
    expect(rule(".tdb-col")).toContain("margin-inline: auto");
  });
  it("the work row fills the column — no fixed width, no auto margin, no transition (centring fix)", () => {
    expect(rule(".tdb-asm")).toContain("width: 100%");
    expect(rule(".tdb-asm")).not.toContain("margin");
    expect(rule(".tdb-asm")).not.toContain("transition");
    expect(rule(".tdb-board")).toContain("width: 100%"); // both views render on the one bare board
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
    expect(tshRule(".spine-chip.zero")).toContain("opacity: 0.45");
  });
  it("the bench grows the removable query chip: quoted uppercased term, ✕ clears the search", () => {
    expect(page).toContain("“{search.trim().toUpperCase()}” <span aria-hidden>✕</span>");
    expect(page).toContain('className="spine-chip q" aria-label="Clear the search" onClick={() => setSearch("")}'); // the chip rides the bench
    // the query chip is the first child of the chip row, before the All chip
    expect(page.indexOf('className="spine-chip q"')).toBeLessThan(page.indexOf("spine-chip all"));
  });
  it("composition holds both ways: the pills narrow the same shared filter state the search composes with", () => {
    expect(page).toContain("visibleDoCard(c, filters, today) && matchesSearch(c, search, sctx)");
    expect(page).toContain("visibleGroup(g, filters) && groupMatchesSearch(g, search)");
  });
});

describe("v4 P3 — conditional Today + the 4-up board", () => {
  it("Today mounts only with content (committed OR done today); the corner floats over a full-width board", () => {
    expect(page).toContain("const todayActive = committedCards.length > 0 || doneN > 0;");
    expect(page).toContain("if (!todayShown) return null;"); // the corner is absent when empty
    expect(page).toContain('className="tdb-wrap today-off"'); // the board is always full-width; Today floats
  });
  it("the grid FLOWS to fill: auto-fill tracks on a 272px floor, no tier (todo rebuild P1)", () => {
    expect(rule(".tdb-grid")).toContain("repeat(auto-fill, minmax(272px, 1fr))");
    expect(css).not.toContain("@media (min-width: 1700px)");
    expect(rule(".tdb-asm")).toContain("width: 100%"); // CENTRING FIX: the row fills the column
  });
  it("the slide: in/out 220ms ease; exit lags the unmount; reduced motion = instant", () => {
    expect(css).toContain(".tdb-tdpop.in { animation: tdbTodayIn 220ms ease; }");
    expect(css).toContain(".tdb-tdpop.out { animation: tdbTodayOut 220ms ease forwards; }");
    expect(page).toContain("window.setTimeout(() => { setTodayShown(false); setTodayLeaving(false); }, 220);");
    expect(page).toContain('window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;');
    expect(css).toContain("@media (prefers-reduced-motion: reduce) { .tdb-tdpop.in, .tdb-tdpop.out { animation: none; } }");
  });
  it("the corner card: white, #ddd2c2 hairline, radius 14, the OVERLAY ELEVATION PAIR (save-and-today P2)", () => {
    const c = rule(".tdb-today2");
    expect(c).toContain("border: 1px solid #ddd2c2");
    expect(c).toContain("border-radius: 14px");
    // P2: a two-layer shadow (ambient + contact) that deepens on hover — and NEVER an opacity change
    expect(c).toContain("box-shadow: var(--td-elev)");
    expect(rule(".tdb-today2:hover")).toContain("box-shadow: var(--td-elev-hov)");
    expect(c).not.toMatch(/opacity/);
    const w = rule(".tdb-wrap");
    expect(w).toContain("--td-elev: 0 18px 44px rgba(58, 28, 20, 0.20), 0 2px 6px rgba(58, 28, 20, 0.10)");
    expect(w).toContain("--td-elev-hov: 0 22px 54px rgba(58, 28, 20, 0.26), 0 2px 8px rgba(58, 28, 20, 0.12)");
    expect(rule(".tdb-th")).toContain("background: var(--container-head-bg)"); // Today's header keeps the sage
    expect(rule(".tdb-th .tdb-t")).toContain("color: var(--container-head-ink)");
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
  it("ONE chip mount on the control line (the collapse-tier overlay retired with the shell)", () => {
    expect((page.match(/renderFilterChips\(\)/g) ?? []).length).toBe(2); // the definition + the one mount
    expect(page).not.toContain("tdb-fdrawer");
  });
  it("A11Y: ONE section-heading builder, shared by both views (no duplicate heading grammars)", () => {
    expect((page.match(/export const SectionHead/g) ?? []).length).toBe(1);
    expect(page).not.toContain("tdb-lh2");
    expect(page).not.toContain("tdb-lsech");
  });
});

describe("Final Shape P4 — the wrapped grid + TYPOGRAPHIC sections (todo rebuild P1)", () => {
  it("the grid: auto-fill on a 272px floor, ALL cards rendered (no truncation, no pagers)", () => {
    expect(rule(".tdb-grid")).toContain("display: grid; grid-template-columns: repeat(auto-fill, minmax(272px, 1fr)); gap: 14px");
    expect(page).toContain('<div className="tdb-grid">{children}</div>');
    expect(page).not.toContain("tdb-reelpg");
  });
  it("the heading is TYPOGRAPHIC and static: Playfair 27 + a mono count over a 2px identity rule", () => {
    const h = rule(".tdb-sec");
    expect(h).toContain("margin: 46px 0 5px"); // 46px above each heading
    expect(rule(".tdb-sec h2")).toContain("font-size: 27px");
    expect(rule(".tdb-sec h2")).toContain("letter-spacing: -0.01em");
    expect(rule(".tdb-sec .tdb-cn")).toContain("font-family: var(--f12-mono)");
    const r = rule(".tdb-secrule");
    expect(r).toContain("height: 2px");
    expect(r).toContain("margin-bottom: 22px"); // 22px below the rule
    // the 96px identity stub, one colour per section
    expect(rule(".tdb-secrule.do")).toContain("#e8c8bc 0 96px");
    expect(rule(".tdb-secrule.hk")).toContain("#c3cfc0 0 96px");
    expect(rule(".tdb-secrule.nt")).toContain("#ece3da 0 96px");
    // nothing sticky, no play button, no bar
    expect(h).not.toContain("position: sticky");
    expect(css).not.toContain(".tdb-lh2 {");
    expect(page).not.toContain("tdb-playb");
  });
  it("the hover invariants hold (the hotfix suite re-asserts the cell/surface law)", () => {
    expect(rule(".tdb-cell")).toContain("height: var(--tdb-cardh)");
    expect(rule(".tdb-vwrap")).toContain("grid-template-rows: 0fr");
  });
});

describe("polish P3 — the centre stack: three sibling containers", () => {
  it("review card · sheet — siblings inside .tdb-centre; the sheet holds neither", () => {
    const centre = page.indexOf('className="tdb-centre"');
    const box = page.indexOf('className="tdb-brief"'); // briefing-slot P1
    const board = page.indexOf('className="tdb-board"');
    expect(centre).toBeGreaterThan(0);
    expect(box).toBeGreaterThan(centre);
    expect(board).toBeGreaterThan(box);
    // panel-final P3: the Pro colophon LEFT the content stack for the panel-foot blue sticker
    expect(page).not.toContain("<ProBanner");
    const c = rule(".tdb-centre");
    expect(c).toContain("width: 100%"); // SHELL POLISH P1: the panel fills the centred column
    expect(c).toContain("flex-direction: column");
    expect(c).toContain("gap: var(--tdb-hero-gap)"); // the 26px hero→panel gap
    expect(rule(".tdb-board")).toContain("width: 100%"); // todo rebuild P1: a bare board, no panel
    expect(page).not.toContain("tdb-docband");
    expect(css).not.toContain("tdb-docband");
  });
  it("detail P2 — the BAR LINE is retired (todo rebuild P1); the toggle keeps its two views", () => {
    expect(page).not.toContain("${shownX} of ${shownY} items"); // the count line went with the items row
    expect(css).not.toContain(".tdb-bartext {");
    expect(page).not.toContain("tdb-shmeta"); // the mono meta is gone
    expect(css).not.toContain("tdb-shmeta");
    expect(page).not.toContain("OPEN · SHOWING"); // no mono remnant
    expect(page).toContain('className="tdb-vtog" role="group" aria-label="View"');
    expect(page).toContain('onClick={() => pickView("cards")}');
    expect(page).toContain('onClick={() => pickView("ledger")}');
    expect(rule(".tdb-vtog")).toContain("border-radius: 10px"); // the mockup's fill segment
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
  it("the search relocated to the CONTROL LINE as a fill field — same state, same ⌘K target", () => {
    expect(page).toContain('<span className="tdb-bsearch">'); // todo rebuild P1: on the control line
    expect(page).toContain('placeholder="Search your list…"');
    expect(page).toContain("value={search}");
    expect(page).toContain("onChange={(e) => setSearch(e.target.value)}");
    expect(page).toContain("ref={searchRef}"); // the ⌘K target moved with it
    expect(css).not.toMatch(/\.tdb-hsearch\s*\{/); // the big centred pill is extinct
    expect(rule(".tdb-bsearch")).toContain("background: var(--shell-inset, #efe8df)");
    expect(page).toContain("matchesSearch(c, search, sctx)");
    // the old hero pill stays gone
    expect(page).not.toContain("tdb-bigsearch");
  });
  it("the ⌘K advert is gone and the shortcut still focuses the (relocated) search", () => {
    expect(page).not.toContain("<kbd aria-hidden>⌘K</kbd>");
    expect(page).toContain('e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)');
    expect(page).toContain("const searchActive = search.trim().length > 0;");
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
  it("Final Shape P4 — THE WRAPPED GRID: auto-fill columns, all cards, one scroll; reels/snap stay retired", () => {
    expect(rule(".tdb-grid")).toContain("grid-template-columns: repeat(auto-fill, minmax(272px, 1fr))");
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
    expect(rule(".tdb-tile")).not.toContain("min-height");
    expect(rule(".tdb-body")).toContain("padding: 10px 12px 12px");
  });
  it("VI P3 → todo rebuild P1: the lane PLAY BUTTON is retired with the header bar; the batch lead stands", () => {
    expect(page).not.toContain("tdb-playb"); // a heading is a heading — no actions on it
    expect(page).toContain('onClick={() => setFlow({ items: [{ kind: "group", group: g }] })}>{VERB_LABELS.action}</button>'); // the batch card's lead (toolbelt P2 parity)
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
    expect(page).toContain("const searchFc = searchActive");
    expect(page).toContain('{searchActive && ('); // the query chip is conditional in renderFilterSection
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
    expect(page).toContain('<span className="tdb-lshow">{groupShowing(g, members.length)}</span>');
    expect(rule(".tdb-lshow")).toContain("color: var(--lat-ink)");
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
  it("the chevron rotates 90° open; the row's non-action click TOGGLES (Action now keeps its opener)", () => {
    const c = rule(".tdb-lchev");
    expect(c).toContain("transition: transform 0.15s");
    expect(css).toContain(".tdb-lrow.open .tdb-lchev { transform: rotate(90deg); }");
    const br = page.slice(page.indexOf("function runBatchRow"), page.indexOf("function ledgerHeading"));
    expect(br).toContain("onClick={() => toggleGroup(g.rule)}");
    expect(br).toContain("aria-expanded={expanded}");
    expect(br).toContain('const open = () => setFlow({ items: [{ kind: "group", group: g }] });'); // Action now's opener survives
    expect(br).toContain('className="tdb-btnh em" onClick={open}>{VERB_LABELS.action}</button>');
  });
  it("member rows: inset 40, family-tinted 3px spine, smaller title, the STANDARD trio; pagination matches the cards", () => {
    const sub2 = rule(".tdb-lsub");
    expect(sub2).toContain("margin: 0 0 7px 40px");
    expect(sub2).toContain("border-left: 3px solid var(--lat-bd)");
    expect(css).toContain(".tdb-lsub .tdb-lbt.sm { font-size: 12.5px; }");
    const mr = page.slice(page.indexOf("function runMemberRow"), page.indexOf("function runBatchRow"));
    expect(mr).toContain("onClick={() => openFlowCards([c])}");
    expect(mr).toContain('className="tdb-btnh em" onClick={() => openFlowCards([c])}>{VERB_LABELS.action}</button>');
    expect(mr).toContain("{committed ? VERB_LABELS.todayRemove : VERB_LABELS.todayAdd}");
    expect(mr).toContain("laterMenu(c)");
    expect(page).toContain("{paged.map((m) => runMemberRow(m.card))}");
    expect(page).toContain('className="tdb-lpage" onClick={() => setPagedGroups((p) => ({ ...p, [g.rule]: true }))}>+ {remaining} more…</button>');
    expect(rule(".tdb-lpage")).toContain("border: 1.5px dashed var(--lat-bd)");
  });
  it("the parent row persists while open (progress + meta intact) as the collapse control", () => {
    const br = page.slice(page.indexOf("function runBatchRow"), page.indexOf("function ledgerHeading"));
    expect(br).toContain("tdb-minibar");
    expect(br).toContain("tdb-mmeta");
    expect(br).toContain("{expanded && (");
    expect(br).toContain("<React.Fragment key={key}>");
  });
});

describe("doc pass P4 — LEDGER v2 (washed sections · Action now · the head checkbox)", () => {
  it("the view toggle is LIVE both ways and persisted (sa.todoView)", () => {
    expect(page).toContain('view === "ledger" ? renderLedger() : (');
    expect(page).toContain('localStorage.setItem("sa.todoView"');
  });
  it("the WASHED SECTIONS are retired (todo rebuild P1) — no tinted container; rows are cards on the bare capsule", () => {
    for (const sel of [".tdb-lsec.p {", ".tdb-lsec.l {", ".tdb-lsec.n {"]) expect(css).not.toContain(sel);
    const sec = rule(".tdb-lsec");
    expect(sec).toContain("background: none");
    expect(sec).toContain("border: 0");
    // todo rebuild P2 — the ROW is the mockup's hairline card: card surface, radius 13, a
    // hover that lifts the border and adds a soft shadow.
    const row = rule(".tdb-lrow");
    expect(row).toContain("background: var(--card, #fdfaf5)");
    expect(row).toContain("border-radius: 13px");
    expect(row).toContain("border: 1px solid var(--line)");
    expect(row).toContain("margin-bottom: 10px");
    expect(rule(".tdb-lrow:hover")).toContain("box-shadow: 0 3px 12px rgba(58, 28, 20, 0.07)");
    // the 42px tinted family tile, one colour per family
    expect(rule(".tdb-ltile")).toContain("width: 42px; height: 42px; border-radius: 12px");
    expect(rule(".tdb-ltile.do")).toContain("var(--pink-b"); // pink band for urgent
    expect(rule(".tdb-ltile.hk")).toContain("var(--lat-1"); // sage/latte band for housekeeping
    expect(rule(".tdb-lbt")).toContain("font-size: 16px"); // Playfair 16 title
    expect(rule(".tdb-lbms")).toContain("font-style: italic"); // italic Playfair subtitle
  });
  it("BOTH views share ONE typographic heading (todo rebuild P1) — the washed sticky bar is extinct", () => {
    expect(css).not.toMatch(/\.tdb-lsech[\s.{]/);
    expect(page).toContain('ledgerHeading("do", "tdb-lane-do", "Urgent"');
    expect(page).toContain('ledgerHeading("hk", "tdb-lane-hk", "Housekeeping"');
    expect(page).toContain('ledgerHeading("nt", "tdb-lane-nt", "Notes to self"');
    expect(page).toContain("<SectionHead cls={lane} label={label} count={count} />"); // the shared builder
  });
  it("COLLAPSE is retired with the header bar (todo rebuild P1): a heading is a heading, not a control", () => {
    // The fold lived on .tdb-lsech, which the typographic section replaces. ledgerFold /
    // toggleFold are left in place, dormant, rather than chased down (reported, not deleted).
    expect(page).not.toContain("onClick={() => toggleFold(lane)}");
    expect(page).not.toContain('{folded ? "▸" : "▾"}');
    expect(page).not.toContain("{!ledgerFold.do &&");
    expect(page).toContain('{doSorted.map((c) => runRow(c, "do"))}'); // rows render unconditionally now
  });
  it("the actions: 32px press 'Action now' + ghosts, vertically centred; Action now OPENS (both kinds), never completes", () => {
    expect(rule(".tdb-lacts")).toContain("align-self: center");
    expect(rule(".tdb-btnh")).toContain("height: 34px"); // frame P2: the row actions ride the law's small height
    const rr = page.slice(page.indexOf("function runRow"), page.indexOf("function runBatchRow"));
    expect(rr).toContain('className="tdb-btnh em" onClick={() => openFlowCards([c])}>{VERB_LABELS.action}</button>');
    expect(rr).not.toContain("quickDone(c)}>Action now");
    expect(rr).toContain('{committed ? VERB_LABELS.todayRemove : VERB_LABELS.todayAdd}');
    const br = page.slice(page.indexOf("function runBatchRow"), page.indexOf("function ledgerHeading"));
    expect(br).toContain('const open = () => setFlow({ items: [{ kind: "group", group: g }] });');
    expect(br).toContain('className="tdb-btnh em" onClick={open}>{VERB_LABELS.action}</button>');
    expect(br).not.toContain("Today’s list"); // groups stay uncommittable — the carried resolution
  });
  it("the dropdown keeps the Later items under the renamed trigger", () => {
    expect(page).toContain('><ClockGlyph />{VERB_LABELS.later}</button>'); // ONE trigger form everywhere — the clock leads it (detail P3)
    expect((page.match(/>Remind me tomorrow<\/button>/g) ?? []).length).toBe(3); // the card menu + the ledger batch row + the batch CARD
    expect((page.match(/>Give it a week<\/button>/g) ?? []).length).toBe(3);
    expect((page.match(/>Don’t show these again<\/button>/g) ?? []).length).toBe(3);
  });
  it("quick-complete = the LEADING checkbox: the roundel ticks on row hover/focus and completes; offers + batches exempt", () => {
    expect(page).toContain('className="tdb-ldot tick" aria-label={`Mark done — ${c.title}`}');
    expect(page).toContain("onClick={(e) => { e.stopPropagation(); quickDone(c); }}");
    expect(rule(".tdb-ldot")).toContain("width: 24px");
    expect(css).toContain(".tdb-lrow:hover .tdb-ldot.tick .tdb-ldtick, .tdb-lrow:focus-within .tdb-ldot.tick .tdb-ldtick { display: inline; }");
    const ld = page.slice(page.indexOf("function ledgerDot"), page.indexOf("function runRow"));
    expect(ld).toContain('if (c.taskType === "offer_received")'); // the plain-dot branch
    const br = page.slice(page.indexOf("function runBatchRow"), page.indexOf("function ledgerHeading"));
    expect(br).toContain('<span className="tdb-lchev" aria-hidden>▶</span>'); // grouping P2: the chevron took the batch head (units keep ledgerDot)
  });
  it("toolbelt P2 — the divergence is RETIRED: cards + ledger read ONE shared VERB_LABELS constant", () => {
    const cv = page.slice(page.indexOf("function cardVerbs"), page.indexOf("function renderCard"));
    expect(cv).toContain("{VERB_LABELS.action}");
    expect(cv).toContain("{committed ? VERB_LABELS.todayRemove : VERB_LABELS.todayAdd}");
    expect(cv).toContain("laterMenu(c)");
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
  it("BOTH views read the same visible sets (cards lanes and ledger sections consume vDo/vGroups/vStale/vNt)", () => {
    expect(page).toContain("{vDo.map((c) => renderCard(c))}"); // explicit lambda — the map index must never leak into renderCard's gin param (grouping P1)
    expect(page).toContain("{vGroups.map(renderGroupCard)}");
    expect(page).toContain("{vStale.map((c) => renderCard(c))}");
    expect(page).toContain("{vNt.map((c) => renderCard(c))}");
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
    const band = page.indexOf("{renderPageHeader()}"); // todo rebuild P4: the app-wide header
    const ws = page.indexOf('className="tdb-asm tdb-ws"');
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
    expect(rule(".tdb-sec")).toContain("margin: 46px 0 5px"); // todo rebuild P1: the typographic rhythm
    expect(rule(".tdb-grid")).toContain("gap: 14px"); // P3: the grid gap still clears the sticker block
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
    // todo rebuild P1: the heading ＋ went with the header bar; "Add task or note" is the page
    // header's own action. The rows view keeps its dashed add-row.
    expect(page).not.toContain("tdb-cadd");
    expect(page).toContain('className="tdb-laddrow" onClick={addTask}');
  });
});

describe("shell P3 — Today, in its corner (the companion rail retired)", () => {
  it("ONE renderTodayPanel, mounted once, inside the corner pop-up", () => {
    expect((page.match(/\{renderTodayPanel\(\)\}/g) ?? []).length).toBe(1); // the corner is the only home
    expect(page).toContain("function renderTodayCorner()");
    expect(page).toContain("{renderTodayCorner()}");
  });
  it("the corner floats bottom-right of the workspace (ref .tdpop), fixed", () => {
    const c = rule(".tdb-tdpop");
    expect(c).toContain("position: fixed");
    expect(c).toContain("right: 26px");
    expect(c).toContain("bottom: 24px");
    // save-and-today P2: 290px per the ref, tokened; the panel caps at a third of the viewport and
    // the ROWS take the overflow (so the corner never grows into the work).
    expect(c).toContain("width: var(--td-w)");
    expect(rule(".tdb-wrap")).toContain("--td-w: 290px");
    expect(c).toContain("max-height: 33vh");
    expect(rule(".tdb-tmid2")).toContain("max-height: var(--td-rows-max)");
    expect(c).toContain("z-index: 45"); // above the panel, below the toasts (60)
  });
  it("the header keeps the committed count face; the corner is absent when the list is empty", () => {
    expect(page).toContain("{doneN} / {total}"); // save-and-today P2: the header's face is the progress fraction
    expect(page).toContain("if (!todayShown) return null;"); // empty → nothing
    expect(page).not.toContain("Today · {committedCards.length} TO GO"); // the old hero chip is gone
  });
  it("the wide rail + the narrow popover machinery are retired", () => {
    expect(page).not.toContain("tdb-railr");
    expect(page).not.toContain("todayPopOpen");
    expect(page).not.toContain("aria-haspopup=\"dialog\" aria-expanded={todayPopOpen}");
    expect(page).not.toContain('window.matchMedia("(max-width: 1239.98px)")'); // the narrow driver is gone
  });
});

describe("II·B P4 — one tag grammar + card polish", () => {
  it("the grouped card wears the standard typed tag pill; the kicker grammar is retired page-wide", () => {
    expect(page).toContain('<span className="tdb-tag due">{g.meta.label.toUpperCase()}</span>');
    expect(page).not.toContain("tdb-kick");
    expect(page).not.toContain("tdb-kd");
    expect(css).not.toContain("tdb-kick");
  });
  it("BOTH views share ONE heading builder (todo rebuild P1) — the divergence is over", () => {
    expect(page).not.toContain("tdb-lh2");
    expect(page).not.toContain("tdb-lsech");
    expect(page).not.toContain("tdb-playb");
    expect((page.match(/<SectionHead /g) ?? []).length).toBe(2); // the Lane + the rows view
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
    expect(w).toContain("--tdb-cardw: 250px;"); // the card token stays (the fork-face flex-basis)
  });
  it("the work row no longer owns geometry — .tdb-col does, alone", () => {
    expect(rule(".tdb-asm")).toContain("width: 100%");
    expect(rule(".tdb-asm")).not.toContain("margin");
    expect(rule(".tdb-col")).toContain("max-width: var(--tdb-col-max)");
    expect(rule(".tdb-col")).toContain("margin-inline: auto");
  });
});
describe("Deck v2 P4 — the sheet · the exact-fit board · the rename", () => {
  it("THE PANEL is gone (todo rebuild P1): both views render on the bare board, capsule → cards", () => {
    expect(css).not.toMatch(/\.tdb-mainc\s*\{/);
    expect(css).not.toMatch(/\.tdb-sheetbody\s*\{/);
    const b = rule(".tdb-board");
    expect(b).toContain("width: 100%");
    expect(b).not.toMatch(/border:|border-radius:|padding:/); // no container clothing at all
    expect(page.indexOf('className="tdb-board"')).toBeGreaterThan(0);
    expect(page.indexOf("renderLedger()")).toBeGreaterThan(0);
  });
  it("the grid: fluid columns that fill the capsule; the cards flow larger; no pagers, no partials", () => {
    expect(rule(".tdb-grid")).toContain("repeat(auto-fill, minmax(272px, 1fr))"); // fills the capsule
    expect(rule(".tdb-tile")).toContain("flex: 0 0 var(--tdb-cardw)"); // the in-flow overlay faces keep their slot
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
    expect(rule(".tdb-secrule.hk")).toContain("#c3cfc0"); // todo rebuild P1: the section rule carries the family colour
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
describe("VI P1 — 'Today', always on (todo-right-column-v1.html)", () => {
  it("REGRESSION LOCK — no component-level const/let below the component's return (the TDZ dead zone)", () => {
    // The render helpers are declared BELOW the main return and survive only because function
    // declarations hoist. A component-body `const`/`let` down there is dead code — never
    // initialised — and any hoisted helper reading it throws a TDZ ReferenceError at first
    // render, which the root ErrorBoundary turns into an app-wide "Something went wrong"
    // (ToDoPage is a persistent slot on every workspace route). Bit twice: openSundayReview
    // (4d4fbed) and GHOST_BARS (this lock's trigger). Pure gates can't see it — this scan can.
    const ret = page.indexOf('return (\n    <div className="t-f12 spine-root">');
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
    for (const src of [css, flow, tour, board, walk]) {
      expect(src).not.toContain("oday’s list"); // catches Today's/today's alike
      // (Deck v2 legalised the uppercase form: the lens pill + sage chip are named TODAY'S LIST)
    }
    // doc pass P4 re-legalised the phrase for the Today toggle (VERB_LABELS' two forms); notes-and-
    // tasks P2 adds the composer's surfacing field "Show it in Today's list" (its label + aria-label)
    // — the phrase names the surface it feeds, deliberately. Exactly four now.
    expect((page.match(/oday’s list/g) ?? []).length).toBe(5); // + the delete confirm names Today's list when the task is on it
    expect(page).toContain("{committed ? VERB_LABELS.todayRemove : VERB_LABELS.todayAdd}"); // via the shared constant — the two literals live in VERB_LABELS alone
    expect(page).toContain('<b className="tdb-t">Today</b>');
    expect(page).toContain(">✓ TODAY</span>"); // the committed chip; the lens pill re-lands on the rail (P2)
    expect(page).toContain("{committed ? VERB_LABELS.todayRemove : VERB_LABELS.todayAdd}"); // the card stack's Today toggle (toolbelt P2)
  });
  it("the header's right slot is the PROGRESS pair (save-and-today P2 supersedes the date ⇄ '{n} OF 5' count)", () => {
    // the header now answers "how am I doing": a 52px bar + the {done}/{total} fraction, then the chevron
    expect(page).toContain("{doneN} / {total}");
    expect(page).toContain('<span className="tdb-tpbar"><i style={{ width: `${pct}%` }} /></span>');
    expect(rule(".tdb-tprog")).toContain("margin-left: auto");
    expect(rule(".tdb-tpbar")).toContain("width: 52px"); // the ref's 52px track
    expect(rule(".tdb-tpbar")).toContain("width: 52px");
    expect(rule(".tdb-pnum")).toContain("font-size: 9px");
    // the old right-slot count is gone
    expect(page).not.toContain("${committedCards.length} OF ${MAX_TODAY}");
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
  it("the footer is ONE action (save-and-today P2): ink Work the list → plus the ＋ roundel that hosts Help me pick", () => {
    // the fill-switching PAIR is retired: one primary (disabled while the list is empty, never swapped
    // for a different verb) + a quiet roundel whose menu carries Help me pick / Choose from the board.
    expect(page).toContain("Work the list →");
    expect(page).toContain('className="tdb-pbtn"');
    expect(page).toContain("disabled={committedCards.length === 0}");
    expect(page).toContain('className="tdb-sbtn" aria-label="Add to Today"');
    expect(page).toContain('<button type="button" role="menuitem" onClick={() => { setAddOpen(false); helpMePick(); }}>Help me pick</button>');
    expect(page).toContain('onClick={() => { setAddOpen(false); scrollToLane("do"); }}>Choose from the board</button>');
    // the old fill-switch and its ghost verbs are gone from the footer
    expect(page).not.toContain('className="tdb-btnh" onClick={() => scrollToLane("do")}>＋ Add</button>');
    expect(page).not.toContain("＋ Add more");
  });
});

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
  it("ONE help entry point: the AppShell FAB (menu on /todo) — none on the page itself", () => {
    for (const stale of ["tdb-dhelp", "helpOpen", "Replay the tour"]) { // Help centre is now the shell foot's label — a valid page string
      expect(page).not.toContain(stale);
    }
    expect(page).toContain('window.addEventListener("sa:todo-replay-tour"'); // the board still listens
    expect(shell).toContain('if (routeKey === "todo") setHelpMenuOpen((v) => !v);');
  });
});

describe("The column scroll contract (VI P4 → Deck v2 selectors)", () => {
  it("the Today corner is the sole internally-scrolling column now (the flanks retired)", () => {
    expect(css).not.toContain(".tdb-fside, .tdb-railr"); // the shared flank rule is gone
    expect(rule(".tdb-tdpop")).toContain("max-height: 33vh"); // save-and-today P2: never more than a third of the viewport
  });
  it("Today keeps fixed head/foot with ONE scrolling middle; verbs never scroll away", () => {
    expect(rule(".tdb-tmid2")).toContain("overflow-y: auto; min-height: 0;");
    expect(rule(".tdb-today2")).toContain("flex: 1 1 auto; min-height: 0;"); // fills the corner wrapper
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
    expect((page.match(/\{renderTodayPanel\(\)\}/g) ?? []).length).toBe(1); // ONE mount, in the corner pop-up
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
    expect(page).not.toContain("Focus on ${label}"); // todo rebuild P1: the lane play button is retired
    expect(page).toContain("Begin focused session"); // the hero's CTA (Phase 4 retires it)
  });
});
