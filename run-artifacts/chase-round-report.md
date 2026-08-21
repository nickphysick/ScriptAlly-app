# The chase round — the deed, the story, the tile, the ticks

`5273baa7` · `dec6e2ef` · `34dcb3eb` · `9a414a57` · `1cabff7a`. Measured at 1440 against a local
`vite preview` of a dev build of this branch, signed in as the harness account. Screenshots in
`reports/chase-round/`.

---

## Phase 4's cause, first — it is one wrong string

**`BulkFillTable` named its first tick column's key `"letter"`. The model's key is `queryLetter`.**

So `r.rows.find(x => x.key === "letter")` returned `undefined` on every row — the cell rendered
unticked — and `toggle` mapped the row array looking for a key nothing carried, produced an
**identical array**, and handed it back through `onChange`. No error, no state change, no clue.

That is exactly why a real pointer click left `aria-pressed="false"` at 80, 250, 600, 1200 and
2500 ms: it never flipped, and was not being wiped either. **That signature — never flips, never
reverts — is a handler that ran and had nothing to change**, and it is worth recognising, because it
looks identical to an unbound handler and has a completely different cause.

The primary read "Log 0 queries" for ever, so the cohort journey could not be completed at all,
since `c147de53`.

**The fix is the TYPE, not the string.** `TICKS` is typed `MaterialRow["key"]`, so the fault no
longer compiles — verified by reinstating it and reading

```
Type '"letter"' is not assignable to type '"other" | "synopsis" | "queryLetter" | "sample"'.
```

A string literal in a column table can be wrong in a way that **renders**, which is the worst kind.

**The brief asked whether the other two cells share it. They do not, and it was checked rather than
assumed:** the sample cell matches on `kind === "qty"` and the free-text input on `key === "other"`,
both real. Only this list restated a key.

`toggleRowMaterial` now lives in `materialsSweep`, where it is tested against the real row builder —
because the reason nothing caught this is that the only way to ask whether a tick reached the model
was to click one in a browser.

**Measured, 9/9** (`run-artifacts/popup-bulk.txt`): a real Playwright click flips `aria-pressed` at
120 ms and still holds at 2.6 s; the primary reads "Log 1 query" then "Log 2 queries" and is
enabled; the strip tracks with "materials on 2 queries"; pressing writes and offers Undo; nothing
opens over the page.

---

## False premises

**1. Mine, in last night's report: "the cohort table's ticks are inert."** They were not. `synopsis`
is a real key and **that column always worked**. I measured `.first()` — the broken one — and wrote
a whole-table verdict from a single control. The table was two-thirds alive.

**2. The brief: "The deed round wrote sentence templates for Send, Close, Fill-in and Note, and none
for Chase."** `decide` had none either. Templating it was out of scope and would have put a second
sentence about one act on one screen, so it keeps the short deed and now **says so** in `DEED_FORM`,
exhaustive and closed with `never`.

**3. The repo's own claim that the deed identity assertion "actually protects this."** It compared
`bandDeed` with `listDeed` — both one-line aliases for `taskDeed`, so it compared a function with
itself — while the band renders `deedSentence`, which was never in it. `bandDeed` had **no renderer
anywhere in `src/`**. Deleted; the assertion is retargeted at the pair the page draws.

**4. Mine, four rounds old, in every probe I have written: `\s` inside a template literal collapses
to the letter `s`.** So `.replace(/\s+/g, " ")` compiled into *"replace every s with a space"*, and
every report I have produced reads "No re pon e from Ro alind Vale". Prefix comparisons still
passed, so it read as a font quirk — until the first assertion that matched a word containing an s
failed, about a page that was correct. Fixed here and in `popupRound.measure.ts`.

**5. Mine, in Phase 4's own key census: `sliceBetween(src, "const TICKS:", "];")` closed on the type
annotation**, because `MaterialRow["key"];` contains `];`. It scanned an empty block and the
population floor caught it. Bounded on the line instead.

---

## Phase 1 — the chase deed names the agent · `5273baa7`

`Nudge {Agent} at {Agency} about {Title}`, degrading by **dropping**: no agency loses " at …", no
agent leans on the agency, neither leaves **"them"** — the app's own pronoun for an agent whose
pronouns it does not store and never asks for. Never a placeholder: the row's "no agency" and "agent
not specified" hold a LIST column's shape, and putting them in a sentence would state an absence as
though it were a name. The row keeps its summary; the band is the sentence, and the two now differ
on purpose.

