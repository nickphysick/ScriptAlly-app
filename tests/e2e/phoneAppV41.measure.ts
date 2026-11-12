/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone app v4.1 — THE MEASUREMENT (design-refs/phone-app-v4-1/), on the emulator harness account, at 390 × 844,
 * 360 × 740 and, for landscape, 740 × 360 (see LAND).
 *
 *   npm run e2e:emu -- tests/e2e/phoneAppV41.measure.ts --project=pixel     PA41-1…13 (Chromium)
 *   … --project=iphone                                                       the same, once, in WebKit
 *   PA41_DESKTOP=base|new … --project=measure                                PA41-14: the desktop at 1512, base then new
 *   PA41_MUTATE=<name>                                                       a mutation that must turn its lock red
 *   PA41_PAIRS=1 … --project=pixel                                           ref-beside-built shots into reports/…/pairs
 *   PA41_ONLY=<group>                                                        one describe: today · view · sizes · motion
 *
 * ⚠️ NOTHING HERE WRITES. Local storage's once-a-day replay keys are cleared where a lock needs a replay.
 * ⚠️ READINGS ARE ON THE VISIBLE PAGE: every workspace page stays mounted, so each probe scopes to what is visible.
 */
import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { openRoute } from "./measure";

const DIR = "reports/phone-app-v4-1";
const MUT = process.env.PA41_MUTATE ?? "";
const PHONES = [{ width: 390, height: 844 }, { width: 360, height: 740 }] as const;
/* ⚠️ NOT 844 × 390: at 768px wide and up the app is the desktop (useIsMobile), so a landscape phone wider than that is
   served the desktop page and never reaches this view. The landscape layout is measured where a landscape phone is
   under 768 wide (740 × 360, a 360-wide Android turned). See the report's false premises. */
const LAND = { width: 740, height: 360 } as const;
const WK_PHONE = { width: 390, height: 664 } as const;
const isWebKit = (page: Page) => page.context().browser()?.browserType().name() === "webkit";
const isPhoneProject = (name: string) => name === "pixel" || name === "iphone";
const tag = (v: { width: number; height: number }) => `${v.width}x${v.height}`;
const OTHER = !!process.env.PA41_DESKTOP || !!process.env.PA41_PAIRS;
const only = (g: string) => OTHER || (!!process.env.PA41_ONLY && process.env.PA41_ONLY !== g);

