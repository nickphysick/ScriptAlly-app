/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QuotedLine, splitLastWord } from "./QuotedLine";

describe("v28.1 — the closing quote is bound to the last word", () => {
  it("splits off the last word and keeps the copy whole", () => {
    expect(splitLastWord("  A ferry skipper races the tide. ")).toEqual({ head: "A ferry skipper races the ", last: "tide." });
    expect(splitLastWord("Alone")).toEqual({ head: "", last: "Alone" });
  });
  it("renders the text unchanged, then ” inside the same no-wrap span as the last word", () => {
    const html = renderToStaticMarkup(<QuotedLine text="One Saturday to find him." />);
    expect(html.replace(/<[^>]+>/g, "")).toBe("One Saturday to find him.”");
    expect(html).toContain('<span class="ms28-qend" data-ms28="qend">him.<span class="ms28-cq" aria-hidden="true" data-ms28="close-quote">”</span></span>');
  });
});
