/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Log a query v1.3 — the Nudge stage's model (the date maths, the card offer, what each choice saves) and the slip's
 * "Next" fact, read through the real save record (`logPayload` → `buildQcRows` → `stampRows`, via `previewOf`).
 */
import { describe, expect, it } from "vitest";
import { QueryStatus, SubmissionMethod, SubmissionStatus, type Agent } from "../../types";
import { closeDateIso, logPayload, saveLog } from "./logSave";
import {
  cardOffer, cardWeeksToSave, expectOf, nudgeAnswer, nudgeChips, nudgeDateOf, planOf, previewOf, replyDefaults, replyPlan, replyReady,
  toggleUnknown, withWeeks, STAGES, STAGE_LABEL, type LogAnswers, type PlanContext, type ReplyAnswers,
} from "./logStages";
import { nextFact, planLine } from "../qc153";

/* Monday 9 November 2026, the mock's today */
const NOW = new Date(2026, 10, 9, 12).getTime();
const SENT = new Date(2026, 10, 9).getTime();
const day = (d: Date | null) => (d ? `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}` : null);
const ag = (id: string, name: string, x: Partial<Agent> = {}): Agent => ({
  id, name, agency: "Hartley & Co", email: "", submissionStatus: SubmissionStatus.OPEN, submissionMethod: SubmissionMethod.EMAIL,
  materialsWanted: [], responseTimeWeeks: 8, noResponseMeansNo: false, ...x,
} as unknown as Agent);
const MARCUS = ag("mr", "Marcus Reed");
const JOANNA = ag("jl", "Joanna Lindqvist", { responseTimeWeeks: undefined });
const ROSALIND = ag("rb", "Rosalind Burke", { responseTimeWeeks: 6, noResponseMeansNo: true });
const CTX: PlanContext = { manuscriptId: "m", agents: [MARCUS, JOANNA, ROSALIND], packages: [], letters: [{ id: "la", name: "Letter A" }], synopses: [], bookVersions: [] };
const answers = (agentId: string, reply?: ReplyAnswers): LogAnswers => ({
  agentId, sent: SENT, via: SubmissionMethod.EMAIL, packageId: null, letterId: "la", synopsisId: null, sample: null, note: "", ...(reply ? { reply } : {}),
});

describe("v1.3 · the track", () => {
  it("has six nodes, Nudge between How and Log", () => {
    expect(STAGES).toEqual(["who", "when", "what", "how", "nudge", "check"]);
    expect(STAGES.map((k) => STAGE_LABEL[k])).toEqual(["Agent", "Sent", "Materials", "How", "Nudge", "Log"]);
  });
});

describe("v1.3 · the stage's opening answers", () => {
  it("starts from the card's weeks, a week after the reply date", () => {
    expect(replyDefaults(MARCUS)).toEqual({ wk: 8, saveWk: false, ifNo: "nudge", nWhen: "week", nPick: null });
  });
  it("starts Unknown when the card has none, counting the reminder from the day it went", () => {
    expect(replyDefaults(JOANNA)).toEqual({ wk: null, saveWk: false, ifNo: "nudge", nWhen: "8w", nPick: null });
  });
  it("starts on Close it where the card says no reply means no", () => {
    expect(replyDefaults(ROSALIND).ifNo).toBe("close");
  });
  it("but not when there is no reply time to close on", () => {
    expect(replyDefaults(ag("x", "X Y", { responseTimeWeeks: undefined, noResponseMeansNo: true })).ifNo).toBe("nudge");
  });
});

