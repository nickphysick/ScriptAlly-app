/**
 * Help system v1, E.2 — THE FEEDBACK CALLABLE'S CORE: what is kept, and the email that tells Nick about it. Pure apart
 * from the two effects it is handed (`write`, `send`), so the order and the failure rules can be tested with stubs.
 *
 * ⚠️ IT STORES WHAT THE PANEL SAYS IT STORES AND NOTHING ELSE. Every field is taken one at a time, never spread from the
 *    payload, so a client that starts sending more cannot widen what is kept.
 * ⚠️ THE UID AND THE EMAIL COME FROM THE VERIFIED TOKEN, NEVER THE BODY. A uid or an address a caller can type is one a
 *    caller can borrow. The email is stored only when the writer asked for a reply.
 * ⚠️ A SCREENSHOT PATH MUST BE THE CALLER'S OWN — `betaFeedback/{their uid}/…`. A path under anyone else's uid is refused.
 * ⚠️ THE WRITE COMES FIRST, AND AN EMAIL FAILURE NEVER FAILS THE CALL. Feedback that was stored is feedback; the email is
 *    a notification about it. A failed send is logged and recorded on the document (`emailed: false`, `emailError`).
 *
 * DASHBOARD v77 — THREE FIELDS THIS FUNCTION NEVER WRITES. Nick sets them by hand in the Firebase console, and the
 * founding writer card reads them back (owner-only, `src/lib/feedbackRecord.ts`):
 *   status    "read" | "planned" | "built" | "fixed"   absent = sent. Changed = built + fixed.
 *   title     string, ≤ 120, the short public title    absent = the message's first 60 characters, quoted
 *   statusAt  timestamp, when the status was reached    absent = the tooltip carries no result date
 * ⚠️ Never add them to `cleanFeedback` or the write below: they are the desk's answer, not the writer's note.
 */
import type { RenderedEmail, SendOutcome, SendOverrides } from "./email";

export const FEEDBACK_KINDS = [
  "Something's broken",
  "Something's confusing",
  "An idea",
  "Something I liked",
  /* Help Centre v1 — "Did this help? Not really" on an article. The function accepts it; the feedback panel never offers
     it (its four kinds are `src/lib/beta.ts`'s, lock HC1-C3). */
  "Article",
] as const;
export const FEEDBACK_SEVERITIES = ["Just noticed", "Slowing me down", "I can't carry on"] as const;

export const FEEDBACK_TO_DEFAULT = "feedback@queryhawk.net";
export const FEEDBACK_FROM_DEFAULT = "QueryHawk feedback <feedback@queryhawk.net>";
export const FEEDBACK_COLLECTION = "betaFeedback";

export const MAX = { message: 4000, route: 200, viewport: 32, browser: 400, browserName: 80, kind: 64, version: 64, page: 80, path: 300 };

export class FeedbackError extends Error {
  constructor(public code: "invalid-argument" | "permission-denied", message: string) { super(message); }
}

const str = (v: unknown, max: number): string => (typeof v === "string" ? v.trim().slice(0, max) : "");

export interface FeedbackAuth { uid?: string; email?: string; emailVerified?: boolean }

export interface FeedbackRecord {
  kind: string;
  message: string;
  severity: string;
  wantsReply: boolean;
  pageName: string;
  route: string;
  viewport: string;
  browser: string;
  browserName: string;
  appVersion: string;
  screenshotPath: string;
  uid?: string;
  email?: string;
}

/** The record, field by field, from the payload and the VERIFIED auth context. Throws `FeedbackError` on a bad payload. */
export function feedbackRecord(data: Record<string, unknown>, auth: FeedbackAuth | null | undefined): FeedbackRecord {
  const message = str(data.message, MAX.message);
  const kind = str(data.kind, MAX.kind);
  if (!message) throw new FeedbackError("invalid-argument", "Please tell us what happened.");
  if (!(FEEDBACK_KINDS as readonly string[]).includes(kind)) throw new FeedbackError("invalid-argument", "Please choose a kind.");
  const sevRaw = str(data.severity, MAX.kind);
  const severity = kind === "Something's broken" && (FEEDBACK_SEVERITIES as readonly string[]).includes(sevRaw) ? sevRaw : "";
  const wantsReply = data.wantsReply === true;
  const uid = auth?.uid;
  const screenshotPath = str(data.screenshotPath, MAX.path);
  if (screenshotPath) {
    const mine = !!uid && screenshotPath.startsWith(`${FEEDBACK_COLLECTION}/${uid}/`) && !screenshotPath.includes("..")
      && /^[A-Za-z0-9_\-./]+$/.test(screenshotPath);
    if (!mine) throw new FeedbackError("permission-denied", "That screenshot isn't yours to attach.");
  }
  const email = wantsReply && auth?.email ? auth.email : undefined;
  return {
    kind, message, severity, wantsReply,
    pageName: str(data.pageName, MAX.page),
    route: str(data.route, MAX.route),
    viewport: str(data.viewport, MAX.viewport),
    browser: str(data.browser, MAX.browser),
    browserName: str(data.browserName, MAX.browserName),
    appVersion: str(data.appVersion, MAX.version),
    screenshotPath,
    ...(uid ? { uid } : {}),
    ...(email ? { email } : {}),
  };
}

