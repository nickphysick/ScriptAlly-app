# Query Centre v149 — report

Branch `query-centre-v149`, cut from what dev served: `dev/hm31-pv4` at **e629f2b0** (`index-BkePzY_g.js`). Ten commits,
185ea9ea → 1f7c7e91. Integration and deploy: see §9.

## 1 · False premises

1. **The pack's numbers are not the Versions page's.** Card radius 20 vs Versions' 18, background `#f9f7f3` vs `#fbf8f4`,
   padding 26 36 28 vs 30 36, title 32 vs 34; banner `#f6e6df` vs `#f8e9e2`, edge 4 vs 5, radius 16 vs 14, disc 46 vs 38,
   headline 21 vs 17. L1 asserts the card *is* Versions', so Versions won throughout. The card's top gap is Versions' 24,
   not the pack's 22.
2. **There was no shared `QueryCard` from v142.** The landing card (`HeroCard.tsx`) and the QC's Cards view (`QcCard142`)
   both drew `.mk-lc*` from `heroCard.css`; `queries/QueryCard.tsx` is older and unrelated. The panel's card is a new
   component, `centre/QcQueryCard149.tsx`, drawn from the same `.mk-lc*` classes (QC142-L5 now holds the two together).
3. **Query notes are a journal, not a field.** Notes are `journalEntries` by `queryId`. The Notes tab lists them and adds
   one with an add field — no new query field, no rules change. (Default chosen and stated at the time.)
4. **"`.ws-window` ≤ 1440" is the viewport**, as NB1 also found; the 1280 and 1512 screens prove it.
5. **The panel is 520 wide at ≤1440**, not narrower; unchanged.
6. **The header names no manuscript on the harness account.** The list is never scoped to one book, so the body says
   "Every query you've sent…". The bold-name branch is reached in the unit test (`qcHeader149.test.tsx`).
7. **The mock's Full manuscript toggle is not built.** House rule: a full manuscript is what you send when asked, never
   part of a query package. The new query card offers Query letter, Synopsis and First 3 chapters.
8. **The v149 ref sets the panel card's agent name at 25px** (`.cbr .lc-nm { font-size: 25px !important }`), against the
   landing card's 22. Built as the ref; QC142-L5 compares the face, weight and tracking (in em) and reads 25.

## 2 · Step 0 and the ruling

The Versions header card and banner were page-local (`STEP0.md`). Ruling: lift them, and prove Versions doesn't change.

## 3 · The shared components (Phase 1, 9e85f08d)

**`src/components/shared/PageHeaderCard.tsx`** + `pageHeaderCard.css`

| Prop | Type | Default |
|---|---|---|
| `title` | ReactNode | — |
| `tag` | ReactNode (the pill after the title) | none |
| `body` | ReactNode (rich text, so a name can be bold) | — |
| `primary` | `{ label, onClick?, disabled?, data?, buttonRef? }` | — |
| `secondary` | same shape | none |
| `art` | image src | none |
| `titleId` | string | — |
| `classPrefix` | also emit the page's old class names (Versions passes `hb`) | none |
| `className`, `data`, `titleData` | extra class / data attributes on the root and the h1 | none |

**`src/components/shared/PageAlertBanner.tsx`** + `pageAlertBanner.css`

