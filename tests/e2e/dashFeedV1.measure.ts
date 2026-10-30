/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD FEED v1 — the DF1 locks (ref design-refs/dashboard-feed-v1/), on the rendered page at 1512×982 and
 * 1280×800 unless a lock says otherwise.
 *
 * Every lock proves its population is non-zero before it asserts anything. Each has a named mutation
 * (`DF1_MUTATE=<name>`): CSS and DOM breaks are applied in the page after load; source breaks (D1, E1) are applied by
 * the runner to the built bundle and named here for the record. Readings go to reports/dashboard-feed-v1/ledger/.
 *
 * ⚠️ WRITING CASES PUT THE ACCOUNT BACK IN THE SAME RUN (seedDf1.mjs): B1's no-goal state, D1's recorded materials and
 * E3's Scout request. A run that cannot restore fails loudly rather than finishing.
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { openRoute } from "./measure";

const { PNG } = createRequire(import.meta.url)("playwright-core/lib/utilsBundle") as { PNG: { sync: { read(b: Buffer): { width: number; height: number; data: Buffer } } } };

export const DIR = "reports/dashboard-feed-v1";
const MUT = process.env.DF1_MUTATE ?? "";
type VP = { width: number; height: number; collapsed?: boolean };
const W1512: VP = { width: 1512, height: 982, collapsed: true };
const W1512X: VP = { width: 1512, height: 982, collapsed: false };
const W1280: VP = { width: 1280, height: 800, collapsed: false };
const tag = (v: VP) => `${v.width}x${v.height}${v.collapsed ? "c" : ""}`;

