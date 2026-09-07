# To-do — audit: what shipped against what was decided

Read-only. No commits, no fixes. Measured against **dev at `5789f0c1`** (`index-BfLUZTgm.js`), which
is `origin/main`. Raw readings: `run-artifacts/todo-audit-raw.json`, `todo-audit-b.json`.

Contracts verified by hash before use: `todo-qc-style.html` `ee08dd45…` · `todo-card-options.html`
`9429e341…` · `todo-reference-card.html` `a6af4eb1…`.

---

## The table

### A · The drawer and the reference

| # | claim | verdict | evidence |
|---|---|---|---|
| A1 | slide-over from the right, 640px, over a scrim, page does not reflow | **built differently** — it IS a slide-over over a scrim and the page provably does not reflow (ticket width 357→357, grid right 1381→1381, `scrollTop` 0→0), but it is **760px, not 640**, and it is mounted **only in Grid and Board**. In **List** the pane is a push/split (`.tdw-split.open` folds the list to 520px) | `ToDoPage.tsx:2240` (`todoView !== "list"`), `:2161` (the split), width at `:2246`; contract `todo-qc-style.html` `.drawer{…width:640px…}` |
| A2 | `SlideOver` built as its own component | **built as designed** | `src/components/shared/SlideOver.tsx`, `slideOver.css`, `slideOver.test.tsx` |
| A3 | Quick reference is an index card popping out to the drawer's **left** — 292px, 14px radius, −1.2°, deep shadow, × dismiss, session-scoped | **not built** — it is a **rail inside the drawer**: 240px wide, `transform: none`, no pop-out element on the page (`popOut: false`) | measured: `todo-audit-raw.json` → `drawer.after.railInside true, railW 240, railRot none`; renderer `TaskPane.tsx:519` (`<aside className="rail">`); contract `.pop{…right:668px;width:292px;transform:rotate(-1.2deg)…}` + `.pc{border-radius:14px;box-shadow:0 18px 44px…}` |
| A4 | drawer opens with a family-tinted hero block (deed Playfair 22, situation + register lines, three chips: manuscript · agent · wait) | **not built** — no hero element, **0 chips** in the drawer's head | measured: `drawer.after.hero false, chips 0`; contract `.dhero{margin:0 24px;border-radius:14px;padding:18px 20px 16px…}` |
| A5 | index card header carries ladder tint + `StatusDot` + status word + "since {date} · {elapsed}", colour derived | **not built** — follows from A3; there is no index card to carry it. *(The rail does show a status word and a "since" line, so the CONTENT exists; the card, its tint and its rotation do not.)* | contract `.qhead{…}`; rail's own head at `TaskPane.tsx:519`+ |

### B · The journeys — **none of these has regressed**

Driven directly on dev, in List view, rather than inferred.

| # | claim | verdict | evidence |
|---|---|---|---|
| B6 | the intent fork opens every journey; no primary until an intent is chosen | **built as designed** | measured: `forklbl "Where are you with it?"`, three `.fk` options, `anyChosen 0`, **`primeText null`** before a choice |
| B7 | crossovers swap band/deed/flow; a close records **withdrawn** from a send and **no response** from a nudge | **built as designed** | `journeys.ts:111` (`reason: "no_reply" \| "off_record" \| "withdrawn"`), `:298` ("from the send fork's *I'm not going to send it* means a withdrawal"), `:502`; rendered: the third option reads "I'm not going to send it · Record that, and close…" |
| B8 | unit pill opens with the value focused and selected; not answered until Enter or `Next ↵`; steppers never advance | **built as designed** | `TaskPaneBody.tsx:445-462` — the pin (`onOpen(q.id)`) on unit CHANGE only, released by Enter/Next; `:433` "the FLOW moves only on Enter or the Next pill. A stepper press, an arrow, a blur all…" |
| B9 | the filling primary — count outside, fades/fills with progress, never `disabled`, press while incomplete opens the first missing question | **built as designed** | measured after choosing an intent: `primeText "Log as sent"`, **`primeDisabled false`**, `hasFill true`, `fillWidth 21.78px` (partial), count outside reads **"3 still to answer"** |
| B10 | receipt with Undo, then the card leaves and the drawer advances; a crossover completes the originating card | **built as designed**, with one recorded change: **the toast IS the receipt**. The card overlay was retired in completion-paths Phase 2 because `overlayCards` had rendered nothing since 6 Aug — a vestige, not a loss | `ToDoPage.tsx:589-596`; the leave/undo window at `:610-625`; `receiptLine` live in `FocusFlow.tsx:1367,1379` |
| B11 | Gone quiet carries a reason distinguishing the two feeders | **built as designed** | `types.ts` `TaskReason`; recorded at the raise site `db.tsx:1015,1036`; read at `todoCategory.ts:116`; measured green by `qcChassis` P2.4 (tally 1 after-a-nudge / 5 stale) and P2.5 |

### C · The page

