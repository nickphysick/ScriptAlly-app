# Contact list v18.3 — report

Branch `contact-list-v18-3`: six part commits, one fix to E (`9bde19b9`) and G on top, cut from `dashboard-v59`'s tip
`5f566578` (dev's build, fe8f2377, plus its report). Ref `design-refs/contact-list-v18-3/` (432 refs hashed).

## False premises (read first)

1. **A.6 "the drawer must sit in front of the pinned row" was already true.** Recon measured the Housekeeping drawer at
   z 61 against the pinned list header's z 9; A4 is green on the base build. Nothing was changed for it. Its red came
   from its mutation (the drawer given z 1), where `elementFromPoint` answered `DIV.hdr-dim`.
2. **The v18.2 page tour on `/agents` was already unreachable.** It was placed above the floating Housekeeping tab and
   rendered only while that tab measured a height; Part B removed the tab, so the tour had no host. Part F deletes it
   (`contact/contactGuide.ts`) rather than leaving a dead mount.
3. **The mock's "No grouping" chip reads "Grouped by Letter".** A mock bug: the app reads "Grouped by None".
4. **D1's "then the panel shows the new agent" cannot be read on the harness account.** It is on the Free plan with
   38 agents against a cap of 5, so `addAgent` refuses every add, correctly, with "Couldn't save: Free tier is capped
   at 5 agents". D1 asserts the save reached the existing add path (its own refusal in the editor's foot) and tallies
   the after-add branch as not entered. The contact lab cannot stand in: it is not in a built bundle.
5. **A3 as written ("with every reply time filled") would mean writing a reply time to 38 agents.** The lock uses the
   writer's own "Say it's not stated" list (`todoPrefs.contacts.settled`) instead: one document write, restored
   exactly, which clears the same gap through the same code path. On the account all five details have gaps, so
   without a fixture the hidden branch is never entered.
6. **"At ≤1440 the bars are hidden" is a WINDOW width.** The app's compact switch (`.ws-app:not(.sheet-wide)`) is on at
   1512 too, so a first version hid the bars there; it is a `max-width: 1440px` query now.
7. **E.2's "padding 0 40px 0 78px" is the Contact list's.** The Query Centre's rows have their own grid and inset; its
   headings keep `0 40px` and E2 asserts each label sits on its own column's edge (within 1px) on both pages instead.
8. **F3's mutation (end on a bubble-phase `click`) reddens F3's precondition, not its 200ms timing.** The click that
   starts the spotlight bubbles to the window and ends it at once, so the spotlight is never on. That is the mutation
   detected, at an earlier reading than the one it names.

## §0 Recon

1. **Layers.** Pinned list header (`.cl18-lh`, sticky) z 9; Housekeeping drawer z 61 over its dim; agent panel and scrim
   z 60s; top bar is outside the scroller. The guide's popover is z 95, its note 96, the spotlight 97.
2. **Header spacing, base build, both widths:** strip 14 · title row 34 · navy **22**, against the Query Centre's 54. The
   22 came from `contactV17.css`'s `.clv-group > .cl17-hd + .clv-main, .clv-group > .cl17-hd ~ .clv-main
   { margin-top: 22px }`, written for v17's filter row. Now 54, measured 14 / 34 / 54 at both widths on both pages.
3. **"+ Add an agent" openers.** The header's button and App's "Add an agent" capture (through `sa:contact-add`) both
   reach `AgentList.openAdd`. The panel's act view can host `AgentCardEditor` with no id and an empty draft through
   the card host's existing `onCreateAgent` — no new write path.
4. **The editor's fields.** Country chips UK · Ireland · US · Canada · Australia · New Zealand · Other… confirmed; "No
   reply means" was `noResponseMeansNo`. The agency field offered suggestions from existing agents (`agency-hint`); it
   offers none in the new-agent panel state.
5. **The grouping menu** opened from the underlined group name (`.cl18-gn`) through the shared Popover, anchored at the
   button's `bottom + 8, left`. The chip keeps that anchor.
6. **The headings row** stuck at the list's pin height on `#e9edf3`; a grouped view rendered one `ListPanel` (and so
   one headings row) per group.
