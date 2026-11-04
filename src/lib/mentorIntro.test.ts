/**
 * The hawk's one sequence after an import (v1.1, issue 6): one clock across the loading page's mount
 * and the loaded dashboard's, started once, never replayed.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { armMentorIntro, disarmMentorIntro, mentorIntroStart, mentorIntroArmed, finishMentorIntro, mentorLooking, MENTOR_INTRO, MENTOR_INTRO_END_MS, clipFrames } from "./mentorIntro";

beforeEach(() => disarmMentorIntro());

describe("the sequence's clock", () => {
  it("nothing plays unless an import armed it", () => {
    expect(mentorIntroStart(1000)).toBeNull();
  });
  it("the first mount starts it; a second mount (the loaded dashboard) carries on from the same start", () => {
    armMentorIntro();
    expect(mentorIntroStart(1000)).toBe(1000);
    expect(mentorIntroStart(2500)).toBe(1000);
  });
  it("arming again while it plays does not restart it", () => {
    armMentorIntro(); mentorIntroStart(1000); armMentorIntro();
    expect(mentorIntroStart(1800)).toBe(1000);
  });
  it("once over, it is never replayed", () => {
    armMentorIntro(); mentorIntroStart(1000);
    expect(mentorIntroStart(1000 + MENTOR_INTRO_END_MS)).toBeNull();
    expect(mentorIntroArmed()).toBe(false);
    expect(mentorIntroStart(9000)).toBeNull();
  });
  it("a failed commit disarms it; finishing ends it", () => {
    armMentorIntro(); disarmMentorIntro(); expect(mentorIntroStart(1)).toBeNull();
    armMentorIntro(); mentorIntroStart(1); finishMentorIntro(); expect(mentorIntroStart(2)).toBeNull();
  });
  it("he looks at the writer from 2.0s until 3.2s, and rises at 0.5s over 0.9s with a small overshoot", () => {
    expect([1999, 2000, 3199, 3200].map(mentorLooking)).toEqual([false, true, true, false]);
    expect(MENTOR_INTRO).toMatchObject({ RISE_AT_MS: 500, RISE_MS: 900, RISE_EASE: "cubic-bezier(.2, 1.25, .4, 1)", LOOK_AT_MS: 2000, BACK_AT_MS: 3200, FADE_MS: 160 });
  });
  it("the clip holds at the sheet's edge, then slides to the screen's edge across the overshoot", () => {
    const f = clipFrames(8);
    expect(f.map((k) => [k.offset, k.clipPath])).toEqual([
      [0, "inset(-400px -400px 8px -400px)"], [0.45, "inset(-400px -400px 8px -400px)"],
      [0.574, "inset(-400px -400px 0px -400px)"], [1, "inset(-400px -400px 0px -400px)"],
    ]);
  });
});
