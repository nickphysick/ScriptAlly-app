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

## PHASE 3 — the interim offer journey

**The offender is dead:** `RecordResponseFocusForm` is no longer mounted by the flow
(source-locked); completing the offer task never re-logs the offer.

- **Vocabulary (Option A):** `ActivityType.OFFER_ACCEPTED` / `OFFER_DECLINED` (types.ts) + the two
  literals in the firestore.rules activityType list — **the rules edit is IN FILE ONLY; the
  compile + deploy is Nick's** (until it lands, decision writes are denied by the global-feed rule
  — the authoritative nested row passes today's free-string rule, but do not exercise on dev
  before deploying rules).
- **The mechanism call (delegated):** DECLINED = **mechanism (ii)** — the decision activity
  CARRIES `resultingStatus: WITHDRAWN` on both twins and `recordOfferDecision` then recomputes:
  ONE honest timeline node, and recomputeQuery remains the single writer of derived state (no
  second STATUS_CHANGED activity, no parallel status write). Verified against recompute's
  normalisation ("either field counts"). ACCEPTED is non-status — the query keeps its
  historically-true OFFER status; the parked full flow owns any closing ceremony.
- **`recordOfferDecision(queryId, decision)`** (db.tsx) — logNudge's twin-write convention:
  authoritative nested row first (abort on fail), projection twin under the SAME id, then
  `recompute(queryId)`. Pure builder `lib/offerDecision.ts` (`buildOfferDecisionWrites`,
  `hasOfferDecision`), fully unit-locked.
