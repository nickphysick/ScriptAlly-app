/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Source-render locks for TaskSettingsSheet — the repo's logic-only test policy (no mounts), so the
 * sheet's structure/wiring is pinned at the source layer (the render-crash lesson: a render-time
 * bug is invisible to tsc + pure Vitest).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const sheet = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "TaskSettingsSheet.tsx"), "utf8");
const page = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "ToDoPage.tsx"), "utf8");

describe("TaskSettingsSheet — source locks", () => {
  /* ⚠️ "REUSES THE JOURNEY PRESENTATION" IS NOW LITERALLY TRUE (§3). It used to mean "contains the
     same twenty lines as FocusFlow"; the scroll lock, the focus capture and return, the Tab trap
     and the backdrop test are one primitive, and this sheet composes it. The obligations are
     asserted where they now live; what stays asserted HERE is what is this sheet's own — the
     surfaces, the exit, and the fact that a backdrop click CLOSES rather than nudging, because
     there is no staged model to lose. */
  it("reuses the journey presentation by composing the shared overlay primitive", () => {
    expect(sheet).toContain('className="tdb-ff"');
    expect(sheet).toContain('className="tdb-ffsheet tdb-tset"');
    expect(sheet, "the sheet stopped composing the primitive").toContain("useOverlay(rootRef");
    expect(sheet, "the trap is no longer wired to the root").toContain("onKeyDown={trapTab}");
    expect(sheet, "the backdrop test is no longer wired to the root").toContain("onClick={scrimClick}");
    expect(sheet, "Escape stopped routing to the close").toContain("onEscape: onClose");
    expect(sheet, "a backdrop click stopped closing — this sheet has nothing staged to lose")
      .toContain("onScrimClick: onClose");
    // C1 — the exit is the shared corner circle on the wrapper (the labelled pill is retired)
    expect(sheet).toContain('className="tdb-ffx" aria-label="Back to my desk" onClick={onClose}');
    /* and the obligations themselves, once, where they live */
    const overlay = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "shell", "useOverlay.ts"), "utf8");
    expect(overlay).toContain("lockStageScroll()");
    expect(overlay).toContain('e.key !== "Tab"');
  });
  it("switches apply immediately (no staged model): role=switch → updateUserProfile(setTypeMute)", () => {
    expect(sheet).toContain('role="switch"');
    expect(sheet).toContain("aria-checked={on}");
    expect(sheet).toContain("updateUserProfile({ mutedTaskRules: setTypeMute(");
    expect(sheet).not.toContain("Save"); // no save button
  });
  it("Phase 3 — the hidden list renders + restores via existing primitives only", () => {
    /* board-optimise P5: the section is "DISMISSED ITEMS" behind a counting DOOR now — the list
       still renders (beneath it) through the same derivation and the same restore primitives. */
    expect(sheet).toContain("DISMISSED ITEMS");
    expect(sheet).toContain("Nothing set aside");
    expect(sheet).toContain("in the ledger — restorable");
    expect(sheet).toContain("Nothing here is deleted — only set aside.");
    expect(sheet).toContain("hiddenItems(muted, taskFlags, agents, queries");
    // restore = rule removal OR flag unset — no novel write
    expect(sheet).toContain("mutedTaskRules: (muted ?? []).filter((k) => k !== r.rule)");
    expect(sheet).toContain("upsertTaskFlag(r.flag, { snoozedUntil: null })");
  });
  it("the entry + the fork doorway both open the sheet (follow-up P3: the entry is the v2 sidebar's event)", () => {
    /* ⚠️ THE LITERAL BECAME A CONSTANT (To-do workspace pack, Phase 1) — TODO_OPEN_TASK_SETTINGS
       in lib/todoRoutes, because the name was typed in two files and a re-typed event name is a
       listener that silently never fires. The contract is unchanged; the assertion follows it. */
    /* ⚠️ THE SHEET IS RETIRED — `/account/tasks` is the one form for these fields. Inverted rather
       than deleted, so the page cannot grow a second sheet host back. */
    expect(page).not.toContain("TODO_OPEN_TASK_SETTINGS");
    expect(page).not.toContain("setSettingsOpen");
    expect(page).not.toContain("<TaskSettingsSheet");
  });
});
