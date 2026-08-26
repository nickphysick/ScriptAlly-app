# To-do pane — the journey logic

**Stopped at the end of Phase 5, on a phase boundary.** Phases 1–5 are on `main`, plus the
response-rate correction. Phases 6–8 are not started.

**Why there:** Phase 5 finished a journey; Phase 6 starts three more. Phase 4 and 5 also needed
measuring — the last measured state was Phase 3, and two phases of write-path change should not sit
unverified while a third journey is opened.

| phase | SHA | |
|---|---|---|
| contracts | `866b12e7` | three journey files, installed from `~/Downloads` at their stated hashes |
| **1 · journeys are data** | `7632ca1d` | one declaration; two unions reconciled; per-flow lists; compile guard proved three ways |
| **2 · the fork is the first question** | `51a5a08a` | fork, receipt, crossover, cleared answers, no primary until an intent |
| **3 · delay is snooze** | `1a623f16` | the existing primitive from the fork; Snooze leaves the bar; the mute finds its home |
| — | `4c7a444b` | a crossover swaps the sentence too *(measured)* |
| — | `55c9b12b` | the flow says which optional fields it offers *(screenshot)* |
| — | `9eff807a` | the Phase 0 recon, the measurement suite and the first report |
| — | `106a1c53` | **the response rate counts replies, not endings** *(your correction)* |
| **4 · the send journey** | `e415c065` | the seeded number stops answering; the close's reason is the journey's |
| **5 · the nudge journey** | ⚠️ **`bfd533fd`** | **swept into another session's commit — see Concurrency** |
| — | `99841015` | the measure waits for the board, and asserts it arrived |
| — | `7edd4b8b` | **the strip's dependencies are declared above the strip** *(the crash)* |
| — | `46e3e71d` | CLAUDE.md — the TDZ's third shape |
| — | `05f87103` | **the commit carries the rows it wrote** *(typed 7, recorded 3)* |
| 6–8 | — | **not started** |

---

## Findings — read these first

Phases 1–3's findings stand unchanged in the previous edition (two disagreeing journey unions with
`fix` naming two journeys; the nudge writing a check-in nobody chose; the crossover that changed the
band and not the deed; the single-option fork; the calendar's drag-snooze; the wrong-toast probe).
What follows is new, and the first item is the most serious thing this round found.

### ⚠️ The pane was crashing on every docked card, and every gate was green over it

The most serious thing this round found, and only the measurement could have found it.

```
ReferenceError: Cannot access 'Rr' before initialization
  at useTaskPaneSession → ToDoPage
UI error boundary caught: Cannot access 'Rr' before initialization
```

`paneWill` is a `const` whose IIFE runs **at its declaration**. Phase 4 made it read `activeFlow`
and `closeReason` so the strip could say *"Closed as withdrawn"* rather than asserting a silence —
and both were declared **two hundred lines below it**. TypeScript cannot see a temporal dead zone
through an immediately-invoked arrow, so it compiled clean, 6,995 unit tests passed, the production
build was clean, and the To-do page fell into its error boundary the moment any task was opened.
The board rendered; the list rendered; clicking a row emptied the workspace.

⚠️ **And the compiler-visible half of this trap had already fired once, hours earlier.**
`closeReason` reading `activeFlow` from the same scope was refused with **TS2448**, I moved one
declaration, and treated the shape as closed. It was not. The same read from inside an IIFE is
invisible to `tsc` — which is exactly what CLAUDE.md says about this bug, and exactly how it shipped
again in the same session that had just been caught by its milder form.

**The rule that holds is the ORDER, not the compiler.** Anything a render-time expression reads is
declared above it. There is now a source lock asserting both halves — that the five derivations
precede the strip, and that the strip really does read them, so it cannot pass forever over a strip
that has quietly gone back to asserting a silence over a withdrawal. It has to be a source lock: a
rendered check cannot catch it either, because the page simply goes blank.

