/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, expect, it } from "vitest";
import type { Agent } from "../types";
import { greetingName, letterOpening, previewAgent, primaryLabel } from "./packagesV393";

const ag = (id: string, name: string, agency = "Agency"): Agent => ({ id, name, agency } as Agent);

describe("v39.3 preview: the example agent", () => {
  it("is the first by surname who has not been queried for this book", () => {
    const a = [ag("1", "Zoe Adams"), ag("2", "Bea Cole"), ag("3", "Al Baker")];
    expect(previewAgent(a, [{ agentId: "1" }])?.id).toBe("3");
  });
  it("is nobody when every agent has been queried", () => {
    expect(previewAgent([ag("1", "Zoe Adams")], [{ agentId: "1" }])).toBeNull();
  });
  it("greets by first name, or 'agent'", () => {
    expect(greetingName(ag("1", "Jonathan Marsh"))).toBe("Jonathan");
    expect(greetingName(null)).toBe("agent");
  });
});

describe("v39.3 preview: the letter's opening", () => {
  it("quotes the text whole when it is short", () => expect(letterOpening("Dear agent, hello.")).toBe("Dear agent, hello."));
  it("cuts a long text at a word, about 200 characters in, with an ellipsis", () => {
    const t = "word ".repeat(80);
    const o = letterOpening(t);
    expect(o.endsWith("…")).toBe(true);
    expect(o.length).toBeLessThanOrEqual(201);
    expect(o.length).toBeGreaterThan(150);
  });
  it("is empty for no text (never the summary)", () => expect(letterOpening("")).toBe(""));
});

describe("v39.3 preview: the primary button", () => {
  it("names only what is missing", () => {
    expect(primaryLabel(false, false)).toEqual({ ready: false, text: "Add a version and a letter to send it" });
    expect(primaryLabel(true, false)).toEqual({ ready: false, text: "Add a letter to send it" });
    expect(primaryLabel(false, true)).toEqual({ ready: false, text: "Add a version to send it" });
    expect(primaryLabel(true, true)).toEqual({ ready: true, text: "Log a query with it" });
  });
});
