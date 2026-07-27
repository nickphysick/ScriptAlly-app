# Sunday Review Demotion — the unreviewed week stays reachable

Pack: `todo-review-demotion`, against `d3c4238`. One derivation change, spec-derived (no design
ref — the shipped housekeeping grammar + the shipped review mode, unchanged). One commit.

## Recon findings (both halt tripwires fired AS SHIPPED — both resolved in the granted scope)

1. **The flag read could NOT distinguish handled-from-expired** — completion writes
   `snoozedUntil: endMs+2d`, dismissal `now+3d`; both expire mid-week, so an `isFlagSuppressing`
   read would have RESURRECTED handled weeks as demoted cards from midweek (the tripwire's exact
   fear). Resolution, inside the derivation read only: **"handled" = PRESENCE of a
   completion/dismissal stamp** (`flag?.snoozedUntil` ever written), not expiry. The flag doc
   outlives its snooze (nothing clears the field except a dismissal-UNDO, which correctly
   restores the card), completion and dismissal both count as handled (as the rule demands —
   neither demotes), and no write-side or review-mode change was needed. Lock-tested: an expired
   Monday dismissal still lapses the week on Friday; the undone flag restores it.
2. **The week-key maths was WRONG Tue–Sat as shipped** — `reviewWeek` keyed the RUNNING week on
   days 2–6 (only Sunday/Monday were handled). Fixed in the derivation: every day except Sunday
   now keys the week that ended the previous Sunday. Because the review MODE reads the same
   `reviewWeek`, the pack's premise ("the mode already reviews the most recent completed week
   from any now") becomes true via the shared fn — the mode file itself untouched. Weekday table
   lock-tested (Mon–Sat all key the completed week; next Sunday supersedes).
3. **The ranking slot:** the hk lane has no rank machinery — render order IS the ranking (groups,
   then stale). The demoted card takes its own slot BETWEEN them (below the grouped fix-together
   cards, above stale queries — the expected slot), lifted explicitly since `groupHousekeeping`
   ignores unknown task types. Lane emptiness + Help-me-pick's hk top-up both guard the type; the
   hk Focused session builds from groups+stale so it never leaks; the lane count stays gaps+stale
   by design (the review card is not a gap).
4. Tree clean at `d3c4238`.

## The demotion

| When | Card |
|---|---|
| Sunday–Monday | the Urgent prompt, byte-identical to shipped |
| Tuesday → Saturday, week unreviewed | the HOUSEKEEPING card: coffee spine (`--hk-cof-2`), kicker "THE SUNDAY REVIEW · WEEK {n}" + coffee dot, title "Week {n}, still open", subtitle "Close it properly — five minutes.", a QUIET neutral "Begin the review →" door (never warn) |
| completed or dismissed, any day | absent for the whole week (presence-read; expiry-proof) |
| next Sunday | the new week's Urgent card supersedes; the old week lapses silently — never two |

- The door opens the shipped `weeklyReview` mode unchanged; the ✕ writes the same week-keyed
  flag with the same P2 toast grammar (Undo restores via the cleared field).
- Files: `todoBoard.ts` (reviewWeek fix + the presence-read + the two-stream card + hk routing) ·
  `ToDoPage.tsx` (the slot, emptiness, pick guard, the demoted renderer variant) · `todo.css`
  (`.quietrv` — coffee spine override + the neutral door) · tests.
- Tests 1149 → **1151**: the weekday-key table, the Friday live-case demotion (stream/copy/warn/
  lane), the never-resurrect + undo-restores + supersession suite; two shipped assertions updated
  to the new truth (gone-Tuesday → demoted-Tuesday; the Thursday fixture's hk lane now carries
  the demoted card).
- Deviation: none beyond the two recon resolutions above.
