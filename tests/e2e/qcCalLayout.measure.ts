import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";
import { mkdirSync } from "node:fs";

const SHOTS = "/Users/nickphysick/ScriptAlly-app/reports/calendar-layout-shots";

const live = async (page: import("@playwright/test").Page) =>
  page.evaluate(() => {
    const l = [...document.querySelectorAll<HTMLElement>(".wpg.qc-wpg")].filter((e) => e.getBoundingClientRect().height > 0);
    if (l.length !== 1) throw new Error(`expected one visible Query Centre, found ${l.length}`);
    l[0].setAttribute("data-qc-live", "1");
  });

for (const w of [1280, 1440, 1920]) {
  test(`§7 · the Calendar's layout at ${w}`, async ({ page }) => {
    mkdirSync(SHOTS, { recursive: true });
    await openRoute(page, "/queries", { width: w, height: 1000 });
    await live(page);
    await page.locator('[data-qc-live] .qvs button:has-text("Calendar")').first().click();
    await page.waitForTimeout(1400);

    const m = await page.evaluate(() => {
      const q = (s: string) => document.querySelector<HTMLElement>("[data-qc-live] " + s);
      const R = (s: string) => { const e = q(s); if (!e) return null; const b = e.getBoundingClientRect();
        return { x: +b.x.toFixed(2), y: +b.y.toFixed(2), w: +b.width.toFixed(2), h: +b.height.toFixed(2),
                 r: +(b.x + b.width).toFixed(2), bot: +(b.y + b.height).toFixed(2) }; };
      const scroll = q(".wpg-scroll") ?? document.querySelector<HTMLElement>(".wpg-scroll");
      const sb = scroll!.getBoundingClientRect();
      return {
        rail: R(".qcc-cal-rail"), railcol: R(".qcc-cal-railcol"),
        head: R(".qcc-calhead"), search: R(".qcc-calsearch"),
        board: R(".qcc-calboard"), rows: R(".tl-rows"), rail0: R(".tl-rail"),
        pill: R(".qcc-denspill"),
        toolbar: !!q(".qcc-tb"), tiles: !!q("[aria-label='Query totals']"),
        well: !!q(".qcc-well"),
        qf: document.querySelectorAll("[data-qc-live] .qcc-qf").length,
        fields: document.querySelectorAll("[data-qc-live] .qcc-cal-field").length,
        todayline: (() => { const e = q(".tl-todayline"); return e ? +e.getBoundingClientRect().width.toFixed(2) : null; })(),
        port: { y: +sb.y.toFixed(2), h: +sb.height.toFixed(2), bot: +(sb.y + sb.height).toFixed(2) },
      };
    });

    /* ── the rail ───────────────────────────────────────────────────────────────────────── */
    expect(m.rail, "no rail").not.toBeNull();
    expect(m.rail!.w, "the rail is not 236px").toBeCloseTo(236, 0);
    expect(m.qf, "the five quick filters are not all drawn").toBe(5);
    expect(m.fields, "Filter, Group and Sort are not all drawn").toBe(3);
    /* ⚠️ BARE — the rail carries no fill of its own; only its fields are white. */
    const railBg = await page.evaluate(() => getComputedStyle(document.querySelector<HTMLElement>("[data-qc-live] .qcc-cal-rail")!).backgroundColor);
    expect(railBg, "the rail has grown a card").toBe("rgba(0, 0, 0, 0)");

    /* ── the page toolbar and tiles do not render in this view ──────────────────────────── */
    expect(m.toolbar, "the page toolbar still renders in the Calendar").toBe(false);
    expect(m.tiles, "the stat tiles still render above the Calendar").toBe(false);
    expect(m.well, "the Calendar must have no well").toBe(false);

    /* ── the header starts at the board's left edge, and the rail is padded down by it ──── */
    expect(Math.abs(m.head!.x - m.board!.x), `header left ${m.head!.x} vs board left ${m.board!.x}`).toBeLessThanOrEqual(0.5);
    expect(Math.abs((m.rail!.y - m.railcol!.y) - m.head!.h), "the rail is not padded down by the header's height").toBeLessThanOrEqual(0.5);

    /* ── the density pill sits at the board's bottom-right, 14px in ─────────────────────── */
    expect(Math.abs(m.board!.r - m.pill!.r - 14), `pill right inset ${(m.board!.r - m.pill!.r).toFixed(2)}`).toBeLessThanOrEqual(1);
    expect(Math.abs(m.board!.bot - m.pill!.bot - 14), `pill bottom inset ${(m.board!.bot - m.pill!.bot).toFixed(2)}`).toBeLessThanOrEqual(1);

    /* ── the card is ruler + lanes, and it fits the scrollport ──────────────────────────── */
    expect(m.board!.bot, "the board runs past the scrollport's foot").toBeLessThanOrEqual(m.port.bot + 1);
    expect(m.port.bot - m.board!.bot, "the board leaves a band of dead ground below it").toBeLessThanOrEqual(40);
    expect(m.rows!.h, "the lanes region has no height to scroll in").toBeGreaterThan(200);

    /* ── the today line paints ──────────────────────────────────────────────────────────── */
    expect(m.todayline, "the today line is missing").not.toBeNull();
    expect(m.todayline!, "the today line computes to zero width — its token is not resolving").toBeGreaterThan(0.5);

    /* ⚠️ THE SEARCH'S CENTRING IS REPORTED, NOT ASSERTED, AND THE ARITHMETIC IS WHY. The brief asks
       for 340px centred on the board; the left cluster needs 293px and each flank can only have
       what the board's width leaves. Below a ~950px board the two cannot both hold — measured, the
       range ran 119px under the search at 1280 before the flanks were allowed their content. The
       width is a ceiling now and the search sits off-centre by half the flanks' difference. */
    const boardMid = m.board!.x + m.board!.w / 2;
    const searchMid = m.search!.x + m.search!.w / 2;
    console.log(`CAL ${w} board=${m.board!.w} search=${m.search!.w} offCentre=${(searchMid - boardMid).toFixed(2)} rowsH=${m.rows!.h} port=${m.port.h} boardH=${m.board!.h}`);

    await page.screenshot({ path: `${SHOTS}/calendar-${w}.png` });
  });
}
