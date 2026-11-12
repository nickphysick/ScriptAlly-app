# Plan rules v1 — STOPPED at Step 0.2 (red gate: no founding signal)

12 Nov 2026. Branch `plan-rules-v1`, cut from the dev line's tip `0dbabdc89` (…-clp1-ql2, what dev serves:
`index-BTbKdg-q.js`). Worktree `/Users/nickphysick/ScriptAlly-prv1`. **No source file edited, no baseline run, nothing deployed.**
`design-refs/plan-table-v1.html` copied in from ~/Downloads; SHA256 matches (`cf5ae3db…b2db64`).

## Why the base is the dev line, not main
`main` is 1,026 commits behind the dev line and differs in exactly the files this prompt edits
(`entitlements.ts` +74 lines, `pricingCopy.ts` +262/-85, `functions/src/importDrafts.ts`, the Materials lock,
Versions v2, Discover v1). Building on `main` would gate pages that only exist on the dev line, and would
then conflict while being merged back onto it. (CLAUDE.md says direct-to-`main` with no branches; the prompt
asks for a branch. I followed the prompt.)

## Step 0.2 — the founding signal: RED
There isn't one. The code says so in three places:
- `src/lib/entitlements.ts`: "THERE IS NO FOUNDING FIELD ON THE ACCOUNT". During the beta every account is
  treated as founding through four `*_OPEN_TO_ALL` / `VERSIONS_FOUNDING_ACCESS` constants, all `true`.
- `functions/src/foundingStats.ts`: "No account carries a founding flag (the waitlist is keyed by email and
  never linked to a uid)". The founding *number* is an email-hash join, done nightly and when feedback is
  written, into `foundingStats/{uid}.foundingNo`. A writer who signed up with a different email from the one on
  the waitlist gets `null`. A writer with no feedback and no waitlist place has no doc at all.
- `User` (`src/types.ts`) has `plan`, `trialStartDate`, `subscriptionStatus` and no founding field.

So "founding writers have everything" can't be answered from one signal today. Three ways to make one, for Nick:
1. **Recommended: a server-written `founding: true` on `users/{uid}/private/entitlement`.** The owner can already
   READ that doc (`firestore.rules` line 1247, no rules change), the client already listens to it (`db.tsx:581`),
   the client can't write it, and `smartImportMap` already reads it in its transaction. `foundingStats` already does
   the email join, so it can stamp the flag, and a one-off backfill can stamp today's accounts. The weakness is the
   same as the founding number's: a writer who signed up with a different email isn't found (an admin fix).
2. **A cut-off date:** every account created before launch day counts as founding. This is one constant, it needs no
   data, and it matches the beta's "every account is founding". The weakness: it turns everyone who signs up before
   the date into a founding writer, waitlist or not.
3. **`foundingStats/{uid}.foundingNo != null`**: no new writes, but the client reads it asynchronously, it lags
   by up to a day, and the server's Smart Import check would need a second read. I don't recommend it.

## Step 0.1 — where a plan's contents or price are stated
- `src/lib/planComparison.ts`: the app's Free/Pro table. Its rows still carry "One a month" (Smart Import, line 80)
  and "The Comp Scout" (line 95).