7. **The top bar** is `WorkspaceShell`'s `.ws-bright`; there was no page slot. Part F adds one (`lib/barSlot`).
8. **Per-user UI flags** live in `todoPrefs.contacts` (`hkIntroSeen`); the guide's state is `todoPrefs.contacts.guide`.

## What changed

- **A** (`59532416`) Housekeeping: score 68 (52 at ≤1440) with "%" 30 (26) and "List health" 26 (20) on one line;
  tiles `repeat(3, max-content)`; "How points work" gone, the key opens under the points tile; complete details hidden.
- **B** (`1dd3a72b`) "Fill in the gaps {n}" replaces "Discover agents"; the floating tab is gone; the ring reads a
  percentage (33/15, stroke 10, round cap); spacing 14 / 34 / 54.
- **C** (`96e4a6f0`) The peek is three contact pills from the name's left; a missing one is dashed "Add …".
- **D** (`fefd480f`) "+ Add an agent" opens the agent panel's act view, "NEW AGENT · Add an agent", with the card's
  editor in a new-agent state (no Paste a link, no agency suggestions); "Response policy" (No response means no /
  Always replies) replaces "No reply means".
- **E** (`f1bece84`) `shell/listToolbar.css`, read by both list pages: a 64px navy toolbar (count, "Grouped by {Group}"
  chip, then 36px search, Filters, density, pin); a solid white 40px headings row with an 8px shade while stuck; a
  grouped Contact list has one panel and one headings row; letter rows open on a rule with the letter at 26. The
  Contact list's older v18 size rules for those elements are retired, not out-ranked. The Query Centre's headings
  derive a stuck state from boxes, as its bands do.
- **F** (`c5cf5cc2`) The page guide: `shell/guide/PageChecklist` + `lib/pageChecklist` + `lib/barSlot`. Done is read
  from app state and real saves (a new agent saved, search ≥ 2 characters, a panel open by any route, a card edit
  saved, a Housekeeping save), stored by leaf in `todoPrefs.contacts.guide`. The spotlight's hole is a clip path on
  the dim, so the target is pressed through it; it ends on pointerdown in the capture phase, Enter, Space or Escape.

## Locks — CL183 (`tests/e2e/contactV183.measure.ts`)

At 1512 × 900 and 1280 × 800. Final run on this branch: **18 of 18 passed, 351 readings, all green.**
Ledgers: `ledger/<lock>.json` (green), `base-<lock>.json` (base build), `mut-<lock>.json` (mutation).

| Lock | Base build | Mutation | Mutation reading |
|---|---|---|---|
| A1 header | 10/16 — score 40 | page: restore the link | 14/16 — "How points work" present |
| A2 key | 10/14 — key 48 right of the tile | page: anchor to the header's right | 10/14 — left 60 off |
| A3 complete | 7/9 — Reply time shown at 38/38 | src: render complete sections | 7/9 — same |
| A4 front | **4/4 (premise 1)** | page: drawer z 1 | 2/4 — `DIV.hdr-dim` |
| B1 button | 2/10 — no "Fill in the gaps" | page: restore the tab | 8/10 — a floating tab |
| B2 spacing | 6/10 — navy 22 | page: restore the 22px rule | 6/10 — 22 |
| C1 peek | 30/116 — no pills, tinted ground | src: restore the v18 card | 58/116 — no pills |
| D1 add | 2/6 — no panel | src: open the centred card | 2/6 — no panel |
| D2 policy | 0/4 — no "Always replies" option | src: rename the field | 3/5 — no "Response policy" |
| E1 toolbar | 4/28 — no chip, 66–76 tall | page: anchor the menu to Search | 22/24 — menu 481 off |
| E2 headings | 24/28 — `#e9edf3` | page: transparent | 24/28 — transparent |
| E3 grouped | 0/1 — no grouping chip | src: one per group | 4/5 — six headings rows |
| F1 pill | 6/24 — no pill | page: move it to the sidebar | 6/22 — not in the bar |
| F2 show | 11/41 — no pill to press | page: perform the action | 21/28 — a panel opened |
| F3 end | 2/5 — no spotlight | src: bubble-phase `click` | 2/3 — spotlight never on (premise 8) |
| F4 done | 1/7 — nothing ticked | src: tick from the guide's button | 3/6 — a row click did not tick |
| F5 next | 0/3 — no note | page: drop the note | 0/1 — no note |

