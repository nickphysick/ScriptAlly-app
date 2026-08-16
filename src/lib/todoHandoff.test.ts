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
  handoffSubject, handoffFor, panePosition, paneSections, paneRestLine, bandFacts, recordNote, holderRows, anchorNoun, bandForward, materialRows, materialName, bandAnchor, trackingStats, HANDOFF_NOTE,
} from "./todoHandoff";
import { sendSpecFor } from "./todoDock";

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
      .toEqual([{ k: "Requested", v: "2 August", kind: "date" }, { k: "Waiting", v: "12 days", kind: "wait" }]);
  });

  /**
   * ⚠️ A FACT WITH NO VALUE IS OMITTED, NEVER DASHED. The strip is short by design — two columns
   * at most — and an empty column in it reads as a fault rather than as an absence. This is the
   * opposite of the manuscript card's `—` rows, and deliberately: there, a named slot standing
   * empty IS the information; here, the strip is a summary and a summary of nothing is noise.
   */
  it("a fact with no value is omitted, and an empty strip is empty", () => {
    expect(bandFacts("Requested", null, "Waiting", "12 days")).toEqual([{ k: "Waiting", v: "12 days", kind: "wait" }]);
    expect(bandFacts(null, null, null, null)).toEqual([]);
  });
});

describe("⚠️ TRACKING'S STAT PAIR IS THE BAND'S FACTS, RE-PRESENTED — never a second derivation", () => {
  /**
   * ⚠️ THE PAIR READS ELAPSED FIRST — "Greg has waited / 6 weeks" beside "He asked on / 28 Jun".
   * `bandFacts` builds anchor-first because that is the order the BAND wants; the pair is a
   * different presentation of the same two facts and reads the other way, because the elapsed
   * figure is the one the writer is looking for. Same derivation, two orders, on purpose.
   */
  it("it takes `bandFacts`' own output, elapsed first, so two surfaces state one number", () => {
    const facts = bandFacts("He asked on", "28 Jun", "Greg has waited", "6 weeks");
    expect(trackingStats(facts).map((s) => s.k)).toEqual(["Greg has waited", "He asked on"]);
  });

  /**
   * ⚠️ THE BAND CARRIES THE ANCHOR ALONE, AND THIS IS THE DELIBERATE EXCEPTION to "a figure
   * appears once per card". The band showed BOTH facts and the stat pair three inches below showed
   * the same two — one figure twice, in one glance, which is the accident the rule exists to stop.
   * The band states when they asked; the pair states that AND how long it has been, because the
   * pair's whole job is the relationship between them.
   */
  it("the band shows the anchor alone; the pair shows both", () => {
    const facts = bandFacts("He asked on", "28 Jun", "Greg has waited", "6 weeks");
    expect(bandAnchor(facts).map((f) => f.k)).toEqual(["He asked on"]);
    expect(trackingStats(facts)).toHaveLength(2);
    /* an anchor-less card shows no band fact rather than falling back to the wait */
    expect(bandAnchor(bandFacts(null, null, "Greg has waited", "6 weeks"))).toEqual([]);
  });

  /**
   * ⚠️ THE UNIT SPLITS OFF THE FIGURE because the two are set in different faces — Playfair for
   * the number, Inter for the unit — and one string cannot carry two faces. The split is on the
   * FIRST space of a WAIT only, so "6 weeks" divides and a date's parts stay together.
   */
  /* ⚠️ AND THE DISCRIMINATOR IS THE TAG, NOT THE TEXT. Both values start with a number, so a
     first attempt guessed from the LABEL and split "He asked on / 28 Jun" into "28" and "Jun"
     because the word "asked" matched. Caught by this case. */
  it("a wait splits into figure and unit; a date does not", () => {
    const [wait, date] = trackingStats(bandFacts("He asked on", "28 Jun", "Greg has waited", "6 weeks"));
    expect(wait).toMatchObject({ v: "6", u: "weeks" });
    expect(date).toMatchObject({ v: "28 Jun", u: "" });
  });

  it("a word figure carries no unit to split", () => {
    const [wait] = trackingStats(bandFacts("He asked on", "28 Jun", "Greg has waited", "Today"));
    expect(wait).toMatchObject({ v: "Today", u: "" });
  });

  it("an absent fact yields no stat — the pair is short rather than padded", () => {
    expect(trackingStats(bandFacts(null, null, "Greg has waited", "6 weeks"))).toHaveLength(1);
    expect(trackingStats(bandFacts(null, null, null, null))).toEqual([]);
  });
});

