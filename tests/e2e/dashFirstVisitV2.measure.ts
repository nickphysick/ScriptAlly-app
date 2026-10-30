/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD FIRST VISIT v2 — the rendered locks (ref design-refs/dashboard-first-visit-v2/), at 1512×982 and 1280×800.
 *
 *   A1 placement · A2 labels · B1 the answer · C1 "It's ready" · D1 the tour · E1 the example · F1 resume · G1 the
 *   nudge-email ask · H1 the finish line. (I1, the event log, is the emulator suite tests/rules/events.rules.test.ts.)
 *
 * The harness account is shared: every lock that changes it puts back what it changed, in the same run, through
 * tests/e2e/seedFv2.mjs. The pre-query manuscript is seedDash60's `db60-pre`. FV2_MUTATE=<lock> is how each lock's named
 * break is applied (reports/dashboard-first-visit-v2/mutations.txt).
 */
import { test, expect, type Page } from "@playwright/test";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";

type VP = { width: number; height: number };
const SIZES: VP[] = [{ width: 1512, height: 982 }, { width: 1280, height: 800 }];
const PRE = "db60-pre";
const DIR = "reports/dashboard-first-visit-v2";
const seed = (args: string) => execSync(`node tests/e2e/seedFv2.mjs ${args}`, { encoding: "utf8" }).trim();
const dump = (ms = PRE) => JSON.parse(seed(`dump ${ms}`).split("\n").pop()!);

