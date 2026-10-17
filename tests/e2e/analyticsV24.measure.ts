/**
 * Analytics v24 — the AN24 locks (design-refs/analytics-v24/analytics-v24.html), measured on the RENDERED page at
 * 1512 × 900 and 1280 × 800 with the shell, phone at 390.
 *
 * ⚠️ A FIGURE IS COMPARED WITH THE MODEL, AND WHERE THE MODEL COULD MOVE WITH THE MUTATION, WITH SOMETHING IT
 *    CANNOT: `requests` (v17's own count) for S1, a swapped set of anchors (`__SA_AN24_BENCH`, dev builds only) for
 *    S2, the calendar for S3, the sub-line's own date for S5. The page publishes `window.__SA_AN21` in dev builds only.
 * ⚠️ GEOMETRY IS READ OFF THE DRAWING: a pie's angles from its path's end points, a column's or bar's height and
 *    width from its box. Never from the data attributes the component writes beside them.
 * ⚠️ THE FIXTURE: the harness account's "The Smoke Test" (`seed-ms-1`). I1 seeds and removes its own empty
 *    manuscript (tests/e2e/seedAn21.mjs). Each lock's named mutation is a SOURCE patch applied, built and reverted in
 *    the measurement worktree (reports/analytics-v24/mutation-proofs.jsonl).
 */
import { test, expect, type Page } from "@playwright/test";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { openAn } from "./an17Lib";

const DIR = "reports/analytics-v24";
const MS = "seed-ms-1";
const VP = (w: number) => (w <= 760 ? { width: w, height: 844 } : w === 1280 ? { width: 1280, height: 800 } : { width: w, height: 900 });
const TINT = "rgb(233, 230, 224)";
const RUST = "rgb(180, 85, 63)";
const RUSTS = ["rgb(180, 85, 63)", "rgb(160, 99, 63)", "rgb(160, 69, 46)", "#b4553f", "#a0633f"];
const RGB = { anthracite: "rgb(42, 58, 82)", sand: "rgb(247, 239, 227)", stone: "rgb(228, 225, 219)", offer: "rgb(215, 224, 232)", sage: "rgb(224, 229, 221)", rose: "rgb(245, 230, 223)" };
const QUESTIONS = [
  "What happened to your queries?", "Benchmarking", "How many have you sent, and when?", "Do agents reply when they say they will?",
  "Who are you still waiting on?", "Moments worth remembering", "A note on these numbers",
];

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
/** The page's published model, or null when there is no v24 block: a missing model is a failed reading, never a crash. */
const model = (page: Page) => page.evaluate(() => ((window as any).__SA_AN21?.v24 ? (window as any).__SA_AN21 : null));
async function toSec(page: Page, sec: number, off = 40) {
  const found = await page.evaluate(({ sec, off }) => {
    const p = [...document.querySelectorAll<HTMLElement>('[data-a17="page"]')].find((e) => e.getBoundingClientRect().height > 0)!;
    const sc = p.closest(".wpg-scroll") as HTMLElement;
    const t = p.querySelector<HTMLElement>(`[data-a17="sec"][data-sec="${sec}"]`);
    if (t) sc.scrollTop = t.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop - off;
    return !!t;
  }, { sec, off });
  await page.waitForTimeout(250);
  return found;
}
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
    const d = document.documentElement, sc = vis(".wpg-scroll");
    return { doc: [d.scrollWidth, d.clientWidth], sc: sc ? [sc.scrollWidth, sc.clientWidth] : null };
  });
}
/** Where a section's top sits in the scroller, after a press. */
async function secTop(page: Page, sec: number) {
  return page.evaluate((sec) => {
    const p = [...document.querySelectorAll<HTMLElement>('[data-a17="page"]')].find((e) => e.getBoundingClientRect().height > 0)!;
    const sc = (p.closest(".wpg-scroll") as HTMLElement).getBoundingClientRect();
    const s = p.querySelector(`[data-a17="sec"][data-sec="${sec}"]`);
    return s ? { top: s.getBoundingClientRect().top - sc.top, h: sc.height } : null;
  }, sec);
}
async function scrollTop0(page: Page) {
  await page.evaluate(() => { const p = [...document.querySelectorAll<HTMLElement>('[data-a17="page"]')].find((e) => e.getBoundingClientRect().height > 0)!; (p.closest(".wpg-scroll") as HTMLElement).scrollTop = 0; });
}
const weeks = (d: number) => (Math.round(d) < 7 ? Math.round(d) : Math.round(Math.round(d) / 7));


