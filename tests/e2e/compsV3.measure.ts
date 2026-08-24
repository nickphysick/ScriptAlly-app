/**
 * Comparable titles v3 — the two states, measured.
 *
 * ⚠️ THE HARNESS ACCOUNT HAS AN EMPTY SHELF, so it lands on the FIRST-VISIT state by default and the
 * workspace has to be reached by adding a comp through the UI. Every test that does so removes it in
 * a `finally`: a leftover comp would put the next run in the other state and the failure would look
 * like a state-machine bug.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";
const ROUTE = "/manuscripts/comps";
const T = "E2E Harness Comp — safe to delete";

async function addComp(page: import("@playwright/test").Page, title = T, year = "2021") {
  await page.locator(".ct-btn-dark, .ct-addrow, .ct-bandbtn").first().click();
  await page.locator("#ct-f-title").fill(title);
  await page.locator("#ct-f-year").fill(year);
  await page.locator(".ct-cform .ct-btn-pink").click();
  await page.locator(`.ct-crow:has-text("${title}")`).waitFor({ timeout: 8000 });
}
async function removeComp(page: import("@playwright/test").Page, title = T) {
  const card = page.locator(`.ct-crow:has-text("${title}")`).first();
  if (await card.count()) {
    await card.locator('button:has-text("Remove")').click({ force: true }).catch(() => {});
    await card.waitFor({ state: "detached", timeout: 8000 }).catch(() => {});
  }
}

test("first visit: feature block, carousel and stages — and no workspace", async ({ page }) => {
  await openRoute(page, ROUTE, { width: 1440, height: 1000 });
  const r = await page.evaluate(() => {
    const q = (s: string) => document.querySelector(`.ctpage ${s}`);
    const feature = q(".ct-feature") as HTMLElement | null;
    return {
      feature: !!feature,
      demoted: feature?.classList.contains("demoted") ?? null,
      ctas: document.querySelectorAll(".ctpage .ct-feature-ctas button").length,
      slides: document.querySelectorAll(".ctpage .ct-caro-slide").length,
      dots: document.querySelectorAll(".ctpage .ct-caro-dot").length,
      stages: document.querySelectorAll(".ctpage .ct-stage").length,
      linked: document.querySelectorAll(".ctpage .ct-stage.linked").length,
      workspace: !!q(".ct-toprow"),
      scout: !!q(".ct-scout--solo"),
      headingColour: feature ? getComputedStyle(feature.querySelector("h2")!).color : "",
      /* every slot must carry its name, or the stamp reads as a gap */
      namedSlots: document.querySelectorAll(".ctpage [data-slot]").length,
      slotsTotal: document.querySelectorAll(".ctpage .ct-caro-slot, .ctpage .ct-stage-slot, .ctpage .ct-sslot").length,
    };
  });
  console.log(`  feature=${r.feature} demoted=${r.demoted} ctas=${r.ctas} slides=${r.slides} dots=${r.dots}`);
  console.log(`  stages=${r.stages} linked=${r.linked} workspace=${r.workspace} scout=${r.scout} slots named ${r.namedSlots}/${r.slotsTotal}`);
  expect(r.feature, "no feature block on the first-visit state").toBe(true);
  expect(r.demoted, "the first-visit block is demoted").toBe(false);
  expect(r.ctas, "the first-visit block should carry both CTAs").toBe(2);
  expect(r.slides).toBe(5);
  expect(r.dots).toBe(5);
  expect(r.stages).toBe(3);
  expect(r.linked, "the last stage must not carry a connector").toBe(2);
  expect(r.workspace, "the workspace rendered at zero comps").toBe(false);
  expect(r.scout, "the Scout is missing from the first-visit state").toBe(true);
  expect(r.slotsTotal, "no illustration slots found — the scan measured nothing").toBeGreaterThan(5);
  expect(r.namedSlots, "an illustration slot renders without a data-slot name").toBeGreaterThanOrEqual(r.slotsTotal);
});

