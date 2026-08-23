/**
 * ⚠️ DOES THE EMPTY STATE EVER APPEAR? A timing question needs an instrument that cannot miss a
 * 60ms window, so this records the DOM from before the app boots rather than sampling it.
 *
 * The last pack's checks passed while the flash was live: they measured the skeleton's stylesheet
 * and the resolved page, and never once asked what was on screen in between.
 *
 *   SA_E2E_BASE_URL=dev npx playwright test --project=measure qcFlash
 */
import { test, expect } from "@playwright/test";
import { openRoute, liftMotionSuppression } from "./measure";

/** Install before any app code runs: every mutation is inspected, nothing is sampled. */
const watch = async (page: any) => {
  await page.addInitScript(() => {
    (window as any).__qcSeen = { firstRun: 0, skeleton: 0, rows: 0, unselected: 0, log: [] as string[] };
    const t0 = Date.now();
    const look = () => {
      const s = (window as any).__qcSeen;
      const txt = document.body?.textContent || "";
      const mark = (k: string, on: boolean) => {
        if (!on) return;
        s[k] += 1;
        if (s[k] === 1) s.log.push(`${k}@${Date.now() - t0}ms`);
      };
      mark("firstRun", /first query starts here|No queries yet/i.test(txt));
      mark("skeleton", !!document.querySelector(".qc-skel"));
      mark("rows", !!document.querySelector(".f12-row:not(.qc-skel-row)"));
      mark("unselected", !!document.querySelector(".qc-unsel"));
    };
    const obs = new MutationObserver(look);
    const start = () => { if (document.body) { obs.observe(document.body, { childList: true, subtree: true, characterData: true }); look(); } else setTimeout(start, 0); };
    start();
  });
};

test("the load never states that the account is empty", async ({ page }) => {
  test.setTimeout(240000);
  await watch(page);
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  await page.waitForTimeout(4000);

  const seen = await page.evaluate(() => (window as any).__qcSeen);
  console.log(`  order of appearance: ${seen.log.join(" → ") || "(nothing recorded)"}`);
  console.log(`  first-run copy seen: ${seen.firstRun > 0} · skeleton seen: ${seen.skeleton > 0} · rows: ${seen.rows > 0}`);
  expect(seen.rows, "no rows ever arrived — the account looks empty for real").toBeGreaterThan(0);
  /* ⚠️ THE WHOLE CLAIM: with queries on file, the words must never appear at any point. */
  expect(seen.firstRun, "THE EMPTY STATE FLASHED during the load").toBe(0);
});

test("the skeleton is what covers the load, in both columns", async ({ page }) => {
  test.setTimeout(240000);
  await page.addInitScript(() => {
    (window as any).__qcCols = { list: 0, pane: 0, listRows: 0, at: [] as string[] };
    const t0 = Date.now();
    const look = () => {
      const c = (window as any).__qcCols;
      const sk = document.querySelector(".qc-skel");
      if (!sk) return;
      const list = sk.querySelector(".f12-list");
      const pane = sk.querySelector(".qc-skel-pane");
      if (list && !c.list) { c.list = 1; c.at.push(`list@${Date.now() - t0}ms`); }
      if (pane && !c.pane) { c.pane = 1; c.at.push(`pane@${Date.now() - t0}ms`); }
      c.listRows = Math.max(c.listRows, sk.querySelectorAll(".qc-skel-row").length);
    };
    const obs = new MutationObserver(look);
    const start = () => { if (document.body) { obs.observe(document.body, { childList: true, subtree: true }); look(); } else setTimeout(start, 0); };
    start();
  });
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  await page.waitForTimeout(4000);
  const c = await page.evaluate(() => (window as any).__qcCols);
  console.log(`  skeleton columns · list ${c.list ? "yes" : "NO"} · pane ${c.pane ? "yes" : "NO"} · skeleton rows ${c.listRows} · ${c.at.join(" ")}`);
  expect(c.list, "the LIST column never skeletoned").toBe(1);
  expect(c.pane, "the PANE column never skeletoned").toBe(1);
  expect(c.listRows, "the list skeleton drew no rows").toBeGreaterThan(0);
});

