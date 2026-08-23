# `useTaskPaneSession` — Phase 0 recon

**Session:** `tasks-workflow` · 23 Aug 2026, overnight.
Basis: `reports/tasks-workflow-recon.md`, re-verified against the current tree.

**Red gates: both passed.** To-do territory clean; `TaskPane`, `buildJourney` and the pane block all
present and materially unchanged since the last recon. `tsc` baseline **0**.

---

## 1. The seven `useState` hooks, and every reader

| state | decl | readers | verdict |
|---|---|---|---|
| `paneBody` | `:984` | `paneWill` (1133–1218), pane block (2031), `gateAnswers` (3408–3417), `dockPrimary` (3483) | **session — moves** |
| `bulkTouched` | `:451` | `paneWill` (1115–6), pane block (2060), `gateAnswers` (3418) | **session — moves** |
| `showMissing` | `:454` | pane block (2057), `dockPrimary` | **session — moves** |
| `bulkRows` | `:460` | pane block (1992), **`commitFromPane` (2926)** | **session — moves, but see below** |
| `snoozeAnchor` | `:441` | **`AnchoredPanel` mount (1895–1900)** | **NOT session — stays** |
| `dismissOpen` | `:444` | **`TaskDismissDialog` mount (1908)** | **NOT session — stays** |
| `dockKey` | `:720` | `resolveDocked` (761), two narrowing effects (813–833), commit advance (3495) | **NOT session — stays** |

> **⚠️ THREE OF THE SEVEN WERE NEVER PANE-SESSION STATE, and that is a correction to the inventory
> rather than a way round the stop condition.** `snoozeAnchor` and `dismissOpen` are UI state for
> two surfaces **the page renders** (`AnchoredPanel`, `TaskDismissDialog`); a hook cannot own state
> whose only consumer is markup outside it. `dockKey` is the **dock queue cursor** — which card of
> the *narrowed* list the pane shows — coupled to `chip`, `search`, `tagSel`, `dockable`,
> `allDockable` and `dockPos`. The pack's own signature takes `card` as an argument, so the host
> chooses the card by construction and `dockKey` was never in scope.

**`bulkRows` is the one genuine cross-reader**: `commitFromPane` (`:2921`) reads it directly,
because *"the table edits fifteen queries and `JourneySendValues` describes one"*. It is not stuck —
the hook owns it and hands it to the host's commit callback — but it is the one field that must
**travel as an argument** rather than simply moving.

---

## 2. Dependency sets

**`gateAnswers` (`:3403`)** — `sendSpecFor(card)` (pure), `paneBody`, `bulkTouched`. **Fully session.**

**`jumpToSection` (`:3506`)** — `document.querySelector('.tpn #${id}')`, `scrollIntoView`, focus, and a
retriggerable `askme` class. **Entirely page-local DOM.**

**`dockPrimary` (`:3434`)** — the widest:

| needs | source | after the move |
|---|---|---|
| `journeyKind`, `firstMissing`, `paneJourneyKind`, `isBulkCard`, `paneCommits`, `anchorFor` | pure | hook |
| `gateAnswers`, `setShowMissing`, `paneBody` | session | hook |
| `jumpToSection` | page DOM | **host callback** |
| **`openFlowCards([card])`** | FocusFlow | **host callback** |
| `dockable`, `setDockKey(nextKey)` | dock cursor | **host callback** |
| `commitFromPane(card, values)` | db writes + toast + navigate + `bulkRows` | **host callback** |
| `queries` | shared db | hook calls `useScriptAllyDb()` itself |

> **⚠️ `dockPrimary` HAS A `FocusFlow` FALL-THROUGH, AND IT IS NOT A LEGACY PATH.** When
> `!paneCommits(jk)` it calls `openFlowCards([card])`. `paneCommits` is **false for `offer` and
> `fix`** — so on `/todo` today, pressing the pane's primary for an offer or a housekeeping gap
> raises a `FocusFlow` sheet. After Phase 2 the calendar would do the same, **because that is
> parity**. "The calendar opens the same pane" is therefore true for *display* on all kinds and for
> *commit* on three of five (`send`, `chase`, `close`, `materials`, `note` commit in the pane;
> `offer` and `fix` hand off). Nick's reported symptom — the nudge — is `chase`, which commits in
> the pane, so it is fixed. Flagged rather than changed: this pack forbids improving in passing.

