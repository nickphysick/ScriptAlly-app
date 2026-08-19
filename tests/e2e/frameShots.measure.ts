/** Phase 6 — every reachable journey, three viewports. */
import { test } from "@playwright/test";
import { ensureSignedIn } from "./measure";

const J: [string, string, boolean][] = [
  ["close",   "^Log the close",                          true],
  ["send",    "^Send your full",                         true],
  ["partial", "^Send your partial",                      true],
  ["offer",   "^Answer the offer",                       true],
  ["rr",      "^Send your revision",                     true],
  ["note",    "^Nudge ",                                 true],
  ["bulk",    "queries have no record of what you sent", false],
];

test("frame shots", async ({ page }) => {
  await ensureSignedIn(page);
  for (const vp of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(vp);
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
      if (!ok) { console.log("no card: " + key + " @" + vp.width); continue; }
      await page.waitForTimeout(1300);
      if (enters) {
        await page.evaluate(() => {
          const b = [...document.querySelectorAll("[class*='tdk-'] button")]
            .find((x) => /^(Record|Action|Close|Send|Mark|Log|Complete|Answer)/.test((x.textContent ?? "").trim()));
          (b as HTMLElement | undefined)?.click();
        });
        await page.waitForTimeout(1300);
      }
      await page.screenshot({ path: `run-artifacts/frame-${key}-${vp.width}.png` });
    }
  }
});
