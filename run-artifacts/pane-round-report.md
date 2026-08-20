# To-do task pane — chassis, send flow, dismiss, bulk corrections

**Run:** overnight, 20 Aug. **Contract:** `design-refs/todo-pane-contract.html` (md5 `ec08f5cf5c65c5e1d1851f10be5074e0`, 383 lines).
**Branch:** `main`, direct. **Not deployed** — the brief says so.
**Measured:** 23 of 23 assertions green at 1440 (`tests/e2e/paneRound.measure.ts` → `run-artifacts/pane-round.txt`).
**Screenshots:** `reports/pane-round/` — five journeys × two widths, plus the dismiss dialog and the filter menu.

## The one thing to look at first

**The `Will record:` strip truncates at 1440.** The contract's full grammar is
`Partial sent · first 3 chapters · today · reply expected ~9 Oct · nudge 2 Oct`, and at 1440 with
Snooze and Dismiss beside it the strip ends `… REPLY EXPECTED ~15 OCT …`. Everything it says is
right; you cannot read all of it. It is legible at 1920. Visible in `reports/pane-round/send-1440.png`.
Three ways out — wrap the strip above the buttons, drop the nudge clause below a width, or move the
expectation into the form's own summary — and each says something different about what the strip is
for, so it is a decision rather than a fix.

## What landed, and how each is verified

| Phase | What | Verification |
|---|---|---|
| 1 | Counter row deleted, arrows into the band, Snooze/Dismiss off the command bar, Go to calendar on it | measured 1440 |
| 2 | Three-zone chassis — fixed band, scrolling middle, pinned action bar | measured (band 68px · one scroller · bar foot 888 vs pane 889) |
| 5 | Close journey — deed, three tiles, verbatim response-rate line, reviewed primary | measured |
| 7 | Dismiss confirm + `TaskFlag` write + "Include dismissed" filter entry | measured |
| 8 | Story column: real `StatusDot` for statuses, own glyphs for the rest, split at the type level | measured + unit (byte-for-byte against the component) |
| 3 | Send form asks what WENT, through `SampleSpecPicker` with `mode="sent"` | measured (incl. the single-select click) |
| 4 | Expectation block, both derived dates in `Will record:` | measured — **write half NOT built, see below** |
| 6 | Bulk pane | **cut** — see below |

Per-phase commits: `550afed0` · `57cf107b` · `d23d796e` · `adf00ac7` · `c0bc6926` · `7bd7d6ff` · `2251cfa2`,
with `c0feb22b` for the harness.

## False premises caught at recon or by measurement

1. **`StatusCircle` does not exist.** `StatusDot` is the law. (Recon.)
2. **`PaneJourney` / `PaneRecordSweep` were already dead.** (Recon.)
3. **`dismissedTasks` is the retired store.** `TaskFlag` is live and already keyed to the cause. (Recon.)
4. **The band already read `rowDeed`** — the brief's `card.title` premise was wrong. (Recon.)
5. **The brief's field for "remind you to nudge" is wrong.** `sendReminderDate` is a reminder to
   PREPARE AND SEND — `types.ts` says so and `RecordResponseModal`'s placeholder reads "Remind me to
   prepare & send". A nudge reminder belongs in `nudgeDate`. Writing it into `sendReminderDate` would
   put a chase in the field that means the opposite direction.
6. **The pane's primary does not write.** `dockPrimary` opens the takeover journey, and the journey
   commits — a law this file states in its own words. The contract puts a form and a `Will record:`
   strip in front of that button, which reads as "this records". Building it that way would give one
   act two write paths. The pane's answers now travel as the flow's **prefill** instead. Without this,
   Phase 3's form would have shipped decorative.

## The deed collapse (the catch of the night, and it keeps paying)

Three functions were producing the deed — `listDeed`, `rowDeed` and `card.title` — which is how the
pane came to say "Log the close" beside a row saying "Consider closing". One `taskDeed` now, with the
reviewed wording; `rowDeed` is a one-line deprecated alias. **The assertion is that the row and the
band render the SAME STRING for every card type**, not that each reads the right variable — proven
red by reinstating the synonym before it was believed.

Primaries, per your correction: Send → "I've sent it" · Close → "Close this query" · Bulk →
"Record {n} queries" (judgement call, recorded). "Will record:" stays — the app talking about itself.

## Four faults the harness had, and the fix for each

These cost more of the night than the app did, and all four are the same shape: **a harness
reporting its own memory as a measurement.**

1. **Probes pointed at deleted selectors.** P5.3 and P5.5 read `.act h3` and `.b-primary` — the
   materials contract's, retired in Phase 2 — and reported the close heading and primary as EMPTY
   STRINGS while both were on the page and correct. P8.1 hunted `.sa-statusdot, [data-statusdot]`,
   neither of which `StatusDot` renders, so it would have reported zero whatever the pane did.
