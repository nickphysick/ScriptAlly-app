import { test } from "@playwright/test";
import { openRoute, liftMotionSuppression } from "./measure";
import { resolve } from "node:path";
test.setTimeout(300_000);

const count = (page: import("@playwright/test").Page) => page.evaluate(() => {
  const root = document.querySelector(".pkgw") as HTMLElement | null;
  const q = (s: string) => root ? root.querySelectorAll(s).length : -1;
  const txt = (root?.innerText ?? "");
  return {
    teachState: q(".pkgt"),
    heroBand: q(".pkgw-hero, .pkgb-hero, [class*='herob']"),
    /* the hero's own copy is the honest test — class names may differ */
    heroCopy: /Fed up of guessing/.test(txt),
    ghostCards: q(".pkgb-ghostpkg, .pkgb-pkgghost"),
    ghostCopy: (txt.match(/Build another package/g) ?? []).length,
    realCards: q(".pkgb-pkgcard"),
    bandHeads: q(".pkgb-bandhead"),
    /* Phase 0 — the page's own selector must be gone, and the sidebar's must still be there. */
    pageSelector: q(".pkgw-mschip"),
    newPkgCta: q(".pkgb-newpkg"),
    sidebarScope: document.querySelectorAll(".ws-msname, .sv2-scope, [aria-label='Previous manuscript']").length,
  };
});

for (const [ms, label] of [["seed-ms-1", "workspace"], ["thin-ms", "teach"]] as const) {
  test(`Part A — element counts in ${label} state`, async ({ page }) => {
    await openRoute(page, "/manuscripts/packages", { width: 1440, height: 1000 });
    await page.evaluate((m) => localStorage.setItem("scriptally_active_manuscript_id", m), ms);
    await page.reload({ waitUntil: "domcontentloaded" });
    await liftMotionSuppression(page);
    await page.waitForTimeout(2600);
    const c = await count(page);
    console.log(`${label.padEnd(10)} ${JSON.stringify(c)}`);
    await page.screenshot({ path: resolve(process.cwd(), `reports/pkgband/before-${label}.png`) });
  });
}
