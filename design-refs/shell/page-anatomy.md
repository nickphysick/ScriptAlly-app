# QueryHawk page anatomy (v1, 26 Sep 2026)

Every QueryHawk page is made of four layers. The shell and the page frame are **the same on every page**. Only the hero, and what's in the main column, may differ from page to page.

This file is normative. The shell's frozen mock, `app-shell-v3.html`, is its visual oracle. Where this file and the rendered mock disagree, the mock wins; say so in your report.

```
┌────────────┬───────────────────────────────────────────────────────────┐
│            │ TOP BAR  collapse · breadcrumb ········ search · feedback · ? │
│  SIDEBAR   ├───────────────────────────────────────────────────────────┤
│  (Stone)   │ PAGE FRAME (page ground, 28px padding, no card)           │
│            │  ┌─ centred group, max 1480 ──────────────────────────┐   │
│            │  │ MAIN COLUMN (1fr)                    │ RAIL (340)  │   │
│            │  │  hero (varies per page)              │ sticky,     │   │
│            │  │  page sections…                      │ starts at   │   │
│            │  │                                      │ the top     │   │
│            │  └────────────────────────────────────────────────────┘   │
└────────────┴───────────────────────────────────────────────────────────┘
```

## 1. Shell (identical on every route)

**Divide.** Exactly **one** hairline separates the shell from the page: `rgba(28,19,15,.10)`, 1px. It runs down the sidebar's right edge and along the top bar's bottom edge. There are no other borders, shadows, cards or margins between the shell and the page.

**Sidebar**
- **Surface:** "Stone" `#e7e3dc`.
- **Width:** 248px, or 68px collapsed.
- **Padding:** 16px 14px 12px.
- **Gap between blocks:** 12px.
- **Logo:** Source Serif 4, 600 weight, 20px.
- **Manuscript switcher:** `rgba(255,255,255,.7)` fill, 1px `rgba(28,19,15,.12)` inset hairline, 12px corners. Title in Source Serif 4 600 at 14px; meta line 11.5px, muted.
- **Section labels:** JetBrains Mono 8.5px, `.18em` tracking, 600 weight, muted, capitals.
- **Nav items:**
  - Source Serif 4, 14.5px, padding 6px 10px, 9px corners;
  - icon 16px at 75% opacity, 10px gap to the label.
- **Hover:** `rgba(255,255,255,.45)`.
- **Active item (anthracite):**
  - background `#2a3a52`, text `#fdf9f5`, 600 weight;
  - icon at full opacity;
  - carries `aria-current="page"`.
  - There's exactly one active item.
- **User row:** 1px hairline above, a 30px initials disc, name in 600 weight at 14px, and "Pro plan" at 11.5px, muted.
- **Collapsed state:**
  - icons only, on the same Stone surface;
  - the active item is a 40 × 34 anthracite tile;
  - section labels become 28px hairlines;
  - count badges become a 5px dot at the icon's top-right;
  - the switcher shows only its icon;
  - every link keeps a tooltip or accessible name.

**Top bar ("Quiet")**
- **Height:** 64px, on the page ground `#f5f1eb`, with the hairline underneath.
- **Padding:** 0 24px. **Gap:** 10px.
- **Order, left to right:**
  1. collapse button (34px ring);
  2. breadcrumb;
  3. flexible space;
  4. search: icon only, a 36px white circle with a hairline, tooltip "Search ⌘K"; ⌘K still opens it;
  5. **Give feedback**: outline button, 36px tall, 10px corners, `rgba(28,19,15,.28)` ring, transparent fill, Special Elite 13.5px with a pencil icon;
  6. help: 36px white circle.
- **Breadcrumb:** Source Serif 4, 15px. Parent levels are muted, slashes are at 45% opacity, and the current page is ink at 600 weight with `aria-current="page"`.
- **No "All changes saved" indicator**, anywhere. Save *failures* must still surface to the writer.

## 2. Page frame (identical on every route)

- The content window scrolls, with **28px** padding (90px at the bottom).
- Page content sits **straight on the page ground**. There's no wrapping card, border, radius or shadow around a page.
- Content lives in a **centred group**:
  - columns `minmax(0,1fr) 340px`, 28px column gap, 22px row gap, max 1480px;
  - pages without a rail use a single column at the same max width.

## 3. Page title

Every page's title is **Special Elite**, at 46–52px on list pages. On Manuscripts, the manuscript's own title is the page title. No page title uses Playfair.

## 4. Rail (when a page has one)

- A 340px white card, 14px corners, soft shadow. It's **sticky beside the content** (never fixed to the window) and **starts at the top of the page frame**, level with the hero.
- **Header tray:**
  - blush `#e9c9b8`;
  - a large Special Elite title (34px);
  - a one-line summary in JetBrains Mono capitals;
  - an illustration peeking up from the tray's bottom-right, clipped by the tray and sitting behind the text.
- **Body:** scrolls, with sticky Special Elite 15px headings and count pills.

## 5. Hero (varies by page)

This is the one place pages differ: court tiles on the Query Centre, count cards on Contacts, the manuscript itself on Manuscripts. Every hero sits in the main column and follows the same type rules. Illustrations are still images that float on the page ground, never cropped by a container edge (a rail tray is the exception).
