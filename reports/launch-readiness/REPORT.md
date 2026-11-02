# Launch readiness — report (2 Nov 2026)

**Dev:** https://dev.queryhawk.net serves `index-CW89qBez.js` from `dev/…-wel1-priv1` @ b6e4e651, which is main @ 6353ad82 merged into the chain dev was already serving. `functions:waitlist` and `functions:waitlistRetention` are deployed to dev. **Prod is untouched.**

## Already true, so skipped
- **No /terms or /contact links on /privacy or /welcome.** Every link on both pages, at 390 and 1440, was clicked through:
  - /privacy has its contents anchors, `mailto:hello@queryhawk.net` and ico.org.uk;
  - /welcome has Privacy only.
  - So no links needed changing or removing.
- **The favicon and apple-touch-icon exist and are the hawk:** `public/favicon.png`, `favicon.ico` and `apple-touch-icon.png`.
- **The site sends no Content-Security-Policy**, so nothing needed allowing for Cloudflare.
- **SPF, DKIM and DMARC are all already published** (see Phase 6).

## Your decisions during the run
1. **A promoted writer takes the freed number**, as you ruled on 18 Oct and confirmed today: if No. 14 leaves, the next writer in line becomes No. 14. Numbers stay 1–50, so "of 50" is always true and there are never gaps. The brief's "never reused" was not built.
2. **A sign-up after the cap fills now confirms by email first** (found by the inbox test). Before, such a writer was written straight onto the waiting list with no confirmation, no reserve number and no email, so promotion could never reach them. Now they get the usual confirm email. Clicking it puts them in the queue with a reserve number and sends email 3.
   - `FOUNDING_FULL` changes with it: "All fifty founding places have gone, but we've emailed you a link: click it to join the waiting list, and we'll email you if a place opens up."
   - The brief's own wording ("…so you're on the waiting list. We'll email you if a place opens up.") would have told them they were on the list before they had confirmed.
3. **Phones show "Oct" / "Nov"** in the Birds-eye window. This was the previous job's choice, unchanged here.

## Baseline vs final
| Gate | Baseline (8239a3a5) | Final (6353ad82) |
|---|---|---|
| tsc (app / functions) | 0 / 0 | 0 / 0 |
| Vitest | 10,030 passed | 10,050 passed |
| Functions emulator (`npm run test:functions`) | 49 | 55 |
| Rules (`npm run test:rules`) | 210 | 210 |
| Public e2e on the production build | 102 passed, 33 skipped | 107 passed, 24 skipped |
| RED-1 on the hosting emulator (opt-in) | — | passed; red without the redirect |
| Production build warnings | none | none |

SPLIT-4 is still skipped, as instructed. The skip count fell because C1, C3 and SPLIT-3 now cover three pages instead of eight.

## Commits (main)
| Commit | What |
|---|---|
| 11a65446 | Phase 1: "Much easier on the eye than a spreadsheet" |
| 1a597211 | Phase 2: the share preview and page meta |
| e520d63e | Phase 3: the live site is three pages |
| d07c5a4f | Phase 4: a freed place goes to the next writer in line |
| 6fd90a62 | Phase 5: Cloudflare Web Analytics on the live site |
| a2f40415 | Phase 6: one-click unsubscribe headers, structured failure logs |
| f3397456 | Pack: og-share.png (SHA256 matches) |
| 6353ad82 | Phase 4 follow-up: a sign-up past the cap confirms by email |

## Phase by phase

**1 · Copy.** The tick reads "Much easier on the eye than a spreadsheet" with no bold, on both layouts. Copy locks updated.

**2 · Share preview.**
- The title, description, og:* and twitter:* tags are in `index.html` itself, so crawlers see them.
- The old JPEG tags and "Query With Confidence" are gone; `og-image.jpg` stays on disk.
- /welcome still sets its own title.
- The go-live scripts' `LIVE_TITLE` and test P2 follow the new title.
- META-1 reads the served HTML as text, and checks the image is 1200×630 by its PNG header. It failed until the image was committed, and fails if one tag's value changes.

