/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone app v5 — THE MEASUREMENT (design-refs/phone-app-v5/), on the emulator harness account, at 390 × 844 and
 * 360 × 740. Landscape: 844 × 390 is asserted to BE THE DESKTOP (the app's one breakpoint is 768px wide), and the phone
 * landscape layout is measured at 740 × 360, as v4.1 did — see the report's false premises.
 *
 *   npm run e2e:emu -- tests/e2e/phoneAppV5.measure.ts --project=pixel        PA5-1…14 (Chromium)
 *   … --project=iphone                                                          the phone locks once in WebKit (CDP-only parts skipped)
 *   PA5_DESKTOP=base|new … --project=measure                                    PA5-15: the desktop at 1512, base then new
 *   PA5_MUTATE=<name>[,<name>…]                                                 each named mutation runs as its OWN test, on a fresh
 *                                                                               page, and must turn its own lock red
 *   PA5_PAIRS=1 … --project=pixel                                               ref-beside-built shots into reports/…/pairs
 *   PA5_ONLY=<group>                                                            one group: today · reach · view · todo · gaps · materials · sizes · words
 *
 * ⚠️ TWO LOCKS WRITE, AND EACH UNDOES IN THE SAME RUN THROUGH THE APP'S OWN UNDO (PA5-10: a task marked done; PA5-11: one
 *    gap filled). Nothing navigates between a commit and its Undo; each checks the emulator document is back as it was.
 * ⚠️ READINGS ARE ON THE VISIBLE PAGE: every workspace page stays mounted, so each probe scopes to what is visible.
 * ⚠️ Data states (six queries all sent this week, one query, the campaign states) come from the DEV-ONLY review aid
 *    `window.__SA_PA5_BE = { now, ids }` in TodayV5, which feeds the block's own derivations a subset of the harness's
 *    queries at an earlier "now" — chosen here, from tests/emulator-seed/harness.json, among queries with nothing
 *    recorded after that "now". Nothing is faked in the DOM.
 */
import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { openRoute, KILL_MOTION_ID } from "./measure";
import { packageMetrics, resolveActivePackage } from "../../src/lib/packageMetrics";
import type { Manuscript, Query, SubmissionPackage } from "../../src/types";

const DIR = process.env.PA5_OUT ?? "reports/phone-app-v5";
const MUTS = (process.env.PA5_MUTATE ?? "").split(",").map((s) => s.trim()).filter(Boolean);
let MUT = "";
const PHONES = [{ width: 390, height: 844 }, { width: 360, height: 740 }] as const;
const LAND = { width: 740, height: 360 } as const;
const WIDE_LAND = { width: 844, height: 390 } as const;
const WK_PHONE = { width: 390, height: 664 } as const;
const isWebKit = (page: Page) => page.context().browser()?.browserType().name() === "webkit";
const isPhoneProject = (name: string) => name === "pixel" || name === "iphone";
const tag = (v: { width: number; height: number }) => `${v.width}x${v.height}`;
const OTHER = !!process.env.PA5_DESKTOP || !!process.env.PA5_PAIRS;
const skipGroup = (g: string) => OTHER || (!!process.env.PA5_ONLY && !process.env.PA5_ONLY.split(",").includes(g));
const DAY = 86_400_000;
const BE_FEW_LINE = "Each query you log gets a line here. The bar fills as the days pass.";

/* ── the harness on the emulator (Firestore REST, owner token: emulator only) ── */
const HARNESS = JSON.parse(readFileSync("tests/emulator-seed/harness.json", "utf8")) as { uid: string; docs: Record<string, Record<string, unknown>> };
const UID = HARNESS.uid;
const FS = "http://127.0.0.1:8085/v1/projects/demo-scriptally/databases/(default)/documents";
type FsVal = Record<string, unknown>;
function dec(v: FsVal): unknown {
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return Number(v.doubleValue);
  if ("booleanValue" in v) return v.booleanValue;
  if ("nullValue" in v) return null;
  if ("timestampValue" in v) return v.timestampValue;
  if ("mapValue" in v) return decMap(((v.mapValue as { fields?: Record<string, FsVal> }).fields) ?? {});
  if ("arrayValue" in v) return (((v.arrayValue as { values?: FsVal[] }).values) ?? []).map(dec);
  return undefined;
}
const decMap = (f: Record<string, FsVal>) => Object.fromEntries(Object.entries(f).map(([k, x]) => [k, dec(x)]));
async function fsGet(path: string): Promise<Record<string, unknown> | null> {
  const r = await fetch(`${FS}/users/${UID}/${path}`, { headers: { Authorization: "Bearer owner" } });
  if (!r.ok) return null;
  return decMap(((await r.json()) as { fields?: Record<string, FsVal> }).fields ?? {});
}
async function fsList(path: string): Promise<Record<string, unknown>[]> {
  const out: Record<string, unknown>[] = [];
  let token = "";
  for (let i = 0; i < 20; i++) {
    const r = await fetch(`${FS}/users/${UID}/${path}?pageSize=300${token ? `&pageToken=${token}` : ""}`, { headers: { Authorization: "Bearer owner" } });
    if (!r.ok) break;
    const j = (await r.json()) as { documents?: { name: string; fields?: Record<string, FsVal> }[]; nextPageToken?: string };
    for (const d of j.documents ?? []) out.push({ id: d.name.split("/").pop(), ...decMap(d.fields ?? {}) });
    if (!j.nextPageToken) break;
    token = j.nextPageToken;
  }
  return out;
}
async function fsPatch(path: string, fields: Record<string, number | null>): Promise<void> {
  const mask = Object.keys(fields).map((k) => `updateMask.fieldPaths=${k}`).join("&");
  const body = { fields: Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== null).map(([k, v]) => [k, { integerValue: String(v) }])) };
  await fetch(`${FS}/users/${UID}/${path}?${mask}`, { method: "PATCH", headers: { Authorization: "Bearer owner", "Content-Type": "application/json" }, body: JSON.stringify(body) });
}

/* ── the data states, picked from the harness: queries with nothing recorded after the chosen "now" ── */
const tsMs = (x: unknown): number => {
  if (!x) return 0;
  if (typeof x === "object" && x && "__ts" in x) return ((x as { __ts: number[] }).__ts[0]) * 1000;
  if (typeof x === "string") { const t = Date.parse(/T/.test(x) ? x : `${x}T12:00:00Z`); return Number.isFinite(t) ? t : 0; }
  return 0;
};
const H_QUERIES = Object.entries(HARNESS.docs).filter(([k]) => /^users\/[^/]+\/queries\/[^/]+$/.test(k)).map(([k, v]) => ({ id: k.split("/").pop()!, ...v } as Record<string, unknown> & { id: string }));
const LAST_EVENT = (() => {
  const m = new Map<string, number>();
  const bump = (q: string, t: number) => m.set(q, Math.max(m.get(q) ?? 0, t));
  for (const [k, v] of Object.entries(HARNESS.docs)) {
    if (/\/activities\//.test(k) && typeof v.queryId === "string") bump(v.queryId, tsMs(v.date));
    const sub = /^users\/[^/]+\/queries\/([^/]+)\/activity\//.exec(k);
    if (sub) bump(sub[1], Math.max(tsMs(v.createdAt), tsMs(v.date)));
  }
  for (const q of H_QUERIES) bump(q.id, Math.max(tsMs(q.lastStatusChange), tsMs(q.dateSent)));
  return m;
})();
const CLOSED = new Set(["Rejected", "Withdrawn", "No Response", "Signed", "Closed"]);
/** queries sent in [now − days, now] with nothing recorded after `now`, still open */
function sentWithin(nowMs: number, days: number): string[] {
  return H_QUERIES.filter((q) => { const s = tsMs(q.dateSent); return s >= nowMs - days * DAY && s <= nowMs && (LAST_EVENT.get(q.id) ?? 0) <= nowMs && !CLOSED.has(String(q.status)); }).map((q) => q.id);
}
const WEEK_NOW = Date.UTC(2026, 8, 26, 12);
const SIX = sentWithin(WEEK_NOW, 7);
const ONE_NOW = Date.UTC(2026, 8, 25, 12);
const ONE = ["probe-goalstress-today"];
const NEW_NOW = Date.UTC(2026, 8, 22, 12);
const BRAND_NEW = sentWithin(NEW_NOW, 7);

/* ── the ledger ── */
type Row = { lock: string; where: string; ok: boolean; detail: string };
class Ledger {
  rows: Row[] = [];
  constructor(public name: string) {}
  check(lock: string, where: string, ok: boolean, detail: string) { this.rows.push({ lock, where, ok: !!ok, detail }); }
  /** a green run: the floor of readings, and no red. A mutation run: its own lock must have gone red. */
  done(floor: number, mutLock?: string) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${this.name}${MUT ? `.mut-${MUT}` : ""}.json`, JSON.stringify(this.rows, null, 1));
    const red = this.rows.filter((x) => !x.ok);
    for (const r of red.slice(0, 40)) console.log(`  ✗ ${r.lock} · ${r.where} — ${r.detail.slice(0, 400)}`);
    console.log(`  ${this.name}${MUT ? ` [mut ${MUT}]` : ""}: ${this.rows.length} readings, ${red.length} red`);
    if (MUT) {
      const own = red.filter((r) => r.lock === mutLock).length;
      console.log(`  MUTATION ${MUT} → ${mutLock}: ${own} red (${red.length - own} elsewhere)`);
      writeFileSync(`${DIR}/ledger/mut-${MUT}.summary.json`, JSON.stringify({ mut: MUT, lock: mutLock, own, other: red.length - own, readings: this.rows.length }, null, 1));
      expect(own, `mutation ${MUT} must turn ${mutLock} red`).toBeGreaterThan(0);
      return;
    }
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(red.map((r) => `${r.lock} · ${r.where} — ${r.detail.slice(0, 300)}`)).toEqual([]);
  }
}

/* ── signing in and opening a page (as v4.1's: WebKit signs in on a side page and is never resized) ── */
async function signIn(page: Page) {
  page.setDefaultTimeout(45_000);
  try { await openRoute(page, "/dashboard", { width: 1440, height: 900 }); }
  catch { await page.locator("#au-pw").press("Enter"); await page.waitForTimeout(4000); await openRoute(page, "/dashboard", { width: 1440, height: 900 }); }
  page.setDefaultTimeout(20_000);
}
test.beforeEach(async ({ context, page }, info) => {
  await page.addInitScript(() => {
    const w = window as unknown as { __v: (s: string, r?: ParentNode) => HTMLElement[] };
    w.__v = (s, r = document) => [...r.querySelectorAll<HTMLElement>(s)].filter((e) => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== "hidden");
  });
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
async function go(page: Page, path: string, wait = '[data-pa5="dock"], [data-pa5="birds-view"].land') {
  await page.goto(path);
  await page.locator(wait).first().waitFor({ timeout: 30_000 });
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
const REPLAY_KEYS = ["pa41.birds-view.replayed", "pa41.birds-card.replayed"];
const clearReplays = (page: Page) => page.evaluate((ks) => { try { for (const k of ks) localStorage.removeItem(k); } catch { /* none */ } }, REPLAY_KEYS);
const markReplayed = (page: Page) => page.evaluate((ks) => { try { const d = new Date(); const t = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; for (const k of ks) localStorage.setItem(k, t); } catch { /* none */ } }, REPLAY_KEYS);
/** the review aid, then a re-render of Today (a tab switch away and back) */
async function beAid(page: Page, aid: { now?: number; ids?: string[] } | null) {
  await page.evaluate((a) => { (window as unknown as { __SA_PA5_BE?: unknown }).__SA_PA5_BE = a ?? undefined; }, aid);
  await press(page, '[data-pa5="tab"][data-tab="activity"]');
  await press(page, '[data-pa5="tab"][data-tab="queries"]');
  await blockIntoView(page);
}
const blockIntoView = async (page: Page) => {
  await page.evaluate(() => document.querySelector('[data-pa5="be"]')?.scrollIntoView({ block: "start", behavior: "instant" as ScrollBehavior }));
  await page.waitForTimeout(500);
  /* the pinned slim bar and tab strip cover the top: bring the block below them */
  await page.evaluate(() => { const sc = document.getElementById("app-stage-scroll"); if (sc) sc.scrollTop -= 140; });
  await page.waitForTimeout(400);
};
async function touchDrag(page: Page, x0: number, y0: number, x1: number, y1: number, steps = 12) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: x0, y: y0 }] });
  for (let i = 1; i <= steps; i++) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x0 + ((x1 - x0) * i) / steps, y: y0 + ((y1 - y0) * i) / steps }] });
    await page.waitForTimeout(16);
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await page.waitForTimeout(900);
}

/* ══ the mutations: each the smallest change on the rendered page that should turn exactly its own lock red ══ */
const MUT_LOCK: Record<string, [string, string]> = {
  badge: ["today", "PA5-1"], nodiscover: ["reach", "PA5-2"], tabsaway: ["today", "PA5-3"], nofilter: ["today", "PA5-4"],
  window12: ["today", "PA5-5"], ring: ["today", "PA5-6"], lineabove: ["today", "PA5-7"], v41rows: ["view", "PA5-8"],
  recompute: ["view", "PA5-9"], swipedone: ["todo", "PA5-10"], direct: ["gaps", "PA5-11"], phoneresults: ["materials", "PA5-12"],
  shrinktabs: ["sizes", "PA5-13"], overdue: ["words", "PA5-14"], shared: ["desktop", "PA5-15"],
};
const CSS_MUT: Record<string, string> = {
  tabsaway: ".pa5-tabs { position: static !important; }",
  lineabove: ".pa5-be-now, .pa5bv-now { z-index: 60 !important; }",
  v41rows: ".pa5bv-top { min-height: 48px !important; height: 48px !important; }",
  nodiscover: "[data-pa5='discover-row'] { display: none !important; }",
  shrinktabs: ".pa5-tabs [data-pa5='tab'] { font-size: 12px !important; min-height: 36px !important; height: 36px !important; padding-top: 0 !important; padding-bottom: 0 !important; }",
  shared: "body { letter-spacing: 0.4px !important; }",
};
async function mutate(page: Page) {
  if (!MUT) return;
  if (CSS_MUT[MUT]) await page.addStyleTag({ content: CSS_MUT[MUT] });
  await page.evaluate((m) => {
    const w = window as unknown as { __pa5mut?: boolean; __v: (s: string) => HTMLElement[] };
    /* PA5-1: the badge on Today instead of To do */
    if (m === "badge") { const b = document.querySelector('[data-pa5="badge"]'); const t = document.querySelector('[data-pa5="dock-tab"][data-tab="today"] .pa5-dic'); if (b && t) t.appendChild(b); }
    /* PA5-4: a tap on a count does not reach the block */
    if (m === "nofilter" && !w.__pa5mut) { w.__pa5mut = true; window.addEventListener("click", (e) => { if ((e.target as HTMLElement).closest?.('[data-pa5="be-count"]')) { e.stopPropagation(); e.preventDefault(); } }, true); }
    /* PA5-5: the window fixed at 12 weeks with today at 60% (v4.1's card) — every positioned piece re-placed */
    if (m === "window12") for (const be of w.__v('[data-pa5="be"]')) {
      const f0 = Number(be.dataset.from), t0 = Number(be.dataset.to), now = f0 + ((t0 - f0) * Number((be.querySelector<HTMLElement>('[data-pa5="be-pill"]')?.style.left ?? "0").replace("%", ""))) / 100;
      const f1 = now - 0.6 * 84 * 86400000, t1 = now + 0.4 * 84 * 86400000;
      const re = (pct: number) => (((f0 + ((t0 - f0) * pct) / 100) - f1) / (t1 - f1)) * 100;
      for (const e of be.querySelectorAll<HTMLElement>(".pa5-be-tk > *")) {
        const l = parseFloat(e.style.left), wd = parseFloat(e.style.width);
        if (Number.isFinite(wd)) { const nl = re(l), nr = re(l + wd); e.style.left = `${nl}%`; e.style.width = `${Math.max(0, nr - nl)}%`; } else if (Number.isFinite(l)) e.style.left = `${re(l)}%`;
      }
      const pill = be.querySelector<HTMLElement>('[data-pa5="be-pill"]'); if (pill) pill.style.left = "60%";
      const line = be.querySelector<HTMLElement>('[data-pa5="be-now"]'); if (line) line.style.left = "calc(116px + (100% - 116px) * 0.6)";
    }
    /* PA5-6: a ring back on each past-date bar, at its notch */
    if (m === "ring") for (const n of w.__v('[data-pa5="be-notch"], [data-pa5="bv-notch"]')) {
      if (n.nextElementSibling?.classList.contains("pa5x-ring")) continue;
      const r = document.createElement("span"); r.className = "pa5x-ring";
      r.setAttribute("style", `position:absolute;left:${n.style.left || "0"};top:50%;width:14px;height:14px;margin:-7px 0 0 -7px;border:2px solid #2a3a52;border-radius:50%;box-sizing:border-box`);
      n.after(r);
    }
    /* PA5-9: the phone dates its own bars (each current stage three days later) */
    if (m === "recompute") for (const r of document.querySelectorAll<HTMLElement>('[data-pa5="be-row"], [data-pa5="bv-row"]')) if (r.dataset.from) r.dataset.from = String(Number(r.dataset.from) + 3 * 86400000);
    /* PA5-12: the phone counts its own result (every query sent with the package counted as asking for more) */
    if (m === "phoneresults") for (const c of document.querySelectorAll<HTMLElement>('[data-pa5="pkg-card"], [data-pa5="mat-header-pkg"]')) if (c.dataset.sent) c.dataset.requests = c.dataset.sent;
    /* PA5-14: a group labelled "Overdue" */
    if (m === "overdue") { const g = w.__v(".pa5bv-gt")[0]; if (g) g.textContent = "Overdue"; }
    /* PA5-10: a right swipe marks the task done (presses the journey's save the moment it opens) */
    if (m === "swipedone" && !w.__pa5mut) {
      w.__pa5mut = true;
      let x0 = 0;
      window.addEventListener("pointerdown", (e) => { x0 = e.clientX; }, true);
      window.addEventListener("pointerup", (e) => {
        const card = (e.target as HTMLElement).closest?.('[data-pa5="todo-card"]');
        if (!card || e.clientX - x0 < 60) return;
        const t0 = Date.now();
        const tick = () => { const b = document.querySelector<HTMLButtonElement>('[data-tdp="task"] [data-tdp="primary"]'); if (b) b.click(); else if (Date.now() - t0 < 3000) setTimeout(tick, 30); };
        setTimeout(tick, 30);
      }, true);
    }
  }, MUT);
}

