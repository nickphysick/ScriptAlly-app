/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE PINNED GROUND IS OPAQUE — proved by sampling what was PAINTED.
 *
 * ⚠️ THIS SHIPPED BROKEN TWICE BEHIND A GREEN LOCK, AND THE LOCK IS WHY. Its predecessor said "the
 * pixel, not the rule" and then read `elementsFromPoint` — which reports the DOM stack at a
 * coordinate, never the colour rendered there. The slab genuinely WAS topmost at every point it
 * sampled, and it was also 72% transparent. `getComputedStyle` was no better: it reported a
 * `backdrop-filter` the browser never applied inside a nested scroller beneath a rounded,
 * `overflow: hidden` window.
 *
 * ⚠️ AND A SINGLE SAMPLE PASSES OVER BLANK PARCHMENT WHILE BORDERS SHOW THROUGH TWO INCHES AWAY. So
 * this sweeps a grid across the slab's whole box.
 *
 * ⚠️ THE CLAIM IS THAT THE CHROME RENDERS IDENTICALLY WHATEVER IS BEHIND IT — which is stronger than
 * "every point equals the ground" and needs no knowledge of which pixels are the header's own ink.
 * The slab is photographed with nothing beneath it and again with content beneath it, and the two
 * images must agree pixel for pixel. A title, a mark and four buttons all compare correctly against
 * themselves; anything reading through does not.
 */
import { test, expect, Page } from "@playwright/test";
import { openRoute, liftMotionSuppression } from "./measure";
import { readPng } from "./pngPixels";

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

const read = (page: Page, cls: string) => page.evaluate((c) => {
  const g = [...document.querySelectorAll(`.wpg.${c}`)].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement;
  if (!g) return null;
  const slab = g.querySelector(".wpg-chrome") as HTMLElement;
  const cs = getComputedStyle(slab);
  return {
    type: g.getAttribute("data-wpg-type"),
    bg: cs.backgroundColor,
    blur: cs.backdropFilter || (cs as unknown as { webkitBackdropFilter?: string }).webkitBackdropFilter || "none",
    shadow: cs.boxShadow,
    /* the ground the fill is supposed to be an alpha OF — read from the page, never restated */
    groundRgb: cs.getPropertyValue("--ws-window-rgb").trim(),
    ground: cs.getPropertyValue("--ws-window").trim(),
  };
}, cls);

/** the alpha of an `rgba(...)`, or 1 for an opaque `rgb(...)` */
const alphaOf = (c: string) => {
  const m = /rgba?\(([^)]*)\)/.exec(c);
  if (!m) return NaN;
  const parts = m[1].split(",").map((x) => parseFloat(x.trim()));
  return parts.length > 3 ? parts[3] : 1;
};
const channelsOf = (c: string) => (/rgba?\(([^)]*)\)/.exec(c)?.[1].split(",").slice(0, 3).map((x) => Math.round(parseFloat(x.trim()))) ?? []).join(", ");

test("⚠️ THE PINNED GROUND IS THE OPAQUE GROUND TOKEN — no alpha anywhere", async ({ page }) => {
  const lines: string[] = [];
  let pinned = 0, staticc = 0;
  for (const { name, route, cls } of PAGES) {
    await openRoute(page, route, { width: 1440, height: 900 });
    await liftMotionSuppression(page);
    const r = (await read(page, cls))!;
    expect(r, `${name}: no grid`).not.toBeNull();
    lines.push(`${name.padEnd(21)} ${String(r.type).padEnd(7)} · bg ${r.bg.padEnd(24)} · blur ${r.blur}`);
    /* ⚠️ NO ALPHA AT ALL, EITHER TYPE. The translucent direction is withdrawn: `backdrop-filter`
       does not reliably apply here, so any alpha is a see-through header waiting to be reported. */
    expect(alphaOf(r.bg), `${name}: the ground is ${r.bg} — it must be fully opaque`).toBe(1);
    expect(channelsOf(r.bg), `${name}: the ground's channels are not the window's (${r.groundRgb})`)
      .toBe(r.groundRgb.split(",").map((x) => Math.round(parseFloat(x.trim()))).join(", "));
    expect(r.blur, `${name}: a backdrop blur survives — it was only ever propping up a translucent fill`).toBe("none");
    if (r.type === "pinned") pinned += 1; else staticc += 1;
  }
  console.log("\n══ CHROME GROUND\n" + lines.join("\n"));
  expect(pinned, "no pinned page was measured").toBeGreaterThan(4);
  expect(staticc, "no static page was measured").toBeGreaterThan(0);
});

