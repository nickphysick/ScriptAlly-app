# `design-refs/todo-materials-contract.html` — inventory

**The file did not exist at the named path.** Three byte-identical copies were in `~/Downloads`
(all md5 `1d4d72ee58d818ec47951488dd7954ed`); the newest is now committed to
`design-refs/todo-materials-contract.html` so this run and every later one read one artefact.

Its own footer states its authority: *"layout, copy and states are binding · **values come from the
live stylesheet**"* — which matches the instruction: stylesheet wins on colour, contract wins on
structure.

---

## 1. How many cards, and what is in each

**Three**, in a `.v` flex column (`gap:16px`):

```
.v
├── .fc > .rim            card 1 — HEADER:  .band  +  .tiles
└── .workrow              grid: minmax(0,1fr) 300px · gap 16 · align-items:start
    ├── .fc > .rim > .act card 2 — FORM
    └── .fc#tlwrap > .rim card 3 — TIMELINE
```

Every card is its own `.fc` with its own `.rim`. The workrow is a **sibling of the header card**,
not nested in it.

## 2. Outer card and rim

```css
.fc      { background:var(--white); border:1px solid var(--edge); border-radius:14px; padding:6px; }
.fc>.rim { border:1px solid var(--rim); border-radius:9px; overflow:hidden; }
```
`--edge:#ece4d9` · `--rim:rgba(124,58,42,0.28)` · `--rimline:rgba(124,58,42,0.13)` (internal dividers).

## 3. The three band gradients

| group | class | gradient (135deg) | bottom rule (`.band::after`) |
|---|---|---|---|
| needs you now | `.u-now` | `#f3e0d6 → #eed7ca` | `rgba(124,58,42,0.16)` |
| housekeeping | `.u-house` | `#d7ddd5 → #d5dbd3` | `rgba(90,110,88,0.20)` |
| your tasks | `.u-yours` | `#f7f0e2 → #f2e9d6` | `rgba(138,116,64,0.16)` |

The group class sits on `.v` (the column), not on the band — `.u-now .band{…}`.

## 4. The band, left to right

`padding:20px 24px 18px` · `display:flex` · `align-items:flex-start` · `justify-content:space-between`.

