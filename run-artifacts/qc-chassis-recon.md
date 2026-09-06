# To-do on the Query Centre's chassis — Phase 0 recon (6 Sep, against `af98bb58`)

Contracts installed and enrolled as `af98bb58` — all three byte-identical to the brief's hashes,
38 refs now guarded. ⚠️ **They arrived once already and were withdrawn**: `8221911a` enrolled them
from another session by mistake and `12e7b40d` reverted it so this session could. That session
wrote no source, no report and no run-artifact, so nothing else of the round exists.

---

## 0 · The constraint that shapes every phase: the Query Centre is HOT

`src/components/Queries.tsx` (8,517 lines) and `src/components/queries/` were last committed
**three hours before this recon**, and the stream working there is mid-round:

```
fb6927de  06 Sep 18:48  v14 §§1–4 — the board sheds its fact line…
cf1364cd  06 Sep 17:31  colours v2 · Phase 6 …
341e264a  06 Sep 17:24  colours v2 · Phases 3–5 — List, Board, and a Calendar…
dcc35a28  06 Sep 17:15  colours v2 · Phase 2 — the stat tiles replace the chips, and a view switch…
```

**The stat tiles and the view switch this brief asks me to reuse were created today at 17:15.**
The tree is clean right now, so nothing is uncommitted — but this is one shared checkout, and a
large edit to `Queries.tsx` while that session is live is the collision the working discipline
exists to prevent.

**The plan that follows from it** (deviation, stated at the top of the report as the brief asks):
extraction happens in the SMALL component files, never in `Queries.tsx`. `QueryStatTiles.tsx` and
`QueryBoardView.tsx` keep their names, their exports and their data-binding, and delegate their
rendering to a new presentational primitive that `/todo` also mounts. **The diff to `Queries.tsx`
is then zero** and the shared caller is real rather than promised. The one part that is inline in
`Queries.tsx` — the three toolbar buttons — is dealt with in Phase 1 and is the only place where
a small edit to that file is unavoidable; it is three blocks, done in one pass, committed
immediately, with `git status` checked either side.

---

## 1 · The Query Centre's parts

