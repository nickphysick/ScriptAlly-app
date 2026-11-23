# Plumage colours v3 — report

Nick's rulings on Plumage colours v2, built: the offer flat duck egg everywhere, Revise & Resubmit striped on the two
card bands, Full requested `#d3deea`, the status label on the grid card's top right edge with the frame clipping
again, the paperclip replaced by a materials tile and hover, the agency line at 66%, and the agent's search tile at
60% teal. Pack: `design-refs/plumage-colours-v3/` (all six SHA256s matched the brief).

## False premises and things the brief did not foresee

1. **The JSON's tile does not fit the Sent box on a narrow card.** The tile is 44px wide and sits 12px from the
   box's right edge, so the box's words get 64px less room (they end 8px before the tile and are cut with an
   ellipsis, never drawn under it). Measured (PC3-5, recorded): at **1280 the card is 254px wide and 53 Sent values
   on the 50 tiled cards are cut** (nearly every "N days ago" line, e.g. "166 d…"); at 1440 (307px) 4 are cut
   ("18 Apr 2024", "16 Aug 2025" and their lines); at 1512 (331px) and 1920 (410px) none. Because of this,
   `qc154.measure.ts` **M1 at 1440 ("no fact cut, nothing wrapped") is red**, where it is green on the base. I kept
   the JSON's values exactly. Frames: `frames/chromium-sent-cut-1280.png`, `frames/chromium-sent-cut-1440.png`.
   Ruling **A** below.
2. **The paperclip's pop-up was not clip-proof everywhere, and Log a query reads it inside the card.** The
   brief asks the hover to be "never cut by the card, the grid or the page". The old pop-up lived inside the card,
   and Responses draws the card in a carousel that scrolls sideways under a CSS mask (`responses15.css .rsp15-car`),
   which cuts anything inside it. So on the page the hover is portalled to `<body>` and fixed. **But Log a query's
   own measurement (`laqV2.measure.ts`, which I may not edit) looks for the pop-up inside the card**, so in that
   preview the hover is portalled into the card itself (outside the frame) and kept inside the drawer's bounds.
   The tile and hover also keep the paperclip's `data-qc1533="tab"`/`"pop"` hooks for the same reason.
