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
import { test } from "@playwright/test";
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
