/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list empty state — the opening's spacing (spacing pass, retargeted by the empty-states
 * pack's Phase 3).
 *
 * ⚠️ RETARGETED BECAUSE ITS SUBJECTS WERE RETIRED, AND THE CRASH IS WHY THIS COULD NOT BE LEFT.
 * Phase 3 replaced the editorial six-row page with the ref's feature-led one: `.cle-stages`,
 * `.cle-stages-grid`, `.cle-slot` and `.cle-stage h4` no longer render. Every one of them was
 * dereferenced here with a non-null `!`, so this file would have THROWN rather than failed — and a
 * throw names a line number where a failure names a property, which is how a genuinely broken lock
 * disappears into a noisy run. The repo records that exact class.
 *
 * ⚠️ WHAT SURVIVES IS THE ONE CLAIM THAT WAS NEVER ABOUT THE STAGES: the 118px opening under the
 * page header, paid 17 by the workspace grid and 101 by the section. That number is measured,
 * reasoned and deployed, and the first cut of Phase 3's rewrite set 40px — which would have taken
 * it to 57 with nothing in the Vitest gate to notice.
 *
 * ⚠️ AND WHAT WENT IS NAMED RATHER THAN DELETED QUIETLY: the two-line headline break after
 * "champion" (a claim about a CENTRED 720px measure — the hero is a two-column grid now, so the
 * break is a different fact), the plate-versus-headline weight ratio, the stage grid's own
 * stacking width, and the per-stage heading line counts. All four described the retired page.
 *
 * ⚠️ THIS FILE HAS NOT BEEN RUN SINCE THE RETARGET. It needs the Vite dev server and a signed-in
 * harness; the run report says so explicitly rather than implying a green.
 *
 * ⚠️ NEEDS THE VITE DEV SERVER, NOT A BUILD, for `#/contact-lab` — see contactEmpty.measure.ts.
 *
 * ⚠️ THE GAP UNDER THE HEADER IS MEASURED FROM THE HAIRLINE TO THE INK, and both ends matter. The
 * brief names one number for it; the page pays it in two parts (the workspace grid's own gap plus
 * whatever the section adds), so a value read off one declaration would describe neither.
 *
 * ⚠️ AND A LINE COUNT IS TAKEN FROM RANGE RECTS, NEVER FROM `scrollHeight / lineHeight`. The second
 * is arithmetic about a box; the first is where the browser actually broke the sentence, which is
 * the whole question — and it names the words on each line, so an orphan is visible rather than
 * inferred.
 */
import { test, expect } from "@playwright/test";

const WIDTHS = [1280, 1440, 1728];

