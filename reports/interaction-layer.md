# Interaction layer — Queries Hub + Contact List + AI Find & update

Running report. Session 1 = Stages 0–5 (interactions, no AI). Session 2 = Stages 6–9 (the AI
feature) — **not started; awaiting Nick's go-ahead.** Refs: `design-refs/queries-interactions.html`
+ `design-refs/contact-list-interactions.html` (chrome refs v18/v7 unchanged).

---

## Step 0 — Recon (read-only; the findings that shape the build)

**HALT-1 cleared** — both prototypes present in `~/Downloads/`. Tree clean on `main`; recon HEAD
was `28689b2`.

### Q3 · Genres — the migration picture
- **Stored as display-label strings everywhere; there are NO IDs.** Standing decision #1 (store
  IDs) is therefore a genuine data-model change, not a relabelling.
- **Manuscript:** `Manuscript.genre: string` (`types.ts:102`) + `subGenres?: string[]` (`:103`).
  The primary genre is **free text** — `AddManuscriptFocusForm` accepts the raw typed value with
  no membership check, so live data may contain off-list values.
- **Agent:** `Agent.genres: string[]` (`types.ts:201`) — label strings.
- **Two divergent lists, uncoordinated:** `PREDEFINED_GENRES` (16, manuscripts,
  `lib/manuscripts.ts:12`) and `AGENT_GENRES` (25, agents, `lib/agentOptions.ts:10`) — casing +
  membership disagree ("Science Fiction" vs "Sci-fi", "Commercial Fiction" vs "Commercial
  fiction"). SmartImportReview even cross-wires the manuscript list onto agents. Standing
  decision #2 (one taxonomy) resolves this.
- **Word-count map:** `genreWordCountRange(ageCategory?, genre?)` (`lib/manuscripts.ts:88`) keys
  off `genre.toLowerCase()` **substring** and returns a display string (`"90,000 – 120,000"`).
  Consumed by `manuscriptPage.wordCountWhisper`, `discoverAgents.parseWordRange`. Tolerant but
  label-coupled — the ID model attaches the range to a canonical id instead.
- **Picker:** `GenreCombobox` (`components/forms/GenreCombobox.tsx`) — the adapt target for 3d.

### Q4 · Toast / undo — NONE exists
- No library. The only thing today is an ad-hoc success-only string in `App.tsx:358`
  (`successToast`, hard 3s, no undo, no queue, no context). **Stage 2 builds the real system
  from scratch** — this is the prerequisite it's called out to be.

### Q5 · Tasks — derived, single-scope
- **`Task` (`types.ts:429`) is DERIVED, never stored — there is no `addTask`.** Recomputed in a
  `useEffect` from queries+manuscripts+agents (`db.tsx:598`). Scope is a single
  `relatedRecordId` (holds the query id) + `taskType` — **a task cannot be dual-scoped to a
  query AND an agent today.** Badge helper `queryTaskBadge(tasks, queryId)` exists.
- **The stored, user-authored dated item is a `Note`** (`types.ts:395`) with `dueDate`, created
  via `addNote({ text, colour?, dueDate? })` (`db.tsx:222`) — also unscoped to query/agent.
  → **Build consequence:** "Remind me in 2 weeks" (4c) and "check back in 1 month" (5a) will
  create a dated `Note` (the existing task primitive), carrying context in the text. Genuine
  query/agent scoping on tasks would need a schema + rules change — flagged, not silently added.

### Q6 · Exact signatures (verbatim)
- `editActivity(queryId, activityId, patch: Partial<Pick<Activity, "description"|"details"|"date"|"resultingStatus">>): Promise<void>` (`db.tsx:2138`) — patches the authoritative per-query log doc, best-effort projection patch, then `recompute(queryId)`.
- `deleteActivity(id: string): Promise<void>` (`db.tsx:2113`) — deletes the global row + same-id per-query twin, then recomputes the owning query.
- `recomputeQuery(userId, queryId): Promise<void>` (`lib/recomputeQuery.ts:52`) — the single writer of derived state.
- `queryBucket(status): "waiting"|"move"|"closed"` (`lib/queryAmbient.ts:19`).
- `getPrimaryAction(status): PrimaryAction` (`lib/queryPrimaryAction.ts:28`) — `{kind:"record",label,ballHolder}` or `{kind:"mark-sent",markKind,target,label,ballHolder:"writer"}`.
- Also available (no new writers needed): `addActivity(act): Promise<{success,error?}>` (`db.tsx:232`), `addNote({text,colour?,dueDate?})` (`db.tsx:222`), `logNudge(queryId,{checkBackDate,note?})` (`db.tsx:251`), `updateAgent(id, fields)` (`db.tsx:190`), `dismissTask(...)` (`db.tsx:245`).

### Q7 · `componentType` enum + the materials gap
- **`ComponentType` (`types.ts:128`): `QUERY_LETTER` · `SYNOPSIS` · `SAMPLE_PAGES` ·
  `FULL_MANUSCRIPT`.** Units are NOT on the enum — they live on `QueryMaterial`
  (`types.ts:263`): `type?: "pages"|"words"|"chapters"|"other"`, `quantity?`. Effective units:
  Query Letter / Synopsis = whole-document (binary), Sample Pages = pages|chapters|words.
- **`Agent.materialsWanted` is currently a loose `string[]`** (`types.ts:208`) — Stage 5d tightens
  it toward the enum.
- **Predicted gaps (report, don't invent):** the prototype's wanted-materials vocabulary is
  Query letter / Synopsis / **Author bio** / Sample (pages|chapters|words) / Full manuscript.
  **"Author bio" has no `ComponentType` member**, and **"sample words / sample chapters" have no
  distinct member** — they'd both be `SAMPLE_PAGES` differentiated only by the `unit`. Resolution
  chosen in 5d and reported there; `packageMetrics` stays locked/untouched.

### Q8 · Infra — Blaze is live, plumbing exists to reuse
- **Blaze on; four functions deployed, all `europe-west2`:** `smartImportMap`, `extractFromEmail`,
  `suggestComps` (all Anthropic `claude-sonnet-4-6`), `waitlist`. `ANTHROPIC_API_KEY` is a Functions
  **secret** (`defineSecret`), never in client code. **No function uses web search yet** — Stage 8's
  MSWL lookup is the first, net-new.
- **`suggestComps` is the reuse target** (`functions/src/suggestComps.ts` + `suggestCompsCore.ts`;
  client `lib/suggestComps.ts`): `onCall`, europe-west2, 60s/512MiB, server-side Pro gate, JSON
  contract with one repair retry, per-call token `console.log`. Built + compiled + deploy-ready;
  client `SCOUT_LIVE=false` so it isn't actually called in prod yet.

### Q9 · Server-side entitlement — EXISTS (the pattern to copy)
- All three AI callables read `users/{uid}.plan` **server-side** (Admin SDK), not client trust.
- **`smartImportMap` already has real per-user counters** in the admin-only doc
  `users/{uid}/private/entitlement` (client can't write it): free = 1 lifetime, Pro = 1/UTC-month,
  consumed at the costly step, throws structured `resource-exhausted` with `nextAvailable`. Client
  mirror `lib/smartImportEntitlement.ts`. → **Session 2 copies this exact shape** for Find & update;
  `suggestComps`/`extractFromEmail` have only the plan read, no counter (deferred).

### Q10 · Composite indexes — NONE needed
- No `firestore.indexes.json` exists; every live `query()` uses a single `orderBy` OR single
  `where`. The new filters/sorts are client-side over already-loaded `agents`/`queries` → **zero
  new indexes.**

### Q11 · Portal utility — YES
- `useFixedMenu(open, {placement?})` → `{ triggerRef, menuStyle }` (`components/forms/useFixedMenu.ts`)
  positions a fixed menu against its trigger (re-syncs on scroll/resize). `createPortal(…, document.body)`
  is the established layering idiom (already used by F12Popover, StatCards, MaterialsField). **House
  rule satisfied without new deps** — portal + `useFixedMenu` for every popover.

### Admin gating (for 3c's Nick-only view)
- `ADMIN_UID = "r8kbaKbmguNfaoJTb9wH4BetJab2"` (`lib/seedCommunityAgents.ts:15`); server-side
  `isAdmin()` in `firestore.rules:47`. **No client route guard exists** — the admin genre-queue
  view will gate on `currentUser.id === ADMIN_UID` fresh.

---

## Stage log

| Stage | Commit | Status |
|---|---|---|
| 0 — recon | `0f9450b` | ✅ done |
| 1 — prototypes committed | `62c5f2a` | ✅ done |
| 2 — toast + undo (+ confirm dialog) | `d894654` | ✅ done |
| 3a — genre taxonomy foundation (pure module + 20 tests) | `8971a1a` | ✅ done |
| 3b — personal-genre storage + promotion-queue write + rules | `70fa018` | ✅ done |
| 3d — taxonomy picker + read-time tolerance layer | `d38bfbf` | ✅ done |
| 3e (agents) — picker wired in Add/Edit-agent (writes IDs); tolerant display on Contact List + dashboard | `2e24b07` | ✅ done |
| 4f / matching — communityMatch + wordCountWhisper made ID-tolerant (read side) | `922058c` | ✅ done |
| 3 (new) — PDF demoted into a ⋯ overflow menu, both pages (+ shared F12Menu) | `b6774f9` | ✅ done |
| 4e (manuscript) — picker in the manuscript genre input (write side; stores ID) | `122153f` | ✅ done |
| 4c — Nick-only admin promotion view | — | ⏳ not started (queue rules already in 3b) |
| 5a keystone — composerChips (pure, derived from getPrimaryAction/queryBucket) | `e2031f7` | ✅ done |
| 5a seam — RecordResponseFocusForm initialResponseType/initialDraft | `ae01126` | ✅ done |
| 5a component — the contextual composer (inline capture + recording + CTA demote) | `c17d0e2` | ✅ done |
| 5a polish — one question, positive=pink / rejection=grey, StatusDots (Nick's steer) | `faaf24f` | ✅ done · round-trip confirmed on dev |
| 5b — corrections (timeline ⋯ → Edit/Delete, derived-consequence confirm) | `ac479fe` | ✅ done |
| 5c — popovers (View tasks / Nudge / Mark closed↔Reopen) | — | ⏸ decision on "View tasks" (below) |
| 5d — click-to-pick manuscript + method; Edit-button fate | — | ⏳ not started |
| 5e — delete (counted) + Import two-doors | — | ⏳ not started |
| UserTask store + dueDate | `a2cfa6d` · `ca11d3e` · `3abc277` | ✅ done (rules parked) |
| 6 · View tasks (agent-scoped) | `b81480f` | ✅ done |
| 6a · door check-back reminder (dated) | `3f3d60c` | ✅ done — first UserTask.dueDate use |
| 6a · interactive stars (hover/set/undo) | `56a57d9` | ✅ done |
| 6a · star clear → UNRATED (absence, not 0; deleteField) | `7234b7b` | ✅ done (rule parked) |
| 6a rest · method click-to-pick + editable link pills | `53c9d4d` | ✅ done |
| 6c · response guidelines (time + reply policy; both now optional) | `73a3e84` | ✅ done — never auto-closes |
| 6d · wanted materials | — | ⏳ next (report componentType gap; materialsWanted → structured) |
| 6d · wanted materials | — | ⏳ (report componentType gap) |
| 6e · query history · 6g delete+mark-closed · 6f/6h · 5d · 5e · Nudge→addUserTask | — | ⏳ |
| 6a rest · method click-to-pick · link pills | — | ⏳ next |
| 6c response guidelines · 6d wanted materials · 6e query history · 6g delete+mark-closed | — | ⏳ not started |
| 5d click-to-pick + Edit fate · 5e counted delete + Import | — | ⏳ not started |
| Nudge remind-me → migrate to addUserTask (currently logNudge) | — | ⏳ not started |

**Dev:** Firestore rules deployed (`personalGenres` allowlist + `genreSuggestions` block are LIVE
on dev) — personal-genre creation + the promotion-queue write now persist there.

## ⏸ Stage 5a — the decision that shapes the composer component

The composer's logic keystone is done and locked. Building the component surfaced a real fork,
because two things the prompt states are in tension:

- The prototype's inline composer collects **date · method · optional note** ("an inline form, not
  a modal").
- The **canonical recorder** — `recordQueryResponse` (the single-writer path we must reuse, not
  fork) — takes a rich `RecordResponseData`: materials sent, expected-by, feedback type/text,
  received date, R&R notes, offer details, closing reason, etc. Today's `RecordResponseFocusForm`
  collects all of it.

So: when a chip records via the inline composer, **how much does it capture?**
- **(A) Inline-light (prototype-faithful):** date + method + note; sensible defaults for the rest
  (expected-by computed from the new status's window; materials/feedback left blank, refined later
  via Edit). Fast, matches the prototype — but a "record" captures less than today's form does.
- **(B) Inline + the one key field per outcome:** date + method + note **plus** the single
  load-bearing field for that response (Full-requested → expected-by; Offer → offer date/deadline;
  R&R → revision notes). Slightly bigger inline form; loses less.
- **(C) Keep `RecordResponseFocusForm` as a "more detail" path** behind the inline quick-capture.

**Resolved — Nick chose (B) with (C) as the escape hatch** ("friction scales with rarity"), and it's
built (`c17d0e2`): inline `when · how · note` for the common outcomes; a **defaulted expected-by**
on Partial/Full requested (the one load-bearing field, seeded from the agent's window); Offer & R&R
open the rich form; an "Add more detail" link everywhere → the rich form pre-filled. The CTA
demotes to scroll+focus. Two flagged deviations: the inline "How" folds into the recorded note
(recordQueryResponse has no response-method field — nothing lost); the mark-sent popover anchors to
the CTA button. **Round-trip confirmed working on dev by Nick.**

Polish landed (`faaf24f`, per Nick): the prompt is ALWAYS "What happened next?"; each state's likely
next POSITIVE step is the soft-pink chip (still getPrimaryAction's target on writer's-turn, so no
disagreement), Rejection is ALWAYS grey and last, and every chip carries a real StatusDot.

## 6c — the "If they don't reply" model note (before I build it)

The card needs THREE states for *If they don't reply* — **No response means no / They reply either
way / Not stated** — but `Agent.noResponseMeansNo` is a required **boolean** (2 states). Consistent
with the starRating decision ("absence = the not-stated fact, not a magic value"), I'll make it
**optional**: `true` = means-no, `false` = replies-either-way, **absent = Not stated**. That's a
parked rule + type change (+ a small cascade like starRating: seeds/forms that set it stay valid).
*Usual response time* keeps its existing `responseTimeWeeks === 0 = not stated` convention (weeks
unit; a units picker would be a bigger model change — flagged, not taken). And I'll PROVE in the
sweep that the not-stated / means-no signal only *feeds* expected-by + the composer's close chip
and never sits on an auto-close path.

## Workflow (from the two concurrency collisions)

- **Worktree:** this stream now works in `/Users/nickphysick/ScriptAlly-il` on branch `claude-il`
  (Nick keeps the primary checkout on `main`). I edit in isolation, then **ff-merge `claude-il`
  → `main` only when my changed files don't overlap Nick's uncommitted WIP** (checked each time)
  — so `main` stays current for Nick's review + deploy-from-main, without our edits colliding in
  one working tree. If a future commit touches a file Nick is mid-editing, I hold + coordinate.
- **Gate now compiles rules:** whenever a commit touches `firestore.rules`, the gate runs
  `firebase deploy --only firestore:rules --config firebase.dev.json --project dev --dry-run`
  (compiles + validates, no release). This catches a non-compiling rules file at commit time —
  the exact gap that let the duplicate-`isValidUserTask` reach deploy.

## ✅ COLLISION RESOLVED — UserTask is the canonical store (reconciled)

Per Nick's call (option 2), I owned the reconciliation:
- **`a2cfa6d`** — wired the canonical `UserTask` store into `db.tsx` (its own commit): `userTasks`
  state + the `users/{uid}/tasks` listener + `addUserTask({text,queryId?,agentId?,manuscriptId?})`
  / `updateUserTask` / `deleteUserTask`, on the context interface + value. Additive — sits beside
  the existing `todoNotes` (ToDoPage still uses it) so nothing breaks; the todo-board stream
  migrates that UI + drops `TodoNote` separately. Scope is INPUT; no count/status cached. Parked
  rules: `isValidUserTask` + the `/tasks` match block (rides the parked deploy).
- **`ca11d3e`** — re-pointed `TasksPopover` to `userTasks`/`addUserTask`/`updateUserTask`, and
  REVERTED the interim `Note`-scope workaround (Note.queryId/agentId, the addNote params, the
  isValidUserNote rule). Notes are plain desk notes again; tasks live in `UserTask`.

Stage 6's three agent-scoped task creators (Contact-List View-tasks, door check-back, Nudge
remind-me) now all use `addUserTask({ agentId })`. **Note:** `UserTask` has no dueDate/resurface
field — the "remind me in 1 month / 2 weeks" tasks are created as scoped to-dos with descriptive
text; if they need to actually resurface on a date, that's a `dueDate?` on Nick's UserTask model
(flagged, not added).

Parked rules pile now = personalGenres · genreSuggestions · `/tasks` (isValidUserTask). Deploy
all together to dev.

**DEPLOYED to dev** (rules + hosting) after reconciling a SECOND concurrent collision: the
todo-board stream (`6a50ae0`) and this stream (`a2cfa6d`) both added `isValidUserTask` + a
`/tasks` match to firestore.rules, so the rules failed to compile (the JS gate doesn't run the
rules compiler — it surfaced only at deploy). `2def065` keeps the dueDate-aware version + its
narrowed update allowlist, relaxes text-min to preserve the To-do board's blank-note flow, and
drops the duplicate. **Two concurrency collisions now (UserTask, rules-dedup) — the shared
checkout is biting; a worktree for one of us would stop it.**

**Open decision — star clear-to-unrated:** 6a's "click the same star to clear" is NOT built. The
starRating rule requires 1–5 (firestore.rules:162/234) and `Agent.starRating` is typed 1|2|3|4|5,
so clearing to 0 is silently denied. Needs `starRating >= 0` in the rule + `0|…|5` in the type.
Reported, not shipped (a silent-fail clear is worse than none).

## (superseded) COLLISION — record-scoped tasks built twice

Nick chose (B) — record-scoped stored tasks — and it was implemented **twice, concurrently, in
the same checkout**:
- **This stream:** `Note.queryId/agentId` + `addNote({queryId,agentId})` + `TasksPopover` reading
  `notes` (`ac13b4f` foundation, `d13cefd` popover). Works today.
- **Nick's todo-board stream:** a new **`UserTask`** type (`types.ts:498`) in `users/{uid}/tasks`,
  whose docstring names it "the only stored, user-originated to-do object" that BOTH the To-do
  "Your tasks" column AND the per-record "View tasks" popover read — i.e. it is the canonical home
  for exactly this feature, with `queryId/agentId/manuscriptId`.

**`UserTask` wins** — one store for the To-do board + both popovers, by Nick's design. My `Note`-
based version is the same feature on the wrong store. State right now: `UserTask` is DEFINED but
`db.tsx` is NOT yet migrated (still `todoNotes`/`addTodoNote`; no `addUserTask`/`userTasks`), so I
can't re-point to it yet.

**Reconciliation (once `db.tsx` exposes `userTasks`/`addUserTask`/`updateUserTask`):**
1. `TasksPopover` reads `userTasks` (scoped by queryId/agentId) + adds via `addUserTask`, completes
   via `updateUserTask`. The popover UI + the whole feature stay — only the store swaps.
2. Revert the now-redundant `Note.queryId/agentId` (`types.ts`), the `addNote` scope (`db.tsx`), and
   the `isValidUserNote` queryId/agentId rule (`firestore.rules`). `users/{uid}/tasks` gets its own
   rules instead (part of the todo-board work).
3. Stage 6's three agent-scoped task creators (Contact-List View-tasks, door check-back, Nudge
   remind-me) all use `addUserTask({agentId})` — no `Note` scope.

**HELD:** 5d / 5e / Stage 6 are paused until the store is reconciled — building three more
agent-scoped task creators on the soon-superseded `Note` model would be the wrong thing thrice.

**⚠️ Concurrency:** this is the "one active session per working tree" hazard from CLAUDE.md —
`db.tsx`/`index.css`/`themes.md` were changing under me mid-gate (I verified my Nudge commit in an
isolated HEAD worktree to get a clean signal). Recommend we serialise: either the UserTask
migration lands first, or I take a worktree for Stage 6.

## ⏸ Stage 5c — the "View tasks" decision (Mark closed + Nudge already exist)

Two of the three popovers are already built from earlier work and just need a light check:
- **Mark closed** — a "Close this query as… Rejected / Withdrawn / No response" popover →
  `updateQueryStatus`. (The prototype also lists "Agent closed"; there's no distinct QueryStatus
  for it — it'd fold into No response. Minor; flagging.) On a closed query the command-bar CTA
  already becomes **Reopen** (via the composer's reopen chip), so Mark-closed↔Reopen is covered.
- **Nudge** — `NudgeModal` + `logNudge` + the check-back slider ("Remind me in…") exist. The one
  prototype gap is the **copyable follow-up draft** — a small add.

**"View tasks" is the real fork.** The prompt wants a **checklist scoped to the query** (inline
add, tick-completes). But recon Q5 stands: **a task can't be scoped to a query today** — the
derived `Task[]` is keyed on `relatedRecordId`, and stored user tasks are `Note`s with `dueDate`
and no query/agent scope. So "View tasks" needs a model decision:
- **(A) Read-only-ish popover over the DERIVED tasks for this query** (`tasks.filter(relatedRecordId === query.id)`), tick = `dismissTask`; "inline add" creates a dated `Note` (NOT query-scoped, so it won't reappear in this query's list — honest but limited).
- **(B) Add a `queryId?` (and `agentId?`) to the stored task/`Note` model** — a schema + rules
  change — so inline-added tasks are genuinely query-scoped and tick-complete round-trips. This is
  the "real" version and what the prototype implies.
- **(C) Keep "View tasks" navigating to the /todo board** (today's behaviour), pre-filtered to
  this query — no new model, but not a popover.

Currently it navigates to /todo (C-ish). **Which model?** (B) is the faithful one but is a stored-
schema change (+ rules); (A) ships now with a caveat. I'll wire Nudge's copyable draft + confirm
Mark-closed regardless, but "View tasks" waits on this.

## 5b groundwork (confirmed feasible, for the next pass)
- Timeline events carry `id` (the activity id) — the hover ⋯ can target editActivity/deleteActivity.
  Only activity-backed rows get a ⋯ (the synthesised "Query sent" root has no id).
- The delete **consequence** (`QUERIED → NOT YET SENT`) is derivable: `deriveQueryFields(events
  minus the deleted id)` gives the post-delete status — the confirm shows current → derived.
- Edit = correct-in-place via `editActivity` (a small pre-filled inline edit form on the composer),
  NOT a new record. Reuse `showConfirm` (Stage-2 dialog) for the delete guard + `F12Menu` for the ⋯.

**Genre migration — COMPLETE.** Both write sides store IDs (agents `2e24b07`, manuscripts
`122153f`); every reader tolerates legacy labels (`d38bfbf` + `922058c`); no bulk Firestore
rewrite (upgrade-on-edit). Free-text genre entry on manuscripts is retired — standing decision #6
now holds exactly (free text only in journal/agent notes, wish list, task titles). Remaining Stage-4
item is 4c (the Nick-only promotion view — low-frequency, code-completed via CANONICAL_GENRES +
the read-time personal-id auto-upgrade). Onboarding `ManuscriptFields` (BrandDropdown) +
SmartImportReview still store parsed labels — tolerated, converted on a later pass.

**Renumbering note:** this refined prompt makes genre taxonomy Stage 4 (was 3), adds a new Stage 3
(PDF→overflow), and pushes Queries/Contact-List to Stages 5/6 and the AI feature to 7–10. The
already-done sub-stages map cleanly (old 3a/3b/3d/3e/3f = new 4a/4b/4d/4e/4f).
| 4 — Queries Hub interactions | — | ⏳ not started |
| 5 — Contact List interactions | — | ⏳ not started |

**Where the genre migration stands:**
- **Agents — fully migrated** (write IDs; legacy labels tolerated + upgraded-on-edit; tolerant
  display on Contact List + dashboard). Live on dev.
- **Read side of the manuscript slice — done** (`922058c`): `communityMatch` + `wordCountWhisper`
  resolve `ms.genre` through `genreDisplay()`, so Discover matching + the hero whisper work whether
  the stored value is an id or a legacy label. The app is fully correct with manuscripts still
  storing free-text labels.
- **HELD — the manuscript genre INPUT swap** (`AddManuscriptFocusForm` free-text → single-select
  `GenrePicker`). Two reasons, both about doing it right: (1) it's a **visual-fit decision** — the
  GenrePicker is f12-styled (pink pills, dashed mono trigger) and now lives in the app-theme AGENT
  forms too; it should be eyeballed there (on dev) before being threaded through a third, more
  complex form, since restyling it for app-theme is one shared change. (2) `genreInput` threads
  through **12 sites** in this multi-step form (step-validation, word-count placeholder, review
  card, dirty-check, submit) that I can't visually verify (auth-gated). Functionally nothing is
  blocked — tolerance covers label storage. **Decision for Nick: is the GenrePicker's look
  acceptable in the app-theme forms, or should it get an app-theme skin first?**

SmartImportReview + the legacy ImportCsv keep storing/showing parsed labels (tolerated).

**Dev:** button fix (`28689b2`) + control-bar polish (`2983258`, 14px labels, buttons dropped
toward content) both live on https://scriptally-dev.web.app (hosting-only).

**Next focused pass = 3e** (the flagged data-model migration): swap `GenreCombobox` → `GenrePicker`
in `AddAgentFocusForm` / `EditAgentDrawer` / the manuscript genre field so writes store IDs, and
make the genre-matching consumer (`communityMatch.ts`) resolve through `genreDisplay`/
`normaliseStoredGenre` so a stored id matches. Read-time tolerance (`d38bfbf`) means no bulk
Firestore rewrite is needed — legacy label records keep working and upgrade on next edit; the
migration reports (not guesses) anything unmappable. Then 3c/3f, then Stages 4 & 5.

Also shipped this session (a fix to the already-live chrome, ahead of this task): `28689b2`
— control-bar buttons pink/white at rest (a CSS-specificity regression in the shell's button
reset), and distinct Sort (up/down arrows) / Group (2×2 grid) icons per Nick.

## ⏸ Where I stopped, and why

Stopped at a clean commit boundary after **3a** — the pure taxonomy keystone (standing decision
#1) is in and locked. The remaining Session-1 work is a large, higher-risk body I'm deliberately
NOT cramming at the tail of a long session:

- **The genre ID migration (3b–3e) is a breaking data-model change** — `Agent.genres` and
  `Manuscript.genre` move from label strings to canonical/personal **IDs**, which ripples through
  every write path (`AddAgentFocusForm`, `EditAgentDrawer`, `AddManuscriptFocusForm`, onboarding,
  Smart Import commit), every read/display site, and the word-count logic; it needs **new
  Firestore rules** (`genreSuggestions` + a home for personal genres on the user doc) and a
  migration that must not orphan existing label data. That "riskiest kind of change" wants a fresh,
  careful pass — not the last hour of a session that also did the chrome fix + recon + toast + 3a.
- **Stages 4 and 5** are the full interaction rebuilds of `Queries.tsx` and `Agents.tsx`
  (composer state machine, corrections, three popovers, click-to-pick; stars/door/method/genres/
  response-guidelines/wanted-materials/query-history/notes/delete-agent/send-query). Each is
  multi-sub-stage and each depends on the taxonomy + toast that are now in place.

Everything committed is green (tsc + build + **811** Vitest) and individually revertible; tree
clean on `main` at `8971a1a`.

## Flags for Nick (decisions surfaced by recon, to confirm before I build on them)

1. **Personal-genre storage location.** Recon found no home for user-scoped genres. Plan: a
   `genrePreferences` / `personalGenres` array on the **user doc** (cheapest, already loaded, no
   new page-load read) rather than a subcollection. Needs a one-line rules allowlist addition.
   Confirm the user-doc home is acceptable.
2. **Tasks are single-scope.** A `Task` can't be dual-scoped to a query AND an agent today (only
   `relatedRecordId`). The "Remind me in 2 weeks / check back in 1 month" reminders (4c/5a) will
   therefore create a dated **`Note`** (the existing user-task primitive) carrying context in its
   text. Genuine query+agent scoping would be a schema+rules change — flag, not silently added.
3. **Wanted-materials vocabulary gap (5d).** `ComponentType` = Query Letter / Synopsis / Sample
   Pages / Full Manuscript. The prototype also wants **Author bio** (no enum member) and **sample
   words / sample chapters** (both would be `SAMPLE_PAGES` differentiated only by `unit`). Plan:
   extend the *wanted-materials* value type (NOT `ComponentType`, NOT `packageMetrics` — both
   locked) with an `"author-bio"` kind and a `unit ∈ {pages, chapters, words}`; report the
   divergence rather than bending the Builder enum. Confirm.
4. **Session 2 (AI) is untouched and gated on your go-ahead** — but recon confirms it's cheap to
   build: `suggestComps` is the deploy-ready reuse target, `smartImportMap`'s
   `users/{uid}/private/entitlement` counter is the entitlement pattern to copy, and **no function
   does web search yet** (Stage 8's MSWL lookup is the first — a net-new capability + a functions
   deploy you'll run).

## Carried-over reminders (from the chrome revision, still true)
- **`#/pkg-lab` must be removed before any prod deploy.**
- Agent record **PRIYA RAMAN** renders shoutily (all-caps stored name) — a data fix, not a code
  one.

Session 2 (6–9) not started.
