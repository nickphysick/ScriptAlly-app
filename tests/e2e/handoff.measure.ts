/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE HANDOFF ══════════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ THE BAR IS A SEPARATE ELEMENT AND THE MASTHEAD IS NEVER ANIMATED. What that buys is the claim
 * this file exists to prove: driving the scroller through the threshold and back changes the bar's
 * state at most once per direction, and `scrollTop` is the same before and after every one of those
 * changes. A morph could not make either claim — `font-family` is not interpolable, and an animated
 * height feeds back into scroll position, which is the loop this system has already paid for twice.
 */
import { test, expect } from "@playwright/test";
import { openRoute, liftMotionSuppression } from "./measure";

const PAGES: { name: string; route: string; cls: string }[] = [
  { name: "Contact list",        route: "/agents",               cls: "agl-wpg"  },
  { name: "Analytics",           route: "/queries/analytics",    cls: "qa-wpg"   },
  { name: "Noteboard",           route: "/todo/noteboard",       cls: "tpl-wpg"  },
  { name: "Comparable titles",   route: "/manuscripts/comps",    cls: "ct-wpg"   },
];

for (const width of [1280, 1440, 1920, 2560]) {
  test(`⚠️ THE HANDOFF FLIPS ONCE PER DIRECTION AND HOLDS scrollTop — ${width}`, async ({ page }) => {
    const lines: string[] = [];
    let exercised = 0;
    for (const { name, route, cls } of PAGES) {
      await openRoute(page, route, { width, height: 900 });
      await liftMotionSuppression(page);
      await page.waitForTimeout(600);

      const r = await page.evaluate(async (c) => {
        const g = [...document.querySelectorAll(`.wpg.${c}`)].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement;
        if (!g) return null;
        const scroller = (g.getAttribute("data-wpg-scroller") === ".wpg-scroll"
          ? g.querySelector(".wpg-scroll")
          : [...g.querySelectorAll(g.getAttribute("data-wpg-scroller") || ".wpg-scroll")]
              .find((e) => (e as HTMLElement).scrollHeight - (e as HTMLElement).clientHeight > 2)) as HTMLElement | null;
        if (!scroller) return { noScroll: true } as any;
        const max = scroller.scrollHeight - scroller.clientHeight;
        if (max < 420) return { noScroll: true, max } as any;
        const bar = g.querySelector(".wpg-bar") as HTMLElement | null;
        if (!bar) return { noBar: true } as any;

        const flips: { y: number; on: boolean }[] = [];
        /* ⚠️ scrollTop IS READ IMMEDIATELY BEFORE AND AFTER EACH FLIP, on the same frame boundary.
           A reading taken a frame later would be measuring whatever else the page did in between. */
        const holds: string[] = [];
        let prev = bar.classList.contains("wpg-bar--on");
        const step = async (y: number) => {
          const before = scroller.scrollTop;
          scroller.scrollTop = y;
          await new Promise((res) => requestAnimationFrame(res));
          await new Promise((res) => requestAnimationFrame(res));
          const on = bar.classList.contains("wpg-bar--on");
          if (on !== prev) {
            flips.push({ y, on });
            const after = scroller.scrollTop;
            holds.push(`${before}→${y}: scrollTop ${after}`);
            if (Math.abs(after - y) > 1) holds.push(`MOVED ${after} != ${y}`);
            prev = on;
          }
        };
        for (let y = 0; y <= 400; y += 4) await step(y);
        for (let y = 400; y >= 0; y -= 4) await step(y);
        const down = flips.filter((f) => f.on).length;
        const up = flips.filter((f) => !f.on).length;
        /**
         * ⚠️ THE DITHER IS THE ONLY PART THAT TESTS THE HYSTERESIS, and the sweep above cannot.
         * A monotonic pass crosses the boundary exactly once in each direction whatever the
         * thresholds are — measured, this whole case PASSED with both set to 150. Hysteresis exists
         * for a scroll that REVERSES near the boundary, so that is what has to be driven: four
         * crossings of the show threshold, none of them anywhere near the hide one. With the two
         * separated the state must not move at all; with them equal it flips on every step.
         */
        const beforeDither = bar.classList.contains("wpg-bar--on");
        let dither = 0;
        for (const y of [148, 152, 148, 152, 148, 152]) {
          scroller.scrollTop = y;
          await new Promise((res) => requestAnimationFrame(res));
          await new Promise((res) => requestAnimationFrame(res));
          const on = bar.classList.contains("wpg-bar--on");
          if (on !== prev) { dither += 1; prev = on; }
        }
        return { down, up, dither, beforeDither, flips: flips.map((f) => `${f.on ? "on" : "off"}@${f.y}`), holds, max };
      }, cls);

      expect(r, `${name}: no grid`).not.toBeNull();
      if (r.noScroll) { lines.push(`${name.padEnd(20)} cannot scroll 400px here (max ${r.max ?? 0}) — handoff not exercised`); continue; }
      expect(r.noBar, `${name}: the grid renders no collapsed bar`).toBeFalsy();
      exercised += 1;
      lines.push(`${name.padEnd(20)} ${r.flips.join(" ")} · dither ${r.dither} · ${r.holds.join(" · ")}`);
      /* ⚠️ AT MOST ONE PER DIRECTION — the hysteresis's whole job. A single threshold gives several,
         because a 4px step lands on it repeatedly as the page settles. */
      expect(r.down, `${name}: the bar appeared ${r.down} times on the way down — the thresholds are not separated`).toBeLessThanOrEqual(1);
      expect(r.up, `${name}: the bar left ${r.up} times on the way up`).toBeLessThanOrEqual(1);
      /* ⚠️ AND IT MUST ACTUALLY HAVE HAPPENED. "At most one" is satisfied by none, which is what a
         bar that never appears looks like. */
      expect(r.down, `${name}: the bar never appeared at all across 400px`).toBe(1);
      expect(r.up, `${name}: the bar never left on the way back`).toBe(1);
      expect(r.holds.join(" "), `${name}: the scroller moved across a handoff — the bar is reserving space`).not.toContain("MOVED");
      /* ⚠️ AT MOST ONE, NOT ZERO: the dither starts from wherever the sweep left the bar, so the
         first crossing may legitimately turn it on. What it may not do is chatter. */
      expect(r.dither, `${name}: the bar changed state ${r.dither} times while the scroller dithered across the show threshold — the two thresholds are not separated`)
        .toBeLessThanOrEqual(1);
    }
    /**
     * ⚠️ AND THE HANDOFF MUST NOT SLIDE SIDEWAYS. The bar replaces the masthead, so its name has to
     * begin where the title did — measured, the bar's ground was 80px short of the window on each
     * side and its inner measure then centred inside the wrong box, 940px against the masthead's
     * 1100. Asserted at every width because the two only diverge past the content cap: `.wpg-scroll`
     * caps its children, so the bar needed the same 0-2-0 override the slab already had.
     */
    for (const { name, route, cls } of PAGES) {
      await openRoute(page, route, { width, height: 900 });
      await liftMotionSuppression(page);
      await page.waitForTimeout(400);
      const a = await page.evaluate((c) => {
        const g = [...document.querySelectorAll(`.wpg.${c}`)].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement;
        const q = (s2: string) => g.querySelector(s2) as HTMLElement | null;
        const box = (e: HTMLElement | null) => e ? { l: Math.round(e.getBoundingClientRect().left), r: Math.round(e.getBoundingClientRect().right) } : null;
        return { bar: box(q(".wpg-bar")), barin: box(q(".wpg-barin")), mast: box(q(".wpg-mast")), slab: box(q(".wpg-chrome")) };
      }, cls);
      if (!a.bar) continue;
      expect(a.bar!.l, `${name}: the bar's ground starts inside the window's edge`).toBe(a.slab!.l);
      expect(a.bar!.r, `${name}: the bar's ground stops before the window's edge`).toBe(a.slab!.r);
      expect(a.barin!.l, `${name}: the bar's name starts at ${a.barin!.l} against the masthead's ${a.mast!.l} — the handoff slides sideways`).toBe(a.mast!.l);
      expect(a.barin!.r, `${name}: the bar's measure ends at ${a.barin!.r} against the masthead's ${a.mast!.r}`).toBe(a.mast!.r);
    }
    console.log(`\n══ THE HANDOFF — ${width}\n` + lines.join("\n"));
    expect(exercised, "no page could be scrolled far enough to exercise the handoff").toBeGreaterThan(1);
  });
}
