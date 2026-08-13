# Comparable titles — Prompt 2: the Scout panel, the Pro gate, the contract

Design authority: `design-refs/comparable-titles-v5.html` + the pack's Prompt 2, as amended by
Amendments 1–3. Prompt 1's commits are listed at the foot.

## What landed

| Piece | State |
|---|---|
| Contract: `runAt`, `publisher`, `matchAxis`, `media`, `verification`, `links`, `agentMatch` | done |
| `verified` derived from `verification`, never accepted from the payload | done (`211ccc5`) |
| Row grid `26px · 1fr · 104px`, `align-items:start`, fixed action column | done |
| Status strip · running state · failure state · all-actioned state | done |
| Free locked preview + Pro gate (client half) | done |
| Facts chip composed at render | done, narrower than the ref — see below |
| `scoutRuns` Firestore persistence | **NOT built — see "What I did not build"** |
| Server-side Pro rejection | Prompt 3, with the function |

## Decisions worth reading

### `facts` is not in the contract; the chip is composed

The pack's contract carried `facts: string` — "MYSTERY · DEBUT · 2024" — to fill the ref's blue chip.
That is a **model-composed display string rendering as a factual-looking chip**, with nothing behind
it but the model's word, on a card whose footer promises nothing is invented. Amendment 3 removed it
and it stays removed.

`factsChip()` composes from `media` and `year`, both structured and verifiable. It has one more
property the ref does not: **it omits itself for a book.** `media` absent means book and the year is
already on the line above, so `BOOK · 2024` would restate one fact and assert a second that is only
the default.

**Open for Prompt 3:** genre and a debut flag would each have to arrive as a structured field
alongside the verification. If the catalogue cannot substantiate a debut, it is omitted and the chip
stays as it is. Nothing should be inferred from the model's prose to fill it.

### The free preview veils skeletons, not invented books — deliberate deviation

The pack specifies "the three most recent **real** suggestions" blurred behind the veil. **A free
user has never run the Scout — they cannot — so there are none.** The only way to fill that space is
to invent three books.

Blurring a fabricated title does not stop it being one, and this is the card whose footer promises
that every title is checked and nothing is invented. Undercutting that promise *inside the card that
makes it*, in order to sell the feature the promise is about, is the worst place in the app to do it.

So the veil sits over three empty row **skeletons**: the shape, the density and the fixed action
column — everything the feature looks like — and no title anyone could mistake for a real book.
Locked (`compsScoutPanel.test.ts`): the ghost block contains bars and no title text.

### The Pro gate is two-sided and only one side exists

`fetchCompRun(input, isPro)` refuses a free caller before any network call. **That refusal is a
courtesy, not a control** — anyone can call the callable directly. The function must reject a non-Pro
caller server-side; that lands with `scoutComps` in Prompt 3 and is recorded in the source so it
cannot be lost in the swap. Client gating alone is not a gate on a paid API.

### A bad `runAt` costs the claim, never the run

`validateRunPayload` drops an unusable timestamp and keeps the suggestions. The status strip then
reads "SENT OUT THIS SESSION" instead of naming a time. Discarding six verified titles because a date
field was malformed would be the tail wagging the dog.

### `source` stays `"suggested"`

The pack writes accepted suggestions with `source: 'scout'`; the live model is `"user" | "suggested"`
and has been since the flat-list build. Keeping `"suggested"` avoids a migration of existing docs for
a rename nothing reads. Flagged rather than silently reconciled.

## What I did not build, and why

**`users/{uid}/manuscripts/{id}/scoutRuns/{runId}` persistence.** The pack asks for it in Prompt 2.
I have not built it, and this is the one place I have scaled the prompt down — your call to overrule.

Three reasons:

1. **It would be born empty and stay empty.** `SCOUT_LIVE` is `false` (unchanged since Prompt 1), so
   the panel never fetches, so no run is ever produced. The collection cannot receive a document
   until Prompt 3 ships the function *and* the flag flips *and* the rules deploy.
2. **`db.tsx` has no per-manuscript subcollection pattern at all.** Every listener in it is a
   top-level user collection. This would be the first, in the app's most-contended file, while
   another session is actively editing the same checkout.
3. **This repo deliberately retired the last manuscript subcollection.** `manuscripts/{id}/notes` was
   removed to default-deny in Tier 2 Phase 6, with its documents left unreadable. Adding a new one
   for a producer that does not exist yet deserved a second look, and got one.

What this costs today: dismissals are session-scoped rather than surviving a reload, and "LAST SENT
OUT" reports the current session's run rather than the last one ever. Both are invisible until a run
can actually happen.

**Recommendation:** build it in Prompt 3, beside the function that produces the runs, when the real
payload shape is known and the rules block can be verified against a real write in the same pass.

## Verification

- `tsc` clean · production build clean · **Vitest 4503 passed, 272 files, 2 skipped**, measured in an
  isolated worktree at this commit (see below). The shared tree reads 4495 with eight failures, all
  of them the other session's in-flight queries work — which is precisely why the figure above is
  not taken from it.
- Red-verified before being believed: the trust guards (a payload claiming `verified: true` without a
  record is rejected, not downgraded), the undo guards, and the appraisal guards.
- **Two gates were retargeted, not relaxed**, both having started to read nothing: `.ct-addshelf` →
  `.ct-sadd` (the Scout's add button moved in this rebuild), and the `aria-live` count, which was `1`
  only because the hero line was the page's sole live region — the run narration is legitimately a
  second, so the gate now asserts *where* the live region is rather than *how many* exist.

### Not verified, and needs your eyes

- **"Every ADD button's right edge is flush across six suggestions, including a 60-character title."**
  This is a measurement, and there is no jsdom here — the page is auth-gated so the preview harness
  cannot reach it. What is locked is the *mechanism* that makes it true (fixed 104px column,
  `align-items: start`). The measurement is a browser check.
- Everything visual, in all three themes, both tiers.

### The shared checkout

Another session is live in this working tree and has been throughout. It committed `fa38b7a` and
`4bc2c24` over my work, and its in-flight edits to `src/components/todo/`, `src/components/Queries.tsx`
and `src/lib/queryPlaceLine.test.ts` leave `tsc` and several suites red in the shared tree. **None of
those files are mine.** Every commit used explicit-path staging and the gate figures above come from
a clean worktree at my own commit, not from the shared tree.

## Still pending Nick

- **`firestore.rules` deploy** — `MAX_COMPS` raised to 100 in the rules and not deployed. Until it
  lands, a 101st comp is written by the client and denied silently. (No other rules change: comps
  validate only as a size-capped list, so `verification` passes untouched.)
- The `scoutComps` function itself (Prompt 3), behind the Blaze / API-key gate.
- `SCOUT_LIVE` stays `false` until both land.

## Prompt 1's commits

| Commit | What |
|---|---|
| `be5c9b9` | editing a comp destroyed its `note` — live data loss, fixed first and alone |
| `211ccc5` | `verification` persisted; `verified` derived; a missing record drops the suggestion |
| `c9e9f6d` | one advisory gold (two themes were rendering red), pastille-blue Scout, sage ✓ VERIFIED |
| `c583298` | the appraisal sweep — `queryHealth` deleted with its verdict-bearing type; slate PRO restored |
| `9ff9af2` | `MAX_COMPS` 12 → 100 as a size guard, never surfaced |
| `66f2bf3` | Phase 2 — the hero, the flat rows, page-level scroll, the grid's `fill` job given back |
| `6d00eab` | Phase 3 — add, edit and remove inside the card; receipts, duplicates, empty states |
