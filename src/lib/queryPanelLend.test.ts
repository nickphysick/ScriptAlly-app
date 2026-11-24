/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Record a response v2.1 — LENDING THE RIGHT-HAND PLACE (lib/queryPanelStore). The response journey lends its place to
 * the query's card: the card's claim sits over it, and the card's release hands the place back to the journey (its
 * subscribers hear "response", not null). A fresh claim by the lender takes it back; a lender that leaves stops waiting.
 *
 *   L1  lend → the card claims → the card releases: the owner is the lender again, and subscribers hear it
 *   L2  without a lend, a release leaves no owner (unchanged)
 *   L3  the lender claiming afresh (a new journey over the card) is no longer waiting behind
 *   L4  only the owner can lend
 */
import { describe, expect, it, vi } from "vitest";
vi.mock("./firebase", () => ({ db: {}, auth: {} }));
import { claimRightPanel, isLent, lendRightPanel, releaseRightPanel, rightPanelOwner, subscribeRightPanel, unlendRightPanel } from "./queryPanelStore";

const reset = () => { for (const o of ["query", "response", "agent", "feed"] as const) { unlendRightPanel(o); releaseRightPanel(o); } };

describe("lending the right-hand place (v2.1)", () => {
  it("L1 the card's release gives the place back to the journey", () => {
    reset();
    const heard: (string | null)[] = [];
    const off = subscribeRightPanel((o) => heard.push(o));
    claimRightPanel("response");
    lendRightPanel("response");
    expect(isLent("response")).toBe(true);
    claimRightPanel("query");
    expect(rightPanelOwner()).toBe("query");
    releaseRightPanel("query");
    expect(rightPanelOwner()).toBe("response");
    expect(isLent("response")).toBe(false);
    expect(heard).toEqual(["response", "query", "response"]);
    off();
  });
  it("L2 without a lend, a release leaves no owner", () => {
    reset();
    claimRightPanel("response");
    claimRightPanel("query");
    releaseRightPanel("query");
    expect(rightPanelOwner()).toBe(null);
  });
  it("L3 the lender claiming afresh is no longer waiting", () => {
    reset();
    claimRightPanel("response");
    lendRightPanel("response");
    claimRightPanel("query");
    claimRightPanel("response");
    expect(isLent("response")).toBe(false);
    releaseRightPanel("response");
    expect(rightPanelOwner()).toBe(null);
  });
  it("L4 only the owner can lend", () => {
    reset();
    claimRightPanel("query");
    lendRightPanel("response");
    expect(isLent("response")).toBe(false);
  });
});