/* ════════════ v24.1 · card 3, "Replies due" — read and checked the same way on the harness account and the fixtures ════════════ */
const MON3 = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const spanTxt = (d: number) => { const r = Math.round(d); if (r < 7) return `${r} ${r === 1 ? "day" : "days"}`; const w = Math.round(r / 7); return `${w} ${w === 1 ? "wk" : "wks"}`; };
async function readDue(page: Page) {
  return page.evaluate(() => {
    const c = [...document.querySelectorAll<HTMLElement>('[data-a21="desk-card"][data-key="due"]')].find((e) => e.getBoundingClientRect().height > 0);
    if (!c) return null;
    const strip = c.querySelector<HTMLElement>('[data-a24="desk-strip"]');
    const sr = strip?.getBoundingClientRect();
    const today = strip?.querySelector<HTMLElement>('[data-a24="desk-today"]');
    const pill = strip?.querySelector<HTMLElement>('[data-a24="desk-past"]');
    return {
      title: c.querySelector("h3")?.textContent ?? "", fig: c.querySelector('[data-a21="desk-figure"]')?.textContent ?? null,
      unit: c.querySelector('[data-a21="desk-unit"]')?.textContent ?? null, stamp: c.querySelector('[data-a21="desk-stamp"]')?.textContent ?? null,
      chips: [...c.querySelectorAll<HTMLElement>('[data-a21="desk-n"]')].map((x) => x.textContent ?? ""),
      rows: [...c.querySelectorAll<HTMLElement>('[data-a21="desk-row"]')].map((r) => r.innerText.replace(/\s+/g, " ").trim()),
      stripW: sr?.width ?? 0, todayX: today && sr ? today.getBoundingClientRect().left + 1 - sr.left : null,
      dots: strip && sr ? [...strip.querySelectorAll<HTMLElement>('[data-a24="desk-dot"]')].map((d) => { const b = d.getBoundingClientRect(); return b.left + b.width / 2 - sr.left; }) : [],
      pill: pill ? { text: pill.textContent ?? "", none: pill.classList.contains("none"), bg: getComputedStyle(pill).backgroundColor } : null,
    };
  });
}
/** S5 on the page: its first reading ("{past} of {waiting}") and how many waiting rows it draws. */
async function readS5(page: Page) {
  return page.evaluate(() => {
    const p = [...document.querySelectorAll<HTMLElement>('[data-a17="page"]')].find((e) => e.getBoundingClientRect().height > 0)!;
    const sec = p.querySelector<HTMLElement>('[data-a17="sec"][data-sec="4"]');
    const fig = sec?.querySelector('[data-a24="reading-fig"]')?.textContent ?? "";
    return { fig, rows: sec ? sec.querySelectorAll('[data-a24="wait-row"]').length : -1 };
  });
}
type Due = { past: number; soon: number; later: number; noStatedTime: number; next: { atMs: number; days: number } | null; dots: { days: number }[] };
function checkDue(L: Ledger, ww: string, c: NonNullable<Awaited<ReturnType<typeof readDue>>>, d: Due, s5: { fig: string; rows: number }) {
  L.check("B1 card 3's title is 'Replies due'", ww, c.title.trim().endsWith("Replies due"), c.title);
  const want = d.soon >= 1 ? [String(d.soon), "due in the next\ntwo weeks"] : d.next ? [spanTxt(d.next.days), "until the next\nis due"] : ["–", "nothing due"];
  L.check("B1 card 3's figure and unit follow the state table", ww, c.fig === want[0] && c.unit === want[1], `${c.fig} / ${JSON.stringify(c.unit)} vs ${want.join(" / ")}`);
  L.check("B1 card 3's rows: past, due later (zeros as 0)", ww, JSON.stringify(c.chips) === JSON.stringify([String(d.past), String(d.later)]) && /past their time/.test(c.rows[0] ?? "") && /due later/.test(c.rows[1] ?? ""), `${c.chips} ${c.rows}`);
  const stamp = d.next ? `next ${new Date(d.next.atMs).getDate()} ${MON3[new Date(d.next.atMs).getMonth()]}` : null;
  L.check("B1 card 3's stamp is the next due date, or absent", ww, c.stamp === stamp, `${c.stamp} vs ${stamp}`);
  L.check("B1 one dot per open query not past its time", ww, c.dots.length === d.soon + d.later && d.dots.length === c.dots.length, `${c.dots.length} vs ${d.soon}+${d.later}`);
  const off = c.dots.filter((x, i) => Math.abs(x - ((22 + (Math.min(d.dots[i]?.days ?? 0, 56) / 56) * 78) / 100) * c.stripW) > 1).length;
  L.check("B1 each dot sits at 22% + min(days, 56)/56 × 78% (±1px)", ww, off === 0, `${off} off of ${c.dots.length}`);
  L.check("B1 today's mark at 22% (±1px)", ww, c.todayX !== null && Math.abs(c.todayX - 0.22 * c.stripW) <= 1, `${c.todayX?.toFixed(1)} vs ${(0.22 * c.stripW).toFixed(1)}`);
  L.check("B1 the past zone: a rust '{n} past' pill, or 'none past' with no pill", ww, !!c.pill && (d.past > 0 ? c.pill.text === `${d.past} past` && !c.pill.none && c.pill.bg === RUST : c.pill.text === "none past" && c.pill.none), JSON.stringify(c.pill));
  /* ⚠️ THE ANCHOR A LIB MUTATION CANNOT MOVE: what S5 itself draws */
  const s5past = /^None/.test(s5.fig) ? 0 : Number(s5.fig.match(/^\d+/)?.[0] ?? NaN);
  L.check("B1 the past count is S5's past reading", ww, d.past === s5past || (s5.rows === 0 && d.past === 0), `${d.past} vs "${s5.fig}"`);
  L.check("B1 past + soon + later + no stated time = S5's waiting rows", ww, d.past + d.soon + d.later + d.noStatedTime === Math.max(0, s5.rows), `${d.past}+${d.soon}+${d.later}+${d.noStatedTime} vs ${s5.rows}`);
}

/* ════════════ A3 · the ring ════════════ */
test("AN24-A3 · ring", async ({ page }) => {
  const L = new Ledger("an24-a3");
  for (const w of [1512, 1280]) {
    await open(page, w);
    const m = await model(page);
    const r = await page.evaluate(() => {
      const c = [...document.querySelectorAll<HTMLElement>('[data-a21="card"]')].find((e) => e.getBoundingClientRect().height > 0);
      if (!c) return null;
      const arc = c.querySelector<SVGCircleElement>('[data-a21="ring-arc"]');
      return {
        label: c.querySelector('[data-a21="ring-label"]')?.textContent ?? null, sub: c.querySelector('[data-a21="ring-sub"]')?.textContent ?? null,
        dash: arc ? parseFloat(arc.getAttribute("stroke-dasharray") ?? "0") : null, r: arc ? Number(arc.getAttribute("r")) : 34,
        pct: c.querySelector('[data-a21="ring-pct"]')?.textContent ?? null,
        strokes: [...c.querySelectorAll<SVGCircleElement>('[data-a21="ring"] circle')].map((x) => getComputedStyle(x).stroke),
      };
    });
    const ww = `${w}`;
    L.check("A3 the ring renders", ww, !!r && !!m, `${!!r}`);
    if (!r || !m) continue;
    const k = m.v24.keeping;
    const placed = k.kept.length + k.longer.length;
    L.check("A3 the label is 'Replied on time'", ww, r.label === "Replied on time", `${r.label}`);
    if (placed === 0) L.check("A3 empty track and '–' with none placed", ww, r.dash === null && r.pct === "–" && r.sub === "No replies yet", `${r.dash} ${r.pct} ${r.sub}`);
    else {
      const share = k.kept.length / placed;
      const want = share * 2 * Math.PI * r.r;
      L.check("A3 the arc is kept ÷ placed (±1%)", ww, r.dash !== null && Math.abs(r.dash - want) <= 2 * Math.PI * r.r * 0.01, `${r.dash} vs ${want.toFixed(2)}`);
      L.check("A3 the figure is the share", ww, r.pct === `${Math.round(share * 100)}%`, `${r.pct}`);
      L.check("A3 the line is 'kept of the placed replies'", ww, r.sub === `${k.kept.length} of the ${placed} ${placed === 1 ? "reply" : "replies"}`, `${r.sub}`);
    }
    L.check("A3 no rust in the ring", ww, r.strokes.every((s) => !RUSTS.includes(s)), r.strokes.join(" "));
    await page.locator('[data-a21="ring-panel"]:visible').first().click();
    await page.waitForTimeout(1200);
    const at = await secTop(page, 3);
    L.check("A3 pressing it scrolls S4 into view", ww, !!at && at.top > -60 && at.top < at.h * 0.5, `${at?.top.toFixed(0)}`);
  }
  L.done(10);
});

