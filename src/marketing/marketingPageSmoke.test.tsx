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
import { renderPage, noNavigate, SMOKE_USER, useSignedOutDb, restoreSmokeUser } from "../test/pageSmoke";

vi.mock("../lib/db", async () => (await import("../test/pageSmoke")).dbMock());
vi.mock("../lib/firebase", async () => (await import("../test/pageSmoke")).firebaseMock());
vi.mock("../components/toast/ToastProvider", async () => (await import("../test/pageSmoke")).toastMock());

import { Landing } from "./Landing";
import { MarketingShell } from "./MarketingShell";

/** The public marketing routes and a string each must actually render. */
const PUBLIC_ROUTES: [path: string, node: () => React.ReactElement, mustContain: string][] = [
  ["/", () => <Landing onNavigate={noNavigate} />, "Take control of your querying journey"],
  // TODO(phase-5): add ["/pricing", …] when the public pricing page returns.
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
