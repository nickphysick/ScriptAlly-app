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
const flow = readFileSync(join(here, "HousekeepingSweep.tsx"), "utf8");
const db = readFileSync(join(here, "../../lib/db.tsx"), "utf8");

describe("P2 — undo everywhere (write-then-reverse)", () => {
  it("the un-bump primitive exists: a snooze undo restores the ×n count, floored at 0", () => {
    expect(db).toContain("unbumpSnooze?: boolean");
    expect(db).toContain("Math.max(0, (existing?.snoozeCount ?? 0) + (patch.bumpSnooze ? 1 : 0) - (patch.unbumpSnooze ? 1 : 0))");
  });

  it("every snooze undo un-bumps (board) — no reversal leaves ×n inflated", () => {
    const boardUnbumps = page.match(/snoozedUntil: null, unbumpSnooze: true/g) ?? [];
    expect(boardUnbumps.length).toBeGreaterThanOrEqual(4); // quickPause ×2, forkNotNowGroup, forkStale
    /* the takeover's sweep snooze (three branches) went with its query paths (27 Sep); the
       survivor snoozes nothing, so it has no inverse to get wrong */
    expect(flow).not.toContain("bumpSnooze: true");
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
    /* the takeover's seven "Restored" undos were its query paths' (27 Sep) — the sweep's batch
       save carries its own "Undo all" */
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

/* ⚠️ THE WEEKLY REVIEW IS DELETED (27 Sep) — the banner, the briefing, the entry link, the
   six-step sheet, its completion sentinel and its per-week prefs. Its locks went with it; these
   assert it stays gone rather than lying dormant. */
describe("the weekly review is gone, not unmounted", () => {
  const page = readFileSync(join(here, "ToDoPage.tsx"), "utf8");
  const pageCode = page.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  const flowCode = flow.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  it("no review derivation, flag, pref or entry survives on the page", () => {
    for (const dead of ["reviewWeek", "reviewCompletionSnooze", "weekReviewStats", "briefingCleared", "briefingHeadline",
      "openSundayReview", "openReview", "sa.todoReviewSeen", "sa.todoReviewDismissed", "weeklyReview", "tdb-revlink", "review-cup"]) {
      expect(pageCode, `the page still has ${dead}`).not.toContain(dead);
    }
  });
  it("the sweep has no review mode", () => {
    for (const dead of ["weeklyReview", "sundayReviewSheet", "finishReview", "weekly_review", "rvStep"]) {
      expect(flowCode, `the sweep still has ${dead}`).not.toContain(dead);
    }
  });
});
