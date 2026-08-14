/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Fix pack 4 §3 — waiting is a stage on the timeline, and To-do does not notice.
 *
 * ⚠️ THE RISK THIS FILE EXISTS FOR IS THE SECOND CLAUSE. `QueryTimeline` and the To-do sheet share
 * this module, which is why the move was left alone once already. They share it at a SEAM, though,
 * not wholesale: To-do imports `TimelineRows` and `buildTimelineRows` — the past — while the
 * projected events live in `QueryTimeline`, which To-do never renders. So the waiting stage could
 * move onto the timeline without reaching To-do at all, and these cases hold that seam in place.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const strip = (s: string) => s.replace(/\{?\/\*[\s\S]*?\*\/\}?/g, "").replace(/^\s*\/\/.*$/gm, "");
const tl = strip(read("../components/reading-pane/QueryTimeline.tsx"));
const focus = strip(read("../components/todo/FocusFlow.tsx"));

describe("§3 · waiting and the nudge are timeline events", () => {
  /**
   * ⚠️ THE EVENT SHELL IS ONE COMPONENT, NOT TWO HAND-BUILT ROWS. A projection that drew its own
   * grid would sit a pixel or two off the real markers and the timeline would visibly bend where
   * the future begins.
   */
  it("both render through the projection event, with the not-yet marker", () => {
    expect(tl, "the projection event is gone").toContain("const TlProjection");
    expect(tl, "the projection marker stopped being the drained ghost").toMatch(
      /<StatusDot[^>]*ghost/,
    );
    expect(tl, "waiting is not an event").toMatch(/<TlProjection[\s\S]{0,200}title="Waiting to hear back"/);
    expect(tl, "the nudge is not an event").toMatch(/<TlProjection[^>]*title="Nudge"/);
    /* ⚠️ SLICED TO THE WAITING BRANCH. A document-wide search for the old wrapper catches the
       writer's-turn block, which still trails as a box and which this section deliberately did not
       touch — so the unsliced assertion failed on code it was never about. */
    const at = tl.indexOf('ballHolder === "agent" && waiting');
    expect(at, "the waiting branch is missing").toBeGreaterThan(-1);
    const branch = tl.slice(at, tl.indexOf('title="Nudge"', at));
    expect(branch, "the waiting branch never reaches the projection").toContain("<TlProjection");
    expect(branch, "the waiting block went back to being a trailing box")
      .not.toMatch(/marginLeft: 4, marginTop: 16/);
  });

  /**
   * ⚠️ THE BAR MOVED; IT WAS NOT REBUILT, AND THE REF'S SIMPLER FILL WAS NOT ADOPTED. All three
   * derived states have to survive the move: the within-window geometry, the overdue hatch beyond
   * the expected marker, and grace measured against the nudge horizon. Replacing them with a plain
   * percentage would look like the mockup and throw away every derivation behind it.
   */
  it("the bar keeps its three derived states inside the event", () => {
    for (const t of ["trackingBar(", "geo.overdueZone", "geo.markerPct", "geo.graceTickPct"]) {
      expect(tl, `the bar lost ${t} — it was rebuilt rather than moved`).toContain(t);
    }
  });

  /* ⚠️ AND THE NUDGE EVENT ONLY RENDERS WHEN ONE IS SCHEDULED. The ref draws it unconditionally;
     there is no date to put on it unless `nudgeDate` is set and still ahead, and an undated future
     event is chrome pretending to be a fact. */
  it("the nudge event is gated on a real future date", () => {
    expect(tl, "the nudge event lost its gate").toMatch(
      /reminderMs == null \|\| reminderMs <= Date\.now\(\)/,
    );
  });

  /* ⚠️ ONLY THE WITHIN-WINDOW STATE GIVES UP ITS BOX — that box is what this section removes.
     Overdue and grace keep theirs because there the frame is an ESCALATION rather than a container. */
  it("the escalation treatments keep their frames", () => {
    expect(tl, "the overdue card lost its pink frame").toContain('background: "var(--pink-t)"');
    expect(tl, "the grace card lost its dashed sage frame").toContain('border: "1px dashed var(--sage');
  });
});

describe("§3 · To-do's rendering is unchanged", () => {
  /**
   * ⚠️ THE SEAM, ASSERTED FROM BOTH SIDES. To-do must import only the past-events pair, and must
   * not reach `QueryTimeline` itself — the moment it did, every projected event would arrive in the
   * sheet and this section would have changed a surface it never looked at.
   */
  it("To-do renders the shared rows and never the full timeline", () => {
    expect(focus, "To-do stopped using the shared rows").toContain(
      'import { TimelineRows, buildTimelineRows } from "../reading-pane/QueryTimeline"',
    );
    expect(focus, "To-do now renders the whole timeline, projections and all")
      .not.toMatch(/<QueryTimeline/);
  });

  /**
   * ⚠️ THE CONNECTOR FLAG IS OPT-IN, WHICH IS THE ONLY REASON THIS MOVE WAS SAFE. The last real row
   * has to grow a connector into the waiting event, or the timeline stops and starts again. Making
   * that the row's own behaviour would have put a line running off the end of To-do's condensed
   * history into nothing. It is a defaulted prop the caller asks for, and To-do does not ask.
   */
  it("the connector flag defaults off, and To-do does not pass it", () => {
    expect(tl, "the flag stopped being defaulted").toMatch(/continues\s*=\s*false/);
    expect(tl, "the last row's terminal behaviour is no longer conditional")
      .toMatch(/rows\.length - 1 && !continues/);
    const use = focus.slice(focus.indexOf("<TimelineRows"), focus.indexOf("<TimelineRows") + 120);
    expect(use, "To-do's TimelineRows call is missing").toContain("<TimelineRows");
    expect(use, "To-do started opting into the continuing connector").not.toContain("continues");
  });

  /* ⚠️ AND THE ROW OUTPUT ITSELF IS UNTOUCHED. `buildTimelineRows` is the other half of the seam:
     adding the waiting and nudge rows THERE would have been the obvious implementation and would
     have put both straight into To-do's sheet. */
  it("the projected events were not added to the shared row builder", () => {
    const builder = tl.slice(
      tl.indexOf("export function buildTimelineRows"),
      tl.indexOf("export const TimelineRows"),
    );
    expect(builder, "the row builder is missing").toContain("buildTimelineRows");
    for (const t of ["Waiting to hear back", "TlProjection", "trackingBar"]) {
      expect(builder, `${t} leaked into the shared row builder — To-do renders whatever it returns`)
        .not.toContain(t);
    }
  });
});
