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
    /* ⚠️ THE TITLE IS DERIVED SINCE §5 — "No reply" past the stated window, "Waiting to hear back"
       otherwise — so it is no longer a literal attribute to match. What this clause is for is that
       the wait is an EVENT rather than a trailing box, which the projection tag says. */
    expect(tl, "waiting is not an event").toMatch(/<TlProjection[\s\S]{0,300}title=\{past \? "No reply" : "Waiting to hear back"\}/);
    /* ⚠️ THE SCHEDULED NUDGE IS A GHOST RUNG NOW (§6b), NOT A PROJECTION — and the reason is where
       it reads its date FROM. It drew off `query.nudgeDate`, a second record of a reminder whose
       real home is the to-do list, so a completed task left a phantom future on the timeline. The
       rung is the TASK: it goes when the task does. */
    expect(tl, "the reminder is not a rung").toContain("tl-ev--ghost");
    expect(tl, "the reminder still draws from the query's own field").not.toContain('title="Nudge"');
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
  /**
   * ⚠️ INVERTED BY §5 — THE THREE DERIVED BAR STATES ARE ONE. `trackingBar`'s geometry existed to
   * draw an overdue hatch zone beside an expected marker, and a grace bar running to a scheduled
   * follow-up, on top of the within-window fill. §5's claim is ONE shape across three SITUATIONS,
   * and those situations are about the window, not about the app's escalation ladder: inside it,
   * past it, or never stated. A bar with a marker, a hatch zone and a grace tick is three shapes.
   *
   * ⚠️ NOTHING IS LOST WITH THE GRACE STATE. The scheduled follow-up has its own projection event
   * below the wait, and the nudge history line lists every nudge with its date.
   *
   * ⚠️ AND `trackingBar` / `deriveEscalation` ARE NOT DELETED — pure, locked, and now without a
   * caller in this file. Reported rather than removed, which is a separate decision from this one.
   */
  it("the bar is one derivation now, and the escalation ladder has left the pane", () => {
    for (const t of ["trackingBar(", "geo.overdueZone", "geo.markerPct", "geo.graceTickPct", "deriveEscalation("]) {
      expect(tl, `the escalation ladder is back: ${t}`).not.toContain(t);
    }
    /* the one bar: a fill to the elapsed proportion, and a spent hatch once the window has passed */
    expect(tl, "the wait lost its bar").toContain('className={`tl-wbar${past ? " tl-wbar--past" : ""}`}');
    expect(tl, "the bar is not gated on a real window").toContain("const dated = stated && waiting.sentMs != null && waiting.expMs != null;");
  });

  /* ⚠️ AND THE NUDGE EVENT ONLY RENDERS WHEN ONE IS SCHEDULED. The ref draws it unconditionally;
     there is no date to put on it unless `nudgeDate` is set and still ahead, and an undated future
     event is chrome pretending to be a fact. */
  /**
   * ⚠️ THE GATE MOVED INTO THE PREDICATE (§6b), AND IT GAINED A CLAUSE. It was "a `nudgeDate` set
   * and still ahead"; it is now `!done && queryId === id && dueDate > today` — three clauses, each
   * load-bearing. A done task is history, a task scoped elsewhere is not this query's, and a task
   * dated today or earlier is on the writer's list NOW rather than a future to draw as a ghost.
   */
  it("the reminder rung is gated on a real, undone, future task", () => {
    const lib = read("../lib/nudgeState.ts");
    expect(lib, "the reminder predicate is missing").toContain("!t.done && t.queryId === queryId && !!t.dueDate && t.dueDate > todayISO");
    expect(tl, "the rung renders without a reminder").toContain('ballHolder === "agent" && waiting && reminder && (');
    /* ⚠️ AND IT READS THE STORED STORE, NOT THE DERIVED FEED — a ghost drawn from a suggestion would
       show a future nobody scheduled. */
    const page = read("../components/Queries.tsx");
    expect(page, "the rung reads the derived task feed").toContain("scheduledReminder(userTasks as never, activeQuery.id, todayISO)");
  });

  /**
   * ⚠️ THE FRAMES GO WITH THE LADDER (§5), AND THE REASONING THEY CARRIED IS WHY. The clause was
   * that an escalated state keeps a frame because there it is an ESCALATION rather than a
   * container. §5 removes the escalation: past a window is a FACT about the window, and the state
   * is carried by the title, the marker's ring and a spent bar rather than by a box round it.
   *
   * What survives, and is what the earlier clause was really protecting, is that no alarm colour
   * appears anywhere in the wait — a pink card or a red fill would say the agency had failed an
   * obligation they never made.
   */
  it("no state in the wait wears an alarm colour", () => {
    const at = tl.indexOf('ballHolder === "agent" && waiting');
    expect(at, "the waiting branch is missing").toBeGreaterThan(-1);
    const branch = tl.slice(at, tl.indexOf('title="Nudge"', at));
    expect(branch, "the boxes came back").not.toContain('className="tl-noreply"');
    expect(branch, "the grace card came back").not.toContain("1px dashed var(--sage");
    for (const alarm of ["--pink-t", "--pink-i", "--pink-b", "red"]) {
      expect(branch, `the wait wears ${alarm}`).not.toContain(alarm);
    }
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
