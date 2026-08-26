/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The three guards, proved to fire.
 *
 * ⚠️ THEY WERE BUILT SERVER-SIDE AND DORMANT FOR A WHOLE PASS, because the client sent
 * `{ email }` and nothing else. `judgeJoin` treats an absent trap and an absent timer as a pass —
 * correctly, so that an older client keeps working — which means "nothing sent" and "nothing
 * suspicious" were indistinguishable. Every assertion here exists to stop them becoming
 * decorative again.
 *
 * ⚠️ AND THE BODY'S SHAPE IS LOCKED. Nothing pinned it before, so the next person could add a
 * field the server silently ignores or drop one it silently tolerates — both fail invisibly, which
 * is precisely how these three came to be dormant in the first place.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import React from "react";

/* ⚠️ THE SAME MOCKS THE MARKETING SMOKE USES, AND THEY ARE NOT OPTIONAL. `/founders` reaches the
   shared footer, which transitively imports Firebase — without these the whole file fails to LOAD
   with `auth/invalid-api-key` and reports "no tests", which reads as a pass in a summary. */
vi.mock("../lib/db", async () => (await import("../test/pageSmoke")).dbMock());
vi.mock("../lib/firebase", async () => (await import("../test/pageSmoke")).firebaseMock());
vi.mock("../components/toast/ToastProvider", async () => (await import("../test/pageSmoke")).toastMock());

import { renderPage } from "../test/pageSmoke";
import { joinWaitlist, WAITLIST_HONEYPOT_FIELD, WAITLIST_ENDPOINT, WaitlistSource } from "./waitlist";
import { FoundingPanel } from "./FoundingPanel";
import { FoundingBand } from "./FoundingBand";
import { FoundersPage } from "./FoundersPage";

const here = dirname(fileURLToPath(import.meta.url));
const src = (f: string) => readFileSync(resolve(here, f), "utf8");
/** ⚠️ Comments first — this repo's prose quotes the very tokens these locks forbid or require. */
const decls = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

const noNavigate = () => {};

/* ══════════════ 1 · What actually goes on the wire ══════════════ */

/** Captures one POST body by standing in for `fetch`. */
const captureBody = async (fields: Parameters<typeof joinWaitlist>[0]) => {
  let seen: { url: unknown; init: RequestInit } | null = null;
  const stub = vi.fn(async (url: unknown, init: RequestInit) => {
    seen = { url, init };
    return {
      ok: true,
      status: 200,
      headers: { get: (h: string) => (h.toLowerCase() === "content-type" ? "application/json" : null) },
      json: async () => ({ ok: true, visible: true, count: 5, cap: 100 }),
    } as unknown as Response;
  });
  vi.stubGlobal("fetch", stub);
  await joinWaitlist(fields);
  expect(seen, "the request was made").toBeTruthy();
  return {
    url: seen!.url,
    body: JSON.parse(String(seen!.init.body)) as Record<string, unknown>,
    headers: seen!.init.headers as Record<string, string>,
  };
};

afterEach(() => { vi.unstubAllGlobals(); });

describe("the request body carries exactly four fields", () => {
  const fields = {
    email: "nick@example.com", trap: "", elapsedMs: 4200, source: "landing-panel" as WaitlistSource,
  };

  /**
   * ⚠️ EXACTLY — not "at least". A field the server does not read is dead weight that looks live,
   * and a field it reads that we stopped sending turns a guard off silently. Both are the fault
   * this pass exists to repair, so the claim is the SET.
   */
  it("email, website, elapsedMs, source — no more and no fewer", async () => {
    const { body } = await captureBody(fields);
    expect(Object.keys(body).sort()).toEqual(["elapsedMs", "email", "source", "website"]);
  });

  it("the honeypot travels under the name the server reads", async () => {
    const { body } = await captureBody({ ...fields, trap: "http://spam.example" });
    expect(WAITLIST_HONEYPOT_FIELD).toBe("website");
    expect(body[WAITLIST_HONEYPOT_FIELD]).toBe("http://spam.example");
  });

  it("an empty honeypot is still sent, rather than omitted", async () => {
    const { body } = await captureBody(fields);
    expect(body.website).toBe("");
    expect("website" in body, "omitting it would be indistinguishable from an older client").toBe(true);
  });

  it("the timer is a number of milliseconds, and the source is the mount's own", async () => {
    const { body } = await captureBody({ ...fields, elapsedMs: 913, source: "sealed-band" });
    expect(body.elapsedMs).toBe(913);
    expect(body.source).toBe("sealed-band");
  });

  it("…and it still posts JSON to the same endpoint", async () => {
    const { url, headers } = await captureBody(fields);
    expect(url).toBe(WAITLIST_ENDPOINT);
    expect(headers["Content-Type"]).toBe("application/json");
  });
});

