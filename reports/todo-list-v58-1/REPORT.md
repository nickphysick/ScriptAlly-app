# To-do list v58.1 — five fixes to v58, and a read-only check of two counts

Built 21 Nov 2026. Desktop only (768px up). The oracle is `design-refs/todo-list-v58-1/` (`todo-list-v58-1.html` and `desk2.jpg`, with all five switches on); both hashes matched. Every change sits in the "v58.1" block at the foot of `src/components/todo/ws/todoWs58.css`, inside its `@media (min-width: 768px)`.

## 1. False premises

- **"Remove the blue outline on a mouse click."** No app rule draws a blue outline. In headless Chromium a mouse-clicked row was focused with `outline: none` before any change. The blue ring is the browser's own focus ring, and it shows after keyboard use, or wherever Chrome decides the focus is focus-visible. Fix 2 still sets both states explicitly: no outline from a click, and a navy `:focus-visible` ring from the keyboard.
- **"Reuse the wait values; don't restate hexes if a shared rule can carry them."** No shared rule can. The wait band's values live in a `[data-band="wait"]` rule in `todoWs.css`, which is on the do-not-touch list, and CSS cannot point at another rule's declarations. So one rule restates them once: `--tw-navy`, white ink, and the three `--wh-*` tokens. It uses no new hex.
- **Quick fill "96px", from the ref.** On the app, 96px still left the rule 1px under the button: the rule would end at 322 and the button starts at 321.2, at 1280. I used **108px**, so the rule ends about 11px clear of the button. The ref wins on intent (clear of the button), not on the number.
- **"Rows stay 58 tall."** Every single-line row is 58 at both sizes, before and after. A row whose title still wraps is 73.8, as it was before. The stacked figure frees width for the title. It doesn't cap wrapping.

## 2. Step 0.6 — the two counts (read-only; nothing changed)

See [`step06-counts.md`](step06-counts.md) for the full table, the per-task list and the follow-ups. In short:

| Kind | Counts from | Words claim | Agree? |
|---|---|---|---|
| send | `partialRequestedDate` / `fullRequestedDate`, else `lastStatusChange` (`todoBuckets.ts:529–530`) | days since the agent asked | Only when a request date is stored |
| rr | `lastStatusChange` (`todoBuckets.ts:532`) | days since the R&R came in | Only while the R&R was the last status change |
| nudge | `taskDue` "chase" (`taskDue.ts:245–253`): a hold, else `nudgeDate`, else the reply window | days past the agent's reply date | Only when the source is the window |
| quiet | the latest of sent, nudged or replied (`todoBuckets.ts:538–541`) | days since the last contact | Yes, when stored fields match the log |
| offer | `lastStatusChange`, the day it arrived (`taskDue.ts:231`) | "past expected" | **No**: nothing is expected of an offer, and `offerDate` is never read |
| own | its own `dueDate` (`todoWs.ts:166`) | "days left" / "past expected" | "Past expected" should be "past due" |
| other | its bucket's `taskDue` case, else the wait anchor | as its bucket | Nothing in the seed shows one |

- **Nudge William, "115 days past expected" from 29 Jul.**
  - The cause is the words, which is code: a nudge says "past expected" whatever date `taskDue` returns. That can be a hold, a planned nudge (`nudgeDate`), or the reply window.
  - 29 Jul is the send day. The window can't give that, so it is most likely a `nudgeDate` or `responseDeadline` stored as 29 Jul, which would also be a data problem.
  - Only his dev record would settle it. I didn't read it, because live reads need your opt-in.
- **Send Greg your partial, "3 days waiting".**
  - The cause is code: with no stored `partialRequestedDate`, the figure counts from `lastStatusChange`, which a status write around 18 Nov moved.
  - The record is also wrong, which is data: it logs "partial sent" on 14 Oct while the status is still Partial requested.
- **In the seed:** about 20 records contradict their own logs, and 5 nudges count from a hold or a planned nudge but say "past expected".

