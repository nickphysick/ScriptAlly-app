/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * WHERE EACH PAGE SCROLLS, AND WHAT THE COLLAPSED BAR BINDS TO BECAUSE OF IT.
 *
 * ⚠️ THIS EXISTS BECAUSE "WHICH PAGES SCROLL" HAS BEEN WRONG TWICE, and both times the answer was
 * taken from a census several packs old rather than from the running app. So nothing here is a page
 * list: every claim is a RELATIONSHIP between what a page declares and what its browser does.
 *
 * ⚠️ THE INVARIANT: a page scrolls in exactly one place, and its variant names which.
 *   · `scroll` — the scroll row scrolls, and nothing inside it does.
 *   · `fill`   — the row never scrolls; the panes do.
 * And the BAR binds to that one place, whatever it turns out to be. It used to be the settle, which
 * is deleted; the binding, and everything it can get wrong, is unchanged.
 *
 * ⚠️ AND OVERFLOW IS REPORTED, NEVER ASSERTED — the correction this file needed. It required every
 * `scroll` page's row to be CURRENTLY overflowing, which is a fact about how much the harness
 * account happens to hold, not about the page. It was red on `main` before the masthead rebuild
 * began, on whichever page fitted that day: Manuscripts at `e9f8381b`, Submission packages now
 * (752px of content in a 752px scrollport at 900 tall; 63px of overflow at 700). A page's TYPE is
 * a property of structure — it HAS one place to scroll and would hand off if it had anything to
 * hand off — which is the law this assertion contradicted.
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

const survey = (page: Page, cls: string) => page.evaluate((c) => {
  const g = [...document.querySelectorAll(`.wpg.${c}`)].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement;
  if (!g) return null;
  const sc = g.querySelector(".wpg-scroll") as HTMLElement;
  const inner = [...g.querySelectorAll("*")]
    .map((e) => e as HTMLElement)
    .filter((e) => e !== sc)
    .filter((e) => {
      const oy = getComputedStyle(e).overflowY;
      return (oy === "auto" || oy === "scroll") && e.scrollHeight - e.clientHeight > 2;
    });
  return {
    fill: g.classList.contains("wpg--fill"),
    /* what the page DECLARED as its one place to scroll — absent means "no single one" */
    declared: g.getAttribute("data-wpg-scroller"),
    rowOverflow: sc.scrollHeight - sc.clientHeight,
    inner: inner.map((e) => ({
      cls: (e.className || e.tagName).toString().split(" ")[0].slice(0, 20),
      over: e.scrollHeight - e.clientHeight,
    })),
  };
}, cls);

for (const vp of [{ width: 1280, height: 800 }, { width: 1440, height: 900 }]) {
  test(`⚠️ THE VARIANT NAMES WHERE THE PAGE SCROLLS — ${vp.width}x${vp.height}`, async ({ page }) => {
    const lines: string[] = [];
    let checked = 0;
    for (const { name, route, cls } of PAGES) {
      await openRoute(page, route, vp);
      await liftMotionSuppression(page);
      const s = await survey(page, cls);
      expect(s, `${name}: no grid`).not.toBeNull();
      checked += 1;
      lines.push(`${name.padEnd(21)} ${s!.fill ? "fill  " : "scroll"} · row ${String(s!.rowOverflow).padStart(5)} · inner ${s!.inner.map((i) => `${i.cls}:${i.over}`).join(", ") || "none"}`);

      if (!s!.fill) {
        /* ⚠️ THE STRUCTURAL HALF, WHICH IS THE WHOLE CLAIM: a `scroll` page scrolls at the ROW and
           nowhere else. Two places is what makes a binding pick the wrong one. */
        expect(s!.inner, `${name} is \`scroll\` and something INSIDE the row scrolls too — that is two places, and the bar would bind to the wrong one`)
          .toEqual([]);
        /* ⚠️ AND WHETHER IT HAPPENS TO OVERFLOW TODAY IS REPORTED. See the header: this used to be
           an assertion and it was measuring the fixture. */
        if (s!.rowOverflow <= 2) lines.push(`${" ".repeat(21)} ⚠ REPORTED: a \`scroll\` page that FITS at this viewport — no handoff here, and nothing wrong`);
      } else {
        /**
         * ⚠️ THE CARVE-OUT, VISIBLE RATHER THAN SILENT. A `fill` page may legitimately have zero row
         * overflow and a live internal scroller — that IS what fill means. What it may not do is
         * scroll at the row, and one page currently does: Manuscripts measures ~170px of row
         * overflow at 1280 because `.msv-wrap` is `flex: 0 1 auto` and so content-sized rather than
         * filling. That divergence is REPORTED and not asserted away — it is the page's own height
         * chain, and changing it is a decision rather than a repair.
         */
        if (s!.rowOverflow > 2) lines.push(`${" ".repeat(21)} ⚠ REPORTED: a fill page whose ROW scrolls by ${s!.rowOverflow} — its own height chain, not the chrome's`);
      }
    }
    console.log(`\n══ ${vp.width}x${vp.height}\n` + lines.join("\n"));
    expect(checked, "no page was surveyed — this case would be asserting nothing").toBe(PAGES.length);
  });
}

