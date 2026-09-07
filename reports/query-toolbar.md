# Query Centre — toolbar popovers, Group, the list header, and the quick actions

Run of 5–7 Sep 2026. Refs: `query-toolbar-v2-locked.html` (`294f36bb…`), `query-list-headers-v2-mono-locked.html` (`e1ac7bd0…`, §3), `query-quick-actions-v2.html` (`8179ba84…`, §4) — all three verified and the two new ones enrolled in `.refhashes.json`.

**All five sections are in.** §1/§2 `03deb076` · §3 `838a121f` · §4 `7ccd7367` · the third anchor `24cac905` · §5 this commit.

---

## ⚠️ False premises, before anything else

Nine now. Four would have produced a wrong build if followed literally.

**1 · Filter has THREE facets, not two — and this brief re-states the error you already corrected.** Your mid-run correction on 6 Sep was explicit: *"Filter keeps three facets — Status · Sent via · Version. My 'exactly two' retired Part E's version filter by accident; it stays."* This brief's §1 repeats "Filter drops to two facets". I have **kept three**, on the grounds that the correction carried a reason and this line does not mention Version at all. `Included` is gone outright, as both agree. Version renders conditionally — only where the manuscript has more than one version — so the harness asserts *present iff version rows present* rather than a facet count. One line either way if you meant to reverse yourself.

**2 · §3's "right for Actions" and §4.1 contradict each other directly.** §3 says "left for the six, right for Actions" and asks for an assertion that the Actions header's `right` equals the action grid's `right`. §4.1 says "Actions column is left-aligned (`justify-content: start`), like the other six columns." §4 is the later correction and wins, so Actions is left-aligned and the alignment claim is asserted as LEFT for all seven — a `right` assertion would now fail on a correct page.

**3 · The snooze dial has TWELVE stops, not four, and 4/8 weeks are not among them.** §4.3 names "1 week · 2 weeks · 4 weeks · 8 weeks" and also says to reuse the To-do dial and not re-roll it, and §4's assertion requires the stops to *match the To-do dial for the same input*. Those cannot all hold: `SNOOZE_STOPS` is 1–7 days, then 14, 21, 30, 60, 90. Reuse won, since it is what two of the three instructions demand; changing the stops would have altered To-do's own dial, which is another session's live surface. The ref meanwhile draws three static rows rather than a dial at all — superseded by the brief.

**4 · "Group is currently inert" is false for Grid.** Grid has partitioned since the views pass. What was actually missing was List, the accent rule, and the Board's disabled control. Taken literally this would have meant rebuilding working code.

**5 · `snoozeCard` is not an export and there is no `snoozeCard` module.** It is a function inside `ToDoPage.tsx`. The reusable pieces are `SnoozeDialBody` (`todo/SnoozeDial.tsx`) and the clamp in `lib/todoActions.ts`, which is the choke point the brief means.

**6 · The chassis host is `F12Popover`, not `PortalMenu` — there is no such component.**

**7 · The 10-row cap is Sort's claim, not the toolbar's.** Filter is data-driven (11 status rows here) and its body scrolls.

**8 · `F12Popover`'s fourth caller is unreachable from the live page.** `onSetSendDate` is wired at one site inside the retired `GRID_IS_THE_PAGE === false` branch, so the date editor cannot be opened at all. The §1 variant is still right — a base restyle would reach it, and would again if that branch revives — but its rendered guarantee is unavailable and rests on the source lock plus CSS scoping.

**9 · The list's second action slot had to change verb, which the brief implies and never says.** The ref draws `[Record response] [🔔 Snooze] [× Dismiss] [⋯]` where the build had Nudge in slot two, and §4.1 fixes the grid at four slots. Snooze replaced Nudge on the list; Nudge keeps its home in the drawer's four-verb row.

## §1 · The chassis, as a variant

Per Nick's second correction: **an opt-in variant on `F12Popover`, never a base restyle.**