/* ── the ledger ── */
type Row = { lock: string; where: string; ok: boolean; detail: string };
class Ledger {
  rows: Row[] = [];
  constructor(public name: string) {}
  check(lock: string, where: string, ok: boolean, detail: string) { this.rows.push({ lock, where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${this.name}${MUT ? `.mut-${MUT}` : ""}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 40)) console.log(`  ✗ ${r.lock} · ${r.where} — ${r.detail}`);
    console.log(`  ${this.name}: ${this.rows.length} readings, ${this.rows.filter((r) => !r.ok).length} red`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.lock} · ${r.where} — ${r.detail}`)).toEqual([]);
  }
}

/* ── signing in and opening a page (as v4's spec: WebKit signs in on a side page and is never resized) ── */
async function signIn(page: Page) {
  page.setDefaultTimeout(45_000);
  try { await openRoute(page, "/dashboard", { width: 1440, height: 900 }); }
  catch { await page.locator("#au-pw").press("Enter"); await page.waitForTimeout(4000); await openRoute(page, "/dashboard", { width: 1440, height: 900 }); }
  page.setDefaultTimeout(20_000);
}
test.beforeEach(async ({ context }, info) => {
  if (info.project.name !== "iphone") return;
  const p = await context.newPage(); await signIn(p); await p.close();
});
const signed = new WeakSet<Page>();
async function openPhone(page: Page, path: string, vp: { width: number; height: number }) {
  const wk = isWebKit(page);
  if (!wk && !signed.has(page)) { await signIn(page); signed.add(page); }
  if (!wk) await page.setViewportSize(vp);
  await go(page, path);
}
async function go(page: Page, path: string) {
  await page.goto(path);
  await page.locator('[data-pa4="tabbar"], [data-pa41="birds-view"].land').first().waitFor({ timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1400);
  await mutate(page);
}
async function press(page: Page, sel: string, timeout = 15_000) {
  const loc = page.locator(sel).filter({ visible: true }).first();
  if (isWebKit(page)) { await loc.waitFor({ state: "visible", timeout }); await loc.dispatchEvent("click"); } else await loc.click({ timeout });
  await page.waitForTimeout(700);
}
const stageTo = (page: Page, y: number) => page.evaluate((yy) => { document.getElementById("app-stage-scroll")?.scrollTo({ top: yy, behavior: "instant" as ScrollBehavior }); }, y);
const stageTop = (page: Page) => page.evaluate(() => document.getElementById("app-stage-scroll")?.scrollTop ?? -1);
const clearReplays = (page: Page) => page.evaluate(() => { try { for (const k of ["pa41.birds-view.replayed", "pa41.birds-card.replayed"]) localStorage.removeItem(k); } catch { /* none */ } });
const markReplayed = (page: Page) => page.evaluate(() => { try { const d = new Date(); const t = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; for (const k of ["pa41.birds-view.replayed", "pa41.birds-card.replayed"]) localStorage.setItem(k, t); } catch { /* none */ } });

/** the mutations: each the smallest change that should turn exactly its own lock red */
async function mutate(page: Page) {
  if (!MUT) return;
  const css: Record<string, string> = {
    lap: ".pa4-today [data-pa41='lead'] .pa4-lapcard { margin-top: -56px !important; }",
    chips: ".pa41v-ctl .pa4-chip { min-height: 40px !important; height: 40px !important; } .pa41v-ctl .pa4-chip > span { height: 32px !important; }",
    motion: "@media (prefers-reduced-motion: reduce) { .pa41-line { animation: pa41-line 9s both !important; } .pa41v-bc, .pa41-bc { animation: pa41-pulse 1.8s infinite !important; } }",
    captureall: ".pa41v-body { touch-action: none !important; }",
    shared: "body { letter-spacing: 0.4px !important; }",
  };
  if (css[MUT]) await page.addStyleTag({ content: css[MUT] });
  await page.evaluate((m) => {
    const vis = (s: string) => [...document.querySelectorAll<HTMLElement>(s)].filter((e) => e.offsetParent || e.closest(".pa4-layer"));
    /* PA41-1: the header counts queries needing you instead of tasks */
    if (m === "queries") for (const n of vis('[data-pa41="need"]')) { const c = [...document.querySelectorAll<HTMLElement>('[data-pa41="card-count"][data-k="you"]')][0]; const q = c?.dataset.n ?? "1"; n.dataset.n = q; n.querySelector("span")!.lastChild!.textContent = ""; }
    /* PA41-2: the figure includes closed */
    if (m === "closed") for (const f of vis('[data-pa41="figure"]')) { f.dataset.n = String(Number(f.dataset.n) + 18); f.textContent = f.dataset.n; }
    /* PA41-3: month on month */
    /* month on month: the change read four weeks back; where the week's change is hidden (0), the month's is shown */
    if (m === "month") {
      const ch = document.querySelector<HTMLElement>('[data-pa41="chart"]');
      const s = (ch?.dataset.series ?? "").split(",").map(Number);
      const mm = s[s.length - 1] - s[Math.max(0, s.length - 5)] || 1;
      let c = vis('[data-pa41="change"]')[0];
      if (!c) { c = document.createElement("span"); c.dataset.pa41 = "change"; vis(".pa41-cap")[0]?.appendChild(c); }
      c.dataset.n = String(mm); c.textContent = `▲ ${mm} on last month`;
    }
    if (m === "figure") for (const b of document.querySelectorAll<HTMLElement>('[data-pa4="mini"]')) { const x = document.createElement("span"); x.textContent = "70"; b.insertBefore(x, b.lastElementChild); }
    if (m === "byname") for (const body of vis('[data-pa41="card-rows"]')) { const rs = [...body.querySelectorAll<HTMLElement>('[data-pa41="card-row"]')]; rs.sort((a, b) => (a.querySelector("b")?.textContent ?? "").localeCompare(b.querySelector("b")?.textContent ?? "")); for (const r of rs) body.appendChild(r); }
    if (m === "recompute") for (const b of document.querySelectorAll<HTMLElement>('[data-pa41="cur"]')) b.dataset.from = String(Number(b.dataset.from) + 3 * 86400000);
    if (m === "twobuttons") for (const c of document.querySelectorAll<HTMLElement>('[data-pa41="vrow"].open [data-cta="1"]')) c.after(c.cloneNode(true));
    if (m === "nofold") for (const f of document.querySelectorAll<HTMLElement>('[data-pa41="fold"]')) f.remove();
    if (m === "overdue") for (const g of document.querySelectorAll<HTMLElement>(".pa41v-gt")) if (/Past its date/.test(g.textContent ?? "")) g.textContent = "Overdue";
  }, MUT);
}

/* ══ PA41-1 one count · PA41-2 figure · PA41-3 week · PA41-4 axis · PA41-5 pinned · PA41-6 card ══ */
test.describe("PA41 Today", () => {
  test.skip(only("today"), "another mode");
  test("PA41-1 · 2 · 3 · 4 · 5 · 6", async ({ page }, info) => {
    test.skip(!isPhoneProject(info.project.name), "phone projects only");
    test.setTimeout(900_000);
    const L = new Ledger(`today-${info.project.name}`);
    const vps = isWebKit(page) ? [WK_PHONE] : PHONES;
    for (const vp of vps) {
      const at = tag(vp);
      await openPhone(page, "/dashboard", vp);
      await markReplayed(page);
      /* PA41-1: the need pill = the task rows = "1 of N" = the Today tab's count */
      const one = await page.evaluate(() => {
        const t = [...document.querySelectorAll<HTMLElement>('[data-pa4="today"]')].find((e) => e.offsetParent);
        const need = Number(t?.querySelector<HTMLElement>('[data-pa41="need"]')?.dataset.n ?? -1);
        const up = /of (\d+)/.exec(t?.querySelector('[data-pa4="up-pos"]')?.textContent ?? "")?.[1];
        const tab = /Today, (\d+)/.exec(document.querySelector('[data-pa4="tab"][data-tab="today"]')?.getAttribute("aria-label") ?? "")?.[1];
        return { need, up: up ? Number(up) : -2, tab: tab ? Number(tab) : -3, rows: Number(t?.dataset.tasks ?? -4) };
      });
      L.check("PA41-1", `${at} · tasks on the board (population)`, one.rows > 0, JSON.stringify(one));
      L.check("PA41-1", `${at} · need pill = task rows = Up next's N = the tab`, one.need === one.rows && one.up === one.rows && one.tab === one.rows, JSON.stringify(one));
      /* PA41-2: the figure = the card's three counts = Queries' open courts (All less Closed) */
      const fig = await page.evaluate(() => {
        const n = Number(document.querySelector<HTMLElement>('[data-pa41="figure"]')?.dataset.n ?? -1);
        const sum = [...document.querySelectorAll<HTMLElement>('[data-pa41="card-count"]')].filter((e) => e.offsetParent).reduce((s, e) => s + Number(e.dataset.n), 0);
        return { n, sum };
      });
      await go(page, "/queries");
      await press(page, '[data-pa4="view"][data-k="list"]');
      const chips = await page.evaluate(() => { const c = (k: string) => Number([...document.querySelectorAll<HTMLElement>(`[data-pa4="chip"][data-k="${k}"]`)].find((e) => e.offsetParent)?.dataset.count ?? -1); return { all: c("all"), closed: c("closed") }; });
      L.check("PA41-2", `${at} · open queries (population)`, chips.all - chips.closed > 0, JSON.stringify(chips));
      L.check("PA41-2", `${at} · figure = card counts = open courts`, fig.n === fig.sum && fig.n === chips.all - chips.closed, `${JSON.stringify(fig)} · ${JSON.stringify(chips)}`);
      await go(page, "/dashboard");
      /* PA41-3: the change = this week's close − last week's, from the series the chart draws */
      const wk = await page.evaluate(() => {
        const ch = document.querySelector<HTMLElement>('[data-pa41="chart"]');
        const s = (ch?.dataset.series ?? "").split(",").filter(Boolean).map(Number);
        const c = document.querySelector<HTMLElement>('[data-pa41="change"]');
        return { s: s.slice(-3), len: s.length, change: c ? Number(c.dataset.n) : null, d: s.length >= 2 ? s[s.length - 1] - s[s.length - 2] : null };
      });
      L.check("PA41-3", `${at} · the chart has a series (population ${wk.len} weeks)`, wk.len >= 2, JSON.stringify(wk));
      L.check("PA41-3", `${at} · change = last − previous (hidden at 0)`, wk.d === 0 ? wk.change === null : wk.change === wk.d, JSON.stringify(wk));
      /* PA41-4: nothing overlaps the month labels at rest */
      const ax = await page.evaluate(() => {
        const ms = [...document.querySelectorAll<HTMLElement>('[data-pa41="month"]')].filter((e) => e.offsetParent).map((e) => e.getBoundingClientRect());
        const lead = [...document.querySelectorAll<HTMLElement>('[data-pa41="lead"]')].find((e) => e.offsetParent)?.getBoundingClientRect();
        const mentor = [...document.querySelectorAll<HTMLElement>('[data-pa41="mentor"]')].find((e) => e.offsetParent)?.getBoundingClientRect();
        const hits: string[] = [];
        for (const m of ms) {
          for (const [x, y] of [[m.left + 2, m.top + m.height / 2], [m.left + m.width / 2, m.top + m.height / 2], [m.right - 2, m.top + m.height / 2]]) {
            const e = document.elementFromPoint(x, y) as HTMLElement | null;
            if (e && !e.closest('[data-pa41="months"]') && !e.closest(".pa41-ch") && !e.matches(".pa41-hd, .pa4-shadow")) hits.push(`${e.tagName}.${e.className}`.slice(0, 60));
          }
        }
        return { n: ms.length, lowest: ms.length ? Math.max(...ms.map((m) => m.bottom)) : 0, leadTop: lead?.top ?? 0, mentorRight: mentor?.right ?? 0, firstLeft: ms.length ? Math.min(...ms.map((m) => m.left)) : 0, hits };
      });
      L.check("PA41-4", `${at} · month labels (population ${ax.n})`, ax.n > 0, JSON.stringify(ax));
      L.check("PA41-4", `${at} · the first card starts below the months`, ax.leadTop >= ax.lowest, JSON.stringify(ax));
      L.check("PA41-4", `${at} · nothing over a month label; the first label clear of the Mentor`, ax.hits.length === 0 && ax.firstLeft >= ax.mentorRight - 2, JSON.stringify(ax));
      /* PA41-6: the card — at most five rows, past first then by due date, the today line through every row */
      await page.evaluate(() => document.querySelector('[data-pa41="birds-card"]')?.scrollIntoView({ block: "center", behavior: "instant" as ScrollBehavior }));
      await page.waitForTimeout(500);
      await mutate(page);
      const card = await page.evaluate(() => {
        const rs = [...document.querySelectorAll<HTMLElement>('[data-pa41="card-row"]')].filter((e) => e.offsetParent);
        const now = document.querySelector<HTMLElement>('[data-pa41="card-now"]')?.getBoundingClientRect();
        const rows = rs.map((r) => ({ past: r.dataset.past === "1", due: r.dataset.due ? Number(r.dataset.due) : Infinity, top: r.getBoundingClientRect().top, bottom: r.getBoundingClientRect().bottom, tr: r.querySelector(".pa41-be-tr")!.getBoundingClientRect() }));
        return { rows, now: now ? { top: now.top, bottom: now.bottom, x: now.left + now.width / 2 } : null };
      });
      const rs = card.rows;
      let ordered = true;
      for (let i = 1; i < rs.length; i++) {
        if (rs[i - 1].past !== rs[i].past) { if (!rs[i - 1].past) ordered = false; continue; }
        if (rs[i].due < rs[i - 1].due) ordered = false;
      }
      L.check("PA41-6", `${at} · card rows (population ${rs.length})`, rs.length > 0 && rs.length <= 5, String(rs.length));
      L.check("PA41-6", `${at} · past their date first, then by due date`, ordered, rs.map((r) => `${r.past ? "P" : ""}${r.due === Infinity ? "∞" : new Date(r.due).toISOString().slice(0, 10)}`).join(" "));
      L.check("PA41-6", `${at} · the today line meets every row`, !!card.now && rs.every((r) => card.now!.top <= r.tr.top && card.now!.bottom >= r.tr.bottom && card.now!.x >= r.tr.left && card.now!.x <= r.tr.right), JSON.stringify(card.now));
      /* PA41-5: past the header, the pinned bar is the tab's name and one search, on all four tabs */
      for (const [p, name] of [["/dashboard", "Today"], ["/queries", "Queries"], ["/agents", "Agents"], ["/you", "You"]] as const) {
        await go(page, p);
        await stageTo(page, 900); await page.waitForTimeout(600);
        await mutate(page);
        const bar = await page.evaluate(() => {
          const b = document.querySelector<HTMLElement>('[data-pa4="mini"]');
          return { on: b?.dataset.on, text: (b?.textContent ?? "").trim(), title: b?.querySelector('[data-pa41="mini-title"]')?.textContent?.trim() ?? "", buttons: b?.querySelectorAll("button").length ?? 0, search: b?.querySelectorAll('[aria-label="Search"]').length ?? 0 };
        });
        L.check("PA41-5", `${at} · ${p}`, bar.on === "1" && bar.text === name && bar.title === name && bar.buttons === 2 && bar.search === 1, JSON.stringify(bar));
      }
      if (isWebKit(page)) break;
    }
    L.done(isWebKit(page) ? 16 : 32);
  });
});

