/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE HEADER FIX PACK'S LOCKS — the wash's reach, the toolbar's ground, and the retract.
 *
 * ⚠️ EVERY CASE HERE IS A PARTITION OVER THE CENSUS, NEVER A PAGE LIST. "Every masthead carries the
 * wash" and "no toolbar carries it" are claims about all ten pages at once; written as
 * `expect(pagesWithWash).toBe(10)` they would go green the day a page stopped rendering a masthead
 * at all. Each case therefore asserts its POPULATION first and then the property over that
 * population — the discipline the off-screen-probe and empty-set failures in CLAUDE.md are about.
 */
import { test, expect, Page } from "@playwright/test";
import { openRoute, liftMotionSuppression } from "./measure";

/* ⚠️ SPLICED FROM THE GROUND LOCK, NEVER RETYPED — writing this census by hand produced two wrong
   classes out of three in one sitting. If it moves, it moves in one place. */
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

const norm = (c: string) => (/rgba?\(([^)]*)\)/.exec(c)?.[1].split(",").slice(0, 3).map((x) => Math.round(parseFloat(x.trim()))) ?? []).join(", ");
/* ⚠️ A TOKEN IS A HEX AND A COMPUTED STOP IS AN `rgb()` — comparing them raw is a lock that fails on
   a correct page, which is exactly what the first run of this file did. One canonical form for both. */
const asRgb = (v: string) => {
  const t = v.trim();
  const m = /^#?([0-9a-f]{6})$/i.exec(t);
  if (m) { const n = parseInt(m[1], 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255].join(", "); }
  return norm(t) || t;
};

const read = (page: Page, cls: string) => page.evaluate((c) => {
  /* ⚠️ THE VISIBLE GRID, NEVER `.first()`. Three pages share `tpl-wpg` and the shell keeps every
     page mounted, toggling `display` — so the first match is routinely a page that is not on
     screen, and the locator waits the whole test timeout for it to become "stable". */
  const g = [...document.querySelectorAll(`.wpg.${c}`)].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement;
  if (!g) return null;
  const chrome = g.querySelector(".wpg-chrome") as HTMLElement;
  const band = g.querySelector(".wpg-toolband") as HTMLElement | null;
  const cs = getComputedStyle(chrome);
  const bs = band ? getComputedStyle(band) : null;
  return {
    type: g.getAttribute("data-wpg-type"),
    chromeImg: cs.backgroundImage,
    chromeBg: cs.backgroundColor,
    washTop: cs.getPropertyValue("--mast-wash-top").trim(),
    washBottom: cs.getPropertyValue("--mast-wash-bottom").trim(),
    /* ⚠️ THE TRIPLE, NOT `--ws-window`. A custom property read back gives its TOKEN TEXT, and
       `--ws-window` is itself `rgb(var(--ws-window-rgb))` — so reading it yields that string rather
       than a colour, and comparing it to a computed `rgb()` fails on a correct page. */
    ground: cs.getPropertyValue("--ws-window-rgb").trim(),
    hasBand: !!band,
    bandBg: bs?.backgroundColor ?? "",
    bandImg: bs?.backgroundImage ?? "",
    /* ⚠️ THE ROW ITSELF, TOO. The band could be innocent while the row inside it painted a wash of
       its own — asking only the band would answer a narrower question than the one that matters. */
    toolsImg: band ? getComputedStyle(band.querySelector(".wpg-tools") as HTMLElement).backgroundImage : "",
  };
}, cls);

test("⚠️ EVERY MASTHEAD CARRIES THE WASH — a partition, with no page named", async ({ page }) => {
  const lines: string[] = [];
  let measured = 0, washed = 0;
  for (const { name, route, cls } of PAGES) {
    await openRoute(page, route, { width: 1440, height: 900 });
    await liftMotionSuppression(page);
    const r = await read(page, cls);
    expect(r, `${name}: no grid — the census names a page this build does not render`).not.toBeNull();
    measured += 1;
    const stops = r!.chromeImg.match(/rgb\([^)]*\)/g) ?? [];
    /* the claim, over whichever pages exist: a gradient between the two tokens */
    expect(stops.length, `${name}: its masthead draws no wash (${r!.chromeImg.slice(0, 50)})`).toBe(2);
    expect(norm(stops[0]), `${name}: the wash's first stop is not --mast-wash-top`).toBe(asRgb(r!.washTop));
    expect(norm(stops[1]), `${name}: the wash's second stop is not --mast-wash-bottom`).toBe(asRgb(r!.washBottom));
    washed += 1;
    lines.push(`${name.padEnd(21)} ${String(r!.type).padEnd(7)} · WASH · band ${r!.hasBand ? r!.bandBg : "no toolbar"}`);
  }
  console.log("\n══ THE WASH, EVERY MASTHEAD (1440)\n" + lines.join("\n"));
  /* ⚠️ THE POPULATION FIRST — an empty census satisfies every claim above it. */
  expect(measured, "no page was measured at all").toBe(PAGES.length);
  expect(washed, "a masthead was measured that carries no wash").toBe(measured);
});

