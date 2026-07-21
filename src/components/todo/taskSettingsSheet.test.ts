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
  it("reuses the journey presentation: scrim + sheet + lockStageScroll + Tab trap + exit + Esc", () => {
    expect(sheet).toContain('className="tdb-ff"');
    expect(sheet).toContain('className="tdb-ffsheet tdb-tset"');
    expect(sheet).toContain("lockStageScroll()");
    expect(sheet).toContain('e.key !== "Tab"');
    // C1 — the exit is the shared corner circle on the wrapper (the labelled pill is retired)
    expect(sheet).toContain('className="tdb-ffx" aria-label="Back to my desk" onClick={onClose}');
    expect(sheet).toContain('e.key === "Escape"');
  });
  it("switches apply immediately (no staged model): role=switch → updateUserProfile(setTypeMute)", () => {
    expect(sheet).toContain('role="switch"');
    expect(sheet).toContain("aria-checked={on}");
    expect(sheet).toContain("updateUserProfile({ mutedTaskRules: setTypeMute(");
    expect(sheet).not.toContain("Save"); // no save button
  });
  it("Phase 3 — the hidden list renders + restores via existing primitives only", () => {
    expect(sheet).toContain("HIDDEN RIGHT NOW");
    expect(sheet).toContain("Nothing set aside.");
    expect(sheet).toContain("Nothing here is deleted — only set aside.");
    expect(sheet).toContain("hiddenItems(muted, taskFlags, agents, queries");
    // restore = rule removal OR flag unset — no novel write
    expect(sheet).toContain("mutedTaskRules: (muted ?? []).filter((k) => k !== r.rule)");
    expect(sheet).toContain("upsertTaskFlag(r.flag, { snoozedUntil: null })");
  });
  it("the entry button + the fork doorway both open the sheet", () => {
    expect(page).toContain('className="tdb-setrow" onClick={() => setSettingsOpen(true)}'); // Final Shape: the rail-foot row
    expect(page).toContain("{settingsOpen && <TaskSettingsSheet onClose={() => setSettingsOpen(false)} />}");
  });
});
