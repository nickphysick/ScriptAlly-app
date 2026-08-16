# Found on the way — the To-do one-pass, 16 Aug

One line each, unfixed. Not swept for siblings, not turned into work. Candidates, not a backlog.

- `formatLegacyMaterial` FABRICATES a count when none is stated — `First ${numStr || "50"} pages`,
  `|| "3"` chapters, `|| "3,000"` words (`src/lib/materials.ts`). So a material with no quantity
  renders "First 50 pages" as though the agency had asked for 50. Worse than the `— 0 pages` fixed
  in Item 5 and deliberately not fixed with it: this is legacy display shared by every screen the
  module's own header lists, so it is a sweep of its own.
- The rail shows **two cards for Priya Nair** (rows 10 and 11 on dev), both `Close · Log the close`,
  both with an empty timeline. Either two queries to one agent — legitimate — or a duplicate card.
  Not investigated.
- Five of twelve cards on dev have **no activity rows at all** (`Nothing logged yet.`): every Chase
  and both Closes. They are queries that were demonstrably sent, so either the seed writes no
  per-query subcollection for those shapes or `useDockActivity` is not reaching it. Noted last night
  as well; still true.
- `.tdb-revlink` in the tool row renders only when `reviewSeen || reviewDismissed`, and the briefing
  card was the only thing that set `reviewSeen`. With the card unmounted (Item 2) a fresh account
  sets neither, so the weekly review has no entry point on the page at all.
- ⚠️ **STILL OPEN FROM LAST NIGHT, and Item 9 would have closed it**: every control inside a
  FocusFlow journey is unreachable — `useOverlay`'s `sealBackground()` puts `inert` on `#root` on
  the stated premise that overlays portal to `document.body`, and FocusFlow does not portal. Full
  write-up as item 8 of `reports/found-overnight.md`. Moving the journey INTO the pane removes the
  overlay entirely, which is why it is worth doing rather than patching.
