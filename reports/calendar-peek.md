# Calendar — peek, workflow overlay, view modes, kind filters

**Session:** `calendar` · 21–22 Aug 2026, overnight, unattended.
Prior: `calendar-record-layer.md`, `calendar-fixes.md`, `calendar-dedupe.md`, `calendar-pills.md`.

> # ⛔ NOT DEPLOYED — and no phase was built. **The hard prerequisite is not met.**
>
> **The `tasks-chassis` pack has not run.** This pack's own Step 0 red-gates on it, and it is
> right to: Phases 1 and 3 change cell and view geometry, and both would have been built on a
> chassis this pack was told is about to move.
>
> | Check | Result |
> |---|---|
> | chassis report exists in `reports/` | **NO** — 160+ report files, none is a chassis or foot-margin report |
> | commits with a `chassis:` session prefix | **NONE** *(a loose grep for the word "chassis" matches prose in other packs' messages — "the chassis of the pane contract" — not the pack)* |
> | a foot-margin assertion anywhere in `tests/e2e/` or `src/` | **NONE** |
> | `workspacePageGrid.css` touched by a chassis fix | **NO** — its last three commits are the "pinned chrome" pack |
>
> **Phases 1–5 were not started.** Step 0's recon is complete and below — it is read-only, it is
> what unblocks the decision, and every question the pack asked is answered including the two that
> change what the later phases would be.
>
> **Nothing else was blocking.** `tsc` **0**, tree clean, and — for once — **no other session's
> uncommitted source was in the tree**, so the deploy rule's condition 4 would have passed tonight.

---

## Step 0 — gates

- **Chassis prerequisite: FAILED** (above). Red gate.
- **Red gate 2 — another session mid-edit in `src/components/todo/`:** clean. Would have passed.
- `main`; baseline **`tsc` 0 errors**; **0 dirty source files** at Step 0.

---

## PHASE 0B — the fold cushion, measured

**Positive, but thinner than it was, and still eroding.** Not negative — so the grid is not
overflowing before this pack adds anything, which was the question asked.

| | value |
|---|---|
| cell `clientHeight` | 96px |
| − cell padding | 12px |
| − `.cal-d` (numeral row) | 20.75px |
| **= available for pips + counter** | **63.25px** |
| worst populated case: 2 pills (25) + counter (11) | 61px |
| **CELL cushion** | **+2.25px** |
| the fold's own view: `rowPx 96.5 − CHROME 35` | room 61.5px |
| **FORMULA cushion** | **+0.50px** |

**Every populated cell measured `scrollHeight === clientHeight` at 1440.** Nothing overflows today.

> **⚠️ THE GRID IS STILL LOSING HEIGHT, AND IT IS NOT THE CALENDAR DOING IT.** `.cal-grid`
> clientHeight this week: **638 → 606 → 601**. The last pack recorded the 638 → 606 drop and
> attributed it to the masthead work; it has since lost 5 more. At the formula level the fold is
> now **half a pixel** from over-promising — two more pixels of chassis erosion and a populated
> cell overflows on its own, with no calendar change involved.
>
> This is exactly why the pack assigns the durable fix — the fold measuring what it needs rather
> than assuming a pill height — to `tasks-chassis`, and it is a second, independent reason that
> pack should run first.

---

## Step 0 — RECON

### 1. The To-do page's right-hand workflow pane — **it is NOT what the calendar opens**

They are different components. This is **not** presentation-only, and Phase 2 would therefore be
the pack's flagged fallback rather than the reuse case.

| | Component | Where |
|---|---|---|
| **To-do right-hand pane** | **`TaskPane`** + `TaskPaneBody`, fed by `buildJourney(...)` | `ToDoPage.tsx:95-97`, mounted `:1961` / `:2000` |
| **Calendar's pop-up** | **`FocusFlow`** | `TodoCalendarPage.tsx:618` |

`ToDoPage` mounts `FocusFlow` **as well** (`:2162`) — but as a separate takeover, not as the
right-hand pane. So "the To-do page's right-hand side" and "what the calendar opens today" have
never been the same thing.

> **⚠️ AND THE CALENDAR'S MOUNT IS WIRED TO NO-OPS — a real defect, found while reading:**
>
> ```tsx
> <FocusFlow
>   items={[{ kind: "card", card: flowCard }]}
>   onClose={() => setFlowCard(null)}
>   onNavigate={() => {}}      // ← no-op
>   onToast={() => {}}         // ← no-op
> />
> ```
>
> `ToDoPage` passes `onToast={flash}` (its `useTodoToast`). **The calendar passes nothing**, so a
> completion made from the calendar is silent: no confirmation, and — because this app offers Undo
> *on the toast* — **no undo**. The write itself is correct and shared; only the feedback is
> missing. That is flag 7 answered before Phase 2 was reached, and it is worth fixing whichever way
> the overlay question is ruled.

### 2. Mountability of `TaskPane`

```ts
export interface TaskPaneProps {
  journey: TaskPaneJourney;
  onPrimary: () => void;
  nav?: { index: number; total: number; label: string; onPrev: () => void; onNext: () => void };
}
```

It takes a **built journey, not a card** — so an overlay must call `buildJourney(input)` first, and
`JourneyInputs` is gathered by `ToDoPage` at `:936` ("THE PORTED PANE'S INPUTS, GATHERED ONCE").
The pane itself is presentational and portable; **the gathering is the To-do page's**, which is
precisely the "wrapper composition the To-do page owns" case the pack says not to extract
overnight.

### 3. What "Everything" is — **the facet control, NOT manuscript scope**

The loud flag the pack anticipated **does not apply**: nothing would be silently lost.

`const [facet, setFacet] = useState<TodoFacetId>("all")` (`:247`), `"all"` being "Everything".
Consumers:

| Consumer | Line | What it does |
|---|---|---|
| `applyFacet(cards, facet)` | `:358` | narrows the live cards |
| `facet === "all" ? userTasks : []` | `:371` | user tasks show under Everything only |
| `facet === "all" ? activities : []` | `:372` | done items likewise |
| `facetCounts(liveBoardCards(...))` | `:381` | the control's own counts |

**There is no manuscript scoping anywhere in `TodoCalendarPage`** — grepped for `scope`,
`manuscriptId ===` and `resolveScopedManuscript`: nothing. Manuscript scope lives in the *shell's*
sidebar chip, which this pack does not touch. So the kind filter can replace the facet control
outright, and no ruling from you is needed on where scoping goes.

### 4. The record toggle's wiring — subsumable without re-deriving anything

`const [showRecord, setShowRecord] = useState(true)` (`:260`). One reader:

```ts
const recordFor = (ymd) => (showRecord ? recByDay.get(ymd) ?? [] : []);   // :402
```

Everything else flows from that single function — the grid's record pills, the panel's record
section, **and the dedupe**, which takes the day's record as an argument rather than reading a flag
(`dedupeAgainstRecord(items, recordFor(ymd))`). So a view mode that hides the record simply makes
`recordFor` return `[]`, and the done-cards-return behaviour follows with no second rule. Plus the
legend at `:575`. **Phase 3 can subsume it by changing one function.**

### 5. Grid start-date assumptions — a small, contained inventory

| Site | Line | Assumption |
|---|---|---|
| `const visible = monthGridDays(anchor)` | page `:318` | **the only producer of the day range** |
| `monthLabel(anchor)` | page `:395`, `:485` | subtitle and the grid's `aria-label` |
| `sameMonth(ymd, anchor)` | page `:498` | the `off` flag — adjacent-month dimming |
| `monthGridDays` as a test fixture | test `:55`, `:438`, `:621` | |
| page lock pinning the call | test `:740` | `expect(pageSrc).toContain("const visible = monthGridDays(anchor);")` |
| 42-cell assertion | test `:750` | |

An `Upcoming only` mode needs a second range producer, a re-reading of `off`, the label, and that
one page lock retargeted. **Nothing structural resists it.**

### 4B. Where each carried type's origin date lives — **all types have one**

From `cardActionYmd`:

| Carried type | Origin field |
|---|---|
| writer's own task | `c.dueYmd` — from `UserTask.dueDate` |
| query card (send partial / full / resubmission, nudge due, decide on offer) | `q.lastStatusChange ?? q.dateSent` |
| housekeeping | `null` — never reaches the calendar at all |

**No type lacks a recoverable origin**, so no type would render live-only. And it is already
carried: `rolledFrom: action` is set on the item in the roll-forward branch
(`todoCalendar.ts:183`, added last pack), so Phase 4B's ghosts need **no new state** — which was
the load-bearing condition.

---

## FLAGS FOR NICK

**1. Deploy outcome —** not deployed, and nothing built: the chassis prerequisite failed. Full
detail at the top. Notably the *other* conditions were all clear tonight, including a clean tree.

**2. What the To-do right-hand pane is —** `TaskPane` + `TaskPaneBody` + `buildJourney`, **not**
the `FocusFlow` the calendar opens. Phase 2 would be the flagged fallback, not true reuse. And the
calendar's existing `FocusFlow` mount passes **no-op `onToast` and `onNavigate`**, so completions
from the calendar are silent and cannot be undone — independent of this pack, worth fixing anyway.

**3. What "Everything" was —** the facet control (`TODO_FACETS`), not manuscript scope. Nothing is
lost by replacing it; no ruling needed. Manuscript scope is the shell's, untouched.

**4. Upcoming-mode geometry —** not chosen, since the phase was not built. The recon says the
month machinery would support either with one new range producer; I would have proposed
**month-bounded with dimmed lead-in days**, because `sameMonth`/`off` already exists to dim them
and a rolling five weeks would need a second labelling rule for a title that spans two months.
Yours to rule on when the pack re-runs.

**5. The facet supersession —** nothing surprising, and the supersession is *cleaner* than the pack
assumed: the calendar's facet state is entirely local (`useState` in the page), reads `TODO_FACETS`
only to render labels, and shares no state with the board. Removing it touches nothing shared.

**6. Carried origins —** every type has one, and it is already on the item as `rolledFrom`. Ghosts
would need no new state.

**7. Toast parity —** answered early and badly: there is no parity today, because the calendar
passes `onToast={() => {}}`. See flag 2.

**8. Cross-session —** the tree was **clean** all through Step 0 (0 dirty source files), which is
the first time in three runs. No races, no production build over `dist/`, nothing moved under me.
The one cross-session fact that matters is the chassis pack's absence, and the continuing erosion
of the grid's height (638 → 606 → 601) from work outside this session.

---

## What I recommend

Run `tasks-chassis` first, as this pack instructs — it now has **two** independent reasons to go
first: the 21px foot margin it owns, and a fold cushion down to half a pixel at the formula level
that only its durable fix addresses. Then re-run this pack, with two of its phases already
re-scoped by the recon above:

- **Phase 2** is the fallback path, not reuse — or a decision to move the journey-gathering into
  something both pages can call, which is daylight work.
- **Phase 4's** "flag loudly if it is manuscript scope" is resolved: it is not, so that phase is
  simpler than written.
