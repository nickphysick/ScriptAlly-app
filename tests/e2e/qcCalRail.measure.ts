import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";
import { mkdirSync } from "node:fs";

const SHOTS = "/Users/nickphysick/ScriptAlly-app/reports/qc-calendar-shots";
const WIDTHS = [1280, 1536, 1710, 1920, 2520];

const open = async (page: import("@playwright/test").Page, w: number) => {
  await openRoute(page, "/queries", { width: w, height: 1000 });
  await page.evaluate(() => {
    const l = [...document.querySelectorAll<HTMLElement>(".wpg.qc-wpg")].filter((e) => e.getBoundingClientRect().height > 0);
    if (l.length !== 1) throw new Error(`expected one visible Query Centre, found ${l.length}`);
    l[0].setAttribute("data-qc-live", "1");
  });
  await page.locator('[data-qc-live] .qvs button:has-text("Calendar")').first().click();
  await page.waitForTimeout(1300);
};

for (const w of WIDTHS) {
  test(`§3+§4 · the rail's census and fields at ${w}`, async ({ page }) => {
    mkdirSync(SHOTS, { recursive: true });
    await open(page, w);
    const m = await page.evaluate(() => {
      const q = (s: string) => document.querySelector<HTMLElement>("[data-qc-live] " + s);
      const B = (s: string) => { const e = q(s); if (!e) return null; const b = e.getBoundingClientRect();
        const cs = getComputedStyle(e);
        return { x: +b.x.toFixed(2), y: +b.y.toFixed(2), w: +b.width.toFixed(2), h: +b.height.toFixed(2),
                 bot: +(b.y + b.height).toFixed(2), r: +(b.x + b.width).toFixed(2),
                 fs: cs.fontSize, text: (e.textContent || "").trim() }; };
      /* the baseline of a single line of text = its box bottom less the descent below the baseline;
         with equal font-size and line-height the two boxes' bottoms ARE the baselines' offset */
      return {
        census: B(".qcc-cal-showing"), railtop: B(".qcc-cal-railtop"),
        rail: B(".qcc-cal-rail"), railcol: B(".qcc-cal-railcol"),
        range: B(".qcc-calhead-rng"), head: B(".qcc-calhead"), board: B(".qcc-calboard"),
        censusCount: document.querySelectorAll("[data-qc-live] .qcc-cal-showing").length,
        tally: document.querySelectorAll("[data-qc-live] .qcc-tally").length,
        labs: [...document.querySelectorAll<HTMLElement>("[data-qc-live] .qcc-cal-lab")].map((l) => {
          const f = l.parentElement!.querySelector<HTMLElement>(".qcc-cal-ctrl")!;
          return +(f.getBoundingClientRect().y - (l.getBoundingClientRect().y + l.getBoundingClientRect().height)).toFixed(2);
        }),
        ctrlW: [...document.querySelectorAll<HTMLElement>("[data-qc-live] .qcc-cal-ctrl")].map((c) => +c.getBoundingClientRect().width.toFixed(2)),
        openCount: document.querySelectorAll("[data-qc-live] .qcc-cal-ctrl.open").length,
      };
    });

    /* ── exactly one census, on the rail, on the range's baseline, at the range's size ──── */
    expect(m.censusCount, "there must be exactly one census element").toBe(1);
    expect(m.tally, "the toolbar's own tally must not render in this view").toBe(0);
    expect(Math.abs(m.census!.x - m.rail!.x), `census left ${m.census!.x} vs rail left ${m.rail!.x}`).toBeLessThanOrEqual(1);
    expect(Math.abs(m.census!.bot - m.range!.bot), `census baseline ${m.census!.bot} vs range ${m.range!.bot}`).toBeLessThanOrEqual(1);
    expect(m.census!.fs, "the census is not the range's size").toBe(m.range!.fs);
    expect(m.census!.w, `the census is ${m.census!.w}px wide against a 236px rail`).toBeLessThanOrEqual(236);

    /* ── unfiltered says no "of" ─────────────────────────────────────────────────────────── */
    expect(m.census!.text.includes(" of "), `unfiltered census reads "${m.census!.text}"`).toBe(false);

    /* ── the two tops and the two lefts ──────────────────────────────────────────────────── */
    expect(Math.abs(m.head!.x - m.board!.x), "header row does not start at the board's left edge").toBeLessThanOrEqual(1);
    expect(Math.abs(m.railcol!.y - m.board!.y), "the rail's body does not start at the board's top edge").toBeLessThanOrEqual(1);

    /* ── §4 · every caption stands off its field, and every trigger is full width ────────── */
    expect(m.labs.length, "no rail labels found").toBe(3);
    for (const gap of m.labs) expect(gap, `a label sits ${gap}px from its field`).toBeGreaterThanOrEqual(4);
    for (const cw of m.ctrlW) expect(Math.abs(cw - m.rail!.w), `a trigger is ${cw} against a rail of ${m.rail!.w}`).toBeLessThanOrEqual(1);
    expect(m.openCount, "a trigger carries the open treatment with no popover open").toBe(0);

    console.log(`RAIL ${w} census="${m.census!.text}" ${m.census!.fs} w=${m.census!.w} | range ${m.range!.fs} | labGaps ${m.labs.join("/")} | ctrl ${m.ctrlW.join("/")}`);
    await page.screenshot({ path: `${SHOTS}/calendar-${w}.png` });
  });
}

test("§3 · once narrowed, the census says what it is showing of what — 1710", async ({ page }) => {
  await open(page, 1710);
  const before = await page.evaluate(() => document.querySelector("[data-qc-live] .qcc-cal-showing")!.textContent!.trim());
  await page.locator("[data-qc-live] .qcc-calsearch input").first().fill("Blaine");
  await page.waitForTimeout(900);
  const after = await page.evaluate(() => ({
    text: document.querySelector("[data-qc-live] .qcc-cal-showing")!.textContent!.trim(),
    w: +document.querySelector("[data-qc-live] .qcc-cal-showing")!.getBoundingClientRect().width.toFixed(2),
  }));
  console.log(`CENSUS "${before}" -> "${after.text}" (w ${after.w})`);
  expect(before.includes(" of "), "the unfiltered census names a filter nobody applied").toBe(false);
  expect(after.text.includes(" of "), "the narrowed census does not say what it is showing of what").toBe(true);
  expect(after.w, "the filtered census overruns the rail").toBeLessThanOrEqual(236);
});

test("§4 · the open trigger, and only it, carries the open treatment — 1710", async ({ page }) => {
  await open(page, 1710);
  await page.locator("[data-qc-live] .qcc-cal-ctrl").first().click();
  await page.waitForTimeout(500);
  const m = await page.evaluate(() => {
    const all = [...document.querySelectorAll<HTMLElement>("[data-qc-live] .qcc-cal-ctrl")];
    return {
      open: all.filter((c) => c.classList.contains("open")).length,
      ring: all.filter((c) => c.classList.contains("open")).map((c) => getComputedStyle(c).boxShadow)[0] ?? null,
      border: all.filter((c) => c.classList.contains("open")).map((c) => getComputedStyle(c).borderTopColor)[0] ?? null,
    };
  });
  console.log("OPEN " + JSON.stringify(m));
  expect(m.open, "exactly one trigger should be open").toBe(1);
  expect(m.ring, "the open trigger has no focus ring").not.toBe("none");
  expect(m.border, "the open trigger keeps the resting border").toBe("rgb(205, 191, 177)");
});
