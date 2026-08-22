/**
 * §1–§3 · WHAT THE PAGE OPENS ON.
 *
 *   SA_E2E_BASE_URL=dev npx playwright test --project=measure qcOnload
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

const state = (page: any) => page.evaluate(() => ({
  headings: Array.from(document.querySelectorAll(".qc-gh")).map((e) => (e.textContent || "").trim()),
  groups: document.querySelectorAll('.qc-grp[role="group"]').length,
  flat: document.querySelectorAll(".qc-grp--flat").length,
  rows: document.querySelectorAll(".f12-row").length,
  selected: document.querySelectorAll(".f12-row[aria-selected=true]").length,
}));

test("§1 · the list opens flat, and a state filter restores the groups", async ({ page }) => {
  test.setTimeout(240000);
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  await page.waitForTimeout(2500);

  const load = await state(page);
  console.log(`  on load · rows ${load.rows} · group headings ${load.headings.length} · role=group ${load.groups} · flat sections ${load.flat}`);
  expect(load.rows, "no rows — nothing to measure").toBeGreaterThan(0);
  expect(load.headings, "the list opened with group headings").toEqual([]);
  expect(load.groups, "the flat list announced itself as a group").toBe(0);
  expect(load.flat, "the flat section did not render").toBe(1);

  /* choosing Whose turn brings the grouped reading back */
  await page.locator('.f12-pill[aria-label="Filter"]').first().click();
  await page.waitForTimeout(600);
  const move = page.locator(".f12-prow", { hasText: "Your move" }).first();
  expect(await move.count(), "no Your move row in the filter").toBeGreaterThan(0);
  await move.click();
  await page.waitForTimeout(900);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);

  const grouped = await state(page);
  console.log(`  after Whose turn · headings ${JSON.stringify(grouped.headings)} · role=group ${grouped.groups}`);
  expect(grouped.headings.length, "choosing a state filter did not restore the headings").toBeGreaterThan(0);
  expect(grouped.groups, "the restored groups carry no role").toBeGreaterThan(0);
});
