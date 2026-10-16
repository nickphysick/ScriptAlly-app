/**
 * Analytics v21 — the AN21 locks (design-refs/analytics-v21/analytics-v21.html), measured on the RENDERED page at
 * 1512 × 900 and 1280 × 800 with the shell (and the widths each lock names), phone at 390.
 *
 * ⚠️ A FIGURE IS COMPARED WITH THE MODEL, NOT WITH A LITERAL. The page publishes `window.__SA_AN21` in dev builds
 *    only (gated at the call site); a lock reads what the page DRAWS and what the model SAYS and requires them
 *    equal, so a hard-coded or second-derived figure goes red. The derivations themselves are unit-locked
 *    (src/lib/analyticsV21.test.ts).
 * ⚠️ THE FIXTURE: the harness account's "The Smoke Test" (`seed-ms-1`, 51 queries, an offer, replies inside and
 *    after their window). I1 seeds and removes its own empty manuscript (tests/e2e/seedAn21.mjs).
 * ⚠️ PIXELS ARE READ IN THE PAGE: the screenshot is decoded on a canvas there (this repo has no PNG decoder in
 *    node), at device scale 1.
 * ⚠️ `AN21_MUTATE` is not read here: each lock's named mutation is a SOURCE patch applied, built and reverted by
 *    hand in the measurement worktree (reports/analytics-v21/MUTATIONS.md).
 */
import { test, expect, type Page } from "@playwright/test";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { openAn, near, STATE_RGB, FILLS } from "./an17Lib";

const DIR = "reports/analytics-v21";
const MS = "seed-ms-1";
const VP = (w: number) => (w <= 760 ? { width: w, height: 844 } : w === 1280 ? { width: 1280, height: 800 } : { width: w, height: 900 });
const TINT = "rgb(233, 230, 224)";
const STAND_RGB: Record<string, string> = { waiting: STATE_RGB.queried, reading: STATE_RGB.sent, offer: STATE_RGB.offer, ended: STATE_RGB.closed };
const RUSTS = ["rgb(180, 85, 63)", "rgb(160, 99, 63)", "rgb(138, 74, 60)", "#b4553f", "#a0633f", "#8a4a3c"];

