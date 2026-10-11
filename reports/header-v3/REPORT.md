# Header v3 — one panel header on every workspace page

Branch `header-v3`, three commits (A, B, C). Deployed to dev from the branch. Not merged to `main`.

## False premises, and where the build differs from the brief

1. **`/queries` shows no subline on the harness account.** The subline is "for *{manuscript}*", and the
   Query Centre only names a manuscript when the page is scoped to one book (or the account has one).
   The harness account has several and opens on all of them, so its panel has no subline. The reference
   draws one. The rule is v136's and I left it.
2. **`/queries`' number is 82 where the account has 83 queries.** The number is the bands' total
   (active + inactive), as the brief asks. Withdrawn and signed queries sit in neither band.
3. **`/manuscripts` has no count to lead with.** Its header's title is the book's title. I made it a
   title page.
4. **`/agents` had no subline to stack.** Header panel v2 removed it. The constant was still in the
   code ("Your agent data underpins everything. Collate and manage it here."), so I rendered that.
   Say if you would rather it had none.
5. **The phone Query Centre is a different page.** At 390 wide `/queries` renders the phone shell's
   own header ("83 queries out"), not this panel. The under-768 rules are in the stylesheet
   and apply wherever the panel is drawn at that width, but no lock measures them and the 390 shot
   shows the phone page.
6. **Discover, Calendar and Noteboard have no drawing.** Their masthead never rendered one. They are
   title panels with no right column.
7. **Comparable titles has no drawing either.** Its number panel is held at 260 tall by a floor.
8. **The To-do list's drawing slot is empty.** It keeps its box and draws no disc, as before.
9. **"All caught up" has no number.** When the To-do list is empty of work its headline is shown as a
   title in the number's place.
