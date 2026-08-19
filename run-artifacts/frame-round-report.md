# To-do page — frame, command bar, filter & sort, snooze

## Premises that turned out false — read first

**1 · The contract was not in `design-refs/`.** It was in `~/Downloads/todo-frame-contract.html`.
Committed to `design-refs/todo-frame-contract.html`, md5 `a049f77d093816970daca31c4499c1c2`.

**2 · ⚠️ §5a's SUBJECT DOES NOT EXIST, AND §5 IS OUT ON THE BRIEF'S OWN INSTRUCTION.**
§5a says *"Today `LogQueryFocusForm` stamps `nudgeReminderWhen` onto every query at log time"*.
Searched: **there is no `nudgeReminderWhen` field anywhere in `src/`**, no
`week_before`/`day_before`/`on_deadline` vocabulary, and `LogQueryFocusForm` has **no reminder input
of any kind**. So §5a is not a storage correction — it would be inventing a per-query field, a
settings field, a resolution layer and a log-query UI from nothing.

§6a pre-authorises exactly this: *"If §5a proves larger than recon suggests, stop, revert it, build
§§1–4 only, and leave the gear out entirely rather than shipping a panel whose controls cannot do
what they promise."* **The gear is not built.** Assertions 11–15 belong to it and are not in the
suite. §§1–4 are complete.

**3 · §1's frame was already done, and its assertions were green before this round.** The Query
Centre match and the list port had already given the page the `wpg--fill` height chain and a card
that fills its column: measured before any change, `documentElement` overflow **0** at both widths
and list/pane bottoms **1px** apart. They are regression guards for the bar this round adds on top,
not work — and they are still green with it.

**4 · §3 says render through `PortalMenu`; the menus do not.** `PortalMenu`'s item model is the
board's card menu — `MenuItemId`, `MenuLeaf`, `weight`/`goes`/`danger` — and cannot express a
swatch, a live count, a multi-select tick or a footer with a reset link. Bending it to hold them
would change the card menu for every caller. What is reused is **`placeMenu`**, which is the part
the instruction protects: right-aligned, viewport-clamped, flipped-above. `AnchoredPanel` wraps that
plus Escape / outside-press / resize / focus-return, and serves **all three** surfaces — filter
menu, sort menu and snooze panel. One anchoring, three contents; not a third implementation of the
hard part. Deviation from §3's letter, recorded here.

**5 · Persistence needed no rules change.** `todoPrefs` is validated as `is map` with unconstrained
inner keys and is already in the user-update allowlist, so `listView` rides inside it. Checked
before building on it — a preference the rules silently deny is worse than a session-only one,
because it looks saved and is not.

## The assertions — red before, green after

`run-artifacts/frame-RED-before.txt` → `run-artifacts/frame-port.txt`.
**8 RED / 5 green before · 13 green after**, and the suite was run **twice** to prove no
order dependency.

| # | before | after |
|---|---|---|
| 1a 1440/1920 no doc scrollbar | green (guard) | green — 0px both |
| 1b 1440/1920 card bottoms align | green (guard) | green — Δ1px both |
| 2 no burgundy button fill | green (guard) | green |
| 3a meter segments = group counts | RED — no meter | green |
| 3b legend states the same counts | RED — no meter | green |
| 7a bar carries Snooze + Dismiss | RED — no bar | green |
| 7b enabled with a task selected | RED | green |
| 4 @1280 menu inside the viewport | RED — no menu | green |
| 4 @390 menu inside the viewport | RED — no menu | green |
| 10 Escape closes, focus returns | RED | green — focus back on Filter |
| 5 funnel active fill + badge dot | RED | green |

## Three faults the assertions found

- **The active funnel painted nothing.** `.l-icon.active` was ported under `.tdf`, but the toolbar
  lives inside `.tlc` — the class landed on the element and the rule never reached it. Measured
  `cls="l-icon active"` with `background: rgb(255,255,255)`. **A scoped port has to follow the
  element, not the document the rule was read from.** The rule moved to `taskList.css`.
- **An unknown group borrowed a family's tint.** `GRP_CLASS[g.id] ?? "house"` gave the Snoozed
  group a housekeeping dot *and* made it indistinguishable from housekeeping to anything selecting
  `.grp.house` — so the meter (three families) and the heads (four) could not be reconciled. A group
  the map does not know now renders a head with no tint.
- **The suite left the account filtered.** Assertion 5 turns a type off and the view *persists*, so
  the next run and every screenshot described a narrowed list — and on the second run the same click
  toggled Send back *on*, correctly darkening the funnel and failing the case. It now sets its own
  starting state and restores the default at the end.

## Two probe faults, both of the documented family

- **`offsetParent` is null for `position: fixed`.** Every menu and panel is fixed, so a visibility
  test built on it reported "no menu" about a menu that was open and measurable. Rect-based now.
- **The meter was compared against every group head**, including Snoozed, demanding a segment for a
  group §2 does not give one. The probe was wrong, not the meter.

## The third door, restored

The list round removed the row's hover snooze and left two doors — the `s` key and the pane. **The
bar's Snooze panel is the third**, and it is a better one: it names the deed it will act on, states
the return date before you commit, and says where the task goes. It writes through `snoozeCard`,
the existing primitive — one choke point, three doors.

`snoozeParts` was added to `elapsed.ts` (§4's "extend it; no second formatter"): a snooze is said in
the register of a choice — 1–6 days, 7–27 whole weeks, 28+ whole months — where `elapsedParts`
describes a wait's exact length. Same file, same conventions.

## Settings with no backing field (§8) — and a settings surface that already exists

⚠️ **THE GEAR IS NOT BUILT, BUT `/todo` ALREADY HAS A SETTINGS SHEET.** `TaskSettingsSheet` —
*"What lands on your desk?"* — is mounted in `ToDoPage` behind `settingsOpen` and already carries
**Stale threshold** (`todoPrefs.staleMonths`), **A good day is {n}**, **Roll unfinished work
forward**, **Weekly review briefing**, tags and set-aside. So §5's panel would have been a
**replacement**, not an addition, and that changes the decision: the choice is not "build a gear or
don't" but "re-house an existing sheet as an anchored panel, and add three settings to it". Worth
knowing before the next round picks this up.

Backing fields, for when it is built:

- **`Suggest closing after` — HAS one.** `todoPrefs.staleMonths` (choices 3/6/12/18/24) is exactly
  this setting under an older name, and it is already live in the sheet. §5's four choices
  (6 months · a year · 2 years · Never) are a re-labelling of it plus a `Never` value.
- **`Usual snooze` — none.** No field; `todoPrefs` would take it without a rules change.
- **`Remind me to nudge` — none, and this is the §5a finding.** No per-query field, no account
  field, no vocabulary, no input in the log-query flow.
- **The five type toggles — partially.** `mutedTaskRules` exists on the user and the sheet already
  touches it; whether it is per-rule or per-type needs its own recon.

## Gates

tsc 0 · production build 0 (whole output grepped) · vitest **329 files, 5557 passed, 2 skipped**
· framePort **13/13**, run twice.

Screenshots: `reports/frame/contract-{1440,1920,390}.png` and `reports/frame/page-{1440,1920,390}.png`.