test("the carousel advances, pauses on hover, and only the active slide is exposed", async ({ page }) => {
  await openRoute(page, ROUTE, { width: 1440, height: 1000 });
  const exposed = () => page.evaluate(() =>
    [...document.querySelectorAll(".ctpage .ct-caro-slide")].filter((s) => !s.hasAttribute("aria-hidden")).length);
  expect(await exposed(), "more than one slide is in the accessibility tree").toBe(1);
  const first = await page.evaluate(() => document.querySelector(".ctpage .ct-caro-slide.on")?.textContent?.slice(0, 24));
  await page.waitForTimeout(5200);
  const second = await page.evaluate(() => document.querySelector(".ctpage .ct-caro-slide.on")?.textContent?.slice(0, 24));
  console.log(`  advanced: "${first}" → "${second}"`);
  expect(second, "the carousel did not advance").not.toBe(first);
  /* hover pauses it */
  await page.locator(".ctpage .ct-caro").hover();
  const held = await page.evaluate(() => document.querySelector(".ctpage .ct-caro-slide.on")?.textContent?.slice(0, 24));
  await page.waitForTimeout(5200);
  const stillHeld = await page.evaluate(() => document.querySelector(".ctpage .ct-caro-slide.on")?.textContent?.slice(0, 24));
  console.log(`  hovered: "${held}" → "${stillHeld}"`);
  expect(stillHeld, "the carousel kept advancing under the pointer").toBe(held);
  /* the dots still move it */
  await page.locator(".ctpage .ct-caro-dot").nth(3).click();
  const jumped = await page.evaluate(() => document.querySelector(".ctpage .ct-caro-dot.on")?.getAttribute("aria-label"));
  expect(jumped, "the dot did not select its slide").toContain("Carries the tone");
});

test("reduced motion stops the autoplay, and the dots still work", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openRoute(page, ROUTE, { width: 1440, height: 1000 });
  const before = await page.evaluate(() => document.querySelector(".ctpage .ct-caro-slide.on")?.textContent?.slice(0, 24));
  await page.waitForTimeout(5600);
  const after = await page.evaluate(() => document.querySelector(".ctpage .ct-caro-slide.on")?.textContent?.slice(0, 24));
  console.log(`  reduced motion: "${before}" → "${after}" (must be unchanged)`);
  expect(after, "the carousel autoplayed under prefers-reduced-motion").toBe(before);
  await page.locator(".ctpage .ct-caro-dot").nth(2).click();
  const moved = await page.evaluate(() => document.querySelector(".ctpage .ct-caro-dot.on")?.getAttribute("aria-label"));
  console.log(`  dot still works → ${moved}`);
  expect(moved, "the dots stopped working under reduced motion").toContain("Backs the sales case");
});

