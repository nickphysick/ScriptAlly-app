# Smart Import loader v2 — the report

20 October 2026 · branch `smart-import-loader-v2`, cut from `origin/main` at `de272e1a` · **pushed; deployed to dev** (function from the integration `…-hc1-sil2` at `45782f0c`, hosting now serving another session's integration that contains this branch — see below) · live run on dev: one 150-row import.

## False premises and deviations — read first

1. **Counting only query objects would have parked the bar at 0 for a third of the wait.** The model writes every *agent* first and every *query* after. On the dev fixtures the agents are **32–39% of the reply**, so a queries-only count sits at 0 for roughly the first 70 s of a 300-row read and then races at about 1.6× the true rate. Instead the counter counts objects at the top level of **both** arrays and reports `rows = ⌊(agents + queries) / 2⌋`. The prompt asks for one agent and one query per row, so this rises steadily from the first object and ends on the number of rows read.
2. **`httpsCallable(...).stream()` ignores the `timeout` option.** In firebase 12.14, `streamAtURL` passes only a `signal` to `fetch`, so the 310 s limit is now kept by an `AbortController` in `callWithProgress`.
3. **"Any reason other than a server error" can't be told apart in general.** When the fetch fails, the SDK says outright that it cannot distinguish a network failure from an unhandled server error. So the fallback fires only on the SDK's own failed-fetch error, `FunctionsError("internal", "internal")` with no details, **and** only when no chunk has arrived. Every error our function sends has its own message, so none can match.
4. **"Tidying" has no gap to show between the stream ending and the result arriving.** The server assembles the result before it sends it, so the result arrives with the end of the stream. The bar shows "Tidying records…" from that moment through the crystallise, and "Ready" once every card has resolved.
5. **The R1 lock that L5 says must stay green pinned two of the retired values.** `SCATTER_TIMINGS` held `SLOW_AT_MS` and `STATUS_INTERVAL_MS`, so R1's "spine" case changed by exactly those two keys, with a note. Its reveal-choreography case — the crystallise, tick and hand-off timings — is untouched and green.
6. **A read with no stream never reaches the reading phase.** That happens when the plain call is in use, or when a server deployed before this pack sends no counts. So:
   - the progress prop carries one field the brief didn't name, `stream: "live" | "none"`, which is what the clock-driven fallback bar reads;
   - the tips card counts a no-stream read as under way from the start, or the longest unexplained waits would get no card at all.
7. **"about 50 seconds left" never appears.** `fmtLeft` goes from "about 40 seconds" straight to "about a minute" at 45 s — the mock's own formula, built as written.
8. **Under reduced motion the tips' transition computes to 0.01 ms, not `none`.** The app has a global reduced-motion rule that sets every duration to 0.01 ms and wins over the card's own rule. L6 asserts "at most a millisecond".
9. **A real fault found by L2 on its first run, now fixed.** The shimmer and the fill were one reused `<i>` element. At the first row it dropped the shimmer class while still 100% wide, and the fill's width transition then **ran the bar backwards** to about 3% (measured 95.3% → 78.2%). The two are now separate elements (keyed apart).
10. **The design refs weren't in the repo, and the illustration was missing at first.** Both are now committed in `design-refs/onboarding/smart-import-loader-v2/` and enrolled in the design-ref hash manifest.
11. **Twelve worktrees existed besides the primary.** On your instruction I removed the five clean ones after backing up their 14 stray files to `~/ScriptAlly-backups/worktree-strays-2026-10-20/` (mode 700, because some are credentials). The seven with uncommitted work are untouched.

## Step 0

- **Quick-fixes on `origin/main`:** yes — server 300 s, browser 310 s, loader 315 s, `MAX_OUTPUT_TOKENS` 32,000, `messages.stream().finalMessage()`.
- **(a) The model's output:** `{"agents":[{"ref":"a1","name":"…","agency":"…"}],"queries":[{"agentRef":"a1","status":"Queried","sentDateRaw":"14/03/2024","timeline":[{"type":"…","rawDate":"…"}]}]}`, compact, agents first, empty fields left out. **No row index.** A query can contain nested objects (`timeline` entries), which the counter ignores.
- **(b) The row total:** the browser has the converted text before the call. `countDataRows` splits it at the `### Sheet:` headings; in each sheet, the first non-blank line is the header and every later non-blank line is a row ("blank" means only commas, quotes or whitespace). Details below.
- **(c) Streaming:** both available, as the pack assumes. Browser: `firebase@12.14.0` `httpsCallable(...).stream(data, { signal })`. Server: `firebase-functions@6.6.0` gives v2 `onCall` handlers `(request, response?)` with `request.acceptsStreaming` and `response.sendChunk()`. The props and the import flow were as the prompt describes.

## The phases

| Commit | Phase | Verified |
|---|---|---|
| `ef98d84d` | The design refs | Byte-identical copies, enrolled in the hash manifest |
| `ed24c9b3` | 1 · the server streams its row count | **landed (code + unit)**. Counter tests: chunks split at every position, braces and `\"` inside strings, nesting, empty arrays, truncation, a code fence, keys in either order. `mapSheet`: counts rise, the result is identical with or without the hook, the 250 ms throttle, the end-of-attempt report, the retry. The callable: `streamHooks` returns `{}` without streaming, so nothing changes. Each test was proved red by a mutation; one guard, the counter's depth check, is redundant and says so at the line. |
| `f55f0586` | 2 · the browser reads the stream | **landed (code + unit)**. `callWithProgress`: the same result, rows passed through, retry, quiet after 8 s, the 310 s abort, the fallback only in its one allowed case. `applyImportUpdate`: every branch. `countDataRows`: never undercounts a fixture. All proved red. |
| `88282bfd` | 3 · the foot bar | **landed (code + unit)**, then **measured** in Phase 5. Every branch of `fmtEst`, `fmtLeft`, the rung ladder, `stepRung`, `secondsLeft` and `footBar`; the rendered strip in every phase. Proved red. |
| `7eee05a5` | 4 · the "Did you know?" card | **landed (code + unit)**, then **measured** in Phase 5. The five tips word for word, the timings, starting at 1 / 5, the live region, the art constant, no way out. Proved red. |
| `568481d7` | 5 · the lab and the measurement | **landed (measured)**: `tests/e2e/importLoaderV2.measure.ts`, 10 tests at 1440×900 and 1280×800, all green. Every lock proved red by a named mutation (`mutation-proofs.txt`). |

Gates were green before every commit. At the last: both typechecks plus the eval's, a clean `build:dev`, and Vitest at **601 files, 8,983 passed**, 3 skipped (baseline 596 files, 8,922). The one recurring "error" is the vitest reporter timing out under load (`onTaskUpdate`), not a failed test.

**Measured (Phase 5, against the lab's simulated stream):**
- **L1:** "40 rows · about 30 seconds", "150 rows · about 2 minutes", "300 rows · about 3½ minutes" at both widths.
- **L2:** the fill rises with the rows and matches "Reading row d of N" exactly.
- **L3:** none of the retired words appears at any point in a whole read.
- **L4:** the card covers **11% / 15%** of the stage, is clear of the foot bar, and its tallest tip uses **96 of 118 px** at both widths.
- **L5:** tick at **2,550 ms** and hand-off at **3,549 ms** after the settle begins (the code says 2,540 and 3,540).
- **L6:** no shimmer, no fade, no auto-advance; Next tip still advances.

## The row total, and how far "row d" can be from the file's real rows

`countDataRows` is exact on **38 of 54** fixtures and **never undercounts any** (a lock holds that). It overcounts by every non-blank line that isn't data:
- a title above the header, a duplicate header, a totals line, a "TBC" placeholder: **+1 or +2 per file**, which is +20% at 10 rows and **+4.7%** on the messy 150-row file;
- the colour fixtures' legend rows;
- **one row per event** (`events-*`, +70–110%). There the model also writes one row per line today, so the count matches what it actually reads.

**"Row d" is the server's half-count of completed objects.** It is exact at each completed row pair, but within a row it moves in steps of half an object, rounded down. The text holds d at N, and the fill never reaches 96% before the result (see *Can the count overshoot the total?* below), so an overcounted N just skips the last few percent when tidying fills it to 100%. If the model drops or merges rows (seen on messy 150-row files), d ends below N and tidying fills the rest.

## The fallback, and why it can't charge the writer twice

The browser falls back to the plain call **only** when the stream failed with the SDK's own failed-fetch error **and** no chunk had arrived.
- **The import is charged only after a whole reply has been parsed** (`consume()` after `mapSheet` returns). That is seconds to minutes after the server would have sent its first chunk (time to first token about 1 s), so "no chunk yet" means the first request had not been charged.
- **If the first request did reach the server and finishes anyway,** the charge is a field set to the same value either way (`smartImportFreeUsed: true`, or this month's `smartImportLastUsedMonth`). Two runs still record **one** import.
- **What the fallback can cost is a second model call,** on our bill rather than the writer's.
- **A server error never triggers it.** That covers the allowance errors, "malformed" and "Couldn't read…", and any error once a chunk has arrived. Tests cover each case.

## The live run on dev — 150 rows

**Done on 20 Oct, after the deploy.** The `smartImportMap` function was deployed first, from the dev integration `…-hc1-sil2` (`45782f0c`); hosting followed (`index-DYoj0VDD.js`). One real import of `tests/fixtures/smart-eval/size-csv-150.csv` ran through the `/import` page as the Pro fixture account `ms21-filled`, stopping at the overview, so nothing was imported. The browser recorded every streamed chunk and every change to the bar on one clock. Raw record: `live-dev-150.json` (152 count messages, 166 bar states).

| | |
|---|---|
| First chunk | **3.20 s** after Read (counter 0) |
| First counted row | 4.14 s |
| Pace | median 0.57 s between counts, longest gap 1.21 s; 11 rows by 10 s, 49 by 30 s, 102 by 60 s |
| Last count | **150** at 90.72 s, against `rowsTotal` **150**: exact, and rising every time |
| Result | 90.84 s; Tidying at 90.85 s; Ready at 91.92 s; overview at 93.9 s |
| "Reading row d of N" ahead of the stream | **never** (each sample's d against the last count received before it) |
| Fill ahead of `2 + d/N × 94` | **never**; 100% first appears at Tidying, after the result |

**Two things the run showed that the lab could not.**
- **The time left runs early and flickers.** It ends early, as the estimate was designed to: "a few seconds left" with 10 s to go, "about 10 seconds" with 14 s to go. But at each boundary the label flips between neighbouring values every 0.1–0.5 s: 1½ ↔ 2 minutes from 9–17 s, a minute ↔ 40 seconds at 39 s, 40 ↔ 30 seconds at 51 s, 30 ↔ 20 seconds at 65 s. It also climbs to "about 2½ minutes" at row 6 (7.1 s), where the estimate hands over to the observed pace, because that pace still includes the 3.2 s spent opening. `stepRung` stops jumps but has no hysteresis. **Not fixed — it wasn't asked for.** A proposed fix: only move a rung once the target has stayed on the new side for about 2 s, and work out the pace from the first count rather than from Read.
- **For one frame (1.07 s) the right-hand text read "0 rows · a few seconds"**, before the `start` update carried the total. It is cosmetic and also not fixed.

**The first attempt measured the wrong build, and spent the allowance.** Between my hosting deploy and the run, another session deployed its own integration (`…-hc1-wf1`, `index-CFqysGNF.js`), which does not contain this branch. The browser therefore loaded the old loader, which gave up at 30 s and showed the fallback, while the server finished and **consumed the account's allowance anyway**: the quick-fixes gap, live. The entitlement doc was deleted afterwards (`firebase firestore:delete`, dev only), which puts the account back as it was. The run was then repeated once that session deployed `…-hc1-sil2-wf1` (`index-8VnU8F6o.js`), which contains this branch, and the driver now refuses to start unless dev serves the bundle it expects. **The function measured is the one deployed from `45782f0c`; the hosting measured is `index-8VnU8F6o.js`.**

## Can the count overshoot the total? Yes — fixed

The counter is half the records the model has written (`(agents + queries) / 2`). `rowsTotal` is `countDataRows`, which skips blank rows and sheet headings. **Nothing ties the two together.** `countDataRows` never undercounts the fixtures (above), so overshoot needs the model to write more than one agent and one query for a row: a row naming two agents, a row the model splits into several queries, or an invented record. In 133 eval runs the queries written never exceeded the sheet's lines (the "events" layout writes up to 21 queries for 10 expected, inside a 30-line sheet), but agent counts were not recorded, so that is no proof.

**Before the fix:** the client capped the count at N. From the moment it reached N, the bar showed "Reading row N of N", a 96% fill and "a few seconds left" (`secondsLeft = 0 × pace + 1`), and held them for as long as the model kept writing.

**The fix (`importEstimate.ts`):**
- The count is kept raw.
- The fill's span is `max(N, count + 1)`, so while the stream runs the fraction is always below one. Below N it is exactly d / N, unchanged. At N and past it, it keeps creeping towards 96% and never reaches it.
- **100% is the result's alone** (Tidying), which is the end of the stream.
- From N on, the right-hand text says "almost there", a string already in use, instead of a countdown that has nothing left to count.
- The text holds at "Reading row N of N".

The new unit case was proved red against the old scaling. L2's expected fill moved with it: at d = 40 of 40 the reading fill is now 2 + 40/41 × 94 ≈ 93.7, not 96. L1–L6 pass (9 of 9) against a local dev build, and L2 is still red under its `fill-backwards` mutation.

**Dev does not have this fix yet.** Dev's hosting is now another session's integration, and redeploying over it mid-session would race that session. It needs a fresh integration with this commit when that session is done.

## Deploy order

**Hosting first still holds, on one condition.** The new browser code always calls the function streamed.
- **Against the function deployed now,** that only works if the function supports streaming callables. `smartImportMap` is a v2 callable, and firebase-functions has supported streaming for v2 since 6.2; the lockfile has pinned 6.6.0 since 12 June 2026 (`d9586c86`). **If the deployed `smartImportMap` was deployed after that date, hosting first is safe.** It gets no counts, so after 8 s the loader runs on the clock, and the result is unchanged.
- **If it was deployed before then, deploy functions first.** The new function sends nothing extra to a browser that isn't streaming (`streamHooks` returns `{}`), so it is safe ahead of the new hosting.
- **The quick-fixes reasoning still applies** if that pack isn't deployed yet: the old browser's 30 s loader against a 300 s server is the window to avoid.

## The placeholder illustration

`public/images/import/tip-hawk.png` is the design ref's placeholder, reached through **one constant, `IMPORT_TIP_ART`** in `src/lib/importTips.ts`, which is marked as a placeholder in a comment. **It is now 336 × 336 RGBA, 136,751 bytes** (it was 1200 × 1200 and 1,304,075 bytes): twice the 168 px slot. The design ref keeps the full-size original. Swapping in the real artwork is that file and that one constant.

## Not done

- The time-left flicker and the one-frame "0 rows" above: both found live, proposed, not built.
- The overshoot fix is not on dev yet.
- `p1-before.json`, a before-capture from the onboarding v5 e2e suite, still holds the old strip's HTML. It is a historical capture, so I left it alone.

## The worktree

Removed after this report, with its preview server stopped and its launch entry deleted. The branch `smart-import-loader-v2` is kept locally. The copied e2e credentials (`.env.local` with the harness password, `tests/e2e/.auth/state.json`) went with the worktree.
