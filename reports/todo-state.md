# To-do page — state at parking, 16 Aug 2026

One document, written to be picked up cold. Everything below is either **walked** (measured on the
deployed dev site through Playwright, signed in), **locked** (unit tests only — the code was
written, not proved to run), or **neither**, and each claim says which.

- **Branch:** `main`, clean, level. Last commit `d495ac9`.
- **Deployed to dev:** yes — asset hash `index-B07u44WK.js`, confirmed against
  `https://scriptally-dev.web.app`. **Prod: untouched.**
- **Suite:** 5197 passed | 2 skipped. tsc + production build green.
- **This session's range:** `20e16d2` → `d495ac9` (ref + six items).
- **Harness account:** `tests/e2e/` — 12 rail rows (1 offer, 2 sends, 1 R&R, 5 chases, 2 closes,
  1 grouped housekeeping row of 12 wish lists).

---

## 1 · What works on dev today — verified by a walk

Each of these was measured on the rendered page, not inferred from a passing test.

### The task card is white, and the pane fits

`reports/pane/todo-white-card.png`. Body ground `rgb(255, 255, 255)` — **read off the Query
Centre's rendered Tracking panel, not off `.f12-card`'s declaration**, and the two differ:
`.f12-card` declares `var(--panel)` (`#fffdfb`), but `.qp-cols .f12-card` overrides it to
`var(--white)` and is more specific. The burgundy inset frame is gone; band and footer are flush.

Bottom gap **32px**, identical to the Query Centre's, asserted against each other rather than
against `32`. Card height **618px** at 1920 — 32px short of the 650 target, and that 32px is the
position row (28px + its 10px gap), which the ref draws as furniture above the card.

*Instrument: `tests/e2e/qcPanel.measure.ts`, `tests/e2e/todoShot.measure.ts`.*

### The sticky group band

`reports/pane/sticky-band.png`. Computed on the deployed page: `box-shadow: rgb(255,255,255) 0 7px 0`
on `.tdg-shd`, `scroll-padding-top: 38px` on `.tpl-zone:has(.tdg)`. The fill was **already** opaque
before this session — neither of the two hypotheses in the brief was the fault.

⚠️ **The shadow is verified by computed value, not by a hit probe, and that is deliberate.**
`elementsFromPoint` hit-tests; a `box-shadow` is paint with no hit area, so probing the strip under
the band reports the row underneath whether the shadow covers it or not. It would give a confident
wrong answer in either direction.

*Instrument: `tests/e2e/stickyBand.measure.ts`.*

### The group sweep

`reports/pane/group-sweep-answered.png`. **A group row docks — it could not before.** Walked end to
end short of the write: the wish-list cohort opens with 12 rows, nothing pre-selected, commit
disabled, hint "Nothing recorded yet."; answering one row moves the bar to `1 of 12`, the hint to
"1 answered · the rest stay on your list", the primary to "Record 1 answer". The card's own footer
stands down — one primary on the card.

**Stopped before the commit.** Pressing it runs `updateAgent` against real agents.

Two faults here were found *only* by measuring:
- the progress bar rendered **`7x0`** — it is a `<span>`, and an inline element ignores `height`, so
  the fill was present, correct at `8.33333%`, and invisible. The text above it read fine.
- the band motif drew straight across the figure. Fixed with the facts strip's own tokens:
  `position: relative` (a static element takes no z-index) **plus** a padding reserving the motif's
  box, because stacking is not clearance. Probed with the rect proved on screen first — an
  off-screen `elementsFromPoint` returns `[]` and would have satisfied the assertion by returning
  nothing.

*Instrument: `tests/e2e/groupSweep.measure.ts`.*

### The group row's second line

Walked as part of the sweep: the row reads `12 wish lists / 12 agents have no wish list`. It said
`Housekeeping` — the word already printed on the band above it, in the slot where every other row
puts the agent. The sentence is `HK_RULES[rule].title(n)`, the rule's own, not a second vocabulary.

### The dock's identity, partially

**Walked:** the fix row now docks (`sel` lands on the Fix row, confirmed before anything else was
measured). **Locked only:** the dock renders the card it is given rather than re-finding it, and
`resolveDocked` holds a card narrowed out of the view. See §3 — the case these were built for is
the one that cannot be walked without a write.

---

## 2 · Built but unwalked — the per-agent `fix` journey

**Landed (code + unit) at `7df74c5`. Never walked, in three consecutive attempts.**

