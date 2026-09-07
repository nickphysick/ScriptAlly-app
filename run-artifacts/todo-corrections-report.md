# To-do — corrections

Audit table: **`run-artifacts/todo-audit.md`** (Job 1, no commits).
All measurements below re-run against **dev at `2f610cdb`** (`index-BlxM4p68.js`), which is
`origin/main`. **70 assertions, 0 red.**

| # | commit | what |
|---|---|---|
| 2.1 | `ca80f1d5` | the page runs to its edges |
| 2.2 | `3989a2ae` | the drawer as designed — 640, and the index card |
| — | `0a91307c` | the rail badge counts what the page shows |
| — | `0fc56445` | the urgent mark keeps its glow and loses its wiggle |
| — | `210da748` | the dead four-column board goes, and its stylesheet stops loading |
| — | `2f610cdb` | `CLAUDE.md`: the three views, and the two deviations that are decisions |

---

## What was already right, and what was restored

**Already right — the journeys, all of them.** B6–B11 were driven on dev rather than inferred, and
none had regressed: the fork opens with no primary until an intent is chosen; `journeys.ts` records
a *withdrawal* from a send and `no_reply` from a nudge; the unit pill pins its row until Enter or
Next; the primary fills, is never `disabled`, and states "3 still to answer" outside; the
receipt-and-undo window is intact; Gone quiet carries its `reason`.

**Already right — the drawer's mechanism.** It was a genuine slide-over over a scrim, and the page
provably did not reflow. Phase 5 built the contract's mechanism and not its anatomy.

**Restored — nothing was found built-and-then-lost in the product.** The one thing genuinely
deferred and dropped was the **set-aside door**: `TaskList.tsx` promised *"it keeps the card's bar
until Phase 3 rehomes it"*, Phase 3 built the ticket grid and did not, and it sat as a lone
unlabelled icon above the columns for three phases. It is a labelled instrument in the toolbar row
now — moved, not removed, because it is the only route to the ledger and to tag management, both of
which this page has taken offline once already by unmounting the sheet that held them.

**A3, A4 and A5 were never built**, not built-and-lost — see below.

---

## 2.1 · the page runs to its edges — `ca80f1d5`

The grid and board rode inside `TaskList`'s card as its `body`. Measured against `/queries` first,
which is the point: its chain from card to `.wpg-scroll` is transparent, borderless, unrounded and
unshadowed the whole way, and only `.wpg-scroll` scrolls. To-do's had **`.tlc.listcard` —
`rgb(255,255,255)`, 1px border, 12px radius, shadow, `overflow: hidden`** — with `.l-body` an inner
scroller.

Gone: the wrapper, the inner scroller, the footer strip, the stray icon. Export and the set-aside
door are in the toolbar row. The board scrolls horizontally at page level with no rounded ancestor
clipping the last column. **Insets measured identical: 282…1382 on both pages at 1440.**

The toolbar row is held to one line — the two new members had pushed the view switch onto a second
row, which the Query Centre's never does. The instruments are fixed and meaningful, so the search is
what gives.

### assertions, red → green

| | claim | proved red by |
|---|---|---|
| E1–E2 | neither page paints a container between its grid and its scroller | reinstating the wrapper → `still painted: [{"cls":"tdw-rail"…}]` |
| E3 | no inner scroller wraps the grid | same → `todo 1 · ["tdw-rail"]` |
| E4 | **/todo and /queries have identical insets** — compared, never pinned | — |
| E5–E6 | the board is on the page ground; no rounded clipping ancestor | same mutation → both fired |
| E7–E8 | the footer strip and icon bar are gone; Export and the door are in the toolbar | — |

---

## 2.2 · the drawer as designed — `3989a2ae`

⚠️ **The content was already there, which is why this was small.** `TaskPane`'s `.rail` already
renders the contract's own `.qhead`/`.who`/`.facts`/`.subh`/`.tl`, already draws the real
`StatusDot` beside the status word, already states the "since" line, and already tints its header
from `var(--stage-…)`. What was missing was the **arrangement**.

**The treatment follows the host, not a prop.** Inside the split (List) the reference stays an
inboard column — the tightened round's design, correct there, because a split has no page beside it
to pop into. Inside the drawer it is the contract's card. A descendant selector is the whole of it;
a prop would have forked the component. The left offset is **derived** from the drawer's width
(`right: calc(var(--slo-w) + var(--slo-gap))`) rather than restating the contract's `668px`.

640 is the contract's number. Phase 5 used 760 because the reference was a column squeezing the
deed; with the column gone the document has the full width.

The dismiss reads **×** in the drawer and `›` in the split — `›` means "put away into the spine",
and the card has no spine. Done with `font-size: 0` plus a pseudo-element, which replaces the glyph
without taking the accessible name with it.

