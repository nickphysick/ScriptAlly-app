/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Responses v2 — the RS2 locks on the rendered page, at 1512 × 900 and 1280 × 800 with the shell (unless a lock names
 * other sizes): A1, A2, B1–B4, C1–C4, D1, D2, E1, F1, F2, L1. (D1 data is a unit lock: src/lib/responses.test.ts.)
 *
 * Each lock was run with its named break (`RS2_MUTATE=<lock>`, the table below) and went red before its green was
 * believed; the readings are reports/responses-v2/ledger/{mut-}<lock>.json.
 *
 * FIXTURES. The Smoke Test (seed-ms-1) is the populated page; The Quiet Second (seed-ms-2) has answers and no nos;
 * `seedRs2.mjs` writes the rest (`rs2-ms-*`: empty, two nos with one of each request state, 34 nos, 140 nos, and
 * nos with no request) and the run removes them in `afterAll`.
 * ⚠️ WRITES ARE PUT BACK: D2 and F1 record a rejection through the real journey and press its Undo; whatever is left,
 *    the seeder's `--clean` removes, because both write only to `rs2-` documents.
 */
import { expect, test, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";

const DIR = "reports/responses-v2";
const MUT = process.env.RS2_MUTATE ?? "";
const SIZES = [{ width: 1512, height: 900 }, { width: 1280, height: 800 }] as const;
const near = (a: unknown, b: number, t: number) => typeof a === "number" && Number.isFinite(a) && Math.abs(a - b) <= t;

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

/* one named break per lock; each is applied only when RS2_MUTATE names it */
const obs = (body: string) => `(() => { const put = () => { ${body} }; new MutationObserver(put).observe(document.body, { subtree: true, childList: true }); put(); })()`;
const MUTATIONS: Record<string, { css?: string; js?: string }> = {
  /* add the hawk to the header */
  A1: { js: obs(`const h = document.querySelector('[data-rsp="header"]'); if (h && !h.querySelector('[data-mut]')) { const i = document.createElement('img'); i.setAttribute('data-mut', ''); i.src = '/images/responses/responses-wall-hawk.webp'; i.style.cssText = 'width:120px;height:120px'; h.appendChild(i); }`) },
  /* scroll on Passed */
  A2: { js: `document.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('[data-rsp="card-row"][data-k="passed"]')) { const s = [...document.querySelectorAll('.wpg-scroll')].find((x) => x.querySelector('[data-rsp="page"]')); if (s) s.scrollTop += 180; } }, true)` },
  /* use the column edge */
  B1: { css: `.rsp-poshd, .rsp-track { padding-inline: 24px !important; scroll-padding-inline: 24px !important; }` },
  /* let cards shrink to fit */
  B2: { css: `.rsp-pc, .ws-app.sheet-wide .rsp-pc { flex: 1 1 0 !important; min-width: 0 !important; }` },
  /* one card: render the arrows anyway */
  B2one: { js: obs(`const h = document.querySelector('.rsp-poshd'); if (h && !h.querySelector('[data-rsp="arrows"]')) { const a = document.createElement('div'); a.setAttribute('data-rsp', 'arrows'); a.className = 'rsp-arrows'; a.innerHTML = '<button>←</button><button>→</button>'; h.appendChild(a); }`) },
  /* show an empty quote */
  B3: { js: obs(`for (const c of document.querySelectorAll('[data-rsp="pcard"]')) if (!c.querySelector('[data-rsp="pcard-quote"]')) { const q = document.createElement('blockquote'); q.setAttribute('data-rsp', 'pcard-quote'); q.className = 'rsp-pcq'; q.textContent = '“”'; c.querySelector('.rsp-pcb')?.appendChild(q); }`) },
  /* render the arrows */
  B4: { js: obs(`const h = document.querySelector('.rsp-poshd'); if (h && !h.querySelector('[data-rsp="arrows"]')) { const a = document.createElement('div'); a.setAttribute('data-rsp', 'arrows'); a.className = 'rsp-arrows'; a.innerHTML = '<button>←</button><button>→</button>'; h.appendChild(a); }`) },
  /* count gates as n ÷ 4: one more gate for every four */
  C1: { js: obs(`const m = document.querySelector('[data-rsp="marks"]'); if (m && !m.querySelector('[data-mut]')) { const n = m.querySelectorAll(':scope > svg[data-rsp="gate"]').length; const want = Math.ceil(n * 5 / 4) - n || 1; for (let i = 0; i < want; i++) { const g = m.querySelector(':scope > svg[data-rsp="gate"]').cloneNode(true); g.setAttribute('data-mut', ''); m.insertBefore(g, m.querySelector('[data-rsp="ghost-gate"]')); } }`) },
  /* keep the dividers on Wait */
  C2: { js: obs(`const b = document.querySelector('[data-rsp="list-body"]'); const on = document.querySelector('[data-rsp="sort"][data-sort="wait"][aria-sort]:not([aria-sort="none"])'); if (b && on && !b.querySelector('[data-rsp="month-band"]')) { const d = document.createElement('div'); d.setAttribute('data-rsp', 'month-band'); d.className = 'rsp-mband'; d.textContent = 'October 2026'; b.prepend(d); }`) },
  /* pin nothing (the stack scrolls away with the sheet) */
  C3: { css: `.rsp-pinwrap { position: static !important; } .rsp-mband { position: static !important; }` },
  /* fix the columns */
  C4: { css: `.rsp-gr { grid-template-columns: 320px 320px 92px 112px 80px 220px !important; }` },
  /* colour the edge by court (the query panel's agent-court blue) */
  D1: { css: `.qsp.rsn .qcv-open { --qp-mid: #8b9bb3 !important; }` },
  /* no scrim when acting */
  D2: { css: `.spanel-scrim { display: none !important; }` },
  /* names on by default */
  E1: { js: obs(`const t = document.querySelector('[data-rsp="opt-names"]'); if (t && !t.dataset.mut) { t.dataset.mut = '1'; if (!t.checked) t.click(); }`) },
  /* render the example as real data */
  F1: { js: obs(`const e = document.querySelector('[data-rsp="example"]'); if (e && !e.querySelector('[data-mut]')) { const c = document.createElement('div'); c.setAttribute('data-mut', ''); c.setAttribute('data-rsp', 'card'); c.textContent = '1 Asked for more'; e.appendChild(c); }`) },
  /* show the tally at zero */
  F2: { js: obs(`const z = document.querySelector('[data-rsp="zero"]'); if (z && !document.querySelector('[data-rsp="tally"]')) { const t = document.createElement('section'); t.setAttribute('data-rsp', 'tally'); t.textContent = '0 rejections'; z.parentElement.insertBefore(t, z); }`) },
  /* let the track widen the page */
  L1: { css: `.rsp-track { overflow: visible !important; } .rsp-pos { overflow: visible !important; }` },
};

const seed = (clean = false) => execFileSync("node", ["tests/e2e/seedRs2.mjs", ...(clean ? ["--clean"] : [])], { stdio: "inherit" });
test.beforeAll(() => { seed(); });
test.afterAll(() => { seed(true); });

async function open(page: Page, ms: string, size: { width: number; height: number }, lock: string) {
  await page.addInitScript((id) => { try { localStorage.setItem("scriptally_active_manuscript_id", id); } catch { /* */ } }, ms);
  const m = MUT === lock ? MUTATIONS[lock] : null;
  if (m?.js) await page.addInitScript(`(() => { const run = () => { ${m.js} }; if (document.body) run(); else document.addEventListener("DOMContentLoaded", run); })()`);
  if (size.width <= 760) {
    /* the shared openRoute cannot open a phone width (its first panel match is the hidden sidebar): sign in at a
       desktop size, then resize and reload, as the Analytics suite does */
    await openRoute(page, "/queries/responses", { width: 1440, height: 900 });
    await page.setViewportSize(size);
    await page.reload();
  } else await openRoute(page, "/queries/responses", size);
  if (m?.css) await page.addStyleTag({ content: m.css });
  await page.locator('[data-rsp="page"]').waitFor();
  await page.waitForTimeout(1200);
}
const ev = <T,>(page: Page, js: string): Promise<T> => page.evaluate(js) as Promise<T>;
const SCROLLER = `[...document.querySelectorAll('.wpg-scroll')].find((x) => x.querySelector('[data-rsp="page"]'))`;
const R = (sel: string) => `(() => { const e = [...document.querySelectorAll('${sel}')].find((x) => x.getBoundingClientRect().height > 0); if (!e) return null; const b = e.getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom, w: b.width, h: b.height }; })()`;
type Box = { l: number; t: number; r: number; b: number; w: number; h: number } | null;

/* ═════════════ A ═════════════ */
test("A1 route", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("A1");
  for (const size of SIZES) {
    await open(page, "seed-ms-1", size, "A1");
    const w = `${size.width}`;
    L.check(w, page.url().includes("/queries/responses"), `url ${page.url()}`);
    const tab = await ev<string>(page, `document.querySelector('[data-shell="tab"] [data-page-name]')?.textContent ?? ''`);
    L.check(w, tab === "Responses", `folder tab current "${tab}"`);
    const side = await ev<string>(page, `[...document.querySelectorAll('.ws-ni[aria-current="page"]')].map((e) => e.textContent.trim()).join('|')`);
    L.check(w, side === "Responses", `sidebar current "${side}"`);
    const h = await ev<{ text: string; fam: string; size: number; h: number; lh: number }>(page, `(() => { const e = document.querySelector('[data-rsp="title"]'); const cs = getComputedStyle(e); return { text: e.getAttribute('aria-label'), fam: cs.fontFamily, size: parseFloat(cs.fontSize), h: e.getBoundingClientRect().height, lh: parseFloat(cs.lineHeight) }; })()`);
    L.check(w, /^\d+ answers? from (an )?agents?$/.test(h.text), `h1 "${h.text}"`);
    L.check(w, /^"?Special Elite/.test(h.fam), `h1 face ${h.fam}`);
    /* the app's own switch: a sheet 1440 or less is compact (44), wider is full (50) */
    const wide = await ev<boolean>(page, `!!document.querySelector('.ws-app.sheet-wide')`);
    L.check(w, near(h.size, wide ? 50 : 44, 1), `h1 ${h.size}px (sheet ${wide ? "wide" : "compact"})`);
    /* header rules v1.1: beside the card the title wraps at its size (decision 5) — whole lines, never shrunk */
    L.check(w, Math.abs(h.h / h.lh - Math.round(h.h / h.lh)) < 0.05, `h1 whole lines: ${h.h} tall at line-height ${h.lh}`);
    const imgs = await ev<string[]>(page, `[...document.querySelectorAll('[data-rsp="header"] img')].map((i) => i.getAttribute('data-rsp') ?? i.src)`);
    L.check(w, imgs.length === 1 && imgs[0] === "shadow", `header images ${JSON.stringify(imgs)}`);
  }
  L.done(14);
});

test("A2 card", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("A2");
  for (const size of SIZES) {
    await open(page, "seed-ms-1", size, "A2");
    const w = `${size.width}`;
    const c = await ev<{ n: Record<string, number>; seg: Record<string, number>; total: number; arc: number | null; rust: number; pct: string }>(page, `(() => {
      const n = {}, seg = {};
      for (const r of document.querySelectorAll('[data-rsp="card-row"]')) n[r.dataset.k] = Number(r.querySelector('[data-rsp="card-n"]').textContent);
      for (const s of document.querySelectorAll('[data-rsp="card-seg"]')) seg[s.dataset.k] = s.getBoundingClientRect().width;
      const t = Number(document.querySelector('[data-rsp="title-n"]').textContent);
      const a = document.querySelector('[data-rsp="ring-arc"]');
      const arc = a ? parseFloat(a.getAttribute('stroke-dasharray')) / (2 * Math.PI * 42) : null;
      const rust = [...document.querySelectorAll('[data-rsp="ring"] circle')].filter((x) => /#a2452a/i.test(x.getAttribute('stroke') ?? '')).length;
      return { n, seg, total: t, arc, rust, pct: document.querySelector('[data-rsp="ring-pct"]').textContent };
    })()`);
    const sum = c.n.more + c.n.passed + c.n.noReply;
    L.check(w, sum === c.total, `counts ${JSON.stringify(c.n)} sum ${sum} vs title ${c.total}`);
    const segTotal = Object.values(c.seg).reduce((a, b) => a + b, 0);
    for (const k of ["more", "passed", "noReply"] as const) {
      if (!c.n[k]) continue;
      L.check(w, near(c.seg[k], (segTotal * c.n[k]) / sum, 4.5), `bar ${k} ${c.seg[k].toFixed(1)} vs ${((segTotal * c.n[k]) / sum).toFixed(1)} (min-width 4 and 3px gaps allowed)`);
    }
    const rate = (c.n.more + c.n.passed) / sum;
    L.check(w, c.arc != null && Math.abs(c.arc - rate) <= 0.01, `arc ${c.arc} vs rate ${rate.toFixed(3)}`);
    L.check(w, c.rust === 0, `rust strokes ${c.rust}`);
    L.check(w, c.pct.startsWith(String(Math.round(rate * 100))), `ring reads ${c.pct}`);
    /* Passed filters the list, presses its segment, and does not scroll */
    const before = await ev<number>(page, `${SCROLLER}.scrollTop`);
    await page.locator('[data-rsp="card-row"][data-k="passed"]').click();
    await page.waitForTimeout(500);
    const after = await ev<{ top: number; pressed: string | null; kinds: string[] }>(page, `({ top: ${SCROLLER}.scrollTop, pressed: document.querySelector('[data-rsp="seg-btn"][data-k="passed"]').getAttribute('aria-pressed'), kinds: [...new Set([...document.querySelectorAll('[data-rsp="row"]')].map((r) => r.dataset.kind))] })`);
    L.check(w, after.top === before, `scrollTop ${before} → ${after.top} on Passed`);
    L.check(w, after.pressed === "true", `segment Passed aria-pressed ${after.pressed}`);
    L.check(w, after.kinds.length === 1 && after.kinds[0] === "passed", `rows after Passed: ${after.kinds}`);
    await page.locator('[data-rsp="card-row"][data-k="passed"]').click();
    /* Asked for more brings the carousel band into view */
    await page.locator('[data-rsp="card-row"][data-k="more"]').click();
    await page.waitForTimeout(1300);
    const band = await ev<{ t: number; vh: number; st: number }>(page, `(() => { const s = ${SCROLLER}; const b = document.querySelector('[data-rsp="carousel"]').getBoundingClientRect(); return { t: b.top - s.getBoundingClientRect().top, vh: s.clientHeight, st: s.scrollTop }; })()`);
    L.check(w, band.t >= -2 && band.t <= band.vh / 2 && band.st > 0, `carousel top ${band.t.toFixed(1)} in a ${band.vh} scroller after scrolling ${band.st}`);
  }
  L.done(20);
});

