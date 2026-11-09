/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Your notes v1 (design-refs/your-notes-v1) — the page, the panel and the pop-up on the rendered app, at 1512 × 982 and
 * 1280 × 800, over the harness account's seeded notes (`tests/e2e/seedYourNotes.mjs`, run before: six `yn1-` notes).
 *
 *   YN-M1  the header's three columns; the ring at 214; the side column at 380; six rows
 *   YN-M2  a note's panel: the timeline, our founder's reply, the thread, the reopen wording
 *   YN-M3  the pop-up: idle at 500 wide, Don't like chosen, and sent (the send is intercepted: nothing is written)
 *   YN-M4  the rail's More panel names Your notes; the Dashboard band's "All your notes" goes to /your-notes
 *   YN-M5  the empty page (the seeder's --clean, then re-seeded)
 *   YN-M6  the phone: one column
 *   YN-E1  one real follow-up through addFeedbackNote on dev: "Still happening" on a fixed note opens it again and the
 *          message reaches the thread (the seeder is re-run afterwards, so nothing is left behind)
 *
 * ⚠️ EVERY READ STARTS FROM THE VISIBLE COPY (`.yn`): the page mounts on demand, but other pages stay mounted.
 */
import { expect, test, type Page } from "@playwright/test";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { openApp } from "./pageHeaderV2Lib";

test.describe.configure({ mode: "serial" });
const DIR = "reports/your-notes-v1";
const SHOTS = `${DIR}/shots`;
mkdirSync(SHOTS, { recursive: true });
const SIZES = [{ width: 1512, height: 982 }, { width: 1280, height: 800 }];
const readings: Record<string, unknown> = {};
const seed = (clean = false) => execSync(`node tests/e2e/seedYourNotes.mjs${clean ? " --clean" : ""}`, { stdio: "inherit" });

async function openNotes(page: Page, vp: { width: number; height: number }, rows = 6) {
  await openApp(page, "/your-notes", vp);
  if (rows) await expect(page.locator('.yn [data-yn="row"]')).toHaveCount(rows, { timeout: 30_000 });
  else await page.locator('.yn [data-yn="empty"]').waitFor({ timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);
  await page.mouse.move(2, 2);
}

const box = (page: Page, sel: string) => page.evaluate((s) => {
  const e = [...document.querySelectorAll<HTMLElement>(s)].find((x) => x.getBoundingClientRect().width > 0);
  if (!e) return null;
  const r = e.getBoundingClientRect();
  return { x: Math.round(r.x * 10) / 10, y: Math.round(r.y * 10) / 10, w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10 };
}, sel);

test.beforeAll(() => seed());

for (const vp of SIZES) {
  const tag = `${vp.width}x${vp.height}`;

  test(`YN-M1 the page · ${tag}`, async ({ page }) => {
    await openNotes(page, vp);
    const m = {
      art: await box(page, ".yn .yn-hdw .qc1531-art"),
      main: await box(page, ".yn .yn-hdw .qc1531-main"),
      ringCol: await box(page, ".yn .yn-hdw .qc1531-rc"),
      ringSvg: await box(page, ".yn .yn-hdw .qc1531-rsvg svg"),
      side: await box(page, ".yn .yn-side"),
      title: await page.locator('.yn [data-yn="title"]').innerText(),
      mid: await page.locator('.yn [data-yn="mid"]').textContent(),
    };
    readings[`M1-${tag}`] = m;
    expect(m.ringSvg?.w).toBe(214);
    expect(m.side?.w).toBe(380);
    expect(m.title).toBe("6 notes sent");
    expect(m.mid).toBe("5");
    await page.screenshot({ path: `${SHOTS}/page-${tag}.png` });
    await page.screenshot({ path: `${SHOTS}/page-full-${tag}.png`, fullPage: true });
  });

  test(`YN-M2 a note's panel · ${tag}`, async ({ page }) => {
    await openNotes(page, vp);
    await page.locator('.yn [data-yn="row"][data-id="yn1-4"]').click();
    await page.locator('[data-yn="panel"]').waitFor();
    await expect(page.locator('[data-yn="thread-writer"]')).toHaveCount(1, { timeout: 15_000 });
    await page.waitForTimeout(500);
    readings[`M2-${tag}`] = { panel: await box(page, '[data-yn="panel"]'), steps: await page.locator('[data-yn="timeline"] li').count() };
    expect((await box(page, '[data-yn="panel"]'))?.w).toBe(560);
    await page.screenshot({ path: `${SHOTS}/panel-thread-${tag}.png` });
    await page.keyboard.press("Escape");
    await expect(page.locator('[data-yn="panel"]')).toHaveCount(0);
    await page.locator('.yn [data-yn="row"][data-id="yn1-2"]').click();
    await page.locator('[data-yn="panel"]').waitFor();
    await expect(page.locator('[data-yn="reply-box"]')).toHaveAttribute("placeholder", "Still happening? Tell us what you’re seeing.");
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SHOTS}/panel-reopen-${tag}.png` });
  });

  test(`YN-M3 the pop-up · ${tag}`, async ({ page }) => {
    await page.route("**/sendBetaFeedback", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ result: { ok: true, emailed: true } }) }));
    await openNotes(page, vp);
    await page.locator('.yn [data-yn="tell-us"]').click();
    const pop = page.locator('[data-fb="panel"]');
    await pop.waitFor();
    await page.waitForTimeout(500);
    readings[`M3-${tag}`] = { pop: await box(page, '[data-fb="panel"]') };
    expect((await box(page, '[data-fb="panel"]'))?.w).toBe(500);
    await page.screenshot({ path: `${SHOTS}/pop-idle-${tag}.png` });
    await pop.locator('[data-fb="kind"][data-key="dont"]').click();
    await pop.locator('[data-fb="message"]').fill("The agency column jumps when I sort it twice in a row.");
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${SHOTS}/pop-dont-${tag}.png` });
    await pop.locator('[data-fb="send"]').click();
    await pop.locator('[data-fb="sent"]').waitFor();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${SHOTS}/pop-sent-${tag}.png` });
  });
}

test("YN-M4 the rail's More panel and the Dashboard band's link", async ({ page }) => {
  const vp = SIZES[0];
  await openApp(page, "/dashboard", vp);
  const link = page.locator('[data-d2="fw-all-notes"]').first();
  await link.waitFor({ timeout: 30_000 });
  await page.waitForTimeout(800);
  const band = await box(page, '[data-d2-card="founding"]');
  if (band) await page.screenshot({ path: `${SHOTS}/dash-band-link.png`, clip: { x: band.x, y: band.y, width: band.w, height: band.h } });
  await link.click();
  await expect(page).toHaveURL(/\/your-notes$/);
  /* the rail's More button: hover opens the panel */
  const more = page.locator('[data-go="more"]').first();
  if (await more.isVisible()) {
    await more.click();
    await page.locator('[data-shell="more"]').waitFor();
    await expect(page.locator('[data-shell="more"] [data-go="notes"]')).toHaveText(/Your notes/);
    await page.screenshot({ path: `${SHOTS}/rail-more.png` });
  } else {
    readings["M4-more"] = "the rail was not on screen (the full sidebar is pinned); the More panel was not captured";
  }
});

test("YN-M5 the empty page", async ({ page }) => {
  seed(true);
  try {
    for (const vp of SIZES) {
      await openNotes(page, vp, 0);
      await page.screenshot({ path: `${SHOTS}/empty-${vp.width}x${vp.height}.png` });
    }
  } finally { seed(); }
});

test("YN-M6 the phone", async ({ page }) => {
  /* the harness signs in on the desktop shell, so the phone width is set after (a known harness limit) */
  await openNotes(page, SIZES[0]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page.locator('.yn [data-yn="row"]')).toHaveCount(6, { timeout: 30_000 });
  await page.waitForTimeout(800);
  readings["M6-390"] = {
    hd: await box(page, ".yn .yn-hdw .qc1531-hd"), rc: await box(page, ".yn .yn-hdw .qc1531-rc"), ring: await box(page, ".yn .yn-hdw .qc1531-ring"),
    rb: await box(page, ".yn .yn-hdw .qc1531-rb"), rsvg: await box(page, ".yn .yn-hdw .qc1531-rsvg"), svg: await box(page, ".yn .yn-hdw .qc1531-rsvg svg"),
    scrollW: await page.evaluate(() => [...document.querySelectorAll<HTMLElement>(".yn")].map((e) => [e.clientWidth, e.scrollWidth])),
  };
  await page.screenshot({ path: `${SHOTS}/phone-390.png` });
  /* the stage scrolls, not the window: three more screens down */
  for (const n of [1, 2, 3]) {
    await page.evaluate((k) => { const sc = [...document.querySelectorAll<HTMLElement>("#app-stage-scroll, .ws-wbody, .ws-winwrap")].find((e) => e.scrollHeight > e.clientHeight + 4); if (sc) sc.scrollTop = k * 760; }, n);
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${SHOTS}/phone-390-${n}.png` });
  }
});

test("YN-E1 a real follow-up through addFeedbackNote", async ({ page }) => {
  await openNotes(page, SIZES[0]);
  await page.locator('.yn [data-yn="row"][data-id="yn1-2"]').click();
  await page.locator('[data-yn="reply-box"]').fill("Still seeing it on the second import of the day.");
  await page.locator('[data-yn="send"]').click();
  await expect(page.locator('[data-yn="thread-writer"]')).toHaveCount(1, { timeout: 30_000 });
  /* the note opened again: no status, so its chip reads Not read yet */
  await page.keyboard.press("Escape");
  await expect(page.locator('.yn [data-yn="row"][data-id="yn1-2"] [data-yn="chip"]')).toHaveAttribute("data-b", "none", { timeout: 30_000 });
  readings["E1"] = "reopened and threaded";
  seed();
});

test.afterAll(() => { writeFileSync(`${DIR}/readings.json`, JSON.stringify(readings, null, 1)); });
