/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE TOP HEM MUST NOT WASH THE STICKY CHROME (masthead rethink, step 1).
 *
 * The hem is a grid item pinned to the scroll row's top edge; the control row is sticky at `top: 0`
 * inside that same row. So the gradient was being drawn ON the anchored controls — a fade whose
 * entire job is to say "content is passing UNDER this" painted over the thing it passes under.
 *
 * ⚠️ THE ASSERTION IS AGAINST THE MEASURED STUCK HEIGHT, NEVER A CONSTANT. The sticky chrome is the
 * control row alone today and the mini bar plus the control row once that lands, and it differs by
 * page anyway because control rows hold different things. A literal would be right for one page on
 * one day, and this file would need editing to survive its own pack.
 */
import { test, expect, Page } from "@playwright/test";
import { openRoute, liftMotionSuppression } from "./measure";

/** the five scrolling pages — a fill page has no hems, by construction */
const SCROLLING: { name: string; route: string; cls: string }[] = [
  { name: "Contact list",        route: "/agents",               cls: "agl-wpg"  },
  { name: "Analytics",           route: "/queries/analytics",    cls: "qa-wpg"   },
  { name: "Discover",            route: "/agents/discover",      cls: "dv-wpg"   },
  { name: "Comparable titles",   route: "/manuscripts/comps",    cls: "ct-wpg"   },
  { name: "Submission packages", route: "/manuscripts/packages", cls: "pkgw-wpg" },
];

const read = (page: Page, cls: string) => page.evaluate((c) => {
  const r = (n: number) => Math.round(n * 10) / 10;
  /* by class AND displayed — `.tpl-wpg` is shared by three pages, and "first with a box" changes
     subject the moment anything navigates */
  const all = [...document.querySelectorAll(`.wpg.${c}`)] as HTMLElement[];
  const g = all.find((e) => e.getBoundingClientRect().height > 0);
  if (!g) return null;
  const sc = g.querySelector(".wpg-scroll") as HTMLElement;
  const hem = g.querySelector(".wpg-hem--top") as HTMLElement | null;
  const row = g.querySelector(".wpg-tools") as HTMLElement | null;
  const mini = g.querySelector(".wpg-mini") as HTMLElement | null;
  if (!hem) return { noHem: true } as never;
  const scb = sc.getBoundingClientRect();
  const hb = hem.getBoundingClientRect();
  return {
    hemOn: hem.classList.contains("on"),
    hemTop: r(hb.top - scb.top),
    hemBottom: r(hb.bottom - scb.top),
    hemH: r(hb.height),
    /* what the component measured and published — the offset the hem is supposed to take */
    published: getComputedStyle(g).getPropertyValue("--wpg-stuck-h").trim(),
    hasRow: !!row,
    /* the mini bar's rendered height — what the control row is supposed to be stuck beneath */
    miniH: r(mini?.getBoundingClientRect().height ?? -1),
    rowTop: row ? r(row.getBoundingClientRect().top - scb.top) : -1,
    rowBottom: row ? r(row.getBoundingClientRect().bottom - scb.top) : -1,
    /* ⚠️ THE STUCK CHROME'S HEIGHT, MEASURED HERE TOO AND FROM THE OTHER DIRECTION. The component
       publishes `offsetHeight`; this reads the rendered box. If a future sticky element joins the
       chrome and the component forgets to include it, these two disagree and the case fails. */
    /**
     * ⚠️ THE STUCK CHROME'S FOOT IS THE LAST STUCK THING, WHICHEVER THAT IS — the control row where
     * there is one, the folded bar where there is not. Returning `0` for a page with no row made
     * this disagree with a correctly-published `--wpg-stuck-h` of 42.69, which reads as the
     * component mis-measuring itself rather than as the probe having nothing to look at.
     */
    /**
     * ⚠️ THE SLAB'S FOOT (pinned chrome, §1). Masthead and control row are one sticky block now, so
     * the stuck chrome has ONE bottom edge and there is nothing to choose between. This used to pick
     * the last of two independently sticky elements.
     */
    chromeBottom: (() => {
      const slab = g.querySelector(".wpg-chrome") as HTMLElement | null;
      return slab ? r(slab.getBoundingClientRect().bottom - scb.top) : 0;
    })(),
  };
}, cls);

