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
import { MastheadBehaviourContext } from "./mastheadBehaviour";

/** Type A: a pinning masthead, which is what accepts an action slot. */
const pinned = (node: React.ReactNode) =>
  renderToStaticMarkup(
    <MastheadBehaviourContext.Provider value={{ leaves: false }}>{node}</MastheadBehaviourContext.Provider>,
  );

describe("the lead row is additive", () => {
  /**
   * ⚠️ BYTE-IDENTICAL, NOT "LOOKS THE SAME". A reserved-but-empty row reads as nothing in review
   * and moves every page that passes no lead down by its own height.
   */
  it("a header with no lead renders exactly as it did before the prop existed", () => {
    const without = pinned(<PageHeader variant="workspace" title="Agents" mark="contacts" description="A line." />);
    expect(without, "an empty lead element was rendered").not.toContain("wsh-lead");
    /* The row is the first child of the header — nothing precedes it. */
    expect(without).toContain('<header class="wsh"><div class="wsh-row">');
  });

  it("a header WITH a lead renders it above the row, once", () => {
    const withLead = pinned(
      <PageHeader variant="workspace" title="Manuscripts" mark="manuscripts" lead={<button type="button">back</button>} />,
    );
    expect(withLead).toContain('<div class="wsh-lead">');
    expect(withLead.indexOf("wsh-lead")).toBeLessThan(withLead.indexOf("wsh-row"));
    expect((withLead.match(/wsh-lead/g) ?? []).length).toBe(1);
  });

  /**
   * ⚠️ AND THE MARK SLOT CAN BE ABSENT ON A WORKSPACE PAGE. Three `full` pages already omit it;
   * none of the nine workspace ones does, so this is the first — and the title must take the
   * leading position rather than a placeholder holding it.
   */
  it("omits the mark slot entirely when no mark is passed", () => {
    const bare = pinned(<PageHeader variant="workspace" title="Murphy's Day Out" />);
    expect(bare, "an empty mark box was reserved").not.toContain("wsh-mark");
    expect(bare).toContain('<div class="wsh-row"><div class="wsh-txt">');
  });

  /** The nine that pass a mark still get one — the conditional did not become unconditional. */
  it("still renders the mark when one is passed", () => {
    expect(pinned(<PageHeader variant="workspace" title="Agents" mark="contacts" />)).toContain("wsh-mark");
  });
});
