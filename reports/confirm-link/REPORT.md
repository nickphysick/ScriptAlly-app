# The founding confirm link lands on a Firebase error page — 2 Nov

**Cause, in one sentence:** the confirm link and the function both work, but the hosting release
deployed to live at 20:51 UTC on 2 Nov replaced the `**` catch-all with a regex written for a match
anywhere in the path; Firebase Hosting matches the whole path, so `/welcome` (where the function
sends a confirmed writer) and `/privacy` are served Firebase's own "Page Not Found".

Fixed in the repo (`61c1e6ad` on `main`, `456efbac` on `release/live-1-confirm`). Nothing was
deployed. Nick's steps: RUNBOOK §13.

## False premises

1. **"The function's environment or the link's host may be wrong."** Neither is. Live's `waitlist`
   has `WAITLIST_PUBLIC_URL=https://queryhawk.net`, and the email's link is on queryhawk.net.
   **No function redeploy is needed**, so the brief's "set the variable and redeploy waitlist" step
   is not in the runbook.
2. **"The link lands on /founders, showing 'You're in.'"** Since the founding-welcome work, verify
   redirects to **`/welcome?v=<kind>`**, and `/founders` 301s to `/`. The verified heading is
   **"Welcome, founding writer."** (`welcomeCopy.ts`); "You're already in." is right for the second
   click. RUNBOOK §7.3 still says /founders and "You're in." and is stale.
3. **"Expected: 302 → `/founders?verified=unknown`."** Live gives 302 → `/welcome?v=unknown`, which is
   correct for the current code.
4. **"The live hosting rewrites may be missing."** Both `/api/waitlist` and `/api/waitlist/**` are on
   live and route to `waitlist` in europe-west2. The fault is the LAST rewrite, the SPA catch-all.
5. **"Sign-ups since 18 Oct may have broken links."** The fault began at 20:51 UTC on 2 Nov; every
   earlier release used `**`. And because the function confirms before it redirects, anyone who
   clicked during the fault **is confirmed** and has had their welcome email. They only saw a 404.
6. **"Delete the test entry and check the counter goes back."** Deleting a `waitlist` document does
   not decrement `counters/waitlist`; the runbook already says so (§7). §13.3 says to reduce
   `verifiedCount` by 1 by hand.

## §0 · Readings (2 Nov, ~21:30 UTC, read-only)

### 0.1 · The function's environment
Cloud Functions v2 API, `GET …/functions/waitlist` (revision `waitlist-00004-qul`, updated
2026-11-02T20:26:20Z):

```
FIRESTORE_DATABASE_ID   = ai-studio-ae82196c-c59e-40b9-b209-9fb02f67ade6
WAITLIST_FROM           = Nick at QueryHawk <nick@queryhawk.net>
WAITLIST_REPLY_TO       = nick@queryhawk.net
WAITLIST_CONTACT_EMAIL  = hello@queryhawk.net
WAITLIST_PUBLIC_URL     = https://queryhawk.net
secrets: WAITLIST_IP_SALT v1, RESEND_API_KEY v1
```

### 0.2 · The live hosting config
Hosting API, `sites/scriptally-app/releases`:

| Release (UTC) | Version | Waitlist rewrites | Catch-all |
|---|---|---|---|
| 2 Nov 20:51:56 | `b626679c` (live now) | both, `run: waitlist / europe-west2` | `regex ^/(?:$\|[^a]\|a(?:…s(?:$\|[^/])))))))$` |
| 2 Nov 20:24:40 | `19cb0a3e` | both | `glob **` |
| 31 Oct 23:40 | `34cd17a9` | both | `glob **` |

The repo's regex has **no** trailing `$`; the stored version does. Hosting anchors a rewrite regex
at both ends. Under that rule the regex covers `/` and paths of one to seven characters only.
`release/live-1` (`eceaa974`) and `main` both carried it; `landing-live` still has `**`;
`firebase.holding.json` has only the bare `/api/waitlist`, and is not what live serves.

### 0.3 · What the live URLs return (curl, no redirects followed)

