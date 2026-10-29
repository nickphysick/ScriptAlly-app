# Phone app v2, Part 3 — Queries, the query sheet and the Birds-eye view

Branch `phone-app-v2` (worktree `/Users/nickphysick/ScriptAlly-pa2`). Ref: `design-refs/phone-app-v2/` — screens 04–11, `screenQueries2`, `qRow` (QROW B), `qsheet.js` `ovQuery` (QH B · QB B · QL B · QN A) and `stageTrack`, `overlays.js` `ovBirds`. The hashes were re-verified (69 OK). Not merged, not on prod.

## False premises

1. **"Keep Coming up."** The ref's Queries tab has five chips (All · With you · With the agent · Gone quiet · Closed) and no Coming up. The ref is normative, so Coming up and the old Your move · All · Waiting chips are gone. QM1's "the tab", "a query" and "Coming up" cases are retired with that reason at the line.
2. **QM1 L6 said a row carries no StatusDot.** The ref's `qRow` leads with the status glyph in its fill. The ref wins; Q3 asserts the opposite of L6.
3. **The ref's ••• opens a small popover.** On a 390px screen beside a pull-up sheet, a popover over the sheet's own header is cramped. It is built as a second `pa` sheet with the same six actions in the ref's order. Recorded as a deviation.
4. **"The story shows the latest three."** True of the ref's sample, which has four entries. The card shows the last three and a "See the whole story" link; with three or fewer there is no link.
5. **The pinned "Mark sent" on the phone did nothing (found, then fixed).** `Queries.tsx`'s `stepRow` parks the request until a desktop side panel (`[data-qp="panel"]`) appears, and the phone never mounts one. On the phone it now opens the drawer at once, and the drawer sits over the sheet. Q5 now holds it.
6. **The ref files a nudge-worthy query under "With the agent" (Hugo Mayne, "Nudge from 6 Nov"); the app files it under "With you".** That is `whereItStands`' own set, the same one the desktop, Home's "Where they stand" and the chip counts read. The app's derivation wins and nothing new was derived.
7. **Escape on the ••• sheet also closed the query sheet underneath (found, then fixed).** Both sheets listened on the window, so registration order decided, not what was on top. `pa` sheets now go on the shared escape stack (`ESC_LEVEL.pageDrawer`); a later sheet wins a tie and the query drawer (level 30) wins over both. Sheets without `pa` are unchanged.

## What Step 0 found

- **Reused, no new derivation:** `whereItStands` (the sets), `chipCounts`, `headerLine` (sent · active), `rowsFor`, `phoneScopeId`, `nextDoor` (the swipe's next step and the sheet's primary), `openQueryDrawer`, `eyeProgress` / `dueCell` (Birds-eye).
- **New, small, and pure (`lib/queriesPhone.ts`, unit-tested):** `PA2_CHIPS` / `PA2_GROUPS` / `PA2_CHIP_LABEL`; `nextDateLine`, the row's next-date words as facts ("Send by 4 Oct", "Reply was expected 12 Oct", "Passed 3 Sep"), never "overdue" or "late"; `stageIndex` for the four-step stage track, the furthest a closed query reached. These place existing dates into words and do not compute a figure the app already has.
- **"With you" includes queries in the agent's court whose reply date has passed.** That is `whereItStands`' own set. Their next step is a nudge, so their right swipe opens the nudge journey and their line reads "Nudge from {date}".
- **The query sheet is `QcQueryCard149` with an opt-in `sheet` prop.** It is not a fork. The desktop render is unchanged (Q8).

## Gates

| Gate | Before Part 3 (`e0531aba`) | After |
|---|---|---|
| tsc root / functions | 0 / 0 | 0 / 0 |
| build:dev (grepped) | clean | clean |
| Vitest | 691 files · 10736 passed · 3 skipped | `Test Files 691 passed (691)` · `Tests 10741 passed \| 3 skipped (10744)` |

## Commits

| Commit | What |
|---|---|
| (this commit) | 3A–D in one commit. Like Part 2, the list, the sheet and the Birds-eye view share `QueriesPhone.tsx`, one stylesheet and the card's `sheet` prop, so a split would commit half-wired files. Files: `lib/queriesPhone.ts` (+ test), `queries/phone/{QueriesPhone.tsx, queriesPhoneV2.css}`, `queries/centre/QcQueryCard149.tsx`, `Queries.tsx`, `phone/phoneBandStore.tsx`, `shell/{AppShell.tsx, MobileSheet.tsx}`, `CLAUDE.md`, tests `phoneAppV2Queries.measure.ts` (new), `phoneAppV2Pairs.measure.ts`, `phoneAppV2Home.measure.ts`, `queriesMobileV1.measure.ts`, `pa2Lib.ts`, and this report with its ledgers, pairs and shots |

## Locks — PA2-3 (`tests/e2e/phoneAppV2Queries.measure.ts`)

Each lock was proved red at 390 × 844. Code mutations were built into their own folders from a path-derived backup and restored; CSS mutations used `PA2_MUTATE`.