/* ── the materials sub-line (pane faults; Nick's ruling) ─────────────────────────────────────── */

describe("⚠️ THE SUB-LINE VARIES BY WHAT THE MATERIAL IS — and is ABSENT where nothing is true", () => {
  it("a full manuscript takes the manuscript's own word count — the one place that figure belongs", () => {
    expect(materialRows("The manuscript", { isFull: true, wordCount: 92000 })[0].sub).toBe("92,000 words");
  });

  it("a sample, synopsis or letter takes the package slot's version", () => {
    expect(materialRows("The partial", { versionName: "QL v2" })[0].sub).toBe("QL v2");
  });

  /**
   * ⚠️ NO SUB-LINE BEATS AN ABSENT-VALUE SUB-LINE. "Version not recorded" on every row is noise,
   * and the absence is already visible from the row having no second line.
   */
  it("no version and no word count means NO second line at all", () => {
    expect(materialRows("The partial", {})[0].sub).toBeUndefined();
    expect(materialRows("The manuscript", { isFull: true })[0].sub).toBeUndefined();
    expect(materialRows("The partial", { versionName: null })[0].sub).toBeUndefined();
  });

  /* ⚠️ A WORD COUNT NEVER LANDS ON A NON-FULL — beside a query letter it would state the novel's
     length as the letter's. */
  it("a word count cannot leak onto a sample", () => {
    expect(materialRows("The partial", { wordCount: 92000 })[0].sub).toBeUndefined();
  });

  it("no material, no row", () => {
    expect(materialRows(null, { isFull: true, wordCount: 92000 })).toEqual([]);
  });
});

/* ── §5 · the anti-duplication law ───────────────────────────────────────────────────────────── */

const bcard = (over: Record<string, unknown>) => ({ key: "k", title: "t", ...over }) as unknown as BoardCard;

describe("⚠️ §5.3 — THE ANCHOR'S NOUN NAMES WHAT ACTUALLY HAPPENED", () => {
  /**
   * ⚠️ EVERY CARD ON THE DEPLOYED PAGE PRINTED `REQUESTED` — the offer, five chases, both closes —
   * because the label was a hardcoded string at the call site rather than a derivation. Nothing is
   * requested on an offer; the agent offered.
   */
  it("each bucket gets the noun of its own act", () => {
    expect(anchorNoun(bcard({ taskType: "offer_received" }))).toBe("Offer received");
    expect(anchorNoun(bcard({ taskType: "revise_resubmit" }))).toBe("Revision requested");
    expect(anchorNoun(bcard({ taskType: "full_requested" }))).toBe("Requested");
    expect(anchorNoun(bcard({ taskType: "nudge_overdue" }))).toBe("Queried");
    expect(anchorNoun(bcard({ taskType: "no_response_close" }))).toBe("Last entry");
    expect(anchorNoun(bcard({ userTaskId: "u1" }))).toBe("Added");
    expect(anchorNoun(bcard({ taskType: "data_quality_poor" }))).toBe("Noticed");
  });

  /* ⚠️ NO TWO BUCKETS SHARE A NOUN BY ACCIDENT — asserted as a set, so a future bucket cannot
     quietly inherit another's word. */
  it("the nouns are distinct across the buckets that have their own act", () => {
    const nouns = ["offer_received", "revise_resubmit", "full_requested", "nudge_overdue", "no_response_close"]
      .map((t) => anchorNoun(bcard({ taskType: t })));
    expect(new Set(nouns).size).toBe(nouns.length);
  });
});

