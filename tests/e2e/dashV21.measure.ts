/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD v2.1 — the DB21 locks, measured on the rendered page (ref design-refs/dashboard-v2-1/), at 1512 × 982 and
 * 1280 × 800, on the emulator's harness account (`npm run e2e:emu -- tests/e2e/dashV21.measure.ts`).
 *
 * A1 the weeks-querying tag · B1 no tiles · B2 a dot per week, a navy circle for today, the line mid-card · B3 every
 * dot shows its week · C1 the founding card · D1 the feed opens only what needs you. L1 is the earlier suites (the
 * report lists them and every re-pointed assertion).
 *
 * Every lock states its population first. `DB21_MUTATE=<lock>` applies that lock's named break where the break can be
 * made in the page (A1, B1, C1); B2's and D1's breaks are source edits, made and undone around a run (see the report).
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute, liftMotionSuppression } from "./measure";
import { harnessDb } from "./harnessDocs";
import { dash2Weeks, visibleWeeks, wholeWeeksQuerying, weeksTag } from "../../src/lib/dash2";
import { scopeQueries } from "../../src/lib/manuscriptScope";
import type { Query } from "../../src/types";

const DIR = "reports/dashboard-v2-1";
const SIZES = [{ width: 1512, height: 982 }, { width: 1280, height: 800 }] as const;
type VP = { width: number; height: number };
const tag = (v: VP) => `${v.width}x${v.height}`;
const MUT = process.env.DB21_MUTATE ?? "";

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

/** The in-page breaks, each the lock's own named mutation. */
const CSS_MUT: Record<string, string> = {
  /* "show it under the title" */
  A1: ".d58.d2 .d2-bandtx { display: flex !important; flex-direction: column !important; } .d58.d2 .d2-wq { order: 3 !important; margin: 6px 0 0 !important; }",
};

