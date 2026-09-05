# Drawer round — Phase 0 recon

**Stopped at the Phase 0 boundary.** No code committed beyond the two contracts. Three of the five
recon answers change the brief, and one of them changes a Phase 1 assertion, so they are reported
before a page rewrite starts rather than discovered inside it.

## Contracts

⚠️ **Neither contract was in the tree.** Both were in `~/Downloads`, byte-identical to the stated
hashes (`4b590526…`, `4c34f165…`), so this took the staleness rule's found-elsewhere branch rather
than stopping. Installed unmodified and committed alone — `design-refs` 395 → 397 files — and both
are enrolled on `check-design-refs.mjs`'s watchlist (20 → 22 guarded), so a later edit to either
fails the build rather than silently changing what this round's assertions cite. SHA `c4080482`.

## Baseline, before anything

`paneMounts.measure.ts` — **14/14 green**, 30 rows, six journey kinds on the board
(`Decide, Send, Chase, Close, Fix, Note`). That is the check the brief names as the first thing this
round will break, so it is the number to compare against.

⚠️ Measured in a **worktree**, not the shared checkout: another session is editing `src/` (the
calendar) continuously, and `bundleGuard` correctly refuses a bundle older than its sources.

---

## 1 · `AnchoredPanel` — can it host the two panels?

**Yes, for everything the brief lists.** It takes arbitrary `children` and owns only *placement* and
*dismissal* — `placeMenu` for right-aligned, viewport-clamped, flip-above; Escape, outside
pointerdown and resize all close; focus returns to the trigger. Radio groups, tick groups, a search
input, a two-way switch and conditional counts are all just children.

**What it cannot express, and one of these will bite:**

- ⚠️ **It re-places itself whenever `children` change** — `useLayoutEffect(..., [anchor, children])`.
  The Filter panel's counts are conditional on the other filters, so **every tick changes the
  contents and re-runs the placement**. A panel whose height changes as you tick will JUMP under the
  pointer. The fix is the caller's: a stable height (fixed `max-height` plus internal scroll) so the
  measured box does not move. Worth building that way from the start rather than discovering it.
- **No initial focus and no focus trap.** The Filter panel's find box wants autofocus; the caller
  must do it.
- **No scroll containment.** A 22-agent tick list needs its own `overflow` in the caller's contents.
- **`resize` closes it outright** (`bail`). Harmless on desktop; mobile is out of scope anyway.

---

## 2 · `todoPrefs.listView` — ⚠️ FALSE PREMISE: it does not exist

`TodoPrefs` is `{ staleMonths, rollForward, weeklyBriefing, types }`. There is no `listView` key and
nothing persists the list's view state — `sort` and `chip` are `useState` in `ToDoPage`, session-only.

**What DOES exist is better than the brief assumes.** `src/lib/todoListView.ts` already models the
view as a value, pure and unit-locked:

```ts
interface ListView { groups; types; includeSnoozed; includeDismissed; sort; grouping }
VIEW_DEFAULT = { …all on…, sort: "needs-you", grouping: "grouped" }
```

Mapping the contract onto it:

| contract | today | verdict |
|---|---|---|
| Filter → Task type ticks | `types: Bucket[]` | ✓ exists |
| Filter → Also show (snoozed, dismissed) | `includeSnoozed`, `includeDismissed` | ✓ exists |
| Group by (5 options) | `grouping: "grouped" \| "flat"` | extend — 2 values → 5 |
| Then order by (6 options) | `sort: SortId` (5 values) | extend |
| direction switch | — | **new field** |
| Filter → Agent ticks | — | **new field** |

⚠️ **AND PERSISTENCE IS FREE.** `firestore.rules` validates the user doc's `todoPrefs` as
`data.todoPrefs is map` with **no key-level check**, and `todoPrefs` is already in the user-update
allowlist. So `todoPrefs.listView` can be added **with no rules change and no deploy** — which is
unusual here and worth knowing before anyone plans one.

---

## 3 · The sidebar — ⚠️ the state exists, the SEAM does not

