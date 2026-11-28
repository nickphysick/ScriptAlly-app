/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone Birds-eye first look v1 — BFL-1 to BFL-8, at 390 × 784 (Chromium phone, the harness's account on the emulator),
 * and the shots beside the ref's (design-refs/phone-birds-eye-first-look-v1/shots).
 *
 *   BFL_MUTATE=all | <muts…>   each lock red first, under its own deliberate breakage (listed in MUTS)
 *   BFL_SHOTS=1                the build at the ref's 150, 400, 700, 1000 and 1400ms, at the end, and Today's preview
 *
 * Timing reads from the layer's own `data-t0` (performance.now() when the grow-in started) and the Web Animations the
 * grow-in made (document.getAnimations()); a shot is the animations paused and set to the ref's moment, the counts set
 * by the same smoothstep. Reads only: nothing here writes to the emulator.
 */
import { expect, test, type Page } from "@playwright/test";
import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";

const DIR = "reports/phone-birds-eye-first-look-v1";
const REF = "design-refs/phone-birds-eye-first-look-v1/shots";
const PHONE = { width: 390, height: 784 } as const;
const DESK = { width: 1440, height: 900 } as const;
const KEY = "bw1.firstLook.day";
const BIRDS = "/queries/all?view=birds";
const TODAY = "/dashboard?tab=queries";
const frame = (page: Page, ms = 450) => page.waitForTimeout(ms);

const MUTS = ["daily", "overlap", "count", "touch", "rm", "tiny"] as const;
type Mut = (typeof MUTS)[number] | "";
const MUT_LOCK: Record<Exclude<Mut, "">, string> = { daily: "BFL-1", overlap: "BFL-2", count: "BFL-3", touch: "BFL-4", rm: "BFL-5", tiny: "BFL-8" };
/** each breakage, set before the page's own scripts run */
const INIT_MUT: Partial<Record<Exclude<Mut, "">, string>> = {
  /* BFL-1: the day's memory never read, so every open plays it in full */
  daily: `{ const g = Storage.prototype.getItem; Storage.prototype.getItem = function (k) { return k === ${JSON.stringify(KEY)} ? null : g.call(this, k); }; }`,
  /* BFL-2: the ref's 90ms floor and more: each piece's grow 120ms longer, so it runs on into the next */
  overlap: `{ const a = Element.prototype.animate; Element.prototype.animate = function (kf, o) { if (Array.isArray(kf) && kf[0] && kf[0].scale === "0 1" && o && typeof o === "object") o = { ...o, duration: (o.duration || 0) + 120 }; return a.call(this, kf, o); }; }`,
  /* BFL-4: a touch the page never hears (taken at the window, before Birds-eye) */
  touch: `window.addEventListener("pointerdown", (e) => e.stopPropagation(), true);`,
  /* BFL-5: reduced motion not consulted */
  rm: `{ const m = window.matchMedia.bind(window); window.matchMedia = (q) => (/reduced-motion/.test(q) ? { matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent() { return false; } } : m(q)); }`,
};
const CSS_MUT: Partial<Record<Exclude<Mut, "">, string>> = {
  /* BFL-8: the ruler's dates at 10px */
  tiny: '.bw-rm { font-size: 10px !important; }',
};

type Row = { lock: string; where: string; ok: boolean; detail: string };
class Ledger {
  rows: Row[] = [];
  constructor(public mut: Mut, public part: string) {}
  check(lock: string, where: string, ok: boolean, detail = "") { this.rows.push({ lock, where, ok: !!ok, detail: String(detail).slice(0, 700) }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${this.part}${this.mut ? `.mut-${this.mut}` : ""}.json`, JSON.stringify(this.rows, null, 1));
    const red = this.rows.filter((r) => !r.ok);
    for (const r of red.slice(0, 40)) console.log(`  ✗ ${r.lock} · ${r.where} — ${r.detail.slice(0, 300)}`);
    console.log(`  ${this.part}${this.mut ? ` [mut ${this.mut}]` : " [green]"}: ${this.rows.length} readings, ${red.length} red`);
    if (this.mut) {
      const lock = MUT_LOCK[this.mut as Exclude<Mut, "">], own = red.filter((r) => r.lock === lock).length;
      console.log(`  MUTATION ${this.mut} → ${lock}: ${own} red (${red.length - own} elsewhere)`);
      writeFileSync(`${DIR}/ledger/mut-${this.mut}.summary.json`, JSON.stringify({ mut: this.mut, lock, own, other: red.length - own, readings: this.rows.length }, null, 1));
      expect(own, `mutation ${this.mut} must turn ${lock} red`).toBeGreaterThan(0);
      return;
    }
    expect(this.rows.length, "fewer readings than the locks need").toBeGreaterThanOrEqual(floor);
    expect(red.map((r) => `${r.lock} · ${r.where} — ${r.detail.slice(0, 300)}`)).toEqual([]);
  }
}

/* ── pages ── */
async function signIn(page: Page) {
  await openRoute(page, "/dashboard", DESK); /* the harness's shell check is the desktop's */
  await page.evaluate(() => { try { localStorage.setItem("bw1.hint.seen", "1"); localStorage.setItem("bw3.folded", "[]"); } catch { /* */ } });
  await page.setViewportSize(PHONE);
}
/** the day's memory: cleared (the next open is the day's first), or set to a stamp */
const setDay = (page: Page, v: string | null) => page.evaluate(([k, x]) => { try { if (x == null) localStorage.removeItem(k!); else localStorage.setItem(k!, x); } catch { /* */ } }, [KEY, v] as const);
/** opens Birds-eye and waits for the world's layer to say how it arrived ("playing" or "fade") */
async function openBirds(page: Page, path = BIRDS): Promise<string> {
  await page.goto(path);
  await page.waitForFunction(() => { const l = document.querySelector<HTMLElement>('[data-bw="layer"]'); return !!l && !!l.dataset.look; }, null, { timeout: 30_000, polling: "raf" });
  return page.evaluate(() => document.querySelector<HTMLElement>('[data-bw="layer"]')!.dataset.look!);
}
/** waits until `ms` after the grow-in started (the layer's own t0) */
const until = (page: Page, ms: number) => page.waitForFunction((m) => { const t0 = Number(document.querySelector<HTMLElement>('[data-bw="layer"]')?.dataset.t0); return Number.isFinite(t0) && performance.now() - t0 >= m; }, ms, { polling: "raf", timeout: 10_000 });
/** the grow-in's animations on the world, read */
const anims = (page: Page) => page.evaluate(() => document.getAnimations().map((a) => {
  const t = (a.effect as KeyframeEffect | null)?.target as HTMLElement | null, tm = a.effect?.getTiming(), ct = a.effect?.getComputedTiming();
  return { inWorld: !!t?.closest('[data-bw="layer"]'), cls: t?.className ?? "", row: t?.dataset.row ?? "", left: parseFloat(t?.style.left ?? "") || 0, delay: Number(tm?.delay ?? 0), dur: Number(tm?.duration ?? 0), p: ct?.progress ?? null, scale: JSON.stringify((a.effect as KeyframeEffect | null)?.getKeyframes?.()[0]?.scale ?? null) };
}).filter((a) => a.inWorld));
/** the headings' counts, and their numbers */
const counts = (page: Page) => page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-bw="group"]')].map((g) => ({ g: g.dataset.g!, n: Number(g.dataset.n), shown: g.querySelector("em")?.textContent ?? "" })));
/** text under 12px, and any "overdue" or "late", in `sel` */
const textAudit = (page: Page, sel: string) => page.evaluate((s) => {
  const small: string[] = [], words: string[] = [];
  for (const root of document.querySelectorAll<HTMLElement>(s)) {
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      const t = (n.textContent ?? "").trim(), el = n.parentElement;
      if (!t || !el) continue;
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden") continue;
      if (parseFloat(cs.fontSize) < 11.95) small.push(`${t.slice(0, 30)} ${cs.fontSize}`);
      if (/\boverdue\b|\blate\b/i.test(t)) words.push(t.slice(0, 40));
    }
  }
  return { small, words };
}, sel);

test.use({ viewport: PHONE, deviceScaleFactor: 2 });
const runs: Mut[] = process.env.BFL_MUTATE === "all" ? ["", ...MUTS] : process.env.BFL_MUTATE ? (process.env.BFL_MUTATE.split(",") as Mut[]) : [""];
const ONLY = (process.env.BFL_ONLY ?? "").split(",").filter(Boolean);
const on = (k: string) => !ONLY.length || ONLY.includes(k);

for (const mut of runs) {
  test(`Birds-eye first look v1 — the locks${mut ? ` · mutation ${mut}` : ""}`, async ({ page }, info) => {
    test.skip(info.project.name !== "pixel" || !!process.env.BFL_SHOTS, "Chromium phone only");
    test.setTimeout(600_000);
    page.setDefaultTimeout(20_000);
    const L = new Ledger(mut, "locks");
    const errs: string[] = [];
    page.on("pageerror", (e) => errs.push(`pageerror: ${String(e).slice(0, 300)}`));
    const init = mut ? INIT_MUT[mut] : undefined;
    if (init) await page.addInitScript(init);
    await signIn(page);
    const css = mut ? CSS_MUT[mut] : undefined;
    const withCss = async () => { if (css) { await page.addStyleTag({ content: css }); await frame(page, 150); } };

    /* ── BFL-1 · the day's first open plays in full; the next fades; a new day plays again ──
       ── BFL-2 · within a row, no piece starts before the one to its left has finished ──
       ── BFL-3 · a heading's count reads 0 near the start and its number by 900ms ── */
    if (on("BFL-1") || on("BFL-2") || on("BFL-3")) {
      await setDay(page, null);
      const how = await openBirds(page);
      L.check("BFL-1", "the day's first open: the bars grow in", how === "playing", how);
      if (how === "playing") {
        if (mut === "count") await page.evaluate(() => { const t = setInterval(() => { for (const e of document.querySelectorAll<HTMLElement>('[data-bw="group"] em')) e.textContent = "0"; }, 8); setTimeout(() => clearInterval(t), 1400); });
        await until(page, 60);
        const c0 = await counts(page);
        L.check("BFL-3", `near the start (60ms) every count reads 0 (${c0.length} headings)`, c0.length > 0 && c0.some((c) => c.n > 0) && c0.every((c) => c.shown === "0"), JSON.stringify(c0));
        /* BFL-2, read off the animations themselves */
        const a = await anims(page);
        const bars = a.filter((x) => x.scale === '"0 1"'), byRow = new Map<string, typeof bars>();
        for (const b of bars) { if (!byRow.has(b.row)) byRow.set(b.row, []); byRow.get(b.row)!.push(b); }
        const bad: string[] = [];
        let multi = 0;
        for (const [r, list] of byRow) {
          list.sort((x, y) => x.left - y.left);
          if (list.length > 1) multi += 1;
          for (let i = 1; i < list.length; i++) if (list[i].delay < list[i - 1].delay + list[i - 1].dur - 0.5) bad.push(`${r}: piece ${i} starts ${list[i].delay.toFixed(0)}, the one before ends ${(list[i - 1].delay + list[i - 1].dur).toFixed(0)}`);
        }
        L.check("BFL-2", `rows of two or more pieces (${multi} of ${byRow.size}): each piece starts as the one before ends`, multi > 0 && bad.length === 0, bad.slice(0, 4).join(" · "));
        const wipes = [...byRow.values()].map((l) => { const s = Math.min(...l.map((x) => x.delay)), e = Math.max(...l.map((x) => x.delay + x.dur)); return e - s; });
        L.check("BFL-2", "each row's wipe takes 560ms from its first piece to its end", wipes.length > 0 && wipes.every((w) => Math.abs(w - 560) < 1 || mut === "overlap"), JSON.stringify(wipes.slice(0, 6).map((w) => Math.round(w))));
        const lastEnd = Math.max(...bars.map((x) => x.delay + x.dur));
        L.check("BFL-1", `the last row's wipe ends by 2s (${Math.round(lastEnd)}ms, ${byRow.size} rows)`, lastEnd <= 2000.5 || mut === "overlap", "");
        await until(page, 400);
        /* a row is mid-wipe when its first piece has started and its last has not ended */
        const now = await page.evaluate(() => performance.now() - Number(document.querySelector<HTMLElement>('[data-bw="layer"]')!.dataset.t0));
        const rowsMid = [...byRow.values()].filter((l) => { const s = Math.min(...l.map((x) => x.delay)), e = Math.max(...l.map((x) => x.delay + x.dur)); return s < now && now < e; }).length;
        const rowsAhead = [...byRow.values()].filter((l) => Math.min(...l.map((x) => x.delay)) > now).length;
        const growing = (await anims(page)).filter((x) => x.scale === '"0 1"' && x.p != null && x.p > 0 && x.p < 1).length;
        L.check("BFL-1", `at ${Math.round(now)}ms some rows are mid-wipe (${rowsMid}; ${rowsAhead} yet to start; ${growing} pieces growing)`, rowsMid > 0 && growing > 0 && rowsAhead > 0, `step ${await page.evaluate(() => document.querySelector<HTMLElement>('[data-bw="layer"]')!.dataset.step)}ms`);
        await until(page, 900);
        const c9 = await counts(page);
        L.check("BFL-3", "by 900ms every count reads its number", c9.every((c) => c.shown === String(c.n)), JSON.stringify(c9));
        await until(page, 2200);
        const end = await page.evaluate(() => ({ look: document.querySelector<HTMLElement>('[data-bw="layer"]')!.dataset.look, n: document.getAnimations().filter((a) => ((a.effect as KeyframeEffect | null)?.target as Element | null)?.closest?.('[data-bw="layer"]')).length, looking: document.querySelector<HTMLElement>('[data-bw="world"]')!.dataset.looking, badge: !!document.querySelector('[data-bw="news-count"]'), news: Number(document.querySelector<HTMLElement>('[data-bw="world"]')!.dataset.news) }));
        const ce = await counts(page);
        L.check("BFL-1", "at 2.2s everything is in its end state (no animation on the world, every count its number)", end.look === "done" && end.n === 0 && end.looking === "0" && ce.every((c) => c.shown === String(c.n)), JSON.stringify(end));
      }
      const again = await openBirds(page);
      await frame(page, 120);
      const scaled = (await anims(page)).filter((x) => x.scale !== "null").length;
      L.check("BFL-1", "a second open the same day only fades", again === "fade" && scaled === 0, `${again}, ${scaled} growing`);
      await setDay(page, "2000-1-1");
      const nd = await openBirds(page);
      L.check("BFL-1", "a new day plays it again", nd === "playing", nd);
      await frame(page, 2300);
    }

    /* ── BFL-4 · a touch at 300ms ends it within one frame ── */
    if (on("BFL-4")) {
      await setDay(page, null);
      const how = await openBirds(page);
      if (how === "playing") {
        await until(page, 300);
        const at = await page.locator('[data-bw="head"] .bw-h').first().boundingBox();
        await page.mouse.move((at?.x ?? 160) + 20, (at?.y ?? 60) + 10);
        await page.mouse.down();
        const r = await page.evaluate(() => new Promise<{ look: string; n: number; counts: boolean }>((res) => requestAnimationFrame(() => {
          const l = document.querySelector<HTMLElement>('[data-bw="layer"]')!;
          res({ look: l.dataset.look ?? "", n: document.getAnimations().filter((a) => ((a.effect as KeyframeEffect | null)?.target as Element | null)?.closest?.('[data-bw="layer"]')).length, counts: [...document.querySelectorAll<HTMLElement>('[data-bw="group"]')].every((g) => g.querySelector("em")?.textContent === g.dataset.n) });
        })));
        await page.mouse.up();
        L.check("BFL-4", "a touch at 300ms: within one frame nothing is still growing and every count reads its number", r.look === "done" && r.n === 0 && r.counts, JSON.stringify(r));
      } else L.check("BFL-4", "the day's first open played", false, how);
      await frame(page, 2300);
    }

    /* ── BFL-5 · with reduced motion: no scale, only the fade ── */
    if (on("BFL-5")) {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await setDay(page, null);
      const how = await openBirds(page);
      await frame(page, 100);
      const a = await anims(page);
      L.check("BFL-5", "reduced motion, the day's first open: the fade, and nothing scales", how === "fade" && a.every((x) => x.scale === "null"), `${how}, ${a.length} animations`);
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await frame(page, 300);
    }

    /* BFL-6 and BFL-7 (the three-week preview's order and its row's flight) retired with the preview: Birds-eye polish v1
       puts My queries on Today (BP-6 in phoneBirdsPolish.measure.ts) */

    /* ── BFL-8 · no text under 12px; never "overdue" or "late" (Birds-eye mid-grow; Today's card is BP-8's) ── */
    if (on("BFL-8")) {
      await setDay(page, null);
      const how = await openBirds(page);
      await withCss();
      if (how === "playing") await until(page, 400);
      const b = await textAudit(page, '[data-bw="world"]');
      L.check("BFL-8", "Birds-eye while the bars grow: no text under 12px, never “overdue” or “late”", b.small.length === 0 && b.words.length === 0, [...b.small, ...b.words].slice(0, 6).join(" · "));
      await frame(page, 2300);
    }

    L.check("BFL-8", "no page error", errs.length === 0, errs.slice(0, 3).join(" · "));
    L.done(ONLY.length ? 1 : 12);
  });
}

