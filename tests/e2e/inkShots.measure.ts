/**
 * Ink shell v1 — the report's screenshots (no assertions; the locks are inkShell.measure.ts).
 *
 *   SA_E2E_BASE_URL=http://127.0.0.1:<port> INK_SHOTS=<label> npx playwright test inkShots
 *
 * Routes × widths × expanded/collapsed, written to reports/ink-shell-v1/shots/<label>/.
 */
import { test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { openRoute } from "./measure";

const LABEL = process.env.INK_SHOTS ?? "now";
const OUT = `reports/ink-shell-v1/shots/${LABEL}`;
const ROUTES: [string, string][] = [
  ["qc", "/queries"], ["contacts", "/agents"], ["todo", "/todo"], ["comps", "/manuscripts/comps"], ["dash", "/dashboard"],
];
const WIDTHS = (process.env.INK_WIDTHS ?? "1440,1710").split(",").map(Number);
const ONLY = process.env.INK_ROUTES?.split(",");

test("ink shell shots", async ({ page }) => {
  mkdirSync(OUT, { recursive: true });
  for (const w of WIDTHS) {
    for (const [name, route] of ROUTES) {
      if (ONLY && !ONLY.includes(name)) continue;
      for (const shut of [false, true]) {
        await page.addInitScript((v) => { try { localStorage.setItem("scriptally:sidebar-collapsed", v ? "1" : "0"); } catch { /* */ } }, shut);
        await openRoute(page, route, { width: w, height: 900 });
        await page.screenshot({ path: `${OUT}/${name}-${w}-${shut ? "collapsed" : "expanded"}.png` });
        if (process.env.INK_ONE) break;
      }
    }
  }
});

test("ink shell shots — the overflow and a toast", async ({ page }) => {
  mkdirSync(OUT, { recursive: true });
  /* "lots of pages": five hypothetical pages injected into Materials (the dev-only aid), "+N" open */
  await page.addInitScript(() => { (window as unknown as { __SA_INK_TABS: number }).__SA_INK_TABS = 5; });
  for (const w of WIDTHS) {
    await openRoute(page, "/manuscripts", { width: w, height: 900 });
    const more = page.locator(".ws-ftmore");
    if (await more.count()) await more.click();
    await page.screenshot({ path: `${OUT}/overflow-${w}.png` });
  }
});

test("ink shell shots — a toast", async ({ page }) => {
  mkdirSync(OUT, { recursive: true });
  for (const w of WIDTHS) {
    await openRoute(page, "/queries", { width: w, height: 900 });
    const original = await page.evaluate(() => localStorage.getItem("scriptally_active_manuscript_id"));
    await page.locator("#ws-sidebar [data-shell='switcher'] .ws-ms-btn").click();
    const other = page.locator(".ws-ms-menu--port [role='menuitemradio'][aria-checked='false']").first();
    if (await other.count()) {
      await other.click();
      await page.locator(".sa-toast").waitFor();
      await page.screenshot({ path: `${OUT}/toast-${w}.png` });
    }
    if (original) await page.evaluate((o) => localStorage.setItem("scriptally_active_manuscript_id", o), original);
  }
});

