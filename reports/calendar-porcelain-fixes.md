# Calendar — Porcelain fix pack

**DEPLOYED to dev, hosting only, from a throwaway worktree at `8ec6b7fb`** — verified by bundle
hash: `https://scriptally-dev.web.app` serves `/assets/index-Xddcz4uL.js`, the file that build
produced. The worktree was used because another session held uncommitted `src/` at deploy time
(`Queries.tsx`, `OverviewPane.tsx`, `bookProfile.css`, `packageWorkshop.css`,
`illustratedMasthead.css`, `manuscriptProfile.ts`, `containers.test.tsx` — the packages and
manuscripts sessions). Nothing of theirs was moved, staged or built from; their staged deletion of
`tests/e2e/pkgRules.measure.ts` sat in the shared index through four of my commits and is still
theirs.

Commits: `9996afe7` recon · `1b6d6d5f` Phases 1–6 · `fabfe832` fixtures + acceptance ·
`8ec6b7fb` the last line of shipping source.

Gates at the tip: **tsc 0 · production build 0 · vitest 424 files, 7281 passed, 3 skipped, 0
failed** — better than this run's baseline, which carried two reds from the packages session
(proved by reading; since committed by them). Acceptance **11/11 at 1280 / 1440 / 1920**, clean
console.

---

## Phase 0 · recon (read-only)

Baseline recorded before anything: **tsc RED (2 errors, `SubmissionPackages.tsx`) · vitest RED
(1 failed / 7270 passed / 424 files, `packageDrawer.test.ts`)**. Both belong to the packages
session, which holds `SubmissionPackages.tsx`, `PackageDetailDrawer.tsx`, `packageDrawer.ts` and an
untracked `PackageNote.tsx` uncommitted. Proved by reading — the failing spec reads
`packageDrawer.ts`, imports nothing of this pack's. Nothing moved.

Measured against the served dev build at `fd45381f`, worktree/bundle assertion green first.

### The seven premises

**1 · Where the colour family is chosen — CONFIRMED, and the mechanism is more specific than
stated.** `FAMILY[sg.state]` (`TodoCalendarPage.tsx:143`) keys on `BarState`, and `barState()`
(`journeyBars.ts:296`) *does* branch on `side` — the holder. The fault is that the three other
inputs it branches on (`expectedPassed`, `nudgeYmd`, `weight`) are **query-level facts about
today**, computed once and applied to every piece regardless of when that piece ran. So a stretch
that finished weeks ago is coloured by what is true now. The live signature, measured:

```
Marcus Reed   [req | req* | quiet | req*]      Priya Nair   [req | quiet | req | req*]
Tom Ellery    [quiet | out]                    Peter Vance  [req | quiet]
```

One journey alternating between families. `quiet` is `side==="theirs" && expectedPassed` — so
every historical agent-held stretch on a query whose window has since passed paints grey-hatched,
between writer-held stretches painted blush. *(`*` = hollow.)*

**2 · The passed end — CORRECTED.** The hollow treatment does **not** apply to every stretch. It
applies to every piece after the goal *except* `quiet`, which I exempted last run to save its
hatch — so a run fragments into **alternating solid and hollow** (`req | req* | quiet | req*`),
which reads as four objects rather than one bar past its date. Labels are indeed absent
(`labelled=0` on 9 of 14 rows) but the cause is `barFit` going bare on pieces made too narrow by
that fragmentation, **not** the hollow branch. The plan stands with its reason changed: the fix is
one solid stretch to the end plus one hollow stretch after it, per run, not per piece.

**3 · Two derivations of one date — CONFIRMED, and there are THREE.**
`journeyBars.ts:538` uses `Math.max(...sends)`; `todoTimeline.ts:452` and `:711` use
`Math.min(...sends)` — **the opposite send**, fed to the same `resolveExpectedDate`. The bar
measures from the latest send, the scrawl and the row sentence from the earliest. A live instance
is on the board now: **Imogen Farr's bar label says `next reminder 8 Sept` and its own tooltip
appends `16 Sept`** — `goalYmd = expectedYmd ?? nudgeYmd` picked the agency window while the label
picked the reminder. Two dates, one bar, contradicting each other.

