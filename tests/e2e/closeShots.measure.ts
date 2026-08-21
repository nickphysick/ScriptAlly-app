/** The Close journey, rendered. No backticks inside any evaluate template. */
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

test("close shots", async ({ page }) => {
  mkdirSync("reports/reminder-round", { recursive: true });
  await ensureSignedIn(page);
  for (const w of [1440, 1920]) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.goto("/todo"); await page.waitForTimeout(6500);
    if (!(await page.evaluate(OPEN("Close")))) { console.log(`skip close @${w}`); continue; }
    await page.waitForTimeout(1400);
    await page.screenshot({ path: `reports/reminder-round/close-empty-${w}.png` });
    console.log(`shot close-empty @${w}`);
    /* answer its one requirement */
    await page.evaluate(`(() => {
      const vis = ${VIS};
      const n = [...document.querySelectorAll(".tpn .sect.next")].filter(vis)[0];
      const b = n && n.querySelector(".seg button");
      if (b) b.click();
    })()`);
    await page.waitForTimeout(700);
    await page.screenshot({ path: `reports/reminder-round/close-complete-${w}.png` });
    console.log(`shot close-complete @${w}`);
  }
  /* and the chase the reminder raised */
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/todo"); await page.waitForTimeout(6000);
  if (await page.evaluate(OPEN("Chase"))) {
    await page.waitForTimeout(1300);
    await page.screenshot({ path: "reports/reminder-round/chase-1440.png" });
    console.log("shot chase @1440");
  }
});
