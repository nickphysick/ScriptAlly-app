/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Every link the public chrome offers goes somewhere real.
 *
 * ⚠️ THIS IS THE FAULT THE APP HAS ALREADY SHIPPED TWICE, IN TWO SHAPES. The sign-up screen linked
 * to /terms and /privacy for a long time while neither route existed; `/queries/analytics` was a
 * live dead link because four surfaces agreed the page existed and the one set the router actually
 * asks did not. Both are silent — an unregistered tab does not error, it quietly goes to the
 * dashboard — so nothing but an assertion catches them.
 *
 * The chain is checked end to end: the label is rendered, the tab resolves to a path, and the path
 * is registered as a marketing route. Asserting any one link of that chain alone proves nothing.
 */
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderPage, noNavigate, stripComments } from "../test/pageSmoke";

vi.mock("../lib/db", async () => (await import("../test/pageSmoke")).dbMock());
vi.mock("../lib/firebase", async () => (await import("../test/pageSmoke")).firebaseMock());
vi.mock("../components/toast/ToastProvider", async () => (await import("../test/pageSmoke")).toastMock());

import { pathFor } from "../App";
import { MARKETING_PATHS, tierForPath } from "./routeTiers";
import { MarketingShell } from "./MarketingShell";
import { AboutPage } from "./AboutPage";
import { ContactPage } from "./ContactPage";
import { LegalPage } from "./LegalPage";
import { PricingPage } from "./PricingPage";
import { Landing } from "./Landing";

/** Label as a reader sees it → the tab the chrome passes to onNavigate. */
const PUBLIC_DESTINATIONS: [label: string, tab: string, path: string][] = [
  ["Pricing", "pricing", "/pricing"],
  ["About", "about", "/about"],
  ["Contact", "contact", "/contact"],
  ["Founding writers", "founders", "/founders"],
  ["Privacy", "privacy", "/privacy"],
  ["Terms", "terms", "/terms"],
];

describe("every public destination resolves to a registered marketing route", () => {
  for (const [label, tab, path] of PUBLIC_DESTINATIONS) {
    it(`${label} → ${path}, and that path is public`, () => {
      // The middle link of the chain: an unregistered tab silently returns "/dashboard" here.
      expect(pathFor(tab)).toBe(path);
      expect(MARKETING_PATHS.has(path)).toBe(true);
      expect(tierForPath(path)).toBe("marketing");
    });
  }
});

describe("the shared footer offers all five, on every public page", () => {
  /**
   * ⚠️ THE FOOTER USED TO DIFFER PAGE TO PAGE — Landing showed Pricing/Privacy/Terms, Pricing
   * showed Home/Privacy/Terms, and the legal pages showed whichever document you were not reading.
   * That is how About and Contact would have been unreachable from two of the five.
   */
  const PAGES: [name: string, node: () => React.ReactElement][] = [
    ["/", () => <Landing onNavigate={noNavigate} />],
    ["/pricing", () => <PricingPage onNavigate={noNavigate} />],
    ["/about", () => <AboutPage onNavigate={noNavigate} />],
    ["/contact", () => <ContactPage onNavigate={noNavigate} />],
    ["/terms", () => <LegalPage doc="terms" onNavigate={noNavigate} />],
    ["/privacy", () => <LegalPage doc="privacy" onNavigate={noNavigate} />],
  ];

  for (const [name, node] of PAGES) {
    it(`${name} renders the shared footer with every company and legal link`, () => {
      const html = renderPage(node(), name);
      /* The whole class attribute, never a prefix: "mk-foot" is a prefix of "mk-footgrid",
         "mk-footcol" and three more, so a substring check here would pass on any of them. */
      expect(html).toMatch(/class="mk-foot"/);
      for (const [label] of PUBLIC_DESTINATIONS) {
        expect(html).toContain(`>${label}</button>`);
      }
    });
  }
});

describe("the nav and the footer agree about what the site contains", () => {
  const nav = () => renderPage(
    <MarketingShell user={null} onNavigate={noNavigate} path="/"><div /></MarketingShell>,
    "/",
  );

  it("the top nav reaches both company pages", () => {
    const html = nav();
    expect(html).toContain(">About</button>");
    expect(html).toContain(">Contact</button>");
  });

  /**
   * ⚠️ THE FOOTER IS THE ONLY HOME FOR THE LEGAL PAIR, and that is deliberate — a nav that lists
   * Terms beside Pricing sells nothing and crowds the two links that do. This asserts the split
   * rather than assuming it.
   */
  it("…and leaves the legal documents to the footer", () => {
    const html = nav();
    expect(html).not.toContain(">Privacy</button>");
    expect(html).not.toContain(">Terms</button>");
  });
});

describe("the support address is stated once", () => {
  /**
   * ⚠️ ONE ADDRESS, OR THE PRIVACY POLICY PUBLISHES A ROUTE THAT NOTHING ELSE HONOURS. The Help
   * centre carried a second mailbox on a second domain; the policy names this one as the contact
   * for a UK GDPR request, so this is the one that has to work.
   */
  it("no source file hardcodes the retired support address", async () => {
    const { readFileSync, readdirSync, statSync } = await import("fs");
    const walk = (dir: string): string[] =>
      readdirSync(dir).flatMap((entry) => {
        const full = `${dir}/${entry}`;
        if (statSync(full).isDirectory()) return walk(full);
        return /\.(ts|tsx)$/.test(entry) ? [full] : [];
      });

    /* ⚠️ COMMENTS STRIPPED FIRST, ALWAYS. This repo documents a retirement by quoting the thing it
       retired, so the un-stripped version of this lock went red on the two files that explain why
       the address is gone — the comment IS the evidence it was removed. */
    const offenders = walk("src").filter((file) =>
      // This spec necessarily names the address it forbids, so it excludes itself.
      !file.endsWith("marketingLinks.test.tsx") &&
      stripComments(readFileSync(file, "utf8")).includes("support@scriptally.com"));

    expect(offenders).toEqual([]);
  });
});
