/** Screenshots for the steer round. Proves nothing; SHOWS. */
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

test("steer shots", async ({ page }) => {
  mkdirSync("reports/steer-round", { recursive: true });
  await ensureSignedIn(page);
  for (const w of [1440, 1920]) {
    await page.setViewportSize({ width: w, height: 900 });

    /* Send at three states: nothing answered, partly answered, complete */
    await page.goto("/todo"); await page.waitForTimeout(6500);
    if (await page.evaluate(OPEN("Send"))) {
      await page.waitForTimeout(1300);
      await page.screenshot({ path: `reports/steer-round/send-zero-${w}.png` });
      console.log(`shot send-zero @${w}`);
      /* answer two: the steered section, then the next */
      for (let i = 0; i < 2; i++) {
        await page.evaluate(`(() => {
          const vis = ${VIS};
          const n = [...document.querySelectorAll(".tpn .sect.next")].filter(vis)[0];
          const b = n && n.querySelector(".seg button, .upill");
          if (b) b.click();
        })()`);
        await page.waitForTimeout(600);
      }
      await page.screenshot({ path: `reports/steer-round/send-partial-${w}.png` });
      console.log(`shot send-partial @${w}`);
      /* answer the rest */
      for (let i = 0; i < 4; i++) {
        await page.evaluate(`(() => {
          const vis = ${VIS};
          const n = [...document.querySelectorAll(".tpn .sect.next")].filter(vis)[0];
          const b = n && n.querySelector(".seg button, .upill");
          if (b) b.click();
        })()`);
        await page.waitForTimeout(500);
      }
      await page.screenshot({ path: `reports/steer-round/send-complete-${w}.png` });
      console.log(`shot send-complete @${w}`);
      /* and the missing line, from a fresh card */
      await page.goto("/todo"); await page.waitForTimeout(6000);
      await page.evaluate(OPEN("Send")); await page.waitForTimeout(1300);
      await page.evaluate(`(() => { document.querySelectorAll(".tpn .actbar .ab.go")[0].click(); })()`);
      await page.waitForTimeout(1200);
      await page.screenshot({ path: `reports/steer-round/send-missing-${w}.png` });
      console.log(`shot send-missing @${w}`);
    }

    for (const [name, opener] of [["note", OPEN("Note")], ["close", OPEN("Close")], ["bulk", OPEN_BULK]] as const) {
      await page.goto("/todo"); await page.waitForTimeout(6000);
      if (!(await page.evaluate(opener))) { console.log(`skip ${name} @${w} — no such row`); continue; }
      await page.waitForTimeout(1400);
      await page.screenshot({ path: `reports/steer-round/${name}-${w}.png` });
      console.log(`shot ${name} @${w}`);
    }
  }
});
