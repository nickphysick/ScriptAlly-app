# To-do list — the row's four-icon hover cluster

**Ref** `design-refs/todo-iconcluster-v2.html` (commit 0). It supersedes `todo-splitguard-v1.html`
and `todo-weight-slider-v1.html` **for row actions only** — both stay in place as history, and the
weight sheet remains the authority for the snooze dial it also draws.

**Commits** `7a59b28` P1 the cluster → `3c5f846` P2 the destinations → `dd7db22` P3 the keys.

Mostly subtraction, as billed: the split button, its four guards, its two weights and the group
thread that carried them are gone, and what replaces them is four icons and a tooltip.

---

## Baseline, and a moving one

Recorded before editing: `tsc` **0** · `vite build` clean · Vitest **222/222, 3604 passed**.
`agentPicker.test.ts` — the permitted baseline red — was already **green**.

**It went red mid-session and came back.** Another stream was live-editing `agentPicker.ts` and
removed exports its own test still imported. I never touched either file; `tsc` reported **zero**
errors outside it throughout, and my own 43 files stayed green. It resolved before Phase 2 closed.

| | tsc | build | vitest |
|---|---|---|---|
| baseline | 0 | clean | 3604 pass |
| P1 `7a59b28` | 0 *(outside agentPicker)* | clean | mine: 43 files, 866 pass |
| P2 `3c5f846` | 0 | clean | **3614** |
| P3 `dd7db22` | 0 | clean | **3620** |

Explicit-path staging throughout; other sessions' index entries untouched in all four commits.

---

## Step 0 — what the recon changed

Two findings landed before any edit, and Nick accepted both:

1. **The primary opens the DOCK, not an anchorable flow.** `case "action"` → `openDock`, whose own
   note is a standing law: *two work surfaces would have to agree about what "done" means; there is
   one*. An anchored popover would have been that second surface. Icon 1 therefore opens the dock
   exactly as before.
2. **A tooltip primitive existed but sat behind the red gate** — `StatTooltip`/`useHoverShow` in
   `components/dashboard/`, its CSS in `dashboardV37.css`. Importing was permitted and would have
   worked; it would also have made the To-do page depend on the dashboard's component folder *and*
   its stylesheet to draw a 30px tooltip. Built on `lib/deskTooltip`'s pure placement instead.

Also confirmed: `SPLIT_NUMBER_KEYS` was **already extinct** (`6a2a1b5`), so Phase 3's removal task
was struck; no duplicate definitions of any selector this touched.

---

## Phase 1 — the cluster (`7a59b28`)

Four 30px icons, 5px apart, in a 152px track. **Nothing at rest**; they arrive on `:hover` **and**
`:focus-within` over 80ms, and on a coarse pointer they are permanent — keyed on the *input*, never
on screen width, because a narrow desktop window still has a pointer and a wide tablet still has
none.

**Only the first glyph varies**, and it derives from the same branches as the word.
`rowPrimaryIcon` walks `rowPrimaryLabel`'s order line for line, so glyph and tooltip are two
renderings of one answer; a separate table would be a second answer whose failure mode is a paper
plane above a tooltip reading "Close". **Locked in pairs.**

**The ref names four marks; the app raises seven.** Done, Snoozed and sweeps are states its panels
do not draw, and forcing them into one of the four would have put a paper plane on "Undo". They
take `Undo2`, `RotateCcw` and `ListChecks`. `Award` carries the offer — the closest the existing
lucide set gets, flagged rather than treated as obvious.

**An inapplicable icon dims in place and is never removed** — that is what keeps the cluster
fixed-width, so the column cannot reflow between rows. It is `aria-disabled` on a **live** button,
not `disabled`: a disabled button takes neither hover nor focus, so its tooltip — the only thing
explaining the dimming — would be unreachable by both inputs. The click is refused in the handler.

**The extinction lock caught a loose end.** The menu's focus-return hunted for `.tdg-split-p`
*inside* its anchor, correct when the anchor was the split's wrapper. With the caret gone the
anchor **is** the control, so `querySelector` would have found nothing and dropped focus to the
body.

The skeleton's action cell is now **empty**, which is the faithful shape: a placeholder for
something the loaded row does not draw is exactly the jump a skeleton exists to prevent.

### The tooltip

