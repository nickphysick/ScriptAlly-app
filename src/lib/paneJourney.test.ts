/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The in-pane journey's pure model (Item 9, Phase 2).
 */
import { describe, it, expect } from "vitest";
import { openSend, sendSummary, canCommitSend, canCommit, whenMode, ymdLocal, shortDay, SEND_METHODS, JOURNEY_STEPS, JOURNEY_PRELINE, JOURNEY_ACT, JOURNEY_HINT, journeySummary, checkBackLabel, CLOSE_REASON_COPY, OFFER_BRANCHES, OFFER_ACT, OFFER_HINT, canCommitOffer, offerSummary, seedNotify } from "./paneJourney";
import { CLOSE_REASONS } from "./todoJourneys";

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

/* ── Phase 3 · the shorter journeys ──────────────────────────────────────────────────────────── */

describe("⚠️ THE STACKS ARE DIFFERENT LENGTHS ON PURPOSE — no padding for symmetry", () => {
  it("a send asks four, a chase two, a close one — plus the optional note", () => {
    expect(JOURNEY_STEPS.send).toEqual(["what-went", "how", "when", "remember"]);
    expect(JOURNEY_STEPS.chase).toEqual(["when", "check-back", "remember"]);
    expect(JOURNEY_STEPS.close).toEqual(["why", "remember"]);
  });

  it("⚠️ A CHASE HAS NO `how it went` STEP, because the write has no home for one", () => {
    /* `nudgeWriteArgs` takes `checkBackDate`, `eventDate` and an optional note; its own comment
       says the method "stays display-only (the write path has no home for it)". A step collecting
       an answer that goes nowhere is the filler this stack refuses. */
    expect(JOURNEY_STEPS.chase).not.toContain("how");
  });

  it("⚠️ AND A CLOSE ASKS ONE THING — the only thing the app does not already know", () => {
    expect(JOURNEY_STEPS.close.filter((s) => s !== "remember")).toEqual(["why"]);
  });
});

describe("the close's one question", () => {
  it("⚠️ IT OPENS WITH NO REASON CHOSEN, and the commit is blocked until there is one", () => {
    /* the three write three DIFFERENT statuses, so a pre-selected first option would write a
       NO_RESPONSE for a query the writer withdrew, on a form they never touched */
    const v = openSend([], undefined, NOW);
    expect(v.reason).toBeNull();
    expect(canCommit("close", v)).toBe(false);
    expect(canCommit("close", { ...v, reason: "withdrawn" })).toBe(true);
  });

  it("⚠️ THE COPY AND THE WRITE READ THE SAME THREE KEYS — never two lists", () => {
    /* `CLOSE_REASONS` owns the key → status mapping and the journey's copy must not drift from it;
       asserted against each other rather than against literals. */
    expect(CLOSE_REASON_COPY.map((r) => r.key)).toEqual(CLOSE_REASONS.map((r) => r.key));
    expect(CLOSE_REASON_COPY.map((r) => r.label)).toEqual(CLOSE_REASONS.map((r) => r.label));
  });

  it("its summary says what is missing rather than guessing", () => {
    expect(journeySummary("close", openSend([], undefined, NOW), NOW)).toBe("Choose how this one ended.");
    expect(journeySummary("close", { ...openSend([], undefined, NOW), reason: "withdrawn" }, NOW))
      .toBe("Closing the query: you withdrew the query.");
  });
});

describe("the chase's two", () => {
  it("opens on the quick path's own 14 days — never a second answer to the same question", () => {
    expect(openSend([], undefined, NOW).checkBackDays).toBe(14);
  });

  it("states the interval in weeks where it divides, days where it does not", () => {
    expect(checkBackLabel(7)).toBe("in a week");
    expect(checkBackLabel(14)).toBe("in 2 weeks");
    expect(checkBackLabel(5)).toBe("in 5 days");
    expect(checkBackLabel(1)).toBe("in 1 day");
  });

  it("its summary names both answers and nothing else", () => {
    expect(journeySummary("chase", openSend([], undefined, NOW), NOW))
      .toBe("Logging a nudge sent today, coming back in 2 weeks.");
  });

  it("a chase is blocked by its date, like a send", () => {
    expect(canCommit("chase", openSend([], undefined, NOW))).toBe(true);
    expect(canCommit("chase", { ...openSend([], undefined, NOW), sentDate: "" })).toBe(false);
  });
});

