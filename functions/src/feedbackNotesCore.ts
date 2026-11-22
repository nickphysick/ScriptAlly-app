/**
 * Your notes v1, Part B — THE CORES of `addFeedbackNote` and `markFeedbackSeen`. Pure apart from the effects they are
 * handed (`txn`, `send`), so the checks, what is written and the failure rules are tested with stubs
 * (`feedbackNotesCore.test.ts`), as `betaFeedbackCore` is.
 *
 * ⚠️ THE UID COMES FROM THE VERIFIED TOKEN, NEVER THE BODY. A note is the caller's when its stored `uid` is the token's.
 * ⚠️ EACH WRITES ONLY ITS NAMED FIELDS, ON ONE NOTE:
 *    addFeedbackNote   a `thread` message from "writer"; and, with `stillHappening` on a built or fixed note, clears
 *                      `status`, sets `reopenedAt` and appends `{ status: "reopened", at }` to `statusLog`. Nothing else.
 *    markFeedbackSeen  `writerSeenAt` (server time). Nothing else.
 * ⚠️ THE WRITE COMES FIRST, AND AN EMAIL FAILURE NEVER FAILS THE CALL (the rule `handleFeedback` keeps).
 */
import type { RenderedEmail, SendOutcome, SendOverrides } from "./email";
import { FEEDBACK_COLLECTION, FEEDBACK_FROM_DEFAULT, FEEDBACK_TO_DEFAULT, FeedbackError } from "./betaFeedbackCore";

export const NOTE_MAX = 2000;
/** the statuses a writer can say are "still happening": both read as "Now in the app" */
export const REOPENABLE = ["built", "fixed"] as const;
const ID = /^[A-Za-z0-9_-]{1,128}$/;

export interface NoteAuth { uid?: string; email?: string }

/** The stored note as these cores need it. */
export interface NoteDoc { uid?: unknown; status?: unknown; kind?: unknown; message?: unknown; pageName?: unknown }

/** What `addFeedbackNote` asks the store to write, in one transaction. The store turns `"server"`/`"now"` into times. */
export interface AddWrite {
  thread: { from: "writer"; text: string; at: "server" };
  reopen: null | { clearStatus: true; reopenedAt: "server"; logEntry: { status: "reopened"; at: "now" } };
}

export interface NoteTxn {
  /** the note, or null when it does not exist */
  get: (id: string) => Promise<NoteDoc | null>;
  write: (id: string, w: AddWrite) => void;
  markSeen: (id: string) => void;
}

export interface NotesDeps {
  /** runs `fn` inside one Firestore transaction */
  txn: <T>(fn: (t: NoteTxn) => Promise<T>) => Promise<T>;
  send: (to: string, rendered: RenderedEmail, overrides: SendOverrides) => Promise<SendOutcome>;
  env: Record<string, string | undefined>;
  log?: (msg: string, e?: unknown) => void;
}

function idOf(data: Record<string, unknown>): string {
  const id = typeof data.id === "string" ? data.id.trim() : "";
  if (!ID.test(id)) throw new FeedbackError("invalid-argument", "That note couldn't be found.");
  return id;
}

/** The note exists and is the caller's; otherwise `permission-denied` (a missing note says nothing about anyone's). */
function own(note: NoteDoc | null, auth: NoteAuth | null | undefined): NoteDoc {
  if (!auth?.uid) throw new FeedbackError("permission-denied", "Please sign in.");
  if (!note || note.uid !== auth.uid) throw new FeedbackError("permission-denied", "That note isn't yours.");
  return note;
}

const esc = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const clip = (s: string, n: number) => { const t = s.replace(/\s+/g, " ").trim(); return t.length > n ? `${t.slice(0, n)}…` : t; };

