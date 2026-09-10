import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";

/**
 * ⚠️ THE BOARD'S INTERIOR, CAPTURED SO A LAYOUT RUN CAN PROVE IT DID NOT TOUCH IT.
 *
 * The lanes region is what this run must leave alone: rows, lanes, bars, marks, the ruler. It is
 * captured as GEOMETRY RELATIVE TO THE LANE rather than as page coordinates, because the whole
 * point of the run is that the board MOVES — a rail appears beside it and a header above it — so
 * absolute positions are expected to change and would report the intended change as damage.
 * What must not change is the board's own arrangement inside itself.
 *
 * ⚠️ NAMED OUT OF THE LOCK GLOB, AND THAT IS DELIBERATE. It requires `SA_LANES_TAG` and THROWS at
 * module load without one — which is right for a capture whose whole danger is writing over the
 * reference — but it also means a glob run that sweeps it in dies at COLLECTION, taking the whole
 * lock run with it. That happened once here under `qcCal*`. `boardDomCapture` is out of the glob
 * for the same reason and this follows it: a capture tool is run deliberately, never incidentally.
 */
const OUT = "/Users/nickphysick/ScriptAlly-app/reports/calendar-layout-dom";
const TAG = process.env.SA_LANES_TAG;
if (!TAG) throw new Error("SA_LANES_TAG is required (e.g. `before`, `after`)");

for (const w of [1280, 1440, 1920]) {
  test(`lanes geometry at ${w} (${TAG})`, async ({ page }) => {
    mkdirSync(OUT, { recursive: true });
    await openRoute(page, "/queries", { width: w, height: 1000 });
    await page.evaluate(() => {
      const live = [...document.querySelectorAll<HTMLElement>(".wpg.qc-wpg")].filter((e) => e.getBoundingClientRect().height > 0)[0];
      live.setAttribute("data-qc-live", "1");
    });
    await page.locator('[data-qc-live] .qvs button:has-text("Calendar")').first().click();
    await page.waitForTimeout(1500);
    const shape = await page.evaluate(() => {
      const tl = document.querySelector<HTMLElement>("[data-qc-live] .tl")!;
      const lane0 = tl.querySelector<HTMLElement>(".tl-c-tl")!;
      const lw = lane0.getBoundingClientRect().width;
      const rel = (e: HTMLElement, lane: HTMLElement) => {
        const b = e.getBoundingClientRect(), l = lane.getBoundingClientRect();
        return [+((b.x - l.x) / l.width).toFixed(6), +(b.width / l.width).toFixed(6), +b.height.toFixed(2)];
      };
      const bars = [...tl.querySelectorAll<HTMLElement>(".tl-p")].map((p) => {
        const lane = p.closest(".tl-c-tl") as HTMLElement;
        return { qid: p.getAttribute("data-qid"), cls: p.className, box: rel(p, lane) };
      }).sort((a, b) => String(a.qid).localeCompare(String(b.qid)));
      const rows = [...tl.querySelectorAll<HTMLElement>(".tl-rrow")].map((r) => ({
        key: r.getAttribute("data-rowkey"), h: +r.getBoundingClientRect().height.toFixed(2),
        lanes: getComputedStyle(r).getPropertyValue("--lanes").trim(),
      })).sort((a, b) => String(a.key).localeCompare(String(b.key)));
      const marks = [...tl.querySelectorAll<HTMLElement>(".tl-mk2, .tl-mk")].map((m) => {
        const lane = m.closest(".tl-c-tl") as HTMLElement | null;
        return lane ? rel(m, lane)[0] : null;
      }).filter(Boolean).sort();
      const cs = getComputedStyle(tl);
      return {
        laneWidth: +lw.toFixed(2), tlDays: cs.getPropertyValue("--tl-days").trim(),
        rowH: getComputedStyle(tl.closest(".tl-board") as HTMLElement).getPropertyValue("--row-h").trim(),
        bars, rows, marks,
        railTiles: [...tl.querySelectorAll(".tl-dt")].length,
      };
    });
    const f = `${OUT}/lanes-${w}-${TAG}.json`;
    if (TAG === "before" && existsSync(f) && !process.env.SA_LANES_OVERWRITE) {
      throw new Error(`${f} exists — re-taking the reference needs SA_LANES_OVERWRITE=1`);
    }
    writeFileSync(f, JSON.stringify(shape, null, 1));
    console.log(`LANES ${w} ${TAG} bars=${shape.bars.length} rows=${shape.rows.length} marks=${shape.marks.length} lane=${shape.laneWidth}`);
    expect(shape.bars.length, "no bars — nothing to compare").toBeGreaterThan(3);
  });
}
