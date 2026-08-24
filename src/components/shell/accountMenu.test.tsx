/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE ACCOUNT MENU, VARIANT B (ref design-refs/scriptally-account-menu-b.html).
 *
 * ⚠️ VERIFICATION LEVEL: CODE + UNIT, NOT MEASURED. Every claim below is either "this is what the
 * component renders" or "this is what the stylesheet declares" — both source claims, which source
 * can answer. NO pixel claim is made here: the workspace is auth-gated, the Playwright harness
 * opens the DEPLOYED dev site, and that site does not carry this change. Geometry is asserted as
 * DECLARED, never as laid out.
 *
 * ⚠️ THESE ARE THE BAKED DECISIONS, WRITTEN AS ASSERTIONS RATHER THAN AS COMMENTS. Each one is a
 * thing that reads as tidying when someone meets it cold — a burgundy fill on the row you are
 * hovering, a red Sign out, a "1 of 1 manuscripts" meter, a shortcut hint copied from the ref.
 * CLAUDE.md's standing rule: a constraint worth a warning comment is worth a test.
 *
 * ⚠️ AND THE SOURCE IS COMMENT-STRIPPED BEFORE ANY ASSERTION. This file's prose names the very
 * things it forbids, and a lock that reads prose is reading the wrong artefact — seven false reds
 * in one session came from exactly that.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { stripComments } from "../../test/pageSmoke";

