# To-do — Pop-up restyle · notify-all step · dim-scrim journeys

Pack: `todo-popup-notify-scrim`, against HEAD `057d385`. Ref committed with Phase 1. Gates per
commit (tsc · build · full Vitest); explicit-path staging.

## STEP 0 — findings (tree clean at `057d385`)

1. **The done-label leak, found exactly:** done rows printed `activity.description` verbatim
   (`clearedActivityCard`, todoBoard:313); the OLD offer path's stored celebration description
   ("Congratulations! You've received an offer of representation from …" — recordResponse.ts:441 /
   db.tsx:1798) therefore surfaced wholesale when that activity was today's. activityUtils.ts
   already held the matching regex (used for prefix-stripping) — now exported as ONE source.
2. **Notify step (last pass's):** per-agent doors → nudge-draft screen → staged nudge payloads.
   Replaced wholesale in Phase 2 (user tasks only, no staged nudges, no activities).
3. **UserTask fits the reminders with NO schema change:** text/agentId/queryId/dueDate(date-only,
   load-bearing)/done/completedAt all exist + allowlisted + accepted by addUserTask;
   recompute-proof (stored). Gap = lane (userTaskCard hard-codes nt) → Nick granted route (a):
   the ONE linked-reminder derivation clause in todoBoard.
4. **Duplicate guard key:** a live (!done) user task with agentId === {agent} AND queryId ===
   {offer query} — pure filter, no new state.
5. **FocusFlow mount:** `.tdb-ff` fixed inset-0 z-50 FULLY OPAQUE oat; staged-work tracking for
   the dismiss guard already exists (the `staged` array + requestExit's confirm); Esc handled; NO
   scroll lock (moot when opaque); NO mobile breakpoint exists on the board (6B still red-gated) —
   Nick set 760px width-only.
6. **Reuse:** `lockStageScroll` (stageScroll.ts) for the scroll lock; NO focus-trap utility exists
   anywhere — Phase 3 adds a minimal scoped Tab trap.
7. **Tour:** none of the five stops target the pop-up internals or the flow mount. ✓
8. Tree clean; ref present.

**Colour verification (both families sampled at source):** bold-pastille pink `#f4c7c2` = the
Bold theme's `--band`/`--hub-band-process` — copied into `.t-f12` as literals (`--pop-pink
#f4c7c2 · --pop-pink-2 #f0bcb6 · --pop-pink-b #e5a89f`, source comment; literals-only rule). The
pack's "panel sage #d7ddd5→#d5dbd3" is NOT on the live dashboard — those are the mockup values
the standing SAGE CORRECTION overrode; the live band is `#dce0d9→#d0d6cc` = the board's
`--hk-sage/--hk-sage-2`. **Nick confirmed: hk-sage is authoritative** (my ref's hexes were
stale) — the done band takes the ref's GRADIENT TREATMENT in the hk-sage family, which also
preserves the retoken's one-done-colour law.

**Decisions (Nick, 17 Jul):** route (a) lane derivation with the todoBoard scope grant (clause +
test only, diff verbatim below) · mobile = max-width 760px, width-only · terse deriver at
clearedActivityCard keyed on activityType/resultingStatus, description fallback, the
activityUtils regex reused · sheet min(860px, 92vw) · lockStageScroll reused · minimal scoped Tab
trap · aria-labelledby upgrade.

## PHASE 1 — pop-up restyle + terse done grammar

- **Terse grammar at THE source:** `terseDoneLabel(activity, agentName?)` (todoBoard, pure) —
  MATERIALS_SENT → "Full/Partial sent to {agent}" (resubmit-aware) · NUDGE_SENT → "Nudged
  {agent}" · OFFER_ACCEPTED/DECLINED → "Accepted/Declined {agent}'s offer" · the celebration
  description (the exported `OFFER_RECEIVED_DESC_RE`, one source with activityUtils) or
  resultingStatus OFFER → "{agent}'s offer — decision pending" · NO_RESPONSE/WITHDRAWN closes ·
  unknown shapes fall back to the description. Wired into `clearedActivityCard` — every future
  journey inherits terseness for free. Unit-locked (5 blocks).
- **Restyle per the ref:** pop 440px wide / 640px cap · head band = the `--pop-pink` gradient
  with hairline base + white committed pill + Playfair-23 title · committed rows became DIVIDER
  rows (boxes gone): 15.5px/1.35 titles, 10px mono meta, ~15px vertical padding · dots unified at
  26px (`.tdb-tdot` pink disc; status rows nest the real StatusDot at 16 inside it — consumed
  verbatim) · done band = hk-sage GRADIENT with sage hairlines, 26px tick discs, strikethrough at
  reduced WEIGHT (15.5px/500 — not reduced size), 220px scroll cap (was 32vh; the stack-lock test
  updated), renders-only-when-non-empty untouched · footer structure unchanged, count line 10px
  mono. Coffee remains the FAB/card "on today" family — only the pop-up head moved to
  bold-pastille (the ref's call).
- Tests 1104 → **1108** (+4 terse blocks). The design ref rides this commit.
