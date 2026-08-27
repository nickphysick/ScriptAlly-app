import { describe, it, expect } from "vitest";
import { QueryStatus } from "../types";
import { rowSentence, agentSurname, addressed, whenSaid, type RowCopy, scrawlEarns, type RowNote } from "./timelineCopy";

const TODAY = "2026-08-26";
const ago = (d: number) => {
  const x = new Date(`${TODAY}T12:00:00`); x.setDate(x.getDate() - d);
  return x.toISOString().slice(0, 10);
};
const ahead = (d: number) => ago(-d);
/* ⚠️ THE WEEKDAYS ARE NAMED, NOT COMPUTED FROM THE FUNCTION UNDER TEST. TODAY is a Wednesday, so
   Sunday is three days back and Friday five — written out because deriving the expectation with
   the same call the assertion makes would be the function agreeing with itself. */
const SUNDAY = ago(3), FRIDAY = ago(5);
/* an offer's deadline in the FUTURE — the brief's example is a Sunday still to come, and a past
   one legitimately reads "was due" instead, which is the point of that branch */
const SUNDAY_AHEAD = ahead(4);
const c = (over: Partial<RowCopy> = {}): RowCopy => ({
  surname: "Reed", status: QueryStatus.QUERIED,
  expectedYmd: null, nudgeYmd: null, nudgedOnYmd: null, lastWordYmd: null, closedYmd: null, ...over,
});

describe("the situations in the brief", () => {
  it("renders each one", () => {
    const cases: [string, RowCopy][] = [
      /* ⚠️ "Sept", NOT "Sep" — `en-GB` spells September that way and the brief draws it that
         way too. Written from the render rather than from an assumption about the locale. */
      ["Out with Reed — reply expected by 10 Sept", c({ expectedYmd: "2026-09-10" })],
      ["Out with Reed — no reply time given", c()],
      ["They want the full — asked 3 days ago", c({ status: QueryStatus.FULL_REQUESTED, lastWordYmd: ago(3) })],
      ["No word in 40 days", c({ lastWordYmd: ago(40), expectedYmd: ago(10) })],
      ["Offer on the table — an answer by Sunday", c({ status: QueryStatus.OFFER, expectedYmd: SUNDAY_AHEAD })],
      ["Offer on the table — an answer was due Sunday", c({ status: QueryStatus.OFFER, expectedYmd: SUNDAY })],
      ["No word in 40 days — a nudge fell due on 16 Apr",
        c({ lastWordYmd: ago(40), nudgeYmd: "2026-04-16" })],
      ["Nudged Sunday — a reminder falls due in 5 days", c({ nudgedOnYmd: SUNDAY, nudgeYmd: ahead(5) })],
      ["Nudged Sunday — giving it 2 more weeks", c({ nudgedOnYmd: SUNDAY, nudgeYmd: ahead(14) })],
      ["Closed on Friday — full record in Query Centre", c({ closedYmd: FRIDAY })],
    ];
    for (const [want, facts] of cases) expect(rowSentence(facts, TODAY)).toBe(want);
  });

  it("a partial and an R&R read as themselves, never as a status name", () => {
    expect(rowSentence(c({ status: QueryStatus.PARTIAL_REQUESTED, lastWordYmd: ago(1) }), TODAY))
      .toBe("They want a partial — asked 1 day ago");
    expect(rowSentence(c({ status: QueryStatus.REVISE_RESUBMIT, lastWordYmd: TODAY }), TODAY))
      .toBe("They want a revise and resubmit — asked today");
  });
});

