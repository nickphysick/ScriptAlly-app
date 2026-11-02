# Analytics: only count real visitors on queryhawk.net (2 Nov)

## False premises

1. **`src/lib/analytics.ts` already exists.** It is the Analytics page's figures module (879
   lines, imported by `analyticsV24` and others), and `src/lib/analytics.test.ts` is its suite.
   The new module is **`src/lib/cfAnalytics.ts`** (`startAnalytics`, `ANALYTICS_HOSTS`), with
   locks in `src/lib/cfAnalytics.test.ts`.
2. **The beacon was not a static `<script>` in any HTML file.** It was written into the built
   `index.html` at build time by a Vite plugin (`qh-cf-beacon` in `vite.config.ts`, from
   `scripts/cfBeacon.mjs`), reading `VITE_CF_BEACON_TOKEN` from `.env.production`. So "remove the
   static snippet" meant removing the plugin, the script, the env line and the build-half test.
   Nothing in `index.html` or `holding/` ever carried it.
3. **"Google Analytics is a separate, later piece of work" is right, but GA code exists.**
   `src/marketing/analytics.ts` (consent-gated, reads `VITE_GA_MEASUREMENT_ID`) is still in the
   tree; the ID was taken out of `.env.production` on 31 Oct (`fa432533`), so it loads nothing on
   any build. Untouched. The runbook's §11 GA steps (consent bar, 11.4 step 7, 11.5) are stale;
   §12 says so.
4. **Live is not built from `landing-live`.** `landing-live` (4b461fc5) is 328 commits behind.
   Live builds from **`release/live-1`**, which is exactly `main` (`eceaa974`) today.

## Base

- Branch: cut from `main` at **`eceaa974`** (= `origin/main` = `release/live-1`), worked in a
  scratch worktree, then fast-forwarded onto `main`.
- Commits: `675d31af` (A) · `bc00b709` (B) · `91016e2e` (C) · `c73637e6` (D) · this report.

## §0 recon

1. **Where the beacon came from:** `vite.config.ts` → `transformIndexHtml` (order `post`) →
   `injectBeacon(html, env.VITE_CF_BEACON_TOKEN)`, emitting, before `</head>`:

   ```html
   <script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "ee52cb1f15964230836ca4f32696fbfb"}'></script>
   ```

   No `"spa"` key or other config: the token only. Only `.env.production` set the token, so
   `build:dev` carried none; **every production build did**, wherever it was served. That is
   the `127.0.0.1` traffic (every `vite preview` of `npm run build`, every measurement run).
2. **Live:** `release/live-1` = `main` = `eceaa974`; `https://queryhawk.net/` serves
   `index-q_Lc6M8o.js` and carries the snippet above. The change lands on `main`; Nick
   fast-forwards `release/live-1` (runbook §12.1).
3. **CSP:** none. `firebase.json` / `firebase.dev.json` set only `Cache-Control`; no meta tags.
   Nothing to allow.
4. **Not injected by Cloudflare:** queryhawk.net resolves to Firebase Hosting (199.36.158.100,
   `www` CNAME `scriptally-app.web.app`, Namecheap DNS, no Cloudflare proxy). The fix belongs in
   the code.

## Part A · CF-2 A1–A3 (`src/lib/cfAnalytics.test.ts`)

`startAnalytics()` is called at the top of `main.tsx`, before the root is chosen or rendered.
It returns unless `location.hostname` is exactly in `ANALYTICS_HOSTS`
(`["queryhawk.net", "www.queryhawk.net"]`); never runs twice (the guard is the tag already in
the document, which holds under StrictMode and HMR); otherwise appends the same tag with the
same `data-cf-beacon` value (`BEACON_CONFIG`, one constant).

| Lock | Base / mutation (red) | Green |
|---|---|---|
| A1: localhost, 127.0.0.1, 192.168.1.10, dev.queryhawk.net, scriptally-app.web.app, scriptally-app.firebaseapp.com, queryhawk.net.evil.com, evilqueryhawk.net, empty host add nothing | `endsWith("queryhawk.net")`: **2 failed** (dev.queryhawk.net, evilqueryhawk.net). *queryhawk.net.evil.com does not end in queryhawk.net, so that mutation cannot redden it; it is held by the exact-list case.* | 15/15 |
| A2: both live hosts, exactly one tag after two calls, same src/defer/token | guard dropped: **2 failed** (both hosts) | 15/15 |
| A3: no HTML in `index.html`, `holding/`, `public/`, `dist/` names cloudflareinsights; Vite config injects nothing; no token in `.env.production` | snippet restored in `index.html`: **1 failed**; base build's `dist/index.html`: **1 failed** | 15/15 |

