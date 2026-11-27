# Query Centre v172 — report

Branch `query-centre-v172` (cut from origin/main 7f70f99f7, the mock's own base), pushed, **not merged**.
Dev serves `dev/bew33-clr13-qc172` @ 51d872687 = what dev served before (`dev/bew33-clr13`, Birds-eye world v3.3 over
contact list rows v1.3, `index-D4Zmzamx.js`) + this branch, as **`index-C2otil_N.js`** (Query Centre code in
`AppRoot-6bD_YIYg.js`). Prod untouched.

## False premises

- `contactListRows.css` (the Agents list's 18px typewriter heading CSS) is not on origin/main; it is on the unmerged
  contact-list-rows branch. The Query Centre's heading rules stand on their own in qcv169.css.
- `ListCap` is not in lib/qcSummary; it is new with the pack (`ListCap169`, QcRows169.tsx). `whereItStands` is there.
- "Reply-date Not dated = exactly Birds-eye's Waiting, no reply date" was not true of the mock: the panel counted undated
  queries that need chasing too (6 vs 4 on the seed). Fixed (5a836a9fb) — see L5.
- The mock's overdue chip printed "12 Sept" (ref 05). The repo's one-formatter rule (dates.test) forbids it: the chip
  reads "12 Sep".
- `sha256sum` is not on this Mac; `shasum -a 256 -c SHA256SUMS` was used — every file OK.

## Commits

| Phase | SHA | What |
|---|---|---|
| 0 | fa2345b27 | refs + prompt into design-refs/query-centre-v172; tsconfig excludes design-refs (the pack carries .tsx) |
| 1 | 336d7768f | the new list: QcRow170, ListCap169, qcv169.css, lib/next169; QcMatTile `pill`; QcSlip153 exports + z z z badge |
| 2 | d460ec80b | Birds-eye: All (default), overdue chip, names on hover, "Where it stands" grouping, eyeRows(withClosed) |
| 3 | 0b49f559f | one grouping: group172 / tier172 for the list's Action grouping; lib/smart172 lands (store removed) |
| 4 | c3fb49a02 | QcSmart172 replaces QcViews156 (deleted); page state + visit memory; chips, Clear all, nothing-matches hint |
| 4 fix | 5a836a9fb | reply "Not dated" = waiting only (found by L5) |
| 5 | d60c1f960 | locks L1–L6 + red-before; screens; row probe hooks |
| fix | eef0a613d | short months through lib/dates (found by the full suite) |

**Stripped:** mock169.ts and every switch read (each hard-wired to its chosen value); Mock169Panel and `.mk169`; list
"rows" (v6) and "cards" paths; layouts 2–4; the unused journey bar; the navy index bar; the v169 card-in-row rules
and data-tint / data-wsl variants; heading colours other than deeper blush; the "As built" panel path (QcViews156 —
deleted, with railN / needYou / the railCounts import in Queries.tsx); saved views; clickable chart bars; the method
rows variant; the module store in smart172 and its unshown "Since anything happened" field. The mock's
`[data-list="ledger"]` / `[data-tl="steps"]` selectors became repeated `.qc169` classes (same specificity). 20
duplicate base selectors (the directory's lock) were folded into one rule each, later declarations winning.

Nothing from src/mockstub, vite.mock.config.ts or the mock's main/App edits was added.

## Gates — baseline vs final

| | Baseline (origin/main, fresh worktree) | Final |
|---|---|---|
| `tsc --noEmit` | 7 errors, all `functions/` packages missing in a fresh worktree | **0** (functions/node_modules linked) |
| `npm run build:dev` | clean | clean |
| `vitest run` | 14 files failed / 5 tests (9 functions-import, 4 load timeouts, 1 SDK lock) | merged dev line: **976 passed, 0 failed** |

Phases 1–3 carried one red the targeted runs missed (qcCentre's "no selector declared twice"; the qcv169.css heading
rule was declared twice from Phase 1). Folded in Phase 4.

## Locks (tests/e2e/qc172.measure.ts, emulator seed)

| Lock | Green | Red-before (one build, six mutations) |
|---|---|---|
| L1 heading row: #e8bdb4, Special Elite 18 / 16, Sent by over its column ±2px | 26/26 | heading #e8bdb5 → background fails at 1512 and 1280 |
| L2 Birds-eye opens on All, bars inside, no names column, name on hover | 6/6 | default zoom 3M → 4 fail (data-zoom=3m, 91 bars outside, 88 name cells, no label) |
| L3 overdue chip at 3M: every overdue row, centred ±2px, ≥ 40px left of today | 144/144 | chip top 30% → every row 10.4px off centre |
| L4 list and Birds-eye: same keys and order, Closed last, offer first | 6/6 | Closed first in group172 → keys differ |
| L5 Stage Queried; Not dated = Waiting, no reply date; reply + send-by never fewer | 8/8 | stage filter lets Partial/Full through → 32 later rows |
| L6 panel text 12/14/16/18/20, pills on --sp-fpill-size | 6/6 | section titles 15px → every title flagged |

Ledgers: `ledger/green-L*.json`, `ledger/red-L*.json`. Unit locks: `src/lib/smart172.test.ts` (10, red-before shown
twice), `src/lib/qcViewMemory.test.ts` (+1).

Lock-side corrections, not product changes: L3's probe first read a hidden today line as x 0 (3M from All centres on
the campaign's middle) — it now goes back to today and fails a hidden line; L6 first flagged the pills' 14.5px, which
is the shell's filter-pill token the brief requires.

## Screens — refs beside this build (reports/qc-v172/shots, emulator seed)

| Ref | This build |
|---|---|
| ![](../../design-refs/query-centre-v172/01-list-1512.png) | ![](shots/01-list-1512.png) |
| ![](../../design-refs/query-centre-v172/02-list-1280.png) | ![](shots/02-list-1280.png) |
| ![](../../design-refs/query-centre-v172/03-list-1920.png) | ![](shots/03-list-1920.png) |
| ![](../../design-refs/query-centre-v172/04-birds-all.png) | ![](shots/04-birds-all.png) |
| ![](../../design-refs/query-centre-v172/05-birds-3m.png) | ![](shots/05-birds-3m.png) |
| — | ![](shots/05b-birds-3m-today.png) |
| ![](../../design-refs/query-centre-v172/06-birds-3m-scrolled.png) | ![](shots/06-birds-3m-scrolled.png) |
| ![](../../design-refs/query-centre-v172/07-panel-set.png) | ![](shots/07-panel-set.png) |
| ![](../../design-refs/query-centre-v172/08-panel-bottom.png) | ![](shots/08-panel-bottom.png) |
| ![](../../design-refs/query-centre-v172/09-nothing-matches.png) | ![](shots/09-nothing-matches.png) |

Differences are the seed's, not the code's: the seed's campaign runs ~16 months (the mock's ~10), so All has no room
for month names and 3M around the campaign's middle is sparse; its reply dates are 230–426 days old, so at today (05b)
the chips sit left of the view. The page header is the seed account's (the mock's was compacted).

## Went in as proposed — for Nick

- Next-box wording "Wait for a reply" and "Add a reply date".
- The Group pill still reads **"Action"** while the list uses Birds-eye's groups — should it read "Where it stands"?
- Ctrl+wheel / pinch zoom steps (All · 6M · 3M · 6W at the pointer); All's +10-day right margin (and −7 days left).
- Country names map (GB → United Kingdom … seven countries; others show their code).
- Also: Birds-eye's Status grouping line reads "By stage" (the mock's).

## Notes

- With a long campaign, All shows day ticks but no month names (each month is narrower than its name).
- An undated query that needs chasing is no longer counted or let through by the reply date's "Not dated" — it shows
  under Needs chasing instead.
- QcSlip153's quiet badge is now z z z everywhere Track153 draws (not only this list).
