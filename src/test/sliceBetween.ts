/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ A BOUNDED-SLICE LOCK ASSERTS THAT BOTH ANCHORS EXIST BEFORE SLICING.
 *
 * `String.prototype.indexOf` returns `-1` for a marker that is not there, and `slice(-1)` is read as
 * "one character from the end" — so a lock written as
 *
 *     src.slice(src.indexOf("function a"), src.indexOf("function b"))
 *
 * silently widens to THE WHOLE REST OF THE FILE the day `function b` is renamed. Every assertion
 * over it then covers code it was never meant to see, and it keeps passing until something
 * downstream happens to contain the forbidden string. That is exactly how the board's completion
 * lock came to cover every function below `performBoardPlan`.
 *
 * The failure is invisible in the direction that matters: the lock does not go red, it goes vague.
 *
 * This is the one correct way to take a bounded slice in a test. It fails loudly, naming the anchor
 * that is missing, before any assertion runs against the wrong text.
 */
import { expect } from "vitest";

export function sliceBetween(src: string, from: string, to: string, what = "slice"): string {
  const a = src.indexOf(from);
  expect(a, `${what}: the START anchor is gone — ${JSON.stringify(from)}`).toBeGreaterThan(-1);
  const b = src.indexOf(to, a + from.length);
  expect(b, `${what}: the END anchor is gone — ${JSON.stringify(to)} (the slice would run to the end of the file)`).toBeGreaterThan(-1);
  return src.slice(a, b);
}

/**
 * The same guarantee where the end is an OFFSET rather than a marker. The start can still be `-1`,
 * which slices from the end of the file backwards — a different wrong answer, equally silent.
 */
export function sliceFrom(src: string, from: string, len: number, what = "slice"): string {
  const a = src.indexOf(from);
  expect(a, `${what}: the START anchor is gone — ${JSON.stringify(from)}`).toBeGreaterThan(-1);
  return src.slice(a, a + len);
}
