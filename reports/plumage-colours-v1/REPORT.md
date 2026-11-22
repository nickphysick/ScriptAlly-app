# Plumage colours v1 — report

Query colours moved onto the mentor hawk's plumage, with a band per status (requested lighter than sent), a 3px
with-you outline on card bands and strips, the sheen retired, and four kind tiles in search.
Pack: `design-refs/plumage-colours-v1/` (eight files, SHA256 as briefed, enrolled with Phase 1).

## False premises, and where the code or Nick overruled the prompt

1. **The offer is navy, not gold.** Nick amended the brief mid-session ("offer is navy not gold") and ruled on the two
   values it left open: the band is the app's navy `#2a3a52`, and its text and marks are the paper `#f4eee5`. That
   overrules three baked decisions: "Offer and Signed are `#e49c54`", "text and marks on every band are ink" (the offer is
   now the one band in paper), and the JSON's `accentInk.offer` `#6b4a1e`, which does not read on the navy's edge (the
   offer's paperclip ink is the paper). The offer's other values are **derived**, which the brief otherwise forbids: tint
   `#d9dce0`, edge / mark / rim `#243247`, rimHi `#aab0ba`, mixed from the navy by the JSON's own rules for the beak
   (18% to white; darkened to 86%; 40% to white). A lock proves the rules give the pack's gold values from the beak
   first, then the navy values. Nick's ruling is asked for in §5 (A).
2. **`sc1.measure.ts` was already stale before this work.** SC1-9 reads `data-qc152="pill"`, which Query card v164 removed
   from the slide-out (the strip names the status now). It could not have been green on the base. It is retired whole
   (§4), not updated.
3. **The prompt's own premise about the R&R fixture holds**: the harness seed has one Revise & Resubmit query, so no
   fixture was added.
4. **Screen 06 shows the peek's 44px task tile grey**, while the prompt says the tiles read the table "at both sizes".
   The JSON has no size rule. The code follows the prompt: both sizes take the kind colour. Named in §5 (D).
5. **Two things the prompt calls "do not touch" read the table, so their colours moved anyway.** The agent card
   (`AgentCard262` via `lib/agentCardV2` `acColours`: its band, tint, edge and the v163 rim) and its border breath read
   `STAGE_COLOURS`. No agent card file was edited, but a partial agent card is now the breast and an offer agent card
   navy. Named in §5 (C).
6. **AUDIT.md row 7 has moved**: the slide-out pill it names was removed by v164. `STATUS_FILL` / `STATUS_PALE` still feed
   Who replied (row 13). Row 18's colours are still unreachable.
7. **`tsc` runs out of heap at the default limit in a fresh worktree** (exit 134), and a worktree without
   `functions/node_modules` reports seven `functions/` module errors. Both are environment, not code: every tsc gate here
   ran with `NODE_OPTIONS=--max-old-space-size=8192`, with the primary's `functions/node_modules` symlinked in.

## 1. Branch, base, commits, bundles

- Branch `plumage-colours-v1`, cut from `origin/main` @ 39dc3b098 (`git rev-list --count HEAD..origin/main` = 0 at Step 0).
- Step 0: `src/lib/stageColours.ts` held the slate ladder (partial `#e4ebf2`, full `#b7c9de`), the rose offer `#efcdc9`
  and `OFFER_SHEEN` / `OFFER_SHEEN_LAYER`. No stop.
- Baseline (before any edit): tsc 0 errors (with the heap and the symlink, above); `build:dev` clean; Vitest
  4 failed / 13135 passed / 4 skipped in 923 files. The four reds are pre-existing and untouched by this work:
  `src/test/firestoreTarget.test.ts` (2) and `src/lib/events.test.ts` (2).

| Phase | Commit | What |
|---|---|---|
| 1 | 3515b1392 | the refs, the table, statusBand / outline / ink, the sheen deleted, every caller moved, the table's locks |
| 2 | 2c9ef1d92 | Query Centre: grid card and slip inline status band + outline, Birds-eye bars per status, swatches |
| 3 | 1571a7971 | the slide-out card: strip band + outline, bubbles per status, paper on the navy |
| 4 | b0e81dc96 | every other reader: Dashboard, Responses, Versions, To-do desk, phone, search chips, filters |
| 4 fix | af3c69ad9 | the Materials tab's disc reads its status |
| 5 | 0c9aa9f3d | `lib/kindColours.ts` and the four search tiles |
| 6 | 8f039987d | `pc1.measure.ts`, retired and updated locks, decisions, this report |
| 4 fix | 55bd39554 | the phone query page adds no new shadow rule (Phone style census) |
| 2 fix | 62579f629 | an offer's faint track steps are faint; QC157-3 and LF4 to the navy offer |

Dev bundle before `index-DFqkcJAV.js`, after `index-e5w8GY12.js` (§6).

## 2. AUDIT.md re-walked (design-refs/stage-colours-v1/AUDIT.md, 24 in-scope rows)

| # | Now reads | Changed |
|---|---|---|
| 1 | `stageColours.ts`: the plumage table, `bandRequested`, `statusBand`, `withYouOutline` / `withYouShadow`, `bandInk` / `stageInk`, `ACCENT_INK`; `OFFER_SHEEN(_LAYER)` deleted; `bandBackground(status)` flat | yes |
| 2 | grid card `--tone` set inline by `QcCard154` from `statusBand`; the five per-stage rules in qcv154.css deleted; `[data-wy]` draws the outline | yes |
| 3 | qcv157.css foil deleted; in its place the offer's paper name, agency and track | yes |
| 4 | `TAB_ACCENT_157`: accent = the stage's edge, ink = `accentInk` (offer: paper), rest = ink 82% over white | yes |
| 5 | `sectionSwatch`: Materials requested = Partial requested band; a Status group its status band; Offers navy, its chip flat with a paper count (`--swi`, `data-offer`) | yes |
| 6 | slide-out strip: `statusBand`, `bandInk`, `[data-wy]` outline (13px top corners); `band1522` words unchanged | yes |
| 7 | **moved**: the pill was removed by v164. `STATUS_FILL` reads the table (stage → sent band) for Who replied | values only |
| 8 | `agentTint`: `statusBand` of the status the reply set; stage edge; no outline. QcNotes158's quotes read the same | yes |
| 9 | footer disc `--fdisc` = the status band | yes |
| 10 | draft outline = the stage's `mark` (new marks) | values only |
| 11 | seals navy, paper initials | no |
| 12 | composer offer summary and told ticks: the offer's new tint `#d9dce0` and edge `#243247` | yes |
| 13 | Who replied: `STATUS_FILL` (sent bands) | values only |
| 14 | Birds-eye current bar: `QcBirds150 barFill` → `statusBand`, inline; the per-stage hexes in qcv153.css deleted; an offer bar's label paper | yes |
| 15 | `stageTint` logic only | no |
| 16 | log-a-query slip: `--tone` inline `statusBand`, outline (13px), paper on the offer; `tabAccent157` | yes |
| 17 | `BREAKDOWN_COLOR`: the stages' sent bands | values only |
| 18 | `WEEK_GROUPS`: the same (still unreachable) | values only |
| 19 | Responses note tones (`noteTone`, responses15 `--st/--sb/--dp`): the stage's new tint / band / edge | values only |
| 20 | Responses strip: `stripStyle` → status band, ink, outline (square: under the mast) | yes |
| 21 | `statusFill` → `statusBand`; `V3Glyph` mark in the band's ink | yes |
| 22 | `phoneFill` → `statusBand`; disc mark in the band's ink | yes |
| 23 | confetti | no |
| 24 | feed tints (dash2Feed, df1): the new partial / full / offer tints | values only |

**New readers since 18 November** (all moved): `SearchDesk` (status chips and peek bands → status band, paper on the
offer; tiles → §Phase 5), `StageFilter` and `AppliedRow` (stage → sent band, `stageInk`, marks `tone="inherit"`),
`Dash2Next` (status band + outline on the head; `NextLead` gains `status`), `Dash2Active` (going bars; offer navy with a
paper number), `Dash3Expected` (Queried band), `QueryPageV4` (band + outline, bubbles, paper), `BirdsBlockV5` /
`BirdsViewV5` (segments → status band), `QcComposer1522` (disc → status band), `qcFoot1522` (comment), `todoWs`
(`stageVars(stage, status)`), `QcMaterials158` (disc → status band, Phase 4 fix), `qcMotion160` (rim / rimHi, no edit),
`versionsV6.css` (stage vars and chart marks), and the agent card (`AgentCard262`, `agentCardV2`: reads the table, not
edited — §5 C).

Unreachable or dead code named in AUDIT.md: left as it was. `LEGACY_TONE_FILL_153`, `RING_FILL` / `QcStageRing1531`,
`HEAD_FILL`, `discFill` (now follows `STATUS_FILL`'s new values), `STATE_FILL`, `StatusPill`, `TimelineDot`, the f12
`--state-*` set.

## 3. Surfaces that know only the stage, and what they show

Each shows the stage's **sent** band (`STAGE_COLOURS[stage].band`), so requested and sent are not told apart there:
the stage filter's segments and labels, the applied row's stage chip, the Dashboard week breakdown and its callout
(`BREAKDOWN_COLOR`, `WEEK_GROUPS`), Dashboard "How it's going" ("Asked for more" is the Full sent band), the Expected
back head (Queried), Responses' note tones (tint / band / edge: the note's pill is the tint), Versions' stage vars, Who
replied's cap (`STATUS_FILL` by status family), the agent card (out of scope). The surfaces that only knew the stage
through a status they had (strips, bands, bubbles, discs, chips, To-do desk) were moved to the status.

## 4. Locks added, retired and updated

Red-first proofs are in `mutation-proofs.jsonl` (one line per mutation: file, from, to, what ran, what failed, undone).
All were run in a disposable measurement worktree (`../ScriptAlly-pc1-mut`, detached at 0c9aa9f3d), never in this one.

**Added**
- `src/lib/stageColours.test.ts`, rewritten: the table against the JSON (the offer navy), the navy's derivation, the
  status band, the outline map, the ink, no sheen in `src/` (and no old ladder hex), the restated stylesheets, the
  Phase 2 inline bands and radii, the Phase 4 "outline on card bands and strips only" census. Proofs S1–S6.
- `src/lib/kindColours.test.ts`: the kinds against the JSON, the tile style, the four tiles in search, `#903830` only in
  the table. Proofs S7, S8.
- `tests/e2e/pc1.measure.ts` PC1-1 … PC1-7, computed colours on the rendered page; its expectations come from the JSON,
  not from `src/`, so a mutation of the table cannot move them. Proofs E1–E4 (§6 has the runs).

**Retired**
- `tests/e2e/sc1.measure.ts` (all of it; already stale since v164, §False premises 2). Replaced: SC1-2 → PC1-3;
  SC1-3 (strip) → PC1-5; SC1-5 / SC1-7 (bubbles) → PC1-6; SC1-12 (Birds-eye) → PC1-4; SC1-14 / 15 / 16 → the source
  locks in `stageColours.test.ts`. **Not replaced**: SC1-8 (seals navy), SC1-10 (footer disc), SC1-11 (no movement
  against its 18 Nov baseline), SC1-13 (marks ink — no longer true on the offer), SC1-17 (Contact list pixel-identical
  against an 18 Nov baseline). See §5 (E).
- `qc157.measure.ts` QC157-2 (the foil) → PC1-3. `qcv157.test.ts`'s four sheen locks → one no-foil lock.

**Updated** (to the new table or to the status band): `qc157.measure.ts` QC157-1, `qc163.measure.ts` (rim / rimHi now read
the table), `lf1.measure.ts` LF3 (flat offer), `qc158.measure.ts` QC158-10 (quotes by status), and the source tests
`qc1512`, `qc1533`, `qcFoot1522`, `qcThread152`, `dash3`, `dash3Cards`, `appliedRow`, `qcCard154`, `qcQuiet1541`,
`qcSlip153`, `qcViews156`, `qcNotes158`, `todoWs58`, `qcv157`.

## 5. For Nick's ruling

**A. The navy offer's derived values.** (a) Keep the derived tint `#d9dce0`, edge / mark / rim `#243247`, rimHi `#aab0ba`.
(b) Send exact values. (c) Use the app's other navies for the rim (e.g. the seal ring `rgba(42,58,82,.35)`).

**B. The offer navy sits next to two other navies.** The R&R outline is the same `#2a3a52`, and the kind tile for a task
is `#2e3f4f`. (a) Leave it: an R&R card is a grey band ringed navy, an offer is solid navy. (b) Move the R&R outline to
the offer's edge `#243247`. (c) Give the offer a lighter navy.

**C. The agent card moved with the table** (out of scope, not edited). (a) Accept: the agent card is the same colours as
the query it follows. (b) Pin the agent card to the old slate values with its own table.

**D. The peek's 44px task tile.** Screen 06 shows it grey; the code colours it, per the prompt. (a) Keep both sizes
coloured. (b) Colour the 32px list tile only.

**E. The lost SC1 locks** (seals, footer disc, no-movement, Contact list identical). (a) Rebuild them in a later pack
against today's baselines. (b) Let them go.

**F. Does Full sent sit too close to Closed?** Full sent `#b5b6c0` against Closed `#eceae6`: luminance contrast 1.68 : 1,
the wing's blue-grey against the stone's warm grey. **Full requested `#d4d4da` is closer still: 1.23 : 1** (it carries the
outline on a card band, but not on a bar or disc). For scale, the paper on the offer's navy is 9.97 : 1. On the grid card the track says closed (`is-ended`) and
the words name the outcome; on Birds-eye and the phone discs nothing else separates them but the shade.
(a) Leave it. (b) Deepen Full sent toward the wing (e.g. 55%). (c) Lighten Closed.

**G. Is the Partial requested outline strong enough at list size?** `#e8c0af` on `#f1d9cf` is a contrast of 1.24 : 1,
by design (the sent shade it is heading for); at the grid card's 3px it reads as a darker rim, as in screen 03.
(a) Leave it. (b) Use the breast's edge `#e2b09c` for the outline. (c) 4px.

**H. Rose that stayed rose.** The Dashboard's nudge-email ask (`.d3-mail`, `#f8e8e5` / `#dfb1ac`) was the old offer
tint and edge but is not a query's stage, so it did not move to navy; the dash3 lock now names it as a page colour.
(a) Leave it. (b) Give it a plumage colour.

## 6. Measurement, mutation runs and the deploy

**Green** (`npm run e2e:emu -- --project=measure tests/e2e/pc1.measure.ts`, this branch @ af3c69ad9 plus the Phase 6
files, emulator harness, 1512 × 982): 5 passed, 269 rows, 0 red. Ledgers `ledger/after-PC1-*.json`. Populations, each
proved before its assertions: 95 grid cards (Queried 38, Partial requested 8, Partial sent 10, Full requested 8, Full
sent 9, R&R 1, Offer 3, Rejected 15, No response 2, Withdrawn 1); 78 cards not with the writer; 70 Birds-eye bars with
a known status; one live Partial requested slide-out and its agent bubble; search tiles query 4, agent 12, material 3,
task 11.

**Red first** (one mutant build in the measurement worktree carrying E1–E4, `SA_PHASE=mutant`; ledgers
`ledger/mutant-PC1-*.json`): 4 failed, 1 passed (the setup). PC1-1 19 of 103 rows red (E1, and E3 on the offers),
PC1-2 17 of 40 (E2), PC1-3 3 of 7 (E3), PC1-4 13 of 72 (E1), PC1-5 1 of 4 (E1), PC1-6 1 of 3 (E1), PC1-7 3 of 33 (E4).

Two faults in my own spec were caught on the way, and both are fixed:
- The first draft imported its expected hexes from `src/lib/stageColours` and `kindColours`, so a mutation of the table
  would have moved the expectation with it and never read red. The spec now reads the pack JSON.
- The first mutant run showed `Ledger.done()` throwing on the first red ledger in a test, which hid PC1-2, PC1-3 (after
  PC1-1) and PC1-6 (after PC1-5): they never ran. `done()` now uses `expect.soft`, and the second mutant run wrote all
  seven ledgers red.

The first green attempt never measured anything: the worktree had no `.env.local`, so the harness login
(`authUser.mjs`) had no `SA_E2E_PASSWORD`. The primary's (untracked) file was linked in.

**The deploy.**
- Dev served `dev/main-material-icons-v1-pst1-cf1` @ 2be478629, confirmed by building it: `index-DFqkcJAV.js`, the
  served hash.
- Integration branch `dev/main-material-icons-v1-pst1-cf1-pc1` (pushed, tip a97f81c6f). Its first merge conflicted
  only in `design-refs/.refhashes.json` (both sides enrolled refs; resolved as the union, no ref with two hashes,
  1266 verified).
- The gates on the integration branch found three dev-line-only readers of the old table, fixed there or on this
  branch:
  - `phone/PsParts` `leadBackground` imported the deleted `OFFER_SHEEN_LAYER`. The lead card is now the stage's tint,
    flat (integration commit 0646f80c7).
  - Phone style v1's census (`phoneStyle.census.test.ts`) counted two new box-shadows and the paper hex in the phone
    sheets. The query page outline went inline and the offer's track ring reuses the existing rule (this branch,
    55bd39554). The census palette now admits `OFFER_INK`, the table's ink on the offer (0646f80c7).
  - `qc157` QC157-3 caught a real bug: an offer's faint track steps drew solid paper, because a specificity tie was
    lost. Fixed on the grid card and the slip (62579f629). lf1 LF4 counted the app's navy chrome as a stage colour,
    because the offer's band now is that navy; the lock now excludes it (same commit, and §5 B).
