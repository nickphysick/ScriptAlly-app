# The task card — complete specification

This replaces every earlier pack for the task pane. It is not a list of fixes. It is the whole
card, every slot, every bucket, every state, and it supersedes anything in the v9/v10/v12/v13/v14
prompts that contradicts it.

Reference: `design-refs/todo-workspace-v14.html`, **frozen**. No new mockup version will be issued
until this document is satisfied; changes Nick asks for from here are queued against the next one.

**How to use this.** Work down the tables. For every row, return one of four states:

| state | meaning |
|---|---|
| `built` | on the deployed page, measured, matching |
| `built-differently` | on the page but not as specified — say what and why |
| `unbuildable` | the data does not exist; say what would have to exist |
| `not-built` | none of the above |

The report is that table, filled in, one line per row. Prose only where a row needs explaining.
**A row you do not mention is a row I will assume is `not-built`.**

---

## Global rules

`git commit --only`, no `git add -A`, do-not-touch list unchanged, `recomputeQuery` is the single
writer, `Activity.details` is displayed never parsed, source-string locks strip comments, commit
messages state what their diff does, a symbol is dead only once traced to a rendered root, and a
layout claim is verified by measuring the rendered page.

Gate green each phase. Deploy at the end; confirm by asset hash.

---

## 0 · The six buckets

Every card is exactly one. Everything below is keyed to this column.

| bucket | when | band | motif |
|---|---|---|---|
| `decide` | offer, R&R | pink | laurel |
| `send` | material an agent asked for | sage | manuscript stack |
| `chase` | stated window passed | sage | bell |
| `close` | stale, no-reply-means-no | sage | broom |
| `fix` | missing data, stale materials | sage | broom |
| `note` | the writer's own | sage | torn note |

---

## 1 · The card shell

| # | slot | specification |
|---|---|---|
| 1.1 | ground | parchment `--paper`, 14px radius |
| 1.2 | shadow | 1px contact + soft lift; the shadow is what makes it sit on the ground, not a border |
| 1.3 | inset frame | `inset:6px`, 10px radius, `rgba(124,58,42,.28)`, `pointer-events:none`, above content. **Confirmed present — do not change the value** |
| 1.4 | texture | paper texture at the app's standard opacity |
| 1.5 | height | fills the pane; no content-height, no min-height floor |
| 1.6 | width | fills the pane. **The 640px cap is gone and stays gone** — it is what inverted the columns |

---

## 2 · The band

| # | slot | specification | when absent |
|---|---|---|---|
| 2.1 | avatar | 40px disc, initials in Playfair | note/fix: the bucket glyph instead of initials |
| 2.2 | pre-line | mono caps, states the act: `Sending your full to`, `An offer of representation from`, `Chasing your query with`, `Updating the record for`, `A note you added` | never absent |
| 2.3 | subject | Playfair 20px — the agent's name | no agent: the standing subject (`Your noteboard`, `Submission packages`) |
| 2.4 | agency | 11px beneath the subject | omitted entirely, no empty line |
| 2.5 | motif | per bucket, `z-index:1`, `opacity:.85`, `pointer-events:none`, clipped by the band. **Its right edge sits inboard of the close control** — behind it is not good enough when they visibly intersect | never absent |
| 2.6 | band fact | **the forward-looking fact only** — see §5 | no forward-looking fact: the band carries none |
| 2.7 | close × | `position:relative`, above the motif | — |

---

## 3 · The body — the record column (wide)

`minmax(0,1fr)`, hairline right, 30px gap. **The record is the wider column at every width above
the collapse threshold.**

| # | slot | specification | when absent |
|---|---|---|---|
| 3.1 | note text | `note` bucket only: **first in the body**, Caveat 28px | — |
| 3.2 | note hint | small muted caption beneath 3.1, not a column | — |
| 3.3 | Tracking label | mono section label | **suppressed entirely on `note`** — no empty state |
| 3.4 | stat pair | see §5 | — |
| 3.5 | timeline rings | 22px ring per entry, direction-coloured: outgoing burgundy-on-pink, incoming sage, current solid burgundy. Connector rule between. **Currently absent — this is the largest remaining gap** | no entries: `Nothing logged yet.` (agent cards only) |
| 3.6 | timeline entry | event in 600 weight, channel appended in regular (`Offer received · via email`) | — |
| 3.7 | timeline sub-line | the agent's own words, or `details` verbatim, italic | omitted |
| 3.8 | timeline date | mono, left column, 66px | — |
| 3.9 | progress bar | **deferred** — `reports/todo-timeline-progress-bar.md`. Do not build | — |
| 3.10 | material chips | **cut** — zero rows can produce them. Do not build | — |
| 3.11 | what the record shows | the factual paragraph, beneath Tracking | — |

