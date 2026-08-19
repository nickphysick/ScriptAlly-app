# Phase 0 — recon (measured 1440×900, deployed dev)

## ⚠️ Premises that turned out false

**1 · The page-title premise is backwards.** The brief says *"`/queries` states its page with a
small mono label inside the top of the workspace; `/todo` spends roughly 150px of vertical on a
Playfair title in its own white card."*

Measured, **both pages use the same `wpg-plate` / `wsh` chrome**, and the Query Centre's is the
**taller** one:

| | element | title | plate height |
|---|---|---|---|
| `/queries` | `.wsh-title` | Playfair **38px**/600 "Query Centre" | **146px** |
| `/todo` | `.wsh-title--solo` | Playfair **40px**/600 "To-do list" | **102px** |

So "the page title card goes — use the Query Centre's treatment" would *add* 44px of vertical, not
remove 150. **Recon wins:** the card stays, because `/queries` has one. What is real is the 2px
title difference (40 vs 38), which assertion 4 catches, and that is what Phase 1 fixes.

**2 · The four counts are not 19/17/20/17 on this build.** Measured now: sidebar **13**, meter
**10**, footer **11**, pane **14**. The disagreement is real; the specific figures have moved.

**3 · Phase 3 reverses a decision you made two rounds ago, for the second time.** In the contract
round you wrote: *"D6 — take the contract, and it's my inconsistency, not a spec conflict. The
mockup is right: a note has a real added-date and a real age. Reverse it, and note in the report
that the shipped decision was overturned deliberately."* `panePresence` was changed to give a note
`{tiles: true, figure: true, timeline: false}` on that instruction. Phase 3 now says a note renders
**no tiles**. The newest instruction wins and it is implemented — recorded here because the same
line has now been decided both ways and the next round should not flip it a third time by accident.

## 1 · The inset chains

### `/queries` → `.f12-list`
| element | x | w | padding T/R/B/L | gap |
|---|---|---|---|---|
| `.ws-main` | 224 | 1216 | 0/22/20/22 | – |
| `.wpg-scroll` | 247 | 1170 | **0/35/0/35** | – |
| `.f12-body` | 282 | 1100 | **20/0/32/0** | **18px 16px** |
| `.f12-list` | 282 | 386 | 0 | – |

**card left 282 · bottom 11px from the viewport bottom**

### `/todo` → `.tlc`
| element | x | w | padding T/R/B/L | margin | gap |
|---|---|---|---|---|---|
| `.ws-main` | 224 | 1216 | 0/22/20/22 | – | – |
| `.tdb-col.tpl` | 247 | 1170 | **0/0/48/0** | – | – |
| `.wpg-scroll` | 247 | 1170 | **44/35/0/35** | – | – |
| `.tpl-cols` | 282 | 1100 | 0 | **6/0/0/0** | 26px |
| `.tdb-centre` | 282 | 1100 | 0 | – | 12px |
| `.tdw-split` | 282 | 1100 | **22/22/22/22** | – | **18px** |
| `.tlc` | 305 | 378 | 0 | – | – |

**card left 305 · bottom 50px from the viewport bottom**

**The four real differences:** `.wpg-scroll` padding-top **44 vs 0** · `.tdb-col.tpl`
padding-bottom **48 vs 0** · `.tdw-split` padding **22 all round** where `/queries` has none on the
sides · and the shared 1100px measure is then inset again, putting the card at **305 vs 282**. The
gap between list and pane is **18px** on both — already equal.

## 3 · Every count on `/todo`, and its source

| surface | rendered | source | same as |
|---|---|---|---|
| sidebar rail badge | **13** | `lib/todoCount` (`todoBadgeCount`) — its own law | nothing |
| meter legend | 2 · 4 · 4 = **10** | `railGroups()`, the three families only | footer's array |
| list footer | **11 tasks** | `railGroups()`, **all** groups incl. Snoozed | meter's array |
| pane counter | Task 10 of **14** | `dockable` = `dockQueue(dockAllCards())` + chip | nothing |
| group heads | 2 · 4 · 4 · Snoozed 1 | `railGroups()` | meter + footer |
| rows in the DOM | 11 | `railGroups()` | meter + footer |

**Two arrays, four numbers.** Meter and footer share `railGroups()` and differ only because the
meter counts three families and the footer counts every group — so Snoozed is in one and not the
other. The sidebar and the pane are genuinely separate derivations.

## 4 · `TaskSettingsSheet` and `todoPrefs`

Sheet fields today: `staleMonths` (number, `STALE_MONTHS_CHOICES` 3/6/12/18/24) · `rollForward`
(bool) · `weeklyBriefing` (bool), plus tags and set-aside which are not `todoPrefs`.

**`todoPrefs` CAN carry a per-type map with no rules change.** `firestore.rules:64` validates only
`data.todoPrefs is map` — inner keys are unconstrained — and `todoPrefs` is already in the
user-update allowlist at line 531. **Phase 5 proceeds.** (`listView` was added this way last round
and persists correctly.)

## 5 · The pane's presence contract

`panePresence(card)` returns `{ tiles, figure, timeline }` and `TaskPane` renders each only when
true — `fig: null` puts `.nofig` on the band, `tiles: null` hides the row, `tl: null` drops the
timeline card. A note currently declares `{ tiles: true, figure: true, timeline: false }`, which is
why the screenshot shows a note carrying tiles at all. The two `ADDED` tiles come from
`paneFacts` returning both a wait label and an anchor noun that resolve to the same word on a card
with no query behind it; `SENT PREVIOUSLY / NONE SENT` is appended unconditionally by
`buildJourney`. Phase 3 removes all three for notes.
