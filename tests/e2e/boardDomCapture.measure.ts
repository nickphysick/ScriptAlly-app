import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";

const OUT = "/Users/nickphysick/ScriptAlly-app/reports/calendar-extract-dom";
/**
 * ⚠️ THE TAG IS REQUIRED, AND THE DEFAULT THAT USED TO BE HERE NEARLY DESTROYED THE THING THIS FILE
 * EXISTS TO PROTECT.
 *
 * It defaulted to `"before"`. The file was also named `calDomCapture.measure.ts`, so it matched the
 * `cal*.measure.ts` glob every lock run uses — and a lock run therefore REWROTE the reference
 * capture with the current DOM, silently, as its first act. It cost nothing exactly once, because
 * the extraction it was checking turned out to be lossless and the bytes it overwrote were the same
 * bytes. Had the board changed, the run that should have caught it would have destroyed the
 * evidence instead, and the diff afterwards would have been clean.
 *
 * The tell was arithmetic: a lock run's case count rose from 145 to 148 with no test added.
 *
 * Two fixes, because either alone leaves the trap armed: the file is renamed out of the `cal*`
 * glob, and the tag has no default. A default that silently selects a SUBJECT is worse than no
 * default — this repo already records that about `SA_E2E_BASE_URL`.
 */
const TAG = process.env.SA_DOM_TAG;
if (!TAG) {
  throw new Error(
    "SA_DOM_TAG is required — it names the capture (e.g. `before`, `after`). Without it this file "
    + "would overwrite whichever set the last run happened to write.",
  );
}

/* ⚠️ THE BOARD REGION, NOT THE PAGE — `.tl` is the board's root, the element declaring `--tl-days`.
   ⚠️ AND THE DOM ALONE IS NOT THE WHOLE NET. The board positions everything in `cqw` against
   `--tl-days`, so its markup is width-INDEPENDENT by construction and three captures come back
   byte-identical. That is the design working, not the probe failing — but it means a width-
   dependent regression cannot show up in the HTML, so the geometry is captured beside it. */
for (const w of [1280, 1440, 1920]) {
  test(`dom · the board region at ${w} (${TAG})`, async ({ page }) => {
    mkdirSync(OUT, { recursive: true });
    await openRoute(page, "/todo/calendar", { width: w, height: 1000 });
    await page.waitForSelector(".tl", { timeout: 30000 });
    await page.waitForTimeout(1200);
    const r = await page.evaluate(() => {
      const live = [...document.querySelectorAll<HTMLElement>(".tl")]
        .filter((e) => e.getBoundingClientRect().height > 0);
      if (live.length !== 1) throw new Error(`expected one visible .tl, found ${live.length}`);
      const tl = live[0];
      const lane = tl.querySelector<HTMLElement>(".tl-c-tl");
      const geo = [...tl.querySelectorAll<HTMLElement>(".tl-p")].slice(0, 8).map((e) => {
        const b = e.getBoundingClientRect();
        return `${e.className}|${b.x.toFixed(2)},${b.width.toFixed(2)},${b.height.toFixed(2)}`;
      });
      return {
        html: tl.outerHTML,
        innerWidth: window.innerWidth,
        tlWidth: +tl.getBoundingClientRect().width.toFixed(2),
        laneWidth: lane ? +lane.getBoundingClientRect().width.toFixed(2) : null,
        rowH: getComputedStyle(tl).getPropertyValue("--row-h").trim(),
        days: getComputedStyle(tl).getPropertyValue("--tl-days").trim(),
        geo,
      };
    });
    /* the viewport must actually be the one asked for, or three captures are one capture */
    expect(r.innerWidth, `viewport is ${r.innerWidth}, not ${w} — the captures would be copies`).toBe(w);
    /* ⚠️ THE REFERENCE IS WRITE-ONCE. `before` is the state the extraction is measured against, so
       it may not be re-taken by accident — only by someone who says so in the command. */
    const ref = `${OUT}/board-${w}-${TAG}.html`;
    if (TAG === "before" && existsSync(ref) && !process.env.SA_DOM_OVERWRITE) {
      throw new Error(`${ref} already exists — re-taking the reference needs SA_DOM_OVERWRITE=1`);
    }
    writeFileSync(ref, r.html);
    writeFileSync(`${OUT}/geo-${w}-${TAG}.json`, JSON.stringify(
      { innerWidth: r.innerWidth, tlWidth: r.tlWidth, laneWidth: r.laneWidth, rowH: r.rowH, days: r.days, geo: r.geo }, null, 2));
    console.log(`DOM ${w} ${TAG} — html ${r.html.length} · .tl ${r.tlWidth} · lane ${r.laneWidth} · --tl-days ${r.days}`);
    expect(r.html.length).toBeGreaterThan(2000);
  });
}