What it is: the sixth journey, and the only one whose step stack is **derived** rather than
declared. `JOURNEY_STEPS.fix` is deliberately `[]`; `fixSteps(agentDataQualityNeeds(agent))` builds
it, from the same function that raised the card. One gap, one question. Three editors —
`responseTimeWeeks` (carrying "no reply means no" as a clause, not a step), `materialsWanted`,
`mswlNotes` — committing through one `updateAgent`, then `resolveTaskFlag`, in that order.

### The blocker

**Every data-quality gap on the harness account belongs to a group.** `groupHousekeeping` collects
per-rule cohorts, so the account's only `fix` row is the grouped "12 wish lists". Before Item 4 that
row docked *nothing* (`openDock` correctly refuses an unknown key). After Item 4 it docks the
**sweep** — which is the right surface for a cohort, and therefore still not the journey.

The journey needs an **individual** `fix` card: an agent whose gap is not part of a group. This
account cannot produce one. Reaching it needs either a rule muted for the account (a write to the
user doc) or an agent whose gap is genuinely ungrouped.

### The false walk it produced first

Worth recording because it nearly shipped as a result. The first harness clicked the Fix row,
measured a journey, and reported it — reading back the **offer's** hint ("Three ways to answer
this"). Clicking an undockable row leaves the pane where it was and the click looks like it worked;
only asserting the step *titles* against the fix's three exposed it. The harness now checks which
row carries `sel` **before** measuring anything.

---

## 3 · The recorded view — not built

Item 6's second half. The re-rooting landed (`cf97da7`); the recorded view did not.

### Why it needs a nominated card

The state it renders only exists **after a commit**, and the commit is a real `updateQueryStatus` /
`recordMaterialsSent` against your data. There is no write-free reproduction that reaches the same
code path — see below, that was checked and the check failed. So: **nominate a card** you are happy
to have a real send recorded against, and this is a short piece.

### The three mechanisms that re-point the pane

The important finding, and it corrects an earlier one of mine. I reported that narrowing the rail
stood in as a write-free reproduction of the post-commit swap. **It does not.** There are three
independent mechanisms, each of which alone re-points the pane, and fixing any one looked like it
should have worked:

| # | Site | What it does | State |
|---|---|---|---|
| 1 | `src/components/todo/TodoDock.tsx:178` (pre-fix; the prop is now at `:108`) | `queue.find((c) => c.key === activeKey) ?? queue[0]` — the dock resolved its own identity and fell to the first remaining task | **Fixed** `cf97da7`. The card is now a required prop; the page owns identity. |
| 2 | `src/lib/todoDock.ts:214` `resolveDocked` | Advanced by remembered position whenever the key left `queue`, unable to tell *gone from the view* from *gone from the work* | **Fixed** `cf97da7`. Takes the unnarrowed set as an optional discriminator; every existing caller byte-identical without it. |
| 3 | `src/components/todo/ToDoPage.tsx:752` | `setDockKey(narrowed ? dockable[0].key : (docked.card?.key ?? dockable[0].key))` — an explicit effect jumping to the first visible card on a narrowing | **Not touched.** Deliberate line, product call. |

⚠️ **(3) contradicts the page's own hold rule fifty-odd lines up.** `ToDoPage.tsx:698` says a rail
narrowed to nothing beside a pane still showing your card is *the correct pair*; the effect
overrules it. Two documented intentions in one file. Which one is wanted is yours to say.

⚠️ **And (3) governs the narrowing path only.** A commit takes the *other* branch of that ternary
(`narrowSig` unchanged, `dockSig` changed), which is why the narrowing reproduction is not a proxy
and why the commit path needs a live write.

### What the recorded view should be, reasoned from the derivations

Held for whoever builds it, so the reasoning is not redone:

- **Keyed on the query, not the card.** `cardBucket` keys on `taskType`; after a send commits, the
  card leaves the board entirely, so a card-keyed view is stale by construction.
- **The timeline updates for free.** `dockRows` is `useDockActivity(uid, paneCard?.relatedRecordId)`
  — the authoritative per-query subcollection. Once the pane holds the committed card, the new
  activity arrives through the existing listener; nothing new to derive.
- **The stats read the new state already.** `figureFor` looks the query up live; only the card's
  identity fields are frozen, and those do not change.
- **The burgundy entry** wants a commit timestamp stored alongside the held card, so rungs at or
  after it can be marked — not "the last rung", which is a guess that breaks on a same-second write.
- **Footer:** Undo + a single `Next task`. Nothing advances on its own — which means (3) above must
  not fire, so whatever is decided there is a precondition for this, not an aside.

