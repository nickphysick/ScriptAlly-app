# App-wide audit — dead / redundant / destructive loose ends

**Read-only investigation, 26 Aug 2026.** Nothing in the app was changed. This file is untracked —
delete it once read.

Scope note: every claim below was verified against **current HEAD** (`ef8c7a6e`), not against
memory of a past problem. Findings the brief predicted but which are **already fixed** are listed in
§6 rather than dropped silently — that list is as useful as the defects.

---

## 1. Step 0 — baseline

| | |
|---|---|
| Branch | `main`, level with `origin/main` (0 ahead / 0 behind) |
| Working tree | **No source WIP at all** — see §5 |
| `npx tsc --noEmit` | **clean**, exit 0 |
| `vite build` | **clean**, 2,910 modules, exit 0. No `error`/`[WARNING]` lines (grepped whole log, not tailed) |
| `npx vitest run` | **411 files · 7,117 passed · 3 skipped · 0 failed** |

**There is no pre-existing red.** Nothing below is baseline noise.

> ⚠️ **I did not run `npm run build`.** `dist/` held a **dev** bundle built today at 18:58
> (`grep` confirms `scriptally-dev` in `dist/assets/index-*.js`). A production build would have
> overwritten it — the hazard CLAUDE.md records under *"running the BUILD GATE inside the
> measurement worktree destroys the dev bundle"*. I built to a scratch `--outDir` instead and
> re-checked afterwards that `dist/assets/index-D-6z9LAw.js` still carries its original 18:58
> timestamp. The build gate was exercised; the repo was not touched.

**Instrument caveats that bound everything below.** Rules tests and functions tests need the
Firestore emulator (a JVM jar); this machine has no JDK, so they were **not run** — they do run in
CI (`.github/workflows/ci.yml` has both steps). `npm run e2e` was not run: it writes to the shared
harness account, which is out of scope for a read-only pass.

---

## 2. Method — and why the dead-code claims are safe

A dead-code claim is only as good as the search behind it. Two things make the `src/` sweep
airtight rather than indicative:

1. **`tsconfig.json` declares an `@/*` alias — and not one file in `src/` uses it.** Verified by
   grep for `from "@/`, `from "src/`, `from "~/`: **zero hits**. Every internal import is relative.
2. **There are no dynamic imports with a non-literal specifier.** Verified: zero hits for
   `import(` followed by anything but a quote.

Together those mean a **static relative-import graph is complete** for this codebase. I ran a
fixed-point reachability sweep from `src/main.tsx` + `src/App.tsx` (comments stripped first, both
`import` and `export … from` edges followed). A file with **zero importers cannot be rendered** —
in an ES-module bundle with no dynamic specifiers, imports are the only way in. That is what
upgrades these from "grep found nothing" to Confirmed.

**Self-correction, recorded because it bounds the CSS findings:** my first CSS pass reported
`src/styles/motion.css` as unimported. It is not — `src/index.css:4` pulls it via
`@import "./styles/motion.css"`, which a TS-import-only sweep cannot see. I re-ran with `@import`
chains included. Likewise `.sa-settled` looked test-only until I widened the grep: it is applied at
runtime in `src/lib/flip.ts:32`. Both were false positives of my own instrument, caught and
removed before they reached this list.

---

## 3. Findings

### 3.1 DESTRUCTIVE

---

**[DESTRUCTIVE] CSV export has no formula-injection escaping**
*What:* Exported cells beginning `=`, `+`, `-`, `@`, tab or CR are written raw, so a spreadsheet
opens them as formulas.

*Where:* `src/components/Queries.tsx:2747-2754` (`escapeCSVField`), consumed at
`Queries.tsx:2943`. Two entry points: `handleExportFilteredCSV` (`:2957`, wired to the list foot's
`EXPORT CSV` at `:5082`) and the "Download all as CSV" button (`:4111`).

*Evidence:*
```js
const escapeCSVField = (val) => {
  if (val === undefined || val === null) return "";
  const str = String(val).trim();
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};
```
That is correct RFC 4180 quoting and nothing else. **RFC quoting does not neutralise a formula** —
Excel strips the CSV quotes before parsing the cell, so `"=HYPERLINK(...)"` still evaluates. The
row is built from `agentName, agencyName, agentEmail, manuscriptTitle, …, personalisationNote,
guidelinesUrl, notesSerialized` (`Queries.tsx:2924-2941`) — all free text.