3. **Not every surface can draw Revise & Resubmit as `#d3deea`.** Every surface that knows a query's status reads
   `statusBand` and now draws R&R flat `#d3deea` (bubbles, Birds-eye, the phone, the Responses strip, the To-do
   desk, the Status group swatch). Surfaces that only know a *stage* (the Stage filter, the applied-filter chip, the
   agent card's tone, the Dashboard totals and their charts) draw Full's stage band `#b9c9da` for every Full query,
   R&R included, as they always have.
4. **There was no stylesheet restatement of Full requested to move.** `grep -ri dbe4ee src/` finds only the Contact
   list's own section fills (`contactV262.css`, `addAgentJourney.css`), which are not stage colours and are out of
   scope. They stay `#dbe4ee`.
5. **"1 material" with nothing listed.** `materialGroups` counts a package with no named pieces as one material
   (`count || 1`). The tile shows "1" and the hover shows only "With the query · ‹package›". The paperclip did the
   same; PC3-11 locks that rule rather than "chips = count".
6. **The hover keeps " · asked" on a dashed chip.** The reference drops the word ("Full manuscript" alone); the brief
   says the words are the pop-up's, and the pop-up says "Full manuscript · asked". Kept. Ruling **E**.
7. **Search does not show an offer for the agent who has one.** The frame `chromium-search-offer-agent-1512.png`
   searches "Noah", whose Offer card is on the Query Centre; search's agent result says "Not queried for Murphy's
   Day Out" and finds no query. That is search's own data, which I did not touch; the agent tile there is the new
   teal. Reported, not investigated.
8. **Older measurements were already broken on the base.** `qc154.measure.ts` M3 and M5 wait 10 minutes for elements
   no route renders any more (`.qc154-act`, the goal chart): both hang on the base build too. `rs15.measure.ts` A1G
   (header 227 vs 242.7px at 1280) and G1 (the band 40px under the header, not 30) fail identically on the base build
   (run 23 Nov on `b6bb20129`). QC157-6/7/9, QC157-11 and QC154 M2 are the known reds; QC157-6 also had to be re-pointed
   for the R&R stripes (§3), and its remaining red row is the base's.
9. **The baseline Vitest run had 14 failures, all 5-second timeouts** in tests that scan `src/` (load average 23 at
   the time). They are not counted as reds; the same files pass alone with a longer timeout.

## 1. Branch, base, commits, bundles

- **Branch** `plumage-colours-v3` (pushed), cut from `dev/main-material-icons-v1-pst1-cf1-pc1-qc167-cwu1-laq2-pc2`
  @ `b6bb20129`, which dev served as `index-D5y_IYfl.js` when I started (checked against the served bundle).

| Phase | Commit | What |
| --- | --- | --- |
| 0 | `48fbfc3bd` | the frozen refs, six SHA256s checked, enrolled |
| 1 | `48d195414` | the table: Full requested `#d3deea`; `OFFER_STRIPES`/`STRIPE_PAPER` deleted; `RR_STRIPES`; R&R on Full requested |
| 2 | `60dd37fa8` | every reader (no code change needed; two stale comments) |
| 3 | `6d045e1ae` | the grid card: frame clips, label top right outside the frame, agency 66%, paperclip → `QcMatTile` |
| 4 | `2e7301aa5` | the agent's search tile `#96aca9` / `#7c9793` |
| 5 | `0f47ab295` | `pc3.measure.ts`, the re-pointed locks, the decisions, the tile's padding fix |
| 5 | (this commit) | the report and the mutation proofs |

- **"No green" in CLAUDE.md**: its own branch `claude-md-no-green-exception` (`83b40097b`, off `origin/main`
  `d4ef22495`), one line, pushed, not merged.
- **Dev moved twice while this was built.** First to Log a query v2.1 (`dev/…-laq2-pc2-laq21` @ `43a20e68b`,
  `index-Cpnb5ALN.js`); I merged onto that as `…-laq21-pc3` @ `26fd3d05d` (pushed, gates green, **never deployed**:
  the deploy's served-hash guard stopped it). Then to `dev/…-laq2-pc2-laq21-mg1` @ `2d4125622` (that line plus `main`
  `e40ea12c0`, Main green v1), `index-Db0Di_tU.js`. This branch is merged onto it as
  **`dev/main-material-icons-v1-pst1-cf1-pc1-qc167-cwu1-laq2-pc2-laq21-mg1-pc3` @ `89df401ee`** (no conflicts).
- **Dev bundle: `index-Db0Di_tU.js` → `index-BoV5x3Ge.js`** (23 Nov), built from a clean checkout of the pushed
  `89df401ee`; the deploy refused to run unless dev still served `index-Db0Di_tU.js`, and checked the served bundle
  equals the build afterwards.
- **To back it out**: redeploy `dev/…-laq2-pc2-laq21-mg1` @ `2d4125622` (`index-Db0Di_tU.js`) from a clean checkout.
- Not merged to `main`; nothing deployed to prod.

## 2. Step 0

1. Tip `b6bb20129`; `stageColours.ts` held v2 (`OFFER_STRIPES`, `STRIPE_PAPER`, Full requested `#dbe4ee`).
2. `OFFER_STRIPES`/`STRIPE_PAPER`: read only by `stageColours.ts` itself (through `bandBackground`).
   `bandBackground`: `QcCard154` (grid band, inline only when striped) and `QcCard152` (slide-in strip); comments in
   `qcv157.css`, `todoWs58.css`, `dashboard/v2/Frame.tsx`, `qcFoot1522.ts`.
3. R&R / Resubmitted are drawn by status everywhere through `statusBand` (`QcCard154`, `QcCard152` and its bubbles via
   `qcThread152`, `RspPanel` strip, Birds-eye, `PhoneDisc`, `V3Parts`, `QueryPageV4`, `BirdsBlockV5`/`BirdsViewV5`,
   `todoWs`, `qc153 sectionSwatch`, `SearchDesk`, `Queries.tsx`, `Dash2Next`), and by stage on stage-only surfaces
   (premise 3).
4. The paperclip: `MatTab1533` (in `QcSlip153.tsx`), mounted by `QcCard154` in `.qc154-clipw` outside the frame; its
   pop-up flipped up when under 200px of window remained below the tab (`POP_FLIP_BELOW`), sat inside the card, opened
   on pointer-enter and focus, closed on leave/blur/Escape (escape layer; `drawerPopup` in the preview), named
   "N material(s)" (`materialsName`). Rendered by the Query Centre grid, Responses' carousel (`RspReadOn`, `RspEmpty`
   example) and Log a query's preview (`QcLogStages`); all three render `QcCard154`, so all three share it.
   `QcSlip153` also mounts `MatTab1533`, but no route renders `QcSlip153`.
