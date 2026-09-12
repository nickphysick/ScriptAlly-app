# Empty states — Dashboard, Query Centre, Contact list

Four phases, from `design-refs/scriptally-empty-states-v2.html` (Dashboard) and
`design-refs/scriptally-empty-states-v3-feature-led.html` (Query Centre, Contact list). Both refs
are now enrolled in `design-refs/.refhashes.json`, so a build fails if either file's content changes
while its name does not.

| Phase | SHA | What landed |
|---|---|---|
| 1 · Dashboard | `f0a2368c` | Faded populated example + centred CTA in the Active-queries panel; caveat lines under the three zero counters; five derived getting-started deeds in the to-do card; ghost tail under the activity feed. Community panel untouched. |
| 2 · Query Centre | `6cae2a2c` | Hero with an example query card, four feature rows, closing ask. `QueryEmptyCard`'s `first` variant retired in the same commit. |
| 3 · Contact list | `a87e7447` | Hero with a complete example record, two feature rows, closing ask. The six-row band and the three stage plates retired. |
| 4 · Landing route | `9b1cc947` | **No routing change** — the premise is false. The default already resolves to Dashboard; the lock states the distinction. |
| — · Refs | `cf55dc61` | Both refs enrolled in the staleness watchlist. |

Gates at close: `tsc` clean · `npm run build:dev` exit 0, grepped clean, both build guards green ·
Vitest **7,914 passed / 1 failed**. The one red is `src/lib/correctionPreview.test.ts:170`, a
date-boundary assertion (`27 Jun 2026` vs `26 Jun 2026`) that was **already red on `main` before
this pack began** and whose subject no commit here touches.

---

## False premises, named first

**1 · The dashboard's empty state is zero QUERIES, not `runStage === "day-one"`.** `runStage`
returns day-one only with no queries **and** no manuscripts. The v2 ref is plainly drawn for an
account that has a book: its manuscript card is populated and its first getting-started deed renders
done, naming the title. Gated on day-one, none of Phase 1 would have reached the commonest first-run
state there is — a writer who has added their manuscript and not yet written to anybody.

**2 · The `materials` deed names three things and the model carries two.** "Add your query letter,
synopsis and opening sample" — `PACKAGE_MATERIALS` is Query Letter and Synopsis. Sample pages was
retired as a package material (D9: the portion that actually went is the agency's decision, recorded
on the query). The wording is the ref's and is **Nick's to settle**; the done-state reads that
constant itself rather than a list of its own, so restoring sample pages to it makes the deed follow
with no edit here.

**3 · The v3 ref heads a group "Idle · 3" and draws two cards under it.** Every drawn count in both
phases is derived from its own list's length, so the Contact list's picture reads "Idle · 2". Adding
a third card is one entry in `CLE_GROUPS` if the 3 was intended.

**4 · The v3 ref's legend inverts the app's colour grammar.** Its chart legend reads "Awaiting
reply" against the PINK band, where pink is `--state-you` — material the writer owes. The example
uses `STATE_TOKEN` / `BAND_LABEL` instead; the ref's palette *is* this app's to the digit, so only
the names differ.

**5 · The v3 ref genders an agent.** Its add-inline button reads "Add her wishlist" about a name this
app stores no pronouns for. Rendered as "their", per the house law, with a lock asserting the
deviation so it cannot be "corrected" back to the artefact.

**6 · Phase 0.5 was not needed.** All three pages already separate loading from empty on
`collectionsReady` — per-card skeletons, a `showSkeleton` floor, and a three-way
`blank | settling | list`.

**7 · Phase 4's landing-route fix is not a fix.** See below.

---

## Phase 4 — Step 0.4 findings, and what changed

**Nothing in the router changed.** `App.tsx` and `Onboarding.tsx` are byte-identical to the pack's
starting point.

A first-ever load with empty persistence resolves to `/dashboard` through every route that can
decide it: `pathFor`'s `default` (`App.tsx:365`), the unknown-path guard (`:614`), and the post-auth
guard on a marketing route (`:553`). **No last-visited route is stored anywhere in `src/`** — the
only per-route memory is scroll position — so the conditional half of the asked-for fix
("rehydrate only if a route was genuinely stored") has no mechanism to guard.

What actually puts a new account on the Contact list is **five deliberate call sites**.
`Onboarding.tsx` writes `sessionStorage["scriptally_post_onboarding_tab"]` on five exits, three of
them to `"agents"` — Branch A's ready-to-query (`:281`) and still-writing (`:290`) exits, and Branch
B's manual add (`:414`). The code argues for them in its own words: *"Onboarding ends where the real
work starts"*, *"research-first, no query pipeline yet"*, and at the fifth writer *"Dashboard is the
absence of a hatch."*

That is a product decision about where onboarding lets go, not a router bug, and changing it is
outside this pack's do-not-touch list. **Open for Nick:** whether Branch A should still finish on the
Contact list. `src/lib/landingRoute.test.ts` locks the default so the next person told "new accounts
land on the wrong page" can read which half is true.

---

## Populated views — byte-identical, and proved by diff rather than snapshot

A diff fact is stronger than a snapshot here because it covers every populated branch, not just the
one that renders in a node test. Across all four phases these are byte-identical to
`f0a2368c~1`:

`StatusDot.tsx` · `queryCardFacts.ts` · `chartBands.ts` · `QueryPanel.tsx` · `QueryListView.tsx` ·
`IlloSlot.tsx` · `AgentCard.tsx` · `TaskTicket.tsx` · `todoColumns.ts` · `oneScreen.ts` · `App.tsx` ·
`Onboarding.tsx` · `manuscriptPackages.ts` · `comps.ts`

