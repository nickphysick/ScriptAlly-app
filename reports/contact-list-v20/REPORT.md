# Contact list v20 — report

Pack: "Contact list v20: Cards / List views, a count title, Full screen in the title row, compact filter strip, new group
headings (overnight run)". The mock and its 24 screens are enrolled at `design-refs/contact-list-v20/`; every SHA256
matched the pack's table before anything was built (they arrived as `~/Downloads/contact-list-v20-pack.zip`). Branch
`contact-list-v20`, worktree `~/ScriptAlly-cl20`.

## False premises

1. **There is no "rust your-move band" on the paper card today.** Since v18.2 every `AgentPaperCard` band is the list
   header's slate `#3e5170`, in every variant and every state (the file says so in a ⚠️ note). Part F's pink band is
   therefore a new tone, not a change of colour: `AgentPaperCard` gains `tone="pink"`, which only the Cards view passes.
   The places the rust *your move* colour does appear are listed under Part F.
2. **A card's "+ Add" cannot "not open the panel".** On this page a missing value's "+ Add" has always opened the agent
   panel's editor at that field (the rows' "+ Add website" does, via `openCard` → `openPanel`). The card's adds keep that
   behaviour. What CL20-B2 asserts instead is the thing its mutation breaks: the card's **own** open never fires on an
   inner click (which would replace the editor with the profile). After an add the panel is in edit mode
   (`data-ap-acting="edit"`) on that agent.
3. **There is no single "Contact list list line" in CLAUDE.md to replace.** v19 added no CLAUDE.md section. The pack's
   line is added as the first bullet of a new "Contact list v20" section, above v17's.
4. **The toolbar's Full screen cannot carry the title row's tooltip.** The toolbar clips (`overflow: hidden`, which its
   give-way pass depends on), so a tip under the button would be cut off. The title row's Full screen has the tip with
   the F key cap; the toolbar's has its accessible name and `aria-keyshortcuts="F"`.
5. **"Measure from the real columns" — the ledger heading uses the row's own geometry.** The rows' left inset (78px) and
   the disc's width (`--cl1833-av`) are the same values the rows use; CL20-D1 measures the result against the rendered
   disc and name.
6. **Dev moved during the pack.** At the start it served the base (`…-qc1411-raam` d4f53c8a, `index-CU6ZOefw.js`,
   reproduced byte for byte by a local build). By the red-first run it served `…-raam-hero3` d0d07756
   (`index-BcvvtJS0.js`, confirmed by building that tip): landing hero v3 merged onto the same base. The base readings
   were therefore taken from a local build of d4f53c8a (`~/ScriptAlly-cl20base`, :4921), and the deploy integrates onto
   d0d07756.

## Base

`d4f53c8a`, the tip of `dev/…-qc1411-raam`: it carries Contact list v19.2 (f758e550 is an ancestor) and the
retire-add-agent change. Baseline gates: tsc 0, both builds 0, Vitest 636 files / 9378 passed / 3 skipped (exit 0).

## Per part

| Part | Commit | What changed |
|---|---|---|
| A | `ea95e318` | `ContactTitleRow`: the live count (Special Elite 30, `aria-live`), the Cards / List pill (a tablist, ← →) and Full screen (the shared pin hook, the v138.6 tooltip with F). `ContactView` in `lib/contactListMemory`. Not drawn in full screen. |
| B | `d99556a0` | `ContactCards`: `AgentPaperCard` framed in a grid of up to three (never under 340, `cardColumns`, measured from the grid's width). The list's own groups in the list's order; each group a section under a ruled heading. A card is a button (click, Enter, Space open the panel); inner links and "+ Add" answer their own click. Hover lifts 3px (none under reduced motion). The v19 arrival on the cards on screen. One `stackLine` for the letter jump, the current letter and the jump row in both views. Empty: "No agents match. Clear a filter to see more." `lib/contactCards` (+ unit test). |
| C | `f5b9fb11`, fix `36ca11da` | The toolbar carries the switch (two 34 × 30 icon buttons; cream on navy, navy in full screen, with words at ≥ 1600 in full screen) and Full screen / Exit full screen (the v19 Pin button restyled, four corners) only once the title row has scrolled under the stuck toolbar, and in full screen. The fix: the first build compared the title row with the toolbar *at rest*, so the tools showed at the top of the page; the line is now the toolbar's stuck top. |
| D | `732e8306` | List: the cream ledger (54, `#f4f0e9`, no rules, no shadow; mark centred on the disc column, label on the name column, "N AGENTS" in mono). Cards: the ruled heading (built with Part B). |
| E | `f4d4e0d6` | The filter strip, inside the list's head (a slot on `ContactListHead`): the card's width under the toolbar, or inset from the toolbar's first visible control to its last in full screen. Four columns, each floored at its widest choice. v19's layout-A menu and its rules are deleted. |
| F | `c0bb8c67` | Cream jump-row glyphs on the navy toolbar (StatusDot's inline ink overridden on the svg); `AgentPaperCard tone="pink"` on your-move cards in the Cards view. |
| G | `f16cc161` | `qh.cl.view` gains `view` inside version 1; read before first paint; the loading beat draws ghost cards in Cards. "Go full screen" in the guide; "Full screen" on the shortcut sheet; a Contact list help article "Go full screen". |
| H | (this commit) | CL20 locks, the title row's `data-cl19="pin"` probe, CLAUDE.md, retirements and re-points, shots, this report. |

## Decisions made

- **Full screen keeps the v19 pin underneath.** The field in `qh.cl.view` is still `pinned`, the hook is still
  `usePinList("agents")`, F and Esc behave as before; only the words, the icon and the place changed. The guide item keeps
  its key `pin`, so a tick already earned stays earned.
- **The title row's Full screen carries `data-cl19="pin"` / `data-cl16="full"`.** The v16–v19 locks find "the
  full-screen control" by those probes; while the title row shows it is that control, so they keep working rather than
  each being retargeted.
- **The toolbar's switch has words only in full screen at ≥ 1600px**, as the pack says; at narrower widths its tabs are
  named by `aria-label`. At ≤ 1440 the toolbar's Full screen stays icon-only, as v19's Pin did (its name stays).
- **Cards status words.** A card's chip is the row's query stage (`STAGE_NAME`, e.g. "Passed", "Partial requested"),
  "Not yet queried", or "Closed to submissions" for a closed door with nothing queried. Your move is `stand === "you"`,
  the same fact as the band's "your move" count and the row's YOUR MOVE tag.
- **"+ Add" on a card opens the panel's editor at that field** (the rows' own behaviour); see false premise 2.
- **The filter strip dropped two things from v19's menu:** the genre "Find a genre" field (the mock's strip has none;
  "All genres" shows the rest, "Fewer genres" folds them) and the "Show N agents" footer (every choice applies at once).
  Every choice, count, the Any/All switch and "Ready to query as its parts" are kept.
