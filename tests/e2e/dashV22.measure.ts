/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD v2.2 — the DB22 locks, measured on the rendered page (ref design-refs/dashboard-v2-2/), at 1512 × 982 and
 * 1280 × 800, on the emulator's harness account (`npm run e2e:emu -- tests/e2e/dashV22.measure.ts`).
 *
 * A1 the layout · B1 the chart's band · B2 Sent · C1 the band's words · C2 the road's fill · C3 the last note ·
 * C4 a future bird's card · D1 the rank-up, once · E1 the fold. L1 is the earlier suites (the report lists them).
 *
 * THE FOUR WRITERS are states of the harness account, written with firebase-admin to the EMULATOR (the server's own
 * `foundingStats` doc, the writer's `betaFeedback`, `users.foundingSeenTier`, `todoPrefs.dash.foundingFolded`). Every
 * run imports the snapshot and exports nothing, so nothing a lock writes survives it.
 *   E — an Egg, 0 notes, no note sent
 *   F — a Fledgling, 2 notes, a last note that is now in the app
 *   A — an Archivist, 7 notes
 *   Q — a QueryHawk, 52 notes
 * ⚠️ THE THRESHOLDS ARE THE APP'S (1 · 3 · 8 · 15 · 25, lib/foundingStats `TIERS`), NOT THE PACK'S 1/5/12/25/40: F has
 * 2 notes (the pack's 3 is an Archivist here) and Scout is "At 8 notes".
 *
 * Every lock states its population first. `DB22_MUTATE=<lock>` applies that lock's named break where it can be made in
 * the page (A1, B1, C1, C2, C3); B2's, D1's and E1's breaks are source edits, made and undone around a run (the report).
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { decode } from "fast-png";
import { openRoute, liftMotionSuppression } from "./measure";
import { harnessDb } from "./harnessDocs";
import { targetEnv, EMULATOR_PROJECT, ROOT } from "./fsTarget.mjs";
import { sentAllTime, sentCount, sentWeeks, dash2Weeks } from "../../src/lib/dash2";
import { scopeQueries } from "../../src/lib/manuscriptScope";
import type { Query } from "../../src/types";

const DIR = "reports/dashboard-v2-2";
const SIZES = [{ width: 1512, height: 982 }, { width: 1280, height: 800 }] as const;
type VP = { width: number; height: number };
const tag = (v: VP) => `${v.width}x${v.height}`;
const MUT = process.env.DB22_MUTATE ?? "";

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
const near = (a: number, b: number, tol: number) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= tol;

/* ── the emulator, as the server: firebase-admin (rules do not apply) ─────────────────────────────────── */
let adm: { db: any; FieldValue: any } | null = null;
function admin() {
  if (adm) return adm;
  targetEnv();
  if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error("DB22 writes the emulator only; FIRESTORE_EMULATOR_HOST is unset.");
  const req = createRequire(resolve(ROOT, "functions/package.json"));
  const a = req("firebase-admin");
  const { getFirestore, FieldValue } = req("firebase-admin/firestore");
  const app = a.apps.find((x: { name: string }) => x.name === "db22") ?? a.initializeApp({ projectId: EMULATOR_PROJECT }, "db22");
  adm = { db: getFirestore(app), FieldValue };
  return adm;
}

type Kind = "E" | "F" | "A" | "Q";
const STATS: Record<Kind, Record<string, unknown>> = {
  E: { contributions: 0, tier: null, nextTier: "fledgling", toNext: 1, foundingNo: 42 },
  F: { contributions: 2, tier: "fledgling", nextTier: "archivist", toNext: 1, foundingNo: 42 },
  A: { contributions: 7, tier: "archivist", nextTier: "scout", toNext: 1, foundingNo: 42 },
  Q: { contributions: 52, tier: "queryhawk", nextTier: null, toNext: null, foundingNo: 42 },
};
const TIER: Record<Kind, number> = { E: 0, F: 1, A: 2, Q: 5 };
const F_NOTE = "Let me filter the Query Centre by agency";

/** The harness account as writer `k`. `seen`: undefined = the writer's own (the rank, celebrated already), null = absent. */
async function asWriter(k: Kind, opts: { seen?: number | null; folded?: boolean } = {}) {
  const { db, FieldValue } = admin();
  const { uid } = await harnessDb();
  await db.doc(`foundingStats/${uid}`).set({ ...STATS[k], waiting: 0 });
  const mine = await db.collection("betaFeedback").where("uid", "==", uid).get();
  for (const d of mine.docs) await d.ref.delete();
  if (k === "F") await db.collection("betaFeedback").add({ uid, kind: "An idea", title: F_NOTE, message: F_NOTE, status: "built", createdAt: Date.now() - 86_400_000 });
  if (k === "A") await db.collection("betaFeedback").add({ uid, kind: "Something I liked", title: "The weekly chart", message: "The weekly chart", status: "read", createdAt: Date.now() - 86_400_000 });
  const seen = opts.seen === undefined ? TIER[k] : opts.seen;
  await db.doc(`users/${uid}`).update({
    foundingSeenTier: seen === null ? FieldValue.delete() : seen,
    "todoPrefs.dash.foundingFolded": opts.folded ?? false,
  });
}
async function userDoc(): Promise<Record<string, any>> {
  const { db } = admin();
  const { uid } = await harnessDb();
  return (await db.doc(`users/${uid}`).get()).data() ?? {};
}

/** The in-page breaks, each the lock's own named mutation. */
const CSS_MUT: Record<string, string> = {
  /* "centre the toggle" */
  /* "the card shows on hover only" */
  C4: ".d58.d2 .d22-road li:focus .d22-tip, .d58.d2 .d22-road li:focus-visible .d22-tip { opacity: 0 !important; }",
  B1: ".d58.d2 .d22-tog { position: absolute !important; left: 50% !important; top: 50% !important; transform: translate(-50%, -50%) !important; margin: 0 !important; } .d58.d2 [data-d2-card='active'] .os-band { position: relative !important; }",
};
async function pageMutation(page: Page) {
  if (CSS_MUT[MUT]) await page.addStyleTag({ content: CSS_MUT[MUT] });
  /* "leave v2.1's card in place": the band back in the middle column */
  if (MUT === "A1") await page.evaluate(() => { const b = document.querySelector('.d2 [data-d2-card="founding"]'); document.querySelector('.d2 [data-d2="mid"]')?.appendChild(b!); });
  /* "hard-code Fledgling" */
  if (MUT === "C1") await page.evaluate(() => { const r = document.querySelector('.d2 [data-d2="fw-rank"]'); if (r) r.textContent = "Fledgling"; });
  /* "fill to the next bird" */
  if (MUT === "C2") await page.evaluate(() => {
    const fill = document.querySelector<HTMLElement>('.d2 [data-d2="fw-fill"]');
    if (fill) fill.style.width = `calc((100% - 70px) * ${Math.min(4, Math.ceil(Number(fill.dataset.steps)) + (Number(fill.dataset.steps) % 1 === 0 ? 1 : 0)) / 4})`;
  });
  /* "a card on every bird" */
  if (MUT === "C4r") await page.evaluate(() => {
    for (const li of document.querySelectorAll('.d2 [data-d2="fw-step"][data-state="reached"]'))
      if (!li.querySelector('[data-d2="fw-tip"]')) li.insertAdjacentHTML("beforeend", '<span class="d22-tip" data-d2="fw-tip">Reached</span>');
  });
  /* "show the row for every writer" */
  if (MUT === "C3") await page.evaluate(() => {
    const body = document.querySelector('.d2 .d22-body');
    if (body && !body.querySelector('[data-d2="fw-note"]')) body.insertAdjacentHTML("beforeend", '<div class="d22-last" data-d2="fw-note"><span class="d22-lt">Your last note</span><em>“—”</em><i data-d2="fw-outcome">Sent</i></div>');
  });
}

async function openDash(page: Page, vp: VP, opts: { motion?: boolean } = {}) {
  await page.addInitScript(() => { try { localStorage.setItem("scriptally_active_manuscript_id", "seed-ms-1"); } catch { /* private mode */ } });
  await openRoute(page, "/dashboard", vp);
  if (opts.motion) await liftMotionSuppression(page);
  await page.locator('.d2 [data-d58="page"][data-loading="0"]').first().waitFor({ timeout: 30_000 });
  await page.locator('.d2 [data-d2-card="founding"][data-loading="0"]').first().waitFor({ timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(opts.motion ? 200 : 900);
  await pageMutation(page);
  await page.waitForTimeout(150);
}

/* ⚠️ openRoute loads its route TWICE (goto, sign in, goto), and the rank-up decides on the FIRST load, so a case that
   needs the first sight of the dashboard warms the context on another route, seeds, then opens the dashboard ONCE. */
async function openDashOnce(page: Page, vp: VP, seed: () => Promise<void>) {
  await openRoute(page, "/queries", vp);
  await seed();
  await page.evaluate(() => { try { localStorage.setItem("scriptally_active_manuscript_id", "seed-ms-1"); } catch { /* private mode */ } });
  await page.goto("/dashboard");
  await liftMotionSuppression(page);
  await page.locator('.d2 [data-d58="page"][data-loading="0"]').first().waitFor({ timeout: 30_000 });
  await page.locator('.d2 [data-d2-card="founding"][data-loading="0"]').first().waitFor({ timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(200);
}

const shot = async (page: Page, name: string, clip?: { x: number; y: number; width: number; height: number }) => {
  if (!process.env.DB22_SHOTS) return;
  mkdirSync(`${DIR}/shots`, { recursive: true });
  await page.screenshot({ path: `${DIR}/shots/${name}.png`, animations: "disabled", ...(clip ? { clip } : {}) });
};

type Box = { x: number; y: number; w: number; h: number; r: number; b: number };
const box = (page: Page, sel: string) => page.evaluate((s) => {
  const el = document.querySelector(s); if (!el) return null;
  const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, r: r.right, b: r.bottom };
}, sel) as Promise<Box | null>;

/** the harness account's queries, through the same scoping the page uses */
async function scoped(page: Page): Promise<Query[]> {
  const ms = await page.evaluate(() => document.querySelector<HTMLElement>(".d2")?.dataset.scope ?? "");
  const { db, uid } = await harnessDb();
  const { collection, getDocs } = await import("firebase/firestore");
  const all = (await getDocs(collection(db, "users", uid, "queries"))).docs.map((d: { id: string; data: () => Record<string, unknown> }) => ({ id: d.id, ...d.data() })) as unknown as Query[];
  return scopeQueries(all, ms || null);
}

/** one pixel of an element's centre, read from a screenshot (the bars are drawn; this is the canvas read the pack asks
 *  for). The element is scrolled into view first: a clip outside the viewport is empty. */
async function pixel(page: Page, sel: string): Promise<string> {
  await page.locator(sel).first().scrollIntoViewIfNeeded();
  const r = await box(page, sel);
  if (!r) return "absent";
  const vp = page.viewportSize()!;
  const x = Math.min(vp.width - 1, Math.max(0, Math.round(r.x + r.w / 2))), y = Math.min(vp.height - 1, Math.max(0, Math.round(r.y + r.h / 2)));
  const png = decode(await page.screenshot({ clip: { x, y, width: 1, height: 1 }, animations: "disabled" }));
  const d = png.data as Uint8Array; const c = png.channels;
  return `rgb(${d[0]}, ${d[1]}, ${d[2]})${c === 4 && d[3] !== 255 ? ` a${d[3]}` : ""}`;
}

/* one worker (the four writers are states of one account), but each test runs whatever the one before it did */

test("DB22 A1 · B1 · B2 — the layout and the chart", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("A1-B1-B2");
  await asWriter("F");
  for (const vp of SIZES) {
    const w = tag(vp);
    await openDash(page, vp);
    /* ── A1 ── */
    const head = await box(page, ".d2 .d2-band");
    const band = await box(page, '.d2 [data-d2-card="founding"]');
    const grid = await box(page, '.d2 [data-d2="grid"]');
    L.check("A1", `${w} population`, !!head && !!band && !!grid, `header ${!!head} · band ${!!band} · grid ${!!grid}`);
    if (head && band && grid) {
      L.check("A1", `${w} 18 under the header`, near(band.y - head.b, 18, 1), `${(band.y - head.b).toFixed(1)}px`);
      L.check("A1", `${w} full width`, near(band.x, head.x, 1) && near(band.r, head.r, 1), `band ${band.x.toFixed(1)}–${band.r.toFixed(1)} · header ${head.x.toFixed(1)}–${head.r.toFixed(1)}`);
      L.check("A1", `${w} the columns 22 under the band`, near(grid.y - band.b, 22, 1), `${(grid.y - band.b).toFixed(1)}px`);
    }
    const cols = await page.evaluate(() => {
      const names = (sel: string) => [...(document.querySelector(sel)?.querySelectorAll(":scope > [data-d2-card], :scope > [data-d60]") ?? [])]
        .map((e) => (e as HTMLElement).dataset.d2Card ?? (e as HTMLElement).dataset.d60 ?? "?");
      const r = (sel: string) => { const e = document.querySelector(sel); if (!e) return null; const b = e.getBoundingClientRect(); return { w: b.width, b: b.bottom }; };
      const last = (sel: string) => { const kids = [...(document.querySelector(sel)?.children ?? [])] as HTMLElement[]; return kids.length ? Math.max(...kids.map((k) => k.getBoundingClientRect().bottom)) : NaN; };
      const feed = document.querySelector('.d2 [data-d2="feed"]')?.getBoundingClientRect();
      return {
        left: names('.d2 [data-d2="left"]'), mid: names('.d2 [data-d2="mid"]'),
        foundingInGrid: document.querySelectorAll('.d2 [data-d2="grid"] [data-d2-card="founding"]').length,
        feedInRight: !!document.querySelector('.d2 [data-d2="right"] [data-d2="feed"]'),
        widths: [r('.d2 [data-d2="left"]')?.w, r('.d2 [data-d2="mid"]')?.w, r('.d2 [data-d2="right"]')?.w],
        feedTop: feed?.top ?? NaN, feedBot: feed?.bottom ?? NaN, leftTop: document.querySelector('.d2 [data-d2="left"]')?.getBoundingClientRect().top ?? NaN,
        tallest: Math.max(last('.d2 [data-d2="left"]'), last('.d2 [data-d2="mid"]')),
      };
    });
    L.check("A1", `${w} left: Next up, then Agents`, JSON.stringify(cols.left) === JSON.stringify(["next", "agents-hoop"]), JSON.stringify(cols.left));
    L.check("A1", `${w} middle: the chart, then Closed`, JSON.stringify(cols.mid) === JSON.stringify(["active", "closed-hoop"]), JSON.stringify(cols.mid));
    L.check("A1", `${w} the feed on the right`, cols.feedInRight, String(cols.feedInRight));
    L.check("A1", `${w} no founding card in any column`, cols.foundingInGrid === 0, `${cols.foundingInGrid}`);
    L.check("A1", `${w} the feed starts level with the columns`, near(cols.feedTop, cols.leftTop, 1), `${cols.feedTop.toFixed(1)} vs ${cols.leftTop.toFixed(1)}`);
    L.check("A1", `${w} the feed ends level with the taller column`, near(cols.feedBot, cols.tallest, 2), `${cols.feedBot.toFixed(1)} vs ${cols.tallest.toFixed(1)}`);
    L.check("A1", `${w} column widths (reported)`, true, cols.widths.map((x) => x?.toFixed(0)).join(" / "));
    await shot(page, `01-dashboard-${vp.width}`);

    /* ── B1, in both modes ── */
    for (const m of ["active", "sent"] as const) {
      await page.locator(`.d2 [data-d2="chart-toggle"] [data-m="${m}"]`).click();
      await page.waitForTimeout(250);
      const g = await page.evaluate(() => {
        const bandEl = document.querySelector('.d2 [data-d2-card="active"] .os-band')!;
        const b = bandEl.getBoundingClientRect();
        const c = document.querySelector('.d2 [data-d2="chart-count"]')!.getBoundingClientRect();
        const t = document.querySelector('.d2 [data-d2="chart-toggle"]')!.getBoundingClientRect();
        const sel = [...document.querySelectorAll('.d2 [data-d2="chart-toggle"] [role="tab"]')].map((x) => `${(x as HTMLElement).dataset.m}:${x.getAttribute("aria-selected")}`);
        return { bl: b.left, br: b.right, bh: b.height, cl: c.left, cc: c.top + c.height / 2, tr: t.right, tc: t.top + t.height / 2, sel, role: document.querySelector('.d2 [data-d2="chart-toggle"]')!.getAttribute("role") };
      });
      L.check("B1", `${w} ${m} count 18 from the band's left`, near(g.cl - g.bl, 18, 2), `${(g.cl - g.bl).toFixed(1)}`);
      L.check("B1", `${w} ${m} toggle 18 from the band's right`, near(g.br - g.tr, 18, 2), `${(g.br - g.tr).toFixed(1)}`);
      L.check("B1", `${w} ${m} vertically centred`, near(g.cc, g.tc, 2), `count ${g.cc.toFixed(1)} · toggle ${g.tc.toFixed(1)}`);
      L.check("B1", `${w} ${m} band 60 tall`, near(g.bh, 60, 1), `${g.bh.toFixed(1)}`);
      L.check("B1", `${w} ${m} tablist, ${m} selected`, g.role === "tablist" && g.sel.includes(`${m}:true`) && g.sel.length === 2, g.sel.join(" "));
    }

    /* ── B2 ── */
    await page.locator('.d2 [data-d2="chart-toggle"] [data-m="active"]').click();
    await page.waitForTimeout(200);
    const activeWeeks = await page.locator('.d2 [data-d2="week"]').count();
    await page.locator('.d2 [data-d2="chart-toggle"] [data-m="sent"]').click();
    await page.waitForTimeout(250);
    const qs = await scoped(page);
    const bars = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('.d2 [data-d2="sweek"]')].map((c) => {
      const bar = c.querySelector<HTMLElement>('[data-d2="sbar"]')!;
      const r = bar.getBoundingClientRect();
      return { n: Number(c.dataset.n), cum: Number(c.dataset.cum), now: c.classList.contains("is-now"), bg: getComputedStyle(bar).backgroundColor, x: r.left + r.width / 2, y: r.top + r.height / 2, top: r.top, h: r.height, i: Number(c.dataset.i) };
    }));
    const plot = await box(page, '.d2 [data-d2="plot"]');
    L.check("B2", `${w} population`, bars.length > 0 && bars.some((b) => b.n > 0) && !!plot, `${bars.length} weeks, ${bars.filter((b) => b.n > 0).length} non-zero`);
    L.check("B2", `${w} one bar per week of Active's range`, bars.length === activeWeeks, `sent ${bars.length} · active ${activeWeeks}`);
    const nowBar = bars.find((b) => b.now);
    for (const b of bars.filter((x) => x.n > 0)) {
      const want = b.now ? "rgb(160, 103, 90)" : "rgb(45, 58, 80)";
      const px = await pixel(page, `.d2 [data-d2="sweek"][data-i="${b.i}"] [data-d2="sbar"]`);
      L.check("B2", `${w} week ${b.i} colour`, b.bg === want && px === want, `css ${b.bg} · pixel ${px} · want ${want}`);
    }
    L.check("B2", `${w} this week drawn`, !!nowBar, nowBar ? `n ${nowBar.n}` : "none");
    const head2 = (await page.locator('.d2 [data-d2="chart-count"]').textContent())?.trim();
    const wantHead = sentCount(sentAllTime(qs, new Date()));
    L.check("B2", `${w} the header`, head2 === wantHead, `"${head2}" · want "${wantHead}"`);
    /* the derived weeks, checked against the page's own data */
    const all = dash2Weeks(qs, new Date());
    const vis = all.slice(all.length - bars.length);
    const want = sentWeeks(qs, vis, new Date());
    L.check("B2", `${w} counts are the derivation's`, JSON.stringify(bars.map((b) => [b.n, b.cum])) === JSON.stringify(want.map((s) => [s.n, s.cumulative])), `page ${bars.map((b) => b.n).join(",")} · lib ${want.map((s) => s.n).join(",")}`);
    if (plot) {
      /* the scale runs to 1.15 × the highest week: 44px at the top, 34 at the foot */
      const tallest = bars.reduce((a, b) => (b.n > a.n ? b : a), bars[0]);
      const range = plot.h - 34 - 44;
      L.check("B2", `${w} headroom 1.15`, near(tallest.h, range / 1.15, 1.5), `tallest ${tallest.h.toFixed(1)} · want ${(range / 1.15).toFixed(1)}`);
    }
    const hov = bars.find((b) => b.n > 0)!;
    await page.locator(`.d2 [data-d2="sweek"][data-i="${hov.i}"]`).hover();
    await page.waitForTimeout(200);
    const tip = await page.evaluate(() => {
      const t = document.querySelector('[data-d2="stip"]'); if (!t) return null;
      return { n: t.querySelector('[data-d2="stip-n"]')?.textContent, cum: t.querySelector('[data-d2="stip-cum"]')?.textContent, rows: t.querySelectorAll('[data-d2="stip-row"]').length, more: t.querySelector('[data-d2="stip-more"]')?.textContent ?? null, vline: !!document.querySelector('.d2 [data-d2="vline"]') };
    });
    L.check("B2", `${w} hover: count, cumulative, agents`, !!tip && tip.n === String(hov.n) && tip.cum === `${hov.cum} sent in all` && tip.rows === Math.min(3, hov.n) && (hov.n > 3 ? tip.more === `and ${hov.n - 3} more` : tip.more === null) && tip.vline,
      JSON.stringify(tip));
    await page.mouse.move(2, 2);
    await shot(page, `02-sent-${vp.width}`);
    await page.locator(`.d2 [data-d2="sweek"][data-i="${hov.i}"]`).hover();
    await page.waitForTimeout(200);
    await shot(page, `02-sent-hover-${vp.width}`);
    await page.locator('.d2 [data-d2="chart-toggle"] [data-m="active"]').click();
    await page.waitForTimeout(250);
    const back = await page.evaluate(() => ({ dots: document.querySelectorAll('.d2 [data-d2="week"]').length, fill: !!document.querySelector('.d2 [data-d2="fill"]'), bars: document.querySelectorAll('.d2 [data-d2="sweek"]').length, tip: !!document.querySelector('[data-d2="stip"]') }));
    L.check("B2", `${w} back to Active restores v2.1's chart`, back.dots === activeWeeks && back.fill && back.bars === 0 && !back.tip, JSON.stringify(back));
  }
  L.done(50);
});

/* ── C · the band, for each writer ─────────────────────────────────────────────────────────────────── */
const COPY: Record<Kind, { pre: string; rank: string; ask: string; reached: string[] }> = {
  E: { pre: "You’re an", rank: "Egg", ask: "One more note and you hatch into a Fledgling.", reached: [] },
  F: { pre: "You’re a", rank: "Fledgling", ask: "One more note and you become an Archivist.", reached: ["Fledgling"] },
  A: { pre: "You’re an", rank: "Archivist", ask: "One more note and you become a Scout.", reached: ["Fledgling", "Archivist"] },
  Q: { pre: "You’ve reached", rank: "QueryHawk", ask: "Thank you. 52 notes and counting.", reached: ["Fledgling", "Archivist", "Scout", "Mentor", "QueryHawk"] },
};
/** where the fill should end, in bird-steps from Fledgling (the app's thresholds) */
const STEPS: Record<Kind, number | null> = { E: null, F: 0.5, A: 1 + 4 / 5, Q: 4 };

test("DB22 C1–C4 — the founding band for E, F, A and Q", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("C");
  for (const vp of SIZES) {
    const w = tag(vp);
    for (const k of ["E", "F", "A", "Q"] as Kind[]) {
      await asWriter(k);
      await openDash(page, vp);
      const r = await page.evaluate(() => {
        const band = document.querySelector('.d2 [data-d2-card="founding"]')!;
        const t = (s: string) => band.querySelector(s)?.textContent?.replace(/\s+/g, " ").trim() ?? null;
        const steps = [...band.querySelectorAll<HTMLElement>('[data-d2="fw-step"]')];
        const centre = (el: Element) => { const b = el.querySelector(".d22-av")!.getBoundingClientRect(); return b.left + b.width / 2; };
        const fill = band.querySelector('[data-d2="fw-fill"]')?.getBoundingClientRect();
        return {
          pre: t('[data-d2="fw-pre"]'), rank: t('[data-d2="fw-rank"]'), ask: t('[data-d2="fw-next"]'),
          steps: steps.map((s) => ({ name: s.querySelector("b")?.textContent, sub: s.querySelector('[data-d2="fw-sub"]')?.textContent, state: s.dataset.state, tick: !!s.querySelector('[data-d2="fw-tick"]') })),
          centres: steps.map(centre), fillL: fill?.left ?? null, fillR: fill?.right ?? null,
          note: !!band.querySelector('[data-d2="fw-note"]'), outcome: t('[data-d2="fw-outcome"]'), quote: t('[data-d2="fw-quote"]'),
          page: document.querySelector(".d2")!.textContent ?? "",
        };
      });
      const c = COPY[k];
      L.check("C1", `${w} ${k} population`, r.steps.length === 5, `${r.steps.length} birds`);
      L.check("C1", `${w} ${k} first line`, r.pre === c.pre, `"${r.pre}"`);
      L.check("C1", `${w} ${k} rank`, r.rank === c.rank, `"${r.rank}"`);
      L.check("C1", `${w} ${k} ask`, r.ask === c.ask, `"${r.ask}"`);
      L.check("C1", `${w} ${k} "hatch into" is the Egg's alone`, (k === "E") === /hatch into/.test(r.ask ?? ""), `"${r.ask}"`);
      const reached = r.steps.filter((s) => s.state === "reached").map((s) => s.name);
      L.check("C1", `${w} ${k} reached birds`, JSON.stringify(reached) === JSON.stringify(c.reached) && r.steps.every((s) => (s.state === "reached") === (s.sub === "Reached")) && r.steps.every((s) => (s.state === "reached") === s.tick),
        r.steps.map((s) => `${s.name}:${s.state}:${s.sub}:${s.tick ? "✓" : ""}`).join(" "));
      L.check("C1", `${w} ${k} no "to confirm"`, !/to confirm/i.test(r.page), "");
      /* C2 */
      const st = STEPS[k];
      if (st === null) L.check("C2", `${w} ${k} no fill`, r.fillL === null, `${r.fillL}`);
      else {
        const pitch = (r.centres[4] - r.centres[0]) / 4;
        const end = r.centres[0] + st * pitch;
        L.check("C2", `${w} ${k} fill from Fledgling's centre`, r.fillL !== null && near(r.fillL, r.centres[0], 2), `${r.fillL?.toFixed(1)} vs ${r.centres[0].toFixed(1)}`);
        L.check("C2", `${w} ${k} fill ends at ${st.toFixed(2)} steps`, r.fillR !== null && near(r.fillR, end, 2), `${r.fillR?.toFixed(1)} vs ${end.toFixed(1)}`);
      }
      /* C3 */
      if (k === "F") L.check("C3", `${w} F shows the last note, now in the app`, r.note && r.quote === `“${F_NOTE}”` && r.outcome === "Now in the app", `${r.note} ${r.quote} ${r.outcome}`);
      if (k === "E") L.check("C3", `${w} E shows no last-note row`, !r.note, `${r.note}`);
      if (k === "A") L.check("C3", `${w} A's read note is the plain chip`, r.note && r.outcome === "Read" && !(await page.locator('.d2 [data-d2="fw-outcome"].is-done').count()), `${r.outcome}`);
      /* C4 · E's Scout, by keyboard focus; reached birds carry no card */
      if (k === "E" || k === "A") {
        await page.locator('.d2 [data-d2="fw-step"][data-tier="3"]').focus();
        await page.waitForTimeout(250);
        const tipInfo = await page.evaluate(() => {
          const li = document.querySelector('.d2 [data-d2="fw-step"][data-tier="3"]')!;
          const tip = li.querySelector<HTMLElement>('[data-d2="fw-tip"]');
          return { text: tip?.textContent?.replace(/\s+/g, " ").trim() ?? null, op: tip ? getComputedStyle(tip).opacity : null,
            reachedWithCard: [...document.querySelectorAll('.d2 [data-d2="fw-step"][data-state="reached"]')].filter((x) => x.querySelector('[data-d2="fw-tip"]')).length,
            focusable: [...document.querySelectorAll<HTMLElement>('.d2 [data-d2="fw-step"]:not([data-state="reached"])')].every((x) => x.tabIndex === 0) };
        });
        const want = k === "E" ? "ScoutAt 8 notes · 8 to go" : "ScoutAt 8 notes · 1 to go";
        L.check("C4", `${w} ${k} focusing Scout`, tipInfo.text === want && tipInfo.op === "1" && tipInfo.focusable, JSON.stringify(tipInfo));
        L.check("C4", `${w} ${k} reached birds show no card`, tipInfo.reachedWithCard === 0, `${tipInfo.reachedWithCard}`);
        if (k === "E") { await page.locator('.d2 [data-d2="fw-step"][data-tier="3"]').hover(); await page.waitForTimeout(250); const bb = await box(page, '.d2 [data-d2-card="founding"]'); if (bb) await shot(page, `07-bird-hover-${vp.width}`, { x: bb.x, y: bb.y - 70, width: bb.w, height: bb.h + 70 }); }
      }
      const bb = await box(page, '.d2 [data-d2-card="founding"]');
      if (bb) await shot(page, `band-${k}-${vp.width}`, { x: bb.x, y: bb.y, width: bb.w, height: bb.h });
    }
  }
  L.done(60);
});

/* ── D1 · the rank-up, once ─────────────────────────────────────────────────────────────────────────── */
test("DB22 D1 — the rank-up plays once, then never; reduced motion still records it; absent is set silently", async ({ page, browser }) => {
  test.setTimeout(300_000);
  const L = new Ledger("D1");
  for (const vp of SIZES) {
    const w = tag(vp);
    /* F, last celebrated as an Egg */
    await openDashOnce(page, vp, () => asWriter("F", { seen: 0 }));
    /* the cache can hand over the last case's writer first; measure once the server's Fledgling is on the page */
    await page.waitForFunction(() => /Fledgling/.test(document.querySelector('.d2 [data-d2="fw-rank"]')?.textContent ?? ""), null, { timeout: 15_000 });
    await page.waitForTimeout(150);
    const first = await page.evaluate(() => ({
      hatch: !!document.querySelector('.d2 [data-d2="fw-badge"].is-hatch'),
      pre: document.querySelector('.d2 [data-d2="fw-pre"]')?.textContent, ask: document.querySelector('.d2 [data-d2="fw-next"]')?.textContent,
      anim: getComputedStyle(document.querySelector('.d2 .d22-new') ?? document.body).animationName,
    }));
    L.check("D1", `${w} population: F seen 0`, true, "");
    L.check("D1", `${w} the rank-up plays`, first.hatch && first.anim !== "none", JSON.stringify(first));
    L.check("D1", `${w} its words`, first.pre === "You’ve hatched into a" && first.ask === "Welcome, Fledgling. One more note to Archivist.", `${first.pre} · ${first.ask}`);
    await page.waitForTimeout(2600);
    const bb = await box(page, '.d2 [data-d2-card="founding"]');
    if (bb) await shot(page, `04-rank-up-end-${vp.width}`, { x: bb.x, y: bb.y, width: bb.w, height: bb.h });
    const after = await userDoc();
    L.check("D1", `${w} then foundingSeenTier = Fledgling`, after.foundingSeenTier === 1, `${after.foundingSeenTier}`);
    await openDash(page, vp, { motion: true });
    const again = await page.evaluate(() => !!document.querySelector('.d2 [data-d2="fw-badge"].is-hatch'));
    L.check("D1", `${w} a reload does not play it`, !again, `${again}`);
    /* reduced motion: nothing animates, the field is still written */
    /* ⚠️ openRoute loads its route TWICE (goto, sign in, goto). In a fresh context the sign-in is slow
       enough that the FIRST load plays the rank-up and writes it, and the measured second load then rightly
       shows nothing. So warm the context on another route, reset the rank, and open the dashboard ONCE. */
    const ctx = await browser.newContext({ reducedMotion: "reduce", storageState: await page.context().storageState() });
    const rp = await ctx.newPage();
    await openRoute(rp, "/queries", vp);
    await asWriter("F", { seen: 0 });
    await rp.evaluate(() => { try { localStorage.setItem("scriptally_active_manuscript_id", "seed-ms-1"); } catch { /* private mode */ } });
    await rp.goto("/dashboard");
    await rp.locator('.d2 [data-d58="page"][data-loading="0"]').first().waitFor({ timeout: 30_000 });
    await rp.locator('.d2 [data-d2-card="founding"][data-loading="0"]').first().waitFor({ timeout: 30_000 });
    await rp.waitForTimeout(350);
    const rm = await rp.evaluate(() => {
      const badge = document.querySelector('.d2 [data-d2="fw-badge"]');
      return { hatch: !!badge?.classList.contains("is-hatch"), running: badge ? badge.getAnimations({ subtree: true }).length : -1,
        newOp: getComputedStyle(document.querySelector('.d2 .d22-new') ?? document.body).opacity };
    });
    await rp.waitForTimeout(800);
    const rmDoc = await userDoc();
    L.check("D1", `${w} reduced motion: the end state, nothing animating`, rm.hatch && rm.running === 0 && rm.newOp === "1", JSON.stringify(rm));
    L.check("D1", `${w} reduced motion: still written`, rmDoc.foundingSeenTier === 1, `${rmDoc.foundingSeenTier}`);
    await ctx.close();
    /* absent: set silently */
    await openDashOnce(page, vp, () => asWriter("A", { seen: null }));
    const silent = await page.evaluate(() => !!document.querySelector('.d2 [data-d2="fw-badge"].is-hatch'));
    await page.waitForTimeout(800);
    const sDoc = await userDoc();
    L.check("D1", `${w} absent: no animation`, !silent, `${silent}`);
    L.check("D1", `${w} absent: set to the rank`, sDoc.foundingSeenTier === 2, `${sDoc.foundingSeenTier}`);
    /* the Egg never plays */
    await asWriter("E", { seen: 0 });
    await openDash(page, vp, { motion: true });
    L.check("D1", `${w} the Egg never plays`, !(await page.evaluate(() => !!document.querySelector('.d2 [data-d2="fw-badge"].is-hatch'))), "");
  }
  L.done(18);
});

/* ── E1 · the fold ─────────────────────────────────────────────────────────────────────────────────── */
test("DB22 E1 — the fold is a 62px strip, stored per user", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("E1");
  for (const vp of SIZES) {
    const w = tag(vp);
    await asWriter("A");
    await openDash(page, vp);
    const open0 = await box(page, '.d2 [data-d2-card="founding"]');
    L.check("E1", `${w} population: the band open`, !!open0 && open0.h > 100 && (await page.getAttribute('.d2 [data-d2="fw-fold"]', "aria-expanded")) === "true", `${open0?.h}`);
    await page.locator('.d2 [data-d2="fw-fold"]').click();
    await page.waitForTimeout(400);
    const f = await box(page, '.d2 [data-d2-card="founding"]');
    const fold = await page.evaluate(() => ({ road: !!document.querySelector('.d2 [data-d2="fw-road"]'), note: !!document.querySelector('.d2 [data-d2="fw-note"]'),
      label: document.querySelector('.d2 [data-d2="fw-fold"]')?.getAttribute("aria-label"), exp: document.querySelector('.d2 [data-d2="fw-fold"]')?.getAttribute("aria-expanded"),
      tells: document.querySelectorAll('.d2 [data-d2-card="founding"] [data-d2="fw-tell"]').length, stat: document.querySelector('.d2 [data-d2="fw-fstat"]') ? getComputedStyle(document.querySelector('.d2 [data-d2="fw-fstat"]')!).display : null,
      statText: document.querySelector('.d2 [data-d2="fw-fstat"]')?.textContent?.replace(/\s+/g, " ").trim() }));
    L.check("E1", `${w} folded: 62 ±2`, !!f && near(f.h, 62, 2), `${f?.h.toFixed(1)}`);
    L.check("E1", `${w} folded: no road, no note; three buttons; labelled`, !fold.road && !fold.note && fold.tells === 3 && fold.label === "Show founding writer" && fold.exp === "false", JSON.stringify(fold));
    L.check("E1", `${w} folded status`, vp.width <= 1320 ? fold.stat === "none" : fold.statText === "Archivist 1 note to Scout", `${fold.stat} "${fold.statText}"`);
    await shot(page, `06-folded-${vp.width}`);
    await page.waitForTimeout(600);
    L.check("E1", `${w} stored`, (await userDoc()).todoPrefs?.dash?.foundingFolded === true, "");
    await openDash(page, vp);
    const f2 = await box(page, '.d2 [data-d2-card="founding"]');
    L.check("E1", `${w} survives a reload`, !!f2 && near(f2.h, 62, 2), `${f2?.h.toFixed(1)}`);
    await page.locator('.d2 [data-d2="fw-fold"]').click();
    await page.waitForTimeout(400);
    const u = await box(page, '.d2 [data-d2-card="founding"]');
    L.check("E1", `${w} unfolding restores the band`, !!u && !!open0 && near(u.h, open0.h, 2), `${u?.h.toFixed(1)} vs ${open0?.h.toFixed(1)}`);
    await page.waitForTimeout(600);
    L.check("E1", `${w} unfold stored`, (await userDoc()).todoPrefs?.dash?.foundingFolded === false, "");
    /* a pending rank-up shows the band unfolded, the stored fold unchanged */
    await asWriter("A", { seen: 1, folded: true });
    await openDash(page, vp, { motion: true });
    const pend = await page.evaluate(() => ({ folded: document.querySelector('.d2 [data-d2-card="founding"]')?.getAttribute("data-folded"), hatch: !!document.querySelector('.d2 [data-d2="fw-badge"].is-hatch') }));
    await page.waitForTimeout(800);
    const pd = await userDoc();
    L.check("E1", `${w} a pending rank-up shows the band unfolded`, pend.folded === "0" && pend.hatch, JSON.stringify(pend));
    L.check("E1", `${w} …without changing the stored fold`, pd.todoPrefs?.dash?.foundingFolded === true && pd.foundingSeenTier === 2, JSON.stringify({ f: pd.todoPrefs?.dash?.foundingFolded, s: pd.foundingSeenTier }));
  }
  L.done(20);
});