**Base runs that crashed first.** On the base build eight locks first died on a click timeout (the control does not
exist there) rather than reading red. Their clicks and reads are bounded now, so a missing control is a red reading,
and all eight were re-run on base and read red as above.

**Source mutations** were applied and undone in this worktree from path-derived backups (`~/cl183-logs/mut183.py`),
each with a `build:dev` before its run; the tree was clean after each.

## L1 — no regression

CL18.2, CL18.1, CL18, CL17, CL17.1, CL16, QC138 / .1 / .2 / .3 / .4 / .5 / .6, Responses v2 and header v3 (157 tests),
run on both builds:

- **Base build:** 129 passed, 5 failed, 23 skipped. The five are CL17 FS1, CL18.1 B5, CL18.2 C5, QC138.2 C1 and D1.
- **This branch, after the edits below:** the same five, and nothing else. All five predate this pack:
  - **CL17 FS1:** the pinned-list button reads "Pin the list", not "Full screen" (QC v138.6).
  - **CL18.2 C5:** that button's tooltip carries an "F" keycap (QC v138.6).
  - **CL18.1 B5:** a dated capture, taken 15 Oct.
  - **QC138.2 C1 / D1:** a date-bound fixture line, and the card motion's timing.
- **⚠️ One regression from this pack was found by L1 and fixed:** CL16 F1 caught a selected row that is the first of its
  letter losing its 3px ink edge. Part E's letter rule is a `box-shadow` that out-ranked the open row's. `9bde19b9`
  states both shadows.
- **⚠️ Long runs are throttled.** In one 48-test run, CL16 F4–F7/G1 and CL18.2 B1–B3 failed with "no agent panel
  opened" / "no closed agent found". Each file run on its own passes in full on this branch (CL16: 9 passed, 10
  retired; CL18.2 + QC138.1: 26 passed, C5 as above). Base hit the same shape (G1) in the paired run. This is the
  sign-in throttle the harness is known for, not the page.

## Retired / edited locks

Each carries a `RETIRED` or `RE-POINTED (v18.3 §…)` note at the line.

- **CL16 C3:** the grouping is read from the chip ("None"), not the sentence's ", A to Z".
- **CL16 F1:** "the Housekeeping tab stands down" is retired (no tab).
- **CL17.1 B4:** the ring's circumference uses r 42.5.
- **CL17.1 D1 and D2:** the floating tab and its × are retired.
- **CL18 A2:** the grouping is read from the chip.
- **CL18 B1:** "Showing all {N} agents" and "Showing {n} of {N}" with no ", A to Z".
- **CL18 C1:** the headings strip is white.
- **CL18 D1:** the v18 peek is retired; CL183 C1 holds the peek.
- **CL18 F1:** two numbers (ring and drawer), not three.
- **CL18.2 C2:** the key opens from the points tile.
- **CL18.2 D3:** the tab's figures are replaced by the header's "Fill in the gaps {n}".
- **QC138 C1:** the headings are white.
- **QC138.1 F1:** the search rests at 240 on the full-size sheet and 200 otherwise, and holds that width on focus.
  v138.1's grow-on-focus (360 / 260) is retired with the shared toolbar; see "For Nick".
- **QC138.5 E1:** the title is "Showing {n} of {N} queries", with no "grouped by".
- **The v18.2 page tour on `/agents`:** retired with its steps file. It had no lock of its own; it was unreachable.

## Shots