*Why this is more than self-inflicted:* agent name, agency and email are not only hand-typed. They
arrive through **Smart Import**, which parses third-party CSVs and pasted agent emails. So text the
writer never authored can reach a cell that a spreadsheet will execute.

*Confidence:* **Confirmed** — function read in full; no escaping helper exists elsewhere (grep for
`csvEscape` / a leading-character guard across `src/`: no hits).

*Suggested action (note only):* prefix-guard the four characters plus tab/CR before the existing
quoting. Cheap and local to one function.

---

**[DESTRUCTIVE] The authoritative activity store accepts unknown fields and never validates
`resultingStatus` — the field that decides a query's status**

*What:* `users/{uid}/queries/{qid}/activity/{aid}` is the authoritative log. Its rule has **no
`keys().hasOnly(...)`** and does not check `resultingStatus` at all — while the *derived display
projection* beside it validates that same field against the full ten-value enum.

*Where:* rule `firestore.rules:747-751`; validator `firestore.rules:418-422`.

*Evidence:*
```
// firestore.rules:750
allow create, update: if isOwner(userId) && isValidId(activityId) && isValidActivityNested(incoming());

// firestore.rules:418
function isValidActivityNested(data) {
  return data.type is string && data.type.size() <= 128
    && (data.createdAt is timestamp || data.createdAt is string)
    && data.note is string && data.note.size() <= 16384;
}
```
Three fields checked. No key restriction. `resultingStatus` — not mentioned.

And that is exactly the field derivation reads:
```ts
// src/lib/recomputeQuery.ts:31
export function subcollectionDocToDerivable(id, data) {
  return { id,
    resultingStatus: normalizeResultingStatus(data.resultingStatus) ?? normalizeResultingStatus(data.type),
    date: data.createdAt, ... };
}
```
`deriveQueryFields` turns that into the query's `status` and every derived date and flag.

*The asymmetry is the finding.* `/users/{uid}/activities/{id}` — the *projection*, which only ever
gets displayed — validates `resultingStatus` against all ten enum values
(`firestore.rules`, `isValidActivity`) **and** constrains `activityType` to a twelve-value list. The
store that *decides* status is the loosely-guarded one; the store that merely *shows* it is strict.

The `queries` block one level up reasons explicitly about leaving `status` writable and says *"the
door this leaves open … is closed at the source instead"* (`firestore.rules:718-724`). That
reasoning covers the `queries` document's own `status` field. **It does not cover the activity
subcollection that derives it**, and nothing else does either.

*Mitigation, stated because it caps the severity:* `normalizeResultingStatus`
(`src/lib/queryDerivation.ts:76-79`) is a strict allowlist — `VALID_STATUSES.has(value)`, `null`
otherwise — so a garbage *value* cannot become a derived status. And access is `isOwner`, so a user
can only corrupt their own data; there is **no cross-tenant exposure**. What remains is that
arbitrary keys are storable in the authoritative log, and a *valid-but-wrong* status (`"Offer"`)
can be written straight into it by any path that bypasses `recomputeQuery`, with the rules layer
raising no objection — on an architecture whose stated invariant is single-writer.

*The test asymmetry documents the gap.* `tests/rules/firestore.rules.test.ts:811-832` asserts
exactly two things about this store: owner can create; cross-user read is blocked. There is no
unknown-field case and no invalid-`resultingStatus` case — whereas the projection's block
immediately below **does** carry *"rejects activity with invalid activityType"*.

*Confidence:* **Confirmed** — rule, validator, reader and test all read directly. Not verified by
execution (no local emulator; the rules suite runs in CI).

*Suggested action (note only):* add `keys().hasOnly([...])` and mirror the enum check onto
`isValidActivityNested`, with the matching red tests. Note `dateProvisional` is also read by
`subcollectionDocToDerivable` and would need listing.

---

### 3.2 REDUNDANCY-RISK

---

**[REDUNDANCY-RISK] Six CSS declarations on two LIVE surfaces are silently dropped — the tokens
they read are defined nowhere**

This is the fault CLAUDE.md already records ("a `var()` on a token nobody defines"), found twice
more, and **both surfaces render today**.

