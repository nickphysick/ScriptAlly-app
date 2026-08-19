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
import { ACCOUNT_ROUTES, ACCOUNT_DEFAULT_PATH } from "../lib/accountRoutes";

describe("/account renders", () => {
  const page = (section: (typeof ACCOUNT_ROUTES)[number]["id"] = "profile") => (
    <AccountSettings section={section} onNavigate={noNavigate} />
  );

  it("renders without throwing", () => {
    expect(() => renderPage(page(), ACCOUNT_DEFAULT_PATH)).not.toThrow();
  });

  it("…and produces its own chrome, so it is not an empty shell that merely did not crash", () => {
    expect(renderPage(page(), ACCOUNT_DEFAULT_PATH)).toContain("Account settings");
  });

  /** The usage/limits panels read the record counts, so the populated path is its own render. */
  it("renders without throwing with records on file", () => {
    expect(() => renderPageSeeded(page(), ACCOUNT_DEFAULT_PATH)).not.toThrow();
  });

  /* ⚠️ EVERY SECTION IS ITS OWN ROUTE NOW, so every section is its own render. Before this, one
     smoke over the default section covered a page where six-sevenths of the content was reachable
     only by clicking — a crash in Notifications would have shipped green. */
  for (const r of ACCOUNT_ROUTES) {
    it(`${r.path} renders, empty and populated`, () => {
      expect(() => renderPage(page(r.id), r.path)).not.toThrow();
      expect(() => renderPageSeeded(page(r.id), r.path)).not.toThrow();
    });

    /* ⚠️ ASSERTED ON THE TAB'S id, NOT ITS LABEL. `renderToStaticMarkup` escapes the markup, so
       "Sign-in & security" arrives as "Sign-in &amp; security" and a label check goes red on a
       correct page — a false red the two ampersand-bearing sections would have carried for good.
       The id is an exact attribute and cannot be escaped out from under the assertion. */
    it(`${r.path} renders its rail tab, so the section is reachable from it`, () => {
      const html = renderPage(page(r.id), r.path);
      expect(html).toContain(`id="acct-tab-${r.id}"`);
      expect(html).toContain(`aria-labelledby="acct-tab-${r.id}"`); // the panel shown IS this section
    });
  }
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
