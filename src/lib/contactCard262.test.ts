import { describe, expect, it } from "vitest";
import { QueryStatus, SubmissionMethod } from "../types";
import { nextStep } from "./contactCard262";

const q = (status: QueryStatus, extra: Record<string, unknown> = {}) => ({ id: "q1", status, court: "agent", sentMs: Date.UTC(2026, 8, 1), lastMs: Date.UTC(2026, 9, 2), expectedMs: null, ...extra });
const x = (stand: string, extra: Record<string, unknown> = {}) => ({ stand, q: null, door: "open", agent: { id: "a", name: "Tom Ellery", agency: "E & F" }, ...extra }) as never;

/* Agent card v2 retired the band's chip, the head's meta line and the four tiles (lib/agentCardV2 has their successors) */
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
