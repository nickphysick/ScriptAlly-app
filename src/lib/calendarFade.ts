/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * WHICH EDGES OF A CARD DISSOLVE (v39 part two, Phase 3).
 *
 * ⚠️ TWO PREDICATES, AND THEY ARE THE ONLY SOURCE OF THE FADE CLASSES. The first implementation
 * read `openLeft` and `openRight || live` — which is nearly this, and "nearly" is the problem:
 * `openRight` is a COMPOUND that also asks whether the journey is terminal, whether it closes,
 * whether it is open-ended and whether a reply window was ever given. A card's edge dissolved
 * because of a decision about reply windows, and nothing on the page said so. Measured on the
 * deployed board: 23 of 32 cards faded left and 20 faded right, many both, and one 19px card
 * carried a 38px fade — a mask wider than the thing it was masking.
 *
 * ⚠️ AND THEY ARE STATED AS ARITHMETIC OVER THE STRETCH'S OWN DATES, so a lock can assert the
 * classes against the numbers rather than asking the class about itself. That was the reason the
 * Phase 0 audit could not be built: the page published only the CLIPPED coordinates, so every
 * leading piece reported a start of 0 — which is where a clipped card starts, not where its
 * stretch began.
 */

/** What the predicates need: where the stretch really runs, and the window it is drawn in. */
export interface FadeFacts {
  /** the stretch's true start, in window coordinates — negative when it began before the window */
  trueFrom: number;
  /** the stretch's true end, in the same coordinates — past `days` when it runs beyond the window */
  trueTo: number;
  /** the window's length in days */
  days: number;
  /**
   * Where THIS PIECE is drawn, in the same coordinates.
   *
   * ⚠️ A RUN IS CUT INTO PIECES AND THEY ALL SHARE THE RUN'S TRUE BOUNDS, which is right — the
   * stretch began where it began, whichever piece you are looking at. But a fade is about a CUT,
   * and only the piece sitting ON the window's edge is cut by it. Without this, every piece of a
   * clipped run faded at its left edge, including one that starts at a break three weeks inside
   * the window: measured, `thin-q-chase` drawn from day 12.84 carrying a left fade because its RUN
   * had opened 47 days before the window.
   */
  from: number;
  to: number;
  /** this is the stretch that reaches today */
  live?: boolean;
}

export interface Fades { left: boolean; right: boolean }

/**
 * ⚠️ A TOLERANCE, BECAUSE THESE ARE FRACTIONAL DAYS. A stretch that opens exactly at the window's
 * edge has not begun before it, and floating point makes `-0.0000001` a real possibility from a
 * date subtraction. A tenth of a day is well below anything a reader could see and well above the
 * noise.
 */
const EPS = 0.1;

/**
 * THIS CARD's own true start and end — not its run's.
 *
 * ⚠️ THE DISTINCTION IS THE WHOLE OF PHASE 3. `trueFrom` is where the RUN opened, and every piece
 * of a run carries it, which is right for anything asking how long the stretch has gone on. A FADE
 * is about a cut, and an interior piece — one that begins at a nudge three weeks inside the window
 * — is not cut by the window at all. Measured: a piece drawn from day 12.84 fading at its left edge
 * because its run had opened 47 days before the board.
 *
 * A piece sitting on the window's edge is the run's first (or last) and inherits the run's bound;
 * any other piece begins and ends where it is drawn.
 */
export function cardBounds(f: { trueFrom: number; trueTo: number; from: number; to: number; days: number }) {
  return {
    start: f.from <= EPS ? f.trueFrom : f.from,
    end: f.to >= f.days - EPS ? f.trueTo : f.to,
  };
}

export function fadesFor(f: FadeFacts): Fades {
  return {
    /* this CARD's true start is earlier than the window's start */
    left: cardBounds(f).start < -EPS,
    /* still running at today, or ends past the window's right-hand edge. Nothing else earns one:
       a card that ends at a named future date INSIDE the window keeps both corners and both
       borders, because nothing about it is cut off. */
    /* ⚠️ A LIVE PIECE IS CUT AT TODAY, AND TODAY IS NOT THE WINDOW'S EDGE. The window is rolling
       and carries some past, so today sits inside it; a running stretch is the LAST piece of its
       run and stops there. So `live` earns the fade on its own — requiring it to reach the
       window's right edge as well took the fade off every running card on the board.
       The other half is different in kind and does need the edge: a stretch that runs past the
       window is only CUT on the piece that sits on that edge. */
    right: !!f.live || cardBounds(f).end > f.days + EPS,
  };
}
