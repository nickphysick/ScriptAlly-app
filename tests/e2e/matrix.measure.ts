/**
 * THE ACCEPTANCE MATRIX — every in-scope page, both viewports, on the deployed dev build.
 *
 * ⚠️ CROSS-PAGE EQUALITY, NOT CONSTANTS. The standard is "identical to every other page", so the
 * run collects each page's readings and compares them to each other at the end. A constant would
 * pass while all ten drifted together.
 *
 * ⚠️ A WHEEL GESTURE, NOT A `scrollTop` WRITE. A write moves the element you chose; a wheel moves
 * whatever the browser decides is under the pointer, which is the only thing that catches a
 * handler attached to the wrong element.
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

const readHeaderState = (page: Page) => page.evaluate(() => {
  const r = (n: number) => Math.round(n * 10) / 10;
  const g = [...document.querySelectorAll(".wpg")].find((x) => x.getBoundingClientRect().height > 0) as HTMLElement;
  if (!g) return null;
  const row = g.querySelector(".wpg-plate") as HTMLElement;
  const wsh = g.querySelector(".wsh") as HTMLElement;
  const inner = g.querySelector(".wsh-row") as HTMLElement;
  const sc = g.querySelector(".wpg-scroll") as HTMLElement;
  const mark = g.querySelector(".wsh-mark") as HTMLElement | null;
  const title = g.querySelector(".wsh-title") as HTMLElement | null;
  const W = document.documentElement.clientWidth;
  const hb = wsh.getBoundingClientRect(), rb = row.getBoundingClientRect(), sb = sc.getBoundingClientRect();
  const hc = hb.top + hb.height / 2;
  return {
    working: row.classList.contains("wpg-plate--working"),
    /* ⚠️ READ FROM THE DOM, NEVER A LIST OF PAGE NAMES. `fill` is a prop; a hand-kept list of "the
       fill pages" named Comparable titles, which does not pass it, and omitted Manuscripts, which
       does. The class is the page saying so itself. */
    fill: g.classList.contains("wpg--fill"),
    rowH: r(rb.height), headerH: r(hb.height),
    /* ⚠️ THE STRIP'S DISTANCE FROM THE WINDOW'S TOP EDGE — the last place a page could still
       disagree about the header, and it did: five different page insets above the grid put this
       at 87.3, 98.3, 101.3, 103.3 and 109.3 while every reading INSIDE the strip matched. */
    headerTop: r(hb.top),
    /* every control in the strip, whatever class it wears */
    btnH: [...new Set([...inner.querySelectorAll("button, a[role='button'], [class*='btn'], [class*='chip']")]
      .filter((el) => el.getBoundingClientRect().height > 0)
      .map((el) => r(el.getBoundingClientRect().height)))].sort((x, y) => x - y),
    /* ⚠️ THE CHAIN FROM THE SCROLL ROW TO THE CONTENT — anything declaring a width, a cap, an auto
       margin or a side padding between them is a page re-doing the grid's job. Query Centre's
       frame did exactly that through a `calc` that named the shared token, so its content sat
       160px in from each edge against every other page's 80. */
    chain: (() => {
      const out: string[] = [];
      let el = sc.firstElementChild as HTMLElement | null;
      for (let i = 0; el && i < 3; i += 1) {
        const c = getComputedStyle(el);
        const bad: string[] = [];
        if (c.maxWidth !== "none") bad.push(`maxW ${c.maxWidth}`);
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
    contentL: (() => {
      const first = sc.firstElementChild as HTMLElement | null;
      return first ? r(first.getBoundingClientRect().left - sb.left) : -1;
    })(),
    /* anything inline with the title — PRO pills, badges — by font size */
    pillFs: [...new Set((title ? [...title.querySelectorAll("*")] : [])
      .filter((el) => el.getBoundingClientRect().height > 0)
      .map((el) => getComputedStyle(el).fontSize))],
    titlePx: title ? getComputedStyle(title).fontSize : "—",
    /* ⚠️ THE WHOLE REGISTER, NOT JUST THE SIZE (§4). The working title is a different VOICE —
       family, weight, letterspacing and case all change together — so a run that compared only the
       size would pass a page that had kept Playfair at 11.5px. Reported as one string so a single
       cross-page comparison covers all five. */
    titleReg: title ? (() => {
      const c = getComputedStyle(title);
      return `${c.fontFamily.split(",")[0].replace(/"/g, "")}/${c.fontSize}/${c.fontWeight}/${c.letterSpacing}/${c.textTransform}`;
    })() : "—",
    titleInk: title ? getComputedStyle(title).color : "—",
    /* ⚠️ THE BAND'S GROUND AND ITS EDGE (ref 91) — read off the header itself, because the edge is
       the header's own border rather than a rule drawn by the row beneath it. */
    bandBg: getComputedStyle(wsh).backgroundColor,
    bandEdge: `${getComputedStyle(wsh).borderBottomWidth} ${getComputedStyle(wsh).borderBottomColor}`,
    /* and the row's floating hairline must be gone — a leftover is invisible at rest and a
       double line the moment anyone scrolls */
    ghostRule: getComputedStyle(row, "::after").content !== "none"
      && parseFloat(getComputedStyle(row, "::after").height || "0") > 0,
    markW: mark ? r(mark.getBoundingClientRect().width) : -1,
    /* the mark drops entirely when working — width AND opacity, on every page */
    markGone: mark ? (r(mark.getBoundingClientRect().width) === 0 && getComputedStyle(mark).opacity === "0") : true,
    offCentre: [...inner.children].filter((el) => {
      const b = el.getBoundingClientRect();
      return b.height > 0 && Math.abs(b.top + b.height / 2 - hc) > 0.5;
    }).map((el) => el.className),
    headerL: r(hb.left), headerR: r(W - hb.right),
    scrollL: r(sb.left), scrollR: r(W - sb.right),
    hairL: r(rb.left + parseFloat(getComputedStyle(row, "::after").left || "0")),
    hairR: r(W - (rb.right - parseFloat(getComputedStyle(row, "::after").right || "0"))),
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
    /* the gap under the hairline, paid by whichever row is first below it — and paid once */
    topGap: (() => {
      const tools = g.querySelector(".wpg-tools") as HTMLElement | null;
      const a2 = parseFloat(getComputedStyle(tools ?? sc).paddingTop) || 0;
      const b2 = tools ? parseFloat(getComputedStyle(sc).paddingTop) || 0 : 0;
      return `${a2}+${b2}`;
    })(),
    gutter: getComputedStyle(document.documentElement).getPropertyValue("--content-gutter").trim(),
    inset: getComputedStyle(document.documentElement).getPropertyValue("--header-inset").trim(),
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
      const rest = await readHeaderState(page);
      if (!rest) { rows.push({ page: label, ERROR: "no visible .wpg" }); continue; }
      await wheelOverContent(page);
      const work = await readHeaderState(page);
      // back to the top
      await page.evaluate(() => { const g=[...document.querySelectorAll(".wpg")].find(x=>x.getBoundingClientRect().height>0)!; (g.querySelector(".wpg-scroll") as HTMLElement).scrollTop = 0; });
      await page.waitForTimeout(300);
      const back = await readHeaderState(page);
      rows.push({
        page: label, canScroll: rest.overflow > 0,
        restH: rest.rowH, restTitle: rest.titlePx, restMark: rest.markW,
        restHdrL: rest.headerL, restHdrR: rest.headerR,
        wheelWorked: work!.scrollTop > 2, workedStrip: work!.working,
        workH: work!.rowH, workTitle: work!.titlePx, workMark: work!.markW,
        workHdrL: work!.headerL, workHdrR: work!.headerR,
        hairL: work!.hairL, hairR: work!.hairR,
        restTop: rest.headerTop, workTop: work!.headerTop,
        restCardH: rest.headerH, workCardH: work!.headerH,
        restBtn: rest.btnH.join("|") || "—", workBtn: work!.btnH.join("|") || "—",
        restPill: rest.pillFs.join("|") || "—", workPill: work!.pillFs.join("|") || "—",
        restReg: rest.titleReg, workReg: work!.titleReg,
        workInk: work!.titleInk, markGone: work!.markGone,
        restBg: rest.bandBg, workBg: work!.bandBg,
        restEdge: rest.bandEdge, workEdge: work!.bandEdge,
        ghost: rest.ghostRule || work!.ghostRule,
        contentL: rest.contentL, chain: rest.chain.join(" · ") || "clean",
        topGap: rest.topGap, workGap: work!.topGap,
        zeroKids: rest.zeroKids.join(" · ") || "none",
        fill: rest.fill,
        hemRest: `${rest.hemTop} ${rest.hemBot}`, hemWork: `${work!.hemTop} ${work!.hemBot}`,
        windowBg: rest.windowBg, windowEl: rest.windowEl, hemInk: rest.hemInk,
        stacked: rest.stackedFades.join(",") || "none",
        backToRest: !back!.working,
        offCentre: rest.offCentre.length + work!.offCentre.length,
        overflowRest: rest.overflow, overflowWork: work!.overflow,
        innerScrolls: rest.innerScrolls,
      });
    }
    console.log(`\n══ MATRIX ${vp.width}x${vp.height} · scrollbar ${sbw}px (${sbw >= 10 ? "CLASSIC" : "OVERLAY"})`);
    console.table(rows);
    /* ⚠️ GEOMETRY IS ASSERTED OVER *EVERY* PAGE; BEHAVIOUR ONLY OVER THE ONES THAT SCROLL. The
       first version compared everything across `scrollers` alone, which quietly excused any page
       whose content happened not to overflow — including the three Tasks pages, whose viewport
       lock means they never scroll BY DESIGN (§4). Their headers must still be the same object as
       everyone else's, and that is now checked. */
    const all = rows.filter((r) => !r.ERROR);
    const scrollers = all.filter((r) => r.canScroll);
    /* ⚠️ COMPARE LIKE WITH LIKE ON THE TITLE. "No description → the title steps up" is a stated
       rule, so a page that passes none renders 35px rather than 33 by design. Grouping by that is
       not a weakening: every other reading must still be identical across ALL pages, and within
       each title group the sizes must agree. */
    for (const key of ["restH", "restHdrL", "restHdrR"] as const) {
      const vals = [...new Set(all.map((r) => String(r[key])))];
      expect(vals, `${key} differs across pages: ${JSON.stringify(all.map((r) => [r.page, r[key]]))}`).toHaveLength(1);
    }
    /* ══ §4 — THE WORKING REGISTER IS IDENTICAL ON EVERY PAGE ═════════════════════════════════
       ⚠️ CROSS-PAGE, NOT AGAINST CONSTANTS — a literal would pass while all ten drifted together. */
    /* ⚠️ THE BAND IS THE SAME SURFACE ON EVERY PAGE — ground and edge, cross-page, not against
       constants. And the row's old hairline is asserted absent everywhere: keeping both drew two
       lines a pixel apart that did not even agree on their length. */
    /* ⚠️ LIKE WITH LIKE, AGAIN — the working columns compare across the SCROLLERS only. A page with
       no working state reports its RESTING value under `work*`, so comparing all ten flagged a
       split of white against parchment that is the mechanism working, not a page disagreeing.
       Query Centre reads white here for the same reason and is not an exception: its working state
       is mode-driven, so its band is asserted in the journeys gate, as its label already is. */
    /* ⚠️ THE WINDOW'S GROUND JOINS THE EQUALITY LIST, and it belongs in the ALL set: every page
       sits in the same window, so a page that paints its own ground under the header is the exact
       thing "one ground, painted once" forbids, and it is invisible until two pages are compared. */
    for (const key of ["restBg", "restEdge", "windowBg", "windowEl"] as const) {
      const vals = [...new Set(all.map((r) => String(r[key])))];
      expect(vals, `${key} differs across pages: ${JSON.stringify(all.map((r) => [r.page, r[key]]))}`).toHaveLength(1);
    }
    /* ⚠️ THE TWO HALVES OF THE GROUND AGREE. `.ws-work` fills `.ws-window`, so a difference can only
       show as a seam at the window's edges — and worse, it lets a change to one of them look like
       it landed while every page still displays the other. That is exactly what happened. */
    for (const r of all) {
      expect(r.windowBg, `${r.page}: the visible ground (${r.windowBg}) is not the window's own fill (${r.windowEl}) — .ws-work is painting over it`)
        .toBe(String(r.windowEl));
    }
    /**
     * ══ THE HEM RESOLVES INTO THE GROUND, MEASURED ═══════════════════════════════════════════
     *
     * ⚠️ THIS IS THE CHECK THAT WOULD HAVE CAUGHT THE LITERAL, and none of the source locks could
     * have. Both hems read a hardcoded `#ffffff` that was correct while the window was white; the
     * failure mode is not "the fade is missing" but "the fade is a slightly different white", which
     * paints a pale stripe across the top and bottom of every scroller and shows ONLY against
     * content. An empty page renders it perfectly.
     *
     * ⚠️ COMPARED AGAINST THE WINDOW'S OWN COMPUTED FILL, never a constant. A literal on both sides
     * would pass while the pair drifted together — the same reason every other reading here is
     * cross-page. Both hems are checked, because they are two declarations and only one of them
     * needs to be missed.
     */
    /* ⚠️ SCOPED TO THE PAGES THAT HAVE HEMS, and derived from the reading rather than from a list
       of page names. A `fill` page mounts none at all — its panes scroll and the row does not, so
       there is no state either hem describes — and today that is five of the ten. Naming them
       would go stale the next time a page converts; `absent` is the page saying so itself. */
    const hemmed = all.filter((r) => !String(r.hemInk).startsWith("absent"));
    expect(hemmed.length, "no page mounted a hem at all — the reading is broken, not the hems").toBeGreaterThan(0);
    for (const r of hemmed) {
      /* the pair is mounted together, so a page reporting one hem has half-rendered them */
      expect(String(r.hemRest), `${r.page}: it has hem colours but reports no hems — the two readings disagree`).not.toContain("absent");
      const [top, bot] = String(r.hemInk).split(" | ");
      for (const [edge, ink] of [["top", top], ["bottom", bot]] as const) {
        expect(ink, `${r.page}: the ${edge} hem has no opaque stop — its gradient is not a fade into anything (${r.hemInk})`)
          .not.toMatch(/^(absent|noStops)/);
        expect(ink, `${r.page}: the ${edge} hem fades from ${ink} over a ${r.windowBg} ground — a pale band across the scroller, visible only against content`)
          .toBe(String(r.windowBg));
      }
    }
    for (const key of ["workBg", "workEdge"] as const) {
      const vals = [...new Set(scrollers.map((r) => String(r[key])))];
      expect(vals, `${key} differs across pages: ${JSON.stringify(scrollers.map((r) => [r.page, r[key]]))}`).toHaveLength(1);
    }
    for (const r of all) {
      expect(r.ghost, `${r.page}: the row still draws its own hairline — with the band's edge that is two lines`).toBe(false);
    }
    /* the working band must actually differ from the resting card, or "it becomes a band" is a no-op */
    expect(String(scrollers[0]?.workBg), "the working band did not take the parchment ground").not.toBe(String(scrollers[0]?.restBg));
    /* ⚠️ AND THE THREE SURFACES ARE THREE SURFACES. The resting plate is the CARD (white), the
       window is the GROUND, and the band is the page showing through it — so the plate must not
       match the window either, or the resting header stops reading as an object laid on the page
       and becomes an invisible rectangle with a border. This is the pair the colour step was for;
       asserting only band-vs-card would let the ground drift back onto the card and say nothing. */
    expect(String(all[0]?.restBg), "the resting plate matches the window's ground — the card is invisible against the page and legible only by its border")
      .not.toBe(String(all[0]?.windowBg));
    expect(String(scrollers[0]?.workBg), "the band matches the window's ground — it has nothing to distinguish it but its hairline")
      .not.toBe(String(scrollers[0]?.windowBg));
    expect(String(scrollers[0]?.workEdge), `the band has no bottom edge: ${scrollers[0]?.workEdge}`).toMatch(/^1px rgb/);

    for (const key of ["workReg", "workInk"] as const) {
      const vals = [...new Set(scrollers.map((r) => String(r[key])))];
      expect(vals, `${key} differs across pages: ${JSON.stringify(scrollers.map((r) => [r.page, r[key]]))}`).toHaveLength(1);
    }
    /* ⚠️ AND IT IS ACTUALLY THE LABEL. The equality above would hold if every page had kept its
       masthead, so the register is also named — once, here, rather than per page. */
    const reg = String(scrollers[0]?.workReg ?? "");
    expect(reg, `the working title is not the mono label: ${reg}`).toMatch(/^JetBrains Mono\/11\.5px\/500\/[\d.]+px\/uppercase$/);
    for (const r of scrollers) {
      expect(r.markGone, `${r.page}: the mark is still drawn in the working strip`).toBe(true);
    }
    for (const key of ["workH", "workHdrL", "workHdrR", "hairL", "hairR"] as const) {
      const vals = [...new Set(scrollers.map((r) => String(r[key])))];
      expect(vals, `${key} differs across pages: ${JSON.stringify(scrollers.map((r) => [r.page, r[key]]))}`).toHaveLength(1);
    }
    /* ⚠️ THE MARK HAS TWO LEGITIMATE SIZES AND NEITHER IS A PAGE'S CHOICE, exactly like the title.
       `markHasArt` is a RULE: artwork present → 64px and bare, absent → the 38px monoline glyph on
       its plate, decided by whether the drawing exists rather than by a prop. Two of the nine marks
       are drawn today, so two pages read 64 — and as artwork lands, more will, with no call site
       edited. What must be identical is the WORKING mark, and `workMark` above asserts all nine
       collapse to the same 30. */
    for (const w of [...new Set(all.map((r) => r.restMark))]) {
      expect([38, 88], `an unexpected rest mark ${w} — only the 38px glyph and the 88px illustration are legitimate`).toContain(w);
    }

    /* ══ §1 — THE STRIP IS THE SAME OBJECT ON EVERY PAGE ══════════════════════════════════════
       ⚠️ THE HEIGHT IS THE TOKEN, NEVER THE CONTENT. 96 at rest on every page including the
       title-only ones — a page with no description centres its title in the same 96 rather than
       shrinking the card — and 52 working on every page that has a working state. */
    for (const r of all) {
      expect(r.restCardH, `${r.page}: the resting card is not 128 — its height is following its content`).toBe(128);
    }
    for (const r of scrollers) {
      expect(r.workCardH, `${r.page}: the working strip is not 52`).toBe(52);
    }
    /* ⚠️ AND IT SITS AT THE SAME PLACE ON THE PAGE. Cross-page equality in BOTH states — a page
       inset above the grid moves the strip without changing anything measurable inside it. */
    const topSame = (key: "restTop" | "workTop", set: typeof all) => {
      const vals = [...new Set(set.map((x) => String(x[key])))];
      expect(vals, `${key} differs across pages — a page-level inset above the grid: ${JSON.stringify(set.map((x) => [x.page, x[key]]))}`).toHaveLength(1);
    };
    topSame("restTop", all);
    /* ⚠️ THE WORKING TOP IS COMPARED ACROSS THE SCROLLERS ONLY, and that is not a weakening. A
       page with no working state reports its RESTING position under `workTop`, which is 18px
       lower by construction — the plate gap the strip gives back when it condenses. Comparing all
       ten flagged a split of exactly 87.3 / 69.3, i.e. exactly `--wsh-plate-gap`, which is the
       mechanism working rather than a page disagreeing. `restTop` is still checked across all ten,
       and that is the reading a page inset actually moves. */
    topSame("workTop", scrollers);
    /* ⚠️ EVERY CONTROL IN THE STRIP IS 30px WORKING, whatever class its page gave it. `.pkgw-btn`
       measured 30 here for a whole pass while being a second implementation that had simply been
       written its own working height — the check is the value, the fix was removing the copy. */
    for (const r of scrollers.filter((x) => x.workBtn !== "—")) {
      expect(r.workBtn, `${r.page}: a control in the working strip is not 30px`).toBe("30");
    }
    for (const r of all.filter((x) => x.restBtn !== "—")) {
      expect(r.restBtn, `${r.page}: a control in the resting strip is not 38px`).toBe("38");
    }
    /* ⚠️ NOTHING INLINE WITH THE TITLE KEEPS ITS REST SIZE. Discover's PRO pill held 8.5px in both
       states — it had never been written a scrolled rule, and nothing said one was missing. */
    for (const r of scrollers.filter((x) => x.restPill !== "—")) {
      expect(r.workPill, `${r.page}: something inline with the title kept its resting size through the collapse`).not.toBe(r.restPill);
    }
    const pills = [...new Set(scrollers.filter((x) => x.workPill !== "—").map((x) => String(x.workPill)))];
    expect(pills.length, `pills scale to different sizes across pages: ${JSON.stringify(scrollers.map((x) => [x.page, x.workPill]))}`).toBeLessThan(2);

    /* ⚠️ NOTHING BETWEEN THE SCROLL ROW AND THE CONTENT RE-DECLARES GEOMETRY. §4's chain rule,
       measured rather than read: the grid pays the gutter once, and a page that pays it again is
       narrower than every other page while its CSS names the correct token. */
    for (const r of all) {
      expect(r.chain, `${r.page}: something between the scroll row and the content declares its own width — ${r.chain}`).toBe("clean");
      expect(r.zeroKids, `${r.page}: a box in the scroll row measures 0 while holding rendered content — the fill chain is broken (${r.zeroKids}). The page needs the grid's \`fill\` prop.`).toBe("none");
    }
    /* ⚠️ `-1` MEANS "NO CONTENT AT ALL", NOT "AN EDGE OF -1". Analytics renders `{null}` into row
       3 — a placeholder that deliberately shows nothing rather than plausible-looking figures — so
       it has no first child to measure. Comparing its sentinel against nine real edges failed on
       the one page whose emptiness is the point. It is excluded by that sentinel and not by name,
       so any page that loses its content is excluded too — which is why the count is asserted. */
    const withContent = all.filter((x) => x.contentL !== -1);
    expect(withContent.length, "more than one page has no content in its scroll row — one is the Analytics placeholder; a second is a page that failed to render")
      .toBe(all.length - 1);
    expect([...new Set(withContent.map((x) => String(x.contentL)))],
      `the content's left edge differs across pages: ${JSON.stringify(withContent.map((x) => [x.page, x.contentL]))}`).toHaveLength(1);

    /* ══ §2 — ONE GAP, 70px, PAID ONCE ══════════════════════════════════════════════════════ */
    /**
     * ⚠️ ONE PAGE HAS A SANCTIONED OVERRIDE, AND IT IS NAMED RATHER THAN EXCUSED. Query Centre
     * starts its content 18px below the band instead of 70 — a deliberate page-scoped exception
     * (rhythm §1a): it is the most-visited workspace and earns a tighter start. Relaxing this check
     * to "whatever each page says" would let the other nine drift silently, which is the whole
     * reason it compares across pages. The exception is a literal here so adding a second one is a
     * decision someone has to write down.
     */
    /* ⚠️ 18/9 → 0/0. The page moved and the gate did not: fix pack 3 §2 took Query Centre's gap to
       zero on purpose — "the list's ground starts at the masthead rule... the split is not content
       sitting under a header; it is the page" — and this entry still described the pack before it.
       A stale exception is worse than none: it fails on correct behaviour and names the page. */
    const GAP_OVERRIDE: Record<string, [number, number]> = { "Query Centre": [0, 0] };
    for (const r of all) {
      const [first, second] = String(r.topGap).split("+").map(Number);
      const [wantRest] = GAP_OVERRIDE[String(r.page)] ?? [44, 35];
      expect(first, `${r.page}: the resting gap under the hairline is ${first}, not ${wantRest}`).toBe(wantRest);
      expect(second, `${r.page}: the gap is paid twice — the toolbar row AND the scroll row`).toBe(0);
    }
    /* ⚠️ AND THE WORKING GAP, which the first version left unasserted — it read the RESTING value
       in both columns, so §2 could have shipped without halving anything and the case would have
       passed. The reclaim in §3 is computed from the difference between these two, so an
       unasserted working value is also an unasserted invariance. */
    for (const r of scrollers) {
      const [first, second] = String(r.workGap).split("+").map(Number);
      const [, wantWork] = GAP_OVERRIDE[String(r.page)] ?? [44, 35];
      expect(first, `${r.page}: the working gap is ${first}, not ${wantWork} — the strip is lighter and takes less separation`).toBe(wantWork);
      expect(second, `${r.page}: the working gap is paid twice`).toBe(0);
    }

    /* ══ §3 — THE HEMS ARE PRESENT, PINNED, AND EACH IS A STATE ═════════════════════════════
       ⚠️ THE POSITION IS THE POINT. A hem inside the scrollport scrolls with the content, so it
       would drift by exactly `scrollTop` — `@0` in both states is what proves it did not. */
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
      for (const reading of [String(r.hemRest), String(r.hemWork)].flatMap((x) => x.split(" "))) {
        expect(reading, `${r.page}: a hem drifted off the row's edge — it is scrolling with the content (${r.hemRest} / ${r.hemWork})`)
          .toMatch(/@0$/);
      }
    }
    /* at the top of a scrolling page: no top hem, bottom hem lit. Once scrolled: top hem lit. */
    /* ⚠️ ONE ASSERTION PER HEM, because a combined one blames the wrong element. The first version
       compared the pair as a string and reported "a top fade at the top of the page" about a
       reading whose TOP hem was correct and whose bottom hem was dark — I chased the wrong half
       until I printed the value. A message that names something the reading does not say is worse
       than no message. */
    for (const r of scrollers) {
      const [restTop, restBot] = String(r.hemRest).split(" ");
      expect(restTop, `${r.page}: a top fade at the top of the page — it reads as a rendering fault`).toBe("off@0");
      expect(restBot, `${r.page}: no bottom fade with content below the fold — the observer is not seeing the content grow`).toBe("on@0");
      expect(String(r.hemWork).split(" ")[0], `${r.page}: no top fade once scrolled`).toBe("on@0");
    }
    for (const r of all) {
      expect(r.stacked, `${r.page}: a legacy fade sits inside the grid's own scroller — two gradients on one edge (${r.stacked})`).toBe("none");
    }
    /* a page that cannot scroll shows neither — nothing is hidden in either direction. Fill pages
       are excluded because they have no hems AT ALL, which the case above states directly. */
    for (const r of all.filter((x) => !x.canScroll && !x.fill)) {
      expect(r.hemRest, `${r.page}: a fade on a page with nothing hidden past either edge`).toBe("off@0 off@0");
    }

    /* ⚠️ THE TASKS VIEWPORT LOCK: the frame is a window and NEVER scrolls — all scrolling belongs
       to the internal `.tpl-zone`s. It leaked once: `.tpl-cols` says `flex: 1; min-height: 0`,
       written when its parent was a flex column, and under the grid its parent was a plain block —
       so it sized to content and stacked a second scroller outside the zone that owns them. */
    for (const r of all.filter((x) => ["To-do", "Calendar", "Noteboard"].includes(String(x.page)))) {
      expect(r.overflowRest, `${r.page}: the Tasks frame scrolled — the viewport lock has leaked and there are now two scrollers`).toBe(0);
      expect(r.workedStrip, `${r.page}: an internal-pane page stripped — it has no scroll of its own to strip on`).toBe(false);
    }
    for (const size of [...new Set(all.map((r) => r.restTitle))]) {
      expect([38, 40], `an unexpected rest title size ${size} — only the 38px default and the 40px solo step are legitimate`)
        .toContain(parseInt(String(size), 10));
    }
    /* ⚠️ `workMark` LEFT THE EQUALITY LIST because the mark is GONE — every page reads 0, which the
       markGone check states directly and by its actual meaning rather than as a shared number. */
    expect([...new Set(scrollers.map((r) => String(r.workTitle)))],
      `the WORKING title differs across pages — the solo step applies at rest only: ${JSON.stringify(scrollers.map((r) => [r.page, r.workTitle]))}`)
      .toHaveLength(1);
    for (const r of scrollers) {
      expect(r.wheelWorked, `${r.page}: the wheel did not move .wpg-scroll — the handler may be on the wrong element`).toBe(true);
      expect(r.workedStrip, `${r.page}: scrolled but did not strip`).toBe(true);
      expect(r.backToRest, `${r.page}: did not return to the resting card at the top`).toBe(true);
      expect(r.overflowWork, `${r.page}: stripping changed max scroll — the invariance padding is not working`).toBe(r.overflowRest);
      expect(r.offCentre, `${r.page}: children off the header's centre`).toBe(0);
    }
  });
}
