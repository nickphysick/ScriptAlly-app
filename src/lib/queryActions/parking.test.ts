/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Parking a journey (Agent card v1 §6.3–§6.5) — the chip's words, the clash's, what a reload keeps,
 * and the store's one-journey-at-a-time law: a door asking for ANOTHER journey while one is parked
 * asks first ("Finish it" / "Discard and start"), and a door asking for the SAME one resumes it.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { QueryStatus } from "../../types";
import {
  PARKED_KEY, bareRequest, clashAsk, discardAsk, fromStored, journeyDoing, journeyTitle, parkedLine, sameJourney, toStored,
  type ParkedJourney,
} from "./parking";
import type { DrawerMode, OpenRequest } from "./drawerStore";

const MODES: DrawerMode[] = ["log", "resp", "sent", "nudge", "close", "offer", "edit"];

describe("the chip's words", () => {
  it("every mode has a title and a 'doing', and a send names what is being sent", () => {
    for (const m of MODES) {
      expect(journeyTitle(m), m).toMatch(/^[A-Z]/);
      expect(journeyDoing(m), m).toMatch(/^[a-z]+ing /);
    }
    expect(journeyTitle("sent", QueryStatus.FULL_REQUESTED)).toBe("Send the full");
    expect(journeyTitle("sent", QueryStatus.PARTIAL_REQUESTED)).toBe("Send the partial");
    expect(journeyTitle("sent", QueryStatus.REVISE_RESUBMIT)).toBe("Send the new version");
    expect(journeyDoing("sent", QueryStatus.FULL_REQUESTED)).toBe("sending the full");
    expect(journeyDoing("resp")).toBe("recording a response");
  });
  it("the line, the discard ask and the clash, in the mock's words", () => {
    const p = { title: "Send the full", name: "Jonathan Marsh", step: 1, of: 5 };
    expect(parkedLine(p)).toBe("Jonathan Marsh · step 2 of 5 · nothing lost");
    expect(parkedLine({ name: "", step: 0, of: 4 }), "no agent yet: no name, no stray separator").toBe("step 1 of 4 · nothing lost");
    expect(parkedLine({ name: "A", step: 9, of: 4 }), "never past the last step").toBe("A · step 4 of 4 · nothing lost");
    expect(discardAsk(p)).toBe("Discard send the full for Jonathan Marsh?");
    expect(clashAsk(p, { doing: "recording a response", name: "Ana Reyes" })).toEqual({
      head: "Send the full for Jonathan Marsh is half done.",
      sub: "Finish it first, or put it away and start recording a response for Ana Reyes.",
    });
  });
});

describe("what is stored is the journey, never the door", () => {
  const door: OpenRequest = {
    mode: "sent", queryId: "q1", dock: { initials: "JM", name: "Jonathan Marsh", status: "Your move" },
    onDock: () => undefined, receipt: true, onSaved: () => undefined, onCancel: () => undefined, instance: 7,
    seed: { x: 1 }, resume: { step: 2, seen: [0, 1, 2] },
  };
  it("a park strips every hook of the surface that opened it, and keeps the journey and its instance", () => {
    const b = bareRequest(door);
    expect(Object.keys(b).sort()).toEqual(["instance", "mode", "queryId"]);
  });
  it("the same journey is the same mode on the same query, agent and entry", () => {
    expect(sameJourney({ mode: "sent", queryId: "q1" }, door)).toBe(true);
    expect(sameJourney({ mode: "resp", queryId: "q1" }, door)).toBe(false);
    expect(sameJourney({ mode: "sent", queryId: "q2" }, door)).toBe(false);
    expect(sameJourney({ mode: "log", agentId: "a1" }, { mode: "log", agentId: "a1", manuscriptId: "m" })).toBe(true);
    expect(sameJourney({ mode: "log", agentId: "a1" }, { mode: "log", agentId: "a2" })).toBe(false);
    expect(sameJourney({ mode: "edit", queryId: "q1", entryId: "e1" }, { mode: "edit", queryId: "q1", entryId: "e2" })).toBe(false);
  });
  it("a reload keeps { mode, queryId, agentId, manuscriptId, step, answers } and the chip's words — and a Date comes back a Date", () => {
    const sent = new Date(2026, 9, 3);
    const p: ParkedJourney = {
      req: { mode: "log", agentId: "a1", manuscriptId: "m1", again: { sent, via: "Email", pkg: "p1", mat: { ql: true }, manuscriptId: "m1" } },
      step: 2, seen: [0, 1, 2], of: 6, answers: { typed: "", sent: "2026-10-03" }, title: "Log a query", doing: "logging a query", name: "Ana Reyes", live: true,
    };
    const back = fromStored(toStored(p))!;
    expect(back.live, "a reload drops the instance").toBe(false);
    expect({ ...back, live: true, req: { ...back.req, again: { ...back.req.again!, sent: 0 } } })
      .toEqual({ ...p, req: { ...p.req, again: { ...p.req.again!, sent: 0 } } });
    expect(back.req.again!.sent.getTime()).toBe(sent.getTime());
    expect(PARKED_KEY).toBe("qh.parkedJourney");
  });
  it("anything this build did not write is refused, never half-read", () => {
    for (const junk of [null, "", "{", "[]", JSON.stringify({ v: 2, mode: "log", step: 0, of: 3, title: "x" }), JSON.stringify({ v: 1, mode: "dance", step: 0, of: 3, title: "x" }), JSON.stringify({ v: 1, mode: "log", of: 3, title: "x" })]) {
      expect(fromStored(junk), String(junk)).toBeNull();
    }
  });
});

