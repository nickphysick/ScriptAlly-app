/**
 * Email settings without signing in — the pure half (non-workspace v1.1, item 5b; ref
 * design-refs/contact-terms-unsubscribe-v1.html, "Unsubscribe · app emails", function `prefs()`).
 *
 * Every NON-founding email's "Email settings" and "Turn off …" links carry a signed, expiring token. The token
 * names one account (its uid) and an expiry, and nothing else: no address, no prefs, no purpose beyond this page.
 * `emailSettings.ts` serves the page; this file holds the token, the state, the write and the HTML, and imports
 * nothing but `crypto`, so the root suite (and src/lib/emailSettingsParity.test.ts) can run all of it.
 *
 * ⚠️ THE TOKEN IS AN HMAC-SHA256 OVER "email-settings:v1:<uid>:<expiry>", keyed with the WAITLIST_IP_SALT secret.
 *    The domain prefix keeps it apart from the waitlist's unsubscribe digest, which uses the same secret
 *    ("unsub:<salt>:<docId>", sha256): neither can be passed off as the other. Compared in constant time.
 * ⚠️ NO SECRET, NO TOKEN. With the salt unset `makeSettingsToken` returns null and the emails keep the plain
 *    Settings › Emails link (sign-in needed), and `readSettingsToken` accepts nothing.
 * ⚠️ THE WRITES ARE SETTINGS › EMAILS' OWN (src/lib/settingsSaves.ts): `notifyPrefs` as a WHOLE map (every key
 *    resolved, so a lone key never drops its siblings) and `marketingConsent` rewritten as { granted, at }.
 *    The defaults are the client's NOTIFY_DEFAULT — held equal by src/lib/emailSettingsParity.test.ts.
 * ⚠️ A BAD TOKEN AND AN EXPIRED ONE READ THE SAME, and change nothing.
 */
import { createHmac, timingSafeEqual } from "crypto";

/** How long a link in an email keeps working. */
export const SETTINGS_TOKEN_TTL_MS = 60 * 24 * 60 * 60 * 1000;
const PREFIX = "email-settings:v1";

const b64 = (s: string | Buffer) => Buffer.from(s).toString("base64url");
const sign = (uid: string, exp: number, secret: string) =>
  createHmac("sha256", secret).update(`${PREFIX}:${uid}:${exp}`).digest("base64url");

/** `<base64url uid>.<expiry seconds>.<signature>`, or null when there is no secret or no uid. */
export function makeSettingsToken(uid: string, secret: string, nowMs: number): string | null {
  if (!secret || !uid) return null;
  const exp = Math.floor((nowMs + SETTINGS_TOKEN_TTL_MS) / 1000);
  return `${b64(uid)}.${exp}.${sign(uid, exp, secret)}`;
}

/** The uid a token names, or null for anything tampered, malformed or past its expiry. */
export function readSettingsToken(raw: unknown, secret: string, nowMs: number): string | null {
  if (typeof raw !== "string" || !secret || raw.length > 600) return null;
  const parts = raw.split(".");
  if (parts.length !== 3) return null;
  const [u, e, sig] = parts;
  if (!/^[A-Za-z0-9_-]+$/.test(u) || !/^\d{1,12}$/.test(e) || !/^[A-Za-z0-9_-]{43}$/.test(sig)) return null;
  const uid = Buffer.from(u, "base64url").toString("utf8");
  if (!uid || b64(uid) !== u) return null;
  const exp = Number(e);
  const want = Buffer.from(sign(uid, exp, secret));
  const got = Buffer.from(sig);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  if (nowMs >= exp * 1000) return null;
  return uid;
}

/* ── The three switches ──────────────────────────────────────────────────────────────────── */

export type EmailKey = "nudges" | "weekly" | "news";
export const EMAIL_KEYS: readonly EmailKey[] = ["nudges", "weekly", "news"];
export const isEmailKey = (v: unknown): v is EmailKey => typeof v === "string" && (EMAIL_KEYS as readonly string[]).includes(v);

/** The client's NOTIFY_DEFAULT (src/lib/accountPrefs.ts), every key, so the whole map is written back. */
export const SERVER_NOTIFY_DEFAULT = { nudges: true, weeklyDigest: true, discover: false, scout: false, comps: false } as const;
type NotifyKey = keyof typeof SERVER_NOTIFY_DEFAULT;

export interface StoredPrefs { notifyPrefs?: unknown; marketingConsent?: unknown }
export type EmailState = Record<EmailKey, boolean>;

const resolvedNotify = (raw: unknown): Record<string, unknown> & Record<NotifyKey, boolean> => {
  const s = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const out: Record<string, unknown> = { ...s };
  for (const k of Object.keys(SERVER_NOTIFY_DEFAULT) as NotifyKey[]) out[k] = typeof s[k] === "boolean" ? s[k] : SERVER_NOTIFY_DEFAULT[k];
  return out as Record<string, unknown> & Record<NotifyKey, boolean>;
};