/* ════════════ B1 · the desk ════════════ */
test("AN24-B1 · desk", async ({ page }) => {
  test.setTimeout(180_000);
  const L = new Ledger("an24-b1");
  for (const w of [1512, 1280]) {
    await open(page, w);
    const m = await model(page);
    const cards = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-a21="desk-card"]')].filter((e) => e.getBoundingClientRect().height > 0).map((c) => {
      const strip = c.querySelector<HTMLElement>('[data-a24="desk-strip"]');
      const sr = strip?.getBoundingClientRect();
      const u = strip?.querySelector<HTMLElement>('[data-a24="desk-typical"]');
      const dots = strip ? [...strip.querySelectorAll<HTMLElement>('[data-a24="desk-dot"]')].map((d) => { const b = d.getBoundingClientRect(); return b.left + b.width / 2 - sr!.left; }) : [];
      return {
        k: c.dataset.key, title: c.querySelector("h3")?.textContent ?? "", fig: c.querySelector('[data-a21="desk-figure"]')?.textContent ?? null,
        unit: c.querySelector('[data-a21="desk-unit"]')?.textContent ?? null, stripW: sr?.width ?? 0, dots,
        typ: u && sr ? u.getBoundingClientRect().left + 1 - sr.left : null,
      };
    }));
    const ww = `${w}`;
    L.check("B1 three cards", ww, cards.length === 3, `${cards.length}`);
    L.check("the page publishes the v24 model", ww, !!m, `${!!m}`);
    if (!m || cards.length !== 3) continue;
    const [c1, c2, c3] = cards;
    const v = m.v24, o = v.outcomes;
    L.check("B1 card titles", ww, c1.title.endsWith("Queries sent") && c2.title.endsWith("Asked to read more") && c3.title.endsWith("Replies due"), cards.map((c) => c.title).join(" | "));
    const rate = o.sent >= 5 ? `${Math.round((o.asked / o.sent) * 100)}%` : `${o.asked} of ${o.sent}`;
    L.check("B1 card 2's figure is requestRate", ww, c2.fig === rate && (o.sent < 5 || c2.unit === `${o.asked} of ${o.sent}`), `${c2.fig} ${c2.unit} vs ${rate}`);
    /* ⚠️ the independent anchor: v17's own count of queries that reached a request, plus the offers */
    L.check("B1 'asked' is no more than requests + offers", ww, o.asked <= m.requests + m.offers && o.asked >= m.requests, `${o.asked} vs ${m.requests}+${m.offers}`);
    /* REWRITTEN (v24.1): card 3 is Replies due — the dot-strip assertions are retired (RETIRED-analytics-v24-1.md) */
    const due = await readDue(page);
    await toSec(page, 4);
    const s5 = await readS5(page);
    L.check("B1 card 3 renders", ww, !!due, `${!!due}`);
    if (due) checkDue(L, ww, due, v.due, s5);
    for (const [key, sec] of [["sent", 2], ["rate", 0], ["due", 4]] as const) {
      await scrollTop0(page);
      const card = page.locator(`[data-a21="desk-card"][data-key="${key}"]:visible`).first();
      /* a missing card is a failed reading, never a wait out to the timeout */
      if ((await card.count()) === 0) { L.check(`B1 ${key} scrolls to S${sec + 1}`, ww, false, "no such card"); continue; }
      await card.click();
      await page.waitForTimeout(1200);
      const at = await secTop(page, sec);
      L.check(`B1 ${key} scrolls to S${sec + 1}`, ww, !!at && at.top > -60 && at.top < 200, `${at?.top.toFixed(0)}`);
    }
  }
  L.done(38);
});

/* ════════════ C1 · the seven sections ════════════ */
test("AN24-C1 · sections", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("an24-c1");
  for (const w of [1512, 1280]) {
    await open(page, w);
    const ww = `${w}`;
    const heads = await page.evaluate(() => {
      const p = [...document.querySelectorAll<HTMLElement>('[data-a17="page"]')].find((e) => e.getBoundingClientRect().height > 0)!;
      return [...p.querySelectorAll<HTMLElement>('section[data-a24="sec"]')].map((s) => ({ sec: s.dataset.sec, h2: s.querySelector("h2")?.textContent ?? "", answer: (s.querySelector('[data-a24="answer"]')?.textContent ?? "").length }));
    });
    L.check("C1 exactly seven sections", ww, heads.length === 7, `${heads.length}`);
    L.check("C1 the h2s are the seven questions, in order", ww, JSON.stringify(heads.map((h) => h.h2)) === JSON.stringify(QUESTIONS), heads.map((h) => h.h2).join(" | "));
    L.check("C1 data-sec runs 0–6", ww, heads.map((h) => h.sec).join("") === "0123456", heads.map((h) => h.sec).join(""));
    L.check("C1 every section answers", ww, heads.every((h) => h.answer > 20), heads.map((h) => h.answer).join(" "));
    L.check("C1 no older section left", ww, (await page.locator('[data-a17="sec"][data-sec="7"]').count()) === 0, "sec 7");
    const page0 = await page.evaluate(() => {
      let e: HTMLElement | null = [...document.querySelectorAll<HTMLElement>('[data-a17="page"]')].find((x) => x.getBoundingClientRect().height > 0)!.parentElement;
      while (e && getComputedStyle(e).backgroundColor === "rgba(0, 0, 0, 0)") e = e.parentElement;
      return e ? getComputedStyle(e).backgroundColor : "none";
    });
    for (let s = 0; s <= 6; s++) {
      await toSec(page, s, 20);
      const g = await page.evaluate((s) => {
        const p = [...document.querySelectorAll<HTMLElement>('[data-a17="page"]')].find((e) => e.getBoundingClientRect().height > 0)!;
        const sec = p.querySelector<HTMLElement>(`[data-a17="sec"][data-sec="${s}"]`)!;
        const win = (p.closest(".ws-window") ?? p.closest(".wpg-scroll")) as HTMLElement;
        const wr = win.getBoundingClientRect(), sr = sec.getBoundingClientRect();
        return { bg: getComputedStyle(sec).backgroundColor, y: Math.max(sr.top, wr.top) + 30, l: wr.left + 4, r: wr.right - 4, visible: sr.top < wr.bottom - 40 };
      }, s);
      const tinted = s === 1 || s === 3 || s === 5;
      L.check(`C1 S${s + 1} is ${tinted ? "tinted" : "on the page colour"}`, ww, tinted ? g.bg === TINT : g.bg === "rgba(0, 0, 0, 0)", g.bg);
      if (g.visible) {
        const [lp, rp] = await pixels(page, [{ x: g.l, y: g.y }, { x: g.r, y: g.y }]);
        const want = tinted ? parse(TINT) : parse(page0);
        L.check(`C1 S${s + 1} paints edge to edge`, ww, close(lp, want) && close(rp, want), `${rgbStr(lp)} ${rgbStr(rp)} vs ${tinted ? TINT : page0}`);
      }
    }
    await toSec(page, 2, 0);
    await page.waitForTimeout(500);
    const tab = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-a17="tab"] small')].map((x) => x.textContent).join(""));
    L.check("C1 the tab reads 'n of 7'", ww, /^\d of 7$/.test(tab ?? ""), `${tab}`);
    const o = await overflow(page);
    L.check("C1 no horizontal overflow", ww, !!o.sc && o.sc[0] <= o.sc[1] && o.doc[0] <= o.doc[1], JSON.stringify(o));
  }
  L.done(40);
});

