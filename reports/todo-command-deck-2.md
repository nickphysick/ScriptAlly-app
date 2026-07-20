# To-do — The Command Deck v2 (definitive)

Run against HEAD `078b1de`. Ref verified in Downloads (`todo-deck-v2-ref.html`, 20 Jul 21:47) →
`design-refs/todo-deck-v2.html`; `review-cup.svg` + `focus-art.png` already in
`src/assets/todo/` (recon-confirmed, currentColor / transparent respectively — not re-copied).

## Phase 0 — recon map (as found at `078b1de`)

**Predecessors landed:** polish-3b (= "Polish III definitive", 19 Jul: reels, soft tags, pinned
pair, review banner+bar) · polish-4 (IV: grid contract, vertical tab, footer rows) · polish-5 =
**Phase 1 only, reconstructed** (the V prompt file was never supplied; full-bleed left-pinned
grid + `--tdb-*` tokens; its Phase 2 closed-drawer/peeking-tab never built) · polish-6b (= "VI
definitive": Today always-on 264, review cup card above Today, play buttons, help FAB restored,
column scroll contract) · **command-deck v1 NEVER ran** (`todo-command-deck-prompt.md` was never
received — nothing of it exists to map).

**Retired by this pack, as found:** the left pinned pair (`.tdb-pair`: Focus card + filter card
with pill cloud + ⚙ footer row + fold state `sa.todoDrawer`) · the review banner
(`.tdb-rvbanner`), the right-column cup card (`.tdb-rvcard`), `reviewSurface` and its
banner/card windows, the `weekly_review` dismissal write (+3d snooze) and every review-surface
test · lane-head tinted bands (`.tdb-lghead` p/c/n) with in-head pagers as placed · edge fades —
already retired by an earlier pack (`laneFadeState` gone; nothing to remove) · `reelFit`'s
width-aware sizing (`--reelw`) → fixed 250 cards · the sidebar filter pills (loud
family-coloured `.tdb-fp`) · the batch card's in-body roundel buttons / footer CTA / NEVER link —
recon note: the current grouped card (`.tdb-gcard`) carries a "Batch fix →" footer button and a
ghost "Never" link; both retire under the card contract · "Over to you" strings repo-wide.

**Retained, re-homed:** Today column + all states (ghosts/done-band/scroll contract; width
264→256 per the LAWS) · play-button semantics ("Focus on {lane}") · help FAB · full ledger view
(inside the sheet) · Task Settings sheet · Batch-fix sheet · quick-complete + snooze primitives ·
the review mode (`weeklyReview` FocusFlow mode) + `reviewWeek`/`weekReviewStats`/
`reviewSeedCandidates`/`reviewCompletionSnooze`.

**Recon resolutions (the pack's open points):**
1. **"Review-opened record": none exists.** `openSundayReview` only sets flow state; the ONLY
   stored review record is the completion sentinel (`finishReview` →
   `snoozedUntil = reviewCompletionSnooze(win)` on the `weekly_review` flag). The banner's
   derived boolean therefore reads **opened ≔ completed-this-week** from that existing record —
   "View again" appears after finishing the review, not after merely glancing at it. No new
   write path, no rules risk. (Flip-on-open would need a new write — a one-line follow-up if
   wanted.)
2. **Pro CTA target:** `onNavigate("plans")` — the locked in-app upgrade route (CLAUDE.md:
   in-app upgrade CTAs → `/plans`; the same target the packages upsells use).
3. **Later "Don't show these again" mapping:** the existing `mutedTaskRules` single suppression
   point, per card type — send family (`partial_requested`/`full_requested`/`revise_resubmit`)
   → `send` · `nudge_overdue` → `nudge_overdue` · stale → `no_response_close` · materials batch
   → `dq_materials` · wish-list batch → `dq_mswl`. **Offers are the locked row** (never
   hideable) and **notes have no rule** (the user's own jottings) — on both, the Later menu
   omits the third item. All restorable in Task settings (existing behaviour).
4. **Filter state:** `TodoFilterState` gains a `notes` key (the yellow post-it/pill needs it);
   the quiet-pill reducer (rest → first-click solos → membership toggles → empty returns to
   rest) lands as pure functions in `todoFilters.ts`.
5. **Banner guard:** with zero queries there is no week to review (`reviewWeek` needs sends) —
   the banner slot renders empty on a new desk (the old "nothing queried → no surface" rule
   carried over).

## Commits

| Phase | SHA | Suite |
|---|---|---|
| P1 — the identity strip | `59f0ae2` | 1286 |
| P2 — the deck | `bf5ae7c` | 1290 |
| P3 — the rail | `c9b030b` | 1289 |
| P4 — the sheet · the board · the cards | `3928f59` | 1288 |
| P5 — sweep · breakpoints · tour · a11y | `d339689` | 1290 |
| report | `<this commit>` | 1290 |

Gates (`npx tsc --noEmit` + `npm run build` + full `npx vitest run`, `set -o pipefail`) green per
commit; explicit-path staging throughout. Suite figures move as retired suites left (reelFit's 5,
the review matrix, the old tour snapshot) and the v2 describes landed.

## Removed vs re-homed (as executed)

**Removed:** the pinned pair + fold (`sa.todoDrawer` dead) · every review surface but the
resident banner (banner windows, thin-bar remnants, right-column cup card, dismissal write,
`reviewSurface` + matrix) · the masthead family (`mastband/mastcol/spacers`, the masthead
search) · the sidebar pill cloud + status line + view toggle · lane-head tinted bands + the
lane dot · `reelFit` + `--reelw` (fixed 250s need no fit) · the card's rim/frame layer (live
cards; overlay faces keep `.tdb-frame`) · the body meta row + the body ＋ TODAY pill · the batch
card's footer CTA, NEVER link, roundel buttons, the quick ✓/⏸ rail, GroupFlip + the flip overlay
(triggerless) · 34 dead CSS rules · "Over to you" repo-wide.

**Re-homed:** search → the deck (same `searchRef`/⌘K/Esc wiring) · filters → the deck's quiet
pills + the post-it solos (same `TodoFilterState`, new reducer) · view toggle → the deck segment
(same `sa.todoView`) · Focus mode + Task settings → rail squares (Focus now whole-board) · the
review's doorway → the resident banner · Today column intact (256, scroll contract, ghosts,
done band) · the ledger intact inside the sheet (band-less lh2 heads; quick ⏸/→ kept) · quick-
complete + snooze primitives → the hover verb row + the Later menu.

