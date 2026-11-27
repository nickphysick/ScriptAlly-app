# Contact list rows v1.3 — report (27 Nov 2026)

Branch `contact-list-rows-v1-3`, cut from `dev/bew31-clr121` @ 2b2ec27db (what dev served: `index-CSL1bsjK.js` =
Birds-eye world v3.1 + Contact list rows v1.2.1). Ref `design-refs/contact-list-rows-v1-3/contact-list-rows-v1-3.html`,
sha256 `83f2164966996989f16ab65a99fb7e41472a825a7597ac8f516a53a455082024` — matched, committed (8dffc70d3).

## False premises

- **"The card should end smoothly" was already true on dev.** M29 (corners, rim and shadow drawn at the end of the list,
  page colour below) was green on today's dev before any change. Nothing was changed for it; M29 now guards it.
- **What scrolled above the slim bar was a window, not a constant.** With the headings pinned, their cap already covers
  the band above the slim bar, so a probe taken there (as M28 first was) sees nothing wrong. The fault shows in the
  stretch of scroll where the slim bar has appeared but the heading row has not pinned yet. At that point no cap
  is drawn, and the list's own content scrolls through the 12px above the slim bar (with the fix deleted: 9,882 px of ink
  at a depth of 320). Dev also had a second fault below the slim bar: the pin's cap stopped short of the card's rim, so the
  rim's colour (238,234,228) showed between the slim bar and the headings at x=398.
- **The ref's panel (632px) does not fit this shell at 1440×900.** Under the panel's sticky top this shell leaves 608px
  (the top bar and the slim bar above it, the beta strip dismissed). The panel's vertical rhythm is about 36px tighter than
  the ref's (section padding 8, headings 6 above their content, pairs 30 high) so it fits without scrolling (M36).
- **"Has gaps" via List health's rule: the rule has two views.** List health counts `gapsById` (every gap). The
  Housekeeping list and the old "Missing details" read `byAgent`, which hides a gap the writer deferred with "Later".
  The panel uses List health's (`gapsById`), as the brief says; an agent with no genres has a "genres" gap there.
- **M34 and M35 could only be red on dev by absence.** Dev has no Location list and no Full profile / Has gaps pair, so
  their red-before is a timeout waiting for the control (recorded below), not a wrong count.

## Commits (on `contact-list-rows-v1-3`)

