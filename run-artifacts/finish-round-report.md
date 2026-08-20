# To-do pane — the finishing round

**Contracts:** both present and committed as `13caf104`.
`design-refs/todo-pane-contract.html` md5 **`52473130`** (was `ec08f5cf`, 26,510 → 28,117 bytes) ·
`design-refs/todo-short-and-bulk.html` md5 **`fe299a95`**, new.
**Measured:** **29 of 29 green at 1440** — `tests/e2e/finishRound.measure.ts` → `run-artifacts/finish-round.txt`.
**Baseline:** `run-artifacts/finish-RED-before.txt` — 27 assertions, 22 RED.
**Screenshots:** `reports/finish-round/` — Send · Close · Note · Bulk at 1440 / 1920 / 390.
**Not deployed.**

---

## The one thing to look at first

**`/todo` is unusable at 390, and it is not the pane's doing.** The pane's own cards behave —
they stack, hug and keep their action bar — but the PAGE puts the list and the pane in a
side-by-side row that overflows horizontally, and the command bar's three controls overlap. See
`reports/finish-round/send-390.png`. This is pre-existing: `/todo` was explicitly **parked** in the
mobile pass and nothing this round touched `.tdw-split`. Flagged because the brief asked for 390
shots and they show it plainly — it is a page-frame job, not a pane one.

---

## False premises, at the top as asked

1. **Neither contract was committed.** The check failed twice before anything was built.
   `git log --all -- design-refs/todo-short-and-bulk.html` was empty — the name had never been
   committed on any branch — and the pane contract's last commit was the PREVIOUS round's recon.
   Both were in `~/Downloads` in several byte-identical copies. Copied in and committed first.
2. **The brief's `--edge: #e6dccd` is not the contract's.** Three values were in play: this repo's
   `#ece4d9`, the brief's prose `#e6dccd`, the contract's `#e8e0d8`. The files are the contract, so
   the contract's is shipped and the prose's is recorded here.
3. **Two of the brief's Phase 1/3 details are in the prose ONLY** — `Their stated window is …` and
   the `#e6dccd` edge appear nowhere in either contract file. Built from the prose, noted so they
   are not mistaken for ported values.
4. **The harness cohort is 15, not 10.** The brief says "the harness's 10"; the bulk row reads
   "15 imported queries are missing their materials". Nothing was capped to fit the number.
5. **"from your import on {date}" HAS NO DATA BEHIND IT.** Nothing in the model stores when an
   import happened. The only available date is the earliest `dateSent` in the cohort — a
   *first-query* date wearing an import label, which is the exact fault the Manuscripts tile paid
   for once. The clause is **omitted, not invented**, and the assertion was corrected to the model
   rather than satisfied by a plausible wrong number.
6. **Both Fix rows wear the same pill.** "Open the Fix row" opens the SINGLE fill-in, which has a
   query and therefore a story card — so a correct three-card pane read as a bulk pane with a card
   too many. The bulk journey is identified by its own sub-line now, in the suite and in the shots.

---

## Per phase

| Phase | SHA | Measured | Surprise |
|---|---|---|---|
| 1 · three cards | `bf39d25b` | 4/4 | three `.tpn .pane` rules had accumulated across two rounds |
| 2 · cards hug | `96ed3c6b` | 3/4 → 4/4 at Phase 5 | `.mid`/`.formcol`/`.storycol` had each drifted into two declarations |
| 3 · choices made | `77bf544e` | 6/6 | the strip was describing the BUTTON, not the record |
| 4 · gated primaries | `ea0cc9b9` | 6/6 | the scoping lock counted `@keyframes` steps as unscoped selectors |
| 5 · the note journey | `2915ab28` | 3/3 | Phase 2's fourth assertion landed here, as predicted |
| 6 · the bulk table | `c147de53` | 6/6 | the lift was mostly markup — the logic was already a pure library |

Contracts: `13caf104`.

---

## What the round actually changed

**Phase 1** — the pane was ONE white card; the contract draws a transparent column holding three
`.fc > .rim` cards. The tint is clipped BY the rim (`overflow:hidden`), never laid over it: measured
by `elementsFromPoint` at all four inset corners of the band, with the rect proved on screen first
because a point outside the viewport returns an empty array and would have satisfied the probe with
`undefined`.

**Phase 3 is the one with teeth.** The send form opened with three answers already given, and the
strip read `today · reply expected ~15 Oct · nudge 8 Oct` over a form nobody had touched — pressing
the primary would have recorded three facts the writer never stated, all looking like theirs. Every
choice is now a union with `null` for unchosen, because a nullable number cannot carry the
difference between "unanswered" and "the answer is none" — which is exactly what **"No reminder" is
a choice** requires. The agency's stated window is a quiet line, not a pre-selected pill: it is the
best information on file and the worst possible default.

**Phase 4** — the primary always lands. A disabled button says something is wrong and declines to
say what; an incomplete click writes nothing and SHOWS the first missing answer — measured as
`scrollTop 0 → 196`, `document.activeElement` inside the form, takeover absent. The exhaustiveness
guard was proven by adding `brand_new_journey` and reading
`Type '"brand_new_journey"' is not assignable to type 'never'`.

**Phase 6** — the table is the journey. Lifted out of `PaneRecordSweep`, which is now deleted with
its stylesheet and locked out; it outlived `PaneJourney` by one round because the thing being lifted
was inside it.

---

## The wording override

**"Log as sent · Log the close · Log {n} queries · Tick it off"** — the owner's deliberate
reinstatement of a verb the language review retired, made after the previous round shipped the
alternative.

It is **pinned in a test, not just noted**, and the exception is **scoped**: the retired-verb sweep
still runs over every deed, and the new case asserts both rules together — because the danger is
not either rule but someone finding one of them alone and "fixing" the other back.

---

## Assertions that were wrong before they were right

Three of the baseline's six greens were broken, and one was the dangerous direction:

- **P2.2 was VACUOUS.** `minH.every(...)` over an array that is empty until the cards exist, and
  `[].every()` is true — green before a single card had been built. The documented liar, caught in
  its own baseline.
- **P5.1 was SCOPED WRONG.** It counted the duplicate sentence in the form column only, returned 1,
  and went green while the sentence was also in the band. A false green would have passed for the
  life of the fault.
- **P6.4 hunted a class I invented while writing the assertion** before the markup existed, and
  reported an empty array about two buttons that were on the page.

The five legitimate green-befores are regression guards and say so in the file.

---

## Working conditions

A concurrent session ran in this checkout throughout (Correction UI, masthead, packages). Every
commit was gated in an **isolated worktree**, and the file count was checked **in the result** — on
Phase 1 that caught `mastheadVanish.measure.ts`, staged by the other session in the window between
the check and the commit, and unstaged before committing.

## Gates

`tsc` clean · `npm run build:dev` clean, output read in full · Vitest **6,026 passing, 2 skipped,
355 files** · each phase separately verified in an isolated worktree.
