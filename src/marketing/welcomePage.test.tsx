/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * /welcome — the founding welcome a confirmation link lands on (founding-welcome, Part C).
 *
 * These read the rendered markup of `WelcomeView` with stubbed data, so a state can be drawn with a
 * number without a server. That the address is cleaned and the card holds still while the number
 * arrives are measured on a real page (tests/e2e/foundingWelcome.measure.ts).
 */
import { describe, expect, it, vi } from "vitest";
import React from "react";
import { readFileSync } from "fs";
import { join } from "path";
import { renderPage, noNavigate, stripComments } from "../test/pageSmoke";

vi.mock("../lib/db", async () => (await import("../test/pageSmoke")).dbMock());
vi.mock("../lib/firebase", async () => (await import("../test/pageSmoke")).firebaseMock());
vi.mock("../components/toast/ToastProvider", async () => (await import("../test/pageSmoke")).toastMock());

import { WelcomeView, WelcomePage } from "./WelcomePage";
import { FoundersPage } from "./FoundersPage";
import { FOUNDERS_H1 } from "./foundersCopy";
import {
  WELCOME_KINDS, type WelcomeKind, type WelcomeData, stateCopy, parseWelcomeKind, canSend,
  ordinal, ordinalWord, padNumber, PERKS, TAPS_SEND, FOUNDER_INITIAL,
} from "./welcomeCopy";

const text = (html: string) =>
  html.replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/\s+/g, " ");

const DATA: Record<WelcomeKind, WelcomeData | null> = {
  verified: { foundingNumber: 23, confirmedOn: "2026-10-18" },
  already: { foundingNumber: 23, confirmedOn: "2026-10-18" },
  waiting: { reserveNumber: 1, confirmedOn: "2026-10-18" },
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

describe("W1 · each state draws its own headline", () => {
  for (const kind of WELCOME_KINDS) {
    it(kind, () => {
      const html = view(kind);
      const copy = stateCopy(kind, DATA[kind] ?? {});
      expect(html).toContain(`data-welcome="${kind}"`);
      expect(text(html)).toContain(copy.headline);
      expect(text(html)).toContain(copy.chip);
      /* Exactly one h1, and it is the state's. */
      expect(html.match(/<h1\b/g)?.length).toBe(1);
    });
  }
  it("v outside the five, or missing, is unknown", () => {
    expect(parseWelcomeKind("hacked")).toBe("unknown");
    expect(parseWelcomeKind("")).toBe("unknown");
    expect(parseWelcomeKind(null)).toBe("unknown");
  });
  it("the reserve headline names the writer's own stored place, or none", () => {
    expect(stateCopy("waiting", { reserveNumber: 1 }).headline).toBe("So close. You're first reserve.");
    expect(stateCopy("waiting", { reserveNumber: 12 }).headline).toBe("So close. You're 12th reserve.");
    expect(stateCopy("waiting", {}).headline).toBe("So close. You're on the reserve list.");
  });
});

describe("W2 · the card states the stored number and nothing about the person", () => {
  it("verified: 023 on the card, of 100, the confirmed date, and no address", () => {
    const html = view("verified");
    expect(html).toContain('data-probe="card-number">023<');
    expect(text(html)).toContain("of 100");
    expect(text(html)).toContain("18 October 2026");
    expect(html, "no email address anywhere on the page").not.toMatch(/@[a-z0-9-]+\./i);
    expect(text(html)).toContain("Founding Writer No. 23");
  });
  it("waiting: the reserve card, with the reserve place as an ordinal", () => {
    const html = view("waiting");
    expect(html).toContain('data-card="reserve"');
    expect(html).toContain('data-probe="card-number">1st<');
  });
  it("no number in the data → a dash, never an invented one", () => {
    const html = view("verified", { data: { confirmedOn: "2026-10-18" } });
    expect(html).toContain('data-probe="card-number">—<');
  });
  it("loading: the same card with an empty number slot, so it does not move when the number lands", () => {
    const html = view("verified", { data: null, loading: true });
    expect(html).toMatch(/class="mk-wel-card mk-wel-card--founding mk-wel-cardin is-loading"/);
    expect(html).toContain('data-probe="card-number">\u00a0<');
  });
  it("the formatters", () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 101].map(ordinal)).toEqual(
      ["1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd", "23rd", "101st"]);
    expect(ordinalWord(3)).toBe("third");
    expect(ordinalWord(11)).toBe("11th");
    expect(padNumber(7)).toBe("007");
    expect(padNumber(100)).toBe("100");
  });
});