2. **A backtick inside a comment inside a `page.evaluate` template literal terminates the string.**
   Third occurrence in this sequence — and I wrote it into the comments *explaining* escaping traps.
   It does not fail loudly: the file fails to COLLECT, Playwright says "No tests found", and the
   previous run's report survives on disk. Three consecutive "3 RED" reports described a page nobody
   had measured. The existing comments in that file escape their backticks; the new ones avoid them.
3. **A `\s` inside the same template does not survive either** — demonstrated, not theorised: a
   diagnostic slice came back with every "s" replaced by a space.
4. **A stale report.** A run that dies in setup left the previous run's file looking current. Fixed
   twice: first inside the test body (skipped by exactly the failures that matter), then at module
   scope, where collection guarantees it runs.

Plus: **the bundle guard assumed `dist/`.** localhost:3000 is `npm run dev` — a Vite dev server
serving SOURCE — not a preview server. The staleness check I added would have refused every
measurement on a working night. It now fetches the served document and applies the bundle checks
only when a built bundle is actually being served.

**The vite-build guard earned its keep again**, as you asked be noted: a plain `npx vite build` from
another session left a production bundle in `dist/`, and the harness refused to measure rather than
pointing the harness account at prod.

## What measurement found that no test could

**The send form was wiping the writer's answers.** Choose a unit and the row count went straight back
to zero. The effect that clears the form on card change listed `seedRows`/`seedExpect` — `useCallback`s
over `queries` and `agents`, arrays that arrive new from every Firestore snapshot — so it re-ran on
ordinary re-renders. Every unit assertion passes on a component re-mounted between them; **that is the
fault wearing the shape of a clean fixture**, and `tsc` plus exhaustive-deps ask for exactly the
dependency list that causes it. Found by one measured click.

## Not built, and why not half-built

- **Phase 4's write half.** The footing is real — `recordMaterialsSent` already accepts
  `writerExpectedDate` and `nudgeDate`, and both fields are in the query update allowlist, so **no
  rules deploy is involved**. Two links are missing: `markSentWriteArgs` (`src/lib/todoWalk.ts:200`)
  does not pass them, and `FocusFlow`'s `prefill` has no field for them. The block is **asked and not
  yet stored**. Half a write path is worse than none.
- **Phase 4's board read.** The nudge task is raised by `replyTask` from the AGENT's
  `responseTimeWeeks` (`src/lib/db.tsx:766`), not from the writer's own expectation. Making the
  writer's answer govern is a change to this app's most load-bearing task predicate.
- **Phase 6, the bulk pane — cut, as permitted.** `PaneRecordSweep.tsx` therefore **survives
  deliberately**: the table Phase 6 lifts is inside it, and deleting the source before lifting from it
  is the wrong order. It has no callers and no mount. `PaneJourney.tsx` IS deleted, with an assertion
  that it stays deleted.

## Judgement calls worth your eye

- **The unit opens on nothing when the query records no sample.** The form seeds from what the agency
  asked for; guessing a unit would state a measure nobody chose. The picker's own "NO SAMPLE" line
  then sits under the pills, which is honest and reads a little bluntly. See `send-1440.png`.
- **The expectation defaults to the agent's own stated window**, snapped to the nearest pill (8 weeks
  in the screenshot, from an agent who states 8), and to the contract's 6 only where nothing is stated.
- **Dismissal writes `skippedAt`, not `snoozedUntil: MUTED_UNTIL`.** The latter would have worked with
  no schema change, but it is what the housekeeping GROUP MUTE writes — reusing it would have retitled
  every muted rule group as "dismissed" the moment the filter learned the word.
- **Two locks relaxed, each with a named reason.** The class-name census exempts a MOUNTED component's
  namespace (`sa-` StatusDot, `ssp-` SampleSpecPicker) — requiring their internals to be contract words
  would mean the pane could only pass by redrawing them locally. Proven still sharp by adding an
  invented class and watching it fail.

## Working conditions

**A concurrent session ran in this same checkout all night** (Query Centre provenance, calendar,
packages). Consequences, all handled: two files were contested and were staged as HEAD-plus-my-hunk
alone; every commit was gated in an **isolated worktree** because the shared tree carried their reds;
the dev server died twice under their restarts; and the harness account's task list changes between
runs because they are driving it too.

⚠️ **One commit swept in five of their files** — staged in the seconds between checking
`git diff --cached --name-only` and committing. Reverted by soft reset; their content was never
touched. The house rule `git commit --only -- <paths>` re-reads the WORKING TREE per path, which is
exactly wrong for a contested file. **Neither form is safe alone**: `--only` picks up their content,
plain `commit` picks up their paths. What works is to stage surgically and then **check the file count
in the RESULT, not before it.**

## Gates

`tsc` clean · `npm run build:dev` clean (read in full, not tailed) · Vitest **5,838 passing, 2 skipped,
342 files** in the shared tree; each commit separately verified in an isolated worktree.
