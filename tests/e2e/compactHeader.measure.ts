/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE COMPACT HEADER — one row, ten pages ═══════════════════════════════════════════════════
 * (ref `design-refs/compact-headers.html`, option B — image left.)
 *
 * ⚠️ THE HEIGHT IS A DERIVATION, NOT A NUMBER. `padding×2 + max(icon, title + subtitle)` — asserted
 * as arithmetic so a retune moves the design without moving the lock, and so a page that grows by
 * six pixels from something the format has not named fails even if some other page grows too.
 *
 * ⚠️ AND THE ICON'S ABSENCE IS GEOMETRY, WHICH IS WHY IT IS HERE AND NOT IN A SOURCE LOCK. "The
 * title starts at the gutter with no icon, and at gutter + 72 + gap with one" is a claim about
 * where ink lands; `indexOf` cannot see a left edge.
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

/* ⚠️ THE VISIBLE GRID, NEVER `.first()`. Three pages share `tpl-wpg` and the shell keeps every page
   mounted, toggling `display`, so the first match is routinely a page that is not on screen. */
const read = (page: Page, cls: string) => page.evaluate((c) => {
  const g = [...document.querySelectorAll(`.wpg.${c}`)].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement;
  if (!g) return null;
  const r2 = (n: number) => Math.round(n * 10) / 10;
  const mast = g.querySelector(".wsh") as HTMLElement | null;
  if (!mast) return { optedOut: true } as const;
  const row = mast.querySelector(".wsh-row") as HTMLElement;
  const icon = mast.querySelector(".wsh-icon") as HTMLElement | null;
  const title = mast.querySelector(".wsh-title") as HTMLElement;
  const sub = mast.querySelector(".wsh-sub") as HTMLElement | null;
  const cta = mast.querySelector(".wsh-cta") as HTMLElement | null;
  const cs = getComputedStyle(row);
  const iconCs = icon ? getComputedStyle(icon) : null;
  /* the ink's own left edge, not the box's — a heading's box is the column, its ink is the words */
  const inkLeft = (el: HTMLElement) => {
    const rg = document.createRange(); rg.selectNodeContents(el);
    const rects = [...rg.getClientRects()];
    return rects.length ? r2(Math.min(...rects.map((x) => x.left))) : null;
  };
  return {
    optedOut: false,
    height: r2(mast.getBoundingClientRect().height),
    rowH: r2(row.getBoundingClientRect().height),
    padY: r2(parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom)),
    gap: r2(parseFloat(cs.columnGap || cs.gap)),
    iconW: icon ? r2(icon.getBoundingClientRect().width) : -1,
    iconH: icon ? r2(icon.getBoundingClientRect().height) : -1,
    iconBg: iconCs?.backgroundColor ?? "—",
    iconBorder: iconCs ? `${iconCs.borderTopWidth} ${iconCs.borderRightWidth} ${iconCs.borderBottomWidth} ${iconCs.borderLeftWidth}` : "—",
    iconShadow: iconCs?.boxShadow ?? "—",
    iconFit: iconCs?.objectFit ?? "—",
    titleH: r2(title.getBoundingClientRect().height),
    titleSize: getComputedStyle(title).fontSize,
    titleWeight: getComputedStyle(title).fontWeight,
    titleLeft: inkLeft(title),
    /* ⚠️ THE SUBTITLE'S FLOW CONTRIBUTION, NOT ITS BOX — its `margin-top` is 4px of the row, and a
       derivation that omits it is 4px short on every page with a description. Same lesson the
       kicker's inline-block line box taught: measure what the element COSTS the column. */
    subH: sub ? r2(sub.getBoundingClientRect().height + parseFloat(getComputedStyle(sub).marginTop)) : 0,
    subSize: sub ? getComputedStyle(sub).fontSize : "—",
    subLines: sub ? Math.round(sub.getBoundingClientRect().height / parseFloat(getComputedStyle(sub).lineHeight)) : 0,
    cta: cta?.innerText?.trim() ?? null,
    ctaBg: cta ? getComputedStyle(cta).backgroundColor : "—",
    /* the row's own content box, so "the title starts at the gutter" is measured against the
       measure the format actually uses rather than against a number typed here */
    rowLeft: r2(row.getBoundingClientRect().left),
  };
}, cls);