type Row = { lock: string; where: string; ok: boolean; detail: string };
class Ledger {
  rows: Row[] = [];
  constructor(public name: string) {}
  check(lock: string, where: string, ok: boolean, detail: string) { this.rows.push({ lock, where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${this.name}${MUT ? `.mut-${MUT}` : ""}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 40)) console.log(`  ✗ ${r.lock} · ${r.where} — ${r.detail}`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.lock} · ${r.where} — ${r.detail}`)).toEqual([]);
  }
}

/** The in-page breaks — each lock's own named mutation. */
const CSS_MUT: Record<string, string> = {
  "A1-fifty-fifty": `.df1-cols { grid-template-columns: 1fr 1fr !important; }`,
  "A2-static": `.df1-feed { position: static !important; }`,
  "A3-three-columns": `.df1-cols { grid-template-columns: minmax(0,31fr) minmax(0,38fr) minmax(0,31fr) !important; } .df1-left, .df1-right { display: flex !important; } .df1-slot, .df1-feed { grid-column: auto !important; grid-row: auto !important; }`,
  "C1-cut-fill": `.df1-q [data-probe="chart-fill"] { display: none !important; }`,
  "E2-js-height": `.df1-tipit:not(.is-on) { display: none !important; }`,
  "E3-slate": `.df1-sch { background: #6a89a7 !important; }`,
};
const DOM_MUT: Record<string, string> = {
  "B1-hardcoded": `(() => { const t = document.querySelector('[data-df1="ring-text"]'); if (t) t.innerHTML = '<b>3</b><small>of 5</small>'; })()`,
  "C2-right-column": `(() => { const f = document.querySelector('[data-df1="founding"]'); const r = document.querySelector('[data-df1="right"]'); if (f && r) r.appendChild(f); })()`,
  "D2-keep-tab": `(() => { const b = document.createElement('button'); b.setAttribute('data-d58', 'tab'); b.textContent = 'Activity feed'; document.querySelector('.ws-window')?.appendChild(b); })()`,
  "F1-dead-cookies": `(() => { const n = document.querySelector('[data-df1="footer"] nav'); if (n) { const a = document.createElement('a'); a.href = '/cookies'; a.textContent = 'Cookies'; a.setAttribute('data-df1', 'foot-link'); n.appendChild(a); } })()`,
};

async function openDash(page: Page, vp: VP) {
  await page.addInitScript(([c]) => {
    try { localStorage.setItem("scriptally:sidebar-collapsed", c ? "1" : "0"); localStorage.setItem("scriptally_active_manuscript_id", "seed-ms-1"); } catch { /* private mode */ }
  }, [!!vp.collapsed] as const);
  await openRoute(page, "/dashboard", { width: vp.width, height: vp.height });
  await page.locator('[data-d58="page"][data-loading="0"]').first().waitFor({ timeout: 30_000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  if (CSS_MUT[MUT]) await page.addStyleTag({ content: CSS_MUT[MUT] });
  if (DOM_MUT[MUT]) await page.evaluate(DOM_MUT[MUT]);
  await page.mouse.move(2, 2);
  await page.waitForTimeout(400);
}
const box = (page: Page, sel: string) => page.evaluate((s) => {
  const e = document.querySelector<HTMLElement>(s);
  if (!e) return null;
  const r = e.getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height, r: r.right, b: r.bottom };
}, sel);
/** Presses "Show earlier" until the feed overflows its column (or there is nothing earlier), at most `max` times. */
async function fillFeed(page: Page, max = 15) {
  for (let i = 0; i < max; i++) {
    const over = await page.evaluate(() => { const f = document.querySelector<HTMLElement>('[data-df1="fscroll"]'); return f ? f.scrollHeight - f.clientHeight : 0; });
    const e = page.locator('[data-df1="earlier"]');
    if (over > 40 || !(await e.count())) return;
    await e.click();
    await page.waitForTimeout(150);
  }
}
const seed = (...args: string[]) => execFileSync("node", ["tests/e2e/seedDf1.mjs", ...args], { stdio: "pipe" }).toString();

/* one worker (the runner passes --workers=1): the writing cases must not overlap */
test.setTimeout(300_000);

test("DF1-A1 · three columns at 1512, 417 / 511 / 417, no header band", async ({ page }) => {
  const L = new Ledger("A1");
  await openDash(page, W1512);
  const r = await page.evaluate(() => {
    const b = (s: string) => { const e = document.querySelector<HTMLElement>(s); if (!e) return null; const x = e.getBoundingClientRect(); return { l: x.left, w: x.width, r: x.right }; };
    return { left: b('[data-df1="left"]'), feed: b('[data-df1="feed"]'), right: b('[data-df1="right"]'), header: !!document.querySelector('[data-d58="header"]') };
  });
  L.check("A1", "population: three columns found", !!r.left && !!r.feed && !!r.right && r.left.w > 0 && r.right!.w > 0, JSON.stringify(r));
  if (r.left && r.feed && r.right) {
    L.check("A1", "left 417 ±4", Math.abs(r.left.w - 417) <= 4, r.left.w.toFixed(1));
    L.check("A1", "feed 511 ±4", Math.abs(r.feed.w - 511) <= 4, r.feed.w.toFixed(1));
    L.check("A1", "right 417 ±4", Math.abs(r.right.w - 417) <= 4, r.right.w.toFixed(1));
    L.check("A1", "gap left→feed 30 ±1", Math.abs(r.feed.l - r.left.r - 30) <= 1, (r.feed.l - r.left.r).toFixed(1));
    L.check("A1", "gap feed→right 30 ±1", Math.abs(r.right.l - r.feed.r - 30) <= 1, (r.right.l - r.feed.r).toFixed(1));
  }
  L.check("A1", "no navy header band", !r.header, String(r.header));
  L.done(7);
});

test("DF1-A2 · the feed column is pinned; the cards scroll; the feed scrolls inside itself", async ({ page }) => {
  const L = new Ledger("A2");
  for (const vp of [W1512, W1280]) {
    await openDash(page, vp);
    /* the feed needs something to scroll: as many weeks as it takes */
    await fillFeed(page);
    const before = await page.evaluate(() => {
      const port = document.querySelector<HTMLElement>(".ws-wbody")!;
      return { feed: document.querySelector('[data-df1="feed"]')!.getBoundingClientRect().top, book: document.querySelector('[data-df1="book"]')!.getBoundingClientRect().top, max: port.scrollHeight - port.clientHeight };
    });
    const want = Math.min(600, before.max);
    L.check("A2", `${tag(vp)} population: the page scrolls at least 300px`, want >= 300, `max ${before.max}`);
    const after = await page.evaluate((s) => {
      const port = document.querySelector<HTMLElement>(".ws-wbody")!;
      port.scrollTop = s;
      const fs = document.querySelector<HTMLElement>('[data-df1="fscroll"]')!;
      const r = { scrolled: port.scrollTop, feed: document.querySelector('[data-df1="feed"]')!.getBoundingClientRect().top, book: document.querySelector('[data-df1="book"]')!.getBoundingClientRect().top, fOver: fs.scrollHeight - fs.clientHeight };
      fs.scrollTop = 200;
      return { ...r, fTop: fs.scrollTop };
    }, want);
    L.check("A2", `${tag(vp)} the feed's top is unchanged ±1`, Math.abs(after.feed - before.feed) <= 1, `${before.feed.toFixed(1)} → ${after.feed.toFixed(1)} (scrolled ${after.scrolled})`);
    L.check("A2", `${tag(vp)} the first left card moved up by the scroll ±1`, Math.abs(before.book - after.book - after.scrolled) <= 1, `${(before.book - after.book).toFixed(1)} vs ${after.scrolled}`);
    L.check("A2", `${tag(vp)} population: the feed overflows`, after.fOver > 0, String(after.fOver));
    L.check("A2", `${tag(vp)} the feed's own scrollTop moves`, after.fTop > 0, String(after.fTop));
  }
  L.done(10);
});

test("DF1-A3 · two columns at 1280 and 1512 expanded, the feed in column 2, the cards in order", async ({ page }) => {
  const L = new Ledger("A3");
  const ORDER = ["book-slot", "task", "tip-slot", "scout-slot", "queries", "agents", "founding", "footer-slot"];
  for (const vp of [W1280, W1512X]) {
    await openDash(page, vp);
    const r = await page.evaluate((order) => {
      const rect = (k: string) => { const e = document.querySelector<HTMLElement>(`[data-df1="${k}"]`); return e ? e.getBoundingClientRect() : null; };
      return { slots: order.map((k) => { const x = rect(k); return x ? { k, l: x.left, t: x.top, r: x.right } : null; }), feed: rect("feed") };
    }, ORDER);
    const slots = r.slots.filter((s): s is NonNullable<typeof s> => !!s);
    L.check("A3", `${tag(vp)} population: every card found`, slots.length === ORDER.length && !!r.feed, `${slots.length}/${ORDER.length}`);
    const col1 = new Set(slots.map((s) => Math.round(s.l)));
    L.check("A3", `${tag(vp)} every card in one column`, col1.size === 1, [...col1].join(","));
    L.check("A3", `${tag(vp)} the feed is column 2`, !!r.feed && slots.every((s) => r.feed!.left >= s.r), `feed ${r.feed?.left.toFixed(0)}`);
    L.check("A3", `${tag(vp)} the cards in Part A's order by top`, slots.every((s, i) => i === 0 || s.t > slots[i - 1].t), slots.map((s) => `${s.k}:${s.t.toFixed(0)}`).join(" "));
    L.check("A3", `${tag(vp)} the footer is last`, slots[slots.length - 1]?.k === "footer-slot", slots[slots.length - 1]?.k ?? "");
  }
  L.done(10);
});

test("DF1-B1 · the goal sheet sits under the card; the ring is the goals code's; no goal still shows the tiles", async ({ page, browser }) => {
  const L = new Ledger("B1");
  /* the goals code's own numbers: the Streaks & goals page (phone), which renders deriveGoalProgress */
  const phone = await browser.newPage();
  /* ⚠️ THE SHARED `openRoute` CANNOT OPEN A PHONE WIDTH (its sign-in check waits for the desktop sidebar): sign in
     at a desktop width, then narrow and open the page */
  await openRoute(phone, "/dashboard", { width: 1440, height: 900 });
  await phone.setViewportSize({ width: 390, height: 844 });
  await phone.goto("/goals");
  await phone.locator('[data-pa="goal-ring"]').first().waitFor({ timeout: 30_000 }).catch(() => {});
  const goals = await phone.evaluate(() => { const g = document.querySelector<HTMLElement>('[data-pa="goal-ring"]'); return g ? { count: g.dataset.count, target: g.dataset.target } : null; });
  await phone.close();
  L.check("B1", "population: the goals page read", !!goals, JSON.stringify(goals));
  for (const vp of [W1512, W1280]) {
    await openDash(page, vp);
    const r = await page.evaluate(() => {
      const b = document.querySelector('[data-df1="book"]')?.getBoundingClientRect();
      const g = document.querySelector('[data-df1="goal"]')?.getBoundingClientRect();
      const t = document.querySelector('[data-df1="ring-text"]');
      return { book: b?.bottom ?? null, goal: g?.top ?? null, ring: t ? [t.querySelector("b")?.textContent?.trim(), t.querySelector("small")?.textContent?.trim()] : null };
    });
    L.check("B1", `${tag(vp)} population: card and sheet`, r.book != null && r.goal != null, JSON.stringify(r));
    L.check("B1", `${tag(vp)} the sheet's top is the card's bottom ±1`, r.book != null && r.goal != null && Math.abs(r.goal - r.book) <= 1, `${r.book} / ${r.goal}`);
    if (goals?.target) L.check("B1", `${tag(vp)} the ring says the goals code's count of its target`, !!r.ring && r.ring[0] === goals.count && r.ring[1] === `of ${goals.target}`, `${JSON.stringify(r.ring)} vs ${goals.count}/${goals.target}`);
  }
  /* no goal set: written and put back in this run */
  seed("nogoal");
  try {
    await openDash(page, W1512);
    const r = await page.evaluate(() => ({ set: document.querySelector('[data-df1="set-goal"]')?.textContent ?? null, sent: !!document.querySelector('[data-df1="tile-sent"] b'), added: !!document.querySelector('[data-df1="tile-added"] b'), streak: !!document.querySelector('[data-df1="streak"]') }));
    L.check("B1", "no goal: Set a weekly goal shows", r.set === "Set a weekly goal", String(r.set));
    L.check("B1", "no goal: the tiles and the streak still render", r.sent && r.added && r.streak, JSON.stringify(r));
  } finally { seed("nogoal", "--restore"); }
  L.done(8);
});

test("DF1-C1 · Active on load, a 224px body, the switch moves nothing, the grain spills toward the hawk", async ({ page }) => {
  const L = new Ledger("C1");
  for (const vp of [W1512, W1280]) {
    await openDash(page, vp);
    const r = await page.evaluate(() => ({
      active: document.querySelector('[data-df1-q="active"]')?.getAttribute("aria-pressed"),
      body: document.querySelector('[data-df1="queries-body"]')?.getBoundingClientRect().height ?? null,
      agents: document.querySelector('[data-df1="agents"]')?.getBoundingClientRect().top ?? null,
    }));
    L.check("C1", `${tag(vp)} population: the card`, r.body != null && r.agents != null, JSON.stringify(r));
    L.check("C1", `${tag(vp)} Active is pressed on load`, r.active === "true", String(r.active));
    L.check("C1", `${tag(vp)} the chart area is 224 ±2`, r.body != null && Math.abs(r.body - 224) <= 2, String(r.body));
    /* the grain: between the last point and the hawk, the fill breaks up — some column there is part fill, part card.
       ⚠️ ON SCREEN FIRST (at 1280 the card is below the fold, and a clip outside the viewport is no reading), and the
       hawk hidden for this one reading, because the grain runs on under his box and his ink is not fill. */
    await page.evaluate(() => document.querySelector('[data-df1="queries-card"]')?.scrollIntoView({ block: "center" }));
    await page.waitForTimeout(250);
    const hide = await page.addStyleTag({ content: ".df1-q .os-mentor { visibility: hidden !important; }" });
    const g = await page.evaluate(() => {
      const last = document.querySelector('.df1-q .os-aclast')?.getBoundingClientRect();
      const plot = document.querySelector('.df1-q [data-probe="plot-box"]')?.getBoundingClientRect();
      return last && plot && plot.top >= 0 && plot.bottom <= innerHeight ? { x0: Math.round(last.right), x1: Math.round(plot.right), y0: Math.round(last.bottom + 4), y1: Math.round(plot.bottom - 6), gx: Math.round(plot.left + 6), gy: Math.round(plot.top + 3) } : null;
    });
    L.check("C1", `${tag(vp)} population: the last point and the plot, on screen`, !!g && g.y1 - g.y0 > 20 && g.x1 - g.x0 > 20, JSON.stringify(g));
    if (g && g.y1 - g.y0 > 20) {
      const ground = PNG.sync.read(await page.screenshot({ clip: { x: g.gx, y: g.gy, width: 1, height: 1 } })).data;
      const shares: string[] = [];
      let grain = false;
      for (let x = g.x0; x < g.x1; x += 3) {
        const png = PNG.sync.read(await page.screenshot({ clip: { x, y: g.y0, width: 1, height: g.y1 - g.y0 } }));
        let filled = 0;
        for (let i = 0; i < png.height; i++) {
          const d = Math.abs(png.data[i * 4] - ground[0]) + Math.abs(png.data[i * 4 + 1] - ground[1]) + Math.abs(png.data[i * 4 + 2] - ground[2]);
          if (d > 12) filled++;
        }
        const share = filled / png.height;
        shares.push(`${x}:${Math.round(share * 100)}`);
        if (share >= 0.2 && share <= 0.8) grain = true;
      }
      L.check("C1", `${tag(vp)} the grain: a column past the last point with ≥20% fill and ≥20% card`, grain, shares.join(" "));
    }
    await hide.evaluate((el) => (el as Element).remove());
    const top0 = await page.evaluate(() => {
      const q = document.querySelector('[data-df1="queries-card"]')!.getBoundingClientRect().top;
      return (document.querySelector('[data-df1="agents"]')?.getBoundingClientRect().top ?? NaN) - q;
    });
    await page.click('[data-df1-q="closed"]');
    await page.waitForTimeout(250);
    /* measured from the queries card's own top, so the page's scroll cannot enter the reading */
    const after = await page.evaluate(() => ({ title: document.querySelector('[data-df1="queries-title"]')?.textContent, rel: (document.querySelector('[data-df1="agents"]')?.getBoundingClientRect().top ?? NaN) - document.querySelector('[data-df1="queries-card"]')!.getBoundingClientRect().top }));
    L.check("C1", `${tag(vp)} Closed: the next card's top moves 0 ±1`, Number.isFinite(top0) && Math.abs(after.rel - top0) <= 1, `${top0} → ${after.rel}`);
    L.check("C1", `${tag(vp)} Closed: the header says closed`, /closed$/i.test(after.title ?? ""), String(after.title));
  }
  L.done(14);
});

test("DF1-C2 · the founding card is last in the left column, its line, nothing clipped", async ({ page }) => {
  const L = new Ledger("C2");
  for (const vp of [W1512, W1280]) {
    await openDash(page, vp);
    await page.locator('[data-d105="card"]').first().waitFor({ timeout: 15_000 }).catch(() => {});
    const r = await page.evaluate(() => {
      const f = document.querySelector<HTMLElement>('[data-df1="founding"]');
      const left = document.querySelector<HTMLElement>('[data-df1="left"]');
      /* in two columns the left column is display: contents — the founding card is then the last LEFT-COLUMN card above the footer */
      const two = left ? getComputedStyle(left).display === "contents" : false;
      const leftKids = left && !two ? [...left.children] : [];
      const order = two ? [...document.querySelectorAll<HTMLElement>(".df1-slot")].sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top).map((e) => e.dataset.df1) : [];
      /* ⚠️ A SCREEN-READER-ONLY LABEL IS 1×1 AND CLIPPED BY DESIGN (`.d105-sr`): it is not content cut off, so a box of a
         pixel or less in either direction is left out of the sweep */
      const clipped = f ? [...f.querySelectorAll<HTMLElement>("*")].filter((e) => e.clientHeight > 1 && e.clientWidth > 1 && e.scrollHeight > e.clientHeight + 1 && getComputedStyle(e).overflowY !== "visible").map((e) => `${e.className}:${e.scrollHeight}/${e.clientHeight}`) : ["no card"];
      return { found: !!f, inLeft: !!f && !!left?.contains(f), last: two ? order[order.length - 2] === "founding" : leftKids[leftKids.length - 1] === f, note: f?.querySelector('[data-d105="note"]')?.textContent ?? null, clipped, n: f ? f.querySelectorAll("*").length : 0 };
    });
    L.check("C2", `${tag(vp)} population: the card and its descendants`, r.found && r.n > 10, `${r.n} elements`);
    L.check("C2", `${tag(vp)} the left column's last card`, r.inLeft && r.last, JSON.stringify({ inLeft: r.inLeft, last: r.last }));
    L.check("C2", `${tag(vp)} its footer line`, r.note === "Top contributors win a weekly prize.", String(r.note));
    L.check("C2", `${tag(vp)} no descendant is clipped`, r.clipped.length === 0, r.clipped.slice(0, 4).join(" | "));
  }
  L.done(8);
});

test("DF1-D1 · the switch, a full request's big card, a query sent's mini row", async ({ page }) => {
  const L = new Ledger("D1");
  for (const vp of [W1512, W1280]) {
    await openDash(page, vp);
    const labels = await page.locator("[data-df1-sw]").allTextContents();
    L.check("D1", `${tag(vp)} three buttons, the pack's labels`, JSON.stringify(labels) === JSON.stringify(["All activity", "Agents", "You"]), JSON.stringify(labels));
    /* enough of the feed that every population is there: overflowing, and back far enough to hold a query sent */
    await fillFeed(page);
    for (let i = 0; i < 20; i++) {
      if (await page.locator('[data-df1="mini"][data-status="Queried"][data-dir="out"]').count()) break;
      const e = page.locator('[data-df1="earlier"]');
      if (!(await e.count())) break;
      await e.click();
      await page.waitForTimeout(150);
    }
    const dirs = () => page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-df1="big"], [data-df1="mini"]')].map((e) => e.dataset.dir));
    const all = await dirs();
    L.check("D1", `${tag(vp)} population: entries by agents and by you`, all.includes("in") && all.includes("out"), JSON.stringify({ in: all.filter((d) => d === "in").length, out: all.filter((d) => d === "out").length }));
    await page.click('[data-df1-sw="in"]');
    const inn = await dirs();
    L.check("D1", `${tag(vp)} Agents: non-zero, none by you`, inn.length > 0 && inn.every((d) => d === "in"), JSON.stringify(inn));
    await page.click('[data-df1-sw="out"]');
    const out = await dirs();
    L.check("D1", `${tag(vp)} You: non-zero, none by an agent`, out.length > 0 && out.every((d) => d === "out"), JSON.stringify(out));
    await page.click('[data-df1-sw="all"]');
    const kinds = await page.evaluate(() => ({
      fullReq: [...document.querySelectorAll<HTMLElement>('[data-df1="big"][data-status="Full Requested"]')].map((e) => ({ q: e.dataset.query, journey: e.querySelectorAll('[data-df1="stop"]').length })),
      sentMini: document.querySelectorAll('[data-df1="mini"][data-status="Queried"][data-dir="out"]').length,
      sentBig: document.querySelectorAll('[data-df1="big"][data-status="Queried"]').length,
    }));
    L.check("D1", `${tag(vp)} a full request renders a big card with its journey`, kinds.fullReq.length > 0 && kinds.fullReq.every((c) => c.journey > 0), JSON.stringify(kinds.fullReq));
    L.check("D1", `${tag(vp)} a query sent renders a mini row, never a big card`, kinds.sentMini > 0 && kinds.sentBig === 0, JSON.stringify(kinds));
    /* the materials tiles: the account records none, so one query is given its package's materials and put back */
    if (vp === W1512 && kinds.fullReq[0]?.q) {
      const qid = kinds.fullReq[0].q!;
      seed("mats", qid);
      try {
        await openDash(page, vp);
        await fillFeed(page);
        await page.waitForTimeout(800);
        const mats = await page.evaluate((q) => [...document.querySelectorAll(`[data-df1="big"][data-status="Full Requested"][data-query="${q}"] [data-df1="mat"]`)].map((m) => m.textContent), qid);
        L.check("D1", "a full request shows the package's materials as tiles", mats.length === 3 && /Query letter/.test(mats[0] ?? ""), JSON.stringify(mats));
      } finally { seed("mats", qid, "--restore"); }
    }
  }
  L.done(13);
});

test("DF1-D2 · no floating feed tab and no feed drawer on the dashboard", async ({ page }) => {
  const L = new Ledger("D2");
  for (const vp of [W1512, W1280]) {
    await openDash(page, vp);
    const r = await page.evaluate(() => ({ cols: !!document.querySelector('[data-df1="cols"]'), tab: document.querySelectorAll('[data-d58="tab"], .d59-ftab').length, drawer: document.querySelectorAll('[data-d58="drawer"]').length }));
    L.check("D2", `${tag(vp)} population: the dashboard drew`, r.cols, JSON.stringify(r));
    L.check("D2", `${tag(vp)} no tab and no drawer`, r.tab === 0 && r.drawer === 0, JSON.stringify(r));
  }
  L.done(4);
});

test("DF1-E1 · the tick box goes where Do this task goes, and completes nothing", async ({ page }) => {
  const L = new Ledger("E1");
  for (const vp of [W1512, W1280]) {
    await openDash(page, vp);
    const read = () => page.evaluate(() => ({ key: document.querySelector<HTMLElement>('[data-df1="task-box"]')?.closest<HTMLElement>('[data-d71="task"]')?.dataset.key, pos: document.querySelector('[data-d71="pos-text"]')?.textContent, label: document.querySelector('[data-df1="task-box"]')?.getAttribute("aria-label") }));
    const before = await read();
    L.check("E1", `${tag(vp)} population: a task with a tick box`, !!before.key && !!before.label, JSON.stringify(before));
    L.check("E1", `${tag(vp)} the box's name says what it does`, /^Do this task: /.test(before.label ?? ""), String(before.label));
    /* where each one leads: the URL and whatever panel or drawer it opened */
    const where = async (sel: string) => {
      await page.click(sel);
      await page.waitForTimeout(900);
      const w = await page.evaluate(() => ({
        path: location.pathname + location.search,
        /* the query panel (by its query), the action drawer, or any other dialog that opened */
        panel: [...document.querySelectorAll<HTMLElement>('[data-qp="panel"], .qad-root.is-open, [role="dialog"]')].filter((e) => e.getBoundingClientRect().width > 0)
          .map((e) => e.getAttribute("data-qp-id") ? `query:${e.getAttribute("data-qp-id")}` : e.classList.contains("qad-root") ? "drawer" : (e.getAttribute("aria-label") ?? e.className.toString().slice(0, 30))).slice(0, 3),
      }));
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
      if (!/\/dashboard/.test(page.url())) { await page.goBack(); await page.locator('[data-d58="page"][data-loading="0"]').first().waitFor({ timeout: 20_000 }).catch(() => {}); }
      return w;
    };
    const viaBox = await where('.df1-tkb:not(.is-ghost) [data-df1="task-box"]');
    const viaBtn = await where('.df1-tkb:not(.is-ghost) .df1-go');
    L.check("E1", `${tag(vp)} it went somewhere`, viaBox.path !== "/dashboard" || viaBox.panel.length > 0, JSON.stringify(viaBox));
    L.check("E1", `${tag(vp)} the box goes exactly where Do this task goes`, JSON.stringify(viaBox) === JSON.stringify(viaBtn), `${JSON.stringify(viaBox)} vs ${JSON.stringify(viaBtn)}`);
    /* re-read from the store: a fresh page still holds the task, and the plan's count is unchanged */
    await openDash(page, vp);
    const after = await read();
    const keys = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>(".df1-tkb")].length);
    L.check("E1", `${tag(vp)} not marked done: the plan still holds it, its count unchanged`, after.pos === before.pos && keys > 0, `${before.pos} → ${after.pos}`);
  }
  L.done(10);
});

