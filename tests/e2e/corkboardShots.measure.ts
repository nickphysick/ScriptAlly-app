/**
 * Corkboard v1 — the report's screenshots (reports/corkboard-v1/shots). Not a lock: it asserts nothing but
 * that each state was reached. `CB_SHOTS=1` writes them; a routine run skips.
 *
 *   CB_SHOTS=1 SA_E2E_BASE_URL=http://127.0.0.1:4611 npx playwright test corkboardShots --project=measure
 *
 * ⚠️ IT WRITES NOTHING THAT STAYS: the one preference it changes (the view) is put back before the case ends.
 */
import { test } from "@playwright/test";
import { existsSync, mkdirSync } from "node:fs";
import { DIR, ROUTE, dragItem, inPage, open, only } from "./cbLib";
import * as store from "./cbStore";

const OUT = `${DIR}/shots`;
const SNAP = "tests/e2e/.auth/cb-prefs-snapshot.json"; // gitignored, beside the saved session
const shot = async (page: import("@playwright/test").Page, name: string) => {
  mkdirSync(OUT, { recursive: true });
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false, animations: "disabled" });
};

test.describe("Corkboard v1 — shots", () => {
  test.skip(!process.env.CB_SHOTS, "set CB_SHOTS=1 to write the screenshots");
  test.beforeAll(async () => { mkdirSync(DIR, { recursive: true }); if (!existsSync(SNAP)) await store.snap(SNAP); });
  test.afterEach(async () => { await store.restore(SNAP); });

  test("the board beside the reference's screens, and its states", async ({ page }) => {
    await only(page, "cbseed-");
    await open(page, ROUTE, { width: 1512, height: 1206 });
    await shot(page, "01-board-1512");
    await open(page, ROUTE, { width: 1280, height: 1206 });
    await shot(page, "01-board-1280");
    await open(page, ROUTE, { width: 1512, height: 1206 });
    await page.locator(inPage('[data-cb="tidy"]')).click();
    await page.waitForTimeout(900);
    await shot(page, "02-tidy-1512");
    await page.locator(inPage('[data-cb="tidy"]')).click();
    await page.waitForTimeout(700);

    /* a note in the hand */
    const d = await dragItem(page, "cbseed-n6", 260, 150);
    await page.waitForTimeout(250);
    await shot(page, "03-dragging");
    await page.mouse.move(0, 0); await page.keyboard.press("Escape");
    await page.mouse.up();
    void d;
    await store.restore(SNAP);
    await open(page, ROUTE, { width: 1512, height: 1206 });

    /* the ⋯ menu */
    const note = page.locator(inPage('[data-cb-item="cbseed-n2"]'));
    await note.hover();
    await note.locator(".cb-more").click();
    await page.waitForTimeout(300);
    await shot(page, "04-menu");
    await page.keyboard.press("Escape");

    /* a tag filter on */
    await page.locator(inPage('[data-cb-chip="cbseed-tag-manuscript"]')).click();
    await page.waitForTimeout(350);
    await shot(page, "05-tag-filter");
    await page.locator(inPage('[data-cb-chip="all"]')).click();

    /* the compose editor, from the pink square */
    await page.locator(inPage('[data-cb-pad="pink"]')).click();
    await page.waitForTimeout(400);
    await page.locator(inPage(".nb-compose textarea")).fill("Ask Priya's assistant how long a full usually takes");
    await shot(page, "06-compose-pink");
    await page.keyboard.press("Escape");

    /* editing a note where it is */
    await page.locator(inPage('[data-cb-item="cbseed-n8"] .nb-body')).click();
    await page.waitForTimeout(400);
    await shot(page, "07-edit-in-place");
    await page.keyboard.press("Escape");

    await open(page, ROUTE, { width: 1024, height: 768 });
    await shot(page, "09-1024x768");
  });

  test("zero notes, and the phone", async ({ page }) => {
    await only(page, "zz-none-");
    await open(page, ROUTE, { width: 1512, height: 1206 });
    await shot(page, "08-zero-notes");
  });

  test("the Your tasks card with no own tasks", async ({ page }) => {
    await only(page, "cbseed-n");
    await open(page, ROUTE, { width: 1512, height: 1206 });
    await shot(page, "11-tasks-card-empty");
  });

  test("390 wide: the tidy view only", async ({ page }) => {
    await only(page, "cbseed-");
    /* the shared `openRoute` cannot open a phone width (its shell probe is the hidden sidebar): sign in wide, reload narrow */
    await open(page, ROUTE, { width: 1280, height: 900 });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await page.waitForTimeout(4500);
    await shot(page, "10-390");
  });
});
