# Tracking pane — nudge grace-state + bar behaviour + connector (report)

**Status: COMPLETE.** All five phases landed, one commit each, individually revertible; gates green
per commit (tsc + build + Vitest **904** at close). Undeployed. Built on `claude-il`, ff-merged to
`main` after the no-overlap check; Nick's WIP (`index.css`, `themes.md`) untouched.

## Headline flags

### Grace vs overdue — the exact derivation (Phase 1, pure `deriveEscalation`)
For an **agent-waiting** query:
- **within** — inside the response window (`!ambient.overdue`). Calm, unchanged.
- **grace** — `overdue` AND a nudge fired **since expected lapsed** (`lastNudgeSentDate >= expMs`) AND
  that nudge's follow-up **reminder is still in the future** (`nudgeDate > now`).
- **overdue** — `overdue` AND (never nudged since it lapsed, OR the reminder has itself lapsed).
- **No-reminder edge:** a nudge with no future reminder grants **no grace** (no horizon to wait on) →
  stays overdue. A nudge fired *before* expected lapsed also doesn't grant grace (must be "since lapse").

**Where the reminder is read from:** `Query.nudgeDate` (the follow-up/check-back date the last nudge
set) + `Query.lastNudgeSentDate` (when it fired) — both persisted query fields, already on the pane.
The nudge **count** (for the re-escalation copy) comes from the log — `NUDGE_NESTED_TYPE` rows in the
per-query activity events the timeline already receives. **All derived; no `isGrace`/`isCalm` stored
flag; expected-by is derived (`sentMs + window`).**

### Nudge remains response-safe (Phase 1 lock)
`deriveEscalation` reads reminder/nudge fields **only** — it cannot and does not rewrite the ambient's
`overdue`/`daysOverdue` (the clock reads `dateSent` + window). Locked: with the exact overdue ambient,
deriving grace leaves `overdue === true`, `daysOverdue === 1` unchanged. Plus the standing recompute
lock (a nudge is a non-status event → `deriveQueryFields` identical with/without it; status,
response-count, `hasAgentResponded`, revisionRound, pipeline dates all untouched).

### "Edit reminder" — OMITTED (per Step 0)
No path edits/clears a live query's `nudgeDate` today (it's only set at query-creation in
`LogQueryFocusForm`), so the grace readout ships **without** an "Edit reminder" affordance. **Follow-up
noted:** a reminder-editor is future CRUD, out of this pass's scope. (Practically, "Nudge again"
re-dates the reminder through the existing nudge modal's check-back slider, so re-scheduling is
already possible; a dedicated edit/clear is the gap.)

### Timeline component sharing + downstream consumers
`QueryTimeline` (+ pure `buildTimelineRows`) is imported by **`Queries.tsx`** (the Tracking pane) and
**`App.tsx`** (a dev-lab route) — **not** the dashboard Timeline drawer or the agent query-history,
which use the separate `TimelineDot`/`renderTimelineDot` primitive. **So the connector + grace treatment
are contained to the Tracking pane; no drawer/agent-history bleed.** Nothing downstream inherits them —
nothing new for Nick to eyeball beyond the Tracking pane itself.

### Rules / indexes
**None.** No stored fields, no activity-shape change, no reads beyond existing query fields + the
already-listened activity subcollection. No composite index.

## Per-phase
- **P1 `809f8e3`** — `deriveEscalation` + `trackingBar` (derived geometry) + `nudgeCount`, pure in
  `queryAmbient`. Boundary + geometry + response-safety tests (+15).
- **P2 `40c1e42`** — Warm grace readout: `--grace-bg/-bd/-ink` tokens (in **f12.css**, not the WIP
  `index.css` — same precedent as `contentColumn.css`; fold in later). "Awaiting response · followed up
  {date}" + "FOLLOW-UP REMINDER SET FOR {reminderDate}"; the "N days past" line dropped in grace; quiet
  "Nudge again" link over the primary button. Design ref committed — **spec-derived (mockup not
  supplied), flagged in-file**.
- **P3 `aaef0fb`** — re-escalation badge: "Overdue · nudged {n}× · no reply" ("nudged once" for 1) when
  a lapsed reminder re-escalates; standard "N days past expected" when never nudged.
- **P4 `24120ab`** — bar geometry, no magic percentages: within ends at expected (**marker removed**);
  overdue spans sent→now (marker at `window/(window+daysPast)`, hatch beyond); grace spans sent→reminder
  (faded original-expected tick, `REMINDER {date}` caption, warm fill).
- **P5 `<this>`** — connector hairline drawn by the **container** behind the locked `StatusDot`, on
  event nodes only (not the readout/fork), 2+ events only (`!isLast` guard — no orphan line), colour =
  `--hairline` token, spacing = the `TL_EVENT_GAP` constant. Report committed here.

## Not verifiable in jsdom (Nick's in-browser pass)
Connector geometry + bar widths/markers + the warm-vs-loud visual balance. The tests assert the derived
**values/classes** (state transitions, marker/tick presence, nudge count, connector guards), not pixels.

## Git log (pass)
```
<P5>     feat(grace P5): timeline connector + spacing + report
24120ab  feat(grace P4): derived progress-bar geometry (no magic percentages)
aaef0fb  feat(grace P3): re-escalation copy — Overdue · nudged N× · no reply
40c1e42  feat(grace P2): Warm grace readout + tokens + design ref
809f8e3  feat(grace P1): derived escalation state machine + bar geometry
```
`git status` clean apart from Nick's own WIP (`design-refs/themes.md`, `src/index.css`).

## Backlog (noted, unbuilt)
- Reminder editing/clearing on a live query (the omitted "Edit reminder").
- Fold `--grace-*` from f12.css into the index.css `.t-f12` block once the theme-editor WIP lands.
- To eyeball on dev: nudge an overdue query with a future check-back → warm grace readout (no badge,
  "Nudge again", reminder-horizon bar); let the reminder lapse → re-escalates with "nudged N×"; connector
  hairline joins the send + nudge nodes.
