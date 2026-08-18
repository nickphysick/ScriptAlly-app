/**
 * §5 — the tasks control, on the running page.
 *
 * ⚠️ ITS PREDECESSOR OPENED NOTHING — `setIsTasksOpen(true)` with no surface mounted — so "does a
 * control exist" was never the question. This presses it and checks something appears.
 *
 *   npx playwright test --project=measure qcTasks
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

test("§5 — tasks left Tracking for the bar, and the control opens its surface", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 900 });

  let withTasks = -1;
  const seen: string[] = [];
  for (let i = 0; i < 16; i++) {
    const row = page.locator(".f12-row").nth(i);
    if (!(await row.count())) break;
    await row.scrollIntoViewIfNeeded();
    await row.click({ timeout: 5000 });
    await page.waitForTimeout(260);
    const read = await page.evaluate(() => {
      const bar = [...document.querySelectorAll<HTMLElement>(".qc-phead button")]
        .find((b) => (b.textContent || "").includes("View related tasks"));
      /* the retired home: a count in the Tracking card's band */
      const inHeader = [...document.querySelectorAll<HTMLElement>(".qp-cardact")]
        .filter((b) => /TASKS?$/.test((b.textContent || "").trim())).length;
      return { bar: bar ? (bar.textContent || "").replace(/\s+/g, " ").trim() : null, inHeader };
    });
    /* ⚠️ ZERO MEANS ABSENT, not a disabled "(0)" — asserted on every query, not only the one with tasks */
    expect(read.inHeader, `row ${i}: a task count is still in the Tracking header`).toBe(0);
    if (read.bar) { seen.push(`row ${i}: "${read.bar}"`); if (withTasks < 0) withTasks = i; }
  }
  console.log(`\nqueries whose bar shows the control:`);
  seen.forEach((s) => console.log(`  ${s}`));
  console.log(`  (absent on the rest — hidden at zero rather than disabled)`);

  if (withTasks < 0) {
    console.log("  (no query in this account has a related task — the control is unexercised)");
    return;
  }

  await page.locator(".f12-row").nth(withTasks).click({ timeout: 5000 });
  await page.waitForTimeout(300);
  const btn = page.locator('.qc-phead button:has-text("View related tasks")');
  const shape = await btn.evaluate((b) => {
    const c = getComputedStyle(b);
    const other = [...document.querySelectorAll<HTMLElement>(".qc-phead button")].find((x) => (x.textContent || "").includes("Mark closed"))!;
    const sub = b.querySelector(".qc-btn-sub");
    return {
      h: Math.round(b.getBoundingClientRect().height),
      otherH: Math.round(other.getBoundingClientRect().height),
      colour: c.color, otherColour: getComputedStyle(other).color,
      count: sub ? (sub.textContent || "").trim() : "",
      countFont: sub ? getComputedStyle(sub).fontFamily.split(",")[0] : "",
    };
  });
  console.log(`\n  control ${shape.h}px vs Mark closed ${shape.otherH}px · ${shape.colour} vs ${shape.otherColour}`);
  console.log(`  count "${shape.count}" in ${shape.countFont}`);
  /* ⚠️ THE SAME HEIGHT AND TREATMENT AS THE BAR'S OTHER PLAIN BUTTONS — asserted against one of
     them rather than against a figure, so the claim is "they match". */
  expect(shape.h, "the control is not the bar's height").toBe(shape.otherH);
  expect(shape.colour, "the control is not the bar's ink").toBe(shape.otherColour);
  expect(shape.count, "the count is not a parenthesised figure").toMatch(/^\(\d+\)$/);
  expect(shape.countFont.toLowerCase(), "the count is not mono").toContain("mono");

  /* ⚠️ AND IT OPENS SOMETHING — the half its predecessor failed. */
  await btn.click();
  await page.waitForTimeout(500);
  const opened = await page.evaluate(() => {
    /* ⚠️ `TasksPopover`'s OWN CLASS. `[class*="tasks"]` matched the SHELL PANEL's "Tasks requiring
       your attention" block — a 0×0 element elsewhere on the page — and reported the surface as
       open with no height. The first-match family again. */
    const pop = document.querySelector<HTMLElement>(".f12-tasks");
    if (!pop) return null;
    const r = pop.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height), onScreen: r.top >= 0 && r.bottom <= innerHeight, text: (pop.textContent || "").replace(/\s+/g, " ").trim().slice(0, 70) };
  });
  console.log(`  opened: ${opened ? `${opened.w}×${opened.h} on screen ${opened.onScreen} · "${opened.text}"` : "(nothing)"}`);
  expect(opened, "the control opened nothing — the fault its predecessor had").not.toBeNull();
  expect(opened!.h, "the surface has no height").toBeGreaterThan(40);
});
