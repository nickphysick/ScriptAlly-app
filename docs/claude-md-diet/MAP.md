# CLAUDE.md diet — the map

Every line of CLAUDE.md as it stood at `caae64b6c4b62eaf3b59af09faa4f0282823583e` (822,192 bytes, 2,203 lines, 106 `##` sections), and where it went.

## The rule used to classify

- **KEEP** — applies to every session regardless of page. Condensed into the new CLAUDE.md; the verbatim text is preserved in `docs/decisions/rules-long-form.md` so the condensing loses no evidence.
- **MOVE** — decisions about one page, feature or journey, or cross-cutting lore that only some sessions need (testing and measurement, CSS and the design system, codebase facts). Moved verbatim to `docs/decisions/<area>.md`, newest first.
- **ARCHIVE** — a section whose heading says the WHOLE of it is superseded, retired or kept as history, plus the July multi-stream protocol, the tinted-disc StatusDot history and the "Next session — start here" log. Moved verbatim, original order.
- Headings that say "SUPERSEDED IN PART", "AMENDED", "SUPERSEDED for the page's SHAPE" or "on the desktop" were MOVED, not archived: several of them still carry live laws (QC v11's one clock and `isWithYou`; the Agent list's data model; the phone's to-do page).
- Sections whose heading says "NOT merged" sit in their area file under a "Branch-only (not on main)" heading, with the 11 Nov branch check beneath it.

## Totals

| Class | Bytes | Share |
|---|---:|---:|
| MOVE | 663,852 | 80.7% |
| ARCHIVE | 98,649 | 12.0% |
| KEEP | 59,691 | 7.3% |
| **All** | **822,192** | |

KEEP before condensing: **59,691 bytes**, under the 60 KB gate. It first came to 71,841; the audit corrections (5,491), StatusDot's evidence sub-bullets (4,545) and the GitHub-incident narrative (2,114) were moved out to reach it.

## Bytes per destination

| Destination | Bytes |
|---|---:|
| docs/decisions/query-centre.md | 142,828 |
| docs/archive/claude-md-history-2026-11.md | 98,649 |
| docs/decisions/landing-public.md | 90,910 |
| docs/decisions/contact-list.md | 85,932 |
| docs/decisions/testing-measurement.md | 81,018 |
| docs/decisions/shell-nav-header.md | 62,224 |
| CLAUDE.md (condensed; verbatim in docs/decisions/rules-long-form.md) | 59,691 |
| docs/decisions/dashboard.md | 52,087 |
| docs/decisions/design-system-css.md | 39,660 |
| docs/decisions/onboarding-import.md | 22,876 |
| docs/decisions/manuscripts.md | 17,819 |
| docs/decisions/todo.md | 17,323 |
| docs/decisions/comps.md | 15,609 |
| docs/decisions/packages-materials.md | 6,875 |
| docs/decisions/analytics.md | 6,855 |
| docs/decisions/codebase-facts.md | 5,491 |
| docs/decisions/query-actions.md | 5,152 |
| docs/decisions/discover.md | 4,435 |
| docs/decisions/corkboard.md | 3,688 |
| docs/decisions/responses.md | 3,070 |

## Section by section

| # | Section | Lines | Bytes | Class | Destination |
|---|---|---|---:|---|---|
| — | (title line + blank) | 1–2 | 32 | KEEP | CLAUDE.md (condensed; verbatim in docs/decisions/rules-long-form.md) |
| 1 | Working discipline (READ FIRST — repo hygiene rules, locked 8 Jul; sup… | 3–46 | 21,550 | SPLIT | see the 9 rows below |
| ↳ | ## Working discipline (READ FIRST — repo hygiene rules, lock… | 3–5 | 622 | KEEP | CLAUDE.md (condensed; verbatim in docs/decisions/rules-long-form.md) |
| ↳ | - **⚠️ A RENDER HARNESS LOADS `dist/assets/index-*.css`, NEV… | 6–6 | 1,051 | MOVE | docs/decisions/testing-measurement.md |
| ↳ | - **⚠️ A RED CI EMAIL IS NOT NECESSARILY A RED BUILD — check… | 7–7 | 427 | KEEP | CLAUDE.md (condensed; verbatim in docs/decisions/rules-long-form.md) |
| ↳ | - **⚠️ AND BEFORE BLAMING THE REPO FOR ANY CI ODDITY, CHECK … | 8–8 | 2,114 | MOVE | docs/decisions/testing-measurement.md |
| ↳ | - **One active session per working tree.** Never run two ses… | 9–32 | 8,169 | KEEP | CLAUDE.md (condensed; verbatim in docs/decisions/rules-long-form.md) |
| ↳ | - **⚠️ A SOURCE SLICER MUST STRIP COMMENTS BEFORE IT COUNTS … | 33–34 | 1,305 | MOVE | docs/decisions/testing-measurement.md |
| ↳ | - **⚠️ ON THE QUERY CENTRE TIMELINE, A DASHED BORDER MEANS P… | 35–35 | 646 | MOVE | docs/decisions/query-centre.md |
| ↳ | - **⚠️ A LOCK READING CSS AS SOURCE PROVES A RULE WAS WRITTE… | 36–36 | 830 | MOVE | docs/decisions/testing-measurement.md |
| ↳ | - **⚠️ `git commit --only -- $(git diff --cached --name-only… | 37–46 | 6,386 | KEEP | CLAUDE.md (condensed; verbatim in docs/decisions/rules-long-form.md) |
| 2 | Disk hygiene — emulator runs filled the disk (6 Nov; one worktree's de… | 47–53 | 1,283 | KEEP | CLAUDE.md (condensed; verbatim in docs/decisions/rules-long-form.md) |
| 3 | Firestore costs £0 off production — the emulator is the default (2 Nov… | 54–63 | 4,461 | KEEP | CLAUDE.md (condensed; verbatim in docs/decisions/rules-long-form.md) |
| 4 | Responses v2 — every answer, the requests as a carousel and the nos as… | 64–73 | 3,070 | MOVE | docs/decisions/responses.md |
| 5 | Submission packages v4 — v3's page and drawer in the Query Centre v138… | 74–84 | 3,697 | MOVE | docs/decisions/packages-materials.md |
| 6 | Onboarding v9 — a warmer set-up, and a review that waits for its answe… | 85–104 | 3,835 | MOVE | docs/decisions/onboarding-import.md |
| 7 | Header panel v2 — the blue panel header on every workspace page, opaqu… | 105–131 | 9,323 | MOVE | docs/decisions/shell-nav-header.md |
| 8 | Query Centre v135 — the centred-pair header (three pages) and the badg… | 132–142 | 2,876 | MOVE | docs/decisions/query-centre.md |
| 9 | App shell v2 — oat, the header sheet and its flap, paper-white bands, … | 143–152 | 2,745 | MOVE | docs/decisions/shell-nav-header.md |
| 10 | Import truth — no invented values, no double imports (11 Oct; report r… | 153–169 | 5,127 | MOVE | docs/decisions/onboarding-import.md |
| 11 | Onboarding v5, part 3 — the Import page (11 Oct; ref = design-refs/onb… | 170–184 | 3,007 | MOVE | docs/decisions/onboarding-import.md |
| 12 | Import fixes — dates, counts and labels (11 Oct; report reports/import… | 185–197 | 2,536 | MOVE | docs/decisions/onboarding-import.md |
| 13 | Onboarding v5, part 2 — the import, from "Read my file" to the dashboa… | 198–210 | 2,574 | MOVE | docs/decisions/onboarding-import.md |
| 14 | Onboarding v5, part 1 — sign-up, sign-in and the set-up steps in the a… | 211–226 | 3,536 | MOVE | docs/decisions/onboarding-import.md |
| 15 | Landing colours v2 — the public site in the app's colours (10 Oct; ref… | 227–239 | 2,810 | MOVE | docs/decisions/landing-public.md |
| 16 | To-do list v5.2 — the calendar in the header, the pin, mid-task signal… | 240–251 | 3,878 | MOVE | docs/decisions/todo.md |
| 17 | Ink shell v1 — the frame, the folder tab, the bar, the sidebar (6 Oct;… | 252–263 | 4,172 | MOVE | docs/decisions/shell-nav-header.md |
| 18 | The plate header — the Query Centre only, a test (4 Oct; ref = design-… | 264–271 | 2,710 | MOVE | docs/decisions/query-centre.md |
| 19 | Page header v2 — the bar, the full header and the hero frame (27 Sep; … | 272–281 | 6,059 | MOVE | docs/decisions/shell-nav-header.md |
| 20 | App shell — the desk, the capsules and the alignment contract (app-she… | 282–304 | 11,397 | MOVE | docs/decisions/shell-nav-header.md |
| 21 | Navigation & shell architecture (post-AppShell rollout `88db5f7`+`4933… | 305–319 | 3,775 | MOVE | docs/decisions/shell-nav-header.md |
| 22 | Rail rebuild — grouped index + capture + utility (5 Jul; refs = design… | 320–327 | 4,481 | MOVE | docs/decisions/shell-nav-header.md |
| 23 | Pane heights — THE DESK RULE + the fill amendment (⚠️ SCOPED TO THE QU… | 328–335 | 4,001 | MOVE | docs/decisions/query-centre.md |
| 24 | Content max-width caps — the ultrawide law (8 Jul; ref = design-refs/m… | 336–344 | 4,843 | MOVE | docs/decisions/shell-nav-header.md |
| 25 | Hub grammar — one token sheet, grand masthead, two papers (⚠️ SCOPED T… | 345–357 | 8,068 | MOVE | docs/decisions/query-centre.md |
| 26 | Workspace chrome slab — ChromeSlab, Option A (6 Jul; ref = design-refs… | 358–363 | 2,776 | MOVE | docs/decisions/shell-nav-header.md |
| 27 | App-shell capsule bar — TWO STATES, ONE COMPONENT (bar-per-page pack, … | 364–373 | 4,390 | MOVE | docs/decisions/shell-nav-header.md |
| 28 | App-shell panel foot — the desk line, two actions, and the folded upse… | 374–381 | 3,549 | MOVE | docs/decisions/shell-nav-header.md |
| 29 | Workspace breadcrumb model (⚠️ SUPERSEDED by the capsule bar above — t… | 382–386 | 1,654 | ARCHIVE | docs/archive/claude-md-history-2026-11.md |
| 30 | Landing hero on desktop — v4 (25 Oct; ref = design-refs/landing-hero-v… | 387–397 | 3,423 | MOVE | docs/decisions/landing-public.md |
| 31 | Landing hero on phones (23 Oct; ref = design-refs/landing-hero-mobile-… | 398–416 | 6,462 | MOVE | docs/decisions/landing-public.md |
| 32 | Route tiers + public landing (landing build 5 Jul; refs = design-refs/… | 417–537 | 71,281 | MOVE | docs/decisions/landing-public.md |
| 33 | Deployment | 538–601 | 18,550 | SPLIT | see the 4 rows below |
| ↳ | ## Deployment… | 538–556 | 4,877 | KEEP | CLAUDE.md (condensed; verbatim in docs/decisions/rules-long-form.md) |
| ↳ | - **⚠️ A PIXEL SWEEP THAT EXCLUDES REGIONS MUST MEASURE THEM… | 557–560 | 1,999 | MOVE | docs/decisions/testing-measurement.md |
| ↳ | - **⚠️ `cd X && …` IS NOT A GUARD — A FAILED `git worktree a… | 561–581 | 4,740 | KEEP | CLAUDE.md (condensed; verbatim in docs/decisions/rules-long-form.md) |
| ↳ | - **⚠️ `/api/waitlist` IS ROUTED ON DEV AND DELIBERATELY NOT… | 582–601 | 6,934 | MOVE | docs/decisions/landing-public.md |
| 34 | Functions — the database is named, explicitly, on both tiers (26 Aug) | 602–614 | 5,531 | KEEP | CLAUDE.md (condensed; verbatim in docs/decisions/rules-long-form.md) |
| 35 | Audit corrections — eight beliefs, checked against HEAD rather than re… | 615–633 | 5,491 | MOVE | docs/decisions/codebase-facts.md |
| 36 | Conventions & invariants | 634–864 | 131,764 | SPLIT | see the 28 rows below |
| ↳ | ## Conventions & invariants… | 634–635 | 1,041 | KEEP | CLAUDE.md (condensed; verbatim in docs/decisions/rules-long-form.md) |
| ↳ | - **⚠️ PLACE ART FROM ITS VISIBLE EDGE, NOT THE IMAGE BOX.**… | 636–646 | 3,335 | MOVE | docs/decisions/design-system-css.md |
| ↳ | - **⚠️ A CASE WHOSE FIRST ASSERTION IS FAILING IS NOT GREEN … | 647–655 | 4,336 | MOVE | docs/decisions/testing-measurement.md |
| ↳ | - **⚠️ A CLASS THE STYLESHEET SELECTS ON AND THE COMPONENT N… | 656–658 | 1,085 | MOVE | docs/decisions/design-system-css.md |
| ↳ | - **⚠️ A SOURCE LOCK CAN ONLY ASSERT WHAT THE SOURCE SAYS — … | 659–663 | 1,831 | MOVE | docs/decisions/testing-measurement.md |
| ↳ | - **⚠️ A CONTROL WHOSE MEANING IS ITS GLYPH IS DRAWN, NEVER … | 664–690 | 12,258 | MOVE | docs/decisions/design-system-css.md |
| ↳ | - **⚠️ THE QUERY LIST IS MANUSCRIPT-SCOPED, SO A DEFAULT-SCO… | 691–696 | 2,863 | MOVE | docs/decisions/testing-measurement.md |
| ↳ | - **⚠️ A PAGE'S CLASS AND A COMPONENT'S CLASS ON THE *SAME E… | 697–704 | 4,664 | MOVE | docs/decisions/design-system-css.md |
| ↳ | - **⚠️ A CHECK THAT PASSES BECAUSE IT NEVER MEASURED THE THI… | 705–706 | 1,506 | MOVE | docs/decisions/testing-measurement.md |
| ↳ | - **⚠️ A MOCKUP ONLY EXERCISES THE GLYPHS SOMEONE TYPED INTO… | 707–708 | 845 | MOVE | docs/decisions/design-system-css.md |
| ↳ | - **⚠️ WHEN A REPORT NAMES SYMPTOMS, SCAN FOR THE FAULT CLAS… | 709–709 | 654 | MOVE | docs/decisions/testing-measurement.md |
| ↳ | - **⚠️ `line-height: 1` IS ONLY EVER SAFE ON UPPERCASE-ONLY … | 710–714 | 3,271 | MOVE | docs/decisions/design-system-css.md |
| ↳ | - **⚠️ WHEN A MEASUREMENT IS SLOWER THAN ANOTHER SESSION'S E… | 715–718 | 1,666 | MOVE | docs/decisions/testing-measurement.md |
| ↳ | - **⚠️ ON A PAGE WHERE NOTHING SCROLLS, `position: sticky` D… | 719–730 | 7,034 | MOVE | docs/decisions/design-system-css.md |
| ↳ | - **⚠️ AN ESCAPE CASCADE IS ONE HANDLER, NOT TWO LISTENERS.*… | 731–743 | 5,921 | KEEP | CLAUDE.md (condensed; verbatim in docs/decisions/rules-long-form.md) |
| ↳ | - **⚠️ A PRESERVED NUMBER IS NOT A PRESERVED PLACE — WHERE A… | 744–748 | 2,267 | MOVE | docs/decisions/testing-measurement.md |
| ↳ | - **⚠️ A HEADING MAY NOT CARRY COLOUR-SHIFTED EMPHASIS — emp… | 749–750 | 2,326 | MOVE | docs/decisions/todo.md |
| ↳ | - **⚠️ NO GENDERED PRONOUNS FOR AN AGENT, ANYWHERE THE USER … | 751–756 | 3,201 | KEEP | CLAUDE.md (condensed; verbatim in docs/decisions/rules-long-form.md) |
| ↳ |   - **⚠️ THE SHAPE CARRIES EVERYTHING AND COLOUR CARRIES NOT… | 757–766 | 4,545 | MOVE | docs/decisions/design-system-css.md |
| ↳ | - **⚠️ HISTORY — the tinted-disc lock the ring set replaced … | 767–767 | 848 | ARCHIVE | docs/archive/claude-md-history-2026-11.md |
| ↳ | - **Undo:** undo must delete the original activity records t… | 768–770 | 728 | KEEP | CLAUDE.md (condensed; verbatim in docs/decisions/rules-long-form.md) |
| ↳ | - **⚠️ HARNESSES ARE FOR BEFORE-AND-AFTER; "IS THE APP CORRE… | 771–812 | 25,276 | MOVE | docs/decisions/testing-measurement.md |
| ↳ | - **⚠️ A DEFERRAL WRITTEN IN A COMMENT IS A DEFERRAL NOBODY … | 813–813 | 860 | KEEP | CLAUDE.md (condensed; verbatim in docs/decisions/rules-long-form.md) |
| ↳ | - **⚠️ A MEASUREMENT THAT COMMITS MUST RESTORE IN THE SAME R… | 814–838 | 20,153 | MOVE | docs/decisions/testing-measurement.md |
| ↳ | - **⚠️ EVERY WORKSPACE PAGE STAYS MOUNTED, SO A HARD-CODED `… | 839–846 | 8,105 | KEEP | CLAUDE.md (condensed; verbatim in docs/decisions/rules-long-form.md) |
| ↳ | - **⚠️ A TEST MUST CALL THE FUNCTION WITH AN INPUT THE SYSTE… | 847–859 | 8,149 | MOVE | docs/decisions/testing-measurement.md |
| ↳ | - **⚠️ COPY ASSERTS ONLY WHAT THE CODE DOES TODAY — never th… | 860–863 | 2,119 | KEEP | CLAUDE.md (condensed; verbatim in docs/decisions/rules-long-form.md) |
| ↳ | - **⚠️ A LOOKAHEAD AFTER OPTIONAL WHITESPACE IS NOT A FILTER… | 864–864 | 877 | MOVE | docs/decisions/testing-measurement.md |
| 37 | Corkboard v1 — the Noteboard renamed and redrawn (12 Oct; ref = design… | 865–879 | 3,688 | MOVE | docs/decisions/corkboard.md |
| 38 | To-do list v5.1 — the journeys on the desk, one screen, and set aside … | 880–893 | 4,733 | MOVE | docs/decisions/todo.md |
| 39 | To-do list v5 — the tray and the desk (⚠️ AMENDED BY v5.1 above — the … | 894–903 | 2,884 | MOVE | docs/decisions/todo.md |
| 40 | To-do — the three views (⚠️ SUPERSEDED ON THE DESKTOP by To-do list v5… | 904–911 | 3,502 | MOVE | docs/decisions/todo.md |
| 41 | Header v3 — one panel header on every workspace page (10 Oct; ref = de… | 912–920 | 2,614 | MOVE | docs/decisions/shell-nav-header.md |
| 42 | Agent card v1 — ONE AGENT CARD, AND A JOURNEY PUT AWAY IS NEVER LOST (… | 921–933 | 5,691 | MOVE | docs/decisions/contact-list.md |
| 43 | Query actions v1 — EVERY PAGE FINISHES IN THE QUERY DRAWER (27 Sep; re… | 934–989 | 5,152 | MOVE | docs/decisions/query-actions.md |
| 44 | Finishing a task — THE PANE READS, THE MODAL FINISHES (⚠️ SUPERSEDED b… | 990–1055 | 6,150 | ARCHIVE | docs/archive/claude-md-history-2026-11.md |
| 45 | Submission packages v2 — one page, open to all (27 Sep; ref = design-r… | 1056–1067 | 3,178 | MOVE | docs/decisions/packages-materials.md |
| 46 | Comparable titles v27.1 — the library in the column, and one centred c… | 1068–1074 | 1,406 | MOVE | docs/decisions/comps.md |
| 47 | Comparable titles v27 — a new header, a real empty page, and "how it w… | 1075–1084 | 2,354 | MOVE | docs/decisions/comps.md |
| 48 | Comparable titles v26.1 — the picker's first frame, focus, and the exh… | 1085–1091 | 1,419 | MOVE | docs/decisions/comps.md |
| 49 | Comparable titles v26 — the add-and-edit comp drawer, and the first-co… | 1092–1103 | 2,748 | MOVE | docs/decisions/comps.md |
| 50 | Comparable titles v25 — comps logged against query letters (12 Oct; re… | 1104–1119 | 4,667 | MOVE | docs/decisions/comps.md |
| 51 | Comparable titles v2 — the page's own group, the Scout coming soon (27… | 1120–1128 | 3,015 | MOVE | docs/decisions/comps.md |
| 52 | The page header — PageHeader, full or compact, and there is no breadcr… | 1129–1152 | 2,100 | MOVE | docs/decisions/shell-nav-header.md |
| 53 | The page masthead — ONE FORMAT, ONE BEHAVIOUR (⚠️ SUPERSEDED IN FULL b… | 1153–1217 | 36,667 | ARCHIVE | docs/archive/claude-md-history-2026-11.md |
| 54 | Multi-stream protocol (⚠️ SUPERSEDED 8 Jul by "Working discipline" abo… | 1218–1224 | 1,785 | ARCHIVE | docs/archive/claude-md-history-2026-11.md |
| 55 | Editorial theme colour roles (midnight accent; ref = design-refs/edito… | 1225–1247 | 2,623 | MOVE | docs/decisions/design-system-css.md |
| 56 | The harness fixture — `seed.mjs` states the STATE and derives the date… | 1248–1258 | 4,141 | MOVE | docs/decisions/testing-measurement.md |
| 57 | Query Centre — v136: the open ruled-corner header, active and inactive… | 1259–1269 | 2,741 | MOVE | docs/decisions/query-centre.md |
| 58 | Query Centre — v134: the hero number and faces, icon desk cards, the b… | 1270–1280 | 2,606 | MOVE | docs/decisions/query-centre.md |
| 59 | Query panel v1 — a query opens in a side panel, and its actions step t… | 1281–1294 | 3,333 | MOVE | docs/decisions/query-centre.md |
| 60 | Query Centre — v138 (14 Oct; ref = design-refs/query-centre-v138/query… | 1295–1335 | 13,292 | MOVE | docs/decisions/query-centre.md |
| 61 | Query Centre — v133, the open header (8 Oct; ref = design-refs/query-c… | 1336–1346 | 2,265 | MOVE | docs/decisions/query-centre.md |
| 62 | Query Centre — v132 (8 Oct; ref = design-refs/query-centre/query-centr… | 1347–1363 | 3,542 | MOVE | docs/decisions/query-centre.md |
| 63 | Query Centre — v126 + v126.2 (5 Oct; refs = design-refs/query-centre-v… | 1364–1377 | 3,926 | MOVE | docs/decisions/query-centre.md |
| 64 | Query Centre — v96 (⚠️ SUPERSEDED IN PART by the v126 + v126.2 section… | 1378–1394 | 6,700 | MOVE | docs/decisions/query-centre.md |
| 65 | Query Centre — v95 (⚠️ AMENDED by the v96 section above, 2 Oct — the l… | 1395–1429 | 15,920 | MOVE | docs/decisions/query-centre.md |
| 66 | Query Centre — v65.3 (⚠️ AMENDED BELOW THE HERO by the v95 section abo… | 1430–1441 | 4,589 | MOVE | docs/decisions/query-centre.md |
| 67 | Query Centre — v65.2 (24 Sep; ref = design-refs/query-centre-v74.html … | 1442–1455 | 4,221 | MOVE | docs/decisions/query-centre.md |
| 68 | Query Centre — v65 + v65.1 (24–25 Sep; ref = design-refs/query-centre-… | 1456–1486 | 12,736 | MOVE | docs/decisions/query-centre.md |
| 69 | Query Centre — v21 (⚠️ SUPERSEDED for the page's SHAPE by the v65 sect… | 1487–1507 | 10,720 | MOVE | docs/decisions/query-centre.md |
| 70 | Query Centre — v11 (⚠️ SUPERSEDED for the page's SHAPE by the v21 sect… | 1508–1553 | 23,077 | MOVE | docs/decisions/query-centre.md |
| 71 | Dashboard v60 — first use, and the two hoops (17 Oct; ref = design-ref… | 1554–1566 | 4,663 | MOVE | docs/decisions/dashboard.md |
| 72 | Dashboard v58 — one screen (9 Oct; ref = design-refs/dashboard/dashboa… | 1567–1582 | 5,746 | MOVE | docs/decisions/dashboard.md |
| 73 | The top bar, app-wide, and the dashboard follow-up — "the v34 mockup" … | 1583–1602 | 8,925 | MOVE | docs/decisions/dashboard.md |
| 74 | Activity feed drawer v2 — typed rows, and every half-screen drawer flo… | 1603–1612 | 2,082 | MOVE | docs/decisions/dashboard.md |
| 75 | Dashboard — v33 top row and card chrome (18 Sep; ref = design-refs/das… | 1613–1632 | 8,509 | MOVE | docs/decisions/dashboard.md |
| 76 | Dashboard — v16 (18 Sep; ref = design-refs/dashboard-v16-2026-09-18.ht… | 1633–1659 | 11,611 | MOVE | docs/decisions/dashboard.md |
| 77 | Dashboard v37 + themes — LOCKED SPECS (overnight build 4 Jul; mockup =… | 1660–1670 | 6,384 | MOVE | docs/decisions/dashboard.md |
| 78 | Dashboard — "Over to you" & the nudge flow | 1671–1683 | 4,167 | MOVE | docs/decisions/dashboard.md |
| 79 | Contact list v17 — one light header, a tidier list, better filters, a … | 1684–1706 | 8,154 | MOVE | docs/decisions/contact-list.md |
| 80 | Contact list v18 — letter tabs at the top, a slate list header, the ro… | 1707–1714 | 2,193 | MOVE | docs/decisions/contact-list.md |
| 81 | Contact list v17.1 — centred header, one card with List health, a smar… | 1715–1722 | 2,112 | MOVE | docs/decisions/contact-list.md |
| 82 | Contact list v16 — the list is the page, full screen, and the agent pa… | 1723–1747 | 8,165 | MOVE | docs/decisions/contact-list.md |
| 83 | Contact list v15 — the open header, the desk, and one ready rule (8 Oc… | 1748–1772 | 10,226 | MOVE | docs/decisions/contact-list.md |
| 84 | Contact list v14 — the next step, the table list, and the touches (8 O… | 1773–1786 | 4,922 | MOVE | docs/decisions/contact-list.md |
| 85 | Contact list v13 — the Query Centre's look, the numbers strip, and Hou… | 1787–1808 | 6,963 | MOVE | docs/decisions/contact-list.md |
| 86 | Contact list v12 — the card index (3 Oct; ref = design-refs/contact-li… | 1809–1824 | 7,814 | MOVE | docs/decisions/contact-list.md |
| 87 | Contact list v11 — one page, profile-first rows, the pop-up and Housek… | 1825–1839 | 8,616 | MOVE | docs/decisions/contact-list.md |
| 88 | Agent list — LOCKED SPEC (⚠️ SUPERSEDED for the page's SHAPE by the Co… | 1840–1884 | 18,495 | MOVE | docs/decisions/contact-list.md |
| 89 | Agents page v2 — ⚠️ RETIRED (superseded by the Agent list rebuild, bel… | 1885–1919 | 20,625 | ARCHIVE | docs/archive/claude-md-history-2026-11.md |
| 90 | Manuscripts — v21, the Contact list look (9 Oct; ref = design-refs/man… | 1920–1928 | 1,695 | MOVE | docs/decisions/manuscripts.md |
| 91 | Manuscripts — v13, the dashboard shelf (⚠️ SUPERSEDED for the routed p… | 1929–1972 | 3,822 | ARCHIVE | docs/archive/claude-md-history-2026-11.md |
| 92 | Manuscripts page — THE BOOK PROFILE (26 Aug, amended 27 Aug; ref = des… | 1973–1984 | 6,155 | MOVE | docs/decisions/manuscripts.md |
| 93 | Manuscripts page — SAGE PLATE + TABBED PANE (⚠️ SUPERSEDED 26 Aug by T… | 1985–2001 | 8,354 | ARCHIVE | docs/archive/claude-md-history-2026-11.md |
| 94 | Manuscripts page v2 — LOCKED SPECS (frontispiece plates + Comparable-t… | 2002–2010 | 4,546 | MOVE | docs/decisions/manuscripts.md |
| 95 | Manuscripts page v1 — LOCKED SPECS (bookplate hero + comp shelf + Pro … | 2011–2022 | 5,423 | MOVE | docs/decisions/manuscripts.md |
| 96 | Smart Import — loader (Phase 8) + the agency-less fix | 2023–2029 | 1,650 | MOVE | docs/decisions/onboarding-import.md |
| 97 | Open decisions — park for a fresh head (do NOT resolve tired) | 2030–2033 | 611 | MOVE | docs/decisions/onboarding-import.md |
| 98 | Loose ends | 2034–2037 | 1,188 | KEEP | CLAUDE.md (condensed; verbatim in docs/decisions/rules-long-form.md) |
| 99 | Query database — BOLD THEME (current, route-scoped) — qdb-bold-theme m… | 2038–2067 | 14,859 | MOVE | docs/decisions/query-centre.md |
| 100 | Query database — visual restyle (superseded by the bold theme above) —… | 2068–2084 | 4,297 | ARCHIVE | docs/archive/claude-md-history-2026-11.md |
| 101 | App shell — left-sidebar chrome (Queries migration) — SUPERSEDED by "N… | 2085–2095 | 5,190 | ARCHIVE | docs/archive/claude-md-history-2026-11.md |
| 102 | Agent location / territory | 2096–2104 | 2,581 | MOVE | docs/decisions/contact-list.md |
| 103 | Analytics v24 — seven plain-English sections, benchmarking, and the st… | 2105–2117 | 3,796 | MOVE | docs/decisions/analytics.md |
| 104 | Analytics v17 — the whole page in the v126 dress, desktop and phone (5… | 2118–2129 | 3,059 | MOVE | docs/decisions/analytics.md |
| 105 | Discover v1 — the Scout's page (18 Oct; ref = design-refs/discover-v1/… | 2130–2142 | 4,435 | MOVE | docs/decisions/discover.md |
| 106 | Next session — start here | 2143–2203 | 9,257 | ARCHIVE | docs/archive/claude-md-history-2026-11.md |