describe("v1.3 · the date maths", () => {
  it("the reply date is the day it went plus the weeks; Unknown has none", () => {
    expect(day(expectOf(SENT, 8))).toBe("2027-1-4");
    expect(day(expectOf(SENT, 6))).toBe("2026-12-21");
    expect(expectOf(SENT, null)).toBeNull();
  });
  it("with a reply date the chips count from it: on the day, a week later, two weeks later", () => {
    expect(nudgeChips(SENT, 8).map((c) => [c.k, c.label, day(c.d)])).toEqual([
      ["w0", "On the day", "2027-1-4"], ["week", "A week later", "2027-1-11"], ["2w", "Two weeks later", "2027-1-18"],
    ]);
  });
  it("with Unknown they count from the day it went: 6, 8 and 12 weeks", () => {
    expect(nudgeChips(SENT, null).map((c) => [c.k, c.label, day(c.d)])).toEqual([
      ["6w", "In 6 weeks", "2026-12-21"], ["8w", "In 8 weeks", "2027-1-4"], ["12w", "In 12 weeks", "2027-2-1"],
    ]);
  });
  it("a reminder that would fall on a weekend moves to the Monday, as the old journey's did", () => {
    const sat = new Date(2026, 10, 7).getTime();
    expect(day(nudgeDateOf({ wk: 8, saveWk: false, ifNo: "nudge", nWhen: "w0", nPick: null }, sat))).toBe("2027-1-4");
  });
  it("each chip is the nudge date; Pick a date is the picked day, and waits for one", () => {
    const r = replyDefaults(MARCUS);
    expect(day(nudgeDateOf({ ...r, nWhen: "w0" }, SENT))).toBe("2027-1-4");
    expect(day(nudgeDateOf(r, SENT))).toBe("2027-1-11");
    expect(day(nudgeDateOf({ ...r, nWhen: "2w" }, SENT))).toBe("2027-1-18");
    expect(nudgeDateOf({ ...r, nWhen: "pick" }, SENT)).toBeNull();
    expect(replyReady({ ...r, nWhen: "pick" })).toBe(false);
    const pick = new Date(2026, 11, 2, 15).getTime();
    expect(day(nudgeDateOf({ ...r, nWhen: "pick", nPick: pick }, SENT))).toBe("2026-12-2");
    expect(replyReady({ ...r, nWhen: "pick", nPick: pick })).toBe(true);
  });
  it("Close it and No reminder have no nudge date", () => {
    expect(nudgeDateOf({ ...replyDefaults(MARCUS), ifNo: "close" }, SENT)).toBeNull();
    expect(nudgeDateOf({ ...replyDefaults(MARCUS), ifNo: "none" }, SENT)).toBeNull();
  });
  it("the track's answer under Nudge is the date, Close it, or None", () => {
    const r = replyDefaults(MARCUS);
    expect(nudgeAnswer(r, SENT)).toBe("11 Jan");
    expect(nudgeAnswer({ ...r, ifNo: "close" }, SENT)).toBe("Close it");
    expect(nudgeAnswer({ ...r, ifNo: "none" }, SENT)).toBe("None");
  });
});

describe("v1.3 · the slider and Unknown", () => {
  it("moving the slider on a blank card ticks the save; on a card that says something it does not", () => {
    expect(withWeeks(replyDefaults(JOANNA), 6, null)).toMatchObject({ wk: 6, saveWk: true, nWhen: "week" });
    expect(withWeeks(replyDefaults(MARCUS), 10, 8)).toMatchObject({ wk: 10, saveWk: false, nWhen: "week" });
  });
  it("moving it keeps a chip that counts from the reply date, and a picked date", () => {
    expect(withWeeks({ ...replyDefaults(MARCUS), nWhen: "2w" }, 10, 8).nWhen).toBe("2w");
    expect(withWeeks({ ...replyDefaults(MARCUS), nWhen: "pick" }, 10, 8).nWhen).toBe("pick");
  });
  it("Unknown drops Close it (it needs a reply date) and moves the chips to count from the send", () => {
    expect(toggleUnknown({ ...replyDefaults(ROSALIND) }, 6)).toMatchObject({ wk: null, ifNo: "nudge", nWhen: "8w", saveWk: false });
  });
  it("pressing Unknown again puts the card's weeks back, else 8", () => {
    expect(toggleUnknown(toggleUnknown(replyDefaults(MARCUS), 8), 8)).toMatchObject({ wk: 8, nWhen: "week" });
    expect(toggleUnknown(replyDefaults(JOANNA), null).wk).toBe(8);
  });
});

