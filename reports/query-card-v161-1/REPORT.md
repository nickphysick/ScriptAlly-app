# Query card v161.1 — a bump the writer can see

Branch `query-card-v161-1`, cut from dev's `dev/tct1-sv1-qc161` @ 003562e45 and pushed. Reference:
`design-refs/query-card-v161-1/query-card-v161-1.html` (SHA256 f15df39b…7e15, as given).

Dev serves **`index-T_4oCLGT.js`**, built from **`dev/cf11-qc1611`** @ 349069afe and pushed. By the time of the deploy, dev
had moved to `consistency-fixes-v1-1` (`index-CA74s48S.js`). That branch is cut from the same 003562e45, so v161.1 was
merged into it as a new branch with no conflicts. The served hash was checked against the build.

Nothing is merged to `main`, and prod is untouched. No API call or eval was run.

## What changed

The card's frame now answers the press, instead of moving a second later.

- **At the press:** pointerdown on any of these buttons eases the frame's `scale` from 1 to 0.985 over 120ms (ease-out)
  and holds it there:
  - a save's primary button;
  - "Do it later";
  - a step's Delete;
  - the toast's Undo.

  The press uses `fill: forwards`, so the compositor keeps it in place while the page is busy.
- **When the save lands:** at v161's release, the frame pops from 0.985 up to 1.035 at 40% and back to 1, over 520ms,
  with `cubic-bezier(.2, .8, .2, 1)`. This replaces v160's 1 → 1.022 → 1 bump. Nothing else at the landing changes.
- **When nothing lands:** the frame eases back to 1 over 150ms, with no pop. This happens in three cases:
  - the page withdraws the motion (a refused undo, a failed save);
  - a finished save draws nothing for 1.5s;
  - the press's own 4s net runs out.
- **Never:** two presses never stack, nothing runs under reduced motion, and nothing runs without a frame. Only
  `scale` is animated, through the Web Animations API. `transform` is never set.

**When the save runs.** The click confirms the press and runs the save straight away. Step 0.4 shows why that's
enough: at CPU 4× the save's long task starts 683ms after the press, with 35 frames painted before it. Undo is
different. Its click re-renders the page in the same task (137ms at 4×, read with the Event Timing API), so Undo waits
two painted frames first, and never more than 50ms.

**No pointer.** A pointerdown with no click eases back after 700ms. A keyboard press presses in at the click.

**Files:**
- `qcMotion160.ts`: `PRESS`, `pressIn`, `pressBack`, `pressAtPointer`, `pressThen`, and the pop in `bump`.
- `QcComposer1522.tsx`: primary and later buttons.
- `QcStepEdit1522.tsx`: `delete-ok`.
- `QcCard152.tsx`: Undo, and the effect that eases back.
- `Queries.tsx`: a refused undo withdraws the motion.

## Step 0.4 — the base at CPU 4×

`step0-4.json`:
- The press's own click task is 59ms.
- The first painted frame comes 57ms after the press.
- The save's long task starts at +683ms and lasts 1201ms.
- 35 frames are painted between the press and the freeze.

So the press has time to show before the freeze. What was missing was something to show.

## The locks

All measured at CPU 4× unless the lock says otherwise.

| Lock | Reads | Branch alone | Mutant (red) |
|---|---|---|---|
| QC1611-1 | press → scale below 1 on a painted frame within 100ms | **35ms** | A: press-in a no-op → none |
| QC1611-2 | held at 0.985 through the save's long task | 69 frames at 0.985; long task 1288ms | B: no `fill: forwards` → frames at 1 |
| QC1611-3 | pop peak 1.03–1.04, 24+ frames, ends at 1 | 1.03499 · 31 frames · 1 | C: peak 1.022 → 1.02199 |
| QC1611-4 | six actions and each one's undo: press-in and pop | 21–47ms; peak 1.03499; 26–32 frames; ends 1 | D: reply-only → every other press-in missing |
| QC1611-5 | a refused save and a never-answered save: back at 1 within 4.2s, no pop | 4185ms / 4188ms | D: net 600s → still 0.985 at 4.2s |
| QC1611-6 | CPU 1×: the save's first request within 50ms of the click | **37ms** | A: a 300ms wait → 341ms |
| QC1611-7 | rotate, translate, transform and box unchanged; no bump on a tab, a note or the drawer | box 932,100,540,700 unchanged | C: a `transform` press → matrix(…) |
| QC1611-8 | reduced motion: no scale animation, scale stays 1 | green | B: no reduced guard → `qc1611-press` runs |

QC1611-4's six actions are: mark the partial sent, log a nudge, record a response, close the query, decline the
offer, delete a step.

Ledgers: `ledger/after-*.json` and `ledger/mutant-*.json`. One exception: QC1611-3's mutant row is in build C's log
only, because QC1611-1's `done` threw first in the same test, so no ledger was written for it. Every mutation build
was restored afterwards, and `git diff -- src` was empty against the commit.

