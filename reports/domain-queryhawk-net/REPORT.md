# Domain move: QueryHawk on queryhawk.net, scriptally.ink retired (17 Oct)

Branch `domain-queryhawk-net`, cut from `origin/main` at **`30439920`**. Commits:
`990c8f6e` (Phase 1), `69803049` (Phase 2), `ab471ecf` (Phase 3), plus this report. Pushed, **not
merged**. On dev via `dev/…-cl1833-cx28-qhnet` (`20ee1014`, `index-CshxOLQG.js`).

## False premises

1. **"Re-point any verbatim lock to the new strings" (Phase 1).** No test pinned any of the four
   strings. Nothing imports `emailCopy.ts` or `unsubscribePage.ts` in a test. D2 is the first lock
   on them.
2. **§0.4, "every reader of `SITE_HOST`".** There is none. Only a CSS comment mentions it. The
   value changed to `queryhawk.net` and nothing renders it.
3. **§0.5, Auth action URLs.** Nothing in the code builds an `actionCodeSettings.url` or a
   continue URL. `authDomain` comes from `VITE_FIREBASE_AUTH_DOMAIN`, which names
   `gen-lang-client-0801391782.firebaseapp.com` on prod and `scriptally-dev.firebaseapp.com` on dev.
   Neither names scriptally.ink, so nothing changed here. Password-reset and verification mail use
   Firebase's default handler on `*.firebaseapp.com`.
4. **"The standing dev commands" for functions + hosting.** `firebase.dev.json` has no `functions`
   block. Dev functions deploy through `firebase.json` with `--project scriptally-dev`, and only
   the functions target is touched, so that file's prod Firestore pin plays no part. I deployed
   **`--only functions:waitlist`**, because `waitlist` is the only function that sends mail or
   reads `ALLOWED_ORIGINS`. `contactMessage`, `betaFeedback` and `weeklyPulse` have no FROM of
   their own.
5. **A hosting deploy from this branch would have wiped dev.** Dev was serving
   `dev/…-cl1833-cx28` (f7651e9f, `index-jU8VeOuO.js`): main plus about a dozen unmerged branches.
   This branch is cut from main, so I merged it onto that integration branch (clean merge) and
   deployed that. The new tip is `dev/…-cl1833-cx28-qhnet` = `20ee1014`, serving `index-CshxOLQG.js`.
6. **"Dev currently sends from scriptally.ink."** It did, through `DEFAULT_FROM`. Its REPLY_TO and
   CONTACT were never scriptally.ink, though. They were Nick's personal Gmail, set in the untracked
   `functions/.env` in the primary checkout. A deploy from any worktree does not carry that file.
   firebase-tools loads `.env` first and then `.env.<projectId>` (checked in
   `lib/functions/env.js`), so the explicit values in `.env.scriptally-dev` now win wherever the
   deploy runs.
7. **D5 cannot go red on the base.** Both files said `hello@scriptally.ink`, so they already
   agreed. Its red reading comes from its mutation only.

## §0 Recon

### 1 · The hits (tests excluded)

The `ScriptAlly` hits in `src/` are identifiers (`useScriptAllyDb`, `ScriptAllyLogo`) and
`@license` docblocks. Neither is a brand value.

| Hit | Class | Action |
|---|---|---|
| `functions/src/emailCopy.ts` CONFIRM_LEAD, WELCOME_NEXT, SIGN_OFF | VALUE | QueryHawk (Phase 1) |
| `functions/src/unsubscribePage.ts` `<title>` | VALUE | QueryHawk (Phase 1) |
| `functions/src/emailConfig.ts` DEFAULT_FROM, SUPPORT_EMAIL | VALUE | queryhawk.net (Phase 2) |
| `functions/src/waitlistModel.ts` two scriptally.ink origins | VALUE | swapped for queryhawk.net |
| `src/lib/companyInfo.ts` SUPPORT_EMAIL, SITE_HOST | VALUE | queryhawk.net |
| `src/lib/companyInfo.ts` docblock ("The `.ink` address wins here…") | CURRENT-FACT | rewritten |
| `src/marketing/MarketingFooter.tsx` ("NOT hello@queryhawk.ink … NXDOMAIN") | CURRENT-FACT | rewritten |
| `src/marketing/appCheck.ts` ("will not work on scriptally.ink") | CURRENT-FACT | queryhawk.net |
| `.env.development` / `.env.production` reCAPTCHA comments | CURRENT-FACT | queryhawk.net; no key changed |
| `functions/.env.example` (fallback note, Namecheap note) | CURRENT-FACT | rewritten, prod template added |
| `functions/src/email.test.ts` docblock ("verified scriptally.ink domain") | CURRENT-FACT | queryhawk.net |
| `src/components/Auth.tsx:38` ("used to link out to https://scriptally.ink") | HISTORY | kept |
| `src/components/HelpCentre.tsx:380` ("This was a hardcoded …") | HISTORY | kept |
| `src/lib/companyInfo.ts:15` ("the legal copy names hello@scriptally.ink", what unification found) | HISTORY | kept |
| `src/marketing/LegalPage.tsx:8` ("`scriptally.ink/terms` served the SPA") | HISTORY | kept |
| `src/marketing/marketingFooter.test.tsx:112` (the 17 Sep NXDOMAIN) | HISTORY (test) | kept |

