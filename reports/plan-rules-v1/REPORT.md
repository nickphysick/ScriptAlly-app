# Plan rules v1 — final report

## v1.1 (13 Nov) — the agent cap, and both Free limits off the stored plan

v1 claimed `addAgent` had no cap and shipped "Unlimited" agents on Free (plan table, `/pricing`, landing tiers). It had one:
Free refused a sixth agent. Both Free limits also read the stored `plan`, so a founding writer or trial stored as Free
was held to 1 manuscript and 5 agents. Nick ruled (13 Nov): remove the cap.

- `addAgent` has no limit on any plan (`bypassLimits` kept for its callers, unused).
- The one manuscript limit is `manuscriptLimitError(entitlement.pro, count)` in `lib/manuscripts.ts`; db.addManuscript, the
  add form, onboarding and import all call it. Pending counts as Pro, so nothing is refused before the entitlement loads.
- Lock: `src/lib/planLimits.test.ts` — no agent-count limit anywhere in `src/` or `functions/src/`, no count gated on the
  stored plan, every caller passes `entitlement.pro`. Its two patterns match both old lines at `848668af2` (red before).
- e2e: `contactV11` §11.9 "the free cap surfaces IN the card" deleted (with no cap it would write a real agent);
  `addAgentV1`'s header note corrected.
- Gates: tsc clean; Vitest 12060 passed, 3 failed — the baseline three (emuGuard, firestoreTarget); build clean.

