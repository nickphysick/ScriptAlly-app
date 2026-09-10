/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE THREE VIEWS, CONTRACT BESIDE PAGE — and this one diffs POSITION as well as properties.
 *
 * ⚠️ THE ANATOMY ROUND'S DIFF PASSED ON A FOOT SITTING 350px TOO HIGH. Every declared property of
 * `.dfoot` matched, because the contract declares nothing about where the foot ENDS UP: it ends up
 * at the bottom through what its SIBLING does. A property comparison cannot see arrangement, and
 * arrangement is what a writer sees. So every part here is read twice — its computed values, and
 * its rect as a PROPORTION of its own container.
 *
 * ⚠️ AND THE CONTRACT IS RENDERED, NEVER READ. The property NAMES come from its declarations; the
 * VALUES and the POSITIONS come from its own render in a real browser.
 */
import { readFileSync } from "node:fs";
import type { Page } from "@playwright/test";
import type { Part } from "./anatomy";

export const VIEWS_PATH = "design-refs/todo-three-views-contract.html";
export const VIEWS_URL = `file://${process.cwd()}/${VIEWS_PATH}`;
export const VIEWS_MD5 = "180d51fc828d990d646d30edf8b0ccd6";

export type ViewName = "grid" | "list" | "board";

/** the contract's stylesheet, comments stripped — a prose mention is not a declaration */
export function cssOf(path: string): string {
  const html = readFileSync(path, "utf8");
  const style = html.slice(html.indexOf("<style>") + 7, html.indexOf("</style>"));
  return style.replace(/\/\*[\s\S]*?\*\//g, "");
}

/**
 * ⚠️ THE APP SELECTORS ARE SPLICED FROM THE SOURCE, NEVER RETYPED. Writing a census by hand
 * produced two wrong classes out of three in one sitting on this page. Each of these came out of
 * `TaskTicket.tsx` / `TaskList.tsx` / `TaskBoard.tsx` and their stylesheets.
 *
 * `app: null` means the app has no such element — which the recon reports and the lock fails on.
 * `container` names the box a part's POSITION is measured inside, per side.
 */
export interface ViewPart extends Part {
  /** the host is a repeating container, so compare this element's OWN height, not its share */
  abs?: boolean;
  /** the contract-side container the rect is taken relative to */
  cIn?: string;
  /** the app-side container the rect is taken relative to */
  aIn?: string;
}

export const VIEW_PARTS: Record<ViewName, ViewPart[]> = {
  grid: [
    { c: ".grid", app: ".tkt-grid" },
    { c: ".card", app: ".tkt", abs: true, cIn: ".grid", aIn: ".tkt-grid" },
    { c: ".card .edge", app: ".tkt .edge", cIn: ".card", aIn: ".tkt" },
    { c: ".card .in", app: ".tkt .in", cIn: ".card", aIn: ".tkt" },
    { c: ".card .top", app: ".tkt .top", cIn: ".card .in", aIn: ".tkt .in" },
    { c: ".tag", cq: ".card .tag", app: ".tkt .tag", cIn: ".card .top", aIn: ".tkt .top" },
    { c: ".msc", cq: ".card .msc", app: ".tkt .msc", cIn: ".card .top", aIn: ".tkt .top" },
    { c: ".card .ttl", app: ".tkt .ttl", cIn: ".card .in", aIn: ".tkt .in",
      waive: { fontFamily: "SEE THE REPORT — the contract declares `.card .ttl` TWICE inside its own cards section: Inter 14.5/600 for the ticket, then Playfair 18/500 thirty lines later as a leftover of the superseded `.card .body`/`.desc`/`.foot` card. The cascade takes the last, so the ref RENDERS Playfair; the brief and this app take Inter 600, which is the standing ruling already recorded in CLAUDE.md for the identical duplicate in `todo-qc-style.html`", fontSize: "same duplicate", fontWeight: "same duplicate", lineHeight: "same duplicate" } },
    { c: ".card .facts", app: ".tkt .facts", cIn: ".card .in", aIn: ".tkt .in" },
    { c: ".card .cell .k", app: ".tkt .cell .k", cIn: ".card .facts", aIn: ".tkt .facts" },
    { c: ".card .cell .v", app: ".tkt .cell .v", cIn: ".card .facts", aIn: ".tkt .facts" },
    { c: ".card .tfoot", app: ".tkt .tfoot", cIn: ".card .in", aIn: ".tkt .in" },
    { c: ".av", cq: ".card .tfoot .av", app: ".tkt .tfoot .av", cIn: ".card .tfoot", aIn: ".tkt .tfoot" },
    { c: ".qs", cq: ".card .tfoot .qs", app: ".tkt .tfoot .qs", cIn: ".card .tfoot", aIn: ".tkt .tfoot" },
  ],
  list: [
    { c: ".listv", app: ".tlc" },
    { c: ".lhd", app: ".tlc .lhd", cIn: ".listv", aIn: ".tlc" },
    { c: ".lgh", app: ".tlc .lgh", abs: true, cIn: ".listv", aIn: ".tlc" },
    { c: ".lgh .t", app: ".tlc .lgh .t", cIn: ".lgh", aIn: ".tlc .lgh" },
    { c: ".lgh .n", app: ".tlc .lgh .n", cIn: ".lgh", aIn: ".tlc .lgh" },
    { c: ".lgh .rule", app: ".tlc .lgh .rule", cIn: ".lgh", aIn: ".tlc .lgh" },
    { c: ".lrow", app: ".tlc .lrow", abs: true, cIn: ".listv", aIn: ".tlc" },
    { c: ".ledge", app: ".tlc .lrow .ledge", cIn: ".lrow", aIn: ".tlc .lrow" },
    { c: ".ltask .t", app: ".tlc .ltask .t", cIn: ".lrow", aIn: ".tlc .lrow" },
    { c: ".ltask .k", app: ".tlc .ltask .k", cIn: ".ltask", aIn: ".tlc .ltask" },
    { c: ".lag", app: ".tlc .lag", cIn: ".lrow", aIn: ".tlc .lrow" },
    { c: ".lag .n", app: ".tlc .lag .n", cIn: ".lag", aIn: ".tlc .lag" },
    { c: ".lag .a", app: ".tlc .lag .a", cIn: ".lag", aIn: ".tlc .lag" },
    { c: ".lchip", app: ".tlc .lchip", cIn: ".lrow", aIn: ".tlc .lrow" },
    { c: ".lstands", app: ".tlc .lstands", cIn: ".lrow", aIn: ".tlc .lrow" },
    { c: ".stamp", app: ".tlc .stamp", cIn: ".lstands", aIn: ".tlc .lstands" },
    { c: ".lstands .l1", app: ".tlc .lstands .l1", cIn: ".lstands", aIn: ".tlc .lstands" },
    { c: ".lstands .l2", app: ".tlc .lstands .l2", cIn: ".lstands", aIn: ".tlc .lstands" },
    { c: ".lact", app: ".tlc .lact", cIn: ".lrow", aIn: ".tlc .lrow" },
    { c: ".lact .go", app: ".tlc .lact .go", cIn: ".lact", aIn: ".tlc .lact" },
    { c: ".lact .ic", app: ".tlc .lact .ic", cIn: ".lact", aIn: ".tlc .lact" },
  ],
  board: [
    { c: ".board", app: ".brd" },
    { c: ".col", app: ".brd-col", abs: true, cIn: ".board", aIn: ".brd" },
    { c: ".colh", app: ".brd-colh", abs: true, cIn: ".col", aIn: ".brd-col" },
    { c: ".colh .r1", app: ".brd-colh .r1", cIn: ".colh", aIn: ".brd-colh" },
    { c: ".colh .ic", app: ".brd-colh .ic", cIn: ".colh .r1", aIn: ".brd-colh .r1" },
    { c: ".colh .t", app: ".brd-colh .t", cIn: ".colh .r1", aIn: ".brd-colh .r1" },
    { c: ".colh .c", app: ".brd-colh .c", cIn: ".colh .r1", aIn: ".brd-colh .r1" },
    { c: ".colh .r2", app: ".brd-colh .r2", cIn: ".colh", aIn: ".brd-colh" },
    { c: ".stack", app: ".brd-stack", abs: true, cIn: ".col", aIn: ".brd-col" },
    { c: ".bcard", app: ".brd-card", abs: true, cIn: ".stack", aIn: ".brd-stack" },
    { c: ".bcard .main", app: ".brd-card .main", cIn: ".bcard", aIn: ".brd-card" },
    { c: ".bcard .disc", app: ".brd-card .disc", cIn: ".bcard .main", aIn: ".brd-card .main" },
    { c: ".bcard .nm", app: ".brd-card .nm", cIn: ".bcard .main", aIn: ".brd-card .main" },
    { c: ".bcard .ag", app: ".brd-card .ag", cIn: ".bcard .main", aIn: ".brd-card .main" },
    { c: ".bcard .bw", app: ".brd-card .bw", cIn: ".bcard .main", aIn: ".brd-card .main" },
  ],
};

/**
 * Open the contract at `view`.
 *
 * ⚠️ IT CLICKS THE SWITCH RATHER THAN CALLING `setView`. `const T = [...]` and `let view` at the
 * top level of a classic script are block-scoped to the script — they never become properties of
 * `window` — so a probe reaching for them dies with "cannot read of undefined", which reads like a
 * missing fixture rather than an unreachable binding. The buttons are on the page.
 */
export async function openContractView(page: Page, view: ViewName): Promise<void> {
  if (!page.url().startsWith("file://")) {
    await page.goto(VIEWS_URL);
    await page.waitForTimeout(400);
    /* ⚠️ THE CONTRACT'S MOTION IS SUPPRESSED, EXACTLY AS THE HARNESS SUPPRESSES THE APP'S — or the
       two pages are compared in different postures. The ref's first board card is URGENT, and the
       `glow` keyframe sets `box-shadow`, so `.bcard` read back `rgba(58,28,20,0.04) 0 1px 2px` —
       the animation's own 0% frame — against an app whose resting shadow was correct. It looked
       exactly like the app having the wrong shadow, and the app had the RIGHT one. */
    await page.addStyleTag({ content:
      "*,*::before,*::after{animation:none!important;transition:none!important}" });
    await page.waitForTimeout(120);
  }
  const label = view === "grid" ? "Grid" : view === "list" ? "List" : "Board";
  const ok = await page.evaluate((l: string) => {
    const b = [...document.querySelectorAll(".views button")]
      .find((x) => (x.textContent || "").includes(l)) as HTMLElement | undefined;
    if (!b) return false;
    b.click();
    return true;
  }, label);
  if (!ok) throw new Error(`openContractView: the contract has no "${label}" segment`);
  await page.waitForTimeout(350);
  const drew = await page.evaluate((v: string) => {
    const root = v === "grid" ? ".grid" : v === "list" ? ".listv" : ".board";
    return document.querySelectorAll(root).length;
  }, view);
  if (!drew) throw new Error(`openContractView: clicked "${label}" and the contract drew no ${view}`);
}

/**
 * ⚠️ A RESOLVED TRACK LIST IS A FACT ABOUT THE CONTAINER'S WIDTH, NOT ABOUT THE RULE. The contract's
 * content column is 372px per track and the app's is 357.3, because the two pages have different
 * chrome either side — so comparing `repeat(auto-fill, minmax(280px,1fr))` against itself reports a
 * difference on every grid in the round. What the rule states is the SHAPE: how many tracks, which
 * are fixed, and whether the flexible ones are equal. That survives a different container and still
 * fails on `6px 1fr` becoming `none`.
 */
export function trackShape(v: string): string {
  if (!v || v === "none") return v || "—";
  const t = v.trim().split(/\s+/);
  const flex = t.filter((x) => x.endsWith("px") && Number.parseFloat(x) > 40);
  const equal = flex.length === 1
    || (flex.length > 1 && flex.every((x) => Math.abs(Number.parseFloat(x) - Number.parseFloat(flex[0])) <= 1));
  return t.map((x) => {
    const n = Number.parseFloat(x);
    return Number.isFinite(n) && x.endsWith("px") && n > 40 ? (equal ? "«flex»" : `«${Math.round(n)}»`) : x;
  }).join(" ");
}

export interface Box { found: boolean; count: number; values: Record<string, string>;
  /**
   * ⚠️ THE POSITION IS FOUR FRACTIONS OF THE CONTAINER, NOT FOUR PIXEL OFFSETS — and the difference
   * decides whether this instrument works at all. The contract's content column is 372px per grid
   * track and the app's is 357.3, because the two pages carry different chrome either side, so an
   * absolute `dx` disagrees on every element in the round about nothing. Worse, `width` is
   * content-driven wherever the element holds text: the ref's status word is "Full requested" and
   * the app's fixture says something shorter, so a width comparison reports a difference in the
   * DATA as a difference in the design.
   *
   * The four edges as fractions survive both and still catch what this exists to catch. The
   * drawer's foot sat 350px too high inside a drawer of the same width — `dyf` and `byf` move
   * together and neither can be satisfied by a coincidence of container size.
   */
  rel?: { dx: number; dy: number; dxf: number; dyf: number; rxf: number; byf: number; w: number; h: number } }

/**
 * Computed values for the first VISIBLE match, plus its rect relative to `container`.
 *
 * ⚠️ VISIBLE, because the workspace keeps every page mounted and `.first()` routinely resolves to
 * a hidden page's zero-sized copy. And the count is returned rather than swallowed: "0 matched"
 * and "3 matched and I took the wrong one" are different faults with different fixes.
 */
export async function readBox(page: Page, sel: string, props: string[], container?: string): Promise<Box> {
  return page.evaluate(
    ([s, ps, cs]: [string, string[], string | undefined]) => {
      const vis = (e: Element) => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0; };
      const all = [...document.querySelectorAll(s)];
      const el = all.find(vis);
      if (!el) return { found: false, count: all.length, values: {} };
      const cs2 = getComputedStyle(el);
      const values: Record<string, string> = {};
      for (const p of ps) values[p] = cs2.getPropertyValue(p).trim();
      const b = el.getBoundingClientRect();
      const r1 = (n: number) => Math.round(n * 10) / 10;
      const r3 = (n: number) => Math.round(n * 1000) / 1000;
      let rel;
      if (cs) {
        const host = [...document.querySelectorAll(cs)].find((h) => h.contains(el) && vis(h))
          ?? [...document.querySelectorAll(cs)].find(vis);
        if (host) {
          const hb = host.getBoundingClientRect();
          const W = hb.width || 1, H = hb.height || 1;
          rel = { dx: r1(b.left - hb.left), dy: r1(b.top - hb.top),
            dxf: r3((b.left - hb.left) / W), dyf: r3((b.top - hb.top) / H),
            rxf: r3((b.right - hb.left) / W), byf: r3((b.bottom - hb.top) / H),
            w: r1(b.width), h: r1(b.height) };
        }
      } else {
        rel = { dx: 0, dy: 0, dxf: 0, dyf: 0, rxf: 1, byf: 1, w: r1(b.width), h: r1(b.height) };
      }
      return { found: true, count: all.length, values, rel };
    },
    [sel, props, container] as [string, string[], string | undefined],
  );
}

