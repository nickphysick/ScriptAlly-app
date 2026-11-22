# Crash protection + Sentry error reporting v1 — report

Audit 2026-11-07, High 10 + 11. Branch `fix/crash-reporting-v1` (off main at `caae64b6c`), four commits, not pushed, not merged.
Dev deploy: branch `dev/qc153-tl1-ww2-qc1531-qc1532-qc1533-crash1` @ `e733e8f4a` (the dev line + main + this pack), served as `index-BHJBuq2a.js` from 8 Nov, about 22:25 UTC.

## 1. False premises, and two things found in passing

1. **The public site already had a top-level boundary.** `src/marketing/PublicRoot.tsx` wraps itself in the same `ErrorBoundary`. Its fallback had Reload and no way home. It now takes `homeHref="/"` and shows "Back to the home page" (on the dev line, its "Go to Home" button goes to `/` there instead of `/dashboard`).
2. **`import.meta.env.PROD` cannot gate the crash trigger.** Vite sets PROD to true for every `vite build`, whatever `--mode` says, and dev is deployed from `vite build --mode development`. A PROD gate would have removed the trigger from dev, so Phase 5's checks could not run. The gate is `import.meta.env.MODE !== "production"`, which is still decided at compile time. The dev line's own `ThrowLab` uses the same gate. A test proves the production bundle carries none of it (§5).
3. **Sentry 11 has no `sendDefaultPii`.** It was replaced by a `dataCollection` block. Every category in it is set off: user info, cookies, headers, bodies, query parameters, GraphQL, AI, database data, stack-frame variables, and context lines.
4. **The privacy policy has no single "services we use" list.** Firebase is named in "Where your data lives", Cloudflare in "Cookies and local storage", and Anthropic in §4. Resend is not named anywhere. The Sentry paragraph sits beside the Firebase one.
5. **There are no global `window.onerror` or `unhandledrejection` handlers.** Sentry's own global handlers are the first.
6. **"To-do tray" is not a dock outside the pages.** It lives inside the To-do page, so the page's boundary covers it. Panels outside the pages are listed in §2.
7. **Found in passing: dev had lost its security headers before I deployed.** At 22:01 UTC dev was redeployed from `dev/qc153-tl1-ww2-qc1531-qc1532-qc1533`, which does not contain `caae64b6c`. This deploy put them back (§4). The next dev deploy from any branch without them will drop them again.
8. **Found in passing: the dev line carries pre-existing reds.** These are `emuGuard.test.ts` (`tests/e2e/cb21Emu.sh`) and `firestoreTarget.test.ts` (28 scripts under `tests/e2e/`). They are dev-line files, and this pack touched none of them.

Step 0, checked:
- **One `ErrorBoundary`.** It is at `App.tsx` ~833 and replaces the whole screen.
- **Pages kept alive.** `StagePage` (in `AppShell.tsx`) toggles `display: none`, so pages are never unmounted. On main there are 14 slots:
  - dashboard, queries, analytics, responses;
  - todo, calendar, corkboard;
  - discover, agents;
  - manuscripts (also packages and comps by route);
  - account, plans, help, import.
  - The dev line adds packages-under-queries, materials, versions and goals, and has no calendar.
- **Panels outside the pages.** Add agent and add manuscript forms, the agent card, the query drawer (inside `PracticeOverlay`), the undo bar and the paste-email flow are in `App.tsx`. The feedback dock is in `AppShell`, and the edit-query drawer is in `EditQueryHost`.
- **Where errors were swallowed.** `handleFirestoreError` logged and rethrew. The boundary logged the message only.
- **`scripts/csp.mjs` is the single source for `connect-src`.**
- **The Sentry auth token is absent.**

## 2. Boundaries, and how reset works with kept-alive pages

