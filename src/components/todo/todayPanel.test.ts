/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE TODAY PANEL (save-and-today pack · P2) — design-refs/today-panel.html frame 1. Source/rule-text
 * locks: the overlay elevation pair and the NO-OPACITY law, the header's derived progress, the row
 * grammar (truncation + meaningful sub-labels only), tick-strikes-in-place with the move deferred,
 * the done band, the single-primary footer with "Help me pick" relocated, and the scroll cap.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const here = __dirname;
const page = readFileSync(join(here, "ToDoPage.tsx"), "utf8");
const css = readFileSync(join(here, "todo.css"), "utf8");
const rule = (sel: string): string => {
  const m = css.match(new RegExp("(?:^|\\n)" + sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*\\{([^}]*)\\}"));
  if (!m) throw new Error(`rule not found: ${sel}`);
  return m[1];
};
const panel = page.slice(page.indexOf("function renderTodayPanel"), page.indexOf("function renderLedger"));

describe("Today panel P2 — the surface: elevation, never opacity", () => {
  it("white, #ddd2c2, radius 14, and a TWO-LAYER shadow that deepens on hover", () => {
    const c = rule(".tdb-today2");
    expect(c).toContain("border: 1px solid #ddd2c2");
    expect(c).toContain("border-radius: 14px");
    expect(c).toContain("box-shadow: var(--td-elev)");
    expect(rule(".tdb-today2:hover")).toContain("box-shadow: var(--td-elev-hov)");
    const w = rule(".tdb-wrap");
    // ambient + contact, per the ref
    expect(w).toContain("--td-elev: 0 18px 44px rgba(58, 28, 20, 0.20), 0 2px 6px rgba(58, 28, 20, 0.10)");
    expect(w).toContain("--td-elev-hov: 0 22px 54px rgba(58, 28, 20, 0.26), 0 2px 8px rgba(58, 28, 20, 0.12)");
  });
  it("THE NO-OPACITY LAW: a functional panel stays full contrast — it recedes by elevation and size only", () => {
    for (const sel of [".tdb-today2", ".tdb-today2:hover", ".tdb-tdpop"]) {
      expect(rule(sel)).not.toMatch(/(^|[^-\w])opacity\s*:/);
    }
  });
  it("290px wide, capped at a third of the viewport, with the ROWS taking the overflow", () => {
    const p = rule(".tdb-tdpop");
    expect(p).toContain("width: var(--td-w)");
    expect(p).toContain("max-height: 33vh");
    expect(rule(".tdb-wrap")).toContain("--td-w: 290px");
    expect(rule(".tdb-wrap")).toContain("--td-rows-max: 290px");
    expect(rule(".tdb-tmid2")).toContain("max-height: var(--td-rows-max)");
    expect(rule(".tdb-tmid2")).toContain("overflow-y: auto");
  });
});

describe("Today panel P2 — the header earns its height", () => {
  it("46px sage, and the WHOLE header is the collapse control", () => {
    const h = rule(".tdb-th");
    expect(h).toContain("height: var(--container-head-h)");
    expect(rule(".tdb-wrap")).toContain("--container-head-h: 46px");
    expect(h).toContain("background: var(--container-head-bg)");
    expect(h).toContain("border-bottom: 1px solid var(--container-head-rule)");
    // a real button, not a div with a nested control
    // P3: the same header toggles BOTH ways and names its state
    expect(panel).toContain("onClick={() => toggleTodayMin(!todayMin)}");
    expect(panel).toContain("aria-expanded={!todayMin}");
    expect(panel).toContain('aria-label={todayMin ? "Open Today" : "Collapse Today"}');
  });
  it("title + a 52px progress bar + the {done}/{total} fraction + the chevron", () => {
    expect(panel).toContain('<b className="tdb-t">Today</b>');
    expect(panel).toContain('<span className="tdb-tpbar"><i style={{ width: `${pct}%` }} /></span>');
    expect(panel).toContain("{doneN} / {total}");
    expect(panel).toContain('className={`tdb-chev${todayMin ? " up" : ""}`}'); // P3: one glyph, rotated
    expect(rule(".tdb-tpbar")).toContain("width: 52px");
  });
  it("the progress is DERIVED from the day's own numbers, never stored", () => {
    expect(panel).toContain("const total = committedCards.length + doneN;");
    expect(panel).toContain("const pct = total > 0 ? Math.round((doneN / total) * 100) : 0;");
  });
});

describe("Today panel P2 — the rows", () => {
  it("single line with truncation, a sage completion circle, and no wrapping", () => {
    expect(rule(".tdb-trtx")).toContain("text-overflow: ellipsis");
    expect(rule(".tdb-trtx")).toContain("white-space: nowrap");
    expect(rule(".tdb-cc")).toContain("border: 1.6px solid var(--nt-task-line)"); // the sage family token
    expect(rule(".tdb-cc")).toContain("border-radius: 50%");
  });
  it("a mono sub-label ONLY where it means something (DUE TODAY · OVERDUE · YOUR TASK)", () => {
    expect(panel).toContain('if (c.nature !== "task") return null;'); // derived rows caption nothing
    expect(panel).toContain('if (c.dueState === "today") return "DUE TODAY";');
    expect(panel).toContain('if (c.dueState === "overdue") return "OVERDUE";');
    expect(panel).toContain('return "YOUR TASK";');
    expect(panel).toContain("{sub && <span className=\"tdb-trsub\">{sub}</span>}");
    expect(rule(".tdb-trsub")).toContain("font-family: var(--f12-mono)");
  });
  it("ticking STRIKES IN PLACE and defers the move — so undo stays easy", () => {
    // struck where it sits this open…
    expect(page).toContain("const struck = strikeIds.has(c.key);");
    expect(page).toContain('className={`tdb-trow${struck ? " done" : ""}`}');
    expect(rule(".tdb-trow.done .tdb-trtx")).toContain("text-decoration: line-through");
    // …and the set is cleared on the NEXT open, which is when the row joins the done band
    expect(page).toContain("setStrikeIds((s) => new Set(s).add(c.key));");
    expect(page).toContain("void quickDone(c);"); // the existing completion primitive + undo toast
    expect(page).toContain("setStrikeIds(new Set())");
  });
});

describe("Today panel P2 — the done band + ONE footer action", () => {
  it("the done band is a collapsed strip that expands in place", () => {
    expect(panel).toContain("✓ {doneN} DONE TODAY {showDone ? \"▾\" : \"▸\"}");
    expect(panel).toContain("aria-expanded={showDone}");
    expect(panel).toContain("{showDone && (");
  });
  it("ONE primary — ink Work the list → — plus a quiet ＋ roundel; Help me pick moved INSIDE the add flow", () => {
    expect(panel).toContain("Work the list →");
    expect(rule(".tdb-pbtn")).toContain("background: #2a1a13"); // the ink primary
    expect(panel).toContain("disabled={committedCards.length === 0}");
    expect(panel).toContain('className="tdb-sbtn" aria-label="Add to Today"');
    expect(panel).toContain('>Help me pick</button>');
    expect(panel).toContain('>Choose from the board</button>');
    // the second ghost button is gone: exactly one primary and one roundel in the foot
    expect(panel).not.toContain("＋ Add more");
    expect(panel).not.toContain('className="tdb-btnp sm"');
  });
});

describe("Today panel P3 — collapse, the launcher, and its neighbours", () => {
  const corner = page.slice(page.indexOf("function renderTodayCorner"), page.indexOf("// ── save-and-today P2"));

  it("ONE node in both states, so collapsing animates HEIGHT ONLY and the corner never jumps", () => {
    expect(corner).toContain('className={`tdb-tdpop${todayMin ? " min" : ""}');
    expect(corner).not.toContain("tdb-tdpill"); // the separate pill element is retired
    const body = rule(".tdb-tdbody");
    expect(body).toContain("overflow: hidden");
    expect(body).toContain("transition: max-height 180ms ease"); // ~180ms, height only
    expect(body).not.toMatch(/transform|opacity|width/); // nothing else animates
    expect(rule(".tdb-tdpop.min .tdb-tdbody")).toContain("max-height: 0");
    expect(css).toContain("@media (prefers-reduced-motion: reduce) { .tdb-tdbody { transition: none; } }");
  });

  it("COLLAPSED = the header alone as the launcher: Today + the outstanding count in a sage pill + chevron up", () => {
    expect(page).toContain('<span className="tdb-cnt">{committedCards.length}</span>');
    const cnt = rule(".tdb-cnt");
    expect(cnt).toContain("background: var(--container-head-bg)"); // the sage family
    expect(cnt).toContain("border-radius: 99px");
    expect(rule(".tdb-tdpop.min .tdb-th")).toContain("border-radius: 99px"); // reads as a pill
    // the chevron ROTATES rather than swapping glyph
    expect(rule(".tdb-chev.up")).toContain("transform: rotate(180deg)");
    expect(rule(".tdb-chev")).toContain("transition: transform 0.18s ease");
  });

  it("it never vanishes while items exist, and vanishes ENTIRELY when the list is empty", () => {
    expect(corner).toContain("if (!todayShown) return null;");           // empty → no corner at all
    expect(page).toContain("const todayActive = committedCards.length > 0 || doneN > 0;"); // what "empty" means
    // the collapsed state is a launcher, never an absence
    expect(corner).toContain("{renderTodayPanel()}");
  });

  it("the collapsed/expanded state PERSISTS per user across reloads", () => {
    expect(page).toContain('localStorage.getItem("sa.todoTodayMin") === "1"');
    expect(page).toContain('localStorage.setItem("sa.todoTodayMin", v ? "1" : "0")');
  });

  it("ADJACENCY: the help FAB steps clear of the corner's footprint — the boxes cannot overlap or abut", () => {
    // the page publishes the clearance; the shell's FAB + menu both read it
    expect(page).toContain('root.style.setProperty("--sa-fab-shift", shift)');
    expect(page).toContain('!todayShown ? "0px" : todayMin ? "var(--td-fab-clear-min, 172px)" : "var(--td-fab-clear, 320px)"');
    expect(page).toContain('root.style.removeProperty("--sa-fab-shift")'); // no other route inherits it
    const shell = readFileSync(join(here, "..", "shell", "AppShell.tsx"), "utf8");
    expect(shell).toContain(".ashell-help-fab { display: flex; right: calc(20px + var(--sa-fab-shift, 0px)); }");
    expect(shell).toContain(".ashell-help-fab { right: calc(var(--shell-cap-gap) + 6px + var(--sa-fab-shift, 0px)); }");
    expect(shell).toContain(".ashell-help-menu { right: calc(var(--shell-cap-gap) + 6px + var(--sa-fab-shift, 0px)); }");
    const w = rule(".tdb-wrap");
    expect(rule(".tdb-tdpop")).toContain("width: var(--td-w)");
    expect(rule(".tdb-tdpop.min")).toContain("max-width: var(--td-launch-max)");
    // THE ARITHMETIC, asserted from the tokens themselves rather than eyeballed. The corner is
    // inset 26px and the FAB 20px (14px cap gap + 6), both measured from the viewport's right edge:
    //   corner occupies [26, 26 + width];  FAB starts at [20 + shift]
    //   clear ⇔ 20 + shift > 26 + width  (strictly greater — abutting is a fail, not a pass)
    const num = (name: string): number => Number(/(\d+)px/.exec(new RegExp(`${name}:\\s*(\\d+px)`).exec(w)![1])![1]);
    const CORNER_INSET = 26, FAB_INSET = 20;
    for (const [width, shift] of [
      [num("--td-w"), num("--td-fab-clear")],                 // expanded
      [num("--td-launch-max"), num("--td-fab-clear-min")],    // collapsed
    ]) {
      expect(FAB_INSET + shift).toBeGreaterThan(CORNER_INSET + width);
    }
  });

  it("SESSION: the corner leaves with the board and returns, state intact", () => {
    const stage = readFileSync(join(here, "..", "..", "lib", "sessionStage.ts"), "utf8");
    expect(stage).toContain('export const EXIT_RIGHT = ".tdb-tdpop"');
    // the state lives in React + localStorage, not in the DOM, so leave/return preserves it
    expect(page).toContain("const [todayMin, setTodayMin] = useState<boolean>");
  });
});
