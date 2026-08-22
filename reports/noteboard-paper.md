# Noteboard — flat paper, example papers, reorder, links

22 Aug 2026, unattended. Commit-only; nothing pushed, nothing deployed.

---

## 1 — Premises that turned out false

### 1.1 — "The note card and the composer fade" — they are already flat, and always were

The elements were walked live (self, `::before`, `::after`, six ancestors, every descendant):
**`background-image: none` everywhere, no gradient pseudo-element, no painted wrapper** — on the
card and on the open composer alike. The prompt's Phase 1 probe as specified ("assert computed
background-image is none… this must fail today the way the screenshot fails") **cannot fail
today**: the surfaces it names are already flat.

What the screenshot shows is real, but it is an **overlay painting over them**, not their own
paint — see §2. The distinction decides the fix: retoning the cards would have changed nothing.

### 1.2 — "Did the one-path run happen?" — no such run exists

No `reports/noteboard-one-path.md`, no commit anywhere in history mentioning one-path. There is
nothing to reconcile; the shared-cause hypothesis arrives unowned, and §2's measurement settles
it: the cause is shared because it is a **zone-level overlay** that covers whatever sits at the
fold — card and composer without distinction.

### 1.3 — "writes the existing `order` field" — no order field exists

Not on `UserTask` (types.ts), not in either `userTasks` rules allowlist. It was recorded as
absent in the very first recon ("pinned-order: not stored"). Adding one to the note document
needs a `firestore.rules` change, and this run may not deploy — so a field written but not
deployed would leave reorder **denied on dev**, a dead feature shipped live.

**What shipped instead:** the order lives in `todoPrefs.noteboard.order` (an id list) on the user
document — allowlisted **today**, proven by a live probe against the deployed ruleset before any
code relied on it (§3). Reorder therefore persists now, with no deploy owed. The same map holds
the example dismissals.

### 1.4 — "the exact stored shape of the live 'asdf' document" — unreachable, but derivable

The "asdf" note lives on Nick's own dev account; the harness signs in as its own user and can
reach no other — by construction, and rightly. Its shape is still knowable exactly: it was pinned
through the shipped composer, whose create writes `{ id, userId, text, done, createdAt,
updatedAt }` and **nothing else** — no `colour` (yellow never writes one), no tags, no detail.
The probes seed precisely that minimal shape; the seeder already did.

### 1.5 — The mockup's own example content violates a standing rule

