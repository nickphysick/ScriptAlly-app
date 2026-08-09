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
  todoPrefs, TODO_PREFS_DEFAULT, TODO_PREF_ROWS, STALE_MONTHS_CHOICES, staleLabel,
} from "../../lib/todoPrefs";

const here = __dirname;
const settings = readFileSync(join(here, "TaskSettingsSheet.tsx"), "utf8");
const tagsSheet = readFileSync(join(here, "TagsSheet.tsx"), "utf8");
const board = readFileSync(join(here, "TodoBoard.tsx"), "utf8");
const listPage = readFileSync(join(here, "ToDoPage.tsx"), "utf8");
const rules = readFileSync(join(here, "..", "..", "..", "firestore.rules"), "utf8");
/** Source with its comments stripped — a retirement is explained by naming the thing it retired,
 *  so a negative asserted over raw file text fails on a correct file that documents itself. */
const code = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
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
    expect(todoPrefs({ rollForward: undefined }).rollForward).toBe(true);
    /* ⚠️ A RETIRED KEY IN STORED DATA IS IGNORED, NEVER CARRIED. Writers who set `goodDay` before
       9 Aug still have it on their user doc; the total reader simply does not read it, so no
       consumer can resurrect it by accident. */
    expect(todoPrefs({ goodDay: 3 } as Partial<typeof TODO_PREFS_DEFAULT>)).toEqual(TODO_PREFS_DEFAULT);
  });

  it("a stored value inside the bounds is honoured", () => {
    expect(todoPrefs({ staleMonths: 6, rollForward: false, weeklyBriefing: false }))
      .toEqual({ staleMonths: 6, rollForward: false, weeklyBriefing: false });
    expect(STALE_MONTHS_CHOICES).toContain(6);
    expect(staleLabel(1)).toBe("1 month");
    expect(staleLabel(12)).toBe("12 months");
  });

  it("⚠️ THE DEFAULTS ARE THE BEHAVIOUR THE APP ALREADY HAD — a setting's arrival changes nothing", () => {
    expect(TODO_PREFS_DEFAULT.rollForward).toBe(true);   // both behaviours shipped ON
    expect(TODO_PREFS_DEFAULT.weeklyBriefing).toBe(true);
  });

  it("every row renders, each with its plain-spoken subtitle", () => {
    /* ⚠️ THREE ROWS NOW — "A good day is" is retired (see the describe below). */
    expect(TODO_PREF_ROWS.map((r) => r.title)).toEqual([
      "Stale threshold", "Roll unfinished work forward", "Weekly review briefing",
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

/**
 * ⚠️ "A GOOD DAY IS {n}" IS RETIRED — CONTROL, READER AND STORED FIELD (tasks-consolidation P2
 * follow-up, 9 Aug; Nick's call on the P2 flag).
 *
 * It advised on the size of the day's COMMITMENT, and committing work to a day is exactly what
 * the consolidation removed: the ranked order of the one list is the plan, so there is no Today
 * column left to head. The copy law reaches the same answer independently — this app reports and
 * never appraises, and "THAT'S A FULL DAY" is an appraisal.
 *
 * ⚠️ IT WENT WHOLE, DELIBERATELY. board-optimise P5's own lesson was that a settings row over a
 * hardcoded number is a control over nothing; leaving the field with no reader would have been
 * the same fault with the halves swapped. So `wipLine`, the `goodDay` key, its bounds and the
 * sheet's control all go together, and nothing dormant is left for a later pass to rediscover.
 *
 * ⚠️ THE PROD RULES QUEUE DOES NOT SHORTEN, and this is the correction worth stating: the
 * allowlist entry is **`todoPrefs`**, the whole map — never `goodDay` — and three other settings
 * still write it. Retiring a key inside a map changes no rule.
 */
describe("⚠️ the good-day setting is RETIRED — control, reader and field", () => {
  it("the reader is gone from the lib, and the board no longer heads a column with it", () => {
    const cols = readFileSync(join(here, "..", "..", "lib", "todoColumns.ts"), "utf8");
    expect(cols).not.toContain("export function wipLine");
    expect(board).not.toContain("wipLine(");
    /* ⚠️ ON DECLARATIONS, NOT RAW TEXT — the house style explains a retirement by naming what it
       replaced, so the file legitimately says the word in a comment. */
    expect(code(board)).not.toContain("goodDay");
  });

  it("the control is gone from the sheet, and the field from the prefs model", () => {
    expect(code(settings)).not.toContain("A good day is");
    expect(code(settings)).not.toContain("goodDay");
    const prefs = readFileSync(join(here, "..", "..", "lib", "todoPrefs.ts"), "utf8");
    expect(code(prefs)).not.toContain("goodDay");
    expect(prefs).not.toContain("GOOD_DAY_MIN");
  });

  it("⚠️ THE RULES ENTRY IS `todoPrefs`, THE WHOLE MAP — so the prod queue is unchanged", () => {
    /* Stated as a lock because the instruction that produced this change asked for `goodDay` to
       leave the queue: there was never a `goodDay` entry to leave. The map is still written by
       three live settings, so it still has to be sequenced before any prod hosting deploy. */
    expect(rules).not.toContain("goodDay");
    const allow = rules.slice(rules.indexOf("affectedKeys().hasOnly(['name', 'plan'"));
    expect(allow.slice(0, allow.indexOf("])"))).toContain("'todoPrefs'");
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
