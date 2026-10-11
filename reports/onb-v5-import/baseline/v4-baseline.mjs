// Drives the BASELINE review (the build before any part-2 edit) through the scripted answers lock V4
// names, and writes what it hands onImport. Run: node v4-baseline.mjs <baseUrl> <outDir>
import { chromium } from "/Users/nickphysick/ScriptAlly-app/node_modules/playwright/index.mjs";
import { writeFileSync } from "node:fs";

const [base, out] = process.argv.slice(2);
const browser = await chromium.launch();
const log = (...a) => console.log(...a);

/** Clear the intro beats and escape the guided walk, so the inline rows are what is driven. */
async function clear(page) {
  const pats = [/^Review and confirm/, /^Let's do it/, /^Next/, /^Let's go/, /^Got it/, /^Skip for now/];
  let quiet = 0;
  for (let i = 0; i < 120 && quiet < 5; i++) {
    let hit = false;
    for (const n of pats) {
      const b = page.getByRole("button", { name: n }).first();
      if (await b.isVisible().catch(() => false)) { await b.click({ timeout: 1500 }).catch(() => {}); hit = true; break; }
    }
    const dialog = await page.locator('[role="dialog"]').first().isVisible().catch(() => false);
    quiet = hit || dialog ? 0 : quiet + 1;
    await page.waitForTimeout(350);
  }
}
const row = (page, id) => page.locator(`[data-row-id="${id}"]`);

async function open(hash) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, storageState: { cookies: [], origins: [] }, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => log("PAGEERROR", e.message));
  await page.goto(`${base}/${hash}`, { waitUntil: "load" });
  await page.waitForTimeout(1200);
  return page;
}

// ── fixture 1: REVIEW_FIXTURE ────────────────────────────────────────────────────────────────────
{
  const page = await open("#/import-review");
  await clear(page);
  // agents stage
  await row(page, "a1").getByTitle("Don't import").click();                       // one removal
  await row(page, "a8").getByLabel("Agency name").fill("Hale House");             // agency saved
  await row(page, "a8").getByRole("button", { name: "Save agency" }).click();
  await row(page, "a9").getByRole("button", { name: "Carry on without an agency" }).click(); // agency waived
  await row(page, "a10").getByRole("button", { name: "Mark as checked" }).click(); // mapping reason
  await page.getByRole("button", { name: /^Continue/ }).click();
  await page.waitForTimeout(600);
  await clear(page);
  // queries stage — one answer per reason code
  await row(page, "q1").getByRole("button", { name: "Yes, that's right" }).click();        // two-dates
  await row(page, "q2").getByRole("button", { name: /I sent the full/ }).click();           // status-direction
  await row(page, "q3").getByRole("button", { name: "Keep as month" }).click();             // missing-day
  await row(page, "q4").getByRole("button", { name: "Leave undated" }).click();             // serial-outlier
  await row(page, "q5").getByLabel("Date sent").fill("2024-06-01");                         // no-date
  await row(page, "q5").getByRole("button", { name: "Save date" }).click();
  await row(page, "q6").getByLabel("Query status").selectOption("Partial Sent");            // status-wording
  await row(page, "q6").getByRole("button", { name: "That's right" }).click();
  await row(page, "q11").getByRole("button", { name: "Leave undated" }).click();            // two reasons, both
  await row(page, "q11").getByRole("button", { name: "That's right" }).click();
  await page.getByRole("button", { name: /^Import/ }).click();
  await page.waitForFunction(() => !!window.__v4, null, { timeout: 5000 });
  writeFileSync(`${out}/v4-review.json`, JSON.stringify(await page.evaluate(() => window.__v4), null, 1) + "\n");
  log("review fixture captured");
  await page.context().close();
}

// ── fixture 2: REVIEW_FIXTURE_DUPES ──────────────────────────────────────────────────────────────
{
  const page = await open("#/import-review-dupes");
  await clear(page);
  // the three-way Carter set: one merge (J. Carter removed) leaves a differing pair → its reconcile card
  await page.getByRole("button", { name: "Remove this one" }).nth(1).click();
  await page.waitForTimeout(600);
  const openCards = page.locator(".reconcile-btn-primary");
  log("reconcile cards open:", await openCards.count());
  await openCards.first().click();                                                               // Carter pair: looks right
  await page.waitForTimeout(500);
  await openCards.first().click();                                                               // Beth pair: looks right
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: /These are actually different submissions/ }).first().click();
  await page.getByRole("button", { name: "Keep both", exact: true }).first().click();      // Priya pair: split
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: "They're different — keep both" }).first().click(); // Finch pair: keep both
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: /^Review all agents/ }).click();
  await page.waitForTimeout(600);
  await clear(page);
  await page.getByRole("button", { name: /^Continue/ }).click();
  await page.waitForTimeout(600);
  await clear(page);
  await page.getByRole("button", { name: /^Import/ }).click();
  await page.waitForFunction(() => !!window.__v4, null, { timeout: 5000 });
  writeFileSync(`${out}/v4-dupes.json`, JSON.stringify(await page.evaluate(() => window.__v4), null, 1) + "\n");
  log("dupes fixture captured");
  await page.context().close();
}
await browser.close();
