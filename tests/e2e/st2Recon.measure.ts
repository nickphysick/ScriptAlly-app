/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Shell tabs v2 — Step 0 recon probe (reads only; writes JSON + shots to ST2_OUT). Not a lock.
 * Run: `npm run e2e:emu -- tests/e2e/st2Recon.measure.ts --project=measure --workers=1`
 */
import { test, type Page } from "@playwright/test";
import * as fs from "node:fs";
import { openRoute } from "./measure";

const OUT = process.env.ST2_OUT ?? "/tmp/st2";
const ROUTES = ["/queries", "/materials/letters", "/dashboard", "/account", "/queries/packages", "/todo", "/agents", "/manuscripts"];

async function mode(page: Page, m: "rail" | "pinned") {
  await page.addInitScript((v) => {
    try {
      localStorage.setItem("scriptally:sidebar-collapsed", v === "rail" ? "1" : "0");
      localStorage.setItem("scriptally:sidebar-pinned", v === "pinned" ? "1" : "0");
    } catch { /* first visit */ }
  }, m);
}

function read(page: Page) {
  return page.evaluate(() => {
    const vis = (e: Element | null) => !!e && (e as HTMLElement).getBoundingClientRect().width > 0;
    const pick = (sel: string) => [...document.querySelectorAll<HTMLElement>(sel)].find(vis) ?? null;
    const box = (e: Element | null) => { if (!e) return null; const r = e.getBoundingClientRect(); return { x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) }; };
    const cs = (e: Element | null, ...p: string[]) => { if (!e) return null; const s = getComputedStyle(e); return Object.fromEntries(p.map((k) => [k, s.getPropertyValue(k)])); };
    const panel = pick(".ws-panel"), main = pick(".ws-main"), bar = pick(".ws-pagebar"), win = pick(".ws-window"), lip = pick("[data-sheet-lip]");
    const nav = pick('[data-shell="tabs"]');
    const tabs = nav ? [...nav.querySelectorAll<HTMLElement>("[data-tab], .ws-ftmore")].map((t) => ({
      id: t.dataset.tab ?? "more", cur: t.getAttribute("aria-current") === "page", text: t.textContent?.trim(), box: box(t),
      css: cs(t, "background-color", "color", "font-size", "font-family", "height", "border-top-left-radius", "padding-left", "margin-left"),
      pro: !!t.querySelector(".ws-ftpro"),
    })) : [];
    const sf = pick(".ws-sfield"), logo = pick(".wsr-home") ?? pick(".ws-pin .ws-logo");
    const root = getComputedStyle(document.documentElement);
    return {
      tokens: Object.fromEntries(["--ink-shell", "--ink-shell-lift", "--ink-shell-lift-2", "--ws-page", "--ws-sheet"].map((k) => [k, root.getPropertyValue(k).trim()])),
      inkTab: main ? getComputedStyle(main).getPropertyValue("--ink-tab").trim() : null,
      inkSheet: main ? getComputedStyle(main).getPropertyValue("--ink-sheet").trim() : null,
      panel: { box: box(panel), css: cs(panel, "background-color", "background-image", "box-shadow", "border-right-width") },
      pin: cs(pick(".ws-panel .ws-pin"), "background-color", "background-image", "box-shadow", "border-right-width"),
      main: cs(main, "background-color"), bar: { box: box(bar), css: cs(bar, "background-color", "height") },
      win: { box: box(win), css: cs(win, "background-color", "border-top-left-radius", "border-top-right-radius") },
      lip: { box: box(lip), css: cs(lip, "background-color", "height") },
      nav: box(nav), tabs, search: box(sf), logo: box(logo),
      logoImg: box(logo?.querySelector("svg, img") ?? null),
      tools: box(pick(".ws-bright")),
    };
  });
}

for (const m of ["rail", "pinned"] as const) {
  test(`st2 recon ${m}`, async ({ page }) => {
    test.setTimeout(600_000);
    fs.mkdirSync(OUT, { recursive: true });
    await mode(page, m);
    const out: Record<string, unknown> = {};
    for (const r of ROUTES) {
      await openRoute(page, r, { width: 1512, height: 900 });
      out[r] = await read(page);
      const tag = r.replace(/\//g, "_");
      await page.screenshot({ path: `${OUT}/${m}${tag}-1512.png`, clip: { x: 0, y: 0, width: 760, height: 200 } });
      if (["/queries", "/materials/letters"].includes(r)) {
        for (const w of [1280, 1100]) {
          await page.setViewportSize({ width: w, height: 800 });
          await page.waitForTimeout(600);
          out[`${r}@${w}`] = await read(page);
          await page.screenshot({ path: `${OUT}/${m}${tag}-${w}.png`, clip: { x: 0, y: 0, width: w, height: 120 } });
        }
      }
    }
    fs.writeFileSync(`${OUT}/recon-${m}.json`, JSON.stringify(out, null, 1));
  });
}