10. **Comps and Packages with no manuscript are left alone.** That header ("Add a manuscript to build
    its comp list.") is an empty state, so it keeps the header it had.
11. **The words are hidden while the count loads, as well as the number.** The brief asks for a blank
    number. An older lock (living headers LH10) forbids any headline text before the count settles,
    and the plural can change when it lands ("packages" to "package"). Both are blanks of their own
    boxes, so nothing moves.
12. **The buttons sit 26 under the number at both reference sizes**, as the brief's text says. Its
    measured note says 30, which is the wide-sheet figure.
13. **One page-level change outside the header component.** Comparable titles and Submission packages
    opened as the no-manuscript header while loading, then changed height when the data arrived
    (236 to 260 at 1280). They now pass a pending count until the manuscripts land. H8 found it.

## Base and conflicts

`origin/main` had neither `headerPanel.css` nor `qcvGlance136.css`. `header-v3` is `origin/main` plus
`origin/qc-v136` (which already contains header panel v2 and `main`). The merge was a fast-forward
to `6647b765`. No conflicts.

Baseline on that tip: tsc clean, both builds clean, Vitest 541 files, 8,358 passed, 3 skipped.
After the pack: tsc clean, both builds clean, Vitest 541 files, 8,361 passed, 3 skipped.

## The §0.3 table, as filled in

| Route | Kind | Number | Words | Subline | Drawing |
| --- | --- | --- | --- | --- | --- |
| `/queries` | number | active + inactive (82) | queries sent | for *{manuscript}*, when scoped to one book | courier disc |
| `/agents` | number | agents on file (37) | agents on file | Your agent data underpins everything. Collate and manage it here. | hawk |
| `/manuscripts/comps` | number | comp titles (3) | comp titles | the page's living sentence | none |
| `/manuscripts/packages` | number | packages (3) | packages | the page's living sentence | archivist, on a disc |
| `/todo` | number | things to do (39) | things to do | the page's living sentence | empty slot |
| `/queries/analytics` | title | — | Less guesswork, better results | Patterns, stats and insights to help you query smarter. | empty disc |
| `/agents/discover` | title | — | Discover, with the Pro pill | Verified agents matched to your manuscript — with the reasons they fit. | none |
| `/manuscripts` | title | — | the book's title | Your book, every version of it, and what goes out with it. | hawk, on a disc |
| `/todo/calendar` | title | — | Calendar | as before | none |
| `/todo/noteboard` | title | — | Noteboard | as before | none |

Every page keeps its own buttons and handlers.

## Locks: `tests/e2e/headerV3.measure.ts`

All eleven are green at 1512 × 900 and 1280 × 800. Each was run with its named mutation and went red at
its own checks (`reports/header-v3/mutation-proofs.json`, logs in `mutation-runs/`).

| Lock | Green reading | Mutation | Red reading |
| --- | --- | --- | --- |
| H1 panel | `rgb(45, 58, 80)`, radius 14, column edges, 28.0 under the sheet's top, on all ten routes | v136's open header restored | `rgba(0, 0, 0, 0)` · 0px |
| H2 number | 120 · words 34, 16 right of the number · subline on the words' left · name "82 queries sent" | subline inside the h1 | inside true |
| H3 counts | 82 = 69 + 13 · 37 = 5 + 1 + 31 · 3 = 3 cards · 3 = 3 cards · 39 = 15 + 21 + 3 | number hard-coded to 27 | 27 vs 69 + 13 |
| H4 title pages | 50, one or two lines, no number element | a number on Analytics | 1 number element |
| H5 removed | 0 stamps, 0 faces rows; "5 active, 1 closed, 31 not queried." hidden | the stamp restored | 1 stamp |
| H6 drawing | 196.0 tall, inside the panel, centred | `top: 30px` on the art | centre 249.0 vs 222.0 |
| H7 height | 260.0 on every number panel | padding-bottom 80 | 306.0 |
| H8 no jump | every route's header is the same box first seen and settled | the blank box dropped | 64 tall loading, 260 loaded |
| H9 spacing | panel to bands 28.0 · bands to link 40.0 | margin-top 80 on the bands | 80.0 |
| H10 above the fold | 199.4 clear at 900 tall, 99.4 clear at 800 | panel padding 120 | 21.4 clear |
| H11 out of scope | dashboard, account, help, plans, import equal a capture of the base build | `panel` on by default | panel true, was false |

H9 was also red on the build before part C: 40.0 and 30.0.

The empty states cannot be shown by the harness account, so they are held at unit:
`pageHeaderPanel.test.tsx`, `msv21Smoke.test.tsx`, `qcOpenHeader.test.tsx`.

## Locks retired or re-pointed

Listed in `tests/e2e/RETIRED-header-v3.md`.

- **Retired:** v136 A1, A2, A3, A4, A5. Header panel v2 A1, A2, A3, A5.
- **Re-pointed:** v136 C1 (the link is 40 under the bands, was 30). v136's shared reader and header
  panel v2's D3 read the number from the new header. Header panel v2 A4 and A6 are kept for `/agents`.
- **Already retired by header panel v2 and still retired:** Contact list v15.3 N1–N6.

Older suites re-run after the pack: see "Older suites" below.

## Older suites, re-run after the pack

| Suite | Result |
| --- | --- |
| `headerV3.measure.ts` | 5 passed |
| `headerPanelV2.measure.ts` | 14 passed, after the re-points above (first run: D3 and the readings floor failed on the old hero number) |
| `qcV136.measure.ts` | 10 passed, 5 skipped (A1–A5), after the re-points above (first run: its reader crashed on the old header) |
| `livingHeadersV3.measure.ts` | 6 passed, 2 skipped. Its first run was red on LH10: the blank number left "00" in the h1's text. Fixed in the build (premise 11) |
| `contactV15`, `contactV151`, `contactV152`, `contactV153` | all passed; skips are earlier retirements |
| `quietBar.measure.ts` | 1 passed, 5 skipped (earlier retirements) |
| `pageHeaderV2.measure.ts` | 9 passed, 10 skipped, **1 failed**: "§4.5 the switcher" times out clicking "Add a manuscript" in the sidebar's manuscript menu, which is `aria-disabled` on the harness account. The control is the sidebar's, not a header's. I did not confirm it against the base build in time, so treat it as unexplained rather than as pre-existing. |

Not re-run: `analyticsV17`, `qcV135`, `shellV2`, `inkShell` and the manuscripts suites. Any of them that reads a
header's old classes will need the same re-point.

Part C's commit also carries two fixes that belong to part A and were found after A was committed: the
blank words (premise 11) and the pending count on Comps and Packages (premise 13).

## Shots

`reports/header-v3/shots/`: the top of every workspace route at 1512 and 1280
(`<route>-1512.png`, `<route>-1280.png`), `/queries` whole at both sizes (`queries-1512-full.png`,
`queries-1280-full.png`) to set beside `design-refs/header-v3/ref-qc-1512@2x.png` and
`ref-qc-1280@2x.png`, and `queries-390.png`.

## For Nick

- **Words that read awkwardly after the number:** "3 comp titles" and "3 packages" are short beside a
  120px numeral and look a little bare. "39 things to do" and "37 agents on file" read well.
- **Drawings at 196:** the Manuscripts hawk and the Packages archivist sit on the white disc with the
  padding they had, so the drawing itself is about 168 across. The Query Centre courier and the Contact
  list hawk fill the full 196. Analytics is still an empty white disc and the To-do list an empty slot.
- **Discover's Pro pill** sits on the title's line, slate on navy. It is legible; it is small beside a
  50px title.
- **Dead CSS left in place:** the old `.cl15-*` header rules, `.qcoh-*` type rules and the stamp's
  rules are no longer reached. The stamp is kept on purpose. The rest wants a sweep.