The three page files carry only empty-branch hunks: `Queries.tsx` **2 hunks** (an import line and the
`emptyKind === "first"` branch), `AgentList.tsx` **1 hunk** (the importer prop), `Dashboard.tsx`
**2 hunks** (destructuring `versions` and passing it down).

Every new CSS rule sits behind a class the populated page never emits, and `dashEmptyState.test.tsx`
asserts each one absent from a render with one query on it.

---

## Copied rather than reused, and why

**Reused, with no change to the shared component:** `StatusDot` draws every dot in both feature
pages. The house law is that every status renders through it and that a legend renders the actual
component — which matters most on the one surface whose subject *is* what the dots mean. Its props
(`status` / `overrideSize` / `decorative`) covered the illustrations; a lock asserts it gained no
empty-state prop. `STATE_TOKEN`, `BAND_LABEL`, `PACKAGE_MATERIALS` and `manuscriptComps` are
likewise imported, never restated, so a picture cannot drift from the populated page.

**Copied, because reuse would have cost a shared component:**

- *The example cards, list rows, board stubs and calendar bars.* Each real component takes a `Query`
  or a derived `CardFacts`, so reuse needed either an example-shaped input — the fabricated-value
  fault — or a "sample" prop on a shared component.
- *The drawn frequency chips and range capsule.* They wear the real containers' classes
  (`.os-freqchips`, `.os-brush`); only the inner span needed a rule, because `.os-freqchips button`
  cannot match a span. Spans rather than disabled buttons: a `<button>` in an `aria-hidden` subtree
  is still keyboard-focusable unless somebody remembers `tabindex="-1"`.
- *The Contact list's structure classes.* A parallel implementation of the Query Centre's grammar,
  following that file's own precedent ("the two pages differ by a value, never by a mechanism"). They
  sit under different token layers — `.aglist`'s `--agl-*` against the Query Centre's `--n*` ramp —
  and a shared primitive would have to be parameterised over both.

---

## Deferred and open — named, not left in a comment

1. **`emptyStateSpacing.measure.ts` and `contactEmpty.measure.ts` have not been run since being
   retargeted.** Both needed it: four dereferences of retired elements were unguarded `!`, so both
   files would have **thrown** rather than failed. They need `npx vite --port 3100` and
   `SA_E2E_BASE_URL=http://localhost:3100` on the `#/contact-lab` route. **This pack's Contact-list
   phase is "landed (code + unit)", not "landed (measured)".**
2. **Three illustrator commissions are retired** — `agent-stage-add`, `agent-stage-discover`,
   `agent-stage-track`, briefs for artwork that never arrived. Recover the whole previous page from
   `a87e7447~1`. Nothing else in the repo referenced those slot names.
3. **The `materials` deed's three-vs-two wording** (false premise 2) — one constant either way.
4. **"Idle · 3"** (false premise 3) — one entry in `CLE_GROUPS`.
5. **Branch A's Contact-list landing** (Phase 4) — a product decision.
6. **Nothing was deployed.** Prod and dev deploys are Nick's.

---

## Faults found in this work, and what caught them

Recorded because each is a class this repo already carries, arriving through a new door.

| Fault | Caught by |
|---|---|
| Appending to `oneScreen.css` put the whole pack **after** the `prefers-reduced-motion` block, exempting every rule from reduced motion — silently, with the reduce block reading correctly | `motionPolish`'s existing "the reduced-motion block is LAST", on the first full run |
| Curly apostrophes typed throughout Phase 2's copy; the artefact has **117 straight and zero curly** | the new ref-verbatim lock, on its first run |
| `toContain("<QueryEmptyFeatures")` is satisfied by `<QueryEmptyFeaturesGONE` — four assertions across three files were loose, in both directions | a mutation that unmounted the page and was recorded as a **pass** |
| The Contact-list rewrite set a 40px hero opening against a **measured, reasoned, deployed 118px** | the unit lock's `> 60`, which was the only net, since the e2e gate does not run in Vitest |
| Two `oneScreenSmoke` fixtures omitted `manuscriptId` — required by `types.ts` *and* `firestore.rules* — so every fixture reached the cards as an **empty scoped set**, and a case named "a single point on the record" asserted the zero-point outcome | a new branch keying off the scoped set |
| Importing `pathFor` from `App.tsx` pulled in Firebase; the file failed to **LOAD**, reporting "no tests" | reading the full output rather than grepping for failures |
| `code.slice(code.indexOf("export const pathFor"))` against a declaration that is `export function` — `indexOf` returned −1 and `slice(-1)` gave one character | two assertions failing against an empty string while naming `pathFor`; replaced with `sliceBetween` |
| My generalised emphasis law forbade **any** colour on `em`/`strong`/`b`, then flagged the page's own ink — the token the original case *required* | its own first run |
| `npx tsc --noEmit \| head; echo $?` reads **`head`'s** exit code | the repo's own recorded `pipefail` rule, mid-run |
| A `json.dump` round-trip of `.refhashes.json` re-encoded another session's em-dashes as `—` | reading the staged diff before committing |

## Concurrency

Another session worked the Query Centre calendar throughout, with uncommitted changes in
`Queries.tsx` — the file Phase 2 had to mount into. Their hunks (lines 80–82, 3408, 3514, 6558+) do
not touch the empty branch (~5632). Phase 2's `Queries.tsx` patch was therefore built **against
HEAD** rather than the working tree, so it cannot carry their lines, and staged with
`git apply --cached`. Their staged deletion of `reports/calendar-fixes.md` and their
`.refhashes.json` entry were unstaged from the shared index (index-only; their working tree
untouched) and remain theirs to commit. No commit here contains a calendar file.
