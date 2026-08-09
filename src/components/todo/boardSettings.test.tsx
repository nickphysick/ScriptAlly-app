/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Task settings + tag management as SHEETS (board-optimise pack, Phase 5; ref
 * design-refs/board-optimised.html §3).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  todoPrefs, TODO_PREFS_DEFAULT, TODO_PREF_ROWS, STALE_MONTHS_CHOICES,
  GOOD_DAY_MIN, GOOD_DAY_MAX, staleLabel,
} from "../../lib/todoPrefs";
import { wipLine } from "../../lib/todoColumns";

const here = __dirname;
const settings = readFileSync(join(here, "TaskSettingsSheet.tsx"), "utf8");
const tagsSheet = readFileSync(join(here, "TagsSheet.tsx"), "utf8");
const board = readFileSync(join(here, "TodoBoard.tsx"), "utf8");
const listPage = readFileSync(join(here, "ToDoPage.tsx"), "utf8");
const rules = readFileSync(join(here, "..", "..", "..", "firestore.rules"), "utf8");
const app = readFileSync(join(here, "..", "..", "App.tsx"), "utf8");

describe("⚠️ BOTH ARE SHEETS OVER THE PAGE, NEVER ROUTES", () => {
  it("neither has a route — managing settings is a detour from the work, not a destination", () => {
    for (const name of ["TaskSettingsSheet", "TagsSheet"]) {
      expect(app, name).not.toContain(name);
    }
  });

  it("both are modal dialogs that lock the stage's scroll and return focus on close", () => {
    for (const [name, src] of [["settings", settings], ["tags", tagsSheet]] as const) {
      expect(src, name).toContain('role="dialog"');
      expect(src, name).toContain('aria-modal="true"');
      expect(src, name).toContain("lockStageScroll()");
      expect(src, name).toContain("invoker?.focus?.()");
    }
  });

  it("the tags sheet opens OVER task settings, from its door", () => {
    expect(settings).toContain("{tagsOpen && <TagsSheet");
    expect(settings).toContain("setTagsOpen(true)");
  });
});

describe("⚠️ the four behaviours — one stored map, a TOTAL reader, real defaults", () => {
  it("the reader is total: absent, partial and nonsense all resolve to the stated default", () => {
    expect(todoPrefs(undefined)).toEqual(TODO_PREFS_DEFAULT);
    expect(todoPrefs(null)).toEqual(TODO_PREFS_DEFAULT);
    expect(todoPrefs({})).toEqual(TODO_PREFS_DEFAULT);
    expect(todoPrefs({ staleMonths: 999 }).staleMonths).toBe(TODO_PREFS_DEFAULT.staleMonths);
    expect(todoPrefs({ goodDay: 0 }).goodDay).toBe(TODO_PREFS_DEFAULT.goodDay);
    expect(todoPrefs({ goodDay: 99 }).goodDay).toBe(TODO_PREFS_DEFAULT.goodDay);
    expect(todoPrefs({ rollForward: undefined }).rollForward).toBe(true);
  });

  it("a stored value inside the bounds is honoured", () => {
    expect(todoPrefs({ staleMonths: 6, goodDay: 3, rollForward: false, weeklyBriefing: false }))
      .toEqual({ staleMonths: 6, goodDay: 3, rollForward: false, weeklyBriefing: false });
    expect(STALE_MONTHS_CHOICES).toContain(6);
    expect(GOOD_DAY_MIN).toBe(1);
    expect(GOOD_DAY_MAX).toBe(12);
    expect(staleLabel(1)).toBe("1 month");
    expect(staleLabel(12)).toBe("12 months");
  });

  it("⚠️ THE DEFAULTS ARE THE BEHAVIOUR THE APP ALREADY HAD — a setting's arrival changes nothing", () => {
    expect(TODO_PREFS_DEFAULT.goodDay).toBe(5);          // the WIP line's own former bound
    expect(TODO_PREFS_DEFAULT.rollForward).toBe(true);   // both behaviours shipped ON
    expect(TODO_PREFS_DEFAULT.weeklyBriefing).toBe(true);
  });

  it("all four rows render, each with its plain-spoken subtitle", () => {
    expect(TODO_PREF_ROWS.map((r) => r.title)).toEqual([
      "Stale threshold", "A good day is", "Roll unfinished work forward", "Weekly review briefing",
    ]);
    for (const r of TODO_PREF_ROWS) {
      expect(settings, r.title).toContain(r.title);
      expect(settings, r.sub).toContain(r.sub);
      expect(r.sub.length, r.title).toBeGreaterThan(10); // a subtitle that explains, not a label twice
    }
  });

  it("⚠️ ONE FIELD, ONE WRITE PATH — the map is merged, never four flat writes", () => {
    expect(settings).toContain("updateUserProfile({ todoPrefs: { ...prefs, ...patch } })");
    expect(settings).toContain("todoPrefs(currentUser?.todoPrefs)");
  });

  it("…and the rules allow it, in the validator AND the update allowlist", () => {
    expect(rules).toContain("(!data.keys().hasAny(['todoPrefs']) || data.todoPrefs is map)");
    /* the affectedKeys list — asserted by MEMBERSHIP, not by its neighbours: this list grows
       from several streams, and pinning the entry beside it makes a foreign addition our red. */
    const allow = rules.slice(rules.indexOf("affectedKeys().hasOnly(['name', 'plan'"));
    expect(allow.slice(0, allow.indexOf("])"))).toContain("'todoPrefs'");
  });
});

