# Contact list v17.1: centred header, one card with List health, a smarter Housekeeping tab

The amendment to Contact list v17. Branch `contact-list-v17-1`, in its own worktree. Not merged to `main`.

## 1. False premises, deviations, and differences from the mock

1. **"At 1280 the v17 filter row overflowed by 34px (Genre was hidden under the fade)."** Not on the v17 that
   shipped. v17's Part G had already let the search box shrink (from 300 down to 104), so on the v17 build the row's
   `scrollWidth` equalled its `clientWidth` at 1512 and 1280 and the Genre field was inside it (C2's base run:
   4 of 5 green; the one red is the search measuring 237.5 rather than 220). The 34px overflow was the reference's,
   and v17's own report recorded it there. Part C is still built as asked: a fixed 220 that does not shrink.
2. **"300 compact"** was not v17's value either: v17 shipped `flex: 0 1 300px` with a 104px floor.
3. **The mock is "full" at 1512; the app is "compact" there.** The pack says compact sizes follow the app's own
   switch (the sheet wider than 1440). At 1512 with the sidebar open the sheet is 1208, so the app uses the compact
   values: inset `max(40, (1208 − 900) / 2)` = **154** (the mock shows 64), counts panel 210, ring 76, search 220.
   At 1920 the app is full: inset 260, counts 230, ring 92, search 360.
4. **Where the dismissal is saved.** The app already keeps Housekeeping's per-user preferences in
   `todoPrefs.contacts` (Later, "not stated", the wishlist check-in). The dismissal is
   **`todoPrefs.contacts.tabDismissedAtGaps`** (a number, or null), not a new `ui.housekeepingTab` field. `todoPrefs`
   is an unconstrained map in the rules, so there is **no rules change** and nothing to deploy to prod.
5. **The ×'s position.** The prompt says its centre is about 10px in from the tab's corner; the mock puts it 2px in,
   on the tab's top edge. Built to the prompt: 7px in each way (≈10 along the diagonal).
6. **The title row's row gap** (title block to buttons) is not in the prompt; it is the mock's, 40 (24).
7. **The rust circle is not drawn at 100.** Drawn underneath a full ink circle it is invisible except for its
   antialiased edge, which shows as a rust fringe. B4's named mutation ("leave the rust circle drawn at 100") is
   therefore a real, observable fault rather than a hidden one.
8. **D2 cannot fill a real gap on the shared account and put it back cleanly**, so the lock uses Housekeeping's own
   "Later" on one item (the gap count falls by one) and "Show them now" (it rises again). The tab reads the same
   count either way. The run starts with nothing put off, and ends with nothing put off and no dismissal stored.
9. **B4 and D1 need a list with no gaps**, which the shared account (49 gaps, 1 of 37 filled in) cannot be made
   into. A dev-only review aid, `window.__SA_HK_ALL_FILLED`, runs Housekeeping's own model over only the agents that
   already have no gaps. It changes the input, never the output, and it is absent from a production build (grepped).
10. **The harness account cannot show the reference's 76%.** It reads 3% (1 of 37 filled in, 49 gaps), so the ring
    is almost all rust. B3 checks the arc's proportion at 3%; the unit suite holds 76%, 0 and 100.

## 2. Which case applied, and the tip

**Case 3: v17 was already deployed to dev.** Dev served `index-CMyvjAYL.js`, the v17 integration branch
`dev/…-qp2c-corkboard1-qp2d-cl16-cl17` at **`f4b26c99`**, unchanged. `contact-list-v17-1` was branched from it.

Baseline on `f4b26c99`: `tsc` 0; both builds exit 0; Vitest 8,766 passed, 3 skipped, one file failing to load
(`functions/src/email.test.ts`).

## 3. §0

1. **Housekeeping's figures** are `hkModel(agents, hkCtxOf, hkPrefs)` (`lib/contactHousekeeping`), built once in
   `AgentList` and passed to the drawer and its tab. The drawer's "{complete} of {total} agent profiles filled in" is
   `model.complete`/`model.total`; its gap count is `model.items.length` (the gaps not put off with Later); the tab's
   line ("49 gaps · 1 of 37 filled in") is `tabCounts(model)` over the same model, and its ring was `model.share`.
   The header ring reads that same model through `lib/contactHealth.listHealth` (`share` rounded, `items.length`).
2. **The floating tab appears only on `/agents`.** `ContactHousekeeping` is its one mount, inside `AgentList`, and
   only over a list (not the empty page). The shared `FloatingTab` is also used by Comparable titles' Scout tab
   (`/manuscripts/comps`), which is a different tab and is unchanged: the new dismiss and ring tone are opt-in props.
3. **The store:** `todoPrefs.contacts` (item 4).
4. **One opener.** `openHk` in `AgentList` (`setHkOpen(true)`): the tab, the H key and the header ring all call it.

