# Smart Import quick fixes v1 — the report

20 October 2026 · branch `smart-import-quickfixes` (worktree `../ScriptAlly-smart-eval`), cut from `origin/main` at `a2272486` · six commits · **not pushed, nothing deployed** · spend **$2.90 of $4**.

## False premises — read first

1. **The writer's real time limit was 30 seconds, and it was not one of the four limits in the brief.** The reading screen's loader (`ScatterSettleLoader.tsx`, `TIMEOUT_MS = 30000`) sent the writer to the fallback screen after 30 s, whatever the server or the browser was still doing. Five of 34 baseline calls took longer than that, including two 50-row files. Worse, the server carried on, finished and **used up the writer's import** while the screen said *"We couldn't read that one … Nothing has been saved."* With your ruling it is now 315 s, and nothing else in that file changed.
2. **The `ignore` entry `eval/**` matches nothing.** The Firebase CLI tests each pattern against the *absolute* path using `matchBase`, and `matchBase` only applies to patterns without a slash. Run through the CLI's own file walker, `eval/**` left all 11 harness files in the upload; the bare name `eval` removes them and nothing else.
3. **`firebase.json` had no ignore list, and setting one replaces the CLI's default.** That default is `["node_modules", ".git"]` (`prepareFunctionsUpload.js:78`, firebase-tools 15.19.1). Adding only the new entry would have started uploading `functions/node_modules`, so both defaults are restated.
4. **`firebase.dev.json` has no `functions` block at all.** No functions deploy reads it, so it is untouched; adding a block would have been more than one ignore entry.
5. **`origin/main` had moved by one commit**, so Phase 0 stopped as instructed. You ruled a merge (`a2272486`), which was then pushed.
6. **Three of the four UTF-8 tests cannot be red against the old reader.** The BOM, Windows-1252 and xlsx cases check behaviour the old reader already had right. Instead they were proved by breaking the new reader: non-strict decoding turns the Windows-1252 case red, keeping the BOM turns the BOM case red. The binary-file check can't be seen by any test at all, since no real workbook is valid UTF-8 (0 of 26 fixtures). It says so in a comment at the value.
7. **Writers never see the "Too many rows" wording.** The browser refuses an oversized file before calling the server, and every refusal lands on one generic dead-end card (below).
8. **The row cap counts text lines, not data rows** — that is how the check has always worked. It is set to 300 rows plus the header line: 301.
9. **A new test reading the cap from `functions/` broke the root typecheck.** Importing `functions/src/smartImportCore.ts` from a root test pulls it into the root project, which has `strictNullChecks` off, and there TypeScript cannot narrow the core's boolean-tagged union. The test reads the constant from the source text instead.

## Phase 0 — landed

`origin/main` had one new commit (`769e5dd1`, CLAUDE.md only), so Phase 0 stopped. On your ruling I merged it into `smart-import-eval` as `a2272486` (CLAUDE.md only; the code is the same as the last commit that passed every gate) and pushed `smart-import-eval:main`. `origin/main` is now `a2272486`. This pack ran on the new branch `smart-import-quickfixes`, with its upstream unset so a bare `git push` can't send it to `main`.

## What each phase landed

| Commit | What | Verified |
|---|---|---|
| `f2a7073c` 1/4 | `firebase.json` functions `ignore: ["node_modules", ".git", "eval"]` | **measured** with the CLI's own walker (eval 11 → 0 files, every other file unchanged) + a lock: the exact list, and no entry containing a slash |
| `a1e2524e` 2a | Timeouts and output ceiling; `mapSheet` streams | **code + unit**: locks on timeout order and callable options; streaming required; truncation behaviour unchanged |
| `f24db373` 2b | 200- and 250-row fixtures, pinned to dev; 301-line cap; time to first token recorded | **measured** (size sweep) + locks: cap identical on both sides; existing fixtures keep their split |
| `e7e2d894` 3/4 | UTF-8 CSV with no BOM | **code + unit** (proved red, see premise 6) + **measured** before/after |
| `22be062f` 4/4 | Full dev run, sequential; the harness's timeout line corrected | **measured** |

