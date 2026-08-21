/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE ACCEPTANCE MATRIX — every in-scope page, both viewports.
 *
 * ⚠️ CROSS-PAGE EQUALITY, NOT CONSTANTS. The standard is "identical to every other page", so the
 * run collects each page's readings and compares them to each other at the end. A constant would
 * pass while all ten drifted together.
 *
 * ⚠️ A WHEEL GESTURE, NOT A `scrollTop` WRITE. A write moves the element you chose; a wheel moves
 * whatever the browser decides is under the pointer, which is the only thing that catches a
 * handler attached to the wrong element.
 *
 * ⚠️⚠️ THIS FILE HAD BEEN CRASHING SINCE THE MASTHEAD MOVED INTO THE FLOW, AND NOBODY NOTICED FOR
 * THREE PACKS. It read `.wpg-plate` — the chrome row that pack deleted — so `readHeaderState` threw
 * on its first page and both viewports died before asserting anything. An acceptance matrix that
 * does not run is worse than one that does not exist: the repo still has a file named for the
 * guarantee, and every subsequent pack was reported green against a set it was never in.
 *
 * ⚠️ ABOUT HALF ITS CLAIMS WENT WITH THE PLATE, and they are DELETED rather than adapted, because
 * their subject is gone rather than changed: the 128px resting card and 52px working strip, the
 * mono working title, the mark dropping on scroll, the 30/38 button ladder, the pill ladder, the
 * two-state band and gap, `backToRest`, and `overflowWork === overflowRest` — the invariance
 * padding, which was deleted deliberately and whose successor is a bar that CHANGES max scroll on
 * purpose. Retaining any of them as "the equivalent reading" would have been inventing a claim.
 *
 * ⚠️ AND THE MASTHEAD'S OWN GEOMETRY IS NOT HERE. `mastheadMatrix.measure.ts` owns it — height
 * derivation, padding, type, marks, centring, control-row offset — and duplicating it would give
 * one guarantee two homes that will eventually disagree. What is left here is everything BELOW the
 * masthead: the ground, the hems and their fades, the width chain, the fill chain, and the wheel.
 */
import { test, expect, Page } from "@playwright/test";
import { openRoute, scrollbarWidth } from "./measure";

const SCROLLING: [string, string][] = [
  /* ⚠️ THE QUERY CENTRE IS IN THE LIST, and it was missing from the first version — the one page
     the same run had just converted. A matrix that omits the page you changed is the "all six
     headers identical" report all over again. */
  ["Query Centre", "/queries"],
  ["Contact list", "/agents"],
  ["Discover", "/agents/discover"],
  ["Manuscripts", "/manuscripts"],
  ["Submission packages", "/manuscripts/packages"],
  ["Analytics", "/queries/analytics"],
  ["To-do", "/todo"],
  ["Calendar", "/todo/calendar"],
  ["Noteboard", "/todo/noteboard"],
  ["Comparable titles", "/manuscripts/comps"],
];

