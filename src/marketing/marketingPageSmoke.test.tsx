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
import { createHash } from "crypto";
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
import { HERO_H1, HERO_SUB, HERO_CTA, HERO_LINK, FEATURE_ROWS } from "./landingCopy";
import { SUPPORT_EMAIL } from "../lib/companyInfo";
import { sliceBetween } from "../test/sliceBetween";

/** The public marketing routes and a string each must actually render. */
const PUBLIC_ROUTES: [path: string, node: () => React.ReactElement, mustContain: string][] = [
  /* ⚠️ RETARGET, SAME LAW: the landmark is the hero's h1, and the h1 changed. The claim is
     unchanged — this route must render real content rather than a null. `DOCUMENT_TITLE` still
     carries other words, but it is set in an effect and never reaches the static markup, so it
     cannot stand in as the landmark.
     ⚠️ AND IT IS THE WHOLE STRING NOW, WHERE IT USED TO STOP SHORT. The old headline's last two
     words sat inside a `nowrap` span, so the sentence was not one uninterrupted run of text in the
     markup and the landmark had to avoid the split. Nothing is held any more — see the hero's own
     describe, which asserts that absence. */
  ["/", () => <Landing onNavigate={noNavigate} />, "The hunt begins."],
  /* Retarget, same law: the page is three tiers now and its h1 changed with them. */
  ["/pricing", () => <PricingPage onNavigate={noNavigate} />, "Pick the plan that fits"],
  /* Retarget, same law: the mission statement replaced the old About headline as this page's h1. */
  ["/about", () => <AboutPage onNavigate={noNavigate} />, "Get good stories told."],
  ["/contact", () => <ContactPage onNavigate={noNavigate} />, "Get in touch"],
  /* Retarget, same law: the founders headline changed with the hero rebuild (16 Sep). */
  ["/founders", () => <FoundersPage onNavigate={noNavigate} />, "Help get things off the ground."],
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
    expect(source).not.toContain("useQueryHawkDb");
  });

  for (const forbidden of ["upgradeToPro", "downgradeToFree", "updateUserProfile", "plan:"]) {
    it(`never mentions ${forbidden}`, () => {
      expect(source).not.toContain(forbidden);
    });
  }

  /**
   * ⚠️ AN UNBUYABLE TIER RENDERS A LABEL, NOT A DISABLED BUTTON. A `<button disabled>` still
   * announces itself as a button and still invites the click it will refuse; a `<span>` says the
   * thing is not available and offers nothing. The claim is therefore about the ELEMENT, not
   * about a `disabled` attribute — asserting the attribute would pass on exactly the markup this
   * forbids.
   */
  /**
   * ⚠️ THE CARD IS BOUNDED BY THE TIER SECTION, NOT BY "the rest of the document". Pro is the LAST
   * card, so an unbounded slice ran to the footer and caught the foot link's button and four
   * footer buttons — reporting a control inside a card that has none. Same slicing fault this repo
   * records twice; the tail of a document is not the tail of an element.
   */
  const tierCard = (html: string, key: string): string => {
    const tiers = html.slice(html.indexOf('class="mk-tiers"'), html.indexOf("</section>"));
    const from = tiers.indexOf(`mk-tier--${key}`);
    expect(from, `the ${key} card renders`).toBeGreaterThan(-1);
    const next = tiers.indexOf("mk-tier--", from + 12);
    return next === -1 ? tiers.slice(from) : tiers.slice(from, next);
  };

  it("Free and Pro state their unavailability and offer no control at all", () => {
    const html = renderPage(<PricingPage onNavigate={noNavigate} />, "/pricing");
    expect(html).not.toMatch(/Activate Pro/i);
    for (const key of ["free", "pro"]) {
      const card = tierCard(html, key);
      expect(card, `${key} is marked unavailable`).toContain('aria-disabled="true"');
      expect(card, `${key} offers a label`).toContain("Available at launch");
      expect(card, `${key} renders no button`).not.toContain("<button");
      expect(card, `${key} is not focusable`).not.toContain("tabindex");
      expect(card, `${key} is not a tab`).not.toContain('role="tab"');
    }
  });

  it("…and the one live tier does render a real control", () => {
    const html = renderPage(<PricingPage onNavigate={noNavigate} />, "/pricing");
    const card = tierCard(html, "founding");
    expect(card).not.toContain("aria-disabled");
    expect(card).toContain("<button");
    expect(card).toContain("Claim your spot");
  });

  /**
   * ⚠️ NO INVENTED FIGURE, ANYWHERE ON THE PAGE. The design this was rebuilt from carries £7/mo,
   * £70/yr and £3.50/mo; none has been set, and a price on a public page is a claim about what
   * something costs. `£0` is the one figure that is true today.
   *
   * The assertion is a SWEEP for any currency amount rather than a list of the three, because the
   * next invented figure will not be one of those three.
   */
  it("quotes no price but £0, because no other price exists yet", () => {
    const html = renderPage(<PricingPage onNavigate={noNavigate} />, "/pricing");
    /* ⚠️ TWO FIGURES NOW, AND THE SWEEP IS KEPT RATHER THAN DELETED. It existed so that no price
       could appear before one had been decided — £7/mo, £70/yr and £3.50/mo were all invented for
       a mockup. Pro's monthly price IS decided, so the set grows by exactly that one value and a
       third figure still fails here. The yearly rate and the founding rate remain unset, which is
       why neither appears. */
    const amounts = [...html.matchAll(/£\s*[\d.,]+/g)].map((m) => m[0]);
    expect(amounts).toEqual(["£0", "£4.99"]);
    /* ⚠️ "Price to be confirmed" IS ASSERTED ABSENT NOW, WHICH IS THE SAME CLAIM POINTED THE OTHER
       WAY. It was the placeholder Pro wore while `PRO_PRICE_MONTHLY` was null; the constant is set,
       so the placeholder must not survive beside a real figure — a page showing both would be
       stating two different things about one price. */
    expect(html, "the placeholder went when the figure arrived").not.toContain("Price to be confirmed");
    expect(html, "a price is still not a payment path").toContain("Not on sale yet");
  });

  /**
   * ⚠️ THE PLACES BAR IS LIVE OR ABSENT — never the ref's hardcoded "37 of 100 places claimed".
   * Rendered with no count in the store, the slot exists and holds nothing.
   */
  it("renders no places figure until a real one comes back", () => {
    const html = renderPage(<PricingPage onNavigate={noNavigate} />, "/pricing");
    expect(html).toContain("mk-tierplaces");
    expect(html).not.toMatch(/\d+\s*(?:of|\/)\s*\d+/);
    expect(html).not.toContain("places claimed");
  });

  /**
   * ⚠️ THE SIX-MONTHS QUESTION IS CUT, NOT LEFT UNANSWERED. Its only useful answer is a billing
   * commitment nobody has made. This asserts the question is absent as well as the answer — a
   * question printed with no answer reads worse than no question at all.
   */
  it("makes no commitment about what happens after the free months", () => {
    const html = renderPage(<PricingPage onNavigate={noNavigate} />, "/pricing");
    expect(html).not.toMatch(/six free months end/i);
    expect(html).not.toMatch(/half price for life[^<]*\u2014/i);
    expect(html).not.toMatch(/charged automatically/i);
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

  /**
   * ⚠️ THE MARK IS A public/ FILE, SO ITS URL CARRIES ITS OWN HASH. Nothing under public/ is
   * fingerprinted by the build and prod hosting lets a browser keep a file for an hour, so a logo
   * replaced under the same name would go on being served stale. The version is the first eight hex
   * digits of the file's own md5, and this reads BOTH sides — the rendered URL and the bytes on
   * disk — so a file swapped without the constant following it fails here rather than in a browser.
   */
  it("wears the QueryHawk mark at its own content hash", () => {
    const html = renderPage(shell(null), "/");
    const img = /<img[^>]*class="mk-logo"[^>]*>/.exec(html);
    expect(img, "the nav renders a mark").toBeTruthy();
    const src = /src="([^"]+)"/.exec(img![0]);
    expect(src, "…with a source").toBeTruthy();
    const [path, version] = src![1].split("?v=");
    const bytes = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "../..", "public" + path));
    expect(version, "the version IS the file, not a number kept in step by hand")
      .toBe(createHash("md5").update(bytes).digest("hex").slice(0, 8));
    expect(img![0], 'alt="" — the wordmark beside it already names the site').toMatch(/alt=""/);
  });

  /**
   * ⚠️ THE CAPS ARE IN THE MARKUP, NOT `text-transform`. A CSS transform leaves what a screen reader
   * announces and what the page draws saying different things, and only one of them is reviewable.
   * The word itself is UNCHANGED: this pass replaced the mark, not the name — renaming the site is
   * a separate job, and this asserts it has not quietly begun.
   */
  /**
   * ⚠️ RETARGETED: THE WORDMARK IS A PICTURE NOW, SO THE CAPS CLAIM HAS NO SUBJECT. It used to be
   * "QUERYHAWK" set in Archivo Expanded, with the capitals in the MARKUP rather than in CSS so the
   * drawn word and the announced word could not differ. Drawn letterforms make that moot — but the
   * claim underneath it survives and is asserted here: what a reader SEES and what a screen reader
   * HEARS are still the same word, because the alt text carries it.
   */
  it("wears the drawn wordmark, named for a screen reader, at its own content hash", () => {
    const html = renderPage(shell(null), "/");
    const img = /<img[^>]*class="mk-wordmarkart"[^>]*>/.exec(html);
    expect(img, "the nav renders the wordmark as artwork").toBeTruthy();
    expect(img![0], "the picture IS the word, so the alt is the word").toContain('alt="QueryHawk"');
    const src = /src="([^"]+)"/.exec(img![0]);
    const [path, version] = src![1].split("?v=");
    const bytes = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "../..", "public" + path));
    expect(version, "the version IS the file, not a number kept in step by hand")
      .toBe(createHash("md5").update(bytes).digest("hex").slice(0, 8));
    expect(html, "the accessible name is untouched").toContain('aria-label="QueryHawk home"');
    expect(html, "the type it replaced is gone from the nav").not.toContain(">QUERYHAWK<");
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
 * ⚠️ THE HERO IS A HEADLINE, A SUB AND TWO ACTIONS (brief, 16 Sep). `HERO_H1` stays one locked
 * string; `Hero` cuts it at its second-to-last space so the final two words can be held on one line
 * at the brief's 11ch measure. The risk that buys is a silent copy change — a dropped space, a lost
 * apostrophe — which no verbatim lock on the constant can see, because the constant is still right.
 * So this reads the RENDERED h1, strips the markup, and requires the sentence back.
 *
 * Where the lines break, and that the held pair stays inside its column, are rendered-page claims
 * and are measured rather than read out of a file.
 */