`useSidebarCollapsed()` gives `{ collapsed, ready, setCollapsed, toggle }`, persisted in
`localStorage`, with a window `keydown` listener for `[` / ⌘\.

**But it is instantiated in `WorkspaceShell`, and `/todo` is a page inside it.** There is no context,
no prop and no custom event — a page cannot reach `setCollapsed`. Phase 2 would need a new seam in
`WorkspaceShell`, which is shared chrome this session does not own.

⚠️ **And there is a second hazard even with a seam: `setCollapsed` WRITES `localStorage`.** A
drawer-driven collapse would change the writer's own sidebar preference, permanently, as a side
effect of opening a task. Restoring on close is not enough — a run that dies with the drawer open
leaves the preference flipped.

**Taking the brief's own escape: report and skip.** The brief says *"if recon 3 finds no such state,
report and skip — do not build one"*. The state exists; the route to it does not. The distinction
matters, so it is stated rather than filed as "no such state": this is one small seam
(`WorkspaceShell` publishing the setter through context) plus a decision about the persistence, not
a feature to invent. **Phase 2 will build the drawer without the sidebar collapse and say so.**

---

## 4 · Agent photos — the field exists; nothing on this account has one

`Agent.image?: string` — *"Agent photo, stored inline as a data URL (centre-cropped square, 256×256,
JPEG q0.82 ≈ 15–30KB). Deliberately NOT Firebase Storage. **Absent === the initials avatar.**"* The
fallback Phase 1 wants is already the documented behaviour, and `agentInitials()` already exists.

⚠️ **But the photo branch cannot be exercised here.** Of 22 agents, **0 have an image** — and
`image` is **not in the agent update allowlist** in `firestore.rules`, so one cannot be written
either (photo upload is out of scope, which is presumably why). Phase 1's avatar assertion is
therefore about the **initials** path; the photo path is unit-lockable only, and the report will say
which of the two it had.

---

## 5 · The suites this round retires — ⚠️ 6 files, not the 97 it first looks like

97 measure files mention `/todo` or `.tpn`. That number is misleading: most touch the route or the
pane's outermost class and nothing this round changes.

**Depending on the structural classes the round actually retires** (`.tdw-split`, `paneCol`,
`fc.work`, `fc.rec`, `workscroll`, the two-column pane grid):

| file | why |
|---|---|
| `contract.measure.ts` | the pane's chassis |
| `finishRound.measure.ts` | `.fc.work` / `.fc.rec` / `.workscroll` — repaired only yesterday |
| `paneRecon.measure.ts` | the pane's structure |
| `steerRound.measure.ts` | `.fc.work` / `.workscroll` — repaired only yesterday |
| `workspaceRound.measure.ts` | the worksheet/record split this round removes |
| `qcPanel.measure.ts` | matches on `.ws` — likely a **false positive** (Query Centre, not this pane); confirm before touching |

Plus two the brief already implies: **`paneMounts.measure.ts`** (named, and the baseline above) and
**`journeyRound.measure.ts`** (reads `.tlc .row`, `.tpn .q`, `.actbar` — the list rows and the ledger,
both of which move).

**So Phase 7 is roughly eight files, and two of them were repaired yesterday and will need it again.**
That is a real cost and it is now a number rather than a worry.

---

## What changes in the brief

1. **Phase 6** does not extend `todoPrefs.listView`; it **creates** it, extending the existing
   `ListView` value. No rules change needed — verified against `firestore.rules`.
2. **Phase 2** builds the drawer **without** the sidebar collapse, per the brief's own escape, and
   names the one seam that would enable it.
3. **Phase 1**'s manuscript-column assertion needs a **second account shape**: this account has
   **4 manuscripts**, so "absent on one manuscript" cannot be measured here. Same shape as the
   drawer round's Phase 3 fixture — one board state cannot prove both halves.
4. **Phase 1**'s avatar assertion is about **initials**; the photo path has no data and no way to
   write any.
5. **Phase 7** is ~8 files, not 97 — and `qcPanel` should be confirmed as a false positive first.
