import { test, expect } from "@playwright/test";
import { openRoute, liftMotionSuppression } from "./measure";
import { resolve } from "node:path";
test.setTimeout(240_000);

/** ⚠️ Scoped to the packages page's own root — every workspace page stays mounted. */
const ROOT = ".pkgw-body";

for (const width of [1440, 1920]) {
test(`first visit teaches, and files nothing @ ${width}`, async ({ page }) => {
  await openRoute(page, "/manuscripts/packages", { width, height: 1000 });
  await liftMotionSuppression(page);
  await page.waitForTimeout(1400);
  const root = page.locator(ROOT);

  const teach = await root.locator(".pkgt").count();
  console.log(`@${width} teach-first present: ${teach}`);
  expect(teach, "the first-visit state is not rendering — is the account empty?").toBe(1);

  /* D-A4 — the whole fix. No workspace furniture in this state. */
  const furniture = await root.evaluate((r) => ({
    materialColumns: r.querySelectorAll(".pkgb-matcol, .mat-col, .pkgb-band--materials").length,
    packageCards:    r.querySelectorAll(".pkgb-pkgcard, .pkgb-slots").length,
    ghosts:          r.querySelectorAll(".pkgb-ghost, .pkgo-ghost").length,
    tracking:        r.querySelectorAll(".pkgt-track, [class*='tracking'], .pkgb-band--track").length,
    zeroCounts:      [...r.querySelectorAll("*")].filter((e) => e.children.length === 0
                       && /^0(\s|$)/.test((e.textContent || "").trim())).length,
  }));
  console.log(`@${width} furniture: ${JSON.stringify(furniture)}`);
  for (const [k, v] of Object.entries(furniture)) {
    expect(v, `first visit renders workspace furniture: ${k}`).toBe(0);
  }

  /* the teaching itself is present — a clean sweep over an empty page proves nothing */
  const taught = await root.evaluate((r) => ({
    headline: (r.querySelector(".pkgt-h") as HTMLElement)?.innerText ?? null,
    ctas:     [...r.querySelectorAll(".pkgt-cta")].map((b) => (b.textContent || "").trim()),
    slides:   r.querySelectorAll(".pkgt-dots button").length,
    slotLbl:  (r.querySelector(".pkgt-slotlbl") as HTMLElement)?.innerText ?? null,
    stages:   [...r.querySelectorAll(".pkgt-stage-n")].map((e) => (e.textContent || "").trim()),
    discs:    r.querySelectorAll(".pkgt-disc").length,
  }));
  console.log(`@${width} taught: ${JSON.stringify(taught)}`);
  expect(taught.headline).toContain("Fed up of guessing");
  expect(taught.ctas).toEqual(["Add your first material"]);
  expect(taught.slides, "the carousel has four jobs").toBe(4);
  expect(taught.slotLbl).toMatch(/^SLOT · PKG-JOB-\w+ · 396×214$/);
  expect(taught.stages).toEqual(["Stage one", "Stage two", "Stage three"]);
  expect(taught.discs).toBe(3);

  /**
   * Exactly one filled control on the page, and no sideways scroll.
   *
   * ⚠️ A FILLED CONTROL MEANS A FILLED *ACTION*, so the count is of controls that carry WORDS. The
   * carousel's active dot is a solid burgundy button with no label — a position indicator, not a
   * call to action, and it competes with the CTA for nothing. Counting it reported two and would
   * have had me lighten a dot to satisfy a rule about buttons. The comps carousel this mirrors
   * fills its active dot the same way.
   */
  const filled = await root.evaluate((r) =>
    [...r.querySelectorAll("button")].filter((b) => (b.textContent || "").trim().length > 0).filter((b) => {
      const m = getComputedStyle(b).backgroundColor.match(/rgba?\(([^)]+)\)/);
      if (!m) return false;
      const [rr, gg, bb, a = "1"] = m[1].split(",").map((x) => x.trim());
      return Number(a) >= 0.5 && !(Number(rr) > 245 && Number(gg) > 240 && Number(bb) > 232);
    }).map((b) => (b.textContent || "").trim().slice(0, 30)));
  console.log(`@${width} filled controls: ${JSON.stringify(filled)}`);
  expect(filled.length, "the page's one filled control").toBe(1);

  const over = await page.evaluate(() => {
    const el = document.scrollingElement || document.documentElement;
    return el.scrollWidth - el.clientWidth;
  });
  console.log(`@${width} horizontal overflow: ${over}px`);
  expect(over).toBeLessThanOrEqual(1);

  /* the headline must not crop its own descenders */
  const h = await root.locator(".pkgt-h").evaluate((e) => ({
    scrollH: (e as HTMLElement).scrollHeight, clientH: (e as HTMLElement).clientHeight,
  }));
  console.log(`@${width} headline ${JSON.stringify(h)}`);
  expect(h.scrollH, "the headline is clipped").toBeLessThanOrEqual(h.clientH + 1);

  await page.screenshot({ path: resolve(process.cwd(), `reports/packages-two-state/teach-${width}.png`) });
});
}
