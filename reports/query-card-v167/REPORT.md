# Query card v167 — ghost bars, a slimmer Agent tab, the agent's profile from the card

Ref: `design-refs/query-card-v167/query-card-v167.html` (SHA256 in `design-refs/query-card-v167/SHA256`, de4abb47…e497).
Branch: `query-card-v167` (cut from `dev/main-material-icons-v1` @ e0ed0becd, what dev served at the start). NOT merged to main.
Dev: see "Dev bundle" at the foot.

## False premises (read these first)

1. **"The tabs fold mid-journey"**: they did fold. While a journey's composer was open, the tab row folded away with the book, so no tab was there to open a profile from. **Nick ruled: keep the tabs visible.** The book still folds. The fold rule now applies only to `.qc152[data-j]:not([data-qc167-jc])`.
2. **"The composer shows something derived from the agent's reply time"**: nothing in the composer reads the agent's weeks except the thread draft, through `agentWeeks`. A profile save mid-journey therefore changes nothing on the waiting step.
3. **"`materialsWantedFromRows` round-trips what is stored"**: it doesn't. It drops "Author bio" and "Full manuscript". `lib/qcAsks167` keeps both:
   - Author bio becomes a ticked suggestion under Something else, written back as Other text, which the classifier reads as Author bio again.
   - Full manuscript is carried through as stored.
   - Extra legacy sample units ride along untouched.
4. **"Saving the reply time touches only the agent"**: `commitCardSave`'s reply-time fan-out also writes deadline fields to the agent's queries. That behaviour already existed and v167 reuses the save path unchanged. Lock 10's "nothing written to the query" therefore checks the query's status and activity log, not every field.
5. **The ref's seal and small labels use 10–11px.** The 12px floor wins, so the seal is set at 12px.
6. **The ref's "+ Add how"**: kept as the ref has it. The app had no existing words for this, so rule 2 (the app's words win) didn't apply.

## Step 0

- The 0.5 gate passes through `commitCardSave` (`lib/agentCardSave`), the agent card's single save path with snapshot undo. v167 adds no new save path.
- A journey's answers live in `QcComposer1522`'s internal state, so they survive only while it stays mounted. The profile drawer hides the composer (`.qc152[data-qc167-prof] … [data-qc1522="composer"]{display:none}`) instead of unmounting it.
- `SampleControl` had no way to hide its "From the opening / A specific section" row. One prop was added, `openingOnly` (allowed by the brief).

## Commits

| sha | phase |
|---|---|
| d309157db | 0 — the frozen design ref |
| 3245b8bf5 | 1 — ghost bars on the Agent, Materials and Notes tabs |
| 7c28b9bee | 2 — the slimmer Agent tab and the full-card row |
| 45c1b10d8 | 3 — the profile drawers: band, reply time, takes queries; save, toast, Undo |
| 3f9030e8a | 4 — the asks drawer: expand in place, the sample picker, the encoder |
| 7632f156a | 6 (part 1) — retirements |
| 548ff7f3f | 5 + 6 (part 2) — browser locks L1–L13, their seed, two fixes they found |
| 26bd2598e | 6 (part 3) — QC158's Agent and Notes locks re-pointed |
| c14619067 | frames, Chromium and WebKit at 1512 |

Phase 5 (mid-journey) code landed with phase 3, because the drawer and the waiting journey are one state in `QcCard152`. Its lock, L10, landed with the measure.

## Locks: red, then green

All in `tests/e2e/qc167.measure.ts` and measured by layout sizes (`offset*` summed up to the card), because the panel leans. `QC167_TAG=mutant` runs each lock under ONLY its own named mutation. Ledgers are `ledger/mutant-L*.json` (red) and `ledger/after-L*.json` (green).