/* ═════════════ B ═════════════ */
test("B1 gutter", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("B1");
  for (const size of SIZES) {
    await open(page, "seed-ms-1", size, "B1");
    const w = `${size.width}`;
    await ev(page, `document.querySelector('[data-rsp="track"]').scrollLeft = 0`);
    const g = await ev<{ h1: number; lab: number; head: number; card: number }>(page, `(() => {
      const x = (s) => { const e = document.querySelector(s); const r = document.createRange(); r.selectNodeContents(e); return r.getBoundingClientRect().left; };
      /* header rules v1.1: the title moved to the shared text column (decision 1, every page alike); the carousel keeps
         the column's inset, which is the header row's left edge — so it lines up with that, not with the title */
      return { h1: document.querySelector('[data-rsp="header-row"]').getBoundingClientRect().left, lab: document.querySelector('.rsp-plab').getBoundingClientRect().left, head: document.querySelector('#rsp-pos-h').getBoundingClientRect().left, card: document.querySelector('[data-rsp="pcard"]').getBoundingClientRect().left };
    })()`);
    L.check(w, near(g.lab, g.h1, 2), `heading label ${g.lab.toFixed(1)} vs h1 ${g.h1.toFixed(1)}`);
    L.check(w, near(g.head, g.h1, 2), `heading ${g.head.toFixed(1)} vs h1 ${g.h1.toFixed(1)}`);
    L.check(w, near(g.card, g.h1, 2), `first card ${g.card.toFixed(1)} vs h1 ${g.h1.toFixed(1)}`);
  }
  L.done(6);
});

