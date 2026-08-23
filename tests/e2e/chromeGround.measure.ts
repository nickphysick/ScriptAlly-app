/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE PINNED GROUND — never see-through (pinned header ground; ref 176 option C).
 *
 * ⚠️ THE CLAIM IS ABOUT PIXELS, NOT DECLARATIONS. A translucent fill plus a blur is correct only if
 * the two together stop content reading through the header; a `background` that parses says nothing
 * about that, and the fallback branches are precisely the cases where the declaration is present and
 * the effect is not. So this scrolls content beneath the chrome and asks what is painted there.
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

test("⚠️ THE PINNED GROUND IS TRANSLUCENT AND BLURRED, AND DERIVED FROM THE GROUND TOKEN", async ({ page }) => {
  const lines: string[] = [];
  let pinned = 0;
  let staticc = 0;
  for (const { name, route, cls } of PAGES) {
    await openRoute(page, route, { width: 1440, height: 900 });
    await liftMotionSuppression(page);
    const r = (await read(page, cls))!;
    expect(r, `${name}: no grid`).not.toBeNull();
    lines.push(`${name.padEnd(21)} ${String(r.type).padEnd(7)} · bg ${r.bg.padEnd(26)} · blur ${r.blur.slice(0, 28).padEnd(30)} · shadow ${r.shadow === "none" ? "none" : "declared"}`);

    if (r.type === "pinned") {
      pinned += 1;
      expect(alphaOf(r.bg), `${name}: the pinned ground is ${r.bg} — it should be the window at 72%`).toBeCloseTo(0.72, 2);
      /* ⚠️ DERIVED, NOT RESTATED. The fill's channels must BE the ground's, so the two cannot drift
         — a hardcoded triple would silently diverge the next time the ground moves, and it has moved
         twice this year. Compared as values rather than by asserting a hex anywhere. */
      expect(channelsOf(r.bg), `${name}: the pinned ground's channels (${channelsOf(r.bg)}) are not the window's (${r.groundRgb})`)
        .toBe(r.groundRgb.split(",").map((x) => Math.round(parseFloat(x.trim()))).join(", "));
      expect(r.blur, `${name}: the pinned ground carries no blur — at 72% and without it, content reads through the header`)
        .toMatch(/blur\(14px\)/);
      expect(r.blur, `${name}: the blur lost its saturation`).toMatch(/saturate\(1\.4\)/);
    } else {
      staticc += 1;
      /**
       * ⚠️ TYPE B CARRIES NONE OF THE THREE, ASSERTED STRUCTURALLY. Nothing passes beneath a static
       * masthead — it sits in flow on the page's own ground — so a blur there would be an effect
       * with nothing behind it and a pin shadow would claim a pin that cannot happen. A treatment
       * leaking onto a static page is the same class of fault as the chevron leaking onto Comps.
       */
      expect(alphaOf(r.bg), `${name} is static and its ground is translucent (${r.bg}) — content would read through a header nothing passes behind`).toBe(1);
      expect(r.blur, `${name} is static and carries a backdrop blur`).toBe("none");
      expect(r.shadow, `${name} is static and carries a pin shadow — it never pins`).toBe("none");
    }
  }
  console.log("\n══ CHROME GROUND\n" + lines.join("\n"));
  expect(pinned, "no pinned page was measured").toBeGreaterThan(4);
  expect(staticc, "no static page was measured — the absence claim would be vacuous").toBeGreaterThan(0);
});

