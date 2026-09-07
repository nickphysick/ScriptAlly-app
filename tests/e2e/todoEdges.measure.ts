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

/**
 * ⚠️ THE DRAWER AS DESIGNED (corrections 2.2).
 *
 * The audit found the drawer was a correct slide-over of the WRONG WIDTH whose reference was an
 * inboard rail rather than the contract's pop-out index card. These are the four claims the brief
 * names, each measured rather than read.
 *
 * ⚠️ MOTION IS LIFTED FIRST. The drawer is a transform transition and the card is a rotation; a
 * suppressed transition reports where it STARTED, so a measurement taken with motion off would
 * read a closed drawer as closed whatever the click did.
 */
test("the drawer as designed — 640, no reflow, and the index card to its left", async ({ page }) => {
  const out: R[] = [];
  const add = (id: string, ok: boolean, note = "") => out.push({ id, ok, note });
  const OUT = "run-artifacts/todo-drawer.txt";
  rmSync(OUT, { force: true });

  await ensureSignedIn(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/todo");
  await page.waitForFunction("document.querySelectorAll('.qct-tile').length > 0", null, { timeout: 45_000 }).catch(() => {});
  await liftMotionSuppression(page);
  await visiblePage(page, ".tdb-wrap");
  await page.waitForTimeout(700);

  /* ⚠️ EVERY TICKET'S RECT AND THE SCROLL POSITION, BEFORE AND AFTER. "The page does not reflow" is
     a claim about the whole page, and sampling one card would pass over a layout that shifted
     everything else. */
  const SNAP = `(() => {
    const root = __saVisRoot();
    return {
      rects: [...root.querySelectorAll(".tkt")].map((t) => {
        const b = t.getBoundingClientRect();
        return Math.round(b.left) + "," + Math.round(b.top) + "," + Math.round(b.width);
      }),
      scrollTop: (() => {
        const sc = [...document.querySelectorAll(".wpg-scroll")].find((e) => e.getBoundingClientRect().height > 0);
        return sc ? Math.round(sc.scrollTop) : -1;
      })(),
    };
  })()`;
  const before = await page.evaluate(SNAP) as { rects: string[]; scrollTop: number };

  await page.evaluate(`(function(){
    var ts=[].slice.call(__saVisRoot().querySelectorAll(".tkt"));
    var t=ts.filter(function(x){var e=x.querySelector(".ttl");return e && (e.textContent||"").indexOf("Send")===0;})[0];
    if(t)t.click();
  })()`);
  await page.waitForTimeout(1500);
  const after = await page.evaluate(SNAP) as { rects: string[]; scrollTop: number };

  add("D0 · opening the drawer changes NO page rect, and does not move the scroll",
      before.rects.length > 0 && before.rects.join("|") === after.rects.join("|")
        && before.scrollTop === after.scrollTop,
      "tickets " + before.rects.length + " · rects identical "
        + (before.rects.join("|") === after.rects.join("|"))
        + " · scrollTop " + before.scrollTop + " -> " + after.scrollTop);

  const d = await page.evaluate(`(function(){
    var d=document.querySelector(".slo"); var sc=document.querySelector(".slo-scrim");
    var r=document.querySelector(".slo .rail"); var qh=r?r.querySelector(".qhead"):null;
    if(!d) return null;
    var cs=getComputedStyle(d);
    /* ⚠️ THE LAYOUT WIDTH, NOT THE RECT — a rotated element's bounding rect is WIDER than its box,
       which is the trap this repo already records about measuring around a transform. */
    return {
      drawerW: Math.round(parseFloat(cs.width)),
      scrimOn: sc?sc.getAttribute("data-on"):null,
      card: r ? {
        w: Math.round(parseFloat(getComputedStyle(r).width)),
        transform: getComputedStyle(r).transform,
        radius: getComputedStyle(r).borderRadius,
        shadow: getComputedStyle(r).boxShadow !== "none",
        right: Math.round(r.getBoundingClientRect().right),
        drawerLeft: Math.round(d.getBoundingClientRect().left),
      } : null,
      headBg: qh?getComputedStyle(qh).backgroundColor:null,
      /* the ladder value the header is SUPPOSED to be, read from the page's own custom property */
      stageVar: qh ? (qh.getAttribute("style")||"") : null,
      dismiss: r ? !!r.querySelector(".qhead .lbl .cl") : false,
      dismissName: r ? ((r.querySelector(".qhead .lbl .cl")||{}).getAttribute
        ? r.querySelector(".qhead .lbl .cl").getAttribute("aria-label") : null) : null,
    };
  })()`) as any;

  add("D1 · the drawer is the contract's 640", d && d.drawerW === 640, "width " + d?.drawerW);
  add("D2 · it is over a scrim", d && d.scrimOn === "true", "scrim data-on " + d?.scrimOn);

  add("D3 · the reference is a 292px card, not a column",
      !!d?.card && d.card.w === 292, "card width " + d?.card?.w);

  /* ⚠️ THE ROTATION IS READ OFF THE MATRIX, because `transform` never computes back to the
     shorthand. cos(1.2°) = 0.999781, sin = 0.020942 — and the sign says which way. */
  const m = /matrix\(([^)]+)\)/.exec(d?.card?.transform ?? "");
  const parts = m ? m[1].split(",").map((x) => parseFloat(x)) : [];
  const deg = parts.length >= 2 ? (Math.atan2(parts[1], parts[0]) * 180) / Math.PI : NaN;
  add("D4 · the card is rotated −1.2°",
      Math.abs(deg - -1.2) < 0.05, "computed " + (Number.isFinite(deg) ? deg.toFixed(3) : "?") + "°");

  add("D5 · 14px radius and a deep shadow",
      d?.card?.radius === "14px" && d?.card?.shadow === true,
      "radius " + d?.card?.radius + " · shadow " + d?.card?.shadow);

  add("D6 · it sits to the drawer's LEFT, clear of it",
      !!d?.card && d.card.right < d.card.drawerLeft,
      "card right " + d?.card?.right + " · drawer left " + d?.card?.drawerLeft);

  /* ⚠️ THE HEADER'S COLOUR IS THE LADDER'S, DERIVED — asserted against the page's OWN custom
     property rather than a hex, so a retone of the ladder moves both together and this stays true.
     A literal here would be a second copy of the palette. */
  /* ⚠️ THE HEADER'S COLOUR IS THE LADDER'S, DERIVED — asserted against the page's OWN custom
     property rather than a hex, so a retone of the ladder moves both together and this stays true.
     A literal here would be a second copy of the palette.

     ⚠️ AND THE TOKEN NAME IS MATCHED IN NODE. The first version did it in the browser with
     `[a-z-]+`, which excludes digits — and every token is `--stage-out-1`, `--stage-in-2` and so on,
     so it matched nothing and reported "the header carries no stage token at all" about a header
     that was plainly tinted. The house rule says patterns live on this side; this is why. */
  const styleAttr = await page.evaluate(`(function(){
    var qh=document.querySelector(".slo .rail .qhead");
    return qh ? (qh.getAttribute("style") || "") : "";
  })()`) as string;
  const tok = /var\(\s*(--stage-[A-Za-z0-9-]+)\s*\)/.exec(styleAttr)?.[1] ?? null;
  const ladder = tok ? await page.evaluate(`(function(){
    var qh=document.querySelector(".slo .rail .qhead");
    var probe=document.createElement("div");
    probe.style.background = "var(${tok})";
    qh.appendChild(probe);
    var resolved=getComputedStyle(probe).backgroundColor;
    probe.remove();
    return JSON.stringify({resolved:resolved, actual:getComputedStyle(qh).backgroundColor});
  })()`).then((j) => JSON.parse(j as string)) : null;
  add("D7 · the card's header IS the ladder value for this query's status — derived, not stored",
      !!tok && !!ladder && ladder.resolved === ladder.actual && ladder.actual !== "rgba(0, 0, 0, 0)",
      tok ? ("token " + tok + " resolves " + ladder?.resolved + " · header " + ladder?.actual)
          : ("no stage token in the header's style: " + JSON.stringify(styleAttr)));

  add("D8 · the card carries a dismiss control with an accessible name",
      d?.dismiss === true && !!d?.dismissName, "name " + JSON.stringify(d?.dismissName));

  const lines = out.map((x) => (x.ok ? "green  " : "RED    ") + "· " + x.id + (x.note ? "\n         " + x.note : ""));
  const red = out.filter((x) => !x.ok);
  writeFileSync(OUT, "── todo drawer · " + out.length + " assertions · " + red.length
    + " RED · " + (out.length - red.length) + " green\n" + lines.join("\n") + "\n");
  console.log(lines.join("\n"));
  expect(out.length, "assertion floor").toBeGreaterThanOrEqual(8);
  expect(red.length, red.map((x) => x.id).join(" | ")).toBe(0);
});
