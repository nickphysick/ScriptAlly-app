/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The contact form's pure layer — validation, the honeypot, the rate limit and the `mailto:`.
 */
import { describe, it, expect } from "vitest";
import {
  CONTACT_MIN_INTERVAL_MS, CONTACT_MAX, ContactDraft,
  contactMailto, isRateLimited, looksAutomated, validateContact,
} from "./contactTransport";
import { CONTACT_TOPICS } from "../marketing/contactCopy";

/** ⚠️ THE TOPIC IS TAKEN FROM THE LIST THE FORM ACTUALLY OFFERS, never typed in by hand — a
 *  literal here would keep passing the day the options moved. */
const draft = (over: Partial<ContactDraft> = {}): ContactDraft => ({
  name: "Marianne Webb",
  email: "m@webb.co.uk",
  topic: CONTACT_TOPICS[0],
  message: "The dates on my imported queries are a day out.",
  ...over,
});

describe("validation asks for the least it can", () => {
  it("accepts a complete draft", () => {
    expect(validateContact(draft())).toEqual({});
  });

  /**
   * ⚠️ A NAME IS NOT REQUIRED. Requiring one turns a privacy request — the message a person has
   * every reason to keep minimal — into a negotiation.
   */
  it("accepts a draft with no name at all", () => {
    expect(validateContact(draft({ name: "" }))).toEqual({});
  });

  it("needs an address to reply to", () => {
    expect(validateContact(draft({ email: "" })).email).toBeTruthy();
  });

  it("rejects an address that is not one", () => {
    expect(validateContact(draft({ email: "webb at co uk" })).email).toBeTruthy();
  });

  it("needs something to have been said", () => {
    expect(validateContact(draft({ message: "   " })).message).toBeTruthy();
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
  const href = () => contactMailto("hello@scriptally.ink", draft());

  it("addresses the support inbox and states the topic in the subject", () => {
    expect(href()).toContain("mailto:hello@scriptally.ink?subject=");
    expect(href()).toContain(encodeURIComponent(`ScriptAlly — ${CONTACT_TOPICS[0]}`));
  });

  /**
   * ⚠️ THE BODY IS ENCODED WHOLE. An unencoded `&` truncates a `mailto:` at that character in every
   * mail client, so the recipient reads a message ending mid-word.
   */
  it("encodes an ampersand in the message rather than truncating on it", () => {
    const h = contactMailto("hello@scriptally.ink", draft({ message: "Carter & Vale never replied" }));
    expect(h).toContain("%26");
    expect(h).toContain(encodeURIComponent("never replied"));
  });

  it("carries the reply address into the body, so a name-less message is still answerable", () => {
    const h = contactMailto("hello@scriptally.ink", draft({ name: "" }));
    expect(decodeURIComponent(h)).toContain("From: m@webb.co.uk");
  });
});