test("DF1-E2 · the tip: its art inside the card, one height, a 7s turn that holds on hover, › restarts, reduced motion still", async ({ page }) => {
  const L = new Ledger("E2");
  for (const vp of [W1512, W1280]) {
    await openDash(page, vp);
    await page.locator('[data-df1="tip"]').scrollIntoViewIfNeeded();
    const r = await page.evaluate(() => {
      const card = document.querySelector('[data-df1="tip"]')!.getBoundingClientRect();
      const art = document.querySelector('[data-df1="tip"] .art-real')?.getBoundingClientRect();
      return { card: [card.left, card.top, card.right, card.bottom], art: art ? [art.left, art.top, art.right, art.bottom] : null, n: document.querySelectorAll('[data-df1="tip-item"]').length };
    });
    L.check("E2", `${tag(vp)} population: the art and ${r.n} tips`, !!r.art && r.n > 1, JSON.stringify(r));
    if (r.art) L.check("E2", `${tag(vp)} the art lies inside the card ±0.5`, r.art[0] >= r.card[0] - 0.5 && r.art[1] >= r.card[1] - 0.5 && r.art[2] <= r.card[2] + 0.5 && r.art[3] <= r.card[3] + 0.5, JSON.stringify(r));
    /* one height for every tip: step through all of them */
    const heights: number[] = [];
    for (let i = 0; i < r.n; i++) {
      heights.push(await page.evaluate(() => document.querySelector('[data-df1="tip"]')!.getBoundingClientRect().height));
      await page.click('[data-df1="tip-next"]');
      await page.waitForTimeout(500);
    }
    L.check("E2", `${tag(vp)} the card's height is equal across all tips ±1`, Math.max(...heights) - Math.min(...heights) <= 1, heights.map((h) => h.toFixed(1)).join(","));
  }
  /* the clock, at one size: the mouse well away from the card */
  await openDash(page, W1512);
  const at = () => page.evaluate(() => document.querySelector<HTMLElement>('[data-df1="tip"]')!.dataset.at);
  await page.mouse.move(5, 5);
  /* one full turn, timed from a turn to the next — the clock started at load, so the first turn is a partial one */
  const turn = (from: string | undefined) => page.waitForFunction((a) => document.querySelector<HTMLElement>('[data-df1="tip"]')!.dataset.at !== a, from, { timeout: 12_000, polling: 25 }).catch(() => {});
  await turn(await at());
  const t0 = await at();
  const start = Date.now();
  await turn(t0);
  const took = Date.now() - start;
  L.check("E2", "it advances after 7000 ±300ms", Math.abs(took - 7000) <= 300, `${took}ms`);
  /* hover holds it for 8s */
  const tip = await page.locator('[data-df1="tip"]').boundingBox();
  await page.mouse.move(tip!.x + tip!.width / 2, tip!.y + 40);
  const h0 = await at();
  await page.waitForTimeout(8000);
  L.check("E2", "it does not advance during an 8s hover", (await at()) === h0, `${h0} → ${await at()}`);
  await page.mouse.move(5, 5);
  /* › restarts the clock: pressed at ~5s into a tip, the next turn is ~7s after the press */
  await page.waitForFunction((a) => document.querySelector<HTMLElement>('[data-df1="tip"]')!.dataset.at !== a, h0, { timeout: 12_000, polling: 50 }).catch(() => {});
  await page.waitForTimeout(5000);
  await page.click('[data-df1="tip-next"]');
  /* a click leaves focus on ›, and focus inside the card pauses it (by design): blur, and move the pointer away */
  const pStart = Date.now();
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.mouse.move(5, 5);
  const p0 = await at();
  await page.waitForFunction((a) => document.querySelector<HTMLElement>('[data-df1="tip"]')!.dataset.at !== a, p0, { timeout: 12_000, polling: 50 }).catch(() => {});
  const pTook = Date.now() - pStart;
  L.check("E2", "› restarts the timer: the next turn is a full 7s after", Math.abs(pTook - 7000) <= 400, `${pTook}ms`);
  /* reduced motion: no turn in 10s */
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openDash(page, W1512);
  await page.mouse.move(5, 5);
  const r0 = await at();
  await page.waitForTimeout(10_000);
  L.check("E2", "reduced motion: no advance after 10s", (await at()) === r0, `${r0} → ${await at()}`);
  L.done(10);
});

