/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * accountTasks — the non-choice, the unnameable rule, and the date that does not exist.
 */
import { describe, it, expect } from "vitest";
import { optionalTaskTypes, mutedRuleRows, unmute, ALWAYS_ON_LINE, staleOptionLabel } from "./accountTasks";
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

describe("mutedRuleRows", () => {
  it("names a known rule from the board's list", () => {
    expect(mutedRuleRows(["nudge_overdue"])).toEqual([{ key: "nudge_overdue", label: "Nudge reminders" }]);
  });

  /* ⚠️ AN UNRECOGNISED KEY IS STILL A MUTED REMINDER. Dropping it would leave something switched
     off with nowhere to switch it back on — the one outcome this section exists to prevent. */
  it("still lists a key it cannot name, rather than hiding it", () => {
    expect(mutedRuleRows(["from_a_later_build"])).toEqual([
      { key: "from_a_later_build", label: "from_a_later_build" },
    ]);
  });

  it("is empty for an absent or empty list", () => {
    expect(mutedRuleRows(undefined)).toEqual([]);
    expect(mutedRuleRows([])).toEqual([]);
  });

  it("unmute removes exactly one key and leaves the rest", () => {
    expect(unmute(["a", "b", "c"], "b")).toEqual(["a", "c"]);
    expect(unmute(["a"], "missing")).toEqual(["a"]);
    expect(unmute(undefined, "a")).toEqual([]);
  });
});

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