/** ⚠️ The observer records the skeleton's whole life, so the floor is measured rather than assumed. */
const watchLife = (page: any) => page.addInitScript(() => {
  (window as any).__qcLife = { on: 0, off: 0, firstRun: 0, unselAt: 0, selAt: 0 };
  const t0 = Date.now();
  const look = () => {
    const L = (window as any).__qcLife;
    const sk = !!document.querySelector(".qc-skel");
    if (sk && !L.on) L.on = Date.now() - t0;
    if (!sk && L.on && !L.off) L.off = Date.now() - t0;
    if (!L.firstRun && /first query starts here|No queries yet/i.test(document.body?.textContent || "")) L.firstRun = Date.now() - t0;
    if (!L.unselAt && document.querySelector(".qc-unsel")) L.unselAt = Date.now() - t0;
    if (!L.selAt && document.querySelector(".f12-row[aria-selected=true]")) L.selAt = Date.now() - t0;
  };
  const obs = new MutationObserver(look);
  const start = () => { if (document.body) { obs.observe(document.body, { childList: true, subtree: true, characterData: true }); look(); } else setTimeout(start, 0); };
  start();
});

test("§3b · a fast load still shows the skeleton for at least 400ms, and the content fades", async ({ page }) => {
  test.setTimeout(240000);
  await watchLife(page);
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  await page.waitForTimeout(4000);
  const L = await page.evaluate(() => (window as any).__qcLife);
  console.log(`  skeleton on ${L.on}ms → off ${L.off}ms (${L.off - L.on}ms) · first-run copy ${L.firstRun || "never"}`);
  expect(L.on, "the skeleton never appeared").toBeGreaterThan(0);
  /* ⚠️ THE FLOOR IS THE POINT: measured at 109ms before it existed, which reads as a glitch. */
  expect(L.off - L.on, "the skeleton was shown for less than its 400ms floor").toBeGreaterThanOrEqual(390);
  expect(L.firstRun, "the empty state appeared during the load").toBe(0);

  /* ⚠️ THE HARNESS SUPPRESSES MOTION WITH A STYLESHEET, so this read `animationName: none` about a
     working fade. Lifted before reading — the attribute persists once set, so the computed value is
     the rule's, measured after the fact rather than during it. */
  await liftMotionSuppression(page);
  await page.waitForTimeout(400);
  const fade = await page.evaluate(() => {
    const el = document.querySelector("[data-qc-fade='in']") as HTMLElement | null;
    if (!el) return null;
    const cs = getComputedStyle(el);
    return { name: cs.animationName, dur: cs.animationDuration, fill: cs.animationFillMode, transform: cs.transform };
  });
  console.log(`  fade · ${fade ? `${fade.name} ${fade.dur} fill:${fade.fill} transform:${fade.transform}` : "(attribute gone — animation finished)"}`);
  if (fade) {
    expect(fade.name).toBe("qc-fade-in");
    expect(fade.dur).toBe("0.2s");
    /* ⚠️ NO TRANSFORM — it would isolate a blend group and break mix-blend-mode on descendants. */
    expect(fade.transform, "the fade grew a transform").toMatch(/none|matrix\(1, 0, 0, 1, 0, 0\)/);
  }
});

