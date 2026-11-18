# Query card v158 — report

## 1. False premises, first

1. **The QC158-2 mutation does nothing.** Removing the body's `min-height: 0` cannot make it grow: a flex item that
   scrolls (`overflow: auto`) already resolves `min-height: auto` to 0, by the CSS spec. QC158-2 was proved red with
   `overflow: visible` on the body instead, which does let it grow.
2. **The Responses page is not a host of this card.** It opens the query drawer (`openQueryDrawer` / `openResponse`),
   not the slide-out card. The Dashboard, Contacts, Letters, Versions, Analytics and the agent card all open the one
   Query Centre panel (`openQueryPanel`), so they are the same host.
3. **The To-do desk's preview sized its own frame to its content.** Its `height: auto` and `flex: 0 1 auto` meant the
   card shrank there even after Phase 1. Phase 6 makes the query preview take the rail's full height (WsPreview's
   `height`, todoWs.css `flex: 1 1 auto`). The agent card's preview is unchanged.
4. **The fixture held no notes, no recorded quotes, and no pending request with its items recorded.** The Notes locks
   seed their own notes and quotes and remove them in the same run (`tests/e2e/seedQc158.mjs`). A pending request
   with nothing recorded now shows one "Nothing recorded … not sent yet" row.
5. **"Never they" clashes with a shared value.** The shared method words (`lib/agentPanel` `methodAnswer`) say
   "Through their submission form". The Takes queries box says "By online form" instead; the shared words are
   unchanged elsewhere.
