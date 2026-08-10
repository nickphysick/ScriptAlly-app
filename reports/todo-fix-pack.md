# To-do list fix pack — commit 0 and Fixes 1–3

**Refs:** `design-refs/todo-scroll-v1.html` (Fixes 1–2), `design-refs/todo-splitguard-v1.html`
(Fix 4, not started). A third ref, `todo-rowactions-v1.html`, was never supplied and was not
needed — its conclusion is carried by the split-guard file.

**⚠️ Fix 4 is NOT started.** It is the largest by some margin and the brief forbids beginning one
that cannot be finished. Its recon is complete and sits at the foot of this file.

## Gates

| | tsc | build | Vitest |
|---|---|---|---|
| **baseline** (before touching anything) | 0 | clean | **222 files, 3523 passed \| 2 skipped** |
| after each of Fixes 1, 2, 3 | 0 | clean | **222 files, 3523 passed \| 2 skipped** |

Baseline was already green, so the gate was "stay green" rather than "no worse".

**⚠️ The tree was dirty throughout, by authorisation.** Two other sessions were live in this
checkout: one with 29 paths staged (dashboard/shell, including `src/lib/todoBoard.ts`,
`src/lib/db.tsx`, `CLAUDE.md`), one unstaged plus untracked (Query Centre). Every commit used
`git commit --only -- <explicit paths>`; their index came through at 29 paths after each. None of
the forbidden files was read for edit, staged or committed.

---

## Fix 1 — the pinned block and the sticky heads (`ecf2ff1`)

**The complaint was "it will not scroll"; the fault was that the window was short.** The layout
chain has been correct and browser-verified since 9 Aug (`5864896`). Measured at 1440×900, the
pinned block ate **282px**, leaving the zone 570px — about seven rows — which reads as a page
clamped to one screen.

| piece | before | after | source |
|---|---|---|---|
| `.tdb-col` padding-top | 44 | **16** | `--tdb-chrome-gap` |
| eyebrow | 24 | 24 | content — untouched |
| title | 45 | 45 | content — untouched |
| tools margin-top | 16 | **8** | gap |
| tools row | 49 | **47** | padding-bottom 14 → 12 |
| `.tpl-cols` margin-top | 18 | **6** | gap |
| chips margin-top | 22 | **8** | gap |
| chips | 38 | 38 | content — untouched |
| `.tdb-centre` row-gap | 26 | **12** | `--tdb-hero-gap` |
| **pinned block** | **282** | **204** | |
| **scroll zone** | **570 (7 rows)** | **648 (8 rows)** | |

No control was moved, resized, restyled or reordered. Every pixel came from a gap.

**⚠️ The two largest are SHARED tokens.** `--tdb-chrome-gap` and `--tdb-hero-gap` are the
alignment contract's, so the Calendar and the Noteboard tighten by the same amount and stay level
with this page. The blast radius is deliberate — that is the contract working, not leaking.

**⚠️ `.tpl-head` was declared twice** in `tasksLayout.css` — `width` in one rule, `flex: 0 0 auto`
eighty lines below, both single-class. They never overlapped, which is exactly how such a pair
survives until the day it does. Folded into one rule.

**Sticky heads.** Added the `::after` hairline, riding the **head** rather than the panel: a rule
on the panel scrolls away with it and leaves a pinned heading with nothing closing it. It sits at
the opaque band's foot, not the box's, so the fade below still lets rows slide under. Ground
unchanged (27px opaque text band over a 10px translucent corridor — a designed fade). `z-index: 2`
confirmed above rows and below the portalled menu (`.tbd-menu2`, `z-index: 80`).

**Three locks retargeted.** The chrome-gap lock pinned the *number*, which made a deliberate design
change look like a regression; it now pins that the value is a token on `.tdb-wrap` feeding
`.tdb-col`'s padding — the property actually worth protecting.

## Fix 2 — the composer (`d10f728`)

**There was never a fixed height.** The card is a flex item of `.tdb-centre`, a height-constrained
flex column, and declared no `flex` — so it took the default `0 1 auto`, was shrunk below its
content, and its own `overflow: hidden` cut the tag row. **`flex: 0 0 auto` is the whole fix**; the
overflow stays, because it is what keeps the 13px radius honest against the segment fills.

The footer row replaces the inline Save, which sat at the end of the tag row competing for the same
line: hint (`ENTER SAVES · ESC DISMISSES`) · Cancel · Save.