`shots/`: 01 page, 02 Housekeeping home, 03 points key, 04 over the pinned row, 07 group menu, 08 grouped by status,
09 grouped sticky (Contact list and Query Centre), 10–11 add an agent, 13 guide open on a fresh account, 14 one
spotlight per item (1–5), 15 done note, 16 next step, 17 hide for good, 18 guide closed, 19 all five done (no pill); `x-qc-toolbar-*` the Query
Centre's navy row and headings after Part E, at 1512 and 1280.

## For Nick

- **The centred add card's last opener** is the development-only harness hook `window.__saAgentCard.openNew`
  (`AgentCardHost.tsx`); no production route opens it. `AddAgentFocusForm` still exists, mounted by `App.tsx` for the
  other "+ Agent" doors (unchanged, as its section says).
- **"No reply means" still appears:** `LogJourney.tsx` ("No reply means no" toggle), `NudgeJourney.tsx` ("guidelines say
  no reply means no"), `ContactEmptyPage.tsx` (a sample answer), `agentPanel.ts` (a fact line), `todoTray.ts` (a row
  label and a sentence), `responseContext.ts`, `paneJourney.ts`. All read `noResponseMeansNo`; none was in scope.
- **The Query Centre's search no longer grows on focus.** The shared toolbar fixes it at 240 (200 below the full-size
  sheet), as the pack specifies. QC v138.1 had it grow to 360 (260). Say if you want the grow back on both pages; it is
  one rule in `shell/listToolbar.css`.
- **The pin button's "F" keycap trips CL18.2 C5** ("no keycaps on /agents"). This predates this pack (QC v138.6); one
  of the two wants a ruling.
- The harness account's guide state is back to absent, as it was before this pack. The locks set it and restore it
  per run, and the full L1 run on this branch ticked items, which is correct behaviour.

## v18.3.1 — the peek's spacing

Branch `contact-list-v18-3-1`, cut from what dev served:
`dev/main-cl18-todo51-cl181-qc1385-an21-cl182-qc1386-db60-cl183-an24` (c6505699, `index-DYhkEY1Y.js`).

**False premise.** The pills were not simply "2px under the main line". The open row also re-centred its main line:
- At rest the row is a single 56px grid track with its cells centred.
- Open, the first track shrank to its tallest cell (49px), so the name and agency rose 3.5–5.5px as the peek opened.
- That breaks "no other row moves", in the row's own main line.

**The fix:**
- **The main line stays put.** As the peek opens, the row reads its resting main track and pins the open row's first
  track to it (`--cl183-track`).
- **16 under the agency line (14 compact).** The row also reads how far the agency line already sits above the track's
  end (`--cl183-under`), and the pills' margin is the target less that, floored at 2px so a taller wishlist cell is
  never overlapped.
- **18 above the row's foot (16 compact),** as the open row's bottom padding.
- **Unchanged:** the pills' left edge, size and 12px gap, the hover timer and the Space toggle. All of these run
  through the same `openPeek`.

**The details, checked against Part C:**
- Copy rendered as plain 14px body text, because v18's Copy rule is scoped to the retired `.cl18-pk` peek. It is v18's
  small button again: mono 11, radius 6, hairline ring.
- The website's ↗ took the domain's size, because the pill's `> span` rule sets every span to the pill's font. It is
  13px navy now.

**Locks:**
- **C2, the spacing:** at 1512 × 900, 1280 × 800 and 1920 × 1080, so both the compact and the full-size branch are
  entered. It is 67/67 green.
  - On base it reads 4.2 / 14.0, with the main line moving 3.5–5.5px.
  - Under its mutation (the 2px gap restored) it reads 9.7 against 14 / 16.
- **C3, the details:** 5/5 green; red on base (Copy 14px Source Sans with no ring; no ↗ hook). The harness account has
  no agent with a website, so C3 gives the bare fixture one for the read and re-seeds it.
- **C1:** 176/176.
- **CL18:** 11 passed, 3 retired as before.