*(a) `--pastille`, `--pastille-ink`, `--pastille-tint`* — read at
`src/components/packages/packageTracking.css:17, 25, 30, 31, 35`; **defined nowhere in `src/`**
(grep for the token across all of `src/`, tests excluded: read sites only, zero definitions).
With no fallback, each whole declaration is invalid and discarded:

| line | declaration | what actually renders |
|---|---|---|
| 17 | `border-top: 2px solid var(--pastille)` | **no border at all** |
| 25 | `.pkgt-figure { color: … }` | inherits |
| 30 | `.pkgt-row:hover { background: … }` | **no hover state** |
| 31 | `.pkgt-av { background / color }` | both dropped |
| 35 | `.pkgt-more, .pkgt-attach { color: … }` | inherits |

**It is live.** `PackageTracking.tsx:52,65` renders `.pkgt`; `SubmissionPackages.tsx:431` mounts it
on `/manuscripts/packages`; `PackageTracking.tsx:23` imports the sheet.

*(b) `--ink-3`* — read at `src/components/shell/f12.css:4391, 4413, 4416, 4423, 4426`; defined
nowhere. All five are `color:` on Query Centre package-picker chrome, so that text inherits its
parent's ink instead of the intended muted mono grey. **Live**: `PackagePicker.tsx:83,97` renders
`.qc-pkgpick-head` / `.qc-pkgcount`.

*Confidence:* **Confirmed** for "undefined and therefore dropped". The *visual* consequence is
reasoned from the cascade, **not measured in a browser** — I did not run `npm run e2e`. Worth one
screenshot before acting.

*Suggested action (note only):* these look like survivors of a retired "pastille sheet" (CLAUDE.md
mentions one under the app-shell notes). Either define the tokens or inline the intended values.

---

**[REDUNDANCY-RISK] `designTokens.ts` and `index.css` hold 30 of the same colours with nothing
keeping them in step**

*Where:* `src/lib/designTokens.ts` (202 lines, **39 non-test importers**) vs `src/index.css`.

*Evidence:* 30 hex values appear in both files. Examples: `#2e2723` as `shellInk` / `--shell-ink`;
`#e3d9cf` as `shellLine` / `--shell-line`; `#aebdb0` as `shellDesk` / `--shell-desk`; `#7c3a2a` as
`burgundy` / `--burg` + `--sd-hue`; `#6A89A7` as `qdbBoldSlate` / `--slate` + `--pro`.

*Authoritative source:* **the CSS**, for a structural reason rather than a stylistic one — themed
tokens are declared once per theme class (`.t-capp` / `.t-bold` / `.t-edn`) and **a JS constant
cannot express a value that varies by theme**. Any duplicated hex whose CSS token is themed is
therefore correct in at most one theme when read from JS.

*Honesty about the worked example:* I expected `--hdr` to demonstrate this and checked before
claiming it. It does not — `--hdr` is `#000000` in all three theme blocks today
(`index.css:476, 651, 793`), retoned by the theme editor. So the divergence is **structural risk,
not a live defect I can point at**; the token has three declaration sites and can drift on the next
retone, at which point the JS copy is silently wrong.

*Confidence:* **Confirmed** for the duplication and the absence of a lock; **Likely** that it will
bite, since it has not yet.

---

**[REDUNDANCY-RISK] `--slate` and `--pro` are the same colour under two names** —
`index.css:43` and `index.css:977`, both `#6A89A7`. Already identified as F-AK in
`reports/closeout.md` and **deliberately deferred** there because `index.css` was ruled
do-not-touch for that pass. Recorded as **still present**, not as new.

---

### 3.3 DEAD

---

**[DEAD] 40 non-test files (~6,000 lines) are unreachable from the app entry point**

Produced by the fixed-point sweep in §2. `src/vite-env.d.ts` appears in the raw output and is
**excluded here as a false positive** — it is an ambient declaration file, reached by `tsconfig`,
never by an import.

Classification: **ORPHAN** = zero importers of any kind. **TESTED-ONLY** = imported solely by test
files (the "tested but unmounted" shape). **REF-BY-UNREACHABLE** = only importer is itself
unreachable.

