/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ THE EXTRACTION IS A VISUAL NO-OP, AND THIS IS WHAT SAYS SO.
 *
 * `OneScreenPanel` replaced four hand-rolled card shells. The whole value of doing that in its own
 * commit is that any pixel which moves is a bug rather than a judgement call — so these pin the
 * rendered class strings to exactly what the four containers emitted before, character for
 * character, including the order of `os-card os-lift {variant}`.
 */
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { OneScreenPanel } from "./OneScreenPanel";

const html = (el: React.ReactElement) => renderToStaticMarkup(el);

describe("OneScreenPanel — the shell the four containers had", () => {
  it("emits `os-card os-lift {variant}` in that order", () => {
    expect(html(<OneScreenPanel variant="os-tasks" />)).toContain('class="os-card os-lift os-tasks"');
    expect(html(<OneScreenPanel variant="os-lead" />)).toContain('class="os-card os-lift os-lead"');
    expect(html(<OneScreenPanel variant="os-actv" />)).toContain('class="os-card os-lift os-actv"');
  });

  it("⚠️ a multi-word variant survives intact — Goals is `os-goal stowable`", () => {
    // the rail's collapse targets `.stowable`; losing it would stop the panel collapsing at all
    expect(html(<OneScreenPanel variant="os-goal stowable" />))
      .toContain('class="os-card os-lift os-goal stowable"');
  });

  it("appends ` isload` exactly as the hand-rolled shells did", () => {
    expect(html(<OneScreenPanel variant="os-tasks" loading />))
      .toContain('class="os-card os-lift os-tasks isload"');
  });

  it("renders the skeleton ONLY while loading, and only when bars are given", () => {
    expect(html(<OneScreenPanel variant="os-tasks" loading skel={["h", ""]} />)).toContain("os-skel");
    expect(html(<OneScreenPanel variant="os-tasks" skel={["h", ""]} />)).not.toContain("os-skel");
    expect(html(<OneScreenPanel variant="os-tasks" loading />)).not.toContain("os-skel");
  });

  it("⚠️ the head precedes the body — it is the card's first child after the skeleton", () => {
    const out = html(
      <OneScreenPanel variant="os-actv" head={<div className="os-ahead">H</div>}>
        <div className="body">B</div>
      </OneScreenPanel>
    );
    expect(out.indexOf("os-ahead")).toBeLessThan(out.indexOf('class="body"'));
  });

  it("`os-lift` is the default and can be turned off explicitly", () => {
    expect(html(<OneScreenPanel variant="os-x" lift={false} />)).toContain('class="os-card os-x"');
  });
});