type Row = { lock: string; where: string; ok: boolean; detail: string };
class Ledger {
  rows: Row[] = [];
  constructor(public name: string) {}
  check(lock: string, where: string, ok: boolean, detail: string) { this.rows.push({ lock, where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${this.name}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 40)) console.log(`  ✗ ${r.lock} · ${r.where} — ${r.detail}`);
    console.log(`LEDGER ${this.name}: ${this.rows.length} readings, ${this.rows.filter((r) => !r.ok).length} failed`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.lock} · ${r.where} — ${r.detail}`)).toEqual([]);
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
async function open(page: Page, w: number, ms = MS) {
  await page.addInitScript((id) => { try { localStorage.setItem("scriptally_active_manuscript_id", id); } catch { /* */ } }, ms);
  await openAn(page, VP(w));
  await page.waitForFunction(() => !!(window as any).__SA_AN21, null, { timeout: 15_000 }).catch(() => {});
}
const model = (page: Page) => page.evaluate(() => (window as any).__SA_AN21 ?? null);
/** Scroll the page's scroller so a section's top sits `off` px below the scroller's top. */
async function toSec(page: Page, sec: number, off = 40) {
  await page.evaluate(({ sec, off }) => {
    const p = [...document.querySelectorAll<HTMLElement>('[data-a17="page"]')].find((e) => e.getBoundingClientRect().height > 0)!;
    const sc = p.closest(".wpg-scroll") as HTMLElement;
    const t = p.querySelector<HTMLElement>(`[data-a17="sec"][data-sec="${sec}"]`);
    if (t) sc.scrollTop = t.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop - off;
  }, { sec, off });
  await page.waitForTimeout(250);
}
/** RGB at viewport points, decoded from a screenshot on a canvas in the page. */
async function pixels(page: Page, pts: { x: number; y: number }[]): Promise<number[][]> {
  const b64 = (await page.screenshot()).toString("base64");
  return page.evaluate(async ({ b64, pts }) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.width; c.height = img.height;
    const g = c.getContext("2d")!;
    g.drawImage(img, 0, 0);
    const k = img.width / window.innerWidth;
    return pts.map((p) => Array.from(g.getImageData(Math.round(p.x * k), Math.round(p.y * k), 1, 1).data.slice(0, 3)));
  }, { b64, pts });
}
const rgbStr = (a: number[]) => `rgb(${a[0]}, ${a[1]}, ${a[2]})`;
const close = (a: number[], b: number[], t = 3) => a.every((v, i) => Math.abs(v - b[i]) <= t);
const parse = (s: string) => (s.match(/\d+(\.\d+)?/g) ?? []).slice(0, 3).map(Number);
async function overflow(page: Page) {
  return page.evaluate(() => {
    const vis = (sel: string) => [...document.querySelectorAll<HTMLElement>(sel)].find((e) => e.getBoundingClientRect().width > 0) ?? null;
    const d = document.documentElement, sc = vis(".wpg-scroll"), app = vis(".ws-app");
    return {
      doc: [d.scrollWidth, d.clientWidth],
      sc: sc ? [sc.scrollWidth, sc.clientWidth] : null,
      app: app ? [app.scrollWidth, app.clientWidth] : null,
    };
  });
}

/* ════════════ A1 · header ════════════ */
test("AN21-A1 · header", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("an21-a1");
  for (const w of [1920, 1512, 1280, 1180]) {
    await open(page, w);
    const m = await model(page);
    const r = await page.evaluate(() => {
      const h = [...document.querySelectorAll<HTMLElement>('[data-a21="header"]')].find((e) => e.getBoundingClientRect().height > 0);
      if (!h) return null;
      const h1 = h.querySelector<HTMLElement>("h1")!;
      const cs = getComputedStyle(h1);
      const card = h.querySelector<HTMLElement>('[data-a21="card"]')!.getBoundingClientRect();
      const hb = h.getBoundingClientRect();
      const imgs = [...h.querySelectorAll("img")].map((i) => i.getAttribute("data-a21"));
      const bgImgs = [...h.querySelectorAll<HTMLElement>("*")].filter((e) => getComputedStyle(e).backgroundImage !== "none").length;
      return { text: h1.innerText.replace(/\s+/g, " ").trim(), fs: parseFloat(cs.fontSize), ff: cs.fontFamily, hh: h1.getBoundingClientRect().height, lh: parseFloat(cs.lineHeight), cardR: card.right, hR: hb.right, imgs, bgImgs, panel: !!document.querySelector('[data-a17="page"] [data-hpanel]') };
    });
    const ww = `${w}`;
    L.check("A1 the light header renders", ww, !!r, `${!!r}`);
    if (!r || !m) continue;
    const want = `${m.sent} ${m.sent === 1 ? "query" : "queries"}, ${m.replies === 0 ? "no" : m.replies} ${m.replies === 1 ? "reply" : "replies"}`;
    L.check("A1 no image in the header but the shadow", ww, r.imgs.length === 1 && r.imgs[0] === "shadow" && r.bgImgs === 0, `${JSON.stringify(r.imgs)} bg ${r.bgImgs}`);
    L.check("A1 no panel header on the page", ww, !r.panel, `${r.panel}`);
    L.check("A1 the title is {sent} queries, {replies} replies", ww, r.text === want, `"${r.text}" vs "${want}"`);
    L.check("A1 Special Elite", ww, /Special Elite/i.test(r.ff), r.ff);
    const size = w > 1680 ? 56 : w > 1360 ? 50 : 40;
    L.check(`A1 ${size}px (±1)`, ww, near(r.fs, size, 1), `${r.fs}`);
    L.check("A1 one line", ww, r.hh <= r.lh * 1.3, `${r.hh.toFixed(1)} / lh ${r.lh}`);
    L.check("A1 the card's right edge is inside the header's", ww, r.cardR <= r.hR + 0.5, `${r.cardR.toFixed(1)} ≤ ${r.hR.toFixed(1)}`);
  }
  L.done(30);
});

/* ════════════ A2 · the card ════════════ */
test("AN21-A2 · card", async ({ page }) => {
  const L = new Ledger("an21-a2");
  for (const w of [1512, 1280]) {
    await open(page, w);
    const m = await model(page);
    const r = await page.evaluate(() => {
      const c = [...document.querySelectorAll<HTMLElement>('[data-a21="card"]')].find((e) => e.getBoundingClientRect().height > 0);
      if (!c) return null;
      return {
        rows: [...c.querySelectorAll<HTMLElement>('[data-a21="card-row"]')].map((li) => ({
          k: li.dataset.k, n: Number(li.querySelector('[data-a21="card-n"]')!.textContent), label: li.querySelector('[data-a21="card-label"]')!.textContent,
          sw: getComputedStyle(li.querySelector('[data-a21="card-sw"]')!).backgroundColor,
        })),
        segs: [...c.querySelectorAll<HTMLElement>('[data-a21="card-seg"]')].map((s) => ({ k: s.dataset.k, w: s.getBoundingClientRect().width, bg: getComputedStyle(s).backgroundColor })),
        gap: parseFloat(getComputedStyle(c.querySelector('[data-a21="card-bar"]')!).columnGap) || 0,
      };
    });
    const ww = `${w}`;
    L.check("A2 the card renders", ww, !!r && !!m, `${!!r}`);
    if (!r || !m) continue;
    const st = (m.v21.standing as { key: string; count: number; label: string }[]).filter((s) => s.count > 0);
    L.check("A2 the rows are standing's non-zero buckets, in order", ww, JSON.stringify(r.rows.map((x) => [x.k, x.n, x.label])) === JSON.stringify(st.map((s) => [s.key, s.count, s.label])), `${JSON.stringify(r.rows.map((x) => [x.k, x.n]))} vs ${JSON.stringify(st.map((s) => [s.key, s.count]))}`);
    L.check("A2 the rows sum to the queries sent", ww, r.rows.reduce((a, x) => a + x.n, 0) === m.sent, `${r.rows.reduce((a, x) => a + x.n, 0)} vs ${m.sent}`);
    for (const x of r.rows) L.check(`A2 ${x.k}'s swatch is its status fill`, ww, x.sw === STAND_RGB[x.k as string], `${x.sw}`);
    for (const s of r.segs) L.check(`A2 ${s.k}'s segment is its status fill`, ww, s.bg === STAND_RGB[s.k as string], `${s.bg}`);
    const total = r.segs.reduce((a, s) => a + s.w, 0);
    const sum = st.reduce((a, s) => a + s.count, 0);
    for (const s of r.segs) {
      const n = st.find((x) => x.key === s.k)?.count ?? 0;
      L.check(`A2 ${s.k}'s segment is in proportion (±2px)`, ww, near(s.w, (total * n) / sum, 2), `${s.w.toFixed(1)} vs ${((total * n) / sum).toFixed(1)}`);
    }
  }
  L.done(14);
});