describe("v1.3 · the offer to save to the card", () => {
  it("a blank card and a weeks set → Save (ticked by default)", () => {
    expect(cardOffer(null, 6)).toEqual({ kind: "save", n: 6 });
    expect(withWeeks(replyDefaults(JOANNA), 6, null).saveWk).toBe(true);
  });
  it("a card moved off its weeks → Update (unticked by default)", () => {
    expect(cardOffer(8, 10)).toEqual({ kind: "update", n: 10, was: 8 });
    expect(withWeeks(replyDefaults(MARCUS), 10, 8).saveWk).toBe(false);
  });
  it("unchanged, or Unknown → no offer", () => {
    expect(cardOffer(8, 8)).toBeNull();
    expect(cardOffer(null, null)).toBeNull();
    expect(cardOffer(8, null)).toBeNull();
  });
  it("the card is saved only when the offer stands and is ticked", () => {
    expect(cardWeeksToSave({ ...replyDefaults(JOANNA), wk: 6, saveWk: true }, null)).toBe(6);
    expect(cardWeeksToSave({ ...replyDefaults(JOANNA), wk: 6, saveWk: false }, null)).toBeNull();
    expect(cardWeeksToSave({ ...replyDefaults(MARCUS), wk: 8, saveWk: true }, 8)).toBeNull();
    expect(cardWeeksToSave({ ...replyDefaults(MARCUS), wk: null, saveWk: true }, 8)).toBeNull();
  });
});

/** a db that records what the log save writes */
function fakeDb() {
  const added: Record<string, unknown>[] = [];
  const updated: [string, Record<string, unknown>][] = [];
  return {
    added, updated,
    db: {
      addQuery: async (q: Record<string, unknown>) => { added.push(q); return { success: true }; },
      updateQuery: async (id: string, f: Record<string, unknown>) => { updated.push([id, f]); return { success: true }; },
    } as never,
  };
}

describe("v1.3 · what each choice saves (the old journey's fields, through the shared log save)", () => {
  it("Remind me: the nudge date (which raises the \"Nudge {First}\" to-do on its day), no close date", async () => {
    const f = fakeDb();
    await saveLog(f.db, planOf(answers("mr", replyDefaults(MARCUS)), CTX, "q1", false)!);
    expect(f.added[0]).toMatchObject({ ifNoResponse: "Remind me to nudge" });
    expect(String(f.added[0].nudgeDate).slice(0, 10)).toBe(new Date(2027, 0, 11, 12).toISOString().slice(0, 10));
    expect(f.added[0].writerExpectedDate).toBeUndefined();
    expect(f.updated).toEqual([]);
  });
  it("Close it: the close date, the day after the reply date, and no nudge", async () => {
    const f = fakeDb();
    await saveLog(f.db, planOf(answers("rb", replyDefaults(ROSALIND)), CTX, "q2", false)!);
    expect(f.added[0]).toMatchObject({ ifNoResponse: "Mark as no response automatically" });
    expect(f.added[0].nudgeDate).toBeUndefined();
    /* in the query's own write: an update straight after the add found no query and wrote nothing */
    expect(f.added[0]).toMatchObject({ status: QueryStatus.QUERIED, responseDeadline: closeDateIso(new Date(2026, 11, 21)) });
    expect(f.updated).toEqual([]);
    expect(new Date(closeDateIso(new Date(2026, 11, 21))).getDate()).toBe(22);
  });
  it("No reminder: neither", async () => {
    const f = fakeDb();
    await saveLog(f.db, planOf(answers("mr", { ...replyDefaults(MARCUS), ifNo: "none" }), CTX, "q3", false)!);
    expect(f.added[0]).toMatchObject({ ifNoResponse: "Do nothing" });
    expect(f.added[0].nudgeDate).toBeUndefined();
    expect(f.updated).toEqual([]);
  });
  it("Unknown saves no expected reply date (no 8-week house date); its reminder counts from the send", async () => {
    const f = fakeDb();
    await saveLog(f.db, planOf(answers("jl", replyDefaults(JOANNA)), CTX, "q4", false)!);
    expect(f.added[0].writerExpectedDate).toBeUndefined();
    expect(String(f.added[0].nudgeDate).slice(0, 10)).toBe(new Date(2027, 0, 4, 12).toISOString().slice(0, 10));
  });
  it("a reply time that is not the card's is the writer's date; the card's own is derived, so not stored", () => {
    expect(logPayload(planOf(answers("jl", { ...replyDefaults(JOANNA), wk: 6 }), CTX, "q", false)!).payload.writerExpectedDate)
      .toBe(new Date(2026, 11, 21, 12).toISOString());
    expect(logPayload(planOf(answers("mr", { ...replyDefaults(MARCUS), wk: 10 }), CTX, "q", false)!).payload.writerExpectedDate)
      .toBe(new Date(2027, 0, 18, 12).toISOString());
    expect(logPayload(planOf(answers("mr", replyDefaults(MARCUS)), CTX, "q", false)!).payload.writerExpectedDate).toBeUndefined();
  });
  it("Close it with Unknown cannot happen: it saves as no reminder", () => {
    expect(replyPlan({ wk: null, saveWk: false, ifNo: "close", nWhen: "8w", nPick: null }, JOANNA, SENT)).toMatchObject({ expect: null, ifNo: "nothing", nudgeDate: null });
  });
  it("answers with no Nudge stage answer take the agent's defaults", () => {
    expect(planOf(answers("rb"), CTX, "q", false)).toMatchObject({ ifNo: "close", nudgeDate: null });
  });
});

