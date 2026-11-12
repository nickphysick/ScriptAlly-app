/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The contact form's pure layer — validation, the honeypot, the rate limit and the `mailto:`.
 */
import { describe, it, expect } from "vitest";
import {
  CONTACT_MIN_INTERVAL_MS, CONTACT_MAX, CONTACT_MIN_MESSAGE, ContactDraft,
  contactExtras, contactMailto, isRateLimited, looksAutomated, validateContact,
} from "./contactTransport";
import { CONTACT_TOPICS, CONTACT_PAGE_TOPIC, CONTACT_DATA_TOPIC, CONTACT_DATA_WANTS } from "../marketing/contactCopy";

/** ⚠️ THE TOPIC IS TAKEN FROM THE LIST THE FORM ACTUALLY OFFERS, never typed in by hand — a
 *  literal here would keep passing the day the options moved. */
const draft = (over: Partial<ContactDraft> = {}): ContactDraft => ({
  name: "Marianne Webb",
  email: "m@webb.co.uk",
  topic: CONTACT_TOPICS[0],
  message: "The dates on my imported queries are a day out.",
  ...over,
});

/* RE-POINTED (contact redesign v1, 12 Nov): the ref's rules and words — a name is required now, and a
   message under ten characters is asked for a little more. */
describe("validation asks for what a reply needs, in the ref's words", () => {
  it("accepts a complete draft", () => {
    expect(validateContact(draft())).toEqual({});
  });

  it("needs a name to reply to", () => {
    expect(validateContact(draft({ name: "  " })).name).toBe("Add your name so we know who to reply to.");
  });

  it("needs an address to reply to", () => {
    expect(validateContact(draft({ email: "" })).email).toBe("Add your email so we can reply.");
  });

  it("rejects an address that is not one", () => {
    expect(validateContact(draft({ email: "webb at co uk" })).email).toBe("That doesn't look like an email address.");
  });

  it("needs something to have been said", () => {
    expect(validateContact(draft({ message: "   " })).message).toBe("Write your message here.");
  });

  it("asks for a little more under ten characters", () => {
    expect(CONTACT_MIN_MESSAGE).toBe(10);
    expect(validateContact(draft({ message: "x".repeat(9) })).message).toBe("Tell us a little more so we can help first time.");
    expect(validateContact(draft({ message: "x".repeat(10) })).message).toBeUndefined();
  });

  it("refuses a message longer than it can send", () => {
    expect(validateContact(draft({ message: "x".repeat(CONTACT_MAX.message + 1) })).message).toBeTruthy();
  });
});

describe("the honeypot", () => {
  it("passes a draft that left the hidden field alone", () => {
    expect(looksAutomated(draft())).toBe(false);
    expect(looksAutomated(draft({ trap: "" }))).toBe(false);
    expect(looksAutomated(draft({ trap: "   " }))).toBe(false);
  });

  it("catches one that filled it", () => {
    expect(looksAutomated(draft({ trap: "https://example.com" }))).toBe(true);
  });
});

describe("the rate limit", () => {
  it("lets a first send through", () => {
    expect(isRateLimited(null, 1_000_000)).toBe(false);
  });

  it("holds a second send inside the interval", () => {
    expect(isRateLimited(1_000_000, 1_000_000 + CONTACT_MIN_INTERVAL_MS - 1)).toBe(true);
  });

  it("releases it once the interval has passed", () => {
    expect(isRateLimited(1_000_000, 1_000_000 + CONTACT_MIN_INTERVAL_MS)).toBe(false);
  });

  /** A corrupted localStorage value must not become a permanent block. */
  it("ignores a stored value that is not a number", () => {
    expect(isRateLimited(Number("nonsense"), 1_000_000)).toBe(false);
  });
});

describe("the mailto", () => {
  const href = () => contactMailto("hello@queryhawk.net", draft());

  it("addresses the support inbox and states the topic in the subject", () => {
    expect(href()).toContain("mailto:hello@queryhawk.net?subject=");
    expect(href()).toContain(encodeURIComponent(`QueryHawk — ${CONTACT_TOPICS[0]}`));
  });

  /**
   * ⚠️ THE BODY IS ENCODED WHOLE. An unencoded `&` truncates a `mailto:` at that character in every
   * mail client, so the recipient reads a message ending mid-word.
   */
  it("encodes an ampersand in the message rather than truncating on it", () => {
    const h = contactMailto("hello@queryhawk.net", draft({ message: "Carter & Vale never replied" }));
    expect(h).toContain("%26");
    expect(h).toContain(encodeURIComponent("never replied"));
  });

  it("carries the reply address into the body, so a name-less message is still answerable", () => {
    const h = contactMailto("hello@queryhawk.net", draft({ name: "" }));
    expect(decodeURIComponent(h)).toContain("From: m@webb.co.uk");
  });

  it("carries the current topic's extra answer, and only that one", () => {
    const T = { page: CONTACT_PAGE_TOPIC, data: CONTACT_DATA_TOPIC, firstWant: CONTACT_DATA_WANTS[0] };
    const broken = draft({ topic: CONTACT_PAGE_TOPIC, page: " Queries ", want: "Correct something" });
    expect(contactExtras(broken, T)).toEqual(["Page: Queries"]);
    expect(decodeURIComponent(contactMailto("hello@queryhawk.net", broken, contactExtras(broken, T)))).toContain("Topic: Something's broken\nPage: Queries");
    expect(contactExtras(draft({ topic: CONTACT_DATA_TOPIC, page: "Queries" }), T), "the select opens on the first answer")
      .toEqual(["Request: See what you hold about me"]);
    expect(contactExtras(draft({ page: "Queries", want: "Correct something" }), T)).toEqual([]);
  });
});
