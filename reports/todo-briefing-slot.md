# To-do: the briefing slot + the assistant band — run report

**Branch:** `claude-il` · **Date:** 28 Jul 2026 · Ref: `design-refs/briefing-slot.html`
(`todo-fix60.html`, options 1 and 4; 2 and 3 rejected).

## Commits + gates

Every commit passed `tsc --noEmit`, `vite build` and the full Vitest suite.

| Phase | SHA | Suite |
|---|---|---|
| 1 — the briefing slot | `1ed9e84` | 1714 |
| 2 — the assistant band | `cbe6361` | 1715 |
| 3 — the sweep | `1c8dd69` | **1719** |

Files: `lib/todoBoard.ts`, `lib/briefingSlot.test.ts` (new), `lib/sessionStage.ts` + its test,
`todo/ToDoPage.tsx`, `todo/AssistantPromo.tsx`, `todo/todo.css`, `shell/todoShell.css`, four
existing To-do lock files, `design-refs/themes.md`, `design-refs/briefing-slot.html` (new).

## ⚠️ Phase 0 — the empty node does not exist, and both surfaces had already moved

**Three of this pack's premises describe a page that changed since it was written.** Nothing was
blocked; the work landed. But the differences matter for the record:

1. **There is no empty node.** The pack expects "the retired colophon's wrapper or a slot whose
   children are gated off, with a min-height or fixed-height parent". The To-do rebuild already
   deleted the board panel (`.tdb-mainc`/`.tdb-sheetbody`) and the colophon's wrapper with it.
   **The named node is: none — it was removed before this pack ran.** What actually sat beneath
   the hero was the rebuild's *featured review card*, and beneath that the control line with its
   own `margin-top: 44px`. No min-height, no fixed height, no phantom space. The collapse law is
   therefore satisfied by construction rather than by fixing a bug — and it is now lock-tested so
   it stays that way.

2. **The Pro card had already moved to the foot.** `panel-final-prompt.md`'s panel sticker
   shipped, and the To-do rebuild then relocated it to a foot strip. So Phase 2 was a **restyle,
   not a relocation** — and it **supersedes** that rebuild's explicit "no blue fill, no heavy
   shadow" decision by restoring the blue-sticker treatment, wide. Flagging it because it
   reverses a deliberate call rather than filling a gap.

3. **The briefing's seat was occupied.** The featured card (gradient, badge, View/Dismiss, 288px
   placeholder illustration) held exactly this position. Phase 1 **replaces** it, so the page
   still carries one review surface. The illustration slot I previously flagged for a
   commissioned piece is gone with it.

**Review data source:** `reviewWeek(queries, now)` gives the window (`key`, `startMs`, `endMs`,
`weekNumber`); "fresh" = `reviewWin && !reviewSeen && !reviewDismissed`, where seen composes the
completion sentinel and dismissed is keyed on `reviewWin.key`. **Dismiss-per-period already
existed** — reused, not rebuilt. **Pro gating** is `!isProUser(currentUser)` with counts from
`tiles.housekeeping` / `shownY` — unchanged.

## The figures — and the one that always drops

| Column | Source | Behaviour |
|---|---|---|
| CLEARED | `UserTask.completedAt` inside the window (new `briefingCleared`) | drops at zero |
| REPLIES | `weekReviewStats().back.length` | drops at zero |
| FOCUSED | **none — the app records no time anywhere** | **always drops** |

The headline and the grey sentence are composed from the same numbers (`briefingHeadline`,
`briefingNarrative`), spelled as words to twelve, singular/plural correct, with "A quiet week on
the desk" when there is nothing. Nothing is hardcoded; the narrative is omitted entirely rather
than padded. All four functions are pure and unit-locked.

**The FOCUSED column is the honest casualty.** The ref draws three figures; two have sources. I
built the third's slot and let the drop rule remove it, rather than inventing a number — so if
time tracking ever arrives, the column appears on its own.

## The collapse law — asserted, not assumed

The block sits inside the fresh-and-undismissed condition and its 26px margin lives **on the slot
itself**, never on a wrapper. Locks: the slot renders only inside that condition; nothing sits
between it and the filter row; `.tdb-brief` carries no `min-height` and no `height`; dismissal is
keyed on the review window.

## Deviations, and one thing to know

- **The briefing's CTA is an ink pill** (`#2a1a13`), per the ref's normative drawing — while this
  page's own chrome had otherwise gone dark-pill-free in the rebuild. The ref wins here since the
  pack calls option 1 normative, but it is the one dark fill back on the page. Say the word and
  it becomes the soft-pink primary.
- **A CSS edit of mine duplicated a ~53-line span of `todo.css`** mid-phase (an anchor ordering
  slip). Caught before commit, repaired surgically, and the committed diff is the intended
  11-insert/9-delete change. No `git checkout --` was used, per the worktree rules.
- **Swept but flagged, not fixed:** `sessionStage`'s `EXIT_BAR` (`.tdb-dochead`) and `DISSOLVE`
  (`.tdb-mainc`) still name extinct classes. They belong to the focused session, which is dormant
  until it regains an entry point, so rewriting its animation contract belongs with that work.
  `EXIT_FADE` was repointed because the briefing directly replaced what it named.
- **Worktree note:** HEAD had moved on since my last session — six Agents-page commits landed on
  top of my sidebar work. Verified none touched To-do before starting, and my commits are intact
  ancestors. An untracked `reports/onboarding-recon.md` sits in the tree; out of scope, untouched.

## In-browser checklist

1. **The briefing under the hero with real figures** — the headline should name your actual
   cleared/replies counts, and any column without data should be absent rather than showing 0.
2. **Dismiss it and watch the filter row rise** with no gap left behind — this is the collapse
   law; a residual space would mean a wrapper crept back.
3. **Reload** — it stays dismissed. It should return when the next review is generated.
4. **The assistant band closing the page** — blue offset block, slate pill, the button pinned to
   its end, generous space above the last section.
5. **No other Pro surface anywhere** on the page.

## The queue

dev deploy → prod sequencing pass → Correction UI.
