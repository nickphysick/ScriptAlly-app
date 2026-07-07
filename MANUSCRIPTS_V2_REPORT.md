# Manuscripts v2 — frontispiece plates + Comparable-titles sub-page (run report, 6 Jul 2026)

Move-and-recompose rebuild of the manuscripts overview interior (the v1 bookplate hero → a
one-up frontispiece plate list with an accordion reveal), plus extraction of comps into their own
sub-page. Variant A (Frontispiece) of design-refs/manuscripts-page-v2.html. UNDEPLOYED.

## Commits (one per phase, gates green each: tsc + production build + full Vitest)
- `d97d9fc` design-ref (pre-flight, done by me on go-ahead)
- `6aaef17` Phase 1 — Comparable titles sub-page + rail/route/crumb registration + lock-test updates
- `11d22ef` rail-icon fix (Phase 1 follow-up — see the flag below)
- `b7b6cdb` Phase 2 — frontispiece plates (overview rest state) + FieldCard/MaterialsCard deletion
- `4f08e20` Phase 3 — the reveal (three band panels) + recentQueries sorter
- `<this>` Phase 4 — docs + close-out

Suite: 689 (P1/P2) → **694** at Phase 3 (5 new sorter tests). Recorded fresh at commit time.

## Confirmations honoured
- **§3 rail entry: YES** — comps registered as a first-class route beside Packages via the locked
  mechanism (RAIL_GROUPS + WORKSPACE_PATHS + CRUMB_TABLE + App.tsx branch), no in-page subtab
  strip built. MANAGE→ is an additional way in.
- **§5 wordCountWhisper: KEPT** — dead-but-tested (see Dead code below).
- **Packages date labelled CREATED** (not bare recency) — the entity has only `createdDate`.

## STOP condition — PASSED
The named-package entity (`SubmissionPackage {packageName, 3 slot ids, status, createdDate}`) is
queryable per manuscript from committed code (`packages.filter(manuscriptId && status!=="Retired")`);
part-glyphs lit via committed `isSlotFilled`. No material-type substitution.

## MOVE / REUSE / DELETE ledger (recon → reality)
| v1 piece | Planned | Actual |
|---|---|---|
| CompShelf, SuggestionsSection | MOVE → comps page | MOVED (imports only; components unchanged) |
| spine switcher | MOVE → comps page | MOVED; comp-count subtitle on that page |
| add/remove comp handlers | MOVE | MOVED (byte-identical updateManuscript writes) |
| lifecycle ⋯ menu · edit/delete modals · toasts | REUSE page-level | REUSED; ⋯ now per-plate (`menuOpenId`), modals stay page-level |
| empty-library state | REUSE | RECOMPOSED into plate grammar |
| bookplate hero, `.msv-lower` right column | DELETE | DELETED |
| FieldCard | DELETE | DELETED (reveal roster supersedes) |
| MaterialsCard | DELETE | DELETED (reveal named-packages panel supersedes — NB the overview no longer shows material-type version counts) |

## Adaptations (conservative, flagged)
1. **Accordion height is JS-measured (`Reveal` component), not the mockup's `grid-template-rows:
   0fr→1fr`.** The fr-grid trick resolves `1fr` to **0px** inside the stage's definite-height
   `overflow-y:auto` scroll context (verified: even a fixed 94px track collapsed; the
   `overflow:hidden + min-height:0` grid item gives a 0 min-content and the flex track can't grow).
   It works standalone in the mockup. `Reveal` animates `height` 0↔scrollHeight then releases to
   `auto` — content-accurate AND unbounded-content-safe (a max-height cap would clip tall reveals);
   reduced-motion snaps via media query. **Caught by the browser check, not tsc/tests.**
2. **Rail icon (`11d22ef`).** The rail renders a per-key icon from `AppShell.RAIL_ICONS`, a surface
   NOT type-linked to `RAIL_GROUPS`. The Phase-1 comps entry had no icon → `RAIL_ICONS[key]`
   undefined → RailNavItem crashed the shell on every route. tsc + tests were green (the map is a
   loose Record). Fixed by adding `comps: Library`. **Latent footgun logged in the fix commit +
   CLAUDE.md: new rail entries must touch both RAIL_GROUPS and RAIL_ICONS.** Phase 1 as-committed
   momentarily crashes the rail; `11d22ef` (the very next commit) repairs it — no deploy between.
3. **ChromeSlab already present.** The current AllManuscripts mounts ChromeSlab (a later stream's
   Hub-grammar work), so "the sub-nav carries section identity" was already true — the page head is
   the slab; no duplicate label built.
4. **Packages date = `createdDate`** rendered with a `CREATED` micro-label (Nick's honesty note).
5. **Transient (Phase 1 only):** with the comps panel pulled out, the v1 overview briefly showed
   the right column alone (`.msv-lower-solo`, centred) for one commit; Phase 2 replaced the whole
   interior, and that class is gone.

## Dead-but-tested (kept per §5)
`manuscriptPage`: `stageRows`, `wordCountWhisper`, `compactRange` (+ AGE_SHORT). No longer rendered
(the reveal roster replaced stageRows; plates drop the whisper). Pure + covered — kept to avoid a
coverage hit; a later dedicated cleanup may remove them.

## Tree hygiene
Explicit-path `--only` commits throughout; `git diff --cached --name-only` verified per commit.
Other streams' uncommitted WIP (Discover, packages: JourneyStrip/PackagesHome/packageMetrics/
PackageStats) never touched — I import `isSlotFilled`/`UNFILLED_SLOT` from `packageMetrics` but bind
to the HEAD (committed) exports only; that file's WIP does not change them.

## Walk-prep for Nick
- Staged dev account `bookplate.walk.0705@example.com` (Pro): Citadel (Querying, 3 comps, 1 query)
  + Salt (overlay-shelved). **I pre-seeded two named packages on the Citadel** (`pkg-walk-1`
  Greenhouse Literary — full request [all three parts]; `pkg-walk-2` US agents — first ten pages
  [synopsis empty]) so the reveal's Submission-packages panel has content to show — no need to build
  any in the Builder first. Delete them if you'd rather start clean.
- Walk both hubs × three themes × sparse/rich: plate rest state (corner pill, ornament, epigraph,
  Capp-only frame/grain), expander accordion (one open at a time, JS height), the three reveal
  panels (roster / named-packages with lit-faded parts + CREATED / comps list), MANAGE→ and BUILDER→
  handoffs (write the active-ms key), the comps sub-page from the rail and from MANAGE→.

## Runbook context (free items)
- v1 docs commit landed: `5812448 docs: manuscripts page v1 locked specs (Phase 6)` — present.
- `#/pkg-lab` still on main (`App.tsx` DEV hash route + `packages/PkgLab.tsx`).

## Standing queue (unchanged)
`firebase deploy --only functions` for `suggestComps` (Blaze/API-key gate; key rotation first) ·
jottings-feed home-or-gone decision · prod deploy is a separate call.
