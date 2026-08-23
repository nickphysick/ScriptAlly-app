# One task workflow, everywhere — Step 0 recon

**Session:** `tasks-workflow` · 23 Aug 2026, overnight, unattended.
Ref: the pack's own framing, checked against the code.

> # ⛔ STOPPED AT STEP 0 — **two of the pack's own stop conditions fire, and they are independent.**
>
> **Nothing was built. No source file was modified.** This report is the whole deliverable, and the
> two rulings it asks for are the pack's own ("stop and report — that field is the real seam and
> Nick rules on it", and "do not delete — report and stop").
>
> | | |
> |---|---|
> | **Phase 1** | `useJourneyInputs()` **is not possible as specified.** The majority of `JourneyInputs` is not gathered from hooks at all — it **is the pane's live form state** plus its host's UI state. Field-by-field table below. |
> | **Phase 3** | The legacy nudge sheet is **not calendar-only.** `ToDoPage`'s weekly review feeds it every `board.do` card, and `nudge_overdue` is in `DO_NEXT_TYPES`. The pack says: do not delete. |
>
> Phase 2 depends on Phase 1, so it stops with it. **Both red gates passed** — To-do territory was
> clean and stayed clean, `TaskPane` and `buildJourney` are present and unrenamed.

---

## 1. The legacy modal — it is not a component, and it is not calendar-only

**It is `nudgeSheet`, a function inside `FocusFlow.tsx` (`:685`).** There is no separate component,
no route, no state of its own. The pack's description — *"not the To-do pane and not `FocusFlow`'s
normal chrome"* — is right about what it looks like and wrong about what it is: it is one of
**twelve** sheet functions inside `FocusFlow`, selected by `cardJourney(card) === "nudge"` at
`:1932`.

**Who reaches it:**

| Surface | Route | Reaches `nudgeSheet`? |
|---|---|---|
| `TodoCalendarPage:1275` | `<FocusFlow items={[{kind:"card", card: flowCard}]}>` | **yes**, for a `nudge_overdue` card |
| `ToDoPage:2162` | `<FocusFlow items={flow.items} …>` via `setFlow` | **yes** — see below |

`ToDoPage` opens it two ways: `openFlowCards(cards)` (`:494`) with arbitrary cards, and
**`openSundayReview()` (`:3697`)**, which does `setFlow({ items: board.do.map(…), mode:
"weeklyReview" })`. `board.do` is built from `DO_NEXT_TYPES` (`todoBoard.ts:40`), which contains
**`nudge_overdue`**. So the weekly review walks the writer through every nudge in the *same
bespoke sheet*.

> **⚠️ SO DELETING IT WOULD CHANGE `/todo`, NOT JUST THE CALENDAR** — it would blank a step in the
> weekly review. The pack's instruction is explicit and this report obeys it: **not deleted,
> reported, and the coupling flagged.**

**`ToDoPage` does show it** — that is the coupling, in one sentence.

### The copy

Both offending strings are **`FocusFlow.tsx` only**, three occurrences, no other surface:

| Line | String |
|---|---|
| `:691` | `Their stated reply time is {n} weeks — a polite follow-up is fair.` |
| `:766` | `No reply window is recorded for {who}. A polite follow-up is fair once their stated window has passed.` |
| `:703` | `Time to nudge {who}?` |