describe("the hero", () => {
  const html = () => renderPage(<Landing onNavigate={noNavigate} />, "/");
  const heading = () => {
    const m = html().match(/<h1[^>]*class="[^"]*mk-herotitle[^"]*"[^>]*>([\s\S]*?)<\/h1>/);
    expect(m, "the hero renders an h1.mk-herotitle").toBeTruthy();
    return m![1];
  };
  const unesc = (s: string) => s.replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&amp;/g, "&");

  it("reads as the whole sentence, with nothing held", () => {
    const h = heading();
    expect(unesc(h.replace(/<[^>]+>/g, "")), "word for word").toBe(HERO_H1);
    /* ⚠️ THE ABSENCE IS THE CLAIM NOW. The held pair stopped a four-line headline stranding
       "campaign"; on three short words the identical span strands "The" instead, because the break
       has to fall in front of a run that cannot break inside. It was removed with the headline that
       needed it, and this is what stops it returning from a diff. */
    expect(h, "no held run — a three-word headline wraps where it likes").not.toContain("mk-hkeep");
  });

  it("carries the sub and both actions, and the shadow is decorative", () => {
    const h = html();
    /* ⚠️ UNESCAPED FIRST, AND THE OLD SUB HID THIS. `renderToStaticMarkup` writes an apostrophe as
       `&#x27;`, so a raw `toContain` fails on a page that renders the string perfectly. The previous
       sub contained no apostrophe; this one ends "in the right agent's hands", so the comparison
       had to start unescaping the markup rather than the assertion being loosened. */
    expect(unesc(h)).toContain(HERO_SUB);
    expect(h).toContain(HERO_CTA);
    expect(h).toContain(HERO_LINK);
    expect(h, "the link is an in-page jump to the section break").toContain('href="#pulse"');
    expect(h, "an empty alt, because the shadow says nothing the copy does not").toMatch(/<img[^>]*src="\/images\/hawk-shadow\.png\?v=[0-9a-f]{8}"[^>]*alt=""/);
  });

  /**
   * ⚠️ AN IMAGE REPLACED UNDER THE SAME FILENAME MUST NOT BE SERVED FROM A CACHE — the same rule the
   * feature illustrations carry. Nothing under public/ is fingerprinted and prod hosting lets a
   * browser keep a file for an hour, so the URL carries the first eight hex digits of the file's md5.
   */
  it("versions the shadow's URL by the file's own content", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const png = readFileSync(resolve(here, "../../public/images/hawk-shadow.png"));
    const version = createHash("md5").update(png).digest("hex").slice(0, 8);
    expect(png.toString("latin1", 12, 16), "the header was read").toBe("IHDR");
    expect(html()).toContain('src="/images/hawk-shadow.png?v=' + version + '"');
  });

  /** ⚠️ Asserting the ABSENCE is what stops the statement hero returning from a diff. */
  it("carries none of the statement hero it replaced", () => {
    const h = html();
    for (const gone of ["mk-statement", "mk-heroburst", "mk-slip", "mk-lede", "mk-turn", "mk-found", "mk-illoart"]) {
      expect(h, `${gone} is retired`).not.toMatch(new RegExp('["\\s`]' + gone + '["\\s`]'));
    }
    expect(h).not.toContain("You&#x27;ve written a book.");
    expect(h).not.toContain("Introducing QueryHawk");
  });
});

