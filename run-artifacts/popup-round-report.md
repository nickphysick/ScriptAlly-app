# The popup round — the primary commits, nothing pops up

`b738cbb4` · `34bf1519` · Phase 3 (this commit). Measured against a local `vite preview` of a dev
build of this branch, at 1440×900, signed in as the harness account.

**Result: every pane primary now writes in place. Zero dialogs, measured on the page, for close,
chase, send and the cohort — and for the two journeys that still hand off, the hand-off is
declared rather than left over.** `17 / 22` in `run-artifacts/popup-round.txt`; the five that are
not green are one pre-existing bug and one journey with no subject in this account, both below.

---

## False premises, mine and the brief's

**1. The brief: "'Stop asking about this one' is the mute (`mutedTaskRules` / set-aside)".** It is
not. That is `mute-rule`, an account-wide rule mute. The dialog's affordance is `mute-item` —
`upsertTaskFlag(flagKeyForTask(…), { snoozedUntil: MUTED_UNTIL })`, one card. The pane's Dismiss
writes `skippedAt` **against the same flag key**, so both suppress this one card and delete nothing.
No writer need was stranded and nothing had to be kept alive for it.

**2. The brief: "delete any takeover whose only caller was the pane."** There is no such takeover.
`FocusFlow` has three other callers and the "Stale query" dialog is not a component at all — it is
`staleSheet`, one branch inside it. Phase 2 therefore deleted the page's own orphans instead.

**3. Mine, during recon: "the note journey is a live bug — clicking a Note row does not dock it."**
It is deliberate: `dockQueue` filters `c.nature !== "note"`. A dateless NOTE is not dockable; a
dated TASK is, and commits. I had a probe half-written before checking.

**4. Mine, in the measurement: three separate faults, all of which read as app faults.** A `.sa-toast`
probe against a page whose toast is `.tdb-toast` reported "no receipt at all" about journeys that
had written and said so on screen. A row-by-index target opened the single fill-in twice and never
opened the cohort. And journeys run in sequence mutated the board the next one aimed at — a Note
case pressed a send card's primary. **Every one produced a plausible failure about the wrong
subject.** Isolating each journey behind a reload fixed all three.

**5. Mine, in a throwaway script: a bounded-slice reachability sweep that reported 91 of 104
functions dead.** Its `code.find("\n  }")` ran past the function it was scoping — the exact fault
CLAUDE.md documents, written while looking for that class of fault. Exact reference counting gave
the real figure: **36**.

**6. Mine, in the measurement file: a backtick inside an `evaluate` template**, in a comment, in a
file whose own header warns about it. Caught by the parse, not by the run.

---

## Phase 0 — recon

Full map in `run-artifacts/popup-recon.md`. The finding that shaped the round:

**The direct-write layer already existed, was correct, and had no caller.** `commitFromPane` —
"the one entrance … each of which is the EXISTING one" — dispatches to seven committers, and its
only reference in the repo was its own definition. It went dead when `PaneJourney.tsx` was deleted
in the pane round: the component was the caller, the committers lived in the page, and only the
component was removed. `dockPrimary` handed off to the takeover instead, and the prefill existed
solely to carry the pane's answers across that boundary.

So Phase 1 was **wiring, not authoring**. No new writer was added anywhere in this round.

| journey | commits via | underlying write |
|---|---|---|
| send | `commitSendFromPane` | `recordMaterialsSent(markSentWriteArgs(…))` |
| chase | `commitChaseFromPane` | `logNudge(...nudgeWriteArgs(…))` |
| close | `commitCloseFromPane` | `updateQueryStatus(…, CLOSE_REASONS[…].status)` |
| fill-in | `commitMaterialsFromPane` | `updateQuery({ materialsWanted })` |
| cohort | `commitRecordSweep` | the same `updateQuery`, per row |
| note | `quickDone` | `updateUserTask({ done, completedAt })` |

