/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * paneFill — the primary's fill, its count, and the moment it becomes ready.
 *
 * ⚠️ ONE SOURCE, FOUR EXPRESSIONS. The fill, the count beside the button, the steer square and the
 * missing-answers line are four statements about ONE set: the flow's required fields. The contract
 * says so in as many words — "it reads the same required-fields declaration as the count, the steer
 * square and the missing-answers line" — and this file is where that stops being an intention. The
 * pane already derives `missing` from `unansweredOf`; the fill takes the same two numbers rather
 * than counting anything itself.
 *
 * ⚠️ AND IT IS PURE BECAUSE THE ALTERNATIVE IS A PERCENTAGE COMPUTED IN JSX. A width written inline
 * cannot be asserted without rendering, and "does the bar match the count" is exactly the kind of
 * agreement this repo has watched drift — two derivations of one fact, disagreeing on the page
 * while each is individually correct.
 */

export interface PrimaryFill {
  /** 0…1, the proportion of required answers given — never outside that range */
  pct: number;
  /** the words beside the button, or `null` when there is nothing left to say */
  count: string | null;
  /** the one moment the button changes character: full fill, live label */
  ready: boolean;
}

export interface FillInput {
  /** how many answers this flow requires — `activeFlow.questions.length` */
  required: number;
  /** how many of them are still unanswered — `unansweredOf(...).length` */
  missing: number;
  /** the cohort's own numbers, where the card is one */
  bulk?: { count: number; touched: number };
}

/**
 * ⚠️ THE BULK EXCEPTION IS ABOUT WHAT IS BEING COUNTED, NOT ABOUT BEING SWITCHED OFF. Its primary
 * counts QUERIES ("Log 6 queries") where every other counts QUESTIONS, so its fill tracks touched
 * rows against the cohort. At zero it is faded with an empty fill and says so in words, because
 * "0 still to answer" is not what is wrong with an untouched table.
 *
 * ⚠️ AND IT IS READY AT ONE ROW, NOT AT ALL OF THEM. Filling six of thirty-two and logging those
 * six is a complete act; a button that stayed faded until the whole cohort was done would be
 * telling the writer their work was not yet worth recording. The FILL still tracks the whole
 * cohort, because that is an honest progress reading — the two answer different questions.
 */
export function primaryFill(a: FillInput): PrimaryFill {
  if (a.bulk) {
    const { count, touched } = a.bulk;
    return {
      pct: count > 0 ? clamp01(touched / count) : 0,
      count: touched === 0 ? "no queries filled in yet" : null,
      ready: touched > 0,
    };
  }
  /**
   * ⚠️ A FLOW THAT REQUIRES NOTHING IS COMPLETE, NOT EMPTY. The note's tick and the fill-in's
   * "I can't remember" both declare `questions: []`, and `0 / 0` is the shape that yields `NaN` —
   * a width of `NaNpx`, which CSS drops silently, leaving a permanently faded button on a journey
   * with nothing to answer.
   */
  if (a.required <= 0) return { pct: 1, count: null, ready: true };
  const missing = Math.max(0, Math.min(a.required, a.missing));
  return {
    pct: clamp01((a.required - missing) / a.required),
    /* ⚠️ ABSENT AT ZERO. A line reading "0 still to answer" is a label describing its own emptiness */
    count: missing > 0 ? `${missing} still to answer` : null,
    ready: missing === 0,
  };
}

const clamp01 = (n: number): number => (Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0);

/** the width the fill paints, as a CSS percentage string — one formatting, so two mounts agree */
export const fillWidth = (f: PrimaryFill): string => `${Math.round(f.pct * 1000) / 10}%`;
