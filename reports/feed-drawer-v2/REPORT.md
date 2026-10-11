# Activity feed drawer v2 — typed rows, and every drawer floats 8px in

Branch `feed-drawer-v2`, two commits (A, B), cut from `origin/main` at `16ff0db8`. Deployed to dev from the
branch. Not merged to `main`.

## False premises, and where the build differs from the brief

1. **`lib/dashSeen` is not on `main`.** It was retired with the feed card. `feedEntries` still computes
   `isNew`, but nothing stores when the writer last looked, and the drawer passes `seenAt: null`. Per the
   brief, the rust "new" rule is skipped and lock B8 is not built.
2. **The feed drawer is 640 wide at 1512, not the reference's 636.** Its rule is
   `min(640px, 52% of the main column)` and I left it alone, as the brief says. At 1280 it is 536.6
   (the reference: 537).
3. **The Birds-eye sort popover already ran 22px past the viewport's right edge** (1534 against 1512; 1310
   against 1280). The viewport used to cut it; the drawer's clip would now cut it 8px sooner. It now
   hangs from its pill's right edge. This is the one change inside a drawer other than the feed's.
4. **The harness account has no offer.** B5's "an offer with `need` opens the offer mode" cannot be shown
   on the page. It is held at unit (`feedFamily.test.ts`).
5. **A housekeeping sentence can be longer than one line.** At 1280 a long name wrapped the row to 49px,
   against B4's 36. The sentence is now cut with an ellipsis. Say if you would rather it wrapped.
6. **The sticky day heading was narrower than a tinted row.** A tinted row is 12px wider than the text
   column on each side, so slivers of it showed either side of the heading as it scrolled under. The
   heading's box now reaches 12px either side; its words do not move.
7. **No shared bell or gear glyph exists.** Several files draw a bell inline; none exports one. Both
   glyphs are drawn in `Dash58Feed.tsx`, with the reference's paths.
8. **A1–A3's locks were committed with part A, B's with part B.** Part A's commit also carries the
   reference enrolment.
9. **The baseline Vitest run already has one failing file,** `functions/src/email.test.ts`, which fails
   to load on `main`. It is unchanged by this pack.
10. **One housekeeping sentence on the account reads "You added Added William Tan at …".** The words come
    from the feed's own subject resolver, which this pack does not touch. Noted, not fixed.

## Gates

| | Baseline (`16ff0db8`) | After |
| --- | --- | --- |
| `tsc` | clean | clean |
| production build | clean | clean |
| dev build | clean | clean |
| Vitest | 536 files passed, 1 failed to load; 8,319 tests | see the foot of this report |

## §0 Recon

**The three drawers, before:**

| Drawer | Rule | top / right / bottom | Radius | Width | Anchored to the old edge |
| --- | --- | --- | --- | --- | --- |
| Feed | `.d58-drawer`, `v58/dash58.css` | 0 / 0 / 0 | 0 | `min(640px, 52% of main)`; 100vw under 768 | nothing |
| Birds-eye | `.bvd`, `qcvBirdsDrawer.css` | 0 / 0 / 0 | 0 | `min(1120px, 74vw)` | the sort popover (premise 3) |
| Housekeeping | `.hdr`, `shell/halfDrawer.css` | 0 / 0 / 0 | 0 | `min(780px, 56vw)`, set inline by its caller | nothing |

Each drawer's hawk or art sits inside its header and moved with it. The feed's wash and both dims are
separate fixed elements and were not touched.

**The drawer events.** A `DrawerEvent` is `{ entry, say, tag, meta }`. The entry carries `dir`, `status`,
`state`, `activityType`, `app`, `need`, `met`, `isNew`, as the brief lists. The family reads `app`,
`activityType` and `status` only.

**Glyphs.** `StatusDot` draws at any `overrideSize` (floor 12) and takes no colour: it sets its own ink.

## Event types that fell into `closed` by default

