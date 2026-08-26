/**
 * emailTemplates — the two messages, rendered.
 *
 * Pure: a renderer takes URLs and figures and returns HTML and text. It never sends, never reads
 * config and never touches Firestore, so the whole of it is exercised in the root suite.
 *
 * ⚠️ A MESSAGE WITH A MISSING LINK IS NEVER SENT — `prepare*` returns a REFUSAL, not a message
 * with an empty href. Refusing is recoverable: somebody retries, or the config is fixed and it
 * runs again. A hundred invites carrying a dead link is not, and neither is a bulk send with no
 * unsubscribe route, which is a compliance failure as well as a broken promise. The refusal names
 * what was missing so the log says which value to set.
 *
 * ⚠️ NO IMAGES, NO EXTERNAL ASSETS, NO TRACKING PIXEL. Nothing to block, nothing to fail to load,
 * nothing that turns a plain message into a "this sender is watching you" one. It also means the
 * HTML and the text say exactly the same things, which is the only way to keep them in step.
 */

import { RenderedEmail } from "./email";
import { MailConfig, unsubscribeLink, verifyLink } from "./emailConfig";
import {
  CONFIRM_CTA, CONFIRM_EXPIRY, CONFIRM_HEADING, CONFIRM_LEAD, CONFIRM_NEXT, CONFIRM_NOT_HELD,
  CONFIRM_NOT_YOU, CONFIRM_SUBJECT, SIGN_OFF, UNSUBSCRIBE_LABEL, UNSUBSCRIBE_NOTE,
  WELCOME_HEADING, WELCOME_NEXT, WELCOME_NO_DATE, WELCOME_PERKS, WELCOME_SUBJECT,
  contactLine, welcomeLead,
} from "./emailCopy";

/* ══════════════ Refusal ══════════════ */

export type Prepared =
  | { ok: true; email: RenderedEmail }
  /** `missing` names the values that were absent, for the log. Never shown to a reader. */
  | { ok: false; missing: string[] };

/* ══════════════ Markup ══════════════ */

/** ⚠️ Copy is ours, but it is still interpolated into markup — escape it rather than trust it. */
const esc = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const INK = "#2e2722";
const MUTED = "#6d5348";
const BURG = "#7c3a2a";

const p = (text: string, colour = INK) =>
  `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:${colour}">${esc(text)}</p>`;

const button = (href: string, label: string) =>
  `<p style="margin:0 0 12px"><a href="${esc(href)}" ` +
  `style="display:inline-block;background:${BURG};color:#fdfaf5;text-decoration:none;` +
  `font-size:16px;font-weight:600;padding:13px 26px;border-radius:10px">${esc(label)}</a></p>`;

/**
 * ⚠️ THE RAW URL IS PRINTED BENEATH THE BUTTON. Some clients strip or rewrite anchors, some
 * readers do not trust a button, and a security gateway may show the text but not the link. A
 * verify link nobody can reach is a founding place lost.
 */
const rawLink = (href: string) =>
  `<p style="margin:0 0 24px;font-size:13px;line-height:1.5;color:${MUTED};word-break:break-all">` +
  `${esc(href)}</p>`;

const foot = (unsubUrl: string, contact: string) =>
  `<hr style="border:none;border-top:1px solid #e7ddd2;margin:28px 0 18px">` +
  `<p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:${MUTED}">` +
  `${esc(contactLine(contact))}</p>` +
  `<p style="margin:0;font-size:13px;line-height:1.6;color:${MUTED}">` +
  `<a href="${esc(unsubUrl)}" style="color:${MUTED}">${esc(UNSUBSCRIBE_LABEL)}</a>` +
  ` — ${esc(UNSUBSCRIBE_NOTE)}</p>`;

const shell = (heading: string, inner: string) =>
  `<div style="background:#f7f4ee;padding:28px 16px">` +
  `<div style="max-width:560px;margin:0 auto;background:#fffefb;border:1px solid #e7ddd2;` +
  `border-radius:14px;padding:32px 30px;font-family:-apple-system,BlinkMacSystemFont,` +
  `'Segoe UI',Helvetica,Arial,sans-serif">` +
  `<h1 style="margin:0 0 18px;font-size:22px;line-height:1.3;color:${INK};font-weight:600">` +
  `${esc(heading)}</h1>${inner}</div></div>`;

const textFoot = (unsubUrl: string, contact: string) =>
  `\n---\n${contactLine(contact)}\n\n${UNSUBSCRIBE_LABEL}: ${unsubUrl}\n${UNSUBSCRIBE_NOTE}\n`;

/* ══════════════ A · Confirm your place ══════════════ */

export const prepareConfirm = (
  cfg: MailConfig, verifyToken: string, unsubToken: string,
): Prepared => {
  const verifyUrl = verifyLink(cfg, verifyToken);
  const unsubUrl = unsubscribeLink(cfg, unsubToken);
  const missing = [
    ...(verifyUrl ? [] : ["verifyUrl"]),
    ...(unsubUrl ? [] : ["unsubscribeUrl"]),
  ];
  /* ⚠️ EITHER LINK MISSING REFUSES THE WHOLE MESSAGE. A confirmation with no verify link asks for
     an action it does not offer; one with no unsubscribe link is not a message we may lawfully
     send. Neither degrades — both refuse. */
  if (missing.length) return { ok: false, missing };

  return {
    ok: true,
    email: {
      subject: CONFIRM_SUBJECT,
      html: shell(CONFIRM_HEADING,
        p(CONFIRM_LEAD) +
        button(verifyUrl!, CONFIRM_CTA) +
        rawLink(verifyUrl!) +
        p(CONFIRM_EXPIRY, MUTED) +
        p(CONFIRM_NOT_HELD) +
        p(CONFIRM_NEXT) +
        p(CONFIRM_NOT_YOU, MUTED) +
        p(SIGN_OFF, MUTED) +
        foot(unsubUrl!, cfg.contactEmail)),
      text: [
        CONFIRM_HEADING, "", CONFIRM_LEAD, "",
        `${CONFIRM_CTA}: ${verifyUrl}`, "",
        CONFIRM_EXPIRY, "", CONFIRM_NOT_HELD, "", CONFIRM_NEXT, "", CONFIRM_NOT_YOU, "", SIGN_OFF,
      ].join("\n") + textFoot(unsubUrl!, cfg.contactEmail),
    },
  };
};

/* ══════════════ B · You're in ══════════════ */

export const prepareWelcome = (
  cfg: MailConfig, position: number, cap: number, unsubToken: string,
): Prepared => {
  const unsubUrl = unsubscribeLink(cfg, unsubToken);
  if (!unsubUrl) return { ok: false, missing: ["unsubscribeUrl"] };

  const lead = welcomeLead(position, cap);
  const perks = WELCOME_PERKS;
  return {
    ok: true,
    email: {
      subject: WELCOME_SUBJECT,
      html: shell(WELCOME_HEADING,
        p(lead) +
        p(WELCOME_NEXT) +
        p(WELCOME_NO_DATE) +
        `<ul style="margin:0 0 16px;padding-left:20px;font-size:16px;line-height:1.7;color:${INK}">` +
        perks.map((k) => `<li>${esc(k)}</li>`).join("") + `</ul>` +
        p(SIGN_OFF, MUTED) +
        foot(unsubUrl, cfg.contactEmail)),
      text: [
        WELCOME_HEADING, "", lead, "", WELCOME_NEXT, "", WELCOME_NO_DATE, "",
        ...perks.map((k) => `- ${k}`), "", SIGN_OFF,
      ].join("\n") + textFoot(unsubUrl, cfg.contactEmail),
    },
  };
};