Brand strings found and **left alone** because they are outside this pack:

- `functions/src/smartImportPrompt.ts:15` names "ScriptAlly's structure" inside a model prompt.
  The writer never sees it.
- `public/queries-preview.html` and `public/theme-editor.html` are dev tools.

### 2 · Tests that pinned a VALUE

- `functions/src/emailConfig.test.ts:33`: `toContain("Nick at ScriptAlly")`.
- `functions/src/emailConfig.test.ts:182`: `/@scriptally\.ink$/`.
- `functions/src/waitlistModel.test.ts:276`: `toContain("https://scriptally.ink")`.
- `src/marketing/marketingFooter.test.tsx:121`: `not.toContain(">scriptally.ink<")`. This guards
  that the bare host is not printed, and it would have gone vacuous.
- `src/lib/contactTransport.test.ts:86,89,98,104` use the address as an input literal.

All of them now name queryhawk.net. None of the email copy was pinned (false premise 1).

### 3 · `resolveMailConfig`

It reads all four values from the environment, so I did not need to stop and report.

| Key | When unset |
|---|---|
| `WAITLIST_FROM` | `DEFAULT_FROM` |
| `WAITLIST_REPLY_TO` | `from`, and `replyToWarning` logs it |
| `WAITLIST_PUBLIC_URL` | `null`, so the caller refuses to send |
| `WAITLIST_CONTACT_EMAIL` | `SUPPORT_EMAIL` |

### 4 · Readers

- **`SITE_HOST`:** none (see false premise 2).
- **Client `SUPPORT_EMAIL`:** `AppFooter`, `MarketingFooter`, `ContactPage` (display and mailto),
  and `legalCopy` (which also feeds the Help centre's `supportMailto`).
- **Server `SUPPORT_EMAIL`:** `unsubscribePage.ts` and the `resolveMailConfig` fallback.

### 5 · Auth URLs

There are none to change (see false premise 3).

## D1–D5 (`src/lib/domain.test.ts`, comments stripped)

The `//` stripper does not touch a `//` inside a URL string. D0 asserts this. A naive
`//[^\n]*` would turn `"https://scriptally.ink"` into `"https:`, and D1 would then pass over the
very strings it hunts. D0 also checks the sweep's population: more than 200 files, including the
seven the move is about.

| Lock | Red on base `30439920` | Red under its named mutation | Green |
|---|---|---|---|
| D1: nothing names scriptally.ink | ✗ companyInfo, emailConfig, waitlistModel | ✗ `hello@scriptally.ink` back in companyInfo → `['src/lib/companyInfo.ts']` (D5 also red) | ✓ |
| D2: no queryhawk.ink; emails and unsubscribe page say QueryHawk | ✗ emailCopy matches /ScriptAlly/ | ✗ old SIGN_OFF restored → emailCopy matches /ScriptAlly/ | ✓ |
| D3: both queryhawk.net origins, no scriptally.ink | ✗ no `https://queryhawk.net` | ✗ `https://scriptally.ink` added → `['https://scriptally.ink']` (D1 also red) | ✓ |
| D4: dev FROM/REPLY_TO/CONTACT explicit on @queryhawk.net | ✗ WAITLIST_FROM undefined | ✗ FROM set to `nick@scriptally.ink` → "Resend no longer has scriptally.ink, so any other FROM is rejected…" (D1 also red) | ✓ |
| D5: server SUPPORT_EMAIL === client SUPPORT_EMAIL, both read from file | ✓ (both said the old address) | ✗ client set to `support@queryhawk.net` → `'hello@queryhawk.net'` vs `'support@queryhawk.net'` | ✓ |

Each mutation was applied in the worktree, run, and restored from a path-derived backup. The tree
was clean afterwards.

## Gates (`set -o pipefail`, read as counts)

| | Baseline `30439920` | Final `ab471ecf` |
|---|---|---|
| `tsc --noEmit` (root) | exit 0 | exit 0 |
| `tsc --noEmit -p functions/tsconfig.json` | exit 0 | exit 0 |
| `build:dev` | exit 0 | exit 0 (and on the integration branch: exit 0, 0 error/warning lines) |
| production `vite build` | exit 0, 0 error/warning lines | exit 0, 0 error/warning lines |
| Vitest | 588 files, 8,852 passed, 3 skipped | **589 files, 8,858 passed, 3 skipped** (+1 file, +6 tests) |

## Phase 4: the send on dev

1. `firebase deploy --only functions:waitlist --project scriptally-dev` from the integration
   worktree. Result: revision **`waitlist-00005-goq`**, updated `2026-10-17T20:43:14Z`. The
   deployed revision's env, read back from the Cloud Functions API:
   - `WAITLIST_FROM = Nick at QueryHawk <nick@queryhawk.net>`
   - `WAITLIST_REPLY_TO = nick@queryhawk.net`
   - `WAITLIST_CONTACT_EMAIL = hello@queryhawk.net`
   - `WAITLIST_PUBLIC_URL = https://scriptally-dev.web.app`
2. Hosting deployed with `--config firebase.dev.json --project scriptally-dev`. The served bundle
   was `index-jU8VeOuO.js` immediately before and `index-CshxOLQG.js` after.
3. I signed up `nick+qhtest@queryhawk.net` in the `/founders` hero form on
   https://scriptally-dev.web.app. The POST to `/api/waitlist` returned
   `200 {"ok":true,"visible":true,"cap":100,"count":2}`, and the page said "You're on the list."
4. The function's log lines, from Cloud Logging (`firebase functions:log` only returns the oldest
   entries, so it cannot reach today):
   ```
   2026-10-17T20:44:46.073Z {"event":"appcheck.monitor","verdict":"verified","route":"join"}
   2026-10-17T20:44:46.760Z {"event":"email.send","template":"confirm","outcome":"sent","ms":488,
                             "id":"01a14b9c-24c6-7a41-98bb-bd010104af93","toHash":"2c3d8e4755049277"}
   ```
   - **FROM used:** `Nick at QueryHawk <nick@queryhawk.net>`. The send line does not log the FROM,
     but the send ran on the revision above, 92 seconds after it was deployed, with that value.
   - **Resend accepted it:** `outcome: "sent"`, with a Resend id. There was no `email.config`
     warning, so the reply-to was set.
