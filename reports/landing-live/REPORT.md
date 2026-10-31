# Landing-only live: the report (18 Oct)

**Branch:** `landing-live`, cut from `release/live-1` at **`9f11097b`**. **No merge was needed**:
`leftovers-queryhawk` was already inside `release/live-1` (fast-forwarded earlier the same day).
Pushed; not merged anywhere. **Nothing was deployed, live or dev.**

| Part | Commit | What |
|---|---|---|
| A | `fea8f30e` | the landing-only switch |
| B | `e6525adc` | the five confirmation states |
| C | `7fce16be` | measured on a local production build |
| D | `0908ef0f` | the runbook |
| D follow-up | `0066be92` | the preflight's branch check |

This report is one more commit on top.

## False premises

1. **The verify handler's kinds aren't defined in `functions/src/waitlist.ts`.** The handler sends
   one literal (`?verified=unknown` for a missing token) and otherwise `outcome.kind`. The outcome
   type is `VerifyOutcome` in **`functions/src/waitlistStore.ts`**. V3 therefore reads both files.
   The set is exactly the five, so there was no stop.
2. **The inline form can't record a source of its own.** The server accepts only `landing-panel`,
   `founders-hero`, `sealed-band`, `holding-page` and `unknown`. Adding one would change function
   logic, which this pack rules out. So the form in `expired`/`unknown` records `founders-hero`,
   which is where it sits.
3. **"The served HTML/JS has no Log in control" wasn't true of the first landing-only build.**
   - The sign-in screen and the workspace dropped out of the bundle by themselves, because App's
     early return made them unreachable.
   - But the nav's "Log in" ×2 and "Open dashboard" were runtime branches and stayed in.
   - Part D makes the nav and shell decide on the build-time constant, so the minifier drops them
     too. Measured on the production bundle: "Log in", "Open dashboard", "Open QueryHawk", "Create
     account" and "Sign up with Google" all occur 0 times. The bundle is 2.5 MB.
4. **The `measure` project can't measure this build.** It signs in first, and a landing-only build
   has no sign-in to reach. Part C adds a `public` Playwright project (no sign-in, no saved session)
   for `*.public.ts` files.
5. **The go-live preflight pinned `release/live-1`.** The landing-only runbook runs from
   `landing-live`, so check 4b would have failed a correct run. It now accepts either; checks 0 and
   3e still refuse a build that isn't landing-only.
6. **The test counter is not put back by deleting the test entry.** `counters/waitlist` keeps its
   `verifiedCount`. The runbook's test step therefore says when to delete the counter and when to
   reduce it by one.

## §0 Recon

### 0.1 · The front door in a production build, before this pack

| Route | What renders | What it can write |
|---|---|---|
| `#/login`, `#/signin` on a public path | `<Auth initialMode="login">` (App.tsx `:505–511`) | sign-in only |
| `#/signup` on a public path | `<Auth initialMode="signup">` | an Auth user, then `users/{uid}`; onboarding may add a manuscript |
| nav "Log in", desktop and mobile (MarketingShell `:201`, `:242`) | sets `#/login` → as above | as above |
| footer "Open QueryHawk" (`openApp`, MarketingFooter `:27`, `:71`) | sets `#/login` → as above | as above |
| nav "Open dashboard" (signed in) | `/dashboard` | — |
| `/plans`, `/account`, every workspace path, signed out | `<Auth initialMode="signup">` (App.tsx `:529–531`) | as `#/signup` |
| an unknown path | falls through to `/dashboard` → `<Auth/>` | as `#/signup` |
| Google, on either Auth tab | a new user goes straight in | an Auth user and `users/{uid}` |

**After this pack, on the production build, every row ends on `/` with the public site.**

### 0.2 · What the public pages call on the back end

