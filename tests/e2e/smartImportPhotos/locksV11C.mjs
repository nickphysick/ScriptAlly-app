/**
 * Smart Import from photos v1.1 — Phase C: the dashboard behind the importing loader.
 *   SIP_BASE=http://127.0.0.1:4484 node tests/e2e/smartImportPhotos/locksV11C.mjs [--only C1,C2] [--shots]
 * On the lab's importing screen with `intro=1` (armed as a real commit arms it): every card is a
 * pure skeleton, no text shows behind the progress card but its own, and the corner hawk rises,
 * looks at the writer at 2.0s and goes back to his clipboard at 3.2s. With reduced motion he is
 * simply there. The rest-box lock against the loaded dashboard is hawkRest.measure.ts (it needs a
 * signed-in dashboard, so it runs on the emulator harness).
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const BASE = process.env.SIP_BASE; if (!BASE) throw new Error("SIP_BASE is required");
const argv = process.argv.slice(2);
const ONLY = argv.includes("--only") ? argv[argv.indexOf("--only") + 1].split(",") : null;
const SHOTS = argv.includes("--shots");
const OUT = resolve("reports/smart-import-photos-v1-1"); if (SHOTS) mkdirSync(OUT, { recursive: true });
const results = [];
const lock = async (id, fn) => {
  if (ONLY && !ONLY.includes(id)) return;
  try { const r = await fn(); results.push({ id, ok: r.ok, read: r.read }); console.log(`${r.ok ? "PASS" : "FAIL"} ${id} ${JSON.stringify(r.read)}`); }
  catch (e) { results.push({ id, ok: false, read: String(e.message ?? e).slice(0, 300) }); console.log(`FAIL ${id} threw: ${String(e.message ?? e).slice(0, 300)}`); }
};
const browser = await chromium.launch();
/** Open the importing screen; the returned `t0` is when the page started, so reads are timed from it. */
const open = async (motion = "no-preference", hash = "s=importing&handoff=1&intro=1&shape=querying") => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: motion });
  /* the querying shape (the one Nick saw: Next up, Active queries…): the loading page draws the shape
     its memory last saw, and the lab has none, so seed it */
  if (hash.includes("shape=querying")) await ctx.addInitScript(() => { try { localStorage.setItem("sa.dash58Shape", JSON.stringify({ pre: false, agents: true })); } catch { /* */ } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/#/onb-lab?${hash}`);
  await page.waitForSelector('[data-im="ghost"]');
  const t0 = await page.evaluate(() => performance.now());
  return { ctx, page, t0 };
};
const at = async (page, t0, ms) => { const now = await page.evaluate(() => performance.now()); if (ms > now - t0) await page.waitForTimeout(ms - (now - t0)); };
const hawk = (page) => page.evaluate(() => {
  const p = document.querySelector('[data-d2="hawk"]');
  if (!p) return null;
  const r = p.querySelector(".d2-rise")?.getBoundingClientRect(), box = p.getBoundingClientRect();
  const op = (s) => Number(getComputedStyle(p.querySelector(s)).opacity);
  return { look: p.hasAttribute("data-intro-look"), intro: p.hasAttribute("data-intro"), rest: op(".d2-p1"), looking: op(".d2-p2"),
    riseTop: r ? Math.round(r.top * 10) / 10 : null, boxTop: Math.round(box.top * 10) / 10, box: [box.left, box.top, box.width, box.height].map((v) => Math.round(v * 10) / 10),
    animations: p.getAnimations({ subtree: true }).filter((a) => a.playState !== "finished" && !(a instanceof CSSTransition)).length,
    /* drawn on top: nothing paints over him (the set-up frame is a z-index 9999 layer). His box takes
       no pointer events, so they are switched on for this one read. */
    onTop: (() => { const was = p.style.pointerEvents; p.style.pointerEvents = "auto"; p.querySelectorAll("*").forEach((e) => (e.style.pointerEvents = "auto"));
      const e = document.elementFromPoint(box.left + box.width * 0.6, box.top + box.height * 0.6); p.style.pointerEvents = was; p.querySelectorAll("*").forEach((x) => (x.style.pointerEvents = ""));
      return !!e && p.contains(e); })() };
});

/* C1 — nothing but the progress card says anything: every card is a pure skeleton */
await lock("C1", async () => {
  const { ctx, page } = await open();
  await page.waitForTimeout(700);
  const read = await page.evaluate(() => {
    const g = document.querySelector('[data-im="ghost"]');
    const shown = (e) => { for (let x = e; x && x !== document.body; x = x.parentElement) { const cs = getComputedStyle(x); if (cs.visibility === "hidden" || cs.display === "none" || cs.opacity === "0") return false; } const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    const texts = [];
    const w = document.createTreeWalker(g, NodeFilter.SHOW_TEXT); let n;
    while ((n = w.nextNode())) { const s = n.textContent.trim(); if (!s) continue; const e = n.parentElement; if (e.closest('[data-d2="buttons"]')) continue; if (shown(e)) texts.push(s.slice(0, 40)); }
    const imgs = [...g.querySelectorAll("img, svg")].filter((e) => !e.closest('[data-d2="buttons"]') && shown(e)).length;
    const cards = [...g.querySelectorAll('[data-d2="grid"] :is(.os-card, .d2-gs)')];
    const bands = cards.map((c) => { const b = c.querySelector(".os-band, .d2-fwtop, .fv2-gsh"); return b ? /gradient/.test(getComputedStyle(b).backgroundImage) : null; });
    const feed = g.querySelector('[data-d2="feed-skeleton"]');
    return { cards: cards.length, cardNames: cards.map((c) => c.getAttribute("data-d2-card") ?? c.className.split(" ").slice(0, 3).join(".")), bandsShimmer: bands, texts, imgs, feedSkeleton: !!feed,
      buttons: !!g.querySelector('[data-d2="buttons"]') };
  });
  if (SHOTS) await page.screenshot({ path: `${OUT}/handoff-skeleton-1440.png` });
  await ctx.close();
  const ok = read.cards >= 3 && read.texts.length === 0 && read.imgs === 0 && read.bandsShimmer.every((b) => b !== false) && read.feedSkeleton;
  return { ok, read };
});

/* C2–C4 — the sequence: rising by 1.0s, at rest and visible by 1.5s, looking at 2.1s, back at 3.4s */
await lock("C2-C4", async () => {
  const { ctx, page, t0 } = await open();
  await at(page, t0, 300); const before = await hawk(page);
  await at(page, t0, 750); if (SHOTS) await page.screenshot({ path: `${OUT}/handoff-hawk-rising-1440.png` });
  await at(page, t0, 1000); const mid = await hawk(page);
  await at(page, t0, 1600); const rest = await hawk(page);
  await at(page, t0, 2100); const look = await hawk(page);
  await at(page, t0, 2300); if (SHOTS) await page.screenshot({ path: `${OUT}/handoff-hawk-looking-1440.png` });
  await at(page, t0, 3400); const back = await hawk(page);
  await at(page, t0, 3700); if (SHOTS) await page.screenshot({ path: `${OUT}/handoff-hawk-back-1440.png` });
  const end = await hawk(page);
  await ctx.close();
  const ok = !!before && before.riseTop >= 900 - 8 && !!mid && mid.riseTop < before.riseTop && mid.riseTop > rest.riseTop - 30
    && Math.abs(rest.riseTop - rest.boxTop) <= 1 && rest.rest === 1 && rest.onTop
    && look.look && look.looking > look.rest
    && !back.look && back.rest === 1 && back.looking === 0
    && !end.intro && Math.abs(end.riseTop - end.boxTop) <= 1;
  return { ok, read: { before, mid, rest, look, back, end } };
});

/* C5 — reduced motion: no rise and no swaps; he is there, at rest, from the start */
await lock("C5", async () => {
  const { ctx, page, t0 } = await open("reduce");
  await at(page, t0, 200); const early = await hawk(page);
  await at(page, t0, 2300); const later = await hawk(page);
  await ctx.close();
  const ok = !!early && early.animations === 0 && Math.abs(early.riseTop - early.boxTop) <= 1 && early.rest === 1 && !early.look && !later.look && later.rest === 1;
  return { ok, read: { early, later } };
});

/* C6 — an ordinary loading page (no import committed) has no hawk */
await lock("C6", async () => {
  const { ctx, page } = await open("no-preference", "s=importing&handoff=1&shape=querying");
  await page.waitForTimeout(800);
  const read = await hawk(page);
  await ctx.close();
  return { ok: read === null, read };
});

await browser.close();
if (SHOTS) writeFileSync(`${OUT}/phaseC-locks.json`, JSON.stringify(results, null, 2) + "\n");
const failed = results.filter((r) => !r.ok);
console.log(`${results.length - failed.length} of ${results.length} passed`);
process.exit(failed.length ? 1 : 0);