/** What the page shows: nudges and weekly default on, news only when consent was granted. */
export function emailState(stored: StoredPrefs): EmailState {
  const n = resolvedNotify(stored.notifyPrefs);
  const mc = stored.marketingConsent as { granted?: unknown } | undefined;
  return { nudges: n.nudges, weekly: n.weeklyDigest, news: mc?.granted === true };
}

export type EmailAction = { kind: "flip"; key: EmailKey } | { kind: "off"; key: EmailKey } | { kind: "view" };

/**
 * The patch for one action, or null when nothing is to be written (a view, or "off" on something already off —
 * so a second click on a Turn off link never restamps the consent record).
 */
export function emailPatch(stored: StoredPrefs, action: EmailAction, nowIso: string): Record<string, unknown> | null {
  if (action.kind === "view") return null;
  const now = emailState(stored);
  const value = action.kind === "flip" ? !now[action.key] : false;
  if (action.kind === "off" && !now[action.key]) return null;
  switch (action.key) {
    case "nudges": return { notifyPrefs: { ...resolvedNotify(stored.notifyPrefs), nudges: value } };
    case "weekly": return { notifyPrefs: { ...resolvedNotify(stored.notifyPrefs), weeklyDigest: value } };
    case "news": return { marketingConsent: { granted: value, at: nowIso } };
    default: {
      const unhandled: never = action.key;
      throw new Error(`unknown email ${String(unhandled)}`);
    }
  }
}

/** Read the action off a request: a POSTed switch, else a Turn off link's `off`, else just looking. */
export function actionOf(method: string, body: unknown, query: Record<string, unknown>): EmailAction {
  const b = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  if (method === "POST" && isEmailKey(b.flip)) return { kind: "flip", key: b.flip };
  if ((method === "GET" || method === "POST") && isEmailKey(query.off)) return { kind: "off", key: query.off };
  return { kind: "view" };
}

/* ── The page ────────────────────────────────────────────────────────────────────────────── */

export const ROWS: readonly (readonly [EmailKey, string, string])[] = [
  ["nudges", "Nudge reminders", "When a query is due a nudge."],
  ["weekly", "Weekly summary", "One email each Monday."],
  ["news", "Product news", "Occasional news about new features."],
];
const LABEL: Record<EmailKey, string> = { nudges: "Nudge reminders", weekly: "Weekly summary", news: "Product news" };
const VERB: Record<EmailKey, string> = { nudges: "are", weekly: "is", news: "is" };

/** The ref's headline: it counts what is on. */
export function headline(s: EmailState): string {
  const on = EMAIL_KEYS.filter((k) => s[k]).length;
  if (on === 0) return "No emails on.";
  if (on === 3) return "All three emails on.";
  return `${on === 1 ? "One" : "Two"} email${on > 1 ? "s" : ""} on.`;
}

export const COPY = {
  title: "Email settings",
  intro: "Your emails from QueryHawk.",
  doneFor: "That's done for",
  lookFor: "These are the emails we send to",
  noSignIn: "Change anything here; there's no need to sign in.",
  always: "Emails about your account itself (sign-in links, your data) are always sent.",
  badHeading: "This link doesn't work any more.",
  badBody: "Links to your email settings last 60 days. Sign in to change your emails in Settings.",
  signIn: "Sign in",
  errorHeading: "Something went wrong.",
  errorBody: "Nothing was changed. Please try the link again in a moment.",
} as const;

