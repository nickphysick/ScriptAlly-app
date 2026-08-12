/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE MEASUREMENT HELPER — what replaces the harness pattern.
 *
 * ⚠️ EVERY NUMBER COMES FROM THE RUNNING APP. Nothing here reconstructs markup or hand-picks a
 * stylesheet. The four harness failures this exists to end all shared one shape: the harness
 * agreed with itself while describing a page the app never serves.
 *
 * ⚠️ TRANSITIONS ARE SUPPRESSED BEFORE ANYTHING IS READ, AND THAT NEEDS A STYLESHEET RULE. An
 * inline `style.transition = "none"` cannot reach a PSEUDO-ELEMENT, and the header's hairline is
 * `::after` — read mid-transition it reports opacity 0 in both states and looks like a dead rule.
 * That trap has cost time three times.
 */
import { Page, expect } from "@playwright/test";

/**
 * ⚠️⚠️ THIS BROWSER CANNOT PRODUCE A CLASSIC SCROLLBAR, AND EVERY REPORT MUST SAY SO.
 *
 * Measured, not assumed — a plain `overflow: scroll` probe returns 0px under all of:
 *   · `--disable-features=OverlayScrollbars` (singular and plural)
 *   · `--hide-scrollbars=false`
 *   · the full `chromium` channel instead of the headless shell
 *   · headed rather than headless
 *   · an injected `*::-webkit-scrollbar { width: 15px }`
 *   · `scrollbar-gutter: stable`, `stable both-edges`, and `scrollbar-width: auto`
 *
 * Chromium follows the macOS "show scroll bars" setting and no page-level or flag-level override
 * reaches it. So the ONE fault class this tool cannot reproduce is the one that hid for a full
 * session: a bar that consumes content width. Everything else — widths, heights, centres,
 * computed styles, pseudo-elements, scroll geometry — is real.
 *
 * ⚠️ WHICH IS WHY `scrollbarWidth()` IS REPORTED RATHER THAN ASSERTED AWAY. A run that says `0px —
 * OVERLAY` is telling the truth about its own limits. Pretending otherwise would make this the
 * fifth tool in one day to agree with itself while measuring something the app does not do. For
 * that specific question the authority is a console run in Nick's own browser.
 */
const FORCE_CLASSIC_SCROLLBARS = `
  *::-webkit-scrollbar { width: 15px; height: 15px; }
  *::-webkit-scrollbar-track { background: #f6f1e9; }
  *::-webkit-scrollbar-thumb { background: #c9bfb2; }`;  /* attempted; measured ineffective — see above */

/** Injected once per page. `!important` because it must beat the shorthand that set them running. */
const KILL_MOTION = `
  *, *::before, *::after {
    transition: none !important;
    animation: none !important;
    scroll-behavior: auto !important;
  }`;

export interface Box { x: number; y: number; w: number; h: number }
export interface ChildReading {
  tag: string; cls: string; h: number; centreDelta: number; offCentre: boolean;
}
export interface HeaderReading {
  page: string;
  state: "REST" | "WORKING";
  rowH: number;
  headerH: number;
  headerTopInsetInRow: number;
  rowPadding: string;
  wrapH: number;
  hairline: { leftInset: number; rightInset: number; height: string; opacity: string };
  children: ChildReading[];
  scrollbarMode: "classic" | "overlay";
}

const round = (n: number) => Math.round(n * 10) / 10;

/** Open a route on the deployed dev site and wait for the workspace to be real, not a skeleton. */
export async function openRoute(page: Page, route: string, viewport?: { width: number; height: number }) {
  if (viewport) await page.setViewportSize(viewport);
  await page.goto(route);
  await page.addStyleTag({ content: FORCE_CLASSIC_SCROLLBARS });
  await page.addStyleTag({ content: KILL_MOTION });
  /* the shell first, then the page's own grid if it has one */
  await expect(page.locator("#app-stage-scroll, .ws-panel, .sv2-app").first()).toBeVisible({ timeout: 30_000 });
  await page.waitForLoadState("networkidle").catch(() => { /* long-poll listeners never idle */ });
  await page.addStyleTag({ content: KILL_MOTION });
}

/**
 * ⚠️ CONFIRM THE SCROLLBAR MODE RATHER THAN TRUSTING THE FLAG. Overlay scrollbars take no layout
 * width, which is how a 15px content loss survived a session — every measurement on that machine
 * agreed. This asks a scrolling element how much width its bar actually took.
 */
export async function scrollbarWidth(page: Page): Promise<number> {
  await page.addStyleTag({ content: FORCE_CLASSIC_SCROLLBARS }).catch(() => { /* already present */ });
  return page.evaluate(() => {
    const d = document.createElement("div");
    d.style.cssText = "position:absolute;top:-9999px;width:100px;height:100px;overflow:scroll";
    document.body.appendChild(d);
    const w = d.offsetWidth - d.clientWidth;
    d.remove();
    return w;
  });
}

