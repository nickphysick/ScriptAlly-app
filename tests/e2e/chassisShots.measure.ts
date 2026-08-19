/** Screenshots of every reachable journey, both viewports — evidence for a human. */
import { test } from "@playwright/test";
import { ensureSignedIn } from "./measure";

const J: [string, string, boolean][] = [
  ["close", "^Log the close", true], ["send", "^Send your full", true],
  ["decide", "^Answer the offer", true], ["note", "^Nudge ", false],
  ["bulk", "queries have no record of what you sent", false],
];

test("chassis shots", async ({ page }) => {
  await ensureSignedIn(page);
  for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(vp);
    for (const [key, rx, enters] of J) {
      await page.goto("/todo");
      await page.waitForTimeout(6500);
      const ok = await page.evaluate((src) => {
        const r = new RegExp(src);
        const vis = (e: Element) => (e as HTMLElement).offsetParent !== null;
        const row = [...document.querySelectorAll(".tdg-row")].filter(vis)
          .find((x) => r.test((x.querySelector(".tdg-t")?.textContent ?? "").trim()));
        if (row) (row as HTMLElement).click();
        return !!row;
      }, rx);
      if (!ok) continue;
      await page.waitForTimeout(1400);
      if (enters) {
        await page.evaluate(() => {
          const b = [...document.querySelectorAll("[class*='tdk-'] button")]
            .find((x) => /^(Record|Action|Close|Send|Mark|Log)/.test((x.textContent ?? "").trim()));
          (b as HTMLElement | undefined)?.click();
        });
        await page.waitForTimeout(1400);
      }
      await page.screenshot({ path: `run-artifacts/chassis-${key}-${vp.width}.png` });
    }
  }
});
