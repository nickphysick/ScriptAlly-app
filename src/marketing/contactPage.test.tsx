/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact — the rebuilt page's laws, asserted against RENDERED output (17 Sep; re-pointed for the
 * contact redesign v1, 12 Nov: the topic row, the extra fields, and the sent and failed states).
 */
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { readFileSync } from "fs";
import { createHash } from "crypto";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { renderPage, noNavigate } from "../test/pageSmoke";

vi.mock("../lib/db", async () => (await import("../test/pageSmoke")).dbMock());
vi.mock("../lib/firebase", async () => (await import("../test/pageSmoke")).firebaseMock());
vi.mock("../components/toast/ToastProvider", async () => (await import("../test/pageSmoke")).toastMock());

import { ContactPage, ContactFormView } from "./ContactPage";
import { MarketingShell } from "./MarketingShell";
import {
  CONTACT_TOPICS, CONTACT_ART_ALT, CONTACT_FAILED_GENERIC, CONTACT_PAGE_TOPIC, CONTACT_DATA_TOPIC, CONTACT_DATA_WANTS,
} from "./contactCopy";
import { contactExtras, contactMailto } from "../lib/contactTransport";
import { contactInitial, contactReducer, ContactFormState } from "./contactForm";
import { SUPPORT_EMAIL } from "../lib/companyInfo";

const html = () => renderPage(<ContactPage onNavigate={noNavigate} />, "/contact");

/** The form card in a given state, from the pure view. */
const view = (state: ContactFormState) =>
  renderPage(<ContactFormView state={state} dispatch={() => {}} onSubmit={() => {}} onNavigate={noNavigate} />, "/contact");
const withTopic = (topic: (typeof CONTACT_TOPICS)[number]) =>
  contactReducer(contactInitial(), { type: "topic", topic });

/** The form element and everything in it — bounded by its own tags, which cannot nest. */
const formOf = (h: string): string => {
  const m = /<form[^>]*class="mk-formcard"[\s\S]*?<\/form>/.exec(h);
  expect(m, "the page renders its form").toBeTruthy();
  return m![0];
};

/** The honeypot is labelled for anyone reading the markup, and deliberately hidden from people. */
const TRAP = "cf-website";