describe("v1.3 · the slip's Next fact", () => {
  const nx = (agent: Agent, r: ReplyAnswers) => {
    const plan = planOf(answers(agent.id, r), CTX, "pv", false)!;
    return nextFact(previewOf(plan, NOW, 4).row, NOW);
  };
  it("a reply date and a nudge: \"Reply expected by\", the date, and the nudge planned", () => {
    expect(nx(MARCUS, replyDefaults(MARCUS))).toMatchObject({ label: "Reply expected by", value: "4 Jan", line: "Nudge scheduled for 11 Jan" });
  });
  it("Close it: the day it closes", () => {
    expect(nx(MARCUS, { ...replyDefaults(MARCUS), ifNo: "close" })).toMatchObject({ label: "Reply expected by", value: "4 Jan", line: "Closes 5 Jan if no reply" });
  });
  it("No reminder: no nudge planned", () => {
    expect(nx(MARCUS, { ...replyDefaults(MARCUS), ifNo: "none" })).toMatchObject({ label: "Reply expected by", value: "4 Jan", line: "No nudge planned" });
  });
  it("the progress bar stays with the reply date", () => {
    expect(nx(MARCUS, replyDefaults(MARCUS)).bar).not.toBeNull();
  });
  it("no reply date but a nudge: the nudge leads", () => {
    expect(nx(JOANNA, replyDefaults(JOANNA))).toMatchObject({ label: "Nudge scheduled for", value: "4 Jan", line: "no reply date set", bar: null });
  });
  it("neither: Next, No reply date, add a response time", () => {
    expect(nx(JOANNA, { ...replyDefaults(JOANNA), ifNo: "none" })).toMatchObject({ label: "Next", value: "No reply date", line: "add a response time" });
  });
  it("late is unchanged: N days late, time for a nudge", () => {
    const sent = new Date(2026, 8, 1).getTime();
    const plan = planOf({ ...answers("mr", { ...replyDefaults(MARCUS), ifNo: "none" }), sent }, CTX, "pv", false)!;
    const f = nextFact(previewOf(plan, NOW, 4).row, NOW);
    expect(f.label).toBe("Next");
    expect(f.hot).toBe(true);
    expect(f.line).toBe("time for a nudge");
  });
  it("the retired words are gone", () => {
    for (const r of [replyDefaults(MARCUS), { ...replyDefaults(MARCUS), ifNo: "close" as const }]) {
      expect(JSON.stringify(nx(MARCUS, r))).not.toMatch(/then nudge|or it.s a no|reply by/);
    }
  });
  it("a Query Centre row reads the same fields: a stored nudge date ahead, else an auto-close date", () => {
    const row = (q: Record<string, unknown>) => ({ query: { id: "x", status: QueryStatus.QUERIED, ...q } }) as never;
    expect(planLine(row({ nudgeDate: "2027-01-11T12:00:00.000Z" }), NOW)).toBe("Nudge scheduled for 11 Jan");
    expect(planLine(row({ nudgeDate: "2026-11-01T12:00:00.000Z" }), NOW)).toBe("No nudge planned");
    expect(planLine(row({ ifNoResponse: "Mark as no response automatically", responseDeadline: closeDateIso(new Date(2027, 0, 4)) }), NOW)).toBe("Closes 5 Jan if no reply");
  });
});