/**
 * Read the header in ONE state. Forces the class on or off, measures, and leaves the DOM as it
 * found it — so a caller can read both states without a reload and without the page drifting.
 */
export async function readHeader(page: Page, label: string, state: "REST" | "WORKING"): Promise<HeaderReading | null> {
  return page.evaluate(({ label, state }) => {
    const grid = document.querySelector(".wpg");
    if (!grid) return null;
    const row = grid.querySelector(".wpg-plate") as HTMLElement;
    const wrap = grid.querySelector(".wsh-wrap") as HTMLElement | null;
    const hdr = grid.querySelector(".wsh") as HTMLElement;
    const inner = grid.querySelector(".wsh-row") as HTMLElement;
    if (!row || !hdr || !inner) return null;

    const was = row.classList.contains("wpg-plate--working");
    const want = state === "WORKING";
    row.classList.toggle("wpg-plate--working", want);
    hdr.classList.toggle("wsh--scrolled", want);
    wrap?.classList.toggle("wsh-wrap--scrolled", want);
    void (grid as HTMLElement).offsetHeight;

    const r = (n: number) => Math.round(n * 10) / 10;
    const R = row.getBoundingClientRect();
    const H = hdr.getBoundingClientRect();
    const hc = H.top + H.height / 2;
    const children = [...inner.children].map((el) => {
      const b = el.getBoundingClientRect();
      const d = r(b.top + b.height / 2 - hc);
      return {
        tag: el.tagName.toLowerCase(),
        cls: (el.getAttribute("class") || "—"),
        h: r(b.height),
        centreDelta: d,
        offCentre: Math.abs(d) > 0.5,
      };
    });
    /* the hairline is `left:0;right:0` inside .wpg-plate, so it spans that element's padding box */
    const after = getComputedStyle(row, "::after");
    const out = {
      page: label,
      state,
      rowH: r(R.height),
      headerH: r(H.height),
      headerTopInsetInRow: r(H.top - R.top),
      rowPadding: getComputedStyle(row).padding,
      wrapH: wrap ? r(wrap.getBoundingClientRect().height) : -1,
      hairline: {
        leftInset: r(R.left),
        rightInset: r(document.documentElement.clientWidth - R.right),
        height: after.height,
        opacity: after.opacity,
      },
      children,
      scrollbarMode: (document.documentElement.clientWidth < window.innerWidth ? "classic" : "overlay") as "classic" | "overlay",
    };

    row.classList.toggle("wpg-plate--working", was);
    hdr.classList.toggle("wsh--scrolled", was);
    wrap?.classList.toggle("wsh-wrap--scrolled", was);
    return out;
  }, { label, state });
}

/** Scroll geometry, read in the RESTING state — which is what `safeToStrip()` sees. */
export async function readScroll(page: Page) {
  return page.evaluate(() => {
    const grid = document.querySelector(".wpg");
    const scroll = grid?.querySelector(".wpg-scroll") as HTMLElement | null;
    const zone = document.querySelector(".tpl-zone") as HTMLElement | null;
    const cs = getComputedStyle(document.documentElement);
    const tok = (n: string) => parseFloat(cs.getPropertyValue(n)) || 0;
    const reclaim = tok("--wsh-plate-h") + tok("--wsh-plate-gap") - tok("--wsh-plate-h-scrolled");
    const of = (el: HTMLElement | null) => el
      ? { scrollHeight: el.scrollHeight, clientHeight: el.clientHeight, overflow: el.scrollHeight - el.clientHeight }
      : null;
    return {
      wpgScroll: of(scroll),
      tplZone: of(zone),
      reclaim,
      safeToStrip: scroll ? scroll.scrollHeight - scroll.clientHeight > reclaim : false,
      toolbarRendered: !!grid?.querySelector(".wpg-tools"),
      contentGutter: cs.getPropertyValue("--content-gutter").trim(),
      headerInset: cs.getPropertyValue("--header-inset").trim(),
    };
  });
}

/** Pretty one-page block, in the same shape as the console snippet's output. */
export function format(h: HeaderReading): string {
  const rows = h.children
    .map((c) => `      ${c.tag.padEnd(6)} ${c.cls.slice(0, 34).padEnd(34)} h ${String(c.h).padStart(6)}  Δcentre ${String(c.centreDelta).padStart(6)}${c.offCentre ? "  <<< OFF-CENTRE" : ""}`)
    .join("\n");
  return [
    `  ${h.page} · ${h.state}`,
    `    row ${h.rowH}   header ${h.headerH}   header top-inset-in-row ${h.headerTopInsetInRow}`,
    `    row padding ${h.rowPadding}   .wsh-wrap h ${h.wrapH}`,
    `    hairline  leftInset ${h.hairline.leftInset}  rightInset ${h.hairline.rightInset}  h ${h.hairline.height}  opacity ${h.hairline.opacity}`,
    rows,
  ].join("\n");
}