On base the whole file cannot load (no module).

## Part B · CF-2 B1–B3

`?notrack` sets `localStorage.qh_notrack = "1"`, `?track` removes it; both are stripped with
`history.replaceState`, keeping the rest of the query and the hash. Every storage access is in
try/catch; a throw reads as not opted out. Handled before the host check, so `?notrack` also
works (harmlessly) on dev.

| Lock | Mutation (red) | Green |
|---|---|---|
| B1: `?notrack` sets the flag, URL → `/privacy?utm_source=instagram#top`, no tag; next plain load no tag | flag not read: **1 failed** | 20/20 |
| B2: `?track` clears the flag, tag loads, and on the next load | `track` a no-op: **1 failed** | 20/20 |
| B3: storage throwing: one tag after two calls, nothing throws, parameter still stripped | try/catch removed from the read: **1 failed** | 20/20 |

Against Part A's commit the B cases cannot load (`NOTRACK_KEY` not exported).

## Part C · a real production build (`tests/e2e/cfAnalytics.public.ts`)

`npm run build:prod`, `vite preview --host 127.0.0.1 --port 4411`, Playwright with every request
routed: Cloudflare requests recorded then **aborted** (nothing reached Cloudflare, so the
harness counted no visit), `queryhawk.net` answered by the local build (never live), Google
Fonts passed, anything else aborted.

| Reading | Base build (`eceaa974`) | This build |
|---|---|---|
| C1: Cloudflare requests on `/`, `/privacy`, `/welcome` (127.0.0.1) | **1, 1, 1** (red) | **0, 0, 0** |
| C1 self-check: tag injected by hand in the same run | 1 | **1** |
| C2: `https://queryhawk.net/` | — | 1 request, 1 tag, today's token |
| C2: `https://www.queryhawk.net/privacy` | — | 1 request, 1 tag, today's token |
| C2: `/welcome?utm_source=instagram&notrack` | — | 0 requests, URL `/welcome?utm_source=instagram`, flag `1` |
| C2: next load of `/` | — | 0 |
| C2: `/?track` | — | 1 request, URL `/` |

CF-1 (`launchMeta.public.ts`) is retargeted to "no beacon in the served HTML": red on the base
build and with `META_MUTATE=CF1`, green on this one.

**Live today (read-only GET):** `https://queryhawk.net/` still serves the static snippet
(`index-q_Lc6M8o.js`). Expected until the hosting deploy.

**Found on the way, not fixed:** with Google Fonts blocked, Vite's CSS preload for the
`PublicRoot` chunk fails (`Unable to preload CSS for /assets/PublicRoot-….css`) and the public
site renders **nothing**. A visitor whose network or blocker refuses `fonts.googleapis.com`
gets a blank page. Worth its own small pass.

## Gates

| Gate | Baseline (`eceaa974`) | Final |
|---|---|---|
| `tsc --noEmit` (root) | 0 errors | 0 errors |
| `tsc -p functions/tsconfig.json` | 0 errors | 0 errors |
| `build:prod` | clean | clean; `dist/index.html` has no `cloudflareinsights` |
| `build:dev` | clean | clean |
| Vitest | 658 files, 10,066 passed, 3 skipped | 658 files, **10,082** passed, 3 skipped |

(−4 retired CF-1 build-half cases in `cfBeacon.test.ts`, +20 CF-2 cases.) e2e public:
`cfAnalytics`, `launchMeta`, `privacyPage`: 13 passed.

## Runbook diff

`reports/go-live/RUNBOOK.md` gains **§12 · Analytics** (54 lines): 12.1 fast-forward
`release/live-1` to `origin/main`, build, preflight, `firebase deploy --only hosting --project
prod`, verify; 12.2 the two Network checks; 12.3 `?notrack` in every browser, Instagram's
in-app browser included, `?track` to undo; 12.4 keep the dashboard on Host = queryhawk.net. It
also flags §11's GA steps as stale.

## For Nick

1. **Deploy** (runbook §12.1), from `/Users/nickphysick/ScriptAlly-live`:
   `git fetch origin && git checkout release/live-1 && git merge --ff-only origin/main`, then
   `npm run build && node scripts/live-preflight.mjs && firebase deploy --only hosting --project prod`.
2. **Check:** https://queryhawk.net/ makes a request to `static.cloudflareinsights.com`
   (DevTools → Network); https://dev.queryhawk.net/ makes none.
3. **Opt out** once in each browser: https://queryhawk.net/?notrack (undo:
   https://queryhawk.net/?track), including Instagram's in-app browser.