/**
 * The element sits in the same place inside its own container.
 *
 * ⚠️ HORIZONTALLY IT IS ANCHOR-AWARE, because a text element's WIDTH is its content's. `.msc`
 * carries a manuscript title and `.qs` a status word, and the ref's fixture says different words
 * from the app's — so a both-edges comparison reports the DATA as a design difference. What the
 * design states is which edge the element is flush to; an element flush right in both is in the
 * same place whatever it says. An element flush to NEITHER edge is compared on both.
 *
 * ⚠️ VERTICALLY THE TOLERANCE IS 4%, AND THAT IS PAID FOR BY A WAIVER RATHER THAN GENEROSITY. The
 * ticket's title is deliberately Inter 14.5 against the ref's Playfair 18 — see the `.card .ttl`
 * waiver and the report — so every row beneath it sits a little higher, by a difference that is a
 * consequence of an accepted one. 2% failed three rows that are correct.
 *
 * ⚠️ AND `abs` COMPARES THE ELEMENT'S OWN HEIGHT INSTEAD OF ITS SHARE OF THE CONTAINER, for the
 * repeated item inside a grid, a stack or a list body. That container's height is the FIXTURE's —
 * how many cards the account happens to hold — so a card's `byf` says how full the board is, not
 * how tall the card is. The claim there is the card's own height, which is what the design fixes.
 */
