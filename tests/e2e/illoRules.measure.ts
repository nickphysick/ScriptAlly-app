/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE THREE RULES OF THE ILLUSTRATED MASTHEAD, ASSERTED AS ARITHMETIC ═══════════════════════
 *
 *  1 · The reveal is anchored to the TEXT, in pixels from where the words end.
 *  2 · The artwork is anchored to the band's right edge and sized by the band's height.
 *  3 · The artwork must ALWAYS reach back to the reveal.
 *
 * ⚠️ RULE 3 IS THE ONE THAT NEEDS A LOCK, and it is the check this whole saga lacked. Every earlier
 * failure was the picture not existing where the fade uncovered it, found by looking at a
 * screenshot at one width and missed at the others. Stated as arithmetic — artwork width against
 * the gap between the reveal and the band's right edge — it is answerable at every width without a
 * photograph, and it fails loudly the day a size or a measure moves.
 *
 * ⚠️ AND IT SUPERSEDES `pkgRules.measure.ts`, deleted in the same commit. That file asked the same
 * question of one page and read the tokens off `.wpg-mast`, where the paint used to live; leaving
 * it would have left a lock reading an element that no longer carries anything.
 */
import { test, expect } from "@playwright/test";
import { openRoute, liftMotionSuppression } from "./measure";
import { readPng } from "./pngPixels";