| Call | From | Needs |
|---|---|---|
| `GET /api/waitlist` (the count) | the founding forms on `/` and `/founders` | `waitlist` |
| `POST /api/waitlist` (join) | the same | `waitlist`; secrets `RESEND_API_KEY` and `WAITLIST_IP_SALT` |
| `GET /api/waitlist/verify`, `/unsubscribe` | the links in the emails | `waitlist` |
| contact form | `/contact`, but `CONTACT_TRANSPORT = "mailto"`, so no function is called | — |
| App Check | inert (no live site key) | — |

**Landing-only needs `waitlist` and nothing else.** `waitlistRetention` is optional.

### 0.3 · Verify kinds

- **The five, exactly:** `verified`, `already`, `waiting`, `expired`, `unknown`. A missing token is
  `unknown`.
- **The redirect carries the kind only.** The position lives in the store result, and is used only
  for the welcome email.
- **The waitlist never touches a signed-in user.** It writes through the Admin SDK.

### 0.4 · The live project's Auth settings

Read in the console; nothing changed.

| Setting | State |
|---|---|
| Providers | **Email/Password: enabled. Google: enabled.** (Upgraded to Identity Platform.) |
| User actions → **Enable create (sign-up)** | **ON** |
| User actions → Enable delete | ON |
| Email enumeration protection | ON |

### 0.5 · Runbook steps that change

Secrets drop to the waitlist's two, and functions drop to `waitlist`. A sign-up-closing step goes in
before hosting. The real test now checks "You're in." and "You're already in.". Verify `hosting`
gains its landing-only checks. `ANTHROPIC_API_KEY`, every AI function, `redeemInviteCode`,
`sendContactMessage`, `sendBetaFeedback`, `sendWeeklyPulse` and the July-account check all move to
"after the app opens".

## Locks

