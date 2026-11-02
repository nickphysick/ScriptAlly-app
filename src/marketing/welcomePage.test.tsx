/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * /welcome — the founding welcome a confirmation link lands on (welcome page v1, 2 Nov; ref
 * design-refs/welcome-page-v1.html).
 *
 * These read the rendered markup of `WelcomeView` with stubbed data, so a state can be drawn with a
 * number without a server. What the browser does with it (no capitals anywhere, the bird inside the
 * stub, the links, the stamp's motion, the mocked fetch) is measured on a production build in
 * tests/e2e/welcomePage.public.ts (WEL-1 to WEL-6).
 */
import { describe, expect, it, vi } from "vitest";
import React from "react";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { renderPage, noNavigate, stripComments } from "../test/pageSmoke";

vi.mock("../lib/db", async () => (await import("../test/pageSmoke")).dbMock());
vi.mock("../lib/firebase", async () => (await import("../test/pageSmoke")).firebaseMock());
vi.mock("../components/toast/ToastProvider", async () => (await import("../test/pageSmoke")).toastMock());

import { WelcomeView, WelcomePage } from "./WelcomePage";
import { FoundersPage } from "./FoundersPage";
import { FOUNDERS_H1 } from "./foundersCopy";
import { FOUNDING_GETS } from "./landingCopy";
import {
  WELCOME_KINDS, type WelcomeKind, type WelcomeData, parseWelcomeKind, canSend,
  ordinal, ordinalWord, longDate, TAPS_SEND, PLACES_OFFERED_ON,
} from "./welcomeCopy";

const text = (html: string) =>
  html.replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/\s+/g, " ");

const DATA: Record<WelcomeKind, WelcomeData | null> = {
  verified: { foundingNumber: 14, confirmedOn: "2026-11-02" },
  already: { foundingNumber: 14, confirmedOn: "2026-11-02" },
  waiting: { reserveNumber: 3, confirmedOn: "2026-11-02" },
  expired: null,
  unknown: null,
};
const view = (kind: WelcomeKind, opts: { data?: WelcomeData | null; loading?: boolean; ref?: string | null } = {}) =>
  renderPage(
    <WelcomeView
      kind={kind}
      data={opts.data === undefined ? DATA[kind] : opts.data}
      loading={opts.loading ?? false}
      welcomeRef={opts.ref === undefined ? "ref-stub" : opts.ref}
      onNavigate={noNavigate}
      onSendAnswers={async () => true}
    />,
    "/welcome",
  );
const pass = (html: string) => {
  const i = html.indexOf('data-probe="pass"');
  expect(i, "the pass is drawn").toBeGreaterThan(0);
  return text(html.slice(i, html.indexOf("</header>", i)));
};

describe("W1 · each state's heading, and the words around it", () => {
  const HEADINGS: Record<WelcomeKind, string> = {
    verified: "Welcome, founding writer.",
    already: "You're already on the list.",
    waiting: "So close. You're third in line.",
    expired: "That link's 48 hours are up.",
    unknown: "We don't recognise that link.",
  };
  for (const kind of WELCOME_KINDS) {
    it(kind, () => expect(text(view(kind))).toContain(HEADINGS[kind]));
  }
  it("v outside the five, or missing, is unknown", () => {
    expect(parseWelcomeKind("nonsense")).toBe("unknown");
    expect(parseWelcomeKind(null)).toBe("unknown");
  });
  it("the waiting heading names the stored place, or none", () => {
    expect(text(view("waiting", { data: { reserveNumber: 1 } }))).toContain("So close. You're first in line.");
    expect(text(view("waiting", { data: {} }))).toContain("So close. You're on the reserve list.");
  });
  it("the formatters", () => {
    expect([1, 2, 3, 11, 23].map(ordinal)).toEqual(["1st", "2nd", "3rd", "11th", "23rd"]);
    expect([1, 3, 10, 11].map(ordinalWord)).toEqual(["first", "third", "tenth", "11th"]);
    expect(longDate("2026-11-02")).toBe("2 November 2026");
    expect(longDate("nope")).toBeNull();
  });
});

describe("W2 · the pass states the stored number and nothing else", () => {
  it("verified: No. 14 of 50, Confirmed, the long date", () => {
    expect(pass(view("verified"))).toMatch(/Founding writer pass No\. 14 of 50 .*QueryHawk Confirmed 2 November 2026/);
  });
  it("waiting: the reserve list, 3rd in line, Reserve", () => {
    expect(pass(view("waiting"))).toMatch(/Reserve list 3rd in line .*Reserve 2 November 2026/);
  });
  it("no number in the data → no number, never an invented one", () => {
    const p = pass(view("verified", { data: null }));
    expect(p).not.toMatch(/No\. \d/);
    expect(p).not.toMatch(/of 50/);
    expect(p).toContain("Confirmed");
  });
  it("expired and unknown: the ghost, Not yet held, One click away", () => {
    for (const k of ["expired", "unknown"] as const) expect(pass(view(k))).toMatch(/Founding writer pass Not yet held .*One click away/);
  });
});

