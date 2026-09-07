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
import { SettingsRail } from "./settings/SettingsRail";
import { SECTION_BANDS } from "./settings/sectionBands";

describe("/account renders", () => {
  const page = (section: (typeof ACCOUNT_ROUTES)[number]["id"] = "profile") => (
    <AccountSettings section={section} onNavigate={noNavigate} />
  );

  it("renders without throwing", () => {
    expect(() => renderPage(page(), ACCOUNT_DEFAULT_PATH)).not.toThrow();
  });

  /* ⚠️ RETARGETED, AND THE OLD FORM PROVED LESS THAN IT SAID (settings-mode pack, Phase 1). It
     looked for "Account settings" — which existed nowhere on this page except the RAIL's
     `aria-label="Account settings sections"`. So a check written to prove the page renders its own
     chrome was, in fact, reading one attribute of one child, and the moment that child moved into
     the shell it went red over a page that renders exactly as much as it did before.
     What is asserted now is the page's own chassis plus the section's own heading — both things
     this file draws, neither of which can move to another component without the page losing its
     content. */
  it("…and produces its own chrome, so it is not an empty shell that merely did not crash", () => {
    const html = renderPage(page(), ACCOUNT_DEFAULT_PATH);
    expect(html).toContain('class="acct-page');
    expect(html).toContain('class="acct-work"');
    expect(html).toContain(SECTION_BANDS.profile.name);
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
       The id is an exact attribute and cannot be escaped out from under the assertion.

       ⚠️ THE CLAIM IS SPLIT ACROSS TWO RENDERS NOW, AND IT IS THE SAME CLAIM (settings-mode pack,
       Phase 1). The tab and the panel used to be one component; the rail moved into the shell, so
       one render can no longer contain both halves. This half — "the panel says which section
       labels it" — is the page's; the other half — "that label exists, for all seven" — is
       asserted against a `SettingsRail` render below. Asserting only the page's half would pass on
       a build where the rail had stopped rendering the ids it points at, which is exactly the
       dangling reference the pair exists to forbid. */
    it(`${r.path}'s panel is labelled by its rail tab`, () => {
      expect(renderPage(page(r.id), r.path)).toContain(`aria-labelledby="acct-tab-${r.id}"`);
    });
  }
});

/**
 * The rail's half of the pair above — it lives in the SHELL now, so it is its own render.
 *
 * ⚠️ IT ASSERTS THE SEVEN ids THE PAGE POINTS AT, which is what makes the split honest: the page
 * says `aria-labelledby="acct-tab-<id>"` and this says the element with that id exists. Either
 * assertion alone is satisfied by a dangling reference.
 */
describe("the settings rail carries the ids the panel labels itself with", () => {
  const rail = (active: (typeof ACCOUNT_ROUTES)[number]["id"] | null = "profile") =>
    renderPage(
      <SettingsRail active={active} live onSelect={() => {}} onExit={() => {}} plan="free" />,
      ACCOUNT_DEFAULT_PATH,
    );

  for (const r of ACCOUNT_ROUTES) {
    it(`${r.id} has its tab`, () => {
      expect(rail()).toContain(`id="acct-tab-${r.id}"`);
    });
  }

  /* ⚠️ EXACTLY ONE TAB IS SELECTED, and it is the one the route names. A rail that selected none
     would still carry all seven ids and pass every assertion above it. */
  it("exactly one tab is selected, and it is the active section", () => {
    const html = rail("security");
    expect((html.match(/aria-selected="true"/g) ?? []).length).toBe(1);
    const at = html.indexOf('id="acct-tab-security"');
    expect(at).toBeGreaterThan(-1);
    expect(html.slice(at, html.indexOf(">", at))).toContain('aria-selected="true"');
  });

  /* ⚠️ OFF THE MODE IT CONTROLS NOTHING. `acct-panel` only exists while the page is mounted, so a
     rail rendered on any other route must not claim to control it — a reference to an element that
     is not in the document. */
  it("⚠️ `aria-controls` is absent when the mode is off, and the layer is hidden from AT", () => {
    const off = renderPage(
      <SettingsRail active={null} live={false} onSelect={() => {}} onExit={() => {}} plan="free" />,
      "/dashboard",
    );
    expect(off).not.toContain("aria-controls");
    expect(off).toContain('aria-hidden="true"');
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
