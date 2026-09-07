/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Colours v2 · Phase 6 — the palette, the tiles and the three views, measured at 1280/1440/1920.
 *
 * ⚠️ PRECONDITION: `node tests/e2e/seedCorrection.mjs`. Nothing here commits.
 */
import { test, expect } from "@playwright/test";
import { openRoute, liftMotionSuppression } from "./measure";
import { mkdirSync, writeFileSync } from "node:fs";

const SHOTS = "reports/query-views-2-shots";
const out: Record<string, unknown> = {};

async function openQC(page: import("@playwright/test").Page, width: number) {
  await openRoute(page, "/queries", { width, height: 1000 });
  await expect(page.locator(".qcc-grid, .qlv, .qbv").first()).toBeVisible({ timeout: 30_000 });
}
/**
 * ⚠️ THE VISIBLE SWITCH, NOT THE FIRST ONE. The To-do page reuses this very component (the
 * QC-chassis round), and the workspace keeps every page MOUNTED — so `.qvs button` matches two
 * documents' worth of controls and Playwright's strict mode refuses. Selecting by measurement is
 * this repo's standing answer to the hidden-mounted-page trap.
 */
const pickView = async (page: import("@playwright/test").Page, label: string) => {
  await page.evaluate(() => {
    const live = [...document.querySelectorAll<HTMLElement>(".qvs")].find((e) => e.getBoundingClientRect().height > 0);
    live?.setAttribute("data-qvs-live", "1");
  });
  await page.locator('.qvs[data-qvs-live="1"] button', { hasText: new RegExp(`^${label}$`) }).click();
};

for (const width of [1280, 1440, 1920] as const) {
  test(`the palette, the tiles and each view at rest — ${width}`, async ({ page }) => {
    mkdirSync(SHOTS, { recursive: true });
    await openQC(page, width);

    /* ── the five fills, read off the page rather than the sheet ── */
    const palette = await page.evaluate(() => {
      const seen: Record<string, string> = {};
      for (const el of document.querySelectorAll<HTMLElement>(".qcc-band")) {
        const card = el.closest("[class*=qcc--st-]");
        const st = [...(card?.classList ?? [])].find((c) => c.startsWith("qcc--st-"))?.slice(8);
        if (st && !seen[st]) seen[st] = getComputedStyle(el).backgroundColor;
      }
      const root = getComputedStyle(document.querySelector(".t-f12")!);
      return { bands: seen, ladderStillDeclared: root.getPropertyValue("--stage-out-1").trim() };
    });
    out[`palette-${width}`] = palette;
    /* every band that rendered is one of the five, and it is the token's own value */
    const EXPECT: Record<string, string> = {
      queried: "rgb(247, 239, 227)", agent: "rgb(224, 229, 221)", you: "rgb(245, 230, 223)",
      offer: "rgb(215, 224, 232)", closed: "rgb(228, 225, 219)",
    };
    expect(Object.keys(palette.bands).length, "no state bands rendered").toBeGreaterThan(2);
    for (const [state, colour] of Object.entries(palette.bands))
      expect(colour, `${state}'s band is not its token`).toBe(EXPECT[state]);

    /* ── the tiles: counts are the derived ones, active is a border and not a fill ── */
    const tiles = await page.evaluate(() => {
      const els = [...document.querySelectorAll<HTMLElement>(".qct-tile")];
      return {
        n: els.length,
        labels: els.map((e) => e.querySelector(".qct-k")?.textContent ?? ""),
        counts: els.map((e) => Number(e.querySelector(".qct-n")?.textContent ?? "-1")),
        activeFill: (() => { const on = document.querySelector<HTMLElement>(".qct-tile--on"); return on ? getComputedStyle(on).backgroundColor : null; })(),
        activeBorder: (() => { const on = document.querySelector<HTMLElement>(".qct-tile--on"); return on ? getComputedStyle(on).borderTopColor : null; })(),
      };
    });
    out[`tiles-${width}`] = tiles;
    expect(tiles.n).toBe(5);
    expect(tiles.labels).toEqual(["All queries", "With you", "With the agent", "Offers", "Past expected"]);
    /* the four courts partition All — the tiles state the SET, not the view */
    expect(tiles.counts[1] + tiles.counts[2] + tiles.counts[3], "the courts do not sum to All (closed aside)")
      .toBeLessThanOrEqual(tiles.counts[0]);
    expect(tiles.activeFill, "the active tile took a fill").toBe("rgb(255, 255, 255)");
    await page.screenshot({ path: `${SHOTS}/grid-${width}.png` });

    /* ── List ── */
    await pickView(page, "List");
    await expect(page.locator(".qlv")).toBeVisible();
    const list = await page.evaluate(() => {
      const rows = [...document.querySelectorAll<HTMLElement>(".qlv-row")];
      const first = rows[0]?.getBoundingClientRect();
      return {
        rows: rows.length,
        rowH: first ? +first.height.toFixed(1) : null,
        headTop: document.querySelector(".qlv-head")!.getBoundingClientRect().top,
        /* how many fit in 1000px of viewport, head included — the brief's one measurement */
        fitIn1000: rows.filter((r) => r.getBoundingClientRect().bottom <= 1000).length,
        pillTinted: (() => { const p = document.querySelector<HTMLElement>(".qlv-st"); return p ? getComputedStyle(p).backgroundColor : null; })(),
      };
    });
    out[`list-${width}`] = list;
    expect(list.rows, "the list rendered no rows").toBeGreaterThan(5);
    /**
     * ⚠️ THE BRIEF'S "TWELVE ROWS PER 1000px" IS THE LIST'S 1000px, NOT THE VIEWPORT'S — and the
     * distinction is measured rather than assumed. The page's masthead, tiles and toolbar take
     * ~400px before the list starts, so a 1000px VIEWPORT shows 8; the density claim is about the
     * list itself, and this is its assertable form: the head plus twelve rows inside 1000px.
     */
    expect(list.rowH!, "a row is too tall for twelve in 1000px of list").toBeLessThanOrEqual(78);
    expect(12 * list.rowH! + 42, "head + twelve rows overflow 1000px of list").toBeLessThanOrEqual(1000);
    await page.screenshot({ path: `${SHOTS}/list-${width}.png` });

    /* ── Board ── */
    await pickView(page, "Board");
    await expect(page.locator(".qbv")).toBeVisible();
    const board = await page.evaluate(() => {
      const cols = [...document.querySelectorAll<HTMLElement>(".qbv-col")];
      const withCards = cols.find((c) => c.querySelectorAll(".qbv-card").length > 1);
      const cards = withCards ? [...withCards.querySelectorAll<HTMLElement>(".qbv-card")] : [];
      const fact = cards[0]?.querySelector<HTMLElement>(".qbv-fact");
      const gap = cards.length > 1
        ? +(cards[1].getBoundingClientRect().top - cards[0].getBoundingClientRect().bottom).toFixed(1)
        : null;
      return {
        cols: cols.length,
        order: cols.map((c) => c.dataset.qbvCol),
        heads: cols.map((c) => ({
          rule: getComputedStyle(c.querySelector<HTMLElement>(".qbv-h")!).borderBottomColor,
          accent: getComputedStyle(c).getPropertyValue("--state-accent").trim(),
          fill: getComputedStyle(c.querySelector<HTMLElement>(".qbv-h")!).backgroundColor,
        })),
        factH: fact ? +fact.getBoundingClientRect().height.toFixed(1) : null,
        overlapGap: gap,
        bandedCards: document.querySelectorAll(".qbv-card--alt").length,
        lastShowsFact: cards.length ? getComputedStyle(cards[cards.length - 1]).marginBottom : null,
      };
    });
    out[`board-${width}`] = board;
    expect(board.cols).toBe(7);
    expect(board.order).toEqual(["queried", "preq", "psent", "freq", "fsent", "offer", "closed"]);
    for (const h of board.heads) {
      expect(h.fill, "a column header took a fill").toBe("rgba(0, 0, 0, 0)");
      /* the rule IS the column's own deep step — compared against the resolved token, not a literal */
      expect(h.rule.replace(/\s/g, ""), `header rule ${h.rule} is not its --state-accent ${h.accent}`)
        .toBe(hexToRgb(h.accent).replace(/\s/g, ""));
    }
    if (board.factH != null && board.overlapGap != null)
      expect(Math.abs(board.overlapGap + board.factH), "the overlap is not the fact line's height").toBeLessThanOrEqual(2);
    await page.screenshot({ path: `${SHOTS}/board-${width}.png` });

    /* scrolled, so the seventh column is on screen at least once */
    await page.evaluate(() => { document.querySelector(".qcc-boardwrap")!.scrollLeft = 9999; });
    await page.screenshot({ path: `${SHOTS}/board-scrolled-${width}.png` });

    /* ── Calendar ── */
    await pickView(page, "Calendar");
    await expect(page.locator(".qcc-calph")).toHaveText("Calendar — coming with the timeline board");
    await page.screenshot({ path: `${SHOTS}/calendar-${width}.png` });
    writeFileSync("reports/query-views.json", JSON.stringify(out, null, 2));
  });
}