| sha | what |
|---|---|
| 8dffc70d3 | the design ref |
| c84384bd3 | Phase 1 — nothing scrolls above the slim bar (its ground reaches the sheet's top); the cap spans card and rim |
| a3b4c4e9e | Phase 1 — the unit locks for both |
| 2658ca81e | Phase 2 — the smart filter panel |
| d9f35e552 | Phase 3 — v1.2.1's answers (the words; Nudge due) |
| (this) | Phase 4 — measured: harness M28 early window + `m28` mutation, red-before, screens, this report, decisions |

## Gates against baseline

| gate | baseline (Step 0) | now |
|---|---|---|
| tsc --noEmit | 0 errors | 0 errors |
| vite build | exit 0 | exit 0, no error / warning lines |
| Vitest (full, once) | 13,848 passed · 4 skipped | 13,852 passed · 4 skipped · 0 failed |
| `contactListRows.measure.ts` (emulator) | — | 24/24 tests, M1–M36 all green |

## Locks, with red-before

| lock | what it holds | red-before |
|---|---|---|
| M28 | 1440×900: from the sheet's top to the slim bar, the slim bar's ground only, both pinned (600/800/1000) and in the window before the headings pin (every 40px to 600); page colour from the slim bar to the headings; headings level with the panel | **dev** (`red-before-dev/`): "below it to the headings" red at all three depths (rim colour at x=398). **mutation** `CLR_MUTATE=m28` (the slim bar's `::after` deleted): red at depth 320, 9,882 px of ink above the slim bar (`ledger/M28-mut-m28.json`) |
| M29 | the end of the list: corners, rim, shadow, page colour below | green on dev — already satisfied |
| M30 | sections in the ref's order, headings, summaries at rest; three faceted combinations, the list exactly the matching agents | — (new panel) |
| M31 | Minimum fit: star k = fit ≥ k; Not rated disabled until a minimum, then adds the unrated | — |
| M32 | Genres: quick-pill order fixed across other choices; the inline list (inside the panel, ≤ 168, scrolls); marked letters; ↓ Enter, Esc, Backspace | — |
| M33 | Reply time: keyboard and mouse on both handles, never crossing, rows update mid-drag, focus kept, Not known on then off | — |
| M34 (+ M26) | Location: exactly the countries present, by count then name; grows to five then scrolls; never pushes anything out of reach | **dev**: timeout waiting for the Location control (no such control) |
| M35 | an agent with no genres counts as Has gaps, never Full profile | **dev**: timeout waiting for Has gaps (no such control) |
| M36 (in M24) | 1440×900, lists closed, strip dismissed: no inner scroll | first run on this branch: content 632, room 608 (the ref's own height) |
| M17, M18, M24, M25 | re-pointed to the smart panel: faceted counts, Clear all and the summary, the fit formula, no Outside / No genres yet / Missing details | — |
| M19 | status sort grouped by Letter: one Queried section; Nudge due its own section after the your-move stages, directly above Full sent | unit lock red on the previous `contactV26.ts` |
| M1–M16, M20–M23, M27 | unchanged from v1.2.1 | all green; M20 (the Query Centre's panel) still pixel-identical |

Unit: `contactListRows.test.tsx` (the slim bar's `::after`, the cap, the Outside helper gone, the Nudge due section, both
directions), `contactQcLayout.test.tsx` (the panel's sections, pairs, faceted zeros disabled, fit, reply time, genres,
location, gaps), `lib/contactPanel.test.ts` (each new key's matching; a remembered set drops v1.2's keys).

## Screens (`shots/`)

- 1440×900 at rest `rest-1440x900.png`; pinned `pinned-1440x900.png`
- the panel at rest `panel-rest.png` and as it fits `panel-compact-1440.png`; with the genre search open
  `panel-genre-search.png`; with Location open `panel-location-open.png`
- 1280×640, the panel scrolled to its bottom `panel-1280x640-scrolled.png`
- the end of the list `end-of-list-1440x900.png`

## Phase 3 answers, as built

- 3.1 The panel is not shrunk for the beta strip (no code).
- 3.2 "Send your partial" / "Send your full" in `lib/qcFoot1522` (the footer's lead), `lib/qcTimeline` (the ghost),
  `lib/queriesPhone` (was "Send the partial now" / "Send the full now") and `lib/queryActions/parking` (the chip's
  title; "Send the new version" untouched). Saved to-do titles are untouched.
- 3.3 Nudge due: your move on a waiting stage (queried, partial sent, full sent, resubmitted). Its margin draws the
  stage it waits on.

## Not individually ruled (flagged, as built)

- "Reply time" as the heading.
- Location as a dropdown with an inline list (it replaces "Outside {home}").
- "Not known" starting ON once a range is set.
- The Outside and No genres yet pills dropped.
- The gap definition: List health's `gapsById` with missing genres counted (deferred gaps count too — see above).
- The Phase 3 answers above, in particular where Nudge due sits: after the your-move stages and directly above Full sent.
  This is the place the status sort already gives those rows. Read as the very top of the list, it would sit above an
  offer and break the sort's order.

## Questions for Nick

1. Nudge due sits below the your-move stages (an offer, a revision, the full, the partial asked for) and directly above
   Full sent. Is that the "top" you meant, or should it lead the whole list?
2. The panel is ~36px tighter than the ref to fit 1440×900 in this shell. Keep that, or would you rather keep the ref's
   spacing and let the panel scroll at 900 high?
3. A gap deferred with "Later" still counts as Has gaps here (List health's count) but is hidden in Housekeeping's
   list. Should "Later" take an agent out of Has gaps?

## Dev

(filled in at deploy)
