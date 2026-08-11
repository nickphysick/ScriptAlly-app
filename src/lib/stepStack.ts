/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE STEP STACK'S STATE — the rhythm, with no opinion about what the steps are.
 *
 * Extracted from `createSteps.ts` so a second journey (recording a response) can wear the same
 * grammar without copying it. Everything here is parameterised by an ORDER; nothing knows about
 * agents, drafts, or what any particular step asks.
 *
 * ⚠️ `createSteps` KEEPS ITS OWN SIGNATURES AND DELEGATES HERE. It is create mode's vocabulary —
 * three named steps and their copy — and its callers and tests are written against that. Widening
 * those functions in place would have rewritten every call site to pass an order they already
 * imply, for no gain: the create stack has exactly one order.
 *
 * ══ ⚠️ THE GOVERNING RULE TRAVELS WITH THE MACHINERY: REQUIRED ≠ SEQUENTIAL ═════════════════
 *
 * NOTHING HERE GATES SAVING, and nothing added to it ever should. The steps GUIDE ATTENTION; they
 * do not collect permission. The failure mode is wizard-creep — someone wires `canSave` to "all
 * steps done", and a writer who only wanted to record one fact is made to walk three panels to say
 * it. Any journey mounting this stack inherits that rule, and each has a test asserting Save is
 * enabled while later steps are unvisited.
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 */

/** Presentation only — which of the three treatments a section wears. */
export type StepState = "active" | "done" | "upcoming";

export const indexIn = <T extends string>(order: readonly T[], id: T): number => order.indexOf(id);

/**
 * The state of every section, given which one is open and how far the writer has got.
 *
 * ⚠️ `reached` IS WHY THIS IS NOT JUST `index < active`. A positional model — stepping back to 1
 * puts 2 and 3 back to "upcoming" — is fine for a click-through mockup and wrong in the app: going
 * back to change the date must not un-complete the materials you already confirmed. A section you
 * have passed keeps its tick and its summary wherever you stand now, so `reached` only ever moves
 * forward.
 */
export function statesIn<T extends string>(order: readonly T[], active: T, reached: T): Record<T, StepState> {
  const a = indexIn(order, active);
  const r = Math.max(indexIn(order, reached), a); // a step you stand in has necessarily been reached
  return order.reduce((acc, id, i) => {
    acc[id] = i === a ? "active" : i <= r ? "done" : "upcoming";
    return acc;
  }, {} as Record<T, StepState>);
}

/** Enter's target: the next section, or null at the end (where Enter saves instead of advancing). */
export function nextIn<T extends string>(order: readonly T[], active: T): T | null {
  const i = indexIn(order, active);
  return i < 0 || i >= order.length - 1 ? null : order[i + 1];
}

/** Advancing carries `reached` forward with it; jumping BACK leaves it where it was. */
export function advanceIn<T extends string>(order: readonly T[], active: T, reached: T): { active: T; reached: T } {
  const next = nextIn(order, active);
  if (!next) return { active, reached };
  return { active: next, reached: indexIn(order, next) > indexIn(order, reached) ? next : reached };
}

/** Clicking a summary — any section is reachable, forwards or back. `reached` never retreats. */
export function jumpIn<T extends string>(order: readonly T[], target: T, reached: T): { active: T; reached: T } {
  return { active: target, reached: indexIn(order, target) > indexIn(order, reached) ? target : reached };
}

/**
 * Which steps survive a change of journey, and which are discarded.
 *
 * ⚠️ CHANGING THE OUTCOME AFTER LATER STEPS ARE FILLED MUST NOT SILENTLY KEEP THEM. A step that
 * exists in both orders keeps its place; one that does not is gone, and the caller is expected to
 * SAY SO rather than let an answer to a question nobody is asking any more ride along into the
 * record.
 *
 * Returns the surviving `active`/`reached` clamped into the new order, plus the ids that were
 * dropped — so the caller can both re-seat the stack and report the loss.
 */
export function reseatInto<T extends string>(
  next: readonly T[],
  prev: readonly T[],
  active: T,
  reached: T,
): { active: T; reached: T; dropped: T[] } {
  const dropped = prev.filter((id) => !next.includes(id));
  const keep = (id: T, fallback: T): T => (next.includes(id) ? id : fallback);
  /* Falling back to the FIRST step rather than the nearest survivor: a stack whose shape has just
     changed is one the writer has to look at again, and dropping them mid-way through a set of
     questions they have not seen is worse than starting it. */
  const first = next[0];
  const a = keep(active, first);
  const r = keep(reached, a);
  /* `reached` can never sit behind `active` — see statesIn. */
  return { active: a, reached: indexIn(next, r) < indexIn(next, a) ? a : r, dropped };
}