| # | claim | verdict | evidence |
|---|---|---|---|
| C12 | grid and board on the page ground, as the Query Centre's are | **built differently — this is fault 1.** The Query Centre's chain from card to scroller is entirely transparent, borderless, unrounded, unshadowed, and only `.wpg-scroll` scrolls. To-do's has **`.tlc.listcard`: `rgb(255,255,255)`, 1px border, 12px radius, shadow, `overflow: hidden`** — with **`.l-body` an inner scroller** (`auto/auto`) | measured chains, `todo-audit-raw.json`; `taskList.css` `.tlc`/`.l-body`; the wrapper is mounted at `ToDoPage.tsx:3527` (`<TaskList … body={…}>`) |
| C12b | *(same fault)* the footer strip and the stray icon | **present.** Footer reads **"28 tasks · 19 need you now / Export CSV"**; the icon above the columns is the **set-aside door**, and its own comment says it keeps the card's bar *"until Phase 3 rehomes it"* — **Phase 3 did not** | `TaskList.tsx:247-262`; measured `foot`, `archiveIcon 1` |
| C13 | tiles and toolbar use the Query Centre's own components | **built as designed** | `ToDoPage.tsx` imports `shared/StatTiles`, `shared/ToolbarButton`, `queries/QueryViewSwitch`, `queries/IlloSlot`; `Queries.tsx` imports the same three |
| C14 | ticket: edge = status tint, tag = category fill, status never a fill, wait numeral burgundy only on writer-owed dates | **built as designed** | edge `ToDoPage.tsx:3394` (`STATE_TOKEN[stateFor(c.status)]`, derived); tag `taskTicket.css:57-59` (family paper); status appears only as a `StatusDot` in the foot, never a fill; burgundy `ticketFacts.ts:78` (`late: isUrgentCard(...)`) — measured green by `qcChassis` P3.6 as a set equality |
| C15 | board card task-first, ≤100px, agent secondary | **built as designed** | measured card heights **89px** ×6; `TaskBoard.tsx` `.nm` = the deed, `.ag` = agent · agency beneath |

---

## D16 · Decisions the current code does not honour

**Three, and the first is the one that matters.**

### 1 · The QC-chassis round changed the default view and left 26 measurement suites reading a body that is no longer on screen

`todoView` defaults to `"grid"` (`ToDoPage.tsx:849`) and is not persisted, so every page load starts
in Grid. **29 e2e suites open a task by clicking `.tlc .row`. Four select a view first; 26 do not.**

Sampled four of the 26 against dev: **`steerRound` (18 red), `finishRound` (16 red), `unitNext` (5+
red) — all with the signature `send=undefined · NOT RUN` — and `popupRound` green.** So the honest
figure is **26 at risk, at least 3 confirmed red**; the exact number needs all 26 run.

⚠️ **This is a loss of EVIDENCE, not of behaviour.** B6–B11 are intact — I drove them directly. But
the suites that are supposed to stop those journeys regressing cannot currently see them, which is
precisely the state that lets a regression through unnoticed. Phase 7 caught three of these
(`tightened`, `paneMounts`, `qcChassis`) because those were the three it happened to run.

### 2 · The set-aside door was deferred to a phase that never took it

`TaskList.tsx:247` — *"It is not in the contract's toolbar, so it keeps the card's bar **until Phase
3 rehomes it** with the rest of the list — recorded rather than quietly dropped."* Phase 3 built the
ticket grid and did not rehome it. It still sits in `.l-bar`, which is the stray icon above the
columns. **Reachable and working — misplaced, not lost.**

### 3 · The drawer was built from the contract's *mechanism* and not its *anatomy*

Phase 5 wrapped the existing `TaskPane` in a new `SlideOver` rather than building the contract's
`.dhero` / `.pop`. The result behaves correctly (A1's no-reflow is real) and is 120px too wide, with
the reference as an inboard rail instead of the pop-out index card. **Nothing was built and then
lost here — A3, A4 and A5 were never built.**

### Checked and found honoured

The counting law (`assembleBoardColumns` → `boardFigures`), Urgent-is-a-lens, the two-natures
NOTE/TASK split, one-pane-on-screen, the exhaustive `TaskType` switch, `/todo`'s render smoke, and
the three-view switch (a recorded deviation, since accepted).

**One flag, not a fault:** the ticket uses dashed hairlines as *separators* (`taskTicket.css:79,94`),
taken from the contract. `CLAUDE.md`'s dashed-means-provisional law is explicitly scoped to the
Query Centre timeline and says the pane keeps its own uses — so this is a third meaning on a fourth
surface, allowed but worth knowing.

---

## Summary — what was built and later lost

**Nothing in the journeys was built and later lost.** B6–B11 all still work, driven on dev today:
the fork opens with no primary, the crossover records a withdrawal from a send, the unit pill waits
for Enter, the primary fills and is never disabled, the receipt-and-undo window is intact, and Gone
quiet carries its reason.

**What was lost is the ability to prove it.** The QC-chassis round made the ticket grid the default
view, and 26 measurement suites still open tasks by clicking a list row that is no longer on screen
— at least three of them fully red, reporting "the board did not render" about a page full of work.
The one thing genuinely deferred and then dropped is the **set-aside door**, which `TaskList.tsx`
promised Phase 3 would rehome and Phase 3 did not; it is still working, in the wrong place, and is
the stray icon in the content area.

The two visible faults are both real and both located: the grid and board sit inside
**`.tlc.listcard`** — a white, bordered, 12px-radius, shadowed card whose `.l-body` is an inner
scroller — and the drawer is a correct slide-over of the wrong width whose reference is an inboard
rail rather than the contract's pop-out index card, with the hero block never built.
