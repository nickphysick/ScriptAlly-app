/**
 * Two-door import v1 — the walk on dev (Phase 6). The dedicated empty fixture account is put back into
 * set-up and walked to "Your list", then `template-dmy.csv` goes through the headings route — no Smart
 * Import call, asserted — to the read screen, the questions and the dashboard. Every screen is
 * screenshotted into reports/two-door-import/. What the import wrote is removed in `afterAll`, which
 * proves the account's document counts match the snapshot taken before. The password is never printed.
 *
 *   ALLOW_LIVE_FIRESTORE=1 SA_E2E_BASE_URL=https://scriptally-dev.web.app npm run e2e -- tests/e2e/twoDoorWalk.measure.ts --project=measure --no-deps --workers=1
 */
import { test, expect, type Page, type Browser } from "@playwright/test";
import { readFileSync, existsSync, mkdirSync, appendFileSync } from "node:fs";
import { resolve } from "node:path";
import { session, snapshot, enterSetup, restore, ACCOUNT_EMAIL } from "./importFixesAccount.mjs";
import { answerAgents, answerQueries } from "./reviewDrive";

const OUT = resolve(process.cwd(), "reports/two-door-import");
const FX = (name: string) => resolve(process.cwd(), "tests/fixtures/import", name);
function readPw(): string {
  if (process.env.SA_E2E_PASSWORD) return process.env.SA_E2E_PASSWORD;
  const file = resolve(process.cwd(), ".env.local");
  if (existsSync(file)) for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = /^\s*SA_E2E_PASSWORD\s*=\s*(.+)$/.exec(line);
    if (m) return m[1].trim().replace(/^["']|["']$/g, "");
  }
  throw new Error("no SA_E2E_PASSWORD");
}
const record = (name: string, value: unknown) => { mkdirSync(OUT, { recursive: true }); appendFileSync(resolve(OUT, "walk-readings.jsonl"), JSON.stringify({ name, at: new Date().toISOString(), value }) + "\n"); };
const shot = async (page: Page, name: string) => { mkdirSync(OUT, { recursive: true }); await page.screenshot({ path: resolve(OUT, `walk-${name}.png`), fullPage: true }); };
const text = (page: Page, sel: string) => page.locator(sel).first().innerText().then((t) => t.replace(/\s+/g, " ").trim(), () => "");

async function signIn(browser: Browser, baseURL: string) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, baseURL, storageState: { cookies: [], origins: [] } });
  const page = await ctx.newPage();
  await page.goto("/#/signin");
  await page.locator("#au-email").fill(ACCOUNT_EMAIL);
  await page.locator("#au-pw").fill(readPw());
  await page.getByRole("button", { name: /^Sign in$/ }).last().click();
  await page.locator('[data-screen="welcome"]').waitFor({ timeout: 40_000 });
  return { ctx, page };
}

test.describe.configure({ mode: "serial" });
test.setTimeout(240_000);
let before: Awaited<ReturnType<typeof snapshot>>;
test.beforeAll(async () => { await session(); before = await snapshot(); record("countsBefore", before.counts); });
test.afterAll(async () => {
  const after = await restore(before);
  record("countsAfter", after);
  expect(after, "the account's document counts match the snapshot taken before").toEqual(before.counts);
});

test("WALK · set-up to the dashboard through the headings route, with template-dmy.csv", async ({ browser, baseURL }) => {
  await enterSetup();
  const { ctx, page } = await signIn(browser, baseURL!);
  const calls: string[] = [];
  page.on("request", (r) => { if (/smartImportMap/.test(r.url())) calls.push(r.url()); });
  try {
    await page.getByRole("radio", { name: /A few queries out/ }).click();
    await page.locator('[data-o9="welcome-card"] .sf-btn').click();
    await page.locator('[data-screen="ack"]').waitFor({ timeout: 20_000 });
    await page.locator('[data-o9="passage"]').click();
    await page.locator("#o9-title").fill("The Salt Road");
    await page.locator('[data-o9="title-card"] [data-act="continue"]').click();
    await page.locator('[data-o9="book-card"].is-in').waitFor({ timeout: 20_000 });
    await page.locator('[data-o9="genre"] [data-genre="thriller"]').click();
    await page.locator('[data-o9="book-card"] [data-act="continue"]').click();

    // 1 · the doors
    await page.locator('[data-screen="fork"]').waitFor({ timeout: 20_000 });
    await page.waitForTimeout(1500);
    const fork = { heading: await text(page, '[data-screen="fork"] h1'), tiles: await page.locator('[data-screen="fork"] .sf-tile').count(), quiet: await text(page, '[data-sf="quiet"]') };
    await shot(page, "1-doors");

    // 2 · we've read your file — straight in, no confirm
    await page.locator('input[type="file"][data-picker="smart"]').setInputFiles(FX("template-dmy.csv"));
    await page.locator('[data-im="summary"]').waitFor({ timeout: 30_000 });
    await page.waitForTimeout(1200);
    const read = { title: await text(page, '[data-im="title"]'), line: await text(page, '[data-im="read-line"]'), sorted: await text(page, '[data-im="sorted"]'), bar: await text(page, '[data-im="nextbar"]'), confirm: await page.locator('[data-screen="confirm"]').count() };
    await shot(page, "2-read");

    // 3 · the questions
    await page.locator('[data-im="summary"] [data-im="primary"]').click();
    await page.locator('[data-im="review"]').waitFor({ timeout: 20_000 });
    if ((await page.locator('[data-im="review"]').getAttribute("data-step")) === "agents") {
      await answerAgents(page);
      await page.locator('[data-im="review"] [data-im="primary"]').click();
    }
    await page.locator('[data-im="review"][data-step="queries"]').waitFor({ timeout: 20_000 });
    await page.waitForTimeout(800);
    const review = { title: await text(page, '[data-im="title"]'), primary: await text(page, '[data-im="review"] [data-im="primary"]'), chip: await text(page, '[data-im="deck-chip"]') };
    await shot(page, "3-review");
    await answerQueries(page);
    const ready = await text(page, '[data-im="review"] [data-im="primary"]');
    await shot(page, "3-review-answered");
    await page.locator('[data-im="review"] [data-im="primary"]').click();

    // the dashboard
    await page.locator('#ws-sidebar, .ws-work').first().waitFor({ timeout: 60_000 });
    await page.waitForTimeout(2500);
    await shot(page, "4-dashboard");
    record("walk", { fork, read, review, ready, calls });

    expect(fork.tiles).toBe(2);
    expect(fork.heading).toBe("How shall we capture your list?");
    expect(read.confirm, "no confirm screen on the headings route").toBe(0);
    expect(read.line).toBe("Your headings matched ours, so it was read straight in and checked against QueryHawk's rules. No wait.");
    expect(calls, "no Smart Import call").toEqual([]);
    expect(ready).toMatch(/^Import \d+ agents? and \d+ quer(y|ies)$/);
  } finally {
    await ctx.close();
  }
});
