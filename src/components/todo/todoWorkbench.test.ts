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

describe("P1→III — the sidebar (the pinned pair; sa.todoDrawer fold persisted)", () => {
  it("the PAIR: one sticky stack at the 24 offset, 12px apart, same-width floating cards", () => {
    const d = rule(".tdb-pair");
    expect(d).toContain("width: var(--tdb-sidebar)"); // V P1: 270 via the tdb token family
    expect(rule(".tdb-pair, .tdb-railr")).toContain("position: sticky; top: var(--tdb-gutter)"); // VI P4: the shared contract
    expect(d).toContain("gap: 12px");
    expect(rule(".tdb-tmid2, .tdb-fmid")).toContain("overflow-y: auto"); // VI P4: the middles scroll, never the columns
    expect(rule(".tdb-paircard")).toContain("border-radius: 16px");
  });
  it("folds to the 64px icon rail via a width transition; reduced motion kills it", () => {
    expect(rule(".tdb-pair.folded")).toContain("width: 64px");
    expect(rule(".tdb-pair")).toContain("transition: width");
    expect(css).toMatch(/prefers-reduced-motion: reduce\) \{ \.tdb-pair \{ transition: none/);
  });
  it("fold state persists under the sa. localStorage convention (approved — never a user-doc field)", () => {
    expect(page).toContain('localStorage.getItem("sa.todoDrawer")');
    expect(page).toContain('localStorage.setItem("sa.todoDrawer", v ? "folded" : "open")');
  });
  it("the folded rail keeps Focus/⚙/unfold (the ? left with the FAB's return); retired species stay retired", () => {
    expect(page).toContain('className="tdb-pair folded"');
    expect(page).not.toContain("tdb-dwalk");
    expect(page).not.toContain("tdb-newnote");
    expect(page).not.toContain("Walk me through");
  });
  it("VI P3: the FOOT carries ⚙ ONLY (the same TaskSettingsSheet) — help lives on the AppShell FAB", () => {
    expect(page).toContain('className="tdb-fr2" onClick={() => setSettingsOpen(true)}'); // IV P2 footer row
    expect(page).not.toContain("tdb-dhelp");
    expect(page).not.toContain("helpOpen");
    expect(page).not.toContain(">Help centre</button>"); // no duplicate help entry on the page
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

describe("P1 — masthead composition + the centred column", () => {
  it("one row: title+date/week · 62px post-its (II·B) · the scrap · search ⌘K · the view toggle", () => {
    expect(page).toContain("{shortHeaderDate(now)} · {weekOfQuerying(queries, new Date(now))}");
    expect(rule(".tdb-postit")).toContain("width: 56px; height: 68px"); // IV P1: both refs draw 56×68
    expect(page).toContain('className="tdb-msrch"');
    expect(page).toContain('className="tdb-vtg"');
    // Walk me through is NOT in the masthead any more (slice ends before the drawer's intro comment)
    const mast = page.slice(page.indexOf("function renderMasthead"), page.indexOf("// ── THE PINNED PAIR"));
    expect(mast).not.toContain("Walk me through");
  });
  it("type-scale: masthead title 25px (II·B), lane heads 16px", () => {
    expect(rule(".tdb-ask")).toContain("font-size: 25px"); // IV P1: one line at 25
    expect(rule(".tdb-lgt")).toContain("font-size: 16px"); // II·B P4: one head grammar, both views
  });
  it("V P1: the rows are FULL-BLEED (no cap, no centring); the content column is uncapped", () => {
    expect(rule(".tdb-col")).not.toContain("max-width");
    expect(rule(".tdb-ws")).not.toContain("max-width");
    expect(rule(".tdb-ws")).not.toContain("auto"); // V P1: left-pinned, never centred
  });
  it("⌘K guards on visibility (the page stays mounted behind other routes) and Esc clears", () => {
    expect(page).toContain("wrapRef.current.offsetParent === null");
    expect(page).toContain('if (e.key === "Escape") { setSearch("");');
  });
  it("view state persists under sa.todoView (default cards; P3 made the Ledger face live)", () => {
    expect(page).toContain('localStorage.getItem("sa.todoView")');
    expect(page).toContain('=== "ledger" ? "ledger" : "cards"'); // cards is the fallback default
  });
  it("the page-strip .tdb-band double-definition is resolved — one rule left, the card band's", () => {
    const bands = css.match(/(?:^|\n)\.tdb-band \{[^}]*\}/g) ?? [];
    expect(bands.length).toBe(1);
    expect(bands[0]).toContain("min-height: 26px"); // the CARD header band (P2-tightened), not the page strip
  });
});

describe("P2 — card view: the grid replaces the reels; renames land", () => {
  it("III P2 — the one-row reel renders the cards (fresh reelFit, snap, head pagers); the grid + the RETIRED laneFit stay gone", () => {
    expect(page).toContain('<div className="tdb-reeltrack" ref={ref}>{children}</div>');
    expect(page).toContain('import { reelFit, reelPage, ReelFit, REEL_CARD_MIN } from "./reelFit";');
    expect(page).toContain("el.style.setProperty(\"--reelw\", `${fit.cardWidth}px`);");
    expect(page).toContain("new ResizeObserver(check)"); // the rail's mount/unmount reflows the track → refit for free
    for (const gone of ["laneFit", "lanePageDistance", "laneFadeState", "tdb-pager\"", "tdb-scroller", "tdb-grid"]) {
      expect(page).not.toContain(gone);
    }
    expect(rule(".tdb-reeltrack")).toContain("scroll-snap-type: x mandatory");
    expect(css).toContain("@media (prefers-reduced-motion: reduce) { .tdb-reeltrack { scroll-behavior: auto; } }");
  });
  it("tightened anatomy: 26px band, 14px titles, min-height 200, tighter body", () => {
    expect(rule(".tdb-band")).toContain("min-height: 26px");
    expect(rule(".tdb-tt")).toContain("font-size: 14px");
    expect(rule(".tdb-body")).toContain("padding: 10px 12px 11px");
  });
  it("VI P3: the Focus pill became the PLAY BUTTON — full wording in title/aria; Batch fix stands", () => {
    expect(page).toContain('className="tdb-playb" title={`Focus on ${label}`} aria-label={`Focus on ${label}`} onClick={onFocusedSession}');
    expect(page).toContain(">Batch fix →</button>");
    expect(page).not.toContain("Fix together");
    expect(page).not.toContain(">▶ Focus on"); // the pill text is extinct in both views
  });
});

describe("P3 — the ledger view (source locks; derivations in todoLedger.test.ts)", () => {
  it("the view toggle is LIVE both ways and persisted (sa.todoView)", () => {
    expect(page).not.toMatch(/aria-pressed=\{view === "ledger"\} disabled/);
    expect(page).toContain('view === "ledger" ? renderLedger() :');
    expect(page).toContain('localStorage.setItem("sa.todoView", v)');
  });
  it("the STATUS column renders the real StatusDot (13px) on card rows; batch parents/children leave it empty", () => {
    expect(page).toContain('<span className="tdb-lsd">{c.status ? <StatusDot status={c.status as QueryStatus} overrideSize={13} /> : null}</span>');
    const batch = page.slice(page.indexOf("function ledgerBatchRow"), page.indexOf("function ledgerSection"));
    expect(batch).not.toContain("StatusDot");
  });
  it("rows open the SAME journeys; the td circle is the same toggleToday; offers get no hover verbs (board law)", () => {
    const row = page.slice(page.indexOf("function ledgerCardRow"), page.indexOf("function ledgerBatchRow"));
    expect(row).toContain("onClick={() => openFlowCards([c])}");
    expect(row).toContain("toggleToday(c)");
    expect(row).toContain("{!isOffer && <button");
  });
  it("batch expansion: session-only, default collapsed; collapse restores the captured scroll", () => {
    expect(page).toContain("const [openBatches, setOpenBatches] = useState<Record<string, boolean>>({});");
    expect(page).toContain("batchScroll.current[rule] = wrapRef.current?.scrollTop ?? 0;");
    expect(page).toContain("wrapRef.current.scrollTop = batchScroll.current[rule] ?? wrapRef.current.scrollTop;");
  });
  it("the ADD → deep-link reorders the SAME group's members target-first (no FocusFlow change); childmore opens the whole batch", () => {
    expect(page).toContain("const members = [...g.members.filter((m) => m.agentId === agentId), ...g.members.filter((m) => m.agentId !== agentId)];");
    expect(page).toContain('setFlow({ items: [{ kind: "group", group: { ...g, members } }] });');
    expect(page).toContain(">OPEN BATCH FIX — WORK THROUGH ALL {g.members.length} →</button>");
  });
  it("SHOW ALL truncation is wired per section; children never count (top-level rows only)", () => {
    expect(page).toContain(">SHOW ALL {opts.total} →</button>");
    expect(page).toContain("truncateRows(doSorted, !!showAllSec.do)");
  });
  it("tinted section heads carry the play button; the note head is the flagged extension", () => {
    expect(css).toContain(".tdb-lghead.p { background: linear-gradient(180deg, var(--pink-t), var(--pink-btn)); border-color: var(--pink-b); }");
    expect(css).toContain(".tdb-lghead.c { background: linear-gradient(180deg, var(--hk-cof), var(--hk-cof-2)); border-color: var(--hk-cof-edge); }");
    expect(css).toContain(".tdb-lghead.n { background: var(--note-t); border-color: var(--note-b); }");
    expect(page).toContain('className="tdb-playb" title={`Focus on ${opts.label}`} aria-label={`Focus on ${opts.label}`} onClick={opts.onSession}'); // VI P3: the ledger head's play button
  });
  it("the shared 9-col grid is one template for header row and rows; the ledger tag stays white-law legal", () => {
    expect(css).toContain(".tdb-lgrid, .tdb-lcols, .tdb-lrow { display: grid; grid-template-columns: 34px 30px 132px 232px minmax(180px, 1fr) 152px 64px 150px 84px;");
    const cof = css.match(/\.tdb-tag\.cof \{([^}]*)\}/)?.[1] ?? "";
    expect(cof).not.toContain("background"); // border/ink only — the white fill stands
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
  it("III P3 — the pill cloud is the filter surface (real aria-pressed buttons; the same TodoFilterState)", () => {
    for (const call of ['fpill("★ OFFERS", "offers", fc.offers, "p")', 'fpill("OVER TO YOU", "overToYou", fc.overToYou, "p")', 'fpill("MATERIALS", "materials", fc.materials, "c")', 'fpill("WISH LISTS", "mswl", fc.mswl, "c")', 'fpill("STALE", "stale", fc.stale, "c")', 'fpill("SNOOZED", "snoozed", fc.snoozed, "c")', 'fpill("✓ ON TODAY ONLY", "todayOnly", null, "s")']) {
      expect(page).toContain(call);
    }
    expect(page).toContain("aria-pressed={filters[key]}");
    expect(page).toContain("filterCounts({ doCards: board.do, hkGroups, staleCards, ntCards: board.nt, committedCount: committedCards.length })");
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
  it("search state: ⌘K focuses (visibility-guarded, P1) and Esc clears + blurs", () => {
    expect(page).toContain('placeholder="Search your desk…"');
    expect(page).toContain('if (e.key === "Escape") { setSearch(""); (e.target as HTMLInputElement).blur(); }');
  });
});

describe("P5 — selection · keyboard · bulk · kebab (source locks; the reducer in todoSelection.test.ts)", () => {
  it("row checkboxes: hover-revealed, shift-aware, parents select as ONE key; children have no checkbox", () => {
    expect(page).toContain("clickSelect(c.key, e.shiftKey)");
    expect(page).toContain("clickSelect(`group-${g.rule}`, e.shiftKey)");
    const child = page.slice(page.indexOf("{open && kids.map((k) =>"), page.indexOf("{open && ("));
    expect(child).not.toContain("tdb-lsel");
    expect(css).toContain(".tdb-lrow:hover .tdb-lsel, .tdb-lrow:focus-within .tdb-lsel, .tdb-lsel:checked, .tdb-lrow.lsel-on .tdb-lsel { visibility: visible; }");
  });
  it("the bulk bar rides a live selection and acts through the EXISTING primitives with one undo-all", () => {
    expect(page).toContain('view === "ledger" && selVisible.length > 0 && (');
    expect(page).toContain(">＋ Today</button>"); // VI P1 rename
    expect(page).toContain(">⏸ Snooze</button>");
    expect(page).toContain(">Dismiss</button>");
    // today respects the cap via the same setCommitted; snooze/dismiss are the same flag writes
    expect(page).toContain("let room = MAX_TODAY - committedCards.length;");
    expect(page).toContain('dismissTask(row.c.taskType, row.c.relatedRecordId, "fixed snooze", 7);');
    expect(page).toContain("snoozedUntil: MUTED_UNTIL");
    expect(page).toContain('label: "Undo all"');
  });
  it("the keyboard layer is additive and guarded (ledger only, not while typing, not under a journey, visible board)", () => {
    expect(page).toContain('if (ctx.view !== "ledger" || ctx.flow) return;');
    expect(page).toContain('t.closest("input, textarea, select, [contenteditable=true]")');
    expect(page).toContain('k === "ArrowDown" || k === "j"');
    expect(page).toContain('if (k === "Enter") { e.preventDefault(); openRow(key); return; }');
    expect(page).toContain('if (k === "t" && row?.kind === "card")');
    expect(page).toContain('if (k === "s")');
  });
  it("the focus ring is a visible ink outline (a11y) and rows carry data-lkey for nearest-scroll", () => {
    expect(css).toContain(".tdb-lrow.kfocus { outline: 2px solid var(--ink); outline-offset: -2px;");
    expect(page).toContain('data-lkey={c.key}');
    expect(page).toContain('scrollIntoView({ block: "nearest" })');
  });
  it("the kebab carries the rare verbs (Dismiss · Open query · Task settings); offers get none (board law)", () => {
    expect(page).toContain(">Dismiss</button>");
    expect(page).toContain(">Open query</button>");
    expect(page).toContain(">Task settings</button>");
    expect(page).toContain('onNavigate("queries", c.relatedRecordId)'); // the ?q= deep-selection contract
    expect(page).toMatch(/\{!isOffer && \(\s*<button type="button" title="More"/);
  });
});

describe("A1 — the masthead band (evening run; amends the shell ref in place)", () => {
  it("a full-width paper band with the 1px base rule wraps the masthead, ABOVE the drawer row", () => {
    expect(rule(".tdb-mastband")).toContain("background: var(--paper)");
    expect(rule(".tdb-mastband")).toContain("border-bottom: 1px solid var(--line)");
    const band = page.indexOf('className="tdb-mastband"');
    const ws = page.indexOf('className="tdb-ws"');
    expect(band).toBeGreaterThan(0);
    expect(band).toBeLessThan(ws); // band renders before (above) the drawer+column row
    expect(page).toContain('<div className="tdb-mastspacer" aria-hidden />'); // IV P1: variant B's spacer
  });
  it("the band is FULL-BLEED like the workspace row (V P1); the board column no longer hosts the masthead", () => {
    expect(rule(".tdb-mastcol")).not.toContain("max-width");
    expect(rule(".tdb-mastcol")).not.toContain("margin");
    const col = page.slice(page.indexOf('className="tdb-col"'), page.indexOf('className="tdb-lanes"'));
    expect(col).not.toContain("renderMasthead");
  });
  it("the band is not sticky (scrolls away); the drawer's sticky offset rides the 24-grid (II·B)", () => {
    expect(rule(".tdb-mastband")).not.toContain("sticky");
    expect(rule(".tdb-pair, .tdb-railr")).toContain("position: sticky; top: var(--tdb-gutter)"); // VI P4: the shared contract
  });
});

describe("A2 — ledger copy + the avatar stack (source locks)", () => {
  it("the batch parent's TASK cell reads batchTaskCopy (one source); the tag stays the meta label", () => {
    expect(page).toContain('<span className="tdb-lti">{batchTaskCopy(g.rule)}</span>');
    expect(page).toContain("{g.meta.label.toUpperCase()}");
  });
  it("the batch avatar stack overlaps −7px with white keylines", () => {
    expect(css).toContain(".tdb-lstack .tdb-miniav { margin-left: -7px; border: 1.5px solid var(--white, #fff); }");
  });
});

describe("II·B P1 — the 24-grid + the ref masthead (todo-workbench-rail-v1.html, Option B)", () => {
  it("the grid ships as named tokens with the vocabulary comment — no magic numbers at the seams", () => {
    expect(css).toContain("THE GRID (Polish V P1"); // the V grid comment absorbed the vocabulary
    expect(rule(".tdb-wrap")).toContain("--g24: 24px; --g12: 12px;");
    expect(rule(".tdb-ws")).toContain("gap: var(--g24)");
    expect(rule(".tdb-ws")).toContain("padding: 0 var(--g24)");
    expect(rule(".tdb-ws")).toContain("margin: var(--g24) 0 0"); // V P1: left-pinned
    expect(rule(".tdb-pair, .tdb-railr")).toContain("top: var(--tdb-gutter)"); // VI P4 contract (gutter rides --g24)
    expect(rule(".tdb-reel")).toContain("margin-bottom: var(--g24)");
    expect(rule(".tdb-lghead.standalone")).toContain("margin-bottom: var(--g12)"); // II·B P4 head band
    expect(rule(".tdb-reeltrack")).toContain("gap: var(--g12)"); // III P2: the reel is the card-gutter consumer
    expect(rule(".tdb-ledger")).toContain("gap: var(--g24)");
    expect(rule(".tdb-mast")).toContain("padding: 26px 0"); // IV P1: variant B's mid
  });
  it("masthead anatomy per the ref: 62px tape-fold post-its (Playfair numerals), 58×44 scrap, 300px search, 10px eyebrow", () => {
    expect(rule(".tdb-postit::before")).toContain("width: 20px; height: 9px"); // IV P1 tape
    expect(rule(".tdb-pv")).toContain("font-family: var(--f12-serif); font-size: 20px"); // IV P1
    expect(rule(".tdb-msrch")).toContain("flex: 0 0 280px"); // IV P1: fixed at container-right
    expect(rule(".tdb-rdate")).toContain("font-size: 10px");
  });
});

describe("III P3 — the pinned pair (supersedes the II·B controls-only drawer)", () => {
  it("card 1 is FOCUS MODE: split layout, the art at max-height 118 with the illustration-law shadow, hover lift", () => {
    expect(page).toContain('className="tdb-paircard tdb-focus" disabled={!tiles.urgent} onClick={() => openFlowCards(board.do)}');
    expect(page).toContain(">Focus mode</b>");
    expect(page).toContain("No distractions — work through your list, item by item.");
    expect(page).toContain(">▶ Begin</span>"); // IV P2: the count is gone from the card
    expect(page).toContain('import focusArt from "../../assets/todo/focus-art.png";');
    expect(page).toContain("{focusArt && <span className=\"tdb-focusart\">"); // absent asset = quieter card
    expect(rule(".tdb-focusart img")).toContain("max-height: 118px");
    expect(rule(".tdb-focusart img")).toContain("drop-shadow(0 2px 4px rgba(58, 28, 20, 0.12))");
    expect(css).toContain(".tdb-focus:hover:not(:disabled) { transform: translateY(-2px);");
  });
  it("card 2's top row: the Cards/Ledger toggle (moved from the masthead) + the fold «", () => {
    const mast = page.slice(page.indexOf("function renderMasthead"), page.indexOf("// ── THE PINNED PAIR"));
    expect(mast).not.toContain("tdb-vtg"); // the masthead lost the toggle
    const ftop = page.slice(page.indexOf('className="tdb-ftop"'), page.indexOf('className="tdb-fstatus"'));
    expect(ftop).toContain("tdb-vtg");
    expect(ftop).toContain("tdb-dfold");
  });
  it("the status line: Showing x of y from the SAME derivations the board consumes; RESET clears filters AND search, hidden at x=y", () => {
    expect(page).toContain("const shownX = vDo.length + hkGapCount(vGroups) + vStale.length + vNt.length;");
    expect(page).toContain("const shownY = tiles.urgent + tiles.housekeeping + tiles.notes;");
    expect(page).toContain("Showing {shownX} of {shownY}");
    expect(page).toContain('{shownX !== shownY && <button type="button" className="tdb-freset" onClick={() => { setFilters(DEFAULT_FILTERS); setSearch(""); }}>RESET</button>}');
  });
  it("pill semantics: filled=on / outline=off / half-opacity zero (greyed, never hidden); family colours", () => {
    expect(page).toContain('count === 0 ? " zero" : ""');
    expect(rule(".tdb-fp.zero")).toContain("opacity: 0.45");
    expect(css).toContain(".tdb-fp.p.on { background: linear-gradient(180deg, var(--pink-t), var(--pink-b)); font-weight: 700; }");
    expect(css).toContain(".tdb-fp.c.on { background: linear-gradient(180deg, var(--hk-cof), var(--hk-cof-2)); font-weight: 700; }");
    expect(css).toContain(".tdb-fp.s.on { background: linear-gradient(180deg, var(--hk-sage), var(--hk-sage-2)); font-weight: 700; }");
    expect(css).toContain(".tdb-fp:focus-visible { outline: 2px solid var(--hk-ink);");
  });
  it("retired species stay retired; the Notes inline ＋ survives in BOTH views (the ledger's nt head gained it)", () => {
    for (const gone of ["YOUR DESK", "tdb-fgl", "tdb-frow", "tdb-cbi", "tdb-newnote", "tdb-dwalk"]) {
      expect(page).not.toContain(gone);
    }
    expect(page).toContain('{onAdd && <button type="button" className="tdb-cadd" onClick={onAdd} aria-label="Add a note">＋</button>}');
    expect(page).toContain("onAdd: addTask,"); // the ledger's Notes group
  });
});

describe("II·B P3 — the companion rail (one panel, two mounts, one state)", () => {
  it("mount parity: BOTH homes call the SAME renderTodayPanel, XOR'd on narrow (no fork — halt (c) clear)", () => {
    expect((page.match(/\{renderTodayPanel\(\)\}/g) ?? []).length).toBe(2);
    expect(page).toContain('"Today", ALWAYS ON'); // VI P1: the column is unconditional ≥1200
    expect(page).toContain("{narrow && (");
    expect(page).toContain('window.matchMedia("(max-width: 1199.98px)")');
  });
  it("the rail: 264 sticky at the 24 offset, after the main column; noted as the future companions' home", () => {
    expect(rule(".tdb-railr")).toContain("width: var(--tdb-today)");
    expect(rule(".tdb-pair, .tdb-railr")).toContain("position: sticky"); // VI P4: the shared contract
    expect(page.indexOf('className="tdb-main"')).toBeLessThan(page.indexOf('className="tdb-railr"'));
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
  it("the breakpoint belt: the column hides <1200 in CSS too; narrow closes the popover on widen", () => {
    expect(css).toContain("@media (max-width: 1199.98px) { .tdb-railr { display: none; } }");
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
  it("cards view adopts the ledger's tinted head bands — ONE section grammar in both views", () => {
    expect(page).toContain('className={`tdb-lghead standalone ${cls === "do" ? "p" : cls === "hk" ? "c" : "n"}`}');
    expect(page).not.toContain("tdb-reelh");
    expect(page).not.toContain("tdb-fsd");
    expect(rule(".tdb-lghead.standalone")).toContain("border: 1px solid");
    // both views speak the same head classes (the ledger's section builder + the Lane)
    expect((page.match(/tdb-playb/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });
  it("the batch card's Never is the ghost-link grammar (same handler)", () => {
    expect(page).toContain('className="tdb-gnever ghost"');
    expect(rule(".tdb-gnever.ghost")).toContain("border-bottom: 1px solid var(--line)");
    expect(page).toContain("muteRuleFromCard(g)");
  });
});

describe("V P1 (reconstructed) — the left-pinned full-bleed grid (todo-right-column-v1.html)", () => {
  // The V prompt file was never supplied; this phase is reconstructed from the VI pack's token
  // guidance + the normative ref's drawn rows (.row: padding 0 24, gap 24, no max-width, no
  // centring). jsdom renders no layout — alignment locks are structural, the browser confirms x.
  it("the V token family on the wrap: gutter (rides --g24), appnav 49, sidebar 270, Today a CONSTANT 264", () => {
    const w = rule(".tdb-wrap");
    expect(w).toContain("--tdb-gutter: var(--g24);");
    expect(w).toContain("--tdb-appnav: 49px;");
    expect(w).toContain("--tdb-sidebar: 270px;");
    expect(w).toContain("--tdb-today: 264px;");
    expect(w).not.toContain("--tdb-today-closed"); // no collapsed state, ever
    expect(css).not.toContain("--container"); // IV's centred cap is retired
    expect(css).toContain("no reserved slack");
  });
  it("both bands are full-bleed rows: 24 padding + 24 gap, no max-width, no auto-centring", () => {
    for (const sel of [".tdb-mastcol", ".tdb-ws"]) {
      const r = rule(sel);
      expect(r).toContain("padding: 0 var(--g24)");
      expect(r).toContain("gap: var(--g24)");
      expect(r).not.toContain("max-width");
      expect(r).not.toContain("auto");
    }
  });
  it("content-left by construction: the masthead's flanking spacers = the column tokens", () => {
    expect(rule(".tdb-mastspacer")).toContain("width: var(--tdb-sidebar); flex: 0 0 auto;");
    expect(rule(".tdb-mastspacer-r")).toContain("width: var(--tdb-today); flex: 0 0 auto;");
    expect(css).toContain("@media (max-width: 1199.98px) { .tdb-mastspacer-r { display: none; } }");
    expect(rule(".tdb-pair")).toContain("width: var(--tdb-sidebar)");
    const spacerIdx = page.indexOf('className="tdb-mastspacer"');
    expect(spacerIdx).toBeGreaterThan(page.indexOf('className="tdb-mastcol"'));
    expect(spacerIdx).toBeLessThan(page.indexOf("{renderMasthead()}"));
    expect(page.indexOf('className="tdb-mastspacer-r"')).toBeGreaterThan(page.indexOf("{renderMasthead()}"));
  });
  it("the main column flexes off the sidebar — never independently centred", () => {
    expect(rule(".tdb-main")).toContain("flex: 1; min-width: 0;");
    expect(rule(".tdb-main")).not.toContain("margin");
    expect(page).toContain("new ResizeObserver(");
    expect(page).toContain("reelFit(");
  });
});

describe("IV P2 — footer rows · the label trim (the vertical tab retired by VI P1)", () => {
  it("footer row (VI P3 trimmed it to one): full-width, 28px roundel, hover wash, hairline above", () => {
    expect(page).toContain('className="tdb-fr2" onClick={() => setSettingsOpen(true)}');
    expect(rule(".tdb-footrows")).toContain("border-top: 1px solid var(--hairline)");
    expect(rule(".tdb-fr2")).toContain("width: 100%");
    expect(rule(".tdb-fr2")).toContain("border-radius: 10px");
    expect(rule(".tdb-fr2")).toContain("font-size: 12.5px");
    expect(rule(".tdb-fric")).toContain("width: 28px; height: 28px; border-radius: 50%");
    expect(rule(".tdb-fr2:hover")).toContain("background: #f4eee5");
    // the ? menu still anchors inside the foot (position:relative parent unchanged in role)
    expect(rule(".tdb-footrows")).toContain("position: relative");
  });
  it("the Focus card's button is bare ▶ Begin (no count anywhere on the card)", () => {
    expect(page).toContain(">▶ Begin</span>");
    expect(page).not.toContain("▶ Begin ·");
  });
});

describe("VI P1 — 'Today', always on (todo-right-column-v1.html)", () => {
  it("THE RENAME SWEEP — 'Today's list' is extinct across the board, the sheets, the tour and the libs", () => {
    const flow = readFileSync(join(here, "FocusFlow.tsx"), "utf8");
    const tour = readFileSync(join(here, "..", "..", "lib", "todoTour.ts"), "utf8");
    const board = readFileSync(join(here, "..", "..", "lib", "todoBoard.ts"), "utf8");
    const walk = readFileSync(join(here, "..", "..", "lib", "todoWalk.ts"), "utf8");
    for (const src of [page, css, flow, tour, board, walk]) {
      expect(src).not.toContain("oday’s list"); // catches Today's/today's alike
      expect(src).not.toContain("ODAY’S LIST"); // …and the mono-uppercase pills
    }
    expect(page).toContain('<b className="tdb-t">Today</b>');
    expect(page).toContain('{fpill("✓ ON TODAY ONLY", "todayOnly", null, "s")}');
    expect(page).toContain('{committed ? "✓ ON TODAY" : "＋ TODAY"}'); // the card CTA
  });
  it("the header's right slot: today's date when empty ⇄ '{n} OF 5' once anything is committed", () => {
    expect(page).toContain("{committedCards.length === 0 && doneN === 0 ? shortHeaderDate(now) : `${committedCards.length} OF ${MAX_TODAY}`}");
    expect(rule(".tdb-th .tdb-thr")).toContain("margin-left: auto");
    expect(rule(".tdb-th .tdb-thr")).toContain("font-size: 7.5px");
  });
  it("the ghost invitation: dashed 11px-radius box, no fill; dashed 15px tick-boxes + faded bars; widths cycled", () => {
    const box = rule(".tdb-ghostbox");
    expect(box).toContain("border: 1.5px dashed rgba(58, 28, 20, 0.22)");
    expect(box).toContain("border-radius: 11px");
    expect(box).not.toContain("background"); // the card's parchment shows through
    expect(rule(".tdb-cbx")).toContain("width: 15px; height: 15px; border: 1.5px dashed rgba(58, 28, 20, 0.28)");
    expect(rule(".tdb-grow")).toContain("border-bottom: 1px dashed rgba(58, 28, 20, 0.16)");
    expect(page).toContain("const GHOST_BARS = [64, 78, 52];");
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
    expect(page).toContain('className="tdb-playb" title={`Focus on ${opts.label}`} aria-label={`Focus on ${opts.label}`} onClick={opts.onSession}');
    expect(page).toContain('<path d="M1 1 L10 6 L1 11 Z" fill="currentColor" />');
    const b = rule(".tdb-playb");
    expect(b).toContain("width: 32px; height: 32px; border-radius: 50%");
    expect(b).toContain("border: 1px solid rgba(58, 28, 20, 0.16)");
    expect(css).toContain(".tdb-playb:hover { transform: scale(1.06); }");
    expect(css).not.toContain("tdb-lgs"); // the pill is extinct
    expect(css).not.toContain("tdb-lanedot"); // the lane dot went with it (ref head)
  });
  it("the reel pagers ride the head's right edge", () => {
    expect(rule(".tdb-reelpg")).toContain("margin-left: auto");
  });
  it("ONE help entry point: the AppShell FAB (menu on /todo) — none on the page itself", () => {
    for (const stale of ["tdb-dhelp", "helpOpen", "Help centre", "Replay the tour"]) {
      expect(page).not.toContain(stale);
    }
    expect(page).toContain('window.addEventListener("sa:todo-replay-tour"'); // the board still listens
    expect(shell).toContain('if (routeKey === "todo") setHelpMenuOpen((v) => !v);');
  });
});

describe("VI P4 — the column scroll contract (one shared rule, both flanking columns)", () => {
  // jsdom renders no layout: the 900px-height no-scroll check is the arithmetic in the contract
  // comment (900 − 49 − 48 = 803 ≫ ≈440 for five committed + done row + review card); the
  // browser walk confirms it. These locks pin the rule text the arithmetic depends on.
  it("the shared rule: sticky at the gutter, viewport-capped via the appnav token, flex column", () => {
    const shared = rule(".tdb-pair, .tdb-railr");
    expect(shared).toContain("position: sticky; top: var(--tdb-gutter)");
    expect(shared).toContain("max-height: calc(100vh - var(--tdb-appnav) - (var(--tdb-gutter) * 2))");
    expect(shared).toContain("display: flex; flex-direction: column;");
    expect(css).toContain("THE COLUMN SCROLL CONTRACT (VI P4)");
    expect(css).toContain("900 − 49 (appnav) − 48 (gutters) = 803");
  });
  it("one scrolling middle per card — heads and feet fixed; the review card outside Today's scroller", () => {
    expect(rule(".tdb-tmid2, .tdb-fmid")).toContain("overflow-y: auto; min-height: 0;");
    expect(rule(".tdb-today2")).toContain("flex: 0 1 auto; min-height: 0;");
    expect(rule(".tdb-rvcard")).toContain("flex: 0 0 auto;"); // fixed above, never inside the scroller
    expect(rule(".tdb-fcard")).toContain("display: flex; flex-direction: column; min-height: 0;");
    expect(rule(".tdb-ftop, .tdb-fstatus, .tdb-footrows")).toContain("flex: 0 0 auto;");
    // markup: the pill region rides inside .tdb-fmid, between the fixed status line and the foot
    const fmid = page.indexOf('className="tdb-fmid"');
    expect(fmid).toBeGreaterThan(page.indexOf('className="tdb-fstatus"'));
    expect(fmid).toBeLessThan(page.indexOf('className="tdb-footrows"'));
    // Today: header → middle → verbs, in that order
    const card = page.slice(page.indexOf('className="tdb-today2"'), page.indexOf('className="tdb-tf2"'));
    expect(card).toContain('className="tdb-tmid2"');
  });
  it("scrollbars: thin, hairline-coloured, visible on hover/focus only, gutter stable (no shift)", () => {
    const mids = rule(".tdb-tmid2, .tdb-fmid");
    expect(mids).toContain("scrollbar-width: thin");
    expect(mids).toContain("scrollbar-color: transparent transparent");
    expect(mids).toContain("scrollbar-gutter: stable");
    expect(css).toContain(".tdb-tmid2:hover, .tdb-tmid2:focus-within, .tdb-fmid:hover, .tdb-fmid:focus-within { scrollbar-color: var(--hairline) transparent; }");
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
    for (const stale of ["Begin focused session", "Walk me through", "Focused session", "walkSublabel", "walkAria"]) {
      expect(page).not.toContain(stale);
      expect(flow).not.toContain(stale);
      expect(tour).not.toContain(stale);
    }
    expect(page).toMatch(/aria-label=\{`Focus on \$\{label\}`\}/); // cards view (the play button)
    expect(page).toMatch(/aria-label=\{`Focus on \$\{opts\.label\}`\}/); // ledger view
    expect(page).toContain(">Focus mode</b>"); // the pair's card
  });
});
