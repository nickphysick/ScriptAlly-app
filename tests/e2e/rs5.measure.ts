/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Responses v5 — THE LOCKS (design-refs/responses-v5/responses-v5.html), at 1512 × 900 and 1280 × 800.
 *
 * FIXTURE: `seedRs5.mjs` writes the reference's own 34 queries on rs5- manuscripts (full, early, five, empty), dated
 * relative to today, and the run removes them in `afterAll`. Because the data IS the reference's, the reference
 * rendered in the same browser is an independent derivation of the same figures: A2, C1 and D1 compare against it
 * rather than against numbers typed here.
 *
 * Each lock is proved red by its named mutation: `RS5_MUTATE=<lock> npx playwright test tests/e2e/rs5.measure.ts`.
 *   A1 the title card's geometry matches the reference's ±2      B1 your-move cards first
 *   A2 the glance counts sum to answered + waiting; clicks land  C1 the band's figures equal the reference's
 *   C2 warming up at 1–4 answers, not at 5                       D1 the bars sum to their totals, the totals to answered
 *   E1 the note filter counts                                    F1 six columns and no package text anywhere
 *   F2 month groups and the sort                                 G1 the panel opens from a card, a quote and a row
 *   H1 the empty page, and the switch to populated without a reload
 * Re-pointed from v2's file (tests/e2e/RETIRED-responses-v5.md says which and why), each still true of v5:
 *   P1 the navy bar and headings pin with v2's hysteresis (was rs2 C3)   G2 acting dims the page; a no lands live (was D2)
 *   S1 the share builder: names off, nothing uploaded (was E1)          L1 no sideways overflow (was L1)
 *
 * Gone quiet is the Query Centre's (D6), so A2 does not compare the "Still waiting" fact with the reference (the mock
 * counts anyone past their stated time; it reads 2 where the app reads 0) — the report says so.
 */
