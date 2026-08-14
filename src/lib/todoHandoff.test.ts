/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The workspace pane's pure model (rail + workspace, Phase 5).
 *
 * ⚠️ THE HAND-OFF IS THE POINT OF THE PAGE, so its failure modes are the ones worth pinning: a
 * link built from prose rather than the record, an affordance that vanishes instead of explaining
 * itself, a subject line that names a different material from the flow beneath it, and — the one
 * this app is most at risk of — a sentence that appraises rather than reports.
 */
import { describe, it, expect } from "vitest";
import { BoardCard } from "./todoBoard";
import {
  handoffSubject, handoffFor, panePosition, paneSections, paneRestLine, bandFacts, HANDOFF_NOTE,
} from "./todoHandoff";

const card = (over: Partial<BoardCard> = {}): BoardCard => ({
  key: "k", stream: "do", title: "Send your full to Bethany Carter", who: "Bethany Carter",
  subtitle: "", due: "", warn: false, snoozes: 0, hk: false, initials: "BC", record: "",
  committed: false, done: false, taskType: "full_requested", ...over,
});

describe("⚠️ THE SUBJECT NAMES WHAT WAS ASKED FOR, from the SAME derivation the flow records", () => {
  it("the pack's own example, exactly", () => {
    expect(handoffSubject(card(), "Murphy's Day Out"))
      .toBe("Requested full — MURPHY'S DAY OUT — Bethany Carter");
  });

  it("a partial says partial and a resubmission says revision — never the wrong material", () => {
    expect(handoffSubject(card({ taskType: "partial_requested" }), "Murphy's Day Out"))
      .toBe("Requested partial — MURPHY'S DAY OUT — Bethany Carter");
    expect(handoffSubject(card({ taskType: "revise_resubmit" }), "Murphy's Day Out"))
      .toBe("Requested revision — MURPHY'S DAY OUT — Bethany Carter");
  });

  it("⚠️ A TASK THAT IS NOT A SEND HAS NO SUBJECT — and therefore no hand-off at all", () => {
    for (const t of ["offer_received", "no_response_close", "nudge_overdue", "data_quality_poor"]) {
      expect(handoffSubject(card({ taskType: t }), "Murphy's Day Out"), t).toBeNull();
    }
  });

  it("⚠️ AN ABSENT CLAUSE IS OMITTED, never left as an empty pair of dashes", () => {
    /* "Requested full —  — Bethany Carter" is the app showing its own missing data to an agent. */
    expect(handoffSubject(card(), undefined)).toBe("Requested full — Bethany Carter");
    expect(handoffSubject(card({ who: "" }), "Murphy's Day Out")).toBe("Requested full — MURPHY'S DAY OUT");
    expect(handoffSubject(card({ who: "" }), undefined)).toBe("Requested full");
  });
});

describe("⚠️ AN AFFORDANCE WITH NOTHING BEHIND IT GREYS AND SAYS WHY — it is never fabricated", () => {
  it("both links build from the record when it has them", () => {
    const h = handoffFor(card(), "b@carter.co.uk", "https://carterlit.com", "Murphy's Day Out");
    expect(h.mail.href).toContain("mailto:b@carter.co.uk");
    expect(h.mail.href).toContain(encodeURIComponent("Requested full — MURPHY'S DAY OUT — Bethany Carter"));
    expect(h.web.href).toBe("https://carterlit.com");
  });

  /**
   * ⚠️ NULL PLUS A REASON, NOT AN INVENTED VALUE AND NOT SILENCE. A vanishing control leaves you
   * wondering whether the app knows something; a greyed one naming the missing field tells you
   * what to go and fix.
   */
  it("a missing field yields no href and a reason that names the field", () => {
    const h = handoffFor(card(), undefined, undefined, "Murphy's Day Out");
    expect(h.mail.href).toBeNull();
    expect(h.mail.why).toMatch(/email/i);
    expect(h.web.href).toBeNull();
    expect(h.web.why).toMatch(/website/i);
    /* nothing plausible is substituted — no agency-name guess, no search URL */
    expect(JSON.stringify(h)).not.toContain("google");
    expect(JSON.stringify(h)).not.toContain("carter");
  });

  it("whitespace is not a field", () => {
    const h = handoffFor(card(), "   ", "  ", "Murphy's Day Out");
    expect(h.mail.href).toBeNull();
    expect(h.web.href).toBeNull();
  });

  it("a bare domain is made navigable rather than rejected", () => {
    expect(handoffFor(card(), undefined, "carterlit.com").web.href).toBe("https://carterlit.com");
    expect(handoffFor(card(), undefined, "http://carterlit.com").web.href).toBe("http://carterlit.com");
  });

  /**
   * ⚠️ THE SUBJECT IS ENCODED, and this is not pedantry: a manuscript title with an ampersand
   * silently truncates a `mailto:` at the `&`, so the agent receives a subject ending mid-word.
   */
  it("⚠️ THE SUBJECT IS URL-ENCODED — an ampersand in a title would otherwise truncate it", () => {
    const h = handoffFor(card(), "b@carter.co.uk", undefined, "Salt & Sky");
    expect(h.mail.href).not.toContain("Salt & Sky");
    expect(h.mail.href).toContain(encodeURIComponent("SALT & SKY"));
  });

  it("⚠️ THE APP SAYS IT IS NOT THE POSTBOX, once, and without urging", () => {
    expect(HANDOFF_NOTE).toMatch(/outside|your own email/i);
    expect(HANDOFF_NOTE).not.toMatch(/!|don.t forget|make sure|remember to/i);
  });
});

