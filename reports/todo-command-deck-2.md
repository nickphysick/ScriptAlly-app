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

*(Phases append below as they land.)*