- Integration gates at a97f81c6f: tsc 0; `build:dev` clean. Vitest 6 failed / 13218 passed: the four known reds,
  plus `sc1source` and `timelineCopy`, which timed out at 5s under machine load and pass when run alone.
- Rendered locks at a97f81c6f: pc1 PC1-1 … PC1-7 green; qc157 QC157-1 and QC157-3, qc163 QC163-0 … 8, lf1 (all
  widths), qc158 except QC158-1/15 green.
- **Seven reds, all pre-existing:** QC157-6/7/9 ×2 ("nudged" copy), QC157-11 ×2 (geometry against its 18 Nov baseline,
  worst 3354.59px), QC158-1/15 ×2 (against the v158 baseline), QC163-W (WebKit: 0 rim rules read). Each fails
  identically on the untouched dev base 2be478629 (same values), so none comes from this work.
- Deployed hosting only, from a clean checkout of the pushed tip:
  `firebase deploy --only hosting --config firebase.dev.json --project scriptally-dev`. The served hash was checked
  inside the command (`DFqkcJAV` or stop) before deploying.
- **Dev now serves `index-e5w8GY12.js`** (before: `index-DFqkcJAV.js`).
- Not merged to `main`. Prod is Nick's.

## 7. The worktree

Removed: `ScriptAlly-pc1` (this branch's worktree; everything committed and pushed), the measurement worktree
`ScriptAlly-pc1-mut`, and the scratchpad's integration, base and deploy checkouts. Their uncommitted files were only the
screenshots and ledgers the older specs rewrite on every run. None held source changes.
