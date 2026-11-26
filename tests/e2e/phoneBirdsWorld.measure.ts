/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone Birds-eye world v1, phase 4 — THE LOCKS, measured on the rendered page (design-refs/phone-birds-eye-world-v1).
 * 390 × 784 at 2× (the ref's screen), and 740 × 360 for landscape (⚠️ 844 × 390 is the DESKTOP layout here: 844px is
 * above the 768px breakpoint, as PA5-8 already records — the false premise is named in the report).
 *
 *   BW-1 fitted overview · BW-2 levels · BW-3 Timeline · BW-4 spacing · BW-5 layers · BW-6 line off screen ·
 *   BW-7 anchoring · BW-8 reduced motion · BW-9 copy · BW-10 landscape
 *
 * RED FIRST: `BW_MUTATE=all` runs the green pass and then each lock with its own mutation — the smallest change on the
 * rendered page that undoes the lock's fix — and each mutation must turn exactly its own lock red. The ledger and the
 * proofs are written to reports/phone-birds-eye-world-v1/ledger/. `BW_SHOTS=1` writes the build's shots for the ref's
 * 01–13, side by side with the ref's in reports/phone-birds-eye-world-v1/shots/index.html.
 *
 * Run (through the slot): npm run e2e:emu -- tests/e2e/phoneBirdsWorld.measure.ts --project pixel
 */
import { expect, test, type Page, type CDPSession } from "@playwright/test";
import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";
import { statusBand } from "../../src/lib/stageColours";
import { stageTx, shortName } from "../../src/lib/birdsWorldV1";

const DIR = "reports/phone-birds-eye-world-v1";
const PHONE = { width: 390, height: 784 } as const;
const LAND = { width: 740, height: 360 } as const;
const WORLD = "/queries/all?view=birds";
const MUTS = ["fit", "levels", "timeline", "spacing", "layers", "offline", "anchor", "calm", "copy", "land"] as const;
type Mut = (typeof MUTS)[number] | "";
const MUT_LOCK: Record<Exclude<Mut, "">, string> = {
  fit: "BW-1", levels: "BW-2", timeline: "BW-3", spacing: "BW-4", layers: "BW-5", offline: "BW-6", anchor: "BW-7", calm: "BW-8", copy: "BW-9", land: "BW-10",
};
/* each mutation: CSS that undoes the fix, or a script run at the moment named */
const CSS_MUT: Partial<Record<Exclude<Mut, "">, string>> = {
  /* BW-1: the bottom reserve gone — the world believes it has 220px more than it does */
  fit: ".bw-vp { bottom: -220px !important; }",
  /* BW-2: the Figures and Dates levels' parts never drawn */
  levels: ".bw-fig, .bw-sub { display: none !important; }",
  /* BW-3: each stage's bar drawn 6px off its date */
  timeline: '.bw-bar[data-k="stage"] { margin-left: 6px !important; }',
  /* BW-4: rows allowed past 100px */
  spacing: ".bw-hit { height: 140px !important; }",
  /* BW-5: the hawk under the headings */
  layers: ".bw-hsw { z-index: 3 !important; }",
  /* BW-6: the edge-pinned pill not outlined */
  offline: ".bw .bw-flab.off { background: var(--pa-navy) !important; color: #fff !important; border: 0 !important; }",
  /* BW-8: the drift kept under reduced motion */
  calm: ".bw-hsw { animation: bw-hsdrift 14s ease-in-out infinite alternate !important; }",
  /* BW-10: landscape keeps the dock */
  land: "body.pa41-land .pa4-tb { display: flex !important; }",
};

