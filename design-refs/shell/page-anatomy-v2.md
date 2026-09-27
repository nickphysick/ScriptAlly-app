# QueryHawk page anatomy v2: as built on `main` (770881f, 27 Sep 2026)

**This file replaces `page-anatomy.md` (v1, 26 Sep).** v1 is out of date on four points:
- the bar's colour;
- the breadcrumb, which is gone;
- the manuscript switcher, which has moved into the bar;
- where the rail starts: it now starts below the header rule, no longer level with the hero.

Where this file and the code disagree, **the code on `main` wins**. Report the difference.

```
┌────────────┬─────────────────────────────────────────────────────────────────────┐
│            │ BAR (sidebar colour) ☐ │ MATERIALS / Page name ···· [Ms switcher ▾] 🔍 ✎ Feedback ? │
│  SIDEBAR   ├─────────────────────────────────────────────────────────────────────┤
│  (Stone)   │   one column: max 1360 incl. gutter clamp(28px, 3.2vw, 52px)        │
│            │   ┌ PageHeader (full): eyebrow · title · intro · pill buttons · art ┐ │
│            │   │   hero contents in a centred 920 frame                           │ │
│            │   └──────────────────────────── rule ────────────────────────────────┘ │
│            │   MAIN (1fr, padding-top 24)            │ RAIL (340, margin-top 24)  │
└────────────┴─────────────────────────────────────────────────────────────────────┘
```

## 1. Shell (built by App shell v3 and Page header v2; never touched by page work)

**Sidebar**
- **Stone** `--shell-side` `#e7e3dc`, with a 1px `--shell-rule` hairline down its right edge.
- 248px wide, or 68 collapsed.
- Nav items in Source Serif 4 at 14.5px; section labels in JetBrains Mono at 8.5px.
- The active item is anthracite with cream text.
- **The manuscript switcher is not in the sidebar.**

**Bar** (`.ws-pagebar` in `WorkspaceShell.tsx`)
- 64px tall, **in the sidebar's colour**, with the hairline underneath. It isn't inside the scroll container.
- **Left to right:**
  1. the collapse toggle;
  2. a 1 × 26 divider;
  3. the **page name**: the section in mono 8px capitals above the name in Special Elite 22px, from `barPageName` via the nav model;
  4. a flexible space;
  5. **`BarSwitcher`**, the manuscript switcher;
  6. search (icon only);
  7. **Give feedback** (ghost style);
  8. help.
- There's no breadcrumb.
- The bar gains a soft shadow once the page scrolls (`scrollTop > 2`).

**Page frame**
- The window has dissolved: no fill, border, radius or frame padding.
- The ground is `--ws-page` `rgb(247,244,238)`.
- `WorkspacePageGrid` gives **one column**: `.wpg-scroll > *` is 100% wide, max 1360 **including** the gutter `clamp(28px,3.2vw,52px)`, centred.
- **Exactly one element pays the gutter.** A page's direct scroller child must never use the `padding` shorthand. Use `padding-block`, `padding-top` or `padding-bottom` only. (`.ct-pagebody` and `.msv12-root` break this today, and lose their gutter.)

## 2. The page header, `PageHeader`

It lives in `src/components/shell/PageHeader.tsx` and `pageHeader.css`. **Every workspace page opens with it, and there's no breadcrumb.**

- **`variant="full"`** is used on pages with a side panel (the Query Centre, the Contact list, and now Comparable titles and Submission packages).
  - The eyebrow ("SECTION / PAGE") comes from context.
  - Title: Special Elite 56px (50 at ≤1360), one line (`nowrap`).
  - Intro: max 460px, 18px; the manuscript's name is set in Special Elite (`.ph-ms`).
  - Buttons: `primary` and `secondary` pills, 48 tall.
  - Optional `art`: absolute bottom-right, 48% × 276, standing on the rule.
  - Hero contents sit in a **centred 920 frame**.
  - The header has an 18px top margin, 26px vertical padding, and a 1px `rgba(28,19,15,.16)` rule.
- **`variant="workspace"`** (compact) is for every other titled page: 44px title, no art.
- **Long titles and art.** The title never wraps, so the art must clear it. The drawn part of the art must start at least 24px right of the title's last letter at 1440 and 1920. If it doesn't, the art file is padded (transparent space at the top) so `object-fit: contain` draws it smaller. **The component is never changed per page.**

## 3. Page group and side panel

- **The full header is the first row of the page's own group**, spanning both columns. The page passes `masthead={null}` to `WorkspacePageGrid`.
- **Group:** `grid-template-columns: minmax(0,1fr) 340px; column-gap: 28px; row-gap: 0; align-items: start`.
  - Main column: row 2, with `padding-top: 24px`.
  - Side panel: row 2 with **`margin-top: 24px`**, starting at the rule + 24.
- **Side panel:** a 340px white card with 14px corners and a soft shadow.
  - It's sticky **inside the scroller at `top: 16px`** (the Contact list's pattern), with its height clamped to the window.
  - Its header is a blush `#e9c9b8` tray, with a large Special Elite title and art peeking from the bottom-right, clipped by the tray.
  - No shared rail component exists yet (`QcRail`, `ContactRail`), so each page styles its own, following `ContactRail`.

## 4. Test enrolment for a route with a full header

A route that uses a full header must appear in:
- `mastheadMatrix` as `"full"`;
- `FULL_PAGES` (`mastheadFormat.test.tsx`);
- the `OPTED_OUT` census (`masthead={null}`). Its length changes, and that change is recorded as a ruling;
- `illustratedMasthead` `WITH_ART` or `WITHOUT_ART`;
- `pageHeaderV2.measure.ts` §2 and §4, with its side-panel selector, including §4.4, "full-header tops equal";
- `BAR_ROUTES`, and `src/test/pageSmoke.tsx`.
