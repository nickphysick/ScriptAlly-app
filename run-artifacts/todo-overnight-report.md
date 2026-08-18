# To-do overnight run — report

**Baseline:** 319 files · **5612 passed** · 2 skipped · **0 failed** (fully green).
**Now:** 322 files · **5667 passed** · 2 skipped · **0 failed**. +55 tests, no regressions.

---

## ⚠️ READ THIS FIRST: the brief describes a page that no longer exists

Four of the brief's six structural premises are false. The To-do page was rebuilt at least twice
since the brief was written (the rail+workspace split, then the journeys pack, 15–16 Aug).

| Brief assumes | Actual |
|---|---|
| Flat board of rows, no task pane | **Already rail(520px) + workspace**, two cards on a ground |
| A 118×34 split button per row | **Retired**; four revealed 30×30 icons (`.tdg-ic`) |
| No journeys | **Six journeys already render in-pane** (`PaneJourney.tsx`) |
| `materialsForm` state, no shared shape | **`agentMaterials.ts` has owned the shape for months** |
| Sample selector inline in `AddAgentFocusForm` | **Not there**; three *other* surfaces duplicate it |
| No materials bucket | ✅ correct — this was the real work |

Per §1's instruction to adapt rather than rebuild: **Phases 2 and 3 were not re-run** — doing so
would have rebuilt working, locked code. Phase 1 was **re-aimed** at the duplication that actually
exists. Full evidence with line numbers: `run-artifacts/todo-recon.md`.

**The single most useful thing to look at first in the morning** is item 1 under *Open questions*
below — whether this task should fire on **closed** queries. On the harness account it reports
**19**, and that number is the whole feel of the feature.

---

## What landed

### `f4726e9` — Phase 1: the sample picker's surface, and the join that carries its meaning
*landed (code + unit), 26 tests*

- **`formatSampleSpecs(rows, join)`** — the genuinely missing piece. An agent asking for chapters
  AND pages offers a **choice** ("3 chapters or 50 pages"); a record of what went is **one parcel
  measured twice** ("3 chapters · 50 pages"). `summaryFromRows` joined the interpunct
  unconditionally — right for a record, wrong for a requirement.
- **`willRecordText`** — the "Will record:" strip, built on the same function so the strip and the
  tile cannot describe one commit differently.
- **`SampleSpecPicker`** + its own `ssp-` stylesheet.
- **The no-gendered-pronouns house rule** in `CLAUDE.md`, with a carve-out that matters more than
  the rule (below). Four live offenders neutralised.

**Not done, deliberately:** the picker is **not retrofitted** into the three existing copies
(`Queries.tsx:4840`, `AgentEditor.tsx:474`, `QueryCreatePane`). They draw this control in three
different class systems (`f12-` / `agl-` / `qc-`); unifying them means either a component that takes
its own class names as props, or changing three live locked surfaces' appearance for no user-visible
gain. **Follow-up 1.**

**`AddAgentFocusForm` untouched** — converting its `MaterialsState` to `MaterialRow[]` changes what
agent creation *writes*, which §3 says stops the phase.

### `3749fce` — Phase 4a: the derivation and its two task types
*landed (code + unit), 25 tests*

- `queryMaterialsGap.ts` — pure, no Firebase. `BULK_MATERIALS_THRESHOLD = 3`, oldest-sent-first.
- **The predicate reads two homes, and this is the important part.** `firestore.rules` settled the
  model on 17 Aug (`1a0c397`): on an activity, `materials` means what went with *that* event,
  because a query-level `materialsWanted` "had to carry both 'what the agent asks for' and 'what you
  sent'". **But nothing writes the activity field yet** — the rule shipped as groundwork. A
  predicate reading only the canonical home would report *every query in the app* as a gap. So it
  reads the canonical home first and accepts the legacy field as satisfying it.
- Registered in `HK_TYPES` (housekeeping, never urgent), `cardJourney`, `taskSettings`.
- **Reachability is in the lock**, not assumed — stream is `hk` and not `do`, journey is `materials`
  and not `send`, and the bulk id matches `isValidId`'s charset.

### `c4eef53` — four faults the page showed and the locks could not
*landed (measured at 1440×900 and 390×844), 4 more tests*

All four were green in 5,663 unit tests and wrong in the browser.

1. **The row printed "Submission packages" as its subject** — `rowMeta`'s standing-subject fallback
   names a *place*; the bulk card stands for a *set*. The existing guard is `isSweepCard`, which
   this card is not.