- **The strip's columns floor at their widest choice** (`minmax(min-content, …fr)`): at 1280 in full screen the four
  columns sum to the strip's width exactly (207 + 202 + 238 + 216 = 866 of 866). A much longer personal genre name could
  push the Genre column past the strip's edge; the strip would then clip it rather than wrap.
- **"New device" in G1 is cleared storage plus a reload in the same tab.** A second browser context is not signed in:
  Firebase keeps its session in IndexedDB, which Playwright's saved state does not carry.
- **"Pin the list" stays the Query Centre's article.** Its area moved to Queries and it now names only the Query
  Centre; the Contact list's guide "Learn more" goes to a new article, "Go full screen". The Help home's quick search
  "Pin the list" and the What's new entry of 18 Oct ("Pin the list on the Contact list and the Query Centre…") are on
  `/help`, not the Contact list, and are history; both are left.
- **The v20 skeleton draws the title row inert and, in Cards, six ghost cards** (`AgentPaperCard` ghost), so the remembered
  view never flashes the other while the list loads.

## Part F — the your-move rust elsewhere (not changed)

- The agent panel's stand slip when it is the writer's move: its label, figure, bar and button in `#a2452a`
  (`agentPanel.css`, `.apn-slip[data-kind="you"]`).
- The agent panel's "Your queries" line: "· *your move*" in italic `#a2452a` (`agentPaperCard.css`, `.apc-ym`).
- The agent panel's History "next" line when it is the writer's move (`.hzz-next[data-r="you"]`, `#a2452a`).
- The full-screen band's "your move" count disc, `#e08a64` (`contactV19.css`, `.cl19-ym`).
- The rows' YOUR MOVE tag (`.clv-ym`).
- Housekeeping uses the same rust for its gaps and figures, which are not your-move.

None was changed.

## Part G — every string changed

| Where | Before | After |
|---|---|---|
| Toolbar button (text and `aria-label`) | "Pin list" / "Unpin" | "Full screen" / "Exit full screen" |
| Title row | (new) | "All N agents" / "v of N agents", "Cards", "List", "Full screen", tooltip "Full screen" + F |
| Toolbar switch `aria-label`s | (new) | "Cards", "List"; the tablist "Show the agents as" |
| Guide item (`pageChecklist.ts`) | "Pin the list" | "Go full screen" (line unchanged: "Turn the list into the whole page while you work.") |
| Guide spotlight text | "Press the pin. The list becomes the whole page; press it again to come back." | "Press Full screen, or F. The list becomes the whole page; Exit full screen brings the page back." |
| Shortcut sheet (Contact list F) | "Pin the list" | "Full screen" |
| Help article | "Pin the list" (both pages) | new "Go full screen" (Contact list); "Pin the list" now names the Query Centre only |
| Filter strip | "Filter agents", "N of M showing", "Show N agents", "Find a genre", "Show all N genres" / "Show fewer" | "Filter", "v of N agents", "All genres" / "Fewer genres" |
| Cards view, empty | (new) | "No agents match. Clear a filter to see more." |
| Cards, a card's name | (new) | `aria-label` "{name}, {agency}. {status}" |