- **Pages.** `StagePage` takes a `name`. A named slot wraps its page in `PageBoundary` (`src/components/PageBoundary.tsx`).
  - A lock in `pageBoundary.test.tsx` fails if any `StagePage` in `App.tsx` lacks a name.
  - Fallback: heading "This page hit a problem". Body "The rest of QueryHawk is fine, and nothing you'd saved has been lost. Try loading the page again."
  - Buttons: **Try again** (remounts that page only) and **Reload QueryHawk** (full reload).
  - Reuses `.sp-card` and the page header's `.ph-primary` / `.ph-secondary`. No new CSS.
- **Panels.** Each has `kind="panel"` and its own close:
  - `panel:add-agent` (main only; the form is retired on the dev line);
  - `panel:add-manuscript`, `panel:agent-card` (`closeAgentCard`), `panel:query-drawer` (`closeQueryDrawer`);
  - `panel:undo-bar` (`hideUndoBar`), `panel:paste-email`, `panel:feedback`, `panel:edit-query`.
  - Fallback: a one-line card, "This panel hit a problem.", with **Close** and **Try again**.
- **Reset with kept-alive pages: both kinds.**
  - Try again bumps a key and remounts the contents.
  - The page also resets **on the way out**: when `active` goes false, or when the slot's name changes (the manuscripts slot holds three pages). Coming back therefore finds a fresh page.
  - A crash that repeats shows the fallback again on return, as it should.
- **Top level.** `ErrorBoundary` stays outermost as the last resort and now reports with `boundary: "app"`.
- **Dev crash trigger.** `?qh-crash=<name>` works for any boundary name: a page name, a `panel:` name, or `app` for the top level.
  - It throws until its boundary resets. React retries a failed render once, so a throw that fires only once would be swallowed by the retry.

## 3. Sentry

Config (`src/lib/sentry.ts`, initialised first in `src/main.tsx`):
- **Turned off** when there is no `VITE_SENTRY_DSN`, on localhost / 127.0.0.1 / `*.localhost` / `*.test`, in `MODE=emulator` and in tests.
- **Integrations are listed, not defaulted:** EventFilters, FunctionToString, BrowserApiErrors, Breadcrumbs (`dom`, `fetch`, `xhr` and `sentry` off; history on), GlobalHandlers, LinkedErrors, Dedupe, HttpContext.
  - Left out: Replay, tracing, profiling, Feedback, BrowserSession (session pings), console capture, culture context.
- **Settings:** `dataCollection` all off (see §1.3). `release` is the git short SHA (vite `define`). `environment` is `dev` or `prod` from the env files. `denyUrls` covers extension schemes.
- **The user** is `{ id: uid }`, set in `db.tsx`'s auth listener and cleared on sign-out. A test fails if any other file calls `setUser`, or if that call carries anything but an id.
- **Reported from:**
  - every boundary (`tags.boundary`, plus the React component stack);
  - Sentry's global handlers;
  - `handleFirestoreError`, with `tags.operation` and `tags.path` where document ids become `{id}`, e.g. `users/{id}/queries/{id}`. It still throws the same error, now marked so the global handler does not report it twice.

`beforeSend` / `beforeBreadcrumb` rules (`src/lib/sentryScrub.ts`, pure):
- Strip the query string and hash from every URL: `request.url`, frame `filename` / `abs_path`, URLs inside messages and exception values, and breadcrumb `from` / `to`. This covers `?r=` and `?token=`.
- `request` keeps `url` only. Headers, cookies, `query_string`, data and env go.
- `extra` keeps only `boundary`, `operation` and `path`, and only as plain values.
- `user` is reduced to `{ id }`.
- `contexts.browser` is the browser's name and major version, never the full user agent.
- **Any event mentioning an email address is dropped whole.**
- Noise is dropped: ResizeObserver, offline/network messages, frames from browser extensions.
- Only navigation breadcrumbs are kept, by path.

The real event sent from dev (`sentry-envelope.json`, uid redacted; frames trimmed here):

