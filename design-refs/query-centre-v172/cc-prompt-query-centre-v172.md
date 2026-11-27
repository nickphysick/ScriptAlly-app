```
BUILD: Query Centre v172 — the new query list, Birds-eye (calendar line, overdue chips, All overview, phone grouping), and the smart filter panel
Repo: nickphysick/scriptally-app · Branch: query-centre-v172 (cut from origin/main) · dev only — never merge to main, never deploy prod
UK spelling throughout. App copy never says "tap".

═══ GLOBAL RULES ═══
- One worktree for this session (git worktree add ../ScriptAlly-qc172 -b query-centre-v172 origin/main). Work only there.
- Commit with `git commit --only -- <explicit paths>`. Never `git add -A`.
- Record baseline `npx tsc --noEmit`, `npm run build`, `npx vitest run` BEFORE any edit. The gate is "no worse than baseline", not "green".
- `git diff --name-only HEAD` must be empty before trusting any gate result.
- No API-spending tests or evals of any kind.
- STOP-and-report is the only red gate. Pre-launch, no users: never halt on dirty trees or other sessions' work.
- Deploy to dev at the end (allowed). Prod stays Nick's.

═══ THE DESIGN REFS (the oracle) ═══
Pack: query-centre-v172-pack.zip → commit its folder to design-refs/query-centre-v172/ in phase 0.
Check every file against design-refs/query-centre-v172/SHA256SUMS (`sha256sum -c SHA256SUMS`). Any mismatch or missing file → STOP.
Live mock (same code): https://claude.ai/artifact/UcMtBSdGf7oGCK7vXGpGDr (v19.1)

The mock IS the app's own code, run against stubbed data. It was built on main @ 7f70f99f. The refs are:
  mock-tracked.patch — the mock's edits to existing files (Queries.tsx, QcBar153, QcBirds150, QcMatTile, QcPage151, QcSlip153, lib/qc150.ts, lib/qcBirdsEye.ts)
  src/… — the mock's new files (QcRow170.tsx, QcRows169.tsx, QcSmart172.tsx, qcv169.css, qcv172.css, lib/next169.ts, smart172.ts, mock169.ts)
  01–09 *.png — what it must look like (1512, 1280 and 1920 wide; Birds-eye All and 3M; the panel set; the panel's foot; nothing matches)
PORT WHOLESALE. Do not re-derive from the screenshots. Where main has moved since 7f70f99f, apply the same change to today's code.

MOCK-ONLY — strip on the way in, never ship:
- mock169.ts and every useMock169() read: hard-code each switch to its CHOSEN value (below) and delete the losing branches.
- Mock169Panel (the "Review switches" box) and its CSS (.mk169…).
- The mock's list variants that lost: list "rows" (v6) and "cards" view switches inside QcRows169/QcPage151, Layouts 2–4 (tl beside/under/lead), the rows-mode markup. Keep ListCap169 and the "ledger" path only.
- The heading-row colour options other than Deeper blush; the "As built" filter-panel path (QcViews156 in the Queries rail).
- The module-level store in smart172.ts: becomes real page state (phase 4).
- Anything under src/mockstub/, vite.mock.config.ts, main.tsx/App.tsx basename edits — NOT in the pack; never add them.

CHOSEN SWITCH VALUES (the mock's defaults = Nick's rulings):
  list = ledger ("New list v7"), tl = steps ("1 Steps with dates"), next = act (action-led Next box), fp = smart,
  g1 = on (one grouping), fold = on (More filters), hint = on (nothing-matches hint), mpills = on (Sent by as pills),
  bars = off (chart bars NOT clickable), views = off (no saved views), head = blushd, cw = consider.

═══ STEP 0 — RECON GATE (report before any edit) ═══
0.1 Worktree, branch, base SHA. Baseline tsc / build / vitest numbers.
0.2 Refs present and checksums pass.
0.3 `git apply --check design-refs/query-centre-v172/mock-tracked.patch` on the new branch. If it does not apply, list each failed hunk and what moved on main since 7f70f99f — then carry on porting by hand (not a stop).
0.4 Confirm these exist on main and are what the mock assumes: QcPage151, QcBirds150, ListCap/whereItStands (lib/qcSummary), tileCourt, beLine/beScale (lib/qc150), Track153/slipTrack, MatTile, statusBand/STAGE_COLOURS, the AppliedRow chips row, Qc138Filters/matches138, railCounts, the Agents list's heading CSS (contactListRows.css, 18px typewriter).
0.5 Name any false premise at the top of the report. STOP only if: refs missing/mismatched, or QcPage151/QcBirds150/Queries.tsx no longer render the Query Centre.

═══ PHASE 1 — the new list (one commit) ═══
- Add QcRow170.tsx, QcRows169.tsx (ListCap169 only, ledger), qcv169.css (strip variant rules), lib/next169.ts. QcMatTile `pill` prop. QcSlip153 exports A_IN/A_OUT/A_QUIET/A_END and the zzz quiet badge.
- QcPage151: the plain strip under the pinned toolbar (no gradient fade), the list card with the sticky cap, sticky filter rail.
- Columns: Agent · Where it stands (steps with dates) · Sent by (method icon + word) · Materials (icon pill) · Next (action button + reason line).
- Column headings: Special Elite 18px (16px below 1400px wide), heading row 54px on DEEPER BLUSH: background #e8bdb4, edge #d9a99c, ink #1c130f. "Sent by" heading LEFT-aligned; Where it stands and Materials headings centred; Next centred over its buttons; Agent aligned with the agent names.
- Column widths exactly as qcv169.css (wide / 1400–1519 band / narrow). At 1280 the method shows its icon only (heading hidden).

═══ PHASE 2 — Birds-eye (one commit) ═══
- Calendar logic as built: real dates, the line is always TODAY. (The mock's earlier "line up on the reply date" option is gone — do not reintroduce.)
- Overdue chip: a navy pill on the bar at the reply date (white "!" disc + "12 Oct"), vertically centred, never closer than 40px to the today line; the bar's own label shortens to the stage name and hides if it would collide. Hover: "Reply was due 12 October".
- All view (new zoom level, the default on open): the whole campaign fits the width, slim 15px rows, no names column, no bar text; overdue shows as a small navy dot; agent name + agency in a navy label beside the bar on row hover; the zoom pill sits on its own row with "Your whole campaign. Point at a bar to see who it is; click to zoom in there." Click the timeline → 3M centred on that date. Ctrl+wheel / pinch steps All · 6M · 3M · 6W at the pointer. Zoom pill order: All · 6W · 3M · 6M.
- Grouping "Where it stands" (new BeGroup "state", the default): Needs action · Within their window · Waiting, no reply date · Closed (always last). Closed rows keep their history bars, end where they closed (no current bar, no date), at 80% opacity. eyeRows(…, withClosed). The "N closed queries aren't shown" footer is not drawn under this grouping. Menu line: "Needs action, within their window, waiting with no reply date, closed".

═══ PHASE 3 — one grouping for the list (one commit) ═══
- With Group = Action, the list uses the same four groups as Birds-eye (group172 in smart172.ts), Closed last.
- Inside Needs action the most urgent come first (tier172): an offer · a request past its send-by date · another request to answer · a nudge due · gone quiet (Consider closing). Ties keep the chosen sort.

═══ PHASE 4 — the smart filter panel (one commit, may be two) ═══
- QcSmart172 replaces QcViews156 in the Queries rail. Its state moves from the module store into Queries.tsx page state, remembered with the page's existing remembered-visit filters exactly as qcF138 is. Header/link filters (qcF138.where etc.) still apply alongside.
- Sections, in order: navy header ("Filter", "x of y", Clear all) · quick picks With you / Needs chasing / Waiting + "Include closed" pill · Stage (four glyphs, multi-select, counts = stopped at that stage) · Sent (weekly bars + two-handle range, NOT clickable bars) · Agent's reply date · Your send-by date · More filters (folded; opens itself while any inside is set): What you sent (top three package pills + find box), Sent by (pills with the method icon), Agent fit (min stars), Where the agent is (country list with flags, only countries you've queried), Materials (Any / Recorded / Missing) · foot.
- Date fields: two-handle ranges in weeks around today (reply −8w…+12w, send-by −4w…+8w; the ends are open), today tick, blush bars for past weeks, a "Not dated" tick box. Reply date covers queries waiting on the agent only; send-by covers your move only; when both are set a query passes on either. "Not dated" on reply = exactly Birds-eye's "Waiting, no reply date".
- Wording (dueText172): "Overdue", "Due by 29 Jan", "Not yet due", "Due in the next 4w", "Due 12 Dec – 29 Jan", "Dated only", "+ undated".
- A set section: navy dot by the title, what's picked on its own navy line under the title, a "Reset" link on the right that resets only that section.
- Applied chips: the panel feeds the existing "Filtered by" row (chips172) — one chip per stage / package / method / country; Clear all (row and header) clears the page filters, the search and the panel.
- Nothing matches: under "No queries match", "Remove "{chip}" to see N queries." + "Remove it" (the single chip whose removal brings back the most).
- Rulebook (consistency rulings v2–v4): 16 body / 14 secondary #5b4f47 / 12 captions #6b6058; panel title Special Elite 20; section titles Source Serif 600 16; every pill is the shell's standard filter pill (--sp-fpill-h / --sp-fpill-size, white with #e3ddd3 hairline, navy + white 600 when on); text fields 44 high, radius 10, 1px ink edge, navy edge on focus only; one focus ring; hovers (filled darkens, outline tints 6%, rows #f8f4ed). Read values from qcv172.css — it already conforms.
- Data the panel reads: agent.starRating, agent.country, query.sendMethod (email / query manager / online form / post), the package name (pkgKeyOf + qcPackageName, "Nothing recorded" when none), QcRow.furthest/status for Stage.

═══ PHASE 5 — locks (one commit) ═══
Playwright on dev-server seed data (the emulator seed; prove the population is non-zero before asserting):
L1 heading row: computed background #e8bdb4, font Special Elite 18px at 1512, 16px at 1280; "Sent by" heading left edge == column left edge (±2px).
L2 Birds-eye opens on All: every bar inside the card width; no names column; row hover shows the name label.
L3 overdue chip: present on every overdue row at 3M; its centre within 2px of the bar's vertical centre; ≥ 40px left of the today line.
L4 grouping: list and Birds-eye group keys identical and in the same order; Closed last; first Needs-action row is an offer when one exists.
L5 panel: picking Stage Queried shows only furthest==queried rows; reply "Not dated" count == Birds-eye "Waiting, no reply date" count; setting reply + send-by together never yields fewer rows than either alone.
L6 rulebook sizes in the panel: no computed font-size outside {12, 14, 16, 18(ranges' numbers excluded), 20} px on text nodes.
Red-before: break each lock's subject once and show it fails before trusting a green.

═══ BAKED DECISIONS (do not relitigate) ═══
- Deeper blush heading row (#e8bdb4) — Nick's pick, knowing it is the Partial-sent stage colour. Do not swap for navy.
- Stage filter is multi-select, named "Stage", by furthest stage reached; R&R counts as Full.
- No "Since anything happened" filter. No clickable chart bars. No saved views. No slate headings.
- Close wording stays "Consider closing".
- Agent name labels in the All view appear on hover only.

WENT IN AS PROPOSED (not individually ruled — report, don't change):
- Next-box wording "Wait for a reply" and "Add a reply date".
- The Group pill still reads "Action" when the list uses the Birds-eye groups — flag whether it should read "Where it stands".
- Ctrl+wheel/pinch zoom steps; the All view's +10-day right margin; country names map (GB→United Kingdom etc.).

═══ DO NOT TOUCH ═══
- The Contact list / Agents page and its CSS (contactListRows.css, contactPanel.css, contactQcLayout.css), shell/FilterPanel.tsx and filterPanel.css (the Contact list still uses them).
- Phone (<768px) Query Centre and phone Birds-eye (phone-birds-eye-world-*), lib/qcBirdsEye phone readers beyond the withClosed parameter.
- QcCard154 (the card view) beyond what removing its switch needs.
- Any prod config, firebase.json, functions/.

═══ FINAL REPORT ═══
False premises first. Then: per phase — commit SHA, files, what was stripped. Baseline vs final tsc/build/vitest. Each lock: red-before evidence + green. Dev deploy bundle name. Screenshots at 1512/1280/1920 of the list, Birds-eye All and 3M, the panel set and folded open, nothing-matches — side by side with refs 01–09. Every "went in as proposed" item listed for Nick.
```
