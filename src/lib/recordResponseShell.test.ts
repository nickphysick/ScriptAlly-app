/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * RECORDING A RESPONSE — THE SHELL (§1, ref design-refs/83-record-response.html).
 *
 * ⚠️ ONE JOURNEY, ONE IMPLEMENTATION. The thing this section removed was not a second entry point —
 * a dashboard hero and a rail capture opening the same room are fine. It was a primary and an
 * inline composer that BEHAVED DIFFERENTLY inside one page, which is two implementations of one
 * journey and the reason they had already drifted: the primary did not record anything at all, it
 * focused the composer.
 */
import { describe, it, expect } from "vitest";
import { sliceBetween } from "../test/sliceBetween";
import { readFileSync } from "fs";
import { QueryStatus } from "../types";
import {
  OUTCOME_ORDER, OUTCOME_STATUS, OUTCOME_LABEL, OUTCOME_JOURNEY, OUTCOME_TONE,
  emptyResponseDraft, responseReady, responseChips, responseDraftToPayload, repliedIn,
} from "./responseDraft";
import { responseRefRows, refDate } from "./responseContext";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const queries = read("../components/Queries.tsx");
const pane = read("../components/queries/ResponsePane.tsx");
const css = read("../components/shell/f12.css");

describe("the takeover opens from the primary, and from nowhere else", () => {
  it("the Record response primary opens it", () => {
    expect(queries).toContain("onClick={() => openRecord(activeQuery)}");
  });

  /* ⚠️ THE PRIMARY USED TO FOCUS THE COMPOSER. Deleting the composer and giving the primary a real
     action are the same change — a test for one without the other would pass over a dead button. */
  it("and no longer merely focuses a composer", () => {
    expect(queries, "the primary is still pointing at the retired composer")
      .not.toContain("composerRef.current?.focus()");
  });

  it("the inline 'What happened next?' panel no longer renders", () => {
    expect(queries, "the second implementation came back").not.toContain("<TimelineComposer");
  });

  /* Closing a query is something that came back, so it is an OUTCOME rather than a toolbar verb
     with its own menu and its own write path. */
  it("'Mark closed' is absent from the toolbar", () => {
    expect(queries, "Mark closed came back to the bar").not.toContain(">\n                      Mark closed");
    expect(queries).not.toMatch(/Mark closed\s*\n\s*<\/button>/);
  });

  /* Every real use of it was one of three things, and two of them have their own home. */
  it("and so is the generic Edit", () => {
    expect(queries).not.toMatch(/f12-act"[^>]*>\s*<svg[^>]*>[\s\S]{0,200}?<\/svg>\s*Edit\s*<\/button>/);
  });
});

describe("every outcome maps to a real status", () => {
  /* ⚠️ ASSERTED AGAINST THE ENUM, NEVER A LITERAL. The values carry spellings a literal gets wrong
     — an ampersand in "Revise & Resubmit", a space in "No Response" — and a near-miss writes a
     status nothing else in the app recognises. */
  it("each of the six resolves to a QueryStatus member", () => {
    const members = new Set(Object.values(QueryStatus));
    for (const o of OUTCOME_ORDER) {
      expect(members.has(OUTCOME_STATUS[o]), `${o} maps outside the enum`).toBe(true);
    }
    expect(OUTCOME_STATUS.rr).toBe(QueryStatus.REVISE_RESUBMIT);
    expect(OUTCOME_STATUS.noreply).toBe(QueryStatus.NO_RESPONSE);
  });

  /* ⚠️ WITHDRAWN IS NOT AN OUTCOME, and that is the decision rather than an omission: nothing came
     back, the writer pulled out. §5 gives it its own action so the status stays reachable. */
  it("and Withdrawn is deliberately not among them", () => {
    expect(Object.values(OUTCOME_STATUS)).not.toContain(QueryStatus.WITHDRAWN);
  });

  /* The payload never sends the one closing reason that would divert a close to WITHDRAWN. */
  it("a 'no reply' close cannot become a withdrawal by accident", () => {
    const d = { ...emptyResponseDraft("2026-08-11"), outcome: "noreply" as const };
    expect(responseDraftToPayload(d).closingReason).toBe("No response after expected window");
    expect(responseDraftToPayload(d).closingReason).not.toBe("Withdrew my submission");
  });

  it("the six cover the three journeys", () => {
    expect(new Set(OUTCOME_ORDER.map((o) => OUTCOME_JOURNEY[o])))
      .toEqual(new Set(["request", "offer", "ending"]));
  });
});

describe("save waits for two facts and nothing else", () => {
  /* Required ≠ sequential — the rule the create stack is built on, inherited here. */
  it("outcome plus date enables it, with every later step unvisited", () => {
    const d = emptyResponseDraft("2026-08-11");
    expect(responseReady(d), "a date alone is not an outcome").toBe(false);
    expect(responseReady({ ...d, outcome: "rejected" }), "and those two are enough").toBe(true);
    expect(responseReady({ ...d, outcome: "rejected", dateArrived: "" })).toBe(false);
  });
});

describe("the header's two chips", () => {
  /* ⚠️ A DASH FOR WHAT WE PRE-FILLED. The date defaults to today, which is right more often than
     not — but pre-filling is not the writer agreeing, and an outlined tick still reads as done. */
  it("the pre-filled date takes a dash until its step has been opened", () => {
    const d = emptyResponseDraft("2026-08-11");
    const before = responseChips(d, { when: false });
    expect(before.find((c) => c.key === "date")?.state).toBe("prefilled");
    expect(before.find((c) => c.key === "outcome")?.state, "nothing pre-fills an outcome").toBe("empty");
    const after = responseChips({ ...d, outcome: "offer" }, { when: true });
    expect(after.find((c) => c.key === "date")?.state).toBe("done");
    expect(after.find((c) => c.key === "outcome")?.state).toBe("done");
  });

  it("and there are exactly two, because Save waits for exactly two", () => {
    expect(responseChips(emptyResponseDraft("2026-08-11"), { when: false }).map((c) => c.key))
      .toEqual(["outcome", "date"]);
  });
});

describe("the reference panel is there on the first frame", () => {
  /**
   * ⚠️ IT IS CREATE'S PANEL NOW (Pack A §2). `.qr-ref` was a SECOND chassis for the same job, and
   * the two drifted exactly as a fork does — browser-measured 326x427 with `align-self: flex-start`
   * in create against 300x642 with `align-self: stretch` here. Neither was wrong on its own terms,
   * which is why the lock is cross-journey equality (queryCentreGlance.test.ts) rather than a pixel
   * value on either side. What survives here is the property this case was always about: the panel
   * is present from the FIRST frame, unlike create's, where the agent is unknown until stage 2.
   */
  it("it renders beside the flow rather than after a stage", () => {
    /* ⚠️ COMMENT-STRIPPED. The deletion is EXPLAINED in prose sitting where the panel used to be —
       naming `.qr-ref` and the measurements that condemned it — so a raw scan finds the very string
       it asserts is gone. Eighth time in this stream of work; a rule about code is asserted against
       code, always. */
    const paneCode = pane.replace(/\{?\/\*[\s\S]*?\*\/\}?/g, "").replace(/^\s*\/\/.*$/gm, "");
    expect(paneCode, "record grew its own panel again").not.toContain("qr-ref");
    expect(pane, "it must render the shared chassis").toContain("<AgentContextPanel");
    expect(pane, "it must not wait on a stage the way create's does").not.toContain("stackAvailable");
  });

  it("and it states what a reply needs, not what a send needs", () => {
    const q = { id: "q1", agentId: "a1", manuscriptId: "m1", status: QueryStatus.QUERIED, dateSent: "2026-06-01",
      materialsWanted: ["Query Letter"], sendMethod: "Email" } as never;
    const agent = { id: "a1", name: "Elinor Hale", responseTimeWeeks: 8 } as never;
    const rows = responseRefRows(q, agent, [], "Murphy's Day Out");
    /* ⚠️ "You sent" NAMES THE MATERIALS, not the manuscript. The book is in the place line two
       inches above; what this row is for is what physically went out, because a reply lands
       differently depending on whether it answers a query letter or a full. */
    const sent = rows.find((r) => r.label === "You sent");
    expect(sent, "the send row is missing").toBeTruthy();
    /* `formatQueryMaterial` normalises the casing — the row shows what the app calls it, not what
       the stored string happens to be capitalised as. */
    expect(sent!.text.toLowerCase()).toContain("query letter");
    expect(sent!.text).toContain("Email");
    expect(rows.map((r) => r.label)).toContain("They said");
  });

  /**
   * ⚠️ THE MIDDLE ROW CHANGES WITH THE OUTCOME (§2) — before a choice it is the window they stated,
   * an offer says an answer is owed, and a closed-no-reply states what they said about silence.
   * Every other outcome keeps the window rather than inventing a line: a row obliged to say
   * something for six outcomes says something bland for four of them.
   */
  it("the contextual row follows the outcome", () => {
    const q = { id: "q1", agentId: "a1", manuscriptId: "m1", status: QueryStatus.QUERIED, dateSent: "2026-06-01" } as never;
    const agent = { id: "a1", name: "Elinor Hale", responseTimeWeeks: 8, noResponseMeansNo: true } as never;
    const labels = (o: never | null) => responseRefRows(q, agent, [], "X", o as never).map((r) => r.label);
    expect(labels(null), "no choice yet — the window they stated").toContain("They said");
    expect(labels("offer" as never)).toContain("An answer is owed");
    expect(labels("noreply" as never)).toContain("Their stated policy");
    expect(labels("rejected" as never), "an ordinary outcome keeps the window").toContain("They said");
  });

  /* ⚠️ AND THE OFFER ROW STATES NO DATE. An offer's answer-by is a fact the AGENT gives; deriving
     one from a house window would put a deadline in front of the writer that nobody set. */
  it("the offer row promises no date the app does not have", () => {
    const q = { id: "q1", agentId: "a1", manuscriptId: "m1", status: QueryStatus.QUERIED } as never;
    const agent = { id: "a1", name: "E", responseTimeWeeks: 8 } as never;
    const row = responseRefRows(q, agent, [], "X", "offer" as never).find((r) => r.label === "An answer is owed");
    expect(row, "the offer row is missing").toBeTruthy();
    expect(row!.text, "a date was invented").not.toMatch(/\d{4}|\bweeks?\b/);
  });

  /* ⚠️ OMITS RATHER THAN BLANKS. A labelled empty row states that we hold nothing, which is noise
     on a surface whose whole job is to be glanceable. */
  it("a row with nothing to say is not rendered", () => {
    const q = { id: "q1", agentId: "a1", manuscriptId: "m1", status: QueryStatus.QUERIED } as never;
    const bare = { id: "a1", name: "Elinor Hale" } as never;
    expect(responseRefRows(q, bare, []).map((r) => r.label)).not.toContain("They said");
  });

  /* `new Date(junk).toLocaleDateString()` is the literal string "Invalid Date", and it has reached
     this app's screens before. A date we cannot state truthfully does not appear. */
  it("and an unparseable date is omitted rather than printed at the writer", () => {
    expect(refDate("14/03/2024")).toBe("");
    expect(refDate("")).toBe("");
    expect(refDate("2026-06-01")).toContain("2026");
  });
});

describe("the interval is a fact, not a verdict", () => {
  it("it states the days and says nothing about them", () => {
    expect(repliedIn("2026-06-01", "2026-06-07")).toBe("Replied in 6 days");
    expect(repliedIn("2026-06-01", "2026-06-02")).toBe("Replied in 1 day");
    expect(repliedIn("2026-06-01", "2026-06-01")).toBe("Replied the same day");
  });

  it("and it is derived, never stored", () => {
    expect(pane, "the interval must be computed at render").toContain("repliedIn(sentISO, draft.dateArrived)");
    expect(Object.keys(emptyResponseDraft("2026-08-11"))).not.toContain("interval");
  });

  /* A reply cannot predate the query; §3 bounds the picker, and until then the line refuses. */
  it("a date before the send yields nothing rather than a negative", () => {
    expect(repliedIn("2026-06-07", "2026-06-01")).toBeNull();
  });
});

describe("it wears the shared motion, not a second copy", () => {
  it("the same three classes create uses", () => {
    expect(queries).toContain("createEntering || respEntering ? \" qc-entering\" : \"\"");
    expect(queries).toContain("createCancelling || respCancelling ? \" qc-exit-cancel\" : \"\"");
    expect(queries).toContain("createExiting || respExiting ? \" qc-exit-save\" : \"\"");
  });

  /* ⚠️ `animation: none` FIRES NO `animationend`, so a class armed under reduced motion is never
     cleared. Every arming site branches instead. */
  it("and reduced motion cuts to the final frame at every arming site", () => {
    expect(queries).toContain("setRespEntering(!prefersReducedMotion());");
    const save = sliceBetween(queries, "const saveResponse = async", "/** The picker's inline quick-add");
    expect(save).not.toBe("");
    /* ⚠️ AMENDED (§5): the branch now also shows the seal at its final frame before completing
       directly. The reason it must not WAIT is unchanged — `animation: none` fires no
       `animationend`, so a seal-armed exit would strand the sheet open forever. */
    expect(save).toContain("if (prefersReducedMotion()) { setSeal({ kind, thenExit: false }); shutRecord(); recordTriggerRef.current?.focus(); }");
    const close = sliceBetween(queries, "const closeRecord = ()", "const saveResponse = async");
    expect(close).toContain("if (prefersReducedMotion()) { shutRecord(); recordTriggerRef.current?.focus(); return; }");
  });

  /* Animate on success, never on click: a failed write must not have already shown an exit. */
  it("a failed write leaves the takeover open with its error", () => {
    const save = sliceBetween(queries, "const saveResponse = async", "/** The picker's inline quick-add");
    const fail = save.slice(save.indexOf("} catch {"));
    expect(fail).toContain("setRespError(");
    expect(fail, "a failed save must not animate").not.toContain("setRespExiting");
  });
});

describe("no red anywhere, and the palette is the app's own", () => {
  /* ⚠️ A REJECTION IS GREY, NOT RED. The app reports what happened; it does not tell the writer how
     to feel about it, and red is an opinion in the one place a writer least wants one. */
  it("endings are muted, offers burgundy, incoming sage", () => {
    expect(OUTCOME_TONE.rejected).toBe("shut");
    expect(OUTCOME_TONE.noreply).toBe("shut");
    expect(OUTCOME_TONE.offer).toBe("offer");
    for (const o of ["partial", "full", "rr"] as const) expect(OUTCOME_TONE[o]).toBe("in");
  });

  it("and the marks read existing tokens rather than new literals", () => {
    /* ⚠️ THE SLICE IS BOUNDED AT BOTH ENDS. It ran to the END OF THE FILE, so it read every rule
       ever appended after the response block — and the moment §5's devices landed there it reported
       "the response block introduced literals" about eight hexes in a block it has nothing to do
       with. An open-ended slice is a bet that nothing will ever be added below it, which is the
       same bet a `lastIndexOf` anchor makes. (The hexes were a real fault too, and are gone — but
       the lock had to be able to say WHERE.) */
    const from = css.indexOf("/* ══ RECORDING A RESPONSE");
    expect(from, "the response block is missing").toBeGreaterThan(-1);
    const next = css.indexOf("\n/* ══", from + 1);
    const block = next > -1 ? css.slice(from, next) : css.slice(from);
    expect(block, "the response block is empty — this case is testing nothing").not.toBe("");
    for (const m of ["qr-m-in", "qr-m-offer", "qr-m-shut"]) expect(block).toContain(m);
    /* No raw hex anywhere in the response block — every colour is a token. */
    const hexes = block.match(/#[0-9a-fA-F]{3,6}\b/g) ?? [];
    expect(hexes, `the response block introduced literals: ${hexes.join(", ")}`).toHaveLength(0);
  });
});

describe("a response belongs to one query", () => {
  /* No "save and record another": there is no next response to move on to, and offering one would
     invent a batch that does not exist. */
  /* ⚠️ THE SAVE LIVES IN THE DOCK NOW (§3) — this sliced the journey HEADER, which no longer holds
     any action. The rule it protects is unchanged: a response belongs to one query, so there is no
     next one to move on to and a batch action here would invent one. */
  it("there is no save-and-record-another", () => {
    const at = queries.indexOf('<span className="qc-dock-acts">');
    expect(at, "the dock's action cluster is missing").toBeGreaterThan(-1);
    const dock = queries.slice(at, queries.indexOf("</span>", queries.indexOf("Save query")));
    expect(dock, "the response save is missing from the dock").toContain("Save response");
    /* the record BRANCH of the dock — the create branch legitimately has one */
    const recBranch = dock.slice(dock.indexOf("recording ?"), dock.indexOf(") : ("));
    expect(recBranch, "a batch action in the record branch would be inventing one").not.toContain("log another");
  });

  /* ⚠️ ITS OWN RECEIPT CHANNEL. Logging a query and recording a reply are different facts; sharing
     a channel would delete a receipt whose undo had not been used. */
  it("and its receipt does not replace the create receipt", () => {
    expect(queries).toContain('const RESPONSE_RECEIPT_CHANNEL = "query-response";');
    expect(queries).toContain("replaces: RESPONSE_RECEIPT_CHANNEL,");
  });
});

describe("the write goes through the one path", () => {
  /* ⚠️ `recomputeQuery` REMAINS THE SINGLE WRITER of status, response count, revision round and the
     pipeline dates. This journey appends an activity and derives nothing itself. */
  it("recordQueryResponse, and nothing sets a status here", () => {
    const save = sliceBetween(queries, "const saveResponse = async", "/** The picker's inline quick-add");
    expect(save).toContain("await recordQueryResponse(");
    expect(save, "status is derived, never written").not.toContain("status:");
    expect(save, "and the toolbar's old direct writer is not reachable from here")
      .not.toContain("updateQueryStatus");
  });

  /* Eighteen fields, stated rather than cast — a cast typechecks and then hands the write path
     `undefined` where it expects strings. */
  it("the payload is built by a named function", () => {
    expect(queries).toContain("responseDraftToPayload(respDraft)");
    const payload = responseDraftToPayload({ ...emptyResponseDraft("2026-08-11"), outcome: "rejected" });
    for (const k of ["materialsType", "expectedBy", "offerNotes", "closingNotes", "requeryPreference"]) {
      expect(payload[k as keyof typeof payload], `${k} is undefined in the payload`).toBeDefined();
    }
    expect(payload.responseType).toBe("rejected");
    expect(payload.dateReceived).toBe("2026-08-11");
  });

  it("and every outcome produces a payload the write path understands", () => {
    for (const o of OUTCOME_ORDER) {
      const p = responseDraftToPayload({ ...emptyResponseDraft("2026-08-11"), outcome: o });
      expect(p.responseType, `${OUTCOME_LABEL[o]} has no response type`).toBeTruthy();
    }
  });
});
