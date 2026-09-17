/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact — the rebuilt page's laws, asserted against RENDERED output (17 Sep).
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

import { ContactPage } from "./ContactPage";
import { CONTACT_TOPICS, CONTACT_ART_ALT } from "./contactCopy";
import { SUPPORT_EMAIL } from "../lib/companyInfo";

const html = () => renderPage(<ContactPage onNavigate={noNavigate} />, "/contact");

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
    expect(labels.map((m) => m[2]), "the four labels, in order")
      .toEqual(["Your name", "Email", "What&#x27;s it about", "Message"]);
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
    expect(form).toContain("Every field helps us reply properly first time.");
  });

  it("offers the six topics, and opens on the first", () => {
    const form = formOf(html());
    const options = [...form.matchAll(/<option value="([^"]*)"[^>]*>/g)].map((m) => m[1].replace(/&#x27;/g, "'"));
    expect(options).toEqual([...CONTACT_TOPICS]);
    expect(form).toMatch(/<option value="Question or feedback" selected="">/);
  });

  /** The honeypot survives the rebuild, off-screen and out of the accessibility tree. */
  it("keeps its honeypot where no person meets it", () => {
    const form = formOf(html());
    expect(form).toMatch(/<div class="mk-trap" aria-hidden="true">/);
    expect(form).toMatch(new RegExp(`id="${TRAP}"[^>]*tabindex="-1"`, "i"));
  });
});

describe("the left column", () => {
  it("states the one support address on the email card", () => {
    const h = html();
    const card = /<div class="mk-cmailcard">[\s\S]*?<\/a>/.exec(h);
    expect(card, "the email card renders").toBeTruthy();
    expect(card![0]).toContain("Email direct");
    expect(card![0]).toContain(`href="mailto:${SUPPORT_EMAIL}"`);
    expect(card![0]).toContain(`>${SUPPORT_EMAIL}</a>`);
  });

  /** Three reasons, each a heading beside a tile, in the brief's order. */
  it("gives three reasons to write, each under its own heading", () => {
    const h = html();
    const heads = [...h.matchAll(/<h2 class="mk-wayh">([^<]*)<\/h2>/g)].map((m) => m[1]);
    expect(heads).toEqual(["Questions and ideas", "Something&#x27;s broken", "Your data"]);
    for (const tile of ["mk-ctile--rose", "mk-ctile--grey", "mk-ctile--slate"]) {
      expect(h, `${tile} renders`).toMatch(new RegExp(`class="mk-ctile ${tile}"`));
    }
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

  it("puts the service line under both columns, above the footer", () => {
    const h = html();
    const split = h.indexOf('class="mk-contactsplit"');
    const line = h.indexOf('class="mk-svcline"');
    const foot = h.indexOf('class="mk-foot"');
    expect(split).toBeGreaterThan(-1);
    expect(line, "after the two columns").toBeGreaterThan(h.indexOf("</form>"));
    expect(foot, "and before the footer").toBeGreaterThan(line);
    expect(h).toContain("Service information.");
  });

  it("opens with the kicker and the headline", () => {
    const h = html();
    expect(h).toMatch(/<p class="mk-ckicker">Contact<\/p>\s*<h1 class="mk-ch1">Get in touch\.<\/h1>/);
  });
});