/* ── the shots: the build at the ref's moments, beside the ref ── */
const MOMENTS: [string, number | null][] = [["01-grow-150ms", 150], ["02-grow-400ms", 400], ["03-grow-700ms", 700], ["04-grow-1000ms", 1000], ["05-grow-1400ms", 1400], ["06-grow-done", null]];
test("Birds-eye first look v1 — the shots beside the ref's", async ({ page }, info) => {
  test.skip(info.project.name !== "pixel" || !process.env.BFL_SHOTS, "BFL_SHOTS=1, Chromium phone");
  test.setTimeout(600_000);
  mkdirSync(`${DIR}/shots`, { recursive: true });
  await signIn(page);
  const pairs: string[] = [];
  for (const [name, t] of MOMENTS) {
    await setDay(page, null);
    await openBirds(page);
    if (t != null) {
      await page.evaluate(async (ms) => {
        window.requestAnimationFrame = () => 0;
        await new Promise((r) => setTimeout(r, 40));
        for (const a of document.getAnimations()) { if (((a.effect as KeyframeEffect | null)?.target as Element | null)?.closest?.('[data-bw="layer"]')) { a.pause(); a.currentTime = ms; } }
        const k = Math.max(0, Math.min(1, (ms - 120) / 700));
        for (const g of document.querySelectorAll<HTMLElement>('[data-bw="group"]')) { const em = g.querySelector("em"); if (em) em.textContent = String(Math.round(Number(g.dataset.n) * k * k * (3 - 2 * k))); }
      }, t);
    } else await frame(page, 2600);
    await page.screenshot({ path: `${DIR}/shots/${name}-build.png` });
    copyFileSync(`${REF}/${name}.png`, `${DIR}/shots/${name}-ref.png`);
    pairs.push(name);
    if (t != null) await frame(page, 2300);
  }
  writeFileSync(`${DIR}/shots/index.html`, `<!doctype html><meta charset="utf-8"><title>Birds-eye first look v1 — build beside ref</title><style>body{font:14px system-ui;margin:24px;background:#f4f2ee}section{margin:0 0 32px}h2{font-size:16px}div{display:flex;gap:16px}figure{margin:0}img{width:390px;border:1px solid #ccc;background:#fff}figcaption{font-size:12px;color:#555}</style>${pairs.map((p) => `<section><h2>${p}</h2><div><figure><img src="${p}-ref.png"><figcaption>ref</figcaption></figure><figure><img src="${p}-build.png"><figcaption>build</figcaption></figure></div></section>`).join("")}`);
});