describe("⚠️ THE SECTIONS ARE DECLARED IN ONE PLACE — the card never branches inline", () => {
  it("a send carries the materials and the hand-off; nothing else does", () => {
    expect(paneSections(card()).map((s) => s.id)).toEqual(["record", "materials", "handoff", "note"]);
    for (const t of ["offer_received", "no_response_close", "data_quality_poor"]) {
      expect(paneSections(card({ taskType: t })).map((s) => s.id), t).toEqual(["record", "note"]);
    }
  });

  it("⚠️ 'Your note' IS ON EVERY KIND — a rule that holds four times in five is not a rule", () => {
    for (const t of ["full_requested", "offer_received", "no_response_close", "user_task"]) {
      expect(paneSections(card({ taskType: t })).map((s) => s.id), t).toContain("note");
    }
  });

  it("every section carries a label, and they name what they hold rather than the kind", () => {
    for (const s of paneSections(card())) {
      expect(s.label.length, s.id).toBeGreaterThan(3);
      expect(s.label, s.id).not.toMatch(/offer|stale|housekeeping/i);
    }
  });
});

describe("⚠️ THE POSITION COUNTS THE SET THE ARROWS WALK", () => {
  const q = [card({ key: "a" }), card({ key: "b" }), card({ key: "c" })];

  it("one-based, out of the filtered length, with the group named", () => {
    expect(panePosition(q, "b", "Urgent")).toBe("Task 2 of 3 · Urgent");
    expect(panePosition(q, "a", "Housekeeping")).toBe("Task 1 of 3 · Housekeeping");
  });

  /**
   * ⚠️ ABSENT WHEN THE CARD IS NOT IN THE QUEUE — which is the HELD state, where the pane is
   * showing a card a narrowing has pushed out of the rail. "Task 2 of 0" would be a claim about a
   * set the card has left, and a position out of a number you cannot see is worse than none.
   */
  it("absent for a card the queue no longer holds", () => {
    expect(panePosition(q, "gone", "Urgent")).toBeNull();
    expect(panePosition([], "a", "Urgent")).toBeNull();
  });
});

