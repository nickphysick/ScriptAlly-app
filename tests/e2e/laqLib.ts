/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Log a query v1 — the shared opener for the measurements: signs in (the harness reads its own password), opens the
 * Query Centre at 1440×860 and presses "+ Log a query".
 */
import type { Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { ensureSignedIn } from "./measure";

export const OUT = process.env.LAQ_OUT ?? "reports/log-a-query-v1-1/shots";

export async function openLog(page: Page): Promise<void> {
  page.on("console", (m) => { if (m.text().startsWith("[laq-timing]")) console.log(m.text()); });
  if (process.env.LAQ_CONSOLE) page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") console.log(`[page ${m.type()}] ${m.text().slice(0, 300)}`); });
  page.on("pageerror", (e) => console.log(`[pageerror] ${e.message.slice(0, 300)}`));
  await page.setViewportSize({ width: 1440, height: 860 });
  await page.goto("/queries");
  await ensureSignedIn(page);
  await page.goto("/queries");
  const btn = page.getByRole("button", { name: /^\+?\s*Log a query$/ }).locator("visible=true").first();
  await btn.waitFor({ state: "visible", timeout: 60_000 });
  await btn.click();
  await page.locator('[data-qls="root"]').waitFor({ state: "visible", timeout: 20_000 });
  await page.waitForTimeout(400);
}
/* the panel itself: `contains(@class,'spanel')` also matched its inner `.spanel-own`, so v1's shots were the inner box */
export const panel = (page: Page) => page.locator('[data-qls="root"]').locator("xpath=ancestor::*[contains(concat(' ',normalize-space(@class),' '),' spanel ')][1]");
export async function shot(page: Page, name: string): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  await page.waitForTimeout(450);
  await panel(page).screenshot({ path: `${OUT}/${name}.png` });
}


/**
 * The first "Ready to query" row, once the list has stopped changing: the app's local Firestore cache can still be
 * catching up when the panel opens, and an agent read as ready may move into the "already querying" fold a moment later.
 * Returns its id (stable for a full second).
 */
export async function settledReady(page: Page): Promise<string> {
  let last = "", since = Date.now();
  for (;;) {
    const id = (await page.locator('[data-qls="agent"][data-group="ready"]').first().getAttribute("data-id").catch(() => null)) ?? "";
    if (id !== last) { last = id; since = Date.now(); }
    else if (id && Date.now() - since > 1000) return id;
    await page.waitForTimeout(150);
  }
}