/* ════════════ A3 · the ring ════════════ */
test("AN21-A3 · ring", async ({ page }) => {
  const L = new Ledger("an21-a3");
  for (const w of [1512, 1280]) {
    await open(page, w);
    const m = await model(page);
    const r = await page.evaluate(() => {
      const c = [...document.querySelectorAll<HTMLElement>('[data-a21="card"]')].find((e) => e.getBoundingClientRect().height > 0);
      if (!c) return null;
      const arc = c.querySelector<SVGCircleElement>('[data-a21="ring-arc"]');
      const circles = [...c.querySelectorAll<SVGCircleElement>('[data-a21="ring"] circle')].map((x) => [x.getAttribute("stroke"), getComputedStyle(x).stroke]);
      const b = c.querySelector<HTMLElement>('[data-a21="ring-pct"]')!;
      /* the TEXT's line boxes, not the element's: it is absolutely placed over the whole ring */
      const rg = document.createRange();
      rg.selectNodeContents(b);
      const tops = [...new Set([...rg.getClientRects()].filter((x) => x.width > 0).map((x) => Math.round(x.bottom)))];
      return { dash: arc ? parseFloat(arc.getAttribute("stroke-dasharray") ?? "0") : null, r: arc ? Number(arc.getAttribute("r")) : 34, circles,
        bh: rg.getBoundingClientRect().height, fs: parseFloat(getComputedStyle(b).fontSize), pct: b.textContent,
        sameLine: tops.length > 0 && Math.max(...tops) - Math.min(...tops) < parseFloat(getComputedStyle(b).fontSize) * 0.8 };
    });
    const ww = `${w}`;
    L.check("A3 the ring renders", ww, !!r && !!m, `${!!r}`);
    if (!r || !m) continue;
    const ins = m.v21.inside as { pct: number | null; share: number };
    if (ins.pct === null) L.check("A3 no arc with no dated reply", ww, r.dash === null && r.pct === "–", `${r.dash} ${r.pct}`);
    else {
      const want = ins.share * 2 * Math.PI * r.r;
      L.check("A3 the arc is in proportion to insideShare (±1%)", ww, r.dash !== null && Math.abs(r.dash - want) <= 2 * Math.PI * r.r * 0.01, `${r.dash} vs ${want.toFixed(2)}`);
      L.check("A3 the figure is the share", ww, r.pct === `${ins.pct}%`, `${r.pct}`);
    }
    L.check("A3 no rust stroke in the ring", ww, r.circles.every(([a, cs]) => !RUSTS.includes(String(a)) && !RUSTS.includes(String(cs))), JSON.stringify(r.circles));
    L.check("A3 the figure and % share one line", ww, r.bh <= r.fs * 1.5 && r.sameLine, `${r.bh.toFixed(1)} / ${r.fs}`);
    await page.locator('[data-a21="ring-panel"]:visible').first().click();
    await page.waitForTimeout(1200);
    const at = await page.evaluate(() => {
      const p = [...document.querySelectorAll<HTMLElement>('[data-a17="page"]')].find((e) => e.getBoundingClientRect().height > 0)!;
      const sc = (p.closest(".wpg-scroll") as HTMLElement).getBoundingClientRect();
      const s = p.querySelector('[data-a17="sec"][data-sec="3"]')!.getBoundingClientRect();
      return { top: s.top - sc.top, h: sc.height };
    });
    L.check("A3 pressing it scrolls section 4 into view", ww, at.top > -60 && at.top < at.h * 0.5, `${at.top.toFixed(0)} of ${at.h.toFixed(0)}`);
  }
  L.done(10);
});

