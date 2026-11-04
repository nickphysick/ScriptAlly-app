# Query Centre v151.1: mini-card rows, summary card, quick filters, filter pills (desktop)

Branch **`query-centre-v151-1`** (pushed, **not merged**), in its own worktree `../ScriptAlly-qc1511`. Refs in
`design-refs/query-centre-v151-1/`: all 27 hashes verified before anything was built. On dev (see Dev, below).

## False premises

1. **"Use the same source and wording rules as today's dashboard 'your move' summary."** The dashboard has no such
   sentence. Its "your move" is a task card's kind (`lib/taskKinds`, the `req` list group), not a summary line. The card
   therefore counts the Query Centre's own Your move set (`whereItStands === "you"`), so its N is the Your move
   segment's count by construction, and its words are new (`weekSummary` in `lib/qc1511.ts`). The rules it keeps are the
   house ones: facts only, the agent named, no pronouns, numbers one to nine spelled out.
2. **Your move is not only sends and offers.** In the app it also holds waiting queries inside their nudge window (past
   the reply date by 28 days or less). The card counts them ("6 nudges due"), the detail line folds them into "late",
   and their Next reads "Reply 19 days overdue". With the harness account that is 22, not the mock's 4.
3. **"Gone quiet: a Nudge button."** The app's next move for a Gone quiet query is **Consider closing** (past the nudge
   window); the row's button is its own `nextDoor`, as v151 established, so it says "Consider closing". A Gone quiet query
   whose writer pressed "Keep tracking" has no button (its next move is Record a response). Your move's nudge-window rows
   carry the Nudge button.
4. **"Where it stands" pills.** In the app the panel's Where it stands and the quick filters are one field
   (`qcF138.where`). Choosing "With you" in the panel moves the segmented control, and that is where it shows; it never
   becomes a pill, and Clear all (which keeps the quick filter) leaves it.
5. **"Reply due Sat 10 Oct when the reply date has a set deadline."** A row does not carry which kind of date it has, so
   I read it from the source: a date **the writer set** (`writerExpectedDate`) reads "Reply due Sat 10 Oct"; the agency's
   stated window reads "Reply by 22 Oct". Flag if "set deadline" meant the other way round.
6. **The action words are the app's**, not the mock's: "Send partial", "Decide on offer", "Send full", "Send revision",
   "Nudge", "Consider closing" (v151's false premise 4 still holds).
7. **The mock's Offer glyph is a ringed dot; the app's StatusDot for Offer is a document outline** (oracle 1). Same for
   the closed pill: the mock's ⊗ is drawn as v151's crossed glyph.
8. **Sort arrows follow the ref:** ↓ for a column's own direction (Next: soonest first), ↑ reversed. v151 drew ↑ for
   ascending.
9. **"border-collapse: separate; border-spacing: 0 8px" with sticky group headers.** Each group is its own `<tbody>`, so
   its sticky header is pushed off by the next group's rather than piling up under it as in the mock's single body.
10. **1.5px borders render as 1px** at device-pixel-ratio 1 (Chrome rounds borders to device pixels); the mock measures
    the same. Declared 1.5px, as asked.
11. **The rows are not all ≈69px in the mock** (its closed rows are 63). They are 69 here on every row, as the prompt and
    L7 ask.

## Base

`query-centre-v151` @ **ceaff31c** (v151 with its report). Dev was serving `dev/…-wlc1-ht1-qc151` @ af1e3bfb
(`index-BxUVq9ZZ.js`) = v151 minus that report commit + another session's hero trim; the integration branch is cut from
that (see Dev).

## Commits (`query-centre-v151-1`)

The sections share one component and one stylesheet, so (as in v151) they are grouped by part.

| Commit | What |
|---|---|
| 25c5e275 | refs (28 files, hashes verified); only the new mock enrolled in the manifest |
| 81b89a53 | §2 / §5 / §7 pure parts: `lib/qc1511.ts` (`weekSummary`, `nextText`, `yearSplit`, `dayLine`, `pillGroups`, `pillWords`, tints) + 11 unit tests |
| 3bd61bd6 | §0–§9 the page: `QcPage151.tsx`, `qcv151.css`, `qcv150.css` (§8 doodles), `Queries.tsx` wiring, `hawk-desk.webp` |
| 6ea39d59 | the QC1511 locks, runner, mutation runner, shots; QC151 re-pointed and retired |
| fa254ea9 | CLAUDE.md entry |
| (this) | the report, ledgers and screens. The QC151 runs' ledgers are `ledger/qc151-*` (v151's own in `reports/qc-v151/` are untouched) |