import { expect, test, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { openRoute } from "./measure";

const DIR = "reports/responses-v5";
const MUT = process.env.RS5_MUTATE ?? "";
const SIZES = [{ width: 1512, height: 900 }, { width: 1280, height: 800 }] as const;
const REF = `file://${resolve("design-refs/responses-v5/responses-v5.html")}`;
const near = (a: unknown, b: unknown, t: number) => typeof a === "number" && typeof b === "number" && Number.isFinite(a) && Math.abs(a - b) <= t;

type Row = { lock: string; where: string; ok: boolean; detail: string };
class Ledger {
  rows: Row[] = [];
  constructor(public name: string) {}
  check(where: string, ok: unknown, detail: string) { this.rows.push({ lock: this.name, where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${MUT ? "mut-" : ""}${this.name}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 30)) console.log(`  ✗ ${r.lock} · ${r.where} — ${r.detail}`);
    console.log(`[${this.name}] ${this.rows.filter((r) => r.ok).length}/${this.rows.length} green`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.where} — ${r.detail}`)).toEqual([]);
  }
}

/* one named break per lock; each applies only when RS5_MUTATE names it */
const obs = (body: string) => `(() => { const put = () => { ${body} }; new MutationObserver(put).observe(document.body, { subtree: true, childList: true, characterData: true }); put(); })()`;
const MUTATIONS: Record<string, { css?: string; js?: string }> = {
  /* the title card loses the reference's padding */
  A1: { css: `.rsp5 .rsp5-card.phc.phc { padding: 18px 22px !important; }` },
  /* Still waiting counts one more than there is */
  A2: { js: obs(`const n = document.querySelector('[data-rsp5="card"][data-k="waiting"] [data-rsp5="count"]'); if (n && !n.dataset.mut && n.textContent) { n.dataset.mut = '1'; n.textContent = String(+n.textContent + 1); }`) },
  /* the carousel drawn backwards */
  B1: { css: `.rsp5 .rsp5-car { flex-direction: row-reverse !important; }` },
  /* the band's reply share is one point off */
  C1: { js: obs(`const b = document.querySelector('[data-rsp5="band-fig"][data-k="replied"] b'); if (b && !b.dataset.mut && /%$/.test(b.textContent)) { b.dataset.mut = '1'; b.textContent = (parseInt(b.textContent) + 1) + '%'; }`) },
  /* the warming-up cards hidden */
  C2: { css: `[data-rsp5="warm"] { display: none !important; }` },
  /* a bar loses a segment */
  D1: { js: obs(`const s = document.querySelector('[data-rsp5="tbar"][data-k="w4"] [data-rsp5="tseg"]'); if (s && !document.body.dataset.mutd) { document.body.dataset.mutd = '1'; s.remove(); }`) },
  /* a note card goes missing */
  E1: { css: `[data-rsp5="words-wall"] > [data-rsp5="note"]:first-child { display: none !important; }` },
  /* a package column comes back */
  F1: { js: obs(`const h = document.querySelector('[data-rsp5="heads"]'); if (h && !h.querySelector('[data-mut]')) { const s = document.createElement('span'); s.setAttribute('data-mut', ''); s.textContent = 'PACKAGE'; h.appendChild(s); }`) },
  /* the list drawn oldest first */
  F2: { css: `.rsp5 .rsp5-lbody, .rsp5 .rsp5-grp { display: flex !important; flex-direction: column-reverse !important; }` },
  /* the footer's action mislabelled */
  G1: { js: obs(`const b = document.querySelector('[data-rsn="primary"]'); if (b && !b.dataset.mut) { b.dataset.mut = '1'; b.textContent = 'Record a response'; }`) },
  /* the switch to the populated page takes a reload */
  /* re-pointed from v2 (rs2 C3, D2, E1, L1): the pin, acting, the share builder's default, no sideways overflow */
  P1: { css: `.rsp5 .rsp5-pinwrap { position: relative !important; top: 0 !important; }` },
  G2: { css: `[data-side-scrim] { display: none !important; }` },
  S1: { js: obs(`const t = document.querySelector('[data-rsp="opt-names"]'); if (t && !t.dataset.mut) { t.dataset.mut = '1'; if (!t.checked) t.click(); }`) },
  L1: { css: `.rsp5 .rsp5-share { min-width: 2400px !important; }` },
  /* armed only once the empty page has been seen: while loading, the page briefly draws the populated skeleton */
  H1: { js: obs(`if (document.querySelector('[data-rsp5="wait"]')) sessionStorage.setItem('rs5armed', '1'); if (sessionStorage.getItem('rs5armed') && document.querySelector('[data-rsp5="glance-wrap"]') && !sessionStorage.getItem('rs5mut')) { sessionStorage.setItem('rs5mut', '1'); location.reload(); }`) },
};

const seed = (...args: string[]) => execFileSync("node", ["tests/e2e/seedRs5.mjs", ...args], { stdio: "inherit" });
test.beforeAll(() => { seed(); });
test.afterAll(() => { seed("--clean"); });

async function open(page: Page, ms: string, size: { width: number; height: number }, lock: string) {
  await page.addInitScript((id) => { try { localStorage.setItem("scriptally_active_manuscript_id", id); } catch { /* */ } }, ms);
  const m = MUT === lock ? MUTATIONS[lock] : null;
  if (m?.js) await page.addInitScript(`(() => { const run = () => { ${m.js} }; if (document.body) run(); else document.addEventListener("DOMContentLoaded", run); })()`);
  await openRoute(page, "/queries/responses", size);
  if (m?.css) await page.addStyleTag({ content: m.css });
  await page.locator('[data-rsp="page"]').waitFor();
  await page.waitForTimeout(1400);
}
const ev = <T,>(page: Page, js: string): Promise<T> => page.evaluate(js) as Promise<T>;
const SCROLLER = `[...document.querySelectorAll('.wpg-scroll')].find((x) => x.querySelector('[data-rsp="page"]'))`;
const toTop = (page: Page, sel: string) => ev(page, `(() => { const s = ${SCROLLER}; const e = s && s.querySelector('${sel}'); if (s && e) s.scrollTop += e.getBoundingClientRect().top - s.getBoundingClientRect().top - 40; })()`);
const offTop = (page: Page, sel: string) => ev<number | null>(page, `(() => { const s = ${SCROLLER}; const e = s && s.querySelector('${sel}'); return s && e ? e.getBoundingClientRect().top - s.getBoundingClientRect().top : null; })()`);

/** the reference, opened at the width that gives its title card the app's card width */
async function openRef(page: Page, height: number, cardW: number) {
  let w = 1512;
  for (let k = 0; k < 3; k++) {
    await page.setViewportSize({ width: w, height });
    await page.goto(REF);
    await page.waitForTimeout(400);
    const rw = await ev<number>(page, `document.querySelector('.tc').getBoundingClientRect().width`);
    if (Math.abs(rw - cardW) < 0.6) break;
    w = Math.round(w + (cardW - rw));
  }
}

/* ═════════════ A ═════════════ */
test("A1 title card", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("A1");
  for (const size of SIZES) {
    await open(page, "rs5-ms-full", size, "A1");
    const app = await ev<Record<string, number>>(page, `(() => { const c = document.querySelector('[data-rsp5="title-card"]'); const b = c.getBoundingClientRect(); const cs = getComputedStyle(c);
      const h1 = c.querySelector('h1'); const p = c.querySelector('.phc-tx > p'); const btn = c.querySelector('.phc-p'); const img = c.querySelector('.phc-art img');
      return { w: b.width, h: b.height, pt: parseFloat(cs.paddingTop), pl: parseFloat(cs.paddingLeft), r: parseFloat(cs.borderTopLeftRadius), fs: parseFloat(getComputedStyle(h1).fontSize), pfs: parseFloat(getComputedStyle(p).fontSize), bh: btn.getBoundingClientRect().height, iw: img.getBoundingClientRect().width }; })()`);
    await openRef(page, size.height, app.w);
    const ref = await ev<Record<string, number>>(page, `(() => { const c = document.querySelector('.tc'); const b = c.getBoundingClientRect(); const cs = getComputedStyle(c);
      return { w: b.width, h: b.height, pt: parseFloat(cs.paddingTop), pl: parseFloat(cs.paddingLeft), r: parseFloat(cs.borderTopLeftRadius), fs: parseFloat(getComputedStyle(c.querySelector('h1')).fontSize), pfs: parseFloat(getComputedStyle(c.querySelector('p')).fontSize), bh: c.querySelector('.b1').getBoundingClientRect().height, iw: c.querySelector('.hawk').getBoundingClientRect().width }; })()`);
    for (const k of Object.keys(ref)) L.check(`@${size.width} ${k}`, near(app[k], ref[k], 2), `app ${app[k]?.toFixed?.(1)} · ref ${ref[k]?.toFixed?.(1)}`);
  }
  L.done(18);
});

test("A2 glance", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("A2");
  for (const size of SIZES) {
    await open(page, "rs5-ms-full", size, "A2");
    const n = await ev<Record<string, number>>(page, `Object.fromEntries([...document.querySelectorAll('[data-rsp5="card"]')].map((c) => [c.dataset.k, +c.querySelector('[data-rsp5="count"]').textContent]))`);
    const line = await ev<string>(page, `document.querySelector('[data-rsp5="glance-line"]').textContent`);
    const sent = +(line.match(/of (\d+)/)?.[1] ?? NaN);
    const nos = await ev<number>(page, `document.querySelectorAll('[data-rsp5="row"]').length`);
    L.check(`@${size.width} sum`, n.more + n.passed + n.noReply + n.waiting === sent, `${JSON.stringify(n)} vs sent ${sent}`);
    L.check(`@${size.width} nos = the wall's rows`, n.passed + n.noReply === nos, `${n.passed}+${n.noReply} vs ${nos} rows`);
    /* an independent count: the reference's own cards over the same data */
    await page.goto(REF); await page.waitForTimeout(300);
    const ref = await ev<Record<string, number>>(page, `Object.fromEntries([...document.querySelectorAll('.gc')].map((c) => [c.dataset.k, +c.querySelector('.gcb b').textContent]))`);
    for (const k of ["more", "passed", "noReply", "waiting"]) L.check(`@${size.width} ${k} = ref`, n[k] === ref[k], `app ${n[k]} · ref ${ref[k]}`);
    /* the clicks land where specified */
    await open(page, "rs5-ms-full", size, "A2");
    for (const [k, sec, seg] of [["more", "more", null], ["passed", "wall", "passed"], ["noReply", "wall", "noReply"], ["waiting", "timing", null]] as const) {
      await ev(page, `(() => { const s = ${SCROLLER}; s.scrollTop = 0; })()`);
      await page.locator(`[data-rsp5="card"][data-k="${k}"] [data-rsp5="hit"]`).click();
      await page.waitForTimeout(1300);
      const t = await offTop(page, `[data-rsp5-sec="${sec}"]`);
      L.check(`@${size.width} ${k} → ${sec}`, near(t, 20, 6), `section top ${t?.toFixed(1)}`);
      if (seg) {
        const p = await ev<string | null>(page, `document.querySelector('[data-rsp5="seg-btn"][data-k="${seg}"]')?.getAttribute('aria-pressed') ?? null`);
        L.check(`@${size.width} ${k} sets the wall to ${seg}`, p === "true", `aria-pressed ${p}`);
      }
    }
  }
  L.done(24);
});

