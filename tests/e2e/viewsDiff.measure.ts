import { test, expect } from "@playwright/test";
import { ensureSignedIn } from "./measure";
import { gotoTodo, selectTodoView, assertCount } from "./todoOpen";
import { propsFor, camel } from "./anatomy";
import { VIEW_PARTS, VIEWS_PATH, VIEWS_MD5, cssOf, openContractView, readBox, trackShape,
  samePlace, type ViewName } from "./views";
import { writeFileSync, rmSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
test.setTimeout(1_200_000);

/**
 * PHASE 4 — THE DIFF THAT SEES ARRANGEMENT.
 *
 * ⚠️ THE DRAWER'S FOOT PASSED A PROPERTY DIFF WHILE SITTING 350px TOO HIGH. Every declared property
 * of `.dfoot` matched — padding, min-height, background, the hairline above it — because the
 * contract declares NOTHING about where the foot ends up. It ends up at the bottom through what its
 * sibling does. A property comparison cannot see a claim about arrangement, and arrangement is what
 * a writer sees.
 *
 * So every part is compared twice: its computed values, and its rect INSIDE ITS OWN CONTAINER. And
 * the contract is forced to the app's content width first, so both readings are in pixels rather
 * than in fractions that have to be argued about.
 *
 * ⚠️ NOTHING HERE STATES WHAT A VALUE SHOULD BE. The property names come from the contract's own
 * declarations and the values and positions from its own render, so a redesign that moves both
 * moves this with it, and a build that drifts from the artefact goes red naming both sides.
 */

/** the last recorded count — a run producing fewer is red, whatever its cases say */
/* ⚠️ THE LAST RECORDED COUNT, NOT A ROUND NUMBER BELOW IT. A floor set comfortably under the real
   figure is a guard that cannot fire — the suite could measure half of itself and still clear it. */
const FLOOR = 148;

async function bothPages(page: import("@playwright/test").Page) {
  const cpage = await page.context().newPage();
  await cpage.setViewportSize({ width: 1440, height: 900 });
  return cpage;
}

test("the three views match the contract — property by property AND place by place", async ({ page }) => {
  const OUT = "run-artifacts/views-diff.txt";
  rmSync(OUT, { force: true });
  const log: string[] = [];
  let ran = 0, compared = 0, waived = 0, placed = 0;

  const md5 = createHash("md5").update(readFileSync(VIEWS_PATH)).digest("hex");
  expect(md5, "the contract changed under this lock — re-run the recon before trusting it").toBe(VIEWS_MD5);
  const css = cssOf(VIEWS_PATH);

  await ensureSignedIn(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await gotoTodo(page, "grid");
  const cpage = await bothPages(page);

  for (const view of ["grid", "list", "board"] as ViewName[]) {
    await selectTodoView(page, view);
    await page.waitForTimeout(500);
    const appW = await page.evaluate((sel: string) => {
      const el = [...document.querySelectorAll(sel)].find((e) => e.getBoundingClientRect().width > 0);
      return el ? Math.round(el.getBoundingClientRect().width) : 0;
    }, view === "grid" ? ".tkt-grid" : view === "list" ? ".tlc" : ".brd");
    expect(appW, `${view}: the app draws no view root to measure`).toBeGreaterThan(200);
    await openContractView(cpage, view, appW);

    for (const p of VIEW_PARTS[view]) {
      const props = propsFor(css, p);
      const c = await readBox(cpage, p.cq ?? p.c, props, p.cIn);
      const a = p.app ? await readBox(page, p.app, props, p.aIn) : { found: false, count: 0, values: {} };

      if (!c.found) { log.push(`SKIP ${view} ${p.c} — the contract does not draw it in this view`); continue; }
      ran++;
      /* ⚠️ A DELIBERATE ABSENCE IS ASSERTED, NOT SKIPPED. Building it later goes red here and the
         decision has to be made again — which is the difference between a deviation and a drift. */
      if (p.absent) {
        expect.soft(a.found, `${view} ${p.c} is deliberately NOT built: ${p.absent}`).toBe(false);
        log.push(`ABSENT ${view} ${p.c} — ${p.absent}`);
        continue;
      }
      /* ⚠️ SOFT, SO EVERY PART IS MEASURED. A hard expect throws on the first offender and the parts
         below it are never compared — the "collect every offender" rule. The run still fails. */
      expect.soft(a.found,
        `${view} ${p.c} → ${p.app}: MISSING. A suite that cannot find its subject has FAILED, not skipped.`)
        .toBe(true);
      if (!a.found) continue;

      const diffs: string[] = [];
      for (const q of props) {
        let cv = c.values[q] ?? "", av = a.values[q] ?? "";
        if (q === "grid-template-columns" || q === "grid-template-rows") { cv = trackShape(cv); av = trackShape(av); }
        if (cv === av) { compared++; continue; }
        if (p.waive?.[camel(q)] ?? p.waive?.[q]) { waived++; continue; }
        diffs.push(`${q}: contract ${cv || "—"} · dev ${av || "—"}`);
      }
      ran++;
      expect.soft(diffs, `${view} ${p.c} → ${p.app} differs from the contract`).toEqual([]);
      if (diffs.length) log.push(`DIFF ${view} ${p.c}\n    ${diffs.join("\n    ")}`);

      ran++; placed++;
      const ok = samePlace(c.rel, a.rel, { abs: p.abs, fluid: p.fluid });
      expect.soft(ok, `${view} ${p.c} → ${p.app} sits somewhere else inside \`${p.cIn ?? "itself"}\``
        + `\n  contract ${c.rel?.dx},${c.rel?.dy} ${c.rel?.w}×${c.rel?.h}`
        + `\n  dev      ${a.rel?.dx},${a.rel?.dy} ${a.rel?.w}×${a.rel?.h}`).toBe(true);
      if (!ok) {
        log.push(`PLACE ${view} ${p.c} — contract ${c.rel?.dx},${c.rel?.dy} ${c.rel?.w}×${c.rel?.h}`
          + ` · dev ${a.rel?.dx},${a.rel?.dy} ${a.rel?.w}×${a.rel?.h}`);
      }
    }
  }
  await cpage.close();

  log.unshift(`${ran} assertions · ${compared} properties matched · ${waived} waived · ${placed} places compared`);
  writeFileSync(OUT, log.join("\n") + "\n");
  assertCount(ran, FLOOR, "viewsDiff");
  console.log(`\nVIEWS DIFF — ${ran} assertions · ${compared} properties · ${waived} waived · ${placed} places\n`);
});

/**
 * ⚠️ THE DIFF MUST BE ABLE TO FAIL IN BOTH DIRECTIONS, and that is PROVED here rather than
 * asserted. A comparison whose two sides happen never to disagree is indistinguishable from one
 * that compares nothing — and a position comparison that cannot see a move is exactly the hole the
 * drawer's foot went through.
 *
 * Both mutations are made to the CONTRACT'S copy in the browser, so nothing about the page under
 * test moves.
 */
test("the diff can fail — a bent value, and an element MOVED without changing any of its own", async ({ page }) => {
  await ensureSignedIn(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await gotoTodo(page, "board");
  const css = cssOf(VIEWS_PATH);
  const appW = await page.evaluate(() => {
    const el = [...document.querySelectorAll(".brd")].find((e) => e.getBoundingClientRect().width > 0);
    return el ? Math.round(el.getBoundingClientRect().width) : 0;
  });

  const discPart = VIEW_PARTS.board.find((p) => p.c === ".bcard .disc")!;
  const nmPart = VIEW_PARTS.board.find((p) => p.c === ".bcard .nm")!;
  const discProps = propsFor(css, discPart);
  const nmProps = propsFor(css, nmPart);

  const aDisc = await readBox(page, discPart.app!, discProps, discPart.aIn);
  const aNm = await readBox(page, nmPart.app!, nmProps, nmPart.aIn);
  expect(aDisc.found && aNm.found, "the board must draw a card for this proof to mean anything").toBe(true);

  const cpage = await page.context().newPage();
  await cpage.setViewportSize({ width: 1440, height: 900 });
  await openContractView(cpage, "board", appW);

  /* precondition: the two agree before anything is bent */
  const beforeDisc = await readBox(cpage, ".bcard .disc", discProps, ".bcard .main");
  const beforeNm = await readBox(cpage, ".bcard .nm", nmProps, ".bcard .main");
  expect(beforeDisc.values["width"], "precondition: the discs agree").toBe(aDisc.values["width"]);
  expect(samePlace(beforeNm.rel, aNm.rel), "precondition: the task sits in the same place").toBe(true);

  /* ── 1 · a bent PROPERTY reddens ── */
  await cpage.addStyleTag({ content: ".bcard .disc{border-radius:4px!important}" });
  const bent = await readBox(cpage, ".bcard .disc", discProps, ".bcard .main");
  expect(bent.values["border-radius"]).toBe("4px");
  expect(bent.values["border-radius"] === aDisc.values["border-radius"],
    "the property diff failed to notice a changed radius — it is comparing nothing").toBe(false);

  /* ── 2 · an element MOVED, with every one of its own properties untouched ──
     ⚠️ THIS IS THE HALF THE ANATOMY ROUND'S DIFF DID NOT HAVE. Widening the disc moves the task
     beside it; the task's own declared properties — its face, its size, its leading, its colour —
     are all exactly what they were. A property comparison passes; a place comparison must not. */
  await cpage.addStyleTag({ content: ".bcard .disc{width:60px!important;height:60px!important}" });
  await cpage.waitForTimeout(150);
  const movedNm = await readBox(cpage, ".bcard .nm", nmProps, ".bcard .main");

  const nmPropsUnchanged = nmProps.every((q) => movedNm.values[q] === beforeNm.values[q]);
  expect(nmPropsUnchanged,
    "the mutation changed one of the task's OWN properties, so it does not prove the place check")
    .toBe(true);
  expect(samePlace(movedNm.rel, aNm.rel),
    "the place check failed to notice an element that moved — this is the drawer-foot hole, open again")
    .toBe(false);
  expect(Math.abs((movedNm.rel?.dx ?? 0) - (beforeNm.rel?.dx ?? 0)),
    "the mutation did not actually move it").toBeGreaterThan(10);

  await cpage.close();
});
