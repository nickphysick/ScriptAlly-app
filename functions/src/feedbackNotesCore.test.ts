/**
 * Your notes v1, Part B — the two callables' cores with their effects stubbed. Nothing reaches the network or Firestore.
 *
 *   N1  only the note's owner, by the VERIFIED uid: a missing note, someone else's, or no sign-in is permission-denied;
 *       a bad id or text (empty after trimming, over 2000) is invalid-argument; nothing is written in any of those.
 *   N2  a follow-up writes ONE thread message and touches nothing else; stillHappening on a built or fixed note also
 *       reopens it (and only then); the body cannot widen what is written.
 *   N3  the write comes first, the email to FEEDBACK_TO is "[Follow-up]" or "[Still happening]", and an email failure
 *       never fails the call.
 *   N4  markFeedbackSeen writes writerSeenAt on the caller's own note and nothing else.
 */
import { describe, expect, it } from "vitest";
import { FEEDBACK_TO_DEFAULT, FeedbackError } from "./betaFeedbackCore";
import { followUpSubject, handleAddNote, handleMarkSeen, NOTE_MAX, type AddWrite, type NoteDoc, type NotesDeps } from "./feedbackNotesCore";

const ME = { uid: "u-1", email: "writer@example.com" };
const NOTE: NoteDoc = { uid: "u-1", kind: "Something's broken", message: "The list jumped when I pinned it.", pageName: "Contact list", status: "fixed" };

function deps(note: NoteDoc | null = NOTE, over: Partial<NotesDeps> = {}) {
  const order: string[] = [];
  const writes: { id: string; w: AddWrite }[] = [];
  const seen: string[] = [];
  const sends: { to: string; subject: string; replyTo?: string | null }[] = [];
  const d: NotesDeps = {
    txn: async (fn) => fn({
      get: async () => note,
      write: (id, w) => { order.push("write"); writes.push({ id, w }); },
      markSeen: (id) => { order.push("seen"); seen.push(id); },
    }),
    send: async (to, r, o) => { order.push("send"); sends.push({ to, subject: r.subject, replyTo: o.replyTo }); return { ok: true }; },
    env: {},
    ...over,
  };
  return { d, order, writes, seen, sends };
}

const code = async (p: Promise<unknown>) => { try { await p; return "ok"; } catch (e) { return e instanceof FeedbackError ? e.code : "other"; } };

describe("N1 · whose note, and what is accepted", () => {
  it("refuses a missing note, someone else's, and no sign-in — and writes nothing", async () => {
    for (const [note, auth] of [[null, ME], [{ ...NOTE, uid: "u-2" }, ME], [NOTE, null], [NOTE, { email: "x@y" }]] as const) {
      const t = deps(note as NoteDoc | null);
      expect(await code(handleAddNote({ id: "n1", text: "Still broken here" }, auth as never, t.d))).toBe("permission-denied");
      expect(await code(handleMarkSeen({ id: "n1" }, auth as never, t.d))).toBe("permission-denied");
      expect(t.writes).toEqual([]); expect(t.seen).toEqual([]); expect(t.sends).toEqual([]);
    }
  });
  it("text is 1–2000 characters after trimming; the id must be a plain document id", async () => {
    const t = deps();
    expect(await code(handleAddNote({ id: "n1", text: "   " }, ME, t.d))).toBe("invalid-argument");
    expect(await code(handleAddNote({ id: "n1", text: "x".repeat(NOTE_MAX + 1) }, ME, t.d))).toBe("invalid-argument");
    expect(await code(handleAddNote({ id: "n1" }, ME, t.d))).toBe("invalid-argument");
    expect(await code(handleAddNote({ id: "../users/u-2", text: "hi" }, ME, t.d))).toBe("invalid-argument");
    expect(await code(handleMarkSeen({ id: 3 }, ME, t.d))).toBe("invalid-argument");
    expect(t.writes).toEqual([]);
    expect(await code(handleAddNote({ id: "n1", text: `  ${"x".repeat(NOTE_MAX)}  ` }, ME, t.d))).toBe("ok");
  });
});

