/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE THREE MEASUREMENTS DEFERRED FROM PART ONE (v39 part two, Phase 8).
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

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

/**
 * ⚠️ THE FADE IS PROVED BY PIXELS, ON EVERY COLOUR OF CARD.
 *
 * A mask is the one treatment whose whole claim is about compositing, and a computed style cannot
 * see compositing at all — it returns the DECLARED colour whatever the mask does to it. So the
 * browser decodes a screenshot and the card's own colour is sampled at three points across its
 * faded edge: the paint must move monotonically from the card toward the ground.
 */
test("a faded edge dissolves to the ground, on every colour of card", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1920, height: 900 });
  await page.waitForFunction("document.querySelectorAll('.tl-rrow').length > 3", null, { timeout: 20000 });
  await page.waitForTimeout(800);
  const shot = (await page.screenshot()).toString("base64");

  const read = await page.evaluate(`(async (b64) => {
    const img=new Image();
    await new Promise((ok,no)=>{img.onload=ok;img.onerror=no;img.src="data:image/png;base64,"+b64;});
    const cv=document.createElement("canvas"); cv.width=img.naturalWidth; cv.height=img.naturalHeight;
    cv.getContext("2d").drawImage(img,0,0); const ctx=cv.getContext("2d");
    const k=img.naturalWidth/window.innerWidth;
    const at=(x,y)=>{const d=ctx.getImageData(Math.round(x*k),Math.round(y*k),1,1).data;return [d[0],d[1],d[2]];};
    const vis=(s)=>[...document.querySelectorAll(s)].find(e=>e.getBoundingClientRect().height>0)||null;
    const top=(x,y)=>{const s=document.elementsFromPoint(x,y);return s.length?s[0]:null;};
    const out={ kinds:{}, ground:null };
    /* the ground, sampled where the lane owns it */
    const lane=vis(".tl-rrow .tl-c-tl");
    const lb=lane.getBoundingClientRect();
    out.ground=at(lb.right-14, lb.top+lb.height/2);

    for (const c of document.querySelectorAll(".tl-p.fadeR")) {
      const r=c.getBoundingClientRect();
      if (r.width<60 || r.top<90 || r.bottom>window.innerHeight-40) continue;
      const kind = c.classList.contains("hollow") ? "hollow"
                 : c.classList.contains("quiet") ? "quiet"
                 : c.classList.contains("owed") ? "owed" : "white";
      if (out.kinds[kind]) continue;
      const y=r.top+4;                        /* above the words, in the card's own fill */
      /* three points across the last 38px: deep inside, mid-fade, and at the very edge */
      const pts=[r.right-44, r.right-19, r.right-2];
      if (pts.some(x=>top(x,y)!==c)) continue;
      /* ⚠️ THE GROUND LOCAL TO THIS CARD, not the board's. The past is washed, so a card fading in
         the past dissolves toward a DARKER ground than one fading to the right of today — the first
         draft compared every card against the unwashed ground far right and reported two of three
         kinds as moving away from it, which was true and about the wrong ground. Sampled just past
         the card's own edge, at its own height, and only where the lane owns that pixel. */
      /* ⚠️ THE GROUND AT THE SAME X, FROM A ROW WHERE NOTHING COVERS IT. Two earlier attempts
         compared against the wrong ground and both were true about it: the board's ground far
         right is UNWASHED while the fade sits in the washed past, and the ground 6px past a live
         card's edge is right of today and unwashed too. The ground beneath a fade is the lane at
         THAT x, which only a different row can supply. */
      const groundAt=(gx)=>{
        for (const row of document.querySelectorAll(".tl-rrow")) {
          const l=row.querySelector(".tl-c-tl"); if(!l) continue;
          const b=l.getBoundingClientRect();
          if (b.height<=0||b.top<90||b.bottom>window.innerHeight-40) continue;
          const gy=b.top+b.height/2;
          if (top(gx,gy)===l) return at(gx,gy);
        }
        return null;
      };
      const grounds=pts.map(groundAt);
      if (grounds.some(g=>!g)) continue;
      out.kinds[kind]={ w:Math.round(r.width), grounds, samples: pts.map(x=>at(x,y)) };
    }
    return out;
  })(${JSON.stringify(shot)})`) as any;

  const d = (a: number[], b: number[]) => Math.abs(a[0]-b[0]) + Math.abs(a[1]-b[1]) + Math.abs(a[2]-b[2]);
  console.log(`board ground (right of today) = rgb(${read.ground.join(", ")})`);
  const kinds = Object.keys(read.kinds);
  let opaqueSeen = 0;
  for (const k of kinds) {
    const s = read.kinds[k];
    console.log(`  ${k.padEnd(7)} w=${String(s.w).padStart(4)}  ` +
      s.samples.map((p: number[], i: number) => `rgb(${p.join(",")})/gnd rgb(${s.grounds[i].join(",")})→${d(p, s.grounds[i])}`).join("  "));
  }
  /* ⚠️ POPULATION FIRST, and by KIND: one colour of card proves nothing about a mask that has to
     work whatever is behind it. */
  expect(kinds.length, `only ${kinds.length} kind(s) of faded card found: ${kinds.join(", ")}`)
    .toBeGreaterThan(1);
  for (const k of kinds) {
    const s = read.kinds[k];
    const dist = s.samples.map((p: number[], i: number) => d(p, s.grounds[i]));
    /**
     * ⚠️ EVERY KIND REACHES THE GROUND; ONLY AN OPAQUE ONE HAS A JOURNEY TO IT.
     *
     * A hollow card is `background: transparent` — it IS the ground at every point across its
     * fade, and its distances read 1 → 0 → 3, which is sub-pixel noise from the wash gradient
     * rather than a dissolve. Asserting a monotonic approach there demands movement from a card
     * that has nowhere to move: the claim would be about the wrong kind of object, and it failed
     * on correct output. What every card must do is END at the ground.
     */
    expect(dist[2], `${k}: the edge does not reach the ground — ${dist.join(" → ")}`).toBeLessThanOrEqual(6);
    if (dist[0] > 8) {
      expect(dist[1], `${k}: mid-fade is no closer to the ground than the card's fill — ${dist.join(" → ")}`)
        .toBeLessThan(dist[0]);
      expect(dist[2], `${k}: the edge is no closer to the ground than mid-fade — ${dist.join(" → ")}`)
        .toBeLessThan(dist[1]);
    }
    /* ⚠️ AND AT LEAST ONE KIND MUST HAVE HAD A JOURNEY, or this is three transparent cards
       reporting that they are already the ground. */
    if (dist[0] > 8) opaqueSeen += 1;
  }
  /* ⚠️ AT LEAST ONE KIND MUST HAVE HAD A JOURNEY TO MAKE, or this is three transparent cards
     reporting that they are already the ground — a clean table over nothing. */
  expect(opaqueSeen, "no card with an opaque fill was measured — every sample was already the ground")
    .toBeGreaterThan(0);
});

