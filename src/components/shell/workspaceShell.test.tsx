/**
 * Locks for the app shell v2 (ref design-refs/app-shell-v2.html).
 *
 * ⚠️ ONE GROUND, ONE WINDOW. The dark icon rail and the greige breadcrumb bar are retired; the
 * sidebar and the page share a single ground and the ONLY white surface is the content window.
 * 30 of the old file's assertions named the rail, the bar or the collapse model and DIED with
 * them; 24 named rules that survive and are pointed at the new elements here. The sort is listed
 * in full in reports/app-shell-v2.md so each call can be challenged individually.
 *
 * Nothing here slices the markup: every assertion is a whole-string `toContain`/`toMatch`, per
 * the house rule about specs that slice on a marker they never asserted.
 */
import { isLivingRoute } from "../../lib/livingRoutes";
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { UserPlan } from "../../types";
import { ShellSection } from "../../lib/workspaceShell";
import { sliceBetween } from "../../test/sliceBetween";

const MANUSCRIPTS = [
  { id: "m1", title: "The Hollow Sea" },
  { id: "m2", title: "Winter Ledger" },
];

let msFixture: unknown[] = MANUSCRIPTS;

vi.mock("../../lib/db", () => ({
  useScriptAllyDb: () => ({
    manuscripts: msFixture,
    currentUser: { id: "u1", name: "Nick Physick", email: "n@example.com", plan: UserPlan.FREE },
  }),
}));

import { WorkspaceShell, msMeta } from "./WorkspaceShell";

const css = readFileSync(resolve(__dirname, "./workspaceShell.css"), "utf8");
const src = readFileSync(resolve(__dirname, "./WorkspaceShell.tsx"), "utf8");

/* ⚠️ ABSENCE IS ASSERTED AGAINST RULES, NOT PROSE. The first draft of the "no sibling rail"
   lock failed on the COMMENT that warns against building one — the guard caught its own warning.
   A `not.toContain` over a file that includes its own commentary passes and fails for reasons
   that have nothing to do with the stylesheet. */
const cssRules = css.replace(/\/\*[\s\S]*?\*\//g, "");
/* ⚠️ AND THE SAME TRAP EXISTS IN THE SOURCE. The "no Expand sidebar" guard first failed on the
   COMMENT recording that the item was superseded — the guard caught its own tombstone. Absence in
   the component is asserted against code with block comments stripped. */
const srcCode = src.replace(/\/\*[\s\S]*?\*\//g, "");

/* ⚠️ FLAT GROUPS (final ref) — a section is a LABEL with items, never a destination itself, and
   every item carries its own icon. The old fixture had childless sections that navigated; under
   this model such a section renders a heading with nothing under it. */
const SECTIONS: ShellSection[] = [
  {
    id: "workspace", label: "Workspace", def: "dash",
    children: [{ id: "dash", label: "Dashboard", path: "/dashboard", icon: "dash" }],
  },
  {
    id: "queries", label: "Queries", def: "q-centre",
    children: [
      { id: "q-centre", label: "Query Centre", path: "/queries", icon: "send" },
      { id: "q-analytics", label: "Analytics", path: "/queries/analytics", icon: "chart" },
    ],
  },
  {
    id: "todo", label: "To-do", def: "todo-list",
    children: [
      { id: "todo-list", label: "To-do list", path: "/todo", icon: "check", count: 4, urgent: true },
      { id: "todo-today", label: "Today", path: "/todo/today", icon: "sun" },
    ],
  },
];

const at = (path: string) => {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[path]}>
      <WorkspaceShell
        sections={SECTIONS}
        icons={{ dashboard: <svg />, queries: <svg />, todo: <svg /> }}
        onNavigatePath={() => {}}
        onOpenSearch={() => {}}
        onOpenHelp={() => {}}
      >
        <div>page</div>
      </WorkspaceShell>
    </MemoryRouter>
  );
};

/* ⚠️ ALL the blocks for a selector, joined. The v2 rules are appended below the originals, so a
   selector can legitimately be declared twice and taking the FIRST match tests half the rule —
   the same anchoring slip that has bitten three times this session. */
