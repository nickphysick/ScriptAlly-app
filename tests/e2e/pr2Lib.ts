/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PR2 — phone round two v1's harness helpers. One sign-in per engine (Firebase keeps its session in IndexedDB, which
 * storageState carries only with `indexedDB: true`), the phone open with phone fixes' splash-stall retry, an in-app
 * navigation that waits for the page to settle, and the named breaks for the red-before proofs (`PR2_MUTATE`).
 */
import { test, type Page } from "@playwright/test";
import { appendFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { openPhone } from "./pa2Lib";
import { engine } from "./touch";

export const MUTATE = process.env.PR2_MUTATE ?? "";
const READINGS = process.env.PR2_READINGS ?? "";
export const DIR = "reports/phone-round-two-v1";
export const proj = () => test.info().project.name;
export const record = (lock: string, data: unknown) => {
  if (READINGS) appendFileSync(READINGS, JSON.stringify({ lock, proj: proj(), mutate: MUTATE || null, data }) + "\n");
};

/** CSS breaks: each puts back the fault its lock guards against. Behaviour breaks are read by the app's own code paths
 *  only where a lock can see them from CSS alone; the rest are applied in the page by the lock itself. */
export const BREAK: Record<string, string> = {
  R3: "@media (max-width: 767.98px) { .pa-qct i.on.you { background: var(--pa-navy) !important; } }",
  R14: "@media (min-width: 768px) { .ws-pagebar { outline: 3px solid red !important; } }",
};

export const authFile = (engineName: string) =>
  resolve(process.cwd(), `tests/e2e/.auth/pf1-${engineName}-${new URL(process.env.SA_E2E_BASE_URL ?? "http://x").port || "443"}.json`);

export async function phone(page: Page, path: string) {
  const vp = page.viewportSize()!;
  try { await openPhone(page, path, vp); }
  catch (e) {
    const splash = await page.evaluate(() => !document.querySelector(".ws-work, .ws-panel, #au-email") && /QueryHawk/.test(document.body.innerText)).catch(() => false);
    if (!splash) throw e;
    record("RETRY", { why: "splash stall", path });
    await page.reload(); await openPhone(page, path, vp);
  }
  const f = authFile(engine(page));
  if (!existsSync(f)) await page.context().storageState({ path: f, indexedDB: true });
  if (BREAK[MUTATE]) await page.addStyleTag({ content: BREAK[MUTATE] });
  await page.waitForTimeout(400);
}

/** In-app navigation (history + popstate, as a tapped link does), then wait for the stage to stop growing. */
export async function go(page: Page, path: string) {
  await page.evaluate((p) => { history.pushState({}, "", p); dispatchEvent(new PopStateEvent("popstate")); }, path);
  await page.waitForSelector("#app-stage-scroll", { timeout: 20_000 });
  let last = -1;
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(250);
    const h = await page.evaluate(() => document.getElementById("app-stage-scroll")?.scrollHeight ?? -1);
    if (h === last && h > 0) break;
    last = h;
  }
  await page.evaluate(() => { const st = document.getElementById("app-stage-scroll"); if (st) st.scrollTop = 0; });
  if (BREAK[MUTATE]) await page.addStyleTag({ content: BREAK[MUTATE] });
  await page.waitForTimeout(300);
}

export async function snap(page: Page, name: string) {
  const f = resolve(process.cwd(), DIR, process.env.PR2_SHOTS ?? "after", `${name}-${proj()}.png`);
  mkdirSync(dirname(f), { recursive: true });
  await page.screenshot({ path: f });
}
