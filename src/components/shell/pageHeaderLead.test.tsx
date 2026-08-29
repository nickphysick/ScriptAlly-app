/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ THE RECORD PAGE IS THE FIRST WORKSPACE PAGE WITHOUT A MARK AND THE FIRST WITH A LEAD ROW, so
 * "the other nine render unchanged" is PROVED here rather than assumed.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { PageHeader } from "./PageHeader";

/**
 * ⚠️ THE BEHAVIOUR PROVIDER IS GONE FROM THIS FILE, AND THAT IS THE HEADER REBUILD. Every masthead
 * used to be Type A or Type B, and only the pinning kind accepted a control; there is one format
 * now, it holds exactly one CTA, and whether the page scrolls has nothing to do with it. Rendering
 * bare is therefore the honest case rather than a shortcut.
 */
const pinned = (node: React.ReactNode) => renderToStaticMarkup(<>{node}</>);

describe("the lead row is additive", () => {
  /**
   * ⚠️ BYTE-IDENTICAL, NOT "LOOKS THE SAME". A reserved-but-empty row reads as nothing in review
   * and moves every page that passes no lead down by its own height.
   */
  it("a header with no lead renders exactly as it did before the prop existed", () => {
    const without = pinned(<PageHeader variant="workspace" title="Agents" mark="contacts" description="A line." />);
    expect(without, "an empty lead element was rendered").not.toContain("wsh-lead");
    /* ⚠️ THE TOP RULE IS THE FIRST CHILD NOW, NOT THE TEXT ROW — it sits 7px below the container's
       edge and above the body's own inset, which is the whole reason `.wsh` carries no padding. */
    expect(without).toContain('<header class="wsh"><div class="wsh-toprule" aria-hidden="true"></div>');
  });

  it("a header WITH a lead renders it above the row, once", () => {
    const withLead = pinned(
      <PageHeader variant="workspace" title="Manuscripts" mark="manuscripts" lead={<button type="button">back</button>} />,
    );
    expect(withLead).toContain('<div class="wsh-lead">');
    expect(withLead.indexOf("wsh-lead")).toBeLessThan(withLead.indexOf("wsh-body"));
    expect((withLead.match(/wsh-lead/g) ?? []).length).toBe(1);
  });

  /**
   * ⚠️ NO MARK AT REST, ON ANY PAGE, WHETHER OR NOT ONE IS PASSED — and asserting BOTH is the point.
   * This file used to prove the opposite: that a page omitting `mark` got no box and the nine
   * passing one still did. The mark now exists only in the collapsed bar, so the prop survives as a
   * declaration of WHICH mark that bar draws and the masthead renders none either way.
   *
   * ⚠️ THE SECOND CASE IS WHAT MAKES THIS A CLAIM. "A page that passes nothing draws nothing" is
   * true of any header; "a page that passes a mark STILL draws nothing" is the rebuild.
   */
  it("draws no mark, whether or not a page declares one", () => {
    const bare = pinned(<PageHeader variant="workspace" title="Murphy's Day Out" />);
    expect(bare, "an empty mark box was reserved").not.toContain("wsh-mark");
    expect(bare).toContain('<div class="wsh-body">');
    const declared = pinned(<PageHeader variant="workspace" title="Agents" mark="contacts" />);
    expect(declared, "a declared mark is still drawn in the masthead — it belongs to the collapsed bar now")
      .not.toContain("wsh-mark");
    expect(declared, "the mark's artwork reached the masthead by another route").not.toContain("os-mark");
  });
});
