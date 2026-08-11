# Community tile + narrowed tasks card — Phase 1

**Pack:** community-tile (4 phases) · **Status:** Phase 1 landed. **Phases 2–4 not started**, awaiting Nick's go-ahead (see *The Blaze finding*).
**Baseline:** tsc 0 · build 0 · vitest **3,970 passed / 2 skipped, 245 files**. **Close:** tsc 0 · build 0 · **3,979 passed / 2 skipped, 246 files**.

---

## Step 0 — recon gate

**All three red gates pass.**

| gate | finding |
|---|---|
| Tasks card sets its own width internally? | **No.** `OneScreenTasks.tsx` declares no width, flex or min-width at all; `.os-tasks` sets only `display/flex-direction/overflow`. Width came entirely from the parent, so narrowing it is a parent-side change. |
| Activity panel's height chain breaks when spanning rows? | **Not applicable — it already spans.** `.os-colR` is a single flex column occupying the whole of grid row 2; Activity is `flex: 1 1 auto` inside it. There was never a second row for it to grow into. **No change made, no scroll chain touched.** Browser-measured after: 402px at 1440×900. |
| Phase 2's schedule conflicts with an existing function? | **No scheduled functions exist.** Only two callables. |

**Other recon, as requested:**

- **Grid:** `.os-content` is `minmax(0,1fr) 287px` / rows `auto minmax(0,1fr)`, column-gap 16. The "upper row" is `.os-midrow`, `grid-template-columns: 302px minmax(0,1fr)`, gap 13. The third column is `.os-colR` at 287px.
- **`User.queryingStage`** — optional, `"starting" | "early" | "deep" | "interest"`.
- **Manuscript genre** — `genre: string`, commented `// primary genre`.
- **Functions Node** — pinned to **20** in `functions/package.json`. The pack's Node 22 note applies to Phase 2's new function; nothing changed here.

### ⚠️ The Blaze finding — the pack's premise is out of date

The pack treats Phases 2–4 as *"gated on Blaze, same blocker as Smart Import"*. **The dev project is already on Blaze.** Two **v2** Cloud Functions are deployed and live in `europe-west2`:

```
extractFromEmail   v2  callable  europe-west2  512  nodejs20
smartImportMap     v2  callable  europe-west2  512  nodejs20
```

Cloud Functions v2 cannot be deployed on Spark, so the billing gate is already open — at least on dev. (CLAUDE.md still records `suggestComps` as "riding the Blaze gate"; that note is stale for dev.)

**I stopped after Phase 1 anyway.** The pack says *"Do not start until Nick confirms Blaze"* — a confirmation gate, not merely a capability check, and Phases 2–4 introduce the app's first cross-user data surface, new Firestore rules and a new user-facing privacy preference. That warrants an explicit go-ahead rather than my inference from a functions list.

### ⚠️ The ref was not supplied

`54-community-tile-row.html` is not on disk. Per the pack's instruction I did **not** substitute the same-numbered `54-*` file, and nothing was committed to `design-refs/`. Phase 1 is built from the prose, with every value derived from the app's own tokens and live cards — which the pack asks for regardless, since the ref was drawn at a 264px sidebar and this app is at 224px.

---

## What Phase 1 does

**The spine is one declaration.** `.os-midrow, .os-lowrow` share a single `grid-template-columns: 302px minmax(0,1fr)`. The Community tile is the author tile's width and tasks is the chart's width *because they read the same rule*, not because two pairs of numbers were matched. Browser-measured at 1440: tile 302 = author 302, tasks 500 = chart 500.

**Tasks narrowed — width only.** Rows, chips, counts, sort and `See all` untouched. `.os-tt` already carried `min-width: 0` and `.os-tn` already had `text-overflow: ellipsis`, so titles ellipsise at the new width rather than pushing the row wide; nothing needed adding.

**Height ownership.** The 118–318 budget moved from `.os-colM .os-tasks` to `.os-lowrow` — the row is now the thing with a height and the tile fills it via `margin-top: auto` on a footer region. Measured: **tile 302×147, tasks 500×147** — the tile is *not* the taller card, so no tile density had to be cut.

**The tile** renders the empty state, always, and fetches nothing. Verbatim copy, locked. Sage band, monoline two-person mark, `BETA` chip.

---

## Three faults I introduced and fixed

Recorded because two of them are traps this codebase already documents, and I walked into both.

1. **⚠️ I appended CSS below the reduced-motion blanket.** That sheet's own banner says *"THIS BLOCK MUST STAY LAST — anything added below it is silently exempt"*, and `motionPolish.test` caught it. The Community rules would have been exempt from reduced motion with nothing visibly wrong. Block moved above the blanket.
2. **⚠️ Moving it split a comment.** The banner's second paragraph was orphaned, leaving a dangling fragment — the malformed-comment trap CLAUDE.md records as *swallowing tokens silently*. Here esbuild warned rather than swallowing, but the repair was the same: reunite the comment, verify **0 css-syntax-errors**.
3. **I overrode the band's geometry.** My first `.os-commhead` restated `height: 44px; padding: 0 14px`; being later in the sheet it *won*, rendering the Community band 7px shorter than every other band. Geometry handed back to `.os-ahead`; all three bands now measure **51px**. Locked against recurrence.

Plus two test-authoring slips of the same family as the code ones: the appraisal guard matched `os-ahead` (the shared band's class) and failed on the word "ahead" inside an identifier — it now checks *prose* (quoted literals containing a space), not raw source; and `rule(".os-lowrow")` matched inside the shared selector `.os-midrow, .os-lowrow {`, so height assertions ran against the columns rule. Both now anchor on a line start. **The same anchor trap, three times in one session.**

---

## Locks

`oneScreenCommunity.test.tsx` (9) — verbatim copy; band + BETA chip; **Phase 1 fetches nothing** (no db hook, no `collection(`, no `aggregate`); the shared-spine rule with no second width set; the footer's `margin-top: auto`; the band declaring no geometry.

**The appraisal law is locked now, before the data exists**, because this tile is where it breaks first: no adjective of judgement, no ranking or percentile framing, no value-dependent colour class — asserted across the whole component so a Phase 3 that adds "you're ahead" fails here rather than in review. **Verified red**: an appraisal sentence dropped into the tile fails 2 assertions.

Two existing smoke locks retargeted, both because rules moved rather than changed: the midrow's squareness now reads columns from the shared rule and height from its own; the 118–318 budget now reads `.os-lowrow`.

---

## Phases 2–4 — not started, and what to weigh first

Beyond Blaze confirmation, these are worth a decision rather than a green light:

- **It is the app's first cross-user surface.** Every Firestore read today is scoped to one user. The pack's constraints are right (precomputed aggregates only, quantiles-and-count, k-anonymity at 30, `write: false`), and they are the deliverable rather than a wrapper around it.
- **The opt-out is a new user-facing preference** and needs a line in privacy copy before launch — cheap now, expensive to retrofit, as the pack says.
- **Node 22 for the new function**, against the repo's pinned 20. Worth deciding whether the two existing functions move too, rather than running a split runtime.
- **Cost**: a nightly function reading queries across all users is the first unbounded-ish read in the app. Worth a glance at expected document counts before it runs unattended.

Pre-launch there is no cohort, so Phase 1's empty state is the real state — the layout improvement stands on its own, which is what the pack intended.
