# ScriptAlly — Project Notes

**CLAUDE.md is the rulebook, not a log. Never append build history, version notes or report summaries here. Reports go to reports/<name>/REPORT.md; a page's lasting decisions go in its docs/decisions file, current state first. Add to CLAUDE.md only a rule that applies to every session, and keep the file under 40 KB — check `wc -c CLAUDE.md` before committing.**

**If merging main brings a CLAUDE.md conflict: take main's CLAUDE.md, then move your branch's added section into the right docs/decisions file.**

The full reasoning, dates and incidents behind every rule below are in `docs/decisions/rules-long-form.md` (verbatim, as it stood before the 11 Nov 2026 diet). Older code comments that say "see CLAUDE.md" for a page, CSS or measurement note: that note now lives in `docs/decisions/` (grep there) or, if superseded, in `docs/archive/claude-md-history-2026-11.md`. Never load the archive by default.

## Working discipline

### Repo and branches
- **Direct-to-`main` only.** No feature branches, no PRs, no auto-merge (solo dev, no live users). If you find yourself creating a branch or opening a PR, stop.
- **CI-on-push stays** (`.github/workflows/ci.yml`: typecheck + tests + build on every push to `main`). It is the safety net, not PR gating. Its per-ref `concurrency` group with `cancel-in-progress`, and `ci-retry.yml` (re-runs a failed run ONCE, only when every job executed zero steps), must not be removed casually.
- **A red CI email is not necessarily a red build.** A job that never got a runner ends run-`failure`/job-`cancelled`. The tell is `runner_name` in `gh api repos/<o>/<r>/actions/runs/<id>/jobs`: a real failure names a machine and has steps. Before blaming the repo for any CI oddity, check `githubstatus.com`. `gh workflow run CI --ref main` re-verifies the tip when a run went missing. Detail: docs/decisions/testing-measurement.md.
- **One active session per working tree.** For parallel work, each session gets its own worktree: `git worktree add ../ScriptAlly-<task> main`. End state is normally just `/Users/nickphysick/ScriptAlly-app`.
  - **Every worktree is ~1.2 GB; abandoned ones filled the disk (19 Oct: 43 worktrees, 40 GB).** The session that creates a worktree removes it before it ends (`git worktree remove <path>` once committed and pushed); the wrap-up says it is gone, or names it and why it was kept. Measurement, integration, deploy and "-base"/"-gate"/"-int" worktrees are disposable; put deploy checkouts in the scratchpad.
  - Before `git worktree add`, run `git worktree list`; if more than 5 exist besides the primary, tell Nick and offer to clean the clean ones first.
  - Never remove a worktree with uncommitted edits. For a clean one with untracked files: copy the strays to `~/ScriptAlly-backups/worktree-strays-<date>/<name>/`, then `git worktree remove --force`, then `git worktree prune`.
  - Never add a second `node_modules` — symlink the primary's.
- **Read `git log --oneline -8` before starting a phase.** A hand-off is a claim about the repo, not the repo; a whole phase was once rebuilt that had already landed.
- **Step 0, before any recon: confirm the worktree is level with `main`** (`git rev-list --count HEAD..main` = 0).
- **Before any task:** `HEAD` on `main` and the tree clean, or STOP and report. Never `git switch` / `git stash` / `git checkout --` / `git restore` / `git clean` a checkout another session may be holding.
  - **`git commit --amend` is on that forbidden list**: in a shared checkout HEAD is whoever committed last, and `--only` scopes the content, not the target. A slip in your own commit gets a new commit; never rewrite again to undo a rewrite.
  - **To establish provenance of a red, read — do not move.** `git status --short -- src/` names whose files are dirty; the failing test's imports name what it exercises. Never stash someone else's files "just to check".
- **Stage by explicit path** (`git add <path>` then `git commit --only -- <paths>`); never `git add .` / `git add -A`. `git diff --cached --name-only` lists only your paths.
  - `git commit --only -- $(git diff --cached --name-only)` drops the delete half of every rename: use `--name-status` and take both sides of an `R`.
  - After staging (and after committing), `git status` must show a clean tree before the gates are believed; a file left out means the suite ran against a tree the commit does not contain.
  - In zsh, an unquoted `$VAR` is not word-split: pass directories or an array, not a newline-joined list.
