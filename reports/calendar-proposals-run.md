# The calendar proposals — verified, not deployed

**Session** `calendar-proposals` · 26 Aug · base `84aed934`

## 1 · Deployed or not

**NOT DEPLOYED — condition 4, for the sixth consecutive pack.**
`src/components/shell/workspacePageGrid.css` is another session's uncommitted shipping source. Not
mine; nothing of mine is left in the tree.

## 2 · There was nothing to build

The pack was **built on 22 August** and has been sitting committed ever since — `7e0f3b58` (the
ref), `0e3cea64` (the two fixes), `a672371e` (drag), `bd10cb66` (expected dates), `409e4490` (the
month jump), `3c7149aa` (the acceptance). All six are ancestors of HEAD and intact.

**Phase 5, the ICS feed, was never built and still cannot be.** It stopped at its own question 2:
nothing in the codebase authenticates a feed. An ICS subscriber sends no credentials, so **the URL
is the credential** — which needs a high-entropy per-user token, revocable without changing the
account, and not the uid. Where it lives, who mints it, what revocation looks like in the UI, and
whether one token covers the whole feed or one per manuscript are all yours. None is a code
question, and inventing a public auth surface unattended is the one thing the original pack
forbade.

## 3 · What I did instead: re-verify, and repair the acceptance

Five commits have touched the calendar since it was measured — three from other sessions plus my own
Pack C pane mount — so the 22 August acceptance was stale. Re-run at **1000 / 1440 / 1920** against
a local preview at HEAD:

- **record row** — context line and link, all three widths
- **expected dates** — six pills in September, the reply-window row reading the agent's stated weeks
- **month jump** — DEC navigates, Escape closes, hidden in Upcoming
- **drag** — seeded, ringed on dragover, the write landed, the feed re-derived, no cell overflow
- **cushion untouched**, `data-fold-short` absent

Two repairs, both to the measurement rather than the app:

**6b had gone stale by date.** It typed `25` and `27` — a few days ahead when written, yesterday and
tomorrow four days later. A past-dated task does not sit on its own day (the calendar rolls it
forward), so the seed appeared to vanish and the failure read like the drag being broken. Both days
are computed now. Same fault as `seed.mjs`'s today-relative `dateAdded`.

**The overlay case was asserting a surface I had superseded.** It expected `.cal-flow .tdb-ffsheet`
— the takeover a day-panel row used to raise. Pack C Phase 2 changed that row to open the TaskPane;
I retargeted `todoCalendar.test.ts`'s two locks then and **missed this one**. It now asserts the same
law against the surface that carries it, plus the half it was really guarding: no FocusFlow sheet
opens as well, because two layers over the month is the fault. Measured 440px, centred, on screen,
`dialog`/`aria-modal`, own scroll region, Escape closes and the day stays selected.

## ⚠️ 4 · One real defect, found and not fixed

**Toggling `Upcoming only` and back leaves the calendar showing more record entries than it did on
load.**

```
  on load          19 record pips · 31 pips total · 42 cells · first 27, last 6
  Upcoming only     0 record pips ·  9 pips total · 14 cells
  Done & upcoming  22 record pips · 38 pips total · 42 cells · first 27, last 6
```

The visible window is identical either side, and the initial reading is stable for five seconds —
so it is neither a loading artefact nor a different date range. `itemsFor`'s dedupe is pure and
mode-driven (`recordFor` returns `[]` when the layer is hidden, so an empty record restores every
superseded card by construction), which means the cause is not visible from reading it.

Pre-existing and not the proposals pack's. It is what the finishing pack's own lock now fails on,
and it is the only red left in `calLook`.

## 5 · Still open from the original pack — three rulings you owe

1. **Expiry copy for a passed expected date.** Today a window that has gone by simply stops
   rendering. Deliberate and safe, but arguably the most actionable thing the calendar could say.
   "Overdue" is banned by the copy laws, and dashed means provisional — the past is not provisional
   — so an expired item can neither keep its pill nor borrow a verdict. It needs a phrase and a
   treatment, both yours.
2. **Keyboard and touch drag.** Neither exists. Keyboard needs a roving-tabindex model the grid does
   not have; touch needs pointer events and a long-press, since HTML5 drag never fires on touch.
   Real gaps for real users, and a pack of their own.
3. **What the record-detail reduction lost** — `What went` (`r.detail`) and the exchange line are
   genuinely absent from the panel rather than relocated, though both live in the reading pane the
   link reaches. `exchangeLine` survives in the lib, unit-locked, so restoring it is one line.
