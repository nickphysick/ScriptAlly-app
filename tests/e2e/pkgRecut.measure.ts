/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The visual re-cut, driven. Every selector scoped inside `.pkg-root`.
 */
import { test, expect } from "@playwright/test";
import { openRoute, liftMotionSuppression } from "./measure";
import { mkdirSync, writeFileSync } from "node:fs";
const OUT = "reports/pkg-recut"; const ART = "run-artifacts/pkg-recut";
mkdirSync(OUT, { recursive: true }); mkdirSync(ART, { recursive: true });
const ROUTE = "/manuscripts/packages";


/* ══════════════════════════════════════════════════════════════════════════════
   §3 — THE MATERIALS BAND, ON A REAL GRID (D3)
   ══════════════════════════════════════════════════════════════════════════════ */

export const MATS = `(() => {
  const root = document.querySelector(".pkg-root");
  if (!root) return { error: "no .pkg-root" };
  const rect = (el) => { const b = el.getBoundingClientRect();
    return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height),
             top: Math.round(b.top), bottom: Math.round(b.bottom) }; };
  const cols = Array.from(root.querySelectorAll(".pkgb-matcol"));
  return {
    colCount: cols.length,
    columns: cols.map((c) => {
      const head = c.querySelector(".pkgb-matcolhead");
      const ghost = c.querySelector(".pkgb-ghost");
      const disc = c.querySelector(".pkgb-matcolhead .pkgb-plate");
      return {
        heading: (c.querySelector(".pkgb-eyebrow")?.textContent || "").trim(),
        held: (c.querySelector(".pkgb-matcolhead .pkgb-statline")?.textContent || "").trim(),
        box: rect(c),
        head: head ? rect(head) : null,
        ghost: ghost ? rect(ghost) : null,
        disc: disc ? rect(disc) : null,
        emptyHold: (c.querySelector(".pkgb-colempty")?.textContent || "").trim() || null,
        sheets: Array.from(c.querySelectorAll(".pkgb-sheet")).map((s) => {
          const meta = s.querySelector(".pkgb-smeta");
          const bin = s.querySelector(".pkgb-rem");
          const sb = rect(s);
          return {
            name: (s.querySelector(".pkgb-sname")?.textContent || "").trim(),
            /* ⚠️ THE PARENT'S TEXT, NOT EACH CHILD'S — the standing rule this build produced. Two
               children read separately are each correct while the line they make is not. */
            metaText: meta ? meta.textContent.replace(/\\s+/g, " ").trim() : null,
            /* and the geometry of the relationship: source and usage must share a line */
            /* CENTRES, NOT TOPS — the row centres its children and the dot is 2.5px tall, so three
               items on one line have three different top values. Same line means centres coincide.
               (Note for the reader: no backticks in this string; it is inside a template literal.) */
            metaKidMids: meta ? Array.from(meta.children).map((k) => {
              const b = k.getBoundingClientRect(); return Math.round((b.top + b.bottom) / 2);
            }) : [],
            /* ⚠️ THE GAP BETWEEN THE PARTS, because the separator is an EMPTY element and no string
               probe can see it. The source's right edge to the usage's left edge — if that closes to
               zero the line has jammed, whatever textContent says. */
            metaGap: meta && meta.children.length >= 3
              ? Math.round(meta.children[2].getBoundingClientRect().left - meta.children[0].getBoundingClientRect().right)
              : null,
            metaDot: meta ? Math.round((meta.querySelector(".pkgb-sdot") || {getBoundingClientRect:()=>({width:0})}).getBoundingClientRect().width) : 0,
            binCentred: bin ? Math.abs((rect(bin).top + rect(bin).bottom) / 2 - (sb.top + sb.bottom) / 2) : null,
            box: sb,
          };
        }),
      };
    }),
  };
})()`;