test("adding a comp moves the page to the workspace, and the blocks demote", async ({ page }) => {
  await openRoute(page, ROUTE, { width: 1440, height: 1000 });
  try {
    await addComp(page);
    const r = await page.evaluate(() => {
      const q = (s: string) => document.querySelector(`.ctpage ${s}`);
      const tile = q(".ct-mstile") as HTMLElement, card = q(".ct-toprow .ct-qline") as HTMLElement;
      const comps = q(".ct-split > .ct-panel") as HTMLElement;
      const scout = document.querySelectorAll(".ctpage .ct-split > .ct-panel")[1] as HTMLElement;
      const feature = q(".ct-feature") as HTMLElement;
      const t = tile.getBoundingClientRect(), c = card.getBoundingClientRect();
      const cs = comps.getBoundingClientRect(), sc = scout.getBoundingClientRect();
      return {
        workspace: true, demoted: feature.classList.contains("demoted"),
        ctas: document.querySelectorAll(".ctpage .ct-feature-ctas button").length,
        tileH: Math.round(t.height), cardH: Math.round(c.height),
        /* ⚠️ THE TILE'S OWN CONTENT, NOT ITS STRETCHED BOX. `align-items: stretch` makes both columns
           the height of the TALLER one — the query card — so the box says nothing about whether the
           tile compressed. Its intrinsic height is plate-or-body plus its own padding. */
        tileIntrinsic: (() => {
          const plate = tile.querySelector(".ct-msplate") as HTMLElement;
          const body = tile.querySelector(".ct-mstile-body") as HTMLElement;
          const cs = getComputedStyle(tile);
          return Math.round(Math.max(plate.getBoundingClientRect().height, body.getBoundingClientRect().height)
            + parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom));
        })(),
        compsH: Math.round(cs.height), scoutH: Math.round(sc.height), scoutW: Math.round(sc.width),
        spine: getComputedStyle(q(".ct-crow") as HTMLElement).gridTemplateColumns,
        ageChip: (q(".ct-agechip") as HTMLElement | null)?.textContent?.trim() ?? null,
        ageChipBg: q(".ct-agechip") ? getComputedStyle(q(".ct-agechip") as HTMLElement).backgroundColor : null,
      };
    });
    console.log(`  tile ${r.tileH} · card ${r.cardH} · comps ${r.compsH} · scout ${r.scoutH}×${r.scoutW}`);
    console.log(`  demoted=${r.demoted} ctas=${r.ctas} · spine tracks "${r.spine}" · age chip "${r.ageChip}" on ${r.ageChipBg}`);
    expect(r.demoted, "the foot block is not the demoted variant").toBe(true);
    expect(r.ctas, "the demoted block still carries CTAs").toBe(0);
    expect(Math.abs(r.tileH - r.cardH), "the top row's columns do not share a height").toBeLessThanOrEqual(2);
    expect(Math.abs(r.compsH - r.scoutH), "comps and Scout do not share a height").toBeLessThanOrEqual(2);
    expect(r.scoutW, "the Scout panel is not its 340px track").toBe(340);
    /* ⚠️ 296 IS THE v2.1 VERTICAL TILE, and "roughly half" is the brief's own measure of the point
       of this row. Asserted against the tile's INTRINSIC height — the first version of this check
       read the stretched box, reported 254 and called a tile that had gone 296 → 137 uncompressed. */
    expect(r.tileIntrinsic, "the tile did not compress — it is still the tall vertical one").toBeLessThan(296 / 2);
    /* and the row is the query card's height, not the tile's — the card is the taller column now */
    expect(r.cardH, "the row is set by the tile again, so the card stopped filling it").toBeGreaterThanOrEqual(r.tileIntrinsic);
    /* the age chip states a fact and carries no warning treatment */
    expect(r.ageChip).toContain("Published 2021");
    expect(r.ageChip!.toLowerCase()).not.toMatch(/old|stale|dated|warn|too /);
  } finally {
    await removeComp(page);
  }
});

test("under 1040px everything stacks and the slots hide", async ({ page }) => {
  await openRoute(page, ROUTE, { width: 1000, height: 1000 });
  const r = await page.evaluate(() => {
    const feature = document.querySelector(".ctpage .ct-feature") as HTMLElement;
    const stages = document.querySelector(".ctpage .ct-stages-grid") as HTMLElement;
    const linked = document.querySelector(".ctpage .ct-stage.linked") as HTMLElement;
    const sc = document.querySelector(".ctpage .wpg-scroll") as HTMLElement;
    return {
      featureCols: getComputedStyle(feature).gridTemplateColumns.split(" ").length,
      stageCols: getComputedStyle(stages).gridTemplateColumns.split(" ").length,
      connector: linked ? getComputedStyle(linked, "::after").display : "none",
      xOverflow: sc.scrollWidth - sc.clientWidth,
    };
  });
  console.log(`  feature cols=${r.featureCols} stage cols=${r.stageCols} connector=${r.connector} x-overflow=${r.xOverflow}`);
  expect(r.featureCols, "the feature block did not stack").toBe(1);
  expect(r.stageCols, "the stages did not stack").toBe(1);
  expect(r.connector, "the connector is still drawn once stacked — it points sideways at nothing").toBe("none");
  expect(r.xOverflow, "the page overflows horizontally").toBeLessThanOrEqual(1);
});