/* ════════════ B1 · the desk ════════════ */
test("AN21-B1 · desk", async ({ page }) => {
  test.setTimeout(180_000);
  const L = new Ledger("an21-b1");
  for (const w of [1920, 1512, 1280]) {
    await open(page, w);
    const m = await model(page);
    const read = () => page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-a21="desk-card"]')].filter((e) => e.getBoundingClientRect().height > 0).map((c) => ({
      k: c.dataset.key, w: c.getBoundingClientRect().width,
      fig: c.querySelector('[data-a21="desk-figure"]')?.textContent ?? null,
      unit: c.querySelector('[data-a21="desk-unit"]')?.textContent ?? null,
      stamp: c.querySelector('[data-a21="desk-stamp"]')?.textContent ?? null,
      rows: [...c.querySelectorAll<HTMLElement>('[data-a21="desk-row"]')].map((r) => r.innerText.replace(/\s+/g, " ").trim()),
    })));
    const cards = await read();
    const ww = `${w}`;
    L.check("B1 three cards", ww, cards.length === 3, `${cards.length}`);
    if (!m || cards.length !== 3) continue;
    L.check("B1 equal widths (±1)", ww, Math.max(...cards.map((c) => c.w)) - Math.min(...cards.map((c) => c.w)) <= 1, cards.map((c) => c.w.toFixed(1)).join(" "));
    for (const d of m.v21.desk as { key: string; figure: string; unit: string | null; stamp: string | null; sec: number; rows: { n: number; text: string; zero?: string }[] }[]) {
      const c = cards.find((x) => x.k === d.key);
      L.check(`B1 ${d.key}: the figure is the model's`, ww, !!c && c.fig === d.figure && c.unit === d.unit, `${c?.fig}/${c?.unit} vs ${d.figure}/${d.unit}`);
      L.check(`B1 ${d.key}: the stamp is the model's, or absent`, ww, !!c && c.stamp === d.stamp, `${c?.stamp} vs ${d.stamp}`);
      const want = d.rows.map((r) => `${r.n === 0 ? r.zero ?? "None" : r.n}${r.text}`.replace(/\s+/g, " "));
      L.check(`B1 ${d.key}: the rows are the model's`, ww, !!c && JSON.stringify(c.rows.map((x) => x.replace(/\s+/g, ""))) === JSON.stringify(want.map((x) => x.replace(/\s+/g, ""))), `${JSON.stringify(c?.rows)} vs ${JSON.stringify(want)}`);
    }
    if (w === 1512) {
      for (const d of m.v21.desk as { key: string; sec: number }[]) {
        await page.evaluate(() => { const p = [...document.querySelectorAll<HTMLElement>('[data-a17="page"]')].find((e) => e.getBoundingClientRect().height > 0)!; (p.closest(".wpg-scroll") as HTMLElement).scrollTop = 0; });
        await page.locator(`[data-a21="desk-card"][data-key="${d.key}"]:visible`).first().click();
        await page.waitForTimeout(1200);
        const top = await page.evaluate((sec) => {
          const p = [...document.querySelectorAll<HTMLElement>('[data-a17="page"]')].find((e) => e.getBoundingClientRect().height > 0)!;
          const sc = (p.closest(".wpg-scroll") as HTMLElement).getBoundingClientRect();
          return p.querySelector(`[data-a17="sec"][data-sec="${sec}"]`)!.getBoundingClientRect().top - sc.top;
        }, d.sec);
        L.check(`B1 pressing ${d.key} scrolls to section ${d.sec + 1}`, ww, top > -60 && top < 200, `${top.toFixed(0)}`);
      }
    }
  }
  L.done(30);
});

