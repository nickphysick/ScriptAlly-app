# Task Settings — what lands on your desk

Pack: `todo-task-settings`. Ref `design-refs/todo-task-settings.html` §2 (the reused multi-mockup
file the polish pack also drew on). Delivered as TWO commits (the pack sanctions merging 1+2; 3
separate). Gates per commit: tsc · build · full Vitest. No rules change (see storage) → rules
compile unaffected.

## STEP 0 — recon (tree clean at `da7de33`). No red gate fired.

- **gate a (storage) — CLEAR.** `User.mutedTaskRules: string[]` is allowlisted in both `isValidUser`
  (`is list`, size ≤ 64) and the user-update `affectedKeys` set, unconstrained on element values →
  type-level keys fit with NO new field and NO rules edit. A switch OFF = its key present; ON =
  absent.
- **gate b (one suppression point) — CLEAR.** The engine's `activeTasks` filter (db.tsx:806) →
  `setTasks(activeTasks)` is the ONE source: `board = assembleBoard({ tasks })` feeds the post-it
  counts + the Walk-me-through sublabel (`tiles.urgent = board.do.length`), and the dashboard reads
  the SAME array — `buildOverToYouRows(tasks, …)` (Dashboard.tsx:1480, OverToYou.tsx:416). The
  filter's predicate is `todoHousekeeping.taskSurvivesMute`, which already reads `mutedTaskRules`.
  Gate at that one predicate → board, counts, dashboard Over-to-you and the sublabel all agree by
  construction.
- **gate c (hidden-item enumeration) — CLEAR.** Rule-mutes = `mutedTaskRules` entries; permanent
  dismisses = taskFlags `snoozedUntil === MUTED_UNTIL`; live snoozes = a finite future
  `snoozedUntil`. Restore via existing primitives only (remove from `mutedTaskRules`; unset the
  flag's `snoozedUntil`).
- **gate d — CLEAR** (tree clean).

**Type inventory + deviations from the ref/pack:** the engine emits offer_received,
partial/full_requested, revise_resubmit, no_response_close, nudge_overdue, data_quality_poor
(+ querying_unstarted/dream_agent, board-excluded). The REF's sheet (normative for structure/rows/
copy) DIVERGES from the pack prose, and I followed the ref where it's explicit:
- **Requests & deadlines (the send family) = ALWAYS ON** in the ref (locked) — NOT the pack's "Your
  turn to send" toggle. Followed the ref (simpler; no `send` key needed). The ref's own reasoning:
  "urgency about your own deadlines shouldn't be silenceable."
- **Missing reply windows IS a toggle** in the ref (`dq_responseTime`) — the pack prose omitted it.
  Followed the ref.
- **RITUALS / The Sunday review** is NOT in the reused ref file, but the pack specifies it in detail
  across Phases 1/2/3 + tests → ADDED per the pack (card-only gate; the scrap is exempt).
- Copy: used the ref's lede + appended the pack's counts sentence; the hidden section uses the
  pack's Phase-3 copy ("HIDDEN RIGHT NOW", "Nothing set aside.", the closing line) over the ref's
  "HIDDEN AT THE MOMENT"/setfoot. The ref's setfoot excludes snoozes; the pack lists all three
  kinds → pack won (a listed snooze gains an early Restore).
- **The fork's "Task settings" link did NOT exist** (the baked decision assumed it did) → added.

**The shared-derivation map (what the dashboard reads):** `tasks` (the filtered engine array) →
`assembleBoard` → board lanes → `ribbonTiles` (post-it counts) + `tiles.urgent` (Urgent post-it +
Walk-me-through sublabel); AND `buildOverToYouRows(tasks)` → the dashboard attention chip + To-do
card. One array, one filter, one truth.

**The MUTED strip reconciliation:** the housekeeping/stale switches write the SAME `mutedTaskRules`
keys the ⏸-fork's "Never → all of them" writes (`dq_*`, `no_response_close`). So the "Missing wish
lists" switch OFF, the lane's "MUTED: WISH LISTS" strip, and (Phase 3) the HIDDEN RIGHT NOW row are
three windows on ONE state — consistent by construction; restoring from any flips all. The
settings-only keys (`nudge_overdue`, `sunday_review`) have no fork/strip path and are managed by
their switch alone (excluded from the hidden list).

