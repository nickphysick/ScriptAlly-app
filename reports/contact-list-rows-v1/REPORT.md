# Contact list rows v1 — report (26 Nov 2026)

Branch `contact-list-rows-v1`, cut from `phone-birds-eye-world-v1` (what dev served: `index-Bo4vXLoW.js`).
Ref: `design-refs/contact-list-rows-v1/contact-list-rows-v1.html`, sha256 `2f84f6cc…4a57` (matched; found in
`~/Downloads/contact-list-rows-v1-pack.zip`, committed and enrolled in `scripts/check-design-refs.mjs`).

## False premises (Step 0.2)

- **The list already opened A to Z by surname**, not on Query status (`DEFAULT_LIST_VIEW.sort = "surname"`). 3.3 needed no
  change; M7's "opens A to Z" passed on today's dev too, and is locked.
- **Partial and full requests already carried the rust "!"**: `stand` comes from `isYourMoveRow`, where court "you"
  (a request) is your move. 2.3 changed nothing at source; M5 now locks the "!" to exactly the your-move rows.
- Agent card v2.1's open-at-section editing **is** on this line (`setEditReq` with focus `genres` / `reply`), so the
  "+ Add …" prompts open the card at the section, ready to edit — not at its top.
- Everything else in 0.2 was as described (ContactSheet26/Row26, three columns, FitStars by the name, "No genres yet",
  StatusDot + word, agency · loc, "Find an agent or agency" with "/").

## What survived, component by component

- **ContactSheet26** — kept: the card, the pin/cap, the index row, the margin, the applied row, loading/error/none
  states, keyboard row movement, Missing details' line. Changed: the headings and `Row26`'s cells.
- **Disc26, FitStars, GenrePills, Track, StatusDot, NQ_RING** — reused unchanged. Fit stars moved to their own column.
- **ContactBar** — only `FIND_AGENT`. The shared ListBar is untouched; the "/" hint is hidden by this page's CSS.
- **sortFacts** — `rating` and `reply` unchanged; `status` rewritten (your move first, closed last).
- **contactV26 `sections`** — two new rules so grouped-by-letter lists draw in the sorted order (below).

## Commits

| sha | |
|---|---|
| `23e1aea88` | the design ref |
| `0eb111b69` | phase 1: columns and cells |
| `d8a9841a5` | phase 2: query status track and next action |
| `c7edec3fc` | phase 3: sort by column heading, A to Z default, filter wording |
| (phase 4) | measured — this report, the harness, two fixes the measurement found |

## Gates against the baseline

| | baseline (dev line) | after |
|---|---|---|
| `tsc --noEmit` | 0 errors (needs `--max-old-space-size=8192`; the default heap ran out) | 0 errors |
| `vite build` | exit 0 | exit 0, no error/warning lines |
| Vitest | 13,801 passed, 4 skipped | the touched suites (lib, agents, shell, help): 8,947 passed after two re-pointed tests; source-scan tests time out under machine load at the default timeout and pass at `--testTimeout=120000` |

## Measurement (M1–M7) — `tests/e2e/contactListRows.measure.ts`

Its own emulator account `clr@scriptally.test` (19 agents, home country GB; `tests/e2e/clrFixture.mjs`), windows 1280,
1440, 1600, 1920. Every lock asserts the 19 rows exist before measuring them.

| lock | green | red-before |
|---|---|---|
| M1 column lefts = template for the card width ±1; Fit = Agent right + gap | 640/640 | today's dev 12/88; fr-share template injected (`CLR_MUTATE=m1`) 317/640 |
| M2 no overlap, content inside its cell, headings one line, untruncated | 864/864 | (today's dev: did not reach — M1 throws first) |
| M3 Fit, Genres, Query status centred ±2 | 228/228 | centring removed (`m3`) 118/228 |
| M4 flag only for Holt (New York), titled "New York, United States"; agency alone, no city | 236/236 | (today's dev: not reached) |
| M5 your-move actions at rest in rust; others opacity 0 → 1 on hover; hover moves no row; "!" on exactly the your-move rows | 74/74 | today's dev 22/32; quiet actions forced visible (`m5`) 60/74 |
| M6 heading sorts both ways, unrated/unknown last both ways, chip agrees, Genres doesn't sort | 36/36 | today's dev: the headings don't exist; status comparator reverted in source 34/36 (Full sent ahead of your move) |
| M7 opens A to Z; chip "Surname ↑"; "Filter by name or agency"; no "/" hint | 6/6 | today's dev 3/6 (placeholder, hint, aria-sort) |

Ledgers: `ledger/` (green, and `*-mut-*.json` for each mutation). Logs: `runs/`.

**Two faults the measurement found and fixed in phase 4:**
- contactV26's `.cl26-q svg { width: 16px }` squashed the Track's 78px drawing to 16px. The track and its node now
  keep their own sizes.
- At a 1280 window the Genres column is 54px and "+ Add genres" (77px) spilled out; below a card of 980 it wraps.

## Screens

`shots/rest-1280.png`, `rest-1440.png`, `rest-1600.png`, `rest-1920.png`, `sorted-status-1600.png`.

## Not individually ruled (went in as proposed)

- "Log a query" as the hover action on not-queried, open rows (none for "Closed to queries").
- Partial/full requested carrying the "!" (already so — see premises).
- The Fit heading disabled while nothing is rated ("Fit sorts once you’ve rated your agents").
- The exact column widths.

## Questions for Nick

1. **The action words.** The brief said to word the action from the query card's Next box first. That source
   (`lib/qc1512` `rowAct`) says **"Nudge", "Send your partial", "Send your full"** (and "Close it" for a gone-quiet
   query) — not the ref's "Send a nudge" / "Send the partial" / "Send the full". I followed the brief. The agent card
   this row opens says the ref's words (`lib/agentCard` `primaryFor`), so the row and its card now disagree. Which
   words should both use?
2. **The default Letter grouping eats Genres at 1280.** The letter margin (84px) leaves Genres sought 54px at a 1280
   window, so it shows "+n" alone. The ref was drawn ungrouped. Keep Letter as the default, narrow the margin, or
   open ungrouped?
3. **Grouped by letter, two sorts needed their own sections** or the drawn order broke the sort: Fit draws "5 stars …
   Not rated"; Query status keeps your move's run of a stage apart, so the index can read "Queried 1 … Queried 12".
   Acceptable, or should a your-move run be named differently?
4. The brief's `HEADING_SORTS` "fit" is the existing star-rating key `rating` (the genre-count key `fit` is untouched
   and unused by the page). Say if you want the keys renamed.

## Process notes

- The red-before ran in a disposable sparse worktree at the pre-change commit (79 MB), because another session held
  the test slot for over an hour; the disk also dipped under the 20 GB emulator floor once.
- The brief asked for a branch; CLAUDE.md says main-direct. The brief was followed.