---

## 4 · `found.md`, ranked by what would bite a real user first

⚠️ **`found.md`'s own line numbers are stale where this session's edits shifted the files** — it
records them as they were when each was found. The numbers in §3 and §4 of this document were
re-checked against the tree at `d495ac9` and are the ones to trust.

`reports/found.md` is the running log. Below are the five added this session plus the two resolved,
each with a severity call. **Ranked worst-first for a real user, not in the order they were found.**

### 1 — The rail's list and the pane's queue are two different derivations · **HIGH**
The rail draws `railGroups()` off `boardCols`; the pane walks `dockAllCards()` off `board`. On the
harness account the rail showed **12 rows** while the pane's position line read **`TASK 1 OF 23`**.
A writer walking the pane with prev/next passes through cards that are not in the list in front of
them, and the counter tells them a number the page contradicts. Item 4 added the sweeps and removed
their members, which narrows the gap without closing it. **This is the one I would fix first** — it
is visible on every visit, it makes the page's own numbers disagree, and it violates the standing
rule that the pane walks exactly what you were looking at.

### 2 — `ToDoPage.tsx:752` contradicts the hold rule at `ToDoPage.tsx:698` · **MEDIUM-HIGH**
Narrow the list while working on a card and the pane silently swaps to a different one. Measured:
Joan Whitfield → Ana Duarte, with no action taken on the pane. A writer who searches to look
something up loses their place. It reads as a bug even though the line is deliberate — which is
exactly why it needs a decision rather than a fix.

### 3 — `FocusFlow.tsx:77` offers **Full Manuscript** as an agent material · **MEDIUM**
The standing law excludes it, and `agentMaterials.ts` strips it on every Materials commit. So the
housekeeping sheet offers a chip whose value the next Materials save deletes — the writer records
something, it is accepted, and it later vanishes with nothing said. Data-losing, but only on a path
a writer has to choose, and only for one of four chips.

### 4 — The `fix` journey is unreachable on this account · **MEDIUM (unknown on real data)**
Fully covered in §2. Severity depends entirely on whether real accounts produce ungrouped `fix`
cards; if they never do, the journey is dead code and the sweep is the whole answer. **That is worth
finding out before more is built on it.**

### 5 — `ToDoPage.tsx:617` `hkTop` is built and never read · **LOW**
An array reassembled every render, its head comment describing consumers that both retired. No user
impact; costs a little work per render and misleads the next reader. Cheap to delete.

### Resolved this session
- ~~`TodoDock.tsx:178` — the page and the dock hold different cards after a commit~~ — **fixed**
  `cf97da7` (mechanism 1 above). The *symptom* can still occur via mechanism 3.
- ~~`.tdb-nc-save` and `.sa-dp-day.sel` burgundy button fills~~ — **fixed** `0f5214f`. The
  observation stands: this was the same fault in `BrandDatePicker` that `RecordingCalendar` already
  had, which is one more argument for the replace-`BrandDatePicker` question that component's own
  header defers.

Older live entries in `found.md` (the `.cal-*` prefix shared by two unrelated surfaces, the
`.tdb-revlink` weekly-review entry point, the "date needed" affordance with no home, `.tdw-cbic`'s
misnomer) are unchanged and none of them regressed.

---

## 5 · Queued outside this page

### `formatLegacyMaterial` invents numbers — and there are **three**, not one
`src/lib/materials.ts:32`. The fallbacks are `numStr || "50"` (pages), `|| "3"` (chapters) and
`|| "3,000"` (words). A legacy string that says "pages" with no number renders **"First 50 pages"** —
a specific quantity the record does not carry, shown to a writer who may then send 50 pages because
the app said so. The honest render is the unquantified label ("Sample pages") or the raw string.
**Severity: HIGH if any real query carries an unquantified legacy material** — it is the only one of
these three that can put a wrong instruction in front of a writer. Worth a data check first: count
live queries whose `materialsWanted` holds a bare "pages"/"chapters"/"words" string.

### The import delete's discriminator is an id prefix
`src/lib/smartImportCommit.ts:211`. **The scoping itself has landed** — the re-import delete is
`existing.docs.filter((d) => d.id.startsWith("imp-"))`, so a re-import no longer destroys recorded
history. What is queued is **promoting the discriminator to a stored field**: `imp-` is durable
because it *is* the document id, but nothing in `firestore.rules` validates it, nothing stops a
future writer minting one, and it carries no reason with it. The file already states the target
shape — `source: "import"` on every import-written rung. **Severity: LOW today, HIGH if anything
else ever mints an `imp-` id.** The failure mode is silent deletion of a writer's own history.
⚠️ Note also recorded in place: `dateProvisional` is *not* a sufficient discriminator — it is set
only on the undated subset, so scoping to it would leave dated import rungs undeletable and they
would duplicate on every re-import.

