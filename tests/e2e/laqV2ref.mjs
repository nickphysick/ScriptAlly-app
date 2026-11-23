/**
 * Log a query v2 — Step 0.4: a walk of the design ref itself (design-refs/log-a-query-v2/log-a-query-v2.html) at 1480 wide,
 * through every route the switches offer (packages and named / named only / nothing saved), each screen of the panel saved
 * to reports/log-a-query-v2/ref/<switch>-<nn>-<what>.png. Reads a local file only: no app, no emulator, no network.
 *
 *   node scripts/heavy-slot.mjs run -- node tests/e2e/laqV2ref.mjs
 */
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const REF = `file://${resolve("design-refs/log-a-query-v2/log-a-query-v2.html")}`;
const OUT = "reports/log-a-query-v2/ref";
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1480, height: 1100 } });
await page.goto(REF);
await page.waitForTimeout(800);
let n = 0;
const shot = async (sw, what) => { n++; await page.waitForTimeout(450); await page.locator(".panel").screenshot({ path: `${OUT}/${sw}-${String(n).padStart(2, "0")}-${what}.png` }); };
const click = async (sel) => { await page.locator(sel).first().click(); await page.waitForTimeout(150); };

for (const sw of ["all", "named", "none"]) {
  n = 0;
  await click(`[data-saved="${sw}"]`);
  await shot(sw, "agent-step");
  await page.locator("#find").fill("Imogen Grey"); await shot(sw, "agent-not-found");
  await click('[data-add="1"]'); await shot(sw, "add-agent");
  await click('[data-act="add-back"]'); await page.locator("#find").fill("");
  await click('[data-agent="hv"]'); await shot(sw, "sent-step");
  await click('[data-act="notsent"]'); await shot(sw, "not-sent");
  await click('[data-act="sent-after-all"]');
  await click('[data-when="today"]'); await shot(sw, "materials-harriet");
  if (sw === "all") { await click('[data-mat="pkg"]'); await shot(sw, "packages"); await click('[data-mat="pcs"]'); }
  await shot(sw, "pieces");
  await click('[data-gen="sample"]'); await shot(sw, "pieces-sample-open");
  await click('[data-act="carry"]'); await click('[data-how]'); await shot(sw, "nudge-from-card");
  await click('[data-act="nudge-ok"]'); await shot(sw, "review");
  await click("qc-o .clip"); await shot(sw, "review-paperclip");
  await page.keyboard.press("Escape");
  await click('[data-act="log"]'); await shot(sw, "logged");
  await click('[data-act="another"]');
  await click('[data-agent="cr"]'); await click('[data-when="earlier"]'); await click('[data-cal="-1"]'); await click('[data-cal="-1"]');
  await page.locator("[data-day]:not([disabled])").nth(2).click(); await shot(sw, "catching-up-callum");
  if (sw === "all") await click('[data-mat="pcs"]');
  await click('[data-act="carry"]'); await click('[data-how]'); await shot(sw, "nudge-unknown");
  await click('[data-act="nudge-ok"]'); await shot(sw, "review-no-date");
  await click('[data-act="log-more"]'); await shot(sw, "after-log-and-start-another");
  await click('[data-agent="ns"]'); await page.keyboard.press("Escape"); await shot(sw, "leave-check");
  await click('[data-act="keep"]');
  await click("#restart");
}
await browser.close();
console.log("ref walk: done");