describe("N2 · what a follow-up writes", () => {
  it("a plain follow-up: one thread message from the writer, no reopen", async () => {
    const t = deps();
    const out = await handleAddNote({ id: "n1", text: "  One more thing  " }, ME, t.d);
    expect(out.reopened).toBe(false);
    expect(t.writes).toEqual([{ id: "n1", w: { thread: { from: "writer", text: "One more thing", at: "server" }, reopen: null } }]);
  });
  it("stillHappening on a built or fixed note reopens it", async () => {
    for (const status of ["built", "fixed"]) {
      const t = deps({ ...NOTE, status });
      const out = await handleAddNote({ id: "n1", text: "It's back", stillHappening: true }, ME, t.d);
      expect(out.reopened).toBe(true);
      expect(t.writes[0].w.reopen).toEqual({ clearStatus: true, reopenedAt: "server", logEntry: { status: "reopened", at: "now" } });
    }
  });
  it("stillHappening on any other status (or none) is only a message", async () => {
    for (const status of ["read", "planned", undefined, "reopened"]) {
      const t = deps({ ...NOTE, status });
      expect((await handleAddNote({ id: "n1", text: "It's back", stillHappening: true }, ME, t.d)).reopened).toBe(false);
      expect(t.writes[0].w.reopen).toBeNull();
    }
  });
  it("stillHappening must be literally true; and the body cannot set the sender or any field", async () => {
    const t = deps();
    await handleAddNote({ id: "n1", text: "hi", stillHappening: "yes", from: "founder", status: "built", uid: "u-9", reply: { text: "x" } }, ME, t.d);
    expect(t.writes[0].w).toEqual({ thread: { from: "writer", text: "hi", at: "server" }, reopen: null });
  });
});

describe("N3 · the email", () => {
  it("writes first, then emails FEEDBACK_TO with the subject's tag; Reply-To is the token's email", async () => {
    const t = deps({ ...NOTE, status: "read" });
    await handleAddNote({ id: "n1", text: "And it happens on the dashboard too" }, ME, t.d);
    expect(t.order).toEqual(["write", "send"]);
    expect(t.sends[0].to).toBe(FEEDBACK_TO_DEFAULT);
    expect(t.sends[0].subject).toBe("[Follow-up] Contact list: And it happens on the dashboard too");
    expect(t.sends[0].replyTo).toBe("writer@example.com");
    const r = deps();
    await handleAddNote({ id: "n1", text: "Still happening", stillHappening: true }, ME, r.d);
    expect(r.sends[0].subject.startsWith("[Still happening]")).toBe(true);
    expect(followUpSubject(false, { pageName: "" }, "x")).toBe("[Follow-up] Unknown page: x");
  });
  it("FEEDBACK_TO overrides the address", async () => {
    const t = deps(NOTE, { env: { FEEDBACK_TO: "desk@example.com" } });
    await handleAddNote({ id: "n1", text: "hi" }, ME, t.d);
    expect(t.sends[0].to).toBe("desk@example.com");
  });
  it("an email that fails, or throws, never fails the call", async () => {
    const a = deps(NOTE, { send: async () => ({ ok: false, reason: "down" }) });
    expect(await handleAddNote({ id: "n1", text: "hi" }, ME, a.d)).toMatchObject({ ok: true, emailed: false });
    const b = deps(NOTE, { send: async () => { throw new Error("boom"); } });
    expect(await handleAddNote({ id: "n1", text: "hi" }, ME, b.d)).toMatchObject({ ok: true, emailed: false });
    expect(b.writes).toHaveLength(1);
  });
});

describe("N4 · markFeedbackSeen", () => {
  it("marks the caller's own note and writes nothing else", async () => {
    const t = deps();
    expect(await handleMarkSeen({ id: "n1", writerSeenAt: 0, status: "built" }, ME, t.d)).toEqual({ ok: true });
    expect(t.seen).toEqual(["n1"]);
    expect(t.writes).toEqual([]);
    expect(t.sends).toEqual([]);
  });
});