describe("⚠️ THE EMPTY PANE REPORTS AND NEVER APPRAISES", () => {
  const NOW = new Date("2026-08-14T09:00:00Z");
  const live = (n: number, deadline?: string) =>
    Array.from({ length: n }, () => ({ responseDeadline: deadline }));

  it("it states the count and the next window, and agrees with its own singular", () => {
    expect(paneRestLine(live(3, "2026-09-01T00:00:00Z"), NOW))
      .toBe("3 queries are still out, and the next reply window falls on 1 September.");
    expect(paneRestLine(live(1, "2026-09-01T00:00:00Z"), NOW))
      .toBe("1 query is still out, and the next reply window falls on 1 September.");
  });

  /**
   * ⚠️ IT OMITS WHAT IT CANNOT ANSWER rather than padding with zeroes — the same rule the estimate
   * chip is built on, and the reason the manuscript card writes `—` where `0` would be a lie.
   */
  it("no derivable window → no date invented; nothing out → no clause about it", () => {
    expect(paneRestLine(live(2), NOW)).toBe("2 queries are still out.");
    /* ⚠️ "just now" WAS THE FIRST DRAFT AND THIS LOCK REFUSED IT — `just` is on the minimiser
       list because of "you have only just started", and although "just now" is innocent, a copy
       rule that has to reason about which sense is meant is a rule that will eventually let the
       other one through. The wording moved; the list did not. */
    expect(paneRestLine([], NOW)).toBe("Nothing is out with an agent at the moment.");
  });

  it("⚠️ A WINDOW ALREADY PAST IS NOT 'NEXT' — only dates ahead of now can be", () => {
    expect(paneRestLine(live(1, "2026-07-01T00:00:00Z"), NOW)).toBe("1 query is still out.");
  });

  it("the earliest window ahead is the one named", () => {
    const qs = [
      { responseDeadline: "2026-10-01T00:00:00Z" },
      { responseDeadline: "2026-09-02T00:00:00Z" },
      { responseDeadline: "2026-07-01T00:00:00Z" },
    ];
    expect(paneRestLine(qs, NOW)).toContain("2 September");
  });

  /**
   * ⚠️ THE COPY LAW, ASSERTED. "The app reports, it never appraises" is the one rule an empty desk
   * is most likely to break — a cleared list is exactly where a well-meaning "Great work!" gets
   * written. Locked against the vocabulary rather than against one sentence, so a rewrite cannot
   * reintroduce it.
   */
  it("no verdict, no congratulation, no urgency — in any state", () => {
    const states = [paneRestLine([], NOW), paneRestLine(live(2), NOW), paneRestLine(live(1, "2026-09-01T00:00:00Z"), NOW)];
    for (const line of states) {
      expect(line, line).not.toMatch(/!/);
      expect(line, line).not.toMatch(/\b(great|well done|nice|good job|congrat|proud|smashed|crushed|amazing|only|just|still need|behind|ahead)\b/i);
    }
  });
});

describe("⚠️ THE SECTION SET IS DECLARED PER BUCKET — one table, not a fifth `if`", () => {
  const withType = (t?: string, over: Partial<BoardCard> = {}) => card({ taskType: t, ...over });

  it("a Send carries the materials and the hand-off; a Decide carries neither", () => {
    expect(paneSections(withType("full_requested")).map((s) => s.id))
      .toEqual(["record", "materials", "handoff", "note"]);
    /* ⚠️ AN OFFER NEEDS NO "WHERE TO SEND IT" — answering it opens the offer flow, which is its
       own surface. Keying on "does this send" gave Send and Decide the same answer and hid that
       they are different acts. */
    expect(paneSections(withType("offer_received")).map((s) => s.id)).toEqual(["record", "note"]);
  });

  it("a Chase hands off but has no package to list", () => {
    /* a chase IS a message — it needs the mailto and the subject — but nothing is being sent */
    expect(paneSections(withType("nudge_overdue")).map((s) => s.id))
      .toEqual(["record", "handoff", "note"]);
  });

  it("every bucket has a set, and every set opens with the record and ends with the note", () => {
    for (const t of ["full_requested", "offer_received", "nudge_overdue", "no_response_close", "data_quality_poor"]) {
      const ids = paneSections(withType(t)).map((s) => s.id);
      expect(ids[0], t).toBe("record");
      expect(ids[ids.length - 1], t).toBe("note");
    }
    expect(paneSections(card({ userTaskId: "u1", taskType: undefined })).map((s) => s.id))
      .toEqual(["record", "note"]);
  });
});

describe("⚠️ THE BAND'S FACTS STRIP IS THE RAIL'S PAIRING, IN THE CARD", () => {
  it("both facts render when both exist", () => {
    expect(bandFacts("Requested", "2 August", "Waiting", "12 days"))
      .toEqual([{ k: "Requested", v: "2 August" }, { k: "Waiting", v: "12 days" }]);
  });

  /**
   * ⚠️ A FACT WITH NO VALUE IS OMITTED, NEVER DASHED. The strip is short by design — two columns
   * at most — and an empty column in it reads as a fault rather than as an absence. This is the
   * opposite of the manuscript card's `—` rows, and deliberately: there, a named slot standing
   * empty IS the information; here, the strip is a summary and a summary of nothing is noise.
   */
  it("a fact with no value is omitted, and an empty strip is empty", () => {
    expect(bandFacts("Requested", null, "Waiting", "12 days")).toEqual([{ k: "Waiting", v: "12 days" }]);
    expect(bandFacts(null, null, null, null)).toEqual([]);
  });
});
