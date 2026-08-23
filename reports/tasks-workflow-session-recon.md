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
