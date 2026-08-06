/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Render smokes — the account/plans/help routes. These three are back in the capsule shell
 * (capsule fixes P5 retired the focus tier). See `src/test/pageSmoke.tsx` for the rationale.
 */
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderPage, renderPageSeeded, noNavigate } from "../test/pageSmoke";

vi.mock("../lib/db", async () => (await import("../test/pageSmoke")).dbMock());
vi.mock("../lib/firebase", async () => (await import("../test/pageSmoke")).firebaseMock());
vi.mock("./toast/ToastProvider", async () => (await import("../test/pageSmoke")).toastMock());

import { AccountSettings } from "./AccountSettings";
import { PlansPage } from "./PlansPage";
import { HelpCentre } from "./HelpCentre";

describe("/account renders", () => {
  const page = () => <AccountSettings onNavigate={noNavigate} />;

  it("renders without throwing", () => {
    expect(() => renderPage(page(), "/account")).not.toThrow();
  });

  it("…and produces its own chrome, so it is not an empty shell that merely did not crash", () => {
    expect(renderPage(page(), "/account")).toContain("Account settings");
  });

  /** The usage/limits panels read the record counts, so the populated path is its own render. */
  it("renders without throwing with records on file", () => {
    expect(() => renderPageSeeded(page(), "/account")).not.toThrow();
  });
});

describe("/plans renders", () => {
  it("renders without throwing", () => {
    expect(() => renderPage(<PlansPage />, "/plans")).not.toThrow();
  });

  it("…and produces its own chrome", () => {
    expect(renderPage(<PlansPage />, "/plans")).toContain("Choose your plan");
  });
});

describe("/help renders", () => {
  it("renders without throwing", () => {
    expect(() => renderPage(<HelpCentre />, "/help")).not.toThrow();
  });

  it("…and produces its own chrome", () => {
    expect(renderPage(<HelpCentre />, "/help")).toContain("Help Centre");
  });
});
