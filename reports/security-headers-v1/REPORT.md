# Security headers v1 (audit 2026-11-07, High 3)

Branch `fix/security-headers-v1` (from `main` @ 13ff0f386), four phase commits plus this report.
Not merged and not pushed. Dev enforces the policy. Prod is prepared, report-only, and **not deployed**.

## 1. False premises, and the GA finding

These were found in Step 0. None was a reason to stop. Each changed how the work was done.

1. **Prod is not built from `main`.** queryhawk.net is deployed from `release/live-1` in `/Users/nickphysick/ScriptAlly-live`, using `npm run deploy:live-hosting` (which runs a preflight that ships only the pushed tip of that branch). Today its `firebase.json` is byte-identical to `main`'s, but a change on `main` never reaches prod by itself. The four commits have therefore also been cherry-picked onto a local branch, **`release/live-1-headers`** (2b2fc4a49, not pushed), which builds the exact bundle prod serves today (`index-CI2SuKdi.js`). Nick deploys from that branch (§5).
2. **The holding page is still deployed.** It is on prod's default site, at `gen-lang-client-0801391782.web.app` and `.firebaseapp.com`. That second domain is also prod's Firebase Auth domain. The live copy is the **22 June** version (commit b4a6fabd6), not the one in the repo, which changed on 25 Oct. `scriptally.ink` shows "Site Not Found". The holding page is now in scope: `firebase.holding.json` has its own report-only policy. **Deploying it would also replace June's page with October's.**
3. **Dev has a second domain, `dev.queryhawk.net`.** It serves the same site and gets the same headers.
4. **The Cloudflare beacon never loads on dev.** `startAnalytics()` (src/lib/cfAnalytics.ts on main; an external `<script>` in index.html on release/live-1) only runs on queryhawk.net. To test it on dev, the walk adds the same tag the app adds. The beacon's POST goes to `https://cloudflareinsights.com/cdn-cgi/rum`. On prod it was observed directly, with the POST aborted so no visit was counted.
5. **The Contact form makes no callable.** `CONTACT_TRANSPORT` is `mailto`, so it opens the mail client.
6. **App Check cannot be shown issuing a token from an automated browser, with or without a policy.** On dev, `exchangeRecaptchaEnterpriseToken` answers `403 "App attestation failed."` to headless Chromium. reCAPTCHA Enterprise scores it as a bot. This happened identically in the no-policy walk. What the walk *does* prove under enforcement is that each step reaches Google with no violation: the reCAPTCHA script, its frame, its `clr` call, and the exchange request. The `X-Firebase-AppCheck` header is therefore absent in every automated run. **A person in a normal browser on dev is the check** (§6 D1). On prod, App Check is inert anyway, because `VITE_APP_CHECK_SITE_KEY` is empty there.
7. **"The App Check header on an AI callable request" could not be produced within the rules.** The only way to fire an AI callable is Smart Import's read button, which the pack forbids pressing. Instead, the walk fired a non-AI callable, the feedback dock's `sendBetaFeedback`. It was intercepted in the browser and aborted, so it never reached the server and no feedback was sent. That proves `connect-src` allows `europe-west2-scriptally-dev.cloudfunctions.net`. In the signed-in app the call also has no App Check header, because App Check is only started by the waitlist and by `aiCallable` (finding 6 applies regardless).
8. **No reachable page uses Firebase Storage.** On dev, no feedback kind offers a screenshot, and the attachments panel's only mount (`AllManuscripts`) is not routed. Following the pack's rule, **`firebasestorage.googleapis.com` is not in the policy** (§6 D2).
9. **`Tour.tsx` has no importers.** Its `dangerouslySetInnerHTML` is unreachable.
10. **The tsc and test baselines are red before any edit.** tsc shows 2 errors in `functions/src/aiRateLimit.ts`. Tests show 5 failing files: four under `functions/` and `src/lib/aiRefusal.test.ts`. Both are because a fresh worktree has no `functions/node_modules`. The gate held at "no worse": the same 2 errors and the same 5 files at the end.

**Google Analytics: the gtag loader cannot run on any page.** `src/marketing/analytics.ts` only loads `googletagmanager.com` when `GA_ID` (`VITE_GA_MEASUREMENT_ID`) is non-empty. No env file sets it: not main's or release/live-1's `.env.*`, and not either `.env.local`. It is a build-time constant, so the code is inert. `initAnalytics()` is still called by `MarketingShell` on every public page, and returns at once. Neither walk saw a googletagmanager request. GA is not in the policy, and a test fails if it ever is. The code was not touched.

## 2. The final policy, and what needed each origin

One source of truth: **`scripts/csp.mjs`**. It writes the headers into `firebase.dev.json`, `firebase.json` and `firebase.holding.json` (`node scripts/csp.mjs --write`; `--check` fails on drift). `src/test/securityHeaders.test.ts` fails if a config stops matching.

