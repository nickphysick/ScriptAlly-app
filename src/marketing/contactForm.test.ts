/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The contact form's steps (contact redesign v1, 12 Nov): what each one keeps, clears and focuses.
 */
import { describe, it, expect } from "vitest";
import { CONTACT_IDS, ContactFormState, contactInitial, contactReducer } from "./contactForm";
import { CONTACT_TOPICS } from "./contactCopy";

/** A writer who has filled in everything, the topic's extra field included. */
const typed = (): ContactFormState => ({
  ...contactInitial(),
  draft: {
    name: "Marianne Webb", email: "m@webb.co.uk", topic: "Something's broken",
    message: "The dates on my imported queries are a day out.", page: "Queries", want: "Correct something", trap: "",
  },
});

describe("a failed send keeps everything the writer typed", () => {
  /**
   * ⚠️ THE ONE THING THEY CANNOT GET BACK. A failure that cleared the form would lose the message the
   * writer just wrote. Every field survives — the extra ones too — and focus goes to the failure's
   * own sentence so it is read out.
   */
  it("every field, after a failure", () => {
    const before = typed();
    const after = contactReducer(before, { type: "failed", notice: "That didn't send." });
    expect(after.draft).toEqual(before.draft);
    expect(after.status).toBe("failed");
    expect(after.notice).toBe("That didn't send.");
    expect(after.focus).toBe(CONTACT_IDS.notice);
  });

  it("and after a send that was sending when it failed", () => {
    const before = typed();
    const after = contactReducer(contactReducer(before, { type: "sending" }), { type: "failed", notice: "x" });
    expect(after.draft).toEqual(before.draft);
  });
});

describe("the other steps", () => {
  it("a topic change keeps every field, the hidden extras included, and focuses the topic", () => {
    const before = typed();
    const after = contactReducer(before, { type: "topic", topic: "Your data" });
    expect(after.draft).toEqual({ ...before.draft, topic: "Your data" });
    expect(after.focus).toBe(CONTACT_IDS.topic("Your data"));
    expect(after.focus).toBe(`cf-topic-${CONTACT_TOPICS.indexOf("Your data")}`);
  });

  it("an invalid send focuses the first field that needs something, in the form's order", () => {
    const s = contactReducer(typed(), { type: "invalid", errors: { message: "m", email: "e" } });
    expect(s.focus).toBe(CONTACT_IDS.email);
    expect(s.draft).toEqual(typed().draft);
  });

  it("a sent message names its reply address and focuses Send another", () => {
    const s = contactReducer(typed(), { type: "sent" });
    expect(s.status).toBe("sent");
    expect(s.sentTo).toBe("m@webb.co.uk");
    expect(s.focus).toBe(CONTACT_IDS.again);
  });

  it("Send another keeps the name, email and topic, clears the rest, and focuses the message", () => {
    const s = contactReducer(contactReducer(typed(), { type: "sent" }), { type: "again" });
    expect(s.draft).toEqual({
      name: "Marianne Webb", email: "m@webb.co.uk", topic: "Something's broken",
      message: "", page: "", want: "", trap: "",
    });
    expect(s.status).toBe("idle");
    expect(s.focus).toBe(CONTACT_IDS.message);
  });

  it("typing in a marked field clears its mark and never moves focus", () => {
    const marked = contactReducer(typed(), { type: "invalid", errors: { name: "n", message: "m" } });
    const s = contactReducer(marked, { type: "edit", field: "name", value: "Marianne" });
    expect(s.errors).toEqual({ message: "m" });
    expect(s.focus).toBeNull();
  });
});
