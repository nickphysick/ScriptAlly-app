/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PHASE 8 — registers and receipts.
 *
 * ⚠️ `JourneyDeclaration.register` IS DOCUMENTATION THAT IS NOW ENFORCED, WHICH IS WHY IT IS NOT
 * RENDERED AND MUST NOT BE DELETED AS DEAD. It states the tone each journey's copy is written in —
 * "matter-of-fact courage; the app hands the writer the clock, not the anxiety" — and until this
 * file existed it was a sentence nobody could check, of exactly the kind CLAUDE.md warns about:
 * a constraint worth a comment is worth a test. The vocabularies below are that sentence made
 * checkable. Anyone wiring `register` into the UI is misreading it; anyone deleting it as unread
 * is deleting the reason these lists exist.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { JOURNEYS, type JourneyId, type JourneyFlow } from "./journeys";
import { paneCommits } from "./paneCommit";

const decls = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

/** every string a journey puts in front of the writer — fork, flows, hints and standing lines */
function copyOf(id: JourneyId): string[] {
  const j = JOURNEYS[id];
  const out: string[] = [j.fork.label];
  for (const o of j.fork.options) { out.push(o.title); out.push(o.subtitle); }
  for (const f of Object.values(j.flows) as JourneyFlow[]) {
    out.push(f.primary);
    if (f.info) out.push(f.info);
    for (const h of Object.values(f.delayHints ?? {})) if (h) out.push(h);
    if (f.whenHint) out.push(f.whenHint);
    for (const set of Object.values(f.delays ?? {})) for (const d of set ?? []) out.push(d.label);
  }
  return out;
}

const ALL = Object.keys(JOURNEYS) as JourneyId[];

describe("Phase 8 · every journey states its register, and the register is not empty ceremony", () => {
  it.each(ALL)("%s carries a register", (id) => {
    const r = JOURNEYS[id].register;
    expect(r, `${id} has no register`).toBeTruthy();
    expect(r.length, `${id}'s register is too short to say anything`).toBeGreaterThan(30);
  });

  /* ⚠️ AND THE SWEEP MUST HAVE FOUND SOMETHING. A vocabulary check over an empty string list
     passes forever, which is this repo's most-recorded failure shape. */
  it.each(ALL)("%s renders copy for the checks below to read", (id) => {
    const c = copyOf(id);
    expect(c.length, `${id} renders no copy at all`).toBeGreaterThan(2);
    expect(c.every((s) => typeof s === "string" && s.length > 0)).toBe(true);
  });
});

describe("Phase 8 · the nudge hands the writer the clock, not the anxiety", () => {
  /**
   * ⚠️ THE WORDS ARE THE REGISTER MADE CHECKABLE. "Overdue" and "late" are verdicts on a person who
   * has not replied yet; the rest are the vocabulary of worry. The pane-wide version of this is
   * already measured on the rendered page — this is its declaration-level twin, which catches a
   * word the moment it is TYPED rather than when someone next runs a browser.
   */
  const ANXIOUS = /\b(overdue|late|chase|nag|pester|worried|worry|urgent|failed|ignoring|ignored|silence is|still nothing)\b/i;
  it("no flow of the nudge journey uses an anxious word", () => {
    const hits = copyOf("nudge").filter((s) => ANXIOUS.test(s));
    expect(hits, `anxious copy in the nudge journey: ${hits.join(" | ")}`).toEqual([]);
  });
});

