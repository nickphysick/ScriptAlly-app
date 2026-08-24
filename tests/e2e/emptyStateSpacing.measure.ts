/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list empty state — the opening's spacing and scale (spacing pass).
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
      const stages = document.querySelector<HTMLElement>(".cle-stages")!;
      const grid = document.querySelector<HTMLElement>(".cle-stages-grid")!;
      const slot = document.querySelector<HTMLElement>(".cle-slot")!;
      const cta = document.querySelector<HTMLElement>(".cle-hero-cta")!;

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
      const slotBox = slot.getBoundingClientRect();
      return {
        gapHeaderToHeadline: Math.round(h2Box.top - headBottom),
        headlineFontPx: parseFloat(getComputedStyle(h2).fontSize),
        headlineMeasure: Math.round(h2.getBoundingClientRect().width),
        heroPadTop: getComputedStyle(hero).paddingTop,
        lines: lines.map((l) => l.words.trim()),
        ctaBottomToStages: Math.round(stages.getBoundingClientRect().top - cta.getBoundingClientRect().bottom),
        stagesMeasure: Math.round(grid.getBoundingClientRect().width),
        heroMeasure: Math.round(hero.getBoundingClientRect().width),
        plate: `${Math.round(slotBox.width)}×${Math.round(slotBox.height)}`,
        plateVsHeadline: +(slotBox.height / h2Box.height).toFixed(2),
        columns: getComputedStyle(grid).gridTemplateColumns.split(" ").length,
      };
    });
    console.log(`\n── ${width}px ──`);
    console.log(`  header rule → headline : ${m.gapHeaderToHeadline}px  (hero padding-top ${m.heroPadTop})`);
    console.log(`  headline               : ${m.headlineFontPx}px over ${m.headlineMeasure}px`);
    m.lines.forEach((l, i) => console.log(`    line ${i + 1}: "${l}"`));
    console.log(`  CTA → stages           : ${m.ctaBottomToStages}px`);
    console.log(`  measures               : hero ${m.heroMeasure} · stages ${m.stagesMeasure} (${m.columns} cols)`);
    console.log(`  plate                  : ${m.plate}   plate-height ÷ headline-height = ${m.plateVsHeadline}`);

    /* ⚠️ THE GAP IS ASSERTED AS THE RENDERED TOTAL, NOT AS THE SECTION'S DECLARATION. The grid
       pays 17 of it and the section pays 101; a lock on either half describes neither. */
    expect(m.gapHeaderToHeadline, `${width}: the opening is the full 118`).toBeGreaterThanOrEqual(116);
    expect(m.gapHeaderToHeadline, `${width}: …and no more`).toBeLessThanOrEqual(120);

    /* ⚠️ TWO LINES, AND THE SECOND ONE IS NOT AN ORPHAN. Asserting the COUNT alone passes on the
       fault this pass corrects — 42/880 was two lines too, with `words.` alone on the second. The
       claim is about the break, so the break is what is measured. */
    expect(m.lines.length, `${width}: the headline sets on two lines`).toBe(2);
    expect(m.lines[0], `${width}: the break falls after "champion"`).toMatch(/champion$/);
    expect(m.lines[1].split(/\s+/).length, `${width}: line two is not one orphaned word`).toBeGreaterThan(1);

    /* ⚠️ THE PLATE MUST NOT OUT-WEIGH THE HEADLINE. A ratio, not a size: the fault was relative —
       341–381px plates beside a 42px headline — so a bare width assertion would miss it returning
       the day either number moves. It was 2.72; the ceiling is what "supporting" means here. */
    expect(m.plateVsHeadline, `${width}: the headline wins the page`).toBeLessThan(2.4);
  }
});

test("stacking and gutters at narrow widths", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/#/contact-lab");
  await page.locator(".cle").waitFor({ state: "visible", timeout: 20_000 });

  for (const width of [1176, 1040, 1024, 960, 920, 900, 860, 768, 375]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(140);
    const m = await page.evaluate(() => {
      const grid = document.querySelector<HTMLElement>(".cle-stages-grid")!;
      const scroll = document.querySelector<HTMLElement>(".aglist .wpg-scroll")!;
      const cols = getComputedStyle(grid).gridTemplateColumns.split(" ").map((v) => Math.round(parseFloat(v)));
      const gridBox = grid.getBoundingClientRect();
      const scrollBox = scroll.getBoundingClientRect();
      /* how hard is the narrowest stage heading working at this width? */
      const h4 = [...document.querySelectorAll<HTMLElement>(".cle-stage h4")]
        .map((h) => Math.round(h.getBoundingClientRect().height / parseFloat(getComputedStyle(h).lineHeight)));
      const plate = document.querySelector<HTMLElement>(".cle-slot")!.getBoundingClientRect();
      return {
        cols,
        headingLines: h4,
        plate: `${Math.round(plate.width)}×${Math.round(plate.height)}`,
        gutterL: Math.round(gridBox.left - scrollBox.left),
        gutterR: Math.round(scrollBox.right - gridBox.right),
        overflow: scroll.scrollWidth - scroll.clientWidth,
        docOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });
    console.log(
      `  ${String(width).padStart(4)}px — ${m.cols.length} col [${m.cols.join(" ")}]  plate ${m.plate}  heading lines ${m.headingLines.join("/")}  gutters ${m.gutterL}/${m.gutterR}  overflow ${m.overflow}/${m.docOverflow}`,
    );
    expect(m.overflow, `${width}: no sideways scroll`).toBeLessThanOrEqual(0);
    expect(m.docOverflow, `${width}: no sideways scroll on the document`).toBeLessThanOrEqual(0);

    /* ⚠️ THE STACKING POINT IS ASSERTED FROM BOTH SIDES, or "it stacks below 900" is satisfied by
       a grid that stacks at 1400 as well. */
    expect(m.cols.length, `${width}: three columns above 900, one at or below`).toBe(width > 900 ? 3 : 1);

    /* ⚠️ AND THE GUTTERS STAY SYMMETRIC. The narrower cap could only misbehave here — a cap that
       binds while a page-level padding does not is exactly how one side ends up wider. */
    expect(Math.abs(m.gutterL - m.gutterR), `${width}: symmetric gutters`).toBeLessThanOrEqual(1);
  }
});
