# Query Centre — toolbar popovers, Group, and the list header

Run of 5–6 Sep 2026 · ref `design-refs/query-toolbar-v2-locked.html` (sha256 `294f36bb…`, verified at commit and again before §1 resumed). **All four sections built.** Commits `1df1b13f` (ref) → `be510ade` (§3) → `03deb076` (§§1–2) → this one (§4).

---

## ⚠️ False premises, before anything else

Five, and three of them would have produced a wrong build if followed literally.

**1 · The ref's Filter section says two facets. It is three, and the ref is superseded on this point only** — Nick's own correction, mid-run: *"Filter keeps three facets — Status · Sent via · Version. My 'exactly two' retired Part E's version filter by accident."* `Included` is gone outright (nothing read it); Version stays and renders **conditionally**, only when the manuscript has more than one version. On the harness fixture it does not render at all — which is why the measurement asserts *"Version present iff version rows present"* rather than a facet count. The ref file is annotated in place rather than re-issued.

**2 · "Group is currently inert" is false for Grid.** Grid was already partitioning correctly before this run — `QueryCentreGrid` has grouped since the views pass. What was actually missing was three narrower things: **List** never partitioned at all, the section rule was a flat parchment line rather than the group's accent, and **Board** offered a control that silently did nothing. Had I taken the premise at its word I would have rebuilt working code.

**3 · The chassis host is `F12Popover` in `F12Shell.tsx`, not `PortalMenu`.** The brief names the latter; there is no such component. `F12Popover` portals to `document.body` and is positioned by `useFixedMenu`.

**4 · The 10-row cap is Sort's claim, not the toolbar's.** The brief states it under Sort, where five keys plus a footer cannot exceed it. Filter is **data-driven** — 11 status rows on this fixture — and its body scrolls. My first harness applied the cap to all three menus and went red on correct code; narrowed to Sort.

**5 · The fourth caller is unreachable — see below.** It exists, it is real, and the live page cannot open it.

---

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

## §3 · The list header (accepted 5 Sep)

Playfair 14px on parchment over a `1px #ddd2c4` rule; `#6a5a50` muted, ink on hover, ink + burgundy caret on the sorted column; Actions right-aligned and inert. **The headers drive the same `sortKey`/`sortDir` state the Sort menu does** — one sort, two faces.

**The lock did not catch a dead header at first.** It asserted the column keys and that the page routed them, and emptying the `onClick` passed. It now requires the call itself.

---

## §4 · Measured at 1440 · `tests/e2e/queryViews.measure.ts` → `toolbar v2`

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

## Flags

1. **`onSetSendDate` is only wired in the dead browsing branch.** Either the date editor should be reachable from the live drawer, or that branch and its caller should go. Not this run's call — but it means `F12Popover` currently has **three** live callers, not four.
2. **`needsTasks` is gone.** It had no setter outside the deleted popover. If a "needs tasks" filter is wanted, it needs a control as well as a predicate.
3. **The ref is annotated, not re-issued** — its Filter section still draws two facets. `check-design-refs` still passes; the hash is unchanged.
4. **Carelessness, recorded:** I ran an unscoped `pkill -f vitest` twice during §3. That matches any user's processes on this machine and may have killed another session's run. Task ids thereafter.
5. **Three sessions were building and previewing concurrently during §3** (load ~20). A `timelineCopy.test.ts` red proved to be contention — it passes alone in both trees — and is not a real failure.