### Duplicate rungs are suppressed at read, not superseded at write
`dropSupersededProvisional` (`src/lib/queryDerivation.ts:219`) is applied in `recomputeQuery.ts:89`
and in the dock's timeline, so the derivation and both display surfaces agree. **But both documents
are still in Firestore.** Every re-import adds another, the collection grows, and any future reader
that does not know to call the filter sees the duplicates. The queued work is collapsing at write
time so the store matches what every surface shows. **Severity: LOW now, and rising with each
re-import.** Not urgent; it is a tidiness-and-trust problem rather than a wrong-answer problem,
because the one derivation that matters already filters.

---

## 6 · Things I think are wrong that you did not ask about

Ordered by how much I would want them looked at.

1. **Item 2's trio was never reproduced, so the fault you saw may still be there.** I walked every
   card on the harness account: all twelve render exactly two tiles, and no `ADDED` tile appears
   anywhere. `bandFacts` returns at most two by construction, and I traced both paths that can emit
   the word. What landed is the *rule* — an agent card cannot show an `Added` tile — which is true
   by construction on whichever card produces it. **But if your Tom Ellery card still shows three
   tiles, the third has a source I did not find, and the fix will not have touched it.** Please
   check that specific card.

2. **`--tdg-band-h: 31px` is a literal matched to a measurement.** I introduced it. The scroller's
   reserve is derived from it, and the band's `min-height` reads it — so the two cannot drift from
   *each other*. But if the band's font, padding or line-height changes, its real height moves and
   the token silently stops describing it. The unit lock pins the number, which is the wrong
   instrument: it would need a measurement lock asserting the rendered band's height equals the
   reserve. I did not add one.

3. **`PaneSweep` renders every member with no cap.** Twelve is comfortable; a cohort of two hundred
   renders two hundred rows into one scroller with no virtualisation and no "show more". The sweep
   is precisely the surface that attracts large cohorts, and the ref's own note is about sixteen.
   Worth a cap-plus-count before this meets an imported database.

4. **The sweep's commit reports a number but loses the identity of a failure.** If eleven of twelve
   writes land, the toast says "Recorded 11 · 1 still without a wish list" — honest about the count,
   silent about *which* agent did not save, and the sweep's local answers are gone by then. A writer
   cannot tell a skip from a failure afterwards. The count is right; the recovery path is missing.

5. **`sweepFields` replaces `materialsWanted` rather than merging.** Safe today because the sweep
   only ever shows agents whose list is empty — but the write is a whole-field replacement, so if
   the cohort's membership rule ever loosens to "incomplete" rather than "absent", it would silently
   discard what was there. The guard is the membership rule, and nothing states that dependency.

6. **The `fix` journey's commit offers no undo, deliberately, and the card is gone by then.** The
   other four journeys undo by restoring a query's previous status; here the previous state is an
   *absent field*, and `deleteField()` over three fields the writer may have edited elsewhere is not
   an undo. I stand by the decision. What I am less sure of is that the writer is told: the toast
   says "Saved to the profile." and the route back — the agent's own editor — is not named.

7. **`.psw-*` restates `.pj-*`'s footer values rather than sharing them.** I chose restatement on
   purpose (sharing would couple two surfaces that merely look alike today), and I still think that
   is right, but it *is* duplication and it will drift. If a third pinned footer appears, that is
   the moment to extract one — not before.

8. **The sweep's progress bar resets to zero on every open, by design, and this may read oddly.**
   Answer five, commit, reopen: the cohort is now seven and the bar says `0 of 7`. That is honest —
   the previous pass's answers are saved and are not part of this one — but a writer may read it as
   lost work. Worth your eye on the real thing before it is defended.

9. **Three existing locks pinned expressions rather than rules, and all three went red on correct
   changes.** The dock's exact queue literal, the scroller's exact ternary, the footer's exact
   guard. I rewrote each to state its invariant, and replaced a `slice(…, +300)` in
   `todoListChrome.test.ts` with a bounded `sliceBetween` on the way past. I mention it because the
   pattern is almost certainly not confined to those three, and a lock that fails on a correct
   change costs the same as one that passes on a wrong one.