for (const vp of [{ w: 1440, h: 900 }, { w: 1920, h: 1200 }]) {
  test(`recut §3 — the materials grid at ${vp.w}`, async ({ page }) => {
    await openRoute(page, ROUTE, { width: vp.w, height: vp.h });
    await liftMotionSuppression(page);
    const r: any = await page.evaluate(MATS);
    writeFileSync(`${ART}/p3-mats-${vp.w}.txt`, JSON.stringify(r, null, 2) + "\n");
    console.log(`── ${vp.w} ──\n` + JSON.stringify(r, null, 2));
    await page.screenshot({ path: `${OUT}/p3-mats-${vp.w}.png`, fullPage: true });

    expect(r.colCount, "three type columns").toBe(3);

    /* D3 — heads share a top, ghosts share a bottom, columns are equal. BY CONSTRUCTION: these hold
       whatever each column contains, which is the whole point of the three-row grid. */
    const tops = r.columns.map((c: any) => c.head.top);
    expect(Math.max(...tops) - Math.min(...tops), `head tops ${tops}`).toBeLessThanOrEqual(1);
    const bots = r.columns.map((c: any) => c.ghost.bottom);
    expect(Math.max(...bots) - Math.min(...bots), `ghost bottoms ${bots}`).toBeLessThanOrEqual(1);
    const widths = r.columns.map((c: any) => c.box.w);
    expect(Math.max(...widths) - Math.min(...widths), `column widths ${widths}`).toBeLessThanOrEqual(1);

    /* The type disc is the ref's 76px, not content-sized. */
    for (const c of r.columns) {
      expect(c.disc.w, `${c.heading}'s disc`).toBe(76);
      expect(c.disc.h, `${c.heading}'s disc`).toBe(76);
    }

    /* D3 — sheet meta is ONE line, asserted on the parent and on the geometry. */
    for (const c of r.columns) {
      for (const s of c.sheets) {
        expect(s.metaText, `${s.name} has no meta line`).toBeTruthy();
        /**
         * ⚠️ GEOMETRY, NOT THE CONCATENATED STRING — and this is where the standing rule stops.
         * "Assert the parent's textContent" catches one collapse: two elements sharing a line that
         * should not. It cannot catch the opposite, because the separator here is an EMPTY span, so
         * `textContent` reads "TextIn 1 package" on a line that renders perfectly — the same string
         * the fault produced. A first draft asserted against that string and went red on a correct
         * page. The claim is about SPACING, so it is measured as spacing.
         */
        expect(Math.max(...s.metaKidMids) - Math.min(...s.metaKidMids),
          `${s.name}'s meta wrapped to more than one line`).toBeLessThanOrEqual(2);
        expect(s.metaDot, `${s.name}'s meta lost its separator dot`).toBeGreaterThan(0);
        expect(s.metaGap, `${s.name}'s meta parts are touching`).toBeGreaterThanOrEqual(14);
        expect(s.binCentred, `${s.name}'s bin is not vertically centred`).toBeLessThanOrEqual(2);
      }
    }
  });
}

/* ══════════════════════════════════════════════════════════════════════════════
   §1 — THE HERO, THE PRO REMOVAL, AND EVERY SLOT'S MARK (D1/D2/D4)
   ══════════════════════════════════════════════════════════════════════════════ */

export const HERO = `(() => {
  const root = document.querySelector(".pkg-root");
  if (!root) return { error: "no .pkg-root" };
  const rect = (el) => { if (!el) return null; const b = el.getBoundingClientRect();
    return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }; };
  const cs = (el, p) => el ? getComputedStyle(el).getPropertyValue(p).trim() : null;
  const hero = root.querySelector(".pkgb-hero");
  const L = root.querySelector(".pkgb-hero-l");
  const plate = root.querySelector(".pkgb-hero > .pkgb-plate");
  /* ⚠️ NATURAL height, taken by lifting the cell out of the grid's stretch. A rendered height cannot
     say whether a cell is at its own size or stretched to a row its sibling set — that is a fact
     about the arrangement, so the probe has to change the arrangement to see it. */
  const natural = (el) => { if (!el) return null;
    const prev = el.style.alignSelf; el.style.alignSelf = "start";
    const v = Math.round(el.getBoundingClientRect().height); el.style.alignSelf = prev; return v; };
  return {
    hero: rect(hero),
    cols: cs(hero, "grid-template-columns"),
    bg: cs(hero, "background-color"),
    topBorder: cs(hero, "border-top-width"),
    radius: cs(hero, "border-top-left-radius"),
    align: cs(hero, "align-items"),
    left: { box: rect(L), natural: natural(L) },
    plate: { box: rect(plate), natural: natural(plate), bg: cs(plate, "background-color") },
    headline: (root.querySelector(".pkgb-prob")?.textContent || "").trim(),
    rule: !!root.querySelector(".pkgb-hero-rule"),
    statline: (root.querySelector(".pkgb-hero-foot .pkgb-statline")?.textContent || "").replace(/\\s+/g, " ").trim(),
    h1s: Array.from(root.querySelectorAll("h1")).map((h) => h.textContent.trim()),
    titleInBand: !!root.querySelector(".pkgb-hero h1"),
    /* D1 — no Pro marker anywhere on this page, in any form */
    proMarkers: root.querySelectorAll(".pkgb-wax, .pkgw-propill, [class*=propill]").length,
    proText: (root.textContent.match(/\\bPRO\\b/g) || []).length,
    /* D4 — every slot renders a mark at the size its call site asked for */
    slots: Array.from(root.querySelectorAll(".pkgb-plate")).map((p) => {
      const svg = p.querySelector("svg");
      return {
        id: p.getAttribute("data-slot"), icon: p.getAttribute("data-icon"),
        px: svg ? Math.round(svg.getBoundingClientRect().width) : null,
        paths: svg ? svg.querySelectorAll("path, circle, rect").length : 0,
        plate: rect(p), dashed: getComputedStyle(p).borderTopStyle,
      };
    }),
    briefText: root.querySelectorAll(".pkgb-pbrief, .pkgb-plbl").length,
  };
})()`;

