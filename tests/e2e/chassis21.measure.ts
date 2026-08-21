/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * chassis21 — the unreachable 21px at the foot of every Tasks page (tasks-chassis pack, Phase 0).
 *
 * ⚠️ THE SHAPE OF THE FAULT IS THE CLUE. A CONSTANT offset — the same 21px at three viewport
 * heights and on three pages — cannot be a proportional or content-driven error. It is a
 * fixed-size contribution counted once too many or once too few: a bar height double-counted in a
 * `calc()`, padding on an ancestor outside the scrolling element, a border added to a content-box
 * height, or a margin escaping its formatting context. This walks the chain and records enough of
 * each box to tell those four apart.
 *
 * ⚠️ IT READS AUTHORED RULES, NOT JUST COMPUTED VALUES. `getComputedStyle` resolves `calc()` to a
 * pixel number, which is exactly the information needed to spot the arithmetic — so each element
 * also reports every stylesheet rule that matched it and mentions a height or a `calc`.
 *
 * ⚠️ AND IT WALKS UP FROM `.wpg-scroll`, NEVER QUERYING BY CLASS. Every workspace page stays
 * MOUNTED, so `document.querySelector(".wpg-scroll")` can return a hidden page's copy, which
 * measures 0. That has already produced one false finding in this repo.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

const PAGES = ["/todo", "/todo/calendar", "/todo/noteboard"];

test("chassis — where the chain first exceeds the viewport", async ({ page }) => {
  const out: string[] = [];

  for (const route of PAGES) {
    await openRoute(page, route, { width: 1440, height: 900 });
    const r = await page.evaluate(() => {
      const px = (n: number) => Math.round(n * 100) / 100;

      /* the visible page's scroller: walk up from it, so a hidden page's copy cannot be picked */
      const scroller = Array.from(document.querySelectorAll(".wpg-scroll"))
        .find((e) => (e as HTMLElement).getBoundingClientRect().height > 0) as HTMLElement | undefined;
      if (!scroller) return null;

      const chain: HTMLElement[] = [];
      for (let el: HTMLElement | null = scroller; el; el = el.parentElement) chain.unshift(el);

      /** every authored rule that matched this element and says anything about height. */
      const authored = (el: HTMLElement): string[] => {
        const hits: string[] = [];
        for (const sheet of Array.from(document.styleSheets)) {
          let rules: CSSRuleList;
          try { rules = (sheet as CSSStyleSheet).cssRules; } catch { continue; }
          for (const rule of Array.from(rules)) {
            const sr = rule as CSSStyleRule;
            if (!sr.selectorText || !sr.style) continue;
            let matches = false;
            try { matches = el.matches(sr.selectorText); } catch { continue; }
            if (!matches) continue;
            for (const prop of ["height", "min-height", "max-height", "padding", "padding-top",
                                "padding-bottom", "margin", "margin-top", "margin-bottom", "top", "inset"]) {
              const v = sr.style.getPropertyValue(prop);
              if (v && (v.includes("calc") || v.includes("vh") || /\d/.test(v))) {
                hits.push(`${sr.selectorText} { ${prop}: ${v} }`);
              }
            }
          }
        }
        return Array.from(new Set(hits));
      };

      return {
        vh: window.innerHeight,
        docOverflow: document.documentElement.scrollHeight - document.documentElement.clientHeight,
        chain: chain.map((el) => {
          const b = el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          const cls = (el.className || "").toString().split(/\s+/).filter(Boolean).slice(0, 3).join(".");
          return {
            tag: `${el.tagName.toLowerCase()}${cls ? "." + cls : ""}`,
            top: px(b.top), bottom: px(b.bottom), h: px(b.height),
            pad: `${cs.paddingTop}/${cs.paddingBottom}`,
            bor: `${cs.borderTopWidth}/${cs.borderBottomWidth}`,
            mar: `${cs.marginTop}/${cs.marginBottom}`,
            box: cs.boxSizing, disp: cs.display, ovY: cs.overflowY,
            pos: cs.position, flex: cs.flex, minH: cs.minHeight,
            /* the child that overflows THIS box, if any */
            over: px(b.bottom - (el.parentElement?.getBoundingClientRect().bottom ?? b.bottom)),
            rules: authored(el),
          };
        }),
      };
    });

    out.push(`\n════════ ${route} @1440×900 ════════`);
    if (!r) { out.push("  no visible .wpg-scroll"); continue; }
    out.push(`  viewport ${r.vh}px · document overflow ${r.docOverflow}`);
    out.push(`  ${"element".padEnd(30)} ${"top".padStart(8)} ${"bottom".padStart(8)} ${"h".padStart(8)}  pad  bor  box  ovY`);
    for (const e of r.chain) {
      const flag = e.bottom > r.vh ? "  ⚠️ PAST VIEWPORT" : "";
      out.push(`  ${e.tag.padEnd(30)} ${String(e.top).padStart(8)} ${String(e.bottom).padStart(8)} ${String(e.h).padStart(8)}  ${e.pad}  ${e.bor}  ${e.box}  ${e.ovY}${flag}`);
      if (e.over > 0.5) out.push(`      ↳ overflows its parent's bottom by ${e.over}px`);
    }
    out.push("  — authored height rules on the chain —");
    for (const e of r.chain) for (const rule of e.rules) out.push(`      ${e.tag}: ${rule}`);
  }

  console.log(out.join("\n"));
});

