# Calendar — the settled timeline

**Session** `calendar` · base `d79d2296` · **Phase 0 — recon, read-only**

**Red gate: clear.** `src/` and `tests/` clean; `todoTimeline.ts` and the pane mount unrestructured
since the grouped pack closed.

> ⚠️ **My last run's commits were briefly invisible and are not lost.** `git log -6` showed only
> another session's manuscripts work, and `ahead: 1` against `origin/main`. Checked rather than
> assumed: all seven of `657d964a` → `7327866f` are **ancestors of HEAD**, and
> `timelineGroups.ts`, `timelineCopy.ts` and the report are all present at HEAD. The other session
> simply landed twenty-odd commits on top and pushed. Nothing to do.

> ⚠️ **`design-refs/timeline-settled.html` does not exist** — the artefact is
> `~/Downloads/timeline-final-ref.html` (27 Aug 11:13). **Fourth pack running.** Phase 1 commits it
> under the name the pack cites.

---

## 1 · Every hard-coded bar colour, and where text colour is set

**Sixteen `.tl-seg` rules carry colour; roughly thirty literals; not one token among them.**

| rule | fill | border | text |
|---|---|---|---|
| `.tl-row.closed .tl-seg` | `transparent !important` | `#cbbba9 !important` | `#9c8b78 !important` |
| `.tl-seg` | — | `1px solid transparent` | — |
| `.tl-seg.theirs` | `#fff` | `#dfe6dc` | `#5a6e58` |
| `.tl-seg.yours.w-fresh` | `#fdf3ef` | `#eed8ce` | `#8a5442` |
| `.tl-seg.yours.w-settled` | `#f3e0d6` | `#e8c8bc` | `#7a4636` |
| `.tl-seg.yours.w-long` | `#eec9ba` | `#dba892` | `#5f2a1c` |
| `.tl-seg.yours` | `#f3e0d6` | `#e8c8bc` | `#7a4636` |
| `.tl-seg.norail` | `transparent` | `1px dashed #e0d0c4` | `#c9a89e` |
| `.tl-seg.openleft` / `.future` (+ `.yours` / `.w-long` variants) | — | `#8a9e88` · `#c9a89e` · `#c08a72` | — |
| `.tl-seg.theirs .d` · `.yours .d` · `.norail .d` | `#8a9e88` · `#f8e2d9` · `transparent` | `#7c3a2a` dashed `#e0d0c4` | — |

**Text colour is set in six places** and every one is a different value — `#9c8b78`, `#5a6e58`,
`#8a5442`, `#7a4636`, `#5f2a1c`, `#c9a89e`. **Five of those six are your-move states, and no two
agree**, which is precisely what Phase 2's single formatting rule ends.

## 2 · How segments are classed, and what the ten states cost

**Today:** `theirs | yours` × `w-fresh | w-settled | w-long`, plus `openleft` `future` `norail`
`openend` `capl` `capr` `sel`, plus a row-level `.closed`.

**The ten, and where each comes from — four are new and none needs a new threshold:**

| ref class | state | today | derivation |
|---|---|---|---|
| `their` | waiting, a reply date is known | `.theirs` | side `theirs`, `expectedYmd` not passed |
| `theirq` | waiting, no date given | `.norail` | side `theirs`, no `expectedYmd` |
| `nudged` | **new** — a reminder is scheduled ahead | — | side `theirs`, `nudgeYmd` in the future |
| `cold` | **new** — gone quiet | — | side `theirs`, expected **passed**, no nudge scheduled |
| `y1` | fresh your-move | `.yours.w-fresh` | `weightFor` |
| `y2` | settled your-move | `.yours.w-settled` | `weightFor` |
| `y3` | long-standing your-move | `.yours.w-long` | `weightFor` |
| `offer` | **new** — an offer | `.yours` (undifferentiated) | `status === OFFER` |
| `done` | closed | `.tl-row.closed .tl-seg` | terminal |
| `task` | the writer's own chips | `.tl-chip` | not a segment |