/* ════════════ C1 · tints ════════════ */
test("AN21-C1 · tints", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("an21-c1");
  for (const w of [1512, 1280, 1920]) {
    await open(page, w);
    const ww = `${w}`;
    /* the page colour: the nearest painted ancestor of the page root (the shell's ink is further out) */
    const page0 = await page.evaluate(() => {
      let e: HTMLElement | null = [...document.querySelectorAll<HTMLElement>('[data-a17="page"]')].find((x) => x.getBoundingClientRect().height > 0)!.parentElement;
      while (e && getComputedStyle(e).backgroundColor === "rgba(0, 0, 0, 0)") e = e.parentElement;
      return e ? getComputedStyle(e).backgroundColor : "none";
    });
    L.check("C1 the page colour is oat (--ws-page)", `${w}`, page0 === "rgb(242, 238, 232)", page0);
    for (let s = 0; s <= 8; s++) {
      await toSec(page, s, 20);
      const g = await page.evaluate((s) => {
        const p = [...document.querySelectorAll<HTMLElement>('[data-a17="page"]')].find((e) => e.getBoundingClientRect().height > 0)!;
        const sec = p.querySelector<HTMLElement>(`[data-a17="sec"][data-sec="${s}"]`)!;
        const win = (p.closest(".ws-window") ?? p.closest(".wpg-scroll")) as HTMLElement;
        const wr = win.getBoundingClientRect(), sr = sec.getBoundingClientRect();
        return { bg: getComputedStyle(sec).backgroundColor, y: Math.max(sr.top, wr.top) + 30, l: wr.left + 4, r: wr.right - 4, visible: sr.top < wr.bottom - 40 };
      }, s);
      const tinted = s % 2 === 1;
      L.check(`C1 section ${s + 1} is ${tinted ? "tinted" : "on the page colour"}`, ww, tinted ? g.bg === TINT : g.bg === "rgba(0, 0, 0, 0)", g.bg);
      if (g.visible) {
        const [lp, rp] = await pixels(page, [{ x: g.l, y: g.y }, { x: g.r, y: g.y }]);
        const want = tinted ? parse(TINT) : parse(page0);
        L.check(`C1 section ${s + 1} paints edge to edge`, ww, close(lp, want) && close(rp, want), `${rgbStr(lp)} ${rgbStr(rp)} vs ${tinted ? TINT : page0}`);
      }
    }
    const o = await overflow(page);
    L.check("C1 no horizontal overflow", ww, !!o.sc && o.sc[0] <= o.sc[1] && o.doc[0] <= o.doc[1], JSON.stringify(o));
  }
  L.done(50);
});

