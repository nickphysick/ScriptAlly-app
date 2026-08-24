/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list — the editorial empty state, measured on the running app.
 *
 * ⚠️ THIS ONE NEEDS THE VITE DEV SERVER, NOT A BUILD, AND WILL FAIL AGAINST `SA_E2E_BASE_URL=dev`.
 * It opens `#/contact-lab`, and EVERY `#/…-lab` route in this app is behind `import.meta.env.DEV`
 * — which Vite derives from `NODE_ENV`, not from `--mode`, so `vite build --mode development`
 * strips them all (verified: `grep -c notes-lab dist/assets/index-*.js` → 0). Run it as
 *
 *     npx vite --port 3100
 *     SA_E2E_BASE_URL=http://localhost:3100 npx playwright test tests/e2e/contactEmpty.measure.ts
 *
 * ⚠️ IT STATES ITS OWN PRECONDITION FIRST. The blank state only exists on an account with no
 * agents on file; on any other account every claim below is trivially satisfied by an element
 * that is not there, and the run would go green having measured nothing. `expect(blank)` is the
 * first assertion in every case for exactly that reason.
 */
import { test, expect } from "@playwright/test";
import { scrollbarWidth } from "./measure";

const W = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "phone", width: 375, height: 812 },
];

/**
 * ⚠️ THE LAB ROUTE, NOT `/agents`, AND THE REASON MATTERS. The blank state exists only on an
 * account with no agents on file; the harness account has sixteen, so `/agents` can never show it
 * (verified — this file's first run reported `.cle:0 .agl-toolbar:1 cards:16` and declined to
 * assert). `#/contact-lab` mounts THE REAL `AgentList` over a stub db, so every class, token and
 * stylesheet below is the shipped one. It is a data substitution, not a reconstruction.
 */
