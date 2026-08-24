/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Render smokes — the marketing tier. These routes are PUBLIC: a crash here is the only one in the
 * app a logged-out stranger can meet. See `src/test/pageSmoke.tsx` for the rationale.
 *
 * ⚠️ EVERY PUBLIC ROUTE IS SMOKED LOGGED OUT FIRST, AND THAT IS THE WHOLE POINT OF THIS FILE.
 * It used to render only under the default mock, which always supplies `SMOKE_USER` — so the one
 * state these routes exist to serve was the one state never tested. `/pricing` opened with
 * `if (!currentUser) return null` and a logged-out visitor got an empty page inside the marketing
 * chrome; this suite passed throughout. Asserting "does not throw" is not enough either: a `null`
 * render throws nothing. Each case must assert that real content came back.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { renderPage, noNavigate, SMOKE_USER, useSignedOutDb, restoreSmokeUser, stripComments } from "../test/pageSmoke";

vi.mock("../lib/db", async () => (await import("../test/pageSmoke")).dbMock());
vi.mock("../lib/firebase", async () => (await import("../test/pageSmoke")).firebaseMock());
vi.mock("../components/toast/ToastProvider", async () => (await import("../test/pageSmoke")).toastMock());

import { Landing } from "./Landing";
import { MarketingShell } from "./MarketingShell";
import { PricingPage } from "./PricingPage";
import { LegalPage } from "./LegalPage";
import { AboutPage } from "./AboutPage";
import { ContactPage } from "./ContactPage";
import { LEGAL_COPY_REVIEWED } from "./legalCopy";
import { SUPPORT_EMAIL } from "../lib/companyInfo";

/** The public marketing routes and a string each must actually render. */
const PUBLIC_ROUTES: [path: string, node: () => React.ReactElement, mustContain: string][] = [
  /* ⚠️ RETARGET, SAME LAW: the landmark is the hero's h1, and the statement hero replaced the
     strapline it used to name. The claim is unchanged — this route must render real content, not
     a null. `DOCUMENT_TITLE` still carries the old words, but it is set in an effect and never
     reaches the static markup, so it cannot stand in as the landmark. */
  ["/", () => <Landing onNavigate={noNavigate} />, "You&#x27;ve written a book."],
  ["/pricing", () => <PricingPage onNavigate={noNavigate} />, "Start free"],
  /* Retarget, same law: the mission statement replaced the old About headline as this page's h1. */
  ["/about", () => <AboutPage onNavigate={noNavigate} />, "Get good stories told."],
  ["/contact", () => <ContactPage onNavigate={noNavigate} />, "Get in touch"],
  ["/terms", () => <LegalPage doc="terms" onNavigate={noNavigate} />, "Terms of Service"],
  ["/privacy", () => <LegalPage doc="privacy" onNavigate={noNavigate} />, "Privacy Policy"],
];

describe("every public marketing route renders for a LOGGED-OUT visitor", () => {
  beforeEach(useSignedOutDb);
  afterEach(restoreSmokeUser);

  for (const [path, node, mustContain] of PUBLIC_ROUTES) {
    it(`${path} renders without throwing`, () => {
      expect(() => renderPage(node(), path)).not.toThrow();
    });

    it(`${path} returns real content, not an empty render`, () => {
      const html = renderPage(node(), path);
      // The anchor first: a null render is an empty string, and every .not.toContain on an empty
      // string passes. Length is what distinguishes "rendered nothing" from "rendered something".
      expect(html.length).toBeGreaterThan(200);
      expect(html).toContain(mustContain);
    });
  }
});

describe("the same routes still render for a SIGNED-IN visitor", () => {
  for (const [path, node, mustContain] of PUBLIC_ROUTES) {
    it(`${path} renders without throwing`, () => {
      expect(() => renderPage(node(), path)).not.toThrow();
    });

    it(`${path} returns real content`, () => {
      expect(renderPage(node(), path)).toContain(mustContain);
    });
  }
});

/**
 * ⚠️ THE PRICING PAGE MUST NOT BE ABLE TO CHARGE, UPGRADE OR WRITE ANYTHING. The page it replaces
 * offered a signed-in visitor "Activate Pro account now", which wrote plan: 'Pro' to their user
 * document for free — on a PUBLIC route. This is the assertion that stops that returning by
 * accident: the component takes no user, touches no db, and states its Pro tier as copy.
 */
