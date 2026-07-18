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
  it("the drawer holds ＋ New note and the relocated Walk me through; the folded rail mirrors both", () => {
    expect(page).toContain('className="tdb-dcreate" onClick={addTask}>＋ New note');
    expect(page).toMatch(/tdb-dwalk" disabled=\{!tiles\.urgent\} aria-label=\{walkAria\(tiles\.urgent\)\} onClick=\{\(\) => openFlowCards\(board\.do\)\}/);
    expect(page).toContain('className="tdb-drawer folded"');
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
    expect(page).toContain('{committedCards.length ? "Add more" : "Help me pick"}');
    expect(page).toContain("onClick={() => openFlowCards(committedCards)}>Work the list");
  });
  it("AppShell hides the help FAB on /todo only — the pack's one out-of-page line", () => {
    expect(shell).toContain('{routeKey !== "todo" && (');
    expect(shell).not.toContain("helpMenuOpen"); // the corner two-item menu moved into the drawer foot
  });
});

describe("P1 — masthead composition + the centred column", () => {
  it("one row: title+date/week · 42px post-its · the scrap · search ⌘K · the view toggle", () => {
    expect(page).toContain("{shortHeaderDate(now)} · {weekOfQuerying(queries, new Date(now))}");
    expect(rule(".tdb-postit")).toContain("width: 42px");
    expect(page).toContain('className="tdb-msrch"');
    expect(page).toContain('className="tdb-vtg"');
    // Walk me through is NOT in the masthead any more (slice ends before the drawer's intro comment)
    const mast = page.slice(page.indexOf("function renderMasthead"), page.indexOf("// ── the floating drawer"));
    expect(mast).not.toContain("Walk me through");
  });
  it("type-scale: masthead title 20px, lane heads 16px", () => {
    expect(rule(".tdb-ask")).toContain("font-size: 20px");
    expect(rule(".tdb-lt")).toContain("font-size: 16px");
  });
  it("the content column caps at 1150 and centres; the row caps at 1720 (max-width discipline)", () => {
    expect(rule(".tdb-col")).toContain("max-width: 1150px");
    expect(rule(".tdb-ws")).toContain("max-width: 1720px");
    expect(rule(".tdb-ws")).toContain("margin: 0 auto");
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
  it("a wrapping auto-fill grid renders the cards; every reel mechanism is gone", () => {
    expect(page).toContain('<div className="tdb-grid">{children}</div>');
    expect(rule(".tdb-grid")).toContain("repeat(auto-fill, minmax(230px, 1fr))");
    for (const gone of ["laneFit", "lanePageDistance", "laneFadeState", "tdb-pager", "tdb-scroller", "scrollBy"]) {
      expect(page).not.toContain(gone);
    }
    expect(css).not.toContain("scroll-snap");
  });
  it("tightened anatomy: 26px band, 14px titles, min-height 200, tighter body", () => {
    expect(rule(".tdb-band")).toContain("min-height: 26px");
    expect(rule(".tdb-tt")).toContain("font-size: 14px");
    expect(rule(".tdb-body")).toContain("padding: 10px 12px 11px");
  });
  it("renames: Begin focused session (lane heads) + Batch fix (group CTA); Fix together is gone", () => {
    expect(page).toContain('aria-hidden />Begin focused session');
    expect(page).toContain(">Batch fix →</button>");
    expect(page).not.toContain("Fix together");
    expect(page).toMatch(/aria-label=\{`Begin a focused session on \$\{label\}`\}/);
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
