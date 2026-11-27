/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NU11-c — Next up v1.1, item 3: an offer's "send the full" task opens the sent journey as a FULL, from the Dashboard
 * and from the To-do alike (both call `drawerDoorForTask`, and the To-do desk logs it through its own send flow).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { QueryStatus, type Query } from "../../types";
import { sendKindOf } from "./sendKind";
import { drawerDoorForTask } from "./entry";
import { journeyDoing, journeyTitle } from "./parking";
import { stripWords, type WsTask } from "../todoWs";

const q = (o: Partial<Query>): Query => ({ id: "q1", status: QueryStatus.QUERIED, ...o } as Query);
/* the query an offer_send_full task hangs on: another agent, told of the offer, answered "send me the full" */
const toldWantsFull = (status: QueryStatus) => q({ status, offerReply: "full", offerRefQueryId: "offer-q" });

describe("NU11-c · which send a request asks for", () => {
  it("an offer's send the full is a full at every status the task is raised for (lib/db.tsx's four)", () => {
    for (const s of [QueryStatus.QUERIED, QueryStatus.PARTIAL_REQUESTED, QueryStatus.PARTIAL_SENT, QueryStatus.FULL_REQUESTED]) {
      expect(sendKindOf(toldWantsFull(s)), s).toBe("full");
    }
  });
  it("the To-do's ordinary sends are unchanged: partial, full, revision by status", () => {
    expect(sendKindOf(q({ status: QueryStatus.PARTIAL_REQUESTED }))).toBe("partial");
    expect(sendKindOf(q({ status: QueryStatus.FULL_REQUESTED }))).toBe("full");
    expect(sendKindOf(q({ status: QueryStatus.REVISE_RESUBMIT }))).toBe("rr");
  });
  it("a revision outranks an earlier offer reply; a reply with no offer behind it is not one", () => {
    expect(sendKindOf(toldWantsFull(QueryStatus.REVISE_RESUBMIT))).toBe("rr");
    expect(sendKindOf(q({ status: QueryStatus.PARTIAL_REQUESTED, offerReply: "full" }))).toBe("partial");
    expect(sendKindOf(q({ status: QueryStatus.PARTIAL_REQUESTED, offerReply: "wait", offerRefQueryId: "offer-q" }))).toBe("partial");
  });
});

describe("NU11-c · the door, from the Dashboard and the To-do", () => {
  it("offer_send_full opens the sent journey on its own query (the one door both call)", () => {
    expect(drawerDoorForTask("offer_send_full", "q1")).toEqual({ mode: "sent", queryId: "q1" });
    expect(drawerDoorForTask("partial_requested", "q1")).toEqual({ mode: "sent", queryId: "q1" });
  });
  it("the parked chip names the full", () => {
    const t = toldWantsFull(QueryStatus.PARTIAL_SENT);
    expect(journeyTitle("sent", t)).toBe("Send your full");
    expect(journeyDoing("sent", t)).toBe("sending the full");
    expect(journeyTitle("sent", QueryStatus.PARTIAL_REQUESTED)).toBe("Send your partial");
  });
  it("the To-do desk's strip says Full for it, and Partial for an ordinary partial", () => {
    const task = (query: Query) => ({ kind: "send", first: "Tom", title: "", query, item: { card: {} } } as unknown as WsTask);
    expect(stripWords(task(toldWantsFull(QueryStatus.QUERIED))).what).toBe("Full");
    expect(stripWords(task(q({ status: QueryStatus.PARTIAL_REQUESTED }))).what).toBe("Partial");
  });
  it("every reader takes the one reading: no status-only copy is left in the four files", () => {
    for (const f of [
      "src/components/queryActions/journeys/SentJourney.tsx",
      "src/components/todo/ws/wsFlows.tsx",
      "src/lib/todoWs.ts",
      "src/lib/queryActions/parking.ts",
    ]) {
      const src = readFileSync(f, "utf8");
      expect(src, f).toMatch(/sendKindOf\(/);
      expect(src, f).not.toMatch(/FULL_REQUESTED \? "full"/);
    }
  });
});