| Prop | Type | Default |
|---|---|---|
| `headline`, `line` | ReactNode | — |
| `icon` | ReactNode | `WARNING_ICON` (Versions') |
| `faces` | `{ key, initials, title? }[]` | none |
| `action` | `{ label, onClick?, data? }` | none |
| `tone` | `"rust"` | `"rust"` |
| `hidden` | boolean — the QC hides it at 0 | false |
| `role` | string | `"status"` |
| `id`, `headlineId`, `facesId`, `classPrefix`, `className`, `data` | as above (Versions passes `wb`) | none |

The CSS moved verbatim with its selectors renamed at equal specificity (`.phc.phc`, because Versions' `all: revert` is
0-1-0) and its tokens declared on the roots (they lived on `.vv2`). Versions keeps only its own margins. No other change.

**QC149-L0** (`tests/e2e/qc149L0.measure.ts`): 18 parts × 45 computed properties plus a pixel diff, against a reference
captured from the base build in the same run.

| | 1280×800 | 1512×900 |
|---|---|---|
| Green (final build 1f7c7e91, fresh base capture) | 0 styles differ · 0 px (0.0000%) | 0 styles differ · 0 px (0.0000%) |
| Red: card padding +2px (`padding: 30px 36px` → 32px) | no change — the narrow rule sets padding there | 11 styles · 7.81% px |
| Red: narrow padding +2px (`26px 28px` → 28px) | 11 styles · 7.54% px | — |

The first mutation was the ruling's, and it could not redden 1280; the second one targets the rule that applies there.

## 4 · Per part

**A — header.** `QcHeader149` = `PageHeaderCard` (hawk at the desk, right) + `PageAlertBanner` (clock icon; "N queries
are waiting on you."; the next one by date; up to five faces; Show them presses With you). Absent at 0. The view row
(`QcViewRow149`): All · With you · With the agent · Gone quiet · Closed, one at a time, pressing the pressed one returns
to All; Find on the right. The old hero (`QcHeader138`) and breakdown card (`QcWhereCard`) are no longer drawn.
In full screen the card and banner are hidden, as the old header was (found by QC140-C1, fixed in 5e0cbe19).

**B — list.** The frame (white, hairline, radius 20) is the inset wider than the blocks above (32, or 24 at ≤1440).
The navy bar: heard back (hidden ≤1440) · Filters · Group by · Sort · Full screen. No count, no Cards/List switch, no
jump row. Columns flex (`fr`); the First queried floor is 112 so its heading fits (1f7c7e91). Group headings are
full-width `#f6f3ee` bands, no rule. The hover timeline's summary is one line and the timeline takes the row's width.
**List only**: `QcCards142.tsx`, its test, 53 Cards-only rules and the `view` memory field are deleted.

**C — the panel is the query card.** `QcQueryCard149` in the existing panel: band (where it stands · Day N · ✕), agent,
pill, book and package, tabs Tracking · Agent · Materials · Notes, the primary, Record a response, Edit, Close query,
‹ N / M ›. Respond and edit happen in the card; saves go through the drawer journeys' own writes, lifted into
`lib/queryActions/respondSave.ts`, `stepSaves.ts`, `sentCorrect.ts`, `logSave.ts` (the journeys call the same
functions). Undo is the snapshot and the undo bar, as in the drawer.

**D — the header's actions.** + Log a query opens a new query card in the panel (pick an agent not yet queried for this
book; queried agents are listed and cannot be picked); Record a response opens "Who replied?" (live queries, Waiting to
hear back · Already with you), and a pick opens that query's card in respond mode.

## 5 · Do agent edits write the agent record?

**Yes.** The card's Agent tab saves name, agency, email and reply weeks through `commitCardSave` — the agent card's own
save path, its own snapshot and undo. ⚠️ This sits against the standing ruling "the agent card is the only agent
editor; other surfaces may create an agent but never edit one". The pack asked for it; flagged for Nick.

## 6 · Lock readings (QC149, final build 1f7c7e91)

Green: all 23 tests, both sizes. Red first: against the base build (dev's) where the lock can run there, and against a
named mutation of each lock (CSS in the page, or a source edit rebuilt and restored). Readings green/total:

| Lock | Green 1280 · 1512 | Base 1280 · 1512 | Mutation 1280 · 1512 |
|---|---|---|---|
| L1 header card is Versions' | 15/15 · 15/15 | 1/15 · 1/15 | radius 4px: 14/15 · 14/15 |
| L2 shared edges, list wider | 5/5 · 5/5 | 0/5 · 0/5 | list at the inset: 3/5 · 3/5 |
| L3 banner = With you | 7/7 · 7/7 | 0/7 · 0/7 | counts the agent's set: 5/7 · 5/7 |
| L4 chips are their sets | 18/18 · 18/18 | 1/18 · 1/18 | With you shows the agent count: 16/18 · 16/18 |
| L5 the navy bar | 15/15 · 15/15 | 7/12 · 6/12 | heard shown at 1280 · removed at 1512: 11/12 · 11/12; `L5fs` header in full screen: 12/14; `L5hd` 78px floor: 14/15 |
| L6 hover timeline | 7/7 · 7/7 | 2/5 · 2/5 | summary in a column: 4/7 · 4/7 |
| L7 band headings | 31/31 · 31/31 | 11/31 · 11/31 | rule drawn, no tint: 11/31 · 11/31 |
| L8 panel card, tabs, ‹ › Esc | 13/13 · 13/13 | 3/12 · 3/12 | › disabled: 11/13 · 11/13 |
| L9 respond in the card | 10/10 · 10/10 | writes; not run on base | Save enabled with no choice: 9/10 · 9/10 |
| L10 edit persists, Cancel restores | — · 7/7 | writes | package change counted as none: 6/7 |
| L11 log from the header | — · 9/9 | writes | a queried agent pickable: 7/9 |
| L12 Who replied? | 7/7 · 7/7 | 2/6 · 2/6 | every item "waiting": 6/7 · 6/7 |

L9–L11 write and undo in the same run (or seed and clean up, L10); every run checked the account was put back.

**Found by proving them red** (4c9bbc41): L11's "cannot be picked" passed on a broken build (the first mutation hit the
wrong list); L12 only checked headings against their own items; L8 waited a fixed 1.2s and flaked.

**L13**, the earlier suites against v149 (base: 54 passed, HR1-8 needing a capture):

| Suite | Result | Re-pointed | Retired |
|---|---|---|---|
| QC142 | 6 passed, 2 skipped | L3 (toggle read as absent), L5 (the panel's card vs the landing card) | L4 parity, L6 Cards headings |
| QC141 | 7 passed, 1 skipped | L1–L4: the sets are the view chips | L9 breakdown card's width |
| QC141.1 | 5 passed | L1–L4: chips | — |
| QC140 | 12 passed | A1 four controls, B1 radius 20, E1 "nothing spills out of its column" | — |
| QC140.1 | 5 passed | — | — |
| CSS1 | 6 passed, 2 skipped | L4 keys on rows, L5 list half | L1 Cards columns, L6 same order in both views |
| NB1 | 12 passed, 1 skipped | L1 bar order, L2 Find in the view row | L4 ruled white headings |
| HR1 | 3 passed | QC out of HR1-1…7; HR1-8 keeps the pinned QC, against a fresh base capture | the queries/analytics pair |

Each change carries its reason at the test.

## 7 · Things found on the way

- **⚠️ A RULES CEILING ON QUERY DOCUMENTS (pre-existing, in the rules, not fixed).** Measured on dev: once a query holds
  about 24 fields, a write adding a few more is refused with the ordinary permission error, whatever the fields are.
  Each field passes alone and in any pair; together they fail. On `seed-query-7` (15 fields), recording a package
  correction (9 fields) passes; adding `bookVersionId` as well is refused; after 10 more fields even `requery: true`
  alone is refused. The rules validate every stored field on each write (`isValidQuery` plus the 70-name allowlist),
  so the likely cause is Firestore's per-request expression limit. **It hits the drawer's Edit journey too** — the card
  and the drawer write the same fields. The card's save restores its snapshot on any refusal and says "Nothing was
  changed". Fixing it is a rules change (validate only the changed keys on update); prod rules are Nick's.
  L10 runs on its own seeded query (`seedQc149L10.mjs`, 16 fields) so it measures the card, not the fixture's fullness.
- **A package switch on a query with nothing recorded counted as "no change"** (both summaries empty). The card now
  compares how it went, the package and the edition (ea145c07). The drawer's Edit journey has the same summary-only
  test — reported, not changed (out of scope).
- 1f7c7e91 also added `tests/e2e/qc149Shots.measure.ts` (the screenshots), which its message does not mention.

## 8 · Screenshots

`reports/qc-v149/screens/` — screens 01–15 at 1280 and 1512, named as the refs. 09 (a response saved) and 13 (a query
logged) were written and undone in the same run. The account's data differs from the mock's.

## 9 · Integration and deploy

- **Integration branch `dev/hm31-pv4-qc149`**, cut from `origin/dev/hm31-pv4` (e629f2b0, what dev served:
  `index-BkePzY_g.js`) with `query-centre-v149` merged in: **c91ebc4a**. Its tree is byte-identical to the branch tip.
- **Re-run there:** tsc clean · production build clean (no warnings) · Vitest 10,355 passed, the same three `functions/`
  reds as the base · QC149 L1–L12 all green at both sizes · L0 green (0 styles; 16 px = 0.0016% at 1280, 0 at 1512)
  against a base reference captured in the same run.
- **Deployed to dev only** (hosting, `--config firebase.dev.json --project scriptally-dev`), from that worktree, clean at
  the pushed tip, with the served hash checked in the same command. **Dev now serves `index-Cbftfy9e.js`.**
- **Not merged to `main`.** Prod untouched; no rules or functions deployed.