export function samePlace(c?: Box["rel"], a?: Box["rel"], opts: { abs?: boolean } = {}): boolean {
  if (!c || !a) return false;
  const flushL = (r: NonNullable<Box["rel"]>) => Math.abs(r.dxf) <= 0.02;
  const flushR = (r: NonNullable<Box["rel"]>) => Math.abs(r.rxf - 1) <= 0.02;
  const dx = Math.abs(c.dxf - a.dxf) <= 0.02;
  const rx = Math.abs(c.rxf - a.rxf) <= 0.02;
  /* ⚠️ FLUSH RIGHT MEANS THE *LEFT* EDGE IS THE CONTENT-DRIVEN ONE, and the first form of this had
     it the other way round — it compared the free edge and ignored the anchored one, which failed
     `.msc` and `.qs` for carrying different words from the ref's fixture while both sat correctly
     flush to the right of their container. */
  const horizontal = (flushL(c) && flushL(a) && dx) || (flushR(c) && flushR(a) && rx) || (dx && rx);
  const vertical = opts.abs
    ? Math.abs(c.dyf - a.dyf) <= 0.04 && Math.abs(c.h - a.h) <= 2
    : Math.abs(c.dyf - a.dyf) <= 0.04 && Math.abs(c.byf - a.byf) <= 0.04;
  return horizontal && vertical;
}
