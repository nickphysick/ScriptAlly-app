import { test, expect } from "@playwright/test";
import { openRoute, liftMotionSuppression } from "./measure";
import { resolve } from "node:path";
test.setTimeout(300_000);

test("D4 — hidden at rest, revealed by hover AND by keyboard focus", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 1000 });
  await liftMotionSuppression(page);
  await page.waitForTimeout(2500);
  const qc = page.locator(".qc-wpg");
  const rows = qc.locator(".f12-row");
  for (let i = 0; i < 25; i++) {
    await rows.nth(i).click(); await page.waitForTimeout(300);
    if (await qc.locator(".qc-stat").count()) break;
  }
  const op = () => qc.evaluate((r) => getComputedStyle(r.querySelector(".qc-stat-acts")!).opacity);

  const rest = await op();
  console.log(`at rest: ${rest}`);
  expect(Number(rest), "the actions are visible at rest").toBe(0);

  await qc.locator(".qc-attach").first().hover();
  await page.waitForTimeout(400);
  const hovered = await op();
  console.log(`on hover: ${hovered}`);
  expect(Number(hovered), "hover did not reveal").toBe(1);

  /* move away, then reach them with the keyboard only */
  await page.mouse.move(5, 5);
  await page.waitForTimeout(400);
  console.log(`after moving away: ${await op()}`);
  /* ⚠️ FOCUS, THEN WAIT. `opacity` is transitioned at .15s, and a transitioned property reports
     where it STARTED — the first run read 0 on an element that was on its way to 1 and called it a
     focus-within failure. The standing trap, and `liftMotionSuppression` is what makes it live. */
  const active = await qc.evaluate((r) => {
    const b = r.querySelector(".qc-stat-acts button") as HTMLButtonElement;
    b.focus();
    return document.activeElement === b;
  });
  await page.waitForTimeout(500);
  const focused = { active, opacity: await op() };
  console.log(`keyboard focus: ${JSON.stringify(focused)}`);
  expect(focused.active, "the action is not reachable by focus — is it display:none?").toBe(true);
  expect(Number(focused.opacity), "focus-within did not reveal").toBe(1);

  /* both still route through the existing handlers */
  const titles = await qc.evaluate((r) =>
    [...r.querySelectorAll(".qc-stat-acts button")].map((b) => b.getAttribute("title")));
  console.log(`titles: ${JSON.stringify(titles)}`);
  expect(titles).toEqual([
    "Change which package this query used",
    "Change this query to carry no package",
  ]);
  await page.locator(".qc-attach").first().screenshot({ path: resolve(process.cwd(), "reports/band/acts-focus.png") });
});
