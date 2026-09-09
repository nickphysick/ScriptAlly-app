import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";
import { writeFileSync, mkdirSync } from "node:fs";

const SHOTS = "/Users/nickphysick/ScriptAlly-app/reports/calendar-mount-shots";

/**
 * ⚠️ THE ASSERTION THIS WHOLE SEQUENCE EXISTS FOR: the same wait, drawn the same way, on both
 * pages. If it cannot be made to hold, the right answer is to stop rather than ship two calendars
 * that disagree.
 *
 * ⚠️ POSITIONS ARE COMPARED AS A FRACTION OF THE LANE, NOT IN RAW PIXELS, AND THAT IS NOT A
 * WEAKENING. The two pages give the board different widths — To-do carries a 232px sidebar, Query
 * Centre does not — so the lane is 808px on one and 1062px on the other. A raw pixel comparison
 * could only ever fail, and would be measuring the page's chrome rather than the board's
 * derivation. The tolerance is stated in pixels OF THE NARROWER LANE, so "within half a pixel"
 * means what it says on the tighter of the two.
 *
 * ⚠️ AND THE DATA ATTRIBUTES ARE COMPARED TOO, which is the stronger half. `data-from`,
 * `data-trueto`, `data-state` and `data-holder` are the bar ENGINE's own outputs; if those agree,
 * the two boards did not merely land in the same place, they made the same decision.
 */
type Bar = {
  qid: string; state: string; holder: string; namedend: string;
  from: string; truefrom: string; trueto: string;
  fx0: number; fx1: number; rowH: number; marks: number[]; cls: string; lanes: string;
};

const readBoard = async (page: import("@playwright/test").Page, root: string): Promise<Record<string, Bar>> =>
  page.evaluate((sel) => {
    const live = [...document.querySelectorAll<HTMLElement>(sel)].filter((e) => e.getBoundingClientRect().height > 0);
    if (live.length !== 1) throw new Error(`expected one visible board for ${sel}, found ${live.length}`);
    const scope = live[0];
    const out: Record<string, unknown> = {};
    for (const p of scope.querySelectorAll<HTMLElement>(".tl-p")) {
      const qid = p.getAttribute("data-qid");
      if (!qid) continue;
      const lane = p.closest(".tl-c-tl") as HTMLElement | null;
      const row = p.closest(".tl-rrow") as HTMLElement | null;
      if (!lane || !row) continue;
      const lr = lane.getBoundingClientRect();
      const br = p.getBoundingClientRect();
      if (lr.width <= 0) continue;
      const marks = [...row.querySelectorAll<HTMLElement>(".tl-mk2, .tl-mk")]
        .map((m) => +(((m.getBoundingClientRect().x + m.getBoundingClientRect().width / 2) - lr.x) / lr.width).toFixed(6))
        .sort((a, b) => a - b);
      out[qid] = {
        qid,
        state: p.getAttribute("data-state") ?? "",
        holder: p.getAttribute("data-holder") ?? "",
        namedend: p.getAttribute("data-namedend") ?? "",
        from: p.getAttribute("data-from") ?? "",
        truefrom: p.getAttribute("data-truefrom") ?? "",
        trueto: p.getAttribute("data-trueto") ?? "",
        fx0: +((br.x - lr.x) / lr.width).toFixed(6),
        fx1: +((br.x + br.width - lr.x) / lr.width).toFixed(6),
        rowH: +row.getBoundingClientRect().height.toFixed(2),
        marks,
        cls: p.className,
        lanes: row.style.getPropertyValue("--lanes") || getComputedStyle(row).getPropertyValue("--lanes").trim(),
        laneW: +lr.width.toFixed(2),
      };
    }
    return out as Record<string, Bar>;
  }, root);

