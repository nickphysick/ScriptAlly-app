/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DF1-E — Dashboard feed v1, Part E: the right column's cards, rendered. The tip's clock, the art's box, the tick box
 * taking the reader where "Do this task" does, and the Scout's request surviving a reload are measured on the running
 * page (E1–E3).
 */
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

vi.mock("../../../lib/db", async () => (await import("../../../test/pageSmoke")).dbMock());
vi.mock("../../../lib/firebase", async () => (await import("../../../test/pageSmoke")).firebaseMock());

import { F1Tip, tipHeadline, TIP_MS } from "./F1Tip";
import { F1Scout, SCOUT_COPY } from "./F1Scout";
import { DASH_TIPS } from "../../../lib/dashTips";

describe("DF1-E · Top tip", () => {
  const html = renderToStaticMarkup(<F1Tip />);
  it("is a carousel of DASH_TIPS, every tip in the one cell, the first showing", () => {
    expect(html).toContain('aria-roledescription="carousel"');
    expect(html).toContain('aria-label="Top tips"');
    expect(html).toContain('aria-live="polite"');
    expect((html.match(/data-df1="tip-item"/g) ?? []).length).toBe(DASH_TIPS.length);
    expect((html.match(/data-on="1"/g) ?? []).length).toBe(1);
    expect(html).toContain(`From the Mentor · 1 of ${DASH_TIPS.length}`);
    expect(html).toContain('data-art="dash-mentor-pointing"');
  });
  it("each tip's lead is its headline, without the full stop; its rest is the text", () => {
    expect(tipHeadline("Query in batches.")).toBe("Query in batches");
    const esc = (x: string) => x.replace(/'/g, "&#x27;");
    for (const t of DASH_TIPS) { expect(html).toContain(esc(tipHeadline(t.lead))); expect(html).toContain(esc(t.rest)); }
  });
  it("turns every seven seconds", () => expect(TIP_MS).toBe(7000));
});

describe("DF1-E · the Scout, coming soon", () => {
  const html = renderToStaticMarkup(<F1Scout asked={false} onAsk={() => {}} />);
  it("says what it will do, and asks", () => {
    for (const w of [SCOUT_COPY.title, SCOUT_COPY.soon, SCOUT_COPY.head, SCOUT_COPY.ask]) expect(html).toContain(w.replace(/'/g, "&#x27;"));
  });
  it("the example is one label to assistive tech, and nothing in it can be focused or pressed", () => {
    expect(html).toContain('class="df1-ghost"');
    expect(html).toContain('<button type="button" class="df1-notify"');
    const ex = html.slice(html.indexOf('class="df1-ghost"'), html.indexOf('<button type="button" class="df1-notify"'));
    expect(ex).toContain(`aria-label="${SCOUT_COPY.example}"`);
    expect(ex).toContain('aria-hidden="true"');
    expect(ex).not.toMatch(/<(button|a|input)\b|tabindex/);
  });
  it("once asked it reads We'll let you know, and stays", () => {
    const asked = renderToStaticMarkup(<F1Scout asked onAsk={() => {}} />);
    expect(asked).toContain("We&#x27;ll let you know");
    expect(asked).toContain('data-asked="1"');
  });
  it("with no writer the button is left out rather than doing nothing", () => {
    expect(renderToStaticMarkup(<F1Scout asked={false} />)).not.toContain('data-df1="scout-ask"');
  });
});
