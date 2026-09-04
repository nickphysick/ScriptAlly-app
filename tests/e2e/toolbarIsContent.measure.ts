/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE TOOLBAR IS CONTENT, NEVER CHROME (compact header, §3) ═════════════════════════════════
 *
 * ⚠️ ASSERTED STRUCTURALLY, BECAUSE "IT LOOKS SEPARATE" IS WHAT IT ALREADY LOOKED LIKE. The toolbar
 * sat INSIDE `.wpg-chrome`, sharing the header's box, ground and closing hairline — which is what
 * made Contact list read as one 300px block — and every property-level reading of it was correct.
 * What was wrong was containment, and only a claim about ancestry can see that.
 */
import { test, expect, Page } from "@playwright/test";
import { openRoute, liftMotionSuppression } from "./measure";

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
  const band = g.querySelector(".wpg-toolband") as HTMLElement | null;
  if (!band) return { hasBand: false } as const;
  const chrome = g.querySelector(".wpg-chrome") as HTMLElement;
  const scroll = g.querySelector(".wpg-scroll") as HTMLElement;
  const mast = g.querySelector(".wsh") as HTMLElement;
  const cs = getComputedStyle(band);
  const chromeCs = getComputedStyle(chrome);
  const r2 = (n: number) => Math.round(n * 10) / 10;
  return {
    hasBand: true,
    fill: g.classList.contains("wpg--fill"),
    /* ⚠️ CONTAINMENT, THE CLAIM ITSELF — is the toolbar inside the header's box at all */
    insideChrome: chrome.contains(band),
    insideMast: mast.contains(band),
    /* the nearest POSITIONED ancestor: the scroller, never the header */
    offsetParent: (band.offsetParent as HTMLElement | null)?.className?.toString().split(" ")[0] ?? null,
    position: cs.position,
    top: cs.top,
    zBand: cs.zIndex,
    zBar: (() => { const b = g.querySelector(".wpg-bar") as HTMLElement | null; return b ? getComputedStyle(b).zIndex : "—"; })(),
    /* ⚠️ AND ITS TOP EDGE AT REST IS BELOW THE HEADER'S CLOSING HAIRLINE — the geometric half. */
    bandTop: r2(band.getBoundingClientRect().top),
    chromeBottom: r2(chrome.getBoundingClientRect().bottom),
    /* the header's box must not be the toolbar's ground, border or padding */
    bandBg: cs.backgroundColor,
    chromeBg: chromeCs.backgroundColor,
    bandBorderTop: cs.borderTopWidth,
    controls: band.querySelectorAll("button, input, select, a").length,
  };
}, cls);