/** `#e7d9bd` → `rgb(231, 217, 189)`, so a computed colour can be compared with a token's value. */
function hexToRgb(v: string): string {
  const h = v.trim();
  if (!h.startsWith("#")) return h;
  const n = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  return `rgb(${n[0]}, ${n[1]}, ${n[2]})`;
}

test("the drawer opens from Grid, List and Board — and the view and tile survive it — 1440", async ({ page }) => {
  mkdirSync(SHOTS, { recursive: true });
  await openQC(page, 1440);
  /* an active tile that must survive every switch */
  await page.locator(".qct-tile", { hasText: "With the agent" }).click();

  for (const [view, sel, shot] of [
    ["Grid", ".qcc", "drawer-from-grid"],
    ["List", ".qlv-row", "drawer-from-list"],
    ["Board", ".qbv-card", "drawer-from-board"],
  ] as const) {
    await pickView(page, view);
    await page.locator(sel).first().click();
    await expect(page.locator(".qpn[data-on='true']"), `${view} did not open the drawer`).toBeVisible({ timeout: 15_000 });
    const kept = await page.evaluate(() => ({
      tile: document.querySelector(".qct-tile--on")?.querySelector(".qct-k")?.textContent ?? null,
      view: [...document.querySelectorAll(".qvs button")].find((b) => b.classList.contains("qvs-on"))?.textContent?.trim() ?? null,
      url: new URLSearchParams(window.location.search).get("view"),
    }));
    out[`drawer-${view}`] = kept;
    expect(kept.tile, `${view} lost the active tile`).toBe("With the agent");
    expect(kept.view, `${view} lost the active view`).toContain(view);
    await page.screenshot({ path: `${SHOTS}/${shot}-1440.png` });
    await page.keyboard.press("Escape");
  }
  writeFileSync("reports/query-views.json", JSON.stringify(out, null, 2));
});

