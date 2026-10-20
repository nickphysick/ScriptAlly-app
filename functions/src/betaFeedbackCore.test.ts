/**
 * Help system v1 — HS1 E3 and E4, the feedback callable's core, with its two effects stubbed. Nothing reaches the network
 * or Firestore.
 *
 *   E3  stored AND emailed: To feedback@queryhawk.net (or FEEDBACK_TO), the subject's shape, Reply-To = the token's email
 *       only when a reply is wanted; and when the email fails the document is still written, marked `emailed: false`,
 *       and the call resolves ok. (Mutation: await the email before the write and rethrow.)
 *   E4  the uid and the email come from the verified token: a body carrying `uid` or `email` changes nothing stored, and
 *       a screenshot path under another uid is refused. (Mutation: spread `request.data` into the record.)
 */
import { describe, expect, it, vi } from "vitest";
import { FEEDBACK_TO_DEFAULT, FeedbackError, feedbackRecord, feedbackSubject, handleFeedback, type FeedbackDeps, type FeedbackRecord } from "./betaFeedbackCore";

const AUTH = { uid: "u-1", email: "writer@example.com", emailVerified: true };
const BODY = { kind: "Something's broken", severity: "Slowing me down", message: "The list jumped when I pinned it and I lost my place.", pageName: "Contact list", route: "/agents", viewport: "1512 × 900", browser: "Mozilla/5.0", browserName: "Chrome 154 on a Mac", appVersion: "Beta, 19 Oct" };

function deps(over: Partial<FeedbackDeps> = {}) {
  const order: string[] = [];
  const written: FeedbackRecord[] = [];
  const marks: { id: string; patch: unknown }[] = [];
  const sends: { to: string; subject: string; text: string; from?: string; replyTo?: string | null }[] = [];
  const d: FeedbackDeps = {
    write: async (r) => { order.push("write"); written.push(r); return "doc-1"; },
    mark: async (id, patch) => { order.push("mark"); marks.push({ id, patch }); },
    send: async (to, rendered, o) => { order.push("send"); sends.push({ to, subject: rendered.subject, text: rendered.text, from: o.from, replyTo: o.replyTo }); return { ok: true, id: "m1" }; },
    env: {},
    projectId: "scriptally-dev",
    ...over,
  };
  return { d, order, written, marks, sends };
}

describe("HS1 E3 · stored and emailed", () => {
  it("writes first, then emails feedback@queryhawk.net from feedback@, Reply-To the token email when a reply is wanted", async () => {
    const t = deps();
    const out = await handleFeedback({ ...BODY, wantsReply: true }, AUTH, t.d);
    expect(out.ok).toBe(true);
    expect(t.order).toEqual(["write", "send", "mark"]);
    expect(t.sends).toHaveLength(1);
    expect(t.sends[0].to).toBe(FEEDBACK_TO_DEFAULT);
    expect(t.sends[0].to).toBe("feedback@queryhawk.net");
    expect(t.sends[0].from).toBe("QueryHawk feedback <feedback@queryhawk.net>");
    expect(t.sends[0].replyTo).toBe("writer@example.com");
    expect(t.sends[0].subject).toBe("[Something's broken · Slowing me down] Contact list: The list jumped when I pinned it and I lost my place.");
    expect(t.sends[0].text).toContain("Firestore doc: betaFeedback/doc-1");
    expect(t.marks).toEqual([{ id: "doc-1", patch: { emailed: true } }]);
  });

  it("no reply wanted: no Reply-To, and no email stored", async () => {
    const t = deps();
    await handleFeedback({ ...BODY, wantsReply: false }, AUTH, t.d);
    expect(t.sends[0].replyTo).toBeNull();
    expect(t.written[0].email).toBeUndefined();
    expect(t.sends[0].text).not.toContain("writer@example.com");
  });

  it("FEEDBACK_TO and FEEDBACK_FROM override the defaults", async () => {
    const t = deps({ env: { FEEDBACK_TO: "nick@queryhawk.net", FEEDBACK_FROM: "QH <x@queryhawk.net>" } });
    await handleFeedback(BODY, AUTH, t.d);
    expect(t.sends[0].to).toBe("nick@queryhawk.net");
    expect(t.sends[0].from).toBe("QH <x@queryhawk.net>");
  });

  it("the subject is [kind] page: the first 60 characters (severity only on a broken thing)", () => {
    const long = "x".repeat(80);
    expect(feedbackSubject({ kind: "An idea", severity: "", pageName: "Query Centre", message: long })).toBe(`[An idea] Query Centre: ${"x".repeat(60)}…`);
    const r = feedbackRecord({ ...BODY, kind: "An idea" }, AUTH);
    expect(r.severity).toBe("");
  });

  it("an email that fails (resolves not ok) still leaves the document, marked emailed: false, and the call ok", async () => {
    const t = deps({ send: async () => ({ ok: false, reason: "http-500" }) });
    const out = await handleFeedback(BODY, AUTH, t.d);
    expect(out).toEqual({ ok: true, id: "doc-1", emailed: false });
    expect(t.written).toHaveLength(1);
    expect(t.marks).toEqual([{ id: "doc-1", patch: { emailed: false, emailError: "http-500" } }]);
  });

  it("an email that throws still leaves the document, and the call resolves ok", async () => {
    const t = deps({ send: async () => { throw new Error("socket hang up"); } });
    const out = await handleFeedback(BODY, AUTH, t.d);
    expect(out.ok).toBe(true);
    expect(t.order[0]).toBe("write");
    expect(t.marks[0].patch).toEqual({ emailed: false, emailError: "socket hang up" });
  });

  it("a write that fails fails the call, and nothing is emailed", async () => {
    const send = vi.fn();
    const t = deps({ write: async () => { throw new Error("denied"); }, send });
    await expect(handleFeedback(BODY, AUTH, t.d)).rejects.toThrow("denied");
    expect(send).not.toHaveBeenCalled();
  });
});

