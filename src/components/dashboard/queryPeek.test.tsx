/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The query peek — what opens it, and what it says at the end of the story.
 *
 * ⚠️ THE MODEL IS THE SUBJECT, NOT THE MARKUP. `QueryPeekLive` reaches Firebase and cannot be
 * rendered here (`environment: 'node'`, no emulator), and `QueryPeek` itself portals to
 * `document.body`, which does not exist either. What these assert is the two decisions a reader
 * would notice if they were wrong: which rows offer a glance at all, and whether the story ends by
 * telling the writer they owe something.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { stripComments } from "../../test/pageSmoke";

const here = dirname(fileURLToPath(import.meta.url));
const read = (rel: string) => stripComments(readFileSync(resolve(here, rel), "utf8"));

describe("what opens a peek", () => {
  const feed = read("OneScreenFeed.tsx");

  /**
   * ⚠️ THE QUERY ID, NOT THE ACTION. `action` is present only where a send is offered — a handful of
   * rows — so gating on it put the glance on the rows that already had a button and nowhere else.
   * Every entry about a query raises "what is this, where is it up to"; the ones with nothing to
   * press raise it hardest. Measured before the fix: twenty peekable rows became zero.
   */
  it("every entry about a query, and only those", () => {
    expect(feed).toContain("!e.app && !!e.queryId && !!onPeek");
    expect(feed, "gating on the action was the fault").not.toContain("!!e.action && !!onPeek");
  });

  /**
   * ⚠️ AN APP ROW GOES TO THE LIST IT IS ABOUT, NOT TO A QUERY. `app` marks the housekeeping the app
   * did for itself — "closed 2 queries that had gone quiet" — which is about several queries or
   * none. It is the feed's own existing flag and is not re-derived here.
   */
  it("a housekeeping row keeps its own destination", () => {
    expect(read("../../lib/dashFeed.ts")).toContain('app: shape.kind === "housekeeping"');
  });

  /** the row stays visible behind the popover — what was clicked is still there to be seen */
  it("the clicked row is held lit while its peek is open", () => {
    expect(feed).toContain("os-fent--open");
    expect(read("oneScreen.css")).toContain(".os-fent--open");
  });
});

describe("the story's last line", () => {
  const live = read("QueryPeekLive.tsx");

  /**
   * ⚠️ THE TERMINUS IS CONDITIONAL HERE AND UNCONDITIONAL IN THE PANE, AND BOTH ARE RIGHT. The task
   * pane only ever opens on a live task the writer owes something on. This opens on ANY query in the
   * feed, closed ones included — and a rejection ending in a rust "Your turn · Today" tells a writer
   * they owe a reply to an agency that has said no. Measured on a `Rejected` query before the branch
   * existed.
   */
  it("says 'Your turn' only when the ball is with the writer", () => {
    expect(live).toContain('act.ballHolder === "writer" ? withTerminus(rungs) : rungs');
  });

  /** ⚠️ AND NO ACTION PILL ON A FINISHED QUERY — `ballHolder: null` is the CTA engine's own word for
   *  a terminal state, and "Record response" on a rejection invites recording what already happened. */
  it("offers no next action where there is none", () => {
    expect(live).toContain("...(act.ballHolder ? { primary:");
  });

  /**
   * ⚠️ ONE DERIVATION OF THE HISTORY, SHARED WITH THE PANE'S RAIL. Two derivations of one story is
   * how two surfaces come to disagree about what happened to a query — invisibly, because each
   * would be internally consistent.
   */
  it("reads the same timeline the task pane's rail does", () => {
    expect(live).toContain('from "../../lib/dockTimeline"');
    expect(live).toContain('from "../../lib/taskPaneJourney"');
    expect(read("../todo/useTaskPaneSession.tsx")).toContain('from "../../lib/dockTimeline"');
  });

  /** and the AUTHORITATIVE store, not the feed's own best-effort projection twin */
  it("reads the per-query subcollection", () => {
    expect(live).toContain("useDockActivity(uid, query.id)");
  });
});