test("DF1-E3 · the Scout: a soft pink band, an example nothing can focus, a request that survives a reload", async ({ page }) => {
  const L = new Ledger("E3");
  seed("scout-clear");
  try {
    for (const vp of [W1512, W1280]) {
      await openDash(page, vp);
      const r = await page.evaluate(() => {
        const ex = document.querySelector('[data-df1="scout-example"]');
        const focusable = ex ? ex.querySelectorAll('a, button, input, select, textarea, [tabindex]').length : -1;
        return { band: getComputedStyle(document.querySelector('.df1-sch')!).backgroundColor, ex: !!ex, inside: ex?.querySelectorAll("*").length ?? 0, focusable, text: document.querySelector('[data-df1="scout-ask"]')?.textContent };
      });
      L.check("E3", `${tag(vp)} population: the example and the button`, r.ex && r.inside > 5 && !!r.text, JSON.stringify(r));
      L.check("E3", `${tag(vp)} the band is rgb(236,211,202)`, r.band === "rgb(236, 211, 202)", r.band);
      L.check("E3", `${tag(vp)} nothing in the example is focusable`, r.focusable === 0, String(r.focusable));
    }
    const before = await page.locator('[data-df1="scout-ask"]').textContent();
    L.check("E3", "before: Tell me when it's ready", before?.trim() === "Tell me when it's ready", String(before));
    await page.click('[data-df1="scout-ask"]');
    await page.waitForTimeout(400);
    L.check("E3", "pressed: We'll let you know", (await page.locator('[data-df1="scout-ask"]').textContent())?.trim() === "We'll let you know", "");
    await page.waitForTimeout(1500);
    await openDash(page, W1512);
    L.check("E3", "after a reload: still We'll let you know", (await page.locator('[data-df1="scout-ask"]').textContent())?.trim() === "We'll let you know", String(await page.locator('[data-df1="scout-ask"]').textContent()));
  } finally { seed("scout-clear"); }
  L.done(9);
});