/** a group's tests: the green run, then one test per mutation named for this group */
function group(name: string, title: string, fn: (page: Page, info: { project: { name: string } }) => Promise<void>) {
  test.describe(`PA5 ${name}`, () => {
    test.skip(skipGroup(name), "another mode");
    const muts = MUTS.filter((m) => MUT_LOCK[m]?.[0] === name);
    const runs = MUTS.length ? (process.env.PA5_GREEN ? ["", ...muts] : muts) : [""];
    for (const m of runs) {
      test(`${title}${m ? ` · mutation ${m}` : ""}`, async ({ page }, info) => {
        test.skip(!isPhoneProject(info.project.name), "phone projects only");
        test.setTimeout(1_200_000);
        MUT = m;
        try { await fn(page, info); } finally { MUT = ""; }
      });
    }
  });
}

/* ══ PA5-1 dock · PA5-3 tabs · PA5-4 filter · PA5-5 window · PA5-6 past date · PA5-7 line (the block) ══ */
group("today", "PA5-1 · 3 · 4 · 5 · 6 · 7", async (page, info) => {
  const L = new Ledger(`today-${info.project.name}`);
  const vps = isWebKit(page) ? [WK_PHONE] : PHONES;
  for (const vp of vps) {
    const at = tag(vp);
    await openPhone(page, "/dashboard", vp);
    await markReplayed(page);
    await go(page, "/dashboard");
    /* PA5-1: the dock's words, and the badge on To do = To do's tasks = the need pill */
    const dock = await page.evaluate(() => {
      const d = document.querySelector<HTMLElement>('[data-pa5="dock"]');
      const bs = [...(d?.querySelectorAll<HTMLElement>(":scope > button") ?? [])];
      const badges = [...(d?.querySelectorAll<HTMLElement>('[data-pa5="badge"]') ?? [])].map((b) => ({ tab: b.closest<HTMLElement>("[data-tab]")?.dataset.tab ?? "", n: Number(b.dataset.n) }));
      const need = (window as unknown as { __v: (s: string) => HTMLElement[] }).__v('[data-pa5="need"]')[0];
      const word = (b: HTMLElement) => { const c = b.cloneNode(true) as HTMLElement; c.querySelectorAll('[data-pa5="badge"]').forEach((x) => x.remove()); return (c.textContent ?? "").trim(); };
      return { words: bs.map(word), plus: bs[2]?.getAttribute("aria-label") ?? "", badges, need: need ? Number(need.dataset.n) : -1 };
    });
    await go(page, "/todo");
    const todoN = await page.evaluate(() => Number((window as unknown as { __v: (s: string) => HTMLElement[] }).__v('[data-pa5="todo"]')[0]?.dataset.n ?? -1));
    L.check("PA5-1", `${at} · the dock reads Today, To do, +, Materials, Profile`, JSON.stringify(dock.words) === JSON.stringify(["Today", "To do", "", "Materials", "Profile"]) && dock.plus === "Log a query", JSON.stringify(dock));
    L.check("PA5-1", `${at} · tasks (population)`, todoN > 0, String(todoN));
    L.check("PA5-1", `${at} · one badge, on To do = To do's tasks = the need pill`, dock.badges.length === 1 && dock.badges[0].tab === "todo" && dock.badges[0].n === todoN && dock.need === todoN, `${JSON.stringify(dock.badges)} · todo ${todoN} · need ${dock.need}`);

    /* PA41-3, carried: the change = the chart's last week − the one before (hidden when nothing moved) */
    await go(page, "/dashboard");
    const wk = await page.evaluate(() => {
      const v = (window as unknown as { __v: (s: string) => HTMLElement[] }).__v;
      const s = (v('[data-pa5="chart"]')[0]?.dataset.series ?? "").split(",").filter(Boolean).map(Number);
      const c = v('[data-pa5="change"]')[0];
      return { len: s.length, change: c ? Number(c.dataset.n) : null, d: s.length >= 2 ? s[s.length - 1] - s[s.length - 2] : null, fig: Number(v('[data-pa5="figure"]')[0]?.dataset.n ?? -1) };
    });
    L.check("PA41-3", `${at} · (kept) the change = last week − the one before (series of ${wk.len})`, wk.len >= 2 && (wk.d === 0 ? wk.change === null : wk.change === wk.d), JSON.stringify(wk));

    /* PA5-3: past the header the slim bar and the tab strip are both pinned, and stay pinned through every tab */
    for (const [path, page_, tabs] of [["/dashboard", "today", ["agents", "activity", "queries"]], ["/materials", "materials", ["letters", "versions", "comps", "packages"]]] as const) {
      await go(page, path);
      const mark = await page.evaluate(() => { const m = (window as unknown as { __v: (s: string) => HTMLElement[] }).__v('[data-pa5="tabs-mark"]')[0]; const sc = document.getElementById("app-stage-scroll")!; return m ? m.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop : -1; });
      await stageTo(page, mark + 240); await page.waitForTimeout(700);
      await mutate(page);
      const read = () => page.evaluate((pg) => {
        const v = (window as unknown as { __v: (s: string) => HTMLElement[] }).__v;
        const bar = document.querySelector<HTMLElement>('[data-pa5="mini"]'), strip = v(`[data-pa5="tabs"][data-page="${pg}"]`)[0];
        const b = bar?.getBoundingClientRect(), s = strip?.getBoundingClientRect();
        return { on: bar?.dataset.on, barTop: b ? Math.round(b.top) : null, barBottom: b ? Math.round(b.bottom * 10) / 10 : null, stripTop: s ? Math.round(s.top * 10) / 10 : null, scroll: document.getElementById("app-stage-scroll")?.scrollTop ?? -1 };
      }, page_);
      const r0 = await read();
      const pinned = (r: typeof r0) => r.on === "1" && r.barTop != null && r.barTop >= -1 && r.stripTop != null && r.barBottom != null && Math.abs(r.stripTop - r.barBottom) <= 1.5;
      L.check("PA5-3", `${at} · ${path} past the header: bar and tabs pinned`, pinned(r0), JSON.stringify(r0));
      for (const t of tabs) {
        await press(page, `[data-pa5="tabs"][data-page="${page_}"] [data-pa5="tab"][data-tab="${t}"]`);
        await mutate(page);
        const r = await read();
        L.check("PA5-3", `${at} · ${path} → ${t}: still pinned`, pinned(r), JSON.stringify(r));
      }
    }

    /* PA5-4: a count filters the rows to its group; again restores; a zero count is disabled */
    await go(page, "/dashboard");
    await press(page, '[data-pa5="tab"][data-tab="queries"]');
    await blockIntoView(page);
    await mutate(page);
    const blockRows = () => page.evaluate(() => (window as unknown as { __v: (s: string) => HTMLElement[] }).__v('[data-pa5="be-row"]').map((r) => ({ id: r.dataset.id!, court: r.dataset.court! })));
    const counts = await page.evaluate(() => (window as unknown as { __v: (s: string) => HTMLElement[] }).__v('[data-pa5="be-count"]').map((b) => ({ k: b.dataset.k!, n: Number(b.dataset.n), dis: (b as HTMLButtonElement).disabled })));
    const all0 = await blockRows();
    L.check("PA5-4", `${at} · counts and rows (population ${counts.map((c) => `${c.k} ${c.n}`).join(", ")}; ${all0.length} rows)`, counts.length === 3 && counts.some((c) => c.n > 0) && all0.length > 0, "");
    const fig = await page.evaluate(() => Number((window as unknown as { __v: (s: string) => HTMLElement[] }).__v('[data-pa5="figure"]')[0]?.dataset.n ?? -1));
    L.check("PA41-2", `${at} · (kept) the three counts add up to the header's active figure`, counts.reduce((a, c) => a + c.n, 0) === fig, `${counts.map((c) => c.n).join("+")} vs ${fig}`);
    const dues = await page.evaluate(() => (window as unknown as { __v: (s: string) => HTMLElement[] }).__v('[data-pa5="be-row"]').map((r) => (r.dataset.due ? Number(r.dataset.due) : Infinity)));
    L.check("PA5-4", `${at} · the rows, nearest their date first (${dues.length})`, dues.every((d, i) => i === 0 || d >= dues[i - 1]), dues.map((d) => (d === Infinity ? "∞" : new Date(d).toISOString().slice(0, 10))).join(" "));
    for (const c of counts.filter((x) => x.n > 0)) {
      await press(page, `[data-pa5="be-count"][data-k="${c.k}"]`);
      const f = await blockRows();
      const lab = await page.evaluate(() => (window as unknown as { __v: (s: string) => HTMLElement[] }).__v('[data-pa5="be-label"]')[0]?.textContent ?? "");
      L.check("PA5-4", `${at} · ${c.k}: only that group's rows (${Math.min(8, c.n)} of ${c.n})`, f.length === Math.min(8, c.n) && f.every((r) => r.court === c.k), `${f.length} rows · ${[...new Set(f.map((r) => r.court))].join(",")} · "${lab}"`);
      await press(page, `[data-pa5="be-count"][data-k="${c.k}"]`);
      const back = await blockRows();
      L.check("PA5-4", `${at} · ${c.k} again: every row back`, JSON.stringify(back) === JSON.stringify(all0), `${back.length} vs ${all0.length}`);
    }
    /* zero: the harness has no zero count, so the one-query state (the aid) gives two */
    await beAid(page, { now: ONE_NOW, ids: ONE });
    await mutate(page);
    const zero = await page.evaluate(() => (window as unknown as { __v: (s: string) => HTMLElement[] }).__v('[data-pa5="be-count"]').map((b) => ({ k: b.dataset.k!, n: Number(b.dataset.n), dis: (b as HTMLButtonElement).disabled })));
    const zs = zero.filter((z) => z.n === 0);
    L.check("PA5-4", `${at} · zero counts (population ${zs.length})`, zs.length > 0, JSON.stringify(zero));
    for (const z of zs) {
      await page.locator(`[data-pa5="be-count"][data-k="${z.k}"]`).filter({ visible: true }).first().click({ force: true }).catch(() => {});
      await page.waitForTimeout(400);
      const flt = await page.evaluate(() => (window as unknown as { __v: (s: string) => HTMLElement[] }).__v('[data-pa5="be"]')[0]?.dataset.filter ?? "?");
      L.check("PA5-4", `${at} · ${z.k} 0: disabled, and a tap filters nothing`, z.dis && flt === "", `disabled ${z.dis} · filter "${flt}"`);
    }

    /* PA5-5: six queries all sent this week — every bar ≥ 4px, today in the left half; one query — the explainer */
    await beAid(page, { now: WEEK_NOW, ids: SIX });
    await mutate(page);
    const six = await page.evaluate(() => {
      const be = (window as unknown as { __v: (s: string) => HTMLElement[] }).__v('[data-pa5="be"]')[0];
      const rows = [...(be?.querySelectorAll<HTMLElement>('[data-pa5="be-row"]') ?? [])];
      const line = be?.querySelector<HTMLElement>('[data-pa5="be-now"]')?.getBoundingClientRect();
      const tk = rows[0]?.querySelector<HTMLElement>(".pa5-be-tk")?.getBoundingClientRect();
      return { n: rows.length, bars: rows.map((r) => Math.round((r.querySelector<HTMLElement>('[data-pa5="be-solid"]')?.getBoundingClientRect().width ?? 0) * 10) / 10), lineX: line ? line.left + line.width / 2 : null, tk: tk ? { l: tk.left, w: tk.width } : null, few: !!be?.querySelector('[data-pa5="be-few"]') };
    });
    L.check("PA5-5", `${at} · six sent this week (population ${six.n}; picked ${SIX.length})`, SIX.length === 6 && six.n === 6, JSON.stringify(SIX));
    L.check("PA5-5", `${at} · every bar ≥ 4px`, six.bars.length === 6 && six.bars.every((b) => b >= 4), six.bars.join(", "));
    L.check("PA5-5", `${at} · today in the left half of the track`, !!six.tk && six.lineX != null && six.lineX < six.tk.l + six.tk.w / 2, JSON.stringify({ lineX: six.lineX, tk: six.tk }));
    L.check("PA5-5", `${at} · six: no explainer`, !six.few, String(six.few));
    await beAid(page, { now: ONE_NOW, ids: ONE });
    await mutate(page);
    const one = await page.evaluate(() => { const be = (window as unknown as { __v: (s: string) => HTMLElement[] }).__v('[data-pa5="be"]')[0]; return { n: be?.querySelectorAll('[data-pa5="be-row"]').length ?? -1, few: be?.querySelector('[data-pa5="be-few"]')?.textContent ?? null }; });
    L.check("PA5-5", `${at} · one query: one row and the explainer`, one.n === 1 && one.few === BE_FEW_LINE, JSON.stringify(one));
    await beAid(page, null);

    /* PA5-6: past its date — the notch at its date and a deeper segment from it to today; no ring anywhere */
    await mutate(page);
    const readPast = () => page.evaluate(() => {
      const be = (window as unknown as { __v: (s: string) => HTMLElement[] }).__v('[data-pa5="be"]')[0];
      const line = be?.querySelector<HTMLElement>('[data-pa5="be-now"]')?.getBoundingClientRect();
      const lx = line ? line.left + line.width / 2 : NaN;
      const f0 = Number(be?.dataset.from), t0 = Number(be?.dataset.to);
      const out = [...(be?.querySelectorAll<HTMLElement>('[data-pa5="be-row"][data-past="1"]') ?? [])].map((r) => {
        const tk = r.querySelector<HTMLElement>(".pa5-be-tk")!.getBoundingClientRect();
        const n = r.querySelector<HTMLElement>('[data-pa5="be-notch"]')?.getBoundingClientRect();
        const d = r.querySelector<HTMLElement>('[data-pa5="be-deep"]')?.getBoundingClientRect();
        const dueX = tk.left + tk.width * ((Number(r.dataset.due) - f0) / (t0 - f0));
        return { id: r.dataset.id, notch: n ? n.left + n.width / 2 : null, dueX, tkL: tk.left, before: Number(r.dataset.due) < f0, deepL: d?.left ?? null, deepR: d?.right ?? null, lx };
      });
      const rings = [...(be?.querySelectorAll<HTMLElement>(".pa5-be-tk *") ?? [])].filter((e) => { const cs = getComputedStyle(e); return parseFloat(cs.borderRadius) >= e.getBoundingClientRect().width / 2 - 0.5 && parseFloat(cs.borderTopWidth) > 0; }).length;
      const beacons = document.querySelectorAll('[data-pa41="beacon"], .pa41-bc, .pa41v-bc').length;
      return { out, rings, beacons };
    });
    /* the harness's block shows the eight nearest their date, all dated before the 9-week window; the open queries whose
       date passed in the last eight weeks (the aid, at today's date: the same rows, nothing else) fall inside it */
    /* the open queries whose date passed inside the last eight weeks (read off the full view, unfolded: the same engine) */
    await go(page, "/queries/all?view=birds");
    for (let i = 0; i < 6; i++) { const f = page.locator('[data-pa5="bv-fold"]').filter({ visible: true }).first(); if (!(await f.count())) break; await f.click().catch(() => {}); await page.waitForTimeout(300); }
    const recent = await page.evaluate(() => { const lo = Date.now() - 56 * 86400000; return [...document.querySelectorAll<HTMLElement>('[data-pa5="bv-row"][data-past="1"]')].filter((r) => Number(r.dataset.due) >= lo).map((r) => r.dataset.id!); });
    await go(page, "/dashboard");
    await press(page, '[data-pa5="tab"][data-tab="queries"]');
    for (const [st, aid] of [["the harness", null], [`the ${recent.length} past their date in the last eight weeks`, { ids: recent }]] as const) {
      await beAid(page, aid as { ids: string[] } | null);
      await mutate(page);
      const past = await readPast();
      const inWin = past.out.filter((p) => !p.before), before = past.out.filter((p) => p.before);
      L.check("PA5-6", `${at} · ${st} · rows past their date (population ${inWin.length} dated in the window, ${before.length} before it)`, past.out.length > 0, "");
      const badIn = inWin.filter((p) => !(p.notch != null && Math.abs(p.notch - p.dueX) <= 1.5 && p.deepL != null && p.deepR != null && Math.abs(p.deepL - p.notch) <= 1.5 && Math.abs(p.deepR - p.lx) <= 2));
      L.check("PA5-6", `${at} · ${st} · the notch at the date, the deeper segment from it to today`, badIn.length === 0, JSON.stringify(badIn.slice(0, 3)));
      const badBefore = before.filter((p) => !(p.notch == null && p.deepL != null && p.deepR != null && Math.abs(p.deepL - p.tkL) <= 1.5 && Math.abs(p.deepR - p.lx) <= 2));
      L.check("PA5-6", `${at} · ${st} · a date before the window: no notch, the deeper segment in from the edge to today`, badBefore.length === 0, JSON.stringify(badBefore.slice(0, 3)));
      L.check("PA5-6", `${at} · ${st} · no ring on a bar, no beacon anywhere`, past.rings === 0 && past.beacons === 0, JSON.stringify({ rings: past.rings, beacons: past.beacons }));
      if (aid) L.check("PA5-6", `${at} · ${st} · dated inside the window (population ${past.out.filter((p) => !p.before).length})`, past.out.some((p) => !p.before), "");
    }
    await beAid(page, null);

    /* PA5-7: the today line crosses no text; an opened row's detail covers it */
    const lineText = () => page.evaluate(() => {
      const be = (window as unknown as { __v: (s: string) => HTMLElement[] }).__v('[data-pa5="be"]')[0];
      const ln = be?.querySelector<HTMLElement>('[data-pa5="be-now"]')?.getBoundingClientRect();
      if (!be || !ln) return { texts: 0, hits: ["no line"] };
      const hits: string[] = []; let texts = 0;
      const tw = document.createTreeWalker(be, NodeFilter.SHOW_TEXT);
      for (let n = tw.nextNode(); n; n = tw.nextNode()) {
        if (!(n.textContent ?? "").trim()) continue;
        const el = n.parentElement!; const cs = getComputedStyle(el);
        if (cs.visibility === "hidden" || el.closest('[data-pa5="be-detail"]')) continue;
        texts++;
        const rg = document.createRange(); rg.selectNodeContents(n);
        for (const r of rg.getClientRects()) if (r.right > ln.left && r.left < ln.right && r.bottom > ln.top && r.top < ln.bottom && !el.closest('[data-pa5="be-pill"]')) hits.push(`"${(n.textContent ?? "").trim().slice(0, 20)}"`);
      }
      return { texts, hits };
    });
    const lt = await lineText();
    L.check("PA5-7", `${at} · text in the block (population ${lt.texts})`, lt.texts > 10, "");
    L.check("PA5-7", `${at} · the today line crosses no text`, lt.hits.length === 0, lt.hits.slice(0, 5).join(" "));
    /* open the row whose detail spans the line; read what is on top at the line (the line made hit-testable to ask) */
    const n0 = await page.evaluate(() => (window as unknown as { __v: (s: string) => HTMLElement[] }).__v('[data-pa5="be-row"]').length);
    let covered = 0, tried = 0;
    for (let i = 0; i < Math.min(n0, 3); i++) {
      await press(page, `[data-pa5="be"] [data-pa5="be-row"] >> nth=${i}`);
      await mutate(page);
      const c = await page.evaluate(() => {
        const s = document.createElement("style"); s.textContent = ".pa5-be-now { pointer-events: auto !important; }"; document.head.appendChild(s);
        const be = (window as unknown as { __v: (s: string) => HTMLElement[] }).__v('[data-pa5="be"]')[0];
        const ln = be?.querySelector<HTMLElement>('[data-pa5="be-now"]')?.getBoundingClientRect();
        const d = be?.querySelector<HTMLElement>('[data-pa5="be-detail"]')?.getBoundingClientRect();
        let top = "";
        if (ln && d) { const e = document.elementFromPoint(ln.left + ln.width / 2, d.top + d.height / 2) as HTMLElement | null; top = e?.closest('[data-pa5="be-detail"]') ? "detail" : e?.matches('[data-pa5="be-now"]') ? "line" : `${e?.tagName}.${e?.className}`; }
        s.remove();
        return { top, d: !!d, spans: !!(ln && d && ln.left > d.left && ln.right < d.right && ln.bottom > d.bottom) };
      });
      if (c.d && c.spans) { tried++; if (c.top === "detail") covered++; else L.check("PA5-7", `${at} · row ${i}: the detail covers the line`, false, c.top); }
      await press(page, `[data-pa5="be"] [data-pa5="be-row"] >> nth=${i}`);
    }
    L.check("PA5-7", `${at} · opened details over the line (population ${tried})`, tried > 0 && covered === tried, `${covered} of ${tried}`);
    if (isWebKit(page)) break;
  }
  L.done(isWebKit(page) ? 24 : 50, MUT_LOCK[MUT]?.[1]);
});