describe("W3 · the three taps", () => {
  it("Send is disabled until all three are answered", () => {
    const html = view("verified");
    const btn = html.match(/<button[^>]*>Send to Nick<\/button>/)?.[0] ?? "";
    expect(btn, "the button is rendered").toContain(TAPS_SEND);
    expect(btn).toMatch(/\bdisabled=""/);
    expect(canSend({})).toBe(false);
    expect(canSend({ stage: "getting-ready", queried: "none" })).toBe(false);
    expect(canSend({ stage: "getting-ready", queried: "none", tracker: "notebook" })).toBe(true);
    expect(canSend({ stage: "getting-ready", queried: "none", tracker: "made-up" })).toBe(false);
  });
  it("no reference → no taps (there is nowhere to send them)", () => {
    expect(view("verified", { ref: null })).not.toContain(TAPS_SEND);
  });
  it("the failure line is the pack's words", () => {
    const src = readFileSync(join(__dirname, "welcomeCopy.ts"), "utf8");
    expect(src).toContain('"That didn\'t send — try again"');
  });
});

describe("W4 · what each state leaves out", () => {
  for (const kind of ["expired", "unknown"] as const) {
    it(`${kind}: the hero only, a ghost card, and a sign-up form of its own`, () => {
      const html = view(kind);
      expect(html).toContain('data-card="ghost"');
      expect(html).toContain('id="mk-welcome-email"');
      for (const cls of ["mk-wel-note", "mk-wel-steps", "mk-wel-peek", "mk-wel-two", "mk-wel-close"])
        expect(html, cls).not.toContain(`class="${cls}`);
    });
  }
  it("waiting hides the perks; verified shows all three", () => {
    const w = text(view("waiting"));
    const v = text(view("verified"));
    for (const p of PERKS) {
      expect(w).not.toContain(p);
      expect(v).toContain(p);
    }
  });
  it("no 'Log in', no price, no 'Save as image' in any state", () => {
    for (const kind of WELCOME_KINDS) {
      const t = text(view(kind));
      expect(t, kind).not.toMatch(/log in/i);
      expect(t, kind).not.toMatch(/[£$€]\s?\d/);
      expect(t, kind).not.toMatch(/save as image/i);
    }
  });
  it("no date on the page except the one the writer confirmed on", () => {
    const months = /\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/g;
    for (const kind of WELCOME_KINDS) {
      const found = new Set(text(view(kind)).match(months) ?? []);
      found.delete("October"); found.delete("Oct");
      expect([...found], kind).toEqual([]);
    }
  });
  it("the photo slot shows the initial while FOUNDER_PHOTO is unset", () => {
    expect(view("verified")).toContain(`<span aria-hidden="true">${FOUNDER_INITIAL}</span>`);
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
  it("the old state block, its copy file and its rules are gone", () => {
    const src = stripComments(readFileSync(join(__dirname, "FoundersPage.tsx"), "utf8"));
    expect(src).toContain("/welcome?v=");
    expect(src).not.toContain("VerifyState");
    expect(src).not.toContain("foundersVerifyCopy");
    const css = stripComments(readFileSync(join(__dirname, "marketing.css"), "utf8"));
    for (const cls of ["mk-fwchip", "mk-fwvh", "mk-fwvform", "mk-fwverify"]) expect(css, cls).not.toContain(cls);
  });
  it("the page itself renders from its URL", () => {
    expect(text(renderPage(<WelcomePage onNavigate={noNavigate} />, "/welcome?v=expired"))).toContain("That link's 48 hours are up.");
  });
});