| lines | kind | file |
|---|---|---|
| 622 | ORPHAN | `src/components/dashboard/StatCards.tsx` |
| 452 | TESTED-ONLY | `src/components/dashboard/DeskStats.tsx` |
| 402 | TESTED-ONLY | `src/components/todo/TodoBoard.tsx` (6 test files) |
| 362 | ORPHAN | `src/components/dashboard/WhatsLivePanel.tsx` |
| 357 | ORPHAN | `src/components/reading-pane/TimelineComposer.tsx` |
| 334 | REF-BY-UNREACHABLE | `src/components/shell/TopNavShell.tsx` |
| 291 | TESTED-ONLY | `src/lib/packageAnalytics.ts` |
| 244 | ORPHAN | `src/components/MaterialsField.tsx` |
| 221 | ORPHAN | `src/components/TasksDropdown.tsx` |
| 194 | ORPHAN | `src/lib/manuscriptTiles.ts` — **see note below** |
| 182 | REF-BY-UNREACHABLE | `src/components/MaterialsEditor.tsx` |
| 179 | REF-BY-UNREACHABLE | `src/lib/topNav.ts` |
| 171 | TESTED-ONLY | `src/components/todo/TodoSideContainer.tsx` |
| 168 | ORPHAN | `src/components/dashboard/DeskBelow.tsx` |
| 152 | ORPHAN | `src/components/agents/FilterDropdown.tsx` |
| 133 | TESTED-ONLY | `src/lib/styleWiring.ts` |
| 132 | ORPHAN | `src/components/agents/AgentMaterialsEditor.tsx` |
| 132 | ORPHAN | `src/lib/migrateDerivedStatus.ts` — **see separate finding** |
| 131 | REF-BY-UNREACHABLE | `src/lib/composerChips.ts` |
| 123 | TESTED-ONLY | `src/components/dashboard/TimelineDrawer.tsx` |
| 107 | TESTED-ONLY | `src/components/shell/railPeek.ts` |
| 103 | TESTED-ONLY | `src/lib/communityStats.ts` |
| 95 | ORPHAN | `src/components/dashboard/DeskTodoCard.tsx` |
| 93 | ORPHAN | `src/components/agents/AgentResponseGuidelines.tsx` |
| 83 | ORPHAN | `src/components/agents/AgentLinkPopover.tsx` |
| 83 | ORPHAN | `src/components/packages/PackagesHeroBand.tsx` |
| 78 | REF-BY-UNREACHABLE | `src/lib/todoEstimate.ts` |
| 78 | REF-BY-UNREACHABLE | `src/lib/todoTiers.ts` |
| 75 | ORPHAN | `src/components/todo/RowTip.tsx` |
| 71 | REF-BY-UNREACHABLE | `src/lib/deskWeek.ts` |
| 71 | REF-BY-UNREACHABLE | `src/lib/todoCount.ts` — **see note below** |
| 70 | ORPHAN | `src/components/dashboard/DashboardHero.tsx` |
| 60 | ORPHAN | `src/components/todo/useTodoCounts.ts` |
| 53 | REF-BY-UNREACHABLE | `src/components/dashboard/DeskCard.tsx` |
| 52 | ORPHAN | `src/lib/quickPicks.ts` |
| 47 | ORPHAN | `src/components/shell/TopNavHost.tsx` |
| 44 | TESTED-ONLY | `src/components/shell/topCrumb.ts` |
| 34 | REF-BY-UNREACHABLE | `src/lib/agentReplyPolicy.ts` |
| 29 | ORPHAN | `src/lib/iconAutoFit.ts` |

**Two entries that must not be actioned on this evidence alone:**

- **`src/lib/manuscriptTiles.ts` is unreferenced *on purpose*.** `bookProfile.test.tsx:264-274`
  asserts that state deliberately, pending a decision about where the "X meets Y" pitch line lives.
  It is in the table for completeness. **Do not delete it** — the lock exists so its removal is a
  decision, not a tidy-up.
- **`src/lib/todoCount.ts` is flagged in your own memory as *"Counting law = lib/todoCount.ts
  ONLY"*.** It is now unreachable at two hops: its only importer is `useTodoCounts.ts`, itself an
  orphan. Either the counting law moved and the note is stale, or a mount was lost. **This one is
  worth answering before anything is deleted around it.**

**Three visible clusters, offered as reading rather than conclusion:** an old dashboard generation
(`DeskStats`/`DeskCard`/`DeskBelow`/`DeskTodoCard`/`DashboardHero`/`StatCards`/`WhatsLivePanel`/
`TimelineDrawer`, + `deskWeek`/`todoTiers`); a retired top-nav (`TopNavHost` → `TopNavShell` →
`topNav.ts`); and a To-do board generation (`TodoBoard` → `todoEstimate`, `useTodoCounts` →
`todoCount`).

