/**
 * Smart Import loader v2 — measured on the lab's simulated stream (#/onb-lab?s=reading&rows=…),
 * at 1440×900 and 1280×800. Nothing here calls the function or spends anything.
 *
 *   L1 the estimate: before the first chunk the right text is "{N} rows · {fmtEst}"
 *   L2 progress: the fill rises with the rows, and the left text names the same row as the fill
 *   L3 the retired words never render: no "almost there…", no "Larger import", no "/ 8"
 *   L4 the tips card: on screen, clear of the foot bar, ≤ 40% of the stage, and no tip overflows
 *      its 118px stack, at either width
 *   L5 the ending is unchanged: settle → tick → proceed on the same timings
 *   L6 reduced motion: no shimmer animation, no tip fade or auto-advance; Next tip still works
 *
 * Each lock has a named mutation (IL2_MUTATE=<name>) that breaks the thing it reads, applied in the
 * page, so every lock can be proved red without a rebuild:
 *   est-text · fill-backwards · old-text · tips-overlap · tips-overflow · ending-slow · shim-moves
 */
import { test, expect, type Page } from "@playwright/test";
import { appendFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const MUTATE = process.env.IL2_MUTATE ?? "";
const OUT = resolve(process.cwd(), "reports", "smart-import-loader-v2");
const SIZES = [{ width: 1440, height: 900 }, { width: 1280, height: 800 }];
const record = (lock: string, name: string, value: unknown) => {
  mkdirSync(OUT, { recursive: true });
  appendFileSync(resolve(OUT, `readings${MUTATE ? `-mutated-${MUTATE}` : ""}.jsonl`), JSON.stringify({ lock, name, value }) + "\n");
};

/** Mutations that must run before the page's own scripts. */
const INIT: Record<string, string> = {
  "est-text": `new MutationObserver(() => { const el = document.querySelector('[data-im="left"]'); if (el && el.textContent !== "about 5 minutes") el.textContent = "about 5 minutes"; }).observe(document, { subtree: true, childList: true, characterData: true });`,
  "fill-backwards": `new MutationObserver(() => { const el = document.querySelector('[data-im="fill"]'); const m = /Reading row (\\d+) of (\\d+)/.exec(document.querySelector('[data-im="status"]')?.textContent || ""); if (el && m) { const w = (100 - (+m[1] / +m[2]) * 90) + "%"; if (el.style.width !== w) el.style.width = w; } }).observe(document, { subtree: true, childList: true, attributes: true, characterData: true });`,
  // The retired words come back in the right-hand text while the left still reads "Reading row…", so
  // L3's own check — not its precondition — is what has to catch it.
  "old-text": `new MutationObserver(() => { const st = document.querySelector('[data-im="status"]'); const el = document.querySelector('[data-im="left"]'); if (st && el && /Reading row/.test(st.textContent || "") && el.textContent !== "Larger import — almost there…") el.textContent = "Larger import — almost there…"; }).observe(document, { subtree: true, childList: true, characterData: true });`,
  "ending-slow": `{ const st = window.setTimeout.bind(window); window.setTimeout = (fn, ms, ...a) => st(fn, (ms || 0) >= 1900 && (ms || 0) <= 4000 ? ms + 1200 : ms, ...a); }`,
};
const CSS: Record<string, string> = {
  "tips-overlap": ".sf .im-tip{bottom:-60px!important}",
  "tips-overflow": ".sf .im-tip .im-tip-body{font-size:21px!important}",
  "shim-moves": ".sf .im-ssl-track i.im-ssl-shim{animation:imSslShim 1.4s linear infinite!important}",
};

async function open(page: Page, q: string, vp: { width: number; height: number }, motion: "reduce" | "no-preference" = "no-preference") {
  if (INIT[MUTATE]) await page.addInitScript(INIT[MUTATE]);
  await page.emulateMedia({ reducedMotion: motion });
  await page.setViewportSize(vp);
  await page.goto("/#/onb-lab?" + q, { waitUntil: "load" });
  await page.reload({ waitUntil: "load" });
  await page.locator('[data-im="strip"]').first().waitFor({ state: "visible", timeout: 20_000 });
  if (CSS[MUTATE]) await page.addStyleTag({ content: CSS[MUTATE] });
}
const text = (page: Page, sel: string) => page.locator(sel).first().textContent().then((t) => (t ?? "").trim());

test.describe("Smart Import loader v2", () => {
  test.describe.configure({ mode: "serial" });

  for (const vp of SIZES) {
    test(`L1 the estimate before the first chunk @${vp.width}`, async ({ page }) => {
      const want: Record<number, string> = { 40: "40 rows · about 30 seconds", 150: "150 rows · about 2 minutes", 300: "300 rows · about 3½ minutes" };
      for (const n of [40, 150, 300]) {
        await open(page, `s=reading&rows=${n}&hold=open`, vp);
        const right = await text(page, '[data-im="left"]');
        record("L1", `${n}@${vp.width}`, right);
        expect(right, `${n} rows`).toBe(want[n]);
        expect(await text(page, '[data-im="status"]')).toBe("Opening your file…");
        expect(await page.locator('[data-im="shimmer"]').count()).toBe(1);
      }
    });

    test(`L2 the fill rises with the rows, and the text names the same row @${vp.width}`, async ({ page }) => {
      await open(page, "s=reading&rows=40&speed=8&hold=work", vp);
      const seen: { d: number; style: number; rendered: number }[] = [];
      const deadline = Date.now() + 9000;
      while (Date.now() < deadline) {
        const r = await page.evaluate(() => {
          const fill = document.querySelector<HTMLElement>('[data-im="fill"]');
          const track = document.querySelector<HTMLElement>('[data-im="track"]');
          const m = /Reading row (\d+) of 40/.exec(document.querySelector('[data-im="status"]')?.textContent ?? "");
          if (!fill || !track || !m) return null;
          return { d: +m[1], style: parseFloat(fill.style.width), rendered: fill.offsetWidth / track.offsetWidth * 100 };
        });
        if (r) seen.push(r);
        if (r && r.d === 40 && Math.abs(r.rendered - 96) < 0.5) break;
        await page.waitForTimeout(60);
      }
      record("L2", `samples@${vp.width}`, { n: seen.length, first: seen[0], last: seen[seen.length - 1] });
      expect(seen.length, "the read was sampled while it ran").toBeGreaterThan(10);
      expect(new Set(seen.map((s) => s.d)).size, "many rows were seen").toBeGreaterThan(5);
      for (const s of seen) expect(s.style, `fill names row ${s.d}`).toBeCloseTo(2 + (s.d / 40) * 94, 1);
      for (let i = 1; i < seen.length; i++) {
        expect(seen[i].d).toBeGreaterThanOrEqual(seen[i - 1].d);
        expect(seen[i].rendered, `rendered width at sample ${i}`).toBeGreaterThanOrEqual(seen[i - 1].rendered - 0.3);
      }
      expect(seen[seen.length - 1].rendered - seen[0].rendered, "the bar actually moved").toBeGreaterThan(50);
    });
  }

  test("L3 the retired words never render, through a whole read", async ({ page }) => {
    await open(page, "s=reading&rows=40&speed=8", SIZES[0]);
    const texts = new Set<string>();
    const deadline = Date.now() + 14_000;
    while (Date.now() < deadline) {
      texts.add(await page.locator('[data-im="strip"]').first().innerText());
      if (await page.locator('[data-im="tick"]').count()) break;
      await page.waitForTimeout(80);
    }
    const all = [...texts];
    record("L3", "distinct strip texts", all.length);
    expect(all.some((t) => /Reading row \d+ of 40/.test(t)), "the reading phase was seen").toBe(true);
    for (const t of all) {
      expect(t).not.toMatch(/almost there…|Larger import|\/ 8\b/);
    }
  });

  for (const vp of SIZES) {
    test(`L4 the tips card @${vp.width}`, async ({ page }) => {
      await open(page, "s=reading&rows=150&hold=work", vp);
      await page.locator('[data-im="tips"]').waitFor({ state: "visible", timeout: 12_000 });
      const box = await page.evaluate(() => {
        const r = (sel: string) => { const b = document.querySelector(sel)!.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; };
        return { tip: r('[data-im="tips"]'), strip: r('[data-im="strip"]'), stage: r('[data-im="stage"]'), vw: innerWidth, vh: innerHeight };
      });
      record("L4", `boxes@${vp.width}`, box);
      expect(box.tip.w * box.tip.h, "the card is laid out").toBeGreaterThan(1000);
      expect(box.tip.x).toBeGreaterThanOrEqual(0);
      expect(box.tip.y).toBeGreaterThanOrEqual(0);
      expect(box.tip.x + box.tip.w).toBeLessThanOrEqual(box.vw);
      expect(box.tip.y + box.tip.h, "on screen").toBeLessThanOrEqual(box.vh);
      expect(box.tip.y + box.tip.h, "clear of the foot bar").toBeLessThanOrEqual(box.strip.y + 0.5);
      expect((box.tip.w * box.tip.h) / (box.stage.w * box.stage.h), "≤ 40% of the stage").toBeLessThanOrEqual(0.4);
      for (let k = 0; k < 5; k++) {
        const fit = await page.evaluate(() => {
          const on = document.querySelector<HTMLElement>(".im-tip-one.is-on")!;
          const stack = document.querySelector<HTMLElement>('[data-im="tip-stack"]')!;
          const kids = [...on.children] as HTMLElement[];
          const used = kids.reduce((s, c) => s + c.offsetHeight, 0) + 6 * (kids.length - 1);
          return { tip: document.querySelector('[data-im="tip-num"]')!.textContent, used, room: stack.clientHeight, scroll: on.scrollHeight };
        });
        record("L4", `fit@${vp.width}`, fit);
        expect(fit.used, `${fit.tip} fits its stack`).toBeLessThanOrEqual(fit.room);
        expect(fit.scroll).toBeLessThanOrEqual(fit.room);
        await page.locator('[data-im="tip-next"]').click();
        await page.waitForTimeout(80);
      }
    });
  }

  test("L5 the ending is unchanged: settle → tick → proceed on the same timings", async ({ page }) => {
    await open(page, "s=reading&rows=40&speed=8", SIZES[0]);
    const t = await page.evaluate(() => new Promise<{ settle: number; tick: number; proceed: number }>((done) => {
      const at: Record<string, number> = {};
      const look = () => {
        const root = document.querySelector('[data-im="reading"]');
        if (!at.settle && root?.getAttribute("data-im-state") === "settling") at.settle = performance.now();
        if (at.settle && !at.tick && document.querySelector('[data-im="tick"]')) at.tick = performance.now();
        if (at.settle && !at.proceed && (window as unknown as { __onbLab?: { calls: { name: string }[] } }).__onbLab?.calls.some((c) => c.name === "proceed")) at.proceed = performance.now();
        if (at.proceed) done({ settle: at.settle, tick: at.tick - at.settle, proceed: at.proceed - at.settle }); else requestAnimationFrame(look);
      };
      look();
    }));
    record("L5", "ms after the settle began", t);
    // Six sample cards: crystallise 5 × 150 + 420 = 1170; arrange +220; squeeze +720 = 2110; tick +430
    // = 2540; hand-off +1000 = 3540. The source of these is the R1 unit lock; this asserts they still run.
    expect(t.tick).toBeGreaterThan(2540 - 200);
    expect(t.tick).toBeLessThan(2540 + 350);
    expect(t.proceed).toBeGreaterThan(3540 - 200);
    expect(t.proceed).toBeLessThan(3540 + 350);
  });

  test("L6 reduced motion: no shimmer, no fade, no auto-advance — Next tip still advances", async ({ page }) => {
    await open(page, "s=reading&rows=150&hold=open", SIZES[0], "reduce");
    const shim = await page.evaluate(() => getComputedStyle(document.querySelector('[data-im="shimmer"]')!).animationName);
    record("L6", "shimmer animation", shim);
    expect(shim).toBe("none");
    await open(page, "s=reading&rows=150&hold=work", SIZES[0], "reduce");
    await page.locator('[data-im="tips"]').waitFor({ state: "visible", timeout: 12_000 });
    const fade = await page.evaluate(() => ({ card: getComputedStyle(document.querySelector('[data-im="tips"]')!).animationName, tip: getComputedStyle(document.querySelector(".im-tip-one")!).transitionDuration }));
    record("L6", "tips motion", fade);
    expect(fade.card).toBe("none");
    // The app's global reduced-motion rule sets every duration to 0.01ms (and wins over this card's own
    // `transition: none`), so "no fade" reads as a duration of at most a millisecond.
    expect(parseFloat(fade.tip) * 1000, "the tip does not fade").toBeLessThanOrEqual(1);
    expect(await text(page, '[data-im="tip-num"]')).toBe("1 / 5");
    await page.waitForTimeout(7_800); // past one auto-advance
    expect(await text(page, '[data-im="tip-num"]'), "no auto-advance").toBe("1 / 5");
    await page.locator('[data-im="tip-next"]').click();
    expect(await text(page, '[data-im="tip-num"]'), "Next tip still advances").toBe("2 / 5");
  });
});
