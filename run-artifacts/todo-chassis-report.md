# To-do task pane — the chassis. Run report

**`design-refs/todo-materials-contract.html` did NOT exist.** Fifth time in this project a named
mockup has been absent. Worked from §2, which carried every value.

**Baseline:** 328 files · **5748 passed** · 2 skipped · 0 failed.
**Final:** 330 files · **5773 passed** · 2 skipped · 0 failed. +25 unit tests.
**Chassis assertions: 39 RED → 0 RED / 66 green**, measured on a real page at 1440×900 and 390×844.

---

## ⚠️ Premises in this brief that turned out false

The brief's own §0 was right about the page: the pane was **not** redesigned, the monogram and
agent-led title were there, the stat row was the old three-stat block. Those all checked out. Three
other things did not.

1. **§2's "300px timeline beside the form" does not fit this pane.** Measured at 1440: pane
   **350px**, rim 336, grid 286 — a 300px sibling left the form at **exactly 0px** while holding a
   fully rendered journey. That is the grid-collapse fault this codebase already documents, arriving
   through a *design value* rather than a flex chain. The story now stacks beneath the form until a
   **container query** says there is room (680px). It is still a sibling card in one grid, which is
   what §2's structural claim is about.
2. **The fourth door was not a permissive default.** The brief expected a switch with a bad
   fallback. `TodoDock.tsx:850` was a **hardcoded literal** — one sentence, *"Nothing is sent from
   here — this records what happened."*, on every card for all six buckets. Worse, because it did
   not branch at all.
3. **§2's card values conflict with a live cross-component lock.** §2 names `#ece4d9` / `14px`;
   the existing tokens are `--line` `#e6dccd` / `--r-lg` `12px`, and a *dynamic* lock couples them
   to the Query Centre's `.f12-card` so the two panels cannot drift silently. Phase B's own
   instruction — *"read the values from the live stylesheet where tokens already exist"* — resolves
   it: the card keeps its tokens, only the rim and the 6px reveal are additive. **The one design
   call I could not make unattended** (see the morning item).

Also: **another session is live in this checkout.** Uncommitted work under `src/`
(`OneScreenMark.tsx`) appeared and vanished between two consecutive commands, and HEAD moved under
me (`2c8f0f5`). Nothing of theirs was touched.

---

## Every assertion: red before, green after

Full artefacts: `pane-chassis-RED-before.txt` → `-after-A/B/C/D/E.txt`.

| # | assertion | RED before | green after |
|---|---|---|---|
| A1 | heading IS the deed | heading `"Elinor Hale"`, deed `"Log the close"` | heading = deed, ×5 |
| A2 | no monogram | `count=1` on every journey | `count=0` ×5 |
| A3 | no gendered pronoun | *already clean* — kept as a regression guard | green |
| A4 | rim: overflow + burgundy | `no rim element` | `hidden` + `rgba(124,58,42,0.28)` |
| A5 | card is pure white | `bg=null` | `rgb(255,255,255)` |
| A6 | band fills the rim | `[]` → `[rim,card,band,band]` | four bands, gaps `1,1,1` |
| A7 | group's own two stops | all bands `rgb(222,228,220)` (`.v-default`) | each group's own |
| A8 | no bucket pill in band | already green | green |
| A9 | tiles per presence | `tiles=0` on close/send/decide; `tiles=2` on note | 2 / 3 / 2 / 0 / 0 |
| A10 | "Sent previously", no "what they want" | `[]` | measured on send |
| A11 | absent-data grammar | (folded into A9/A10 — see deviations) | — |
| A12 | timeline is a sibling of the form | `story=false form=false` | `same-parent` |
| A13 | timeline per presence | `story=0` on three; `story=1` on note | 1/1/1/0/0 |
| A14 | foot hint is this journey's own | *stubbed `true` — not an assertion* | enumerated |
| A15 | nothing ellipsised | `["Nothing is sent from here — this records"]` | `[]` ×5 |

### ⚠️ Four assertions passed before I changed anything — I fixed the assertions

Per §4's own rule. Each was **vacuous**:

- **A1** checked only that the heading was not the *agency* — an agent's **name** satisfies that, so
  it passed on the exact build it was written to fail.
- **A10** ("no tile reads 'what they want'") is satisfied by having **no tiles**, which was the state.
- **A12** ("timeline not nested") is satisfied by the timeline being **absent**.
- **A14** was `add(..., true, ...)` — not an assertion at all.

