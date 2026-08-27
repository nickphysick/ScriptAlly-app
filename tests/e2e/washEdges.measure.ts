/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE WASH REACHES THE WINDOW'S EDGES — proved by sampling what was PAINTED at both of them.
 *
 * ⚠️ THIS IS THE FOURTH LOCK ON ONE VISIBLE FAULT, AND THE FIRST THAT ASKS ABOUT THE EDGES. The
 * band has stopped short three times for three different causes — no fill at all, a fill on a
 * content-sized box, and a fill inside a horizontally-inset scroller — and each previous lock passed
 * throughout, because each asked whether the CHROME was painted correctly rather than whether the
 * paint reached the window. A lock that measures the band's own box can never see a band whose box
 * is the wrong size.
 *
 * ⚠️ SO IT SAMPLES THE WINDOW'S INNER EDGES, not the scroller's and not the chrome's. The scroller
 * is the element that was inset; asking it how wide it is returns a confident, useless yes.
 *
 * ⚠️ AND THE EXPECTED COLOUR IS THE BAND ITSELF AT THE SAME `y`, never a modelled gradient value.
 * The wash interpolates down the chrome, so an expected colour would have to reproduce the
 * interpolation — a second implementation of the thing under test, wrong in its own ways. Comparing
 * the two edges against the band's own interior at one `y` asks exactly the right question and
 * survives any future change to what the band is filled with.
 */
import { test, expect, Page } from "@playwright/test";
import { openRoute, liftMotionSuppression } from "./measure";
import { readPng } from "./pngPixels";

/**
 * ⚠️ A TOLERANCE OF 2 PER CHANNEL, AND IT IS NOT A LOOSENING — it is what separates antialiasing
 * from the fault. The window is rounded and the wash is a gradient, so the outermost pixel of a row
 * lands within a unit or two of its neighbours: measured 246,241,232 at the edge against 246,240,232
 * inside, on a band that reaches perfectly well. An UNWASHED strip is the page's own ground showing
 * through — 254,252,250 against 246,240,232, which is 8, 12 and 18 apart. The fault this case exists
 * to find is an order of magnitude outside the tolerance that admits the rendering.
 */
const near = (a: string, b: string) => {
  const x = a.split(",").map(Number), y = b.split(",").map(Number);
  return x.every((v, i) => Math.abs(v - y[i]) <= 2);
};

/**
 * ⚠️ THE PAGES ALLOWED TO DEPART FROM THE PLAIN WASH, LISTED HERE AND COUNTED. A trial that quietly
 * becomes two pages is no longer a trial; the size of this list is asserted, so a second page cannot
 * join without someone editing the number and reading this paragraph.
 */
const ILLUSTRATED = ["Submission packages", "Query Centre"];

const PAGES: { name: string; route: string; cls: string }[] = [
  { name: "Query Centre",        route: "/queries",              cls: "qc-wpg"   },
  { name: "Analytics",           route: "/queries/analytics",    cls: "qa-wpg"   },
  { name: "Contact list",        route: "/agents",               cls: "agl-wpg"  },
  { name: "Discover",            route: "/agents/discover",      cls: "dv-wpg"   },
  { name: "Manuscripts",         route: "/manuscripts",          cls: "msv-wpg"  },
  { name: "Comparable titles",   route: "/manuscripts/comps",    cls: "ct-wpg"   },
  { name: "Submission packages", route: "/manuscripts/packages", cls: "pkgw-wpg" },
  { name: "To-do list",          route: "/todo",                 cls: "tpl-wpg"  },
  { name: "Calendar",            route: "/todo/calendar",        cls: "tpl-wpg"  },
  { name: "Noteboard",           route: "/todo/noteboard",       cls: "tpl-wpg"  },
];