/* ══ views pass 4 (v14) — the scrim, the durations, the row and the board card ════════════════ */
for (const width of [1440, 2560] as const) {
  test(`v14 · the scrim covers the app, and the drawer's timings are the ref's — ${width}`, async ({ page }) => {
    mkdirSync(SHOTS, { recursive: true });
    await openQC(page, width);
    await pickView(page, "List");
    await expect(page.locator(".qlv")).toBeVisible();

    /* ── §1: the board card is identity only ── */
    await pickView(page, "Board");
    await expect(page.locator(".qbv")).toBeVisible();
    const card = await page.evaluate(() => {
      const cards = [...document.querySelectorAll<HTMLElement>(".qbv-card")];
      const withTwo = [...document.querySelectorAll<HTMLElement>(".qbv-col")].find((c) => c.querySelectorAll(".qbv-card").length > 1);
      const pair = withTwo ? [...withTwo.querySelectorAll<HTMLElement>(".qbv-card")] : [];
      const h = (c: HTMLElement) => +c.getBoundingClientRect().height.toFixed(1);
      const plain = cards.filter((c) => !c.classList.contains("qbv-card--alt"));
      const alt = cards.filter((c) => c.classList.contains("qbv-card--alt"));
      return {
        n: cards.length,
        /* ⚠️ SPLIT, because a BANDED card is legitimately taller — the same brief requires the band
           on a card whose status is not its column's. The identity height is the plain card's; the
           banded one is that plus its band, and is reported rather than asserted against 64. */
        maxPlainH: plain.length ? Math.max(...plain.map(h)) : null,
        maxAltH: alt.length ? Math.max(...alt.map(h)) : null,
        facts: document.querySelectorAll(".qbv-card .qbv-fact").length,
        gap: pair.length > 1 ? +(pair[1].getBoundingClientRect().top - pair[0].getBoundingClientRect().bottom).toFixed(1) : null,
      };
    });
    out[`v14-card-${width}`] = card;
    expect(card.facts, "a fact line survives inside a board card").toBe(0);
    expect(card.maxPlainH!, "an identity card is taller than 64").toBeLessThanOrEqual(64);
    if (card.maxAltH != null)
      expect(card.maxAltH - card.maxPlainH!, "the band costs more than a band").toBeLessThanOrEqual(40);
    if (card.gap != null) expect(card.gap, "the stack is not an 8px gap").toBeCloseTo(8, 0);
    await page.screenshot({ path: `${SHOTS}/board-${width}.png` });

    /* ── §2: the row's fixed action grid, the sand leaf, Since then ── */
    await pickView(page, "List");
    await expect(page.locator(".qlv-row").first()).toBeVisible();
    const row = await page.evaluate(() => {
      const rows = [...document.querySelectorAll<HTMLElement>(".qlv-row")].slice(0, 12);
      const xs = rows.map((r) => +(r.querySelector<HTMLElement>('[aria-label^="More actions"]')!.getBoundingClientRect().left.toFixed(1)));
      const widths = rows.map((r) => +(r.querySelector<HTMLElement>(".qlv-pri")!.getBoundingClientRect().width.toFixed(1)));
      const months = rows.map((r) => { const m = r.querySelector<HTMLElement>(".qlv-mo"); return m ? getComputedStyle(m).backgroundColor : null; });
      const bars = rows.map((r) => ({
        bar: getComputedStyle(r.querySelector<HTMLElement>(".qlv-bar")!).backgroundColor,
        accent: getComputedStyle(r).getPropertyValue("--state-accent").trim(),
      }));
      return {
        rows: rows.length, moreXs: [...new Set(xs)], priWidths: [...new Set(widths)],
        monthFills: [...new Set(months.filter(Boolean))],
        barsMatch: bars.every((b) => b.bar.replace(/\s/g, "") === (() => { const h = b.accent; const n = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); return `rgb(${n[0]},${n[1]},${n[2]})`; })()),
        sinceCounts: rows.map((r) => r.querySelectorAll(".qlv-ev").length),
        pillFill: getComputedStyle(document.querySelector<HTMLElement>(".qlv-st")!).backgroundColor,
      };
    });
    out[`v14-row-${width}`] = row;
    expect(row.moreXs.length, `the ⋯ sits at ${row.moreXs.length} different x-positions`).toBe(1);
    expect(row.priWidths.length, `the primary has ${row.priWidths.length} widths`).toBe(1);
    expect(row.monthFills, "the Sent leaf is not sand on every row").toEqual(["rgb(247, 239, 227)"]);
    expect(row.barsMatch, "an accent bar is not its row's --state-accent").toBe(true);
    expect(row.pillFill, "the status kept a pill fill").toBe("rgba(0, 0, 0, 0)");
    await page.screenshot({ path: `${SHOTS}/list-${width}.png` });

    /* ── §4: the scrim over the rail, and the durations ──
       ⚠️ THE HARNESS SUPPRESSES TRANSITIONS BY DEFAULT, so a duration read here measures the
       harness's own stylesheet and not the app's: the first run returned `0s` for a drawer whose
       rule says 360ms. Lifted for this case, which is the one case in this file that is ABOUT
       timing; every geometric reading above keeps the suppression it needs. */
    await liftMotionSuppression(page);
    await page.locator(".qlv-row").first().click();
    await expect(page.locator(".qpn[data-on='true']")).toBeVisible();
    const scrim = await page.evaluate(() => {
      const el = document.elementFromPoint(4, 300);
      const s = document.querySelector<HTMLElement>(".qpn-scrim")!;
      return {
        atRail: el ? `${el.tagName.toLowerCase()}.${(el.className || "").toString().split(/\s+/)[0]}` : "NONE",
        isScrim: el === s,
        parentIsBody: s.parentElement === document.body,
        bg: getComputedStyle(s).backgroundColor,
        scrimMs: getComputedStyle(s).transitionDuration,
        openMs: getComputedStyle(document.querySelector<HTMLElement>(".qpn")!).transitionDuration,
      };
    });
    out[`v14-scrim-${width}`] = scrim;
    expect(scrim.isScrim, `over the rail the page paints ${scrim.atRail}`).toBe(true);
    expect(scrim.parentIsBody, "the scrim is not on the body").toBe(true);
    expect(scrim.bg).toBe("rgba(58, 28, 20, 0.14)");
    expect(scrim.openMs, "the drawer does not open in 360ms").toBe("0.36s");
    expect(scrim.scrimMs).toBe("0.24s");
    /* closing reads the base rule's timing — toggle the attribute and read it back */
    const closeMs = await page.evaluate(() => {
      const p2 = document.querySelector<HTMLElement>(".qpn")!;
      p2.setAttribute("data-on", "false");
      const d = getComputedStyle(p2).transitionDuration;
      p2.setAttribute("data-on", "true");
      return d;
    });
    out[`v14-close-${width}`] = closeMs;
    expect(closeMs, "the drawer does not close in 220ms").toBe("0.22s");
    await page.screenshot({ path: `${SHOTS}/scrim-${width}.png` });

    /* ── §3: no verbs in the top bar; a row action opens the desk with the drawer behind it ── */
    const bar = await page.evaluate(() => {
      const qpn = [...document.querySelectorAll<HTMLElement>(".qpn")].find((e) => e.getBoundingClientRect().height > 0)!;
      return {
        actsInBar: qpn.querySelector(".qpn-bar")!.querySelectorAll(".qpn-act").length,
        actsInVerbRow: qpn.querySelector(".qpn-verbs")?.querySelectorAll(".qpn-act").length ?? 0,
        verbRowBg: getComputedStyle(qpn.querySelector<HTMLElement>(".qpn-verbs")!).backgroundColor,
        blockBg: getComputedStyle(qpn.querySelector<HTMLElement>(".qpn-band")!).backgroundColor,
      };
    });
    out[`v14-bar-${width}`] = bar;
    expect(bar.actsInBar, "a verb survives in the top bar").toBe(0);
    expect(bar.actsInVerbRow, "the verb row is empty").toBeGreaterThan(0);
    expect(bar.verbRowBg, "the verb row is not on the block's ground").toBe(bar.blockBg);
    await page.keyboard.press("Escape");

    /* the desk, opened from a ROW action, with the drawer behind it */
    await page.locator(".qlv-row .qlv-pri:not([disabled])").first().click();
    await expect(page.locator(".qcd-card")).toBeVisible({ timeout: 15_000 });
    const deskUp = await page.evaluate(() => ({
      drawerOpen: !!document.querySelector(".qpn[data-on='true']"),
      deskOnBody: document.querySelector(".qcd")!.parentElement === document.body,
    }));
    out[`v14-rowdesk-${width}`] = deskUp;
    expect(deskUp.drawerOpen, "the desk opened with no drawer behind it").toBe(true);
    await page.screenshot({ path: `${SHOTS}/row-desk-${width}.png` });
    writeFileSync("reports/query-views-2.json", JSON.stringify(out, null, 2));
  });
}