/* ════════════ D1 · replies against the stated window ════════════ */
test("AN21-D1 · window", async ({ page }) => {
  const L = new Ledger("an21-d1");
  for (const w of [1512, 1280]) {
    await open(page, w);
    await toSec(page, 3);
    const m = await model(page);
    const r = await page.evaluate(() => {
      const p = [...document.querySelectorAll<HTMLElement>('[data-a17="page"]')].find((e) => e.getBoundingClientRect().height > 0)!;
      const one = (e: Element | null) => { if (!e) return true; const cs = getComputedStyle(e); const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.4; return e.getBoundingClientRect().height <= lh * 1.25; };
      return [...p.querySelectorAll<HTMLElement>('[data-a21="rw-row"]')].map((li) => {
        const said = li.querySelector('[data-a21="rw-said"]')!.getBoundingClientRect();
        const took = li.querySelector('[data-a21="rw-took"]')!.getBoundingClientRect();
        const over = li.querySelector('[data-a21="rw-over"]')?.getBoundingClientRect() ?? null;
        return { inside: li.dataset.inside !== undefined, saidR: said.right, tookR: took.right, overL: over?.left ?? null,
          oneLine: [li.querySelector(".a21-rwwho b"), li.querySelector(".a21-rwwho small"), li.querySelector(".a21-rwlab b"), li.querySelector(".a21-rwlab span")].every(one) };
      });
    });
    const ww = `${w}`;
    L.check("D1 rows render", ww, r.length > 0, `${r.length}`);
    if (!m) continue;
    const win = m.v21.window as { inside: unknown[]; after: unknown[]; dated: number };
    L.check("D1 inside rows + after rows = dated replies", ww, r.filter((x) => x.inside).length === win.inside.length && r.filter((x) => !x.inside).length === win.after.length && r.length === win.dated, `${r.filter((x) => x.inside).length}+${r.filter((x) => !x.inside).length} vs ${win.inside.length}+${win.after.length} = ${win.dated}`);
    r.forEach((x, i) => {
      if (x.inside) L.check(`D1 row ${i}: took ends at or before said`, ww, x.tookR <= x.saidR + 1, `${x.tookR.toFixed(1)} ≤ ${x.saidR.toFixed(1)}`);
      else {
        L.check(`D1 row ${i}: took ends at said's end (±1)`, ww, near(x.tookR, x.saidR, 1), `${x.tookR.toFixed(1)} vs ${x.saidR.toFixed(1)}`);
        L.check(`D1 row ${i}: the rust bar starts there (±1)`, ww, x.overL !== null && near(x.overL, x.saidR, 1), `${x.overL} vs ${x.saidR.toFixed(1)}`);
      }
      if (w === 1280) L.check(`D1 row ${i}: labels do not wrap`, ww, x.oneLine, `${x.oneLine}`);
    });
  }
  L.done(30);
});

/* ════════════ E1 · how long each step takes ════════════ */
test("AN21-E1 · steps", async ({ page }) => {
  const L = new Ledger("an21-e1");
  for (const w of [1512, 1280]) {
    await open(page, w);
    await toSec(page, 4);
    const m = await model(page);
    const r = await page.evaluate(() => {
      const p = [...document.querySelectorAll<HTMLElement>('[data-a17="page"]')].find((e) => e.getBoundingClientRect().height > 0)!;
      const sec = p.querySelector('[data-a17="sec"][data-sec="4"]')!;
      return {
        nodes: [...sec.querySelectorAll<HTMLElement>('[data-a21="jr-node"]')].map((n) => ({ dot: !!n.querySelector("svg"), label: n.querySelector("[aria-label]")?.getAttribute("aria-label") ?? "" })),
        gaps: [...sec.querySelectorAll<HTMLElement>('[data-a21="jr-gap"]')].map((g) => {
          const bar = getComputedStyle(g.querySelector('[data-a21="jr-bar"]')!);
          return { key: g.dataset.key, n: Number(g.dataset.n), bg: bar.backgroundColor, img: bar.backgroundImage, v: g.querySelector('[data-a21="jr-v"] b')!.textContent };
        }),
        reads: sec.querySelectorAll('[data-a17="reads"]').length,
      };
    });
    const ww = `${w}`;
    L.check("E1 five StatusDot nodes", ww, r.nodes.length === 5 && r.nodes.every((n) => n.dot), JSON.stringify(r.nodes));
    L.check("E1 v17's reads are gone from the section", ww, r.reads === 0, `${r.reads}`);
    if (!m) continue;
    for (const g of r.gaps) {
      const paint = `${g.bg} ${g.img}`;
      const rust = paint.includes("rgb(180, 85, 63)"), navy = paint.includes("rgb(42, 58, 82)");
      L.check(`E1 ${g.key} is ${g.key === "a-s" ? "rust" : "navy"}`, ww, g.key === "a-s" ? rust && !navy : navy && !rust, paint);
      L.check(`E1 ${g.key} is ${g.n > 0 && g.n < 3 ? "dashed" : "solid"} (n = ${g.n})`, ww, (g.n > 0 && g.n < 3) === g.img.includes("repeating-linear-gradient"), g.img);
      const s = (m.v21.steps as { key: string; median: number | null; n: number }[]).find((x) => x.key === g.key)!;
      L.check(`E1 ${g.key}'s figure is stepGaps's median`, ww, g.v === (s.median === null ? "–" : String(s.median)) && g.n === s.n, `${g.v} vs ${s.median} (n ${g.n}/${s.n})`);
    }
  }
  L.done(26);
});

