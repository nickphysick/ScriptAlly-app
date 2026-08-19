import { test, expect } from "@playwright/test";
import { ensureSignedIn } from "./measure";
/** put the harness account's list view back to default — my own suite left it filtered */
test("reset view", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await ensureSignedIn(page);
  await page.goto("/todo");
  await page.waitForTimeout(7000);
  const vis = `(e) => { if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; }`;
  const before = await page.evaluate(`(() => {
    const vis = ${vis};
    const t = [...document.querySelectorAll('.tlc .l-icon[aria-label="Filter"]')].find(vis);
    return { active: t ? t.className : "?", foot: (document.querySelector(".tlc .l-foot .c")||{}).textContent };
  })()`);
  await page.evaluate(`(() => { const vis = ${vis};
    ([...document.querySelectorAll('.tlc .l-icon[aria-label="Filter"]')].find(vis))?.click(); })()`);
  await page.waitForTimeout(600);
  await page.evaluate(`(() => {
    ([...document.querySelectorAll(".menu .m-foot a")].find((a) => /show everything/i.test(a.textContent||"")))?.click(); })()`);
  await page.waitForTimeout(2500);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(800);
  const after = await page.evaluate(`(() => {
    const vis = ${vis};
    const t = [...document.querySelectorAll('.tlc .l-icon[aria-label="Filter"]')].find(vis);
    return { active: t ? t.className : "?", foot: (document.querySelector(".tlc .l-foot .c")||{}).textContent };
  })()`);
  console.log("\nBEFORE " + JSON.stringify(before) + "\nAFTER  " + JSON.stringify(after) + "\n");
  expect(String((after as {active: string}).active)).not.toContain("active");
});