async function openDash(page: Page, vp: VP, ms = "seed-ms-1") {
  await page.addInitScript((id) => { try { localStorage.setItem("scriptally_active_manuscript_id", id); } catch { /* private mode */ } }, ms);
  await openRoute(page, "/dashboard", vp);
  await page.locator('.d2 [data-d58="page"][data-loading="0"]').first().waitFor({ timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(900);
  if (CSS_MUT[MUT]) await page.addStyleTag({ content: CSS_MUT[MUT] });
  /* "keep the tiles": v2's three tiles, put back at the head of the card */
  if (MUT === "B1") await page.evaluate(() => document.querySelector('.d2 [data-d2="aq"]')?.insertAdjacentHTML("afterbegin",
    '<div class="d2-tiles" data-d2="tiles"><div><b>2</b><span>waiting on you</span></div><div><b>40%</b><span>have replied</span></div><div><b>9</b><span>weeks querying</span></div></div>'));
  await page.waitForTimeout(150);
}

const shot = async (page: Page, name: string, full = false) => {
  if (!process.env.DB21_SHOTS) return;
  mkdirSync(`${DIR}/shots`, { recursive: true });
  /* the document never scrolls (the page scrolls inside the window), so "full" is a viewport tall enough for the page */
  const vp = page.viewportSize()!;
  if (full) { await page.setViewportSize({ width: vp.width, height: 1900 }); await page.waitForTimeout(500); }
  await page.screenshot({ path: `${DIR}/shots/${name}.png`, animations: "disabled" });
  if (full) { await page.setViewportSize(vp); await page.waitForTimeout(300); }
};

/** the harness account's queries, through the same scoping the page uses */
async function scoped(page: Page): Promise<Query[]> {
  const ms = await page.evaluate(() => document.querySelector<HTMLElement>(".d2")?.dataset.scope ?? "");
  const { db, uid } = await harnessDb();
  const { collection, getDocs } = await import("firebase/firestore");
  const all = (await getDocs(collection(db, "users", uid, "queries"))).docs.map((d: { id: string; data: () => Record<string, unknown> }) => ({ id: d.id, ...d.data() })) as unknown as Query[];
  return scopeQueries(all, ms || null);
}

for (const vp of SIZES) {
  test(`DB21 A · the weeks-querying tag · ${tag(vp)}`, async ({ page }) => {
    const L = new Ledger(`A-${tag(vp)}`);
    await openDash(page, vp);
    const nowMs = await page.evaluate(() => Date.now());
    const n = wholeWeeksQuerying(await scoped(page), new Date(nowMs));
    const t = await page.evaluate(() => {
      const tagEl = document.querySelector<HTMLElement>('.d2 [data-d2="weeks-tag"]');
      const title = document.querySelector<HTMLElement>('.d2 [data-d2="title"]');
      const tr = tagEl?.getBoundingClientRect(), hr = title?.getBoundingClientRect();
      const cs = tagEl ? getComputedStyle(tagEl) : null;
      return { text: tagEl?.textContent ?? null, tagB: tr?.bottom ?? -1, tagH: tr?.height ?? 0, titleT: hr?.top ?? -1, color: cs?.color, ff: cs?.fontFamily, fs: cs?.fontSize, tt: cs?.textTransform, gap: tr && hr ? hr.top - tr.bottom : null };
    });
    L.check("A1", "population: a querying account and a tag on screen", n != null && n > 0 && t.tagH > 0, `n ${n}, tag ${t.text} (${t.tagH}px)`);
    L.check("A1", "reads the derivation's count", t.text === weeksTag(n ?? -1), `${t.text} want ${weeksTag(n ?? -1)}`);
    L.check("A1", "sits above the title", t.tagB > 0 && t.tagB <= t.titleT, `tag bottom ${t.tagB.toFixed(1)}, title top ${t.titleT.toFixed(1)}, gap ${t.gap?.toFixed(1)}`);
    L.check("A1", "rust, mono, 12px, uppercase", t.color === "rgb(217, 150, 122)" && /JetBrains Mono/.test(t.ff ?? "") && t.fs === "12px" && t.tt === "uppercase", `${t.color} ${t.ff} ${t.fs} ${t.tt}`);
    await shot(page, `01-dashboard-${vp.width}`);
    /* an account with no queries: a manuscript of the harness's with none */
    const page2 = await page.context().newPage();
    await openDash(page2, vp, "cv25-ms-empty");
    const e = await page2.evaluate(() => ({ scope: document.querySelector<HTMLElement>(".d2")?.dataset.scope, title: document.querySelector('.d2 [data-d2="title"]')?.textContent, tag: !!document.querySelector('.d2 [data-d2="weeks-tag"]'), text: document.querySelector<HTMLElement>('.d2 [data-d2="band"]')?.innerText ?? "" }));
    const none = wholeWeeksQuerying(await scoped(page2), new Date(nowMs));
    L.check("A1", "population: the empty manuscript is on screen with no sends", e.scope === "cv25-ms-empty" && none === null && !!e.title, JSON.stringify(e));
    L.check("A1", "no queries, no tag", !e.tag && !/querying/i.test(e.text), JSON.stringify(e));
    await page2.close();
    L.done(6);
  });

  test(`DB21 B · Active queries: no tiles, dots, today big · ${tag(vp)}`, async ({ page }) => {
    const L = new Ledger(`B-${tag(vp)}`);
    await openDash(page, vp);
    /* B1 */
    const b1 = await page.evaluate(() => {
      const card = document.querySelector<HTMLElement>('.d2 [data-d2-card="active"]');
      const text = (card?.innerText ?? "").toLowerCase();
      return { on: !!card && card.getBoundingClientRect().height > 200, len: text.length, hits: ["waiting on you", "have replied", "weeks querying"].filter((w) => text.includes(w)) };
    });
    L.check("B1", "population: the card is drawn", b1.on && b1.len > 10, JSON.stringify(b1));
    L.check("B1", "no 'waiting on you', 'have replied' or 'weeks querying'", b1.hits.length === 0, JSON.stringify(b1.hits));

    /* B2: the derivation's weeks, the dots on the line, today's circle, the headroom */
    const nowMs = await page.evaluate(() => Date.now());
    const plotW = await page.evaluate(() => document.querySelector<HTMLElement>('.d2 [data-d2="plot"]')!.clientWidth);
    const expected = visibleWeeks(dash2Weeks(await scoped(page), new Date(nowMs)), plotW, 22).map((w) => w.total);
    const g = await page.evaluate(() => {
      const plot = document.querySelector<HTMLElement>('.d2 [data-d2="plot"]')!;
      const pr = plot.getBoundingClientRect();
      const path = plot.querySelector<SVGPathElement>('.d2-plotsvg path[stroke="#1c130f"]')!;
      const len = path.getTotalLength();
      /* the line's y at x, read off the drawn path itself */
      const yAt = (x: number) => { let lo = 0, hi = len; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (path.getPointAtLength(m).x < x) lo = m; else hi = m; } return path.getPointAtLength((lo + hi) / 2).y; };
      const wks = [...plot.querySelectorAll<HTMLElement>('[data-d2="week"]')];
      const pts = wks.map((w) => {
        const r = w.getBoundingClientRect(), cs = getComputedStyle(w);
        const cx = r.left + r.width / 2 - pr.left, cy = r.top + r.height / 2 - pr.top;
        return { now: w.classList.contains("is-now"), dot: w.classList.contains("d2-dot"), w: r.width, h: r.height, bg: cs.backgroundColor, text: (w.textContent ?? "").trim(), cx, cy, line: yAt(cx), total: Number(w.dataset.total) };
      });
      return { plotH: pr.height, pts };
    });
    const dots = g.pts.filter((p) => !p.now), last = g.pts.at(-1);
    L.check("B2", "population: weeks drawn and expected", g.pts.length >= 4 && expected.length === g.pts.length, `${g.pts.length} drawn, ${expected.length} expected`);
    L.check("B2", "one per week, each the derivation's figure", JSON.stringify(g.pts.map((p) => p.total)) === JSON.stringify(expected), `got ${g.pts.map((p) => p.total)} want ${expected}`);
    L.check("B2", "a dot for every week but the last", dots.length === g.pts.length - 1 && dots.every((p) => p.dot && Math.abs(p.w - 9) <= 0.5 && p.text === "" && p.bg === "rgb(255, 255, 255)"), JSON.stringify(dots.slice(0, 3)));
    L.check("B2", "the last is a 36px navy circle holding the total", !!last && last.now && Math.abs(last.w - 36) <= 1 && Math.abs(last.h - 36) <= 1 && last.bg === "rgb(45, 58, 80)" && last.text === String(expected.at(-1)), JSON.stringify(last));
    const off = g.pts.map((p) => Math.abs(p.cy - p.line));
    L.check("B2", "every centre sits on the line ±2", off.every((d) => d <= 2), `max ${Math.max(...off).toFixed(2)}`);
    const top = Math.min(...g.pts.map((p) => p.cy));
    L.check("B2", "the highest point is at least 25% of the plot below its top", top >= 0.25 * g.plotH && Math.abs(g.plotH - 270) <= 1, /* RE-POINTED (v2.2): 270px */ `${top.toFixed(1)} of ${g.plotH} (${(100 * top / g.plotH).toFixed(1)}%)`);

    /* B3: every dot shows its own week's breakdown */
    await liftMotionSuppression(page);
    const n = g.pts.length;
    let ok = 0;
    const bad: string[] = [];
    for (let i = 0; i < n; i++) {
      await page.locator('.d2 [data-d2="week"]').nth(i).hover();
      await page.waitForTimeout(120);
      const r = await page.evaluate((k) => {
        const tip = document.querySelector<HTMLElement>('[data-d2="wtip"]');
        const w = document.querySelectorAll<HTMLElement>('.d2 [data-d2="week"]')[k];
        const lab = w.getAttribute("aria-label")!.match(/Week of (.*): (\d+)/)!;
        const rows = [...(tip?.querySelectorAll<HTMLElement>('[data-d2="wtip-row"]') ?? [])].map((x) => Number(x.dataset.n));
        return { shown: !!tip, date: tip?.querySelector('[data-d2="wtip-date"]')?.textContent, total: Number(tip?.querySelector('[data-d2="wtip-total"]')?.textContent), want: lab[1], wantN: Number(lab[2]), sum: rows.reduce((a, b) => a + b, 0), line: !!document.querySelector('.d2 [data-d2="vline"]') };
      }, i);
      if (r.shown && r.line && r.date === r.want && r.total === r.wantN && r.sum === r.total) ok++; else bad.push(`${i}: ${JSON.stringify(r)}`);
      if (i === Math.max(0, n - 4)) await shot(page, `03-week-hover-${vp.width}`);
    }
    await page.mouse.move(2, 2);
    L.check("B3", "population: weeks to hover", n >= 4, `${n}`);
    L.check("B3", "every dot and today's circle shows its own week", ok === n, bad.slice(0, 3).join(" | "));
    L.done(10);
  });

  /* RETIRED (Dashboard v2.2): DB21 C measured v2.1's founding CARD — its 5px progress ring, 132px badge, six-marker road
     and "Your first note counts towards…" line, none of which the v2.2 band has. Its words and every rank are held by
     DB22 C1–C4 (tests/e2e/dashV22.measure.ts) and lib/foundingBand.test.ts. */
}

/* ── D1: the feed opens only what needs you. Seeded on the emulator, removed after. ── */
const NS = "db21";
const SEED = {
  req: { id: `${NS}-q-req`, agentId: "clv-fx-never", name: "Imogen Vale" },
  offer: { id: `${NS}-q-offer`, agentId: "clv-fx-reopen", name: "Tomas Keller" },
  sent: { id: `${NS}-q-sent`, agentId: "clv-fx-stale", name: "Ingrid Marsh" },
};
const iso = (ms: number) => new Date(ms).toISOString();

async function seedFeed() {
  const { db, uid } = await harnessDb();
  const { doc, setDoc } = await import("firebase/firestore");
  const now = Date.now(), D = 86_400_000, H = 3_600_000;
  const base = { userId: uid, manuscriptId: "seed-ms-1", packageId: "", sentHow: "unrecorded", personalisationNotes: "", sendMethod: "Email" };
  const q = (id: string, agentId: string, extra: Record<string, unknown>) => setDoc(doc(db, "users", uid, "queries", id), { ...base, id, agentId, dateSent: iso(now - 40 * D), ...extra });
  const a = (id: string, queryId: string, extra: Record<string, unknown>) => setDoc(doc(db, "users", uid, "activities", id), { id, queryId, userId: uid, manuscriptId: "seed-ms-1", details: "", ...extra });
  await q(SEED.req.id, SEED.req.agentId, { status: "Full Requested", fullRequestedDate: iso(now - 2 * H), lastStatusChange: iso(now - 2 * H) });
  await a(`${NS}-a-req`, SEED.req.id, { activityType: "Status Changed", eventKey: "full_requested", resultingStatus: "Full Requested", date: iso(now - 2 * H), description: `${SEED.req.name} asked for the full manuscript` });
  await q(SEED.offer.id, SEED.offer.agentId, { status: "Offer", lastStatusChange: iso(now - 3 * H) });
  await a(`${NS}-a-offer`, SEED.offer.id, { activityType: "Status Changed", eventKey: "offer", resultingStatus: "Offer", date: iso(now - 3 * H), description: `${SEED.offer.name} made an offer` });
  await q(SEED.sent.id, SEED.sent.agentId, { status: "Full Sent", fullRequestedDate: iso(now - 10 * D), fullSentDate: iso(now - 4 * H), lastStatusChange: iso(now - 4 * H) });
  await a(`${NS}-a-sent`, SEED.sent.id, { activityType: "Materials Sent", eventKey: "full_sent", resultingStatus: "Full Sent", date: iso(now - 4 * H), description: `Full manuscript sent to ${SEED.sent.name}` });
}
async function markSent() {
  const { db, uid } = await harnessDb();
  const { doc, setDoc, updateDoc } = await import("firebase/firestore");
  const now = Date.now();
  await updateDoc(doc(db, "users", uid, "queries", SEED.req.id), { status: "Full Sent", fullSentDate: iso(now), lastStatusChange: iso(now) });
  await setDoc(doc(db, "users", uid, "activities", `${NS}-a-req-sent`), { id: `${NS}-a-req-sent`, queryId: SEED.req.id, userId: uid, manuscriptId: "seed-ms-1", details: "", activityType: "Materials Sent", eventKey: "full_sent", resultingStatus: "Full Sent", date: iso(now), description: `Full manuscript sent to ${SEED.req.name}` });
}
async function unseed() {
  const { db, uid } = await harnessDb();
  const { doc, deleteDoc } = await import("firebase/firestore");
  for (const s of Object.values(SEED)) await deleteDoc(doc(db, "users", uid, "queries", s.id)).catch(() => {});
  for (const id of ["req", "offer", "sent", "req-sent"]) await deleteDoc(doc(db, "users", uid, "activities", `${NS}-a-${id}`)).catch(() => {});
}

test.describe("DB21 D", () => {
  /* one seed for the three tests, and the write last: in order, in one worker */
  test.describe.configure({ mode: "serial" });
  test.beforeAll(async () => { await unseed(); await seedFeed(); });
  test.afterAll(async () => { await unseed(); });

  for (const vp of SIZES) {
    test(`DB21 D · the feed opens only what needs you · ${tag(vp)}`, async ({ page }) => {
      const L = new Ledger(`D-${tag(vp)}`);
      await openDash(page, vp);
      await page.locator(`.d2 [data-query="${SEED.sent.id}"]`).first().waitFor({ timeout: 10_000 }).catch(() => {});
      const read = () => page.evaluate((ids) => {
        const feed = document.querySelector<HTMLElement>('.d2 [data-d2="feed"]')!;
        const of = (id: string) => {
          const big = feed.querySelector<HTMLElement>(`[data-df1="big"][data-query="${id}"]`);
          const row = feed.querySelector<HTMLElement>(`[data-df1="collapsed"][data-query="${id}"]`);
          return { big: !!big, row: !!row, exp: row?.getAttribute("aria-expanded") ?? null, fold: big?.querySelector('[data-df1="fold"]')?.getAttribute("aria-label") ?? null,
            foldExp: big?.querySelector('[data-df1="fold"]')?.getAttribute("aria-expanded") ?? null, sub: row?.querySelector('[data-df1="collapsed-sub"]')?.textContent ?? null, tag: row?.tagName ?? null };
        };
        return Object.fromEntries(ids.map((id) => [id, of(id)]));
      }, [SEED.req.id, SEED.offer.id, SEED.sent.id]);
      const r = await read();
      L.check("D1", "population: the three seeded events are in the feed", Object.values(r).every((x) => x.big || x.row), JSON.stringify(r));
      L.check("D1", "a full requested, not yet sent: the full card", r[SEED.req.id].big && !r[SEED.req.id].row && r[SEED.req.id].fold === null, JSON.stringify(r[SEED.req.id]));
      L.check("D1", "an offer not yet answered: the full card", r[SEED.offer.id].big && !r[SEED.offer.id].row, JSON.stringify(r[SEED.offer.id]));
      L.check("D1", "a full already sent: a collapsed row, a button, not expanded", r[SEED.sent.id].row && !r[SEED.sent.id].big && r[SEED.sent.id].tag === "BUTTON" && r[SEED.sent.id].exp === "false", JSON.stringify(r[SEED.sent.id]));
      L.check("D1", "the collapsed row's sub-line names the agent", (r[SEED.sent.id].sub ?? "").startsWith(SEED.sent.name), `${r[SEED.sent.id].sub}`);
      await shot(page, `01-feed-${vp.width}`);
      /* no collapsed row means there is nothing to open: report the readings above as the failure, never a crash */
      if (!r[SEED.sent.id].row) { L.done(5); return; }

      /* open it; the feed keeps its place. The feed is reached back until it overflows, then scrolled so the row sits
         part way down — a scroll position of 0 would prove nothing — and the row is pressed in the page (a Playwright
         click scrolls its target into view first, which is the thing being measured). */
      if (process.env.DB21_SHOTS) await page.locator(`.d2 [data-df1="collapsed"][data-query="${SEED.sent.id}"]`).screenshot({ path: `${DIR}/shots/collapsed-row-${vp.width}.png` });
      const pos = await page.evaluate(async (id) => {
        const sc = document.querySelector<HTMLElement>('.d2 [data-df1="fscroll"]')!;
        for (let i = 0; i < 12 && sc.scrollHeight <= sc.clientHeight + 200; i++) {
          const more = sc.querySelector<HTMLButtonElement>('[data-df1="earlier"]');
          if (!more) break;
          more.click(); await new Promise((r) => setTimeout(r, 150));
        }
        const row = sc.querySelector<HTMLElement>(`[data-df1="collapsed"][data-query="${id}"]`)!;
        sc.scrollTop = Math.max(0, row.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop - 80);
        await new Promise((r) => requestAnimationFrame(() => r(null)));
        return { top: sc.scrollTop, over: sc.scrollHeight - sc.clientHeight, rowY: row.getBoundingClientRect().top - sc.getBoundingClientRect().top };
      }, SEED.sent.id);
      await page.evaluate((id) => document.querySelector<HTMLButtonElement>(`.d2 [data-df1="collapsed"][data-query="${id}"]`)!.click(), SEED.sent.id);
      await page.waitForTimeout(250);
      const o = await read();
      const after = await page.evaluate((id) => {
        const sc = document.querySelector<HTMLElement>('.d2 [data-df1="fscroll"]')!;
        const card = sc.querySelector<HTMLElement>(`[data-df1="big"][data-query="${id}"]`);
        return { top: sc.scrollTop, cardY: card ? card.getBoundingClientRect().top - sc.getBoundingClientRect().top : null, focus: document.activeElement?.getAttribute("data-df1") ?? null };
      }, SEED.sent.id);
      L.check("D1", "clicking the row opens the full card, with a fold button", o[SEED.sent.id].big && !o[SEED.sent.id].row && o[SEED.sent.id].fold === "Collapse" && o[SEED.sent.id].foldExp === "true", JSON.stringify(o[SEED.sent.id]));
      L.check("D1", "population: the feed overflows and is scrolled", pos.over > 0 && pos.top > 0, JSON.stringify(pos));
      L.check("D1", "the feed keeps its scroll position, the card where the row was", Math.abs(after.top - pos.top) <= 1 && after.cardY != null && Math.abs(after.cardY - pos.rowY) <= 1, `scroll ${pos.top} → ${after.top}, row ${pos.rowY.toFixed(1)} → card ${after.cardY?.toFixed(1)}`);
      L.check("D1", "focus moves to the fold button", after.focus === "fold", `${after.focus}`);
      await shot(page, `04-feed-row-opened-${vp.width}`);
      await page.evaluate((id) => document.querySelector<HTMLButtonElement>(`.d2 [data-df1="big"][data-query="${id}"] [data-df1="fold"]`)!.click(), SEED.sent.id);
      await page.waitForTimeout(250);
      const c = await read();
      const back = await page.evaluate(() => ({ top: document.querySelector<HTMLElement>('.d2 [data-df1="fscroll"]')!.scrollTop, focus: document.activeElement?.getAttribute("data-df1") ?? null }));
      L.check("D1", "the fold collapses it again", c[SEED.sent.id].row && !c[SEED.sent.id].big && c[SEED.sent.id].exp === "false", JSON.stringify(c[SEED.sent.id]));
      L.check("D1", "folding keeps the place too, and focus returns to the row", Math.abs(back.top - pos.top) <= 1 && back.focus === "collapsed", JSON.stringify(back));
      L.done(11);
    });
  }

  /* last: logging the full as sent collapses its request on the next render. The write is the stored result of the
     sent journey (the status, the date and the send's activity), made here so the lock does not depend on the drawer. */
  test("DB21 D · logging the full as sent collapses the request · 1512x982", async ({ page }) => {
    const L = new Ledger("D-logged");
    await openDash(page, SIZES[0]);
    await page.locator(`.d2 [data-query="${SEED.req.id}"]`).first().waitFor({ timeout: 10_000 }).catch(() => {});
    const before = await page.evaluate((id) => !!document.querySelector(`.d2 [data-df1="big"][data-query="${id}"]`), SEED.req.id);
    L.check("D1", "population: the request is open first", before, `${before}`);
    await markSent();
    await page.waitForFunction((id) => !document.querySelector(`.d2 [data-df1="big"][data-query="${id}"]`), SEED.req.id, { timeout: 10_000 }).catch(() => {});
    const after = await page.evaluate((id) => ({
      rows: document.querySelectorAll(`.d2 [data-df1="collapsed"][data-query="${id}"]`).length,
      bigs: document.querySelectorAll(`.d2 [data-df1="big"][data-query="${id}"]`).length,
    }), SEED.req.id);
    L.check("D1", "once sent, every big event on that query is a collapsed row", after.rows >= 1 && after.bigs === 0, JSON.stringify(after));
    L.done(2);
  });
});
