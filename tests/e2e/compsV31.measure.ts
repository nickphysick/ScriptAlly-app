/**
 * Comparable titles v3.1 — the layout corrections, measured.
 *
 * ⚠️ EVERY TEST THAT ADDS A COMP REMOVES IT IN A `finally`. The harness shelf is empty, so a
 * leftover would put the next run in the other state and its failure would read as a state-machine
 * bug rather than as dirty data.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

/**
 * ⚠️ TWO CASES WERE RETIRED FROM THIS FILE (v3.1 §4/§5), NOT QUIETLY DELETED. Both drove
 * `.ct-caro-toggle`, and the toggle is gone: the missteps have their own BLOCK now rather than a
 * second track behind a control. `compsReorder.measure.ts` carries the replacements — the missteps
 * block with its five slots, and a reduced-motion case sweeping EVERY reel on the page rather than
 * the two tracks of one.
 *
 * ⚠️ AND THE BAND ASSERTION WENT WITH THEM WHILE THE REST OF ITS CASE STAYED. That is the half worth
 * keeping: the top row's `align-items: start` and the tail row absorbing the paired-panel slack are
 * live behaviour, and the band is retired furniture. A case asserting both is one edit away from
 * being deleted whole.
 */
const ROUTE = "/manuscripts/comps";
const T = "E2E Harness Comp";

async function add(page: import("@playwright/test").Page, title: string, year = "2021") {
  await page.locator(".ct-btn-dark, .ct-ctail, .ct-bandbtn").first().click();
  await page.locator("#ct-f-title").fill(title);
  await page.locator("#ct-f-year").fill(year);
  await page.locator(".ct-cform .ct-btn-pink").click();
  await page.locator(`.ct-crow:has-text("${title}")`).waitFor({ timeout: 8000 });
}
async function clear(page: import("@playwright/test").Page) {
  for (let i = 0; i < 6; i++) {
    const card = page.locator(`.ct-crow:has-text("${T}")`).first();
    if (!(await card.count())) break;
    await card.locator('button:has-text("Remove")').click({ force: true }).catch(() => {});
    await card.waitFor({ state: "detached", timeout: 8000 }).catch(() => {});
  }
}

test("§1 the feature block sits inside a measure, copy beside illustration", async ({ page }) => {
  await openRoute(page, ROUTE, { width: 1440, height: 1000 });
  const r = await page.evaluate(() => {
    const f = document.querySelector(".ctpage .ct-feature") as HTMLElement;
    const copy = f.querySelector(".ct-feature-l") as HTMLElement;
    const caro = f.querySelector(".ct-caro") as HTMLElement;
    const cs = getComputedStyle(f);
    const c = copy.getBoundingClientRect(), k = caro.getBoundingClientRect();
    return {
      measure: Math.round(f.getBoundingClientRect().width),
      maxW: cs.maxWidth, justify: cs.justifyContent,
      copyW: Math.round(c.width), caroW: Math.round(k.width),
      gap: Math.round(k.left - c.right),
      /* the CTA count — §3 leaves exactly one action on first visit */
      ctas: f.querySelectorAll(".ct-feature-ctas button").length,
      scoutOnFirstVisit: !!document.querySelector(".ctpage .ct-scout--solo, .ctpage .ct-sbody"),
    };
  });
  console.log(`  measure ${r.measure} (max ${r.maxW}) justify=${r.justify} · copy ${r.copyW} · caro ${r.caroW} · gap ${r.gap}`);
  console.log(`  ctas=${r.ctas} scoutOnFirstVisit=${r.scoutOnFirstVisit}`);
  expect(r.maxW, "the shared measure is missing").toBe("1060px");
  expect(r.justify).toBe("center");
  expect(r.copyW, "the copy column is running away again").toBeLessThanOrEqual(500);
  expect(r.caroW).toBe(420);
  expect(r.gap, "the copy and the illustration are not adjacent").toBeLessThanOrEqual(50);
  expect(r.ctas, "first visit must offer exactly one action").toBe(1);
  expect(r.scoutOnFirstVisit, "the Scout is still on the first-visit state").toBe(false);
});