⚠️ **The four agent-side states separate BY KIND, not by duration** — a reply date exists or it does
not; a nudge is scheduled or it is not; the date has passed or it has not. **No new constant.**

## 3 · Fresh / settled / long-standing — a threshold, already named

**A duration distinction has no kind to derive from**: nothing separates a three-day your-move
stretch from a thirty-day one except how long it has run. It is unavoidable, and it is **already
two named constants** rather than literals:

```
journeyBars.ts:66   export const FRESH_MAX_DAYS = 7;
journeyBars.ts:67   export const SETTLED_MAX_DAYS = 21;
journeyBars.ts:250  weightFor = (days) => days <= FRESH_MAX_DAYS ? "fresh" : days <= SETTLED_MAX_DAYS ? "settled" : "long";
```

Two rather than the pack's "one", because two boundaries make three bands. Nothing to change.

## 4 · `prefers-reduced-motion` is honoured — and carries no information

**Four blocks in `todoCalendar.css`** (`:348` the group caret, `:474` the bar, `:608` the caption,
`:725` the chips). ⚠️ **The bar's is exactly the fault Phase 3 exists to fix:**

```css
@media (prefers-reduced-motion: reduce) { .tl-seg.theirs { animation: none; } }
```

The animation simply stops. Whatever it was saying is then unsaid — **motion is the only signal**.

⚠️ **AND IT IS THE WRONG BAR.** `@keyframes tlBreathe` animates **`.tl-seg.theirs`** — *waiting on
the agent*. The ref pulses **`y3`**, long-standing your-move. So Phase 3 is not "add a pulse": it is
**moving the breath from the agent's bar to the writer's**, which is a change a reader will notice.
*(The existing keyframes do at least carry literal values, with the `var()`-fails-silently warning
already written at them.)*

## 5 · Tail strings: there are none, and the ref's own has the fault the pack forbids

**Nothing renders after a bar today.** No `.tail`, no note, no scrawl — `grep` returns only an
unrelated comment. Phase 4 builds it from nothing, so **no current tail can duplicate a bar.**

⚠️ **The REF's does.** Of its twelve rows, five carry a tail and seven are deliberately empty —
every empty one is a *Needs you soon*, *Watching brief* or *Recently closed* row, which is the
pack's rule already drawn. But the `cold` row states its action **twice**:

```
bar   Quiet for 78 days · nudge or close it
tail  Nudge or close it
```

The pack's prose settles it — *"The bar says what the stretch of time is; the note says what to do.
They must never say the same thing."* **The bar becomes `Quiet for 78 days`** and the deed stays in
the note. Recorded as a deviation from the artefact, taken on a reasoned rule.

---

## Findings the pack did not anticipate

- ⚠️ **`body.flat` in the ref IS the shipped behaviour.** The ref carries two modes: a default whose
  borders come from `-line` tokens, and `body.flat` where *"borders matched to fill — the bar
  becomes one solid shape"*, with `.done` keeping its dash. **That second one is what Phase 2
  describes**, and it brings its own keyframes (`urgeflat`, background only) which is the flat
  variant Phase 3 asks for. Reading the ref's `-line` values as the shipped borders would have
  produced the mode the pack does not want.
- ⚠️ **The ref contradicts the pack on one text colour.** `--bar-quiet-text` is `#8e5252` in the
  token block, and a later rule sets `.b.cold .blab { color: #7a4636 }`. The pack names `#8e5252`
  for all five your-move states **and gives its reason**, so it wins — the house rule that a
  reasoned value in prose beats an unreasoned one in an artefact.
- ⚠️ **Caveat is already loaded**, in `index.html` *and* `src/index.css`
  (`family=Caveat:wght@400;500;600;700`). **Phase 4's font costs nothing** — flag 3 answered before
  it was asked.