/* ══ PA5-2 reachable: every phone page the base reached is reached in v5 within three taps of a dock tab ══ */
type Reach = { page: string; dock: "today" | "todo" | "materials" | "profile"; taps: string[]; arrive: string };
const REACH: Reach[] = [
  { page: "Today (/dashboard)", dock: "today", taps: [], arrive: 'vis:[data-pa5="today"]' },
  { page: "To do's tasks (v4's tasks page)", dock: "todo", taps: [], arrive: 'vis:[data-pa5="todo"]' },
  { page: "A task's journey", dock: "todo", taps: ['[data-pa5="todo-verb"]'], arrive: 'vis:[data-tdp="task"]' },
  { page: "Queries list (/queries)", dock: "today", taps: ['[data-pa5="tab"][data-tab="queries"]', '[data-pa5="all-queries"]'], arrive: "path:/queries/all" },
  { page: "The Birds-eye view (/queries?view=birds)", dock: "today", taps: ['[data-pa5="tab"][data-tab="queries"]', '[data-pa5="be-foot"]'], arrive: 'vis:[data-pa5="birds-view"]' },
  { page: "A query's page", dock: "today", taps: ['[data-pa5="tab"][data-tab="queries"]', '[data-pa5="be-row"]', '[data-pa5="be-open"]'], arrive: 'vis:[data-pa4="qpage"]' },
  { page: "Agents (/agents)", dock: "today", taps: ['[data-pa5="tab"][data-tab="agents"]'], arrive: 'vis:[data-pa5="agents-tab"]' },
  { page: "Everyone on your list", dock: "today", taps: ['[data-pa5="tab"][data-tab="agents"]', '[data-pa5="see-all-agents"]'], arrive: 'vis:[data-pa4="agents-all"]' },
  { page: "An agent's card", dock: "today", taps: ['[data-pa5="tab"][data-tab="agents"]', '[data-pa4="fit-card"]'], arrive: 'vis:[data-pa4="asheet"]' },
  { page: "Log a query to an agent", dock: "today", taps: ['[data-pa5="tab"][data-tab="agents"]', '[data-pa4="fit-log"]'], arrive: 'vis:[data-pa3="plus-sheet"]' },
  { page: "Add an agent", dock: "today", taps: ['[data-pa5="tab"][data-tab="agents"]', '[data-pa5="see-all-agents"]', '[data-pa4="add-agent"]'], arrive: 'vis:[data-pa3="aname"]' },
  { page: "Discover (/agents/discover)", dock: "today", taps: ['[data-pa5="tab"][data-tab="agents"]', '[data-pa5="discover-row"]'], arrive: "path:/agents/discover" },
  { page: "Search", dock: "today", taps: ['[data-pa5="today-hd"] [data-pa4="search"]'], arrive: 'vis:[data-pa4="search-page"]' },
  { page: "Packages (/queries/packages)", dock: "materials", taps: ['[data-pa5="tab"][data-tab="packages"]'], arrive: 'vis:[data-pa5="mat-packages"]' },
  { page: "A package (?pkg=)", dock: "materials", taps: ['[data-pa5="tab"][data-tab="packages"]', '[data-pa5="pkg-card"]'], arrive: "search:pkg=" },
  { page: "The package builder (?build=new)", dock: "materials", taps: ['[data-pa5="tab"][data-tab="packages"]', '[data-pa5="pkg-new"]'], arrive: "search:build=new" },
  { page: "Query letters (/manuscripts#materials)", dock: "materials", taps: ['[data-pa5="tab"][data-tab="letters"]'], arrive: 'vis:[data-pa5="mat-letters"]' },
  { page: "A letter (?mat=)", dock: "materials", taps: ['[data-pa5="tab"][data-tab="letters"]', '[data-pa5="letter-sheet"]'], arrive: "search:mat=" },
  { page: "Versions (/manuscripts#versions)", dock: "materials", taps: ['[data-pa5="tab"][data-tab="versions"]'], arrive: 'vis:[data-pa5="mat-versions"], [data-pa5="versions-locked"]' },
  { page: "Comps (/manuscripts#comps)", dock: "materials", taps: ['[data-pa5="tab"][data-tab="comps"]'], arrive: 'vis:[data-pa5="mat-comps"]' },
  { page: "Profile (v4's You, /you)", dock: "profile", taps: [], arrive: 'vis:[data-pa5="profile"]' },
  { page: "Responses", dock: "profile", taps: ['[data-pa5="profile-row"][data-path="/queries/responses"]'], arrive: "path:/queries/responses" },
  { page: "The wall of no (#wall)", dock: "profile", taps: ['[data-pa4="open-wall"]'], arrive: "hash:#wall" },
  { page: "Analytics", dock: "profile", taps: ['[data-pa4="full-picture"]'], arrive: "path:/queries/analytics" },
  { page: "Goals", dock: "profile", taps: ['[data-pa4="streak-card"]'], arrive: "path:/goals" },
  { page: "Your book (/manuscripts)", dock: "profile", taps: ['[data-pa5="profile-row"][data-path="/manuscripts"]'], arrive: "path:/manuscripts" },
  { page: "Corkboard", dock: "profile", taps: ['[data-pa5="profile-row"][data-path="/todo/corkboard"]'], arrive: "path:/todo/corkboard" },
  { page: "Your notes", dock: "profile", taps: ['[data-pa5="your-notes-row"]'], arrive: "path:/your-notes" },
  { page: "Settings (/account)", dock: "profile", taps: ['[data-pa5="profile-row"][data-path="/account"]'], arrive: "path:/account" },
  { page: "An account section (/account/…)", dock: "profile", taps: ['[data-pa5="profile-row"][data-path="/account"]', '[data-pa3="acct-row"]'], arrive: "path:/account/" },
  { page: "Plans (/plans)", dock: "profile", taps: ['[data-pa5="profile-row"][data-path="/account"]', '[data-pa3="writer"]'], arrive: "path:/plans" },
  { page: "Help centre (/help)", dock: "profile", taps: ['[data-pa5="profile-row"][data-path="/account"]', 'text=Help centre'], arrive: "path:/help" },
  { page: "A help article (/help/…)", dock: "profile", taps: ['[data-pa5="profile-row"][data-path="/account"]', 'text=Help centre', '[data-pa="help-article"]'], arrive: "path:/help/" },
  { page: "Import (/import)", dock: "profile", taps: ['[data-pa5="profile-row"][data-path="/account"]', 'text=Import queries'], arrive: "path:/import" },
  { page: "Quick log (+)", dock: "today", taps: ['[data-pa4="plus"]'], arrive: 'vis:[data-pa3="plus-sheet"]' },
];
const DOCK_PATH = { today: "/dashboard", todo: "/todo", materials: "/materials", profile: "/you" } as const;
group("reach", "PA5-2", async (page, info) => {
  const L = new Ledger(`reach-${info.project.name}`);
  const vp = isWebKit(page) ? WK_PHONE : PHONES[0];
  await openPhone(page, "/dashboard", vp);
  await markReplayed(page);
  for (const r of REACH) {
    /* each from its dock tab, tapped in the dock (the page the tab opens is the root) */
    await go(page, "/dashboard");
    await press(page, `[data-pa5="dock-tab"][data-tab="${r.dock}"]`);
    await page.waitForTimeout(600);
    await mutate(page);
    let ok = true, why = "";
    for (const t of r.taps) {
      try {
        const loc = t.startsWith("text=") ? page.getByText(t.slice(5), { exact: true }).filter({ visible: true }).first() : page.locator(t).filter({ visible: true }).first();
        await loc.scrollIntoViewIfNeeded({ timeout: 6000 });
        if (isWebKit(page)) await loc.dispatchEvent("click"); else await loc.click({ timeout: 6000 });
        await page.waitForTimeout(900);
        await mutate(page);
      } catch { ok = false; why = `no ${t}`; break; }
    }
    if (ok) {
      const [kind, want] = [r.arrive.slice(0, r.arrive.indexOf(":")), r.arrive.slice(r.arrive.indexOf(":") + 1)];
      const u = new URL(page.url());
      if (kind === "path") ok = want.endsWith("/") ? u.pathname.startsWith(want) : u.pathname === want;
      else if (kind === "search") ok = u.search.includes(want);
      else if (kind === "hash") ok = u.hash === want;
      else ok = (await page.locator(want).filter({ visible: true }).count()) > 0;
      why = `${u.pathname}${u.search}${u.hash}`;
    }
    L.check("PA5-2", `${r.page}: ${r.taps.length} ${r.taps.length === 1 ? "tap" : "taps"} from ${r.dock}`, ok && r.taps.length <= 3, why);
    await page.keyboard.press("Escape").catch(() => {});
  }
  L.check("PA5-2", `the base's phone pages (population ${REACH.length})`, REACH.length >= 30, "");
  L.done(REACH.length + 1, MUT_LOCK[MUT]?.[1]);
});