const here = dirname(fileURLToPath(import.meta.url));
const TSX_SRC = stripComments(readFileSync(resolve(here, "AccountMenu.tsx"), "utf8"));
const CSS_SRC = readFileSync(resolve(here, "accountMenu.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

/** Every block declared for a selector, joined — a grouped rule elsewhere cannot repoint a slice. */
const rule = (sel: string): string => {
  const out: string[] = [];
  for (let i = CSS_SRC.indexOf(sel + " {"); i > -1; i = CSS_SRC.indexOf(sel + " {", i + 1)) {
    out.push(CSS_SRC.slice(i, CSS_SRC.indexOf("}", i)));
  }
  expect(out.length, `accountMenu.css must define ${sel}`).toBeGreaterThan(0);
  return out.join("\n");
};

/** The rendered attribute, bounded — `am-plan` is a prefix of `am-plan--pro`. */
const hasClass = (token: string): boolean =>
  new RegExp(`["\\s\`]${token}["\\s\`]`).test(TSX_SRC);

const at = (needle: string): number => {
  const i = TSX_SRC.indexOf(needle);
  expect(i, `AccountMenu.tsx must contain ${needle}`).toBeGreaterThan(-1);
  return i;
};

describe("variant B — identity, plan, rule, rows, rule, sign out", () => {
  it("the plan block leads: it sits under the name and ABOVE the first hairline", () => {
    expect(at("am-who")).toBeLessThan(at('className={`am-plan '));
    expect(at('className={`am-plan ')).toBeLessThan(at('className="am-div"'));
    expect(at('className="am-div"')).toBeLessThan(at("<span>Settings</span>"));
  });

  /**
   * ⚠️ THE RETIREMENT, STATED. The old block was the words "Pro plan" in a transparent box
   * fenced by two hairlines — a label dressed as a control, and the reason variant B exists. Its
   * marker was `.am-plan.pro`, a compound class; `am-plan--pro` is a different attribute, so the
   * bounded form below tells the two apart where a substring check could not.
   */
  it("the standalone Pro text row is GONE — no transparent plan variant survives", () => {
    expect(hasClass("pro"), "`am-plan pro` was the label-dressed-as-a-control").toBe(false);
    expect(rule(".am-plan--pro")).toContain("background: var(--slate-tint)");
    expect(CSS_SRC).not.toContain(".am-plan.pro");
  });

  it("the identity header reuses the house avatar rather than growing a second one", () => {
    expect(TSX_SRC).toContain("<AvatarChip name={name} size={32} />");
    expect(CSS_SRC, "a `.am-av` here would be the second avatar system Baked 11 forbids")
      .not.toContain(".am-av");
  });

  /** A wrapped email changes the card's height AFTER `placeMenu` has measured it. */
  it("both identity lines clip and neither wraps", () => {
    for (const sel of [".am-name", ".am-email"]) {
      expect(rule(sel)).toContain("text-overflow: ellipsis");
      expect(rule(sel)).toContain("white-space: nowrap");
    }
    expect(rule(".am-idt"), "without min-width:0 the flex child widens the menu instead of clipping")
      .toContain("min-width: 0");
  });
});

describe("the plan block is two treatments, and only one of them sells", () => {
  it("Free states what Pro DOES and offers the route", () => {
    expect(TSX_SRC).toContain("One manuscript, one Smart Import. Pro lifts both, and adds Smart Email Drop.");
    expect(TSX_SRC).toContain("See what Pro includes");
    expect(TSX_SRC).toContain('go("/plans")');
  });

  it("Pro reads its plan as fact, is never sold to, and manages at /account/plan", () => {
    expect(TSX_SRC).toContain('go("/account/plan")');
    /* Both halves of the Free block are gated on the SAME flag the Pro link inverts, so a Pro user
       cannot reach the copy or the button — asserted on the gate, not on the strings. */
    expect(TSX_SRC).toContain("{line.upgrade && (");
    expect(TSX_SRC).toContain("{!line.upgrade && (");
    /* `/plans` is the comparison; a subscriber wants the subscription. */
    expect(TSX_SRC.indexOf('go("/account/plan")')).toBeLessThan(TSX_SRC.indexOf('go("/plans")'));
  });

  /**
   * ⚠️ NO METER, NO COUNTS, EVER. "1 of 1 manuscripts" in permanent chrome is a nag, and this menu
   * is opened to sign out far more often than it is opened to buy something.
   */
  it("states no usage figure", () => {
    expect(TSX_SRC).not.toMatch(/\bof\s*\{/);
    expect(TSX_SRC).not.toMatch(/\b\d+\s*\/\s*\d+\b/);
    for (const word of ["remaining", "used", "left this", "usage", "limit"]) {
      expect(TSX_SRC.toLowerCase(), word).not.toContain(word);
    }
  });
});

/**
 * ⚠️ THE HINT ARRIVES WITH THE BINDING OR NOT AT ALL. The ref prints `⌘,` beside Settings; nothing
 * in this app binds it — the only comma handlers in `src/` are tag-entry commits in the manuscript
 * form. A printed shortcut that does nothing teaches that the app's chrome lies.
 */
describe("no shortcut is advertised, because none is bound", () => {
  it("the Settings row carries no key hint", () => {
    expect(TSX_SRC).not.toContain("⌘,");
    expect(TSX_SRC).not.toContain("aria-keyshortcuts");
    expect(CSS_SRC, "the ref's `.sc` slot has nothing to hold").not.toContain(".am-sc");
  });
});

describe("the quiet half stays quiet", () => {
  /* Burgundy is the app's single accent and it marks urgency: a row that fills burgundy under the
     pointer says something is wrong with the row you are pointing at. */
  it("rows hover to the warm cream ground, never to a burgundy fill", () => {
    expect(rule(".am-row:hover")).toContain("background: var(--shell-parch)");
    expect(rule(".am-row:hover")).not.toContain("burgundy");
  });

  it("the Free CTA is a white button with a warm-pink edge, not a burgundy fill", () => {
    const btn = rule(".am-planbtn");
    expect(btn).toContain("background: #ffffff");
    expect(btn).toContain("border: 1px solid var(--pink-b)");
    expect(btn).toContain("color: var(--shell-burgundy)");
    expect(btn).not.toMatch(/background:\s*var\(--shell-burgundy\)/);
  });

  it("Sign out is one step lighter than the rows above it, and carries no red", () => {
    expect(rule(".am-out")).toContain("color: var(--shell-muted)");
    expect(rule(".am-row")).toContain("color: var(--shell-ink-soft)");
    expect(rule(".am-out svg")).toContain("opacity");
  });

  /**
   * ⚠️ THE WHOLE-SHEET COLOUR CENSUS, not a check of the three places anyone would think to look.
   * A red arriving as `--danger` on a new selector is exactly the change this is here to catch,
   * and no positive assertion about `.am-out` can see it.
   */
  it("every colour in the sheet is a live token — the only literals are white and the shadow", () => {
    const tokens = [...CSS_SRC.matchAll(/var\((--[a-z0-9-]+)/gi)].map((m) => m[1]);
    expect(tokens.length, "the sheet must read tokens for this to mean anything").toBeGreaterThan(10);
    const allowed = new Set([
      "--shell-card", "--shell-menu-edge", "--shell-edge", "--shell-hair", "--shell-parch",
      "--shell-ink", "--shell-ink-soft", "--shell-muted", "--shell-burgundy", "--shell-rail-icon",
      "--ink", "--pink", "--pink-b", "--slate-tint", "--slate-line", "--slate-deep",
    ]);
    for (const t of new Set(tokens)) {
      expect(allowed.has(t), `${t} is new to this sheet — is it a colour nobody sanctioned?`).toBe(true);
    }
    const hexes = new Set([...CSS_SRC.matchAll(/#[0-9a-f]{3,8}\b/gi)].map((m) => m[0].toLowerCase()));
    expect([...hexes]).toEqual(["#ffffff"]);
    /* ⚠️ WORD-BOUNDED, AND THE FIRST DRAFT WAS NOT. A bare `toContain("red")` fired on
       `prefers-reduced-motion` — a false red about the absence of red, in the file whose own
       docstring names that fault class. A colour keyword is a whole word or it is not the keyword. */
    for (const red of [/\bred\b/, /\bcrimson\b/, /#c0392b/, /#d32f2f/, /#e5484d/]) {
      expect(CSS_SRC.toLowerCase(), String(red)).not.toMatch(red);
    }
  });
});

describe("the geometry the ref is normative for", () => {
  it("the card is 270 wide, 12px radius, and clips its own inset children", () => {
    const m = rule(".am-menu");
    expect(m).toContain("width: 270px");
    expect(m).toContain("border-radius: 12px");
    expect(m).toContain("overflow: hidden");
    /* ⚠️ IT DECLARES ITS OWN BOX MODEL. The card is portalled to `document.body` — outside every
       page's reset — and `width: 270px` beside a 1px border is two different cards under the two
       models. CLAUDE.md's rule: maths that depends on the box model states it. */
    expect(m).toContain("box-sizing: border-box");
  });

  it("the rows and the plan block carry the ref's spacing", () => {
    expect(rule(".am-row")).toContain("height: 34px");
    expect(rule(".am-row")).toContain("border-radius: 7px");
    expect(rule(".am-plan")).toContain("margin: 5px 10px 6px");
    expect(rule(".am-plan")).toContain("border-radius: 9px");
    expect(rule(".am-planbtn")).toContain("height: 31px");
    expect(rule(".am-div")).toContain("height: 1px");
  });

  /* The row is inset 5px each side; a plain `width: 100%` overflows a border-box child by exactly
     that margin, which shows as the hover fill running under the card's own edge. */
  it("the row's width answers its own margin", () => {
    expect(rule(".am-row")).toContain("margin: 0 5px");
    expect(rule(".am-row")).toContain("width: calc(100% - 10px)");
  });
});
