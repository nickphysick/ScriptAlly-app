/**
 * Comparable titles v2 — the layout claims, measured on a rendered page.
 *
 * ⚠️ THIS EXISTS BECAUSE THE UNIT LOCKS CANNOT SEE ANY OF IT. They prove a rule was written; the
 * cascade and the box model decide what happens to it. The masthead alignment in particular is
 * arithmetic between two `min()` expressions in two different stylesheets, and "the declaration is
 * correct" and "the plate lines up with the sheet" are different claims.
 *
 *   npm run build:dev && npx vite preview --port 4180
 *   SA_E2E_BASE_URL=http://localhost:4180 npx playwright test compsV2
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

const ROUTE = "/manuscripts/comps";

for (const vp of [{ width: 1440, height: 900 }, { width: 2300, height: 1200 }]) {
  test(`the plate and the sheet share one left edge @ ${vp.width}`, async ({ page }) => {
    await openRoute(page, ROUTE, vp);
    const r = await page.evaluate(() => {
      const grid = [...document.querySelectorAll(".wpg")].find((x) => x.getBoundingClientRect().height > 0);
      if (!grid) return null;
      const mast = grid.querySelector(".wpg-mast") as HTMLElement | null;
      const hero = grid.querySelector(".ct-hero") as HTMLElement | null;
      if (!mast || !hero) return null;
      const m = mast.getBoundingClientRect();
      const h = hero.getBoundingClientRect();
      return { mastL: Math.round(m.left), mastR: Math.round(m.right), heroL: Math.round(h.left), heroR: Math.round(h.right) };
    });
    expect(r, "the grid, masthead or hero did not render").not.toBeNull();
    console.log(`  ${vp.width}px → plate ${r!.mastL}…${r!.mastR} · sheet ${r!.heroL}…${r!.heroR}`);
    /* ⚠️ BOTH EDGES, NOT JUST THE LEFT. The two measures are `min()` expressions; a left-only check
       passes on a page whose right edges diverge past the cap, which is exactly where they used to. */
    expect(Math.abs(r!.mastL - r!.heroL), "the plate overhangs the sheet on the left").toBeLessThanOrEqual(1);
    expect(Math.abs(r!.mastR - r!.heroR), "the plate overhangs the sheet on the right").toBeLessThanOrEqual(1);
  });
}

test("the hero is two columns, and the tile is beside the text rather than under it", async ({ page }) => {
  await openRoute(page, ROUTE, { width: 1440, height: 900 });
  const r = await page.evaluate(() => {
    const hero = document.querySelector(".ct-hero") as HTMLElement | null;
    const left = document.querySelector(".ct-hero-l") as HTMLElement | null;
    const tile = document.querySelector(".ct-mstile") as HTMLElement | null;
    if (!hero || !left || !tile) return null;
    const l = left.getBoundingClientRect(), t = tile.getBoundingClientRect();
    const facts = [...document.querySelectorAll(".ct-hero-fact")].length;
    return { leftR: Math.round(l.right), tileL: Math.round(t.left), tileW: Math.round(t.width), tileH: Math.round(t.height), sameRow: Math.abs(l.top - t.top) < 40, facts };
  });
  expect(r, "the hero did not render").not.toBeNull();
  console.log(`  hero → tile ${r!.tileW}×${r!.tileH} at x${r!.tileL}, text ends x${r!.leftR}, ${r!.facts} facts`);
  expect(r!.sameRow, "the tile dropped below the text — the dead space is back").toBe(true);
  expect(r!.tileL, "the tile overlaps the text column").toBeGreaterThanOrEqual(r!.leftR);
  expect(r!.facts, "the fact row is not three facts").toBe(3);
});

