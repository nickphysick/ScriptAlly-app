# Query Centre v152.2 — §0 recon (before any edit)

Worktree `/Users/nickphysick/ScriptAlly-qc1522`, branch `query-centre-v152-2`, cut from `query-centre-v152-1` @ 2cab22c91 (as pushed).
Dev serves `index-D5NkQkKm.js` from local `dev/…-qc1521-sr1-qc1522-td51` (c9db94d56). That branch holds every v152.1 commit except the report (2cab22c91). It also adds the sidebar rail and To-do v51. So the base is v152.1 as pushed, and the deploy will stack on the `…-td51` line.

The design refs are committed (deabd7665). All 95 hashes match the prompt, and the refs are on the ref watchlist.

**Baseline gates:**
- tsc: exit 0.
- `vite build`: exit 0, with no error or warning lines.
- Vitest: 750/751 files and 11,348 tests pass. 2 fail, both in `src/test/firestoreTarget.test.ts` (the live-guard census). They fail before any edit.

## False premises

1. **"Action is today's court grouping, whose 'With the agent' group header…"**
   - There is no `court` grouping key. The keys are `attention | status | action | package | none` (`lib/qcCalView.ts:70-77`).
   - The six groups the brief calls *Action* (Offers, Materials requested, Nudge due, With the agent, Gone quiet, Closed) are today's **"Who it's with"**, stored as `attention` (`lib/queryState.ts:35-38`).
   - Today's **"Next action"** is the key `action`.
   - So the new *Action* option is the `attention` key relabelled. The option being removed is the key `action` (plus `none`). Both names say "action", so I'll take care not to mix them up.
2. **"Remove 'Next action' and 'No grouping'" is not just a menu change.** `none` and `action` are read elsewhere:
   - the CSV export order: `qcListOrder`, Queries.tsx:3954, which still uses the old `listGroups` and `URGENCY_GROUPS`;
   - `groupPhrase` / `bandToneOf`;
   - older list components (`QcList138`, `QcList132`, `QcWorkspace`, `QcSentence`);
   - the saved view memory (`lib/qcViewMemory.ts:39-61`).
3. **The "queries need you" banner has no chips.** It is the "This week" summary card (`lib/qc1511.ts:141-178`, rendered `QcPage151.tsx:90-107`). Its heading is "N queries need you this week", and it has **pills**.
4. **Package grouping has no Free/Pro gate today.** All five options show on every plan. `PACKAGES_OPEN_TO_ALL` is `true`, so `packagesUnlocked` is true for Free users too. The brief's Pro gate is therefore new, and it needs a predicate (see Q3).
5. **"The 'no reply means no' rule… still applies at the query stage only."** It doesn't. `queryState` reads `nrmn` for **every** agent-court status: Queried, Partial sent, Full sent and Resubmitted (`lib/queryState.ts:90`).
6. **There is no eight-week rule today.** "Gone quiet" is a **user setting**:
   - `QUIET_WEEKS = [2,3,4,6,8]`, default **4**, stored at `todoPrefs.queries.quietWeeks`, with the gear pop-over in `QcQuietSetting.tsx`;
   - an undated stage goes quiet after 84 days.

   Today a quiet query always leads with **Close it**, on both the row (`lib/qc1512.ts:170-185` `rowAct`) and the footer (`lib/qcThread152.ts:309-311` `replyBox`). The brief's split (Nudge under 8 weeks, Close it from 8) is new behaviour on top of the setting.
7. **The row and the footer do not share one function.**
   - The row uses `rowAct` (lib/qc1512.ts). The footer uses `replyBox` (lib/qcThread152.ts).
   - Both read the same stamped state. Their wording differs ("Send your partial" vs "Mark partial sent").
