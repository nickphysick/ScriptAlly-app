/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v152.2 §3.2 — the footer's table, state by state; §1 — the Group menu, the header fills, the wait words.
 */
import { describe, expect, it } from "vitest";
import { QueryStatus } from "../types";
import { band1522, footer1522, type FootCtx } from "./qcFoot1522";
import { ACTION_LABEL, GROUP_1522, head1522, listGroupOf, savedGroupOf, waitWords } from "./qc1522";

const DAY = 86_400_000;
const NOW = new Date(2026, 9, 8, 12).getTime(); // 8 Oct
const base: FootCtx = {
  state: "agent", status: QueryStatus.QUERIED, first: "Priya", fullName: "Priya Raman", nowMs: NOW, phase: null, dueMs: null, replyMs: null,
  nudgeMs: null, quietWeeks: 4, closeLeads: false, toTell: 0, askedFor: null, closedMs: null, closedHow: null,
};
const f = (o: Partial<FootCtx>) => footer1522({ ...base, ...o });

describe("v152.2 §3.2 the footer", () => {
  it("offer: N days left and who wants the answer; Answer the offer", () => {
    const x = f({ state: "offer", status: QueryStatus.OFFER, first: "Tom", phase: "offer", dueMs: NOW + DAY });
    expect([x.lead, x.sub, x.button?.label, x.link]).toEqual(["Tom made an offer", "1 day left · Tom wants an answer by 9 Oct", "Answer the offer", null]);
  });
  it("deciding: answer by, how many to tell, and Tell them only while some are left", () => {
    const a = f({ state: "offer", status: QueryStatus.OFFER, phase: "deciding", dueMs: NOW + DAY, toTell: 6 });
    expect([a.lead, a.sub, a.button?.label, a.link?.label]).toEqual(["Deciding", "Answer by 9 Oct · 6 to tell", "Accept or decline", "Tell them"]);
    const b = f({ state: "offer", status: QueryStatus.OFFER, phase: "deciding", dueMs: NOW + DAY, toTell: 0 });
    expect([b.sub, b.link]).toEqual(["Answer by 9 Oct · all agents told", null]);
  });
  it("signed: You have an agent, no button, one to-do however many agents it names", () => {
    const x = f({ state: "closed", status: QueryStatus.SIGNED, phase: "signed", fullName: "Tom Ellery", closedMs: NOW, toTell: 4 });
    expect([x.lead, x.sub, x.button]).toEqual(["You have an agent", "Signed with Tom Ellery · 8 Oct · 1 to-do left", null]);
  });
  it("materials: late in rust with the due day; the button names the material", () => {
    const x = f({ state: "materials", status: QueryStatus.PARTIAL_REQUESTED, dueMs: NOW - 8 * DAY });
    expect([x.lead, x.sub, x.late, x.button?.label]).toEqual(["Send the partial", "8 days late · was due 30 Sep", true, "Mark partial sent"]);
    expect(f({ state: "materials", status: QueryStatus.FULL_REQUESTED, dueMs: NOW + 5 * DAY }).button?.label).toBe("Mark full sent");
    expect(f({ state: "materials", status: QueryStatus.PARTIAL_REQUESTED, askedFor: "A synopsis" }).lead).toBe("Send a synopsis");
    expect(f({ state: "materials", status: QueryStatus.REVISE_RESUBMIT, dueMs: NOW + 30 * DAY }).button?.label).toBe("Mark resubmitted");
  });
  it("nudge due: Nudge, with Close it as the link; never '0 days ago'", () => {
    const x = f({ state: "nudge", replyMs: NOW - 12 * DAY });
    expect([x.lead, x.sub, x.button?.label, x.link?.label]).toEqual(["No reply from Priya yet", "Reply was due 26 Sep · 12 days ago", "Nudge", "Close it"]);
    expect(f({ state: "nudge", replyMs: NOW }).sub).not.toMatch(/\b0 days/);
  });
  it("with the agent: reply expected, or nudged today and when it goes quiet", () => {
    expect(f({ replyMs: NOW + 21 * DAY }).sub).toBe("Reply expected by 29 Oct");
    expect(f({ nudgeMs: NOW }).sub).toBe("Nudged today · goes quiet on 5 Nov");
    expect(f({ replyMs: NOW }).button).toEqual({ label: "Record a response", tone: "outline", act: "resp" });
  });
  it("gone quiet: the close rule decides which leads", () => {
    const n = f({ state: "quiet", replyMs: NOW - 37 * DAY, closeLeads: false });
    expect([n.sub, n.button?.label, n.link?.label]).toEqual(["Reply was due 1 Sep · not nudged yet", "Nudge", "Close it"]);
    const d = f({ state: "quiet", replyMs: NOW - 80 * DAY, nudgeMs: NOW - 57 * DAY, closeLeads: true });
    expect([d.sub, d.button?.label, d.link?.label]).toEqual(["Nudged 12 Aug · quiet since 9 Sep", "Close it", "Nudge again"]);
    const l = f({ state: "quiet", replyMs: NOW - 63 * DAY, closeLeads: true });
    expect([l.sub, l.button?.label, l.link?.label]).toEqual(["Reply was due 6 Aug · quiet for 9 weeks", "Close it", "Nudge"]);
  });
  it("closed: how it closed and when; Reopen", () => {
    const x = f({ state: "closed", status: QueryStatus.REJECTED, first: "George", closedMs: NOW - 3 * DAY, closedHow: "passed" });
    expect([x.lead, x.sub, x.button?.label]).toEqual(["Closed", "George passed · 5 Oct", "Reopen"]);
    expect(f({ state: "closed", status: QueryStatus.WITHDRAWN, closedHow: "declined", closedMs: NOW }).sub).toBe("You declined · 8 Oct");
  });
  it("§2.1 bands: navy with white text but Gone quiet and Closed", () => {
    for (const s of ["offer", "materials", "nudge", "agent"] as const) expect(band1522(s, null, "g")).toMatchObject({ bg: "#2a3a52", dark: true });
    expect(band1522("quiet", null, "g")).toMatchObject({ bg: "g", dark: false });
    expect(band1522("closed", null, "g")).toMatchObject({ bg: "#f1efec", dark: false });
    expect(band1522("closed", "signed", "g")).toMatchObject({ bg: "#2a3a52", word: "OFFER ACCEPTED" });
    expect(band1522("offer", "deciding", "g").word).toBe("DECIDING");
  });
});

describe("v152.2 §1 the list", () => {
  it("the Group menu is Status, Action, Package; the retired two read as Action", () => {
    expect(GROUP_1522.map((g) => g.label)).toEqual(["Status", "Action", "Package"]);
    expect(listGroupOf("action", true)).toBe("attention");
    expect(listGroupOf("package", false)).toBe("attention");
    expect(listGroupOf("none", true)).toBe("none");
    expect(savedGroupOf("none")).toBe("attention");
    expect(ACTION_LABEL.agent).toBe("Watch and wait");
  });
  it("§1.2 header kinds", () => {
    expect(head1522("package", "pkg:Light")).toEqual({ fill: "#ffffff", kind: "pkg" });
    expect(head1522("package", "pkg:none")).toEqual({ fill: "#f6f3ee", kind: "pkg-none" });
    expect(head1522("status", "closed")).toEqual({ fill: "#f8f7f5", kind: "closed" });
    expect(head1522("attention", "offer").fill).toBe("color-mix(in srgb, #2a3a52 18%, #fff)");
  });
  it("§1.7 waits: Same day, 1 day later, N days later", () => {
    expect([waitWords(0), waitWords(1), waitWords(44)]).toEqual(["Same day", "1 day later", "44 days later"]);
  });
});
