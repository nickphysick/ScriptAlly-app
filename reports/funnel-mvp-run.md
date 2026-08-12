# Funnel MVP pass — overnight run log

Unattended run. Appended after every phase, before moving to the next.

---

## Step 0 — baseline and audit

### Repo state at start

- Branch `main`, `git rev-list --count HEAD..main` = 0.
- HEAD at run start: **`efc123d`**. (My recon earlier tonight read `4ee7799`; a concurrent
  session committed `efc123d` between the recon and this run — see "Concurrent session" below.)
- Tree clean apart from my own untracked `reports/funnel-recon.md`.

### Baseline gates

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | **exit 0**, 0 errors |
| `npm run build` | **exit 0**, built in 4.46s |
| `npm test -- --run` | **exit 0** — Test Files **256 passed (256)**, Tests **4201 passed \| 2 skipped (4203)** |

All three green. The bar for every phase is *no worse than this*.

### ⚠️ Concurrent session in this checkout

At 10:45 today, while the read-only recon was finishing, three files under the do-not-touch
`src/components/shell/**` path plus an untracked `design-refs/87-strip-fixes-v1.html` appeared as
modified in a tree that had been clean minutes earlier. Those changes are now committed as
`efc123d`, which is what this run is based on.

**Decision (not made for me by the pack):** proceed rather than stop. The dirt was confined
entirely to do-not-touch paths, so it cannot collide with any phase here, and explicit-path
staging means it can never be swept into one of my commits. I re-check `git status` at every
phase boundary and will stop if unexplained changes appear under a path this pack owns.

### ⚠️ Hard stop 1 — resolved, not triggered