/* ════════════ S1 · the pies ════════════ */
test("AN24-S1 · pies", async ({ page }) => {
  const L = new Ledger("an24-s1");
  for (const w of [1512, 1280]) {
    await open(page, w);
    const m = await model(page);
    await toSec(page, 0);
    const pies = await page.evaluate(() => {
      const read = (probe: string) => {
        const svg = [...document.querySelectorAll<SVGSVGElement>(`[data-a24="${probe}"]`)].find((e) => e.getBoundingClientRect().height > 0);
        if (!svg) return null;
        return [...svg.querySelectorAll<SVGElement>('[data-a24="slice"]')].map((el) => {
          const fill = getComputedStyle(el).fill;
          if (el.tagName.toLowerCase() === "circle") return { k: el.dataset.k, n: Number(el.dataset.n), sweep: 360, fill };
          /* the drawn angle, from the path's own end points: M c,c L x0,y0 A r,r 0 large 1 x1,y1 Z */
          const nums = (el.getAttribute("d") ?? "").match(/-?\d+(\.\d+)?/g)!.map(Number);
          const [cx, cy, x0, y0, , , , large, , x1, y1] = nums;
          const ang = (x: number, y: number) => ((Math.atan2(y - cy, x - cx) * 180) / Math.PI + 90 + 360) % 360;
          let sweep = (ang(x1, y1) - ang(x0, y0) + 360) % 360;
          if (large === 1 && sweep < 180) sweep = 360 - sweep;
          return { k: el.dataset.k, n: Number(el.dataset.n), sweep, fill };
        });
      };
      return { all: read("pie-all"), asked: read("pie-asked"), none: !!document.querySelector('[data-a24="none-asked"]') };
    });
    const ww = `${w}`;
    L.check("S1 pie 1 renders", ww, !!pies.all && !!m, `${!!pies.all}`);
    if (!pies.all || !m) continue;
    const o = m.v24.outcomes;
    const sum = pies.all.reduce((a, s) => a + s.n, 0);
    L.check("S1 pie 1 sums to sent", ww, sum === o.sent && o.sent === m.sent, `${sum} / ${o.sent} / ${m.sent}`);
    const want1: Record<string, number> = { asked: o.asked, waiting: o.waiting, ended: o.ended.total };
    for (const s of pies.all) {
      L.check(`S1 pie 1 ${s.k} is outcomes'`, ww, s.n === want1[s.k as string], `${s.n} vs ${want1[s.k as string]}`);
      L.check(`S1 pie 1 ${s.k}'s angle (±1°)`, ww, Math.abs(s.sweep - (s.n / sum) * 360) <= 1, `${s.sweep.toFixed(1)} vs ${((s.n / sum) * 360).toFixed(1)}`);
    }
    L.check("S1 no zero slice in pie 1", ww, pies.all.every((s) => s.n > 0) && pies.all.length === Object.values(want1).filter((n) => n > 0).length, JSON.stringify(pies.all.map((s) => s.n)));
    const fills1: Record<string, string> = { asked: RGB.anthracite, waiting: RGB.sand, ended: RGB.stone };
    L.check("S1 pie 1 fills: anthracite / sand / stone", ww, pies.all.every((s) => s.fill === fills1[s.k as string]), pies.all.map((s) => `${s.k}:${s.fill}`).join(" "));
    /* ⚠️ the anchor the lib cannot move: v17's count of queries that reached a request, and the offers */
    L.check("S1 'asked' is the requests, plus any offer that came without one", ww, o.asked >= m.requests && o.asked <= m.requests + m.offers, `${o.asked} vs ${m.requests}+${m.offers}`);
    if (o.asked === 0) { L.check("S1 no second pie with nobody asked", ww, !pies.asked && pies.none, `${!!pies.asked} ${pies.none}`); continue; }
    L.check("S1 pie 2 renders", ww, !!pies.asked, `${!!pies.asked}`);
    if (!pies.asked) continue;
    const sum2 = pies.asked.reduce((a, s) => a + s.n, 0);
    L.check("S1 pie 2 sums to asked", ww, sum2 === o.asked, `${sum2} vs ${o.asked}`);
    const fills2: Record<string, string> = { offer: RGB.offer, open: RGB.sage, saidNo: RGB.stone, withdrew: RGB.stone };
    L.check("S1 pie 2 fills: offer / sage / stone", ww, pies.asked.every((s) => s.fill === fills2[s.k as string]), pies.asked.map((s) => `${s.k}:${s.fill}`).join(" "));
    L.check("S1 no zero slice in pie 2", ww, pies.asked.every((s) => s.n > 0), JSON.stringify(pies.asked.map((s) => s.n)));
    for (const s of pies.asked) L.check(`S1 pie 2 ${s.k}'s angle (±1°)`, ww, Math.abs(s.sweep - (s.n / sum2) * 360) <= 1, `${s.sweep.toFixed(1)}`);
  }
  L.done(20);
});