8. **The duplicate "PRIYA RAMAN" is not on the harness account.**
   - The emulator snapshot (`tests/emulator-seed/harness.json`, a copy of the live account from 2 Nov) has 53 agents. No name is in capitals and no agent has an empty agency.
   - There is one Priya Raman (`cv25-agent-03`, Raman & Rowe, seeded by `seedCompsV25.mjs`).
   - `reports/calendar-v64.md:122-127` says the capitals record "no longer exists on the harness account". The v149.1 case migration found "0 in capitals" (`reports/qc-v149-1/REPORT.md:155`).
   - The capitals, no-agency pair now exists **only in import fixtures** (`SmartImportReviewFixture.ts:66-67`, `v4-dupes.json`). Current code would prevent it: `nameCase` in `smartImportCommit.ts:174`, and the case-insensitive `sameAgent` in `importDuplicates.ts:19-34`.

   I can't fix a cause I can't find (see Q6).
9. **"Every place a wait can read '0 days'" includes no "0 days since your nudge" string.** That string does not exist. The real zero sites are listed in §0.9.
10. **v152.1's card journeys are not the drawer.** The record, fork, fix and details forms are card-local (`Queries.tsx:6118-6316`).
    - Offer, Reopen and R&R "sent" leave the card for the **drawer** (`stepRow`).
    - So do the list row's Nudge and Close it, which means they open different forms from the footer's.
    - §3.1's "every footer action opens the composer" therefore also moves Offer, Reopen and R&R off the drawer.
11. **Several fields the journeys write do not exist** (see §0.3): "open to more work", a Wall-of-no flag, an R&R resubmit-by date, a step-level agent deadline, and a pass kind on the card. The card currently writes every pass as `feedbackType: "Form"`.
12. **The undo is a bar, not a toast.** v152.1's card saves use the drawer's `UndoBar` (`drawerStore.showUndoBar`, 8s, one bar app-wide) with `restoreSnapshot`. The brief's ink pill inside the card, lasting 5.2s, is new.

## §0.2 The record form

All of these live in `src/components/queries/centre/`:

| Form | Component | Notes |
|---|---|---|
| "What needs changing?" | `QcFork152` (QcFix152.tsx:33-60) | Three buttons: Fix a mistake, Something changed since, Edit the query's details |
| "Something changed since" | `QcRecord152` with `initial={null}` (QcRecord152.tsx:73-224) | Title logic at :97. Options `OPTS` at :63-66. **No withdraw kind** (`RecordKind`, qc152Write.ts:87) |
| "Fix a mistake" | `QcFix152` (QcFix152.tsx:107+) | Whole-history form. Can add queried, preq, psent, freq, fsent, rr, offer, nudge, passed or noresp |
| "See what changes →" | the review stage | In record (:140-171, :220), fix (:143, :270) and details (QcFix152 ~:374), through `Stepper` |

Shared parts: `QcEdit152.tsx` (CalendarField, MatChips), `QcBubble152.tsx` (draft bubble), `lib/qcLogic152.ts` (knock, validate, dayBlocked), `lib/qc152Write.ts` (`planRecord` / `planFix` / `commitPlan`) and `qcv152edit.css`.

**Mounting:** only `Queries.tsx:6118-6316`, as `edit152`. The chain is `QcQueryCard149` → `QcCard152` `editBody`, which replaces the thread when `view !== "read"`. Mode state is `qcCardMode` (`record | fork | fix | details`).

**Callers:**
- **Card pencil:** QcCard152.tsx:284 → fork.
- **Bubble ✎ Edit and Materials ✎ Edit:** QcCard152.tsx:212 and :268 → fix, with focus set.
- **Details "fix the query sent":** → fix.
- **Footer buttons:** QcCard152.tsx:316-317 → `reply152` (Queries.tsx:6087-6094), which opens `QcRecord152` pre-chosen:
  - tell → told
  - sent → partial_sent or full_sent
  - nudge → nudge
  - close → noresp
  - anything else → resp
  - **Except:** offer, reopen, and sent while in R&R go to the drawer.