`noteboard-sparse-mockup.html`'s `EXAMPLES` writes *"she wants 'thrillers with a domestic
heart'"* about an agent — the gendered-pronoun class the drawer port already had to fix once.
The baked decision covers it: examples are **drawn from the existing data module**
(`NOTE_EXAMPLES`, which carries the they're fix and the declared-divergence lock), not from the
mockup's array. Reference, never duplicate — so the rule violation stays in the ref, fenced.

### 1.6 — `todoPrefs`' docstring says "the four desk behaviours" — live data already outgrew it

The live harness user's `todoPrefs` carries `listView: { types, includeSnoozed, sort, groups,
grouping }` — a nested sub-map the inline type in types.ts does not even name. `todoPrefs.noteboard`
therefore follows an **established precedent**, not a stretch of a four-key map.

---

## 2 — The fade: `.tpl-hem`, named, measured

**The rule:** `.tpl-hem` in `src/components/todo/tasksLayout.css` — the Tasks chassis's
scroll-edge hem, a 28px `position: sticky` span painting
`linear-gradient(rgba(254,252,250,0), rgb(254,252,250))`, pinned to the zone's bottom edge.

**The mount:** the Noteboard's own call — `<TplZone label="Notes" hem={notes.length > 0}>` —
gated on *notes exist*, not on *the zone scrolls*.

**The measurement (dev, 1440×900, 11 seeded notes):** the zone's `scrollHeight` is **588** against
`clientHeight` **586** — two pixels of overflow — and the hem renders at full strength anyway,
**intersecting two note cards** ("NBPAIR alpha…", "NBPROBE four"). With one short note the same
overlay sits under/over whatever is tallest at the fold — the open composer included, which is why
"the composer fades too": the cause was never any component's own paint. The fade is a truncation
affordance in spirit ("more below"), and its only gate was existence.

**The fix (Phase 1):** the hem is kept as an affordance and gated on *measured* overflow — the
page derives `scrollHeight > clientHeight + 24` from the zone (ResizeObserver on the zone **and**
its child, per the house rule that a scroller's observer says nothing when its content grows),
and passes `hem` accordingly. Two pixels is not "more below".

## 3 — Storage: `todoPrefs.noteboard`, proven live, nothing owed

Dismissals and order both live in one additive sub-map on the user document:

```ts
todoPrefs?: { …existing…; noteboard?: { dismissedExamples?: string[]; order?: string[] } }
```

- The update allowlist already carries `todoPrefs` (`firestore.rules:553`) and its value clause is
  `is map`, unconstrained (`:64`).
- **Proven against the deployed ruleset before any code relied on it**: a live probe wrote
  `todoPrefs.noteboard = { dismissedExamples, order }` on the harness user — ACCEPTED — and
  restored the prior value.
- Writes spread the existing map (`{ ...todoPrefs, noteboard }`); replacing it would silently
  drop the desk behaviours and the list view.
- **No rules change, no deploy, nothing left for Nick.** The session-only fallback was not needed.

Baseline (0.1): see §5. Mockup (0.2): installed as `cf022807`, sha256
`854a9e62…aea79fe`, 239 lines, one file in the commit.

---

## 5 — Phase by phase

Every probe was run against HEAD before its fix and against a worktree `vite preview` after.
Another session was live in this checkout throughout, so no measurement ran from the shared tree.

### P1 — flat paper · `0f457af5`
`TodoNoteboardPage.tsx` · `tasksViewport.test.tsx` · `nbPaper.measure.ts` · `nbPaperRecon.measure.ts`

The hem gated on measured overflow (`scrollHeight − clientHeight > 24`), derived from the value,
observers on zone **and** child. **Red on HEAD with the final probe text:** 1 painting gradient,
2 card intersections; hem present at 2px of overflow. **Green:** 0 painting gradients at rest,
composer clear, hem absent at 2px and **present at 493px**. That second leg has its own red — the
gate was set to `> Infinity` in the worktree and it failed as *"the affordance was deleted rather
than gated"*.

*The effect first landed above the `notes` memo it reads — the TDZ shape, caught by tsc.*

### P2 — example papers · `2f65f678`
`types.ts` · `noteboard.ts` · `TodoNoteboardPage.tsx` · `todoNoteboard.css` ·
`noteboardExamplePapers.test.tsx` · `nbPaper.measure.ts`

Three papers derived from `NOTE_EXAMPLES`; ids are the colour; `todoPrefs.noteboard` persistence.
**Red 6 of 7 → 9/9.** The arrangement is asserted as one kind sequence
(`ghost note hint example example example`), the boundary is exact (3 real → zero), the prefs
reader is total against `undefined` / `{}` / `{todoPrefs:{}}`.

**Browser, on a genuinely empty board:** keep → a real note appears, that example goes, **and the
dismissal survives reload**. Under a search: zero examples. Plus a geometric case added after the
screenshot (below).

### P3 — drag to reorder · `b375d449`
`noteboard.ts` · `TodoNoteboardPage.tsx` · `todoNoteboard.css` · `noteboardOrder.test.ts` ·
`todoPageSmoke.test.tsx` · `nbPaper.measure.ts`

`orderNotes` + `reorderIds`, both total. **Red 7/7 → 7/7 green.** Browser: **red against the
pre-Phase-3 build with identical probe text** (order unchanged), then green — the third note moved
to the front and **the same sequence after reload**, which is the leg that proves the write.

### P4 — link-aware bodies · `bf3ec6d7`
`noteboard.ts` · `TodoNoteboardPage.tsx` · `todoNoteboard.css` · `noteboardLinks.test.tsx` ·
`nbPaper.measure.ts` · `seedNotes.mjs`

`linkifyBody` returns React nodes. **Red 8/8 → 9/9.** Both injection legs are proven against a
deliberately linkify-first implementation defined in the test, which must **fail** the same cases.
Browser: red against a build without the linkifier (`anchors=0`), green with it — 1 anchor,
correct `href`/`target`/`rel`, `imgs=0`, `scripts=0`, the markup readable as text, colour asserted
as a **painted value** `rgb(124, 58, 42)`.

### P5 — sweep · this commit

31 tokens read, **0 dangling**, 0 fallbacks on undefined tokens; every rendered class styled and
every styled class rendered; the three paper rules confirmed **after** `.nb-note`'s transparent
border; no `display:contents`, no blend, no transform on a note.

**The scope sweep found a real one.** `nb-datepanel` (the ⋯ Tags… sheet) rendered **outside**
`.nb-scope`. It reads no `--nb-*` token *today*, so it was safe by accident — the first one anyone
added would have been dropped silently. It carries the scope now, and the lock covers all four
floating surfaces rather than the three that happened to read tokens.

---

## 6 — Degraded, deviated, and what the screenshots changed

1. **The hint spans the columns** (`column-span: all`), which was not in the spec and is what
   makes two baked decisions true. As an ordinary child the DOM order was right —
   ghost·notes·hint·examples — and the **screenshot showed the hint orphaned at the foot of column
   one with the examples it introduces beside it**: multicol flows by length, so "above the first"
   was true in the markup and false on the page. Spanning splits the flow: real notes fill the
   columns, the hint runs full width beneath them, examples land below. A geometric probe now
   asserts it (`1 real note above=true · 3 examples below=true`) — the per-element DOM check could
   never have seen it, and neither could any of the four measurement cases that were already green.
2. **`order` lives on the user, not the note** (§1.3) — the spec's "existing `order` field" does
   not exist and adding one would have shipped a feature denied on dev.
3. **Nothing was skipped.** The session-only dismissal fallback was not needed (§3).

## 7 — Baseline vs final

| | Files | Tests |
|---|---|---|
| Baseline (Step 0) | 372 passed | 6324 passed · 2 skipped · **0 failed** |
| Final | **375 passed** | **6369 passed** · 2 skipped · **0 failed** |

**No other-session failures at either end.** Their live `TodoCalendarPage.tsx` WIP briefly
reddened calendar suites mid-run; each time the failing file was confirmed theirs by
`git diff --name-only HEAD` before any gate was believed, and both cleared when they committed.
The +45 is this run's probes.

**Do-not-touch:** the union of the five commits' files is thirteen paths — the Noteboard's own
sources and locks, `types.ts` (additive), and four `tests/e2e/` files. Grep against every
protected name returns nothing. `PortalMenu`, `todoBoard.ts` and `todoBoard.css` were not opened.

## 8 — Left for Nick

- **Nothing to deploy.** `todoPrefs` was already allowlisted, proven live before use (§3); no
  `firestore.rules` change was made or is owed.
- The behaviour goes out with the next ordinary dev deploy:
  `npm run build:dev && firebase deploy --only hosting --config firebase.dev.json --project scriptally-dev`
- **The harness account's Noteboard prefs were reset** for the sparse screenshot
  (`dismissedExamples` and `order` cleared, the rest of `todoPrefs` — including `listView` —
  preserved), and its probe notes were removed. Re-seed with `node tests/e2e/seedNotes.mjs`.

---

## 9 — Dev deploy (22 Aug, after the run)

**Hosting only** — the paper run changed no rules (`todoPrefs` was already allowlisted, §3), and
`git diff e177b3fd..HEAD -- firestore.rules` is empty.

Pre-flight: **0 behind** `origin/main` (54 ahead); `src/` clean, so the bundle is exactly HEAD
`3577bdfc`; build output read in full and grepped, not tailed — clean, `assert-build-target`
confirmed *"bundle targets scriptally-dev; gen-lang-client-0801391782 absent"*.

```bash
firebase deploy --only hosting --config firebase.dev.json --project scriptally-dev
```

176 files → https://scriptally-dev.web.app

**Verified against the deployed site** (`SA_E2E_BASE_URL=dev`) — the full paper suite, **9/9**:

| | Reading |
|---|---|
| flat paper | 0 painting gradients at rest; composer clear |
| the hem | absent at 0px of overflow, **present at 251px** |
| examples | three on the sparse board; keep → real note, and **the dismissal survived reload** |
| the hint | 2 real notes above, 2 examples below — on screen |
| under search | zero examples |
| drag | third → first, and **the same order after reload** |
| links | 1 anchor, `imgs=0`, colour `rgb(124, 58, 42)` |

Phases 3 and 4 failed their first pass on the deployed site for want of fixtures — the run had
cleaned them — and passed once reseeded. A fixture absence, not a regression, and worth naming
because a red that means "no data" looks identical to a red that means "broken".

**Harness account left tidy:** probe notes removed, the two real notes the keep-this measurement
created removed (their bodies are drawer examples verbatim — harness litter, not the writer's
data), and `todoPrefs.noteboard` reset with `listView` and the desk behaviours preserved.
