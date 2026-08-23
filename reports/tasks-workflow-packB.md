# Pack B — `useTaskPaneSession`, and the calendar opens the pane

**Session:** `tasks-workflow` · 23 Aug 2026, overnight.
Basis: `reports/tasks-workflow-recon.md`, `reports/tasks-workflow-session-recon.md`, Pack A.

**Red gates: both passed.** Territory clean; `TaskPane`, `TaskPaneBody`, `buildJourney` and
`taskCardFacts.ts` all present and unrestructured. Baseline **tsc 0**, **376 files / 6384 tests**.

---

## Phase 0 — recon

### 1. The session state, confirmed against the current tree

**Four move:** `paneBody` (`:931`), `bulkRows` (`:469`), `bulkTouched` (`:460`), `showMissing`
(`:463`).

**Three stay, and they are not session state** — unchanged from the last recon: `snoozeAnchor`
(`:450`) and `dismissOpen` (`:453`) are UI state for two surfaces **the page renders**
(`AnchoredPanel`, `TaskDismissDialog`), and `dockKey` (`:738`) is the **dock cursor**, coupled to
`chip`/`search`/`tagSel`/`dockable`/`allDockable`/`dockPos`. The hook takes `card`, so the host
chooses it by construction.

### 2. How `bulkRows` travels

One reader outside the pane block: `commitFromPane` (`:2842`), `if (isBulkCard(card)) return
commitRecordSweep(card, bulkRows)`. Once the state lives in the hook it **travels as an argument**
— `commit(card, values, bulkRows)` — because the host's commit family owns the writes, the toast
and the navigation, and the hook owns the rows. Neither can hold both halves.

### 3. The host callbacks — **seven, not six**

| callback | what it needs |
|---|---|
| `jumpToSection(id)` | page DOM: `document.querySelector('.tpn #id')`, scroll, focus, the retriggerable `askme` class |
| `openFlow(card)` | `openFlowCards` — the `offer`/`fix` fall-through |
| `commit(card, values, bulkRows)` | the `commitFromPane` family: db writes, toast, navigate |
| `advance(card)` | `dockable` + `setDockKey(nextKey)` — the dock cursor |
| `onSnooze(el)` | sets `snoozeAnchor`; the **page** renders `AnchoredPanel` against that element |
| `onDismiss()` | sets `dismissOpen`; the **page** renders `TaskDismissDialog` |
| **`openQuery(card)`** | **the seventh.** `paneVerbs.openQuery.onPress()` → `onNavigate("queries", id)`. It navigates, so it cannot be the hook's. |

The *disabled* flags for snooze and dismiss need no callback — they come from `cardMenu(card, col)`,
a pure lib the hook can call itself.

### 4. `TaskPaneBody`'s ids

Four, all hard-coded: `s-unit` (`:189`), `s-when` (`:214`), `s-expect` (`:248`), `s-remind`
(`:273`). Their canonical source is **`paneGate.REQ`** (`:67`–`:70`), which also feeds:

- `nextId` — `TaskPaneBody`'s `sect(id)` compares the **bare** id to it (`:172`);
- `anchorFor(field)` (`paneGate:85`) → `jumpToSection(id)` (`ToDoPage:3413`), the only consumer,
  called from `dockPrimary` (`:3353`) and passed as `onJump` (`:1974`).
- `paneGate.test.ts:138` asserts `missing[0].id === "s-when"` — **on the bare id**.

> **The design that follows:** `paneGate` keeps emitting bare names, so its test stays green
> untouched and `sect()`'s comparison is unchanged. Only the rendered `id` attribute takes the
> prefix, and `jumpToSection` applies the same prefix when it queries. Default `""` ⇒ `/todo` is
> byte-identical.

### 5. Host requirements for mounting `TaskPane` elsewhere

**Zero** occurrences of `createPortal`, `useOverlay`, `onToast`/`useTodoToast` or `document.` in
`TaskPane.tsx`. Portal, scrim, focus trap, escape and toast are **all the host's**. `.tpn` is
`display:flex; flex-direction:column; flex:1; min-height:0; width:100%` and owns an inner
`overflow-y:auto` — *"`min-height: 0` IS NOT OPTIONAL ANYWHERE ON THE CHAIN"* — so a window host
must give it a **bounded height**.

### 6. Journey kinds

The calendar passes one card, and every card maps through `cardBucket` into one of `TaskPane`'s
seven kinds. **`paneCommits` is false for exactly `offer` and `fix`** (`paneCommit.ts:107`–`108`) —
the fall-through set, preserved as parity per the ruling.

---

## ⛔ PHASE 2 — STOPPED, on the pack's own condition

> *"The hook … builds the journey from `(card, data)` via `taskCardFacts.ts` — **not** by receiving
> `boardCols`, `facts`, `events` or `primaryLabel` as arguments. **If it needs any of those passed
> in, the lift was incomplete: stop and report** rather than widening the signature."*

**It needs one, and it is `boardCols`.**

The journey's `facts` come from `paneFacts`, which calls **`figureFor(c, db, snoozedKeys, now)`**.
Pack A lifted `figureFor` correctly — but it made `snoozedKeys` a **parameter**, because the closure
captured `boardCols.snoozed`. So the hook must supply it, and:

```
snoozedKeys ← boardCols.snoozed ← assembleBoardColumns({ …, hiddenUserTaskId: pendingSaveId })
                                                                              ^^^^^^^^^^^^^^
                                                                              page state (:320)
```

**The hook cannot derive the same board independently**, because `pendingSaveId` — the in-flight
create the page hides during an optimistic save — is page-local. A hook deriving its own board would
produce a *different* one during a save, which is the two-readings-of-one-fact fault this whole
extraction exists to avoid.

**And it genuinely matters**: `railGroups()` (`:3482`) feeds `boardCols.snoozed` into the dock, so
**a snoozed card can be the docked card**, and its figure is the snoozed branch of `figureFor`.
Passing an empty set would silently change the pane's figure for those cards.

### The remedy, so the next pack is short

**Complete the lift**: give `figureFor` the ability to answer *"is this card asleep?"* from
`(card, data)` alone, and drop the `snoozedKeys` parameter. The material is already there —
`snoozedCards` (`todoColumns:200`) is driven by **`taskFlags`**, which is in the data bundle, via
`flagSleeps(f, nowMs) && !flagDismissed(f)`, and **does not read `pendingSaveId`** (that only hides
an in-flight *user task*, and snoozed cards come from flags).

**It is one change with one obligation**: prove that the re-derivation equals `boardCols.snoozed`
for every card the pane can dock, because if it diverges the pane's figure changes silently. That is
a Pack A-shaped job — a small lift with a rendered-page acceptance — and it is *not* this pack's
"move, not a redesign", which is why it is reported rather than attempted.

**Phase 3 depends on Phase 2 and stops with it. Phase 1 does not** — it is independent, and it is
delivered below.