| Lock | Claim | Mutation | Red reading |
|---|---|---|---|
| Q1 | All is every query; the four sets sum to All; each chip shows exactly its set | `quiet-unfiltered` (Gone quiet shows every row) | `quiet: exactly its 17 rows — 52 vs 17` |
| Q2 | the band's "sent · active · with you" does not change with a chip | `band-follows-chip` | `agent: the band line does not follow the chip — 52,39,6 vs 52,39,16` |
| Q3 | every row leads with its own status glyph | `initials` (two letters instead of the disc) | `every row leads with its status glyph — [cor-pair … glyph:false …]` |
| Q4 | right swipe: the next step (your move) / a nudge (theirs); left: close; nothing written | `swipe-wrong` (the two right actions swapped) | `right on your move: opens sent journey — nudge` |
| Q5 | the sheet opens at 64%, `?q=` carries it, band · agent · stage track · latest in order, the next step pinned at 64% and full; the next step opens its journey OVER the sheet; ••• opens the more sheet; Escape closes only it; back closes the sheet | CSS `unpin`; code `panel-wait` (the phone waits for the desktop panel) | `at 64% the next step is pinned at the sheet's foot — {"top":1539.8…}`; `the sheet's next step opens its journey over the sheet — null` |
| Q6 | the Birds-eye view lists every open query once, none closed | `birds-closed` | `every open query, once — 52 vs 39` |
| Q7 | white on navy, ink on blush, no green or red; no image twice | CSS `rust-chip` | `red fill on button.pa-chip (rgb(180, 85, 63))` |
| Q8 | the desktop is untouched | PA2-1 S9 on this build, red by `desk-bar` | see below |

**Final green:** 390 × 844 and 360 × 780, both cases (`3 passed` with setup). Ledgers are in `ledger/`.

**Q8 (the desktop):** this build was captured twice at 1512 × 900 and 1280 × 800 on Home, Queries, To-do, Agents and Account, and compared with Part 1's three base captures. The pixels are within the base's own variation and the DOM is identical on every page (`ledger/desktop.json`). Red by `desk-bar`: 17 failing readings (`ledger/desktop.mut-desk-bar.json`).

**Regressions on this build, all green:** PA2-1 `10 passed, 2 skipped` · PA2-2 `3 passed` (its "sent" now reads the band's stat, since the old header line is gone) · QM1 `2 passed, 9 skipped` (the + sheet and the celebration still run; the rest retired) · DM1 `3 passed, 5 skipped`. Their ledgers are copied into `ledger/regress/`; the earlier parts' own records are left as committed.

**The first full Vitest run had one red, and it was mine:** `dates.test.ts` holds the app to one month table, and `nextDateLine` had built its own. It now uses `dayMonth` from `lib/dates`, and the output is the same.

## ⚠️ A test left a change on the harness account, and it was put back by hand

The first regression run of QM1's celebration recorded a partial request on `probe-dangling-pkg`. It then timed out before pressing Undo, because the celebration was drawn under the query sheet. The fix is above: the celebration layer is at 1050, over the sheet, and the snackbar is over both.

The query was restored with a one-off script:
- status back to Queried, `lastStatusChange` back to its send date, `hasAgentResponded: false`;
- the request fields deleted (`materialsRequested*`, `partialRequestedDate`, `requestSynopsis`, `expectedSendDate`, `sendReminderDate`, `responseReceivedAt`);
- the log entry `vgmO1fumv2HR6xZYS9Rz` and the feed row `UFsoPSUti10WxrrESbmC` deleted.

The document was read back afterwards. It is a probe query that no seeder owns.

## Where the app's derivation overrode the ref

| Item | Ref | App |
|---|---|---|
| band line | "11 sent · 6 active · 2 with you" | "52 sent · 39 active · 16 with you" (harness account) |
| chip counts | 11 / 2 / 4 / 2 / 3 | 52 / 16 / 6 / 17 / 13 |
| a row's date line | "Send by Fri" | the date itself ("Send by 4 Oct"): the sheet states the distance |
| stage track | Queried · Partial · Full · Offer | the same four; a closed query lights the furthest it reached (`stageIndex`) |
| Birds-eye | 6 rows | every open query on the book (39) |

## Also fixed in this part

- **Home and Queries sat 24px low under the band.** The ref's page (`.sheetpg`) rises 24px into the band's rounded foot. Both page bodies started below the foot instead. Each body now takes `margin-top: -24px` while the page ground stays below the foot, so the foot's corners still show. Home is Part 2's page; the fix is here because the Queries pair showed it. Measured in the pairs: the first card now sits 16px under the foot on both pages, against the ref's 16–20px.
- **The sheet's head hides the status pill beside the name.** At 390px it wrapped "Rachel Lin" onto two lines. The status is the stage track's, a few lines down, as in the ref (QH B).
- **QM1's colour check accepted only solid white on navy.** The ref draws the selected chip's count at 75% white (`app.css .chip[aria-pressed] b`). The check now accepts white at any opacity, the phone app's law.

## Pairs

`pairs/` holds the ref beside the app at 390 × 844 and 360 × 780 for screens 04–11. The ref's 05 shows a different chip from the app's (it filters With you).

## Dev

See PROGRESS.md and the integration commit message for the integration branch, its gates and the served hash.

## Not done, and why — for Nick

1. **Phones from 761 to 767px get the desktop Queries page.** `useQm1Phone` is ≤760px (Queries on a phone v1), while the phone app's breakpoint is <768. Moving it changes what QM1 locked. Your call.
2. **The ••• is a sheet, not the ref's popover** (false premise 3).
3. **The parked-journey chip (z 69) sits under an open query sheet on the phone.** It shows again when the sheet closes. The parked journey's own surface is Part 4's.
4. **Opening a journey from the sheet keeps the sheet beneath it.** Closing the journey returns to the sheet, which Q5 asserts. The ref's flow screens are Part 4's.

## Worktree

Kept for Parts 4–8.
