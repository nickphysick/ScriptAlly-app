# Contact list v25.3 — blank empty cells and one "Fill in gaps" action per row

26 Oct 2026 · branch `contact-list-v25-3` · base **`dev/db71-plad-db71f-cl25-lm2-cl251-lm3-db77-lm4-cl252` @ 2134433c** —
the branch dev served at the start (`index-Su9SiFnv.js`, confirmed by building it), which carries Contact list v25.2 ·
integration **`dev/db71-plad-db71f-cl25-lm2-cl251-lm3-db77-lm4-cl252-pk40-cl253`**, deployed to dev as **`index-BHdt78AJ.js`** ·
**NOT merged to main.** Refs: `design-refs/contact-list-v25-3/` (2 files; both SHA-256 matched).

## 1. False premises

1. **"First missing field, in this order: genres, wishlist, replies in, email, website."** Housekeeping does not count
   email or website as gaps — its five are reply time, what to send, genres, wishlist and reopening — and it orders an
   agent's gaps by POINTS (reply 6, what to send 5, genres 4, wishlist 3, reopening 1, plus boosts for a live query and
   a genre fit), not by a fixed list. As the pack allows, the button follows Housekeeping: n is its count, and the
   click lands on the agent's first gap in its order. On the bare agent that is Replies in, not Genres.
2. **"The List view's rows (normal and full screen)."** Full screen is the address book, whose rows carry a name and
   agency only — no cells to blank and no hover group. The change is to the List view's rows.
3. **"Sci-fi is cut today" on the harness account.** It isn't: every genre there is short enough to fit at both widths,
   so the fitting would pass on a monoculture. E5 writes a self-cleaning fixture (one agent with seven long genres) and
   removes it in the same run.
4. **"The button must never cover the Your query cell's text. If it does at 1280, drop the copy and website icons."**
   Dropping the icons does not stop the button itself lying over Your query at ≤1440, where the rating column it sits
   over is gone. So both: at ≤1440 a fourth, empty 132px track is kept at the row's end for the group, and the icons
   drop.
5. **v25.2 left a fault the pack does not name:** the "Closed to queries" tag stretched across the whole Your query
   cell (v25.2 made the cell a flex column, which stretches its children). E4 found it — the tag's box lay under the
   hover group at 1512 — and it is fixed here: the tag hugs its words again.

## 2. What changed (326e0666)

- **`ContactSheet24`'s row:** an empty What they want, Replies in or Your rating cell is blank; a row with no wishlist
  has no wishlist line (min-height 76); every "+ Add", "No … yet" and dash is gone from the row. "Log a query" on hover,
  "Closed to queries" and "Not queried" stay. The agent card is unchanged (its empty bars and "+ Add" rows stay).