---

## 3. Page-local DOM in the four `nav` handlers

| handler | what it touches | how it must be supplied |
|---|---|---|
| `onJump` | `document.querySelector('.tpn #id')` + scroll + focus + class | **host callback, scoped to the pane's own root** — see the blocker below |
| `onSnooze` | sets `snoozeAnchor`; the **page** renders `AnchoredPanel` against that element | **host callback** — the hook never sees the node |
| `onDismiss` | sets `dismissOpen`; the **page** renders `TaskDismissDialog` | **host callback** |
| `onOpenQuery` | `paneVerbs.openQuery` → `onNavigate(...)` | **host callback** (`paneVerbs` also reads `cbSnooze` ref and `setCbDial`) |

**No handler queries the document from inside the hook.** All four stay with the host, which is the
option the pack's constraint 1 allows.

---

## 4. `TaskPane` / `TaskPaneBody` host requirements

- **Zero** occurrences of `createPortal`, `useOverlay`, `onToast`/`useTodoToast` or `document.` in
  `TaskPane.tsx`. Portal, focus trap, scrim, escape handling and toast are **all the host's job**.
- `.tpn` is `display:flex; flex-direction:column; flex:1; min-height:0; width:100%` — it fills its
  parent and owns an inner `overflow-y:auto`. The sheet states the rule: *"`min-height: 0` IS NOT
  OPTIONAL ANYWHERE ON THE CHAIN."* **A window host must give it a bounded height** or its scroller
  will not scroll.

---

## 5. The recorded scrim decision — quoted, and it holds

`FocusFlow.tsx:245`:

> *"⚠️ WHAT STAYS THIS FILE'S OWN IS THE BACKDROP MEANING, and it is the opposite of the settings
> sheet's: a stray click on the scrim NUDGES rather than closes, because this journey holds a
> STAGED model that a misplaced click must not discard. That difference is why the primitive takes
> `onScrimClick` instead of assuming one."*

**It transfers to `TaskPane` unchanged and with more force**: `paneBody` is unsaved until the primary
commits, so the calendar's window is **escape-and-× only, never scrim-close.**

---

## 6. Journey kinds the calendar can produce

The calendar sets `flowCard` from a single card (`:867`) and passes `{kind:"card"}` only. Every card
maps through `cardBucket` into one of `TaskPane`'s seven `JourneyKind`s, `fix` being a stated default
rather than a fallback. **No task type the calendar shows is reachable only through `FocusFlow`.**
The three sheets with no `TaskPane` counterpart — `groupSheet`, `sweepSheet`, `reviewSheet`/
`sundayReviewSheet` — are **multi-card rituals** the calendar never opens, exactly as ruling 2 fixed.

---

## ⛔ A BLOCKER FOR PHASE 2 THAT PHASE 0 EXISTS TO FIND

**`TaskPaneBody` renders hard-coded element ids** — `s-unit` (`:189`), `s-when` (`:214`),
`s-expect` (`:248`), `s-remind` (`:273`) — and **every workspace page in this app stays mounted**.

So mounting `TaskPane` on the calendar while `/todo` is alive puts **duplicate ids in the document**:

1. `jumpToSection`'s `document.querySelector('.tpn #s-unit')` returns the **first** match — the
   To-do page's hidden pane. The calendar's "jump to the missing answer" would scroll a page the
   writer cannot see. This is the mounted-pages hazard this repo has been bitten by repeatedly.
2. Duplicate ids are invalid HTML, and any `aria-labelledby` / label-`for` association resolving by
   id becomes ambiguous.

**Scoping the query to a ref fixes (1) and not (2).** Fixing (2) means giving `TaskPaneBody` an
`idPrefix` and having `anchorFor` return a bare name the host prefixes — **a change to a component
this pack did not put in scope**, and the pack says this is *"a move, not a redesign"*.

**Phase 1 does not depend on this** — with only `/todo` mounting the pane there is one `.tpn`, so
scoping the query to a ref is behaviour-identical there. **Phase 2 does.** The ruling is Nick's.

---

# Phase 1 — **STOPPED**, on the pack's own condition