for (const width of [1280, 1440, 1920, 2560]) {
  test(`⚠️ ONE ROW, ONE FORMAT, TEN PAGES — ${width}`, async ({ page }) => {
    const lines: string[] = [];
    let measured = 0, withIcon = 0, withCta = 0;
    for (const { name, route, cls } of PAGES) {
      await openRoute(page, route, { width, height: 900 });
      await liftMotionSuppression(page);
      const r = await read(page, cls);
      expect(r, `${name}: no grid`).not.toBeNull();
      expect(r!.optedOut, `${name} renders the grid with no masthead — every page uses the format`).toBe(false);
      const m = r as Exclude<typeof r, null | { readonly optedOut: true }>;
      measured += 1;

      /**
       * ⚠️ THE HEIGHT AS ARITHMETIC. `padding×2 + max(icon, title + subtitle)` — and the `max()` is
       * the part a sum would miss: the row centres a 72px picture against a text column, so
       * whichever is TALLER owns it. A page with no icon and no subtitle is simply shorter.
       */
      const derived = m.padY + Math.max(m.iconH > 0 ? m.iconH : 0, m.titleH + m.subH);
      expect(m.rowH, `${name}: the row is ${m.rowH}px, but padding ${m.padY} / icon ${m.iconH} / title ${m.titleH} / subtitle ${m.subH} derive ${derived} — it is spending height on something unnamed`)
        .toBeCloseTo(derived, 0);

      /* ⚠️ THE ICON IS A PICTURE ON THE GROUND. Computed values, because a page can reintroduce any
         of these from its own sheet and the rule in `pageHeader.css` would still read correctly. */
      if (m.iconW > 0) {
        withIcon += 1;
        expect(m.iconW, `${name}: the icon is not 72px`).toBeCloseTo(72, 0);
        expect(m.iconH, `${name}: the icon is not square`).toBeCloseTo(72, 0);
        expect(m.iconFit, `${name}: the icon crops instead of fitting`).toBe("contain");
        expect(m.iconBg, `${name}: the icon has a fill — it sits on the page ground`).toBe("rgba(0, 0, 0, 0)");
        expect(m.iconBorder, `${name}: the icon has a border`).toBe("0px 0px 0px 0px");
        expect(m.iconShadow, `${name}: the icon has a shadow`).toBe("none");
        /* gutter + icon + gap, to the pixel — the format's own arithmetic, not a typed number */
        expect(m.titleLeft!, `${name}: the title does not start after the icon`)
          .toBeCloseTo(m.rowLeft + m.iconW + m.gap, 0);
      } else {
        /* ⚠️ NO ICON MEANS THE TEXT STARTS AT THE GUTTER — no empty 72px well, asserted as ink. */
        expect(m.titleLeft!, `${name}: the title is inset as though an icon were there`)
          .toBeCloseTo(m.rowLeft, 0);
      }

      if (m.cta) withCta += 1;
      lines.push(`${name.padEnd(21)} h ${String(m.height).padStart(6)} · icon ${String(m.iconW).padStart(4)} · title ${m.titleSize}/${m.titleWeight} @${m.titleLeft} · sub ${m.subSize} ×${m.subLines} · cta ${m.cta ?? "—"}`);
    }
    console.log(`\n══ THE COMPACT HEADER — ${width}\n` + lines.join("\n"));
    expect(measured, "the census was not fully walked").toBe(PAGES.length);
    /* ⚠️ BOTH POPULATIONS FLOORED, so neither branch above can pass by being empty — the icon
       branch is one page today and the no-icon branch is nine. */
    expect(withIcon, "no page carries an icon — the icon branch measured nothing").toBeGreaterThan(0);
    expect(measured - withIcon, "every page carries an icon — the no-icon branch measured nothing").toBeGreaterThan(0);
    console.log(`   icons ${withIcon}/${measured} · primaries ${withCta}/${measured}`);
  });
}

/**
 * ══ THE PRIMARY CENSUS — one per page or none, and never twice ════════════════════════════════
 *
 * ⚠️ THE BRIEF ASKS FOR SIX AND THIS ASSERTS FIVE, WITH THE SIXTH NAMED. Noteboard's header cannot
 * carry `+ New note` without a `primary` seam on `TasksPageLayout` — the Tasks family's shared
 * chassis, which the Calendar session owns for the duration of this pack and which this pack is
 * forbidden to touch. Its `Pin a note` therefore stays in the tool row, on the old arrangement.
 *
 * ⚠️ THE EXCEPTION IS ONE PAGE AND ITS POPULATION IS ASSERTED, so it cannot quietly become two.
 * When the Calendar session lands, the seam is a three-line change to `TasksPageLayout` and the
 * exception comes off — that is their commit, not this one's.
 */
