/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ THE DECLARATION IS COMPLETE, AND ITS COMPLETENESS IS THE POINT. Every claim below is swept
 * over the WHOLE union rather than over the journeys someone thought to list — a journey added
 * without a fork, or a flow without a primary, has to fail here or at the compiler, and the
 * compiler half is proved in the run report by adding a member and reading the error.
 */
import { describe, it, expect } from "vitest";
import {
  JOURNEYS, JOURNEY_DEED_BUCKET, journeyIdFor, flowFor, intentOf, crossoverOf, CROSSOVER_REASON,
  type JourneyId,
} from "./journeys";
import { deedSentence } from "./todoBuckets";
import { requiredFor } from "./paneGate";
import { BoardCard } from "./todoBoard";

/* every member, listed once — the compiler checks this list is complete */
const IDS: JourneyId[] = ["send", "nudge", "close", "fillin", "note", "offer", "agentgap", "bulk"];

const card = (over: Partial<BoardCard> = {}): BoardCard =>
  ({ key: "k", stream: "do", title: "t", who: "", subtitle: "", due: "", kind: "", warn: false,
     snoozes: 0, hk: false, initials: "A", record: "", committed: false, done: false,
     taskType: "full_requested", relatedRecordId: "q1", ...over }) as BoardCard;

describe("⚠️ every journey is declared, and the declaration is exhaustive", () => {
  it("the union and the table agree — no journey is declared that the union does not name", () => {
    expect(Object.keys(JOURNEYS).sort()).toEqual([...IDS].sort());
  });

  it("every journey has a fork with a label and 2–3 options", () => {
    for (const id of IDS) {
      const j = JOURNEYS[id];
      expect(j.fork.label.trim().length, `${id} has no fork label`).toBeGreaterThan(0);
      expect(j.fork.options.length, `${id} has no intents`).toBeGreaterThan(0);
      /* ⚠️ THE CONTRACT DRAWS 2–3. The three journeys it does not draw carry ONE — an honest fork
         where there is one thing to do — so the ceiling is asserted and the floor is one. */
      expect(j.fork.options.length, `${id} offers more than a fork`).toBeLessThanOrEqual(3);
    }
  });

  it("every journey has at least one flow, and every intent resolves", () => {
    for (const id of IDS) {
      const j = JOURNEYS[id];
      expect(Object.keys(j.flows).length, `${id} has no flow`).toBeGreaterThan(0);
      for (const o of j.fork.options) {
        if (o.target.kind === "flow") {
          expect(j.flows[o.target.flow], `${id}:${o.id} targets a flow that does not exist`).toBeTruthy();
        } else {
          expect(JOURNEYS[o.target.journey], `${id}:${o.id} crosses to a journey that does not exist`).toBeTruthy();
        }
      }
    }
  });

  /* ⚠️ EVERY FLOW, NOT EVERY FLOW SOMEONE REMEMBERED — swept over `Object.values`, so a flow added
     without a primary fails here even if no intent points at it yet. */
  it("every flow has a primary, a required list and a write", () => {
    let swept = 0;
    for (const id of IDS) {
      for (const [flowId, f] of Object.entries(JOURNEYS[id].flows)) {
        swept++;
        expect(f.primary.trim().length, `${id}.${flowId} has no primary`).toBeGreaterThan(0);
        expect(Array.isArray(f.questions), `${id}.${flowId} has no required list`).toBe(true);
        expect(f.writes?.kind, `${id}.${flowId} declares no write`).toBeTruthy();
        expect(Array.isArray(f.links), `${id}.${flowId} does not say which optional fields it offers`).toBe(true);
        expect(f.strip, `${id}.${flowId} declares no strip grammar`).toBeTruthy();
      }
    }
    /* the guard on the guard — an empty sweep passes every assertion above */
    expect(swept, "no flows were swept — this case measured nothing").toBeGreaterThan(10);
  });

  it("every intent id is unique within its journey, and every option states both lines", () => {
    for (const id of IDS) {
      const ids = JOURNEYS[id].fork.options.map((o) => o.id);
      expect(new Set(ids).size, `${id} repeats an intent id`).toBe(ids.length);
      for (const o of JOURNEYS[id].fork.options) {
        expect(o.title.trim().length, `${id}:${o.id} has no title`).toBeGreaterThan(0);
        expect(o.subtitle.trim().length, `${id}:${o.id} has no subtitle`).toBeGreaterThan(0);
      }
    }
  });
});

