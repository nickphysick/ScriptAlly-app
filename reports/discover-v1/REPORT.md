# Discover v1 — the Scout's page · report

Branch `discover-v1` (worktree `../ScriptAlly-discover-v1`), cut from `origin/main` at `30439920`. Five parts, one commit
each, plus a report commit. **Not merged to `main`.** Ref: `design-refs/discover-v1/` (all 25 SHA256s matched the brief;
enrolled in the hash manifest with Part A). Recon: `reports/discover-v1/RECON.md`. Proofs: `mutation-proofs.jsonl`.
Ledgers: `ledger/`.

## 1. False premises (first)

1. **Undo cannot restore `contributedByCount`.** The rules give a client `+1` and nothing else, so "snapshot before,
   restore after" is impossible for the counter from the client. Kept every write honest instead: the `+1` is **held**
   while the toast offers Undo and sent when it goes (or the page is left / the tab hides). A tab closed in those seconds
   loses a `+1` — an undercount, never an invented one. A3 asserts the account byte-identical after Undo **and** after the
   toast's life.
2. **There is no Pro gate on Discover to keep.** Only the pill. `planComparison.ts` already records Agent Discovery as on
   both plans, with a test. The pill stays; no gate was invented.
3. **The "existing writer" of `notifyPrefs.discover` is mounted nowhere.** It lived in `ContactNextStep`, which no page
   renders now. The coming-soon button writes the one leaf itself through `updateUserPaths`. (Nothing sends that email
   yet — `accountPrefs` says so; the button is the mock's and the brief's, so it ships, and this is a standing fact.)
4. **The shared light header, empty panel and steps card are not on `main`.** `shell/LightHeader`, `EmptyPanel` and the
   steps card are on `comps-v28` (unmerged). Built as page-local copies under `dv1-` — lift candidates.
5. **The shared toast has one action (Undo).** The toast needs "Log a query →" and Undo, so it is page-local.
6. **A client cannot create a community agent** (admin-only), so a "seeded `dv1-*` fixture" of catalogue agents is
   impossible; and the harness writer is **Free**, which `addAgent` caps at five agents. A3, C4, C5, D1 and E2 run on an
   owned Pro account, `dv1@scriptally.test` (`tests/e2e/seedDiscoverV1.mjs`), built around dev's own 30 catalogue agents.
7. **Undo after an add must also remove the `AGENT_ADDED` feed row** `addAgent` writes (`act-added-agent-{id}`) — the brief
   named the agent, the decision and the counter only.
8. **"At a sheet of 1360 or less" contradicts its own reference**: the app's sheet at 1512 is ~1256, which would put the
   1512 ref's three-column facts in two. The mock's 1360 is a **viewport** query. The facts reflow on the **card's**
   width: two columns at a card of 665 or less — the widest two-column card the mock draws (window 1360). C1 proves it
   is the card, not the window: the same 1280 window with the sidebar collapsed gives a 704px card and three columns.
9. **An Undo for a share would lie.** Deleting only the writer's echo would show the agent as unshared while the
   submission sat in the queue. No Undo is offered; the sheet's foot says a share can't be taken back from here.
10. **The catalogue *is* client-readable** (any signed-in writer may list `communityAgents`), so "no client-readable source"
    is not quite right. The figures stay absent anyway: `db.tsx` silently falls back to the local seed list when that read
    fails, so a count taken from it could be the seed's count presented as live. Recorded at `catalogueFigures()`.
11. **`buildDiscoverEntries`'s threshold (42/75) drops every genre-only fit**, which genre + age (35) can never reach — yet
    the mock shows "a genre fit only, so it's a possible rather than a strong one". The queue scores every genre fit and
    lets the engine's own band say strong or possible.
12. **Dev's catalogue has no `country` on any agent**, so the "Local first" lens and the UK and Ireland switch have nothing
    to act on there. Both are offered only when the catalogue carries locations (`availableLenses`, the existing rule).
13. **The mock's own "Best overall fit" description is not what `rankEntries` does** ("…then reply speed"). The note says
    what the code does: genre, age category and wish-list overlap together, the wish list breaking ties.
14. **The mock's "none" header card shows added and passed figures beside "nothing to decide yet".** Here "none" means
    nothing at all to decide, so the card's rows read 0 and the ring a dash.
15. **The mock's done/none copy quotes catalogue figures and "on your dashboard".** Both have no source (no figures; no
    dashboard surface), so they are omitted.
16. **The brief says the binoculars bird sits on a white disc; the ref draws it on `#e8dccf`.** Followed the ref.

