# Dashboard redesign — "The Settled Desk"

**6 August 2026.** Seven phases, seven commits, all four gates green on each. Design authority:
`design-refs/dashboard-settled-desk.html` (copied in from `07-settled-desk-v3.html` as the first
act of Phase 1 — see §8, it was not in the repo).

---

## 1 · Files changed per phase

| Phase | Commit | Files |
|---|---|---|
| 1 · layout restructure | `dd95ddb` | `Dashboard.tsx`, **+`dashboard/DashboardHero.tsx`**, **−`dashboard/FocusGreeting.tsx`**, `dashboard/DashboardStatsRow.tsx`, `dashboard/dashboardV37.css`, `dashboard/dashboardMobile.test.ts`, +the ref |
| 2 · chrome + tooltip | `73a2173` | **+`dashboard/DeskCard.tsx`**, **+`dashboard/DeskTooltip.tsx`**, **+`dashboard/deskTooltip.css`**, **+`lib/deskTooltip.ts`** (+tests), **+`dashboard/deskChrome.test.tsx`** |
| 3 · sent + responses | `1770ce7` | **+`dashboard/DeskStats.tsx`**, **+`dashboard/deskStats.css`**, `lib/dashboardStats.ts` (+tests), `Dashboard.tsx` |
| 4 · trend + stages | `b2cec34` | `dashboard/DeskStats.tsx`, `deskStats.css`, `lib/dashboardStats.ts` (+tests), **+`dashboard/deskTrend.test.ts`**, `Dashboard.tsx` |
| 5 · agents + contact | `b6c8546` | `dashboard/DeskStats.tsx`, `deskStats.css`, `lib/dashboardStats.ts` (+tests), **+`dashboard/deskAgents.test.ts`**, `Dashboard.tsx` |
| 6 · below-grid | `1a92e36` | **+`dashboard/DeskBelow.tsx`**, **+`dashboard/deskBelow.css`**, **+`lib/deskWeek.ts`** (+tests), `Dashboard.tsx`, `dashboardMobile.test.ts` |
| 7 · to-do tiers | `67adf9a` | **+`dashboard/DeskTodoCard.tsx`**, **+`dashboard/deskTodo.css`**, **+`lib/todoTiers.ts`** (+tests), `Dashboard.tsx`, `todoNotesTasks.test.ts` |

Suite grew 2780 → **2915 passing** across 181 files.

---

## 2 · Recon findings

**Component tree, before → after** (`/dashboard` → `Dashboard.tsx`):

```
BEFORE                                   AFTER
FocusGreeting                            DashboardHero
  ├─ attention chip → focus slot           ├─ date caption · greeting · 4 actions
  ├─ StatMini grid (while open)            └─ DeskTodoCard          (always on)
  └─ OverToYou | StatFocusPanel
sa-stats → StatCardFull ×4               ds-row → QueriesSentCard · ActiveQueriesCard
DiaryCarousel (fortnight)                          · AgentsCard · ResponsesCard
WhatsLivePanel                           db-below → StoryCard | DiaryCard
TimelineDrawer (right-edge)              db-pipe  → PipelineCard
                                         (mobile desk line + to-do doorway unchanged)
```

**Where each stat's numbers come from** — all of `lib/dashboardStats.ts`, pure over the
`useScriptAllyDb()` collections, nothing stored:

| Card | Selectors |
|---|---|
| Queries sent | `weeklySendSeries` · `trailingWeekStarts` · `sendsThisWeek` · **new** `weekQueryRows` |
| Active queries | `activeWeeklySeries` · `activeQueriesOf` · `awaitingReplyCount` · **new** `activeStageBreakdown` |
| Agents | **new** `agentGlyphTone` (over `agentStanding`/`agentTurn`) |
| Responses | `responsesReceivedCount` · `responseRatePercent` · **new** `responseSplit` |

**Agent contact fields:** `Agent.website: string` and `Agent.email: string` — **both required, not
optional**. So "missing" means an *empty string*, never `undefined`, and the dimmed-row branch
tests `.trim()` rather than nullishness. Phase 5's red gate was green.

**Existing tooltip primitive:** `dashboard/StatTooltip.tsx` exports `useHoverShow`, and
`StatHoverPanel.tsx` builds on it. It has no viewport clamping, no flip and no pin, so Phase 2
built `DeskTooltip` alongside rather than extending it; the v37 pair is still consumed by
`DashboardStatsRow`'s remaining renderings.

---

## 3 · The `QueryStatus` mismatch

**The enum is not touched.** Two divergences found, both display-only:

- The ref writes REVISE_RESUBMIT as **"In revision"**; the enum is **`"Revise & Resubmit"`**.
- The ref writes every stage in sentence case ("Partial sent"); the enum is Title Case.

Handled by `STAGE_LABEL: Record<QueryStatus, string>` — the only place the words live. It is locked
**exhaustively** against `Object.values(QueryStatus)`, so a new enum member fails the test rather
than rendering `undefined`, and a deliberate pair of assertions documents the divergence
(`STAGE_LABEL[REVISE_RESUBMIT] !== REVISE_RESUBMIT`). Every row keys off the enum; nothing compares
against a label.

---

## 4 · MountCard, and why there is a local wrapper

**`MountCard`/`MountPanel` could not express this chrome, and were not forked.** They are the
parchment mount: `PAPER_TEXTURE`, 14px radius, `mountShadow`, a burgundy-tinted hairline. The
settled desk's card is a different object — flat `#fffdf9`, a neutral two-stop shadow, 16px radius,
and a sage band across its head. Making one express the other would have meant adding a band, a
pill, a radius override and a shadow override to a **locked** component four other pages consume:
a fork with extra steps.