And two more I got wrong in the other direction, corrected mid-run: **A6** sampled 2px into a 9px
rounded corner (boundary is 0.293 × 9 ≈ 2.6px) and reported a spill on a pane that has none;
**A10** over-applied "Sent previously" to every tiled journey when §4 scopes it to a Send.

---

## Per phase

| commit | phase | landed |
|---|---|---|
| `23895e1` | — | the suite + red proof, before any change |
| `c9c3d6e` | A | deed-first header; monogram removed, element **and** rule |
| `d94394c` | B | the rim as a real clipping container |
| `7aa0b24` | C | three group tints from `liveFamily` |
| `cdce6d1` | F | the fourth door; hint wraps instead of ellipsing |
| `9fad7a6` | D | tiles into the header, `panePresence` as one source |
| `e0d6575` | E | timeline as a sibling card; container-aware grid |
| *this* | G | chassis unit locks + report |

**What surprised me, per phase:**

- **A** — `card.title` is *not* the deed. On a close card it is "No response from Elinor Hale for 4
  months" while the list row says "Log the close". `rowDeed` is the list's own wording; using
  anything else gives one task two names. Only measuring caught it.
- **B** — the burgundy frame had been **deliberately retired** at `acdf126` ("a second border inside
  the first"). That note was right about *that* object. The new rim is the frame the band **fills
  to** — different object, same colour, and the `::before` prohibition it left behind is now §2's
  own rule too.
- **C** — **my own comment lied.** I wrote "these sit after `.v-default` deliberately" and inserted
  them *above* it; both are 0-2-0, so `.v-default` won and every band still measured sage. A7 caught
  it. The comment now records the mistake rather than repeating the claim.
- **D** — no "what they want" tile ever existed, so A10's negative half was vacuous; the actionable
  half was adding **"Sent previously"**.
- **E** — the 350px pane (above). Also: `PaneJourney` returns a **fragment**, so it needed a real
  container or each of its children would take a grid cell.
- **F** — the fifth-door sweep found **no fifth door of this kind**. Fifteen switch defaults exist
  over journey/bucket/task type; every one returns a lane, `null`, the card's **own** title, or a
  generic honest sentence. Closest relative: `todoColumns.ts:442`. Named, not changed.

**Nine locks went red and were re-pointed, never deleted** — each was true of the old pane and the
redesign inverts it. Two are worth knowing: the note's band asserted `"Your noteboard"` (a fallback
that existed to give the disc something to introduce), and the band-slice lock *forbade* the note's
own words. Both now assert the opposite, with the reason recorded in place.

---

## Deviations and choices this brief did not cover

1. **The card keeps its tokens** rather than §2's literals (above). Two declarations to revert.
2. **A11 folded into A9/A10.** The absent-data grammar ships (`.tdk-tilenone`, "Not recorded" /
   "None sent") but no tile on the harness account is currently empty, so a standalone assertion
   would have been vacuous. Locked at source instead.
3. **`.pj-hint` fixed too.** Phase F's brief covers the *card* foot; the *journey* foot had the same
   squeeze, worse (send: 51px / **7 lines**). Reported as pre-existing in Phase D, then fixed in E —
   once the hint became the sentence explaining the primary, leaving it unreadable was untenable.
4. **A note's column is `.tdk-noteown`.** Its words lived inside `.tdk-story`, so "no timeline on a
   note" could not be honoured without hiding the note.

---

## ⚠️ The one thing to look at first in the morning

**Whether the pane's card should match the Query Centre's panel or §2's table.** They differ by
`#e6dccd` vs `#ece4d9` and 12px vs 14px — invisible side by side, and a *deliberate* cross-page
match is what §2's literals would replace. I kept the tokens on Phase B's own instruction and made
the divergence a stated, asserted fact rather than a silence. **It is two declarations either way,
and it is a taste call, not an engineering one.**

Second: **the two-column threshold is 680px and nothing on this account reaches it**, so the
side-by-side timeline §2 describes has never actually rendered. Worth deciding whether the pane
should be wider, or whether stacked is simply the right answer for a 350px reading measure.

## Out of scope, named not fixed

The count disagreement (`13 · 13 of 12` here), materials storage (`Query.materialsWanted` vs
`Activity.materials`), the duplicate React key warnings — **which are dev-mode only and count 0 on a
production build**, established last run. Materials form, bulk table and Pro versions untouched.

**Nothing on the do-not-touch list moved.** No deploy. No behaviour changed: no derivation, no
write, no journey logic, no task generation — the diff touches only display helpers, markup,
stylesheets and tests.
