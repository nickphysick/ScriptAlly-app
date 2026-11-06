/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query letters v1 (6 Nov) — the page, the band, the drawer, the empty page and the Materials lock, on the emulators.
 * Refs: design-refs/query-letters-v1 (01–07). Fixture: tests/e2e/seedQueryLetters.mjs (Murphy's Day Out). QL_SHOTS=<dir>
 * writes the report's screenshots.
 *
 *   node scripts/emu.mjs e2e tests/e2e/queryLettersV1.measure.ts --project=measure --workers=1
 */
import { test, expect, type Page } from "@playwright/test";
import { execSync } from "node:child_process";
import { openRoute } from "./measure";

const WIDE = { width: 1512, height: 982 };
const SHOTS = process.env.QL_SHOTS ?? "";
async function shot(page: Page, name: string) {
  if (!SHOTS) return;
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SHOTS}/${name}.png` });
}
async function openLetters(page: Page, msId: string, opts: { free?: boolean } = {}) {
  await page.addInitScript(([id, free]) => {
    try { localStorage.setItem("scriptally_active_manuscript_id", id as string); } catch { /* */ }
    if (free) (window as unknown as { __SA_NAV_FREE?: boolean }).__SA_NAV_FREE = true;
  }, [msId, !!opts.free]);
  await openRoute(page, "/materials/letters", WIDE);
  await expect(page.locator('[data-ql="page"]')).toBeVisible({ timeout: 30_000 });
}
const drawer = (page: Page) => page.locator('aside[data-hdr="letter"]');

test.describe.configure({ mode: "serial" });
test.beforeAll(() => { execSync("node tests/e2e/seedQueryLetters.mjs", { stdio: "inherit" }); });

test("QL1 the page: header, in-use card, cards in order, the band's small-sample words", async ({ page }) => {
  await openLetters(page, "cv25-ms");
  const p = page.locator('[data-ql="page"]');
  await expect(p.locator("h1")).toHaveText("4 query letters");
  await expect(p.locator('[data-ql="for"]')).toContainText("Murphy's Day Out");
  const use = p.locator('[data-ql="in-use"]');
  await expect(use).toContainText("Going out with new queries");
  await expect(use).toContainText("Query letter v2");
  await expect(use.locator('[data-ql="ring"]')).toContainText(/\d+ ?\/\d+/);
  const ids = await p.locator('[data-ql="grid"] [data-ql="card"]').evaluateAll((els) => els.map((e) => e.getAttribute("data-id")));
  console.log("[QL1] card order", JSON.stringify(ids));
  expect(ids[0]).toBe("cv25-let-2");
  expect(ids).toContain("ql1-draft");
  await expect(p.locator('[data-ql="card"][data-id="cv25-let-2"]')).toContainText("In use for new queries");
  await expect(p.locator('[data-ql="card"][data-id="ql1-draft"]')).toContainText("Not sent yet");
  await expect(p.locator('[data-ql="new-tile"]')).toContainText("Write a new letter");
  await shot(page, "01-page");
  await p.locator('[data-ql="jump"]').click();
  await page.waitForTimeout(800);
  const band = p.locator('[data-ql="landing"]');
  await expect(band).toBeInViewport();
  const rows = band.locator('[data-ql="row"]');
  const n = await rows.count();
  console.log("[QL1] band rows", n, JSON.stringify(await band.locator('[data-ql="early"]').allTextContents()));
  expect(n).toBeGreaterThan(0);
  await expect(band.locator('[data-ql="early"]').first()).toHaveText(/^Early days: only \d+ sent$/);
  await expect(band).toContainText("A letter needs about 15 queries before its rate means much.");
  await shot(page, "03-landing");
});

test("QL2 open a letter, switch tabs; a sent letter is locked and copies to a new letter, which saves", async ({ page }) => {
  await openLetters(page, "cv25-ms");
  await page.locator('[data-ql="card"][data-id="cv25-let-2"]').click();
  const d = drawer(page);
  await expect(d).toBeVisible();
  await expect(d.locator('[data-ql="drawer-sub"]')).toContainText(/Sent with \d+ quer(y|ies) · \d+ words · in use for new queries/);
  await expect(d.locator('[data-ql="changes"]')).toContainText("Query letter v1");
  await expect(d.locator('[data-ql="changes"]')).toContainText("Hook moved to the first line");
  await expect(d.locator('[data-ql="sheet"]')).toContainText("Tess Murphy");
  await expect(d).toContainText("Sent letters stay as they went.");
  await expect(d.locator('[data-ql="edit"]')).toHaveCount(0);
  await shot(page, "04-drawer-letter");
  await d.locator('[data-ql="tab-stats"]').click();
  await expect(d.locator('[data-ql="pane-stats"]')).toContainText("Queries it went out with");
  expect(await d.locator('[data-ql="query-row"]').count()).toBeLessThanOrEqual(6);
  await shot(page, "05-drawer-stats");
  await d.locator('[data-ql="tab-letter"]').click();
  await d.locator('[data-ql="copy"]').click();
  await expect(d.locator('[data-ql="new-form"]')).toBeVisible();
  await expect(d).toContainText("A copy of Query letter v2");
  await expect(d).toContainText("What's different from Query letter v2?");
  await d.locator('[data-ql="new-name"]').fill("Query letter v4");
  await d.locator('[data-ql="new-change"]').first().fill("Shorter close");
  await shot(page, "09-new-letter");
  await d.locator('[data-ql="save-letter"]').click();
  await expect(d.locator('[data-ql="drawer-sub"]')).toContainText("Draft · saved");
  await expect(d.locator('[data-ql="changes"]')).toContainText("Shorter close");
  await expect(d.locator('[data-ql="edit"]')).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(d).toHaveCount(0);
  await expect(page.locator('[data-ql="page"] h1')).toHaveText("5 query letters");
});

test("QL3 change the in-use letter: the flag and the card move; the package line only when the package differs", async ({ page }) => {
  await openLetters(page, "cv25-ms");
  const p = page.locator('[data-ql="page"]');
  await p.locator('[data-ql="change"]').click();
  await p.locator('[data-ql="picker"] [role="option"]', { hasText: "Query letter v1" }).click();
  await expect(p.locator('[data-ql="in-use"]')).toContainText("Query letter v1");
  await expect(p.locator('[data-ql="card"][data-id="cv25-let-1"]')).toContainText("In use for new queries");
  const first = await p.locator('[data-ql="grid"] [data-ql="card"]').first().getAttribute("data-id");
  expect(first).toBe("cv25-let-1");
  await expect(p.locator('[data-ql="pkg-letter"]')).toHaveCount(0);
});

test("QL4 the empty page, and the first letter's note for queries already out", async ({ page }) => {
  await openLetters(page, "thin-ms");
  const p = page.locator('[data-ql="page"]');
  await expect(p.locator("h1")).toHaveText("No query letters yet");
  await expect(p.locator('[data-ql="first-card"]')).toContainText("Write your first letter");
  await shot(page, "08-empty");
  await p.locator('[data-ql="first-card"]').click();
  const d = drawer(page);
  await d.locator('[data-ql="new-name"]').fill("Query letter v1");
  await d.locator('[data-ql="new-body"]').fill("Dear [Agent],\n\nA quiet fixture's first letter.");
  await d.locator('[data-ql="save-letter"]').click();
  await expect(d.locator('[data-ql="first-note"]')).toHaveText(/^You already have \d+ queries out\. We'll count them towards this letter\. If that's not right, it's easy to change on each query\.$/);
  await page.keyboard.press("Escape");
  await expect(p.locator("h1")).toHaveText("1 query letter");
  await expect(p.locator('[data-ql="card"]').first()).not.toContainText("Not sent yet");
});

test("QL5 a Free writer meets the lock on Query letters and on Comparable titles", async ({ page }) => {
  await openLetters(page, "cv25-ms", { free: true });
  const lock = page.locator('[data-mlk="letters"] [data-mlk="lock"]');
  await expect(lock).toContainText("Query letters is part of Pro");
  await expect(lock).toContainText("On Free, your queries still record that a query letter went.");
  await shot(page, "06-free-lock");
  expect(await page.locator('[data-mlk="letters"] .mlk-page').getAttribute("inert")).not.toBeNull();
  await page.goto("/manuscripts/comps");
  await page.waitForTimeout(2500);
  await expect(page.locator('[data-mlk="comps"] [data-mlk="lock"]')).toContainText("Materials is part of Pro");
  await shot(page, "07-free-lock-comps");
  await page.locator('[data-mlk="comps"] [data-mlk="not-now"]').click();
  await expect(page).toHaveURL(/\/dashboard/);
});
