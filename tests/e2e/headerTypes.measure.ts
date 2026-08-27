/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * TWO HEADER TYPES, AND EVERY PAGE IS ONE OF THEM (pinned chrome — canonical).
 *
 * A page has a SINGLE PRIMARY SCROLLER if exactly one element scrolls the page's own body — the
 * scroll row, or one internal zone. Panes that scroll independently of each other are not one.
 *
 *   · TYPE A · PINNED — has one. Sticky slab, settles on it. No Hide, no chevron, no fold.
 *   · TYPE B · STATIC — has none. Masthead in flow, never settles. Hide folds it to a chevron.
 *
 * ⚠️ NO PAGE MAY BE BOTH, NEITHER, OR OPT OUT — and that is asserted as a PARTITION rather than as
 * two lists of page names. Page lists are what have been wrong about this app twice: the census was
 * several packs old both times, and a page changed shape under it.
 *
 * ⚠️ TYPE IS A PROPERTY OF STRUCTURE, NOT OF TODAY'S CONTENT. Calendar is Type A even when its zone
 * does not overflow at a tall viewport: it HAS one primary scroller and would settle if it had
 * anything to settle for. So the type is read from what the page DECLARES, and the declaration is
 * checked against measured structure — never inferred from whether something happens to scroll.
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
  const r = (n: number) => Math.round(n * 10) / 10;
  const sc = g.querySelector(".wpg-scroll") as HTMLElement;
  const slab = g.querySelector(".wpg-chrome") as HTMLElement | null;
  const mast = g.querySelector(".wsh") as HTMLElement | null;
  const scb = sc.getBoundingClientRect();
  const inner = [...g.querySelectorAll("*")].map((e) => e as HTMLElement)
    .filter((e) => e !== sc)
    .filter((e) => { const oy = getComputedStyle(e).overflowY; return (oy === "auto" || oy === "scroll") && e.scrollHeight - e.clientHeight > 2; })
    .map((e) => (e.className || e.tagName).toString().split(" ")[0].slice(0, 20));
  return {
    /* what the page DECLARES — the only thing the type may be read from */
    type: g.getAttribute("data-wpg-type"),
    declared: g.getAttribute("data-wpg-settle"),
    fill: g.classList.contains("wpg--fill"),
    /* the masthead may be absent — a reading, never a crash */
    optedOut: !mast,
    slabPosition: slab ? getComputedStyle(slab).position : "absent",
    slabW: slab ? r(slab.getBoundingClientRect().width) : -1,
    /* ⚠️ `clientWidth`, NOT THE RECT. The scroll row reserves a classic scrollbar gutter on BOTH
       edges (`scrollbar-gutter: stable both-edges`), so its border box is 1170 where its padding box
       is 1140 — and the slab correctly spans the padding box. Comparing against the rect reports a
       hairline that runs the full available width as "stopping short" by exactly the two reserves. */
    scrollerW: sc.clientWidth,
    hairline: slab ? getComputedStyle(slab).borderBottomWidth : "absent",
    shadow: slab ? getComputedStyle(slab).boxShadow : "absent",
    /* the two controls, counted in the DOCUMENT — the chevron is portalled out of the grid, so a
       grid-scoped count would miss exactly the leak this case exists to catch */
    hides: g.querySelectorAll(".wpg-mast-hide").length,
    badges: document.querySelectorAll(".wpg-chevfold").length,
    /* the chrome's shape, for equality WITHIN a type */
    mastH: mast ? r(mast.getBoundingClientRect().height) : -1,
    padTop: mast ? getComputedStyle(mast).paddingTop : "—",
    titleSize: (() => { const t = g.querySelector(".wsh-title") as HTMLElement | null; return t ? getComputedStyle(t).fontSize : "—"; })(),
    markW: (() => { const m = g.querySelector(".wsh-mark") as HTMLElement | null; return m ? r(m.getBoundingClientRect().width) : -1; })(),
    rowOverflow: sc.scrollHeight - sc.clientHeight,
    inner,
    slabTop: slab ? r(slab.getBoundingClientRect().top - scb.top) : -1,
  };
}, cls);

