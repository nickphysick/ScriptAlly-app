# Go live on queryhawk.net: the runbook

Run these yourself, one step at a time. After each step, tell Claude Code which step you ran, and
it will run the matching verify and report.

**Where to run them.** Use the worktree at `/Users/nickphysick/ScriptAlly-live`, on branch
`release/live-1`. Its tip is `e98e8b5b` plus this runbook and the report.

**Every command names `--project prod`.** A bare `firebase deploy` would resolve `.firebaserc`'s
default, which is also prod. Naming it keeps every line readable for what it does.

> ⚠️ **Do not use `npm run deploy:prod`.** It deploys hosting *before* the function, which puts a
> page in front of a back end that isn't there. It also deploys only `smartImportMap`.

```bash
cd /Users/nickphysick/ScriptAlly-live
```

---

## 0 · Before anything

Create `functions/.env.gen-lang-client-0801391782` with exactly these lines. The database id comes
from `.env.production`; the rest come from the domain move. Nothing in it is secret, so it can be
committed to `release/live-1` afterwards if you like.

```
FIRESTORE_DATABASE_ID=ai-studio-ae82196c-c59e-40b9-b209-9fb02f67ade6
WAITLIST_FROM="Nick at QueryHawk <nick@queryhawk.net>"
WAITLIST_REPLY_TO=nick@queryhawk.net
WAITLIST_CONTACT_EMAIL=hello@queryhawk.net
WAITLIST_PUBLIC_URL=https://queryhawk.net
```

- If you'd rather keep the reply-to untracked, leave `WAITLIST_REPLY_TO` out of this file and put
  it in `functions/.env` instead.
- Don't add `RETENTION_LIVE`. Without it, the nightly waitlist retention job only logs what it
  would delete.

Then build and run the preflight:

```bash
npm run build
```

```bash
node scripts/live-preflight.mjs
```

**Good:** every check is `PASS` except the two `2 · secret …` lines. Those turn green after step 1.

---

## 1 · Secrets

The waitlist function needs **two** secrets. Live has neither (it holds only `ANTHROPIC_API_KEY`).

First the Resend key. Paste the key when prompted. A separate prod key from the Resend dashboard,
limited to sending, is better than reusing dev's.

```bash
firebase functions:secrets:set RESEND_API_KEY --project prod
```

Then the IP-hash salt. It's random, never needs to be known, and nobody types it:

```bash
openssl rand -hex 32 | firebase functions:secrets:set WAITLIST_IP_SALT --project prod --data-file -
```

`ANTHROPIC_API_KEY` already exists on live. **The AI functions wait until you confirm the Anthropic
key has been rotated** (CLAUDE.md "Loose ends": the key was pasted into a chat once). After
rotating, set the new value with:

```bash
firebase functions:secrets:set ANTHROPIC_API_KEY --project prod
```

**Verify:**

```bash
node scripts/live-preflight.mjs
```

**Good:** `PREFLIGHT PASSED.`

---

## 2 · Functions

Deploy the go-live set, named one by one:

```bash
firebase deploy --only functions:waitlist,functions:waitlistRetention,functions:sendContactMessage,functions:sendBetaFeedback,functions:sendWeeklyPulse --project prod
```

What each one is for:

| Function | Why it's in the set |
|---|---|
| `waitlist` | The founding sign-up. |
| `waitlistRetention` | Nightly job, dry run only. The first deploy may ask to enable Cloud Scheduler; say yes. |
| `sendContactMessage` | Not called today, because the contact form uses mailto. Deployed so switching the transport needs no deploy. |
| `sendBetaFeedback` | The feedback dock, on every signed-in page. **Without it the writer sees the bare word "internal".** |
| `sendWeeklyPulse` | The founding-writer panel on the dashboard. **The pack's list left it out, but every signed-in writer can reach it.** |

**Optional, and only after the Anthropic key is rotated.** Run this line to deploy the AI functions:

```bash
firebase deploy --only functions:smartImportMap,functions:extractFromEmail,functions:assistAgentData --project prod
```

| Function | Without a fresh deploy |
|---|---|
| `smartImportMap` | Live has a **July** copy. Per CLAUDE.md that copy reads the wrong database (it calls `admin.firestore()` → `(default)`, which prod lacks), so it fails. The import page and onboarding's import branch then show "We couldn't read that one", which wrongly blames the writer's file. |
| `extractFromEmail` | Pro only. Live has the same broken July copy. Shows "Couldn't reach the importer — please try again in a moment." |
| `assistAgentData` | Pro only, not deployed. Housekeeping's "Find these for me" shows "Couldn't reach assisted fill — enter these manually." |

Leave these two out, because nothing calls them:

- `suggestComps`: the Scout is mounted nowhere.
- `redeemInviteCode`: the invite gate is off. Deploy it only on the day you turn the gate on, or
  every sign-up would be refused with a false "That code isn't one of ours" message.

**Verify:**

```bash
node scripts/live-verify.mjs functions
```

**Good:** five `PASS` lines, one per function. The `INFO` line lists the optional ones and whether
they're deployed.

---

## 3 · Firestore indexes

**Nothing to run.** Live and dev both have zero composite indexes (`firebase firestore:indexes` on
each, 17 Oct), so live lacks none.

> ⚠️ **Know this about live's database.** It is the **ENTERPRISE** edition; dev is STANDARD. The
> 5 July build has been running against it, so it isn't new, but query behaviour on live isn't
> guaranteed to match dev's. If a page that works on dev is empty or slow on live, look there first.

---

## 4 · Rules

Storage is provisioned on live: the bucket `gen-lang-client-0801391782.firebasestorage.app` exists
(it answers 403, not 404). So rules can go straight out. Keep `--debug`, because the release time
it prints is the only proof the rules landed.

```bash
firebase deploy --only firestore:rules,storage --project prod --debug 2>&1 | tee /tmp/live-rules.log
```

Read the release time:

```bash
grep -iE "updateTime|releases/" /tmp/live-rules.log | tail -4
```

**Good:** the releases for `cloud.firestore/ai-studio-ae82196c-…` and for `firebase.storage/…`
both show today's `updateTime`.

**Wait about a minute** before verifying. Rules take seconds to propagate, and an early probe can
report a false denial.

```bash
node scripts/live-verify.mjs rules
```

**Good:** `users/…` is **denied** (403), and the `test/connection` control is **allowed** (200 or
404). These two lines pass under the July rules too. Which ruleset is live is shown only by the
release time above.

> ⚠️ **Between this step and step 5,** the old 5 July page is still live but running against the
> new rules. Keep the gap short.

---

## 5 · Hosting

Rebuild and re-check in one go, so nothing can move between the two:

```bash
npm run build && node scripts/live-preflight.mjs
```

**Good:** `PREFLIGHT PASSED.` Check `3d` proves `dist/` is this tree's production build.

```bash
firebase deploy --only hosting --project prod
```

**Verify:**

```bash
node scripts/live-verify.mjs hosting
```

**Good:** every line `PASS`:

- the title is "QueryHawk: Query With Confidence";
- the page is `no-cache`;
- an asset is `immutable`;
- www gives a 301 to the apex;
- `scriptally-app.web.app` serves the same title;
- `/pricing` returns the app shell.

**Then:**

```bash
node scripts/live-verify.mjs all
```

**Good:** every line `PASS`. That includes `waitlist · GET answers JSON, not the SPA` and CORS
allowing `https://queryhawk.net` while refusing `https://scriptally.ink`.

Anyone who had the July page open needs one reload. Readers who arrive after this point get the
new page at once, because `index.html` is now `no-cache`.

---

## 6 · One real test