describe("⚠️ crossovers carry their reason", () => {
  /* ⚠️ THE WRITER IS NEVER ASKED TO CATEGORISE THEIR OWN DISAPPOINTMENT. Closing after a silence
     is `no_reply`; closing because you decided not to send is `withdrawn`. Same destination flow,
     different fact — so every crossover into `close` must name which. */
  it("every crossover into close declares a reason, and they are not the same reason", () => {
    const crossings: string[] = [];
    for (const id of ["send", "nudge", "close", "fillin", "note", "offer", "agentgap", "bulk"] as JourneyId[]) {
      for (const o of JOURNEYS[id].fork.options) {
        const to = crossoverOf(id, o.id);
        if (to !== "close") continue;
        crossings.push(`${id}:${o.id}`);
        expect(CROSSOVER_REASON[`${id}:${o.id}`], `${id}:${o.id} crosses to close without a reason`)
          .toBeTruthy();
      }
    }
    expect(crossings.length, "no crossover into close — this case measured nothing").toBeGreaterThan(0);
    expect(CROSSOVER_REASON["send:wont"], "not sending is a WITHDRAWAL, not a silence").toBe("withdrawn");
    expect(CROSSOVER_REASON["nudge:toclose"], "giving up after silence is a no-reply").toBe("no_reply");
  });

  it("a crossover has no flow in its own journey — it swaps the journey", () => {
    expect(flowFor("send", "wont")).toBeUndefined();
    expect(crossoverOf("send", "wont")).toBe("close");
    /* and the reverse pair, so the two are each other's second thoughts as the contract says */
    expect(crossoverOf("close", "nudgefirst")).toBe("nudge");
    expect(crossoverOf("nudge", "toclose")).toBe("close");
  });
});