/* ════════════ F1 · firsts and records ════════════ */
test("AN21-F1 · records", async ({ page }) => {
  const L = new Ledger("an21-f1");
  for (const w of [1512, 1280]) {
    await open(page, w);
    await toSec(page, 5);
    const m = await model(page);
    const r = await page.evaluate(() => {
      const p = [...document.querySelectorAll<HTMLElement>('[data-a17="page"]')].find((e) => e.getBoundingClientRect().height > 0)!;
      const f = [...p.querySelectorAll<HTMLElement>('[data-a21="featured"]')].find((e) => e.getBoundingClientRect().height > 0);
      return {
        label: f?.dataset.label ?? null, name: f?.querySelector('[data-a21="featured-name"]')?.textContent ?? null,
        rows: [...p.querySelectorAll<HTMLElement>('[data-a21="record"]')].filter((e) => e.getBoundingClientRect().height > 0).map((e) => [e.dataset.key, e.querySelector('[data-a21="record-v"]')!.textContent]),
        longest: /longest full read/i.test(p.innerText),
      };
    });
    const ww = `${w}`;
    if (!m) { L.check("F1 the model is published", ww, false, "no __SA_AN21"); continue; }
    const rec = m.v21.records as { featured: { label: string; name: string } | null; rows: { key: string; value: string }[] };
    L.check("F1 the featured card is the first offer, else the first full request, else the first request", ww, r.label === (rec.featured?.label ?? null) && r.name === (rec.featured?.name ?? null), `${r.label}/${r.name} vs ${rec.featured?.label}/${rec.featured?.name}`);
    L.check("F1 the fixture has an offer, so the card is the first offer", ww, m.offers === 0 || r.label === "First offer", `${r.label} with ${m.offers} offers`);
    L.check("F1 no Longest full read", ww, !r.longest, `${r.longest}`);
    L.check("F1 every row's figure is the model's", ww, JSON.stringify(r.rows) === JSON.stringify(rec.rows.map((x) => [x.key, x.value])), `${JSON.stringify(r.rows)} vs ${JSON.stringify(rec.rows.map((x) => [x.key, x.value]))}`);
  }
  L.done(8);
});

/* ════════════ G1 · how things stand ════════════ */
test("AN21-G1 · workspace", async ({ page }) => {
  const L = new Ledger("an21-g1");
  for (const w of [1512, 1280]) {
    await open(page, w);
    await toSec(page, 7);
    const m = await model(page);
    const chips = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-a21="ws-chip"]')].filter((e) => e.getBoundingClientRect().height > 0).map((c) => [c.dataset.k, c.querySelector('[data-a21="ws-chip-n"]')?.textContent ?? c.textContent]));
    const ww = `${w}`;
    if (!m) { L.check("G1 the model is published", ww, false, "no __SA_AN21"); continue; }
    const st = m.v21.standing as { key: string; count: number }[];
    L.check("G1 the chip counts are standing", ww, JSON.stringify(chips.slice(1)) === JSON.stringify(st.map((s) => [s.key, String(s.count)])), `${JSON.stringify(chips)} vs ${JSON.stringify(st.map((s) => [s.key, s.count]))}`);
    L.check("G1 All is every query", ww, chips[0]?.[1] === `All ${m.sent}`, `${chips[0]?.[1]}`);
    const lanes = () => page.evaluate(() => {
      const p = [...document.querySelectorAll<HTMLElement>('[data-a17="page"]')].find((e) => e.getBoundingClientRect().height > 0)!;
      return [...p.querySelectorAll<SVGRectElement>('[data-a17="sec"][data-sec="7"] svg.a17-d [data-a17="lane"]')].map((r) => ({ cls: r.getAttribute("class") ?? "", fill: getComputedStyle(r).fill }));
    });
    const all = await lanes();
    L.check("G1 lane fills are the status fills", ww, all.length > 0 && all.every((x) => FILLS.has(x.fill)), [...new Set(all.map((x) => x.fill))].join(" "));
    await page.locator('[data-a21="ws-chip"][data-k="ended"]:visible').first().click();
    await page.waitForTimeout(300);
    const ended = await lanes();
    const n = st.find((s) => s.key === "ended")!.count;
    L.check("G1 pressing Ended leaves only ended lanes", ww, ended.length === n && ended.every((x) => x.cls.includes("a17-f-closed")), `${ended.length} of ${n}, ${[...new Set(ended.map((x) => x.cls))].join("|")}`);
    await page.locator('[data-a21="ws-chip"][data-k="all"]:visible').first().click();
    await page.waitForTimeout(300);
    L.check("G1 All brings every lane back", ww, (await lanes()).length === all.length, `${(await lanes()).length}`);
  }
  L.done(10);
});

