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
/* ⚠️ COMMENTS STRIPPED BEFORE ANY `not.toContain`, per the house rule — and this file proved it
   again the moment the review banner was unmounted. The unmount note NAMES the card it replaced
   ("↺ LAST WEEK IN REVIEW", `dismissReviewWeek`), which is exactly the prose this codebase writes
   when it retires something, so a raw read fails a file that is correct. Positive assertions still
   use `page`: those are looking for real declarations, and a comment cannot satisfy them by
   accident in the direction that matters. */
const pageCode = page.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
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
/* ⚠️ COMMENTS STRIPPED BEFORE ANY `not.toContain`, per the house rule — and this file proved it
   again the moment the review banner was unmounted. The unmount note NAMES the card it replaced
   ("↺ LAST WEEK IN REVIEW", `dismissReviewWeek`), which is exactly the prose this codebase writes
   when it retires something, so a raw read fails a file that is correct. Positive assertions still
   use `page`: those are looking for real declarations, and a comment cannot satisfy them by
   accident in the direction that matters. */
const pageCode = page.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
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
    /* ⚠️ THE INVERSES SPAN TWO FILES NOW (Pack C Phase 1) — the completion primitive's went to
       `useTaskCommit`, the fork's stayed on the page. The law is unchanged and is the point of the
       case: undo reverses through the EXISTING inverses, and no compensator was invented. Reading
       both files keeps that claim whole rather than narrowing it to whichever half is convenient. */
    const scope = page + readFileSync(join(here, "useTaskCommit.tsx"), "utf8");
    for (const inv of ["undoQueryStatus(q.id, prev", "deleteActivity(acts[0].id)", "snoozedUntil: null, unbumpSnooze: true", /* ⚠️ THE INVERSE CLEARS THE STAMP NOW, and this case is the right place to notice. Its law —
       undo reverses through the EXISTING inverses, no compensator invented — is unchanged: this is
       the same `updateUserTask` call, widened to clear `completedAt` as well as `done`, because a
       task that is not done has no time at which it was done. Asserting the widened form means a
       future narrowing back to `{ done: false }` fails here. */
      "updateUserTask(c.userTaskId!, { done: false, completedAt: null })", "mutedTaskRules: (currentUser?.mutedTaskRules ?? []).filter"]) {
      expect(scope).toContain(inv);
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
    /* ⚠️ THIS CASE NOW SPANS THE SEAM, AND THE HALVES ARE ASSERTED SEPARATELY. "No second piece of
       strike state" is a claim about THE PAGE and stays pointed at it. "The completion primitive is
       not dead" is a claim about the primitive, which is `useTaskCommit`'s — and the page must
       still REACH it, or this would pass on a page that had quietly stopped completing anything. */
    const writer = readFileSync(join(here, "useTaskCommit.tsx"), "utf8");
    expect(writer).toContain("quickDone(c)"); // the completion + undo toast, unchanged and still here
    expect(page).toContain("quickDone(card)"); // and the page still reaches it
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
/* ⚠️ COMMENTS STRIPPED BEFORE ANY `not.toContain`, per the house rule — and this file proved it
   again the moment the review banner was unmounted. The unmount note NAMES the card it replaced
   ("↺ LAST WEEK IN REVIEW", `dismissReviewWeek`), which is exactly the prose this codebase writes
   when it retires something, so a raw read fails a file that is correct. Positive assertions still
   use `page`: those are looking for real declarations, and a comment cannot satisfy them by
   accident in the direction that matters. */
const pageCode = page.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
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
    /* ⚠️ THE DERIVATIONS OUTLIVE THE BANNER, and that is what this case is for. The card is
       UNMOUNTED from the To-do page and comes back deliberately; every boolean above is still
       computed and still correct, which is the thing that makes restoring it a matter of putting
       the JSX back rather than rebuilding the reasoning. The two assertions that read the card's
       own MARKUP move to the unmount marker. */
    expect(page).toContain("THE WEEKLY REVIEW BANNER IS UNMOUNTED");
    expect(pageCode).not.toContain("{reviewWin && !reviewSeen && !reviewDismissed && (");
    expect(pageCode).not.toContain("View again");
  });
  it("frame P3 — the ✕ persists PER-WEEK (sa. prefs, no data writes); a new week resets both flags", () => {
    expect(page).toContain('localStorage.getItem("sa.todoReviewSeen")');
    expect(page).toContain('localStorage.setItem("sa.todoReviewSeen", reviewWin.key)');
    expect(page).toContain('localStorage.setItem("sa.todoReviewDismissed", reviewWin.key)');
    expect(page).toContain("const reviewDismissed = !reviewWin || reviewDismissedWk === reviewWin.key;"); // key mismatch on a new week = reset
    /* the ✕ is unmounted with the card; `dismissReviewWeek` and its key are not */
    expect(pageCode).toContain("const dismissReviewWeek = () => {");
    expect(pageCode).not.toContain('className="tdb-briefx"');
    expect(page).not.toContain("reviewHidden"); // the session-only hide is superseded
    expect(page).not.toContain("reviewSurface");
    for (const stale of ["tdb-rvbanner", "tdb-rvbar", "tdb-rvcard", "tdb-rvx2", "tdb-rvgo2", "renderReviewAfterlife"]) {
      expect(page).not.toContain(stale);
      expect(css).not.toContain(stale);
    }
  });
  it("THE BRIEFING anatomy (briefing-slot P1): warm panel, mono kicker, Playfair headline, figures, ink CTA", () => {
    /* ⚠️ THE ANATOMY IS ASSERTED IN THE STYLESHEET, WHICH IS UNTOUCHED — the card is unmounted
       from the page, not deleted, so every rule below is still the card's and still correct. The
       three assertions that read the MARKUP invert; `briefingHeadline` is still called, because
       the figures are still derived for the day the card returns. */
    expect(pageCode).not.toContain("↺ LAST WEEK IN REVIEW");
    expect(pageCode).not.toContain(">Read the review</button>");
    /* ⚠️ THE FOUR DERIVATIONS STILL COMPUTE — they are what makes the restore a JSX change rather
       than a rebuild. `briefingHeadline` is the ONE that lost its call site with the markup (it was
       only ever called inline in the headline node); it stays IMPORTED so the card's return does
       not have to rediscover it, and it is asserted here so a tidy-up of "unused imports" fails
       rather than silently making the restore harder. */
    for (const d of [
      "const briefCleared = reviewWin ? briefingCleared(userTasks, reviewWin) : 0;",
      "const briefFigures = briefingFigures(briefCleared, briefReplies);",
      "const briefNarrative = briefStats ? briefingNarrative(briefStats) : null;",
    ]) expect(pageCode, d).toContain(d);
    expect(pageCode).toContain("briefingHeadline");            // imported, awaiting the card
    expect(pageCode).not.toContain("briefingHeadline(brief");  // …and not called while it is gone
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