test("B2 carousel", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("B2");
  for (const size of SIZES) {
    await open(page, "seed-ms-1", size, "B2");
    const w = `${size.width}`;
    const wide = await ev<boolean>(page, `!!document.querySelector('.ws-app.sheet-wide')`);
    const want = wide ? 372 : 340;
    await page.locator('[data-rsp="carousel"]').scrollIntoViewIfNeeded();
    const c = await ev<{ widths: number[]; second: Box; track: Box; prev: boolean; dot: number }>(page, `(() => {
      const cards = [...document.querySelectorAll('[data-rsp="pcard"]')];
      const t = document.querySelector('[data-rsp="track"]').getBoundingClientRect();
      const s = cards[1]?.getBoundingClientRect();
      return { widths: cards.map((c) => c.getBoundingClientRect().width), second: s ? { l: s.left, r: s.right } : null, track: { l: t.left, r: t.right },
        prev: document.querySelector('[data-rsp="prev"]').disabled, dot: [...document.querySelectorAll('[data-rsp="dot"]')].findIndex((d) => d.hasAttribute('data-on')) };
    })()`);
    L.check(w, c.widths.length > 2 && c.widths.every((x) => near(x, want, 1)), `card widths ${[...new Set(c.widths.map((x) => x.toFixed(1)))]} vs ${want}`);
    /* ⚠️ "THE NEXT CARD PEEKS" IS NOT TRUE OF THE REFERENCE AT 1512 EITHER: three whole cards fit with the fourth just
       off the sheet. What holds at every width is that the cards keep their width and the rest are reached by
       scrolling — the track overflows, and at least one card lies past its right edge, cut or wholly beyond. */
    const beyond = await ev<{ over: boolean; past: number }>(page, `(() => { const t = document.querySelector('[data-rsp="track"]'); const r = t.getBoundingClientRect(); return { over: t.scrollWidth > t.clientWidth + 1, past: [...document.querySelectorAll('[data-rsp="pcard"]')].filter((c) => c.getBoundingClientRect().right > r.right + 0.5).length }; })()`);
    L.check(w, beyond.over && beyond.past > 0, `the track scrolls (${beyond.over}) and ${beyond.past} card(s) lie past its right edge`);
    L.check(w, c.prev === true && c.dot === 0, `at the start: prev disabled ${c.prev}, active dot ${c.dot}`);
    const s0 = await ev<number>(page, `document.querySelector('[data-rsp="track"]').scrollLeft`);
    await page.locator('[data-rsp="next"]').click();
    await page.waitForTimeout(900);
    const s1 = await ev<{ sl: number; dot: number }>(page, `({ sl: document.querySelector('[data-rsp="track"]').scrollLeft, dot: [...document.querySelectorAll('[data-rsp="dot"]')].findIndex((d) => d.hasAttribute('data-on')) })`);
    L.check(w, near(s1.sl - s0, want + 22, 3), `Next moved ${(s1.sl - s0).toFixed(1)} (one card ${want + 22})`);
    L.check(w, s1.dot === 1, `active dot after Next ${s1.dot}`);
    await page.locator('[data-rsp="track"]').focus();
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(900);
    const s2 = await ev<number>(page, `document.querySelector('[data-rsp="track"]').scrollLeft`);
    L.check(w, near(s2 - s1.sl, want + 22, 3), `Right Arrow moved ${(s2 - s1.sl).toFixed(1)}`);
    await ev(page, `(() => { const t = document.querySelector('[data-rsp="track"]'); t.scrollLeft = t.scrollWidth; })()`);
    await page.waitForTimeout(500);
    L.check(w, await ev<boolean>(page, `document.querySelector('[data-rsp="next"]').disabled`), "Next disabled at the end");
  }
  L.done(14);
});