/* ════════════ I1 · the empty page ════════════ */
test.describe("AN21-I1", () => {
  test.beforeAll(() => { execSync("node tests/e2e/seedAn21.mjs empty", { stdio: "pipe" }); });
  test.afterAll(() => { execSync("node tests/e2e/seedAn21.mjs restore", { stdio: "pipe" }); });
  test("AN21-I1 · empty", async ({ page }) => {
    test.setTimeout(240_000);
    const L = new Ledger("an21-i1");
    for (const w of [1512, 390]) {
      await open(page, w, "seed-an21-empty");
      const r = await page.evaluate(() => {
        const p = [...document.querySelectorAll<HTMLElement>('[data-a17="page"]')].find((e) => e.getBoundingClientRect().height > 0);
        if (!p) return null;
        const vis = (s: string) => [...p.querySelectorAll<HTMLElement>(s)].filter((e) => e.getBoundingClientRect().height > 0).length;
        const img = p.querySelector<HTMLImageElement>('[data-a21="empty-art"]');
        const panel = p.querySelector<HTMLElement>('[data-a21="empty-panel"]')?.getBoundingClientRect() ?? null;
        const ir = img?.getBoundingClientRect() ?? null;
        return {
          sent: p.dataset.sent, card: vis('[data-a21="card"]'), desk: vis('[data-a21="desk"]'), secs: vis('[data-a17="sec"]'), tab: document.querySelectorAll('[data-a17="tab"]').length,
          art: img?.src ?? "", artIn: !!panel && !!ir && ir.left >= panel.left - 0.5 && ir.right <= panel.right + 0.5 && ir.top >= panel.top - 0.5 && ir.bottom <= panel.bottom + 0.5,
          how: /How it works/.test(p.innerText), ways: vis('[data-a21="way"]'), example: p.querySelector('[data-a21="example-label"]')?.textContent ?? "",
        };
      });
      const ww = `${w}`;
      L.check("I1 the page renders", ww, !!r, `${!!r}`);
      if (!r) continue;
      L.check("I1 no card, desk, sections or tab", ww, r.card === 0 && r.desk === 0 && r.secs === 0 && r.tab === 0, JSON.stringify(r));
      L.check("I1 the panel with the Archivist, inside its box", ww, /analytics-archivist\.webp/.test(r.art) && r.artIn, `${r.art} ${r.artIn}`);
      L.check("I1 How it works and three ways", ww, r.how && r.ways === 3, `${r.how} ${r.ways}`);
      L.check("I1 the example is labelled as one", ww, r.example === "An example, after 27 queries", r.example);
      L.check("I1 the example is not counted", ww, r.sent === "0", `${r.sent}`);
    }
    const written = execSync("node tests/e2e/seedAn21.mjs count", { encoding: "utf8" }).trim();
    L.check("I1 the example is not written", "account", written === "0", written);
    /* the switch: a query arrives while the page is open, and the page is populated without a reload */
    await open(page, 1512, "seed-an21-empty");
    await page.evaluate(() => { (window as any).__an21NoReload = 1; });
    execSync("node tests/e2e/seedAn21.mjs addq", { stdio: "pipe" });
    const switched = await page.waitForFunction(() => [...document.querySelectorAll<HTMLElement>('[data-a21="header"]')].some((e) => e.getBoundingClientRect().height > 0), null, { timeout: 30_000 }).then(() => true).catch(() => false);
    L.check("I1 logging a query switches the page to populated", "1512", switched, `${switched}`);
    L.check("I1 … without a reload", "1512", await page.evaluate(() => (window as any).__an21NoReload === 1), "marker");
    L.done(14);
  });
});

/* ════════════ L1 · overflow ════════════ */
test("AN21-L1 · overflow", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("an21-l1");
  for (const w of [1920, 1512, 1280, 1180, 1024, 390]) {
    await open(page, w);
    for (const s of [-1, 3, 5, 7]) {
      if (s >= 0) await toSec(page, s);
      const o = await overflow(page);
      const where = `${w}${s >= 0 ? ` @${s + 1}` : ""}`;
      L.check("L1 document", where, o.doc[0] <= o.doc[1], JSON.stringify(o.doc));
      L.check("L1 sheet scroller", where, !!o.sc && o.sc[0] <= o.sc[1], JSON.stringify(o.sc));
      L.check("L1 app frame", where, !o.app || o.app[0] <= o.app[1], JSON.stringify(o.app));
    }
  }
  L.done(70);
});
