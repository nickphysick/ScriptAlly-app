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

describe("Deck v2 P3 — THE RAIL (three squares; the pinned pair + fold are extinct)", () => {
  it("240px sticky column of three whole-square buttons: Focus · Task settings · Pro", () => {
    expect(rule(".tdb-lrail")).toContain("width: var(--tdb-rail)");
    expect(rule(".tdb-lrail, .tdb-railr")).toContain("position: sticky; top: var(--tdb-gutter)");
    const sq = rule(".tdb-sq");
    expect(sq).toContain("border-radius: 16px");
    expect(sq).toContain("box-shadow: 0 4px 14px rgba(58, 28, 20, 0.1)");
    expect(page).toContain('<aside className="tdb-lrail" aria-label="Workbench rail">');
  });
  it("Focus mode: whole-board scope through the same flow; ink ▶ Begin; the art bottom-right ~64px", () => {
    expect(page).toContain("const boardCards = [...board.do, ...board.hk, ...board.nt];");
    expect(page).toContain('onClick={() => setFlow({ items: boardCards.map((card) => ({ kind: "card" as const, card })) })}');
    expect(page).toContain("<p>No distractions — one item at a time.</p>");
    expect(page).toContain('<span className="tdb-sqgo">▶ Begin</span>');
    expect(css).toContain(".tdb-sqart img { max-height: 64px;");
  });
  it("Task settings: the EXISTING sheet, ghost ⚙ Customise", () => {
    expect(page).toContain('className="tdb-sq" onClick={() => setSettingsOpen(true)}');
    expect(page).toContain("<p>Customise the tasks we show you — hide what you never do.</p>");
    expect(page).toContain('<span className="tdb-sqgo ghost">⚙ Customise</span>');
  });
  it("the Pro promo: plan-gated both ways; CTA → the /plans upgrade surface; slate family", () => {
    expect(page).toContain("{!isProUser(currentUser) && (");
    expect(page).toContain('className="tdb-sq pro" onClick={() => onNavigate("plans")}');
    expect(page).toContain("<span className=\"tdb-sqk\">SCRIPTALLY PRO</span>".replace(/\\/g, ""));
    expect(page).toContain("<h3>Hand it over</h3>");
    expect(page).toContain("Let the assistant handle your housekeeping — wish lists and materials filled for you.");
    expect(page).toContain('<span className="tdb-sqgo">Meet the assistant</span>');
    expect(rule(".tdb-sq.pro")).toContain("linear-gradient(180deg, #eef2f6, #e6ecf2)");
  });
  it("the fold is extinct: no folded face, no sa.todoDrawer key, no fold chrome", () => {
    for (const stale of ["tdb-pair", "sa.todoDrawer", "tdb-dfold", "folded", "tdb-footrows", "tdb-fr2", "tdb-fcard"]) {
      expect(page).not.toContain(stale);
    }
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
  it("Deck v2: the IDENTITY STRIP — title block · 84×102 solo post-its · the resident banner", () => {
    expect(page).toContain("{shortHeaderDate(now)} · {weekOfQuerying(queries, new Date(now))}");
    expect(rule(".tdb-postit")).toContain("width: 84px; height: 102px");
    expect(rule(".tdb-pv")).toContain("font-size: 30px");
    expect(page).toContain('className="tdb-rvhead"');
    const strip = page.slice(page.indexOf("function renderStrip"), page.indexOf("// ── Deck v2 P3: THE RAIL"));
    expect(strip).not.toContain("Walk me through");
    expect(strip).not.toContain("tdb-msrch"); // search belongs to the deck
  });
  it("type-scale: strip title 28px (v2), lane heads 16px", () => {
    expect(rule(".tdb-ask")).toContain("font-size: 28px");
    expect(rule(".tdb-lgt")).toContain("font-size: 16px"); // II·B P4: one head grammar, both views
  });
  it("Width v3: the ASSEMBLY is a fixed centred width; band backgrounds full-bleed, contents lock to it", () => {
    expect(rule(".tdb-asm")).toContain("width: var(--tdb-asm); margin: 0 auto;");
    expect(rule(".tdb-strip")).toContain("background: var(--paper)");
    expect(page).toContain('<div className="tdb-asm tdb-striprow">');
  });
  it("⌘K guards on visibility (the page stays mounted behind other routes); the input re-lands in the deck (P2)", () => {
    expect(page).toContain("wrapRef.current.offsetParent === null");
    expect(page).toContain("const [search, setSearch] = useState");
  });
  it("view state persists under sa.todoView (default cards; P3 made the Ledger face live)", () => {
    expect(page).toContain('localStorage.getItem("sa.todoView")');
    expect(page).toContain('=== "ledger" ? "ledger" : "cards"'); // cards is the fallback default
  });
  it("the page-strip .tdb-band double-definition is resolved — one rule left, the card band's", () => {
    const bands = css.match(/(?:^|\n)\.tdb-band \{[^}]*\}/g) ?? [];
    expect(bands.length).toBe(1);
    expect(bands[0]).toContain("min-height: 27px"); // the CARD header band (v2 contract), not a page strip
  });
});

describe("P2 — card view: the grid replaces the reels; renames land", () => {
  it("Deck v2 P4 — the EXACT-FIT reel: fixed 774 viewport, page-by-3, snap; reelFit + laneFit stay retired", () => {
    expect(rule(".tdb-reeltrack")).toContain("width: var(--tdb-vp)");
    expect(rule(".tdb-reeltrack")).toContain("scroll-snap-type: x mandatory");
    expect(page).toContain("const REEL_PAGE = 3 * (250 + 12);");
    expect(page).not.toContain("reelFit");
    expect(page).not.toContain("laneFit");
    expect(css).not.toContain("--reelw");
  });
  it("v2 anatomy: 27px band, 12.5px titles, content-sized cards, tighter body", () => {
    expect(rule(".tdb-band")).toContain("min-height: 27px");
    expect(rule(".tdb-tt")).toContain("font-size: 12.5px");
    expect(rule(".tdb-tile")).not.toContain("min-height");
    expect(rule(".tdb-body")).toContain("padding: 10px 12px 12px");
  });
  it("VI P3: the Focus pill became the PLAY BUTTON — full wording in title/aria; Batch fix stands", () => {
    expect(page).toContain('className="tdb-playb" title={`Focus on ${label}`} aria-label={`Focus on ${label}`} onClick={onFocusedSession}');
    expect(page).toContain('title="Batch fix"'); // the ledger row quick action (retained view)
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
  it("Deck v2 P4: the ledger shares the BAND-LESS lh2 heading (one grammar, both views); notes keep ＋", () => {
    expect(page).toContain('<div className={`tdb-lh2 ${opts.cls}`}>');
    expect(rule(".tdb-lh2.p .tdb-lgt::after")).toContain("var(--pink-b)");
    expect(rule(".tdb-lh2.lat .tdb-lgt::after")).toContain("var(--lat-mark)");
    expect(rule(".tdb-lh2.n .tdb-lgt::after")).toContain("var(--note-b)");
    expect(page).toContain('cls: "lat", id: "tdb-lane-hk"');
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
  it("Deck v2 P2 — the DECK PILLS are the filter surface: exact copy, family dots, board-derived counts", () => {
    for (const call of ['deckPill("OFFERS", "offers", fc.offers, "p")', 'deckPill("AGENT WAITING", "overToYou", fc.overToYou, "p")', 'deckPill("MATERIALS", "materials", fc.materials, "lat")', 'deckPill("WISH LISTS", "mswl", fc.mswl, "lat")', 'deckPill("STALE", "stale", fc.stale, "lat")', 'deckPill("SNOOZED", "snoozed", fc.snoozed, "lat")', 'deckPill("NOTES", "notes", fc.notes, "y")']) {
      expect(page).toContain(call);
    }
    expect(page).toContain("aria-pressed={!resting && on}");
    expect(page).toContain("filterCounts({ doCards: board.do, hkGroups, staleCards, ntCards: board.nt, committedCount: committedCards.length })");
    expect(page).not.toContain("★ OFFERS"); // the pill lost the star (LAWS); the card tag keeps it
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

describe("A1 → Deck v2 — the identity strip band (supersedes the masthead band)", () => {
  it("a full-bleed paper band with the 1px base rule, ABOVE the work row; the mast* family is extinct", () => {
    expect(rule(".tdb-strip")).toContain("background: var(--paper)");
    expect(rule(".tdb-strip")).toContain("border-bottom: 1px solid var(--line)");
    const band = page.indexOf("{renderStrip()}");
    const ws = page.indexOf('className="tdb-asm tdb-ws"');
    expect(band).toBeGreaterThan(0);
    expect(band).toBeLessThan(ws);
    for (const stale of ["tdb-mastband", "tdb-mastcol", "tdb-mastspacer", "renderMasthead"]) {
      expect(page).not.toContain(stale);
      expect(css).not.toContain(stale);
    }
  });
  it("the strip is not sticky (scrolls away); the flanking columns keep the scroll contract", () => {
    expect(rule(".tdb-strip")).not.toContain("sticky");
    expect(rule(".tdb-lrail, .tdb-railr")).toContain("position: sticky; top: var(--tdb-gutter)"); // the shared contract (P3: the rail)
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
    expect(css).toContain("WIDTH v3 — THE CENTRED ASSEMBLY"); // the v2 law absorbed the vocabulary
    expect(rule(".tdb-wrap")).toContain("--g24: 24px; --g12: 12px;");
    expect(rule(".tdb-ws")).toContain("gap: var(--g24)");
    expect(rule(".tdb-ws")).toContain("padding: 22px 0 26px"); // the assembly work row (v2)
    expect(rule(".tdb-lrail, .tdb-railr")).toContain("top: var(--tdb-gutter)"); // the contract (gutter rides --g24)
    expect(rule(".tdb-reel")).toContain("margin-bottom: var(--g24)");
    expect(rule(".tdb-lh2")).toContain("margin: 0 0 16px"); // v2: 16px clear below the heading
    expect(rule(".tdb-reeltrack")).toContain("gap: var(--g12)"); // III P2: the reel is the card-gutter consumer
    expect(rule(".tdb-ledger")).toContain("gap: var(--g24)");
  });
  it("strip anatomy per the v2 ref: 84×102 tape-fold post-its (30px Playfair numerals), 12px tape", () => {
    expect(rule(".tdb-postit::before")).toContain("width: 30px; height: 12px");
    expect(rule(".tdb-pv")).toContain("font-family: var(--f12-serif); font-size: 30px");
    expect(rule(".tdb-rdate")).toContain("font-size: 10px");
  });
});

describe("III P3 — the pinned pair (supersedes the II·B controls-only drawer)", () => {
  it("Deck v2 P2: the view segment + SHOWING/RESET live in the DECK; the old pill cloud is extinct", () => {
    expect(page).toContain('className="tdb-ctl tdb-vseg" role="group" aria-label="View"');
    expect(page).toContain("const shownX = vDo.length + hkGapCount(vGroups) + vStale.length + vNt.length;");
    expect(page).toContain("const shownY = tiles.urgent + tiles.housekeeping + tiles.notes;");
    expect(page).toContain(">SHOWING {shownX} OF {shownY} · RESET ✕</button>");
    expect(page).toContain('{!resting && (');
    for (const stale of ["tdb-fp ", "fpill(", "tdb-fstatus", "tdb-fmid", "tdb-vtg", "tdb-freset", "tdb-fgrp2"]) {
      expect(page).not.toContain(stale);
    }
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
    expect(rule(".tdb-lrail, .tdb-railr")).toContain("position: sticky"); // the shared contract
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
  it("ONE section grammar in both views — the band-less lh2 heading (v2)", () => {
    expect(page).toContain("tdb-lh2 ${cls ===");
    expect(page).toContain("tdb-lh2 ${opts.cls}");
    expect((page.match(/tdb-playb/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });
  it("the batch card's Never + footer CTA are extinct (the contract); the hide lives in ☾ LATER", () => {
    expect(page).not.toContain("tdb-gnever");
    expect(page).not.toContain(">Batch fix →</button>");
    expect(page).toContain("muteRuleFromCard(g); }}>Don’t show these again</button>");
  });
});

describe("Width v3 — the centred assembly tokens (Deck v2; supersedes V P1's full-bleed grid)", () => {
  it("the token set on the wrap: asm 1356 · rail 240 · sheet 812 · vp 774 · cardw 250 · Today 256", () => {
    const w = rule(".tdb-wrap");
    expect(w).toContain("--tdb-asm: 1356px;");
    expect(w).toContain("--tdb-rail: 240px;");
    expect(w).toContain("--tdb-sheet: 812px;");
    expect(w).toContain("--tdb-vp: 774px;");
    expect(w).toContain("--tdb-cardw: 250px;");
    expect(w).toContain("--tdb-today: 256px;");
    expect(w).toContain("--tdb-gutter: var(--g24);"); // the scroll contract survives
    expect(w).toContain("--tdb-appnav: 49px;");
  });
  it("the assembly centres; the arithmetic is the LAWS' 240+24+812+24+256", () => {
    expect(rule(".tdb-asm")).toContain("width: var(--tdb-asm); margin: 0 auto;");
    expect(css).toContain("240 · 24 · sheet 812");
    expect(css).toContain("Today 256 = 1356px");
    expect(rule(".tdb-railr")).toContain("width: var(--tdb-today)");
  });
  it("no reserved slack, no reflow drivers: the ResizeObserver still guards viewport resizes", () => {
    expect(page).toContain("new ResizeObserver(");
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
  it("exact fit: 774 = 3 × 250 + 2 × 12; cards never stretch; paging by three; pagers dim at the ends", () => {
    expect(rule(".tdb-wrap")).toContain("--tdb-vp: 774px;");
    expect(rule(".tdb-reeltrack")).toContain("width: var(--tdb-vp)");
    expect(rule(".tdb-tile")).toContain("flex: 0 0 var(--tdb-cardw)");
    expect(rule(".tdb-gcard")).toContain("flex: 0 0 var(--tdb-cardw)");
    expect(page).toContain("const REEL_PAGE = 3 * (250 + 12);");
    expect(rule(".tdb-pg:disabled")).toContain("opacity: 0.35");
    expect(css).not.toContain("EdgeFade"); // no fades — exact fit forbids partials
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
    expect(rule(".tdb-postit.hk")).toContain("var(--lat-2)");
    const flow = readFileSync(join(here, "FocusFlow.tsx"), "utf8");
    expect(flow).toContain("cof"); // the journey-sheet family keeps coffee
  });
  it("THE RENAME, repo-wide: zero matches of the old family phrase in src (Agent waiting everywhere)", () => {
    const { execSync } = require("node:child_process");
    const needle = "over to " + "you"; // split so this lock never matches itself
    const out = execSync(`grep -ril '${needle}' ` + join(here, "..", "..") + " || true", { encoding: "utf8" }).trim();
    expect(out).toBe("");
    expect(page).toContain('deckPill("AGENT WAITING", "overToYou", fc.overToYou, "p")');
  });
});

describe("Deck v2 P2 — the deck (sticky control bar; todo-deck-v2.html)", () => {
  it("the control law: 36px/white/hairline/99px controls, thin dividers; the deck sticks in the wrap", () => {
    const ctl = rule(".tdb-ctl");
    expect(ctl).toContain("height: 36px");
    expect(ctl).toContain("border: 1px solid var(--line)");
    expect(ctl).toContain("border-radius: 99px");
    expect(rule(".tdb-vdiv")).toContain("width: 1px; height: 20px");
    expect(rule(".tdb-deck")).toContain("position: sticky; top: 0;");
    expect(rule(".tdb-deck")).toContain("background: var(--white, #fff)");
  });
  it("ABSENT by law: no Focus button, no ⚙ in the deck — the rail owns both", () => {
    const deck = page.slice(page.indexOf("function renderDeck"), page.indexOf("function renderStrip"));
    expect(deck).not.toContain("Focus");
    expect(deck).not.toContain("⚙");
    expect(deck).not.toContain("setSettingsOpen");
    expect(deck).not.toContain("openFlowCards");
  });
  it("quiet pill law: resting plain · zero 40% · narrowed nar (pink-band burgundy 700) / dim; the dots", () => {
    expect(rule(".tdb-pt")).toContain("height: 28px");
    expect(rule(".tdb-pt.z")).toContain("opacity: 0.4");
    expect(rule(".tdb-pt.dim")).toContain("opacity: 0.4");
    const nar = rule(".tdb-pt.nar");
    expect(nar).toContain("border-color: #7c3a2a");
    expect(nar).toContain("linear-gradient(180deg, var(--pink-t), var(--pink-btn))");
    expect(nar).toContain("font-weight: 700");
    expect(css).toContain("--dot-p: #e59b8f; --dot-lat: #cbb995; --dot-y: #d9c87a; --dot-s: #9db29a;");
    expect(page).toContain('const cls = resting ? "" : on ? " nar" : " dim";');
  });
  it("search: 220px in the deck, ⌘K kbd, Esc clears + blurs; the Esc CHAIN clears search first, filters second", () => {
    expect(rule(".tdb-dsrch")).toContain("width: 220px");
    expect(page).toContain('placeholder="Search your desk…"');
    expect(page).toContain('if (e.key === "Escape") { setSearch(""); (e.target as HTMLInputElement).blur(); }');
    expect(page).toContain('if (search) { setSearch(""); return; }');
    expect(page).toContain("if (!isResting(filtersRef.current) || filtersRef.current.todayOnly) setFilters(DEFAULT_FILTERS);");
  });
  it("RESET: burgundy SHOWING x OF y pill appears only when narrowed; clears filters AND search", () => {
    expect(rule(".tdb-rst")).toContain("border: 1px solid #7c3a2a");
    expect(page).toContain('const resetDeck = () => { setFilters(DEFAULT_FILTERS); setSearch(""); };');
  });
  it("the lens + the segment: TODAY'S LIST toggles the lens; ▦/☰ persists the existing view pref", () => {
    expect(page).toContain('aria-pressed={filters.todayOnly} onClick={() => setF("todayOnly", !filters.todayOnly)}');
    expect(page).toContain('onClick={() => pickView("cards")}>▦</button>');
    expect(page).toContain('onClick={() => pickView("ledger")}>☰</button>');
  });
});

describe("Deck v2 P1 — the identity strip (todo-deck-v2.html)", () => {
  it("strip composition: assembly row = title block · post-its · the resident banner · [narrow chip]", () => {
    const strip = page.slice(page.indexOf("function renderStrip"), page.indexOf("// ── Deck v2 P3: THE RAIL"));
    for (const piece of ["tdb-tblock", "tdb-postits", "tdb-rvhead", "tdb-todaypopwrap"]) {
      expect(strip).toContain(piece);
    }
    expect(strip.indexOf("tdb-tblock")).toBeLessThan(strip.indexOf("tdb-postits"));
    expect(strip.indexOf("tdb-postits")).toBeLessThan(strip.indexOf("tdb-rvhead"));
  });
  it("post-its are FILTER buttons soloing their family — same state as the deck pills; scroll-to-lane retired here", () => {
    expect(page).toContain('onClick={() => soloPostit("pink")}');
    expect(page).toContain('onClick={() => soloPostit("latte")}');
    expect(page).toContain('onClick={() => soloPostit("yellow")}');
    expect(page).toContain('aria-pressed={isSoloed(filters, "pink")}');
    expect(page).toContain("setFilters((f) => soloFamily(f, fam));");
    const strip = page.slice(page.indexOf("function renderStrip"), page.indexOf("// ── Deck v2 P3: THE RAIL"));
    expect(strip).not.toContain("scrollToLane");
  });
  it("the latte family lands: post-it + tokens (coffee keeps only the journey-sheet headers)", () => {
    expect(css).toContain("--lat-1: #f5efe6; --lat-2: #efe7d9; --lat-bd: #ddd0bc; --lat-mark: #cbb995; --lat-ink: #8a7048;");
    expect(css).toContain(".tdb-postit.hk { background: var(--lat-2);");
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
    expect(page).toContain(">TODAY’S LIST"); // the lens pill (deck, P2 — no tick per the LAWS)
    expect(page).toContain('{committed ? "− TODAY" : "＋ TODAY"}'); // the verb row's Today toggle
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
    expect(page).toContain('className="tdb-playb" title={`Focus on ${opts.label}`} aria-label={`Focus on ${opts.label}`} onClick={opts.onSession}');
    expect(page).toContain('<path d="M1.5 1.5 L9.5 6 L1.5 10.5 Z" fill="currentColor" />');
    const b = rule(".tdb-playb");
    expect(b).toContain("width: 30px; height: 30px; border-radius: 50%"); // v2: 30
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

describe("The column scroll contract (VI P4 → Deck v2 selectors)", () => {
  it("the shared rule: sticky at the gutter, viewport-capped via the appnav token, flex column", () => {
    const shared = rule(".tdb-lrail, .tdb-railr");
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
    for (const stale of ["Begin focused session", "Walk me through", "Focused session", "walkSublabel", "walkAria"]) {
      expect(page).not.toContain(stale);
      expect(flow).not.toContain(stale);
      expect(tour).not.toContain(stale);
    }
    expect(page).toMatch(/aria-label=\{`Focus on \$\{label\}`\}/); // cards view (the play button)
    expect(page).toMatch(/aria-label=\{`Focus on \$\{opts\.label\}`\}/); // ledger view
    expect(page).toContain("<h3>Focus mode</h3>"); // the rail's square
  });
});
