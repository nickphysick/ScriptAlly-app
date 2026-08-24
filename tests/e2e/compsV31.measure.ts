/**
 * Comparable titles v3.1 — the layout corrections, measured.
 *
 * ⚠️ EVERY TEST THAT ADDS A COMP REMOVES IT IN A `finally`. The harness shelf is empty, so a
 * leftover would put the next run in the other state and its failure would read as a state-machine
 * bug rather than as dirty data.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";
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

test("§2 the stage and the dots share one width, counter inside", async ({ page }) => {
  await openRoute(page, ROUTE, { width: 1440, height: 1000 });
  const r = await page.evaluate(() => {
    const caro = document.querySelector(".ctpage .ct-caro") as HTMLElement;
    const stage = caro.querySelector(".ct-caro-stage") as HTMLElement;
    const dots = caro.querySelector(".ct-caro-dots") as HTMLElement;
    const count = caro.querySelector(".ct-caro-count") as HTMLElement;
    const slot = caro.querySelector(".ct-caro-slide.on .ct-caro-slot") as HTMLElement;
    const w = caro.getBoundingClientRect(), s = stage.getBoundingClientRect();
    const d = dots.getBoundingClientRect(), c = count.getBoundingClientRect();
    return {
      wrapW: Math.round(w.width), stageW: Math.round(s.width), dotsW: Math.round(d.width),
      stageRight: Math.round(s.right), wrapRight: Math.round(w.right),
      dotsCentred: Math.abs((d.left + d.right) / 2 - (s.left + s.right) / 2) < 2,
      countInside: c.left >= s.left && c.right <= s.right && c.top >= s.top,
      slotH: Math.round(slot.getBoundingClientRect().height),
    };
  });
  console.log(`  wrap ${r.wrapW} · stage ${r.stageW} · dots ${r.dotsW} · dots centred=${r.dotsCentred} · counter inside=${r.countInside} · slot ${r.slotH}`);
  expect(r.stageW, "the stage overruns its wrapper").toBeLessThanOrEqual(r.wrapW);
  expect(r.stageRight, "the stage overruns the wrapper's right edge").toBeLessThanOrEqual(r.wrapRight + 1);
  expect(r.dotsCentred, "the dots are not centred under the card").toBe(true);
  expect(r.countInside, "the n/5 counter is outside the stage").toBe(true);
  expect(r.slotH).toBe(250);
});

test("§6 the second track carries the missteps and resets to slide one", async ({ page }) => {
  await openRoute(page, ROUTE, { width: 1440, height: 1000 });
  /* move off slide one so the reset is observable */
  await page.locator(".ctpage .ct-caro-dot").nth(3).click();
  const before = await page.evaluate(() => document.querySelector(".ctpage .ct-caro-dot.on")?.getAttribute("aria-label"));
  await page.locator(".ctpage .ct-caro-toggle").click();
  const r = await page.evaluate(() => ({
    label: document.querySelector(".ctpage .ct-caro")?.getAttribute("aria-label"),
    active: document.querySelector(".ctpage .ct-caro-dot.on")?.getAttribute("aria-label"),
    pressed: document.querySelector(".ctpage .ct-caro-toggle")?.getAttribute("aria-pressed"),
    slots: [...document.querySelectorAll(".ctpage .ct-caro-slot")].map((s) => s.getAttribute("data-slot")),
  }));
  console.log(`  was "${before}" → track "${r.label}" active "${r.active}" pressed=${r.pressed}`);
  console.log(`  slots: ${r.slots!.join(" · ")}`);
  expect(r.label).toBe("Common missteps");
  expect(r.active, "switching tracks did not reset to slide one").toContain("Comping the giants");
  expect(r.pressed).toBe("true");
  expect(r.slots).toEqual(["comp-miss-giants", "comp-miss-age", "comp-miss-unread", "comp-miss-shelf", "comp-miss-count"]);
});

test("§4 the stages are a band; §5 the top row starts and the tail absorbs the slack", async ({ page }) => {
  await openRoute(page, ROUTE, { width: 1440, height: 1000 });
  try {
    await add(page, `${T} one`);
    const one = await page.evaluate(() => {
      const q = (s: string) => document.querySelector(`.ctpage ${s}`) as HTMLElement;
      const tile = q(".ct-mstile"), card = q(".ct-toprow .ct-qline");
      const comps = document.querySelectorAll(".ctpage .ct-split > .ct-panel")[0] as HTMLElement;
      const scout = document.querySelectorAll(".ctpage .ct-split > .ct-panel")[1] as HTMLElement;
      const tail = q(".ct-ctail"), band = q(".ct-stages-band"), circle = q(".ct-stage-slot");
      return {
        row: getComputedStyle(q(".ct-toprow")).alignItems,
        tileH: Math.round(tile.getBoundingClientRect().height),
        cardH: Math.round(card.getBoundingClientRect().height),
        compsH: Math.round(comps.getBoundingClientRect().height),
        scoutH: Math.round(scout.getBoundingClientRect().height),
        tailH: Math.round(tail.getBoundingClientRect().height),
        bandBg: getComputedStyle(band).backgroundImage.slice(0, 22),
        bandTop: getComputedStyle(band).borderTopWidth,
        circle: Math.round(circle.getBoundingClientRect().width),
      };
    });
    console.log(`  align=${one.row} tile ${one.tileH} card ${one.cardH} · comps ${one.compsH} scout ${one.scoutH} · tail ${one.tailH}`);
    console.log(`  band bg "${one.bandBg}" borderTop ${one.bandTop} · circle ${one.circle}`);
    expect(one.row, "the top row is stretching again — the tile loses its compression").toBe("start");
    expect(one.tileH, "the tile is being stretched to the builder's height").toBeLessThan(200);
    expect(Math.abs(one.compsH - one.scoutH), "comps and Scout stopped sharing a height").toBeLessThanOrEqual(2);
    expect(one.tailH, "the tail row is not absorbing the slack at one comp").toBeGreaterThan(120);
    expect(one.bandBg, "the stages band lost its wash").toContain("linear-gradient");
    expect(one.circle).toBe(120);

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

test("reduced motion still suppresses the autoplay on both tracks", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openRoute(page, ROUTE, { width: 1440, height: 1000 });
  const a = await page.evaluate(() => document.querySelector(".ctpage .ct-caro-dot.on")?.getAttribute("aria-label"));
  await page.waitForTimeout(5400);
  const b = await page.evaluate(() => document.querySelector(".ctpage .ct-caro-dot.on")?.getAttribute("aria-label"));
  await page.locator(".ctpage .ct-caro-toggle").click();
  const c = await page.evaluate(() => document.querySelector(".ctpage .ct-caro-dot.on")?.getAttribute("aria-label"));
  await page.waitForTimeout(5400);
  const d = await page.evaluate(() => document.querySelector(".ctpage .ct-caro-dot.on")?.getAttribute("aria-label"));
  console.log(`  jobs "${a}" → "${b}" · missteps "${c}" → "${d}"`);
  expect(b, "the jobs track autoplayed under reduced motion").toBe(a);
  expect(d, "the missteps track autoplayed under reduced motion").toBe(c);
});
