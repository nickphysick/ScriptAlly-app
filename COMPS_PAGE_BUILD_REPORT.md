# Comparable Titles — flat list + The Scout — BUILD REPORT

Rebuild of the Comparable Titles page into a manuscript-scoped workspace: a single flat comp list
(free) with derived role / query-line / health, plus **The Scout** (Pro) — full UI wired to a
feature-flagged `suggestComps` callable. **The `suggestComps` Cloud Function is NOT built** (next
prompt). Single visual source of truth: `design-refs/comparable-titles-flat.html`.

## Commits (all on `main`; gates green per commit)

| Phase | Hash | Message |
|---|---|---|
| 1 | `7b8aea9` | feat(comps): CompTitle model + derived role/health helpers |
| 2 | `c719c81` | feat(comps): comparable titles route + shell + masthead |
| 3 | `c24af57` | feat(comps): writer-managed comp list + query line |
| 4 | `<this>` | feat(comps): scout panel + flagged suggestComps wiring |

**Gate at each commit:** `tsc --noEmit` clean · `vite build` clean · full Vitest green.
Test-suite baseline **702** → **725** (Phase 1, +23 compsPage derivations) → **729** (Phase 4,
suggestComps test rewritten to the richer contract). Fresh figure at final commit: **729 passing /
53 files**.

## ⚠️ This was a REBUILD, not a greenfield page (confirmed with Nick at Step 0)

A full Comparable Titles feature already existed (`ComparableTitlesPage` + `CompShelf` +
`SuggestionsSection` + `comps.ts` + `suggestComps.ts`, routed at `/manuscripts/comps`). Nick chose
**full replace**. Retired verbatim: `src/components/manuscripts/CompShelf.tsx` and
`SuggestionsSection.tsx` (deleted — they were imported only by this page). The pitch-line/shelf
grammar is gone; the flat-list + role/health + `inQuery` + Scout grammar replaces it.

## Final `CompTitle` shape (additive + omit-empty — Nick's chosen option)

`src/types.ts`:

```ts
export type CompMedia = "book" | "film" | "tv" | "other";
export interface CompTitle {
  title: string;
  author?: string;
  publisher?: string;   // NEW
  year?: number;
  note?: string;
  media?: CompMedia;    // NEW — absent === "book"
  matchAxis?: string;   // NEW — "tone · atmosphere" free text
  inQuery?: boolean;    // NEW — the ONLY stored intent; absent === false
  source?: "user" | "suggested";
}
```