/* ══ PA5-8 density · PA5-9 engine · PA5-6/7 in the full view · landscape ══ */
group("view", "PA5-8 · 9 · 6 · 7 (view) · landscape", async (page, info) => {
  const L = new Ledger(`view-${info.project.name}`);
  const vp = isWebKit(page) ? WK_PHONE : PHONES[0];
  await openPhone(page, "/dashboard", vp);
  await markReplayed(page);
  await press(page, '[data-pa5="tab"][data-tab="queries"]');
  await blockIntoView(page);
  await mutate(page);
  /* PA5-9 (block half): every row the block shows, unfiltered and in each group */
  const blockDates: Record<string, { from: number; to: number; pasts: string }> = {};
  const readBlock = async () => Object.assign(blockDates, await page.evaluate(() => Object.fromEntries((window as unknown as { __v: (s: string) => HTMLElement[] }).__v('[data-pa5="be-row"]').map((r) => [r.dataset.id!, { from: Number(r.dataset.from || NaN), to: Number(r.dataset.to || NaN), pasts: r.dataset.pasts ?? "" }]))));
  await readBlock();
  for (const k of ["you", "agent", "quiet"]) {
    const dis = await page.locator(`[data-pa5="be-count"][data-k="${k}"]`).filter({ visible: true }).first().isDisabled().catch(() => true);
    if (dis) continue;
    await press(page, `[data-pa5="be-count"][data-k="${k}"]`); await mutate(page); await readBlock();
    await press(page, `[data-pa5="be-count"][data-k="${k}"]`);
  }
  /* the block's drawn notch and solid start sit at the dates its row states (the bars are drawn from those dates) */
  const drawn = await page.evaluate(() => {
    const be = (window as unknown as { __v: (s: string) => HTMLElement[] }).__v('[data-pa5="be"]')[0];
    const f0 = Number(be?.dataset.from), t0 = Number(be?.dataset.to);
    const off: string[] = []; let n = 0;
    for (const r of be?.querySelectorAll<HTMLElement>('[data-pa5="be-row"]') ?? []) {
      const tk = r.querySelector<HTMLElement>(".pa5-be-tk")!.getBoundingClientRect();
      const x = (ms: number) => tk.left + tk.width * Math.max(0, Math.min(1, (ms - f0) / (t0 - f0)));
      const s = r.querySelector<HTMLElement>('[data-pa5="be-solid"]')?.getBoundingClientRect();
      if (s && r.dataset.from) { n++; if (Math.abs(s.left - x(Number(r.dataset.from))) > 1.5) off.push(`${r.dataset.id} start ${s.left.toFixed(1)} vs ${x(Number(r.dataset.from)).toFixed(1)}`); }
    }
    return { n, off };
  });
  L.check("PA5-9", `block: each bar drawn from its row's date (population ${drawn.n})`, drawn.n > 0 && drawn.off.length === 0, drawn.off.slice(0, 4).join(" | "));

  /* the full view */
  await press(page, '[data-pa5="be-foot"]');
  await page.locator('[data-pa5="birds-view"]').filter({ visible: true }).first().waitFor();
  await page.waitForTimeout(800);
  await mutate(page);
  /* PA41-8, carried: a group over five shows five and "Show N more" */
  const gs = await page.evaluate(() => (window as unknown as { __v: (s: string) => HTMLElement[] }).__v('[data-pa41="vgroup"]').map((g) => ({ k: g.dataset.k!, n: Number(g.dataset.n), shown: g.querySelectorAll('[data-pa5="bv-row"]').length, more: g.querySelector('[data-pa5="bv-fold"]')?.textContent ?? null })));
  const big = gs.filter((g) => g.n > 5);
  L.check("PA41-8", `(kept) groups over five fold (population ${gs.map((g) => `${g.k} ${g.n}`).join(", ")})`, big.length > 0 && big.every((g) => g.shown === 5 && g.more === `Show ${g.n - 5} more`), JSON.stringify(big));
  /* unfold every group (Show N more) */
  for (let i = 0; i < 6; i++) { const f = page.locator('[data-pa5="bv-fold"]').filter({ visible: true }).first(); if (!(await f.count())) break; await f.click().catch(() => {}); await page.waitForTimeout(400); }
  await mutate(page);
  const phone = await page.evaluate(() => Object.fromEntries((window as unknown as { __v: (s: string) => HTMLElement[] }).__v('[data-pa5="bv-row"]').map((r) => [r.dataset.id!, { from: Number(r.dataset.from || NaN), to: Number(r.dataset.to || NaN), pasts: r.dataset.pasts ?? "" }])));

  /* PA5-8: at 390 × 844, the header scrolled away: ≥ 18 rows fully visible; the name column holds on a 120px drag */
  if (!isWebKit(page)) {
    const top0 = await page.evaluate(() => { const r = (window as unknown as { __v: (s: string) => HTMLElement[] }).__v('[data-pa5="bv-row"]')[0]; const sc = document.getElementById("app-stage-scroll")!; return r ? r.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop : 0; });
    await stageTo(page, top0 + 400); await page.waitForTimeout(400);
    await stageTo(page, top0 + 500); await page.waitForTimeout(900);
    await mutate(page);
    const dense = await page.evaluate(() => {
      const v = (window as unknown as { __v: (s: string) => HTMLElement[] }).__v;
      const head = document.querySelector<HTMLElement>(".pa4-pushed, [data-pa4='pushed']")?.getBoundingClientRect();
      const ruler = v('[data-pa5="bv-ruler"]')[0]?.getBoundingClientRect();
      const dock = document.querySelector<HTMLElement>('[data-pa5="dock"]');
      const dockTop = dock && dock.dataset.tucked !== "1" ? dock.getBoundingClientRect().top : innerHeight;
      const top = Math.max(head?.bottom ?? 0, ruler?.bottom ?? 0);
      const rows = v('[data-pa5="bv-row"]:not(.op)').map((r) => r.getBoundingClientRect());
      const full = rows.filter((r) => r.top >= top - 0.5 && r.bottom <= dockTop + 0.5).length;
      return { full, top: Math.round(top), dockTop: Math.round(dockTop), tucked: dock?.dataset.tucked, rowH: rows[0] ? Math.round(rows[0].height * 10) / 10 : 0, total: rows.length };
    });
    L.check("PA5-8", `390x844 · rows fully visible with the header scrolled away (population ${dense.total})`, dense.total >= 18 && dense.full >= 18, JSON.stringify(dense));
    L.check("PA5-8", "390x844 · rows are 28px edge to edge", Math.abs(dense.rowH - 28) <= 0.5, String(dense.rowH));
    /* a track at the middle of the screen, clear of the sticky header and the ruler */
    const box = await page.evaluate(() => { const v = (window as unknown as { __v: (s: string) => HTMLElement[] }).__v; const t = v('[data-pa5="bv-row"] .pa5bv-trk').map((e) => e.getBoundingClientRect()).find((r) => r.top > innerHeight / 2 - 20); return t ? { x: t.left, y: t.top, width: t.width, height: t.height } : null; });
    if (box) {
      const read = () => page.evaluate(() => { const v = (window as unknown as { __v: (s: string) => HTMLElement[] }).__v; const n = v('[data-pa5="bv-names"]')[4]?.getBoundingClientRect(); return { nl: n?.left ?? NaN, nr: n?.right ?? NaN, x: Number(v('[data-pa5="birds-view"]')[0]?.dataset.x ?? NaN), page: document.getElementById("app-stage-scroll")?.scrollTop ?? -1 }; });
      const a = await read();
      /* towards the past (the track rests near its latest end, so a drag the other way can be at its stop) */
      await touchDrag(page, box.x + box.width / 2 - 60, box.y + box.height / 2, box.x + box.width / 2 + 60, box.y + box.height / 2);
      await page.waitForTimeout(1500);
      const b = await read();
      L.check("PA5-8", "a 120px drag moves the track, and the name column does not move", Math.abs(b.x - a.x) >= 60 && Math.abs(b.nl - a.nl) < 0.5 && Math.abs(b.nr - a.nr) < 0.5, `${JSON.stringify(a)} → ${JSON.stringify(b)}`);
    } else L.check("PA5-8", "a track on screen (population)", false, "none");
  }

  /* PA5-6 / PA5-7 in the full view: carries on, no ring; the line under an opened detail */
  const vpast = await page.evaluate(() => {
    const v = (window as unknown as { __v: (s: string) => HTMLElement[] }).__v;
    const rows = v('[data-pa5="bv-row"][data-past="1"]');
    const ln = v('[data-pa5="bv-now"]')[0]?.getBoundingClientRect();
    const out = rows.filter((r) => { const b = r.getBoundingClientRect(); return b.top > 0 && b.bottom < innerHeight; }).map((r) => {
      const n = r.querySelector<HTMLElement>('[data-pa5="bv-notch"]')?.getBoundingClientRect(), d = r.querySelector<HTMLElement>('[data-pa5="bv-deep"]')?.getBoundingClientRect();
      return { notch: n ? n.left + n.width / 2 : null, dl: d?.left ?? null, dr: d?.right ?? null, lx: ln ? ln.left + ln.width / 2 : NaN };
    }).filter((p) => p.notch != null && p.notch > 120 && p.lx > 120);
    const rings = v(".pa5bv-trk *").filter((e) => { const cs = getComputedStyle(e); return parseFloat(cs.borderRadius) >= e.getBoundingClientRect().width / 2 - 0.5 && parseFloat(cs.borderTopWidth) > 0; }).length;
    return { n: rows.length, out, rings };
  });
  L.check("PA5-6", `view: rows past their date (population ${vpast.n}, ${vpast.out.length} on screen)`, vpast.n > 0, "");
  L.check("PA5-6", "view: the deeper segment runs from the notch to today", vpast.out.every((p) => p.dl != null && p.dr != null && Math.abs(p.dl - p.notch!) <= 1.5 && Math.abs(p.dr - p.lx) <= 2), JSON.stringify(vpast.out.slice(0, 3)));
  L.check("PA5-6", "view: no ring on a bar", vpast.rings === 0, String(vpast.rings));

  /* PA5-9 (view half) against the desktop Birds-eye at 1512 */
  if (!isWebKit(page)) {
    await page.setViewportSize({ width: 1512, height: 982 });
    await page.goto("/queries?view=calendar");
    await page.locator('[data-qc150="be-row"]').first().waitFor({ timeout: 30_000 });
    await page.waitForTimeout(2500);
    const desk = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll<HTMLElement>('[data-qc150="be-row"]')].map((r) => {
      const c = r.querySelector<HTMLElement>('[data-qc150="be-bar"]');
      return [r.dataset.id!, { from: Number(c?.dataset.from ?? NaN), title: c?.getAttribute("title") ?? "", pasts: [...r.querySelectorAll<HTMLElement>('[data-qc150="be-past"]')].map((p) => `${p.dataset.from}-${p.dataset.to}`).join(",") }];
    })));
    const dm = (ms: number) => new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    for (const [where, set] of [["view", phone], ["block", blockDates]] as const) {
      const ids = Object.keys(set); let same = 0; const off: string[] = [];
      for (const id of ids) {
        const p = set[id], d = desk[id];
        if (!d) { off.push(`${id}: not on the desktop`); continue; }
        const endWords = /→ (.+)$/.exec(d.title)?.[1]?.trim() ?? "";
        const ok = (Number.isNaN(p.from) && Number.isNaN(d.from)) || (p.from === d.from && dm(p.to) === endWords && p.pasts === d.pasts);
        if (ok) same++; else off.push(`${id}: ${p.from}/${dm(p.to)}/${p.pasts} vs ${d.from}/${endWords}/${d.pasts}`);
      }
      L.check("PA5-9", `${where}: open queries (population ${ids.length} phone, ${Object.keys(desk).length} desktop)`, ids.length > 0 && (where === "block" || ids.length === Object.keys(desk).length), "");
      L.check("PA5-9", `${where}: every current bar's start and end, and every earlier stage, equal the desktop's`, off.length === 0 && same === ids.length, off.slice(0, 4).join(" | "));
    }
    /* 844 × 390 is the desktop (false premise) */
    await page.setViewportSize(WIDE_LAND);
    await page.goto("/dashboard"); await page.waitForTimeout(3500);
    const wide = await page.evaluate(() => ({ dock: !!document.querySelector('[data-pa5="dock"]'), today: !!(window as unknown as { __v: (s: string) => HTMLElement[] }).__v('[data-pa5="today"]').length, mobile: matchMedia("(max-width: 767.98px)").matches }));
    L.check("PA5-8", "844x390 is the desktop layout (no dock, no phone Today)", !wide.dock && !wide.today && !wide.mobile, JSON.stringify(wide));
    /* the phone landscape layout at 740 × 360 */
    await page.setViewportSize(LAND);
    await go(page, "/queries/all?view=birds");
    const land = await page.evaluate(() => ({ land: !!document.querySelector('[data-pa5="birds-view"].land'), dock: getComputedStyle(document.querySelector('[data-pa5="dock"]') as Element).display, names: Math.round(document.querySelector<HTMLElement>('[data-pa5="bv-row"] .pa5bv-nm')?.getBoundingClientRect().width ?? 0) }));
    L.check("PA5-8", "740x360 · landscape: 184px names, no dock", land.land && land.dock === "none" && Math.abs(land.names - 184) <= 1, JSON.stringify(land));
  }
  L.done(isWebKit(page) ? 4 : 14, MUT_LOCK[MUT]?.[1]);
});

