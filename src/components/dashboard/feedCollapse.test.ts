/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ THE ACTIVITY FEED FOLDS RUNS — AND THREE THINGS IT MUST NEVER FOLD (dashboard audit P7).
 *
 * Editing one agent six times in an afternoon wrote six identical lines and pushed a week of real
 * querying off the card. The fold answers that. Each test here is the case that would lose
 * information if the corresponding rule were dropped — not a restatement of the implementation.
 */
import { describe, it, expect } from "vitest";
import { collapseFeedRuns, runLines, nameList, runPill, FeedRow } from "./OneScreenRail";

const row = (over: Partial<FeedRow> & Pick<FeedRow, "id">): FeedRow => ({
  dayLabel: "Wed 29 Jul",
  pill: "Agent updated",
  sage: false,
  time: "3:00pm",
  who: "Updated Sophie Dunn at Curtis Vane",
  caption: "",
  dotStatus: null,
  scope: "agent",
  count: 1,
  subjects: 1,
  subjectNames: [over.who ?? "Updated Sophie Dunn at Curtis Vane"],
  fromTime: "",
  ...over,
});

describe("activity feed — run collapse", () => {
  it("folds a run of identical agent events into one line that states its size", () => {
    const out = collapseFeedRuns([
      row({ id: "a", time: "4:10pm" }),
      row({ id: "b", time: "3:40pm" }),
      row({ id: "c", time: "3:05pm" }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].count).toBe(3);
    // the newest row survives, and the run reads as a span from the oldest
    expect(out[0].id).toBe("a");
    expect(out[0].time).toBe("4:10pm");
    expect(out[0].fromTime).toBe("3:05pm");
  });

  it("⚠️ NEVER folds query-scoped events — two sends to one agent are two queries", () => {
    const out = collapseFeedRuns([
      row({ id: "q1", scope: "query", pill: "Query sent", who: "Sophie Dunn" }),
      row({ id: "q2", scope: "query", pill: "Query sent", who: "Sophie Dunn" }),
    ]);
    // Folding here would report one submission where two happened.
    expect(out).toHaveLength(2);
    expect(out.every((r) => r.count === 1)).toBe(true);
  });

  it("⚠️ a run NEVER merges across an interruption", () => {
    const out = collapseFeedRuns([
      row({ id: "a", time: "5:00pm" }),
      row({ id: "q", scope: "query", pill: "Query sent", who: "Anya Rell", time: "4:00pm" }),
      row({ id: "b", time: "3:00pm" }),
    ]);
    // Two runs of one around the query — never one run of two with the query beside it.
    expect(out).toHaveLength(3);
    expect(out.map((r) => r.id)).toEqual(["a", "q", "b"]);
    expect(out.every((r) => r.count === 1)).toBe(true);
  });

  it("⚠️ never folds across a day boundary — the render groups by day", () => {
    const out = collapseFeedRuns([
      row({ id: "a", dayLabel: "Wed 29 Jul" }),
      row({ id: "b", dayLabel: "Tue 28 Jul" }),
    ]);
    expect(out).toHaveLength(2);
  });

  it("⚠️ folds SIX edits of six different agents into one sentence — the pack's headline case", () => {
    const names = ["Sophie Dunn", "Anya Rell", "Mira Vance", "Tom Ellery", "Kit Rowe", "Jo Bell"];
    const out = collapseFeedRuns(names.map((n, i) => row({ id: `a${i}`, who: `Updated ${n}` })));
    expect(out).toHaveLength(1);
    expect(out[0].count).toBe(6);
    expect(out[0].subjects).toBe(6);
    expect(runLines(out[0])).toEqual({
      line: "6 agents",
      caption: "Updated Sophie Dunn, Updated Anya Rell & 4 more",
    });
    // ⚠️ the verb pluralises with its subjects — "Agent updated ×6" reads as one agent, six times
    expect(runPill(out[0])).toBe("Agents updated");
  });

  it("⚠️ six edits to ONE agent is NOT 'six agents' — the sentence counts subjects, not events", () => {
    const out = collapseFeedRuns([
      row({ id: "a", who: "Updated Sophie Dunn" }),
      row({ id: "b", who: "Updated Sophie Dunn" }),
    ]);
    expect(out[0].count).toBe(2);
    expect(out[0].subjects).toBe(1);
    // no run line — the row keeps its own name and shows the repetition as a count
    expect(runLines(out[0])).toBeNull();
    expect(runPill(out[0])).toBe("Agent updated"); // singular verb for a single subject
  });

  it("does not fold the same subject under a different event", () => {
    const differentPill = collapseFeedRuns([
      row({ id: "a", pill: "Agent updated" }),
      row({ id: "b", pill: "Agent added" }),
    ]);
    expect(differentPill).toHaveLength(2);

    const differentScope = collapseFeedRuns([
      row({ id: "a", scope: "agent", who: "Tidewrack" }),
      row({ id: "b", scope: "manuscript", who: "Tidewrack" }),
    ]);
    expect(differentScope).toHaveLength(2);
  });

  it("leaves an ordinary feed completely untouched", () => {
    const rows = [
      row({ id: "a", scope: "query", pill: "Query sent", who: "Sophie Dunn" }),
      row({ id: "b", scope: "query", pill: "Full requested", who: "Anya Rell" }),
      row({ id: "c", scope: "agent", who: "Added Mira Vance at Oakleaf" }),
    ];
    const out = collapseFeedRuns(rows);
    expect(out).toEqual(rows);
  });

  it("an empty feed stays empty", () => {
    expect(collapseFeedRuns([])).toEqual([]);
  });

  it("⚠️ the caption names two and counts the rest — never a name cut mid-word", () => {
    expect(nameList(["Ada", "Bo"])).toBe("Ada & Bo");
    expect(nameList(["Ada", "Bo", "Cy", "Di", "Ed", "Fi"])).toBe("Ada, Bo & 4 more");
    expect(nameList(["Ada"])).toBe("Ada");
  });
});
