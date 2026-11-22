# Query Centre v151: one table, plain sections, with Birds-eye (desktop)

Branch `query-centre-v151` (pushed), cut from what dev served at the start: `dev/…-wlc1` @ 173881b3
(`index-CNFIOSy4.js`). Refs in `design-refs/query-centre-v151/`: all 25 hashes verified before anything was built.
**Not merged to main.** Dev serves it (see Dev, below).

## False premises

1. **"W is 982 at 1280 × 800."** That assumes a 1038px sheet. This shell's sheet is 1024px at 1280, so
   W = min(1024 − 56, 1100) = **968**. The formula holds; L1 asserts the formula, and 1100 at 1512.
2. **"The tab counts and the count line use the same sources as today's header."** Today's (v150.1) header card states no
   "sent · active · heard back" line. The line uses the page's own sources: sent = the manuscript-scoped queries,
   active = those whose "where it stands" is not Closed, heard back = `bandFigures(...).heardPct` (v150.1's own figure).
3. **The default grouping is Status, not "Who it's with".** v141 §C had made Status the default. §5's Group button is
   navy "whenever the grouping isn't Who it's with", and the ref opens on Who it's with with the button white, so the
   first-visit default is Who it's with again. A grouping a writer already chose is still honoured.
4. **The ref's next-move words are the mock's.** Its "Send your partial" / "Answer the offer" are not the app's. The
   button runs the action the Next move column already ran and says that column's words ("Send partial",
   "Decide on offer", "Nudge", "Consider closing"). "Reply due" / "Waiting" are the app's own `nextLine` words.
5. **The ref's Offer glyph is a ringed dot; the app's StatusDot for Offer is a document outline.** StatusDot is
   oracle 1, so the track draws the app's glyph.