test("⚠️ THE TOOLBAR IS A SIBLING OF THE HEADER, NOT A CHILD — all ten pages", async ({ page }) => {
  const lines: string[] = [];
  let measured = 0, banded = 0, sticky = 0, staticc = 0;
  for (const { name, route, cls } of PAGES) {
    await openRoute(page, route, { width: 1440, height: 900 });
    await liftMotionSuppression(page);
    const r = await read(page, cls);
    expect(r, `${name}: no grid`).not.toBeNull();
    measured += 1;
    if (!r!.hasBand) { lines.push(`${name.padEnd(21)} — no toolbar`); continue; }
    const b = r as Exclude<typeof r, null | { readonly hasBand: false }>;
    banded += 1;

    /* ⚠️ THE TWO STRUCTURAL CLAIMS THE BRIEF NAMES. */
    expect(b.insideChrome, `${name}: the toolbar is inside the header's slab — it shares its box`).toBe(false);
    expect(b.insideMast, `${name}: the toolbar is inside the masthead element`).toBe(false);
    expect(b.offsetParent, `${name}: the toolbar's nearest positioned ancestor is ${b.offsetParent}, not the scroller`)
      .toBe("wpg-scroll");
    expect(b.bandTop, `${name}: the toolbar's top edge is above the header's closing hairline`)
      .toBeGreaterThanOrEqual(b.chromeBottom - 0.5);

    /* ⚠️ AND IT SHARES NONE OF THE HEADER'S TREATMENT. It paints the page ground in its own right —
       which it must, since content passes beneath it — and takes no border from the slab. */
    expect(b.bandBorderTop, `${name}: the toolbar grew a top border — the header's hairline is the one line`).toBe("0px");

    /**
     * ⚠️ STICKY WHERE THE ROW SCROLLS, STATIC WHERE IT CANNOT. A `fill` page's row never moves, so a
     * sticky element with an offset there does not idle — it CLAMPS, and sits 44px lower for good.
     * That is the `top: 51px` fault, and it would have shoved the whole Tasks family.
     */
    if (b.fill) {
      staticc += 1;
      expect(b.position, `${name} is a fill page and its toolbar is ${b.position} — it would clamp by its own offset`).toBe("static");
    } else {
      sticky += 1;
      expect(b.position, `${name}: the toolbar does not pin`).toBe("sticky");
      expect(b.top, `${name}: the toolbar rests at ${b.top} rather than beneath the bar`).toBe("44px");
      /* the ladder: the bar is the outer chrome and must win where the two boxes meet */
      expect(Number(b.zBand), `${name}: the toolbar is not below the bar`).toBeLessThan(Number(b.zBar));
    }
    lines.push(`${name.padEnd(21)} ${b.position.padEnd(7)} top ${b.top.padEnd(6)} · z ${b.zBand}/${b.zBar} · ${b.controls} controls · top edge ${b.bandTop} vs header base ${b.chromeBottom}`);
  }
  console.log("\n══ THE TOOLBAR AS CONTENT (1440)\n" + lines.join("\n"));
  expect(measured, "the census was not fully walked").toBe(PAGES.length);
  /* ⚠️ BOTH POPULATIONS FLOORED, so neither branch can pass by being empty. */
  expect(sticky, "no scrolling page has a toolbar — the sticky branch measured nothing").toBeGreaterThan(0);
  expect(staticc, "no fill page has a toolbar — the clamp branch measured nothing").toBeGreaterThan(0);
  console.log(`   ${banded}/${measured} pages carry a toolbar · ${sticky} pin · ${staticc} static (fill)`);
});

/**
 * ⚠️ IT COMES TO REST UNDER THE BAR, WHICH IS THE POINT OF THE OFFSET. Measured rather than derived:
 * two sticky elements in one scroller whose boxes must meet exactly, and this repo has watched an
 * offset for another element's height be wrong twice.
 */
test("⚠️ THE TOOLBAR RESTS DIRECTLY BENEATH THE BAR, AND THE BAR WINS WHERE THEY MEET", async ({ page }) => {
  const { route, cls } = PAGES[2];   /* Contact list — the page whose screenshot started this */
  await openRoute(page, route, { width: 1440, height: 900 });
  await liftMotionSuppression(page);
  await page.evaluate((c) => {
    const g = [...document.querySelectorAll(`.wpg.${c}`)].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement;
    (g.querySelector(".wpg-scroll") as HTMLElement).scrollTop = 400;
  }, cls);
  await page.waitForTimeout(700);
  const held = await page.evaluate((c) => {
    const g = [...document.querySelectorAll(`.wpg.${c}`)].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement;
    const bar = (g.querySelector(".wpg-bar") as HTMLElement).getBoundingClientRect();
    const band = (g.querySelector(".wpg-toolband") as HTMLElement);
    const b = band.getBoundingClientRect();
    return {
      gap: Math.round((b.top - bar.bottom) * 10) / 10,
      on: band.className.includes("--on"),
      /* what is painted where they meet — the bar must be the one that wins */
      atSeam: (document.elementFromPoint(bar.left + 60, bar.bottom - 2) as HTMLElement | null)?.className?.toString().split(" ")[0] ?? null,
    };
  }, cls);
  console.log(`   Contact list held: gap ${held.gap}px · hairline ${held.on ? "on" : "off"} · at the seam: ${held.atSeam}`);
  /* the bar's border is 1px and lives inside its box, so the band's top meets its bottom exactly */
  expect(held.gap, `the toolbar rests ${held.gap}px from the bar rather than against it`).toBeLessThanOrEqual(1);
  expect(held.gap, `the toolbar overlaps the bar by ${-held.gap}px`).toBeGreaterThanOrEqual(-1);
  expect(held.on, "the toolbar holds without its hairline").toBe(true);
  expect(held.atSeam, "the toolbar paints over the bar where they meet").toBe("wpg-bar");
});