6. **"Six or more events" is six thread steps here.** `seed-query-10` (the baseline's "many") has 8 activity docs but
   5 thread steps. QC158-2 uses the longest thread on the grid, `seed-query-12`, with 6.

## 2. Branch, base, dev

- Branch `query-card-v158`, cut from `stage-colours-v1` @ aa52ea006: Stage colours v1, which dev served as
  `index-Pg_4FKOG.js`.
- Dev: https://scriptally-dev.web.app. The bundle is named in the deploy commit at the end of this session.
- Baseline gates (18 Nov, aa52ea006): the same two `firestoreTarget.test.ts` failures as before Stage colours v1,
  still failing.

## 3. Step 0.3, one line each

- **The shrink rule:** `qcv152card.css:255` `.spanel.qsp.qsp:not([data-step]):has(> .spanel-own > [data-qc152]) { height: auto; max-height: var(--qc152-h); }`, as the prompt said.
- **Day pill and status line:** both are drawn in `QcCard152.tsx`'s tracking pane.
  - The day pill: `qc152-dp` from `dayPill` in `lib/qcThread152`.
  - The status line: `qc153-sl`, the `statusLine` const, drawn only in the agent and nudge states.
- **`waitWords` and the thread's wait:**
  - `waitWords` is `lib/qc1522.ts:75`.
  - The thread's `{t:"wait"}` items come from `buildThread`.
  - They were already drawn as `qc1522-lt` at the side, and "Same day" was already never drawn (v53).
- **Agent pane values:** all come from `lib/qcCardView` `buildCardView` (v152):

  | Value | Source |
  |---|---|
  | weeks | `Agent.responseTimeWeeks` |
  | "no reply means no" | `q.nrmnOverride`, else `Agent.noResponseMeansNo` |
  | asks | `Agent.materialsWanted` against the sent materials (`askChips`) |
  | how to submit | `submissionWords` (`Agent.submissionMethod`) |
  | wishlist | `Agent.mswlNotes` |
  | email, website | `Agent.email`, `Agent.website` |
  | queried date and method | `row.sentMs`, `methodQualifier(q.sendMethod)` |
  | last heard | the latest dated agent-side step |

- **`materialsTab`:** returned `{blocks: {key, activityId, status, title, date, chips, request, note, pkg}[], summary}`.
  An unanswered request was `request: true`. It is replaced by `materialGroups`.
- **Notes:** `addJournalEntry(queryId, text)` writes `users/{uid}/journalEntries/j-…` with
  `{id, userId, queryId, entryText, createdAt (ISO)}`. `queryId` ties a note to its query. `pinned` already existed
  (`pinJournalEntry`; the rules allow it).
- **Quotes:** each response activity's `replyNote` (`users/{uid}/queries/{id}/activity/{a}`), read per event into the
  thread's `quote`, with the query-level legacy text on the latest step of its status.
- **Tasks:** `addUserTask({text, queryId, agentId, manuscriptId, dueDate})`, as the Query Centre's "remind me later"
  uses it.
- **Corkboard:** an undated `UserTask` is a Corkboard note (the Corkboard's `pinNote` uses `addUserTask` with no date).
  Nothing sent a note to the Corkboard from the card before.

## 4. Hosts (Step 0.4)

| Host | Component | Changed |
|---|---|---|
| Query Centre panel (and every page that opens it: Dashboard, To-do, Contacts, Letters, Versions, Analytics, the agent card) | `QcQueryCard149` → `QcCard152` | yes, all of it |
| To-do desk preview (`WsPreview` `ScaledCard`), and the phone's task screen that reuses it | the same components, read-only | yes: the fixed height (the preview now fills the rail), the new Tracking, Agent and Materials, the Notes list. No actions or add links: it is a picture of the card |
| Responses | its own query drawer | no: it does not draw this card |
| The phone query page (`QueryPageV4`) | its own | no (do not touch) |

QC158-14 measures the To-do desk: two tasks' cards are one height (990 / 990), the body fills, there is no day pill
or status line, and no "Same day".

## 5. Pinning

Built. `pinned` was already an optional boolean on a journal note, and the rules already accepted it, so nothing new
was stored and no migration was needed. Pinning a note unpins any other on the same query.

## 6. Locks

Each lock was red on the base where the base differed, red again under its mutation, and green after. The source
halves are Vitest (`qcv158.test.ts`, `qcAgent158.test.tsx`, `qcMaterials158.test.tsx`, `qcNotes158.test.tsx`,
`lib/qcThread152.test.ts`). Each was proved red by its mutation individually.

The measured halves are `tests/e2e/qc158.measure.ts` at 1512 × 982 and 1280 × 800. One mutation build carried every
mutation at once. QC158-3 and -13 were proved in a second build of their own, because the QC158-1 mutation
(`height: auto`) masks QC158-13.

| Lock | Mutation (red) | After |
|---|---|---|
| QC158-1 one height | restore `height: auto` | ✓ |
| QC158-2 body scrolls | `overflow: visible` (see 1.1) | ✓ |
| QC158-3 no pills, no line | draw the status line when waiting | ✓ |
| QC158-4 waits | draw it on the other side | ✓ |
| QC158-5 fact boxes | `justify-content: flex-start` | ✓ |
| QC158-6 asks | tick every row | ✓ |
| QC158-7 contact row | allow the row to wrap | ✓ (read at the prompt's 504px card width, with a long address) |
| QC158-8 groups | the partial's items in the query's group | ✓ |
| QC158-9 not sent yet | drop the pending group | ✓ |
| QC158-10 notes list | leave the quotes out | ✓ |
| QC158-11 writing box | let the box scroll with the list | ✓ |
| QC158-12 note actions | delete the note after sending | ✓ |
| QC158-13 empty | top-align it | ✓ |
| QC158-14 hosts | scope the fixed height to the Query Centre (the To-do preview hugs again) | ✓ |
| QC158-15 nothing else moved | add 4px to the tab bar | ✓ |

How some locks are read:
- **The card leans**, so boxes are read by layout offsets, not bounding rectangles.
- **The grid** is compared by decoded pixels against Stage colours v1's after shot, and 0 pixels differ.
- **Pinning in QC158-12** is pressed from the keyboard. A synthetic pointer click on the pin link near the sticky
  writing box was not delivered in the harness, while a DOM click and the keyboard both work. Worth a hand check
  (§9.4).

Readings are in `ledger/` (`before-*`, `mutant-*`, `after-*`).

## 7. Gates

| Gate | Baseline (aa52ea006) | Final |
|---|---|---|
| `tsc --noEmit` | 0 | 0 |
| Vitest | 12823 passed, 2 failed (firestoreTarget), 4 skipped | 12850 passed, the same 2 failed (the same flagged files), 4 skipped |
| `vite build` | clean | clean |

## 8. Screenshots

`design-refs/query-card-v158/screens/`, `before-*` and `after-*`. There are three fixtures (`one`, `pending`,
`many`), four tabs each, at 1512 and 1280, plus the grid.

## 9. For the writer's ruling

1. **Make it a task's date.** It is dated today, so the task lands on today's list. (a) Keep today. (b) Ask for a date
   in the toast. (c) A fixed offset, like "remind me later" uses (two weeks).
2. **The toasts' words:** "Pinned to the top" / "Unpinned", "On your to-do list for today", "Pinned to your
   Corkboard". The Corkboard's own toast is a bare "Pinned". (a) Keep. (b) Use the Corkboard's "Pinned".
3. **A pending request with nothing recorded** shows "Nothing recorded … not sent yet". (a) Keep. (b) Name the
   request instead ("The partial"). (c) Hide the row and keep only the outlined heading.
4. **The pin link near the writing box** (§6, QC158-12): please try it by hand on dev, with the mouse, on a note just
   above the writing box. If it misbehaves, the fix is to keep the actions clear of the sticky box.
5. **The R&R phrase** in the agent's words is "when asking for a revision"; the prompt named only partial, full,
   passing and offer. (a) Keep. (b) "with the revise and resubmit".