2. **`hk: false`** — a housekeeping row wearing the status-dot slot.
3. **Empty KIND lane.** (2 and 3 both from falling through `derivedCopy`'s `default`.)
4. **⚠️ The tick would have run a STATUS write.** `completionVia` ends `return "mark-sent"`, so
   ticking a materials card would call `recordMaterialsSent` — advancing the query a single card
   points at, and aiming that write at an id no query has for the bulk card. **This is the second
   door into a fault this repo already closed once** in `cardJourney`; `completionVia`'s default was
   still open. **I noticed it by asking why my row had a tick when its sibling sweep did not.**

**How this was verified without a deploy:** Playwright pointed at a **local dev server** signed into
the dev project (`SA_E2E_BASE_URL=http://localhost:3000`). No deploy — §5 keeps those out of scope.

---

## Phases not done, and what each would take

- **Phases 2, 3 — skipped as already delivered.** Re-running them would rebuild working locked code.
- **Phase 4b (the single form)** — not built. Needs: `JourneyKind` + `JOURNEY_STEPS` entries, a step
  body in `PaneJourney.tsx`, a `paneJourneyKind` branch, plus `Activity.materials` on the TS type
  and a new `updateActivity` in `db.tsx` (only `deleteActivity` exists). **Today the task appears
  and hands off gracefully** to `handoffSheet(card, "fix")` — the path this codebase designed for
  unbuilt journeys — so nothing is broken, only unfinished.
- **Phase 5 (bulk table)** — not built. Should reuse `sweepCardFor`'s existing n-of-m machinery
  rather than inventing a parallel grouping.
- **Phase 6 (Pro)** — not built. **Good news:** `SubmissionPackage` stores a structured
  `samplePagesVersionId`, *not* free text — the brief's "do not parse the string" contingency does
  not apply.
- **Phase 7** — partially done: measured + screenshotted at both mandated viewports for what exists.

---

## Choices I made that the brief did not cover

1. **All three reference mockups are ABSENT.** `todo-ledger-pro.html`, `-bare`, `-form-polish` — only
   `todo-ledger-v1.html` (18 Jul) exists. Design values were taken from §2 and the live pane CSS.
   §2's values (`#e0d5c8`, `rgba(138,158,136,0.12)`, radius 9) **match the live stylesheet exactly**,
   so the spec is current even though the files are gone.
2. **Open item 4 ("covering letter everywhere") NOT done — it is an order of magnitude larger than
   described.** "Query letter" is a **stored value** (`MAT_OPTS[0]`), not just display: 174
   occurrences, 27 non-test files, reaching Firestore data, `ComponentType`, `packageMetrics` and
   `typeMeta`. It is a display/storage separation, not a copy tweak. New surfaces use the existing
   `MATERIAL_ROW_NAMES` constant, so the future rename is one line rather than a second vocabulary.
3. **The gendered-pronoun rule ships with a carve-out.** `seeds.ts`, `ImportCsv.tsx` and `PkgLab.tsx`
   carry **loglines of invented novels** ("a guild clockmaker rebuilds *her* dying sibling") plus
   historical quotation (Nabokov's wife Vera). A regex sweep hits all of them; the rule forbids
   automating the fix. `aboutCopy.ts` also left alone — that is **Nick describing himself**.
4. **The bucket fires on all *sent* queries regardless of status** (see Open questions).
5. `run-artifacts/` committed alongside code.

---

## Open questions for the morning

1. **⚠️ Should this fire on closed queries?** It currently does — the send happened whatever the
   outcome, and materials-vs-outcome analysis is exactly the Pro value. **On the harness account
   that is 19 queries.** Narrowing to active-only is a one-line predicate change; widening later
   would be worse, since users will have dismissed tasks by then. **This is the first thing to look
   at.**
2. **The bulk row's grammar differs from its sibling.** The wish-list sweep reads title `12 wish
   lists` + subtitle `12 agents have no wish list`; mine puts the whole sentence in the title and has
   no subtitle. Both coherent, but they do not look alike.
3. **The bulk card counts as 1 card, not 19.** Consistent with the "cards are the unit" law, and the
   housekeeping badge read 4 for 4 cards — so this looks right, but it is worth a second opinion.

---

## Pre-existing things I did NOT touch

- **An empty figure value** on dateless housekeeping cards ("NO DATE ON RECORD" with a blank
  numeral). The wish-list sweep renders identically — **established treatment, not mine**.
- **Duplicate-React-key console warnings** on `/todo`. Present, repeated ~4×. **Not investigated**;
  they appear unrelated to this work.
- Everything in §5 (activity stores, `deleteManuscript` orphaning, `journeyStage`, burgundy drift,
  the Partial/Full Sent under-count).

**Nothing on the do-not-touch list moved.** `.tbd-menu2`/`.tbd-mi` untouched — the split button was
already retired, so Phase 2's repoint was moot. `recomputeQuery` untouched; nothing here writes
status, response counts or pipeline dates. No deploys.
