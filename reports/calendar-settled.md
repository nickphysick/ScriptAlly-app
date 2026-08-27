# Calendar — the settled timeline

> **DEPLOYED TO DEV.** All six phases on `main` (`594d1977` → `b72d152c`), every gate green, and
> `https://scriptally-dev.web.app` verified as carrying them — the colours, the copy, the hand and
> the breath read back off the deployed bundle rather than off the success line.

**Session** `calendar` · base `d79d2296` · **complete** · hosting only; nothing touched functions
or rules.

| phase | commit | what landed |
|---|---|---|
| 0 | `97e20ed7` | recon |
| 1 | `594d1977` | the v44 ref committed |
| 2 | `1bd62043` | bar colour becomes ten tokens |
| 3 | `1397513d` | urgency is breath, and stillness says the same thing |
| 4 | `3205aa63` | a note in the writer's hand, only where there is something to do |
| 5 | `e9ecd7ec` | bar copy in two lengths; the bar stops naming the agent |
| 6 | `b72d152c` | acceptance, four widths × five ranges |

**Suite at close:** 417 files, 7,182 passed, 3 skipped. tsc clean. Production build clean.

---

## What a reader sees

```
  s-offer     "Offer received · answer by 26 Aug"        Answer them · due 1 day ago
  s-y1        "Full requested · send by 20 Aug"          Send the full · due 7 days ago
  s-y3        "Partial requested 25 days ago"            Send the partial · due 21 days ago
  s-theirs    "Out since 4 Aug · reply expected 29 Sept"  —
  s-quiet     "Quiet for 78 days"                        Nudge or close it
```

Identical at 1280 / 1440 / 1920 / 2400, five ranges: 16 bars at a week rising to 42 at six months,
**six notes at every stop**, every clamp dotted left and dashed right, the track clipping with no
bar escaping it, no agent name in any bar, no note repeating its own bar, no "overdue" anywhere,
and long-standing breathing wherever there is one.

---

## Flags

**1 · Deployed, and why.** Every gate green at every phase, twenty acceptance stops at four widths,
and the deployed bundle re-measured rather than assumed. Hosting only — nothing here touches
functions or rules.

**2 · The four agent-side states derive BY KIND; the writer's three need a threshold, and it was
already named.** A reply date exists or it does not (`theirs` / `theirsq`); a reminder is scheduled
or it is not (`nudged`); that date has passed with nothing scheduled or it has not (`quiet`, which
is what *gone quiet* means). No constant is involved in any of them.
Fresh / settled / long-standing is the one genuine duration distinction — nothing separates a
three-day stretch from a thirty-day one but its length — and it goes through `weightFor`'s
**`FRESH_MAX_DAYS = 7` and `SETTLED_MAX_DAYS = 21`**, which already existed as named constants.
Two rather than the pack's "one", because two boundaries make three bands.
`timelineGroups.ts` contains exactly one number and **a lock asserts that** by counting the
integers in its comment-stripped source.

**3 · Caveat was already loaded, in two places** — `index.html` and `src/index.css`, both
`family=Caveat:wght@400;500;600;700`. **The note cost nothing.**

**4 · All five your-move states unified, measured identical.** `10px / 500 / normal / none /
rgb(142, 82, 82)`, asserted as the same *string* across the five rather than against a written
expectation, so the claim survives any retune and fails the moment one drifts. They previously
carried **six different text colours between them** — `#9c8b78`, `#5a6e58`, `#8a5442`, `#7a4636`,
`#5f2a1c`, `#c9a89e` — none of which meant anything.
⚠️ **The ref disagrees with itself here.** Its token block says `--bar-quiet-text: #8e5252`; a later
rule sets `.b.cold .blab { color: #7a4636 }`. The pack names `#8e5252` for all five **and gives its
reason**, so the pack won — a reasoned value in prose beats an unreasoned one in an artefact.

**5 · Six of fourteen rows carry a note, at every range.** Identical at 1 week, 2 weeks, 1 month,
3 months and 6 months — the note follows the relationship, not the window, which is why the count
does not move. None on a Watching brief, Recently closed or Needs-you-soon row.

**6 · Marker clearance: NOT migrated, and "not worth doing" would have been false.** Measured at
1440, which is what this flag has been missing for three runs:

| range | one day | `GAP` 0.34d | closest real gap | marker/bar overlaps |
|---|---|---|---|---|
| 1 week | 126.9px | 43.1px | 35.1px | 0 of 1 |
| 2 weeks | 63.4px | 21.6px | 13.6px | 0 of 2 |
| 1 month | 28.6px | 9.7px | **1.7px** | **11 of 29** |
| 3 months | 9.8px | 3.3px | 4.6px | **23 of 42** |
| 6 months | 4.9px | 1.7px | **0.3px** | **39 of 72** |

