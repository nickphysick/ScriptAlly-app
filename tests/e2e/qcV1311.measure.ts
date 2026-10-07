/**
 * Query Centre v131.1 — QC131-1 D1…D8 (D6 is the unit test `src/lib/qcCourtHistory.test.ts`): the desk
 * as three ledger cards (ref design-refs/desk-ledger-v6.html, `body[data-sub=tile]`), rendered at 1280 /
 * 1512 / 1920 with fonts loaded.
 *
 *   SA_E2E_BASE_URL=http://127.0.0.1:<port> npx playwright test qcV1311
 *
 * Every case asserts its population first, so a probe that finds nothing fails rather than passing.
 */
import { test, expect, Page } from "@playwright/test";
import { inkOpen } from "./inkLib";

const WIDTHS = [1280, 1512, 1920];
const near = (a: number, b: number, tol = 1) => Math.abs(a - b) <= tol;
const COURT_C: Record<string, string> = { you: "rgb(176, 96, 62)", agent: "rgb(61, 80, 112)", closed: "rgb(124, 113, 104)" };
const TINT: Record<string, string> = { you: "rgb(246, 226, 216)", agent: "rgb(226, 231, 239)", closed: "rgb(236, 232, 227)" };

async function openQc(page: Page, w: number) {
  await inkOpen(page, "/queries", w, { scope: "qc1311" });
  await expect(page.locator('.qc13-list [data-qcv="row"]').first(), "the list loaded").toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(400);
}

const cards = (page: Page) => page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-qcv="court"]')]
  .filter((e) => e.getBoundingClientRect().width > 0).map((c) => {
    const b = c.getBoundingClientRect(), cs = getComputedStyle(c);
    const lines = [...c.querySelectorAll<HTMLElement>('[data-qcv="court-line"]')].map((l) => {
      const t = l.querySelector<HTMLElement>('[data-qcv="court-tile"]');
      const ts = t ? getComputedStyle(t) : null;
      return { text: l.innerText.replace(/\s+/g, " ").trim(), n: t ? +t.innerText : NaN, h: t?.getBoundingClientRect().height ?? NaN,
        bg: ts?.backgroundColor ?? "", fg: ts?.color ?? "", hot: l.dataset.hot === "true" };
    });
    const stamp = c.querySelector<HTMLElement>('[data-qcv="court-stamp"]');
    const svgs = [...c.querySelectorAll<SVGSVGElement>('svg[data-qcv="court-trend"]')];
    const pts = svgs[0] ? [...svgs[0].querySelectorAll<SVGElement>('[data-qcv="trend-pt"]')].map((p) => +(p.getAttribute("data-v") ?? NaN)) : [];
    const ax = [...c.querySelectorAll<HTMLElement>('[data-qcv="trend-ax"] > *')].map((e) => e.innerText.trim());
    return {
      key: c.dataset.court!, x: b.left, r: b.right, y: b.top, w: b.width, h: b.height,
      bg: cs.backgroundColor, radius: cs.borderTopLeftRadius,
      name: c.querySelector<HTMLElement>('[data-qcv="court-name"]')?.innerText.trim() ?? null,
      count: +(c.querySelector<HTMLElement>('[data-qcv="court-count"]')?.innerText ?? NaN),
      lines, stamp: stamp ? { text: stamp.innerText.trim(), tf: getComputedStyle(stamp).transform, ago: +(stamp.dataset.ago ?? NaN) } : null,
      svgs: svgs.length, svgH: svgs[0]?.getBoundingClientRect().height ?? NaN, pts, ax,
      bars: c.querySelectorAll('[data-qcv="bar"], .qc13-b').length,
      label: svgs[0]?.getAttribute("aria-label") ?? null,
    };
  }));