/* ════════════ S2 · benchmarking ════════════ */
test("AN24-S2 · bench", async ({ page }) => {
  test.setTimeout(180_000);
  const L = new Ledger("an24-s2");
  const ANCHORS = [{ requestRate: 6, replyRate: 50, queriesSent: 44 }, { requestRate: 9, replyRate: 40, queriesSent: 60 }];
  for (const [i, anchors] of ANCHORS.entries()) {
    const w = i === 0 ? 1512 : 1280;
    /* the second pass swaps the anchors: a panel that inlines a literal keeps drawing 6% and goes red */
    if (i > 0) await page.addInitScript((a) => { (window as any).__SA_AN24_BENCH = a; }, anchors);
    await open(page, w);
    const m = await model(page);
    await toSec(page, 1);
    const r = await page.evaluate(() => {
      const p = [...document.querySelectorAll<HTMLElement>('[data-a17="page"]')].find((e) => e.getBoundingClientRect().height > 0)!;
      const panels = [...p.querySelectorAll<HTMLElement>('[data-a24="bench"]')].map((b) => {
        const col = (sel: string) => { const c = b.querySelector<HTMLElement>(sel)!; return { text: c.querySelector("b")?.textContent ?? "", h: c.querySelector("i")!.getBoundingClientRect().height }; };
        return { k: b.dataset.k, you: col('[data-a24="col-you"]'), typ: col('[data-a24="col-typ"]'), verdict: b.querySelector('[data-a24="verdict"]')?.textContent ?? "" };
      });
      const over = p.querySelector<HTMLElement>('[data-a24="seg"][data-k="overdue"]');
      return { panels, cav: p.querySelector('[data-a24="caveat"]')?.textContent ?? "", ring: over ? getComputedStyle(over).boxShadow : null,
        segs: [...p.querySelectorAll<HTMLElement>('[data-a24="seg"]')].map((s) => ({ k: s.dataset.k, n: Number(s.textContent) })) };
    });
    const ww = `${w} · anchors ${anchors.requestRate}/${anchors.replyRate}/${anchors.queriesSent}`;
    L.check("S2 three panels", ww, r.panels.length === 3 && !!m, `${r.panels.length}`);
    if (r.panels.length !== 3 || !m) continue;
    const o = m.v24.outcomes, e = m.v24.expected;
    const you = { rate: o.sent ? Math.round((o.asked / o.sent) * 100) : null, reply: e.past ? Math.round((e.replied / e.past) * 100) : null, sent: o.sent };
    const typ = { rate: anchors.requestRate, reply: anchors.replyRate, sent: anchors.queriesSent };
    const unit = { rate: "%", reply: "%", sent: "" };
    const verdict = (k: "rate" | "reply" | "sent", y: number | null, t: number) => {
      if (k === "sent") return y! < t ? "Still early" : y! <= 66 ? "About typical" : "More than most";
      if ((k === "rate" && o.sent < 10) || (k === "reply" && e.past < 5) || y === null) return "Too early to say";
      const q = Math.round((y / t) * 1000) / 1000;
      return q >= 1.5 ? "Well above" : q >= 1.25 ? "Above" : q >= 0.8 ? "About the same" : q >= 0.5 ? "Below" : "Well below";
    };
    for (const pnl of r.panels) {
      const k = pnl.k as "rate" | "reply" | "sent";
      L.check(`S2 ${k}: Most writers is the anchor`, ww, pnl.typ.text === `${typ[k]}${unit[k]}`, `${pnl.typ.text} vs ${typ[k]}${unit[k]}`);
      L.check(`S2 ${k}: You is the model's`, ww, pnl.you.text === (you[k] === null ? "–" : `${you[k]}${unit[k]}`), `${pnl.you.text} vs ${you[k]}`);
      const y = you[k] ?? 0, t = typ[k], mx = Math.max(y, t, 1);
      const ratio = pnl.typ.h > 0 && pnl.you.h > 0 ? pnl.you.h / pnl.typ.h : null;
      const tallest = Math.max(pnl.you.h, pnl.typ.h);
      L.check(`S2 ${k}: column heights in proportion (±2px)`, ww, Math.abs(pnl.you.h - (Math.max(y, 0) / mx) * tallest) <= 2 + (y === 0 ? 4 : 0) && Math.abs(pnl.typ.h - (t / mx) * tallest) <= 2, `${pnl.you.h.toFixed(1)} / ${pnl.typ.h.toFixed(1)} (${ratio?.toFixed(2)})`);
      L.check(`S2 ${k}: the verdict follows the rule`, ww, pnl.verdict === verdict(k, you[k], t), `${pnl.verdict} vs ${verdict(k, you[k], t)}`);
    }
    L.check("S2 'QueryTracker' is named in the caveat", ww, /QueryTracker/.test(r.cav), r.cav.slice(0, 60));
    if (e.overdue > 0) L.check("S2 the overdue segment carries the rust ring", ww, !!r.ring && r.ring.includes(RUST), `${r.ring}`);
    const segN: Record<string, number> = { replied: e.replied, closed: e.closed, overdue: e.overdue, inside: e.inside };
    L.check("S2 the bar's segments are expectedByNow's", ww, r.segs.every((s) => s.n === segN[s.k as string]) && r.segs.length === Object.values(segN).filter((n) => n > 0).length, JSON.stringify(r.segs));
  }
  L.done(30);
});

/* ════════════ S3 · the months ════════════ */
test("AN24-S3 · months", async ({ page }) => {
  const L = new Ledger("an24-s3");
  for (const w of [1512, 1280]) {
    await open(page, w);
    const m = await model(page);
    await toSec(page, 2);
    const cols = await page.evaluate(() => {
      const p = [...document.querySelectorAll<HTMLElement>('[data-a17="page"]')].find((e) => e.getBoundingClientRect().height > 0)!;
      return [...p.querySelectorAll<HTMLElement>('[data-a24="month"]')].map((c) => ({
        label: c.querySelector("span")?.textContent ?? "", title: c.querySelector("span")?.getAttribute("title") ?? "", n: Number(c.querySelector("b")?.textContent || 0),
        h: c.querySelector("i")!.getBoundingClientRect().height, bg: getComputedStyle(c.querySelector("i")!).backgroundColor,
      }));
    });
    const ww = `${w}`;
    if (!m) { L.check("the page publishes the v24 model", ww, false, "no v24 block"); continue; }
    /* ⚠️ the calendar, not the model: every month from the first query to now, the latest eighteen */
    const f = new Date(m.v24.monthly.firstMs), now = new Date(m.v24.nowMs);
    const span = (now.getFullYear() - f.getFullYear()) * 12 + now.getMonth() - f.getMonth() + 1;
    L.check("S3 one column per calendar month, zeros kept (latest 18)", ww, cols.length === Math.min(18, span), `${cols.length} vs ${Math.min(18, span)}`);
    const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const want = Array.from({ length: Math.min(18, span) }, (_, i) => MON[(now.getMonth() - Math.min(18, span) + 1 + i + 1200) % 12]);
    L.check("S3 the months run on without a gap, ending now", ww, JSON.stringify(cols.map((c) => c.label)) === JSON.stringify(want), cols.map((c) => c.label).join(" "));
    L.check("S3 the counts sum to the dated queries shown", ww, cols.reduce((a, c) => a + c.n, 0) <= m.sent, `${cols.reduce((a, c) => a + c.n, 0)}`);
    const max = Math.max(...cols.map((c) => c.n));
    const tall = Math.max(...cols.map((c) => c.h));
    for (const c of cols.filter((x) => x.n > 0)) L.check(`S3 ${c.title} height in proportion (±2px)`, ww, Math.abs(c.h - (c.n / max) * tall) <= 2, `${c.h.toFixed(1)} vs ${((c.n / max) * tall).toFixed(1)}`);
    const rust = cols.filter((c) => c.bg === RUST);
    L.check("S3 only the busiest month(s) are rust", ww, rust.length > 0 && rust.every((c) => c.n === max) && cols.filter((c) => c.n === max).every((c) => c.bg === RUST), rust.map((c) => c.title).join(", "));
  }
  L.done(12);
});

