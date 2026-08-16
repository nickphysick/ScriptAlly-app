/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BrandDatePicker · the hub extension (ref design-refs/qdb-create-polish.html §1).
 *
 * The picker was EXTENDED, not replaced: the date arithmetic — especially the local-ISO parse that
 * avoids the UTC off-by-one — is the part that can silently be wrong, and it was already solved.
 * So these locks care about two things: that the new capability works (min/max, chips, keyboard),
 * and that NONE of it reaches the twenty Form 11 call sites that didn't ask for it.
 */
import { describe, it, expect } from "vitest";
import { sliceBetween } from "../test/sliceBetween";
import { readFileSync } from "fs";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { BrandDatePicker } from "../components/forms/BrandDatePicker";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const css = read("../components/forms/forms.css");
const pane = read("../components/queries/QueryCreatePane.tsx");

/** The popover markup renders even while closed (CSS hides it), so a static render can see it. */
const render = (props: Partial<React.ComponentProps<typeof BrandDatePicker>> = {}) =>
  renderToStaticMarkup(<BrandDatePicker value="2026-07-15" onChange={() => {}} {...props} />);

describe("min / max — the rule the native input used to enforce", () => {
  it("days after `max` are marked inert", () => {
    const html = render({ value: "2026-07-15", max: "2026-07-15" });
    expect(html, "no day was marked out of range").toContain("sa-dp-day off");
    expect(html).toContain('aria-disabled="true"');
  });

  it("with no min/max, nothing is inert — the twenty existing call sites are unconstrained", () => {
    expect(render(), "an unconstrained picker started disabling days").not.toContain("sa-dp-day off");
    expect(render()).not.toContain('aria-disabled="true"');
  });

  it("the boundary day itself stays selectable (inclusive, both ends)", () => {
    // 15 July is both the min and the selected day: it must not be disabled by its own bound.
    const html = render({ value: "2026-07-15", min: "2026-07-15" });
    const cell = html.slice(html.indexOf('aria-label="15 July 2026"'));
    expect(cell.slice(0, cell.indexOf(">")), "the boundary day was excluded by its own bound").not.toContain("off");
  });
});

describe("the grid is reachable by keyboard", () => {
  it("exactly one cell is tabbable — a roving tabindex, not thirty tab stops", () => {
    const html = render();
    expect(html.match(/tabindex="0"/g)?.length ?? 0, "expected the trigger + one cursor cell").toBe(2);
    expect(html).toContain('data-dp-cursor="true"');
  });

  it("cells are announced as grid cells with their full date", () => {
    const html = render();
    expect(html).toContain('role="grid"');
    expect(html).toContain('role="gridcell"');
    expect(html).toContain('aria-label="15 July 2026"');
  });
});