Follow-ups (not done here; your call, since most change copy):

1. A nudge's words should follow its source.
2. An offer should read "{n} days since it came in", taken from `offerDate`.
3. A request with no stored request date should take it from the log.
4. Own tasks should say "past due".
5. A `recomputeQuery` pass over the seed.

## 3. Branch and commits

- **Cut from:** the branch dev was serving, `dev/cr1-qc163-db3-acv2-cr5-qcc-acv21-nu1-cr11-acv211-nu11-td58` @ `9a76f0876` (dev served `index-DDBRal-w.js`).
  - It already contains v58. The only v58 commit missing was its report, `3bed020a5`. So no merge was needed and there were no conflicts.
- **Own branch:** `todo-list-v58-1`.

| Commit | What |
|---|---|
| `6475cbca6` | phase 1 — the desk header is navy on every task (with the design pack and before shots) |
| `c13ac64f0` | phase 2 — a clicked row looks like an open row |
| `f8fd41d7a` | phase 3 — no edge on the desk chip |
| `e439133c6` | phase 4 — the figure stacks on a tray 360px or narrower |
| `0e5a81d8d` | phase 5 — Quick fill clear of the heading's rule |
| `9e0f6c387` | phase 6 — locks, and the measurement spec |
| `66e6d2fc7` | report — Step 0.6 (read-only audit) |
| `8093707d5` | phase 2 fix — keyboard Tab reaches the quick actions (found by the after run) |
| `d38a8ec23` | phase 6 — after shots and readings |
| (next) | this report |