/* ════════════ S4 · kept to their time ════════════ */
test("AN24-S4 · kept", async ({ page }) => {
  const L = new Ledger("an24-s4");
  for (const w of [1512, 1280]) {
    await open(page, w);
    const m = await model(page);
    await toSec(page, 3);
    const rows = await page.evaluate(() => {
      const p = [...document.querySelectorAll<HTMLElement>('[data-a17="page"]')].find((e) => e.getBoundingClientRect().height > 0)!;
      return [...p.querySelectorAll<HTMLElement>('[data-a24="keep-row"]')].map((li) => {
        const bar = (k: string) => { const b = li.querySelector<HTMLElement>(`[data-a24="pair-bar"][data-kind="${k}"]`)!; const i = b.querySelector("i")!; return { days: Number(b.dataset.days), w: i.getBoundingClientRect().width, bg: getComputedStyle(i).backgroundColor }; };
        return { state: li.dataset.state, said: bar("said"), took: bar("took") };
      });
    });
    const ww = `${w}`;
    if (!m) { L.check("the page publishes the v24 model", `${w}`, false, "no v24 block"); continue; }
    const k = m.v24.keeping;
    const kept = rows.filter((r) => r.state === "kept"), longer = rows.filter((r) => r.state === "longer");
    L.check("S4 kept + longer = placed", ww, kept.length === k.kept.length && longer.length === k.longer.length && rows.length === k.kept.length + k.longer.length, `${kept.length}+${longer.length} vs ${k.kept.length}+${k.longer.length}`);
    L.check("S4 a kept row's took bar ends at or before its said bar", ww, kept.every((r) => r.took.w <= r.said.w + 0.5), `${kept.filter((r) => r.took.w > r.said.w + 0.5).length} wrong`);
    L.check("S4 a longer row's took bar ends after its said bar", ww, longer.every((r) => r.took.w > r.said.w), `${longer.filter((r) => r.took.w <= r.said.w).length} wrong`);
    L.check("S4 longer bars are rust", ww, longer.length === 0 || longer.every((r) => r.took.bg === RUST), longer.map((r) => r.took.bg).join(" "));
    L.check("S4 kept bars are not rust", ww, kept.every((r) => r.took.bg === RGB.anthracite), [...new Set(kept.map((r) => r.took.bg))].join(" "));
    /* one shared scale: px per day is the same in every bar of the section (±1px at each bar's length) */
    const all = rows.flatMap((r) => [r.said, r.took]).filter((b) => b.days > 0 && b.w > 3);
    const ppd = all.reduce((a, b) => a + b.w / b.days, 0) / Math.max(1, all.length);
    L.check("S4 one shared scale (±1px)", ww, all.every((b) => Math.abs(b.w - b.days * ppd) <= 1), `${all.filter((b) => Math.abs(b.w - b.days * ppd) > 1).length} off · ${ppd.toFixed(3)} px/day`);
  }
  L.done(12);
});

/* ════════════ S5 · still waiting ════════════ */
test("AN24-S5 · waiting", async ({ page }) => {
  const L = new Ledger("an24-s5");
  for (const w of [1512, 1280]) {
    await open(page, w);
    const m = await model(page);
    await toSec(page, 4);
    const r = await page.evaluate(() => {
      const p = [...document.querySelectorAll<HTMLElement>('[data-a17="page"]')].find((e) => e.getBoundingClientRect().height > 0)!;
      const bars = (li: HTMLElement) => [...li.querySelectorAll<HTMLElement>('[data-a24="pair-bar"]')].map((b) => { const i = b.querySelector("i"); return { kind: b.dataset.kind, days: b.dataset.days === "" ? null : Number(b.dataset.days), w: i ? i.getBoundingClientRect().width : 0, bg: i ? getComputedStyle(i).backgroundColor : "none" }; });
      return {
        wait: [...p.querySelectorAll<HTMLElement>('[data-a24="wait-row"]')].map((li) => ({ state: li.dataset.state, bars: bars(li) })),
        read: [...p.querySelectorAll<HTMLElement>('[data-a24="read-row"]')].map((li) => ({ state: li.dataset.state, sub: li.querySelector(".a24-who small")?.textContent ?? "", verdict: li.querySelector('[data-a24="verdict"] b')?.textContent ?? "", bars: bars(li) })),
      };
    });
    const ww = `${w}`;
    if (!m) { L.check("the page publishes the v24 model", `${w}`, false, "no v24 block"); continue; }
    const sw = m.v24.waiting;
    L.check("S5 a row per waiting query and per reader", ww, r.wait.length === sw.waiting.length && r.read.length === sw.reading.length, `${r.wait.length}/${r.read.length}`);
    let wrong = 0;
    for (const row of r.wait) {
      const said = row.bars.find((b) => b.kind === "said"), waited = row.bars.find((b) => b.kind === "waited")!;
      const past = !!said && waited.w > said.w + 0.5;
      if ((waited.bg === RUST) !== past) wrong++;
    }
    L.check("S5 a waited bar is rust exactly when it is past the said bar", ww, wrong === 0, `${wrong} wrong`);
    L.check("S5 reading rows have no said bar", ww, r.read.every((x) => x.bars.length === 1 && x.bars[0].kind === "asked"), JSON.stringify(r.read.map((x) => x.bars.map((b) => b.kind))));
    /* ⚠️ the anchor the lib cannot move: the date printed in the row's own sub-line */
    const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date(m.v24.nowMs);
    let off = 0, checked = 0;
    for (const x of r.read) {
      const mm = x.sub.match(/on (\d{1,2}) (\w{3})(?: (\d{4}))?$/);
      if (!mm) continue;
      let y = mm[3] ? Number(mm[3]) : now.getFullYear();
      let d = new Date(y, MON.indexOf(mm[2]), Number(mm[1]), 12);
      if (!mm[3] && d.getTime() > now.getTime()) { y -= 1; d = new Date(y, MON.indexOf(mm[2]), Number(mm[1]), 12); }
      const since = Math.floor((now.getTime() - d.getTime()) / 86400000);
      checked++;
      if (Math.abs(since - x.bars[0].days) > 1) off++;
    }
    L.check("S5 a reading bar counts from the day they asked (its own date, ±1 day)", ww, checked > 0 && off === 0, `${off} of ${checked} off`);
    /* an undated ask draws no bar, so the rose count is over the dated rows; the verdicts count them all */
    const roseWant = (sw.reading as { yourMove: boolean; askedMs: number | null }[]).filter((x) => x.yourMove && x.askedMs !== null).length;
    const rose = r.read.filter((x) => x.bars[0].bg === RGB.rose).length;
    L.check("S5 yourMove equals the rose bars and the 'Your move' verdicts", ww, rose === roseWant && r.read.filter((x) => x.verdict === "Your move").length === sw.yourMove, `${rose} / ${roseWant} · ${sw.yourMove}`);
    L.check("S5 an undated ask draws no bar", ww, r.read.every((x) => (x.bars[0].days === null) === (x.bars[0].w === 0)), "");
    /* one scale for the section, waiting and reading rows alike */
    const all = [...r.wait, ...r.read].flatMap((x) => x.bars).filter((b): b is typeof b & { days: number } => b.days !== null && b.days > 0 && b.w > 3);
    const ppd = all.reduce((a, b) => a + b.w / b.days, 0) / Math.max(1, all.length);
    L.check("S5 one shared scale (±1px)", ww, all.every((b) => Math.abs(b.w - b.days * ppd) <= 1), `${all.filter((b) => Math.abs(b.w - b.days * ppd) > 1).length} off`);
  }
  L.done(12);
});