---

## 4 · The body — the doing column (bounded)

`minmax(300px,360px)`, collapse threshold 800px. **These are your measured numbers and they stand
— mine came off a wider pane.**

| # | slot | buckets | specification | when absent |
|---|---|---|---|---|
| 4.1 | What goes | `send`, `decide`(R&R) | one row per material: 28px icon tile, name, sub-line, sage tick | — |
| 4.2 | material sub-line | — | full manuscript → word count from the manuscript record. Sample/synopsis/letter → package slot version. **Nothing else, ever** | **no sub-line at all** — not `Version not recorded` |
| 4.3 | Where to send it | `send`, `chase` | `mailto:` with composed subject; portal/site as secondary; subject in a copy chip; the italic hand-off line | field empty: affordance greys with the reason in its tooltip. Never hidden, never fabricated |
| 4.4 | **Who else holds material** | `decide` **only** | **one row per agent still holding a partial or full — name, what they hold, a draft-email link. This has been in every mockup since v1 and has never been built. It is the most useful thing on an offer card** | no other agents: the section does not render |
| 4.5 | Your note | all except `note` | Caveat textarea | — |

---

## 5 · Facts and figures — the anti-duplication law

The offer card currently prints `REQUESTED / 3 March` in the band and `3 March / REQUESTED` in the
stat pair. Two faults: the wrong noun, and the same figure twice.

**The law: no figure appears twice on one card.**

| # | slot | carries |
|---|---|---|
| 5.1 | band fact | **the forward-looking fact only** — `Reply by / 7 Sept` (decide), `Their window / 8–10 weeks` (send/chase). No forward-looking fact on record → the band carries nothing |
| 5.2 | stat pair, left | the elapsed figure — `You've waited / 4 weeks`, `Greg has waited / 6 weeks` |
| 5.3 | stat pair, right | the anchor — and **the noun must name what actually happened**: `Offer received` for decide, `Requested` for send, `Queried` for chase, `Last entry` for close, `Added` for note. `Requested` on an offer is wrong; nothing was requested |
| 5.4 | stat block | sizes to its contents — one stat spans, two share, divider only when two |
| 5.5 | Playfair/Inter split | figure in Playfair, unit in Inter, from the `kind` tag — never inferred from label text |

---

## 6 · The rail row — for completeness

| # | slot | specification |
|---|---|---|
| 6.1 | hover swap | figure stack fades **to zero**, not 14% — at 14% it reads as clutter behind the icons |
| 6.2 | `NO DATE ON RECORD` | correct where no anchor exists. **Report how many rows show it on dev and why** — if it is the harness account's gaps say so; if the derivation cannot reach a date that exists, that is a bug |

---

## 7 · Acceptance — the gate that has been missing

Everything above has been unverifiable by the test suite, which is why the same faults survived
three passes. Build a Playwright pass that, for one card of **each of the six buckets**:

- screenshots the pane at 1440 and 1920;
- measures and asserts: the body's two track widths, the record being the wider; the motif's box
  not intersecting the close control's; the band fact and stat values being **different strings**;
  the presence of timeline rings where entries exist; the absence of a Tracking section on `note`.

Save the screenshots to `reports/card-conformance/`. Where a bucket has no card on dev, say so
rather than skipping silently — **and tell me which buckets those are, because I will create the
data**.

---

## Phasing

1. §5 — facts and figures. Smallest, fixes two visible faults.
2. §4.4 — who else holds material. The largest missing feature.
3. §3.5 — timeline rings.
4. §2.5, §6.1 — motif placement, hover fade.
5. §7 — the acceptance pass.
6. Everything still `not-built` from your returned table.

One commit each. If a phase turns out `unbuildable`, stop and report rather than inventing data —
three of this week's rounds went on my mockups showing data the app cannot produce.

---

## The report

The full table from every section, one line per row, with a state. Then:

1. Which buckets have no card on dev.
2. Anything `unbuildable`, and what would have to exist.
3. Anything you disagree with — twice this week your arithmetic beat my figures, and I would rather
   read the objection than have it built around.
