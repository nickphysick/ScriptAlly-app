# Query Centre v152 — report

Branch `query-centre-v152`, in `../ScriptAlly-qc152`, cut from `efa73df9e` (`dev/qc1511-db2-title-sip-qc1512-cl26-sip11-tl1-pk41-cl262`, which dev served when the run began, carrying v151.2). Desktop only. Not merged to `main`.

## False premises

1. **"Each nudge adds 3 weeks."** No such rule existed. The state logic never read a nudge. v152 now reads `lastNudgeSentDate`, falling back to `nudgeDate` (your ruling).
2. **`nudgeDate` is a nudge that was sent.** It's the *planned* nudge: `logDefaults` writes one when the query is logged. So the fallback has two guards: a date still in the future isn't a nudge yet, and a nudge from before the latest send belongs to an earlier stage. On the harness account, 0 live queries have `lastNudgeSentDate` and 3 have only a planned, past `nudgeDate`. Those 3 now read as nudged.
3. **"No reply means no" decided the state.** The state logic didn't read it. It does now: Gone quiet on the reply date, never Nudge due.
4. **Partial and full have their own reply windows.** They read the agent's one `responseTimeWeeks`, while the partial's save wrote 8 weeks. Under your ruling, both read the house 12 and 12, in the save and the display.
5. **A step records its materials.** No step did. Only the query held "what went", and the old card copied the request's chips onto the send. Steps now carry `materials`. Older steps show none, except Query sent, which shows the query's own record.
6. **Saves are atomic.** Every existing writer ran several writes in a row (status, activity, recompute, feed). This page now has one batched writer (`lib/qc152Write`).
7. **There's a founding-writer flag to gate the Pro views.** There isn't one, and `PACKAGES_OPEN_TO_ALL` is true, so every account sees the Pro views. A dev-only switch (`window.__SA_QC152_FREE`) draws the Free card.
8. **A package holds a sample amount.** It holds a letter, a synopsis, a sample-pages version and a book version, and no amount. So picking a package fills the letter and synopsis and sets the sample's version; the amount stays the step's (your ruling).
9. **There's a settings surface for the quiet window.** There wasn't. It's a gear in the navy banner, stored at `todoPrefs.queries.quietWeeks`.
10. **The card needs building.** `QcQueryCard149` already existed, with a Notes tab. v152 is its desktop reading view; Notes stays.
11. **Screens 06 and 07 differ.** They're byte-identical in the pack (same SHA256). The replacement 07 you mentioned never arrived in Downloads, so both are checked against the refs as committed.
12. **The mock's "no reply means no" is data.** In `query-centre-v152.html` it's a hash of the agent's name (`NRMN`), so the mock's Gone quiet groups can't be reproduced exactly from real records.
13. **(Found while building.) A centred card clears the shell's bar.** It doesn't: centred, the band reaches the bar's row, and the bar sits at z 67 while a panel is open. The bar's "Log a query ⌄" was taking the pencil's press, so the card now sits at z 68.
14. **(Found while building.) The phone's Queries suite is a guard on this work.** `phoneAppV2Queries` PA2-3 is red on the v151.2 build itself: it waits for a chip selector the phone no longer draws. Phones are proved unchanged a different way (L14, below).

## 1 · The §0 answers (as reported before the go-ahead)

- **The card on dev:** `QcQueryCard149` (`components/queries/centre/`), inside `QueryPanelHost` / `SidePanel`. It opens from the list by `?q=` (a row click, `onOpenQuery`) and from Birds-eye through the same route, with ‹ › following Birds-eye's order when opened there. On a phone it's the same component with `layout="phone"`.
- **The derivation engine:** `whereItStands` and `buildQcRows`' `court` (lib/qcSummary), over `courtOf`, `expectedFor` and `pastExpected`. Readers: the desktop list (qc138/qc151/qc1511/qc1512 libs), Birds-eye (qc150), the phone (QueriesPhone, ResponsesPhone, phoneHome, DashPhone), the drawer (QueryDrawer), the Contact list (`isYourMoveRow`), and the dashboard and To-do (through `buildQcRows`' `court` and `pastExpected`). Analytics reads statuses, not these.
- **The writes:**
  - adding a step: `saveResponse` → `recordQueryResponse`, `saveSent` → `recordMaterialsSent`, `saveNudgeSent`, `saveClose`;
  - changing a step's type or date: `editActivity`;
  - removing a step: `deleteTimelineEntries`;
  - agent, method or package: `saveQueryEdits`.

  None was one atomic write except `saveQueryEdits`' batch. Undo was the drawer's snapshot (`takeSnapshot` / `restoreSnapshot`).
- **Materials:**
  - On a query: `materialsWanted` and the `sent*` record (a summary string, versions, package id and edition).
  - Letters and synopses: `ManuscriptVersion` documents.
  - Book versions: `Manuscript.bookVersions`.
  - Packages: the three slot ids and `bookVersionId`.
  - Steps carried nothing. Free accounts store the same shapes; nothing is gated.