describe("⚠️ THE BAND AND THE COMMIT SPEAK FOR THE JOURNEY THEY ARE IN", () => {
  it("the pre-line is true of the thing being done, per kind", () => {
    /* the walk found a CLOSE reading "Recording what you sent to / Elinor Hale" — a sentence about
       a send, on the one line telling the writer what they are in the middle of */
    expect(JOURNEY_PRELINE.send).toBe("Recording what you sent to");
    expect(JOURNEY_PRELINE.chase).toBe("Recording the nudge you sent to");
    expect(JOURNEY_PRELINE.close).toBe("Closing your query to");
    /* all three end in the preposition the name follows — the band reads as one sentence */
    for (const k of ["send", "chase", "close"] as const) expect(JOURNEY_PRELINE[k].endsWith(" to")).toBe(true);
  });

  it("⚠️ AND THE HINT IS TRUE OF ITS OWN JOURNEY — a close does not 'record what you sent'", () => {
    expect(JOURNEY_HINT.close).not.toContain("sent");
    expect(JOURNEY_HINT.send).toContain("what you sent");
    expect(JOURNEY_HINT.chase).toContain("nudge");
  });

  it("⚠️ AND THE COMMIT NAMES ITS DEED — never the row's `Action` shorthand", () => {
    expect(JOURNEY_ACT.chase).toBe("Log the nudge");
    expect(JOURNEY_ACT.close).toBe("Close the record");
    for (const v of Object.values(JOURNEY_ACT)) expect(v).not.toBe("Action");
  });
});

/* ── Phase 3 · the offer branches ────────────────────────────────────────────────────────────── */

describe("⚠️ THE OFFER IS A BRANCH, NOT A STACK", () => {
  const open = () => openSend([], undefined, NOW);

  it("it has no step stack at all — the type says so, and so does the table", () => {
    /* `JOURNEY_STEPS` is keyed `Exclude<JourneyKind, "offer">`. A placeholder entry is how a branch
       quietly becomes a stack later, so there is none to find. */
    expect(Object.keys(JOURNEY_STEPS).sort()).toEqual(["chase", "close", "send"]);
  });

  it("⚠️ IT OPENS ON THE SELECTOR WITH NO BRANCH CHOSEN", () => {
    /* the three are not degrees of one act — choosing for the writer would decide which of three
       different things they came here to do */
    expect(open().branch).toBeNull();
    expect(canCommitOffer(open())).toBe(false);
    expect(offerSummary(open())).toBe("");
  });

  it("the three branches are the three, each with its own words", () => {
    expect(OFFER_BRANCHES.map((b) => b.key)).toEqual(["notify", "decide", "time"]);
    for (const b of OFFER_BRANCHES) {
      expect(OFFER_ACT[b.key], b.key).toBeTruthy();
      expect(OFFER_HINT[b.key], b.key).toBeTruthy();
      /* ⚠️ EACH ACT NAMES ITS OWN DEED — "Record the decision" on the notify screen would name a
         deed that screen does not perform. */
      expect(new Set(Object.values(OFFER_ACT)).size).toBe(3);
    }
  });

  it("each branch is blocked by its own one thing", () => {
    expect(canCommitOffer({ ...open(), branch: "decide" })).toBe(false);
    expect(canCommitOffer({ ...open(), branch: "decide", decision: "accepted" })).toBe(true);
    expect(canCommitOffer({ ...open(), branch: "time" })).toBe(false);
    expect(canCommitOffer({ ...open(), branch: "time", remindDate: "2026-08-20" })).toBe(true);
    expect(canCommitOffer({ ...open(), branch: "notify" })).toBe(false);
    expect(canCommitOffer({ ...open(), branch: "notify", notifySel: { q1: true } })).toBe(true);
    /* ⚠️ AND AN UNTICKED SELECTION IS NOT A SELECTION — `{q1: false}` is what unticking leaves */
    expect(canCommitOffer({ ...open(), branch: "notify", notifySel: { q1: false } })).toBe(false);
  });

  it("each branch's summary states its own act, and says what is missing", () => {
    expect(offerSummary({ ...open(), branch: "decide" })).toBe("Accepted or declined?");
    expect(offerSummary({ ...open(), branch: "decide", decision: "declined" }))
      .toBe("Recording that you declined. The querying continues.");
    expect(offerSummary({ ...open(), branch: "notify" })).toBe("Choose who to tell.");
    /* the two-number form is asserted in its own describe below — this case only pins that the
       branch summarises at all and says what is missing when nothing is chosen */
    expect(offerSummary({ ...open(), branch: "time" })).toBe("Choose a day to come back to it.");
  });

  it("⚠️ AND THE BAND DOES NOT CHANGE UNDER THE WRITER WHEN THEY PICK A BRANCH", () => {
    /* one pre-line for the whole journey: whichever branch you take, you are answering an offer */
    expect(JOURNEY_PRELINE.offer).toBe("Answering the offer from");
  });
});

