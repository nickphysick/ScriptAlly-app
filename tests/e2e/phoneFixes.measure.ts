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
import { openPhone } from "./pa2Lib";
import { touchDrag } from "./touch";

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
});