`F12Popover` gained `chassis?: "plain" | "mount"` (default `"plain"`) and a `foot` slot. `plain` is byte-identical to what shipped. `mount` renders the parchment rim → `.f12-pop-frame` → sage band header → body → foot. Filter, Group and Sort pass `chassis="mount"`; the date editor passes nothing.

**Two independent guarantees, deliberately:**

- **By construction** — the default is `plain`, so a caller that says nothing gets the old render.
- **By cascade** — every new rule in `f12.css` is scoped to `.f12-pop--mount`. Even a caller that opted in *by mistake* could not leak styling back to one that did not.

The mount rules restyle the shell's **existing** rows (`.f12-lbl`, `.f12-prow`, `.f12-sw`) rather than introducing a parallel set, so a menu written against the plain chassis picks up the new look by opting in, with no markup change.

### ⚠️ The finding: `F12Popover`'s fourth caller is dead code

`onSetSendDate` is wired at **exactly one site — line 7914 — inside the retired `GRID_IS_THE_PAGE === false` browsing branch.** The live drawer mounts the timeline at ~6206 and never passes it. So the date editor **cannot be opened from the live page at all**.

That does not make the variant wrong — it makes it cheap insurance. A base restyle *would* have reached that caller, and would reach it again the day the branch is revived or the editor rehomed. But it does change what can be *proved*: the rendered guarantee is **not available**, so it rests on the source lock and the CSS scoping instead.

**The measurement states the unreachability rather than skipping it.** My first version guarded the three assertions behind `if (reachable)`, which is the vacuous-pass shape this repo already records four ways — a probe that finds no element reports no offence. It now asserts `reachable === false` with a message telling the next reader to measure it properly, so **the day it becomes reachable, the case goes red and demands the real check** instead of going quietly green on a guard that never ran.

### ⚠️ And a second stranded control, one layer down

Sweeping `Included` surfaced `needsTasks` in the same shape: `setNeedsTasks` was called **only from inside the popover being deleted**, so once the popover went it would have been a filter you could clear and never set. Swept rather than left as a clear-only control. This is the same fault as `Included` at a different depth, and it is worth saying that I found it by grepping the *setter* rather than the reader — the reader looked perfectly live.

---

## §2 · Group groups the view it is showing

| view | before | now |
|---|---|---|
| **Grid** | already partitioned | + the rule takes the group's `--state-accent` |
| **List** | never partitioned | full-width `.qlv-ghead` rows: Playfair 17px, count pill, accent rule |
| **Board** | control did nothing | **disabled** at `Status`, tooltip *"The board is already grouped by status."*, still stating its value |
| **Calendar** | n/a | unchanged |

`groupAccentClass(label, key)` in `queryCentreGrid.ts` returns `qcc--st-{state}` for status/turn groups and `""` for agency/month — so a heading only takes an accent where one is meaningful, and the fallback `#e4d9cb` is what agency and month draw.

Empty groups are omitted; headings are not sticky. **List reuses `groupLabelFor`/`compareGroupLabels`** — the same derivation Grid uses — so the two views cannot disagree about what a group is called or what order groups come in.

