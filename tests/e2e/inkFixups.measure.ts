/**
 * Ink shell v1 fix-ups — HC1…HC7 (the Query Centre header card, Help, the folded feedback button).
 *
 *   SA_E2E_BASE_URL=http://127.0.0.1:<port> npx playwright test inkFixups
 *   INK_MUTATE=<name>   applies one named break in the page (inkLib.ts) to prove a lock red.
 *   INK_FIX_SHOTS=<label>  the "shots" case writes reports/ink-shell-v1/fixups/<label>/ and the numbers.
 *
 * Rendered at 1280 / 1440 / 1710 with fonts loaded; HC1–HC4 in all three themes. Every case asserts
 * its precondition (the element present, on screen) before its claim.
 */
import { test, expect, Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { WIDTHS, MUTATE, inkOpen, rect, css, rowColours, applyMutation } from "./inkLib";

const near = (a: number, b: number, tol = 1) => Math.abs(a - b) <= tol;
const THEMES = ["t-capp", "t-bold", "t-edn"];
const CARD = '[data-probe="page-header"][data-size="full"]';
const STRIP = '[data-qcv="courts"]';

async function theme(page: Page, t: string) {
  await page.evaluate((t) => {
    const f = document.querySelector(".sa-shellframe")!;
    f.classList.remove("t-capp", "t-bold", "t-edn"); f.classList.add(t);
  }, t);
}

/** The colour of one CSS pixel, read from a screenshot (centre of the device pixels it covers). */
async function px(page: Page, x: number, y: number): Promise<string> {
  const shot = await page.screenshot({ clip: { x: Math.floor(x), y: Math.floor(y), width: 1, height: 1 } });
  const c = await rowColours(page, shot, [0], 0, 1);
  return c[0];
}
const rgb = (s: string) => s.match(/\d+/g)!.slice(0, 3).map(Number);
const dist = (a: string, b: string) => { const p = rgb(a), q = rgb(b); return Math.max(...p.map((v, i) => Math.abs(v - q[i]))); };

async function openQc(page: Page, w: number, opts: { empty?: boolean; height?: number } = {}) {
  if (opts.empty) await page.addInitScript(() => { (window as unknown as { __SA_LH_COUNT?: number }).__SA_LH_COUNT = 0; });
  await inkOpen(page, "/queries", w, { height: opts.height, scope: MUTATE.startsWith("hc5") ? "hc5" : MUTATE.slice(0, 3) });
  await expect(page.locator(CARD).first(), "the Query Centre header is drawn").toBeVisible();
  if (opts.empty) await expect(page.locator(`[data-qcv-empty] ${CARD}`), "the empty state drew").toBeVisible();
}

test.describe("ink fix-ups", () => {
  test("HC1–HC4 · the header is a card on the content column, paper under the tab, rounded, its contents inside", async ({ page }) => {
    for (const w of WIDTHS) {
      await openQc(page, w);
      for (const t of THEMES) {
        await theme(page, t);
        const card = (await rect(page, CARD))!;
        const strip = (await rect(page, STRIP))!;
        const win = (await rect(page, ".ws-window"))!;
        const tab = (await rect(page, ".ws-ftab"))!;
        const sheet = (await css(page, ".ws-window", ["background-color"]))!["background-color"];
        const bg = (await css(page, CARD, ["background-color", "border-radius", "overflow"]))!;
        expect(strip, "the stat strip is drawn").not.toBeNull();
        /* HC1 */
        expect(near(card.x, strip.x), `${w} ${t} HC1: card left ${card.x} vs strip ${strip.x}`).toBe(true);
        expect(near(card.r, strip.r), `${w} ${t} HC1: card right ${card.r} vs strip ${strip.r}`).toBe(true);
        /* the card's own colour is the band's, unchanged */
        expect(bg["background-color"], `${w} ${t}: the band's colour`).toBe("rgb(42, 58, 82)");
        /* HC2 — 20px of paper above the card, and the pixel 10px under the tab's foot is paper */
        expect(near(card.y - win.y, 20), `${w} ${t}: top gap ${card.y - win.y}`).toBe(true);
        const under = await px(page, tab.x + tab.w / 2, tab.b + 10);
        expect(dist(under, sheet), `${w} ${t} HC2: pixel under the tab is ${under}, paper is ${sheet}`).toBeLessThanOrEqual(2);
        /* HC3 — 3px inside each corner, on the diagonal, is paper */
        /* the pixels first (the claim), then the declarations that produce them */
        for (const [x, y, k] of [[card.x + 3, card.y + 3, "top-left"], [card.r - 4, card.y + 3, "top-right"], [card.x + 3, card.b - 4, "bottom-left"], [card.r - 4, card.b - 4, "bottom-right"]] as [number, number, string][]) {
          const c = await px(page, x, y);
          expect(dist(c, sheet), `${w} ${t} HC3: ${k} corner pixel ${c}`).toBeLessThanOrEqual(2);
        }
        expect(bg["border-radius"]).toBe("18px");
        expect(bg.overflow).toBe("hidden");
        /* HC4 — disc, figure, text and buttons inside the card; the right gap at least 40 */
        for (const sel of ['[data-probe="band-disc"]', '[data-probe="band-disc"] img', '[data-probe="band-text"]', `${CARD} .ph-acts`]) {
          const b = (await rect(page, sel))!;
          expect(b, `${sel} is drawn`).not.toBeNull();
          expect(b.x >= card.x - 0.5 && b.y >= card.y - 0.5 && b.r <= card.r + 0.5 && b.b <= card.b + 0.5, `${w} ${t} HC4: ${sel} ${JSON.stringify(b)} inside ${JSON.stringify(card)}`).toBe(true);
        }
        const disc = (await rect(page, '[data-probe="band-disc"] img'))!;
        expect(card.r - disc.r, `${w} ${t} HC4: right gap`).toBeGreaterThanOrEqual(40);
        const text = (await rect(page, '[data-probe="band-text"]'))!;
        expect(disc.x, `${w} ${t} HC4: the disc sits to the right of the text`).toBeGreaterThanOrEqual(text.r);
        const ink = (await rect(page, `${CARD} .ph-title`))!;
        expect(ink.x - card.x, `${w} ${t} HC4: text starts clamp(48px, 7vw, 104px) inside the card`).toBeCloseTo(Math.min(104, Math.max(48, w * 0.07)), 0);
      }
    }
  });

  /* ⚠️ RESTATED (Nick, 7 Oct): the brief assumed the empty state shares the dark band; it does not — it is
     `QcEmpty`'s light open header. It stays light and shares the card's column edges and 20px top gap. */
  test("HC5 · the empty state keeps its light header on the card's column edges and 20px top gap", async ({ page }) => {
    for (const w of WIDTHS) {
      await openQc(page, w);
      const card = (await rect(page, CARD))!;
      await openQc(page, w, { empty: true });
      await applyMutation(page, "hc5");
      const e = (await rect(page, `[data-qcv-empty] ${CARD}`))!;
      const win = (await rect(page, ".ws-window"))!;
      const tab = (await rect(page, ".ws-ftab"))!;
      const sheet = (await css(page, ".ws-window", ["background-color"]))!["background-color"];
      expect(near(e.x, card.x), `${w}: empty left ${e.x} vs card ${card.x}`).toBe(true);
      expect(near(e.r, card.r), `${w}: empty right ${e.r} vs card ${card.r}`).toBe(true);
      expect(near(e.y - win.y, 20), `${w}: empty top gap ${e.y - win.y}`).toBe(true);
      const under = await px(page, tab.x + tab.w / 2, tab.b + 10);
      expect(dist(under, sheet), `${w}: paper under the tab`).toBeLessThanOrEqual(2);
      expect((await css(page, `[data-qcv-empty] ${CARD}`, ["background-color"]))!["background-color"], `${w}: still light`).not.toBe("rgb(42, 58, 82)");
    }
  });

  test("HC6 · Help is a 34×34 ringed circle, 18px after Log a query, with a visible rule at the gap's midpoint", async ({ page }) => {
    for (const w of WIDTHS) {
      await openQc(page, w);
      await applyMutation(page, "hc6");
      const help = (await rect(page, ".ws-pagebar .ws-help"))!;
      const cap = (await rect(page, ".ws-cap--bar"))!;
      expect(help, "Help is drawn").not.toBeNull();
      expect([Math.round(help.w), Math.round(help.h)], `${w}: size`).toEqual([34, 34]);
      expect((await css(page, ".ws-pagebar .ws-help", ["border-radius"]))!["border-radius"]).toBe("50%");
      expect(near(help.y + help.h / 2, cap.y + cap.h / 2, 0.75), `${w}: centred on Log a query`).toBe(true);
      expect(near(help.x - cap.r, 18), `${w}: gap ${help.x - cap.r}`).toBe(true);
      expect(await page.locator(".ws-pagebar .ws-help").getAttribute("title")).toBe("Help and shortcuts");
      const ink = await px(page, cap.r + 3, help.y + help.h / 2);
      /* the ring: the circle's leftmost column at its vertical centre, against the ink beside it */
      const ring = await px(page, help.x + 0.5, help.y + help.h / 2);
      expect(dist(ring, ink), `${w}: ring pixel ${ring} vs ink ${ink}`).toBeGreaterThanOrEqual(12);
      /* the rule: scan ±2px around 9px left of the circle, at its centre line */
      let ruleSeen = 0;
      for (let dx = -2; dx <= 2; dx++) { const c = await px(page, help.x - 9 + dx, help.y + help.h / 2); if (dist(c, ink) >= 12) ruleSeen++; }
      expect(ruleSeen, `${w}: rule pixels near 9px left of the circle`).toBeGreaterThan(0);
      const top = await px(page, help.x - 9, help.y + help.h / 2 - 12);
      expect(dist(top, ink), `${w}: the rule is 18px tall, not taller`).toBeLessThan(12);
    }
  });

  test("HC7 · at a window height of 880 the folded feedback button is the reference's outlined .fbb", async ({ page }) => {
    for (const w of WIDTHS) {
      await openQc(page, w, { height: 880 });
      await applyMutation(page, "hc7");
      await expect(page.locator(".ws-fbb")).toBeVisible();
      await expect(page.locator(".ws-fbc")).toBeHidden();
      const fb = (await css(page, ".ws-fbb", ["background-color", "box-shadow", "height", "border-radius", "padding-left", "color", "font-size", "font-weight"]))!;
      expect(fb["background-color"], `${w}: no fill`).toBe("rgba(0, 0, 0, 0)");
      expect(fb["box-shadow"], `${w}: the 1.5px terracotta ring`).toBe("rgb(217, 150, 122) 0px 0px 0px 1.5px inset");
      expect([fb.height, fb["border-radius"], fb["padding-left"], fb["font-size"], fb["font-weight"]]).toEqual(["40px", "10px", "12px", "14.5px", "600"]);
      expect(fb.color).toBe("rgb(244, 238, 229)");
      /* label pixels: some pixel inside the label's box is near cream */
      const lb = (await rect(page, ".ws-fbb .ws-fbb-l"))!;
      const shot = await page.screenshot({ clip: { x: lb.x, y: lb.y, width: lb.w, height: lb.h } });
      const cols = await rowColours(page, shot, Array.from({ length: Math.floor(lb.h) }, (_, i) => i), 0, 100000);
      expect(cols.some((c) => dist(c, "rgb(244, 238, 229)") <= 24), `${w}: cream label pixels`).toBe(true);
      const ic = (await css(page, ".ws-fbb svg", ["color", "width"]))!;
      expect([ic.color, ic.width]).toEqual(["rgb(217, 150, 122)", "16px"]);
      const tag = (await css(page, ".ws-fbb em", ["background-color", "color", "font-size", "letter-spacing", "border-radius"]))!;
      await expect(page.locator(".ws-fbb em")).toHaveText("BETA");
      expect(tag["background-color"]).toBe("rgba(217, 150, 122, 0.18)");
      expect(tag.color).toBe("rgb(217, 150, 122)");
    }
  });

  test("shots — before/after pictures and the numbers", async ({ page }) => {
    test.skip(!process.env.INK_FIX_SHOTS, "set INK_FIX_SHOTS=<label>");
    const out = `reports/ink-shell-v1/fixups/${process.env.INK_FIX_SHOTS}`;
    mkdirSync(out, { recursive: true });
    const nums: Record<string, unknown> = {};
    for (const w of WIDTHS) {
      await openQc(page, w);
      const card = (await rect(page, CARD))!, strip = (await rect(page, STRIP))!, win = (await rect(page, ".ws-window"))!;
      nums[`${w}`] = { cardX: card.x, cardR: card.r, stripX: strip.x, stripR: strip.r, topGap: card.y - win.y, bottomGap: strip.y - card.b, cardH: card.h };
      if (w === 1440) for (const t of THEMES) { await theme(page, t); await page.screenshot({ path: `${out}/qc-1440-${t}.png` }); }
    }
    await openQc(page, 1440, { empty: true });
    await page.screenshot({ path: `${out}/qc-1440-empty.png` });
    const e = (await rect(page, CARD))!, ewin = (await rect(page, ".ws-window"))!;
    nums.empty1440 = { x: e.x, r: e.r, topGap: e.y - ewin.y };
    await openQc(page, 1440, { height: 880 });
    const help = (await rect(page, ".ws-pagebar .ws-helpwrap"))!;
    await page.screenshot({ path: `${out}/help-crop.png`, clip: { x: help.x - 200, y: 8, width: help.w + 220, height: 48 } });
    const fb = (await rect(page, ".ws-fbk"))!;
    await page.screenshot({ path: `${out}/feedback-folded-crop.png`, clip: { x: fb.x - 6, y: fb.y - 6, width: fb.w + 12, height: fb.h + 12 } });
    writeFileSync(`${out}/numbers.json`, JSON.stringify(nums, null, 2));
    console.log(JSON.stringify(nums));
    /* the reference's own crops, in the same browser */
    await page.setViewportSize({ width: 1810, height: 1000 });
    await page.goto("file://" + resolve("design-refs/shell/ink-shell-v1.html"));
    await page.waitForTimeout(1200);
    await page.evaluate(() => { document.getElementById("stage")!.style.transform = "none"; document.body.classList.remove("fs-card"); document.body.classList.add("fs-btn"); });
    await page.evaluate(() => document.fonts.ready);
    const rh = (await rect(page, ".bar .hlp"))!, rlq = (await rect(page, ".bar .lq"))!;
    await page.screenshot({ fullPage: true, path: `${out}/help-crop-ref.png`, clip: { x: rlq.x - 30, y: rh.y - 7, width: rh.r - rlq.x + 40, height: 48 } });
    const rf = (await rect(page, ".fbb"))!;
    await page.screenshot({ fullPage: true, path: `${out}/feedback-folded-crop-ref.png`, clip: { x: rf.x - 6, y: rf.y - 6, width: rf.w + 12, height: rf.h + 12 } });
  });
});
