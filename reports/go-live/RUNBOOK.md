# Go live on queryhawk.net: the runbook (landing-only)

queryhawk.net goes live as **the public site and the founding waitlist, and nothing else**. Visitors
can read every public page and join the waitlist. They cannot sign in, create an account or reach
the app. You keep using the app on dev, at dev.queryhawk.net.

Run these yourself, one step at a time. After each step, tell Claude Code which step you ran, and
it will run the matching check and report.

**Where to run them.** Use the worktree at `/Users/nickphysick/ScriptAlly-live`, on branch
`release/live-1` (`landing-live` was fast-forwarded into it on 18 Oct). The preflight's check `4b`
refuses any other branch.

**Every command names `--project prod`.** A bare `firebase deploy` would resolve `.firebaserc`'s
default, which is also prod. Naming it keeps every line readable for what it does.

> ⚠️ **Do not use `npm run deploy:prod`.** It deploys hosting *before* the function, which puts a
> page in front of a back end that isn't there. It also deploys only `smartImportMap`.

```bash
cd /Users/nickphysick/ScriptAlly-live
```

---

## 0 · Before anything

1. **Check the landing-only switch is on.** `.env.production` must contain:

   ```
   VITE_LANDING_ONLY=true
   ```

   It's there on this branch. The preflight checks it too, as line `0`.

2. **Create `functions/.env.gen-lang-client-0801391782`** with exactly these lines. The database id
   comes from `.env.production`; the rest come from the domain move. Nothing in it is secret, so it
   can be committed afterwards if you like.

   ```
   FIRESTORE_DATABASE_ID=ai-studio-ae82196c-c59e-40b9-b209-9fb02f67ade6
   WAITLIST_FROM="Nick at QueryHawk <nick@queryhawk.net>"
   WAITLIST_REPLY_TO=nick@queryhawk.net
   WAITLIST_CONTACT_EMAIL=hello@queryhawk.net
   WAITLIST_PUBLIC_URL=https://queryhawk.net
   ```

   - If you'd rather keep the reply-to untracked, leave `WAITLIST_REPLY_TO` out of this file and put
     it in `functions/.env` instead.
   - Don't add `RETENTION_LIVE`. Without it, the nightly retention job only logs what it would
     delete.

3. **Build, then run the preflight:**

   ```bash
   npm run build
   ```

   ```bash
   node scripts/live-preflight.mjs
   ```

   **Good:** every check is `PASS` except the two `2 · secret …` lines. Those turn green after
   step 1.

---

## 1 · Secrets (the waitlist's two, nothing else)

The waitlist function needs exactly two secrets, and live has neither.

First the Resend key. Paste the key when prompted. A separate prod key from the Resend dashboard,
limited to sending, is better than reusing dev's.

```bash
firebase functions:secrets:set RESEND_API_KEY --project prod
```

Then the IP-hash salt. It's random, never needs to be known, and nobody types it:

```bash
openssl rand -hex 32 | firebase functions:secrets:set WAITLIST_IP_SALT --project prod --data-file -
```

**Verify:**

```bash
node scripts/live-preflight.mjs
```

**Good:** `PREFLIGHT PASSED.`

---

## 2 · Functions (the waitlist only)

```bash
firebase deploy --only functions:waitlist --project prod
```

**Optional second line,** safe to run now:

```bash
firebase deploy --only functions:waitlistRetention --project prod
```

- `waitlistRetention` is a nightly job (03:17 London) that tidies the waitlist.
- Without `RETENTION_LIVE=true` it deletes nothing: it only logs what it *would* delete, so you can
  read a few runs before trusting it.
- The first deploy may ask to enable Cloud Scheduler; say yes.

Everything else waits for the app to open (see the last section).

**Verify:**

```bash
node scripts/live-verify.mjs functions
```

**Good:** `PASS  functions · waitlist deployed`. The `INFO` line lists the rest and whether they're
deployed. They aren't needed now.

