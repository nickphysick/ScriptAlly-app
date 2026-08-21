# To-do pane — deed sentence, will-record voice, story panel, custom date

**Contract hash verified:** `6237f1b2f4b1373709f9c238c145e006`, with `This records` ×5,
`for <i>Murphy` ×3, and a `.story-h` carrying the sage gradient.
**⚠️ Installed from elsewhere** — see below. Committed alone as `1224e64d`.
**Measured: 16 of 16 green at 1440** — `tests/e2e/deedRound.measure.ts` → `run-artifacts/deed-round.txt`.
**Baseline:** `run-artifacts/deed-RED-before.txt` — 12 RED of 15, taken against the deployed build.
**Screenshots:** `reports/deed-round/` — Send empty/partial/complete, Note, Bulk, at 1440 and 1920.
**Not deployed.**

---

## The one thing to look at first

`reports/deed-round/send-complete-1440.png`. The strip reads:

> **This records** Sent 21 August. Reply expected around **18 September**; a nudge reminder lands
> here **18 September**.

Both dates are the same, and both are right — "On the day" was the reminder chosen, so the lead is
zero. It is arithmetically correct and reads as a stutter. **Worth your call:** a zero lead might
be better said as *"a nudge reminder lands here on the day"* rather than repeating the date. I have
not changed it, because the brief specified emphasis on the two dates and this is a wording
judgement rather than a fault.

---

## False premises and deviations, at the top

1. **The contract was not on the tree — fourth round running.** A hash sweep of every `.html` under
   home returned exactly one byte-identical match, `~/Downloads/todo-pane-contract (6).html`.
   Installed per the amended rule, committed alone, one file.
2. **The reminder bug was worse than reported.** "Selects but never reveals a date field" — it also
   **silently recorded a 14-day lead the writer never picked**. `RemindChoice` had no date member,
   so the code had to invent something.
3. **Phases 2 and 3 share one commit, deliberately.** They touch the same four files, and splitting
   them meant reconstructing an intermediate state I had not gated. A commit whose contents I
   inferred rather than tested is worse than a commit that says it holds two phases. Each is
   measured separately (P2 4/4, P3 2/2).
4. **`getStatusLabel` lives in `StatusPill.tsx`**, as the brief said — confirmed, and used as the
   single source rather than mapped again.
5. **No `Close` row on the harness account** for most of the night. Reported NOT RUN, never green.

---

## Per phase

| Phase | SHA | Measured | The surprise |
|---|---|---|---|
| 1 · the deed is a sentence | `746d2a7a` | 7/7 | `line-height: 1.12` was already illegal under the Playfair rule |
| 2 · will-record as prose | `9f2cee70` | 4/4 | the noun was travelling without the parcel |
| 3 · the story panel's voice | `9f2cee70` | 2/2 | — |
| 4 · custom date | `9fd5a63a` | 2/2 | **it was fabricating a fortnight**, not just failing to reveal |

Contract: `1224e64d`.

---

## What measurement found

**The strip was stating something nobody said.** With nothing chosen it read `Your full.` — because
the material is read off the CARD, not given by the writer. On its own that is the pre-filled-answer
fault in miniature. The noun travels with the parcel now, and a full manuscript (no unit to pick)
waits for the date instead.

**And the heading rule had a second half nobody had connected.** Removing the burgundy emphasis
meant touching `.deed`, which was `line-height: 1.12` — already forbidden by the standing
Playfair-descender rule. Survivable on a two-word deed; not on a sentence full of descenders.

---

## Four probe faults, and the fourth is the one that matters

1. The field check hunted a class containing "date". The picker's class is `sa-dp`. It reported
   nothing on three rows that were all correct.
2. **Fixing that comment introduced backticks inside a `page.evaluate` template** — in a comment
   explaining the first fault, in the file whose own header warns about exactly this. Fourth
   occurrence in the sequence.
3. **The module-scope unlink could not save me.** It was added so a run dying in SETUP leaves no
   stale report — but a run that fails to PARSE never reaches module scope either. I read the
   previous run's report as current for **two consecutive runs** and reported false results from it.
4. So the guard moved OUTSIDE the file: **delete the report, run, treat its absence as the answer**,
   with the backtick sweep run *before each measurement* rather than once when the file was written.
   That is the routine for every round from here.

---

## Concurrency

Other sessions were live throughout. No commit of mine swept a foreign file — the file count was
checked on every one (7, 5, 5, 3). No phase was deferred for a contested file. My gate baseline,
recorded at `1224e64d` before any edit: **tsc 0 errors, 6,121 passing, 0 failing**. At the end, in
my own worktree: **tsc 0, 6,126 passing, 0 failing.** The shared tree's totals moved under me all
night; every gate above was run in my own worktree for that reason.

## Gates

Every phase: tsc clean, `build:dev` clean, full Vitest, in an isolated worktree.
