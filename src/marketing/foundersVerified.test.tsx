/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * /founders?verified=<kind> — what someone sees after clicking the link in their confirmation email.
 */
import { describe, expect, it, vi } from "vitest";
import React from "react";
import { readFileSync } from "fs";
import { join } from "path";
import { renderPage, noNavigate, stripComments } from "../test/pageSmoke";

vi.mock("../lib/db", async () => (await import("../test/pageSmoke")).dbMock());
vi.mock("../lib/firebase", async () => (await import("../test/pageSmoke")).firebaseMock());
vi.mock("../components/toast/ToastProvider", async () => (await import("../test/pageSmoke")).toastMock());

import { FoundersPage } from "./FoundersPage";
import { VERIFY_KINDS, VERIFY_STATES } from "./foundersVerifyCopy";
import { FOUNDERS_H1 } from "./foundersCopy";

/** Rendered text, tags stripped and the entities React escapes decoded, so copy compares exactly. */
const text = (html: string) =>
  html.replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/\s+/g, " ");
const render = (search: string) => renderPage(<FoundersPage onNavigate={noNavigate} />, `/founders${search}`);
/** The state's own region: everything inside `.mk-fwverify`, bounded by the art that follows it. */
const region = (html: string) => {
  const a = html.indexOf('class="mk-fwverify"');
  const b = html.indexOf('class="mk-fwart"');
  expect(a, "the state region is rendered").toBeGreaterThan(-1);
  expect(b, "the art follows it").toBeGreaterThan(a);
  return html.slice(a, b);
};

describe("V1 · each kind shows its own state; anything else is unknown; no parameter is today's page", () => {
  for (const kind of VERIFY_KINDS) {
    it(`?verified=${kind} → "${VERIFY_STATES[kind].headline}"`, () => {
      const html = render(`?verified=${kind}`);
      const t = text(region(html));
      expect(t).toContain(VERIFY_STATES[kind].chip);
      expect(t).toContain(VERIFY_STATES[kind].headline);
      expect(t).toContain(VERIFY_STATES[kind].body);
      expect(html).toContain(`data-verified="${kind}"`);
      expect(html).toContain('role="status"');
      /* The inline form is the real FoundingSignup under its own prefix, and only where the state asks. */
      expect(html.includes('id="mk-verify-email"'), `${kind} form`).toBe(VERIFY_STATES[kind].form);
    });
  }

  it("a junk value is unknown", () => {
    expect(render("?verified=hacked")).toContain('data-verified="unknown"');
    expect(render("?verified=")).toContain('data-verified="unknown"');
  });

  it("no parameter renders today's page, with its own form and no state", () => {
    const html = render("");
    expect(text(html)).toContain(FOUNDERS_H1);
    expect(html).toContain('id="mk-fw-email"');
    expect(html).not.toContain("mk-fwverify");
  });
});

describe("V2 · a state says nothing the redirect does not carry", () => {
  for (const kind of VERIFY_KINDS) {
    it(`${kind}: no position, no count`, () => {
      const t = text(region(render(`?verified=${kind}`)));
      expect(t).not.toMatch(/\d+\s+of\s/i);
      expect(t).not.toMatch(/\bplace\s+\d/i);
    });
  }
});

describe("V3 · every kind the verify handler can send has a state", () => {
  it("read from the functions, not from a list written here", () => {
    const handler = stripComments(readFileSync(join(process.cwd(), "functions/src/waitlist.ts"), "utf8"));
    const store = stripComments(readFileSync(join(process.cwd(), "functions/src/waitlistStore.ts"), "utf8"));
    /* The handler redirects with literal kinds (a missing token) and with `outcome.kind`, where the
       outcome is verifyWaitlist's. Both halves are read, so neither can grow alone. */
    expect(handler, "the handler redirects with the outcome's kind").toMatch(/\?verified=\$\{outcome\.kind\}/);
    const literal = [...handler.matchAll(/\?verified=([a-z]+)/g)].map((m) => m[1]);
    const typeStart = store.indexOf("export type VerifyOutcome");
    expect(typeStart, "verifyWaitlist's outcome type is found").toBeGreaterThan(-1);
    const typeBody = store.slice(typeStart, store.indexOf(";", store.indexOf("{ kind: \"unknown\" }", typeStart)) + 1);
    const outcome = [...typeBody.matchAll(/kind:\s*"([a-z]+)"/g)].map((m) => m[1]);
    const sent = new Set([...literal, ...outcome]);
    expect(sent.size, "a real population was read").toBeGreaterThanOrEqual(5);
    for (const k of sent) expect(VERIFY_KINDS as readonly string[], `"${k}" has no state`).toContain(k);
  });
});
