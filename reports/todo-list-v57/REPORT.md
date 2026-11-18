# To-do list v57 — tweaks only (18 Nov 2026)

One new stylesheet on the To-do workspace, `src/components/todo/ws/todoWs57.css`, ported byte for byte from
`design-refs/todo-list-v57/todoWs57.css` (sha256 `b6d8e8dbd80d156a0cfb1e94a44ff159f157c7c0cf740e5a8a4e8e8df6c75532`)
and imported after `todoWs55.css`. No markup, behaviour or copy changes.

## False premises

None of the brief's premises was false. Things that differed from what the brief assumed:

- **The dev line had moved.** Dev served `index-sl2zR2So.js` from `dev/smv31-vv6-cp32-lqmf1-cb15` @ `b9226fc5e`
  (Log a query materials fork + Corkboard v15 on top of `dev/smv31-vv6-cp32` @ 345ccfed1), so `todo-list-v57` was cut from
  `b9226fc5e`.
- **The ref was not in the repo.** It came from `~/Downloads/todo-list-v57-pack.zip`. Its hash matched, and it is committed
  under `design-refs/todo-list-v57/` and added to `design-refs/.refhashes.json`, so `build:dev`'s staleness check guards it.
- **`docs/decisions/todo.md` does not exist on the dev line.** Only `main` has it. It was created here with a merge
  note at the top, the way Corkboard v15 did.
- Premise (c)'s opacity holds in source (`0.62`), but a reading taken right after clicking a row shows 1:
  `todoWs.css` lifts every row on `.tws-tray:focus-within`, and the clicked row keeps focus. M3 therefore blurs first
  and asserts nothing in the tray has focus. Once focus is cleared, the base reads 0.62 (rows) and 0.8 (bands).
- (a), (b), (d) and (e) held exactly. (c): `.tws-ws` is `340px minmax(0, 1fr)`, `.tws-wp` is 390px, and the desk sets
  `containerType: inline-size` inline (`containerType` reads `inline-size` on every reading). (d): the scroller is
  `.tws-wpg > .wpg-scroll` and has no background image. (e): Playfair Display 20px, and Source Sans 3 on the pop-up span.

## Readings — base (b9226fc5e) → v57, emulator build, workspace pinned, a send task on the desk

| | 1280 | 1440 | 1717 | 1920 |
|---|---|---|---|---|
| workspace | 1128 → 1128 | 1288 → 1288 | 1565 → 1565 | 1596 → 1596 |
| tray | 340 → 340 | 340 → 373.5 | 340 → 396 | 340 → 396 |
| desk | 760 → 760 | 920 → 886.5 | 1197 → 1141 | 1228 → 1172 |
| preview (`[data-tws="side"]`) | 390 → 390 | 390 → 390 | 390 → 479.2 | 390 → 492.2 |
| card zoom (`.tws-pvz`) | 0.716 → 0.716 | 0.669 → 0.669 | 0.669 → 0.833 | 0.669 → 0.857 |
| tallest of first 12 send titles | 37.5 → 37.5 | 37.5 → 18.8 | 37.5 → 18.8 | 37.5 → 18.8 |
| second row opacity (no focus, pointer out) | 0.62 → 1 | 0.62 → 1 | 0.62 → 1 | 0.62 → 1 |
| group band opacity | 0.8 → 1 | 0.8 → 1 | 0.8 → 1 | 0.8 → 1 |
| `.tws-qh` family | Playfair Display → Source Serif 4 | same | same | same |
| scroller background-image | none → `…/images/todo/doodle-tile.svg` | same | same | same |
| answer-tile columns | 1 → 1 | 2 → 2 | 3 → 2 | 3 → 2 |

Snooze pop-up (1440): `.tws-po span` Source Sans 3 → Source Serif 4; `.tws-ph b` Source Serif 4 → Special Elite.
Full readings: `readings/before.json`, `readings/after.json`.

## Tests re-pointed

- `tests/e2e/todoV52.measure.ts`: L4 "the tray is 340" and "the preview is 390", and L5's "All tasks restores it" (L5 is
  skipped as retired by v55; its line is re-pointed anyway).