describe("the contact form", () => {
  /**
   * ⚠️ BOTH DIRECTIONS, OR A FIELD CAN GO UNLABELLED IN SILENCE. Every visible label must name a
   * control that exists exactly once, AND every visible control must be named by a label — a
   * check in only the first direction passes on a form that grew an unlabelled field.
   */
  it("labels every field above it, and every label names one real field", () => {
    const form = formOf(html());
    const labels = [...form.matchAll(/<label for="([^"]+)">([^<]*)<\/label>/g)]
      .filter((m) => m[1] !== TRAP);
    /* RE-POINTED (12 Nov): the topic is a row of choices named by its own label (below), so three
       field labels remain on the default topic. */
    expect(labels.map((m) => m[2]), "the three labels, in order")
      .toEqual(["Your name", "Email", "Message"]);
    for (const [, id] of labels) {
      expect(form, `#${id} is a field`).toMatch(new RegExp(`<(?:input|select|textarea)[^>]*\\sid="${id}"`));
      expect(form.match(new RegExp(`\\sid="${id}"`, "g")) ?? [], `#${id} is unique`).toHaveLength(1);
      expect(form.indexOf(`for="${id}"`), `#${id}'s label sits above it`)
        .toBeLessThan(form.indexOf(` id="${id}"`));
    }
    /* ⚠️ `\sid=`, NOT `id=`: a bare `id="` also matches the tail of `aria-invalid="false"`, which is
       how the first run of this read three fields called "false". */
    const controls = [...form.matchAll(/<(?:input|select|textarea)[^>]*\sid="([^"]+)"/g)]
      .map((m) => m[1]).filter((id) => id !== TRAP);
    expect([...controls].sort(), "no field without a label").toEqual(labels.map((m) => m[1]).sort());
  });

  it("is a real form, named by its own heading", () => {
    const form = formOf(html());
    expect(form).toMatch(/^<form[^>]*aria-labelledby="cf-title"/);
    expect(form).toMatch(/<h2 id="cf-title" class="mk-formh2">Send a message<\/h2>/);
    expect(form, "Enter sends, because the button submits").toMatch(/<button type="submit" class="mk-cbtn"/);
    expect(form).toContain("We reply within two working days.");
  });

  /* RE-POINTED (12 Nov): five topics as one radio group, labelled, opening on the first. */
  it("offers the five topics as one radio group, and opens on the first", () => {
    const form = formOf(html());
    expect(form).toMatch(/<span id="cf-topic-l" class="mk-flabel">What&#x27;s it about\?<\/span><div class="mk-jychips" role="radiogroup" aria-labelledby="cf-topic-l">/);
    const radios = [...form.matchAll(/role="radio" aria-checked="(true|false)" tabindex="(0|-1)">([^<]*)<\/button>/g)];
    expect(radios.map((m) => m[3].replace(/&#x27;/g, "'"))).toEqual([...CONTACT_TOPICS]);
    expect(radios.map((m) => m[1])).toEqual(["true", "false", "false", "false", "false"]);
    expect(radios.map((m) => m[2]), "one tab stop, on the chosen topic").toEqual(["0", "-1", "-1", "-1", "-1"]);
    expect(form, "Billing is gone").not.toContain("Billing");
  });

  it("asks which page for a fault, and what you would like for your data", () => {
    const broken = formOf(view(withTopic("Something's broken")));
    expect(broken).toMatch(/<label for="cf-page">Which page were you on\? <span class="mk-foptional">Optional<\/span><\/label>/);
    expect(broken).toContain("Bug reports jump the queue.");
    expect(broken).toContain('placeholder="What were you doing, what did you expect, and what happened instead?"');
    const data = formOf(view(withTopic("Your data")));
    expect(data).toMatch(/<label for="cf-want">What would you like\?<\/label>/);
    expect([...data.matchAll(/<option value="([^"]*)"/g)].map((m) => m[1])).toEqual([
      "See what you hold about me", "Correct something", "Send me a copy of my data", "Delete my account and data",
    ]);
    expect(data, "no page field off its topic").not.toContain('id="cf-page"');
    expect(formOf(html()), "the default topic has no note").not.toContain("mk-callout");
  });

  /** The honeypot survives the rebuild, off-screen and out of the accessibility tree. */
  it("keeps its honeypot where no person meets it", () => {
    const form = formOf(html());
    expect(form).toMatch(/<div class="mk-trap" aria-hidden="true">/);
    expect(form).toMatch(new RegExp(`id="${TRAP}"[^>]*tabindex="-1"`, "i"));
  });
});

describe("the sent and failed states", () => {
  /**
   * RE-POINTED (13 Nov): the form sends through `sendContactMessage`, so the sent panel is "Sent." —
   * and the page reaches it only from a call that returned (the source lock below).
   */
  it("the sent panel replaces the form, says Sent., names the reply address, and promises no copy", () => {
    const sent = contactReducer({ ...contactInitial(), draft: { ...contactInitial().draft, email: "m@webb.co.uk" } }, { type: "sent" });
    const h = view(sent);
    expect(h).not.toContain("<form");
    expect(h).toContain('<h2 id="cf-done-h" class="mk-formh2">Sent.</h2>');
    expect(h).toContain("We&#x27;ll reply to m@webb.co.uk within two working days.");
    expect(h).toMatch(/<button id="cf-again" type="button" class="mk-btn mk-cagain">Send another message<\/button>/);
    expect(h).not.toMatch(/copy is on its way|Over to your mail app/);
  });

  /**
   * ⚠️ The render half of contactForm.test's lock: the failed form still shows every word typed, says
   * plainly it did not send, and OFFERS the mail app — a link whose message is everything typed, the
   * topic's extra answer included, built from the draft as it stands.
   */
  it("a failed send shows its notice over the words the writer typed, and offers the mail app with all of them", () => {
    const filled = { ...contactInitial().draft, name: "Marianne Webb", email: "m@webb.co.uk", topic: "Something's broken", message: "The dates are a day out.", page: "Queries" };
    const state = contactReducer({ ...contactInitial(), draft: filled }, { type: "failed", notice: CONTACT_FAILED_GENERIC, offerMail: true });
    const h = view(state);
    expect(h).toContain('value="Marianne Webb"');
    expect(h).toContain('value="m@webb.co.uk"');
    expect(h).toContain('value="Queries"');
    expect(h).toContain(">The dates are a day out.</textarea>");
    expect(h).toContain('<p id="cf-notice" class="mk-cstate mk-cstate--bad" role="alert" tabindex="-1">Your message didn&#x27;t send. Everything you typed is still here.</p>');
    const link = /<p class="mk-cstate mk-cstate--mail"><a id="cf-mail" class="mk-cmail" href="([^"]+)">Open it in your mail app<\/a> to send it from there, or press Send message to try again\.<\/p>/.exec(h);
    expect(link, "the mail app is offered").toBeTruthy();
    const expected = contactMailto(SUPPORT_EMAIL, filled, contactExtras(filled, { page: CONTACT_PAGE_TOPIC, data: CONTACT_DATA_TOPIC, firstWant: CONTACT_DATA_WANTS[0] }));
    expect(link![1].replace(/&#x27;/g, "'").replace(/&amp;/g, "&")).toBe(expected);
    const body = decodeURIComponent(expected);
    for (const w of ["The dates are a day out.", "From: Marianne Webb <m@webb.co.uk>", "Topic: Something's broken", "Page: Queries"]) expect(body, w).toContain(w);
    expect(h.match(/class="mk-cbtn"/g) ?? [], "one filled button: the offer is a link").toHaveLength(1);
  });

  it("a too-soon refusal offers no mail app (nothing failed to send)", () => {
    const h = view(contactReducer(contactInitial(), { type: "failed", notice: "x" }));
    expect(h).not.toContain("cf-mail");
  });

  /**
   * ⚠️ THE PAGE CALLS THE CALLABLE FIRST AND NEVER OPENS THE MAIL APP ITSELF. Read from source (no DOM
   * here): the send goes through `sendContact` with the real `sendContactMessage` callable, "sent" is
   * dispatched only on its `sent` outcome, and nothing assigns a `mailto:` to the window.
   */
  it("send() calls sendContactMessage through sendContact, and only a returned call is sent", () => {
    const src = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "ContactPage.tsx"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    expect(src).toMatch(/httpsCallable\(getFunctions\(app, "europe-west2"\), "sendContactMessage"\)\(payload\)/);
    const send = /const send = async \(\) => \{([\s\S]*?)\n  \};/.exec(src);
    expect(send, "the page's send").toBeTruthy();
    const body = send![1];
    expect(body).toMatch(/await sendContact\(SUPPORT_EMAIL, draft, contactExtras\(draft, EXTRA_TOPICS\), callSendContactMessage\)/);
    expect(body.indexOf('if (outcome.kind === "sent")'), "sent only on the sent outcome")
      .toBeLessThan(body.indexOf('dispatch({ type: "sent" });\n      return;'));
    expect(body).toContain('dispatch({ type: "failed", notice: CONTACT_FAILED_GENERIC, offerMail: true })');
    expect(src, "the page never opens the mail app for the writer").not.toMatch(/location(\.href)?\s*=/);
  });
});

describe("the left column", () => {
  /* RE-POINTED (12 Nov): the email card and the three reasons gave way to two headed lines. */
  it("states the one support address, then the founding writers' route", () => {
    const h = html();
    const col = /<div class="mk-cways">([\s\S]*?)<\/div>/.exec(h);
    expect(col, "the column renders").toBeTruthy();
    expect([...col![1].matchAll(/<h2 class="mk-wayh">([^<]*)<\/h2>/g)].map((m) => m[1]))
      .toEqual(["Or email us direct", "Already a founding writer?"]);
    expect(col![1]).toContain(`<a class="mk-cmail" href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>`);
    expect(h).not.toMatch(/mk-ctile|mk-cmailcard/);
  });

  /**
   * ⚠️ DESCRIBED, NOT DECORATIVE — the drawing is the page's one picture of what it offers, so it
   * carries words. Its URL carries its own content hash, read against the bytes on disk.
   */
  it("shows the Archivist, described, at its own content hash", () => {
    const img = /<img class="mk-cart"[^>]*>/.exec(html());
    expect(img, "the illustration renders").toBeTruthy();
    expect(img![0]).toContain(`alt="${CONTACT_ART_ALT}"`);
    expect(img![0]).toContain('loading="lazy"');
    const [path, version] = /src="([^"]+)"/.exec(img![0])![1].split("?v=");
    expect(path).toBe("/images/contact-archivist.png");
    const png = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "../..", "public" + path));
    expect(version).toBe(createHash("md5").update(png).digest("hex").slice(0, 8));
    expect(img![0]).toContain('width="' + png.readUInt32BE(16) + '" height="' + png.readUInt32BE(20) + '"');
  });
});

