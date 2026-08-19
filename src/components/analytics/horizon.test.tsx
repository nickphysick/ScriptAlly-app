/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * "On the horizon" — the one forward-looking panel.
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Agent, Query, QueryStatus } from "../../types";
import { buildRows, HORIZON_DAYS } from "../../lib/analytics";
import { Horizon, horizonNote, horizonWorthShowing } from "./Horizon";

const NOW = new Date(2026, 7, 19, 12, 0, 0).getTime();
const DAY = 86400000;
const daysAgo = (n: number) => new Date(NOW - n * DAY).toISOString();

let seq = 0;
const id = () => `h${++seq}`;

const agent = (over: Partial<Agent> = {}): Agent =>
  ({ id: id(), userId: "u", name: "Alex Fenn", agency: "Fenn Literary", email: "", website: "", ...over }) as Agent;

const query = (agentId: string, over: Partial<Query> = {}): Query =>
  ({ id: id(), userId: "u", manuscriptId: "m1", agentId, packageId: "", status: QueryStatus.QUERIED,
     personalisationNotes: "", sendMethod: "Email", ...over }) as unknown as Query;

const build = (qs: Query[], agents: Agent[]) => buildRows(qs, [], agents, NOW);
const render = (rows: ReturnType<typeof build>) =>
  renderToStaticMarkup(<Horizon rows={rows} nowMs={NOW} />);

describe("on the horizon", () => {
  it("lists only the windows closing inside four weeks, soonest first", () => {
    const a = agent({ responseTimeWeeks: 8 }); // a 56-day window
    const rows = build(
      [
        query(a.id, { dateSent: daysAgo(35) }), // closes in 21 days
        query(a.id, { dateSent: daysAgo(49) }), // closes in 7 days
        query(a.id, { dateSent: daysAgo(1) }), // closes in 55 — beyond the horizon
        query(a.id, { dateSent: daysAgo(80) }), // already past
      ],
      [a],
    );
    const html = render(rows);
    const left = [...html.matchAll(/an-hd"><b>(\d+)<\/b>/g)].map((m) => Number(m[1]));
    expect(left, "the horizon is not listing exactly the two closing soon").toEqual([7, 21]);
    for (const d of left) expect(d).toBeLessThanOrEqual(HORIZON_DAYS);
  });

  it("⚠️ counts the already-past apart from the countdown, and keeps them out of the list", () => {
    /* "closes in 3 days" and "closed a month ago" are not the same kind of row. */
    const a = agent({ responseTimeWeeks: 4 });
    const rows = build(
      [query(a.id, { dateSent: daysAgo(21) }), query(a.id, { dateSent: daysAgo(90) }), query(a.id, { dateSent: daysAgo(80) })],
      [a],
    );
    expect([...render(rows).matchAll(/an-hcard/g)]).toHaveLength(1);
    expect(horizonNote(rows, NOW)).toBe("1 stated window closes in the next four weeks · 2 already past");
  });

  it("⚠️ invents no deadline for an agent who states no window", () => {
    /* ⚠️ NO HARD-CODED TWELVE WEEKS ANYWHERE. A query with no stated window has no closing date,
       and giving it a default one would put a date on the page that no agency ever said. */
    const silent = agent({ name: "No Window" });
    const rows = build([query(silent.id, { dateSent: daysAgo(30) })], [silent]);
    expect(render(rows)).not.toContain("an-hcard");
    expect(horizonWorthShowing(rows, NOW)).toBe(false);
  });

  it("reads the closing date off the agent's OWN stated weeks", () => {
    /* Two identical sends, two different agencies: the dates must differ by the stated difference
       rather than by a constant this page chose.

       ⚠️ BOTH WINDOWS HAVE TO LAND INSIDE THE HORIZON FOR THIS TO TEST ANYTHING. The first version
       used 5 and 7 weeks against a 14-day-old send, so the seven-week window closed in 35 days —
       correctly beyond the four-week list, and the assertion failed on a fixture the panel was
       right to exclude. 5 and 6 weeks both close inside it. */
    const fast = agent({ name: "Quick Reader", responseTimeWeeks: 5 });
    const slow = agent({ name: "Slow Reader", responseTimeWeeks: 6 });
    const rows = build(
      [query(fast.id, { dateSent: daysAgo(14) }), query(slow.id, { dateSent: daysAgo(14) })],
      [fast, slow],
    );
    const left = [...render(rows).matchAll(/an-hd"><b>(\d+)<\/b>/g)].map((m) => Number(m[1]));
    expect(left, "both windows should be inside the four-week list").toHaveLength(2);
    expect(left).toEqual([21, 28]);
    expect(left[1] - left[0], "the gap is not the two agencies' stated difference").toBe((6 - 5) * 7);
  });

  it("names the agent and the agency, and gives a full date", () => {
    const a = agent({ name: "Rachel Lin", agency: "Lin Literary", responseTimeWeeks: 6 });
    const html = render(build([query(a.id, { dateSent: daysAgo(30) })], [a]));
    expect(html).toContain("Rachel Lin");
    expect(html).toContain("Lin Literary");
    /* ⚠️ WITH THE YEAR. A window closing "9 Sept" is ambiguous the moment one closes next January. */
    expect(html).toMatch(/window closes \d+ \w+ 20\d\d/);
  });

  it("⚠️ tells the writer nothing to do about it", () => {
    /* It reports which windows close and when. Whether that is worth acting on depends on the
       agency, the manuscript and the writer's own nerve — none of which this page can see, and
       all of which the To-do board is for. */
    const a = agent({ responseTimeWeeks: 4 });
    const rows = build([query(a.id, { dateSent: daysAgo(21) }), query(a.id, { dateSent: daysAgo(60) })], [a]);
    const text = `${render(rows)} ${horizonNote(rows, NOW)}`;
    for (const prompt of [/\bnudge\b/i, /\bchase\b/i, /\bfollow up\b/i, /\bshould\b/i, /\btime to\b/i,
                          /\bdon't forget\b/i, /\bremember to\b/i, /\bact\b/i]) {
      expect(text, `the horizon is prompting rather than reporting: ${prompt}`).not.toMatch(prompt);
    }
  });

  it("is not rendered at all when it has nothing to say", () => {
    const a = agent({ responseTimeWeeks: 12 });
    const rows = build([query(a.id, { dateSent: daysAgo(2) })], [a]);
    expect(horizonWorthShowing(rows, NOW)).toBe(false);
    /* and when something HAS passed, it is worth showing even with an empty countdown */
    const past = build([query(a.id, { dateSent: daysAgo(200) })], [a]);
    expect(horizonWorthShowing(past, NOW)).toBe(true);
    expect(render(past)).toContain("already passed");
  });

  it("keeps a closed query off the horizon entirely", () => {
    /* A window only matters while you are still waiting on it. */
    const a = agent({ responseTimeWeeks: 8 });
    const rows = build([query(a.id, { status: QueryStatus.REJECTED, dateSent: daysAgo(49) })], [a]);
    expect(horizonWorthShowing(rows, NOW)).toBe(false);
  });
});
