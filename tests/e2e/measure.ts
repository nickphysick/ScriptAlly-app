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
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { assertLocalBundleIsDev } from "./bundleGuard";

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

/**
 * Injected once per page. `!important` because it must beat the shorthand that set them running.
 *
 * ⚠️ IT CARRIES AN ID, AND LIFTING IT MUST MATCH THAT ID RATHER THAN ITS TEXT. A helper that
 * removed every `<style>` CONTAINING "animation: none !important" deleted three of the app's own
 * stylesheets under `vite dev`, which serves each CSS file as an injected `<style>` — `f12.css`
 * alone carries that exact declaration in a reduced-motion block. The symptom was the header band
 * measuring 24px instead of 52 with a computed `height` of 24: not an animation override, not a
 * transform — the rule was simply gone, because its stylesheet was. It could never show against
 * the deployed build, where the CSS is one linked file.
 */
export const KILL_MOTION_ID = "sa-e2e-kill-motion";
const KILL_MOTION = `
  *, *::before, *::after {
    transition: none !important;
    animation: none !important;
    scroll-behavior: auto !important;
  }`;


/**
 * ⚠️ EVERY PAGE IS MOUNTED AT ONCE, so `document.querySelector(".wpg")` IS THE WRONG GRID.
 * `StagePage` keeps dashboard/queries/agents/manuscripts as persistent slots and toggles their
 * DISPLAY — page-local state has to survive navigation — so the document holds several grids and
 * the first one in source order is almost never the one on screen. The hidden ones measure zero.
 *
 * That produced a full run of 0s that PASSED: identical children on all four pages, `.tpl-zone`
 * present on the Contact list, every rect zero. It is the same fault as every harness this tool
 * replaces — confident numbers about something the user is not looking at — reproduced inside the
 * replacement. Picking the grid with a non-zero box is what makes the reading the visible page's.
 */
const VISIBLE_GRID = `(() => {
  const grids = [...document.querySelectorAll('.wpg')];
  return grids.find((g) => g.getBoundingClientRect().height > 0) || null;
})()`;

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

/** The shell's own roots. `.ws-panel` is the sidebar, `.ws-work` the content wrapper. */
const SHELL = ".ws-panel, .ws-work, .ws-window, #app-stage-scroll";

/**
 * ⚠️ `storageState` DOES NOT CARRY A FIREBASE SESSION, and the failure looks like a broken
 * selector. Firebase Auth persists to IndexedDB; Playwright's `storageState` captures cookies and
 * localStorage only. So the saved state restored a signed-OUT browser, every route fell through to
 * the marketing landing, and four runs timed out waiting for a sidebar the app was correctly not
 * rendering. Signing in per run costs a few seconds and is the honest fix — the alternative is
 * changing the app's auth persistence to suit its test harness.
 */
export async function ensureSignedIn(page: Page) {
  /* ⚠️ THE BUNDLE GUARD RUNS HERE, NOT ONLY IN SETUP. `auth.setup.ts` runs once and is SKIPPED when
     a cached `storageState` is still valid — so a run that reuses the session never reached the
     check, and could measure a production or a stale bundle with nothing said. Every measure spec
     calls this function; the guard belongs where the traffic is. */
  assertLocalBundleIsDev();
  /* ⚠️ WAIT FOR ONE OF THE TWO, DO NOT COUNT IMMEDIATELY. Checking `count()` straight after a
     `goto` reads a document the app has not rendered into yet, so it always looked signed-out —
     and then tried to sign in again, on a route that redirects away from the form when the session
     is live, and hung until the test timed out. Racing the shell against the form settles it. */
  const settled = await Promise.race([
    page.locator(SHELL).first().waitFor({ state: "attached", timeout: 15_000 }).then(() => "shell").catch(() => null),
    page.locator("#au-email").waitFor({ state: "attached", timeout: 15_000 }).then(() => "form").catch(() => null),
  ]);
  if (settled === "shell") return;
  const pw = process.env.SA_E2E_PASSWORD ?? passwordFromEnvLocal();
  if (!pw) throw new Error("No SA_E2E_PASSWORD — see tests/e2e/auth.setup.ts");
  await page.goto("/#/signin");
  await page.locator("#au-email").fill(process.env.SA_E2E_EMAIL ?? "harness@scriptally.test");
  await page.locator("#au-pw").fill(pw);
  await page.getByRole("button", { name: /^Sign in$/ }).last().click();
  await expect(page.locator(SHELL).first()).toBeVisible({ timeout: 30_000 });
}

/** `.env.local` is not loaded by this process, so read it directly. */
function passwordFromEnvLocal(): string | null {
  const p = resolve(process.cwd(), ".env.local");
  if (!existsSync(p)) return null;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = /^\s*SA_E2E_PASSWORD\s*=\s*(.*)$/.exec(line);
    if (m) return m[1].trim().replace(/^["']|["']$/g, "") || null;
  }
  return null;
}

/** Open a route on the deployed dev site and wait for the workspace to be real, not a skeleton. */
export async function openRoute(page: Page, route: string, viewport?: { width: number; height: number }) {
  if (viewport) await page.setViewportSize(viewport);
  await page.goto(route);
  await ensureSignedIn(page);
  await page.goto(route);
  await page.addStyleTag({ content: FORCE_CLASSIC_SCROLLBARS });
  await page.addStyleTag({ content: `/*${KILL_MOTION_ID}*/${KILL_MOTION}` });
  /* the shell first, then the page's own grid if it has one */
  await expect(page.locator(SHELL).first()).toBeVisible({ timeout: 30_000 });
  /* ⚠️ NEVER `networkidle` ON THIS APP, AND A BARE `.catch()` DOES NOT SAVE YOU. Firestore holds
     long-poll listeners open, so the network is never idle — the call HANGS rather than rejecting,
     and four runs died on the test timeout pointing at the line after it. A short settle beats a
     condition that cannot be met. */
  await page.waitForLoadState("domcontentloaded").catch(() => {});
  await page.waitForTimeout(2500);
  await page.addStyleTag({ content: `/*${KILL_MOTION_ID}*/${KILL_MOTION}` });
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
    const grid = [...document.querySelectorAll(".wpg")].find((g) => g.getBoundingClientRect().height > 0);
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
    const grid = [...document.querySelectorAll(".wpg")].find((g) => g.getBoundingClientRect().height > 0);
    const scroll = grid?.querySelector(".wpg-scroll") as HTMLElement | null;
    /* scoped to the visible grid for the same reason — a hidden page's zone is not this page's */
    const zone = (grid?.querySelector(".tpl-zone") ?? null) as HTMLElement | null;
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

/**
 * Lift the motion suppression — for any test that CHANGES STATE, since a suppressed animation
 * never fires `animationend` and anything torn down by that event never leaves.
 *
 * ⚠️ IT MATCHES THE MARKER, NOT THE DECLARATION. See KILL_MOTION_ID above for what text-matching
 * cost: three of the app's own stylesheets, deleted, under the dev server only.
 */
export async function liftMotionSuppression(page: import("@playwright/test").Page): Promise<void> {
  await page.evaluate((id) => {
    document.querySelectorAll("style").forEach((s) => {
      if (s.textContent?.startsWith(`/*${id}*/`)) s.remove();
    });
  }, KILL_MOTION_ID);
}
