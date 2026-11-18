/**
 * Comparable titles v32 — the CP32 locks (design-refs/comps-v32/), on `seedComps32.mjs`, at 1280×800 and 1512×900 with
 * the sidebar as dev defaults. Each lock is a function returning its readings; `check()` records them.
 *
 * ⚠️ RED FIRST, IN THE SAME RUN: with `CP32_PROVE=1` every lock runs a second time with its named mutation
 *    (cp32Mutate.mjs) applied to the rendered page, and that run must go red at least once. A lock nothing can redden
 *    is unproved, and the run fails saying so. Proofs land in reports/comps-v32/readings.json.
 * ⚠️ THE FIXTURE'S FACTS ARE STATED HERE FROM THE SEEDER, never read back from the page they test.
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { LIB, MS_EMPTY, SIZES, dump, openCp, scrollTo, seed, type Vp } from "./cp32Lib";
import { openRoute } from "./measure";
import { MUTATIONS } from "./cp32Mutate.mjs";

test.describe.configure({ mode: "serial" });
test.setTimeout(1_800_000);
const PROVE = process.env.CP32_PROVE === "1";
mkdirSync("reports/comps-v32", { recursive: true });

/* ── the fixture (seedComps32.mjs) ── */
const K = { tide: "cmp_cp32tide", salt: "cmp_cp32salt", nine: "cmp_cp32nine", brit: "cmp_cp32brit", kest: "cmp_cp32kest", ferr: "cmp_cp32ferr", last: "cmp_cp32last" };
const FIX = {
  current: { titles: ["The Tidewater Line", "Nine Miles Out"], line: "Covering letter 4, sent to 5 agents" },
  band: { letter: "cp32-let-1", name: "Query letter v1", line: "You sent 5 queries with this letter. Which comps did it mention?" },
  /* default: Salt 6/9 = 67 · Tidewater 9/19 = 47 · Nine 2/5 = 40; columns read 2nd · 1st · 3rd */
  podium: { keys: [K.tide, K.salt, K.nine], places: ["2", "1", "3"], pcts: ["47%", "67%", "40%"] },
  /* tie: Salt 6/9 = 67, Nine 4/6 = 67 (more queries first: Salt), Tidewater 11/20 = 55 */
  tie: { keys: [K.nine, K.salt, K.tide], places: ["1", "1", "3"], equal: [true, true, false] },
  /* two (Covering letter 4 has 3 queries): the four row states, and the pill on the current letter's comps */
  rowsTwo: {
    [K.tide]: "9 of 17 agents asked for more", [K.salt]: "6 of 9 agents asked for more", [K.nine]: "Sent to 3 agents so far",
    [K.brit]: "Not used yet", [K.kest]: "Not used yet", [K.ferr]: "Not used yet", [K.last]: "In a draft letter",
  } as Record<string, string>,
  pill: [K.tide, K.nine],
  /* the open comp on arrival (the first in your order): Tidewater — 3 sent letters, 19 agents, 9 asked, 47% */
  open: { key: K.tide, figs: ["3", "19", "9", "47%"], letters: 4, queriesShown: 6 },
  pendium: [K.salt, K.tide, K.nine, K.last, K.brit, K.kest, K.ferr],
};
const SPARE = "No comp here yet. A comp needs 5 queries to be ranked.";
const NONE = "Nothing to rank yet. Send 5 queries with a letter that mentions comps and your top three will show here.";
const NAVY = "rgb(42, 58, 82)";

type Fail = { lock: string; vp: number; what: string; got: unknown; want: unknown };
let fails: Fail[] = [];
let readings = 0;
function check(lock: string, vp: Vp, what: string, got: unknown, want: unknown, ok = JSON.stringify(got) === JSON.stringify(want)) {
  readings++;
  if (!ok) fails.push({ lock, vp: vp.width, what, got, want });
}
const ev = <T,>(page: Page, f: string): Promise<T> => page.evaluate(f) as Promise<T>;

async function mutate(page: Page, lock: string) {
  const m = (MUTATIONS as Record<string, { css?: string; js?: string }>)[lock];
  if (!m) throw new Error(`no mutation named for ${lock}`);
  if (m.css) await page.addStyleTag({ content: m.css });
  if (m.js) await page.evaluate(m.js);
  await page.waitForTimeout(150);
}