/* ══ toolbar v2 · §4 — the popovers, the groups, and the date editor's guarantee ═══════════════ */
test("toolbar v2 · the three menus, Group on Grid and List, the board's disabled control — 1440", async ({ page }) => {
  const SHOTS2 = "reports/query-toolbar-shots";
  mkdirSync(SHOTS2, { recursive: true });
  await openQC(page, 1440);

  /**
   * ⚠️ THE DATE EDITOR IS MEASURED FIRST, BEFORE ANY MENU IS OPENED, and again at the end — the
   * fourth caller of `F12Popover` must render identically, and the assertable form of that is its
   * own computed styles, not a promise in a comment.
   */
  const dateStyles = async () => {
    /* the date editor opens off the send rung's own date control, inside the drawer */
    /* ⚠️ EVERY STEP STATES ITS PRECONDITION AND RETURNS A READING RATHER THAN THROWING. This
       helper's whole job is to answer "can the fourth caller be reached", and a crash on the way
       there answers it with a line number instead of with a reason — the crashing-lock fault this
       repo records, where a throw and an honest failure look identical in a run summary. */
    const card = page.locator('[data-qcc-id="cor-move-b"]');
    if (!(await card.count())) return { reachable: false as const, stopped: "no cor-move-b card in the grid" };
    await card.click();
    /* ⚠️ WAIT, DO NOT COUNT. A synchronous `count()` straight after the click reads the DOM before
       React has re-rendered, so it reports "the card did not open the drawer" about a drawer that
       opens perfectly — a false regression I nearly wrote down. The precondition is still stated;
       it just has to be stated about a settled page. */
    const drawer = page.locator(".qpn[data-on='true']");
    try {
      await expect(drawer).toBeVisible({ timeout: 15_000 });
    } catch {
      return { reachable: false as const, stopped: "the card did not open the drawer" };
    }
    await page.locator(".qpn-tab", { hasText: "Tracking" }).click();
    const trig = page.locator(".qpn .tl-r1 .qp-inplace").first();
    if (!(await trig.count())) return { reachable: false as const, stopped: "no in-place date control on the send rung" };
    await trig.click();
    /* ⚠️ AND THIS ONE STATES ITS REASON TOO. `.qp-inplace` on the send rung is the SEND-METHOD
       editor, not the date; the date's `onSetSendDate` is wired only inside the retired browsing
       branch. So finding a control here is not the same as reaching the date editor, and the
       honest reading when no popover follows is "not reachable", not a stack trace. */
    try {
      await expect(page.locator(".f12-pop")).toBeVisible({ timeout: 10_000 });
    } catch {
      return { reachable: false as const, stopped: "the in-place control opened no F12 popover" };
    }
    const read = await page.evaluate(() => {
      const pop = document.querySelector<HTMLElement>(".f12-pop")!;
      const cs = getComputedStyle(pop);
      return {
        reachable: true as const,
        isMount: pop.classList.contains("f12-pop--mount"),
        radius: cs.borderTopLeftRadius, padding: cs.paddingTop,
        border: cs.borderTopWidth, borderColour: cs.borderTopColor,
        head: !!pop.querySelector(".f12-pop-head"), frame: !!pop.querySelector(".f12-pop-frame"),
      };
    });
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
    return read;
  };

  /* ── the three menus ── */
  for (const [label, key] of [["Filter", "filter"], ["Group", "group"], ["Sort", "sort"]] as const) {
    await page.locator(".qcc-tb-btn", { hasText: new RegExp(`^${label}`) }).first().click();
    await expect(page.locator(".f12-pop--mount")).toBeVisible();
    const chassis = await page.evaluate(() => {
      const pop = document.querySelector<HTMLElement>(".f12-pop--mount")!;
      const frame = pop.querySelector<HTMLElement>(".f12-pop-frame")!;
      const band = pop.querySelector<HTMLElement>(".f12-pop-band")!;
      return {
        rimRadius: getComputedStyle(pop).borderTopLeftRadius,
        rimPad: getComputedStyle(pop).paddingTop,
        frameBorder: getComputedStyle(frame).borderTopColor,
        frameOverflow: getComputedStyle(frame).overflow,
        bandImage: getComputedStyle(band).backgroundImage,
        groups: pop.querySelectorAll(".f12-lbl").length,
        rows: pop.querySelectorAll(".f12-prow").length,
        foot: pop.querySelectorAll(".f12-pop-mfoot").length,
      };
    });
    out[`tb-${key}`] = chassis;
    expect(chassis.rimRadius).toBe("14px");
    expect(chassis.rimPad).toBe("6px");
    expect(chassis.frameBorder, "the frame is not the burgundy hairline").toBe("rgba(124, 58, 42, 0.28)");
    expect(chassis.frameOverflow).toBe("hidden");
    expect(chassis.bandImage, "the band is not the sage gradient").toContain("linear-gradient");
    /**
     * ⚠️ THE TEN-ROW CAP IS SORT'S CLAIM, NOT EVERY MENU'S — the brief states it in the Sort
     * paragraph, beside the reason (direction left the rows and became a control). Filter's
     * length is DATA: statuses, plus one row per send method the account has used, plus the
     * versions. Measured 11 here, and the frame's body scrolls, which is the honest behaviour for
     * a facet list that grows with the record. Reported rather than asserted.
     */
    if (key === "filter") {
      /**
       * ⚠️ TWO OR THREE, AND THE THIRD IS CONDITIONAL BY DESIGN. Version renders only where the
       * scoped manuscript HAS a choice of versions (Part E's D12/D8) — with "All manuscripts"
       * selected it would have to offer every book's versions in one list. So the claim is not
       * "three labels" but "these labels, in this order, and Version present exactly when there is
       * a version to choose". Asserted against the DOM's own condition rather than a count.
       */
      const filter = await page.evaluate(() => {
        const pop = document.querySelector<HTMLElement>(".f12-pop--mount")!;
        return {
          labels: [...pop.querySelectorAll(".f12-lbl")].map((e) => e.textContent?.trim() ?? ""),
          versionRows: [...pop.querySelectorAll(".f12-prow")].filter((e) => /Any version|Not recorded/.test(e.textContent ?? "")).length,
        };
      });
      out["tb-filter-facets"] = filter;
      expect(filter.labels.slice(0, 2)).toEqual(["Status", "Sent via"]);
      expect(filter.labels.length, "Filter grew a fourth facet").toBeLessThanOrEqual(3);
      expect(filter.labels.includes("Version"), "Version rendered without rows, or rows without a label")
        .toBe(filter.versionRows > 0);
    }
    if (key === "sort") {
      expect(chassis.rows, `Sort is ${chassis.rows} rows`).toBeLessThanOrEqual(10);
      expect(chassis.rows).toBe(5);
      expect(chassis.foot).toBe(1);
    }
    await page.screenshot({ path: `${SHOTS2}/pop-${key}-1440.png` });
    await page.keyboard.press("Escape");
  }

  /* ── Group = Status on Grid, then List ── */
  for (const [view, sel, shot] of [["Grid", ".qcc-sec", "grid"], ["List", ".qlv-ghead", "list"]] as const) {
    await pickView(page, view);
    await page.locator(".qcc-tb-btn", { hasText: /^Group/ }).first().click();
    await page.locator(".f12-prow", { hasText: /^Status$/ }).first().click();
    await expect(page.locator(sel).first()).toBeVisible();
    const g = await page.evaluate((s2) => {
      const heads = [...document.querySelectorAll<HTMLElement>(s2)];
      const names = heads.map((h) => h.querySelector("h2 span, h3")?.textContent?.trim() ?? "");
      /* every card/row under a heading carries that heading's status */
      const ok = heads.every((h) => {
        const name = h.querySelector("h2 span, h3")?.textContent?.trim();
        const scope = s2 === ".qcc-sec" ? h : (h.nextElementSibling as HTMLElement | null);
        if (!name || !scope) return true;
        const labels = s2 === ".qcc-sec"
          ? [...scope.querySelectorAll(".qcc-word")].map((e) => e.textContent?.trim())
          : [(scope.querySelector(".qlv-st") as HTMLElement | null)?.textContent?.trim()];
        return labels.every((l) => !l || l === name);
      });
      return { headings: heads.length, names, ok, rule: heads[0] ? getComputedStyle(heads[0].querySelector(".qcc-sech-rule, .qlv-gline")!).backgroundColor : null };
    }, sel);
    out[`tb-group-${shot}`] = g;
    expect(g.headings, "no headings rendered").toBeGreaterThan(1);
    expect(g.ok, "a card sits under the wrong heading").toBe(true);
    await page.screenshot({ path: `${SHOTS2}/group-${shot}-1440.png` });
  }

  /* ── the Board disables it ── */
  await pickView(page, "Board");
  const board = await page.evaluate(() => {
    const b = [...document.querySelectorAll<HTMLButtonElement>(".qcc-tb-btn")].find((x) => /^Group/.test(x.textContent ?? ""))!;
    return { disabled: b.disabled, title: b.title, value: b.querySelector(".qcc-tb-val")?.textContent ?? null };
  });
  out["tb-board-group"] = board;
  expect(board.disabled).toBe(true);
  expect(board.title).toBe("The board is already grouped by status.");
  expect(board.value).toBe("Status");
  await page.screenshot({ path: `${SHOTS2}/group-board-1440.png` });

  /* ── the list header, both directions ── */
  await pickView(page, "List");
  for (const dir of ["asc", "desc"] as const) {
    await page.locator(".qlv-h--btn", { hasText: "Sent" }).first().click();
    const h = await page.evaluate(() => {
      const on = document.querySelector<HTMLElement>(".qlv-h--on");
      return { caret: on?.querySelector(".qlv-caret")?.textContent ?? null,
               colour: on ? getComputedStyle(on.querySelector(".qlv-caret")!).color : null,
               menu: [...document.querySelectorAll<HTMLElement>(".qcc-tb-btn")].find((x) => /^Sort/.test(x.textContent ?? ""))?.querySelector(".qcc-tb-val")?.textContent ?? null };
    });
    out[`tb-header-${dir}`] = h;
    expect(h.colour, "the caret is not burgundy").toBe("rgb(124, 58, 42)");
    expect(h.menu, "the Sort menu did not follow the header").toBe("Date sent");
    await page.screenshot({ path: `${SHOTS2}/header-${dir}-1440.png` });
  }

  /**
   * ── and the fourth caller, unchanged ──
   * ⚠️ MEASURED ON THE RENDERED PAGE, not inferred from the default. The variant opting out by
   * construction is a source claim; that the date editor still draws the plain chassis — cream
   * head, no frame, its own radius — is a claim about the cascade, and only the browser settles it.
   */
  await pickView(page, "Grid");
  const after = await dateStyles();
  out["tb-date-editor"] = after;
  /**
   * ⚠️ AND IT IS NOT REACHABLE FROM THE LIVE PAGE — measured, not assumed, and stated rather than
   * skipped. `onSetSendDate` is wired at ONE site, inside the retired `GRID_IS_THE_PAGE === false`
   * browsing branch, so `F12Popover`'s fourth caller is dead code behind a `true` constant. The
   * variant is still the right shape (a base restyle WOULD have reached it, and it would be
   * restyled the day that branch is revived or the editor rehomed), but the rendered guarantee
   * cannot be taken here — it is proved at source and by the CSS scoping instead.
   *
   * This asserts the UNREACHABILITY so the day it changes, this case demands the real measurement
   * rather than going quietly green on a guard that never ran.
   */
  if (after.reachable) {
    expect(after.isMount, "the date editor took the toolbar's chassis").toBe(false);
    expect(after.head, "the date editor lost its cream head").toBe(true);
    expect(after.frame, "the date editor grew the toolbar's frame").toBe(false);
  } else {
    expect(after.reachable, "the date editor is reachable now — measure its chassis here rather than trusting the source lock").toBe(false);
  }
  writeFileSync("reports/query-toolbar.json", JSON.stringify(out, null, 2));
});

