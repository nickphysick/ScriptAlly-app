# Agent list rebuild — run report

Six phases on `claude-il` (worktree `/Users/nickphysick/ScriptAlly-il`), one commit each, every
commit gated on `tsc` + `vite build` + full Vitest. Design authority:
`design-refs/agent-list-mockup.html` (committed Phase 1, annotated). Nick merges to `main` and
deploys manually.

## Commits

| Phase | Commit | Shipped |
|---|---|---|
| 1 | `0072de2` | Mockup committed · "Agent list" vocabulary (rail, crumb, H1) · page shell (header, chips + live counts, search pill, legend, count line, empty grid) · `Agent.image?`/`pinnedNoteId?` · `agentList.ts` derivations |
| 2 | `10bd9da` | Card face: three-state colour system, relationship pill, stars, meta line, `StatusDot` history, wishlist chips, materials summary, note preview, footer, derived closed stamp · filters/search end-to-end · amendment C (`filterAgents` UNKNOWN→open, lock updated) |
| 3 | `529a997` | In-place flip (five structural rules, CSS-artefact-locked), 400/580 heights, one-at-a-time · editor header (avatar uploader + compression, clickable stars + tooltip, Done) · tabs · error strip · buffered draft with single-diff commit + `deleteField()` unsets |
| 4 | `05ad290` | Contact tab in decision-8 order **plus country/city** (constrained ISO picker) · focus-revealed caution · tri-state NRN (`nrnState`/`nrnSubtitle`) · method Other · socials rows · Wishlist tab · three-stage Escape cascade |
| 5 | `c5a0510` | Materials four-row editor on the canonical `string[]` encoder, strip-on-commit, unit physics · Notes chat with buffered post/delete/pin, flat-note migration, `notePreview` denormalisation with all four guards |
| 6 | *(this commit)* | Add flow (draft-only, validated create, notes ride the create) · sort + location controls · welcome/empty states · pending/struck note grammar · encoder round-trip locks · CLAUDE.md supersession · this report |

Final suite at close: 73+ files, 1039+ tests green (figure recorded fresh at the Phase 6 commit).

## Decisions taken during the build (all ratified in-thread)

- **Amendment A everywhere.** `starRating`, `responseTimeWeeks`, `noResponseMeansNo`: absence is a
  first-class state; new agents are born with all three omitted; clearing a stated value emits
  `deleteField()`; **unstated is an origin state, not a destination** (no editor route back —
  uniform with stars; the diff-level unset support remains for repair paths only).
- **Segmented controls fill ink; switches fill band.** Band fill on a segment breaks in the closed
  state (grey card ⇒ grey "selected" segment reads as disabled) and a segment needs a stronger
  marker because both options stay visible. Decision 5 reworded accordingly in CLAUDE.md.
- **UNKNOWN reads open** everywhere on the page, and `agentsPage.filterAgents` (zero live callers)
  was reconciled with its lock so no test contradicts live code.
- **Escape cascade:** popup consumes (capture-phase `stopImmediatePropagation` in the country
  picker) → field blurs → draft discards silently. No confirmation dialogue, by ruling.
- **Pending honesty:** uncommitted notes render muted/dashed, no timestamp, "Unsaved"; buffered
  deletes strike rather than remove (the Delete chip flips to "Keep"); discard is a visible undo.
- **Door segment:** mockup wins — ink fill (see above).

## ⚠️ MATERIALS — the storage correction and the encoder convention

**Decision 12 named a `materialsForm` object that does not exist in this repo.** The authoritative
model is `src/lib/agentMaterials.ts`: agents store `materialsWanted: string[]` of formatted
display strings, with `buildAgentMaterials`/`parseAgentMaterials` as the single encoder/decoder
pair shared by the Add-Agent form, the Edit Agent drawer and (formerly) `AgentMaterialsEditor`.
Writing the object would have half-worked — rules tolerate a map — and silently shown empty
materials on those other surfaces. Built on the `string[]` instead, per ruling.

**The convention, so nobody reverse-engineers it again:**
- **The array is the delimiter.** Each material is its own element; the free-text Other is a
  single element carrying the writer's prose **verbatim**. Nothing is packed into one delimited
  string, so no typed character can corrupt the encoding — locked with a punctuation battery
  (colon, comma, pipe, em dash, quote, and the `·` that `OTHER_JOIN` itself uses) plus
  encode→decode→encode stability across every row combination (`agentMaterialRows.test.ts`).
- Quantities ride inside the string ("First 10 pages", "Synopsis (2 pages)", "5,000 words");
  parsing is by whole-string pattern match against the recognised vocabulary.