describe("⚠️ the good-day setting TAKES EFFECT — the Today line reads it", () => {
  it("wipLine follows the number, and defaults to the 5 it always used", () => {
    expect(wipLine(1)).toBe("A GOOD DAY IS 5");
    expect(wipLine(6)).toBe("THAT'S A FULL DAY");
    expect(wipLine(2, 2)).toBe("A GOOD DAY IS 2");
    expect(wipLine(3, 2)).toBe("THAT'S A FULL DAY");
  });

  /**
   * ⚠️ THE WIP LINE HAS LOST ITS SUBJECT (tasks-consolidation P2, 9 Aug) — FLAGGED, NOT PATCHED.
   *
   * "A GOOD DAY IS 3–5" advised on the size of the day's COMMITMENT, and committing work to a day
   * is precisely what the consolidation removed: the ranked order of the one list is the plan, so
   * there is no Today column to head. The ref draws no such line either, and the copy law is the
   * reason ("the app reports and never appraises" — "THAT'S A FULL DAY" is an appraisal).
   *
   * SO `goodDay` NOW HAS NO LIVE READER, and a stored setting over nothing is the exact fault
   * board-optimise P5 fixed when it gave `wipLine` the writer's number. The pure function and the
   * settings control are both left standing — deleting a user's stored preference is not a
   * rendering decision — and the choice (retire the control, or give the advice a new home) is
   * carried in reports/STATE.md for Nick. This spec states the position so it cannot be lost.
   */
  it("⚠️ the good-day pref is STORED and READ, and has no surface until that call is made", () => {
    expect(board).toContain("wipLine(cards.length, goodDay)");     // the retired board still holds it
    expect(listPage).not.toContain("goodDay={todoPrefs(currentUser?.todoPrefs).goodDay}");
    expect(settings).toContain("goodDay");                          // the control that writes it stands
  });

  it("it stays ADVICE — the line changes tone past the number, and blocks nothing", () => {
    // no disabled, no guard, no early return anywhere near the WIP line
    const i = board.indexOf("const wip =");
    const around = board.slice(i - 200, i + 300);
    expect(around).not.toContain("disabled");
  });
});

describe("⚠️ the dismissed-items ledger is a DOOR that states its count", () => {
  it("the door names the section and carries the figure", () => {
    expect(settings).toContain("Dismissed items");
    expect(settings).toContain("in the ledger — restorable");
    expect(settings).toContain("Review →");
  });

  it("the count is DERIVED from the same hiddenItems the list renders — never a second tally", () => {
    expect(settings).toContain("hiddenItems(muted, taskFlags, agents, queries");
    expect(settings).toContain("{hidden.length} in the ledger");
  });

  it("the restore path is unchanged — rule removal or flag unset, no novel write", () => {
    expect(settings).toContain("mutedTaskRules: (muted ?? []).filter((k) => k !== r.rule)");
    expect(settings).toContain("upsertTaskFlag(r.flag, { snoozedUntil: null })");
    expect(settings).toContain("Nothing here is deleted — only set aside.");
  });

  it("an empty ledger offers no door to open", () => {
    expect(settings).toContain('hidden.length === 0 ? "Nothing set aside"');
    expect(settings).toContain("{hidden.length > 0 && <span className=\"tdb-tsetgo\">");
  });
});

describe("⚠️ tag CRUD lives in the tags sheet — and DELETE DETACHES", () => {
  it("rename normalises and holds uniqueness; recolour stays inside the family palette", () => {
    expect(tagsSheet).toContain("normaliseTagLabel(renameDraft)");
    expect(tagsSheet).toContain("tags.some((t) => t.id !== id && t.label === label)");
    expect(tagsSheet).toContain("TAG_COLOURS.map((c) =>");
    expect(tagsSheet).toContain("TAG_PALETTE[c]");
  });

  it("usage counts are derived live, and read as items", () => {
    expect(tagsSheet).toContain("tagUsageCounts(userTasks)");
    expect(tagsSheet).toContain('"item" : "items"');
  });

  it("⚠️ DELETE DETACHES AND NEVER DELETES ITEMS — the ids leave first, then the definition", () => {
    const del = tagsSheet.slice(tagsSheet.indexOf("const deleteTag"), tagsSheet.indexOf("const deleteTag") + 800);
    expect(del).toContain("updateUserTask(t.id, { tags: rest.length ? rest : null })");
    expect(del).toContain("tags.filter((t) => t.id !== id)");
    expect(del).not.toContain("deleteUserTask");
    // the order matters: detach, THEN drop the def
    expect(del.indexOf("updateUserTask")).toBeLessThan(del.indexOf("tags.filter((t) => t.id !== id)"));
    expect(tagsSheet).toContain("it never deletes them");
  });

  it("delete is arm-then-confirm inline — no native dialogs anywhere in either sheet", () => {
    expect(tagsSheet).toContain("armedDelete === t.id ?");
    expect(tagsSheet).toContain("Sure?");
    for (const src of [settings, tagsSheet]) {
      for (const native of ["window.confirm", "window.alert", "window.prompt"]) {
        expect(src).not.toContain(native);
      }
    }
  });

  it("the settings sheet keeps only the DOOR — the CRUD is not duplicated", () => {
    expect(settings).not.toContain("recolourTag");
    expect(settings).not.toContain("const deleteTag");
    expect(settings).toContain("Manage →");
  });
});
