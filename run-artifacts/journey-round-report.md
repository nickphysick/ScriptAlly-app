# To-do pane — the journey logic

**Stopped at the end of Phase 3, on a phase boundary, as the brief asks.** Phases 1–3 are the
spine and all three are on `main`. Phases 4–8 are not started.

**Why there:** Phase 3 is the last phase that can stand alone. Phases 4 and 5 are journeys, and the
brief's own instruction is not to start a journey I cannot finish — Phase 4 alone needs the unit
picker's seed-selection fix, the withdrawn close reason on the write path, and a terminus-by-terminus
check against `todo-two-journeys-full.html`'s green blocks. Phase 3 also turned out to be
**mandatory rather than optional**: Phase 2 made the delay intents reachable while the primary still
routed on the card's journey, so pressing "Set the reminder" would have recorded a send. That is
described below.

---

## Phase 0 recon — the table

Full working in `run-artifacts/journey-recon.md`. The five answers:

| # | question | answer |
|---|---|---|
| 1 | **Snooze** — name the primitive, its field, its readers; can the pane call it? | **Yes, and it already did.** `snoozeCard(card, days, when)` (`ToDoPage.tsx:619`) → `snoozeVia` picks `upsertTaskFlag` (writer's own item) or `dismissTask(…, "fixed snooze")` (engine-raised). Field `TaskFlag.snoozedUntil`. Read by `snoozedCards`, `snoozedCount`, `taskFlags`, the board derivation, the snoozed filter, the ⋯ menu. Ceilings clamp in `lib/todoActions`. **It already takes a caller-supplied label**, so Phase 3 needed no signature change. |
| 2 | **Close reasons** — is "closed" one state, or can withdrawn and no-response be told apart? | **Three, each with its own status.** `CLOSE_REASONS` (`todoJourneys.ts`): `no_reply → NO_RESPONSE`, `off_record → REJECTED`, `withdrawn → WITHDRAWN`. `commitCloseFromPane` already routes through it with an undo arm. **What is broken is the pane's SUPPLY**: `paneCommit.ts:178` hard-codes `reason: kind === "close" ? "no_reply" : null`, so every close from the pane is a no-response whatever the writer meant. Nothing had to be invented and nothing is mapped onto its neighbour. |
| 3 | **Nudge check-in** — is `nudgeDate` writable from a nudge journey, and does a task come back? | **Yes to both, by a mechanism the question does not imply.** `logNudge` writes a non-status `NUDGE_SENT` activity, `nudgeDate` + `lastNudgeSentDate`, and a **custom-date `DismissedTask`** whose `resurfaceDate` is the check-back. The returning task is the derived `nudge_overdue` **un-hiding**, not a fresh derivation from `nudgeDate`. It never touches `status` or `responseDeadline`. |
| 4 | **Task resolution by cause** | **Derived tasks resolve themselves.** Every task is re-derived per render from the query's own status, so recording a reply elsewhere simply stops it being generated. `TaskFlag.resolvedAt` has two live writers only — the agent-gap commit, and the nudge reconciliation. |
| 5 | **The union, and what has no template / list / commit path** | **There were TWO unions and they disagreed** — see below. `offer`/`decide` and the agent-record gap have no deed template, no required list and no commit path (declared hand-offs). **`chase` has an EMPTY required list while `paneCommitValues` supplies a default check-back** — the round's real bug. |

---

## False premises and findings — read these first

### 1 · There were two journey unions, and `fix` named two different journeys

The brief assumes one union. There were two:

| | `paneJourney.JourneyKind` | `paneGate.JourneyKind` |
|---|---|---|
| members | `send · chase · close · offer · note · fix · materials` | `send · decide · chase · close · fix · bulk · note` |
| the fill-in | `materials` | **`fix`** |
| the agent-record gap | **`fix`** | *(also `fix`)* |
| the cohort | *(absent)* | `bulk` |

**One word covered two acts depending on which file you were reading** — the agent-record gap and
the materials fill-in — and each has its own writer. Phase 1's declaration is the reconciliation:
one `JourneyId`, with `chase → nudge`, `materials → fillin`, `fix → agentgap`, `decide → offer`.

### 2 · The nudge writes a check-in date the writer never chose

`requiredFor("chase")` is `[]` — the chase asks nothing — while `paneCommitValues` supplies
`checkBackDays: DEFAULT_CHECKBACK_DAYS`. So a nudge logged from the pane today sets a follow-up date
nobody picked. Phase 1's declaration makes `checkin` **required** on the nudge flow, which is
Phase 5's headline turned into a compile-checked fact ahead of Phase 5. Locked both ways: the
shipped list is asserted empty, and the declaration's is asserted `["when", "checkin"]`.

### 3 · Withdrawn does not count as a response — but it *is* in the denominator

The brief asks that a withdrawn close "never affects the response-rate calculation". Half of that is
already true and half is not:

- `WITHDRAWN` is absent from both `AGENT_RESPONSE_STATUSES` and `LEGACY_RESPONSE_STATUSES`, so it
  never counts as a response. **The brief's narrower assertion — rejection counts untouched — holds
  exactly**, because `REJECTED` is a different status.
- But `responseRatePercent = responsesReceived / queries.length` counts **every** query, so
  withdrawing one *lowers* your response rate — a number made worse by a decision you made, about a
  query the agent never had a fair chance to answer.

**Flagged, not changed.** `responseRatePercent` is read by the dashboard and analytics, and whether
the denominator should exclude withdrawn queries is a product question, not a pane fix.

### 4 · Phase 3 was not optional — Phase 2 alone would have recorded a send

Phase 2 makes "Not yet — hold me to it" reachable. The primary still routed on the **card's**
journey, so `paneCommits("send")` was true and pressing "Set the reminder" would have run the send
committer and **recorded a send on a query nobody had sent**.

Caught by reading the path straight after committing Phase 2, not by a test. The primary now reads
the **flow's** declared write before it reaches any committer, which makes that shape impossible
rather than remembered. It is why Phase 3 shipped the same night rather than being deferred.

### 5 · A crossover changed the band but not the deed — found by measurement

The brief requires a crossover to swap "band register, deed sentence, flow, primary". The band and
the flow followed, because both read the active journey. The deed did **not**: `deedSentence`
switches on `cardBucket(c)`, a fact about the **card**.

Measured at 1440: crossing a send to a close changed the band `u-now → u-house` and left the deed
reading *"Send your full manuscript for The Smoke Test to Marcus Reed"* above a close fork — a
sentence describing the act the writer had just decided against, in the largest type on the pane.

`DeedParts.as` is the override, absent everywhere else so no existing caller can quietly acquire it,
and `JOURNEY_DEED_BUCKET` is the translation, declared beside the journeys.

### 6 · A single-option fork resolves without being drawn

`offer`, `agentgap` and `bulk` each declare one intent, because the declaration must be **total** —
every journey has a fork, and that is what the compile guard rests on. But a fork with one option is
not a choice, and drawing it would put a click in front of a hand-off and a cohort table purely to
honour a shape. **The declaration stays whole; the renderer skips it.** Locked both ways: exactly
those three carry one option, and the contract's five each offer a real choice.

### 7 · The calendar cannot complete a delay intent, and that is declared

`TodoCalendarPage` supplies neither `snooze` nor `mute`. Its snooze is **drag** — on the surface
where days are the subject — and it shows no dismissed cards at all, which is why it already passes
no `onSnooze` and no `onDismiss`. A delay intent there therefore writes nothing rather than writing
through a surface with no place for it. **Flagged as the one journey that host cannot finish.**

### 8 · The measurement's first run looked for the wrong toast, and left a card snoozed

`/todo` renders its **own** toast — `.tdb-toast` with `.tdb-toast-act`, label "Undo" in sentence
case — not `ToastProvider`'s `.sa-toast-undo`, which is uppercased. The probe reported *"no undo was
offered"* about a button that was on screen, so the restore step never ran and one card stayed
snoozed. Same shape as the correction round's case-sensitive probe.

Both fixes are in: the selector accepts either host, the toast's undo is now **asserted** rather
than merely read, and the spec **pre-cleans** — it walks the snoozed band and unsnoozes through the
app's own ⋯ control before measuring anything, so a run that dies mid-write cannot poison the next.

**Two toast implementations on one page is itself a finding**, and it is pre-existing and out of
scope.

### 9 · The full suite timed out once under another session's CPU load

`pageStructure.test.ts` — another stream's `QueryAnalytics.tsx` case — hit vitest's 120s ceiling in
one full run and **passed in 9.4s when run alone**. Load averages were 6.79 / 12.23 / 15.45 at the
time, with three other sessions building and testing in the same checkout. Re-run before believing,
as this repo's own CI note asks. Not a red build.

---

## What landed, phase by phase

| phase | SHA | |
|---|---|---|
| contracts | `866b12e7` | the three journey files, installed from `~/Downloads` at their stated hashes |
| **1 · journeys are data** | `7632ca1d` | one declaration; two unions reconciled; per-flow required lists; the compile guard proved three ways |
| **2 · the fork is the first question** | `51a5a08a` | fork, receipt, crossover, cleared-answers, no primary until an intent is chosen |
| **3 · delay is snooze** | `1a623f16` | the existing primitive from the fork; Snooze leaves the bar; the mute finds its home |
| — | `4c7a444b` | a crossover swaps the sentence too *(found by measurement)* |
| — | `55c9b12b` | the flow says which optional fields it offers *(found in a screenshot)* |
| 4–8 | — | **not started** |

### Phase 1 — the compile guard, proved rather than asserted

The brief asks for it explicitly. Three deliberate breaks, three real errors:

| break | error |
|---|---|
| a journey added to the union with no declaration | `Property 'brandnew' is missing in type … but required in type 'Record<JourneyId, Journey>'` |
| a flow with no primary | `Property 'primary' is missing in type … but required in type 'JourneyFlow'` |
| a journey with no fork | `'forkTYPO' does not exist in type 'Journey'` |

**And the `never` guard caught me on the first compile.** Calling `cardBucket(card)` again in the
default gives TypeScript a fresh `Bucket` it cannot know is exhausted, so the guard stops guarding —
the exact trap `cardFootHint` already carries a note about. Hoisted.

---

## Red → green at the seam

Every retarget states the law it asserts and what moved.

- **Phase 1** broke eight call sites the moment `GateAnswers` gained three members — which is the
  exhaustiveness guard working, not a cost. Each had to say what it means about the new questions.
- **Phase 2** broke `paneCommit`'s ledger lock, which asserted the per-JOURNEY reading. The law is
  unchanged — the form draws what the gate requires — and what moved is the level.
- **Phase 3** broke two ORDERING claims inside `dockPrimary`, honestly: there are two hand-off
  routes now and several advances, and a first-match `indexOf` found the delay's rather than the
  commit's. Both assert over **all** matches now, and the advance case additionally proves every
  advance before the write gate belongs to a writer that cannot fail silently.
- **My own `slice("paneHost")` failed loudly** — it is a `const` and the helper anchors on
  `function <name>`, so it named the missing anchor instead of widening to the rest of the file.
  That is `sliceBetween`'s own rule working.

## Coverage assertions scan every place the pattern can appear

- every claim in `journeys.test.ts` sweeps `Object.values(JOURNEYS[id].flows)` rather than the flows
  an intent happens to point at — a flow added without a primary fails even if nothing targets it
- the delay-options claim sweeps every flow and every field, with the population asserted first
  (`> 3` delay questions found) so an empty sweep cannot pass
- the crossover-reason claim sweeps every intent in every journey, not the two that cross today
- `never` is asserted present on exactly two option sets and absent from all others, by enumeration
  rather than by checking the two

## Out of scope, untouched

Mobile · the storage question · Pro · the bulk table's inert ticks · any restyling outside the pane.

---

## Every assertion — measured on the running page

**22 assertions, 0 red**, at 1440 against a local dev bundle. Suite:
`tests/e2e/journeyRound.measure.ts`. Raw readings: `run-artifacts/journey-round.txt`.

| | claim | reading |
|---|---|---|
| P2.1 | the pane opens on the fork, with its label and its options | `"Where are you with it?"` · 3 |
| P2.2 | **NO primary until an intent is chosen** | `primary=null` |
| P2.3 | Snooze and Dismiss remain | `["Snooze","Dismiss"]` |
| P2.4 | the steer square marks the fork itself | `visible` |
| P2.5 | every option states both lines; the crossover says so first | 1 of 3 wears `crosses to close →` |
| P2.6 | no ledger row while the fork is showing | `rows=0` |
| P2.7 | choosing collapses the fork and opens question 1 | `"You chose I’ve sent it Change"` · 4 rows · open `s-when` |
| P2.8 | the primary is the FLOW's, and it is there now | `"Log as sent · 3 to answer"` |
| P2.9 | **Snooze has LEFT the bar** | `["Dismiss"]` |
| P2.10 | Change returns to the fork | 3 options · `primary=null` |
| P2.11 | and the old intent's answers are cleared, and the pane says so | cleared `["s-unit","s-when"]` · line shown |
| P2.12 | a crossover changes band, deed and fork **together** | `u-now → u-house` · `"Send your full manuscript…"` → `"Consider closing your quer…"` |
| P2.13 | its receipt names where it came from | `"Crossed from send Go back"` |
| P2.14 | Go back restores the origin | `u-now` · 3 options |
| P3.1 | the delay intent opens one question with its flow's options | `"Hold me to when?"` · `["Tomorrow","In 3 days","Next week","A date…"]` |
| P3.2 | and says nothing is recorded on the query | verbatim |
| P3.3 | its primary is the flow's, not the send's | `"Set the reminder"` |
| P3.4 | the close fork names the honourable alternatives first | `["Close it now","Nudge them once more first","Leave it open for now"]` |
| P3.5 | leave-it-open offers the mute as one of its answers | `…"A date…","Stop asking about this one"` |
| P3.6 | and the hint states what the mute does NOT touch | this query only · deletes nothing · every other task |
| P3.7 | **a delay writes through the app's own snooze** | toast `"Snoozed until Thursday"` · undo offered · rows 20 → 19 |
| P3.8 | and the undo restores it | rows 19 → 20 (was 20) |

### The spec writes, and puts it back

One snooze is performed through the fork and undone through the app's own control, so the harness
account is left as it was found — asserted, not assumed. It also **pre-cleans**: it walks the
snoozed band and unsnoozes before measuring, so a run that dies between the write and the undo
cannot poison the next one.

**The first run did die that way** (the wrong toast selector), leaving one card snoozed for a day.
Audited afterwards on the running page: no snoozed band and no snoozed chips — the one-day snooze
had self-expired. Stated rather than assumed.

## Screenshots

`run-artifacts/journey-round/` — every fork and the states reachable from them, at 1440:

`fork-send` · `fork-send-sent` · `fork-send-later` · `fork-send-crossed` · `fork-close` ·
`fork-close-leave` · `fork-nudge` · `fork-note`.

*(The brief asks for every terminal state of all five journeys. Phases 4–8 are what build those
termini, so what is shot here is what exists: every fork, and the flows the spine opens.)*

## Concurrency

This session owned the pane, its stylesheet and the journey definitions throughout. Gated against
its own scope, which is what the shared checkout allows.

Three other sessions were live in this checkout for most of the round — marketing (`Hero.tsx`,
`marketing.css`, `landingCopy.ts`), packages (`packageAttach.ts`, `PackagesBand.tsx`) and versions.
Their commits landed between mine throughout (`aa1b53ce`, `62d5dabd`, `f2226008`, `319dfe33`), and
at two points `tsc` reported errors in files none of this round touches — `landingCopy.test.ts`
(`HERO_TURN_B`) and `packageAttach.ts` (`BookVersion`), both transient WIP. Final gates were taken
on this round's scope: **5182 passed / 3 skipped / 0 failed**, `tsc` clean outside those two files,
production build clean.

Measurement ran in an isolated worktree (`../ScriptAlly-journey`, detached, `node_modules`
symlinked, `.env.local` and `tests/e2e/.auth/` copied — both gitignored, the dev-only harness
account). Commits came from the primary tree; the worktree was rebuilt from `FETCH_HEAD` for each
pass. **Delete the second copy of `.env.local` and `tests/e2e/.auth/` when the worktree goes.**

⚠️ **`vite preview` bound IPv6-only this time** (`[::1]:4194`), the opposite of the case CLAUDE.md
records. `curl 127.0.0.1` refused while `localhost` and `[::1]` answered. Worth knowing that it goes
both ways: probe the address rather than assuming which.

## Where the next night starts

Phase 4, with the spine in place. What it needs, in order:

1. **The unit pill's seeded number is not an answer** — the bug on dev today. Choosing a unit must
   open the picker focused and text-selected, and the question must count as answered only once the
   value is committed. `SampleSpecPicker` already focuses the amount on selection, so the change is
   the SELECTION and the gate's predicate, not the focus.
2. **The withdrawn close reason on the write path.** `CROSSOVER_REASON` already declares it and
   `CLOSE_REASONS` already maps it to `QueryStatus.WITHDRAWN`; what is missing is
   `paneCommitValues` reading the flow's declared write instead of its hard-coded `"no_reply"`.
3. **Terminus-by-terminus against `todo-two-journeys-full.html`'s green blocks** — each write
   asserted to be exactly what the contract states and nothing else.

Phase 5 then has its hardest part already done: `checkin` is required and declared.