test("DF1-F1 · every footer link renders its page, and Give feedback opens the dock", async ({ page }) => {
  const L = new Ledger("F1");
  await openDash(page, W1512);
  const links = await page.evaluate(() => [...document.querySelectorAll<HTMLAnchorElement>('[data-df1="foot-link"]')].map((a) => a.getAttribute("href") ?? ""));
  L.check("F1", "population: the footer's links", links.length >= 5, JSON.stringify(links));
  await page.click('[data-df1="give-feedback"]');
  await page.waitForTimeout(600);
  const dock = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-fb="panel"]')].some((e) => e.getBoundingClientRect().height > 0));
  L.check("F1", "Give feedback opens FeedbackDock", dock, String(dock));
  await page.keyboard.press("Escape");
  for (const href of links) {
    const [path] = href.split("#");
    await page.evaluate((h) => { history.pushState({}, "", h); dispatchEvent(new PopStateEvent("popstate")); }, href);
    await page.waitForTimeout(1500);
    const r = await page.evaluate(() => ({ path: location.pathname, text: (document.body.innerText || "").slice(0, 4000) }));
    L.check("F1", `${href} renders its own route (no 404, no redirect)`, r.path === path && !/page not found|404/i.test(r.text) && r.text.length > 200, `${r.path} · ${r.text.length} chars`);
  }
  L.done(7);
});