**3 · Redirects.**
- **On prod, every path except /, /welcome and /privacy is a hosting-level 301 to /.**
- Firebase applies redirects before static files, and its regex dialect can't say "except", so `scripts/landingRedirect.mjs` generates the regex: a first path segment with no dot, other than welcome, privacy, api, assets, images and status-dots.
- The in-app guard narrows to the same three pages as a backstop. Dev keeps the whole app.
- RED-1, unit half: checks the regex path by path. Browser half: served by the hosting emulator, /pricing, /about, /contact, /founders, /terms, /dashboard and an unknown path answer 301 to /, while `/welcome?v=verified` and `/privacy` are served. It fails against the same config without the redirect.
  - ⚠️ The hosting emulator, started with `--config <copy>` from the repo, still applied the repo's `firebase.json`. The recipe in the test file runs it from its own folder.
- **`/founders?verified=…` now lands on /** rather than forwarding to /welcome. Verify links have pointed straight at /welcome since 19 Oct, so only an old bookmark is affected.
- `live-verify.mjs` now expects the 301s.

**4 · Promotion.**
- One shared release step (`writeReleaseInTx`) serves both the unsubscribe and the retention job:
  - **someone confirmed is waiting:** they become a founding writer with the freed number, the rest of the queue moves up, and the count is unchanged;
  - **nobody is waiting:** the number goes on the freed list and places left rises by one.
- Email 2 is sent after the commit, so a re-run, a second click or a mail scanner promotes nobody and sends nothing.
- **Found and fixed:** the retention job never put a dormant writer's number back on the freed list. It's still a dry run on both projects.
- Copy:
  - email 3's note;
  - /welcome's waiting lede, step 2 and note (`PLACES_OFFERED_ON = true`);
  - `FOUNDING_FULL` (see decision 2).
- EM-4 and WEL-6 now check for the promotion promise, and the old "no promise" assertions are gone.
- PROMO-1 (emulator):
  - No. 14 leaves: waiting #1 becomes No. 14 with exactly one email 2, and the reserves become 1 and 2;
  - two releases at once promote two different writers;
  - with nobody waiting, places left goes from 0 to 1;
  - an unconfirmed waiting writer is passed over;
  - the retention job promotes too;
  - a past-cap sign-up confirms, joins the queue and can be promoted.
  - All failed on the code before this phase, except "nobody waiting", which was already the behaviour.
- **No Firestore rules change** (the functions write with the Admin SDK).

**5 · Cloudflare.**
- `VITE_CF_BEACON_TOKEN` is in `.env.production` only.
- A build plugin writes Cloudflare's snippet into the live `index.html` exactly once. With no token it writes nothing, and it refuses anything that isn't 32 hex characters.
- CF-1: one beacon in the live page, none in the dev build, never two; no cookie and no banner on the page.
- Measured: Cloudflare's collector rejects a 127.0.0.1 origin, so local and e2e runs don't count as visits.

**6 · Email health.**
- **DNS, read from Namecheap's records:**
  - SPF at the apex: `v=spf1 include:spf.privateemail.com ~all` (your mailbox), present.
  - Resend's return path: `send.queryhawk.net` → `send.forge.rmta.net` (SPF and MX), present.
  - DKIM: `resend._domainkey.queryhawk.net` (RSA public key), present.
  - DMARC: `v=DMARC1; p=none; rua=mailto:postmaster@queryhawk.net`, present.
  - **Nothing is missing or wrong.**
- **Headers:** every waitlist email now carries `List-Unsubscribe: <its own unsubscribe link>` and `List-Unsubscribe-Post: List-Unsubscribe=One-Click`. The unsubscribe endpoint accepts the one-click POST as well as GET. EM-9 checks the headers and fails without them.
- **Logs:** a failed waitlist request now logs a structured `waitlist.error` line (route, method, error; no address). Failed sends already logged `email.send` / `email.refused` at error level. EM-10 holds both.

**7 · Final check.**
- Screenshots in this folder:
  - the landing at 390, 411, 430 and 1440 (first screen and full page);
  - /welcome in all five states at 390 and 1440;
  - /privacy at 390 and 1440.
- Lighthouse on the local production build (no CDN, no compression):

| | Performance | Accessibility | Best practices | SEO |
|---|---|---|---|---|
| 390 (mobile, throttled) | 57 | 95 | 96 | 92 |
| 1440 (desktop) | 94 | 96 | 96 | 92 |

- **Accessibility failures. None are on surfaces this job changed, so they're reported, not fixed:**
  - Contrast at 390: the Birds-eye window's agency line (`.mk-bef-who small`), and several pieces of the feature card mock-ups (`.mk-lc-*`).
  - Contrast at 1440: the hero's privacy note and its Privacy link (`.mk-dh .mk-betanote`), and the same Birds-eye agency line.
  - Heading order at 390: the Birds-eye heading is an `h3` straight after the hero's `h1`.
- **Best practices:** the only console errors are local ones (Cloudflare refusing 127.0.0.1, no API behind the local preview).
- **SEO: there's no robots.txt**, so the SPA serves its HTML in its place, on prod too. A two-line `public/robots.txt` would fix it. Not done here: it wasn't in the brief.
- **Mobile performance 57** is the local preview (uncompressed, throttled to a slow phone: FCP 5.0s, LCP 6.4s). Desktop is 94. Re-run Lighthouse on queryhawk.net after the deploy for the real number.

**The dev inbox test, with your aliases.** "+" aliases are kept distinct (addresses are only trimmed and lower-cased).
- +qh-confirm, +qh-welcome and +qh-dupe each got one confirm email. The second +qh-dupe sign-up was answered "already" and sent nothing.
- +qh-welcome confirmed → No. 3 and email 2.
- Cap lowered to 3 → +qh-waiting signed up (this is where decision 2 was found, fixed and redeployed), confirmed → reserve 1 and email 3.
- First promotion attempt: the unsubscribe was clicked in +qh-waiting's email by mistake. Re-run.
- Second attempt: unsubscribing +qh-welcome promoted +qh-waiting to **No. 3** in the same transaction (count stayed 3, queue back to 0), and **exactly one** "You're in: founding writer No. 3" arrived.
- **Gmail's own one-click Unsubscribe button was not tried live** (the footer link was). The header is checked by EM-9 only.
- **Cleaned up:** the four +qh-* records and today's two rate-limit records are deleted. The counter is restored exactly: cap 50, verifiedCount 2, updatedAt 2026-10-16T16:55:38.347Z.
- On dev, `waitlistRetention` was deployed for the first time (a daily dry run, `RETENTION_LIVE=false`).

---

# GO-LIVE LIST (supersedes RUNBOOK §11 where they differ)

## 1 · Bring ScriptAlly-live up to main
Your local `release/live-1` is at 9b7510b9: 265 commits ahead of `origin/release/live-1` (never pushed) and 49 behind main. Both are on main's line, so this is a fast-forward.
```bash
cd /Users/nickphysick/ScriptAlly-live
git fetch origin
git checkout release/live-1
git merge --ff-only origin/main
git push origin release/live-1
npm ci && (cd functions && npm ci)
```
**Good:** "Fast-forward". If it refuses, stop and tell Claude Code. `functions/.env.gen-lang-client-0801391782` stays untracked; it holds the prod values and the preflight reads it.

## 2 · Console steps on prod (`gen-lang-client-0801391782`)
1. **Cap = 50.**
   - Run `curl -s https://queryhawk.net/api/waitlist`. If the count is over 50, stop.
   - Firestore → database `ai-studio-ae82196c-…` → `counters/waitlist` → `cap` = number `50`.
   - Check: the curl shows `"cap":50`.
2. **Secrets present.** `firebase functions:secrets:get WAITLIST_IP_SALT --project prod` and `firebase functions:secrets:get RESEND_API_KEY --project prod` each list an enabled version. The preflight checks this too (line 2).
3. **Budget alert (£10).** Google Cloud console → Billing → Budgets & alerts → Create budget:
   - scope: project `gen-lang-client-0801391782`;
   - amount: £10 a month;
   - thresholds: 50%, 90%, 100%;
   - email: billing admins.
4. **Log alert on failed sends and waitlist errors.**
   - Cloud console → Logging → Logs Explorer, project `gen-lang-client-0801391782`. Paste:
     ```
     resource.type="cloud_run_revision"
     (resource.labels.service_name="waitlist" OR resource.labels.service_name="waitlistretention")
     severity>=ERROR
     (jsonPayload.event="waitlist.error" OR jsonPayload.event="email.send" OR jsonPayload.event="email.refused")
     ```
   - Run query (empty is fine), then **Actions → Create log alert**:
     - name: "Waitlist errors";
     - time between notifications: 5 minutes;
     - notification channel: your email (create it there if needed).
   - Save.
5. **API key restriction.** APIs & Services → Credentials → the browser key → Application restrictions: websites.
   - Add `queryhawk.net/*`, `www.queryhawk.net/*`, `scriptally-app.web.app/*` and `gen-lang-client-0801391782.firebaseapp.com/*`.
   - After the deploy, join once from the site to check nothing broke, and give it back as in step 5.
6. **Two-step verification** on the Google account that owns Firebase and the domain, and on Resend and Cloudflare.

## 3 · DNS records to add
**None.** SPF, DKIM, DMARC and Resend's return path are all in place (Phase 6).
- Optional, in two to four weeks, once DMARC reports to `postmaster@queryhawk.net` look clean: change `_dmarc` to `v=DMARC1; p=quarantine; rua=mailto:postmaster@queryhawk.net`.
- Make sure `postmaster@queryhawk.net` reaches you (an alias in Private Email).

## 4 · Deploy, from the ScriptAlly-live worktree
```bash
cd /Users/nickphysick/ScriptAlly-live
npm run build:prod && node scripts/live-preflight.mjs
firebase deploy --only hosting --project prod
firebase deploy --only functions:waitlist,functions:waitlistRetention --project prod
node scripts/live-verify.mjs all
```
- **Good:** `PREFLIGHT PASSED.`, both deploys finish, and every verify line passes. That includes the new lines "/pricing … is a 301 to /" and "/welcome?v=verified … is served".
- If the functions deploy asks to enable Cloud Scheduler for `waitlistRetention`, say yes. It runs daily as a dry run; nothing is deleted until `RETENTION_LIVE=true` is set.
- There are no Firestore rules or index changes.

## 5 · On your phone, from the Instagram bio link
1. Open `https://queryhawk.net/?utm_source=instagram&utm_medium=social`.
2. Join with a fresh address (e.g. `nick.physick+golive@googlemail.com`): "Nearly there…".
3. The confirm email arrives from Nick at QueryHawk. Click "Confirm my place". It should land on **queryhawk.net/welcome**: "Welcome, founding writer." with **No. N of 50**.
4. The welcome email "You're in: founding writer No. N" arrives.
5. **Give the test place back:** click **Unsubscribe** at the foot of that welcome email (or Gmail's Unsubscribe button beside the sender, which also tests the new header).
   - That releases the place in one transaction; if anyone were waiting, they'd be promoted into it.
   - `curl -s https://queryhawk.net/api/waitlist` should show the count from before.
   - The unsubscribed record can be deleted in Firestore → `waitlist` (filter `status == unsubscribed`).
   - Don't delete a *verified* record by hand: that skips the release and leaves its place counted.

## 6 · Share preview and Cloudflare
- **Share preview.** Paste `https://queryhawk.net/` into a WhatsApp chat (to yourself). The card should show "QueryHawk: track every query to a literary agent", the description and the hawk image. If an old preview appears, run https://developers.facebook.com/tools/debug/ → **Scrape again** and paste again.
- **Cloudflare.** dash.cloudflare.com → Analytics & Logs → Web Analytics → queryhawk.net. Your phone visit should show within a few minutes. An ad blocker on the device hides it.
