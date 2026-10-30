/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PF1 — phone fixes v1 (30 Oct; ref design-refs/phone-fixes-v1/, picks 1B · 3A · 4A · 5C).
 *
 * Runs on the two phone projects (`iphone`: iPhone 13 on WebKit; `pixel`: Pixel 5 on Chromium), with
 * touch. Scrolling is a touch drag (`touch.ts`): native on Chromium; on WebKit, which Playwright cannot
 * drive with a native touch drag, the touch events are dispatched (so a cancelling listener is caught)
 * and the scroll is applied to the element the browser would pick.
 *
 *   SA_E2E_BASE_URL=http://127.0.0.1:<port>   this build
 *   PF1_BASE_URL=http://127.0.0.1:<port>      the base build, for F9
 *   PF1_MUTATE=<lock>                         that lock's named break
 *   PF1_READINGS=<file>                       one JSON line of readings per lock
 *
 * ⚠️ EVERY LOCK ASSERTS ITS POPULATION FIRST.
 */
import { test, expect, type Page } from "@playwright/test";
import { appendFileSync } from "node:fs";
import { createRequire } from "node:module";
import { openPhone } from "./pa2Lib";
import { touchDrag } from "./touch";

const { PNG } = createRequire(import.meta.url)("playwright-core/lib/utilsBundle") as { PNG: { sync: { read(b: Buffer): { width: number; height: number; data: Buffer } } } };

export const MUTATE = process.env.PF1_MUTATE ?? "";
const READINGS = process.env.PF1_READINGS ?? "";
const proj = () => test.info().project.name;
const record = (lock: string, data: unknown) => { if (READINGS) appendFileSync(READINGS, JSON.stringify({ lock, proj: proj(), mutate: MUTATE || null, data }) + "\n"); };

/** Decision 2's pages, each with what must be reachable by touch. */
export const PAGES = [
  "/dashboard", "/queries", "/todo", "/agents", "/todo/corkboard",
  "/queries/analytics", "/queries/responses", "/manuscripts", "/queries/packages", "/manuscripts/comps", "/manuscripts/versions",
  "/goals", "/agents/discover", "/help",
  "/account", "/account/profile", "/account/preferences", "/account/notifications", "/account/tasks", "/account/security", "/account/data", "/account/plan",
  "/plans", "/import",
];

/** Named breaks that put back what each fix removed. */
export const BREAK: Record<string, string> = {
  F2: "@media (max-width: 767.98px) { .sv2-fade { display: block !important; opacity: 1 !important; } .pa-edgefade { display: none !important; } }",
  F3: "@media (max-width: 767.98px) { .pa-tabbar { background: #fff !important; -webkit-backdrop-filter: none !important; backdrop-filter: none !important; } }",
  F1: "@media (max-width: 767.98px) { .ws-work > div { overflow: hidden !important; flex: 1 1 0 !important; min-height: 0 !important; } .ws-work--fit { flex: 1 1 0 !important; min-height: 0 !important; } }",
};

/** Go to a route inside the app (history + popstate, as a tapped link does) and wait for the page to settle:
 *  the stage exists and its height has stopped changing. A full reload per page made WebKit measure a
 *  half-rendered page. */
export async function go(page: Page, path: string) {
  await page.evaluate((p) => { history.pushState({}, "", p); dispatchEvent(new PopStateEvent("popstate")); }, path);
  await page.waitForSelector("#app-stage-scroll", { timeout: 20_000 });
  let last = -1;
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(250);
    const h = await page.evaluate(() => document.getElementById("app-stage-scroll")?.scrollHeight ?? -1);
    if (h === last && h > 0) break;
    last = h;
  }
  await page.evaluate(() => { const st = document.getElementById("app-stage-scroll"); if (st) st.scrollTop = 0; });
  await page.waitForTimeout(300);
}

export async function phone(page: Page, path: string) {
  const vp = page.viewportSize()!;
  await openPhone(page, path, vp);
  if (BREAK[MUTATE]) await page.addStyleTag({ content: BREAK[MUTATE] });
  await page.waitForTimeout(400);
}

