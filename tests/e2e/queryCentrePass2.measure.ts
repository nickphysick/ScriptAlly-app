/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PASS 2 — the shared 1480 cap, the fixed search, the popovers' clipping, the tint ladder, and the
 * cards that render without a leaf.
 *
 * ⚠️ THE CAP IS A CLAIM ABOUT FIVE ELEMENTS AGREEING, not about one width. The ref caps `.quick`,
 * `.toolbar`, `.active`, `.stage` and `.pfoot` at 1480 and centres each; measuring only the grid
 * would pass on a page whose toolbar ran the full width beside it. So every row's left edge is
 * compared to the grid's.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const REF = "file://" + resolve(process.cwd(), "design-refs/query-centre.html");

/** Every row that must share the cap: [role, ref selector, built selector]. */
const ROWS: [string, string, string][] = [
  ["quick", ".quick", ".qcc-quick"],
  /* ⚠️ RETARGETED, LAW UNCHANGED: "every row shares the cap". The browsing toolbar is `.qcc-tb`
     since 2b — the ref's labelled row — where it used to be the record view's `.f12-lhead`. */
  ["toolbar", ".toolbar", ".qcc-tb"],
  ["stage", ".stage", ".qcc-stage"],
  ["grid", ".grid", ".qcc-grid"],
  ["foot", ".pfoot", ".qcc-foot"],
];

async function rowGeometry(page: import("@playwright/test").Page, which: 0 | 1) {
  return page.evaluate(
    ({ rows, idx }) => {
      const out: Record<string, { w: number; left: number; cols: number } | null> = {};
      for (const r of rows) {
        const el = document.querySelector(r[1 + idx] as string) as HTMLElement | null;
        if (!el) { out[r[0] as string] = null; continue; }
        const b = el.getBoundingClientRect();
        out[r[0] as string] = {
          w: Math.round(b.width),
          left: Math.round(b.left),
          cols: getComputedStyle(el).gridTemplateColumns.split(" ").filter(Boolean).length,
        };
      }
      return out;
    },
    { rows: ROWS as unknown as unknown[][], idx: which },
  );
}