/* ══ the locks ══════════════════════════════════════════════════════════════════════════════ */

type Lock = { name: string; setup?: string[]; ms?: string; run: (page: Page, vp: Vp, mut: () => Promise<void>) => Promise<void> };

const LOCKS: Lock[] = [
  { name: "H1", run: async (page, vp, mut) => {
    /* the headline on one line at this width and at 1717; then the Query Centre's header against this one */
    for (const w of [vp.width, 1717]) {
      if (w !== vp.width) { await page.setViewportSize({ width: w, height: vp.height }); await page.waitForTimeout(500); await page.evaluate(LIB); }
      await mut();
      const lines = await ev<number>(page, `window.__lines(window.__q('[data-wsnh="title"]'))`);
      check("H1", vp, `the headline is one line at ${w}`, lines, 1);
      /* the size is this page's own rule, clamp(44px, 3.6vw, 66px), at this width */
      const fs = await ev<number>(page, `parseFloat(getComputedStyle(window.__q('[data-wsnh="title"]')).fontSize)`);
      const want = Math.min(66, Math.max(44, w * 0.036));
      check("H1", vp, `the headline is clamp(44px, 3.6vw, 66px) = ${want.toFixed(1)} at ${w}`, Math.round(fs * 10) / 10, Math.round(want * 10) / 10, Math.abs(fs - want) <= 0.5);
    }
    await page.setViewportSize(vp); await page.waitForTimeout(400);
    const me = await ev<{ top: number; h: number }>(page, `(() => { const h = window.__q('[data-wsnh="header"]').getBoundingClientRect(); return { top: Math.round(h.top), h: Math.round(h.height) }; })()`);
    await openRoute(page, "/queries", vp);
    const qc = await ev<{ top: number; h: number } | null>(page, `(() => { const h = [...document.querySelectorAll('.qc1531-hd')].find((e) => e.getBoundingClientRect().height > 0); if (!h) return null; const r = h.getBoundingClientRect(); return { top: Math.round(r.top), h: Math.round(r.height) }; })()`);
    check("H1", vp, "the Query Centre's header was found", !!qc, true);
    if (qc) {
      check("H1", vp, `top equals the Query Centre's (${qc.top})`, me.top, qc.top, Math.abs(me.top - qc.top) <= 1);
      check("H1", vp, `height equals the Query Centre's (${qc.h})`, me.h, qc.h, Math.abs(me.h - qc.h) <= 1);
    }
  } },
  { name: "H2", run: async (page, vp, mut) => {
    await mut();
    const r = await ev<{ titles: string[]; line: string; clipped: string[]; see: boolean }>(page, `(() => {
      const box = window.__q('[data-wsnh="right"]').getBoundingClientRect();
      const spans = window.__qa('[data-cp="current-comp"]');
      const clipped = spans.filter((s) => { const b = s.getBoundingClientRect(); return s.scrollWidth > s.clientWidth + 1 || b.right > box.right + 1 || b.left < box.left - 1 || b.width < 2; }).map((s) => s.textContent);
      return { titles: spans.map((s) => s.textContent), line: window.__q('[data-cp="current-letter"]').textContent, clipped, see: !!window.__q('[data-cp="current-see"]') };
    })()`);
    check("H2", vp, "the current letter's comps", r.titles, FIX.current.titles);
    check("H2", vp, "the letter line", r.line, FIX.current.line);
    check("H2", vp, "each title fully visible", r.clipped, []);
    check("H2", vp, "See the letter", r.see, true);
  } },
  { name: "B1", run: async (page, vp, mut) => {
    await mut();
    const r = await ev<{ n: number; letter: string | null; name: string | null; line: string | null }>(page, `(() => {
      const b = window.__qa('[data-cp="notice"]');
      return { n: b.length, letter: b[0]?.getAttribute("data-letter") ?? null, name: b[0]?.querySelector('[data-cp="notice-letter"]')?.textContent ?? null, line: b[0]?.querySelector('[data-cp="notice-line"]')?.textContent ?? null };
    })()`);
    check("B1", vp, "one band, for the unrecorded letter", [r.n, r.letter, r.name, r.line], [1, FIX.band.letter, FIX.band.name, FIX.band.line]);
    await page.evaluate(`window.__q('[data-cp="notice-log"]').click()`);
    await page.waitForTimeout(400);
    const pk = await ev<{ mode: string | null; letter: string | null }>(page, `(() => { const d = document.querySelector('[data-cv="picker"]'); return { mode: d?.getAttribute("data-mode") ?? null, letter: d?.getAttribute("data-letter") ?? null }; })()`);
    check("B1", vp, "its pill opens the picker on that letter", pk, { mode: "unrecorded", letter: FIX.band.letter });
    await page.keyboard.press("Escape");
    /* no unrecorded sent letter: no band */
    seed("--variant", "nosent", "--empty");
    await openCp(page, vp);
    await mut();
    const none = await ev<number>(page, `window.__qa('[data-cp="notice"]').length`);
    check("B1", vp, "no band with no unrecorded sent letter", none, 0);
    seed("--empty");
  } },
  { name: "S1", setup: ["--variant", "two", "--empty"], run: async (page, vp, mut) => {
    await mut();
    const r = await ev<{ lines: Record<string, string>; pill: string[] }>(page, `(() => {
      const rows = window.__qa('[data-cp="row"]');
      return { lines: Object.fromEntries(rows.map((x) => [x.getAttribute("data-key"), x.querySelector('[data-cp="row-line"]').textContent])),
        pill: rows.filter((x) => x.querySelector('[data-cp="row-current"]')).map((x) => x.getAttribute("data-key")) };
    })()`);
    check("S1", vp, "each row's line, by state", r.lines, FIX.rowsTwo);
    check("S1", vp, "the pill only on the current letter's comps", r.pill, FIX.pill);
  } },
  { name: "S2", run: async (page, vp, mut) => {
    await mut();
    /* every part of the page drawn: Queries view on, the cards in view once */
    const r = await ev<{ population: number; ellipsis: string[]; clipped: string[] }>(page, `(() => {
      const els = [window.__cp(), ...window.__cp().querySelectorAll("*")].filter((e) => e.getBoundingClientRect().width > 0);
      const texty = els.filter((e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()));
      const name = (e) => (e.getAttribute("data-cp") || e.getAttribute("data-wsnh") || e.className || e.tagName) + ": " + e.textContent.trim().slice(0, 30);
      const ellipsis = els.filter((e) => getComputedStyle(e).textOverflow === "ellipsis").map(name);
      const clipped = texty.filter((e) => { const cs = getComputedStyle(e); return /hidden|clip/.test(cs.overflowX) && e.scrollWidth > e.clientWidth + 1; }).map(name);
      return { population: texty.length, ellipsis, clipped };
    })()`);
    check("S2", vp, "the population of text elements is non-zero", r.population > 50, true);
    check("S2", vp, "no element has text-overflow: ellipsis", r.ellipsis, []);
    check("S2", vp, "no text node is clipped by its box", r.clipped, []);
  } },
  { name: "O1", run: async (page, vp, mut) => {
    await mut();
    const r = await ev<{ key: string; figs: string[]; tops: number[] }>(page, `(() => {
      const o = window.__q('[data-cp="open"]');
      const f = [...o.querySelectorAll('[data-cp="figs"] > div')];
      return { key: o.getAttribute("data-key"), figs: f.map((d) => d.querySelector("b").textContent), tops: f.map((d) => Math.round(d.getBoundingClientRect().top)) };
    })()`);
    check("O1", vp, "the first comp is open on arrival", r.key, FIX.open.key);
    check("O1", vp, "the four figures equal statOf / compRate", r.figs, FIX.open.figs);
    check("O1", vp, "the figures sit on one line", new Set(r.tops).size, 1);
  } },
  { name: "O2", run: async (page, vp, mut) => {
    const before = await ev<{ view: string; n: number }>(page, `({ view: window.__q('[data-cp="open-list"]').getAttribute("data-view"), n: window.__qa('[data-cp="letter"]').length })`);
    check("O2", vp, "Letters on arrival, one row per letter", before, { view: "letters", n: FIX.open.letters });
    await page.evaluate(`window.__q('[data-cp="switch-btn"][data-v="queries"]').click()`);
    await page.waitForTimeout(250);
    await mut();
    const r = await ev<{ view: string; n: number; glyphs: number; words: string[]; pressed: string | null; firstAsked: boolean }>(page, `(() => {
      const q = window.__qa('[data-cp="query"]');
      return { view: window.__q('[data-cp="open-list"]').getAttribute("data-view"), n: q.length,
        glyphs: q.filter((x) => x.querySelector('svg circle, svg path')).length,
        words: q.map((x) => x.querySelector('[data-cp="query-word"]')?.textContent ?? ""),
        pressed: window.__q('[data-cp="switch-btn"][data-v="queries"]').getAttribute("aria-pressed"),
        firstAsked: !/^Queried$|^Passed$/.test(q[0]?.querySelector('[data-cp="query-word"]')?.textContent ?? "") };
    })()`);
    check("O2", vp, "the switch swaps the list", [r.view, r.pressed, r.n], ["queries", "true", FIX.open.queriesShown]);
    check("O2", vp, "every query row carries the StatusDot glyph", r.glyphs, r.n);
    check("O2", vp, "and its word", r.words.every((w) => w.length > 2), true);
    check("O2", vp, "requests first", r.firstAsked, true);
  } },
  { name: "P1", run: async (page, vp, mut) => {
    await scrollTo(page, '[data-cp="podium-sec"]', 120);
    await mut();
    const r = await ev<{ keys: (string | null)[]; places: (string | null)[]; pcts: string[]; h: number[]; bg: string[] }>(page, `(() => {
      const cols = [...window.__q('[data-cp="podium"]').children];
      return { keys: cols.map((c) => c.getAttribute("data-key")), places: cols.map((c) => c.getAttribute("data-place")),
        pcts: cols.map((c) => c.querySelector('[data-cp="postmark"] text')?.textContent ?? ""),
        h: cols.map((c) => Math.round(c.querySelector('[data-cp="podium-step"]').getBoundingClientRect().height)),
        bg: cols.map((c) => getComputedStyle(c.querySelector('[data-cp="podium-step"]')).backgroundColor) };
    })()`);
    check("P1", vp, "columns read 2nd · 1st · 3rd (podiumOf)", [r.keys, r.places], [FIX.podium.keys, FIX.podium.places]);
    check("P1", vp, "postmarks are compRate", r.pcts, FIX.podium.pcts);
    check("P1", vp, "1st is the tallest step", r.h[1] > r.h[0] && r.h[1] > r.h[2], true);
    check("P1", vp, "1st is navy", r.bg[1], NAVY);
  } },
  { name: "P2", setup: ["--variant", "tie", "--empty"], run: async (page, vp, mut) => {
    await scrollTo(page, '[data-cp="podium-sec"]', 120);
    await mut();
    const r = await ev<{ keys: (string | null)[]; places: string[]; equal: boolean[] }>(page, `(() => {
      const cols = [...window.__q('[data-cp="podium"]').children];
      return { keys: cols.map((c) => c.getAttribute("data-key")),
        places: cols.map((c) => c.querySelector('[data-cp="podium-step"]').firstChild.textContent.trim()),
        equal: cols.map((c) => !!c.querySelector('[data-cp="podium-equal"]')) };
    })()`);
    check("P2", vp, "equal rates share a step number", [r.keys, r.places], [FIX.tie.keys, FIX.tie.places]);
    check("P2", vp, "and say equal", r.equal, FIX.tie.equal);
  } },
  { name: "P3", setup: ["--variant", "two", "--empty"], run: async (page, vp, mut) => {
    await scrollTo(page, '[data-cp="podium-sec"]', 120);
    await mut();
    const r = await ev<{ spare: { slot: string | null; line: string; hatched: boolean; shown: boolean }[]; cols: number }>(page, `(() => ({
      cols: window.__qa('[data-cp="podium-col"]').length,
      spare: window.__qa('[data-cp="podium-spare"]').map((s) => ({ slot: s.getAttribute("data-slot"), line: s.querySelector('[data-cp="podium-spare-line"]')?.textContent ?? "",
        hatched: /repeating-linear-gradient/.test(getComputedStyle(s.querySelector('[data-cp="podium-step"]')).backgroundImage), shown: s.getBoundingClientRect().height > 0 })),
    }))()`);
    check("P3", vp, "two ranked, the 3rd place spare", [r.cols, r.spare.map((s) => s.slot)], [2, ["3"]]);
    check("P3", vp, "the spare step: hatched, with its line, shown", r.spare.map((s) => [s.line, s.hatched, s.shown]), [[SPARE, true, true]]);
    /* nothing ranked: the bare podium and its line */
    seed("--variant", "nosent", "--empty");
    await openCp(page, vp);
    await scrollTo(page, '[data-cp="podium-sec"]', 120);
    await mut();
    const b = await ev<{ bare: boolean; cols: number; cards: number; steps: number; shown: number; sub: string }>(page, `(() => ({
      bare: window.__q('[data-cp="podium"]').classList.contains("is-bare"), cols: window.__qa('[data-cp="podium-col"]').length,
      cards: window.__qa('[data-cp="podium"] .cp32-pcard').length, steps: window.__qa('[data-cp="podium-step"]').length,
      shown: window.__qa('[data-cp="podium-spare"]').filter((s) => s.getBoundingClientRect().height > 0).length,
      sub: window.__q('[data-cp="podium-sub"]').textContent }))()`);
    check("P3", vp, "nothing ranked: a bare podium, three hatched steps, no cards", [b.bare, b.cols, b.cards, b.steps, b.shown], [true, 0, 0, 3, 3]);
    check("P3", vp, "and its line", b.sub, NONE);
    seed("--empty");
  } },
  { name: "C1", run: async (page, vp, mut) => {
    await mut();
    const keys = await ev<string[]>(page, `window.__qa('[data-cp="pendium-row"]').map((r) => r.getAttribute("data-key"))`);
    check("C1", vp, "ranked in podium order, then the rest", keys, FIX.pendium);
  } },
  { name: "C2", run: async (page, vp, mut) => {
    await scrollTo(page, '[data-cp="pendium"]', 120);
    await mut();
    const r = await ev<{ hit: boolean; rib: unknown; th: unknown }>(page, `(() => {
      const a = window.__q('[data-cp="ribbon"]').getBoundingClientRect(), b = window.__q('[data-cp="th-pct"]').getBoundingClientRect();
      return { hit: a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom, rib: [Math.round(a.left), Math.round(a.right), Math.round(a.bottom)], th: [Math.round(b.left), Math.round(b.right), Math.round(b.top)] };
    })()`);
    check("C2", vp, `the ribbon ${JSON.stringify(r.rib)} clear of "Percentage" ${JSON.stringify(r.th)}`, r.hit, false);
  } },
  { name: "SC1", run: async (page, vp, mut) => {
    await mut();
    const r = await ev<{ n: number; inside: boolean }>(page, `({ n: window.__qa('[data-cp="scout"]').length, inside: !!window.__q('[data-cp="pendium"] [data-cp="scout"]') })`);
    check("SC1", vp, "one Scout strip, inside the Comp-pendium", r, { n: 1, inside: true });
    await scrollTo(page, '[data-cp="scout"]', 200);
    await page.evaluate(`window.__q('[data-cp="scout-btn"]').click()`);
    await page.waitForTimeout(900);
    check("SC1", vp, "the leaf is stored", dump().notify.comps ?? null, true);
    await page.reload(); await page.evaluate(async () => { await document.fonts.ready; });
    await page.evaluate(LIB);
    await page.waitForFunction(() => { try { return !!(window as any).__q('[data-cp="scout-btn"]'); } catch { return false; } }, null, { timeout: 30_000 });
    const t = await ev<string>(page, `window.__q('[data-cp="scout-btn"]').textContent`);
    check("SC1", vp, "it survives a reload", t, "We’ll let you know");
    seed("--empty");
  } },
  { name: "G1", run: async (page, vp, mut) => {
    await mut();
    const r = await ev<{ green: string[]; mono: string[]; h1: number }>(page, `(() => {
      const els = [window.__cp(), ...window.__cp().querySelectorAll("*")].filter((e) => e.getBoundingClientRect().width > 0);
      const isGreen = (c) => { const m = c.match(/rgba?\\(([\\d.]+), ([\\d.]+), ([\\d.]+)(?:, ([\\d.]+))?\\)/); if (!m) return false; const [r, g, b] = [+m[1], +m[2], +m[3]]; const a = m[4] === undefined ? 1 : +m[4]; if (a < 0.05) return false;
        const mx = Math.max(r, g, b), mn = Math.min(r, g, b); if (mx - mn < 24) return false; let h; const d = mx - mn;
        if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4; h *= 60; if (h < 0) h += 360; return h > 75 && h < 165; };
      const green = []; const mono = [];
      for (const e of els) { const cs = getComputedStyle(e);
        for (const p of ["color", "backgroundColor", "borderTopColor", "fill", "stroke"]) if (isGreen(cs[p])) green.push((e.getAttribute("data-cp") || e.className || e.tagName) + " " + p + " " + cs[p]);
        const own = [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
        if (own && /mono/i.test(cs.fontFamily) && parseFloat(cs.fontSize) < 14 && (cs.textTransform === "uppercase" || /^[A-Z0-9 ·]+$/.test(e.textContent.trim()))) mono.push((e.getAttribute("data-cp") || e.className) + ": " + e.textContent.trim().slice(0, 20));
      }
      return { green, mono, h1: window.__qa("h1").length };
    })()`);
    check("G1", vp, "no green on the page", r.green, []);
    check("G1", vp, "no small uppercase mono label", r.mono, []);
    check("G1", vp, "exactly one h1", r.h1, 1);
    /* kept from CP30 S5: a row, a podium step and a Comp-pendium row are each one control, never a control inside one */
    const nested = await ev<number>(page, `window.__qa("button button, button a, a button, tr[tabindex] button").length`);
    check("G1", vp, "no button holds a button or link", nested, 0);
  } },
  { name: "W1", run: async (page, vp, mut) => {
    await mut();
    const r = await ev<{ over: number; page: number; col: number; grid: number }>(page, `(() => {
      const sc = window.__cp().closest(".wpg-scroll"); const p = window.__cp(); const col = p.parentElement; const cs = getComputedStyle(col);
      const colW = col.getBoundingClientRect().width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      return { over: sc.scrollWidth - sc.clientWidth, page: Math.round(p.getBoundingClientRect().width), col: Math.round(colW), grid: Math.round(window.__q('[data-cp="grid"]').getBoundingClientRect().right - p.getBoundingClientRect().right) };
    })()`);
    check("W1", vp, "no sideways scroll", r.over <= 0, true);
    check("W1", vp, `the page is the shared column (${r.col})`, Math.abs(r.page - r.col) <= 1, true);
    check("W1", vp, "the grid stays inside the page", r.grid <= 1, true);
  } },
];