CL20-G2 sweeps text, `aria-label` and `title` on the Contact list and the open guide, unpinned, scrolled and in full
screen: no "Pin" or "Unpin". (A "Pinned to you" note from the To-do tray elsewhere in the shell is not on the Contact
list.)

## Locks (CL20, `tests/e2e/contactV20.measure.ts`)

Each lock: red on the base build (a local build of d4f53c8a on :4921, `index-CU6ZOefw.js`; ledger `base-<lock>.json`), red
under its named mutation (`mut-<lock>.json`), green on this branch (`<lock>.json`). Source mutations (A1, B3, C1, C2,
E2, G1, G2) were applied in this worktree from path-derived backups (`~/cl20-logs/mut.py`) and undone, with a rebuild
either side; `git diff` was empty after each.

| Lock | Base | Mutation | Green |
|---|---|---|---|
| A1 title | 5/15 | 13/15 (count before filtering) | 15/15 |
| A2 row | 0/10 | 8/10 (Full screen at the far right) | 10/10 |
| A3 switch | 4/16 | 12/16 (switching resets grouping) | 16/16 |
| B1 grid | 8/34 | 32/34 (auto-fill at 280px) | 34/34 |
| B2 open | failed (no cards) | 10/12 (inner-click guard removed) | 12/12 |
| B3 jump | 4/8 | 4/8 (jump looks for the rows) | 8/8 |
| C1 toolbar | 20/32 | 28/32 (tools always shown) | 32/32 |
| C2 one state | 0/10 | 2/6 (the toolbar keeps its own state) | 6/6 |
| D1 ledger | 2/52 | 42/52 (the 2px navy rule back) | 52/52 |
| D2 ruled | 0/4 | 20/28 (hairline past the edge) | 28/28 |
| E1 strip | 2/18 | 14/18 (full width in full screen) | 18/18 |
| E2 same logic | (records the base) | 14/24 (sections OR'd) | 24/24 |
| E3 keys | 10/12 | 6/12 (Esc reaches full screen first) | 12/12 |
| F1 glyphs | 2/4 | 2/4 (glyphs left ink) | 4/4 |
| F2 pink | 0/12 | 8/12 (the shared band changed) | 12/12 |
| G1 memory | failed (no grid) | 8/10 (view restored after paint) | 10/10 |
| G2 words | 6/16 | 10/16 ("Pin the list" in the guide) | 16/16 |

Green total: 324/324.

**Three mutations first came back green, so I corrected the mutations, not the locks:**
- **E3:** the break listened on `document`, but the app's escape stack listens on `window` in the capture phase and stops
  the key, so the break never saw it. It is now an init script registered first.
- **F1:** the break's selector was less specific than the shipped rule, so it lost. It now uses the rule's own selector
  plus one ancestor.
- **G1:** "restore after paint" as a mount effect runs before React's first frame, so nothing flashed. It now restores
  after a frame and a 150ms timer, which is a real after-paint restore.

Every lock asserts its population first. E2's first green showed 22 of a claimed 24 readings: its zero-count check
compared a freshly built array by identity, so it never ran. That was fixed before the numbers above.

## L1

Each file was run alone on this branch's build. The first pass tripped Firebase's password-verification quota, so
every Query Centre red in it was a failed sign-in. Two clean-ups then failed against the same quota:
- **the Query Centre guide's restore:** put back by hand once the quota recovered, to the state the first run had read;
- **`seedQc1411 --clean`:** found nothing to remove, because the seed had never written.

After a 40-minute cool-off:

| Suite | Result | Changes |
|---|---|---|
| contactV19 | 15/15 | **P1:** the pin's parity is retired (unpinned at the top the toolbar has no full-screen control; CL20-C1 owns where it is). **T1:** "the Pin's right is inside the toolbar" now reads the toolbar's last control. **E1:** the 50-tall band and 2px navy rule are retired (CL20-D1 owns the ledger); floor 30 → 18. |
| contactV191 | 9/9 | **A1, A2:** scroll 300 when the title row leaves the 1280 window without a row lacking an email. **F1:** the unpinned Full screen's colours are read once scrolled (where it shows). **G1:** the group header is v20's ledger colour; "the strip is not the header's colour" stands. |
| contactV192 | 9/9 | **A2:** the 44 is measured to the title row, which sits where the card did. |
| contactV183 (CL1833-E5 included) | 16/16 | none |
| hr1 (v1.1) | 3/3 | **The Contact list's "content":** the title row (top 259, the oracle's value) instead of the toolbar. **HR1-8:** its reference had expired (12h) and was captured again on the base build. |
| qcV140, qcV1401, qcV141, qcV1411, qcV1386 | 15, 5, 10, 5, 10 passed | none |

The ledgers these runs rewrote under other packs' reports were put back to their committed versions.

## Shots

_(filled in below)_

## Deploy

_(filled in below)_

## For Nick in the morning

_(filled in below)_