12 Nov 2026. Branch `plan-rules-v1` (pushed, tip in the log below), cut from the dev line's tip `0dbabdc89`.
**On dev:** https://scriptally-dev.web.app serves `index-nf9qrdAM.js`, built from a clean checkout of `9dddd36c0`
(pushed as `plan-rules-v1` and as `dev/…-pa41-clp1-ql2-prv1`). It replaced `index-BTbKdg-q.js` (…-clp1-ql2, this branch's base).
Functions deployed to scriptally-dev: `extractFromEmail`, `suggestComps` (a create: it had not been on dev), `smartImportMap`,
`foundingStatsOnFeedback`, `foundingStatsNightly`. **Nothing on prod.** Not merged into main.

## Commits
| sha | what |
|---|---|
| `4a5f358bf` | Founding flag 1/4: the resolver reads it, on client and server |
| `2c4712f0a` | Founding flag 2/4: the foundingStats run is the backstop setter |
| `bf7ae6ce5` | Founding flag 3/4: the founder-only admin script |
| `cc43a61d9` | Founding flag 4/4: the one-off backfill, run on dev |
| `073a11bbc` | Phase 1: the plan table and one module for prices |
| `4bc3abbd4` | Phase 2: every gate reads the one resolver, client and server |
| `e2255b84a` | Phase 3: Smart Import once per account, on every plan |
| `9dddd36c0` | The four open-to-all switches retired |
| (this commit) | One stale comment ("one a month on Pro", smartImportConfirm.ts), plus this report. Not in the dev bundle. |

## Gates
- **Baseline** (`0dbabdc89`, before the first edit): tsc 0 errors (needs `NODE_OPTIONS=--max-old-space-size=8192`, or it runs out of
  memory); `functions` tsc 0; build clean; Vitest **3 failed** / 12022 passed (`emuGuard` ×1, `firestoreTarget` ×2, all of them
  e2e files on the dev line).
- **End:** tsc 0, `functions` tsc 0, build clean, Vitest the **same 3 failed** / 12055 passed. No worse than baseline.
- **`npm run test:functions`** (emulator, through the slot): 81 passed, **1 failed**. The failure is
  `foundingStats.emulator.spec.ts` "counted:false…": it expects a `fixed` note to be worth 1, but `84db5c5b4` (Your notes v1) made
  `fixed` earn +3 and left this spec as it was. That red came in before this pass and is not from this work. The Smart Import claim
  spec passes with the new reasons.
- **Red against the base first:** with the new locks copied onto `0dbabdc89`, 11 assertions fail. They cover: Free sees its work
  read-only; the Scout lock; the second Smart Import refused for Free, paid Pro and founding accounts, and for an old Pro month on
  record; the plan no longer read. The client–server agreement test and the Smart Import agreement test fail to load on the base,
  because the resolver did not exist there.
- The e2e specs I edited (`queryLettersV2` QL2-F2, `onbV5ImportPage` D2, `onbV5`, `landingWaitlist.public`) collect, but **were not
  run**.

## The founding flag
- **Shape:** `users/{uid}/private/entitlement` gains `founding: true|false`, `foundingSince` (server timestamp) and
  `foundingSource` (`invite` | `waitlist` | `admin` | `backfill`). Rules: owner read, `allow write: if false`. Rules unchanged. The
  app cannot write it; it is still not writable from the app, which was a stop condition, and it did not trigger.
- **Who sets it:**
  1. **Founder's code: it exists, but nothing in it can be hooked by uid.** `redeemInviteCode` runs before the account exists. It
     records the email on `inviteCodes/{CODE}.usedBy` / `usedAt`. It is also switched off (`INVITE_GATE_ENABLED = false` in
     `src/lib/beta.ts`). I did not rewrite it. I hooked it the only way it allows, which is an email match in the backstop below.
     Invite proof ranks above waitlist proof.
  2. **The backstop:** `markFoundingFlags` at the end of `recomputeFoundingStats` (nightly at 03:00, and on every betaFeedback
     write). It fills an **absent** flag only. `false` is an unmark and stays. It respects the cap (`counters/waitlist.cap`, else
     `DEFAULT_CAP` 50): accounts already founding count against it, and each refusal is logged as `founding.flag.capped`.
  3. **The admin script:** `scripts/founding-flag.mjs`, below.
- **Dev backfill:** `scripts/backfill-founding-flags.mjs`. Dev has **87 accounts against a cap of 50**. You ruled that all 87 are
  marked, so the run passed `--over-cap`: "written: 87. Founding now 87 of 87 accounts." A second dry run plans nothing.
- **How dev resolves now:** founding **87**, trial **0**, Free **0**, paid Pro **0**. Two of the 87 are under 14 days old; they
  are founding, so they have no trial clock. Every dev account resolves to everything, so no dev account lost anything it could
  open before, which was a stop condition, and it did not trigger.

### Marking one account by hand
```
ALLOW_LIVE_FIRESTORE=1 node scripts/founding-flag.mjs --project scriptally-dev --email writer@example.com --mark
ALLOW_LIVE_FIRESTORE=1 node scripts/founding-flag.mjs --project scriptally-dev --email writer@example.com --mark --confirm
```
The first prints the account, its flag, the count against the cap and the change; only `--confirm` writes. `--uid <uid>` works
in place of `--email`, and `--unmark` in place of `--mark`. On prod, pass `--project gen-lang-client-0801391782`; its database is
filled in for you.

### What Nick must run on prod when founding writers are first let in
1. Create `functions/.env.gen-lang-client-0801391782` (already on the list in CLAUDE.md), then merge this work into `release/live-1`.
   Release/live-1 still has functions on Node 20.
2. Deploy, in this order: functions `extractFromEmail`, `suggestComps`, `smartImportMap`, `foundingStatsOnFeedback` and
   `foundingStatsNightly`; then hosting. No rules deploy is needed.
3. Mark each founding writer as they are let in:
   `ALLOW_LIVE_FIRESTORE=1 node scripts/founding-flag.mjs --project gen-lang-client-0801391782 --email <email> --mark --confirm`.
   The nightly run is a backstop for anyone who redeemed a code or holds a verified waitlist place under their sign-in email.
4. **Do not run the backfill on prod.** It refuses prod without `--prod`, and it would mark everyone.
5. Prod's `counters/waitlist.cap` was still 100 (memory, 25 Oct). The flag's cap reads the same field, so set it to 50 first if
   50 is the number.

## Every gate moved
| Gate | Before | Now |
|---|---|---|
| Submission packages: `db.addPackage`, `canAttachPackages`, `MaterialsField`, Queries ×3, To-do and phone cards | `PACKAGES_OPEN_TO_ALL` or plan | `packagesUnlocked(entitlement)` → `canUse(e,"packages")` |
| Versions: `VersionsV2Page`, Queries ×2, `PackagesPhone` | `VERSIONS_FOUNDING_ACCESS` or plan | `versionsUnlocked(entitlement)` |
| Query letters, Comparable titles and the packages page (`MaterialsLock`) | `navLockedFor(user)`, blur and lock card | `readOnly(e, …)`: the page in full and inert, under one line and "See Pro plans" |
| The Scout (Discover page) | not gated | `MaterialsLock page="scout"` (lock card); nav tag `discoverUnlocked(e)` |
| The Scout (`suggestComps` callable) | `plan !== "Pro"` | `hasPro(resolveBasis(...))` |
| Smart email drop: `PasteEmailButton`, `QueryPicker`, App's paste lane | `plan === PRO` | `canUse(e,"emailDrop")` |
| Smart email drop (`extractFromEmail` callable) | `plan !== "Pro"` | `hasPro(resolveBasis(...))` |
| Nav Pro marks (`WorkspaceShell`) | `navLockedFor(user)` and the switches | `navLockedFor(entitlement)` |
| Sidebar plan line and upgrade link, `AccountMenu`, phone account pages | `planLine(plan)` | `planLine(entitlement)`: "Founding writer" / "Pro plan" / "Pro trial" / "Free plan"; the link only when `prompts` |
| Settings plan card, its "See Pro plans", the comparison CTA, `PlansPage` | `plan === PRO` | `planColumn(e)`, `e.prompts` |
| Dashboard upsell `OneScreenPro` (mounted nowhere) | `isProUser` | `e.prompts`; its "Unlimited manuscripts" line is gone |
| Packages founding banner | open-to-all and not paid | the founding flag (`e.basis === "founding"`) |
| Smart Import: client and `smartImportMap` | Free once; Pro monthly | once per account, any plan (`smartImportUsed`, both sides) |

### The four switches, and what replaced each
- `PACKAGES_OPEN_TO_ALL` → `canUse(e,"packages")`
- `VERSIONS_FOUNDING_ACCESS` → `canUse(e,"versions")`
- `DISCOVER_OPEN_TO_ALL` → `canUse(e,"scout")`
- `MATERIALS_OPEN_TO_ALL` → `canUse(e,"letters")`

`NAV_OPEN`, `navLockedFor`'s override argument and the `navOpenAid` dev aid went with them. In dev builds only, `__SA_NAV_FREE`
now stands the account in as a day-15 Free writer (`freeWriterAid`).

## What could not be moved, and why
- **The CLAUDE.md line ("agents capped by `addAgent`") is NOT corrected.** That line exists only in main's CLAUDE.md; this
  branch carries the old 955 KB file, and the merge rule takes main's CLAUDE.md, so an edit here would be lost. Main is checked out
  in `/Users/nickphysick/ScriptAlly-app`, which another live session holds, with 78 dirty files. The change is one line, for
  whoever next holds main:
  `- **Free plan limits are code, not copy:** one manuscript on Free (\`FREE_MANUSCRIPT_LIMIT\`); there is no agent cap (\`addAgent\` has none); read the constant before stating a number.`
- **Housekeeping assist-fill** (`HousekeepingSweep`, and the `assistAgentData` callable) still checks `plan === "Pro"`. It is not
  in the baked Pro list, and its callable is outside this pass's functions scope. Founding and trial accounts do not get it.
  Needs a ruling: Pro, or open to everyone.
- **Read-only is page-level, not control-by-control.** On Free, the Materials pages are inert under one line. Their create and
  edit controls are disabled, not replaced, which would have meant redesigning each page (out of scope). Versions keeps its own
  existing lock card over an inert list.
- **"Which package wins requests"** has no gate of its own: the results show on the read-only packages page.
- **`AllManuscripts.tsx`** (locked, and rendered by no route) still calls `isProUser` for the comp Scout panel, and **`MsFoot.tsx`**
  (a Manuscripts page file) keeps a comment naming `PACKAGES_OPEN_TO_ALL`. Both are on the do-not-touch list.
- **`trialStartDate`** is retired: nothing reads or writes it. The field stays in `src/types.ts` and in the rules allowlist.
- **The welcome page** (`welcomeCopy.ts`, not in the plan files) still labels the ticket "Founding writer pass". The landing ticket
  now says "Founding writer place".
- **Signing up shows no founding status until the nightly run** (or a hand mark). Until then a new founding writer is on the trial,
  which is full Pro, but may see upgrade prompts. Marking someone at sign-up needs a new trigger, outside this pass's functions
  scope.
- **The signed-in pages were not checked in a browser:** the browser pane is not signed in to dev, and I did not sign in. The
  public `/pricing` page on dev was read live: the new bundle, all seven Pro rows, the corrected FAQ, no "20 agents" and no "pass".

## Greps (literal, comments included, src/ outside tests)
"20 agents", "twenty agents", "Comp Scout": none. "One a month": none on plan surfaces (the only hits are `analyticsV24`'s query send
rate, "less than one a month"). "pass" as a plan word: none in the six plan files (comments stripped), and `planWords.test.ts`
holds that.

## Step 0 report (as it stood when the run stopped, 12 Nov, before the continuation)

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
3. **"There is no agent cap"**: ⚠️ CORRECTED 13 Nov — this was FALSE. `addAgent` refused a sixth agent on a stored Free plan
   (`agents.length >= 5`), and the copy said "Up to 20 agents". v1 shipped "Unlimited" against a 5 cap. Fixed in v1.1 below.
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