6. **"Where it stands" for No Response.** The app's status name is "Closed with no reply". In this column it reads
   "No reply" (the Filter panel's own word for it) so the column holds one line at 1280.
7. **The real data is wider than the mock at 1280.** Longer agency names and "Consider closing" needed ~1033px in a 968px
   column. See §7 truncation, below.
8. **"How it works → the existing Query Centre help guide".** The page's guide is the shared checklist (v139); the link
   opens it (and un-hides it if it was hidden). There is no single Query Centre help article to link instead.

## Base, and what it carried

`dev/…-wlc1` @ 173881b3 (`index-CNFIOSy4.js`) carried v150 and v150.1 (both ancestors), main, and the phone work
(qm1 in the branch name; the tip of `queries-mobile-v1` itself is not an ancestor, its earlier merge is). During the
run another session deployed its hero trim (`dev/…-wlc1-ht1` @ f0e1d065, `index-gq9DFqDF.js`); see Dev.

## Commits (on `query-centre-v151`)

Sections share one page component and one stylesheet, so commits are grouped by part, not one per section.

| Commit | What |
|---|---|
| f9776152 | refs (25 files, hashes verified) |
| f63b432d | **fix of my own slip**: f9776152 ran `check-design-refs --update` without a path, which dropped 11 manifest entries still on disk; restored, and only the v151 ref enrolled |
| d2a19de2 | §7 pure parts: `lib/qc151` (track, last heard, due words, next-move kind, sections, sort, `QC_FULL_SCREEN`) |
| 22309a22 | §5 the existing Filter panel inline (`QcFilterPanel151`, one `FilterInner` shared with v142's strip); the Group menu's radio rows without Rows (`RadioMenu151`); first-visit grouping Who it's with |
| aee6d378 | §9 Birds-eye props: `lead` (the track in place of the disc), `pinkAct` |
| f1350fbf | §0–§9 the desktop page (`QcPage151`, `qcv151.css`), wired in `Queries.tsx`; `QcCentre` `bodyless` |
| e557f10e | §7 agent names never truncate; Agency gives way first (Nick's ruling, below) |
| c46f3f83 | §9 Birds-eye's toolbar inside the card at 1280 (L3 found Sort 16px over) |
| 8178c37b | §2 "Your queries" holds one line at 1280 (the screens showed it wrapping); L1 checks it |
| 5457845b | §7/§9 the pinned headings and date row sit under the sheet's 12px lip (`--pin-cover`); an empty agency reads "—" |
| 8a74319b, de62cfc5, 058608a5, 7e7026cc, 818de18d, 47054285 | the QC151 locks, mutation runner, screens spec, and their fixes |
| 04c0f240 | QC150/QC1501 re-pointed and retired by name (`tests/e2e/RETIRED-query-centre-v151.md`) |

**On the record:** 058608a5 says L7 handled "No agency"; its edit never matched the source line and was not asserted, so it
changed nothing. 818de18d is the real fix. And c46f3f83 / 058608a5 were committed after a tsc run that exited 134 (out of
memory with several e2e runs on the box), because the commit was not chained to the gate. tsc re-run with a larger heap
is clean, so both are sound, but the gate did not stop them.

## §7 truncation (Nick's rulings, 3 Nov)

Agent names, Next move labels and Due never truncate. Below 1400px, Agency gives way first (to a 120px floor, ellipsis,
full name as a title); "Where it stands" second; the heading reading "Stage" third.

**Step 1 alone was needed.** Agency takes the room the other columns leave (`width: 100%; max-width: 0`), not a fixed
number tuned to one account. On the test account (88 rows) it comes out at 137px at 1280, the table exactly W, every row
54px. Steps 2 and 3 are not built.

| Truncated cells | Agent | Agency | Where it stands | Next move | Due |
|---|---|---|---|---|---|
| 1280 | 0 | 21 | 0 | 0 | 0 |
| 1512 | 0 | 0 | 0 | 0 | 0 |

Every truncated cell carries its full text as a title (L8 asserts it). **Risk, not built for:** an account with a very
long agent name could still overflow at 1280, since Agent never truncates and step 3 only wins a few pixels.

## Locks: QC151 (`tests/e2e/qc151.measure.ts`, emulator build, 1280 × 800 and 1512 × 900)

All green on v151 (final run, plus L5 alone after its floor fix). Red first against the v150.1 base build
(`QC151_BASE=1`), then each against its named break (`tests/e2e/qc151Mutate.sh`; L11 is a source break, rebuilt).

| Lock | v151 | Base (v150.1) | Mutation | Red under it |
|---|---|---|---|---|
| L1 width (+ title one line) | 15/15 · 15/15 | 1/2 · 1/2 | v150.1's width restored | 9/15 · 9/15 |
| L2 removed | 8/8 · 8/8 | red (crashed: no v151 page) | At a glance re-rendered | 7/8 · 7/8 |
| L3 toolbar | 28/28 · 28/28 | 2/6 · 2/6 | buttons lose their background | 23/28 · 23/28 |
| L4 filter panel | 15/15 · 15/15 | red (crashed: no panel) | × only closes the panel | 14/15 · 14/15 |
| L5 strip | 6/6 · 6/6 | 2/6 · 2/6 | Reset all also resets the tab | 5/6 · 5/6 |
| L6 group menu | 15/15 · 15/15 | 2/15 · 2/15 | Comfortable/Compact added | 14/15 · 14/15 |
| L7 sort | 14/14 · 14/14 | 2/14 · 2/14 | late rows placed as if parsed as dates | 3/14 · 3/14 |
| L8 rows (+ truncation, headings pin) | 10/10 · 10/10 | 7/9 · 7/9 | agency wraps | 9/10 · 8/10 |
| L9 next move | 6/6 · 6/6 | 5/6 · 5/6 | the link restored | 3/6 · 3/6 |
| L10 track | 9/9 · 9/9 | 7/9 · 7/9 | four glyphs on a closed track | 6/9 · 6/9 |
| L11 hover timeline | 6/6 · 6/6 | 2/6 · 2/6 | SOURCE: `HOVER_MS = 0` | 5/6 · 5/6 |
| L12 sign-off | 6/6 · 6/6 | 4/6 · 4/6 | shown always | 2/6 · 2/6 |
| L13 switch | 4/4 · 4/4 | 0/4 · 0/4 | filters reset on switch | 2/4 · 2/4 |
| L14 Birds-eye alignment | 666/666 · 666/666 | 246/666 · 246/666 | the list's `display:flex` reaching the track | 6/666 · 6/666 |
| L15 Birds-eye dress | 8/8 · 8/8 | 2/8 · 2/8 | navy group bars restored | 7/8 · 7/8 |
| L16 phone at 390 × 844 | 4/4 | capture | n/a (the brief gives none) | — |

Readings are 1280 · 1512. Base figures for L1, L8 and L14 were taken before those locks gained their later checks
(the title line, the truncation and pin checks, the inner-track comparison); the base build has no v151 page, so each
stays red on its population. **L10's first mutation run stayed green**: its break only touched tracks drawn after it
was installed. Fixed (7e7026cc) and re-proved. Ledgers: `reports/qc-v151/ledger/` (`base-*`, `mut-*`, and green).

**Lock faults the runs found and fixed (not page faults):** L7 read "No agency" and "—" as values; L8 read an ellipsis
cell's two boxes as two lines; L14 compared scrollers whose width an axis label can stretch (red identically on the
base, 246/666 on both); L5's floor was 7 for 6 checks; L16's sign-in waited for a sidebar a phone hides.

**Page faults the locks found:** Birds-eye's Sort 16px past the card at 1280 (L3); "Your queries" wrapping at 1280 (the
screens); the pinned rows under the sheet lip (found measuring for QC150 L10).

### L16: no regression

| Suite | Result on v151 |
|---|---|
| QC150 L7 no overlap, L8 smooth, L9 past bars, L12 open | green as they are (28, 23, 6, 7 checks each width) |
| QC150 L10 pinning | re-pointed (no navy bar: the date row pins under the sheet's lip): 3/3 |
| QC150 L11 group/sort | re-pointed (v151's Group menu and sections): 8/8 |
| QC1501 L6 hover actions | re-pointed (the Birds-eye card's edge): 8/8 |
| QC150 L6 one scale | 11/12: "6W population, 1 bar". **Identical on the base build**: the test account's data, not v151 |
| QC150 L1–L5, QC1501 L1–L5, L7 | retired: their subjects (header card, At a glance, Your queries block, navy bar, full screen) are gone. Reasons in `tests/e2e/RETIRED-query-centre-v151.md` |
| Phone (390 × 844) | QC151 L16: no v151 page, same visible elements and classes as the base build's capture |

Unit gates on every commit: tsc clean, production build clean (no CSS warnings), Vitest 730 of 731 files; the one red
file, `src/test/firestoreTarget.test.ts` (2 tests), fails identically on the untouched base.

## Screens (`reports/qc-v151/shots/`, beside `design-refs/query-centre-v151/screens/`)

| Screen | 1280 | 1512 |
|---|---|---|
| 01 top and list | [ours](shots/01-top-list-1280.png) · [ref](../../design-refs/query-centre-v151/screens/01-top-list-1280.png) | [ours](shots/01-top-list-1512.png) · [ref](../../design-refs/query-centre-v151/screens/01-top-list-1512.png) |
| 02 hover timeline | [ours](shots/02-hover-timeline-1280.png) · [ref](../../design-refs/query-centre-v151/screens/02-hover-timeline-1280.png) | [ours](shots/02-hover-timeline-1512.png) · [ref](../../design-refs/query-centre-v151/screens/02-hover-timeline-1512.png) |
| 03 filters open | [ours](shots/03-filters-open-1280.png) · [ref](../../design-refs/query-centre-v151/screens/03-filters-open-1280.png) | [ours](shots/03-filters-open-1512.png) · [ref](../../design-refs/query-centre-v151/screens/03-filters-open-1512.png) |
| 04 active strip | [ours](shots/04-active-strip-1280.png) · [ref](../../design-refs/query-centre-v151/screens/04-active-strip-1280.png) | [ours](shots/04-active-strip-1512.png) · [ref](../../design-refs/query-centre-v151/screens/04-active-strip-1512.png) |
| 05 no matches | [ours](shots/05-no-matches-1280.png) · [ref](../../design-refs/query-centre-v151/screens/05-no-matches-1280.png) | [ours](shots/05-no-matches-1512.png) · [ref](../../design-refs/query-centre-v151/screens/05-no-matches-1512.png) |
| 06 group menu | [ours](shots/06-group-menu-1280.png) · [ref](../../design-refs/query-centre-v151/screens/06-group-menu-1280.png) | [ours](shots/06-group-menu-1512.png) · [ref](../../design-refs/query-centre-v151/screens/06-group-menu-1512.png) |
| 07 closed and sign-off | [ours](shots/07-closed-and-signoff-1280.png) · [ref](../../design-refs/query-centre-v151/screens/07-closed-and-signoff-1280.png) | [ours](shots/07-closed-and-signoff-1512.png) · [ref](../../design-refs/query-centre-v151/screens/07-closed-and-signoff-1512.png) |
| 08 Birds-eye | [ours](shots/08-birdseye-1280.png) · [ref](../../design-refs/query-centre-v151/screens/08-birdseye-1280.png) | [ours](shots/08-birdseye-1512.png) · [ref](../../design-refs/query-centre-v151/screens/08-birdseye-1512.png) |
| 09 Birds-eye hover | [ours](shots/09-birdseye-hover-1280.png) · [ref](../../design-refs/query-centre-v151/screens/09-birdseye-hover-1280.png) | [ours](shots/09-birdseye-hover-1512.png) · [ref](../../design-refs/query-centre-v151/screens/09-birdseye-hover-1512.png) |
| 10 Birds-eye group menu | [ours](shots/10-birdseye-group-menu-1280.png) · [ref](../../design-refs/query-centre-v151/screens/10-birdseye-group-menu-1280.png) | [ours](shots/10-birdseye-group-menu-1512.png) · [ref](../../design-refs/query-centre-v151/screens/10-birdseye-group-menu-1512.png) |
| 11 Birds-eye Closed tab | [ours](shots/11-birdseye-closed-tab-1280.png) · [ref](../../design-refs/query-centre-v151/screens/11-birdseye-closed-tab-1280.png) | [ours](shots/11-birdseye-closed-tab-1512.png) · [ref](../../design-refs/query-centre-v151/screens/11-birdseye-closed-tab-1512.png) |

The data is the emulator harness account's (88 queries, several books), not the mock's 16.

## Where the Full screen code was left

All of it is in place and nothing on the desktop page reaches it: the button and toolbar in `QcToolbar140.tsx`, the
navy band and pinned stack in `QcList138.tsx`, `usePinList("queries", …)` in `Queries.tsx`. The hook is kept but inert:
its `routeActive` is `QC_FULL_SCREEN && …`, and `QC_FULL_SCREEN = false` in `src/lib/qc151.ts`, so nothing is
restored, the sidebar is never held and F is not bound on this page. Turning it back on is that one constant plus a button.

## Dev

- Dev served `dev/…-wlc1-ht1` @ f0e1d065 (`index-gq9DFqDF.js`, another session's hero trim) by the time v151 was ready.
  A clean build of f0e1d065 gave `index-gq9DFqDF.js`, so that is what dev held.
- Integration branch **`dev/…-wlc1-ht1-qc151`** = f0e1d065 + `query-centre-v151`, merge commit **af1e3bfb** (clean: the
  hero trim touches only the landing page). Gates on it: tsc clean, `build:dev` clean, Vitest as above. Pushed.
- Deployed hosting only, from that clean checkout, with the served hash checked in the same command:
  **dev serves `index-BxUVq9ZZ.js`.** Not merged to main; prod untouched; the landing page is unchanged by v151.
- Not re-measured against the deployed site: the locks ran on the emulator build of the same tree (a live run reads the
  dev database, which needs `ALLOW_LIVE_FIRESTORE=1`).

## Left undone, and why

- **Truncation steps 2 and 3** ("Where it stands" cells, then "Stage" as the heading): not needed on the test account.
- **Bulk selection** (ticking rows, v138 §G): v151's rows have no tick box, so the bulk bar is not on the page. The brief
  does not mention it; flagged rather than rebuilt.
- **The Birds-eye search placeholder** shortens to "Find an ager…" at 1280 in Birds-eye (the field at its 130px floor beside
  three buttons and two-digit tab counts). Nothing overlaps; the words are cut.
- **The practice row** (the guide's Pip) is drawn as a "Practice" section first, as before; the brief does not mention it.
