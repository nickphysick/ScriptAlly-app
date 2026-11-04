/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The clipboard hawk's one appearance after an import (smart-import-photos-v1.1, issue 6).
 *
 * While the dashboard loads behind the importing loader, the Mentor in the dashboard's corner
 * rises into place, looks at the writer, and goes back to his clipboard. That happens ONCE, on the
 * load that follows an import commit, and never on an ordinary visit.
 *
 * ONE CLOCK ACROSS TWO MOUNTS. The hawk is drawn first by the loading page (the dashboard ghost
 * behind the loader) and then by the loaded dashboard, two different mounts of `Dash2Hawk`. Both
 * read the start time held here, so the sequence carries on from where it was when the page fills
 * in, and is never cut short or replayed. Module state, deliberately: a context would have to be
 * provided above both the onboarding frame and the workspace shell, which share no parent.
 */
export const MENTOR_INTRO = {
  /** He starts to rise this long after the loading page appears. */
  RISE_AT_MS: 500,
  RISE_MS: 900,
  /** A small overshoot. Its peak is at 57.4% of the rise, 2.04% past rest. */
  RISE_EASE: "cubic-bezier(.2, 1.25, .4, 1)",
  /** He turns to look at the writer, then goes back to his clipboard. */
  LOOK_AT_MS: 2000,
  BACK_AT_MS: 3200,
  FADE_MS: 160,
} as const;

/** When the sequence is over: the last cross-fade has finished. */
export const MENTOR_INTRO_END_MS = MENTOR_INTRO.BACK_AT_MS + MENTOR_INTRO.FADE_MS;

const st = { armed: false, t0: null as number | null };

/** The import has been committed: the next loading page plays the sequence. Idempotent while armed,
 *  so a render that arms twice does not restart the clock. */
export function armMentorIntro(): void {
  if (st.armed) return;
  st.armed = true;
  st.t0 = null;
}
/** The import did not go through: nothing plays. */
export function disarmMentorIntro(): void { st.armed = false; st.t0 = null; }
/** Whether a sequence is waiting or playing. */
export const mentorIntroArmed = (): boolean => st.armed;

/**
 * The sequence's start, starting it now on the first call after it was armed. Null when there is
 * nothing to play: not armed, or already over (which also ends it, so it can never replay).
 */
export function mentorIntroStart(now: number = Date.now()): number | null {
  if (!st.armed) return null;
  if (st.t0 === null) st.t0 = now;
  if (now - st.t0 >= MENTOR_INTRO_END_MS) { finishMentorIntro(); return null; }
  return st.t0;
}
/** Over: he stays in his resting pose, and the hover swap is all that is left. */
export function finishMentorIntro(): void { st.armed = false; st.t0 = null; }

/** Where the sequence is at this many ms in: is he looking at the writer? */
export const mentorLooking = (elapsed: number): boolean =>
  elapsed >= MENTOR_INTRO.LOOK_AT_MS && elapsed < MENTOR_INTRO.BACK_AT_MS;

/** The rise as keyframes, for the drawing inside a still wrapper. He starts wholly below his box. */
export const RISE_FRAMES: Keyframe[] = [{ transform: "translateY(calc(100% + 12px))" }, { transform: "translateY(0)" }];

/**
 * The wrapper's clip during the rise: the sheet's bottom edge, so he comes up from behind it. His
 * drawing runs to its last row and rests a few pixels past that edge (on the ink frame below), so a
 * clip released at rest would make his feet pop in. The line instead slides to the screen's edge
 * across the overshoot (from 45% of the rise to its peak at 57.4%), while his feet are near their
 * resting place: they come into view over ~110ms rather than in one frame.
 */
export function clipFrames(sheetGap: number): Keyframe[] {
  const at = (b: number) => `inset(-400px -400px ${Math.max(0, b)}px -400px)`;
  return [
    { clipPath: at(sheetGap), offset: 0 },
    { clipPath: at(sheetGap), offset: 0.45 },
    { clipPath: at(0), offset: 0.574 },
    { clipPath: at(0), offset: 1 },
  ];
}