| URL | Status | Location | Body (start) |
|---|---|---|---|
| `https://queryhawk.net/api/waitlist/verify?token=not-a-real-token` | 302 | `/welcome?v=unknown` | `Found. Redirecting to /welcome?v=unknown` |
| `https://queryhawk.net/api/waitlist` | 200 `application/json` | | `{"visible":true,"cap":50,"count":2}` |
| `https://www.queryhawk.net/api/waitlist/verify?token=…` | 301 | `https://queryhawk.net/api/waitlist/verify?token=not-a-real-token` | `Redirecting to …` |
| `https://scriptally-app.web.app/api/waitlist/verify?token=…` | 302 | `/welcome?v=unknown` | as above |
| **`https://queryhawk.net/welcome?v=verified`** | **404 `text/html`** | | **`<title>Page Not Found</title>`** (Firebase's page) |
| `https://queryhawk.net/welcome?v=unknown` | 404 | | Firebase "Page Not Found" |
| `https://queryhawk.net/privacy` | 404 | | Firebase "Page Not Found" |
| `https://queryhawk.net/founders?verified=verified` | 301 | `/?verified=verified` | |
| `https://queryhawk.net/` | 200 | | the landing |
| `https://scriptally-dev.web.app/welcome` | 404 | | the same fault on dev |

### 0.4 · The function's logs, last 24 hours (Cloud Logging, read-only)
No errors, no crash on start, no missing variable. The one real sign-up in the fault window:

```
21:18:17  POST 200 /api/waitlist            (join)
21:18:18  email.send template=confirm outcome=sent
21:19:55  GET 302  /api/waitlist/verify?token=…
21:19:55  email.send template=welcome outcome=sent
```

So the confirmation worked; the writer was then sent to the 404. (21:33 lines are my own probes
with a fake token.) `firebase functions:log` itself failed ("Failed to retrieve log entries"), so
the Logging API was read directly.

### 0.5 · Why no check caught it
- `staleChunk.test.ts` tested the regex with `new RegExp(re).test(path)`, which matches anywhere.
- The Hosting **emulator** does the same: superstatic builds `new RE2(regex)` / `new RegExp(regex)`
  and tests it, so `/welcome` was 200 there with the old regex too (checked: both old and new give
  200 for `/welcome` and 404 for `/assets/nope.js` on the emulator). Only production anchors.

## Part A · The fix (`61c1e6ad`)

`SPA_REWRITE_REGEX` and its copies in `firebase.json` and `firebase.dev.json`:

```
before  ^/(?:$|[^a]|a(?:$|[^s]|s(?:$|[^s]|s(?:$|[^e]|e(?:$|[^t]|t(?:$|[^s]|s(?:$|[^/])))))))
after   ^/(?:[^a].*|a(?:[^s].*|s(?:[^s].*|s(?:[^e].*|e(?:[^t].*|t(?:[^s].*|s(?:[^/].*)?)?)?)?)?)?)?$
```

Every branch consumes the rest of the path and the whole is anchored, so it means the same under
whole-path and match-anywhere rules. Still RE2-safe; `/assets/…` files are still 404s.

### Locks (`src/lib/confirmLink.test.ts`)

| Lock | Claim | Red | Green |
|---|---|---|---|
| L1 | `WAITLIST_PUBLIC_URL=https://queryhawk.net` builds `https://queryhawk.net/api/waitlist/verify?token=…`, and the live block of `functions/.env.example` says that value | mutation: template → `https://scriptally-app.web.app` → `expected 'https://scriptally-app.web.app' to be 'https://queryhawk.net'` | ✓ |
| L2 | live `firebase.json` rewrites `/api/waitlist` and `/api/waitlist/**` to `{functionId: waitlist, region: europe-west2}` | mutation: drop `/**` → `/api/waitlist/**: expected undefined to deeply equal { functionId: 'waitlist', … }` | ✓ |
| L3 | the catch-all, tested as Hosting matches (whole path): `/welcome`, `/privacy`, `/dashboard` … reach the app; `/assets/…` does not | **before the fix:** `/welcome: expected false to be true`; mutation (old regex restored) → the same | ✓ |

L1 and L2 describe things that were already right, so they went red on mutation only. L3 was red
on the unchanged tree.

### Gates (`set -o pipefail`, counts read)

| | Baseline (`a649bd3c`) | After (`main`) | `release/live-1-confirm` |
|---|---|---|---|
| tsc root | 0 errors | 0 | 0 |
| tsc functions | 0 | 0 | 0 |
| `build:dev` | clean (0 error/warning lines) | clean | — |
| production build | clean | clean | clean |
| Vitest | 658 files · 10,082 passed · 3 skipped | 659 · 10,085 · 3 | 659 · 10,069 · 3 |

Root `tsc` ran out of heap at the default size once (exit 134) and was run with
`--max-old-space-size=8192`; that is the machine, not the tree.

## Part B · The runbook (`81df76a8`)
`reports/go-live/RUNBOOK.md` §13 "Fix the confirm link": bring `456efbac` onto `release/live-1`
by fast-forward, build + preflight, `firebase deploy --only hosting --project prod` (never
`firebase.holding.json`), curl checks, the real test with `nick+confirmtest@queryhawk.net`
(document id `93a8cd5b…597a`), the counter fix, the 20:24 rollback as a stopgap, and the console
filters for who was affected.

## Left alone
- `release/live-1` itself: it is checked out in `~/ScriptAlly-live`, so the fix is on the side
  branch `release/live-1-confirm` for a fast-forward. Neither branch is pushed.
- Dev still 404s `/welcome` until dev is redeployed from `main`.
- RUNBOOK §7.3's "/founders … You're in." wording is stale (false premise 2); not edited.