describe("Phase 8 · the close is bookkeeping, not a verdict", () => {
  /**
   * ⚠️ "REJECTED" IS THE ONE THAT MATTERS. Closing a query for silence is not a rejection, the
   * form's own copy spends a sentence saying so, and a stray "rejected" in a fork subtitle would
   * contradict it three centimetres away.
   */
  const VERDICT = /\b(rejected|rejection|failed|failure|unsuccessful|gave up|give up|sadly|unfortunately|afraid|bad news|no luck)\b/gi;

  /**
   * ⚠️ A NEGATION IS WHAT SATISFIES THE LAW, NOT WHAT BREAKS IT — and the copy that most needs this
   * rule is the copy that names the thing in order to deny it. The close fork's own subtitle reads
   * "Records no response — not a rejection. It reopens if a reply ever comes", which is the
   * sentence the whole register exists to produce, and a bare word match flagged it as a verdict.
   *
   * That is the same shape as a source lock matching the comment that explains a removal: the check
   * must read the CLAUSE, not the token. Anything preceded by a negation inside the twenty
   * characters before it is the copy doing its job.
   */
  const NEGATED = /\b(not|never|no|isn.t|is not|rather than|instead of)\s+(a|an|the)?\s*$/i;
  const verdicts = (s: string): string[] =>
    [...s.matchAll(VERDICT)]
      .filter((m) => !NEGATED.test(s.slice(Math.max(0, m.index! - 20), m.index!)))
      .map((m) => m[0]);

  it("no flow of the close journey passes judgement", () => {
    const hits = copyOf("close").flatMap((s) => verdicts(s).map((v) => `${v} — in: ${s}`));
    expect(hits, `a verdict in the close journey: ${hits.join(" | ")}`).toEqual([]);
  });

  /* ⚠️ AND THE NEGATION CARVE-OUT IS PROVED BOTH WAYS, or it is a hole rather than a rule */
  it("the carve-out reads the clause: a bare verdict is still caught", () => {
    expect(verdicts("Records no response — not a rejection.")).toEqual([]);
    expect(verdicts("The agent rejected it")).toEqual(["rejected"]);
    expect(verdicts("Sadly, no luck this time").length).toBeGreaterThan(0);
  });
});

describe("Phase 8 · the fill-in forgives", () => {
  const BLAME = /\b(should have|shouldn.t have|you forgot|forgot to|you didn.t|you failed|neglected|omitted)\b/i;
  it("no flow of the fill-in journey blames the writer for the gap", () => {
    const hits = copyOf("fillin").filter((s) => BLAME.test(s));
    expect(hits, `blame in the fill-in journey: ${hits.join(" | ")}`).toEqual([]);
  });
});

describe("Phase 8 · the app does not editorialise about someone else's note", () => {
  const EDITORIAL = /\b(important|don.t forget|remember to|make sure|you really|at last|finally)\b/i;
  it("the note journey offers only the tick and the date, in the app's own quiet voice", () => {
    const hits = copyOf("note").filter((s) => EDITORIAL.test(s));
    expect(hits, `the app editorialising about a note: ${hits.join(" | ")}`).toEqual([]);
  });
});

describe("Phase 8 · no journey guesses an agent's pronouns", () => {
  /**
   * ⚠️ THE HOUSE LAW, APPLIED WHERE IT IS EASIEST TO BREAK. An agent is a real person whose
   * pronouns this app never stores; a form that says "what you sent her" about an agent called
   * Jonathan is wrong in the one register where being wrong is least forgivable. The fiction
   * carve-out CLAUDE.md records — invented loglines in seed data — does not apply here: none of
   * these strings is a writer's own words about their book.
   */
  const GENDERED = /\b(he|him|his|she|her|hers)\b/i;
  it.each(ALL)("%s uses no gendered pronoun", (id) => {
    const hits = copyOf(id).filter((s) => GENDERED.test(s));
    expect(hits, `a gendered pronoun in ${id}: ${hits.join(" | ")}`).toEqual([]);
  });
});

