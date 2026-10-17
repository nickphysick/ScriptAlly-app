# Dashboard v60 — first use, and the two hoops

Branch `dashboard-v60`, cut from `origin/dashboard-v59` (`5f566578`, unmerged, as asked). Step 0: the
worktree was level with it (0 behind, 0 ahead) and clean, and `git log --oneline -8` showed v59's six
parts and its report tail. Ref: `design-refs/dashboard-v60/dashboard-v60.html`
(SHA256 `77681a92…4fb5`, enrolled), built at its defaults (CLOSED = D · two hoops; art "one bird").

## False premises

1. **"The account's Smart Import is spent (`lib/smartImportConfirm`'s own test)."** That module only
   builds the confirm screen's sentence. The spent test is `getSmartImportEntitlement`
   (`lib/smartImportEntitlement`, `allowed: false`), which the tile reads, fed by the user's plan and
   `users/{uid}/private/entitlement` (now passed to the dashboard as `smartImportUsage`). A Pro account
   with this month's import unused reads "ONE THIS MONTH": "ONE FREE IMPORT" would be untrue for Pro.
2. **"It goes to the Contact list's ready mode, the same one the Contact list's pill opens."** There is
   no ready mode left: the v15 ready-only list mode was removed by v16 (list memory v4 has no field for
   it) and `YourAgentsBar`, which drew the pill, is mounted nowhere. "{n} ready to query →" opens the
   Contact list, whose next-step section is where those agents are listed.
3. **"Add a material → the Manuscripts page's add-material door."** Materials are added on
   **Submission packages** ("+ Add a material"); the Manuscripts page has no such button. And none of
   the three add actions the tiles name — that button, the comps page's add drawer, the Manuscripts
   page's "+ New version" dialog — has a door from outside its page (each is the page's own state). As
   instructed, no route was invented: each tile lands on the page that holds its button.
4. **"With no agent, the new-agent card first, then the drawer."** Nothing chains the two. With no
   agents, "Log a query" opens the new-agent card (so "THE AGENT CARD OPENS FIRST" is true); the
   card's own "Log a query" door opens the drawer after it. With agents, it opens the log journey.
5. **"Seed a pre-query manuscript of its own, with agents and without."** Agents are account-wide, so
   no manuscript on the shared account can be "without agents". Day one is the pre-query manuscript
   plus a new dev-only review-aid flag, `__SA_DASH_NO_AGENTS` (mode-gated at the call site like the
   others; absent from a production build), which hands the page no agents.
6. **P9 "onboarding's manual exit lands on `/dashboard`" cannot be driven on a rendered page**: it
   needs an account that has not onboarded, and accounts are not created here. P9 is the two hatch
   suites (`onboardingTail`, `landingRoute`), red when the "agents" hatch is put back.
7. **The ref's wider left column in the querying state is not a rule.** Its grid is `1.32fr 1fr`
   without `minmax(0, …)`, so the hoops' unbreakable legends push the column (687/442 at 1512,
   599/318 at 1280; at 1709 there is room and nothing moves). Before the first query it keeps v59's
   split. See deviation 1.

## Deviations from the ref

1. **The left column widens for the hoops by measurement, capped so the right column stays v59's.**
   The page publishes `--d60-hoop-need` (each hoop card's chrome, body padding, hoop, gap and its
   legend's natural width, and the band's title plus its link). It cannot use `min-content` — every
   `.os-card` is a size container. The floor is capped so the right column keeps 380px (v59's title
   row at its 19px floor plus "All n →"). The ref lets its right column go to 318 at 1280, where its
   own focus band wraps; the pack says the right column is unchanged. **Where the cap binds (1280),
   the legends' labels wrap to a second line** instead of being cut (a container query on the card).
   At 1512 the left is a little wider than the ref's (the agents band's "+1 this week" is in the need).
2. **The eyebrow stays "— NOW QUERYING —" and the sidebar is untouched.** The ref changes both before
   the first query ("— READY TO QUERY —", "READY TO QUERY" under the manuscript). The pack asks for
   neither, the header is "v59 as built", and the sidebar is the shell's.
3. **The hairline and the founding panel are v59's** (24px under the content above it, 10px above the
   panel); the ref draws 24 and 24, as in v59.
4. **The tiles' icon discs are blush `#f3e3dc`** (the ref's `--blush`, not a token here).

## What was built