test("§2 the stage and the dots share one width, and the counter is gone", async ({ page }) => {
  await openRoute(page, ROUTE, { width: 1440, height: 1000 });
  const r = await page.evaluate(() => {
    const caro = document.querySelector(".ctpage .ct-caro") as HTMLElement;
    const stage = caro.querySelector(".ct-caro-stage") as HTMLElement;
    const dots = caro.querySelector(".ct-caro-dots") as HTMLElement;
    const slot = caro.querySelector(".ct-caro-slide.on .ct-caro-slot") as HTMLElement;
    const w = caro.getBoundingClientRect(), s = stage.getBoundingClientRect();
    const d = dots.getBoundingClientRect();
    return {
      wrapW: Math.round(w.width), stageW: Math.round(s.width), dotsW: Math.round(d.width),
      stageRight: Math.round(s.right), wrapRight: Math.round(w.right),
      dotsCentred: Math.abs((d.left + d.right) / 2 - (s.left + s.right) / 2) < 2,
      counterGone: !caro.querySelector(".ct-caro-count"),
      slotH: Math.round(slot.getBoundingClientRect().height),
    };
  });
  console.log(`  wrap ${r.wrapW} · stage ${r.stageW} · dots ${r.dotsW} · dots centred=${r.dotsCentred} · counter gone=${r.counterGone} · slot ${r.slotH}`);
  expect(r.stageW, "the stage overruns its wrapper").toBeLessThanOrEqual(r.wrapW);
  expect(r.stageRight, "the stage overruns the wrapper's right edge").toBeLessThanOrEqual(r.wrapRight + 1);
  expect(r.dotsCentred, "the dots are not centred under the card").toBe(true);
  /* ⚠️ THE COUNTER IS RETIRED (v3.1 §2) — the dots state position, so this asserts its ABSENCE
     where it used to assert its placement. An assertion about where a deleted thing sits is one
     that can only ever fail or mislead. */
  expect(r.counterGone, "the n/5 counter is back").toBe(true);
  expect(r.slotH).toBe(250);
});

test("§5 the top row starts, and the tail absorbs the paired-panel slack", async ({ page }) => {
  await openRoute(page, ROUTE, { width: 1440, height: 1000 });
  try {
    await add(page, `${T} one`);
    const one = await page.evaluate(() => {
      const q = (s: string) => document.querySelector(`.ctpage ${s}`) as HTMLElement;
      const tile = q(".ct-mstile"), card = q(".ct-toprow .ct-qline");
      const comps = document.querySelectorAll(".ctpage .ct-split > .ct-panel")[0] as HTMLElement;
      const scout = document.querySelectorAll(".ctpage .ct-split > .ct-panel")[1] as HTMLElement;
      const tail = q(".ct-ctail");
      return {
        row: getComputedStyle(q(".ct-toprow")).alignItems,
        tileH: Math.round(tile.getBoundingClientRect().height),
        cardH: Math.round(card.getBoundingClientRect().height),
        compsH: Math.round(comps.getBoundingClientRect().height),
        scoutH: Math.round(scout.getBoundingClientRect().height),
        tailH: Math.round(tail.getBoundingClientRect().height),
      };
    });
    console.log(`  align=${one.row} tile ${one.tileH} card ${one.cardH} · comps ${one.compsH} scout ${one.scoutH} · tail ${one.tailH}`);
    expect(one.row, "the top row is stretching again — the tile loses its compression").toBe("start");
    expect(one.tileH, "the tile is being stretched to the builder's height").toBeLessThan(200);
    expect(Math.abs(one.compsH - one.scoutH), "comps and Scout stopped sharing a height").toBeLessThanOrEqual(2);
    expect(one.tailH, "the tail row is not absorbing the slack at one comp").toBeGreaterThan(120);
    /* ⚠️ THE STAGE SLOT'S GEOMETRY MOVED TO `compsReorder` (v3.1 §4) — it is a 4:3 plate now, not a
       120px circle, and it is asserted there against its own column rather than here against a
       literal that this round retired. */

    /* at several comps the same tail is a thin strip — the point of `flex: 1` */
    await add(page, `${T} two`, "2022");
    await add(page, `${T} three`, "2023");
    const many = await page.evaluate(() => Math.round((document.querySelector(".ctpage .ct-ctail") as HTMLElement).getBoundingClientRect().height));
    console.log(`  tail at three comps: ${many}`);
    expect(many, "the tail did not shrink as the list grew").toBeLessThan(one.tailH);
  } finally {
    await clear(page);
  }
});

test("under 1040px everything stacks, with no horizontal overflow", async ({ page }) => {
  await openRoute(page, ROUTE, { width: 1000, height: 1000 });
  const r = await page.evaluate(() => {
    const f = document.querySelector(".ctpage .ct-feature") as HTMLElement;
    const g = document.querySelector(".ctpage .ct-stages-grid") as HTMLElement;
    const sc = document.querySelector(".ctpage .wpg-scroll") as HTMLElement;
    return {
      featureCols: getComputedStyle(f).gridTemplateColumns.split(" ").length,
      stageCols: getComputedStyle(g).gridTemplateColumns.split(" ").length,
      xOverflow: sc.scrollWidth - sc.clientWidth,
    };
  });
  console.log(`  feature cols=${r.featureCols} stage cols=${r.stageCols} x-overflow=${r.xOverflow}`);
  expect(r.featureCols).toBe(1);
  expect(r.stageCols).toBe(1);
  expect(r.xOverflow).toBeLessThanOrEqual(1);
});