Gates were green before every commit. At the last: both typechecks plus the eval's own, a clean `build:dev`, and Vitest at 596 files, **8,922 passed**, 3 skipped (baseline: 593 files, 8,902).

## Phase 2 — the limits and the size table

| Limit | Before | After |
|---|---|---|
| `smartImportMap` `timeoutSeconds` | 90 | **300** |
| Browser callable timeout (`httpsCallable` default) | 70 s | **310 s** (`SMART_IMPORT_CALL_TIMEOUT_MS`) |
| Reading-screen loader `TIMEOUT_MS` *(not in the brief)* | 30 s | **315 s** |
| `MAX_OUTPUT_TOKENS` | 12,000 | **32,000** |
| Size cap (text lines), client and server | 600 | **301** |

The order is server < browser < loader, so the server always gives up first and the writer sees its error; a lock reads all three values. The installed SDK (`@anthropic-ai/sdk` 0.39) **refuses** a non-streaming request above about 21,333 output tokens (`3600 × max_tokens / 128000 > 600 s`). So `mapSheet` now calls `messages.stream(...).finalMessage()`, which returns the same Message object as before; parsing, the single strict retry and every failure path are unchanged. A lock checks that the real SDK would refuse the 32k ceiling without streaming.

**Size table** — clean CSV, one call at a time:

| Rows | Lines | Total (sweep / dev run) | First token | Output tokens | Accuracy | Result |
|---|---|---|---|---|---|---|
| 150 | 151 | 89.6 s / 88.4 s | 1.2 s | 7,538 | 100% | ✓ |
| 150 messy (`kitchen-csv-150`) | 181 | 105.2 s / 103.4 s | 1.0 s | ~7,800 | 95.8%, then 99.7% and 99.6% on re-runs | ✗ on model variance |
| 200 | 201 | 116.7 s / 116.7 s | 1.2 s | 9,933 | 100% | ✓ |
| 250 | 251 | 149.3 s / 148.3 s | 1.1 s | 12,628 | 100% | ✓ |
| 300 | 301 | 181.1 s / 179.9 s | 1.3 s | 15,034 | 100% | ✓ (truncated in the baseline) |

The sweep runs predate first-token recording, so the first-token column comes from the sequential dev run.

**Row cap: 300 rows (301 lines).** It is the largest size measured, and it finished in 181 s, inside the 240 s target, with no truncation. I didn't measure past 300, so 300 is what the rule allows. **What to watch:** messy files produce more output per row. `kitchen-xlsx-50` ran 48% over the clean fit, so a 300-row file that messy would take about 268 s — under the 300 s limit, but past 240. That is the number to size the chunking pack from.

**What the writer sees above the cap.** The browser refuses the file before calling the server, so nothing is spent, and shows the generic dead-end card. Chip: **"File couldn't be read"**. Title: **"We couldn't read that one."** Text: **"Use the template, or add your agents by hand. Nothing has been saved."** It states no number, so it is unchanged, as the brief asked. But it is misleading for a file that is merely long. The server's own message, *"Too many rows — split the file or use the Import desk."*, also states no number and never reaches the writer.

## Timing model

Fitted by ordinary least squares on **43 calls made one at a time**: this pack's dev run plus the size sweep. Baseline calls ran four at a time, so they were excluded.

- **Total time = 0.5 s start-up + 0.60 s per row** (R² 0.993).
- Fitted on output tokens instead: **12.1 ms per output token** (R² 0.996), about 83 tokens a second.
- **Time to first token is flat:** median 1.1 s (range 0.6–4.9 s) at every size. Almost the whole wait is the model writing its answer.

How far each fixture landed from the fit:
- Every clean file from 150 to 300 rows: within ±3%.
- At 10 and 50 rows: −23% to +20%, which is ±1–6 s.
- Messy files run over: `kitchen-csv-150` +14% and +16%, `kitchen-xlsx-50` +48%, `tabsrej-xlsx-10` +50% (+3.2 s), `events-csv-10` +57% (+3.7 s; it writes twice the output for its row count).
- Predicted: 100 rows 61 s · 150 → 91 s · 200 → 121 s · 250 → 151 s · 300 → 181 s · 400 → 241 s · 500 → 301 s.