- `lib/dashFirstUse.ts` (unit-tested over the ref's three fixtures, every tile branch): `isPreQuery`
  (the one predicate — the chart's `empty` and both columns' swap read it), `agentCoverage` (the
  Contact list's `deskModel` + `nextStep`), `firstUseTiles`.
- `v60/Hoop.tsx` (a new donut: 9 on 100, `#ece8e1` track, 1.2 gaps between non-zero segments, 12
  o'clock; draws in with the chart line via the Web Animations API, literal values, none under reduced
  motion), `v60/Dash60Left.tsx` (the two doors, the snapshot, the two hoop cards), `v60/Dash60Lift.tsx`
  ("Ready for lift off?"), `v60/dash60.css`.
- `Dash58Closed.tsx` deleted (its card is replaced, not added beside); its CSS removed.
- Shape memory (`sa.dash58Shape`) gains `pre`, `agents` and `hoopNeed`, so the loading page draws the
  state it last saw at its loaded size.
- Onboarding: both manual exits finish on the dashboard (no hatch); the import exit and App's reader
  are unchanged.

## Faults found while building (and fixed)

- **The hoop floor ratcheted wider on every load.** "Card − legend box + natural width" collapses to
  the card's own width whenever there is room, because the legend is shrink-to-fit. Rebuilt from fixed
  parts. Found by the loading lock (held 712 vs loaded 724, then 718 vs 730).
- **A wrapped legend read back as the need held the column narrow for ever** — the read forces
  `nowrap` for the instant of the measurement (in a layout effect, so nothing paints that way).
- **The stored floor lagged the webfonts by 12px** — the measurement now writes the shape memory the
  moment its value changes.
- **`dash60.css` was imported before `dash58.css`**, so v58's `.d58-left > .os-card { flex: none }`
  won the tie and the queries door collapsed to its band. The import is last now, with a note.
- **The harness's init scripts accumulate on one page**, so state A's no-agents flag leaked into B;
  every state clears the flags first.

## Locks

`tests/e2e/dashV60.measure.ts` at 1512×900, 1280×800 and 1709×849, three states (A day one, B agents
and no queries, C querying): **124 readings, all green** (states 94, figures 12, tiles 12, loading 6).

| Lock | Red | Green |
|---|---|---|
| P1 swap follows the predicate | v59 base: 12 reds · `P1-right-own-predicate` (the right column decides by agents): B's right shows v59's list | both columns, 3 states × 3 sizes, against the query count read from the data |
| P2 slate band | base · in-page `P2`: `rgb(228, 225, 219)` against `--clv-slate` `rgb(95, 123, 147)` | the computed band = the computed token |
| P3 two equal hoops beneath a full-width chart | base · in-page `P3`: 454.7 vs 227.3 | equal ±1, side by side, below the chart, chart and row = column width |
| P4 agents figures = the Contact list's | base · `P4-every-manuscript`: page 29/4/5 against 20/… | `data-cov` = `agentQueryStates` + `nextStep().ready` computed in node from the account, B and C; legend and "ready" words agree |
| P5 closed counts = `closedTile`'s | base · `P5-buckets-reversed`: legend `2,0,8,1` | counts, legend order and title sum |
| P6 no closed strip pre-query | base (the v59 closed card) · in-page `P6` | no element, no bucket words, A and B |
| P7 one drawing pre-query | base · in-page `P7` (a second drawing) | exactly the Courier; the agents card has the glyph or the snapshot |
| P8 tiles' done states | base: no tiles · `P8-any-manuscript` (materials from any manuscript): "✓ 3 OF 3" on a bare one | bare and full both entered for materials, comps and version (seeded and restored in the run); import = the entitlement |
| P9 manual exit → dashboard | `P9-agents-hatch-back`: 2 unit cases red | `onboardingTail`, `landingRoute` |
| P10 fit | in-page `P10` (a 640px door): the page scrolls (1019/786) | no scroll, nothing past the sheet, nothing cut, panel ≥ its floor, 3 × 3 |
| P10 loading | `P10-loading-no-memory`: C's boxes move when data lands | same containers, same boxes ±1, B and C |

Proofs: `mutation-proofs.jsonl` (11 entries, all red; code mutations built, run and restored from a
backup) and `redfirst-base-5f566578.txt` (the DB60 file against the unchanged v59 base: 3 of its 5
tests red, every P1–P8 lock red; the loading test passes there, as a no-jump property should).

**Older locks:** DB59 and DB58 pass on this build except **DB58 F2 "activeFrame" at 1280×680 and
1366×650** — the chart's axis overflowing its frame on a short window, **pre-existing** and recorded
in v59's report (it clips a little less now: 195 and 189 against 201 and 173). Retired or re-pointed:
`tests/e2e/RETIRED-dashboard-v60.md` (DB58 C1 → DB60 P5/P6; DB59 V1's first-run case → DB60 P1; the
closed-card boxes → the Closed hoop card). Unit: Vitest 599 files, 8,953 passed, 3 skipped.

## Shots

`shots/{A,B,C}-{1512x900,1280x800,1709x849}.png` — A day one, B agents with no queries, C querying.
The real shell's beta strip is in every shot; the ref has none.

## Open items

- **The ref's pre-query eyebrow and sidebar status** ("READY TO QUERY") are not built — yours to rule.
- **A long manuscript title runs the header's buttons off the sheet** (a v58 header behaviour, seen
  with a 27-character fixture title, not this pack's; the fixture uses a short one).
- **The three add actions have no outside door.** If the tiles should open the dialog or drawer
  itself, each page needs one (a param or a store), which is a change to those pages.
- **Agents on file's "ready to query →"** opens the Contact list. If a ready view is wanted again,
  that is a Contact list change.

BRANCH_TAIL
