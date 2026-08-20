/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Plan & billing — measured. The row-alignment claim in particular is pure geometry: two lists
 * "line up" or they do not, and no unit test can see it.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";
import { PLAN_ROWS } from "../../src/lib/planComparison";

test("two columns, equal height, rows aligned across", async ({ page }) => {
  await openRoute(page, "/account/plan", { width: 1440, height: 900 });
  const geom = await page.evaluate(() => {
    const cols = [...document.querySelectorAll(".plc-col")] as HTMLElement[];
    return {
      count: cols.length,
      heights: cols.map((c) => Math.round(c.getBoundingClientRect().height)),
      rowTops: cols.map((c) =>
        [...c.querySelectorAll(".plc-row")].map((r) => Math.round(r.getBoundingClientRect().top))),
      ctaTops: cols.map((c) => Math.round((c.querySelector(".plc-cta") as HTMLElement).getBoundingClientRect().top)),
      labels: cols.map((c) => [...c.querySelectorAll(".plc-label")].map((l) => l.textContent)),
    };
  });
  console.log("heights", geom.heights, "| cta tops", geom.ctaTops);

  expect(geom.count).toBe(2);
  expect(Math.abs(geom.heights[0] - geom.heights[1]), "equal height").toBeLessThanOrEqual(1);
  expect(geom.labels[0]).toEqual(geom.labels[1]);          // same labels, same order
  expect(geom.labels[0]).toEqual(PLAN_ROWS.map((r) => r.label));

  /* ⚠️ THE ROWS MUST LINE UP ROW-FOR-ROW, not merely be the same count. A descriptor on one side
     of a row and not the other would shear the lists apart from that index down. */
  geom.rowTops[0].forEach((top, i) => {
    expect(Math.abs(top - geom.rowTops[1][i]), `row ${i} (${geom.labels[0][i]})`).toBeLessThanOrEqual(1);
  });
  expect(Math.abs(geom.ctaTops[0] - geom.ctaTops[1]), "the CTA slots land on one line").toBeLessThanOrEqual(1);
});

test("the current plan is marked with a sage edge and a chip, never a burgundy fill", async ({ page }) => {
  await openRoute(page, "/account/plan", { width: 1440, height: 900 });
  const marks = await page.evaluate(() => {
    const cur = document.querySelector(".plc-col--current") as HTMLElement;
    const cs = getComputedStyle(cur);
    return {
      name: cur.querySelector(".plc-name")?.textContent,
      borderTop: cs.borderTopWidth + " " + cs.borderTopColor,
      borderTopWidth: parseFloat(cs.borderTopWidth),
      otherBorderTopWidth: parseFloat(
        getComputedStyle(document.querySelector(".plc-col:not(.plc-col--current)") as HTMLElement).borderTopWidth,
      ),
      background: cs.backgroundColor,
      chip: cur.querySelector(".plc-chip")?.textContent,
      cta: cur.querySelector(".plc-cta")?.textContent?.trim(),
      hasButton: !!cur.querySelector("button"),
    };
  });
  console.log(JSON.stringify(marks, null, 1));

  expect(marks.name).toBe("Free");
  expect(marks.chip).toBe("Current");
  expect(marks.cta).toBe("Your plan");
  expect(marks.hasButton, "the current column holds words, not a button").toBe(false);
  /* ⚠️ THE DECLARED 2.5px COMPUTES TO 2px, and the sibling's declared 0.5px computes to 1px —
     Chromium rounds sub-pixel border widths at DPR 1. So the assertion is the RENDERED fact the
     design is actually after: the current column's edge is visibly thicker, and it is sage. */
  expect(marks.borderTopWidth, "thicker than the plain column's edge").toBeGreaterThan(marks.otherBorderTopWidth);
  expect(marks.borderTop).toContain("rgb(138, 158, 136)");
  /* sage, not burgundy: green channel highest, and nowhere near #7c3a2a */
  const [r, g, b] = (marks.background.match(/\d+/g) ?? []).map(Number);
  expect(r > 200 && g > 200 && b > 200, `warm tint, got ${marks.background}`).toBe(true);
});

test("the CTA opens the plans page and never promises a purchase", async ({ page }) => {
  await openRoute(page, "/account/plan", { width: 1440, height: 900 });
  const panel = (await page.locator("#acct-panel").textContent()) ?? "";
  const btn = page.locator(".plc-btn");
  expect(await btn.count()).toBe(1);
  expect((await btn.textContent())?.trim()).toBe("See Pro plans");
  for (const word of ["Upgrade", "Buy", "Subscribe", "Checkout"]) {
    expect(panel, word).not.toContain(word);
  }
  await btn.click();
  await page.waitForTimeout(900);
  expect(new URL(page.url()).pathname).toBe("/plans");
});

test("no usage block, no persuasion, no CSV — and the billing empty state is stated", async ({ page }) => {
  await openRoute(page, "/account/plan", { width: 1440, height: 900 });
  const panel = (await page.locator("#acct-panel").textContent()) ?? "";
  for (const banned of ["Most popular", "Best value", "remaining", "of your", "CSV", "Export"]) {
    expect(panel, banned).not.toContain(banned);
  }
  expect(panel).toContain("No payment details on file");
  /* The price is the locked copy's, not a figure nobody can pay. */
  expect(panel).toContain("Price to be confirmed");
  expect(panel).not.toContain("£3.99");
  expect(panel).not.toContain("£35");
});