Prod and dev differ only in the project-specific origins (the auth domain and the functions origin). The generator reads these from each site's env file, and a test asserts that is the only difference.

The app policy on dev, enforced:

```
default-src 'self'; script-src 'self' https://apis.google.com https://www.google.com https://www.gstatic.com https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self' https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://content-firebaseappcheck.googleapis.com https://www.google.com https://europe-west2-scriptally-dev.cloudfunctions.net https://cloudflareinsights.com; frame-src https://www.google.com https://scriptally-dev.firebaseapp.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests
```

Prod (`firebase.json`) is the same, report-only, with these three differences:
- `scriptally-dev` becomes `gen-lang-client-0801391782` in the functions origin and the auth domain;
- `gen-lang-client-0801391782.firebaseapp.com` is taken from `.env.production`;
- there is no `upgrade-insecure-requests`, for the reason given in the table.

| Origin | Directive | Observed on |
|---|---|---|
| `'self'` | all | every page (app files, `/api/waitlist`) |
| `fonts.googleapis.com` | style-src | every page, dev and prod (Google Fonts CSS) |
| `fonts.gstatic.com` | font-src | every page, dev and prod (font files) |
| `static.cloudflareinsights.com` | script-src | every public page on queryhawk.net (beacon) |
| `cloudflareinsights.com` | connect-src | the beacon's POST, prod and dev |
| `apis.google.com` | script-src | sign-in page (Google sign-in helper) |
| `scriptally-dev.firebaseapp.com` / prod auth domain | frame-src | sign-in page (Firebase Auth's `/__/auth/iframe`) |
| `identitytoolkit.googleapis.com` | connect-src | sign-in and every signed-in page |
| `securetoken.googleapis.com` | connect-src | signed-in page after the ID token expired (the walk forces the expiry) |
| `firestore.googleapis.com` | connect-src | every dev page (app and public) |
| `www.google.com` | script-src, frame-src, connect-src | waitlist: reCAPTCHA Enterprise. The connect-src entry was the **one violation in the first report-only walk** (its `clr` call). |
| `www.gstatic.com` | script-src | waitlist: reCAPTCHA Enterprise's script |
| `content-firebaseappcheck.googleapis.com` | connect-src | waitlist: App Check token exchange |
| `europe-west2-<project>.cloudfunctions.net` | connect-src | feedback dock's `sendBetaFeedback` (aborted in the browser); every callable uses this origin |
| `data:` / `blob:` | img-src | `blob:` for Smart Import photo previews (1 rendered); `data:` for inline images in CSS |

Other choices in the policy:
- **`'unsafe-inline'` is in style-src only.** It covers the `<style>` in Queries.tsx and React `style=` attributes, as the pack decided. Nothing else needs it.
- **script-src has no hash.** Neither `dist/index.html` (dev build, main or release/live-1) has an inline script. Vite puts its preload helper in the entry chunk.
- **There is no `worker-src`.** The app uses no workers. `blob:` URLs are only for images and downloads.
- **Not allowed, because they were never observed:**
  - `recaptcha.google.com`
  - `www.recaptcha.net`
  - `googletagmanager.com`
  - `firebasestorage.googleapis.com`
  - `www.googleapis.com`: only Firebase's own popup page (a different document) loads it.
  - Image hosts: `coverUrl` has no writer and the rules deny it.
- **`upgrade-insecure-requests` is only in enforcing headers.** In a report-only header it does nothing, and Chrome logs a line about it on every page. That line would look like a violation to Nick during his console check.

Also on `"**"`, enforced on dev and prod alike (and on the holding site):
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy`, which denies camera, microphone, geolocation, payment, usb, serial, hid, midi, display-capture, sensors, xr, publickey-credentials-get, screen-wake-lock, autoplay, encrypted-media, picture-in-picture, clipboard-read and browsing-topics. It keeps two features for the page itself:
  - **`clipboard-write=(self)`**, because the copy-email and copy-pitch buttons use `navigator.clipboard.writeText`;
  - **`fullscreen=(self)`**, which is harmless and avoids breaking anything that asks for it.

No `getUserMedia`, geolocation, `eval`/`new Function`, workers or `<iframe>` exists in `src/`.

**Nothing needs to frame our pages.** Google sign-in is a popup window. Firebase's own `/__/auth/iframe` and `/__/auth/handler` are reserved paths, and they **do not receive these headers**. This was checked after the deploy on dev's default site, which is dev's auth domain: they return only `cache-control: max-age=1800`. So `DENY` on the auth domain does not touch the auth iframe.

**The holding policy:** itself, Google Fonts, and its one inline script by sha256. The hash is computed from `holding/index.html`, so it follows edits.

**`dangerouslySetInnerHTML` (report only, nothing changed):**
- **Tour.tsx:** unreachable (no importers).
- **Queries.tsx:** a static `@keyframes` `<style>`.
- **HeroCard.tsx:** `PILL.freq`, a constant SVG string in the file.

None of them ever receives user data.

## 3. Violation counts per page

All 40 steps of each dev walk:
- **Public pages:** landing (14s of the hero), pricing, about, contact, founders, terms, privacy, welcome, welcome?verified, the waitlist submit, the Contact submit.
- **Sign-in:** sign-up, sign-in, the Google popup (opened, then closed, not completed), email sign-in.
- **Signed-in app:** dashboard, queries, queries full screen, Birds-eye, analytics, responses, packages, contact list, discover, manuscripts, versions, comps, letters, to-do, corkboard, goals, help, settings (profile and preferences), plans.
- **Drawers and flows:** the query drawer, the Edit manuscript drawer, Smart Import with a sheet and with a photo, the forced token refresh, and the feedback dock.

The listed page set follows the served dev line: Materials is `/materials/letters`, and packages are at `/queries/packages`.

| Walk | Violations | CSP console messages |
|---|---|---|
| Report-only, first | 2 events, both on **waitlist** (`connect-src www.google.com/recaptcha/enterprise/clr`); 0 on the other 39 | 1 per page, the `upgrade-insecure-requests` notice |
| Report-only, final (after the fix) | **0 on every page** | 0 |
| Enforced (dev bundle `WICYce58`) | **0 on every page** | 0 |
| Enforced again, after another session's deploy (bundle `8DLF1C1v`) | **0 on every page** | 0 |
| Prod pages + holding, prod policy forced to enforce in the browser | **0 on all 10** | 0 |

Under enforcement everything still works:
- **Fonts:** Playfair Display and Source Sans 3 (plus the rest of the stack) loaded on public and app pages.
- **Waitlist:** the POST reaches the function. After eight test sign-ups it answers 429 "Too many attempts", which is the server's rate limit, not the policy. The first walk got 200.
- **Sign-in:** email sign-in works and the Google popup opens.
- **Drawers:** both open.
- **Smart Import:** the file choices reach their screens and the photo preview renders. Nothing was read.
- **Callables:** the callable request leaves the page.
- **Beacon:** it loads and posts.
- **Framing:** a local page that iframes dev is refused (`frame-ancestors 'none'`; screenshot in `frame-refused.png`).

These five failed requests occur in every walk, with or without a policy:
- reCAPTCHA's own aborted `clr`;
- the App Check 403;
- the waitlist 429;
- the Contact form's `mailto:`;
- a 400 inside Firebase's popup page.

To show the probe catches real violations, the prod check was run once with `fonts.gstatic.com`, the beacon and the holding hash removed. It reported 303 violations a page, 54 on holding, and no fonts loaded.

The readings are in this folder: `walk-0-observed-no-policy.json`, `walk-1-report-only-first.json`, `walk-2-report-only-final.json`, `walk-3-enforced-final.json`, and `dev-headers.txt`.

## 4. Commits

| Phase | SHA | Files |
|---|---|---|
| 1 | 9d08b8392 | scripts/csp.mjs, firebase.dev.json, src/test/securityHeaders.test.ts, src/lib/liveConfig.test.ts, tests/e2e/cspWalk.mjs, tests/fixtures/csp/{sheet.csv,page.png} |
| 2 | e6f2a3c58 | scripts/csp.mjs, firebase.dev.json |
| 3 | fb0b1eac7 | scripts/csp.mjs, firebase.dev.json |
| 4 | d30ed8ef4 | scripts/csp.mjs, firebase.json, firebase.holding.json, tests/e2e/cspProdPreview.mjs |
| 5 | (this commit) | reports/security-headers-v1/* |

- **`liveConfig.test.ts` (L2/L3):** these tests used to require prod's headers to equal dev's exactly. They now compare the two configs without the security headers, which differ on purpose and are held by `securityHeaders.test.ts`.
- **No app code changed.**
- **Dev deploys (hosting only, each re-checking the served bundle hash first):**
  - From `dev/qc153-tl1-ww2` @ deff83314 (`index-WICYce58.js`), three deploys: report-only, the report-only fix, then enforce.
  - Another session then deployed `dev/qc153-tl1-ww2-qc1531` @ 7ca84d1da (`index-8DLF1C1v.js`) with a config that has no headers. I rebuilt that exact commit, confirmed the hash matched what dev served, and re-deployed it with the headers.

**Phase 5 gates** compared to the baseline:
- **tsc:** the same 2 errors.
- **build:** clean.
- **tests:** the same 5 failing files; passing went from 10413 to 10417, the 4 new ones being mine.

`curl -sI` on dev `/`, `/signin` and `/assets/index-8DLF1C1v.js`:
- all three show the enforced CSP, `x-frame-options: DENY`, `nosniff`, `strict-origin-when-cross-origin` and the Permissions-Policy;
- the asset keeps `cache-control: public, max-age=31536000, immutable` (see `dev-headers.txt`).

## 5. Nick's prod steps

All of this happens in Terminal, in the prod folder `/Users/nickphysick/ScriptAlly-live`.

**Step 1 — put the headers on the prod branch and deploy, report-only.**

```bash
cd /Users/nickphysick/ScriptAlly-live
```

```bash
git merge --ff-only release/live-1-headers
```

```bash
git push origin release/live-1
```

```bash
npm run deploy:live-hosting
```

The merge is a fast-forward: `release/live-1-headers` is four commits on top of today's `release/live-1`. Nothing about the landing page or the waitlist changes, only the response headers. The build is byte-identical to what queryhawk.net serves now.

To confirm the headers arrived:

```bash
curl -sI https://queryhawk.net/ | grep -iE 'content-security|x-frame|permissions|referrer|nosniff'
```

You should see `content-security-policy-report-only`, `x-frame-options: DENY`, `x-content-type-options: nosniff`, `referrer-policy` and `permissions-policy`.

**Step 2 — check it in a normal browser.**
1. Open **https://queryhawk.net** in Chrome.
2. Open the console. On a Mac press **⌥⌘J** (Option-Command-J). Or use the menu: View → Developer → JavaScript Console.
3. Reload the page so the console catches everything from the start. Let the hero animation run.
4. Visit Pricing, About, Founders, Privacy and Terms.
5. Join the waitlist with a test address, for example `you+csptest@gmail.com`.
6. In the console's filter box, type `Content Security Policy`. **There should be nothing.**
   - Each message would begin `[Report Only] Refused to …` and would name an address.
   - If you see one, copy it and send it to me. Nothing is blocked while the header is report-only, so the site keeps working either way.

**Step 3 — after a few clean days, switch prod to enforcing.**
1. In `/Users/nickphysick/ScriptAlly-live/scripts/csp.mjs`, on the line for `firebase.json`, change `csp: "report-only"` to `csp: "enforce"`. That is the one-line change.
2. Then run:

```bash
cd /Users/nickphysick/ScriptAlly-live && node scripts/csp.mjs --write && npx vitest run src/test/securityHeaders.test.ts src/lib/liveConfig.test.ts
```

```bash
git commit -am "Security headers: prod enforces the CSP" && git push origin release/live-1 && npm run deploy:live-hosting
```

3. Repeat Step 2's console check. Messages would now read `Refused to …` without `[Report Only]`.

**Step 4 — roll back in one step if anything breaks.**
1. Open the Firebase console, then **Hosting**, then the site **scriptally-app**.
2. In **Release history**, find the release before the bad one.
3. Open its **⋮** menu, choose **Rollback**, and confirm.

The previous version goes live within a minute. No build is involved.

**The holding page (optional, separate).** `firebase.holding.json` now carries report-only headers. Deploying it with `firebase deploy --only hosting --config firebase.holding.json --project prod` would also replace June's live holding page with the October version in the repo. It is still on prod's default domain, which nobody visits but which is the auth domain. Nothing about queryhawk.net depends on it. Decide whether it should be redeployed or retired, rather than deploying it for the headers alone.

## 6. Deferred, each with an owner

- **D1 — App Check token under the policy, in a real browser (owner: Nick, 2 minutes).** On https://scriptally-dev.web.app, open the console's Network tab and join the waitlist with a +test address. Then open the `waitlist` request and check that its request headers include `X-Firebase-AppCheck`. Automation cannot get past reCAPTCHA's bot score (§1.6), and that is so with or without the policy.
- **D2 — Storage (owner: whoever switches on attachments or feedback screenshots).** Add `https://firebasestorage.googleapis.com` to `connect-src` in `scripts/csp.mjs` once a routed page uploads or downloads. Until then an upload on dev would be refused, which shows in the console.
- **D3 — Merge to `main` (owner: Nick or the next session).** `fix/security-headers-v1` is not merged.
- **D4 — Other dev lines must carry the config (owner: every session that deploys dev).** Any dev deploy from a branch without these commits resets dev to no headers; one already has (§4). Merge `fix/security-headers-v1` into the dev line you deploy, or copy its `firebase.dev.json`. `node scripts/csp.mjs --check` tells you whether it is current.
- **D5 — Prod App Check key (owner: Nick, already tracked).** `VITE_APP_CHECK_SITE_KEY` is empty in prod. The policy already allows what it will need.
