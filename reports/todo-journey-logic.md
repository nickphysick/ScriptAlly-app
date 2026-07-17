# FocusFlow — Journey-Logic Pass (timestamps · one-tap send · interim offer journey)

Pack: `todo-journey-logic`, against HEAD `9ba9eaf`. Logic, not chrome. The invariant: a derived
task is a projection of an already-logged event — completing it records the USER'S NEXT MOVE,
never a re-log of the agent event that spawned it. Ref `design-refs/todo-offer-send-journeys.html`
(supplied ✓, committed with Phase 1). Gates: tsc · build · full Vitest per commit; rules compile
rides Nick's dev `firestore:rules` deploy (no offline compiler in this repo — flagged, the deploy
is Nick's).

## STEP 0 — invariant audit (tree clean at `9ba9eaf`)

| Journey | Completion write | Verdict |
|---|---|---|
| **Offer** | opened `RecordResponseFocusForm` → re-logged the offer that spawned the task | ⛔ the offender |
| Send full/partial/R&R | staged → `markSentWriteArgs` → `recordMaterialsSent` (one MATERIALS_SENT + recompute) | ✓ |
| Nudge | staged → `logNudge` (non-status twins + fields + resurface flag) | ✓ (timestamp finding) |
| Stale-close | immediate `updateQueryStatus(NO_RESPONSE)` — a user decision | ✓ |
| DQ single / group | `updateAgent` + flag resolve — no activity | ✓ |
| Note | `updateUserTask({done, completedAt})` | ✓ |
| Sweep quick-✓s | the same builders → the same paths | ✓ |
| Stances | taskFlags / mutedTaskRules only | ✓ |

**Timestamps:** no shared construction point existed. The send journey built
`new Date("YYYY-MM-DD").toISOString()` = midnight UTC (FocusFlow:274) — THE 01:00-BST artefact
(it then passes `monotonicEventTime`, an ordering clamp, not a fix). Quick paths already passed
full now. **The nudge's "Date nudged" picker was display-only** — `nudgeWriteArgs` stripped it and
`buildNudgeWrites` stamped the injected write-time; a back-dated nudge logged at today.

**Offer vocabulary: RED GATE fired** — no accepted/declined ActivityType; QueryStatus's closed set
fits neither decision; firestore.rules hard-lists activityType values (:390); the offer task
derives from `status === OFFER` and died only via status change. **Nick's decisions (17 Jul):**
Option A (OFFER_ACCEPTED/OFFER_DECLINED ActivityType members + the rules list edit; Accepted
non-status; Declined also closes via WITHDRAWN — mechanism my call, see Phase 3) · reply-by = the
offer query's `responseDeadline` (VERIFIED: the dashboard's deadline chip reads the same field —
OverToYou.tsx:129 — and the agent pill's respondBy derives from it; pill hides when unset, the
need-time cap simply lapses) · both one-clause db.tsx touches approved (decision-kills-task +
offer exemption at the snooze filter; diffs verbatim below when they land) · Phase 1 explicitly
includes the nudge event-date fix.

**Other recon:** the nested activity subcollection validates `type` as a free string ≤128 (no
rules change needed for nested decision rows); `recomputeQuery` honours `resultingStatus` on ANY
activity ("either field counts") — the hook Phase 3's decline mechanism uses; FocusFlow already
holds queries/agents/manuscripts for the notify list; the snooze filter (db.tsx:804) HIDES
suppressed tasks wholesale — hence the approved offer exemption.

## PHASE 1 — the timestamp rule (shared layer)

- **`journeyEventISO(day, nowIso)` in `todoWalk.ts`** — THE shared construction point: no pick /
  today's pick → `nowIso` verbatim; a back-dated day → that date at **12:00 noon LOCAL**
  (constructed from Y-M-D parts, never string-parsed); unparseable → now. Unit-locked: now-path ·
  today-pick · noon back-date (local hour 12, local day preserved) · the timezone-boundary
  honesty case (noon-local can never shift the rendered local day; midnight-UTC can and did).
- **Send journey repointed:** `sentDate: journeyEventISO(sentDate, now)` — the midnight-UTC
  construction is gone. `monotonicEventTime` still applies downstream (ordering only).
- **Nudge event date now REAL:** `NudgeInput.eventDate?` (full ISO, defaults to now) —
  `buildNudgeWrites` stamps it on BOTH activity twins + `lastNudgeSentDate` (keeping the snapshot
  ≡ `reconcileNudge`'s re-derivation from `nested.createdAt`); the dismissal bookkeeping stays at
  write time. `nudgeWriteArgs(p, nowIso)` feeds it via the shared noon rule — the journey's picked
  day finally reaches the write. All three callers updated (journey save, sweep, quick-✓).
- **Quick paths** route through the helper's now-path (output byte-identical — locked).
- **The "I sent it earlier" affordance** ships with Phase 2's rebuilt confirm sheet (the ref draws
  it ON that sheet — same step, one rebuild; meanwhile the existing date input is already
  noon-safe from this commit). No new date pickers added anywhere else (the nudge already had
  one; it now simply tells the truth).
- Tests: +6 (helper ×4 within two blocks, nudge args rewrite, buildNudgeWrites eventDate pair).
  Updated: the two nudgeWriteArgs shape assertions. No rules changes this phase.

## PHASE 2 — one-tap send confirm

- **The two-step checklist ("What went out?" ticks → "When, and how?") collapsed into ONE confirm
  sheet** per the ref: "Off it goes" · "{who} asked for {the full/revisions/the sample} — so
  that's what we'll log." · the ASSUMED row pre-confirmed in the done-sage treatment
  (`.tdb-ffassume`, sage tick) · primary **"Mark sent"** — one tap stages it.
- **Assumed item = `assumedSendItem(taskType, agent.materialsWanted, who)`** (todoWalk, pure,
  unit-locked): full → "Full manuscript — what {who} requested"; partial → the sample seeded from
  the agent's OWN materials list where held (the same field the housekeeping journey fills), else
  the honest "Partial — the sample {who} asked for" (never invented specifics); R&R → "Revised
  manuscript — what {who} asked to see again".
- **Exceptions on demand:** the quiet "+ I sent something else too" link expands the remaining
  tick-list items + "Something else" (collapsed by default; nothing implies extras are expected).
  Payload materials = assumed + ticked extras.
- **The when-row** (Phase 1's promised affordance): "Logged just now, {date} · I sent it earlier"
  → a day picker capped at today, note "we'll log it at midday" — feeding `journeyEventISO`
  (back-dated → noon local; untouched → the true write moment).
- **Write byte-identity locked:** the default path's `markSentWriteArgs` equals the old
  fully-ticked equivalent (materials/method are audit-only and never reach the write; the test
  asserts the equality, plus the extras-path audit list). Method is auto-stated as the query's own
  send method (else Email) — the old method dropdown and the never-persisted "Note to yourself"
  textarea are RETIRED from this sheet (the note field wrote nowhere — a dead control; reported).
- Copy per the ref, UK spelling. Tests +6 (assumedSendItem ×4, byte-identity, extras list).