/* ════════════ S6 · moments ════════════ */
test("AN24-S6 · moments", async ({ page }) => {
  const L = new Ledger("an24-s6");
  for (const w of [1512, 1280]) {
    await open(page, w);
    const m = await model(page);
    await toSec(page, 5);
    const list = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-a24="moment"]')].filter((e) => e.getBoundingClientRect().height > 0).map((li) => ({
      k: li.dataset.k, at: Number(li.dataset.at), date: li.querySelector("time")?.textContent ?? "", line: li.querySelector("p")?.textContent ?? "",
    })));
    const ww = `${w}`;
    if (!m) { L.check("the page publishes the v24 model", `${w}`, false, "no v24 block"); continue; }
    const want = m.v24.moments as { key: string; atMs: number; date: string; days: number | null }[];
    L.check("S6 entries are in date order", ww, list.every((x, i) => i === 0 || x.at >= list[i - 1].at), list.map((x) => x.k).join(" "));
    L.check("S6 the entries are moments'", ww, JSON.stringify(list.map((x) => x.k)) === JSON.stringify(want.map((x) => x.key)), `${list.map((x) => x.k)} vs ${want.map((x) => x.key)}`);
    for (const x of want) {
      const got = list.find((y) => y.k === x.key);
      L.check(`S6 ${x.key}: the date is moments'`, ww, !!got && got.date === x.date, `${got?.date} vs ${x.date}`);
      if (x.key === "request" || x.key === "offer") L.check(`S6 ${x.key}: the day count is moments'`, ww, !!got && got.line.includes(`${x.days} ${x.days === 1 ? "day" : "days"} after`), `${got?.line}`);
      if (x.key === "busiest") L.check("S6 busiest: the count is moments'", ww, !!got && got.line.startsWith(`${x.days} queries in one week`), `${got?.line}`);
    }
    /* an entry with no support is absent: an offer entry only where the model counts an offer */
    L.check("S6 an offer entry only with an offer", ww, list.some((x) => x.k === "offer") === (m.offers > 0), `${m.offers}`);
  }
  L.done(10);
});

/* ════════════ U1 · units ════════════ */
test("AN24-U1 · units", async ({ page }) => {
  test.setTimeout(180_000);
  const L = new Ledger("an24-u1");
  for (const w of [1512, 390]) {
    await open(page, w);
    for (const s of [0, 1, 2, 3, 4, 5, 6]) await toSec(page, s, 0);
    const text = await page.evaluate(() => {
      const p = [...document.querySelectorAll<HTMLElement>('[data-a17="page"]')].find((e) => e.getBoundingClientRect().height > 0)!;
      return p.innerText + " " + [...p.querySelectorAll<HTMLElement>("[title]")].map((e) => e.getAttribute("title")).join(" ");
    });
    const ww = `${w}`;
    L.check("U1 the page has its text", ww, text.length > 2000, `${text.length}`);
    for (const re of [/\b1 wks\b/, /\b0 wks\b/, /\b0 days\b/]) L.check(`U1 no ${re}`, ww, !re.test(text), (text.match(new RegExp(`.{0,30}${re.source}.{0,10}`)) ?? [""])[0]);
    L.check("U1 weeks are spelled 'wk' / 'wks'", ww, /\b\d+ wks?\b/.test(text), "a week figure");
  }
  L.done(10);
});

/* ════════════ I1 · the empty page ════════════ */
test.describe("AN24-I1", () => {
  test.beforeAll(() => { execSync("node tests/e2e/seedAn21.mjs empty", { stdio: "pipe" }); });
  test.afterAll(() => { execSync("node tests/e2e/seedAn21.mjs restore", { stdio: "pipe" }); });
  test("AN24-I1 · empty", async ({ page }) => {
    test.setTimeout(240_000);
    const L = new Ledger("an24-i1");
    for (const w of [1512, 390]) {
      await open(page, w, "seed-an21-empty");
      const r = await page.evaluate(() => {
        const p = [...document.querySelectorAll<HTMLElement>('[data-a17="page"]')].find((e) => e.getBoundingClientRect().height > 0);
        if (!p) return null;
        const vis = (s: string) => [...p.querySelectorAll<HTMLElement>(s)].filter((e) => e.getBoundingClientRect().height > 0).length;
        const steps = [...p.querySelectorAll<HTMLElement>('[data-a24="step"]')];
        const arrows = steps.filter((li) => { const b = getComputedStyle(li, "::before"); return b.display !== "none" && b.content !== "none" && b.backgroundImage.includes("svg"); }).length;
        return {
          sent: p.dataset.sent, card: vis('[data-a21="card"]'), desk: vis('[data-a21="desk"]'), secs: vis('[data-a17="sec"]'), tab: document.querySelectorAll('[data-a17="tab"]').length,
          head: p.querySelector('[data-a24="steps"] h2')?.textContent ?? "", steps: steps.length, arrows, slots: vis('[data-a24="art-slot"]'), tiles: vis('[data-a24="tile"]'),
          ways: vis('[data-a21="way"]'), example: !!p.querySelector('[data-a21="example"]'), art: p.querySelector<HTMLImageElement>('[data-a21="empty-art"]')?.src ?? "",
        };
      });
      const ww = `${w}`;
      L.check("I1 the page renders", ww, !!r, `${!!r}`);
      if (!r) continue;
      L.check("I1 no header card, desk, sections or tab", ww, r.card === 0 && r.desk === 0 && r.secs === 0 && r.tab === 0, JSON.stringify(r));
      L.check("I1 the steps card: 'How it works.' over three steps", ww, r.head === "How it works." && r.steps === 3, `${r.head} ${r.steps}`);
      L.check(`I1 ${w <= 760 ? "no arrows on the phone" : "two arrows"}`, ww, r.arrows === (w <= 760 ? 0 : 2), `${r.arrows}`);
      L.check("I1 three art slots and three tiles", ww, r.slots === 3 && r.tiles === 3, `${r.slots} ${r.tiles}`);
      L.check("I1 v21's example card is gone", ww, !r.example, `${r.example}`);
      L.check("I1 the navy panel's Archivist and the three ways stand", ww, /analytics-archivist\.webp/.test(r.art) && r.ways === 3, `${r.art} ${r.ways}`);
      L.check("I1 the tiles' numbers are not counted", ww, r.sent === "0", `${r.sent}`);
    }
    const written = execSync("node tests/e2e/seedAn21.mjs count", { encoding: "utf8" }).trim();
    L.check("I1 the tiles are not written", "account", written === "0", written);
    L.done(16);
  });
});