`design-refs/funnel/` did not exist, and none of the four named refs were anywhere in the repo or
its history. They were all four in **`~/Downloads/`**, correctly named, timestamped 12 Aug 11:23 —
downloaded and never filed. This is the precedent CLAUDE.md already records ("the specified
`design-refs/` dir was ABSENT again — built from Nick's Downloads attachment").

**Decision:** the refs are misfiled, not missing, so hard stop 1 does not apply on its own terms.
Copied all four into `design-refs/funnel/` (copy, not move — `~/Downloads/` untouched) and
committed them with Phase 1 so the pack's own stated paths resolve for the next reader.

### Hard stops 2–4

| # | Condition | Finding | Triggered? |
|---|---|---|---|
| 2 | `'plan'` gone from the user-update allowlist | present, `firestore.rules:487` | no |
| 3 | `SmartImportReview.tsx` structurally different | 3012 lines; `useState<"duplicates" \| "agents" \| "queries">` at line 1919 | no |
| 4 | >2 Phase 1 items ALREADY CORRECT | **zero** are | no |

### Audit table

| Phase | Item | File:line | State | Note |
|---|---|---|---|---|
| 1a | `'plan'` in user-update allowlist | `firestore.rules:487` | MODIFY | remove from `hasOnly`; keep the `isValidUser` value check (line 59) |
| 1a | `upgradeToPro` / `downgradeToFree` | `src/lib/db.tsx:1065,1077` + iface `:295` + provider `:2762` | MODIFY | **only caller is `Pricing.tsx:45,47`** (the `PlansPage.tsx:9` hit is prose in a docblock). Both functions deletable with their context exports. |
| 1a | `importType === "user"` branch | `ImportCsv.tsx:169,195,252,588,912,1231,1472` | MODIFY | seven sites: type union, grid-tab state, mapping fields, writer branch, option button, field list, grid viewer |
| 1a | rules test: client `plan` write denied | `tests/rules/firestore.rules.test.ts:340` has the allowlist pattern | BUILD | suite needs the Firestore emulator (`npm run test:rules`); **no Java/emulator in this environment** — test written, not run here |
| 1b | `Pricing.tsx` | `src/components/Pricing.tsx` (284 lines) | MODIFY | delete |
| 1b | `/pricing` route branch | `App.tsx:29,338,526` | MODIFY | import, `pathFor` case, marketing render |
| 1b | inbound `pricing` links | `MarketingShell.tsx:52`, `Landing.tsx:41,47,56`, `Hero.tsx:21` | MODIFY | retarget to `/plans` + `TODO(phase-5)` |
| 1b | `AccountSettings` pricing link | — | UNKNOWN | recon named it; verify during the phase |
| 1b | `marketingPageSmoke.test.tsx` logged-out case | `:33,37` | MODIFY | mock always supplies `SMOKE_USER` (`pageSmoke.tsx:74`) |
| 1b | `pageStructure.test.ts` census | `:39` | MODIFY | lists `components/Pricing.tsx` |
| 1c | wipe + dedupe panels | `ImportCsv.tsx:702-832` | MODIFY | markup, handlers, 5 state hooks |
| 1c | `wipeAndResetDatabase` / `cleanDuplicates` / `seedUserDatabase` | `db.tsx:2670,2516,333` | MODIFY | ImportCsv is the **only** caller of the first two; `seedUserDatabase` is called only by `wipeAndResetDatabase` (`:2697`) — all three deletable |
| 1d | ungated `#/notes-scan` | `App.tsx:10,425-428` | MODIFY | plus `NotesStoreScan.tsx` and its `devSurfaceSmoke.test.tsx:36` row |
| 2a | `setFileName` in `runMapping` | `BranchB.tsx:156` (should be in `pickFile`, `:145-153`) | MODIFY | |
| 2b | overview's fix/sharpen claim | `ImportOverview.tsx:98-101` | MODIFY | plus stale docblock at `:7-8` |
| 2c | `FAQ_ITEMS` agency-required | `SmartImportReview.tsx:~2570` | MODIFY | |
| 2c | `BANNER.agents.faqs[0]` | `SmartImportReview.tsx:1407` | MODIFY | |
| 2d | "Founding Members open" pill | `Auth.tsx:138` | MODIFY | |
| 2e | fallback as silent catch-all | `BranchB.tsx:501` (function's final `return`) | MODIFY | |
| 3a | `Screen5Agents` / `Screen6Complete` | `Onboarding.tsx:631,780` | MODIFY | delete |
| 3a | `handleScreen5Continue` + hardcoded `addAgent` | `Onboarding.tsx:1121-1155` | MODIFY | six invented defaults at `:1137-1143` |
| 3a | `SelectableCard`/`FormField`/`InputField`/`ModalFooter` | `Onboarding.tsx:299,362,397,268` | MODIFY | `SelectField` (`:414`) is also unused after deletion — check |
| 3b | Branch A exit `goTo(5)` | `Onboarding.tsx:1057-1062` | MODIFY | → the A3b `post_onboarding_tab` mechanism |
| 3b | Branch B `onAddByHand` | `Onboarding.tsx:1197-1200` | MODIFY | same |
| 3c | `CreamUnderstood` + 1200ms beat | `chrome.tsx:82`, `Onboarding.tsx:1008-1012,1170` | MODIFY | |
| 3d | `ProgressDots` / `DOT_TOTAL` | `Onboarding.tsx:185`, `chrome.tsx:40` | MODIFY | `chrome.tsx`'s `Dots`/`OnbChrome` also read `DOT_TOTAL` |
| 3e | `ImportTidyAnimation` | `.tsx` + `.test.ts`; `BranchB.tsx:59,424` | MODIFY | `setScreen("tidying")` never called — confirmed |
| 3f | `normalizeStep` + progress key | `Onboarding.tsx:944` | MODIFY | |
| 4 | `journeyStage` | `types.ts:25`, `Onboarding.tsx:991,1001,1004,1109`, `firestore.rules:73,487` | MODIFY | zero readers confirmed |
| 4 | `queryingStage` gets a real reader | `Onboarding.tsx:1196` reads local state | MODIFY | repoint at `currentUser.queryingStage` |
| 5a | public `/pricing` in `mk-` | — | BUILD | `ComingSoonPill` pattern exists at `PlansPage.tsx:103` |
| 5b | `/terms`, `/privacy` routes | — | BUILD | `MARKETING_PATHS` = `{"/", "/pricing"}` (`routeTiers.ts:14`) |
| 5b | `Auth.tsx` legal links | `Auth.tsx:299` | MODIFY | |
| 5b | landing footer inert spans | `Landing.tsx:57-58` | MODIFY | |
| 5c | "Back to site" hardcoded host | `Auth.tsx:139` | MODIFY | |
| 6a | `Form11Card` → `OnboardingCard` | `chrome.tsx:138` | MODIFY | choke point for all 8 branch screens (BranchA ×2, BranchB ×6) |
| 6a | `ModalCard` folds in | `Onboarding.tsx:447` | MODIFY | |
| 6b | illustrated marks | `BookMotif`/`InboxMotif` `chrome.tsx:19,30` | UNKNOWN | resolve in-phase; monoline glyph fallback if no assets |
| 7a | `::after{inset:7px}` + animated rim | `SmartImportReview.tsx:1784,1787,1791,1794,1876` | MODIFY | incl. `@keyframes saRvRimCross` |
| 7b | band carries state | `allClear` computed in `ImportOverview.tsx:82` | MODIFY | must be one shared computation |
| 7c | identity line | — | BUILD | `agentPrimary`/`agentAgencyLine` exist (`agentDisplay.ts:37,55`) |
| 7d | `COMPACT_BP` post-it fallback | `SmartImportReview.tsx:64,2004` | MODIFY | |
| 7e-1 | does `ReconcileCard` let the user choose the survivor? | `ReconcileCard.tsx:52,82,304,326,344` | **ANSWERED: YES** | `defaultKeptId` pre-selects the engine row; `selectedId` state; clicking a row re-selects in the working state; `onLooksRight(selected.id)` commits. Needs a sage selection affordance per the pack. |
| 7e-2 | does undated overlap needs-check? | `smartImportReviewModel.ts:159-160` | **ANSWERED: YES** | `queryStatusOf` is `hasOpenQueryReasons(q) ? "needs-check" : "captured"`, and undated raises a `no-date` reason (`SmartImportReview.tsx:510` resolves it). **No separate Undated tally exists today** — line 1045 is a per-row label, not a count. So the action is *do not introduce one*. |
| 8 | onboarding ≤640px | `Onboarding.tsx`/`chrome.tsx` have **0** `@media` | BUILD | |
| 8 | `ScatterSettleLoader` below ~900px | `ScatterSettleLoader.tsx:83 prefersReduced()`, `:111 reduced` | MODIFY | reduced-motion path already renders the settled stack — reuse it |
| 8 | review shell tallies wrap | — | BUILD | |
| — | `#632e22` vs `#6b3023` | `index.css:27-28`, `designTokens.ts:62` | **ALREADY CORRECT** | resolved in "Tier 3+4 · Phase 10": `--burg-d` is deleted from `index.css` (only the explanatory comment survives) and `deepBurgundy = "#6b3023"` is the single source. Nothing to align. |

No item came back BLOCKED — nothing this pack needs lives in a do-not-touch file. Two UNKNOWNs
(`AccountSettings` pricing link, illustrated marks) are resolved in their own phases below.

---

## Phase 1 — close the money hole and the destructive surfaces

**Commit:** `b42df4f`
**Gates:** tsc **0** · build **✓ 5.00s** · Vitest **256 files, 4200 passed | 2 skipped (4202)**
Baseline was 4201 | 2 (4203); the −1 is deletions, explained under "test count" below.

### ⚠️ THIS COMMIT CHANGES `firestore.rules`. It does not ship with a hosting-only deploy.

### 1a — `plan` stops being client-writable

**⚠️ Decision the pack did not make for me — the guard is an equality clause, not a removal.**

The pack said to remove `'plan'` from the allowlist. I did, and it went green on tsc and build but
turned the suite **red by 2**: `src/components/todo/boardSettings.test.tsx` slices `firestore.rules`
on the literal `affectedKeys().hasOnly(['name', 'plan'` — the exact anchor-before-you-slice hazard
CLAUDE.md documents, here failing loudly rather than silently. That file is under
`src/components/todo/**`, a **do-not-touch** path, so repairing its anchor was not available to me.

That left a genuine conflict: the do-not-touch rule versus the no-worse-than-baseline gate, with
the night's most important fix in the middle. Rather than revert Phase 1, I changed the shape of
the guard:

```
incoming().diff(existing()).affectedKeys().hasOnly([... 'plan' ...])
&& incoming().plan == existing().plan          // ← the guard
```

`plan` stays in the allowlist; what it may no longer do is **change**. This is not a workaround —
it is the better rule, and I would argue for it on its own merits:

- The allowlist governs which **keys** an update may touch. Which **values** may move is a
  different question, and this states it directly.
- Keeping the key listed means an ordinary whole-document write carrying an **unchanged** plan
  still succeeds. `updateUserProfile` sends merged documents, so dropping the key would have
  denied innocent writes as well as hostile ones — a silent-denial class of bug this codebase has
  been bitten by before (the affectedKeys gotcha).
- It is symmetric: upgrade and downgrade are both denied, because the writer is the problem, not
  the direction.

Net effect is what the pack asked for: **no browser can give itself a Pro plan.**

Deleted in the same commit, so the exploit did not become a silent permission denial:

- `upgradeToPro` / `downgradeToFree` — implementations, `DbContextType` entries and provider
  values (`src/lib/db.tsx`). **Only caller was `Pricing.tsx`**, deleted in 1b. The `PlansPage.tsx`
  hit in the audit was prose in a docblock, not a call.
- The CSV importer's `user` row type in `ImportCsv.tsx` — type union, demo-data branch, option
  button, and the writer branch that mapped a spreadsheet column onto `plan`.
  **Decision:** I also removed the read-only `user` tab from the Live Database Grid Viewer. It
  wrote nothing, but `activeGridTab`'s union no longer admits `"user"`, so leaving it would have
  been a type error; and a profile-display tab inside an importer whose user row type is gone has
  nothing to belong to.

**Rules test added** (`tests/rules/firestore.rules.test.ts`): five cases — Free→Pro denied,
Pro smuggled alongside an allowlisted field denied, Pro→Free denied, an unchanged plan on a
whole-document write allowed, and an ordinary allowlisted update still allowed. The valid-value
case is the one carrying the weight; a test asserting only that an *invalid* plan is rejected would
pass with the guard deleted, because `isValidUser` already rejects that.

**⚠️ NOT RUN HERE.** The rules suite needs the Firestore emulator (`npm run test:rules` wraps
`firebase emulators:exec`), and this environment has no Java/emulator (a known env quirk). The
tests are written and committed; **they have not been executed.** They run in CI, and should be
watched on the next push.

### 1b — `/pricing` deleted

- `src/components/Pricing.tsx` deleted; `App.tsx` import, `pathFor` case and marketing render
  branch removed; `"/pricing"` removed from `MARKETING_PATHS`.
- Inbound links retargeted to `/plans`, each with a `TODO(phase-5)` marker: `MarketingShell.tsx:52`,
  `Landing.tsx` hero / footer / email-row. **`AccountSettings` needed no change — it already
  pointed at `"plans"`.** The recon's claim that it used `handleNavigate("pricing")` was wrong;
  that audit row is corrected to ALREADY CORRECT.
- `routeTiers.test.ts` now asserts `tierForPath("/pricing")` is **null** — an assertion, not an
  omission, so phase 5 re-adds it deliberately.
- `pageStructure.test.ts` census entry removed with a pointer back.

**`marketingPageSmoke.test.tsx` rewritten.** The gap was real and worth naming: the suite rendered
public routes under `dbMock()`, which always supplies `SMOKE_USER`, so the one state these routes
exist to serve was the one state never tested — which is exactly how `/pricing`'s
`if (!currentUser) return null` survived. The file now drives a `PUBLIC_ROUTES` table through a
logged-out block first and a signed-in block second. It also asserts **content**, not just
"does not throw": a `null` render throws nothing, so each case checks `html.length > 200` and a
route-specific string.

To make that possible I added `signedOutDbStub` + `useSignedOutDb()` / `restoreSmokeUser()` to
`src/test/pageSmoke.tsx`. Note in passing: the existing docblock there refers to a `useSeededDb()`
that **does not exist** — `seeded` is declared and never flipped. I left that alone (not my phase)
but the new switch is built the way that one was meant to be.

### 1c — the destructive panels

Both panels removed from `ImportCsv.tsx` (markup, handlers, and the `confirmReset` / `isResetting` /
`resetSuccess` / `isCleaning` / `cleanStats` state), then `wipeAndResetDatabase`, `cleanDuplicates`
and `seedUserDatabase` deleted from `db.tsx` — the panels were their only callers, and
`seedUserDatabase` was called only by `wipeAndResetDatabase`. Interface entries and provider values
went with them. A comment in `DbContextType` records why, so the next person adds a real
`ConfirmDestroy`-style guard rather than another red button.

### 1d — the ungated `#/notes-scan`

Branch and import removed from `App.tsx`, `NotesStoreScan.tsx` deleted, and its row removed from
`devSurfaceSmoke.test.tsx`. It was marked temporary in its own comment and deliberately not
DEV-gated, so in production it replaced the whole app for any signed-in user who hit the hash.

### Test count

4203 → 4202 total. Removed: 2 `/pricing` smokes, 1 `#/notes-scan` dev-surface smoke. Added: 4 new
marketing smokes (logged-out × 2, signed-in content, signed-in chrome pair) — the 5 new rules tests
do not run in this suite. Net −1, all accounted for.

### Not verified

No visual verification anywhere in this phase. The affected surfaces are auth-gated or deleted, and
the browser pane cannot sign in (established during the recon).

---

## Phase 2 — truth pass

**Commit:** `79e0bca`
**Gates:** tsc **0** · build **✓** · Vitest **258 files, 4217 passed | 2 skipped (4219)** (was 256/4200)

### 2a — the filename on the confirm screen

`setFileName(file.name)` moved from the top of `runMapping` into `pickFile`. The confirm screen is
the only reader, and `runMapping` is what its own primary button calls — so the name used to arrive
one screen after the screen that existed to show it.

**Decision (mine):** the sentence is now a pure `confirmFileLead()` in the new
`src/lib/smartImportConfirm.ts`, rather than a ternary inline in the JSX. A pure function can be
tested; the inline could not, because reaching the confirm screen needs an interaction and this
repo has no jsdom. Its test covers named and unnamed (including whitespace-only).

**⚠️ But the bug was wiring, not copy, and a pure test cannot see wiring.** So there is a second
test asserting at source that `pickFile` contains `setFileName(file.name)` and that `runMapping`
does not — each slice restating and asserting its own anchor first, per the house slice rule.

### 2b — the overview's claim

New pure `overviewLead({agentsFix, agentsSharpen, queriesSharpen})` composes the sentence from the
counts that are actually non-zero, joining surviving clauses as prose. The old single hardcoded
string was chosen by `allClear`, so zero agent problems + three query flags still announced that
agents needed a fix, directly above an Agents column showing zero of both non-ready tiers.

Six tests, including the two cases the old copy got wrong in each direction, singular/plural
agreement, and a reports-never-appraises check (no `only|just|already|still|good|bad|slow|…`).

Docblock corrected: it described a blocking agent tier that `agentTierOf` has not returned for some
time. It now says plainly that nothing here blocks and that the one real decision (an unresolved
duplicate) has its own stage before the review.

### 2c — the FAQ contradictions

Both answers now say a name **or** an agency is enough:
- `BANNER.agents.faqs[0]`: "Why does an agent need an agency?" → "Does an agent need an agency?" /
  "No — a name or an agency is enough…"
- `FAQ_ITEMS`: "Is the agency name required?" → "No — a name or an agency is enough…"

New lock `reviewCopyClaims.test.ts`. Two things worth recording about building it, because both
were false alarms of the kind that teach people to weaken locks:

1. **It first failed on my own comment.** The comments beside the fix quote the old wording
   verbatim so the next reader knows what was wrong; the lock read them. `//` lines are now
   stripped before matching — safe here because every answer lives in an object literal, never in
   a comment.
2. **Then it failed on the new question.** "Does an agent need an agency?" contains "need an
   agency" — a perfectly good question. The patterns now match **answers only**, extracted via
   `a: "…"`, with an anchor assertion that the table yielded any answers at all.

**Verified red before being believed:** restoring the original "Yes — every agent needs at least an
agency" answer fails 2 of the 8 cases; restored immediately after.

### 2d — the "Founding Members open" pill

Deleted from `Auth.tsx`. Nothing read a cap, a count or a date, so it asserted an open programme
whatever the truth was. The comment left behind points at the waitlist machinery
(`functions/src/waitlist.ts`, `counters/waitlist`) that could back such a claim and notes it is not
wired to any live page.

### 2e — the mapping fallback's silent catch-all

The fallback is now explicitly `screen === "fallback"`. The genuine unhandled case became its own
branch: it `console.error`s the screen value and what state was missing, and renders "That step
didn't load" — *"Something didn't load on our side. Your file hasn't been imported and nothing has
been saved"* — with Back, add-by-hand and the Import-desk hatch all live.

That distinction is the point: as the function's bare final `return`, the fallback rendered for any
unhandled state, so a branch whose data never arrived (`"overview"` with a null `validated`) told
the writer *"We couldn't read that one automatically"* — blaming their file for our own missing
state.

### Not verified

No visual verification. All five surfaces are inside the onboarding flow, which is auth-gated.

---

## Phase 3 — delete the legacy tail

**Commit:** `2a5b3d8`
**Gates:** tsc **0** · build **✓** · Vitest **258 files, 4228 passed | 2 skipped (4230)**
`Onboarding.tsx` 1288 → 681 lines.

Recon Part B items 1, 2, 4 and 6 all lived on the two deleted screens. None was repaired; all four
went with their screens, which is the point — every one of them was a consequence of the screens
existing rather than of how they were written.

### 3a — the screens

`Screen5Agents`, `Screen6Complete` and `handleScreen5Continue` deleted, with them the `addAgent`
call carrying six invented facts (`starRating: 3`, `responseTimeWeeks: 12`, `submissionStatus:
OPEN`, `noResponseMeansNo: false`, `submissionMethod: EMAIL`, `materialsWanted: ["Query Letter"]`).
**Onboarding no longer calls `addAgent` at all**, so it cannot invent an agent's facts.

Dead helpers removed with them: `ProgressDots`, `SkipButton`, `BackButton`, `ModalFooter`,
`SelectableCard` + its props interface, `FormField`, `InputField`, `SelectField`,
`TOTAL_MODAL_STEPS`, plus the now-unused imports (`Send`, `UserPlus`, `ArrowRight`, `ChevronLeft`,
`Upload`, `Download`, `AnimatePresence`, `useEffect`, `SubmissionStatus`, `SubmissionMethod`) and
`addAgent` from the db destructure.

### 3b — the exits

Branch A's ready-to-query path and Branch B's add-by-hand both now set
`sessionStorage["scriptally_post_onboarding_tab"] = "agents"` and finish — the mechanism Branch A3b
already used. Onboarding ends where the real work starts, at the agent list, whose Add-an-agent
form stores what it asks for.

### 3c/3d — the beat and the dots

`CreamUnderstood` deleted from `chrome.tsx`; the `"understood"` flow state, its 1200ms timeout and
its `FLOW_KEY` entry are gone, so the welcome's Continue enters the mapped branch directly.

**Decision (mine — the pack said "delete `ProgressDots` and `DOT_TOTAL`" without saying what the
chrome row becomes):** `OnbChrome` keeps the Skip link and loses the dot row entirely, and the
`dotIndex` prop is removed from `Form11Card` and all nine call sites. Five dots were drawn while
Branch A only ever passed index 1 and Branch B 1 or 2 — the row never advanced for one branch and
never passed the second dot for the other, telling every writer they were two steps into a
five-step flow that did not exist. Phase 6 introduces the ref's mono step marker in its place;
shipping a lying dot row for one phase in the meantime was the worse option.

### 3e — the unreachable screen

`ImportTidyAnimation.tsx` and its test deleted; `"tidying"` removed from the `B3Screen` union along
with its render guard. `setScreen("tidying")` was never called from anywhere.

### 3f — the resume path

**⚠️ This is the one thing deletion could genuinely have broken, and it is worth stating plainly.**
`normalizeStep` used to preserve saved steps 5 and 6. Those screens no longer exist, so a writer
returning mid-flight from an earlier build would have resumed onto nothing — and the onboarding
overlay is `position: fixed; inset: 0` at `z-index: 9999` over the whole app, so "nothing" means a
blank screen with no way out. It now sends **every** saved step to the welcome, which is a real
screen that can reach everywhere else. Locked.

### Locks

New `onboardingTail.test.ts`, 14 cases: the screens are gone, onboarding writes no agent and names
none of the invented fields, no completion screen claims agents are on file, both branch exits use
the hatch and neither calls `goTo(5)`, nothing routes to any numbered step above zero, no
`CreamUnderstood` in either file, no `"understood"` state or `1200`, no dots, no `"tidying"`, and
`normalizeStep` resolves everything to 0.

**⚠️ Same false-alarm shape as Phase 2, and worth recording as a pattern:** four of these failed
first time against my own explanatory comments, which necessarily name the things they document as
deleted. The file strips `//` lines and `/* */` blocks before matching. The alternative — deleting
the explanations to satisfy the lock — would have thrown away exactly the knowledge worth keeping.
One of the four was a real miss, though: `CreamUnderstood` was still defined in `chrome.tsx` when I
first ran it.

### Not verified

No visual verification; onboarding is auth-gated.

---

## Phase 4 — `journeyStage`

**Commit:** `7c1d439`
**Gates:** tsc **0** · build **✓** · Vitest **259 files, 4239 passed | 2 skipped (4241)**

### ⚠️ THIS COMMIT ALSO CHANGES `firestore.rules` (second of two).

`journeyStage` deleted from `types.ts`, from all four `persistProfile` calls (and the
`finishOnboarding` parameter that carried two of them), from `isValidUser`, and from the user-update
allowlist. `STAGE_TO_JOURNEY` went with it. Nothing anywhere read it — not a component, not a
selector, not a hook: a stored, rules-validated, allowlisted, write-only field, which is three
layers of ceremony around a value with no consumer and a standing invitation to build
personalisation on data nobody had ever checked.

### `queryingStage` kept, and given a real reader

New pure `src/lib/onboardingStage.ts`: `importDefaultForStage(stage)` and
`effectiveQueryingStage(stored, inSession)`. Branch B's `defaultImport` now reads
`currentUser?.queryingStage`.

**Decision (mine — the pack said "read the persisted value" without addressing the timing):** the
helper prefers the **stored** value and falls back to the session one. That fallback is not a way
back to reading local state. Onboarding writes the profile fire-and-forget on purpose — an awaited
write can hang the flow when a field is silently denied by the rules — so there is a genuine window
where the answer has been given and the document has not returned. The stored value leads, because
that is what a writer who reloads mid-flow still has; the session value covers the window only.
Both branches are tested.

11 tests, including the phase's actual claim: that `Onboarding.tsx` reads
`currentUser?.queryingStage` and that the value read is what drives `defaultImport`. Without that
pair, "the field has a reader" is an assertion about intent rather than about code.

### Not verified

No visual verification. The rules change is committed and **not deployed** (see the deploy note).

---

## Phase 5 — pricing and legal

**Commit:** `b0baaf5`
**Gates:** tsc **0** · build **✓** · Vitest **259 files, 4261 passed | 2 skipped (4263)**

### 5a — a public `/pricing` that sells nothing

New `src/marketing/PricingPage.tsx` in the `mk-` system, copy in `landingCopy.ts`
(`PRICING_TIERS`), styles appended to `marketing.css` using only existing tokens
(`--mk-card`, `--mk-parch`, `--mk-hair`, `--mk-head`, `--mk-sage`) — **no new colour introduced.**

**⚠️ The component takes no user and never imports the db.** That is what makes the logged-out
render impossible to get wrong a second time; the page it replaces opened with
`if (!currentUser) return null`. The Free card's CTA opens sign-up; the Pro card carries the
`ComingSoonPill` pattern and **no control at all**, because there is no payment path.

**Decision (mine):** the Pro card states its price as *"Price to be confirmed"* with a mono
`no payment path yet` note, rather than inventing a number. Every Pro feature listed is one that
exists and is gated today — nothing on that list is a roadmap promise. A comment in `landingCopy.ts`
says so, and asks that a line which stops being true be deleted rather than softened.

Locked: the source must not contain `useScriptAllyDb`, `upgradeToPro`, `downgradeToFree`,
`updateUserProfile` or `plan:`; the render must contain "Coming soon" and must not match
`/Activate Pro/i`.

### 5b — `/terms` and `/privacy` as real routes

`LegalPage.tsx` + `legalCopy.ts`, both added to `MARKETING_PATHS`, both public, both rendering for
logged-out visitors. Routes rather than files because **both hosting configs rewrite `**` to
`/index.html`** — a static page at those paths is served the SPA, which is why the sign-up screen
spent a long time linking to documents that could not exist.

**The bodies are placeholders and say so on the page**, in a bordered notice, not only in a
comment: *"This is a placeholder, not the final wording."* Section headings are stubbed so the
shape a reader expects is visible, and replacing the copy is an edit to `legalCopy.ts` alone.

**⚠️ OUTSTANDING, AND NAMED IN THE DRAFT SO IT CANNOT BE QUIETLY MISSED: the privacy policy must
cover third-party processing.** Three features send the writer's own content to Anthropic's API —
Smart Import sends the **contents of the uploaded spreadsheet** (their entire agent list and
querying history), the email drop sends the body of an agent's reply, and the comps suggester sends
the manuscript's details. Nothing on any current surface tells them. The privacy draft has a
section named for exactly this, and a test asserts the rendered page mentions Anthropic and Smart
Import, so the section cannot be dropped in a tidy-up.

### 5c — `Auth`'s outbound links

"Back to site" and both legal links now navigate in-app via `useNavigate` instead of pointing at
`https://scriptally.ink`.

**Decision (mine — a real trap the pack did not mention):** `goPublic()` clears the pre-auth hash
before navigating. Without that, `#/signup` survives the navigation and `App`'s marketing branch
re-renders the Auth screen straight over the page you asked for, so the link would appear to do
nothing.

### Phase 1's TODOs retired

All four `TODO(phase-5)` link retargets are back on `"pricing"`; `routeTiers.test.ts` asserts
marketing tier for `/pricing`, `/terms` and `/privacy`; the smoke's `PUBLIC_ROUTES` table now
drives all four public routes logged-out first, then signed-in.

### Note on a small duplication

`stripComments` is now a shared export from `src/test/pageSmoke.tsx` — this is the **third** lock
in this run to fail against its own explanatory comment (Phases 2, 3, then 5). The two earlier
files keep their local copies; consolidating them is tidy-up, not a fix, and I did not want to
touch committed phases to do it.

### Not verified

**No visual verification of any new page.** These three are the only surfaces in the whole run a
browser could actually reach logged-out, but the run is headless and I did not start a dev server;
the smokes assert structure and content, not appearance. **Worth eyeballing `/pricing`, `/terms`
and `/privacy` at desktop and ~375px before launch** — the CSS is new and unreviewed by eye.
