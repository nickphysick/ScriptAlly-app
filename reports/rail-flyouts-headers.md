# Rail flyouts & header unification — run report

**Branch:** `claude-il` · **Date:** 27 Jul 2026 · Follows `reports/capsule-shell-fixes.md`.
**Ref:** `design-refs/scriptally-rail-flyouts.html` (Nick's supplied file, copied in with P1).
Supersession honoured: the fixes pack's "no hover flyout, rail only" is dead.

## Commits + gates

Every commit passed tsc `--noEmit`, `vite build` and the full Vitest suite (`set -o pipefail`).

| Phase | SHA | Suite |
|---|---|---|
| 1 — quick-nav flyouts on the collapsed rail | `3af126a` | 1623/1623 |
| 2 — panel collapses on navigation | `cbd0ddc` | 1623/1623 |
| 3 — full PageHeader everywhere, compact retired | `ca72a22` | 1623/1623 |
| 4 — dashboard centred header, greeting retired | `1603fc8` | 1623/1623 |

**Not deployed** — dev runs the pre-pack build (`9af16f8`).

## Provisional description lines — for Nick's review

Flagged inline in the source as PROVISIONAL; swap freely:

| Page | Drafted line |
|---|---|
| Manuscripts | "Every manuscript on your shelf, and what each one is out doing." |
| Comparable titles | "The books your manuscript sits beside, gathered and query-ready." |
| Discover | "Agents worth a look, matched to what you write." |
| Import | "Bring your existing spreadsheet across — agents, queries and dates, matched for you." |
| Plans | "Free covers the tracking; Pro adds the tools that think alongside you." |

Not provisional: the Queries Hub line is the pack's baked copy; the Agent list's line resurrects
its own original sub ("Everyone you're querying, watching, or saving for later."); Packages,
Help and Account already carried established copy.

## To-do adoption outcome

**Left as the apparatus, per the pack's own escape.** Its header is the focused-session
machine — the title crossfades to "In focus", the sub-slot cycles ritual lines and the
progress row, the Begin CTA departs on session start. A `PageHeader` underneath would
duplicate the crossfading title; it does not drop in without touching the choreography, so it
was not attempted. To-do remains the reference the unified grammar mirrors.

## The dashboard header

Recovered from **`f38168d`** — the commit immediately before the greeting-variant adoption
(`2a660...2a260f0`). The centred mono eyebrow (date · `weekOfQuerying`, feeding the kicker as
it originally did), the plain Playfair salutation, the chip and the four CTAs beneath, on the
capsule surface. Neither `DashTopBar` nor the old taupe ground came back (red gate clear); the
header-pair/CTA-row duplication from the fixes pack resolves itself — the four CTAs are again
the page's only action surface, still awaiting Nick's which-two-survive call.

## PageHeader — one variant

`PageHeader` ends the pack with **full only**. Compact deleted in P3 (Queries Hub + Agent list
migrated up), greeting + the kicker prop deleted in P4 (dashboard reverted). Both retirements
carry `@ts-expect-error` locks proving the type union rejects them; their CSS blocks and
render tests went with them. The `variant` prop survives as optional `"full"` so existing call
sites stand unchanged.

## Auto-collapse — the feel note (requested)

Built as specified (option a): every pathname change collapses; expansion is manual and lasts
until the next navigation. **The predicted friction is real in principle**: expand → click a
nav row → the panel you just opened closes again. If that grates in use, the one-line
alternative: *keep expansion across exactly one navigation when the navigation originated
inside the expanded panel, and collapse on all others.* Query-param changes (`?q=`
deep-selection) deliberately do not collapse.

## Also noted

- Flyout counts ride a new `useShellNavCounts` hook — the panel's own recipe, shared, so the
  two surfaces can never disagree.
- The Setup flyout's Task settings row navigates to /todo and fires `sa:open-task-settings`
  (the sheet lives in that page and cannot render from a hidden slot) — this also closes the
  capsule-fixes reachability gap.
- Keyboard, as built: ribs open their flyout on focus as well as hover; rows are real buttons
  (Tab order + Enter). No arrow-key menu system — per the pack, reported.
- The collapsed rail's expand control restyled to the mockup's 34px two-pane glyph.

## Needs a browser check

1. **Flyout positioning + grace timing** — the 12px offset, top alignment, viewport clamp at
   the Setup rib (bottom of the rail), the 140ms pointer hand-off, the `.hovering` rib hold,
   and focus-opening for keyboard users.
2. **Auto-collapse on navigation** — the single width transition (no jank), flyout-driven
   navigation collapsing cleanly, and whether option (a) grates (see the feel note).
3. **The Hub's panes under the taller full header** — the list/reading panes absorb the extra
   height; internal scroll intact.
4. **The dashboard centred header on the capsule surface** — eyebrow/salutation/chip/CTA
   stack, the focus-slot split unchanged beneath it.
5. The five provisional description lines in situ — read them where they'll live.
