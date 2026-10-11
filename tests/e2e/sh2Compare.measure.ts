/**
 * App shell v2 — the report's shots: the branch beside the reference PNG (Query Centre top, band, banner) at both
 * widths, and the top of every route. Not a lock. `SH2_SHOTS=1` to run.
 */
import { test } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { BANDS, BANNERS, DIR, ROUTES, SIZES, bring, open, prepare } from "./sh2Lib";

test.skip(!process.env.SH2_SHOTS, "shots only on request");
test("SH2 shots · every route's top, each band and banner, and the Query Centre beside its references", async ({ page, browser }) => {
  await prepare(page);
  const out = `${DIR}/shots`; mkdirSync(out, { recursive: true });
  const mine: Record<string, string> = {};
  for (const vp of SIZES) {
    for (const route of ROUTES) { await open(page, route, vp); const p = `${out}/top${route.replace(/\//g, "-")}-${vp.width}.png`; await page.screenshot({ path: p }); if (route === "/queries") mine[`shell-top-${vp.width}`] = p; }
    for (const b of BANDS) { await open(page, b.route, vp); await bring(page, b.sel, 120); const p = `${out}/band${b.route.replace(/\//g, "-")}-${vp.width}.png`; await page.screenshot({ path: p }); if (b.route === "/queries") mine[`band-${vp.width}`] = p; }
    for (const b of BANNERS) { await open(page, b.route, vp); await bring(page, b.sel, 180); const p = `${out}/banner${b.route.replace(/\//g, "-")}-${vp.width}.png`; await page.screenshot({ path: p }); if (b.route === "/queries") mine[`banner-${vp.width}`] = p; }
  }
  const pg = await browser.newPage({ viewport: { width: 1700, height: 620 } });
  for (const [k, p] of Object.entries(mine)) {
    const a = readFileSync(p).toString("base64"), r = readFileSync(`design-refs/shell-v2/ref-${k}@2x.png`).toString("base64");
    await pg.setContent(`<body style="margin:0;background:#222;font:13px monospace;color:#ddd"><div style="display:flex;gap:12px;padding:12px"><div><div>branch · ${k}</div><img style="width:830px;display:block" src="data:image/png;base64,${a}"></div><div><div>reference</div><img style="width:830px;display:block" src="data:image/png;base64,${r}"></div></div></body>`);
    await pg.waitForTimeout(300);
    writeFileSync(`${out}/compare-${k}.png`, await pg.screenshot({ fullPage: true }));
  }
  await pg.close();
});
