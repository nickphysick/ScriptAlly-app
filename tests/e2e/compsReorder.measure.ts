/**
 * Comparable titles v3.1 — the reorder, the flip, and the missteps block (§4/§5/§7).
 *
 * ⚠️ ORDER IS A CLAIM ABOUT THE WHOLE PAGE, so it is read from the DOM's document order rather than
 * by querying each block and hoping. A per-block check would pass on any arrangement of the three.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";
const ROUTE = "/manuscripts/comps";
const T = "E2E Harness Comp";

const blocks = (page: import("@playwright/test").Page, scope: string) =>
  page.evaluate((sel) => {
    const root = document.querySelector(sel) as HTMLElement;
    if (!root) return null;
    return [...root.querySelectorAll(".ct-stages, .ct-feature, .ct-blockrule")].map((el) => {
      if (el.classList.contains("ct-blockrule")) return "rule";
      if (el.classList.contains("ct-stages")) return "stages";
      const h = el.querySelector("h2")?.textContent?.trim() ?? "";
      return `${h.startsWith("Things") ? "missteps" : "jobs"}${el.classList.contains("flip") ? "+flip" : ""}${el.classList.contains("demoted") ? "+demoted" : ""}`;
    });
  }, scope);

test("§4 first visit reads stages · rule · jobs · rule · missteps(flipped)", async ({ page }) => {
  await openRoute(page, ROUTE, { width: 1440, height: 1000 });
  const order = await blocks(page, ".ctpage");
  console.log(`  order: ${order!.join(" → ")}`);
  expect(order).toEqual(["stages", "rule", "jobs", "rule", "missteps+flip"]);

  const r = await page.evaluate(() => {
    const flip = document.querySelector(".ctpage .ct-feature.flip") as HTMLElement;
    const copy = flip.querySelector(".ct-feature-l") as HTMLElement;
    const reel = flip.querySelector(".ct-caro") as HTMLElement;
    const band = document.querySelector(".ctpage .ct-stages-band");
    const rule = document.querySelector(".ctpage .ct-blockrule") as HTMLElement;
    const circle = document.querySelector(".ctpage .ct-stage-slot") as HTMLElement;
    return {
      reelLeftOfCopy: reel.getBoundingClientRect().left < copy.getBoundingClientRect().left,
      cols: getComputedStyle(flip).gridTemplateColumns,
      band: !!band,
      ctas: document.querySelectorAll(".ctpage .ct-feature-ctas button").length,
      ruleW: Math.round(rule.getBoundingClientRect().width),
      circle: Math.round(circle.getBoundingClientRect().width),
      eyebrow: flip.querySelector(".ct-feature-eyebrow")?.textContent?.trim(),
      heading: flip.querySelector("h2")?.textContent?.trim(),
      headingColour: getComputedStyle(flip.querySelector("h2")!).color,
      slots: [...flip.querySelectorAll(".ct-caro-slot")].map((s) => s.getAttribute("data-slot")),
    };
  });
  console.log(`  flip: reel-left=${r.reelLeftOfCopy} cols "${r.cols}" · band=${r.band} · ctas=${r.ctas} · rule ${r.ruleW} · circle ${r.circle}`);
  console.log(`  "${r.eyebrow}" / "${r.heading}" · slots ${r.slots!.join(" · ")}`);
  expect(r.reelLeftOfCopy, "the flipped block did not invert").toBe(true);
  expect(r.band, "the stages band is still rendering").toBe(false);
  expect(r.ctas, "first visit must offer exactly one action").toBe(1);
  expect(r.ruleW, "the divider is not inside the shared measure").toBeLessThanOrEqual(1060);
  expect(r.circle).toBe(120);
  expect(r.eyebrow).toBe("And five to avoid");
  expect(r.heading).toBe("Things to avoid");
  expect(r.slots).toEqual(["comp-miss-giants", "comp-miss-age", "comp-miss-unread", "comp-miss-shelf", "comp-miss-count"]);
});

test("§7 the workspace mirrors all three, demoted, in the same order", async ({ page }) => {
  await openRoute(page, ROUTE, { width: 1440, height: 1000 });
  try {
    await page.locator(".ct-btn-dark, .ct-ctail, .ct-bandbtn").first().click();
    await page.locator("#ct-f-title").fill(T);
    await page.locator("#ct-f-year").fill("2021");
    await page.locator(".ct-cform .ct-btn-pink").click();
    await page.locator(`.ct-crow:has-text("${T}")`).waitFor({ timeout: 8000 });
    const order = await blocks(page, ".ct-demoted");
    console.log(`  demoted: ${order!.join(" → ")}`);
    expect(order).toEqual(["stages", "rule", "jobs+demoted", "rule", "missteps+flip+demoted"]);
    const ctas = await page.evaluate(() => document.querySelectorAll(".ctpage .ct-feature-ctas button").length);
    const h = await page.evaluate(() => getComputedStyle(document.querySelector(".ctpage .ct-feature.demoted h2")!).fontSize);
    console.log(`  demoted ctas=${ctas} heading ${h}`);
    expect(ctas, "a demoted block still carries a CTA").toBe(0);
    expect(h).toBe("34px");
  } finally {
    const c = page.locator(`.ct-crow:has-text("${T}")`).first();
    if (await c.count()) {
      await c.locator('button:has-text("Remove")').click({ force: true }).catch(() => {});
      await c.waitFor({ state: "detached", timeout: 8000 }).catch(() => {});
    }
  }
});

test("under 1040px the flip stacks copy-first like its sibling", async ({ page }) => {
  await openRoute(page, ROUTE, { width: 1000, height: 1000 });
  const r = await page.evaluate(() => {
    const flip = document.querySelector(".ctpage .ct-feature.flip") as HTMLElement;
    const plain = document.querySelector(".ctpage .ct-feature:not(.flip)") as HTMLElement;
    const first = (el: HTMLElement) => {
      const c = el.querySelector(".ct-feature-l") as HTMLElement, r2 = el.querySelector(".ct-caro") as HTMLElement;
      return c.getBoundingClientRect().top <= r2.getBoundingClientRect().top ? "copy" : "reel";
    };
    const sc = document.querySelector(".ctpage .wpg-scroll") as HTMLElement;
    return { flipFirst: first(flip), plainFirst: first(plain), cols: getComputedStyle(flip).gridTemplateColumns.split(" ").length, x: sc.scrollWidth - sc.clientWidth };
  });
  console.log(`  stacked: plain "${r.plainFirst}" first · flip "${r.flipFirst}" first · cols=${r.cols} · x-overflow=${r.x}`);
  expect(r.flipFirst, "the flip inverted on narrow screens — it must stack copy-first").toBe("copy");
  expect(r.flipFirst).toBe(r.plainFirst);
  expect(r.cols).toBe(1);
  expect(r.x).toBeLessThanOrEqual(1);
});

test("all four reels still honour reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openRoute(page, ROUTE, { width: 1440, height: 1000 });
  const before = await page.evaluate(() =>
    [...document.querySelectorAll(".ctpage .ct-caro")].map((c) => c.querySelector(".ct-caro-dot.on")?.getAttribute("aria-label")));
  await page.waitForTimeout(5400);
  const after = await page.evaluate(() =>
    [...document.querySelectorAll(".ctpage .ct-caro")].map((c) => c.querySelector(".ct-caro-dot.on")?.getAttribute("aria-label")));
  console.log(`  reels: ${before!.length} · unchanged=${JSON.stringify(before) === JSON.stringify(after)}`);
  expect(before!.length, "no reels found — the scan measured nothing").toBeGreaterThanOrEqual(2);
  expect(after, "a reel autoplayed under prefers-reduced-motion").toEqual(before);
});