**How close this came to shipping.** It was inside `bfd533fd` — the other session's commit — so it
reached `main` under a message about something else, with every gate green. The chain that caught it
was: measure → 32 red → suspect the harness → fix the harness → still red → probe the click →
console error. Four steps, and the first three all looked like the tool being wrong.

### ⚠️ A run that measured nothing reported it as 32 failures

The Phase 4–5 measurement came back **32 of 32 RED** — including assertions that had been green an
hour earlier. It was not a regression. Every reading was `-` or `undefined`: the spec's fixed
`waitForTimeout(7000)` was not enough under a load average of **14**, with three other sessions
building in the same checkout, so it opened a page whose list had not rendered and measured nothing.
Probed moments later the same page held **27 rows and logged no console error**.

**A fixed wait is a guess about a machine.** The spec waits on the condition now — the board's own
rows appearing — and asserts that precondition **first**, so "the board never came" is one honest
failure that says so rather than a wall of red about a page nobody looked at. It exits early in that
case rather than reporting 32 vacuous readings.

This is the vacuous-measurement family running in the loud direction for once: 32 red is at least
alarming enough to investigate. The same fault reading *green* is the one this repo keeps paying
for, and the fix is the same either way — assert the precondition before the claim.

---

## Phases 4 and 5 — what changed

### Phase 4 · the send journey (`e415c065`)

**The seeded number is not an answer** — the bug that was live on dev, and the *third* instance in
this codebase of a value nobody chose (after the pre-filled send answers and `RemindChoice`'s
invented fortnight). `SampleSpecPicker` in `mode="sent"` seeds a default the moment a unit is
chosen, so the picker opens on something rather than nothing. The gate read the amount's
**presence**, so clicking "Chapters" silently accepted 3.

Two halves, and the first was invisible until I looked for it:

- the picker focused the amount but did **not select** it, so typing `5` after choosing Chapters
  gave `35` — the writer's answer glued onto the app's guess, with the guess winning the leading
  digit. It focuses **and selects** now.
- `onCommit` fires on the four ways of finishing a number — blur, Enter, a stepper, an arrow — and
  **not** on choosing a unit, so the gate can tell a seed from an answer. A unit change clears the
  commit, because `mode="sent"` replaces the row and a new unit is a new question.

**The close's reason is the journey's.** `paneCommitValues` read
`kind === "close" ? "no_reply" : null` — a hard-coded constant — so every close from the pane
recorded a no-response whatever the writer meant, while `CLOSE_REASONS` was fully able to express
all three and `commitCloseFromPane` already routed through it. The plumbing was complete and
unused. It arrives from the fork: `send:wont` is a **withdrawal**, `nudge:toclose` is a silence.

The strip followed: it said "Closed as no response" on every close, so crossing from "I'm not going
to send it" read a sentence about a silence over a withdrawal — the strip stating something the
write would not do, on the one surface whose whole job is to say what the write **will** do.

**A crossover carries a verb as well as a reason**, from the contract's own drawing.
`todo-two-journeys-full.html` shows both crossed closes under **"Close the query"** while the close
journey's own flow keeps **"Log the close"**. Arriving at a close *task* you record a state the query
has reached; arriving from a send or a nudge you end it now. Same write, two acts.

### Phase 5 · the nudge journey — **landed inside another session's commit**

⚠️ **Phase 5 has no SHA of its own.** All nine of its files were swept into `bfd533fd`
("completion-paths: the inverse clears the completion stamp") by another session's broad staging,
between my last gate and my commit. See the concurrency section — the code is on `main`, the tree is
green, and what was lost is the commit message.

What it does:

- **The check-in is the writer's answer.** `requiredFor("chase")` was `[]` while `paneCommitValues`
  supplied `DEFAULT_CHECKBACK_DAYS` — so every nudge logged from the pane set a follow-up date
  nobody chose. The fork asks *"if nothing comes back…"* and requires it. The shared default
  survives for the quick rail, which states its own defaults on a receipt; the pane is no longer one
  of them.