/**
 * Phase 2 — the fix, across every page and height, plus the two laws it must not have broken.
 */
test("chassis — the scroller ends inside the viewport, everywhere", async ({ page }) => {
  const HEIGHTS = [800, 900, 1000];
  const rows: string[] = [];

  for (const route of PAGES) {
    for (const height of HEIGHTS) {
      await openRoute(page, route, { width: 1440, height });
      const r = await page.evaluate(() => {
        const scroller = Array.from(document.querySelectorAll(".wpg-scroll"))
          .find((e) => (e as HTMLElement).getBoundingClientRect().height > 0) as HTMLElement | undefined;
        const main = Array.from(document.querySelectorAll(".ws-main"))
          .find((e) => (e as HTMLElement).getBoundingClientRect().height > 0) as HTMLElement | undefined;
        const b = scroller?.getBoundingClientRect();
        const m = main?.getBoundingClientRect();
        return {
          vh: window.innerHeight,
          scrollerBottom: b ? Math.round(b.bottom * 100) / 100 : null,
          mainBottom: m ? Math.round(m.bottom * 100) / 100 : null,
          mainTop: m ? Math.round(m.top * 100) / 100 : null,
          docOverflow: document.documentElement.scrollHeight - document.documentElement.clientHeight,
          /* ⚠️ THE VIEWPORT LOCK'S OWN LAW: the designated zone must still SCROLL when it
             overflows — asserting page-scroll is zero would pass on a page that scrolls nothing. */
          zoneScrolls: scroller ? scroller.scrollHeight > scroller.clientHeight : false,
          zoneOverflowY: scroller ? getComputedStyle(scroller).overflowY : null,
        };
      });
      const past = r.scrollerBottom !== null ? Math.round((r.scrollerBottom - r.vh) * 100) / 100 : null;
      rows.push(`  ${route.padEnd(17)} @${String(r.vh).padStart(4)}  main ${String(r.mainTop).padStart(6)}→${String(r.mainBottom).padStart(7)}  scroller↓ ${String(r.scrollerBottom).padStart(7)}  past ${String(past).padStart(6)}  docOv ${r.docOverflow}  zoneScrolls ${r.zoneScrolls}`);

      expect(r.scrollerBottom, `${route} @${r.vh}: the scroller ends past the viewport`)
        .toBeLessThanOrEqual(r.vh);
      expect(r.docOverflow, `${route} @${r.vh}: the document itself started scrolling`).toBe(0);
      expect(r.zoneOverflowY, `${route} @${r.vh}: the zone stopped being the scroller`).toBe("auto");
    }
  }
  console.log("\n" + rows.join("\n"));
});

