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

test("the mini bar stacks under nothing and over the control row, on every scrolling page", async ({ page }) => {
  const lines: string[] = [];
  const seen: { name: string; h: number; edges: string; markW: number; size: string; weight: string }[] = [];

  for (const { name, route, cls } of SCROLLING) {
    await openRoute(page, route, { width: 1440, height: 900 });
    await liftMotionSuppression(page);

    const rest = await read(page, cls);
    expect(rest, `${name}: no grid`).not.toBeNull();
    expect(rest!.present, `${name}: no mini bar rendered on a scrolling page`).toBe(true);
    /* ⚠️ AT REST IT COSTS NOTHING — the masthead is the page's identity until it leaves. */
    expect(rest!.h, `${name}: the mini bar has height before anything scrolled`).toBe(0);

    await page.mouse.move(700, 500);
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(450);
    const s = (await read(page, cls))!;

    lines.push(`${name.padEnd(21)} bar ${s.h} @top ${s.top} · ${s.left}/${s.right} · "${s.name}" ${s.nameSize}/${s.nameWeight} · mark ${s.markW} · row @${s.rowTop}→${s.rowBottom} · actionable ${s.actionable}`);

    /* ⚠️ TWO DERIVATIONS AGAINST EACH OTHER, never against a literal. The bar's measured height
       must equal the padding token plus the name's own line box — so the day someone changes the
       type and forgets the token, this fails naming both numbers. */
    const derived = s.padToken * 2 + s.nameLine;
    expect(s.padToken, `${name}: --wpg-mini-pad does not resolve — the height is not derived from anything`).toBeGreaterThan(0);
    expect(s.h, `${name}: the bar measures ${s.h}px, but padding ${s.padToken}×2 + line box ${s.nameLine} derives ${derived}`)
      .toBeCloseTo(derived, 0);
    expect(s.top, `${name}: the mini bar is not pinned to the scroller's top`).toBeLessThanOrEqual(0.5);
    /* the two stacked stickies: controls begin exactly where identity ends */
    expect(s.rowTop, `${name}: the control row is at ${s.rowTop}, and the bar ends at ${s.h}`).toBeCloseTo(s.h, 0);
    /* ⚠️ THE BAR AND THE MASTHEAD STATE THE SAME PAGE — two renders of one source, asserted against
       each other rather than against a literal, so a page that renamed one and not the other fails. */
    expect(s.name, `${name}: the mini bar says "${s.name}" and the masthead says "${s.mastTitle}"`).toBe(s.mastTitle);
    expect(s.name.length, `${name}: the mini bar states no name`).toBeGreaterThan(0);
    /* ⚠️ THE FOLDED BAR CARRIES THE NAME ALONE (masthead measure, §3) — no mark, on any page. */
    expect(s.markW, `${name}: the mini bar draws a ${s.markW}px mark — at that size an illustration is a smudge, not a smaller drawing`).toBe(-1);
    /* ⚠️ NOT MERELY HIDDEN — not rendered. */
    expect(s.actionable, `${name}: the mini bar carries ${s.actionable} control(s) on a scrolling page`).toBe(0);
    expect(s.background, `${name}: the mini bar is transparent — content would run through the page's own name`).not.toContain("rgba(0, 0, 0, 0)");

    seen.push({ name, h: s.h, edges: `${s.left}/${s.right}`, markW: s.markW, size: s.nameSize, weight: s.nameWeight });
  }
  console.log("\n" + lines.join("\n"));

  /* page against page, never constants */
  for (const k of ["h", "edges", "markW", "size", "weight"] as const) {
    const vals = new Set(seen.map((x) => String(x[k])));
    expect([...vals], `the mini bar's ${k} differs page to page: ${seen.map((x) => `${x.name} ${x[k]}`).join(", ")}`).toHaveLength(1);
  }
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