/* ═════════════ B ═════════════ */
test("B1 your move first", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("B1");
  for (const size of SIZES) {
    await open(page, "rs5-ms-full", size, "B1");
    const cards = await ev<{ x: number; you: boolean }[]>(page, `[...document.querySelectorAll('[data-rsp5="requests"] [data-rsp5="req"]')].map((c) => ({ x: c.getBoundingClientRect().left, you: c.querySelector('.rsp5-rch span').textContent === 'Your move' }))`);
    const order = cards.slice().sort((a, b) => a.x - b.x).map((c) => c.you);
    const firstAgent = order.indexOf(false);
    L.check(`@${size.width} cards`, cards.length === 7, `${cards.length} cards`);
    L.check(`@${size.width} both kinds present`, order.includes(true) && order.includes(false), JSON.stringify(order));
    L.check(`@${size.width} every your-move card before every other`, firstAgent < 0 || !order.slice(firstAgent).includes(true), JSON.stringify(order));
  }
  L.done(6);
});

/* ═════════════ C ═════════════ */
test("C1 band figures", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("C1");
  for (const [ms, state] of [["rs5-ms-full", "full"], ["rs5-ms-early", "early"]] as const) {
    await open(page, ms, SIZES[0], "C1");
    const app = await ev<string[]>(page, `[...document.querySelectorAll('[data-rsp5="band-fig"] b')].map((b) => b.textContent.trim())`);
    await page.goto(REF); await page.waitForTimeout(300);
    if (state === "early") { await page.locator('.stsw [data-s="early"]').click(); await page.waitForTimeout(300); }
    const ref = await ev<string[]>(page, `[...document.querySelectorAll('.bs b')].map((b) => b.textContent.trim())`);
    L.check(`${state} three figures`, app.length === 3, JSON.stringify(app));
    for (let i = 0; i < 3; i++) L.check(`${state} figure ${i + 1}`, app[i] === ref[i], `app ${app[i]} · ref ${ref[i]}`);
  }
  L.done(8);
});

