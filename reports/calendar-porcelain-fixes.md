# Calendar — Porcelain fix pack

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