## 2. What landed

| Part | Commit | Verification |
|---|---|---|
| A — data, rules, `scout.ts`, `scoutStore.ts` | `4560acb4` | landed (code + unit + emulator); **dev rules deployed and probed** |
| B — frame, two-state header | `3bfc3fb0` | landed (measured at 1512/1280) |
| C — picks, Tune, passed list, keys | `db83e91e` | landed (measured at 1512/1280; writing locks on the owned account) |
| D — share notice, share sheet, catalogue band | `112722a0` | landed (measured at 1512) |
| E — coming soon, E1/E2/L1, the tray lock | `8db261cf` | landed (measured at 1512/1280; E1 built both modes) |
| The sweep's fixes (AgentDisc, the title placeholder, two re-points) | follow-up | landed (measured at 1512/1280) |

Locks, all green on the final build (`discoverV1.measure.ts`, 21 cases): **A1** emulator 14/14 · **A2** unit · **A3** 5/5 ·
**B1** header 62/62 ×2, loading→loaded 48/48 ×2, panel 49/49 ×2, panel first-seen→settled 4/4 ×2 · **B2** 14/14 · **C1** 6/6, tray 46/46 ×2 · **C2** 8/8 ·
**C3** 8/8 · **C4** 9/9 · **C5** 7/7 · **D1** 12/12 · **D2** 12/12 · **E1** 14/14 (two-sided bundle check) · **E2** 7/7 · **L1** 6/6.
Every lock was proved red by its named mutation (`mutation-proofs.jsonl`); source mutations were made and undone in the
measurement worktree `../ScriptAlly-dv1-measure` from path-derived backups, never with git.

**Faults the sweep of the older suites found (fixed in a follow-up commit, see §6):** the coming-soon panel moved 4px
at 1280 when the book's title arrived (`headerPanelV2` P6); the picks' discs broke the app's disc law (`qcV138` J1) — they
are `AgentDisc` now, standing `none`, which also means the mock's navy-for-strong discs are not drawn (the fit pill says it).

**Faults the locks found in my own work, each fixed before its part landed:** the loading face's blank figures made
the card jump 8px (B1); the review aid shipped in the production bundle, twice, by two routes (E1); the catalogue section
and the lead card's band shared a class, so the section's heading covered the Add button (C2 hung on the click — the tray
lock was added for it); the copy used straight apostrophes (E2); D1's own field reader read seven of twelve fields.

Gates at the last commit: `tsc` clean · `build:dev` no error/warning line · Vitest **590 files, 8878 passed, 3 skipped**
(baseline 588 / 8852 / 3) · rules suite 205+ passed.

## 3. The rules Nick must deploy to prod, verbatim, in order

Deploy them as one ruleset (`npm run deploy:rules`) after merging. Dev carries them already (release `updateTime`
2026-10-18T11:36:18Z, deployed from the dev integration branch so its `betaPulse` block went with them).

