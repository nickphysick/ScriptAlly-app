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

  it("BOTH doorways open the mode unchanged: the banner's Begin and the afterlife card call openSundayReview", () => {
    expect(page).toContain('className="tdb-rvgo2" onClick={openSundayReview}>Begin the review →');
    expect(page).toContain('className="tdb-rvcard" onClick={openSundayReview}'); // VI P2: the right-column card
    expect(page).toContain('mode: "weeklyReview"');
  });

  it("the banner's ✕ dismisses via the SAME weekly_review flag write (3-day snooze) with Undo; it gates the banner only", () => {
    const d = page.match(/function dismissReviewBanner[\s\S]*?\n  \}/)?.[0] ?? "";
    expect(d).toContain('flagKeyForTask("weekly_review", surface.weekKey)');
    expect(d).toContain("snoozedUntil: new Date(Date.now() + 3 * 86400000).toISOString()");
    expect(d).toContain('label: "Undo"');
  });

  it("the banner copy is the 5ways §1 verbatim (no stat preview); the afterlife is the VI cup card", () => {
    expect(page).toContain("Last week’s progress report is ready");
    expect(page).toContain("Check it out — every box ticked here turns the dial in your favour.");
    expect(page).toContain("THE SUNDAY REVIEW · WEEK {surface.weekNumber}");
    expect(page).toContain("<b>Last week in review</b>");
    expect(page).toContain("WEEK {surface.weekNumber} · NOT YET OPENED");
    expect(page).not.toContain("tdb-rvbar"); // the thin bar leaves no markup behind
  });

  it("openSundayReview is a HOISTED function (the banner/bar JSX calls it from the return — the TDZ lesson)", () => {
    expect(page).toContain("function openSundayReview()");
    expect(page).not.toMatch(/const openSundayReview = /);
  });
});

describe("VI P2 — the review's afterlife is the right-column cup card (todo-right-column-v1.html)", () => {
  const page = readFileSync(join(here, "ToDoPage.tsx"), "utf8");
  const css = readFileSync(join(here, "todo.css"), "utf8");
  const cup = readFileSync(join(here, "..", "..", "assets", "todo", "review-cup.svg"), "utf8");
  it("the cup is original artwork on currentColor, inlined (?raw) so it inherits the roundel's ink", () => {
    expect(cup).toContain('stroke="currentColor"');
    expect(cup).not.toMatch(/#3a1c14/i); // no hardcoded ink — the CSS colour rules
    expect(page).toContain('import reviewCupRaw from "../../assets/todo/review-cup.svg?raw";');
    expect(page).toContain('dangerouslySetInnerHTML={{ __html: reviewCupRaw }}');
    const cupRule = css.match(/\.tdb-rvcup2 \{([^}]*)\}/)?.[1] ?? "";
    expect(cupRule).toContain("width: 38px; height: 38px; border-radius: 50%");
    expect(cupRule).toContain("color: var(--ink)");
    expect(css).toContain(".tdb-rvcup2 svg { width: 30px;");
  });
  it("one helper, two mounts — the card rides ABOVE the Today panel in the column and the narrow popover alike", () => {
    expect(page).toContain('if (surface?.kind !== "card") return null;'); // absent → Today rises, no gap
    expect((page.match(/\{renderReviewAfterlife\(\)\}/g) ?? []).length).toBe(2);
    const rail = page.indexOf('className="tdb-railr"');
    expect(page.indexOf("{renderReviewAfterlife()}", rail)).toBeLessThan(page.indexOf("{renderTodayPanel()}", rail));
    const pop = page.indexOf('className="tdb-todaypop"');
    expect(page.indexOf("{renderReviewAfterlife()}", pop)).toBeLessThan(page.indexOf("{renderTodayPanel()}", pop));
  });
  it("the card anatomy: whole-card button, Playfair title over the mono week line, chevron; cardx family", () => {
    expect(page).toContain('className="tdb-rvcard" onClick={openSundayReview}');
    const card = css.match(/\.tdb-rvcard \{([^}]*)\}/)?.[1] ?? "";
    expect(card).toContain("border-radius: 16px");
    expect(card).toContain("box-shadow: 0 4px 16px rgba(58, 28, 20, 0.1)");
    expect(css).toMatch(/\.tdb-rvtx b \{[^}]*font-family: var\(--f12-serif\); font-size: 13\.5px/);
  });
  it("the main column now ENDS with the lanes — no review markup beneath them", () => {
    expect(page).not.toContain("tdb-rvbar");
    expect(css).not.toContain("tdb-rvbar");
  });
});