Because output length drives the time, the per-row figure is really a per-output-token figure, and messier rows cost more.

## The loader's "taking longer" state

From 10 s until the data arrives the status line reads one fixed string: **"Larger import — almost there…"**.
- **The progress bar** eases to **78% within about 6 s and stays there**.
- **The count beside it reads "0 / 8".** The total is the 8-row display sample, whatever the file's size.

How long that state lasts, from the measured totals:

| Rows | "Larger import — almost there…" shown for |
|---|---|
| 150 | ~78 s (messy: ~93 s) |
| 200 | ~107 s |
| 250 | ~138 s |
| 300 | ~170 s |

Nearly three minutes of "almost there" over a bar stuck at 78% and a count of 0 / 8 does not describe the wait. **A redesign looks warranted for waits of two minutes or more.** Streaming is available on the installed versions (below), so the screen could show real progress from about one second in, since the first token arrives that early.

## Streaming from the callable to the browser — supported

- **Browser:** `firebase@12.14.0` (`@firebase/functions` 0.13.5) has `httpsCallable(...).stream(data, { signal })`. It returns `{ stream: AsyncIterable, data: Promise }`.
- **Server:** `firebase-functions@6.6.0` gives `onCall` handlers `request.acceptsStreaming` and `response.sendChunk(chunk)`, which does nothing when the client is not streaming.
- `mapSheet` already streams from the model. Forwarding progress (for example, a running count of rows mapped) is a change to the callable and the loader; nothing on the platform blocks it.

## Other ways the import is spent while the writer sees a failure