test("B2 carousel, one card", async ({ page }) => {
  test.setTimeout(300_000);
  /* its own page: a page that has already opened another manuscript keeps that one in scope */
  const L = new Ledger("B2one");
  for (const size of SIZES) {
    await open(page, "rs2-ms-34", size, "B2one");
    const one = await ev<{ cards: number; arrows: number; dots: number }>(page, `({ cards: document.querySelectorAll('[data-rsp="pcard"]').length, arrows: document.querySelectorAll('[data-rsp="arrows"]').length, dots: document.querySelectorAll('[data-rsp="dots"]').length })`);
    L.check(`${size.width}`, one.cards === 1 && one.arrows === 0 && one.dots === 0, JSON.stringify(one));
    break;
  }
  L.done(1);
});

test("B3 cards", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("B3");
  for (const size of SIZES) {
    await open(page, "rs2-ms-two", size, "B3");
    const w = `${size.width}`;
    const cards = await ev<{ id: string; strip: string; what: string; foot: string; act: string; quote: boolean }[]>(page, `[...document.querySelectorAll('[data-rsp="pcard"]')].map((c) => ({ id: c.dataset.id, strip: c.querySelector('[data-rsp="pcard-strip"] span').textContent, what: c.querySelector('[data-rsp="pcard-what"]').textContent, foot: c.querySelector('[data-rsp="pcard-foot"] .rsp-mono')?.textContent ?? '', act: c.querySelector('[data-rsp="pcard-act"]').textContent, quote: !!c.querySelector('[data-rsp="pcard-quote"]') }))`);
    const by = Object.fromEntries(cards.map((c) => [c.id, c]));
    const want: Record<string, [string, RegExp, string, string, boolean]> = {
      "rs2-q-send": ["YOUR MOVE", /WANTS TO READThe full manuscriptAsked .*, after the partial/, "SEND BY", "Mark full sent", false],
      "rs2-q-sent": ["WITH THE AGENT", /IS READINGA partialAsked .*, after the query/, "REPLY EXPECTED BY", "Record a response", false],
      "rs2-q-offer": ["YOUR MOVE", /HAS MADEAn offerOffered /, "ANSWER BY", "Record your answer", false],
      "rs2-q-rr": ["YOUR MOVE", /WANTS TO READA revisionAsked /, "ASKED", "Record a response", true],
    };
    for (const [id, [strip, what, foot, act, quote]] of Object.entries(want)) {
      const c = by[id];
      L.check(`${w} ${id}`, !!c, "card present");
      if (!c) continue;
      L.check(`${w} ${id}`, c.strip === strip, `strip "${c.strip}"`);
      L.check(`${w} ${id}`, what.test(c.what), `what "${c.what}"`);
      L.check(`${w} ${id}`, c.foot === foot, `foot "${c.foot}"`);
      L.check(`${w} ${id}`, c.act === act, `button "${c.act}"`);
      L.check(`${w} ${id}`, c.quote === quote, `quote ${c.quote} (a quote only where a note is recorded)`);
    }
    const firstAgent = cards.findIndex((c) => c.strip === "WITH THE AGENT");
    L.check(w, firstAgent > 0 && cards.slice(firstAgent).every((c) => c.strip === "WITH THE AGENT"), `your move first: ${cards.map((c) => c.strip).join(", ")}`);
  }
  L.done(50);
});

test("B4 none", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("B4");
  for (const size of SIZES) {
    await open(page, "rs2-ms-none", size, "B4");
    const n = await ev<{ none: number; line: string; arrows: number; dots: number; cards: number }>(page, `({ none: document.querySelectorAll('[data-rsp="no-requests"]').length, line: document.querySelector('[data-rsp="no-requests-line"]')?.textContent ?? '', arrows: document.querySelectorAll('[data-rsp="arrows"]').length, dots: document.querySelectorAll('[data-rsp="dots"]').length, cards: document.querySelectorAll('[data-rsp="pcard"]').length })`);
    L.check(`${size.width}`, n.none === 1 && n.cards === 0, JSON.stringify(n));
    L.check(`${size.width}`, /You have 1 query out with agents\.$/.test(n.line), `line "${n.line}"`);
    L.check(`${size.width}`, n.arrows === 0 && n.dots === 0, `arrows ${n.arrows}, dots ${n.dots}`);
  }
  L.done(6);
});

/* ═════════════ C ═════════════ */
test("C1 tally", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("C1");
  const month = (daysAgo: number) => new Date(Date.now() - daysAgo * 86_400_000).toLocaleString("en-GB", { month: "long", year: "numeric" }).toUpperCase();
  for (const size of SIZES) {
    await open(page, "rs2-ms-two", size, "C1");
    const t = await ev<{ gates: number[]; ghosts: number; hint: boolean; since: string }>(page, `({ gates: [...document.querySelectorAll('[data-rsp="marks"] > svg[data-rsp="gate"]')].map((g) => g.querySelectorAll('[data-rsp="gate-ink"] path').length), ghosts: document.querySelectorAll('[data-rsp="ghost-gate"]').length, hint: !!document.querySelector('[data-rsp="tally-hint"]'), since: document.querySelector('[data-rsp="tally-since"]').textContent })`);
    L.check(`${size.width} 2`, JSON.stringify(t.gates) === "[2]", `gates ${JSON.stringify(t.gates)}`);
    L.check(`${size.width} 2`, t.ghosts > 0 && t.hint, `ghosts ${t.ghosts}, hint ${t.hint}`);
    L.check(`${size.width} 2`, t.since.endsWith(month(50)), `"${t.since}" (the earliest sent date of the nos is 50 days ago)`);
    await open(page, "rs2-ms-34", size, "C1");
    const u = await ev<{ gates: number[]; hint: boolean }>(page, `({ gates: [...document.querySelectorAll('[data-rsp="marks"] > svg[data-rsp="gate"]')].map((g) => g.querySelectorAll('[data-rsp="gate-ink"] path').length), hint: !!document.querySelector('[data-rsp="tally-hint"]') })`);
    L.check(`${size.width} 34`, u.gates.length === 7 && u.gates.slice(0, 6).every((x) => x === 5) && u.gates[6] === 4, `gates ${JSON.stringify(u.gates)}`);
    L.check(`${size.width} 34`, !u.hint, `hint ${u.hint}`);
  }
  L.done(10);
});