## Locks: QC1511 (`tests/e2e/qc1511.measure.ts`, emulator build, 1280 × 800 and 1512 × 900)

Each red first against the **v151 build** (`QC1511_BASE=1`, `qc1511Mutate.sh BASE`) and against its **named break**
(`QC1511_MUTATE`, in the page). Readings are 1280 · 1512. Ledgers: `ledger/` (green), `ledger/base-*`, `ledger/mut-*`.

| Lock | Green | v151 build | Mutation | Under the mutation |
|---|---|---|---|---|
| L1 removed | 9/9 · 9/9 | 6/9 · 6/9 | the info banner restored | 8/9 · 8/9 |
| L2 summary card | 7/7 · 7/7 | 2/7 · 2/7 | the pills dropped | 6/7 · 6/7 |
| L3 quick filters | 7/7 · 7/7 | 1/7 · 1/7 | default to Your move | 6/7 · 6/7 |
| L4 control line | 11/11 · 11/11 | 0/11 · 0/11 | wrapped in a card | 9/11 · 9/11 |
| L5 pill row | 12/12 · 12/12 | 4/12 · 4/12 | the row rendered at defaults | 10/12 · 10/12 |
| L6 group headers | 21/21 · 21/21 | 0/5 · 0/5 | the header not sticky | 20/21 · 20/21 |
| L7 mini cards | 7/7 · 7/7 | 4/7 · 4/7 | spacing collapsed to 0 | 6/7 · 6/7 |
| L8 agent cell | 5/5 · 5/5 | 2/5 · 2/5 | the Agency column restored | 4/5 · 4/5 |
| L9 next + action | 11/11 · 11/11 | 7/11 · 7/11 | the button in the Next column | 8/11 · 8/11 |
| L10 background | 11/11 · 11/11 | 0/1 · 0/1 | the doodles tiled down the sheet | 8/11 · 7/11 |

**Lock faults the runs found and fixed (not page faults):** L5 read `textContent`, which runs the pill's spans together
("Statusis any of…"); it reads `innerText`. L5 then pressed Escape where a user closes the panel with its ×, and chose
"With the agent" before "Overdue", a combination that is always empty, so there was no label to sort by; it now uses
Gone quiet and asserts each press landed. L10 first expected the exact ground colour in the gaps; the cards' own soft
drop darkens a gap evenly (234,230,225 against 242,238,232), so it now asserts each gap line is one even colour near the
ground, which is what a doodle stroke breaks.

**L11 (Birds-eye)** = QC151 L14 666/666 · 666/666 and L15 8/8 · 8/8, under the new control line.

**L12 no regression** (QC151, `tests/e2e/qc151.measure.ts`):