test("the opening — gap, break and plate weight", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/#/contact-lab");
  await page.locator(".cle").waitFor({ state: "visible", timeout: 20_000 });
  expect(await page.locator(".cle").count(), "the blank state is on screen").toBe(1);

  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(150);

    const m = await page.evaluate(() => {
      const scroll = document.querySelector<HTMLElement>(".aglist .wpg-scroll")!;
      scroll.scrollTop = 0;
      const head = document.querySelector<HTMLElement>(".wsh")!;
      const h2 = document.querySelector<HTMLElement>(".cle-hero-h")!;
      const hero = document.querySelector<HTMLElement>(".cle-hero")!;
      const cta = document.querySelector<HTMLElement>(".cle-hero-cta");
      /* ⚠️ GUARDED, NOT `!`. The whole reason this file needed retargeting is that four unguarded
         dereferences turned a retirement into a throw. A reading of `null` is a FAILURE with a
         property name on it; `foo!.bar` on a retired element is a stack trace. */
      const rows = [...document.querySelectorAll<HTMLElement>(".cle-row")];
      const closing = document.querySelector<HTMLElement>(".cle-closing");

      /* where the browser actually broke the sentence — Range rects, one per rendered line */
      const r = document.createRange();
      r.selectNodeContents(h2);
      const rects = [...r.getClientRects()].filter((x) => x.width > 1);
      const lines: { top: number; words: string }[] = [];
      const text = (h2.textContent || "").trim();
      for (const rect of rects) {
        if (!lines.some((l) => Math.abs(l.top - rect.top) < 4)) lines.push({ top: rect.top, words: "" });
      }
      /* name the words on the last line by walking characters into line buckets */
      const tn = h2.firstChild as Text;
      for (let i = 0; i < text.length; i++) {
        const cr = document.createRange();
        cr.setStart(tn, i);
        cr.setEnd(tn, i + 1);
        const b = cr.getBoundingClientRect();
        const line = lines.find((l) => Math.abs(l.top - b.top) < 6);
        if (line) line.words += text[i];
      }

      const headBottom = head.getBoundingClientRect().bottom;
      const h2Box = h2.getBoundingClientRect();
      return {
        gapHeaderToHeadline: Math.round(h2Box.top - headBottom),
        headlineFontPx: parseFloat(getComputedStyle(h2).fontSize),
        headlineMeasure: Math.round(h2.getBoundingClientRect().width),
        heroPadTop: getComputedStyle(hero).paddingTop,
        lines: lines.map((l) => l.words.trim()),
        heroMeasure: Math.round(hero.getBoundingClientRect().width),
        heroColumns: getComputedStyle(hero).gridTemplateColumns.split(" ").length,
        hasCta: !!cta,
        featureRows: rows.length,
        hasClosing: !!closing,
      };
    });
    console.log(`\n── ${width}px ──`);
    console.log(`  header rule → headline : ${m.gapHeaderToHeadline}px  (hero padding-top ${m.heroPadTop})`);
    console.log(`  headline               : ${m.headlineFontPx}px over ${m.headlineMeasure}px`);
    m.lines.forEach((l, i) => console.log(`    line ${i + 1}: "${l}"`));
    console.log(`  hero                   : ${m.heroMeasure}px over ${m.heroColumns} cols · cta ${m.hasCta}`);
    console.log(`  feature rows           : ${m.featureRows} · closing ${m.hasClosing}`);

    /* ⚠️ THE GAP IS ASSERTED AS THE RENDERED TOTAL, NOT AS THE SECTION'S DECLARATION. The grid
       pays 17 of it and the section pays 101; a lock on either half describes neither. */
    expect(m.gapHeaderToHeadline, `${width}: the opening is the full 118`).toBeGreaterThanOrEqual(116);
    expect(m.gapHeaderToHeadline, `${width}: …and no more`).toBeLessThanOrEqual(120);

    /* ⚠️ THE BREAK-AFTER-"champion" CLAIM IS RETIRED WITH THE CENTRED HERO. It was a fact about a
       720px centred measure; the hero is a two-column grid, so where the sentence breaks is a
       different question and pinning the old answer would fail on a correct page. What survives is
       the orphan law, which is true of any measure: no line may be one word on its own. */
    expect(m.lines.length, `${width}: the headline sets on more than one line`).toBeGreaterThan(1);
    for (const [i, l] of m.lines.entries()) {
      expect(l.split(/\s+/).length, `${width}: line ${i + 1} is one orphaned word`).toBeGreaterThan(1);
    }

    /* the page is the whole feature-led one, not a hero that lost its rows */
    expect(m.hasCta, `${width}: the hero's CTA is the class the measurement queries`).toBe(true);
    expect(m.featureRows, `${width}: both feature rows render`).toBe(2);
    expect(m.hasClosing, `${width}: the closing ask renders`).toBe(true);

    /* ⚠️ THE PLATE-WEIGHT RATIO IS RETIRED WITH THE PLATES. It guarded a 341-381px illustrator
       placeholder against a 42px headline; the feature-led page draws no placeholder plate at all,
       so there is no ratio left to hold and asserting one would be a claim about nothing. */
  }
});