- **"Don't ask again" writes the mute, not a date.** It travels as its own flag rather than a
  sentinel number, because a far-future `checkBackDays` would reach `logNudge` as a **fabricated
  date on the query**. `logNudge`'s `checkBackDate` is optional now: absent means the nudge is
  recorded, **no `nudgeDate` is written**, and the dismissal is `permanent` rather than dated.
- `NudgeDismissalWrite` became a **union** rather than gaining an optional field, so a caller cannot
  produce a permanent dismissal that still carries a resurface date. A mute with a return date is
  two instructions, and whichever the reader believes, the other one is a lie. Every existing caller
  gets the `custom date` member byte-identically.
- **A nudge is not a new submission** — the activity is non-status by construction, so
  `recomputeQuery` ignores it and the status cannot move. Locked as a closed pair: the only query
  fields touched are `nudgeDate` and `lastNudgeSentDate`, never `status`, never `responseDeadline`.
- **No verdicts.** "Overdue" and "late" are judgements about the *agent*, and this app does not have
  the standing to make one. Locked against the rendered pane rather than the source, because
  `nudge_overdue` is an identifier and would satisfy a source sweep — the prefix hazard pointing the
  other way.

### The response rate, on your correction (`106a1c53`)

You were right that excluding withdrawn was the wrong fix. `hasAgentResponded` was already honest —
`deriveResponseFlags` asks whether an agent-response **rung exists** in the log. The offender was
`responsesReceivedCount`'s **fallback** for unmigrated docs, which read
`LEGACY_RESPONSE_STATUSES.has(q.status)` — how the query **ended**.

Checking rejected and no-response as you asked: **rejected read correctly by luck.** A rejection *is*
a reply, so the status happened to imply what the log would have said. No-response and withdrawn
both read wrong wherever a request preceded them. One of three right for the wrong reason is a
coincidence, and it is what made the fault hard to see.

The numerator now reads the four stamps that are each written *from* the log —
`responseReceivedAt`, `partialRequestedDate`, `fullRequestedDate`, `rejectedDate` — with
position-in-the-journey kept only as the last resort. `packageMetrics.reachedRequest` already read
the pair this way, so this brings the response rate into line with a shape the codebase had settled
on. The denominator is unchanged: a query withdrawn before any reply has none, and is counted as
one that got none.

---

## Every assertion — measured on the running page

**33 assertions at 1440, 0 red**, against a local dev bundle. Suite:
`tests/e2e/journeyRound.measure.ts`. Raw readings: `run-artifacts/journey-round.txt`.

The Phase 2 and 3 assertions are unchanged from the previous edition and green throughout. What
follows is the new half.

| | claim | reading |
|---|---|---|
| P0 | **the board rendered before anything was measured** | the precondition, asserted first |
| P4.1 | **choosing a unit does NOT mark the parcel answered** | `row.done after pressing a unit = false` |
| P4.2 | the seed is focused **and selected**, so typing replaces it | `value="3" focused=true selected=true` |
| P4.3 | typing replaces the seed without a keystroke being lost | `answer="7 chapters"` — not 3, not 37 |
| P4.4 | the crossed close arrives under the contract's own verb | primary absent until its intent |
| P4.5 | its strip says **withdrawn**, not no-response | `"Closed as withdrawn, today."` |
| P5.1 | the nudge fork offers record, wait, and the crossover | the contract's three, verbatim |
| P5.2 | logging a nudge **requires its own clock** | `["When","If nothing comes back…"]` |
| P5.3 | and *Don't ask again* is one of its answers | `[…,"A date…","Don't ask again"]` |
| P5.4 | the primary is absent until the clock is answered | `"Log the nudge · 2 to answer"` |
| P5.5 | the pane calls nobody **overdue** or **late** | `overdue=false late=false` |

**P4.1 is the round's headline.** It is the bug that was live on dev — clicking "Chapters" silently
accepting 3 — and it now reads `false`.

---

## Concurrency — and the incident that cost Phase 5 its commit