/* ══════════════ 2 · The honeypot is rendered, and is unreachable by a person ══════════════ */

const pages: Array<[string, () => string, number]> = [
  ["the landing panel", () => renderPage(React.createElement(FoundingPanel, { onNavigate: noNavigate }), "/"), 1],
  ["the sealed band", () => renderPage(React.createElement(FoundingBand, { onNavigate: noNavigate }), "/"), 1],
  /* ⚠️ TWO — `/founders` renders the hero's form and the sealed band's on one document. */
  ["/founders", () => renderPage(React.createElement(FoundersPage, { onNavigate: noNavigate }), "/founders"), 2],
];

describe("every mount renders the trap, and no person can reach it", () => {
  for (const [name, render, count] of pages) {
    it(`${name} carries ${count} trap field(s), off-screen and out of the tab order`, () => {
      const html = render();
      const traps = [...html.matchAll(/<div class="mk-trap"[^>]*>([\s\S]*?)<\/div>/g)];
      expect(traps.length, `${name} renders ${count}`).toBe(count);
      for (const [whole, inner] of traps) {
        /* ⚠️ OUT OF THE ACCESSIBILITY TREE. A honeypot that traps screen-reader users is worse
           than no honeypot: they cannot see the instruction not to fill it, and the cost of
           getting it wrong is a silent rejection they never learn about. */
        expect(whole, "the wrapper is aria-hidden").toContain('aria-hidden="true"');
        expect(inner, "the field is out of the tab order").toContain('tabindex="-1"');
        /* ⚠️ CASE-INSENSITIVE, AND THE REASON IS WORTH KNOWING. React 19 emits this one verbatim
           as `autoComplete="off"` rather than lowercasing it. HTML attribute names are
           case-insensitive so the browser is unaffected, but a lock written to the lowercase form
           fails on correct markup — which is what it did. */
        expect(inner, "no autofill").toMatch(/autocomplete="off"/i);
        expect(inner, "named as the server expects").toContain(`name="${WAITLIST_HONEYPOT_FIELD}"`);
        expect(inner, "a text input, so a bot filling `website` reaches it").toContain('type="text"');
      }
    });
  }

  /**
   * ⚠️ OFF-SCREEN, NEVER `display: none` OR `hidden`. Both are trivially detected and skipped by
   * anything competent; a positioned field gets filled. `.mk-trap` is the contact form's rule,
   * reused rather than reinvented — one base rule, asserted here so a tidy-up cannot turn it into
   * a display toggle.
   */
  it("the trap is hidden by position, not by display", () => {
    const css = decls(readFileSync(resolve(here, "marketing.css"), "utf8"));
    const rules = [...css.matchAll(/(?:^|\n)\s*\.mk-trap\s*\{([^}]*)\}/g)];
    expect(rules.length, "one base rule for .mk-trap").toBe(1);
    const body = rules[0][1];
    expect(body).toMatch(/position:\s*absolute/);
    expect(body).toMatch(/left:\s*-\d{4}/);
    expect(body).not.toMatch(/display:\s*none/);
  });

  /** Nothing visible changed — the forms still show one field and one button. */
  it("and no visible field was added: still one email input per form", () => {
    const html = renderPage(React.createElement(FoundersPage, { onNavigate: noNavigate }), "/founders");
    expect([...html.matchAll(/<input[^>]*type="email"/g)]).toHaveLength(2);
  });
});

/* ══════════════ 3 · Each mount names its own surface ══════════════ */

