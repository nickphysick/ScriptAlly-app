# Set aside & tags — restoring the two features the sheet took with it

`6de4856a` unmounted `TaskSettingsSheet.tsx`. It was believed to hold preferences only; it also held
the ONLY mount of `TagsSheet` and the ONLY caller of `hiddenItems()`, so tag management and the
set-aside ledger went dark on `main` and on dev. Nothing failed, nothing errored, and no test went
red — which is the whole shape of the fault: **an unreachable feature and a working feature are the
same file.**

Five phases, five commits. Nothing deployed.

| | |
|---|---|
| `ac112509` | Phases 1–2 · the one door, its two panes |
| `97d46fce` | Phase 3 · `/account/tasks` keeps preferences, hiding goes back to the board |
| `c5dc4c89` | Phase 4 · the sheet retires; every lock it held moves to something live |
| `e3057dcc` | Phase 5 · the gate — 11 measurements, three kinds of hiding |

## What the door is

**One door, `Set aside & tags`, on the list's tool row**, third beside filter and sort — an
`AnchoredPanel` in its `panel` variant, the board's own established door (the filter menu, the sort
menu and the snooze panel are the same component). Two tabbed panes:

* **Set aside** — every hidden thing in one list: rule mutes, permanent dismissals and live
  snoozes, each with a Restore.
* **Tags** — the retired sheet's `TagsSheet`, verbatim CRUD, as `TagsPane`.

The door carries a marker when the ledger holds anything, from the same `hiddenItems()` the pane
reads — so the two cannot disagree.

### Three decisions worth stating

**One door, not two.** Both panes answer the same shape of question — *what have I put out of the
way, and how do I get it back* — and the tool row already carried two controls. A third and a
fourth make it a menu bar.

**The empty state is a REVERSAL, deliberately.** The old ledger hid at zero: *"an empty ledger
offers no door to open"* was locked as a rule. It is inverted. A door that appears only once you
have set something aside is unfindable at the moment you need it, because the person looking has
just hidden something and does not yet know the surface exists. It is always reachable and says
plainly when it holds nothing. The lock records the reversal rather than quietly dropping the old
assertion.

**Restoring is BOARD work, which is why it is not in settings.** It needs the item's name, its
return date and the context of the list it came from. Nobody opens account settings to un-hide a
task. The rule mutes came back here with the other two kinds, so there is ONE place for hiding
again — splitting them across two surfaces was the "two places to change one thing" fault the old
sheet existed to prevent, wearing different clothes.

## What `/account/tasks` keeps

Two preference groups and nothing else: **Your to-do list** (roll-forward, weekly briefing, the
stale window) and **What appears on your list** (the optional task types, with `decide` stated as a
plain line because `todoPrefs` forces it true and a switch that cannot act is not a switch).
`mutedRuleRows`, `unmute` and `MUTED_EMPTY_LINE` were **deleted, not parked** — a second, narrower
derivation surviving beside `hiddenItems()` is how two surfaces come to disagree about what
"hidden" means.

## The gate

Measured against a `vite preview` of the dev build, signed in, at 1440. **11/11.**

```
LEDGER
  rule      Stale queries                        ·  MUTED AS A RULE
  rule      Missing submission material details  ·  MUTED AS A RULE
  dismissed Elinor Hale — record gap             ·  DISMISSED
  snoozed   Tom Ellery — nudge                   ·  SNOOZED UNTIL 30 Aug

restored rule      "Missing submission material details" — rows 4 → 3
restored dismissed "Elinor Hale — record gap"            — rows 3 → 2
restored snoozed   "Tom Ellery — nudge"                  — rows 2 → 1

while muted   · housekeeping 2 · "Consider closing" absent
after restore · housekeeping 4 · "Consider closing" is back

ledger now 0 rows · "Nothing set aside…" · door marker: 0
```

Tag CRUD acted on, not read: rename through the real `normaliseTagLabel` (typed `Second Draft`,
stored `seconddraft`), recolour (sage → butter, swatch measured changing), the arm-then-confirm
guard (first click armed and deleted nothing), the confirmed delete removing exactly one of two.

Overlap gate: seven sections × 1440/1024/800 × rest and stressed — **zero overlaps**.

### Two faults the pictures found

Neither was visible to any source lock, and both were about a control landing in the wrong place.

* **The ledger row wrapped.** "Missing submission material details" pushed its Restore onto a
  second line while its three neighbours kept theirs on the right — one control in two places in
  one list. `flex-wrap: nowrap`; every Restore now measured at x 595.
* **The tags row ran past the panel and clipped "Delete"** — the one control with a confirmation
  guard in front of it, lost to a width. Controls take their own line now, measured at the
  24-character maximum `normaliseTagLabel` allows: widest overhang −2px.

### And two ordering bugs in the checks themselves

Worth more than the faults, because they are the general case. These run against one real account
and restoring is **destructive**:

* a first-row round trip ate the seeded rule, and the per-kind check then reported the rule kind
  missing;
* a geometry check placed last found an empty ledger.

Both reported working code as broken. `setAside.measure.ts` now **declares its order** — checks
that READ a populated ledger first, checks that CONSUME it after, with `RESERVED_RULE` held back
for the board check — and every wait is a **poll on the state**, not a sleep, after the same
restore measured 2 → 4 on one run and "STILL ABSENT" on the one before it.

The precondition is asserted before the claim, twice. The first rule tried was `dq_mswl`, which
qualifies all twelve agents on the harness account and **still renders no card** — so "absent while
muted" would have been satisfied by a mute that did nothing at all.

## ⚠️ Out of scope, reported not fixed: three modals render retired classes

`68c76c62` retired the calendar day modal and removed `.cal-dayscrim` / `.cal-daypanel` / three
siblings *"page and stylesheet together"*. The stylesheet half happened. Three live modals still
render the class names:

| | |
|---|---|
| `ToDoPage.tsx:2037` | the tag sheet — `.cal-dayscrim` + `.cal-daypanel tdb-tagsheet` |
| `TodoNoteboardPage.tsx:314` | the date panel |
| `TodoNoteboardPage.tsx:335` | the tag panel |

**Neither class carries any CSS anywhere in `src/`.** `.nb-datepanel` contributes a width to the
two noteboard panels; `.tdb-tagsheet` has no rule at all, so `ToDoPage`'s tag modal has no scrim,
no panel chrome and no width — it renders as bare flow content over the page.

This is why `SetAsidePanel` composes `AnchoredPanel` instead: following that pattern would have
made a fourth. Left as Nick directed — the fix is a decision about what those three modals should
be, not a rename.

## Running the checks

```bash
node tests/e2e/seedSetAside.mjs        # the three kinds + two tags
SA_E2E_BASE_URL=http://localhost:4193 npx playwright test tests/e2e/setAside.measure.ts
node tests/e2e/seedSetAside.mjs --clean
```

⚠️ Measured in a **worktree**, not the primary checkout: another session was editing `src/` and the
bundle went stale inside the setup step twice. `dist/` and `src/` are shared, and `bundleGuard`
correctly refuses to measure a bundle whose sources moved after it was built.
