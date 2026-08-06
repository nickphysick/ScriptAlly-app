/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Render smokes — the marketing tier. These two routes are PUBLIC: a crash here is the only one
 * in the app a logged-out stranger can meet. See `src/test/pageSmoke.tsx` for the rationale.
 */
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderPage, noNavigate, SMOKE_USER } from "../test/pageSmoke";

vi.mock("../lib/db", async () => (await import("../test/pageSmoke")).dbMock());
vi.mock("../lib/firebase", async () => (await import("../test/pageSmoke")).firebaseMock());
vi.mock("../components/toast/ToastProvider", async () => (await import("../test/pageSmoke")).toastMock());

import { Landing } from "./Landing";
import { MarketingShell } from "./MarketingShell";
import { Pricing } from "../components/Pricing";

describe("/ (the landing) renders", () => {
  it("renders without throwing", () => {
    expect(() => renderPage(<Landing onNavigate={noNavigate} />, "/")).not.toThrow();
  });

  it("…and produces its own chrome, so it is not an empty shell that merely did not crash", () => {
    const html = renderPage(<Landing onNavigate={noNavigate} />, "/");
    expect(html).toContain("Take control of your querying journey"); // the hero
  });
});

describe("/pricing renders", () => {
  it("renders without throwing", () => {
    expect(() => renderPage(<Pricing />, "/pricing")).not.toThrow();
  });

  it("…and produces its own chrome", () => {
    expect(renderPage(<Pricing />, "/pricing")).toContain("Select your querying setup");
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
});
