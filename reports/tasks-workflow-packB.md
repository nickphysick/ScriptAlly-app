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

---

## ⛔ PHASE 1 — ALSO STOPPED, and this one is a genuine ruling

> *"No test should need retargeting; if one does, stop and report."*

**One does, and no `idPrefix` design can avoid it.** The work was built, measured, and then **reverted
so the tree is byte-identical to `HEAD`** — confirmed by `git diff HEAD`.

### What was built, and what it cost

`TaskPaneBody` took `idPrefix?: string` defaulting to `""`; the four sections rendered
`id={domId("s-unit")}` where `domId` is the identity function by default; `paneGate` kept emitting
**bare** names so `sect()`'s comparison, `anchorFor` and `paneGate`'s own semantics were untouched;
`jumpToSection` applied the same prefix. **`/todo`'s rendered ids were byte-identical.**

Then `paneGate.test.ts:154` went red:

```ts
const ids = new Set([...src.matchAll(/id="(s-[a-z]+)"/g)].map((m) => m[1]));
…
expect(ids.has(r.id), `${k} requires "${r.name}" at #${r.id} and no section carries it`).toBe(true);
```

> **⚠️ THE LOCK SCRAPES THE LITERAL SPELLING `id="s-unit"` OUT OF THE SOURCE.** Its LAW — *"every
> declared anchor must be an anchor the pane renders; a requirement the square cannot sit on would
> gate the primary and point at nothing"* — is **still true and still met**. What changed is the
> spelling: an attribute that is now an expression rather than a literal. **No prefix mechanism can
> keep a literal `id="s-unit"` in the source**, so this is not a design that can be adjusted around
> — it is the lock and the feature being mutually exclusive as written.

### The ruling this needs

The lock is a **source-string scrape**, and this repo's own standing law says a source lock *"proves
the code was written, not that it ran"*. The honest retarget is one line — scrape both spellings:

```ts
const ids = new Set([...src.matchAll(/id=(?:"(s-[a-z]+)"|\{domId\("(s-[a-z]+)"\))/g)]
  .map((m) => m[1] ?? m[2]));
```

…**and the stronger replacement is to stop scraping and assert the rendered ids on a page**, which
is what this pack's own acceptance asks for everywhere else and what would have caught a real
divergence that the scrape cannot see.

**It was not done**, because the pack made "no test retargeted" the acceptance and the disciplined
answer to failing a stated bar is to report it, not to reinterpret it — especially when Phase 3, the
only consumer of this work, is already stopped, so shipping it has no user-visible effect tonight.

---

## FLAGS FOR NICK

**1. Deployed — no.** Nothing shipped: Phase 1 reverted after its acceptance failed, Phases 2–3
stopped. The tree is byte-identical to `HEAD` in my territory, `tsc` 0.

**2. Did the hook build its journey from `(card, data)` alone? —** it could not; it needs
**`boardCols`**, via `figureFor`'s `snoozedKeys` parameter, which reaches back to `pendingSaveId`,
page state. Full chain in Phase 0 above.

**3. How `bulkRows` travels —** as an argument: `commit(card, values, bulkRows)`. The hook owns the
rows; the host's commit family owns the writes, the toast and the navigation. Neither can hold both.

**4. The host callbacks — seven, not six.** The seventh is **`openQuery(card)`**: it navigates, so
it cannot be the hook's. Offsetting that, the *disabled* flags for snooze and dismiss need no
callback at all — `cardMenu` is a pure lib the hook can call itself.

**5. TDZ audit —** not reached, since no state moved. Pack A's audit stands and its `isoOf`
shadowing is fixed. **Nothing new shadowing was found**, and one near-miss of my own was caught: a
blanket string replace hit my own *comment prose* before the render sites, so the JSX anchors are
matched on the full element, not the bare id.

**6. Did the calendar keep a `FocusFlow` mount? —** not reached. It would have had to regardless,
for the `offer`/`fix` fall-through.

**7. Unverifiable —** everything, tonight: nothing was built, so nothing was measured. The standing
gap is unchanged — pointer interaction inside the pane is unverifiable in this harness, so
completion writes and Undo would stay unproven even once it ships.

**8. Cross-session —** the territory was clean at Step 0 and for most of the run. **Another session
began editing `src/components/todo/ArtSlot.tsx`, `artSlots.test.tsx` and `src/lib/packageAttach.ts`
at 15:11**, inside the red-gate directory. Its effect was visible immediately: three *different*
suites failed on three consecutive whole-tree runs — `queriesPageSmoke`, `marketingLinks`,
`queryMaterialKind` — a set that cannot be caused by a clean tree and is the signature of files
changing mid-run. My own suites (`paneGate`, `paneCommit`, `todoPageSmoke`) are green, and
`git diff HEAD` on my two files is empty.

---

## What the next pack should be

**One small pack, then Pack B unchanged.**

**Pack A2 — finish the lift.** Give `figureFor` the ability to answer *"is this card asleep?"* from
`(card, data)` and drop `snoozedKeys`. The material is `snoozedCards`' own predicate —
`flagSleeps(f, nowMs) && !flagDismissed(f)` over `taskFlags`, which is in the bundle and does **not**
read `pendingSaveId`. **The obligation is to prove the re-derivation equals `boardCols.snoozed` for
every dockable card**, on a rendered page, because a divergence changes the pane's figure silently.

**And rule on the `paneGate` scrape**, which blocks Phase 1 independently of all of this.

---

# Pack B, resumed (23 Aug, later) — Phase 1 shipped; Phase 2 stopped by the mid-run gate

> **Not deployed.** Phase 1 is committed and verified, but the deploy rule's condition 4 fails:
> another session holds uncommitted `TodoNoteboardPage.tsx`, `noteboard.ts` and an untracked
> `noteboardDrawer.test.tsx`. Their in-flight state is also the tree's only `tsc` red (4 errors,
> all in their two test files). My files are committed and `git diff HEAD` on them is empty.

## ✅ Phase 1 — `idPrefix`, and the anchor law moved to a rendered page

Committed `15f69962`. Baseline at HEAD `7ae9fe3a` was **clean** — 379 files / 6482 tests — and it
is **identical after**, with the only changed test the one Nick permitted.

`TaskPaneBody` takes `idPrefix`, defaulting to `""`. It prefixes **the rendered attribute only** —
`paneGate`'s `REQ` and `nextId` keep bare names, so `sect()`'s comparison and `anchorFor` are
untouched: one vocabulary for what a section *is*, a per-mount name for where it lives in the
document. `jumpToSection` applies the same prefix; `PANE_ID_PREFIX` states this page's choice at the
call site.

**`paneGate.test.ts` retargeted, and the law is unchanged.** The old form scraped
`id="(s-[a-z]+)"`; with the attribute now an expression, that form and the feature were *mutually
exclusive*. It scrapes the section's own name instead — `sect("s-unit")`, still a literal — so it
still answers "does a section exist for every declared requirement", and cannot be defeated by the
id's spelling changing again.

> **⚠️ THE RETARGET IMMEDIATELY CAUGHT A GAP I HAD NOT ALLOWED FOR.** `s-rows` is declared by
> `BulkFillTable` as a plain `<table id="s-rows">`, not through `sect()`, because that component has
> one anchor and no prefix. The first version went red and was right to; matching both spellings is
> what keeps the law whole.

**And the stronger form now runs on a rendered page**, as ruled: `tests/e2e/packB.measure.ts` mounts
the pane and asserts every declared anchor **resolves to an element that exists**, scoped to the
*visible* pane. All five covered — a Send card renders `s-unit`/`s-when`/`s-expect`/`s-remind`, the
cohort renders `s-rows` — plus `/todo`'s ids proven **bare on the page**, which makes
"byte-identical" a measurement rather than a claim. Console clean.

> **⚠️ TWO VACUOUS-CHECK FAULTS OF MY OWN, both caught by their own population guards.** The first
> version *walked* the dock and found **zero anchors across twelve cards** — because the pane opens
> on whatever is docked, which on this account is a NOTE, and a note declares nothing. Cards are
> chosen by kind now. The second asserted "every id is bare" over an empty list for the same reason;
> it docks a Send first. And the cohort is asserted only when its **band proves it actually docked**
> — its row sits far down a scrolling list, and a click that misses leaves the previous card in the
> pane, which would then have been asserted about under the cohort's name.

## ⛔ Phase 2 — stopped by the mid-run gate, with the map complete

**A2 genuinely unblocked it.** `dockTimeline` needs only `now`, `queries`, `agents`; `figureFor` is
now `(card, data, flags, now)`; `listRowInputs` and `recordSweepFor` are lib calls. **The hook can
build its journey from `(card, data)` alone** — nothing needs `boardCols`, `facts`, `events` or
`primaryLabel` passed in.

**Then the gate fired.** Another session began editing `TodoNoteboardPage.tsx` and `noteboard.ts`
inside the red-gate directory at 18:52. The rule is *stop and report — do not attribute the
failures, do not work around them.*

**And I had independently decided to stop the approach I was taking**, which is worth recording:

> **⚠️ I WAS ASSEMBLING A ~500-LINE MOVE BY SCRIPTED TEXT SUBSTITUTION, AND HIT THE SAME FAILURE
> CLASS THREE TIMES** — "substring not found", a replacement matching my own comment prose, and a
> replacement matching the first of two identical blocks. Individually cheap; three times is a
> signal about the method. A verbatim move of that size wants a focused pass, not a regex pipeline
> at the tail of a long session, on the page this app is used through most. **The scaffold was
> removed rather than left as debris** — `git status` on `src/` shows nothing of mine.

### The map, so the next pass is short

| region | lines | destination |
|---|---|---|
| `seedRows` · `statedWeeks` · `BLANK` · `paneBody` + seeds ref + reset effect | 911–974 | hook |
| `paneFacts` | 980–1007 | hook |
| `paneVerbs` | 1008–1038 | **dissolves** — the hook computes the *disabled* flags from `cardMenu` (pure); the actions become host callbacks |
| `paneWill` · `noteAddedDate` · `noteAgo` | 1039–1171 | hook |
| the `buildJourney` argument + body JSX | 1887–1960 | hook |
| `dockTimeline` | 3208–3320 | hook |
| `gateAnswers` | 3321–3351 | hook |
| `dockPrimary` | 3352–3435 | hook (gate half); commit half calls the host |

**`listRowInputs` stays on the page** (it is `TaskList`'s `rowInputs` and the view's sort key) — the
hook calls the *lib* copy, which is what Pack A made possible.

**The substitutions a verbatim move needs**, all mechanical: `paneCard`→`card`;
`figureFor`/`listRowInputs`/`recordSweepFor`→ the lib calls bound to this render's data;
`jumpToSection`/`openFlowCards([card])`/`commitFromPane`/`setDockKey`/`setSnoozeAnchor`/
`setDismissOpen`/`onNavigate`→ the seven host callbacks.

**The seven callbacks** (Phase 0's finding, unchanged): `jumpToSection`, `openFlow`, `commit`,
`advance`, `onSnooze`, `onDismiss`, `openQuery`.

---

## FLAGS

**1. Deployed —** no. Condition 4: the noteboard session's uncommitted source, which is also the
tree's only `tsc` red. Phase 1 is committed, verified and ready to go out with the next clean tree.

**2. Did the hook build from `(card, data)` alone? —** it can; A2 removed the last dependency. Not
built, for the two reasons above.

**3. `bulkRows` —** unchanged: it travels as an argument to `commit(card, values, bulkRows)`.

**4. The seven callbacks —** as listed. `cardMenu` is pure, so the *disabled* flags need none.

**5. TDZ / shadowing —** Phase 1 introduced no hoisted-function-reads-later-const shape;
`PANE_ID_PREFIX` is a module constant, above every use. Nothing shadowing found.

**6. The mid-run gate — IT FIRED**, at the Phase 2 boundary. That is the first time it has, and it
did exactly what A2's pack added it for.

**7. Cross-session —** busy again. HEAD moved from my last commit to `7ae9fe3a` across several
sessions' work before I began; my history is intact and an ancestor. The noteboard session entered
the territory mid-run.

---

## For the Phase 2 session — two constraints, ruled by Nick

**1. No scripted substitution for the move itself.** The bodies move by hand. This session tried a
regex pipeline over ~500 lines and hit the same failure class three times — substring not found, a
replacement matching its own comment prose, one matching the first of two identical blocks. The map
above is what makes a hand-move short; the pipeline is what makes it wrong.

**2. Re-check the mid-run gate before every gate**, not only at Step 0. The noteboard session is
demonstrably active in `src/components/todo/` — it has entered the directory during three separate
runs now — and the gate fired at this pack's Phase 2 boundary, which is what it was added for.

**And one standing observation, since it has now cost three deploys.** Condition 4 has blocked the
deploy three times in a row, each time on a *different* session's uncommitted source that ships:
`WorkspacePageGrid.tsx`, then `TodoNoteboardPage.tsx` + `noteboard.ts`, and now the noteboard set
again. The work being blocked has been green and verified every time. This is not a fault in any one
session — it is what happens when several sessions share a checkout and the deploy rule is honest.
Worth knowing that the rule is doing its job rather than mis-firing.

## And a finding that wants its own pack

**A user task, once created with a date, cannot be removed through the UI.** Evidenced, not
inferred: `deleteUserNote` exists (`ToDoPage:2607`), `cardMenu` declares
`leaf("delete-task", "Remove note…")` (`todoMenu:243`), and the **only** component that renders that
menu is `TodoBoard` — mounted nowhere. The Noteboard's own `removeNote` exists in source but its
trigger is not reachable for these items on the deployed build either.

The five leftover harness notes are now cleared, so the symptom is gone — but the gap is not, and it
is the reason the debris accumulated in the first place. A writer who creates a note has no way to
delete it.
