# Emulator log diagnosis: one run, 6 Nov 23:18 (Nick's request via the disk-guard session)

**Run:** `EMU_DEBUG_LOG=<scratch> npm run e2e:emu -- tests/e2e/qc1522.measure.ts --project=measure --workers=1`. Free space was 47.2 GB before.
**Result:** the guard killed the run at about 2 min, when firebase-debug.log reached 229 MB (firestore-debug.log was 111 MB). Setup, L1 and L2 at 1280 were green before the kill.

| What | Count |
|---|---|
| `checkCommit` lines | 0 |
| `PERMISSION_DENIED` lines | 0 |
| "too many pending messagings in the back channel (10001)" + "abort the channel" + "NETWORK_ERROR" blocks (`FirestoreListenHandler onError`) | 207,974 |
| Connection lines (HTTP/1, HTTP/2, channel closed) | ~240 |

- **The pending count is pinned at exactly 10001 in every block.** So it is a Listen channel whose client has stopped reading; every further message to it is refused and logged.
- **No document path is logged at this level**, so the requested top 10 by path cannot be built from this log.
- **Timing:** about 54k blocks at 23:19:43–44 and about 150k at 23:19:59–20:04. Both bursts fall at the start of a test (L1, then L2): the beforeEach seed (`seedQc152.mjs`) plus a fresh page.

**Classification:**
- (a) expected denials in a rules test: none.
- (b) harness: most likely. A closed or stale page's Listen channel is still open on the emulator and receives every change the next test makes.
- (c) an app loop feeding a stalled channel: not ruled out, because ~200k messages in ~7 s is far more than the seeder's few hundred writes.

Nothing was fixed. Separating (b) from (c) needs one more run with request-level evidence (commit counts per document from the emulator's REST API).

## Follow-up (Nick, 7 Nov): Listen opens, counted from the browser

The recorder is `tests/e2e/listenTally.ts`. It counts Listen opens (a POST to the Listen channel with no SID), targets added and removed by path, long-poll reads, and commits.

**1. Harness-free: the Query Centre loaded once, then 60 s idle** (`listenCount.measure.ts`, `listen-idle.json`). **Flat.**
- 3 opens: two are the harness loading the page twice to sign in, one is the page.
- 23 targets: the 14 `db.tsx` listeners, the user and entitlement documents, and `test/connection`. 5 removes.
- 0 commits.
- Identical at every 10-second sample. **No app loop while idle.**

**2. The v152.2 suite, once** (`LISTEN_OUT`, `listen-suite.jsonl`, one line per test). **35/35 passed.** Totals: 135 opens, 1,534 targets added, 585 removed, 127 long-poll reads, 59 commits.

Within each test:
- 3 to 8 opens, one per page load (the sign-in double load, plus each `open()`).
- Nothing grows inside a test.
- Every card's listeners are removed when the card closes.
- Commits happen only in the tests that save something (L10, L13, L14, L15, L17).

Top targets, and what opens them:

| Targets | Path | Opened by |
|---|---|---|
| 168 | `doc:users/*` | the user listener (`db.tsx` ~723), opened on every page load |
| 139 | `doc:users/*/queries/*` | `Queries.tsx` ~2083 (the selected query), plus the one-shot `getDoc`s of `takeSnapshot` before a save |
| 133 | `users/*/queries/*/activity` | `Queries.tsx` ~2112 (the selected query's activity), opened per card |
| 101 | `doc:test/*` | `db.tsx:153` `getDocFromServer(test/connection)`, once per page load |
| 72 / 44 | `doc:users/*/activities/*` / `agents/*` | one-shot `getDoc` reads (`takeSnapshot`, `deleteActivity` and similar) |
| 69, 62, 48, 45, 42, 42 | `activities`, `private/*`, `manuscripts`, `versions`, `attachments`, `packages` | the `db.tsx` listeners, once per page load |

**The tell is on the server side.** The seed that runs before each test took **1.1 s at the first test and 96.5 s at the last**, rising steadily. The browser side of each test stays the same size, so the emulator's work is growing with the number of tests already run. That fits the emulator keeping every finished test's Listen channels open, about 130 by the end, after Playwright closed their pages. Every write in the next seed is then fanned out to all of them. Each channel fills to 10,001 pending messages, and every message after that is refused and logged three times: the 208k-block flood in the first diagnostic run.

**Classification: (b) harness.** No app loop was seen, idle or inside a test, and there were no rules denials. Nothing was fixed.
