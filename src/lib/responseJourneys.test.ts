/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * §2 — THE OUTCOME DECIDES THE JOURNEY (ref design-refs/83-record-response.html).
 *
 * ⚠️ THE FIDDLY PART IS THE RESEAT. Changing the outcome after later steps are filled has to
 * discard what no longer applies AND SAY SO. Keeping it would carry an answer to a question nobody
 * asked into the record; hiding it keeps the same bomb with a longer fuse; dropping it silently
 * takes the writer's work without telling them.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { QueryStatus } from "../types";
import {
  OUTCOME_ORDER, OUTCOME_JOURNEY, OUTCOME_STATUS, JOURNEY_STEPS, stepsFor, changeOutcome, droppedNotice,
  stepHasContent, responseReady, emptyResponseDraft, RESP_STEP_OPTIONAL,
  type ResponseDraft, type RespStep,
} from "./responseDraft";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const pane = read("../components/queries/ResponsePane.tsx");
const css = read("../components/shell/f12.css");

const D = (patch: Partial<ResponseDraft> = {}): ResponseDraft => ({ ...emptyResponseDraft("2026-08-11"), ...patch });

describe("the stack changes with the outcome", () => {
  it("three journeys, each asking its own question", () => {
    expect(JOURNEY_STEPS.request).toEqual(["outcome", "when", "asked", "notes"]);
    expect(JOURNEY_STEPS.offer).toEqual(["outcome", "when", "offer", "notes"]);
    expect(JOURNEY_STEPS.ending).toEqual(["outcome", "when", "said", "notes"]);
  });

  it("and every outcome lands in one of them", () => {
    for (const o of OUTCOME_ORDER) {
      expect(stepsFor(o), `${o} has no stack`).toEqual(JOURNEY_STEPS[OUTCOME_JOURNEY[o]]);
    }
  });

  /* Before an outcome is chosen there is nothing honest to put beneath the question that decides
     it — a stack of steps whose content depends on an unmade choice would be presenting defaults
     as if they were answers. */
  it("before a choice, the stack is only the choice", () => {
    expect(stepsFor(null)).toEqual(["outcome"]);
  });

  /* ⚠️ THE ORDER IS DERIVED WHEREVER IT IS USED. The renderer, the jump and the advance must all
     ask the same question, or Next walks to a step that is not on screen. */
  it("the pane derives its order rather than holding a constant", () => {
    expect(pane).toContain("const order = stepsFor(draft.outcome);");
    expect(pane, "a fixed order would survive an outcome change").not.toMatch(/RESP_STEP_ORDER\s*=/);
    expect(pane).toContain("order={order}");
    expect(pane).toContain("steps={order.map((id) => ({");
  });
});

describe("changing the outcome discards what no longer applies", () => {
  it("an offer's terms do not survive a rejection", () => {
    const withOffer = D({ outcome: "offer", offerTerms: "20% commission", offerReplyBy: "2026-09-01" });
    const { draft, dropped } = changeOutcome(withOffer, "rejected");
    expect(draft.offerTerms, "an answer to a question nobody asked would ride into the record").toBe("");
    expect(draft.offerReplyBy).toBe("");
    expect(dropped).toEqual(["offer"]);
  });

  it("and a request's materials do not survive an offer", () => {
    const withAsk = D({ outcome: "full", askedFor: "The first fifty pages", deadline: "2026-09-01" });
    const { draft, dropped } = changeOutcome(withAsk, "offer");
    expect(draft.askedFor).toBe("");
    expect(draft.deadline).toBe("");
    expect(dropped).toEqual(["asked"]);
  });

  /* ⚠️ WHAT SURVIVES IS AS IMPORTANT AS WHAT GOES. The date and the notes belong to every journey;
     clearing them would punish the writer for changing their mind about one field. */
  it("but the date and the notes are every journey's, and stay", () => {
    const d = D({ outcome: "offer", dateArrived: "2026-07-04", notes: "Lovely email", offerTerms: "x" });
    const { draft } = changeOutcome(d, "rejected");
    expect(draft.dateArrived).toBe("2026-07-04");
    expect(draft.notes).toBe("Lovely email");
    expect(draft.outcome).toBe("rejected");
  });

  /* Two outcomes in the same journey share a stack, so nothing is lost moving between them. */
  it("moving within a journey costs nothing", () => {
    const d = D({ outcome: "partial", askedFor: "Three chapters" });
    const { draft, dropped } = changeOutcome(d, "full");
    expect(draft.askedFor, "both are requests — the answer still applies").toBe("Three chapters");
    expect(dropped).toEqual([]);
  });
});