/* ══ PA41-7 engine · PA41-8 fold · PA41-9 pan · PA41-10 expand · PA41-13 words ══ */
const FIRST = (n: string) => n.trim().split(/\s+/)[0];
function expected(state: string, name: string): string | null {
  const f = FIRST(name);
  if (state === "offer") return "Record your answer";
  if (state === "nudge") return `I’ve nudged ${f}`;
  if (state === "quiet") return "Close this query";
  if (state === "agent") return `Log ${f}’s reply`;
  if (state === "materials") return "Mark (partial|full|revision) sent";
  return null;
}
async function touchDrag(page: Page, x0: number, y0: number, x1: number, y1: number) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: x0, y: y0 }] });
  for (let i = 1; i <= 12; i++) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x0 + ((x1 - x0) * i) / 12, y: y0 + ((y1 - y0) * i) / 12 }] });
    await page.waitForTimeout(16);
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await page.waitForTimeout(900);
}
test.describe("PA41 the view", () => {
  test.skip(only("view"), "another mode");
  test("PA41-7 · 8 · 9 · 10 · 13", async ({ page }, info) => {
    test.skip(!isPhoneProject(info.project.name), "phone projects only");
    test.setTimeout(900_000);
    const L = new Ledger(`view-${info.project.name}`);
    const vp = isWebKit(page) ? WK_PHONE : PHONES[0];
    await openPhone(page, "/dashboard", vp);
    await markReplayed(page);
    await go(page, "/queries");
    await press(page, '[data-pa4="view"][data-k="bird"]');
    await mutate(page);
    /* PA41-8: a long group shows five and "Show N more"; tapping it shows them all */
    const g = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-pa41="vgroup"]')].map((s) => ({ k: s.dataset.k!, n: Number(s.dataset.n), shown: s.querySelectorAll('[data-pa41="vrow"]').length, more: s.querySelector<HTMLElement>('[data-pa41="fold"]')?.textContent ?? null })));
    const big = g.find((x) => x.n > 5);
    L.check("PA41-8", `a group over five (population: ${g.map((x) => `${x.k} ${x.n}`).join(", ")})`, !!big, "");
    if (big) {
      L.check("PA41-8", `${big.k}: ${big.n} shows 5 and "Show ${big.n - 5} more"`, big.shown === 5 && big.more === `Show ${big.n - 5} more`, JSON.stringify(big));
      await press(page, `[data-pa41="vgroup"][data-k="${big.k}"] [data-pa41="fold"]`).catch(() => {});
      const after = await page.evaluate((k) => document.querySelectorAll(`[data-pa41="vgroup"][data-k="${k}"] [data-pa41="vrow"]`).length, big.k);
      L.check("PA41-8", `${big.k}: tapping shows all ${big.n}`, after === big.n, String(after));
    }
    for (const x of g.filter((y) => y.n > 5 && y.k !== big?.k)) await press(page, `[data-pa41="vgroup"][data-k="${x.k}"] [data-pa41="fold"]`).catch(() => {});
    /* PA41-13: no "overdue" or "late" in what the writer reads */
    const words = await page.evaluate(() => (document.querySelector('[data-pa41="birds-view"]') as HTMLElement)?.innerText ?? "");
    L.check("PA41-13", "the view's words (population)", words.length > 200, `${words.length} chars`);
    L.check("PA41-13", "no overdue, no late", !/\boverdue\b|\blate\b/i.test(words), (/.{30}(overdue|late).{30}/i.exec(words) ?? [""])[0]);
    /* PA41-7 (phone half): every row's current bar, by query */
    const phone = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll<HTMLElement>('[data-pa41="vrow"]')].map((r) => {
      const c = r.querySelector<HTMLElement>('[data-pa41="cur"]');
      return [r.dataset.id!, { from: Number(c?.dataset.from ?? NaN), to: Number(c?.dataset.to ?? NaN), past: [...r.querySelectorAll<HTMLElement>('[data-pa41="past"]')].map((p) => [Number(p.dataset.from), Number(p.dataset.to)]) }];
    })));
    /* PA41-9: a horizontal drag moves the track and not the page; a vertical drag scrolls the page and not the track */
    if (!isWebKit(page)) {
      /* a row's track in the middle of the screen (a drag that starts off-screen touches nothing) */
      const trk = page.locator('[data-pa41="vrow"] .pa41v-trk').filter({ visible: true }).nth(3);
      await trk.evaluate((e) => e.scrollIntoView({ block: "center", behavior: "instant" as ScrollBehavior }));
      await page.waitForTimeout(400);
      const box = await trk.boundingBox();
      const xAt = () => page.evaluate(() => Number(document.querySelector<HTMLElement>('[data-pa41="birds-view"]')?.dataset.x ?? NaN));
      if (box) {
        const y = box.y + box.height / 2, x = box.x + box.width / 2;
        const x0 = await xAt(), s0 = await stageTop(page);
        if (process.env.PA41_DEBUG) console.log("TA", JSON.stringify(await page.evaluate(([px, py]) => { const out: string[] = []; let e = document.elementFromPoint(px, py) as HTMLElement | null; while (e) { const cs = getComputedStyle(e); out.push(`${e.tagName}.${String(e.className).slice(0, 24)} ta=${cs.touchAction} ox=${cs.overflowX}`); e = e.parentElement; } return out; }, [x + 80, y])));
        if (process.env.PA41_DEBUG) await page.evaluate(() => { const w = window as unknown as { __pe: string[] }; w.__pe = []; for (const t of ["pointerdown", "pointermove", "pointerup", "pointercancel", "touchstart"]) document.addEventListener(t, (e) => { if (w.__pe.length < 40) w.__pe.push(`${t}:${(e.target as HTMLElement).className?.toString().slice(0, 30)}`); }, true); });
        await touchDrag(page, x + 80, y, x - 80, y);
        if (process.env.PA41_DEBUG) console.log("PE", JSON.stringify(await page.evaluate(() => (window as unknown as { __pe: string[] }).__pe)));
        await page.waitForTimeout(2000); /* the drag's inertia settles before the next reading */
        const x1 = await xAt(), s1 = await stageTop(page);
        L.check("PA41-9", "a horizontal drag moves the track, not the page", Math.abs(x1 - x0) > 40 && Math.abs(s1 - s0) < 4, `x ${x0}→${x1}, page ${s0}→${s1}`);
        await touchDrag(page, x, y + 120, x, y - 120);
        const x2 = await xAt(), s2 = await stageTop(page);
        L.check("PA41-9", "a vertical drag scrolls the page, not the track", Math.abs(x2 - x1) < 2 && s2 - s1 > 60, `x ${x1}→${x2}, page ${s1}→${s2}`);
      } else L.check("PA41-9", "a track on screen (population)", false, "none");
    }
    /* PA41-10: tap a top line → it opens with one filled button, the next step; tap again → it closes */
    const states = await page.evaluate(() => [...new Set([...document.querySelectorAll<HTMLElement>('[data-pa41="vrow"]')].map((r) => r.dataset.state!))]);
    L.check("PA41-10", `states to open (population ${states.join(", ")})`, states.length >= 2, "");
    for (const st of states.slice(0, 4)) {
      await press(page, `[data-pa41="vrow"][data-state="${st}"] [data-pa41="vtop"]`);
      await mutate(page);
      const o = await page.evaluate(() => {
        const open = [...document.querySelectorAll<HTMLElement>('[data-pa41="vrow"].open')];
        const r = open[0];
        const ctas = r ? [...r.querySelectorAll<HTMLElement>('[data-cta="1"]')].filter((e) => e.offsetParent) : [];
        return { open: open.length, name: r?.dataset.name ?? "", state: r?.dataset.state ?? "", ctas: ctas.map((c) => ({ t: c.textContent?.trim(), bg: getComputedStyle(c).backgroundColor, h: c.getBoundingClientRect().height })) };
      });
      const want = expected(o.state, o.name);
      L.check("PA41-10", `${st}: one row open, one navy button, the next step`, o.open === 1 && o.ctas.length === (want ? 1 : 0) && o.ctas.every((c) => c.bg === "rgb(42, 58, 82)" && c.h >= 55.5) && (!want || new RegExp(`^${want}$`).test(o.ctas[0]?.t ?? "")), `${JSON.stringify(o)} vs ${want}`);
      await press(page, `[data-pa41="vrow"].open [data-pa41="vtop"]`);
      const closed = await page.locator('[data-pa41="vrow"].open').count();
      L.check("PA41-10", `${st}: tapping again closes it`, closed === 0, String(closed));
    }
    /* PA41-7 (desktop half): the desktop Birds-eye view at 1512 — every open query's current bar starts on the same day,
       its earlier stages match, and its current bar ends on the same day (the desktop states the end in the bar's title) */
    if (!isWebKit(page)) {
      await page.setViewportSize({ width: 1512, height: 982 });
      await page.goto("/queries?view=calendar");
      await page.locator('[data-qc150="be-row"]').first().waitFor({ timeout: 30_000 });
      await page.waitForTimeout(2500);
      const desk = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll<HTMLElement>('[data-qc150="be-row"]')].map((r) => {
        const c = r.querySelector<HTMLElement>('[data-qc150="be-bar"]');
        return [r.dataset.id!, { from: Number(c?.dataset.from ?? NaN), title: c?.getAttribute("title") ?? "", past: [...r.querySelectorAll<HTMLElement>('[data-qc150="be-past"]')].map((p) => [Number(p.dataset.from), Number(p.dataset.to)]) }];
      })));
      const dm = (ms: number) => new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
      const ids = Object.keys(phone);
      let same = 0; const off: string[] = [];
      for (const id of ids) {
        const p = phone[id], d = desk[id];
        if (!d) { off.push(`${id}: not on the desktop`); continue; }
        const endWords = /→ (.+)$/.exec(d.title)?.[1]?.trim() ?? "";
        const ok = (Number.isNaN(p.from) && Number.isNaN(d.from)) || (p.from === d.from && dm(p.to) === endWords && JSON.stringify(p.past) === JSON.stringify(d.past));
        if (ok) same++; else off.push(`${id}: ${p.from}/${dm(p.to)} vs ${d.from}/${endWords}`);
      }
      L.check("PA41-7", `open queries on both (population ${ids.length} phone, ${Object.keys(desk).length} desktop)`, ids.length > 0 && ids.length === Object.keys(desk).length, "");
      L.check("PA41-7", "every current bar's start and end, and every earlier stage, equal the desktop's", off.length === 0 && same === ids.length, off.slice(0, 5).join(" | "));
    }
    L.done(isWebKit(page) ? 8 : 14);
  });
});

