/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Add an agent v2 — the journey's model (lib/queryActions/addAgentStages). The rendered locks are
 * tests/e2e/addAgentV2.measure.ts.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { SubmissionMethod, SubmissionStatus } from "../../types";
import { agentFromDraft } from "../agentCreate";
import { emptyCardDraft, problemsOf, type CardDraft } from "../cardDraft";
import { normaliseCountry } from "../territory";
import { A_LABEL, A_STAGES, addedLine, asksList, draftOfAnswers, freshA, headlineA, sampleName, stepHasAnswer, stepValue, type AState } from "./addAgentStages";

const full = (): AState => ({
  ...freshA("Sarah Jones"), agency: "Fenwick & Rowe", country: "GB", city: "London",
  genres: ["Thriller", "Crime"], wish: "Twisty, character-led thrillers.",
  ask: { letter: true, syn: true, sample: true, other: true }, synLen: "1", samp: { unit: "chapters", amt: 3, from: 1, sect: false, fu: null }, otherTx: "Author photo",
  method: "email", email: "sarah@fenwick.example", web: "fenwick.example", door: "open", wk: 8, wkNone: false, policy: "nrn", fit: 4,
});

/** the same answers, as add agent v1's journey held them (its `CardDraft`, field by field, as its pills and fields set them) */
const v1Draft = (): CardDraft => ({
  ...emptyCardDraft(), name: "Sarah Jones", agency: "Fenwick & Rowe", agencyUnknown: false, country: "GB", city: "London",
  email: "sarah@fenwick.example", website: "fenwick.example", genres: ["Thriller", "Crime"], wishlist: "Twisty, character-led thrillers.",
  mats: { ql: true, syn: { on: true, len: 1 }, smp: { on: true, unit: "Chapters", qty: 3 }, oth: { on: true, text: "Author photo" } },
  weeks: 8, nrn: true, method: SubmissionMethod.EMAIL, methodOther: "", door: "open", reopens: "", rating: 4,
});

const strip = (r: Record<string, unknown>) => { const { mswlCheckedAt: _, ...rest } = r; return rest; };

