/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ THE CARD'S COPY: RELATIONAL, NAMED, AND NEVER AN APPRAISAL.
 *
 * `design-refs/query-verbs-copy-v2-locked.html`'s C · Relational column is the authority. The
 * sentences are pinned verbatim, the way `landingCopy` is: a sentence that reads slightly better
 * than the artefact it was signed off from no longer matches it.
 *
 * ⚠️ THE PRONOUN SWEEP READS CODE, NOT PROSE. Comments are stripped first — the standing rule in
 * this repo, and it matters more here than usual, because the comments EXPLAINING why there are no
 * pronouns would otherwise be the thing that fails the sweep. The claim is about what the app can
 * print, and only string literals can be printed.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cardFacts, firstNameOf, registerOf, REGISTER_LABEL, sentenceText, turnFor, type Register } from "./queryCardFacts";
import { QueryStatus, type Query } from "../types";

const src = readFileSync(join(new URL(".", import.meta.url).pathname, "queryCardFacts.ts"), "utf8");
const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

const TODAY = new Date("2026-09-10T12:00:00Z");
const iso = (d: number) => new Date(TODAY.getTime() - d * 86400000).toISOString();
const q = (o: Partial<Query>): Query => ({ id: "q", status: QueryStatus.QUERIED, dateSent: iso(10), ...o } as Query);
const say = (o: Partial<Query>, name: string | null = "Harriet Vane", extra = {}) =>
  sentenceText(cardFacts(q(o), TODAY, { agentName: name, ...extra }).sentence);

describe("no pronoun, no verdict — the two things the copy may never contain", () => {
  it("⚠️ the module prints no gendered pronoun, in any string it can emit", () => {
    for (const word of ["his", "her", "hers", "she", "he"]) {
      expect(code, `the copy can print "${word}" — the record holds no gender`)
        .not.toMatch(new RegExp(`\\b${word}\\b`, "i"));
    }
  });

  it("⚠️ and no appraisal of the agent, or of the writer", () => {
    /* "late" as an ADJECTIVE is the one to watch: `register === "late"` is an internal key and is
       fine; a sentence calling a person late is a verdict. The sweep is on printable strings. */
    for (const word of ["should", "overdue", "still no", "finally", "at last", "too long"]) {
      const literals = [...code.matchAll(/["'`]([^"'`\n]{4,120})["'`]/g)].map((m) => m[1]);
      for (const lit of literals) {
        expect(lit.toLowerCase(), `a printable string appraises: "${lit}"`).not.toContain(word);
      }
    }
  });
});

describe("the relational templates, one per row of the ref's table", () => {
  it("calm names who is being waited on, and the date it is expected", () => {
    expect(say({ status: QueryStatus.QUERIED, dateSent: iso(3) }, "Harriet Vane", { agencyWeeks: 6 }))
      .toMatch(/^Waiting on Harriet — reply expected by \d+ \w+$/);
  });

  it("late states the distance in days and calls the WINDOW past, never the agent", () => {
    const s = say({ status: QueryStatus.QUERIED, dateSent: iso(200) }, "Harriet Vane", { agencyWeeks: 6 });
    expect(s).toMatch(/^Harriet is \d+ days? past the window$/);
    expect(s).not.toMatch(/\blate\b|\boverdue\b/i);
  });

  it("your move names what is waited on, per request kind", () => {
    expect(say({ status: QueryStatus.PARTIAL_REQUESTED, lastStatusChange: iso(3) })).toBe("Harriet is waiting on your partial");
    expect(say({ status: QueryStatus.FULL_REQUESTED, lastStatusChange: iso(3) })).toBe("Harriet is waiting on your full");
    expect(say({ status: QueryStatus.REVISE_RESUBMIT, lastStatusChange: iso(3) })).toBe("Harriet is waiting on your revisions");
  });

  it("offer, pass and withdrawal", () => {
    expect(say({ status: QueryStatus.OFFER, lastStatusChange: iso(2) })).toBe("Harriet is waiting on your answer");
    expect(say({ status: QueryStatus.REJECTED, lastStatusChange: iso(2), fullSentDate: iso(30) }))
      .toBe("Harriet passed — after the full");
    /* ⚠️ THE ONE ROW WITH NO AGENT IN IT — the writer is who acted */
    expect(say({ status: QueryStatus.WITHDRAWN, lastStatusChange: iso(2) })).toMatch(/^You withdrew — /);
  });

  it("⚠️ a record with no name still produces a sentence about a person", () => {
    expect(say({ status: QueryStatus.OFFER, lastStatusChange: iso(2) }, null)).toBe("The agent is waiting on your answer");
    expect(firstNameOf("Harriet Vane")).toBe("Harriet");
    expect(firstNameOf("Curtis")).toBe("Curtis");
    expect(firstNameOf("   ")).toBe("The agent");
  });
});

describe("the register — one derivation, five values", () => {
  it("⚠️ splits the agent's court by the window, and passes the rest through", () => {
    expect(registerOf("sand", false)).toBe("calm");
    expect(registerOf("agent", false)).toBe("calm");
    expect(registerOf("sand", true)).toBe("late");
    expect(registerOf("you", true)).toBe("you");
    expect(registerOf("offer", false)).toBe("offer");
    expect(registerOf("closed", true)).toBe("closed");
  });

  it("⚠️ every status the app has lands on a register, and the five are all reachable", () => {
    /* two derivations against each other: the registers `turnFor` can reach, against the labels */
    const reached = new Set<Register>();
    for (const st of Object.values(QueryStatus)) {
      for (const past of [false, true]) reached.add(registerOf(turnFor(st as QueryStatus), past));
    }
    expect([...reached].sort()).toEqual(["calm", "closed", "late", "offer", "you"]);
    expect(Object.keys(REGISTER_LABEL).sort()).toEqual([...reached].sort());
  });

  it("cardFacts agrees with registerOf for a fixture per register", () => {
    const cases: [Partial<Query>, Register][] = [
      [{ status: QueryStatus.QUERIED, dateSent: iso(3) }, "calm"],
      /* ⚠️ `late` NEEDS A STATED WINDOW TO BE PAST. Without one there is no expected date, so an
         old query is `calm` however long it has waited — which is correct, and is the property the
         first draft of this fixture got wrong: it asserted `late` on a query nobody had given a
         window, and the lock caught it. */
      [{ status: QueryStatus.QUERIED, dateSent: iso(200) }, "late"],
      [{ status: QueryStatus.FULL_REQUESTED, lastStatusChange: iso(3) }, "you"],
      [{ status: QueryStatus.OFFER, lastStatusChange: iso(2) }, "offer"],
      [{ status: QueryStatus.REJECTED, lastStatusChange: iso(2) }, "closed"],
    ];
    for (const [o, want] of cases) {
      expect(cardFacts(q(o), TODAY, { agentName: "Harriet Vane", agencyWeeks: 6 }).register, JSON.stringify(o)).toBe(want);
    }
  });
});