`RowTip` — 48 lines of code, inside the stated budget. Portalled and `position: fixed`, placed by
`placeTooltip`; hover **and** focus, 120ms delay-out, `role="tooltip"`. The clamp is the half worth
sharing: the cluster sits at row-**right**, so the fourth icon's tip would hang off the viewport
without it. It is a component rather than a `title` attribute because `title` appears on neither
keyboard focus nor touch — the two inputs that most need the teaching.

---

## Phase 2 — the destinations (`3c5f846`)

| icon | opens |
|---|---|
| 1 — the deed | the **dock** (a sweep takes `setFlow`/`FocusFlow`, unchanged) |
| 2 — snooze | `SnoozeDial`, anchored to the icon |
| 3 — dismiss | nothing. The row leaves and a receipt appears with Undo |
| 4 — more | the portalled menu |

**⚠️ Icon 1 takes over the surface, by design — say it plainly.** "Nothing opens a modal, the list
stays visible behind everything" now holds for **icons 2, 3 and 4 only**. Icon 1's deed is the dock,
and one work surface is a standing law in the very file a popover would have lived in.

**One snooze surface, four doors.** The menu wore the dial inline for exactly one pack — right
while it was the row's only control, but beside icon 2 it would have been a *second* snooze surface,
and two surfaces for one act is how they come to disagree about a ceiling. Icon 2, the menu's
`Snooze…` row, the `S` key and Snoozed's "Change the date…" all reach the same popover. Each door is
individually locked; `.tdg-mdial` deleted rather than left unreferenced. The body extraction
survives — the popover is still a wrapper around it.

**`Snooze…` opens the dial; it does not snooze** — and the *model* says which rows do that
(`opens: "dial"`), never a match on the id in the renderer. `snooze-1` is only what the permission
is asked about.

The menu duplicates snooze and dismiss **in plain language, with their keys** — the safety net for
anyone who never learns the glyphs. Dismiss needed no work: icon 3 already acts immediately through
`forkStale`, which writes its own Undo receipt. No dialogue, as specified.

### Two rules that changed, both stated as decisions

- **`.tdg-mkey` is back — a class I deleted last pack.** Different reason: it printed `1`/`2` beside
  two preset rows; it now prints the letters the cluster answers to, because the menu is where the
  glyphs get taught. The *bindings* stay extinct; only the printing returned.
- **A writer's own item completes from icon 1, duplicating its tick.** This breaks a rule the page
  held for two packs — `cardMenu` gives a user task no primary because the tick is the act. That
  held while the control was a button *printing a word*. The cluster's first slot is fixed and
  always drawn, so the alternative is a permanently dead icon down the whole of "Your tasks", and
  the ref draws the tick there too. `rowPrimaryLabel` gained **"Complete"** in the same branch
  position as the glyph's.
- **"Nothing is pre-focused" returns** — a rule suspended for one pack, not a new one. A control
  that opens on tomorrow and commits on Enter earned its focus; a column of verbs does not, because
  Enter would sit a slip from Dismiss.

---

## Phase 3 — the keys (`dd7db22`)

`↵` primary · `S` snooze · `X` dismiss · `.` more · `O` open the query · `E` edit.

**⚠️ `↵` and icon 1 were two calls, and they disagreed.** Enter called `onOpen(c)` — the dock,
whatever the row was — while the control resolved a per-column leaf. **On a Done row the button said
"Undo" and the key opened the dock.** `primaryId` is now the one derivation and `firePrimary` the
one call. Every added key asks `cardMenu` for permission exactly as its icon does; there is no
second table for the keyboard.

**`Escape` was `dismiss` and is now `close`,** because `x` needed the word. Shutting a surface and
putting a card away are different acts, and one name for both is how a handler comes to close a menu
when it meant to dismiss a task.

### `KEY_MAP` and the `?` overlay — what changed

| | |
|---|---|
| **Added** | `X` — "Dismiss the focused row — undo from the receipt" · `.` — "Open the row's menu" · `O` — "Open the query behind the row" |
| **Reworded** | `Enter` — now "Fire the primary verb — the first icon's deed" |
| **Removed** | nothing |

Asserted in **both** directions: every key an icon advertises must be in the map, and every key the
map advertises must be answered by a handler. The `X` entry is required to state the way back.

### ⚠️ One consequence for Nick to weigh