**On the page:** `Nudge *Tobias Quint* at *Quint Literary* about *The Quiet Fixture*`, italic in the
heading's own ink, beside a row still reading "Worth a nudge" (`reports/chase-round/pane-chase.png`).

Red-before: removing the template fails four cases; declaring `decide` as `sentence` fails two.

## Phase 2 — the chase story shows the story · `dec6e2ef`

**Cause:** `users/{uid}/activities` is a **projection**; `users/{uid}/queries/{id}/activity` is the
authoritative log, and the story column reads the log. `addQuery` wrote every seeded entry to the
projection and only the **advanced** one to the log — so `QUERY_SENT` reached the feed and never the
record, and every card's story opened with no beginning. The Query Centre reads the feed, which is
why the same query looked complete three inches away: the exact disagreement `useDockActivity`'s own
header describes, still live.

Fixed where the data is assembled: **one loop writes both stores for every entry**. That is the
shape of the fix, not a detail — two `setDoc`s in separate blocks is what produced this, both
present, one iterating a filtered subset. The recompute keeps its advanced-seed guard.

**On the page:** chase reads `Query sent · 22 Jun · via email` then `Your turn · Today`; close reads
`Query sent · 17 Jul · via email` then its terminus. Both PASS.

**The fixture was half the symptom and had to be told apart from the fault.** `seedThinCases.mjs`
wrote queries and no activity at all, which looks identical on screen. It now writes both stores in
the app's own two shapes, seeds `responseDeadline` (which the chase derivation reads and no fixture
had written), and its `--clean` reaches the per-query subcollections — **deleting a query does not
delete them**, so every previous run left orphans on a shared account.

**The one Fix card still showing a single rung is a pre-existing query with no log** — created
before this fix. Stated rather than folded in.

## Phase 3 — "Sent previously" is reading the record · `34dcb3eb`

**The tile is correct and nothing changed.** `formatQueryMaterials` maps every item through the one
formatter and joins them; no cap, no first-item selection, and the call site hands over
`q.materialsWanted` untouched. Measured against a seeded query storing two materials, the tile read
`Covering letter · Synopsis` — both present, "Query letter" rendered through the formatter's own
vocabulary. **So a card reading "Synopsis" alone is a query whose recorded materials are exactly
that.**

What the commit adds is the assertion, because "the data is right" decays. The **count** is asserted
rather than the presence of a name — a truncation keeps the early items and reads perfectly
plausibly — and the call site is asserted to do no `.slice`, `.join`, `.map` or `[0]` of its own,
which the unit assertions could never see.

Confirmed in passing, since it looked like a naming split and is not: **"Covering letter" is the
formatter's display name for the stored token "Query letter"**, and the cohort table's column head
uses the same word. One artefact, one name.

## Phase 4 — the cohort table's ticks respond · `9a414a57`

Cause at the top. Red-before at the seam: pointing the toggle back at `"letter"` fails four cases,
including the write set — `sweepWrites` returning exactly the ticked rows is the assertion that
would have caught the whole thing from one end.

## The fixture's own sweep · `1cabff7a`

**No Chase row existed on the account at all**, and the derivation was right the whole time. The app
derives flag ids from the task's fields, so a nudge on `thin-q-chase` is
`nudge_overdue__q_thin-q-chase__a___r_` — which does **not begin** with the fixture's prefix. Every
run removed the fixture's flags and left the app's, and each freshly seeded query arrived already
suppressed. `contains`, not `startsWith`. Census went from `{Decide:2, Close:4, Fix:28, Note:4}` to
the same plus `Chase:2`, and the whole of Phase 1 and Phase 2 became visible on one card.

---

## Concurrency

This session owned the pane, the board derivation, `BulkFillTable` and the To-do fixture. It touched
nothing in the header or packages.

Two other sessions were committing to `main` throughout, and both left red in the shared tree at
times: the packages session's uncommitted `MaterialsBand`/`RemovePopover` WIP reds
`materialsBand.test.ts`, and the comps session's page reds `workspacePageGrid.test.tsx` with
"Comparable titles stopped rendering a masthead". **Neither is mine**, and every gate was therefore
run in an isolated worktree at the tree's own HEAD. Their files were staged into the shared index
more than once during the round; `--only` with the file-count check kept them out of all five
commits.

## What was not resolved

- **No Send row** on the account, so that journey's story is measured only through Close and Chase.
- The `Fix` card with no resolvable agent renders a one-rung story, correctly — it has no log.
- The fixture now writes real logs, which changes what the harness account looks like; running
  `node tests/e2e/seedThinCases.mjs --clean` removes them and restores the `no_response_close` mute.
