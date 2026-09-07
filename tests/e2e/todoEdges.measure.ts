import { test, expect } from "@playwright/test";
import { ensureSignedIn, liftMotionSuppression, visiblePage } from "./measure";
import { writeFileSync, rmSync } from "node:fs";
test.setTimeout(600_000);

/**
 * ⚠️ THE PAGE RUNS TO ITS EDGES (corrections 2.1).
 *
 * The grid and the board used to ride inside `TaskList`'s card — white, 1px border, 12px radius,
 * shadowed, with `.l-body` an inner scroller — so the page looked pinched, the board's horizontal
 * scroll happened inside a rounded box that clipped its last column, and a footer strip restated a
 * count the tiles already give.
 *
 * ⚠️ EVERY CLAIM HERE IS MEASURED AGAINST `/queries`, NEVER AGAINST A LITERAL. The Query Centre is
 * the thing To-do is supposed to match; a hard-coded inset would go green the day its own layout
 * moved, which is the drift this exists to catch.
 *
 * ⚠️ NO BACKTICKS AND NO REGEX INSIDE ANY page.evaluate TEMPLATE.
 */
type R = { id: string; ok: boolean; note: string };

test("the page runs to its edges — no wrapper between the toolbar and the columns", async ({ page }) => {
  const out: R[] = [];
  const add = (id: string, ok: boolean, note = "") => out.push({ id, ok, note });
  const OUT = "run-artifacts/todo-edges.txt";
  rmSync(OUT, { force: true });

  await ensureSignedIn(page);
  await page.setViewportSize({ width: 1440, height: 900 });

  /** the chain from a content element up to its scroller, and whether anything paints a container */
  const CHAIN = `(sel) => {
    const vis = (e) => e.getBoundingClientRect().height > 0;
    const el = [...document.querySelectorAll(sel)].find(vis);
    if (!el) return null;
    const links = [];
    let n = el;
    while (n && n !== document.body) {
      const cs = getComputedStyle(n);
      links.push({
        cls: String(n.className).slice(0, 26),
        painted: cs.backgroundColor !== "rgba(0, 0, 0, 0)"
          || parseFloat(cs.borderTopWidth) > 0 || parseFloat(cs.borderLeftWidth) > 0
          || (cs.borderRadius !== "0px" && cs.borderRadius !== "")
          || cs.boxShadow !== "none",
        scrolls: cs.overflowY === "auto" || cs.overflowY === "scroll"
          || cs.overflowX === "auto" || cs.overflowX === "scroll",
        isScroller: n.classList.contains("wpg-scroll"),
      });
      if (n.classList.contains("wpg-scroll")) break;
      n = n.parentElement;
    }
    const b = el.getBoundingClientRect();
    return { links, left: Math.round(b.left), right: Math.round(b.right) };
  }`;

  /* ── the Query Centre, as the reference ── */
  await page.goto("/queries");
  await page.waitForTimeout(3200);
  await liftMotionSuppression(page);
  const qc = await page.evaluate(`(${CHAIN})(".qcc-grid")`) as any;

  /* ── To-do, grid ── */
  await page.goto("/todo");
  await page.waitForFunction("document.querySelectorAll('.qct-tile').length > 0", null, { timeout: 45_000 }).catch(() => {});
  await liftMotionSuppression(page);
  await visiblePage(page, ".tdb-wrap");
  await page.waitForTimeout(600);
  const grid = await page.evaluate(`(${CHAIN})(".tkt-grid")`) as any;

  add("E0 · both pages rendered their content, so the chains below are about something",
      !!qc && !!grid, "queries " + !!qc + " · todo " + !!grid);

  /* ⚠️ THE CLAIM IS "NOTHING PAINTS A CONTAINER between the content and the scroller" — the same
     shape the Query Centre has, asserted on both so a change to ITS layout shows here too. */
  const paintedQc = (qc?.links ?? []).filter((l: any) => l.painted && !l.isScroller);
  const paintedTodo = (grid?.links ?? []).filter((l: any) => l.painted && !l.isScroller);
  add("E1 · the Query Centre paints no container between its grid and its scroller",
      paintedQc.length === 0, JSON.stringify((qc?.links ?? []).map((l: any) => l.cls)));
  add("E2 · and neither does To-do — no border, radius, background or shadow",
      paintedTodo.length === 0,
      paintedTodo.length ? "still painted: " + JSON.stringify(paintedTodo)
        : JSON.stringify((grid?.links ?? []).map((l: any) => l.cls)));

  /* ⚠️ AND ONLY THE PAGE SCROLLER SCROLLS. An inner scroller is what made the board's columns run
     out inside a rounded box instead of off the page's own edge. */
  const innerQc = (qc?.links ?? []).filter((l: any) => l.scrolls && !l.isScroller);
  const innerTodo = (grid?.links ?? []).filter((l: any) => l.scrolls && !l.isScroller);
  add("E3 · no inner scroller wraps the grid — on either page",
      innerQc.length === 0 && innerTodo.length === 0,
      "queries " + innerQc.length + " · todo " + innerTodo.length
        + (innerTodo.length ? " · " + JSON.stringify(innerTodo.map((l: any) => l.cls)) : ""));

  /* ⚠️ THE INSETS ARE COMPARED, NEVER PINNED. A literal would go green the day the Query Centre's
     own gutter moved — the drift this is here to catch. */
  add("E4 · /todo and /queries have identical left and right content insets at 1440",
      !!qc && !!grid && Math.abs(qc.left - grid.left) <= 1 && Math.abs(qc.right - grid.right) <= 1,
      "queries " + qc?.left + "…" + qc?.right + " · todo " + grid?.left + "…" + grid?.right);

  /* ── the board ── */
  await page.evaluate(`(() => {
    const b = [...__saVisRoot().querySelectorAll(".qvs button")].find((x) => (x.textContent || "").trim() === "Board");
    if (b) b.click();
  })()`);
  await page.waitForTimeout(1100);
  const board = await page.evaluate(`(${CHAIN})(".brd")`) as any;
  const paintedBoard = (board?.links ?? []).filter((l: any) => l.painted && !l.isScroller);
  const innerBoard = (board?.links ?? []).filter((l: any) => l.scrolls && !l.isScroller && !l.cls.startsWith("brd"));
  add("E5 · the board is on the page ground too — nothing paints or scrolls around it",
      !!board && paintedBoard.length === 0 && innerBoard.length === 0,
      "painted " + JSON.stringify(paintedBoard.map((l: any) => l.cls))
        + " · inner scrollers " + JSON.stringify(innerBoard.map((l: any) => l.cls)));

  /* ⚠️ NO ROUNDED CORNER MAY CLIP THE LAST COLUMN. The board's own overflow is the horizontal
     scroller; what must not exist is a rounded, clipping ancestor between it and the page. */
  const clipping = await page.evaluate(`(() => {
    const vis = (e) => e.getBoundingClientRect().height > 0;
    const b = [...document.querySelectorAll(".brd")].find(vis);
    if (!b) return null;
    const bad = [];
    let n = b.parentElement;
    while (n && n !== document.body) {
      const cs = getComputedStyle(n);
      if ((cs.overflowX === "hidden" || cs.overflowY === "hidden") && cs.borderRadius !== "0px")
        bad.push(String(n.className).slice(0, 26) + " r=" + cs.borderRadius);
      if (n.classList.contains("wpg-scroll")) break;
      n = n.parentElement;
    }
    return bad;
  })()`) as string[] | null;
  add("E6 · no rounded clipping ancestor between the board and the page scroller",
      Array.isArray(clipping) && clipping.length === 0, JSON.stringify(clipping));

  /* ── the footer strip and the stray icon ── */
  const strip = await page.evaluate(`(() => {
    const root = __saVisRoot();
    const foot = root.querySelector(".tlc .l-foot");
    return {
      footInContent: !!foot,
      footText: foot ? (foot.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 70) : null,
      barIcons: root.querySelectorAll(".tlc .l-bar .l-icon").length,
      exportInToolbar: root.querySelectorAll(".tdb-qtool .tdb-export").length,
      asideInToolbar: [...root.querySelectorAll(".tdb-qtool .qcc-tb-btn")]
        .filter((b) => (b.textContent || "").indexOf("Set aside") > -1).length,
    };
  })()`) as any;
  add("E7 · the footer strip and the card's icon bar are gone from the content area",
      !strip.footInContent && strip.barIcons === 0,
      "footer present " + strip.footInContent + " (" + JSON.stringify(strip.footText) + ") · bar icons " + strip.barIcons);
  add("E8 · Export and the set-aside door are in the toolbar row instead",
      strip.exportInToolbar === 1 && strip.asideInToolbar === 1,
      "export " + strip.exportInToolbar + " · set-aside " + strip.asideInToolbar);

  const lines = out.map((x) => (x.ok ? "green  " : "RED    ") + "· " + x.id + (x.note ? "\n         " + x.note : ""));
  const red = out.filter((x) => !x.ok);
  writeFileSync(OUT, "── todo edges · " + out.length + " assertions · " + red.length
    + " RED · " + (out.length - red.length) + " green\n" + lines.join("\n") + "\n");
  console.log(lines.join("\n"));
  expect(out.length, "assertion floor").toBeGreaterThanOrEqual(8);
  expect(red.length, red.map((x) => x.id).join(" | ")).toBe(0);
});