const EXPECTED_PRIMARY: Record<string, string | null> = {
  "Query Centre": "Log new query",
  "Contact list": "Add new agent",
  "Manuscripts": "Add manuscript",
  "Comparable titles": "Add a comp",
  "Submission packages": "New package",
  "To-do list": null,
  "Calendar": null,
  "Analytics": null,
  "Discover": null,
  /* ⚠️ THE ONE EXCEPTION — see the note above. `null` here is "blocked", not "by design". */
  "Noteboard": null,
};
/** blocked by a do-not-touch file, not by the design — asserted as exactly one */
const CHASSIS_BLOCKED = ["Noteboard"];

test("⚠️ THE PRIMARY CENSUS — five carry one, five carry none, and one of the five is blocked", async ({ page }) => {
  const lines: string[] = [];
  let carried = 0;
  for (const { name, route, cls } of PAGES) {
    await openRoute(page, route, { width: 1440, height: 900 });
    await liftMotionSuppression(page);
    const r = (await read(page, cls)) as { optedOut: false; cta: string | null; ctaBg: string };
    const want = EXPECTED_PRIMARY[name];
    expect(r.cta, `${name}: the masthead's primary is ${r.cta ?? "absent"}, the census says ${want ?? "none"}`).toBe(want);
    if (r.cta) {
      carried += 1;
      /* ⚠️ THE SHARED NEAR-BLACK, MEASURED. `--btn-ink` is #1c130f; before the token this button
         and the top bar's `+ New` were two literals one unit apart. */
      expect(r.ctaBg, `${name}: the primary is not the shared near-black`).toBe("rgb(28, 19, 15)");
    }
    lines.push(`${name.padEnd(21)} ${r.cta ?? "—"}`);
  }
  console.log("\n══ PRIMARIES (1440)\n" + lines.join("\n"));
  expect(carried, "the count of pages carrying a primary moved").toBe(5);
  expect(CHASSIS_BLOCKED, "the chassis exception grew beyond the one page it was granted for").toHaveLength(1);
});

/**
 * ⚠️ NO TOOLBAR CARRIES A PRIMARY THAT ITS HEADER ALSO CARRIES. The header's primary MOVES from the
 * toolbar rather than joining it, and the census is measured rather than intended: a duplicate is
 * the exact fault the previous guard was written to prevent, and it is what made that guard refuse
 * every control for two passes.
 */
test("⚠️ NO PAGE STATES ITS PRIMARY TWICE", async ({ page }) => {
  const lines: string[] = [];
  let checked = 0;
  for (const { name, route, cls } of PAGES) {
    await openRoute(page, route, { width: 1440, height: 900 });
    await liftMotionSuppression(page);
    const dup = await page.evaluate((c) => {
      const g = [...document.querySelectorAll(`.wpg.${c}`)].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement;
      const cta = (g.querySelector(".wsh-cta") as HTMLElement | null)?.innerText?.trim();
      if (!cta) return { label: null as string | null, inRow: 0 };
      /* the grid's control row and any page-level control strip beneath the header — never the
         page's CONTENT, where a ghost tile or a band head may legitimately offer the same verb */
      const rows = [...g.querySelectorAll(".wpg-tools, .qc-phead, .agl-toolbar, .tpl-tools")];
      const inRow = rows.filter((r) => (r as HTMLElement).innerText?.includes(cta)).length;
      return { label: cta, inRow };
    }, cls);
    checked += 1;
    if (dup.label) {
      expect(dup.inRow, `${name}: "${dup.label}" is in the header AND in a control row — the page states its verb twice`).toBe(0);
      lines.push(`${name.padEnd(21)} "${dup.label}" — header only`);
    }
  }
  console.log("\n══ NO DUPLICATE PRIMARIES (1440)\n" + lines.join("\n"));
  expect(checked, "the census was not fully walked").toBe(PAGES.length);
  expect(lines.length, "no page carries a primary — the duplicate check measured nothing").toBeGreaterThan(3);
});
