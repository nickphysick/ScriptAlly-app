/**
 * §6 — Tracking's two dates are click-to-edit, on the running page.
 *
 *   npx playwright test --project=measure qcDates
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

test("§6 — both cells are operable controls that open the date editor", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  await page.locator(".f12-row").first().click({ timeout: 5000 });
  await page.waitForTimeout(450);

  const cells = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>(".qp-stat")].map((c) => ({
    tag: c.tagName.toLowerCase(),
    caption: (c.querySelector(".qp-statk")?.textContent || "").trim(),
    value: (c.querySelector(".qp-statn")?.textContent || "").trim(),
    tabbable: c.tabIndex >= 0 || c.tagName === "BUTTON",
    cursor: getComputedStyle(c).cursor,
  })));
  console.log(`\nTracking's cells:`);
  cells.forEach((c) => console.log(`  <${c.tag}> "${c.caption}" = "${c.value}" · tabbable ${c.tabbable} · cursor ${c.cursor}`));
  expect(cells.length, "no stat cells on this query").toBe(2);
  for (const c of cells) {
    /* ⚠️ A REAL BUTTON — keyboard-operable without a handler of ours, and announced as a control. */
    expect(c.tag, `"${c.caption}" is a ${c.tag}, so it is not operable`).toBe("button");
    expect(c.tabbable, `"${c.caption}" is not reachable by keyboard`).toBe(true);
    expect(c.cursor, `"${c.caption}" offers no affordance`).toBe("pointer");
  }

  /* the hover affordance is visible, not merely declared */
  const first = page.locator(".qp-stat").first();
  const rest = await first.evaluate((el) => getComputedStyle(el).backgroundColor);
  await first.hover();
  await page.waitForTimeout(200);
  const hovered = await first.evaluate((el) => getComputedStyle(el).backgroundColor);
  console.log(`  hover: ${rest} → ${hovered}`);
  expect(hovered, "the cell has no hover affordance").not.toBe(rest);

  /* it opens the date control */
  await first.click();
  await page.waitForTimeout(400);
  const editor = await page.evaluate(() => {
    const pop = document.querySelector<HTMLElement>(".f12-pop");
    if (!pop) return null;
    const r = pop.getBoundingClientRect();
    const input = pop.querySelector<HTMLInputElement>('input[type="date"]');
    return { title: (pop.querySelector(".f12-pt")?.textContent || "").trim(), hasDate: !!input, onScreen: r.top >= 0 && r.bottom <= innerHeight, w: Math.round(r.width) };
  });
  console.log(`  opened: ${editor ? `"${editor.title}" ${editor.w}px · date input ${editor.hasDate} · on screen ${editor.onScreen}` : "(nothing)"}`);
  expect(editor, "the cell opened nothing").not.toBeNull();
  expect(editor!.hasDate, "the editor holds no date control").toBe(true);
  expect(editor!.onScreen, "the editor opened off screen").toBe(true);
  expect(editor!.title.toLowerCase(), "the editor does not name the field it edits").toMatch(/date sent|expected/);
});
