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
| 3b — creation guardrails wiring | — | ⏳ not started |
| 3c — promotion queue + Nick-only admin view + rules | — | ⏳ not started |
| 3d — picker UI (adapt GenreCombobox to the taxonomy) | — | ⏳ not started |
| 3e — migration (labels → IDs, report unmappable) | — | ⏳ not started |
| 3f — personal word-count fallback wiring | — | ⏳ not started (primitive built in 3a) |
| 4 — Queries Hub interactions | — | ⏳ not started |
| 5 — Contact List interactions | — | ⏳ not started |

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