- **APPROVED ENGINE DIFF 1 (verbatim):**
  `- if (q.status === QueryStatus.OFFER) {`
  `+ if (q.status === QueryStatus.OFFER && !hasOfferDecision(q.id, activities)) {`
  plus its dependency:
  `- }, [queries, manuscripts, agents, taskFlags, currentUser]);`
  `+ }, [queries, manuscripts, agents, taskFlags, activities, currentUser]);`
  (accepted keeps status OFFER, so status alone could never clear the task; declined's task also
  dies naturally via the derived WITHDRAWN. One clause in the engine keeps the board AND the
  dashboard's Over-to-you agreeing.)
- **The journey (ref §1):** kicker `{AGENT} · {AGENCY} · AN OFFER OF REPRESENTATION` → the star
  moment, "This is the moment the querying was for", the reply-by pill (`⏱ REPLY BY {date} ·
  {n} DAYS` from `q.responseDeadline` — the SAME field the dashboard's deadline chip reads,
  verified; hidden when unset) → three doors:
  1. **Let your other agents know** — the manuscript's other open queries (terminal statuses
     excluded); each opens the EXISTING nudge draft mechanics for that agent with the offer +
     reply-by context chip alongside; "Stage it" stages the normal nudge payload (dedup by key,
     `offer-notify-{queryId}`) and lands back on the fork; already-staged rows show "✓ staged".
     The door writes nothing itself.
  2. **Record your decision** (sage — THE completion) — accepted/declined seg per the ref with
     both hint paragraphs verbatim (declined: "Your other queries stay open and untouched.";
     accepted: the no-automatic-closing hint) → `recordOfferDecision` → toast → advance.
  3. **I need time** — a date-picked reminder defaulting to +7 days, input-capped AND code-clamped
     at reply-by (no cap when unset — it simply lapses), written as the EXISTING taskFlags snooze
     (`snoozedUntil` at the chosen day's local noon via `journeyEventISO`); no new state invented.
     ⚠ Until Phase 4's engine exemption lands (next commit), a set reminder HIDES the card — the
     visible-but-quiet behaviour completes there.
- Tests +8: builder invariants (accepted non-status both twins · declined WITHDRAWN both twins ·
  neither ever emits OFFER/STATUS_CHANGED · agent-less grace), hasOfferDecision, and the source
  locks (re-log path gone; need-time = the flag; notify = the nudge payload).

## PHASE 4 — offer card board behaviour

- **APPROVED ENGINE DIFF 2 (verbatim):**
  `- if (flag && isFlagSuppressing(flag, nowMs)) return false;`
  `+ if (flag && isFlagSuppressing(flag, nowMs) && t.taskType !== "offer_received") return false;`
  Offers are exempt from snooze-HIDING: the "I need time" flag survives to the board (and the
  dashboard's Over-to-you keeps seeing the task — the two surfaces stay in agreement).
- **Quiet/wake derived, nothing stored:** `offerQuiet(snoozedUntil, replyByMs, now)` in
  `todoBoard.ts` — quiet while the reminder is future, woken the moment it passes OR the instant
  reply-by arrives first. The card renders `.tdb-tile.quiet` (opacity .62 — the board's muted
  grammar; hover restores) and NEVER leaves Urgent; rank and `warn` unchanged while quiet.
- **The deadline pill counts down throughout:** `offerDue(replyByMs, now)` → `OFFER · {n} DAY(S)
  TO REPLY` from `q.responseDeadline` (the dashboard's own field), `OFFER · REPLY-BY PASSED`
  beyond it, and the plain `OFFER` chip when unset — no invented default, exactly as ruled.
- **The exemption stands, verified:** offers get NO quick rail (`{!isOffer && rail(...)}` —
  pre-existing, confirmed), no Dismiss anywhere, and sweep-D on an offer falls through
  `getPrimaryAction`'s `kind !== "mark-sent"` guard — it advances without writing. The only
  completion is a recorded decision through the journey.
- Tests +4: `offerDue` (countdown/singular/passed/unset) · `offerQuiet` (before/after reminder ·
  reply-by-first wake · no-flag) · the assembled-card integration (quiet + countdown + warn held,
  woken at +6 days).

## FINALISE

| Phase | SHA | Commit |
|---|---|---|
| 1 | `2e4bee9` | fix(todo): journey timestamp rule — noon-local backdates, nudge event date |
| 2 | `23de91c` | feat(todo): one-tap send confirm |
| 3 | `25b3a86` | feat(todo): interim offer journey — decisions, not re-logs |
| 4 | (this commit) | feat(todo): offer card quiet/wake + reply-by countdown |

- **Files:** `FocusFlow.tsx` · `todoWalk.ts` · `logNudge.ts` · NEW `offerDecision.ts` ·
  `todoBoard.ts` (P4 scope grant) · `db.tsx` (recordOfferDecision + the two approved clauses) ·
  `types.ts` (two enum members) · `firestore.rules` (two literals — **IN FILE; the compile +
  deploy is Nick's**) · `ToDoPage.tsx` (one caller + one class) · `todo.css` · tests (+24 total:
  1080 → **1104**). Out-of-scope untouched: recomputeQuery internals, nudgeDraft, StatusDot/
  MountPanel, the full Offer Decision Flow (parked), board chrome.
- **Invariant outcome:** the ONLY violator (the offer journey's re-log) is corrected; every other
  journey passed the audit unchanged. The nudge's lying date picker was the bonus correction.
- **In-browser checklist (Nick, on dev — REMEMBER: rules must deploy WITH hosting or decision
  writes are denied):** a fresh offer end-to-end (celebration → notify an agent → the staged
  nudge at review → need time → the quiet card at .62 with the countdown still live → wake →
  record the decision; accepted leaves other queries visible on the hub, declined closes ITS query
  as Withdrawn via recompute) · a full send at literally one tap · a back-dated send showing NOON
  on the timeline (not 01:00) · a back-dated nudge showing the picked day · timeline times now
  clock-true.
- **Deviations:** the decide/need-time primaries live in the flow's footer (component grammar;
  the ref draws them there too) · sweep-D-on-offer advances rather than erroring (the pre-existing
  guard, kept) · the P3 need-time → P4 exemption ordering left a one-commit hide-not-quiet window
  (both now landed).