/**
 * ⚠️ THIS TEST WAS THE STAGE GRID'S, END TO END — its columns, its gutters, its per-plate heading
 * line counts and its own 900px stacking width. The grid is retired, so it is REWRITTEN to the
 * claim that survives the restructure: the two feature rows stack to one column at the sheet's one
 * remaining breakpoint, and nothing opens a horizontal scrollbar on the way down.
 */
test("stacking and gutters at narrow widths", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/#/contact-lab");
  await page.locator(".cle").waitFor({ state: "visible", timeout: 20_000 });

  for (const width of [1176, 1040, 1024, 960, 920, 900, 860, 768, 375]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(140);
    const m = await page.evaluate(() => {
      const scroll = document.querySelector<HTMLElement>(".aglist .wpg-scroll")!;
      const cle = document.querySelector<HTMLElement>(".cle")!;
      const rows = [...document.querySelectorAll<HTMLElement>(".cle-row")];
      const scrollBox = scroll.getBoundingClientRect();
      const cleBox = cle.getBoundingClientRect();
      /* ⚠️ COLUMN COUNTS PER ROW, because the two rows must stack TOGETHER — one stacked beside one
         still in two columns is the rhythm breaking at a width nobody looked at. */
      const cols = rows.map((r) => getComputedStyle(r).gridTemplateColumns.split(" ").length);
      /* the flipped row must read copy-then-illustration once stacked: DOM order is always
         txt-then-ill, so `order: 0` on both is what makes the visual order follow it */
      const flipOrders = rows.map((r) => {
        const txt = r.querySelector<HTMLElement>(".cle-txt");
        const ill = r.querySelector<HTMLElement>(".cle-ill");
        return txt && ill
          ? [getComputedStyle(txt).order, getComputedStyle(ill).order].join("/")
          : "missing";
      });
      return {
        cols,
        flipOrders,
        gutterL: Math.round(cleBox.left - scrollBox.left),
        gutterR: Math.round(scrollBox.right - cleBox.right),
        overflow: scroll.scrollWidth - scroll.clientWidth,
        docOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });
    console.log(
      `  ${String(width).padStart(4)}px — rows [${m.cols.join(" ")}] cols  order [${m.flipOrders.join(" ")}]  gutters ${m.gutterL}/${m.gutterR}  overflow ${m.overflow}/${m.docOverflow}`,
    );
    expect(m.overflow, `${width}: no sideways scroll`).toBeLessThanOrEqual(0);
    expect(m.docOverflow, `${width}: no sideways scroll on the document`).toBeLessThanOrEqual(0);

    /* the population, before any claim about it — two rows, both found */
    expect(m.cols.length, `${width}: both feature rows were measured`).toBe(2);

    /* ⚠️ ASSERTED FROM BOTH SIDES, or "it stacks below 1040" is satisfied by a grid that stacks at
       1400 as well. Every row takes the same answer: one stacked beside one still in two columns
       is the rhythm breaking at a width nobody looked at. */
    const want = width > 1040 ? 2 : 1;
    for (const [i, c] of m.cols.entries()) {
      expect(c, `${width}: row ${i + 1} has ${want} column(s)`).toBe(want);
    }

    /* ⚠️ AND ONCE STACKED, THE FLIP IS OFF. DOM order is always copy-then-illustration, so `0/0`
       is what makes the visual order follow the reading order; above the breakpoint the flipped
       row is `2/1`. Both directions, because asserting only the stacked half passes on a page
       that never flipped at all. */
    if (width > 1040) {
      expect(m.flipOrders, `${width}: the second row flips`).toEqual(["0/0", "2/1"]);
    } else {
      for (const o of m.flipOrders) expect(o, `${width}: the flip is reset when stacked`).toBe("0/0");
    }

    /* ⚠️ AND THE GUTTERS STAY SYMMETRIC. A cap that binds while a page-level padding does not is
       exactly how one side ends up wider. */
    expect(Math.abs(m.gutterL - m.gutterR), `${width}: symmetric gutters`).toBeLessThanOrEqual(1);
  }
});
