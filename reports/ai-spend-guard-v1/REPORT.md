# AI spend guard v1 — report (8 Nov 2026)

Branch `fix/ai-spend-guard-v1` (local, not pushed), cut from local `main` at `77ff49029`.
Dev serves it merged into the chain as `dev/…-cp30-tdp1-aisg1` (local, not pushed), bundle `index-GtyhzUwl.js`.

## 1. False premises and deviations (read first)

1. **Premise 6 is only half true, and Phase 4's code change is STOPPED on it.** Measured on dev (section 5):
   through the Hosting rewrite, Hosting discards the caller's `X-Forwarded-For` and sends
   `<real client>, <Hosting proxy>`, so the first entry is the real client and a forged header changes
   nothing. Only a request sent **straight to the function URL** (public, bypasses Hosting) keeps the
   forged value first, with the real client appended last. No single-entry rule is right for both
   paths, and Hosting's own markers (`fastly-*`, `x-firebase-hosting-channel`, `x-forwarded-host`) are
   ordinary headers a direct caller can forge too. The pack's "read the entry the Google front end
   adds" would, via Hosting, key every visitor on a shared Google proxy address. Nothing was committed
   for Phase 4. Options for Nick are in section 7.
2. **The prod App Check site key is empty.** `.env.production` has `VITE_APP_CHECK_SITE_KEY=` blank.
   With `enforceAppCheck: true` deployed to prod as things stand, **every AI call on prod would be
   refused**. A prod reCAPTCHA Enterprise key, registered for the prod web app in App Check, is a
   prerequisite of step 6 below — not optional.
3. **Base is local `main`, not `origin/main`.** Local `main` was two commits ahead (the emulator disk
   guard, `102fab5c2` + `77ff49029`), and CLAUDE.md makes the guard mandatory for every emulator run.
   Branching from `origin/main` would have run the emulator suites around it.
4. **`scoutRateLimits` had no rules block** — it was covered only by the default-deny catch-all. Not
   false as such, but the new admin-only blocks state both trees explicitly (section 3, Phase 1).
5. **`assistAgentData` and `suggestComps` are not deployed on dev** (only `smartImportMap`,
   `extractFromEmail` and `waitlist` are). I did not create them there: their own file headers say
   standing them up is Nick's call. Their enforcement is proved by the source lock, not on dev.
6. **There is no error-toast path in these three features** — each shows errors inline. The messages
   go through those existing lines. For Smart Import's file path, `ConfirmScreen` gained an optional
   `note` that replaces its existing lead line (no new element).

## 2. Baselines, before and after

| Suite | Before (77ff49029) | After (final branch) |
|---|---|---|
| root `tsc --noEmit` | exit 0 | exit 0 |
| `tsc -p functions` | exit 0 | exit 0 |
| `npm test` (Vitest) | 679 files · 10,314 passed, 3 skipped | 683 files · 10,331 passed, 3 skipped |
| `npm run test:functions` | 1 file · 55 passed | 3 files · 76 passed |
| `npm run test:rules` | 4 files · 210 passed | 5 files · 214 passed |
| `vite build` (prod) | — | exit 0, no CSS warnings |

The integrated dev tree (chain + this branch) has 3 unit reds that are **the chain's own, not this
work's**: `emuGuard.test.ts` and `firestoreTarget.test.ts` naming the chain's e2e scripts
(`cl25x*.mjs`, `cb21Emu.sh`) against locks that arrived from `main`. Neither test reads a file this
branch touches. Root `tsc` there needs `--max-old-space-size=8192` (it ran out of heap at the default).

## 3. Per phase

### Phase 1 — `eb350c993` — one daily limit
- `functions/src/aiRateLimit.ts`: `claimDailySlot(db, uid, feature, limitPerDay)` — the Scout's
  `claimRun` lifted out: UTC day, transaction, claimed before the model call, a failed run costs its
  slot, refusal `resource-exhausted` with `{ reason: "daily_limit", feature }` and never a count.