test("pass 2 — cap, search, popovers, ladder, leaves", async ({ page }) => {
  const out: Record<string, unknown> = {};

  /* ── the ref, at both widths ── */
  for (const width of [1280, 1440, 1920, 2560]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(REF);
    await page.waitForTimeout(500);
    out[`ref@${width}`] = await rowGeometry(page, 0);
    out[`refSearch@${width}`] = await page.evaluate(() => {
      const s = document.querySelector(".toolbar .search") as HTMLElement | null;
      return s ? { w: Math.round(s.getBoundingClientRect().width), flex: getComputedStyle(s).flex } : null;
    });
  }
  /* the ladder, read off the ref rather than off a rulesheet that does not exist here */
  await page.goto(REF);
  out.refLadder = await page.evaluate(() => {
    const cs = getComputedStyle(document.documentElement);
    const keys = ["out-1", "out-2", "out-3", "in-1", "in-2", "in-3", "offer", "closed"];
    return Object.fromEntries(keys.map((k) => [k, cs.getPropertyValue(`--stage-${k}`).trim()]));
  });
  out.refCardBands = await page.evaluate(() =>
    [...document.querySelectorAll(".card")].slice(0, 8).map((c) => ({
      cls: [...c.classList].find((x) => x.startsWith("s-") || x === "offer" || x === "closed") ?? "(none)",
      status: c.querySelector(".word")?.textContent ?? "",
      band: getComputedStyle(c.querySelector(".band") as Element).backgroundColor,
      image: getComputedStyle(c.querySelector(".band") as Element).backgroundImage,
    })),
  );

  /* ── the build, at both widths ── */
  for (const width of [1280, 1440, 1920, 2560]) {
    await openRoute(page, "/queries", { width, height: 900 });
    await expect(page.locator(".qcc").first()).toBeVisible({ timeout: 30_000 });
    out[`built@${width}`] = await rowGeometry(page, 1);
    /**
     * ⚠️ CARDS PER ROW, NOT `gridTemplateColumns.split(" ").length`. The template is what the sheet
     * ASKS for; how many cards actually share a row's top is what the reader sees, and only the
     * second survives a card that spans or a track that collapses.
     *
     * ⚠️ AND THE CENTRING IS THE TWO MARGINS COMPARED, not the width against a number. A column
     * capped correctly but pinned left measures the right width and is not centred.
     */
    out[`rowShape@${width}`] = await page.evaluate(() => {
      const col = document.querySelector(".qcc-col") as HTMLElement | null;
      const grid = document.querySelector(".qcc-grid") as HTMLElement | null;
      const cards = [...document.querySelectorAll<HTMLElement>(".qcc")];
      if (!grid || !col || !cards.length) return null;
      const tops = cards.map((c) => Math.round(c.getBoundingClientRect().top));
      const firstTop = tops[0];
      const g = grid.getBoundingClientRect();
      const host = col.parentElement!.getBoundingClientRect();
      const tb = document.querySelector(".qcc-tb") as HTMLElement | null;
      return {
        perRow: tops.filter((t) => t === firstTop).length,
        template: getComputedStyle(grid).gridTemplateColumns,
        leftGap: Math.round(g.left - host.left),
        rightGap: Math.round(host.right - g.right),
        toolbarLeft: tb ? Math.round(tb.getBoundingClientRect().left) : null,
        gridLeft: Math.round(g.left),
      };
    });
    out[`builtSearch@${width}`] = await page.evaluate(() => {
      const quick = document.querySelector(".qcc-quick") as HTMLElement | null;
      const scope = quick?.closest(".wpg") as HTMLElement | null;
      const s = (scope?.querySelector(".qcc-tb-search") ?? scope?.querySelector(".f12-lsearch")) as HTMLElement | null;
      return s ? { w: Math.round(s.getBoundingClientRect().width), flex: getComputedStyle(s).flex } : null;
    });
  }

  /* ── §5 · every card must have a leaf, and its absence must have a reason ── */
  out.leaves = await page.evaluate(() => {
    const cards = [...document.querySelectorAll<HTMLElement>(".qcc")];
    const missing = cards.filter((c) => !c.querySelector(".qcc-leaf"));
    return {
      total: cards.length,
      withLeaf: cards.length - missing.length,
      missing: missing.slice(0, 6).map((c) => ({
        who: c.querySelector(".qcc-nm")?.textContent ?? "?",
        status: c.querySelector(".qcc-word")?.textContent ?? "?",
        height: Math.round(c.getBoundingClientRect().height),
      })),
      /* ⚠️ HEIGHT MUST NOT DEPEND ON THE LEAF. Two distinct heights among cards in one row is the
         symptom the brief describes; reported as the SET so a third cannot appear unnoticed. */
      heights: [...new Set(cards.map((c) => Math.round(c.getBoundingClientRect().height)))].sort((a, b) => a - b),
    };
  });

  /* ── §4 · what the built bands actually paint ── */
  out.builtCardBands = await page.evaluate(() =>
    [...document.querySelectorAll(".qcc")].slice(0, 8).map((c) => ({
      cls: [...c.classList].filter((x) => x.startsWith("qcc--")).join(" "),
      status: c.querySelector(".qcc-word")?.textContent ?? "",
      band: getComputedStyle(c.querySelector(".qcc-band") as Element).backgroundColor,
      image: getComputedStyle(c.querySelector(".qcc-band") as Element).backgroundImage,
    })),
  );

  /**
   * ── §3 · the popovers ──
   * ⚠️ TWO WIDTHS, AND THE NARROW ONE IS THE POINT. At 1280 the §1 cap and the §2 search between
   * them pull the trio far enough left that nothing overflows whatever the alignment does — so a
   * check run only there proves the edge rule is present, never that it works. 1024 is where a
   * trigger actually crosses the midline.
   */
  await openRoute(page, "/queries", { width: 1280, height: 900 });
  await expect(page.locator(".qcc").first()).toBeVisible({ timeout: 30_000 });
  const pops: Record<string, unknown> = {};
  for (const name of ["Filter", "Group", "Sort"]) {
    /* ⚠️ BY TEXT NOW — the 2b toolbar's buttons carry their label on the face, so the aria-label
       the icon triggers needed is gone. Probing for it reported "trigger not found" about three
       buttons that were on screen. */
    const trig = page.locator(".qcc-tb-btn", { hasText: new RegExp(`^${name}`, "i") }).first();
    if (!(await trig.count())) { pops[name] = "trigger not found"; continue; }
    await trig.click();
    await page.waitForTimeout(350);
    pops[name] = await page.evaluate(() => {
      const panel = document.querySelector(".f12-pop, [role='dialog'], .sa-portal-menu") as HTMLElement | null;
      if (!panel) return { open: false };
      const b = panel.getBoundingClientRect();
      /* ⚠️ THE OFFSET PARENT ANSWERS "IS THIS PORTALLED" — a panel inside the grid is clipped by
         it whatever its own overflow says. */
      let clipper: string | null = null;
      for (let p = panel.parentElement; p && p !== document.body; p = p.parentElement) {
        const o = getComputedStyle(p);
        if (o.overflow !== "visible" || o.overflowX !== "visible" || o.overflowY !== "visible") {
          clipper = p.className || p.tagName; break;
        }
      }
      return {
        open: true,
        right: Math.round(b.right), bottom: Math.round(b.bottom),
        vw: window.innerWidth, vh: window.innerHeight,
        overflowsRight: b.right > window.innerWidth,
        overflowsBottom: b.bottom > window.innerHeight,
        offsetParent: (panel.offsetParent as HTMLElement | null)?.className ?? "(none/body)",
        clippingAncestor: clipper,
        rows: panel.querySelectorAll("button, [role='option'], label").length,
        columns: getComputedStyle(panel).gridTemplateColumns,
      };
    });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
  }
  out.popovers = pops;
  out.toolbarText = await page.evaluate(() => {
    const tb = document.querySelector(".qcc-tb") as HTMLElement | null;
    return tb ? (tb.textContent ?? "").replace(/\s+/g, " ").trim() : "";
  });
  /* ⚠️ READ WITH THE POPOVER OPEN, or "no Agency" is true of a panel that is not rendered. */
  {
    const trig = page.locator('.qcc-tb-btn', { hasText: "Filter" }).first();
    if (await trig.count()) {
      await trig.click();
      await page.waitForTimeout(350);
      out.filterHasAgency = await page.evaluate(() => {
        const panel = document.querySelector(".f12-pop, [role='dialog']") as HTMLElement | null;
        if (!panel) return "panel not found" as unknown as boolean;
        return [...panel.querySelectorAll<HTMLElement>(".f12-lbl, .f12-sect-h")]
          .some((h) => (h.textContent ?? "").trim().toLowerCase() === "agency");
      });
      await page.keyboard.press("Escape");
      await page.waitForTimeout(200);
    } else out.filterHasAgency = "Filter trigger not found" as unknown as boolean;
  }

  /* the narrow pass — same three, plus where each trigger sits relative to the midline */
  await openRoute(page, "/queries", { width: 1024, height: 720 });
  await expect(page.locator(".qcc").first()).toBeVisible({ timeout: 30_000 });
  const narrow: Record<string, unknown> = {};
  for (const name of ["Filter", "Group", "Sort"]) {
    const trig = page.locator(".qcc-tb-btn", { hasText: new RegExp(`^${name}`, "i") }).first();
    if (!(await trig.count())) { narrow[name] = "trigger not found"; continue; }
    const tb = await trig.boundingBox();
    await trig.click();
    await page.waitForTimeout(350);
    narrow[name] = await page.evaluate((triggerLeft) => {
      const panel = document.querySelector(".f12-pop, [role='dialog'], .sa-portal-menu") as HTMLElement | null;
      if (!panel) return { open: false };
      const b = panel.getBoundingClientRect();
      return {
        open: true,
        triggerLeft, pastMidline: triggerLeft > window.innerWidth / 2,
        right: Math.round(b.right), bottom: Math.round(b.bottom),
        vw: window.innerWidth, vh: window.innerHeight,
        overflowsRight: b.right > window.innerWidth,
        overflowsBottom: b.bottom > window.innerHeight,
      };
    }, Math.round(tb?.x ?? 0));
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
  }
  out.popoversNarrow = narrow;

  /**
   * ⚠️ THE RULESHEET'S "WHERE THE TINT APPEARS" — AUDITED, NOT ASSERTED. Items 3 and 5 name the
   * RECORD view's header band and its list-row tint, which this pass does not touch; reading them
   * is how the report can say whether the built page contradicts the sheet rather than guessing.
   * Reported so a gap is visible; not asserted, because failing a lock on a surface this commit
   * deliberately leaves alone would be a red nobody can act on.
   */
  const tintAudit = await (async () => {
    const card = page.locator(".qcc").first();
    if (!(await card.count())) return { ran: false };
    const stage = await card.getAttribute("class");
    await card.click();
    await page.waitForTimeout(1200);
    return {
      ran: true,
      cardStageClass: (stage ?? "").split(" ").find((c) => c.startsWith("qcc--s-")) ?? "(none)",
      ...(await page.evaluate(() => {
        const vis = (s: string) =>
          [...document.querySelectorAll<HTMLElement>(s)].find((e) => e.getBoundingClientRect().height > 0) ?? null;
        const bg = (e: HTMLElement | null) => (e ? getComputedStyle(e).backgroundColor : null);
        const root = getComputedStyle(document.documentElement);
        const ladder = Object.fromEntries(
          ["out-1", "out-2", "out-3", "in-1", "in-2", "in-3", "offer", "closed"]
            .map((k) => [k, root.getPropertyValue(`--stage-${k}`).trim()]),
        );
        /* the record view's identity band, whatever this page calls it */
        const header = vis(".qc-heroband") ?? vis(".f12-hero") ?? vis(".qc-hero") ?? vis(".qc-idband");
        const selectedRow = vis(".f12-row.is-sel") ?? vis(".f12-row[aria-selected='true']") ?? vis(".f12-row-on");
        return {
          recordViewReached: !!vis(".f12-body"),
          headerFound: !!header,
          headerBand: bg(header),
          selectedRowFound: !!selectedRow,
          selectedRowBand: bg(selectedRow),
          ladder,
          /* does ANYTHING in the record view paint a ladder token? */
          stageTokenUsersInRecord: [...document.querySelectorAll<HTMLElement>(".f12-body *")]
            .filter((e) => {
              const c = getComputedStyle(e).backgroundColor;
              return Object.values(ladder).some((hex) => {
                if (!hex) return false;
                const n = hex.replace("#", "");
                const rgb = `rgb(${parseInt(n.slice(0,2),16)}, ${parseInt(n.slice(2,4),16)}, ${parseInt(n.slice(4,6),16)})`;
                return c === rgb;
              });
            }).length,
        };
      })),
    };
  })();
  out.tintAudit = tintAudit;

  mkdirSync("reports", { recursive: true });
  writeFileSync("reports/query-centre-pass2.json", JSON.stringify(out, null, 2));
  expect(Object.keys(out).length, "the probe recorded nothing").toBeGreaterThan(6);

  /* ── §1 · the cap, and every row sharing it ─────────────────────────────────────────────── */
  for (const w of [1440, 2560] as const) {
    const rows = out[`built@${w}`] as Record<string, { w: number; left: number; cols: number } | null>;
    const present = Object.entries(rows).filter(([, v]) => v);
    expect(present.length, `only ${present.length} of the capped rows were found at ${w}`).toBe(ROWS.length);
    /* ⚠️ THE CLAIM IS THAT THEY AGREE, not that each equals a number. One capped column cannot
       disagree with itself; five separate caps can, and that is the fault worth guarding. */
    const lefts = new Set(present.map(([, v]) => v!.left));
    expect(lefts.size, `rows do not share a left edge at ${w}: ${[...lefts].join(", ")}`).toBe(1);
    const widths = new Set(present.map(([, v]) => v!.w));
    expect(widths.size, `rows do not share a width at ${w}: ${[...widths].join(", ")}`).toBe(1);
    expect(rows.grid!.w, `the cap is not honoured at ${w}`).toBeLessThanOrEqual(1360);
  }
  /**
   * ⚠️ THE CAP IS 1360 NOW, AND THE COLUMN COUNT IS NO LONGER DERIVED FROM IT. Pass 2's assertions
   * here — "4 columns at 2560", "3 at 1440" — were reading `gridTemplateColumns.split(" ").length`
   * against an `auto-fill` track floor, so they were really asserting arithmetic between a floor
   * and a container width. `repeat(3, …)` makes the count a constant, and the 2b block below
   * asserts something stronger in its place: how many cards actually SHARE A ROW.
   */
  expect((out["built@2560"] as Record<string, { w: number }>).grid.w, "the 1360 cap does not bite at 2560").toBe(1360);

  /* ── 2b · three fixed columns, centred, toolbar aligned ─────────────────────────────────── */
  for (const w of [1280, 1440, 1920, 2560] as const) {
    const r = out[`rowShape@${w}`] as Record<string, number | string> | null;
    expect(r, `no grid measured at ${w}`).toBeTruthy();
    expect(r!.perRow, `${w}: ${r!.perRow} cards in the first row, not 3`).toBe(3);
    expect(String(r!.template).split(" ").length, `${w}: the template is not three tracks`).toBe(3);
    /* centred: the two margins agree within a pixel of rounding */
    expect(Math.abs((r!.leftGap as number) - (r!.rightGap as number)),
      `${w}: not centred — left ${r!.leftGap}, right ${r!.rightGap}`).toBeLessThanOrEqual(1);
    expect(Math.abs((r!.toolbarLeft as number) - (r!.gridLeft as number)),
      `${w}: the toolbar does not start where the grid does`).toBeLessThanOrEqual(1);
  }

  /* ── 2b · the toolbar is labelled and states its current values ──────────────────────────── */
  const tbText = out.toolbarText as string;
  for (const word of ["Filter", "Group", "Sort", "Log new query"]) {
    expect(tbText, `the toolbar does not say "${word}"`).toContain(word);
  }
  expect(tbText, "Group does not show its current value").toMatch(/Group\s*None/i);
  expect(tbText, "Sort does not show its current value").toMatch(/Sort\s*Last activity/i);

  /* ── 2b · no Agency facet ────────────────────────────────────────────────────────────────── */
  expect(out.filterHasAgency, "the Filter popover still offers an Agency facet").toBe(false);

  /* ── §2 · the search does not grow ───────────────────────────────────────────────────────── */
  for (const w of [1440, 2560] as const) {
    const sr = out[`builtSearch@${w}`] as { w: number; flex: string } | null;
    expect(sr, `no search field at ${w}`).toBeTruthy();
    expect(sr!.w, `the search grew at ${w}`).toBe(260);
  }

  /* ── §3 · nothing clipped, nothing off-screen ────────────────────────────────────────────── */
  for (const [name, v] of Object.entries(out.popovers as Record<string, Record<string, unknown>>)) {
    expect(v.open, `${name} did not open`).toBe(true);
    expect(v.clippingAncestor, `${name} sits inside a clipping ancestor`).toBeNull();
    expect(v.overflowsRight, `${name} runs off the right edge (right=${v.right} vw=${v.vw})`).toBe(false);
    expect(v.overflowsBottom, `${name} runs off the bottom (bottom=${v.bottom} vh=${v.vh})`).toBe(false);
  }
  /* the three popovers are built, not stubs: Filter carries the four facets plus the page's own */
  expect((out.popovers as Record<string, { rows: number }>).Filter.rows,
    "the Filter popover lost its facets").toBeGreaterThan(20);
  expect((out.popovers as Record<string, { rows: number }>).Group.rows,
    "Group does not offer five options").toBeGreaterThanOrEqual(5);
  expect((out.popovers as Record<string, { rows: number }>).Sort.rows,
    "Sort does not offer five options").toBeGreaterThanOrEqual(5);

  /* ⚠️ AND AT 1024, WHERE A TRIGGER IS PAST THE MIDLINE. The claim states its own precondition:
     if no trigger crosses it, this proves nothing and says so. */
  const narrowPops = out.popoversNarrow as Record<string, Record<string, unknown>>;
  const crossed = Object.values(narrowPops).filter((v) => v && v.pastMidline);
  expect(crossed.length, "no trigger crossed the midline at 1024 — the edge rule is unexercised")
    .toBeGreaterThan(0);
  for (const [name, v] of Object.entries(narrowPops)) {
    if (!v || !v.open) continue;
    expect(v.overflowsRight, `${name} runs off the right at 1024 (right=${v.right} vw=${v.vw})`).toBe(false);
    expect(v.overflowsBottom, `${name} runs off the bottom at 1024`).toBe(false);
  }

  /* ── §4 · the ladder, flat, matching the ref rung for rung ───────────────────────────────── */
  const refBands = new Map((out.refCardBands as { status: string; band: string }[]).map((c) => [c.status, c.band]));
  let compared = 0;
  for (const c of out.builtCardBands as { status: string; band: string; image: string }[]) {
    /* ⚠️ FLAT: a gradient here means the shorthand reset `background-color` to transparent, so the
       band is one unresolved token away from being see-through. */
    expect(c.image, `${c.status} paints a background image`).toBe("none");
    const ref = refBands.get(c.status);
    if (!ref) continue;
    compared += 1;
    expect(c.band, `${c.status} does not match the ref's rung`).toBe(ref);
  }
  /* ⚠️ AND THE COMPARISON MUST HAVE HAPPENED. A fixture holding only statuses absent from the ref
     would satisfy every assertion above by skipping all of them. */
  expect(compared, "no built card shared a status with the ref — nothing was compared").toBeGreaterThan(1);

  /**
   * ── A · EVERY CARD, ONE LEAF, BAND FLUSH ────────────────────────────────────────────────────
   *
   * ⚠️ ASSERTED OVER THE WHOLE SET, NOT A SAMPLE. The reported fault named two cards; the useful
   * claim is that no card can render without a leaf or with a strip above its band, whatever its
   * data. Both readings come from the rendered box rather than from a class, because "the element
   * exists" and "it occupies the top of the card" are different facts.
   */
  const cardShape = await page.evaluate(() => {
    const cards = [...document.querySelectorAll<HTMLElement>(".qcc")];
    return {
      total: cards.length,
      badLeaf: cards.filter((c) => c.querySelectorAll(".qcc-leaf").length !== 1)
        .map((c) => c.getAttribute("data-qcc-id")),
      /* a white strip above the band = the band's top is not the card's top */
      stripAbove: cards.filter((c) => {
        const b = c.querySelector(".qcc-band");
        if (!b) return true;
        return Math.abs(b.getBoundingClientRect().top - c.getBoundingClientRect().top) > 1;
      }).map((c) => c.getAttribute("data-qcc-id")),
      /* the actual gaps, so a failure says HOW FAR rather than only THAT */
      gaps: cards.slice(0, 8).map((c) => {
        const b = c.querySelector(".qcc-band");
        const cr = c.getBoundingClientRect();
        return {
          id: c.getAttribute("data-qcc-id"),
          gap: b ? Math.round((b.getBoundingClientRect().top - cr.top) * 100) / 100 : null,
          cardTransform: getComputedStyle(c).transform,
          cardAnim: getComputedStyle(c).animationName,
          bandPos: b ? getComputedStyle(b).position : null,
        };
      }),
      /* the caption is one element or none — never two, never a leftover */
      badCaption: cards.filter((c) => c.querySelectorAll(".qcc-m").length > 1)
        .map((c) => c.getAttribute("data-qcc-id")),
      /* ⚠️ AND NO CARD MAY STATE A ZERO-DAY REPLY. That is the false figure two cards printed. */
      zeroDay: cards.filter((c) => /\b0 days?\b/.test(c.querySelector(".qcc-m")?.textContent ?? ""))
        .map((c) => c.getAttribute("data-qcc-id")),
    };
  });
  out.cardShape = cardShape;
  /* ⚠️ RE-DUMPED. The file's single `writeFileSync` sits above this block, so a reading collected
     here never reached disk — the same write-before-collect fault the panel probe had, and it left
     me reading `null` and guessing. Evidence is written when it is gathered. */
  writeFileSync("reports/query-centre-pass2.json", JSON.stringify(out, null, 2));
  expect(cardShape.total, "no cards to check").toBeGreaterThan(5);
  expect(cardShape.badLeaf, "cards without exactly one leaf").toEqual([]);
  expect(cardShape.stripAbove, "cards whose band is not flush with the card's top").toEqual([]);
  expect(cardShape.badCaption, "cards with more than one caption").toEqual([]);
  expect(cardShape.zeroDay, "cards stating a reply interval of 0 days").toEqual([]);

  /* ── §5 · every card has a leaf, and height does not depend on it ────────────────────────── */
  const leaves = out.leaves as { total: number; withLeaf: number; heights: number[] };
  expect(leaves.total, "no cards on the page").toBeGreaterThan(5);
  expect(leaves.withLeaf, "some cards render without a leaf").toBe(leaves.total);
  expect(leaves.heights.length, `cards have ${leaves.heights.length} distinct heights: ${leaves.heights.join(", ")}`).toBe(1);
});
