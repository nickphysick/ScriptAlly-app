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
import { FoundersPage } from "./FoundersPage";
import { LEGAL_COPY_REVIEWED } from "./legalCopy";
import { HERO_H1 } from "./landingCopy";
import { SUPPORT_EMAIL } from "../lib/companyInfo";

/** The public marketing routes and a string each must actually render. */
const PUBLIC_ROUTES: [path: string, node: () => React.ReactElement, mustContain: string][] = [
  /* ⚠️ RETARGET, SAME LAW: the landmark is the hero's h1, and the statement hero replaced the
     strapline it used to name. The claim is unchanged — this route must render real content, not
     a null. `DOCUMENT_TITLE` still carries the old words, but it is set in an effect and never
     reaches the static markup, so it cannot stand in as the landmark.
     ⚠️ AND IT STOPS BEFORE THE LAST WORD ON PURPOSE. The headline's final word is bound to the
     tick inside a `nowrap` span, so the full sentence is no longer one uninterrupted run of text
     in the markup. That the sentence still reads whole is a stronger claim than a landmark can
     make, and it is asserted below against the h1's stripped text. */
  ["/", () => <Landing onNavigate={noNavigate} />, "You&#x27;ve written a"],
  ["/pricing", () => <PricingPage onNavigate={noNavigate} />, "Start free"],
  /* Retarget, same law: the mission statement replaced the old About headline as this page's h1. */
  ["/about", () => <AboutPage onNavigate={noNavigate} />, "Get good stories told."],
  ["/contact", () => <ContactPage onNavigate={noNavigate} />, "Get in touch"],
  ["/founders", () => <FoundersPage onNavigate={noNavigate} />, "Help build our world."],
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

/**
 * ⚠️ THE HEADLINE IS SPLIT IN THE COMPONENT AND MUST NOT BE EDITED BY THE SPLIT. `HERO_H1` stays
 * one locked string; `Hero` cuts it at its last space so the final word and the ticked box can be
 * bound into one unbreakable unit. The risk that buys is a silent copy change — a dropped space, a
 * lost full stop — which no verbatim lock on the constant can see, because the constant is still
 * right. So this reads the RENDERED h1, strips the markup, and requires the sentence back.
 *
 * The mark's placement — that it sits on the same line as the last word at every width, and that
 * the row clears the column — is a rendered-page claim and is measured, not read out of a file.
 */
describe("the statement's ticked box", () => {
  const html = () => renderPage(<Landing onNavigate={noNavigate} />, "/");
  const heading = () => {
    const m = html().match(/<h1[^>]*class="[^"]*mk-statement[^"]*"[^>]*>([\s\S]*?)<\/h1>/);
    expect(m, "the hero renders an h1.mk-statement").toBeTruthy();
    return m![1];
  };

  it("reads as the whole sentence once the markup is stripped", () => {
    const text = heading().replace(/<[^>]*>/g, "").replace(/&#x27;/g, "'").replace(/\s+/g, " ").trim();
    expect(text).toBe(HERO_H1);
  });

  it("binds the last word and the mark into one unbreakable unit", () => {
    const h = heading();
    const span = h.match(/<span class="mk-tickword">([\s\S]*?)<\/span>/);
    expect(span, "the last word sits in .mk-tickword").toBeTruthy();
    /* The mark is INSIDE that span — outside it, the span binds a word to nothing. */
    expect(span![1]).toContain("mk-tick");
    /* …and the word it binds is the headline's last. */
    expect(span![1].replace(/<[^>]*>/g, "").trim()).toBe(HERO_H1.split(" ").pop());
  });

  it("the mark is decorative — it is punctuation, not content", () => {
    expect(heading()).toMatch(/<img[^>]*class="mk-tick"[^>]*alt=""/);
  });

  it("the congratulation and its popper are gone from the page", () => {
    const h = html();
    expect(h).not.toContain("Congratulations.");
    expect(h).not.toContain("You&#x27;ve got further than most.");
    expect(h).not.toMatch(/["\s`]mk-popper["\s`]/);
    expect(h).not.toMatch(/["\s`]mk-congrats["\s`]/);
    expect(h).not.toMatch(/["\s`]mk-subhead["\s`]/);
  });
});

/**
 * The founding-members band — the page's closing offer, and the first thing on any public page
 * that asks a stranger to type something.
 *
 * ⚠️ THE COUNTER IS LIVE OR ABSENT AND THIS IS THE LOCK THAT SAYS SO. The ref hardcodes
 * "37 of 100 places claimed". On a public page that is a factual claim about how many people have
 * signed up, made by nobody, checkable by nobody. Nothing renders until a real figure comes back —
 * not a zero, not an empty bar, not a dash — so the first render must contain no counter at all.
 */
describe("the founding sign-up — one component, mounted more than once", () => {
  const html = () => renderPage(<Landing onNavigate={noNavigate} />, "/");

  it("the hero's panel is the page's action, and the CTA band is gone", () => {
    const h = html();
    expect(h).toContain("Founding writers · limited to 100");
    expect(h).toContain("Become a Founding Writer.");
    expect(h).toContain("Founding members");
    expect(h).toContain("Be one of the first hundred.");
    expect(h).not.toMatch(/["\s`]mk-ctaband["\s`]/);
    expect(h).not.toContain("Free to start. Take control of your querying journey today.");
  });

  /**
   * ⚠️ THE HERO'S OLD ACTIONS ROW IS GONE, BOTH HALVES. `Start tracking — it's free` left because
   * pre-launch nothing self-serve sits behind it; `Learn more` left with the row it shared. A
   * hero with a real offer and an in-page anchor competing three inches below it is the shape
   * this replaced.
   */
  it("neither half of the old actions row survives on the page", () => {
    const h = html();
    /* ⚠️ THE FULL LABEL, NOT THE PREFIX. "Start tracking" on its own is still legitimate copy on
       this page — three feature rows use it as their action — so a substring check goes red on a
       correct page. The claim is about the HERO's CTA, which is the whole string. */
    expect(h).not.toContain("Start tracking — it&#x27;s free");
    expect(h).not.toMatch(/["\s`]mk-hctas["\s`]/);
    expect(h).not.toMatch(/["\s`]mk-learn["\s`]/);
    expect(h).not.toContain("Learn more");
  });

  it("renders no counter and no number, because there is no count yet", () => {
    const h = html();
    expect(h).not.toMatch(/["\s`]mk-counter["\s`]/);
    expect(h).not.toMatch(/["\s`]mk-foundcnt["\s`]/);
    expect(h).not.toContain("places claimed");
    expect(h).not.toMatch(/\d+\s+of\s+\d+/);
  });

  /**
   * ⚠️ TWO MOUNTS ON ONE PAGE, AND THEIR IDS MUST DIFFER. `<label for>` and `aria-describedby`
   * resolve to whichever element comes first in the document, so a shared id would silently point
   * the second form's label at the first form's field — and duplicate ids are invalid HTML
   * besides. `idPrefix` is what stops it, and this is the assertion that says so.
   */
  it("every sign-up on the page has its own ids and its own label", () => {
    const h = html();
    const ids = [...h.matchAll(/<input[^>]*id="([^"]+)"[^>]*type="email"/g)].map((m) => m[1]);
    expect(ids.length, "the landing carries two sign-ups").toBe(2);
    expect(new Set(ids).size, `ids collide: ${ids.join(", ")}`).toBe(2);
    for (const id of ids) {
      const label = h.match(new RegExp(`<label[^>]*for="${id}"[^>]*>([^<]*)<`));
      expect(label, `${id} has its own label`).toBeTruthy();
      expect(label![1]).toBe("Email address");
      expect(label![0]).not.toContain("aria-hidden");
    }
  });

  it("…and one live region each, mounted empty before there is anything to announce", () => {
    const regions = [...html().matchAll(/<div class="mk-betamsgwrap"([^>]*)>([\s\S]*?)<\/div>/g)];
    expect(regions.length).toBe(2);
    for (const [, attrs, body] of regions) {
      expect(attrs).toContain('aria-live="polite"');
      expect(attrs).toContain('role="status"');
      expect(body.trim()).toBe("");
    }
  });

  /** The wax seal says nothing the heading beneath it does not. */
  it("the seal is decorative throughout", () => {
    const seal = html().match(/<span class="mk-wax"[^>]*>/);
    expect(seal, "the seal is rendered").toBeTruthy();
    expect(seal![0]).toContain('aria-hidden="true"');
    expect(html()).toMatch(/<img[^>]*src="[^"]*founding-seal-mark[^"]*"[^>]*alt=""/);
  });

  /** No outcome is stated before anything has been sent, on either mount. */
  it("says nothing about the outcome on first render", () => {
    const h = html();
    for (const s of [
      "You're on the list",
      "already on the list",
      "All hundred founding places are claimed",
      "Sign-ups are briefly unavailable",
      "That didn&#x27;t send",
    ]) expect(h).not.toContain(s);
  });
});

/**
 * `/founders` — the page the landing hero's panel and the sealed band both point at, and the page
 * that forced the sign-up's generalisation: it mounts the form TWICE on one document.
 */
describe("the Founding Writers page", () => {
  const html = () => renderPage(<FoundersPage onNavigate={noNavigate} />, "/founders");

  /**
   * ⚠️ TWO SIGN-UPS ON ONE PAGE, AND THIS IS THE ASSERTION THAT WOULD HAVE CAUGHT THE SINGLETON.
   * `<label for>` and `aria-describedby` resolve to whichever id comes first in the document, so a
   * shared id points the second form's label at the first form's field — and duplicate ids are
   * invalid HTML besides. `idPrefix` is what stops it.
   */
  it("mounts the sign-up twice, with distinct ids and a label each", () => {
    const h = html();
    const ids = [...h.matchAll(/<input[^>]*id="([^"]+)"[^>]*type="email"/g)].map((m) => m[1]);
    expect(ids.length).toBe(2);
    expect(new Set(ids).size, `ids collide: ${ids.join(", ")}`).toBe(2);
    for (const id of ids) {
      const label = h.match(new RegExp(`<label[^>]*for="${id}"[^>]*>([^<]*)<`));
      expect(label, `${id} has its own label`).toBeTruthy();
      expect(label![1]).toBe("Email address");
    }
  });

  /** Two buttons, two jobs: the hero asks you to become one, the band asks you to claim a place. */
  it("the hero's button and the band's read differently", () => {
    const h = html();
    expect(h).toContain("Become a Founding Writer");
    expect(h).toContain("Claim your place");
  });

  it("states the offer, the sweetener and the direct line", () => {
    const h = html();
    expect(h).toContain("Six months of Pro, free");
    expect(h).toContain("Half price, for as long as you need it.");
    expect(h).toContain("You shape what&#x27;s built");
    expect(h).toContain("You&#x27;ll be in direct contact with ScriptAlly&#x27;s founder");
    expect(h).toContain("Full disclosure");
    expect(h).toContain("Nick — ScriptAlly&#x27;s founder");
  });

  /** ⚠️ LIVE OR ABSENT, HERE TOO. Two mounts, and neither may invent a number. */
  it("renders no count anywhere", () => {
    const h = html();
    expect(h).not.toContain("places claimed");
    expect(h).not.toMatch(/\d+\s+of\s+\d+/);
  });

  /**
   * ⚠️ THE EARTH IS BARE AND MUST NOT ACQUIRE PLACEHOLDER CHROME. It arrived finished; the slot
   * primitive exists to draw a dashed rim and a caption that say an asset has NOT, and wrapping
   * this one would mean passing `finished` to switch off everything the component does.
   */
  it("the artwork is bare and decorative", () => {
    const h = html();
    expect(h).toMatch(/<img class="mk-fwearth" src="[^"]*founders-earth[^"]*" alt=""/);
    expect(h).not.toMatch(/["\s`]mk-illo["\s`]/);
    expect(h).not.toContain("Illustration placeholder");
  });

  /** It carries the shared footer, so every other public page is one click away. */
  it("takes the shared footer with it", () => {
    const h = html();
    expect(h).toMatch(/["\s`]mk-foot["\s`]/);
    expect(h).toContain("Founding writers");
  });
});