- `src/marketing/pricingCopy.ts`: "Up to 20 agents" (line 127, and the FAQ at line 171).
- `src/marketing/landingCopy.ts`: `PRICING_TIERS` (£4.99/month, per planComparison's header) and a Pro list with
  "The Comp Scout" (line 581). **The prompt doesn't name this file.**
- `src/lib/smartImportEntitlement.ts` plus `functions/src/smartImport.ts`: the Free-once / Pro-monthly policy, mirrored
  on both sides. `smartImportLine` has "This month's…" copy for Pro.
- `PlansPage.tsx` (reads planComparison and `isProUser`), `PlanComparison.tsx`, `AccountSettings.tsx`
  (`planAllowanceLine`), `shellSidebar.ts:142` ("Free plan" / "Pro plan", with an upgrade flag),
  `OneScreenPro.tsx` (the dashboard's upsell, hidden for Pro), and the marketing pricing pages (`PricingPage`,
  `PricingPhone`, `PricingPlans`, `PlanSheetPhone`, `pricingParts`).

## Step 0.3 — how each surface is gated today
| Surface | Gate | Enforced |
|---|---|---|
| Query letters, Comparable titles (Materials) | `MaterialsLock` → `navLockedFor(user).has("materials")`; `MATERIALS_OPEN_TO_ALL = true` | client only |
| Manuscript versions | `versionsUnlocked`, `VERSIONS_FOUNDING_ACCESS = true` (VersionsV2Page, Queries ×2, PackagesPhone) | client only |
| Submission packages | `packagesUnlocked`, `PACKAGES_OPEN_TO_ALL = true`; `db.tsx:1967` refuses `addPackage`; six other readers | client only; rules and functions never gated packages |
| Discover / the Scout (agents) | `discoverUnlocked`, used only for the nav's Pro tag. "Nothing has ever gated it" | none |
| The Scout (comps) | `fetchCompRun(…, isPro)` throws for non-Pro; `isProUser` in AllManuscripts; server `suggestComps` refuses non-Pro | **client and server** |
| Smart email drop | `PasteEmailButton` (`plan === PRO`); server `extractFromEmail` refuses non-Pro (`EMAIL_IMPORT_REQUIRES_PRO`) | **client and server** |
| Smart Import | `getSmartImportEntitlement` plus `smartImportMap`'s transaction | **client and server** |
| Others reading `plan` directly | `App.tsx:837`, `QueryPicker.tsx:36`, `Queries.tsx:9661`, `HousekeepingSweep` (assist-fill), `AccountPhone` | client |

There are three Pro predicates (`isProUser`, `entitlements.*Unlocked`, and raw `plan === UserPlan.PRO`), and
there are server-side Pro checks in `extractFromEmail`. **Phase 2's "no second list of what is Pro" therefore reaches
into `functions/`**: if a founding writer or trial account must get Smart email drop, the server has to know
founding and trial too, or the callable refuses them while the client shows the button. The prompt's Phase 2 is
client-only.

## Step 0.4 — false premises in the prompt
1. **"Find how an account is known to be a founding writer"**: it isn't known (above). This is the red gate.
2. **"Trial window = 14 days from account creation, derived, never stored"**: the account has no creation field.
   `User` stores `trialStartDate` (written at sign-up, in the rules allowlist), and the only other creation time is
   Firebase Auth's `metadata.creationTime`. The server can read it through `getAuth()`; the client can read it on
   `auth.currentUser` and nowhere else. "Derived, never stored" means choosing one of these. `subscriptionStatus`
   already has a `"trialing"` value that nothing would then set.
3. **"There is no agent cap"**: true in the code. CLAUDE.md's "agents capped by `addAgent`" is stale; `addAgent`
   has no limit. Only the copy says "Up to 20 agents" (two places in `pricingCopy.ts`).
4. **"Smart email drop" and "The Scout" are client-only gates**: false. `extractFromEmail` is gated on the server, so
   a trial or founding writer would be refused there unless `functions/` changes too. `suggestComps` is the same: it
   refuses non-Pro on the server (`SUGGESTIONS_REQUIRE_PRO`, line 72).
5. **The prompt doesn't name `landingCopy.ts`**, which also states the Pro list ("The Comp Scout") and the price
   (`PRICING_TIERS`, £4.99). Phase 1's "one module for prices" has to absorb it as well, and it's commented as
   verbatim-locked.
6. **The "pass" grep**: " pass" matches about 450 source files and "passes" about 160, almost all of them code ("passes
   the test", "a pass"). The VERIFY grep needs a narrower pattern (for example, user-facing strings in `marketing/`
   and `PlansPage`/`PlanComparison`), or it can never come back clean.
7. **"Founding: no upgrade prompts anywhere"** reaches beyond the files listed: `OneScreenPro.tsx`, the
   `shellSidebar` upgrade flag, `Pk41Banner`, and the marketing pages a signed-in writer can visit.

## What is needed to go on
A ruling on the founding signal (1, 2 or 3 above), and on whether the server-side Pro checks
(`extractFromEmail`, `suggestComps`) move with Phase 2 in this prompt. With option 1 the work touches
`functions/` (foundingStats plus a backfill), which the prompt doesn't forbid, and needs no rules change.