describe("never a pronoun, and never a verdict", () => {
  /**
   * ⚠️ SWEPT OVER EVERY REACHABLE SENTENCE, NOT OVER THE ONES I REMEMBERED TO WRITE. The app does
   * not store an agent's gender, so a guess is a 50% error rate on a real person's name.
   */
  const every = (): string[] => {
    const out: string[] = [];
    const statuses = Object.values(QueryStatus) as QueryStatus[];
    for (const status of statuses) {
      for (const surname of ["Reed", "Vane-Coe", null]) {
        for (const expectedYmd of [null, ago(9), ahead(9)]) {
          for (const nudgeYmd of [null, ago(4), ahead(4), ahead(14)]) {
            for (const nudgedOnYmd of [null, ago(3)]) {
              for (const lastWordYmd of [null, ago(1), ago(40)]) {
                for (const closedYmd of [null, ago(2)]) {
                  out.push(rowSentence(
                    { surname, status, expectedYmd, nudgeYmd, nudgedOnYmd, lastWordYmd, closedYmd }, TODAY));
                }
              }
            }
          }
        }
      }
    }
    return out;
  };

  it("no her, him, his, she or he in any sentence the module can produce", () => {
    const all = every();
    expect(all.length, "the sweep produced nothing").toBeGreaterThan(500);
    const bad = all.filter((s) => /\b(her|hers|him|his|she|he)\b/i.test(s));
    expect(bad.slice(0, 5), `${bad.length} sentences carry a pronoun`).toEqual([]);
  });

  it("no verdict, no adverb of judgement, and never the forbidden word", () => {
    const bad = every().filter((s) =>
      /\b(overdue|late|missed|failed|behind|still|already|only|just|slow|finally|at last)\b/i.test(s));
    expect(bad.slice(0, 5), `${bad.length} sentences judge`).toEqual([]);
  });

  it("no derivation name reaches a sentence", () => {
    const bad = every().filter((s) =>
      /reply window|your move|their move|your turn|ball ?holder|writer's turn/i.test(s));
    expect(bad.slice(0, 5), `${bad.length} sentences speak the code's language`).toEqual([]);
  });

  it("every sentence is non-empty and starts with a capital", () => {
    for (const s of every()) {
      expect(s.length, "an empty sentence").toBeGreaterThan(0);
      expect(s[0], s).toBe(s[0].toUpperCase());
    }
  });
});

describe("how an agent is addressed", () => {
  it("the surname where there is one", () => {
    expect(agentSurname("Marcus Reed")).toBe("Reed");
    expect(agentSurname("Elinor Vane-Coe")).toBe("Vane-Coe");
    expect(agentSurname("  Priya   Nair  ")).toBe("Nair");
    /* a single word is a surname already, or a mononym; both read correctly */
    expect(agentSurname("Whitfield")).toBe("Whitfield");
  });

  it("`the agent` where there is not — and it is never a pronoun", () => {
    expect(agentSurname("")).toBeNull();
    expect(agentSurname(null)).toBeNull();
    expect(agentSurname(undefined)).toBeNull();
    /* an initial or a stray mark is not a name to address someone by */
    expect(agentSurname("Marcus R.")).toBeNull();
    expect(agentSurname("Curtis Brown —")).toBeNull();
    expect(addressed(null)).toBe("the agent");
    expect(rowSentence({ surname: null, status: QueryStatus.QUERIED, expectedYmd: null,
      nudgeYmd: null, nudgedOnYmd: null, lastWordYmd: null, closedYmd: null }, TODAY))
      .toBe("Out with the agent — no reply time given");
  });
});

describe("a recent date is a weekday, an older one is a date", () => {
  it("six days, not seven", () => {
    expect(whenSaid(TODAY, TODAY)).toBe("today");
    expect(whenSaid(ago(1), TODAY)).toBe("yesterday");
    /* ⚠️ AT SEVEN A WEEKDAY IS AMBIGUOUS between the one just gone and the one before it, and the
       reader has no way to tell which. Six is the largest window that names exactly one day. */
    expect(whenSaid(ahead(1), TODAY)).toBe("tomorrow");
    expect(whenSaid(ago(6), TODAY)).not.toMatch(/\d/);
    expect(whenSaid(ago(7), TODAY)).toMatch(/\d/);
    /* ⚠️ AND FORWARD TOO — "an answer by Sunday" is how a deadline four days out is spoken about. */
    expect(whenSaid(ahead(6), TODAY)).not.toMatch(/\d/);
    expect(whenSaid(ahead(7), TODAY)).toMatch(/\d/);
  });
});

/* ══ WHETHER A SCRAWL EARNS ITS PLACE (Porcelain, Phase 6) ═══════════════════════════════════ */

describe("a scrawl must carry a fact its own row does not already state", () => {
  const note = (deed: string, timing: string): RowNote => ({ deed, timing });

  it("⚠️ KEEPS the one the ref's audit calls the best thing on the board", () => {
    /* "Send it · due 15 days ago" beside a SEND THE PARTIAL button and a bar reading "Partial
       req": the interval is nowhere else on the row. */
    expect(scrawlEarns(note("Send it", "due 15 days ago"), ["Partial req"])).toBe(true);
  });

  it("⚠️ CUTS the one it calls charm doing no work", () => {
    /* "Nudge them · due today" beside a NUDGE button and a bar reading "Nudge due" — and TODAY is
       the most visible fact on the page, with a ruled line through every row and a dated flag
       above it. A fourth statement of it is not a fact, it is decoration. */
    expect(scrawlEarns(note("Nudge them", "due today"), ["Nudge due"])).toBe(false);
  });

  it("the deed alone never earns it, because the button IS the deed", () => {
    /* both are built from the same `DEED` table, so a scrawl with no timing is by construction a
       second copy of the button six inches to its right */
    expect(scrawlEarns(note("Nudge or close it", ""), [])).toBe(false);
    expect(scrawlEarns(null, ["anything"])).toBe(false);
  });

  it("a date the bar already names does not earn it either", () => {
    expect(scrawlEarns(note("Send the full", "by 14 Sept"), ["Full req · by 14 Sept"])).toBe(false);
    /* …and the same date on a bar that has gone bare DOES, which is the point of comparing
       against the LONG label rather than the fitted one */
    expect(scrawlEarns(note("Send the full", "by 14 Sept"), ["Full requested"])).toBe(true);
  });

  it("⚠️ THE COMPARISON IS ON THE FACT, NOT THE PREPOSITION", () => {
    /* "by 2 Sept" against a bar reading "answer by 2 Sept" is the same date twice however the two
       are worded, so the preposition is stripped before the two are compared */
    expect(scrawlEarns(note("Answer them", "by 2 Sept"), ["Offer received · answer by 2 Sept"])).toBe(false);
    /* and separators must not defeat it */
    expect(scrawlEarns(note("Answer them", "by 2 Sept"), ["Offer · answer by 2 Sept."])).toBe(false);
  });
});
