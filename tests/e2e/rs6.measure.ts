/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Responses v6 — THE LOCKS (design-refs/responses-v6/responses-v6.html), at 1512 × 900 and 1280 × 800.
 *
 * FIXTURE: `seedRs6.mjs` writes the reference's own 34 queries on rs6- manuscripts (full, early, cold, empty), dated
 * relative to today, through fsTarget (the emulator), and the run removes them in `afterAll`.
 *
 * Each lock is proved red by its named mutation: `RS6_MUTATE=<lock> npm run e2e:emu -- tests/e2e/rs6.measure.ts`.
 *   H1 the header's tally has one mark per query queried, and the rate is replies over queried
 *   S1 exactly two stat cards; their rows sum to their numbers; no row at zero
 *   S2 no requests: the early copy below ten replies, the advice from ten, and no request row
 *   C1 every carousel item is the standard query card (by its marker); your move first
 *   C2 the edge arrows hide at the ends; the dots and "n of N" follow the scroll
 *   W1 every month is its own sheet with the Closed grey band and its own headings; rows sum to the tab's count
 *   E1 the timeline's discs sit on one date scale with Today; gone quiet is the Query Centre's own set; no two overlap
 *   E2 hovering a disc shows its pop-up and span; a click opens the answer panel for that query
 *   P1 no package word or class anywhere on the page
 */
