# Query Centre — drawer chrome (stage block) + desk bounds + illustration slots

Run of 5 Sep 2026 · ref `design-refs/query-panel-v9-stage-block-desk-card.html` (sha256 e93c658c…, verified, committed + enrolled `986aba78`; locked to chrome D and geometry 1 — the ref's toggles are comparison-only). Commits `986aba78 → b8dd92c7` + the harness/report commit. Gate: run in an ISOLATED worktree at HEAD plus this pass's files only — the shared tree carried the calendar stream's live v65 edits throughout (their `TodoCalendarPage.tsx` tsc error and `paneCommit.test.ts` red exist at HEAD without my files; theirs to retarget as their pack lands). Isolated: tsc 0 · 7,359 passed · 1 pre-existing fail · build clean.

---

## False premises and surprises, first

1. **"The desk is still clipping" — at rest it never was; the clip needs a TRANSFORM.** Measured before fixing (the brief's order): with Record response open on the deployed pass-3 build, the card sat at `top 122 = window.top + 12`, bottom 424 ≤ 868, at 1440 AND 2560 — the contract, already. And the "missing" top strip exists as `border-top: 5px var(--stage-accent)` (my first probe asked `::before` — the wrong instrument, kept in the record). What the screenshot caught is the OTHER state: the desk mounted inside `.wpg-scroll` → `.qc-wpg[overflow:hidden]` → `.ws-window`, and a `position: fixed` element inside a **transformed** ancestor is contained by it — at which point those `overflow: hidden` boxes really do clip. The StagePage enter animation is exactly such a transform (its class self-clears, but the desk can open inside the window). The fix is structural, not arithmetical: **the desk portals to `document.body`** — the harness now asserts the ancestor chain between card and body is empty, so no ancestor can ever contain or clip it again.
2. **Geometry 1 changes the desk's placement law.** v5's card centred on its anchor (`centre − 42`, clamped); v9 locks **top-anchored** — `top = window.top + 12`, always, "the notch may sit anywhere along the card's right edge (it does not move the card)". The anchor now reaches only the notch. The §2 contract's `≥`/`≤` bounds are satisfied by equality at the top.
3. **The probe's own `::before` reading was wrong twice over** — recorded because the false reading nearly became the finding: the strip is a border, and `stripVisible: n/a` said "no pseudo-element", not "no strip".

## §1 · The stage block *(commit b8dd92c7)*

Band, identity row and manuscript line share `background-color: var(--band-a, …)` — the SAME token the query card's band resolves through the same `qcc--s-*` class, so the drawer and the card cannot disagree about a stage's colour. The band sheds its own hairline; the block closes after the manuscript line with `.5px rgba(0,0,0,.06)`. Avatar chip white on the tint. Top bar parchment; tabs and body white (the CREATE sheet keeps parchment — the log sheet was authored on it and is outside this pack); active tab underline **ink**; the drawer's rung marks fill white so the connector passes under them; the two trays stay their parchment cards on the white body. The accent survives exactly where the brief says: the desk's strip, the target rung's ring, the live verb button.

Two locks retargeted, laws stated in place: the ladder-reader enumeration **widens** to `[.qpn-ms, .qpn-band, .qpn-head, .qat-sw]` (still exact — a fifth reader fails and states its case), and the underline law inverts by the ref's hand (asserted ink AND not-accent).

## §2 · The desk's bounds *(commit b8dd92c7)*

The contract, expressed where it holds: `card.top ≥ window.top + 12` · `card.bottom ≤ window.bottom − 12` · `card.height ≤ window.height − 24` · internal scroll in `.qcd-scroll` (the card's own box never scrolls — its `::after` notch and accent strip would clip; asserted both ways) · the notch clamped along the card's edge · **no ancestor between the card and the body at all** (stronger than "none that clips" — the portal makes the class of fault unreachable). `place()` re-measures `.ws-window` every run, so a dismissed beta strip moves the bound with the window.

**Proved red as ordered**: the worktree's `place()` was mutated to the unclamped anchor-following form (`top = centre − 42`) and the contract run with the bar-button anchor (centre ≈ 30, well above the window) — `top bound` failed at **both** widths (`cardTop ≈ −12` against `winTop + 12 = 122`); restored, rebuilt, 7/7 green. One assert was corrected mid-run: the ancestor-chain claim demanded a literally empty chain, and the desk's OWN portal root (a `pointer-events: none` fixed wrapper, no overflow) is legitimately the card's parent — the honest form is "exactly one ancestor, and it is the desk's root".

## §3 · The illustration slots *(commit b8dd92c7)*

One `IlloSlot` primitive: hatched ground, dashed rim, mono name-and-size label, `aria-hidden` — and an `art` prop that drops ALL placeholder chrome in the same box (locked; proved red by leaving the label beside art). Two mounts:

- **Header block, top-right, 130×78, `stage-specific · {family}`** — keyed by `stageFamily(facts.stage)` (out / in / offer / closed, the same stage the band wears), rising 34px into the band per the ref, white-washed under the hatch, with the `Sent {date} / via {method}` caption beneath it in the reserved column.
- **Desk card, top-right, 56 round, `spot · {verb}`** — respond / marksent / nudge / close / correct (the correcting host passes `correct`); content clears it via the scoped padding.

The swap is one line per slot: an entry in `STAGE_ART` / `SPOT_ART` (both empty, locked empty so the placeholders stay honest until the illustrator delivers).

## The harness — 7/7 (`reports/query-drawer-3.json`, shots in `reports/query-drawer-3-shots/`)

| claim | reading |
|---|---|
| block tint ≡ card band — Queried | `rgb(230,234,227)` × band/head/ms/card, all equal |
| — Partial Requested | `rgb(248,233,226)` × 4 |
| — Rejected | `rgb(228,225,219)` × 4 |
| top bar / tabs / body / avatar chip | parchment / white / white / white, all three stages |
| parchment between bar and tab rail | none |
| header slot present | all three stages |
| desk top (1440 · 2560) | **122 = window.top + 12**, both |
| desk bottom · height | 427 ≤ 868 · 305 ≤ 746, both |
| card → body ancestor chain | exactly `qcd qcc--s-out-1` — the portal root alone |
| card overflow / scroller | `visible` / `auto` — the notch's box never scrolls |
| spot slot on the verb desk | present |

Shots: the three stage blocks, three verbs at both widths, and the drawer at rest on each tab.

## NOT RUN, with cause

- **The `.qpn--form` (create sheet) under the white body** — deliberately scoped out: the form keeps its parchment (`.qpn--form .qpn-body`), because the v6 log sheet was authored on parchment and restyling it is not this pack's remit. Flagged for the next create-sheet pass.
