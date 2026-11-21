# Consistency audit v2 — summary

Generated 2026-11-21T17:46:02.036Z on d80c2b92b. Widths 1512 and 1920. Data: `findings.json` (this folder).

**171 findings** (a role inside one family drawn more than one way), against v1's 144. v1 grouped by look (a dark fill was a "primary" button), so a selected pill, a to-do row and a header button all counted as one button; v2 groups by an explicit role map (`roles.json`). The two counts measure different things: v2's is per role per family.

**126 unclassified selectors** (509 instances) — candidates no role in the map claims, listed below, not grouped.

## Findings by role and family

| Role | workspace | dashboard | non-workspace | onboarding | public | overlays | Total |
|---|---|---|---|---|---|---|---|
| buttons/action | 12 ways | 2 ways | 4 ways | 4 ways | 9 ways | 20 ways | 6 |
| buttons/header-action | 14 ways |  |  |  |  | 7 ways | 2 |
| buttons/icon-only | 6 ways |  |  |  |  | 2 ways | 2 |
| buttons/text-link | 8 ways | 6 ways |  |  |  | 6 ways | 3 |
| cards/band | 15 ways | 2 ways |  |  | 4 ways | 11 ways | 4 |
| cards/framed |  | 2 ways |  |  |  | 2 ways | 2 |
| cards/framed-inner | 2 ways |  |  |  |  | 3 ways | 2 |
| cards/journey-card | 2 ways | 5 ways |  |  |  | 4 ways | 3 |
| cards/note | 4 ways |  |  |  |  |  | 1 |
| cards/plain-card | 6 ways |  | 8 ways | 3 ways | 17 ways | 2 ways | 5 |
| cards/query-card |  |  |  |  |  | 2 ways | 1 |
| cards/side-panel | 3 ways |  |  |  |  |  | 1 |
| cards/stat-tile | 6 ways |  |  |  |  | 4 ways | 2 |
| controls/bare-input | 3 ways |  |  |  | 6 ways | 6 ways | 3 |
| controls/headline-field |  |  |  |  |  | 3 ways | 1 |
| controls/search-field | 4 ways |  |  |  |  | 5 ways | 2 |
| controls/select |  |  | 2 ways |  |  |  | 1 |
| controls/switch |  |  | 2 ways |  |  |  | 1 |
| controls/text-field |  |  |  | 2 ways | 5 ways | 3 ways | 3 |
| controls/textarea |  |  |  |  |  | 3 ways | 1 |
| headings/card | 6 ways | 2 ways | 5 ways |  | 5 ways | 9 ways | 5 |
| headings/hero-line |  |  |  |  | 5 ways |  | 1 |
| headings/page-title | 4 ways |  | 2 ways |  | 5 ways | 4 ways | 4 |
| headings/section | 9 ways | 4 ways | 5 ways | 2 ways | 16 ways | 9 ways | 6 |
| headings/small | 2 ways |  |  |  |  | 3 ways | 2 |
| lists/column-header | 4 ways |  | 4 ways |  |  | 2 ways | 3 |
| lists/group-header | 6 ways |  |  |  |  |  | 1 |
| lists/group-section | 12 ways |  |  |  |  | 10 ways | 2 |
| lists/list-item | 9 ways | 5 ways | 13 ways |  | 13 ways | 9 ways | 5 |
| lists/list-row | 24 ways | 6 ways | 6 ways |  |  | 26 ways | 4 |
| lists/table-head | 4 ways |  |  |  |  | 3 ways | 2 |
| lists/table-row | 2 ways |  | 2 ways |  |  | 2 ways | 3 |
| marks/chart-point |  | 2 ways |  |  |  | 2 ways | 2 |
| marks/chip | 5 ways |  |  |  | 11 ways | 8 ways | 3 |
| marks/count-badge | 11 ways |  |  |  |  | 6 ways | 2 |
| marks/initials-disc | 4 ways |  |  |  |  | 5 ways | 2 |
| marks/key-cap | 2 ways |  |  |  |  | 9 ways | 2 |
| marks/status-tag | 12 ways | 3 ways | 11 ways |  | 5 ways | 16 ways | 5 |
| marks/statusdot | 16 ways | 4 ways |  |  | 2 ways | 14 ways | 4 |
| nav/choice-segment | 5 ways |  | 2 ways |  | 4 ways | 20 ways | 4 |
| nav/choice-tile | 4 ways |  |  |  |  | 7 ways | 2 |
| nav/filter-pill | 11 ways |  |  |  |  | 7 ways | 2 |
| nav/letter-index | 5 ways |  |  |  |  | 5 ways | 2 |
| nav/step |  |  |  |  |  | 3 ways | 1 |
| nav/tab-list |  |  |  |  |  | 2 ways | 1 |
| nav/top-links |  |  |  | 3 ways | 13 ways |  | 2 |
| nav/underlined-tab | 6 ways |  |  | 2 ways |  | 5 ways | 3 |
| nav/view-switch | 3 ways |  |  |  |  | 2 ways | 2 |
| nav/view-switch-option | 4 ways | 4 ways | 2 ways |  |  | 8 ways | 4 |
| panels/close |  |  |  |  |  | 10 ways | 1 |
| panels/footer |  |  |  |  |  | 3 ways | 1 |
| panels/header |  |  |  |  |  | 2 ways | 1 |
| panels/shell |  |  |  |  |  | 10 ways | 1 |
| surfaces/page-footer | 3 ways |  |  |  | 2 ways | 3 ways | 3 |
| surfaces/page-header-navy | 9 ways | 2 ways |  |  | 6 ways | 8 ways | 4 |
| surfaces/page-header-plain |  |  | 4 ways | 2 ways | 6 ways |  | 3 |
| surfaces/sheet |  |  |  | 2 ways | 2 ways |  | 2 |
| surfaces/stage |  |  |  |  |  | 2 ways | 1 |
| surfaces/top-bar |  |  |  |  | 3 ways |  | 1 |
| text/body | 82 ways | 16 ways | 33 ways | 8 ways | 78 ways | 71 ways | 6 |
| text/caption | 12 ways | 6 ways | 8 ways |  | 6 ways | 28 ways | 5 |
| text/label | 8 ways | 3 ways |  | 3 ways | 19 ways | 19 ways | 5 |
| text/numeral | 17 ways | 4 ways | 3 ways |  | 6 ways | 15 ways | 5 |
| text/secondary | 46 ways | 7 ways | 13 ways |  | 21 ways | 60 ways | 5 |
| **Findings** | 44 | 19 | 19 | 10 | 25 | 54 | **171** |