- **The header's "Who replied?":** Queries.tsx:6417-6424 → record "resp".

**Not these forms:**
- List row buttons and tray: `rowAct` → `stepRow` → drawer (Queries.tsx:8170-8190, 8482-8506).
- `QcList138 onAddDate` → the legacy v149 edit view.
- To-do and dashboard: `drawerDoorForTask`.
- The phone: drawer only.

An older, unrelated "Something changed since" also exists: the reading-pane `CorrectionFork` (`reading-pane/CorrectionSheet.tsx:55-100`) and a To-do menu id `rung-changed` (`lib/todoMenu.ts:49`).

## §0.3 Step data

The `Activity` TS type declares none of `materials`, `replyNote`, `toldCount` or `toldDeadline`; they are written as raw data on the nested log. The nested log has a `hasOnly` allowlist (`isValidActivityNested`, firestore.rules:608-662). Queries have no `hasOnly` on create, but they have an update allowlist (:1070-1098) and the ~24-field write ceiling (`refusedMarks`, qc152Write.ts:357-365).

| Item | Exists? | Where |
|---|---|---|
| Reply text `replyNote` | **Yes**, nested log only, ≤500 | `planRecord` qc152Write.ts:188, :218. Read via `quoteOf`, Queries.tsx:6035-6041 |
| Deadline the agent gave | **Query only** (`expectedSendDate` + `sendReminderDate`). No step field | The drawer writes it (sendBy.ts, respondSave.ts:78-79, :111). **The card collects none** and a card send clears both |
| Pass kind (form / personal) | `Query.rejectionFeedbackType` (form / standard / detailed) and activity `feedbackType` | The drawer maps personal → "detailed". **The card always writes "Form"** (qc152Write.ts:160) |
| "Open to more work" | **No** | The nearest is the agent's `requeryPreference` (yes / maybe / no), recordResponse.ts:402-409 |
| Wall of no flag | **No** | The wall is derived from every pass and no-reply close (`listNos`, RspNos.tsx) |
| Offer answer-by date | `Query.offerResponseDeadline` | The drawer writes it (respondSave.ts:87). **The card writes ""** |
| R&R resubmit-by date | **No dedicated field** | The drawer reuses `expectedSendDate` + `sendReminderDate`. The card writes neither |
| "Told other agents" step | **Yes**: `type "Told other agents"`, `eventKey offer_told`, `toldCount` 1–30, `toldDeadline` | qc152Write.ts:178-186. Siblings get `offerRefQueryId` / `offerTold` / `offerToldOn` / `offerReply` (:117-120) |
| "Withdrew" | Status `Withdrawn`, `closingReason "withdrew"`, `eventKey "withdrawn"` | Written by the drawer's close journey (closeRecord.ts:35). The fix form can edit it but not add it. **There is no card record kind for it** |

**Note:** a card save copies every key of `planResponse.details`, and undefined values become `deleteField()`. A card pass therefore clears an existing `offerResponseDeadline`, `rrNotes`, `expectedSendDate` and so on. This matches the single record path (`recordResponse.ts:339` does the same), so it isn't new. But it means any field the composer adds must be passed through, or it will be wiped.

## §0.4 Agent email

- The field is `Agent.email: string` (types.ts:739). It is required, and empty means unknown.
- On the harness snapshot, **25 of 53 agents have `email: ""`**, so 28 have one.
- No agent has `socials`.

## §0.5 The derivation

The stamp is `lib/queryState.ts`:
- `queryState` (L77-92) and `stampRows` (L129-139);
- `nudgeMsOf` (L68-75), which reads `lastNudgeSentDate` and falls back to `nudgeDate`;
- the window comes from `quietWeeksOf` (L45-51), read at Queries.tsx:2613 and stamped at :2629 (desktop only).

