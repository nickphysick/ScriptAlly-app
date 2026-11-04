/**
 * Smart Import from photos v1.1 — the locks that need a rendered page (Phase A and C).
 *   SIP_BASE=http://127.0.0.1:4474 node tests/e2e/smartImportPhotos/locksV11.mjs [--only A1,A2] [--shots]
 * Each lock prints PASS or FAIL with what it read; the script exits 1 on any FAIL. Run against a
 * dev build (the lab routes are gated on MODE). --shots writes the phase's screenshots to
 * reports/smart-import-photos-v1-1/.
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const BASE = process.env.SIP_BASE; if (!BASE) throw new Error("SIP_BASE is required");
const argv = process.argv.slice(2);
const ONLY = argv.includes("--only") ? argv[argv.indexOf("--only") + 1].split(",") : null;
const SHOTS = argv.includes("--shots");
const OUT = resolve("reports/smart-import-photos-v1-1"); if (SHOTS) mkdirSync(OUT, { recursive: true });
const FX = resolve("functions/eval/fixtures/photos");
const PHOTO = `${FX}/hand-caveat-1p-sharp/page-1.jpg`;

const results = [];
const lock = async (id, fn) => {
  if (ONLY && !ONLY.includes(id)) return;
  try { const r = await fn(); results.push({ id, ok: r.ok, read: r.read }); console.log(`${r.ok ? "PASS" : "FAIL"} ${id} ${JSON.stringify(r.read)}`); }
  catch (e) { results.push({ id, ok: false, read: String(e.message ?? e).slice(0, 300) }); console.log(`FAIL ${id} threw: ${String(e.message ?? e).slice(0, 300)}`); }
};
const browser = await chromium.launch();
const open = async (w, h, hash, motion = "reduce") => {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: motion });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/#/onb-lab?${hash}`);
  return { ctx, page };
};

/* A1 — the genre list sits above the age section and can be clicked. */
await lock("A1", async () => {
  /* Motion ON: the fault comes from the fields' entrance animations, which reduced motion switches off. */
  const { ctx, page } = await open(1440, 900, "s=bookmore&filled=1", "no-preference");
  await page.waitForSelector('[data-o9="genre-search"] input');
  await page.waitForTimeout(1600); // the card's entrance (typing) has finished
  await page.fill('[data-o9="genre-search"] input', "ro");
  await page.waitForSelector('[data-o9="genre-drop"] [role="option"]');
  await page.waitForTimeout(200);
  const read = await page.evaluate(() => {
    const opts = [...document.querySelectorAll('[data-o9="genre-drop"] [role="option"]')];
    const drop = document.querySelector('[data-o9="genre-drop"]').getBoundingClientRect();
    const covered = opts.map((o) => {
      const r = o.getBoundingClientRect();
      const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return { label: o.textContent, onTop: !!top && (top === o || o.contains(top)), at: top?.className?.toString?.() ?? top?.tagName };
    });
    return { n: opts.length, dropBottom: Math.round(drop.bottom), vh: innerHeight, covered };
  });
  if (SHOTS) await page.screenshot({ path: `${OUT}/genre-list-1440.png` });
  const romance = page.locator('[data-o9="genre-drop"] [role="option"]', { hasText: /^Romance$/ });
  let clicked = false;
  if (await romance.count()) { await romance.click({ timeout: 3000 }).then(() => { clicked = true; }).catch(() => {}); }
  const picked = clicked && (await page.locator('.o9-pill.is-on', { hasText: "Romance" }).count()) > 0;
  await ctx.close();
  const ok = read.n > 0 && read.covered.every((c) => c.onTop) && read.dropBottom <= read.vh && picked;
  return { ok, read: { ...read, covered: read.covered.filter((c) => !c.onTop), picked } };
});

/* A1b — in a short window the list still lands on screen (flipped up, or the card scrolled). */
await lock("A1b", async () => {
  const { ctx, page } = await open(1440, 560, "s=bookmore&filled=1", "no-preference");
  await page.waitForSelector('[data-o9="genre-search"] input');
  await page.waitForTimeout(1600);
  await page.locator('[data-o9="genre-search"] input').scrollIntoViewIfNeeded();
  await page.evaluate(() => { const i = document.querySelector('[data-o9="genre-search"] input'); const r = i.getBoundingClientRect(); const sc = document.querySelector('[data-sf="scroll"]'); if (sc) sc.scrollTop += r.top - (innerHeight - 70); });
  await page.fill('[data-o9="genre-search"] input', "a");
  await page.waitForSelector('[data-o9="genre-drop"] [role="option"]');
  await page.waitForTimeout(250);
  const read = await page.evaluate(() => {
    const d = document.querySelector('[data-o9="genre-drop"]'); const r = d.getBoundingClientRect();
    const o = d.querySelector('[role="option"]').getBoundingClientRect();
    const top = document.elementFromPoint(o.left + o.width / 2, o.top + o.height / 2);
    return { up: d.classList.contains("is-up"), top: Math.round(r.top), bottom: Math.round(r.bottom), vh: innerHeight, firstOnTop: !!top && d.contains(top) };
  });
  await ctx.close();
  return { ok: read.top >= 0 && read.bottom <= read.vh && read.firstOnTop, read };
});