/* ══ PA5-10 the card: the verb and a right swipe open the same journey; cancel records nothing; save; Undo ══ */
const todayLondon = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date());
group("todo", "PA5-10", async (page, info) => {
  const L = new Ledger(`todo-${info.project.name}`);
  const vp = isWebKit(page) ? WK_PHONE : PHONES[0];
  await openPhone(page, "/todo", vp);
  const deck = () => page.evaluate(() => {
    const v = (window as unknown as { __v: (s: string) => HTMLElement[] }).__v;
    const c = v('[data-pa5="todo-card"]')[0]; const root = v('[data-pa5="todo"]')[0];
    const badge = document.querySelector<HTMLElement>('[data-pa5="badge"]');
    return { top: c?.dataset.key ?? "", kind: c?.dataset.kind ?? "", title: v('[data-pa5="todo-title"]')[0]?.textContent ?? "", n: Number(root?.dataset.n ?? -1), badge: Number(badge?.dataset.n ?? 0), then: v('[data-pa5="todo-then-row"]').map((r) => ({ key: r.dataset.key!, kind: r.dataset.kind! })) };
  });
  /* the own task to save: brought to the top of today's order ("Not now"'s own store), put back at the end */
  let d0 = await deck();
  if (d0.kind !== "own") {
    const i = d0.then.findIndex((t) => t.kind === "own");
    L.check("PA5-10", "an own task to mark done (population)", i >= 0, JSON.stringify(d0.then.slice(0, 12)));
    if (i >= 0) {
      const back = [d0.top, ...d0.then.slice(0, i).map((t) => t.key)];
      await page.evaluate(([day, b]) => localStorage.setItem("pa5.todo.order", JSON.stringify({ day, back: b })), [todayLondon(), back] as const);
      await go(page, "/todo");
      d0 = await deck();
    }
  }
  L.check("PA5-10", `the top card is an own task (population ${d0.n} tasks)`, d0.kind === "own" && d0.n > 0, JSON.stringify({ top: d0.top, kind: d0.kind, n: d0.n }));
  const taskId = d0.top.replace(/^own:?/, "");
  const record = async () => {
    const acts = (await fsList("activities")).length;
    const tasks = await fsList("tasks");
    const t = tasks.find((x) => d0.top.includes(String(x.id)));
    return { acts, open: tasks.filter((x) => !x.done).length, done: t ? !!t.done : null, id: t?.id ?? null };
  };
  const rec0 = await record();
  L.check("PA5-10", "the task's own document (population)", rec0.id != null && rec0.done === false, JSON.stringify({ ...rec0, taskId }));
  const dlg = () => page.evaluate(() => { const d = (window as unknown as { __v: (s: string) => HTMLElement[] }).__v('[data-tdp="task"]')[0]; return d ? { key: d.dataset.key ?? "", label: d.getAttribute("aria-label") ?? "", title: d.querySelector('[data-tdp="title"]')?.textContent ?? "" } : null; });
  /* the verb */
  await press(page, '[data-pa5="todo-verb"]');
  await mutate(page);
  const byVerb = await dlg();
  L.check("PA5-10", "the verb opens the task's journey", !!byVerb && byVerb.key === d0.top, JSON.stringify(byVerb));
  await press(page, '[data-tdp="task"] [data-tdp="close"]');
  await page.waitForTimeout(600);
  const afterCancel1 = { ...(await deck()), ...(await record()) };
  L.check("PA5-10", "cancel (the verb's journey): nothing recorded, the card back on top", afterCancel1.n === d0.n && afterCancel1.top === d0.top && afterCancel1.acts === rec0.acts && afterCancel1.open === rec0.open && afterCancel1.done === false, JSON.stringify(afterCancel1).slice(0, 300));
  /* a right swipe (a touch drag through the DevTools protocol; Chromium only) */
  if (!isWebKit(page)) {
    const box = await page.locator('[data-pa5="todo-fill"]').filter({ visible: true }).first().boundingBox();
    if (box) {
      const y = box.y + box.height / 2;
      await touchDrag(page, box.x + 30, y, box.x + 30 + box.width * 0.6, y + 4, 14);
      await page.waitForTimeout(500);
      await mutate(page);
      const bySwipe = await dlg();
      const mid = { ...(await deck()), ...(await record()) };
      L.check("PA5-10", "a right swipe opens the same journey", !!bySwipe && !!byVerb && bySwipe.key === byVerb.key && bySwipe.label === byVerb.label && bySwipe.title === byVerb.title, JSON.stringify({ bySwipe, byVerb }));
      L.check("PA5-10", "the swipe itself records nothing", mid.acts === rec0.acts && mid.open === rec0.open && mid.done === false, JSON.stringify({ acts: mid.acts, open: mid.open, done: mid.done }));
      if (bySwipe) await press(page, '[data-tdp="task"] [data-tdp="close"]');
      else if (mid.done) { /* the mutation wrote: put it back through the snackbar's Undo */ await press(page, '[data-pa="snack-undo"]').catch(() => {}); await page.waitForTimeout(1500); }
      await page.waitForTimeout(600);
      const afterCancel2 = { ...(await deck()), ...(await record()) };
      L.check("PA5-10", "cancel (the swipe's journey): nothing recorded", afterCancel2.n === d0.n && afterCancel2.acts === rec0.acts && afterCancel2.open === rec0.open && afterCancel2.done === false, JSON.stringify({ n: afterCancel2.n, acts: afterCancel2.acts, done: afterCancel2.done }));
    } else L.check("PA5-10", "the card on screen (population)", false, "no box");
  }
  /* save: the journey's own Mark done → the card leaves, the badge drops by one; Undo puts both back */
  await press(page, '[data-pa5="todo-verb"]');
  await press(page, '[data-tdp="task"] [data-tdp="primary"]');
  await page.waitForTimeout(2200);
  const saved = { ...(await deck()), ...(await record()) };
  L.check("PA5-10", "save: the card leaves and the badge and count drop by one", saved.top !== d0.top && !saved.then.some((t) => t.key === d0.top) && saved.n === d0.n - 1 && saved.badge === d0.badge - 1 && saved.done === true, JSON.stringify({ top: saved.top, n: saved.n, badge: saved.badge, done: saved.done }));
  const undo = page.locator('[data-pa="snack-undo"]').filter({ visible: true }).first();
  const hasUndo = (await undo.count()) > 0;
  if (hasUndo) { if (isWebKit(page)) await undo.dispatchEvent("click"); else await undo.click(); }
  await page.waitForTimeout(2200);
  const undone = { ...(await deck()), ...(await record()) };
  L.check("PA5-10", "Undo: the card and the badge are back, and the task is open again", hasUndo && undone.top === d0.top && undone.n === d0.n && undone.badge === d0.badge && undone.done === false && undone.acts === rec0.acts && undone.open === rec0.open, JSON.stringify({ hasUndo, top: undone.top, n: undone.n, badge: undone.badge, done: undone.done, acts: undone.acts }));
  await page.evaluate(() => localStorage.removeItem("pa5.todo.order"));
  L.done(isWebKit(page) ? 6 : 10, MUT_LOCK[MUT]?.[1]);
});