/** `[Follow-up] {page}: {first 60 of the follow-up}` — or `[Still happening]` when the note was opened again. */
export function followUpSubject(reopened: boolean, note: NoteDoc, text: string): string {
  const page = typeof note.pageName === "string" && note.pageName ? note.pageName : "Unknown page";
  return `[${reopened ? "Still happening" : "Follow-up"}] ${page}: ${clip(text, 60)}`;
}

export function followUpEmail(reopened: boolean, note: NoteDoc, text: string, id: string, uid: string): RenderedEmail {
  const original = typeof note.message === "string" ? note.message : "";
  const rows: [string, string][] = [
    ["Kind", typeof note.kind === "string" ? note.kind : ""],
    ["Status", reopened ? "Reopened: the writer says it's still happening" : typeof note.status === "string" && note.status ? note.status : "(not read yet)"],
    ["Uid", uid],
    ["Firestore doc", `${FEEDBACK_COLLECTION}/${id}`],
  ];
  const text2 = [text, "", "— in reply to —", original, "", ...rows.map(([k, v]) => `${k}: ${v}`)].join("\n");
  const html =
    `<div style="font-family:Georgia,serif;color:#1c130f;max-width:560px">` +
    `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;white-space:pre-wrap">${esc(text)}</p>` +
    `<p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#5c534e;white-space:pre-wrap;border-left:3px solid #e3d5c9;padding-left:12px">${esc(original)}</p>` +
    `<table style="border-collapse:collapse;font-size:13px;line-height:1.5;color:#5c534e">` +
    rows.map(([k, v]) => `<tr><td style="padding:2px 14px 2px 0;font-family:monospace;color:#8a817b">${esc(k)}</td><td>${esc(v)}</td></tr>`).join("") +
    `</table></div>`;
  return { subject: followUpSubject(reopened, note, text), html, text: text2 };
}

/** addFeedbackNote: `{ id, text, stillHappening? }` → one thread message, and maybe the note opened again. */
export async function handleAddNote(
  data: Record<string, unknown>, auth: NoteAuth | null | undefined, deps: NotesDeps,
): Promise<{ ok: true; reopened: boolean; emailed: boolean }> {
  const id = idOf(data);
  const text = typeof data.text === "string" ? data.text.trim() : "";
  if (!text || text.length > NOTE_MAX) throw new FeedbackError("invalid-argument", `A reply is 1 to ${NOTE_MAX} characters.`);
  const still = data.stillHappening === true;
  const { note, reopened } = await deps.txn(async (t) => {
    const n = own(await t.get(id), auth);
    const reopen = still && (REOPENABLE as readonly unknown[]).includes(n.status);
    t.write(id, {
      thread: { from: "writer", text, at: "server" },
      reopen: reopen ? { clearStatus: true, reopenedAt: "server", logEntry: { status: "reopened", at: "now" } } : null,
    });
    return { note: n, reopened: reopen };
  });
  let emailed = false;
  try {
    const out = await deps.send(
      (deps.env.FEEDBACK_TO || "").trim() || FEEDBACK_TO_DEFAULT,
      followUpEmail(reopened, note, text, id, auth!.uid!),
      { from: (deps.env.FEEDBACK_FROM || "").trim() || FEEDBACK_FROM_DEFAULT, replyTo: auth?.email ?? null },
    );
    emailed = out.ok;
    if (!out.ok) deps.log?.(`addFeedbackNote: email not sent for ${id}: ${out.reason ?? "not sent"}`);
  } catch (e) {
    deps.log?.(`addFeedbackNote: email not sent for ${id}`, e);
  }
  return { ok: true, reopened, emailed };
}

/** markFeedbackSeen: `{ id }` → the note's `writerSeenAt`, and nothing else. */
export async function handleMarkSeen(data: Record<string, unknown>, auth: NoteAuth | null | undefined, deps: Pick<NotesDeps, "txn">): Promise<{ ok: true }> {
  const id = idOf(data);
  await deps.txn(async (t) => { own(await t.get(id), auth); t.markSeen(id); });
  return { ok: true };
}
