/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Render smokes — the front door and the onboarding gate. Every account in the app passes through
 * these two, exactly once, with no way around them. See `src/test/pageSmoke.tsx` for the rationale.
 */
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderPage } from "../test/pageSmoke";

vi.mock("../lib/db", async () => (await import("../test/pageSmoke")).dbMock());
vi.mock("../lib/firebase", async () => (await import("../test/pageSmoke")).firebaseMock());
vi.mock("./toast/ToastProvider", async () => (await import("../test/pageSmoke")).toastMock());

import { Auth } from "./Auth";
import { Onboarding } from "./Onboarding";

describe("the front door renders in both modes", () => {
  /**
   * ⚠️ TWO MODES, ONE COMPONENT. The default is Create account (a founding-members acquisition
   * page); `#/login` / `#/signin` open the same component in sign-in mode. Smoking one leaves the
   * other's branch — different copy, different fields, different submit path — unrendered.
   */
  it("renders the create-account mode without throwing", () => {
    expect(() => renderPage(<Auth initialMode="signup" />, "/")).not.toThrow();
  });

  it("…and offers both ways in, so it is not an empty shell that merely did not crash", () => {
    const html = renderPage(<Auth initialMode="signup" />, "/");
    expect(html).toContain("Create account");
    expect(html).toContain("Sign in");
  });

  it("renders the sign-in mode without throwing", () => {
    expect(() => renderPage(<Auth initialMode="login" />, "/")).not.toThrow();
  });
});

describe("the onboarding gate renders", () => {
  it("renders without throwing", () => {
    expect(() => renderPage(<Onboarding onComplete={async () => {}} />, "/dashboard")).not.toThrow();
  });

  it("…and opens on its first screen — the branch question the whole flow routes on", () => {
    expect(renderPage(<Onboarding onComplete={async () => {}} />, "/dashboard"))
      .toContain("Where are you in your querying journey?");
  });
});
