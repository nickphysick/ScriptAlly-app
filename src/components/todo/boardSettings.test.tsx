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
const panel = readFileSync(join(here, "SetAsidePanel.tsx"), "utf8");
const list = readFileSync(join(here, "TaskList.tsx"), "utf8");
/* the four preference fields live on /account/tasks now — the sheet that held them is retired */
const tasksPage = readFileSync(join(here, "..", "AccountSettings.tsx"), "utf8");
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

  /* ⚠️ THE MECHANISM MOVED, THE GUARANTEE DID NOT (§3). The scroll lock and the focus restore were
     inlined in every sheet that wanted them — the same twenty lines, copied. They live in
     `useOverlay` now, so a sheet DEMONSTRATES this by composing the primitive rather than by
     containing the lines, and the primitive itself is asserted once, below.
     ⚠️ TAGS STILL INLINES ITS OWN and has not been migrated: it was not one of the two copies §3
     extracted, and folding a third call site in unreviewed is how an extraction quietly changes
     behaviour. Stated rather than skipped, so the remaining copy is visible. */
  /* ⚠️ REPOINTED OFF THE RETIRED SHEET, AND THE LAW TIGHTENED WHILE IT MOVED. It used to require
     that each sheet either composed `useOverlay` OR inlined the lock itself; the tags surface is a
     PANE now, inside `AnchoredPanel`, so the honest claim is that exactly ONE thing owns the
     overlay duties for it. A pane keeping its own copy would be the second implementation the
     extraction exists to prevent, and its Escape would race the panel's. */
  it("the overlay duties are owned once, by the panel — never also by a pane inside it", () => {
    const overlay = readFileSync(new URL("../shell/useOverlay.ts", import.meta.url), "utf8");
    expect(overlay, "the primitive stopped locking the stage").toContain("lockStageScroll()");
    expect(overlay, "the primitive stopped returning focus to the invoker").toContain("invoker?.focus?.()");

    const anchored = readFileSync(join(here, "AnchoredPanel.tsx"), "utf8");
    expect(anchored, "the panel stopped closing on Escape").toContain("Escape");
    expect(anchored, "the panel stopped returning focus to its trigger").toContain("returnFocus");

    for (const [name, src] of [["tags pane", tagsSheet], ["set-aside panel", panel]] as const) {
      expect(src.includes("lockStageScroll()"), `${name} kept its own scroll lock`).toBe(false);
      expect(src.includes("useOverlay("), `${name} composes the primitive a second time`).toBe(false);
    }
  });

  /* ⚠️ THE DOOR MOVED TO THE BOARD, because its old one was retired and took tag management with
     it — unreachable on main and on dev until this pane restored it. */
  it("tag management is reachable from the board's own tool row", () => {
    expect(panel, "the panel does not render the tags pane").toContain("<TagsPane />");
    expect(list, "the list's tool row has no set-aside door").toContain("onAside(e.currentTarget)");
    expect(list).toContain('aria-label="Set aside and tags"');
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
      /* ⚠️ THE MAP GAINED THE PER-TYPE SWITCHES (frame2 Phase 5), and the reader is still TOTAL —
         which is the claim this case makes. A stored map that says nothing about types gets all
         five on, and `decide` is forced on whatever it says, because an offer is not something a
         setting may hide. */
      .toEqual({ staleMonths: 6, rollForward: false, weeklyBriefing: false,
                 types: { send: true, decide: true, chase: true, close: true, fix: true } });
    expect(STALE_MONTHS_CHOICES).toContain(6);
    expect(staleLabel(1)).toBe("1 month");
    expect(staleLabel(12)).toBe("12 months");
  });

  it("⚠️ THE DEFAULTS ARE THE BEHAVIOUR THE APP ALREADY HAD — a setting's arrival changes nothing", () => {
    expect(TODO_PREFS_DEFAULT.rollForward).toBe(true);   // both behaviours shipped ON
    expect(TODO_PREFS_DEFAULT.weeklyBriefing).toBe(true);
  });

  /* ⚠️ `TODO_PREF_ROWS` HAS NO READER AND THIS LOCK HAD BEEN ASSERTING AGAINST A DEAD COMPONENT
     SINCE 6de4856a. The rows moved to /account/tasks with copy written for that page, so the honest
     claim is not "the sheet renders these titles" but "the page owns all four fields". The data
     survives unread; it is listed in the report rather than deleted, because whether the page
     should read it is a copy decision rather than a cleanup. */
  it("all four behaviours have a home, and it is the settings page", () => {
    for (const key of ["rollForward", "weeklyBriefing", "staleMonths", "types"]) {
      expect(tasksPage, key).toContain(key);
    }
  });

  it("⚠️ ONE FIELD, ONE WRITE PATH — the map is merged, never four flat writes", () => {
    expect(tasksPage).toContain("updateUserProfile({ todoPrefs: { ...prefs, ...patch } })");
    expect(tasksPage).toContain("todoPrefs(currentUser.todoPrefs)");
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
    /* repointed off the retired sheet — the control's home is the settings page now */
    expect(code(tasksPage)).not.toContain("A good day is");
    expect(code(tasksPage)).not.toContain("goodDay");
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

/**
 * ⚠️ THE LEDGER MOVED TO THE BOARD, AND THESE ASSERTIONS MOVED WITH IT. They are the only record of
 * what the feature does, and it went unreachable for a fortnight because nobody had one to read.
 */
describe("⚠️ the set-aside ledger lives on the board, and states its own count", () => {
  it("the door is on the list's tool row and carries the figure", () => {
    expect(list).toContain('aria-label="Set aside and tags"');
    expect(list).toContain("asideCount");
  });

  it("the count is DERIVED from the same hiddenItems the list renders — never a second tally", () => {
    expect(listPage).toContain("hiddenItems(currentUser?.mutedTaskRules, taskFlags, agents, queries");
    expect(panel).toContain("hiddenItems(muted, taskFlags, agents, queries");
  });

  it("the restore path is unchanged — rule removal or flag unset, no novel write", () => {
    expect(panel).toContain("mutedTaskRules: (muted ?? []).filter((k) => k !== r.rule)");
    expect(panel).toContain("upsertTaskFlag(r.flag, { snoozedUntil: null })");
    expect(panel).toContain("Nothing here is deleted — only set aside.");
  });

  /* ⚠️ THE REVERSAL, RECORDED. The old rule was "an empty ledger offers no door to open" — the
     door hid at zero. It is inverted: a door that only appears once you have already set something
     aside is unfindable at the moment you need it, because the writer looking for it has just
     hidden something and does not yet know the surface exists. It is always reachable and says
     plainly when it holds nothing. */
  it("the door is ALWAYS reachable, and the empty state says what it means", () => {
    expect(panel).toContain("Nothing set aside. When you snooze or dismiss something");
    expect(list, "the door is rendered unconditionally").not.toContain("asideCount > 0 &&");
  });

  /* ⚠️ THE CLASS IS BUILT FROM THE DATA, so the literal `sap-row--rule` never appears in the
     component — asserting it against source is the concatenation trap. The claim is split: the
     panel derives the modifier from `h.kind`, and the stylesheet distinguishes all three. */
  it("all three kinds of hiding share one row grammar", () => {
    expect(panel, "the modifier is derived from the item's kind").toContain("sap-row sap-row--${h.kind}");
    expect(panel, "the meta line is the data's, not the component's").toContain("{h.meta}");
    const css = readFileSync(join(here, "setAside.css"), "utf8");
    for (const kind of ["rule", "dismissed", "snoozed"]) {
      expect(css, kind).toContain(`.sap-row--${kind}`);
    }
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
    for (const src of [panel, tagsSheet]) {
      for (const native of ["window.confirm", "window.alert", "window.prompt"]) {
        expect(src).not.toContain(native);
      }
    }
  });

  it("the panel keeps only the PANE — the CRUD is not duplicated into it", () => {
    expect(panel).not.toContain("recolourTag");
    expect(panel).not.toContain("const deleteTag");
    expect(panel).toContain("<TagsPane />");
  });
});