const esc = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const STYLE = `
  :root{--navy:#1b2433;--band:#2d3a50;--ink:#1c130f;--mute:rgba(28,19,15,.64);--rule:rgba(28,19,15,.16);--terra:#d9967a;
    --type:"Special Elite","Courier New",Courier,monospace;--serif:"Source Serif 4",Georgia,serif;--sans:"Source Sans 3","Helvetica Neue",Arial,sans-serif}
  *{box-sizing:border-box}
  body{margin:0;background:#faf6f0;color:var(--ink);font-family:var(--serif)}
  .pin{max-width:1120px;margin:0 auto;padding:0 64px}
  .pnav{background:var(--navy);color:#fff}
  .pnav .pin{display:flex;align-items:center;height:84px}
  .pbrand{font:600 22px var(--sans);color:#fff;text-decoration:none}
  .phero{background:var(--navy);color:#fff;padding:40px 0 150px;border-radius:0 0 36px 36px;box-shadow:0 18px 34px -16px rgba(27,36,51,.55);position:relative;z-index:2}
  .phero h1{margin:0;font:400 64px/1.1 var(--type)}
  .pbody{padding:36px 0 70px}
  .ucard{max-width:560px;margin:-130px auto 0;border-radius:20px;background:#fffefb;box-shadow:0 0 0 1px rgba(28,19,15,.1),0 18px 40px -24px rgba(27,36,51,.35);padding:34px;position:relative;z-index:3}
  .ucard h2{margin:0;font:400 26px/1.25 var(--type)}
  .ucard p{margin:12px 0 0;font-size:17px;line-height:1.55;color:rgba(28,19,15,.82)}
  .ucard p b{overflow-wrap:anywhere}
  .ucard .quiet{font-size:15px;color:var(--mute)}
  .rows{margin-top:20px;border-radius:14px;box-shadow:0 0 0 1px rgba(28,19,15,.1)}
  .row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:28px;align-items:center;padding:16px 22px;border-top:1px dashed var(--rule)}
  .row:first-child{border-top:0}
  .lbl{font-size:16px;font-weight:600;line-height:1.3}
  .dsc{margin-top:3px;font-size:14px;line-height:1.45;color:var(--mute)}
  .ctl{display:flex;justify-content:flex-end;align-items:center;gap:10px}
  .togw{font-size:14px;color:var(--mute);min-width:1.8em;text-align:right}
  .tog{position:relative;width:44px;height:26px;flex:none;border:0;border-radius:99px;background:rgba(28,19,15,.2);cursor:pointer;padding:0}
  .tog::after{content:"";position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.25);transition:left .18s ease-out}
  .tog[aria-checked="true"]{background:var(--band)}
  .tog[aria-checked="true"]::after{left:21px}
  .tog:focus-visible,.btn:focus-visible{outline:2px solid var(--band);outline-offset:2px}
  .acts{margin-top:22px}
  .btn{display:inline-flex;align-items:center;justify-content:center;height:36px;padding:0 18px;border-radius:99px;box-shadow:inset 0 0 0 1px rgba(28,19,15,.26);font:600 15px var(--serif);color:var(--ink);text-decoration:none}
  @media (max-width:760px){.pin{padding:0 16px}.phero h1{font-size:44px}.ucard{margin-top:-90px;padding:26px 22px}.row{gap:14px;padding:14px 16px}}
  @media (prefers-reduced-motion:reduce){.tog::after{transition:none}}
`;

const shell = (h1: string, card: string): string => `<!doctype html>
<html lang="en-GB"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<meta name="referrer" content="no-referrer">
<title>${esc(COPY.title)} · QueryHawk</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600&amp;family=Source+Serif+4:opsz,wght@8..60,400;8..60,600&amp;family=Special+Elite&amp;display=swap">
<style>${STYLE}</style>
</head><body>
<header class="pnav"><div class="pin"><span class="pbrand">QueryHawk</span></div></header>
<main>
<div class="phero"><div class="pin"><h1>${esc(h1)}</h1></div></div>
<div class="pbody"><div class="pin"><div class="ucard">
${card}
</div></div></div>
</main>
</body></html>`;

export type PageView =
  | { kind: "bad"; signInUrl: string | null }
  | { kind: "error" }
  | { kind: "ok"; token: string; email: string | null; state: EmailState; done: { key: EmailKey; on: boolean } | null };

/**
 * The page. A plain form, no script: each switch is a submit button that flips that one email (the hosting CSP
 * allows no inline script, and a page that works without one cannot half-work).
 */
export function emailSettingsPage(v: PageView): string {
  switch (v.kind) {
    case "bad": {
      const link = v.signInUrl ? `<div class="acts"><a class="btn" href="${esc(v.signInUrl)}">${esc(COPY.signIn)}</a></div>` : "";
      return shell(COPY.title + ".", `<h2>${esc(COPY.badHeading)}</h2>\n<p>${esc(COPY.badBody)}</p>\n${link}`);
    }
    case "error":
      return shell(COPY.title + ".", `<h2>${esc(COPY.errorHeading)}</h2>\n<p>${esc(COPY.errorBody)}</p>`);
    case "ok": {
      const who = v.email ? `<b>${esc(v.email)}</b>` : "your account";
      const head = v.done
        ? `<h2>${esc(`${LABEL[v.done.key]} ${VERB[v.done.key]} ${v.done.on ? "on" : "off"}.`)}</h2>\n<p>${esc(COPY.doneFor)} ${who}. ${esc(COPY.noSignIn)}</p>`
        : `<h2>${esc(COPY.intro)}</h2>\n<p>${esc(COPY.lookFor)} ${who}. ${esc(COPY.noSignIn)}</p>`;
      const rows = ROWS.map(([k, label, dsc]) => {
        const on = v.state[k];
        return `<div class="row"><div><div class="lbl">${esc(label)}</div><div class="dsc">${esc(dsc)}</div></div>` +
          `<div class="ctl"><span class="togw" aria-hidden="true">${on ? "On" : "Off"}</span>` +
          `<button class="tog" type="submit" name="flip" value="${k}" role="switch" aria-checked="${on}" aria-label="${esc(label)}"></button></div></div>`;
      }).join("\n");
      return shell(headline(v.state),
        `${head}\n<form method="post" action="?t=${encodeURIComponent(v.token)}"><div class="rows">\n${rows}\n</div></form>\n<p class="quiet">${esc(COPY.always)}</p>`);
    }
    default: {
      const unhandled: never = v;
      throw new Error(`unknown view ${JSON.stringify(unhandled)}`);
    }
  }
}
