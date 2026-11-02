# Go live on queryhawk.net: the runbook (landing-only)

queryhawk.net goes live as **the public site and the founding waitlist, and nothing else**. Visitors
can read every public page and join the waitlist. They cannot sign in, create an account or reach
the app. You keep using the app on dev, at dev.queryhawk.net.

Run these yourself, one step at a time. After each step, tell Claude Code which step you ran, and
it will run the matching check and report.

**Where to run them.** Use the worktree at `/Users/nickphysick/ScriptAlly-live`, on branch
`release/live-1` (`landing-live` was fast-forwarded into it on 18 Oct). The preflight's check `4b`
refuses any other branch.

> **The Instagram launch (31 Oct) is section 11.** It fast-forwards `release/live-1` to main
> first; sections 0–10 are the history of release 1.

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

## 11 · The Instagram launch release (31 Oct) — from `main`

What this release adds to live, on top of release 1:

- **the new landing page** (dev's design, plus whatever the landing session finishes);
- **the current founding offer** in the confirmation and welcome emails, the /welcome page and
  pricing: fifty places, Pro free for a whole querying campaign, Smart Import, a direct line to
  the founder, an Early Bird discount;
- **sign-ups record the link that brought them** (`?utm_source=instagram`), stored on the
  waitlist entry;
- **Google Analytics** (G-5XTF9DC7NF) behind a consent bar, plus a privacy page that says so;
- **the sharing preview** (title, description, image);
- **functions on Node.js 22**. Node 20 was switched off on 30 Oct, so a functions deploy from the
  old `release/live-1` would be refused.

There are **no rules or index changes for live in this release.** The waitlist's rules are
unchanged; main's other rule changes are for the app, which stays closed.

### 11.0 · Bring the release branch up to main

Main already contains everything on `release/live-1` (it was merged in on 31 Oct), so this is a
fast-forward: nothing on live's branch is lost, and the preflight's `4b` still sees `release/live-1`.

```bash
cd /Users/nickphysick/ScriptAlly-live
git fetch origin
git checkout release/live-1
git merge --ff-only origin/main
npm ci && (cd functions && npm ci)
```

**Good:** the merge says `Fast-forward`. If it refuses, stop and tell Claude Code: something was
committed to `release/live-1` that isn't on main.

Do this **after** the landing page from the other session is merged to main, so hosting carries
the finished design.

### 11.1 · Check the counter, then set its cap to 50

The cap the server enforces is the `cap` field on the counter document, not the code.

```bash
curl -s https://queryhawk.net/api/waitlist
```

- If the count is already **more than 50**, stop and decide what to do before going further.
- Otherwise: Firebase console → Firestore Database → database `ai-studio-ae82196c-…` →
  `counters` → `waitlist` → field **`cap`** → set it to the **number** `50` (not the string).
  - If there is no `counters/waitlist` document yet, skip this: the first sign-up creates it with
    50 from the code.

**Verify:** `curl -s https://queryhawk.net/api/waitlist` shows `"cap":50`.

### 11.2 · Functions

```bash
npm run build && node scripts/live-preflight.mjs
firebase deploy --only functions:waitlist --project prod
```

**Good:** `PREFLIGHT PASSED.` before the deploy, then the deploy finishes without errors.

- The deploy is on Node 22 now. If it asks to upgrade anything, say yes.
- **If section 10 was never run:** this deploy is 10.2. Do the 10.3 backfill straight after.

**Verify:** `node scripts/live-verify.mjs all`: every line `PASS`.

### 11.3 · Hosting

```bash
npm run build && node scripts/live-preflight.mjs
firebase deploy --only hosting --project prod
node scripts/live-verify.mjs hosting
```

**Good:** `PREFLIGHT PASSED.`, then every verify line `PASS`, which includes "no Log in" and
"`/dashboard` serves the landing".

Then on your phone (390–430 px) and laptop:

- the landing matches the agreed design at 390, 430, 1280 and 1440 px;
- the consent bar appears once; "No thanks" makes it go away and it stays away on reload;
- the footer has **Privacy**, **Terms** and **Cookie choices**; the privacy page's cookie section
  mentions Google Analytics.

### 11.4 · One real test, with the Instagram tag

1. Open **https://queryhawk.net/?utm_source=runbooktest** in a private window and press
   **Accept** on the cookie bar.
2. Join with `nick+launch@queryhawk.net`.
3. The confirmation email arrives **from `Nick at QueryHawk <nick@queryhawk.net>`** and says
   **fifty** founding places, with no mention of six months or half price.
4. Click its link: **queryhawk.net/welcome** shows "Welcome, Founding Writer." and the card reads
   **of 50**. The welcome email's perks are the current four.
5. Click the link again: "You're already in."
6. Firebase console → Firestore → `waitlist` → your test document has
   **`attribution: { source: "runbooktest" }`** and `status: "verified"`.
7. Google Analytics → Reports → Realtime shows your visit, with `runbooktest` as the session
   source, and a **sign_up** event.
8. Remove the test entry and give the place back exactly as in section 7, then check
   `curl -s https://queryhawk.net/api/waitlist` shows the count from before.

### 11.5 · Google Analytics, once

- Admin → Data collection and modification → Data collection: **Google signals off**.
- Admin → Data retention: **2 months**.
- Admin → Events: after the 11.4 test, mark **`sign_up`** as a **key event**.
- Admin → Data streams → the web stream: press **Test installation** now that the tag is live.

### 11.6 · The sharing preview

Paste `https://queryhawk.net/` into https://developers.facebook.com/tools/debug/ and press
**Scrape again**. It should show "QueryHawk: No more winging it", the description and the image.
Instagram link previews read the same tags. To change the image later, replace
`public/og-image.jpg` (1200 × 630) and redeploy hosting.

### 11.7 · Console hardening (do once, today)

- **Budget alert.** Google Cloud console → Billing → Budgets & alerts → Create budget for
  `gen-lang-client-0801391782`, about £20 a month, with email alerts at 50%, 90% and 100%.
- **API key restriction.** The section 9 bullet: limit the browser key to `queryhawk.net`,
  `www.queryhawk.net`, `scriptally-app.web.app` and `gen-lang-client-0801391782.firebaseapp.com`.
  Then reload queryhawk.net and join the waitlist once more (and remove it) to confirm nothing broke.
- **Anthropic key.** If it hasn't been replaced since it was pasted into a chat, revoke it in the
  Anthropic console, create a new one, and set it on both projects:
  `firebase functions:secrets:set ANTHROPIC_API_KEY --project prod`, and the same with
  `--project dev`. Redeploy the functions that use it when the app opens; nothing on live calls
  them now.
- **Two-step verification** on the Google account that owns Firebase, Analytics and the domain,
  and on Resend.
- **Sign-up is still off:** `node scripts/live-verify.mjs signup` → `PASS`.

### 11.8 · The Instagram link

Use this as the link in bio:

```
https://queryhawk.net/?utm_source=instagram&utm_medium=social
```

Sign-ups from it are stored with `attribution.source = "instagram"`. To count them: Firestore →
`waitlist` → filter `attribution.source == instagram`. GA shows the same for visitors who
accepted.

### 11.9 · Rollback

As section 8. To return hosting and the function to release 1 exactly, redeploy from
`git checkout cb6969e2` (the old `release/live-1` tip). Its function would need Node 22 in
`functions/package.json` first: Firebase refuses Node 20 deploys.

---

## 12 · Analytics: count only real visitors (2 Nov)

Cloudflare Web Analytics used to be written into the built page, so it counted visits from
wherever a production build ran: `127.0.0.1` test runs, local previews, and you. Now the page
adds it only on **queryhawk.net** and **www.queryhawk.net**, and never in a browser that has
opted out. Same token as before. Nothing else changes: no rules, no functions, no page content.

> §11's Google Analytics steps (the consent bar, 11.4 step 7, 11.5) are out of date: GA came off
> the public site on 31 Oct. Skip them.

### 12.1 · Hosting, from `release/live-1`

```bash
cd /Users/nickphysick/ScriptAlly-live
git fetch origin
git checkout release/live-1
git merge --ff-only origin/main
npm run build && node scripts/live-preflight.mjs
firebase deploy --only hosting --project prod
node scripts/live-verify.mjs hosting
```

**Good:** `Fast-forward`, `PREFLIGHT PASSED.`, every verify line `PASS`.

### 12.2 · Check it

- **https://queryhawk.net/** in a private window, DevTools → Network: there is a request to
  `static.cloudflareinsights.com/beacon.min.js`.
- **https://dev.queryhawk.net/**, same view: **no** request to `cloudflareinsights.com`.

### 12.3 · Opt yourself out

Open this once in **every browser you use**, including your phone's main browser:

```
https://queryhawk.net/?notrack
```

The address bar drops the `?notrack` and that browser is never counted again. To undo it, open
`https://queryhawk.net/?track`.

**Instagram's in-app browser keeps its own storage**, so do it there too: tap your bio link,
then add `?notrack` to the address in that browser (or open the link
`https://queryhawk.net/?notrack` from a DM to yourself).

Clearing a browser's site data clears the opt-out too; open `?notrack` again.

### 12.4 · Past data

The `127.0.0.1` entries already in Cloudflare stay there. In the Web Analytics dashboard, keep
the filter **Host = queryhawk.net** (add **www.queryhawk.net** if it ever shows up).

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