const rule = (sel: string) => {
  const out: string[] = [];
  for (let i = cssRules.indexOf(sel + " {"); i > -1; i = cssRules.indexOf(sel + " {", i + 1)) {
    out.push(cssRules.slice(i, cssRules.indexOf("}", i)));
  }
  expect(out.length, `workspaceShell.css must define ${sel}`).toBeGreaterThan(0);
  return out.join("\n");
};


/* ══════════════════ RETARGETED — rules that survive the rebuild ══════════════════ */

describe("one ground, one window", () => {
  /* ⚠️ RETARGETED from "the card is white on the radius token, hairline-bordered and softly
     raised". The rule is unchanged; the element is `.ws-window` rather than `.ws-card`. */
  /* ⚠️ AND THE WINDOW IS NO LONGER THE WHITE ONE — the CARDS are. Its ground stepped back to
     #fefcfa so a card can sit ON it; a literal here would silently break the five surfaces that
     resolve a gradient or a translucent fill into this one. */
  /* ⚠️ RETARGETED (app shell v3, 26 Sep, D7): the window was the white ground surface — token, 16px
     radius, hairline, soft raise. It has DISSOLVED on every route: no fill, border, radius, shadow or
     rim, and the radius/border tokens nothing else read are deleted with it. The rendered claim is
     shellV3.measure L7; this pins that the one rule states the dissolve and nothing re-frames it. */
  it("the window has dissolved: no fill, no border, no radius, no shadow, no rim", () => {
    const w = rule(".ws-window");
    expect(w).toContain("background: transparent");
    expect(w).toContain("border: 0");
    expect(w).toContain("border-radius: 0");
    expect(w).toContain("box-shadow: none");
    expect(cssRules).not.toContain(".ws-window::after");
    expect(cssRules).not.toContain("--ws-window-radius");
    expect(cssRules).not.toMatch(/\.(dash|ground|set)-mode \.ws-window/);
    expect(rule(".ws-work")).toContain("background: transparent");
  });

  /* ⚠️ RETARGETED (audit pack P6), and the retarget FINISHES this rule rather than relaxing it.
     "One ground" already said the sidebar and the page are one surface; the hairline down the
     panel's right edge was the last thing still claiming otherwise, drawing an edge where there is
     no edge. It is deleted, so what this now asserts is the whole of the rule: same token, sidebar
     paints nothing, and NOTHING divides them. The white content window does the separating. */
  /* ⚠️ RETARGETED FOR APP SHELL v3 (26 Sep, decisions D1/D2). The sidebar is no longer
     transparent on one shared ground: it is Stone, one shade DEEPER than the page, and the one
     hairline (`--shell-rule`) runs down its right edge as an INSET shadow — the only divide. What
     survives from the old claim is its second half: nothing else divides them (no ::after, no
     border). The rendered claim is tests/e2e/shellV3.measure.ts L1 + L2. */
  it("⚠️ THE TONE STEP — the sidebar paints Stone, and one inset hairline is the only divide", () => {
    /* ⚠️ v126 (5 Oct): behind the shell is the PAGE's ground now. `--ws-ground` is held at #f7f4ee by the
       marketing tier's lock and the app stopped reading it, so the app is one greige. */
    expect(rule(".ws-app")).toContain("background: var(--ws-page)");
    expect(rule(".ws-panel")).toContain("background: var(--shell-side)");
    expect(rule(".ws-panel")).toContain("box-shadow: inset -1px 0 0 var(--shell-rule)");
    expect(cssRules).not.toContain(".ws-panel::after");
    /* ⚠️ `[1-9]`, NOT A NEGATIVE LOOKAHEAD. The first draft was `/border-right:\s*(?!0)/`, and
       `\s*` backtracks to ZERO characters — so the lookahead ran against the space rather than the
       value and `border-right: 0` "matched". The rule was correct and the test was not. */
    expect(cssRules).not.toMatch(/\.ws-panel[^{]*\{[^}]*border-right:\s*[1-9]/);
  });

  /* ⚠️ AND THE CONTAINING BLOCK SURVIVES THE HAIRLINE. `.ws-msmenu` is absolutely positioned and
     anchors to the panel; removing a decoration is not a reason to remove `position: relative`,
     and the flyout would silently reparent to the viewport if it were. */
  /* ⚠️ RETARGETED (page header v2, 27 Sep): the manuscript flyout moved to the bar with the switcher,
     and it anchors to the SWITCHER now, 8px below and right-aligned. The panel keeps
     `position: relative` for the settings layer that lies over it. */
  it("⚠️ the panel is still a containing block, and the switcher's menu anchors to the switcher", () => {
    expect(rule(".ws-panel")).toContain("position: relative");
    expect(rule(".ws-ms")).toContain("position: relative");
    expect(rule(".ws-ms-menu")).toContain("position: absolute");
    expect(rule(".ws-ms-menu")).toContain("top: calc(100% + 8px)");
    expect(rule(".ws-ms-menu")).toContain("right: 0");
  });

  /* ⚠️ RETARGETED from contentColumn's "the slot paints NOTHING — the stage owns the ground". */
  it("the ground token exists and is the ref's value", () => {
    const idx = readFileSync(resolve(__dirname, "../../index.css"), "utf8");
    expect(idx).toContain("--ws-ground: #f7f4ee");
    expect(idx).toContain("--ws-edge: #e9e2d7");
    /* ⚠️ TWO GROUNDS, AND THEY ARE NOT THE SAME SURFACE — `--ws-ground` is what sits OUTSIDE the
       window, behind the capsules; `--ws-window` is the window's own fill. Both are asserted here
       so a future pass cannot quietly collapse them into one. */
    expect(idx).toContain("--ws-window-rgb: 254, 252, 250");
    /* ⚠️ THE COLOUR IS DERIVED FROM THE CHANNELS, NEVER RESTATED BESIDE THEM. A `--ws-window:
       #fefcfa` alongside the rgb triple is two numbers for one colour, and the alpha variants
       (`rgba(var(--ws-window-rgb), 0)` in the hems, `.86` in the dock) would drift off the opaque
       one the first time either was tuned — silently, since a fade to a near-match reads as a pale
       stripe rather than as a wrong colour. */
    expect(idx, "the window colour is stated twice — the channels must be the only source")
      .toContain("--ws-window: rgb(var(--ws-window-rgb))");
  });
});

/**
 * ⚠️ THE SIDEBAR'S TYPE SCALE (audit pack P6). These are not a house style anyone can infer — they
 * are a stated table, and the WIDTH moved with them (214 → 264). Kept together in one test for
 * exactly that reason: a later pass that steps one size without the others, or trims the width
 * back towards its old "narrowest that fits", should fail here and read why.
 */
describe("the sidebar's type scale, and the width that moved with it", () => {
  /* app shell v3 (26 Sep) retargets four rows of this table to the ref's `.side`: section labels
     9 → 8.5px, plan line 12 → 11.5px, wordmark 21 → 20px (beside a 30px mark), nav icons 17 → 16px.
     Nav items, manuscript title/sub-line, user name and the upgrade control keep their sizes. */
  it("every size in the pack's table", () => {
    expect(rule(".ws-ni")).toContain("font-size: 14.5px");        // nav items
    expect(rule(".ws-glabel")).toContain("font-size: 8.5px");     // section labels
    /* page header v2: the manuscript title and sub-line left the sidebar with the card; they are the
       bar switcher's now (`.ws-ms-t` 15px Special Elite, `.ws-ms-m` 8.5px mono) */
    /* retargeted by switcher v2: the ref's tile title is 14px and its standing line 8px */
    expect(rule(".ws-ms-t")).toContain("font-size: 14px");        // switcher title
    expect(rule(".ws-ms-m")).toContain("font-size: 8px");         // switcher standing line
    expect(rule(".ws-n")).toContain("font-size: 14px");           // user name
    expect(rule(".ws-pl")).toContain("font-size: 11.5px");        // plan line
    // ⚠️ `.ws-upgrow` since Option D — the pill left the account ROW to become a full-width
    // sibling beneath it, which is what bought the name its width. The SIZE is unchanged at 12px,
    // which is what this table guards; only the selector moved.
    expect(rule(".ws-upgrow")).toContain("font-size: 12px");       // upgrade pill
    expect(rule(".ws-bwm")).toContain("font-size: 20px");          // wordmark, beside a 30px mark
    expect(rule(".ws-ic svg")).toContain("width: 16px");          // nav icons
  });

  it("the To-do badge steps up with them — in the shared primitive both shells draw", () => {
    const prims = readFileSync(resolve(__dirname, "./primitives.css"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "");
    const at = prims.indexOf(".sp-ct {");
    expect(at).toBeGreaterThan(-1);
    expect(prims.slice(at, prims.indexOf("}", at))).toContain("font-size: 11px");
  });

  /* ⚠️ RETARGETED 264 → 224 (Nick, 11 Aug: −15%). P6's pairing of width WITH type still holds as
     reasoning — a width sized for 13.5px rows is not the width for 14.5px — but it is a floor,
     not a lock: this narrowing keeps the type and re-measured the fit instead (index.css records
     the numbers). The type scale above is untouched, which is what this file guards. */
  /* ⚠️ RETARGETED AGAIN 224 → 248 (app shell v3, 26 Sep; ruling 5). The sidebar's width is the
     ref's `--shell-side-w`, and `--shell-panelw` is kept only as an alias of it. The fit is measured
     on the rendered page (shellV3.measure L8, 1280 no horizontal clip). */
  it("⚠️ and the panel is 248px (`--shell-side-w`), with the old name an alias of it", () => {
    const idx = readFileSync(resolve(__dirname, "../../index.css"), "utf8");
    expect(idx).toContain("--shell-side-w: 248px");
    expect(idx).toContain("--shell-panelw: var(--shell-side-w)");
  });
});

/**
 * ⚠️ THE NAV LIST IS THE ONLY THING THAT SCROLLS, and without that the sidebar overflows below
 * roughly 740px of viewport height: brand, selector and user block are all fixed, so whatever they
 * cannot fit simply falls off the bottom with no way to reach it.
 */
describe("the sidebar's one scrolling region", () => {
  it("the nav grows, scrolls, and does not chain its scroll out to the page", () => {
    const nav = rule(".ws-nav");
    expect(nav).toContain("flex: 1");
    // `min-height: 0` is load-bearing: a flex item's default `auto` refuses to shrink below its
    // content, so without it the LIST pushes the foot off instead of scrolling.
    expect(nav).toContain("min-height: 0");
    expect(nav).toContain("overflow-y: auto");
    expect(nav).toContain("overscroll-behavior: contain");
  });

  it("its scrollbar is hidden in both idioms — neither covers every browser alone", () => {
    expect(rule(".ws-nav")).toContain("scrollbar-width: none");
    expect(cssRules).toContain(".ws-nav::-webkit-scrollbar");
  });

  /* ⚠️ A flex item shrinks by default, so at a short viewport the brand and the selector would
     compress instead of the list scrolling — the sidebar would look subtly wrong everywhere
     rather than obviously wrong in one place. */
  /* page header v2: the selector left the sidebar, so the brand and the foot are what is pinned */
  it("⚠️ brand and foot are pinned, so the list is what gives", () => {
    expect(rule(".ws-brand,\n.ws-pfoot")).toContain("flex: none");
  });
});

describe("the scroll chain", () => {
  /* ⚠️ RETARGETED from "the card holds ONE scroll container and the bar is sticky inside it" and
     from shellV2Tokens' "the STAGE's identity travelled to the card's scroller". The sticky-bar
     half died with the bar; ONE scroller, carrying the id, is the half that matters. */
  it("⚠️ the scroller is .ws-wbody and it carries STAGE_SCROLL_ID", () => {
    expect(srcCode).toContain('className="ws-wbody sv2-stagepad"');
    expect(srcCode).toMatch(/className="ws-wbody sv2-stagepad"[\s\S]{0,120}id=\{scrollId\}/);
    const b = rule(".ws-wbody");
    expect(b).toContain("overflow: auto");
    expect(b).toContain("min-height: 0");
  });

  /* ⚠️ THE WINDOW'S FRAME MUST NOT MOVE — that is what makes it a sheet of paper rather than a
     border. Put the scroll on the window and the radius and inset slide off on the first wheel. */
  it("⚠️ the window itself does NOT scroll — its body does", () => {
    expect(rule(".ws-window")).toContain("overflow: hidden");
    expect(rule(".ws-main")).toContain("overflow: hidden");
  });

  /* ⚠️ RETARGETED from "the work area no longer scrolls". */
  it("the work wrapper still does not scroll, and --fit keeps its definite basis", () => {
    expect(rule(".ws-work")).not.toContain("overflow: auto");
    expect(rule(".ws-work--fit")).toContain("flex: 1 1 0");
  });

  /* ⚠️ RETARGETED from mobileShell's clearance lock — `sv2-stagepad` belongs to whichever element
     is the scroller, and it followed the id. Dropping it puts the floating tab bar over the last
     100px of every mobile page. */
  it("the mobile clearance class rides WITH the scroller", () => {
    expect(srcCode).toContain('"ws-wbody sv2-stagepad"');
  });
});

describe("the breadcrumb is chrome", () => {
  /* ⚠️ NEW, and the inverse of the retired "the bar renders INSIDE the card": the breadcrumb now
     sits on the ground ABOVE the window, so it does not scroll with the content. */
  it("⚠️ it renders OUTSIDE the window, above it", () => {
    /* the class list is a template now (it gains `is-solid` on a scrolled dashboard) — the anchor is
       the class's opening, against a quote OR a backtick, and the claim is unchanged */
    const bar = srcCode.search(/className=(?:"|\{`)ws-pagebar[" `$]/);
    expect(bar).toBeGreaterThan(-1);
    expect(bar).toBeLessThan(srcCode.indexOf('className="ws-window"'));
    expect(rule(".ws-pagebar")).toContain("flex: none");
  });

  /**
   * ⚠️ RETIRED AND INVERTED (page header v1): THE BREADCRUMB IS GONE FROM THE SHELL.
   *
   * What it asserted — the current page ink at 600, ancestors muted, `/` throughout, no interpunct
   * inside the trail — described a trail that no longer exists. It is not deleted into silence: the
   * claim becomes its opposite, because "there is no crumb" is exactly as losable as the styling was.
   *
   * ⚠️ AND IT ASSERTS BOTH THE ELEMENTS AND THE WORDS. A check for the classes alone would pass on
   * a bar rebuilt with the same trail under new names; a check for the words alone would fail the
   * day a page's title legitimately contains a slash. The page's name is the one thing the trail
   * really carried, and the header says it now, 18px below.
   */
  /* ⚠️ RETARGETED (page header v2, 27 Sep): still no breadcrumb — no crumb element, no separator — but
     the bar now NAMES THE PAGE by design (§1: the sidebar section as an eyebrow, the sidebar label as the
     name). So "not the page's name" is inverted: the name is there, once, and nothing else of a trail. */
  it("⚠️ there is no breadcrumb — not its elements, not its separators; the page name is the one thing said", () => {
    for (const route of ["/queries/analytics", "/todo", "/agents"]) {
      const html = at(route);
      for (const cls of ["ws-crumb", "ws-seg", "ws-sep", "ws-cur", "ws-croot"]) {
        expect(html, `${route} still renders .${cls}`).not.toContain(`class="${cls}"`);
      }
      expect(html, `${route} still renders a Breadcrumb landmark`).not.toContain('aria-label="Breadcrumb"');
      /**
       * ⚠️ THE BAR'S WORDS, AND THE CLAIM IS NOT "it says nothing" — it still names its own tools
       * (Search, Give feedback, Help), which is what they are for. What it must not do is say where
       * you are: no separator, and not the page's name.
       */
      const bar = sliceBetween(html, 'data-probe="navrow"', 'class="ws-winwrap"', "the bar");
      const words = bar.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
      /* ⚠️ RETARGETED (ink shell v1, Phase 2): the FOLDER TAB names the page on every route — the
         group as a small label, then the page — and there is no separator anywhere in the bar, living
         route or not. The living-headers crumb (`QUERIES / Query Centre`) is retired with the quiet bar:
         the tab says the same two things without a trail between them. */
      expect(words, `${route}'s bar carries a separator`).not.toContain("/");
      expect(bar, `${route} still renders the retired page-name slot`).not.toContain("ws-pname");
      expect(words, `${route}'s bar names no product root`).not.toContain("QueryHawk");
      /* the name comes from the NAV the shell is given; this file's fixture has no Agents section, so
         `/agents` is a page the bar cannot name, and it must then say nothing rather than guess */
      const pname = ({ "/queries/analytics": "Analytics", "/todo": "To-do list", "/agents": null } as Record<string, string | null>)[route];
      if (pname) expect(html, `${route}'s tab names the page`).toMatch(new RegExp(`class="ws-ftn"[^>]*>${pname}<`));
      else expect(html, `${route} is in no section of this nav, so the bar names nothing`).not.toContain("ws-ftn");
    }
    /* …and the styling went with it, so nothing can quietly render the trail again and look right */
    for (const sel of [".ws-crumb", ".ws-seg", ".ws-sep", ".ws-cur"]) {
      expect(cssRules, `${sel} still has a rule`).not.toContain(`${sel} {`);
    }
  });

  /* ⚠️ RETIRED (app shell v3, 26 Sep, D5): the save whisper and the hairline beside it are gone from
     the shell — element and rule. The rendered claim (no route's DOM says "all changes saved") is
     shellV3.measure L5. */
  it("the save whisper and its hairline are gone — element and rule", () => {
    expect(cssRules).not.toMatch(/(?:^|\n)\s*\.ws-vdiv\s*\{/);
    expect(cssRules).not.toMatch(/(?:^|\n)\s*\.ws-sync\s*\{/);
    expect(srcCode).not.toContain('className="ws-sync"');
    expect(srcCode).not.toContain('className="ws-vdiv"');
    expect(srcCode).not.toContain("saveWhisper");
  });

  /**
   * ⚠️ RETARGETED (Query Centre v11, 19 Sep) — `+ New` IS GONE FROM THE BAR, app-wide, and this case
   * used to assert its fill. The law that survives: the bar carries no create control and none of
   * its furniture, and the one pill left (Give feedback) is ANTHRACITE with white text while the
   * keycap beside it stays ink. `newMenu.test.ts` retired with the menu it locked.
   */
  const decls = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  it("the bar has no `+ New` — not the button, its popover, its anchor or its keyframe", () => {
    const src = decls(readFileSync(resolve(__dirname, "WorkspaceShell.tsx"), "utf8"));
    for (const gone of ["ws-nbtn", "ws-newmenu", "ws-newwrap", "setNewOpen", "invokeCapture", "TODO_OPEN_COMPOSER"]) {
      expect(src, `${gone} is still in the shell`).not.toContain(gone);
    }
    /* the sheet: no rule of its own. (`.ws-nbtn` survives INSIDE the dashboard cover's `:is()` lists,
       where it matches nothing — left because those lists are the dashboard's and locked there.) */
    expect(cssRules, "`.ws-nbtn` has a rule again").not.toMatch(/(?:^|\n)\s*\.ws-nbtn[^,{]*\{/);
    for (const gone of [".ws-newmenu", ".ws-newwrap", "ws-menuin"]) expect(cssRules, gone).not.toContain(gone);
  });
  it("Give feedback's pill is anthracite with white text; the keycap stays ink", () => {
    const prim = decls(readFileSync(resolve(__dirname, "primitives.css"), "utf8"));
    const pill = /(?:^|\n)\.sp-inkpill\s*\{([^}]*)\}/.exec(prim);
    expect(pill, ".sp-inkpill has no rule").toBeTruthy();
    expect(pill![1]).toContain("background: var(--sp-anthracite)");
    expect(pill![1]).toContain("color: #ffffff");
    expect(prim).toContain("--sp-anthracite: #2a3a52");
    const key = /(?:^|\n)\.sp-search-k\s*\{([^}]*)\}/.exec(prim);
    expect(key, ".sp-search-k has no rule").toBeTruthy();
    expect(key![1], "the keycap followed the pill to anthracite").toContain("var(--sp-ink)");
    expect(prim).toContain("--sp-ink: #1c130f");
  });
});

describe("the sidebar", () => {
  /* ⚠️ RETARGETED, INVERTED, from "the wordmark is GONE from the sidebar; the S tile is the only
     mark there". The rail carried the mark; with it gone the sidebar is the leftmost chrome, so
     the brand lives there — mark AND wordmark — and the crumb carries none. The ONE-BRAND rule
     is what survived; only its address changed. */
  /* page header v2: the selector it sat above is in the bar now; the brand is the sidebar's first item */
  it("⚠️ the brand appears ONCE, in the sidebar, above the nav", () => {
    const html = at("/dashboard");
    expect(html).toContain('class="ws-bmark"');
    expect(html).toContain("QueryHawk");
    expect(srcCode.indexOf('className="ws-brand"')).toBeLessThan(srcCode.indexOf('className="ws-nav"'));
    expect(srcCode, "the sidebar card is gone").not.toContain('className="ws-phead"');
    // and NOT in the breadcrumb
    expect(html).not.toContain("ws-logotype");
  });

  /* ⚠️ RETARGETED from "the S tile navigates to the dashboard" — the mark still routes home. */
  it("the brand mark routes home", () => {
    expect(srcCode).toMatch(/className="ws-brand"[\s\S]{0,120}go\("\/dashboard"\)/);
  });

  /* ⚠️ RETARGETED, INVERTED, from "has no avatar in the panel; the rail has it". */
  it("⚠️ the avatar is in the panel foot now — the rail no longer carries the face", () => {
    expect(at("/dashboard")).toContain('class="ws-av"');
    expect(rule(".ws-av")).toContain("border-radius: 50%");
  });

  /* ⚠️ RETARGETED, AND THIS ONE REVERSES ITS PREDECESSOR (sidebar metrics pass, Nick's call). Audit
     pack P5 asserted "the foot is the hairline and the user row — no Settings"; Settings is back in
     the foot as the GEAR, and the ACCOUNT section it had moved into is gone from the nav. What the
     foot promises now: a hairline, then who you are and your settings — the user row and the gear as
     SIBLINGS in one horizontal row, never the gear inside the user row (whose click opens the account
     menu and would need a stopPropagation to guard it). `sliceBetween` names a missing anchor rather
     than widening the slice. SB5's rendered half (the gear routes, absent collapsed) is
     tests/e2e/sidebarCapture.measure.ts. */
  it("⚠️ SB5 the foot is a hairline over the user row AND the gear, as siblings — and the nav has no Settings", () => {
    const foot = sliceBetween(srcCode, 'className="ws-pfoot"', "<SettingsRail", "the sidebar foot");
    const row = foot.indexOf('className="ws-pfrow"');
    const user = foot.indexOf('className="ws-uacct"');
    const gear = foot.indexOf('className="ws-gear"');
    expect(row, "the horizontal foot row").toBeGreaterThan(-1);
    expect(user).toBeGreaterThan(row);
    expect(gear, "the gear").toBeGreaterThan(user);
    /* the user row CLOSES before the gear opens — a sibling, not a child */
    expect(foot.slice(user, gear), "the user row is closed before the gear").toMatch(/<\/div>\s*\{!sidebar\.collapsed && \(\s*<button\s+type="button"\s*$/);
    expect(foot.slice(gear)).toContain('aria-label="Settings"');
    expect(foot.slice(gear)).toContain('onClick={() => go("/account")}');
    expect(foot).not.toContain("stopPropagation");
    expect(rule(".ws-pfrow")).toContain("border-top: 1px solid var(--shell-hairline)");
    expect(rule(".ws-gear")).toContain("width: 30px; height: 30px");
    expect(rule(".ws-gear")).toContain("border-radius: 50%");
    const html = at("/dashboard");
    const nav = sliceBetween(html, '<nav class="ws-nav"', "</nav>", "the rendered nav");
    expect(nav, "the nav renders a Settings row").not.toContain(">Settings<");
    expect(nav).not.toMatch(/ws-glabel[^>]*>Account</);
    expect(html).toContain('class="ws-gear" aria-label="Settings"');
  });

  /* ⚠️ AND ITS RULE WENT WITH IT — a leftover `.ws-setrow` is how a foot quietly regrows a row. */
  it("⚠️ `.ws-setrow` is deleted, not left orphaned in the sheet", () => {
    expect(cssRules).not.toContain(".ws-setrow");
  });

  /* ⚠️ RETARGETED — the pack's rule 7, and the one most likely to be undone by a future repaint. */
  /* ⚠️ RETARGETED AGAIN (app shell v3, 26 Sep, D3): the white tile is superseded — active is
     ANTHRACITE with cream text, read from the shell tokens. The half that stays is the half that
     mattered: never a burgundy fill. The v2 grouped rule (`.ws-ni.on, .ws-nav .on`) is gone, so the
     one active rule is `.ws-ni.on`. */
  it("⚠️ the active nav item is ANTHRACITE with cream text — never a burgundy fill", () => {
    const on = rule(".ws-ni.on");
    expect(on).toContain("background: var(--shell-active-bg)");
    expect(on).toContain("color: var(--shell-active-fg)");
    expect(cssRules).not.toContain(".ws-nav .on");
    expect(cssRules).not.toMatch(/\.ws-ni\.on[^}]*background:\s*(#7c3a2a|var\(--burgundy)/);
  });

  /* ⚠️ RETARGETED — the badge survives on the panel row; only its rail ring died. */
  /* ⚠️ RETARGETED (ink shell v1, Phase 3): the count is a TERRACOTTA PILL on ink (`.ws-ct`), and its
     row goes bold (`.att`) — the burgundy-dot CountChip belonged to the light sidebar. Still exactly one. */
  it("only To-do carries a badge, and it is the terracotta pill on a bold row", () => {
    const html = at("/dashboard");
    expect(html).not.toContain("sp-ct");
    expect((html.match(/class="ws-ct"/g) ?? []).length).toBe(1);
    expect(html).toMatch(/class="ws-ni att"[^>]*>(?:(?!<\/button>).)*class="ws-ct"/s);
  });

  /* ⚠️ RETARGETED from "the panel's head zone carries the card's inset in both height and
     padding". THE HEIGHT NO LONGER COMES FROM `--head`: that calc existed solely to close the
     masthead on the same continuous line as the greige bar, and there is no bar. The selector is
     sized by its own contents beneath the brand block. */
  /* ⚠️ RETIRED (page header v2, 27 Sep): `.ws-phead` held the sidebar's manuscript card, which moved
     to the bar. Asserted gone, rule and element, so the card cannot quietly come back to the sidebar. */
  it("⚠️ the sidebar's manuscript card is gone — rule and element", () => {
    expect(cssRules).not.toMatch(/\.ws-phead|\.ws-mspill|\.ws-msnav|\.ws-msarrow/);
    expect(srcCode).not.toMatch(/ws-phead|ws-mspill|ws-msarrow/);
  });

  /* ⚠️ RETARGETED from "panel rows and rail icons both take a visible ring". */
  it("panel rows keep a visible focus ring", () => {
    expect(cssRules).toMatch(/\.ws-ni:focus-visible/);
  });
});

describe("the shell still renders, and the rejected treatments stay rejected", () => {
  /* ⚠️ RETARGETED — the smoke, and the font rule. */
  it("renders on the dashboard route, chrome in Inter, body font untouched", () => {
    const html = at("/dashboard");
    expect(html).toContain("ws-panel");
    expect(html).toContain("ws-window");
    expect(html).toContain("page");
  });

  /* ⚠️ RETARGETED from "no ink header inversion" — still meaningful with the bar gone: nothing in
     this shell may become a dark header band. */
  it("no ink header inversion anywhere in the shell", () => {
    expect(cssRules).not.toMatch(/\.ws-pagebar[^}]*background:\s*#(1|2|3)/);
  });
});

/* ══════════════════ DIED — retired with the rail, the bar and the collapse model ══════════════
   30 assertions. Rather than list them as prose here, they are enumerated in
   reports/app-shell-v2.md beside the 24 above, so the sort is reviewable in one place. This block
   asserts only that what they guarded is genuinely GONE — an absence lock, so the old shell
   cannot creep back in a later pass. */
describe("⚠️ the old shell is gone, not hidden", () => {
  /* ⚠️ RETARGETED (sidebar-collapse pack): `collapsed` LEFT THE DEAD-WORD LIST, and only that.
     This lock was written when collapse meant the RAIL-AND-PANEL model — a second component the
     sidebar swapped into, with flyouts and hover-peek. That model stays dead, and its four
     mechanism words below still guard it. The collapse that returned is a different shape: ONE
     sidebar whose width narrows in place (useSidebarCollapsed), no second component to drift. */
  it("no rail, no greige bar, no card — and the OLD collapse mechanisms stay dead", () => {
    const html = at("/dashboard");
    for (const dead of ["ws-rail", "ws-bar", "ws-card", "ws-cscroll", "ws-crow2", "ws-xtog"]) {
      expect(html, dead).not.toContain(dead);
      expect(cssRules, dead).not.toContain(dead);
    }
    for (const dead of ["flyoutFor", "railClick", "peeksOnHover", "readCollapsed"]) {
      expect(srcCode, dead).not.toContain(dead);
    }
  });
});
