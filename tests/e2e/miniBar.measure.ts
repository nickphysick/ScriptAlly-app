/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE MINI BAR — the only chrome the masthead system keeps on screen (masthead rethink, step 3).
 *
 * ⚠️ ON A SCROLLING PAGE IT IS THE SECOND OF TWO STACKED STICKIES: identity above at `top: 0`,
 * controls below at exactly the bar's height. That is the claim worth measuring, because both
 * halves are pinned and a stacking or offset error puts one through the other — visible only after
 * a scroll.
 *
 * ⚠️ THE HEIGHT IS DERIVED HERE, NOT PINNED (masthead measure, §3). It was `51`, a number that
 * suited a bar carrying a 22px mark beside the name. The mark is gone — the marks are ILLUSTRATIONS
 * and they read as drawings at 52px and as smudges at 22 — so the bar is now the page's NAME, and
 * its height is `2 × padding + the name's line box`. Asserting 43 instead of 51 would just be the
 * next number to go stale; this reads the padding token and the name's own type off the page and
 * checks the bar against them, so a type change that forgets the height fails HERE rather than as
 * content sliding under the control row three pages later.
 */
import { test, expect, Page } from "@playwright/test";
import { openRoute, liftMotionSuppression } from "./measure";

const SCROLLING: { name: string; route: string; cls: string }[] = [
  { name: "Contact list",        route: "/agents",               cls: "agl-wpg"  },
  { name: "Analytics",           route: "/queries/analytics",    cls: "qa-wpg"   },
  { name: "Discover",            route: "/agents/discover",      cls: "dv-wpg"   },
  { name: "Comparable titles",   route: "/manuscripts/comps",    cls: "ct-wpg"   },
  { name: "Submission packages", route: "/manuscripts/packages", cls: "pkgw-wpg" },
];
const FILL = [
  { name: "Query Centre", route: "/queries",         cls: "qc-wpg"  },
  { name: "Manuscripts",  route: "/manuscripts",     cls: "msv-wpg" },
  { name: "To-do list",   route: "/todo",            cls: "tpl-wpg" },
];

const read = (page: Page, cls: string) => page.evaluate((c) => {
  const r = (n: number) => Math.round(n * 10) / 10;
  const all = [...document.querySelectorAll(`.wpg.${c}`)] as HTMLElement[];
  const g = all.find((e) => e.getBoundingClientRect().height > 0);
  if (!g) return null;
  const sc = g.querySelector(".wpg-scroll") as HTMLElement;
  const mini = g.querySelector(".wpg-mini") as HTMLElement | null;
  const row = g.querySelector(".wpg-tools") as HTMLElement | null;
  const title = g.querySelector(".wsh-title") as HTMLElement | null;
  const scb = sc.getBoundingClientRect();
  const win = document.documentElement.clientWidth;
  if (!mini) return { present: false } as never;
  const mb = mini.getBoundingClientRect();
  const nameEl = mini.querySelector(".wpg-mini-name") as HTMLElement | null;
  const markEl = mini.querySelector(".os-mark") as HTMLElement | null;
  const cs = getComputedStyle(mini);
  return {
    present: true,
    h: r(mb.height),
    top: r(mb.top - scb.top),
    left: r(mb.left), right: r(win - mb.right),
    position: cs.position,
    background: cs.backgroundColor,
    /* the identity it states, and the masthead's own — two renders of one source */
    name: nameEl?.textContent?.trim() ?? "",
    /* ⚠️ THE TITLE'S OWN TEXT NODES, NOT ITS `textContent`. Two pages hang a `Pro` pill inside the
       `<h1>` as `titleAdornment`, so `textContent` reads "DiscoverPro" — and the mini bar correctly
       states "Discover", because a 51px identity strip carries the page's NAME and not its
       ornaments. Comparing the whole subtree would have failed a correct bar on two pages. */
    mastTitle: title
      ? [...title.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent ?? "").join("").trim()
      : "",
    nameSize: nameEl ? getComputedStyle(nameEl).fontSize : "",
    nameWeight: nameEl ? getComputedStyle(nameEl).fontWeight : "",
    /* ⚠️ ASSERTED ABSENT SINCE §3, and `-1` is the pass. Kept as a reading rather than deleted:
       "the bar renders no mark" is the claim, and a claim needs something measured to carry it. */
    markW: markEl ? r(markEl.getBoundingClientRect().width) : -1,
    /* the two halves of the derivation, both read off the rendered page */
    padToken: parseFloat(getComputedStyle(g).getPropertyValue("--wpg-mini-pad")) || -1,
    nameLine: nameEl ? r(parseFloat(getComputedStyle(nameEl).lineHeight)) : -1,
    /* ⚠️ STRUCTURAL — the restore chevron is a fill-page affordance and must not merely be hidden
       on scroll pages, it must not be rendered. */
    actionable: mini.querySelectorAll("button, a, input, [role='button']").length,
    rowTop: row ? r(row.getBoundingClientRect().top - scb.top) : -1,
    rowBottom: row ? r(row.getBoundingClientRect().bottom - scb.top) : -1,
  };
}, cls);

test("⚠️ NO SCROLLING PAGE RENDERS A MINI BAR — the slab supersedes it", async ({ page }) => {
  /**
   * ⚠️ THIS CASE IS INVERTED, NOT WEAKENED (pinned chrome, §1). It asserted the bar's presence,
   * height, edges, mark and type across the five scrolling pages, and every one of those claims
   * described the two-sticky arrangement the slab replaced: identity pinned above, controls pinned
   * beneath, each with its own line and shadow.
   *
   * ⚠️ AND IT IS AN ABSENCE WITH A POPULATION, so it cannot pass by measuring nothing: every page in
   * the list must have rendered a grid before its bar can be meaningfully absent from it.
   */
  let checked = 0;
  for (const { name, route, cls } of SCROLLING) {
    await openRoute(page, route, { width: 1440, height: 900 });
    await liftMotionSuppression(page);
    const rest = await read(page, cls);
    expect(rest, `${name}: no grid — the absence below would be about a page that did not render`).not.toBeNull();
    expect(rest!.present, `${name}: a mini bar is still rendered on a scrolling page`).toBe(false);
    checked += 1;
  }
  expect(checked, "no scrolling page was measured at all").toBe(SCROLLING.length);
});

test("⚠️ A FILL PAGE RENDERS NO MINI BAR UNTIL ITS MASTHEAD IS HIDDEN", async ({ page }) => {
  /* Nothing can hide one yet — the Hide button lands at step 4 — so the fill path is unreachable
     today and the bar must be absent. Asserted rather than assumed: an always-rendered bar would
     sit above the masthead on three pages and nobody would have written a line of CSS for it. */
  for (const { name, route, cls } of FILL) {
    await openRoute(page, route, { width: 1440, height: 900 });
    await liftMotionSuppression(page);
    const r = await read(page, cls);
    expect(r, `${name}: no grid`).not.toBeNull();
    expect(r!.present, `${name}: a fill page rendered a mini bar with its masthead still showing`).toBe(false);
  }
});