test("a comp card is spine · main · aside, and the spine fills its height", async ({ page }) => {
  await openRoute(page, ROUTE, { width: 1440, height: 900 });
  const r = await page.evaluate(() => {
    const card = document.querySelector(".ct-crow") as HTMLElement | null;
    if (!card) return { none: true };
    const spine = card.querySelector(".ct-spine") as HTMLElement;
    const main = card.querySelector(".ct-cmain") as HTMLElement;
    const aside = card.querySelector(".ct-caside") as HTMLElement;
    if (!spine || !main || !aside) return { none: false, missing: true };
    const c = card.getBoundingClientRect(), s = spine.getBoundingClientRect();
    const m = main.getBoundingClientRect(), a = aside.getBoundingClientRect();
    return {
      none: false, missing: false,
      cardH: Math.round(c.height), spineH: Math.round(s.height), spineW: Math.round(s.width),
      asideW: Math.round(a.width), order: s.left < m.left && m.left < a.left,
      /* the spine's rotated year must fit its own 44px track rather than overflowing it */
      yearFits: (spine.querySelector(".yr") as HTMLElement).getBoundingClientRect().width <= s.width + 1,
    };
  });
  if ((r as { none: boolean }).none) { console.log("  no comps on the harness account — card geometry not measured"); test.skip(); return; }
  expect((r as { missing: boolean }).missing, "the card rendered without one of its three tracks").toBe(false);
  const g = r as { cardH: number; spineH: number; spineW: number; asideW: number; order: boolean; yearFits: boolean };
  console.log(`  card ${g.cardH}px → spine ${g.spineW}×${g.spineH} · aside ${g.asideW}px`);
  expect(g.order, "the tracks are out of order").toBe(true);
  expect(g.spineW, "the spine is not its 44px track").toBe(44);
  expect(g.asideW, "the aside is not its 214px track").toBe(214);
  expect(Math.abs(g.spineH - g.cardH), "the spine does not fill the card — align-items regressed").toBeLessThanOrEqual(2);
  expect(g.yearFits, "the rotated year overflows the spine — transform:rotate is back").toBe(true);
});

test("no two pieces of text share pixels anywhere on the page", async ({ page }) => {
  await openRoute(page, ROUTE, { width: 1440, height: 900 });
  const r = await page.evaluate(() => {
    const root = document.querySelector(".ct-pagebody") as HTMLElement;
    if (!root) return null;
    const leaves: { t: string; b: DOMRect }[] = [];
    root.querySelectorAll("*").forEach((el) => {
      const e = el as HTMLElement;
      if (e.children.length > 0) return;                       // LEAVES ONLY — a parent contains its children by construction
      const txt = (e.textContent ?? "").trim();
      if (!txt) return;
      const c = getComputedStyle(e);
      if (c.visibility === "hidden" || c.display === "none" || parseFloat(c.opacity) < 0.1) return;
      const b = e.getBoundingClientRect();
      if (b.width < 2 || b.height < 2) return;
      if (e.closest(".ghost")) return;                          // the blurred teaser is decoration
      leaves.push({ t: txt.slice(0, 30), b });
    });
    const hits: string[] = [];
    for (let i = 0; i < leaves.length; i++) {
      for (let j = i + 1; j < leaves.length; j++) {
        const A = leaves[i].b, B = leaves[j].b;
        const ox = Math.min(A.right, B.right) - Math.max(A.left, B.left);
        const oy = Math.min(A.bottom, B.bottom) - Math.max(A.top, B.top);
        if (ox > 1 && oy > 1) hits.push(`"${leaves[i].t}" ∩ "${leaves[j].t}"`);
      }
    }
    return { count: leaves.length, hits: hits.slice(0, 6) };
  });
  expect(r, "the page body did not render").not.toBeNull();
  console.log(`  scanned ${r!.count} text leaves, ${r!.hits.length} overlaps`);
  /* ⚠️ THE POPULATION FIRST. Zero boxes yields zero overlaps and passes having measured nothing. */
  expect(r!.count, "no text found — the scan measured nothing").toBeGreaterThan(15);
  expect(r!.hits, `overlapping text: ${r!.hits.join(" · ")}`).toHaveLength(0);
});
