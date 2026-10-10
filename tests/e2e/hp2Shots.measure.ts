/**
 * Header panel v2 — the report's shots: the top of every workspace route at 1512 and 1280, /queries and /agents beside
 * their references and at 390. Not a lock. `HP2_SHOTS=1` to run; `HP2_ROUTES=/a,/b` narrows it.
 */
import { test } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { DIR, SIZES, WORKSPACE, open, readTop } from "./hp2Lib";

test.skip(!process.env.HP2_SHOTS, "shots only on request");
test("HP2 shots", async ({ page, browser }) => {
  await page.addInitScript(() => { try { for (const k of ["contacts", "queries", "manuscripts"]) localStorage.setItem(`sa.guide.${k}`, "1"); } catch { /* */ } });
  const out = `${DIR}/shots`; mkdirSync(out, { recursive: true });
  const routes = (process.env.HP2_ROUTES ?? WORKSPACE.join(",")).split(",");
  const pairs: [string, string, string][] = [];
  for (const vp of SIZES) for (const route of routes) {
    await open(page, route, vp);
    const p = `${out}/top${route.replace(/\//g, "-")}-${vp.width}.png`; await page.screenshot({ path: p });
    const r = await readTop(page);
    console.log(`[top] ${route} @${vp.width}: panel ${r.isPanel} sheet→bottom ${r.hd && r.win ? (r.hd.b - r.win.t).toFixed(1) : "?"} h ${r.hd?.h.toFixed(1)} top+${r.hd && r.win ? (r.hd.t - r.win.t).toFixed(1) : "?"} below ${r.belowTop !== null && r.hd ? (r.belowTop - r.hd.b).toFixed(1) : "?"} tab ${r.tabBg} sheet ${r.sheet} art ${r.art ? `${r.art.w.toFixed(0)}×${r.art.h.toFixed(0)}` : "none"} ovf ${r.overflowX}`);
    const ref = route === "/queries" ? "qc" : route === "/agents" ? "cl" : null;
    if (ref) pairs.push([`${ref}-${vp.width}`, p, `design-refs/header-panel-v2/ref-${ref}-${vp.width}@2x.png`]);
  }
  for (const route of ["/queries", "/agents"].filter((r) => routes.includes(r))) {
    /* the shared opener cannot open a phone width (its first shell match is the hidden sidebar): size, then reload */
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(route); await page.waitForTimeout(3500);
    await page.screenshot({ path: `${out}/top${route.replace(/\//g, "-")}-390.png` });
  }
  const pg = await browser.newPage({ viewport: { width: 1700, height: 620 } });
  for (const [k, p, ref] of pairs) {
    if (!existsSync(ref)) continue;
    const a = readFileSync(p).toString("base64"), r = readFileSync(ref).toString("base64");
    await pg.setContent(`<body style="margin:0;background:#222;font:13px monospace;color:#ddd"><div style="display:flex;gap:12px;padding:12px"><div><div>branch · ${k}</div><img style="width:830px;display:block" src="data:image/png;base64,${a}"></div><div><div>reference</div><img style="width:830px;display:block" src="data:image/png;base64,${r}"></div></div></body>`);
    await pg.waitForTimeout(300);
    writeFileSync(`${out}/compare-${k}.png`, await pg.screenshot({ fullPage: true }));
  }
  await pg.close();
});
