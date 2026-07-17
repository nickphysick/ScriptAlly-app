# Sunday Review Afterlife — the torn scrap

Pack: `todo-review-scrap` (⚠ supersedes `todo-review-demotion`). Ref `design-refs/todo-scrap-variants.html`,
variant 3 (torn corner) normative — variants 1/2/4 fenced as exploration; copy amended "Last week"
(capital L). Gates per phase (tsc · build · full Vitest); explicit-path staging.

## STEP 0 — recon (tree clean at `4d4fbed`)

1. **Demotion ran** (`f58efaa`, `reports/todo-review-demotion.md` present) → Phase 2 (removal) is live.
2. **Entry derivation as it stood:** `reviewEntryCard` — Sun/Mon → a `do` (Urgent) card via the
   presence-read `!flag?.snoozedUntil`; Tue–Sat → the demoted `hk` card. Week key via `reviewWeek`
   (keys the most recent COMPLETED week on every weekday — correct, kept). **⚠ The load-bearing
   finding:** completion (`finishReview`) and dismissal (the card's ✕) both write ONLY
   `snoozedUntil` — completion `win.endMs + 2d`, dismissal `now + 3d` — so a presence-read cannot
   tell them apart. The scrap's rule REQUIRES it (dismissed → still offered; completed → withdrawn).
   Resolved read-only via the **completion sentinel** `reviewCompletionSnooze(win)` = `win.endMs +
   2d`, and single-sourced (finishReview repointed to the same helper — behaviour-identical value)
   so the read can never drift from the write. No flag-machinery/rules change.
3. **Cluster/tour:** `.tdb-postits` is a flex row of three post-it buttons (gap 22px). Tour stop 1
   targets `.tdb-postits`, copy "Three post-its, three kinds of work…". There remain **exactly
   three post-its** — the scrap is a torn scrap, not a post-it and not counted — so the copy stays
   TRUE. **No reword.** (The scrap sits inside the highlight but reads self-evidently as a distinct
   offer.) No halt: no out-of-scope change needed.

No halt condition fired (tree clean · demotion fully landed, unambiguous · coupling satisfiable
in-scope).

## PHASE 1 — the scrap

- **Derivation (`todoBoard.ts`):** `reviewScrap(input)` → `{weekNumber} | null` — renders Tue(2)–
  Sat(6) while uncompleted; Sun/Mon → null (the Urgent card owns entry — never both); no querying
  → null (nothing to review). "Completed" = `flag?.snoozedUntil === reviewCompletionSnooze(win)`
  (NOT presence — presence would also swallow a dismissal); a mere dismissal keeps the offer.
  `reviewEntryCard` reverted to Sun/Mon-only (the demoted hk branch removed).
- **Single-source (`FocusFlow.finishReview`):** the one completion write now calls
  `reviewCompletionSnooze(win)` — same value as before; the only touch to the review mode, made so
  the scrap's completion-read can't drift from the write. Flagged as a deliberate,
  behaviour-preserving edit.
- **Render (`ToDoPage.tsx`):** a `<button className="tdb-scrap">` as the last child of the
  `.tdb-postits` cluster — Playfair italic "Last week" over underlined "in review ▸"; opens the
  shipped `weeklyReview` mode via `openSundayReview` (unchanged); `aria-label` "Last week in review
  — week {n}"; **no dismissal affordance** (it exists or it doesn't).
- **CSS (`todo.css`):** variant 3 verbatim — 70×50, the ref's torn-edge `clip-path` polygon,
  `rotate(2deg)`, hover/focus straightens + lifts. Tokens: underline `--hk-cof-edge` (#cdb58f),
  tail `--hk-cof-ink` (#7a6544), line-1 ink `#5d4d40` (ref literal — no token fits). **Deviation:**
  `clip-path` clips `box-shadow` AND `outline`, so the soft shadow + the keyboard focus ring ride
  `filter: drop-shadow` (which follows the torn silhouette) — the ref's `box-shadow` would have
  been clipped invisible.
- **Tour:** unchanged (copy stays true, per recon 3).
- Tests: `reviewScrap` visibility across the week (Tue–Sat offer · Sun/Mon none · no-querying none),
  the completion-vs-dismissal distinction + the sentinel identity, supersession + the Sunday card's
  unchanged presence-gating; a source render-lock (copy/wiring/no-dismiss/in-cluster). Lane-split
  expectation reverted (review no longer enters `board.hk`).