*Confidence:* **Confirmed** that each is unreachable from the entry point, on the graph-completeness
argument in §2, spot-verified by independent per-module grep for eleven of them.
**Uncertain** whether each is *wanted* gone — several are tested, and `packageAnalytics.ts` /
`communityStats.ts` were **explicitly kept** by `reports/closeout.md` with reasons at the head of
each file. Reachability answers "does it run", never "should it exist".

---

**[DEAD] Two stylesheets reach the browser through no path at all**

| lines | file | evidence |
|---|---|---|
| 1,372 | `src/components/agents/agentsV2.css` | no TS/TSX import, no `@import`; `grep -c ag-panescroll dist/assets/*.css` → **0** |
| 297 | `src/components/todo/paneJourney.css` | no TS/TSX import, no `@import`; **zero** non-test files render any `.pj-*` class |

`agentsV2.css` is the **retired Agents page v2** sheet — consistent with CLAUDE.md, which marks that
whole section RETIRED. The only two non-test files still naming `.ag-*` classes are
`AgentResponseGuidelines.tsx` and `AgentLinkPopover.tsx`, and **both are ORPHANs in the table
above** — so nothing renders those classes on a reachable path either.

*Confidence:* **Confirmed.** Vite bundles only imported CSS, so neither file ships; the `dist` check
is direct evidence rather than inference.

---

**[DEAD] Four unused runtime dependencies**

| package | where declared | import sites |
|---|---|---|
| `@google/genai` | `dependencies` | **0** |
| `dotenv` | `dependencies` | **0** |
| `html2canvas` | `dependencies` | **0** |
| `express` (+ `@types/express` in devDeps) | `dependencies` | **0** |

*Evidence:* searched `src/`, `functions/src/`, `scripts/`, `tests/` and every config
(`vite/vitest/playwright`) for **all import forms** — `from "x"`, `require("x")`, subpath
`from "x/…"`, and bare side-effect `import "x/config"`. Zero for each.

*Two corrections I made to my own first pass, both worth recording:*
- `xlsx` was initially on this list. **It is used** — `src/lib/smartImport.ts`. My first grep
  matched only the literal string and was fooled by `.xlsx` *filename* references in JSX. The
  precise import-site check found the real import. Not a finding.
- `express`'s only textual hits across 20 files are the word "**express**ion" in prose. Nothing
  imports it, and `server.js` — the file `npm run clean` still deletes — does not exist.

*Also noted:* `@vitejs/plugin-react` sits in `dependencies` but is used only by `vite.config.ts`.
Misplaced rather than unused; belongs in `devDependencies`.

*Not audited:* `functions/` has its own `package.json` and was not swept.

---

**[DEAD] `src/lib/migrateDerivedStatus.ts` — an orphaned one-time migration that still carries a
live write path**

*Where:* `src/lib/migrateDerivedStatus.ts` (132 lines). **Zero importers** (ORPHAN in the table).

*Why it is called out separately:* it is not inert code. It imports `setDoc` from
`firebase/firestore` and its own header documents an **APPLY** mode that stamps healing activity
docs. It cannot fire on its own — nothing imports it, and there is no dynamic-import path — but it
is a loaded weapon in `src/` whose stated invocation route is a developer console
(`const { dryRunDerivedStatusMigration } = await import("./lib/migrateDerivedStatus")`).

*Confidence:* **Confirmed** unreachable. Its retention may well be deliberate (a repair tool kept
for a rainy day) — that is a decision, not something this pass can settle.

---

**[DEAD] Stale comments claiming `#/pkg-lab` still mounts things — the route is gone**

*What:* `#/pkg-lab` was removed (`reports/closeout.md` Part 2). Eight comments across four files
still assert it is alive and use that as the stated reason components survive.

*Where:*
- `src/App.tsx:510` — a **stranded comment** (`// Dev-only Package Workshop review surface … TEMP.`)
  with no branch under it; the `if` it introduced was deleted.
- `src/components/SubmissionPackages.tsx:21, 76, 83, 350` — including
  *"survives untouched for the DEV `#/pkg-lab` route, **which still mounts it**"* and
  *"its CSS stays in packageWorkshop.css because the DEV `#/pkg-lab` route **still draws it**"*.
