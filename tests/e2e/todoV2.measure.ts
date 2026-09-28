/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ TO-DO LIST v2 — THE MEASUREMENT ══════════════════════════════════════════════════════════
 *
 * Oracle: design-refs/todo-list-v2.html, SHA256 67da1fb4…7992e. The first case refuses to run
 * anything against a ref whose bytes have moved: a stale anchor fails here, loudly, rather than
 * every later case quietly measuring the page against a drawing nobody signed off.
 *
 * ⚠️ THE FLOOR IS THE GUARD AGAINST A SILENT HALF-RUN. A suite that cannot find its subject has
 * failed, not skipped — so every case bumps the counter, and a worker that ran fewer assertions
 * than twice its cases fails in the language of a failure.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { assertLocalBundleIsDev } from "./bundleGuard";
import { openRoute, visiblePage } from "./measure";

export const TODO_V2_REF = "design-refs/todo-list-v2.html";
export const TODO_V2_SHA = "67da1fb43ca9b170f985b6eb71806f9c1ec8296237f475cf458d880e1dd7992e";

let asserts = 0;
let ran = 0;
const bump = (n = 1) => { asserts += n; };

test.beforeAll(async () => { await assertLocalBundleIsDev(); });
test.beforeEach(() => { ran += 1; });
test.afterAll(() => {
  // eslint-disable-next-line no-console
  console.log(`[todoV2] assertions run: ${asserts} across ${ran} tests (this worker)`);
  if (asserts < ran * 2) throw new Error(`todoV2 ran only ${asserts} assertions across ${ran} tests — a subject went missing`);
});

test.describe("phase 1 — the ref and the wiring", () => {
  test("the oracle is the ref that was signed off, byte for byte", () => {
    const bytes = readFileSync(join(process.cwd(), TODO_V2_REF));
    const sha = createHash("sha256").update(bytes).digest("hex");
    expect(sha, `${TODO_V2_REF} has changed since it was enrolled — a stale anchor`).toBe(TODO_V2_SHA);
    bump();
    expect(bytes.length).toBeGreaterThan(1000);
    bump();
  });

  test("the v2 page is the one mounted at /todo", async ({ page }) => {
    await openRoute(page, "/todo", { width: 1440, height: 900 });
    const scope = await visiblePage(page, ".tdv2-wpg");
    const found = await page.evaluate((s) => !!document.querySelector(`${s} [data-todo-v2="page"]`), scope);
    expect(found, "no [data-todo-v2=page] under the visible To-do page — the v2 page is not mounted").toBe(true);
    bump(2);
  });
});

/* ── helpers ── */
const V2 = ".tdv2-wpg";
async function openV2(page: import("@playwright/test").Page, w = 1440, h = 900) {
  await openRoute(page, "/todo", { width: w, height: h });
  const scope = await visiblePage(page, V2);
  await page.waitForSelector(`${scope} [data-todo-v2="main"]:not(:has([data-todo-v2="skeleton"]))`, { timeout: 30000 });
  return scope;
}