describe("W3 · the three taps", () => {
  it("Send is disabled until all three are answered", () => {
    expect(canSend({ stage: "just-started", queried: "11-50" })).toBe(false);
    expect(canSend({ stage: "just-started", queried: "11-50", tracker: "spreadsheet" })).toBe(true);
    expect(canSend({ stage: "just-started", queried: "11-50", tracker: "carrier pigeon" })).toBe(false);
  });
  it("no reference → no taps (there is nowhere to send them)", () => {
    expect(view("verified", { ref: null })).not.toContain(TAPS_SEND);
    expect(view("verified")).toContain(TAPS_SEND);
  });
});

describe("W4 · what each state draws and leaves out", () => {
  it("verified and already: the note, three steps, the landing's four perks word for word, get ready, the close", () => {
    for (const k of ["verified", "already"] as const) {
      const t = text(view(k));
      expect(t).toContain("Hi, I'm Nick.");
      expect(t).toContain("Hello, founding writer number 14. We're honoured to have you on board.");
      for (const g of FOUNDING_GETS) expect(t, g).toContain(g);
      expect(t).toContain("Get ready for day one");
      expect(t).toContain("That's everything for now. Keep an eye on your inbox.");
    }
  });
  /* Launch readiness (2 Nov): a freed place goes to the next writer in line (PROMO-1), so the 2(a) lines
     are drawn. */
  it("waiting: its own note, the 'If a place frees up' step, no perks, no get-ready", () => {
    expect(PLACES_OFFERED_ON).toBe(true);
    const t = text(view("waiting"));
    expect(t).toContain("The last founding place went while your email sat in your inbox. You're confirmed and on the reserve list, in the order people confirmed. If a founding place frees up, it's offered to the next writer in line.");
    expect(t).toContain("Sorry we couldn't fit you in this time, and thank you for signing up. You're confirmed and in the queue, so if a place frees up, it's yours to take.");
    expect(t).toContain("Third in line, in the order writers confirmed.");
    expect(t).toContain("If a place frees up It's offered to the next writer in line, and you'll hear by email straight away.");
    expect(t).not.toContain(FOUNDING_GETS[0]);
    expect(t).not.toContain("Get ready for day one");
  });
  it("expired and unknown: the drawer only, with the fresh-link form", () => {
    for (const k of ["expired", "unknown"] as const) {
      const t = text(view(k));
      expect(t).toContain("Send a fresh link");
      expect(t).not.toContain("What happens next");
      expect(t).not.toContain("Hi, I'm Nick.");
    }
  });
  it("no 'Log in', no price, no email address in any state", () => {
    for (const k of WELCOME_KINDS) {
      const t = text(view(k));
      expect(t).not.toMatch(/Log in|£\d|@[a-z0-9-]+\./i);
    }
  });
});

describe("W5 · /founders?verified=<kind> goes on to /welcome, and /founders draws no state of its own", () => {
  it("the redirect renders no /founders content", () => {
    const html = renderPage(<FoundersPage onNavigate={noNavigate} />, "/founders?verified=already");
    expect(text(html)).not.toContain(FOUNDERS_H1);
  });
  it("the plain page is unchanged", () => {
    expect(text(renderPage(<FoundersPage onNavigate={noNavigate} />, "/founders"))).toContain(FOUNDERS_H1);
  });
  it("the page itself renders from its URL", () => {
    expect(text(renderPage(<WelcomePage onNavigate={noNavigate} />, "/welcome?v=expired"))).toContain("That link's 48 hours are up.");
  });
});

describe("W6 · the retired parts are gone (welcome page v1)", () => {
  it("FoundingCard and the drawn previews have no file and no reader", () => {
    expect(existsSync(join(__dirname, "FoundingCard.tsx"))).toBe(false);
    const page = stripComments(readFileSync(join(__dirname, "WelcomePage.tsx"), "utf8"));
    for (const gone of ["FoundingCard", "Peek", "mk-wel-shot", "mui-row"]) expect(page, gone).not.toContain(gone);
    const css = stripComments(readFileSync(join(__dirname, "welcome.css"), "utf8"));
    for (const gone of ["mk-wel-card", "mk-wel-peek", "mk-wel-eyebrow", "mk-wel-chip", "JetBrains Mono"]) expect(css, gone).not.toContain(gone);
  });
});