- `tests/e2e/todoV55.measure.ts`: L5 "the tray is 340 open" and "a click on the strip opens the tray".
- New expectations: tray = clamp(340, 0.29 × workspace, 396) and preview = clamp(390, 0.42 × desk, 568), each ±1, using
  the **content box** that a percentage or `cqw` actually resolves against. Here that equals the border box (no padding).
- No source-string test asserts the old values in a way v57 breaks (`todoWs.css` is untouched); the To-do workspace
  unit tests (4 files, 24 tests) pass.

## What was run

- Baseline: tsc 0 errors once `functions/node_modules` was linked into the worktree. The first tsc reported 7 TS2307
  errors because that folder was missing; this was the environment, not the code. Build clean (only the chunk-size note).
- After each phase: tsc 0, build clean, `vitest run src/components/todo/ws` 24/24.
- `todoV57.measure.ts` with `TD57_TAG=before` on the base build: 12 passed, 2 skipped (M4's comparison and M9's
  journey run only after).
- One after run of `todoV57` + `todoV52` + `todoV55` (emulator build): **34 passed, 5 failed, 9 skipped**.
  - todoV57: **14/14 passed**, M1–M11.
  - todoV52 L1 "at most 1320 wide" at 1512 and 1920: **red on the base too.** The base readings show the workspace 1596 wide at
    1920 (page width v1 lifted the cap); v57 does not touch the header or workspace width. Not chased.
  - todoV55 L10 (phone To-do unchanged since v55's base): `src/components/phone/PhoneBand.tsx` differs, which is the known
    phone-case red the brief names. Not chased.
  - **todoV52 L6/L7 at 1512 (tray open), send step 2: Next is not in its column. This one is v57's.** See below.

## Judged

- **The footer overflows its column from about 1,460 to 1,600 wide (v52 L6/L7 at 1512).** At 1512 the tray grows from
  340 to 394 and the preview from 390 to 394, so the questions column narrows from about 602 to 544. On step 2 the footer holds
  Snooze, Dismiss, Back, "2 of 4" and Next, which needs about 584. Next lands at 968–1088 against the column's 520–1064,
  24px over the preview's edge. It stays clickable (the hit test passes). On step 1 (no Back) it fits: a probe read
  Next at 928–1048 inside 520–1064, at once and after settling. At 1440 the column is 496 after (about 530 before), so the
  same step-2 footer very likely already overflowed there on the base. No reading here proves that, because v52 measures
  1280/1512/1920 only. The brief bakes the stylesheet ("no value is tuned"), so nothing was changed. **v52 L6/L7 stays red
  and is not re-pointed**, because it is not one of the facts v57 changes on purpose. A fix would be outside todoWs57.css:
  for example, widen todoWs.css's `@container twscol` rule that hides "n of m" from 400px to about 600px, or hide Back's
  label on narrow columns. That is Nick's call.
- M2's title height bound (≤ 20) matches one line at 18.8px; at 1280 titles still wrap (37.5), as accepted.
- M8 reads the quick actions' own box. At rest they measure 0×0 (collapsed); on hover they are 30×30 and visible.
- M9 walked "Send Marcus your full": mats → ver → date → check → Log. The header went 105 → 104, the snackbar read
  "Full sent to Marcus · reply expected by Wed 10 Feb" with Undo, and Undo restored 105. The tray prefs went back through
  `seedTd55.mjs`.
- M10: Query Centre and Contact list at 1440, at rest and scrolled: **0 pixels differ** (4 pairs).
- My runs overwrote some v52/v55 reading files under `reports/todo-list-v52/` and `reports/todo-list-v55/`. They were put
  back and not committed.

## Shots (`shots/`)

`before-*` / `after-*` at 1440 and 1920: rest, pinned, check, housekeeping, nudge, quiet (gone quiet), snooze-pop,
snoozed, collapsed; plus pinned at 1280 and 1717. M10's Query Centre and Contact list pairs are `M10-{before,after}-*`.

## Dev

- Before: `index-sl2zR2So.js` (`dev/smv31-vv6-cp32-lqmf1-cb15` @ b9226fc5e).
- After: `index-BGsc0WwG.js` from `dev/smv31-vv6-cp32-lqmf1-cb15-td57` (the served line + `todo-list-v57`).
  Docs-only commits after the build do not change the bundle. The deploy is checked against this hash.
- Prod untouched.