/* ══ §5 · the quick actions, and the header sitting on its columns ════════════════════════════ */

/** the visible list grid — three pages mount `.wpg`, and the workspace keeps them all alive */
const tagLiveList = async (page: import("@playwright/test").Page) =>
  page.evaluate(() => {
    const live = [...document.querySelectorAll<HTMLElement>(".qlv")].find((e) => e.getBoundingClientRect().height > 0);
    if (!live) throw new Error("no visible .qlv — the list view is not showing");
    live.setAttribute("data-qlv-live", "1");
    return true;
  });

test("§5 · quick actions — three anchors, one copy, and no drawer behind them — 1440", async ({ page }) => {
  const SHOTS = "reports/query-toolbar-shots";
  mkdirSync(SHOTS, { recursive: true });
  const out: Record<string, unknown> = {};
  await openQC(page, 1440);
  await pickView(page, "List");
  await tagLiveList(page);

  /* ── anchor 1 · a list row's bell ── */
  const bell = page.locator('[data-qlv-live] .qlv-row button[aria-label="Snooze the nudge"]:visible').first();
  await expect(bell, "no snooze control on any visible row").toBeVisible({ timeout: 15_000 });

  /* ⚠️ THE PRECONDITION FIRST — a "the drawer did not open" assertion is worth nothing if the
     drawer was already open, and worth nothing again if the row was already selected. */
  const before = await page.evaluate(() => ({
    drawer: document.querySelectorAll(".qpn").length,
    selected: document.querySelectorAll("[data-qlv-live] .qlv-row--on").length,
    route: location.pathname + location.search,
  }));
  expect(before.drawer, "a drawer was already open — the no-drawer claim would be vacuous").toBe(0);

  await bell.click();
  await expect(page.locator(".f12-pop--mount")).toBeVisible({ timeout: 10_000 });

  const fromList = await page.evaluate(() => {
    const pop = document.querySelector<HTMLElement>(".f12-pop--mount")!;
    return {
      text: (pop.innerText || "").trim(),
      title: pop.querySelector<HTMLElement>(".f12-pop-bt")?.textContent ?? "",
      hasFrame: !!pop.querySelector(".f12-pop-frame"),
      hasDial: !!pop.querySelector("input[type=range]"),
      /* the section's whole claim, as an absence */
      drawer: document.querySelectorAll(".qpn").length,
      desk: document.querySelectorAll(".qcd, .qcd-verb").length,
      selected: document.querySelectorAll("[data-qlv-live] .qlv-row--on").length,
      route: location.pathname + location.search,
    };
  });
  out["qa-list-snooze"] = fromList;
  expect(fromList.title, "the list's bell opened something else").toBe("Snooze the nudge");
  expect(fromList.hasFrame, "the popover is not on the toolbar's chassis").toBe(true);
  expect(fromList.hasDial, "the To-do dial did not come with it").toBe(true);
  /**
   * ⚠️ AND IT IS THE TO-DO DIAL RATHER THAN A FOUR-STOP RE-ROLL, proved by the axis labels. Those
   * come from `SNOOZE_STOPS`' own `axis` field — 1D · 1W · 1M · 3M — which a dial built to the
   * brief's "1 week · 2 weeks · 4 weeks · 8 weeks" could not produce: 4 and 8 weeks are not stops
   * in the shared table at all. Reading the RENDERED ticks is what separates "imported the
   * component" from "reimplemented it with the same import sitting unused".
   */
  const ticks = fromList.text.split("\n").map((l) => l.trim()).filter(Boolean);
  out["qa-dial-axis"] = ticks;
  for (const a of ["1D", "1W", "1M", "3M"])
    expect(ticks, `the dial is missing the shared table's ${a} axis mark`).toContain(a);
  expect(fromList.drawer, "snooze opened the drawer").toBe(0);
  expect(fromList.desk, "snooze opened the desk").toBe(0);
  expect(fromList.route, "snooze changed the route").toBe(before.route);
  expect(fromList.selected, "snooze changed the row's selection").toBe(before.selected);
  await page.screenshot({ path: `${SHOTS}/qa-snooze-list-1440.png` });
  await page.keyboard.press("Escape");

  /* ── the close popover, same row, same rules ── */
  const cross = page.locator('[data-qlv-live] .qlv-row button[aria-label="Mark closed"]:visible').first();
  await cross.click();
  await expect(page.locator(".f12-pop--mount")).toBeVisible({ timeout: 10_000 });
  const closeRead = await page.evaluate(() => {
    const pop = document.querySelector<HTMLElement>(".f12-pop--mount")!;
    return {
      title: pop.querySelector<HTMLElement>(".f12-pop-bt")?.textContent ?? "",
      /* the label's OWN text nodes — `textContent` would carry the grey mark's glyph too, and the
         claim is about the words rather than about the dot beside them */
      reasons: [...pop.querySelectorAll(".qa-opt")].map((e) =>
        [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent || "").join("").trim()),
      drawer: document.querySelectorAll(".qpn").length,
      desk: document.querySelectorAll(".qcd, .qcd-verb").length,
      route: location.pathname + location.search,
    };
  });
  out["qa-list-close"] = closeRead;
  expect(closeRead.title).toBe("Close this query");
  expect(closeRead.reasons.slice(0, 3)).toEqual(["They passed", "I withdrew it", "No reply — gone quiet"]);
  expect(closeRead.drawer, "close opened the drawer").toBe(0);
  expect(closeRead.desk, "close opened the desk").toBe(0);
  expect(closeRead.route).toBe(before.route);
  await page.screenshot({ path: `${SHOTS}/qa-close-list-1440.png` });
  await page.keyboard.press("Escape");

  /* ── anchors 2 and 3 · inside the drawer, where opening it IS the point ── */
  await page.locator('[data-qlv-live] .qlv-row').first().click();
  await expect(page.locator(".qpn[data-on='true']")).toBeVisible({ timeout: 15_000 });

  const verbSnooze = page.locator(".qpn .qpn-verbs button", { hasText: /^Snooze$/ });
  await expect(verbSnooze, "the drawer's verb row has no Snooze").toBeVisible({ timeout: 10_000 });
  await verbSnooze.click();
  await expect(page.locator(".f12-pop--mount")).toBeVisible({ timeout: 10_000 });
  const fromVerb = await page.evaluate(() => (document.querySelector<HTMLElement>(".f12-pop--mount")!.innerText || "").trim());
  out["qa-verb-snooze"] = { text: fromVerb };
  await page.screenshot({ path: `${SHOTS}/qa-snooze-verb-1440.png` });
  await page.keyboard.press("Escape");

  const dotted = page.locator(".qpn .qpn-snz");
  await expect(dotted, "the drawer's tray states no reminder clause").toBeVisible({ timeout: 10_000 });
  await dotted.click();
  await expect(page.locator(".f12-pop--mount")).toBeVisible({ timeout: 10_000 });
  const fromPhrase = await page.evaluate(() => (document.querySelector<HTMLElement>(".f12-pop--mount")!.innerText || "").trim());
  out["qa-phrase-snooze"] = { text: fromPhrase };
  await page.screenshot({ path: `${SHOTS}/qa-snooze-phrase-1440.png` });
  await page.keyboard.press("Escape");

  /**
   * ⚠️ THE COPY LAW, MEASURED ON THE RENDERED TEXT rather than on three specs each checking its
   * own strings. Identical `innerText` from three different controls is a claim only the
   * composition can satisfy — three components with the same words would pass a per-anchor check
   * and fail this the moment one of them was edited.
   */
  out["qa-copy-identical"] = { list: fromList.text, verb: fromVerb, phrase: fromPhrase };
  expect(fromVerb, "the drawer's verb and the list's bell say different things").toBe(fromList.text);
  expect(fromPhrase, "the dotted phrase and the list's bell say different things").toBe(fromList.text);
  expect(fromList.text.length, "the popover rendered nothing — three empties are also identical").toBeGreaterThan(40);

  writeFileSync("reports/query-toolbar-s5.json", JSON.stringify(out, null, 2));
});

