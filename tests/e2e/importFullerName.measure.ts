/**
 * Smart Import v1.2.1 on the rendered lab, `#/onb-lab?s=review&fx=v12`: the Jonah pair.
 *
 * FN-R1 the Duplicates step's headline is "Two rows for Jonah Petrakis"
 * FN-R2 after "Looks right" the sorted card, the decided list and the Agents step's ready row all
 *       read Jonah Petrakis at Heron Lit
 * FN-R3 "Change this" puts the pair back open, both rows and their dates
 * FN-SHOTS (FN_SHOTS=1) the report's two screenshots at 1440 × 900
 *
 * `FN_MUTATE=headline` (the leader's own name in the headline) applies its named break in the page.
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { lab, settled, WIDE } from "./ob9Lib";
import { decideDuplicates } from "./reviewDrive";

const OUT = resolve("reports/smart-import-photos-v1-2-1");
const shots = !!process.env.FN_SHOTS;
const MUTATE = process.env.FN_MUTATE ?? "";
const snap = async (page: Page, n: string) => { if (!shots) return; mkdirSync(OUT, { recursive: true }); await page.screenshot({ path: resolve(OUT, `${n}.png`) }); };

async function open(page: Page) {
  await lab(page, "s=review&fx=v12", WIDE, { motion: "reduce" });
  await page.waitForSelector('[data-im="review"][data-step="duplicates"]');
  /* the break: write the leader's own name over the headline, as the build before v1.2.1 did */
  if (MUTATE === "headline") await page.evaluate(() => {
    const h = document.querySelector('[data-im="reconcile"] .im-dupeh'); if (h) h.textContent = "Two rows for Jonah P.";
  });
}
const pair = (page: Page) => page.locator('[data-im="reconcile"]').first();

test.describe("import: a merged duplicate keeps the fuller name (v1.2.1)", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("FN-R1 the headline", async ({ page }) => {
    await open(page);
    await expect(pair(page).locator(".im-dupeh")).toHaveText("Two rows for Jonah Petrakis");
  });

  test("FN-R2 after Looks right: the sorted card, the decided list and the ready row", async ({ page }) => {
    await open(page);
    await pair(page).locator('[data-im="reconcile-right"]').click();
    await settled(page, 300);
    const done = page.locator('[data-im="review"]');
    await expect(done).toContainText("Jonah Petrakis");
    /* the short form is never the agent's name: it appears only as the row that "merged in" */
    await expect(done).not.toContainText(/(?<!")Jonah P\.(?!\w)/);
    await expect(done).toContainText('"Jonah P." merged in');
    await decideDuplicates(page);
    await page.locator('[data-im="primary"]').first().click(); await settled(page, 400);
    await page.waitForSelector('[data-im="review"][data-step="agents"]');
    const row = page.locator('[data-im="review"]').getByText("Jonah Petrakis", { exact: false }).first();
    await expect(row).toBeVisible();
    await expect(page.locator('[data-im="review"]')).toContainText("Heron Lit");
    await expect(page.locator('[data-im="review"]')).not.toContainText(/Jonah P\.(?!\w)/);
  });

  test("FN-R3 Change this puts both rows back with their own names", async ({ page }) => {
    await open(page);
    await pair(page).locator('[data-im="reconcile-right"]').click();
    await settled(page, 300);
    /* once every set is answered the step shows "What you decided"; the decision is behind its door */
    await expect(page.locator('[data-im="review"]')).toContainText('"Jonah P." merged in');
    await page.getByRole("button", { name: "Change a decision" }).click();
    await page.locator('[data-im="reconcile-change"]').first().click();
    await settled(page, 300);
    /* the pair is open again with both of its rows. The card names no agent per row, so the two
       restored names are held at unit (FN-5); here, both rows and their own dates are back */
    await expect(pair(page)).toHaveAttribute("data-state", "open");
    await expect(pair(page).locator("[data-pick]")).toHaveCount(2);
    await expect(pair(page)).toContainText("12 Aug 2026");
    await expect(pair(page)).toContainText("20 Aug 2026");
    await expect(pair(page).locator(".im-dupeh")).toHaveText("Two rows for Jonah Petrakis");
  });

  test("FN-SHOTS the report's screenshots", async ({ page }) => {
    test.skip(!shots, "set FN_SHOTS=1");
    await open(page);
    await pair(page).scrollIntoViewIfNeeded();
    await snap(page, "1440-duplicates-jonah");
    await pair(page).locator('[data-im="reconcile-right"]').click();
    await settled(page, 300);
    await snap(page, "1440-duplicates-merged");
  });
});