describe("the store: one journey at a time", () => {
  /* the store's storage access is guarded; give it a sessionStorage to write */
  const mem = new Map<string, string>();
  const storage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, v); }, removeItem: (k: string) => { mem.delete(k); } };
  let S: typeof import("./drawerStore");
  beforeEach(async () => {
    (globalThis as unknown as { window: unknown }).window = { sessionStorage: storage };
    mem.clear();
    S = await import("./drawerStore");
    S.discardParked();
    S.closeQueryDrawer();
    S.provideDock(null);
  });
  afterEach(() => { delete (globalThis as unknown as { window?: unknown }).window; });

  const park = (req: OpenRequest) => S.parkQueryDrawer({ req, step: 1, seen: [0, 1], of: 4, answers: { a: 1 }, title: "Send the full", doing: "sending the full", name: "Jonathan Marsh" });

  it("a park clears the open journey, keeps it live, and writes the reload copy", () => {
    S.openQueryDrawer({ mode: "sent", queryId: "q1" });
    const opened = S.currentDrawerRequest()!;
    expect(opened.instance, "the store stamps an instance").toBeTypeOf("number");
    park(opened);
    expect(S.currentDrawerRequest()).toBeNull();
    expect(S.currentParked()?.live).toBe(true);
    expect(S.currentParked()?.req.instance).toBe(opened.instance);
    expect(fromStored(mem.get("qh.parkedJourney"))?.req.queryId).toBe("q1");
  });

  it("ANOTHER journey asks first — never a silent replace — and 'Discard and start' opens it", () => {
    S.openQueryDrawer({ mode: "sent", queryId: "q1" });
    park(S.currentDrawerRequest()!);
    S.openQueryDrawer({ mode: "resp", queryId: "q2" });
    expect(S.currentDrawerRequest(), "the second journey opened over the parked one").toBeNull();
    expect(S.currentClash()?.queryId).toBe("q2");
    S.keepParked();
    expect(S.currentClash(), "keeping the parked journey withdraws the ask").toBeNull();
    expect(S.currentParked()).not.toBeNull();
    S.openQueryDrawer({ mode: "resp", queryId: "q2" });
    S.discardAndStart();
    expect(S.currentParked()).toBeNull();
    expect(S.currentDrawerRequest()?.queryId).toBe("q2");
    expect(mem.has("qh.parkedJourney"), "a discarded journey survives a reload").toBe(false);
  });

  it("the SAME journey resumes, with the hooks of the door that asked, on the same instance", () => {
    S.openQueryDrawer({ mode: "sent", queryId: "q1" });
    const opened = S.currentDrawerRequest()!;
    park(opened);
    const onDock = () => undefined;
    S.openQueryDrawer({ mode: "sent", queryId: "q1", dock: { initials: "JM", name: "Jonathan Marsh", status: "Your move" }, onDock });
    const back = S.currentDrawerRequest()!;
    expect(back.instance, "a resume in the same tab keeps the mounted journey").toBe(opened.instance);
    expect(back.onDock).toBe(onDock);
    expect(back.seed, "a live journey needs no seed").toBeUndefined();
    expect(S.currentParked()).toBeNull();
    expect(mem.has("qh.parkedJourney")).toBe(false);
  });

  it("Resume from the chip docks the card open NOW (the provider), and a reloaded journey is seeded at its step", () => {
    S.openQueryDrawer({ mode: "sent", queryId: "q1" });
    park(S.currentDrawerRequest()!);
    const stored = mem.get("qh.parkedJourney")!;
    const dock = { initials: "AR", name: "Ana Reyes", status: "With the agent" };
    S.provideDock(() => ({ dock }));
    S.resumeQueryDrawer();
    expect(S.currentDrawerRequest()?.dock).toEqual(dock);
    /* a reload: the instance is gone, the chip comes back from storage, Resume seeds the journey */
    S.closeQueryDrawer();
    mem.set("qh.parkedJourney", stored);
    const restored = S.restoreParked()!;
    expect(restored.live).toBe(false);
    S.provideDock(null);
    S.resumeQueryDrawer();
    const r = S.currentDrawerRequest()!;
    expect(r.seed).toEqual({ a: 1 });
    expect(r.resume).toEqual({ step: 1, seen: [0, 1] });
    expect(r.dock, "with no card open, nothing docks").toBeUndefined();
  });
});