describe("chips and footer are HUB-ONLY", () => {
  it("the hub variant offers Today · Yesterday · Last Monday, and Clear / Done", () => {
    const html = render({ variant: "hub" });
    for (const s of ["Today", "Yesterday", "Last Monday", "Clear", "Done"]) {
      expect(html, `the hub picker lost "${s}"`).toContain(s);
    }
    expect(html).toContain("sa-dp--hub");
  });

  it("the form variant grows NOTHING — that is the whole promise to the other call sites", () => {
    const html = render();
    expect(html, "chips leaked into Form 11").not.toContain("sa-dp-quick");
    expect(html, "the footer leaked into Form 11").not.toContain("sa-dp-foot");
    expect(html).not.toContain("sa-dp--hub");
  });

  it("a chip outside the range is disabled rather than silently doing nothing", () => {
    // max in the past ⇒ Today/Yesterday/Last Monday are all unreachable
    const html = render({ value: "2020-01-01", max: "2020-01-01", variant: "hub" });
    expect(html.match(/sa-dp-chip" disabled/g)?.length ?? 0).toBe(3);
  });
});

describe("the hub skin cannot reach the Form 11 call sites", () => {
  it("every new rule is scoped to .sa-dp--hub", () => {
    // Bound the slice at BOTH ends — an open-ended slice runs into the next section and starts
    // reporting unrelated rules (it flagged .sa-btn-row on the first run).
    const from = css.indexOf("/* The hub trigger IS the hub's field idiom");
    const to = css.indexOf("/* ── Centred soft-pink button", from);
    expect(from, "the hub CSS section is missing").toBeGreaterThan(-1);
    expect(to, "the section's end marker moved — this slice would overrun").toBeGreaterThan(from);
    const hubBlock = css.slice(from, to);
    for (const line of hubBlock.split("\n")) {
      const sel = line.match(/^(\.[a-z][^{]*)\{/)?.[1];
      if (!sel) continue;
      expect(sel, `an unscoped rule would restyle all 20 call sites: ${sel.trim()}`).toContain(".sa-dp--hub");
    }
  });

  it("the shared day rule keeps its Form 11 look — only new STATES were added", () => {
    // .off can't occur without min/max, and :focus-visible only shows on keyboard focus.
    expect(css).toContain(".sa-dp-day.off {");
    expect(css).toContain(".sa-dp-day:focus-visible {");
    const shared = css.slice(css.indexOf("\n.sa-dp-day {"), css.indexOf("}", css.indexOf("\n.sa-dp-day {")));
    expect(shared).toContain("aspect-ratio: 1");
    expect(shared).toContain("border-radius: 7px");
  });
});

describe("create mode uses it for BOTH dates, with the constraints intact", () => {
  it("no native date input survives in create mode", () => {
    expect(pane, "a native date input came back").not.toContain('type="date"');
    expect(pane.match(/<BrandDatePicker/g)?.length ?? 0).toBe(2);
  });

  it("Date sent still can't be in the future, and the nudge still can't reach back past the send", () => {
    expect(pane).toContain("max={todayInputDate()}");
    /* ⚠️ AMENDED: the floor is the sent date PLUS ONE DAY, not the sent date. A reminder to chase
       something you have just this moment sent is not a reminder — and the old bound also let the
       nudge land on the sending day, which reads as "chase this before it arrives". */
    expect(pane).toContain("min={nudgeFloor}");
  });

  it("both wear the hub skin", () => {
    expect(pane.match(/variant="hub"/g)?.length ?? 0).toBe(2);
  });
});


/* ══════════════════════════════════════════════════════════════════════════════════════════
   ⚠️ THE TWO CREATE-MODE PICKERS POINT IN OPPOSITE DIRECTIONS. The nudge field was reusing the
   sent field's configuration and offering "Today · Yesterday · Last Monday" for a date that must
   be in the FUTURE — three shortcuts, none of them selectable, on a control whose whole job is to
   save the writer some counting.
   ══════════════════════════════════════════════════════════════════════════════════════════ */
describe("sent and nudge carry their own bounds and their own shortcuts", () => {
  /* A query cannot have been sent tomorrow. */
  it("the sent picker refuses the future", () => {
    const html = render({ value: "2026-08-10", max: "2026-08-10" });
    expect(html).toContain("sa-dp-day off");
    expect(html).toContain('aria-disabled="true"');
    expect(pane, "the sent field's ceiling is today").toContain("max={todayInputDate()}");
  });

  /* ⚠️ AND THE NUDGE FLOOR IS THE SENT DATE PLUS ONE DAY, not the sent date. A reminder to chase
     something you have just this moment sent is not a reminder. */
  it("the nudge picker refuses the sending day itself and everything before it", () => {
    expect(pane).toContain("const nudgeFloor = draft.dateSent ? isoPlusDays(draft.dateSent, 1) : todayInputDate();");
    expect(pane).toContain("min={nudgeFloor}");
    const html = render({ value: "", min: "2026-08-11" });
    expect(html, "days before the floor must be inert").toContain("sa-dp-day off");
  });

  /* "In eight weeks" on a query posted in June means eight weeks after June, not after today. */
  it("the nudge shortcuts count forward from the SEND, not from today", () => {
    expect(pane).toContain("const base = draft.dateSent || todayInputDate();");
    expect(pane).toContain("label: `In ${w} weeks`");
    expect(pane).toContain("date: new Date(isoPlusDays(base, w * 7)");
    expect(pane, "and they are handed to the picker rather than hardcoded in it")
      .toContain("quickChips={nudgeChips}");
  });

  /* ⚠️ MOVING THE SEND CAN STRAND A NUDGE THE WRITER CHOSE. Keeping it would leave a reminder
     scheduled before the query existed; silently correcting it would move a day they picked on
     purpose without telling them. It falls back to the preset, and the derived line says so. */
  it("moving the sent date past a chosen nudge date clears that choice", () => {
    expect(pane).toContain('draft.reminder.kind === "custom" && d && draft.reminder.date <= d');
    expect(pane).toContain("{ dateSent: d, reminder: initialReminder(agent) }");
  });

  /* The default chips stay exactly as they were for the twenty Form 11 call sites and the sent
     field — an additive prop, not a replacement. */
  it("and the backward-looking chips remain the default", () => {
    const field = read("../components/forms/BrandDatePicker.tsx");
    expect(field).toContain('["Today", today],');
    expect(field).toContain('["Last Monday", lastMonday(today)],');
    expect(field).toContain("{(quickChips");
  });
});