- `src/components/packages/TrackingBand.tsx:25`, `src/lib/packageAnalytics.ts:3`,
  `src/lib/communityStats.ts:3`.

*Why it matters beyond tidiness:* CLAUDE.md's own rule — *"a comment that outlives the thing it
describes is worse than no comment, because it is read as fact"*. `reports/closeout.md` records
that this exact prose already misled a reachability read once. Any future sweep reading these will
conclude a live route protects `packageWorkshop.css` and those two libs. It does not.

*Note:* `packageWorkshop.css` (54KB) **is** still imported and 58% of its classes are unnamed in
live source — a large stale-CSS candidate whose stated justification has expired. Sizing that
properly needs the per-class reading in §4.

*Confidence:* **Confirmed** — route absent from `App.tsx`, `grep -c pkg-lab dist/assets/index-*.js`
→ 0.

---

### 3.4 Lower-confidence dead-CSS signal

**~1,052 of 4,653 declared CSS classes (23%) are never named as a literal token in non-test
TS/TSX.** Concentrated in `agentsV2.css` (161 — the dead sheet above), `todo.css` (150),
`packageWorkshop.css` (112), `f12.css` (96), `manuscripts.css` (89), `shellV2.css` (62).

*Confidence:* **Uncertain, and deliberately not itemised.** A class built by interpolation —
`` className={`mk-illo--${illo.ground}`} `` is the pattern CLAUDE.md names — reads as dead to any
scan of this kind. The list is a **starting set for manual reading**, not a delete list. I am
reporting the shape and the concentration, not the members.

---

## 4. Verify-before-acting shortlist

Ranked by what I would want answered first:

1. **`todoCount.ts` being unreachable** — your memory says it is *the* counting law. Two-hop orphan.
   Did the law move, or did a mount go missing? Resolve before touching anything nearby.
2. **The nested-activity rules gap** — cheap to close, and it is the second line of defence for the
   invariant the whole data model rests on.
3. **CSV formula injection** — one function, and third-party text reaches it via Smart Import.
4. **`--pastille` / `--ink-3`** — one screenshot of `/manuscripts/packages` and the Query Centre
   package picker confirms or kills the visual half in a minute.
5. **The stale `pkg-lab` comments** — they are actively misinforming the next reachability pass,
   which is how the packages cascade got kept alive the first time.

---

## 5. Pass E — uncommitted / WIP inventory

**There is no source WIP.** `git status --porcelain -- src firestore.rules functions` returns
**empty**. Every dirty path is a test-run artefact:

| state | path | reading |
|---|---|---|
| M | `reports/calendar-fixes/month-1440.png` | measurement screenshot re-rendered (−1,064 bytes) |
| M | `reports/calendar-fixes/month-1920.png` | measurement screenshot re-rendered (−838 bytes) |
| M | `run-artifacts/finish-round.txt` | harness output, 16 lines changed |
| M | `run-artifacts/steer-round.txt` | harness output, 5 lines changed |
| ?? | `design-refs/173-package-attach (1).html` | 9KB, 23 Aug — a browser-duplicated download (` (1)` suffix); likely a design ref never filed |
| ?? | `reports/account-settings/v5-contrast-deployed.png` | 206KB, 21 Aug — evidence screenshot |
| ?? | `run-artifacts/.thin-cases-restore.json` | 23 bytes, 21 Aug — dot-prefixed harness restore state |

**The brief's three named candidates are all absent, checked individually:** no Editorial-stream
dirt in `index.css` / `firestore.rules` / `App.tsx` (all clean); no Cappuccino→Mocha retokening in
flight; and **`fix/onboarding-trap` does not exist** — `git branch -a --list '*onboarding*'` returns
nothing.

Nothing here is judged, per the brief. Note only that `run-artifacts/*.txt` and the two PNGs are
**tracked**, so harness runs dirty the tree every time — that may be worth a `.gitignore`
conversation, but it is your call, not a finding.

*Other worktrees exist and were not entered:* `ScriptAlly-analytics` (`feat/analytics`),
`ScriptAlly-masthead`, `ScriptAlly-pkgband`, `ScriptAlly-ptr` (all detached). This audit covers the
primary tree only.

---

