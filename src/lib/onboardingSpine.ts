/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The onboarding spine — which steps a writer is walking, and where they are in them.
 *
 * Pure: no React, no storage. The chrome renders whatever this returns, and the branch-honesty
 * rules below are properties of the data rather than promises made in a component.
 *
 * ⚠️ THE SPINE MAY SHORTEN. IT MAY NEVER LENGTHEN. A progress indicator that grows because of a
 * choice the writer just made turns their own decision into a punishment — pick Smart Import and
 * watch the finish line move away. Before a branch is committed the spine therefore shows the
 * LONGEST path, so every subsequent resolution can only take steps away.
 *
 * ⚠️ AND THE CAPTURE CHOICE IS NOT AN INPUT HERE — that is the guarantee, not an omission. Smart
 * Import, the template and by-hand all live INSIDE "Your list", so there is no argument this
 * function could take that would make branch B longer or shorter. The sub-position they produce is
 * carried by the card band's own meta line (`OnboardingCard`'s `step` prop), never by a dot.
 */

/** The three positions the flow can occupy. Ids, not indices — an index is not a place. */
export type SpineId = "you" | "book" | "list";

export interface SpineStep {
  id: SpineId;
  /** Verbatim from design-refs/scriptally-onboarding-chrome-options.html, option B. */
  label: string;
}

export const SPINE_LABELS: Record<SpineId, string> = {
  you: "You",
  book: "Your book",
  list: "Your list",
};

/**
 * The branch as the container knows it: "A" manuscript-led, "B" capture-and-import, `null` while
 * the writer is still on the opening question.
 *
 * ⚠️ IT IS THE COMMITTED BRANCH, NOT THE PENDING SELECTION. Reading the radio the writer is
 * hovering over would make the spine flicker between two and three dots as they compared options,
 * which is the lengthening fault wearing a different coat.
 */
export type OnboardingBranch = "A" | "B" | null;

const step = (id: SpineId): SpineStep => ({ id, label: SPINE_LABELS[id] });

/**
 * The path for a branch.
 *
 * Branch A is manuscript-led and ends there — it has no list step, so its spine is genuinely two
 * dots rather than three with one greyed out. A step nobody will walk is not a step.
 */
export function spineFor(branch: OnboardingBranch): SpineStep[] {
  if (branch === "A") return [step("you"), step("book")];
  // "B" and the undecided opening question both show the full path — see the lengthening note.
  return [step("you"), step("book"), step("list")];
}

/** Where `current` sits in `steps`; -1 when the step is not on this branch's path. */
export function spineIndex(steps: SpineStep[], current: SpineId): number {
  return steps.findIndex((s) => s.id === current);
}

/**
 * The mono string the header falls back to below 760px and the card band states in its meta slot.
 *
 * ⚠️ ONE-BASED, BECAUSE IT IS READ BY A PERSON. "Step 0 of 3" is a developer's off-by-one leaking
 * onto a writer's screen.
 */
export function stepOfLabel(index: number, total: number): string {
  return `Step ${index + 1} of ${total}`;
}

/**
 * The band's meta when a step has sub-positions of its own — `Step 3 · Reviewing 2 of 3`.
 *
 * ⚠️ SUB-POSITION BELONGS HERE AND NOT IN THE SPINE. Expanding a dot into three would make the
 * import branch look longer than the template branch, which is the same lie by another route.
 */
export function subStepLabel(index: number, sub: string): string {
  return `Step ${index + 1} · ${sub}`;
}

/**
 * The import sub-flow's position within "Your list", for the card band's meta.
 *
 * ⚠️ IT NAMES A PLACE, IT DOES NOT COUNT ONE. "Reviewing 2 of 3" needs a total, and the screens
 * that have one — the review's agents/duplicates/queries walk — render their own full-screen shells
 * rather than an `OnboardingCard`, so they have no band to state it in. Rather than invent a band
 * for them (no ref draws one) or a number for the screens that do have a band (there is nothing to
 * count), each card-based sub-screen states what it is doing and the rest state the step alone.
 *
 * ⚠️ `null` MEANS "THE STEP ITSELF", NOT "UNKNOWN". The capture fork IS "Your list"; giving it a
 * sub-name would imply a position inside a screen that has none.
 */
export function subStepFor(screen: string): string | null {
  switch (screen) {
    case "confirm": return "Confirming your file";
    case "reading": return "Reading your sheet";
    case "importing": return "Bringing it in";
    default: return null;
  }
}