⚠️ **Another session's commit swept in nine of my uncommitted Phase 5 files.** `bfd533fd`
("completion-paths: the inverse clears the completion stamp") contains `logNudge.ts`,
`logNudge.test.ts`, `db.tsx`, `todoWalk.ts`, `paneJourney.ts`, `paneCommit.ts`,
`paneCommit.test.ts`, `useTaskCommit.tsx` and `useTaskPaneSession.tsx` — my code, my comments, under
a message about something else.

**Nothing in my process could have prevented it.** `git commit --only -- <paths>` — which this repo
mandates and which I used for every commit tonight — governs what *I* commit. It does not govern
what another session commits, and my files were sitting in the shared working tree between my last
gate and my commit.

**The tells, in the order they appeared:** files I had edited showed as **staged `M`** when I had
never staged them; `git diff HEAD -- src/lib/db.tsx` came back **empty** while `git status` still
called it modified (working tree == HEAD, because their commit had taken it); and
`git show HEAD:src/lib/logNudge.ts | grep "Don't ask again"` found my own sentence in their commit.

**What I did not do:** rewrite history, revert their commit, or touch their work. The code is on
`main`, the tree is green, and the only thing lost is the commit message's reasoning — which is why
Phase 5 is written out in full above. The in-file comments survived, which is the half that matters.

**The lesson, and it is now in memory as the hazard's third shape:** the defence is the size of the
window. Commit each coherent unit the moment its gates are green rather than accumulating a phase's
worth of files. An hour of uncommitted work is an hour of exposure.

### The rest of the picture

Three other sessions were live in this checkout throughout — versions/packages
(`packageAttach.ts`, `PackagesBand.tsx`, `Queries.tsx`), marketing, and the completion-paths stream.
`tsc` reported transient errors in files this round never touches at three separate points
(`landingCopy.test.ts`'s `HERO_TURN_B`, `packageAttach.ts`'s `BookVersion`, `Queries.tsx`'s
`useMemo`), each another stream mid-edit. Gates were taken on this round's scope throughout.

One full-suite run also **timed out** in `pageStructure.test.ts` (another stream's
`QueryAnalytics.tsx` case) at vitest's 120s ceiling, with load averages at 6.79 / 12.23 / 15.45. It
passes in **9.4s** run alone. Re-run before believing, as this repo's own CI note asks.

Measurement ran in an isolated worktree (`../ScriptAlly-jr2`, detached, `node_modules` symlinked,
`.env.local` and `tests/e2e/.auth/` copied — both gitignored, the dev-only harness account). Commits
came from the primary tree. **The second copy of `.env.local` and `tests/e2e/.auth/` is deleted with
the worktree.**

⚠️ **`vite preview` bound IPv6-only** (`[::1]`), the opposite of the case CLAUDE.md records —
`curl 127.0.0.1` refused while `localhost` and `[::1]` answered. It goes both ways: probe the
address rather than assuming which.

### ⚠️ The writer typed 7 and the record said 3

The probe fixes turned three reds into one, and the one that survived was **real**.

Phase 4's commit path called `patch(row, amount)` and then a bare `onCommit()` as two separate
callbacks. The body's handler spread **its own render's `value`** — which still held the *pre-patch*
rows — so React batched the two writes and the second won. The amount reverted to the seed the
moment the writer committed their own number. Measured: `answer="3 chapters"` after typing `7` and
pressing Enter.

A silent wrong number in the record, which is the exact class this round exists to close — and it
arrived *inside the fix for the previous one*.

⚠️ **Everything else was blind to it.** `tsc` clean, 6,636 unit tests passing, and the source lock
asserting *"every way of finishing the number commits"* passed too: it **counted the calls** and
could not see that one of them undid the other. The lock now asserts the **shape** — `onCommit` is
never called bare, `patch` returns the rows it wrote — rather than the count.

`patch` returns what it wrote; `onCommit` is handed those rows; the caller performs one write
carrying both facts instead of two that race.

