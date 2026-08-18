/**
 * §8 — the Filter and Sort popovers, on the running page.
 *
 *   npx playwright test --project=measure qcPops
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

const CASES = [
  { w: 1024, h: 900 }, { w: 1440, h: 900 }, { w: 1920, h: 1080 }, { w: 1440, h: 600 },
];

test("§8 — both anchor to their triggers and stay inside the window", async ({ page }) => {
  for (const c of CASES) {
    await openRoute(page, "/queries", { width: c.w, height: c.h });
    for (const which of ["Filter", "Sort"] as const) {
      /* ⚠️ THE TRIGGER IS FOUND BY WHAT IT OPENS, not by a guessed selector. The first attempt
         matched a 40px button elsewhere in the page that opened nothing and reported the popover
         missing — a failure of the probe read as a failure of the thing. */
      const found = await page.evaluate((label) => {
        /* ⚠️ CLEAR THE PREVIOUS MARK FIRST — two probed triggers make the locator ambiguous, and
           Playwright's strict mode reports that as a failure of the thing being measured. */
        document.querySelectorAll("[data-probe]").forEach((e) => e.removeAttribute("data-probe"));
        /* ⚠️ ICON-ONLY TRIGGERS — `PillTrig` renders no text at all, so the word lives in
           `aria-label` and `title` and nowhere the eye or a text matcher can find it. Two probe
           attempts died on that before the markup was read. */
        const b = [...document.querySelectorAll<HTMLElement>("button.f12-pill")]
          .find((x) => (x.getAttribute("aria-label") || "").startsWith(label));
        if (!b) return null;
        b.setAttribute("data-probe", "trigger");
        return { cls: String(b.className).slice(0, 40) };
      }, which);
      if (!found) { console.log(`  ${c.w}×${c.h} ${which}: no trigger in the list header`); continue; }
      const trig = page.locator('[data-probe="trigger"]');
      /* ⚠️ THE FIRST CLICK OF A VISIT IS EATEN. The header collapses on engagement at `pointerdown`,
         which shifts the row between down and up so the `click` never completes — the same fault
         the list rows hit, and it made the popover look as though it never opened. Pressed until it
         reports `aria-expanded`. */
      for (let a = 0; a < 3 && (await trig.getAttribute("aria-expanded")) !== "true"; a++) {
        await trig.click({ timeout: 4000 });
        await page.waitForTimeout(320);
      }
      await page.waitForTimeout(200);
      const r = await page.evaluate(() => {
        const pop = document.querySelector<HTMLElement>(".f12-pop");
        if (!pop) { (window as any).__pops = [...document.querySelectorAll("[class*='pop']")].map((e) => String(e.className)).slice(0, 8); }
        if (!pop) return null;
        const p = pop.getBoundingClientRect();
        const body = pop.querySelector<HTMLElement>(".f12-pop-body");
        const foot = pop.querySelector<HTMLElement>(".f12-pop-foot");
        return {
          top: Math.round(p.top), bottom: Math.round(p.bottom), left: Math.round(p.left), right: Math.round(p.right),
          h: Math.round(p.height), vh: innerHeight, vw: innerWidth,
          bodyScrolls: body ? getComputedStyle(body).overflowY : "",
          footBottom: foot ? Math.round(foot.getBoundingClientRect().bottom) : -1,
        };
      });
      const t = await trig.boundingBox();
      console.log(`  ${c.w}×${c.h} ${which}: pop ${r ? `${r.left}–${r.right} × ${r.top}–${r.bottom} (vh ${r.vh})` : "(none)"} · trigger ${t ? `${Math.round(t.x)}–${Math.round(t.x + t.width)} y${Math.round(t.y + t.height)}` : "?"} · foot ends ${r?.footBottom}`);
      if (!r) console.log(`     nothing matched .f12-pop · pop-ish classes: ${JSON.stringify(await page.evaluate(() => (window as any).__pops))}`);
      expect(r, `${which} opened nothing at ${c.w}×${c.h}`).not.toBeNull();
      /* ⚠️ INSIDE THE WINDOW, INCLUDING ITS FOOT — the Done button unreachable is the reported fault */
      expect(r!.top, `${which} at ${c.w}×${c.h} starts above the window`).toBeGreaterThanOrEqual(0);
      expect(r!.bottom, `${which} at ${c.w}×${c.h} runs ${r!.bottom - r!.vh}px past the fold`).toBeLessThanOrEqual(r!.vh);
      expect(r!.right, `${which} at ${c.w}×${c.h} runs off the right edge`).toBeLessThanOrEqual(r!.vw);
      expect(r!.left, `${which} at ${c.w}×${c.h} runs off the left edge`).toBeGreaterThanOrEqual(0);
      if (r!.footBottom > 0) expect(r!.footBottom, `${which}'s foot is below the fold at ${c.w}×${c.h}`).toBeLessThanOrEqual(r!.vh);
      /* ⚠️ ANCHORED — its right edge on the trigger's, within a pixel of rounding */
      if (t) expect(Math.abs(r!.right - Math.round(t.x + t.width)), `${which} at ${c.w}×${c.h} is not aligned to its trigger's right edge`).toBeLessThanOrEqual(2);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(250);
    }
  }
});