const proofs: Record<string, Record<number, boolean>> = {};

for (const vp of SIZES) {
  test(`CP32 at ${vp.width}`, async ({ page }) => {
    /* CP32_ONLY=H1,P2 runs those locks alone (a re-proof after a lock changes) */
    const only = (process.env.CP32_ONLY ?? "").split(",").filter(Boolean);
    for (const lock of LOCKS) {
      if (only.length && !only.includes(lock.name)) continue;
      for (const mutated of PROVE ? [false, true] : [false]) {
        seed(...(lock.setup ?? ["--empty"]));
        await openCp(page, vp, { ms: lock.ms });
        const before = fails.length;
        await lock.run(page, vp, mutated ? () => mutate(page, lock.name) : async () => undefined);
        if (mutated) {
          const went = fails.length > before;
          (proofs[lock.name] ??= {})[vp.width] = went;
          fails = fails.slice(0, before);
          if (!went) fails.push({ lock: lock.name, vp: vp.width, what: "UNPROVED: its mutation did not redden it", got: "green", want: "red" });
        }
      }
    }
  });
}

test("CP32 · the run measured enough, and nothing failed", () => {
  writeFileSync("reports/comps-v32/readings.json", JSON.stringify({ readings, fails, proofs }, null, 2));
  if (!process.env.CP32_ONLY) expect(readings, "too few readings: a lock measured nothing").toBeGreaterThan(PROVE ? 150 : 75);
  expect(fails).toEqual([]);
});

/* MS_EMPTY is the day-one manuscript (`--empty`), used by the screenshots and the wsHeaders H9 row */
void MS_EMPTY;
test.afterAll(() => { seed("--restore"); });