test("⚠️ EVERY PAGE IS EXACTLY ONE TYPE — asserted as a partition", async ({ page }) => {
  const rows: { name: string; s: NonNullable<Awaited<ReturnType<typeof survey>>> }[] = [];
  for (const { name, route, cls } of PAGES) {
    await openRoute(page, route, { width: 1440, height: 900 });
    await liftMotionSuppression(page);
    const s = await survey(page, cls);
    expect(s, `${name}: no grid`).not.toBeNull();
    rows.push({ name, s: s! });
  }
  console.log("\n══ HEADER TYPES\n" + rows.map(({ name, s }) =>
    `${name.padEnd(21)} ${String(s.type).padEnd(7)} · declares ${String(s.declared ?? "—").padEnd(30)} · row ${String(s.rowOverflow).padStart(5)} · inner ${s.inner.join(",") || "none"}`).join("\n"));

  const pinned = rows.filter((x) => x.s.type === "pinned").map((x) => x.name);
  const staticc = rows.filter((x) => x.s.type === "static").map((x) => x.name);
  const neither = rows.filter((x) => x.s.type !== "pinned" && x.s.type !== "static").map((x) => x.name);

  /* ⚠️ THE PARTITION, ALL THREE HALVES — no page in neither, none in both (the attribute is one
     value so "both" is impossible by construction, and the union covering all ten is the claim). */
  expect(neither, `${neither.join(", ")} declare no header type at all`).toEqual([]);
  expect(pinned.length + staticc.length, "the two types do not cover every page").toBe(PAGES.length);
  expect(pinned.length, "no page is pinned — the partition would be vacuous").toBeGreaterThan(0);
  expect(staticc.length, "no page is static — the partition would be vacuous").toBeGreaterThan(0);

  /* ⚠️ AND NO PAGE HAS OPTED OUT OF THE MASTHEAD. Kept from the earlier repair: a page silently
     leaving the system is what a census exists to catch, and it once took three locks down with it. */
  const opted = rows.filter((x) => x.s.optedOut).map((x) => x.name);
  expect(opted, `${opted.join(", ")} render the grid with no masthead — page headers behave identically across the app`).toEqual([]);

  /**
   * ⚠️ THE DECLARATION IS CHECKED AGAINST MEASURED STRUCTURE, which is what stops it being a label.
   * A pinned page must NAME a scroller; a static page must name none. And a pinned page's declaration
   * must be capable of resolving — a scroll page's row, or a zone class the page carries.
   */
  for (const { name, s } of rows) {
    if (s.type === "pinned") {
      expect(s.declared, `${name} is pinned and names no primary scroller`).toBeTruthy();
      if (!s.fill) {
        expect(s.declared, `${name} is a scrolling page and does not bind its own row`).toBe(".wpg-scroll");
        expect(s.rowOverflow, `${name} is a scrolling page whose row has nothing to scroll`).toBeGreaterThan(2);
        expect(s.inner, `${name} scrolls at the row AND inside it — that is two places`).toEqual([]);
      }
    } else {
      expect(s.declared, `${name} is static and yet names a primary scroller (${s.declared})`).toBeFalsy();
      /* ⚠️ REPORTED, NOT ASSERTED: Manuscripts' row overflows ~170px at 1280 because `.msv-wrap` is
         `flex: 0 1 auto`. That is the page's own height chain and changing it is a decision. */
      if (s.rowOverflow > 2) console.log(`   ⚠ REPORTED: ${name} is static and its ROW scrolls by ${s.rowOverflow} — its own height chain`);
    }
  }
});

test("⚠️ TYPE A · PINNED — sticky slab, no fold controls anywhere", async ({ page }) => {
  let n = 0;
  for (const { name, route, cls } of PAGES) {
    await openRoute(page, route, { width: 1440, height: 900 });
    await liftMotionSuppression(page);
    const s = (await survey(page, cls))!;
    if (s.type !== "pinned") continue;
    n += 1;
    expect(s.slabPosition, `${name}: a pinned page's slab is not sticky`).toBe("sticky");
    expect(s.slabTop, `${name}: the slab does not start at the scroller's top`).toBeCloseTo(0, 0);
    /* the base hairline spans the WINDOW, not the masthead's measure */
    expect(s.slabW, `${name}: the slab is ${s.slabW} against a ${s.scrollerW} scrollport — its hairline stops short of the window`).toBeCloseTo(s.scrollerW, 0);
    expect(parseFloat(s.hairline), `${name}: the slab has no base hairline`).toBeGreaterThan(0);
    /* ⚠️ THE RESTING SHADOW IS PRESENT AND TRANSPARENT, NOT ABSENT — it is declared at alpha 0 so
       the pin has something to interpolate FROM; a shadow that appeared out of `none` would snap.
       So the claim is that it paints nothing yet, not that it does not exist. */
    const restAlpha = /rgba?\([^)]*?(?:,\s*([\d.]+))?\)/.exec(String(s.shadow));
    expect(s.shadow === "none" || (restAlpha && parseFloat(restAlpha[1] ?? "1") === 0),
      `${name}: the slab paints a shadow before anything has scrolled (${s.shadow})`).toBeTruthy();
    /* ⚠️ ZERO FOLD CONTROLS — structurally, not hidden by CSS. The badge is counted across the whole
       DOCUMENT because it is portalled out of the grid: a folded page once left its chevron in the
       shared window wrapper and it floated over whatever page came next. */
    expect(s.hides, `${name}: a pinned page renders Hide — it reclaims its strip by scrolling`).toBe(0);
    expect(s.badges, `${name}: a chevron badge is in the document on a pinned page`).toBe(0);
  }
  expect(n, "no pinned page was measured").toBeGreaterThan(4);
});

