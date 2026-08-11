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
/* ⚠️ ALL blocks for a selector, joined — a selector is legitimately declared more than once in
   this sheet, and taking the first match tests half the rule. */
const rule = (sel: string) => {
  const out: string[] = [];
  for (let i = cssRules.indexOf(sel + " {"); i > -1; i = cssRules.indexOf(sel + " {", i + 1)) {
    out.push(cssRules.slice(i, cssRules.indexOf("}", i)));
  }
  expect(out.length, `${sel} must exist`).toBeGreaterThan(0);
  return out.join("\n");
};

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

describe("the pink band (app-shell-v2)", () => {
  /* ⚠️ PINK IS THE RULE, NOT THE PREFERENCE: sage heads a dashboard container, PINK marks the
     surface asking something of you — and this is the one that does. Swapping them would make
     the to-do card read like any other panel. */
  it("⚠️ the tasks header is a PINK gradient band with its hairline", () => {
    const h = rule(".os-th2");
    expect(h).toContain("linear-gradient(180deg, #f5e3d8, #f2ddd2)");
    expect(h).toContain("border-bottom: 1px solid #ebd2c4");
    expect(rule(".os-th2 h2")).toContain("color: #3a241a");
  });

  /* the band is edge-to-edge, so the card has to clip or it overhangs the radius */
  it("the card clips its band", () => {
    expect(rule(".os-tasks")).toContain("overflow: hidden");
  });

  /* ⚠️ RETARGETED (polish P7), not deleted. This pinned three WHITE pills — the state where the
     trio read as three separate objects, told apart only by their text colour. They now share one
     faint pastille-blue fill and the DOT carries the kind, which is the job it always had. The
     dots' own hues are unchanged, and that half of the lock stands. */
  it("the trio's pills share ONE pastille fill, and the dots still carry the kind", () => {
    /* ⚠️ TOKENS NOW (fixes-2 A5) — the same pastille is wanted on other pages' header pills, and
       four loose hexes repeated per surface is how three pages end up NEARLY matching. */
    /* ⚠️ RETARGETED (P5): the trio went WHITE. The tint was doing the dot's job — two devices for
       one distinction — so colour lives in the dot and the pill is a white chip. The pastille
       tokens survive for the HEADER pills, where nothing else carries the sorting. */
    expect(rule(".os-p")).toContain("background: #ffffff");
    expect(rule(".os-p")).toContain("border: 1px solid rgba(58, 28, 20, 0.08)");
    /* ⚠️ THE PER-KIND FILL RULES ARE GONE ENTIRELY — asserted as ABSENT, not asserted through a
       helper that requires them to exist. One fill, declared once; a `.os-p.u { background }`
       reappearing is the trio splintering back into three objects. */
    for (const k of [".os-p.u {", ".os-p.h {", ".os-p.m {"]) {
      expect(cssRules, `${k} must not re-declare a fill`).not.toContain(k);
    }
    expect(rule(".os-p.u .os-pdot")).toContain("background: #7c3a2a");
    expect(rule(".os-p.h .os-pdot")).toContain("background: #8a9e88");
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

/**
 * ⚠️ THE PASTILLE BELONGS TO THE HEADER PILLS, AND IT WAS PUT ON THE WRONG ONES (fixes-2 A5).
 *
 * `.os-p` is the tasks TRIO; `.os-pill` is the greeting's header pill. Similar names, different
 * objects — the previous pass coloured the trio while the copy change landed on the header, so
 * half of one instruction went to each. This pins the pastille to BOTH by token, so the next
 * change to it cannot reach one and miss the other.
 */
describe("the pastille is tokenised and reaches the header pills", () => {
  const css = readFileSync(resolve(__dirname, "./oneScreen.css"), "utf8");
  const bare = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const blk = (sel: string) => {
    const i = bare.indexOf(`${sel} {`);
    expect(i, `${sel} must exist`).toBeGreaterThan(-1);
    return bare.slice(i, bare.indexOf("}", i));
  };

  it("the four values are declared once, as tokens", () => {
    for (const t of ["--os-pastille-bg: #f4f7fa", "--os-pastille-line: #dde6ee",
      "--os-pastille-ink: #4a5a6b", "--os-pastille-fig: #2c3f52"]) {
      expect(bare).toContain(t);
    }
  });

  it("⚠️ the HEADER pill wears it — the pill the instruction was actually about", () => {
    const p = blk(".os-pill");
    expect(p).toContain("var(--os-pastille-bg)");
    expect(p).toContain("var(--os-pastille-line)");
    expect(p).toContain("var(--os-pastille-ink)");
    expect(blk(".os-pill b")).toContain("var(--os-pastille-fig)");
  });

  it("neither pill restates a raw hex — a literal here is the drift starting again", () => {
    /* ⚠️ ONLY THE HEADER PILL NOW — the trio is white, so it must NOT read the pastille. */
    expect(blk(".os-pill"), ".os-pill must read the token").not.toMatch(/#f4f7fa|#dde6ee|#4a5a6b/);
    expect(blk(".os-p"), ".os-p is white and must not wear the pastille").not.toMatch(/pastille/);
  });
});