test("⚠️ NO TOOLBAR CARRIES THE WASH — asserted in both directions", async ({ page }) => {
  let withBand = 0, withoutBand = 0;
  const lines: string[] = [];
  for (const { name, route, cls } of PAGES) {
    await openRoute(page, route, { width: 1440, height: 900 });
    await liftMotionSuppression(page);
    const r = (await read(page, cls))!;
    if (!r.hasBand) { withoutBand += 1; continue; }
    withBand += 1;
    /* the toolbar's ground is the PAGE's, unchanged — stated as a value comparison against the
       ground token the page itself publishes, never against a literal on both sides */
    expect(norm(r.bandBg), `${name}: the toolbar's ground is not the page's --ws-window`).toBe(asRgb(`rgb(${r.ground})`));
    expect(r.bandImg, `${name}: the toolbar's band carries a background image — the wash has reached it`).toBe("none");
    expect(r.toolsImg, `${name}: the control row itself paints an image — the wash has reached it`).toBe("none");
    lines.push(`${name.padEnd(21)} band ${r.bandBg} · no image`);
  }
  console.log("\n══ THE TOOLBAR'S GROUND (1440)\n" + lines.join("\n"));
  /* ⚠️ BOTH DIRECTIONS. Without this the case passes on a build where no page renders a toolbar at
     all — which is exactly the state Discover was just moved into, so it is not hypothetical. */
  expect(withBand, "no toolbar was measured — the case proved nothing").toBeGreaterThan(2);
  expect(withBand + withoutBand, "the census was not fully walked").toBe(PAGES.length);
});

test("⚠️ A PAGE WITH NO CONTROLS RENDERS NO CONTROL ROW — structural, not Discover-specific", async ({ page }) => {
  const lines: string[] = [];
  let checked = 0;
  for (const { name, route, cls } of PAGES) {
    await openRoute(page, route, { width: 1440, height: 900 });
    await liftMotionSuppression(page);
    const r = await page.evaluate((c) => {
      const g = [...document.querySelectorAll(`.wpg.${c}`)].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement;
      const band = g?.querySelector(".wpg-toolband") as HTMLElement | null;
      if (!band) return { band: false, controls: 0, badges: 0 };
      /* a CONTROL is something you can operate; everything else in the row is a statement */
      const controls = band.querySelectorAll("button, a[href], input, select, textarea, [role=button], [role=menuitem], [tabindex]:not([tabindex='-1'])").length;
      const badges = [...band.querySelectorAll("*")].filter((e) => (e as HTMLElement).children.length === 0 && (e.textContent ?? "").trim().length > 0).length;
      return { band: true, controls, badges };
    }, cls);
    checked += 1;
    if (r.band) {
      /* ⚠️ THE CLAIM IS THE IMPLICATION, NOT DISCOVER. A row that exists must hold at least one
         operable control — which is what makes a badge-only row a fault wherever it appears, rather
         than a fact about the one page that had one. */
      expect(r.controls, `${name}: renders a control row holding no controls — ${r.badges} static item(s) only`).toBeGreaterThan(0);
      lines.push(`${name.padEnd(21)} toolbar · ${r.controls} controls`);
    } else {
      lines.push(`${name.padEnd(21)} no toolbar`);
    }
  }
  console.log("\n══ CONTROL ROWS (1440)\n" + lines.join("\n"));
  expect(checked, "the census was not walked").toBe(PAGES.length);
});

/**
 * ⚠️ THE RETRACT'S CASES ARE NOT HERE, BECAUSE THE RETRACT IS NOT BUILT (header fix, §4 withdrawn).
 * It was built, measured, and taken back out: every mechanism that reclaims the toolbar's height
 * interacts with the browser's scroll anchoring, and the two that behaved at the ends were wrong in
 * the middle. The measurements and what each one cost are in the run report; what belongs HERE is
 * the absence, asserted, so a half-landed retract cannot arrive unnoticed.
 */
test("⚠️ NO PAGE RETRACTS ITS TOOLBAR — the mechanism is withdrawn, not half-present", async ({ page }) => {
  const lines: string[] = [];
  for (const { name, route, cls } of PAGES) {
    await openRoute(page, route, { width: 1440, height: 900 });
    await liftMotionSuppression(page);
    const r = await page.evaluate(async (c) => {
      const g = [...document.querySelectorAll(`.wpg.${c}`)].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement;
      if (!g) return null;
      const sel = g.getAttribute("data-wpg-settle");
      const el = sel ? [...g.querySelectorAll(sel)].map((e) => e as HTMLElement).find((e) => e.scrollHeight - e.clientHeight > 2) : null;
      const band = g.querySelector(".wpg-toolband") as HTMLElement | null;
      const before = band ? Math.round(band.getBoundingClientRect().height) : null;
      if (el) { for (let t = 0; t <= 300; t += 20) { el.scrollTop = t; await new Promise((r) => requestAnimationFrame(r)); } }
      await new Promise((r) => setTimeout(r, 500));
      return {
        retractedClass: g.className.includes("wpg--retracted"),
        before, after: band ? Math.round(band.getBoundingClientRect().height) : null,
      };
    }, cls);
    expect(r, `${name}: no grid`).not.toBeNull();
    /**
     * ⚠️ THE CLAIM IS THAT IT DOES NOT FOLD, NOT THAT IT DOES NOT MOVE — and the first version of
     * this case got that wrong. The row's padding tightens when the chrome pins (14/14 → 0/12), so
     * its band is legitimately ~16px shorter once scrolled; asserting an unchanged height failed on
     * correct behaviour. What must not happen is the row going AWAY, so the floor is what is
     * asserted: it is still a row, still most of its resting height, still there.
     */
    if (r!.before !== null) {
      expect(r!.after, `${name}: the toolbar folded away on scroll — the retract is not built`)
        .toBeGreaterThan(r!.before * 0.6);
    }
    expect(r!.retractedClass, `${name}: a retracted state has appeared`).toBe(false);
    lines.push(`${name.padEnd(21)} band ${r!.before ?? "—"} → ${r!.after ?? "—"}`);
  }
  console.log("\n══ THE TOOLBAR TRAVELS, IT DOES NOT FOLD (1440)\n" + lines.join("\n"));
});
