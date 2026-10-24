# Query Centre v149 — Step 0 inventory (stopped)

Worktree `../ScriptAlly-qc149`, branch `query-centre-v149`, cut from what dev serves: `dev/hm31-pv4` **e629f2b0** (`index-BkePzY_g.js`). Nothing in `src/` has changed. All 31 design-ref SHA-256s match.

## Stop condition hit

**The Versions header card and banner are page-local.** The pack says to stop here and report what lifting them would take.

- The header card is inline JSX in `src/components/versions/VersionsV2Page.tsx:249–259` (`<section className="hb">`). Its CSS is `.vv2 .hb*` in `versionsV2.app.css:90–112`.
- The banner is inline JSX at `VersionsV2Page.tsx:284–292` (`<div className="wb">`). Its CSS is `.vv2 .wb*` in `versionsV2.css:270–282`.
- Every rule is scoped under `.vv2`. Neither piece is a component with props.

**What lifting them would take:**
1. New `shell/PageTitleCard` (title, body, two actions, art) and `shell/AlertBanner` (icon, headline, line, initials, button).
2. CSS moved out of the `.vv2` scope into a shared sheet.
3. `VersionsV2Page` switched to render them, with a before-and-after geometry check proving it unchanged.

Step 3 edits Versions files, which the pack fences off.

## False premises found so far

1. **The pack's numbers are not the Versions page's.** The pack's literal values are the left column; Versions on dev is the right column.

   | Element | Pack says | Versions on dev |
   |---|---|---|
   | Card radius | 20 | 18 |
   | Card background | `#f9f7f3` | `#fbf8f4` |
   | Card padding | 26 36 28 | 30 36 |
   | Card title | 32px | 34px |
   | Banner background | `#f6e6df` | `#f8e9e2` |
   | Banner left edge | 4px | 5px |
   | Banner radius | 16 | 14 |
   | Banner icon disc | 46 | 38 |
   | Banner headline | 21px | 17px |

   L1 asserts a match with Versions, so the pack contradicts itself. The oracle order says Versions wins.
2. **There is no shared `QueryCard` extracted in v142.** Two components draw the card from `src/marketing/heroCard.css`'s `.mk-lc*` classes:
   - the landing page's own `src/marketing/HeroCard.tsx`;
   - the QC's `centre/QcCards142.tsx` (`QcCard142`), which sits inside the Cards view the pack deletes.

   `src/components/queries/QueryCard.tsx` is an older, unrelated card. So "the shared QueryCard stays" has nothing to keep. The panel would use `QcCard142`, moved out of the Cards view, or a new shared component.
3. **Query notes aren't a single field.** The panel's Notes tab is the journal: `journalEntries` filtered by `queryId`, one entry per note, with a count pill. A "single text field that saves on blur" doesn't map onto a list of entries. I need a ruling: a new text field on the query (a rules change), or the journal with an add field.
4. **The header art is the hawk-at-desk on dev's QC, but on the left.** The pack puts it at the right of the card, which matches the mock. Not a conflict, just noted.

## Inventory

| Thing | Where |
|---|---|
| Current header | `centre/QcHeader138.tsx` with `QcWhereCard` (`QcWhere141.tsx`, the `.qsc` breakdown) passed as `chart`, built at `Queries.tsx:5210` |
| List | `centre/QcList138.tsx`; the bar is `QcToolbar140` via `QcBand140`, mounted at `Queries.tsx:7412–7460` |
| Query panel | `queries/QueryPanel.tsx` inside `queries/QueryPanelHost.tsx` (`Queries.tsx:7575`, `:7670`); tabs Tracking · Agent · Notes |
| Record a response, no query | App's interception (`App.tsx:385`) → `openResponsePicker()` (the panel's "Who replied?", query panel v2 §E), else `openQueryDrawer({ mode: "resp" })` |
| Record a response, one query | The query drawer's `resp` journey (`queryActions/`, `lib/queryActions/entry.ts`); `RespondDesk.tsx` also exists |
| Edit query | The drawer's `edit` journey (D7) |
| Log a query | `App.tsx:371` seeds `createQuerySeed` and navigates to `/queries`; the page's inline create mode (`createDraft`, `QueryLogSheet`) saves through `addQuery` |
| Cards view only | `QcCards142.tsx` (+ `QcCardsSkeleton`), `qcv142.css`, `qcCards142.test.ts`, `qcListView` state and the `view` field in `qh.qc.view` (`lib/qcViewMemory.ts`), the switch in `QcToolbar140`, QC142 L4–L6, CSS1 L1/L4/L5 and the Cards half of L6–L7, NB1 L1's switch reading |

The base carries v142, `cards-sort-search-v1` and NB1 (`navy-bar-address-book-v1`) Part A, all checked as ancestors of e629f2b0. So this pack builds on NB1 Part A and re-points its QC locks.