test("C2 warming up", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("C2");
  for (const [ms, n, want] of [["rs5-ms-early", 3, 3], ["rs5-ms-five", 5, 0], ["rs5-ms-full", 22, 0]] as const) {
    await open(page, ms, SIZES[0], "C2");
    const warm = await ev<number>(page, `[...document.querySelectorAll('[data-rsp5="warm"]')].filter((e) => e.getBoundingClientRect().height > 0).length`);
    const show = await ev<number>(page, `document.querySelectorAll('[data-rsp5="show"]').length`);
    L.check(`${n} answers: warming-up cards`, warm === want, `${warm} drawn, want ${want}`);
    L.check(`${n} answers: showcase items`, show === (want ? 0 : 3), `${show} showcase items`);
    if (want) {
      const need = await ev<string>(page, `document.querySelector('[data-rsp5="warm-need"]').textContent`);
      L.check(`${n} answers: the need`, need.startsWith(`${n} of 5 answers needed. ${5 - n} more`), need);
    }
  }
  L.done(7);
});

/* ═════════════ D ═════════════ */
test("D1 bars", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("D1");
  for (const size of SIZES) {
    await open(page, "rs5-ms-full", size, "D1");
    const bars = await ev<{ k: string; n: number; segs: number }[]>(page, `[...document.querySelectorAll('[data-rsp5="tbar"]')].map((b) => ({ k: b.dataset.k, n: +b.dataset.n, segs: [...b.querySelectorAll('[data-rsp5="tseg"]')].reduce((s, x) => s + +x.textContent, 0) }))`);
    const g = await ev<Record<string, number>>(page, `Object.fromEntries([...document.querySelectorAll('[data-rsp5="card"]')].map((c) => [c.dataset.k, +c.querySelector('[data-rsp5="count"]').textContent]))`);
    L.check(`@${size.width} four bars`, bars.length === 4, `${bars.length}`);
    for (const b of bars) L.check(`@${size.width} ${b.k} segments sum to the bar`, b.segs === b.n, `${b.segs} vs ${b.n}`);
    const tot = bars.reduce((s, b) => s + b.n, 0);
    L.check(`@${size.width} bars sum to answered`, tot === g.more + g.passed + g.noReply, `${tot} vs ${g.more + g.passed + g.noReply}`);
    await page.goto(REF); await page.waitForTimeout(300);
    const ref = await ev<number[]>(page, `[...document.querySelectorAll('.tbar .tn')].map((t) => parseInt(t.textContent))`);
    L.check(`@${size.width} totals = ref`, JSON.stringify(bars.map((b) => b.n)) === JSON.stringify(ref), `app ${bars.map((b) => b.n)} · ref ${ref}`);
  }
  L.done(14);
});

/* ═════════════ E ═════════════ */
test("E1 note filter", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("E1");
  await open(page, "rs5-ms-full", SIZES[0], "E1");
  await toTop(page, '[data-rsp5="words"]');
  const chips = await ev<Record<string, number>>(page, `Object.fromEntries([...document.querySelectorAll('[data-rsp5="words-chip"]')].map((c) => [c.dataset.k, +c.dataset.n]))`);
  L.check("all = pass + req", chips.all === chips.pass + chips.req, JSON.stringify(chips));
  for (const k of ["all", "pass", "req"]) {
    await page.locator(`[data-rsp5="words-chip"][data-k="${k}"]`).click();
    await page.waitForTimeout(300);
    const cards = await ev<{ n: number; kinds: string[] }>(page, `(() => { const c = [...document.querySelectorAll('[data-rsp5="words"] [data-rsp5="note"]')].filter((x) => x.getBoundingClientRect().height > 0); return { n: c.length, kinds: [...new Set(c.map((x) => x.dataset.k))] }; })()`);
    L.check(`${k}: cards = its count`, cards.n === chips[k] && cards.n > 0, `${cards.n} cards, chip ${chips[k]}`);
    if (k !== "all") L.check(`${k}: only its kind`, JSON.stringify(cards.kinds) === JSON.stringify([k === "pass" ? "passed" : "more"]), JSON.stringify(cards.kinds));
  }
  L.done(6);
});

