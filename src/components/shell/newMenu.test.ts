/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ THE + NEW MENU MUST NOT DISPLACE THE CONTENT (polish P1).
 *
 * THE FAULT: `.ws-newmenu` had no rule of its own and `.sp-card` is statically positioned, so the
 * panel laid out as an ordinary child of the pagebar, grew the bar by its own height, and pushed
 * the whole content window down. Opening a menu moved the thing you were reading.
 *
 * ⚠️ WHAT THIS FILE CAN AND CANNOT PROVE. There is no jsdom here (`environment: 'node'`), so
 * nothing in this repo can measure a rect. The pack's before/after assertion is therefore a
 * BROWSER measurement, recorded in reports/dashboard-polish.md. What a source test CAN pin is the
 * cause: the panel is out of flow, anchored, and above the window. Those three are what made the
 * displacement possible, and any one of them regressing brings it back.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const css = readFileSync(join(__dirname, "workspaceShell.css"), "utf8");
const tsx = readFileSync(join(__dirname, "WorkspaceShell.tsx"), "utf8");
/* ⚠️ COMMENTS NAME EVERY SELECTOR HERE — strip them or an assertion passes on its own tombstone. */
const bare = css.replace(/\/\*[\s\S]*?\*\//g, "");

const block = (sel: string): string => {
  const i = bare.indexOf(`${sel} {`);
  expect(i, `${sel} must be declared`).toBeGreaterThan(-1); // anchor before slicing
  return bare.slice(i, bare.indexOf("}", i));
};

describe("+ New menu — out of flow, or the content moves", () => {
  it("the panel is absolutely positioned, hung off the button's bottom-right", () => {
    const b = block(".ws-newmenu");
    expect(b).toContain("position: absolute");
    expect(b).toContain("top: calc(100% + 8px)");
    expect(b).toContain("right: 0");
  });

  it("⚠️ the wrapper is the anchor — absolute with no positioned parent escapes to the viewport", () => {
    expect(block(".ws-newwrap")).toContain("position: relative");
  });

  it("it paints above the content window, which has a background of its own", () => {
    const z = /z-index:\s*(\d+)/.exec(block(".ws-newmenu"));
    expect(z, "the panel needs a z-index").not.toBeNull();
    expect(Number(z![1])).toBeGreaterThan(1);
  });

  it("⚠️ the entrance animates TRANSFORM and OPACITY only (pack rule 7)", () => {
    const kf = bare.slice(bare.indexOf("@keyframes ws-menuin"));
    const body = kf.slice(0, kf.indexOf("}\n"));
    expect(body).toContain("opacity");
    expect(body).toContain("transform");
    // animating any of these would relayout the pagebar every frame — the bug in slow motion
    for (const prop of ["height:", "top:", "left:", "width:", "margin"]) {
      expect(body).not.toContain(prop);
    }
  });

  it("scales from the corner it hangs from, not from its middle", () => {
    expect(block(".ws-newmenu")).toContain("transform-origin: top right");
  });
});

describe("+ New menu — announced and operable", () => {
  it("carries the menu roles, paired", () => {
    expect(tsx).toContain('aria-haspopup="menu"');
    expect(tsx).toContain("aria-expanded={newOpen}");
    expect(tsx).toContain('<MenuCard className="ws-newmenu" role="menu">');
    // a role="menu" whose children are not menuitems announces an empty menu
    expect(tsx).toContain('role="menuitem"');
  });

  it("⚠️ every item in the panel is a menuitem — a missed one is silent to a screen reader", () => {
    const open = tsx.indexOf('<MenuCard className="ws-newmenu"');
    expect(open).toBeGreaterThan(-1);
    const panel = tsx.slice(open, tsx.indexOf("</MenuCard>", open));
    const items = panel.match(/<MenuCardItem/g) ?? [];
    const roles = panel.match(/role="menuitem"/g) ?? [];
    expect(items.length).toBeGreaterThan(0);
    expect(roles).toHaveLength(items.length);
  });

  it("closes on Escape AND on Tab, and cycles with the arrows", () => {
    /* ⚠️ ASSERT THE KEYS, NOT THE EXPRESSION SHAPE. An earlier version of this test demanded
       `e.key === "ArrowUp"` and went red against a correct guard written as `e.key !== "ArrowUp"`
       — pinning how the code is phrased rather than what it responds to. */
    const eff = tsx.slice(tsx.indexOf("THE MENU OWNS ITS KEYBOARD"));
    const handler = eff.slice(0, eff.indexOf("}, [newOpen]);"));
    for (const key of ["Escape", "Tab", "ArrowDown", "ArrowUp"]) {
      expect(handler, `the menu must handle ${key}`).toContain(`"${key}"`);
    }
  });

  it("⚠️ arrow keys preventDefault — otherwise the page scrolls under an open menu", () => {
    const eff = tsx.slice(tsx.indexOf("THE MENU OWNS ITS KEYBOARD"));
    expect(eff.slice(0, eff.indexOf("}, [newOpen]);"))).toContain("e.preventDefault()");
  });

  it("⚠️ renders no row without a destination — no 'New note' until a contract exists", () => {
    const open = tsx.indexOf('<MenuCard className="ws-newmenu"');
    const panel = tsx.slice(open, tsx.indexOf("</MenuCard>", open));
    expect(panel).not.toContain('label="New note"');
  });
});