/* ══ PA5-11 gaps: one gap saved through Housekeeping's handler changes the agent and lowers the count by one; Undo ══ */
group("gaps", "PA5-11", async (page, info) => {
  const L = new Ledger(`gaps-${info.project.name}`);
  const vp = isWebKit(page) ? WK_PHONE : PHONES[0];
  await openPhone(page, "/dashboard", vp);
  await press(page, '[data-pa5="tab"][data-tab="agents"]');
  const health = () => page.evaluate(() => { const h = document.querySelector<HTMLElement>('[data-pa5="health"]'); return { gaps: Number(h?.dataset.gaps ?? -1), pct: Number(h?.dataset.pct ?? -1), dates: Number(document.querySelector<HTMLElement>('[data-pa5="gap-group"][data-group="dates"]')?.dataset.n ?? 0) }; });
  const h0 = await health();
  L.check("PA5-11", `gaps on the list (population ${h0.gaps}; ${h0.dates} reply dates)`, h0.gaps > 0 && h0.dates > 0, JSON.stringify(h0));
  await press(page, '[data-pa5="gap-group"][data-group="dates"]');
  await page.locator('[data-pa5="gaps-sheet"]').waitFor();
  let card = await page.evaluate(() => { const c = document.querySelector<HTMLElement>('[data-pa5="gap-card"]'); return c ? { kind: c.dataset.kind!, agent: c.dataset.agent!, key: c.dataset.key! } : null; });
  for (let i = 0; i < 12 && card && card.kind !== "reply"; i++) { await press(page, '[data-pa5="gap-skip"]'); card = await page.evaluate(() => { const c = document.querySelector<HTMLElement>('[data-pa5="gap-card"]'); return c ? { kind: c.dataset.kind!, agent: c.dataset.agent!, key: c.dataset.key! } : null; }); }
  L.check("PA5-11", "a reply-time gap in the session", card?.kind === "reply", JSON.stringify(card));
  if (card?.kind === "reply") {
    const before = await fsGet(`agents/${card.agent}`);
    const i0 = await page.evaluate(() => document.querySelector<HTMLElement>('[data-pa5="gaps-sheet"]')?.dataset.i);
    await press(page, '[data-pa5="gap-card"] .hk8-field [aria-label="More"]');
    if (MUT === "direct") await fsPatch(`agents/${card.agent}`, { responseTimeWeeks: 6 });
    else await press(page, '[data-pa5="gap-save"]');
    await page.waitForTimeout(2000);
    const after = await fsGet(`agents/${card.agent}`);
    const h1 = await health();
    const snack = await page.evaluate(() => document.querySelector('[data-pa3="snack"]')?.textContent ?? "");
    const i1 = await page.evaluate(() => document.querySelector<HTMLElement>('[data-pa5="gaps-sheet"]')?.dataset.i);
    L.check("PA5-11", "the agent changed (reply time set)", before?.responseTimeWeeks == null && typeof after?.responseTimeWeeks === "number", `${before?.responseTimeWeeks} → ${after?.responseTimeWeeks}`);
    L.check("PA5-11", "through Housekeeping's handler: its saved line, with Undo, and the session moved on", /replies in about \d+ weeks?\./.test(snack) && /Undo$/.test(snack) && i1 !== i0, JSON.stringify({ snack, i0, i1 }));
    L.check("PA5-11", "the gap count dropped by one", h1.gaps === h0.gaps - 1, `${h0.gaps} → ${h1.gaps}`);
    /* put it back: the snackbar's Undo (the handler's own); the mutation wrote around it, so it is put back directly */
    const u = page.locator('[data-pa3="undo"]').filter({ visible: true }).first();
    if (MUT !== "direct" && (await u.count())) { if (isWebKit(page)) await u.dispatchEvent("click"); else await u.click(); }
    else await fsPatch(`agents/${card.agent}`, { responseTimeWeeks: (before?.responseTimeWeeks as number | undefined) ?? null });
    await page.waitForTimeout(2500);
    const back = await fsGet(`agents/${card.agent}`);
    const h2 = await health();
    const diff = Object.keys({ ...before, ...back }).filter((k) => JSON.stringify(before?.[k]) !== JSON.stringify(back?.[k]));
    L.check("PA5-11", "Undo: the agent and the count are back", back?.responseTimeWeeks == null && h2.gaps === h0.gaps && diff.filter((k) => !/At$|edited|updated/i.test(k)).length === 0, JSON.stringify({ diff, gaps: h2.gaps }));
  }
  await press(page, '[data-pa5="gaps-close"]').catch(() => {});
  L.done(5, MUT_LOCK[MUT]?.[1]);
});

/* ══ PA5-12 materials: results = packageMetrics; the header's package = the one new queries use; Versions = desktop's gate ══ */
group("materials", "PA5-12", async (page, info) => {
  const L = new Ledger(`materials-${info.project.name}`);
  const vp = isWebKit(page) ? WK_PHONE : PHONES[0];
  const queries = (await fsList("queries")) as unknown as Query[];
  const packages = (await fsList("packages")) as unknown as SubmissionPackage[];
  const manuscripts = (await fsList("manuscripts")) as unknown as Manuscript[];
  await openPhone(page, "/materials", vp);
  await press(page, '[data-pa5="tab"][data-tab="packages"]');
  await mutate(page);
  const cards = await page.evaluate(() => (window as unknown as { __v: (s: string) => HTMLElement[] }).__v('[data-pa5="pkg-card"]').map((c) => ({ id: c.dataset.id!, sent: Number(c.dataset.sent), req: Number(c.dataset.requests), text: c.querySelector('[data-pa5="pkg-result"]')?.textContent ?? c.textContent ?? "" })));
  L.check("PA5-12", `packages (population ${cards.length}, ${cards.filter((c) => c.sent > 0).length} sent)`, cards.length > 0 && cards.some((c) => c.sent > 0), "");
  const off = cards.filter((c) => { const m = packageMetrics(c.id, queries); return m.sent !== c.sent || m.requests !== c.req || (m.sent > 0 && !c.text.replace(/\s+/g, " ").includes(String(m.requests))); }).map((c) => `${c.id}: ${c.req}/${c.sent} vs ${packageMetrics(c.id, queries).requests}/${packageMetrics(c.id, queries).sent}`);
  L.check("PA5-12", "every package's result = packageMetrics", off.length === 0, off.slice(0, 4).join(" | "));
  const hd = await page.evaluate(() => { const h = (window as unknown as { __v: (s: string) => HTMLElement[] }).__v('[data-pa5="mat-header-pkg"]')[0]; const r = (window as unknown as { __v: (s: string) => HTMLElement[] }).__v('[data-pa5="materials"]')[0]; return { id: h?.dataset.id ?? null, none: h?.dataset.none === "1", sent: Number(h?.dataset.sent ?? NaN), req: Number(h?.dataset.requests ?? NaN), ms: r?.dataset.ms ?? "" }; });
  const ms = manuscripts.find((m) => m.id === hd.ms) ?? null;
  const act = resolveActivePackage(ms, packages);
  L.check("PA5-12", `the header's package = the one new queries go out with (${ms?.id ?? "no manuscript"})`, !!ms && (act ? hd.id === act.id : hd.none), JSON.stringify({ hd, act: act?.id ?? null }));
  if (act) { const m = packageMetrics(act.id, queries); L.check("PA5-12", "the header's result = packageMetrics", m.sent === hd.sent && m.requests === hd.req, `${hd.req}/${hd.sent} vs ${m.requests}/${m.sent}`); }
  /* no book on the harness resolves a package going out, so one is chosen through the header's own chooser (the app's
     writer, setActivePackage), read, and put back on the emulator document as it was */
  /* the book: one with a complete live package to choose (the harness's own book has none ready) */
  const full = (p: SubmissionPackage) => p.status !== "Retired" && !!p.queryLetterVersionId && !!p.synopsisVersionId && !!p.samplePagesVersionId;
  const book = manuscripts.find((m) => !resolveActivePackage(m, packages) && packages.some((p) => p.manuscriptId === m.id && full(p)));
  const wasMs = await page.evaluate(() => localStorage.getItem("scriptally_active_manuscript_id"));
  if (book) {
    await page.evaluate((id) => localStorage.setItem("scriptally_active_manuscript_id", id), book.id);
    await go(page, "/materials");
    const before = (await fsGet(`manuscripts/${book.id}`))?.activePackageId ?? null;
    const ms = book;
    await press(page, '[data-pa5="mat-header-pkg"]');
    const row = page.locator('[data-pa5="mat-choose-row"]').filter({ visible: true }).first();
    if (await row.count()) {
      if (isWebKit(page)) await row.dispatchEvent("click"); else await row.click();
      await page.waitForTimeout(1800);
      await mutate(page);
      const msNow = (await fsGet(`manuscripts/${ms.id}`)) as unknown as Manuscript;
      const a2 = resolveActivePackage({ ...msNow, id: ms.id }, packages);
      const h2 = await page.evaluate(() => { const h = (window as unknown as { __v: (s: string) => HTMLElement[] }).__v('[data-pa5="mat-header-pkg"]')[0]; return { id: h?.dataset.id ?? null, sent: Number(h?.dataset.sent ?? NaN), req: Number(h?.dataset.requests ?? NaN) }; });
      const m2 = a2 ? packageMetrics(a2.id, queries) : null;
      L.check("PA5-12", "a package chosen to go out: the header shows it, with packageMetrics' result", !!a2 && !!m2 && h2.id === a2.id && h2.sent === m2.sent && h2.req === m2.requests, JSON.stringify({ h2, act: a2?.id ?? null, m: m2 ? [m2.requests, m2.sent] : null }));
      const r = await fetch(`${FS}/users/${UID}/manuscripts/${ms.id}?updateMask.fieldPaths=activePackageId`, { method: "PATCH", headers: { Authorization: "Bearer owner", "Content-Type": "application/json" }, body: JSON.stringify({ fields: before ? { activePackageId: { stringValue: String(before) } } : {} }) });
      await page.waitForTimeout(1200);
      const after = (await fsGet(`manuscripts/${ms.id}`))?.activePackageId ?? null;
      L.check("PA5-12", "put back: the book's package going out is as it was", r.ok && after === before, `${before} → ${after}`);
    } else L.check("PA5-12", "a package to choose (population)", false, "no choose row");
    await page.evaluate((w) => { if (w == null) localStorage.removeItem("scriptally_active_manuscript_id"); else localStorage.setItem("scriptally_active_manuscript_id", w); }, wasMs);
  } else L.check("PA5-12", "a book with a complete package to choose (population)", false, "none");
  /* Versions follows the desktop's gate, open and (with the desktop's own review aid) locked */
  for (const free of ["", "1"]) {
    await page.evaluate((f) => { if (f) sessionStorage.setItem("sa.dev.versionsFree", f); else sessionStorage.removeItem("sa.dev.versionsFree"); }, free);
    await go(page, "/materials");
    await press(page, '[data-pa5="tab"][data-tab="versions"]');
    const ph = await page.evaluate(() => ({ locked: (window as unknown as { __v: (s: string) => HTMLElement[] }).__v('[data-pa5="versions-locked"]').length > 0, open: (window as unknown as { __v: (s: string) => HTMLElement[] }).__v('[data-pa5="mat-versions"]').length > 0 }));
    let deskLocked: boolean | null = null;
    if (!isWebKit(page)) {
      await page.setViewportSize({ width: 1512, height: 982 });
      await page.goto("/manuscripts/versions"); await page.waitForTimeout(4000);
      deskLocked = (await page.locator('[data-vv2="lock"]').filter({ visible: true }).count()) > 0;
      await page.setViewportSize(vp);
    }
    L.check("PA5-12", `Versions ${free ? "with the review aid (locked)" : "as the account stands"}: the phone's gate = the desktop's`, ph.locked !== ph.open && (deskLocked == null || deskLocked === ph.locked) && (free ? ph.locked : true), JSON.stringify({ ph, deskLocked }));
  }
  await page.evaluate(() => sessionStorage.removeItem("sa.dev.versionsFree"));
  L.done(isWebKit(page) ? 6 : 7, MUT_LOCK[MUT]?.[1]);
});