describe("the three surfaces identify themselves, and never by inference", () => {
  const MOUNTS: Array<[string, string, WaitlistSource]> = [
    ["FoundingPanel.tsx", "mk-panel", "landing-panel"],
    ["FoundersPage.tsx", "mk-fw", "founders-hero"],
    ["FoundingBand.tsx", "mk-band", "sealed-band"],
  ];

  it("each mount passes its own literal", () => {
    for (const [file, , source] of MOUNTS) {
      expect(decls(src(file)), `${file} names its surface`).toContain(`source="${source}"`);
    }
    expect(new Set(MOUNTS.map(([, , s]) => s)).size, "three distinct values").toBe(3);
  });

  /**
   * ⚠️ NOT DERIVED FROM `idPrefix`, AND THIS IS THE ASSERTION THAT SAYS SO. The two happen to be
   * one value per mount today; `idPrefix` exists to keep DOM ids unique, so the day somebody
   * renames one for a DOM reason the analytics would quietly start lying with nothing to catch it.
   */
  it("…and `source` is never computed from `idPrefix`", () => {
    const signup = decls(src("FoundingSignup.tsx"));
    expect(signup).not.toMatch(/source\s*=\s*[^;]*idPrefix/);
    expect(signup, "it arrives as a prop").toMatch(/source: WaitlistSource/);
  });

  /** It cannot come from the URL either: the band renders on two different pages. */
  it("…nor from the location", () => {
    for (const file of ["FoundingSignup.tsx", "waitlist.ts", "foundingStore.ts"]) {
      expect(decls(src(file)), file).not.toMatch(/location\.(pathname|href)/);
    }
  });
});

/* ══════════════ 4 · The silent branches are silent ══════════════ */

describe("a caught bot cannot tell it was caught", () => {
  const handler = decls(readFileSync(resolve(here, "../../functions/src/waitlist.ts"), "utf8"));

  /**
   * ⚠️ BOTH ANCHORS ARE ASSERTED BEFORE THE SLICE, AND MY FIRST VERSION IS WHY. It keyed the end
   * of the slice on a phrase that lives in a COMMENT — and `decls()` strips comments, so
   * `indexOf` returned -1, the slice ran to the end of the file, and the assertion "this branch
   * sends no `error:`" was reading the 405 and 500 handlers at the bottom. A bounded slice whose
   * anchor is missing does not fail; it silently widens.
   */
  const silentBranch = () => {
    const from = handler.indexOf('verdict.kind === "honeypot"');
    const to = handler.indexOf("if (hashedIp)", from);
    expect(from, "the guard branch is present").toBeGreaterThan(-1);
    expect(to, "the rate limit follows it").toBeGreaterThan(from);
    return handler.slice(from, to);
  };

  /**
   * ⚠️ THE SAME SHAPE AS A REAL SUCCESS. `{ ok: true, ...countPayload(counter) }` is what an
   * ordinary join returns too, so the response body carries no signal about which check fired.
   * Telling a bot it failed teaches it which field to leave alone next time.
   */
  it("the honeypot and too-fast branches answer with the success shape", () => {
    const branch = silentBranch();
    expect(branch, "the branch exists").toContain("res.status(200)");
    expect(branch).toContain("ok: true");
    expect(branch).toContain("countPayload(counter)");
    /* No hint of which guard fired reaches the caller. */
    expect(branch).not.toContain('error:');
    expect(branch).not.toMatch(/res\.status\((4|5)\d\d\)/);
  });

  /** ⚠️ AND IT WRITES NOTHING — the branch returns before the join transaction is ever reached. */
  it("…and it returns before anything is written", () => {
    const guardAt = handler.indexOf('verdict.kind === "honeypot"');
    const joinAt = handler.indexOf("await joinWaitlist(db");
    expect(guardAt, "the guard is present").toBeGreaterThan(-1);
    expect(joinAt, "the write is present").toBeGreaterThan(-1);
    expect(guardAt, "the guard is checked first").toBeLessThan(joinAt);
    const between = handler.slice(guardAt, joinAt);
    expect(between, "the guard returns rather than falling through").toContain("return;");
  });

  /**
   * ⚠️ THE ONLY TRACE A SILENT GUARD LEAVES. Both branches answer `ok` and write nothing, so
   * without a log there is no way to know whether they catch bots or customers — and the timing
   * guard's false positive is a real writer who believes they hold a founding place and does not.
   */
  it("but it is logged, with enough to diagnose and no address", () => {
    const branch = silentBranch();
    expect(branch).toContain("waitlist.silent_reject");
    for (const field of ["guard", "source", "ipHash", "elapsedMs", "thresholdMs"]) {
      expect(branch, `the log carries ${field}`).toContain(field);
    }
    /* ⚠️ NO ADDRESS, hashed or otherwise. Logs are read by more people, kept in more places and
       retained on someone else's schedule than a Firestore document is. */
    expect(branch, "no address in a log line").not.toMatch(/\bemail\b/);
  });
});