/* A2 — "Use photos" opens the empty photos screen without touching the picker; "Choose photos" opens
   it from inside its own click. */
await lock("A2", async () => {
  const { ctx, page } = await open(1440, 900, "s=photos");
  await page.addInitScript(() => {});
  await page.evaluate(() => {
    const w = window; w.__clicks = []; w.__inClick = false;
    const orig = HTMLInputElement.prototype.click;
    HTMLInputElement.prototype.click = function () {
      if (this.getAttribute("data-picker") === "photos") w.__clicks.push({ sync: w.__inClick });
      /* never open a real dialog in the harness */
    };
    w.__orig = orig;
    document.addEventListener("click", () => { w.__inClick = true; setTimeout(() => { w.__inClick = false; }, 0); }, true);
  });
  await page.waitForSelector('[data-act="photos"]');
  await page.click('[data-act="photos"]');
  await page.waitForTimeout(1200);
  const afterUse = await page.evaluate(() => ({
    clicks: window.__clicks.length,
    empty: !!document.querySelector('[data-sf="photos-empty"]'),
    choose: document.querySelector('[data-act="choose"]')?.textContent ?? null,
    read: !!document.querySelector('[data-act="read"]'),
    title: document.querySelector('[data-sf="photos-title"] h1')?.textContent ?? null,
  }));
  if (SHOTS) await page.screenshot({ path: `${OUT}/photos-empty-1440.png`, fullPage: true });
  let afterChoose = null;
  if (afterUse.choose) {
    await page.click('[data-act="choose"]');
    afterChoose = await page.evaluate(() => window.__clicks.slice());
  }
  await ctx.close();
  const ok = afterUse.clicks === 0 && afterUse.empty && afterUse.choose === "Choose photos" && !afterUse.read
    && !!afterChoose && afterChoose.length === 1 && afterChoose[0].sync === true;
  return { ok, read: { afterUse, afterChoose } };
});

/* A3 — the heading is one line at 1440 × 900 and 1204 × 800, and fits from a 900px window up. */
await lock("A3", async () => {
  const out = {};
  let ok = true;
  for (const [w, h] of [[1440, 900], [1204, 800], [901, 800]]) {
    const { ctx, page } = await open(w, h, "s=photos");
    await page.waitForSelector('[data-act="photos"]');
    await page.click('[data-act="photos"]');
    await page.waitForSelector('[data-sf="photos-title"] h1', { timeout: 4000 }).catch(() => {});
    await page.evaluate(() => document.fonts.ready);
    const r = await page.evaluate(() => {
      const h1 = document.querySelector('[data-sf="photos-title"] h1') ?? document.querySelector('[data-screen="photos"] h1');
      if (!h1) return null;
      const cs = getComputedStyle(h1);
      const range = document.createRange(); range.selectNodeContents(h1);
      const rects = [...range.getClientRects()];
      const lines = new Set(rects.map((x) => Math.round(x.top))).size;
      const ink = Math.max(...rects.map((x) => x.right)) - Math.min(...rects.map((x) => x.left));
      const col = h1.parentElement.getBoundingClientRect().width;
      return { text: h1.textContent, fontSize: cs.fontSize, family: cs.fontFamily.split(",")[0], lines, ink: Math.round(ink), col: Math.round(col), height: Math.round(h1.getBoundingClientRect().height) };
    });
    out[`${w}x${h}`] = r;
    const want = "Ok. Let's turn your photos into a smart QueryHawk database.";
    if (!r || r.text !== want || r.lines !== 1 || r.ink > r.col + 1 || !/Special Elite/.test(r.family)) ok = false;
    await ctx.close();
  }
  return { ok, read: out };
});

/* Shots: the filled photos screen at 1440 and 390, and the empty one at 390. */
if (SHOTS && (!ONLY || ONLY.includes("shots"))) {
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const { ctx, page } = await open(w, h, "s=photos");
    await page.waitForSelector('[data-act="photos"]');
    await page.click('[data-act="photos"]');
    await page.waitForSelector('[data-sf="photos-empty"]');
    if (w === 390) await page.screenshot({ path: `${OUT}/photos-empty-390.png`, fullPage: true });
    await page.setInputFiles('[data-picker="photos"]', [PHOTO, `${FX}/hand-indie-2p-blur/page-1.jpg`]);
    await page.waitForFunction(() => document.querySelectorAll('[data-sf="photo"][data-status="ready"]').length === 2, null, { timeout: 30000 });
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/photos-filled-${w}.png`, fullPage: true });
    await ctx.close();
  }
}

await browser.close();
if (SHOTS) writeFileSync(`${OUT}/phaseA-locks.json`, JSON.stringify(results, null, 2) + "\n");
const failed = results.filter((r) => !r.ok);
console.log(`${results.length - failed.length} of ${results.length} passed`);
process.exit(failed.length ? 1 : 0);
