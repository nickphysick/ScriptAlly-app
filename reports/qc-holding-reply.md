# Holding-reply pack — Step 0 recon, the decision block, and Parts B/C

**Run: 18 Aug 2026, overnight. Part A is STOPPED at Step 0 twice over: the pack stops it for
the decision block, and the precondition check failed — the `writerExpectedDate` rules deploy
has NOT landed on dev.** Parts B (§B1) and C (§C1) are built, verified and committed; §B2 was
already built by the previous pack; §B3/§C2/§C3 are the write-ups at the foot of this file.

---

## ⚠️ The precondition: writer-date writes are still denied

`tests/e2e/writerDeploy.measure.ts` (committed — it is Phase 1's canary) commits a writer date
through the tracker's own control against deployed dev and watches whether it survives. It does
not: `Firestore error [update] users/…/queries/seed-query-19: Missing or insufficient
permissions.` The same run also caught `[ScriptAlly Backfill] Online heal failed for query:
seed-query-11` — a second denied write, so dev's rules lag HEAD's `firestore.rules` by at least
the `writerExpectedDate` allowlist (commit `6461c54`). Dev HOSTING does carry the provenance
build (`writerExpectedDate` is in the deployed bundle), so the app is currently writing a field
its rules reject.

**To deploy (Nick):** `firebase deploy --only firestore:rules --config firebase.dev.json
--project scriptally-dev` **and** `firebase deploy --only firestore:rules --project
scriptally-dev` (both configs — the dual-DB rule), verified by release `updateTime` via
`--debug`, never the success line. Prod rules ride Nick's normal prod flow. Re-run the canary
after: `npx playwright test --project=measure writerDeploy`.

---

## Step 0 — the inventory

### 0.1 Every consumer of the activity log, and what an unrecognised type does today

There are two stores: the AUTHORITATIVE per-query subcollection (`type` = a QueryStatus string,
or `"Nudge sent"`) and the global `activities` feed (`activityType` = the 12-value enum +
`resultingStatus`). Consumers and their blast radius:

| Consumer | Switches on | Unrecognised type today |
|---|---|---|
| `queryDerivation`/`recomputeQuery` | `resultingStatus` only | **Ignored** — structurally. A rung with no `resultingStatus` cannot move any derived field. |
| `buildTimelineRows` (QueryTimeline) | subcoll `type` ∈ QueryStatus enum, + `NUDGE_NESTED_TYPE` explicitly | **Dropped invisibly** — a holding reply would not render without an explicit row family (the nudge's pattern). |
| `chapterise` | `row.kind` + `isRequestStatus` | Non-status rows (`kind` set) never open a chapter — D5 is satisfied by construction. |
| `activityEventLabel` (dashboard story labels) | `activityType`, then `resultingStatus` | **null → row silently not rendered.** |
| `getTimelineFamily` (timelineEvent.ts) | type, then status, then desc fallback | **Miscounted** — falls through to the desc-key default `"outgoing"`: a holding reply would be drawn as an outgoing event on the Dashboard story card. |
| `getActivityKeyAndDefaults` (activityUtils) | desc substrings | Unknown desc → label "Status changed" — **mislabeled**. |
| `clearedToday` | `CLEARING_ACTIVITY_TYPES` set | Not counted as a clearing act (recording a holding reply would not register as "worked today" — Phase 5 decision). |
| `todoBoard` journey feed / `terseDoneLabel` | explicit type list | Ignored / description fallback. |
| `todoWalk`, `agentList` (buildAgentTimeline), `fortnightEvents` | explicit types | Ignored. |
| Analytics (`dashboardStats`, `packageMetrics/Analytics`) | `hasAgentResponded`, `resultingStatus` ∈ `AGENT_RESPONSE_STATUSES`, status | **Ignored** — all response figures are status/flag-gated. |
| `dataExport` | none (passthrough) | Exported verbatim — note + timeframe ride for free once they are fields. |
| CSV import (`ImportCsv`) | desc substrings → enum | Cannot produce the new type; a row mentioning it degrades to `STATUS_CHANGED` with no `resultingStatus` → inert. |
| `firestore.rules` `isValidActivity` | enumerated `activityType` list | **REJECTED** on the global feed until the rules deploy. The NESTED store's `isValidActivityNested` is generic (`type` string ≤128) — **no rules change needed for the authoritative store.** |
| `FocusFlow` (todo sheet timeline) | maps `NUDGE_SENT` → nested type, else `resultingStatus` | New type maps to `undefined` → filtered out → invisible. |

### 0.2 Derived fields — which would move, which must not

None move if the event carries no `resultingStatus` — the entire derivation is gated on it.
Must-not-move set (all automatically safe): `status`, `hasAgentResponded`,
`responseReceivedAt`, `revisionRound`, `rejectedDate`, `lastStatusChange`, the four pipeline
dates, `dateSent`. Phase 2's "make the exclusion explicit in recomputeQuery" is therefore a
stated invariant + lock, not new logic. The waiting re-base is a NEW derivation (most recent of
last outbound send vs last holding reply), not a change to any existing field.

### 0.3 `hasAgentResponded` — what it means, and the one reader that wants the other meaning

Written by `deriveResponseFlags` from `AGENT_HAS_RESPONDED_STATUSES` (Partial Requested onward
+ Rejected) — i.e. **"the pipeline moved": has decided.** Readers: `responsesReceivedCount`/
`responseRatePercent` (dashboard stat) — has-decided ✓; `packageMetrics.isResponse` (package
response rates, reply-time maths) — has-decided ✓; the delete-confirm wording (Queries.tsx) —
either reading is fine; **`EditQueryDrawer`'s reassignment guard — this one means "has been in
touch"**: it guards reassigning a query away from an agent who has engaged with it, and a
holding reply IS agent-specific history the guard should catch but will not. Named for the
decision block (D-extra below).

### 0.4 The window derivation after the provenance work

Resolution happens in `queryAmbientStatus` (queryAmbient.ts), reading accessors from
`lib/expectedDate.ts`: **writer's stored `writerExpectedDate` (wins outright) → agency's
current window (derived at read from `responseTimeWeeks`, `agentWindowMs`) → house 8/12/12
`STAGE_RESPONSE_WINDOWS` (bar-only; attribution silent) → nothing.** Attribution rides as
`windowSource: "writer" | "agent" | null`. D4 inserts reply-stated above `writer` — it fits as
a third accessor in `expectedDate.ts` (derived from the most recent holding-reply event's
timeframe, anchored at the reply date) and a fourth `windowSource` value; no second resolver
needed, but note `queryAmbientStatus` will need the query's events (or a pre-derived
reply-window input) — today it takes only the query + weeks.

### 0.5 The task engine

`replyTask` (taskPrecedence.ts, one decision, three answers) creates both the
`no_response_close` suggestion and the `nudge_overdue` task off `replyDeadlineMs` = stored
deadline else `dateSent + weeks`, with 14-day grace; `reminderScheduled` (a future userTask)
suppresses both. A holding reply today is invisible to it: **the close suggestion keeps firing
on a query whose agent replied yesterday** — exactly the fault D6 names. The tracker's own
closure offer (`closureOffer`, nudgeState.ts) is likewise blind: its policy route fires on
window-expired regardless of contact, and `nudgeOutcomeLabel` would keep saying "Nudged — no
reply" (it counts only `statusDirection === "in"` rows) — Phase 2's "counts as came back" needs
the new row family to register there. The scheduled nudge is the writer's own `userTask` +
`nudgeDate` resurface — untouched per D6.

### 0.6 The list's elapsed figure and sorts

Row date anchor = `lastSendMs` (newest of `dateSent`/`partialSentDate`/`fullSentDate` — the
last outbound send). The position figure (`rowFigure`) counts to/from `replyDeadlineMs`.
"Waiting longest" sorts on `waitAnchorMs` — the same three send fields. Groups
(`listGroupFor`): NO REPLY YET membership = `replyOverdue`, same deadline. So under D1/D2 the
row stays put and keeps reading from the send — but note: if D4 re-bases `replyDeadlineMs`
itself (reply-stated window), the NO REPLY YET group and the row figure re-base with it *for
free*, while the row's relative date (from `lastSendMs`) stays the long figure. That is the D2
split falling out of the existing seams.

### 0.7 Analytics

Figures counting agent responses: `responsesReceivedCount`/`responseRatePercent`/`outcomeGroups`/
`medianReplyDays` (dashboardStats) and `packageMetrics`' `isResponse`/`responseRate`/
`medianReplyDays`/reply-time first-move maths. **None is corrupted by a non-status holding
reply** — all read `hasAgentResponded`, `resultingStatus` rungs, or status. The only route to
corruption is answering D1 "yes" or stamping a `resultingStatus`; the recommendation avoids
both. One adjacent honesty note: Fortnight's "Response expected" still reads the stored
`responseDeadline`, which the provenance pack stopped seeding — it will quietly stop appearing
for new queries; pre-existing, reported, not this pack's fault to fix invisibly.

---

## Decisions for Nick — answer before Phase 1

- **D1 — answered?** Recommend **No** (stays unanswered, stays in No reply yet, stays on the
  "not" side). Nothing in the code resists this; it is the default the derivation gives.
- **D2 — list elapsed anchor.** Recommend **leave the list alone** (last outbound send; tracker
  re-bases, list does not). Note from 0.6: the *position* figure ("N days left/late") will
  re-base wherever D4 re-bases the deadline — only the relative *date* stays long. Confirm that
  split is the intent.
- **D3 — timeframe lives on the reply event.** Recommend **yes**; the nested store accepts new
  fields without a rules change, the global feed needs the allowlist either way.
- **D4 — precedence: reply-stated (most recent) → writer's date → agency's window → nothing.**
  Fits `expectedDate.ts` as a third accessor + a fourth `windowSource`; no second resolver.
  One question back: should a *writer's date set AFTER the reply* beat an older reply-stated
  window? Strict D4 says no (reply-stated always outranks); recommend **most recent of the two
  explicit statements wins**, else strictly D4 — say which.
- **D5 — no chapter.** Recommend **yes**; `chapterise` already guarantees it for `kind`-tagged
  rows.
- **D6 — clears the close suggestion, never deletes the scheduled nudge.** Recommend **yes**;
  mechanism is a new input to `replyTask` (and `closureOffer`) rather than call-site filters.
- **D-extra (from 0.3):** `EditQueryDrawer`'s reassignment guard reads `hasAgentResponded` but
  means "has been in touch". Should a holding reply trip the reassignment guard? Recommend
  **yes** (guard on engagement, not decision) — a one-line change once the event exists.
- **D-extra 2 (naming, Phase 1 wants it proposed now):** constant
  `ActivityType.HOLDING_REPLY = "Holding Reply"`, nested type `"Holding reply"`, display label
  **"They replied — no decision yet"** (the ref's row 1). Named for what it is — a reply that
  holds — not for what it isn't.

---

## Part B — the silence policy

**§B1 — BUILT (code + unit + measured on a local dev-mode build at 1440).** The flip editor's
NRN switch could set the policy but never un-set it. It is now a three-position segmented
control — "Means no · They reply · Not stated" under the label "If they don't reply" — matching
`AgentResponseGuidelines`' radio shape and `agentReplyPolicy`'s law (true/false/ABSENT). The
draft/diff layer supported the clear all along (`diffDraft` pushes the field into `deletes` →
`deleteField()`); only the control could not reach it. The switch's CSS and the strike-on-false
label grammar are retired with it (the strike existed to tell false from unset on a control
that drew both the same). Locked in `agentDraft.test.ts` §B1. Note: the agent-list spec's
"unstated is an origin, not a destination" line is amended by this — for this field only; stars
remain one-way (weeks could already clear via blank).

**§B2 — already built by the previous pack (nudgeState §1, commits `bd0cea5`/`6461c54` era).**
`silencePolicyLine` renders "«Agency» treat silence as a pass — their window expired «date»."
only on explicit `noResponseMeansNo === true` + expired window; `false` and absent render
NOTHING. The generic "Many agencies treat silence as a pass" is gone from live code — it
survives only in the retirement prose in `QueryTimeline.tsx` and `nudgeState.ts` and in the
lock that forbids it (`nudgeState.test.ts:327`). That was its one render site (the tracking
card); no other site existed.

**§B3 — wiring up `AgentResponseGuidelines` (report only, not mounted).** It edits both facts
(weeks with a Not-stated clear; the three-way policy radio) with undo, through
`agentReplyPolicy`. Mounting it needs: a host surface (its styling is `.agv2`-scoped — the
RETIRED two-pane page's stylesheet, still shipped), the `updateAgent`/`showToast` props, and an
`isPro` flag for its static Pro strip. What would then be duplicated: **both** facts — the flip
editor's "Typical response (weeks)" field and the new §B1 segment are the same two controls on
the same record, so mounting it wholesale gives every fact two homes (the fault the command-bar
"one home" rule exists for). The honest options are (a) leave it unmounted, or (b) mount it and
retire the flip editor's two rows — Nick's call.

## Part C — housekeeping

**§C1 — BUILT.** `CheckBackSlider`'s `sa-checkback` id is instance-unique via `useId`, the
exact `sa-wk` fix. One caller (`NudgeModal`). Locked beside the WeekSlider id lock in
`expectedDate.test.ts`.

**§C2 — `PackageWorkshop.tsx` (report only, untouched).** 910 lines; renders the full one-page
package workshop: materials palette (`tgt-palette`/`tgt-editmat`), package bench (`tgt-bench`),
analytics window (`tgt-analytics`), its own `<style>` block. **No render caller** — only its
`PackageSaveFields` TYPE is imported (by `SubmissionPackages.tsx` and `WorkshopTab.tsx`). The
live page renders `WorkshopTab` + `PackageTabs`, which carry their own `tgt-palette`/
`tgt-editmat`/`tgt-bench`/`tgt-analytics` — so every one of its four ids duplicates a live id,
latently: the duplicates would go live only if it were ever mounted beside them. Deleting it
means first moving `PackageSaveFields` out (a type extraction), then the file — a separate
decision.

**§C3 — CONFIRMED, nothing to do.** No slider tick marks exist anywhere in the codebase
(`.sa-tick` is a dropdown checkmark; `.snz-ticks` is the snooze dial); no WeekSlider caller
references ticks, and `expectedDate.test.ts` already asserts the old local tick scale
(`.tl-setwin-tk`) stayed dead.

---

## Gates

tsc clean · `vite build` clean · Vitest **5556 passed, 2 skipped (314 files)** after the B/C
changes. §B1 browser-verified against a local dev-mode build (three states reachable, segment
fits the card, screenshot `reports/qc/nrn-tri.png`). Not pushed; nothing deployed.
