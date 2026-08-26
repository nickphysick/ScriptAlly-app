# Overnight — drawer polish, `moveNotices`, and versions Part E

Ref for Part 2: `design-refs/query-centre-version-impact.html`.
Baseline: **tsc 0 · build clean · 394 files / 6890 passed / 3 skipped**.

**Another session's work in the tree, checked against the red gates:** `firestore.rules` carries an
uncommitted **new `match /ratelimits/{window}` block** for the waitlist function — a new collection,
not an allowlist change, and nothing this run touches. **No collision.** Part 2 needs no rules change
at all (the three `bookVersion*` fields deployed yesterday), so **this run deploys hosting only** and
stays off that file entirely. `functions/src/waitlist.ts`, `src/marketing/waitlist.ts` and an
untracked `waitlistStore.ts` are the same session's; `waitlist.test.ts` is red because of them.

---

## Part 1 — polish

### D1/D2 — the correct behaviour already existed three files away

`sourceLabel` in `materialDraft.ts` has pluralised *and* omitted-at-zero since it shipped:

```ts
words > 0 ? `Text · ${words.toLocaleString()} ${words === 1 ? "word" : "words"}` : "Text"
```

The package drawer's band interpolated `${wordCount} words` and rendered **"1 WORDS"** and
**"0 WORDS"**. **The fault was a second, worse copy — not a missing rule.** So the fix is not a patch:
`wordsPhrase()` is now the one phrase, `sourceLabel` is built from it, and the drawer reads it.

**⚠️ ZERO IS A CLAIM ABOUT THE TEXT; ABSENCE IS THE TRUTH.** A material with no recorded length has
not been measured at nought words — nobody has counted it. This is the third instance of the family
in two days, after the D17 denominator and the unsent scorecard.

**The sweep, not the instance.** Every counted noun in the pack was checked, and the rest were already
right: `versionMeta`, `openingRows`, `usageLine`, `tileFooter`, `returnsLine`, `packageSentLine`. The
lock now asserts the *family* — every `${n} noun` in these modules must be followed by a conditional
suffix, with a population floor so an empty match set cannot pass.

**⚠️ AND MY FIRST VERSION OF THAT LOCK WAS ITSELF THE PROXY FAULT.** It matched
`${samples} sample` and then asked whether *the match* contained a ternary — but the match **stops at
the noun**, so it never saw the `${samples === 1 ? "" : "s"}` immediately after. It reported correct
code as broken. It reads the trailing context now. Same shape as a separator supplied by the probe.

**And the population floor earned its place immediately**: written per-file it went red on
`packageDrawer.ts`, correctly — that module's only counted noun was the one this pack replaced, so it
legitimately has none now. A file may honestly contain zero; the *pack* containing zero would mean
the pattern had drifted. The floor is across the set.

### D3 / F-BB — the pull tab

**What else uses `Form11Drawer`:** `EditAgentDrawer`, `EditQueryDrawer`, `PackagesDrawer` (the
explainer), `PackageDetailDrawer`, and `App.tsx` (for `Form11Styles`).

The tab is a **fixed 92px box with no overflow rule**. At 10px mono with 0.18em tracking that holds
about nine characters.

| consumer | `tabLabel` | fits? |
|---|---|---|
| `EditAgentDrawer` | *(none — default `editing`)* | yes |
| `EditQueryDrawer` | *(none — default `editing`)* | yes |
| `PackagesDrawer` | `how packages work` | **no — clipped since it shipped** |
| `PackageDetailDrawer` | `the package {name}` | **no — read as `(DRAFT)`** |

**The two that work are the two that pass nothing.** So the reported fault was one of two, and the
older one had been live and unnoticed.

**Recommendation, and both halves are applied.** *Don't* stop rendering it — it is the Form 11
drawer's spine and it works when the label is a mode word. Instead:

1. **`minHeight` instead of `height`**, so the box grows to its label. The tab is absolutely
   positioned at `top: 12`, so growing downward reflows nothing. **This is the half that cannot be
   broken by the next caller.**
2. **The labels become modes** — `package`, `how it works` — because a label is a register choice and
   nothing in the component can enforce it. The package's *name* is already the largest thing in the
   head, two inches to the right.

### D4 — `moveNotices` set homework, and a sibling stated something false

The notice said *"An event dated before the closure slots into the record without reopening it"* —
a **rule**, stated without the event's date, leaving the reader to compare two dates the app already
had.

**⚠️ AND THERE ARE THREE CASES, NOT ONE.** Verified against `deriveStatus`, which takes the **last**
status-bearing activity in chronological order:

- the event carries **no `resultingStatus`** → it cannot move a status at all, whatever its date;
- it carries one and is dated **before** the closure → the closure is still last; nothing changes;
- it carries one and is dated **after** the closure → it becomes the last rung, and **the status
  becomes that event's**. The closure *is* superseded.

**⚠️ WHICH MAKES `moveTargetNote`'S CLAIM FALSE, AND THAT IS THE WORSE OF THE TWO.** The destination
picker said *"{status} — moving an entry here will not reopen it"*: a confident promise the derivation
contradicts. A picker row is drawn **before any event is chosen**, so it cannot know which case
applies — it now states `{status} — closed` and promises nothing, and `moveNotices` resolves the case
with the event in hand.

`closureDateOf` derives the closure from the target's **last status-bearing rung**, ordered by the
same key the status derivation sorts on — so the sentence and the outcome cannot disagree.

**An unknown date is said, not guessed** (D9, one part early): without the event, or without a
closure date to compare it to, the notice states that the query is closed and stops. It does not fall
back to the reassuring branch.

### Two locks retargeted, both because they pinned the false claim

`correctionGuards.test.ts` required the picker row to say *"will not reopen it"*, and
`correctionMove.test.ts` required the notice to say *"without reopening it"*. **The law both were
protecting is unchanged** — *a closed destination is honest about what moving an entry there does* —
and the honest answer turned out to depend on the event. The first now forbids the row making **any**
promise; the second has a case per branch, plus an unknown-date case and a no-verdict case.

### F-BC — where else a zero is rendered for an unknown

One real offender, and it is **unreachable**:

- **`upNextMeta` (`lib/agentsPage.ts:307`)** renders `` `${agent.starRating || 0}★ fit` `` → **`0★ fit`**
  for an unrated agent. It contradicts a documented law — *"Unrated cards show NO stars (never five
  hollow)"* — but **nothing imports it** outside its own module and tests. Dead today; ships the fault
  the moment anything mounts it. **Reported, not fixed: it is the Agents lane, not this pack.**
- `discoverAgents.ts:206` guards `wc > 0` before use — correct.
- Everything else the sweep found is a **sort comparator** (`|| 0` in a compare key), which renders
  nothing.

---

## Part 2 — versions in the Query Centre

**Red gates, all checked:** `recomputeQuery` needed no change (locked from both ends — neither it
nor `queryDerivation.ts` may contain the string `bookVersion` or import this module). No rules
allowlist change at all. **No other session in Correction UI's files.** And Part 1's drawer fault
turned out not to be structural — proved, not assumed, at the seam.

### The seam check, measured

Changing `height` → `minHeight` on a shared primitive is only safe if the consumers that already
worked render identically. *"minHeight ≥ height so nothing moves"* is an assumption about a flex box
holding vertical text, so it was measured:

| tab | box before | box after | ink |
|---|---|---|---|
| `how it works` | 92 (clipped) | **113.6** | 93.6 |
| `package` | 92 | **92** | 54.6 |

The short-label case is untouched. `EditAgentDrawer`/`EditQueryDrawer` pass the default `editing` —
seven characters, identical to `package`, which measured at the floor unchanged.

### Phase 3 — the chip and the two derived lines (D5, D7, D9, D10, D12)

Everything derived; nothing stored on a query. `openingRead` reaches the version **through the
package's sample**, never through the package — a package carries no version field anywhere in this
app, which is the single edge that stops a query, a package and a sample ever disagreeing.

**Three states, seeded deliberately** (`seedQueryVersions.mjs`) and measured at 1440 and 1920 —
**6 combinations swept:**

```
seed-query-8    OPENING READ § PROLOGUE-FIRST · MANUSCRIPT HELD § PROLOGUE-FIRST     ✓ MATCHES WHAT THEY READ
seed-query-10   OPENING READ § PROLOGUE-FIRST · MANUSCRIPT HELD § WORLDBUILDING-FIRST △ DIFFERS FROM WHAT THEY READ
seed-query-12   OPENING READ § PROLOGUE-FIRST · MANUSCRIPT HELD  (no chip) NOT RECORDED  VERSION NOT RECORDED
```

**⚠️ D9 — sent-but-unrecorded is its own answer.** `manuscriptHeld` returns `null` until something
has gone (no line at all) and `{sent: true, version: null}` after (a line that says the version is
unknown). Collapsing the two would either hide a real send or claim a version nobody recorded. And
`versionMatch` has **three** outcomes: an unknown is neither a match nor a difference.

A difference is stated and stops there — same muted ink as the match, no verdict, no prompt, no
control. A caution colour would make the app's report read as the app's opinion.