describe("Phase 8 · every terminus produces a receipt carrying Undo", () => {
  /**
   * ⚠️ TWO DERIVATIONS AGAINST EACH OTHER, never a hand-written list on both sides. The journeys
   * declare which write each flow performs; `useTaskCommit` declares which committer runs it. A
   * terminus with no receipt is a write the writer cannot see and cannot reverse — the fault this
   * app has closed twice, once as an undo that restored nothing and once as an inline completion
   * that bypassed the primitive.
   */
  const COMMITTER: Record<string, string> = {
    "record-send": "commitSendFromPane",
    "record-nudge": "commitChaseFromPane",
    "close-query": "commitCloseFromPane",
    "record-materials": "commitMaterialsFromPane",
    "record-cohort": "commitRecordSweep",
    "tick-note": "quickDone",
  };
  /* the two that do not reach a committer at all, and why — stated, not omitted */
  const NOT_A_COMMIT: Record<string, string> = {
    "snooze": "the action bar's own snoozeCard — its toast and undo are measured on the page",
    "date-note": "the same snoozeCard writer",
    "mute": "dismissTask(…, permanent), which flashes its own Undo",
    "hand-off": "no write at all: the takeover asks questions this form does not draw",
    "flow": "not a write — an intent that opens another flow",
    "journey": "not a write — a crossover",
    "days": "not a write — a delay option's shape",
    "date": "not a write — a delay option's shape",
    "never": "not a write — a delay option's shape",
  };

  const src = decls(readFileSync("src/components/todo/useTaskCommit.tsx", "utf8"));
  const bodyOf = (name: string) => {
    const i = src.indexOf(`function ${name}`);
    expect(i, `${name} is gone — this lock is reading a file that has moved on`).toBeGreaterThan(-1);
    /* bounded from the next top-level function, so a missing end anchor cannot widen it silently */
    const rest = src.slice(i + 10);
    const j = rest.search(/\n  (?:async )?function /);
    return rest.slice(0, j === -1 ? rest.length : j);
  };

  it("every write a journey declares is either a named committer or a stated non-commit", () => {
    const kinds = new Set<string>();
    for (const id of ALL) for (const f of Object.values(JOURNEYS[id].flows) as JourneyFlow[]) {
      kinds.add(f.writes.kind);
    }
    expect(kinds.size, "no write kinds were collected").toBeGreaterThan(4);
    const unaccounted = [...kinds].filter((k) => !COMMITTER[k] && !NOT_A_COMMIT[k]);
    expect(unaccounted, `write kinds nobody accounts for: ${unaccounted.join(", ")}`).toEqual([]);
  });

  it("and every named committer really does raise a receipt with an undo", () => {
    for (const [kind, fn] of Object.entries(COMMITTER)) {
      const body = bodyOf(fn);
      expect(body, `${kind} → ${fn} raises no receipt`).toMatch(/doneToast|flash\(/);
      expect(body, `${kind} → ${fn} offers no way back`).toMatch(/undo|Undo/);
    }
  });

  /**
   * ⚠️ AND THE RECEIPT IS NOT A DIALOG. The pane's primary commits IN PLACE — it used to hand off
   * to a takeover that asked the same questions again, most visibly on the close, where a "Stale
   * query" dialog offered to consider closing a record the writer had already answered for.
   */
  it("no committer opens a dialog", () => {
    for (const fn of Object.values(COMMITTER)) {
      const body = bodyOf(fn);
      expect(body, `${fn} opens a dialog`).not.toMatch(/setConfirm|openDialog|setDialog|window\.confirm/);
    }
  });

  /* ⚠️ THE TWO HAND-OFFS ARE RECONCILED AGAINST `paneCommits`, not asserted twice by hand */
  it("the journeys that hand off are exactly the ones the pane declines to commit", () => {
    const handsOff = ALL.filter((id) =>
      Object.values(JOURNEYS[id].flows).every((f) => (f as JourneyFlow).writes.kind === "hand-off"));
    expect(handsOff.sort()).toEqual(["agentgap", "offer"]);
    expect(paneCommits("offer")).toBe(false);
    expect(paneCommits("fix")).toBe(false);
    for (const k of ["send", "chase", "close", "materials", "note"] as const) {
      expect(paneCommits(k), `the pane stopped committing ${k}`).toBe(true);
    }
  });
});