test("⚠️ NOTHING READS THROUGH THE CHROME — sampled, with content beneath it", async ({ page }) => {
  /**
   * ⚠️ THE PIXEL, NOT THE RULE. The whole point of a 72% fill plus a blur is that the two TOGETHER
   * are opaque enough; either alone is the fault. So this scrolls content under the slab and reads
   * the painted colour inside the slab's box, then compares it against the same page unscrolled.
   *
   * ⚠️ AND THE PRECONDITION IS THAT SOMETHING IS ACTUALLY BEHIND IT. A sample taken where no content
   * has passed under the chrome is a sample of the chrome over its own page ground, which is opaque
   * whatever the fill does — the vacuous-green shape this repo keeps rediscovering.
   */
  const lines: string[] = [];
  let checked = 0;
  for (const { name, route, cls } of PAGES) {
    await openRoute(page, route, { width: 1440, height: 900 });
    await liftMotionSuppression(page);
    const t = await page.evaluate((c) => {
      const g = [...document.querySelectorAll(`.wpg.${c}`)].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement;
      return g.getAttribute("data-wpg-type");
    }, cls);
    if (t !== "pinned") continue;

    const probe = () => page.evaluate((c) => {
      const g = [...document.querySelectorAll(`.wpg.${c}`)].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement;
      const slab = g.querySelector(".wpg-chrome") as HTMLElement;
      const b = slab.getBoundingClientRect();
      const x = Math.round(b.left + b.width / 2);
      const y = Math.round(b.bottom - 8);
      /* what the browser reports at that point, topmost first — the slab must be above whatever
         has scrolled under it, and nothing from the content may be painting over it */
      const stack = document.elementsFromPoint(x, y).map((e) => (e.className || e.tagName).toString().split(" ")[0].slice(0, 18));
      const sc = g.querySelector(".wpg-scroll") as HTMLElement;
      return { x, y, stack, onScreen: y > 0 && y < window.innerHeight, top: Math.round(sc.scrollTop) };
    }, cls);

    /* scroll the page's primary scroller, whatever it is */
    await page.evaluate((c) => {
      const g = [...document.querySelectorAll(`.wpg.${c}`)].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement;
      const sel = g.getAttribute("data-wpg-settle");
      if (!sel) return;
      const hit = [...g.querySelectorAll(sel)].map((e) => e as HTMLElement).find((e) => e.scrollHeight - e.clientHeight > 2);
      if (hit) hit.scrollTop = 500;
    }, cls);
    await page.waitForTimeout(700);
    const after = await probe();
    checked += 1;
    lines.push(`${name.padEnd(21)} sample (${after.x},${after.y}) → ${after.stack.slice(0, 3).join(" / ")}`);

    /* ⚠️ THE SAMPLE POINT IS PROVED ON SCREEN FIRST — `elementsFromPoint` outside the viewport
       returns an EMPTY array, and an assertion satisfied by `undefined` is this repo's oldest
       vacuous green. */
    expect(after.onScreen, `${name}: the slab's foot is off screen — nothing was sampled`).toBe(true);
    expect(after.stack.length, `${name}: nothing at all at the sample point`).toBeGreaterThan(0);
    /* the chrome is the topmost thing at its own foot — content passes BEHIND it, never over it */
    expect(after.stack[0], `${name}: ${after.stack[0]} is painting over the chrome at its own foot`)
      .toMatch(/^wpg-(chrome|tools|mast)|^wsh/);
  }
  console.log("\n══ SAMPLED BENEATH THE CHROME\n" + lines.join("\n"));
  expect(checked, "no pinned page was sampled").toBeGreaterThan(4);
});

