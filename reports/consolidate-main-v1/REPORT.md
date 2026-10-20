# Bring `main` level with dev (consolidation v1) — report

20 October 2026 · `main` fast-forwarded `4311b34c` → **`085199e8`** (the merge of the branch dev serves) · branch `consolidate-main-v1` · **no prod writes, and no dev deploy needed.**

## False premises — read first

1. **Prod hosting does not come from `main`, so "prod is a long way behind dev" isn't the right frame.** queryhawk.net, www.queryhawk.net and the prod app site `scriptally-app` all serve `index-CHLVUiAN.js`, the landing-only build from **`release/live-1`** (`cb6969e2`, the founding welcome). That line is on neither `main` nor the dev branch: **24 commits** (go-live, landing-only, leftovers, founding welcome).
2. **After this merge `main` is still not deployable to prod.** Compared with what prod runs, a prod deploy from `main` today would do five things:
   - **Hosting:** put the full app on queryhawk.net. `main` has no `VITE_LANDING_ONLY` and no `siteMode.ts`.
   - **Waitlist:** break it silently. `main`'s `firebase.json` lacks the `/api/waitlist` rewrites, so the SPA catch-all would answer 200 with HTML.
   - **Caching:** drop the cache headers.
   - **The `waitlist` function:** lose the founding numbers and the `/welcome` endpoints.
   - **The deploy guard:** lose `f73a6bb1`'s guard on the database check during `firebase deploy`'s analysis.

   You chose report-only for this: see "What prod needs", step 0.
