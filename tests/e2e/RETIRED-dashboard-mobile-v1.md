# Retired or re-pointed by Dashboard on the phone v1 (28 Oct)

Below 768px the dashboard renders `DashPhone` in Dash58's place. Every lock that asserted on the old phone
dashboard is listed here, one line each.

- `src/components/dashboard/dashboardMobile.test.ts` · "the mobile block exists and the new surfaces hide at md+" — **retired**: the v37 phone block and the md+ hide are deleted; replaced by "the v37 phone stack's rules are retired, not left inert".
- `src/components/dashboard/dashboardMobile.test.ts` · "desktop furniture stands down below md: the action row, fortnight strip" — **retired**: those rules had no consumer; the same claim is now the rendered DM1-E1 (no header buttons, ring cards or task pager on a phone).
- `src/components/dashboard/dashboardMobile.test.ts` · "THE DESK LINE: hot is a tinted card …; calm is a hairline row" — **retired** with the desk line's rules.
- `src/components/dashboard/dashboardMobile.test.ts` · "the desk line and the mobile to-do doorway are retired from the dashboard" — **kept, narrowed**: its `toContain("OneScreenDashboard")` read a string that only survives in Dashboard.tsx's comments; the retirement claim stands.
- `src/components/dashboard/dashboardMobile.test.ts` · new: "Dashboard renders DashPhone when useIsMobile says so, and Dash58 otherwise" and "Dash58's phone gutter and header-button wrap are retired; the feed drawer's width stays".
- `tests/e2e/inkShell.measure.ts` · INK19 — **re-pointed**: on `/dashboard` the shell's generic phone bar (`.ws-mobilebar`) leaves the comparison, because Home draws its own top bar (DM1-A1). Every other element on every route is still held to main. INK19 was already red on dev before this pack (nine background-colour lines); it is no worse.
- `dash58.css` · `@media (max-width: 767px)` — the phone gutter and `.d58-btns` wrap retired (no lock read them); the feed drawer's width kept.