### Three probes that were wrong about a correct app

The post-crash run came back 30 of 33. All three reds were the harness:

- **two measured a card with no unit to pick.** The harness's Send card is a FULL manuscript, where
  the parcel requirement is satisfied by the material itself and the row is answered before anything
  is pressed — so *"choosing a unit does not answer it"* was being asked of a card that has no unit.
  The same fault as handing a function an input its callers cannot produce, wearing a fixture's
  clothes. They target a **partial** now, assert the precondition that the row starts unanswered,
  and report themselves **UNMEASURED** rather than red where the account holds no such card.
- **one read a control that had correctly stopped existing.** Committing the amount closes the row,
  so the picker unmounts; the probe read `value=null` and called it a lost keystroke. It reads the
  row's stated ANSWER now, which is the durable evidence.
- **one read a closed row's options** and reported `[]` about a question that renders its answers
  correctly the moment it is opened.

What they did confirm, first time: the seed is **focused and selected** (`value="3" focused=true
selected=true`), the crossed close's strip reads **"Closed as withdrawn, today."**, the nudge's
ledger carries **"If nothing comes back…"**, its primary counts **2 to answer**, and the pane calls
nobody overdue or late.

---

## What is measured, and what is not — stated plainly

| | verification |
|---|---|
| Phases 1–3 | **measured on the page**, 22/22 green, at `9eff807a` |
| the response-rate correction | unit — six locks, verified red-before |
| Phases 4 · 5 | **measured on the page**, 33/33 green |
| the crash fix | **the reason the measurement exists** — it is what found it |

The distinction matters more than usual tonight, because tonight is the clearest case this repo has
produced of why: Phase 4 and 5 were *"landed (code + unit)"* with `tsc` clean, 6,995 tests passing
and a clean production build, over a pane that crashed the moment anyone opened a task.

---

## Where the next night starts

Phase 6, with five journeys' worth of spine in place.

1. **Fill-in's date question** is the only real gap. The contract offers
   *"I know the date… / Around then — keep the import date / Not sure"*, where **"Not sure" leaves
   the date blank rather than guessing**. Today that row still uses the send's `When` options. It
   needs the same per-flow override the delays already have.
2. **"I can't remember" already works** — the `forget` flow declares `writes: { kind: "mute" }` and
   the primary routes on it, so it records nothing and stops the asking. It needs its assertions,
   not its code.
3. **Note's two intents already work** and it renders no `When`, because the tick carries its date.

Phase 7 (the filling primary) is a self-contained UI change against
`todo-filling-primary.html` — count outside the button, the fill advancing with answers, and the
one that matters: **it looks disabled and must not be disabled.**

Phase 8 needs the receipt-with-undo on every terminus, and the close reason carried by the journey
— which Phase 4 has already done, so Phase 8's hardest sentence is already true.

---

## The pattern worth taking from tonight

Three real bugs shipped through a completely green gate, and each was found one step further out
than the last:

| bug | what was green over it | what found it |
|---|---|---|
| the crossover kept the origin's deed | tsc · unit · build | **measurement** |
| the optional link leaked into the fork | tsc · unit · build · measurement | **a screenshot** |
| the pane crashed on every docked card | tsc · **6,995 unit tests** · build | **measurement, after two false leads** |
| the writer typed 7 and it recorded 3 | tsc · 6,636 unit tests · build · **a source lock about the very function** | **measurement** |

The last one is the sharpest. There *was* a lock on that code path — "every way of finishing the
number commits" — and it passed, because it **counted the calls** and could not see that one of them
undid the other. A lock that counts is not a lock that checks.

And the chain that found the crash is worth remembering, because the first three steps all looked
like the tool being wrong: measure → 32 red → suspect the harness → fix the harness → still red →
probe the click → console error. **Twice I had good reason to conclude "the measurement is broken"
and stop.** The reason not to is that a run reading `-` for everything is not a result at all — it
is the absence of one, and the absence of a result never proves the code is fine.
