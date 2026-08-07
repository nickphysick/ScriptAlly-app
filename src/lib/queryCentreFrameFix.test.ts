/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre · frame corrections against design-refs/query-centre-final.html.
 *
 * The ref's pane column has NO wrapper card — the toolbar row, the hero and the three columns are
 * siblings directly inside the workspace frame, and the only bordered surfaces are the hero and
 * the columns. Carrying .f12-pane on the wrapper put a card inside the frame inside the sheet.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const queries = read("../components/Queries.tsx");
const pane = read("../components/queries/QueryCreatePane.tsx");
const css = read("../components/shell/f12.css");
const todo = read("../components/todo/todo.css");

const rule = (sel: string): string => {
  const at = css.indexOf("\n" + sel + " {");
  return at < 0 ? "" : css.slice(at, css.indexOf("}", at) + 1);
};

describe("no double container", () => {
  it("the reading-pane wrapper is not a .f12-pane", () => {
    expect(queries, "the wrapper card came back").not.toContain("qp-pane f12-pane f12-detail");
    expect(queries).toContain("qp-pane f12-detail qh-lit");
  });

  it("...but the hero and the columns keep their card skin", () => {
    for (const sel of [".f12-hero", ".f12-card"]) {
      expect(rule(sel), `${sel} lost its border`).toContain("border: 1px solid var(--line)");
    }
  });

  it("and the frame itself is still hairline-only", () => {
    const body = rule(".f12-body");
    expect(body).toContain("border: 1px solid var(--line)");
    expect(body, "the frame must never gain a fill").not.toContain("background:");
    expect(body, "hairline only").not.toContain("box-shadow");
  });
});

describe("frame interior padding", () => {
  it("~20px top/bottom, 22px left/right — nothing sits against the hairline", () => {
    expect(rule(".f12-body")).toContain("padding: 20px 22px;");
  });
});

describe("quiet scrollbars — the To-do pattern, reused", () => {
  it("thin and transparent at rest on the rows and every column body", () => {
    expect(css).toContain(".f12-rows, .f12-quiet-scroll { scrollbar-width: thin; scrollbar-color: transparent transparent; }");
    expect(todo, "To-do's pattern moved — these were meant to track each other")
      .toContain("scrollbar-color: transparent transparent");
  });

  it("a hairline thumb appears on hover or keyboard focus", () => {
    expect(css).toContain(":focus-within { scrollbar-color: var(--hairline) transparent; }");
  });

  it("applied to the list rows and all three column bodies, both modes", () => {
    // reading pane: the three EdgeFadeScroll columns
    expect(queries.match(/scrollClassName="f12-quiet-scroll"/g)?.length ?? 0).toBe(3);
    // create mode: the two scrolling column bodies (Notes is a flex textarea, not a scroller)
    expect(pane.match(/className="f12-quiet-scroll"/g)?.length ?? 0).toBe(2);
  });

  it("the webkit half is present — To-do's rule lacks it, so Safari would show a system bar", () => {
    expect(css).toContain("::-webkit-scrollbar-thumb");
    expect(todo, "if To-do gains one, this note should be revisited").not.toContain("tdb-tmid2::-webkit-scrollbar");
  });
});