- **Write commit messages with `git commit -F <file>`, never `-m "…"`** — a backtick in a double-quoted string is command substitution and silently deletes words. Repair a bad message with a follow-up commit, never `--amend`.
- **A commit message states what its diff does.** Before writing "removes X" / "unmounts Y", run `git diff --cached -- <paths> | grep "^-" | grep X`. A claim about the whole tree ("nothing else calls this") says what was grepped. A claim about what is mounted needs a reachability check (trace callers to a rendered root, both directions), not a definition check.
- **When a pass introduces a replacement, the thing it replaces is deleted in the same commit.** Compare near-identical siblings with `diff`, never by reading, and check their ids before deleting either.
- **A deferral is written in the next prompt's out-of-scope list, never as a `// until Phase N` comment.**

### Gates
- **Gates green before every commit, with `set -o pipefail`** — which gates, and how often the full suite runs, is "Testing and machine load" below. Never pipe a gate into anything before reading its exit code — `tsc … | tail -3 && echo CLEAN` prints CLEAN over real errors.
- **Read the build output in full or grep it** (`npx vite build 2>&1 | grep -inE "error|\[WARNING\]"`; the chunk-size note is the one expected match). Never `tail` alone: CSS diagnostics print near the top and exit 0.
- **`npx vitest run` can exit 1 with zero failed tests** (`Error: [vitest-worker]: Timeout calling "onTaskUpdate"` under CPU load). Read the counts: a real red names the file and the case.
- **Read the output before you commit.** Chain the gate to the commit with `&&`, or read the counts and commit as a separate act — never a gate and a commit in one block where the commit runs regardless.
- **The root typecheck does not cover `functions/`.** After touching it run `npx tsc --noEmit -p functions/tsconfig.json` (`functions/` is CommonJS: `import.meta` fails there with TS1343 while Vitest passes).

### Runtime traps that pass every gate
- **`tsc` does not catch the TDZ bug.** A `const` read during render from a hoisted helper, or from a `const` IIFE declared above it, compiles clean and throws at runtime. TS2448 is a signal to audit every render-time read in that function. The rule is ORDER: anything a render-time expression reads is declared above it — lockable as `indexOf(dep) < indexOf(consumer)` with both halves asserted.
- **Initialisation calls go at the end of a module**, never at the foot of a block a later block extends. Assert the initial render state in a test.
- **Comments are not guards.** A constraint worth a `⚠️` comment is worth a test that fails when someone breaks it.
- **A new routed page ships with a smoke test from day one** — one entry in `src/test/pageSmoke.tsx`'s census plus one file asserting it renders and one chrome string. Smoke the populated state too where the page branches to a first-run panel. This repo's tests read SOURCE (`environment: 'node'`, no jsdom); a source test cannot see a runtime crash. Inventory: `reports/app-smoke.md`.

### Deploys (summary — full rules under Deployment below)
- **PROD deploys are Nick's only — never Claude** (hosting, functions, rules; `firebase.json` / `firebase.holding.json`). Dev hosting deploys whenever Nick asks; dev Firestore rules are Claude's to deploy.

## Disk hygiene and the emulator guard
- **Every emulator run goes through `scripts/emu-guard.mjs`**: `npm run e2e:emu` / `dev:emu` / `emu:seed` / `test:rules` / `test:functions`. **Never call `firebase emulators:*` directly** (`src/test/emuGuard.test.ts` fails on one). The guard refuses under 20 GB free (`EMU_MIN_FREE_GB`), points `*-debug.log` at `/dev/null`, kills the run under 10 GB, removes logs and `dist-emu/` on exit. To read a log: `EMU_DEBUG_LOG=1` (deleted on exit) or `EMU_DEBUG_LOG=<absolute dir>` (kept); a log over 200 MB (`EMU_MAX_LOG_MB`) kills the run.
- **Never run a test suite in a loop or an unattended repeat.** One run, read the result, act.
- **Step 0 of every session: `df -h ~`. STOP if under 20 GB free.**
- **End of every session that made a worktree:** commit, or list in the report, any uncommitted work; then `git worktree remove` your own worktree and delete its `node_modules`, `dist-emu` and emulator data. Never force-remove one with uncommitted `src/`, `functions/` or `design-refs/` changes.
- **Never touch another session's worktree, its emulators or its ports.** Stop only processes you started — confirm the full command and path, never kill by port.