## 6. Already resolved — predicted by the brief, verified fixed at HEAD

Listed because "we checked and it is fine" is worth as much as a defect, and because several of
these are load-bearing beliefs in `CLAUDE.md` / memory that can now be updated.

| brief's premise | actual state at HEAD |
|---|---|
| `deleteManuscript` orphans queries, no guard | **Cascades.** `db.tsx:1511-1551` builds an ordered `cascadePlan` (`lib/cascade.ts`, unit-locked) — versions + packages → queries + each query's `activity` subcollection → feed projections → taskFlags → **manuscript last**, so failure strands but never orphans. Type-to-confirm guard at `AllManuscripts.tsx:202-208`; durable `MANUSCRIPT_DELETED` record written with no `queryId` so the cascade cannot purge it |
| `#/pkg-lab` still reachable; must go before prod | **Route deleted.** Absent from `App.tsx`; `grep -c pkg-lab dist/assets/index-*.js` → 0. Only the stale comments remain (§3.3) |
| `isOfflineMode` / localStorage sandbox still wired | **Gone.** One prose mention of the word "offline" in `db.tsx:537`; no symbol, no dual-mode path |
| Vestigial singular `activity` store still read | **Gone.** No `match` block in `firestore.rules` (default-deny, retired Tier 3 · Phase 7); zero references in `src/` |
| `User.journeyStage` stored yet derivable | **Gone.** `types.ts:51`: *"THERE IS NO `journeyStage`"* |
| Legacy Materials fields still written | **Stripped on write.** `STRIPPED_PILLS` (`agentMaterials.ts:284`) filtered at `:356` with a "belt and braces" comment. Parsers still *read* them so legacy flags decay — by design |
| Linkifier may allow `javascript:` / `data:` | **Safe by construction.** `noteboard.ts:219` is `/https?:\/\/[^\s<]+/g` — the scheme allowlist *is* the match pattern — and it emits React nodes, not HTML, so escape-order cannot be got wrong |
| Storage/upload fences may leak a write path | **No `firebase/storage` import anywhere in `src/`** (grep: zero) |
| Locally-recreated `StatusDot` | **None.** Every `borderRadius:"50%"` outside `StatusDot.tsx` is a due-chip, post-it dot or placeholder ring |
| Delete paths need an archive model | **Present.** `deleteVersion` (`db.tsx:1611`) is a **data-level** refusal — returns `false` without writing when `packagesUsingVersion(...)` is non-empty — beside `archiveVersion`/`restoreVersion`. `/private` is `allow write: if false` |
| `recomputeQuery` single-writer breached | **Not breached in `src/`.** `saveQueryEdits.ts:230` is the only non-engine caller and it delegates rather than writing derived fields. The residual exposure is the *rules-layer* gap in §3.1, not a second writer |

**One standing hazard, not a defect today:** `src/components/Tour.tsx:143` renders
`dangerouslySetInnerHTML={{ __html: step.body }}`. Every current caller supplies literals
(`tourExample.ts:51-54`, `Onboarding.tsx:367`, `ResponsePane.tsx:264`, `QueryCreatePane.tsx:371`) —
so there is no live injection path. It becomes one the day a step body is built from user or
imported data. Flagging the shape, not claiming a bug.

---

## 7. Everything marked Uncertain, and what would resolve it

| item | what would settle it |
|---|---|
| The ~1,052 dead-CSS candidates | Per-class reading. A scan cannot see interpolated class names, so the list must be read, not believed |
| Whether the 40 unreachable files are *wanted* gone | A decision per cluster. Reachability proves they do not run; several are tested, and two (`packageAnalytics`, `communityStats`) were explicitly kept with reasons at the head of each file |
| Whether `--pastille` / `--ink-3` are visually noticeable | One screenshot each. I reasoned the effect from the cascade and did not run `npm run e2e` |
| Whether the rules gap is exploitable in practice | The emulator. No JDK here; `npm run test:rules` runs in CI. A red test asserting unknown-field rejection would prove it |
| `functions/` dependency hygiene | A separate sweep against `functions/package.json` — out of scope here |
| Whether `todoCount.ts` losing its mount was intended | Ask the To-do stream / read the commit that unmounted `useTodoCounts` |

---

*End of report. Nothing was changed. `git status` should be byte-identical to §5 apart from this
file, which is untracked — delete it once read.*