for (const vp of [{ w: 1440, h: 900 }, { w: 1920, h: 1200 }]) {
  test(`recut §1 — the hero at ${vp.w}`, async ({ page }) => {
    await openRoute(page, ROUTE, { width: vp.w, height: vp.h });
    await liftMotionSuppression(page);
    const r: any = await page.evaluate(HERO);
    writeFileSync(`${ART}/p1-hero-${vp.w}.txt`, JSON.stringify(r, null, 2) + "\n");
    console.log(`── ${vp.w} ──\n` + JSON.stringify(r, null, 2));
    await page.screenshot({ path: `${OUT}/p1-hero-${vp.w}.png`, fullPage: true });

    expect(r.hero, "no hero band").toBeTruthy();
    /* D2 — the container is WHITE and the panel is the only blush surface. */
    expect(r.bg, "the hero container is not white").toBe("rgb(255, 255, 255)");
    expect(r.plate.bg, "the illustration panel is not blush").not.toBe(r.bg);
    expect(r.topBorder, "the 4px sage top border").toBe("4px");
    expect(r.radius).toBe("16px");
    expect(r.align).toBe("center");
    expect(r.cols, "the ref's 1fr / 330px").toMatch(/330px$/);
    expect(r.plate.box.h, "the panel is 168px tall").toBe(168);

    /* D2 — the headline is promoted, and the title is NOT repeated. */
    expect(r.headline).toBe("Fed up of guessing which materials are landing with agents?");
    expect(r.rule, "the vertical rule between action and stat line").toBe(true);
    expect(r.titleInBand, "the band grew a title").toBe(false);
    expect(r.h1s.filter((t: string) => /Submission packages/i.test(t)).length, "the title is rendered twice").toBe(1);

    /* D1 — no Pro marker on this page, in any form. */
    expect(r.proMarkers, "a Pro marker survives on the page").toBe(0);
    expect(r.proText, "the letters PRO are still on the page").toBe(0);

    /* D4 — every plate carries a mark and no Caveat brief. */
    expect(r.briefText, "Caveat brief text survives in a plate").toBe(0);
    expect(r.slots.length, "no slots rendered — nothing was measured").toBeGreaterThan(8);
    for (const s of r.slots) {
      expect(s.paths, `slot ${s.id} (${s.icon}) drew no mark`).toBeGreaterThan(0);
      expect(s.dashed, `slot ${s.id} lost its dashed border`).toBe("dashed");
      expect(s.px, `slot ${s.id}'s mark is squashed`).toBeGreaterThanOrEqual(20);
    }
  });
}

/* ══════════════════════════════════════════════════════════════════════════════
   §4 — THE SWEEP
   ══════════════════════════════════════════════════════════════════════════════ */

