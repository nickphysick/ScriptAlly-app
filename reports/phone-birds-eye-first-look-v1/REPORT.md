# Phone Birds-eye first look v1: the bars grow in, and Today's preview shows the next three weeks

Branch `phone-birds-eye-first-look-v1`, cut from `origin/phone-query-sheet-v1` (41365751a). There is no `phone-query-sheet-v1-1`. Main had not moved (`origin/main` 7f70f99f7 is contained). Pushed, not merged. Below 768px only.

- **Dev:** `dev/bew33-clr13-qc1722-pqs1-qc1723-bfl1` (bf98bf66c) is this branch merged onto `dev/bew33-clr13-qc1722-pqs1-qc1723`, which is Query Centre v172.3 over the query sheet, Birds-eye v3.3 and rows v1.3. It now serves **`index-CTspvepm.js`**, whose AppRoot chunk carries the first look and the preview.
- **What dev served before (`index-Bzv5jGqr.js`):** a rebuild of that branch gave a different name. Byte-comparing the two builds shows the only difference is the app's build-date stamp (`BUILD="2026-11-27"` against "2026-11-28"), with the chunk names following from it. So the served bundle is that branch.
- **The one merge conflict** was `design-refs/.refhashes.json`; both sides' entries are kept.
- **On the merged tree:** tsc exits 0; Vitest has 979 files passed, 1 skipped (980), and 13865 tests passed, 4 skipped (13869).

## False premises