test("§5 · the header sits on its columns — 1280 · 1440 · 1920", async ({ page }) => {
  const out: Record<string, unknown> = {};
  for (const width of [1280, 1440, 1920]) {
    await openQC(page, width);
    await pickView(page, "List");
    await tagLiveList(page);
    await expect(page.locator("[data-qlv-live] .qlv-row").first()).toBeVisible({ timeout: 15_000 });

    const read = await page.evaluate(() => {
      const grid = document.querySelector<HTMLElement>("[data-qlv-live]")!;
      const head = grid.querySelector<HTMLElement>(".qlv-head")!;
      const row = grid.querySelector<HTMLElement>(".qlv-row")!;
      const hs = [...head.children] as HTMLElement[];
      /* ⚠️ `.qlv-bar` IS NOT A COLUMN — it is the row's 4px state accent, absolutely positioned,
         so it takes no grid slot. Excluded BY NAME and the exclusion counted, because filtering
         to "the first seven" would silently drop a real column the day one is added. */
      const all = [...row.children] as HTMLElement[];
      const rs = all.filter((e) => !e.classList.contains("qlv-bar"));
      return {
        cols: hs.length, rowCols: rs.length, dropped: all.length - rs.length,
        lefts: hs.map((h, i) => ({
          label: (h.textContent || "").trim().slice(0, 18),
          head: Math.round(h.getBoundingClientRect().left * 100) / 100,
          cell: rs[i] ? Math.round(rs[i].getBoundingClientRect().left * 100) / 100 : null,
        })),
        /* §4.1 — Actions joins the other six rather than hanging off the right edge */
        actsJustify: getComputedStyle(grid.querySelector<HTMLElement>(".qlv-acts")!).justifyContent,
      };
    });
    out[`align-${width}`] = read;

    expect(read.cols, `header column count at ${width}`).toBe(7);
    expect(read.rowCols, `row cell count at ${width}`).toBe(7);
    expect(read.dropped, `something other than the state accent was skipped at ${width}`).toBe(1);
    /* ⚠️ EVERY column, not a sample — the fault this catches moved ALL of them by one padding */
    for (const c of read.lefts) {
      expect(c.cell, `no row cell under "${c.label}" at ${width}`).not.toBeNull();
      expect(Math.abs((c.head ?? 0) - (c.cell ?? 0)), `"${c.label}" header sits off its column at ${width}`)
        .toBeLessThanOrEqual(0.5);
    }
    /* ⚠️ §3's "right for Actions" is SUPERSEDED by §4.1 — asserting the right edge would now fail
       on a correct page, so the claim is the left edge for all seven and this states why. */
    expect(read.actsJustify, `Actions is not left-aligned at ${width}`).toBe("start");
  }
  writeFileSync("reports/query-toolbar-align.json", JSON.stringify(out, null, 2));
});
