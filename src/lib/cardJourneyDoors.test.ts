/**
 * Card journeys v1, Phase 6 — one journey per action, everywhere (lib/queryActions/drawerStore's interceptor, registered
 * by lib/queryActions/cardJourneys):
 *   E1  with a journey host listening, the drawer's "sent", "close" and answering "offer" doors open the journey instead
 *       (the drawer is not opened); a task that TELLS the others about an offer keeps the drawer
 *   E2  with nothing listening (the phone), every door keeps the drawer
 *   E3  a task's step (`openQueryPanel(id, from, step)`, the Dashboard's Next up) opens the journey over the page, and
 *       neither the card nor its step
 *   E4  "Answer the offer" tasks are marked as answering; the To-do desk asks for the journey on the desktop
 */
import { afterEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import "./queryActions/cardJourneys";
import { closeQueryDrawer, currentDrawerRequest, openQueryDrawer } from "./queryActions/drawerStore";
import { closeQueryPanel, currentQueryPanel, openQueryPanel, subscribeCardJourney, type CardJourneyRequest } from "./queryPanelStore";
import { drawerDoorForTask } from "./queryActions/entry";

afterEach(() => { closeQueryDrawer(); closeQueryPanel(); });

describe("card journeys v1 · every door", () => {
  it("E1 the drawer's doors open the journey while a host listens", () => {
    const got: CardJourneyRequest[] = [];
    const off = subscribeCardJourney((r) => got.push(r));
    openQueryDrawer({ mode: "sent", queryId: "q1" });
    openQueryDrawer({ mode: "close", queryId: "q2", preset: { closeWhy: "noreply" } });
    openQueryDrawer({ mode: "offer", queryId: "q3" });
    openQueryDrawer({ mode: "offer", queryId: "q4", preset: { step: 1, answer: true } });
    expect(got.map((r) => `${r.kind}:${r.queryId}`)).toEqual(["send:q1", "close:q2", "offer:q3", "offer:q4"]);
    expect(currentDrawerRequest()).toBeNull();
    openQueryDrawer({ mode: "offer", queryId: "q5", preset: { step: 1 } });
    expect(currentDrawerRequest()?.queryId).toBe("q5");
    openQueryDrawer({ mode: "sent", queryId: "practice-pip" } as never);
    expect(got.length).toBe(4);
    off();
  });
  it("E2 with nothing listening, the drawer as before", () => {
    openQueryDrawer({ mode: "sent", queryId: "q1" });
    expect(currentDrawerRequest()?.mode).toBe("sent");
  });
  it("E3 a task's step opens the journey over the page, not the card", () => {
    const got: CardJourneyRequest[] = [];
    const off = subscribeCardJourney((r) => got.push(r));
    openQueryPanel("q9", "dashboard", { mode: "sent", queryId: "q9", panel: { name: "Rosalind Ashby", agency: "", first: "Rosalind" } });
    expect(got.map((r) => `${r.kind}:${r.queryId}:${!!r.fromCard}`)).toEqual(["send:q9:false"]);
    expect(currentQueryPanel()).toBeNull();
    expect(currentDrawerRequest()).toBeNull();
    off();
  });
  it("E4 the offer task answers; the desk asks for the journey", () => {
    expect(drawerDoorForTask("offer_received", "q1")?.preset).toEqual({ step: 1, answer: true });
    expect(drawerDoorForTask("offer_tell_all", "q1")?.preset).toEqual({ step: 1 });
    const desk = readFileSync("src/components/todo/ws/useWsCore.ts", "utf8");
    const flow = desk.slice(desk.indexOf("const makeFlow ="), desk.indexOf("const facts = quietFacts(sel);"));
    expect(flow).toContain("cardJourneyHosted(cjKind)");
    expect(flow).toContain("openCardJourney({ queryId: sel.query!.id, kind: cjKind");
  });
});
