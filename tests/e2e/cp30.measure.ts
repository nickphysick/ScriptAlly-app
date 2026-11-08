/**
 * Comparable titles v30 — the CP30 locks (design-refs/comps-v30/), on `seedComps30.mjs`, at 1280×800 and 1512×900 with
 * the sidebar open. Each lock is a function returning its readings; `check()` records them.
 *
 * ⚠️ RED FIRST, IN THE SAME RUN: with `CP30_PROVE=1` every lock runs a second time with its named mutation
 *    (cp30Mutate.mjs) applied to the rendered page, and that run must go red at least once. A lock nothing can redden
 *    is unproved, and the run fails saying so. Proofs land in reports/comps-v30/proofs.json.
 * ⚠️ THE FIXTURE'S FACTS ARE STATED HERE FROM THE SEEDER, never read back from the page they test.
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { LIB, MS_EMPTY, SIZES, dump, openCp, scrollTo, seed, type Vp } from "./cp30Lib";
import { MUTATIONS } from "./cp30Mutate.mjs";

test.describe.configure({ mode: "serial" });
test.setTimeout(1_200_000);
const PROVE = process.env.CP30_PROVE === "1";
mkdirSync("reports/comps-v30", { recursive: true });

/* ── the fixture (seedComps30.mjs) ── */
const FIX = {
  v2: { sent: 9, asked: 6 },          // Query letter v2: 9 queries, 6 asked for more, records Tidewater + Salt Road
  v1: { sent: 5 },                    // Query letter v1: 5 queries, nothing recorded
  letterOrder: ["cp30-let-2", "cp30-let-1", "cp30-let-4", "cp30-let-3"], // sent by queries, then drafts by name
  middles: ["logged", "unrecorded", "empty", "logged"],
  sentComp: "cmp_cp30tide",          // in v2 (sent) AND v3 (draft): its card must name only v2
};
const pct = (a: number, b: number) => Math.round((a / b) * 100);

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
    await mut();
    const r = await ev<{ top: any; grid: any; col: any }>(page, `(() => {
      const col = window.__cp(); const cs = getComputedStyle(col);
      const c = col.getBoundingClientRect();
      return { top: window.__box(window.__q('[data-cp="top"]')), grid: window.__box(window.__q('[data-cp="grid"]')),
        col: { l: c.left + parseFloat(cs.paddingLeft), r: c.right - parseFloat(cs.paddingRight) } };
    })()`);
    check("H1", vp, "panel left = column left", Math.abs(r.top.x - r.col.l) <= 1, true);
    check("H1", vp, "panel right = column right", Math.abs(r.top.r - r.col.r) <= 1, true);
    check("H1", vp, "grid left = panel left", Math.abs(r.grid.x - r.top.x) <= 1, true);
    check("H1", vp, "grid right = panel right", Math.abs(r.grid.r - r.top.r) <= 1, true);
  } },
  { name: "H2", run: async (page, vp, mut) => {
    await mut();
    const r = await ev<{ kind: string; badge: string | null; title: string }>(page, `({ kind: window.__q('[data-cp="hl"]').getAttribute("data-hl"),
      badge: window.__q('[data-cp="hl-badge"]')?.textContent ?? null, title: window.__q('[data-cp="hl-title"]').textContent })`);
    /* Tidewater and Salt Road tie at 6 of 9: the writer's own order decides */
    check("H2", vp, "ready, Tidewater, its rate on the disc", r, { kind: "ready", badge: `${pct(FIX.v2.asked, FIX.v2.sent)}%`, title: "The Tidewater Line" });
  } },
  { name: "H2-early", setup: ["--empty", "--variant", "early"], run: async (page, vp, mut) => {
    /* the app's persistent cache paints the previous seed first; wait for the early fixture to arrive (3 queries) */
    await page.waitForFunction(() => { try { return (window as any).__q('[data-cp="hl"]').getAttribute("data-hl") !== "ready"; } catch { return false; } }, null, { timeout: 15_000 }).catch(() => undefined);
    await mut();
    const r = await ev<{ kind: string; badge: boolean; title: string }>(page, `({ kind: window.__q('[data-cp="hl"]').getAttribute("data-hl"),
      badge: !!window.__q('[data-cp="hl-badge"]'), title: window.__q('[data-cp="hl-title"]').textContent })`);
    check("H2-early", vp, "too soon: no pill", r, { kind: "soon", badge: false, title: "Too soon to say" });
  } },
  { name: "H3", run: async (page, vp, mut) => {
    await mut();
    const t = await ev<string>(page, `window.__q('[data-cp="lead"]').textContent`);
    check("H3", vp, "the lead sentence", t, "Seven comps on file for Murphy's Day Out. Two have gone out with your queries, and five are waiting to be used.");
  } },
  { name: "S1", run: async (page, vp, mut) => {
    await scrollTo(page, '[data-cp="shelf"]');
    await mut();
    const r = await ev<{ tops: number[]; over: number; page: number }>(page, `(() => {
      const t = window.__q('[data-cp="tools"]');
      const tops = [...t.children].filter((c) => c.getBoundingClientRect().width > 0 && c.getBoundingClientRect().height > 0).map((c) => { const b = c.getBoundingClientRect(); return Math.round(b.top + b.height / 2); });
      const sc = window.__cp().closest(".wpg-scroll");
      return { tops, over: t.scrollWidth - t.clientWidth, page: sc.scrollWidth - sc.clientWidth };
    })()`);
    check("S1", vp, "every control shares a centre line (±2)", Math.max(...r.tops) - Math.min(...r.tops) <= 2, true);
    check("S1", vp, "the toolbar does not overflow", r.over <= 0, true);
    check("S1", vp, "the page does not scroll sideways", r.page <= 0, true);
  } },
  { name: "S2", run: async (page, vp, mut) => {
    await mut();
    const r = await ev<{ bands: Record<string, string>; green: string[] }>(page, `(() => {
      const bands = {};
      for (const c of window.__qa('[data-cp="card"]')) bands[c.getAttribute("data-w")] = getComputedStyle(c.querySelector('[data-cp="band"]')).backgroundColor;
      const hue = (s) => { const m = s.match(/rgba?\\(([^)]+)\\)/); if (!m) return null; const [r, g, b, a] = m[1].split(",").map(Number);
        if (a === 0) return null; const R = r / 255, G = g / 255, B = b / 255, mx = Math.max(R, G, B), mn = Math.min(R, G, B), l = (mx + mn) / 2, d = mx - mn;
        if (!d) return null; const sat = d / (1 - Math.abs(2 * l - 1)); let h = mx === R ? ((G - B) / d) % 6 : mx === G ? (B - R) / d + 2 : (R - G) / d + 4; h = (h * 60 + 360) % 360; return { h, s: sat }; };
      const green = [];
      for (const el of [window.__cp(), ...window.__cp().querySelectorAll("*")]) {
        const cs = getComputedStyle(el);
        for (const p of ["color", "backgroundColor", "borderTopColor", "fill", "stroke"]) {
          const v = cs[p]; const x = hue(v); if (x && x.h >= 75 && x.h <= 165 && x.s > 0.15 && (p !== "borderTopColor" || parseFloat(cs.borderTopWidth) > 0)) green.push(el.className + " " + p + " " + v);
        }
      }
      const sorted = {}; for (const k of Object.keys(bands).sort()) sorted[k] = bands[k];
      return { bands: sorted, green: green.slice(0, 5) };
    })()`);
    check("S2", vp, "band colours by where", r.bands, { draft: "rgb(243, 226, 220)", sent: "rgb(42, 58, 82)", shelf: "rgb(235, 231, 225)" });
    check("S2", vp, "no green on the page", r.green, []);
  } },
  { name: "S3", run: async (page, vp, mut) => {
    await mut();
    const line = await ev<string>(page, `window.__q('[data-cp="card"][data-key="${FIX.sentComp}"] [data-cp="stat-line"]').textContent`);
    check("S3", vp, "a sent card names only its sent letters", line, `${FIX.v2.asked} of ${FIX.v2.sent} queries · named in Query letter v2`);
    await page.evaluate(`window.__q('[data-cp="stat-pick"]').click()`);
    await page.waitForTimeout(500);
    const r = await ev<{ picker: boolean; drawer: boolean }>(page, `({ picker: !!document.querySelector('[data-cv="picker"]'), drawer: !!document.querySelector('.hdr.is-in[data-hdr="comp"]') })`);
    check("S3", vp, "Add it to a letter opens the picker, not the drawer", r, { picker: true, drawer: false });
    await page.keyboard.press("Escape"); await page.waitForTimeout(400);
  } },
  { name: "S4", run: async (page, vp, mut) => {
    await mut();
    const orders: Record<string, [string[], string[]]> = {};
    for (const k of ["own", "queries", "rate", "newest", "az"]) {
      await page.evaluate(`window.__q('[data-cp="sort-btn"]').click()`);
      await page.evaluate(`window.__q('[data-sort="${k}"]').click()`);
      await page.waitForTimeout(120);
      const cards = await ev<string[]>(page, `window.__qa('[data-cp="card"]').map((e) => e.getAttribute("data-key"))`);
      await page.evaluate(`window.__q('[data-cp="view-list"]').click()`); await page.waitForTimeout(120);
      await mut();
      const list = await ev<string[]>(page, `window.__qa('[data-cp="row"]').map((e) => e.getAttribute("data-key"))`);
      await page.evaluate(`window.__q('[data-cp="view-cards"]').click()`); await page.waitForTimeout(120);
      orders[k] = [cards, list];
      check("S4", vp, `list = cards (${k})`, list, cards, list.length === 7 && JSON.stringify(list) === JSON.stringify(cards));
    }
    await page.evaluate(`window.__q('[data-cp="sort-btn"]').click()`); await page.evaluate(`window.__q('[data-sort="own"]').click()`);
  } },
  { name: "S5", run: async (page, vp, mut) => {
    await mut();
    const n = await ev<string[]>(page, `[...window.__cp().querySelectorAll("button")].filter((b) => b.querySelector("button, a, [href]") || b.parentElement.closest("button")).map((b) => b.outerHTML.slice(0, 60))`);
    check("S5", vp, "no button holds a button or link", n, []);
  } },
  { name: "L1", run: async (page, vp, mut) => {
    await scrollTo(page, '[data-cp="letters"]');
    await mut();
    const r = await ev<[string, string][]>(page, `window.__qa('[data-cp="letter"]').map((e) => [e.getAttribute("data-letter"), e.getAttribute("data-middle")])`);
    check("L1", vp, "letter order and middles", r, FIX.letterOrder.map((id, i) => [id, FIX.middles[i]]));
  } },
  { name: "L2", run: async (page, vp, mut) => {
    await mut();
    const r = await ev<{ letter: string; card: string; hl: string }>(page, `(() => { const fig = (e) => { const c = e.cloneNode(true); c.querySelectorAll("small").forEach((x) => x.remove()); return c.textContent.trim(); }; return {
      letter: fig(window.__q('[data-letter="cp30-let-2"] [data-cp="letter-rate"]')),
      card: fig(window.__q('[data-cp="card"][data-key="${FIX.sentComp}"] .cp30-k')),
      hl: window.__q('[data-cp="hl-badge"]').textContent }; })()`);
    const want = `${pct(FIX.v2.asked, FIX.v2.sent)}%`;
    check("L2", vp, "letter, card and header agree with the fixture", r, { letter: want, card: want, hl: want });
  } },
  { name: "D1", run: async (page, vp, mut) => {
    const openFrom = async (sel: string, viaList = false) => {
      if (viaList) { await page.evaluate(`window.__q('[data-cp="view-list"]').click()`); await page.waitForTimeout(150); }
      await page.evaluate(`(() => { const e = window.__q('${sel}'); e.scrollIntoView({ block: "center" }); e.focus(); e.click(); })()`);
      await page.waitForTimeout(600);
      await mut();
      const r = await ev<{ open: boolean; dx: number; dy: number; tw: number; th: number }>(page, `(() => {
        const d = document.querySelector('.hdr.is-in[data-hdr="comp"]'); if (!d) return { open: false, dx: 99, dy: 99, tw: 0, th: 0 };
        const t = d.querySelector('[data-cv="drawer-title"]').getBoundingClientRect();
        const b = d.querySelector('[data-cv="drawer-close"]').getBoundingClientRect(), g = d.querySelector('[data-cv="drawer-close"] svg').getBoundingClientRect();
        return { open: true, dx: Math.abs((b.left + b.width / 2) - (g.left + g.width / 2)), dy: Math.abs((b.top + b.height / 2) - (g.top + g.height / 2)), tw: t.width, th: t.height };
      })()`);
      check("D1", vp, `opens from ${sel}`, r.open, true);
      check("D1", vp, `✕ centred (${sel})`, r.dx <= 1 && r.dy <= 1, true);
      await page.keyboard.press("Escape"); await page.waitForTimeout(500);
      const back = await ev<boolean>(page, `document.activeElement === window.__q('${sel}')`);
      check("D1", vp, `focus back to the opener (${sel})`, back, true);
      if (viaList) { await page.evaluate(`window.__q('[data-cp="view-cards"]').click()`); await page.waitForTimeout(150); }
    };
    await openFrom(`[data-cp="card"][data-key="${FIX.sentComp}"]`);
    await openFrom(`[data-cp="row"][data-key="${FIX.sentComp}"]`, true);
    await openFrom(`[data-letter="cp30-let-2"] [data-cp="letter-comp"]`);
  } },
  { name: "D1t", run: async (page, vp, mut) => {
    /* a class shared with the toolbar's 9px dot once held the drawer's title to one letter a line */
    for (const sel of [`[data-cp="card"][data-key="${FIX.sentComp}"]`, `[data-cp="add"]`]) {
      await page.evaluate(`(() => { const e = window.__q('${sel}'); e.scrollIntoView({ block: "center" }); e.click(); })()`);
      await page.waitForTimeout(600);
      await mut();
      const t = await ev<{ w: number; h: number } | null>(page, `(() => { const e = document.querySelector('.hdr.is-in[data-hdr="comp"] [data-cv="drawer-title"]'); if (!e) return null; const r = e.getBoundingClientRect(); return { w: r.width, h: r.height }; })()`);
      check("D1t", vp, `the title runs across the head, at most two lines (${sel})`, !!t && t.w >= 150 && t.h <= 72, true);
      await page.keyboard.press("Escape"); await page.waitForTimeout(500);
    }
  } },
  { name: "D2", run: async (page, vp, mut) => {
    await page.evaluate(`window.__q('[data-cp="card"][data-key="${FIX.sentComp}"]').click()`); await page.waitForTimeout(600);
    await mut();
    const bad = await ev<string[]>(page, `(() => {
      const roots = [window.__cp(), document.querySelector('.hdr.is-in[data-hdr="comp"]')].filter(Boolean);
      const out = [];
      for (const root of roots) for (const el of root.querySelectorAll("*")) {
        if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
        const cs = getComputedStyle(el);
        if (cs.textTransform === "uppercase" && /mono/i.test(cs.fontFamily) && parseFloat(cs.fontSize) < 12) out.push(el.textContent.trim().slice(0, 30));
      }
      return out;
    })()`);
    check("D2", vp, "no small uppercase mono text", bad, []);
    await page.keyboard.press("Escape"); await page.waitForTimeout(400);
  } },
  { name: "E1", ms: MS_EMPTY, run: async (page, vp, mut) => {
    await mut();
    const r = await ev<string[]>(page, `[...window.__cp().children].map((e) => e.getAttribute("data-cp") || e.className.split(" ")[0])`);
    check("E1", vp, "the empty page: panel, steps, footer", r, ["top", "how-steps", "af"]);
  } },
  { name: "SC1", run: async (page, vp, mut) => {
    await mut();
    const tab = await ev<boolean>(page, `!!document.querySelector('[data-ftab="scout"]')`);
    check("SC1", vp, "no floating Scout tab", tab, false);
    await scrollTo(page, '[data-cp="scout"]', 200);
    await page.evaluate(`window.__q('[data-cp="scout-btn"]').click()`);
    await page.waitForTimeout(800);
    check("SC1", vp, "the leaf is stored", dump().notify.comps ?? null, true);
    await page.reload(); await page.evaluate(async () => { await document.fonts.ready; });
    await page.evaluate(LIB);
    await page.waitForFunction(() => { try { return !!(window as any).__q('[data-cp="scout-btn"]'); } catch { return false; } }, null, { timeout: 30_000 });
    const t = await ev<string>(page, `window.__q('[data-cp="scout-btn"]').textContent`);
    check("SC1", vp, "it survives a reload", t, "✓ We’ll tell you");
    seed("--empty");
  } },
];

