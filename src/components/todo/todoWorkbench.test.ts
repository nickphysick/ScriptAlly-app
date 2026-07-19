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

describe("P1 — the drawer (floating, sticky, foldable; sa.todoDrawer persisted)", () => {
  it("floating rounded panel, sticky below the app nav, internal scroll", () => {
    const d = rule(".tdb-drawer");
    expect(d).toContain("width: 264px");
    expect(d).toContain("border-radius: 16px");
    expect(d).toContain("position: sticky");
    expect(d).toContain("overflow-y: auto");
  });
  it("folds to the 64px icon rail via a width transition; reduced motion kills it", () => {
    expect(rule(".tdb-drawer.folded")).toContain("width: 64px");
    expect(rule(".tdb-drawer")).toContain("transition: width");
    expect(css).toMatch(/prefers-reduced-motion: reduce\) \{ \.tdb-drawer \{ transition: none/);
  });
  it("fold state persists under the sa. localStorage convention (approved — never a user-doc field)", () => {
    expect(page).toContain('localStorage.getItem("sa.todoDrawer")');
    expect(page).toContain('localStorage.setItem("sa.todoDrawer", v ? "folded" : "open")');
  });
  it("the drawer holds the demoted ＋ New note (II·B) and the flagship Walk me through; the folded rail survives", () => {
    expect(page).toContain('className="tdb-newnote" onClick={addTask}>＋ New note');
    expect(page).toMatch(/tdb-dwalk" disabled=\{!tiles\.urgent\} aria-label=\{walkAria\(tiles\.urgent\)\} onClick=\{\(\) => openFlowCards\(board\.do\)\}/);
    expect(page).toContain('className="tdb-drawer folded"');
    // the folded rail's Today icon left with the list (II·B P2)
    expect(page).not.toContain('className="tdb-dic today"');
  });
  it("the drawer FOOT carries ⚙ (the same TaskSettingsSheet) and the ? menu with the verbatim replay dispatch", () => {
    expect(page).toContain('className="tdb-dfbtn" onClick={() => setSettingsOpen(true)}');
    expect(page).toContain('window.dispatchEvent(new CustomEvent("sa:todo-replay-tour"))');
    expect(page).toContain(">Help centre</button>");
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
  it("the panel is the pop-up TRANSPLANTED — same inner anatomy under .tdb-today2 (sage header)", () => {
    expect(page).toContain('<div className="tdb-today2">');
    for (const inner of ["tdb-th", "tdb-cc", "tdb-cdone", "tdb-rollbar", "tdb-tcommit", "tdb-trow", "tdb-tempty", "tdb-tdiv", "tdb-tdone", "tdb-drow", "tdb-tf", "tdb-pick", "tdb-worklist"]) {
      expect(page).toContain(inner);
    }
    expect(rule(".tdb-th")).toContain("var(--hk-sage)");
    // the add flow survives: Add more / Help me pick + Work the list, same handlers
    expect(page).toContain('{committedCards.length ? "＋ Add more" : "Help me pick"}');
    // evening C2: Work the list is the RITUAL walk (sage whole-walk) over the same committed set
    expect(page).toContain('setFlow({ items: committedCards.map((card) => ({ kind: "card", card })), ritual: true });'); // III P1: review-free by construction, no filter
    expect(page).toContain(">Work the list</button>");
  });
  it("AppShell hides the help FAB on /todo only — the pack's one out-of-page line", () => {
    expect(shell).toContain('{routeKey !== "todo" && (');
    expect(shell).not.toContain("helpMenuOpen"); // the corner two-item menu moved into the drawer foot
  });
});

describe("P1 — masthead composition + the centred column", () => {
  it("one row: title+date/week · 62px post-its (II·B) · the scrap · search ⌘K · the view toggle", () => {
    expect(page).toContain("{shortHeaderDate(now)} · {weekOfQuerying(queries, new Date(now))}");
    expect(rule(".tdb-postit")).toContain("width: 62px");
    expect(page).toContain('className="tdb-msrch"');
    expect(page).toContain('className="tdb-vtg"');
    // Walk me through is NOT in the masthead any more (slice ends before the drawer's intro comment)
    const mast = page.slice(page.indexOf("function renderMasthead"), page.indexOf("// ── the floating drawer"));
    expect(mast).not.toContain("Walk me through");
  });
  it("type-scale: masthead title 25px (II·B), lane heads 16px", () => {
    expect(rule(".tdb-ask")).toContain("font-size: 25px");
    expect(rule(".tdb-lgt")).toContain("font-size: 16px"); // II·B P4: one head grammar, both views
  });
  it("the content column caps at 1150 and centres; the row caps at 1720 (max-width discipline)", () => {
    expect(rule(".tdb-col")).toContain("max-width: 1150px");
    expect(rule(".tdb-ws")).toContain("max-width: 1720px");
    expect(rule(".tdb-ws")).toContain("auto"); // centred; the top margin is the 24-grid token (II·B)
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
  it("renames: the lane pill is ▶ Focus on {label} (III naming, landed with the P2 Lane rewrite); Batch fix stands", () => {
    expect(page).toContain(">▶ Focus on {label}</button>");
    expect(page).toContain(">Batch fix →</button>");
    expect(page).not.toContain("Fix together");
    expect(page).toMatch(/aria-label=\{`Focus on \$\{label\}`\}/);
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
  it("tinted section heads carry Begin focused session; the note head is the flagged extension", () => {
    expect(css).toContain(".tdb-lghead.p { background: linear-gradient(180deg, var(--pink-t), var(--pink-btn)); border-color: var(--pink-b); }");
    expect(css).toContain(".tdb-lghead.c { background: linear-gradient(180deg, var(--hk-cof), var(--hk-cof-2)); border-color: var(--hk-cof-edge); }");
    expect(css).toContain(".tdb-lghead.n { background: var(--note-t); border-color: var(--note-b); }");
    expect(page).toContain(">▶ Begin focused session</button>");
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
  it("the drawer filter rows are the ref's list with derived counts (II·B: the frow builder); today-only rides inside the group", () => {
    for (const call of ['frow("Offers", "offers", fc.offers)', 'frow("Over to you", "overToYou", fc.overToYou)', 'frow("Missing materials", "materials", fc.materials)', 'frow("Missing wish lists", "mswl", fc.mswl)', 'frow("Stale queries", "stale", fc.stale)', 'frow("Snoozed", "snoozed", fc.snoozed)', 'frow("On today’s list only", "todayOnly", fc.today, "today")']) {
      expect(page).toContain(call);
    }
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
    expect(page).toContain(">＋ Today’s list</button>");
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
    expect(page).toContain('<div className="tdb-mastcol">{renderMasthead()}</div>');
  });
  it("the band content keeps the 1150 discipline; the board column no longer hosts the masthead", () => {
    expect(rule(".tdb-mastcol")).toContain("max-width: 1150px");
    expect(rule(".tdb-mastcol")).toContain("margin: 0 auto");
    const col = page.slice(page.indexOf('className="tdb-col"'), page.indexOf('className="tdb-lanes"'));
    expect(col).not.toContain("renderMasthead");
  });
  it("the band is not sticky (scrolls away); the drawer's sticky offset rides the 24-grid (II·B)", () => {
    expect(rule(".tdb-mastband")).not.toContain("sticky");
    expect(rule(".tdb-drawer")).toContain("position: sticky; top: var(--g24)");
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
    expect(css).toContain("THE 24-GRID (Polish II·B)");
    expect(rule(".tdb-wrap")).toContain("--g24: 24px; --g12: 12px;");
    expect(rule(".tdb-ws")).toContain("gap: var(--g24)");
    expect(rule(".tdb-ws")).toContain("padding: 0 var(--g24)");
    expect(rule(".tdb-ws")).toContain("margin: var(--g24) auto 0");
    expect(rule(".tdb-drawer")).toContain("top: var(--g24)");
    expect(rule(".tdb-reel")).toContain("margin-bottom: var(--g24)");
    expect(rule(".tdb-lghead.standalone")).toContain("margin-bottom: var(--g12)"); // II·B P4 head band
    expect(rule(".tdb-reeltrack")).toContain("gap: var(--g12)"); // III P2: the reel is the card-gutter consumer
    expect(rule(".tdb-ledger")).toContain("gap: var(--g24)");
    expect(rule(".tdb-mast")).toContain("padding: var(--g24) 2px");
  });
  it("masthead anatomy per the ref: 62px tape-fold post-its (Playfair numerals), 58×44 scrap, 300px search, 10px eyebrow", () => {
    expect(rule(".tdb-postit::before")).toContain("width: 22px; height: 9px");
    expect(rule(".tdb-pv")).toContain("font-family: var(--f12-serif); font-size: 20px");
    expect(rule(".tdb-msrch")).toContain("flex: 0 1 300px");
    expect(rule(".tdb-rdate")).toContain("font-size: 10px");
  });
});

describe("II·B P2 — the drawer, controls only", () => {
  it("YOUR DESK header row with the fold folded in; the structured mid", () => {
    expect(page).toContain('<span className="tdb-dwt">YOUR DESK</span>');
    const head = page.slice(page.indexOf('className="tdb-dwhead"'), page.indexOf('className="tdb-dwmid"'));
    expect(head).toContain("tdb-dfold");
    expect(rule(".tdb-dwhead")).toContain("border-bottom: 1px solid var(--hairline)");
  });
  it("ONE bordered white filter species: lane headers + indented rows in a single .tdb-fgrp", () => {
    expect((page.match(/className="tdb-fgrp"/g) ?? []).length).toBe(1);
    expect(rule(".tdb-fgrp")).toContain("border: 1px solid var(--line)");
    expect(rule(".tdb-frow")).toContain("padding: 7px 12px 7px 30px");
  });
  it("the letterpress checkbox is a REAL input (label-wrapped, focus-visible ring); the glyph box carries the look", () => {
    expect(page).toContain('<input type="checkbox" className="tdb-cbi" checked={filters[key]} onChange={(e) => setF(key, e.target.checked)} />');
    expect(rule(".tdb-cb")).toContain("width: 15px; height: 15px; border: 1.5px solid var(--ink)");
    expect(css).toContain(".tdb-cbi:checked + .tdb-cb { background: linear-gradient(180deg, var(--hk-sage), var(--hk-sage-2)); border-color: var(--hk-ink); color: var(--hk-ink); }");
    expect(css).toContain(".tdb-cbi:focus-visible + .tdb-cb { outline: 2px solid var(--hk-ink);");
  });
  it("zero-count rows grey, never hide", () => {
    expect(page).toContain('count === 0 ? " zero" : ""');
    expect(rule(".tdb-frow.zero")).toContain("color: var(--faint)");
  });
  it("NO Today content remains in the drawer (the rail owns it from P3); ＋ New note is the demoted outline below the filter", () => {
    const drawer = page.slice(page.indexOf("function renderDrawer"), page.indexOf("function renderTodayPanel"));
    expect(drawer).not.toContain("renderTodayPanel()");
    expect(drawer).not.toContain("tdb-today2");
    expect(drawer).not.toContain("TODAY’S LIST ·");
    expect(drawer.indexOf("tdb-fgrp")).toBeLessThan(drawer.indexOf("tdb-newnote"));
    expect(rule(".tdb-newnote")).toContain("border: 1.5px solid var(--ink)");
  });
});

describe("II·B P3 — the companion rail (one panel, two mounts, one state)", () => {
  it("mount parity: BOTH homes call the SAME renderTodayPanel, XOR'd on narrow (no fork — halt (c) clear)", () => {
    expect((page.match(/\{renderTodayPanel\(\)\}/g) ?? []).length).toBe(2);
    expect(page).toContain("{!narrow && (");
    expect(page).toContain("{narrow && (");
    expect(page).toContain('window.matchMedia("(max-width: 1499.98px)")');
  });
  it("the rail: 264 sticky at the 24 offset, after the main column; noted as the future companions' home", () => {
    expect(rule(".tdb-railr")).toContain("width: 264px");
    expect(rule(".tdb-railr")).toContain("position: sticky; top: var(--g24)");
    expect(page.indexOf('className="tdb-main"')).toBeLessThan(page.indexOf('className="tdb-railr"'));
  });
  it("the chip's count is the committed union — never a parallel tally — and the header chip pairs it with the done union", () => {
    expect(page).toContain("Today’s list · {committedCards.length} TO GO");
    expect(page).toContain("`${committedCards.length} COMMITTED · ${doneN} DONE`");
  });
  it("popover a11y: dialog role, aria-expanded on the chip, Esc + click-away close, reduced-motion honoured", () => {
    expect(page).toContain('aria-haspopup="dialog" aria-expanded={todayPopOpen}');
    expect(page).toContain('<div className="tdb-todaypop" role="dialog" aria-label="Today’s list">');
    expect(page).toContain('if (e.key === "Escape") setTodayPopOpen(false);');
    expect(page).toContain('t.closest(".tdb-todaypop") || t.closest(".tdb-todaychip")');
    expect(css).toContain("@media (prefers-reduced-motion: reduce) { .tdb-todaypop { animation: none; } }");
  });
  it("the breakpoint belt: the rail hides <1500 in CSS too; narrow closes the popover on widen", () => {
    expect(css).toContain("@media (max-width: 1499.98px) { .tdb-railr { display: none; } }");
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
    expect((page.match(/tdb-lgs/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });
  it("the batch card's Never is the ghost-link grammar (same handler)", () => {
    expect(page).toContain('className="tdb-gnever ghost"');
    expect(rule(".tdb-gnever.ghost")).toContain("border-bottom: 1px solid var(--line)");
    expect(page).toContain("muteRuleFromCard(g)");
  });
});