⚠️ **The 865-day scrawl does not reproduce on today's dev data.** The extreme case is Rosalind
Vale at `Quiet for 128 days · 21 Apr`, and no watching row carries a scrawl at all. The
divergence is structural and provable by construction, so the fix and its lock stand; the
*number* was from a data state that has since moved.

**4 · Group vs deed — CONFIRMED, count corrected.** Two independent predicates. `queryGroup`
(`timelineGroups.ts:74`) files a row under `now` when `sideOf(status)==="yours"` **or** a nudge has
fallen due. `rowNote` (`timelineCopy.ts:230`) then decides separately whether there is a deed, from
a four-entry `DEED` table plus two date fallbacks — and it reads the **lead** query (most advanced
status) while the group is the **earliest group across all** the row's queries. Third divergence:
`actionFor` additionally requires a `BoardCard`. Measured: **one of five** `Needs you now` rows has
no deed (Rachel Lin — dash in the action column, `out` family bar, and a scrawl reading *Send the
partial · due 21 days ago*: three surfaces disagreeing on one row). The brief said two of four;
it is one of five today.

**5 · Task rows — CONFIRMED, except the cause of `o'r`.** `Your tasks` renders **one aggregate
row** (`YOU_ROW`, `todoTimeline.ts:406`), count `1`, no button, a dash in the action column.
`quickDone` never reaches it. ⚠️ **But `pillLabel` is not the source of `o'r`**: for
`family === "task"` it returns `item.label` **verbatim** (`todoCalendar.ts:601`, *"the writer's own
words … never summarised on their behalf"*). The chip on the board today reads
`Undo probe 1787787696801` — an un-truncated leftover from an earlier run's undo probe. `o'r` does
not reproduce. The regression lock will therefore assert the general claim — **no interior
truncation of a task title** — rather than pinning `pillLabel`, which is innocent.

**6 · Row head — CONFIRMED.** `.tl-nmwrap` and its two children are **inline** spans, so the
`overflow/text-overflow/white-space` on `.tl-nm2` and the `margin-top` on `.tl-ag2` are all inert
and the two sit on one baseline. The measured 8px difference in rect tops is the ascent difference
between 14px Playfair and 7px mono, **not** stacking: name top 492, name box ~18px tall, agency top
500 — the agency begins *inside* the name's line box. Same inline-vs-block disease as last run's
clipped bar labels. ⚠️ The Phase 6 lock must therefore assert `agencyTop >= nameBottom`, never
merely "the tops differ" — which is already true on the broken page.

**7 · `quickDone` — CONFIRMED reachable, nothing below the view layer implicated.** It is built by
`useTaskCommit` (`:600`) and passed only to `FocusFlow` (`:1489`); no per-task-row control exists to
call it. Every fix above lands in the view layer: `resolveExpectedDate`, `recomputeQuery`,
`assembleBoardColumns`, `quickDone` and the dedupe are consumed, never altered.

**Red gate: not triggered.** No premise implicates derivation beneath the view layer; no other
session is mid-edit in calendar territory.

### One more, unasked

The today flag's bottom is **2px** above the first group title's top (309.5 → 311.5). Not
overlapping, but not clear either. Folded into Phase 6.


---

## The answers, in order

### 3 · What was deleted

| deleted | why |
|---|---|
| the page's own `FAMILY` table | a second table keyed on the same `BarState` as `familyOf` |
| `barState`'s ungated now-facts | `expectedPassed` / `nudgeYmd` / `weight` applied to every piece whatever era it ran in |
| **two** of three `resolveExpectedDate` calls | `todoTimeline.ts:452` (the scrawl) and its `Math.min` twin — the bar kept `Math.max`, which was the correct one |
| `WRITTEN_ON` | a hand-written copy of `ASKING_GROUPS`, one edit from disagreeing |
| `actionFor`'s card requirement | the third predicate; it put a dash beside a scrawl saying *Send the partial* |
| `rowAsks`'s `actionFor(r) != null` | `RIGHT NOW` showed rows that had a CARD, not rows that were asking |
| the aggregate `Your tasks` row | could hold no deed, no name and no useful count |
| the record's `dir` as the glyph's source | authorship, where the question is which way the work moved |

**Counts: 3 functions added, 8 answering-sites removed.** `waitingFrom`'s `Math.min` is
**deliberately kept** — "how long has this relationship been running" is a different question from
"when is the reply expected", and the earliest send is the right answer to it.

### 4 · The three fixtures, and what the sweep now sees

| fixture | shape | what it makes measurable |
|---|---|---|
| `seed-cal-near` | 13 days against a 14-day window | the near step **painted**: fill 96%, `rgb(215, 224, 210)` — the sage family's own deep tone |
| `seed-cal-passed20` | 48 days out, 4-week window | a named end passed 20 days ago: full to it, hollow past it |
| `seed-cal-passed865` | 893 days out, **writer-held** | the only shape that puts a **label** on a hollow piece — `"Full req · 865 days ago"`, opacity `0.75`, background `rgba(0,0,0,0)` |
| one dated task | due in 2 days | the per-task row: title, `Your task`, TICK IT OFF |

Last run's report had to say *"nothing on the harness account is in those states"* about the near
step and the hollow label. Both are now asserted as **painted values on a rendered page**, and the
sweep prints its census beside them — 8 hollow overruns, 18 captions carrying a date, and label
forms `{long 12, short 3, bare 16}` at 1920.

### 5 · Any question two functions still answer

**None that I can find.** `holderOf`/`familyOf`, `namedEndFor` and `asksOfYou` are each the only
answer to their question, and every former second answer is deleted rather than left as a
pass-through. Three near-misses, stated so the next reader can check them rather than trust me:

- **`waitingFrom` still calls `Math.min(...sends)`** and looks like the derivation I removed. It is
  a different question (relationship age, for the "longest waiting" sort) and is correct.
- **`expectedPassed` and `norail` read `named.window`, not `named.end`.** Two facts, one call —
  they cannot disagree, because one derivation builds both.
- **`queryGroup` reads `nudgeYmd` directly** rather than through `namedEndFor`. That is grouping by
  *whether a reminder has fallen due*, not by *what date the bar runs to*; folding them would make
  a group depend on a window it has no interest in.

### 6 · Unverifiable remainder; cross-session

**Unverified**
- **`remind` has no sampled text colour at any width** — the fit pass drops that family's label on
  today's board. Reported by the sweep every run rather than asserted on null, with a floor so the
  whole set cannot go unchecked quietly.
- **`in` and `bang` markers** still do not appear on this fixture; only `outk` and `clock` do.
- **`Recently closed`** did not render — no closure fell inside the window. The linger is 30 days
  now, so it will appear more often than it did.
- **The fill of a stretch that begins before the window's left edge** is a fraction of the VISIBLE
  span, not of the stated one, because a clipped piece is drawn from the edge. Found while building
  the near fixture; the fixture sidesteps it by sitting wholly inside the window. **Flagged, not
  fixed** — it is a real property of the drawing and beyond this brief.

**Known, still reproducing, untouched as instructed:** uppercase agent names in dev data
(`PRIYA RAMAN` — the board reports what is stored), the pane's `.tpn .ws` squeeze, `nudge_overdue`
as a stored task type.

**Cross-session:** `main` moved three times during the run. Four commits, `--only` throughout;
verified after each that only my paths landed.

**One open item.** The count now reads `21 RELATIONSHIPS` and includes the task rows, which are not
relationships. One word or one filter — left alone because the noun is yours to choose.
