/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The contact page's copy, word for word — and the one list the page shares with the server.
 *
 * ⚠️ VERBATIM, BECAUSE THE PAGE WAS REBUILT TO A WRITTEN BRIEF (17 Sep). Every sentence here is the
 * brief's; a version that reads slightly better is no longer the one that was signed off. The
 * landing, About and /founders carry the same kind of lock for the same reason — this page had
 * none until now.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import {
  CONTACT_DOCUMENT_TITLE, CONTACT_H1, CONTACT_LEDE, CONTACT_MAIL_H2, CONTACT_FOUNDING_H2,
  CONTACT_FOUNDING_BODY, CONTACT_TOPICS, CONTACT_TOPIC_DETAIL, CONTACT_DATA_WANTS, CONTACT_FORM_H2,
  CONTACT_FORM_SUB, CONTACT_FORM_SEND, CONTACT_FINE_PRINT, CONTACT_FIELD_LABELS, CONTACT_PLACEHOLDERS,
  CONTACT_SENT, CONTACT_AGAIN, CONTACT_ART_ALT,
} from "./contactCopy";

const here = dirname(fileURLToPath(import.meta.url));

/* RE-POINTED (contact redesign v1, 12 Nov): every sentence is design-refs/contact-terms-unsubscribe-v1.html's
   now, except the two the code made me change (the Feedback note's screenshot, and the sent panel on
   the mailto path) — each marked where it is asserted. */
describe("the contact page's copy, verbatim", () => {
  it("the heading and the left column", () => {
    expect(CONTACT_DOCUMENT_TITLE).toBe("Contact — QueryHawk");
    expect(CONTACT_H1, "with its full stop").toBe("Get in touch.");
    expect(CONTACT_LEDE).toBe("Questions, problems, ideas. A person reads every message.");
    expect(CONTACT_MAIL_H2).toBe("Or email us direct");
    expect(CONTACT_FOUNDING_H2).toBe("Already a founding writer?");
    expect(CONTACT_FOUNDING_BODY).toBe(
      "The Feedback button inside QueryHawk is quicker: it tells us which page you're on, and your note " +
        "counts towards your rank.",
    );
  });

  it("the form card", () => {
    expect(CONTACT_FORM_H2).toBe("Send a message");
    expect(CONTACT_FORM_SUB).toBe("We reply within two working days.");
    expect(CONTACT_FIELD_LABELS).toEqual({
      topic: "What's it about?",
      name: "Your name",
      email: "Email",
      page: "Which page were you on?",
      want: "What would you like?",
      message: "Message",
    });
    expect(CONTACT_FORM_SEND).toBe("Send message");
    expect(CONTACT_FINE_PRINT).toEqual([
      "Your details are only used to reply. ",
      { link: "Privacy", to: "privacy" },
    ]);
    expect(CONTACT_PLACEHOLDERS).toEqual({ email: "you@example.com", page: "For example, Queries or the sign-up page" });
    expect(CONTACT_DATA_WANTS).toEqual([
      "See what you hold about me", "Correct something", "Send me a copy of my data", "Delete my account and data",
    ]);
    expect(CONTACT_ART_ALT).toBe("An older hawk at a desk, writing a letter.");
  });

  it("each topic's prompt and note", () => {
    expect(CONTACT_TOPIC_DETAIL).toEqual({
      "A question or an idea": { placeholder: "What would you like to know, or see built?", tip: "" },
      "Something's broken": {
        placeholder: "What were you doing, what did you expect, and what happened instead?",
        /* Not the ref's "sends us the page and a screenshot for you": the screenshot is attached by the writer. */
        tip: "Bug reports jump the queue. If you're signed in, the Feedback button in the app sends us the " +
          "page you're on, and you can add a screenshot.",
      },
      "Founding writer access": {
        placeholder: "Anything we should know?",
        tip: "We're letting founding writers in a few at a time. Tell us the email you joined the waiting " +
          "list with and we'll check where you are.",
      },
      "Your data": {
        placeholder: "Tell us what you need.",
        tip: "If you have an account, Settings › Your data lets you take a copy or delete your account " +
          "straight away, without waiting for us.",
      },
      "Something else": { placeholder: "How can we help?", tip: "" },
    });
  });

  /* ⚠️ THE MAILTO PATH CLAIMS NO DELIVERY. The ref's "Sent." and "A copy is on its way to you now" are
     said on neither path: the mail app holds the message, and no function sends a copy. */
  it("the sent panel, by transport", () => {
    expect(CONTACT_SENT.mailto.heading).toBe("Over to your mail app.");
    expect(CONTACT_SENT.mailto.body("m@webb.co.uk")).toBe(
      "Your message should be open there, ready to send. Once it's sent, we'll reply to m@webb.co.uk " +
        "within two working days.",
    );
    expect(CONTACT_SENT.function.heading).toBe("Sent.");
    expect(CONTACT_SENT.function.body("m@webb.co.uk")).toBe("We'll reply to m@webb.co.uk within two working days.");
    for (const w of [CONTACT_SENT.mailto, CONTACT_SENT.function]) expect(w.body("x")).not.toMatch(/copy/i);
    expect(CONTACT_AGAIN).toBe("Send another message");
  });

  /**
   * ⚠️ THE ORDER IS PART OF THE CLAIM. The first topic is the form's default, and it is the
   * commonest and least alarming one on purpose.
   */
  it("the five topics, in order", () => {
    expect([...CONTACT_TOPICS]).toEqual([
      "A question or an idea",
      "Something's broken",
      "Founding writer access",
      "Your data",
      "Something else",
    ]);
  });
});

/**
 * ⚠️ `functions/` CANNOT IMPORT `src/`, SO THE SERVER KEEPS A COPY — and a copy is only safe with a
 * lock holding the two together. `sendContactMessage` refuses any topic outside its own set, so a
 * topic added to the form alone would be answered "Please choose a topic" the day the form began
 * sending through the function: a failure that only shows in production, on the one page a person
 * locked out of their account can still use.
 */
describe("the topics are one list on both sides of the wire", () => {
  it("sendContactMessage accepts exactly the topics the form offers, in the same order", () => {
    const src = readFileSync(resolve(here, "../../functions/src/contactMessage.ts"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/[^\n]*/g, "");
    const set = /const TOPICS = new Set\(\[([\s\S]*?)\]\)/.exec(src);
    expect(set, "the function still declares its topic set").toBeTruthy();
    const server = [...set![1].matchAll(/"([^"]*)"/g)].map((m) => m[1]);
    expect(server).toEqual([...CONTACT_TOPICS]);
  });
});