test.describe("Query Centre v131.1 — the desk as three ledger cards", () => {
  test("D1 · three separate cards, 18px apart, each #fffdf9 at radius 16, no shared frame", async ({ page }) => {
    for (const w of WIDTHS) {
      await openQc(page, w);
      const cs = await cards(page);
      expect(cs.map((c) => c.key), `${w}: three cards`).toEqual(["you", "agent", "closed"]);
      for (const c of cs) {
        expect(c.bg, `${w} ${c.key}: surface`).toBe("rgb(255, 253, 249)");
        expect(c.radius, `${w} ${c.key}: radius`).toBe("16px");
      }
      expect(near(cs[1].x - cs[0].r, 18) && near(cs[2].x - cs[1].r, 18), `${w}: gaps ${cs[1].x - cs[0].r}, ${cs[2].x - cs[1].r}`).toBe(true);
      const frame = await page.evaluate(() => {
        const d = document.querySelector<HTMLElement>('[data-qcv="courts"]');
        if (!d) return null;
        const s = getComputedStyle(d);
        return { bg: s.backgroundColor, sh: s.boxShadow, bd: s.borderTopWidth };
      });
      expect(frame, `${w}: the desk container exists`).toBeTruthy();
      expect(frame!.bg === "rgba(0, 0, 0, 0)" && frame!.sh === "none" && frame!.bd === "0px", `${w}: no shared frame ${JSON.stringify(frame)}`).toBe(true);
    }
  });

  test("D2 · the copy, its singulars, and no 'With the agent' anywhere on the route", async ({ page }) => {
    const PAT: Record<string, [RegExp, RegExp]> = {
      you: [/^\d+ offers? to consider$/, /^\d+ (partials?|fulls?|requests?) to send$/],
      agent: [/^\d+ responses? overdue$/, /^\d+ due this week$/],
      closed: [/^\d+ rejections?$/, /^\d+ no response$/],
    };
    const NAME: Record<string, string> = { you: "With you", agent: "With agents", closed: "Closed" };
    for (const w of WIDTHS) {
      await openQc(page, w);
      const cs = await cards(page);
      expect(cs.length, `${w}: three cards`).toBe(3);
      for (const c of cs) {
        expect(c.name, `${w} ${c.key}: name`).toBe(NAME[c.key]);
        expect(c.lines.length, `${w} ${c.key}: two lines`).toBe(2);
        c.lines.forEach((l, i) => {
          expect(l.text, `${w} ${c.key} line ${i + 1}`).toMatch(PAT[c.key][i]);
          /* singular exactly when the figure is 1 */
          const one = l.n === 1;
          const singular = /\b(offer|partial|full|request|response|rejection) /.test(l.text + " ") && !/\b(offers|partials|fulls|requests|responses|rejections)\b/.test(l.text);
          if (!/due this week|no response/.test(l.text)) expect(singular, `${w} ${c.key}: "${l.text}" agrees with ${l.n}`).toBe(one);
        });
      }
      /* "With the agent", exact, any case — at rest and with each card selected */
      const scan = () => page.evaluate(() => (document.body.innerText.match(/\bwith the agent\b/gi) ?? []).length);
      expect(await scan(), `${w}: at rest`).toBe(0);
      for (const k of ["you", "agent", "closed"]) {
        await page.locator(`[data-qcv="court"][data-court="${k}"] [data-qcv="court-pick"]`).click();
        await page.waitForTimeout(250);
        expect(await scan(), `${w}: with ${k} selected`).toBe(0);
        await page.locator(`[data-qcv="court"][data-court="${k}"] [data-qcv="court-pick"]`).click();
        await page.waitForTimeout(150);
      }
    }
  });

  test("D3 · tiles: 26px tall; a needs-you-now count is rust on blush; a zero is the muted tile", async ({ page }) => {
    let hot = 0, zero = 0;
    for (const w of WIDTHS) {
      await openQc(page, w);
      for (const c of await cards(page)) {
        expect(c.lines.length, `${w} ${c.key}: lines`).toBe(2);
        c.lines.forEach((l, i) => {
          expect(near(l.h, 26, 0.5), `${w} ${c.key} line ${i + 1}: tile ${l.h}px`).toBe(true);
          const urgent = (c.key === "you" || c.key === "agent") && i === 0;
          if (l.n === 0) { zero++; expect([l.bg, l.fg], `${w} ${c.key} line ${i + 1}: zero is muted`).toEqual(["rgb(241, 238, 233)", "rgba(28, 19, 15, 0.4)"]); }
          else if (urgent) { hot++; expect([l.bg, l.fg], `${w} ${c.key} line ${i + 1}: rust`).toEqual(["rgb(246, 221, 210)", "rgb(162, 69, 42)"]); }
          else expect([l.bg, l.fg], `${w} ${c.key} line ${i + 1}: court tint`).toEqual([TINT[c.key], COURT_C[c.key]]);
        });
      }
    }
    expect(hot, "a rust tile was measured").toBeGreaterThan(0);
    console.log(`D3 population: hot ${hot}, zero ${zero}`);
  });

  test("D4 · the stamp: the change against four weeks ago, rotated", async ({ page }) => {
    for (const w of WIDTHS) {
      await openQc(page, w);
      for (const c of await cards(page)) {
        expect(c.stamp, `${w} ${c.key}: a stamp`).toBeTruthy();
        expect(c.stamp!.text, `${w} ${c.key}: stamp text`).toMatch(/^([+−]\d+|No change) this month$/);
        expect(c.stamp!.tf !== "none" && !/^matrix\(1, 0, 0, 1,/.test(c.stamp!.tf), `${w} ${c.key}: rotated (${c.stamp!.tf})`).toBe(true);
        expect(Number.isFinite(c.stamp!.ago), `${w} ${c.key}: the count four weeks ago is stated`).toBe(true);
        const d = c.count - c.stamp!.ago;
        const want = d === 0 ? "No change this month" : `${d > 0 ? "+" : "−"}${Math.abs(d)} this month`;
        expect(c.stamp!.text, `${w} ${c.key}: now ${c.count} − four weeks ago ${c.stamp!.ago}`).toBe(want);
      }
    }
  });

  test("D5 · the trend: one 52px chart, ten points, the last is the big number; month … Now; no bars", async ({ page }) => {
    for (const w of WIDTHS) {
      await openQc(page, w);
      for (const c of await cards(page)) {
        expect(c.svgs, `${w} ${c.key}: one chart`).toBe(1);
        expect(near(c.svgH, 52, 0.5), `${w} ${c.key}: ${c.svgH}px tall`).toBe(true);
        expect(c.pts.length, `${w} ${c.key}: ten points`).toBe(10);
        expect(c.pts[9], `${w} ${c.key}: the last point is the big number`).toBe(c.count);
        expect(c.ax[0], `${w} ${c.key}: first label`).toMatch(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)$/);
        expect(c.ax[c.ax.length - 1], `${w} ${c.key}: last label`).toBe("Now");
        expect(c.bars, `${w} ${c.key}: no bars remain`).toBe(0);
        expect(c.label ?? "", `${w} ${c.key}: the chart's label`).toMatch(/^.+: \d+ in (early|mid|late) [A-Z][a-z]+, \d+ now$/);
      }
    }
    /* the tooltip on the nearest week */
    await openQc(page, 1512);
    const pt = page.locator('[data-qcv="court"][data-court="agent"] [data-qcv="trend-hit"]').nth(6);
    await pt.hover();
    await page.waitForTimeout(150);
    await expect(page.locator('[data-qcv="trend-tip"]')).toHaveText(/^W\/C \d{1,2} [A-Z]{3} · \d+ with agents$/);
  });

  test("D7 · a card fills the carousel only; the list's rows, order and counts are identical", async ({ page }) => {
    await openQc(page, 1512);
    const list = () => page.evaluate(() => ({
      ids: [...document.querySelectorAll<HTMLElement>('.qc13-list [data-qcv="row"]')].map((r) => r.dataset.id).join(","),
      counts: [...document.querySelectorAll<HTMLElement>('.qc13-list .qc13-gh, [data-qcv="showing"]')].map((e) => e.innerText.replace(/\s+/g, " ").trim()).join("|"),
    }));
    const title = page.locator('[data-qcv="cz-head-title"]');
    const before = await list();
    expect(before.ids.split(",").length, "the list has rows").toBeGreaterThan(10);
    for (const [k, name] of [["you", "With you"], ["agent", "With agents"], ["closed", "Closed"]]) {
      await page.locator(`[data-qcv="court"][data-court="${k}"] [data-qcv="court-pick"]`).click();
      await page.waitForTimeout(250);
      await expect(title, `${k}: the carousel follows`).toHaveText(name);
      expect(await list(), `${k}: the list is unchanged`).toEqual(before);
      await page.locator(`[data-qcv="court"][data-court="${k}"] [data-qcv="court-pick"]`).click();
      await page.waitForTimeout(250);
      await expect(title, `${k}: a second click clears it`).toHaveText("Recently updated");
    }
    /* the keyboard does the same */
    await page.locator('[data-qcv="court"][data-court="closed"] [data-qcv="court-pick"]').focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(250);
    await expect(title).toHaveText("Closed");
    expect(await list(), "keyboard: the list is unchanged").toEqual(before);
  });

  test("D8 · the placeholder cards are the loaded cards' box", async ({ page }) => {
    for (const w of [1280, 1512]) {
      await page.addInitScript(() => { (window as unknown as { __SA_QC_HOLD_MS: number }).__SA_QC_HOLD_MS = 6000; });
      await inkOpen(page, "/queries", w, { scope: "qc1311-d8" });
      const read = () => page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-qcv="court"]')].filter((e) => e.getBoundingClientRect().width > 0)
        .map((e) => { const b = e.getBoundingClientRect(); return { x: +b.left.toFixed(1), y: +b.top.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1), loading: e.dataset.loading === "true" }; }));
      await expect(page.locator('[data-qcv="court"][data-loading="true"]').first(), `${w}: placeholders drawn`).toBeVisible();
      const sk = await read();
      await expect(page.locator('.qc13-list [data-qcv="row"]').first()).toBeVisible({ timeout: 20_000 });
      await page.waitForTimeout(900);
      const real = await read();
      expect(sk.length === 3 && sk.every((s) => s.loading) && real.length === 3 && real.every((s) => !s.loading), `${w}: three placeholders, then three cards`).toBe(true);
      sk.forEach((s, i) => expect(near(s.x, real[i].x) && near(s.y, real[i].y) && near(s.w, real[i].w) && near(s.h, real[i].h), `${w} card ${i}: ${JSON.stringify(s)} → ${JSON.stringify(real[i])}`).toBe(true));
    }
  });
});
