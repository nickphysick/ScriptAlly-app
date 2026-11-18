# Retired by Versions v6 (17 Nov 2026)

Versions v6 rebuilt `/manuscripts/versions` (design-refs/versions-v6). The surfaces below are deleted, so the locks
that asserted them are retired by name. Their replacements are `tests/e2e/versionsV6.measure.ts` (VV6) and the
re-pointed `src/components/versions/versionsPageSmoke.test.tsx`.

## Components deleted

- `src/components/versions/V2List.tsx` — the tinted "Your versions" table with search and icon actions
- `src/components/versions/V2Tracking.tsx` — the navy Tracking & performance band, carousel and league table
- `src/components/versions/V2Warming.tsx` — v2.1's warming-up panel
- `src/components/versions/V2Empty.tsx` — v2.2 C's "No versions yet" preview and comparisons note
- from `V2Overlays.tsx`: `VersionDrawer`, its `Funnel`, the page's `DrawerShell`, `ArchiveConfirm`
- the hand-written rules for those in `versionsV2.app.css` (warming, `#vWarn`/`.wb`, `#secTiles`, `.ev`/`.ev2`)

## Locks retired (tests/e2e/versionsV2.measure.ts, VER2) — every case asserted a deleted surface

| Case | What it asserted | Now |
|---|---|---|
| S01 | the banner's line and faces; the list's count | notice: VV6 S1 / smoke; count: VV6 L1 |
| S02 | the pinned navy list card, four columns, three icons | retired (no table); VV6 L1 |
| S04 | the archive modal, Undo exact | retired (inline confirm, no modal); Undo exactness: VV6 L2 pattern |
| S05 | delete confirm naming the moved child and package | retired (no delete from the page) |
| S06 | search and sort in the table | retired (no search); sort is unlocked — open item |
| S11/S12 | the drawer's four stat cards and four-band funnel | VV6 O1 / O2 |
| S14 | "too early for a %" in the drawer | VV6 O1 (no % below the minimum) |
| S15/S16 | duplicate name / Original's locked form | the form is v2's, unchanged; not re-measured in this pack |
| S17/S18 | the picker's saved-after-send warning | the picker is v2's, unchanged; not re-measured |
| S19–S21 | the guide's ticks | targets re-pointed (`targetFor`); not re-measured |
| S27 | first save creates Original | form unchanged; not re-measured |
| S29 | Free lock over an inert page | smoke ("locked"); shot in the report |
| W1–W4 | the warming-up panel | VV6 C3 (the not-yet panel) |
| T1–T6 | v2.2's title card, tinted panel, empty states, guide spotlight | VV6 H1 / day-one smoke |

`tests/e2e/versionsV2.measure.ts`, `tests/e2e/ver2Lib.ts`, `tests/e2e/ver2Fixture.mjs`, `tests/e2e/ver2Shots.measure.ts` and
`tests/e2e/ver2Probe.measure.ts` (a dev aid that asserted nothing) are deleted with this file, and so is
`tests/e2e/qc149L0.measure.ts`: every case in it was already `test.skip` (retired by Workspace headers v1, 14 Nov), but
it still imported `ver2Lib`. (`ver2Fixture.mjs` also wrote to live dev Firestore directly, against the emulator-first rule.)

## Re-pointed

- `src/components/versions/versionsPageSmoke.test.tsx` — the populated page, the comparison, day one (both), the lock.
- `tests/e2e/wsHeaders.measure.ts`, the "versions" row: headline `^Versions$` (no figure), first section the founding
  band / notice / desk, H4's gap 16 for this page (a new optional `gap` on the row; 48 for every other page), and the
  list section and on-page tree added to H7's gone list. Not re-run in this pack (it measures seven pages).