/** How much text does not fit, per range — the census part one deferred. */
test("the marquee census — how many cards overflow, and by how much", async ({ page }) => {
  const rows: string[] = [];
  let total = 0;
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  await page.waitForFunction("document.querySelectorAll('.tl-rrow').length > 3", null, { timeout: 20000 });
  for (const r of [0, 1, 2]) {
    await setRangeTo(page, r);
    const s = await page.evaluate(TAG + `(() => {
      if (!vis(".tl-board")) return { fatal: "no board" };
      const over=[]; let cards=0;
      for (const c of document.querySelectorAll(".tl-p")) {
        if (c.getBoundingClientRect().width<=0) continue;
        const line=c.querySelector(".tl-line"); if(!line) continue;
        cards+=1;
        if (line.classList.contains("fits")) continue;
        over.push(Number(line.dataset.over||"0"));
      }
      over.sort((a,b)=>a-b);
      return { cards, n:over.length, min:over[0]??null, max:over[over.length-1]??null,
               median: over.length?over[Math.floor(over.length/2)]:null };
    })()`) as any;
    expect(s.fatal, s.fatal).toBeUndefined();
    expect(s.cards, `range ${r}: no cards`).toBeGreaterThan(3);
    total += s.n;
    rows.push(`  range ${r}: ${s.n} of ${s.cards} cards overflow · min ${s.min}px · median ${s.median}px · max ${s.max}px`);
  }
  for (const x of rows) console.log(x);
  /* ⚠️ THE CENSUS MUST FIND SOMETHING, or it is a table of zeroes reported as a clean result. */
  expect(total, "no card overflows at any range — the marquee is unexercised").toBeGreaterThan(0);
});