describe("⚠️ THE TWO NOTIFY GROUPS OPEN DIFFERENTLY, because the courtesy differs", () => {
  const HOLD = ["q-full", "q-rr", "q-partial"];
  const QUERIED = ["q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8", "q9"];
  const open = () => openSend([], undefined, NOW, HOLD, QUERIED);

  it("holding opens TICKED and queried opens UNTICKED", () => {
    /* pre-ticking all twelve writes nine reminders the writer never chose; pre-ticking none makes
       them do work the app already knows the answer to */
    const v = open();
    for (const id of HOLD) expect(v.notifySel[id], id).toBe(true);
    for (const id of QUERIED) expect(v.notifySel[id], id).toBe(false);
  });

  it("⚠️ EVERY ROW IS PRESENT IN THE SELECTION MAP, ticked or not", () => {
    /* an absent key and a `false` key look the same to `canCommit`, but only the present one lets a
       group toggle know the row exists — a "Select all" that skipped unseeded rows would tick some
       of a group and report all of it */
    expect(Object.keys(open().notifySel).sort()).toEqual([...HOLD, ...QUERIED].sort());
  });

  it("the draft remembers which are holding, so the summary can state both numbers", () => {
    expect(open().notifyHolding).toEqual(HOLD);
  });

  it("⚠️ THE SUMMARY STATES BOTH NUMBERS — twelve rows never have to be read", () => {
    const v = { ...open(), branch: "offer-notify" as never };
    const notify = { ...open(), branch: "notify" as const };
    expect(offerSummary(notify)).toBe("Telling 3 holding pages.");
    const all = { ...notify, notifySel: Object.fromEntries([...HOLD, ...QUERIED].map((id) => [id, true])) };
    expect(offerSummary(all)).toBe("Telling 3 holding pages and 9 queried.");
    const onlyQueried = { ...notify, notifySel: Object.fromEntries([...HOLD.map((id) => [id, false]), ...QUERIED.map((id) => [id, true])]) };
    expect(offerSummary(onlyQueried)).toBe("Telling 9 queried.");
    const none = { ...notify, notifySel: Object.fromEntries([...HOLD, ...QUERIED].map((id) => [id, false])) };
    expect(offerSummary(none)).toBe("Choose who to tell.");
    void v;
  });

  it("seedNotify with no groups is an empty selection, not a crash", () => {
    expect(seedNotify()).toEqual({ notifySel: {}, notifyHolding: [] });
  });
});
