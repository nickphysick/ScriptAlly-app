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
    // the never:/hide callbacks toast with an Undo that unsets the flag (doc-pass grammar)
    expect((page.match(/Hidden — [^`]*`, \{ label: "Undo"/g) ?? []).length).toBeGreaterThanOrEqual(4);
    // rule-mute reverses via the profile filter-out (the same write unmuteRule performs)
    expect(page).toContain("mutedTaskRules: (currentUser?.mutedTaskRules ?? []).filter((r) => r !== g.rule)");
  });

  it("toast grammar (doc pass P5): Done — “{title}” · Snoozed until {when} · Hidden — {type}; the ad-hoc copies stay gone", () => {
    // scoped to the toast calls — receipt-overlay card copy legitimately keeps its own prose
    const toastCalls = [...(page.match(/flash\([^;]*\)/g) ?? []), ...(flow.match(/onToast\([^;]*\)/g) ?? [])].join("\n");
    for (const gone of ["logged with defaults", "Snoozed for 7 days", 'flash("Note done"', 'onToast("Note done"', '"Closed as no response"', "— done`", "— snoozed`", "— dismissed`", "(restore in Task settings)"]) {
      expect(toastCalls).not.toContain(gone);
    }
    expect(page).toContain("flash(`Done — “${c.title}”`,");
    expect(page).toContain('flash(`Snoozed until ${days === 1 ? "tomorrow" : "next week"}`,');
    expect(page).toContain("flash(`Snoozed until next week`,"); // the fixed 7-day paths
    expect(page).toContain("flash(`Hidden — ${g.meta.label}`,");
    expect(page).toContain("flash(`Hidden — ${HK_RULES[g.rule].label}`,");
    expect(page).toContain("flash(`Hidden — “${c.title}”`,"); // item-level mutes name the item
  });

  it("undo confirms with Restored; the toast is a status region on the 6s action window", () => {
    const hook = readFileSync(join(here, "useTodoToast.ts"), "utf8");
    expect((page.match(/flash\("Restored"\)/g) ?? []).length).toBeGreaterThanOrEqual(8);
    expect((flow.match(/onToast\("Restored"\)/g) ?? []).length).toBeGreaterThanOrEqual(7);
    /* ⚠️ THE WINDOW MOVED INTO useTodoToast (extraction E1) — one owner, four pages — and it is
       EIGHT seconds now (tasks-consolidation P6; sheet 5). Six was a guess; the takeback window is
       the one duration on this page that is about a person rather than a frame, and hover still
       pauses it. A plain notice with nothing to reach for keeps its shorter life. */
    expect(hook).toContain("const WITH_UNDO_MS = 8000;");
    expect(hook).toContain("const PLAIN_MS = 2600;");
    /* the pill gained a TONE (pink, refusals only), so the className is composed rather than
       literal — what this case protects is the hover pair, and that is unchanged */
    expect(page).toContain("onMouseEnter={pauseToast} onMouseLeave={resumeToast}");
    expect(page).toContain('toast.tone === "warn"');
  });
});

/* ⚠️ THE TOAST'S MECHANICS MOVED VERBATIM INTO useTodoToast (extraction E1), so the four To-do
   pages share ONE takeback window rather than four that could all be open at once. Every rule
   below is unchanged — only the file it is asserted against moved. */
