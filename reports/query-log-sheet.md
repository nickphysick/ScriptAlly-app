# Query Centre — Log new query in the drawer (plus two sanctioned props)

`5b6d298b` → `c131e8a3`, seven commits on `main`, **UNDEPLOYED**. No deploys, no `git stash`,
`--only`/audited-index commits with counts throughout.

---

## FALSE PREMISES, FIRST

**1. Ruling 2's "writes through `editActivity`" collides with the model.** `materialsWanted` lives
on the QUERY, not the activity — the overnight run's own finding. What the ruling actually asks
for — preview first, one commit, one undo, no direct write — is built exactly; the materials half
writes `updateQuery` inside the same previewed commit because the data lives where it lives.
Locked per closure (a lazy regex was defeated by its own laziness first — the mutation that moved
the write live passed green until the lock was bounded).

**2. "6 wks default" vs the app's `HOUSE_NUDGE_WEEKS = 8`.** The brief says 6 twice; the app's
seeded default was 8 (aligned to the house QUERIED window). The sheet follows the brief — the
window pill when stated, else 6 — and the 8-default died with the takeover in §4.

**3. "pages ±5/1/10" vs the app's floor of 5.** `CREATE_QTY.Pages.min` was 5; brief and ref say 1,
and "first page" is a real sample (picture books, prologue-only asks). Changed to 1; the three
createQty locks retargeted with the measured new ladder.

**4. `N = existing count + 1` is ambiguous, and the sentence decides it.** "Your Nth query for
{manuscript}" is a claim about that book, so N counts the manuscript's queries. The ref counts the
account's — its demo has one manuscript.

**5. "datePickerHub red is another stream's" — it was neither.** The long-standing baseline red
was a MONTH-ROLLOVER fixture fault: `value: ""` opened the grid on today's month, where no day
sits below an August floor, so the inert-day assertion failed on a view where its claim could not
manifest — red since 1 September, about a picker that was right all along. Fixture anchored
inside the floor's own month; 17/17.

**6. "Redirect its route" — the old create had no route.** Every opener funnels through
`handleNavigate("Log a query")` → `openCreate`, which now opens the drawer. The new
`#/queries/new` and `#/queries/new?agent=:id` are the routes; nothing needed redirecting.

## Step 0 — the quotes

- **The restored path**: `openCreate(seed)` → `createDraft` → `<QueryJourneySheet register="create">`
  (portalled takeover) hosting `QueryCreatePane`; the hero CTA reaches it via `openCreate()`.
- **The primitive**: `addQuery` (db.tsx) — creates the query doc and SEEDS the `QUERY_SENT`
  activity in both stores; `recomputeQuery` derives Queried from it. `draftToPayload` is its one
  create-mode caller. *No red gate.*
- **The override**: `writerExpectedDate`/`writerExpectedSetAt` (`lib/expectedDate.ts`);
  `resolveExpectedDate` prefers writer > reply-stated > agency window. `isValidQuery` already
  validates both at CREATE — no rules change needed.
- **Nudge at creation**: `draftToPayload` writes `nudgeDate`; `reconcileNudge` (logNudge.ts) owns
  later reconciliation.
- **`addAgent`**: the minimal write exists; creation stamps dateAdded/lastCheckedDate.
- **The sample control**: `createQty.ts` (CREATE_QTY/stepQty/parseQty/formatQty/stepLabel) +
  the rendering formerly in QueryCreatePane — now the shared `MaterialsFields`. *No red gate.*
- **Form 11 picker**: `BrandDatePicker` — and it already had `min`/`max`.
- **The drawer's wide state**: `.qpn--wide { width: 660px }` was already provisioned.

## The rulings · `5b6d298b` · 6 files

Move restored (one prop; the pick/move steps had rendered inside the desk all along). Materials
editable from the desk through the ONE sanctioned additive touch — `CorrectionEdit` gains
`extraFields` + `extraDirty` (both default off; every caller byte-identical); the desk seeds the
send's materials via the NEW `queryMaterialsToRows` (the exact inverse of `draftMaterialsToQuery`,
shared with step 3), renders them through the PURE `MaterialsFields`, and commits both halves in
the previewed closure with one undo restoring both.

## §1 · form mode · `040073db` · 4 files

One aside, two modes. 660px, quill + title + nth + ticks + ✕, the read-back sentence pinned with
esc · Cancel · Save & log another · Save query (agent-gated). The journey sheet stopped opening
(gated dead, deleted in §4 as planned). Hash routes consumed on arrival. Arrows unbound in form
mode. Proved red: a detail action leaked into the form bar; the mount ungated.

## §2 · the four steps · `14a1253f` · 7 files