export const SWEEP = `(() => {
  const root = document.querySelector(".pkg-root");
  if (!root) return { error: "no .pkg-root" };
  const scroller = root.querySelector(".wpg-scroll");
  /**
   * ⚠️ THE FILLED-CONTROL PROBE ASKS THE REAL QUESTION RATHER THAN KEEPING A LIST OF WHITES. A
   * first version excluded "rgb(255,255,255)" and the parchment, and reported the manuscript chip
   * as a second filled control — its fill is #fffefb, the app's card white, four points off pure
   * white and a surface rather than emphasis. Enumerating whites means the probe is wrong every
   * time a surface token is added. FILLED means the fill is a TINT: materially distant from white
   * in any channel. The page's one primary is #f5e2da, which is 10/29/37 away; every card and row
   * on the page is inside 6.
   */
  /* No regex — a backslash inside this template literal is eaten before the browser sees it, and
     the pattern arrived as /rgba?((d+), (d+), (d+)/ : "Unterminated group". Split instead. */
  const distFromWhite = (bg) => {
    const nums = bg.replace(/[^0-9,.]/g, "").split(",").map(Number);
    if (nums.length < 3) return 0;
    return Math.max(255 - nums[0], 255 - nums[1], 255 - nums[2]);
  };
  const filled = Array.from(root.querySelectorAll("button")).filter((b) => {
    const bg = getComputedStyle(b).backgroundColor;
    if (bg === "rgba(0, 0, 0, 0)" || bg === "transparent") return false;
    if (distFromWhite(bg) <= 8) return false;
    return b.getBoundingClientRect().width > 0;
  }).map((b) => ({ label: (b.textContent || "").trim().slice(0, 24),
                   bg: getComputedStyle(b).backgroundColor,
                   dist: distFromWhite(getComputedStyle(b).backgroundColor) }));
  return {
    filled,
    overflowPx: scroller ? scroller.scrollWidth - scroller.clientWidth : null,
    bands: Array.from(root.querySelectorAll(".pkgb-band")).map((b) => Math.round(b.getBoundingClientRect().width)),
    /* the tracking band's pre-sent ghosts — reachable ONLY with nothing sent */
    trackGhosts: Array.from(root.querySelectorAll(".pkgb-ghostpanel")).map((g) => ({
      title: (g.querySelector(".pkgb-gpt")?.textContent || "").trim(),
      slot: g.querySelector(".pkgb-plate")?.getAttribute("data-slot"),
      icon: g.querySelector(".pkgb-plate")?.getAttribute("data-icon"),
      px: Math.round(g.querySelector("svg")?.getBoundingClientRect().width ?? 0),
      plate: Math.round(g.querySelector(".pkgb-plate")?.getBoundingClientRect().width ?? 0),
    })),
    nudge: (root.querySelector(".pkgb-nudge")?.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 70) || null,
    statCards: root.querySelectorAll(".pkgb-stat").length,
    pkgCards: root.querySelectorAll(".pkgb-pkgcard").length,
  };
})()`;

for (const vp of [{ w: 1440, h: 900 }, { w: 1920, h: 1200 }]) {
  test(`recut §4 — the sweep at ${vp.w}`, async ({ page }) => {
    await openRoute(page, ROUTE, { width: vp.w, height: vp.h });
    await liftMotionSuppression(page);
    const r: any = await page.evaluate(SWEEP);
    const state = r.pkgCards > 1 ? "full" : "sparse";
    writeFileSync(`${ART}/p4-sweep-${state}-${vp.w}.txt`, JSON.stringify(r, null, 2) + "\n");
    console.log(`── ${state} @ ${vp.w} ──\n` + JSON.stringify(r, null, 2));
    await page.screenshot({ path: `${OUT}/p4-sweep-${state}-${vp.w}.png`, fullPage: true });

    expect(r.bands.length, "no bands — nothing was measured").toBeGreaterThan(2);
    /* Exactly one filled control on the page. */
    expect(r.filled.map((f: any) => f.label), `filled controls: ${JSON.stringify(r.filled)}`)
      .toEqual(["＋ New package"]);
    expect(r.overflowPx, "the page scrolls sideways").toBeLessThanOrEqual(0);
    /* Every band takes the same measure. */
    expect(new Set(r.bands).size, `band widths ${r.bands}`).toBe(1);

    /* The pre-sent ghosts, where the data reaches them. */
    if (r.trackGhosts.length) {
      expect(r.trackGhosts.length).toBe(2);
      for (const g of r.trackGhosts) {
        expect(g.px, `${g.title}'s mark`).toBe(52);
        expect(g.plate, `${g.title}'s plate`).toBe(86);
      }
      expect(r.nudge, "ghosts without the nudge above them").toBeTruthy();
    }
  });
}