/* ════════════ v24.1 · B2 thin, R1 replies, R2 dates — on seeded manuscripts (tests/e2e/seedAn24.mjs), restored in the run ════════════ */
const readHeader = (page: Page) => page.evaluate(() => {
  const h = [...document.querySelectorAll<HTMLElement>('[data-a21="title"]')].find((e) => e.getBoundingClientRect().height > 0);
  const t = (h?.getAttribute("aria-label") ?? "").match(/^(\d+) quer(?:y|ies), (no|\d+) repl/);
  return t ? { sent: Number(t[1]), replies: t[2] === "no" ? 0 : Number(t[2]) } : null;
});
test.describe("AN24 v24.1 fixtures", () => {
  test.beforeAll(() => { for (const f of ["thin", "pass", "baddate", "notime"]) execSync(`node tests/e2e/seedAn24.mjs ${f}`, { stdio: "pipe" }); });
  test.afterAll(() => { execSync("node tests/e2e/seedAn24.mjs restore", { stdio: "pipe" }); });

  test("AN24-B2 · thin", async ({ page }) => {
    test.setTimeout(240_000);
    const L = new Ledger("an24-b2");
    for (const w of [1512, 1280]) {
      for (const ms of ["seed-an24-thin", "seed-an24-pass"]) {
        await open(page, w, ms);
        const m = await model(page);
        const ww = `${w} · ${ms}`;
        if (!m) { L.check("the page publishes the v24 model", ww, false, "no v24 block"); continue; }
        const c = await readDue(page);
        await toSec(page, 4);
        const s5 = await readS5(page);
        L.check("B2 card 3 renders", ww, !!c, `${!!c}`);
        if (!c) continue;
        checkDue(L, ww, c, m.v24.due, s5);
        if (ms === "seed-an24-thin") {
          L.check("B2 thin: '5 wks' until the next is due", ww, c.fig === "5 wks" && c.unit === "until the next\nis due", `${c.fig} / ${JSON.stringify(c.unit)}`);
          L.check("B2 thin: 0 past, 2 due later, 'none past' with no pill", ww, JSON.stringify(c.chips) === '["0","2"]' && !!c.pill?.none && c.pill.text === "none past", `${c.chips} ${JSON.stringify(c.pill)}`);
          L.check("B2 thin: a stamp 'next {date}'", ww, /^next \d{1,2} [A-Z][a-z]{2}$/.test(c.stamp ?? ""), `${c.stamp}`);
          L.check("B2 thin: two dots", ww, c.dots.length === 2, `${c.dots.length}`);
        } else {
          L.check("B2 nothing waiting: '–', 'nothing due', no stamp, no dots", ww, c.fig === "–" && c.unit === "nothing due" && c.stamp === null && c.dots.length === 0, `${c.fig} ${c.unit} ${c.stamp} ${c.dots.length}`);
        }
      }
    }
    L.done(40);
  });

  test("AN24-R1 · replies", async ({ page }) => {
    test.setTimeout(300_000);
    const L = new Ledger("an24-r1");
    for (const ms of ["seed-ms-1", "seed-an24-thin", "seed-an24-pass", "seed-an24-baddate", "seed-an24-notime"]) {
      await open(page, 1512, ms);
      const m = await model(page);
      const h = await readHeader(page);
      const ww = ms;
      if (!m || !h) { L.check("the page publishes the v24 model and a header", ww, false, `${!!m} ${!!h}`); continue; }
      const o = m.v24.outcomes;
      /* the card's own "{asked} of {sent}" where the rate is a percentage, else the outcomes' count */
      const unit = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-a21="desk-card"][data-key="rate"] [data-a21="desk-unit"]')].find((e) => e.getBoundingClientRect().height > 0)?.textContent ?? "");
      const askedOnCard = Number(unit.match(/^(\d+) of/)?.[1] ?? o.asked);
      L.check("R1 header replies ≥ card 2's asked", ww, h.replies >= askedOnCard, `${h.replies} vs ${askedOnCard}`);
      L.check("R1 replies = asked + said no to the letter", ww, h.replies === o.asked + o.ended.letter, `${h.replies} vs ${o.asked}+${o.ended.letter}`);
      L.check("R1 header queries = sent", ww, h.sent === m.sent, `${h.sent} vs ${m.sent}`);
    }
    L.done(15);
  });

  test("AN24-R2 · dates", async ({ page }) => {
    test.setTimeout(180_000);
    const L = new Ledger("an24-r2");
    for (const w of [1512, 1280]) {
      await open(page, w, "seed-an24-baddate");
      const m = await model(page);
      const ww = `${w}`;
      if (!m) { L.check("the page publishes the v24 model", ww, false, "no v24 block"); continue; }
      await toSec(page, 3);
      const r = await page.evaluate(() => {
        const p = [...document.querySelectorAll<HTMLElement>('[data-a17="page"]')].find((e) => e.getBoundingClientRect().height > 0)!;
        const sec = p.querySelector<HTMLElement>('[data-a17="sec"][data-sec="3"]')!;
        return { answer: sec.querySelector('[data-a24="answer"]')?.textContent ?? "", rows: [...sec.querySelectorAll<HTMLElement>('[data-a24="keep-row"]')].map((x) => x.dataset.id ?? ""),
          typical: [...sec.querySelectorAll<HTMLElement>('[data-a24="reading-fig"]')].map((x) => x.textContent ?? "")[2] ?? "" };
      });
      const bad = (m.v24.tally?.bad ?? null) as { id: string; rawDays: number }[] | null;
      L.check("R2 the bad dates are found", ww, !!bad && bad.map((b) => b.id).sort().join(",") === "seed-an24-q-b1,seed-an24-q-b2", JSON.stringify(bad));
      L.check("R2 a reply dated before its send, or two years after, is not in S4's rows", ww, !r.rows.includes("seed-an24-q-b1") && !r.rows.includes("seed-an24-q-b2") && r.rows.includes("seed-an24-q-b3"), r.rows.join(","));
      L.check("R2 the typical rests on the good reply alone", ww, JSON.stringify(m.v24.keeping.all) === "[30]" && r.typical === "4 wks", `${JSON.stringify(m.v24.keeping.all)} ${r.typical}`);
      L.check("R2 S4 counts them under 'no reply date'", ww, /Two replies have no reply date and are left out\./.test(r.answer), r.answer);
    }
    L.done(8);
  });
});
