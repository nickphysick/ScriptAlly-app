/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ONE GROUND, AND THE WASH STOPS AT TODAY (v39 part two, Phases 1 and 2).
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

/** the sampler — a screenshot the BROWSER decodes, because a computed style cannot see a stack */
const sample = async (page: import("@playwright/test").Page) => {
  const shot = (await page.screenshot()).toString("base64");
  return page.evaluate(`(async (b64) => {
    const img=new Image();
    await new Promise((ok,no)=>{img.onload=ok;img.onerror=no;img.src="data:image/png;base64,"+b64;});
    const cv=document.createElement("canvas"); cv.width=img.naturalWidth; cv.height=img.naturalHeight;
    cv.getContext("2d").drawImage(img,0,0); const ctx=cv.getContext("2d");
    const k=img.naturalWidth/window.innerWidth;
    const at=(x,y)=>{const d=ctx.getImageData(Math.round(x*k),Math.round(y*k),1,1).data;return "rgb("+d[0]+", "+d[1]+", "+d[2]+")";};
    const vis=(s)=>[...document.querySelectorAll(s)].find(e=>e.getBoundingClientRect().height>0)||null;
    const top=(x,y)=>{const s=document.elementsFromPoint(x,y);return s.length?s[0]:null;};
    const out={};
    const line=vis(".tl-todayline"); const tx=line.getBoundingClientRect().left;
    out.todayX=tx;

    /* ⚠️ EVERY SAMPLE POINT IS PROVED TO BELONG TO WHAT IT CLAIMS. A pixel read where something
       else is on top is a true number about the wrong subject — the fault that reported a card's
       white track as unwashed ground in v37. */
    const mast=vis(".wsh");
    if (mast) { const r=mast.getBoundingClientRect();
      for (const dx of [40,80,120]) { const x=r.right-dx, y=r.top+8;
        if (top(x,y) && mast.contains(top(x,y))) { out.mast=at(x,y); out.mastPt=[Math.round(x),Math.round(y)]; break; } } }

    /* the controls strip, between the masthead and the board */
    const ctl=vis(".wpg-toolband");
    if (ctl) { const r=ctl.getBoundingClientRect();
      for (const dx of [8,20,40,70]) for (const dy of [4,10,20]) { const x=r.right-dx, y=r.top+dy;
        if (!out.ctl && top(x,y)===ctl) { out.ctl=at(x,y); out.ctlPt=[Math.round(x),Math.round(y)]; } } }

    /* an empty lane, right of today, owned by the lane itself */
    for (const row of document.querySelectorAll(".tl-rrow")) {
      const l=row.querySelector(".tl-c-tl"); if(!l) continue;
      const b=l.getBoundingClientRect();
      if (b.height<=0||b.top<90||b.bottom>window.innerHeight-40) continue;
      const x=Math.min(b.right-24, tx+140), y=b.top+b.height/2;
      if (x<=tx+20) continue;
      /* ⚠️ ALL THREE POINTS MUST BE CLEAR IN THE SAME ROW, and most rows fail that — a card sits
         over today on any relationship still running. Taking the first row with a clear lane and
         then hoping the other two points are free is how a sweep ends up with nothing where it
         wanted a colour. The row is only accepted once every point it has to answer for is
         actually owned by the lane.
         (No backticks in here: this is inside an evaluate template and one would close it.) */
      if (top(x,y)!==l || top(tx+4,y)!==l || top(tx-4,y)!==l) continue;
      out.lane=at(x,y); out.lanePt=[Math.round(x),Math.round(y)];
      out.rightOfToday=at(tx+4,y);
      out.leftOfToday=at(tx-4,y);
      out.laneRow=(row.querySelector(".tl-nm2")||{}).textContent;
      break;
    }
    /* the wash element's painted right edge */
    const laneAny=vis(".tl-rrow .tl-c-tl");
    const before=getComputedStyle(laneAny,"::before");
    out.washRight=laneAny.getBoundingClientRect().left+parseFloat(before.width||"0");
    return out;
  })(${JSON.stringify(shot)})`) as Promise<any>;
};

const lum = (c: string) => (c.match(/\d+/g) || []).map(Number).reduce((a, b) => a + b, 0);

test("one ground from the masthead to the board, and the wash stops at today", async ({ page }) => {
  const seen: string[] = [];
  for (const width of WIDTHS) {
    await openRoute(page, "/todo/calendar", { width, height: 900 });
    await page.waitForFunction("document.querySelectorAll('.tl-rrow').length > 3", null, { timeout: 20000 });

    for (const r of [0, 1, 2]) {
      await setRangeTo(page, r);
      const s = await sample(page);

      /* ⚠️ POPULATION FIRST, PER POINT. A sample that could not be taken is `undefined`, and
         `undefined === undefined` would make the ground claim pass by having no samples at all. */
      expect(s.mast, `${width}px r${r}: no masthead sample`).toBeTruthy();
      expect(s.lane, `${width}px r${r}: no clear lane sample right of today`).toBeTruthy();
      expect(s.rightOfToday, `${width}px r${r}: no sample 4px right of today`).toBeTruthy();
      expect(s.leftOfToday, `${width}px r${r}: no sample 4px left of today`).toBeTruthy();

      seen.push(`${width} r${r}: mast ${s.mast} · ctl ${s.ctl ?? "—"} · lane ${s.lane}`
        + ` · +4 ${s.rightOfToday} · -4 ${s.leftOfToday} · wash→${Math.round(s.washRight)} today ${Math.round(s.todayX)}`);

      /* ── ONE GROUND ───────────────────────────────────────────────────────────────────── */
      expect(s.lane, `${width}px r${r}: the lane's ground ${s.lane} is not the masthead's ${s.mast}`)
        .toBe(s.mast);
      /* ⚠️ REQUIRED, NOT SKIPPED. A guarded `if (s.ctl)` makes "the controls band could not be
         sampled" indistinguishable from "the controls band is the right colour", and the first
         draft of this took the second reading for eight runs by looking for a class that does not
         exist. The band is `.wpg-toolband`. */
      expect(s.ctl, `${width}px r${r}: no controls sample — the band was not found`).toBeTruthy();
      expect(s.ctl, `${width}px r${r}: the controls paint ${s.ctl}, not the ground ${s.mast}`)
        .toBe(s.mast);

      /* ── THE WASH STOPS AT TODAY ──────────────────────────────────────────────────────── */
      expect(Math.abs(s.washRight - s.todayX),
        `${width}px r${r}: the wash ends at ${Math.round(s.washRight)} and today is at ${Math.round(s.todayX)}`)
        .toBeLessThanOrEqual(1);
      expect(s.rightOfToday, `${width}px r${r}: 4px right of today is ${s.rightOfToday}, not the ground ${s.mast}`)
        .toBe(s.mast);
      /* ⚠️ MEASURABLY DARKER, not merely different — "different" passes on any accident. */
      expect(lum(s.leftOfToday),
        `${width}px r${r}: 4px left of today is ${s.leftOfToday}, no darker than the ground ${s.mast}`)
        .toBeLessThan(lum(s.mast) - 8);
    }
  }
  for (const x of seen) console.log(`  ${x}`);
});