describe("⚠️ one resolver, and it agrees with the shipped behaviour", () => {
  it("every card kind lands on a journey, and the two the pane hands off are declared as such", () => {
    expect(journeyIdFor(card({ taskType: "full_requested" }))).toBe("send");
    expect(journeyIdFor(card({ taskType: "partial_requested" }))).toBe("send");
    expect(journeyIdFor(card({ taskType: "revise_resubmit" }))).toBe("send");
    expect(journeyIdFor(card({ taskType: "nudge_overdue" }))).toBe("nudge");
    expect(journeyIdFor(card({ taskType: "no_response_close" }))).toBe("close");
    expect(journeyIdFor(card({ taskType: "materials_unrecorded" }))).toBe("fillin");
    expect(journeyIdFor(card({ taskType: "materials_unrecorded_bulk" }))).toBe("bulk");
    expect(journeyIdFor(card({ taskType: "offer_received" }))).toBe("offer");
    expect(journeyIdFor(card({ taskType: "data_quality_poor" }))).toBe("agentgap");
    expect(journeyIdFor(card({ userTaskId: "u1", taskType: undefined }))).toBe("note");
  });

  /**
   * ⚠️ THE DECLARATION REPRODUCES TODAY'S REQUIRED LISTS, WHICH IS WHAT MAKES PHASE 2 SAFE. The
   * per-journey list is about to be replaced by the per-FLOW one; asserting they agree on the
   * default intent proves the new source says what the shipped one says before anything switches
   * over. The chase is the ONE deliberate difference and is asserted as such.
   */
  it("each journey's first flow requires what the shipped per-journey list requires", () => {
    const firstFlow = (id: JourneyId) => flowFor(id, JOURNEYS[id].fork.options[0].id)?.questions ?? [];
    expect(firstFlow("send")).toEqual(requiredFor("send"));
    expect(firstFlow("close")).toEqual(requiredFor("close"));
    expect(firstFlow("fillin")).toEqual(requiredFor("fix"));
    expect(firstFlow("bulk")).toEqual(requiredFor("bulk"));
    expect(firstFlow("note")).toEqual(requiredFor("note"));
    expect(firstFlow("offer")).toEqual(requiredFor("decide"));
  });

  /* ⚠️ THE ONE DIFFERENCE, AND IT IS THE ROUND'S REAL BUG. `requiredFor("chase")` is `[]` while
     `paneCommitValues` supplies `checkBackDays: DEFAULT_CHECKBACK_DAYS` — so a nudge logged from
     the pane today writes a check-in date the writer never chose. The declaration requires it. */
  it("the nudge REQUIRES its check-in, which the shipped list does not", () => {
    expect(requiredFor("chase"), "the shipped chase asked nothing").toEqual([]);
    expect(flowFor("nudge", "nudged")!.questions).toEqual(["when", "checkin"]);
  });

  it("a delay intent requires a day — a delay with no date is not a delay", () => {
    for (const [id, intent] of [["send", "later"], ["nudge", "wait"], ["note", "date"]] as const) {
      expect(flowFor(id, intent)!.questions, `${id}:${intent} would delay to nowhere`).toEqual(["holdday"]);
      expect(flowFor(id, intent)!.writes.kind).toBe(id === "note" ? "date-note" : "snooze");
    }
    expect(flowFor("close", "leave")!.questions).toEqual(["again"]);
  });

  it("the two hand-offs are declared as hand-offs rather than omitted", () => {
    expect(flowFor("offer", "open")!.writes.kind).toBe("hand-off");
    expect(flowFor("agentgap", "open")!.writes.kind).toBe("hand-off");
  });

  it("intentOf answers for a real intent and refuses an invented one", () => {
    expect(intentOf("send", "sent")?.title).toBe("I’ve sent it");
    expect(intentOf("send", "not-an-intent")).toBeUndefined();
  });
});

/**
 * ⚠️ THE FORK'S BEHAVIOUR, AS PURE FUNCTIONS (journey round, Phase 2). What the SESSION does with
 * these — clearing answers, remembering the origin — is measured on the page; what the declaration
 * says about them is here, so a crossover that lost its way back fails without a browser.
 */
