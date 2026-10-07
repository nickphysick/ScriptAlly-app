# Retired by Query Centre v131.1 (the desk as three ledger cards)

Each case below is skipped with `retiredV1311(why, by)` (`tests/e2e/inkRetired.ts`). A skip is not a
pass, and the report counts these cases. v131.1 replaces only the desk; nothing else on the page moved.

| Case | What it measured | Measured now by |
|---|---|---|
| `qcV131` QC3 | the v131 desk's eyebrow, its two facts on one line each, the foot's date ("NEXT REPLY DUE 31 JUL") and caption ("QUERIES SENT") | QC131-1 D2 (copy), D3 (tiles), D4 (stamp) |
| `qcV131` QC4 | twelve weekly bars a section, this week in full colour, an empty week 2px, the tallest 30 | QC131-1 D5 (the ten-week trend; no bars remain), D6 (the running count, unit) |
| `qcV126` QC126-2.7, its desk-foot reading | the desk foot never read "next due —" where a date had passed | nothing: the cards have no foot. The court-name half of the case stands |
| `qcV131` QC6 | hovering bar *i* shows its own week and count; the bars read as a list | QC131-1 D5 (the trend's tooltip) |

## Unit cases retired with them

| File | Cases | Why |
|---|---|---|
| `src/lib/qcDesk.test.ts` | §2 the desk's facts and foot (five cases); §2 bar heights | the facts, foot and bars are gone; replaced by "v131.1 · the desk's lines" (seven cases) |
| `src/lib/qcDeskWeeks.test.ts` | QC5 · each section counts its own events (five cases) | the bars' arrivals-per-week counting is deleted (`deskEvents`, `bucket`, `deskBars`, `barText`); the London-week cases stay, because the trend reads the same weeks |

## Re-pointed, not retired

| Case | Change |
|---|---|
| `qcV131` (every case's opener) | the desk is `[data-v^="131"]`: the page is still v131's, and the desk says `131.1` |
| `qcV131` QC7 | the carousel's title for the agent court is "With agents" |
| `qcV131` QC16 | the desk's stated numbers are the cards' total, two tiles and stamp (12, as before: 3 + 6 + 3) |
| `qcV126` QC126-2.7 | its proof that the court's name is on the page counts "With agents", the name it has now |
| `inkLib` `qc16-zero` | the named break paints the cards' skeleton (`.qc131-desk`) |

## Red before v131.1, untouched

`qcV126` QC126-2 (no stragglers) reports three rules in `src/components/analytics/a17.css` painting the retired page colour — the Analytics stream's file, and listed as red before v131 in v131's own retirement note.


`qcV131` QC15 compares the phone page against captures under `reports/query-centre-v131/qc15-ref/`,
which were never committed (`git ls-files` finds none), so it fails on any fresh checkout of `main`.