test("§3 · the same wait renders the same on both boards — 1440", async ({ page }) => {
  mkdirSync(SHOTS, { recursive: true });

  await openRoute(page, "/todo/calendar", { width: 1440, height: 1000 });
  await page.waitForSelector(".tl-p", { timeout: 30000 });
  await page.waitForTimeout(800);
  const todo = await readBoard(page, ".tl-board");

  await openRoute(page, "/queries", { width: 1440, height: 1000 });
  await page.evaluate(() => {
    const live = [...document.querySelectorAll<HTMLElement>(".wpg.qc-wpg")].filter((e) => e.getBoundingClientRect().height > 0)[0];
    live.setAttribute("data-qc-live", "1");
  });
  await page.locator('[data-qc-live] .qvs button:has-text("Calendar")').first().click();
  await page.waitForTimeout(1500);
  const qc = await readBoard(page, "[data-qc-live] .tl-board");

  const shared = Object.keys(todo).filter((k) => k in qc).sort();
  console.log(`PARITY todo=${Object.keys(todo).length} qc=${Object.keys(qc).length} shared=${shared.length}`);
  console.log("SHARED " + JSON.stringify(shared.slice(0, 8)));

  /* ⚠️ A POPULATION FLOOR. "Every shared bar agrees" is satisfied by an empty intersection, which
     is the one result that would prove nothing at all. */
  expect(shared.length, "no query draws on BOTH boards — the comparison has no subject")
    .toBeGreaterThan(0);

  const laneW = Math.min(
    (todo[shared[0]] as unknown as { laneW: number }).laneW,
    (qc[shared[0]] as unknown as { laneW: number }).laneW,
  );
  const tol = 0.5 / laneW;                       /* half a pixel of the NARROWER lane */
  console.log(`LANES todo=${(todo[shared[0]] as unknown as {laneW:number}).laneW} qc=${(qc[shared[0]] as unknown as {laneW:number}).laneW} tol=${tol.toFixed(8)}`);

  const rows: string[] = [];
  const bad: string[] = [];
  for (const qid of shared) {
    const a = todo[qid], b = qc[qid];
    rows.push(`${qid}  state ${a.state}/${b.state}  from ${a.from}/${b.from}  trueto ${a.trueto}/${b.trueto}  fx0 ${a.fx0}/${b.fx0}  fx1 ${a.fx1}/${b.fx1}  rowH ${a.rowH}/${b.rowH}  marks ${a.marks.length}/${b.marks.length}`);

    /* the engine's own decisions — identical, not merely close */
    for (const k of ["state", "holder", "namedend", "from", "truefrom", "trueto"] as const) {
      if (b[k] !== a[k]) bad.push(`${qid}: ENGINE ${k} "${a[k]}" vs "${b[k]}"`);
    }
    const px = (d: number) => +(d * laneW).toFixed(3);
    /* ⚠️ THE START IS TWO TERMS AND THEY ARE IN DIFFERENT UNITS — comparing their SUM as a fraction
       is the wrong instrument, and it reported thirteen false disagreements before this was
       decomposed. A bar's left edge is `pct(from)`, which is a FRACTION of the lane, PLUS a fixed
       pixel decoration: a left-faded bar carries `left: 6px` so its dissolve has somewhere to
       happen. On lanes of 808px and 1062px the same 6px is a different fraction — 0.007426 against
       0.005650 — so the fraction check called two identical renders different. Measured both ways:
       0.007426 × 808 = 6.000 and 0.005650 × 1062 = 6.000.
       The day term is compared as a fraction, the decoration in pixels, each in its own units. */
    const decor = (x: number, from: string, lw: number) => +(x * lw - lw * (parseFloat(from) / 90)).toFixed(3);
    const dA = decor(a.fx0, a.from, (a as unknown as { laneW: number }).laneW);
    const dB = decor(b.fx0, b.from, (b as unknown as { laneW: number }).laneW);
    if (Math.abs(dA - dB) > 0.5) bad.push(`${qid}: START decoration ${dA}px vs ${dB}px (cls ${a.cls} / ${b.cls})`);
    if (Math.abs(a.fx1 - b.fx1) > tol) bad.push(`${qid}: END ${px(Math.abs(a.fx1 - b.fx1))}px (todo ${a.fx1} qc ${b.fx1})`);
    if (Math.abs(a.rowH - b.rowH) > 0.5) bad.push(`${qid}: ROW H ${a.rowH} vs ${b.rowH} (lanes ${a.lanes}/${b.lanes})`);
    if (a.marks.length !== b.marks.length) bad.push(`${qid}: MARK COUNT ${a.marks.length} vs ${b.marks.length}`);
    else a.marks.forEach((m, i) => {
      if (Math.abs(m - b.marks[i]) > tol) bad.push(`${qid}: MARK ${i} ${px(Math.abs(m - b.marks[i]))}px`);
    });
  }
  writeFileSync(`${SHOTS}/parity-1440.txt`, rows.join("\n"));
  console.log(`CHECKED ${shared.length} shared waits`);
  if (bad.length) console.log("MISMATCH\n  " + bad.join("\n  "));
  expect(bad, `the two boards disagree about ${bad.length} thing(s)`).toEqual([]);
});
