/**
 * Follow-up 2 (shell menus + Settings) — the report's screenshots. No assertions; the locks are
 * shellMenus.measure.ts.   SA_E2E_BASE_URL=… MS_SHOTS=<label> npx playwright test msShots
 */
import { test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { openRoute } from "./measure";

const OUT = `reports/ink-shell-v1/menus/${process.env.MS_SHOTS ?? "now"}`;

test("ms shots", async ({ page }) => {
  test.setTimeout(240_000);
  mkdirSync(OUT, { recursive: true });
  const vp = { width: 1440, height: 900 };
  await openRoute(page, "/queries", vp);
  /* 1 · search as it opens */
  await page.locator('[data-probe="search"]').click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/1-search.png` });
  /* 2 · after typing */
  await page.keyboard.type("marsh");
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/2-search-typed.png` });
  await page.keyboard.press("Escape"); await page.waitForTimeout(300);
  /* 2 · help */
  await page.locator('[data-shell="help"]').click(); await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/2-help.png` });
  await page.keyboard.press("Escape"); await page.waitForTimeout(300);
  /* 2 · your menu */
  await page.locator(".ws-uacct").click(); await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/2-your-menu.png` });
  await page.keyboard.press("Escape"); await page.waitForTimeout(300);
  /* 5 · the arrow */
  await page.locator(".ws-cap--bar .ws-capr").click(); await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/5-arrow.png` });
  await page.keyboard.press("Escape"); await page.waitForTimeout(300);
  /* the selector's menu and the +N menu */
  await page.locator("#ws-sidebar [data-shell='switcher'] .ws-ms-btn").click(); await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/x-selector.png` });
  await page.keyboard.press("Escape"); await page.waitForTimeout(300);
  /* 3, 4 · settings */
  await openRoute(page, "/account/profile", vp);
  await page.screenshot({ path: `${OUT}/3-settings-profile.png` });
  await openRoute(page, "/account/notifications", vp);
  await page.screenshot({ path: `${OUT}/4-settings-notifications.png` });
  await openRoute(page, "/account/profile", { width: 1280, height: 800 });
  await page.screenshot({ path: `${OUT}/3-settings-profile-1280.png` });
});