## Worktrees, quick lane and deploy batch
- One session per worktree, enforced by hooks (`scripts/worktree-claim.mjs status | release <root> | release-dead`). If blocked, use your own worktree — never work around a claim.
- QUICK LANE — prompt starts "QUICK LANE": work in the named worktree (must hold its claim); no new worktree, no npm install unless package.json changed, no baseline runs; checks = tsc --noEmit + only the spec(s) covering the change, through the test slot; no fidelity passes, older-version suites or full suite; one commit per change (git commit --only); no deploy; end with one line: sha + what changed + "for tonight's deploy batch". If the change touches status derivation, recomputeQuery, Firestore/Storage rules, import, functions or money/entitlements: STOP — full lane.
- FULL LANE — new pages, journeys, logic changes: normal prompt structure.
- DEPLOY BATCH — prompt starts "DEPLOY BATCH": one full suite on the line through the slot, then one dev deploy. If red, find the breaking commit by its own spec and report; don't deploy.

## Testing and machine load
- Heavy runs (emulator, e2e, Playwright) go through the test slot via npm scripts only (`scripts/heavy-slot.mjs`: one heavy job at a time on this Mac, queued, low priority, leftovers swept); hooks enforce it. If you're queued, wait or do non-test work — never work around the slot.
- Run only the specs covering what you changed. One full suite at the end, only for logic changes (status derivation, recomputeQuery, rules, import, money/entitlements). Visual, copy and docs changes: typecheck + build + the touched specs only.
- Red-before proofs only for logic locks, not for visual or copy checks.
- One baseline (tsc/build/Vitest) per session, not per phase.
- Never chain runs. One run, read it, act.
- Never leave dev:emu or vite preview running at the end of a session.
- Slot by hand: `node scripts/heavy-slot.mjs status | sweep --dry-run | release`; hooks install with `npm run hooks:install`.