---

## 3 · Firestore indexes

**Nothing to run.** Live and dev both have zero composite indexes, and the waitlist needs none.

> ⚠️ **Know this about live's database.** It is the **ENTERPRISE** edition; dev is STANDARD. It
> matters once the app opens, not for the waitlist.

---

## 4 · Rules

Landing-only reads no Firestore from the browser: the waitlist writes through the function, which
bypasses rules. So this step isn't needed for the waitlist. Run it anyway now, because it tightens
access and it's the state the app will open into. Storage is provisioned on live (the bucket
answers 403), so both rule sets go out together. Keep `--debug`, because the release time it prints
is the only proof the rules landed.

```bash
firebase deploy --only firestore:rules,storage --project prod --debug 2>&1 | tee /tmp/live-rules.log
```

```bash
grep -iE "updateTime|releases/" /tmp/live-rules.log | tail -4
```

**Good:** the releases for `cloud.firestore/ai-studio-ae82196c-…` and `firebase.storage/…` show
today's `updateTime`.

Wait about a minute (rules take seconds to propagate), then:

```bash
node scripts/live-verify.mjs rules
```

**Good:** `users/…` is **denied** (403), and the `test/connection` control is **allowed** (200 or 404).

---

## 5 · Close sign-up on live (new, and it's the real lock) — ✅ DONE 18 Oct

**Done on 18 Oct by Nick:** the switch was unticked and saved. `verify signup` then read
`ADMIN_ONLY_OPERATION`, so live refuses new accounts.

1. Open the Firebase console, project `gen-lang-client-0801391782`.
2. Go to Authentication → **Settings** → **User actions**.
3. **Untick "Enable create (sign-up)"**.
4. Press **Save**.

**This switch, not the hidden sign-in screen, is what actually stops new accounts.** The landing-only
build shows no way to sign up, but anyone who knows how can still call Firebase Auth's sign-up API
directly with the public web key. With this switch off, Firebase refuses them.

- Existing accounts are unaffected.
- On 18 Oct this switch was **on**.
- **To reopen later:** the same place, tick "Enable create (sign-up)", Save.

**Verify:**

```bash
node scripts/live-verify.mjs signup
```

**Good:** `PASS  signup · live refuses new accounts — ADMIN_ONLY_OPERATION`.

- The probe is an anonymous sign-up request. While anonymous sign-in is disabled on live (it is), it
  cannot create an account.
- If it says `OPERATION_NOT_ALLOWED: the sign-up switch is ON`, the switch is still ticked.

---

## 6 · Hosting

Rebuild and re-check in one go, so nothing can move between the two:

```bash
npm run build && node scripts/live-preflight.mjs
```

**Good:** `PREFLIGHT PASSED.`

- `0` confirms landing-only.
- `3d` proves `dist/` is this tree's production build.
- `3e` proves the build carries no way into the app.

```bash
firebase deploy --only hosting --project prod
```

**Verify:**

```bash
node scripts/live-verify.mjs hosting
```

**Good:** every line `PASS`:

- the title is right, the page is `no-cache` and an asset is `immutable`;
- www gives a 301 to the apex, and `scriptally-app.web.app` serves the same title;
- `/pricing`, **`/dashboard` and `/#/login` all serve the landing's page**;
- **the served bundle contains no "Log in", "Open dashboard", "Open QueryHawk", "Create account"
  or "Sign up with Google"**.

**Then:**

```bash
node scripts/live-verify.mjs all
```

**Good:** every line `PASS`. That includes `waitlist · GET answers JSON, not the SPA` and CORS
allowing `https://queryhawk.net` while refusing `https://scriptally.ink`.

---

## 7 · One real test

1. On https://queryhawk.net/founders, join with `nick+golive@queryhawk.net`. The page should say
   "You're on the list."
