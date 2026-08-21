/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * accountTasks — the non-choice, the unnameable rule, and the date that does not exist.
 */
import { describe, it, expect } from "vitest";
import { optionalTaskTypes, ALWAYS_ON_LINE, staleOptionLabel } from "./accountTasks";
import { TASK_TYPE_KEYS, TASK_TYPE_LABEL, STALE_MONTHS_CHOICES, todoPrefs } from "./todoPrefs";

describe("optionalTaskTypes — a control that cannot act does not ship", () => {
  /* ⚠️ ASSERTED AGAINST `todoPrefs` ITSELF, not against a literal. `decide` is excluded because
     the resolver FORCES it true; if that ever stops being so, this fails and the toggle should
     appear. Two derivations against each other, never a hand-written list on both sides. */
  it("omits exactly the type the prefs resolver refuses to take an instruction on", () => {
    const forcedOff = todoPrefs({ types: { send: false, decide: false, chase: false, close: false, fix: false } });
    const forced = TASK_TYPE_KEYS.filter((k) => forcedOff.types[k] === true);
    expect(forced, "one forced type, and it is decide").toEqual(["decide"]);
    expect(optionalTaskTypes().map((r) => r.key)).toEqual(TASK_TYPE_KEYS.filter((k) => k !== "decide"));
  });

  it("says so in a line rather than leaving the reader to notice", () => {
    expect(ALWAYS_ON_LINE).toContain("always appear");
  });

  /* ⚠️ THE BOARD'S OWN WORDS. "Nudge not Chase, Fill in not Fix" is the reviewed language the
     filter menu uses; a second vocabulary here would meet the writer as a contradiction. */
  it("labels come from the board's list, never re-written here", () => {
    for (const row of optionalTaskTypes()) {
      expect(row.label, row.key).toBe(TASK_TYPE_LABEL[row.key]);
    }
    expect(optionalTaskTypes().map((r) => r.label)).toContain("Nudge");
    expect(optionalTaskTypes().map((r) => r.label)).toContain("Fill in");
  });
});

/* ⚠️ THE MUTED-RULE TESTS MOVED WITH THE FEATURE. They asserted that a known rule was named, that
   an unrecognised key was still listed rather than dropped, and that `unmute` removed exactly one —
   claims about a list that now lives on the board, derived from `hiddenItems()` alongside the other
   two kinds of hiding. `boardSettings.test.tsx` carries the ledger's locks; nothing was dropped,
   the subject moved. */

/* ⚠️ THE OPTIONS ARE THE FIELD'S REAL VALUES. The ref invented its own list before recon; the
   resolver only accepts these five, and there is no "Never" because the field cannot hold one. */
describe("the stale dropdown offers what the field accepts", () => {
  it("labels every real choice and nothing else", () => {
    expect([...STALE_MONTHS_CHOICES]).toEqual([3, 6, 12, 18, 24]);
    expect(staleOptionLabel(3)).toBe("3 months of waiting");
    expect(staleOptionLabel(24)).toBe("24 months of waiting");
  });

  it("a value outside the list is refused by the resolver, so it is not offered", () => {
    expect(todoPrefs({ staleMonths: 9 }).staleMonths).toBe(12);
    expect((STALE_MONTHS_CHOICES as readonly number[])).not.toContain(9);
  });
});