/* ══ PA5-13 sizes ══ */
type Sweep = { smallText: string[]; smallTap: string[]; wide: string[]; texts: number; taps: number };
const sweep = (page: Page, roots: string): Promise<Sweep> => page.evaluate((rs) => {
  const v = (window as unknown as { __v: (s: string) => HTMLElement[] }).__v;
  const els = v(rs);
  const vw = document.documentElement.clientWidth;
  const out: Sweep = { smallText: [], smallTap: [], wide: [], texts: 0, taps: 0 };
  const seen = new Set<Element>();
  for (const e of els.flatMap((r) => [r, ...r.querySelectorAll<HTMLElement>("*")])) {
    if (seen.has(e)) continue; seen.add(e);
    const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
    if (r.width === 0 || r.height === 0 || cs.visibility === "hidden" || e.closest("svg")) continue;
    if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > vw) continue;
    const dock = !!e.closest('[data-pa5="dock"]');
    if ([...e.childNodes].some((n) => n.nodeType === 3 && (n.textContent ?? "").trim())) {
      out.texts++;
      if (!dock && parseFloat(cs.fontSize) < 13.99) out.smallText.push(`${String(e.className).slice(0, 30)} "${e.textContent?.trim().slice(0, 20)}" ${cs.fontSize}`);
    }
    if (e.matches("button:not([disabled]), a[href], [role='button'], [role='tab'], input, textarea, select") && !e.closest("[aria-hidden='true']")) {
      out.taps++;
      const row28 = e.matches('[data-pa5="be-row"], .pa5bv-top');
      if (!row28 && (r.width < 47.5 || r.height < 47.5)) out.smallTap.push(`${String(e.className || e.tagName).slice(0, 30)} "${e.textContent?.trim().slice(0, 20)}" ${Math.round(r.width)}×${Math.round(r.height)}`);
    }
    if (r.right > vw + 1) { let a = e.parentElement, sc = false; while (a) { const ov = getComputedStyle(a).overflowX; if (/auto|scroll|hidden|clip/.test(ov)) { sc = true; break; } a = a.parentElement; } if (!sc) out.wide.push(`${String(e.className).slice(0, 30)} right ${Math.round(r.right)}`); }
  }
  if (document.documentElement.scrollWidth > vw + 1) out.wide.push(`the page scrolls sideways (${document.documentElement.scrollWidth} > ${vw})`);
  return out;
}, roots);
group("sizes", "PA5-13", async (page, info) => {
  const L = new Ledger(`sizes-${info.project.name}`);
  const vps = isWebKit(page) ? [WK_PHONE] : PHONES;
  const PAGE = '[data-pa5="today"], [data-pa5="todo"], [data-pa5="materials"], [data-pa5="profile"], [data-pa5="birds-view"], [data-pa5="mini"], [data-pa5="dock"], [data-pa5="gaps-sheet"], [data-pa5="fb-sheet"]';
  for (const vp of vps) {
    const at = tag(vp);
    await openPhone(page, "/dashboard", vp);
    await markReplayed(page);
    const screens: [string, () => Promise<void>, string][] = [
      ["Today · Queries", async () => { await go(page, "/dashboard"); await press(page, '[data-pa5="tab"][data-tab="queries"]'); }, PAGE],
      ["Today · Agents", async () => { await go(page, "/dashboard"); await press(page, '[data-pa5="tab"][data-tab="agents"]'); }, PAGE],
      ["Today · Activity", async () => { await go(page, "/dashboard"); await press(page, '[data-pa5="tab"][data-tab="activity"]'); }, PAGE],
      ["To do", async () => { await go(page, "/todo"); }, PAGE],
      ["Materials · Packages", async () => { await go(page, "/materials"); await press(page, '[data-pa5="tab"][data-tab="packages"]'); }, PAGE],
      ["Materials · Letters", async () => { await go(page, "/materials"); await press(page, '[data-pa5="tab"][data-tab="letters"]'); }, PAGE],
      ["Materials · Versions", async () => { await go(page, "/materials"); await press(page, '[data-pa5="tab"][data-tab="versions"]'); }, PAGE],
      ["Materials · Comps", async () => { await go(page, "/materials"); await press(page, '[data-pa5="tab"][data-tab="comps"]'); }, PAGE],
      ["Profile", async () => { await go(page, "/you"); }, PAGE],
      ["the full Birds-eye view", async () => { await go(page, "/queries/all?view=birds"); }, PAGE],
      ["the gaps sheet", async () => { await go(page, "/dashboard"); await press(page, '[data-pa5="tab"][data-tab="agents"]'); await press(page, '[data-pa5="fill-gaps"]'); }, '[data-pa5="gaps-sheet"]'],
      ["the feedback sheet", async () => { await go(page, "/dashboard"); await press(page, '[data-pa5="today-hd"] [data-pa5="feedback-btn"]'); }, '[data-pa5="fb-sheet"]'],
    ];
    for (const [name, open, roots] of screens) {
      await open(); await mutate(page); await page.waitForTimeout(500);
      const sheet = roots !== PAGE;
      const agg: Sweep = { smallText: [], smallTap: [], wide: [], texts: 0, taps: 0 };
      const add = (a: Sweep) => { agg.texts += a.texts; agg.taps += a.taps; for (const k of ["smallText", "smallTap", "wide"] as const) for (const x of a[k]) if (!agg[k].includes(x)) agg[k].push(x); };
      /* every screenful: the page scrolled through (a sheet scrolls its own body) */
      const H = await page.evaluate((s) => (s ? 1 : document.getElementById("app-stage-scroll")?.scrollHeight ?? 1), sheet);
      for (let y = 0, k = 0; k < 8 && (k === 0 || y < H); k++, y += vp.height - 160) {
        if (!sheet) { await stageTo(page, y); await page.waitForTimeout(350); await mutate(page); }
        add(await sweep(page, roots));
        if (sheet) {
          const more = await page.evaluate((r) => { const s = (window as unknown as { __v: (s: string) => HTMLElement[] }).__v(r)[0]; let el: HTMLElement | null = s; while (el && el.scrollHeight <= el.clientHeight + 1) el = el.parentElement; if (!el || el === document.body || el === document.documentElement) return false; const t0 = el.scrollTop; el.scrollTop += 500; return el.scrollTop > t0; }, roots);
          if (!more) break;
          await page.waitForTimeout(300);
        }
      }
      L.check("PA5-13", `${at} · ${name} · population ${agg.texts} texts, ${agg.taps} targets`, agg.texts > 3 && agg.taps > 0, "");
      L.check("PA5-13", `${at} · ${name} · text ≥ 14px (dock labels excepted)`, agg.smallText.length === 0, agg.smallText.slice(0, 6).join(" | "));
      L.check("PA5-13", `${at} · ${name} · targets ≥ 48×48 (Birds-eye rows excepted)`, agg.smallTap.length === 0, agg.smallTap.slice(0, 6).join(" | "));
      /* 125% text: the root at 20px; nothing past the right edge, and no sideways page scroll */
      await page.evaluate(() => { document.documentElement.style.fontSize = "20px"; }); await page.waitForTimeout(600);
      const wide: string[] = [];
      for (let y = 0, k = 0; k < 8 && (k === 0 || y < H * 1.3); k++, y += vp.height - 160) {
        if (!sheet) { await stageTo(page, y); await page.waitForTimeout(300); }
        for (const x of (await sweep(page, roots)).wide) if (!wide.includes(x)) wide.push(x);
        if (sheet) break;
      }
      await page.evaluate(() => { document.documentElement.style.fontSize = ""; }); await page.waitForTimeout(300);
      L.check("PA5-13", `${at} · ${name} · nothing past the right edge at 125%`, wide.length === 0, wide.slice(0, 6).join(" | "));
      await page.keyboard.press("Escape").catch(() => {});
    }
    if (isWebKit(page)) break;
  }
  L.done(isWebKit(page) ? 40 : 90, MUT_LOCK[MUT]?.[1]);
});

