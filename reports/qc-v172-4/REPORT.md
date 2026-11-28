# Query Centre v172.4 — report

Branch `query-centre-v172-4`, cut from `query-centre-v172-3` @ f59b25ed6 (v172.3 — Sent buckets, open-end labels,
reason-line fallback, dashes — is on the base). Pushed, **not merged**. Dev: see the end.

## False premise

- **"Grouping and sort remembered per device (qh.qc.view) — as built."** True of the grouping only. The list's
  column sort (`qcSort151`) was plain page state and reset every visit. Phase 4 adds it to `qh.qc.view`.

Everything else in Step 0 held: the ledger list renders through ListCap169 + `.qc169-body`; Skeleton155 drew while
`loading && show`; the rail column carries `data-qc155-busy`; `useQcLoad(…, QC155_LOAD)` drives the desktop page;
QcSmart172 had the quick picks and the "Include closed" pill; the sliders are `.qs172-dual input[type=range]`; the
"That's all N" sign-off existed. The smart panel's settings were already page state saved with the visit's filters
(`qh.qc.filters`, since v172) — no gap there.

## Commits

| Phase | SHA | What |
|---|---|---|
| 1 | 6d74f3f06 | The list just ends (sign-off and `.qc151-end` removed); 14px slider handles; Include closed is a tick |
| 2 | 3c6830254 | The loading shell (QcSk172: Skeleton172 in the real card, RailSk172 in the rail); Skeleton155 deleted |
| 3 | da209f81e | The arrival (lib/arrival172 + `data-en172`, CSS inside no-preference, done by 530ms) |
| 4 | ddbe42b6c | The list's sort remembered per device (`sort151` in qh.qc.view) |
| — | (this) | Screens, ledgers, this report |

`useEntrance138` stays: QcCentre still reads it (its group's `data-enter138`, `qcv-page--enter`).

## Locks — written first, red against v172.3, then green

| Lock | Red (v172.3) | Green |
|---|---|---|
| qcv1724.test.tsx Phase 1 (sign-off source, thumb rules, the tick rendered) | 3 fail | 3/3 |
| qcv1724.test.tsx Phase 2 (Skeleton172 / RailSk172 shape, no digit, gating, reduced motion) | 4 fail | 4/4 |
| qcv1724.test.tsx Phase 3 (fake timers: arms once, off at 700ms, no replay, reduced motion; wiring; CSS timings) | 5 fail | 5/5 |
| qcv1724.test.tsx Phase 4 (sort151 default, sanitiser, wiring; grouping + visit — already true) | 1 fail, 1 pass | 2/2 |
| L14 list ends · the tick toggles the Closed group · thumbs centred on the track ends (3 sliders) | 1/6 | 10/10 |
| L15 the shell in the real card under the heading row · the panel's frame · no digit · aria-busy | 1/7 | 7/7 |
| L16 the arrival set after loading, cleared ~700ms later, no replay on a filter, never under reduced motion | 2/4 | 4/4 (707ms) |
| L17 the opening state on a fresh session · smart filter kept for the visit · sort kept per device | 4/8 | 8/8 |

Ledgers: `reports/qc-v172/ledger/{red,green}-L14…L17.json`. L1–L13 all still green in the same run (26 · 6 · 144 · 6 ·
8 · 5 · 5 · 20 · 11 · 6 · 5 · 3 · 3).

Re-pointed on the way: L6's "pills read the shell token" is now checked with More filters open only (the folded panel's
one pill was Include closed); qcState155.test.tsx's card-grid skeleton tests went with Skeleton155, and its
aria-busy / order test names the new shell; qcViewMemory.test.ts's three exact-shape expectations include `sort151`.
L16's rendered bound allows 850ms (the timer is exactly 700ms — the unit lock — and the page adds its busy main thread;
the first attempt read 781ms, the green run 707ms).

## Gates

| | Baseline (v172.3) | Final |
|---|---|---|
| tsc | 0 | 0 |
| build:dev | clean | clean |
| vitest | 971 files, 0 failed | 972 files, 0 failed (13,788 tests) |

## Screens (emulator seed; the loading shell held by `sa.qc155.holdMs`)

1512: `1-loading-shell-1512.png` · `2-mid-arrival-1512.png` · `3-settled-1512.png` · `4-list-bottom-1512.png` ·
`5-panel-top-1512.png` — and the same five at 1280.

## Files touched

src/components/queries/centre/QcPage151.tsx · QcSmart172.tsx · QcSk172.tsx (new) · QcState155.tsx · qcv151.css ·
qcv155.css · qcv172.css · qcv1724.test.tsx (new) · qcState155.test.tsx · src/components/Queries.tsx ·
src/lib/arrival172.ts (new) · src/lib/qcViewMemory.ts · src/lib/qcViewMemory.test.ts · tests/e2e/qc172.measure.ts ·
tests/e2e/qc1724Shots.measure.ts (new) · reports/qc-v172/ledger/* · reports/qc-v172-4/*

## Notes

- The Speed and Replay switches from the mock are review aids and are not shipped.
- Free disk dipped to 16.5 GB mid-session (other sessions' worktrees: nav1, pol1, tav1); the emulator guard refused one
  run, which passed on retry once space came back. Nothing of theirs was touched.
