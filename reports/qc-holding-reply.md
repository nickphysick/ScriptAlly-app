# Holding-reply pack — Step 0 recon, the decision block, and Parts B/C

**Run: 18 Aug 2026, overnight.** Step 0's inventory and the decision block are below; Nick's
answers (D1–D8) are recorded against them. **Part A remains STOPPED**: Phases 1–6 are gated on
the `writerExpectedDate` rules deploy, which has NOT landed on dev and is verified as absent by
a committed canary. F1 and F2 — the two live faults, which depend on neither the deploy nor the
decisions — are DONE. Parts B (§B1) and C (§C1) are built, verified and committed; §B2 was
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

## F1 and F2 — the two live faults (DONE, 18 Aug)

**F1 · `getTimelineFamily`'s silent default — FIXED.** The final `default: return "outgoing"`
was reached by anything unplaceable, and `outgoing` is a claim about direction. A seventh
family, `unknown`, plus a once-per-value `console.warn`; the Dashboard story feed cuts it
through a new named seam, `isFeedDrawable`, so its two reasons for cutting a row stay
separable. **The discriminator is the TYPE, not the description** — a legacy `Status Changed`
with uncategorised prose is a known type and keeps its neutral reading; only a type string
absent from `ActivityType` is unplaceable, and a row carrying a known `resultingStatus` is
still placed by that status whatever its type says. Two incidental findings: the module had
**no tests at all** (now `timelineEvent.test.ts`, verified red against the old default), and
`FAMILY_CARD_STYLE` is imported by `Dashboard.tsx` and **never indexed** — a dead import,
reported not touched.

