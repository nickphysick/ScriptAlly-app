/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Workspace headers v1 — the report's screenshots: each of the seven pages at 1440 × 900 and 1717 × 1000, at rest and
 * at 600px scrolled, and the Query Centre's header. Read-only (it writes nothing to the account).
 *   ALLOW_LIVE_FIRESTORE=1 SA_E2E_BASE_URL=dev npx playwright test tests/e2e/wsHeadersShots.measure.ts --project=measure --workers=1
 * `WSH_SHOT_TAG` names the set (default "dev"). The ref's own PNGs sit beside them in design-refs/workspace-headers-v1/.
 */
import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { openRoute } from "./measure";

test.setTimeout(600_000);
const TAG = process.env.WSH_SHOT_TAG ?? "dev";
const OUT = `reports/workspace-headers-v1/shots/${TAG}`;
mkdirSync(OUT, { recursive: true });
const SIZES = [{ width: 1440, height: 900 }, { width: 1717, height: 1000 }] as const;
const PAGES: { key: string; route: string; root: string; ms?: string; init?: string }[] = [
  { key: "responses", route: "/queries/responses", root: "[data-rsp='page']", ms: "cv25-ms" },
  { key: "analytics", route: "/queries/analytics", root: "[data-a17='page']", ms: "cv25-ms" },
  { key: "discover", route: "/agents/discover", root: "[data-dv1='page']", ms: "cv25-ms", init: "live" },
  { key: "comps", route: "/manuscripts/comps", root: "[data-cpv='page']", ms: "cv25-ms" },
  { key: "versions", route: "/manuscripts/versions", root: "[data-vv2='page']", ms: "msv12-ms" },
  { key: "manuscripts", route: "/manuscripts", root: "[data-msv12='page']", ms: "cv25-ms" },
  { key: "corkboard", route: "/todo/corkboard", root: "[data-cb2='page']" },
];

async function prep(page: Page, ms?: string, face?: string) {
  await page.addInitScript(([m, f]) => {
    try { if (m) localStorage.setItem("scriptally_active_manuscript_id", m); localStorage.setItem("sa.guide.queries", "1"); localStorage.setItem("sa.guide.queries-explainer", "1"); } catch { /* private */ }
    if (f) (window as unknown as Record<string, unknown>).__SA_DV_STATE = f;
  }, [ms ?? "", face ?? ""] as const);
}
async function shoot(page: Page, root: string, name: string) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(900);
  await page.mouse.move(2, 2);
  await page.screenshot({ path: `${OUT}/${name}.png` });
}
async function scroll(page: Page, root: string, y: number) {
  await page.evaluate(([rs, v]) => {
    const r = [...document.querySelectorAll<HTMLElement>(rs as string)].find((e) => e.getBoundingClientRect().width > 0)!;
    const sc = r.closest<HTMLElement>(".wpg-scroll")!;
    sc.scrollTop = v as number;
  }, [root, y] as const);
  await page.waitForTimeout(900);
}

for (const vp of SIZES) {
  test(`the Query Centre's header @${vp.width}`, async ({ page }) => {
    await prep(page, "cv25-ms");
    await openRoute(page, "/queries", vp);
    const hd = page.locator(".qc151.qc153[data-qc151='page'] [data-qc1531='header']").first();
    await expect(hd).toBeVisible({ timeout: 60_000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(900);
    await hd.screenshot({ path: `${OUT}/queries-header-${vp.width}.png` });
  });
  for (const p of PAGES) {
    test(`${p.key} @${vp.width}`, async ({ page }) => {
      await prep(page, p.ms, p.init);
      await openRoute(page, p.route, vp);
      await expect(page.locator(`${p.root}:visible [data-wsnh='header']`).first()).toBeVisible({ timeout: 60_000 });
      await shoot(page, p.root, `${p.key}-rest-${vp.width}`);
      await scroll(page, p.root, 600);
      await shoot(page, p.root, `${p.key}-collapsed-${vp.width}`);
    });
  }
}