describe("⚠️ §5.1 — THE BAND CARRIES THE FORWARD-LOOKING FACT ALONE", () => {
  const fmt = (iso: string) => `fmt:${iso}`;

  it("an offer's band counts DOWN to the reply-by", () => {
    expect(bandForward(bcard({ taskType: "offer_received" }), "2026-09-07", null, fmt))
      .toMatchObject({ k: "Reply by", v: "fmt:2026-09-07" });
  });

  it("a send or a chase carries the agent's stated window", () => {
    expect(bandForward(bcard({ taskType: "full_requested" }), null, 8, fmt))
      .toMatchObject({ k: "Their window", v: "8 weeks" });
    expect(bandForward(bcard({ taskType: "nudge_overdue" }), null, 10, fmt))
      .toMatchObject({ k: "Their window", v: "10 weeks" });
  });

  /**
   * ⚠️ ABSENT RATHER THAN PADDED. A band that always has something to say will eventually say
   * something untrue — and the fault this replaces was the band carrying the ANCHOR, which the
   * stat pair carries too: the same figure twice on one card.
   */
  /**
   * ⚠️ "Not stated" IS A FACT ABOUT THE AGENT, NOT AN APOLOGY FOR MISSING DATA. Plenty of agencies
   * publish no response time, and knowing that this one does not is worth as much as the number —
   * it is why the wait has no yardstick. It also makes the row assertable: a band with nothing and
   * a band whose fact was never built are otherwise the same picture.
   */
  it("a send or chase with no stated window SAYS SO, where we hold an agent record", () => {
    expect(bandForward(bcard({ taskType: "full_requested" }), null, null, fmt, true))
      .toMatchObject({ k: "Their window", v: "Not stated" });
    expect(bandForward(bcard({ taskType: "nudge_overdue" }), null, 0, fmt, true))
      .toMatchObject({ k: "Their window", v: "Not stated" });
  });

  /**
   * ⚠️ TWO DIFFERENT SILENCES, AND ONLY ONE IS THE AGENT'S. With no agent on file there is nobody
   * to have stated anything, so the band says nothing rather than reporting a silence from someone
   * we have never met. And close / fix / note have no forward-looking CONCEPT at all — a close is
   * the end of a wait, not the middle of one.
   */
  it("no agent record, or a bucket with no such concept, carries NOTHING", () => {
    expect(bandForward(bcard({ taskType: "full_requested" }), null, null, fmt, false)).toBeNull();
    expect(bandForward(bcard({ taskType: "offer_received" }), null, 8, fmt, true)).toBeNull();
    expect(bandForward(bcard({ taskType: "no_response_close" }), "2026-09-07", 8, fmt, true)).toBeNull();
    expect(bandForward(bcard({ taskType: "data_quality_poor" }), null, 8, fmt, true)).toBeNull();
    expect(bandForward(bcard({ userTaskId: "u1" }), null, null, fmt, true)).toBeNull();
  });

  /* ⚠️ THE LAW ITSELF: the band's fact and the pair's facts are never the same string. */
  it("the band's fact is never one of the pair's", () => {
    const fwd = bandForward(bcard({ taskType: "offer_received" }), "2026-09-07", null, fmt)!;
    const pair = trackingStats(bandFacts("Offer received", "17 June", "You've waited", "8 weeks"));
    expect(pair.map((p) => p.k)).not.toContain(fwd.k);
    expect(pair.map((p) => p.v)).not.toContain(fwd.v);
  });
});

/* ── §4.4 · who else holds material ──────────────────────────────────────────────────────────── */

describe("⚠️ §4.4 — WHO ELSE HOLDS MATERIAL, from the set `notifyGroups` already computes", () => {
  const pages = [
    { queryId: "q1", agentId: "a1", name: "Jonathan Marsh", statusLine: "FULL SENT" },
    { queryId: "q2", agentId: "a2", name: "Daniel O'Rourke", statusLine: "PARTIAL SENT", caution: "“no reply means no” agency" },
  ];
  const email = (id: string | undefined) => (id === "a1" ? "jm@marsh.co.uk" : undefined);

  it("a row per agent — the name, WHAT THEY HOLD, and a composed draft link", () => {
    const [a, b] = holderRows(pages, email, "The Smoke Test — an update");
    expect(a).toMatchObject({ name: "Jonathan Marsh", holds: "FULL SENT" });
    expect(a.mail.href).toBe("mailto:jm@marsh.co.uk?subject=" + encodeURIComponent("The Smoke Test — an update"));
    expect(b.holds).toBe("PARTIAL SENT");
    expect(b.caution).toMatch(/no reply means no/);
  });

  /**
   * ⚠️ AN AFFORDANCE WITH NOTHING BEHIND IT GREYS AND SAYS WHY — never hidden, never fabricated.
   * The same law the hand-off already follows: a vanishing control leaves you wondering what the
   * app knows; a greyed one with its reason tells you what to go and fix.
   */
  it("no email on file greys the link and states the reason", () => {
    const [, b] = holderRows(pages, email, "s");
    expect(b.mail.href).toBeNull();
    expect(b.mail.why).toBe("No email address on file for this agent.");
  });

  it("nobody holding anything yields no rows — the section does not render", () => {
    expect(holderRows([], email, "s")).toEqual([]);
  });
});