const proofs: Record<string, Record<number, boolean>> = {};

for (const vp of SIZES) {
  test(`CP30 at ${vp.width}`, async ({ page }) => {
    let lastSetup = "";
    for (const lock of LOCKS) {
      for (const mutated of PROVE ? [false, true] : [false]) {
        const setup = (lock.setup ?? ["--empty"]).join(" ");
        if (setup !== lastSetup || lock.name === "SC1") { seed(...(lock.setup ?? ["--empty"])); lastSetup = setup; }
        await openCp(page, vp, { ms: lock.ms });
        const before = fails.length;
        await lock.run(page, vp, mutated ? () => mutate(page, lock.name) : async () => undefined);
        if (mutated) {
          const went = fails.length > before;
          (proofs[lock.name] ??= {})[vp.width] = went;
          fails = fails.slice(0, before);
          if (!went) fails.push({ lock: lock.name, vp: vp.width, what: "UNPROVED: its mutation did not redden it", got: "green", want: "red" });
        }
        lastSetup = lock.name === "SC1" ? "" : lastSetup;
      }
    }
  });
}

test("CP30 · the run measured enough, and nothing failed", () => {
  writeFileSync("reports/comps-v30/readings.json", JSON.stringify({ readings, fails, proofs }, null, 2));
  expect(readings, "too few readings: a lock measured nothing").toBeGreaterThan(PROVE ? 120 : 60);
  expect(fails).toEqual([]);
});

test.afterAll(() => { seed("--restore"); });