- **Settings:** the user document's `todoPrefs`, written by dotted path (`updateUserPaths`).

## 2 · Commits

| Section | Commit |
|---|---|
| Refs | `19100ee70` — the 56 files, verified against SHA256SUMS |
| §1 Query states | `56d2c3d1b` |
| §2 The card as a chat thread | `1c5065b3a` |
| §3 Recording | `b46b72884` |
| §4 Editing | `757ccfe1c` |

## 3 · Locks, red then green

Each lock was proved red twice, at 1280 × 800 and 1512 × 900: on the v151.2 build (an emulator build of `efa73df9e`), and on its named mutation (a page break in `PAGE_MUT`, or a source break in `tests/e2e/qc152Mutate.sh`, restored from a path-named backup). Then it was green on this branch. The ledgers are in `reports/qc-v152/ledger/`: `base-*`, `mut-*`, and green.

| Lock | Mutation | On v151.2 (1280 / 1512) | Mutation (1280 / 1512) | Green |
|---|---|---|---|---|
| L1 states | ignore the nudge date | 5/20 · 5/20 | 20/22 · 20/22 | 28/28 · 28/28 |
| L2 colours | Gone quiet made stone | 3/9 · 3/9 | 8/9 · 8/9 | 9/9 · 9/9 |
| L3 filters | Gone quiet counted in Your move | 1/5 · 1/5 | 3/5 · 3/5 | 5/5 · 5/5 |
| L4 card frame | the card sized to its content | 0/15 · 0/15 | 9/15 · 9/15 | 15/15 · 15/15 |
| L5 lean | the lean kept while editing | 2/4 · 2/4 | 3/4 · 3/4 | 4/4 · 4/4 |
| L6 thread | every bubble on the left | 1/9 · 1/9 | 28/33 · 28/33 | 33/33 · 33/33 |
| L7 edit button | the hover bridge (and its 350ms) removed | red, timed out · red, timed out | 4/6 · 4/6 | 6/6 · 6/6 |
| L8 reply box | a write on press | 6/30 · 6/30 | 24/30 · 24/30 | 30/30 · 30/30 |
| L9 capture | the prefill from the generic default | red, timed out · red, timed out | 9/11 · 9/11 | 11/11 · 11/11 |
| L10 logic | check 3 dropped | 1/16 · 1/16 | 13/16 · 13/16 | 16/16 · 16/16 |
| L11 materials | the package link kept | red (timeout before the ledger) · red | 16/17 · 16/17 | 17/17 · 17/17 |
| L12 details | a duplicate agent allowed | 1/6 · 1/6 | 5/6 · 5/6 | 6/6 · 6/6 |
| L13 no browser controls | a native select | 2/5 · 2/5 | 4/5 · 4/5 | 5/5 · 5/5 |
| L14 no regression | n/a | — | — | see below |

**L14.**
- **QC151 and QC1512: every lock passes** at both widths. Four checks are re-pointed where v152 changes them; each is marked in its file:
  - QC151 L6: "Who it's with" is the six states;
  - QC1512 L3: the state colours, and "Close it" in the next-action order;
  - QC1512 L4: Your move also holds Nudge due, with its own light-blue tag;
  - QC1512 L7: the outlined button is Nudge on Nudge due and "Close it" on Gone quiet.
- **Birds-eye** (QC151 L14 alignment, 672/672; L15 dress) passes unchanged.
- **Phones:** `qc152Phone.measure.ts` reads the phone's Queries page and an open query's sheet (every text node and data attribute) at 390 and 360 on both builds; `qc152PhoneDiff.mjs` compares them. They differ in the chip counts: With you 18 → 20, With the agent 9 → 12, Gone quiet 23 → 18. **Built once with only the 12/12-week window reverted, the phone is byte-identical to v151.2**, so the whole difference is the window ruling, which you asked to apply to the display. See §7.

**Unit:** `queryState.test.ts` (12), `qcThread152.test.ts` (10), `qcLogic152.test.ts` (13: one per check, plus `knock`, `dependents` and the calendar).

**Gates at each commit:** tsc 0, the production build clean (no errors or warnings in its output), and Vitest no worse than baseline: the same 2 `firestoreTarget` failures as the base, 11,339 passing. Two existing laws caught real faults in my first drafts, and both are fixed rather than worked around:
- `recomputeQuery`'s single-writer lock: the derived fields' keys now live in `recomputeFields.recomputedPatch`;
- `packageLock`'s single stamp writer: the lock stamp now comes from `saveQueryEdits.packageLockStamp`.

## 4 · Screens beside the refs

`reports/qc-v152/screens/NN-name-1280.png` and `-1512.png`, one per ref 01–27. They're taken by `tests/e2e/qc152Shots.measure.ts`, which undoes its one save (screen 11).

## 5 · The dashboard's "needs you this week" (not changed)