5. The label: `span.pc2-lbl` inside `.qc154-hd` (the band), bottom −11px / left 14px, unclipped because `pc2card.css`
   set the frame `.qc154-in` to `overflow: visible`; the facts got `padding-top: 18px`.
6. Log a query v2.1 (`log-a-query-v2-1`) had not touched `QcCard154.tsx` or its stylesheets; its review copy ("Tap the
   paperclip to check what went") has since been removed on its own line.
7. Baseline on `48fbfc3bd` (refs only): `tsc` clean (with an 8 GB heap; the default 2 GB ran out of memory),
   `build:dev` clean, Vitest 13,264 passed / 14 timed out (premise 9).

## 3. Locks

**Added** — `tests/e2e/pc3.measure.ts` (Chromium; `W` suffix = WebKit), green on `0f47ab295`, 0 red rows, 4,119 rows:
PC3-1 no gradient on any offer surface (grid, slide-in, bubbles, Stage filter, Birds-eye, Responses) · PC3-2 the R&R
stripes on its grid band and strip only · PC3-3 the band per status, no outline, no gone hex (v1's, `#dbe4ee`,
`#f6f0e5`) · PC3-4 the label: place, look, outside the frame, frame clipping on, unclipped (geometry, hit test,
pixels) · PC3-5 clear of track/seal/name/facts/heading at 1280/1440/1512/1920, one height · PC3-6 no paperclip; no
"With you" or chevron · PC3-7 the tile's box, place, fill, glyph, count, name, focus; the Sent words end before it ·
PC3-8 the hover inside the window (last row, last/first column, first row), upwards with no room, above neighbours,
uncut · PC3-8R the hover on Responses' carousel · PC3-9 agency 66%, ≥ 4.5:1 on every band (lowest 4.68 on Full sent)
· PC3-10 the Full rim; the four search tiles (agent v3's) · PC3-11 hover open/close (hover, focus, leave, blur,
Escape), title, chips, dashed asked chip, StatusDot's Full mark · PC3-12 nothing under 12px. Unit:
`pc3card.test.tsx` (new), `stageColours.test.ts`, `kindColours.test.ts`, `qcThread152.test.ts`,
`todoWs58.test.tsx`, `qcCard154.test.tsx`.

**Retired** — `pc2.measure.ts` and `pc2card.test.tsx` (map: `tests/e2e/RETIRED-plumage-colours-v2.md`);
`qc154.measure.ts` M4 (paperclip pop-up) → PC3-8/PC3-11.

**Re-pointed** — `qc157.measure.ts` QC157-1 (R&R checked striped, the offer flat) and QC157-6 (the gradient card is
R&R, not the offer); `rs15.measure.ts` D1 (the label is what rises above a Responses card).

**Red first** — `mutation-proofs.jsonl`, 25 proofs, every one red, run in a disposable worktree and undone there:
8 unit (S1 offer stripes exported again · S2 R&R stripes reversed · S3 Full requested `#dbe4ee` · S4 label on the
left · S5 tile on every card · S6 frame unclipped · S7 agent tile v1 · S8 agency 58%) and 14 rendered (E1 offer
stripes back → PC3-1 · E2 R&R flat → PC3-2 · E3 R&R off the card bands on `#b9c9da` → PC3-3 · E4 frame unclipped →
PC3-4 · E4b label inside the band where the frame clips it → PC3-4 in Chromium and WebKit, by geometry (88), hit
test and pixels (9) · E5 label onto the track's row → PC3-5 · E5b quiet cards 6px taller → PC3-5 · E6 the clip wrapper
back → PC3-6 (both engines) · E7 tile 20px in → PC3-7 · E8 never opens upwards → PC3-8 · E9 agency 58% → PC3-9 ·
E10 agent tile v1 → PC3-10 · E11 Escape does nothing → PC3-11 · E12 chips at 11px → PC3-12 (both engines)). The
mutant ledgers are in `mutants/`, the mutations in `mutants/mutate.py`. Unlike v2's PC2-6, the clip proof went red:
the probe scrolls the card, never the label, and reads ancestor geometry and pixels.

**Gates** — branch: `tsc` clean; `build:dev` clean; touched unit specs green; `pc3.measure.ts` 7/7. Merged tree
(`89df401ee`): `tsc` clean, `build:dev` clean, **Vitest 13,302 passed, 0 failed** (baseline 13,264 passed + 14
timeouts); `pc3.measure.ts` (Chromium and WebKit), `laqV2.measure.ts` and `laqV21.measure.ts`: **20/20 passed**.
The one new red against the base is `qc154.measure.ts` M1 at 1440 (premise 1).

## 4. Log a query's preview and Responses

- **Both render `QcCard154`, so both get everything**: the label top right, the clipped frame, the agency at 66%,
  the tile instead of the paperclip, the R&R stripes and the flat offer.
- **Log a query's preview**: the hover is drawn in the card (premise 2) and its Escape sits above the drawer's
  (`ESC_LEVEL.drawerPopup`), as the paperclip's did. `laqV2.measure.ts` 10/10 green on the branch, including V2-6
  ("the paperclip opens on tap; Escape closes it first") and V2-10 ("Tab reaches the paperclip"), through the kept
  hooks. Frames: `chromium-laq-preview-card.png`, `chromium-laq-preview-hover-open.png` (taken by `laqV2` on this
  branch, before v2.1's copy change). On the merged tree Log a query v2.1's own `laqV21.measure.ts` passes too; it already
  expected no paperclip ("the card has no paperclip (Plumage colours v3)") and its review copy no longer mentions one.
- **Responses**: the hover is drawn on `<body>`, so the carousel's mask cannot cut it (PC3-8R, both engines). The
  label rises 4px above each card, inside the carousel's 34px top padding (`rs15` D1 green).

## 5. For Nick's ruling

- **A. The Sent box on narrow cards** (premise 1; `frames/chromium-sent-cut-1280.png`, `-1440.png`): (a) accept the
  ellipsis; (b) a smaller tile when the card is narrow (under 380px, the card's existing narrow step); (c) the tile
  moves out of the Sent box on narrow cards; (d) wrap the Sent value to two lines there (the card grows).
- **B. The facts' 18px top room, now the label is not there**: every card is 202px at 1280–1512 and 204px at 1920; with
  v1's 10px it would be 194 / 196 (measured, then put back). (a) keep 18px; (b) back to 10px (8px shorter cards).
- **C. The label against the group heading above a first-row card**: it sits 6px under the heading at every width
  (16 first-row cards read; none meets it). Frame: `chromium-list-1512.png`. (a) fine as is; (b) more room above the
  first row.
- **D. Revise & Resubmit flat `#d3deea` against Full requested on Birds-eye and pills**: off the card bands the two
  are the same colour exactly (both `#d3deea`); only the words and the track mark tell them apart there (Birds-eye
  frame `chromium-birds-eye-1512.png`). (a) accept; (b) give R&R its own flat shade off the card bands; (c) a narrow
  stripe or pattern on Birds-eye bars too.
- **E. " · asked" on the hover's dashed chips** (premise 6): (a) keep the words; (b) drop them, as the mock does.
- **F. The old paperclip code**: `MatTab1533`, `POP_FLIP_BELOW`, `tabAccent157`/`TAB_ACCENT_157`, `ACCENT_INK` and the
  `.qc1533-*` pop-up rules in `qcv1531.css` are now used only by `QcSlip153`, which no route renders. (a) delete them
  with `QcSlip153`'s mount; (b) keep for now.

## 6. Worktrees

- `ScriptAlly-pc3` (this branch) is removed once this report is pushed, and so are the two scratchpad worktrees
  (`pc3-mut`: the mutations, the base-build checks and both merges; `pc3-deploy`: the clean deploy checkout).
- The report files the older specs rewrote during my runs (`log-a-query-v2`, `qc-v154`, `query-centre-v157`,
  `responses-v15`) were backed up to `~/ScriptAlly-backups/worktree-strays-2026-11-23/pc3-run-artefacts/` and put back;
  none is committed here.
- Pushed and not merged: `plumage-colours-v3`, `claude-md-no-green-exception`, the served
  `dev/…-laq21-mg1-pc3`, and the undeployed `dev/…-laq21-pc3` (safe to delete).
