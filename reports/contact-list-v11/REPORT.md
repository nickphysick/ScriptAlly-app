# Contact list v11 — the run report (25 Sep)

**All seven phases are on `main` and pushed. Nothing is deployed** (per the go-ahead: no deploy
beyond the dev Firestore rules, which went out with P4 and were probe-verified). The page was
measured against a local build of each phase's tip, served from the measurement worktree at
`http://127.0.0.1:4399` — still running if you want to walk it; the fixture cast is at
`#/contact-lab` (→ "The cast") with no sign-in.

| Phase | Commit | What landed |
|---|---|---|
| P1 | `70496012` | Refs enrolled · view switch retired (`?view=` accepted and ignored) · the centred group + 340px sticky rail shell · "Contact list" in the sidebar (ruling d) |
| P2 | `abe0a491` | The hero: title + facts sentence, the three count cards (multi-select OR), the live add-card over the Archivist — placed from the art's INK, not its box — and the 700 stacking boundary |
| P3 | `2d160183` | The list: header row (Find · Filter · Group · Sort · ↺, the QC pattern lifted into contact components), faceted filter, standing bands, profile-first rows, narrow fold, floating bar |
| P4 | `b838182a` | The pop-up (view + edit, one portal, one shared form) · the Also-changes engine (dry-run through `expectedFor`) · `reopensOn`/`mswlCheckedAt` on Agent + dev rules deploy · the whole drawer era retired (−6,372 lines) |
| P5 | `9f38230c` | The add card (same chassis, same form) · duplicate check with OPEN CARD · ruling (f)'s capture repoint · §8.4 after-add choreography · §11.7's group-move leg |
| P6 | `f24456b5` | Housekeeping: the gap model, both groupings, the counts line, and the three direct fixes (inline window · CHECKED · REMIND ME), rulings (b) and (c) built in |
| P7 | `21490c4b` | CLAUDE.md: the section, the two laws, the old card-grid spec fenced |

**Verification**: `tests/e2e/contactV11.measure.ts` — 25 rendered cases, ~190 assertions, floor
scaled per worker; every lock proved RED first by a targeted mutation in the measurement
worktree (11 mutations across the phases, each red at its own assertion), then the whole suite
green against the dev build. Unit: `contactList` / `contactEdit` / `contactHousekeeping` /
`contactAdd` / `contactFixture` suites, fixture-derived with per-branch tallies, mutation-proved.
Gates at every commit: tsc clean · `vite build` clean by full-log grep · full Vitest
(8,301 passing at close, 498 files).

---

## Your actions

1. **Prod Firestore rules deploy** — `firestore.rules` now carries `reopensOn` (≤64),
   `mswlCheckedAt` (≤64) and `notePreview` (≤512) in `isValidAgent` + the agent update
   allowlist. Dev is deployed and probe-verified; **prod is yours** (`npm run deploy:rules`).
   Until it lands, on prod: the pop-up's Save is denied whole the moment it recomputes a note
   preview (the pre-existing fault below), and the reopen date / CHECKED stamp are denied.
2. **Eyeball pass** — the page is not on dev hosting. Say the word and I'll deploy hosting to
   dev (`build:dev` from a clean checkout of the tip), or walk it on the worktree preview now:
   the hero at 1440 and 1280, the pop-up (view → pencil → the Also-changes note as you change
   the weeks), the add card from the hero card and from its paste strip, and Housekeeping's two
   groupings.
3. **The Housekeeping illustration** — the tray's peek is the Birds-eye hawk head standing in
   (`/images/qc/be-hawk-head.png`); the drawn replacement lands at the same size and position,
   one file.
4. **A Pro measurement fixture, if you want one** — see the harnessPlan finding below. Not
   blocking anything today.

## Findings the build surfaced (beyond the P0 report's false premises)

- **`notePreview` was silently denied on EVERY editor save that recomputed it** — pre-existing:
  the field was never in the agent update allowlist, so the affectedKeys shape failed the whole
  write. Every flip-editor Done that touched notes has been failing on deployed rules for as
  long as both existed. Allowlisted, dev-deployed, probe-verified.
- **The country picker rendered UNSTYLED in the pop-up** — every `.agl-cc*` rule was
  `.aglist`-scoped and the pop-up portals to `document.body` (the portal-scope law's third
  instance on this page). Dressed in contactV11.css under the form's root; locked on the
  rendered portal, proved red by re-scoping.
