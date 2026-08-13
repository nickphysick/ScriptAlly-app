# Query Centre — rhythm, scope, and the journey arc

Ref: `design-refs/88-qc-fill.html` (Distributed). Commits `5efeab2` → `41056a2`. **Not deployed, not pushed.**

---

## 1 · The height chain, before and after

Measured at 1440×900 on the real bundle. `.f12-root` and `.wpg` are 809.8 in every state.

| link | rest | create before | create after | how it sizes |
|---|---|---|---|---|
| `.ws-window` | 811.8 | 811.8 | 811.8 | `flex: 1` |
| `.wpg-scroll` | 695.8 | 757.8 | 757.8 | pad `70/0` → **`18/0`** rest; `35/97` → **`9/0`** working |
| `.f12-body` | 625.8 | 625.8 | 625.8 | `flex: 1 1 0%` — fills |
| `.qp-pane` | 613.8 | 613.8 | 613.8 | `flex: 1 1 0%` — fills |
| `.qc-take-body` | — | 487.8 | 487.8 | `flex: 1 1 0%` — fills |
| `.qc-two` | — | 487.8 | 487.8 | `flex: 1 1 0` — fills |
| `.qc-form` | — | 487.8 | 604 | `flex: 1 1 0` — fills |
| `.qc-stack` | — | **167, at the top** | **167, at the foot** | `flex: 0 0 auto` + `margin-top: auto` |
| slack below the stack | — | **320.8px of void** | **0** | |

**§2a's premise was wrong and is dropped.** Nothing needed filling — every link already carried `flex: 1 1 0%` and already reached the bottom. The void was *inside* `.qc-form`, beneath a `flex: 0 0 auto` stack sitting at the top of it. The fix is `margin-top: auto`: **distribution, not fill**. A `min-height: 100%` chain would have changed nothing visible and left a second sizing mechanism arguing with the first.

The reference panel took `align-self: stretch` plus its own flex column, last row taking the slack. **The `position: sticky` was deleted with it** — a panel that *is* the column's height has nothing to stick to, and a dead property reads as load-bearing.

### Browser-measured fill, all three sizes

| | 1024×768 | 1440×900 | 1920×1080 |
|---|---|---|---|
| create — slack below stack | −38.8 † | 0 | 0 |
| record — slack below stack | 0 | 0 | 0 |
| record — panel height | hidden ‡ | 604 (= column) | 784 (= column) |
| record — panel slack to foot | — | 0 | 0 |
| page scroll, both journeys | 0 | 0 | 0 |

† negative = the column's content exceeds it and scrolls internally; the stack is at the end of the content, which is correct — it is not a void.
‡ `display: none` below 1100px, the documented rule ("the measured point at which the panel stops helping"), the same one the create context panel follows. The gate asserts *that rule* rather than skipping silently.

---

## 2 · Where the invariance padding ended up

**Removed on this page, kept intact shell-wide** — and it was doing nothing here.

`--wpg-reclaim-pad` (97px) keeps max scroll identical between header states so `scrollTop` cannot be clamped and the collapse cannot oscillate. That guards a page whose **row** scrolls. Query Centre's never does: it is a fill page, the list and panes scroll internally, and `scrollHeight − clientHeight` measured **0** in browsing, create and record. 97px at the foot of a scroller that cannot scroll is 97px of nothing — and with the dock below it, 97px of nothing *between* the content and the dock.

⚠️ **Write this down for whoever copies the dock.** Row 3 is `minmax(0, 1fr)`, so **a dock's height comes out of the scrollport**. A dock that appears in one header state only changes `clientHeight` in that state and adds a term the reclaim does not know about. Harmless here because there is no scroll to clamp. On Contact list or Manuscripts it would put the oscillation straight back — that page must extend `--wpg-reclaim-pad` to cover the dock.

---

## 3 · The toolbar, by scope, and where each control went

| control | acts on | handler | went to |
|---|---|---|---|
| Search | **list** | `setListSearch` | grid `toolbar` row |
| Filter | **list** | `setFilterPopOpen` | grid `toolbar` row |
| Sort | **list** | `setSortPopOpen` | grid `toolbar` row |
| View tasks | selected query | `setIsTasksOpen` | kebab |
| Nudge | selected query | `setIsNudgeOpen` | kebab (greyed unless the agent holds the ball) |
| Agent | selected query | *none* | kebab, greyed — "Coming soon" |
| Manuscript | selected query | *none* | kebab, greyed — "Coming soon" |
| Download as PDF | selected query | `handleDownloadPDF` | kebab |
| Delete | selected query | `askDeleteQuery` | kebab |