**Post-commit duties the pane took over:** the write, a `doneToast` receipt carrying Undo (and
`rememberUndo`, which the row's own undo reads), task resolution — nothing explicit for query
journeys, since the board is derived — and the advance.

---

## Phase 1 — `todo: primaries commit directly` · `b738cbb4`

`paneCommitValues` translates the pane's form shape into the committers'. `dockPrimary` gates, then
calls the entrance. Nothing mounts.

- **`paneCommits` declares which journeys commit in place** — exhaustive, closed with `never`. Two
  do not: an **offer** needs a branch and a decision; an **agent-record gap** needs three fields.
  This form draws neither, so committing them would run a writer with nothing to write behind a
  button saying it had recorded something. They hand off **by declaration**.
- **Every committer returns whether it wrote.** The pane advances on a commit that landed and stays
  put on one that did not.
- **The next card is read before the write** — the board is derived, so afterwards its index is gone.
- **The send's expectation and reminder reach the payload.** `markSentWriteArgs` had accepted both
  for a round and no committer passed them: the moment the primary wrote in place, the form's two
  required answers would have been demanded and dropped.
- **`writeQueryMaterials`** is the parcel's write without the receipt, so a send records materials
  and status in one press and announces itself once.
- **`ToDoPage`'s `flowPrefill` state type was narrower than what it held** — the extra keys arrived
  by spread, which excess-property checking does not reach. It went with the prefill.

Red-before at the seam, one failure each: takeover reinstated ahead of the guard · the expectation
dropped from the payload · the offer routed to a committer that cannot write · advance stopped
consulting whether anything happened.

## Phase 2 — `todo: retire what only the pane used` · `34bf1519`

**Survives, untouched:** `FocusFlow` — the Calendar's item sheet (`TodoCalendarPage.tsx:618`), the
Sunday review's engine, the sweep's. A lock now names the Calendar's mount so a future dead-code
sweep does not read it as unreachable.

**Deleted:** `commitSweep`, `dismissRecordSweep`, `leaveMaterialsUnrecorded` — page-side orphans
with no caller. Their lock is restated as a **retirement over the whole page** rather than repointed
at a survivor.

**Logged, not fixed** (other surfaces' components): `.tdb-ffq em { font-style: italic; color:
var(--burg) }` puts burgundy emphasis in the takeover's heading, against the heading law. **A second
site does the same and the brief did not name it — `.tdb-newdesk h2 em`.**

**Standing, for the queue:** the fixed-point sweep found **36 zero-reference functions** in
`ToDoPage.tsx`. One was this round's cascade (`commitSendMaterials`, deleted with its caller);
three more were the pane's orphans, deleted above. **The remaining 32 pre-date this round** and are
listed in `run-artifacts/popup-recon.md`'s sweep — a scoped sweep, not an ad-hoc partial one.

## Phase 3 — the sweep (this commit)

Two real bugs, both found by measuring rather than reading, both fixed and locked:

**The chase committed nothing, silently.** A chase requires no day, so `sentDate` reached
`commitChaseFromPane` empty and its check-back arithmetic — `new Date("" + "T12:00:00")` — produced
an Invalid Date whose `.toISOString()` throws. The throw landed in an un-awaited callback: no write,
no toast, card unmoved. Indistinguishable from a dead button. The chase now takes today when no day
is named — the value `quickNudgePayload` already stamps for the same act — and **no other journey
gains a fallback**, asserted as a set.

**The single fill-in's primary could never be pressed.** `requiredFor("fix")` demands a parcel while
the form drew the parcel section from `sendSpecFor`, which answers a different question — "what
should go NOW" — and is null for a journey recording what already went. Measured: primary reading
"Log as sent · 1 to answer" with no unit section on the page and `#s-unit` absent from the document,
so the gate's own jump target did not exist. **The gate was correct throughout; the form was short a
section.** Both sections are now drawn from the declaration the gate refuses on, and the expectation
pair got its own flag — hanging it off the parcel would have asked a fill-in when a reply is
expected.

---

## What was measured, and what it says

Screenshots: `reports/popup-round/`. Raw: `run-artifacts/popup-round.txt`.

| case | dialogs | wrote reversibly | left the list | pane advanced |
|---|---|---|---|---|
| close | none | `Done — "No response from Rosalind Vale…"` + Undo | yes | yes |
| chase | none | `Done — "Nudge Marcus Reed"` + Undo | yes | yes |
| send | none | `Done — "Send your partial to Elinor Hale"` + Undo | yes | yes |
| cohort | none | — see below | — | — |
| offer (P7) | **takeover, correctly** | n/a | n/a | n/a |
| fix, no agent (P5) | **takeover, correctly** | n/a | n/a | n/a |

`P0.1` no dialog at rest · `P8` **console clean across all seven presses**.

### Not green, and why

**P4 note — NOT RUN.** No dockable note in this account: `dockQueue` excludes dateless notes by
design, and no dated task was present. The note arm is `quickDone`, the app's own primitive; an
earlier run in which the pane advanced onto one recorded `Done — "Nudge Sam Okoro"` + Undo. Stated
as NOT RUN rather than folded in.

**P6 cohort — a live bug, and NOT this round's.** The bulk table's ticks are **inert**: a real
Playwright pointer click on `button.tick` leaves `aria-pressed="false"` and the class unchanged,
sampled at 80 / 250 / 600 / 1200 / 2500 ms, so it never flips and is not being wiped by a re-seed
either. The primary therefore reads "Log 0 queries" forever and the cohort journey cannot be
answered at all. Evidence: `run-artifacts/popup-bulk.txt`, probe kept at
`tests/e2e/popupBulk.measure.ts`.

Attribution checked against the diff, not asserted: `git log b738cbb4~1..HEAD --name-only` contains
**no** `BulkFillTable` or `materialsSweep`; the table and its wiring last changed in `c147de53`
(the finishing round's lift) and `c3a66bda`. **Tonight's changes reach it only in that the primary
now tries to commit where it used to hand off — and the hand-off could not have answered it either,
since the answers live in the pane's table.** Not fixed here: the fault is in the table's controlled
state, a mechanism this round did not touch, and it wants its own scoped look rather than a guess at
half past four.

---

## Notes for whoever is next

- **The pane's send has no duplicate-send guard.** `quickDone` and `sweepDone` both call
  `confirmAsk(duplicateSendPrompt(…))`; `commitSendFromPane` does not, and did not before this round
  either — the journey it replaced staged instead. Not a regression; a standing gap.
- **A send touches two records** — `materialsWanted` on the query, the send in the activity — so it
  is two writes and one receipt. `recordMaterialsSent` has no materials argument, and giving it one
  would change the write path the quick rail and FocusFlow share.
- **Measurement environment.** `../ScriptAlly-popup-gate`, `vite preview` on **4197** — 4190 was
  already serving another session's build, which would have measured their bundle. Both gates ran
  in that worktree because another session holds uncommitted `src/components/shell/` WIP that breaks
  the shared typecheck. `.env.local` and `tests/e2e/.auth/` were copied in and go with the worktree.
- **The harness account's board now carries this round's writes** — several queries closed, nudged
  and marked sent. Fixture state, not app state.