/* ══ PA5-14 words and motion ══ */
group("words", "PA5-14", async (page, info) => {
  const L = new Ledger(`words-${info.project.name}`);
  const vp = isWebKit(page) ? WK_PHONE : PHONES[0];
  await openPhone(page, "/dashboard", vp);
  await markReplayed(page);
  const BAD = /\boverdue\b|\blate\b/i;
  const screens: [string, () => Promise<void>][] = [
    ["Today · Queries", async () => { await go(page, "/dashboard"); await press(page, '[data-pa5="tab"][data-tab="queries"]'); }],
    ["Today · Agents", async () => { await press(page, '[data-pa5="tab"][data-tab="agents"]'); }],
    ["Today · Activity", async () => { await press(page, '[data-pa5="tab"][data-tab="activity"]'); }],
    ["To do", async () => { await go(page, "/todo"); }],
    ["a task's journey", async () => { await press(page, '[data-pa5="todo-verb"]'); }],
    ["Materials · Packages", async () => { await go(page, "/materials"); await press(page, '[data-pa5="tab"][data-tab="packages"]'); }],
    ["Materials · Letters", async () => { await press(page, '[data-pa5="tab"][data-tab="letters"]'); }],
    ["Materials · Versions", async () => { await press(page, '[data-pa5="tab"][data-tab="versions"]'); }],
    ["Materials · Comps", async () => { await press(page, '[data-pa5="tab"][data-tab="comps"]'); }],
    ["Profile", async () => { await go(page, "/you"); }],
    ["the full Birds-eye view, unfolded", async () => { await go(page, "/queries/all?view=birds"); for (let i = 0; i < 6; i++) { const f = page.locator('[data-pa5="bv-fold"]').filter({ visible: true }).first(); if (!(await f.count())) break; await f.click().catch(() => {}); await page.waitForTimeout(300); } }],
    ["the full list", async () => { await go(page, "/queries/all"); await press(page, '[data-pa4="view"][data-k="list"]'); }],
    ["the gaps sheet", async () => { await go(page, "/dashboard"); await press(page, '[data-pa5="tab"][data-tab="agents"]'); await press(page, '[data-pa5="fill-gaps"]'); }],
    ["the feedback sheet", async () => { await page.keyboard.press("Escape"); await go(page, "/dashboard"); await press(page, '[data-pa5="today-hd"] [data-pa5="feedback-btn"]'); }],
  ];
  let total = 0;
  for (const [name, open] of screens) {
    await open(); await mutate(page);
    const words = await page.evaluate(() => {
      const v = (window as unknown as { __v: (s: string) => HTMLElement[] }).__v;
      return v('[data-pa5="today"], [data-pa5="todo"], [data-pa5="materials"], [data-pa5="profile"], [data-pa5="birds-view"], [data-pa4="queries"], [data-pa4="layer"], .pa-layer, [data-pa5="mini"], [data-pa5="dock"]').map((e) => e.innerText).join("\n");
    });
    total += words.length;
    L.check("PA5-14", `${name}: no "overdue", no "late" (${words.length} chars)`, words.length > 40 && !BAD.test(words), (/.{0,30}\b(overdue|late)\b.{0,30}/i.exec(words) ?? [""])[0]);
  }
  await page.keyboard.press("Escape").catch(() => {});
  L.check("PA5-14", `words read (population ${total} chars)`, total > 3000, "");
  /* reduced motion: nothing runs (the harness's motion kill lifted first, or the reading is vacuous) */
  const lift = () => page.evaluate((id) => { document.querySelectorAll("style").forEach((s) => { if (s.textContent?.startsWith(`/*${id}*/`)) s.remove(); }); }, KILL_MOTION_ID);
  const running = () => page.evaluate(() => document.getAnimations().filter((a) => a.playState === "running").map((a) => (a as CSSAnimation).animationName || (a as CSSTransition).transitionProperty || "anim"));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await clearReplays(page);
  const motionScreens: [string, () => Promise<void>][] = [
    ["Today (header, chart, block)", async () => { await go(page, "/dashboard"); await lift(); await press(page, '[data-pa5="tab"][data-tab="queries"]'); await blockIntoView(page); }],
    ["a block row opened", async () => { await press(page, '[data-pa5="be-row"]'); }],
    ["To do", async () => { await go(page, "/todo"); await lift(); }],
    ["Not now", async () => { await press(page, '[data-pa5="todo-later"]'); }],
    ["the full Birds-eye view", async () => { await go(page, "/queries/all?view=birds"); await lift(); }],
    ["Materials", async () => { await go(page, "/materials"); await lift(); }],
    ["Profile", async () => { await go(page, "/you"); await lift(); }],
  ];
  for (const [name, open] of motionScreens) {
    await open(); await page.waitForTimeout(150);
    const r = await running();
    L.check("PA5-14", `reduced motion · ${name}: nothing running`, r.length === 0, r.slice(0, 6).join(", "));
  }
  await page.evaluate(() => localStorage.removeItem("pa5.todo.order"));
  /* the control: without the setting, the block's once-a-day replay runs (so the reading can see an animation) */
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await clearReplays(page);
  /* loaded on To do, so Today (mounted, hidden) first shows the block when its dock tab is tapped */
  await go(page, "/todo"); await lift();
  await page.locator('[data-pa5="dock-tab"][data-tab="today"]').click();
  await page.waitForTimeout(300);
  const ctl = await running();
  L.check("PA5-14", "control: without reduced motion the block's replay is running", ctl.length > 0, ctl.slice(0, 4).join(", "));
  await markReplayed(page);
  L.done(20, MUT_LOCK[MUT]?.[1]);
});

/* ══ PA5-15 the desktop at 1512: Dashboard, Queries, Agents, Materials and the desktop Birds-eye, DOM- and pixel-identical ══ */
test.describe("PA5-15 desktop", () => {
  test.skip(!process.env.PA5_DESKTOP, "set PA5_DESKTOP=base|new");
  test("capture, and compare against the base", async ({ page }, info) => {
    test.skip(info.project.name !== "measure", "the desktop project");
    test.setTimeout(400_000);
    MUT = MUTS.includes("shared") ? "shared" : "";
    const mode = process.env.PA5_DESKTOP!;
    const out = `${DIR}/desktop/${mode}${MUT ? `-mut-${MUT}` : ""}`;
    mkdirSync(out, { recursive: true });
    const PAGES: [string, string][] = [["dashboard", "/dashboard"], ["queries", "/queries"], ["agents", "/agents"], ["letters", "/materials/letters"], ["packages", "/queries/packages"], ["birds", "/queries?view=calendar"]];
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
    if (mode !== "new") { expect(true).toBe(true); MUT = ""; return; }
    const L = new Ledger("desktop");
    for (const [n] of PAGES) {
      const a = `${DIR}/desktop/base/${n}`, b = `${out}/${n}`;
      if (!existsSync(`${a}.html`)) { L.check("PA5-15", n, false, "no base capture"); continue; }
      const da = readFileSync(`${a}.html`, "utf8"), db = readFileSync(`${b}.html`, "utf8");
      let first = -1; for (let i = 0; i < Math.max(da.length, db.length); i++) if (da[i] !== db[i]) { first = i; break; }
      L.check("PA5-15", `${n} DOM`, da === db, first < 0 ? `${da.length} chars, identical` : `differs at ${first}: …${da.slice(Math.max(0, first - 80), first + 80)}… ⇄ …${db.slice(Math.max(0, first - 80), first + 80)}…`);
      const px = await page.evaluate(async ([x, y]) => {
        const load = (s: string) => new Promise<HTMLImageElement>((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = s; });
        const [ia, ib] = await Promise.all([load(x), load(y)]);
        if (ia.width !== ib.width || ia.height !== ib.height) return -1;
        const c = (i: HTMLImageElement) => { const cv = document.createElement("canvas"); cv.width = i.width; cv.height = i.height; const g = cv.getContext("2d")!; g.drawImage(i, 0, 0); return g.getImageData(0, 0, i.width, i.height).data; };
        const pa = c(ia), pb = c(ib); let d = 0;
        for (let i = 0; i < pa.length; i += 4) if (pa[i] !== pb[i] || pa[i + 1] !== pb[i + 1] || pa[i + 2] !== pb[i + 2]) d++;
        return d;
      }, [`data:image/png;base64,${readFileSync(`${a}.png`).toString("base64")}`, `data:image/png;base64,${readFileSync(`${b}.png`).toString("base64")}`] as const);
      L.check("PA5-15", `${n} pixels`, px === 0, `${px} pixels differ`);
    }
    L.done(12, MUT ? "PA5-15" : undefined);
    MUT = "";
  });
});

/* ══ the pairs: each ref beside the built screen, and the five campaign states of the Birds-eye block ══ */
test.describe("PA5 pairs", () => {
  test.skip(!process.env.PA5_PAIRS, "set PA5_PAIRS=1");
  test("ref beside built", async ({ page }, info) => {
    test.skip(info.project.name !== "pixel", "Chromium");
    test.setTimeout(900_000);
    const out = `${DIR}/pairs`;
    mkdirSync(out, { recursive: true });
    const shot = (p: string) => ({ path: `${out}/${p}.png`, type: "png" as const, scale: "css" as const });
    /* the refs, in this browser */
    await page.setViewportSize({ width: 1600, height: 1100 });
    const ref = async (file: string, pick: (n: number) => [number, string][], settle = 2500) => {
      await page.goto(`file://${resolve(`design-refs/phone-app-v5/${file}`)}`); await page.waitForTimeout(settle);
      const n = await page.locator(".ph").count();
      for (const [i, name] of pick(n)) if (i < n) await page.locator(".ph").nth(i).screenshot(shot(name));
      return n;
    };
    await ref("phone-hub-v5.html", () => [[0, "01-hub-today-ref"], [1, "02-hub-todo-ref"]]);
    await ref("phone-upnext-v1.html", () => [[0, "03-upnext-card-ref"]]);
    await ref("phone-gaps-v1.html", (n) => [[n - 1, "04-gaps-fifth-ref"]]);
    await ref("phone-materials-v1.html", () => [[0, "05-materials-1-ref"], [1, "06-materials-2-ref"], [2, "07-materials-3-ref"], [3, "08-materials-4-ref"], [4, "09-materials-5-ref"], [5, "10-materials-6-ref"]]);
    await ref("phone-feedback-v1.html", () => [[0, "11-feedback-sheet-ref"], [1, "12-feedback-sent-ref"]]);
    await ref("phone-birds-eye-dense-v1.html", () => [[0, "13-birds-dense-ref"]]);
    /* built, at 390 × 844 */
    const P = { width: 390, height: 844 };
    await openPhone(page, "/dashboard", P);
    await markReplayed(page);
    await go(page, "/dashboard"); await press(page, '[data-pa5="tab"][data-tab="queries"]'); await stageTo(page, 0); await page.waitForTimeout(600);
    await page.screenshot(shot("01-hub-today-built"));
    await go(page, "/todo"); await page.screenshot(shot("02-hub-todo-built"));
    await page.screenshot(shot("03-upnext-card-built"));
    await go(page, "/dashboard"); await press(page, '[data-pa5="tab"][data-tab="agents"]'); await press(page, '[data-pa5="fill-gaps"]'); await page.waitForTimeout(600);
    await page.screenshot(shot("04-gaps-fifth-built"));
    await page.keyboard.press("Escape"); await page.waitForTimeout(300);
    const mats: [string, string][] = [["packages", "05-materials-1-built"], ["letters", "06-materials-2-built"], ["versions", "07-materials-3-built"], ["comps", "08-materials-4-built"]];
    for (const [t, n] of mats) { await go(page, "/materials"); await press(page, `[data-pa5="tab"][data-tab="${t}"]`); await stageTo(page, 0); await page.waitForTimeout(500); await page.screenshot(shot(n)); }
    await go(page, "/materials"); await press(page, '[data-pa5="tab"][data-tab="packages"]'); await press(page, '[data-pa5="pkg-card"]'); await page.waitForTimeout(800); await page.screenshot(shot("09-materials-5-built"));
    await go(page, "/materials"); await press(page, '[data-pa5="tab"][data-tab="letters"]'); await press(page, '[data-pa5="letter-sheet"]'); await page.waitForTimeout(800); await page.screenshot(shot("10-materials-6-built"));
    await go(page, "/dashboard"); await press(page, '[data-pa5="today-hd"] [data-pa5="feedback-btn"]'); await page.waitForTimeout(500);
    await page.locator('[data-pa5="fb-note"]').fill("The Birds-eye block is easy to read.");
    await page.screenshot(shot("11-feedback-sheet-built"));
    /* Sent: the callable is answered here, in the browser, so nothing is sent anywhere */
    await page.route(/sendBetaFeedback/, (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ result: { ok: true } }) }));
    await press(page, '[data-pa5="fb-send"]'); await page.waitForTimeout(1200);
    await page.screenshot(shot("12-feedback-sent-built"));
    await page.unroute(/sendBetaFeedback/);
    await page.keyboard.press("Escape");
    await go(page, "/queries/all?view=birds"); await page.waitForTimeout(800);
    await page.screenshot(shot("13-birds-dense-built"));
    /* the five campaign states of the Birds-eye block (the review aid; the harness is Everyday) */
    await go(page, "/queries/all?view=birds");
    for (let i = 0; i < 6; i++) { const f = page.locator('[data-pa5="bv-fold"]').filter({ visible: true }).first(); if (!(await f.count())) break; await f.click().catch(() => {}); await page.waitForTimeout(300); }
    const open = await page.evaluate(() => (window as unknown as { __v: (s: string) => HTMLElement[] }).__v('[data-pa5="bv-row"]').map((r) => ({ id: r.dataset.id!, past: r.dataset.past === "1" })));
    const sent = new Map(H_QUERIES.map((q) => [q.id, tsMs(q.dateSent)]));
    const now = Date.now();
    const states: [string, { now?: number; ids?: string[] } | null][] = [
      ["everyday", null],
      ["brand-new", { now: NEW_NOW, ids: BRAND_NEW }],
      ["just-one", { now: ONE_NOW, ids: ONE }],
      ["all-past-date", { ids: open.filter((r) => r.past).map((r) => r.id) }],
      ["long-waits", { ids: open.filter((r) => (sent.get(r.id) ?? now) < now - 70 * DAY).map((r) => r.id) }],
    ];
    writeFileSync(`${out}/campaign-states.json`, JSON.stringify(states, null, 1));
    for (const [n, aid] of states) {
      await go(page, "/dashboard");
      await beAid(page, aid);
      await page.locator('[data-pa5="be"]').filter({ visible: true }).first().screenshot(shot(`20-block-${n}`)).catch(() => {});
    }
    await beAid(page, null);
  });
});
