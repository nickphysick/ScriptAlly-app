# Consistency audit v1 — summary

Generated 2026-11-19T01:01:51.712Z. Run: `../../../private/tmp/claude-501/-Users-nickphysick-ScriptAlly-app/25cab010-0c64-48aa-975a-ada7bdda7356/scratchpad/run2`. Full report: `audits/consistency-v1/report.html`; data: `findings.json`.

## Counts by tier

| Tier | Findings |
|---|---|
| B — needs Nick | 146 |
| A — mechanical | 0 |
| C — deliberate | 6 |

## Counts by part

| Part | B | A | C |
|---|---|---|---|
| text | 32 | 0 | 3 |
| page header | 27 | 0 | 2 |
| button | 20 | 0 | 0 |
| in-page navigation | 14 | 0 | 0 |
| form control | 10 | 0 | 0 |
| list part | 10 | 0 | 0 |
| surface | 8 | 0 | 0 |
| tag / status mark | 7 | 0 | 0 |
| rules | 6 | 0 | 0 |
| card | 5 | 0 | 0 |
| overlay | 4 | 0 | 0 |
| footer | 3 | 0 | 0 |
| small part | 0 | 0 | 1 |

## The ten most visible Tier B findings

1. **B001** — The sheet (surface) is drawn four different ways across nine pages, differing in background, corner radius. (public pages, 1512 + 1920px; variants: 5 / 2 / 1 / 1 pages)
2. **B002** — The stage (surface) has two different backgrounds across twelve pages. (workspace pages, 1512 + 1920px; variants: 11 / 1 pages; oracle → variant 1)
3. **B003** — The sheet (surface) has two different backgrounds across twelve pages. (workspace pages, 1512 + 1920px; variants: 11 / 1 pages; oracle → variant 1)
4. **B004** — The navy workspace header's gap to the content below has seven different values across ten pages. (workspace pages, 1512 + 1920px; variants: 2 / 2 / 2 / 1 / 1 / 1 / 1 pages)
5. **B005** — The page header's distance from the top of the sheet has four different values across eight pages. (non-workspace pages, 1512 + 1920px; variants: 5 / 1 / 1 / 1 pages)
6. **B006** — The page header's distance from the top of the sheet has six different values across six pages. (public pages, 1512 + 1920px; variants: 1 / 1 / 1 / 1 / 1 / 1 pages)
7. **B007** — The page title is drawn five different ways across six pages, differing in font size, line height, letter spacing, text colour. (public pages, 1512 + 1920px; variants: 2 / 1 / 1 / 1 / 1 pages)
8. **B008** — The page title is drawn three different ways across eight pages, differing in font, font size, font weight, line height. (non-workspace pages, 1512 + 1920px; variants: 6 / 1 / 1 pages)
9. **B009** — The card is drawn 30 different ways across 13 pages, differing in background, border, corner radius, shadow, padding. (workspace pages, 1512 + 1920px; variants: 5 / 3 / 3 / 3 / 3 / 2 / 2 / 2 / 1 / 1 / 1 / 1 / 1 / 1 / 1 / 1 / 1 / 1 / 1 / 1 / 1 / 1 / 1 / 1 / 1 / 1 / 1 / 1 / 1 / 1 pages)
10. **B010** — The section heading (text) is drawn 14 different ways across eleven pages, differing in font size, line height, letter spacing, text colour. (workspace pages, 1512 + 1920px; variants: 2 / 2 / 2 / 1 / 1 / 1 / 1 / 1 / 1 / 1 / 1 / 1 / 1 / 1 pages)

## Pages

- Measured: 41 routes, 82 page-views.
- Failed to load: `/queries` @1512 (opened, but the collector found no visible dialog surface); `/dashboard` @1512 (opened, but the collector found no visible dialog surface); `/queries` @1920 (opened, but the collector found no visible dialog surface); `/dashboard` @1920 (opened, but the collector found no visible dialog surface).
- Redirected: `/goals` → `/dashboard`; `/materials` → `/dashboard`; `/queries/all` → `/queries`; `/you` → `/dashboard`.

## After the Tier A fixes

After run `../../../private/tmp/claude-501/-Users-nickphysick-ScriptAlly-app/25cab010-0c64-48aa-975a-ada7bdda7356/scratchpad/run3`: {"B":146,"C":6} (before: {"B":146,"C":6}).