const readState = (page: Page) => page.evaluate(() => {
  const r = (n: number) => Math.round(n * 10) / 10;
  const g = [...document.querySelectorAll(".wpg")].find((x) => x.getBoundingClientRect().height > 0) as HTMLElement;
  if (!g) return null;
  const sc = g.querySelector(".wpg-scroll") as HTMLElement;
  const wsh = g.querySelector(".wsh") as HTMLElement | null;
  const W = document.documentElement.clientWidth;
  const sb = sc.getBoundingClientRect();
  /**
   * ⚠️ THE PAGE'S CONTENT BEGINS AFTER THE GRID'S OWN CHROME, AND FORGETTING THAT IS WHAT BROKE
   * EVERY READING BELOW. The masthead, the folded bar and the control row are all children of the
   * scroll row now — so `sc.firstElementChild` is the GRID's furniture, not the page's, and a walk
   * that starts there is auditing the component against a rule written for its consumers.
   *
   * It produced two false reports on the first run of the repaired file, both entirely convincing:
   * the width chain flagged `.wpg-mast: maxW 1660px`, which is the shared measure the grid applies
   * to all its children on purpose; and the zero-height sweep flagged `wpg-mini 0px holding 25px`
   * on all five scrolling pages, which is the folded bar sitting collapsed exactly as designed.
   *
   * ⚠️ NAMING THE GRID'S THREE CLASSES IS NOT THE "LIST OF PAGE NAMES" THIS FILE WARNS AGAINST.
   * That warning is about deciding a page's BEHAVIOUR from a hand-kept list instead of from the
   * DOM. This is the grid declaring which of its own children it rendered — one component's
   * furniture, owned and locked elsewhere (`mastheadMatrix`, `miniBar`, `stickyRow`).
   */
  const CHROME = ["wpg-mast", "wpg-mini", "wpg-tools"];
  const isChrome = (el: Element) => CHROME.some((c) => el.classList.contains(c));
  const content = [...sc.children].find((el) => !isChrome(el)) as HTMLElement | null;
  return {
    /* ⚠️ READ FROM THE DOM, NEVER A LIST OF PAGE NAMES. `fill` is a prop; a hand-kept list of "the
       fill pages" named Comparable titles, which does not pass it, and omitted Manuscripts, which
       does. The class is the page saying so itself. */
    fill: g.classList.contains("wpg--fill"),
    /* ⚠️ THE MASTHEAD'S DISTANCE FROM THE WINDOW'S TOP EDGE — the last place a page could still
       disagree about the header, and it did: five different page insets above the grid put this at
       87.3, 98.3, 101.3, 103.3 and 109.3 while every reading INSIDE the header matched. */
    headerTop: wsh ? r(wsh.getBoundingClientRect().top) : -1,
    /* ⚠️ THE CHAIN FROM THE SCROLL ROW TO THE CONTENT — anything declaring a width, a cap, an auto
       margin or a side padding between them is a page re-doing the grid's job. Query Centre's
       frame did exactly that through a `calc` that named the shared token, so its content sat
       160px in from each edge against every other page's 80. */
    chain: (() => {
      const out: string[] = [];
      /**
       * ⚠️ THE GRID'S OWN SHARED MEASURE IS NOT A PAGE DECLARING A WIDTH, AND COMPUTED STYLE CANNOT
       * TELL THEM APART. `.wpg-scroll > *` applies `max-width: var(--wpg-measure)` to every child,
       * so Query Centre's `.f12-body` COMPUTES `1660px` while declaring nothing — the page's own
       * cap was deleted when the measure moved up to the grid. Reading the computed value alone
       * reported the fix as the fault it was fixing.
       *
       * So the measure is read off the grid's own furniture, which takes it by the same rule, and a
       * child matching it is inside the shared measure rather than stating one. `none` on the nine
       * pages that cap nothing, where this excuses exactly nothing.
       */
      const mastEl = g.querySelector(".wpg-mast") as HTMLElement | null;
      const shared = mastEl ? getComputedStyle(mastEl).maxWidth : "none";
      let el = content;
      for (let i = 0; el && i < 3; i += 1) {
        const c = getComputedStyle(el);
        const bad: string[] = [];
        if (c.maxWidth !== "none" && c.maxWidth !== shared) bad.push(`maxW ${c.maxWidth}`);
        if (c.marginLeft === "auto" || c.marginRight === "auto") bad.push("auto margin");
        /* ⚠️ A BORDERED BOX'S PADDING IS ITS OWN, AND THAT IS A REAL DISTINCTION RATHER THAN AN
           EXEMPTION FOR THE PAGE THAT FAILED. Query Centre's `.f12-body` draws the workspace
           hairline; its 22px is the space between that line and the panes inside it, the same as
           any card's padding. What the rule is against is a BARE wrapper that insets its children
           — the shape that pays the gutter a second time, invisibly, because nothing is drawn at
           the edge to show where the inset came from. A frame you can see is not that. */
        /* ⚠️ ANY BORDER SIDE, NOT JUST THE LEFT. Query Centre's list column draws the seam between
           the two independently scrolling panes on its RIGHT edge, with `--gut` of air inside it —
           a drawn boundary with its own padding, which is exactly the case this carve-out is for.
           Testing `borderLeftWidth` alone flagged it as a bare wrapper. */
        const bordered = ["borderLeftWidth", "borderRightWidth", "borderTopWidth", "borderBottomWidth"]
          .some((k) => parseFloat(c[k as keyof CSSStyleDeclaration] as string) > 0);
        const framed = bordered || c.backgroundImage !== "none"
          || (c.backgroundColor !== "rgba(0, 0, 0, 0)" && c.backgroundColor !== "transparent");
        if (!framed && c.paddingLeft !== "0px") bad.push(`padL ${c.paddingLeft}`);
        if (!framed && c.paddingRight !== "0px") bad.push(`padR ${c.paddingRight}`);
        if (bad.length) out.push(`${el.className.toString().slice(0, 22)}: ${bad.join(", ")}`);
        /* ⚠️ THE WALK STOPS AT THE FIRST FRAMED BOX, and that is this rule finally saying what it
           already claimed. It exempts a framed element's OWN padding — "a frame you can see is not
           a bare wrapper" — but then carried on into its children and flagged them, so a card's
           inner column read as a second gutter. Measured: Query Centre's `.f12-lhead` (12px) and
           Comparable titles' `.ct-hero-l` (34px), both at depth 2, both inside a bordered and
           filled parent at depth 1. Past a drawn edge the CONTENT has begun and every inset below
           is that object's own composition; the fault this guards against is a BARE wrapper paying
           the gutter twice with nothing drawn to show where the inset came from. */
        if (framed) break;
        el = el.firstElementChild as HTMLElement | null;
      }
      return out;
    })(),
    /**
     * ⚠️ THE ZERO-HEIGHT SWEEP. A direct child of the scroll row that has rendered content and
     * measures 0 is the fill-chain fault: `flex: 1 1 0%` with `min-height: 0` written against a
     * flex parent, given a block one. It contributes nothing to a content-sized container and then
     * has no free space to grow into, so it computes to EXACTLY zero — silently, with every
     * element inside it mounted, styled and correct.
     *
     * ⚠️ "HAS RENDERED CONTENT" IS THE WHOLE DISCRIMINATOR. A genuinely empty child is 0 tall and
     * fine; the fault is a child with descendants that measure real height sitting inside a box
     * that measures none. Both times this landed (`.tpl-cols`, `.f12-body`) it hid behind content
     * that happened to size the container, so a source scan would not have found either.
     */
    zeroKids: (() => {
      const out: string[] = [];
      const walk = (el: Element, depth: number) => {
        for (const kid of Array.from(el.children)) {
          const k = kid as HTMLElement;
          /* the grid's own chrome is not the page's fill chain — the folded bar is 0 tall at rest
             BY DESIGN, holding a 25px name it is deliberately hiding */
          if (depth === 0 && isChrome(k)) continue;
          const h = k.getBoundingClientRect().height;
          const inner = Math.max(0, ...[...k.querySelectorAll("*")].map((x) => x.getBoundingClientRect().height));
          if (h < 1 && inner > 1 && getComputedStyle(k).display !== "none") {
            out.push(`${k.className.toString().slice(0, 28) || k.tagName.toLowerCase()} 0px holding ${Math.round(inner)}px`);
          } else if (depth < 2) walk(k, depth + 1);
        }
      };
      walk(sc, 0);
      return out;
    })(),
    /* the content's own left edge, so a double gutter shows as a number rather than as a rule */
    contentL: content ? r(content.getBoundingClientRect().left - sb.left) : -1,
    /* the scroller's own edges — the grid's row, which is one object on every page */
    scrollL: r(sb.left), scrollR: r(W - sb.right),
    overflow: sc.scrollHeight - sc.clientHeight,
    /* does anything below the chrome scroll at all? an internal-pane page says yes here */
    innerScrolls: [...g.querySelectorAll("*")].some((el) => {
      const e = el as HTMLElement;
      const oy = getComputedStyle(e).overflowY;
      return (oy === "auto" || oy === "scroll") && e.scrollHeight - e.clientHeight > 2;
    }),
    scrollTop: r(sc.scrollTop),
    /* ⚠️ THE HEMS, MEASURED WHERE THEY ARE RATHER THAN WHERE THEY WERE MOUNTED. Their whole
       correctness is that they do NOT move with the content, so the reading is their top/bottom
       against the scroll row's — a hem that scrolled would drift by exactly `scrollTop`. */
    hemTop: (() => {
      const h = g.querySelector(".wpg-hem--top") as HTMLElement | null;
      if (!h) return "absent";
      const b2 = h.getBoundingClientRect();
      return `${getComputedStyle(h).opacity === "1" ? "on" : "off"}@${r(b2.top - sb.top)}`;
    })(),
    hemBot: (() => {
      const h = g.querySelector(".wpg-hem--bot") as HTMLElement | null;
      if (!h) return "absent";
      const b2 = h.getBoundingClientRect();
      return `${getComputedStyle(h).opacity === "1" ? "on" : "off"}@${r(sb.bottom - b2.bottom)}`;
    })(),
    /**
     * ⚠️ THE WINDOW'S GROUND, AND THE COLOUR EACH HEM ACTUALLY RESOLVES TO — read as COMPUTED
     * values, because this is the one fault a source lock cannot see. The hems were literals
     * matching the window by coincidence; a literal that stops matching produces a pale band across
     * the top and bottom of every scroller, visible only where content passes under it. An empty
     * page looks perfect and nothing errors.
     *
     * ⚠️ THE OPAQUE STOP, EXTRACTED — not the whole `background-image` string, which also carries
     * the direction and the percentages and would differ between the two hems by construction.
     * Chromium serialises the stops as `rgb(...)` / `rgba(..., 0)`, so the first stop with a
     * non-zero alpha IS the colour the fade starts from, and it must equal the window's own fill.
     */
    /**
     * ⚠️ THE GROUND IS READ BY WALKING UP FROM THE CONTENT, NEVER BY NAMING AN ELEMENT — and that
     * is the finding, not a refinement. Reading `.ws-window` looked obviously right (the source
     * calls it the white surface, two locks name it, the notes name it) and it is NOT what anyone
     * sees: `.ws-work` fills the window on every page and paints over it. A run that read
     * `.ws-window` reported the ground had changed while every page still showed white, and the
     * hems — correctly matching `.ws-window` — were resolving into a colour no page displayed.
     *
     * So: the nearest PAINTED ancestor above the scroll row, whatever it is called. An element name
     * is a claim about the DOM; this is a reading of the pixel.
     */
    windowBg: (() => {
      for (let n: HTMLElement | null = sc; n; n = n.parentElement) {
        const bg = getComputedStyle(n).backgroundColor;
        if (bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") return bg;
      }
      return "absent";
    })(),
    /* ⚠️ AND THE NAMED SURFACE TOO, so the two can be asserted EQUAL. They are one ground in two
       elements — the window draws the frame, `.ws-work` fills it — and any difference between them
       is a seam that shows at the window's edges. */
    windowEl: (() => {
      const w = document.querySelector(".ws-window") as HTMLElement | null;
      return w ? getComputedStyle(w).backgroundColor : "absent";
    })(),
    hemInk: (() => {
      const opaque = (sel: string) => {
        const h = g.querySelector(sel) as HTMLElement | null;
        if (!h) return "absent";
        const img = getComputedStyle(h).backgroundImage;
        const stops = img.match(/rgba?\([^)]*\)/g) ?? [];
        /* the far end is the same colour at zero alpha; the near end is the one to compare */
        const near = stops.find((s) => !/,\s*0\s*\)$/.test(s));
        return near ?? `noStops:${img.slice(0, 40)}`;
      };
      return `${opaque(".wpg-hem--top")} | ${opaque(".wpg-hem--bot")}`;
    })(),
    /* ⚠️ ONE HEM PER SCROLLER. `.tbd-fade` and `.sv2-fade` predate the grid's; where a legacy fade
       sits on the SAME scroller the two stack and the gradient doubles. They are kept where they
       cover a DIFFERENT scroller — `.sv2-fade` is the shell stage's, `.tbd-fade` rides an internal
       `.tpl-zone` — so the check is overlap, not existence. */
    stackedFades: [...sc.querySelectorAll(".tbd-fade, .sv2-fade, [class*='-fade']")]
      .filter((el) => (el as HTMLElement).getBoundingClientRect().height > 0)
      .map((el) => el.className.toString().slice(0, 24)),
    gutter: getComputedStyle(sc).paddingLeft,
    /**
     * ⚠️ THE SCROLL ROW RESERVES A CLASSIC SCROLLBAR GUTTER ON BOTH EDGES, and the content sits
     * inside it. `scrollbar-gutter: stable both-edges` — measured `offsetWidth 1170` against
     * `clientWidth 1140`, so 15px on each side, on every page and in both gutter families.
     *
     * ⚠️ THIS IS THE ONE PART OF THE SCROLLBAR THE HARNESS *CAN* SEE, and the distinction is worth
     * holding. Chromium here cannot RENDER a classic scrollbar — the repo's note records `0px`
     * under every flag, channel and override tried — but a reserved GUTTER is layout, not painting,
     * and `clientWidth` reports it exactly. So "the harness is blind to the scrollbar" is true of
     * the bar's visible width and false of the space held for it.
     *
     * Read as a number so the content's inset can be checked against it rather than against 15.
     */
    gutterReserve: r((sc.offsetWidth - sc.clientWidth) / 2),
  };
});

