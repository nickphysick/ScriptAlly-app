/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ContactIndexStrip — the A–Z index's rendered contract (v12 §4). Rendered through
 * renderToStaticMarkup (no jsdom in this repo); geometry belongs to the e2e §10.2 case —
 * these lock the STRUCTURE: 27 cells, the counts on exactly the lettered cells, the marked
 * cell's dress, and the letterless cells' inertness.
 */
import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ContactIndexStrip } from "./ContactIndexStrip";

const render = (marked: string | null = null) =>
  renderToStaticMarkup(
    <ContactIndexStrip
      total={5}
      counts={new Map([["B", 3], ["O", 2]])}
      marked={marked}
      onPick={() => {}}
    />,
  );

describe("the index strip (v12 §4)", () => {
  it("renders 27 cells — All · N first, then the 26 letters in order", () => {
    const html = render();
    expect(html.match(/clv-ixtab/g)?.length).toBeGreaterThanOrEqual(27);
    expect((html.match(/data-clv="ixtab"/g) ?? []).length).toBe(26);
    expect(html).toContain("All · 5");
    /* the letters arrive in alphabet order — A before B before Z */
    const az = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    let at = html.indexOf('data-clv="ixall"');
    for (const L of az) {
      const i = html.indexOf(`data-letter="${L}"`);
      expect(i, `${L} present and after its predecessor`).toBeGreaterThan(at);
      at = i;
    }
  });

  it("a lettered cell carries .has and its count; a letterless cell is disabled and bare", () => {
    const html = render();
    /* B has agents: the has class and the <i>3</i> */
    expect(html).toMatch(/class="clv-ixtab has"[^>]*data-letter="B"[^>]*>B<i>3<\/i>/);
    expect(html).toMatch(/data-letter="O"[^>]*>O<i>2<\/i>/);
    /* A is empty: disabled, no has, no count element inside it */
    const a = html.match(/<button[^>]*data-letter="A"[^>]*>A<\/button>/);
    expect(a, "the empty cell holds the bare letter and nothing else").not.toBeNull();
    expect(a![0]).toContain("disabled");
    expect(a![0]).not.toMatch(/["\s`]has["\s`]/);
  });

  it("the marked cell wears .on and aria-current; unmarked lettered cells wear neither", () => {
    const marked = render("B");
    expect(marked).toMatch(/class="clv-ixtab has on"[^>]*data-letter="B"/);
    expect(marked).toMatch(/data-letter="B"[^>]*aria-current/);
    expect(marked).not.toMatch(/data-letter="O"[^>]*aria-current/);
    const rest = render(null);
    expect(rest).not.toMatch(/["\s`]on["\s`]/);
    expect(rest).not.toContain("aria-current");
  });
});
