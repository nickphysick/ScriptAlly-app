/**
 * Which form of a bar's label fits — the decision alone, with no DOM in it.
 *
 * ⚠️ THE MEASUREMENT STAYS IN THE BROWSER AND THE DECISION COMES OUT. A character-count estimate
 * would be wrong the moment a font loads differently or a date is two digits instead of one, so
 * the widths must be measured; but a decision buried in a layout effect can only be proved by
 * finding a bar of the right width on a real account, and this one has none — its bars are either
 * six hundred pixels wide or exactly twenty-eight, with nothing in between. Splitting the two
 * makes the fallback provable without inventing a fixture to prove it with.
 */
export type LabelFit = "long" | "short" | "bare";

/**
 * ⚠️ THE TWO PADS ARE THE REF'S AND THEY DIFFER ON PURPOSE. A label that exactly fills its bar is
 * touching both ends, which reads as broken rather than as tight — so each form must clear the box
 * by a margin. The long form is asked for more room than the short one, because a bar that only
 * just holds its long form is worse than one that comfortably holds its short.
 */
export const FIT_PAD_LONG = 26;
export const FIT_PAD_SHORT = 22;

export function fitLabel(
  barWidth: number,
  longWidth: number,
  shortWidth: number | null,
): LabelFit {
  if (barWidth >= longWidth + FIT_PAD_LONG) return "long";
  /* ⚠️ NO SHORT FORM IS NOT A REASON TO TRUNCATE. An ellipsis is a promise that the rest is
     somewhere, and on a bar it is not — the row head's sentence is where a reader finds out. */
  if (shortWidth != null && barWidth >= shortWidth + FIT_PAD_SHORT) return "short";
  return "bare";
}