/** every workspace page — the container's edge is not an illustrated-page claim */
const BORDER_PAGES: { name: string; route: string; cls: string }[] = [
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

const TRIAL = [
  { name: "Submission packages", route: "/manuscripts/packages", cls: "pkgw-wpg", settles: true  },
  /* ⚠️ QUERY CENTRE SCROLLS NOW. It was `fill` — nothing to scroll, so its masthead never left and
     the bar was unreachable. Its browsing view is an ordinary scrolling page, which is what the
     two-view split is FOR, so this expectation inverts with the page rather than being relaxed. */
  { name: "Query Centre",        route: "/queries",              cls: "qc-wpg",   settles: true  },
];

for (const width of [1280, 1440, 1920, 2560]) {
 for (const t of TRIAL) {
  test(`⚠️ RULE 3 · THE ARTWORK REACHES BACK TO THE REVEAL — ${t.name} — ${width}`, async ({ page }) => {
    await openRoute(page, t.route, { width, height: 900 });
    await liftMotionSuppression(page);
    await page.waitForTimeout(700);
    const r = await page.evaluate(async (c) => {
      const g = [...document.querySelectorAll(`.wpg.${c}`)].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement;
      /* ⚠️ THE SLAB, NOT THE MEASURE — the paint moved back to the full-bleed band so it reaches
         both window edges, and a lock still reading `.wpg-mast` would find nothing and say nothing. */
      const ch = g.querySelector(".wpg-chrome") as HTMLElement;
      const cb = ch.getBoundingClientRect();
      const af = getComputedStyle(ch, "::after");
      /**
       * ⚠️ THE CALC IS RESOLVED BY THE BROWSER, NOT PARSED. `--illo-reveal-a` is a `calc()` over a
       * `max()` over a percentage; reading the property hands back that TEXT, which parses to NaN
       * and makes every comparison below vacuously true.
       */
      const probe = document.createElement("div");
      probe.style.cssText = "position:absolute;visibility:hidden;height:0";
      ch.appendChild(probe);
      const px = (v: string) => { probe.style.width = v; return probe.getBoundingClientRect().width; };
      const revealA = px("var(--illo-reveal-a)"), revealB = px("var(--illo-reveal-b)");
      const gutter = px("var(--illo-gutter)"), textRight = px("var(--illo-text-right)");
      probe.remove();
      /* ⚠️ THE ARTWORK'S NATURAL SIZE IS READ FROM THE IMAGE, never written here — a literal would
         be a second copy of a fact the asset owns, and would go stale the day it is re-exported. */
      const url = /url\(["']?([^"')]+)/.exec(af.backgroundImage)?.[1] ?? "";
      const nat = await new Promise<{ w: number; h: number }>((res) => {
        const im = new Image();
        im.onload = () => res({ w: im.naturalWidth, h: im.naturalHeight });
        im.onerror = () => res({ w: 0, h: 0 });
        im.src = url;
      });
      /* the widest ink in the header, for Rule 1 */
      const wsh = g.querySelector(".wsh") as HTMLElement;
      let ink = 0;
      const walk = (n: Node) => {
        if (n.nodeType === 3 && (n.textContent || "").trim()) {
          const rg = document.createRange(); rg.selectNodeContents(n);
          for (const q of rg.getClientRects()) if (q.width > 0) ink = Math.max(ink, q.right);
        }
        n.childNodes.forEach(walk);
      };
      walk(wsh);
      const mast = g.querySelector(".wpg-mast") as HTMLElement;
      return {
        bandW: Math.round(cb.width),
        /**
         * ⚠️ `clientHeight`, NOT THE RECT — and the accent bar is what exposed the difference. The
         * artwork is an `inset: 0` pseudo-element, so its box is the slab's PADDING box; the rect
         * includes the borders. With a 3px accent on top and the 1px hairline below, the rect reads
         * 129.7 against the 126 the picture is actually sized by, and the lock over-reported the
         * artwork's width by 50px — flattering, on the one assertion whose whole job is to catch a
         * picture that does not reach far enough.
         */
        bandH: ch.clientHeight,
        mastH: Math.round(mast.getBoundingClientRect().height),
        size: af.backgroundSize, pos: af.backgroundPosition, repeat: af.backgroundRepeat,
        revealA: Math.round(revealA), revealB: Math.round(revealB),
        gutter: Math.round(gutter), textRight: Math.round(textRight),
        inkRight: Math.round(ink - cb.left),
        nat,
      };
    }, t.cls);

    /* ── Rule 2 · anchored right, sized by the band's height ── */
    expect(r.pos, `${t.name}: the artwork is not anchored to the band's right edge`).toMatch(/100%/);
    expect(r.repeat, `${t.name}: the artwork tiles — Rule 2 draws one picture`).toMatch(/no-repeat/);
    const scale = parseFloat(/([\d.]+)%/.exec(r.size)?.[1] ?? "0") / 100;
    expect(scale, `${t.name}: the artwork is not sized as a percentage of the band's height (${r.size})`).toBeGreaterThan(0.5);
    expect(r.nat.w, `${t.name}: the artwork did not load, so its width is unknown`).toBeGreaterThan(0);

    /* ── Rule 1 · the reveal opens PAST the last glyph, at every width ── */
    expect(r.revealA, `${t.name}: the reveal opens at ${r.revealA}, inside the header's ink which ends at ${r.inkRight} — the artwork paints over the words`)
      .toBeGreaterThan(r.inkRight);
    /* ⚠️ AND THE TOKEN IS THE INK, NOT A NUMBER NEAR IT. `--illo-text-right` is measured from the
       MEASURE's left edge and the reveal is built from it plus the gutter, so this reconciles the
       two derivations against each other rather than against a literal on both sides. */
    expect(Math.abs(r.gutter + r.textRight - r.inkRight), `${t.name}: the token says the ink ends at ${r.gutter + r.textRight} and it ends at ${r.inkRight} — --illo-text-right has drifted from the copy`)
      .toBeLessThanOrEqual(4);

    /* ── Rule 3 · the artwork is wider than the gap it has to fill ── */
    const artW = Math.round(r.bandH * scale * (r.nat.w / r.nat.h));
    const gap = r.bandW - r.revealA;
    console.log(`\n══ RULE 3 — ${t.name} — ${width}\n` +
      `   band ${r.bandW}×${r.bandH} · gutter ${r.gutter} · textRight ${r.textRight} · ink ${r.inkRight}\n` +
      `   reveal ${r.revealA} → ${r.revealB} · artwork ${artW} (${r.size} of ${r.nat.w}×${r.nat.h}) · gap ${gap} · slack ${artW - gap}`);
    expect(artW, `${t.name}: the artwork is ${artW}px wide against a ${gap}px gap from the reveal to the band's right edge — it does not reach back to where the fade uncovers it`)
      .toBeGreaterThanOrEqual(gap);
  });
 }
}

/**
 * ══ SCROLLED, THE ARTWORK LEAVES WITH THE MASTHEAD ════════════════════════════════════════════
 *
 * ⚠️ THIS REPLACES THE SETTLE-SUPPRESSION CASE, WHOSE SUBJECT NO LONGER EXISTS. It asserted that a
 * SETTLED masthead dropped its artwork and took the shared wash back — a claim about a slab that
 * pinned and tightened. Nothing pins now: the masthead scrolls away as content and a separate bar
 * takes over, so the artwork leaves because its host does, not because a rule suppresses it.
 *
 * ⚠️ AND THE CLAIM IS ABOUT THE BAR, which is what a reader actually sees once the masthead has
 * gone. A 46px identity strip carrying a watercolour would be the fault this replaces, arriving from
 * the other end.
 */
test("⚠️ THE COLLAPSED BAR CARRIES NO ARTWORK — on both illustrated pages", async ({ page }) => {
  for (const t of TRIAL) {
    await openRoute(page, t.route, { width: 1440, height: 900 });
    await liftMotionSuppression(page);
    await page.waitForTimeout(700);
    const r = await page.evaluate(async (c) => {
      const g = [...document.querySelectorAll(`.wpg.${c}`)].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement;
      const sc = g.querySelector(".wpg-scroll") as HTMLElement;
      const max = sc.scrollHeight - sc.clientHeight;
      if (max < 200) return { max } as any;
      sc.scrollTop = Math.min(320, max);
      for (let k = 0; k < 4; k += 1) await new Promise((res) => requestAnimationFrame(res));
      const bar = g.querySelector(".wpg-bar") as HTMLElement;
      const mast = g.querySelector(".wsh") as HTMLElement | null;
      return {
        max,
        barOn: bar.classList.contains("wpg-bar--on"),
        barArt: getComputedStyle(bar, "::after").backgroundImage,
        barBg: getComputedStyle(bar).backgroundImage,
        /* the masthead has genuinely left the scrollport rather than merely shrinking */
        mastTop: mast ? Math.round(mast.getBoundingClientRect().bottom - sc.getBoundingClientRect().top) : null,
      };
    }, t.cls);
    if (r.max < 200) { console.log(`   ${t.name}: cannot scroll (max ${r.max}) — not exercised`); continue; }
    console.log(`   ${t.name.padEnd(20)} barOn=${r.barOn} mastBottom=${r.mastTop} barArt=${r.barArt}`);
    expect(r.barOn, `${t.name}: the bar did not take over`).toBe(true);
    expect(r.barArt, `${t.name}: the collapsed bar paints artwork`).toBe("none");
    expect(r.barBg, `${t.name}: the collapsed bar paints an image`).toBe("none");
    expect(r.mastTop, `${t.name}: the masthead is still in the scrollport — it should have scrolled away`).toBeLessThanOrEqual(0);
  }
});

/**
 * ══ ONE BORDER, ON THE CONTAINER, ON ALL FOUR SIDES ═══════════════════════════════════════════
 *
 * ⚠️ THIS REPLACES THE ACCENT-BAR CASE, whose subject is deleted. It asserted a 3px black rule on
 * one page's slab and the derivation of its corner radius; the trial is retired and the claim now is
 * the opposite kind — that the WINDOW owns the only edge, and nothing inside it draws a competing
 * one.
 *
 * ⚠️ THE BRIEF DESCRIBES A FAULT THIS APP DOES NOT HAVE, and the measurement is what says so. It
 * reports the masthead having no side borders while the body does, so the edge appears to begin
 * halfway down. Measured on ten pages: the ONLY near-full-width bordered elements inside the window
 * are `.ws-window` itself (1px on all four sides in `--ws-edge`) and the slab's bottom hairline. The
 * arrangement it asks for is the arrangement that exists — the loose-topped container is the SIZING
 * BENCH's, whose `.win` carries no border at all while its cards do. The lock is written anyway,
 * because "already true" and "guarded" are different things.
 *
 * ⚠️ AND THE CORNERS ARE SAMPLED SEPARATELY, because a border that stops short at a radius is the
 * other failure and it is invisible to a mid-edge sample. The claim there is not "the border colour
 * is at the corner" — an antialiased arc blends the border into both grounds, so a strict match
 * fails on a correct curve. It is that the arc SEPARATES: the pixel outside is the page ground, the
 * pixel inside is the window's fill, and between them the colour is neither.
 */
const NEAR = (a: number[], b: number[], tol = 6) => a.every((v, i) => Math.abs(v - b[i]) <= tol);

for (const width of [1280, 1440, 1920, 2560]) {
  test(`⚠️ THE CONTAINER OWNS THE ONLY EDGE, ALL FOUR SIDES — ${width}`, async ({ page }) => {
    const lines: string[] = [];
    let sampled = 0;
    for (const { name, route, cls } of BORDER_PAGES) {
      await openRoute(page, route, { width, height: 900 });
      await liftMotionSuppression(page);
      await page.waitForTimeout(500);
      const g = await page.evaluate((c) => {
        const el = [...document.querySelectorAll(`.wpg.${c}`)].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement;
        if (!el) return null;
        const win = el.closest(".ws-window") as HTMLElement;
        const wb = win.getBoundingClientRect(), cs = getComputedStyle(win);
        const slab = el.querySelector(".wpg-chrome") as HTMLElement;
        const sb = slab.getBoundingClientRect();
        /* ⚠️ THE FILTER'S THRESHOLD IS THE WINDOW'S OWN WIDTH, NOT THE VIEWPORT'S. An earlier form
           asked for elements wider than `viewport - 200`, which at 1440 is 1240 against a 1172px
           window — so it could not match anything and reported "nothing draws a border" by
           construction. A probe whose population cannot qualify is not a measurement. */
        /* ⚠️ FLUSH WITH THE WINDOW'S INNER EDGE, NOT MERELY WIDE — and the first form was wrong in
           the expensive direction, failing on correct pages. "Any near-full-width bordered element"
           catches a page's own content: Analytics' bordered panels and the Calendar's timeline rail
           and tables all have borders and are legitimately as wide as the column. The claim is about
           an element drawing a SECOND container edge, which means one sitting ON the window's inner
           edge — a card inset by the page's gutter is not competing with anything. */
        const innerL = wb.left + parseFloat(cs.borderLeftWidth);
        const innerR = wb.right - parseFloat(cs.borderRightWidth);
        const rivals = [...win.querySelectorAll<HTMLElement>("*")].filter((e) => {
          const b = e.getBoundingClientRect();
          if (b.height < 8) return false;
          const s2 = getComputedStyle(e);
          const l = parseFloat(s2.borderLeftWidth) > 0 && Math.abs(b.left - innerL) <= 2;
          const r2 = parseFloat(s2.borderRightWidth) > 0 && Math.abs(b.right - innerR) <= 2;
          return l || r2;
        }).map((e) => String(e.className).slice(0, 30));
        return {
          l: Math.round(wb.left), r: Math.round(wb.right), t: Math.round(wb.top),
          bd: cs.borderTopWidth, bdc: cs.borderTopColor, radius: parseFloat(cs.borderTopLeftRadius),
          rivals,
          ys: [Math.round(sb.top + 40), Math.round(sb.bottom + 10), Math.round(sb.bottom + 140)],
        };
      }, cls);
      expect(g, `${name}: no grid`).not.toBeNull();
      expect(parseFloat(g!.bd), `${name}: the container has no border`).toBeGreaterThan(0);
      expect(g!.rivals, `${name}: something inside the window draws its own side border: ${g!.rivals.join(", ")}`).toEqual([]);

      const bd = (g!.bdc.match(/\d+/g) ?? []).map(Number).slice(0, 3);
      /* ⚠️ THREE HEIGHTS — inside the masthead, inside the toolbar's band, inside the body — because
         the reported fault is an edge that starts partway down. One sample cannot see that. */
      for (const [i, y] of g!.ys.entries()) {
        if (y < 0 || y > 880) { lines.push(`${name} y${i}: offscreen`); continue; }
        const png = readPng(await page.screenshot({ clip: { x: g!.l, y, width: g!.r - g!.l, height: 1 } }));
        const left = png.at(0, 0).slice(0, 3), right = png.at(png.width - 1, 0).slice(0, 3);
        sampled += 2;
        expect(NEAR(left, bd), `${name}: the container's LEFT edge at height ${i} paints ${left.join(",")}, not the border's ${bd.join(",")}`).toBe(true);
        expect(NEAR(right, bd), `${name}: the container's RIGHT edge at height ${i} paints ${right.join(",")}, not the border's ${bd.join(",")}`).toBe(true);
      }

      /* ── the corners ── */
      const R = Math.max(4, Math.round(g!.radius));
      for (const [corner, x] of [["top-left", g!.l], ["top-right", g!.r - R - 2]] as const) {
        const png = readPng(await page.screenshot({ clip: { x, y: g!.t, width: R + 2, height: R + 2 } }));
        const mid = Math.round(R / 2);
        const outer = png.at(corner === "top-left" ? 0 : png.width - 1, mid).slice(0, 3);
        const inner = png.at(corner === "top-left" ? png.width - 1 : 0, mid).slice(0, 3);
        lines.push(`${name.padEnd(20)} ${corner} outer ${outer.join(",")} inner ${inner.join(",")} bd ${bd.join(",")}`);
        expect(NEAR(outer, inner, 4), `${name}: the ${corner} corner paints the same colour inside and out (${outer.join(",")}) — the border stops short at the radius`).toBe(false);
      }
    }
    console.log(`\n══ THE CONTAINER'S EDGE — ${width}\n` + lines.join("\n"));
    expect(sampled, "no edge was sampled at all").toBeGreaterThan(40);
  });
}



/**
 * ══ THE TOP RULE SITS IN CLEAR SPACE ══════════════════════════════════════════════════════════
 *
 * ⚠️ THE ARTWORK PAINTED OVER IT FOR A WHOLE PHASE, and the screenshots showed it while every
 * property-level assertion passed — the layer was `inset: 0` on the slab, so it began at the band's
 * top and the rule was underneath it. The claim is not "the artwork has a top offset", which is a
 * declaration; it is that the rule's row LOOKS THE SAME with the picture on and off.
 *
 * ⚠️ AND IT IS TAKEN AT THE RULE'S OWN y, MEASURED, rather than a few pixels down. A sample below
 * the rule would pass on a band whose artwork started one pixel into it.
 */
for (const width of [1280, 2560]) {
  test(`⚠️ THE ARTWORK STARTS BELOW THE TOP RULE — ${width}`, async ({ page }) => {
    const gaps = new Map<string, string[]>();
    for (const t of TRIAL) {
      await openRoute(page, t.route, { width, height: 900 });
      await liftMotionSuppression(page);
      await page.waitForTimeout(600);
      const g = await page.evaluate((c) => {
        const el = [...document.querySelectorAll(`.wpg.${c}`)].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement;
        const rule = el.querySelector(".wsh-toprule") as HTMLElement | null;
        const slab = el.querySelector(".wpg-chrome") as HTMLElement;
        if (!rule) return null;
        const rb = rule.getBoundingClientRect(), sb = slab.getBoundingClientRect();
        return { y: Math.round(rb.top), x: Math.round(sb.left), w: Math.round(sb.width),
                 gap: +(rb.top - sb.top).toFixed(1) };
      }, t.cls);
      expect(g, `${t.name}: no top rule`).not.toBeNull();
      const clip = { x: g!.x, y: g!.y, width: g!.w, height: 1 };
      const on = readPng(await page.screenshot({ clip }));
      await page.addStyleTag({ content: `.wpg .wpg-chrome::after { opacity: 0 !important; }` });
      await page.waitForTimeout(140);
      const off = readPng(await page.screenshot({ clip }));
      await page.locator("style").last().evaluate((e) => e.remove());
      let diff = 0, worst = 0;
      for (let x = 0; x < on.width; x += 3) {
        const a = on.at(x, 0), b = off.at(x, 0);
        const d = Math.max(...a.slice(0, 3).map((v, i) => Math.abs(v - b[i])));
        if (d > 2) diff += 1;
        worst = Math.max(worst, d);
      }
      console.log(`   ${t.name.padEnd(20)} ${width}: rule at +${g!.gap}px, ${diff} of ${Math.ceil(on.width / 3)} samples differ (worst ${worst})`);
      expect(diff, `${t.name}: the artwork paints on the top rule's own row — ${diff} samples differ with it on (worst ${worst})`).toBe(0);
      /**
       * ⚠️ THE OFFSET ITSELF, BECAUSE IT COLLAPSED OUT OF THE MASTHEAD ONCE. The rule carries a
       * `margin-top`; on a block box with no padding of its own a first child's top margin collapses
       * THROUGH the parent, and measured, one declaration rendered as +7px on Query Centre and +0px
       * on Submission packages. Asserted as a value AND as an agreement, because either alone
       * misses one half: a positive gap on both pages can still be two different gaps, and equal
       * gaps can both be zero.
       */
      expect(g!.gap, `${t.name}: the top rule sits at the band's very edge — its offset has collapsed out of the masthead`).toBeGreaterThan(2);
      gaps.set(String(g!.gap), [...(gaps.get(String(g!.gap)) ?? []), t.name]);
    }
    expect([...gaps.keys()], `the two illustrated pages put the top rule at different offsets: ${[...gaps.entries()].map(([v, n]) => `${n.join(", ")} ${v}`).join(" | ")}`).toHaveLength(1);
  });
}
