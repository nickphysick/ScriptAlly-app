/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The shared footer, rebuilt on 17 Sep — asserted against RENDERED output, except for the one
 * behaviour a static render cannot show.
 */
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { readFileSync } from "fs";
import { createHash } from "crypto";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { renderPage, noNavigate, stripComments } from "../test/pageSmoke";

vi.mock("../lib/db", async () => (await import("../test/pageSmoke")).dbMock());
vi.mock("../lib/firebase", async () => (await import("../test/pageSmoke")).firebaseMock());
vi.mock("../components/toast/ToastProvider", async () => (await import("../test/pageSmoke")).toastMock());

import { MarketingFooter } from "./MarketingFooter";
import { STATUS_GLYPH_COUNT } from "./marketingMarks";
import { STATUS_STEPS } from "./landingCopy";
import { FOOTER_TAGLINE, SUPPORT_EMAIL } from "../lib/companyInfo";

const here = dirname(fileURLToPath(import.meta.url));
/* Text-node separators, if a renderer inserts them, are not part of what a reader sees. */
const foot = () => renderPage(<MarketingFooter onNavigate={noNavigate} />, "/").replace(/<!-- -->/g, "");
const esc = (s: string) => s.replace(/'/g, "&#x27;");

describe("the footer's brand column", () => {
  it("sets the hawk, at its own content hash, beside the name in type", () => {
    const h = foot();
    const lockup = /<div class="mk-brand">([\s\S]*?)<\/div>/.exec(h);
    expect(lockup, "the lockup renders").toBeTruthy();
    const img = /<img class="mk-footmark"[^>]*>/.exec(lockup![1]);
    expect(img, "the hawk leads the lockup").toBeTruthy();
    expect(img![0], "the name beside it already says QueryHawk").toContain('alt=""');
    const [path, version] = /src="([^"]+)"/.exec(img![0])![1].split("?v=");
    expect(path).toBe("/images/queryhawk-logo.png");
    const png = readFileSync(resolve(here, "../..", "public" + path));
    expect(version).toBe(createHash("md5").update(png).digest("hex").slice(0, 8));
    expect(lockup![1]).toContain('<span class="mk-wordmark">QueryHawk</span>');
    expect(h, "the circled S is retired").not.toMatch(/["\s`]mk-monogram["\s`]/);
  });

  it("states the strapline", () => {
    expect(FOOTER_TAGLINE).toBe(
      "A bird's-eye view of your querying campaign. Built in the UK for writers looking for a literary agent.",
    );
    expect(foot()).toContain(`<p class="mk-foottag">${esc(FOOTER_TAGLINE)}</p>`);
  });

  /**
   * ⚠️ A SIGNATURE, NOT A CONTROL: the row is hidden from the accessibility tree as a whole, and it
   * draws exactly as many marks as the status band has states — asserted as two derivations
   * against each other, never against a literal six on both sides.
   */
  it("draws the six states as one row the accessibility tree never sees", () => {
    expect(STATUS_GLYPH_COUNT, "one mark per state").toBe(STATUS_STEPS.length);
    const row = /<div class="mk-footglyphs" aria-hidden="true">([\s\S]*?)<\/div>/.exec(foot());
    expect(row, "the row renders, hidden").toBeTruthy();
    expect(row![1].match(/<svg/g) ?? []).toHaveLength(STATUS_GLYPH_COUNT);
  });
});

describe("the footer's links", () => {
  it("heads three columns, and names each destination once", () => {
    const h = foot();
    expect([...h.matchAll(/<h4>([^<]*)<\/h4>/g)].map((m) => m[1])).toEqual(["Product", "Company", "Legal"]);
    for (const label of ["Features", "Pricing", "Open QueryHawk", "About", "Founding writers", "Contact", "Privacy", "Terms"]) {
      expect(h.split(`>${label}</button>`).length - 1, label).toBe(1);
    }
  });

  /**
   * ⚠️ THE ONE CLAIM A STATIC RENDER CANNOT SHOW, SO IT READS THE SOURCE — comments stripped first,
   * because the file explains the change by naming the route it no longer opens. "Open QueryHawk"
   * sets `#/login`: sign-in for a visitor, the dashboard for someone signed in. `#/signup` is the
   * ungated account-creation route the nav deliberately stopped pointing at.
   */
  it("sends Open QueryHawk to sign-in, never to account creation", () => {
    const src = stripComments(readFileSync(resolve(here, "MarketingFooter.tsx"), "utf8"));
    expect(src).toContain('window.location.hash = "#/login"');
    expect(src).not.toContain("#/signup");
  });
});

describe("the footer's base line", () => {
  it("states the year, the made-in line and the one support address", () => {
    const h = foot();
    const base = /<div class="mk-footbase">([\s\S]*)<\/div>\s*<\/div>\s*<\/footer>/.exec(h);
    expect(base, "the base line renders").toBeTruthy();
    expect(base![1]).toContain(`<p>© ${new Date().getFullYear()} QueryHawk</p>`);
    expect(base![1]).toMatch(/<p class="mk-footmade"><svg[\s\S]*?<\/svg>Made in the UK, for writers<\/p>/);
    expect(base![1]).toContain(`<a class="mk-footmail" href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>`);
  });

  /**
   * ⚠️ ONE PUBLISHED ADDRESS. The brief's hello@queryhawk.ink did not resolve on 17 Sep (NXDOMAIN, no
   * MX record), and the privacy policy names `SUPPORT_EMAIL` as the route for a UK GDPR request —
   * so the footer states that address and no other. The bare host the base line used to print is
   * gone with it.
   */
  it("publishes no second address, and no longer prints the bare host", () => {
    const h = foot();
    const addresses = new Set([...h.matchAll(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g)].map((m) => m[0]));
    expect([...addresses]).toEqual([SUPPORT_EMAIL]);
    expect(h).not.toContain(">scriptally.ink<");
  });
});