/* ═════════════ F ═════════════ */
test("F1 six columns, no packages", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("F1");
  for (const size of SIZES) {
    await open(page, "rs5-ms-full", size, "F1");
    const heads = await ev<string[]>(page, `[...document.querySelector('[data-rsp5="heads"]').children].map((c) => c.textContent.replace(/[↓↑]/g, '').trim())`);
    L.check(`@${size.width} headings`, JSON.stringify(heads) === JSON.stringify(["AGENT", "QUERIED", "ANSWERED", "TOOK", "GOT AS FAR AS", "WHAT THEY SAID"]), JSON.stringify(heads));
    const cells = await ev<number[]>(page, `[...document.querySelectorAll('[data-rsp5="row"]')].map((r) => r.children.length)`);
    L.check(`@${size.width} every row six cells`, cells.length > 0 && cells.every((c) => c === 6), `${cells.length} rows, ${[...new Set(cells)]}`);
    const text = await ev<string>(page, `document.querySelector('[data-rsp="page"]').innerText`);
    L.check(`@${size.width} no package text`, !/package/i.test(text), (text.match(/.{0,30}package.{0,30}/i) ?? [""])[0]);
    const cls = await ev<string[]>(page, `[...document.querySelectorAll('[data-rsp="page"] *')].map((e) => e.getAttribute('class') || '').filter((c) => /pkg|package|pchip/i.test(c))`);
    L.check(`@${size.width} no package class`, cls.length === 0, JSON.stringify(cls.slice(0, 3)));
  }
  L.done(8);
});

test("F2 month groups and sort", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("F2");
  await open(page, "rs5-ms-full", SIZES[0], "F2");
  await toTop(page, '[data-rsp5="list"]');
  const vis = (attr: string) => ev<number[]>(page, `[...document.querySelectorAll('[data-rsp5="row"]')].map((r) => ({ y: r.getBoundingClientRect().top, v: +r.dataset.${attr} })).sort((a, b) => a.y - b.y).map((x) => x.v)`);
  const desc = (a: number[]) => a.every((v, i) => i === 0 || a[i - 1] >= v);
  const asc = (a: number[]) => a.every((v, i) => i === 0 || a[i - 1] <= v);
  const months = await ev<string[]>(page, `[...document.querySelectorAll('[data-rsp5="month-band"]')].map((m) => ({ y: m.getBoundingClientRect().top, t: m.firstChild.textContent })).sort((a, b) => a.y - b.y).map((m) => m.t)`);
  const mk = (s: string) => Date.parse(`1 ${s}`);
  L.check("month headings", months.length >= 3, JSON.stringify(months));
  L.check("months newest first", desc(months.map(mk)), JSON.stringify(months));
  const ans = await vis("ans");
  L.check("rows by Answered, newest first", ans.length === 15 && desc(ans), `${ans.length} rows`);
  await page.locator('[data-rsp5="sort"][data-sort="queried"]').click(); await page.waitForTimeout(300);
  L.check("Queried: no month headings", (await ev<number>(page, `document.querySelectorAll('[data-rsp5="month-band"]').length`)) === 0, "");
  L.check("Queried, newest first", desc(await vis("q")), "");
  await page.locator('[data-rsp5="sort"][data-sort="queried"]').click(); await page.waitForTimeout(300);
  L.check("Queried again: oldest first", asc(await vis("q")), "");
  await page.locator('[data-rsp5="sort"][data-sort="wait"]').click(); await page.waitForTimeout(300);
  L.check("Took, longest first", desc(await vis("wait")), "");
  L.done(7);
});