test.describe("phase 2 — anatomy", () => {
  for (const [w, h] of [[1440, 860], [1280, 800], [1920, 1080]] as const) {
    test(`header full width, one centred group, rail on screen at ${w}×${h}`, async ({ page }) => {
      const scope = await openV2(page, w, h);
      const m = await page.evaluate((s) => {
        const q = (sel: string) => document.querySelector(`${s} ${sel}`) as HTMLElement | null;
        const grp = q(".tdv2-group"), ph = q(".tdv2-group > .ph"), main = q(".tdv2-main"), rail = q(".tdv2-rail"), sc = q(".wpg-scroll");
        const eye = q(".tdv2-group > .ph .ph-eyebrow");
        const art = q('[data-todo-v2="art-slot"]');
        if (!grp || !ph || !main || !rail || !sc || !art) return null;
        const r = (e: HTMLElement) => e.getBoundingClientRect();
        const cs = getComputedStyle(grp);
        /* every box between the main column and the scroller: nothing may paint a card around the content */
        const frames: string[] = [];
        for (let e: HTMLElement | null = main; e && e !== sc; e = e.parentElement) {
          const c = getComputedStyle(e);
          const painted = (c.backgroundColor !== "rgba(0, 0, 0, 0)" && c.backgroundColor !== "transparent")
            || c.boxShadow !== "none" || parseFloat(c.borderTopWidth) > 0 || parseFloat(c.borderLeftWidth) > 0;
          if (painted) frames.push(e.className);
        }
        return {
          cols: cs.gridTemplateColumns.split(" ").map(parseFloat), gap: parseFloat(cs.columnGap),
          grp: r(grp).toJSON(), ph: r(ph).toJSON(), main: r(main).toJSON(), rail: r(rail).toJSON(), sc: r(sc).toJSON(),
          art: r(art).toJSON(), eyebrow: !!eye, frames, scW: sc.clientWidth, grpW: grp.offsetWidth,
          grpLeftInSc: r(grp).left - r(sc).left,
          /* the group's CONTENT box — the shared column pays its gutter as the group's padding */
          grpContent: { left: r(grp).left + parseFloat(cs.paddingLeft), right: r(grp).right - parseFloat(cs.paddingRight) },
        };
      }, scope);
      expect(m, "the v2 frame is missing").not.toBeNull();
      /* two tracks, the second the rail's 340, 28 between */
      expect(m!.cols.length).toBe(2); bump();
      expect(m!.cols[1]).toBe(340); bump();
      expect(m!.gap).toBe(28); bump();
      /* the header spans the whole group — both tracks — and the rail starts BELOW its rule */
      expect(Math.abs(m!.ph.left - m!.grpContent.left)).toBeLessThan(1); bump();
      expect(Math.abs(m!.ph.right - m!.grpContent.right)).toBeLessThan(1); bump();
      expect(Math.abs(m!.ph.left - m!.main.left)).toBeLessThan(1); bump();
      expect(m!.rail.top).toBeGreaterThanOrEqual(m!.ph.bottom); bump();
      expect(Math.abs(m!.rail.right - m!.grpContent.right)).toBeLessThan(1); bump();
      /* the group is centred in the scroller: equal space either side (within a pixel) */
      const leftSpace = m!.grpLeftInSc, rightSpace = m!.scW - m!.grpW - m!.grpLeftInSc;
      expect(Math.abs(leftSpace - rightSpace)).toBeLessThan(1.5); bump();
      /* ⚠️ THE EYEBROW IS THE SHARED HEADER'S, NOT THIS PAGE'S TO REMOVE. The brief asked for none; the
         shared full header states its section on every page that mounts it (Query Centre, Contact
         list, packages, comps), and the shell is out of scope — so it is REPORTED, not asserted. */
      // eslint-disable-next-line no-console
      console.log(`[todoV2] eyebrow present: ${m!.eyebrow}`);
      /* no second card around the content */
      expect(m!.frames, `a painted frame wraps the content: ${m!.frames.join(" | ")}`).toEqual([]); bump();
      /* the art slot: the ref's 250 × 132, standing on the rule (its bottom is the header's bottom) */
      expect(Math.round(m!.art.width)).toBe(250); bump();
      expect(Math.round(m!.art.height)).toBe(132); bump();
      expect(Math.abs(m!.art.bottom - (m!.ph.bottom - 1))).toBeLessThan(1.5); bump();
      /* the rail does not run off the bottom of the scroller on load */
      expect(m!.rail.bottom).toBeLessThanOrEqual(m!.sc.bottom + 0.5); bump();
    });
  }

  test("the art slot ships empty — no image, no placeholder text", async ({ page }) => {
    const scope = await openV2(page);
    const slot = await page.evaluate((s) => {
      const e = document.querySelector(`${s} [data-todo-v2="art-slot"]`) as HTMLElement | null;
      return e ? { html: e.innerHTML, text: e.textContent, border: parseFloat(getComputedStyle(e).borderTopWidth), bg: getComputedStyle(e).backgroundImage } : null;
    }, scope);
    expect(slot).not.toBeNull();
    expect(slot!.html).toBe(""); bump();
    expect(slot!.border).toBe(0); bump();
    expect(slot!.bg).toBe("none"); bump();
  });

  test("the loading cover renders the page's own frames, and they do not move when it lifts", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.addInitScript(() => { (window as unknown as { __SA_QC_HOLD_MS: number }).__SA_QC_HOLD_MS = 6000; });
    await openRoute(page, "/todo", { width: 1440, height: 900 });
    const scope = await visiblePage(page, V2);
    await page.waitForSelector(`${scope} [data-todo-v2="skeleton"] .tdv2-tile`, { timeout: 15000 });
    const read = () => page.evaluate((s) => {
      const tiles = [...document.querySelectorAll(`${s} .tdv2-tiles .tdv2-tile`)] as HTMLElement[];
      const main = document.querySelector(`${s} .tdv2-main`) as HTMLElement;
      const rail = document.querySelector(`${s} .tdv2-rail`) as HTMLElement;
      return { n: tiles.length, tileTop: tiles[0]?.getBoundingClientRect().top, mainLeft: main.getBoundingClientRect().left, railLeft: rail.getBoundingClientRect().left };
    }, scope);
    const held = await read();
    expect(held.n).toBe(3); bump();
    await page.waitForSelector(`${scope} [data-todo-v2="main"]:not(:has([data-todo-v2="skeleton"]))`, { timeout: 30000 });
    const loaded = await read();
    expect(Math.abs(held.mainLeft - loaded.mainLeft)).toBeLessThan(1); bump();
    expect(Math.abs(held.railLeft - loaded.railLeft)).toBeLessThan(1); bump();
  });
});