describe("and it says so — but only when it cost something", () => {
  /* ⚠️ A NOTICE THAT FIRES WHEN NOTHING WAS DISCARDED TEACHES THE WRITER TO IGNORE IT, which is
     exactly when it matters. Silence is the correct output for an empty step. */
  it("an untouched step goes quietly", () => {
    const { dropped } = changeOutcome(D({ outcome: "offer" }), "rejected");
    expect(dropped).toEqual([]);
    expect(droppedNotice(dropped)).toBeNull();
  });

  it("a filled one is named", () => {
    const { dropped } = changeOutcome(D({ outcome: "offer", offerTerms: "20%" }), "rejected");
    expect(droppedNotice(dropped)).toBe("Changing the outcome cleared what you'd entered under the offer.");
  });

  it("whitespace is not content", () => {
    expect(stepHasContent(D({ offerTerms: "   " }), "offer")).toBe(false);
    expect(stepHasContent(D({ offerTerms: "20%" }), "offer")).toBe(true);
  });

  /* The notice is a statement of what happened, not an alarm — quiet treatment, no red, and it
     announces itself without stealing focus. */
  it("it is announced without taking focus, and drawn quietly", () => {
    expect(pane).toContain('<p className="qr-dropped" role="status">');
    const rule = css.slice(css.indexOf(".qr-dropped {"), css.indexOf("}", css.indexOf(".qr-dropped {")));
    expect(rule, "the notice rule is missing").not.toBe("");
    expect(rule, "no alarm colour").not.toMatch(/#[0-9a-fA-F]{3,6}/);
  });
});

describe("the position is reseated with the fields", () => {
  /* `reached` can point at a step the new journey does not have; left dangling it would put the
     stack into a state whose index is -1. */
  it("the host clamps the writer's place into the new order", () => {
    const queries = read("../components/Queries.tsx");
    const at = queries.indexOf("onOutcomeChange={(next, lost) => {");
    expect(at, "the outcome-change door is missing").toBeGreaterThan(-1);
    const body = queries.slice(at, queries.indexOf("}}", at));
    expect(body).not.toBe("");
    expect(body).toContain("setRespDropped(lost);");
    expect(body).toContain("reseatInto(order, order, cur.active, cur.reached)");
  });

  /* ⚠️ ONE DOOR. Two callbacks could be wired singly, and then the fields would clear without the
     notice — or the notice would fire without the clear. */
  it("the draft and the notice travel together", () => {
    expect(pane).toContain("onOutcomeChange: (next: ResponseDraft, dropped: RespStep[]) => void;");
    expect(pane, "setting the outcome directly would keep the old journey's fields")
      .not.toContain("set({ outcome:");
  });
});

describe("required is still not sequential", () => {
  /* The rule the create stack is built on, inherited whole: Save waits for the outcome and the
     date, and every step after them is optional BY CONSTRUCTION. */
  it("save is live with every later step unvisited, in every journey", () => {
    for (const o of OUTCOME_ORDER) {
      expect(responseReady(D({ outcome: o })), `${o} demands more than it should`).toBe(true);
    }
  });

  it("and every step after the date declares itself optional", () => {
    for (const s of ["asked", "offer", "said", "notes"] as RespStep[]) {
      expect(RESP_STEP_OPTIONAL[s], `${s} is not marked optional`).toBe(true);
    }
    expect(RESP_STEP_OPTIONAL.outcome).toBe(false);
    expect(RESP_STEP_OPTIONAL.when).toBe(false);
  });
});

/* ══════════════════════════════════════════════════════════════════════════════════════════
   ⚠️ RECORDING A RESPONSE RESOLVES THE NUDGE TASK BY CONSTRUCTION — there is nothing to close, and
   building a resolver would be WORSE than nothing, because the next person would believe it was
   doing something.

   Tasks are DERIVED per render in `db.tsx` from the queries themselves (`calculatedTasks`); only
   suppression is stored. `replyTask` will only chase a reply on the agent's-court statuses, so the
   moment a response moves the query off one of them the nudge simply stops being produced.

   This is the guard on that reasoning: if a future outcome ever mapped BACK to an awaiting status,
   the nudge would survive its own answer and this fails.
   ══════════════════════════════════════════════════════════════════════════════════════════ */
describe("the nudge resolves itself, so nothing resolves it", () => {
  it("no outcome leaves the query on a status that still chases a reply", () => {
    const AWAITING = [QueryStatus.QUERIED, QueryStatus.PARTIAL_SENT, QueryStatus.FULL_SENT];
    for (const o of OUTCOME_ORDER) {
      expect(AWAITING, `${o} would leave the nudge task alive after its own answer`)
        .not.toContain(OUTCOME_STATUS[o]);
    }
  });

  /* The gate this rests on, asserted where it lives — so narrowing it fails here rather than
     quietly resurrecting a task nobody can dismiss. */
  it("and the gate it rests on still reads the agent's-court statuses", () => {
    const prec = read("./taskPrecedence.ts");
    /* ⚠️ REPOINTED (§5): the gate moved DOWN into `replyDeadlineMs`, which `replyTask` and the list's
       OVERDUE group now both read — one deadline, one status test, no second clock. The clause is
       unchanged and is asserted at its new home; `if (!awaiting) return "none"` became
       `return NaN`, because a deadline that does not exist is not a verb that does not apply. */
    expect(prec).toContain("const awaiting = status === QueryStatus.QUERIED || status === QueryStatus.PARTIAL_SENT || status === QueryStatus.FULL_SENT;");
    expect(prec).toContain("if (!awaiting) return NaN;");
    expect(prec, "replyTask stopped reading the shared deadline — the gate would be restated")
      .toContain("const deadlineMs = replyDeadlineMs(inp);");
    expect(prec, "an unplaceable query stopped returning none").toContain('if (Number.isNaN(deadlineMs)) return "none";');
  });

  it("and no resolver was built for a task that deletes itself", () => {
    const queries = read("../components/Queries.tsx");
    const save = queries.slice(queries.indexOf("const saveResponse = async"), queries.indexOf("/** The picker's inline quick-add"));
    expect(save).not.toBe("");
    for (const w of ["dismissTask", "resolveTaskFlag", "nudge_overdue"]) {
      expect(save, `${w} here would be machinery pretending to do work`).not.toContain(w);
    }
  });
});