/* ══ PA41-11 sizes · PA41-12 motion ══ */
type Sweep = { smallText: string[]; smallTap: string[]; wide: string[]; texts: number };
const sweep = (page: Page): Promise<Sweep> => page.evaluate(() => {
  const roots = [...document.querySelectorAll<HTMLElement>('[data-pa41="header"], [data-pa41="birds-card"], [data-pa41="birds-view"]')].filter((e) => e.offsetParent);
  const vw = document.documentElement.clientWidth;
  const out: Sweep = { smallText: [], smallTap: [], wide: [], texts: 0 };
  const foreign = (e: Element) => !!e.closest('svg, [aria-hidden="true"]');
  for (const e of roots.flatMap((r) => [r, ...r.querySelectorAll<HTMLElement>("*")])) {
    const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
    if (r.width === 0 || r.height === 0 || cs.visibility === "hidden" || foreign(e)) continue;
    if (r.bottom < 0 || r.top > innerHeight) continue;
    if ([...e.childNodes].some((n) => n.nodeType === 3 && (n.textContent ?? "").trim())) { out.texts++; if (parseFloat(cs.fontSize) < 13.99) out.smallText.push(`${e.className} "${e.textContent?.trim().slice(0, 20)}" ${cs.fontSize}`); }
    if (e.matches("button, a[href], [role='button'], [role='tab'], input") && (r.width < 47.5 || r.height < 47.5)) out.smallTap.push(`${e.className || e.tagName} "${e.textContent?.trim().slice(0, 20)}" ${Math.round(r.width)}×${Math.round(r.height)}`);
    if (r.right > vw + 1) { let a = e.parentElement, sc = false; while (a) { const ov = getComputedStyle(a).overflowX; if (/auto|scroll|hidden|clip/.test(ov)) { sc = true; break; } a = a.parentElement; } if (!sc) out.wide.push(`${e.className} right ${Math.round(r.right)}`); }
  }
  return out;
});
test.describe("PA41 sizes and motion", () => {
  test.skip(only("sizes"), "another mode");
  test("PA41-11 · PA41-12", async ({ page }, info) => {
    test.skip(!isPhoneProject(info.project.name), "phone projects only");
    test.setTimeout(900_000);
    const L = new Ledger(`sizes-${info.project.name}`);
    const vps = isWebKit(page) ? [WK_PHONE] : [...PHONES, LAND];
    for (const vp of vps) {
      const at = tag(vp);
      await openPhone(page, "/dashboard", vp);
      await markReplayed(page);
      const screens: [string, () => Promise<void>][] = [
        ["Today header", async () => { await go(page, "/dashboard"); }],
        ["the card", async () => { await page.evaluate(() => document.querySelector('[data-pa41="birds-card"]')?.scrollIntoView({ block: "center", behavior: "instant" as ScrollBehavior })); }],
        ["the view", async () => { await go(page, "/queries?view=birds"); }],
        ["the view, a row open", async () => { await press(page, '[data-pa41="vtop"]'); }],
        ["the view at 6 months", async () => { await press(page, '[data-pa41="vrow"].open [data-pa41="vtop"]'); await press(page, '[data-pa41="zoom"][data-k="6m"]'); }],
      ];
      for (const [name, open] of vp === LAND ? screens.slice(2) : screens) {
        await open(); await page.waitForTimeout(700);
        const a = await sweep(page);
        L.check("PA41-11", `${at} · ${name} · population`, a.texts > 3, String(a.texts));
        L.check("PA41-11", `${at} · ${name} · text ≥ 14px`, a.smallText.length === 0, a.smallText.slice(0, 5).join(" | "));
        L.check("PA41-11", `${at} · ${name} · targets ≥ 48`, a.smallTap.length === 0, a.smallTap.slice(0, 5).join(" | "));
        if (name !== "the view, a row open") {
          await page.evaluate(() => { document.documentElement.style.fontSize = "20px"; }); await page.waitForTimeout(500);
          const b = await sweep(page);
          await page.evaluate(() => { document.documentElement.style.fontSize = ""; }); await page.waitForTimeout(300);
          L.check("PA41-11", `${at} · ${name} · nothing past the right edge at 125%`, b.wide.length === 0, b.wide.slice(0, 5).join(" | "));
        }
      }
      if (vp === LAND) {
        const land = await page.evaluate(() => ({ land: !!document.querySelector('[data-pa41="birds-view"].land'), tb: getComputedStyle(document.querySelector('[data-pa4="tabbar"]') as Element).display, names: Math.round(document.querySelector<HTMLElement>('[data-pa41="vrow"] .pa41v-top')?.getBoundingClientRect().width ?? 0) }));
        L.check("PA41-11", `${at} · landscape: the desktop layout (184px names, no tab bar)`, land.land && land.tb === "none" && Math.abs(land.names - 184) <= 1, JSON.stringify(land));
      }
    }
    /* PA41-12: with reduced motion nothing runs on the header, the card or the view, and the view opens settled */
    const vp = isWebKit(page) ? WK_PHONE : PHONES[0];
    if (!isWebKit(page)) await page.setViewportSize(vp);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await clearReplays(page);
    const running = () => page.evaluate(() => document.getAnimations().filter((a) => a.playState === "running" && (a as CSSAnimation).animationName?.startsWith("pa41")).map((a) => (a as CSSAnimation).animationName));
    await go(page, "/dashboard"); await page.waitForTimeout(400);
    L.check("PA41-12", "the header", (await running()).length === 0, (await running()).join(", "));
    await page.evaluate(() => document.querySelector('[data-pa41="birds-card"]')?.scrollIntoView({ block: "center", behavior: "instant" as ScrollBehavior })); await page.waitForTimeout(600);
    const card = await page.evaluate(() => document.querySelector<HTMLElement>('[data-pa41="birds-card"]')?.dataset.play);
    L.check("PA41-12", "the card: no replay, nothing running", card === "0" && (await running()).length === 0, `play ${card} · ${(await running()).join(", ")}`);
    const beacons = await page.locator('[data-pa41="beacon"]').count();
    L.check("PA41-12", "rings to stop (population)", beacons > 0, String(beacons));
    await go(page, "/queries?view=birds"); await page.waitForTimeout(800);
    const v = await page.evaluate(() => { const r = document.querySelector<HTMLElement>('[data-pa41="birds-view"]'); return { replay: r?.dataset.replay, pill: document.querySelector('[data-pa41="today-pill"]')?.textContent }; });
    L.check("PA41-12", "the view: opens settled on today, nothing running", v.replay === "done" && v.pill === "Today" && (await running()).length === 0, `${JSON.stringify(v)} · ${(await running()).join(", ")}`);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await clearReplays(page);
    await go(page, "/queries?view=birds"); await page.waitForTimeout(900);
    const ctl = await page.evaluate(() => document.querySelector<HTMLElement>('[data-pa41="birds-view"]')?.dataset.replay);
    L.check("PA41-12", "control: without the setting the view replays", ctl === "running", String(ctl));
    L.done(isWebKit(page) ? 18 : 40);
  });
});

