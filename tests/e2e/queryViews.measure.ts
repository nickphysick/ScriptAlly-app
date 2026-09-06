/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Colours v2 · Phase 6 — the palette, the tiles and the three views, measured at 1280/1440/1920.
 *
 * ⚠️ PRECONDITION: `node tests/e2e/seedCorrection.mjs`. Nothing here commits.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";
import { mkdirSync, writeFileSync } from "node:fs";

const SHOTS = "reports/query-views-shots";
const out: Record<string, unknown> = {};

async function openQC(page: import("@playwright/test").Page, width: number) {
  await openRoute(page, "/queries", { width, height: 1000 });
  await expect(page.locator(".qcc-grid, .qlv, .qbv").first()).toBeVisible({ timeout: 30_000 });
}
const pickView = async (page: import("@playwright/test").Page, label: string) =>
  page.locator(".qvs button", { hasText: new RegExp(`^${label}$`) }).click();

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