## PHASES 1 + 2 (merged) — the sheet, entry, gating, counts

- **Storage/pure layer** `src/lib/taskSettings.ts`: `TASK_SETTING_ROWS` (ref rows + the RITUALS
  row), `typeIsOn` / `setTypeMute` (the switch ↔ `mutedTaskRules` mapping). Offers + Requests are
  locked (no key — no stored-but-ignored flag).
- **The sheet** `TaskSettingsSheet.tsx`: the journey PRESENTATION reused (scrim, `lockStageScroll`,
  Tab trap, focus return, Esc, "✕ Back to my desk") — NOT a FocusFlow journey (no items, no staged
  model). Switches apply IMMEDIATELY (`updateUserProfile`); the board re-derives live behind the
  dimmed scrim. Rows/switch grammar per the ref (sage on-state, `role="switch"` + `aria-checked`,
  labelled by the title, keyboard-operable). Scrim-click closes (no staged work to guard — reported).
- **Entry:** a 40px sliders button, `aria-label` "Task settings", STACKED above the AppShell help
  "?" (the Today FAB at right:70 blocks the horizontal slot — vertical corner cluster; reported).
  The ⏸-fork gained "Change what appears here → Task settings" opening the same sheet.
- **Gating (single point):** `taskSurvivesMute` gained one line — `nudge_overdue` off →
  suppressed. Housekeeping (`dq_*`) + stale (`no_response_close`) already gated via
  `visibleAgentNeeds`/`isRuleMuted` (the switches just write those existing keys). The Sunday CARD
  reads `sunday_review` in `reviewEntryCard` (via the new optional `BoardInput.mutedTaskRules`); the
  scrap ignores it. Counts exclude hidden types by construction (they derive from the filtered
  `tasks`).
- **Offers ungateable:** no key exists in the row set for offers/requests — not a stored-but-ignored
  flag.
- Tests: rows (locked vs keyed), `typeIsOn`/`setTypeMute` round-trip, `taskSurvivesMute` nudge gate
  (+ send-family never gated), the Sunday-card toggle + scrap exemption. (The pure `hiddenItems`
  layer + its tests also ride this commit, ready for Phase 3's UI.)

## PHASE 3 — hidden right now

- HIDDEN RIGHT NOW lists newest-first via `hiddenItems` (taskSettings.ts, pure): **rule-mutes**
  ("MUTED AS A RULE" — housekeeping/stale keys only; nudge/sunday are settings-only, excluded) ·
  **permanent dismisses** ("DISMISSED" — the fork's "Never just this", `snoozedUntil === MUTED_UNTIL`,
  subject from the query's agent) · **live snoozes** ("SNOOZED UNTIL {date}"). Scrolls past ~8 rows.
- **Restore** via existing primitives only: rule → remove from `mutedTaskRules`; flag →
  `upsertTaskFlag(key, { snoozedUntil: null })`. The item re-derives live behind the scrim.
- **Empty state** "Nothing set aside." — the section never disappears. Closing line per the pack.
- **Date deviation:** rule-mutes + permanent dismisses store NO timestamp (the ref's "hidden 16 Jul"
  is mockup fiction) — only live snoozes carry a date.
- **Silent-no-op caught:** the first Phase-3 re-add of the hidden UI matched nothing (Python
  `.replace` no-ops on miss) and would have shipped a hidden-less sheet — tsc/build/pure-Vitest were
  all green. The NEW `taskSettingsSheet.test.ts` source-render lock caught it (the render-crash
  lesson applied). Re-applied against exact anchors.

## FINALISE

- **Commits:** Phases 1+2 `ac66aa2`; Phase 3 = this commit.
- **Files (Phase 3):** `TaskSettingsSheet.tsx` (hidden UI + restore) · NEW
  `taskSettingsSheet.test.ts` (source locks). Vitest **1171** (+4 locks). No rules change.
- **In-browser checklist (Nick, dev):** wish-lists OFF → HOUSEKPG post-it + lane drop live, the
  MUTED strip and the switch in lockstep · nudge OFF → Urgent + Walk-me-through count drop · Sunday
  OFF with the scrap surviving · Offers ALWAYS ON · restore a rule-mute / a dismiss / a snooze from
  HIDDEN RIGHT NOW · the sliders button above the help "?" and the fork doorway.
