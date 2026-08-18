/**
 * §3 — the agent header's profile mark, on the running page.
 *
 * ⚠️ THE CLAIM IS A CENTRE, so only a rect can settle it. A `grid-row` span and an `align-self` can
 * both be present and the mark still sit on the first line if a sub-row is placed outside the grid.
 *
 *   npx playwright test --project=measure qcLead
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

test("§3 — the mark is centred on the whole left block, and it is avatar-scale", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  await page.locator(".f12-row").first().click({ timeout: 5000 });
  await page.waitForTimeout(400);

  const read = await page.evaluate(() => {
    const lead = document.querySelector<HTMLElement>(".qc-mlead");
    const name = document.querySelector<HTMLElement>(".qc-mval");
    const pills = document.querySelector<HTMLElement>(".qc-mailrows .qc-msub");
    if (!lead || !name) return null;
    const svg = lead.querySelector<SVGElement>("svg")!.getBoundingClientRect();
    const l = lead.getBoundingClientRect(), n = name.getBoundingClientRect();
    const p = pills?.getBoundingClientRect() ?? null;
    /* the block the mark is meant to be centred against: name and pills together */
    const top = p ? Math.min(n.top, p.top) : n.top;
    const bottom = p ? Math.max(n.bottom, p.bottom) : n.bottom;
    const cs = getComputedStyle(lead);
    return {
      markCentre: l.top + l.height / 2,
      blockCentre: (top + bottom) / 2,
      nameCentre: n.top + n.height / 2,
      blockH: Math.round(bottom - top),
      glyph: Math.round(svg.width),
      box: Math.round(l.width),
      rows: p ? 2 : 1,
      /* bare: nothing painted behind it */
      bg: cs.backgroundColor, border: cs.borderTopWidth, shadow: cs.boxShadow,
      onScreen: l.top >= 0 && l.bottom <= innerHeight,
    };
  });

  console.log(`\nmark ${read?.glyph}px glyph in a ${read?.box}px box · block ${read?.blockH}px over ${read?.rows} rows`);
  console.log(`  mark centre ${read?.markCentre.toFixed(1)} · block centre ${read?.blockCentre.toFixed(1)} · name-only centre ${read?.nameCentre.toFixed(1)}`);
  console.log(`  bare: bg ${read?.bg} · border ${read?.border} · shadow ${read?.shadow}`);

  expect(read, "no profile mark on the header").not.toBeNull();
  /* ⚠️ ON SCREEN BEFORE ANYTHING IS ASKED OF THE RECT — an off-screen box still reports numbers. */
  expect(read!.onScreen, "the header is off screen, so these centres describe nothing").toBe(true);
  /* ⚠️ THE BLOCK MUST HAVE TWO ROWS, or "centred on the block" and "centred on the name" are the
     same statement and this proves nothing. */
  expect(read!.rows, "the left block has one row — the section's claim is untestable here").toBe(2);
  expect(Math.abs(read!.markCentre - read!.blockCentre), "the mark is not centred on the name-and-pills block").toBeLessThanOrEqual(1);
  expect(Math.abs(read!.markCentre - read!.nameCentre), "the mark is still centred on the first line alone").toBeGreaterThan(2);
  /* avatar-scale, not a leading bullet */
  expect(read!.glyph, `the glyph is ${read!.glyph}px`).toBeGreaterThanOrEqual(24);
  /* bare — the status mark stays the card's only circular object */
  expect(read!.bg, "the mark grew a plate").toMatch(/rgba\(0, 0, 0, 0\)|transparent/);
  expect(read!.border, "the mark grew a ring").toBe("0px");
  expect(read!.shadow, "the mark grew a ground").toBe("none");
});
