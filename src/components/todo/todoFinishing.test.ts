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

describe("P3 — the Sunday review (source locks)", () => {
  it("summary steps write nothing; quiet choices STAGE only (no direct status write in the toggle)", () => {
    const toggle = flow.match(/const toggleQuiet = [\s\S]*?\n    \};/)?.[0] ?? "";
    expect(toggle).toContain("setStaged");
    expect(toggle).not.toContain("updateQueryStatus");
  });

  it("staged closes apply ONLY at finish, through the shared handler map's existing close path", () => {
    expect(flow).toContain("const closes = staged.filter((x) => x.kind === \"close\");");
    expect(flow).toContain("await applyStaged(closes, stagedHandlers);");
    expect(flow).toContain('close: (p: Extract<StagedPayload, { kind: "close" }>) => updateQueryStatus(p.queryId, QueryStatus.NO_RESPONSE');
  });

  it("seeds commit Monday's committedDate through the existing setters; completion writes the week's flag", () => {
    expect(flow).toContain("await updateUserTask(sc.userTaskId, { committedDate: mondayYmd });");
    expect(flow).toContain("await upsertTaskFlag(flagKeyForTask(sc.taskType, sc.relatedRecordId), { committedDate: mondayYmd });");
    expect(flow).toContain('flagKeyForTask("weekly_review", win.key)');
  });

  it("the entry card never leaks into card journeys, walks, sweeps or Help-me-pick", () => {
    expect(page).toContain('const flowable = cards.filter((c) => c.taskType !== "weekly_review");');
    expect(page).toContain('items: board.do.filter((c) => c.taskType !== "weekly_review").map((card) => ({ kind: "card", card })), mode: "sweep"');
    expect(page).toContain('choosePicks({ doCards: board.do.filter((c) => c.taskType !== "weekly_review")');
  });

  it("the entry card's dismissal rides the P2 grammar (flag snooze + Undo + Restored)", () => {
    const dismiss = page.match(/function renderReviewCard[\s\S]*?dismissed`/)?.[0] ?? "";
    expect(dismiss).toContain('flagKeyForTask("weekly_review", c.relatedRecordId!)');
    expect(dismiss).toContain("snoozedUntil: new Date(Date.now() + 3 * 86400000).toISOString()");
  });

  it("openSundayReview is a HOISTED function, not a post-return const (else it sits in the TDZ and renderReviewCard throws on render — the demotion crash)", () => {
    expect(page).toContain("function openSundayReview()");
    expect(page).not.toContain("const openSundayReview");
  });

  it("THE SCRAP (afterlife): a torn offer in the cluster — copy 'Last week', opens the review, no dismiss", () => {
    const scrap = page.match(/\{scrap && \([\s\S]*?\)\}/)?.[0] ?? "";
    expect(scrap).toContain('className="tdb-scrap"');
    expect(scrap).toContain("<b>Last week</b>"); // capital L (the ref copy amendment)
    expect(scrap).toContain("in review ▸");
    expect(scrap).toContain("onClick={openSundayReview}");
    expect(scrap).toContain("aria-label={`Last week in review — week ${scrap.weekNumber}`}");
    expect(scrap).not.toContain("dismiss"); // no dismissal affordance on the scrap
    // it derives from reviewScrap and lives inside the post-it cluster (before the cluster closes)
    const clusterEnd = page.indexOf('</span>\n          <span className="tdb-sp" />');
    expect(page.indexOf('className="tdb-scrap"')).toBeGreaterThan(0);
    expect(page.indexOf('className="tdb-scrap"')).toBeLessThan(clusterEnd);
  });
});