## Pages and states

Measured: 140 page-views.

- dashboard @1512 (dashboard, default) — 118 records
- dashboard-fv @1512 (dashboard, default) — 80 records
- queries @1512 (workspace, default) — 264 records
- queries-analytics @1512 (workspace, default) — 255 records
- queries-responses @1512 (workspace, default) — 144 records
- queries-packages @1512 (workspace, default) — 101 records
- todo @1512 (workspace, default) — 146 records
- todo-corkboard @1512 (workspace, default) — 60 records
- agents @1512 (workspace, default) — 660 records
- agents-discover @1512 (workspace, default) — 56 records
- manuscripts @1512 (workspace, default) — 58 records
- manuscripts-comps @1512 (workspace, default) — 169 records
- manuscripts-versions @1512 (workspace, default) — 22 records
- materials-letters @1512 (workspace, default) — 21 records
- materials @1512 (workspace, default) — 118 records
- goals @1512 (workspace, default) — 118 records
- you @1512 (workspace, default) — 118 records
- queries-all @1512 (workspace, default) — 264 records
- account-profile @1512 (non-workspace, default) — 42 records
- account-preferences @1512 (non-workspace, default) — 87 records
- account-emails @1512 (non-workspace, default) — 37 records
- account-plan @1512 (non-workspace, default) — 69 records
- account-data @1512 (non-workspace, default) — 35 records
- plans @1512 (non-workspace, default) — 63 records
- help @1512 (non-workspace, default) — 48 records
- your-notes @1512 (non-workspace, default) — 81 records
- import @1512 (onboarding, default) — 22 records
- signin @1512 (onboarding, default) — 23 records
- signup @1512 (onboarding, default) — 27 records
- root @1512 (public, default) — 195 records
- pricing @1512 (public, default) — 99 records
- about @1512 (public, default) — 58 records
- contact @1512 (public, default) — 55 records
- founders @1512 (public, default) — 70 records
- welcome @1512 (public, default) — 23 records
- welcome-verified @1512 (public, default) — 53 records
- terms @1512 (public, default) — 96 records
- privacy @1512 (public, default) — 117 records
- help-public @1512 (public, default) — 66 records
- queries-empty @1512 (workspace, empty) — 264 records
- queries-analytics-empty @1512 (workspace, empty) — 55 records
- queries-responses-empty @1512 (workspace, empty) — 51 records
- queries-packages-empty @1512 (workspace, empty) — 42 records
- manuscripts-empty @1512 (workspace, empty) — 58 records
- manuscripts-comps-empty @1512 (workspace, empty) — 44 records
- manuscripts-versions-empty @1512 (workspace, empty) — 22 records
- materials-letters-empty @1512 (workspace, empty) — 21 records
- todo-empty @1512 (workspace, empty) — 146 records
- todo-corkboard-empty @1512 (workspace, empty) — 60 records
- overlay-Log-a-query-journey @1512 (overlays, overlay) — 343 records
- overlay-Query-card-slide-out @1512 (overlays, overlay) — 305 records
- overlay-Search-palette @1512 (overlays, overlay) — 310 records
- overlay-Keyboard-shortcuts @1512 (overlays, overlay) — 438 records
- overlay-Add-an-agent-journey @1512 (overlays, overlay) — 693 records
- overlay-Agent-card @1512 (overlays, overlay) — 712 records
- overlay-Record-a-response-journey @1512 (overlays, overlay) — 488 records
- overlay-Add-a-comp @1512 (overlays, overlay) — 210 records
- overlay-New-package @1512 (overlays, overlay) — 126 records
- overlay-Account-menu @1512 (overlays, overlay (menu)) — 124 records
- journey-laq-who @1512 (overlays, journey step) — 343 records
- journey-laq-when @1512 (overlays, journey step) — 297 records
- journey-laq-fork @1512 (overlays, journey step) — 296 records
- journey-laq-package @1512 (overlays, journey step) — 302 records
- journey-laq-how @1512 (overlays, journey step) — 296 records
- journey-laq-nudge @1512 (overlays, journey step) — 305 records
- journey-laq-check @1512 (overlays, journey step) — 314 records
- journey-laq-note @1512 (overlays, journey step) — 314 records
- journey-rr-picker @1512 (overlays, journey step) — 488 records
- journey-rr-composer @1512 (overlays, journey step) — 299 records
- journey-rr-more @1512 (overlays, journey step) — 301 records
- dashboard @1920 (dashboard, default) — 122 records
- dashboard-fv @1920 (dashboard, default) — 82 records
- queries @1920 (workspace, default) — 264 records
- queries-analytics @1920 (workspace, default) — 255 records
- queries-responses @1920 (workspace, default) — 144 records
- queries-packages @1920 (workspace, default) — 101 records
- todo @1920 (workspace, default) — 145 records
- todo-corkboard @1920 (workspace, default) — 60 records
- agents @1920 (workspace, default) — 660 records
- agents-discover @1920 (workspace, default) — 56 records
- manuscripts @1920 (workspace, default) — 58 records
- manuscripts-comps @1920 (workspace, default) — 169 records
- manuscripts-versions @1920 (workspace, default) — 22 records
- materials-letters @1920 (workspace, default) — 21 records
- materials @1920 (workspace, default) — 122 records
- goals @1920 (workspace, default) — 122 records
- you @1920 (workspace, default) — 122 records
- queries-all @1920 (workspace, default) — 264 records
- account-profile @1920 (non-workspace, default) — 42 records
- account-preferences @1920 (non-workspace, default) — 87 records
- account-emails @1920 (non-workspace, default) — 37 records
- account-plan @1920 (non-workspace, default) — 69 records
- account-data @1920 (non-workspace, default) — 35 records
- plans @1920 (non-workspace, default) — 63 records
- help @1920 (non-workspace, default) — 48 records
- your-notes @1920 (non-workspace, default) — 81 records
- import @1920 (onboarding, default) — 22 records
- signin @1920 (onboarding, default) — 23 records
- signup @1920 (onboarding, default) — 27 records
- root @1920 (public, default) — 195 records
- pricing @1920 (public, default) — 99 records
- about @1920 (public, default) — 58 records
- contact @1920 (public, default) — 55 records
- founders @1920 (public, default) — 70 records
- welcome @1920 (public, default) — 22 records
- welcome-verified @1920 (public, default) — 52 records
- terms @1920 (public, default) — 96 records
- privacy @1920 (public, default) — 116 records
- help-public @1920 (public, default) — 66 records
- queries-empty @1920 (workspace, empty) — 264 records
- queries-analytics-empty @1920 (workspace, empty) — 55 records
- queries-responses-empty @1920 (workspace, empty) — 51 records
- queries-packages-empty @1920 (workspace, empty) — 42 records
- manuscripts-empty @1920 (workspace, empty) — 58 records
- manuscripts-comps-empty @1920 (workspace, empty) — 44 records
- manuscripts-versions-empty @1920 (workspace, empty) — 22 records
- materials-letters-empty @1920 (workspace, empty) — 21 records
- todo-empty @1920 (workspace, empty) — 145 records
- todo-corkboard-empty @1920 (workspace, empty) — 60 records
- overlay-Log-a-query-journey @1920 (overlays, overlay) — 343 records
- overlay-Query-card-slide-out @1920 (overlays, overlay) — 305 records
- overlay-Search-palette @1920 (overlays, overlay) — 310 records
- overlay-Keyboard-shortcuts @1920 (overlays, overlay) — 438 records
- overlay-Add-an-agent-journey @1920 (overlays, overlay) — 693 records
- overlay-Agent-card @1920 (overlays, overlay) — 712 records
- overlay-Record-a-response-journey @1920 (overlays, overlay) — 488 records
- overlay-Add-a-comp @1920 (overlays, overlay) — 210 records
- overlay-New-package @1920 (overlays, overlay) — 126 records
- overlay-Account-menu @1920 (overlays, overlay (menu)) — 128 records
- journey-laq-who @1920 (overlays, journey step) — 343 records
- journey-laq-when @1920 (overlays, journey step) — 293 records
- journey-laq-fork @1920 (overlays, journey step) — 296 records
- journey-laq-package @1920 (overlays, journey step) — 298 records
- journey-laq-how @1920 (overlays, journey step) — 292 records
- journey-laq-nudge @1920 (overlays, journey step) — 301 records
- journey-laq-check @1920 (overlays, journey step) — 310 records
- journey-laq-note @1920 (overlays, journey step) — 310 records
- journey-rr-picker @1920 (overlays, journey step) — 488 records
- journey-rr-composer @1920 (overlays, journey step) — 295 records
- journey-rr-more @1920 (overlays, journey step) — 297 records