| Lock | Red | Green |
|---|---|---|
| **L1** the decision sends `/dashboard`, `/agents`, `/account`, `/nonsense` and sign-in hashes home; rendered, none draws `sf-` or `ws-app`; App's branch precedes `authReady` and `<Auth` | mutation: `/dashboard` let through. Both the decision case and the rendered case go red. | ✓ |
| **L2** flag on: the rendered shell (nav, mobile menu, footer) has no Log in, Open dashboard or Open QueryHawk, signed in or not | mutation: the nav's Log in restored | ✓ |
| **L3** flag off: the flag is off, Log in and Open QueryHawk return, App's signed-out `<Auth/>` is untouched | mutation: the flag's default inverted (also reddens L1's render and L2) | ✓ |
| **L4** `.env.production` sets it, `.env.development` does not | mutation: set in `.env.development` | ✓ |
| **V1** each kind renders its exact chip, headline and paragraph, and the inline form only where asked; junk and empty values are `unknown`; no parameter is today's page | mutation: `already` → `unknown` | ✓ |
| **V2** no state contains "‹digit› of" or "place ‹digit›" | mutation: "You hold place 37 of 100" added to `verified` | ✓ |
| **V3** every kind the handler can send has a state (read from `waitlist.ts` and `waitlistStore.ts`) | mutation: a sixth kind added to `VerifyOutcome` | ✓ |
| page smoke | `/founders?verified=verified` joins `PUBLIC_ROUTES` | ✓ |

Every L and V lock is held by the env stub and a re-import, so the modules evaluate the flag the way
a build does. The stub was proved to reach `import.meta.env`, because L1 asserts `LANDING_ONLY ===
true`.

## Part C readings (a production build, `vite preview` on 127.0.0.1, never live)

**Green: 13 / 13, run twice** (after Part C, and again on the final build after Part D).

| Check | Reading |
|---|---|
| `/`, `/founders`, `/pricing`, `/about`, `/contact` | render at their own path; sign-in screen never seen, workspace never seen (32–33 frames sampled each) |
| `/dashboard`, `/agents`, `/x`, `/#/login`, `/#/signup` | all end on `/` with no hash; sign-in screen and workspace never seen across 44–49 frames sampled during the navigation |
| `/founders?verified=already` | the already state shows, `?verified` is gone from the URL after load, and focus is on "You're already in." |
| chrome at 1440 and 390 (burger opened) | no Log in, Open dashboard or Open QueryHawk on any public page; "Become a Founding Writer" present on all |

**Red: the same file against a dev-mode build (the whole app) fails 7.** The five redirects show the
sign-in screen, and the chrome check finds "Log in" at both widths. The renders and C2 pass there
too, as they should. The full readings are in `reports/landing-live/partC-readings.json`.

## Gates

`set -o pipefail`, each gate's own exit code, read as counts.

| | Baseline `9f11097b` | Final `0908ef0f` |
|---|---|---|
| tsc (root, functions) | 0, 0 | 0, 0 |
| builds (dev, prod) | 0, 0; no error or warning lines | 0, 0; no error or warning lines |
| Vitest | 609 files · 9,050 passed · 3 skipped (exit 0) | **611 files · 9,075 passed · 3 skipped** (exit 0, `--maxWorkers=4`) |

Two full runs during Part A exited 1 on the known `Timeout calling "onTaskUpdate"` reporter error,
with zero failures, at a load average of 15–20. CLAUDE.md records this class. `--maxWorkers=4` gave
clean exits with identical counts, and every later gate ran that way.

## The runbook, in brief

`reports/go-live/RUNBOOK.md`, rewritten for landing-only.

| Step | Before | Now |
|---|---|---|
| 0 | env file, preflight | **+ confirm `VITE_LANDING_ONLY=true`** (the preflight also checks it as line 0) |
| 1 | `RESEND_API_KEY`, `WAITLIST_IP_SALT`, Anthropic note | **the waitlist's two only** |
| 2 | five functions, plus an AI line | **`waitlist` only**; `waitlistRetention` optional (a dry run, nothing deleted) |
| 3 | indexes: none | unchanged |
| 4 | rules | unchanged, noted as not needed for the waitlist but worth doing now |
| 5 | — | **new: close sign-up in the console.** This, not the hidden screen, is the real lock. |
| 6 | hosting | **+ `/dashboard` and `/#/login` serve the landing; the served bundle has no way into the app**; the preflight gains 3e |
| 7 | the real test | **"You're in." → "You're already in." → delete the entry → put the counter back** |
| 8–9 | rollback, console items | + sign-up rollback; Auth templates noted for later |
| — | — | **new closing section, "After the app opens"** |

The current preflight run fails only on step 0's env file and step 1's two secrets. Everything about
the build passes, including landing-only (0) and no way into the app (3e).

## For Nick

### The order, exactly

From `/Users/nickphysick/ScriptAlly-landing`:

1. **Step 0:** create `functions/.env.gen-lang-client-0801391782` (the five lines in the runbook),
   then `npm run build` and `node scripts/live-preflight.mjs`.
2. **Step 1:** `firebase functions:secrets:set RESEND_API_KEY --project prod`, then the
   `WAITLIST_IP_SALT` line. Preflight → PASSED.
3. **Step 2:** `firebase deploy --only functions:waitlist --project prod` (and optionally
   `functions:waitlistRetention`). Verify `functions`.
4. **Step 4:** `firebase deploy --only firestore:rules,storage --project prod --debug`; read the
   release time. Verify `rules`.
5. **Step 5:** console → Authentication → Settings → User actions → **untick Enable create
   (sign-up)** → Save.
6. **Step 6:** `npm run build && node scripts/live-preflight.mjs`, then
   `firebase deploy --only hosting --project prod`. Verify `hosting`, then `all`.
7. **Step 7:** the real test with `nick+golive@queryhawk.net`; remove it and put the counter back.

Step 3 (indexes) needs nothing.

**The console switch in step 5, not the hidden sign-in screen, is what actually closes account
creation.**

### Merging

- **Merge `landing-live` into `release/live-1` before you start.** It's a fast-forward, since it
  sits directly on `9f11097b`, and the preflight accepts either branch.
- **Merging to main** stays the post-launch question it was.