The dashboard counts the old Your move (`court === "you"`) plus agent-court queries past their expected date. Under v152 it would count **Offers + Materials requested + Nudge due**. A query past its reply date by more than the quiet window (4 weeks by default) would leave the count as Gone quiet, and a "no reply means no" agent's query would leave it on the reply date. The 12/12-week windows already move some expected dates for every reader (§7).

## 6 · Readers still on the old rules

`whereItStands` / `buildQcRows`' `court`, unchanged, for:
- qc150 (Birds-eye's groups and stat cards) and its phone helpers;
- QueriesPhone, ResponsesPhone, phoneHome, DashPhone;
- QueryDrawer;
- the Contact list's `isYourMoveRow`;
- the dashboard and To-do (through `court` and `pastExpected`).

The desktop list, its quick filters and next-action groups, and the card read the stamp (`qs`), which is applied on the desktop only.

## 7 · The 12/12-week windows (your ruling), and what moved

`expectedFor` (every reader) and the save (`sentDefaults`, the sent journey's "usual") read 12 weeks for Partial sent, Full sent and Resubmitted; the query stage reads the agent's `responseTimeWeeks`. On the harness account (the emulator's copy of dev's harness account, 2 Nov), **12 of the 16 queries in a sent stage move**:

| Query | Stage | Agent | Their weeks | Was | Now |
|---|---|---|---|---|---|
| cv25-q-05 | Partial sent | Sophie Dunn | not stated | none | 26 Aug 2026 |
| cv25-q-10 | Full sent | Aisha Kapoor | not stated | none | 26 Aug 2026 |
| cv25-q-11 | Partial sent | Hester Quinn | not stated | none | 4 Oct 2026 |
| msv12-q-5 | Full sent | Sun-hee Park | not stated | none | 16 Oct 2026 |
| qc150l9-q | Full sent | Wren Calloway | 8 | 10 Dec 2026 | 7 Jan 2027 |
| seed-pkgq-10 | Partial sent | Peter Vance | 8 | 18 Sep 2026 | 16 Oct 2026 |
| seed-pkgq-4 | Partial sent | Priya Nair | 8 | 18 Oct 2026 | 15 Nov 2026 |
| seed-pkgq-9 | Full sent | Ana Duarte | 8 | 13 Sep 2026 | 11 Oct 2026 |
| seed-query-10 | Full sent | Peter Vance | 8 | 30 May 2026 | 27 Jun 2026 |
| seed-query-21 | Full sent | Ana Duarte | 8 | 15 Sep 2026 | 13 Oct 2026 |
| seed-query-23 | Partial sent | Rufus Oyelaran | 6 | 29 Sep 2026 | 10 Nov 2026 |
| seed-query-8 | Partial sent | David Marsh | 8 | 16 Oct 2026 | 13 Nov 2026 |

A writer's own expected date still outranks either. **This is the one change phones see** (their chip counts, above). If the brief's "phones unchanged" should win, the display half can be scoped to the desktop in one line.

## 8 · Rules

`isValidActivityNested` allows an optional `materials` list (at most 20) on a step; the feed twin already allowed it. **Dev: deployed 5 Nov, release `updateTime` 2026-11-05T01:10:57Z. Prod: not deployed (yours).** The prod diff is that one key plus the list check:

```
-          'reconstructed'
+          'reconstructed',
+          'materials'
 ...
-        && (!data.keys().hasAny(['eventKey']) || (data.eventKey is string && data.eventKey.size() <= 64));
+        && (!data.keys().hasAny(['eventKey']) || (data.eventKey is string && data.eventKey.size() <= 64))
+        && (!data.keys().hasAny(['materials']) || (data.materials is list && data.materials.size() <= 20));
```

## 9 · Dev

Deployed 5 Nov from `dev/qc1511-db2-title-sip-qc1512-cl26-sip11-tl1-pk41-cl262-db21-sip12-pk41w-qc152` (pushed): the branch dev was serving (`index-syympTiN.js`, confirmed by rebuilding it — the only difference was the build-date constant) with `query-centre-v152` merged in. The one conflict was the design-ref hash manifest (both sides added entries); `check-design-refs` passes against disk. On the merged tree: tsc clean, build clean, Vitest 11,376 passed, 2 failed (`firestoreTarget`, the same 28 older scripts as the baseline). **Dev serves `index-DK3Clp8X.js`.** Prod is untouched.

## 10 · Left undone, with the reason

- **An offer's answer, a revision's send and Reopen keep their journeys.** The §3 form has no step for an offer's answer (accept, decline, ask for time), a revision, or reopening. Reopen opens the late-reply journey, as before.
- **"About 9,800 words" in a chip's tip** is shown only where the record holds a word count (a full manuscript's version). An estimate from chapters or pages would be invented.
- **The screen 07 replacement:** it never arrived, so screen 07 is the bubble's hover pencil as built (see false premise 11).
- **`phoneAppV2Queries` PA2-3** stays red, as it was on v151.2 (false premise 14).
- **The mock's Free plan view** is drawn through the dev switch only; no real account is Free today.