Fields **added**: `publisher`, `media`, `matchAxis`, `inQuery` (+ the `CompMedia` type). `author` and
`year` kept **optional-and-omitted-when-empty** (not made required as the brief literally spec'd) to
match the codebase's "no undefined inside Firestore maps" convention and keep the quick-add / CSV /
legacy paths valid. `media` is omitted when `"book"`; `inQuery` only written when `true`. Every write
goes through `normalizeComp` (in `ComparableTitlesPage.tsx`) which enforces this.

Derivations (pure, unit-tested — `src/lib/compsPage.ts`, `compsPage.test.ts`, 23 tests):
`compRole` (market/tone), `recencyFlag` (only an in-query old book), `queryLine`
("For readers of A (Surname, Year) and B (…).", graceful empty), `queryHealth` (recent-book
thresholds), plus `compMedia`, `compCounts`, and `currentYear()` as the single live year source.

## ✅ Firestore rules — NO change required, NO deploy (corrects the brief's assumption)

The brief warned the new fields would be silently rejected and need a rules deploy. **They are not.**
`firestore.rules` validates comps only as `data.comps is list && data.comps.size() <= 12` (per-item
map shape is deliberately client-enforced — no `isValidComp`), and `comps` is already in the
manuscript update allowlist. New per-comp fields pass untouched.

- Only rules edit made: the **stale comment** above that clause was updated to list the new fields and
  record that no rule change was needed. **Comment-only — zero enforcement change, no deploy needed.**

## Feature flag (Scout live discovery — default OFF)

`src/lib/suggestComps.ts`:
- `export const SCOUT_LIVE = false;` — the compile-time default (OFF).
- `scoutLive()` — effective flag, reads `globalThis.__SA_SCOUT_LIVE` (dev/preview override) else
  `SCOUT_LIVE`. Reads `globalThis` (not `window`) so it's node-safe.

With the flag OFF (shipped state), a Pro user clicking **Send the Scout out** gets a graceful
"The Scout goes live soon…" state — **never a fabricated result**. Set `window.__SA_SCOUT_LIVE = true`
(and optionally `window.__SA_SUGGEST_COMPS_MOCK = { suggestions: [...] }`) in the console to exercise
the live scan → results path on dev without shipping it on.

## `suggestComps` callable contract (defined here; function is the NEXT prompt)

Evolved `src/lib/suggestComps.ts` to the richer Scout shape the design ref's results need. The next
prompt's Cloud Function must return `{ suggestions: CompSuggestion[] }` where:

```ts
interface CompSuggestion {
  title: string; author: string; publisher?: string; year: number;
  media: CompMedia; matchAxis?: string; why: string; verified: boolean;
  links?: { bookshop?: string; googleBooks?: string };
  agentMatch?: number;   // agent-bridge hook — rendered ONLY when present (matching is a later prompt)
}
```
Input `SuggestCompsInput`: `{ manuscriptId, manuscriptTitle, ageCategory, genre, logline, synopsis?,
shelfTitles[] }`. `validateSuggestionsPayload` drops malformed items (requires title/author/why + a
sane integer year; defaults `media`→book, `verified`→false; omits absent optionals). `suggestionToComp`
pushes a **suggested-source, UNTICKED** comp (the writer decides `inQuery`).

## Locked components — reused verbatim, nav rail untouched

- `HubHeaderBar` — the masthead (title + derived pulse subtitle + manuscript selector in its `right`
  slot). Not restyled.
- `FormShell` + `BrandDropdown` — the add/edit-a-comp form (title/author/publisher/year/media/axis).
- `StatusDot` / `MountPanel` — not needed by this page (no status/parchment surfaces here); untouched.
- **Nav rail NOT restyled/re-architected.** `/manuscripts/comps` was already registered
  (`railNav.ts` `comps`, `AppShell` `RAIL_ICONS`, `topCrumb.ts`, `routeTiers.ts`) — no plumbing added.
- No bare `.ti` class used; glyphs are `lucide-react` (same as the rest of the app).

## Discrepancies between brief and live code, and how resolved

1. **"Build a NEW page" vs it already exists** → confirmed **full replace** with Nick; retired the old
   CompShelf/SuggestionsSection.
2. **Design ref absent from repo** → Nick had it in Downloads; copied to `design-refs/comparable-titles-flat.html` and built to it.
3. **Model: `author`/`media`/`matchAxis` required, `year: number|null`** → Nick chose **additive +
   omit-empty**; kept author/year optional-omitted, new fields optional with read-time defaults.
4. **"Update the Firestore rules allowlist (a deploy Nick must do)"** → **not required** (see above);
   only a stale comment corrected.
5. **Phase 2 "register the route"** → already registered; a no-op. Phase 2 became the shell rebuild.
6. **Masthead is a card (HubHeaderBar) vs the ref's flat bottom-bordered header** → used the locked
   HubHeaderBar per the brief's locked-components list; deliberate, minor visual deviation. The pulse
   line therefore renders in HubHeaderBar's mono-uppercase subtitle style rather than the ref's
   mixed-case line.
7. **`BrandDatePicker`** listed as a primitive → a comp's `year` is a year, not a date, so a numeric
   input is used instead; `BrandDatePicker` was not a fit.
8. Page-scoped theme tokens (`--ct-*` in `src/components/manuscripts/comps.css`) take their values
   **verbatim from the design ref**, following the established `agentsV2.css` / `manuscripts.css`
   page-scoped-token precedent (per-theme hexes in the page CSS, no `color-mix()`), rather than
   aliasing the app-wide `--hub-*` set — the ref's band/pro/warn colours are page-specific.

## In-browser verification — NOT done here (auth-gated)

The app requires Firebase login; the preview harness can't authenticate, and another session's dev
server is running in this tree. The design ref was ported faithfully and all gates are green, but
**Nick must eyeball `/manuscripts/comps` on dev across all three themes × both tiers**:
- Free vs Pro Scout panel (toggle by account plan).
- The in-query toggle rebuilding the query line + health note; copy-to-clipboard.
- Add/edit-a-comp form in each theme; the Cappuccino inset frame on the panels.
- With the flag OFF, "Send the Scout out" → the "goes live soon" state (no fabricated results).
- Optionally flip `window.__SA_SCOUT_LIVE`/`__SA_SUGGEST_COMPS_MOCK` to preview the live scan/results.

## Still OUT / pending (later prompts)

- **`suggestComps` Cloud Function** — LLM web-search + Google Books verification. Next prompt, behind
  Blaze / API-key secret / functions deploy. Then flip `SCOUT_LIVE` (or the window override → the
  compile-time default).
- **Agent-bridge matching** — the `agentMatch` hook renders only when a suggestion already carries the
  count; the matching logic is a later prompt (never fabricated here).
- Recognition / "success-not-phenomenon" meter, "X meets Y" builder, read-status marker.

## Multi-stream note

Another stream (packages redesign) had `App.tsx`, `SubmissionPackages.tsx`, `agents/*`, `packages/*`
dirty throughout. **No overlap with this scope** — the comps route already existed, so `App.tsx` was
untouched. All commits used `git commit --only -- <paths>` so the pre-staged `design-refs/themes.md`
(another stream's) never leaked in (verified 0 per commit).