1. **"28ms a row" and "about 2s" cannot both hold for a long campaign.** The harness has 88 rows. At the ref's spacing the last row would start at about 2.97s, after the two-second end. The build keeps 28ms a row whenever the last row's wipe still ends by 2s; otherwise it spaces the rows closer until it does (9.43ms for the harness's 88). See `rowStep` in `firstLook.ts`.
2. **The ref's row wipe overlaps itself.** Each piece has a 90ms minimum, so a short piece runs on past the start of the next piece. That breaks "no piece starts before the one to its left has finished" (BFL-2). The build drops the floor, so each piece gets exactly its width's share of the 560ms.
3. **The ref matches each "!" to a row by distance (within 30px).** At the fitted view, rows are a few pixels apart, so a mark can pop with the wrong row. The build gives each mark its row's id (`drawWorld`, an attribute only) and pops it with that row.
4. **The ref's preview sorts its own way** (needing action first, then by date). The brief's rule is Birds-eye's own group order, and the build follows the brief.
5. **The ref's preview row does not fit at 390.** Name 102 + 8 + bar 180 + 8 leaves 32px of the card's 330, so the ref's "your move" runs out of the card. In the build, the right-hand words keep their width and the name gives way first.
6. **The ref's 400ms shot shows full heading counts and the hawk badge's "3".** The brief has the counts ticking (they read 0 at the start and the real number by 900ms) and the badge held until the end. The build follows the brief.

## Recon

- **Where Birds-eye first renders:** `BirdsWorld` mounts whenever the Queries page shows its Birds-eye side (`QueriesV4`, `?view=birds`, or the view remembered in session storage). Its first build fits the view (`build(false)` → `fitView()`, the All level).
- **BirdsBlockV5:** it was mounted only by `TodayV5`, on the Queries tab. Its only other importer was the smoke test.
- **Group order:** `bwGroups(rows, "all", quietDays)` in `lib/birdsWorld.ts` gives Needs action (gone quiet last, then by window used), Within their window, No reply date yet, then Closed.
- **The once-a-day memory:** `localStorage["bw1.firstLook.day"]`, a local date stamp written by the app's own `firstTimeToday` (lib/phoneV41, used as is). The phone keeps its other Birds-eye view preferences there too (`bw1.hint.seen`, `bw3.folded`, `bw3.lastOpened`). There are no Firestore fields and no rules changes. Reduced motion is checked first, so it never uses up the day.

## Gates

| Gate | Baseline (before any edit) | Final |
|---|---|---|
| tsc (8 GB heap) | exit 0 | exit 0 |
| `npm run build` | exit 0 (built in 2.01s) | exit 0 (built in 1.53s) |
| `npm run build:dev` | exit 0 | exit 0 |
| Vitest | Test Files 973 passed, 1 skipped (974) · Tests 13817 passed, 4 skipped (13821) | Test Files 975 passed, 1 skipped (976) · Tests 13830 passed, 4 skipped (13834): +2 files and +13 tests, the new unit tests less the retired block's smoke tests |

## Commits

| Commit | Phase |
|---|---|
| 9ce9d84c8 | Phase 1: refs, the bars grow in |
| f13b2980c | Phase 2: Today's preview |
| c3620db76 | Phase 3: locks, screenshots |

## A. The first look (`components/phone/birds/firstLook.ts`)

- **What it ports:** `playLoad("grow2")` with the ref's timings:
  - the today line draws down over 420ms, from faint;
  - the ruler's dates fade down over 260ms each, 40ms apart;
  - rows start at 260ms + 28ms a row + 90ms a heading, closer for a long list (false premise 1);
  - each row is one linear 560ms wipe, piece by piece;
  - each "!" pops (0 → 1.35 → 1, 340ms) as its row reaches it;
  - headings fade up 6px, and their counts tick from 0 over 700ms (smoothstep).
- **When it plays:** the day's first open plays it; every other open fades the world in over 200ms, and reduced motion always gets the fade.
- **No repaints while it plays:** a resize, or data that changes during the two seconds, waits for the end.
- **A touch anywhere finishes it:** a capture-phase pointerdown on the whole of Birds-eye, so the header, the pills and the level chip work from the first frame. It jumps to the end state and repaints within the same frame.
- **The hawk badge's count and the hint** stay hidden until the end.
- **No haptics** during the animation.

## B. Today's preview (`components/phone/birds/BirdsPreview.tsx`, `lib/birdsPreview.ts`)

- **Replaces:** `BirdsBlockV5` on the phone Today page's Queries tab. Nothing else mounted the block.
- **Retired with the block:**
  - `BirdsBlockV5.tsx`;
  - Today's `__SA_PA5_BE` review aid, which fed only the block;
  - the block's CSS in `phoneV5.css` and `phoneStyle.css`.

  Kept: `.pa5-be`, `-sm`, `-sb`, `-sn` and `-l`, which the Agents tab's summary still uses. The block-only helpers in `lib/phoneV5.ts` (`cutRows`, `beWindow` and others) are left in place unused, because that file is read-only under this brief.
- **Which rows:** Birds-eye's group order (`bwGroups`), keeping queries with a reply date or an event between 14 days ago and 21 ahead, the first four.
- **"+ N more":** N is Birds-eye's open rows less those shown. It is hidden at 0, and says "query" when N is 1.
- **Rows:** both Birds-eye and the preview build theirs with the same `bwRowsOf`, moved out of BirdsWorld unchanged.
- **Each row's bar:** the full view's own pieces (`rowSegs`, or a no-date query's Queried bar to today), in solid stage colours as the ref draws them, clipped to the window. The navy line is at today, and the "!" sits at a past reply date.
- **The words on the right:** "your move", "Nd past", or the reply date.
- **Taps:**
  - the card or "See it all ›" opens Birds-eye, which plays the first look or fades;
  - a row opens Birds-eye with `?fly=<id>`, and once the world is in (after the grow-in, or straight after the fade) Birds-eye flies to and glows that row as search does, then drops `fly` from the address.
- **No queries:** Today shows day one's card instead of the preview.
- **Phone style:**
  - **Captions:** the 12px type (the axis, the bar, the words on the right) is marked `data-ps-cap`.
  - **Taps:** "See it all" is a 48px target. The 32px rows are the one exception, as the block's 28px rows were; the PA5-13 and PS1-5 exemptions are moved to them.
  - **The "!":** weight 600 (the ref has 700, and the phone allows 400 and 600 only), with an outline in place of the ref's box-shadow ring.

## Locks (`tests/e2e/phoneBirdsFirstLook.measure.ts`), measured at 390 × 784

The green pass reads 20 readings, 0 red. Each lock was red first under its own breakage, with nothing red elsewhere:

| Lock | What it holds | Deliberate breakage | Own reds |
|---|---|---|---|
| BFL-1 | The first open plays (419ms: 8 rows mid-wipe, 80 yet to start); the last wipe ends by 2s; at 2.2s nothing animates and every count is real; a second open only fades; a new day plays again | the day's memory never read | 1 |
| BFL-2 | In every row of two or more pieces (67 of 88), each piece starts as the one before ends; each row's wipe is 560ms | each piece's grow 120ms longer | 1 |
| BFL-3 | Every count reads 0 at 60ms and its number by 900ms | the counts held at 0 | 1 |
| BFL-4 | A touch at 300ms: within one frame no animation remains, the layer says done, and every count is real | the touch stopped at the window | 1 |
| BFL-5 | With reduced motion, the day's first open fades and nothing scales | reduced motion not consulted | 1 |
| BFL-6 | The preview's rows are Birds-eye's first four in the window (read off the rendered world), and "+ 66 more queries" = 70 open − 4 shown | the rows drawn in reverse | 1 |
| BFL-7 | A preview row opens Birds-eye with that row on screen, glowing, and the address no longer names it | the address's row never read | 2 |
| BFL-8 | No text under 12px in the preview or in Birds-eye mid-grow; never "overdue" or "late"; no page error | the axis at 10px | 1 |

There are also unit tests: `firstLook.test.ts` (timings, wipe order, the 2s fit, the hold and touch hooks) and `birdsPreview.test.ts` (window, order, N, pieces, words).

### Other specs this touches

| Spec | Result |
|---|---|
| Phone style (`phoneStyle.measure.ts`) | 4 tests passed; PS1-today 110 readings, PS1R 62, 0 red |
| PA5 today, sizes and words | 26, 96 and 22 readings, 0 red |
| Query sheet PQS-1 and PQS-2 (the Birds-eye doors) | 9 readings, 0 red |
| Birds-eye world (`phoneBirdsWorld.measure.ts`) | 96 readings, 1 red: BW-6, pre-existing (below) |

- **Pre-existing reds on the base,** each shown by running the base branch (`phone-query-sheet-v1`) in a throwaway checkout:
  - **PA5-2 reach: 28 red of 36 on the base too.** Once Birds-eye has been opened, the Queries page remembers it, and the world's full-screen layer covers Today, so every later tap fails. The green ledger in `reports/phone-app-v5` is from 12 Nov, before the Birds-eye world.
  - **PA5-9 view: the same 2 red on the base.** The phone's world counts 88 rows including the 18 closed; the desktop counts 70 open.
  - **BW-6, "Weeks: the ruler's marks": the same red on the base,** in the BW-4 section run alone. On 28 Nov the Weeks level shows a single mark, and the lock wants two.
- **What PA5 lost with the block:** PA5-4 to PA5-7 and their four mutations, PA5-9's block half, and the block's five campaign-state screenshots. PA5-2's Birds-eye door now uses the preview's "See it all"; its query-page door now uses a Your move row.
- **Today's first look marked as seen:** the Birds-eye world, query sheet, phone style and PA5 specs read the world at rest, so they mark today's first look as already seen before the page loads. PA5-14's reduced-motion reading on Birds-eye waits 300ms for the 200ms fade.

## Shots (`reports/phone-birds-eye-first-look-v1/shots`, `index.html`)

Each moment is the build's animations paused at the ref's time, with the counts set by the same smoothstep. All seven pairs were captured. Differences other than data (the harness has 88 rows where the ref has 20):

- **Chrome around Birds-eye is the app's:** the back and list buttons, the dock (Today, To do, +, Materials, Profile), and the header without the ref's badge (held until the end, as the brief asks). The ref's dock and header are a stand-in.
- **The counts at 150 and 400ms** read lower than the ref's; the ref shows the final numbers (false premise 6).
- **Rows grow closer together** in the build (9.43ms apart against 28ms), because the harness's list is long (false premise 1). At 1000 and 1400ms more rows are in motion at once than in the ref.
- **07, Today's preview:** it sits in the real Today page under the header and tabs, not the ref's stand-in page. The ref's tap hint and its "Back to Birds-eye" button are review-only. The rows are the harness's. The names are not cut to "…" where they fit. The "!" weight is 600.

## For Nick's ruling

1. **A long campaign's first look:** compress the rows into two seconds (as built), or let it run longer at 28ms a row (about 3.5s for 88 rows)?
2. **A preview row tapped on the day's first open:** the build lets the grow-in play, then flies (about two seconds before the row glows). Fly at once and skip the grow-in instead?
3. **PA5-2 (reach) and PA5-9 (closed rows)** have been red since the Birds-eye world. Both are measurement or behaviour questions for that work, untouched here.
4. **"+ 1 more query"** in the singular, and the line hidden when nothing more is open: both are departures from the ref's fixed wording.