describe("the public pricing page sells nothing and writes nothing", () => {
  // Comments stripped: the docblock necessarily names what the page must never do again.
  const source = stripComments(
    readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "PricingPage.tsx"), "utf8"),
  );

  it("does not reach the db at all", () => {
    expect(source).not.toContain("useScriptAllyDb");
  });

  for (const forbidden of ["upgradeToPro", "downgradeToFree", "updateUserProfile", "plan:"]) {
    it(`never mentions ${forbidden}`, () => {
      expect(source).not.toContain(forbidden);
    });
  }

  it("marks the Pro tier as unavailable rather than offering a control", () => {
    const html = renderPage(<PricingPage onNavigate={noNavigate} />, "/pricing");
    expect(html).toContain("Coming soon");
    expect(html).not.toMatch(/Activate Pro/i);
  });
});

/**
 * ⚠️ THE LEGAL PAGES MUST SAY THEY ARE PLACEHOLDERS, ON THE PAGE. A legal document that looks
 * finished and is not is worse than an obviously unfinished one, because nobody chases it.
 */
describe("the legal pages are honest about being drafts", () => {
  for (const doc of ["terms", "privacy"] as const) {
    it(`/${doc} carries the working-draft ribbon while the copy is unreviewed`, () => {
      const html = renderPage(<LegalPage doc={doc} onNavigate={noNavigate} />, `/${doc}`);
      // The ribbon is a function of the flag, so assert the flag's state alongside its effect —
      // a green here with the flag already true would be proving nothing.
      expect(LEGAL_COPY_REVIEWED).toBe(false);
      expect(html).toContain("Working draft");
      // Not "has not yet" — the terms say "have", because the subject is plural. The shared
      // fragment is what both documents actually promise.
      expect(html).toContain("not yet been legally reviewed");
    });

    /**
     * ⚠️ THE PLACEHOLDERS RENDER AS PLACEHOLDERS. An invented entity name or address would make
     * the page look finished, and a legal page that looks finished and is not is the one nobody
     * chases. Both documents name the operating entity in their first section.
     */
    it(`/${doc} still shows its unfilled entity placeholders`, () => {
      const html = renderPage(<LegalPage doc={doc} onNavigate={noNavigate} />, `/${doc}`);
      expect(html).toContain("[LEGAL ENTITY NAME]");
      expect(html).toContain("[REGISTERED / TRADING ADDRESS]");
    });
  }

  /**
   * ⚠️ THE SECTION THAT MUST NOT BE TRIMMED. Three features send content the writer supplies to
   * Anthropic's API; without this section the product does something no surface discloses.
   */
  it("the privacy policy names the third-party processing Smart Import performs", () => {
    const html = renderPage(<LegalPage doc="privacy" onNavigate={noNavigate} />, "/privacy");
    expect(html).toContain("Anthropic");
    expect(html).toMatch(/Smart Import/);
  });

  /**
   * ⚠️ THE POLICY SAYS THERE IS NO COOKIE BANNER. That sentence is only true while the app sets
   * nothing but auth tokens and interface preferences — so if a banner or an analytics tag ever
   * arrives, this assertion is the thing that should stop it arriving silently.
   */
  it("the privacy policy covers cookies and local storage, and claims no banner", () => {
    const html = renderPage(<LegalPage doc="privacy" onNavigate={noNavigate} />, "/privacy");
    expect(html).toContain("Cookies and local storage");
    expect(html).toContain("cookie banner");
  });

  /** The rights section is the one a data subject arrives looking for; it must name a route out. */
  it("the privacy policy tells a reader how to exercise their rights", () => {
    const html = renderPage(<LegalPage doc="privacy" onNavigate={noNavigate} />, "/privacy");
    expect(html).toContain("Your rights");
    expect(html).toContain("ico.org.uk");
    expect(html).toContain(SUPPORT_EMAIL);
  });
});