5. **Clean-up.** The sign-up was `pending`. Double opt-in is on, so the counter is not written at
   join.
   - Before: `counters/waitlist` read `verifiedCount 2`, last updated `2026-10-16T16:55:38Z`.
   - I deleted `waitlist/2c3d8e47…7654` (its id matches the log's `toHash`), and it now returns 404.
   - After: the counter is identical, and the public count reads 2. There was nothing to restore.
   - One `ratelimits/` document for my hashed IP remains. Every request writes one, it is keyed by
     a salted hash, and it ages out.
   - The confirmation should be in the nick@ mailbox, sent from that address. I cannot see the
     mailbox: Resend's acceptance is the evidence. Its link was not clicked.

## For Nick

### The four lines for prod

Add these to `functions/.env.gen-lang-client-0801391782`, alongside `FIRESTORE_DATABASE_ID`. The
same block is in `functions/.env.example`.

```
WAITLIST_FROM="Nick at QueryHawk <nick@queryhawk.net>"
WAITLIST_REPLY_TO=nick@queryhawk.net
WAITLIST_CONTACT_EMAIL=hello@queryhawk.net
WAITLIST_PUBLIC_URL=https://queryhawk.net
```

Keep the quotes on `WAITLIST_FROM`: the display name has spaces and angle brackets, and the
firebase-tools parser takes a quoted value whole.

### Open items

- **Your untracked `functions/.env`** in the primary checkout still sets `WAITLIST_REPLY_TO` and
  `WAITLIST_CONTACT_EMAIL` to your Gmail. The per-project files now override it on every deploy,
  so it is dead weight. Delete those two lines when convenient.
- **Prod hosting.** The `/api/waitlist` rewrites in `firebase.json` stay in your launch order:
  function, then rules, then hosting. This pack did not touch them.
- **App Check.** Prod still needs a reCAPTCHA Enterprise key for queryhawk.net. The env comments
  now say so.
- **Stale wording left alone, as scope.** These still describe forwarding as "not currently
  delivering", which was true of the old domain:
  - `emailConfig.ts`'s `replyToWarning` message and its docblock.
  - The comment above the support-address test in `emailConfig.test.ts`.

  With the reply-to now set on dev and in the prod template, the warning should not fire.
- **Brand strings outside the pack:** `smartImportPrompt.ts` (model prompt),
  `public/queries-preview.html` and `public/theme-editor.html` (dev tools).
