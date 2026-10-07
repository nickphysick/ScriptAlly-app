# Query Centre v131 — report

Ref `design-refs/query-centre/query-centre-v131.html` (SHA-256 `9a08e2646e2cb90d…c450c`, checked against the pack and enrolled in `design-refs/.refhashes.json`). Desktop only (≥768px); the phone renders the v126 page untouched (QC15). **Not pushed. Deployed to dev at Nick's request (7 Oct); prod is Nick's.**

## False premises

1. **"Your queries" has two groups by default, not three.** The 3 Oct ruling is in force: Group = Next action → **Your move · Everything else**. So QC11's "second group" is *Everything else*, which carries the same treatment as any group header.
2. **Sort has no direction.** `QcSort` is one key per order ("latest activity first", "newest first", …); nothing stores a direction. A label click therefore **chooses** the column's sort and marks it ↓; a second click cannot reverse it. Adding a direction would change the Sort logic, which the brief puts out of scope. Unsortable as asked: **Sent** (no order exists for the package or materials) and **reversal on every column**.
3. **There are no "soon" chips on the seed account.** The 83 queries split 15 plain · 7 over · 12 quiet · **0 soon** at the default scope. The soon tone is proved by the unit suite (`qcDesk.test.ts`, §5) and by the QC12 mutation; the rendered page cannot show one.
4. **"Reply due in N days" is not a Coming-up string.** The census of `comingUp()` (`lib/qcComingUp.ts`) gives: *Send partial/full in N*, *Partial/Full N over*, *Nudge in N / N over*, *Consider closing*, *Decide on offer*, *Record what you sent*. The chips class those; no new wording was invented.
5. **"Consider closing" is quiet, where v126 drew it as overdue.** It is a passive wait (the agent's silence, not the writer's lateness), so `comingTone` returns `quiet` for every close whatever its date. This is a change in what the page says, made deliberately; flagging it because a reader of v126 will notice.
6. **The row's left edge was 6px, not 3px.** v131 draws 3px inset 10px top and bottom; the v126 6px full-height edge is retired on desktop.

## Step 0

- Worktree `../ScriptAlly-ink` level with its base, tree clean apart from this pass; gates green before work began (INK8 re-pointed first — the follow-up-2 SOON tag had entered its row text; re-proved red).
- Ref hash matched the brief.
- **Weekly history is datable from data the rows already carry**, so the bars invent nothing:
  - **With you** counts entries into a with-you stage (Partial requested, Full requested, Offer, Revise & resubmit) from `QcRow.history.spans` — `stageHistory`, which reads the query document's own pipeline dates first and dated activity rungs second.
  - **With the agent** counts `sentMs` (the send date).
  - **Closed** counts `stageStartMs` of rows whose `tileCourt` is closed (Withdrawn and Signed excluded, as the desk's own membership excludes them).
  - **An undated span is skipped and counted, never placed.** The fallback span `stageHistory` draws for an undated current stage (`current && !dated`) is excluded; `deskEvents` returns the count as `undated`.
- Weeks are **Monday-start in Europe/London**, through `Intl` (`londonMidnight` resolves the offset per day, so a BST change inside the window steps by the calendar, not by 7 × 24h).

## Data sources, per section

| Section | Total | Facts | Foot | Bars count |
|---|---|---|---|---|
| With you | `rowsForTile(rows,"you")` — the desk's own membership | offers to decide · the rest "to send" | earliest `expectedMs`: **OFFER DUE** if it is an offer, else **NEXT DUE** | entries into a with-you stage |
| With the agent | `rowsForTile(rows,"agent")` | `pastExpected` · expected within [now, now+7d) and not past | **NEXT REPLY DUE** = earliest `expectedMs ≥ now` | sends |
| Closed | `rowsForTile(rows,"closed")` | `closedHow` passed · noReply | **LAST CLOSED** = latest `stageStartMs` | closes |

Seed account, default scope: With you **13** (1 offer to decide, 12 to send; NEXT DUE 4 OCT) · With the agent **56** (34 past the date, 0 due this week; NEXT REPLY DUE 15 OCT) · Closed **13** (11 passed, 2 no reply; LAST CLOSED 27 SEP). Bars: you `3,1,3,1,4,1,0,4,1,0,0,0` · agent `6,9,19,2,3,0,3,3,5,1,0,0` · closed `0,0,0,0,5,1,0,0,1,1,0,0`.

## The urgency source

The chip's text is `comingUp(card,row)` unchanged (the To-do board's bucket, `lib/qcComingUp.ts`). Its class is the new pure `comingTone(next,row,now)`: a close → **quiet** (58% ink, no fill); no date → **plain**; `expectedMs < now` → **over** (`#f8e0d8` / `#a63d2f`); within seven days → **soon** (`#f6ead0` / `#7a5a12`); later → plain. The chip pulls left 10px so its TEXT starts on the column line (QC12 measures the text, not the box).

## The bucketing fixture (QC5, `src/lib/qcDeskWeeks.test.ts`)

NOW = 2025-11-03T12:00Z, a window that crosses the 26 Oct BST change.

```
w[0]  = 2025-08-17T23:00Z  (W/C 18 AUG, BST midnight)
w[9]  = 2025-10-19T23:00Z
w[10] = 2025-10-27T00:00Z  (first GMT Monday)
w[11] = 2025-11-03T00:00Z  (this week)
with you  [0,0,0,0,1,0,0,1,0,0,1,1]
agent     [1,0,1,1,0,0,1,0,0,1,0,0]   outside the window: 2
closed    [0,0,0,0,0,0,0,0,0,0,0,1]
```