## Firestore off production — the emulator is the default
- October's bill was £46 with no live users, from our own tooling reading the dev database (report reports/firestore-bill/REPORT.md).
- **Local work runs on the emulators under `demo-scriptally`**: `npm run dev:emu`, `npm run e2e:emu [-- playwright args]` (builds into `dist-emu/`, serves on **127.0.0.1:4321** — not 4190, a fetch-spec bad port), `npm run emu:seed`. Java 21 is the keg-only Homebrew openjdk@21; `scripts/emu.mjs` puts it on PATH. **Ports are `firebase.emulator.json`'s: Firestore 8085, Auth 9095, Storage 9195, hub 4405** — never firebase.json's 8080/9099/9199, which `test:rules`/`test:functions` use.
- **A live run is opt-in: `ALLOW_LIVE_FIRESTORE=1`.** Without it `playwright.config.ts` refuses any non-localhost base, `bundleGuard` refuses a bundle without `demo-scriptally`, and every Node script refuses `scriptally-dev`. Prod is refused even with it, except `scripts/backfill-founding-numbers.mjs` (Nick's admin tool).
- **Every script gets its config from `tests/e2e/fsTarget.mjs` (`targetEnv()`), never `.env.development`.** Use `getFirestore` (not `initializeFirestore`). `src/test/firestoreTarget.test.ts` fails on any entry point that creates a Firebase app without it.
- **The emulator's harness account is `tests/emulator-seed/harness.json`** (a copy of the live account, 2 Nov), re-made only on purpose (`ALLOW_LIVE_FIRESTORE=1 node tests/emulator-seed/exportHarness.mjs`). `tests/emulator-data/` is committed WITHOUT its auth half (the repo is public and the export stores plain passwords); every session makes the harness login first (`tests/emulator-seed/authUser.mjs`). Every e2e run imports that snapshot and exports nothing. Functions are not emulated.
- The app keeps a persistent Firestore cache (IndexedDB, multi-tab); `communityAgents` is keyed on `currentUser?.id`.
- `npm run e2e:emu` collects the whole suite as one command. **Check a new spec collects with `SA_E2E_BASE_URL=http://127.0.0.1:4321 npx playwright test --list` before a long run.** `tests/e2e/emulatorTarget.measure.ts` fails on any live Firebase host.
- Left alone deliberately: the per-query `activity` loops in `deleteManuscript`/`deleteAgent`.

## Deployment
- **`/Users/nickphysick/ScriptAlly-live` is the only prod deploy folder. Prod only ever ships the pushed tip of `release/live-1`** (preflight check 4c fails otherwise). Small landing changes: commit on `release/live-1`, push, then `npm run deploy:live-hosting` (Nick's to run). Never deploy prod from a scratch worktree.
- **Every `firebase deploy` names its target with `--project`.** A bare deploy resolves `.firebaserc`'s `default`, which is **prod** (`gen-lang-client-0801391782`).
- **Dev hosting (on request):** `npm run build:dev && firebase deploy --only hosting --config firebase.dev.json --project scriptally-dev` → https://scriptally-dev.web.app. Hosting-only unless functions or rules changed.
- **Dev can carry several unmerged branches.** Before any dev deploy, name the branch the served bundle was built from; if it is not yours, merge yours into it as a new branch and deploy that. A bundle-hash mismatch is a stop.
- **The deploy source is a clean checkout of the pushed tip, never the working tree.** Use `set -e`, `cd /tmp/wt || { echo STOP; exit 1; }`, `git worktree prune` before `add`, and `test -z "$(git status --porcelain)" || exit 1` after the `cd`. `cd X && …` is not a guard. Confirm the served bundle hash against the build.
- **A failed deploy check is a STOP.** Fix the tree, re-run the check, then deploy; never reason past it.
- **Dev Firestore rules are Claude's to deploy; prod remains Nick's.** One command: `firebase deploy --only firestore:rules --config firebase.dev.json --project scriptally-dev`. Never prod, never hosting in the same act. Before: grep `firestore.rules` for the fields it should carry (missing → STOP, the tree is wrong). After: verify by the release `updateTime` under `--debug` (the success line never names the database), wait for propagation, then run `node tests/e2e/rulesProbe.mjs`.
- **`rulesProbe.mjs` returns a vintage** (which commit the deployed ruleset stops at), not a yes/no — use it instead of inferring from a denial. A denial can also be the document id: `isValidId` requires `^[a-zA-Z0-9_-]+$`; sanitise generated ids at construction.
- **Each project has exactly ONE Firestore database:** prod → `ai-studio-ae82196c-c59e-40b9-b209-9fb02f67ade6` (no `(default)`); dev → `(default)`. Prod rules: `npm run deploy:rules` (Nick). Functions are europe-west2; a transient dev "Internal error" — retry.
- **Functions run on Node 22** (`engines.node` in `functions/package.json`); `release/live-1` still says 20 and needs the same change before any prod functions deploy.
- **Prod:** Nick only; `git push`, then a deploy naming the prod alias (app site `scriptally-app`).
- Waitlist and founding-invite deploy rules (`/api/waitlist` not in `firebase.json`, the rewrite block, deploy order function → rules → hosting, verify idempotency, the prod counter): docs/decisions/landing-public.md.

## Functions — the database is named on both tiers
- **`admin.firestore()` resolves to `(default)`, and prod has none.** Dev cannot adjudicate this: a correct fix, a broken fix and no fix look the same there.
- Client reads `VITE_FIREBASE_DATABASE_ID` (`src/lib/firebase.ts`); functions read **`FIRESTORE_DATABASE_ID`** from `functions/.env.<projectId>` (never `FIREBASE_*` — a reserved prefix).
- **No function may call `admin.firestore()` or `getFirestore(`**: `functions/src/firestore.ts` owns the one handle; `firestoreHandle.test.ts` enforces it, with an exempt set of exactly `["waitlist.emulator.spec.ts"]` whose size is asserted.
- On a project with no `(default)`, the resolved id may not be `(default)` — functions refuse to start rather than write nowhere.
- **Prod's `functions/.env.gen-lang-client-0801391782` is Nick's to create** (template `functions/.env.example`) before the next prod functions deploy. `functions/.env.scriptally-dev` states `(default)` explicitly on purpose.
- A source-scanning lock matches its own search terms: skip the scanner by name, never weaken the pattern.

## Conventions and invariants (every session)
- **UK spelling** in UI copy, comments and docs.
- **`QueryStatus`:** always the exact enum strings from `src/types.ts` (e.g. `"Partial Requested"`, `"Revise & Resubmit"`); `src/types.test.ts` guards them.
- **Derived over stored.** Pipeline fields come from the activity log through `recomputeQuery`, the single writer of a query's derived fields; nothing else writes them. Activity without `resultingStatus` is ignored by it.
- **One event order: `byEventOrder` (`src/lib/queryDerivation.ts`)** — time, then document id, then original index. Every surface that orders a query's events uses it.
- **Undo** deletes the activity records the action created or modified — never compensating entries. An undo that restores nothing is worse than none: capture before destroying, restore every store together, recompute once at the end. A no-op `undo` closure satisfies the type; never pass one.
- **Response counting:** each query counts as at most one response, regardless of stage.
- **Package slots:** the three `SubmissionPackage` slot fields use `""` for an unfilled slot (`UNFILLED_SLOT`, `isSlotFilled` in `src/lib/packageMetrics.ts`); `firestore.rules` requires all three keys present.
- **A default branch may not perform a write.** Declare the union, switch over it, close with `const unhandled: never = x`. Tests assert the write, not the label.
- **If the UI offers a choice the type cannot represent, the type is wrong** — never map it to a nearest neighbour or invent a default (a fabricated value reads like a real one).
- **An edit that changes a value read elsewhere says what it changes, computed by a dry run through the real code**, never by shortcut arithmetic.
- **Copy asserts only what the code does today.** Grep for the thing that performs a behaviour before writing a sentence about it; ship without a placeholder figure rather than with brackets or a guess.
- **QueryHawk never writes for the writer** (no drafted emails or letters).
- **No gendered pronouns for an agent anywhere the user can read** — name them, say "the agent", or use they/them. Carve-out: pronouns in seeded fiction (characters, loglines) and historical quotes are the writer's words; read every match, never automate this fix.
- **Terminology:** an agent with no queries is "Not queried" (older surfaces said "idle"); the page is the Contact list; never invent a third word for an existing state.
- **Free plan limits are code, not copy:** one manuscript on Free (`FREE_MANUSCRIPT_LIMIT`, read off the entitlement resolver); no agent cap on any plan from plan rules v1.1 (`planLimits.test.ts`), though main's own `addAgent` caps Free at 5 until the dev line merges; read the code before stating a number.
- **StatusDot is the only thing that draws a query's status.** The ring set: dashed ring = the agent has asked; solid = you sent it; half centre = a partial; full centre = a manuscript; no centre = nothing in play; bar = closed; Offer is a document outline. Shape carries everything, colour carries nothing; a closed query's outcome is named in words. `--sd-hue`/`--sd-centre` stay (other readers). Evidence: docs/decisions/design-system-css.md.
- **An Escape cascade is one handler**: the outer surface owns the key and asks whether the inner one is open first (`src/lib/escapeStack.ts`, `ESC_LEVEL`).
- **Every workspace page stays mounted**, so a hard-coded `id` is a duplicate the moment a second surface renders the component: give it an id prefix first. Probes query the visible page (`visiblePage()`), never `document`.
- **Never size to the viewport with a constant offset**; derive height from the element's own measured top, or read a published measurement (`--wpg-port-h`, `--wpg-stuck-h`). Detail: docs/decisions/design-system-css.md.
- **A layout claim is verified by measuring the rendered page** (`npm run e2e` / `e2e:emu`); "landed (code + unit)" and "landed (measured)" are different claims. A phase whose measurement has not run is not landed. Read docs/decisions/testing-measurement.md before writing any lock or measurement.
- **A measurement names its target** (`SA_E2E_BASE_URL` is required; prod is refused) and refuses a bundle older than its sources (`bundleGuard`). Bind `vite preview` with `--host 127.0.0.1`.
- **A measurement that writes restores in the same run**, and nothing navigates between a commit and its Undo.
- **A mutation is run and undone in the measurement worktree**, never with `git checkout` in the primary checkout; backup names come from the full path (macOS is case-insensitive).

## Dev-only routes and locked surfaces
- Dev-only lab routes (`#/contact-lab`, `#/onb-lab`, `#/shell-lab`, `#/status-dots`) are gated on `MODE`/`import.meta.env.DEV`; a review aid's call site carries its own mode gate so production ships none of it. Grep the production bundle for a lab's names before a prod release; remove any dev route that has outlived its purpose before it reaches prod.
- `#/pkg-lab` and its six components are deleted (25 Aug). `AllManuscripts.tsx` (the book profile) is locked and unit-tested and rendered by no route — do not delete or edit it casually.
- Locked files need an explicit reason in the brief to change: `src/types.ts` (the data contract) and `firestore.rules` (any field outside an update allowlist's `hasOnly()` is denied silently; prod rules deploys are Nick's).

## Loose ends
- **Response deadline:** one source, `src/lib/responseDeadline.ts` (`computeResponseDeadline`); about five inline copies remain — repoint opportunistically, keeping each one's anchor and format.
- **Security:** the `ANTHROPIC_API_KEY` rotation was advised and never confirmed. Verify before further Functions work, and never paste a key into chat.

## Page decisions — read ONLY the file(s) for what you are working on
Each file starts with a "Current state" summary; sections are newest first.
- Query Centre → docs/decisions/query-centre.md — before touching src/components/queries/ (incl. centre/), the query panel, or any Query Centre ref
- Contact list (agents) → docs/decisions/contact-list.md — src/components/agents/, the agent card and panel, Housekeeping, agent location
- Dashboard → docs/decisions/dashboard.md — src/components/dashboard/, the activity feed drawer
- Responses → docs/decisions/responses.md — `/queries/responses`, lib/responses.ts
- Submission packages and materials → docs/decisions/packages-materials.md — `/manuscripts/packages`
- Comparable titles → docs/decisions/comps.md — `/manuscripts/comps`, comps model
- Corkboard → docs/decisions/corkboard.md — `/todo/corkboard`
- To-do list → docs/decisions/todo.md — src/components/todo/, the tray and desk, the task pane
- Onboarding and import → docs/decisions/onboarding-import.md — src/components/onboarding/, src/components/import/, Smart Import
- Landing and public pages → docs/decisions/landing-public.md — src/marketing/, holding/, the waitlist and founding flow
- App shell, navigation and headers → docs/decisions/shell-nav-header.md — src/components/shell/, PageHeader, PanelHeader, the sidebar and bar
- Analytics → docs/decisions/analytics.md — `/queries/analytics`
- Manuscripts → docs/decisions/manuscripts.md — `/manuscripts`, AllManuscripts.tsx
- Discover → docs/decisions/discover.md — `/agents/discover`, the Scout
- Query actions (the drawer) → docs/decisions/query-actions.md — src/components/queryActions/, every journey

Cross-cutting (read when the task touches it):
- Testing, measurement and the e2e harness → docs/decisions/testing-measurement.md — before writing or trusting any lock, measurement or harness run (incl. the `seed.mjs` fixture rules)
- Design system and CSS layout → docs/decisions/design-system-css.md — before CSS, layout or token work
- Codebase facts → docs/decisions/codebase-facts.md — eight beliefs checked against the code (26 Aug)
- The full text of every rule above → docs/decisions/rules-long-form.md
- How this file was cut down, line by line → docs/claude-md-diet/MAP.md
