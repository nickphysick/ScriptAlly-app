/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Header panel v2 — `PageHeader`'s opt-in `panel`. What a rendered string can say: the panel's classes and marker, no
 * header sheet under a panel, the buttons' panel classes, and the empty state NOT being a panel. That a header without
 * the prop is unchanged is pageHeaderDefault.test.tsx's, untouched. Where anything ends up is tests/e2e/headerPanelV2.
 */
import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PageHeader } from "./PageHeader";

const r = (el: React.ReactElement) => renderToStaticMarkup(el);
const living = (count: number | null) => ({ count, copy: (n: number) => ({ headline: `${n} things`, subline: ["a line"] }), empty: { heading: "Nothing yet", subline: ["start here"] } }) as never;

describe("PageHeader panel", () => {
  it("full: the panel's classes and marker, no header sheet, the buttons in the panel's treatment", () => {
    const h = r(<PageHeader panel title="T" description="d" primary={{ label: "Go", onClick: () => {} }} secondary={{ label: "Other", onClick: () => {} }} />);
    expect(h).toMatch(/<header class="ph ph--full ph--panel hpanel"[^>]*data-hpanel=""/);
    expect(h).not.toContain("data-header-sheet");
    expect(h).not.toContain("hsheet-host");
    expect(h).toContain('class="ph-primary hpanel-b1"');
    expect(h).toContain('class="ph-secondary hpanel-b2"');
  });
  it("without the prop: the header sheet, its host class, and no panel", () => {
    const h = r(<PageHeader title="T" primary={{ label: "Go", onClick: () => {} }} />);
    expect(h).toContain("data-header-sheet");
    expect(h).toContain("hsheet-host");
    expect(h).not.toContain("hpanel");
  });
  it("⚠️ the empty state is NOT a panel, whatever the prop says", () => {
    const empty = r(<PageHeader panel title="T" living={living(0)} />);
    expect(empty).toContain('data-living="empty"');
    expect(empty).not.toContain("hpanel");
    expect(empty).toContain("data-header-sheet");
    for (const n of [null, 3]) {
      const h = r(<PageHeader panel title="T" living={living(n)} />);
      expect(h, `count ${n}`).toContain('data-hpanel=""');
      expect(h, `count ${n}`).not.toContain("data-header-sheet");
    }
  });
  it("the band as a panel is the shared panel header, as a title page (header v3), and takes no sheet", () => {
    const h = r(<PageHeader panel band bandFixed title="T" description="d" art={<span />} />);
    expect(h).toMatch(/<header class="ph ph--full ph--panel hp3--band hpanel hpanel--hero hp3 hp3--title"[^>]*data-hp3="title"/);
    expect(h).toContain('data-band=""');
    expect(h).toMatch(/<h1 class="hp3-title" data-probe="title" data-page-title="">T<\/h1>/);
    expect(h).toContain('data-hp3-part="art"');
    expect(h).not.toContain('data-hp3-part="number"');
    expect(h).not.toContain("data-header-sheet");
    /* and the band WITHOUT the prop (the Query Centre's empty state) is exactly the band */
    expect(r(<PageHeader band card title="T" />)).not.toContain("hpanel");
  });
  it("header v3: a living panel leads with its count, the words beside it and the sentence outside the h1", () => {
    const h = r(<PageHeader panel title="T" living={living(3)} primary={{ label: "Go", onClick: () => {} }} />);
    expect(h).toContain('data-hp3="number"');
    expect(h).toMatch(/<h1 class="hp3-h1"[^>]*aria-label="3 things">/);
    expect(h).toMatch(/data-hp3-part="number">3<\/span>/);
    expect(h).toMatch(/data-hp3-part="words">things<\/span>/);
    const h1 = h.slice(h.indexOf("<h1"), h.indexOf("</h1>"));
    expect(h1).not.toContain('data-hp3-part="sub"');
    expect(h).toContain('data-hp3-part="sub"');
    expect(h).toContain('class="hp3-btn hpanel-b1"');
  });
  it("header v3: while the count is unsettled the number is a blank of its own box, with no name", () => {
    const h = r(<PageHeader panel title="T" living={living(null)} />);
    expect(h).toContain('class="hp3-n hp3-blank"');
    expect(h).not.toContain("aria-label=");
    expect(h).toContain('data-loading=""');
  });
  it("header v3: the workspace masthead as a panel is a title page; without the prop it is the masthead it was", () => {
    const h = r(<PageHeader variant="workspace" panel title="Calendar" description="d" />);
    expect(h).toMatch(/<header class="ph ph--compact ph--panel hpanel hpanel--hero hp3 hp3--title hp3--noart"/);
    expect(h).toContain('data-size="compact"');
    expect(r(<PageHeader variant="workspace" title="Calendar" />)).not.toContain("hp3");
  });
  it("⚠️ header v3 reaches no header without the prop, no empty state, and no full panel that has nothing to count", () => {
    expect(r(<PageHeader title="T" />)).not.toContain("hp3");
    expect(r(<PageHeader panel title="T" living={living(0)} />)).not.toContain("hp3");
    expect(r(<PageHeader band card title="T" />)).not.toContain("hp3");
    expect(r(<PageHeader panel title="T" description="d" />)).not.toContain("hp3");
  });
});