/** The page's one scroller, its last visible item, and the bar. */
const readEnd = (page: Page) => page.evaluate(() => {
  const st = document.getElementById("app-stage-scroll");
  const bar = document.querySelector<HTMLElement>(".pa-tabbar");
  const barTop = bar && getComputedStyle(bar).display !== "none" ? bar.getBoundingClientRect().top : innerHeight;
  /* the last leaf of the page with text or an image, in document order */
  let last: Element | null = null;
  if (st) for (const el of st.querySelectorAll("*")) {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height || el.children.length) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.position === "fixed" || el.closest("[aria-hidden='true'], .pa-tabbar, .sv2-fade, .pa-edgefade")) continue;
    if ((el.textContent ?? "").trim() || el.tagName === "IMG" || el.tagName === "svg") last = el;
  }
  const lr = last?.getBoundingClientRect();
  return { st: st?.scrollTop ?? -1, max: st ? st.scrollHeight - st.clientHeight : -1, barTop: Math.round(barTop), lastBottom: lr ? Math.round(lr.bottom) : null, last: last ? `${last.tagName}.${String((last as HTMLElement).className).split(" ")[0]} "${(last.textContent ?? "").trim().slice(0, 24)}"` : null, vh: innerHeight };
});

test.describe("PF1 phone fixes", () => {
  test("F1 every page reaches its last item by touch, and the item ends above the bar", async ({ page }) => {
    test.setTimeout(900_000);
    const vp = page.viewportSize()!;
    const rows: Record<string, unknown>[] = [];
    await phone(page, "/dashboard");
    for (const path of PAGES) {
      await go(page, path);
      if (BREAK[MUTATE]) await page.addStyleTag({ content: BREAK[MUTATE] });
      const start = await readEnd(page);
      for (let i = 0; i < 30; i++) {
        const before = (await readEnd(page)).st;
        await touchDrag(page, Math.round(vp.width / 2), Math.round(vp.height * 0.7), -Math.round(vp.height * 0.45));
        const now = await readEnd(page);
        if (now.st >= now.max - 1 || Math.abs(now.st - before) < 1) break;
      }
      await page.waitForTimeout(500);
      const end = await readEnd(page);
      /* exactly one vertical scroller on the page (sheets aside): the stage */
      const scrollers = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("#root *")].filter((e) => {
        const cs = getComputedStyle(e); const r = e.getBoundingClientRect();
        return /(auto|scroll)/.test(cs.overflowY) && e.scrollHeight > e.clientHeight + 1 && r.height > 120 && r.width > innerWidth * 0.6 && !e.closest(".pa-layer");
      }).map((e) => `${e.tagName}.${String(e.className).split(" ")[0]}#${e.id}`));
      rows.push({ path, start: { st: start.st, max: start.max }, end, scrollers });
    }
    record("F1", rows);
    expect(rows.length).toBe(PAGES.length);
    for (const r of rows as Array<{ path: string; start: { max: number }; end: { st: number; max: number; lastBottom: number | null; barTop: number; last: string | null } }>) {
      expect(r.end.last, `${r.path}: a last item`).not.toBeNull();
      expect((r as unknown as { scrollers: string[] }).scrollers, `${r.path}: one vertical scroller, the stage`).toEqual(["DIV.ws-wbody#app-stage-scroll"]);
      if (r.start.max > 0) expect(r.end.st, `${r.path}: touch scrolled to the end`).toBeGreaterThanOrEqual(r.end.max - 2);
      expect(r.end.lastBottom!, `${r.path}: the last item (${r.end.last}) ends above the bar`).toBeLessThanOrEqual(r.end.barTop);
    }
  });

  test("F2 no fade floats detached from the bar: the edge fade is anchored to the screen's foot, no band above the bar", async ({ page }) => {
    const rows: Record<string, unknown>[] = [];
    await phone(page, "/dashboard");
    for (const path of ["/dashboard", "/queries", "/todo", "/agents"]) {
      await go(page, path);
      if (BREAK[MUTATE]) await page.addStyleTag({ content: BREAK[MUTATE] });
      await page.waitForTimeout(500);
      const geo = await page.evaluate(() => {
        const vis = (e: Element | null) => !!e && getComputedStyle(e).display !== "none" && (e as HTMLElement).getBoundingClientRect().height > 0;
        const bar = document.querySelector<HTMLElement>(".pa-tabbar")!.getBoundingClientRect();
        const fade = document.querySelector<HTMLElement>(".pa-edgefade");
        const fr = fade?.getBoundingClientRect();
        /* every visible gradient box in the band above the bar that does not touch the screen's foot is a detached fade */
        const detached = [...document.querySelectorAll<HTMLElement>("body *")].filter((e) => {
          if (!vis(e) || e === fade) return false;
          const cs = getComputedStyle(e); if (!/linear-gradient/.test(cs.backgroundImage) || parseFloat(cs.opacity) === 0) return false;
          const r = e.getBoundingClientRect();
          return r.width > innerWidth * 0.6 && r.bottom > bar.top - 120 && r.bottom < innerHeight - 1 && r.top < bar.top;
        }).map((e) => String(e.className).slice(0, 40));
        return { barTop: Math.round(bar.top), barLeft: Math.round(bar.left), barRight: Math.round(bar.right), vh: innerHeight, fade: fr && vis(fade) ? { top: Math.round(fr.top), bottom: Math.round(fr.bottom), op: getComputedStyle(fade!).opacity } : null, detached, oldFade: vis(document.querySelector(".sv2-fade")) };
      });
      /* pixel column just left of the bar (where only page and fade can be): reading upward from the bar's top,
         a page-coloured run followed by a LIGHTER band is the floating fade with its gap */
      /* the page's own content is hidden for the sample (a white card behind the fade is content, not a fade);
         the fades and the bar stay drawn */
      const hide = await page.addStyleTag({ content: "#app-stage-scroll * { visibility: hidden !important; } #app-stage-scroll .sv2-fade { visibility: visible !important; }" });
      await page.waitForTimeout(100);
      const shot = PNG.sync.read(await page.screenshot());
      await hide.evaluate((n) => (n as Element).remove());
      const dpr = shot.width / (await page.evaluate(() => innerWidth));
      const x = Math.max(1, Math.round((geo.barLeft + 24) * dpr));
      const lum = (y: number) => { const i = (Math.round(y * dpr) * shot.width + x) * 4; const d = shot.data; return 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]; };
      const page_ = 0.2126 * 248 + 0.7152 * 246 + 0.0722 * 242;
      let sawPage = false, band = false;
      for (let y = geo.barTop - 2; y > geo.barTop - 90; y--) {
        const l = lum(y);
        if (Math.abs(l - page_) < 1.5) sawPage = true;
        else if (sawPage && l > page_ + 3) { band = true; break; }
      }
      rows.push({ path, ...geo, band });
    }
    record("F2", rows);
    expect(rows.length).toBe(4);
    for (const r of rows as Array<{ path: string; vh: number; barTop: number; fade: { top: number; bottom: number } | null; detached: string[]; oldFade: boolean; band: boolean }>) {
      expect(r.oldFade, `${r.path}: the old floating fade is not drawn`).toBe(false);
      expect(r.detached, `${r.path}: no gradient floats detached above the bar`).toEqual([]);
      expect(r.band, `${r.path}: no lighter band separated from the bar by page colour`).toBe(false);
      if (r.fade) {
        expect(r.fade.bottom, `${r.path}: the fade's bottom is the screen's`).toBe(r.vh);
        expect(r.fade.top, `${r.path}: the fade ends at most 32px above the bar`).toBeGreaterThanOrEqual(r.barTop - 32 - 1);
      }
    }
    expect(rows.some((r) => (r as { fade: unknown }).fade), "the edge fade is drawn on a page with more below").toBe(true);
  });

  test("F3 the bar is frosted: backdrop blur, and what is under it changes as content scrolls behind", async ({ page }) => {
    const vp = page.viewportSize()!;
    await phone(page, "/queries");
    await go(page, "/queries");
    if (BREAK[MUTATE]) await page.addStyleTag({ content: BREAK[MUTATE] });
    const filt = await page.evaluate(() => { const cs = getComputedStyle(document.querySelector(".pa-tabbar")!); return `${cs.backdropFilter || ""} ${(cs as unknown as Record<string, string>).webkitBackdropFilter || ""}`; });
    const box = await page.locator(".pa-tabbar").boundingBox();
    /* the strip of bar between two tabs, where no icon or label sits */
    const clip = { x: box!.x + 6, y: box!.y + 4, width: 10, height: box!.height - 8 };
    const a = await page.screenshot({ clip });
    await touchDrag(page, Math.round(vp.width / 2), Math.round(vp.height * 0.5), -60);
    await page.evaluate(() => document.querySelector(".pa-tabbar")?.classList.remove("away"));
    await page.waitForTimeout(500);
    const b = await page.screenshot({ clip });
    record("F3", { filt, changed: !a.equals(b) });
    expect(filt, "backdrop-filter includes blur").toMatch(/blur/);
    expect(a.equals(b), "pixels under the bar change as content scrolls behind it").toBe(false);
  });
});