/* ═════════════ G ═════════════ */
test("G1 panel", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("G1");
  const panel = () => ev<{ id: string | null; label: string | null; act: string | null }>(page, `(() => { const p = document.querySelector('[data-rsn="panel"]'); const b = p && p.querySelector('[data-rsn="primary"]'); return { id: p ? p.getAttribute('data-rsn-id') : null, label: b ? b.textContent : null, act: b ? b.dataset.act : null }; })()`);
  await open(page, "rs5-ms-full", SIZES[0], "G1");
  const cases: { from: string; sel: string; label: string; act: string }[] = [
    { from: "a request card (full requested)", sel: '[data-rsp5="req"][data-state="toSend"] [data-rsp5="req-open"]', label: "", act: "sent" },
    { from: "an offer card", sel: '[data-rsp5="req"][data-state="offer"] [data-rsp5="req-open"]', label: "Answer the offer", act: "offer" },
    { from: "a quote (revise and resubmit)", sel: '[data-rsp5="words"] [data-rsp5="note"][data-k="more"]', label: "Record the resubmission", act: "sent" },
    { from: "a list row", sel: '[data-rsp5="row"][data-kind="passed"]', label: "Edit the response", act: "edit" },
  ];
  for (const c of cases) {
    const el = page.locator(c.sel).first();
    const id = await el.evaluate((e) => (e.closest("[data-id]") as HTMLElement | null)?.dataset.id ?? null);
    await el.scrollIntoViewIfNeeded();
    await el.click();
    await page.waitForTimeout(900);
    const p = await panel();
    L.check(`${c.from}: opens its answer`, p.id != null && p.id === id, `panel ${p.id} · source ${id}`);
    L.check(`${c.from}: the URL names it`, page.url().includes(`answer=${id}`), page.url());
    L.check(`${c.from}: footer`, p.act === c.act && (c.label ? p.label === c.label : /^Mark (partial|full) sent$/.test(p.label ?? "")), `${p.label} (${p.act})`);
    await page.keyboard.press("Escape"); await page.waitForTimeout(500);
  }
  L.done(12);
});

/* ═════════════ H ═════════════ */
test("H1 empty, then populated without a reload", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("H1");
  await open(page, "rs5-ms-empty", SIZES[0], "H1");
  L.check("While you wait", await page.locator('[data-rsp5="wait"]').isVisible(), "");
  L.check("three example rows", (await page.locator('[data-rsp5="feat"]').count()) === 3, "");
  L.check("no glance cards yet", (await page.locator('[data-rsp5="glance-wrap"]').count()) === 0, "");
  let loads = 0;
  page.on("load", () => { loads++; });
  /* a reload clears the window, so a marker planted before the answer and still there after is proof none happened */
  await ev(page, `window.__rs5Mark = 1`);
  seed("--answer-one");
  const switched = await page.locator('[data-rsp5="glance-wrap"]').waitFor({ timeout: 30_000 }).then(() => true, () => false);
  await page.waitForTimeout(1500);
  L.check("the populated page arrives", switched, "");
  const mark = await ev<number | null>(page, `window.__rs5Mark ?? null`);
  L.check("…with no reload", loads === 0 && mark === 1, `${loads} loads, marker ${mark}`);
  L.check("…and the empty page has gone", (await page.locator('[data-rsp5="wait"]').count()) === 0, "");
  L.done(6);
});

/* ═════════════ re-pointed from v2 ═════════════ */
test("P1 pin", async ({ page }) => {
  test.setTimeout(400_000);
  const L = new Ledger("P1");
  for (const size of SIZES) {
    await open(page, "rs5-ms-full", size, "P1");
    const w = `${size.width}`;
    await ev(page, `(() => { const s = ${SCROLLER}; const l = document.querySelector('[data-rsp5="list"]'); s.scrollTop += l.getBoundingClientRect().top - s.getBoundingClientRect().top + 500; })()`);
    await page.waitForTimeout(600);
    const p = await ev<{ sc: number; bar: number; barB: number; heads: number; headsB: number; bands: { t: number; b: number }[]; pinned: string | null }>(page, `(() => {
      const s = ${SCROLLER}.getBoundingClientRect(); const bar = document.querySelector('[data-rsp5="list-bar"]').getBoundingClientRect(); const h = document.querySelector('[data-rsp5="heads"]').getBoundingClientRect();
      return { sc: s.top, bar: bar.top, barB: bar.bottom, heads: h.top, headsB: h.bottom,
        bands: [...document.querySelectorAll('[data-rsp5="month-band"]')].map((x) => { const r = x.getBoundingClientRect(); return { t: r.top, b: r.bottom }; }),
        pinned: document.querySelector('[data-rsp5="list"]').getAttribute('data-pinned') }; })()`);
    L.check(w, near(p.bar - p.sc, 12, 1), `navy bar ${(p.bar - p.sc).toFixed(1)} from the sheet top`);
    L.check(w, near(p.heads, p.barB, 1), `headings ${p.heads.toFixed(1)} directly under the bar ${p.barB.toFixed(1)}`);
    const stuck = p.bands.filter((x) => x.t < p.headsB + 60 && x.b > p.sc);
    L.check(w, stuck.length >= 1 && stuck.every((x) => x.t >= p.headsB - 1), `month heading under the stack: ${JSON.stringify(stuck)} vs ${p.headsB.toFixed(1)}`);
    L.check(w, p.pinned === "true", `pinned ${p.pinned}`);
    const start = await ev<number>(page, `(() => { const s = ${SCROLLER}; const sn = document.querySelector('[data-rsp5="pin-sentinel"]'); s.scrollTop += sn.getBoundingClientRect().top - s.getBoundingClientRect().top - 40; return s.scrollTop; })()`);
    await page.waitForTimeout(300);
    const flips = await ev<{ flips: number; drift: number }>(page, `(async () => {
      const s = ${SCROLLER}; const l = document.querySelector('[data-rsp5="list"]');
      let was = l.getAttribute('data-pinned'), flips = 0, drift = 0;
      const tick = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      for (let i = 0; i < 80; i++) { const want = s.scrollTop + 1; s.scrollTop = want; await tick(); drift = Math.max(drift, Math.abs(s.scrollTop - want)); const now = l.getAttribute('data-pinned'); if (now !== was) { flips++; was = now; } }
      for (let i = 0; i < 80; i++) { const want = s.scrollTop - 1; s.scrollTop = want; await tick(); drift = Math.max(drift, Math.abs(s.scrollTop - want)); const now = l.getAttribute('data-pinned'); if (now !== was) { flips++; was = now; } }
      return { flips, drift };
    })()`);
    L.check(w, flips.flips === 2 && flips.drift <= 1, `1px walk from ${start}: ${flips.flips} flips, drift ${flips.drift}`);
  }
  L.done(10);
});