/** the window's inner edges, the band's sampling row, and where any real scrollbar sits */
const frame = (page: Page, cls: string) => page.evaluate((c) => {
  const g = [...document.querySelectorAll(`.wpg.${c}`)].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement;
  if (!g) return null;
  const win = g.closest(".ws-window") as HTMLElement;
  const wcs = getComputedStyle(win), wb = win.getBoundingClientRect();
  const innerL = wb.left + parseFloat(wcs.borderLeftWidth) + parseFloat(wcs.paddingLeft);
  const innerR = wb.right - parseFloat(wcs.borderRightWidth) - parseFloat(wcs.paddingRight);
  const sc = g.querySelector(".wpg-scroll") as HTMLElement;
  const sb = sc.getBoundingClientRect();
  const chrome = g.querySelector(".wpg-chrome") as HTMLElement;
  const cb = chrome.getBoundingClientRect();
  const band = g.querySelector(".wpg-toolband") as HTMLElement | null;
  const bb = band?.getBoundingClientRect() ?? null;
  return {
    innerL: Math.round(innerL), innerR: Math.round(innerR),
    /**
     * ⚠️ BELOW THE WINDOW'S CORNER RADIUS, WHICH IS NOT THE BAND STOPPING SHORT. The window is
     * rounded, so within the first ~16px the leftmost pixel of any row is blended against the
     * corner: sampling at `top + 3` read 244,241,235 at the edge against 246,240,231 inside — a
     * correct band, reported as a fault. The row is taken clear of the arc instead.
     */
    washY: Math.round(cb.top + parseFloat(wcs.borderTopLeftRadius || "0") + 6),
    /* the toolbar's band, sampled the same way where a page has one */
    toolY: bb && bb.height > 6 ? Math.round(bb.top + 3) : null,
    /* ⚠️ THE SCROLLBAR'S OWN BOX — the ONE thing allowed to interrupt the band, and only where it
       is real. `offsetWidth - clientWidth` is what the browser actually took, so a reservation that
       no bar occupies is not mistaken for one that does. */
    barW: Math.round(sb.width) - sc.clientWidth,
    /* the band's own box, for the illustrated carve-out — see its note */
    bandBox: { l: Math.round(cb.left), r: Math.round(cb.right) },
    /* ⚠️ THE MEASURE'S BOX, WHICH IS WHERE THE PAINT WRONGLY LIVED — and it is measured rather than
       assumed, because the gutter is 35px only while the measure's cap is slack. At 2560 it is
       ~315px, so a check written against 35 would have looked inside the tint on both sides and
       found agreement. */
    mastBox: (() => { const m = g.querySelector(".wpg-mast") as HTMLElement | null;
      const b = m?.getBoundingClientRect(); return b ? { l: Math.round(b.left), r: Math.round(b.right) } : null; })(),
    /* ⚠️ WHERE THE ARTWORK BEGINS, RESOLVED THROUGH A PROBE — `getPropertyValue` on a `calc()` hands
       back its TEXT, which parses to NaN. Just left of it the ground is fully pale AND the mask is
       fully transparent, so it is the one x that says what the band looks like with no picture on
       it — the reference the "does the artwork reach the edge" claim needs. */
    revealA: (() => {
      const pr = document.createElement("div");
      pr.style.cssText = "position:absolute;visibility:hidden;height:0;width:var(--illo-reveal-a)";
      chrome.appendChild(pr); const w = pr.getBoundingClientRect().width; pr.remove();
      return Math.round(w);
    })(),
    scrolls: sc.scrollHeight - sc.clientHeight > 2,
  };
}, cls);

const rowAt = async (page: Page, x: number, y: number, w: number) => {
  const png = readPng(await page.screenshot({ clip: { x, y, width: w, height: 3 } }));
  const at = (px: number) => png.at(Math.min(Math.max(px, 0), png.width - 1), 1).join(",");
  /**
   * ⚠️ THE REFERENCE IS THE ROW'S MODAL COLOUR, NOT ITS MIDPOINT. A single mid sample lands on a
   * letterform or a control the day the layout changes, and then the case compares the band's edge
   * against ink and fails on a correct page. The ground is by far the most common value in a row
   * that crosses a band, whatever else is in it.
   */
  const tally = new Map<string, number>();
  for (let px = 2; px < png.width - 2; px += 4) {
    const k = at(px);
    tally.set(k, (tally.get(k) ?? 0) + 1);
  }
  const ground = [...tally.entries()].sort((a, b) => b[1] - a[1])[0][0];
  return { at, ground, width: png.width };
};