> *"If any state has a reader outside the pane block (Phase 0 item 1), stop and report. That is the
> real seam and Nick rules on it. **Do not restructure the page to force the move.**"*

**No source file was modified.** The extraction was mapped to the line, and then measured — and the
measurement says the job is not the one that was approved.

## What the map showed when it was followed through

The four session states move cleanly. **The journey assembly around them does not**, because it
depends on derivations **the list itself consumes**:

| the journey needs | which needs | consumed elsewhere by |
|---|---|---|
| `paneFacts` (`:1054`) | **`figureFor`** (`:874`) | `figureFor` reads **`boardCols`** (`:544`) — *"the same object the subtitle, FILTERS and badge read"* |
| `noteAgo` (`:1234`) | **`listRowInputs`** (`:1025`) | passed to the list as **`rowInputs={listRowInputs}`** (`:3635`), and drives the view's sort key (`:3584`) |
| the reset effect (`:1005`) | **`recordSweepFor`** (`:3027`) | the cohort derivation the bulk card is raised by |
| `events` | `dockTimeline` (`:3290`, 113 lines) | pane-only ✓ |

> **⚠️ SO THE HOOK CANNOT OWN THE JOURNEY WITHOUT OWNING THE LIST'S DERIVATIONS TOO.** There are
> exactly three ways out and the pack forbids all three:
>
> 1. **Duplicate them in the hook** — two readings of one fact, which is the fault this codebase has
>    been caught by more than any other, and which `figureFor`'s own comment exists to prevent.
> 2. **Lift them to a lib module** both the list and the hook call — correct, and it is
>    *restructuring the page*, which constraint 2 and the stop condition both forbid.
> 3. **Pass them in** — `boardCols`, `listRowInputs`, `recordSweepFor`, `facts`, `events`,
>    `primaryLabel`, plus the six callbacks. At that width "one thing both pages call" has stopped
>    being true, and it is the input-gathering abstraction Nick already ruled was wrong, wearing a
>    hook's clothes.

## The scope, measured rather than estimated

| region | lines |
|---|---|
| `figureFor` | 80 |
| `seedRows` · `statedWeeks` · the reset effect | 71 |
| `paneFacts` | 59 |
| `paneWill` | 114 |
| `noteAddedDate` · `noteAgo` | 19 |
| `dockTimeline` | 113 |
| `gateAnswers` | 31 |
| `dockPrimary` | 72 |
| `jumpToSection` | 11 |
| the pane block's `buildJourney` + body JSX | ~110 |
| **total** | **≈ 680** |

**The pack estimated ~200.** The gap is not padding: it is `figureFor`, `paneFacts`, `dockTimeline`
and `paneWill` — journey *construction*, which the first recon correctly placed outside the session
and which cannot stay behind once the session leaves.

## The three states that stay, restated

`snoozeAnchor`, `dismissOpen` and `dockKey` are **not pane-session state** (Phase 0, item 1). Their
handlers stay with the host as callbacks, which is what constraint 1 allows. `bulkRows` moves but
**travels as an argument** to the host's commit, because `commitFromPane` reads it directly.

---

## The corrected plan, so the next pack can be right

**It is two packs, not one, and the first is not the hook.**

**Pack A — lift the shared derivations to pure lib functions.** `figureFor`, `listRowInputs` and
`recordSweepFor` become `(card, db) => …` in `lib/`, and `ToDoPage` calls them exactly where it does
now. **Nothing moves into a hook; nothing changes shape.** Every existing test should stay green
untouched, which is the honest acceptance for a pure lift, and it is verifiable in a way the hook is
not. This is what makes the hook possible without duplication.

**Pack B — `useTaskPaneSession`.** With the derivations callable, the hook owns the four states and
builds the journey from `(card, db)` alone. The host bundle shrinks to the **six callbacks** that
genuinely belong to the page — `jumpToSection` (scoped to a ref, see the Phase 2 blocker),
`openFlow`, `commit`, `advance`, `onSnooze`, `onDismiss` — and *that* is one thing both pages call.

**And Phase 2 still needs its own ruling** — `TaskPaneBody`'s hard-coded ids (`s-unit`, `s-when`,
`s-expect`, `s-remind`) against pages that all stay mounted. That blocker is independent of both
packs and is documented above.