3. **The dev branch carried one pack your list didn't name:** Query Centre v141.1, merged 7 minutes before I looked. You said to take what dev serves, so it's included.
4. **The charge-protection pack is on neither `main` nor any remote branch.** There is no branch with "charge" in its name; whatever it was, it isn't pushed.
5. **`main` already held the loader v2 merge (`4311b34c`).** It held only two commits the dev branch lacked, both report-only (loader v2's report and its live-run JSON).

## The dev branch and its hash

`dev/main-cl18-…-qc141-silf-irf1-qc1411` at **`d0a5364a`**. Built with `npm run build:dev`, it gives **`index-Dbgped49.js`**, exactly what https://scriptally-dev.web.app served at Step 0 (it had changed from `index-C2WQubzs.js` minutes earlier, when another session deployed v141.1).

## What `main` gained

291 commits in 133 first-parent steps. By pack, roughly oldest first:

- **Contact list:** v18 (A–G), v18.1, v18.2, v18.3, v18.3.1, v18.3.2 (and its reverts), v18.3.3, v19 (A–K), v19.1 (A–G) and v19.2.
- **Query Centre:** v138.5 (A–I), v138.6, v139, v140, v140.1, v141 and v141.1.
- **Dashboard:** v59 (A–F; the weekly pulse callable and `betaPulse` rules), v60 and v60.1 (first use, the two hoops).
- **Analytics:** v21, v24 and v24.1.
- **To-do list:** v5.1 and v5.2.
- **Other packs:**
  - Comparable titles v28 · Discover v1 (with its rules: `discoverPrefs`, `scoutDecisions`, `scoutShares`, `agentSubmissions`) · Help system v1 (with the `betaFeedback` screenshot storage rule) · Help Centre v1 · Header rules v1.1.
  - Wording fixes v1 · the domain move's dev branch work.
  - Smart Import loader v2's follow-up (already partly on `main`) · Import review v1 (A–D).

`git log --first-parent --oneline 4311b34c..085199e8^2` lists every step.

## Conflicts

**None.** The merge applied cleanly. The merged tree differs from the dev branch only in `reports/smart-import-loader-v2/` (`main`'s two report commits). No feature file was edited.

## Gates

| | dev branch `d0a5364a` (baseline) | merge `085199e8` |
|---|---|---|
| root tsc | clean | clean |
| functions tsc | clean | clean |
| `build:dev` | clean (no `error`/`[WARNING]`), `index-Dbgped49.js` | clean, **`index-Dbgped49.js`** |
| `build:prod` | clean | clean |
| Vitest | 636 files · 9,373 passed · 3 skipped | 636 files · 9,373 passed · 3 skipped |

The e2e suites already red on the dev branch stay as they were. From the import-review pack's runs: `onbV5ImportPage` P1 ×2, `onbV5Import` H2 ×2 and N3, and `onbV9` R1. Each pack's own report lists the rest.

## CI

**Green.** Run 39447392741 on `085199e8`: typecheck, tests and build all passed. This report's own commit runs CI again, and it changes only the report.

## Dev

**Not redeployed.** `main` built in dev mode is byte-identical to what dev serves (`index-Dbgped49.js`), because `main` had nothing the dev branch lacked except two reports. So there was no walk and no test account.

**From here on, new packs branch from `main`.** The dev integration branches (`dev/main-cl18-…`) have done their job; the next dev build should come from `main` or a branch cut from it.

## Unmerged remote branches (81 not merged into the old `main`; none merged or deleted)

- **Contained in the dev branch (now in `main`): 49 branches.** Every feature branch behind the packs above, and the earlier `dev/…` integrations.
- **The other 32 are not wholly in the dev branch. Contained except one report-tail commit each, written after their merge into dev:**
  - analytics-v24 and analytics-v24-1;
  - comps-v28;
  - contact-list-v18-3, -v18-3-1, -v18-3-2, -v18-3-3, -v19, -v19-1 and -v19-2;
  - dashboard-v60, discover-v1, todo-list-v5-1 (a merge of contact-list-v18) and todo-list-v5-2.

  All are superseded, with only report text left behind.
- **Superseded integrations:**
  - `dev/…-qc1386` (an older v138.6 merge);
  - `dev/…-dv1` (+1, a Discover merge);
  - `dev/…-wf1` (+1, a wording-fixes merge);
  - `dev/…-silf-qc1411` (+2, v141.1 merged onto a base without import review).

  Their content is in `main` through other merges.
- **Work found nowhere else in `main`:**
  - **`release/live-1`** (24 commits). This is what prod runs: go-live, landing-only (`landing-live`), leftovers (`leftovers-queryhawk`) and the founding welcome (`founding-welcome`). Those three branches are prefixes of it.
  - **`domain-queryhawk-net`** (3 commits): dev confirmation links on dev.queryhawk.net, and the waitlist accepting that origin. Also in `dev/…-qhnet` (+5).
- **WIP parks, 4–6 weeks old:**
  - `wip/pkgband-artefacts-…`, `wip/qc-finish-…`, `wip/qc-stuckbar-…`, `wip/qc-worktree-…`, `wip/sa-base-…` and `wip/sa-list-…` (one commit each);
  - `wip/stash-dashboard-skeleton-…` and `wip/stash-rules-tests-…` (stash commits, 4 months old).

  These are measurement output and parked work, pinned for safety. They are not product and not in `main`.

## Worktrees with uncommitted work (not touched)

| worktree | branch | dirty files | in the dev branch? |
|---|---|---|---|
| ScriptAlly-app (primary) | `main` (local ref at `587a0a7f`, behind `origin/main`) | 29 | yes |
| ScriptAlly-desk | feat/shell-desk | 25 | **no** (7 commits) |
| ScriptAlly-dv1-base | detached `30439920` | 37 | yes |
| ScriptAlly-dv1-measure | detached `30439920` | 45 | yes |
| ScriptAlly-merge | detached `a6d46d7b` | 148 | **no** (1 commit) |
| ScriptAlly-raam | retire-add-agent-modal | 63 | **no** (2 commits) |
| ScriptAlly-stack | detached `41d2c301` | 0 | yes |

The primary checkout's local `main` ref is stale. I didn't touch it; `git pull` there is yours when its 29 dirty files allow.

## What prod needs (read-only checks; nothing written)

**1 · Hosting.**
- queryhawk.net, www and `scriptally-app.web.app` serve `index-CHLVUiAN.js`, which is `release/live-1` `cb6969e2` (the founding welcome deploy, 19 Oct).
- The default site, `gen-lang-client-0801391782.web.app`, still serves the old ScriptAlly holding page.

**2 · Functions.**
- **Defined on `main` (and identically named on `release/live-1`):** smartImportMap, extractFromEmail, suggestComps, assistAgentData, waitlist, sendContactMessage, sendBetaFeedback, sendWeeklyPulse, redeemInviteCode, waitlistRetention.
- **Deployed on prod:** four, read from the Cloud Functions API:

| function | deployed | `FIRESTORE_DATABASE_ID` |
|---|---|---|
| waitlist | 19 Oct | the named prod database |
| waitlistRetention | 18 Oct | the named prod database |
| smartImportMap | 23 Jun | **unset** (fails closed: it asks for `(default)`, which prod lacks) |
| extractFromEmail | 17 Jun | **unset** (same) |

  All four run on Node 20, **which can't be deployed after 30 Oct.**
- **The function code differs in both directions:**
  - `release/live-1` has: the founding number and welcome endpoints in `waitlist*`; `firestoreTarget` (`f73a6bb1`); the QueryHawk naming; the reply-to wording.
  - `main` has: loader v2's `smartImportCore`/`progressCounter`; Help system's `betaFeedbackCore`; email changes.
- **`functions/.env.gen-lang-client-0801391782` does not exist** in any checkout on this machine. The `ScriptAlly-live` and `ScriptAlly-landing` worktrees it was made in are gone. It needs exactly the five lines in `reports/go-live/RUNBOOK.md` step 2 on `release/live-1`:
  ```
  FIRESTORE_DATABASE_ID=ai-studio-ae82196c-c59e-40b9-b209-9fb02f67ade6
  WAITLIST_FROM="Nick at QueryHawk <nick@queryhawk.net>"
  WAITLIST_REPLY_TO=nick@queryhawk.net
  WAITLIST_CONTACT_EMAIL=hello@queryhawk.net
  WAITLIST_PUBLIC_URL=https://queryhawk.net
  ```
  (`WAITLIST_IP_SALT` and `RESEND_API_KEY` are secrets already set on prod. `ANTHROPIC_API_KEY` is set too, and its rotation is still open.)

**3 · Rules.**
- Read from the Firebase Rules API. The live Firestore ruleset (released `2026-10-18T19:38:13Z`) and the Storage ruleset (`19:38:11Z`) are **byte-identical to `release/live-1`'s files.**
- **`main`'s are those plus additions only, nothing removed.** Prod would currently deny:
  - **Firestore:** the user document's `discoverPrefs` field (Discover v1); `users/{uid}/scoutDecisions/*`; `users/{uid}/scoutShares/*`; the `agentSubmissions` collection.
  - **Storage:** `betaFeedback/{uid}/{file}` (Help system v1's feedback screenshot).

**4 · Everything else `firebase.json` deploys.**
- **No Firestore indexes file on either line**; prod and dev have none.
- **`main`'s `firebase.json` lacks what prod runs with:** the two `/api/waitlist` rewrites and the two `Cache-Control` header blocks. It adds a `functions.ignore` that leaves `eval` out of the upload.
- **`.env.production` on `main` lacks `VITE_LANDING_ONLY=true`.**

**5 · The order, and every command.**

0. **First, a pack of its own: merge `release/live-1` (and `domain-queryhawk-net`) into `main`.**
   - A dry run (`git merge-tree`) gives two conflicts:
     - `design-refs/.refhashes.json`: take both sides, then `node scripts/check-design-refs.mjs`.
     - `functions/src/email.ts`: keep `main`'s `overrides.replyTo === undefined ?` condition with `release/live-1`'s comment.
   - `domain-queryhawk-net` merges cleanly.
   - Then gates, a dev deploy and a walk.
   - **Decide what prod should be.** Landing-only stays landing-only only while `.env.production` carries `VITE_LANDING_ONLY=true`, which this merge brings back. Opening the app on prod is a separate choice.
   - Nothing below is safe before this step.
1. **Create `functions/.env.gen-lang-client-0801391782`** with the five lines above, in the checkout you deploy from (it's gitignored; never commit it).
   - Check: `grep -c . functions/.env.gen-lang-client-0801391782` gives 5.
2. **Functions**, one at a time, `waitlist` first because it's live:
   ```
   firebase deploy --only functions:waitlist --project prod
   firebase deploy --only functions:waitlistRetention --project prod
   firebase deploy --only functions:smartImportMap,functions:extractFromEmail,functions:assistAgentData,functions:suggestComps --project prod
   firebase deploy --only functions:sendContactMessage,functions:sendBetaFeedback,functions:sendWeeklyPulse,functions:redeemInviteCode --project prod
   ```
   - Check after the first: the live waitlist (`node scripts/live-verify.mjs functions`, from the release branch's runbook).
   - Check after the third: the Cloud Functions API (as in item 2) shows `FIRESTORE_DATABASE_ID` set on each.
   - The runtime bump to Node 22 has to land before 30 Oct, either in step 0's pack or its own.
3. **Rules, after the functions:**
   ```
   firebase deploy --only firestore:rules,storage --project prod --debug 2>&1 | tee /tmp/prod-rules.log
   ```
   - Check: the release `updateTime` in the log (the success line names no database).
   - Then `node scripts/live-verify.mjs rules`.
   - Rules only add access, so they are safe before or after functions. After is the order CLAUDE.md gives.
4. **Hosting, last:**
   ```
   npm run build:prod
   firebase deploy --only hosting --project prod
   ```
   - Check: the served `index-*.js` on queryhawk.net matches `dist/assets`, and `curl -s https://queryhawk.net/api/waitlist` answers JSON, not HTML (`node scripts/live-verify.mjs hosting`).

**Why this order.**
- **Functions before rules before hosting.** A hosting rewrite pointing at a function that isn't there yet answers 200 with HTML: the silent failure CLAUDE.md describes for the waitlist.
- **The `.env` file before any function.** Without it the functions refuse to start on prod, by design, rather than writing to a database that doesn't exist.
- **`waitlist` first and alone.** It's the one prod function with live users; if it fails, stop there.

## The worktree

`wt-cons` (scratchpad) is removed after this report.
