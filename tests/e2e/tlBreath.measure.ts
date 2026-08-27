import { test, expect } from "@playwright/test";
import { openRoute, liftMotionSuppression } from "./measure";

/**
 * Phase 3 — long-standing breathes, and a reader who asks for stillness is told the same thing.
 *
 * ⚠️ MOTION IS NEVER THE ONLY SIGNAL, and that is the half a check usually misses. Asserting
 * `animation: none` under reduce is easy and passes on the old broken rule, which stopped the
 * pulse and said nothing in its place. The claim is that the INFORMATION survives.
 */
/**
 * ⚠️ THE TWO KINDS ARE STILL MEASURED SEPARATELY, THOUGH THEY NOW TAKE THE SAME KEYFRAME. They
 * briefly took different ones — a clamped bar animating its background alone, so the pulse could
 * not recolour a `currentColor` edge that says "this began before the board". That split is gone
 * because BORDERS ARE TRANSPARENT: the fill breathes through them, so nothing animates a border
 * and nothing can outrank a clamp. The split survives in the PROBE because a clamped bar is a
 * different object to look at, and because "the first `.tl-seg.s-y3`" once answered about
 * whichever happened to be first — which was a clamped one, and read as the pulse being the wrong
 * animation rather than as the probe picking the wrong bar.
 */
const find = `(() => {
  const all = [...document.querySelectorAll(".tl")];
  const tl = all.find((e) => e.getBoundingClientRect().height > 0);
  const read = (el) => {
    if (!el) return null;
    const cs = getComputedStyle(el);
    return { name: cs.animationName, dur: cs.animationDuration, bg: cs.backgroundColor, bd: cs.borderTopColor };
  };
  const bars = [...tl.querySelectorAll(".tl-seg.s-y3")];
  const clamped = bars.find((e) => e.classList.contains("openleft") || e.classList.contains("future"));
  const whole = bars.find((e) => !e.classList.contains("openleft") && !e.classList.contains("future"));
  return { n: bars.length, clamped: read(clamped), whole: read(whole), any: read(bars[0]) };
})()`;

test("Phase 3 — the pulse, and its equal under reduced motion", async ({ page }) => {
  const errs: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text().slice(0, 140)); });

  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  /* ⚠️ THE HARNESS SUPPRESSES ANIMATION WITH A STYLESHEET RULE, so every `animationName` reads
     `none` until it is lifted — the harness answering, not the page. Both cases lift it, and the
     REDUCE case needs it more than this one: with suppression on it reports `none` whatever the
     rule says, so it would have passed on a build that had no reduced-motion rule at all. */
  await liftMotionSuppression(page);
  await page.waitForTimeout(900);
  const slider = page.getByRole("slider", { name: /range/i });
  await slider.fill("4");
  await page.waitForTimeout(700);

  const live = await page.evaluate<any>(find);
  console.log(`  ${live.n} long-standing bar(s) · whole: ${live.whole ? `${live.whole.name} ${live.whole.dur}` : "none present"}` +
    ` · clamped: ${live.clamped ? `${live.clamped.name} ${live.clamped.dur}` : "none present"}`);
  /* ⚠️ THE POPULATION FIRST — every clause below is satisfied by a board with no y3 on it. */
  expect(live.n, "no long-standing bar on this account — nothing was measured").toBeGreaterThan(0);
  expect(live.any.dur, "the breath is not 2.6s").toBe("2.6s");
  if (live.whole) expect(live.whole.name, "an unclamped long-standing bar does not breathe").toBe("tlUrge");
  else console.log("  NOTE: no unclamped long-standing bar on this account");
  if (live.clamped) expect(live.clamped.name, "a clamped long-standing bar does not breathe").toBe("tlUrge");
  else console.log("  NOTE: no clamped long-standing bar on this account");
  expect(live.whole || live.clamped, "neither kind rendered").toBeTruthy();

  /* ⚠️ IT ACTUALLY MOVES, asserted by SEEKING rather than by waiting. A computed value read at an
     arbitrary moment can equal the resting one legitimately; two seeked times cannot both. This
     repo has been caught reading a transitioned property at its start value and calling the rule
     dead, so the animation is driven rather than watched. */
  const frames = await page.evaluate(() => {
    const all = [...document.querySelectorAll(".tl")] as HTMLElement[];
    const tl = all.find((e) => e.getBoundingClientRect().height > 0)!;
    const el = tl.querySelector(".tl-seg.s-y3") as HTMLElement;
    const an = el.getAnimations()[0];
    if (!an) return null;
    const at = (t: number) => { an.currentTime = t; return getComputedStyle(el).backgroundColor; };
    return { rest: at(0), mid: at(1300), back: at(2600) };
  });
  console.log(`  seeked: 0ms ${frames?.rest} · 1300ms ${frames?.mid} · 2600ms ${frames?.back}`);
  expect(frames, "the bar carries no running animation").not.toBeNull();
  expect(frames!.mid, "the breath does not move — same colour at rest and mid-cycle").not.toBe(frames!.rest);
  expect(frames!.back, "the breath does not return").toBe(frames!.rest);
  expect(frames!.rest, "the resting stop is not --bar-y3-fill").toBe("rgb(243, 219, 208)");
  expect(frames!.mid, "the deep stop is not --bar-urgent-fill").toBe("rgb(233, 195, 178)");

  console.log(`console errors: ${errs.length ? errs.join(" | ") : "none"}`);
  expect(errs, "the board threw").toEqual([]);
});

test("Phase 3 — under reduce, the pulse stops and the bar deepens", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce" });
  const page = await ctx.newPage();
  const errs: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text().slice(0, 140)); });

  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  await liftMotionSuppression(page);
  await page.waitForTimeout(900);
  await page.getByRole("slider", { name: /range/i }).fill("4");
  await page.waitForTimeout(700);

  const r = await page.evaluate<any>(find);
  console.log(`  reduce: ${r.n} bar(s) · ${r.any ? `${r.any.name} · ${r.any.bg} · border ${r.any.bd}` : "none"}`);
  expect(r.n, "no long-standing bar under reduce — nothing was measured").toBeGreaterThan(0);
  /* ⚠️ BOTH KINDS, because both have a reduced-motion rule and only one of them would be caught
     by a probe that took the first bar it found. */
  for (const kind of ["whole", "clamped"] as const) {
    const v = r[kind];
    if (!v) { console.log(`  NOTE: no ${kind} long-standing bar under reduce`); continue; }
    expect(v.name, `${kind}: the pulse still runs under reduce`).toBe("none");
    /* ⚠️ AND IT STILL SAYS SOMETHING. The bar settles at the deeper end of its own breath, so the
       stretch that has run longest is distinguishable without anything moving. */
    expect(v.bg, `${kind}: reduce stopped the pulse and said nothing in its place`).toBe("rgb(233, 195, 178)");
    /* the border is transparent, so it deepens WITH the fill rather than needing its own rule */
    expect(v.bd, `${kind}: the border is painted rather than transparent`).toBe("rgba(0, 0, 0, 0)");
  }

  console.log(`console errors: ${errs.length ? errs.join(" | ") : "none"}`);
  expect(errs, "the board threw").toEqual([]);
  await ctx.close();
});
