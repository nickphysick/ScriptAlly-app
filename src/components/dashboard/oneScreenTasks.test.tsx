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
import { kindWord, OneScreenTasks, taskTrio, yourTasksToday } from "./OneScreenTasks";

const css = readFileSync(resolve(__dirname, "./oneScreen.css"), "utf8");
const cssRules = css.replace(/\/\*[\s\S]*?\*\//g, "");

/* ⚠️ THE HEADER SENTENCE IS RETIRED (v16 §4) — the title states the job, the pills state the
   split. The sentence had to lead on one number and said nothing about the rest. */
describe("§4 · the count trio", () => {
  it("three pills, in order, each naming its own kind", () => {
    expect(taskTrio(3, 2, 2)).toEqual([
      { key: "urgent", label: "urgent", n: 3 },
      { key: "house", label: "housekeeping", n: 2 },
      { key: "mine", label: "yours", n: 2 },
    ]);
  });

  it("⚠️ a kind with nothing in it DROPS OUT — never a pill reading zero", () => {
    expect(taskTrio(3, 0, 0).map((p) => p.key)).toEqual(["urgent"]);
    expect(taskTrio(0, 4, 0).map((p) => p.key)).toEqual(["house"]);
    expect(taskTrio(0, 0, 1).map((p) => p.key)).toEqual(["mine"]);
    expect(taskTrio(0, 0, 0)).toEqual([]);
  });
});

describe("§4 · what counts as YOURS", () => {
  const NOW = new Date(2026, 7, 7, 10, 0, 0); // Fri 7 Aug 2026
  const ut = (o: Record<string, unknown>) => ({ id: String(Math.random()), userId: "u", text: "x", done: false, createdAt: "", updatedAt: "", ...o }) as any;

  /* ⚠️ it reuses the ONE surfacing law (taskSurfaced), never a second rule written on the
     dashboard — otherwise the card and the board could disagree about the same task. */
  it("dated, open and surfaced — overdue and due-today both count", () => {
    const rows = yourTasksToday([
      ut({ id: "od", dueDate: "2026-08-01" }),
      ut({ id: "today", dueDate: "2026-08-07" }),
      ut({ id: "soon", dueDate: "2026-08-08", surfaceOffset: "day-before" }),
    ], NOW);
    expect(rows.map((r) => r.id).sort()).toEqual(["od", "soon", "today"]);
  });

  it("a task not yet in its window is NOT counted — the pill matches the list", () => {
    expect(yourTasksToday([ut({ dueDate: "2026-09-20" })], NOW)).toEqual([]);
  });

  it("done tasks and DATELESS notes never surface here", () => {
    expect(yourTasksToday([
      ut({ dueDate: "2026-08-01", done: true }),
      ut({ text: "a plain note" }),           // no dueDate → a note, not a task
    ], NOW)).toEqual([]);
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
      userTasks={[{ id: "u1", userId: "u", text: "Redraft the opening paragraph", done: false,
        createdAt: "", updatedAt: "", dueDate: "2026-08-07" } as any]}
      now={new Date(2026, 7, 7, 10, 0, 0)}
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

  it("the title states the job and the pills state the split", () => {
    expect(html).toContain("Tasks requiring your attention");
    expect(html).toContain("os-p u");
    expect(html).toContain("os-p m");
    expect(html).not.toContain("things require your attention");
  });

  /* ⚠️ THE PILLS COUNT EXACTLY THE ROWS BENEATH THEM — a pill for a kind this card does not
     render would never add up to the visible list. */
  it("⚠️ every counted kind is also a rendered row", () => {
    expect(html).toContain("Redraft the opening paragraph"); // the "yours" row itself
    expect(html).toContain("os-stp t");
    const pills = (html.match(/class="os-p /g) ?? []).length;
    expect(pills).toBe(2);                                    // urgent + yours; no housekeeping
    const rows = (html.match(/class="os-trow"/g) ?? []).length;
    expect(rows).toBe(3);                                     // 2 urgent + 1 yours
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
