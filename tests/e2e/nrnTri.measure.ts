/**
 * ONE-OFF (§B1) — the flip editor's silence policy gains "Not stated".
 * Runs against a LOCAL dev-mode build (SA_E2E_BASE_URL) — no write is made: the draft is
 * exercised and Escape discards it, which is the editor's own buffered-editing law.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

test("§B1 — three positions, and unset is reachable", async ({ page }) => {
  await openRoute(page, "/agents", { width: 1440, height: 900 });
  await page.waitForTimeout(1500);
  await page.locator(".agl-acard").first().locator(".agl-pencil").click({ timeout: 8000 });
  await page.waitForTimeout(900);
  // the NRN field lives on the Profile tab of the back face
  const tabs = page.locator(".agl-tab, .agl-tabs button");
  const tabCount = await tabs.count();
  for (let i = 0; i < tabCount; i++) {
    if (/profile/i.test((await tabs.nth(i).textContent()) || "")) { await tabs.nth(i).click(); break; }
  }
  await page.waitForTimeout(400);
  const seg = page.locator(".agl-nrnseg");
  await expect(seg, "the three-way segment is not rendered").toHaveCount(1);
  const labels = await seg.locator("button").allTextContents();
  console.log(`  segments: ${labels.join(" · ")}`);
  expect(labels.length).toBe(3);

  const subl = () => page.locator(".agl-nrn .subl").textContent();
  await seg.locator("button", { hasText: "Means no" }).click();
  expect(await subl()).toContain("treat silence as a pass");
  await seg.locator("button", { hasText: "They reply" }).click();
  expect(await subl()).toContain("Worth chasing");
  await seg.locator("button", { hasText: "Not stated" }).click();
  expect(await subl()).toContain("Not stated.");
  console.log("  unset is reachable and the subtitle follows all three states");

  // geometry: the segment fits the card (no horizontal overflow)
  const fit = await page.evaluate(() => {
    const s = document.querySelector(".agl-nrnseg")!.getBoundingClientRect();
    const card = document.querySelector(".agl-nrnseg")!.closest(".agl-acard, .agl-card, .agl-rotor")!.getBoundingClientRect();
    return { segR: Math.round(s.right), cardR: Math.round(card.right), segW: Math.round(s.width) };
  });
  console.log(`  segment ${fit.segW}px wide, right edge ${fit.segR} vs card ${fit.cardR}`);
  expect(fit.segR, "the segment overflows the card").toBeLessThanOrEqual(fit.cardR + 1);

  await page.screenshot({ path: "reports/qc/nrn-tri.png", clip: { x: 0, y: 0, width: 1440, height: 900 } });
  await page.keyboard.press("Escape"); // discard the draft — nothing is written
});