```json
{"exception":{"values":[{"type":"Error","value":"Test crash for \"queries\" (dev crash trigger)",
  "stacktrace":{"frames":[{"filename":"https://scriptally-dev.web.app/assets/AppRoot-y6UNvB_J.js","function":"Probe","lineno":6233,"colno":17348}]},
  "mechanism":{"type":"generic","handled":true}}]},
 "level":"error","platform":"javascript",
 "request":{"url":"https://scriptally-dev.web.app/queries"},
 "environment":"dev","release":"e733e8f4a",
 "sdk":{"name":"sentry.javascript.react","version":"11.11.0","settings":{"infer_ip":"never"}},
 "tags":{"boundary":"queries"},"user":{"id":"<uid>"},
 "contexts":{"trace":{…random ids…},"react":{"componentStack":"at Probe (…) at PageBoundary (…) …"},"browser":{"name":"Chrome","version":"151"}}}
```

The page was opened as `/queries?qh-crash=queries&r=FW-SHOULD-NOT-LEAVE#frag`. None of that query or hash is in the body. There is no email, no headers, no cookies and no page text. `infer_ip: never` means Sentry stores no IP.

## 4. CSP and privacy policy, word for word

`scripts/csp.mjs`, `connect-src`, one line added:

```
"https://o4512398078967808.ingest.de.sentry.io", // every page: Sentry error reports (crash reporting v1), EU ingest, this org only
```

- `firebase.dev.json` (enforced) and `firebase.json` (prod, report-only, **not deployed**) are regenerated. The holding page loads no Sentry and is unchanged.
- `node scripts/csp.mjs --check` passes.
- Served on dev: `connect-src … https://cloudflareinsights.com https://o4512398078967808.ingest.de.sentry.io`.

Privacy policy, "Where your data lives", new paragraph:

> We use Sentry (Functional Software, Inc.) to tell us when something in QueryHawk breaks. When an error happens, Sentry receives the page it happened on, the error itself, your browser type and a random account ID, and stores them in the EU. It never receives what you've written, your email address or your IP address.

`PRIVACY_LAST_UPDATED`: "2 November 2026" → "8 November 2026".

The brief's suggested wording left out the account ID. The code sends the Firebase uid, so the sentence says so.

## 5. Per phase

| Phase | Commit | Files | Tests | Red-before |
|---|---|---|---|---|
| 1 | `ca364ed8f` | App.tsx, AppShell.tsx, EditQueryHost.tsx, ErrorBoundary.tsx, PublicRoot.tsx, new PageBoundary.tsx, lib/devCrashTrigger.ts, lib/errorReporting.ts, assert-build-target.mjs; two spelling locks retargeted (contentColumn, tasksViewport) | `pageBoundary.test.tsx` (15), `crashTriggerProd.test.ts` (1), `tests/e2e/pageBoundary.measure.ts` (4) | e2e case 1 red with the page boundaries removed: "Something went wrong", shell gone. The prod-bundle test was red with the MODE gate removed. |
| 2 | `2cac9fefa` | package.json/lock (@sentry/react 11.11.0), .env.development/.production/.example, vite.config.ts, main.tsx, lib/sentry.ts, lib/sentryScrub.ts, errorReporting.ts, firebase.ts, db.tsx | `sentryScrub.test.ts` (22), `sentry.test.ts` (11) | Scrubber made a no-op: 14 red. Sentry always enabled: 5 red. |
| 3 | `9004b5dbd` | csp.mjs, firebase.dev.json, firebase.json, legalCopy.ts, companyInfo.ts | `privacySentry.test.ts` (2) | — |
| 4 | skipped | — | — | — |
| 5 | (this commit) | e2e nav made line-independent, `tests/e2e/sentrySend.measure.ts`, this report, `.gitignore` (+ `.env.sentry-build-plugin`) | `sentrySend.measure.ts` (1) | — |