/* ══ PA41-14 the desktop at 1512: Dashboard, Queries and the desktop Birds-eye, DOM- and pixel-identical to the base ══ */
test.describe("PA41-14 desktop", () => {
  test.skip(!process.env.PA41_DESKTOP, "set PA41_DESKTOP=base|new");
  test("capture, and compare against the base", async ({ page }, info) => {
    test.skip(info.project.name !== "measure", "the desktop project");
    test.setTimeout(300_000);
    const mode = process.env.PA41_DESKTOP!;
    const out = `${process.env.PA41_OUT ?? DIR}/desktop/${mode}`;
    mkdirSync(out, { recursive: true });
    const PAGES: [string, string][] = [["dashboard", "/dashboard"], ["queries", "/queries"], ["birds", "/queries?view=calendar"]];
    await openRoute(page, "/dashboard", { width: 1512, height: 982 });
    for (const [n, p] of PAGES) {
      await page.goto(p); await page.waitForTimeout(5000);
      await mutate(page);
      await page.addStyleTag({ content: "*{caret-color:transparent!important;animation:none!important;transition:none!important}" });
      await page.waitForTimeout(600);
      const dom = await page.evaluate(() => (document.querySelector(".sa-shellframe") ?? document.body).outerHTML.replace(/\s(style|data-loading)="[^"]*"/g, "").replace(/\sdata-at="\d{12,14}"/g, ' data-at="T"'));
      writeFileSync(`${out}/${n}.html`, dom);
      await page.screenshot({ path: `${out}/${n}.png` });
    }
    if (mode !== "new") { expect(true).toBe(true); return; }
    const L = new Ledger("desktop");
    for (const [n] of PAGES) {
      const a = `${DIR}/desktop/base/${n}`, b = `${DIR}/desktop/new/${n}`;
      if (!existsSync(`${a}.html`)) { L.check("PA41-14", n, false, "no base capture"); continue; }
      const da = readFileSync(`${a}.html`, "utf8"), db = readFileSync(`${b}.html`, "utf8");
      let first = -1; for (let i = 0; i < Math.max(da.length, db.length); i++) if (da[i] !== db[i]) { first = i; break; }
      L.check("PA41-14", `${n} DOM`, da === db, first < 0 ? `${da.length} chars, identical` : `differs at ${first}: …${da.slice(Math.max(0, first - 80), first + 80)}… ⇄ …${db.slice(Math.max(0, first - 80), first + 80)}…`);
      const px = await page.evaluate(async ([x, y]) => {
        const load = (s: string) => new Promise<HTMLImageElement>((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = s; });
        const [ia, ib] = await Promise.all([load(x), load(y)]);
        if (ia.width !== ib.width || ia.height !== ib.height) return -1;
        const c = (i: HTMLImageElement) => { const cv = document.createElement("canvas"); cv.width = i.width; cv.height = i.height; const g = cv.getContext("2d")!; g.drawImage(i, 0, 0); return g.getImageData(0, 0, i.width, i.height).data; };
        const pa = c(ia), pb = c(ib); let d = 0;
        for (let i = 0; i < pa.length; i += 4) if (pa[i] !== pb[i] || pa[i + 1] !== pb[i + 1] || pa[i + 2] !== pb[i + 2]) d++;
        return d;
      }, [`data:image/png;base64,${readFileSync(`${a}.png`).toString("base64")}`, `data:image/png;base64,${readFileSync(`${b}.png`).toString("base64")}`] as const);
      L.check("PA41-14", `${n} pixels`, px >= 0 && px <= 5000, `${px} pixels differ (v3's measured noise floor 4,891)`);
    }
    L.done(6);
  });
});

/* ══ the pairs: each ref beside the built screen ══ */
test.describe("PA41 pairs", () => {
  test.skip(!process.env.PA41_PAIRS, "set PA41_PAIRS=1");
  test("ref beside built", async ({ page }, info) => {
    test.skip(info.project.name !== "pixel", "Chromium");
    test.setTimeout(600_000);
    const out = `${DIR}/pairs`;
    mkdirSync(out, { recursive: true });
    /* the Today board: its two phones */
    await page.setViewportSize({ width: 1720, height: 1100 });
    await page.goto(`file://${resolve("design-refs/phone-app-v4-1/phone-today-v4-1.html")}`);
    await page.waitForTimeout(2500);
    await page.locator(".ph").nth(0).screenshot({ path: `${out}/01-today-rest-ref.png` });
    await page.locator(".ph").nth(1).screenshot({ path: `${out}/02-today-scrolled-ref.png` });
    await page.locator(".ph").nth(0).locator(".sc").evaluate((e) => { e.scrollTop = 700; });
    await page.waitForTimeout(2200);
    await page.locator(".ph").nth(0).screenshot({ path: `${out}/03-today-card-ref.png` });
    /* the prototype at 390 × 844: mid-replay, settled, a row open, 6 months; then landscape */
    const proto = `file://${resolve("design-refs/phone-app-v4-1/phone-birds-eye-v1.html")}`;
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(proto); await page.waitForTimeout(2000);
    await page.screenshot({ path: `${out}/04-birds-replay-ref.png` });
    await page.waitForTimeout(3500);
    await page.screenshot({ path: `${out}/05-birds-ref.png` });
    await page.locator(".row .top").first().click(); await page.waitForTimeout(800);
    await page.screenshot({ path: `${out}/06-birds-open-ref.png` });
    await page.locator(".row.open .top").click(); await page.locator('.chip[data-z="182"]').click(); await page.waitForTimeout(800);
    await page.screenshot({ path: `${out}/07-birds-6m-ref.png` });
    await page.setViewportSize(LAND); await page.goto(proto); await page.waitForTimeout(5500);
    await page.screenshot({ path: `${out}/08-birds-landscape-ref.png` });
    /* built */
    await openPhone(page, "/dashboard", { width: 375, height: 780 });
    await markReplayed(page);
    await go(page, "/dashboard"); await page.screenshot({ path: `${out}/01-today-rest-built.png` });
    await stageTo(page, 560); await page.waitForTimeout(700); await page.screenshot({ path: `${out}/02-today-scrolled-built.png` });
    await page.evaluate(() => document.querySelector('[data-pa41="birds-card"]')?.scrollIntoView({ block: "start", behavior: "instant" as ScrollBehavior })); await page.waitForTimeout(700);
    await page.screenshot({ path: `${out}/03-today-card-built.png` });
    await page.setViewportSize({ width: 390, height: 844 });
    await clearReplays(page);
    await go(page, "/queries?view=birds"); await page.waitForTimeout(600);
    await page.screenshot({ path: `${out}/04-birds-replay-built.png` });
    await page.waitForTimeout(3600);
    await page.screenshot({ path: `${out}/05-birds-built.png` });
    await press(page, '[data-pa41="vtop"]'); await page.screenshot({ path: `${out}/06-birds-open-built.png` });
    await press(page, '[data-pa41="vrow"].open [data-pa41="vtop"]'); await press(page, '[data-pa41="zoom"][data-k="6m"]');
    await page.screenshot({ path: `${out}/07-birds-6m-built.png` });
    await page.setViewportSize(LAND); await go(page, "/queries?view=birds"); await page.waitForTimeout(800);
    await page.screenshot({ path: `${out}/08-birds-landscape-built.png` });
  });
});
