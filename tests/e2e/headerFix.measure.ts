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
 * ══ THE RETRACT, DRIVEN RATHER THAN EYEBALLED (§5) ═════════════════════════════════════════════
 *
 * ⚠️ OSCILLATION SHOWS AS MULTIPLE FLIPS WITHIN ONE DIRECTION, which is why the count is per
 * direction and not overall. A correct retract flips exactly once going down and once coming back;
 * a beating one flips on most steps. Verified red by setting both thresholds to 4: Contact list went
 * from 1 flip on the way up to ELEVEN, and its `scrollTop` drift went from 0 to ±8.
 *
 * ⚠️ AND THE SCROLL POSITION IS COMPARED AFTER THE MOVEMENT HAS FINISHED, not two frames in. The
 * height change is absorbed by the reclaim spacer over the transition's whole 220ms, so a reading
 * taken while it is still running would be measuring the middle of the compensation rather than its
 * result — and would pass on a mechanism that ended up somewhere else entirely.
 */
const RETRACT_PAGES = [
  { name: "Contact list", cls: "agl-wpg", route: "/agents" },
  { name: "Analytics",    cls: "qa-wpg",  route: "/queries/analytics" },
  { name: "Calendar",     cls: "tpl-wpg", route: "/todo/calendar" },
  { name: "Noteboard",    cls: "tpl-wpg", route: "/todo/noteboard" },
];

for (const width of [1280, 1440]) {
  test(`⚠️ THE RETRACT FLIPS ONCE PER DIRECTION AND MOVES NOTHING — ${width}`, async ({ page }) => {
    const lines: string[] = [];
    const results: { name: string; down: number[]; up: number[]; drift: number[] }[] = [];
    let measured = 0, declined = 0;
    for (const { name, route, cls } of RETRACT_PAGES) {
      await openRoute(page, route, { width, height: 900 });
      await liftMotionSuppression(page);
      const r = await page.evaluate(async (c) => {
        const g = [...document.querySelectorAll(`.wpg.${c}`)].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement;
        if (!g) return null;
        const sel = g.getAttribute("data-wpg-settle")!;
        const el = [...g.querySelectorAll(sel)].map((e) => e as HTMLElement).find((e) => e.scrollHeight - e.clientHeight > 2);
        if (!el) return { skip: "nothing scrolls here", overflow: 0, chromeH: 0 } as const;
        /**
         * ⚠️ A PAGE MAY DECLINE TO SETTLE, AND THAT IS A READING RATHER THAN A SKIP. A page whose
         * scroller overflows by less than its chrome is tall cannot settle without destroying the
         * scroll the settle depends on — so it does not, and it therefore never retracts either.
         * Reported with the two numbers that decide it, so the next reader can see WHY rather than
         * finding a page quietly absent from the results.
         */
        const chromeH = Math.round((g.querySelector(".wpg-chrome") as HTMLElement).getBoundingClientRect().height);
        const overflow = Math.round(el.scrollHeight - el.clientHeight);
        if (overflow <= chromeH) return { skip: `declines to settle — overflows by ${overflow} against a ${chromeH} chrome`, overflow, chromeH } as const;
        const frame = () => new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
        const settle = async () => {
          /* wait for the movement itself, rather than a fixed sleep that might outlast or undercut it */
          for (let i = 0; i < 60; i += 1) {
            if ((g.getAnimations?.({ subtree: true }) ?? []).length === 0) return;
            await frame();
          }
        };
        const down: number[] = [], up: number[] = [], drift: number[] = [];
        let prev = g.classList.contains("wpg--retracted");
        let dir: "down" | "up" = "down";
        const step = async (to: number) => {
          const before = el.scrollTop;
          el.scrollTop = to;
          await frame();
          const now = g.classList.contains("wpg--retracted");
          if (now !== prev) {
            (dir === "down" ? down : up).push(to);
            /* the transition's whole run, then the comparison */
            await settle();
            drift.push(Math.round(el.scrollTop - to));
            void before;
            prev = now;
          }
        };
        for (let t = 0; t <= 300; t += 4) await step(t);
        dir = "up";
        for (let t = 300; t >= 0; t -= 4) await step(t);
        return { down, up, drift, skip: null };
      }, cls);
      expect(r, `${name}: no grid`).not.toBeNull();
      if (r!.skip) { lines.push(`${name.padEnd(14)} — ${r!.skip}`); declined += 1; continue; }
      measured += 1;
      const { down, up, drift } = r as { down: number[]; up: number[]; drift: number[] };
      lines.push(`${name.padEnd(14)} retract@[${down.join(",")}] · restore@[${up.join(",")}] · drift ${JSON.stringify(drift)}`);
      results.push({ name, down, up, drift });
      continue;
    }
    console.log(`\n══ RETRACT DRIVEN 0→300→0 IN 4px STEPS — ${width}\n` + lines.join("\n"));
    expect(measured, "no page exercised the retract").toBeGreaterThan(2);
    /* ⚠️ AND THE DECLINED COUNT IS ASSERTED, NOT IGNORED. A page silently leaving the system is
       exactly what a census exists to catch — if this ever rises, a page has stopped settling and
       the reason belongs in a report rather than in a skipped row nobody reads. */
    expect(declined, "more pages declined to settle than expected — see the reasons above").toBeLessThanOrEqual(1);
    /* ⚠️ ASSERTED AFTER THE WHOLE CENSUS IS REPORTED. Throwing inside the loop stops at the first
       page and prints one line about it, which is how a run tells you least at the moment you need
       most — the first version of this file failed on page one and showed nothing about the rest. */
    for (const { name, down, up, drift } of results) {
      expect(down.length, `${name}: the toolbar retracted ${down.length} times on one downward pass — it is oscillating`).toBe(1);
      expect(up.length, `${name}: the toolbar restored ${up.length} times on one upward pass — it is oscillating`).toBe(1);
      expect(down[0], `${name}: retracted after only ${down[0]}px of downward travel`).toBeGreaterThanOrEqual(8);
      for (const d of drift) {
        expect(Math.abs(d), `${name}: the scroll position moved ${d}px across a transition`).toBeLessThanOrEqual(1);
      }
    }
  });
}

test("⚠️ NO RETRACTED STATE AT REST, AND NONE ON A STATIC PAGE", async ({ page }) => {
  const lines: string[] = [];
  let statics = 0, pinned = 0;
  for (const { name, route, cls } of PAGES) {
    await openRoute(page, route, { width: 1440, height: 900 });
    await liftMotionSuppression(page);
    const r = await page.evaluate((c) => {
      const g = [...document.querySelectorAll(`.wpg.${c}`)].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement;
      return g ? { type: g.getAttribute("data-wpg-type"), retracted: g.classList.contains("wpg--retracted") } : null;
    }, cls);
    expect(r, `${name}: no grid`).not.toBeNull();
    /* at rest, every page — a page that opened with its controls gone would be a page missing them */
    expect(r!.retracted, `${name}: is retracted at rest`).toBe(false);
    if (r!.type === "static") statics += 1; else pinned += 1;
    lines.push(`${name.padEnd(21)} ${r!.type} · retracted ${r!.retracted}`);
  }
  console.log("\n══ AT REST (1440)\n" + lines.join("\n"));
  expect(statics, "no static page was measured").toBeGreaterThan(0);
  expect(pinned, "no pinned page was measured").toBeGreaterThan(4);
});