**3.1 — `isValidUser`, after the `todoPrefs` clause:**
```
        // Discover v1: the Scout's tuning (lens + three switches), one map, written leaf by leaf
        && (!data.keys().hasAny(['discoverPrefs']) || data.discoverPrefs is map)
```
**3.2 — the two validators, above `isValidTaskFlag`:**
```
    // Discover v1 — the writer's decision about one community agent (the document id IS the community agent's id).
    // "passed" carries `until` (a year on); "added" never does. "Skip for now" is never stored.
    function isValidScoutDecision(d) {
      return d.keys().hasOnly(['decision', 'at', 'manuscriptId', 'until'])
        && d.keys().hasAll(['decision', 'at', 'manuscriptId'])
        && d.decision is string && (d.decision == 'added' || d.decision == 'passed')
        && d.at is string && d.at.size() <= 64
        && d.manuscriptId is string && d.manuscriptId.size() <= 128
        && (d.decision == 'passed'
              ? (d.keys().hasAny(['until']) && d.until is string && d.until.size() <= 64)
              : !d.keys().hasAny(['until']));
    }

    // Discover v1 — a writer's share of one agent to the community catalogue: PUBLIC fields only (decision 2) plus
    // who, which and when. Never queries, notes, ratings or anything the writer typed about the agent.
    function isValidAgentSubmission(d) {
      return d.keys().hasOnly(['userId', 'sourceAgentId', 'createdAt', 'name', 'agency', 'website', 'city', 'country',
                               'genres', 'mswlNotes', 'submissionMethod', 'materialsWanted', 'responseTimeWeeks', 'noResponseMeansNo'])
        && d.keys().hasAll(['userId', 'sourceAgentId', 'createdAt'])
        && d.userId is string && d.userId.size() <= 128
        && d.sourceAgentId is string && d.sourceAgentId.size() <= 128
        && d.createdAt is string && d.createdAt.size() <= 64
        && (d.keys().hasAny(['name']) || d.keys().hasAny(['agency']))
        && (!d.keys().hasAny(['name']) || (d.name is string && d.name.size() <= 256))
        && (!d.keys().hasAny(['agency']) || (d.agency is string && d.agency.size() <= 256))
        && (!d.keys().hasAny(['website']) || (d.website is string && d.website.size() <= 256))
        && (!d.keys().hasAny(['city']) || (d.city is string && d.city.size() <= 128))
        && (!d.keys().hasAny(['country']) || (d.country is string && d.country.size() <= 64))
        && (!d.keys().hasAny(['genres']) || (d.genres is list && d.genres.size() <= 32))
        && (!d.keys().hasAny(['mswlNotes']) || (d.mswlNotes is string && d.mswlNotes.size() <= 4000))
        && (!d.keys().hasAny(['submissionMethod']) || (d.submissionMethod is string && d.submissionMethod.size() <= 64))
        && (!d.keys().hasAny(['materialsWanted']) || (d.materialsWanted is list && d.materialsWanted.size() <= 32))
        && (!d.keys().hasAny(['responseTimeWeeks']) || (d.responseTimeWeeks is number && d.responseTimeWeeks >= 0 && d.responseTimeWeeks <= 104))
        && (!d.keys().hasAny(['noResponseMeansNo']) || d.noResponseMeansNo is bool);
    }

```
**3.3 — the user-update allowlist gains `'discoverPrefs'` (this line replaces the existing one):**
```
        incoming().diff(existing()).affectedKeys().hasOnly(['name', 'plan', 'trialStartDate', 'subscriptionStatus', 'onboardingComplete', 'queryingStage', 'homeCountry', 'queriesTheme', 'hasSeenTour', 'personalGenres', 'mutedTaskRules', 'tourSeenAt', 'tags', 'goalTarget', 'goalPeriod', 'queryingGoals', 'tourCompletedAt', 'tourDismissed', 'todoPrefs', 'notifyPrefs', 'discoverPrefs', 'marketingConsent', 'workspacePrefs', 'scheduledDeletion'])
```
**3.4 — inside `match /users/{userId}`, above `taskFlags`:**
```
      // ROUTE: scoutDecisions — Discover v1. The writer's "added" / "passed" about one community agent (owner-only).
      // "Bring back" deletes the document; Undo deletes it too.
      match /scoutDecisions/{agentId} {
        allow get, list, delete: if isOwner(userId);
        allow create, update: if isOwner(userId) && isValidId(agentId) && isValidScoutDecision(incoming());
      }

      // ROUTE: scoutShares — Discover v1. The writer's own echo of an agent they shared (the submission itself is
      // admin-read only, so this is how the page knows). Keyed by the writer's agent id; created once, never edited.
      match /scoutShares/{sourceAgentId} {
        allow get, list, delete: if isOwner(userId);
        allow create: if isOwner(userId) && isValidId(sourceAgentId)
          && incoming().keys().hasOnly(['at']) && incoming().at is string && incoming().at.size() <= 64;
      }

```
**3.5 — top level, above `genreSuggestions`:**
```
    // ROUTE: agentSubmissions — Discover v1. A writer offers an agent from their own list to the community catalogue.
    // CREATE ONLY, by the writer named in the document, at the deterministic id `{uid}_{sourceAgentId}` — so a second
    // submission of the same agent by the same writer is an UPDATE, which only the admin may make. Reading the queue,
    // checking an agent and promoting it to communityAgents are the admin's acts (the verification tool is not built).
    match /agentSubmissions/{subId} {
      allow read, update, delete: if isAdmin();
      allow create: if isSignedIn() && isValidId(subId)
        && incoming().userId == request.auth.uid
        && subId == request.auth.uid + '_' + incoming().sourceAgentId
        && isValidAgentSubmission(incoming());
    }

```

## 4. Deviations from the mock