test("C2 list", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("C2");
  for (const size of SIZES) {
    await open(page, "rs2-ms-34", size, "C2");
    const w = `${size.width}`;
    const rows = () => ev<{ ans: number[]; wait: number[]; sur: string[]; kinds: string[]; bands: number }>(page, `({ ans: [...document.querySelectorAll('[data-rsp="row"]')].map((r) => Number(r.dataset.ans)), wait: [...document.querySelectorAll('[data-rsp="row"]')].map((r) => Number(r.dataset.wait)), sur: [...document.querySelectorAll('[data-rsp="row"]')].map((r) => r.dataset.surname), kinds: [...document.querySelectorAll('[data-rsp="row"]')].map((r) => r.dataset.kind), bands: document.querySelectorAll('[data-rsp="month-band"]').length })`);
    const r0 = await rows();
    const nos = await ev<number>(page, `[...document.querySelectorAll('[data-rsp="card-row"]')].filter((r) => r.dataset.k !== 'more').reduce((a, r) => a + Number(r.querySelector('[data-rsp="card-n"]').textContent), 0)`);
    L.check(w, r0.ans.length === nos && nos === 34, `rows ${r0.ans.length}, card nos ${nos}`);
    L.check(w, r0.ans.every((x, i) => i === 0 || r0.ans[i - 1] >= x), "newest answer first");
    L.check(w, r0.bands > 1, `month dividers ${r0.bands}`);
    await page.locator('[data-rsp="sort"][data-sort="wait"]').click();
    await page.waitForTimeout(400);
    const r1 = await rows();
    L.check(w, await ev<string>(page, `document.querySelector('[data-rsp="sort"][data-sort="wait"]').getAttribute('aria-sort')`) === "descending", "Wait carries aria-sort descending");
    L.check(w, r1.wait.every((x, i) => i === 0 || r1.wait[i - 1] >= x), "longest wait first");
    L.check(w, r1.bands === 0, `no dividers on Wait (${r1.bands})`);
    await page.locator('[data-rsp="sort"][data-sort="wait"]').click();
    await page.waitForTimeout(300);
    const r2 = await rows();
    L.check(w, r2.wait.every((x, i) => i === 0 || r2.wait[i - 1] <= x), "again reverses");
    await page.locator('[data-rsp="sort"][data-sort="agent"]').click();
    await page.waitForTimeout(300);
    const r3 = await rows();
    L.check(w, r3.sur.every((x, i) => i === 0 || r3.sur[i - 1].localeCompare(x) <= 0), "Agent sorts by surname, A to Z");
    /* the segmented control and the card's rows are one state */
    await page.locator('[data-rsp="card-row"][data-k="noReply"]').click();
    await page.waitForTimeout(300);
    L.check(w, await ev<string>(page, `document.querySelector('[data-rsp="seg-btn"][data-k="noReply"]').getAttribute('aria-pressed')`) === "true", "card No reply presses the segment");
    await page.locator('[data-rsp="seg-btn"][data-k="all"]').click();
    await page.waitForTimeout(300);
    L.check(w, await ev<string>(page, `document.querySelector('[data-rsp="card-row"][data-k="noReply"]').getAttribute('aria-pressed')`) === "false", "segment All releases the card's row");
    /* search: filters and highlights */
    const surname = r3.sur[0];
    await page.locator('[data-rsp="search"] input').fill(surname);
    await page.waitForTimeout(400);
    const f = await ev<{ n: number; marks: number; all: boolean }>(page, `({ n: document.querySelectorAll('[data-rsp="row"]').length, marks: document.querySelectorAll('[data-rsp="row"] mark').length, all: [...document.querySelectorAll('[data-rsp="row"]')].every((r) => r.textContent.toLowerCase().includes(${JSON.stringify(surname)})) })`);
    L.check(w, f.n > 0 && f.n < 34 && f.all && f.marks >= f.n, `search "${surname}": ${f.n} rows, ${f.marks} marks`);
    await page.locator('[data-rsp="search"] input').fill("");
  }
  L.done(22);
});