**None on the account.** Every one of the 355 rows at "Everything" matched a row of the table. Every
`QueryStatus` has a row of its own (asserted at unit). Only an entry with no status and an activity type
outside the table would reach the default; `fellToClosed` names such an entry.

## Locks retired or rewritten

- **Retired:** `dashV58.measure.ts` A2's "a reply is a card with a state disc" and "yours is a single line".
  Held now by FD2 B1–B4. Its readings floor went from 40 to 36.
- **No spine lock existed.**
- **No HalfDrawer or Birds-eye lock asserted `top: 0` or a flush edge.** `contactV13` and `qcV126` were
  re-run after the pack: see the foot of this report.

## Locks: `tests/e2e/feedDrawerV2.measure.ts`, at 1512 × 900 and 1280 × 800

| Lock | Green reading | Mutation | Red reading |
| --- | --- | --- | --- |
| A1 float | all three drawers 8.0 / 8.0 / 8.0, radius 12, widths 640 · 1118.9 · 780 (536.6 · 947.2 · 716.8 at 1280); the corner pixel is the wash or dim | `top: 0` | 0.0 / 8.0 / 8.0; corner `rgb(42, 58, 82)` |
| A2 wash | 248 → 1512, 0 → 900, `rgba(242, 238, 232, 0.55)` | wash inset 8 | top 8, right 1504, bottom 892 |
| A3 inside | filter 997–1317, group 1098–1378, sort 1168–1438, in a drawer 385–1504 | sort popover back on its pill's left | 1264–1534 |
| B1 families | 355 rows: closed 19 · housekeeping 167 · nudge 117 · sent 25 · queried 20 · request 7; all agree with the table; tag colour is the family's; no old parts | Full requested → `sent` | "Full Requested → sent, want request" |
| B2 tinted | requests `rgb(226, 231, 239)`, white disc, 17px; every other row transparent, 15.5px | tint `sent` | `sent: rgb(226, 231, 239)` |
| B3 marks | every status row a 24px dot in `rgb(28, 19, 15)` on a 34px disc; bell 16, gear 11 | the family colour on the dot | `Rejected: rgb(124, 113, 104)` |
| B4 housekeeping | 167 rows, none over 36 tall, no tag, no meta, weight 400 | a tag rendered | 54.2 tall, tag true |
| B5 actions | 5 open, 1 met; every open one shows its action; pressing it opens the query drawer in `sent` | handler dropped | mode null |
| B6 untouched | filter, three figures, day headings and end line equal a capture of `16ff0db8` | families counted in the summary | "1 replies… 3 things… 0" against "3… 123… 1" |
| B7 fit | at 1280 no row past the drawer, no time wrapped | sentence `nowrap` | over by 39 and 191 |

B8 is not built (premise 1). No offer was on the account, so the `offer` family's colours and its journey
are held at unit only (premise 4).

## Shots

`reports/feed-drawer-v2/shots/`:
- `feed-1512.png`, `feed-1280.png` — beside `design-refs/feed-drawer-v2/ref-drawer-1512@2x.png` and `ref-drawer-1280@2x.png`. Both are read at "Everything", because the account's last 30 days hold little.
- `feed-lower-1512.png` — scrolled to a "✓ Sent on" row and the housekeeping lines, beside `ref-drawer-lower-1512@2x.png`.
- `birds-eye-1512.png`, `housekeeping-1512.png`.

## Older suites, re-run after the pack

`dashV58`, `qcV126` and `contactV13` together: 38 passed, 7 skipped, 1 failed. The failure is `qcV126`
QC126-2, a source sweep that flags colours in `analytics/a17.css` and `manuscripts/v12/msv21.css`. Neither
file is touched by this pack, and the same failure is recorded against earlier packs.

## Final gates

`tsc` clean. Both builds clean. Vitest: 537 files passed, 1 failed to load (`functions/src/email.test.ts`,
as on the baseline); 8,328 tests passed, 3 skipped.