### ⚠️ THREE FAULTS THIS PHASE, AND ALL THREE PASSED A CHECK FIRST

1. **The chip was on the wrong builder.** The strip's pills are `qc-mchip-slot`, built from the
   *package's* contents by `linkedChips`. I put it on `attach()`, which builds `qc-mchip-att` from
   the query's own `materialsWanted` and **does not run for a packaged send** — exactly the case D5
   is about. It rendered nothing.
   **And the measurement went green**: it asserted *"at most one pill carries a chip"*, which passes
   on zero — a vacuous check inside a case written to prove a chip exists. It asserts **exactly one**
   now, names its owner, and asserts the pill population first.
2. **The lines rendered *above* the strip** — measured 16px above, so a reader met "Opening read:
   Prologue-first" before seeing which package produced it. I had anchored the JSX on a `})()}` that
   closes the block **building the pills**, not the one rendering the strip, which is sixty lines
   further down. Reading the source had told me it was right. The ordering is asserted as geometry
   now: lines-top minus strip-bottom must not be negative.
3. **The first repair made it worse.** `</PackageGroup>\n) : null}` is **not unique** — there are two
   `PackageGroup` render sites — so an insertion asserted as unique landed in the wrong one and broke
   the JSX. Restored from my own last commit and redone against a landmark that identifies the strip
   by what it *contains* (`linkedChips`) rather than by its shape.

### Two more locks retargeted, and one was a silent slice

`packageShapes.test.ts` pinned the exact call string `linkedChips(linkedPackage, versions)`, which
gained a third argument. **The second one *sliced* on it**: `indexOf` returned `-1`, `slice(-1, 499)`
yielded `""`, and three assertions ran against an empty string. The positive one failed loudly, which
is luck — **both `not.toContain`s would have passed on `""`**, and the case would have gone green
having checked nothing. The `sliceBetween` family, one anchor along. The anchor is asserted before the
slice now.

### Where Part 2 stops, and why

**Phase 3 is complete and measured. Phase 4 — D6 (the pre-filled dropdown on the record-response
flow) and D8 (the conditional list column and filters) — is not built.**

This phase produced three faults that each passed a check before being caught by measurement, plus
two lock retargets and one file restore. D6 touches the record-response write path and D8 touches the
list's filter model; building either without the measurement budget to seed its awkward state and
read it back would be exactly what rule 5 forbids, and what caught all three faults above.

**What each needs, for the next session:**

- **D6** — one `<select>` on the two send flows, defaulted from `sendVersionDefault(openingRead(…))`,
  written to `Activity.bookVersionId`. The field, the default and the two-type restriction are
  already built and locked in `lib/queryVersions.ts`; what remains is the form and the write.
- **D8** — `listVersion()` is built and locked (held wins over read, and a send with no version falls
  back to what they read rather than reading as nothing). What remains is the column, the filter
  pills, and a **census at scope All** — the list is manuscript-scoped and a default sweep omits other
  manuscripts.

### ⚠️ AND ONE GAP D6 WILL MEET — the ref's own "collision", made concrete