**Source locks** (`qcv160.test.ts`, 22 pass):
- the press's values;
- the pop starting from the press;
- `fill: forwards`;
- the reduced guard;
- every button that's wired.

## Phase 2 — the sweep

- **v160's locks** (`qc160.measure.ts`): each scale animation on the frame is now named by its id.
  - **Was:** "exactly one, 500ms, peak 1.02–1.025".
  - **Now:** at most one press, exactly one pop (520ms, peak 1.035), and nothing else scaling the frame. This applies
    to `bumpReads`, QC160-4, -11 and -13.
  - All 13 of v160's tests are green.
- **v161's locks:** QC161-6/7 already pick out the pop by its id, and stay green unchanged.
- **QC161-11 (a gap in the harness, not in v161.1).** It was red in a combined run:
  - **Cause:** `seedQc152.mjs` removed feed rows only when their id started with `q152-`. Rows the app writes have
    auto ids, so a row left by a v160 spec survived every reseed.
  - **v161's stored baseline:** it was recorded under the same gap, so each answer's stored feed also carried the
    earlier answers' rows.
  - **The wipe now** also removes feed rows that name a seed query.
  - **The lock now** removes the previous answer's new rows from the baseline, once each, and writes both sides out
    when they differ.
  - **Result:** run alone and after v160, every answer stores exactly the baseline's write. v161.1 changes no write.
- **`qcMotion160.ts` header:** it's an `@license` block, so it ships in the bundle. It now describes the press and the
  pop.
- The sweep's re-run ledgers are kept in `sweep/`, so v160's and v161's own records stay as they were.

## Gates

| | Baseline (v161 tip) | v161.1 | Merged (`dev/cf11-qc1611`) |
|---|---|---|---|
| tsc | 0 | 0 | 0 |
| Vitest | 12925 passed, 2 failed | 12928 passed, the same 2 failed | 12928 passed, the same 2 failed |
| build (prod) | clean | clean | — |
| build (development) | clean | clean | clean |

The 2 Vitest failures are the `firestoreTarget` ones: 23 `tests/e2e/cl25*` scripts, failing since 18 Nov. Neither
names a file touched here.

## The merged tree under load — read this before trusting a frame count

On the merged tree, QC1611-1 and QC1611-7 are green.

QC1611-4 is red on frame counts only:
- every press-in is 27–43ms;
- every pop peaks at 1.035 and ends at 1;
- but four undo pops painted 18–23 frames, against 24 required.

During those runs the machine was at load 6–8, from other sessions' node/esbuild and Zwift, on top of the lock's own
4× throttle.

The control was the branch tip, with no merge, run straight afterwards under the same load. It did worse:
- two undo pops fell outside the trace's 4.5s window;
- one ended mid-pop because the trace closed during a freeze;
- the rest painted 22–23 frames.

So the frame shortfall comes from the machine, not from the merge. Both runs are in `merged/`. A QC1611-4 run on a
quiet machine is still owed.

## Frames (`frames/`, QC1611-F)

These come from CDP's screencast, which captures the compositor's own frames. The table gives the moment wanted and
when the nearest frame was actually taken (the index is `frames/index.json`).

| | press (+70ms) | mid-freeze | pop's peak | at rest |
|---|---|---|---|---|
| CPU 1× | +69ms, 0.989 | wanted +812, got +585 (0.985) | +1702ms, 1.031 | +2069ms, 1 |
| CPU 4× | +67ms, 0.989 | wanted +1431, got +2200 (0.985) | +3333ms, 1.035 | +3717ms, 1 |

The screencast sent **no frame during either long task** (1×: 388ms; 4×: 1361ms). The press is finished and held, so
nothing on screen changes and the compositor has nothing new to send. The "mid-freeze" picture is therefore the
nearest frame on either side of the freeze, both at 0.985. "At rest" is the last frame before the trace stopped, about
360ms after the pop.

## False premises and limits

- **Playwright's `click()` is not a press.** It sends pointerdown, up and click in one task, which no hand can, so the
  page's 137ms of Undo listeners ran before the press could paint. The locks press the way a person does: hover,
  down, 90ms, up. The press starts at pointerdown.
- **QC1611-6 is measured from the click,** not the pointerdown. The click is when the save is asked for.
- **QC1611-2 can't sample a frame during a long task.** rAF doesn't run then, and the screencast has nothing to send.
  It rests on three things:
  - the press is a finished animation with `fill: forwards`;
  - the frames on either side of the freeze are at 0.985;
  - mutant B, without `fill`, goes red.
- **The yield is needed for Undo only.** Step 0.4 shows 35 frames between a save's press and its freeze. So a save
  runs at the click, and only Undo waits its two frames (at most 50ms).
- **QC1611-5's red under build D comes from the 4s net alone.** A refused or unanswered Firestore write never reaches
  the page as a failure, because the client keeps retrying offline. The net is the only thing that brings the frame
  back in that case.