The rules, in order:
- After a nudge: quiet once `nudge + window` has passed.
- Undated stage: quiet after 84 days (`nudgeWindow.ts:25`).
- Reply date not yet passed: agent.
- Reply date passed and nrmn: quiet at once.
- Otherwise: quiet once `reply date + window` has passed, else nudge.

The old rule (`nudgePhase`, `CLOSE_OVER_DAYS = 28`) is still live for unstamped readers and the doors (`nudgeWindow.ts:31-37`, `qcSummary.ts:60-66`).

**Row CTA:**
- `rowAct` in `lib/qc1512.ts:170-185`.
- It uses `nextDoor` → `leadDoors` → `panelDoors` + `agentLead` (`lib/queryActions/entry.ts`).
- Drawn by `QcPage151.tsx:264`, :300-303. Clicks go through Queries.tsx:8170-8177 → `stepRow`.
- Birds-eye uses the same function (:8184).

**Card footer:**
- `replyBox` in `lib/qcThread152.ts:268-325`, with `leftWords` at :257-263.
- Data comes from Queries.tsx:6005-6083. It is drawn by `QcCard152.tsx:150`, :308-318, and clicks go to `reply152` (Queries.tsx:6087-6094).

The day counts also disagree. "N days quiet" in the list (`qc1512.ts:137-140`) counts from the reply date. The footer's "Quiet since" uses `replyMs`, which after a nudge is nudge + window.

## §0.6 Undo

There are two mechanisms:
- **ToastProvider:** `showToast({message, undo})`, ToastProvider.tsx:24-30, button `.sa-toast-undo`. In the Query Centre it is used with undo once (Queries.tsx:3410).
- **The drawer's `UndoBar`:** `drawerStore` `showUndoBar` (:276-306) and `UndoBar.tsx`, 8s, one app-wide, mounted at App.tsx:791. This is what v152.1's record, fix and details saves use.

Revert is by snapshot:
- `commitPlan` takes `takeSnapshot` (query + nested log + feed rows + taskFlags + tasks), then does one `writeBatch`.
- `restoreSnapshot` → `planRestore` deletes what was created and writes back what changed, queries last, with no recompute.
- The told save snapshots the sibling queries too.
- `deleteActivities` has its own restore closure, used only for timeline deletes.

## §0.7 The To-do list

- **Storage:** stored tasks are `users/{uid}/tasks/{id}` (`UserTask`), validated by `isValidUserTask` (firestore.rules:693-735, `hasOnly`).
- **Link to a query:** `queryId` / `agentId` / `manuscriptId` (types.ts:1212-1214).
  - On this base, the update allowlist (:1176) does not let `queryId` change after create.
  - To-do v51 (on dev, **not in this base**) adds `steps` and an editable `queryId` / `agentId`.
- **Counts:** there is no count field. A count could only go in the text, in v51's `steps`, or in the activity's `toldCount`.
- **Derived tasks:** board tasks are derived, never stored (`lib/db.tsx` ~:989-1060), with stances in `taskFlags`.
  - **`offer_tell` already exists, as one task per other agent:** "Tell {agent} about your offer" (db.tsx:1019-1029).
  - Each fires while the sibling has `offerRefQueryId` = the offer and `offerTold === false`, and clears itself once `offerTold` turns true.
  - Nothing combines them into "Tell 6 agents · answer by".
- **A stored alternative already exists:** `lib/offerNotify.ts` makes one stored `UserTask` per agent, "Tell {name} about the offer", used from the To-do pane.

**What the §6.1 task needs.** The cheapest honest route is a **derived** card, `offer_tell_all`:
- one per offer query;
- counting siblings with `offerTold === false`;
- dated by `offerResponseDeadline`;
- completing itself at 0, as `offer_tell` does today.

It needs no rules change and no stored task. It does need copy in `todoBoard`, `todoActions`, `todoCategory`, `dashList` and `todoCalendar`. It also needs a decision about the per-agent `offer_tell` cards, which would otherwise show alongside it (Q2).