import { expect, test, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";

const DIR = "reports/responses-v6";
const MUT = process.env.RS6_MUTATE ?? "";
const SIZES = [{ width: 1512, height: 900 }, { width: 1280, height: 800 }] as const;
const DAY = 86_400_000;

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

/* one named break per lock; each applies only when RS6_MUTATE names it */
const obs = (body: string) => `(() => { const put = () => { ${body} }; new MutationObserver(put).observe(document.body, { subtree: true, childList: true, characterData: true }); put(); })()`;
const MUTATIONS: Record<string, { css?: string; js?: string }> = {
  /* one mark too many on the tally line */
  H1: { js: obs(`const t = document.querySelector('[data-rsp6="tally"]'); if (t && t.children.length && !t.querySelector('[data-mut]')) { const i = document.createElement('i'); i.setAttribute('data-mut', ''); i.setAttribute('data-mark', 'faint'); t.appendChild(i); }`) },
  /* a stat row goes missing (CSS, never a removal of a React node) */
  S1: { css: `[data-rsp6="stat"][data-k="passed"] [data-rsp6="stat-row"]:first-child { display: none !important; }` },
  /* the request row comes back on a page with no requests */
  S2: { js: obs(`const p = document.querySelector('[data-rsp6="stats"]'); if (p && !document.querySelector('[data-rsp6="requests"]')) { const s = document.createElement('section'); s.setAttribute('data-rsp6', 'requests'); p.after(s); }`) },
  /* the row drawn backwards */
  C1: { css: `.rsp6 .rsp6-car { flex-direction: row-reverse !important; }` },
  /* the edge arrows never hide */
  C2: { css: `.rsp6 .rsp6-cxe:disabled { opacity: 1 !important; pointer-events: auto !important; }` },
  /* the month band loses the Closed grey */
  W1: { css: `.rsp6 [data-rsp6="group-head"] { background: #e3dbcf !important; }` },
  /* a disc pushed off its date */
  E1: { css: `.rsp6 [data-rsp6="disc"]:nth-of-type(2) { margin-left: 60px !important; }` },
  /* the pop-up never shows */
  E2: { css: `.rsp6 [data-rsp6="pop"] { display: none !important; }` },
  /* a package chip on the page */
  P1: { js: obs(`const h = document.querySelector('[data-rsp6="header"]'); if (h && !h.querySelector('[data-mut]')) { const s = document.createElement('span'); s.setAttribute('data-mut', ''); s.textContent = 'Light package'; h.appendChild(s); }`) },
};

const seed = (...args: string[]) => execFileSync("node", ["tests/e2e/seedRs6.mjs", ...args], { stdio: "inherit" });
test.beforeAll(() => { seed(); });
test.afterAll(() => { seed("--clean"); });

async function open(page: Page, ms: string, size: { width: number; height: number }, lock: string, route = "/queries/responses") {
  await page.addInitScript((id) => { try { localStorage.setItem("scriptally_active_manuscript_id", id); } catch { /* */ } }, ms);
  const m = MUT === lock ? MUTATIONS[lock] : null;
  if (m?.js) await page.addInitScript(`(() => { const run = () => { ${m.js} }; if (document.body) run(); else document.addEventListener("DOMContentLoaded", run); })()`);
  await openRoute(page, route, size);
  if (m?.css) await page.addStyleTag({ content: m.css });
  if (route === "/queries/responses") await page.locator('[data-rsp="page"]').waitFor();
  await page.waitForTimeout(1400);
}
const ev = <T,>(page: Page, js: string): Promise<T> => page.evaluate(js) as Promise<T>;
const SC = `[...document.querySelectorAll('.wpg-scroll')].find((x) => x.querySelector('[data-rsp="page"]'))`;
const into = (page: Page, sel: string) => ev(page, `(() => { const s = ${SC}; const e = s && s.querySelector('${sel}'); if (s && e) s.scrollTop += e.getBoundingClientRect().top - s.getBoundingClientRect().top - 80; })()`);

/* ═════ H1 ═════ */
test("H1 the tally line and the response rate", async ({ page }) => {
  const L = new Ledger("H1");
  for (const size of SIZES) {
    await open(page, "rs6-ms-full", size, "H1");
    const r = await ev<{ marks: number; sent: number; rate: number | null; replied: number | null; more: number; passed: number; kinds: string[] }>(page, `(() => {
      const t = document.querySelector('[data-rsp6="tally"]'); const sub = document.querySelector('[data-rsp6="sub"] b');
      const line = document.querySelector('[data-rsp6="tally-line"]').textContent;
      const rate = document.querySelector('[data-rsp6="rate"]');
      const n = (k) => +(document.querySelector('[data-rsp6="stat"][data-k="' + k + '"]')?.getAttribute('data-n') ?? 'NaN');
      const m = /· (\\d+) of (\\d+) replied/.exec(line);
      return { marks: t.children.length, sent: +sub.textContent, rate: rate ? parseInt(rate.textContent) : null, replied: m ? +m[1] : null,
        more: n('more'), passed: n('passed'), kinds: [...t.children].map((i) => i.getAttribute('data-mark')) };
    })()`);
    const w = `${size.width}`;
    L.check(w, r.marks === r.sent, `marks ${r.marks}, queried ${r.sent}`);
    L.check(w, r.sent === 34, `queried ${r.sent} (the fixture's 34)`);
    L.check(w, r.replied === r.more + r.passed, `replied ${r.replied}, cards ${r.more}+${r.passed}`);
    L.check(w, r.rate === Math.round(((r.more + r.passed) / r.sent) * 100), `rate ${r.rate}% against (${r.more}+${r.passed})/${r.sent}`);
    L.check(w, r.kinds.filter((k) => k === "more").length === r.more && r.kinds.filter((k) => k === "passed").length === r.passed, `marks by kind ${r.kinds.join(",")}`);
    const order = r.kinds.join("");
    L.check(w, /^(more)*(passed)*(faint)*$/.test(order), "marks in order: asked for more, passed, the rest");
  }
  L.done(12);
});

/* ═════ S1 ═════ */
test("S1 two stat cards, rows summing to their numbers", async ({ page }) => {
  const L = new Ledger("S1");
  for (const size of SIZES) {
    await open(page, "rs6-ms-full", size, "S1");
    const r = await ev<{ k: string; n: number; rows: number[]; zero: number }[]>(page, `[...document.querySelectorAll('[data-rsp6="stat"]')].map((c) => {
      const rows = [...c.querySelectorAll('[data-rsp6="stat-row"]')].filter((x) => x.getClientRects().length).map((x) => +x.getAttribute('data-n'));
      return { k: c.getAttribute('data-k'), n: +c.getAttribute('data-n'), rows, zero: rows.filter((x) => x === 0).length };
    })`);
    const w = `${size.width}`;
    L.check(w, r.length === 2 && r[0].k === "more" && r[1].k === "passed", `cards ${r.map((x) => x.k).join(",")}`);
    for (const c of r) {
      L.check(`${w} ${c.k}`, c.rows.reduce((a, b) => a + b, 0) === c.n, `rows ${c.rows.join("+")} against ${c.n}`);
      L.check(`${w} ${c.k}`, c.zero === 0, `${c.zero} rows at zero`);
    }
    L.check(w, (await page.locator('[data-rsp6="stats"] :text("No reply"), [data-rsp6="stats"] :text("Still waiting")').count()) === 0, "no No reply or Still waiting card");
  }
  L.done(14);
});

/* ═════ S2 ═════ */
test("S2 no requests: early days, then the advice", async ({ page }) => {
  const L = new Ledger("S2");
  for (const size of SIZES) {
    for (const [ms, want] of [["rs6-ms-early", "early"], ["rs6-ms-cold", "advice"]] as const) {
      await open(page, ms, size, "S2");
      const r = await ev<{ none: string | null; copy: string; req: number; link: number; n: number }>(page, `(() => {
        const c = document.querySelector('[data-rsp6="stat"][data-k="more"]');
        return { none: c?.getAttribute('data-none') ?? null, copy: c?.querySelector('[data-rsp6="none-copy"]')?.textContent ?? '',
          req: document.querySelectorAll('[data-rsp6="requests"]').length, link: c?.querySelectorAll('[data-rsp6="to-passes"]').length ?? 0,
          n: +(document.querySelector('[data-rsp6="tally-line"]').textContent.match(/· (\\d+) of/)?.[1] ?? 'NaN') };
      })()`);
      const w = `${size.width} ${ms}`;
      L.check(w, r.none === want, `state ${r.none}`);
      L.check(w, want === "early" ? r.n < 10 : r.n >= 10, `${r.n} replies`);
      L.check(w, want === "early" ? /^It’s early days/.test(r.copy) : r.copy.startsWith(`No requests from ${r.n} replies`), `copy "${r.copy.slice(0, 60)}"`);
      L.check(w, r.link === (want === "advice" ? 1 : 0), `${r.link} "See what the passes said" links`);
      L.check(w, r.req === 0, `${r.req} request sections`);
    }
  }
  L.done(20);
});

/* ═════ C1 / C2 ═════ */
test("C1 the standard card, your move first", async ({ page }) => {
  const L = new Ledger("C1");
  for (const size of SIZES) {
    await open(page, "rs6-ms-full", size, "C1");
    const r = await ev<{ std: boolean; band: boolean; ym: boolean; x: number }[]>(page, `[...document.querySelectorAll('[data-rsp6="req"]')].map((c) => ({
      std: c.hasAttribute('data-standard-card'), band: !!c.querySelector(':scope > .mk-lc-in > .mk-lc-band') && !!c.querySelector('.mk-lc-tlv'), ym: c.hasAttribute('data-ym'), x: c.offsetLeft }))`);
    const w = `${size.width}`;
    L.check(w, r.length === 7, `${r.length} cards (the fixture's 7 requests)`);
    L.check(w, r.every((c) => c.std && c.band), "every item is StandardQueryCard over heroCard.css's classes");
    const byX = r.slice().sort((a, b) => a.x - b.x);
    const firstAgent = byX.findIndex((c) => !c.ym);
    L.check(w, firstAgent > 0 && byX.slice(firstAgent).every((c) => !c.ym), `your move first, left to right: ${byX.map((c) => (c.ym ? "Y" : "a")).join("")}`);
  }
  L.done(6);
});

test("C2 the edge arrows, the dots and n of N", async ({ page }) => {
  const L = new Ledger("C2");
  for (const size of SIZES) {
    await open(page, "rs6-ms-full", size, "C2");
    await into(page, '[data-rsp6="requests"]');
    const read = () => ev<{ l: string; r: string; count: string; cur: number }>(page, `(() => {
      const op = (s) => getComputedStyle(document.querySelector(s)).opacity;
      const dots = [...document.querySelectorAll('[data-rsp6="dot"]')];
      return { l: op('[data-rsp6="edge-prev"]'), r: op('[data-rsp6="edge-next"]'), count: document.querySelector('[data-rsp6="count"]').textContent, cur: dots.findIndex((d) => d.getAttribute('aria-current') === 'true') };
    })()`);
    const a = await read();
    const w = `${size.width}`;
    L.check(`${w} start`, a.l === "0" && a.r === "1", `edges ${a.l}/${a.r}`);
    L.check(`${w} start`, a.count === "1 of 7" && a.cur === 0, `${a.count}, dot ${a.cur}`);
    await ev(page, `(() => { const t = document.querySelector('[data-rsp6="track"]'); t.style.scrollBehavior = 'auto'; t.scrollLeft = t.scrollWidth; })()`);
    await page.waitForTimeout(500);
    const b = await read();
    const n = +b.count.split(" of ")[0];
    L.check(`${w} end`, b.l === "1" && b.r === "0", `edges ${b.l}/${b.r}`);
    L.check(`${w} end`, n > 1 && b.cur === n - 1, `${b.count}, dot ${b.cur}`);
  }
  L.done(8);
});

/* ═════ W1 ═════ */
test("W1 grouped sheets with the Closed grey band", async ({ page }) => {
  const L = new Ledger("W1");
  for (const size of SIZES) {
    await open(page, "rs6-ms-full", size, "W1");
    await into(page, '[data-rsp6="tabs"]');
    for (const k of ["all", "passed", "noReply"]) {
      await page.locator(`[data-rsp6="tab"][data-k="${k}"]`).click();
      await page.waitForTimeout(200);
      const r = await ev<{ tab: number; showing: number; sheets: { bg: string; cells: number; rows: number; n: number; sticky: string }[] }>(page, `(() => ({
        tab: +document.querySelector('[data-rsp6="tab"][data-k="${k}"]').getAttribute('data-n'),
        showing: +document.querySelector('[data-rsp6="showing"] b').textContent,
        sheets: [...document.querySelectorAll('[data-rsp6="month"]')].map((s) => { const h = s.querySelector(':scope > [data-rsp6="group-head"]'); return {
          bg: h ? getComputedStyle(h).backgroundColor : '', cells: h ? h.children.length : 0, rows: s.querySelectorAll(':scope > [data-rsp6="row"]').length,
          n: +s.getAttribute('data-n'), sticky: h ? getComputedStyle(h).position : '' }; }),
      }))()`);
      const w = `${size.width} ${k}`;
      L.check(w, r.sheets.length > 0, `${r.sheets.length} sheets`);
      L.check(w, r.sheets.every((s) => s.bg === "rgb(241, 239, 236)"), `bands ${[...new Set(r.sheets.map((s) => s.bg))].join(" ")}`);
      L.check(w, r.sheets.every((s) => s.cells === 6 && s.sticky === "sticky"), "each band holds its own six headings, sticky");
      L.check(w, r.sheets.every((s) => s.rows === s.n), "each sheet's rows equal its count");
      L.check(w, r.sheets.reduce((a, s) => a + s.rows, 0) === r.tab && r.showing === r.tab, `rows ${r.sheets.reduce((a, s) => a + s.rows, 0)}, tab ${r.tab}, showing ${r.showing}`);
    }
  }
  L.done(30);
});

/* ═════ E1 / E2 ═════ */
test("E1 the timeline: one date scale, the Query Centre's gone quiet, no overlaps", async ({ page }) => {
  const L = new Ledger("E1");
  for (const size of SIZES) {
    /* the Query Centre's own gone-quiet set for the same rows (its rows carry `data-where`) */
    await open(page, "rs6-ms-empty", size, "E1", "/queries");
    await page.locator('[data-qc151="row"]').first().waitFor({ timeout: 20000 });
    const qcQuiet = (await ev<string[]>(page, `[...document.querySelectorAll('[data-qc151="row"][data-where="quiet"]')].map((r) => r.getAttribute('data-id')).filter((id) => id.startsWith('rs6-q-empty-'))`)).sort();
    await open(page, "rs6-ms-empty", size, "E1");
    await into(page, '[data-rsp6="timeline"]');
    const r = await ev<{ discs: { id: string; ms: number; x: number; y: number; w: number; h: number; quiet: boolean }[]; today: number; now: number }>(page, `(() => {
      const d = [...document.querySelectorAll('[data-rsp6="disc"]')].map((b) => { const q = b.getBoundingClientRect(); return { id: b.getAttribute('data-id'), ms: +b.getAttribute('data-ms'), x: q.left + q.width / 2, y: q.top, w: q.width, h: q.height, quiet: b.hasAttribute('data-quiet') }; });
      const t = document.querySelector('[data-rsp6="today"]').getBoundingClientRect();
      return { discs: d, today: t.left + 1, now: Date.now() };
    })()`);
    const w = `${size.width}`;
    L.check(w, r.discs.length >= 5, `${r.discs.length} discs`);
    const s = r.discs.slice().sort((a, b) => a.ms - b.ms);
    const a0 = s[0], a1 = s[s.length - 1];
    const pxPerMs = (a1.x - a0.x) / (a1.ms - a0.ms);
    const day = pxPerMs * DAY;
    for (const d of s) L.check(`${w} ${d.id}`, Math.abs(a0.x + (d.ms - a0.ms) * pxPerMs - d.x) <= Math.max(1, day), `off its date by ${(a0.x + (d.ms - a0.ms) * pxPerMs - d.x).toFixed(1)}px (a day is ${day.toFixed(1)}px)`);
    L.check(`${w} today`, Math.abs(a0.x + (r.now - a0.ms) * pxPerMs - r.today) <= Math.max(2, day), `Today off by ${(a0.x + (r.now - a0.ms) * pxPerMs - r.today).toFixed(1)}px`);
    const quiet = r.discs.filter((d) => d.quiet).map((d) => d.id).sort();
    const datedQc = qcQuiet.filter((id) => r.discs.some((d) => d.id === id));
    L.check(w, JSON.stringify(quiet) === JSON.stringify(datedQc), `discs quiet [${quiet}] against the Query Centre's [${datedQc}]`);
    let over = 0;
    for (let i = 0; i < r.discs.length; i++) for (let j = i + 1; j < r.discs.length; j++) {
      const p = r.discs[i], q = r.discs[j];
      if (Math.abs(p.x - q.x) < p.w - 1 && Math.abs(p.y - q.y) < p.h - 1) over++;
    }
    L.check(w, over === 0, `${over} overlapping pairs`);
  }
  L.done(14);
});

test("E2 hover shows the pop-up and the span; a click opens the panel", async ({ page }) => {
  const L = new Ledger("E2");
  for (const size of SIZES) {
    await open(page, "rs6-ms-empty", size, "E2");
    await into(page, '[data-rsp6="timeline"]');
    const disc = page.locator('[data-rsp6="disc"]').first();
    const id = await disc.getAttribute("data-id");
    const name = (await disc.getAttribute("aria-label"))?.split(",")[0] ?? "";
    await disc.hover();
    await page.waitForTimeout(250);
    const r = await ev<{ pop: string; vis: boolean; span: boolean }>(page, `(() => { const p = document.querySelector('[data-rsp6="pop"]'); const s = document.querySelector('[data-rsp6="span"]');
      return { pop: p?.textContent ?? '', vis: !!p && p.getClientRects().length > 0 && getComputedStyle(p).opacity !== '0', span: !!s && getComputedStyle(s).opacity !== '0' }; })()`);
    const w = `${size.width}`;
    L.check(w, r.vis && r.pop.startsWith(name), `pop-up "${r.pop.slice(0, 40)}" for ${name}`);
    L.check(w, /Click to open the query/.test(r.pop) && /(Reply due|Reply time ran out)/.test(r.pop), "the pop-up's lines");
    L.check(w, r.span, "the span from the queried date");
    await disc.click();
    await page.waitForTimeout(600);
    const open2 = await ev<string | null>(page, `document.querySelector('[data-rsn="panel"]')?.getAttribute('data-rsn-id') ?? null`);
    L.check(w, open2 === id, `panel ${open2} for ${id}`);
    await page.keyboard.press("Escape");
  }
  L.done(8);
});

/* ═════ P1 ═════ */
test("P1 no packages anywhere on the page", async ({ page }) => {
  const L = new Ledger("P1");
  for (const size of SIZES) {
    for (const ms of ["rs6-ms-full", "rs6-ms-cold", "rs6-ms-empty"]) {
      await open(page, ms, size, "P1");
      const r = await ev<{ text: boolean; cls: string[] }>(page, `(() => { const p = document.querySelector('[data-rsp="page"]');
        return { text: /package/i.test(p.innerText), cls: [...p.querySelectorAll('*')].map((e) => e.getAttribute('class') ?? '').filter((c) => /pkg|package/i.test(c)).slice(0, 3) }; })()`);
      const w = `${size.width} ${ms}`;
      L.check(w, !r.text, "no package word");
      L.check(w, r.cls.length === 0, `classes ${r.cls.join(" ")}`);
    }
  }
  L.done(12);
});

/* ═════ R1 (re-pointed from rs5 G1 and H1, each still true of v6) ═════ */
MUTATIONS.R1 = { css: `.rsp6 [data-rsp6="row"] { pointer-events: none !important; }` };
test("R1 a row and a card open the panel; the first answer switches the page without a reload", async ({ page }) => {
  const L = new Ledger("R1");
  const size = SIZES[0];
  await open(page, "rs6-ms-full", size, "R1");
  await into(page, '[data-rsp6="sheets"]');
  const row = page.locator('[data-rsp6="row"]').first();
  const rid = await row.getAttribute("data-id");
  await row.click({ timeout: 4000 }).catch(() => undefined);
  await page.waitForTimeout(600);
  L.check("row", (await ev<string | null>(page, `document.querySelector('[data-rsn="panel"]')?.getAttribute('data-rsn-id') ?? null`)) === rid, `a wall row opens ${rid}`);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  await into(page, '[data-rsp6="requests"]');
  const card = page.locator('[data-rsp6="req"]').first();
  const cid = await card.getAttribute("data-id");
  await card.locator(".sqc-open").click();
  await page.waitForTimeout(600);
  L.check("card", (await ev<string | null>(page, `document.querySelector('[data-rsn="panel"]')?.getAttribute('data-rsn-id') ?? null`)) === cid, `a request card opens ${cid}`);
  await page.keyboard.press("Escape");
  await open(page, "rs6-ms-empty", size, "R1");
  L.check("empty", (await page.locator('[data-rsp6="wait"]').count()) === 1, "the empty page first");
  await ev(page, `window.__rs6Marker = 1`);
  seed("--answer-one");
  await page.locator('[data-rsp6="stats"]').waitFor({ timeout: 15000 }).catch(() => undefined);
  L.check("switch", (await page.locator('[data-rsp6="stats"]').count()) === 1 && (await page.locator('[data-rsp6="wait"]').count()) === 0, "populated after the first answer");
  L.check("switch", (await ev<number | undefined>(page, `window.__rs6Marker`)) === 1, "with no reload");
  seed();
  L.done(5);
});

/* ═════ screenshots for the report (RS6_SHOTS=1): the build in each state, at both sizes ═════ */
test("SHOTS", async ({ page }) => {
  test.skip(!process.env.RS6_SHOTS, "RS6_SHOTS=1 to write the report's screenshots");
  mkdirSync(`${DIR}/shots`, { recursive: true });
  for (const size of SIZES) {
    for (const [ms, tag] of [["rs6-ms-full", "full"], ["rs6-ms-cold", "no-requests"], ["rs6-ms-early", "early"], ["rs6-ms-empty", "empty"]] as const) {
      await open(page, ms, size, "SHOTS");
      const h = await ev<number>(page, `(${SC}).scrollHeight`);
      for (let y = 0, k = 0; y < h && k < 8; y += size.height - 140, k++) {
        await ev(page, `(${SC}).scrollTop = ${y}`);
        await page.waitForTimeout(250);
        await page.screenshot({ path: `${DIR}/shots/${tag}-${size.width}-${k}.png` });
      }
      if (tag === "empty") {
        const d = page.locator('[data-rsp6="disc"]').first();
        await d.scrollIntoViewIfNeeded(); await d.hover(); await page.waitForTimeout(250);
        await page.screenshot({ path: `${DIR}/shots/empty-hover-${size.width}.png` });
      }
    }
  }
});
