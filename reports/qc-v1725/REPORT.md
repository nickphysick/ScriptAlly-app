# Query Centre v172.5 — the filter panel's "What's next" ring, folding sections, "Stage reached", Action needed taking in the undated

Branch `query-centre-v172-5`, cut from `query-centre-v172-4` @ 8da058969 (v172.3 and v172.4 both on the base: loading shell, arrival, the list just ends, 14px handles, the Include closed tick). Dev only; not merged. Refs: design-refs/query-centre-v1725/ (mock v19.16), `SHA256SUMS` passes.

## Recon (step 0)

- The panel is `src/components/queries/centre/QcSmart172.tsx`; its state is Queries.tsx page state (`qcSmart`, `patchSmart`), remembered for the visit with the page's filters (`qh.qc.filters`, lib/qcViewMemory → `sanitiseSmart172`). `pass172` narrows `qcFiltered`; `chips172` feeds the applied row and the nothing-matches hint; `group172`/`tier172` group the list on Group = Action. Include closed was a tick (`.qs172-ck--closed`).
- **Not a false premise, but worth knowing:** Birds-eye never read `group172` — its groups are lib/qc150's own. So changing the list's groups (Phase 1d) needed no Birds-eye guard; they now differ on purpose (the old e2e L4 "one grouping" lock was rewritten, below).
- The ref's `smart172.ts` also carries a `quiet` range (days since anything happened). No phase asked for it; not ported.

## Baseline (clean checkout of the base)

| gate | base | after |
|---|---|---|
| `tsc --noEmit` | 0 errors | 0 errors |
| `vite build` | clean (chunk-size note only) | clean |
| `vitest run` | 13787 passed, 1 failed (`statusMarksV3Sources` SM3-8) | **13816 passed, 0 failed** (exit 1 is the known `[vitest-worker] Timeout calling "onTaskUpdate"` under load, zero failed cases) |

tsc needs `NODE_OPTIONS=--max-old-space-size=8192` here; the default heap ran out on the first baseline attempt.

## What changed

**Phase 1 — the model** (035843d96). `stand172` puts every query in one of seven parts; `hide: Stand172[]` sits beside `closed`; `who` and the three-count control are gone. `pickPart172` is the one picking rule; `standText172` names the one chip ("Action needed", "No action needed", or the shown names, Closed last). `group172`: Action needed takes in the waiting with no reply date at tier 3.5; the "Waiting, no reply date" group is gone from the list.

**Phase 2 — the ring** (b4fe2afc6). `Ring172` replaces the panel's top block: viewBox 100, r 40, stroke 14, 2.2 gap, 132px, navy family; cream centre ("67 / need you" at rest, "14 / of 88" filtered, a part's own word on hover or focus), 700ms count-up and draw-in, neither under reduced motion; the key full width under it. Segments are focusable buttons; `ringKey172` moves between them with the arrows (wrapping), Enter/Space picks. The loading shell shows a pale donut in its place.

**Phase 3 — folding sections** (41ec60c6a). `Sec172`: Stage reached, Sent, both dates, More filters. Stage reached opens on a fresh visit, the rest shut; remembered for the visit (`qh.qc.fold172`); a set section opens itself on arrival; the shut body is inert; 220ms, instant under reduced motion. "Stage" → "Stage reached". The separate More filters button is gone.

**Phase 4 — the counts** (29df3a39e). Panel header "88 showing"; toolbar "67 need you · 88 in all" unfiltered, "14 of 88" filtered, Birds-eye "88 queries". `need` is the list's Action needed group, computed in Queries.tsx whatever the grouping.

**Verification fixes** (this commit). A workspace focus rule drew a square box round the whole ring when a segment had keyboard focus (seen in shot 05); `.qs172-rsvg .arc:focus(-visible)` now sets `outline: none !important`, locked by L20. The Materials row inside More filters was indented 14px from the four sections above it; fixed.

## Locks — red before, green after

Unit (red-before output in `red-before/`):
- Phase 1 `src/lib/smart1725.test.ts`: **9 red → 9 green**.
- Phase 2 `qcv1725.test.tsx`: **8 red, 1 green before** (the pick-logic case passed because `pickPart172` landed in Phase 1) → 9 green.
- Phase 3 `qcv1725fold.test.tsx`: **5 red → 5 green**.
- Phase 4 `qcv1725counts.test.tsx`: **3 red, 2 green before** ("14 of 88" and Birds-eye's "88 queries" are kept behaviour) → 5 green.

Updated because this round deliberately changes what they locked: `smart172.test.ts` (the groups, `who` → `hide`), `qcViewMemory.test.ts` (`who` → `hide`), `qcv1724.test.tsx` 1c (Include closed tick → no tick, Closed shown by default).

Rendered (`npm run e2e:emu -- tests/e2e/qc172.measure.ts`, emulator seed, 1512 unless noted): **L1–L21 all green**.
- New: L18 the ring at rest (8/8), L19 picking (10/10), L20 keyboard (8/8), L21 folding (8/8).
- Rewritten for this round: L4 (the list's three groups; list Action needed = Birds-eye's Needs action + Waiting, no reply date), L14 (Closed is a key row that adds and removes the Closed group), L16 and L17 (the ring in place of the seg and the tick); L5, L6, L7, L10, L11 re-pointed at the folding title row. The first full run had L10, L11 and L21 red on stale selectors and the harness's own motion suppression; fixed and re-run green.

## Screens (reports/qc-v1725/shots/, against design-refs/query-centre-v1725/01–03)

01-rest-1512 · 02-picked-1512 (Materials requested picked, Sent open) · 03-rest-1280 · 04-key-hovered-1512 · 05-segment-focused-1512 · 06-rail-more-open-1512. They match the refs' layout. The numbers differ because the emulator seed's dates are older than the mock's: 67 need you here (41 Consider closing) where the mock shows 41.

## Files touched

src/lib/smart172.ts · src/lib/smart1725.test.ts · src/lib/smart172.test.ts · src/lib/qcViewMemory.test.ts · src/components/queries/centre/QcSmart172.tsx · qcv172.css · QcSk172.tsx · QcBar153.tsx · QcPage151.tsx · qcv1725.test.tsx · qcv1725fold.test.tsx · qcv1725counts.test.tsx · qcv1724.test.tsx · src/components/Queries.tsx · tests/e2e/qc172.measure.ts · qc1725Shots.measure.ts · qc172Shots.measure.ts · qc1721Video.measure.ts · docs/decisions/query-centre.md · design-refs/query-centre-v1725/ · reports/qc-v1725/ · reports/qc-v172/ledger/green-L*.json.

## Open

- Birds-eye still groups "Needs action" and "Waiting, no reply date" separately (out of this round by the brief).
- The spec's example section value "2 picked" — More filters says "2 set", as the ref does.