**Binding `X` forecloses the selection convention.** `SELECTION_NOT_BUILT` recorded that `x` was
deliberately unbound because *there is no batch model* to borrow. That conclusion still stands and
is still locked — nothing selection-shaped is half-built. But the cluster's third icon needed a key
and `x` is the obvious one for a cross, so **if selection is ever built, the mail-client convention
where `x` selects is no longer available on this page.**

The constant is rewritten rather than deleted, so the note cannot quietly change meaning. Mitigations
as shipped: dismiss is reversible from its own receipt, and the icon's tooltip prints the key rather
than leaving it to be stumbled into. If you would rather keep `x` free, the alternatives are `#`
(the mail convention for delete) or leaving dismiss to the menu only.

---

## Ref drift — the codebase won on all four

The ref's own `:root` is house-correct (`--burg:#7c3a2a`); the drift is in three literal
declarations. **So the ref can be corrected rather than left diverging:**

| ref | shipped | why |
|---|---|---|
| `#9c5a45` (`.ic.dz:hover` ink) | **`#7c3a2a`** | the canonical burgundy, 504 hits — and already `--burg` in the ref's own token block |
| `#f7e6e0` (`.ic.dz:hover` fill) | **`#faf0ea`** | 0 hits vs the app's own alert blush (the panel foot's "hot" state) |
| `#f2e9dd` (`.ic:hover` fill) | **`#faf6f0`** | 0 hits vs 16 — and already this stylesheet's own ghost hover |
| `#eadfd2`, `#c99b86`, `#c4b8ab` | *not used* | 0 hits each; none was needed by the cluster |

Icon set: **lucide-react**, already imported by this file. No new library, and no bare `.ti` class
(the Tabler collision) anywhere in the To-do CSS.

---

## Verified red — every lock seen to fail before it was believed

| lock | neutered how | result |
|---|---|---|
| nothing at rest | `.tdg-ic` opacity 0 → 1 | 1 fail |
| coarse pointer is permanent | the `@media` block deleted | 1 fail |
| the glyph follows the kind | a branch reordered | 2 fail |
| `Snooze…` opens the dial | `opens: "dial"` removed | 1 fail |
| one snooze surface | the inline dial re-mounted | 1 fail |
| the menu prints its keys | one `hint` removed | 1 fail |
| `X` is in the map | its entry removed | **3 fail** |
| `↵` is icon 1's deed | Enter reverted to `onOpen` | 1 fail |
| the keyboard asks `cardMenu` | the `offers` guard removed from dismiss | 1 fail |

---

## Manual browser checklist — none of this is verifiable in jsdom

- [ ] Rows are **clean at rest**; the cluster fades in on hover **and** on keyboard focus (Tab to a
      row — the icons should arrive without the mouse).
- [ ] Every icon's tooltip names the deed **and** shows its key, above the icon, on hover and on
      focus. The **fourth** icon's tooltip is the one to watch: at the window's right edge it should
      clamp inside the viewport rather than hang off it.
- [ ] Cluster width identical across all row kinds — sight down the column; no reflow between rows.
- [ ] **Offer row:** dismiss dimmed and inert, tooltip explaining why; snooze still live.
- [ ] **Done row:** `Undo2` glyph, and `↵` on the focused row does the same thing the icon does
      (this is the pair that used to disagree).
- [ ] **Your tasks:** icon 1 completes the item, same as the tick beside it.
- [ ] Icon 1 opens the **dock** — expected, and the one place the list is covered.
- [ ] Snooze dial opens from icon 2, from `S`, from the menu's `Snooze…`, and from Snoozed's
      "Change the date…" — all four landing in the same place.
- [ ] Dismiss removes the row with **no dialogue**; receipt appears with a working Undo. Then `X` on
      a focused row does the same.
- [ ] `.` opens the menu; `O` opens the query; `?` lists X, `.` and O.
- [ ] **Coarse pointer** (device emulation): all four icons permanently visible, dim ones still dim.

## Open

- **Phase 7 of tasks-consolidation (narrow and touch)** — still the only deferred item. The action
  track grew 118 → 152px, so the six fixed tracks now take ~704px at 800px wide; the narrow story
  is more pressing than it was, not less.
- **`x` vs selection** — Nick's call, above.
- **`Award` for the offer glyph** — the closest lucide gets; worth a look against the real page.
