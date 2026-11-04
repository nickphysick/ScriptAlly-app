import { describe, expect, it } from "vitest";
import { QueryStatus, SubmissionMethod } from "../types";
import { bandWords, howTiles, metaLine, nextStep } from "./contactCard262";

const q = (status: QueryStatus, extra: Record<string, unknown> = {}) => ({ id: "q1", status, court: "agent", sentMs: Date.UTC(2026, 8, 1), lastMs: Date.UTC(2026, 9, 2), expectedMs: null, ...extra });
const x = (stand: string, extra: Record<string, unknown> = {}) => ({ stand, q: null, door: "open", agent: { id: "a", name: "Tom Ellery", agency: "E & F" }, ...extra }) as never;

describe("v26.2 B — the band's chip", () => {
  it("says who it's with and the stage", () => {
    expect(bandWords(x("you", { q: q(QueryStatus.OFFER) }))).toBe("Your move · Offer");
    expect(bandWords(x("agent", { q: q(QueryStatus.FULL_SENT) }))).toBe("With the agent · Full sent");
    expect(bandWords(x("closed", { q: q(QueryStatus.REJECTED) }))).toBe("Closed · Passed");
    expect(bandWords(x("none"))).toBe("Not yet queried");
    expect(bandWords(x("none", { door: "closed" }))).toBe("Closed to queries");
  });
});

describe("v26.2 B — the head's meta line", () => {
  it("omits whichever half is unknown, with no stray separator", () => {
    expect(metaLine({ city: "Bath", responseTimeWeeks: 6 }, null)).toBe("Bath · replies in about 6 weeks");
    expect(metaLine({ city: "", responseTimeWeeks: 6 }, null)).toBe("replies in about 6 weeks");
    expect(metaLine({ city: "Bath", responseTimeWeeks: 0 }, null)).toBe("Bath");
    expect(metaLine({ city: "", responseTimeWeeks: undefined }, null)).toBe(null);
  });
});

describe("v26.2 B — the four tiles", () => {
  it("are reply, door, method, policy, with the gaps in italics", () => {
    const t = howTiles({ responseTimeWeeks: 8, submissionMethod: SubmissionMethod.QUERY_MANAGER, noResponseMeansNo: false } as never, "open");
    expect(t.map((x) => `${x.pre}${x.bold}${x.post}`)).toEqual(["Replies in about 8 weeks", "Open to queries", "Takes queries via QueryManager", "Always replies"]);
    const g = howTiles({} as never, "unknown");
    expect(g.map((x) => x.known)).toEqual([false, false, false, false]);
    expect(g.map((x) => x.pre)).toEqual(["Reply time not known", "Not known if open", "How they take queries not known", "Response policy not stated"]);
  });
});

describe("v26.2 B — the next-step box", () => {
  it("is the call box for your move, and toned for the rest", () => {
    const call = { kind: "you", bold: "Tom made an offer.", sub: "Reply by 31 Jul.", button: "Record your answer", door: { mode: "offer", label: "Record your answer" }, queryId: "q1" } as never;
    const you = nextStep(x("you", { q: q(QueryStatus.OFFER) }), "Tom", call, 0);
    expect([you.tone, you.bold, you.sub, you.button?.label]).toEqual(["you", "Tom made an offer.", "Reply by 31 Jul.", "Record your answer"]);
    expect(nextStep(x("agent", { q: q(QueryStatus.QUERIED) }), "Tom", null, 0).tone).toBe("agent");
    const closed = nextStep(x("closed", { q: q(QueryStatus.REJECTED) }), "Tom", null, 0);
    expect([closed.tone, closed.bold]).toEqual(["closed", "Passed."]);
    const none = nextStep(x("none"), "Tom", { kind: "log", bold: "You haven’t queried Tom yet.", sub: "Check the wishlist before you send." } as never, 0);
    expect([none.tone, none.button?.label]).toEqual(["none", "Log a query"]);
    expect(nextStep(x("none", { door: "closed" }), "Tom", null, 0).button).toBe(null);
  });
});