test("the top hem starts below the stuck chrome, on every scrolling page", async ({ page }) => {
  const lines: string[] = [];
  for (const { name, route, cls } of SCROLLING) {
    await openRoute(page, route, { width: 1440, height: 900 });
    await liftMotionSuppression(page);

    const rest = await read(page, cls);
    expect(rest, `${name}: no grid, or no top hem`).not.toBeNull();

    /* ⚠️ THE PRECONDITION: the page must actually scroll, and the row must actually stick, or the
       overlap this case forbids is one the page can never reach and the green means nothing. */
    const canScroll = await page.evaluate((c) => {
      const g = [...document.querySelectorAll(`.wpg.${c}`)].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement;
      const sc = g.querySelector(".wpg-scroll") as HTMLElement;
      return sc.scrollHeight - sc.clientHeight;
    }, cls);
    if (canScroll <= 10) { lines.push(`\n══ ${name}: does not overflow at 1440×900 — sticking not exercised`); continue; }

    await page.mouse.move(700, 500);
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(450);
    const s = (await read(page, cls))!;

    lines.push(
      `\n══ ${name}`,
      `   published --wpg-stuck-h ${s.published} · row ${s.rowTop}→${s.rowBottom} · hem ${s.hemTop}→${s.hemBottom} (h ${s.hemH}) · on=${s.hemOn}`,
    );

    expect(s.hemOn, `${name}: the top hem is not showing after scrolling — nothing to overlap`).toBe(true);
    /**
     * ⚠️ A CONTROL ROW IS NO LONGER UNIVERSAL, AND THE OVERLAP CLAIM DOES NOT DEPEND ON ONE. This
     * demanded a row on every scrolling page and failed on Submission packages, which lost its row
     * to another stream's restructure — a page behaving correctly, reported as broken.
     *
     * The subject here is the hem against the STUCK CHROME, whatever that chrome turns out to be: a
     * bar and a row on most pages, a bar alone on that one. The mini bar is the part that is always
     * there, so it is what stays asserted; the row's position is asserted only where there is a row.
     */
    expect(s.chromeBottom, `${name}: the chrome slab has no foot — there is nothing for the hem to clear`).toBeGreaterThan(0);
    /* ⚠️ AMENDED (masthead rethink, step 3): the control row is stuck BENEATH the mini bar now, not
       at the scroller's top — two stacked stickies, identity above and controls below. Asserted
       against the bar's MEASURED height rather than 51, so the pair stays coupled here exactly as
       the shared token couples them in the stylesheet. */
    /* ⚠️ NOTHING TO STACK ANY MORE (pinned chrome, §1). The control row was asserted to sit beneath
       the mini bar because they were two stacked stickies; they are one slab, so the row's position
       inside it is the slab's own composition and not a clearance anything has to agree about. */

    /* ⚠️ THE COMPONENT'S MEASUREMENT AND THE RENDERED BOX MUST AGREE. Two derivations of one figure,
       from opposite directions — `offsetHeight` in the component, the rendered rect here. */
    expect(parseFloat(s.published), `${name}: the published stuck height (${s.published}) disagrees with the rendered chrome (${s.chromeBottom}px)`)
      .toBeCloseTo(s.chromeBottom, 0);

    /* ⚠️ THE CLAIM: not one gradient pixel inside the stuck chrome's box — measured against the
       chrome's FOOT rather than the row's, since a page without a row reads `rowBottom: -1` and
       `hemTop >= -1.5` is true of everything. The sentinel would have turned the claim into a
       tautology on exactly the page it stopped applying to. */
    expect(s.hemTop, `${name}: the hem starts at ${s.hemTop} but the stuck chrome ends at ${s.chromeBottom} — it is washing the anchored chrome`)
      .toBeGreaterThanOrEqual(s.chromeBottom - 0.5);
  }
  console.log(lines.join("\n"));
});