**Dev deploy.** The dev branch `dev/cr1-qc163-db3-acv2-cr5-qcc-acv21-nu1-cr11-acv211-nu11-td58-td581` is the same commit as `todo-list-v58-1` @ `d38a8ec23`, a fast-forward of the line dev was serving. It was built with `npm run build:dev` from a clean, detached checkout of that pushed tip. The deploy command refused to run unless dev still served `index-DDBRal-w.js`. **Dev now serves `index-C2XX1fR5.js`** (https://scriptally-dev.web.app). Nothing went to prod or main.

## 4. Baseline against final

| Gate | Baseline | Final |
|---|---|---|
| `tsc --noEmit` | 0 errors | 0 errors |
| `tsc -p functions/tsconfig.json` | 0 errors | not touched |
| `vite build` | clean | clean (and `build:dev` for the deploy) |
| Vitest | 4 failed / 13,055 passed | 4 failed / 13,061 passed |

The 4 failures are the same at both ends (`events.test` ×2, `firestoreTarget` ×2), and the 6 extra passes are the new locks in `todoWs581.test.tsx`. No worse than baseline.

## 5. Measurements (6.3) and red-then-green proofs

Measured with `tests/e2e/todoV581.measure.ts` on the emulator (`npm run e2e:emu`, 127.0.0.1:4321), before and after, at 1512×900 and 1280×800. Shots are in `before/` and `after/`, readings in `readings/before.json` and `readings/after.json`.

Desk header background and ink, which are the same at both sizes:

| Header | Before | After |
|---|---|---|
| send (wait) | navy `rgb(42,58,82)`, white | navy, white |
| offer (wait) | navy, white | navy, white |
| nudge | `rgb(197,208,221)`, ink | **navy, white** |
| quiet | gradient `#e3dbcf → #f7f3ee`, ink | **navy, white** (no gradient) |
| own (yours) | `rgb(239,230,210)`, ink | **navy, white** |
| fix (house) | `rgb(239,233,223)`, ink | **navy, white** |
| housekeeping batch | `rgb(228,235,241)`, ink | **navy, white** |
| A new task | `rgb(239,230,210)`, ink | **navy, white** |

| Reading | Before | After |
|---|---|---|
| Desk chip edge (Nudge Marcus, past expected) | terracotta `rgb(201,118,93)` 1px inset | **none** |
| Mouse-clicked row (Nudge Marcus), pointer moved away | focused, outline none, figure **hidden**, quick actions **shown** | focused, outline none, figure **shown**, quick actions **hidden** |
| Keyboard-focused row (reached by Tab) | not reached (the probe found no second row) | focus-visible, **navy 2px ring** `rgb(42,58,82)`, quick actions shown; Tab → **Snooze**, Tab → **Dismiss**, Tab → next row |
| Wrapped titles at 1280 (tray 340) | 26 of 53 | **14 of 53** |
| Wrapped titles at 1512 (tray 394) | 8 of 53 | 8 of 53 (the figure stays on one line) |
| Figure direction at 1280 / 1512 | row / row | **column** / row |
| Single-line row height, 1280 and 1512 | 58 | 58 |
| Rows at 58 / 73.8 at 1280 | 30 / 27 | 42 / 15 |
| Quick fill at 1280: rule end against button left | 414 / 321.2 (under it) | **310** / 321.2 (11px clear) |
| Quick fill at 1512 | 468.4 / 375.5 | **364.4** / 375.5 |
| Button position (both sizes) | 321.2–406 / 375.5–460.4 | unchanged |

**Red-then-green** (Vitest locks; each asserts a non-empty population first):

- **A.** Removing the navy rule fails the fix 1 lock only.
- **B.** Removing the chip rule fails the fix 3 lock only.
- **C1.** Removing the pointer rules fails both fix 2 CSS locks.
- **C2.** Widening the hider to `:focus-within:not(:hover)` fails both fix 2 locks.
- **D** (after the fix below). Putting back the first hider (`:focus-within…:not(:has(:focus-visible))`) fails both fix 2 locks.
- Every proof was restored from a backup, then 6/6 green.

**The after run found a bug in phase 2, now fixed.**
- **What went wrong:** in the first after run, Tab from a keyboard-focused row dropped focus to `<body>` rather than reaching Snooze. I reproduced it in a bare page in headless Chromium.
  - The phase 2 hider was keyed on `:focus-within:not(:focus-visible):not(:has(:focus-visible))`, so it hid the actions in the instant focus moved onto Snooze.
  - Chromium blurs an element that turns `display: none`.
- **The fix:** key the hider on the row's own focus, `.tws-ti:focus:not(:focus-visible):not(:hover)`.
- **Checked in the repro:**
  - Tab goes row → Snooze → Dismiss → next row.
  - A mouse click hides the actions once the pointer leaves, and Tab after the click still reaches both.
- **Locks:** they now forbid `:focus-within` or `:has(` in any action hider. The CSS-reading locks couldn't see this; only the browser could.

## 6. Decisions for Nick

1. **Do the housekeeping batch header and "A new task" look right in navy?** Both are now navy with white ink, as the brief asks ("navy for every task"). To read on navy, the batch band's "Now:" line went white, and its progress segments went to white tints: 22% for to do, 60% for current, solid for done. Its switch edge went transparent. Shots: `after/batch-open-1512.png` and `after/new-task-1512.png`.
2. **The desk chip on navy** picks up the header's `--wh-chip` (14% white), as the wait band's chip always did. With no edge, it reads as a faint pill.
3. **Quick fill margin is 108px, not the ref's 96px** (see 1).
4. **The figure's wording** (section 2). Every follow-up there changes copy, so they are yours to rule on.

## 7. Seen and left alone

- `todoWs.css` still draws the terracotta `[data-late]` chip edge. v58.1 overrides it rather than deleting it, because `todoWs.css` is do-not-touch.
- `todoWs.css:167` and `todoWs57.css:26` still show the actions and hide the figure on `:focus-within`. v58.1 overrides them for pointer focus, for the same reason.
- About 20 seed records contradict their own logs (section 2). The seed was not edited.
- The 4 baseline Vitest failures (`events.test`, `firestoreTarget`) predate this work.
- Wrapped rows at 1280 are still 73.8 tall. That happens where a title is too long even with the stacked figure, and copy isn't shortened, by decision.