- **The empty state's slate strip had ALWAYS painted transparent** — `--cle-slate` read
  `--agl-band`, a token only ever declared on the deleted card's `.s-open`/`.s-shut` rules,
  never an ancestor. Repointed at `:root`'s slate.
- **The free cap told the truth**: the harness account is Free at 34+ agents, so `addAgent`
  refuses every UI add on it — which also means the app-level add form has been refusing on
  that account since it crossed 5. The cap is now its own rendered lock; the after-add
  choreography is proven on the lab over the fixture cast.
- **`harnessPlan.mjs`'s set half is dead, rightly**: the user rules' billing guard
  (`incoming().plan == existing().plan`) denies a client flipping its own plan, so the
  packages-era flip → prove → restore pattern no longer exists. Its docstring now says so. A
  measurement needing a Pro window needs a server-side arrangement or a Pro fixture account.
- **§11.4's filter case repaired in passing** — it ticked the FIRST standing blindly and
  `genre ∧ Your move` went empty as the shared account drifted; it now picks a non-zero count,
  the same population-first law its own genre pick already followed.

## Deviations, each with its reason (the running log)

1. **Location is two controls** (City + the ISO country picker) where the mock draws one — the
   rules require an ISO country; free text would be denied in silence.
2. **The trail's verbs route to the Query Centre's asking surface** (Open query / Record a
   response) — one asking surface per card, the house law.
3. **`HERO_STACK_BELOW = 700`, not the mock's 760** — the mock's boundary is its frame's fact;
   the app's column is 758 at a 1440 window (the ref-breakpoint law).
4. **The genre facet has no "Other" row** — it would always be vacuous against the pool.
5. **The notes composer lives in VIEW mode** — the mock's edit face has no notes section.
6. **Ruling (c) extends to the completeness ring**: absent reply time passes the check, because
   a ring that could never fill for an honest "Unknown" is a chore that cannot be done. Only
   the stub `0` blocks it — the same value that raises the gap.
7. **The by-agent grouping shows "+ Reply time" for the live stub-0 shape** — §9.3 lists no
   reply chip (the inline box is the fix), but a live stub-0 agent would otherwise have a gap
   with no action in that grouping.
8. **The add card's link field saves to `website` through the scheme allowlist**; when both the
   link and the website field are filled, the website field wins.
9. **§11.7's "save moves the group" leg landed with P5's suite** (both weather shapes: a stated
   window pulled past, or an unstated one dated), with the restore asserted in the same run.
10. **The duplicate check matches on NAME only** — §8.2 asks whether the model could also match
    agency: it could (both fields are strings and agency-less agents are valid, so neither pair
    is a unique key); an agency match would flag every second agent at a big agency, so I'd
    scope it to *name+agency both matching* if you want it. Proposed, not built.
11. **FILL IN is hidden** (§8.3's own instruction): nothing in the app fetches and reads a web
    page client-side — the only fetchers are the waitlist client and the server-side functions.
    The link field is live; `FromLinkTag` and `FilledCountLine` ship as unused components.

## Follow-ups (none blocking)

- **The §8.3 reader** — when a fetch-and-read exists, FILL IN, the FROM LINK tags and the
  filled-count line are waiting components.
- **`lib/agentList.ts`'s wider sweep** — P4 deleted only what this round dragged dead
  (`agentStateClass`/`agentCardDims`); the P3-era presentation exports (groupAgents, the old
  filter set, sortAgentList…) still have tests and no callers. A fixed-point sweep is its own
  small pass.
- **The QC-controls unification** — the header row's pattern lift is noted in CLAUDE.md; when a
  third page wants the controls, they become shared components.
- **Location has no gap row** — §9.3's table doesn't list one, yet location counts toward
  Complete, so an agent can be incomplete on location alone with nothing in the rail offering
  the fix. Flagged as an open question, not resolved.
- **The v11 page's mobile pass** — the narrow fold is container-driven and locked, but the
  dedicated mobile treatment (and the retirement of the old `agentsMobile` subjects) is future
  work, as it was for the QC.
- **The lab's route wart** (pre-existing): switching views leaves the address without the hash,
  so a REFRESH lands on the app. Accepted when the lab was built; unchanged.