`DeskCard` is ~50 lines, dashboard-local, and imports nothing from the mounts.

---

## 5 · The timeline drawer

**Unmounted at every width; the component survives on disk.**

The dashboard's mount is gone — and so is its `<md` variant, which the Phase 1 brief did not
anticipate. That is deliberate: the story is the inline `StoryCard` now, which stacks at 1180px and
reads better on a phone than a drawer did. `TimelineDrawer.tsx` remains because `focusSlot.test.ts`
imports its `TIMELINE_PIN_KEY`/`readTimelinePinned` helpers.

Its two `dashboardMobile.test.ts` cases were **kept but relabelled** — they read the file, not the
page, so they still pass while saying nothing about what renders. The relabel is there so nobody
reads them as if they did.

Also now unmounted: `DiaryCarousel` (superseded by `DiaryCard`) and `WhatsLivePanel` (by
`PipelineCard`). Both files remain, with `DiaryLab` still consuming `DiaryCarousel`.

---

## 6 · What the test environment could not verify

`vitest.config.ts` is `environment: 'node'` — **no jsdom, no layout engine**. Everything below is
a browser check, and it is Nick's:

- **Tooltip placement.** The *maths* is a pure function with 7 unit tests (clamp at both edges, the
  wider-than-viewport case, the flip). Whether it looks right against a real anchor is not testable.
- **The pin interaction** — hover preview → 220ms grace → click to pin → outside click / scroll /
  Escape / same-glyph-closes, and one pin at a time. None of it can be driven without a pointer.
  **Worth walking deliberately**, since it has the most states of anything here.
- **Touch.** A tap should pin directly (no hover to preview from). Code-verified only.
- **Focus movement** into a pinned dialog and back to the glyph.
- **Flex min-height chains** — the hero's two columns are `align-items: start`, and the to-do card
  is meant not to out-height the greeting. Real content is the only test.
- **The `<1180px` stack**, where the hero reorders to put the to-do card first.
- **The crosshair's snap** across the trend, and the bar hover's 2px lift.

---

## 7 · Amber items carried forward

- **The `designTokens.ts` burgundy drift is ALREADY RESOLVED** — not carried forward. `index.css`
  records that `--burg-d` was deleted and `designTokens.ts`'s `#6b3023` is now the single source.
  The prompt expected a live drift; there isn't one.
- **No stored-not-derived stat was found.** Every figure on this page derives at read time. No
  Firestore write, field or migration was added — the whole pack is read-only against Firestore.
- **`focusSlot.ts` and its unit tests survive, unused.** Deleting a tested pure module is a
  separate decision from restructuring a layout. Its `TimelineDrawer` import is the only thing
  keeping that file mounted in the graph.
- **`StatMini` / `StatFocusPanel`** in `DashboardStatsRow.tsx` are now unrendered, as is
  `useStatDefs`' `queriesSent`/`active`/`agents`/`responses` visual set. A cleanup commit could
  take them; it would touch `StatHoverPanel` and `StatTooltip` too, which is a pack of its own.

---

## 8 · Told to do, could not

1. **Wrong worktree.** The pack said to work in `/Users/nickphysick/ScriptAlly-il` on `claude-il`.
   **That branch was merged into `main` earlier the same day and retired** — 42 commits behind,
   zero commits of its own (`git merge-base --is-ancestor claude-il main` = true), and the
   dashboard files byte-identical on both. Building there would have repeated the stale-base
   failure CLAUDE.md's Step 0 exists for. Halted at the recon gate as instructed; Nick chose `main`
   in the primary worktree, direct commits, no deploys.
2. **The mockup was not in the repo.** The pack's precondition (`cp … design-refs/dashboard-settled-desk.html`)
   had not been run. I copied it from `~/Downloads/07-settled-desk-v3.html` and committed it with
   Phase 1.
3. **Two of the pack's stated conditions did not hold.** There is **no PaintMode block in
   `App.tsx`** on either branch, so Global Rule 3 had nothing to protect. And the burgundy drift
   was already fixed (§7).
4. **A concurrent session was committing into the same checkout.** Reported mid-pack; Nick
   confirmed the To-do stream would stay clear of `Dashboard.tsx` and `dashboardStats.ts`, and it
   did. Every commit here was staged by explicit path and verified with `git diff --cached` first.
   Worth noting that the gate runs were therefore against a tree containing another stream's WIP —
   green proves my files compile and pass *alongside* theirs, which is the best available claim.
5. **Not deployed**, per Global Rule 5. One dev deploy happened mid-pack at Nick's explicit
   request, from an isolated worktree at HEAD.

## Judgement calls worth a second look

- **The greeting's name is burgundy italic**, which **supersedes a v37 lock** reading "plain
  Playfair, NO italics/colour on the name". The ref and the baked decisions say otherwise and they
  are newer; the CSS records the supersession rather than quietly overwriting it.
- **The agents glyph follows YOUR QUERY, not their door.** The agent list inverts this deliberately
  (colour carries the door there). This card sits beside three others about the state of your
  querying, so a closed agency holding your live full still reads as live. Locked as a fixture.
- **An R&R counts as a *request for more*, not a pass** in the responses split.
- **`responseSplit` reconciles by construction** — `requests + passes + offers + unclassified ===
  total` — so the bar can never quietly sum to less than the figure printed above it.