## 4. What was built

| Part | Commit | What |
|---|---|---|
| A | `6f2c983d` | The title row inset (`--cl17-inset`), the grid with the card spanning both rows, the hawk image removed, the shadow moved in with the title. The references enrolled. |
| B | `ce151e7d` | One white card: counts (no detail lines) and the List health button and ring; `lib/contactHealth`. |
| C | `60cbb1dd` | The search a fixed 220 at compact widths. |
| D | `738437a7` | The tab only with gaps, its ×, the 6s note with Undo, the dismissal saved to the account; the ring in the header's language. |
| G | this commit | The locks, the review aid, no rust at 100, the v17 retirement, CLAUDE.md, this report. |

## 5. Locks: red first, then green

`tests/e2e/contactV171.measure.ts`, at 1512 × 900 and 1280 × 800 with the shell, one worker. "Base" is the lock
against the v17 build (`CL171_BASE=1`); "mutation" is the lock with its named break (`CL171_MUTATE=<lock>`; D1's and
D2's are source edits made and undone in the measurement worktree). Ledgers in `ledger/`.

| Lock | Green | Base (red) | Mutation (red) |
|---|---|---|---|
| A4 inset | 12/12 | 6/12: title block at 272 against 426, card's right at 1480 against 1326, a hawk image in the header | inset removed, 8/12: "272.0 vs 426.0" |
| B3 card | 26/26 | timed out: no List health to press | pct from the card's own counts, 24/26: "14%" vs 3% (1 of 37) |
| B4 full | 12/12 | 2/12: no ring, the tab present | rust left drawn at 100, 10/12: "rust true" |
| C2 search | 5/5 | 4/5: the search 237.5 at 1280 (item 1) | search back to 300, 2/5: `scrollWidth` 1039 / 976, Genre at 1310.5 past 1248 |
| D1 shows | 8/8 | 4/8: no ×, the tab shown with no gaps | tab shown at 0 gaps, 6/8: "0 gaps · 1 of 1 filled in" on screen |
| D2 dismiss | 12/12 | timed out: no List health or × | dismissal in component state only, 10/12: shown again after a reload |

Unit: `contactHealth.test.ts` (6 cases: the figures, the words, the arc, the show rule, the fall-and-clear rule,
the reader).

**L2, the regression set, on the v17.1 build (one worker).** contactV171, contactV17 (with A1 edited), contactV16
(less v17's retirements), contactV11, V13, V14, V15, V15.1, V15.2, V15.3 and compsV25: **72 passed, 0 failed**.
qcV137, queryPanelV1, queryPanelV2, feedDrawerV2, headerPanelV2 and headerV3: 42 passed, 3 failed:
- header panel v2's P7 at 390px on `/manuscripts/comps`: the known red, on dev's branch before v16.
- header panel v2's **P2 on `/dashboard`**: the dashboard's header measures 11px right of its stored baseline
  (298 → 309 at 1512, 282 → 293 at 1280) and 22px narrower. **It fails identically on the v17 build**, which passed it
  on 13 Oct, so it is not this change: the dashboard moved against a stored baseline between the two days (date or
  account data). Not chased here; it needs looking at by whoever owns that baseline.
- that file's floor case, which fails because P2 did not write its readings.

Header v3 had no reds. "Responses RS1" does not exist (as in v17).

## 6. Edited or retired locks

- **CL17 A1:** its hawk reading ("280 (200) wide, between the title block and the card") is retired; floor 12 → 10.
  A4 holds the header now.
- **CL17 A2:** unchanged. It never asserted the card's width or detail lines; B3 holds both and re-runs A2's press
  behaviour (filter, fade to 0.32, underline, `aria-pressed`, no scroll) in the new card.
- **v17's compact search width:** no v17 lock pinned it. C2 asserts the 220.

`tests/e2e/RETIRED-contact-list-v17.md` has a v17.1 section.

## 7. Shots

In `shots/`, beside each `design-refs/contact-list-v17-amend/screens/` file: the top at 1512 and 1280, the card,
the tab, dismissed, and pinned. **"Nothing to do" (05) is not shot**: the account cannot reach it without the review
aid, and a shot taken with the aid would show a list of one agent.

## 8. Integration and deploy

DEPLOY_SECTION

## 9. For Nick

- **The tab appears on one route: `/agents`.** (Comparable titles' Scout tab shares the component and is unchanged.)
- **The dismissal is stored on the user's own document at `todoPrefs.contacts.tabDismissedAtGaps`**: the gap count
  when the tab was hidden, lowered as gaps are filled, cleared to null when a new one appears. No rules change.
- The header is much narrower at 1512 than in the mock (inset 154, not 64), because the app is compact there
  (item 3).
- The dashboard's header-position baseline is red today for reasons outside this pack (§5).