for (const vp of [{ width: 1280, height: 800 }, { width: 1440, height: 900 }]) {
  test(`⚠️ NOTHING READS THROUGH THE CHROME — swept, painted pixels — ${vp.width}x${vp.height}`, async ({ page }) => {
    const lines: string[] = [];
    let checked = 0;
    for (const { name, route, cls } of PAGES) {
      await openRoute(page, route, vp);
      await liftMotionSuppression(page);
      const t = await page.evaluate((c) => {
        const g = [...document.querySelectorAll(`.wpg.${c}`)].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement;
        return g?.getAttribute("data-wpg-type") ?? null;
      }, cls);
      if (t !== "pinned") continue;

      const box = async () => page.evaluate((c) => {
        const g = [...document.querySelectorAll(`.wpg.${c}`)].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement;
        const b = (g.querySelector(".wpg-chrome") as HTMLElement).getBoundingClientRect();
        return { x: Math.round(b.left), y: Math.round(b.top), width: Math.round(b.width), height: Math.round(b.height) };
      }, cls);

      /**
       * ⚠️ BOTH READINGS ARE TAKEN WITH THE CHROME IN THE SAME POSTURE, and my first version was not.
       * It photographed the chrome at rest and again after scrolling — but scrolling SETTLES it
       * (mark 52→34, title 30→22, description folded), so the two images differed by design and the
       * sweep reported ten changed points on a page with an opaque header. The instrument was
       * measuring the settle.
       *
       * ⚠️ SO THE COMPARISON IS BETWEEN TWO SCROLLED POSITIONS. The chrome is settled in both and
       * identical to itself; only what passes BEHIND it differs. That isolates the one variable this
       * case is about — change the backdrop, and the header must not change.
       */
      const strip = async () => { const b2 = await box(); return { x: b2.x, y: b2.y + b2.height + 2, width: b2.width, height: 40 }; };
      const scrollTo = (px: number) => page.evaluate(({ c, n }) => {
        const g = [...document.querySelectorAll(`.wpg.${c}`)].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement;
        const sel = g.getAttribute("data-wpg-settle");
        const hit = sel ? [...g.querySelectorAll(sel)].map((e) => e as HTMLElement).find((e) => e.scrollHeight - e.clientHeight > 2) : null;
        if (!hit) return { max: 0, at: 0 };
        hit.scrollTop = n;
        return { max: hit.scrollHeight - hit.clientHeight, at: hit.scrollTop };
      }, { c: cls, n: px });

      /**
       * ⚠️ THE TWO POSITIONS COME FROM THE MEASURED RANGE, NOT FROM TWO CONSTANTS. Fixed values of
       * 140 and 620 could not separate on a page whose zone scrolls 165px in total — the second
       * clamped to the first and the case failed for want of somewhere to scroll to, on a page that
       * was behaving perfectly. A fraction of whatever the page actually has always separates.
       */
      const range = await scrollTo(0);
      if (range.max < 140) { lines.push(`${name.padEnd(21)} — only ${range.max}px of scroll; too little to move a backdrop`); continue; }
      const first = await scrollTo(Math.round(range.max * 0.15) + 30);
      if (!first.max) { lines.push(`${name.padEnd(21)} — nothing to scroll at this viewport`); continue; }
      await page.waitForTimeout(800);          /* past the .22s settle, so the posture is stable */
      const before = readPng(await page.screenshot({ clip: await box() }));
      const beforeBelow = readPng(await page.screenshot({ clip: await strip() }));

      const second = await scrollTo(Math.round(range.max * 0.85));
      await page.waitForTimeout(800);
      const after = readPng(await page.screenshot({ clip: await box() }));
      const afterBelow = readPng(await page.screenshot({ clip: await strip() }));
      const scrolled = second.at - first.at;
      expect(scrolled, `${name}: the second scroll position is not past the first (${first.at} → ${second.at})`).toBeGreaterThan(60);

      /* the precondition: what is behind the chrome genuinely changed between the two readings */
      let movedBelow = 0;
      for (let x = 4; x < Math.min(beforeBelow.width, afterBelow.width) - 4; x += 7) {
        for (let y = 4; y < 36; y += 8) {
          const p1 = beforeBelow.at(x, y), p2 = afterBelow.at(x, y);
          if (p1[0] !== p2[0] || p1[1] !== p2[1] || p1[2] !== p2[2]) movedBelow += 1;
        }
      }
      /**
       * ⚠️ A PAGE WHERE NOTHING PASSES BEHIND THE CHROME IS SKIPPED, WITH ITS REASON — and the
       * precondition is what found the distinction. On the Tasks family the slab is pinned at the
       * top of a row that never scrolls, and the scrolling ZONE sits inside the layout well below
       * it: content moves, but never under the header. The fault this case exists for cannot occur
       * there, and asserting it anyway would be demanding a backdrop that does not exist.
       *
       * ⚠️ THE SKIP IS PAIRED WITH A POPULATION FLOOR after the loop, so a build where NO page
       * exercised the sweep cannot pass by having nothing to check.
       */
      if (movedBelow <= 20) {
        lines.push(`${name.padEnd(21)} — nothing passes behind this chrome (scrolled ${first.at} → ${second.at}); the sweep does not apply`);
        continue;
      }

      /**
       * ⚠️ THE SWEEP: three rows — the top, the middle, and just above the hairline — every 40px
       * across the full width. Its predecessor sampled ONE point, which is how a header with card
       * borders reading through it passed twice: a single sample lands on blank parchment and says
       * nothing about what is happening two inches away.
       */
      const rows = [6, Math.round(after.height / 2), after.height - 4];
      const bad: string[] = [];
      let sampled = 0;
      for (const y of rows) {
        for (let x = 4; x < after.width - 4; x += 40) {
          sampled += 1;
          const p1 = before.at(x, y), p2 = after.at(x, y);
          if (p1[0] !== p2[0] || p1[1] !== p2[1] || p1[2] !== p2[2]) bad.push(`(${x},${y}) ${p1.join(",")} → ${p2.join(",")}`);
        }
      }
      checked += 1;
      lines.push(`${name.padEnd(21)} ${sampled} points swept · ${bad.length ? `${bad.length} SHOWING THROUGH` : "identical with content beneath"}`);
      expect(sampled, `${name}: the sweep sampled nothing`).toBeGreaterThan(40);
      expect(bad.slice(0, 6), `${name}: the chrome renders DIFFERENTLY with content beneath it — ${bad.length} of ${sampled} sampled points changed, which is content reading through the header`)
        .toEqual([]);
    }
    console.log(`\n══ SWEPT BENEATH THE CHROME ${vp.width}x${vp.height}\n` + lines.join("\n"));
    expect(checked, `only ${checked} page(s) had anything passing behind their chrome — the sweep needs pages where content genuinely goes under the header`).toBeGreaterThan(3);
  });
}