Expected values were computed by hand, not read back from the code. Mutation (Sunday-start week map) turned 4 of 8 cases red.

## Locks and mutations

`tests/e2e/qcV131.measure.ts` QC1–QC4, QC6–QC15 at 1280 / 1440 / 1710 (QC15 at 1440 and 390); QC5 is the unit suite. All fifteen proved red by their named mutation first — `reports/query-centre-v131/mutation-proofs.jsonl`, written by `tests/e2e/qcV131Mutations.sh`. Then green on the unmutated build: **15 passed**.

One mutation was too weak and was strengthened rather than the lock loosened: **qc3-wrap** at `width: 120px` left every fact on one line (the longest, "34 past the date", is ~105px at 15px type) and QC3 stayed green; at 48px it reddened at "1 offer to decide is on 3 lines".

QC14 drops a real 64×64 PNG into the slot through `page.route` and requires the pixels to change; QC15 compares against references captured from the pre-v131 build (`bd64166e`, served on its own port), refused when older than 12 hours.

### The existing suites

15 suites that read the Query Centre's desk, list, header or shell were run against the v131 build (122 tests): 91 passed, 13 skipped, 18 failed. Each failing file was rerun on the pre-v131 build (`bd64166e`, its own preview):

- **8 reds were already there before v131**, unchanged and untouched: contentGeometry (a null rect), mastheadMatrix §3.3, plateHeader PH1–PH4 ×2 and PH5 (no capture), qcMatch (6 red), QC126-2 (`a17.css` grounds, Analytics' sheet), and pageHeaderV2 §4.5 (switcher click timeout).
- **10 were caused by v131.** Five are retired because their subject is gone on desktop: QC126-4, -8, -9 and -10, and qcV96 QC1. Each names the v131 lock that now measures its claim. The rest are re-pointed because the claim still holds: QC126-11 (the footer sits flush on the list's wrapper), qcV96 QC6 (the chip hides by `visibility`, and v96's floating-card treatment is asserted only where v96 rows render), the qcV96 floor, inkFixups HC4 (the compact hero's text inset is 44), and livingHeadersV3 LH1/LH4 (the compact hero centres its stack, and its pills are a column to the right). qcV96 QC4 now scrolls the section header on screen before opening Group, because a menu that gets scrolled to closes.
- The two behaviour re-points (QC6, HC4) were proved red by mutation (`mutation-proofs.jsonl`). After the changes those four files re-run with no v131-caused red. Manifest: `tests/e2e/RETIRED-query-centre-v131.md`.

The other ~90 files that open `/queries` were not run in this pass. Most read the open card, the drawer or the Birds-eye view, none of which v131 touched.

## Art slots

Every section and group header requests one PNG and draws its icon until the file decodes (the SPA fallback returns HTML, which fails to decode, so a missing file keeps the icon — no 404 handling needed). Drop files at:

```
public/images/qc/spots/recently-updated.png   section, 52px
public/images/qc/spots/your-queries.png       section, 52px
public/images/qc/spots/group-your-move.png    group, 32px
public/images/qc/spots/group-with-agent.png   group, 32px
public/images/qc/spots/group-closed.png       group, 32px
public/images/qc/spots/group-other.png        group, 32px
```

## Deviations and notes for Nick

- **The sticky controls bar is retired on desktop.** The section header carries the controls; the group header (top 0) and the label row (top 54) are what stick.
- **The desk's initials discs are gone** (in v126 they opened queries). A section still chooses for the carousel; nothing on the desk opens a query now.
- **Mobile keeps the v126 page**, so the banner, the hawk and the blush tray are retired on desktop only and remain in the code for the phone.
- ~~The list skeleton is still v126-shaped on desktop.~~ Fixed — see *The desktop loading state* below.
- **The page guide still opens over the list** (bottom-right, "Your desk, in three bands"). Its words still hold for v131's desk, but its steps were not re-checked against the new layout. Follow-up.
- The hero is `PageHeader`'s new `compact` modifier (only with `card` + `band`); no other page passes it.

## Shots (1440)

`reports/query-centre-v131/shots/` — `{before,after,ref}-{top,desk,find,group2}-1440.png`. Before = `bd64166e` (pre-v131).

## The desktop loading state (follow-up, QC16)

The loading cover was drawing v126 rows under v131 chrome, and two worse things beside them that the follow-up note had not named:

1. **No carousel while loading**, so the list dropped **468px** when the data landed (top 535.7 → 1003.7 at 1440).
2. **The desk stated "0 offers to decide", "0 past the date"** and so on — numbers the page did not yet know, written as facts.

Now, on desktop only: `QcListSkeleton v131` is one group in the real v131 classes (54px header, the label row's real words, eight 64px rows on the five-column grid, no status edge); `QcCarouselSkeleton` is the section and its track at the loaded 424px with card-sized placeholders; the desk keeps its boxes and paints over its text (`qc13-sk`), stating nothing. Measured at 1280 and 1440: list top 1003.7 → 1003.7, carousel 424 → 424, desk 129.6 → 129.6, header / label row / row boxes and every column edge within 1px.

QC16 asserts all of that across a real load (held with the dev-only `__SA_QC_HOLD_MS`), proved red three ways: skeleton rows at 80px, the carousel skeleton's track removed, and the desk's placeholder text made visible. ⚠️ The carousel placeholder's 316px is the query card's MEASURED height (the card sizes to its content); QC16 is what fails if it drifts. The phone's skeleton is unchanged.