describe("HS1 E4 · the uid and the email are the token's", () => {
  it("a body carrying uid or email changes nothing stored", async () => {
    const t = deps();
    await handleFeedback({ ...BODY, wantsReply: true, uid: "someone-else", email: "borrowed@example.com", createdAt: "yesterday", admin: true }, AUTH, t.d);
    const r = t.written[0] as unknown as Record<string, unknown>;
    expect(r.uid).toBe("u-1");
    expect(r.email).toBe("writer@example.com");
    expect(Object.keys(r).sort()).toEqual(["appVersion", "browser", "browserName", "email", "kind", "message", "pageName", "route", "screenshotPath", "severity", "uid", "viewport", "wantsReply"]);
    expect(t.sends[0].replyTo).toBe("writer@example.com");
  });

  it("a screenshot under the caller's own uid is kept; under another uid it is refused, and nothing is written", async () => {
    expect(feedbackRecord({ ...BODY, screenshotPath: "betaFeedback/u-1/1729350000000.png" }, AUTH).screenshotPath).toBe("betaFeedback/u-1/1729350000000.png");
    const t = deps();
    await expect(handleFeedback({ ...BODY, screenshotPath: "betaFeedback/u-2/1729350000000.png" }, AUTH, t.d)).rejects.toBeInstanceOf(FeedbackError);
    await expect(handleFeedback({ ...BODY, screenshotPath: "betaFeedback/u-1/../u-2/a.png" }, AUTH, t.d)).rejects.toBeInstanceOf(FeedbackError);
    await expect(handleFeedback({ ...BODY, screenshotPath: "betaFeedback/u-1/a.png" }, null, t.d)).rejects.toBeInstanceOf(FeedbackError);
    expect(t.written).toHaveLength(0);
  });

  it("a bad kind or an empty message is refused", () => {
    expect(() => feedbackRecord({ ...BODY, kind: "Rant" }, AUTH)).toThrow(FeedbackError);
    expect(() => feedbackRecord({ ...BODY, message: "   " }, AUTH)).toThrow(FeedbackError);
  });
});

describe("HC1-C3 (unit) · an article's 'Did this help? Not really'", () => {
  it("is stored as kind Article with its page name", () => {
    const r = feedbackRecord({ ...BODY, kind: "Article", pageName: "help/add-an-agent", message: "A screenshot would help" }, AUTH);
    expect(r.kind).toBe("Article");
    expect(r.pageName).toBe("help/add-an-agent");
    expect(r.severity).toBe("");
  });
});
