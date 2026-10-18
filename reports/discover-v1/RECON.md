# Discover v1 — §0 recon (18 Oct)

Worktree `../ScriptAlly-discover-v1`, branch `discover-v1` cut from `origin/main` at `30439920`; `HEAD..origin/main` = 0.
Pack: all 25 SHA256s match the brief's table.

Baseline gates (worktree, before Part A): `tsc` clean · `build:dev` clean (no error/warning lines) ·
Vitest **588 files passed, 8852 tests passed, 3 skipped** (with `functions/node_modules` linked; without the link
`functions/src/email.test.ts` fails to load — an environment fact about a fresh worktree, not the tree).

## 1. What exists and what is kept
- `DiscoverNewAgents.tsx` (820) + `agents/discover.css` (873): the gated feature page and the live view. **Both deleted in Part B** (swap).
- `lib/discoverShared.ts`: `DISCOVER_LIVE` (also read by `Dash58List`) and `communityAgentFields` — **kept**.
- `lib/discoverAgents.ts`: `buildDiscoverEntries` (threshold-gated — not used by the queue, see premise 9), `rankEntries`,
  `LENS_META`, `availableLenses`, `locationCoverage`, `isUkIreland`, `displayTerms`, `highlightSegments`, `monthYearLabel`,
  `fitTier` — **kept**, read by `scout.ts`. `manuscriptReadiness`, `catalogueMeta`, `topHookTerm` become unread by any page.
- `lib/communityMatch.ts`: the one scorer — consumed, unchanged.

## 2. CommunityAgent and its rules
- `communityAgents`: get/list = any signed-in user; create/delete = `isAdmin()`; update = **+1 on `contributedByCount` only, never a decrement**.
- Verification fields: `lastVerifiedDate` (and `lastCheckedDate`) and `dataSource` only. Every one of dev's 30 has `lastVerifiedDate`.
- Dev: 30 community agents, **none carries `country`**, so the "Local first" lens and the UK & Ireland switch have nothing to act on there.

## 3. The add path
`addAgent(communityAgentFields(ca, title))` → `users/{uid}/agents/{id}` + an `AGENT_ADDED` feed row `act-added-agent-{id}`,
then a best-effort `increment(1)` on the community doc. It creates and never edits — consistent with the agent-card ruling.
`addAgent` refuses a FREE plan at 5 agents.

## 4. Catalogue totals
`/counters` is closed; no client-readable totals source exists. (The catalogue collection itself is readable — see premise 10.)

## 5. User allowlist
`todoPrefs`, `notifyPrefs` present; no discover field. `updateUserPaths` exists and writes dotted leaves.

## 6. No `agentSubmissions`, no pending collection, nothing records a per-agent Discover decision. Confirmed.

## 7. Route & census
`/agents/discover` → `StagePage layout="fillColumn"` → `DiscoverNewAgents`; header = `PageHeader variant="workspace" panel mark="discover"`
with a Pro pill. Census: `headerV3` TITLE list; grid class `dv-wpg` named in ten e2e route tables (`barBinding`, `chromeGround`,
`compactHeader`, `contentGeometry`, `headerFix`, `illoRules`, `slimBar`, `surfaceCensus`, `toolbarIsContent`, `washEdges`) and in
`workspacePageGrid.test.tsx`, `agentsPageSmoke.test.tsx`, `pageStructure.test.ts`, `planComparison`.

## 8. The drawer door: `openQueryDrawer({ mode: "log", agentId, manuscriptId })` — what the Contact list calls.

## 9. Active manuscript: `resolveScopedManuscript(manuscripts, localStorage[ACTIVE_MS_KEY])`; genres via `bookGenres(ms)`.
