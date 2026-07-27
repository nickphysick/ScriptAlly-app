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
    expect((page.match(/flash\("Restored"\)/g) ?? []).length).toBeGreaterThanOrEqual(8);
    expect((flow.match(/onToast\("Restored"\)/g) ?? []).length).toBeGreaterThanOrEqual(7);
    expect(page).toContain("action ? 6000 : 2600"); // doc pass P5: undo toasts hold 6 seconds
    expect(page).toContain('className="tdb-toast" role="status" onMouseEnter={pauseToast} onMouseLeave={resumeToast}');
  });
});

describe("doc pass P5 — the undo-toast SYSTEM (mechanics, both views + Today)", () => {
  const page = readFileSync(join(here, "ToDoPage.tsx"), "utf8");
  const css = readFileSync(join(here, "todo.css"), "utf8");

  it("6s timer with hover PAUSE (remaining-time model); a new toast replaces (= commits) the current one", () => {
    expect(page).toContain("const armToastTimer = (ms: number) => {");
    expect(page).toContain("toastTimer.current = window.setTimeout(() => setToast(null), ms);");
    expect(page).toContain("const pauseToast = () => { toastDeadline.current = Math.max(600, toastDeadline.current - Date.now()); clearToastTimer(); };");
    expect(page).toContain("const resumeToast = () => armToastTimer(toastDeadline.current || 6000);");
    // replacement semantics: flash unconditionally swaps the toast + re-arms — the previous
    // action's write already happened, so replacement simply ends its takeback window
    expect(page).toContain("setToast({ msg, action });");
    expect(page).toContain("armToastTimer(action ? 6000 : 2600);");
  });
  it("keyboard: the toast is a status region, Undo is a real button, Esc dismisses (= commits)", () => {
    expect(page).toContain('if (e.key === "Escape") { clearToastTimer(); setToast(null); }');
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
  it("Today's tick: the committed row's leading dot completes via quickDone with the toast; offers keep the plain dot", () => {
    expect(page).toContain('className="tdb-tdot tick" aria-label={`Mark done — ${c.title}`} onClick={(e) => { e.stopPropagation(); quickDone(c); }}');
    expect(page).toContain('{c.taskType === "offer_received" ? (');
    expect(css).toContain(".tdb-trow:hover .tdb-tdot.tick .tdb-ttick, .tdb-trow:focus-within .tdb-tdot.tick .tdb-ttick { display: inline; }");
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
    expect(page).toContain('className="tdb-featbtn pri" onClick={openReview}');
    expect(page).not.toContain("View again");
  });
  it("frame P3 — the ✕ persists PER-WEEK (sa. prefs, no data writes); a new week resets both flags", () => {
    expect(page).toContain('localStorage.getItem("sa.todoReviewSeen")');
    expect(page).toContain('localStorage.setItem("sa.todoReviewSeen", reviewWin.key)');
    expect(page).toContain('localStorage.setItem("sa.todoReviewDismissed", reviewWin.key)');
    expect(page).toContain("const reviewDismissed = !reviewWin || reviewDismissedWk === reviewWin.key;"); // key mismatch on a new week = reset
    expect(page).toContain('aria-label="Dismiss for this week" onClick={dismissReviewWeek}'); // the close control
    expect(page).toContain('className="tdb-featbtn" onClick={dismissReviewWeek}>Dismiss</button>'); // and Dismiss
    expect(page).not.toContain("reviewHidden"); // the session-only hide is superseded
    expect(page).not.toContain("reviewSurface");
    for (const stale of ["tdb-rvbanner", "tdb-rvbar", "tdb-rvcard", "tdb-rvx2", "tdb-rvgo2", "renderReviewAfterlife"]) {
      expect(page).not.toContain(stale);
      expect(css).not.toContain(stale);
    }
  });
  it("THE FEATURED CARD anatomy (todo rebuild P3): warm gradient, Playfair 26 + pink badge, 50ch body, two actions, the 288px art panel", () => {
    expect(page).toContain("<h3>Last week in review</h3>");
    expect(page).toContain('<span className="tdb-featbadge">Ready</span>');
    expect(page).toContain("Every box ticked turns the dial in your favour.");
    const box = css.match(/\.tdb-feat \{([^}]*)\}/)?.[1] ?? "";
    expect(box).toContain("linear-gradient(103deg, #fdf9f4 0%, #faf1e8 58%, #f6e8dd 100%)");
    expect(box).toContain("border-radius: 16px");
    expect(box).toContain("border: 1px solid var(--line)");
    expect(box).toContain("margin-top: 26px"); // directly beneath the header rule
    expect(css).toMatch(/\.tdb-feath h3 \{[^}]*font-size: 26px/);
    expect(css).toMatch(/\.tdb-featd \{[^}]*max-width: 50ch/);
    expect(css).toMatch(/\.tdb-featart \{[^}]*width: 288px/);
    expect(css).toMatch(/\.tdb-featart \{[^}]*align-self: flex-end/); // bottom-aligned, bleeding to the edge
    // exactly two actions in the card body — nothing else
    expect((page.match(/className="tdb-featbtn/g) ?? []).length).toBe(2);
    expect(css).not.toContain("#fbf7f0"); // the docband's parchment gradient died with it
    expect(page).not.toContain("tdb-rvhead"); // the strip banner is gone — ONE surface, the review card
  });
  it("the mode itself is untouched: the banner button opens weeklyReview over the same set", () => {
    expect(page).toContain('mode: "weeklyReview"');
  });
});
