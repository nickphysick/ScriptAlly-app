/**
 * The transport, driven with `fetch` stubbed.
 *
 * ⚠️ NOTHING HERE REACHES THE NETWORK, AND THAT IS NOT A STYLE CHOICE. Dev sends from the REAL
 * verified `scriptally.ink` domain — there is one Resend account and no sandbox — so a test that
 * actually posted would be spending the reputation the founding invites depend on, on every CI run.
 * Every case below replaces `globalThis.fetch`.
 *
 * ⚠️ AND THE CLAIM THAT MATTERS IS THAT IT NEVER THROWS. The caller writes its document, tells the
 * reader they are in, and the mail either arrived or is a line in the log. Losing a founding place
 * because a provider hiccuped would be far worse than a confirmation that has to be resent — so
 * every failure mode is asserted to RESOLVE, not to reject.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { sendEmail, RenderedEmail } from "./email";

const RENDERED: RenderedEmail = { subject: "s", html: "<p>h</p>", text: "t" };
const ENV = { RESEND_API_KEY: "test-key", WAITLIST_REPLY_TO: "reply@example.com" };

/** A response object shaped like the one `fetch` returns, with only what the transport reads. */
const res = (status: number, body: unknown) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
}) as unknown as Response;

beforeEach(() => { process.env.RESEND_API_KEY = "test-key"; });
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("a send that works", () => {
  it("posts once and returns the provider's message id", async () => {
    const stub = vi.fn(async () => res(200, { id: "msg_123" }));
    vi.stubGlobal("fetch", stub);
    const out = await sendEmail("someone@example.com", "confirm", RENDERED, ENV);
    expect(out).toEqual({ ok: true, id: "msg_123" });
    expect(stub).toHaveBeenCalledTimes(1);
  });

  it("sends both parts, and a reply-to separate from the sender", async () => {
    const stub = vi.fn(async () => res(200, { id: "x" }));
    vi.stubGlobal("fetch", stub);
    await sendEmail("someone@example.com", "welcome", RENDERED, ENV);
    const body = JSON.parse(String((stub.mock.calls[0][1] as RequestInit).body));
    /* ⚠️ BOTH PARTS, ALWAYS. A message with no plain-text alternative scores worse with filters,
       is unreadable in a text-only client, and is what a screen reader gets when the HTML is
       hostile. */
    expect(body.html).toBe("<p>h</p>");
    expect(body.text).toBe("t");
    expect(body.reply_to).toBe("reply@example.com");
    expect(body.from).not.toBe(body.reply_to);
  });

  /** ⚠️ NO ADDRESS IN ANY LOG LINE — the recipient is hashed before it is written. */
  it("logs the send without the recipient's address", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => res(200, { id: "x" })));
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    await sendEmail("private@example.com", "confirm", RENDERED, ENV);
    const lines = info.mock.calls.map((c) => String(c[0])).join(" ");
    expect(lines).toContain("email.send");
    expect(lines, "the address must not reach a log").not.toContain("private@example.com");
    expect(lines).toMatch(/"toHash":"[0-9a-f]{16}"/);
  });
});

describe("a send that fails never throws, and never loses the signup", () => {
  /**
   * ⚠️ THE WHOLE POINT OF THE PHASE. The caller's document stands and the reader is told they are
   * in; the mail is a log line. Each of these would be an unhandled rejection in a naive
   * implementation, and each would have failed a request that had already written a document.
   */
  it("a 4xx from the provider resolves to an outcome", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => res(422, { message: "bad from-address" })));
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(sendEmail("a@b.com", "confirm", RENDERED, ENV)).resolves
      .toEqual({ ok: false, reason: "http-422" });
  });

  it("a network failure resolves to an outcome", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("ECONNREFUSED"); }));
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(sendEmail("a@b.com", "confirm", RENDERED, ENV)).resolves
      .toEqual({ ok: false, reason: "network" });
  });

  it("an unparseable body on a 2xx is still a success, without an id", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true, status: 200, json: async () => { throw new Error("not json"); },
    }) as unknown as Response));
    await expect(sendEmail("a@b.com", "confirm", RENDERED, ENV)).resolves.toEqual({ ok: true });
  });

  it("a missing key refuses without reaching the network", async () => {
    delete process.env.RESEND_API_KEY;
    const stub = vi.fn();
    vi.stubGlobal("fetch", stub);
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(sendEmail("a@b.com", "confirm", RENDERED, {})).resolves
      .toEqual({ ok: false, reason: "no-key" });
    expect(stub, "no request is made without a key").not.toHaveBeenCalled();
  });

  /** ⚠️ AND A FAILURE IS LOGGED AS AN ERROR, so a silent outage is impossible to mistake for calm. */
  it("every failure leaves a log line naming the template", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => res(500, {})));
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    await sendEmail("a@b.com", "welcome", RENDERED, ENV);
    expect(String(err.mock.calls[0][0])).toContain('"template":"welcome"');
  });
});

describe("the reply-to warning is emitted when it is unset", () => {
  /**
   * ⚠️ THE FALLBACK IS SILENT-BUT-LOGGED FOR A REASON. Unset, replies go to the from-address,
   * which is not currently delivering — and because the MX record was replaced by forwarding,
   * bounce feedback does not reach Resend either. Nobody would find out without this line.
   */
  it("warns, and still sends", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => res(200, { id: "x" })));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const out = await sendEmail("a@b.com", "confirm", RENDERED, { RESEND_API_KEY: "k" });
    expect(out.ok, "a missing reply route never stops a confirmation").toBe(true);
    expect(String(warn.mock.calls[0]?.[0])).toContain("email.config");
  });
});