type Row = { lock: string; where: string; ok: boolean; detail: string };
class Ledger {
  rows: Row[] = [];
  constructor(public name: string) {}
  check(lock: string, where: string, ok: boolean, detail: string) { this.rows.push({ lock, where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${this.name}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok)) console.log(`  ✗ ${r.lock} · ${r.where} — ${r.detail}`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.lock} · ${r.where} — ${r.detail}`)).toEqual([]);
  }
}

async function openDash(page: Page, vp: VP, ms: string) {
  await page.addInitScript((m) => { try { localStorage.setItem("scriptally_active_manuscript_id", m as string); } catch { /* private mode */ } }, ms);
  await openRoute(page, "/dashboard", vp);
  await page.locator('[data-d58="page"][data-loading="0"]').first().waitFor({ timeout: 25_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);
}
const vis = (page: Page, sel: string) => page.locator(sel).filter({ visible: true }).first();

/* ── F1 · pick up where you left off ─────────────────────────────────────────────────────────────── */
test("F1 · a review left at agent 23 of 31 is kept, resumed at row 24, and goes when discarded or finished", async ({ page }) => {
  test.setTimeout(420_000);
  const L = new Ledger("F1");
  seed("draft-clear");
  seed("imports-clean");
  const vp = SIZES[0];
  try {
    await openDash(page, vp, PRE);
    L.check("F1", "before", (await page.locator('[data-fv2-card="resume"]').count()) === 0, "no resume card before a review is left");
    /* the template path: parsed in the browser, no model and no entitlement */
    await page.goto("/import");
    await page.locator('input[data-picker="template"]').setInputFiles("tests/e2e/fixtures/fv2-tracker-31.xlsx");
    await vis(page, '[data-im="summary"] [data-im="primary"]').click();
    await vis(page, '[data-im="deck"]').waitFor({ timeout: 20_000 });
    const first = await vis(page, '[data-im="deck-pos"]').textContent();
    L.check("F1", "deck", /^1 of 31$/.test((first ?? "").trim()), `the deck opens on ${first}`);
    const order: string[] = [];
    for (let i = 0; i < 23; i += 1) {
      const card = vis(page, '[data-im="deck-card"]');
      order.push((await card.getAttribute("data-card")) ?? "");
      await card.getByRole("button", { name: "Carry on without an agency" }).click();
      await expect(vis(page, '[data-im="deck-pos"]')).toHaveText(`${i + 2} of 31`, { timeout: 10_000 });
    }
    const row24 = await vis(page, '[data-im="deck-card"]').getAttribute("data-card");
    await page.waitForTimeout(2500); /* the draft is saved 800ms after the last change */
    const kept = dump().draft;
    L.check("F1", "kept", kept?.a === "23/31" && kept?.file === "fv2-tracker-31.xlsx" && kept?.step === "agents", JSON.stringify(kept));

    /* leave, and come back after a reload */
    await openDash(page, vp, PRE);
    await page.reload();
    await page.locator('[data-d58="page"][data-loading="0"]').first().waitFor({ timeout: 25_000 });
    const card = vis(page, '[data-fv2-card="resume"]');
    await card.waitFor({ timeout: 15_000 });
    const tile = (await vis(page, '[data-fv2="resume-agents"]').textContent()) ?? "";
    const qtile = (await vis(page, '[data-fv2="resume-queries"]').textContent()) ?? "";
    L.check("F1", "card", /23 of 31 checked/.test(tile), `agents tile: ${tile}`);
    L.check("F1", "card", /not started/.test(qtile), `queries tile: ${qtile}`);
    L.check("F1", "card", (await vis(page, '[data-fv2="resume-file"]').textContent())?.trim() === "fv2-tracker-31.xlsx", "the file's name");
    L.check("F1", "card", (await page.locator('[data-fv1="setup"]').filter({ visible: true }).count()) === 0, "it takes the set-up card's place");
    const at = await card.boundingBox();
    const mid = await vis(page, '[data-df1="feed"]').boundingBox();
    L.check("F1", "card", !!at && !!mid && Math.abs(at.y - mid.y) <= 1, `first in the middle column (${at?.y} vs ${mid?.y})`);

    /* carry on: the review reopens at the step and the row it was left on */
    await vis(page, '[data-fv2="resume-carry-on"]').click();
    await vis(page, '[data-im="deck"]').waitFor({ timeout: 20_000 });
    const pos = (await vis(page, '[data-im="deck-pos"]').textContent())?.trim();
    const now = await vis(page, '[data-im="deck-card"]').getAttribute("data-card");
    /* ⚠️ THE DECK COUNTS THE ROWS STILL ASKING SOMETHING (and any answered in this visit), so a resumed review reads
       "1 of 8": the 8 left of 31. The review is not this pack's to change; the row it opens on is the claim. */
    L.check("F1", "resume", pos === "1 of 8", `the deck reopens on ${pos} (the 8 still to check)`);
    L.check("F1", "resume", !!row24 && now === row24, `on the 24th row (${now} vs ${row24})`);
    L.check("F1", "resume", !order.includes(now ?? "-"), "not on a row already answered");

    /* discard (Cancel → Discard): the draft goes */
    await vis(page, '[data-im="cancel"]').click();
    await page.getByRole("button", { name: /^Discard/ }).filter({ visible: true }).first().click();
    await page.waitForTimeout(2000);
    L.check("F1", "discard", dump().draft === null, "discarding deletes the draft");

    /* finishing deletes it: a one-row file, imported into the pre-query book, then taken out again */
    await page.goto("/import");
    await page.locator('input[data-picker="template"]').setInputFiles("tests/e2e/fixtures/fv2-tracker-1.xlsx");
    await vis(page, '[data-im="summary"] [data-im="primary"]').click();
    await vis(page, '[data-im="deck"]').waitFor({ timeout: 20_000 });
    await vis(page, '[data-im="deck-card"]').getByRole("button", { name: "Carry on without an agency" }).click();
    await page.waitForTimeout(2500);
    L.check("F1", "finish", dump().draft?.a === "1/1", `kept before finishing: ${JSON.stringify(dump().draft)}`);
    const go = vis(page, '[data-im="primary"]');
    await go.click();
    if (await page.locator('[data-im="review"][data-step="queries"]').count()) await vis(page, '[data-im="primary"]').click();
    await page.waitForURL(/\/dashboard/, { timeout: 60_000 }).catch(() => {});
    await page.waitForTimeout(2000);
    L.check("F1", "finish", dump().draft === null, "finishing the import deletes the draft");
  } finally {
    seed("draft-clear");
    console.log(seed("imports-clean"));
  }
  L.done(13);
});