### assertions, red → green

| | claim | proved red by |
|---|---|---|
| D0 | opening the drawer changes **no page rect** and does not move the scroll | restoring the split's fold behind the drawer → `rects identical false` |
| D1 · D4 · D6 | 640 · rotated −1.2° · clear to the drawer's left | width back to 760 + rotation removed → all three fired |
| D3 · D5 | 292px, 14px radius, deep shadow | — |
| D7 | the header **is** the ladder value, derived | reads `--stage-in-2 resolves rgb(241,219,208) · header rgb(241,219,208)` |

⚠️ **D0's first mutation proved nothing, and that is the useful half.** Making the drawer
`position: relative` reddened it not at all — it is the last thing in the page, so there is nothing
after it to push. The mutation that works is the fault 2.1 actually fixed.

⚠️ **D7 reported "no stage token at all" about a plainly tinted header on its first run.** The
pattern was written *inside* the evaluate with `[a-z-]+`, and every token is `--stage-in-2`,
`--stage-out-1`. Digits. The house rule says patterns live in Node; this is why.

---

## The briefer items

**The rail badge — `0a91307c`.** It read 29 beside a page reading 27, both right about their own
set. Your ruling: it counts what the page shows. `boardFigures` drops `cols.snoozed`;
`liveBoardCards` is unchanged, because that is the *board's* population and has its own consumers.
`qcChassis` P1.2c was a REPORTED line and is an assertion now — **both surfaces read 28**.

**Urgent motion — `0fc56445`.** The glow stays, the wiggle goes, and its keyframe goes with it
rather than sitting unreferenced. The stagger matters *more* without it: six cards glowing in unison
reads as the page pulsing. P6.1 asserts both directions — glow present, no rotation — so re-adding
it is a decision rather than a drift.

**`TodoBoard.tsx` — `210da748`.** Deleted with `todoBoard.css`, plus the seven test files that only
tested it. Its stylesheet had been **loading on every page that opens a ⋯ menu** because
`PortalMenu` was extracted from it and kept the import — so `.tbd-col`/`.tbd-card`/`.tbd-empty` sat
live in the cascade with no renderer, which is why the QC-chassis board had to be called `brd-` to
get out of their way. The menu's rules moved to `portalMenu.css`; `deadBoard.test.ts` locks both
files absent **and unimported**, comments stripped.

**The drawer's hug below 1050px — left, and recorded.** Content wants 461px; the cap is 404 at 900
and clear from 1050 up. `tightened` P3.10b tests the law at 1050 so it is not silently dropped,
which is not the same as the hug being fine. It belongs to a mobile/laptop pass.

**The three-segment view switch — recorded as a contract deviation** in `CLAUDE.md`, with the
reason: the ref's mockup has no list to strand, and this page's has dense rows, action strips and
five keys.

---

## Locks retargeted — ten, each saying so at its own site

A count that should have been a set (`tasksLayout`, `qcChassis` P1.7); three spellings
(`tasksViewport`, `todoListChrome`, `tasksChain`); a selector that outlived its element
(`todoTour` — its WORDS already described the page's toolbar, so only the selector was stale, and
the census caught it for the third time); the page smoke's footer count and card class; the
set-aside door's three assertions in `boardSettings`; and `tasksCarryover`, which **changed meaning
rather than location** — the badge now counts the page's population and FILTERS the board's, so it
asserts `badge + snoozed === everything` and requires the fixture to *have* a snoozed card.

⚠️ And `qcChassis` P1.2b needed thought rather than a retarget. It compared the tile's total against
the card footer's and it earned its keep — it went red on 29-beside-27. With the footer gone the
count has one home, so the claim became the structural form: **the total is stated once**, asserted
as the *absence* of a second.

---

## Two notes on the run

⚠️ **Measured in an isolated worktree, and that was not hygiene.** Another session is live in the
agent list; its edit loop invalidated `dist/` faster than a run could complete, so `bundleGuard`
refused three runs in a row. Correctly — it also caught a **production** bundle another session had
left in `dist/`, which would have pointed the harness account at prod.

⚠️ **Three suites are red in the shared checkout and are not this work's.**
`src/components/agents/materialSlots.test.tsx`, against dirty `AgentCard.tsx`, `agentList.css` and
`agentMaterials.ts`. Established by reading, not moving. **The clean checkout of the deployed tip
passes everything: tsc 0, 444 files, 7,391 tests, build clean.**

---

## Screenshots — `reports/todo-corrections/`

`todo-grid-1440.png` · `todo-board-1440.png` · `queries-board-1440.png` (the reference) ·
`todo-drawer-1440.png` (the drawer open with the index card).
