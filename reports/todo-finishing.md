# To-do — Finishing Pack (colour retune · undo everywhere · the Sunday review)

Pack: `todo-finishing`, against HEAD `d32af5a`. Refs committed with Phase 1 (`todo-ideas-retune.html`
§1 normative, §2–5 fenced as exploration; `todo-sunday-review.html` normative). Gates per commit.

## STEP 0 — findings (tree clean at `d32af5a`)

1. **Swap surface fully mapped** (report body of the recon message): coffee-bound identity points
   (post-it/dots/spines/kicker/G3 bar/rule-chips/batch chips/hk stream/unmute/Spotless) ·
   sage-bound today points (commit pill on-state, FAB, rollover bar, prompt dashes, pick) ·
   stays-sage done-family (receipts/ticks/done band/staged/choice-on/Done verbs/offer sage door).
2. **Tour copy names no colours** — nothing to reword.
3. **`flash()` already carries an action + timed dismissal** (6000/2600ms, guarded one-at-a-time
   replacement); placement centre-bottom, clear of the FAB/pop-up.
4. **Compensator table complete, no hard red gate** — most quick paths already toast with Undo;
   gaps = mute-item + mute-rule (no Undo on their toasts) + the snoozeCount bump (no un-bump).
5. **Week**: `weekOfQuerying` (dashboardStats) — ISO weeks since earliest `dateSent` via
   `isoWeekStart`, which turned out to be **already exported** (the micro-grant unneeded).
   Newly-quiet mirrors the engine via `replyTask` (taskPrecedence) — evaluated at the window
   edges, no re-derived threshold.
6. **Monday-seeding — NO red gate**: a future `committedDate` is naturally dormant until its day
   in the existing `=== today` derivation; both stores' fields allowlisted.
7. **Entry card**: `taskFlags.taskType` is a free string — `weekly_review` flag keys work today.
8. Tree clean.

**Decisions (Nick, 17 Jul):** (i) extend `upsertTaskFlag` with the snoozeCount un-bump — undo
fully restores ×n · (ii) judgement trio as recommended (fork heading + ⏸ hover → neutral; Caveat
asides stay sage-ink; `--coffee-*` kept-defined with a retirement comment, consumption removed) ·
(iii) the dashboardStats export micro-grant (moot — already exported) · Phase 2 adds Undo to the
two ⚠ rows · Phases 1–3 as written.

## PHASE 1 — the colour retune

- **NEW `.t-f12` literals** (ref §1 verbatim): `--hk-cof #e9dcc8 · --hk-cof-2 #e2d2b9 ·
  --hk-cof-edge #cdb58f · --hk-cof-ink #7a6544`. Housekeeping identity moved wholesale: post-it
  (coffee-2 fill per the ref), lane dot, both spines, `.tdb-hkdot`, kicker + dot (edge-ringed per
  ref), the G3 progress bar, muted-rules chips, batch-fill chips (board flip AND flow), the hk
  stream chip, unmute pills, the Spotless spine, GroupFlip header/find-button.
- **Sage = the Today system**: commit pill on-state → sage gradient + **"✓ On today's list"** ·
  the FAB → sage gradient pill + **INK completion ring** (the conic repointed) + ink title +
  sage-ink meta + sage inner disc · rollover bar · `.tdb-tempty` dashes + prompt ink · the pick
  button · row-✕ hover · the roll dot. Done-family sage untouched (already correct).
- **Neutral judgements applied**: the never-fork heading → `--ink-2`; the rail ⏸ hover → paper +
  neutral ink. Caveat asides unified on sage-ink (two stray coffee-ink asides aligned).
- **Coffee fully retired from consumption** — grep-verified ZERO `var(--coffee` under
  `src/components/todo/`; the token definitions keep a retirement comment; `--postit-sage` noted
  as orphaned. Tour copy untouched (no colour names existed).
- **themes.md regenerated** with the law inversion stated explicitly.
- Tests: 1134 (no behavioural changes; no snapshot suite exists — the acceptance is the grep +
  Nick's eyeball). Both refs ride this commit, the retune ref carrying the §2–5 exploration fence.

## PHASE 2 — undo everywhere (write-then-reverse)

Baked decision honoured: every action commits immediately exactly as before; Undo issues the
mapped compensating reversal; the board re-derives from the reversed write (no optimistic
patching, no deferred writes).

**The compensator table as shipped (no gaps):**

| Action | Write | Undo reversal |
|---|---|---|
| Quick-✓ send/resubmit | recordMaterialsSent | undoQueryStatus (deletes the created records) |
| Quick-✓ nudge | logNudge twins | deleteActivity on the nudge (full unwind) |
| Quick-✓ note / sweep-D note / journey Mark-done | updateUserTask done | un-done |
| Quick-✓ / sweep-D / journey stale-close | updateQueryStatus NO_RESPONSE | undoQueryStatus |
| ⏸ 7-day snoozes (single, group, stale, sweep ×3) | dismissTask (flag + bump) | snoozedUntil null **+ unbumpSnooze** |
| Mute-item ("never this", single + stale + never:) | flag MUTED_UNTIL | snoozedUntil null (no bump to reverse) |
| Mute-rule (G3 Never + fork "all of them") | mutedTaskRules append | the profile filter-out (unmuteRule's own write) |

- **The un-bump primitive (Nick's call):** `upsertTaskFlag` patch gained `unbumpSnooze` —
  `snoozeCount` floors at 0; a snooze undo now fully restores INCLUDING ×n. Client-only; the
  field was already allowlisted — no rules change.
- **Toast grammar unified:** "✓ {title} — done/snoozed/dismissed" across board + sweep + journey
  fast paths; successful Undo flashes "Restored" (the replacement semantics give it the brief
  2.6s window); action toasts now ~5s; `.tdb-toast` is `role="status"`; the Undo button was
  already a real button (keyboard-reachable). One-at-a-time replacement was already the flash
  mechanic — a new action simply ends the previous undo window.
- **Two toasts gained their missing Undo** (the recon's ⚠ rows): mute-item's `never:` toasts and
  both rule-mutes. The receipt overlays' own prose is untouched (cards, not toasts).
- **Scope note:** journey review-Save stays on the staged/confirm model (per the pack); the
  GroupFlip/flow batch save keeps its existing "Undo all". No action type was red-gated — nothing
  ships toast-less.
- Locks in NEW `todoFinishing.test.ts` (source layer). Tests 1134 → **1139**.
