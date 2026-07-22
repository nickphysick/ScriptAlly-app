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

describe("polish P3 — THE REVIEW CARD (its own container at the stack's head)", () => {
  const page = readFileSync(join(here, "ToDoPage.tsx"), "utf8");
  const css = readFileSync(join(here, "todo.css"), "utf8");
  const flow = readFileSync(join(here, "FocusFlow.tsx"), "utf8");
  const cup = readFileSync(join(here, "..", "..", "assets", "todo", "review-cup.svg"), "utf8");

  it("finishReview writes the completion SENTINEL against the week key (single-sourced) — unchanged", () => {
    expect(flow).toContain("reviewCompletionSnooze(win)");
    expect(flow).toContain('flagKeyForTask("weekly_review", win.key)');
  });
  it("ONE derived boolean drives the button: opened ≔ completed-this-week (the only stored review record)", () => {
    expect(page).toContain("const reviewWin = queries.length > 0 ? reviewWeek(queries, now) : null;");
    expect(page).toContain("f.snoozedUntil === reviewCompletionSnooze(reviewWin)");
    expect(page).toContain('{reviewOpened ? "View again" : "Open it ›"}');
    // press-law dress: unopened = the true-primary press small; opened = the quiet ghost
    expect(page).toContain('className={`${reviewOpened ? "tdb-ctaghost" : "tdb-cta sm"} tdb-rvopen2`} onClick={openSundayReview}');
  });
  it("the ✕ is a SESSION-ONLY hide — component state, ZERO writes; no stored dismissal exists", () => {
    expect(page).toContain("const [reviewHidden, setReviewHidden] = useState(false);");
    expect(page).toContain("{reviewWin && !reviewHidden && (");
    expect(page).toContain('aria-label="Hide until next visit" onClick={() => setReviewHidden(true)}>✕</button>');
    expect(page).not.toContain("dismissReviewBanner");
    expect(page).not.toContain("reviewSurface");
    for (const stale of ["tdb-rvbanner", "tdb-rvbar", "tdb-rvcard", "tdb-rvx2", "tdb-rvgo2", "renderReviewAfterlife"]) {
      expect(page).not.toContain(stale);
      expect(css).not.toContain(stale);
    }
  });
  it("the RVBOX anatomy (polish P3): lifted white card, uncircled 46px currentColor cup, kicker, Playfair 15 title, one-line sub", () => {
    expect(cup).toContain('stroke="currentColor"');
    expect(page).toContain('<span className="tdb-rvcupb" aria-hidden dangerouslySetInnerHTML={{ __html: reviewCupRaw }} />');
    expect(page).toContain("THE SUNDAY REVIEW · WEEK {reviewWin.weekNumber}");
    expect(page).toContain("<b>Last week in review</b>");
    expect(page).toContain("<p>Every box ticked turns the dial in your favour.</p>");
    const cupRule = css.match(/\.tdb-rvcupb \{([^}]*)\}/)?.[1] ?? "";
    expect(cupRule).toContain("width: 46px");
    expect(cupRule).toContain("color: var(--ink)");
    expect(cupRule).not.toContain("border-radius"); // uncircled
    const box = css.match(/\.tdb-rvbox \{([^}]*)\}/)?.[1] ?? "";
    expect(box).toContain("background: var(--white, #fff)");
    expect(box).toContain("border-radius: 16px");
    expect(box).toContain("box-shadow: 0 5px 18px rgba(58, 28, 20, 0.11)");
    expect(css).not.toContain("#fbf7f0"); // the docband's parchment gradient died with it
    expect(css).toMatch(/\.tdb-rvhx b \{[^}]*font-size: 15px/);
    expect(page).not.toContain("tdb-rvhead"); // the strip banner is gone — ONE surface, the review card
  });
  it("the mode itself is untouched: the banner button opens weeklyReview over the same set", () => {
    expect(page).toContain('mode: "weeklyReview"');
  });
});