## §0.8 The Group menu

- **Options:** `GROUP_BY_OPTIONS`, lib/qcCalView.ts:70-77.
- **Descriptions:** `GROUP_LINE`, QcToolbar140.tsx:67-73.
- **Menu:** `RadioMenu151`, QcToolbar140.tsx:132-169. It is used at `QcPage151.tsx:383-387` with the heading "Group the list by" and a hairline before "none".
- **Heading style:** `.qc140-mh` in mono 9.5px caps (qcv140.css:111). The brief's P1 fixes this.
- **State and memory:** Queries.tsx:2482-2483 and `lib/qcViewMemory.ts:39-61`.
- **The desktop sections** are built at Queries.tsx:8121-8128:
  - attention → `whoSections`
  - none → one section
  - action → `actionSections` (`qc1512.ts` `ACTION_1512` / `actionGroup`)
  - status and package → `listGroups`
- **Other readers of `action` / `none`:**
  - CSV export order (Queries.tsx:3954);
  - `groupPhrase` / `bandToneOf` (:4033-4046);
  - `QcList138` / `QcList` (:8390, :8492, :8512);
  - `QcToolbar140.tsx:209`, :261-264; `QcWorkspace.tsx:118`, :175; `QcSentence.tsx:161`, :189; `QcList138.tsx:561`, :727-734; `QcList132.tsx:179-183`;
  - `qcCalView.groupRows` (:344-389).
- **Birds-eye** has its own groupings (`BE_GROUPS`, qc150.ts:115-117).
- **Group headers:**
  - Rendered in `QcPage151.tsx:435-461`, one `<tbody>` per group plus a gap tbody.
  - Already sticky at `top: var(--pin-cover)` (qcv151.css:160-163), with colours from `headTone` / `headFill` (qc1512.ts:96-105).
  - The quiet header is a gradient with **white** labels (qcv151.css:166-167). L2 forbids those.
- **The hairline under "Showing N of N"** is `.qc1511-cl`, qcv151.css:124-127.

## §0.9 The data bugs

**Priya:** see false premise 8. The record is not on the harness account, so there is nothing to fix there. The pair exists only in import fixtures, and current import code merges or title-cases it.

Also on the harness, there are three same-name pairs with different agencies. These are correct under `sameAgent`, and I'm reporting them, not fixing them:
- Imogen Vale (Vale & Winter Literary / Vale & Wick);
- Marcus Reed (Bloomsbury Quill / Reed & Partners);
- **Tom Ellery** (Ellery & Finch, which holds the offer, / Curtis Vane).

**"0 days" sites:**

Card thread and footer (`lib/qcThread152.ts`):
- the wait between steps on the same date (:201-202);
- `waitTip`: "replied 0 days after" (:147-163);
- nudge state: "· 0 days ago" (:298);
- after a nudge: "0 days to go" (:304-305).

List Next column (`lib/qc1512.ts`):
- "0 days quiet" (:139);
- "0 days no reply" (:147);
- "0 days to reply" (:151);
- "0 days left" (:155).

Other places:
- Agent tab: "0 days ago", and also "1 days ago" (`QcCard152.tsx:232`);
- the record preview: "1 days later" / a null gap read as "Same day" (`QcRecord152.tsx:100`, :115);
- the fix view: "{n} days", which can be 0 or "1 days" (`QcFix152.tsx:255`);
- "Made N days after" (`QcFix152.tsx:309`, `QcEdit152.tsx:292`);
- "Day 0" (`qc1511.ts:80-81`);
- the phone-only `qcCardStory.ts:136-142`, which is out of scope.

## Housekeeping

There are 7 worktrees besides the primary. CLAUDE.md asks me to flag more than 5. Two are clean (`ScriptAlly-cl263`, `ScriptAlly-td511`), but both hold branches that other work depends on, so I haven't removed anything.
