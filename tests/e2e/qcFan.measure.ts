/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The fan, dealt (v21 §5) — measured on the rendered page rather than reasoned about.
 *
 * ⚠️ IT READS THE UNROTATED BOX, WHICH IS THE BRIEF'S OWN TRAP 3. A fanned card is rotated about a
 * point BELOW itself, so `getBoundingClientRect` returns the swung bounds: measured at 1280 the
 * hand is LAID OUT 150 → 1130 and MEASURES 102 → 1175. Both are reported, because the difference
 * is the fan working and a check that conflated them would chase it as a fault.
 */
import { expect, test } from "@playwright/test";
import { ensureSignedIn, openRoute } from "./measure";

test("the fan deals", async ({ page }) => {
  await ensureSignedIn(page);
  await openRoute(page, "/queries", { width: 1280, height: 800 });
  await page.waitForSelector('[data-qcv="ov-stats"]', { timeout: 30_000 });
  await page.waitForTimeout(1500);

  /* the biggest stat card, so the hand is worth looking at */
  const picked = await page.evaluate(() => {
    const cards = [...document.querySelectorAll<HTMLElement>('[data-qcv="ov-card"]')];
    const best = cards
      .map((c) => ({ key: c.getAttribute("data-key") ?? "?", n: Number(c.querySelector(".qco-fig")?.textContent ?? 0), c }))
      .sort((a, b) => b.n - a.n)[0];
    best.c.setAttribute("data-pick", "1");
    return { key: best.key, n: best.n };
  });
  await page.locator('[data-pick="1"]').click();
  await page.waitForSelector('[data-qcv="fan"]', { timeout: 10_000 });
  await page.waitForTimeout(1200);

  const out = await page.evaluate(() => {
    const q = (s: string) => document.querySelector(s) as HTMLElement | null;
    const cards = [...document.querySelectorAll<HTMLElement>('[data-qcv="fan-card"]')];
    const un = (e: HTMLElement) => {
      /* ⚠️ THE UNROTATED BOX: clear the transform, force layout, read, restore (trap 3) */
      const t = e.style.transform, tr = e.style.transition;
      e.style.transition = "none"; e.style.transform = "none";
      void e.offsetHeight;
      const r = e.getBoundingClientRect();
      e.style.transform = t; e.style.transition = tr;
      return { x: +r.x.toFixed(1), w: +r.width.toFixed(1) };
    };
    const boxes = cards.map(un);
    const rot = cards.map((e) => e.getBoundingClientRect());
    return {
      title: q('[data-qcv="fan-title"]')?.textContent,
      hint: document.querySelector(".qcf-hint")?.textContent,
      withdrawn: q('[data-qcv="fan-withdrawn"]')?.textContent ?? null,
      n: cards.length,
      stack: cards.filter((c) => c.getAttribute("data-stack") === "true").length,
      stackText: document.querySelector(".qcf-stack-face")?.textContent ?? null,
      cardW: boxes[0]?.w ?? null,
      unrotatedSpan: boxes.length ? { left: boxes[0].x, right: boxes[boxes.length - 1].x + boxes[boxes.length - 1].w } : null,
      rotatedSpan: rot.length ? { left: +Math.min(...rot.map((r) => r.x)).toFixed(1), right: +Math.max(...rot.map((r) => r.x + r.width)).toFixed(1) } : null,
      focused: document.activeElement?.getAttribute("data-qcv") ?? document.activeElement?.tagName,
      role: q('[data-qcv="fan"]')?.getAttribute("role"),
      modal: q('[data-qcv="fan"]')?.getAttribute("aria-modal"),
      bodyOverflow: getComputedStyle(document.body).overflow,
      /* the foot's button must be unpressable in this pass */
      footPointer: (() => { const b = document.querySelector(".qcf .qcard-foot button"); return b ? getComputedStyle(b).pointerEvents : null; })(),
      tabsHidden: (() => { const t = document.querySelector(".qcf .qcard-tabs"); return t ? getComputedStyle(t).display : "absent"; })(),
    };
  });
  // eslint-disable-next-line no-console
  console.log("\n@@FAN " + JSON.stringify({ picked, ...out }, null, 1));
  await page.screenshot({ path: "/private/tmp/qc-fan-1280.png" });

  /* arrows move focus; Escape closes and returns it */
  await page.keyboard.press("ArrowRight");
  const moved = await page.evaluate(() => document.activeElement?.getAttribute("data-id") ?? document.activeElement?.getAttribute("data-stack"));
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  const after = await page.evaluate(() => ({
    gone: !document.querySelector('[data-qcv="fan"]'),
    focusBack: document.activeElement?.getAttribute("data-qcv") ?? null,
    bodyOverflow: getComputedStyle(document.body).overflow,
  }));
  // eslint-disable-next-line no-console
  console.log("@@AFTER " + JSON.stringify({ moved, ...after }));
  expect(out.n).toBeGreaterThan(0);
});
