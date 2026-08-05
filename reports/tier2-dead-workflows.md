# Tier 2 — dead workflows · run report (5 Aug 2026)

Eight defects from `reports/app-audit.md` + `reports/tier1-data-correctness.md`, worked directly on `main`, one commit per landed phase, gates green per commit. UK spelling. No deploys of any kind.

## ⚠️ Deploy requirements (read first)

1. **Phase 6 needs a Firestore rules deploy before it takes effect**: the `manuscripts/{id}/notes` subcollection match block (and its validator) are removed from `firestore.rules` — until Nick deploys rules (prod + dev), the deployed rules still permit that store. No allowlist was narrowed in the end (both allowlist-bearing candidates halted — see Phase 6), so the notes-block removal is the only rules-behaviour change in this run.
2. **The Tier 1 `committedDate` unblock is still outstanding and un-deployed**: the tasks update allowlist continues to silently deny Today's-list commits on stored tasks. The three-spot fix (rules `hasOnly` + `todoNotesTasks.test.ts:121` + flipping the `[KNOWN BUG]` rules test) belongs to the todo-stream owner; nothing in this run touched the tasks block.

## Step 0 — baseline and recon

**Baseline.** Start `8bd3ddd` (the Tier 1 report commit; all six Tier 1 commits present). Tree clean apart from the standing untracked `reports/app-audit.md`. `firestore.rules` unchanged since Tier 1. Gates on clean HEAD: tsc 0 · build 0 · vitest **2199 passed | 2 skipped, 138 files**.

**0.4 — homeCountry:** in the users update allowlist (rules:480), validator string ≤64 with omit-when-unset (:71-72). `CountryCombobox` (forms/) emits canonical ISO codes or `""` on clear; `updateUserProfile` (db.tsx:2312) → `updateDoc` with optimistic local state. Clean to proceed.

**0.5 — QueriesLanding:** navigators = none beyond hand-typed `/queries?view=landing`; references confined to App.tsx (import/render/pathFor/param branch). No dedicated CSS, no tests; `seedFacts` shared with Dashboard (not orphaned).

