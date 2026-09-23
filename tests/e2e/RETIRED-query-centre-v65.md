# Retired with Query Centre v65 — what went, and why

**Recoverable at `6d495a3e`** (the last commit that still contains them), in
`tests/e2e/qcV21.measure.ts`, which this pass renamed to `qcV65.measure.ts`.

⚠️ **RETIREMENT IS NOT LAPSE.** Every case below measured something true about a surface v65
deletes. None was failing, none was rebaselined, and none is "temporarily off": where the claim
survives the rebuild it is named here with the phase that re-states it, and where the claim went
with its subject that is said out loud.

## Phase 1 · the views (9 cases)

| Case | Subject | Verdict |
|---|---|---|
| `the Overview — the stat row, the portal, and everything below the head replaced` | `QcOverview` | **gone with its subject.** The Overview is deleted; the courts replace it (phase 2) and get their own cases. |
| `the Overview → a view → back — the back link and the crumb are the only ways out` | the back link | **gone with its subject.** One page, so there is nowhere to go back from. |
| `grid — two tiles across beside the docked card` | `QcGrid` | **gone with its subject.** The card grid is deleted; `qcList.test.tsx` asserts its absence instead. |
| `calendar — expanded and compact, the inset, one bar per stage` | `QcCalendar` in the ledger | **re-stated in phase 3**, against the rail's Birds-eye view. |
| `calendar — scrolled back to a lane with three or more stages…` | hover strength, name legibility | **re-stated in phase 3.** |
| `calendar — the sticky heading tracks the box's width through 1280 → 2000 → 1280` | the sticky heading | **re-stated in phase 3.** |
| `loading — the calendar's skeleton, held at the current density` | `QcCalendarSkeleton` | **re-stated in phase 3.** |
| `the fan — a stat card deals its hand, capped at fifteen with a stack card behind` | `QcFan`, dealt from the Overview | **re-stated in phase 2**, dealt from the court tiles. The fan itself is unchanged; only its door moves. |
| `§8 — a live calendar bar always reaches today, and an overrun is drawn inside it` | `qcCalendar.ts`'s geometry | **re-stated in phase 3.** The arithmetic is unit-locked in `src/lib/qcCalendar.test.ts` in the meantime, which is where the law lives. |

**Between phase 1 and the phase that re-states each, the subject is unreachable in the app** — the
fan has no door until the courts land, and the calendar is unmounted until the rail does. That is a
consequence of the agreed phase order, not a defect, and it never reaches a deploy: this pass
deploys nothing.

## Assertions retargeted rather than retired

- `qcCentre.test.tsx` — the view table's three cases became one ABSENCE case over the deleted
  exports, plus `readBirdsEyeOpen`'s two meanings, plus "the page writes no `?view=`".
- `qcList.test.tsx` — the grid's four cases became one: the component and its sheet are out of the
  tree and nothing imports them.
- `QueryEmptyCard.test.tsx` — a `sliceBetween` end anchor (`gridView === "list" ? (`) became
  `<QcList rows={qcVisible}`. It failed LOUDLY when the anchor went, which is the whole point of
  that helper.
- `respondDesk.test.tsx` — its two-file sweep for a stray `QuickActionPopover` is now one file.
- `qcV65.measure.ts` · `§7 Escape` — "the view stays where it was" was a `data-view` read. Escape
  must still not be Back; with one page that claim is "no Overview appears behind the closed card".
- `qcV65.measure.ts` · `the entrance` — its view round trip became a row selection, which is the
  state change this page actually has.
