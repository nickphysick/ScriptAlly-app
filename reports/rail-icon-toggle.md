# Rail icon toggles — run report

**Branch:** `claude-il` · **Date:** 27 Jul 2026 · Amends `reports/rail-section-select.md`.
Behaviour only — no visual change anywhere.

## Commit + gates

| Phase | SHA | Gates |
|---|---|---|
| 1 — rail icon toggles the open section | `448c621` | tsc clean · vite build clean · Vitest **1629/1629** |

(Suite grew 1627 → 1629: the amended behaviour table carries two more locked cases.)
**Not deployed** — dev runs the rail-section-select build (`43cbfa8`).

## How "which section is open" is read at click time

The recon red gate was real: the click handler could see the route but not the open accordion
section, which lived as `ShellSidebarBody` local state. Approximating with the route's section
was exactly the forbidden move (the worked example is the case where they differ), so the state
was **lifted**: `openSec` is now owned by `AppShell` — the accordion is a controlled component
(`openSection` + `onToggleSection` props), the rail receives `openSection`, and
`railClickPlan(ribKey, pathname, collapsed, openSection)` reads the real thing. A pleasant
consequence: the `{sec, n}` browse bump-channel from the previous pack dissolved — a browse is
now plain assignment to the one state owner. Route-sync and snap-on-collapse effects moved up
with the state, unchanged in behaviour.

## The worked example — confirmed switching, not collapsing

Locked as its own named test in `shellV2Nav.test.ts`:
`railClickPlan("querying", "/todo", false, "agents")` → `{ kind: "browse", section: "querying" }`.
On To-do (Querying's own page) with Agents browsed open, clicking Querying **switches** and
stays expanded — collapse fires only when the clicked icon's section is the open one
(`railClickPlan("querying", …, false, "querying")` → `collapse`).

## The rest of the amended table

- Dashboard on Dashboard, expanded, **no section open** → collapse (replaces the no-op).
- One **implicit cell** the pack's table doesn't state: Dashboard on Dashboard, expanded, with
  a section browsed open → switches to the no-section view (consistent with "a different
  section switches"); collapse then needs a second click. Locked as a test; flag if you'd
  rather it collapse in one.
- Setup (standing single-destination flag, unchanged) gains the symmetric toggle on /account.
- The `noop` plan kind is deleted from the type — every cell does something, and a pure-test
  sweep locks "no collapsed click ever collapses" across all ribs × routes × open states.
- Unchanged and still locked: rail highlight tracks the route, section clicks never navigate
  (so auto-collapse cannot fire — it observes the pathname), abandon-a-browse + snap-back,
  flyouts, tuck, `⌘\`, the ground-fill nav law.

## Design ref updated

`design-refs/app-shell.md`: the rail-section-select paragraph now carries the amended table,
and the superseded phrasing ("never collapses" / collapse belonging to `⌘\` and the tuck
alone) is deleted — replaced with "⌘\ and the tuck still collapse; they are simply no longer
the only ways". The old statement survives only inside `reports/rail-section-select.md`, which
is a historical run record (repo convention: reports are never retro-edited). Nothing in
source depended on the retired behaviour — the abandon-a-browse handler's rail-click exclusion
stays correct, since rail-initiated collapse now flows through the plan, not the outside-click
path.

## Needs a browser check

1. **Toggle feel** — expand via a section icon, click the same icon: the panel closes. The
   specific worry: collapse-then-immediately-expand (double-click, or a quick change of mind)
   — does the width transition read as responsive or twitchy?
2. **The worked example live** — on To-do, browse Agents, click Querying: switches, no
   collapse, no navigation.
3. **Dashboard double-duty** — on Dashboard: first click expands (no section open), second
   click collapses; with a section browsed open it steps through the no-section view first
   (the implicit cell — judge whether the extra step feels right).
4. **Snap-back still intact** — after a rail-toggle collapse, the next expansion opens on the
   current page's section, not the last-browsed one.
