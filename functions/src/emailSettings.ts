/**
 * emailSettings — HTTPS function (europe-west2): the "app emails" page an email's "Email settings" and "Turn off …"
 * links land on, with no sign-in (non-workspace v1.1, item 5b). Served at `/api/email-settings` through a hosting
 * rewrite on the app site; the logic, the token and the HTML are `emailSettingsCore.ts`.
 *
 *   GET  ?t=<token>              — shows the three switches as they stand.
 *   GET  ?t=<token>&off=<key>    — a "Turn off …" link: that one email off, then the page.
 *   POST ?t=<token>  flip=<key>  — a switch on the page: that one email flipped, then the page.
 *   POST ?t=<token>&off=<key>    — a mail client's RFC 8058 one-click unsubscribe (body List-Unsubscribe=One-Click).
 *
 * ⚠️ SERVED BY THE FUNCTION, NOT AN APP ROUTE, so the token is verified on the server before anything is read, and a
 *    bad token never reaches the database. A bad or expired token gets a plain page with a link to sign in.
 * ⚠️ THE FOUNDING UNSUBSCRIBE (waitlist.ts → unsubscribePage.ts) IS A DIFFERENT PAGE AND IS UNCHANGED.
 * ⚠️ FIRESTORE THROUGH `db` (./firestore) ONLY — firestoreHandle.test.ts.
 */
import { onRequest } from "firebase-functions/v2/https";
import type { DocumentData, Firestore, UpdateData } from "firebase-admin/firestore";
import { db } from "./firestore";
import { IP_HASH_SALT } from "./waitlistMail";
import { APP_PATHS, appLink, resolveMailConfig } from "./emailConfig";
import {
  actionOf, emailPatch, emailSettingsPage, emailState, readSettingsToken,
  type EmailAction, type PageView,
} from "./emailSettingsCore";

/** Verify the token, apply the action to that one account, and say what the page should show. */
export async function applyEmailSettings(
  store: Firestore,
  rawToken: unknown,
  action: EmailAction,
  deps: { secret: string; nowMs: number; signInUrl: string | null },
): Promise<PageView> {
  const bad: PageView = { kind: "bad", signInUrl: deps.signInUrl };
  const uid = readSettingsToken(rawToken, deps.secret, deps.nowMs);
  if (!uid) return bad;
  const ref = store.doc(`users/${uid}`);
  return store.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return bad;
    const stored = { notifyPrefs: snap.get("notifyPrefs"), marketingConsent: snap.get("marketingConsent") };
    const patch = emailPatch(stored, action, new Date(deps.nowMs).toISOString());
    /* ⚠️ `update`, not a merging set: notifyPrefs is replaced as the whole (resolved) map, as Settings writes it. */
    if (patch) tx.update(ref, patch as UpdateData<DocumentData>);
    const after = patch ? { ...stored, ...patch } : stored;
    const email = typeof snap.get("email") === "string" ? (snap.get("email") as string) : null;
    const state = emailState(after);
    const done = action.kind === "view" ? null : { key: action.key, on: state[action.key] };
    return { kind: "ok", token: String(rawToken), email, state, done } as PageView;
  });
}

export const emailSettings = onRequest(
  { region: "europe-west2", timeoutSeconds: 30, memory: "256MiB", secrets: [IP_HASH_SALT] },
  async (req, res) => {
    res.set("Cache-Control", "no-store");
    res.set("Referrer-Policy", "no-referrer");
    res.set("X-Robots-Tag", "noindex");
    res.set("X-Content-Type-Options", "nosniff");
    res.set("Content-Security-Policy",
      "default-src 'none'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; " +
      "form-action 'self'; frame-ancestors 'none'; base-uri 'none'");
    if (req.method !== "GET" && req.method !== "POST") { res.status(405).set("Allow", "GET, POST").send("Method not allowed."); return; }
    const cfg = resolveMailConfig(process.env);
    const signInUrl = appLink(cfg, `${APP_PATHS.emailSettings}#/login`);
    let secret = "";
    try { secret = IP_HASH_SALT.value(); } catch { secret = ""; }
    const query = req.query as Record<string, unknown>;
    const body = req.method === "POST" ? req.body : undefined;
    const token = (body && typeof body === "object" && typeof (body as Record<string, unknown>).t === "string")
      ? (body as Record<string, unknown>).t : query.t;
    try {
      const view = await applyEmailSettings(db, token, actionOf(req.method, body, query), { secret, nowMs: Date.now(), signInUrl });
      console.info(JSON.stringify({ event: "emailSettings", outcome: view.kind, method: req.method }));
      res.status(200).type("html").send(emailSettingsPage(view));
    } catch (e) {
      console.error(JSON.stringify({ event: "emailSettings", outcome: "error", message: String((e as Error)?.message ?? e).slice(0, 200) }));
      res.status(500).type("html").send(emailSettingsPage({ kind: "error" }));
    }
  },
);
