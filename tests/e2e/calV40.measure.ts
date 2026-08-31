/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * v40 — TWO COLUMNS, AND TODAY AT THE MIDDLE.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

const WIDTHS = [1280, 1440, 1920];
const TAG = `const vis=(s)=>[...document.querySelectorAll(s)].find(e=>e.getBoundingClientRect().height>0)||null;`;
const setRangeTo = async (page: import("@playwright/test").Page, i: number) => {
  await page.evaluate(`(() => {
    const all=[...document.querySelectorAll('input[type=range]')].filter(e=>e.getBoundingClientRect().width>0);
    if (all.length !== 1) throw new Error("expected 1 visible range control, found " + all.length);
    const set=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,"value").set;
    set.call(all[0], String(${i})); all[0].dispatchEvent(new Event("input",{bubbles:true}));
  })()`);
  await page.waitForTimeout(650);
};

test("two columns, and the timeline takes the width the action column had", async ({ page }) => {
  const seen: string[] = [];
  for (const width of WIDTHS) {
    await openRoute(page, "/todo/calendar", { width, height: 900 });
    await page.waitForFunction("document.querySelectorAll('.tl-rrow').length > 3", null, { timeout: 20000 });

    for (const r of [0, 1, 2]) {
      await setRangeTo(page, r);
      const read = await page.evaluate(TAG + `(() => {
        if (!vis(".tl-board")) return { fatal: "no board" };
        const row = vis(".tl-rrow");
        const nm = row.querySelector(".tl-c-nm");
        const tl = row.querySelector(".tl-c-tl");
        if (!nm || !tl) return { fatal: "the row has lost a column" };
        const rr = row.getBoundingClientRect(), nr = nm.getBoundingClientRect(), tr = tl.getBoundingClientRect();
        return {
          /* ⚠️ THE COLUMN'S ROLE, NOT ITS CLASS. A deleted column that came back under another name
             would satisfy a class check perfectly; what must not exist is a third cell between the
             agent and the timeline. */
          cells: [...row.children].length,
          ac: document.querySelectorAll(".tl-c-ac, .tl-abtn, .tl-adash").length,
          rowW: Math.round(rr.width), nmW: Math.round(nr.width), tlW: Math.round(tr.width),
          gap: Math.round(tr.left - nr.right),
        };
      })()`) as any;
      expect(read.fatal, `${width}px r${r}: ${read.fatal}`).toBeUndefined();
      seen.push(`${width} r${r}: ${read.cells} cells · agent ${read.nmW} · timeline ${read.tlW}`
        + ` · row ${read.rowW} · residue ${read.ac}`);

      expect(read.ac, `${width}px r${r}: ${read.ac} action-column element(s) survive`).toBe(0);
      expect(read.cells, `${width}px r${r}: the row has ${read.cells} cells, not 2`).toBe(2);
      /* the timeline takes the rest, to the pixel */
      expect(Math.abs(read.tlW - (read.rowW - read.nmW)),
        `${width}px r${r}: timeline ${read.tlW} against row ${read.rowW} less agent ${read.nmW}`)
        .toBeLessThanOrEqual(1);
    }
  }
  for (const s of seen) console.log(`  ${s}`);
});

test("today sits at the middle of the lane", async ({ page }) => {
  const seen: string[] = [];
  for (const width of WIDTHS) {
    await openRoute(page, "/todo/calendar", { width, height: 900 });
    await page.waitForFunction("document.querySelectorAll('.tl-rrow').length > 3", null, { timeout: 20000 });
    for (const r of [0, 1, 2]) {
      await setRangeTo(page, r);
      const read = await page.evaluate(TAG + `(() => {
        const line = vis(".tl-todayline"); const lane = vis(".tl-rrow .tl-c-tl");
        if (!line || !lane) return { fatal: "no today line or lane" };
        const lr = lane.getBoundingClientRect();
        return { todayX: line.getBoundingClientRect().left,
                 centre: lr.left + lr.width / 2, laneW: Math.round(lr.width) };
      })()`) as any;
      expect(read.fatal, `${width}px r${r}: ${read.fatal}`).toBeUndefined();
      const off = read.todayX - read.centre;
      seen.push(`${width} r${r}: today ${Math.round(read.todayX)} · centre ${Math.round(read.centre)}`
        + ` · off ${off.toFixed(1)}px of a ${read.laneW}px lane`);
      expect(Math.abs(off),
        `${width}px r${r}: today is ${off.toFixed(1)}px from the lane's centre`).toBeLessThanOrEqual(1);
    }
  }
  for (const s of seen) console.log(`  ${s}`);
});