const esc = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/** `[{kind}{ · severity}] {pageName}: {first 60 chars of the message}` */
export function feedbackSubject(r: Pick<FeedbackRecord, "kind" | "severity" | "pageName" | "message">): string {
  const first = r.message.replace(/\s+/g, " ").trim();
  const clip = first.length > 60 ? `${first.slice(0, 60)}…` : first;
  return `[${r.kind}${r.severity ? ` · ${r.severity}` : ""}] ${r.pageName || "Unknown page"}: ${clip}`;
}

export function consoleLink(projectId: string, path: string): string {
  return `https://console.firebase.google.com/project/${encodeURIComponent(projectId)}/storage/files/~2F${path.split("/").map(encodeURIComponent).join("~2F")}`;
}

/** The email to Nick: the message in full, then everything that came with it. Plain text and simple HTML. */
export function feedbackEmail(r: FeedbackRecord, docId: string, projectId: string): RenderedEmail {
  const rows: [string, string][] = [
    ["Kind", r.kind],
    ...(r.severity ? [["Severity", r.severity] as [string, string]] : []),
    ["Page", r.pageName || "(not named)"],
    ["Route", r.route],
    ["Browser", r.browserName || r.browser],
    ["Window", r.viewport],
    ["Version", r.appVersion],
    ["Uid", r.uid ?? "(not signed in)"],
    ...(r.email ? [["Email", r.email] as [string, string]] : []),
    ["Reply wanted", r.wantsReply ? "Yes" : "No"],
    ["Firestore doc", `${FEEDBACK_COLLECTION}/${docId}`],
    ...(r.screenshotPath ? [["Screenshot", r.screenshotPath] as [string, string], ["Open in console", consoleLink(projectId, r.screenshotPath)] as [string, string]] : []),
  ];
  const text = [r.message, "", "—", ...rows.map(([k, v]) => `${k}: ${v}`)].join("\n");
  const html =
    `<div style="font-family:Georgia,serif;color:#1c130f;max-width:560px">` +
    `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;white-space:pre-wrap">${esc(r.message)}</p>` +
    `<table style="border-collapse:collapse;font-size:13px;line-height:1.5;color:#5c534e">` +
    rows.map(([k, v]) => `<tr><td style="padding:2px 14px 2px 0;font-family:monospace;color:#8a817b">${esc(k)}</td><td style="padding:2px 0">${
      /^https:\/\//.test(v) ? `<a href="${esc(v)}" style="color:#a2452a">${esc(v)}</a>` : esc(v)}</td></tr>`).join("") +
    `</table></div>`;
  return { subject: feedbackSubject(r), html, text };
}

export interface FeedbackDeps {
  write: (record: FeedbackRecord) => Promise<string>;
  mark: (docId: string, patch: { emailed: boolean; emailError?: string }) => Promise<void>;
  send: (to: string, rendered: RenderedEmail, overrides: SendOverrides) => Promise<SendOutcome>;
  env: Record<string, string | undefined>;
  projectId: string;
  log?: (msg: string, e?: unknown) => void;
}

/** The whole call: store, then email, then record how the email went. Resolves `{ ok: true }` once the write landed. */
export async function handleFeedback(data: Record<string, unknown>, auth: FeedbackAuth | null | undefined, deps: FeedbackDeps): Promise<{ ok: true; id: string; emailed: boolean }> {
  const record = feedbackRecord(data, auth);
  const id = await deps.write(record);
  let emailed = false;
  let emailError = "";
  try {
    const out = await deps.send(
      (deps.env.FEEDBACK_TO || "").trim() || FEEDBACK_TO_DEFAULT,
      feedbackEmail(record, id, deps.projectId),
      { from: (deps.env.FEEDBACK_FROM || "").trim() || FEEDBACK_FROM_DEFAULT, replyTo: record.email ?? null },
    );
    emailed = out.ok;
    if (!out.ok) emailError = out.reason ?? "not sent";
  } catch (e) {
    emailError = e instanceof Error ? e.message.slice(0, 200) : "not sent";
  }
  if (!emailed) deps.log?.(`sendBetaFeedback: email not sent for ${id}: ${emailError}`);
  try {
    await deps.mark(id, emailed ? { emailed: true } : { emailed: false, emailError });
  } catch (e) {
    deps.log?.(`sendBetaFeedback: could not record the email outcome on ${id}`, e);
  }
  return { ok: true, id, emailed };
}