Baseline → final:
- tsc 0 → 0; functions tsc 0 → 0; `csp --check` 0 → 0.
- `npm run build` clean → clean. Modules 128 → 412, which is Sentry.
- `npm test`: 694 files / 10,460 passed / 3 skipped → 699 / 10,511 / 3.
- `npm run test:rules`: 214 → 214.

On dev, signed in as the e2e account:
- `pageBoundary.measure.ts` 4/4: Query Centre crash with sidebar and Contact list working; Try again on Contact list; feedback panel; top level.
- `sentrySend.measure.ts` 1/1: status 200, zero CSP violations.
- Screenshots are in this folder.

Cost: the public site's entry chunk grows from 62.5 to 98.3 KB gzipped.

## 6. Nick's Sentry checks and the alert

1. Open sentry.io and go to the `queryhawk` organisation, then the project.
2. **Issues** (left sidebar): set the environment filter (top bar) to **dev**. You should see several "Test crash for …" issues from 8 Nov, about 22:25–22:40 UTC: `queries`, `agents`, `panel:feedback` and `app`.
3. Open one. Check the tags `environment: dev` and `boundary: …`, the release `e733e8f4a`, and that **User** shows only an ID.
4. **Alerts.** Sentry has moved this area more than once, so it may be labelled "Alerts" or "Monitors" in the left sidebar.
   - Check whether "Send a notification for high priority issues" already exists. New projects usually get it.
   - If not: **Create Alert → Issues → "A new issue is created"**, all environments, action **"Send a notification to Member: you"** (email), then name it and **Save**.
5. Then mark the test issues **Resolved**.

## 7. Deferred, each with an owner

- **Phase 4, readable crash locations. Owner: Nick, then a short pass.** The token is absent.
  - One-line instruction: create an organisation auth token in Sentry (Settings → Auth Tokens), and save it in the repo root as `.env.sentry-build-plugin` containing `SENTRY_AUTH_TOKEN=<token>`. That file is now gitignored.
  - Then ask for Phase 4: `@sentry/vite-plugin`, org `queryhawk`, same `release`, `filesToDeleteAfterUpload`.
  - Today no `.map` file and no `sourceMappingURL` reach dev, because the build makes none.
- **Prod. Owner: Nick.**
  - `.env.production` carries the DSN, and `firebase.json` carries the Sentry origin (report-only).
  - Prod deploys from `release/live-1`, which has none of this until merged.
  - The prod hosting config's CSP must ship together with the bundle, or the prod policy will report the Sentry send.
- **Merging. Owner: Nick.** This pack is on `fix/crash-reporting-v1`, not on main.
- **The dev line will lose the headers and Sentry again on its next deploy. Owner: whoever deploys dev next.**
  - Any deploy not built on `dev/qc153-tl1-ww2-qc1531-qc1532-qc1533-crash1` drops both.
  - Those lines must merge `fix/crash-reporting-v1` (or main, once merged) first.
  - The merge has known conflicts, resolved once already in `e733e8f4a`: App.tsx, AppShell.tsx, ErrorBoundary.tsx, db.tsx imports, and TodoTray.tsx (deleted on that line).
- **Bundle size, +36 KB gzipped on the public site. Owner: Nick to decide.** Loading Sentry lazily on the landing pages would cut it, at the cost of missing errors in the first moments.
- **Error messages are not scrubbed for writer content beyond emails and URLs. Owner: a follow-up pass.**
  - A `JSON.parse` error can quote a snippet of what it was parsing.
  - No code path is known to parse a writer's text that way, but the policy says "never", so this deserves a scrub: e.g. drop text after a colon in SyntaxError values.
- **Shell chrome inside `AppShell` has no boundary of its own. Owner: follow-up if wanted.** This covers the mobile you-menu sheet, the bottom tab bar and the search palette. A crash there still reaches the top level.
- **Dev-line reds (`emuGuard`, `firestoreTarget`). Owner: the dev-line sessions.**
- **24 npm audit advisories, all pre-existing. Owner: the dependency-audit pack.** None are in Sentry's packages.