- The review STATE switch is not built (as briefed); the dev review aid stands in, absent from production builds.
- Tune offers only the lenses the catalogue can back, and the UK switch only with locations (decision of the existing
  `availableLenses` rule — inert controls don't ship). "Matching on" shows the book's genres and age with a link to
  Manuscripts; the mock's "+ a genre" chip would be an edit control this page doesn't own.
- The queue's foot sentence names only the switches that are on (the mock's is fixed).
- Flags come from `flag-icons` (SVG), for every country, not two inline drawings.
- The share sheet is built (the mock has only a placeholder toast): opt-in rows showing exactly the fields sent.
- With no figures, the catalogue band shows "Your part in it." alone at a reading width (640), and "The catalogue so far."
  states one line instead of numbers.
- The toast is centred on the sheet from the shell's published edges.
- The picks' initials are `AgentDisc` (standing `none`), not the mock's navy/outlined discs: the app's disc law paints a
  disc by the agent's standing with the writer, and a pick is not on the list.
- The Scout's face is extracted from the mock to `public/images/discover/scout-face.webp`; the coming-soon art is the
  named PNG.

## 5. Follow-ups

- **The admin verification tool** (reading `agentSubmissions`, checking, promoting to `communityAgents`) — not built.
- **A client-readable catalogue figures source.** What it takes: a scheduled or admin-triggered Cloud Function that counts
  verified agents (total, this month, by genre) and contributions, and writes one `catalogueStats/public` document the
  rules let any signed-in writer read; then `catalogueFigures()` reads it. Also: make `db.tsx` say when it fell back to
  the local seeds, so the catalogue read could be trusted as a source.
- **Dev's `communityAgents/ca-aoife-murphy.contributedByCount` is 1 (was 0)** — left by the A3 mutation proof, whose point is
  an immediate `+1` a client cannot take back. An admin reset in the console.
- **`notifyPrefs.discover` is stored and nothing sends the email yet.**
- **Lift candidates:** the light header + card + ring (`DvHeader`) beside `ContactLightHeader` and comps v28's
  `LightHeader`; the navy panel; `DvModal`; the two-action toast; the steps card (comps v28's twin).
- `ContactNextStep` (unmounted) still reads `DISCOVER_LIVE` and `notifyPrefs.discover`; a sweep candidate.
- `tests/e2e/rulesProbe.mjs`'s "SENT — clear firstSentAt (must be DENIED)" reads ACCEPTED: rules lines 960–961 allow it by a
  later amendment. A stale probe expectation, unrelated to this pack.

## 6. Retired and re-pointed e2e

See `tests/e2e/RETIRED-discover-v1.md`.

## 7. Dev deploy

- Dev was serving `dev/main-cl18-…-cx28-qhnet-td52` at `180cd3cb` (`index-5Q6l_Tb7.js`) — confirmed against the served
  bundle before branching and again right before the deploy.
- **Dev Firestore rules** (Part A): deployed from that integration branch merged with `discover-v1`, so the dev branch's
  `betaPulse` block went with them (the previous dev release, 12 Oct, predated it). Release `updateTime` moved
  2026-10-12T11:08:25Z → **2026-10-18T11:36:18Z**. After a 60s wait, `tests/e2e/dv1RulesProbe.mjs`: 6 of 6 as expected
  (an add and a share echo accepted, an extra key and two submission shapes denied, `discoverPrefs` leaf accepted and
  restored); the standing `rulesProbe.mjs` shows nothing new.
- **Hosting:** new branch `dev/main-cl18-…-cx28-qhnet-td52-dv1` = `180cd3cb` + `discover-v1` (three list conflicts resolved
  as unions: `plateRoutes.OWN_HEADER_ROUTES` with Analytics v21, `shortcuts.ts` with v138.6's pin, `sidebarCapture` SB9
  with To-do v5.1's `n`). Gates in that tree: tsc clean, Vitest 612 files / 9088 passed / 3 skipped. Built from a clean
  detached worktree of the pushed tip `0fde90b5` and deployed: dev now serves **`index-DugmnfsH.js`**.
- **Then dev moved under me.** Another session built `…-td52-dv1-qc139` (Query Centre v139) on top of my first merge and
  deployed it (`index-CXIRYhLt.js`). Deploying my later tip would have removed their work from dev, so my last two commits
  were stacked on theirs as **`dev/…-td52-dv1-qc139-dv1b`** (`d06446e8`; the same two list unions; gates there: tsc clean,
  Vitest 613 files / 9099 passed / 3 skipped), the served hash re-checked immediately before, and deployed from a clean
  checkout: **dev serves `index-B4WIr-Ea.js`**. Smoke on the deployed site: B2, C2, D2, E2 and the panel's load lock, 7/7.
- Prod hosting, functions and rules: untouched (Nick's).