test("C3 pins", async ({ page }) => {
  test.setTimeout(400_000);
  const L = new Ledger("C3");
  for (const size of SIZES) {
    await open(page, "rs2-ms-140", size, "C3");
    const w = `${size.width}`;
    /* 1400px into the list */
    await ev(page, `(() => { const s = ${SCROLLER}; const l = document.querySelector('[data-rsp="list"]'); s.scrollTop += l.getBoundingClientRect().top - s.getBoundingClientRect().top + 1400; })()`);
    await page.waitForTimeout(600);
    const p = await ev<{ sc: number; wsh: Box; heads: Box; bands: { t: number; b: number }[]; pinned: string | null; summary: number }>(page, `(() => {
      const s = ${SCROLLER}.getBoundingClientRect();
      const b = (e) => { const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; };
      return { sc: s.top, wsh: b(document.querySelector('[data-rsp="list-top"]')), heads: b(document.querySelector('[data-rsp="heads"]')),
        bands: [...document.querySelectorAll('[data-rsp="month-band"]')].map((x) => { const r = x.getBoundingClientRect(); return { t: r.top, b: r.bottom }; }),
        pinned: document.querySelector('[data-rsp="list"]').getAttribute('data-pinned'), summary: document.querySelectorAll('[data-rsp="summary"]').length };
    })()`);
    L.check(w, near(p.wsh!.t - p.sc, 12, 1), `navy row ${(p.wsh!.t - p.sc).toFixed(1)} from the sheet top`);
    L.check(w, near(p.heads!.t, p.wsh!.b, 1), `headings ${p.heads!.t.toFixed(1)} directly under the row ${p.wsh!.b.toFixed(1)}`);
    const stuck = p.bands.filter((x) => x.t < p.heads!.b + 60 && x.b > p.sc);
    L.check(w, stuck.length >= 1 && stuck.every((x) => x.t >= p.heads!.b - 1), `month band under the stack: ${JSON.stringify(stuck)} vs ${p.heads!.b.toFixed(1)}`);
    L.check(w, p.pinned === "true" && p.summary === 1, `pinned ${p.pinned}, ↑ Summary ${p.summary}`);
    await page.locator('[data-rsp="summary"]').click();
    await page.waitForTimeout(1400);
    L.check(w, await ev<number>(page, `${SCROLLER}.scrollTop`) < 2, "↑ Summary returns to the top");
    /* past the list the stack has gone */
    await ev(page, `(() => { const s = ${SCROLLER}; s.scrollTop = s.scrollHeight; })()`);
    await page.waitForTimeout(600);
    const gone = await ev<{ b: number; sc: number; pinned: string | null }>(page, `({ b: document.querySelector('[data-rsp="pinwrap"]').getBoundingClientRect().bottom, sc: ${SCROLLER}.getBoundingClientRect().top, pinned: document.querySelector('[data-rsp="list"]').getAttribute('data-pinned') })`);
    L.check(w, gone.b <= gone.sc + 1 && gone.pinned === null, `past the list: stack bottom ${gone.b.toFixed(1)} vs sheet top ${gone.sc.toFixed(1)}, pinned ${gone.pinned}`);
    /* v137 D3: a 1px walk through the threshold and back flips exactly twice, and the scroll holds */
    const start = await ev<number>(page, `(() => { const s = ${SCROLLER}; const sn = document.querySelector('[data-rsp="pin-sentinel"]'); s.scrollTop += sn.getBoundingClientRect().top - s.getBoundingClientRect().top - 40; return s.scrollTop; })()`);
    await page.waitForTimeout(300);
    const flips = await ev<{ flips: number; drift: number }>(page, `(async () => {
      const s = ${SCROLLER}; const l = document.querySelector('[data-rsp="list"]');
      let was = l.getAttribute('data-pinned'), flips = 0, drift = 0;
      const tick = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      for (let i = 0; i < 80; i++) { const want = s.scrollTop + 1; s.scrollTop = want; await tick(); drift = Math.max(drift, Math.abs(s.scrollTop - want)); const now = l.getAttribute('data-pinned'); if (now !== was) { flips++; was = now; } }
      for (let i = 0; i < 80; i++) { const want = s.scrollTop - 1; s.scrollTop = want; await tick(); drift = Math.max(drift, Math.abs(s.scrollTop - want)); const now = l.getAttribute('data-pinned'); if (now !== was) { flips++; was = now; } }
      return { flips, drift };
    })()`);
    L.check(w, flips.flips === 2 && flips.drift <= 1, `1px walk from ${start}: ${flips.flips} flips, drift ${flips.drift}`);
  }
  L.done(14);
});

test("C4 narrow", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("C4");
  for (const size of [{ width: 1024, height: 768 }, { width: 390, height: 844 }]) {
    await open(page, "rs2-ms-34", size, "C4");
    const w = `${size.width}`;
    const o = await ev<{ doc: [number, number]; sc: [number, number]; overlaps: string[]; queried: string }>(page, `(() => {
      const s = ${SCROLLER}; const d = document.documentElement;
      const hs = [...document.querySelectorAll('[data-rsp="heads"] > *')].filter((e) => e.getBoundingClientRect().width > 0).map((e) => ({ t: e.textContent.trim(), b: e.getBoundingClientRect() }));
      const overlaps = [];
      for (let i = 1; i < hs.length; i++) if (hs[i].b.left < hs[i - 1].b.right - 0.5) overlaps.push(hs[i - 1].t + '/' + hs[i].t);
      const q = [...document.querySelectorAll('[data-rsp="heads"] > *')].find((e) => e.textContent.trim() === 'Queried');
      return { doc: [d.scrollWidth, d.clientWidth], sc: [s.scrollWidth, s.clientWidth], overlaps, queried: q ? getComputedStyle(q).display : 'absent' };
    })()`);
    L.check(w, o.doc[0] <= o.doc[1], `document ${o.doc}`);
    L.check(w, o.sc[0] <= o.sc[1], `scroller ${o.sc}`);
    L.check(w, o.overlaps.length === 0, `headings overlap: ${o.overlaps}`);
    L.check(w, o.queried === "none", `Queried ${o.queried}`);
  }
  L.done(8);
});

/* ═════════════ D ═════════════ */
test("D1 panel", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("D1");
  const EDGE: Record<string, string> = { more: "rgb(176, 96, 62)", passed: "rgb(124, 113, 104)", noReply: "rgb(181, 172, 164)" };
  for (const size of SIZES) {
    await open(page, "rs2-ms-two", size, "D1");
    const w = `${size.width}`;
    for (const [how, sel] of [["card", '[data-rsp="pcard"][data-id="rs2-q-send"] [data-rsp="pcard-open"]'], ["row", '[data-rsp="row"][data-id="rs2-q-note"]'], ["row", '[data-rsp="row"][data-id="rs2-q-form"]']] as const) {
      await page.locator(sel).scrollIntoViewIfNeeded();
      /* the open panel covers the right of the page: press the row or card at its left, where the reader would */
      await page.locator(sel).click({ position: { x: 30, y: 20 } });
      await page.waitForTimeout(700);
      const p = await ev<{ box: Box; bar: number; vw: number; vh: number; scrim: string; group: string; edge: string; fb: number }>(page, `(() => {
        const a = document.querySelector('[data-rsn="panel"]').getBoundingClientRect();
        const bar = [...document.querySelectorAll('.ws-pagebar')].find((b) => b.getBoundingClientRect().height > 0).getBoundingClientRect().bottom;
        const mid = getComputedStyle(document.querySelector('[data-rsn="card"]')).getPropertyValue('--qp-mid').trim();
        const probe = document.createElement('i'); probe.style.color = mid; document.body.appendChild(probe); const edge = getComputedStyle(probe).color; probe.remove();
        return { box: { l: a.left, t: a.top, r: a.right, b: a.bottom, w: a.width, h: a.height }, bar, vw: innerWidth, vh: innerHeight, scrim: getComputedStyle(document.querySelector('[data-side-scrim]')).opacity,
          group: document.querySelector('[data-rsn="panel"]').dataset.group, edge, fb: document.querySelectorAll('[data-rsn="feedback"]').length };
      })()`);
      const wsel = size.width > 1440 ? 560 : 520;
      const id = sel.match(/rs2-q-[a-z]+/)![0];
      L.check(`${w} ${how} ${id}`, near(p.box!.t, p.bar, 1), `top ${p.box!.t} vs bar ${p.bar}`);
      L.check(`${w} ${how} ${id}`, near(p.vw - p.box!.r, 8, 1) && near(p.vh - p.box!.b, 8, 1), `right ${(p.vw - p.box!.r).toFixed(1)} bottom ${(p.vh - p.box!.b).toFixed(1)}`);
      L.check(`${w} ${how} ${id}`, near(p.box!.w, wsel, 2), `width ${p.box!.w} vs ${wsel}`);
      L.check(`${w} ${how} ${id}`, p.scrim === "0", `scrim opacity ${p.scrim} while browsing`);
      L.check(`${w} ${how} ${id}`, page.url().includes(`answer=${id}`), `url ${page.url()}`);
      L.check(`${w} ${how} ${id}`, p.edge === EDGE[p.group], `edge ${p.edge} for ${p.group}`);
      L.check(`${w} ${how} ${id}`, p.fb === (id === "rs2-q-note" ? 1 : 0), `THEIR FEEDBACK cards ${p.fb}`);
    }
    await page.keyboard.press("Escape");
  }
  L.done(42);
});