test("the blank Contact list, at three widths", async ({ page }) => {
  await page.setViewportSize(W[0]);
  await page.goto("/#/contact-lab");
  await page.locator(".aglist").waitFor({ state: "visible", timeout: 20_000 });
  console.log(`scrollbar: ${await scrollbarWidth(page)}px`);

  const blank = await page.locator(".cle").count();
  const toolbar = await page.locator(".agl-toolbar").count();
  const agentCards = await page.locator("[data-agent-card]").count();
  console.log(`PRECONDITION — .cle:${blank} .agl-toolbar:${toolbar} cards:${agentCards}`);

  expect(blank, "the blank state is on screen — every claim below is vacuous without it").toBe(1);

  /* the toolbar is ABSENT, not hidden */
  expect(toolbar, "toolbar suppressed on a blank account").toBe(0);

  for (const v of W) {
    await page.setViewportSize({ width: v.width, height: v.height });
    await page.waitForTimeout(120);

    /* ⚠️ HORIZONTAL OVERFLOW IS THE ONE THE ROTATED CARDS CAN CAUSE. Measured on the scroller,
       which is the page's real scroll container, and on the document as a belt. */
    const over = await page.evaluate(() => {
      const s = document.querySelector<HTMLElement>(".aglist .wpg-scroll");
      const d = document.documentElement;
      return {
        scroller: s ? s.scrollWidth - s.clientWidth : -1,
        doc: d.scrollWidth - d.clientWidth,
        body: document.body.scrollWidth - document.body.clientWidth,
      };
    });
    console.log(`${v.name} ${v.width} — overflow scroller:${over.scroller} doc:${over.doc} body:${over.body}`);
    expect(over.scroller, `${v.name}: no sideways scroll in the page scroller`).toBeLessThanOrEqual(0);
    expect(over.doc, `${v.name}: no sideways scroll on the document`).toBeLessThanOrEqual(0);

    /* ⚠️ COPY BEFORE ILLUSTRATION ON EVERY ROW ONCE STACKED — a `flip` that survived the stack
       reads as a mistake rather than as rhythm. Compared by RENDERED POSITION, never by source
       order: `order` is exactly the property that makes those two disagree. */
    const rows = await page.evaluate(() =>
      [...document.querySelectorAll(".cle-row")].map((r) => {
        const l = r.querySelector(".cle-row-l")!.getBoundingClientRect();
        const a = r.querySelector(".cle-row-art")!.getBoundingClientRect();
        return { flip: r.classList.contains("flip"), copyTop: Math.round(l.top), artTop: Math.round(a.top), copyLeft: Math.round(l.left), artLeft: Math.round(a.left) };
      }),
    );
    expect(rows.length, "six rows rendered").toBe(6);
    if (v.width <= 1040) {
      for (const [i, r] of rows.entries()) {
        expect(r.copyTop, `${v.name} row ${i + 1}: copy above its illustration`).toBeLessThan(r.artTop);
      }
      console.log(`${v.name} — all six rows read copy-then-illustration`);
    } else {
      const sides = rows.map((r) => (r.copyLeft < r.artLeft ? "L" : "R"));
      console.log(`${v.name} — copy sides: ${sides.join(" ")}`);
      expect(sides).toEqual(["L", "R", "L", "R", "L", "R"]);
    }

    /**
     * ⚠️ NO TEXT MAY SIT ON TOP OF OTHER TEXT — the negative-space check. Leaves only: a parent's
     * box contains its children's by construction, so comparing those reports overlap forever.
     *
     * ⚠️ AND THE DECORATIVE ROTATIONS COME OFF FIRST, BECAUSE `getBoundingClientRect()` RETURNS AN
     * AXIS-ALIGNED BOX. Inside a card at `rotate(-1.2deg)` a 159px-wide line reports 24.77px of
     * height against a 21.45px line box — 159 × sin(1.2°) = 3.33px of pure bookkeeping — so the
     * name and the agency line beneath it "overlap" by 2px while nothing is touching on screen.
     * That was this check's first result and it was a fault in the CHECK: the claim is about
     * LAYOUT, so the layout is what gets measured. Text inside one card cannot collide with text
     * in the same card BECAUSE of a tilt they both share; cross-card collision is a layout
     * question and the tilt does not enter it. (`offsetHeight` reports the honest 21 here — the
     * same divergence the house notes record for transformed panes.)
     */
    await page.addStyleTag({ content: ".cle-card, .cle-badge { transform: none !important; }" });
    const clashes = await page.evaluate(() => {
      const leaves = [...document.querySelectorAll<HTMLElement>(".cle *")].filter(
        (e) => e.children.length === 0 && (e.textContent || "").trim().length > 1,
      );
      const boxes = leaves.map((e) => ({ t: (e.textContent || "").trim().slice(0, 24), r: e.getBoundingClientRect() }))
        .filter((b) => b.r.width > 0 && b.r.height > 0);
      const hits: string[] = [];
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i].r, b = boxes[j].r;
        if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1)
          hits.push(`"${boxes[i].t}" × "${boxes[j].t}"`);
      }
      return { count: boxes.length, hits };
    });
    console.log(`${v.name} — ${clashes.count} text leaves, ${clashes.hits.length} overlaps`);
    expect(clashes.count, "the scan measured something").toBeGreaterThan(20);
    expect(clashes.hits, `${v.name}: no text over text`).toEqual([]);

    /**
     * ⚠️ NEITHER `fullPage` NOR AN ELEMENT SHOT WORKS HERE, AND BOTH FAIL QUIETLY. The page scrolls
     * inside `.wpg-scroll`, not the document: `fullPage` returned the viewport with extra steps,
     * and a locator shot of the 6000px `.cle` stitched a white band where the content is. Scrolling
     * the real scroller and taking viewport frames is the only one that photographs the page.
     * The frames are of the page as SHIPPED, tilts and all — the neutraliser above is scoped to the
     * scan and is reloaded away rather than left painting the evidence.
     */
    await page.reload();
    await page.locator(".cle").waitFor({ state: "visible", timeout: 20_000 });
    await page.waitForTimeout(500);
    const frames = await page.evaluate(() => {
      const s = document.querySelector<HTMLElement>(".aglist .wpg-scroll")!;
      return Math.ceil(s.scrollHeight / s.clientHeight);
    });
    for (let f = 0; f < frames; f++) {
      await page.evaluate((i) => {
        const s = document.querySelector<HTMLElement>(".aglist .wpg-scroll")!;
        s.scrollTop = i * s.clientHeight;
      }, f);
      await page.waitForTimeout(150);
      await page.screenshot({ path: `reports/contact-empty/${v.name}-${v.width}-${f + 1}.png` });
    }
    console.log(`${v.name} — ${frames} frames captured`);
  }

  /* ⚠️ FOCUS IS VISIBLE ON ALL THREE CONTROLS, and it is asserted on the RENDERED outline rather
     than on a rule in a file — `.agl-btn` carries none of its own, so the hero button's ring is
     inherited from this page's declaration and nothing else. */
  await page.setViewportSize({ width: 1440, height: 900 });
  const focus = await page.evaluate(() => {
    const out: Record<string, string> = {};
    for (const [k, sel] of [["hero", ".cle-hero-cta"], ["closing", ".cle-btn-pink"], ["discover", ".cle-close-link"]] as const) {
      const el = document.querySelector<HTMLElement>(sel);
      if (!el) { out[k] = "MISSING"; continue; }
      el.focus();
      const cs = getComputedStyle(el);
      out[k] = `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor}`;
    }
    return out;
  });
  console.log(`focus rings: ${JSON.stringify(focus)}`);
  for (const [k, v] of Object.entries(focus)) {
    expect(v, `${k} has a visible focus ring`).not.toMatch(/MISSING|^none/);
  }
});