type Row = { lock: string; where: string; ok: boolean; detail: string };
class Ledger {
  rows: Row[] = [];
  constructor(public mut: Mut) {}
  check(lock: string, where: string, ok: boolean, detail = "") { this.rows.push({ lock, where, ok: !!ok, detail: String(detail).slice(0, 600) }); }
  done() {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${this.mut ? `mut-${this.mut}` : "green"}.json`, JSON.stringify(this.rows, null, 1));
    const red = this.rows.filter((r) => !r.ok);
    for (const r of red.slice(0, 40)) console.log(`  ✗ ${r.lock} · ${r.where} — ${r.detail.slice(0, 300)}`);
    console.log(`  ${this.mut ? `[mut ${this.mut}]` : "[green]"}: ${this.rows.length} readings, ${red.length} red`);
    if (this.mut) {
      const own = red.filter((r) => r.lock === MUT_LOCK[this.mut as Exclude<Mut, "">]).length;
      console.log(`  MUTATION ${this.mut} → ${MUT_LOCK[this.mut as Exclude<Mut, "">]}: ${own} red (${red.length - own} elsewhere)`);
      writeFileSync(`${DIR}/ledger/mut-${this.mut}.summary.json`, JSON.stringify({ mut: this.mut, lock: MUT_LOCK[this.mut as Exclude<Mut, "">], own, other: red.length - own, readings: this.rows.length }, null, 1));
      expect(own, `mutation ${this.mut} must turn ${MUT_LOCK[this.mut as Exclude<Mut, "">]} red`).toBeGreaterThan(0);
      return;
    }
    expect(this.rows.length, "fewer readings than the locks need").toBeGreaterThanOrEqual(30);
    expect(red.map((r) => `${r.lock} · ${r.where} — ${r.detail.slice(0, 300)}`)).toEqual([]);
  }
}

/* ── reading the world ── */
interface Root { z: number; rp: number; level: string; off: number; ox: number; oy: number; sx: number; d0: number; ppd: number; top: number; n: number; replay: string }
const root = (page: Page): Promise<Root> => page.evaluate(() => {
  const r = document.querySelector<HTMLElement>('[data-bw="world"]')!.dataset;
  return { z: +r.z!, rp: +r.rp!, level: r.level!, off: +r.off!, ox: +r.ox!, oy: +r.oy!, sx: +r.sx!, d0: +r.d0!, ppd: +r.ppd!, top: +r.top!, n: +r.n!, replay: r.replay! };
});
const box = (page: Page, sel: string) => page.evaluate((s) => [...document.querySelectorAll<HTMLElement>(s)].map((e) => { const b = e.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom, w: b.width, h: b.height, d: { ...e.dataset }, text: e.textContent ?? "", html: e.innerHTML }; }), sel);
const frame = (page: Page, ms = 450) => page.waitForTimeout(ms);
/** zoom so rows are `rp` px, about (x, y), by one Ctrl+wheel — the view's own zoomAt */
async function zoomRows(page: Page, rp: number, x = PHONE.width * 0.6, y = 420) {
  /* Chromium caps one wheel event's delta, so it steps: at most ×3.3 a notch, until the rows are within 0.3px */
  await page.mouse.move(x, y);
  for (let i = 0; i < 40; i++) {
    const r = await root(page);
    const k = Math.log(rp / r.rp);
    if (Math.abs(r.rp - rp) < 0.3) break;
    await page.keyboard.down("Control");
    await page.mouse.wheel(0, Math.max(-100, Math.min(100, -k / 0.012)));
    await page.keyboard.up("Control");
    await page.waitForTimeout(60);
    if (i > 2 && Math.abs((await root(page)).rp - r.rp) < 0.01) break; /* at the ceiling */
  }
  await frame(page);
}
/** pan by (dx, dy) screen px — the wheel's own pan */
async function pan(page: Page, dx: number, dy: number, x = 200, y = 420) {
  /* Chromium delivers only part of a large wheel delta, so it steps until the view has moved by (dx, dy) or stops */
  await page.mouse.move(x, y);
  const r0 = await root(page);
  for (let i = 0; i < 30; i++) {
    const r = await root(page);
    const lx = dx - (r.ox - r0.ox), ly = dy - (r.oy - r0.oy);
    if (Math.abs(lx) < 0.5 && Math.abs(ly) < 0.5) break;
    await page.mouse.wheel(-Math.max(-120, Math.min(120, lx)), -Math.max(-120, Math.min(120, ly)));
    await page.waitForTimeout(50);
    const n = await root(page);
    if (i > 0 && Math.abs(n.ox - r.ox) < 0.01 && Math.abs(n.oy - r.oy) < 0.01) break; /* at the edge */
  }
  await frame(page);
}
/** the line to `frac` across */
async function lineTo(page: Page, frac: number) {
  await page.addStyleTag({ content: ".bw-hsw, .bw-hs, .bw-gh0, .bw-fline, .bw-ruler { pointer-events: none !important; }" });
  const ln = (await box(page, '[data-bw="line"]'))[0];
  const pill = (await box(page, '[data-bw="pill"]'))[0];
  const x = ln ? ln.l + ln.w / 2 : pill ? (pill.l + pill.r) / 2 : PHONE.width / 2;
  await pan(page, PHONE.width * frac - x, 0);
}
async function fitted(page: Page) {
  const fit = page.locator('[data-bw="fit"]:not(.hide)');
  if (await fit.count()) { await fit.click(); await frame(page, 700); }
}
async function openWorld(page: Page, path = WORLD, vp: { width: number; height: number } = PHONE) {
  await page.setViewportSize(vp);
  await page.goto(path);
  await page.locator('[data-bw="world"]').first().waitFor({ timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  await frame(page, 1200);
}
async function mutate(page: Page, mut: Mut) {
  const css = mut ? CSS_MUT[mut] : undefined;
  if (css) { await page.addStyleTag({ content: css }); await frame(page, 300); }
}

test.use({ viewport: PHONE, deviceScaleFactor: 2 });
const runs: Mut[] = process.env.BW_MUTATE === "all" ? ["", ...MUTS] : process.env.BW_MUTATE ? (process.env.BW_MUTATE.split(",") as Mut[]) : [""];

for (const mut of runs) {
  test(`Phone Birds-eye world v1 — the locks${mut ? ` · mutation ${mut}` : ""}`, async ({ page }, info) => {
    test.skip(info.project.name !== "pixel", "Chromium phone only (CDP touch for the pinch)");
    test.setTimeout(900_000);
    const L = new Ledger(mut);
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    await openRoute(page, "/dashboard", { width: 1440, height: 900 }); /* the harness's shell check is the desktop's (as PA5's signIn) */
    await page.evaluate(() => { try { localStorage.removeItem("bw1.hint.seen"); } catch { /* */ } });
    await openWorld(page);
    await mutate(page, mut);
    if (mut === "fit") { await page.setViewportSize({ width: PHONE.width, height: PHONE.height - 1 }); await frame(page, 600); await page.setViewportSize(PHONE); await frame(page, 600); }

    /* ── BW-1 · the fitted overview ── */
    {
      const r = await root(page);
      const rows = await box(page, '[data-bw="row"]');
      const dock = (await box(page, '[data-pa5="dock"]'))[0];
      const pill = (await box(page, '[data-bw="pill"]'))[0];
      const dockTop = dock ? dock.t : PHONE.height;
      const last = Math.max(...rows.map((x) => x.b));
      const top = r.top;
      const onScreen = rows.filter((x) => x.t >= top - 0.5 && x.b <= dockTop + 0.5).length;
      L.check("BW-1", `every live query is drawn (population ${r.n})`, r.n > 0 && rows.length === r.n, `${rows.length} drawn of ${r.n}`);
      L.check("BW-1", "every row is on screen, between the ruler and the dock", onScreen === r.n, `${onScreen} of ${r.n}; top ${top}, dock ${dockTop}`);
      L.check("BW-1", "the last row ends within 24px of the space above the dock", dockTop - last >= -0.5 && dockTop - last <= 24, `last ${last.toFixed(1)}, dock ${dockTop.toFixed(1)}`);
      L.check("BW-1", "the line's pill is on screen", !!pill && pill.l >= 0 && pill.r <= PHONE.width && pill.t >= 0, JSON.stringify(pill && { l: pill.l, r: pill.r, t: pill.t }));
      L.check("BW-1", "the header is fitted (140px), the chips showing", (await box(page, '[data-bw="head"]'))[0]?.h === 140, String((await box(page, '[data-bw="head"]'))[0]?.h));
    }

    /* ── BW-5 · layers, at the overview (pointer-events opened for the reading only) ── */
    {
      await page.addStyleTag({ content: ".bw-hsw, .bw-hs, .bw-gh0, .bw-fline, .bw-ruler { pointer-events: auto !important; }" });
      const layers = await page.evaluate(() => {
        const hs = document.querySelector<HTMLElement>(".bw-hs")?.getBoundingClientRect();
        const heads = [...document.querySelectorAll<HTMLElement>(".bw-gh0")].map((h) => h.getBoundingClientRect());
        const line = document.querySelector<HTMLElement>(".bw-fline")?.getBoundingClientRect();
        const at = (x: number, y: number) => document.elementsFromPoint(x, y).map((e) => (e as HTMLElement).className?.toString?.() ?? e.tagName);
        const rank = (list: string[], cls: string) => list.findIndex((c) => c.split(" ").includes(cls));
        let headPt: [number, number] | null = null;
        if (hs) for (const h of heads) { const l = Math.max(h.left + 4, hs.left + hs.width * 0.25), r = Math.min(h.right, hs.right - hs.width * 0.25), t = Math.max(h.top + 2, hs.top), b = Math.min(h.bottom - 2, hs.bottom); if (r > l && b > t) { headPt = [(l + r) / 2, (t + b) / 2]; break; } }
        const A = headPt ? at(...headPt) : [];
        const linePt: [number, number] | null = hs && line ? [line.left + line.width / 2, Math.max(hs.top + 10, line.top + 10)] : null;
        const B = linePt ? at(...linePt) : [];
        const pill = document.querySelector<HTMLElement>(".bw-flab")!.getBoundingClientRect();
        const C = at(pill.left + pill.width / 2, pill.top + pill.height / 2);
        return { headPt, hawkOverHead: headPt ? rank(A, "bw-hs") >= 0 && rank(A, "bw-hs") < rank(A, "bw-gh0") : null, A: A.slice(0, 6),
          linePt, lineOverHawk: linePt ? rank(B, "bw-fline") >= 0 && (rank(B, "bw-hs") < 0 || rank(B, "bw-fline") < rank(B, "bw-hs")) : null, B: B.slice(0, 6),
          pillOverHawk: rank(C, "bw-flab") === 0, C: C.slice(0, 4), hawkOpacity: Number(getComputedStyle(document.querySelector(".bw-hs")!).opacity) };
      });
      L.check("BW-5", "a heading under the hawk's shadow (population)", layers.headPt != null, JSON.stringify(layers));
      L.check("BW-5", "the hawk's shadow paints above a group heading", layers.hawkOverHead === true, JSON.stringify(layers.A));
      L.check("BW-5", "the line paints above the hawk", layers.lineOverHawk === true, JSON.stringify(layers.B));
      L.check("BW-5", "the line's pill paints above everything at its point", layers.pillOverHawk, JSON.stringify(layers.C));
      L.check("BW-5", "the hawk shows at .10 over the overview", Math.abs(layers.hawkOpacity - 0.1) < 0.005, String(layers.hawkOpacity));
      /* + / − above the line: the line panned under the zoom buttons */
      await page.addStyleTag({ content: ".bw-hsw, .bw-hs, .bw-gh0, .bw-fline, .bw-ruler { pointer-events: none !important; }" });
      await zoomRows(page, 100);
      await page.addStyleTag({ content: ".bw-hsw, .bw-hs, .bw-gh0, .bw-fline, .bw-ruler { pointer-events: auto !important; }" });
      const zc = (await box(page, '[data-bw="zoom"]'))[0];
      /* the line is drawn only 44px clear of the edges (ref), so it passes under the buttons' left part */
      await lineTo(page, (zc.l + 8) / PHONE.width);
      await page.addStyleTag({ content: ".bw-hsw, .bw-hs, .bw-gh0, .bw-fline, .bw-ruler { pointer-events: auto !important; }" });
      const over = await page.evaluate(() => {
        const z = document.querySelector<HTMLElement>('[data-bw="zin"]')!.getBoundingClientRect();
        const line = document.querySelector<HTMLElement>(".bw-fline")?.getBoundingClientRect();
        const R = document.querySelector<HTMLElement>('[data-bw="world"]')!.dataset;
        if (!line || line.left > z.right || line.right < z.left || line.bottom < z.top) return { ok: null as boolean | null, why: `the line is not under the buttons: line ${JSON.stringify(line && [line.left, line.top, line.bottom])} buttons ${JSON.stringify([z.left, z.right, z.top])} z ${R.z} sx ${R.sx} ox ${R.ox}` };
        const list = document.elementsFromPoint(line.left + line.width / 2, z.top + z.height / 2).map((e) => (e as HTMLElement).className?.toString?.() || e.tagName);
        const zi = list.findIndex((c) => /bw-zc/.test(c) || c === "BUTTON"), li = list.findIndex((c) => /bw-fline/.test(c));
        return { ok: zi >= 0 && li >= 0 && zi < li, why: JSON.stringify(list.slice(0, 6)) };
      });
      L.check("BW-5", "the + / − buttons paint above the line", over.ok === true, over.why);
      await page.addStyleTag({ content: ".bw-hsw, .bw-hs, .bw-gh0, .bw-fline, .bw-ruler { pointer-events: none !important; }" });
      await fitted(page);
    }

    /* ── BW-2 · the levels, and BW-9 · the copy at each ── */
    const seen: Record<number, { name: number; fig: number; sub: number; words: number; chips: number; level: string; rp: number }> = {};
    /* zoom about a query with three or more stages, so the Timeline level has one on screen */
    await fitted(page);
    const three = await page.evaluate(() => {
      const n = new Map<string, number>();
      for (const b of document.querySelectorAll<HTMLElement>('[data-bw="bar"][data-k="stage"]')) n.set(b.dataset.row!, (n.get(b.dataset.row!) ?? 0) + 1);
      const id = [...n].find(([, k]) => k >= 3)?.[0];
      const r = id ? document.querySelector<HTMLElement>(`[data-bw="row"][data-id="${CSS.escape(id)}"]`)?.getBoundingClientRect() : null;
      return r ? r.top + r.height / 2 : 420;
    });
    for (const rp of [30, 56, 84, 100]) {
      await fitted(page);
      await zoomRows(page, rp, PHONE.width * 0.6, three);
      await lineTo(page, 0.74);
      const r = await root(page);
      const p = await page.evaluate(() => {
        /* drawn AND shown: a part hidden by a rule is not a part the reader sees */
        const n = (s: string) => [...document.querySelectorAll<HTMLElement>(`[data-bw="layer"] ${s}`)].filter((e) => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== "hidden").length;
        return { name: n('[data-bw="name"]'), fig: n('[data-bw="fig"]'), sub: n('[data-bw="sub"]'), words: n(".bw-bar.tx b") + n(".bw-bar.tx small"), chips: n('[class*="chip"]') + n('[class*="pill"]') };
      });
      seen[rp] = { ...p, level: r.level, rp: r.rp };
      const want = { 30: [1, 0, 0, 0], 56: [1, 1, 0, 0], 84: [1, 1, 1, 0], 100: [1, 1, 1, 1] }[rp]!;
      const got = [p.name > 0, p.fig > 0, p.sub > 0, p.words > 0].map(Number);
      L.check("BW-2", `rows at ${rp}px (${r.rp.toFixed(1)} on screen, ${r.level}): name · figure · sub line · in-bar words = ${want.join("")}`, Math.abs(r.rp - rp) < 1.5 && got.join("") === want.join(""), `${got.join("")} ${JSON.stringify(p)}`);
      L.check("BW-2", `rows at ${rp}px: no stage chip or pill`, p.chips === 0, String(p.chips));
      const words = await page.evaluate(() => document.querySelector<HTMLElement>('[data-bw="world"]')!.innerText);
      L.check("BW-9", `rows at ${rp}px: never "overdue" or "late"`, !/overdue|\blate\b/i.test(words), (/.{0,30}(overdue|\blate\b).{0,30}/i.exec(words) ?? [""])[0]);
      if (mut === "copy" && rp === 56) await page.evaluate(() => { const g = document.querySelector('[data-bw="group"]'); if (g) g.textContent = "Overdue"; });
      if (mut === "copy" && rp === 56) { const w2 = await page.evaluate(() => document.querySelector<HTMLElement>('[data-bw="world"]')!.innerText); L.check("BW-9", "rows at 56px, re-read", !/overdue|\blate\b/i.test(w2), "Overdue"); }

      if (rp === 100) {
        /* bring the three-stage row's first stage to the left edge */
        const first = await page.evaluate((yy) => {
          const row = [...document.querySelectorAll<HTMLElement>('[data-bw="row"]')].find((e) => { const b = e.getBoundingClientRect(); return b.top <= yy && b.bottom > yy; });
          const bars = row ? [...document.querySelectorAll<HTMLElement>(`[data-bw="bar"][data-row="${CSS.escape(row.dataset.id!)}"]`)] : [];
          return bars.length ? Math.min(...bars.map((b) => b.getBoundingClientRect().left)) : null;
        }, three);
        const ox0 = (await root(page)).ox;
        if (first != null) await pan(page, 20 - first, 0);
        console.log(`[bw] three-stage row: first bar at ${first}, ox ${ox0} → ${(await root(page)).ox}`);
        /* ── BW-3 · the Timeline ── */
        const tl = await page.evaluate(() => {
          const R = document.querySelector<HTMLElement>('[data-bw="world"]')!.dataset;
          const ox = +R.ox!, sx = +R.sx!, d0 = +R.d0!, ppd = +R.ppd!;
          const bars = [...document.querySelectorAll<HTMLElement>('[data-bw="bar"][data-k="stage"]')];
          const by = new Map<string, HTMLElement[]>();
          for (const b of bars) by.set(b.dataset.row!, [...(by.get(b.dataset.row!) ?? []), b]);
          const rows = [...document.querySelectorAll<HTMLElement>('[data-bw="row"]')];
          const out: { row: string; st: string; x: number; want: number; bg: string; vis: number; b: number; s: number; text: string }[] = [];
          for (const [id, list] of by) {
            if (list.length < 3) continue;
            const off = +(rows.find((r) => r.dataset.id === id)?.dataset.off ?? 0);
            for (const b of list) {
              const bb = b.getBoundingClientRect();
              const ml = parseFloat(getComputedStyle(b).marginLeft) || 0;
              const want = ox + (Math.max(d0, +b.dataset.day! - off) - d0) * ppd * sx;
              const l = Math.max(bb.left, 0), r = Math.min(bb.right - 0, innerWidth - 8);
              out.push({ row: id, st: b.dataset.st!, x: bb.left, want: want + 0 * ml, bg: getComputedStyle(b).backgroundColor, vis: r - l, b: b.querySelectorAll("b").length, s: b.querySelectorAll("small").length, text: b.textContent ?? "" });
            }
          }
          return out;
        });
        const hex = (h: string) => `rgb(${[1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).join(", ")})`;
        const onScreen = tl.filter((b) => b.x > 0 && b.x < PHONE.width);
        L.check("BW-3", `a query with three or more stages on screen (population ${new Set(onScreen.map((b) => b.row)).size} rows, ${onScreen.length} bars)`, onScreen.length >= 3, "");
        const off = onScreen.filter((b) => Math.abs(b.x - b.want) > 2);
        L.check("BW-3", "each stage bar's left edge is within 2px of its date's x", off.length === 0, JSON.stringify(off.slice(0, 4)));
        const badBg = onScreen.filter((b) => b.bg !== hex(statusBand(b.st)));
        L.check("BW-3", "each stage bar is its stage's colour", badBg.length === 0, JSON.stringify(badBg.slice(0, 4).map((b) => [b.st, b.bg, hex(statusBand(b.st))])));
        /* the words follow stageTx at the bar's visible width (edge-stuck words included) */
        const wordsOff = onScreen.filter((b) => { const name = shortName(b.st); const dateM = /\d+ \w{3}/.exec(b.text)?.[0] ?? "1 Jan"; const w = stageTx(name, dateM, b.vis - 20); const w2 = stageTx(name, dateM, b.vis + 20); const got = b.b && b.s ? "both" : b.b ? "name" : b.s ? "date" : "none"; return got !== w && got !== w2 && Math.abs(b.vis) > 0; });
        L.check("BW-3", "each stage's words drop as its room runs out (stageTx)", wordsOff.length === 0, JSON.stringify(wordsOff.slice(0, 3)));
        const dateOnly = onScreen.filter((b) => !b.b && b.s);
        L.check("BW-3", `a short stage shows its date without its name (population ${dateOnly.length})`, dateOnly.every((b) => /^\s*\d+ \w{3}\s*$/.test(b.text)), JSON.stringify(dateOnly.slice(0, 3)));
        writeFileSync(`${DIR}/ledger/${mut ? `mut-${mut}-` : ""}timeline.json`, JSON.stringify(tl, null, 1));
      }
    }

    /* ── BW-4 · spacing, fully zoomed ── */
    {
      await fitted(page);
      for (let i = 0; i < 12; i++) { const zin = page.locator('[data-bw="zin"]'); if (await zin.isDisabled()) break; await zin.click(); await frame(page, 420); }
      await pan(page, 0, 5000);
      const r = await root(page);
      const rows = await box(page, '[data-bw="row"]');
      const tall = rows.filter((x) => x.h > 100.5);
      L.check("BW-4", `fully zoomed (z ${r.z.toFixed(2)}): no row is taller than 100px`, rows.length > 0 && tall.length === 0, JSON.stringify(tall.slice(0, 3).map((x) => x.h)));
      L.check("BW-4", "fully zoomed: group gaps are at most 44px", Number((await page.evaluate(() => document.querySelector<HTMLElement>('[data-bw="world"]')!.dataset.gap))) <= 44.01, "");
      const heads = await box(page, '[data-bw="group"]');
      const first = heads.sort((a, b) => a.t - b.t)[0];
      L.check("BW-4", "the first group heading sits within 16px below the ruler", !!first && first.t - r.top >= -0.5 && first.t - r.top <= 16, `${first?.t} vs ruler ${r.top}`);
      L.check("BW-4", "zoomed in, the header folds to 96px", (await box(page, '[data-bw="head"]'))[0]?.h === 96, String((await box(page, '[data-bw="head"]'))[0]?.h));
    }

    /* ── BW-6 · the line off screen ── */
    {
      await fitted(page);
      await zoomRows(page, 60);
      let reached = 0;
      for (const [dir, want] of [[1, "← Reply due"], [-1, "Reply due →"]] as const) {
        await pan(page, dir * -4000, 0);
        const pill = (await box(page, '[data-bw="pill"]'))[0];
        /* the world stops 16px past its ends (clamp), so at some zooms one side cannot take the line off screen */
        if (pill.d.off === "0") { L.check("BW-6", `"${want}": the line cannot leave by this side at this zoom (recorded)`, true, `pill at ${pill.l}`); await fitted(page); await zoomRows(page, 60); continue; }
        reached++;
        const look = await page.evaluate(() => { const p = document.querySelector<HTMLElement>('[data-bw="pill"]')!; const cs = getComputedStyle(p); return { bg: cs.backgroundColor, border: `${cs.borderTopWidth} ${cs.borderTopStyle} ${cs.borderTopColor}` }; });
        const edge = want.startsWith("←") ? Math.abs(pill.l - 12) <= 1 : Math.abs(PHONE.width - 12 - pill.r) <= 1;
        L.check("BW-6", `panned past the line: the pill reads "${want}" at the edge`, pill.text.trim() === want && edge, `${pill.text} l ${pill.l} r ${pill.r}`);
        L.check("BW-6", `"${want}" is outlined (white, a navy ring)`, look.bg === "rgb(255, 255, 255)" && /^1(\.5)?px solid rgb\(42, 58, 82\)$/.test(look.border), JSON.stringify(look));
        await page.locator('[data-bw="pill"]').click();
        await frame(page, 700);
        const line = (await box(page, '[data-bw="line"]'))[0];
        L.check("BW-6", `a tap on "${want}" glides the line back on screen (62% across)`, !!line && Math.abs(line.l + 1 - PHONE.width * 0.62) <= 8, JSON.stringify(line && line.l));
        L.check("BW-6", "a tap on the pill opens no row", !(await page.locator(".pa4-layer [role='dialog'], [data-pa4='qsheet'], [data-pa4='qpage']").count()), "");
      }
      L.check("BW-6", `the line was taken off screen (population ${reached} sides)`, reached >= 1, "");
    }

    /* ── BW-7 · anchoring: Ctrl+wheel and a pinch keep the row under the pointer within 4px ── */
    {
      const under = async (y: number) => page.evaluate((yy) => { const r = [...document.querySelectorAll<HTMLElement>('[data-bw="row"]')].find((e) => { const b = e.getBoundingClientRect(); return b.top <= yy && b.bottom > yy; }); if (!r) return null; const b = r.getBoundingClientRect(); return { id: r.dataset.id!, t: b.top, h: b.height }; }, y);
      const rowAt = async (id: string) => page.evaluate((i) => { const r = document.querySelector<HTMLElement>(`[data-bw="row"][data-id="${CSS.escape(i)}"]`); if (!r) return null; const b = r.getBoundingClientRect(); return { t: b.top, h: b.height }; }, id);
      await fitted(page);
      const y = 430, x = 200;
      const a = await under(y);
      if (mut === "anchor") await page.addStyleTag({ content: ".bw-w { transform: translateY(14px) !important; }" });
      await page.mouse.move(x, y); await page.keyboard.down("Control"); await page.mouse.wheel(0, -90); await page.keyboard.up("Control"); await frame(page);
      const b2 = a ? await rowAt(a.id) : null;
      const drift = a && b2 ? Math.abs(b2.t + ((y - a.t) / a.h) * b2.h - y) : NaN;
      L.check("BW-7", "Ctrl+wheel: the row under the pointer stays under it (within 4px)", drift <= 4, `${a?.id} drift ${drift.toFixed?.(2)}`);
      /* a pinch, by CDP touch */
      const cdp: CDPSession = await page.context().newCDPSession(page);
      const c = await under(y);
      const tp = (d: number) => [{ x: x - d, y, id: 1 }, { x: x + d, y, id: 2 }];
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: tp(30) });
      for (let i = 1; i <= 10; i++) { await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: tp(30 + i * 6) }); await page.waitForTimeout(16); }
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await frame(page);
      const d2 = c ? await rowAt(c.id) : null;
      const pdrift = c && d2 ? Math.abs(d2.t + ((y - c.t) / c.h) * d2.h - y) : NaN;
      L.check("BW-7", "a pinch: the row under the fingers stays under them (within 4px)", pdrift <= 4, `${c?.id} drift ${pdrift.toFixed?.(2)}`);
      if (mut === "anchor") await page.addStyleTag({ content: ".bw-w { transform: none !important; }" });
      await fitted(page);
    }

    /* ── BW-8 · reduced motion: no drift, no glide, no replay (and the control: with motion, all three) ── */
    {
      const motionRead = async () => {
        const drift = await page.evaluate(() => getComputedStyle(document.querySelector(".bw-hsw")!).animationName);
        await fitted(page); await zoomRows(page, 56);
        const r0 = await root(page);
        await page.mouse.move(150, 450); await page.mouse.down(); for (let i = 1; i <= 6; i++) { await page.mouse.move(150 + i * 25, 450 + i * 10); await page.waitForTimeout(8); } await page.mouse.up();
        const r1 = await root(page); await page.waitForTimeout(600); const r2 = await root(page);
        await fitted(page);
        await page.locator('[data-bw="replay"]').click(); await page.waitForTimeout(250);
        const during = (await root(page)).replay;
        await page.waitForTimeout(2200);
        return { drift, glide: Math.hypot(r2.ox - r1.ox, r2.oy - r1.oy), moved: Math.hypot(r1.ox - r0.ox, r1.oy - r0.oy), replay: during };
      };
      const lively = await motionRead();
      L.check("BW-8", "with motion (the control): the hawk drifts, a drag glides on, replay runs", lively.drift === "bw-hsdrift" && lively.glide > 2 && lively.replay === "running", JSON.stringify(lively));
      await page.emulateMedia({ reducedMotion: "reduce" });
      await openWorld(page);
      await mutate(page, mut === "calm" ? "calm" : "");
      const calm = await motionRead();
      L.check("BW-8", "reduced motion: the hawk does not drift", calm.drift === "none", calm.drift);
      L.check("BW-8", "reduced motion: a drag stops where it is let go", calm.moved > 20 && calm.glide < 0.5, JSON.stringify(calm));
      L.check("BW-8", "reduced motion: replay never runs", calm.replay !== "running", calm.replay);
      await page.emulateMedia({ reducedMotion: "no-preference" });
    }

    /* ── BW-10 · landscape (740 × 360; 844 × 390 is the desktop) ── */
    {
      await openWorld(page, WORLD, LAND);
      await mutate(page, mut === "land" ? "land" : "");
      const r = await root(page);
      const head = (await box(page, '[data-bw="head"]'))[0];
      const dock = await page.evaluate(() => { const d = document.querySelector<HTMLElement>('[data-pa5="dock"]'); return d ? getComputedStyle(d).display : "absent"; });
      const rows = await box(page, '[data-bw="row"]');
      L.check("BW-10", "740x360: the same world, the header folded (96px)", !!head && head.h === 96 && r.n > 0, JSON.stringify({ h: head?.h, n: r.n }));
      L.check("BW-10", "740x360: no dock", dock === "none" || dock === "absent", dock);
      L.check("BW-10", "740x360: every row on screen, fitted", rows.length === r.n && rows.every((x) => x.b <= LAND.height + 0.5), `${rows.length}/${r.n}`);
      const wide = await page.evaluate(() => matchMedia("(max-width: 767.98px)").matches);
      await page.setViewportSize({ width: 844, height: 390 });
      const desk = await page.evaluate(() => matchMedia("(max-width: 767.98px)").matches);
      L.check("BW-10", "844x390 is above the breakpoint (the desktop layout): the false premise, recorded", wide && !desk, JSON.stringify({ at740: wide, at844: desk }));
      await page.setViewportSize(PHONE);
    }
    L.done();
  });
}

/* ══ the shots: the build's 01–13 beside the ref's ══ */
test("Phone Birds-eye world v1 — the shots beside the ref's", async ({ page }, info) => {
  test.skip(info.project.name !== "pixel" || !process.env.BW_SHOTS, "BW_SHOTS=1, Chromium phone");
  test.setTimeout(600_000);
  const out = `${DIR}/shots`;
  mkdirSync(out, { recursive: true });
  await openRoute(page, "/dashboard", { width: 1440, height: 900 }); /* the harness's shell check is the desktop's (as PA5's signIn) */
  await page.evaluate(() => { try { localStorage.removeItem("bw1.hint.seen"); } catch { /* */ } });
  const shot = (n: string) => page.screenshot({ path: `${out}/${n}-build.png` });
  await openWorld(page);
  await shot("01-overview-hint");
  await pan(page, 0, 0);
  await page.waitForTimeout(600);
  await shot("02-overview");
  for (const [n, rp] of [["03-names", 30], ["04-figures", 56], ["05-dates", 84], ["06-timeline", 100]] as const) { await fitted(page); await zoomRows(page, rp); await lineTo(page, 0.74); await page.waitForTimeout(400); await shot(n); }
  await pan(page, -120, -260); await shot("07-timeline-scrolled");
  await pan(page, 3000, 0); await shot("08-line-off-screen");
  await fitted(page);
  await page.locator('[data-bw="chip"][data-k="past"]').click(); await page.waitForTimeout(700); await shot("09-filter-past");
  await zoomRows(page, 56); await lineTo(page, 0.74); await shot("10-filter-zoomed-chip");
  await page.locator('[data-bw="fon"]').click(); await page.waitForTimeout(600);
  await fitted(page);
  const row = (await box(page, '[data-bw="row"]'))[3];
  if (row) { await page.mouse.click(200, row.t + row.h / 2); await page.waitForTimeout(1400); await shot("11-row-sheet"); await page.keyboard.press("Escape"); await page.waitForTimeout(600); }
  await openWorld(page, `${WORLD}&be=calendar`);
  await shot("12-calendar-overview");
  await zoomRows(page, 100); await lineTo(page, 0.6); await page.waitForTimeout(400); await shot("13-calendar-timeline");
  const names = ["01-overview-hint", "02-overview", "03-names", "04-figures", "05-dates", "06-timeline", "07-timeline-scrolled", "08-line-off-screen", "09-filter-past", "10-filter-zoomed-chip", "11-row-sheet", "12-calendar-overview", "13-calendar-timeline"];
  for (const n of names) copyFileSync(`design-refs/phone-birds-eye-world-v1/shots/${n}.png`, `${out}/${n}-ref.png`);
  writeFileSync(`${out}/index.html`, `<!doctype html><meta charset="utf-8"><title>Birds-eye world v1 — build beside ref</title><style>body{font:14px system-ui;background:#f2eee8;margin:24px}figure{display:inline-block;margin:0 24px 32px 0;vertical-align:top}img{width:390px;border-radius:24px;box-shadow:0 4px 16px #0002}h2{margin:24px 0 8px}</style>${names.map((n) => `<h2>${n}</h2><figure><img src="${n}-build.png"><figcaption>build</figcaption></figure><figure><img src="${n}-ref.png"><figcaption>ref</figcaption></figure>`).join("")}`);
});