test("⚠️ THE FALLBACKS RESOLVE TO A FULLY OPAQUE FILL — both branches, computed", async ({ page }) => {
  /**
   * ⚠️ ASSERTED AS A COMPUTED VALUE, NOT AS A DECLARATION. `@supports not (backdrop-filter: …)` and
   * `prefers-reduced-transparency` are the two states where the blur is absent and the 72% fill
   * alone IS the fault this pack fixes — so what matters is what the browser resolves in each, not
   * that a rule exists saying so.
   *
   * ⚠️ THE BLUR CANNOT BE DISABLED FROM PLAYWRIGHT, so the `@supports` branch is exercised by asking
   * the browser to resolve that stylesheet rule directly rather than by pretending support is
   * absent. Stated plainly: this reads the rule the fallback WOULD apply, and the reduced-
   * transparency branch is emulated for real.
   */
  await openRoute(page, "/agents", { width: 1440, height: 900 });
  await liftMotionSuppression(page);

  const fallbacks = await page.evaluate(() => {
    const out: { at: string; bg: string }[] = [];
    for (const sheet of [...document.styleSheets]) {
      let rules: CSSRuleList;
      try { rules = sheet.cssRules; } catch { continue; }
      for (const rule of [...rules]) {
        const t = (rule as unknown as { conditionText?: string }).conditionText ?? "";
        if (!/backdrop-filter|reduced-transparency/.test(t)) continue;
        for (const inner of [...((rule as CSSGroupingRule).cssRules ?? [])]) {
          const sel = (inner as CSSStyleRule).selectorText ?? "";
          /* ⚠️ THIS COMPONENT'S RULES ONLY. The first version swept every stylesheet for any
             condition mentioning `backdrop-filter` and asserted it fell back to the window ground —
             which is a claim about OTHER components' rules. It caught one immediately: an unrelated
             `@supports not (backdrop-filter: blur(2px))` falling back to `rgba(30, 26, 22, .62)`,
             correct for whatever it belongs to and none of this case's business. */
          if (!sel.includes("wpg-chrome")) continue;
          const st = (inner as CSSStyleRule).style;
          if (st && st.getPropertyValue("background")) out.push({ at: t, bg: st.getPropertyValue("background") });
        }
      }
    }
    return out;
  });
  console.log("\n══ FALLBACK BRANCHES\n" + fallbacks.map((f) => `  @${f.at} → background: ${f.bg}`).join("\n"));
  /* both `@supports` spellings and the media query — a browser may support one prefix and not the
     other, so a single unprefixed test would leave a WebKit-only engine translucent with no blur */
  /* ⚠️ ONE BLOCK NAMING BOTH SPELLINGS, JOINED BY `or`. Two separate blocks fire when EITHER is
     missing, which put every page on the opaque fill in a browser that supports the blur — measured,
     and the reason this asserts the SHAPE of the condition rather than counting blocks. */
  const supports = fallbacks.filter((f) => /backdrop-filter/.test(f.at));
  expect(supports.length, "the `@supports` fallback is missing").toBe(1);
  expect(supports[0].at, `the fallback condition is \`${supports[0].at}\` — it must require BOTH spellings to be absent, or it fires on a browser that supports one`)
    .toMatch(/not\s*\(\(.*backdrop-filter.*\)\s*or\s*\(.*-webkit-backdrop-filter.*\)\)/);
  expect(fallbacks.some((f) => /reduced-transparency/.test(f.at)),
    "a reader who asked for less transparency still gets the translucent fill").toBe(true);
  for (const f of fallbacks) {
    expect(f.bg, `@${f.at} falls back to ${f.bg} — it must be the fully opaque ground`).toContain("var(--ws-window)");
  }

  /* ⚠️ AND THE REDUCED-TRANSPARENCY BRANCH IS EMULATED FOR REAL, so its COMPUTED value is asserted
     rather than its declaration. */
  await page.emulateMedia({ reducedMotion: null, forcedColors: null, colorScheme: null });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-transparency", value: "reduce" }] }).catch(() => undefined);
  await page.waitForTimeout(300);
  const reduced = await page.evaluate(() => {
    const g = [...document.querySelectorAll(".wpg.agl-wpg")].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement;
    const cs = getComputedStyle(g.querySelector(".wpg-chrome") as HTMLElement);
    return { bg: cs.backgroundColor, blur: cs.backdropFilter || "none" };
  });
  console.log(`  emulated reduced-transparency → bg ${reduced.bg} · blur ${reduced.blur}`);
  const a = /rgba?\(([^)]*)\)/.exec(reduced.bg);
  const alpha = a && a[1].split(",").length > 3 ? parseFloat(a[1].split(",")[3]) : 1;
  expect(alpha, `with reduced transparency the ground computes to ${reduced.bg} — it must be fully opaque`).toBe(1);
  expect(reduced.blur, "with reduced transparency the blur is still applied").toBe("none");
});