test("G2 acting", async ({ page }) => {
  test.setTimeout(400_000);
  const L = new Ledger("G2");
  await open(page, "rs5-ms-full", SIZES[0], "G2");
  const state = () => ev<{ scrim: number; qad: number; dialogs: number; top: number }>(page, `(() => { const el = document.querySelector('[data-side-scrim]'); const s = getComputedStyle(el ?? document.body); const r = el ? el.getBoundingClientRect() : { width: 0, height: 0 }; const covers = !!el && s.display !== 'none' && s.visibility !== 'hidden' && r.width >= innerWidth - 1 && r.height >= innerHeight - 1; const a = (s.backgroundColor.match(/[\\d.]+/g) ?? [])[3]; return { scrim: covers ? Number(s.opacity) * Number(a ?? 0) : 0, qad: document.querySelectorAll('.qad-head').length, dialogs: [...document.querySelectorAll('[role="dialog"]')].filter((e) => { if (e.getBoundingClientRect().height <= 0) return false; for (let p = e; p && p !== document.body; p = p.parentElement) { const c = getComputedStyle(p); if (c.visibility === 'hidden' || +c.opacity === 0) return false; } return true; }).length /* painted only: every page stays mounted, and Dashboard v105's "how" dialog sits at opacity 0 on every route */, top: ${SCROLLER}.scrollTop }; })()`);
  const SENT = "rs5-q-full-5"; /* Marcus Reed: partial sent, so the card's own action is Record a response */
  for (const [door, sel] of [
    ["card button", `[data-rsp5="req"][data-id="${SENT}"] [data-rsp5="req-act"]`],
    ["row primary", '[data-rsp5="row"][data-kind="passed"]'],
    ["header", '[data-rsp5="record"]'],
  ] as const) {
    await page.locator(sel).first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    if (door === "row primary") { await page.locator(sel).first().click(); await page.waitForTimeout(600); await page.locator('[data-rsn="primary"]').click(); }
    else await page.locator(sel).first().click();
    const top0 = await ev<number>(page, `${SCROLLER}.scrollTop`);
    await page.waitForTimeout(250);
    const a = await state();
    L.check(door, near(a.scrim, 0.45, 0.02), `scrim alpha ${a.scrim.toFixed(3)} within 250ms`);
    L.check(door, a.qad >= 1, `.qad-head ${a.qad}`);
    L.check(door, a.dialogs === 1, `role=dialog ${a.dialogs}`);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(250);
    const b = await state();
    L.check(door, b.scrim < 0.02, `scrim after Esc ${b.scrim.toFixed(3)}`);
    L.check(door, Math.abs(b.top - top0) <= 1, `scrollTop ${top0} → ${b.top} after cancel`);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
  }
  /* recording a no on a request, live: Passed + 1, the tally + 1, the card gone, a row — then Undo */
  const read = () => ev<{ passed: number; marks: number; card: number; row: number }>(page, `({ passed: Number(document.querySelector('[data-rsp5="card"][data-k="passed"] [data-rsp5="count"]').textContent), marks: [...document.querySelectorAll('[data-rsp5="wall"] > [data-rsp5="marks"] [data-rsp="gate-ink"] path')].length, card: document.querySelectorAll('[data-rsp5="req"][data-id="${SENT}"]').length, row: document.querySelectorAll('[data-rsp5="row"][data-id="${SENT}"]').length })`);
  const before = await read();
  await page.locator(`[data-rsp5="req"][data-id="${SENT}"] [data-rsp5="req-act"]`).scrollIntoViewIfNeeded();
  await page.locator(`[data-rsp5="req"][data-id="${SENT}"] [data-rsp5="req-act"]`).click();
  await page.locator('[data-qad-chips="resp"] [data-qad-chip="pass"]').click();
  for (let i = 0; i < 8 && !(await page.locator("[data-qad-review]").count()); i++) await page.locator("[data-qad-primary]").click();
  await page.locator("[data-qad-primary]").click();
  await expect(page.locator('[data-qad-toast="on"]')).toBeVisible({ timeout: 60_000 });
  await page.waitForTimeout(800);
  const after = await read();
  L.check("record a no", after.passed === before.passed + 1, `Passed ${before.passed} → ${after.passed}`);
  L.check("record a no", after.marks === before.marks + 1, `tally strokes ${before.marks} → ${after.marks}`);
  L.check("record a no", after.card === 0 && after.row === 1, `card ${after.card}, row ${after.row}`);
  const undo = page.locator("[data-qad-undo]");
  const undone = (await undo.count()) > 0;
  if (undone) { await undo.click(); await page.waitForTimeout(1500); }
  L.check("undo was offered (the account is restored)", undone, "");
  L.done(19);
});

