# Query Centre v152.1 — a quieter Queried, and the thread as a record of events

Branch `query-centre-v152-1`, cut from `query-centre-v152` at `fd81a2961` (dev's line at the time was that branch plus Smart Import v1.2.1, which touches no Query Centre file). Desktop only; phones untouched. **Not merged.** Dev: §DEV.

## False premises

1. **"Told other agents" half existed.** The offer journey already marks each *other* live query (`offerRefQueryId`, `offerTold`, `offerToldOn`, `offerReply`); nothing sat on the offering query, and no count or deadline was stored anywhere. Built as you ruled: the step is the record, and the step and the marks are one batch.
2. **R&R is a status but the card's record form cannot write it.** It is written by the old record-response path and the query drawer. The bubble and the footer show it; nothing new writes it (see "Left undone").
3. **The offer card's footer button opens the offer journey**, not the record form, so "Tell other agents" is the second footer action you asked for (and "What you did" in the record form).
4. **The withdraw reason is stored as "An offer elsewhere" / "Revising the book" / "Something else"**, not "signed elsewhere". The bubble and footer show the stored phrase, lower-cased: "an offer elsewhere".
5. **Birds-eye's paler Queried was `#eee5d7`**, a second value to change (now `#f7f2ea`).
6. **v152 put an undated step at the END of the thread**, as though it were the latest event; the ref keeps it in place with "—" either side. An imported undated step carries no ordering key at all, so its place now comes from its stage: before the first dated step further along the pipeline (`orderSteps`).
7. **`dayIso` stores a day as a noon timestamp** (`2026-11-08T12:00:00.000Z`), not `YYYY-MM-DD`. `toldDeadline` is stored the same way, like `offerToldOn`.
8. **One batch over every sibling fails whole if one sibling refuses an update.** On the harness account `seed-pkgq-4` (written by `seedPackages.mjs` outside the rules) refuses *any* update, so a told save on its manuscript fails with "Couldn't save that. Nothing was changed." The offer journey would also fail at that document (it writes one query at a time). L10 therefore runs on the second manuscript, whose siblings all take the marks. **This is a real hazard for any account with an older document the current rules refuse**; your ruling kept as built, flagged for a decision.
9. **v152 never drew a step's own recorded materials.** The thread read a `label` on each recorded material, but the v152 writer stores `{ kind, name, unit, n, versionId }`, so every step's chips came out empty and Query sent fell back to the query's record. The thread now reads them with the writer's own `storedLabels` (QC1521 L2 holds it: the full request shows "Full manuscript" and "Synopsis"; empty on the v152 build).
10. **The phone check never opened a query.** `qc152Phone` clicked a row id the phone's cards don't carry, so its "sheet" reading was the list again, for v152 and here. It now opens the card by the agent's name and refuses a reading equal to the list's.

## 1 · The §0 answers (as reported before the go-ahead)

1. **False premises:** above (1–5 were reported before the go-ahead; 6–10 were found while building).
2. **Where the v152 card drew things:** the thread in `lib/qcThread152.ts` (`buildThread`), drawn by `QcCard152.tsx`; "Day 1" was the `w-start` wait, "N days · today" the `w-now` wait, the Waiting on / No reply yet / No reply bubbles were `end` items, and the footer was `replyBox()`.
3. **Free text on a step:** none. The feed's `details` holds "respond by…" or nothing. The agent's words lived on the query, one field per kind, overwritten each time: `rrNotes`, `rejectionFeedbackText`, `offerNotes`, `agentComments`.
4. **R&R:** a status (`Revise & Resubmit`), written by the old record-response path and the query drawer; the card's record form has no option for it.
5. **Told other agents:** the offer journey's flat marks on each *other* live query (`offerRefQueryId`, `offerTold`, `offerToldOn`, `offerReply`); nothing on the offering query, no count, no deadline you gave.
6. **`#e6d9c6` on this page:** `STATUS_FILL.sand` (lib/qc1512), read by the row cap, the card's pill cap and the status group header (`headFill`); Birds-eye's bars (`qcv151.css`), whose pale `#eee5d7` was a second value; `sand` is also the fallback for an unknown status. The phone reads none of them.

## 2 · Commits

| Section | Commit |
|---|---|
| Refs | `3749a2b93`, `0c6fe4afa` (guarded) |
| §1 A quieter Queried | `d90d08cda` |
| §2 The thread | `982d4b5f9` |
| §3 The footer | `1f549f1f1` |
| Follow-up: step materials read as stored; the offer footer wraps | `§FUCOMMIT` |

## 3 · Locks — red first, then green (1280 · 1512)

| Lock | Mutation | v152 build | Mutation | Green |
|---|---|---|---|---|
| L1 queried | `#e6d9c6` back in `STATUS_FILL` | 3/12 · 3/12 | 7/12 · 7/12 | 12/12 · 12/12 |
| L2 events only | the waiting bubble back | 22/51 · 22/51 | 44/50 · 44/50 | 51/51 · 51/51 |
| L3 colour rule | your sent-full bubble tinted | 26/64 · 26/64 | 64/67 · 64/67 | 67/67 · 67/67 |
| L4 waits | the longest wait drawn taller | 7/9 · 7/9 | 7/9 · 7/9 | 9/9 · 9/9 |
| L5 nudge | the "!" on a list row | 5/12 · 5/12 | 11/12 · 11/12 | 12/12 · 12/12 |
| L6 quote | an empty quote on every agent bubble | 10/13 · 10/13 | 10/13 · 10/13 | 13/13 · 13/13 |
| L7 collapse | four after the fold | 1/6 · 1/6 | 2/6 · 2/6 | 6/6 · 6/6 |
| L8 footer | the status line back in the thread | 40/82 · 40/82 | 72/82 · 72/82 | 82/82 · 82/82 |
| L9 no colour | the title hidden on agent bubbles | 26/28 · 26/28 | 19/29 · 19/29 | 29/29 · 29/29 |
| L10 new steps | saved without the deadline | red (times out: v152 has no told option) | 10/12 · 10/12 | 12/12 · 12/12 |
| L11 no regression | — | — | — | QC152 L1–L13, QC1512, QC151 all pass; phones identical |

- **L9's first version was vacuous**: it stayed 29/29 under its mutation, because `innerText` on an element hidden with `display: none` falls back to its raw text. It now requires the title in the bubble's rendered words; re-proved 19/29.
- **L2's chip check** was added after its mutation run (for false premise 9); it reads `[]` on the v152 build.
- **L11 re-pointed:** QC152 L6 (a 26px glyph box with no fill, every wait "N days", no today) and L8 (the footer's words). L9 (capture) needed nothing. In one combined run QC152 L9 failed at 1280 (its card hadn't opened within its wait); alone it is 11/11 at both widths.
- **Phones:** `qc152Phone` (now opening the sheet) reads identical text and data attributes on the v152 build and this one, at 390 and 360.

## 4 · Screens

`reports/qc-v152-1/screens/`, at 1280 and 1512, beside refs 01–14 (`design-refs/query-centre-v152-1/screens/`).

## 5 · Rules (dev deployed; prod is yours)

`isValidActivityNested` (the query's own log) allows three optional keys: `replyNote` (string ≤500), `toldCount` (int 1–30) and `toldDeadline` (string ≤32). **Dev: §DEVRULES. Prod: not deployed (yours).** The prod diff is those three keys in the `hasOnly` list plus their three checks; nothing else. The marks on other queries use fields the rules already allow.

## 6 · Decisions taken under the brief

- **A holding reply** is the agent's but isn't in the colour table: it takes the pass's grey, and its log note is its quote.
- **"Closed: no response"** isn't a footer row in the brief: it reads "Closed: no response / On {date}" with Reopen.
- **No feed row for a told step**, so the shared `EventKey` union and every page's label map are unchanged.
- **`replyNote` is on the query's own log only** (not the feed twin); the thread reads the log.
- **The told count defaults to the number of other live queries on the manuscript** (capped at 30); the deadline to the offer's own answer-by date when ahead, else a week.
- **With "Tell other agents" beside "Answer the offer", the footer wraps:** the field keeps its two lines on its own row and the two buttons sit beneath it, right-aligned. At 504–540px the three don't fit on one line (the field fell to "Olive ma…"), and the refs never draw this case.
- **Fix a mistake** shows a told step without a type menu: its date, count and deadline, and Remove. Moving its date moves `offerToldOn` on the marked queries; removing it clears the marks.

## 7 · Dev

§DEV

## 8 · Left undone

- **R&R can't be recorded from the card.** Writing it needs a new record kind (`rr_req`) mapped to `planResponse`'s revise-and-resubmit data and a "Who replied" option; not built (no new journey, per the brief).
- **The phone window question** (12/12-week partial and full) stays open, as you asked.
- **The batch hazard** in false premise 8 needs your ruling.
