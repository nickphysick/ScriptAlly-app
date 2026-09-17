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
  CONTACT_DOCUMENT_TITLE, CONTACT_EYEBROW, CONTACT_H1, CONTACT_LEDE, CONTACT_MAIL_LABEL,
  CONTACT_WAYS, CONTACT_TOPICS, CONTACT_FORM_H2, CONTACT_FORM_SUB, CONTACT_FORM_SEND,
  CONTACT_FINE_PRINT, CONTACT_FIELD_LABELS, CONTACT_PLACEHOLDERS, CONTACT_ART_ALT,
} from "./contactCopy";

const here = dirname(fileURLToPath(import.meta.url));

describe("the contact page's copy, verbatim", () => {
  it("the heading block and the email card", () => {
    expect(CONTACT_DOCUMENT_TITLE).toBe("Contact — QueryHawk");
    expect(CONTACT_EYEBROW).toBe("Contact");
    expect(CONTACT_H1, "with its full stop").toBe("Get in touch.");
    expect(CONTACT_LEDE).toBe(
      "Questions, problems, ideas — send them across and we'll come back to you within two " +
        "working days.",
    );
    expect(CONTACT_MAIL_LABEL).toBe("Email direct");
  });

  it("the three reasons, in order", () => {
    expect(CONTACT_WAYS.map((w) => [w.key, w.heading, w.body])).toEqual([
      [
        "questions",
        "Questions and ideas",
        "Anything about the app, your account, pricing, or something you'd like to see built. Ideas " +
          "genuinely shape what gets made next.",
      ],
      [
        "broken",
        "Something's broken",
        "Tell us what you were doing, what you expected, and what happened instead. A screenshot helps " +
          "enormously. Bug reports jump the queue.",
      ],
      [
        "privacy",
        "Your data",
        "To access, correct, delete or export anything we hold, choose 'Privacy request' in the form, " +
          "or email with 'Privacy' in the subject line.",
      ],
    ]);
  });

  it("the form card", () => {
    expect(CONTACT_FORM_H2).toBe("Send a message");
    expect(CONTACT_FORM_SUB).toBe("Every field helps us reply properly first time.");
    expect(CONTACT_FIELD_LABELS).toEqual({
      name: "Your name",
      email: "Email",
      topic: "What's it about",
      message: "Message",
    });
    expect(CONTACT_FORM_SEND).toBe("Send message");
    expect(CONTACT_FINE_PRINT).toEqual([
      "By sending a message you agree to our ",
      { link: "privacy policy", to: "privacy" },
      ". Your details are only ever used to reply.",
    ]);
    /* No placeholder on the name field: its label says "Your name" now, and a placeholder repeating
       the label says one thing twice in one box. */
    expect(CONTACT_PLACEHOLDERS).toEqual({ email: "you@example.com", message: "How can we help?" });
    expect(CONTACT_ART_ALT).toBe("An older hawk at a desk, writing a letter.");
  });

  /**
   * ⚠️ THE ORDER IS PART OF THE CLAIM. The first topic is the form's default, and it is the
   * commonest and least alarming one on purpose.
   */
  it("the six topics, in order", () => {
    expect([...CONTACT_TOPICS]).toEqual([
      "Question or feedback",
      "Something's broken",
      "Founding writer access",
      "Billing or account",
      "Privacy request",
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
