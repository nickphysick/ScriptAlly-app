/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Controls: entry v1 · follow-up 3 — the card's step editor changes an entry's kind and its new date (the app's
 * WeekSlider, counted from the entry's own day), saved through editActivity.
 */
import React from "react";
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
vi.mock("../../../lib/db", async () => (await import("../../../test/pageSmoke")).dbMock());
vi.mock("../../../lib/firebase", async () => (await import("../../../test/pageSmoke")).firebaseMock());
import { QcStepEdit1522, replyDateOf, replySliderOf } from "./QcStepEdit1522";

describe("follow-up 3 · the editor edits the kind and the new date", () => {
  const day = new Date(2026, 10, 24, 0, 0, 0).getTime();
  it("the slider's number and the day it names agree both ways: days with you, weeks with the agent", () => {
    expect(replyDateOf(day, 10, true)).toBe("2026-12-04");
    expect(replySliderOf(day, new Date(2026, 11, 4, 12).getTime(), true)).toBe(10);
    expect(replyDateOf(day, 7, false)).toBe("2027-01-12");
    expect(replySliderOf(day, new Date(2027, 0, 12, 12).getTime(), false)).toBe(7);
    expect(replyDateOf(day, null, true)).toBeNull();
    expect(replySliderOf(day, null, false)).toBeNull();
  });
  const props = (reply: unknown) => ({
    id: "e1", onReopen: () => {}, side: "them" as const, status: null, kind: "reply" as const, title: "Jonathan chased the full", ms: day, mats: [], request: false,
    words: "Any news?", first: "Jonathan", env: {} as never, nowMs: day + 3600_000, floorMs: null, ceilMs: null, deleteText: "", busy: false,
    reply: reply as never, onSave: async () => true, onDelete: async () => true, onCancel: () => {},
  });
  it("an entry's editor draws the kind (three choices) and the app's slider, and no materials", () => {
    const h = renderToStaticMarkup(<QcStepEdit1522 {...props({ kind: "chaser", dateMs: new Date(2026, 11, 4, 12).getTime(), withYou: true })} />);
    expect(h).toContain('data-qc1522="edit-reply-kind"');
    for (const w of ["Chaser", "Holding reply", "Note"]) expect(h).toContain(`>${w}</button>`);
    expect(h).toMatch(/aria-checked="true"[^>]*data-v="chaser"/);
    expect(h).toContain('data-qc1522="edit-reply-date"');
    expect(h).toContain("sa-wk-slider");
    expect(h).toContain("Send by <b>Fri 4 Dec</b>");
    expect(h).not.toContain(">Materials</label>");
  });
  it("with the agent it is the reply time in weeks", () => {
    const h = renderToStaticMarkup(<QcStepEdit1522 {...props({ kind: "holding", dateMs: new Date(2027, 0, 12, 12).getTime(), withYou: false })} />);
    expect(h).toContain(">Reply time</label>");
    expect(h).toContain("Reply expected by <b>Tue 12 Jan</b>");
  });
  it("any other step's editor has neither (a nudge: no materials env needed)", () => {
    const h = renderToStaticMarkup(<QcStepEdit1522 {...props(null)} kind="nudge" side="me" status={null} />);
    expect(h).not.toContain("edit-reply-kind");
    expect(h).not.toContain("edit-reply-date");
  });
  it("the save carries the kind and the date to editActivity, and a corrected legacy row becomes the new type", () => {
    const src = readFileSync("src/components/Queries.tsx", "utf8");
    expect(src).toContain("reply: { words: v.words || null, ...(v.reply ? { kind: v.reply.kind, date: v.reply.date } : {}) } });");
    expect(src).toContain('reply={ed.kind === "reply" && ed.reply ? { kind: ed.reply.kind, dateMs: ed.reply.dateMs, withYou: ed.reply.withYou } : null}');
    const db = readFileSync("src/lib/db.tsx", "utf8");
    expect(db).toContain('Object.assign(subPatch, { type: AGENT_REPLY_NESTED_TYPE, note: "", replyWeeks: deleteField() });');
    expect(db).toContain("feedPatch.activityType = AGENT_REPLY_TYPE;");
  });
});
