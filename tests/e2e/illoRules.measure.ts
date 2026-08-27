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
        bandW: Math.round(cb.width), bandH: Math.round(cb.height),
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
test("⚠️ THE TREATMENT IS SUPPRESSED WHEN THE BAND SETTLES — and only where a band settles", async ({ page }) => {
  for (const t of TRIAL) {
    await openRoute(page, t.route, { width: 1440, height: 900 });
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
