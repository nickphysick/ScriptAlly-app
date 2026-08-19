/** Contract shots — every reachable journey at 1280 / 1440 / 1920 / 390. */
import { test } from "@playwright/test";
import { ensureSignedIn } from "./measure";

const J: [string, string, boolean][] = [
  ["send",  "^Send your full",                         true],
  ["close", "^Log the close",                          true],
  ["offer", "^Answer the offer",                       true],
  ["rr",    "^Send your revision",                     true],
  ["note",  "^Nudge ",                                 false],
  ["bulk",  "queries have no record of what you sent", false],
];

test("contract shots", async ({ page }) => {
  await ensureSignedIn(page);
  for (const w of [1280, 1440, 1920, 390]) {
    await page.setViewportSize({ width: w, height: w === 390 ? 844 : 900 });
    for (const [key, rx, enters] of J) {
      await page.goto("/todo");
      await page.waitForTimeout(6000);
      const ok = await page.evaluate((src) => {
        const r = new RegExp(src);
        const vis = (e: Element) => (e as HTMLElement).offsetParent !== null;
        const row = [...document.querySelectorAll(".tdg-row")].filter(vis)
          .find((x) => r.test((x.querySelector(".tdg-t")?.textContent ?? "").trim()));
        if (row) (row as HTMLElement).click();
        return !!row;
      }, rx);
      if (!ok) continue;
      await page.waitForTimeout(1300);
      if (enters) {
        await page.evaluate(() => {
          const b = [...document.querySelectorAll("[class*='tdk-'] button")]
            .find((x) => /^(Record|Action|Close|Send|Mark|Log)/.test((x.textContent ?? "").trim()));
          (b as HTMLElement | undefined)?.click();
        });
        await page.waitForTimeout(1300);
      }
      await page.screenshot({ path: `run-artifacts/ct-${key}-${w}.png` });
    }
  }
});