**A 25× collapse, and v11's grammar stops holding past a month:** a marker is supposed to sit *in
the break the derivation left*, and past four weeks there is no break — it sits on a continuous
bar. It degrades gracefully (the marker is still visible, still on the right day), which is why
nobody has noticed, and it is a genuine fault rather than a tidy-up.
**So the honest answer is neither of the two the pack offered.** It is worth doing, it is a change
to the bar DERIVATION affecting every range, and doing it unbudgeted at the end of a six-phase run
is how a good pass ships a regression. **It needs its own phase, and the table above is what it
needs to start from** — which is what turns a standing note nobody reads into a piece of work.

**7 · What remains unverifiable, and cross-session notes.**
- **The short form is live code this account never exercises.** Measured across four widths and
  three ranges: `15 long / 0 short / 0 bare` at a week, `14/0/4` at a month. The bare ones are
  **28px** — a single day at month grain — so no wording of any length fits and the fallback is
  correctly not the answer. The board's bars are either ~600px or exactly 28px, nothing between.
  **So the decision came out of the layout effect into `barFit.ts`** and is unit-locked on both
  boundaries: unexercised is not dead, and only a check that needs no fixture tells the two apart.
- **`s-theirsq` and `s-closed` never rendered** on this account, so their treatments are
  source-locked only. **There is no long-standing bar at three months** either — reported at the
  stop rather than absorbed, so a range that quietly stops producing one stays visible.
- **`design-refs/timeline-settled.html` did not exist** — the artefact was
  `~/Downloads/timeline-final-ref.html`. **Fourth pack running.**
- **Another session held `src/` for most of the run** — `src/components/manuscripts/`,
  `shell/`, `types.ts`. Their WIP reds three tsc errors in the primary tree; **the same HEAD
  without it typechecks clean**, so every gate ran in a worktree. They committed before the
  deploy, and the tree was clean when it went out.
- **My own commits looked absent at the start.** `git log -6` showed only their work and
  `ahead: 1`; all seven of the previous pack's are ancestors of HEAD with every file present.
  Checked rather than assumed.

