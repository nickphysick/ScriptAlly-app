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
  it("the band as a panel keeps the band's classes and takes no sheet", () => {
    const h = r(<PageHeader panel band bandFixed title="T" art={<span />} />);
    expect(h).toMatch(/class="ph ph--full ph--panel hpanel ph--band ph--bandfix"/);
    expect(h).toContain('data-probe="band-disc"');
    expect(h).not.toContain("data-header-sheet");
    /* and the band WITHOUT the prop (the Query Centre's empty state) is exactly the band */
    expect(r(<PageHeader band card title="T" />)).not.toContain("hpanel");
  });
});