describe("the marketing chrome renders in both of its states", () => {
  const shell = (user: unknown) => (
    <MarketingShell user={user as never} onNavigate={noNavigate} path="/">
      <div>child</div>
    </MarketingShell>
  );

  /**
   * ⚠️ TWO STATES, and the signed-in one is the easy one to forget: a signed-in user is NEVER
   * redirected off "/", so the shell has to render an avatar and "Open dashboard" instead of the
   * log-in pair. Both branches, or half the chrome is untested.
   */
  it("renders logged out without throwing", () => {
    expect(() => renderPage(shell(null), "/")).not.toThrow();
  });

  it("…and offers the logged-out pair", () => {
    expect(renderPage(shell(null), "/")).toContain("Log in");
  });

  it("renders signed in without throwing", () => {
    expect(() => renderPage(shell(SMOKE_USER), "/")).not.toThrow();
  });

  it("…and offers the signed-in pair instead", () => {
    expect(renderPage(shell(SMOKE_USER), "/")).toContain("Open dashboard");
  });
});

/**
 * ⚠️ THE CONDENSE'S TWO EDGES ARE STATED TWICE — IN CSS AND IN JS — AND THIS ASSERTS THEM AGAINST
 * EACH OTHER, never against literals on both sides. The sentinel heights ARE the observer's
 * thresholds (a box of height N stops intersecting at exactly `scrollY === N`), and the scroll
 * fallback restates the same two numbers for a browser without the API. Two derivations that must
 * agree, so a lock that pinned "40" and "8" in both places would go green the day someone changed
 * both in the same wrong direction.
 *
 * ⚠️ AND THE ORDER IS THE WHOLE MECHANISM. The sentinels must precede the nav in the rendered
 * output: condensing SHORTENS the nav, so a trigger at or after it is moved by the state change it
 * is deciding — the feedback loop this replaced. Asserted against the rendered markup, not the
 * source, because that is where "before" actually means something.
 *
 * The one-flip-per-direction behaviour itself is a rendered-page claim and is measured, not read
 * out of a file — see the pass report.
 */
describe("the nav's condense is triggered by sentinels ahead of the nav", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const css = readFileSync(resolve(here, "marketing.css"), "utf8");
  const shell = readFileSync(resolve(here, "MarketingShell.tsx"), "utf8");

  /** Height and the negative margin that cancels it, per sentinel modifier. */
  const box = (mod: string) => {
    const m = stripComments(css).match(
      new RegExp(`\\.mk-navsentinel--${mod}\\s*\\{([^}]*)\\}`),
    );
    expect(m, `.mk-navsentinel--${mod} has a rule`).toBeTruthy();
    const decl = m![1];
    const num = (prop: string) => {
      const d = decl.match(new RegExp(`${prop}\\s*:\\s*(-?[\\d.]+)px`));
      expect(d, `${mod} declares ${prop}`).toBeTruthy();
      return parseFloat(d![1]);
    };
    return { height: num("height"), margin: num("margin-bottom") };
  };

  it("both sentinels render, and both come before the nav", () => {
    const html = renderPage(
      <MarketingShell user={null as never} onNavigate={noNavigate} path="/"><div /></MarketingShell>,
      "/",
    );
    const condense = html.indexOf("mk-navsentinel--condense");
    const release = html.indexOf("mk-navsentinel--release");
    const nav = html.indexOf("mk-navwrap");
    expect(condense).toBeGreaterThan(-1);
    expect(release).toBeGreaterThan(-1);
    expect(nav).toBeGreaterThan(-1);
    expect(condense).toBeLessThan(nav);
    expect(release).toBeLessThan(nav);
  });

  it("each sentinel cancels its own height, so neither takes space", () => {
    for (const mod of ["condense", "release"]) {
      const b = box(mod);
      expect(b.height + b.margin, `${mod} is cancelled`).toBe(0);
    }
  });

  it("the release edge sits well below the condense edge — the gap IS the hysteresis", () => {
    const condense = box("condense").height;
    const release = box("release").height;
    expect(release).toBeLessThan(condense);
    /* Worst drift measured while scroll anchoring absorbs the nav's own height change was 4px,
       at 1440 and 2080. Anything under ~16px of gap is inside the fault it exists to survive. */
    expect(condense - release).toBeGreaterThanOrEqual(16);
  });

  it("the scroll fallback uses the same two edges as the sentinels", () => {
    const line = stripComments(shell).match(/was \? window\.scrollY > (\d+) : window\.scrollY > (\d+)/);
    expect(line, "the fallback states both edges on one line").toBeTruthy();
    expect(parseFloat(line![1])).toBe(box("release").height);
    expect(parseFloat(line![2])).toBe(box("condense").height);
  });
});