> ⚠️ **THREE ACCOUNT-SETTINGS LOCKS ARE RED ON DEV, AND MY DEPLOY IS WHAT PUT THEM THERE.**
> Found after this report was first written, by a whole-directory e2e run left in the background.
> `accountChassis.measure.ts` :59, :72 and :94 **crash** (`Cannot read properties of null`) rather
> than fail, and they reproduce against deployed dev from a clean tree — so they are real, not an
> artefact of the worktree I deleted underneath that run.
>
> **They are not mine.** Every file my eight commits touched is a calendar or timeline module or
> its test; nothing reaches `.acct-col` or `.acct-rail`. Probed on the deployed page: **`.acct-col`
> is absent (0), `.acct-rail` and `.acct-plane` are present** — the account column was restructured
> by the session working there (`ff7a9d45 settings: notifications and preferences`), and its own
> locks have not caught up.
>
> **What is mine is that a hosting deploy from a shared `main` carries every session's committed
> work, not just the pack's.** That is how this reached dev. Left for its own session — a crashing
> lock names a line number where an honest failure names a property, so those three say nothing
> about the account pages until they are guarded.
>
> ⚠️ `accountPrefs.measure.ts:24` also failed, after **15 minutes**. It WRITES ("the write reaches
> Firestore"), so it was deliberately not re-run — a writing measurement re-run to satisfy
> curiosity is how a fixture gets spent.

**Known, out of scope, confirmed:** `.tpn .ws` still squeezes the pane below ~600px —
`calLook.measure.ts` asserts it as a standing non-fix and passes.

**"Overdue" is absent from the calendar** — no copy, no class, no token, across all five of its
modules, comment-stripped. ⚠️ **It survives elsewhere in the app and that is flagged, not fixed:**
`nudge_overdue` is a task TYPE appearing in stored data, plus `HUGELY_OVERDUE_*` constants,
internal state names and a Query Centre group. **Ninety files.** Out of this pack's territory.

---

## Three things measurement found that reading could not

**⚠️ "Borders match fill" failed for 1.3 seconds at a time, on the one state that moves.** Phase 2
wrote it as `border-color: var(--bar-X-fill)` — a border carrying a *copy* of the fill token. That
is identical at rest and diverges the instant the pulse deepens the background, because the border
is a frozen copy of a value that is changing. Only the acceptance sweep saw it, and only once it
lifted the harness's animation suppression. **The fix is the ref's own and is better for a second
reason:** a background paints *under* its border, so `border-color: transparent` shows the bar's own
fill and nothing can tell them apart at any moment — and it leaves the CLAMPS alone, whose
`currentColor` edge an animated `border-color` would outrank and make breathe. `tlUrgeFlat` is gone;
there is one keyframe, which is exactly the ref's stated reason for having the flat form.

**⚠️ A lock's 600-character bound silently stopped matching.** `calendarStyleReach` extracts rendered
classes from `className={…}`; two comments added inside the bar's class list pushed it past the
bound and the sweep stopped seeing `tl-seg` at all — **an absence, not an error**. Its own
population floor caught it.

**⚠️ The harness answered for the page, twice.** `openRoute` suppresses animation with a stylesheet
rule, so `animationName` reads `none` on a page whose pulse is perfectly correct. The
**reduced-motion** case is where that mattered: with suppression on it reports `none` whatever the
rule says, so it would have gone green on a build with no reduced-motion rule at all.

---

## Locks retargeted, each stating its law

- **`ResizeObserver` was banned outright** in `tasksViewport`. Its stated law is *"nothing divides a
  HEIGHT here"* — the old one measured how tall a week row resolved to, to cap a fold that no longer
  exists. The ban was a **proxy**; the page now observes the board's **width** so labels can be
  fitted. Narrowed to the law, which is asserted directly.
- **A search case asserted the literal `"send full"`** — the bar's old words. It derives its term
  from `labelFor`'s own output now, so it cannot go stale the next time the wording moves.
- **The `pillLabel` case asserted the bar ECHOED the card's instruction.** It now asserts the
  opposite, which is the law: the bar says what the stretch IS, the note says what to do. The
  original claim survives — `pillLabel` is still the one summariser, reaching the bar as `moveLabel`
  for the open-ended state, the only one with no wording of its own.

---

## Still open — built to the stated defaults

| decision | built as |
|---|---|
| four or more pulsing bars: emphasis or agitation | **pulse stays** — five long-standing bars at 1 week on this account |
| whether the note becomes pressable | **not pressable** (`pointer-events: none`) |
| `theirs` and `theirs-no-date` sharing a fill | **separate tokens**, identical values |

---

## Phase 0 — recon (read-only), as taken

**Red gate: clear.** `src/` and `tests/` clean; `todoTimeline.ts` and the pane mount unrestructured
since the grouped pack closed.

> ⚠️ **My last run's commits were briefly invisible and are not lost.** `git log -6` showed only
> another session's manuscripts work, and `ahead: 1` against `origin/main`. Checked rather than
> assumed: all seven of `657d964a` → `7327866f` are **ancestors of HEAD**, and
> `timelineGroups.ts`, `timelineCopy.ts` and the report are all present at HEAD. The other session
> simply landed twenty-odd commits on top and pushed. Nothing to do.

> ⚠️ **`design-refs/timeline-settled.html` does not exist** — the artefact is
> `~/Downloads/timeline-final-ref.html` (27 Aug 11:13). **Fourth pack running.** Phase 1 commits it
> under the name the pack cites.

---

## 1 · Every hard-coded bar colour, and where text colour is set

**Sixteen `.tl-seg` rules carry colour; roughly thirty literals; not one token among them.**

| rule | fill | border | text |
|---|---|---|---|
| `.tl-row.closed .tl-seg` | `transparent !important` | `#cbbba9 !important` | `#9c8b78 !important` |
| `.tl-seg` | — | `1px solid transparent` | — |
| `.tl-seg.theirs` | `#fff` | `#dfe6dc` | `#5a6e58` |
| `.tl-seg.yours.w-fresh` | `#fdf3ef` | `#eed8ce` | `#8a5442` |
| `.tl-seg.yours.w-settled` | `#f3e0d6` | `#e8c8bc` | `#7a4636` |
| `.tl-seg.yours.w-long` | `#eec9ba` | `#dba892` | `#5f2a1c` |
| `.tl-seg.yours` | `#f3e0d6` | `#e8c8bc` | `#7a4636` |
| `.tl-seg.norail` | `transparent` | `1px dashed #e0d0c4` | `#c9a89e` |
| `.tl-seg.openleft` / `.future` (+ `.yours` / `.w-long` variants) | — | `#8a9e88` · `#c9a89e` · `#c08a72` | — |
| `.tl-seg.theirs .d` · `.yours .d` · `.norail .d` | `#8a9e88` · `#f8e2d9` · `transparent` | `#7c3a2a` dashed `#e0d0c4` | — |

**Text colour is set in six places** and every one is a different value — `#9c8b78`, `#5a6e58`,
`#8a5442`, `#7a4636`, `#5f2a1c`, `#c9a89e`. **Five of those six are your-move states, and no two
agree**, which is precisely what Phase 2's single formatting rule ends.

## 2 · How segments are classed, and what the ten states cost

**Today:** `theirs | yours` × `w-fresh | w-settled | w-long`, plus `openleft` `future` `norail`
`openend` `capl` `capr` `sel`, plus a row-level `.closed`.

**The ten, and where each comes from — four are new and none needs a new threshold:**

| ref class | state | today | derivation |
|---|---|---|---|
| `their` | waiting, a reply date is known | `.theirs` | side `theirs`, `expectedYmd` not passed |
| `theirq` | waiting, no date given | `.norail` | side `theirs`, no `expectedYmd` |
| `nudged` | **new** — a reminder is scheduled ahead | — | side `theirs`, `nudgeYmd` in the future |
| `cold` | **new** — gone quiet | — | side `theirs`, expected **passed**, no nudge scheduled |
| `y1` | fresh your-move | `.yours.w-fresh` | `weightFor` |
| `y2` | settled your-move | `.yours.w-settled` | `weightFor` |
| `y3` | long-standing your-move | `.yours.w-long` | `weightFor` |
| `offer` | **new** — an offer | `.yours` (undifferentiated) | `status === OFFER` |
| `done` | closed | `.tl-row.closed .tl-seg` | terminal |
| `task` | the writer's own chips | `.tl-chip` | not a segment |

⚠️ **The four agent-side states separate BY KIND, not by duration** — a reply date exists or it does
not; a nudge is scheduled or it is not; the date has passed or it has not. **No new constant.**

## 3 · Fresh / settled / long-standing — a threshold, already named

**A duration distinction has no kind to derive from**: nothing separates a three-day your-move
stretch from a thirty-day one except how long it has run. It is unavoidable, and it is **already
two named constants** rather than literals:

```
journeyBars.ts:66   export const FRESH_MAX_DAYS = 7;
journeyBars.ts:67   export const SETTLED_MAX_DAYS = 21;
journeyBars.ts:250  weightFor = (days) => days <= FRESH_MAX_DAYS ? "fresh" : days <= SETTLED_MAX_DAYS ? "settled" : "long";
```

Two rather than the pack's "one", because two boundaries make three bands. Nothing to change.

## 4 · `prefers-reduced-motion` is honoured — and carries no information

**Four blocks in `todoCalendar.css`** (`:348` the group caret, `:474` the bar, `:608` the caption,
`:725` the chips). ⚠️ **The bar's is exactly the fault Phase 3 exists to fix:**

```css
@media (prefers-reduced-motion: reduce) { .tl-seg.theirs { animation: none; } }
```

The animation simply stops. Whatever it was saying is then unsaid — **motion is the only signal**.

⚠️ **AND IT IS THE WRONG BAR.** `@keyframes tlBreathe` animates **`.tl-seg.theirs`** — *waiting on
the agent*. The ref pulses **`y3`**, long-standing your-move. So Phase 3 is not "add a pulse": it is
**moving the breath from the agent's bar to the writer's**, which is a change a reader will notice.
*(The existing keyframes do at least carry literal values, with the `var()`-fails-silently warning
already written at them.)*

## 5 · Tail strings: there are none, and the ref's own has the fault the pack forbids

**Nothing renders after a bar today.** No `.tail`, no note, no scrawl — `grep` returns only an
unrelated comment. Phase 4 builds it from nothing, so **no current tail can duplicate a bar.**

⚠️ **The REF's does.** Of its twelve rows, five carry a tail and seven are deliberately empty —
every empty one is a *Needs you soon*, *Watching brief* or *Recently closed* row, which is the
pack's rule already drawn. But the `cold` row states its action **twice**:

```
bar   Quiet for 78 days · nudge or close it
tail  Nudge or close it
```

The pack's prose settles it — *"The bar says what the stretch of time is; the note says what to do.
They must never say the same thing."* **The bar becomes `Quiet for 78 days`** and the deed stays in
the note. Recorded as a deviation from the artefact, taken on a reasoned rule.

---

## Findings the pack did not anticipate

- ⚠️ **`body.flat` in the ref IS the shipped behaviour.** The ref carries two modes: a default whose
  borders come from `-line` tokens, and `body.flat` where *"borders matched to fill — the bar
  becomes one solid shape"*, with `.done` keeping its dash. **That second one is what Phase 2
  describes**, and it brings its own keyframes (`urgeflat`, background only) which is the flat
  variant Phase 3 asks for. Reading the ref's `-line` values as the shipped borders would have
  produced the mode the pack does not want.
- ⚠️ **The ref contradicts the pack on one text colour.** `--bar-quiet-text` is `#8e5252` in the
  token block, and a later rule sets `.b.cold .blab { color: #7a4636 }`. The pack names `#8e5252`
  for all five your-move states **and gives its reason**, so it wins — the house rule that a
  reasoned value in prose beats an unreasoned one in an artefact.
- ⚠️ **Caveat is already loaded**, in `index.html` *and* `src/index.css`
  (`family=Caveat:wght@400;500;600;700`). **Phase 4's font costs nothing** — flag 3 answered before
  it was asked.
