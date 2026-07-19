/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Finishing-pack locks. P2 (undo everywhere): write-then-reverse — the compensator table has no
 * gaps, snooze undos fully restore (×n included, the un-bump primitive), toast grammar unified.
 * Pinned at the source layer per the repo's logic-only policy.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const here = dirname(fileURLToPath(import.meta.url));
const page = readFileSync(join(here, "ToDoPage.tsx"), "utf8");
const flow = readFileSync(join(here, "FocusFlow.tsx"), "utf8");
const db = readFileSync(join(here, "../../lib/db.tsx"), "utf8");

describe("P2 — undo everywhere (write-then-reverse)", () => {
  it("the un-bump primitive exists: a snooze undo restores the ×n count, floored at 0", () => {
    expect(db).toContain("unbumpSnooze?: boolean");
    expect(db).toContain("Math.max(0, (existing?.snoozeCount ?? 0) + (patch.bumpSnooze ? 1 : 0) - (patch.unbumpSnooze ? 1 : 0))");
  });

  it("every snooze undo un-bumps (board + sweep) — no reversal leaves ×n inflated", () => {
    const boardUnbumps = page.match(/snoozedUntil: null, unbumpSnooze: true/g) ?? [];
    const flowUnbumps = flow.match(/snoozedUntil: null, unbumpSnooze: true/g) ?? [];
    expect(boardUnbumps.length).toBeGreaterThanOrEqual(4); // quickPause ×2, forkNotNowGroup, forkStale
    expect(flowUnbumps.length).toBeGreaterThanOrEqual(3); // sweepSnooze's three branches
  });

  it("the compensator table has NO gaps: mute-item and mute-rule toasts carry Undo", () => {
    // the never: callbacks toast with an Undo that unsets the flag
    expect((page.match(/— dismissed`, \{ label: "Undo"/g) ?? []).length).toBeGreaterThanOrEqual(4);
    // rule-mute reverses via the profile filter-out (the same write unmuteRule performs)
    expect(page).toContain("mutedTaskRules: (currentUser?.mutedTaskRules ?? []).filter((r) => r !== g.rule)");
  });

  it("toast grammar unified: ✓ {title} — {verb}; the old ad-hoc TOAST copies are gone", () => {
    // scoped to the toast calls — receipt-overlay card copy legitimately keeps its own prose
    const toastCalls = [...(page.match(/flash\([^;]*\)/g) ?? []), ...(flow.match(/onToast\([^;]*\)/g) ?? [])].join("\n");
    for (const gone of ["logged with defaults", "Snoozed for 7 days", 'flash("Note done"', 'onToast("Note done"', '"Closed as no response"']) {
      expect(toastCalls).not.toContain(gone);
    }
    expect(page).toContain("— done`");
    expect(page).toContain("— snoozed`");
    expect(page).toContain("— dismissed`");
  });

  it("undo confirms with Restored; the toast is a status region on a ~5s action window", () => {
    expect((page.match(/flash\("Restored"\)/g) ?? []).length).toBeGreaterThanOrEqual(8);
    expect((flow.match(/onToast\("Restored"\)/g) ?? []).length).toBeGreaterThanOrEqual(7);
    expect(page).toContain('action ? 5000 : 2600');
    expect(page).toContain('className="tdb-toast" role="status"');
  });
});

describe("P3→III — the Sunday review's doorways (banner + bar; the card and scrap are retired)", () => {
  it("finishReview writes the completion SENTINEL against the week key (single-sourced)", () => {
    expect(flow).toContain("reviewCompletionSnooze(win)");
    expect(flow).toContain('flagKeyForTask("weekly_review", win.key)');
  });

  it("the review is NOT a task any more: no card renderer, no leak filters needed (by construction — locked in todoBoard.test)", () => {
    expect(page).not.toContain("renderReviewCard");
    expect(page).not.toContain('taskType !== "weekly_review"');
    expect(page).not.toContain("tdb-scrap");
  });

  it("BOTH doorways open the mode unchanged: the banner's Begin and the bar's OPEN call openSundayReview", () => {
    expect(page).toContain('className="tdb-rvgo2" onClick={openSundayReview}>Begin the review →');
    expect(page).toContain('className="tdb-rvbar" onClick={openSundayReview}');
    expect(page).toContain('mode: "weeklyReview"');
  });

  it("the banner's ✕ dismisses via the SAME weekly_review flag write (3-day snooze) with Undo; it gates the banner only", () => {
    const d = page.match(/function dismissReviewBanner[\s\S]*?\n  \}/)?.[0] ?? "";
    expect(d).toContain('flagKeyForTask("weekly_review", surface.weekKey)');
    expect(d).toContain("snoozedUntil: new Date(Date.now() + 3 * 86400000).toISOString()");
    expect(d).toContain('label: "Undo"');
  });

  it("the banner copy is the 5ways §1 verbatim (no stat preview); the bar is the refine thin bar", () => {
    expect(page).toContain("Last week’s progress report is ready");
    expect(page).toContain("Check it out — every box ticked here turns the dial in your favour.");
    expect(page).toContain("THE SUNDAY REVIEW · WEEK {surface.weekNumber}");
    expect(page).toContain("Last week in review — week {surface.weekNumber}");
    expect(page).toContain(">OPEN ▸</span>");
  });

  it("openSundayReview is a HOISTED function (the banner/bar JSX calls it from the return — the TDZ lesson)", () => {
    expect(page).toContain("function openSundayReview()");
    expect(page).not.toMatch(/const openSundayReview = /);
  });
});