describe("the page as a whole", () => {
  /**
   * ⚠️ NOTHING ON THIS PAGE SAYS QUERYHAWK IS RUN BY ONE PERSON. The old lede did; the brief rules
   * it out anywhere on the page, footer included. Swept over the rendered TEXT, so a phrase moved
   * into any component this page mounts is still caught.
   */
  it("never describes QueryHawk as run by one person", () => {
    const text = html().replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    for (const phrase of [/one person/i, /one-person/i, /single person/i, /\bsolo\b/i, /run by/i, /\bmyself\b/i]) {
      expect(text, String(phrase)).not.toMatch(phrase);
    }
  });

  /* RE-POINTED (12 Nov): the service line, with its bracketed entity and address, is gone with the
     ref; the form is the last thing before the shell's footer. */
  it("ends on the form, with no placeholder service line before the footer", () => {
    const h = renderPage(
      <MarketingShell user={null} onNavigate={noNavigate} path="/contact">
        <ContactPage onNavigate={noNavigate} />
      </MarketingShell>, "/contact");
    expect(h.indexOf('class="mk-foot"'), "the footer follows the form").toBeGreaterThan(h.indexOf("</form>"));
    expect(h).not.toContain("Service information.");
    expect(h).not.toMatch(/\[[A-Z /]+\]/);
  });

  /* RE-POINTED (12 Nov): no small label above the headline. */
  it("opens with the headline alone, then the lede", () => {
    const h = html();
    expect(h).toMatch(/<div class="mk-cleft"><h1 class="mk-ch1">Get in touch\.<\/h1><p class="mk-clede">Questions, problems, ideas\. A person reads every message\.<\/p>/);
    expect(h).not.toContain("mk-ckicker");
  });
});