for (const width of [1280, 1440, 2300]) {
  test(`⚠️ THE WASH SPANS THE WINDOW'S INNER WIDTH — ${width}`, async ({ page }) => {
    const lines: string[] = [];
    let measured = 0, bars = 0;
    for (const { name, route, cls } of PAGES) {
      await openRoute(page, route, { width, height: 900 });
      await liftMotionSuppression(page);
      const f = await frame(page, cls);
      expect(f, `${name}: no grid`).not.toBeNull();
      const { innerL, innerR, washY, toolY, barW, scrolls, bandBox, mastBox, revealA } = f!;
      /* the left edge is geometry too, for every page — the cheapest statement of the whole claim */
      expect(bandBox.l, `${name}: the band's box starts ${bandBox.l - innerL}px inside the window's LEFT inner edge`)
        .toBeLessThanOrEqual(innerL + 1);
      const span = innerR - innerL;
      expect(span, `${name}: the window has no inner width to span`).toBeGreaterThan(200);

      /**
       * ⚠️ THE RIGHT-HAND SAMPLE IS TAKEN AT THE BAND'S OWN LAST PIXEL, and where a scrollbar is
       * present that is one pixel left of the bar rather than at the window's edge. Skipping the
       * sample when a bar exists is what let two earlier versions pass everywhere — the skip applied
       * to every scrolling page, which is most of them. So the bar is MEASURED and subtracted, and
       * the fact that it accounts for the whole remaining strip is asserted below.
       */
      const rightmost = innerR - 1 - (scrolls ? barW : 0);
      for (const [what, y] of ([["masthead", washY], ["toolbar", toolY]] as const)) {
        if (y === null) continue;
        const { at, ground: mid } = await rowAt(page, innerL, y, span);
        const left = at(0), right = at(rightmost - innerL);
        measured += 1;
        if (ILLUSTRATED.includes(name) && what === "masthead") {
          /**
           * ══ THE ILLUSTRATED CARVE-OUT — AND IT IS THE ASSERTION, NOT AN EXEMPTION ═══════════
           *
           * ⚠️ THE PREVIOUS CARVE-OUT WENT GREEN THROUGH THE EXACT FAULT IT NAMES, FOR TWO
           * INDEPENDENT REASONS — ONE PER EDGE — AND BOTH ARE WORTH KNOWING.
           *
           * On the RIGHT it swapped the painted colour for the BAND'S BOX, reasoning that a picture
           * legitimately varies at the edge. True, and the box is the wrong subject: the slab never
           * moved. The paint moved INSIDE it, onto the capped measure, and a box test cannot see
           * that by construction.
           *
           * On the LEFT the exact colour test was still running, unconditionally, and it passed —
           * because it compares the edge against the ROW'S MODAL COLOUR, and the slab underneath
           * had deliberately been given the gradient's TERMINAL colour so nothing would step where
           * the measure began. That is camouflage: the gutter was painted the same colour as the
           * band's commonest pixel, so an identity test could not distinguish 35px of gutter from
           * 35px of band. The fix for one problem is what blinded the lock to the next.
           *
           * ⚠️ SO THE CLAIM IS CONTINUITY ACROSS THE MEASURE'S OWN BOUNDARY, which is where the
           * seam appears and is immune to what the band is filled with. Three pixels outside the
           * measure and three inside must paint the same thing: with the treatment on the slab they
           * are both band, and with it on the measure they are gutter and band. It also catches the
           * original reservation fault, because a reserved strip is not the band either.
           */
          const g0 = at(Math.max(mastBox!.l - innerL - 3, 0));
          const g1 = at(mastBox!.l - innerL + 3);
          expect(near(g0, g1), `${name}: the ${what} band steps at the measure's left boundary — painted ${g0} outside it against ${g1} inside, so the treatment is inset rather than full-bleed`).toBe(true);
          /* the box still has to reach both window edges — a different fault, still worth holding */
          expect(bandBox.r, `${name}: the ${what} band's box stops ${innerR - bandBox.r}px short of the window's RIGHT inner edge`)
            .toBeGreaterThanOrEqual(innerR - (scrolls ? barW : 0) - 1);
          expect(bandBox.l, `${name}: the ${what} band's box starts inside the window's LEFT inner edge`).toBeLessThanOrEqual(innerL + 1);
          /* ⚠️ AND THE ARTWORK REACHES THE RIGHT EDGE, which is the half the box cannot answer: the
             outermost pixel must not be the band's pale ground, or the picture stops short of the
             window however wide its host is. */
          const outer = at(rightmost - innerL);
          /* ⚠️ THE REFERENCE IS THE BAND'S OWN PALE TERMINAL, SAMPLED WHERE THE MASK IS STILL FULLY
             TRANSPARENT — not the tint at the left edge, which was my first form and is far too
             loose: an artwork stopping short leaves PALE at the edge, and pale differs from the
             tint too, so that version would have passed on exactly the fault. */
          const bare = at(Math.max(revealA - 8, 0));
          expect(near(outer, bare), `${name}: the outermost pixel of the ${what} band is ${outer}, the same as its unpainted ground ${bare} — the artwork does not reach the window's right edge`).toBe(false);
        } else {
          expect(near(left, mid), `${name}: the ${what} band does not reach the window's LEFT inner edge — painted ${left} there against ${mid} inside the band`).toBe(true);
          expect(near(right, mid), `${name}: the ${what} band does not reach the window's RIGHT inner edge — painted ${right} there against ${mid} inside the band`).toBe(true);
        }
        if (what === "masthead") {
          lines.push(`${name.padEnd(21)} span ${String(span).padStart(4)} · bar ${String(barW).padStart(2)}${scrolls ? "" : " (unused)"} · L ${left} · R ${right} · mid ${mid}`);
        }
      }

      /**
       * ⚠️ AND A RESERVATION NO BAR OCCUPIES IS THE FAULT ITSELF, so it is asserted rather than
       * tolerated. A page that does not scroll must reserve nothing — that was the third cause: five
       * fill pages held 30px of gutter for a bar that can never appear.
       */
      /**
       * ⚠️ THE IMPLICATION RUNS ONE WAY ONLY, AND WRITING IT BOTH WAYS WAS MY OWN ERROR. Any width
       * the scroller takes from its content must be a bar that really exists — so a page that does
       * not scroll must take nothing, which is the third cause caught directly. The converse does
       * NOT hold: this platform draws OVERLAY scrollbars, which are painted over the content and
       * take no width at all, so a scrolling page legitimately takes 0. Requiring a reservation
       * there failed on Analytics, Contact list and every other scrolling page — a lock demanding
       * the fault it was written to forbid.
       */
      if (!scrolls) {
        expect(barW, `${name} does not scroll and still takes ${barW}px from its content — that strip can never hold a scrollbar, so it is unwashed ground`).toBe(0);
      } else if (barW > 0) {
        bars += 1;
      }
    }
    console.log(`\n══ WASH TO THE WINDOW'S EDGES — ${width}\n` + lines.join("\n"));
    expect(ILLUSTRATED, "the number of pages departing from the plain wash has changed — the trial has spread or been reverted").toHaveLength(2);
    expect(measured, "no band was sampled at all").toBeGreaterThan(9);
    /* ⚠️ REPORTED, NOT REQUIRED. How many pages take real width depends on the platform's scrollbar
       style — nil here, where they are overlays. A floor would assert the harness's settings. */
    console.log(`   ${bars} of ${PAGES.length} pages took real scrollbar width at this viewport`);
  });
}