## In-browser checklist (dev)

1. The assembly centred at 1440 and 2560 — identical 250px cards, bar backgrounds full-bleed.
2. The banner button flipping to ghost "View again" after finishing the review (note: after
   FINISHING — recon resolution 1; merely peeking doesn't flip it).
3. A post-it and its pill family driving one filter state; the burgundy SHOWING x OF y ·
   RESET ✕; Esc clearing search first, filters second.
4. A batch card opening Batch fix on body-click and showing ⚡ FIX {n} → on hover; a unit card's
   ✓ DONE / ＋ TODAY / ☾ LATER; "Don't show these again" hiding a type and Task settings
   restoring it (HIDDEN RIGHT NOW).
5. The reel: exactly three cards, no partials, pagers dimming at the ends, paging by three; the
   hover verb row growing downward without the reel reflowing.
6. No "Over to you" anywhere (tags read AGENT WAITING; the Queries turn-filter sub reworded).
7. The tour end to end (six stops), including the card stop's hover-verbs copy.
8. <1420: the 56px icon rail + FILTER ▾; <1240: the Today chip in the strip.
9. The rail's Pro square gone for a Pro account; "Meet the assistant" → /plans for free.

## Deviations

- **"Review-opened record" doesn't exist** — opened ≔ completed (the sentinel; recon res. 1).
- **Batch ＋ TODAY omitted** from the verb row (the ref draws it; groups have no commitment
  primitive — "wired to the EXISTING primitives" wins). Batch Later's tomorrow/week = a
  per-member flag fan-out of the existing snooze (undo restores all).
- **Offers**: no ✓ DONE (the journey decides) and no hide item (the locked row); notes: no hide
  item (no rule exists). The Later menu is otherwise identical everywhere.
- **The ✓ TODAY chip** reads "✓ TODAY" (the LAWS text) not the drawn markup's "TODAY'S LIST".
- **The verb overlay's scroll room**: the reel viewport carries 10px top + deep bottom padding
  with a compensating negative margin so the absolute overlay lives inside the scrollport
  (overflow-x on the track would otherwise clip it) — the visual rhythm keeps the 24-grid.
- **The ledger's 9-col grid** (~1058px natural) now lives in a 776px content box — columns
  compress; a ledger-specific column diet is follow-up material if it reads cramped.
- **FILTER ▾ folds the five latte/yellow pills** (the pink pair + lens stay visible) — the pack
  says "trailing pills" without a count.
- **jsdom limits** as ever: hover/sticky/paging are rule-text + source locks; the browser walk
  confirms the rendered behaviour.
- The dashboard's `OverToYou` component identifier keeps its name (the sweep bans the phrase,
  not the identifier); its comments no longer use the phrase.

## Deploy checkpoint

**The redesign is complete; nothing queues before dev deploy and the prod sequencing pass.**