/* ── §3.11 · what the record shows ───────────────────────────────────────────────────────────── */

describe("⚠️ §3.11 — ONE PARAGRAPH PER BUCKET, and it reports rather than advises", () => {
  const B = ["offer_received", "revise_resubmit", "full_requested", "nudge_overdue", "no_response_close", "data_quality_poor"];

  it("every bucket has one, and no two share a paragraph", () => {
    const notes = B.map((t) => recordNote(bcard({ taskType: t })));
    notes.push(recordNote(bcard({ userTaskId: "u1" })));
    expect(notes.every((n) => n.length > 30)).toBe(true);
    expect(new Set(notes).size).toBe(notes.length);
  });

  /**
   * ⚠️ IT REPORTS AND NEVER ADVISES. The same lock the manuscript plate carries: one adverb turns
   * a fact into a verdict, and one imperative turns a record into an instruction.
   */
  it("no advice, no urging, no appraisal", () => {
    const all = [...B.map((t) => recordNote(bcard({ taskType: t }))), recordNote(bcard({ userTaskId: "u1" }))].join(" ");
    expect(all).not.toMatch(/\b(should|must|don't forget|remember to|make sure|try to|need to)\b/i);
    expect(all).not.toMatch(/\b(only|already|still|good|great|slow|overdue|finally)\b/i);
    expect(all).not.toContain("!");
  });

  /* ⚠️ THE FOUR THAT EXISTED ARE MOVED VERBATIM, not rewritten — the doing column had them keyed
     on `dockFlowKind`, which folds send and chase into one and so had no paragraph for a send. */
  it("the four that already existed carry their original words", () => {
    expect(recordNote(bcard({ taskType: "nudge_overdue" })))
      .toBe("A nudge is a message, not a send — logging it records the chase.");
    expect(recordNote(bcard({ taskType: "no_response_close" })))
      .toBe("Closing records no response — not a rejection, so your response rate stays honest.");
    expect(recordNote(bcard({ taskType: "data_quality_poor" })))
      .toBe("A gap on the agent's record. Filling it opens their profile at the field.");
    expect(recordNote(bcard({ userTaskId: "u1" })))
      .toBe("Your own task — ticking it is what finishes it.");
  });
});

/* ── Item 4 · the material row's NAME ────────────────────────────────────────────────────────── */

describe("materialName — the row names the material, never the spec's slug", () => {
  /**
   * ⚠️ THE ARGUMENT IS DERIVED, NOT TYPED. `sendSpecFor` is what computes the material in
   * production, so the fixtures call it rather than hand-writing "partial" — a literal here is the
   * same fault one step along, going green the day that mapping moves.
   */
  const forTask = (taskType: string, who: string) => {
    const spec = sendSpecFor(card({ taskType, who }));
    return spec ? materialName(spec.material, who) : null;
  };

  it("a partial request reads as a named material, attributed to whoever asked", () => {
    expect(forTask("partial_requested", "Greg Panetta")).toBe("The partial — as Greg asked");
  });

  it("a full takes the same shape", () => {
    expect(forTask("full_requested", "Greg Panetta")).toBe("The full — as Greg asked");
  });

  it("an R&R is still a full, and the 'again' is the band's job rather than this row's", () => {
    /* `bandPreline` already reads "Sending your full again to"; saying it twice in one card would
       be the duplication law's fault in prose. */
    expect(forTask("revise_resubmit", "Iris Kwan")).toBe("The full — as Iris asked");
  });

  it("⚠️ THE ATTRIBUTION OMITS ITSELF WHERE THERE IS NO ONE TO ATTRIBUTE IT TO", () => {
    /* `card.who` is `""` on every card with no agent. "as asked" with nobody's name in it is a
       sentence about a person the record does not have. */
    expect(forTask("partial_requested", "")).toBe("The partial");
    expect(forTask("full_requested", "   ")).toBe("The full");
  });

  it("⚠️ AND THE SPEC'S DISCRIMINATOR NEVER REACHES THE ROW", () => {
    /* the fault as it shipped: `What goes` printed `partial`, which is `SendSpec.material` — the
       two-value field the WRITE path branches on, rendered to the writer as a label. */
    for (const t of ["partial_requested", "full_requested", "revise_resubmit"]) {
      expect(forTask(t, "Greg Panetta"), t).not.toBe("partial");
      expect(forTask(t, "Greg Panetta"), t).not.toBe("full");
    }
  });
});
