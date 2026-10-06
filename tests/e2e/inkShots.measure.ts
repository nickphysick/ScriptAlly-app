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
