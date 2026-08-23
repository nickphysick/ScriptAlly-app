/**
 * EMPTY-STATE SHOTS — the four states at two widths.
 *   SA_E2E_BASE_URL=http://localhost:4194 npx playwright test nbEmptyShot
 * Board state is the caller's: seedNotes.mjs --clean, then seed as each case needs.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";
const OUT = "reports/noteboard-empty-state";

for (const width of [1280, 2300]) {
  test(`shot at ${width}: zero notes — workflow and examples together`, async ({ page }) => {
    await openRoute(page, "/todo/noteboard", { width, height: 1200 });
    await expect(page.locator(".nb-opening")).toBeVisible();
    expect(await page.locator("[data-example]").count()).toBe(3);
    await page.screenshot({ path: `${OUT}/zero-${width}.png`, fullPage: true });
  });
}

/* The remaining board states. Each asserts what its shot is meant to evidence before taking it. */
for (const width of [1280, 2300]) {
  test(`shot at ${width}: zero notes, every example dismissed — workflow alone`, async ({ page }) => {
    await openRoute(page, "/todo/noteboard", { width, height: 1200 });
    await expect(page.locator(".nb-opening")).toBeVisible();
    for (const id of ["ex-yellow", "ex-pink", "ex-sage"]) {
      const x = page.locator(`[data-example="${id}"] .nb-exdismiss`);
      if (await x.count()) { await x.click(); await page.waitForTimeout(500); }
    }
    expect(await page.locator("[data-example]").count()).toBe(0);
    await page.screenshot({ path: `${OUT}/dismissed-${width}.png`, fullPage: true });
  });
}

/* one note, then three — the two states where the workflow must be GONE. Seeded through the
   composer so the shots exercise the real create path rather than a fixture. */
for (const width of [1280, 2300]) {
  test(`shot at ${width}: one note, then three`, async ({ page }) => {
    await openRoute(page, "/todo/noteboard", { width, height: 1200 });
    const pin = async (body: string) => {
      await page.locator(".tpl-tools .tdb-addb").filter({ hasText: "Pin a note" }).locator("visible=true").first().click();
      await page.locator(".nb-compose textarea").fill(body);
      await page.locator(".nb-compose .nb-csave").click();
      await page.waitForTimeout(900);
    };
    if (await page.locator(".nb-note:not(.nb-example)").count() === 0) await pin("SHOTNOTE one");
    expect(await page.locator(".nb-opening").count(), "the workflow survived a note").toBe(0);
    await page.screenshot({ path: `${OUT}/one-note-${width}.png`, fullPage: true });

    while (await page.locator(".nb-note:not(.nb-example)").count() < 3) {
      await pin(`SHOTNOTE ${await page.locator(".nb-note:not(.nb-example)").count() + 1}`);
    }
    expect(await page.locator(".nb-opening").count()).toBe(0);
    expect(await page.locator("[data-example]").count(), "examples survived three notes").toBe(0);
    await page.screenshot({ path: `${OUT}/three-notes-${width}.png`, fullPage: true });
  });
}
