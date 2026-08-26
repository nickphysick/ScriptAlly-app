/**
 * emailConfig — pure locks, plus the one-transport rule.
 *
 * ⚠️ THESE RUN IN THE ROOT SUITE with no network and no emulator. Nothing here sends anything: the
 * transport is exercised with its `fetch` stubbed, and dev sends from the REAL verified domain, so
 * a test that actually posted would be spending the reputation the founding invites depend on.
 */

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  DEFAULT_FROM, FROM_ENV, PUBLIC_URL_ENV, REPLY_TO_ENV, SUPPORT_EMAIL,
  UNSUBSCRIBE_PATH, VERIFY_PATH,
  resolveMailConfig, replyToWarning, unsubscribeLink, verifyLink,
} from "./emailConfig";

const DEV = {
  [PUBLIC_URL_ENV]: "https://scriptally-dev.web.app",
  [REPLY_TO_ENV]: "someone@example.com",
};

describe("the sender is configurable, and its default is deliberate", () => {
  it("falls back to the house from-address when nothing is configured", () => {
    expect(resolveMailConfig({}).from).toBe(DEFAULT_FROM);
  });

  /**
   * ⚠️ "at", NOT "@". Some clients render a second `@` inside a display name as a second address,
   * which makes a genuine sender look forged — to a reader and to some filters.
   */
  it("the display name says `at`, and carries exactly one @", () => {
    expect(DEFAULT_FROM).toContain("Nick at ScriptAlly");
    expect(DEFAULT_FROM.split("@")).toHaveLength(2);
  });

  it("an environment can swap the sender without touching a template", () => {
    expect(resolveMailConfig({ [FROM_ENV]: "Sandbox <s@example.com>" }).from)
      .toBe("Sandbox <s@example.com>");
  });
});

describe("reply-to falls back rather than failing, and says so", () => {
  /**
   * ⚠️ NEVER THROW. A missing reply-to must not stop a confirmation going out — the signup is
   * worth more than the reply route. The cost of the fallback is that a reader's reply lands on an
   * address that is not currently delivering, which is what the warning exists to surface.
   */
  it("an unset reply-to becomes the from-address", () => {
    const cfg = resolveMailConfig({});
    expect(cfg.replyTo).toBe(cfg.from);
  });

  it("…and it is a warning, not an error, and it names the variable to set", () => {
    const w = replyToWarning({});
    expect(w).toBeTruthy();
    expect(w).toContain(REPLY_TO_ENV);
    expect(w).toContain("not currently delivering");
  });

  it("a configured reply-to is used and raises no warning", () => {
    expect(resolveMailConfig(DEV).replyTo).toBe("someone@example.com");
    expect(replyToWarning(DEV)).toBeNull();
  });

  it("whitespace is not a value", () => {
    const cfg = resolveMailConfig({ [REPLY_TO_ENV]: "   " });
    expect(cfg.replyTo).toBe(cfg.from);
    expect(replyToWarning({ [REPLY_TO_ENV]: "   " })).toBeTruthy();
  });
});

describe("links are built from a constant path and a configured origin", () => {
  /**
   * ⚠️ `new URL(path, origin)`, NOT CONCATENATION. Two configurable halves joined by hand are one
   * trailing slash away from a dead link — and a dead link in a hundred founding invites is not
   * discovered until it is expensive. Both origins below must produce the same address.
   */
  it("a trailing slash on the origin changes nothing", () => {
    const a = verifyLink(resolveMailConfig(DEV), "tok");
    const b = verifyLink(resolveMailConfig({ ...DEV, [PUBLIC_URL_ENV]: "https://scriptally-dev.web.app/" }), "tok");
    expect(a).toBe(b);
    expect(a).toBe("https://scriptally-dev.web.app/api/waitlist/verify?token=tok");
  });

  it("the unsubscribe link uses its own path and the same origin", () => {
    expect(unsubscribeLink(resolveMailConfig(DEV), "tok"))
      .toBe("https://scriptally-dev.web.app/api/waitlist/unsubscribe?token=tok");
  });

  it("the token is encoded, so a base64url token with padding survives", () => {
    const link = verifyLink(resolveMailConfig(DEV), "a+b/c=d&e");
    expect(link).toContain("token=");
    expect(new URL(link!).searchParams.get("token")).toBe("a+b/c=d&e");
  });

  /**
   * ⚠️ `null`, NEVER A RELATIVE STRING. Prod's env file is deliberately absent — exactly as it is
   * for the database id — so the function cannot name its own public host there. A relative URL in
   * a mail client resolves against nothing; the caller must refuse to send rather than post one.
   */
  it("no configured origin yields no link at all", () => {
    const cfg = resolveMailConfig({ [REPLY_TO_ENV]: "x@example.com" });
    expect(cfg.publicUrl).toBeNull();
    expect(verifyLink(cfg, "tok")).toBeNull();
    expect(unsubscribeLink(cfg, "tok")).toBeNull();
  });

  it("a malformed origin yields no link either", () => {
    expect(verifyLink(resolveMailConfig({ [PUBLIC_URL_ENV]: "not a url" }), "tok")).toBeNull();
  });

  it("and an empty token yields no link, rather than one that verifies nothing", () => {
    expect(verifyLink(resolveMailConfig(DEV), "")).toBeNull();
  });

  it("the paths are the function's own routes", () => {
    expect(VERIFY_PATH).toBe("/api/waitlist/verify");
    expect(UNSUBSCRIBE_PATH).toBe("/api/waitlist/unsubscribe");
  });
});

/* ══════════════ The one-transport rule ══════════════ */

describe("only the transport talks to Resend", () => {
  const dir = resolve(__dirname);
  const sources = readdirSync(dir).filter((f) => f.endsWith(".ts"));

  /**
   * ⚠️ A SCANNING LOCK ALWAYS MATCHES ITS OWN SEARCH TERMS, so the scanner is skipped BY NAME
   * rather than by loosening the pattern — loosening it would quietly loosen it for every real
   * offender too. The same shape `firestoreHandle.test.ts` uses for `admin.firestore()`.
   */
  const SCANNER = "emailConfig.test.ts";
  /** The one file permitted to name the provider. Its SIZE is asserted, so the set cannot erode. */
  const TRANSPORT = ["email.ts"];

  it("scans every source file (the sweep is not vacuous)", () => {
    expect(sources.length).toBeGreaterThan(10);
    expect(sources).toContain("email.ts");
  });

  it("no file but the transport names the Resend endpoint or its key", () => {
    const offenders = sources.filter((f) => {
      if (f === SCANNER || TRANSPORT.includes(f)) return false;
      const body = readFileSync(join(dir, f), "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
      return /api\.resend\.com|RESEND_API_KEY/.test(body);
    });
    expect(offenders, "a template must not call the provider directly").toEqual([]);
  });

  it("…and the exempt set is exactly one file", () => {
    expect(TRANSPORT).toHaveLength(1);
  });
});

describe("a reader can always see a way to reach a person", () => {
  /**
   * ⚠️ A VISIBLE ADDRESS IN THE BODY, not just a `Reply-To` header. A reader cannot see a header,
   * and replies to the from-address are currently diverted — so a writer who wants a human needs
   * something they can read and copy.
   */
  it("there is a support address, and it is not the diverted from-address", () => {
    expect(SUPPORT_EMAIL).toMatch(/^[^\s@]+@scriptally\.ink$/);
    expect(DEFAULT_FROM).not.toContain(SUPPORT_EMAIL);
  });
});
