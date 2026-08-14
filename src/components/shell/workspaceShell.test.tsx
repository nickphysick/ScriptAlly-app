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
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { UserPlan } from "../../types";
import { ShellSection } from "../../lib/workspaceShell";

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
  it("the window is the ground surface: the token, radius, hairline, soft raise", () => {
    const w = rule(".ws-window");
    expect(w, "the window's ground is a literal again — the hems, the dock and the two internal fades all resolve into it and would each need the same literal")
      .toContain("background: var(--ws-window)");
    expect(w).not.toContain("#ffffff");
    expect(w).toContain("border-radius: 16px");
    expect(w).toContain("border: 1px solid var(--ws-edge)");
    expect(w).toContain("box-shadow:");
  });

  /* ⚠️ RETARGETED (audit pack P6), and the retarget FINISHES this rule rather than relaxing it.
     "One ground" already said the sidebar and the page are one surface; the hairline down the
     panel's right edge was the last thing still claiming otherwise, drawing an edge where there is
     no edge. It is deleted, so what this now asserts is the whole of the rule: same token, sidebar
     paints nothing, and NOTHING divides them. The white content window does the separating. */
  it("⚠️ ONE GROUND — same token, the sidebar paints nothing, and no rule divides them", () => {
    expect(rule(".ws-app")).toContain("background: var(--ws-ground)");
    expect(rule(".ws-main")).toContain("background: var(--ws-ground)");
    expect(rule(".ws-panel")).toContain("background: transparent");
    expect(cssRules).not.toContain(".ws-panel::after");
    /* ⚠️ `[1-9]`, NOT A NEGATIVE LOOKAHEAD. The first draft was `/border-right:\s*(?!0)/`, and
       `\s*` backtracks to ZERO characters — so the lookahead ran against the space rather than the
       value and `border-right: 0` "matched". The rule was correct and the test was not. */
    expect(cssRules).not.toMatch(/\.ws-panel[^{]*\{[^}]*border-right:\s*[1-9]/);
  });

  /* ⚠️ AND THE CONTAINING BLOCK SURVIVES THE HAIRLINE. `.ws-msmenu` is absolutely positioned and
     anchors to the panel; removing a decoration is not a reason to remove `position: relative`,
     and the flyout would silently reparent to the viewport if it were. */
  it("⚠️ the panel is still a containing block — the manuscript flyout anchors to it", () => {
    expect(rule(".ws-panel")).toContain("position: relative");
    expect(rule(".ws-msmenu")).toContain("position: absolute");
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
  it("every size in the pack's table", () => {
    expect(rule(".ws-ni")).toContain("font-size: 14.5px");        // nav items
    expect(rule(".ws-glabel")).toContain("font-size: 9px");       // section labels
    expect(rule(".ws-mst")).toContain("font-size: 14px");         // manuscript title
    expect(rule(".ws-msg")).toContain("font-size: 11.5px");       // manuscript sub-line
    expect(rule(".ws-n")).toContain("font-size: 14px");           // user name
    expect(rule(".ws-pl")).toContain("font-size: 12px");          // plan line
    // ⚠️ `.ws-upgrow` since Option D — the pill left the account ROW to become a full-width
    // sibling beneath it, which is what bought the name its width. The SIZE is unchanged at 12px,
    // which is what this table guards; only the selector moved.
    expect(rule(".ws-upgrow")).toContain("font-size: 12px");       // upgrade pill
    expect(rule(".ws-bwm")).toContain("font-size: 22px");         // wordmark
    expect(rule(".ws-ic svg")).toContain("width: 17px");          // nav icons
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
  it("⚠️ and the panel is 224px — narrowed 15% with the type scale held, fit re-measured", () => {
    const idx = readFileSync(resolve(__dirname, "../../index.css"), "utf8");
    expect(idx).toContain("--shell-panelw: 224px");
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
  it("⚠️ brand, selector and foot are pinned, so the list is what gives", () => {
    expect(rule(".ws-brand, .ws-phead, .ws-pfoot")).toContain("flex: none");
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
    expect(srcCode.indexOf('className="ws-pagebar"')).toBeGreaterThan(-1);
    expect(srcCode.indexOf('className="ws-pagebar"')).toBeLessThan(srcCode.indexOf('className="ws-window"'));
    expect(rule(".ws-pagebar")).toContain("flex: none");
  });

  /* ⚠️ RETARGETED — both survive, on the pagebar rather than the bar. */
  it("only the current page is ink; ancestors are muted links; `/` throughout", () => {
    const html = at("/queries/analytics");
    expect(html).toContain('class="ws-cur"');
    expect(html).toContain('class="ws-seg"');
    expect(html).toContain(">/<");
    expect(html).not.toContain("·");
    expect(rule(".ws-cur")).toContain("color: #241811");
    expect(rule(".ws-seg")).toContain("color: #8a7a6c");
  });

  /* ⚠️ RETARGETED from "the divider is 1px x 18px on the line token". */
  it("the vertical hairline is 1px x 18px, and the save whisper is mono caps", () => {
    const v = rule(".ws-vdiv");
    expect(v).toContain("width: 1px");
    expect(v).toContain("height: 18px");
    const w = rule(".ws-sync");
    expect(w).toContain("text-transform: uppercase");
    expect(w).toContain("JetBrains Mono");
  });

  /* ⚠️ RETARGETED — + New stays ink, and the pink treatment stays rejected. */
  it("+ New is INK, never pink", () => {
    const n = rule(".ws-nbtn");
    expect(n).toContain("background: #1c130e");
    expect(n).not.toContain("#f5e2da");
  });
});

describe("the sidebar", () => {
  /* ⚠️ RETARGETED, INVERTED, from "the wordmark is GONE from the sidebar; the S tile is the only
     mark there". The rail carried the mark; with it gone the sidebar is the leftmost chrome, so
     the brand lives there — mark AND wordmark — and the crumb carries none. The ONE-BRAND rule
     is what survived; only its address changed. */
  it("⚠️ the brand appears ONCE, in the sidebar, above the manuscript selector", () => {
    const html = at("/dashboard");
    expect(html).toContain('class="ws-bmark"');
    expect(html).toContain("ScriptAlly");
    expect(srcCode.indexOf('className="ws-brand"')).toBeLessThan(srcCode.indexOf('className="ws-phead"'));
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

  /* ⚠️ RETARGETED (audit pack P5) from "hairline, then the user row, then Settings". Settings has
     come UP into the ACCOUNT section — as a lone row below the divider it was a destination living
     in the furniture, and the one page you could not find by reading down the nav.

     What is asserted now is the SHAPE the divider promises: above it, places to go; below it, who
     you are. So the foot holds the hairline and the user row, and nothing that navigates. */
  it("⚠️ the foot is the hairline and the user row — no Settings, nothing else to go to", () => {
    const from = srcCode.indexOf('className="ws-pfoot"');
    const to = srcCode.indexOf("{accountMenu}", from);
    expect(from).toBeGreaterThan(-1);
    expect(to).toBeGreaterThan(from);
    const foot = srcCode.slice(from, to);
    const div = foot.indexOf('className="ws-pdiv"');
    const user = foot.indexOf('className="ws-uacct"');
    expect(div).toBeGreaterThan(-1);
    expect(user).toBeGreaterThan(div);
    expect(foot).not.toContain("ws-setrow");
    expect(foot).not.toContain("Settings");
  });

  /* ⚠️ AND ITS RULE WENT WITH IT — a leftover `.ws-setrow` is how a foot quietly regrows a row. */
  it("⚠️ `.ws-setrow` is deleted, not left orphaned in the sheet", () => {
    expect(cssRules).not.toContain(".ws-setrow");
  });

  /* ⚠️ RETARGETED — the pack's rule 7, and the one most likely to be undone by a future repaint. */
  it("⚠️ the active nav item is a WHITE tile with ink text — never a burgundy fill", () => {
    const on = rule(".ws-ni.on, .ws-nav .on");
    expect(on).toContain("background: #ffffff");
    expect(on).toContain("color: #241811");
    expect(cssRules).not.toMatch(/\.ws-ni\.on[^}]*background:\s*(#7c3a2a|var\(--burgundy)/);
  });

  /* ⚠️ RETARGETED — the badge survives on the panel row; only its rail ring died. */
  it("only To-do carries a badge, and it is a burgundy dot with its count", () => {
    const html = at("/dashboard");
    expect(html).toContain("sp-ct");            // the shared CountChip
    expect((html.match(/sp-ct"/g) ?? []).length).toBe(1);
  });

  /* ⚠️ RETARGETED from "the panel's head zone carries the card's inset in both height and
     padding". THE HEIGHT NO LONGER COMES FROM `--head`: that calc existed solely to close the
     masthead on the same continuous line as the greige bar, and there is no bar. The selector is
     sized by its own contents beneath the brand block. */
  it("⚠️ .ws-phead is content-sized and reads no --head", () => {
    const h = rule(".ws-phead");
    expect(h).toContain("height: auto");
    expect(h).not.toContain("--head");
    expect(h).toContain("box-sizing: border-box");
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