test("D2 acting", async ({ page }) => {
  test.setTimeout(400_000);
  const L = new Ledger("D2");
  const size = SIZES[0];
  await open(page, "rs2-ms-two", size, "D2");
  const state = () => ev<{ scrim: number; qad: number; dialogs: number; top: number }>(page, `(() => { const el = document.querySelector('[data-side-scrim]'); const s = getComputedStyle(el ?? document.body); const r = el ? el.getBoundingClientRect() : { width: 0, height: 0 }; const covers = !!el && s.display !== 'none' && s.visibility !== 'hidden' && r.width >= innerWidth - 1 && r.height >= innerHeight - 1; const a = (s.backgroundColor.match(/[\\d.]+/g) ?? [])[3]; /* a scrim counts only where it is drawn and covers the page: computed opacity alone survives display:none */ return { scrim: covers ? Number(s.opacity) * Number(a ?? 0) : 0, qad: document.querySelectorAll('.qad-head').length, dialogs: [...document.querySelectorAll('[role="dialog"]')].filter((e) => e.getBoundingClientRect().height > 0).length /* every workspace page stays mounted: other pages' hidden guides carry the role too */, top: ${SCROLLER}.scrollTop }; })()`);
  for (const [door, sel] of [
    ["card button", '[data-rsp="pcard"][data-id="rs2-q-sent"] [data-rsp="pcard-act"]'],
    ["row primary", '[data-rsp="row"][data-id="rs2-q-form"]'],
    ["header", '[data-rsp="record"]'],
  ] as const) {
    await page.locator(sel).scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    if (door === "row primary") { await page.locator(sel).click(); await page.waitForTimeout(600); await page.locator('[data-rsn="primary"]').click(); }
    else await page.locator(sel).click();
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
  /* recording a rejection on a request: a row, Passed + 1, the tally + 1, the card gone — then Undo */
  const read = () => ev<{ passed: number; marks: number; card: number; row: number }>(page, `({ passed: Number(document.querySelector('[data-rsp="card-row"][data-k="passed"] [data-rsp="card-n"]').textContent), marks: [...document.querySelectorAll('[data-rsp="gate-ink"] path')].length, card: document.querySelectorAll('[data-rsp="pcard"][data-id="rs2-q-sent"]').length, row: document.querySelectorAll('[data-rsp="row"][data-id="rs2-q-sent"]').length })`);
  const before = await read();
  await page.locator('[data-rsp="pcard"][data-id="rs2-q-sent"] [data-rsp="pcard-act"]').scrollIntoViewIfNeeded();
  await page.locator('[data-rsp="pcard"][data-id="rs2-q-sent"] [data-rsp="pcard-act"]').click();
  await page.locator('[data-qad-chips="resp"] [data-qad-chip="pass"]').click();
  for (let i = 0; i < 8 && !(await page.locator("[data-qad-review]").count()); i++) await page.locator("[data-qad-primary]").click();
  const topBefore = await ev<number>(page, `${SCROLLER}.scrollTop`);
  await page.locator("[data-qad-primary]").click();
  await expect(page.locator('[data-qad-toast="on"]')).toBeVisible({ timeout: 60_000 });
  await page.waitForTimeout(800);
  const after = await read();
  L.check("record a no", after.passed === before.passed + 1, `Passed ${before.passed} → ${after.passed}`);
  L.check("record a no", after.marks === before.marks + 1, `tally strokes ${before.marks} → ${after.marks}`);
  L.check("record a no", after.card === 0 && after.row === 1, `card ${after.card}, row ${after.row}`);
  L.check("record a no", Math.abs((await ev<number>(page, `${SCROLLER}.scrollTop`)) - topBefore) <= 1, "the page did not scroll on save");
  const undo = page.locator("[data-qad-undo]");
  if (await undo.count()) { await undo.click(); await page.waitForTimeout(1500); }
  L.done(19);
});

/* ═════════════ E ═════════════ */
test("E1 share", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("E1");
  await page.addInitScript(() => {
    const w = window as unknown as { __rs2Text: string[] };
    w.__rs2Text = [];
    const orig = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (t: string, x: number, y: number, m?: number) { w.__rs2Text.push(String(t)); return m == null ? orig.call(this, t, x, y) : orig.call(this, t, x, y, m); };
  });
  await open(page, "seed-ms-1", SIZES[0], "E1");
  await page.locator('[data-rsp="share"]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(1500);
  const names = await ev<string[]>(page, `[...document.querySelectorAll('[data-rsp="row"] .rsp-agt b')].map((b) => b.textContent.trim())`);
  const s = await ev<{ img: [number, number]; names: boolean; drawn: string[] }>(page, `(() => { const i = document.querySelector('[data-rsp="preview-img"]'); return { img: i ? [i.naturalWidth, i.naturalHeight] : [0, 0], names: document.querySelector('[data-rsp="opt-names"]').checked, drawn: window.__rs2Text }; })()`);
  L.check("square", s.img[0] === 1080 && s.img[1] === 1080, `preview ${s.img}`);
  L.check("names", s.names === false, `Agent names starts ${s.names ? "on" : "off"}`);
  const named = names.filter((n) => s.drawn.includes(n));
  L.check("names", names.length > 0 && named.length === 0, `full names on the canvas: ${JSON.stringify(named)}`);
  await page.locator('[data-rsp="shape"][data-shape="story"]').click();
  await page.waitForTimeout(1500);
  const st = await ev<[number, number]>(page, `(() => { const i = document.querySelector('[data-rsp="preview-img"]'); return [i.naturalWidth, i.naturalHeight]; })()`);
  L.check("story", st[0] === 1080 && st[1] === 1920, `story ${st}`);
  const reqs: string[] = [];
  page.on("request", (r) => reqs.push(r.url()));
  const [dl] = await Promise.all([page.waitForEvent("download"), page.locator('[data-rsp="save"]').click()]);
  await page.waitForTimeout(500);
  L.check("save", dl.suggestedFilename() === "queryhawk-wall-of-no.png", `file ${dl.suggestedFilename()}`);
  const net = reqs.filter((u) => !u.startsWith("blob:") && !u.startsWith("data:"));
  L.check("save", net.length === 0, `requests during save: ${JSON.stringify(net)}`);
  await open(page, "seed-ms-2", SIZES[0], "E1");
  L.check("no nos", await ev<number>(page, `document.querySelectorAll('[data-rsp="share"]').length`) === 0, "the share sheet is hidden with no nos");
  L.done(7);
});

/* ═════════════ F ═════════════ */
test("F1 empty", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("F1");
  for (const size of SIZES) {
    await open(page, "rs2-ms-empty", size, "F1");
    const w = `${size.width}`;
    const e = await ev<Record<string, number>>(page, `(() => { const n = (s) => document.querySelectorAll(s).length; return { card: n('[data-rsp="card"]'), carousel: n('[data-rsp="carousel"]'), banner: n('[data-rsp="banner"]'), tally: n('[data-rsp="tally"]'), list: n('[data-rsp="list"]'), share: n('[data-rsp="share"]'), panel: n('[data-rsp="empty-panel"]'), art: n('[data-rsp="empty-art"]'), example: n('[data-rsp="example"]'), ways: n('[data-rsp="ways"]') }; })()`);
    L.check(w, e.card + e.carousel + e.banner + e.tally + e.list + e.share === 0, `populated parts on the empty page: ${JSON.stringify(e)}`);
    L.check(w, e.panel === 1 && e.example === 1 && e.ways === 1, `empty parts: ${JSON.stringify(e)}`);
    const art = await ev<string>(page, `getComputedStyle(document.querySelector('[data-rsp="empty-art"]')).display`);
    L.check(w, art !== "none", `the hawk is shown (${art})`);
    L.check(w, /3 queries out with agents/.test(await ev<string>(page, `document.querySelector('[data-rsp="way-out"]').textContent`)), "the out count is the fixture's three");
  }
  /* the first answer switches the page without a reload */
  await ev(page, `window.__rs2Marker = 1`);
  await page.evaluate(() => (window as unknown as { __saQueryDrawer: { open: (r: unknown) => void } }).__saQueryDrawer.open({ mode: "resp", queryId: "rs2-q-empty-1" }));
  await page.locator('[data-qad-chips="resp"] [data-qad-chip="pass"]').click();
  for (let i = 0; i < 8 && !(await page.locator("[data-qad-review]").count()); i++) await page.locator("[data-qad-primary]").click();
  await page.locator("[data-qad-primary]").click();
  await expect(page.locator('[data-rsp="header"]')).toBeVisible({ timeout: 60_000 });
  L.check("first answer", await ev<number>(page, `window.__rs2Marker ?? 0`) === 1, "no reload");
  L.check("first answer", await ev<number>(page, `document.querySelectorAll('[data-rsp="empty"]').length`) === 0, "the empty page has gone");
  const undo = page.locator("[data-qad-undo]");
  if (await undo.count()) { await undo.click(); await page.waitForTimeout(1500); }
  L.done(10);
});