describe("⚠️ the fork resolves, and a single-option fork is not a choice", () => {
  /* ⚠️ THE THREE ONE-OPTION FORKS ARE DECLARED AND DELIBERATELY NOT DRAWN. The declaration must be
     TOTAL — every journey has a fork — but a fork with one option is not a choice, and drawing it
     would put a click in front of a hand-off and a cohort table purely to honour a shape. */
  it("exactly the three journeys the contract does not draw carry a single intent", () => {
    const single = IDS.filter((id) => JOURNEYS[id].fork.options.length === 1);
    expect(single.sort()).toEqual(["agentgap", "bulk", "offer"]);
    /* and every one of them opens onto a flow rather than crossing somewhere */
    for (const id of single) {
      expect(JOURNEYS[id].fork.options[0].target.kind, `${id} crosses instead of resolving`).toBe("flow");
    }
  });

  it("the contract's five each offer a real choice", () => {
    for (const id of ["send", "nudge", "close", "fillin", "note"] as JourneyId[]) {
      expect(JOURNEYS[id].fork.options.length, `${id} offers no choice`).toBeGreaterThan(1);
    }
  });

  /* ⚠️ EVERY CROSSOVER HAS A WAY BACK, and it is the origin journey rather than a default. A "go
     back" that landed somewhere else would be worse than none. */
  it("every crossover names a journey that exists and is not itself", () => {
    let n = 0;
    for (const id of IDS) {
      for (const o of JOURNEYS[id].fork.options) {
        const to = crossoverOf(id, o.id);
        if (!to) continue;
        n++;
        expect(JOURNEYS[to], `${id}:${o.id} crosses nowhere`).toBeTruthy();
        expect(to, `${id}:${o.id} crosses to itself`).not.toBe(id);
      }
    }
    expect(n, "no crossovers found — this case measured nothing").toBeGreaterThan(1);
  });

  /* ⚠️ A DELAY INTENT NEVER WRITES TO THE QUERY. Recon confirmed the snooze primitive touches a
     TASK FLAG and nothing else; a delay flow that declared `record-send` would be a "not yet" that
     recorded a send. */
  it("no delay flow writes to the query", () => {
    const delays = [["send", "later"], ["nudge", "wait"], ["close", "leave"]] as const;
    for (const [id, intent] of delays) {
      const w = flowFor(id, intent)!.writes.kind;
      expect(["snooze", "mute"], `${id}:${intent} writes ${w} — a delay must not touch the query`)
        .toContain(w);
    }
  });

  /* ⚠️ AND EVERY FLOW THAT REQUIRES NOTHING SAYS WHY. `[]` is a decision on four flows — the tick,
     "I can't remember", and the two hand-offs — and each carries either an `info` line or a
     hand-off write, so an empty list can never be a forgotten one. */
  it("every flow requiring nothing is either a hand-off or says what it does", () => {
    let n = 0;
    for (const id of IDS) {
      for (const [flowId, f] of Object.entries(JOURNEYS[id].flows)) {
        if (f.questions.length) continue;
        n++;
        const excused = f.writes.kind === "hand-off" || !!f.info;
        expect(excused, `${id}.${flowId} requires nothing and does not say why`).toBe(true);
      }
    }
    expect(n, "no question-free flows found — this case measured nothing").toBeGreaterThan(2);
  });
});

/**
 * ⚠️ DELAY IS SNOOZE (journey round, Phase 3). What the SESSION does with these — calling the
 * action bar's own writer, the mute — is measured on the page; what the declaration says is here.
 */
describe("⚠️ every delay question is answerable, and no delay invents a date", () => {
  /* ⚠️ A DELAY FIELD WITHOUT OPTIONS DRAWS A QUESTION WITH NOTHING UNDER IT. Swept over every flow,
     so a flow that gains `holdday` and forgets its options fails here rather than on the page. */
  it("every flow naming a delay field declares its options", () => {
    let n = 0;
    for (const id of IDS) {
      for (const [flowId, f] of Object.entries(JOURNEYS[id].flows)) {
        for (const q of f.questions) {
          if (q !== "holdday" && q !== "checkin" && q !== "again") continue;
          n++;
          const opts = f.delays?.[q];
          expect(opts?.length, `${id}.${flowId} asks "${q}" and offers nothing`).toBeGreaterThan(1);
        }
      }
    }
    expect(n, "no delay questions found — this case measured nothing").toBeGreaterThan(3);
  });

  it("every option set offers a date, so no delay is limited to the presets someone chose", () => {
    for (const id of IDS) {
      for (const [flowId, f] of Object.entries(JOURNEYS[id].flows)) {
        for (const [field, opts] of Object.entries(f.delays ?? {})) {
          expect(opts.some((o) => o.kind === "date"),
            `${id}.${flowId}.${field} offers no date of its own`).toBe(true);
          /* every option's id is unique within its set — they become part of a DOM id */
          const ids = opts.map((o) => o.id);
          expect(new Set(ids).size, `${id}.${flowId}.${field} repeats an option id`).toBe(ids.length);
          for (const o of opts) {
            if (o.kind === "days") expect(o.days, `${id}.${flowId}.${field}:${o.id} delays by nothing`).toBeGreaterThan(0);
          }
        }
      }
    }
  });

  /* ⚠️ `never` IS OFFERED WHERE THE CONTRACT OFFERS IT AND NOWHERE ELSE. "Don't ask again" on a
     send's *hold me to it* would be a writer muting a request they have not answered. */
  it("only the nudge's check-in and the close's ask-again offer an end to the asking", () => {
    const withNever: string[] = [];
    for (const id of IDS) {
      for (const [flowId, f] of Object.entries(JOURNEYS[id].flows)) {
        for (const [field, opts] of Object.entries(f.delays ?? {})) {
          if (opts.some((o) => o.kind === "never")) withNever.push(`${id}.${flowId}.${field}`);
        }
      }
    }
    expect(withNever.sort()).toEqual(["close.leave.again", "nudge.nudged.checkin"]);
  });

  /* ⚠️ THE MUTE'S COPY SAYS EXACTLY WHAT IT DOES AND DOES NOT DO — the affordance the popup round
     reported as homeless, and the reason it can live here is that it is a choice inside a decision
     rather than a hidden setting. */
  it("the close's leave-it-open hint states what the mute does not touch", () => {
    const hint = JOURNEYS.close.flows.leave.delayHints!.again!;
    expect(hint).toMatch(/this query only/i);
    expect(hint).toMatch(/deletes nothing/i);
    expect(hint).toMatch(/every other task/i);
  });

  /* ⚠️ AND A DELAY SAYS IT TOUCHES NOTHING. "Nothing is recorded on the query" is the sentence that
     stops "hold me to it" reading as a half-finished send. */
  it("the send's hold-me-to-it says nothing is recorded on the query", () => {
    expect(JOURNEYS.send.flows.later.delayHints!.holdday!).toMatch(/nothing is recorded on the query/i);
  });
});

