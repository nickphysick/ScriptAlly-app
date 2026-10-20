import { describe, it, expect } from "vitest";
import { createRowCounter } from "./progressCounter";

/** Count `text` pushed whole, then one character at a time — every case must agree both ways. */
const countBoth = (text: string) => {
  const whole = createRowCounter(); whole.push(text);
  const chars = createRowCounter(); for (const ch of text) chars.push(ch);
  expect(chars.counts(), "char-by-char agrees with whole").toEqual(whole.counts());
  return whole.counts();
};

const agent = (i: number, extra = "") => `{"ref":"a${i}","name":"Agent ${i}","agency":"Agency ${i}"${extra}}`;
const query = (i: number, extra = "") => `{"agentRef":"a${i}","status":"Queried","sentDateRaw":"14/03/2024"${extra}}`;
const reply = (n: number, a = agent, q = query) =>
  `{"agents":[${Array.from({ length: n }, (_, i) => a(i + 1)).join(",")}],"queries":[${Array.from({ length: n }, (_, i) => q(i + 1)).join(",")}]}`;

describe("createRowCounter", () => {
  it("counts every completed agent and query, and rows as half their sum", () => {
    expect(countBoth(reply(3))).toEqual({ agents: 3, queries: 3, rows: 3 });
  });

  it("counts objects split across chunks at any point", () => {
    const text = reply(4);
    for (let cut = 1; cut < text.length; cut++) {
      const c = createRowCounter();
      c.push(text.slice(0, cut)); c.push(text.slice(cut));
      expect(c.counts(), `cut at ${cut}`).toEqual({ agents: 4, queries: 4, rows: 4 });
    }
  });

  it("rises steadily through the agents, rather than waiting for the queries", () => {
    const text = reply(10);
    const c = createRowCounter();
    const seen: number[] = [];
    for (const ch of text) { c.push(ch); seen.push(c.counts().rows); }
    const half = seen[text.indexOf('"queries"')];
    expect(half).toBe(5); // all ten agents out = five rows' worth
    for (let i = 1; i < seen.length; i++) expect(seen[i]).toBeGreaterThanOrEqual(seen[i - 1]);
    expect(seen[seen.length - 1]).toBe(10);
  });

  it("ignores braces and brackets inside strings, including after escaped quotes", () => {
    const a = (i: number) => agent(i, `,"mswlNotes":"likes {braces} and [brackets] and \\"quoted {text}\\" and a \\\\ slash }"`);
    const q = (i: number) => query(i, `,"notes":"said \\"no } thanks\\" — {not an object}"`);
    expect(countBoth(reply(3, a, q))).toEqual({ agents: 3, queries: 3, rows: 3 });
  });

  it("does not count objects nested inside a row (timeline entries)", () => {
    const q = (i: number) => query(i, `,"timeline":[{"type":"Full Requested","rawDate":"20/3"},{"type":"Full Sent"}]`);
    expect(countBoth(reply(2, agent, q))).toEqual({ agents: 2, queries: 2, rows: 2 });
  });

  it("counts nothing for empty arrays", () => {
    expect(countBoth('{"agents":[],"queries":[]}')).toEqual({ agents: 0, queries: 0, rows: 0 });
  });

  it("counts what completed before a truncation, and nothing half-written", () => {
    const text = reply(5);
    const cut = text.indexOf(query(4)) + 10; // inside the fourth query
    expect(countBoth(text.slice(0, cut))).toEqual({ agents: 5, queries: 3, rows: 4 });
  });

  it("skips a code fence or prose before the object, and keys a root array only by its own key", () => {
    expect(countBoth("Here you go:\n```json\n" + reply(2) + "\n```")).toEqual({ agents: 2, queries: 2, rows: 2 });
    // Objects in some other root array are not rows.
    expect(countBoth('{"warnings":[{"x":1},{"y":2}],"agents":[' + agent(1) + "]}")).toEqual({ agents: 1, queries: 0, rows: 0 });
  });

  it("handles keys in either order, and a string value that looks like a key", () => {
    const text = `{"note":"agents","queries":[${query(1)}],"agents":[${agent(1)}]}`;
    expect(countBoth(text)).toEqual({ agents: 1, queries: 1, rows: 1 });
  });
});