test("⚠️ TYPE B · STATIC — in flow, one Hide, no settle", async ({ page }) => {
  let n = 0;
  for (const { name, route, cls } of PAGES) {
    await openRoute(page, route, { width: 1440, height: 900 });
    await liftMotionSuppression(page);
    const s = (await survey(page, cls))!;
    if (s.type !== "static") continue;
    n += 1;
    /**
     * ⚠️ THE CLAIM IS "NOT STICKY", NOT "EXACTLY `static`" — and pinning the exact keyword was
     * asserting an implementation detail rather than the Type B contract. That contract is that the
     * masthead sits IN FLOW and never pins; `relative` satisfies it as completely as `static` does,
     * and the slab now needs to be `relative` because the fold control is a child of it rather than
     * of the measure it collapses (see the note in `WorkspacePageGrid`).
     */
    expect(s.slabPosition, `${name}: a static page's slab is sticky — nothing it could pin to ever moves`).not.toBe("sticky");
    expect(["static", "relative"], `${name}: a static page's slab is positioned out of flow (${s.slabPosition})`).toContain(s.slabPosition);
    expect(s.hides, `${name}: a static page renders ${s.hides} Hide controls; it needs exactly one`).toBe(1);
    expect(s.badges, `${name}: a chevron is showing while the masthead is not folded`).toBe(0);
    /* ⚠️ NO SETTLE BOUND — scrolling anything on this page must leave the chrome alone. Its panes
       scroll independently; a masthead settling because a list moved inside one pane would report
       the page as being worked on when a corner of it was. */
    await page.evaluate((c) => {
      const g = [...document.querySelectorAll(`.wpg.${c}`)].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement;
      for (const e of [...g.querySelectorAll("*")].map((x) => x as HTMLElement)) {
        const oy = getComputedStyle(e).overflowY;
        if ((oy === "auto" || oy === "scroll") && e.scrollHeight - e.clientHeight > 2) e.scrollTop = 400;
      }
    }, cls);
    await page.waitForTimeout(700);
    const after = (await survey(page, cls))!;
    expect(after.titleSize, `${name}: the chrome settled when a pane scrolled — a static page never settles`).toBe(s.titleSize);
  }
  expect(n, "no static page was measured").toBeGreaterThan(0);
});

test("⚠️ CHROME IS IDENTICAL WITHIN EACH TYPE", async ({ page }) => {
  /* ⚠️ WITHIN, NOT ACROSS. The two types differ by design — one is sticky and settles, the other is
     in flow and folds — so a single cross-page comparison would be asserting that difference away.
     What must hold is that no page inside a type is arranged specially. */
  const seen: Record<string, { name: string; k: string }[]> = { pinned: [], static: [] };
  for (const { name, route, cls } of PAGES) {
    await openRoute(page, route, { width: 1440, height: 900 });
    await liftMotionSuppression(page);
    const s = (await survey(page, cls))!;
    /* the masthead's own shape — height varies legitimately with a missing description, so the
       comparison is of the declared type's chrome, not of every pixel */
    seen[s.type!].push({ name, k: `pos ${s.slabPosition} · hairline ${s.hairline} · pad ${s.padTop} · title ${s.titleSize} · mark ${s.markW}` });
  }
  for (const [type, rows] of Object.entries(seen)) {
    const vals = [...new Set(rows.map((r) => r.k))];
    expect(vals, `${type} pages have different chrome: ${rows.map((r) => `${r.name} → ${r.k}`).join(" | ")}`).toHaveLength(1);
    expect(rows.length, `no ${type} page was measured`).toBeGreaterThan(0);
  }
  console.log("\n══ CHROME BY TYPE\n" + Object.entries(seen).map(([t, r]) => `${t.padEnd(7)} ${r.length} pages · ${r[0]?.k}`).join("\n"));
});