**Every control in the pane toolbar was gated on `!sel`.** A row of six verbs dead until you pick something is not a command bar; it is a list of things you cannot do yet. They are one kebab in the reading pane's hero, beside the primary that acts on the same query, through **`F12Menu`** — the menu this page already portals three others through. (`PortalMenu` is To-do's; using it here would have put two menu components on one page, which is what "don't roll a second menu" forbids.)

**View tasks and Nudge sound page-level and are not.** In the list strip they would be dead whenever nothing is selected — the exact fault the split exists to remove.

The list strip moved into the grid's `toolbar` row, which this page had never used — which is why those three read as the list's chrome rather than the page's.

---

## 4 · The rest state

| | before | after |
|---|---|---|
| band → content | 70 + 12 inline = **82px** | **18px** |
| subtitle | "Every query you've sent, and exactly where each one stands." | **"20 queries · 9 awaiting reply"**, mono |
| shared `--content-top-gap` on Contact list | 70px | **70px** — asserted unchanged |

The 18px is page-scoped and sets the **resolved** value, not the `-rest`/`-work` pair: `:root` computes `--content-top-gap: var(--content-top-gap-rest)` *at `:root`*, so overriding `-rest` lower down changes nothing. Setting `--content-top-gap` on `.qc-wpg` (0-1-0) would then tie with `.wpg--working` (0-1-0) on the same element and be decided by bundle order — the collision recorded twice in CLAUDE.md. Both states are named at 0-2-0.

Both counts compose `queryBucket`, the same function the filter pills and `getPrimaryAction` read, manuscript-scoped like `queriesPulse`. **The awaiting clause omits itself at zero** rather than printing "0 awaiting reply".

---

## 5 · The place line and the consequence line

```
create   Your 21st query for The Smoke Test · 9 currently awaiting reply
record   You sent this 25 days ago · the 11th reply you've recorded for The Smoke Test
dock     Nothing saved yet  →  Saves as Rejected · closed — the row will offer Record response
```

Locked against appraisal — `only|already|just|still|keep|going|great|streak|on track|behind|ahead` and any `!` — across five rendered samples, and against instruction (`remember|don't forget|make sure|should|need to`) across every status. The consequence line is asserted to promise exactly what `getPrimaryAction` returns **for every status**, against the engine rather than a literal.

⚠️ **`OUTCOME_STATUS`, not a cast.** `respDraft.outcome` is a key — `"rr"`, `"noreply"`, `"rejected"` — and `as QueryStatus` typechecks while producing a value the enum never contains. Measured before the fix: the dock read *"Saves as rejected"* in lowercase, `getPrimaryAction` fell through to its default, and the line promised *"closed — the row will offer Record response"*, contradicting itself in one sentence.

---

## 6 · The dock

- **Row 4 of the grid** — outside the scrollport by construction, not by a sticky that must keep winning. Measured flush to the working area's foot (`gapToFoot: 0`), unmoved after a 400px wheel over the step column, 1px hairline above, translucent ground.
- **Desktop only.** `.qh-mcmd` is this page's floating command bar below md and carries the Mark-sent anchor; two bottom bars over a tab bar is what rendering both would give.
- **`.sa-toasts` at z:300 floats over it, and that is correct** — a receipt should sit above the control you just used, never push it.
- **"Save & log another" is create-only** — a response belongs to one query, so there is no next one to move on to.
- ⚠️ **The session tally nearly went with the buttons.** It sat inside the action cluster and is *progress* — the header's half of the split, not the dock's. Caught by its own lock.

---

## 7 · Checklist

Green against **localhost** (this pack does not deploy), 13 Playwright cases:

| check | result |
|---|---|
| rest top offset = 18px | ✓ |
| shared gap unchanged on Contact list (70px, token and applied) | ✓ |
| masthead states both counts, in mono | ✓ |
| list strip = Search, Filter, Sort only | ✓ |
| no `!sel`-gated verb in the strip | ✓ |
| pane toolbar gone | ✓ |
| kebab present in the hero, via `F12Menu` | ✓ |
| create distributes at 1024 / 1440 / 1920 | ✓ |
| record distributes at 1024 / 1440 / 1920 | ✓ |
| panel flush to the foot (1440, 1920); hidden by rule at 1024 | ✓ |
| no sticky survives on the panel | ✓ |
| place line renders in both journeys | ✓ |
| dock outside the scroller, flush, hairline | ✓ |
| dock stays put while content scrolls | ✓ |
| consequence line: empty state, then updates with the outcome | ✓ |
| "Save & log another" in create only | ✓ |
| reduced motion → `animationName: none`, dock at its foot | ✓ |
| no viewport unit in the height chain | ✓ (unit lock) |

**Left for your eye:** the kebab on a selected *and* an unselected row (the greyed-and-inert grammar); both journeys with a genuinely long stack, where the distributed composition has least slack to distribute; and whether the dock's translucent ground reads as a surface or as a wash at 1920.