- `suggestComps` moved onto it **keeping its path** (`scoutRateLimits/{uid}`; moving it would only
  reset everyone's count on deploy) and its wording. One additive change: its refusal now carries the
  `details` object.
- `assistAgentData` and `extractFromEmail` claim after auth, plan and input checks (and, for email,
  after reading context), before the client is built. New docs: `aiRateLimits/{uid}/features/{feature}`.
- Rules: `scoutRateLimits/{uid}` and `aiRateLimits/{uid}/features/{feature}` → `allow read, write: if false`.
- Client: `src/lib/aiRefusal.ts` holds the words; `PasteEmailFlow` and `HousekeepingSweep` show
  "You've used today's allowance for this. It resets tomorrow." A unit test holds the client's words
  equal to the server's.
- Tests: `aiRateLimit.emulator.spec.ts` (11), `tests/rules/aiRateLimits.rules.test.ts` (4),
  `src/lib/aiRefusal.test.ts` (3).
- Red-before: both new claims removed → 7 failures (first call, call 11, next day for both features,
  and the failed-run case); Scout cases stayed green; restored.

### Phase 2 — `70e1315f6` — Smart Import claims before the call
- One transaction re-reads the entitlement: spent → the existing `free_used` / `pro_month_used`; a
  `smartImportPending` younger than 6 min (`PENDING_CLAIM_MS`) → `in_progress`; else writes the claim.
- Usable result → one write sets the used flag and deletes the claim (`consume()`, kept by name so
  the two existing source locks' claim still reads true). Any failure → `finally` deletes the claim.
- Client: "Your import is already being read. Give it a moment." on the photos screen's message line
  and the confirm screen's lead line.
- Tests: `smartImportClaim.emulator.spec.ts` (10): 5 parallel → exactly one reaches `mapSheet`, four
  refused `in_progress`; api/badjson/nonjson/thrown → claim cleared, allowance intact, retry works;
  success → flag set, claim gone; 1-min claim refuses, 7-min claim runs; existing refusals unchanged.
  `smartImportPhotos.test.ts`'s fake Firestore gained `runTransaction` and pins the new writes.
  `confirmNote.test.tsx` (2).
- Red-before: old `smartImport.ts` restored → the parallel case failed with **zero of four refused**
  (all five reached the model); restored.

### Phase 3 — `abd0a505c` — App Check on every AI callable
- `enforceAppCheck: true` on all four callables.
- `src/marketing/appCheck.ts`: `ensureAppCheck()` — the same lazy reCAPTCHA Enterprise init and key
  the waitlist uses, memoised as a promise. Debug token only when
  `import.meta.env.MODE !== "production"` **and** on localhost; the prod bundle holds only the SDK's
  own read of the name, not the assignment (grepped).
- `src/lib/aiCallable.ts`: the one door; awaits `ensureAppCheck()` then builds the callable. All five
  client call sites use it.
- Emulator specs call handlers through `.run()`, which never enters the HTTPS layer, so no bypass
  option exists in source and nothing weakens the deployed path.
- Locks: `functions/src/aiSpendGuard.test.ts` (9) and `src/lib/aiCallable.test.ts` (3), both proved red
  by mutation. `smartImportTimeouts`' "hands the callable its timeout" retargeted to `aiCallable`, law
  unchanged, both call sites asserted.
- **Dev deploy**: hosting (`index-DalV8gEp.js` → `index-GtyhzUwl.js`) then
  `functions:smartImportMap,functions:extractFromEmail`. Proof:
  - signed in as the harness account, no App Check token → both **401 "Unauthenticated"** (the
    SDK's refusal, `firebase-functions/lib/common/providers/https.js:471`), while the un-enforced
    `sendBetaFeedback` with the same sign-in reached its body (400);
  - from the dev origin, a real token minted with the same provider and key, no sign-in, empty data:
    without token → "Unauthenticated", **with token → "Please sign in."** — the handler's own first
    line, so App Check accepted it.
  - Not observed: the header on a request from the app's own UI. Every in-app AI flow that sends a
    request reaches the model, so that path is proved by `aiCallable.test.ts` and the SDK, not by
    the network panel.

### Phase 4 — no commit — see sections 1 and 5.
The temporary probe was deployed to dev's `waitlist` and removed; dev's `waitlist` is the clean
chain code again (checked: `?aisgprobe=1` returns the normal count).

## 4. Daily limits

| Feature | Limit | Document |
|---|---|---|
| Scout (`suggestComps`) | 10 / UTC day (unchanged) | `scoutRateLimits/{uid}` |
| Assisted fill (`assistAgentData`) | 10 / UTC day | `aiRateLimits/{uid}/features/assistAgentData` |
| Email import (`extractFromEmail`) | 10 / UTC day | `aiRateLimits/{uid}/features/extractFromEmail` |
| Smart Import | unchanged allowance (1 free / 1 Pro per month), now claimed first | `users/{uid}/private/entitlement` |

## 5. What `X-Forwarded-For` looked like on dev (my IP 82.36.100.111)

| Request | `x-forwarded-for` | `req.ip` |
|---|---|---|
| Hosting rewrite, no header | `82.36.100.111,142.250.32.73` | 82.36.100.111 |
| Hosting rewrite, forged `1.2.3.4` | `82.36.100.111,66.249.93.140` | 82.36.100.111 |
| Hosting rewrite, forged `1.2.3.4, 5.6.7.8` | `82.36.100.111,66.249.93.38` | 82.36.100.111 |
| Function URL direct, forged `1.2.3.4` | `1.2.3.4,82.36.100.111` | **1.2.3.4** |

## 6. Prod deploy steps for Nick, in order

0. **Prerequisite:** create a prod reCAPTCHA Enterprise key for the prod domains, register it in App
   Check for the prod web app, and set `VITE_APP_CHECK_SITE_KEY` in `.env.production` (it is empty).
   Without this, step 4 breaks every AI feature on prod.
1. **Rules:** `npm run deploy:rules` (the two new admin-only blocks; both trees were already
   default-denied, so this changes no behaviour).
2. **Hosting**, so clients start sending tokens.
3. **Check the App Check console** (Firebase → App Check → APIs → Cloud Functions): requests to the
   four functions should show as verified, not unverified.
4. **Functions**: `smartImportMap`, `extractFromEmail` (and `assistAgentData`, `suggestComps` if and
   when you stand them up). Prod's `release/live-1` still pins Node 20 in `functions/package.json`.

## 7. Deferred, with owners

- **Waitlist client IP (Phase 4) — Nick to choose.** Options: (a) accept the direct-URL bypass, since
  the Hosting path is already correct and double opt-in, the honeypot and timing checks still apply;
  (b) rate-limit by a value a direct caller cannot forge, e.g. enforce App Check on the waitlist (it
  is in monitor mode today) so direct callers are refused outright; (c) key on the last entry only
  when it is outside Google/Fastly ranges (fragile). (b) is the one I would pick.
- **Prod App Check key** — Nick (section 6, step 0).
- **Pushing `fix/ai-spend-guard-v1` and `dev/…-tdp1-aisg1`** — not pushed; dev serves the local
  integration branch. Nick's call.
- **Scout's client message on `daily_limit`** — the Scout keeps its own server wording and its client
  path was not changed (out of scope: the pack named the two unlimited features).
- **`functions/eval/`** can make real model calls by design; it was not run.

## 8. No live AI calls

Every spec replaces `@anthropic-ai/sdk` with a class whose `messages.create` throws, and stubs each
model step. On dev, every request sent was an empty payload refused before or at the handler's first
line (401/400). No AI feature was used in the app, and `functions/eval/` was not run.