- **Left:** `.deed` (Playfair 27px/500, `--ink2`; `em` → italic `--burg`; `.u-house .deed` is
  `#2e3a2c` with `em` `#405a3c`; a note's deed may be `.hand` — Caveat 30px) then `.b-sub`
  (11.5px/300, tinted per group: `#8a6558` / `#5f7059` / `#8a7a5c`).
- **Right:** `.bandfig` — `.n` Playfair 33px/500 over `.u` mono 8.5px/`0.13em`/uppercase — then
  `.bandbtns`. With no figure the band takes **`.nofig`**.

**NOT in it** — the contract says so in its own note strip: *"No pill or tier label in the band —
the deed names the task · never 'his' or 'hers', always the first name."*

## 5. Tiles

```css
.tile      { padding:14px 20px 15px; border-right:1px solid var(--rimline); }
.tile:last-child { border-right:0; }
.tile .k   { mono 8.5px · 0.14em · uppercase · --muted · 500 }
.tile .val { Playfair 16px/500 · --ink2 · margin-top:5px }
.tile .val small { Inter 10.5px/300 · --muted2 · display:block }
.tile .val.absent{ #c0b0a0 · mono 10px · 0.1em · uppercase }
```
Absent data is the muted mono treatment — the contract's own examples are **"No date set"** and
**"Nothing"**.

## 6. The timeline

Card 3, **beside** the form in `.workrow` (`minmax(0,1fr) 300px`, gap 16, align-items start) — a
sibling, never nested in the form.

- **Header** `.tl-head`: `.t` (mono 9px/0.14em/uppercase) + `.c` (mono 8.5px, `#c0b0a0`) — a title
  and an entry count, on a `--rimline` bottom border.
- **Body** `.tl-in` (white) → `.tl` with a 1.5px rail and `.tl-e` dots: burgundy default,
  `--sage` for `.in`, small grey for `.minor`, filled for `.now`.
- **Footer** `.tl-foot`: one mono 9px `--burg` link, on a `--rimline` top border.

## 7. Presence, read from the contract's own `DATA` table

| journey | key | group | figure | tiles | timeline |
|---|---|---|---|---|---|
| Send | `now` | `u-now` | **yes** `4 days with you` | **yes** | **yes** |
| Chase | `house` | `u-house` | **yes** `71 days waiting` | **yes** | **yes** |
| Materials, single | `fix1` | `u-house` | no | no | **yes** |
| Materials, bulk | `fixN` | `u-house` | no | no | no |
| Note | `yours` | `u-yours` | **yes** `2 days on your list` | **yes** (Added · Due · Attached to) | no |

⚠️ **This contradicts the previous brief's §2**, which said a Note has *no* tiles and *no* figure.
The contract gives it both, and only withholds the timeline. Flagged in the difference table.

---

# The difference table — the plan

Read from the live code, not from memory. **S** = structural (contract wins) · **C** = colour
(stylesheet wins) · **L** = layout instruction from the brief (overrides both).

| # | kind | contract says | code does | file · line |
|---|---|---|---|---|
| D1 | **S** | **Three** `.fc>.rim` cards: header, form, timeline — the workrow a **sibling** of the header | **One** card. `.tdk-rim` wraps band + tiles + form + timeline together; `.tdk-jform` and `.tdk-story--card` are plain divs with no card or rim of their own | `TodoDock.tsx:380` (sole rim), `:530`, `:547` · `todoDock.css:936`, `:888` |
| D2 | **S** | `.workrow` sits **outside** the header card | the grid sits **inside** the single rim, below the tiles | `TodoDock.tsx:530` |
| D3 | **S** | Form card is `.fc>.rim>.act`, `padding:21px 24px 22px` | `.tdk-jform` is `display:flex;min-width:0` — no card, no rim, no padding | `todoDock.css:936` |
| D4 | **S** | Timeline card is `.fc#tlwrap>.rim`, header **and** footer on `--rimline` borders | `.tdk-story--card` is one padded box; header exists, footer link exists, but no rim and no card | `todoDock.css:888` |
| D5 | **S** | Group class on the **column** (`.v.u-now .band{…}`) | group class on the **band** (`.tdk-band.g-urgent`) | `TodoDock.tsx:377` |
| D6 | **S** | Note (`yours`): figure `2 days on your list` + 3 tiles (Added · Due · Attached to), **no** timeline | Note: `panePresence` → all three **false** | `todoHandoff.ts` `panePresence` |
| D7 | **L** | frame `372px minmax(0,1fr)` | `--tdw-rail-w: 372px` fixed + a `@container (max-width:780px)` stack | `todoSplit.css:54`, `:92` |
| D8 | **L** | `.workrow` plain grid `minmax(0,1fr) 300px` | `@container (min-width:786px)` gate; single column below | `todoDock.css:876` |
| D9 | **L** | `.tiles.n4/.n3` fixed counts | `.tdk-tiles` flex + `@container (max-width:360px)` 2-up | `todoDock.css:825` |
| D10 | **L** | — | two more container queries on the foot hints | `todoDock.css:445`, `paneJourney.css:294` |
| D11 | **S** | band `padding:20px 24px 18px`; `.nofig` when no figure | band pads differ; no `nofig` modifier rendered | `todoDock.css` `.tdk-band` |
| D12 | **S** | deed Playfair **27px**; sub margin-top 6 | deed **26px** | `todoDock.css` `.tdk-deed` |
| D13 | **S** | tile `padding:14px 20px 15px`, `.k` 500 weight, `.val small` sub line | tile padding differs, no `small` sub line rendered | `todoDock.css` `.tdk-tile*` |
| D14 | **C** | `--edge:#ece4d9` | `var(--line)` `#e6dccd` — **stylesheet wins, no change** (settled last run) | `todoDock.css` `.tdk-w` |
| D15 | **C** | `--rimline` `rgba(124,58,42,0.13)` for tile dividers | same value already | — |

**Not differences** (already match): rim border/radius/overflow · the three gradients and their
bottom rules · deed inks per group · sub tints per group · absent-data mono treatment · "no pill
or tier label in the band" · no gendered pronouns · the timeline's mono header + count + burgundy
footer link.

## Order of work

1. **D7–D10 first** — strip every container query and the fixed rail, per the fluid-layout
   instruction. This changes the ground the rest sits on, so it goes first.
2. **D1–D4** — the three-card split. The largest change and the point of the run.
3. **D5, D11–D13** — band/tile detail.
4. **D6** — the Note's presence. ⚠️ Contract vs the previous brief's §2. Contract wins per the
   instruction; flagged for confirmation.