describe("doc pass P5 — the undo-toast SYSTEM (mechanics, both views + Today)", () => {
  const page = readFileSync(join(here, "ToDoPage.tsx"), "utf8");
  const hook = readFileSync(join(here, "useTodoToast.ts"), "utf8");
  const css = readFileSync(join(here, "todo.css"), "utf8");

  it("8s timer with hover PAUSE (remaining-time model); a new toast replaces (= commits) the current one", () => {
    expect(hook).toContain("const arm = useCallback((ms: number) => {");
    expect(hook).toContain("timer.current = window.setTimeout(() => setToast(null), ms);");
    // the remaining-time model: pausing banks what is LEFT rather than restarting the window
    expect(hook).toContain("deadline.current = Math.max(600, deadline.current - Date.now());");
    expect(hook).toContain("arm(deadline.current || WITH_UNDO_MS)");
    // replacement semantics: flash unconditionally swaps the toast + re-arms — the previous
    // action's write already happened, so replacement simply ends its takeback window
    expect(hook).toContain("setToast({ msg, action });");
    // tasks-pages P4: flash may take an explicit window (the Noteboard's 8s delete undo) — the
    // defaults are unchanged and the override rides the SAME arm, never a second timer.
    expect(hook).toContain("arm(ms ?? (action ? WITH_UNDO_MS : PLAIN_MS));");
  });
  it("keyboard: the toast is a status region, Undo is a real button, Esc dismisses (= commits)", () => {
    expect(hook).toContain('if (e.key === "Escape") dismiss();');
    expect(page).toContain('<button type="button" className="tdb-toast-act"');
  });
  it("the ink pill: bottom-centre, paper Undo, slide-up; reduced motion = fade only", () => {
    const t = css.match(/\.tdb-toast \{([^}]*)\}/)?.[1] ?? "";
    expect(t).toContain("left: 50%; bottom: 26px");
    expect(t).toContain("background: var(--ink)");
    expect(t).toContain("border-radius: 99px");
    expect(t).toContain("animation: tdbToastUp");
    const u = css.match(/\.tdb-toast-act \{([^}]*)\}/)?.[1] ?? "";
    expect(u).toContain("background: var(--paper)");
    expect(u).toContain("color: var(--ink)");
    expect(css).toContain("@media (prefers-reduced-motion: reduce) { .tdb-toast { animation: tdbToastFade 160ms ease; } }");
  });
  it("undo reverses via the EXISTING inverses only — the reversible primitives, no new compensators", () => {
    for (const inv of ["undoQueryStatus(q.id, prev", "deleteActivity(acts[0].id)", "snoozedUntil: null, unbumpSnooze: true", "updateUserTask(c.userTaskId!, { done: false })", "mutedTaskRules: (currentUser?.mutedTaskRules ?? []).filter"]) {
      expect(page).toContain(inv);
    }
  });
  /* ⚠️ RETARGETED (workspace P3): the sage circle and strike-in-place were the CORNER PANEL's
     grammar — its row, its state, its stylesheet rule. The corner is retired, so the mechanism
     went with it and `strikeIds` was left write-only, which is why it went too.
     The behaviour survives on the Today PAGE, and better: it strikes from the DERIVED done set
     rather than from a second piece of state that had to be kept in step with it. */
  it("the corner's duplicate strike state is dead, and the completion primitive is not", () => {
    expect(page).not.toContain('className="tdb-cc"');
    expect(page).not.toContain("strikeThenDone(c)");
    expect(page).not.toContain("setStrikeIds(");
    expect(page).toContain("quickDone(c)"); // the completion + undo toast, unchanged and still here
    /* ⚠️ THE STRIKE'S HOST CHANGED TWICE; THE PRIMITIVE NEVER DID. The strike-in-place moved from
       the retired corner panel to the Today page (workspace P3), and Today is retired in turn
       (tasks-consolidation P1, 9 Aug). What this test protects is the half above — no second
       piece of strike state anywhere, one completion path — and that is untouched. The rule the
       host carried is worth restating for the consolidated page: THE STRIKE GOES ON THE TITLE,
       never the row, so the time and the Undo control stay legible. */
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
  it("the derived booleans: the completion sentinel is the one STORED record and composes into seen", () => {
    expect(page).toContain("const reviewWin = queries.length > 0 ? reviewWeek(queries, now) : null;");
    expect(page).toContain("f.snoozedUntil === reviewCompletionSnooze(reviewWin)");
    expect(page).toContain("const reviewSeen = !reviewWin || reviewSeenWk === reviewWin.key || reviewOpened;");
    // frame P3: the banner shows only while UNSEEN and UNDISMISSED; its button is always the
    // ink "Open it ›" (an opened week never re-shows the banner, so the View-again flip died)
    expect(page).toContain("{reviewWin && !reviewSeen && !reviewDismissed && (");
    // todo rebuild P3: the banner became the FEATURED CARD — its primary is the soft-pink
    // "View" (no ink pill anywhere on this page now).
    expect(page).toContain('className="tdb-briefbtn" onClick={openReview}'); // briefing-slot: Read the review
    expect(page).not.toContain("View again");
  });
  it("frame P3 — the ✕ persists PER-WEEK (sa. prefs, no data writes); a new week resets both flags", () => {
    expect(page).toContain('localStorage.getItem("sa.todoReviewSeen")');
    expect(page).toContain('localStorage.setItem("sa.todoReviewSeen", reviewWin.key)');
    expect(page).toContain('localStorage.setItem("sa.todoReviewDismissed", reviewWin.key)');
    expect(page).toContain("const reviewDismissed = !reviewWin || reviewDismissedWk === reviewWin.key;"); // key mismatch on a new week = reset
    expect(page).toContain('className="tdb-briefx" aria-label="Dismiss for this week" onClick={dismissReviewWeek}');
    expect(page).not.toContain("reviewHidden"); // the session-only hide is superseded
    expect(page).not.toContain("reviewSurface");
    for (const stale of ["tdb-rvbanner", "tdb-rvbar", "tdb-rvcard", "tdb-rvx2", "tdb-rvgo2", "renderReviewAfterlife"]) {
      expect(page).not.toContain(stale);
      expect(css).not.toContain(stale);
    }
  });
  it("THE BRIEFING anatomy (briefing-slot P1): warm panel, mono kicker, Playfair headline, figures, ink CTA", () => {
    expect(page).toContain("↺ LAST WEEK IN REVIEW");
    expect(page).toContain("briefingHeadline(briefCleared, briefReplies)");
    expect(page).toContain(">Read the review</button>");
    const box = css.match(/\.tdb-brief \{([^}]*)\}/)?.[1] ?? "";
    expect(box).toContain("linear-gradient(180deg, #f7f2ea, #f3ece1)");
    expect(box).toContain("border: 1px solid #e2d8c6");
    expect(box).toContain("border-radius: 13px");
    expect(box).toContain("padding: 14px 18px");
    expect(box).toContain("margin-top: 26px"); // the margin lives on the SLOT, not a wrapper
    expect(css).toMatch(/\.tdb-brieft \{[^}]*font-size: 16px/); // the Playfair headline
    expect(css).toMatch(/\.tdb-briefstats div b \{[^}]*font-size: 22px/); // the figures
    // the featured card and its illustration are extinct
    expect(css).not.toContain(".tdb-featart");
    expect(page).not.toContain("tdb-featbadge");
    expect(css).not.toContain("#fbf7f0"); // the docband's parchment gradient died with it
    expect(page).not.toContain("tdb-rvhead"); // the strip banner is gone — ONE surface, the review card
  });
  it("the mode itself is untouched: the banner button opens weeklyReview over the same set", () => {
    expect(page).toContain('mode: "weeklyReview"');
  });
});