Nothing failed to load.

Roles in the map with no member on any page (so no finding can be made about them):

- controls/checkbox
- controls/radio
- surfaces/rail

## Unclassified

| Kind | Selector | Instances | Pages | Example |
|---|---|---|---|---|
| box | `p.fp-ft` | 44 | agents, journey-laq-check, journey-laq-fork, journey-laq-how +18 | [data] |
| box | `div.laq-trk` | 18 | journey-laq-check, journey-laq-fork, journey-laq-how, journey-laq-note +5 | [data] |
| box | `div.laq-cf` | 18 | journey-laq-check, journey-laq-fork, journey-laq-how, journey-laq-note +5 | [data] |
| box | `div.mk-bef-who` | 14 | root |  |
| box | `div.mk-lc-line` | 12 | root |  |
| box | `ul.mk-fticks` | 12 | root | Queries, partials and fulls on one card  |
| box | `div.mk-lc-ms` | 10 | root | [data] |
| box | `div.mk-lc-tabs` | 10 | root | [data] |
| box | `div.qc153-fact` | 8 | journey-laq-check, journey-laq-note | [data] |
| click | `button.sa-mi.am-row` | 8 | overlay-Account-menu | [data] |
| box | `div.k62-sb-q` | 8 | queries-packages-empty | “Who are you?” |
| box | `div.clq-captop` | 6 | agents, overlay-Add-an-agent-journey, overlay-Agent-card | [data] |
| box | `div.cl26-frame` | 6 | agents, overlay-Add-an-agent-journey, overlay-Agent-card | [data] |
| box | `div.qc152-band` | 6 | journey-rr-composer, journey-rr-more, overlay-Query-card-slide-out | [data] |
| click | `button.qc152-ed` | 6 | journey-rr-composer, journey-rr-more, overlay-Query-card-slide-out | [data] |
| box | `div.qc152-bx` | 6 | journey-rr-composer, journey-rr-more, overlay-Query-card-slide-out | [data] |
| box | `div.qc152-bx.tinted` | 6 | journey-rr-more, overlay-Query-card-slide-out | [data] |
| mark | `span.cp32-stepn` | 6 | manuscripts-comps-empty | [data] |
| box | `div.pl3-art` | 6 | plans | [data] |
| box | `div.a26-cols` | 6 | queries-analytics | [data] |
| box | `div.rsp15-ft` | 6 | queries-responses-empty | [data] |
| box | `div.rsp15-ex` | 6 | queries-responses-empty | [data] |
| click | `ol.rsp15-gb-road button` | 6 | queries-responses | [data] |
| box | `section.mk-wel-note > p` | 6 | welcome-verified | [data] |
| box | `p.mk-claimask` | 4 | founders, root | [data] |
| box | `div.sa-slip.qc153-slip.is-preview` | 4 | journey-laq-check, journey-laq-note | [data] |
| box | `div.sa-slip-in` | 4 | journey-laq-check, journey-laq-note | [data] |
| box | `div.qc153-top` | 4 | journey-laq-check, journey-laq-note | [data] |
| box | `div.qc153-fact.is-soft` | 4 | journey-laq-check, journey-laq-note | [data] |
| box | `div.qc153-fact.qc1531-pol` | 4 | journey-laq-check, journey-laq-note | [data] |
| box | `div.laq-asks.is-pkg` | 4 | journey-laq-fork, journey-laq-package | [data] |
| box | `div.laq-nopt` | 4 | journey-laq-nudge | [data] |
| box | `div.qc1522-cp.tall` | 4 | journey-rr-composer, journey-rr-more | [data] |
| box | `div.qc1522-cf` | 4 | journey-rr-composer, journey-rr-more | [data] |
| box | `div.qcrr-head` | 4 | journey-rr-picker, overlay-Record-a-response-journey | Who replied? |
| box | `div.qc152-rb.qcrr-ft` | 4 | journey-rr-picker, overlay-Record-a-response-journey | [data] |
| box | `p.cp32-tbln` | 4 | manuscripts-comps, overlay-Add-a-comp | [data] |
| box | `div.ms29-dt-f` | 4 | manuscripts, manuscripts-empty | [data] |
| box | `div.qc152-rb` | 4 | overlay-Agent-card, overlay-Query-card-slide-out | [data] |
| box | `div.k62-split > section` | 4 | overlay-New-package, queries-packages | [data] |
| box | `div.k62-mat` | 4 | overlay-New-package, queries-packages | [data] |
| box | `div.k62-pp-h` | 4 | overlay-New-package, queries-packages | [data] |
| box | `p.k62-dfoot` | 4 | overlay-New-package, queries-packages | [data] |
| box | `p.k62-tbl-n` | 4 | overlay-New-package, queries-packages | [data] |
| box | `div.pl3-more > details` | 4 | plans | Compare every feature |
| box | `ul.mk-llist` | 4 | pricing | [data] |
| box | `nav.mk-pv-toc > ol` | 4 | privacy, terms | [data] |
| box | `div.a26-tl-m` | 4 | queries-analytics |  |
| box | `div.a26-tl-x` | 4 | queries-analytics |  |
| box | `div.k62-sb-c` | 4 | queries-packages-empty | [data] |
| box | `span.k62-sb-s` | 4 | queries-packages-empty | [data] |
| box | `span.k62-sb-t` | 4 | queries-packages-empty | [data] |
| box | `div.tws55-head` | 4 | todo, todo-empty | [data] |
| box | `div.tws-mnote > p` | 4 | todo, todo-empty | [data] |
| box | `div.tws-wf` | 4 | todo, todo-empty | [data] |
| box | `div.tws-wp` | 4 | todo, todo-empty | [data] |
| click | `div.tws-pvslot` | 4 | todo, todo-empty | [data] |
| box | `div.mk-agapright` | 2 | about | [data] |
| box | `section.mk-band.mk-band--copyfirst` | 2 | about | [data] |
| box | `section.mk-band` | 2 | about | [data] |
| click | `button.mk-acloselink` | 2 | about | See the plans |
| click | `div.sc-dsc > button` | 2 | account-emails | Change when that is |
| box | `div.dv1-disc` | 2 | agents-discover |  |
| box | `div.mk-cways` | 2 | contact | [data] |
| click | `button.hc-linkb` | 2 | help | Everything that's changed |
| click | `button.impg-link` | 2 | import | Download the headings |
| box | `div.laq-wkb` | 2 | journey-laq-nudge | [data] |
| click | `button.sa-wk-unkbtn` | 2 | journey-laq-nudge | UNKNOWN |
| control | `input.sa-wk-slider` | 2 | journey-laq-nudge |  |
| box | `div.laq-nopt.is-on` | 2 | journey-laq-nudge | [data] |
| click | `button.laq-lk` | 2 | journey-laq-package | Choose the pieces myself instead |
| box | `div.qc161-pick` | 2 | journey-rr-more | [data] |
| click | `div.qc161-pick > button` | 2 | journey-rr-more | Change |
| click | `button.on` | 2 | journey-rr-more | [data] (selected state, no role in the map) |
| click | `div.qc1522-seg > button` | 2 | journey-rr-more | Yesterday |
| click | `button.qc152-qdb` | 2 | journey-rr-more | Another date |
| box | `div.am-iplan` | 2 | overlay-Account-menu | [data] |
| click | `button.am-iplan-a` | 2 | overlay-Account-menu | Upgrade |
| click | `button.sa-mi.sa-mi--mute.am-row.am-out` | 2 | overlay-Account-menu | Sign out |
| click | `div.cf-axc > button` | 2 | overlay-Add-a-comp | [data] |
| box | `div.cf-type` | 2 | overlay-Add-a-comp | [data] |
| box | `div.cf-ready.is-idle` | 2 | overlay-Add-a-comp | [data] |
| mark | `div.cf-ready.is-idle > i` | 2 | overlay-Add-a-comp | · |
| box | `div.cf-tagbox` | 2 | overlay-Add-a-comp |  |
| box | `div.cv-layer.cf-foot` | 2 | overlay-Add-a-comp | [data] |
| click | `span.aap-info` | 2 | overlay-Add-an-agent-journey | [data] |
| box | `div.aaj-snav` | 2 | overlay-Add-an-agent-journey | [data] |
| box | `div.aaj-ft` | 2 | overlay-Add-an-agent-journey | [data] |
| click | `button.aaj-cx` | 2 | overlay-Add-an-agent-journey | Cancel |
| click | `button.clq-snq` | 2 | overlay-Agent-card | [data] |
| click | `span.aap-info.light` | 2 | overlay-Agent-card | [data] |
| click | `button.ag-addc` | 2 | overlay-Agent-card | + Add a website |
| box | `ul.nx-list` | 2 | overlay-Agent-card | [data] |
| box | `div.k62-hdr-body` | 2 | overlay-New-package | [data] |
| box | `div.qc152-ms` | 2 | overlay-Query-card-slide-out | [data] |
| box | `div.sv1-scopes` | 2 | overlay-Search-palette | [data] |
| box | `aside.sv1-peek` | 2 | overlay-Search-palette | [data] |
| box | `div.sv1-foot` | 2 | overlay-Search-palette | [data] |
| click | `button.pl-crumb` | 2 | plans | Plan |
| box | `div.pl3-more` | 2 | plans | [data] |
| box | `div.mk-lcardin` | 2 | pricing | [data] |
| mark | `a.mk-pv4suitlink` | 2 | pricing | Which plan suits me best? |
| box | `div.mk-pv-callout.mk-pv-callout--navy` | 2 | privacy | [data] |
| click | `button.a26-btn` | 2 | queries-analytics-empty | Log your first query |
| box | `div.a26-wh > div` | 2 | queries-analytics | [data] |
| box | `div.k62-sb-pk` | 2 | queries-packages-empty | [data] |
| box | `span.k62-sb-s.k62-opt` | 2 | queries-packages-empty | anything else they ask for |
| box | `span.k62-sb-t.k62-again` | 2 | queries-packages-empty | Change one thing, go again |
| box | `section.rsp15-ww` | 2 | queries-responses-empty | [data] |
| box | `span.rsp15-bub` | 2 | queries-responses-empty | [data] |
| mark | `button.rsp15-gb-fold > i` | 2 | queries-responses | ⌃ |
| box | `div.sband-body.rsp15-gb-body` | 2 | queries-responses | [data] |
| mark | `div.rsp15-sum > span` | 2 | queries-responses | [data] |
| box | `a.mk-dh-fjoin` | 2 | root | Become a founding writer |
| box | `div.mk-bef-whohead` | 2 | root |  |
| box | `div.mk-lc-ft` | 2 | root | [data] |
| click | `button.mk-footmail` | 2 | root | Privacy |
| box | `div.mk-draftribbon` | 2 | terms | [data] |
| box | `div.mk-wel-sig` | 2 | welcome-verified | Nick |
| click | `button.qc1531-b.qc1531-b--n` | 2 | your-notes | + Tell us something |
| click | `button.qc1531-b.qc1531-b--g` | 2 | your-notes | How it works |
| click | `button.d22-how` | 2 | your-notes | How it works |
| box | `div.sband-body.d22-body` | 2 | your-notes | [data] |
| mark | `h2.os-cardttl.d2-cardttl` | 2 | your-notes | Your notes |
| box | `p.yn-howfine` | 2 | your-notes | [data] |
| box | `div.mk-bef-grid` | 1 | root | [data] |