/**
 * ⚠️ THE SIGN-UP LEFT THE HERO WITH THE PANEL THAT HELD IT, AND THE PAGE STILL HAS ONE. The form is
 * unchanged and mounted twice across the site — the sealed band at the foot of this page, and
 * `/founders` — so the landing carries exactly one, and the hero's solid button is the way to the
 * other. Counting the mounts is the claim: two would put two different asks on one page again.
 */
describe("the founding sign-up — one on the landing, in the band", () => {
  const html = () => renderPage(<Landing onNavigate={noNavigate} />, "/");

  it("one form, and it is the band's", () => {
    const h = html();
    expect(h.match(/mk-trap/g) ?? [], "one honeypot, so one form").toHaveLength(1);
    expect(h).toContain("Claim your place");
    expect(h, "the panel's own ask went with it").not.toContain("Claim your spot");
    expect(h).toContain("Founding writers");
    expect(h).toContain("Join as a founding writer");
    /* ⚠️ "members" IS ASSERTED ABSENT, NOT JUST "writers" PRESENT. `/founders` has always said
       founding WRITERS while this band said founding MEMBERS — one offer, two nouns, on two pages
       a reader crosses in one click. Both read fine alone, which is why only the absence catches
       the old word coming back. */
    expect(h, "the band and /founders name the same people").not.toContain("Founding members");
    expect(h).not.toContain("Be one of the first hundred.");
  });

  /**
   * ⚠️ THE OFFER IS A LIST, AND IT IS A REAL ONE. Four `<li>` under "You get:", so a screen reader
   * announces four items rather than four sentences, and the ring-and-dot marker stays in CSS
   * where a marker belongs. The ask beneath the hairline is the only thing asked in return, and
   * the page says so in one sentence.
   */
  it("states the four things a founding writer gets, and the one thing asked back", () => {
    const h = html();
    expect(h).toContain("You get:");
    const list = /<ul class="mk-claimlist">([\s\S]*?)<\/ul>/.exec(h);
    expect(list, "the offer renders as a list").toBeTruthy();
    expect(list![1].match(/<li>/g) ?? [], "four items").toHaveLength(4);
    expect(list![1]).toContain("Early access to QueryHawk");
    expect(list![1]).toContain("The full experience free of charge for 6 months");
    expect(h).toContain("All we ask is that you give us occasional feedback");
  });

  /**
   * ⚠️ THE EMPTY COLUMN HAS NO ELEMENT. The card is placed in column 2 and column 1 is simply the
   * track the artwork shows through; a spacer `<div>` would be a node in the accessibility tree
   * standing in for a background. Asserting the grid holds exactly one child is what stops one
   * being added back for convenience.
   */
  it("the banner is a card in the second column, with nothing holding the first", () => {
    const grid = /<div class="mk-claimgrid">([\s\S]*?)<section|<div class="mk-claimgrid">([\s\S]*)$/.exec(html());
    expect(grid, "the banner renders its grid").toBeTruthy();
    const inner = grid![1] ?? grid![2];
    expect(inner.slice(0, 40), "the card is the grid's first and only child")
      .toContain('<div class="mk-claimcard">');
    expect(inner).not.toContain("mk-claimart");
    /* The wax seal and its parchment letter went with the band they decorated. */
    expect(html()).not.toMatch(/["\s`]mk-wax["\s`]/);
    expect(html()).not.toMatch(/["\s`]mk-betacard["\s`]/);
    expect(html()).not.toContain("founding-seal-mark");
  });

  it("the hero points at the offer rather than asking for an address", () => {
    const h = html();
    expect(h).toContain(HERO_CTA);
    for (const gone of ["mk-fmperks", "mk-fmrow", "mk-fmlearn", "mk-found-panel"]) {
      expect(h, `${gone} is retired`).not.toMatch(new RegExp('["\\s`]' + gone + '["\\s`]'));
    }
    expect(h).not.toContain("Get involved");
    expect(h).not.toContain("100 Founding Writers");
    expect(h).not.toContain("How it works");
  });

  /**
   * ⚠️ LIVE OR ABSENT, AND THE BANNER'S COUNTER IS THE SHAPE MOST TEMPTED TO FAKE IT. It draws a
   * 26px figure, a remainder and a filled track — the design reads as the point of the card — and
   * the ref it descends from hardcodes "37 of 100". Rendered with no count in the store, NONE of
   * it exists: no track, no number, no "0 left", no dash. A fabricated scarcity number on a public
   * page is a factual claim about how many people have signed up, made by nobody.
   */
  it("renders no counter and no number, because there is no count yet", () => {
    const h = html();
    for (const cls of ["mk-claimcount", "mk-claimtrack", "mk-claimfill", "mk-claimnum", "mk-claimleft",
                       "mk-counter", "mk-fmcount", "mk-foundcnt"]) {
      expect(h, `${cls} renders nothing without a live figure`).not.toMatch(new RegExp('["\\s`]' + cls + '["\\s`]'));
    }
    expect(h).not.toContain("places claimed");
    expect(h).not.toMatch(/\d+\s+of\s+\d+/);
    expect(h).not.toMatch(/\d+\s+left/);
  });

  /**
   * ⚠️ THE PERKS ARE STILL LOCKED, ON THE PAGE THAT STILL RENDERS THEM. They were the hero panel's
   * three lines and `PRICING_TIERS` spreads them into the founding tier, so /pricing is where the
   * wording now has to hold — moved rather than deleted, because the constant did not go.
   */
  it("the founding perks, in full, on the pricing page", () => {
    const h = renderPage(<PricingPage onNavigate={noNavigate} />, "/pricing");
    expect(h).toContain("Six months&#x27; free Pro access");
    expect(h).toContain("Half price for as long as you need it");
    expect(h).toContain("A direct line to the founder");
    expect(h).not.toContain("6 months free Pro");
    /* ⚠️ "for life" ASSERTED ABSENT FROM THE WHOLE PAGE, not just from the perk list. It was on
       this tier twice — once in the perks and once in the after-line — so a lock naming only the
       list would go green with the promise still printed two lines below it. */
    expect(h, "the stronger promise is retired everywhere").not.toContain("for life");
  });
});

  /**
   * ⚠️ TWO MOUNTS ON ONE PAGE, AND THEIR IDS MUST DIFFER. `<label for>` and `aria-describedby`
   * resolve to whichever element comes first in the document, so a shared id would silently point
   * the second form's label at the first form's field — and duplicate ids are invalid HTML
   * besides. `idPrefix` is what stops it, and this is the assertion that says so.
   */
/**
 * ⚠️ THE LANDING CARRIES ONE SIGN-UP AND THESE ARE ITS CLAIMS. They were written when the hero held a
 * second mount and they outlived it: ids and labels are still per-mount, because `/founders` renders
 * the form twice on one document and the primitive is shared.
 */
describe("the sign-up the landing does carry", () => {
  const html = () => renderPage(<Landing onNavigate={noNavigate} />, "/");

  it("every sign-up on the page has its own ids and its own label", () => {
    const h = html();
    const ids = [...h.matchAll(/<input[^>]*id="([^"]+)"[^>]*type="email"/g)].map((m) => m[1]);
    expect(ids.length, "the landing carries one sign-up — the band's").toBe(1);
    expect(new Set(ids).size, `ids collide: ${ids.join(", ")}`).toBe(1);
    for (const id of ids) {
      const label = h.match(new RegExp(`<label[^>]*for="${id}"[^>]*>([^<]*)<`));
      expect(label, `${id} has its own label`).toBeTruthy();
      expect(label![1]).toBe("Email address");
      expect(label![0]).not.toContain("aria-hidden");
    }
  });

  it("…and one live region each, mounted empty before there is anything to announce", () => {
    const regions = [...html().matchAll(/<div class="mk-betamsgwrap"([^>]*)>([\s\S]*?)<\/div>/g)];
    expect(regions.length, "one mount, one region").toBe(1);
    for (const [, attrs, body] of regions) {
      expect(attrs).toContain('aria-live="polite"');
      expect(attrs).toContain('role="status"');
      expect(body.trim()).toBe("");
    }
  });

  /**
   * ⚠️ THE ARTWORK IS A CSS BACKGROUND AND THEREFORE RENDERS NO ELEMENT AT ALL — this asserts that,
   * because "no `<img>` in the band" looks exactly like "the picture was forgotten". It is a
   * background because it has to LEAVE below 1000px, and an inline style (where a version-stamped
   * `src` would have to live to stay in step with the file) BEATS a media query however the query
   * is written. `marketingTokens` holds the other half: the URL and its content hash.
   */
  it("the banner's artwork is a background, so the band renders no image element", () => {
    const h = html();
    const band = /<section class="mk-claimband"([\s\S]*?)<\/section>/.exec(h);
    expect(band, "the banner renders").toBeTruthy();
    expect(band![1], "no <img>, and no inline style that a breakpoint could not override")
      .not.toMatch(/<img|style="/);
    expect(band![1], "the offer is labelled by its own heading").toBeTruthy();
    expect(band![0]).toContain('aria-labelledby="mk-band-h"');
    expect(band![1]).toMatch(/id="mk-band-h"/);
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
 * `/founders` — the page the hero's button and the sealed band both point at, and the page that
 * forced the sign-up's generalisation: it mounts the form TWICE on one document.
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

  /**
   * ⚠️ RETARGETED, AND THE CLAIM IS NOW THAT THEY READ THE SAME. Both buttons used to be asserted
   * different: the hero said "Become a Founding Writer" — the NAV's words for the link that brings
   * a reader HERE — above a form on the page they had already reached. Two mounts of one act, so
   * both now say "Claim your place", and the old label's ABSENCE is what stops it returning.
   */
  it("both sign-ups ask for the same thing, in the same words", () => {
    const h = html();
    expect(h.match(/Claim your place/g) ?? [], "the hero and the banner").toHaveLength(2);
    expect(h, "the nav's wording does not belong above a form on this page")
      .not.toContain("Become a Founding Writer");
  });

  it("states the offer, the sweetener and the direct line", () => {
    const h = html();
    expect(h).toContain("Six months free");
    expect(h).toContain("Half price after that");
    expect(h).toContain("You shape what&#x27;s built");
    expect(h).toContain("Straight to the founder.");
    expect(h).toContain("Nick — QueryHawk&#x27;s founder");
    /* ⚠️ THE SELLING WENT AND MUST NOT COME BACK. These cards state terms; "the full force of
       QueryHawk" and "an arsenal of time-saving Pro features" were the product selling itself
       inside the one section whose job is to say plainly what the deal is. */
    for (const sell of ["full force", "arsenal", "supercharge", "tailored suite"]) {
      expect(h, `${sell} is sales copy, not a term`).not.toContain(sell);
    }
  });

  /**
   * ⚠️ THE DISCLOSURE IS A PULL-QUOTE ON THE PAGE GROUND, NOT A CARD — and the `Full disclosure`
   * label is deleted with the card. A mono label above a lifted statement announces that a
   * statement is coming; the statement announces itself. Asserting the label's ABSENCE is what
   * stops it being reinstated from a diff, and asserting the lifted line is present is what stops
   * the section quietly losing the sentence the whole page turns on.
   */
  it("lifts the promise instead of labelling the section", () => {
    const h = html();
    expect(h).toContain("Your data is never the experiment.");
    expect(h).not.toContain("Full disclosure");
    /* The mark is punctuation, not content. */
    expect(h).toMatch(/<p class="mk-fwmark" aria-hidden="true">/);
  });

  /**
   * ⚠️ SAID ONCE, IN THE LIFTED LINE. It used to be a bolded phrase inside the first paragraph as
   * well; emphasising it in both places says it twice and means it less. No `<strong>` survives
   * anywhere in the disclosure.
   */
  it("says the promise once, and italicises `quite` without colouring it", () => {
    const section = html().match(/<section class="mk-fwhonest">([\s\S]*?)<\/section>/);
    expect(section, "the disclosure renders").toBeTruthy();
    expect(section![1]).not.toContain("<strong");
    expect(section![1]).toContain("<em>quite</em>");
    /* Em dashes, not hyphens — they are part of the copy. */
    expect(section![1]).toContain("ensured — your queries");
    expect(section![1]).toContain("Writers — and their writing —");
  });

  /** ⚠️ LIVE OR ABSENT, HERE TOO. Two mounts, and neither may invent a number. */
  it("renders no count anywhere", () => {
    const h = html();
    expect(h).not.toContain("places claimed");
    expect(h).not.toMatch(/\d+\s+of\s+\d+/);
  });

  /**
   * ⚠️ THE ARTWORK IS BARE AND MUST NOT ACQUIRE PLACEHOLDER CHROME. It arrived finished; the slot
   * primitive exists to draw a dashed rim and a caption that say an asset has NOT, and wrapping
   * this one would mean passing `finished` to switch off everything the component does.
   *
   * ⚠️ AND IT CARRIES REAL ALT TEXT, WHERE `founders-earth.png` WAS `alt=""`. That one was
   * decorative — a globe beside a headline about building a world — and is DELETED from
   * `src/assets/marketing/` rather than left unimported, so its name is asserted absent too. This
   * picture IS the page's argument, so an empty alt would leave a reader who cannot see it with a
   * gap where the argument is.
   */
  it("the artwork is bare, and describes itself", () => {
    const h = html();
    const img = /<img class="mk-fwart"[^>]*>/.exec(h);
    expect(img, "the founders hero renders its artwork").toBeTruthy();
    expect(img![0]).toMatch(/src="\/images\/off-the-ground\.png\?v=[0-9a-f]{8}"/);
    expect(img![0]).toContain("An older hawk and two others helping a young hawk into the air");
    expect(img![0], "an empty alt would drop the page's own argument").not.toMatch(/alt=""/);
    expect(h).not.toMatch(/["\s`]mk-illo["\s`]/);
    expect(h).not.toContain("Illustration placeholder");
    expect(h, "the earth is deleted, not merely unrendered").not.toContain("founders-earth");
    expect(h).not.toMatch(/["\s`]mk-fwearth["\s`]/);
  });

  /**
   * ⚠️ THE VERSION IS THE FILE. Nothing under `public/` is fingerprinted by the build and prod
   * hosting lets a browser keep a file for an hour, so a re-export served under the same name goes
   * on being served stale. This reads BOTH sides — the rendered URL and the bytes on disk — so a
   * picture swapped without its constant following it fails here rather than in a browser.
   */
  it("versions the artwork's URL by the file's own content", () => {
    const src = /<img class="mk-fwart"[^>]*src="([^"]+)"/.exec(html());
    expect(src, "the artwork has a source").toBeTruthy();
    const [path, version] = src![1].split("?v=");
    const bytes = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "../..", "public" + path));
    expect(version, "the version IS the file, not a number kept in step by hand")
      .toBe(createHash("md5").update(bytes).digest("hex").slice(0, 8));
  });

  /** It carries the shared footer, so every other public page is one click away. */
  it("takes the shared footer with it", () => {
    const h = html();
    expect(h).toMatch(/["\s`]mk-foot["\s`]/);
    expect(h).toContain("Founding writers");
  });
});

/**
 * ⚠️ TWO COUNTER VARIANTS, AND EVERY ONE OF THEM HAS A CALLER. `FoundingCounter` has already grown
 * a shape nobody drew: `line` rendered a bare sentence, `/founders` was its only consumer, and the
 * branch outlived it. A variant surviving its last caller is how this component comes to carry a
 * form nobody has looked at in a year, so the claim is a RECONCILIATION — the union's members
 * against the props actually rendered — rather than a count on either side alone, which would go
 * green the day both were changed in the same wrong direction.
 *
 * `claim` is the offer's own counter (the banner and the `/founders` hero); `tally` is the compact
 * bar in `/pricing`'s narrow tier column. `bar` was SWAPPED for `claim`, not added beside it.
 */
describe("the founding counter has two variants and no orphans", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const read = (f: string) => readFileSync(resolve(here, f), "utf8");

  it("the union's members are exactly the variants the site renders", () => {
    const union = /FoundingCounter: React\.FC<\{ variant: ([^}]+) \}>/.exec(read("FoundingSignup.tsx"));
    expect(union, "the counter declares its variants").toBeTruthy();
    const declared = [...union![1].matchAll(/"([a-z]+)"/g)].map((m) => m[1]).sort();

    const rendered = new Set<string>();
    for (const f of ["FoundingBand.tsx", "FoundersPage.tsx", "PricingPage.tsx"]) {
      for (const m of read(f).matchAll(/<FoundingCounter variant="([a-z]+)"/g)) rendered.add(m[1]);
    }
    expect(declared, "every declared variant is rendered somewhere").toEqual([...rendered].sort());
    expect(declared).toEqual(["claim", "tally"]);
    /* The retired shapes, asserted absent so neither returns from a diff. */
    expect(union![1]).not.toContain('"bar"');
    expect(union![1]).not.toContain('"line"');
  });

  it("the banner and the founders hero draw the same shape, and pricing keeps its own", () => {
    expect(read("FoundingBand.tsx")).toContain('<FoundingCounter variant="claim" />');
    expect(read("FoundersPage.tsx")).toContain('<FoundingCounter variant="claim" />');
    expect(read("PricingPage.tsx")).toContain('<FoundingCounter variant="tally" />');
  });

  /**
   * ⚠️ NEITHER FIGURE IS COMPOSED AT THE RENDER SITE. `cap - claimed` written into the component
   * is a number no copy lock can see — and it is the one that prints "-3 left" the day the cap is
   * lowered under a live count. Both builders live in `landingCopy`, where the sweep for a
   * hardcoded count can reach them.
   */
  it("builds both figures from the copy module, never from arithmetic in the component", () => {
    const src = read("FoundingSignup.tsx");
    expect(src).toContain("foundingRemainingLabel(count.claimed, count.cap)");
    expect(src).toContain("foundingCounterRest(count.cap)");
    expect(src, "no subtraction at the render site").not.toMatch(/count\.cap\s*-\s*count\.claimed/);
    /* Still the one gate that matters: no figure at all until the endpoint answers. */
    expect(src).toContain('if (!count || state === "down") return null;');
  });
});

/**
 * ⚠️ `CopyRun` GAINED AN ITALIC MEMBER, AND `CopyRuns` IS SHARED BY FOUR PUBLIC PAGES. The change
 * is purely additive — a new branch, no existing one altered — and that has to be provable rather
 * than asserted, because the file renders every sentence on About, Contact, Legal and the landing.
 * These render the three pages that do NOT use the new member and check the markup contains no
 * `<em>`: if the branch had disturbed the ones above it, bold or links would have started coming
 * out italic.
 */
describe("the italic run is additive — the pages that do not use it are unchanged", () => {
  const PAGES: [string, () => React.ReactElement, string][] = [
    ["/about", () => <AboutPage onNavigate={noNavigate} />, "/about"],
    ["/contact", () => <ContactPage onNavigate={noNavigate} />, "/contact"],
    ["/", () => <Landing onNavigate={noNavigate} />, "/"],
  ];

  for (const [name, node, path] of PAGES) {
    it(`${name} renders no italics and keeps its bold and its links`, () => {
      const html = renderPage(node(), path);
      expect(html).not.toContain("<em>");
      /* …and the branches that were already there still work. */
      expect(html.includes("<strong>") || html.includes("mk-doclink") || html.includes("<a "))
        .toBe(true);
    });
  }

  /** The one page that does use it. */
  it("/founders renders exactly one italic, and it is `quite`", () => {
    const html = renderPage(<FoundersPage onNavigate={noNavigate} />, "/founders");
    expect([...html.matchAll(/<em>([^<]*)<\/em>/g)].map((m) => m[1])).toEqual(["quite"]);
  });
});

/**
 * ⚠️ SIX ROWS, AND EACH IS AN IMAGE, A HEADING AND ONE PARAGRAPH — NOTHING ELSE. Asserted on the
 * rendered band rather than on the copy module, because the failure this guards is a row picking up
 * markup the copy never asked for: a button, a link, a bold run, a badge, or the aria-hidden wrapper
 * the retired mockups sat in — which would silence the alt text.
 */
describe("the feature rows: six images, six headings, six paragraphs", () => {
  const html = () => renderPage(<Landing onNavigate={noNavigate} />, "/");
  /* Retarget, same law: the band the rows end at is the founding-writers banner now, and its
     class changed with the rebuild. The slice's END anchor is what stops it running to the foot of
     the document — which is exactly what `sliceBetween` refused to let happen silently here. */
  const band = () => sliceBetween(html(), 'id="mk-features"', 'class="mk-claimband"', "the features band");
  const rowsOf = (markup: string) => markup.split('<div class="mk-frow">').slice(1);
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
  const unesc = (s: string) => s.replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&amp;/g, "&");

  it("renders the six rows in order, each an image, then its heading, then its paragraph", () => {
    const rows = rowsOf(band());
    expect(rows).toHaveLength(6);
    rows.forEach((markup, i) => {
      const row = FEATURE_ROWS[i];
      const img = markup.indexOf('src="' + row.image + "?v=");
      const h3 = markup.indexOf("<h3>");
      const heading = /<h3>([\s\S]*?)<\/h3>/.exec(markup);
      expect(heading, row.key + ": a heading").toBeTruthy();
      expect(unesc(heading![1].replace(/<[^>]+>/g, "")), row.key + ": its heading, word for word").toBe(row.heading);
      const p = markup.indexOf("<p>" + esc(row.body) + "</p>");
      expect(img, row.key + ": its image").toBeGreaterThan(-1);
      expect(h3, row.key + ": its heading, after the image").toBeGreaterThan(img);
      expect(p, row.key + ": its paragraph, after the heading").toBeGreaterThan(h3);
      expect(markup, row.key + ": its alt text").toContain('alt="' + esc(row.alt) + '"');
      expect(markup.match(/<img\b/g) ?? [], row.key + ": one image").toHaveLength(1);
      expect(markup.match(/<p\b/g) ?? [], row.key + ": one paragraph").toHaveLength(1);
    });
  });

  it("carries no action, no link, no emphasis, no badge and no hidden wrapper", () => {
    const markup = band();
    for (const forbidden of ["<button", "<a ", "<b>", "<strong", "aria-hidden", "mk-protag", "mk-btn", "mk-tlink"]) {
      expect(markup, "the band renders " + forbidden).not.toContain(forbidden);
    }
  });

  /** A hand-typed ratio that disagreed with a file would reserve the wrong box until it loaded. */
  it("states each image's own pixel size, read from its PNG header", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const rows = rowsOf(band());
    FEATURE_ROWS.forEach((row, i) => {
      const png = readFileSync(resolve(here, "../../public", "." + row.image));
      expect(png.toString("latin1", 12, 16), row.image + ": the header was read").toBe("IHDR");
      expect(rows[i], row.image).toContain('width="' + png.readUInt32BE(16) + '" height="' + png.readUInt32BE(20) + '"');
    });
  });

  /**
   * ⚠️ AT 13ch, THREE HEADINGS WOULD END ON ONE WORD — "stands", "itself." and "working" — so every heading
   * holds its last two words together on one line. That is typesetting, not copy: the heading, markup
   * stripped, is still the sentence word for word (asserted above), and the held run is exactly its last
   * two words.
   */
  it("holds each heading's last two words together on one line", () => {
    const rows = rowsOf(band());
    rows.forEach((markup, i) => {
      const held = FEATURE_ROWS[i].heading.split(" ").slice(-2).join(" ");
      expect(markup, FEATURE_ROWS[i].key + ": its last two words, held").toContain('<span class="mk-fkeep">' + esc(held) + "</span></h3>");
    });
  });

  /**
   * ⚠️ AN IMAGE REPLACED UNDER THE SAME FILENAME MUST NOT BE SERVED FROM A CACHE. Nothing under public/ is
   * fingerprinted by the build and prod hosting lets a browser keep a file for an hour, so each URL carries
   * the first eight hex digits of its file's own md5. A file re-exported without its version following
   * fails here.
   */
  it("versions each image's URL by the file's own content", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const rows = rowsOf(band());
    FEATURE_ROWS.forEach((row, i) => {
      const version = createHash("md5").update(readFileSync(resolve(here, "../../public", "." + row.image))).digest("hex").slice(0, 8);
      expect(rows[i], row.image).toContain('src="' + row.image + "?v=" + version + '"');
    });
  });
});