/** a genuine wheel over the content — not a scrollTop write */
async function wheelOverContent(page: Page) {
  /* ⚠️ THE VISIBLE SCROLLER, NOT `.first()`. Every page stays mounted, so the first `.wpg-scroll`
     in the document belongs to whichever slot renders earliest — a hidden one, whose box is empty,
     so the wheel went nowhere and every page reported `wheelWorked: false`. */
  const handle = page.locator(".wpg-scroll").filter({ has: page.locator(":scope") });
  const n = await handle.count();
  let box: { x: number; y: number; width: number; height: number } | null = null;
  for (let i = 0; i < n; i += 1) {
    const b = await handle.nth(i).boundingBox();
    if (b && b.height > 0 && b.width > 0) { box = b; break; }
  }
  if (!box) return;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, 500);
  await page.waitForTimeout(400);
}

for (const vp of [{ width: 1440, height: 900 }, { width: 1280, height: 800 }]) {
  test(`MATRIX ${vp.width}x${vp.height}`, async ({ page }) => {
    const rows: Record<string, unknown>[] = [];
    let sbw = -1;
    for (const [label, route] of SCROLLING) {
      await openRoute(page, route, vp);
      if (sbw < 0) sbw = await scrollbarWidth(page);
      const rest = await readState(page);
      if (!rest) { rows.push({ page: label, ERROR: "no visible .wpg" }); continue; }
      await wheelOverContent(page);
      const work = await readState(page);
      rows.push({
        page: label, canScroll: rest.overflow > 0, fill: rest.fill,
        headerTop: rest.headerTop, gutter: rest.gutter, reserve: rest.gutterReserve, contentL: rest.contentL,
        scrollL: rest.scrollL, scrollR: rest.scrollR,
        chain: rest.chain.join(" · ") || "clean",
        zeroKids: rest.zeroKids.join(" · ") || "none",
        wheelWorked: work!.scrollTop > 2,
        hemRest: `${rest.hemTop} ${rest.hemBot}`, hemWork: `${work!.hemTop} ${work!.hemBot}`,
        windowBg: rest.windowBg, windowEl: rest.windowEl, hemInk: rest.hemInk,
        stacked: rest.stackedFades.join(",") || "none",
        overflowRest: rest.overflow, innerScrolls: rest.innerScrolls,
      });
    }
    console.log(`\n══ MATRIX ${vp.width}x${vp.height} · scrollbar ${sbw}px (${sbw >= 10 ? "CLASSIC" : "OVERLAY"})`);
    console.table(rows);
    const all = rows.filter((r) => !r.ERROR);
    expect(all.length, "pages failed to render at all — the matrix is measuring nothing").toBe(SCROLLING.length);
    const scrollers = all.filter((r) => r.canScroll);

    /* ══ THE GROUND ══════════════════════════════════════════════════════════════════════════ */
    for (const r of all) {
      expect(r.windowBg, `${r.page}: the visible ground (${r.windowBg}) is not the window's own fill (${r.windowEl}) — .ws-work is painting over it`)
        .toBe(r.windowEl);
    }

    /* ══ THE SCROLLER IS ONE OBJECT ON EVERY PAGE ════════════════════════════════════════════ */
    for (const key of ["scrollL", "scrollR"] as const) {
      const vals = [...new Set(all.map((r) => String(r[key])))];
      expect(vals, `${key} differs across pages: ${JSON.stringify(all.map((r) => [r.page, r[key]]))}`).toHaveLength(1);
    }

    /* ══ NOTHING BETWEEN THE SCROLL ROW AND THE CONTENT RE-DECLARES GEOMETRY ═════════════════
       The grid pays the gutter once, and a page that pays it again is narrower than every other
       page while its CSS names the correct token. */
    for (const r of all) {
      expect(r.chain, `${r.page}: something between the scroll row and the content declares its own width — ${r.chain}`).toBe("clean");
      expect(r.zeroKids, `${r.page}: a box in the scroll row measures 0 while holding rendered content — the fill chain is broken (${r.zeroKids}). The page needs the grid's \`fill\` prop.`).toBe("none");
    }

    /**
     * ⚠️ THE CONTENT STARTS AT THE PAGE'S OWN GUTTER, AND THERE ARE TWO GUTTERS BY DESIGN. This
     * used to demand ONE left edge across all ten; Query Centre and the three Tasks pages take
     * `--content-gutter-tight`, so a single value was never the right claim and would now assert
     * that deliberate difference away. What must hold is that the content sits at EXACTLY its
     * scroller's padding — no more, no less — which catches the double-gutter fault on any page
     * whatever its gutter, and catches it by the number rather than by naming a token.
     *
     * ⚠️ THE ANALYTICS CARVE-OUT IS RETIRED, AND ITS RETIREMENT IS THE POINT. This used to excuse
     * ONE empty page: Analytics rendered `{null}` into row 3, a placeholder that deliberately showed
     * nothing rather than plausible-looking figures. It has real content now, so every page must
     * have some — a stronger claim than the one it replaces, and an exemption kept past its subject
     * is an exemption that will one day excuse a page that genuinely failed to render.
     */
    const withContent = all.filter((x) => x.contentL !== -1);
    const empty = all.filter((x) => x.contentL === -1).map((x) => x.page);
    expect(empty, `pages with nothing in their scroll row: ${JSON.stringify(empty)} — every page renders content now, so a name here is a page that failed to render`)
      .toEqual([]);
    for (const r of withContent) {
      const want = parseFloat(String(r.gutter)) + Number(r.reserve);
      expect(r.contentL, `${r.page}: the content starts at ${r.contentL}, but the scroller's padding (${r.gutter}) plus its reserved scrollbar gutter (${r.reserve}) derive ${want} — the difference is a second inset the page is paying`)
        .toBeCloseTo(want, 0);
    }

    /**
     * ⚠️ THE HEM CONTRACT IS TWO CONTRACTS, AND ASSERTING ONE OVER ALL TEN WAS THE BUG. This
     * demanded hems on every page; five pages legitimately have none. `fill` declares that the
     * PANES scroll and the row does not, so that scroller cannot reach a state either hem describes
     * and a fade at its foot would claim something that cannot happen. The absence is the feature.
     *
     * ⚠️ SO BOTH HALVES ARE ASSERTED POSITIVELY rather than one being excused. A fill page must have
     * NO hems; every other page must have BOTH. An exemption would have let a scrolling page quietly
     * lose them.
     */
    for (const r of all.filter((x) => x.fill)) {
      expect(r.hemRest, `${r.page}: a fill page drew hems — its row cannot reach a state either hem describes`).toBe("absent absent");
    }
    for (const r of all.filter((x) => !x.fill)) {
      expect(r.hemRest, `${r.page}: the hems are missing`).not.toContain("absent");
    }
    const hemmed = all.filter((r) => !String(r.hemRest).includes("absent"));
    expect(hemmed.length, "no page mounted a hem at all — the reading is broken, not the hems").toBeGreaterThan(0);
    for (const r of hemmed) {
      for (const [edge, ink] of [["top", String(r.hemInk).split(" | ")[0]], ["bottom", String(r.hemInk).split(" | ")[1]]]) {
        expect(ink, `${r.page}: the ${edge} hem has no opaque stop — its gradient is not a fade into anything (${r.hemInk})`)
          .toMatch(/^rgba?\(/);
        expect(ink, `${r.page}: the ${edge} hem fades from ${ink} over a ${r.windowBg} ground — a pale band across the scroller, visible only where content passes under it`)
          .toBe(r.windowBg);
      }
    }
    /* ⚠️ ONE ASSERTION PER HEM, because a combined one blames the wrong element. The first version
       compared the pair as a string and reported "a top fade at the top of the page" about a
       reading whose TOP hem was correct and whose bottom hem was dark — I chased the wrong half
       until I printed the value. A message that names something the reading does not say is worse
       than no message. */
    /**
     * ⚠️ THE STATE, NOT THE POSITION — AND THE POSITION MOVED ON PURPOSE. This asserted every hem
     * reading ended `@0`, on the reasoning that a hem which drifted would be scrolling with the
     * content. That was right when the hem sat on the scroller's own edge; the top hem now clears
     * the two stacked stickies (`margin-top: var(--wpg-stuck-h)`), so once a page sticks it reads
     * `on@102.7` — 42.7 of folded bar plus a 60px control row, exactly where it belongs. Asserting
     * `@0` here reported a correct hem as drifting.
     *
     * ⚠️ SO THE POSITION CLAIM HAS ONE HOME AND IT IS NOT THIS FILE. `hemOverlap.measure.ts` checks
     * the hem against the MEASURED stuck height, which is the claim that actually matters and the
     * only one that stays true as either element's height changes. What is left here is the FADE
     * OBSERVER: whether each hem is lit when there is something hidden past that edge — the
     * reading that caught a `ResizeObserver` saying nothing while its scroller's children grew.
     */
    const state = (reading: string) => reading.split("@")[0];
    for (const r of scrollers) {
      const [restTop, restBot] = String(r.hemRest).split(" ");
      expect(state(restTop), `${r.page}: a top fade at the top of the page — it reads as a rendering fault`).toBe("off");
      expect(state(restBot), `${r.page}: no bottom fade with content below the fold — the observer is not seeing the content grow`).toBe("on");
      expect(state(String(r.hemWork).split(" ")[0]), `${r.page}: no top fade once scrolled`).toBe("on");
    }
    for (const r of all) {
      expect(r.stacked, `${r.page}: a legacy fade sits inside the grid's own scroller — two gradients on one edge (${r.stacked})`).toBe("none");
    }
    /* a page that cannot scroll shows neither — nothing is hidden in either direction. Fill pages
       are excluded because they have no hems AT ALL, which the case above states directly. */
    for (const r of all.filter((x) => !x.canScroll && !x.fill)) {
      expect(String(r.hemRest).split(" ").map(state).join(" "), `${r.page}: a fade on a page with nothing hidden past either edge (${r.hemRest})`).toBe("off off");
    }

    /* ⚠️ THE TASKS VIEWPORT LOCK: the frame is a window and NEVER scrolls — all scrolling belongs
       to the internal `.tpl-zone`s. It leaked once: `.tpl-cols` says `flex: 1; min-height: 0`,
       written when its parent was a flex column, and under the grid its parent was a plain block —
       so it sized to content and stacked a second scroller outside the zone that owns them. */
    for (const r of all.filter((x) => ["To-do", "Calendar", "Noteboard"].includes(String(x.page)))) {
      expect(r.overflowRest, `${r.page}: the Tasks frame scrolled — the viewport lock has leaked and there are now two scrollers`).toBe(0);
      /* ⚠️ AND `innerScrolls` IS REPORTED, NOT ASSERTED. I wrote it as "a pane must be scrolling"
         and Calendar and Noteboard failed it — correctly: whether a pane currently overflows is a
         fact about how much data this account happens to hold, not about the layout. The claim that
         survives is the one above, that the FRAME never scrolls, which is true at every volume. */
    }

    for (const r of scrollers) {
      expect(r.wheelWorked, `${r.page}: the wheel did not move .wpg-scroll — the handler may be on the wrong element`).toBe(true);
    }
  });
}