describe("Add an agent v2 · the model", () => {
  it("AA2-U1 · six steps, in the order ruled", () => {
    expect(A_STAGES.map((k) => A_LABEL[k])).toEqual(["Agent", "Wishlist", "Asks for", "How", "Replies", "Add"]);
  });

  it("AA2-U2 · the saved record for a fully filled agent equals, field for field, the old journey's for the same answers", () => {
    const d = draftOfAnswers(full(), normaliseCountry);
    expect(problemsOf(d)).toEqual({});
    expect(strip(agentFromDraft(d) as never)).toEqual(strip(agentFromDraft(v1Draft()) as never));
  });

  it("AA2-U3 · a name with Agency unknown saves the mark and nothing invented: no method guessed, the door Unknown", () => {
    const d = draftOfAnswers({ ...freshA("Jo March"), noAgency: true }, normaliseCountry);
    expect(problemsOf(d)).toEqual({});
    const r = agentFromDraft(d) as Record<string, unknown>;
    expect(r.agencyUnknown).toBe(true);
    expect(r.submissionStatus).toBe(SubmissionStatus.UNKNOWN);
    expect(r).not.toHaveProperty("responseTimeWeeks");
    expect(r).not.toHaveProperty("noResponseMeansNo");
    expect(r).not.toHaveProperty("starRating");
    expect(r.materialsWanted).toEqual([]);
  });

  it("AA2-U4 · a name with no agency and no mark is what the card's own rule refuses (the agency is asked for)", () => {
    expect(problemsOf(draftOfAnswers(freshA("Jo March"), normaliseCountry)).agency).toBeTruthy();
  });

  it("AA2-U5 · Online form and QueryManager save the link as the form, every other way as the website", () => {
    const f = agentFromDraft(draftOfAnswers({ ...full(), method: "form", web: "https://fenwick.example/submit" }, normaliseCountry)) as Record<string, unknown>;
    expect(f.website).toBe("");
    expect(f.socials).toEqual([{ platform: "Submission form", handle: "https://fenwick.example/submit" }]);
    const q = draftOfAnswers({ ...full(), method: "qm" }, normaliseCountry);
    expect(q.method).toBe(SubmissionMethod.QUERY_MANAGER);
    const o = agentFromDraft(draftOfAnswers({ ...full(), method: "other", methodTx: "Agency portal" }, normaliseCountry)) as Record<string, unknown>;
    expect(o.submissionMethod).toBe(SubmissionMethod.OTHER);
    expect(o.submissionMethodOther).toBe("Agency portal");
    expect(o.website).toBe("https://fenwick.example");
  });

  it("AA2-U6 · Not sure is the record's Unknown door; They always reply saves false, No response means no true", () => {
    expect(agentFromDraft(draftOfAnswers({ ...full(), door: "unsure" }, normaliseCountry)).submissionStatus).toBe(SubmissionStatus.UNKNOWN);
    expect(agentFromDraft(draftOfAnswers({ ...full(), door: "closed" }, normaliseCountry)).submissionStatus).toBe(SubmissionStatus.CLOSED);
    expect(draftOfAnswers({ ...full(), policy: "always" }, normaliseCountry).nrn).toBe(false);
    expect(draftOfAnswers({ ...full(), policy: "" }, normaliseCountry).nrn).toBeNull();
  });

  it("AA2-U7 · Elsewhere saves the country the app's own country field chose, as an ISO code; Unknown weeks save none", () => {
    expect(draftOfAnswers({ ...full(), country: "XX", elsewhere: "FR" }, normaliseCountry).country).toBe("FR");
    expect(draftOfAnswers({ ...full(), country: "XX", elsewhere: "" }, normaliseCountry).country).toBe("");
    expect(draftOfAnswers({ ...full(), wkNone: true }, normaliseCountry).weeks).toBeNull();
  });

  it("AA2-U8 · the synopsis length and the sample are stored the way the card stores them", () => {
    const mw = agentFromDraft(draftOfAnswers(full(), normaliseCountry)).materialsWanted;
    expect(mw).toEqual(["Query letter", "Synopsis (1 pages)", "First 3 chapters", "Author photo"]);
    const two = agentFromDraft(draftOfAnswers({ ...full(), synLen: "unsaid" }, normaliseCountry)).materialsWanted;
    expect(two).toContain("Synopsis");
  });

  it("AA2-U9 · the track's values, and Skip this until something is entered", () => {
    const s = full();
    expect(A_STAGES.slice(0, 5).map((k) => stepValue(s, k))).toEqual(["Sarah", "2 genres", "4 things", "Email", "8 weeks"]);
    const f = freshA("Sarah Jones");
    expect(["wish", "asks", "how", "reply"].map((k) => stepValue(f, k as never))).toEqual(["Skipped", "Skipped", "Skipped", "Skipped"]);
    expect(["wish", "asks", "how", "reply"].some((k) => stepHasAnswer(f, k as never))).toBe(false);
    expect(asksList(s)).toEqual(["Query letter", "Synopsis", "First 3 chapters", "Author photo"]);
    expect(sampleName({ unit: "words", amt: 5000, from: 1, sect: false, fu: null })).toBe("First 5,000 words");
  });

  it("AA2-U10 · the headline, by screen", () => {
    expect(headlineA(freshA(), null)).toEqual(["Found someone new?", "Let’s add them to your list."]);
    expect(headlineA({ ...full(), step: "wish" }, null)).toEqual(["Adding Sarah Jones.", "Add as much as you know."]);
    expect(headlineA(full(), { onFile: 18 })).toEqual(["Sarah is on your list.", "That’s 18 agents on file."]);
  });

  it("AA2-U11 · the added line, singular handled, and from inside Log a query", () => {
    expect(addedLine(4, "Sarah Jones", false)).toBe("4 details still to add. They’re waiting on Sarah’s card whenever you have them.");
    expect(addedLine(1, "Sarah Jones", false)).toBe("1 detail still to add. It’s waiting on Sarah’s card whenever you have it.");
    expect(addedLine(0, "Sarah Jones", false)).toBe("Everything’s on file. Sarah’s card is ready when you query.");
    expect(addedLine(3, "Sarah Jones", true)).toBe("Back to your query. Sarah is already chosen.");
  });

  it("AA2-U12 · nothing pre-ticked, and the reply time starts Unknown", () => {
    const f = freshA();
    expect(f.ask).toEqual({ letter: false, syn: false, sample: false, other: false });
    expect(f.wkNone).toBe(true);
    expect(f.method).toBe("");
    expect(f.policy).toBe("");
  });

  it("AA2-U13 · the journey's copy: no tap, no he or she for an agent, no green, and the ref's untrue line is not shipped", () => {
    const src = ["src/components/queries/centre/QcAddAgent.tsx", "src/lib/queryActions/addAgentStages.ts"].map((p) => readFileSync(p, "utf8")).join("\n")
      .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    expect(src).not.toMatch(/\btap\b/i);
    expect(src).not.toMatch(/\b(he|she|his|her|him)\b/);
    expect(src).not.toMatch(/ranks your Contact list/);
    /* no green: every six-digit colour the journey states has its green channel no stronger than both the others */
    const css = readFileSync("src/components/queries/centre/qcAddAgent.css", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(css).not.toMatch(/green/i);
    const greens = [...css.matchAll(/#([0-9a-f]{6})\b/gi)].map((m) => m[1]).filter((h) => { const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); return g > r + 8 && g > b + 8; });
    expect(greens).toEqual([]);
  });
  it("AA2-U14 · design v15: the wishlist page link is saved where the agent card reads it (the MSWL entry in socials)", () => {
    const a = agentFromDraft(draftOfAnswers({ ...full(), mswl: "agency.co.uk/sarah-jones" }, normaliseCountry)) as Record<string, unknown>;
    expect(a.socials).toEqual([{ platform: "MSWL", handle: "https://agency.co.uk/sarah-jones" }]);
    expect(agentFromDraft(draftOfAnswers(full(), normaliseCountry)).socials).toBeUndefined();
    expect(stepHasAnswer({ ...freshA("Jo March"), mswl: "x.co" }, "wish")).toBe(true);
    expect(problemsOf(draftOfAnswers({ ...full(), mswl: "not a link" }, normaliseCountry)).mswl).toBeTruthy();
  });

  it("AA2-U15 · design v15: a closed agent's reopening date saves to reopensOn; Not sure, Open and Not known save nothing", () => {
    const closed = { ...full(), door: "closed" as const, ro: 6, roNone: false, reopens: "2027-01-05" };
    expect(agentFromDraft(draftOfAnswers(closed, normaliseCountry)).reopensOn).toBe("2027-01-05");
    expect(agentFromDraft(draftOfAnswers({ ...closed, roNone: true }, normaliseCountry)).reopensOn).toBeUndefined();
    expect(agentFromDraft(draftOfAnswers({ ...closed, door: "open" }, normaliseCountry)).reopensOn).toBeUndefined();
    expect(agentFromDraft(draftOfAnswers({ ...closed, door: "unsure" }, normaliseCountry)).reopensOn).toBeUndefined();
    expect(freshA().roNone).toBe(true);
  });

  it("AA2-U16 · design v15: the typed sample saves its number as typed, in the record's own token", () => {
    const w = agentFromDraft(draftOfAnswers({ ...full(), samp: { unit: "words", amt: 7500, from: 1, sect: false, fu: null } }, normaliseCountry));
    expect(w.materialsWanted).toContain("7,500 words");
    /* under the picker's 500-word floor, and the record still holds it */
    const few = agentFromDraft(draftOfAnswers({ ...full(), samp: { unit: "words", amt: 300, from: 1, sect: false, fu: null } }, normaliseCountry));
    expect(few.materialsWanted).toContain("300 words");
    const p = agentFromDraft(draftOfAnswers({ ...full(), samp: { unit: "pages", amt: 35, from: 1, sect: false, fu: null } }, normaliseCountry));
    expect(p.materialsWanted).toContain("First 35 pages");
    expect(sampleName({ unit: "words", amt: 7500, from: 1, sect: false, fu: null })).toBe("First 7,500 words");
  });
});