`editActivity`'s patch type is `Partial<Pick<Activity, "description" | "details" | "date" |
"resultingStatus">>`. **`bookVersionId` is not in it**, though the rules allowlist takes it. So a
version recorded in error **cannot be corrected** through Correction UI's edit sheet.

The fix is two lines — widen the patch type, map the field — but adding it now would ship an
unreachable capability, because nothing would call it. It belongs with D6, where the field that can
be got wrong first exists. This is precisely what the ref means by *"versions add a field inside the
thing being edited"*.


---

# Phase 4 — the write path and the list

Baseline: **tsc 0 · build clean · 396 files / 6963 tests**. No red gate tripped: `recomputeQuery`
untouched, no rules change at all, and nobody else in Correction UI's files.

## Phase 1 — the fixtures, before any feature code

| fixture | state |
|---|---|
| `seed-query-8` | **match** — sent what they read |
| `seed-query-10` | **differs** — sent another opening, deliberately |
| `seed-query-12` | **send unrecorded** — a send from before the feature |
| `seed-query-14` | **nothing known** — the package's sample carries no version *and* the send carries none |
| `seed-ms-2` | **a one-version book** — "The Quiet Second", 1 version, 2 queries |

Census read back from the database: `seed-ms-1` 3 versions / 34 queries · `seed-ms-2` 1 / 2 ·
`thin-ms` 0 / 10 — **46 total**. That is the number a scope-All sweep must reach; a default sweep
sees 34 and looks complete.

## ⚠️ F-BD — the fork did not need to know; the *form* does

The fork (change · mistake · move) is **field-agnostic** — it asks *why* you are correcting, which is
true of any field. But `CorrectionDraft` is `{ dateISO, note }`: a **closed two-field shape**.

So **a field added after Correction UI shipped does not automatically become correctable**, and
`bookVersionId` is the *second* — `Activity.materials` was the first, and the sheet cannot edit that
either. The fork composes; the form does not.

**What it implies:** Correction UI established the affordance and the fork, and the ref was right
that versions inherit both. What it did not establish is an extensible *draft*. Making the version
correctable means widening that draft — a Correction UI design decision about how fields are added,
not a version-specific path, and deliberately not taken here because D2 forbade the latter and the
former is a bigger question than this pack.

## Part 1 — `editActivity`

Clears by **`deleteField()`**, not `""` — checked rather than assumed, as D1 asked. `""` is a
*form-level* value in this feature; package **slots** are the opposite, because `isValidPackage`
requires all three keys present. Two conventions in one feature area.

Round trip, live database, fresh read each time, both stores:

```
1 · recorded bv-prologue    feed=bv-prologue  log=bv-prologue  agree
2 · corrected to bv-world   feed=bv-world     log=bv-world     agree
3 · cleared                 feed=null         log=null         agree
```

## Part 2 — the field

**⚠️ THE TWO-TYPE RULE IS THE TYPE SYSTEM'S, NOT A CHECK I WROTE.** `recordMaterialsSent`'s
`targetStatus` was *already* typed `PARTIAL_SENT | FULL_SENT`, so the seam that attaches a version
cannot reach any other event. That constraint predates the feature. The lock asserts it against the
real `ActivityType` enum and names each other status individually.

D7 holds end to end: an empty select sends `undefined`, and the write path omits the key. Where the
sample carries no version the note **says so** rather than letting the empty option read as a choice.

**⚠️ My first no-verdict lock banned the word "mistake"** — where it caught the ref's own sentence,
*"a fact worth recording, not a mistake"*, which is the **opposite** of a warning. Banning the token
rather than the act is the same shape as a rule naming one hue. The copy is asserted positively now.

## Part 3 — the column and the filter

Census at scope All: **46 rows swept**, 10 carrying a version, chips `§ PROLOGUE-FIRST` and
`§ WORLDBUILDING-FIRST`, **0 dashes**. The one-version and zero-version books contribute none — the
gate's closed side, proven in the same pass.

**⚠️ The `All manuscripts` control is `role="radio"`, not `"button"`.** `getByRole("button")` matched
nothing and the assertion **caught it** — earlier censuses in this project guarded that miss with
`if (await x.count())`, which made a failed widening indistinguishable from a successful one.

The Version filter renders only when a **single** manuscript is selected and has two or more: at "All
manuscripts" it would offer every book's versions in one list, where two books can each have an
opening called "Draft two". `Not recorded` is its own option, never the resting state.

## Phase 5 — read aloud, and it found one

```
seed-query-8     § PROLOGUE-FIRST   OPENING READ § PROLOGUE-FIRST FROM THE SAMPLE IN THIS PACKAGE
                                    MANUSCRIPT HELD § PROLOGUE-FIRST ✓ MATCHES WHAT THEY READ
seed-query-10    § PROLOGUE-FIRST   OPENING READ § PROLOGUE-FIRST FROM THE SAMPLE IN THIS PACKAGE
                                    MANUSCRIPT HELD § WORLDBUILDING-FIRST △ DIFFERS FROM WHAT THEY READ
seed-query-12    § PROLOGUE-FIRST   OPENING READ § PROLOGUE-FIRST FROM THE SAMPLE IN THIS PACKAGE
                                    MANUSCRIPT HELD NOT RECORDED
seed-query-14    (none)             MANUSCRIPT HELD NOT RECORDED
seed-query-ms2-b (none)             (nothing rendered)
```

**⚠️ THE HELD LINE WAS SAYING "NOT RECORDED" TWICE.** Before the fix, `seed-query-12` and
`seed-query-14` read `MANUSCRIPT HELD · NOT RECORDED · VERSION NOT RECORDED` — the same fact twice,
as a stutter. **Every assertion passed**, because each half was individually correct: the value slot
honestly said the version was unrecorded, and the note honestly said the match state was unknown.
**The fault existed only in the composed line**, which is why it took reading it rather than checking
it — and it is the third time in this feature that a sentence has been arithmetically true and read
wrongly.

The anti-silence rule survives where it was written for: silence beside a *known* version would read
as agreement, and that case still gets its note.