| part | file · export | mountable by `/todo` as-is? |
|---|---|---|
| page header | `shell/PageHeader.tsx` · `PageHeader variant="workspace"` | **YES, and `/todo` already mounts it** through `TasksPageLayout`. The QC passes `title`, `description` and `primary`; `/todo` passes no description today. The subtitle is `.wsh-sub` — `var(--font-serif)`, 400, **not italic**: the contract draws italic Playfair, so italic is a one-line additive change or a deviation to record. |
| illustration slot | `queries/IlloSlot.tsx` · `IlloSlot` | **YES** — `{ name, width, height, round?, className?, art? }`, no query coupling. It draws the hatched placeholder that ADMITS the slot is unfilled. |
| stat tile | `queries/QueryStatTiles.tsx` · `QueryStatTiles` | **NO, not as-is** — its props are `counts: Record<QuickKey, number>`, `overdueCount`, `quickKey`, `overdue`, and it maps over `STAT_TILES` (the QC's own five). The MARKUP is generic: `.qct` › `.qct-tile[--on]` › `.qct-ic`/`.qct-mk` + `.qct-tx` › `.qct-k`/`.qct-n`. → extract `StatTiles` (presentational, keyed rows in, one `onPick`), `QueryStatTiles` becomes its wrapper. |
| toolbar buttons | **inline in `Queries.tsx`** (~5843–5885), classes `.qcc-tb-btn` · `.qcc-tb-val` · `.qcc-tb-cnt` · `.qcc-tb-chev`, each in an `.f12-popwrap`, anchored through `useFixedMenu` | **NO** — there is no component. → extract `ToolbarButton`; the QC's three call sites become three one-line mounts. The ONLY edit to `Queries.tsx` this round. |
| view switch | `queries/QueryViewSwitch.tsx` · `QueryViewSwitch`, `QUERY_VIEWS`, `QueryView` | **NEARLY** — the type is `"grid" \| "list" \| "board" \| "calendar"` and the component maps `QUERY_VIEWS`. `/todo` needs Grid + Board only. → additive: accept an optional `views` list, defaulting to `QUERY_VIEWS`. No change to the QC's call site. |
| board column head | `queries/QueryBoardView.tsx`, inline — `.qbv-h` › `.qbv-htop` (StatusDot + `.qbv-hw` + `.qbv-hn`) + `.qbv-hcap` | **NO** — `QueryBoardView` maps `BOARD_COLUMNS` (query statuses) over `GridCard`s. → extract `BoardColumnHead` (mark, name, count, caption); `QueryBoardView` mounts it. ⚠️ the QC's head leads with a **StatusDot**; the contract's To-do head leads with an **outlined icon disc**, so the mark is a slot rather than a fixed dot. |
| card + date chip | `queries/QueryCard.tsx` · `QueryCard` | **NO** — bound to `GridRow`/query facts throughout. The contract's ticket and board card are their own anatomies (`.card`, `.bcard`); the DATE CHIP (`.bcard .date`, 44px, mono month over Playfair day) has no equivalent in `QueryCard` and is new. |
| drawer shell + scrim | `queries/QueryPanel.tsx` · `QueryPanel` | **NO** — it is the query panel's whole content, not a chassis. ⚠️ **And there is no generic drawer primitive in the app**: the QC's panel, the packages drawer and the Query log sheet each own their own fixed-position element. The contract's drawer is `position: fixed; right: 0; width: 640; transform: translateX(100%)` with a scrim at `rgba(36,18,9,.30)`. → Phase 5 builds `SlideOver` as a shared primitive and records that the three existing surfaces could adopt it; adopting them is NOT this round. |

**Summary**: two parts (`PageHeader`, `IlloSlot`) are reusable untouched; two (`QueryStatTiles`,
`QueryViewSwitch`) need small additive changes in their own files; two (toolbar button, column
head) must be extracted before they can be shared; two (card, drawer) have no shareable ancestor
and are built here, with the drawer built AS a shared primitive.

---

## 2 · Categories

Task types are declared in **`src/lib/todoActions.ts` · `TASK_TYPES`** (twelve, a census with its
own note that it is "not a wish list"), and bucketed today by
**`src/lib/todoBuckets.ts` · `cardBucket(card): Bucket`** into six —
`send · decide · chase · close · fix · note` — with `note` first (a writer's own item is a note
whatever else it looks like) and `fix` as a **deliberate default rather than a fallback**.

The five categories map cleanly onto the twelve types, and **every type lands in exactly one**:

| category | task types |
|---|---|
| Agent requests | `partial_requested` · `full_requested` · `revise_resubmit` · `offer_received` |
| Nudges | `nudge_overdue` **without** a prior nudge on the query |
| Gone quiet | `no_response_close` · `nudge_overdue` **with** a prior nudge (see §3) |
| Housekeeping | `data_quality_poor` · `querying_unstarted` · `dream_agent_unqueried` · `materials_unrecorded` · `materials_unrecorded_bulk` · `weekly_review` |
| Your tasks | every `UserTask` (note or dated note) — these carry no `taskType` at all |

⚠️ **`offer_received` and `revise_resubmit` are the judgement calls, and they go to Agent
requests.** `cardBucket` calls both `decide` — "the act is a judgement rather than a task" — but
the five categories have no Decide, and the column's caption is **"with you"**, which is exactly
what an offer and an R&R are. Recorded here because it is the one place the new table is not a
relabelling of the old one.

⚠️ **The derivation is `taskCategory(card): Category` in `src/lib/todoCategory.ts` (new), and it
must NOT re-derive what `cardBucket` already decides.** It reads `cardBucket` for the note case
and the type for the rest, so a new task type fails to compile until it says which category it is
(the exhaustive-switch idiom `todoActions` already uses).

---

## 3 · Gone quiet's two feeders — and the discriminator that does not exist yet

Both feeders are live and both produce a task today, in `db.tsx`'s derivation (~960–1030) through
`replyTask`, which enforces **one decision, one task** (close SUCCEEDS nudge, never competes):

- **(a) the stale/no-response threshold** → `no_response_close`, whose title already states the
  silence in the app's scaled phrase ("No response from X for two years. Consider closing?"),
  measured **from the send, not from the deadline** — a documented decision.
- **(b) the writer's own check-in** → `replyTask` is passed `writerNudgeDate: q.nudgeDate`, which
  `logNudge` writes from the nudge journey's "If nothing comes back…" answer. It raises the SAME
  `nudge_overdue` task.

⚠️ **So the two feeders are distinguishable, but not by task type.** A check-in that has come
round produces a `nudge_overdue` identical in kind to a first nudge. The discriminator is on the
query: **`lastNudgeSentDate`** — `logNudge` always writes it ("the nudge did happen"), while
`nudgeDate` is absent where the writer declined a check-in. So:

> `nudge_overdue` **with** `lastNudgeSentDate` → Gone quiet, deed *"Still nothing from {Agent} at
> {Agency} after your nudge about {Title}"*, close-or-nudge-again fork.
> `nudge_overdue` **without** → Nudges, the existing deed.

This is the one piece of Phase 2 that needs a field the card does not carry today; `BoardCard`
will need it threaded, or the derivation given the query. **Named as the round's first real
dependency.**

---

## 4 · Urgent

The contract's own test is `isUrgent = t.p === 'Send' && t.w !== '—'` — a send **with a date on
record**, not a send past a threshold. In the app the equivalent is:
`cardBucket(card) === "send"` **and** `waitAnchorMs(...)` is finite — i.e. the request date exists
and the clock has been running since. `waitAnchorMs` (`lib/todoBuckets.ts`) already returns the
request date for a send (`partialRequestedDate` / `fullRequestedDate`, or the status change for an
R&R), which is exactly "the writer-owed date".

⚠️ **There is no existing "has run" test to reuse.** `listFragment`'s `hot` flag is **`decide`'s
alone**, by an explicit decision recorded at the value ("Other hot conditions are out of scope by
the brief; adding one here would put a rule in the list that nothing else knows about"). So Phase 6
declares the predicate once — `isUrgentCard(card, facts)` beside `taskCategory` — and Phase 3's
burgundy numeral reads THAT rather than growing a second rule.

⚠️ **And the harness account has no request dates unless seeded.** `seed.mjs` writes none;
`tests/e2e/seedRequestDates.mjs` (added last round) supplies them, so the urgent set is empty on a
fresh fixture and every urgency assertion must run after it.

---

## 5 · Motion

- **`src/styles/motion.css`** is the app's motion module: `.sa-rise` / `.sa-fall` keyframes, and
  **`.sa-settled { animation: none !important }`** — the class every measurement uses to settle a
  FLIP before reading a position.
- ⚠️ **There is NO app-wide reduced-motion block that a new animation inherits.** Each surface
  declares its own: `motion.css` covers `.sa-rise/.sa-fall`, `index.css:1136` covers
  `.stage-page-on`, and `f12.css` has five separate ones. So Phase 6 must declare its own
  `@media (prefers-reduced-motion: reduce)` rule **immediately after the rule it overrides** — a
  media query confers no specificity, which this session has now been bitten by twice (once
  through a media query, once through `:has()`).
- The contract's own reduced-motion rule is `body .card.urgent { animation: none !important }` —
  note the `body` prefix, which is how it out-specifies `body.m-wiggle .card.urgent`. Ours needs
  the same care with whatever selector turns the animation on.
- The harness suppresses motion with a stylesheet rule and `liftMotionSuppression` lifts it;
  anything asserting the animation must lift first, and anything asserting geometry must not.

---

## Corrections to the brief

1. **`.card .ttl` is declared TWICE in `todo-qc-style.html`** — Inter 14.5/600 at line 108, then
   Playfair 18/500 at line 138. The browser takes the second, so the ref RENDERS Playfair. The
   brief says "Title in Inter 600 (not Playfair — the ticket is dense)", which is a reasoned value
   in prose and therefore wins over the artefact; I am recording it because a reader diffing the
   ref against the build will find the difference and think the build is wrong.
2. **The QC subtitle is not italic** (`.wsh-sub` is `font-weight: 400`, no `font-style`). The
   contract draws italic. Phase 1 either adds an additive `italic` flag to `PageHeader` — a shared
   component the header stream owns — or accepts roman and records it. **Leaning to recording it**:
   a style flag on the app's one masthead, added for one page, is how a shared format starts
   forking.
3. **"the Query Centre's drawer shell" does not exist as a shell.** `QueryPanel` is the panel's
   contents. Phase 5 builds `SlideOver` and names the three surfaces that could adopt it.
4. **The Filter and Group panels "built in the drawer round" are the To-do page's own**
   (`TodoFrameMenus.tsx`, mounted through `AnchoredPanel`), not the Query Centre's. Re-hosting them
   means keeping them and changing their TRIGGER to the shared toolbar button — the QC's own
   panels are different components with different contents.