test("F2 zero nos", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("F2");
  for (const size of SIZES) {
    await open(page, "seed-ms-2", size, "F2");
    const z = await ev<Record<string, number | string>>(page, `(() => { const n = (s) => document.querySelectorAll(s).length; const zz = document.querySelector('[data-rsp="zero"]'); return { zero: n('[data-rsp="zero"]'), h: zz?.querySelector('h3')?.textContent ?? '', tags: zz ? zz.querySelectorAll('.rsp-tag, [data-rsp="tag"]').length : -1, tally: n('[data-rsp="tally"]'), list: n('[data-rsp="list"]'), share: n('[data-rsp="share"]'), toShare: n('[data-rsp="to-share"]') }; })()`);
    L.check(`${size.width}`, z.zero === 1 && z.h === "Rejections are part of querying", JSON.stringify(z));
    L.check(`${size.width}`, z.tags === 0, `tags in the sheet ${z.tags}`);
    L.check(`${size.width}`, z.tally === 0 && z.list === 0 && z.share === 0 && z.toShare === 0, JSON.stringify(z));
  }
  L.done(6);
});

/* ═════════════ L ═════════════ */
test("L1 no overflow", async ({ page }) => {
  test.setTimeout(400_000);
  const L = new Ledger("L1");
  for (const width of [1920, 1512, 1280, 1180, 1024]) {
    await open(page, "seed-ms-1", { width, height: 900 }, "L1");
    const o = await ev<{ doc: [number, number]; sc: [number, number]; app: [number, number] }>(page, `(() => { const s = ${SCROLLER}; const d = document.documentElement; const a = document.querySelector('.ws-app'); return { doc: [d.scrollWidth, d.clientWidth], sc: [s.scrollWidth, s.clientWidth], app: [a.scrollWidth, a.clientWidth] }; })()`);
    L.check(`${width}`, o.doc[0] === o.doc[1], `document ${o.doc}`);
    L.check(`${width}`, o.sc[0] === o.sc[1], `sheet scroller ${o.sc}`);
    L.check(`${width}`, o.app[0] === o.app[1], `app frame ${o.app}`);
  }
  L.done(15);
});