2. The confirmation email arrives at nick@ **from `Nick at QueryHawk <nick@queryhawk.net>`**.
3. **Click its link.** It lands on queryhawk.net/founders showing **"You're in."** The address bar
   drops the `?verified=…` straight away. A welcome email follows. *(Once section 10 is done the
   link lands on queryhawk.net/welcome instead; see 10.4.)*
4. **Click the same link again.** It shows **"You're already in."**
5. Tell Claude Code to check the counter:
   `curl -s https://queryhawk.net/api/waitlist` should now read `"count":1`, or one more than before
   your test.

**Then remove the test entry and give the place back:**

1. Firebase console → Firestore Database → database `ai-studio-ae82196c-…` → `waitlist` → document
   `b52dcf191e498df34c1b3bfcc4812ab173bcd5fe7cfb23062fbb57bc39a7ffa2` (the SHA-256 of the address)
   → **Delete document**.
2. Fix the counter. Deleting the entry doesn't decrement it.
   - **If no real writer has confirmed since you started:** delete `counters/waitlist` too. It is
     recreated at zero on the next sign-up, and prod's counter must start at zero.
   - **If someone has:** open `counters/waitlist` and reduce `verifiedCount` by exactly 1 instead.
3. **Confirm it went back:** `curl -s https://queryhawk.net/api/waitlist` shows the count from
   before your test.

---

## 8 · Rollback

| What | How |
|---|---|
| Hosting | Firebase console → Hosting → `scriptally-app` → Release history → the previous release's ⋯ → **Rollback**. |
| Functions | `firebase functions:delete waitlist waitlistRetention --region europe-west2 --project prod` removes them (live had no previous version of either). |
| Rules | Firebase console → Firestore Database → Rules → history → the previous version → **Restore**. Storage → Rules works the same way. |
| Sign-up | Re-tick "Enable create (sign-up)" (step 5). |

---

## 9 · By hand, in the consoles

None of these could be read without credentials, so check each one:

- **Auth email templates.** Firebase console → Authentication → Templates. Set the sender name to
  QueryHawk. These matter once accounts open, not for the waitlist; the waitlist sends its own
  email through Resend.
- **Authorised domains.** `queryhawk.net`, `www.queryhawk.net` and `scriptally-app.web.app` are
  there. Four AI Studio `ais-…-340588666666.europe-west2.run.app` entries are left over; remove
  them.
- **OAuth consent screen app name.** Google Cloud console → `gen-lang-client-0801391782` → APIs &
  Services → OAuth consent screen (Branding). If it still says ScriptAlly or AI Studio, change it to
  QueryHawk before Google sign-in opens.
- **App Check.**
  1. Create a reCAPTCHA Enterprise key for `queryhawk.net` and `www.queryhawk.net`.
  2. Register the web app in App Check.
  3. Put the site key in `.env.production`'s `VITE_APP_CHECK_SITE_KEY`, rebuild and redeploy
     hosting.

  Until then App Check is inert: the waitlist logs requests as unverified and rejects none.
- **API key (hardening, not blocking).** Google Cloud console → APIs & Services → Credentials → the
  browser key → HTTP referrers. Allow `queryhawk.net`, `www.queryhawk.net`, `scriptally-app.web.app`
  and `gen-lang-client-0801391782.firebaseapp.com`.

---

## 10 · Founding welcome (the /welcome page) — branch `founding-welcome`

The confirmation link stops landing on /founders and lands on its own page, `/welcome`, showing
the writer's founding card with their number. The welcome email's first line becomes "You're
Founding Writer No. 23." Three pieces go live, **in this order**, each with its own go:

| # | What | Why this position |
|---|---|---|
| 10.1 | Hosting | Safe on its own. The old function still sends links to `/founders?verified=…`, and the new page sends those on to `/welcome?v=…`, which shows the right state without a number. |
| 10.2 | Functions (`waitlist`) | Now new links carry a reference, and the page shows the number. The old function never sends a reference, so the page never asks it for one. |
| 10.3 | Backfill | Gives anyone who confirmed before 10.2 a stored number. Run after 10.2, so no old-function confirmation can land behind it. |

