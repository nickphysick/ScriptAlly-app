/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from "vitest";
import { cycleFor, scrollMs, HOLD_START, HOLD_END, FADE_OUT, FADE_IN, MIN_SCROLL, OVERSHOOT } from "./calendarMarquee";

const tx = (f: { transform: string }) => Number(f.transform.replace(/[^-\d.]/g, ""));

describe("the marquee cycle", () => {
  it("never travels right where a reader can see it", () => {
    /* ⚠️ THE CLAIM OF THE WHOLE FILE, and it is asserted over every pair rather than spot-checked:
       a ping-pong is what you get by deleting the fade, and it looks like a reasonable
       simplification right up until a reader watches a word un-say itself. */
    /* ⚠️ CONSECUTIVE FRAMES, NOT THE VISIBLE ONES FILTERED OUT OF THE LIST. Filtering skips OVER
       the invisible reset, so the pair either side of it reads as one rightward jump — the first
       draft did exactly that and failed on a correct cycle. A move is permitted only across an
       interval the reader cannot see, which means BOTH of its endpoints are at zero opacity. */
    for (const overflow of [1, 12, 60, 240, 1000]) {
      const { frames } = cycleFor(overflow);
      expect(frames.filter((f) => f.opacity > 0).length, "no visible frame at all").toBeGreaterThan(3);
      let hidden = 0;
      for (let i = 1; i < frames.length; i++) {
        const a = frames[i - 1], b = frames[i];
        if (tx(b) <= tx(a)) continue;
        hidden += 1;
        expect(a.opacity + b.opacity,
          `overflow ${overflow}: the text moves right from ${tx(a)} to ${tx(b)} while visible`)
          .toBe(0);
      }
      /* and the reset must actually be in there — a cycle that never returns is not a cycle */
      expect(hidden, `overflow ${overflow}: the text never returns to the start`).toBe(1);
    }
  });

  it("the one rightward move is invisible", () => {
    const { frames } = cycleFor(120);
    const rightward = frames.filter((f, i) => i > 0 && tx(f) > tx(frames[i - 1]));
    expect(rightward.length, "more than one reset").toBe(1);
    expect(rightward[0].opacity, "the reset is visible").toBe(0);
  });

  it("travels the overflow plus the overshoot, so the tail clears the edge", () => {
    expect(Math.min(...cycleFor(200).frames.map(tx))).toBe(-(200 + OVERSHOOT));
    /* a line that overflows by nothing still yields a coherent cycle rather than NaN */
    expect(Math.min(...cycleFor(0).frames.map(tx))).toBe(-OVERSHOOT);
    expect(Math.min(...cycleFor(-5).frames.map(tx))).toBe(-OVERSHOOT);
  });

  it("the pace is 17ms a pixel with a floor, and the floor bites on short overflows", () => {
    expect(scrollMs(1000)).toBe((1000 + OVERSHOOT) * 17);
    expect(scrollMs(2)).toBe(MIN_SCROLL);
    expect(scrollMs(1000)).toBeGreaterThan(MIN_SCROLL);
  });

  it("the offsets rise, start at 0 and end at 1", () => {
    const { frames, durationMs } = cycleFor(90);
    expect(frames[0].offset).toBe(0);
    expect(frames[frames.length - 1].offset).toBeCloseTo(1, 9);
    for (let i = 1; i < frames.length; i++) {
      expect(frames[i].offset, `offset ${i} did not rise`).toBeGreaterThan(frames[i - 1].offset);
    }
    expect(durationMs).toBe(HOLD_START + scrollMs(90) + HOLD_END + FADE_OUT + FADE_IN);
  });

  it("the hold at the end is long enough to read the tail", () => {
    /* the reason 900ms is pinned rather than shaved: the tail is the part the reader came for */
    expect(HOLD_END).toBeGreaterThanOrEqual(700);
    const { frames } = cycleFor(300);
    const atEnd = frames.filter((f) => tx(f) < 0 && f.opacity === 1);
    expect(atEnd.length, "the text does not rest at the end").toBeGreaterThan(1);
  });
});