/**
 * ⚠️ A CROSSOVER SWAPS THE WHOLE JOURNEY, INCLUDING THE SENTENCE (journey round, Phase 3 — found by
 * MEASUREMENT, not by reading).
 *
 * The band and the flow both followed the active journey because both read it; the DEED did not,
 * because `deedSentence` switches on `cardBucket(c)` — a fact about the CARD. Measured on the page:
 * crossing a send to a close changed the band `u-now → u-house` and left the deed reading "Send your
 * full manuscript…" above a close fork, describing the act the writer had just decided against.
 */
describe("⚠️ the deed follows the journey, not the card", () => {
  it("every journey declares which sentence its deed is written in", () => {
    for (const id of IDS) {
      expect(JOURNEY_DEED_BUCKET[id], `${id} has no deed sentence`).toBeTruthy();
    }
    /* the two that share `fix` do so because both are housekeeping about a record */
    expect(JOURNEY_DEED_BUCKET.fillin).toBe("fix");
    expect(JOURNEY_DEED_BUCKET.agentgap).toBe("fix");
    expect(JOURNEY_DEED_BUCKET.nudge).toBe("chase");
  });

  it("a send card crossed to close says the CLOSE sentence, not the send's", () => {
    const c = card({ taskType: "full_requested", msTitle: "The Smoke Test", who: "Marcus Reed" });
    const parts = { title: "The Smoke Test", agent: "Marcus Reed", agency: "Reed & Partners" };
    const own = deedSentence(c, parts).map((x) => x.text).join("");
    const crossed = deedSentence(c, { ...parts, as: JOURNEY_DEED_BUCKET.close }).map((x) => x.text).join("");
    expect(own).toMatch(/^Send your/);
    expect(crossed, "the deed stayed on the origin journey").toMatch(/^Consider closing/);
    expect(crossed, "the crossed sentence lost the manuscript").toContain("The Smoke Test");
    expect(crossed, "the crossed sentence lost the agent").toContain("Marcus Reed");
  });

  /* ⚠️ AND `as` IS ABSENT EVERYWHERE ELSE, so every existing caller keeps the card's own bucket
     exactly — the override is what a crossover needs and what nothing else may quietly acquire. */
  it("without the override the sentence is the card's, unchanged", () => {
    const c = card({ taskType: "nudge_overdue", who: "Ana Duarte" });
    expect(deedSentence(c, { agent: "Ana Duarte" }).map((x) => x.text).join("")).toMatch(/^Nudge /);
  });
});
