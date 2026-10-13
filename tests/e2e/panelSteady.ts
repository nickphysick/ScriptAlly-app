/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * WAIT ON THE STATE THE CLICK PRODUCES, NOT ON TIME (ruling, 12 Oct). The query panel's locks walked every step
 * of every action with a fixed pause after each press. On the shared account a press sometimes landed while the
 * panel was still changing — the scrim lifting, the card coming back, the foot re-rendering — and was lost; the
 * next wait then ran out (QP2 V12, QP1 P7 to P8: each failed inside a full run and passed alone).
 *
 * Each helper presses once and then waits for what that press is meant to produce, and for the panel to be at
 * rest (nothing in it or its scrim still animating). No press is repeated: a click that produces nothing is a
 * failure with a name, in seconds.
 */
import { expect, type Page } from "@playwright/test";

export const PANEL = '[data-qp="panel"]';
const T = 12_000;

/** The panel and its scrim are at rest: nothing in either is still animating or in transition. */
export async function atRest(page: Page) {
  await page.waitForFunction(() => {
    const els = [document.querySelector('[data-qp="panel"]'), document.querySelector("[data-side-scrim]")].filter((e): e is Element => !!e);
    return els.every((e) => e.getAnimations({ subtree: true }).every((a) => a.playState !== "running"));
  }, null, { timeout: T });
}
/** The page is not dimmed: the scrim is off, so a row under it can be pressed. */
export async function undimmed(page: Page) {
  await page.waitForFunction(() => !document.body.classList.contains("spanel-dim") && !document.querySelector('[data-side-scrim][data-on="true"]'), null, { timeout: T });
  await atRest(page);
}
/** No step is open: the panel shows the query's own card, and the page is not dimmed. */
export async function cardShown(page: Page) {
  await expect(page.locator(`${PANEL} [data-qp-step]`)).toHaveCount(0, { timeout: T });
  await page.waitForFunction(() => { const o = document.querySelector<HTMLElement>('[data-qp="panel"] [data-side-own]'); return !o || o.getBoundingClientRect().height > 0; }, null, { timeout: T });
  await undimmed(page);
}
/** A step is open in the panel, with its primary button drawn. */
export async function stepShown(page: Page, what = "the step") {
  await expect(page.locator(`${PANEL} [data-qp-step]`), `${what} did not open in the panel`).toBeVisible({ timeout: T });
  await atRest(page);
}
/** Press one of the footer's doors, and wait for its step. */
export async function pressDoor(page: Page, door: string | number) {
  await cardShown(page);
  const b = typeof door === "number" ? page.locator(`${PANEL} [data-door]`).nth(door) : page.locator(`${PANEL} [data-door="${door}"]`);
  await b.click({ timeout: T });
  await stepShown(page, `door ${door}`);
}
/** The stepper's current step index, or -1 where the step draws no stepper; "review" on the review. */
export const stepAt = (page: Page) => page.evaluate(() => {
  const p = document.querySelector<HTMLElement>('[data-qp="panel"]');
  if (!p) return "gone";
  if (p.querySelector("[data-qad-review]")) return "review";
  const cur = [...p.querySelectorAll<HTMLElement>(".qad-stepper .qad-stp")].findIndex((e) => e.classList.contains("cur"));
  return String(cur);
});
/** Press Next, and wait for the step to change. Returns false where there is no Next to press. */
export async function pressNext(page: Page): Promise<boolean> {
  const can = await page.evaluate(() => { const b = document.querySelector<HTMLButtonElement>('[data-qp="panel"] [data-qad-primary]'); return !!b && !b.disabled && /^Next/.test((b.textContent ?? "").trim()); });
  if (!can) return false;
  const was = await stepAt(page);
  await page.locator(`${PANEL} [data-qad-primary]`).click({ timeout: T });
  await expect.poll(() => stepAt(page), { timeout: T, message: `Next was pressed at step ${was} and the step did not change` }).not.toBe(was);
  await atRest(page);
  return true;
}
/** "← Back to query": the step closes and the card returns. */
export async function stepBack(page: Page) {
  await page.locator(`${PANEL} [data-qp="step-back"]`).click({ timeout: T });
  await cardShown(page);
}
/**
 * Leave whatever step is open, by its ✕. ✕ has exactly two outcomes — the step closes, or (when it holds answers)
 * it asks "Discard this?" — so there is always a state to wait on.
 * ⚠️ NOT ESCAPE: Escape on a step with answers PARKS it (decision 8). A parked step stays mounted, so "the step is
 *    gone" never becomes true and nothing asks; and a first Escape can be spent closing an open calendar.
 */
export async function leaveStep(page: Page) {
  for (let i = 0; i < 3; i++) {
    if (!(await page.locator(`${PANEL} [data-qp-step]`).count())) break;
    await page.locator(`${PANEL} [data-qp-step] .qad-dx`).first().click({ timeout: T });
    await page.waitForFunction(() => !document.querySelector('[data-qp="panel"] [data-qp-step]') || !!document.querySelector("[data-qad-discard] .disc"), null, { timeout: T });
    const disc = page.locator("[data-qad-discard] .disc").first();
    if (await disc.count()) { await disc.click({ timeout: T }); await expect(page.locator(`${PANEL} [data-qp-step]`)).toHaveCount(0, { timeout: T }); }
  }
  if (await page.locator(PANEL).count()) await cardShown(page);
}
/** Close the panel, and wait for it to be gone. */
export async function closePanel(page: Page) {
  await page.locator(`${PANEL} [data-qcv="open-close"]`).click({ timeout: T });
  await expect(page.locator(PANEL)).toHaveCount(0, { timeout: T });
  await page.waitForFunction(() => !document.body.classList.contains("spanel-open") && !document.querySelector('[data-side-scrim][data-on="true"]'), null, { timeout: T });
}
/** Press a list row, and wait for the panel to be THAT query's. */
export async function openRowById(page: Page, rowSel: string, id: string) {
  await page.waitForFunction(() => !document.querySelector('[data-side-scrim][data-on="true"]'), null, { timeout: T });
  const r = page.locator(`${rowSel}[data-qid="${id}"]`).first();
  await expect(r, `no row for ${id}`).toBeVisible({ timeout: T });
  await r.evaluate((e) => e.scrollIntoView({ block: "center" }));
  await r.locator('[data-qcv="row-agent"], .qcw-agt').first().click({ timeout: T });
  await expect(page.locator(`${PANEL}[data-qp-id="${id}"]`), `the panel did not become ${id}'s`).toBeVisible({ timeout: T });
  await atRest(page);
}
