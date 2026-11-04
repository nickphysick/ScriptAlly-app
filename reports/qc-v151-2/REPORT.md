# Query Centre v151.2: navy header, group cards, one colour scheme, tags, Birds-eye match (desktop)

Branch **`query-centre-v151-2`** (pushed, **not merged**), built in its own worktree `../ScriptAlly-qc1512`. Refs in
`design-refs/query-centre-v151-2/`: all 25 hashes verified against the pack before anything was built. On dev (see Dev).

## False premises

1. **"Gone quiet: Nudge →."** In the app a gone-quiet query's next move is **Consider closing** (v151.1 kept that as its
   button). This build follows the brief: the button reads "Nudge" and opens the **nudge** journey, which the panel
   already offers on every live query with the agent. Consider closing is still in the query card. **Ruled by Nick
   (4 Nov): the button stays Nudge.**
2. **Your move is not only sends and offers.** The app's Your move also holds queries just past the agent's reply date
   (inside the 28-day nudge window). The brief's Birds-eye rule ("overdue → Nudge, outlined") and "the list and
   Birds-eye match" meet there: those rows carry the **outlined Nudge**, in both views, not a navy button. Their Next
   reads "N days overdue".
3. **The Next-action grouping has an eighth group.** The app has a revision owed (Revise & Resubmit), which the mock
   does not. It is "Send your revision", navy, after "Send your partial". "Nudge" holds both the nudge-window rows and
   the gone-quiet rows (the app's `nudge` and `close` phases); "Reply due soon" is the row lines' own "Reply due" rule
   (0–6 days to the reply date).
4. **The colour table names seven statuses.** Revise & Resubmit and Resubmitted take the full's light navy; Signed
   takes the offer's sage. The brief gives no pale offer colour for watch-and-wait, so an offer bar keeps its sage.
5. **The manuscript in the banner's line.** It is the page's own scope (`qcLineTitle`, as v136 established): the Query
   Centre is not scoped by the sidebar's book, so on an account with several manuscripts and no book filter the line
   starts at "88 sent". The harness account is that case, so the screens show no manuscript.
6. **Next labels.** A gone-quiet query with no reply date at all has no label in the brief; it reads "N days no reply"
   (rust). A writer's turn with no date reads "No date yet", and a wait with no reply date "No reply date", as words.
7. **Button words.** v151.1 used the app's own words ("Send partial", "Decide on offer"). v151.2's mock and §3 say
   "Send your partial", "Send your full", "Answer the offer", so this page now says those (and "Send your revision").
   Other surfaces still read `NEXT_WORDS`.
8. **The ungrouped list's header colour** (one quick filter, No grouping, the Practice row) is not in the table: stone.
9. **"Reply due soon" never appears on the harness account** (no reply date falls in the next week), so the rendered
   lock sees the other groups; the unit test files a row into it.

## Base

`dev/qc1511-db2-title-sip` @ **3f8da853**, which dev was serving at the start (`index-zNicGhr9.js`, rebuilt and
matched). It carries v151.1 (merge 3a78b808), Dashboard v2, the share-title commits and Smart Import photos phases 1–2.

## Commits (`query-centre-v151-2`)

§1, §3, §4 and §5 share one component, one stylesheet and `Queries.tsx`, so (as in v151 and v151.1) they land as one
page commit; §2 is its own file.

| Commit | What |
|---|---|
| 289c8eff | refs (25 files, hashes verified) |
| 3db46b55 | the mock enrolled in the hash manifest |
| 5032bd06 | pure parts: `lib/qc1512.ts` (`statusKind`, `headTone`, `actionSections`, `nextNum`, `rowAct`, `rowTag`) + 8 unit tests |
| 6e090e2c | §2 the filter panel's Where it stands chips without colour squares (`plainWhere`, this panel only) |
| 11a87963 | §1 banner, §3 group cards, §4 rows, §5 Birds-eye (`QcPage151.tsx`, `qcv151.css`, `QcBirds150.tsx`, `Queries.tsx`) |
| b598eda5 | QC1512 locks, runner, mutations, shots; QC1511 L7/L9/L10 re-pointed; ledgers and screens |
| (this) | the report and the CLAUDE.md entry |

## Locks: QC1512 (`tests/e2e/qc1512.measure.ts`, emulator build, 1280 × 800 and 1512 × 900)

Readings are the same at both widths. Each lock red first against the **v151.1 build** (`QC1512_BASE=1`, an emulator
build of 3f8da853) and against its **named break** (`QC1512_MUTATE`, applied in the page). Ledgers: `ledger/` (green),
`ledger/base-*`, `ledger/mut-*`.

| Lock | Green | v151.1 build | Mutation | Under the mutation (what went red) |
|---|---|---|---|---|
| L1 banner | 8/8 | 1/8 | v151.1's plain title restored | 6/8 (navy block; white title) |
| L2 group cards | 16/16 | 5/16 | 8px row spacing restored | 9/16 (0 between rows; 22 between cards) |
| L3 header colours | 27/27 | 4/30 | every header navy | 10/27 (who, next action, status) |
| L4 tags | 5/5 | 3/5 | every row tagged | 4/5 (With the agent and Closed: no tag) |
| L5 pills | 5/5 | 1/5 | Queried grey | 3/5 (caps; Queried sand) |
| L6 next number | 6/6 | 3/6 | the v151.1 phrase restored | 3/6 (number; rust; faint) |
| L7 buttons | 7/7 | 3/7 | Birds-eye's buttons left pink | 6/7 (Birds-eye = the list) |
| L8 rows | 4/4 | 3/4 | tinted row ends restored | 3/4 (no tinted start) |
| L9 Birds-eye header | 9/9 | 6/9 | the white header restored | 7/9 (navy header; white TODAY) |
| L10 bars | 3/3 | 2/3 | the old bar tints restored | 2/3 (status colours) |
| L11 filter panel | 2/2 | 1/2 | the squares restored | 1/2 (no colour squares) |

**L12 no regression.**

| Suite | Result |
|---|---|
| QC1511 L1–L6, L8 | green at both widths (9, 7, 7, 11, 12, 21, 5) |
| QC1511 **L7 rows** — re-pointed to v151.2 §3/§4 (0 apart, 18px card corners, 68 tall, no tinted end, no Day on closed) | 7/7 · 7/7; red under its mutation (8px spacing restored): 6/7 |
| QC1511 **L9 next + action** — re-pointed to v151.2 §4 (the number and label by group; navy or Nudge, right, last) | 11/11 · 11/11; red under its mutation (the button moved into Next): 9/11 |
| QC1511 **L10 background** — re-pointed: the gaps photographed are the 22px gaps between group cards | 4/4 · 4/4; red under its mutation (doodles tiled): 2/4 |
| QC151 L1, L2, L4, L6, L10, L12 | green at both widths |
| QC151 L14, L15 (Birds-eye alignment and dress) | 666/666 and 8/8 at both widths |
| QC151 L16 (phone, 390 × 844) | 4/4: phones unchanged |

**A real fault L12 found, fixed in 11a87963:** QC151 L1 measured the table **994.9px against the page's 968 at 1280**
(the tags, the number column and the longer button words). Below 1400px the tag, the number's gap, the pill's text
padding, the date cells and the action cell now step in; measured afterwards: table 968 = page 968.

Lock faults found and fixed (not page faults): QC1511 L10 first scrolled by row index and found one card gap; it now
scrolls to each gap.

**Unit gates** on b598eda5 (tree clean): production build clean (no CSS warnings); Vitest 737 of 738 files, 11,185
passed, the one red being `src/test/firestoreTarget.test.ts` (2 tests), red on the untouched base too; tsc clean. ⚠️ tsc
**crashed once with a 2 GB heap limit** (exit 134, out of memory, not a type error) and is clean with
`NODE_OPTIONS=--max-old-space-size=8192`. ⚠️ The pure-parts commit's tsc gate ran while page edits were already in the
tree; it passed, and every later gate ran on a clean tree.

## Screens (`shots/`, beside `design-refs/query-centre-v151-2/screens/`)

| Screen | 1280 | 1512 |
|---|---|---|
| 01 top | [ours](shots/01-top-1280.png) · [ref](../../design-refs/query-centre-v151-2/screens/01-top-1280.png) | [ours](shots/01-top-1512.png) · [ref](../../design-refs/query-centre-v151-2/screens/01-top-1512.png) |
| 02 list, who it's with | [ours](shots/02-list-who-1280.png) · [ref](../../design-refs/query-centre-v151-2/screens/02-list-who-1280.png) | [ours](shots/02-list-who-1512.png) · [ref](../../design-refs/query-centre-v151-2/screens/02-list-who-1512.png) |
| 03 gone quiet, closed | [ours](shots/03-gone-quiet-closed-1280.png) · [ref](../../design-refs/query-centre-v151-2/screens/03-gone-quiet-closed-1280.png) | [ours](shots/03-gone-quiet-closed-1512.png) · [ref](../../design-refs/query-centre-v151-2/screens/03-gone-quiet-closed-1512.png) |
| 04 headers, who | [ours](shots/04-heads-who-1280.png) · [ref](../../design-refs/query-centre-v151-2/screens/04-heads-who-1280.png) | [ours](shots/04-heads-who-1512.png) · [ref](../../design-refs/query-centre-v151-2/screens/04-heads-who-1512.png) |
| 05 headers, next action | [ours](shots/05-heads-next-action-1280.png) · [ref](../../design-refs/query-centre-v151-2/screens/05-heads-next-action-1280.png) | [ours](shots/05-heads-next-action-1512.png) · [ref](../../design-refs/query-centre-v151-2/screens/05-heads-next-action-1512.png) |
| 06 headers, status | [ours](shots/06-heads-status-1280.png) · [ref](../../design-refs/query-centre-v151-2/screens/06-heads-status-1280.png) | [ours](shots/06-heads-status-1512.png) · [ref](../../design-refs/query-centre-v151-2/screens/06-heads-status-1512.png) |
| 07 next action, open | [ours](shots/07-next-action-open-1280.png) · [ref](../../design-refs/query-centre-v151-2/screens/07-next-action-open-1280.png) | [ours](shots/07-next-action-open-1512.png) · [ref](../../design-refs/query-centre-v151-2/screens/07-next-action-open-1512.png) |
| 08 status, open | [ours](shots/08-status-open-1280.png) · [ref](../../design-refs/query-centre-v151-2/screens/08-status-open-1280.png) | [ours](shots/08-status-open-1512.png) · [ref](../../design-refs/query-centre-v151-2/screens/08-status-open-1512.png) |
| 09 filters open | [ours](shots/09-filters-open-1280.png) · [ref](../../design-refs/query-centre-v151-2/screens/09-filters-open-1280.png) | [ours](shots/09-filters-open-1512.png) · [ref](../../design-refs/query-centre-v151-2/screens/09-filters-open-1512.png) |
| 10 Birds-eye, buttons shown | [ours](shots/10-birdseye-buttons-shown-1280.png) · [ref](../../design-refs/query-centre-v151-2/screens/10-birdseye-buttons-shown-1280.png) | [ours](shots/10-birdseye-buttons-shown-1512.png) · [ref](../../design-refs/query-centre-v151-2/screens/10-birdseye-buttons-shown-1512.png) |
| 11 Birds-eye hover | [ours](shots/11-birdseye-hover-1280.png) · [ref](../../design-refs/query-centre-v151-2/screens/11-birdseye-hover-1280.png) | [ours](shots/11-birdseye-hover-1512.png) · [ref](../../design-refs/query-centre-v151-2/screens/11-birdseye-hover-1512.png) |

Harness data (88 queries), not the mock's 27. Screens 04–06 fold every group, as the refs do; screen 10 forces every
Birds-eye button visible, as its ref does (in the build they appear on hover only).

## Dev

Dev moved while this was built: by the deploy it served `dev/qc1511-db2-title-sip` @ **6cf4cc85**
(`index-CMvDw8SK.js`, rebuilt and matched; it adds Smart Import photos phases 3–4 and a CLAUDE.md line, no file this
pack touches). The integration branch **`dev/qc1511-db2-title-sip-qc1512`** (ef312679) is that commit with
`query-centre-v151-2` merged in, built from a clean checkout of the tip and deployed hosting-only to dev. Served hash
re-checked immediately before deploying. **Dev now serves `index-DHeaujkr.js`.** The deploy worktree is removed.

## Left undone

- Nothing in the brief is unbuilt. The rulings above (1, 2, 3, 4, 5) are the places a reading was chosen.
- The integration branch was not run through the e2e suites after the merge (its only additions over the measured base
  are Smart Import files this page does not import).