`ToolbarButton` (the To-do session's shared component, landed at `e7acb30e`) gained `disabled` and `title` **additively**: their three mounts and the Query Centre's other two are byte-identical without them.

---

## ~~§3 · The list header, Playfair~~ — SUPERSEDED by the mono rebuild below

*Kept as history. The section that replaces it is "§3 rebuilt" further down; the Playfair choice was withdrawn because it competed with the Playfair agent names beneath it.*

Playfair 14px on parchment over a `1px #ddd2c4` rule; `#6a5a50` muted, ink on hover, ink + burgundy caret on the sorted column; Actions right-aligned and inert. **The headers drive the same `sortKey`/`sortDir` state the Sort menu does** — one sort, two faces.

**The lock did not catch a dead header at first.** It asserted the column keys and that the page routed them, and emptying the `onClick` passed. It now requires the call itself.

---

## Previous run · measured at 1440

*This was numbered §4 in the earlier brief, before the quick actions took that number.*

| reading | value |
|---|---|
| rim, all three menus | `border-radius: 14px` · `padding: 6px` |
| frame, all three | `1px rgba(124, 58, 42, 0.28)` · `overflow: hidden` |
| band, all three | `linear-gradient(135deg, #dce0d9, #d0d6cc)` |
| Filter | 2 group labels (`Status`, `Sent via`), 11 rows, 0 foot — body scrolls |
| Group | 5 rows, 0 foot |
| Sort | 5 rows, **1 foot** (the direction segment) |
| Grid grouped by Status | 10 headings, canonical pipeline order, rule `rgb(231, 217, 189)` |
| List grouped by Status | **same 10 headings, same order, same rule** |
| Board's Group control | `disabled: true` · title as specified · value still `Status` |
| header ascending | caret `▲` · `rgb(124, 58, 42)` · Sort menu reads `Date sent` |
| header descending | caret `▼` · `rgb(124, 58, 42)` · Sort menu reads `Date sent` |
| date editor | **`reachable: false`** — asserted, with cause, per above |

Shots in `reports/query-toolbar-shots/`: the three menus open, Grid and List grouped, Board with the control muted, the header both directions.

**Red-then-green, both required by the brief:**

- **§2's heading count** — reverted `QueryListView` to `rows.map(row)` with the bucketing left in place: `tb-group-list` read `headings: 0` against Grid's 10. Restored, green.
- **§3's shared sort state** — pointed the header's `onSort` at a local `useState` instead of the page's: the caret moved and `tb-header-asc.menu` stayed at `Last activity` while the list re-ordered. Restored, green.

---

## Gates

`03deb076` — tsc **0** · production build read in full, no `error`/`[WARNING]` beyond the expected chunk-size note · vitest **7443 passed, 3 skipped**.

Measurement worktree `/Users/nickphysick/ScriptAlly-tb` at `03deb076`, `vite preview` on 4601, seeded with `seedCorrection.mjs`. Removed at close.

---

### Flags from the §1/§2 run

1. **`onSetSendDate` is only wired in the dead browsing branch.** Either the date editor should be reachable from the live drawer, or that branch and its caller should go. Not this run's call — but it means `F12Popover` currently has **three** live callers, not four.
2. **`needsTasks` is gone.** It had no setter outside the deleted popover. If a "needs tasks" filter is wanted, it needs a control as well as a predicate.
3. **The ref is annotated, not re-issued** — its Filter section still draws two facets. `check-design-refs` still passes; the hash is unchanged.
4. **Carelessness, recorded:** I ran an unscoped `pkill -f vitest` twice during §3. That matches any user's processes on this machine and may have killed another session's run. Task ids thereafter.
5. **Three sessions were building and previewing concurrently during §3** (load ~20). A `timelineCopy.test.ts` red proved to be contention — it passes alone in both trees — and is not a real failure.


---

## §3 rebuilt · mono capitals, and an alignment fault that was already on `main`

`838a121f`. JetBrains Mono 9px / `.16em` / uppercase / `#a08a78` on white, `1px #ddd2c4` beneath, 14px top and 12px bottom — treatment **h1** of the ref's six. The Playfair it replaces was withdrawn for a reason worth keeping: at 14px serif it sat an inch above Playfair agent names at a similar size, so the eye could not separate the label from the data.

**The alignment fault was there before I touched anything, and measuring first is what found it.** The header and the rows already shared one `grid-template-columns` — but each declared its own `padding`, and the `≤1380px` media query narrowed `.qlv-row`'s left padding to 22px while `.qlv-head` kept 26. Every header cell sat **4px right of its column at 1280 and was exact at 1440**, which is precisely why it survived: the width the page is usually looked at is the width where it is correct. The horizontal padding is now declared once on the shared rule and neither may restate it.

**The Agent column sorted on the whole name** under a header reading `Agent`, so "Hester Blaine" filed under H. `surnameKey` takes the last token — the only form that survives a mononym (sorts under itself), a hyphenated surname (one token), and a trailing space (an empty final token would sort that agent to the top). `displayName.ts` records the same three traps against its own splitter.

The caret is now always mounted and opacity-stepped (0 / .4 hover / 1 sorted) rather than conditionally rendered — a caret that appears on hover grows an element under the pointer and reflows the label beside it.

**Two assertions were deleted rather than retargeted**, because both described decisions this section withdraws: that the header is Playfair, and that Actions is right-aligned. What replaced them are the laws they stood for.

**Red-then-green:** restoring `.qlv-row { padding-left: 22px }` to the media query reddens the alignment lock. Worth recording that the first form of that assertion went red on the **correct** file — a bare `.qlv-row {` also matches the tail of `.qlv-head, .qlv-row {`, this repo's first-match trap wearing a grouped selector.

---

## §4 · Snooze and close as quick actions

`7ccd7367`. The rule is an absence and it is the section's whole claim: no drawer, no desk, no route change, and on the list no change of selection.

| piece | where it landed |
|---|---|
| `QuickActionPopover` | one component, `F12Popover chassis="mount"` + a new optional `glyph` slot |
| snooze body | **the To-do dial itself** — `SnoozeDialBody`, its stops, its clamp, its own date picker |
| close body | three reasons in the ref's words + `Open the query` for a date or a note |
| list | slot two becomes Snooze; both quick verbs bypass the desk |
| drawer | four verbs — Record response · Nudge · **Snooze** · **Close** |
| offer tray | its close joined the popover too; Nudge stayed on the desk |
| writes | snooze → `nudgeDate` + the task's dated suppression, **no activity**; close → one `recordQueryResponse` |

**Reusing the dial meant narrowing what it asks for.** `SnoozeDialBody` reads `taskType` and `title` and nothing else, while its prop was the whole `BoardCard` — so the only thing that could reach the clamp was something the To-do board had assembled. A Query Centre row is not that, and the alternative was a synthetic card of a dozen invented fields (the "input its callers cannot produce" fault) or a second, unclamped dial. `clampSnooze`/`reachableStops`/`snoozeCeilingDays` narrowed with it; a `BoardCard` still satisfies the type, so both existing callers are untouched.

**Snooze writes both halves of the one reminder**, because they are one reminder wearing two records: `nudgeDate`, which this page's caption reads, and the `nudge_overdue` task's suppression, which the To-do board reads. Moving one leaves the two surfaces disagreeing about when you asked to be reminded. That is exactly the pair `logNudge` writes — a snooze is `logNudge` minus the activity.

**Close is one write for two surfaces.** `commitClose` was extracted from `saveDeskClosed`, which now delegates. Two close paths would have been one edit from closing a query differently depending on which control was pressed.

**Red-then-green:** deleting the `return` in the quick-pair guard reddens the no-drawer lock — `setSelectedQueryId` comes back inside it — which is the mutation §5 names.

**And a third lock was narrowed after going red on a correct change.** `responseJourneys` forbade `dismissTask` in a slice running from `saveResponse` to a comment three hundred lines below, so it covered every function declared in between; the quick snooze legitimately uses it. Bounded at the next declaration it states its real claim — answering a query deletes its nudge task by itself, so a resolver *there* is machinery pretending to do work — and it was proved still red by putting one back inside `saveResponse`.

---

## §5 · Measured

`tests/e2e/queryViews.measure.ts` → `toolbar v2`, `§5 · quick actions`, `§5 · the header sits on its columns`. Four cases, all green, against a dev build of `24cac905` served from a worktree preview bound to `127.0.0.1`.

**The header sits on its columns — every column, three widths.**

| width | Δ, worst column | Actions |
|---|---|---|
| 1280 | **0.00px** | `justify-content: start` |
| 1440 | **0.00px** | `start` |
| 1920 | **0.00px** | `start` |

Seven header cells against seven row cells at each width, not a sample — the fault this replaces moved *all* of them by one padding value. `.qlv-bar` (the 4px state accent, absolutely positioned) is excluded **by name and the exclusion counted**, because filtering to "the first seven" would silently drop a real column the day one is added.

**The quick actions — three anchors, one copy, nothing behind them.**

| reading | value |
|---|---|
| list bell → popover | title `Snooze the nudge`, framed, dial present |
| drawer open? | **0** · desk open? **0** · route unchanged · selection unchanged |
| list cross → popover | `Close this query`, reasons exactly `They passed` · `I withdrew it` · `No reply — gone quiet` |
| copy from all three anchors | **byte-identical `innerText`** |
| dial axis marks | `1D · 1W · 1M · 3M` |

The axis marks are the proof that it is **the To-do dial rather than a four-stop re-roll**: they come from `SNOOZE_STOPS`' own `axis` field, and 4 and 8 weeks are not stops in that table at all. Reading rendered ticks is what separates "imported the component" from "reimplemented it with the import sitting unused".

Identical `innerText` from three different controls is a claim only the composition can satisfy — three components with the same words would pass a per-anchor check and fail this the moment one was edited. A floor on the length is asserted too, since three empty strings are also identical.

**Red-then-green — all four the brief lists:**

| claim | mutation | result |
|---|---|---|
| §2 heading count | List reverted to `rows.map(row)` with bucketing intact | `headings: 0` against Grid's 10 *(previous run)* |
| §3 shared sort state | header's `onSort` pointed at a local `useState` | caret moved, Sort menu stayed at `Last activity` *(previous run)* |
| §3 header/column alignment | header `padding-left: 26px → 30px` | **red by exactly 4px at 1440** — the original fault's own magnitude |
| §4 no-drawer rule | snooze branch also calls `setSelectedQueryId` / `onOpenQuery` | **red on the route**: `/queries?q=seed-cal-soon-q&view=list` |

The alignment mutation bit at 1440 and not 1280 — the narrow media query's shared rule is later in the file and overrode it — so the case found it at the width where it applied.

**Shots at 1440** in `reports/query-toolbar-shots/`: the three menus open, Grid and List grouped by Status, the Board with Group muted, the header sorted both ways, snooze from all three anchors, close from a list row.

### Two assertions from §4's list are proved at source and NOT on the page

*"a snooze writes no activity … a close writes exactly one activity."* Both are locked over the write bodies — no activity primitive is reachable from `commitQuickSnooze`, and `commitClose` holds exactly one `recordQueryResponse` while the desk's save holds none. **They are not measured on the rendered page, because both mutate the shared harness account** and this repo has already paid for a writing measurement that failed to put one back. Doing them properly means a commit-then-undo with nothing navigating in between; that is real harness work rather than a line, and it is the honest next step for anyone who wants the rendered proof.

### And two things worth recording from the harness itself

The date-editor probe used to die with a stack trace when it could not reach its control. Every path through it now returns a **reason** — this run's was `no in-place date control on the send rung`. The reason varies with the drawer's state and every one agrees on `reachable: false`, which is the claim. But a synchronous `count()` straight after the click reported *"the card did not open the drawer"* about a drawer that opens perfectly, and **I nearly wrote that down as a regression**: a precondition still has to be stated about a *settled* page.

And writing this very section hit **the first-match slicing trap this file already documents.** The report has two `## Flags` headings; `index("## Flags")` found the earlier one, so the slice ran backwards, came out empty, and `str.replace("", …)` inserted the new block between every character in the file — 73MB, 846,000 lines. Restored by path (`git show HEAD:… >`) rather than a checkout, and redone line-based with a guard that refuses an empty or suspiciously small slice. **The tell was the line count, not the diff** — which is the same lesson as verifying a removal against the post-edit file.

## Flags — current

1. **The gate was red from another session's WIP throughout.** `AgentList.tsx` is mid-refactor (`groupAgents`/`AgentGrouping` unwritten), so the shared tree's `tsc` fails. Provenance established by reading — every error names their file, none names mine — and my files were typechecked clean over a HEAD worktree instead. Nothing of theirs was moved or staged.
2. **`Mark closed` became `Close`** in the drawer, per §4.5's verb list. Two locks named the old label and were retargeted.
3. **`main` is unpushed and well ahead of `origin`.**