⚠️ **F2's BRIEF POINTED AT A SURFACE THAT IS NOT RENDERED — correction, and it is mine.** The
brief said Fortnight's "Response expected" is "wrong on dev today". It is wrong in the code and
invisible in the app: `deriveFortnightEvents` has exactly two callers — **`DeskBelow`, which has
ZERO references anywhere**, and `DiaryCarousel`, mounted only by `DiaryLab`, which `App.tsx`
gates behind `hash === "#/diary-lab" && import.meta.env.DEV`. The dashboard renders no Fortnight
panel at all. I fixed it and traced upward afterwards, which is the wrong order and the repo's
own standing rule; the fix and its tests stand (they are the module's only coverage) but the
surface is a dev lab.

**The same fault IS live in one place, and that one is now fixed too:** `buildOverToYouRows`
(Dashboard → OneScreenDashboard → OneScreenTasks — traced to a rendered root and measured at
1440: 18 rows, 4 urgent). It read `responseDeadline` for every urgent row's deadline, so with
the field unseeded **every row arrived null** — and the sort is deadline-asc with nulls last, so
the documented ordering of the urgent list had collapsed to task order. Silent, because a list
in the wrong order looks exactly like a list in the right one. The `nudge_overdue` rows also
lost their `· N past window` clause. **Order changes; membership does not** — what is in the
list is still the task engine's answer, so no count anywhere moves. Four assertions, verified
red against the pre-fix read.

**A third reader was repointed and is ALSO dead:** `dashboardStats.agentStatusSummaries`'
`respondBy`, feeding the agents stat card's `· RESPOND BY 12 SEP`. `StatCardFull` is imported by
`Dashboard.tsx` and never rendered; its `statDefs` is computed at line 506 and never read. Left
correct rather than reverted, and labelled.

**F2 · Fortnight's "Response expected" — FIXED, and it was worse than stated.** The pack said
`addQuery` no longer seeds `responseDeadline`; it is also true that the provenance pack added a
migration that **deletes** every stored copy the agency's window can explain. So the panel had
already gone quiet on dev for existing queries, not just future ones. (No data was lost: the
`adopt` branch writes `writerExpectedDate` and the `deleteField` in the SAME `updateDoc`, so
where the rules deny it the whole update is denied atomically and the stored date survives. The
`drop` branch has landed, and those dates re-derive.)

The composition was inlined in `queryAmbientStatus`, which is *why* Fortnight read a stored
field — there was no resolver to call. **`resolveExpectedDate` now holds it once**: writer's own
date → agency's current window → nothing. `queryAmbientStatus` keeps the house 8/12/12 fallback
locally (it anchors a bar and belongs to nobody, which is precisely why the resolver will not
return it); Fortnight adds no fallback, so with nothing stated it draws no event rather than
inventing a date. `fortnightEvents` also had **no tests**; the new suite was verified red
against the pre-fix read.

⚠️ **D4's recency clause cannot be implemented, and it is a schema gap not a missing branch.**
"The most recent of { reply-stated, writer's date }" needs to know *when each was stated*. A
reply event carries its own date; **`writerExpectedDate` stores only the date expected, never
the moment it was set.** With one human statement recency is trivially that one — which is why
the resolver reads correctly today and is incomplete the moment a second arrives. Recording
when the writer's date was set is a Phase-1 schema question, and it needs answering before
Phase 2 can honour D4.

⚠️ **`responseDeadline` now has two homes for one fact — a decision, not a bug to absorb.** The
resolver deliberately does not read it (provenance §1). But two live controls still WRITE it:
`MarkSentPopover` (the opt-in reminder at mark-sent, which writes the identical value to
`nudgeDate`, so Fortnight still draws it as the follow-up reminder) and `EditQueryDrawer` /
`saveQueryEdits`. So the writer's expected date can land in either field depending on which
control they used. Either those two controls should write `writerExpectedDate`, or the field
split means something narrower than it appears. **Nick's call.**

**Everything else still reading `responseDeadline`** (requested inventory; none fixed):
`taskPrecedence.replyDeadlineMs` (prefers stored, falls back to `dateSent + weeks` — degrades
correctly, but note it does **not** read `writerExpectedDate`, so the writer's date does not
move the to-do task or the NO REPLY YET group) · `queryCentreGroups.inputFor` (passes it
through to the above) · `Queries.tsx` (the `due_soonest` sort, the CSV export column, a PDF
line, the date-edit draft) · `EditQueryDrawer` (reads and writes) · `MarkSentPopover` (writes)
· `todoBoard` / `todoLedger` / `todoHandoff` / `FocusFlow` / `ToDoPage` (the offer reply-by
countdown and the reminder rows) · `OverToYou` · `dashboardStats.agentStatusSummaries`
(`respondBy`) · `packageAnalytics` · `queriesFilterParam.isOverdueForReply` ·
`computeAgentDeadlineWrites` (recomputes existing stored copies only) ·
`activityUtils.replacePlaceholders`. **The one worth deciding soon is `taskPrecedence`**: the
tracker honours the writer's date and the task engine does not, so a writer who sets a date
still gets nudge/close suggestions timed off the agency's window. Untouched tonight because it
also drives Query Centre's NO REPLY YET group and the row figures, so changing its anchor moves
three surfaces at once — a decision, not a repair.

⚠️ **AND THE DEAD-SURFACE COUNT FROM TONIGHT'S TRACING IS ITS OWN FINDING**: `DeskBelow` (zero
references), `StatCardFull` + `useStatDefs`/`statDefs` (imported, computed, never rendered),
`DiaryCarousel`/`DiaryLab` (DEV-hash only), `FAMILY_CARD_STYLE` (imported by Dashboard, never
indexed), `Dashboard.tsx`'s `urgentRowCount` (computed at :1454, never read), and `.tpl-head`
(styled and locked, rendered by nothing). None deleted — a reachability sweep is its own pass,
and the repo's rule is to state which are dead before proposing a scope.

**Incidental, committed separately:** `tasksLayout.css` carried a comment whose opening
delimiter was missing, so `vite build` had been emitting a css-syntax-error warning on every
build and the browser was discarding a whole rule (verified in `dist/` before and after). It
cost nothing only because **nothing renders `.tpl-head`** — while `tasksViewport.test.tsx`
locks that rule's declarations by reading SOURCE, so those assertions passed throughout over a
rule that never applied. The dead class is left alone; that is a separate decision.

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

## Decisions — ANSWERED (18 Aug)

D1 **No** · D2 **leave the list alone** · D3 **on the reply event** · D4 **recency between the
two human statements, agency window as floor** (⚠️ blocked on the schema gap above — nothing
records when the writer's date was set) · D5 **no chapter** · D6 **clears the close suggestion,
never deletes a scheduled nudge; re-date it, or surface that it now falls inside their stated
timeframe** · D7 **do not split `hasAgentResponded` — derive "has been in touch" at
`EditQueryDrawer`'s guard from the activity log** · D8 **`HOLDING_REPLY = "Holding Reply"`,
label "They replied — no decision yet"**.

The original block, with the reasoning each answer was given against:

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
