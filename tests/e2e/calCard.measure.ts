/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE CARD, THE PILL AND THE FADE (v39, Phases 2 and 4).
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { setRangeTo } from "./calControls";

const WIDTHS = [1280, 1440, 1920];
const HEIGHT = 900;
const TAG = `
  const vis = (sel) => [...document.querySelectorAll(sel)]
    .find((e) => e.getBoundingClientRect().height > 0) || null;
`;

test("every card is an object, and every pill is the app's own word", async ({ page }) => {
  const errors: string[] = [];
  /* ⚠️ COUNTED ACROSS THE WHOLE SWEEP, NOT PER COMBINATION. A width and range where every card is
     cut at one end is a legitimate board — at 1280/Month all 23 relationships run past the visible
     month — so a per-combination floor fails on a correct page. The claim that has to hold is that
     the radius was tested SOMEWHERE, which is what stops the fade predicate emptying it again. */
  let uncutSeen = 0;
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

  /* ⚠️ THE PERMITTED WORDS COME FROM THE SOURCE, never a list typed out here. A hand-copied set
     drifts from the enum the moment a status is added and then passes by describing a vocabulary
     the app no longer has. */
  const types = readFileSync(join(process.cwd(), "src/types.ts"), "utf8");
  const statuses = [...types.matchAll(/^\s+[A-Z_]+ = "([^"]+)",$/gm)].map((m) => m[1]);
  const pillSrc = readFileSync(join(process.cwd(), "src/lib/calendarPill.ts"), "utf8");
  const deeds = [...pillSrc.matchAll(/^\s+\w+: "([^"]+)",$/gm)].map((m) => m[1]);
  expect(statuses.length, "no statuses parsed out of types.ts").toBeGreaterThan(8);
  expect(deeds.length, "no deeds parsed out of calendarPill.ts").toBeGreaterThan(3);
  const allowed = new Set([...statuses, ...deeds]);

  const seenWords = new Set<string>();
  let cards = 0;

  for (const width of WIDTHS) {
    await openRoute(page, "/todo/calendar", { width, height: HEIGHT });
    await page.waitForFunction("document.querySelectorAll('.tl-rrow').length > 3", null, { timeout: 20000 });

    for (const r of [0, 1, 2]) {
      await setRangeTo(page, r);
      const read = await page.evaluate(TAG + `(() => {
        if (!vis(".tl-board")) return { fatal: "no board" };
        const out = { pills: [], geom: [], laneClips: null, fillEls: 0 };
        out.fillEls = document.querySelectorAll(".tl-fl").length;
        const lane = vis(".tl-c-tl");
        out.laneClips = lane ? getComputedStyle(lane).overflowX : null;
        for (const c of document.querySelectorAll(".tl-p")) {
          const cr = c.getBoundingClientRect();
          if (cr.width <= 0) continue;
          const p = c.querySelector(".tl-pill");
          if (p) out.pills.push({ text: p.textContent, tone: [...p.classList].filter((x) => x !== "tl-pill").join(" ") });
          const cs = getComputedStyle(c);
          /* ⚠️ THE RADIUS IS READ OFF THE FRAME, NOT THE CARD. v54 moved the border, the shadow
             and the corner onto .tl-frame, so .tl-p reports 0px — the same relocation that had
             calText reading a shadow off the wrong element. Read where the value lives. */
          const fr = c.querySelector(".tl-frame");
          out.geom.push({
            h: Math.round(cr.height),
            radius: getComputedStyle(fr || c).borderTopLeftRadius,
            faded: c.className.includes("fade"),
          });
        }
        return out;
      })()`) as any;
      expect(read.fatal, `${width}px r${r}: ${read.fatal}`).toBeUndefined();

      expect(read.geom.length, `${width}px r${r}: no cards`).toBeGreaterThan(3);
      cards += read.geom.length;

      /* ⚠️ NO FILL ELEMENT ANYWHERE. Deleted, not hidden — the claim of Phase 3, asserted on the
         rendered page rather than on the stylesheet, because a rule can go while a render stays. */
      expect(read.fillEls, `${width}px r${r}: ${read.fillEls} fill elements survive`).toBe(0);

      /* the lane must not clip, or a hovered card's shadow is sheared at the edge */
      expect(read.laneClips, `${width}px r${r}: the lane clips`).toBe("visible");

      /* ⚠️ THE HEIGHT IS THE TOKEN'S, AS A DISTINCT SET. One card drawn wrong disappears into a
         mean, and the mean is what a spot check reports. */
      expect([...new Set(read.geom.map((g: any) => g.h))],
        `${width}px r${r}: card heights ${JSON.stringify([...new Set(read.geom.map((g: any) => g.h))])}`)
        .toEqual([54]);

      /* a card that is not cut is a 9px pill of a box; a cut one squares the faded corner */
      /* ⚠️ THE POPULATION FIRST, AND THIS IS WHY. Until v55 fixed the fade predicate EVERY card
         carried `fadeR`, so this filter was empty and the assertion passed over nothing — for as
         long as the fade bug existed. It went red the moment unfaded cards appeared, which is the
         lock working for the first time rather than a regression. A filtered claim states how many
         subjects it found, or it is one upstream bug away from proving nothing. */
      const unfaded = read.geom.filter((g: any) => !g.faded);
      uncutSeen += unfaded.length;
      const wrongRadius = unfaded.filter((g: any) => g.radius !== "9px");
      expect(wrongRadius, `${width}px r${r}: a card is not 9px round`).toEqual([]);

      for (const p of read.pills) {
        seenWords.add(p.text);
        expect(allowed.has(p.text),
          `${width}px r${r}: the pill says "${p.text}", which is neither a QueryStatus nor a deed`)
          .toBe(true);
      }
    }
  }
  console.log(`cards measured: ${cards}`);
  console.log(`pill words seen: ${JSON.stringify([...seenWords].sort())}`);
  /* ⚠️ A CENSUS, NOT A COUNT. A board drawing one pill word satisfies "every word is permitted"
     perfectly while proving nothing about the vocabulary. */
  expect(seenWords.size, `only ${seenWords.size} distinct pill word(s) — the sweep is a monoculture`)
    .toBeGreaterThan(2);
  expect(uncutSeen,
    "no uncut card at any width or range, so the corner radius was never tested").toBeGreaterThan(0);
  expect(errors, `console errors: ${errors.join(" | ")}`).toEqual([]);
});