test("S1 share builder", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("S1");
  await page.addInitScript(() => {
    const w = window as unknown as { __rs5Text: string[] };
    w.__rs5Text = [];
    const orig = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (t: string, x: number, y: number, m?: number) { w.__rs5Text.push(String(t)); return m == null ? orig.call(this, t, x, y) : orig.call(this, t, x, y, m); };
  });
  await open(page, "rs5-ms-full", SIZES[0], "S1");
  await page.locator('[data-rsp5="share-open"]').scrollIntoViewIfNeeded();
  await page.locator('[data-rsp5="share-open"]').click();
  await page.waitForTimeout(1800);
  const names = await ev<string[]>(page, `[...document.querySelectorAll('[data-rsp5="row"] .rsp5-agt b')].map((b) => b.textContent.trim())`);
  const s = await ev<{ img: [number, number]; names: boolean; drawn: string[] }>(page, `(() => { const i = document.querySelector('[data-rsp="preview-img"]'); return { img: i ? [i.naturalWidth, i.naturalHeight] : [0, 0], names: document.querySelector('[data-rsp="opt-names"]').checked, drawn: window.__rs5Text }; })()`);
  L.check("square", s.img[0] === 1080 && s.img[1] === 1080, `preview ${s.img}`);
  L.check("names", s.names === false, `Agent names starts ${s.names ? "on" : "off"}`);
  const named = names.filter((n) => s.drawn.includes(n));
  L.check("names", names.length > 0 && named.length === 0, `full names on the canvas: ${JSON.stringify(named)}`);
  const reqs: string[] = [];
  page.on("request", (r) => reqs.push(r.url()));
  const [dl] = await Promise.all([page.waitForEvent("download"), page.locator('[data-rsp="save"]').click()]);
  await page.waitForTimeout(500);
  L.check("save", dl.suggestedFilename() === "queryhawk-wall-of-no.png", `file ${dl.suggestedFilename()}`);
  L.check("save", reqs.filter((u) => !u.startsWith("blob:") && !u.startsWith("data:")).length === 0, "no request during save");
  L.done(5);
});

test("L1 no overflow", async ({ page }) => {
  test.setTimeout(400_000);
  const L = new Ledger("L1");
  for (const width of [1920, 1512, 1280, 1180, 1024]) {
    await open(page, "rs5-ms-full", { width, height: 900 }, "L1");
    const o = await ev<{ doc: [number, number]; sc: [number, number]; app: [number, number] }>(page, `(() => { const s = ${SCROLLER}; const d = document.documentElement; const a = document.querySelector('.ws-app'); return { doc: [d.scrollWidth, d.clientWidth], sc: [s.scrollWidth, s.clientWidth], app: [a.scrollWidth, a.clientWidth] }; })()`);
    L.check(`${width}`, o.doc[0] === o.doc[1], `document ${o.doc}`);
    L.check(`${width}`, o.sc[0] === o.sc[1], `sheet scroller ${o.sc}`);
    L.check(`${width}`, o.app[0] === o.app[1], `app frame ${o.app}`);
  }
  L.done(15);
});
