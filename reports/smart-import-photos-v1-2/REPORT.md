# Smart Import from photos: fixes from Nick's messy-list test (v1.2)

**Four of the five are fixed: the Jonah pair is asked as a duplicate, a "?" on a name is read as doubt, a key on the page explains its marks, and every single-date card uses the strip's date field and calendar. The fifth, "Lawe", is a model misreading, which the brief ruled out of scope.** It's all on `main` and on dev, where `index-B3aMvt7Q.js` and the `smartImportMap` function are deployed; prod is untouched.

**The dev Anthropic key ran out of credit partway through the eval.** Nick topped it up, and the second run was completed for $0.53 within a $1 cap (§4). Spend after the top-up was $0.71 in all.

## 1. False premises, and what I decided

1. **The messy-list fixture isn't in the repo.** `functions/eval/fixtures/photos-real/` holds only `notebook-two-pages` and `notepad`, so there's no `real-messy-one-page` and no `truth.json` to compare line by line. As the brief said, I asked nothing and used the eval's own fixtures. The five cases are rebuilt as a lab fixture, `#/onb-lab?s=review&fx=v12`, and are what the rendered locks run on. Copy the page and its truth into that folder and the next eval includes it.
2. **The eval's second run came in two parts.** 12 reads went through before the credit ran out, and the other 14 were re-run after the top-up (`eval-live-v12b-run2`). Together they make a complete second run of the shipped wording; none of the 52 reads failed.
3. **My first wording of the "?" rule broke mark-unclear.** It told the model that a "?" after a name is the writer's doubt. The model applied that to a "?" anywhere at the end of a line ("R&R ?", "sent partial ?"), so mark-unclear recall fell from 71.1% to 42.1% over two full runs. The shipped rule only covers a "?" touching the name itself, and says outright that a "?" anywhere else is still a mark. Recall is now 89.5% (run 1) and 87.9% (runs 1 + 2).
4. **The assembler enforces the "?" rule, not just the prompt.** "Never saved with the mark" has to hold whatever the model returns, so `assembleImport` strips "?", "??" and "(?)" off a photo read's agent name. It sets the one reading and adds `check-reading` to that agent's queries. Sheet reads are untouched.
5. **On the Duplicates step, two rows that each hold one query read as one submission at two stages.** That's the step's existing behaviour for a same-agent pair ("Two rows for Jonah P.", keep one, use the other's date as history). The pair is asked and never merged without the writer. **The kept name is the first row's**, so in Nick's case the agent would be saved as "Jonah P.", not "Jonah Petrakis". A follow-up would be to prefer the fuller name.
6. **A key that defines a tick conflicts with the tick rule.** The old rule said "a tick is never flagged". It now gives way when the page's key defines the tick. So a page with "✓ = sent" asks on every ticked line, which is what decision 3 asks for and could be a lot of questions on a long page.
7. **The phone already asks one question at a time behind "Answer this"** (the dev line's phone screens). The calendar there opens above the field, over the question.
8. **One earlier lock was hollow.** DP-R1 first passed with the calendar clipped by the deck: it measured boxes, not whether a day could be pressed. It now asserts every day of the month is reachable. That check went red on the clipped build and green once the deck stops clipping an open calendar.

## 2. Gates: baseline and final

Baseline: a clean worktree at `afb876e2e` (main before this pass). Final: the primary tree after the last commit.

| Gate | Baseline | Final |
|---|---|---|
| `tsc --noEmit` | exit 0, 0 errors | exit 0, 0 errors |
| `tsc -p functions` | exit 0 | exit 0 |
| `vite build` (whole log grepped) | exit 0, nothing but the chunk-size note | exit 0, nothing but the chunk-size note |
| Vitest (root) | `Test Files  672 passed (672)` · `Tests  10267 passed \| 3 skipped (10270)` | `Test Files  676 passed (676)` · `Tests  10296 passed \| 3 skipped (10299)` · exit 1 from the reporter's `Timeout calling "onTaskUpdate"` under load (`Errors 1 error`, no failed test) |
| Vitest (functions) | `Test Files  2 failed \| 17 passed (19)` · `Tests  7 failed \| 284 passed (291)` | `Test Files  2 failed \| 18 passed (20)` · `Tests  7 failed \| 290 passed (297)`: the same 7 and the same load failure; the new `photoV12.test.ts` passes (6) |

The functions suite's baseline reds are 7 in `foundingEmails.test.ts` (EM-1, -3, -4 ×2, -6, -9, -10) plus `smartImportCore.test.ts` failing to load. They are unchanged and outside this work.

## 3. Commits

| Commit | What | Files |
|---|---|---|
| `9552da3f3` | A: the duplicate rule | `src/lib/smartImportReviewModel.ts`, `src/lib/importDupRule.test.ts` |
| `abe24b59b` | B: the "?" rule, page keys, `markMeaning`, the card's copy | `functions/src/assembleImport.ts`, `functions/src/smartImportPrompt.ts`, `functions/src/photoV12.test.ts`, `src/types/smartImport.ts`, `src/lib/smartImportReviewModel.ts`, `v9/DeckQuestions.tsx` (the mark card), `v9/onbV9.css`, `onboarding/photoV12.test.tsx`, `tests/e2e/reviewDrive.ts` (the reading card), eval readings `eval-live-v12`, `-v12-probe`, `-v12b` |
| `ff66b6a4c` | C: the single-date cards on the strip's picker | `v9/DatePick.tsx` (new: `DateCalendar`, `DatePick`), `v9/datePickV12.test.tsx`, `v9/DeckQuestions.tsx`, `v9/TimelineStrip.tsx`, `v9/timelineStrip.css`, `reviewRows.tsx`, `SmartImportReviewFixture.ts`, `OnbLabImport.tsx`, `lib/importTimeline.ts` (`cardCalendarStart`), `lib/importTypedDate.ts` (`monthHint`), e2e `importDatePick.measure.ts`, `reviewDrive.ts` (`fillDate`), `onbV5Import`, `onbV9`, `onbV9Walk` |
| `2caaba0ee` | the screenshots from dev; the phone walk answers Tom's card first | `tests/e2e/importDatePick.measure.ts`, `reports/smart-import-photos-v1-2/*.png` |

The dev line is `dev/qc1511-db2-title-sip-qc1512-cl26-sip11-tl1-pk41-cl262-db21-sip12`: the branch dev was serving (`…-db21`, `index-Jr9Lv7ez.js`) with main merged in. It had one conflict, in `reviewDrive.ts`, resolved by keeping the dev line's `tap()` and adding `fillDate` and the reading card in its style. I deployed it with `npm run deploy:dev` from a clean checkout of that branch, after re-checking the served hash.

## 4. The eval, before and after

Before is v1.1's final run (`eval-live-v11c`), and main's prompt hasn't changed since. "P / R" is precision / recall, and counts are found / expected.

| Read | Reads | Name | Agency | Status | Date | Crossed-out P/R | Mark-unclear P/R | Illegible-agency P/R | No-date P/R |
|---|---|---|---|---|---|---|---|---|---|
| Before, 2 runs | 52 | 96.8 | 99.4 | 97.5 | 97.1 | 100 / 100 (74/74) | 100 / 71.1 (27/38) | 88.9 / 61.5 (16/26) | 96.4 / 98.1 (53/54) |
| First v1.2 wording, 2 runs (not shipped) | 52 | 96.9 | 99.7 | 97.6 | 97.2 | 100 / 100 | 100 / **42.1** | 88.2 / 57.7 | 96.4 / 100 |
| **Shipped v1.2, 2 runs** | 52 | **97.0** | **99.6** | **97.9** | **97.6** | 100 / 100 (74/74) | 100 / **89.5** (34/38) | 87.5 / 53.8 (14/26) | 98.2 / 100 (54/54) |
| Before, your own photos | 4 | 100 | 95.2 | 100 | 97.6 | 100 / 100 | 100 / 66.7 (4/6) | 0 / 0 (0/2) | 100 / 90.0 |
| Shipped, your own photos | 4 | 100 | 100 | 100 | 100 | 100 / 100 | 100 / 100 (6/6) | 0 / 0 (0/2) | 100 / 100 |

- **Every field is up**, and so are mark-unclear and no-date. On your own two pages every field is now 100%.
- **Illegible-agency recall fell 16/26 → 14/26, and the whole drop is one entry:** Gideon Pennington on `hand-indie-2p-blur`, whose agency the fixture blurs so only "Fairb" can be read. Before this pass the model flagged it in both runs; with the shipped wording it read "Fairbairn Associates" outright, correctly, without the flag. The shipped wording's example was "Leo Fairbairn?", which put "Fairbairn" in the prompt.
- **So the example is now "Leo Marsh?"** (`4fbfe1a44`, redeployed on dev). A probe of that fixture, two runs (`eval-live-v12c-probe`), brought the flag back in one of two. The rest looks like run-to-run noise on one blurred word, and the agency text is right every time. Within the $1 cap I stopped there, so the new example is measured on that fixture and your own pages only, not the full eval.
- **Cost:** $3.90 before the credit ran out, then $0.53 for the rest of run 2 and $0.18 for the probe.

## 5. The messy list, line by line

I couldn't do this: the fixture and its truth aren't in the repo (§1.1). The five things from the test are the lab fixture's rows, each checked on the rendered page by DP-R1 to DP-R3:

| Line | Before | Now |
|---|---|---|
| "Jonah P. – Heron" / "Jonah Petrakis – Heron Lit" | two agents, never asked | one set on the Duplicates step |
| "Leo Fairbairn? – Lattice" | saved as "Leo Fairbairn?" | "Leo Fairbairn", asked: "We read this as “Leo Fairbairn” at “Lattice”. Is that right?" |
| "Tom Hale – Hale & Co – 3/9 ✗" with "✗ = pass" on the page | "There's a ✗ beside this line. Where does this one stand?" | "There's a “✗” after this line, and your key says ✗ means “pass”. Is that right?", Passed chosen |
| "Rhea Oduya – … – early Oct" | a native date input, opening on today | the strip's field; the calendar opens on October 2026 |
| "Lawe" (an agency misread) | — | not fixed, by decision 4: a model reading we can't detect |

## 6. Locks and their red-before proofs

**Unit**

| Lock | Break | Result |
|---|---|---|
| DUP-1 the Jonah pair, in four written forms | no looser rule inside an agency | red, 4 |
| DUP-1 "Heron" / "Heron Books" | agency prefix not joined | red, 1 |
| DUP-1 "Kite & Assoc." / "Kite Associates" | "Assoc." not a suffix | red, 1 |
| DUP-2 two shortened halves are not a match | allowed | red, 3 |
| DUP-2 another agency is not a match | any agency matches | red, 3 |
| DUP-2 "Heron" / "Heronsgate" | a letter prefix joins agencies | red, 2 |
| PH12-1 the "?" comes off, as one reading, with check-reading | kept on the name / no check-reading / "(?)" not read | red, 2 / 1 / 2 |
| PH12-2 `markMeaning` kept only beside its mark | kept without the reason | red, 1 |
| PH12-3 the prompt says both rules, narrowed | the key rule out / the line-end clause out | red, 1 / 1 |
| PH12-4 the keyed card's words and the chosen status | copy not shown / nothing chosen / the row's wording | red, 1 / 1 / 1 |
| PH12-5 without a key, unchanged; no meaning without a mark | `markMeaning` without its mark | red, 1 |
| PH12-6 never written on commit | the commit carries it / the model drops it | red, 1 / 3 |
| DP-1 the month the words name, never a day | words not read / future month kept / a day taken | red, 1 / 1 / 1 |
| DP-2 where a card's calendar opens | no adjacent date | red, 1 |
| DP-3 no native date input on any single-date card | one put back | red, 4 |

**Rendered** (`tests/e2e/importDatePick.measure.ts`, on the `fx=v12` lab)

| Lock | Break | Result |
|---|---|---|
| DP-R1 the calendar floats, opening and typing move nothing, every day can be pressed | `DP_MUTATE=R1` (calendar in the flow); and the build before the deck stopped clipping | red, both |
| DP-R2 "early Oct" opens on October 2026; the date is said back and saved | built with the month reading off | red: opened on November 2026 |
| DP-R3 the Jonah set, Leo's one reading, Tom's keyed card with Passed chosen | built with no status pre-chosen | red |

Final run on dev (`index-B3aMvt7Q.js`): DP-R1 to DP-R3, the screenshots, and the six strip locks TS-R1 to TS-R6 all pass. The lab runs signed out on fixtures, but the harness needs `ALLOW_LIVE_FIRESTORE=1` for a live base.

## 7. Screenshots (`reports/smart-import-photos-v1-2/`, from dev)

| | |
|---|---|
| `1440-duplicates-jonah.png` | the Jonah pair on the Duplicates step |
| `1440-agents-leo.png` | Leo's name to check, read without the "?" (the quoted line keeps it) |
| `1440-mark-keyed.png` | Tom's ✗ with the key's words, Passed chosen |
| `1440-date-card.png`, `1440-date-calendar-oct.png` | Rhea's "early Oct" card, and its calendar open on October |
| `390-date-card.png`, `390-date-calendar-oct.png` | the same on a phone, in the answer sheet |

## 8. Loose ends

- The "Leo Marsh?" example is measured on one fixture and your own pages; the next full eval (about $1.80 for two runs) would confirm it across all 26.
- The Duplicates step keeps the first row's name ("Jonah P."). Preferring the fuller name of a pair is a small follow-up.
- A key like "✓ = sent" asks about every ticked line. Fine on a short page, but worth watching on a long one.
- Worktrees: six besides the primary belong to other sessions (`wt-emu`, `wt-qc152-base`, `ScriptAlly-cl263`, `ScriptAlly-live`, `ScriptAlly-qc152`, `ScriptAlly-rsp6`), over the house limit of five. I removed my own; say if you'd like the clean ones cleared.