test("chassis — the Calendar's foot control is reachable", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  const r = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll(".cal-focus button"))
      .find((b) => /Open the list/i.test(b.textContent ?? "")) as HTMLElement | undefined;
    if (!btn) return null;
    const b = btn.getBoundingClientRect();
    /* ⚠️ THE RECT MUST BE ON SCREEN BEFORE ASKING WHAT OWNS ITS PIXELS — elementsFromPoint outside
       the viewport returns [], which satisfies a naive stacking check by returning nothing. */
    const onScreen = b.top >= 0 && b.bottom <= window.innerHeight;
    const stack = onScreen
      ? document.elementsFromPoint(b.left + b.width / 2, b.top + b.height / 2)
          .slice(0, 2).map((e) => `${e.tagName.toLowerCase()}.${(e.className || "").toString().split(" ")[0]}`)
      : ["OFF-SCREEN"];
    return { bottom: Math.round(b.bottom), vh: window.innerHeight, onScreen, stack };
  });
  console.log(`  "Open the list": ${JSON.stringify(r)}`);
  expect(r, "the foot control is not rendered").not.toBeNull();
  expect(r!.onScreen, `the foot control is still below the fold (bottom ${r!.bottom} vs ${r!.vh})`).toBe(true);
});

/**
 * ⚠️ THE VIEWPORT LOCK'S LAW, ASSERTED ON THE ELEMENT THAT ACTUALLY SCROLLS.
 *
 * The law is that a page's content scrolls INSIDE the page and the document stays put. Two earlier
 * versions of this probe named a class and proved nothing: `.wpg-scroll` never overflows on a
 * `fill` page BY DESIGN (measured 328/328), and `.tpl-zone` resolved to a mounted-but-hidden
 * page's 0/0 copy. `/todo` actually scrolls `.l-body` at 2325/426. So the zone is FOUND — the
 * deepest visible descendant of `.ws-main` that declares a scroller and genuinely overflows — and
 * the precondition is asserted before the claim, so an empty result fails instead of passing.
 */
test("chassis — the page's content still scrolls inside the page, not the document", async ({ page }) => {
  for (const route of PAGES) {
    await openRoute(page, route, { width: 1440, height: 900 });
    const r: any = await page.evaluate(async () => {
      const main = Array.from(document.querySelectorAll(".ws-main"))
        .find((e) => (e as HTMLElement).getBoundingClientRect().height > 0) as HTMLElement | undefined;
      if (!main) return { none: true };
      const zones = Array.from(main.querySelectorAll("*"))
        .map((e) => e as HTMLElement)
        .filter((e) => e.getBoundingClientRect().height > 0
          && getComputedStyle(e).overflowY === "auto"
          && e.scrollHeight > e.clientHeight + 1);
      if (!zones.length) return { none: true };
      const zone = zones[zones.length - 1];
      const before = zone.scrollTop;
      zone.scrollTop = 120;
      await new Promise((res) => requestAnimationFrame(() => res(null)));
      const moved = zone.scrollTop;
      zone.scrollTop = before;
      return {
        cls: (zone.className || "").toString().split(" ").slice(0, 2).join("."),
        sh: zone.scrollHeight, ch: zone.clientHeight, moved,
        docOverflow: document.documentElement.scrollHeight - document.documentElement.clientHeight,
        bottom: Math.round(zone.getBoundingClientRect().bottom), vh: window.innerHeight,
      };
    });
    console.log(`  ${route.padEnd(17)} zone=${r.cls ?? "NONE"}  ${r.sh}/${r.ch}  scrolled to ${r.moved}  docOv ${r.docOverflow}  bottom ${r.bottom}/${r.vh}`);
    if (r.none) {
      /* ⚠️ AN UNREACHABLE PRECONDITION IS REPORTED, NOT PASSED. This page's content does not
         overflow at this size with this account's data, so "the zone takes the scroll" cannot be
         observed here — and asserting it anyway would go green having tested nothing, which is the
         vacuous-check family this repo keeps re-learning. The weaker claim that IS true is still
         asserted below: the document does not scroll. */
      const doc = await page.evaluate(() =>
        document.documentElement.scrollHeight - document.documentElement.clientHeight);
      console.log(`      ↳ no zone overflows here; asserting only that the document stays put (${doc})`);
      expect(doc, `${route}: the document scrolled`).toBe(0);
      continue;
    }
    expect(r.moved, `${route}: the zone did not take the scroll`).toBeGreaterThan(0);
    expect(r.docOverflow, `${route}: the DOCUMENT scrolled instead of the page's zone`).toBe(0);
    expect(r.bottom, `${route}: the zone ends past the fold`).toBeLessThanOrEqual(r.vh);
  }
});
