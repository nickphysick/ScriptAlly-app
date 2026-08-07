/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Locks for the tasks card (spec §5; P4).
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryStatus } from "../../types";
import { kindWord, OneScreenTasks, tasksHeader } from "./OneScreenTasks";

const css = readFileSync(resolve(__dirname, "./oneScreen.css"), "utf8");
const cssRules = css.replace(/\/\*[\s\S]*?\*\//g, "");

describe("§5 · the header ladder", () => {
  it("urgent counts, singular-safe", () => {
    expect(tasksHeader(1, 5)).toBe("1 thing requires your attention");
    expect(tasksHeader(3, 0)).toBe("3 things require your attention");
  });

  it("one housekeeping item gets its own gentler line", () => {
    expect(tasksHeader(0, 1)).toBe("One thing to pick up when you have a moment");
  });

  it("housekeeping only, plural", () => {
    expect(tasksHeader(0, 4)).toBe("Spare some time to work on these");
  });

  it("empty says Nothing needs you", () => {
    expect(tasksHeader(0, 0)).toBe("Nothing needs you");
  });
});

describe("§5 · the kind pill", () => {
  it("Offer is sage; other urgent kinds are Pages; housekeeping is Tidy", () => {
    expect(kindWord("offer_received")).toEqual({ word: "Offer", sage: true });
    expect(kindWord("full_requested")).toEqual({ word: "Pages", sage: false });
    expect(kindWord("partial_requested")).toEqual({ word: "Pages", sage: false });
    expect(kindWord(null)).toEqual({ word: "Tidy", sage: true });
  });
});

describe("the rendered rows", () => {
  const NOW_TASKS: any[] = [
    { id: "t1", taskType: "full_requested", relatedRecordId: "q1", manuscriptTitle: "Murphy's Day Out" },
    { id: "t2", taskType: "offer_received", relatedRecordId: "q2" },
  ];
  const queries: any[] = [
    { id: "q1", agentId: "a1", status: QueryStatus.FULL_REQUESTED },
    { id: "q2", agentId: "a2", status: QueryStatus.OFFER },
  ];
  const agents: any[] = [
    { id: "a1", name: "Jonathan Marsh", agency: "The Marsh Agency" },
    { id: "a2", name: "Tom Ellery", agency: "Curtis Vane" },
  ];

  const html = renderToStaticMarkup(
    <OneScreenTasks loading={false} tasks={NOW_TASKS} queries={queries} agents={agents}
      onAction={() => {}} onSeeAll={() => {}} />,
  );

  it("rows come from the LIVE builders, with their action labels", () => {
    expect(html).toContain("Jonathan Marsh");
    expect(html).toContain("Tom Ellery");
    expect(html).toContain("full manuscript"); // the builder's own description
  });

  it("both endcell occupants render — the pill AND the action, same cell", () => {
    expect(html).toContain("os-stp u");
    expect(html).toContain("os-act");
    expect(html).toContain("os-btn-mini");
  });

  it("rows are keyboard targets and the ⋯ has an accessible name and a real destination", () => {
    expect(html).toContain('tabindex="0"');
    expect(html).toContain('aria-label="Open on the To-do board"');
  });

  it("the header counts the urgent rows", () => {
    expect(html).toContain("2 things require your attention");
  });
});

describe("§5 · the stylesheet", () => {
  it("the fixed grid: 56px | text | 104px | 18px, tightening at 1200", () => {
    expect(cssRules).toContain("grid-template-columns: 56px minmax(0, 1fr) 104px 18px");
    expect(cssRules).toContain("grid-template-columns: 52px minmax(0, 1fr) 96px 16px");
  });

  it("⚠️ the crossfade is ABSOLUTE-in-one-cell — no reflow on hover", () => {
    const stp = cssRules.slice(cssRules.indexOf(".os-stp {"), cssRules.indexOf(".os-stp.u"));
    expect(stp).toContain("position: absolute");
    const act = cssRules.slice(cssRules.indexOf(".os-act {"), cssRules.indexOf(".os-trow:hover .os-stp"));
    expect(act).toContain("position: absolute");
    expect(cssRules).toContain(".os-trow:hover .os-stp, .os-trow:focus-within .os-stp { opacity: 0; }");
  });

  it("kind pills are a fixed 20px with centred text", () => {
    const knd = cssRules.slice(cssRules.indexOf(".os-knd {"), cssRules.indexOf(".os-knd.sg"));
    expect(knd).toContain("height: 20px");
    expect(knd).toContain("justify-content: center");
  });

  it("touch shows the action outright — no hover to find it with", () => {
    const touch = cssRules.slice(cssRules.indexOf("@media (hover: none)"));
    expect(touch).toContain(".os-trow .os-act { opacity: 1;");
    expect(touch).toContain(".os-trow .os-dots { opacity: 1; }");
  });

  it("≤640px stacks to one column with the ⋯ hidden", () => {
    const m = cssRules.slice(cssRules.lastIndexOf("@media (max-width: 640px)"));
    expect(m).toContain("grid-template-columns: 1fr");
    expect(m).toContain(".os-trow .os-dots { display: none; }");
  });
});