1. On https://queryhawk.net/founders, join with `nick+golive@queryhawk.net`.
2. The page should say "You're on the list."
3. The confirmation must arrive at nick@ **from `Nick at QueryHawk <nick@queryhawk.net>`**.
4. **Hover over its link; don't click it.** It must start with
   `https://queryhawk.net/api/waitlist/verify?token=`.
5. Then tell Claude Code to read the send's log line (`email.send`, `outcome: "sent"`).

Remove the test entry afterwards:

- Firebase console → Firestore Database → database `ai-studio-ae82196c-…` → `waitlist` → document
  `b52dcf191e498df34c1b3bfcc4812ab173bcd5fe7cfb23062fbb57bc39a7ffa2` (the SHA-256 of the address)
  → Delete document.
- If you didn't click the link, the counter was never touched and that is all.
- **If you did click it,** the place was counted. If no real writer has verified in the meantime,
  also delete `counters/waitlist`. It is recreated at zero on the next sign-up, and prod's counter
  must start at zero.

**Also check one existing account.** Live already holds 25 users from the July build. Sign in with
your own live account, if you have one:

- the dashboard loads;
- one query opens;
- an edit saves.

New rules validate whole documents, so a July-shaped document can have its writes refused silently.
This is the one test that would show it.

---

## 7 · Rollback

| What | How |
|---|---|
| Hosting | Firebase console → Hosting → `scriptally-app` → Release history → the previous release's ⋯ → **Rollback**. |
| Functions | No previous version exists for the new five. Remove them with `firebase functions:delete waitlist waitlistRetention sendContactMessage sendBetaFeedback sendWeeklyPulse --region europe-west2 --project prod`. To redeploy one from an earlier commit, use a throwaway worktree, never `git checkout --` in a shared checkout: `git worktree add /tmp/qh-fn <commit> && cp functions/.env.gen-lang-client-0801391782 /tmp/qh-fn/functions/ && cd /tmp/qh-fn && npm --prefix functions ci && firebase deploy --only functions:<name> --project prod`. |
| Rules | Firebase console → Firestore Database → Rules → history → the previous version → **Restore**. Storage → Rules works the same way. |

---

## 8 · By hand, in the consoles

None of these could be read without credentials, so check each one:

- **OAuth consent screen app name.** Google Cloud console → `gen-lang-client-0801391782` → APIs &
  Services → OAuth consent screen (Branding). If it still says ScriptAlly or AI Studio, change it
  to QueryHawk. Google sign-in shows this name.
- **Auth email templates.** Firebase console → Authentication → Templates.
  - Set the sender name to QueryHawk.
  - Set the from address to `noreply@queryhawk.net`, which needs Firebase's DNS records for the
    custom domain.
  - Set the action URL. The default `gen-lang-client-0801391782.firebaseapp.com/__/auth/action`
    works as is.
  - These govern the password reset and the verification email.
- **Sign-in providers.** Firebase console → Authentication → Sign-in method. Email/Password and
  Google must both be enabled, because the build offers both.
- **Authorised domains.** `queryhawk.net`, `www.queryhawk.net` and `scriptally-app.web.app` are
  there. Four AI Studio `ais-…-340588666666.europe-west2.run.app` entries are left over; remove
  them.
- **App Check.**
  1. Create a reCAPTCHA Enterprise key for `queryhawk.net` and `www.queryhawk.net`.
  2. Register the web app in App Check.
  3. Put the site key in `.env.production`'s `VITE_APP_CHECK_SITE_KEY`, rebuild and redeploy
     hosting.

  Until then App Check is inert on live: requests carry no token, nothing is rejected, and the
  waitlist logs them as unverified.
- **API key (hardening, not blocking).** The live web key has no HTTP-referrer restriction. It
  answered a request claiming `example.com`. Restrict it to `queryhawk.net`, `www.queryhawk.net`,
  `scriptally-app.web.app` and `gen-lang-client-0801391782.firebaseapp.com`.
