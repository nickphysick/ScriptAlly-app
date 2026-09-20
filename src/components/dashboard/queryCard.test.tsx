/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The query card — what opens it, and what it says at the end of the story.
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
import { existsSync } from "node:fs";
import { stripComments } from "../../test/pageSmoke";

const here = dirname(fileURLToPath(import.meta.url));
const read = (rel: string) => stripComments(readFileSync(resolve(here, rel), "utf8"));

describe("what opens a card", () => {
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
  it("the clicked row is held lit while its card is open", () => {
    expect(feed).toContain("os-fent--open");
    expect(read("oneScreen.css")).toContain(".os-fent--open");
  });
});

describe("the story's last line", () => {
  const live = read("QueryCardLive.tsx");

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

  /**
   * ⚠️ THE CARD OFFERS NO ACTION AT ALL, AND THE PEEK'S DID — this is a decision, not a loss. The
   * card is a GLANCE; the act belongs to the row that opened it, which has a tick, a snooze and a
   * dismiss three inches to the left. An ink pill here would be a second place to finish one task,
   * and the two would eventually disagree about what finishing means.
   *
   * `ballHolder` still decides the BAND's court, which is the part a glance needs.
   */
  /**
   * ⚠️ AN OFFER IS NOT CLOSED, AND THE CTA ENGINE CANNOT SAY SO. `ballHolder` is `null` for OFFER as
   * well as for the three terminal states — it answers "whose move decides the next rung", and an
   * offer's answer is neither party's alone. Read as "Closed" it put a stone CLOSED band over a live
   * offer on the harness account. Both directions, because asserting only the offer would pass on a
   * build where nothing was ever closed.
   */
  it("an offer is live, and only the three terminal states are closed", () => {
    /* the STATUS decides, and `ballHolder` only splits the two live directions beneath it */
    expect(live).toContain("status === QueryStatus.OFFER");
    expect(live).toContain('{ label: "An offer", band: "rose" as const }');
    /* ⚠️ THE CLOSED SET IS NAMED, NOT INFERRED FROM A NULL — so a tenth status lands on the live
       side and is visible, rather than being quietly filed as closed. */
    expect(live).toContain("const CLOSED = [QueryStatus.REJECTED, QueryStatus.WITHDRAWN, QueryStatus.NO_RESPONSE]");
    expect(live).toContain("CLOSED.includes(status)");
  });

  it("states the court and offers no action of its own", () => {
    expect(live).toContain('act.ballHolder === "writer"');
    const card = read("QueryCard.tsx");
    expect(card, "the act belongs to the row, not to the glance").not.toContain("model.primary");
    expect(card).toContain("Open the full query");
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

  /**
   * ⚠️ ONE CARD, MOUNTED ONCE BY THE PAGE (Nick, 20 Sep). The feed's rows and the to-do rows open
   * the SAME component from the SAME mount — two cards three inches apart, same data, different
   * chrome, was the fault this replaces. A second mount would also make "one open at a time" a rule
   * two components had to keep rather than something the structure guarantees.
   */
  it("is mounted once, and both surfaces raise to it", () => {
    const dash = read("OneScreenDashboard.tsx");
    expect((dash.match(/<QueryCardLive/g) ?? []).length, "one mount, not one per surface").toBe(1);
    /* the feed raises through onPeek; the to-do row raises through onQuickRef */
    expect(dash).toContain("onPeek={");
    expect(dash).toContain("onQuickRef={");
    /* and the retired peek is gone, file and reference */
    expect(dash).not.toContain("QueryPeek");
    expect(existsSync(resolve(here, "QueryPeek.tsx")),
      "a replacement that is ADDED leaves the original reachable").toBe(false);
  });

  /** the tabs switch — a tab row that did not would teach the card holds more than it shows */
  it("the three tabs are live", () => {
    const card = read("QueryCard.tsx");
    expect(card).toContain("useState<QueryCardTab>");
    /* ⚠️ THE TABLE, NOT THE RENDERED ATTRIBUTE — the probe is built by interpolation, so a literal
       `qcard-tab-tracking` appears nowhere in the source and a `toContain` on one asserts nothing. */
    expect(card).toContain("data-probe={`qcard-tab-${t.key}`}");
    for (const t of ["tracking", "agent", "materials"]) expect(card).toContain(`"${t}"`);
  });

  /** and the AUTHORITATIVE store, not the feed's own best-effort projection twin */
  it("reads the per-query subcollection", () => {
    expect(live).toContain("useDockActivity(uid, query.id)");
  });
});
