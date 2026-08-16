/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The in-pane journey's pure model (Item 9, Phase 2).
 */
import { describe, it, expect } from "vitest";
import { openSend, sendSummary, canCommitSend, whenMode, ymdLocal, shortDay, SEND_METHODS } from "./paneJourney";

/* ⚠️ A FIXED CLOCK, PASSED IN. Every function here takes `now` rather than reading it, so the tests
   are not a lottery run at midnight — and the production callers pass a real one, so nothing is
   being tested that the app does not do. */
const NOW = new Date(2026, 7, 16, 10, 30);   // 16 Aug 2026, local

describe("openSend — what the journey opens on", () => {
  it("⚠️ THE MATERIALS OPEN TICKED — the card states them as a RECORD, so this confirms", () => {
    /* the journey is not asking what to send from nothing; the card has just said what is on file.
       Untick is the writer CORRECTING it, which is a smaller act than assembling the list. */
    const v = openSend(["The partial — as Greg asked"], undefined, NOW);
    expect(v.materials).toEqual(["The partial — as Greg asked"]);
  });

  it("⚠️ THE METHOD OPENS ON THE QUERY'S OWN, where the record holds one", () => {
    /* defaulting to Email when the record says Post would be the app quietly overwriting a fact it
       already had */
    expect(openSend([], "Post", NOW).method).toBe("Post");
    expect(openSend([], "agency portal", NOW).method).toBe("Agency portal");   // case-insensitive
  });

  it("falls back to Email only where the record states nothing it recognises", () => {
    expect(openSend([], undefined, NOW).method).toBe("Email");
    expect(openSend([], "carrier pigeon", NOW).method).toBe("Email");
  });

  it("opens on today, in LOCAL time", () => {
    /* ⚠️ NEVER `toISOString().slice(0,10)` — that is UTC, and west of Greenwich it dates a morning
       send to the previous day. The whole point of this step is which day it was. */
    expect(openSend([], undefined, NOW).sentDate).toBe("2026-08-16");
  });

  it("the three methods are the ref's three, and there is no free-text fourth", () => {
    /* a fourth channel would be a field nothing downstream reads — `recordMaterialsSent` has no
       home for the method at all */
    expect([...SEND_METHODS]).toEqual(["Email", "Agency portal", "Post"]);
  });
});

describe("whenMode — which segment a date lights", () => {
  it("today and yesterday are named; anything else is a date", () => {
    expect(whenMode("2026-08-16", NOW)).toBe("today");
    expect(whenMode("2026-08-15", NOW)).toBe("yesterday");
    expect(whenMode("2026-08-01", NOW)).toBe("other");
  });

  it("⚠️ IT CROSSES A MONTH BOUNDARY CORRECTLY — yesterday of the 1st is the 31st", () => {
    /* `now.getDate() - 1` through the Date constructor, never a string subtraction */
    expect(whenMode("2026-07-31", new Date(2026, 7, 1, 9, 0))).toBe("yesterday");
  });

  it("the chosen day relabels the segment", () => {
    expect(shortDay("2026-08-01")).toBe("1 Aug");
  });
});

describe("sendSummary — the sentence about to be committed", () => {
  it("assembles from the writer's own answers", () => {
    const v = openSend(["The partial"], "Email", NOW);
    expect(sendSummary(v, NOW)).toBe("Recording The partial, sent by email today.");
  });

  it("the free text joins the materials rather than sitting apart from them", () => {
    const v = { ...openSend(["The partial"], "Post", NOW), also: "a covering line" };
    expect(sendSummary(v, NOW)).toBe("Recording The partial, a covering line, sent by post today.");
  });

  it("⚠️ NOTHING TICKED SAYS SO, rather than naming a default the writer did not choose", () => {
    const v = { ...openSend([], "Email", NOW), materials: [] };
    expect(sendSummary(v, NOW)).toContain("nothing marked as going");
  });

  it("a back-dated send names the day", () => {
    const v = { ...openSend(["The full"], "Email", NOW), sentDate: "2026-08-01" };
    expect(sendSummary(v, NOW)).toBe("Recording The full, sent by email on 1 Aug.");
  });

  it("⚠️ IT IS A SENTENCE, NOT A FIELD LIST — no labels, no colons", () => {
    /* "Materials: … / Method: … / Date: …" is a form talking about itself; this is the thing being
       done, in words the writer could have said. */
    const s = sendSummary(openSend(["The partial"], "Email", NOW), NOW);
    expect(s).not.toContain(":");
    expect(s.endsWith(".")).toBe(true);
  });
});

describe("canCommitSend — what actually blocks the deed", () => {
  it("⚠️ ONLY A DATE BLOCKS IT, and materials deliberately do not", () => {
    /* a writer who sent an empty covering email with nothing attached is recording a real thing;
       a writer with no date is recording an event that happened on no day. Materials are a record,
       not a requirement — the same reason the card MARKS them rather than asking. */
    expect(canCommitSend({ ...openSend([], "Email", NOW), materials: [] })).toBe(true);
    expect(canCommitSend({ ...openSend([], "Email", NOW), sentDate: "" })).toBe(false);
    expect(canCommitSend({ ...openSend([], "Email", NOW), sentDate: "not a date" })).toBe(false);
  });
});
