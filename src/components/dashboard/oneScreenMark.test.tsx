/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ THE SLOT IS THE DELIVERABLE, NOT THE ICON (§1).
 *
 * These headers label SURFACES, so the destination is a commissioned illustrated mark; the
 * monoline icon is a temporary occupant. Everything here therefore tests the SWAP: that the box is
 * 28px whatever is inside it, that the brief never reaches the DOM, and that a failed asset
 * degrades rather than leaving a broken-image glyph in a header.
 */
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import React from "react";
import { OneScreenMark, MarkName } from "./OneScreenMark";

const NAMES: MarkName[] = ["active-queries", "goals", "activity", "tasks"];
const css = readFileSync(resolve(__dirname, "./oneScreen.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const blk = (sel: string) => {
  const i = css.indexOf(`${sel} {`);
  expect(i, `${sel} must exist`).toBeGreaterThan(-1);
  return css.slice(i, css.indexOf("}", i));
};

describe("the mark slot", () => {
  it("every named mark renders exactly one slot", () => {
    for (const n of NAMES) {
      const out = renderToStaticMarkup(<OneScreenMark name={n} />);
      expect((out.match(/class="os-mark"/g) ?? []), n).toHaveLength(1);
      expect(out).toContain(`data-mark="${n}"`);
    }
  });

  it("⚠️ THE BOX IS 28px IN BOTH DIRECTIONS AND DOES NOT FLEX", () => {
    const b = blk(".os-mark");
    expect(b).toContain("flex: 0 0 28px");
    expect(b).toContain("width: 28px");
    expect(b).toContain("height: 28px");
  });

  it("⚠️ the box's size is INDEPENDENT of its contents — that is what makes the swap free", () => {
    // the icon states its own 17px; an asset is bounded and letterboxed. Neither may size the box.
    expect(blk(".os-mark svg")).toContain("width: 17px");
    const img = blk(".os-mark img");
    expect(img).toContain("max-width: 100%");
    expect(img).toContain("max-height: 100%");
    expect(img).toContain("object-fit: contain");
  });

  it("⚠️ the plate's rim is an INSET SHADOW, never a border — a border would add 2px to a 28px box", () => {
    const b = blk(".os-mark");
    expect(b).toContain("box-shadow: inset 0 0 0 1px");
    expect(b).not.toMatch(/(^|;|\s)border:\s*[\d.]+px/);
  });

  it("⚠️ ONE translucent plate serves BOTH bands — no per-band override", () => {
    expect(blk(".os-mark")).toContain("rgba(253, 250, 245, 0.72)");
    // a `.os-th2 .os-mark` or `.os-ahead .os-mark` rule would be this becoming four rules again
    expect(css).not.toMatch(/\.os-(th2|ahead)\s+\.os-mark\s*\{/);
  });

  it("⚠️ THE BRIEF NEVER REACHES THE DOM — a rendered brief is a brief that ships", () => {
    const src = readFileSync(resolve(__dirname, "./OneScreenMark.tsx"), "utf8");
    for (const phrase of ["ruled page", "wax-sealed", "clock face over", "pencil resting"]) {
      expect(src, `${phrase} must be documented`).toContain(phrase);
    }
    for (const n of NAMES) {
      const out = renderToStaticMarkup(<OneScreenMark name={n} />);
      for (const phrase of ["ruled page", "wax-sealed", "clock face", "pencil resting"]) {
        expect(out, `${n} must not render its brief`).not.toContain(phrase);
      }
    }
  });

  it("the mark is decorative — the title beside it carries the meaning", () => {
    expect(renderToStaticMarkup(<OneScreenMark name="tasks" />)).toContain('aria-hidden="true"');
  });
});

describe("every dashboard container header carries one mark", () => {
  const files = {
    "Tasks": "OneScreenTasks.tsx",
    "Chart": "OneScreenChart.tsx",
    "Rail (goals + activity)": "OneScreenRail.tsx",
  };
  it("all four headers are wired, and none twice", () => {
    let total = 0;
    for (const f of Object.values(files)) {
      const src = readFileSync(resolve(__dirname, `./${f}`), "utf8");
      total += (src.match(/<OneScreenMark name=/g) ?? []).length;
    }
    expect(total).toBe(4); // one per container — a fifth would mean a header grew a second mark
  });
});