**⚠️ The disabled Save uses the house inert grammar, not opacity.** It was `opacity: .45`, which
dims burgundy to a washed-out burgundy — a colour that still reads as the primary, only faded, so
the button looks broken rather than unavailable. Paper fill, hairline, faint ink, no shadow,
`not-allowed`. Never dashed: dashed is the empty-slot grammar and means something else.

Enter commits from the title; ⌘⏎ survives for the detail field, where a bare Enter is a new line.
Cancel discards outright — it is the control whose whole meaning is "I did not want this", and
asking again is the app not believing you; Escape still routes through the confirm, because Escape
is also hit by accident. The zone returns to its top one frame after the composer opens.

**Browser-measured:** card 197px and content-driven, `scrollHeight === clientHeight` (no clip), tag
row fully inside, footer order hint → Cancel → Save, disabled Save on paper at **opacity 1**.

**One lock caught a comment, correctly.** The composer bans notification vocabulary by blunt
substring; my new comment used the word "pushed". The ban is bluntly worded on purpose, so the
comment was reworded rather than the lock loosened.

## Fix 3 — the Pro band unmounted (`6b8d20a`)

A placement decision. `AssistantBand` and `AssistantPromo.tsx` are untouched and the modal is still
reachable; only the seat is gone. It was the last child of `.tdb-centre`, taking its own height
*plus* the column's row-gap out of a scroll zone that was already too short.

**⚠️ It must not simply be moved back.** It was fed `tiles.housekeeping` and `shownY` — MEMBER-unit
counts, every sweep uncollapsed — while "Outstanding" beside it counts CARDS. That is the
"38 of your 44 tasks" against an Outstanding of 16 seen in production, and it is the same units bug
board-optimise P5 fixed elsewhere. **Whoever re-places the band fixes the units first.** Recorded
in `reports/STATE.md`. Deliberately not fixed here.

---

## ⚠️ A finding outside the brief — the parked sweep has a dependency

`todoBoard.css` is **not dead**. `PortalMenu` — live on this page, and the intended host of Fix 4's
split menu — renders `.tbd-menu2` / `.tbd-mi`, and those rules live in that file. A board-era sweep
that deletes it would strip the styling off a menu very much in use. Consume, never edit. Recorded
in `reports/STATE.md` against the parked sweep.

## Manual browser checklist

Verified during this session (harness against the built CSS, then deleted):

- ✅ Pinned block 282 → **204px** at 1440×900; zone 570 → **648px**; the zone reaches its last row.
- ✅ Composer: content-driven, no clip, tag row fully visible, footer order, inert Save.

Still manual, and **not** verifiable in jsdom:

- Scroll zone reaches the last row of Done at **900px and 1400px** viewport heights.
- Each group head pins and releases as the next arrives; no row readable through a pinned head.
- Composer: Save disabled on empty title; **Enter saves**; **Esc dismisses**; Cancel discards.
- The Calendar and Noteboard tops still sit level with the To-do list after the shared-token change.

## Fix 4 — recon, so it can start cold

Everything below is confirmed; no red gate fires.

- **Grid:** `todoGroups.css:153`, last track `216px` → `118px`. Single definition.
- **What to delete:** `.tdg-verbs`' four-column grid and `.tdg-slot` (`todoGroups.css:319, 326`,
  one definition each) and **four `tdg-slot` occurrences** in `TaskList.tsx`, plus the standalone
  snooze and dismiss icon buttons.
- **Wiring is already right and must not change:** snooze and dismiss have **no local
  implementations**. Both ask `cardMenu` for permission and route `performCardVerb` → `snoozeCard`
  (via `clampSnooze`) / `dismissTask`. The split's menu changes what invokes them, never the path.
- **Receipt exists — extend, build nothing.** `useTodoToast`: `flash(msg, action?)`, `warn`,
  `dismiss`, `pause`, `resume`, `remember(key, fn)`, `recall(key)`. Already bottom-left, 8s, one at
  a time, hover-pausing.
- **Menu host:** `PortalMenu` (`position: fixed; z-index: 80`), classes from `todoBoard.css`.
- **Number keys:** `lib/taskShortcuts.ts` already owns the page's key decisions (`listKey`,
  `worksTheList`, `focusesSearch`, `KEY_MAP`) and is where `1` / `2` belong. `KEY_MAP` drives the
  `?` overlay, and a lock walks it — any key added there must be answered by a handler.
- **Duplicates:** none among the selectors Fix 4 touches.