test("§3a · the head is the real one, in the list column, in both states", async ({ page }) => {
  test.setTimeout(240000);
  await page.addInitScript(() => {
    (window as any).__qcHead = [];
    const obs = new MutationObserver(() => {
      const H = (window as any).__qcHead;
      const sk = document.querySelector(".qc-skel");
      const head = document.querySelector(".f12-list > .f12-lhead");
      const input = document.querySelector(".f12-lhead input");
      if (head) H.push({ skeleton: !!sk, h: Math.round(head.getBoundingClientRect().height), realInput: !!input });
    });
    const start = () => { if (document.body) obs.observe(document.body, { childList: true, subtree: true }); else setTimeout(start, 0); };
    start();
  });
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  await page.waitForTimeout(4000);
  const H = await page.evaluate(() => (window as any).__qcHead);
  const during = H.filter((x: any) => x.skeleton);
  const after = H.filter((x: any) => !x.skeleton);
  console.log(`  head during load: ${during.length ? `${during[0].h}px, real input ${during[0].realInput}` : "ABSENT"}`);
  console.log(`  head after load:  ${after.length ? `${after[after.length - 1].h}px` : "ABSENT"}`);
  /* ⚠️ THE SAME ELEMENT, THE SAME HEIGHT — so nothing above the rows moves when data lands. */
  expect(during.length, "the skeleton rendered no list head").toBeGreaterThan(0);
  expect(during[0].realInput, "the head's search was a skeleton block, not the real control").toBe(true);
  expect(after.length, "no head after the load").toBeGreaterThan(0);
  expect(during[0].h, "the head changed height across the swap — the rows below it jump").toBe(after[after.length - 1].h);
});

test("§3c · a remembered selection never flashes the empty pane first", async ({ page }) => {
  test.setTimeout(240000);
  /* remember a query, then reload and watch which of the two appears first */
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  await page.waitForTimeout(2500);
  await page.locator(".f12-row").nth(2).click();
  await page.waitForTimeout(1200);
  const remembered = await page.evaluate(() => localStorage.getItem("sa.queries.lastViewed"));
  console.log(`  remembered: ${remembered}`);
  expect(remembered, "nothing was remembered — the case cannot run").toBeTruthy();

  await watchLife(page);
  await page.reload();
  await page.waitForTimeout(4500);
  const L = await page.evaluate(() => (window as any).__qcLife);
  console.log(`  on reload · skeleton ${L.on}→${L.off}ms · unselected pane ${L.unselAt || "never"} · selection ${L.selAt || "never"}`);
  expect(L.selAt, "the remembered query never opened").toBeGreaterThan(0);
  /* ⚠️ THE WHOLE CLAIM: the skeleton resolves STRAIGHT to the remembered query. */
  expect(L.unselAt, "the unselected pane flashed before the remembered query arrived").toBe(0);
});

test("§3b · reduced motion gets neither the shimmer nor the fade", async ({ browser }) => {
  test.setTimeout(240000);
  const ctx = await browser.newContext({ reducedMotion: "reduce", storageState: "tests/e2e/.auth/state.json" });
  const page = await ctx.newPage();
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  await page.waitForTimeout(3000);
  await liftMotionSuppression(page);
  await page.waitForTimeout(400);

  const r = await page.evaluate(() => {
    /* the real classes, on real elements, against the shipped stylesheet */
    const block = document.createElement("span");
    block.className = "qc-sk qc-sk-l1";
    document.body.appendChild(block);
    const bcs = getComputedStyle(block);
    const out = {
      shimmer: bcs.animationName,
      blockH: Math.round(block.getBoundingClientRect().height),
      blockBg: bcs.backgroundColor,
      fade: "",
    };
    block.remove();
    const faded = document.querySelector("[data-qc-fade='in']") as HTMLElement | null;
    out.fade = faded ? getComputedStyle(faded).animationName : "(no faded element)";
    return out;
  });
  console.log(`  reduced motion · shimmer "${r.shimmer}" · fade "${r.fade}" · block ${r.blockH}px on ${r.blockBg}`);
  expect(r.shimmer, "the shimmer still runs under reduced motion").toBe("none");
  expect(r.fade, "the content still fades under reduced motion").toBe("none");
  /* ⚠️ THE BLOCKS STAY — the shape is the information; a skeleton that vanished under reduced
     motion would leave the page blank while it loads. */
  expect(r.blockH, "reduced motion removed the skeleton block itself").toBeGreaterThan(0);
  expect(r.blockBg, "reduced motion removed the block's fill").not.toMatch(/rgba\(0, 0, 0, 0\)/);
  await ctx.close();
});