**They are verdicts and prompts, and the laws are right about them** — but they cannot be removed
by retiring the sheet, because the sheet stays. **Flag 5: nowhere else reuses them.** Fixing the
copy in place is a small, safe change that this pack did not authorise (it said "do not author
replacement copy"), so it is left for a ruling.

---

## 2. `JourneyInputs` — **the pack's model of it does not match the code**

The pack describes *"inputs gathered by `ToDoPage` from hooks it holds"*. That is true of about a
third of the object. The rest is **the pane's own editing session**: what the writer has typed, which
questions they have failed to answer, which card the dock is holding.

| Field | Source at `ToDoPage:1962` | Callable outside? |
|---|---|---|
| `card` | `paneCard` ← `resolveDocked(dockable, dockKey, …)` — **`useState` `dockKey` + a `useRef`** | ❌ dock queue |
| `facts` | `paneFacts` `useMemo` over the card | ✅ derivable |
| `sentPreviously` | `queries` + `formatQueryMaterials` | ✅ shared |
| `events` | `dockTimeline(card)` (`:3290`) | ✅ derivable |
| `primaryLabel` | `rowPrimaryLabel(card, groupColumn(…))` — pure | ✅ |
| `noteAdded` · `statusWord` · `noteAddedDate` | pure / `queries` | ✅ |
| **`will`** | `paneWill` (`:1113`) — reads **`paneBody`** and **`bulkTouched`** | ❌ **form state** |
| **`body`** | `<TaskPaneBody value={paneBody} onChange={setPaneBody}/>` or `<BulkFillTable rows={bulkRows}/>` | ❌ **form state + JSX** |
| **`missing`** | `unanswered(kind, gateAnswers(card))` — `gateAnswers` (`:3403`) reads **`paneBody`**, **`bulkTouched`** | ❌ **form state** |
| **`showMissing`** | `useState` (`:454`) | ❌ page-local |
| **`bulk`** | `{ touched: bulkTouched }` — `useState` (`:451`) | ❌ **form state** |
| `onJump` | `jumpToSection` (`:3506`) — scrolls **the pane's own DOM** | ❌ page-local DOM |
| `onOpenQuery` · `onSnooze` · `onDismiss` | `paneVerbs` + `setSnoozeAnchor` / `setDismissOpen` — **`useState`** (`:441`, `:444`) | ❌ page-local UI |

And beside the journey, `TaskPane` also takes:
`onPrimary={() => dockPrimary(paneCard)}` — `dockPrimary` (`:3434`) reads `gateAnswers`, writes
`setShowMissing`, calls `jumpToSection`, then commits — and `nav={…dockable, dockKey…}`.

> **⚠️ THE SEAM IS NOT A FIELD. IT IS THE EDITING SESSION.**
> `paneBody`, `bulkRows`, `bulkTouched`, `showMissing`, `snoozeAnchor`, `dismissOpen`, `dockKey` are
> seven `useState` hooks in `ToDoPage`, and `will` / `body` / `missing` / `bulk` are recomputed from
> them **on every keystroke**. A `useJourneyInputs()` that returned an assembled object would have
> to own that state — at which point it is not "gathering inputs", it is **the pane's controller**.
>
> **`TaskPane` is not a component you can mount elsewhere. It is a VIEW over state its host owns.**
> That is the finding, and it is why the pack's Phase 1 cannot be done as written.

---

## 3. `TaskPane` / `TaskPaneBody` — what a host must provide

Props are small: `journey`, `onPrimary`, `nav?`. **What it assumes of its host is the real contract:**

- **A flex column with a height.** `.tpn` is `display:flex; flex-direction:column; flex:1;
  min-height:0` and `width:100%` — it fills its parent and owns an inner `overflow-y:auto`. The
  stylesheet states the rule: *"`min-height: 0` IS NOT OPTIONAL ANYWHERE ON THE CHAIN."* A window
  host must give it a bounded height or its scroller will not scroll.
- **No portal, no focus trap, no toast, no overlay primitive** — `createPortal`, `useOverlay` and
  `onToast` appear **zero** times in `TaskPane.tsx`. Every one of those is the host's job, and
  `ToDoPage` supplies them at page level. **An overlay host would have to add all four**, none of
  which exists in the component today.
- Width is the host's: `.tpn` takes `100%` of whatever column it is placed in.

---

## 4. The recorded scrim decision — quoted, and it holds

`FocusFlow.tsx:245`:

> *"⚠️ WHAT STAYS THIS FILE'S OWN IS THE BACKDROP MEANING, and it is the opposite of the settings
> sheet's: a stray click on the scrim NUDGES rather than closes, because this journey holds a
> STAGED model that a misplaced click must not discard. That difference is why the primitive takes
> `onScrimClick` instead of assuming one."*

Implemented as `onScrimClick: () => { if (!reduce) setNudged(true) }`. **Escape stays in the file
too, deliberately** — it routes through `requestExit`, which is async, may open a confirm, and reads
`staged.length`, *"so it is a handler with its own dependencies rather than the primitive's plain
callback."*

**The reasoning transfers to `TaskPane` unchanged and strengthens the finding above**: the pane holds
a staged model too (`paneBody` is unsaved until the primary commits), so any window host must be
escape-and-× only. Nothing here contradicts the pack; it is simply not reachable yet.

---

## 5. What `FocusFlow` does that `TaskPane` does not

`FocusFlow` has **twelve** sheets; `TaskPane` covers the **seven** `JourneyKind` values
(`send · chase · close · offer · note · fix · materials`).

**Structurally, every single-card journey the calendar can open has a `TaskPane` equivalent** —
`cardBucket` maps every task type into one of the seven, with `fix` as a stated default rather than
a fallback. But three `FocusFlow` sheets have **no `TaskPane` counterpart at all**, and none of them
is a card journey:

| `FocusFlow` sheet | What it is | Calendar-reachable? |
|---|---|---|
| `groupSheet` | a housekeeping **group** (`FocusItem.kind === "group"`) | **no** — the calendar only ever passes `{kind:"card"}` |
| `sweepSheet` / `reviewSheet` / `sundayReviewSheet` | the multi-card **weekly review** and its speed grammar | **no** — needs `mode: "weeklyReview"` and many items |

**Flag 3: no task type the calendar shows is reachable only through `FocusFlow`.** The gap is in
*modes*, not types — and the calendar uses neither. That is the one piece of good news in this
report: the swap the pack wants is not blocked by coverage.

---

## What I recommend Nick rule on

**Ruling 1 — the shape of the extraction.** The honest version of Phase 1 is not
`useJourneyInputs()` but **`useTaskPaneSession(card)`**: a hook that *owns* `paneBody`, `bulkRows`,
`bulkTouched` and `showMissing`, and returns `{ journey, onPrimary, nav }` ready to spread. Both
pages then call one thing and neither owns the session. That is a real extraction of ~200 lines
across `ToDoPage`'s pane block, `dockPrimary`, `gateAnswers` and `jumpToSection` — **a daylight job
with the To-do session's cooperation**, not an overnight one, and it changes the page that is
hardest to test in this repo (source-string tests cannot see a runtime crash).

**Ruling 2 — the nudge sheet.** It stays reachable from the weekly review whatever happens to the
calendar. The options are: (a) leave it and accept two nudge experiences; (b) give `FocusFlow`'s
nudge journey up entirely, so the weekly review shows the pane too — which is Ruling 1 applied to
`ToDoPage` as well; or (c) fix only the copy in place, which removes the two law breaches tonight
and leaves the architecture for later. **(c) is small, safe and independent** — it needs one word
from you and no extraction at all.

**Ruling 3 — the calendar in the meantime.** It currently opens `FocusFlow` in a 430px window,
escape-and-× only, with real toast and navigation. **That is not a lookalike and not bespoke** — it
is the same component `/todo` opens for the same card. It is not the *pane*, which is what the pack
wants, but it is one workflow rather than two.