| lock | what it holds | mutation that turned it red |
|---|---|---|
| L1 | rest, hover and focus are the same layout on all three tabs | M1: the "+ Add" words take their own room (display swap) |
| L2 | the same parts in the same order whether Nothing, Some or Everything is recorded | M2: an empty section hidden |
| L3 | no "Nothing saved yet" or "Nothing recorded"; ghost bars 12px | M3: the empty sentence back, bars at 10px |
| L4 | tiles 86px before and after a save; "About 26 weeks" on one line | M4: tile height auto, value allowed to wrap |
| L5 | no Copy email, website, wishlist, Edit these details or "You sent everything"; the full-card row opens the agent card | M5: Copy email back on the tab |
| L6 | the reply-time drawer is the WeekSlider; Unknown saves null | M6: four fixed week buttons in place of the slider |
| L7 | the sample is SampleControl, units and amount only; saves "First 4 chapters" through the encoder; the full card shows it | M7: a fixed "First 5 pages" button |
| L8 | every drawer: the band, "Save to profile", the toast "Saved to Evie's profile", Undo restores every field | M8: the button says "Save" |
| L9 | a save changes the agent once, and the agent's other query shows it | M9: Cancel pressed instead of Save |
| L10 | mid-journey on four footers (send, reply, offer, reopen) × Save/Back/Esc: band says the journey waits, "Back to “…”", same step, same answers, focus restored, nothing written to the query | M10: the journey cancelled before the profile opens |
| L11 | both tiles open at 1512×900 and 1280×720: no card overflow, header in view | M11: the drawer's height caps removed |
| L12 | expanding a tile moves nothing above it; reduced motion animates nothing | M12: the expand transitions forced under reduced motion |
| L13 | nothing new under 12px and no new uppercase mono label (the WeekSlider's own lettering excluded, deviation 3) | M13: the band line at 10px uppercase mono |

Unit locks: `qcProfile167.test.tsx` holds QC167-8's source half and QC167-6, and goes red under the "Save" and four-buttons mutations. `src/lib/qcAsks167.test.ts` holds QC167-7's encoder round-trip, including legacy strings, and goes red under the raw-string mutation. QC167-5's source half sits in `qcAgent158.test.tsx`.

**One lesson from the mutant run.** The first mutant run applied every mutation at once, and the mutations broke each other's locks. For example, M2 hid the asks section, so L7's click waited the full 15 minutes. Each lock is now scoped to its own mutation, and a missing part fails in 30s.

## Retired and re-pointed

Retired, with a grep across `src/` before each removal:
- `AgentEditPane`
- `REPLY_WEEKS` (four fixed week buttons) and `ASK_POOL` (fixed asks, "First 5 pages" and so on)
- the card icon
- `agentStrip`
- the pencil menu's asks and method branches
- the Agent tab's unsaved-changes dot
- the double-click way into edit mode
- `NxCopyEmail`, `NxSite`, `MAIL` and `WEB`
- CSS: `qcv152card.css` §2.6, `qcv152inplace.css`'s Agent-tab edit rules, and `qcv158.css`'s `.nx-reach`, `.nx-sum` and `.nx-empty`

Re-pointed:
- **QC158-5:** an unrecorded reply time is now a ghost tile. Its centring check measures from the tile itself (v167 positions the tile) and leaves out the absolutely placed pencil. It still reads 12:12.
- **QC158-6:** the summary line is absent. The per-item rows are unchanged.
- **QC158-7:** the contact row, address, Copy email and wishlist are absent.
- **QC158-13:** two ghost note shapes and no empty sentence.
- **Unit:** QC158-5 and QC158-6 were re-pointed; QC158-7 was retired and replaced by QC167-5.

## Baseline, before and after

| | before (base e0ed0becd) | after (c14619067) |
|---|---|---|
| tsc | clean | clean |
| Vitest | 13,196 passed / 4 failed | 13,210 passed / 4 failed — the same 4 |
| build | — | clean (no error or warning lines) |
| qc164 | green | green |
| qc163 | red: QC163-1, QC163-W | red: QC163-W (QC163-1 passed) |
| qc160 | red: -9, -7/8, -11, -12, -13 | red: -9, -7/8; **-4 once**, green alone on re-run (bump tail at 0.999995 scale under load) |
| qc158 | red: QC158-1/15 at 1512 and 1280 | the same; -5/6/7 and -10..13 re-pointed (above) and green |
| qc161 | red: QC161-11, QC161-12 | the same |
| qc167 | — | 13/13 green; 13/13 red under their mutations |

The 4 Vitest reds are `firestoreTarget` ×2 (the offender is `tests/e2e/cl251Agents.mjs`, before and after) and `events` ×2. qc160's reds were seed ETIMEDOUT and timing under CPU load in both runs.

**No worse than the baseline.**

## Frames

The frames are in `reports/query-card-v167/frames/`, Chromium and WebKit at 1512:
- each tab with Nothing and with Everything recorded
- the ghost hover
- the three profile drawers
- the asks drawer with both tiles open
- the toast
- the profile over a waiting journey ("Back to “Mark sent”")

The first capture of "both open" clicked each tile head, which unticked Evie's stored sample and Other. The drawer was right and the frame was wrong. The frame now opens only closed tiles.

## For Nick to rule

1. **Three sample pickers that differ:**
   - **SampleControl** (the composer; now also the profile's asks drawer, in units-and-amount mode): pages, words or chapters. Changing the unit converts the amount using the book's size. Has presets, and "From the opening / A specific section".
   - **SentSamplePicker** (recording what was sent): Chapters, Pages or Words. Each unit starts from its own default. Has presets, "From the opening / A section from further in", and "Where did it start?".
   - **The agent card's MaterialPills** (the full card): "Opening sample" with −/amount/+, lowercase units. Changing the unit snaps to that unit's `UNIT_CFG` default. No presets and no section.

   The query card and the full card now store the same thing through the same encoder, but you edit it with two different controls. Pick one?
2. **Unreachable plumbing left in place:** the edit layer still carries the agent's details (`draftOf`/`changedKeys`/`editsOf`, and step 2 of `onSaveEdits` in Queries.tsx). No UI patches them now. Removing them reshapes `CardEdits` and its unit locks, so I left that for a ruling.
3. **The reply-time fan-out** (false premise 4): a profile save that changes reply time rewrites every one of the agent's queries' deadline fields. That's correct for the deadline, but the save touches more than "the profile" suggests.
4. **"+ Add how"** (Takes queries): the ref's words, kept. Change them if you'd rather.

## Dev bundle

Dev had moved twice during the session: from `index-CLHUY0SC.js` (the cut point) to `index-DFqkcJAV.js`, then to `index-e5w8GY12.js`.

1. **Proved the source.** A clean build of `dev/main-material-icons-v1-pst1-cf1-pc1` @ a97f81c6f (Plumage colours v1 on the dev line) gave `index-e5w8GY12.js`, the served hash.
2. **Merged.** v167 went onto that branch as **`dev/main-material-icons-v1-pst1-cf1-pc1-qc167` @ 769e89c1e** (pushed). No other session's branch was rewritten. There was one conflict, a header comment in QcMaterials158.tsx, and both notes were kept.
3. **Checked the merged tree.** tsc clean; Query Centre units 548/548; qc167 L1–L13 all green.
4. **Deployed.** From that clean pushed tip, with a guard that dev still served e5w8GY12 just before: `firebase deploy --only hosting --config firebase.dev.json --project scriptally-dev`.
5. **Confirmed.** https://scriptally-dev.web.app serves **`index-DulcbF3B.js`**, the same hash as the build. Its AppRoot chunk carries "Save to profile", "Saved for every query you send" and "is waiting for you".

Hosting only. No rules, no functions, nothing on main, nothing on prod.
