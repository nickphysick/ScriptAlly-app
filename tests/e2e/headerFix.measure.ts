/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE HEADER FIX PACK'S LOCKS — the toolbar's ground, and the retract that stayed withdrawn.
 *
 * ⚠️ THE WASH AND ITS CARVE-OUT ARE DELETED. `--mast-wash-top` / `--mast-wash-bottom` painted a
 * parchment band on the masthead; the rebuild gives every masthead the window's own ground, so
 * there is one ground and nothing to partition. The CARVE-OUT went with it — two pages (Submission
 * packages and Query Centre) were permitted a ground of their own for the illustrated trial, and a
 * carve-out with nothing left to be carved out OF is a list nobody can reason about.
 *
 * ⚠️ THE PART THAT WAS ALWAYS THE POINT SURVIVES AND IS WHY THIS FILE IS NOT DELETED: the toolbar
 * takes the PAGE's ground, not the masthead's, and the boundary between them is a colour change
 * rather than a rule. That claim is independent of what the masthead is filled with.
 *
 * ⚠️ EVERY CASE HERE IS A PARTITION OVER THE CENSUS, NEVER A PAGE LIST. "Every masthead sits on one
 * ground" and "no toolbar takes the masthead's" are claims about all ten pages at once; written as
 * `expect(pagesWithGround).toBe(10)` they would go green the day a page stopped rendering a masthead
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
/* ⚠️ AN OPAQUE FILL REPORTS `rgb(...)`, A TRANSPARENT ONE `rgba(..., a)` — and a missing background
   reports `rgba(0, 0, 0, 0)`. All three have to be told apart, so the alpha is read rather than the
   string being pattern-matched. */
const alpha = (c: string) => {
  const parts = /rgba?\(([^)]*)\)/.exec(c)?.[1].split(",") ?? [];
  return parts.length > 3 ? parseFloat(parts[3]) : 1;
};

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
    chromeImg: cs.backgroundImage,
    chromeBg: cs.backgroundColor,
    titleSize: (() => { const t = g.querySelector(".wsh-title") as HTMLElement | null; return t ? getComputedStyle(t).fontSize : ""; })(),
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

test("⚠️ EVERY MASTHEAD SITS ON THE WINDOW'S OWN GROUND — a partition, with no carve-out", async ({ page }) => {
  /**
   * ⚠️ THE CARVE-OUT IS GONE AND THE PARTITION IS STRONGER FOR IT. It named two pages by hand and
   * held them to a weaker claim, which is exactly the shape that erodes one exemption at a time.
   * One format, one ground, ten pages, no names.
   *
   * ⚠️ OPACITY IS ASSERTED, NOT JUST IDENTITY. A masthead scrolls beneath the collapsed bar, and a
   * translucent one lets the page's own cards read through it — the fault this pack's ancestor
   * shipped twice behind a green lock.
   */
  const lines: string[] = [];
  let measured = 0;
  for (const { name, route, cls } of PAGES) {
    await openRoute(page, route, { width: 1440, height: 900 });
    await liftMotionSuppression(page);
    const r = await read(page, cls);
    expect(r, `${name}: no grid`).not.toBeNull();
    measured += 1;
    expect(r!.chromeImg, `${name}: the masthead paints a background image — the wash has come back`).toBe("none");
    expect(norm(r!.chromeBg), `${name}: the masthead's ground is not the window's own`).toBe(asRgb(`rgb(${r!.ground})`));
    expect(alpha(r!.chromeBg), `${name}: the masthead's ground is not opaque (${r!.chromeBg})`).toBe(1);
    lines.push(`${name.padEnd(21)} ground ${r!.chromeBg}`);
  }
  console.log("\n══ THE MASTHEAD'S GROUND (1440)\n" + lines.join("\n"));
  expect(measured, "the census was not fully walked").toBe(PAGES.length);
});

test("⚠️ THE TOOLBAR TAKES THE PAGE'S GROUND, NOT THE MASTHEAD'S — asserted in both directions", async ({ page }) => {
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
    expect(r.bandImg, `${name}: the toolbar's band carries a background image`).toBe("none");
    expect(r.toolsImg, `${name}: the control row itself paints an image`).toBe("none");
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
      const sel = g.getAttribute("data-wpg-scroller");
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