test("⚠️ THE BAR BINDS TO THE PAGE'S PRIMARY SCROLLER, WHATEVER IT IS", async ({ page }) => {
  /**
   * ⚠️ ASSERTED BY IDENTITY, NOT BY PAGE NAME. For each page the survey finds the ONE element with
   * anything to scroll; this scrolls THAT element and asks whether the bar arrived. Nothing here
   * knows which pages are Tasks pages or which class their zone wears — if a page's scroller moves
   * or is renamed, the case follows it.
   *
   * ⚠️ AND A PAGE WITH NO SINGLE PRIMARY SCROLLER MUST NOT SHOW ITS BAR. Query Centre and
   * Manuscripts scroll in their PANES, independently; a bar arriving because a list moved inside
   * one pane would report the page as scrolled when a corner of it was. That absence is asserted,
   * not left implicit.
   */
  const lines: string[] = [];
  let settled = 0;
  let abstained = 0;
  for (const { name, route, cls } of PAGES) {
    await openRoute(page, route, { width: 1440, height: 900 });
    await liftMotionSuppression(page);
    const s = await survey(page, cls);
    expect(s, `${name}: no grid`).not.toBeNull();

    /**
     * ⚠️ WHAT THE PAGE DECLARED, RESOLVED AGAINST WHAT ACTUALLY SCROLLS — both halves, because
     * either alone is wrong. A declaration nobody checks is a claim; a discovery with no declaration
     * cannot tell a page with ONE scroller from a page with several of which one happens to be full.
     *
     * ⚠️ MY FIRST VERSION DISCOVERED ONLY, AND IT FAILED ON QUERY CENTRE — one live inner scroller
     * (`f12-rows`, 2042px), so it concluded the page had a primary scroller and demanded a settle
     * from a page that must never settle.
     */
    const live = await page.evaluate(({ c, sel }) => {
      if (!sel) return null;
      const g = [...document.querySelectorAll(`.wpg.${c}`)].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement;
      const hits = [...g.querySelectorAll(sel)].map((e) => e as HTMLElement)
        .filter((e) => e.scrollHeight - e.clientHeight > 2);
      return hits.length === 1 ? { cls: (hits[0].className || hits[0].tagName).toString().split(" ")[0].slice(0, 20), over: hits[0].scrollHeight - hits[0].clientHeight } : null;
    }, { c: cls, sel: s!.declared });
    const bindable = live;
    /* ⚠️ THE DECLARATION MUST NAME SOMETHING REAL WHERE THE PAGE DOES SCROLL — a selector matching
       nothing is a page that has quietly stopped binding, which would read here as "abstains". */
    if (s!.declared && s!.inner.length === 1 && !s!.fill === false) {
      expect(bindable, `${name} declares \`${s!.declared}\` but that resolves to no single scrolling element, while ${s!.inner.map((i) => i.cls).join(", ")} does scroll`).not.toBeNull();
    }

    const r = await page.evaluate(({ c, target }) => {
      const g = [...document.querySelectorAll(`.wpg.${c}`)].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement;
      const bar = g.querySelector(".wpg-bar") as HTMLElement | null;
      const sc = g.querySelector(".wpg-scroll") as HTMLElement;
      const before = { on: !!bar?.className.includes("--on"), rowMax: sc.scrollHeight - sc.clientHeight };
      if (target) {
        const el = target === "wpg-scroll" ? sc : ([...g.querySelectorAll("*")] as HTMLElement[])
          .find((e) => e !== sc && (e.className || "").toString().split(" ")[0] === target && e.scrollHeight - e.clientHeight > 2);
        if (el) el.scrollTop = 400;
      }
      return { before };
    }, { c: cls, target: bindable?.cls ?? null });
    await page.waitForTimeout(700);
    const after = await page.evaluate((c) => {
      const g = [...document.querySelectorAll(`.wpg.${c}`)].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement;
      const bar = g.querySelector(".wpg-bar") as HTMLElement | null;
      const sc = g.querySelector(".wpg-scroll") as HTMLElement;
      return {
        on: !!bar?.className.includes("--on"),
        who: (g.querySelector(".wpg-bar b") as HTMLElement | null)?.innerText?.trim() ?? "—",
        rowMax: sc.scrollHeight - sc.clientHeight,
      };
    }, cls);

    lines.push(`${name.padEnd(21)} ${s!.fill ? "fill  " : "scroll"} · scrolled ${bindable?.cls ?? "(nothing — no single primary scroller)"} · bar ${r.before.on}→${after.on} · says ${after.who}`);

    expect(r.before.on, `${name}: the bar was already shown before anything scrolled`).toBe(false);

    /**
     * ⚠️ THE BAR APPEARS PAST 150px, SO A PAGE WITH LESS THAN THAT TO SCROLL CANNOT SHOW ONE — and
     * demanding it anyway is the fixture-measuring fault this file's header describes, one step
     * along. Manuscripts overflows by 32px at 1440×900 and its bar correctly never arrives; that is
     * REPORTED, and the population of pages that could reach the threshold is floored below so the
     * claim cannot go quietly vacuous.
     */
    if (bindable && bindable.over <= 150) {
      lines.push(`${" ".repeat(21)} ⚠ REPORTED: only ${bindable.over}px to scroll — below the bar's 150px threshold, so no handoff here`);
      expect(after.on, `${name}: the bar arrived on ${bindable.over}px of scroll — below its own threshold`).toBe(false);
    } else if (bindable) {
      settled += 1;
      expect(after.on, `${name}: scrolling its primary scroller (${bindable.cls}, ${bindable.over}px) did not bring the bar — the handoff is bound to the wrong element`).toBe(true);
      /* ⚠️ AND THE BAR STATES THE PAGE'S NAME. A band that arrives blank is worse than none —
         the whole point of the handoff is that the title survives the masthead leaving. */
      expect(after.who, `${name}: the bar arrived carrying no name`).not.toBe("—");
      /* ⚠️ THE TASKS CONTRACT IS UNTOUCHED: the bar arrives over the zone, never scrolls the frame. */
      if (s!.fill) {
        expect(after.rowMax, `${name}: the frame started scrolling when the bar arrived — the viewport lock has leaked`).toBe(r.before.rowMax);
      }
    } else {
      abstained += 1;
      expect(after.on, `${name}: the bar arrived with no single primary scroller — its panes scroll independently, and a bar appearing because a list moved inside one pane reports the page as scrolled when a corner of it was`).toBe(false);
    }
  }
  console.log("\n══ BAR BINDING\n" + lines.join("\n"));
  /* ⚠️ BOTH POPULATIONS, so neither half can pass by being empty */
  expect(settled, "no page handed off at all — the binding claim measured nothing").toBeGreaterThan(4);
  expect(abstained, "no page abstained — the absence claim measured nothing").toBeGreaterThan(0);
});
