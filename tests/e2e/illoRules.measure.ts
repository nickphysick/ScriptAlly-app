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

const TRIAL = [
  { name: "Submission packages", route: "/manuscripts/packages", cls: "pkgw-wpg", settles: true  },
  { name: "Query Centre",        route: "/queries",              cls: "qc-wpg",   settles: false },
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
 * ⚠️ SETTLED, THE TREATMENT GOES — AND ONLY ON THE PAGE THAT SETTLES. Packages is Type A: at ~55px
 * the artwork would render about a third of its size and Rule 3 would fail outright. Query Centre is
 * Type B and never settles, so it must NOT carry a suppression; asserting one there would be
 * asserting about a state the page cannot enter.
 */
/**
 * ⚠️ MEASURED AT A SHORT VIEWPORT, BECAUSE AT 1440x900 PACKAGES NO LONGER SCROLLS AT ALL. Its
 * overflow was ~205px earlier today and is 0 now — another stream shortened the page, and a 3px
 * accent border can only ever ADD to an overflow, so this is not the accent's doing. The type law
 * is explicit that type is a property of STRUCTURE rather than of today's content, so Packages is
 * still Type A and its settle is still real; what changed is only whether that state is reachable
 * at one particular viewport. Exercising it at 560px tall tests the posture instead of excusing it,
 * and the precondition is asserted so "never exercised" can never pass quietly.
 */
test("⚠️ THE TREATMENT IS SUPPRESSED WHEN THE BAND SETTLES — and only where a band settles", async ({ page }) => {
  for (const t of TRIAL) {
    await openRoute(page, t.route, { width: 1440, height: 560 });
    await liftMotionSuppression(page);
    await page.waitForTimeout(700);
    const moved = await page.evaluate(async (c) => {
      const g = [...document.querySelectorAll(`.wpg.${c}`)].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement;
      const sc = g.querySelector(".wpg-scroll") as HTMLElement;
      if (sc.scrollHeight - sc.clientHeight < 120) return false;
      for (let y = 0; y <= 400; y += 20) { sc.scrollTop = y; await new Promise((r) => requestAnimationFrame(r)); }
      return true;
    }, t.cls);
    expect(moved, `${t.name}: expected settles=${t.settles} and the page ${moved ? "can" : "cannot"} scroll far enough to settle`).toBe(t.settles);
    if (!moved) continue;
    await page.waitForTimeout(800);
    const after = await page.evaluate((c) => {
      const g = [...document.querySelectorAll(`.wpg.${c}`)].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement;
      const ch = g.querySelector(".wpg-chrome") as HTMLElement;
      const cs = getComputedStyle(ch);
      /* ⚠️ THE WASH'S OWN TWO TOKENS, RESOLVED — not a `180deg` in the string. The browser
         NORMALISES a `180deg` linear-gradient by dropping the angle, because downward is the
         default, so a regex looking for it fails on a perfectly correct wash. Asserting the two
         colours is the claim anyway: the settled bar paints what every other Type A bar paints. */
      const rgb = (v: string) => { const d = document.createElement("div"); d.style.color = v; ch.appendChild(d); const c = getComputedStyle(d).color; d.remove(); return c; };
      return { stuck: ch.classList.contains("wpg-chrome--stuck"),
               art: getComputedStyle(ch, "::after").backgroundImage,
               img: cs.backgroundImage,
               washTop: rgb(cs.getPropertyValue("--mast-wash-top").trim()),
               washBottom: rgb(cs.getPropertyValue("--mast-wash-bottom").trim()),
               title: getComputedStyle(g.querySelector(".wsh-title") as HTMLElement).fontSize };
    }, t.cls);
    expect(after.stuck, `${t.name}: scrolled past the settle and the band is not stuck`).toBe(true);
    expect(/url\(/.test(after.art), `${t.name}: the artwork is still painted on the settled bar`).toBe(false);
    expect(after.img, `${t.name}: the settled bar's ground is not a gradient — it has not taken the shared wash back`).toMatch(/linear-gradient/);
    for (const [which, c] of [["top", after.washTop], ["bottom", after.washBottom]] as const) {
      expect(after.img, `${t.name}: the settled bar's gradient does not carry the wash's ${which} stop (${c}) — it is painting something else`).toContain(c);
    }
    expect(after.title, `${t.name}: the settled bar keeps the trial's 47px title`).toBe("22px");
  }
});


/**
 * ══ THE ACCENT BAR — A POSITIVE CLAIM, NOT A CARVE-OUT ════════════════════════════════════════
 *
 * ⚠️ THE ENUMERATED CARVE-OUT GAINS NOTHING FOR THIS, AND THAT IS WORTH SAYING OUT LOUD. An
 * exemption is only needed where a shared assertion would otherwise fail; nothing in this system
 * ever read the slab's TOP border, and the slab's bottom hairline was already
 * `1px solid var(--ws-edge)` before this pack, so the brief's `border-bottom` line restates what
 * exists. A carve-out with nothing to exempt would be bookkeeping. The claim is asserted directly
 * instead, in both directions: this page has the bar, the other nine do not.
 */
const ACCENTED = ["Submission packages"];
const ALL_PAGES: { name: string; route: string; cls: string }[] = [
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

for (const posture of ["rest", "settled"] as const) {
  test(`⚠️ EXACTLY ONE MASTHEAD CARRIES AN ACCENT BAR — ${posture}`, async ({ page }) => {
    const lines: string[] = [];
    const withBar: string[] = [];
    for (const { name, route, cls } of ALL_PAGES) {
      /* short, so pages that CAN settle actually do — see the note on the suppression case */
      await openRoute(page, route, { width: 1440, height: posture === "settled" ? 560 : 900 });
      await liftMotionSuppression(page);
      await page.waitForTimeout(500);
      if (posture === "settled") {
        await page.evaluate(async (c) => {
          const g = [...document.querySelectorAll(`.wpg.${c}`)].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement;
          const sc = g.querySelector(".wpg-scroll") as HTMLElement;
          if (sc.scrollHeight - sc.clientHeight < 120) return;
          for (let y = 0; y <= 400; y += 20) { sc.scrollTop = y; await new Promise((r) => requestAnimationFrame(r)); }
        }, cls);
        await page.waitForTimeout(700);
      }
      const r = await page.evaluate((c) => {
        const g = [...document.querySelectorAll(`.wpg.${c}`)].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement;
        if (!g) return null;
        const slab = g.querySelector(".wpg-chrome") as HTMLElement;
        const cs = getComputedStyle(slab);
        const win = g.closest(".ws-window") as HTMLElement;
        const wcs = getComputedStyle(win), wb = win.getBoundingClientRect(), sb = slab.getBoundingClientRect();
        /* ⚠️ THE INNER RADIUS, COMPUTED FROM THE WINDOW'S OWN TWO TOKENS AND NOT FROM A NUMBER TYPED
           HERE — the whole point of the derivation is that the bar's ends follow whatever the window
           does, so a lock restating 15px would pass on a window that had moved. */
        const probe = document.createElement("div");
        probe.style.cssText = "position:absolute;visibility:hidden;height:0;width:calc(var(--ws-window-radius) - var(--ws-window-border))";
        slab.appendChild(probe);
        const inner = probe.getBoundingClientRect().width;
        probe.remove();
        return {
          top: cs.borderTopWidth, topColor: cs.borderTopColor,
          bottom: cs.borderBottomWidth, bottomColor: cs.borderBottomColor,
          radius: cs.borderTopLeftRadius, radiusR: cs.borderTopRightRadius,
          bottomRadius: cs.borderBottomLeftRadius,
          inner: Math.round(inner * 10) / 10,
          /* the slab's top edge against the window's inner top edge — the bar has to BE at the
             corner for following its curve to mean anything */
          gapFromWindowTop: Math.round((sb.top - (wb.top + parseFloat(wcs.borderTopWidth))) * 10) / 10,
          spans: Math.round(sb.width) >= Math.round(wb.width - 2 * parseFloat(wcs.borderLeftWidth)) - 1,
        };
      }, cls);
      expect(r, `${name}: no grid rendered`).not.toBeNull();
      const has = parseFloat(r!.top) > 0;
      if (has) withBar.push(name);
      lines.push(`${name.padEnd(21)} top ${r!.top.padStart(5)} ${has ? r!.topColor : ""} · hairline ${r!.bottom} ${r!.bottomColor} · radius ${r!.radius}/${r!.radiusR} (inner ${r!.inner}) · atTop ${r!.gapFromWindowTop}`);

      /* ⚠️ THE HAIRLINE IS ASSERTED ON EVERY PAGE, not just the accented one. It predates this pack
         and the brief restates it; the way a restatement goes wrong is by quietly replacing a shared
         token with a ref's literal, so what is checked is that all ten still agree. */
      expect(parseFloat(r!.bottom), `${name}: the slab lost its base hairline`).toBeGreaterThan(0);

      if (ACCENTED.includes(name)) {
        expect(parseFloat(r!.top), `${name}: the accent bar is ${r!.top}, not the 3px the page declares`).toBe(3);
        expect(r!.gapFromWindowTop, `${name}: the accent bar sits ${r!.gapFromWindowTop}px below the window's inner top edge, so its ends are nowhere near the corner it is meant to follow`).toBeLessThanOrEqual(0.5);
        expect(r!.spans, `${name}: the accent bar's slab does not span the window's inner width`).toBe(true);
        /* the derivation, both ends, and the bottom corners deliberately square */
        expect(parseFloat(r!.radius), `${name}: the accent's left end does not follow the window's inner radius (${r!.radius} against ${r!.inner})`).toBeCloseTo(r!.inner, 1);
        expect(parseFloat(r!.radiusR), `${name}: the accent's right end does not follow the window's inner radius (${r!.radiusR} against ${r!.inner})`).toBeCloseTo(r!.inner, 1);
        expect(parseFloat(r!.bottomRadius), `${name}: the slab's BOTTOM corners are rounded — the band closes on a straight hairline`).toBe(0);
      } else {
        expect(parseFloat(r!.top), `${name}: a page that is not the accent trial has grown a ${r!.top} top border`).toBe(0);
      }
    }
    console.log(`\n══ ACCENT BAR — ${posture}\n` + lines.join("\n"));
    expect(withBar, "the accent bar is not on exactly the trial page").toEqual(ACCENTED);
    /* ⚠️ AND THE HAIRLINE COLOURS ARE COMPARED ACROSS PAGES rather than against a hex, so the
       brief's `#e4ddd1` — the REF's edge token, a different hue from this app's `--ws-edge`, and
       already refused once in `index.css` for exactly that reason — cannot arrive unnoticed. */
    const hairlines = [...new Set(lines.map((l) => l.split("hairline ")[1].split(" · ")[0]))];
    expect(hairlines, `the ten slabs disagree about their base hairline: ${hairlines.join(" | ")}`).toHaveLength(1);
  });
}
