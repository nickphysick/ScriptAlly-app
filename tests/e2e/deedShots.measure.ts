/** Screenshots for the deed round. No backticks inside any evaluate template. */
import { test } from "@playwright/test";
import { ensureSignedIn } from "./measure";
import { mkdirSync } from "node:fs";
const VIS = `(e) => { if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; }`;
const OPEN = (kind: string) => `(() => {
  const vis = ${VIS};
  const row = [...document.querySelectorAll(".tlc .row")].filter(vis)
    .find((r) => ((r.querySelector(".pill") || {}).textContent || "").trim() === ${JSON.stringify(kind)});
  if (!row) return false; row.click(); return true;
})()`;
const OPEN_BULK = `(() => {
  const vis = ${VIS};
  const row = [...document.querySelectorAll(".tlc .row")].filter(vis)
    .find((r) => /imported queries are missing their materials/.test((r.querySelector(".r-meta") || {}).textContent || ""));
  if (!row) return false; row.click(); return true;
})()`;
const ANSWER = `(() => {
  const vis = ${VIS};
  const n = [...document.querySelectorAll(".tpn .sect.next")].filter(vis)[0];
  const b = n && n.querySelector(".seg button, .upill");
  if (b) b.click();
  return !!b;
})()`;

test("deed shots", async ({ page }) => {
  mkdirSync("reports/deed-round", { recursive: true });
  await ensureSignedIn(page);
  for (const w of [1440, 1920]) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.goto("/todo"); await page.waitForTimeout(6500);
    if (await page.evaluate(OPEN("Send"))) {
      await page.waitForTimeout(1300);
      await page.screenshot({ path: `reports/deed-round/send-empty-${w}.png` });
      console.log(`shot send-empty @${w}`);
      for (let i = 0; i < 2; i++) { await page.evaluate(ANSWER); await page.waitForTimeout(600); }
      await page.screenshot({ path: `reports/deed-round/send-partial-${w}.png` });
      console.log(`shot send-partial @${w}`);
      for (let i = 0; i < 4; i++) { await page.evaluate(ANSWER); await page.waitForTimeout(500); }
      await page.screenshot({ path: `reports/deed-round/send-complete-${w}.png` });
      console.log(`shot send-complete @${w}`);
    }
    for (const [name, opener] of [["note", OPEN("Note")], ["close", OPEN("Close")], ["bulk", OPEN_BULK]] as const) {
      await page.goto("/todo"); await page.waitForTimeout(6000);
      if (!(await page.evaluate(opener))) { console.log(`skip ${name} @${w} — no such row`); continue; }
      await page.waitForTimeout(1400);
      await page.screenshot({ path: `reports/deed-round/${name}-${w}.png` });
      console.log(`shot ${name} @${w}`);
    }
  }
});
