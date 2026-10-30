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
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createRequire } from "node:module";
import { MS, openPhone } from "./pa2Lib";
import { openRoute } from "./measure";
import { engine, touchDrag } from "./touch";
import { devDb } from "./devWrite";
import { collection, deleteDoc, doc, getDocs, query as fsq, where } from "firebase/firestore";
import { buildQcRows } from "../../src/lib/qcSummary";
import { eyeProgress } from "../../src/lib/qcBirdsEye";
import type { Activity, Agent, Query } from "../../src/types";

const { PNG } = createRequire(import.meta.url)("playwright-core/lib/utilsBundle") as { PNG: { sync: { read(b: Buffer): { width: number; height: number; data: Buffer } } } };

export const MUTATE = process.env.PF1_MUTATE ?? "";
const READINGS = process.env.PF1_READINGS ?? "";
const proj = () => test.info().project.name;
const record = (lock: string, data: unknown) => { if (READINGS) appendFileSync(READINGS, JSON.stringify({ lock, proj: proj(), mutate: MUTATE || null, data }) + "\n"); };

/** Decision 2's pages, each with what must be reachable by touch. */
export { PAGES } from "./phonePages";
import { PAGES } from "./phonePages";

/** Named breaks that put back what each fix removed. */
export const BREAK: Record<string, string> = {
  F9: ".ws-work > div { flex: 0 0 auto !important; min-height: auto !important; overflow: visible !important; } .ws-work .wpg-scroll { height: auto !important; max-height: none !important; overflow: visible !important; }",
  F7: ".pa-flow .pf-nqc { display: none !important; } .pa-flow .pf-lcard::before { content: 'New query'; display: block; padding: 7px 14px; font-size: 12.5px; background: #f7efe3; }",
  F5: ".pa-birds .pa-barh { display: inline !important; }",
  F4: '[data-pa="search-btn"] { pointer-events: none !important; }',
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

/* ONE SIGN-IN PER PROJECT, NOT PER TEST. Firebase keeps its session in IndexedDB, which `storageState` carries only
   when asked (`indexedDB: true`); without it every lock password-signs-in and a run trips Firebase's throttle, which
   reads as "the page never rendered" (it did, on the iPhone, twice in one session). */
const authFile = (engineName: string) => resolve(process.cwd(), `tests/e2e/.auth/pf1-${engineName}-${new URL(process.env.SA_E2E_BASE_URL ?? "http://x").port || "443"}.json`);
test.use({ storageState: async ({ browserName }, use) => { const f = authFile(browserName); await use(existsSync(f) ? f : undefined); } });
export async function phone(page: Page, path: string) {
  const vp = page.viewportSize()!;
  /* ONE RETRY, AND ONLY FOR THE SPLASH STALL. Playwright's WebKit here intermittently fails Google's fetches ("Fetch API
     cannot load …googleapis…"), so Firebase never finishes starting and the page holds its splash — the same fault that
     stops its Firestore Write channel. It is the harness's network, not the app: the same build loads on the next try.
     A second failure stands. Every retry is recorded, so a run that leans on it shows it. */
  try { await openPhone(page, path, vp); }
  catch (e) {
    const splash = await page.evaluate(() => !document.querySelector(".ws-work, .ws-panel, #au-email") && /QueryHawk/.test(document.body.innerText)).catch(() => false);
    if (!splash) throw e;
    record("RETRY", { why: "splash stall", path, engine: engine(page) });
    await page.reload(); await openPhone(page, path, vp);
  }
  const f = authFile(engine(page));
  if (!existsSync(f)) await page.context().storageState({ path: f, indexedDB: true });
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

  test("F4 the search button opens full-screen search, focused; typing an agent's name lists them, and tapping opens them", async ({ page }) => {
    await phone(page, "/queries");
    await go(page, "/queries");
    if (BREAK[MUTATE]) await page.addStyleTag({ content: BREAK[MUTATE] });
    const name = (await page.locator('[data-qm1="row"] .pa-mid b, [data-qm1="row"] .pa-nm').first().textContent())?.trim()
      ?? await page.evaluate(() => document.querySelector('[data-qm1="row"]')?.textContent?.trim().split("\n")[0] ?? "");
    expect(name, "a known agent on the page").toBeTruthy();
    await page.locator('[data-pa="band"] [data-pa="search-btn"]').first().tap({ timeout: 10_000 }).catch(() => {});
    await page.waitForTimeout(500);
    const open = await page.evaluate(() => {
      const s = document.querySelector<HTMLElement>('[data-pa="search"]');
      const r = s?.getBoundingClientRect();
      return { shown: !!r && r.width === innerWidth && r.height === innerHeight, focused: (document.activeElement as HTMLElement | null)?.dataset.pa === "search-input",
        empty: [...document.querySelectorAll('[data-pa="search-jump"]')].length };
    });
    let hits = 0, url = "";
    if (open.shown) {
      await page.locator('[data-pa="search-input"]').fill(name!.split(" ")[0]);
      await page.waitForTimeout(300);
      hits = await page.locator('[data-pa="search-query"], [data-pa="search-agent"]').filter({ hasText: name! }).count();
      if (hits) { await page.locator('[data-pa="search-query"], [data-pa="search-agent"]').filter({ hasText: name! }).first().tap(); await page.waitForTimeout(800); url = await page.evaluate(() => location.pathname + location.search); }
    }
    const opened = await page.evaluate(() => !!document.querySelector('.pa-qsheet [data-qc149c="card"], [data-agent-card], .ac-card'));
    record("F4", { name, open, hits, url, opened });
    expect(open.shown, "full-screen search opens").toBe(true);
    expect(open.focused, "the field is focused").toBe(true);
    expect(open.empty, "the empty state offers Jump to").toBe(3);
    expect(hits, `typing "${name}" lists them`).toBeGreaterThan(0);
    expect(opened || /[?&]q=/.test(url), "tapping opens them").toBe(true);
  });

  test("F5 Birds-eye: one card per open query, none closed, each bar the desktop's own fill", async ({ page }) => {
    await phone(page, "/queries");
    await go(page, "/queries");
    if (BREAK[MUTATE]) await page.addStyleTag({ content: BREAK[MUTATE] });
    const chips = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll<HTMLElement>('[data-qm1="chip"]')].map((c) => [c.dataset.key, Number(c.dataset.count)])));
    await page.locator('[data-pa="birds-btn"]').first().tap();
    await page.locator('[data-pa="birds"]').waitFor({ timeout: 10_000 });
    await page.waitForTimeout(600);
    const nowMs = Date.now();
    const cards = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-pa="birds-row"]')].map((c) => {
      const trk = c.querySelector<HTMLElement>('[data-pa="birds-bar"]')!; const fill = trk.querySelector<HTMLElement>("i")!;
      const tr = trk.getBoundingClientRect(), fr = fill.getBoundingClientRect();
      return { id: c.dataset.id!, where: c.dataset.where!, fill: c.dataset.fill === "" ? null : Number(c.dataset.fill), trackW: tr.width, trackH: tr.height, drawn: tr.width ? fr.width / tr.width : 0,
        foot: [...c.querySelectorAll(".pa-brf > span")].map((x) => x.textContent) };
    }));
    const { db, uid } = await devDb();
    const read = async <T,>(c: string) => (await getDocs(collection(db, "users", uid, c))).docs.map((d) => ({ id: d.id, ...d.data() }) as T);
    const rows = buildQcRows(await read<Query>("queries"), await read<Agent>("agents"), await read<Activity>("activities"), nowMs);
    const byId = new Map(rows.map((r) => [r.id, r]));
    const CLOSED = new Set(["Rejected", "No Response", "Withdrawn", "Signed"]);
    const mism = cards.map((c) => {
      const r = byId.get(c.id); const e = r ? eyeProgress(r, nowMs) : null; const want = e?.dated ? e.fill : null;
      return { id: c.id, got: c.fill, want, drawn: c.drawn, closed: r ? CLOSED.has(String(r.status)) : null };
    }).filter((m) => m.closed || (m.want == null) !== (m.got == null) || (m.want != null && Math.abs(m.want - (m.got ?? 0)) > 0.01) || (m.want != null && Math.abs(m.want - m.drawn) > 0.03));
    record("F5", { chips, n: cards.length, sample: cards.slice(0, 3), mism: mism.slice(0, 5) });
    expect(cards.length, "Birds-eye has cards").toBeGreaterThan(0);
    expect(cards.length, "one card per open query (the page's own With you + With the agent + Gone quiet)").toBe((chips.you ?? 0) + (chips.agent ?? 0) + (chips.quiet ?? 0));
    expect(cards.every((c) => c.where !== "closed"), "no closed group").toBe(true);
    expect(cards.every((c) => c.trackH >= 9 && c.trackW > 100), "every bar has its 10px track").toBe(true);
    expect(mism, "each bar's fill is the desktop eyeProgress value, closed queries left out").toEqual([]);
  });

  /** Open Log a query from the tab bar's + (the "I sent a query" door). */
  async function openLog(page: Page) {
    await page.locator('[data-pa="plus"]').first().tap();
    await page.locator('[data-pa="plus-sent"]').first().tap();
    await page.locator('.pa-flow[data-pf="log"]').waitFor({ timeout: 15_000 });
    if (MUTATE === "F6") await page.evaluate(() => { const i = document.querySelector<HTMLInputElement>("[data-qad-agent-input]"); i?.focus(); i?.scrollIntoView({ block: "end" }); });
    await page.waitForTimeout(900);
  }
  const flowTop = (page: Page) => page.evaluate(() => {
    const sh = document.querySelector<HTMLElement>('.pa-flow [data-pf="sheet"]'), layer = document.querySelector<HTMLElement>(".pa-flow");
    const card = document.querySelector<HTMLElement>('.pa-flow [data-pf="live"]')!.getBoundingClientRect();
    return { sheet: sh?.scrollTop ?? -1, layer: layer?.scrollTop ?? -1, win: scrollY, cardTop: Math.round(card.top), cardBottom: Math.round(card.bottom), vh: innerHeight,
      focus: (document.activeElement as HTMLElement | null)?.tagName ?? null };
  });

  test("F6 Log a query opens at the top with the card fully in view, from + and after Queries was scrolled halfway", async ({ page }) => {
    const vp = page.viewportSize()!;
    await phone(page, "/queries");
    await go(page, "/queries");
    await openLog(page);
    const fresh = await flowTop(page);
    await page.locator('.pa-flow [data-pf="close"]').tap(); await page.waitForTimeout(600);
    const discard = page.getByRole("button", { name: /^Discard/ });
    if (await discard.count()) await discard.first().tap();
    const stageTop = () => page.evaluate(() => document.getElementById("app-stage-scroll")!.scrollTop);
    /* the list arrives late on WebKit (its Firestore channel is slow in this harness): at 1.5s the page could scroll
       219px, at 7s 3,400 — wait for the list, or "scrolled halfway" is a claim about a page that had not loaded */
    await page.waitForFunction(() => { const st = document.getElementById("app-stage-scroll")!; return st.scrollHeight - st.clientHeight > 1500; }, null, { timeout: 30_000 });
    for (let i = 0; i < 16 && (await stageTop()) < 600; i++) await touchDrag(page, Math.round(vp.width / 2), Math.round(vp.height * 0.7), -Math.round(vp.height * 0.4));
    const half = await stageTop();
    /* the bar tucked away on the way down; a phone brings it back with a small drag up (app.js onScroll: 6px up) */
    await touchDrag(page, Math.round(vp.width / 2), Math.round(vp.height * 0.4), 60, 6);
    const halfNow = await stageTop();
    await page.waitForTimeout(500);
    await openLog(page);
    const after = await flowTop(page);
    record("F6", { fresh, half, halfNow, after });
    expect(half, "Queries was scrolled down first").toBeGreaterThan(300);
    for (const [k, r] of [["from +", fresh], ["after scrolling", after]] as const) {
      expect(r.sheet, `${k}: the flow's scroll is 0`).toBe(0);
      expect(r.layer, `${k}: the layer is not scrolled`).toBe(0);
      expect(r.cardTop, `${k}: the card's top is in view`).toBeGreaterThanOrEqual(0);
      expect(r.cardBottom, `${k}: the card's bottom is in view`).toBeLessThanOrEqual(r.vh);
      expect(r.focus, `${k}: no field focused on open`).not.toBe("INPUT");
    }
  });

  test("F7 the 'New query' heading is at least 26px, inside the white card, and there is no strip", async ({ page }) => {
    await phone(page, "/queries");
    await go(page, "/queries");
    if (BREAK[MUTATE]) await page.addStyleTag({ content: BREAK[MUTATE] });
    await openLog(page);
    const h = await page.evaluate(() => {
      const card = document.querySelector<HTMLElement>('.pa-flow [data-pf="live"]')!;
      const head = card.querySelector<HTMLElement>('[data-pf="heading"]');
      const hb = head?.querySelector("b");
      const vis = (e: Element | null) => !!e && getComputedStyle(e).display !== "none" && (e as HTMLElement).getBoundingClientRect().height > 0;
      return { text: hb?.textContent ?? null, size: hb ? parseFloat(getComputedStyle(hb).fontSize) : 0, face: hb ? getComputedStyle(hb).fontFamily : "",
        inCard: !!head && vis(head) && card.contains(head), strip: vis(card.querySelector(".pf-lcband")) || getComputedStyle(card, "::before").content !== "none" && getComputedStyle(card, "::before").content !== "normal",
        day: head?.querySelector("span")?.textContent ?? null };
    });
    record("F7", h);
    if (!MUTATE) await page.screenshot({ path: `reports/phone-fixes-v1/after/5C-log-${engine(page)}.png` });
    expect(h.text).toBe("New query");
    expect(h.size, "at least 26px").toBeGreaterThanOrEqual(26);
    expect(h.face).toMatch(/Special Elite/);
    expect(h.inCard, "inside the white card").toBe(true);
    expect(h.strip, "no strip").toBe(false);
    expect(h.day).toBe("Day 0");
  });

  test("F8 the reply wheel in Log a query saves 3 weeks 4 days as an expected date 25 days after sending", async ({ page }) => {
    /* WRITES one query on the harness account, reads it back and deletes everything it wrote. */
    test.setTimeout(400_000);
    const { db, uid } = await devDb();
    const qsBefore = new Set((await getDocs(collection(db, "users", uid, "queries"))).docs.map((d) => d.id));
    const queried = new Set((await getDocs(collection(db, "users", uid, "queries"))).docs.map((d) => d.data()).filter((q) => q.manuscriptId === MS).map((q) => q.agentId));
    const agent = (await getDocs(collection(db, "users", uid, "agents"))).docs.map((d) => ({ id: d.id, ...d.data() }) as { id: string; name?: string; agency?: string }).filter((a) => !queried.has(a.id) && (a.name ?? "").trim().length > 2)[engine(page) === "webkit" ? 1 : 0];
    expect(agent, "an agent with no query on the harness manuscript").toBeTruthy();
    const made: string[] = [];
    const errs: string[] = [];
    page.on("console", (m) => { if (m.type() === "error") errs.push("console: " + m.text().slice(0, 200)); });
    page.on("pageerror", (e) => errs.push("pageerror: " + String(e).slice(0, 200)));
    try {
      await phone(page, "/queries");
      await go(page, "/queries");
      await openLog(page);
      await page.locator("[data-qad-agent-input]").fill(agent!.name!);
      await page.waitForTimeout(400);
      await page.locator("[data-qad-sugg] button").filter({ hasText: agent!.name! }).first().tap();
      let wheel = false, saved = false; const trace: string[] = []; const shown: { dateline?: string; slots?: string[] } = {};
      for (let i = 0; i < 14 && !saved; i++) {
        await page.waitForTimeout(450);
        const step = await page.evaluate(() => document.querySelector("[data-pf-step]")?.getAttribute("data-pf-step") ?? "check");
        if (!(await page.locator('[data-pf="primary"]').count())) trace.push(`${step}→(no primary)`);
        if (step === "Response expectations" && !wheel) {
          await page.locator('[data-rw="col-weeks"]').evaluate((e) => { e.scrollTop = 3 * 40; });
          await page.locator('[data-rw="col-days"]').evaluate((e) => { e.scrollTop = (4 * 40); });
          await page.waitForTimeout(500);
          if (MUTATE === "F8") { await page.locator('[data-rw="col-days"]').evaluate((e) => { e.scrollTop = 0; }); await page.waitForTimeout(500); }
          wheel = true;
          shown.dateline = (await page.locator('[data-rw="dateline"]').textContent())?.trim() ?? "";
        }
        if (wheel && !shown.slots && step !== "Response expectations") shown.slots = await page.locator('.pa-flow [data-pf="slot"]').allTextContents();
        const pri = page.locator('[data-pf="primary"]');
        if (await pri.count() && await pri.isEnabled()) {
          const label = (await pri.textContent()) ?? "";
          trace.push(`${step}→${label.trim()}`);
          await pri.tap();
          if (/^Log/.test(label) && !/^Logging/.test(label)) { saved = true; break; }
        } else {
          const opt = page.locator("[data-pf-step] button").first();
          if (await opt.count()) await opt.tap(); else break;
        }
      }
      let fresh: Awaited<ReturnType<typeof getDocs>>["docs"] = [];
      for (let t = 0; t < (engine(page) === "chromium" ? 20 : 8) && !fresh.length; t++) {
        await page.waitForTimeout(1000);
        fresh = (await getDocs(collection(db, "users", uid, "queries"))).docs.filter((d) => !qsBefore.has(d.id) && (d.data() as { agentId?: string }).agentId === agent!.id);
      }
      if (!fresh.length) { trace.push(...errs.slice(0, 2)); await page.screenshot({ path: `test-results/f8-${engine(page)}-after.png` }); }
      made.push(...fresh.map((d) => d.id));
      const q = fresh[0]?.data() as unknown as { dateSent?: string; writerExpectedDate?: string; agentId?: string } | undefined;
      const day0 = (iso: string) => Date.parse(iso.slice(0, 10) + "T00:00:00Z");
      const days = q?.dateSent && q?.writerExpectedDate ? Math.round((day0(q.writerExpectedDate) - day0(String(q.dateSent))) / 86_400_000) : null;
      const dm = /Expected by \w+ (\d+ \w+)/.exec(shown.dateline ?? "")?.[1] ?? null;
      record("F8", { shown, dm, trace, wheel, saved, n: fresh.length, agentOk: q?.agentId === agent!.id, dateSent: q?.dateSent, writerExpectedDate: q?.writerExpectedDate, days });
      expect(wheel, "the reply step offered the wheel").toBe(true);
      expect(shown.dateline, "the wheel states 25 days").toMatch(/\(25 days after you sent it\)/);
      expect(dm, "the date line names a day").not.toBeNull();
      expect((shown.slots ?? []).some((t) => t.includes(dm!)), "the card's Reply window slot carries the same date").toBe(true);
      /* ⚠️ THE STORED READ-BACK RUNS WHERE THE SERVER IS REACHABLE. Playwright's WebKit cannot open Firestore's Write
         channel here ("Fetch API cannot load …/Firestore/Write/channel", every run), so on the iPhone the write never
         leaves the page. Its on-screen answer above is the same derivation; Chromium proves the stored half. */
      if (engine(page) === "chromium") {
        expect(fresh.length, "one query logged").toBe(1);
        expect(days, "the expected date is 25 days after the sent date").toBe(25);
      } else expect(fresh.length, "WebKit: nothing reached the server, so nothing to clean").toBeLessThanOrEqual(1);
    } finally {
      for (const id of made) {
        for (const a of (await getDocs(collection(db, "users", uid, "queries", id, "activity"))).docs) await deleteDoc(a.ref).catch(() => {});
        for (const c of ["activities", "taskFlags", "tasks"]) for (const r of (await getDocs(fsq(collection(db, "users", uid, c), where("queryId", "==", id)))).docs) await deleteDoc(r.ref).catch(() => {});
        await deleteDoc(doc(db, "users", uid, "queries", id)).catch(() => {});
      }
    }
  });

  test("BADGE reading (report only, no assertion about which number is right)", async ({ page }) => {
    await phone(page, "/todo");
    await go(page, "/todo");
    await page.waitForTimeout(1500);
    const r = await page.evaluate(() => {
      const n = (sel: string) => document.querySelector(sel)?.textContent?.trim() ?? null;
      return {
        badge: n('[data-pa="tab-badge"]'),
        badgeLabel: document.querySelector('[data-pa="tabbar"] [aria-label^="To-do"], .pa-tabbar [aria-label^="To-do"]')?.getAttribute("aria-label") ?? null,
        earlier: n('[data-pa="tally-earlier"]'), today: n('[data-pa="tally-today"]'), soon: n('[data-pa="tally-soon"]'),
        groups: [...document.querySelectorAll(".pa-td .pa-rowhd")].map((h) => h.textContent?.trim()),
        segs: [...document.querySelectorAll(".pa-td .pa-seg button")].map((b) => b.textContent?.trim()),
        headline: [...document.querySelectorAll(".pa-td h1, .pa-td h2, [data-pa='band'] h1")].map((h) => h.textContent?.trim()),
      };
    });
    record("BADGE", r);
    expect(r.badge, "the badge is drawn").not.toBeNull();
  });

  test("F9 the desktop is unchanged at 1440 × 900 on Home, Queries, To-do, Agents, Analytics and Settings", async ({ browser, browserName }) => {
    test.skip(browserName !== "chromium", "the desktop comparison runs once, in Chromium");
    test.setTimeout(900_000);
    const BASE = process.env.PF1_BASE_URL ?? "http://127.0.0.1:4730";
    const OURS = process.env.SA_E2E_BASE_URL!;
    const ROUTES: [string, string][] = [["Home", "/dashboard"], ["Queries", "/queries"], ["To-do", "/todo"], ["Agents", "/agents"], ["Analytics", "/queries/analytics"], ["Settings", "/account"]];
    const open = async (url: string) => {
      const f = resolve(process.cwd(), `tests/e2e/.auth/pf1-desk-${new URL(url).port}.json`);
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, baseURL: url, ...(existsSync(f) ? { storageState: f } : {}) });
      /* BOTH SIDES ON ONE MANUSCRIPT. The active book is remembered per context in localStorage, so two contexts can
         disagree about it — measured: the base said "Murphy's Day Out" and this build "The Smoke Test", and every page
         differed for a reason that has nothing to do with the build. */
      await ctx.addInitScript((ms) => { try { localStorage.setItem("scriptally_active_manuscript_id", ms); } catch { /* */ } }, MS);
      const page = await ctx.newPage();
      await openRoute(page, "/dashboard");
      if (!existsSync(f)) await ctx.storageState({ path: f, indexedDB: true });
      return { ctx, page };
    };
    const sig = (page: Page) => page.evaluate(() => {
      const P = ["display", "position", "color", "background-color", "font-size", "font-family", "padding", "margin", "overflow-y", "height", "width", "opacity", "transform"];
      const out: string[] = [];
      for (const el of document.querySelectorAll("body *")) {
        const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
        if (r.width <= 0 || r.height <= 0 || cs.visibility === "hidden") continue;
        out.push(`${(el.children.length ? "" : (el.textContent ?? "").trim().slice(0, 40) + " ")}${el.tagName}.${String((el.className as unknown as { baseVal?: string })?.baseVal ?? el.className).trim()} ${r.x.toFixed(2)},${r.y.toFixed(2)},${r.width.toFixed(2)},${r.height.toFixed(2)} ${P.map((p) => cs.getPropertyValue(p)).join("|")}`);
      }
      return out;
    });
    const png = async (page: Page) => (PNG as { sync: { read: (b: Buffer) => { data: Buffer; width: number; height: number } } }).sync.read(await page.screenshot());
    /* THE BASE IS OPENED TWICE AND ITS OWN DISAGREEMENT IS THE NOISE MASK. Home carries a live cycling card and the
       sidebar's text widths move a hair between loads of one build; a change counts only where the two base loads
       agree with each other and this build does not. */
    const base = await open(BASE), base2 = await open(BASE), ours = await open(OURS);
    if (BREAK[MUTATE]) await ours.page.addStyleTag({ content: BREAK[MUTATE] });
    const rows: unknown[] = [];
    try {
      for (const [name, path] of ROUTES) {
        /* SETTLE BOTH BEFORE COMPARING: fonts loaded, and the whole document's size unchanged across four reads
           half a second apart. Measured unsettled: one string 351px against 307 (a web font against its fallback)
           and Analytics 6,372px tall against 10,951 (one still loading) — differences of timing, not of the build. */
        for (const x of [base, base2, ours]) await go(x.page, path);
        /* Home's task card cycles through the tasks on a timer (Dash71Task, DWELL_MS), so its contents depend on WHEN
           each page was read: measured, the base disagreed with itself on 45,279 pixels. It is hidden in all three
           (visibility keeps its box, so everything around it is still compared). */
        for (const x of [base, base2, ours]) await x.page.addStyleTag({ content: '[data-d71="task"] { visibility: hidden !important; }' });
        for (const x of [base, base2, ours]) {
          await x.page.evaluate(() => document.fonts.ready);
          let last = "", same = 0;
          for (let i = 0; i < 60 && same < 4; i++) {
            await x.page.waitForTimeout(500);
            const now = await x.page.evaluate(() => { const st = document.getElementById("app-stage-scroll"); return `${document.body.scrollHeight}|${st?.scrollHeight}|${document.querySelectorAll("body *").length}|${document.fonts.status}`; });
            same = now === last ? same + 1 : 0; last = now;
          }
        }
        if (BREAK[MUTATE]) await ours.page.addStyleTag({ content: BREAK[MUTATE] });
        const [sa, s2, so] = [await sig(base.page), await sig(base2.page), await sig(ours.page)];
        const [pa, p2, po] = [await png(base.page), await png(base2.page), await png(ours.page)];
        const far = (d: Buffer, e: Buffer, i: number) => Math.max(Math.abs(d[i] - e[i]), Math.abs(d[i + 1] - e[i + 1]), Math.abs(d[i + 2] - e[i + 2])) > 48;
        /* SUB-PIXEL NOISE IS NOT A CHANGE. Text widths move by ~0.015px between two loads of the SAME build (measured:
           the base build read 100.609 and 100.594 for one label on two loads), so a number compares within 0.25px and
           a pixel counts only when a channel moves by more than 48 — anti-aliasing shifts, a moved or recoloured box
           does not hide under that. */
        let px = 0, noisePx = 0;
        for (let i = 0; i < pa.data.length; i += 4) { if (far(pa.data, p2.data, i)) { noisePx++; continue; } if (far(pa.data, po.data, i)) px++; }
        const same = (x: string, y: string) => { if (x === y) return true; const xs = x.split(/[ |,]/), ys = y.split(/[ |,]/); return xs.length === ys.length && xs.every((t, k) => t === ys[k] || (/^-?[\d.]+(px)?$/.test(t) && /^-?[\d.]+(px)?$/.test(ys[k]) && Math.abs(parseFloat(t) - parseFloat(ys[k])) <= 0.25)); };
        const stable = (i: number) => sa.length === s2.length && same(sa[i], s2[i]);
        const noiseDom = sa.length === s2.length ? sa.filter((v, i) => !same(v, s2[i])).length : -1;
        const dom = sa.length === so.length ? sa.filter((v, i) => stable(i) && !same(v, so[i])).length : Math.abs(sa.length - so.length) + 1000;
        const firstDiff = sa.findIndex((v, i) => v !== so[i]);
        const parts = (v?: string) => (v ?? "").split(/[ |]/);
        const delta = (i: number) => { const a = parts(sa[i]), o = parts(so[i]); return a.map((x, k) => (x !== o[k] ? `${x} → ${o[k]}` : null)).filter(Boolean).join("; "); };
        const diffs = sa.map((_, i) => i).filter((i) => stable(i) && !same(sa[i], so[i]));
        rows.push({ name, elements: sa.length, base: sa.length, ours: so.length, dom, px, noiseDom, noisePx, first: diffs.slice(0, 4).map((i) => `${sa[i]?.split(" ")[0]} :: ${delta(i)}`) });
      }
    } finally { await base.ctx.close(); await base2.ctx.close(); await ours.ctx.close(); }
    record("F9", rows);
    expect(rows.length, "six routes compared").toBe(6);
    for (const r of rows as { name: string; elements: number; dom: number; px: number; noiseDom: number; noisePx: number }[]) {
      expect(r.noiseDom, `${r.name}: the two base loads are comparable`).toBeGreaterThanOrEqual(0);
      expect(r.noisePx, `${r.name}: the base's own noise is under 2% of the screen`).toBeLessThan(1440 * 900 * 0.02);
      expect(r.elements, `${r.name}: elements were read`).toBeGreaterThan(50);
      expect(r.dom, `${r.name}: no visible element moved or restyled`).toBe(0);
      expect(r.px, `${r.name}: no pixel changed outside the base's own noise`).toBe(0);
    }
  });

  test("SHOTS board against app (1B · 3A · 4A · 5C) at 390 and 360, and before → after", async ({ page }) => {
    test.skip(!process.env.PF1_SHOTS, "PF1_SHOTS=1 takes the report's pictures");
    test.setTimeout(900_000);
    const out = "reports/phone-fixes-v1/pairs";
    mkdirSync(out, { recursive: true });
    const pair = async (name: string, left: string, right: Buffer, labels: [string, string]) => {
      const html = `<body style="margin:0;display:flex;gap:16px;padding:16px;background:#ece7df;font:13px system-ui">` +
        [[left, labels[0]], [`data:image/png;base64,${right.toString("base64")}`, labels[1]]].map(([src, l]) => `<figure style="margin:0"><figcaption style="padding:0 0 6px">${l}</figcaption><img src="${src}" style="width:390px;border:1px solid #c9c0b3"></figure>`).join("") + "</body>";
      const p2 = await page.context().newPage(); await p2.setViewportSize({ width: 844, height: 940 }); await p2.setContent(html); await p2.waitForTimeout(300);
      await p2.screenshot({ path: `${out}/${name}.png`, fullPage: true }); await p2.close();
    };
    const b64 = (f: string) => `data:image/png;base64,${readFileSync(f).toString("base64")}`;
    for (const vp of [{ width: 390, height: 844 }, { width: 360, height: 780 }]) {
      await page.setViewportSize(vp);
      await openPhone(page, "/queries", vp); await go(page, "/queries"); await page.waitForTimeout(1500);
      for (let i = 0; i < 3; i++) await touchDrag(page, Math.round(vp.width / 2), Math.round(vp.height * 0.7), -120);
      await touchDrag(page, Math.round(vp.width / 2), Math.round(vp.height * 0.4), 30, 4); await page.waitForTimeout(600);
      await pair(`1B-${vp.width}`, b64("design-refs/phone-fixes-v1/shots/1B-bar-fade.png"), await page.screenshot(), ["board 1B (390)", `app ${vp.width}`]);
      await page.locator('[data-pa="search-btn"]').first().tap(); await page.locator('[data-pa="search"]').waitFor(); await page.waitForTimeout(600);
      await pair(`3A-${vp.width}`, b64("design-refs/phone-fixes-v1/shots/3A-search.png"), await page.screenshot(), ["board 3A (390)", `app ${vp.width}`]);
      await page.locator('[data-pa="search-cancel"]').tap(); await page.waitForTimeout(400);
      await page.locator('[data-pa="birds-btn"]').first().tap(); await page.locator('[data-pa="birds"]').waitFor(); await page.waitForTimeout(800);
      await pair(`4A-${vp.width}`, b64("design-refs/phone-fixes-v1/shots/4A-birds-eye.png"), await page.screenshot(), ["board 4A (390)", `app ${vp.width}`]);
      await page.keyboard.press("Escape"); await go(page, "/queries"); await page.waitForTimeout(800);
      await page.locator('[data-pa="plus"]').tap(); await page.locator('[data-pa="plus-sent"]').tap(); await page.locator(".pa-flow").waitFor(); await page.waitForTimeout(900);
      await pair(`5C-${vp.width}`, b64("design-refs/phone-fixes-v1/shots/5C-log-a-query.png"), await page.screenshot(), ["board 5C (390)", `app ${vp.width}`]);
      await page.locator('.pa-flow [data-pf="close"]').tap(); await page.waitForTimeout(400);
      const discard = page.getByRole("button", { name: /^Discard/ }); if (await discard.count()) await discard.first().tap();
    }
    /* before → after: the same views the recon photographed on the base build */
    await page.setViewportSize({ width: 393, height: 727 });
    for (const [file, path] of [["pixel-_dashboard", "/dashboard"], ["pixel-_queries", "/queries"], ["pixel-_todo", "/todo"], ["pixel-_agents", "/agents"], ["pixel-_queries_analytics", "/queries/analytics"], ["pixel-_account", "/account"]] as const) {
      await go(page, path); await page.waitForTimeout(1500);
      await pair(`before-after-${file.slice(7) || "home"}`, b64(`reports/phone-fixes-v1/before/${file}.png`), await page.screenshot(), ["before (base build)", "after"]);
    }
  });
});
