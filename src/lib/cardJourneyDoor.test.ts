/**
 * Card journeys v1 — Phase 1 locks on the store (lib/queryPanelStore):
 *   C1  `openCardJourney` refuses while nothing listens (the phone) and for a kind not live, so the door keeps its form
 *   C2  a live kind with a listener is handed to it, and the door hears `cardJourneySaved` once, for its own query
 *   C3  the card lends its place: the journey claims it, the card is still lent (it stays, under); releasing gives it back
 *   C4  the card's door (Queries.tsx `open1522`) asks for the journey with `fromCard`, for each of the four, before the form
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  cardJourneySaved, claimRightPanel, isLent, lendRightPanel, openCardJourney, releaseRightPanel, rightPanelOwner, setCardJourneyLive,
  subscribeCardJourney, type CardJourneyKind, type CardJourneyRequest,
} from "./queryPanelStore";

describe("card journeys v1 · the door", () => {
  it("C1 refuses with no listener, and for a kind that is not live", () => {
    setCardJourneyLive(() => true);
    expect(openCardJourney({ queryId: "q1", kind: "send" })).toBe(false);
    const off = subscribeCardJourney(() => {});
    setCardJourneyLive((k) => k === "close");
    expect(openCardJourney({ queryId: "q1", kind: "send" })).toBe(false);
    expect(openCardJourney({ queryId: "q1", kind: "close" })).toBe(true);
    off();
  });
  it("C2 hands the request over, and tells the door once for its own query", () => {
    setCardJourneyLive(() => true);
    const got: CardJourneyRequest[] = [];
    const off = subscribeCardJourney((r) => got.push(r));
    const heard: string[] = [];
    expect(openCardJourney({ queryId: "q7", kind: "offer", fromCard: true, onSaved: (id) => heard.push(id) })).toBe(true);
    expect(got).toEqual([expect.objectContaining({ queryId: "q7", kind: "offer", fromCard: true })]);
    cardJourneySaved("other"); cardJourneySaved("q7"); cardJourneySaved("q7");
    expect(heard).toEqual(["q7"]);
    off();
  });
  it("C3 the card lends its place to the journey and has it back when the journey goes", () => {
    claimRightPanel("query");
    lendRightPanel("query");
    claimRightPanel("response");
    expect(rightPanelOwner()).toBe("response");
    expect(isLent("query")).toBe(true);
    releaseRightPanel("response");
    expect(rightPanelOwner()).toBe("query");
    expect(isLent("query")).toBe(false);
    releaseRightPanel("query");
  });
  it("C4 the card's door asks for the journey from the card, for all four, before its own form", () => {
    const src = readFileSync("src/components/Queries.tsx", "utf8");
    const map = src.match(/const CARD_J[^=]*=\s*\{([^}]*)\}/)?.[1] ?? "";
    for (const k of ["send", "close", "offer", "reopen"] as CardJourneyKind[]) expect(map).toContain(`: "${k}"`);
    const open = src.slice(src.indexOf("const open1522 = useCallback"), src.indexOf("const qcCardPendingMode"));
    const door = open.indexOf("openCardJourney({ queryId: id, kind: cjKind, fromCard: true })");
    expect(door).toBeGreaterThan(0);
    expect(door).toBeLessThan(open.indexOf("setQc1522J({ j"));
  });
});