| QC151 case | Result |
|---|---|
| L1 one width | re-pointed (summary card, quick row, control line in place of banner and toolbar): 17/17 · 17/17 |
| L2 removed | 8/8 · 8/8 |
| L4 filter panel | 15/15 · 15/15 |
| L6 group menu | re-pointed (the section's name is now a span in its header): 15/15 · 15/15 |
| L10 track | 9/9 · 9/9 |
| L12 sign-off | 6/6 · 6/6 |
| L14, L15 Birds-eye | as L11 above |
| L16 phone at 390 × 844 | 4/4 (same elements and classes as the base capture) |
| L3, L5, L7, L8, L9, L11, L13 | retired, reasons in `tests/e2e/RETIRED-query-centre-v151-1.md` |

Unit gates on the final commit: tsc clean; production build clean (no CSS warnings); Vitest 731 of 732 files, the one red
being `src/test/firestoreTarget.test.ts` (2 tests), red on the untouched base too.

## Screens (`shots/`, beside `design-refs/query-centre-v151-1/screens/`)

| Screen | 1280 | 1512 |
|---|---|---|
| 01 top | [ours](shots/01-top-1280.png) · [ref](../../design-refs/query-centre-v151-1/screens/01-top-1280.png) | [ours](shots/01-top-1512.png) · [ref](../../design-refs/query-centre-v151-1/screens/01-top-1512.png) |
| 02 list | [ours](shots/02-list-1280.png) · [ref](../../design-refs/query-centre-v151-1/screens/02-list-1280.png) | [ours](shots/02-list-1512.png) · [ref](../../design-refs/query-centre-v151-1/screens/02-list-1512.png) |
| 03 sticky group header | [ours](shots/03-sticky-group-header-1280.png) · [ref](../../design-refs/query-centre-v151-1/screens/03-sticky-group-header-1280.png) | [ours](shots/03-sticky-group-header-1512.png) · [ref](../../design-refs/query-centre-v151-1/screens/03-sticky-group-header-1512.png) |
| 04 closed and sign-off | [ours](shots/04-closed-and-signoff-1280.png) · [ref](../../design-refs/query-centre-v151-1/screens/04-closed-and-signoff-1280.png) | [ours](shots/04-closed-and-signoff-1512.png) · [ref](../../design-refs/query-centre-v151-1/screens/04-closed-and-signoff-1512.png) |
| 05 filters open | [ours](shots/05-filters-open-1280.png) · [ref](../../design-refs/query-centre-v151-1/screens/05-filters-open-1280.png) | [ours](shots/05-filters-open-1512.png) · [ref](../../design-refs/query-centre-v151-1/screens/05-filters-open-1512.png) |
| 06 group menu | [ours](shots/06-group-menu-1280.png) · [ref](../../design-refs/query-centre-v151-1/screens/06-group-menu-1280.png) | [ours](shots/06-group-menu-1512.png) · [ref](../../design-refs/query-centre-v151-1/screens/06-group-menu-1512.png) |
| 07 pills | [ours](shots/07-pills-1280.png) · [ref](../../design-refs/query-centre-v151-1/screens/07-pills-1280.png) | [ours](shots/07-pills-1512.png) · [ref](../../design-refs/query-centre-v151-1/screens/07-pills-1512.png) |
| 08 no matches | [ours](shots/08-no-matches-1280.png) · [ref](../../design-refs/query-centre-v151-1/screens/08-no-matches-1280.png) | [ours](shots/08-no-matches-1512.png) · [ref](../../design-refs/query-centre-v151-1/screens/08-no-matches-1512.png) |
| 09 Your move tab | [ours](shots/09-your-move-tab-1280.png) · [ref](../../design-refs/query-centre-v151-1/screens/09-your-move-tab-1280.png) | [ours](shots/09-your-move-tab-1512.png) · [ref](../../design-refs/query-centre-v151-1/screens/09-your-move-tab-1512.png) |
| 10 collapsed group | [ours](shots/10-collapsed-group-1280.png) · [ref](../../design-refs/query-centre-v151-1/screens/10-collapsed-group-1280.png) | [ours](shots/10-collapsed-group-1512.png) · [ref](../../design-refs/query-centre-v151-1/screens/10-collapsed-group-1512.png) |
| 11 Birds-eye | [ours](shots/11-birdseye-1280.png) · [ref](../../design-refs/query-centre-v151-1/screens/11-birdseye-1280.png) | [ours](shots/11-birdseye-1512.png) · [ref](../../design-refs/query-centre-v151-1/screens/11-birdseye-1512.png) |
| 12 Birds-eye hover | [ours](shots/12-birdseye-hover-1280.png) · [ref](../../design-refs/query-centre-v151-1/screens/12-birdseye-hover-1280.png) | [ours](shots/12-birdseye-hover-1512.png) · [ref](../../design-refs/query-centre-v151-1/screens/12-birdseye-hover-1512.png) |

Harness data (88 queries), not the mock's 27. At 1280 the pill row wraps "Clear all" to a second line, which §5 allows.

## The summary card's source

`weekSummary` (`lib/qc1511.ts`), over the manuscript-scoped rows (`buildQcRows`), with Your move = `whereItStands`. No
dashboard summary was reused because none exists (false premise 1). **The zero state's words are the prompt's, not
Nick's:** "Nothing needs you this week" and "Next reply due ‹date›." (the earliest reply date still to come).

## Dev

- Integration branch **`dev/…-wlc1-ht1-qc151-qc1511`** = af1e3bfb (what dev served) + `query-centre-v151-1`, merge
  **3a78b808**, clean. Built (`npm run build:dev`, no warnings) and deployed **hosting only** from a clean scratch
  checkout, with the served hash checked in the same command: **dev serves `index-DtqaK0_V.js`.** Pushed. Prod and main
  untouched.
- ⚠️ Another session is working in `../ScriptAlly-dashboard-v2` on top of the same dev line (af1e3bfb). A dev deploy of
  that branch without this merge would take v151.1 off dev.

## Left undone, and why

- **The empty-state wording** is the prompt's and wants Nick's ruling.
- **Escape on the open panel**: the panel's own Escape listener runs, but the shared escape stack may take the key first
  on some states; the panel's × and a press outside both close it (QC151 L4). Not chased.