- **Known limit (documented in a test, not silently accepted):** because classification is by
  whole-string match, Other text that is *exactly* a recognised token ("Synopsis") is reclassified
  as that material on re-read. Realistic prose never collides. Proposed fix if it ever matters: an
  explicit `"Other: "` prefix on the stored element, stripped on parse — but that changes the
  shared encoder three other surfaces read, so it is a deliberate follow-up, not a final-phase edit.
- **Four rows only** (Query letter · Synopsis · Opening sample · Other). `Author bio` and
  `Full manuscript` are deliberately dropped and **stripped on every Materials commit**, so legacy
  flags decay on the agent's next edit. Synopsis stays binary, preserving/displaying a stored page
  count and clearing it when unticked. Decision 11 physics drive the stepper; `MAT_QTY` remains
  storage-level validation and provides the stepper's maxima.

## The `notePreview` denormalisation (documented exception)

`Agent.notePreview?: string` is a display cache, justified and guarded per the ruling: one writer
(the buffered Done, through which note posts/deletes also flow), nothing derives correctness from
it, self-healing on next edit. The four guards are individually locked in `agentNotes.test.ts`:
recompute gated on a **real** `loaded` flag (never a defaulted `[]`); unchanged ⇒ out of the diff;
an empty computed preview never overwrites a non-empty stored one while notes exist; deleting the
last note clears to `""`. The flat-note migration writes the migrated bubble and blanks the flat
field in the same commit; a new agent's preview/pin ride the create itself.

## Read-shims in play (all read-time; none rewrite storage outside a save)

1. **Socials** — `socials[]` absent ⇒ derived from legacy `twitter`/`bluesky`/`instagram`; save
   writes `socials`, legacy fields untouched (decision 9).
2. **Materials** — legacy strings parse tolerantly ("First N pages", old spellings); several
   selected sample units render one quantity row each, never collapsed.
3. **Flat note** — `agent.notes` renders as the oldest bubble (timestamped `dateAdded`) until the
   first new post migrates it into the subcollection.
4. **Method** — an unrecognised `submissionMethod` string reads as "Other" with its text recovered
   from `agentNotes`; UNKNOWN door reads open.
5. **Country** — the picker accepts a stored ISO code *or* a tolerated legacy full name and only
   ever emits canonical ISO (`normaliseCountry`), because deployed rules validate with
   `isKnownCountry`.
6. **notePreview** — absent means "never computed"; repaired on next edit (see above).

## Orphaned by this rebuild (left untouched, per the prompt)

- **`AddAgentFocusForm.tsx`** — no longer invoked from this page (the header button opens a
  draft-only card). Still used elsewhere? No — its only mount was the App-level "Add an agent"
  interception, which other surfaces (rail capture, dashboard CTAs) still trigger; those flows are
  unchanged and still work. The *Agents page* simply no longer routes through it.
- **`AgentMaterialsEditor.tsx`** — assessed for reuse (ruling: "reuse only if it's free"). Verdict:
  **written fresh.** It has no unit physics and carries its own Save/Cancel — a second commit model
  that would fight the buffered draft. It keeps its old callers' contract, untouched.
- The F12 Contact list page body, its `agentsHub.test.ts` lock (27 markup assertions — audited:
  zero behavioural, nothing re-homed) and one F12-artefact test in `agentsPage.test.ts`. All
  retrievable at `ed909ce`.

## Flagged for Nick's browser pass (cannot be verified in jsdom)

- **The flip animation** — the five structural rules are artefact-locked, but only a real browser
  shows the motion, the height ease and the back-face correctness.
- **The photo pipeline** — canvas downscale/JPEG encode needs a real browser; jsdom exercises only
  the guards (10MB ceiling, type check, centre-crop maths, raw-data-URL fallback).
- **Flex min-height chains** — the editor's `panes` scroll region and the notes chat column
  (`flex:1; min-height:0`) inside the fixed 580px card.
- **`:focus-within` caution reveal**, the pure-CSS star hover preview, and the grid's
  `minmax(350px,1fr)` reflow across widths.
- **Escape capture-ordering** — the country-picker popup consuming Escape ahead of the page
  handler is real-browser event plumbing.

## Interpretations (where the prompt was silent)

- The count line reads "N of M agents" (mockup's format), always against the full list.
- The new-agent card is pinned to the front of the grid, immune to filter/sort until saved.
- Sort + location controls sit between the chips and the search pill; location reads the real
  `agent.country` against `getHomeCountry(currentUser)` (options: Anywhere / My market /
  International).
- Notes typed on a *new* agent commit under the created id (tempIds are the doc ids, so a pin set
  before first save stays valid).
- Escape discards typed-but-uncommitted notes with the rest of the draft — by design (single
  writer); the pending grammar makes that visible rather than surprising.
