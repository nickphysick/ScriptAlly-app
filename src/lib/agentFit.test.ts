/** Add agent v1 Phase 6 — the fit order (the rendered picker is AA13): fit high first, unrated last, then the shorter
 *  stated response time (unknown last), then the name. Held over a fixture built in an order that is none of these. */
import { describe, expect, it } from "vitest";
import { fitOrder } from "./agentFit";
import { readyOrder } from "./contactNextStep";
import { SubmissionStatus, type Agent } from "../types";

const xs = [
  { name: "Zed", starRating: null, responseTimeWeeks: 4 },
  { name: "Amy", starRating: 3, responseTimeWeeks: 12 },
  { name: "Bea", starRating: 5, responseTimeWeeks: null },
  { name: "Cal", starRating: 3, responseTimeWeeks: 6 },
  { name: "Dee", starRating: 5, responseTimeWeeks: 8 },
  { name: "Eve", starRating: null, responseTimeWeeks: null },
];
describe("the fit order", () => {
  it("5★ › 3★ › unrated, then response time, then name", () => {
    expect([...xs].sort(fitOrder).map((x) => x.name)).toEqual(["Dee", "Bea", "Cal", "Amy", "Zed", "Eve"]);
  });
  it("the next-step spotlight orders ready agents the same way", () => {
    const ag = xs.map((x, i) => ({ id: String(i), name: x.name, agency: "A", genres: [], starRating: x.starRating ?? undefined, responseTimeWeeks: x.responseTimeWeeks ?? undefined, submissionStatus: SubmissionStatus.OPEN }) as unknown as Agent);
    expect([...ag].sort(readyOrder(["Thriller"])).map((a) => a.name)).toEqual(["Dee", "Bea", "Cal", "Amy", "Zed", "Eve"]);
  });
});