Run from the `founding-welcome` worktree once it's merged into `release/live-1` (preflight `4b`
refuses any other branch), with `cd /Users/nickphysick/ScriptAlly-live`.

**10.1 · Hosting**

```bash
npm run build && node scripts/live-preflight.mjs
firebase deploy --only hosting --project prod
```

**Verify:** `node scripts/live-verify.mjs hosting` (every line `PASS`), then
`curl -s -o /dev/null -w "%{http_code}\n" https://queryhawk.net/welcome` gives `200`.

**10.2 · Functions**

```bash
firebase deploy --only functions:waitlist --project prod
```

**Verify:**

- `curl -sI "https://queryhawk.net/api/waitlist/verify?token=nothing"` shows
  `location: /welcome?v=unknown` (it was `/founders?verified=unknown`).
- `curl -s "https://queryhawk.net/api/waitlist/welcome?r=nothing"` gives `{"ok":false}`, as JSON.
- `node scripts/live-verify.mjs all`: every line `PASS`.

**10.3 · Backfill.** Dry run first. It prints what it would assign, by document id, never an
address, and writes nothing:

```bash
node scripts/backfill-founding-numbers.mjs --project gen-lang-client-0801391782 --database ai-studio-ae82196c-c59e-40b9-b209-9fb02f67ade6
```

It needs Application Default Credentials (`gcloud auth application-default login`). If the dry run
lists nobody, stop there. If it lists writers, check the numbers follow the order they confirmed,
then run the same line with `--apply`. **A second run must say there is nothing to do.**

**10.4 · One real test** (the section 7 test, with the new landing)

1. Join at https://queryhawk.net/founders with `nick+welcome@queryhawk.net`.
2. Click the confirmation link. It lands on **queryhawk.net/welcome**:
   - "Welcome, Founding Writer." and a card with your number, padded (`001`);
   - the address bar shows just `/welcome`.
3. The welcome email's first line reads "You're Founding Writer No. 1." (or your number).
4. Answer the three quick taps and press **Send to Nick**: "Thank you, that's really useful."
5. Click the confirmation link again: "You're already in." and the same number.
6. Remove the test entry and give the place back exactly as in section 7. Deleting the document
   also deletes your answers.

**Rollback:** hosting from Release history (section 8). The function by redeploying `waitlist`
from `release/live-1` as it was before the merge. The backfill's numbers can stay: the old
function never reads them.

---

## After the app opens (not now)

When you decide to open the app on queryhawk.net:

1. **Reopen the front door.**
   - Remove `VITE_LANDING_ONLY=true` from `.env.production`.
   - Rebuild, run the preflight (expect line `0` to say landing-only is off, and `3e` to find the
     sign-in screen, which is now correct), and redeploy hosting.
   - Re-tick "Enable create (sign-up)" (step 5).
2. **Secrets.** `ANTHROPIC_API_KEY` already exists on live, but rotate it first: it was pasted into
   a chat once (CLAUDE.md "Loose ends"). After rotating:

   ```bash
   firebase functions:secrets:set ANTHROPIC_API_KEY --project prod
   ```
3. **Functions the app uses:**

   ```bash
   firebase deploy --only functions:sendBetaFeedback,functions:sendWeeklyPulse --project prod
   ```

   then, after the key is rotated:

   ```bash
   firebase deploy --only functions:smartImportMap,functions:extractFromEmail,functions:assistAgentData --project prod
   ```

   - `sendContactMessage`: only once the contact form's transport is switched from mailto.
   - `redeemInviteCode`: only on the day the invite gate is turned on.
   - `suggestComps`: nothing calls it.
4. **Check one July account.** Live holds 25 accounts from the July build. Sign in to yours and make
   sure the dashboard loads, a query opens and an edit saves. The new rules validate whole
   documents, so a July-shaped document can have its writes refused silently.