**0.6 — the three fields (per-field verdicts):**
- `Agent.pinned` — **reader found → halted.** The AgentCard/agentList `pinned` hits are the `pinnedNoteId` preview flag (a different, live concept). The true reader is the retired-lib `agentsPage.groupAgents` (:107-109, "Pinned always on top"), which has **no live component caller** (the live AgentList uses `agentList.ts`'s own 3-arg `groupAgents`) but is lock-tested (agentsPage.test.ts:118-159), and agentsPage.test.ts:321-330 carries a **rule-text lock** on the rules' pinned clause. Stripping would mean editing retired-lib code, two test files, and re-answering whether `isValidAgent`'s open shape should admit an unvalidated stray key — a sub-project, not a line. Reported, not improvised. (If a future pass wants it: delete the pinned partition from `agentsPage.groupAgents`, its fixtures/assertions, the rule-text lock describe, the types line, the rules validator clause + allowlist entry, and add an emulator denial test — one commit.)
- `manuscripts/{id}/notes` — zero writers, zero readers (the cascade collect at db.tsx:1176 is a deleter the phase itself removes). **Proceeded.**
- `Query.rejectedDate` — **live readers → halted:** packageMetrics.ts:160/:425 (response-time candidate chains, exercised by packageMetrics.test.ts fixtures) and manuscriptPage.ts:92. `Query.rejectionDetails` — zero references beyond its type line, in no rules allowlist. **Proceeded.**

**0.7 — email import:** the relocation is **already done** — `RecordResponseScreen.tsx:30/:247` mounts `PasteEmailButton` as the Pro fast lane beside the manual flow. `/email-import-dev` confirmed a plain `WORKSPACE_PATHS` entry (no DEV gate); `EmailImportDevPage` referenced only by App.tsx. Record-a-response hosts confirmed: the App-level `RecordResponseScreen` (rail capture), Dashboard's own instance, plus `RecordResponseModal`/`RecordResponseFocusForm` on their existing surfaces.

## Phases

**Phase 1 (`f1bc4f8`) — Plans CTA stops lying.** The dead handler was in the shared `PlanCard`, so *both* cards rendered dead buttons ("Get started" / "Go Pro"). The button, its cta props, the `.plans-cta-*` hover CSS, both TODOs and the header's "inert placeholders" line are gone; each card's foot now renders the AccountSettings InertRow grammar — hairline top, dimmed, `aria-disabled`, mono "Plan selection" label + the ComingSoonPill pattern (replicated locally with identical styles). `upgradeToPro` deliberately not wired (baked). **Browser-verified** via the `#/plans` dev hatch: both cards render the coming-soon foot, console clean.

**Phase 2 — HALTED: premise wrong.** The brief's defect was "toggles that move but never persist". `InertToggle` is a static, `aria-hidden` span with no handlers — it cannot move (AccountSettings.tsx:162-189). Every notifications row already pairs it with a `ComingSoonPill` (InertRow :215-216) and the section opens with an `InertNotice` stating outright that nothing is saved (:746-748). The asked-for honest state already exists in richer form; swapping four descriptive rows for one pill row would reduce the roadmap signal the brief says to keep. No change, no commit.

**Phase 3 (`863a0a9`) — landing footer.** The Help button removed from the marketing footer (no marketing help content exists; anchor/marketing-route options don't fit "help"; inventing a page is baked out). Footer now Pricing + the already-inert Privacy/Terms; decision recorded in the file header. Nuance for the record: for a *signed-in* visitor the old link did work — restoring it is one line if marketing help content ever exists. Plus the brief's rider: `routeTiers.test.ts`'s workspace loop gains `/manuscripts/comps`. **Browser-verified:** footer reads Pricing · Privacy · Terms.

**Phase 4 (`b4a5935`) — homeCountry editable.** A Home country field in Profile (between display name and the pen-name stub), using `CountryCombobox` through `updateUserProfile`, save-on-select with the section's status feedback (the Preferences theme-radio convention). Absent = "Not set", settable. One deliberate boundary, stated in helper text: changeable but never cleared back to unset — the combobox's Clear row is a no-op here, per the agent-editor origin-state law and territory's never-store-`""` model (a `deleteField` path through `updateUserProfile` would poison its optimistic local state with a sentinel). Auth-gated page — gates + code review; not reachable in the signed-out preview.

**Phase 5 (`0959fa0`) — QueriesLanding deleted.** The 992-line component, its App.tsx import, the `?view=landing` branch, and the `pathFor("queries","Landing")` case are gone; `queriesSub` reduces to the `?q=` deep-selection contract. Orphan sweep per 0.5: nothing else to remove.

**Phase 6 (`76f3bb5`) — two strips landed, two halted.**
- *Stripped:* the `manuscripts/{id}/notes` rules block + `isValidManuscriptNote` (no match block = default-deny) and the cascade collect in `deleteManuscript`. **Orphaned-data note, as instructed:** legacy manuscript-note documents remain in Firestore permanently — unreadable, unwritable, and now also un-deleted (the cascade no longer collects them); left in place, not migrated. The manuscript doc's own flat `notes` field is unrelated and untouched. A new rules test seeds a legacy note rules-free and locks the owner denial across create/read/delete (CI-gated, as ever).
- *Stripped:* `Query.rejectionDetails` (type line only; nowhere else in the repo).
- *Halted:* `Agent.pinned` and `Query.rejectedDate`, per 0.6 — `rejectedDate`'s type line now carries a warning comment naming its readers.

**Phase 7 (`fbba3b86`) — Discover's empty pool.** Premise refined: an empty pool didn't render "controls with no explanation" — it fell into the per-book "No matches for *{title}* yet" strip, which blames genre fit and offers try-another-manuscript, a dead route against an empty catalogue. `renderNoMatch` now checks the pool first and states it plainly in the page's own `.dv-nomatch` house treatment, offering no route (none exists from here). The two neighbouring states were already distinguished and keep their routes: per-book no-match → try another manuscript; filters-hid-everything → "Show everything". Loading-gap parity note: `communityAgents` has no explicit loading state today, and this change doesn't add one — during a fetch gap the empty-pool strip shows where the first-run sell previously did.

**Phase 8 (`276621b`) — email import.** Part 1 was already landed (see 0.7) — recorded, not re-done. Part 2 landed: `/email-import-dev` removed from `WORKSPACE_PATHS` and the routeTiers test loop, its App.tsx branch/pathFor/import gone, `EmailImportDevPage` deleted. The only email-import entry is now the real one inside Record-a-response. The surviving `topCrumb.test` assertion (`crumbForPath("/email-import-dev")` → null) holds by construction.

## Gate results per commit

| Commit | Phase | tsc | build | vitest (local) |
|---|---|---|---|---|
| `8bd3ddd` (baseline) | — | 0 | pass | 138 files · 2199 \| 2 skipped |
| `f1bc4f8` | 1 | 0 | pass | 2199 \| 2 |
| — | 2 | halted — no commit | | |
| `863a0a9` | 3 | 0 | pass | 2199 \| 2 |
| `b4a5935` | 4 | 0 | pass | 2199 \| 2 |
| `0959fa0` | 5 | 0 | pass | 2199 \| 2 |
| `76f3bb5` | 6 | 0 | pass | 2199 \| 2 (new rules test is CI-only) |
| `fbba3b86` | 7 | 0 | pass | 2199 \| 2 |
| `276621b` | 8 | 0 | pass | 2199 \| 2 |
| report commit | 9 | run before commit | run | run |

Local counts are flat because this tier's new coverage is one emulator test (CI-only) and one existing-loop extension; no local suites were added or removed.

## Contradictions / refinements vs the evidence base

1. **Phase 2's defect does not exist** — the audit correctly called the rows *inert*; the tier brief's "toggles that move" mis-stated it. Halted.
2. **Phase 8 part 1 was already done** on `main` (RecordResponseScreen hosts the button); the audit pre-dated that landing. Only the route retirement remained.
3. **Phase 6's "zero writers and zero readers" held for only two of three candidates** — `pinned` has a retired-but-lock-tested reader plus a rule-text lock; `rejectedDate` has live analytics readers. Both halted per the rule.
4. **Phase 7's mechanism differed from the audit line** — the empty pool produced a *misleading* message rather than "controls with no explanation"; the fix targets the real mechanism.

## Push & CI

Pushed `origin/main` after the report commit (deliberate: CI is the only executor of the rules tests). The rules changes — the retired notes subcollection and its denial test — are unverified until that CI run is green.