- **The gap action:** "Fill in {n} gaps →" (`fillGapsWords`), first in the hover group (`contactV253.css`: Special Elite
  14, rust #a2452a on the group's white shape; rust fill, white text on hover and keyboard focus). n is
  `agentGapAction(hk, id)` — added beside `agentGapLine` in `lib/contactHousekeeping`, the same model the drawer and the
  panel's gap line read (unit-locked: `contactGapAction253.test.ts`). The click (`AgentList`) opens the card's EDIT
  MODE at `GAP_FOCUS[first]`, never an inline box.
- **The pills fit** (`GenrePills fit`, `shared/agentRowParts`): measured before paint with every candidate laid out,
  then only whole pills (matches first) and "+n"; re-measured when the cell's width changes.
- **≤1440 of window:** the reserved track and the dropped icons (§1.4).
- **The closed tag hugs its words** (§1.5).

## 3. Decisions made

- **No cap on the pills in the row**: v25.2's "at most three" gives way to "as many whole pills as fit".
- **The gap action opens the edit mode**, even where the first gap has an inline editor: the action is "fill in the
  gaps", plural, and the edit mode holds every one of them.
- **The hover group shows on the row's keyboard focus** as well as on hover (it already did; the gap button joins it).
- **No fixture for the bare agent**: the harness account's `clv181-bare` already has no genres, wishlist, reply time or
  email.

## 4. Locks

**Green on v25.3 and again on the integration build:** E1 16/16 · E2 108/108 · E3 7/7 · E4 4/4 · E5 6/6. Unit:
`src/lib/contactGapAction253.test.ts` (4 cases: the count equals the panel's gap line's, agent by agent; no gaps, no
action; the first gap follows the points; one gap / many gaps). Every lock proves its population first.

**Red first on the base build (`CL253_BASE=1`, v25.2):** E1 0/6 · E2 2/107 · E3 1/7 · E4 3/4 (at 1512: the stretched
"Closed to queries" tag under the hover group) · E5 4/6 (the fixture's pills run past the cell, "731, 894, 1065 past
890").

**And under each lock's own break:**

| Lock | Break | Reading |
|---|---|---|
| E1 | "No wishlist yet" shown in rows without one | "… Fill in 2 gaps → No wishlist yet"; "no wishlist, shorter row — 115.8 < 103.0" |
| E2 | the count taken from the row's empty cells (build) | "Fill in 4 gaps →" vs 2 |
| E3 | the click opens the card in view mode (build) | "edit mode — false", focus "div" |
| E4 | the group moved left | "52 rows — group 1077–1216 over text 1075–1195" |
| E5 | the pills rendered without `fit` (build) | "cl253fx-ag: 731…1705 past 890" |

E5's break had to be carried in a build: a stylesheet that widens the pills' box only makes the fit re-measure against
the content, so it stayed green — which is the fit doing its job, and is recorded rather than called a pass. E2, E3 and
E5's breaks were carried in ONE build (each touches only its own code); source restored from path-derived backups,
`git diff` empty, rebuilt. The E5 fixture is written and removed in every run (checked absent afterwards).

**L1 (on v25.3, then the integration build):** CL252 7 passed · CL251 6 · CL25 5 · QC150 25 · QC1501 15 · HR1-1…7 pass;
**HR1-8 is red on the base too** (`phone /agents`: `a: [null], b: [null]`), as since v24. QC150 L8 at 1512 went red once
on v25.3 ("1420/1328 nodes", a count inside the Query Centre's Birds-eye view, which this pack does not touch) and was
23/23 at both widths on a re-run, on v25.3 and on the base alike — timing, not a fix.

**Re-points** (a comment at each): CL252-A3 (an agent with no genres has a blank cell, not "No genres yet"), CL252-A6 (a
row without a wishlist has no line), CL252-A7 (an unrated agent's cell is blank), CL252-A8 (a row's gaps are found from
Firestore; on hover it shows the gap action, never "+ Add"), CL251-E3 (unrated is blank).

## 5. Screen (from dev, `index-BHdt78AJ.js`)

`screens/01-empties-hover-1512.png` beside the ref's: the harness account's bare agent (Wren Tallis, no genres, no
wishlist, no reply time), hovered — blank cells, no wishlist line, "Fill in 4 gaps →" first in the group. The mock draws
Eleanor Whitfield in Your move; the account has no agent in Your move with every gap.

## 6. Dev, worktrees

Dev moved twice: from `…-cl252` (2134433c, `index-Su9SiFnv.js`) at the start, to `…-cl252-pk40` (5510d729,
`index-CwJcirim.js`, Submission packages v40) when I first integrated, and — while the integration's locks ran — to
`…-cl252-pk40` @ e3a8450a (`index-Dy4CpxPZ.js`, confirmed by building it: one more packages commit, "the Draft chip
keeps its pencil"). The first deploy STOPPED on the served-hash check; the newer tip was merged in, the gates and the
key locks (CL253, CL252, QC150) re-run green, and only then deployed. Integration
`dev/db71-plad-db71f-cl25-lm2-cl251-lm3-db77-lm4-cl252-pk40-cl253` (deployed from 698c2433 as `index-BHdt78AJ.js`;
one conflict, the refs manifest: base taken, the ref re-enrolled). Gates there match the baseline (tsc 0, both builds 0,
Vitest 671 files / 10,551 tests). Worktrees `ScriptAlly-cl253`, `ScriptAlly-cl253base`, `ScriptAlly-cl253chk` and
`ScriptAlly-cl253int` removed at the end.

## 7. For Nick

1. **The gap button lands on Housekeeping's first gap, which is usually Replies in** (§1.1) — on an agent missing genres
   and a wishlist too, that is where the card opens. If you want genres first on the List, it is a different order from
   Housekeeping's and the two would then disagree about "first".
2. **Email and website are not gaps** to Housekeeping, so an agent missing only those shows no button; they
   are filled from the card's own "+ Add email" / "+ Add website" rows. If they should count, that is a change to
   Housekeeping's model.
3. **Rows now vary in height** (76 without a wishlist, ~103 with one) — the pack's intent, but the list reads less
   even than before; worth a look on your own account, where wishlists are more common.
4. **At ≤1440 the genres column is narrower** by the reserved 132px track, so fewer pills fit there.
5. Prod is untouched; nothing merged to main.