`QueryLogSheet`, controlled top to bottom; summaries derive at render (proved red by freezing
one). The window pill leads sage-bordered and pre-selected — provenance one grammar, selection
another. **The nudge choice IS the expected override**: `draftExpectedOverrideIso` — keeping the
pre-selected window writes NOTHING (freezing a derived fact is the fault addQuery §1 removed);
any real choice writes the writer's date. One derivation, ghost and save. Step 3 is the shared
`MaterialsFields`; the floor speaks `floorCopy`'s own words and Save reads the same flag.

## §3 · ghost and save · `d989c912` · 8 files

The sub-card types into the ghost (`onGhostHint`); the override rides the create payload; one
`addQuery` per save (proved red with a second); the saved card pulses once (`qcc--fresh`,
reduced-motion off); landing is the Tracking tab; `Save & log another` resets to step 1 carrying
date/method/nudge and never materials.

## §4 · the retirement · `9291f9c1` · 38 files

Deleted: `QueryCreatePane`, `createSteps`, `AgentPicker`+lib, the takeover's whole state machinery,
and **18 spec files whose subject was the deleted surface** — the overnight §6 lesson executed in
advance. **The first cut deleted the record journey's host** (`open={creating || recording}` — one
chassis, two registers; Record response is do-not-touch): restored in the same commit, rebuilt
record-only, with a lock asserting create can never reach it again. The rebuild broke it twice
more and the locks caught both before commit: an eagerly-evaluated `responseReady(respDraft!)`
crashing every render, and invented stateClass names no CSS animation keys off (the record exit
would have armed and hung). 12 spec files repaired, each stating its law's new home — and the
`datePickerHub` retarget surfaced THREE capability drops, all built: the picker bounds (nudge ≥
sent+1, sent ≤ today), the stranded-nudge fallback, and the stepper parity set (stated figure
re-opens the ceiling, raw-while-focused, ↑/↓) — now in the shared control, so the desk inherits
them.

## §5 · measured · `c131e8a3` · 22 files

Three real faults, found only by the harness:
1. **The typeahead was clipped** — `position: fixed` inside the transformed drawer resolves
   against the drawer's box, so overflow clipped it (the brief's exact fear). Every sheet popover
   portals to `document.body` now, through one `SheetPop`.
2. **The save landed nowhere** — the landing set state without navigating and the page's
   one-source `?q=` law cleared it in the same tick (`qpn: []` measured). It navigates now.
3. **The measurement stranded writes three times** — toast-lifetime spent waiting, a HIDDEN
   toast copy matched, a pre-echo snapshot. The case presses Undo inside the lifetime now;
   `cleanupStrandedCreate.mjs` is committed for the next runner; the account verified clean
   (removed: 0) at close.

Shots (all looked at): steps 1–4 at 1440+1920, the ghost at index 0, post-save detail.

## Deleted paths

`src/components/queries/QueryCreatePane.tsx` · `src/components/queries/AgentPicker.tsx` ·
`src/lib/createSteps.ts` · `src/lib/agentPicker.ts` · 18 spec files (`createCancelExit`,
`createColumnHeight`, `createColumns`, `createEntrance`, `createFrames`, `createHeader`,
`createListStandsDown`, `createLogAnother`, `createMount`, `createSaveMotion`, `createStack`,
`createStageOne`, `createSteps`, `agentPicker`, `queryCreateFixes`, `queryCreateFixes2`,
`queryCreateMode`, `queryCreateMotion`). Imports of every deleted path: zero.

## NOT RUN, with cause

- A fully-green FULL-FILE §5 run under load: parallel sessions flake the toast window (~one
  orchestration red per full run at its worst); the save case passes alone and in quiet runs, and
  each flake's write was restored in-run or by the committed cleaner. Stated, not retried into
  silence.
- The window-pill "changes the expected line in the ghost" is unit-proved through the seam
  (draft → override → cardFacts); not re-photographed per chip.

## Open questions — conservative choice taken

1. **`Save & log another` keeps the previous NUDGE choice** (agent-independent facts carry). If
   the next agent states a different window, the carried preset may not be their window — the
   pill re-derives on pick, so in practice picking agent B resets to B's window. Watch for the
   edge where no pick happens.
2. **The `?q=` navigation on landing** uses the existing `onOpenQuery` bridge; deep-linking
   `#/queries/new` from OUTSIDE /queries opens the drawer only once the page mounts.
3. **The ghost's "1 day waiting"** on a today-sent draft (midnight-anchored dates vs now) — an
   honestly-derived quirk, visible in the shots; a `0 days` special-case was not invented.

## Gate

Opened at 7 reds / 6 files (all other streams', by git log per file). Closed with every red in
the To-do session's dirty territory (their uncommitted `todoListView`/`ToDoPage` WIP drives their
own smokes red); zero reds in queries files. tsc 0 over my paths · build clean per commit ·
account verified clean.