The server records the import as used (`consume()`) whenever the model's reply parses — before the browser has received anything.
- **Browser timing out first:** closed by this pack. The server (300 s) now gives up before the browser (310 s) and the loader (315 s), and a server killed at its timeout never reaches `consume()`. A tiny window remains: a mapping finishing in the last moment before 300 s is recorded and then the reply is lost.
- **Tab closed, page reloaded or navigated away during the read:** the server finishes and the import is spent; the result is lost.
- **Network drop mid-call:** the browser rejects, the writer is sent to the fallback screen, and the server may still finish and spend.
- **Empty mapping:** `consume()` runs on any reply that parses, including one with **no queries** (for example, a workbook whose data the model couldn't find). The writer is charged for nothing.
- **Leaving after the result arrives** (abandoning the review, or a reload before committing): spent and not imported. A *commit* failure is not in this list: the result is kept in memory and "Try again" commits again without calling the server.

**Proposed fix (not built):** make the callable **idempotent per file**.
- On a successful mapping, store `{ sheetHash, result, at }` in the admin-only `users/{uid}/private/smartImportLast`.
- A later call whose sheet hash matches within, say, 7 days returns the stored result **without calling the model and without recording another import**.
- Re-uploading the same file then recovers every path above at no cost to the writer. A 300-row result is roughly 60–100 KB, well inside Firestore's 1 MiB document limit.
- Add one more condition: **don't record the import when the assembled result has zero queries.**
- Optionally, keep the result in `sessionStorage` keyed by file hash, so a reload in the middle of review resumes.
- This stores a copy of the writer's mapped data on the server; it is their own data, behind the same admin-only path as the import allowance.

## UTF-8

`readSheetBook` decodes text bytes strictly as UTF-8 and hands SheetJS the text; the decoder strips any BOM. Bytes that aren't valid UTF-8 — a genuine Windows-1252 file — read exactly as before, and binary workbooks are never decoded as text. No other encoding is ever guessed. Both Smart Import and the template import read files this way, and the template import's tests stayed green.

| Live | Field accuracy | Exact agent names | Exact agencies |
|---|---|---|---|
| `utf8-nobom-csv-10` before → after | 97.1% → **100%** | 8/10 → **10/10** | 10/10 → 10/10 |
| `utf8-nobom-csv-50` before → after | 91.7% → **100%** | 48/50 → **50/50** | 23/50 → **50/50** |

**The before figures understate the harm.** The model "repaired" some of the garbled text and guessed wrong letters: `Øvergaard` became **`Övergaard`**, and `Mëller Partners` became **`Müller Partners`**, a different agency that sounds right. Names that look plausible and are wrong are worse than visibly garbled ones, because a writer won't catch them on review.

**Phase 4's free check:** exactly four existing fixtures' converted text changed. They are the four existing CSVs that contain non-ASCII bytes (`preamble-csv-10`'s dash, `emoji-csv-10`, `kitchen-csv-50`, `kitchen-csv-150`), and they were being decoded wrongly before. No ASCII CSV and no xlsx changed. The tabs, merged-cell and link fixes from the evaluation pack change nothing further.

## Full dev before and after

On the same 34 fixtures, each judged by whether the baseline expected it to fail:

| | Baseline (eval pack) | After this pack |
|---|---|---|
| Expected to pass (22) | 99.5% · 21/22 passed | 99.2% · 21/22 *(the `kitchen-csv-150` draw; its re-runs scored 99.7% and 99.6%)* |
| Expected to fail (12) | 39.5% · 0/12 | **96.2% · 4/12** (`size-csv-300`, tabs, merged, links) |
| All 34 | 74.1% · 21/34 · $1.34 | **97.9% · 25/34 · $1.21** |
| New fixtures (4) | — | 100% · 4/4 |

Calls over the callable's limit: 2 of 34 at the old 90 s; **0 of 38** at the new 300 s (the slowest was 180 s). The per-fixture before/after table is in `reports/smart-import-eval/2026-10-20T08-22-24-quickfixes-dev-rescored/`. That folder is a free re-score of the run, made only to correct the timeout line; the scores are unchanged.

## Spend

| Run | Spend |
|---|---|
| Size sweep | $0.89 |
| UTF-8 before and after | $0.12 |
| Full dev run | $1.64 |
| `kitchen-csv-150` × 2 variance check | $0.26 |
| **Total** | **$2.90 of $4** |

## What needs deploying — hosting first, then functions

**Order matters, and it is the reverse of the usual "function first".**
- **If functions go first**, the server allows 300 s while the deployed browser still gives up at 70 s and the loader at 30 s. Calls between 70 and 300 s then *complete and record the import* while the writer is told they failed, which widens the very fault this pack closes.
- **If hosting goes first**, the browser and loader wait up to 315 s while the old server still stops at 90 s. A long import then fails honestly at 90 s with nothing spent. The browser's 301-line cap is stricter than the old server's 600, so that is safe too.

1. **Hosting** (dev, then prod): the browser's 310 s callable timeout, the 315 s loader limit, the 301-line cap and the UTF-8 reader.
2. **Functions** (`smartImportMap`): 300 s timeout, 301-line cap, streaming at 32k, and `firebase.json`'s new `ignore` list (which only affects function uploads). Reminder from CLAUDE.md: a prod functions deploy needs `functions/.env.gen-lang-client-0801391782` in place first.

## Deferred — named for the next prompt

- **Chunking:** clean files reach about 241 s at 400 rows and messy files about 268 s at 300 (timing model above).
- **The loader redesign** for long waits, now that streaming is confirmed available.
- **The idempotent-per-file callable**, and not recording an import on an empty result (proposal above).
- **A specific "too long" message** in place of "We couldn't read that one."
- **Model variance on rows with no agent name** in long, messy sheets (prompt work).
- **Holdout:** not run.

## The worktree

`../ScriptAlly-smart-eval` is kept, on branch `smart-import-quickfixes`, because the branch is not pushed: it waits on your review, and CLAUDE.md's rule is to remove a worktree once its branch is pushed. Its `.env.local` holds your Anthropic key, so removing the worktree removes the key with it. Say when, and I'll push the branch if asked and then remove the worktree.
