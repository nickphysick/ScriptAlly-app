/**
 * emailTemplates — the three messages, rendered (founding emails v1, 1 Nov; ref
 * design-refs/founding-emails-v1.html, "Proposed").
 *
 * Pure: a renderer takes URLs and figures and returns HTML and text. It never sends, never reads
 * config and never touches Firestore, so the whole of it is exercised in the root suite.
 *
 * ⚠️ A MESSAGE WITH A MISSING LINK IS NEVER SENT — `prepare*` returns a REFUSAL, not a message
 * with an empty href. Refusing is recoverable; a hundred invites carrying a dead link is not, and
 * neither is a send with no unsubscribe route. The refusal names what was missing for the log.
 *
 * ⚠️ BUILT FOR THE CLIENTS THAT RENDER WORST: Gmail (web and iOS), Apple Mail and Outlook.
 *  - Tables and inline styles only. No class, no <style> block, no flex, no absolute positioning,
 *    no SVG, no rgba (Outlook drops it; every translucent ink in the ref is precomputed as a hex
 *    on the ground it sits on).
 *  - No web font is relied on: every face names its fallback — the typewriter falls back to
 *    Courier New, the serif to Georgia, the handwritten "Nick" to cursive.
 *  - Images are PNG, absolute https URLs on the configured public origin (queryhawk.net on prod),
 *    with width, height and an empty alt. Rounded corners are decoration: Outlook squares them.
 *  - Outlook on Windows ignores max-width, so the 560px column is pinned there by an MSO-only table.
 *
 * ⚠️ NO TRACKING PIXEL, AND THE TEXT VERSION SAYS THE SAME WORDS. Two images, both content.
 *
 * ⚠️ THE CONFIRM LINK IS ALSO PRINTED AS TEXT, small and muted, under the button. The ref does not
 * draw it; it stays because some clients and security gateways strip or rewrite buttons, and a
 * verify link nobody can reach is a founding place lost. It adds no words, only the URL.
 */

import { RenderedEmail } from "./email";
import { APP_PATHS, MailConfig, appLink, inviteLink, unsubscribeLink, verifyLink } from "./emailConfig";
import {
  BRAND_NAME, CONFIRM_CTA, CONFIRM_EXPIRY, CONFIRM_HEADING, CONFIRM_LEAD, CONFIRM_NEXT,
  CONFIRM_LINK_HELP, CONFIRM_NOT_HELD, CONFIRM_NOT_YOU, CONFIRM_PREHEADER, CONFIRM_SUBJECT, FOOT_LINE, PASS_LABEL,
  SIGNATURE_NAME, SIGNATURE_ROLE, UNSUBSCRIBE_LABEL, UNSUBSCRIBE_NOTE, UNSUBSCRIBE_NOTE_WAITING,
  WAITING_HEADING, WAITING_LEAD, WAITING_NOTE, WAITING_NOTHING_TO_DO, WAITING_PASS,
  WAITING_PREHEADER, WAITING_SORRY, WAITING_SUBJECT, WELCOME_GET_HEADING, WELCOME_HEADING,
  WELCOME_LEAD, WELCOME_NEXT, WELCOME_NEXT_HEADING, WELCOME_NOTE, WELCOME_PERKS, WELCOME_PREHEADER,
  contactLine, contactText, passNumber, passOf, welcomeSubject,
  ACCOUNT_REASON, EMAIL_SETTINGS_LABEL, accountContactLine, accountContactText,
  INVITE_CTA, INVITE_EXPIRY, INVITE_FIRST, INVITE_FIRST_HEADING, INVITE_HEADING, INVITE_LEAD, INVITE_PREHEADER,
  INVITE_SUBJECT, INVITE_THEN, INVITE_THEN_HEADING, UNSUBSCRIBE_NOTE_INVITE, inviteCodeNote,
  SIGNIN_CTA, SIGNIN_EXPIRY, SIGNIN_HEADING, SIGNIN_LEAD, SIGNIN_NOT_YOU, SIGNIN_PREHEADER, SIGNIN_SUBJECT,
  RESET_CTA, RESET_EXPIRY, RESET_HEADING, RESET_LEAD, RESET_NOT_YOU, RESET_PREHEADER, RESET_SUBJECT,
  NEW_EMAIL_CTA, NEW_EMAIL_EXPIRY, NEW_EMAIL_HEADING, NEW_EMAIL_LEAD, NEW_EMAIL_NOT_YOU, NEW_EMAIL_PREHEADER,
  NEW_EMAIL_SUBJECT,
  EMAIL_CHANGED_FINE, EMAIL_CHANGED_FROM, EMAIL_CHANGED_HEADING, EMAIL_CHANGED_LEAD, EMAIL_CHANGED_NOT_YOU,
  EMAIL_CHANGED_PREHEADER, EMAIL_CHANGED_SUBJECT, EMAIL_CHANGED_TO, EMAIL_CHANGED_WHEN,
  NUDGE_AGENT, NUDGE_CHANGE_WHEN, NUDGE_CTA, NUDGE_EXPECTED, NUDGE_HEARD, NUDGE_MANUSCRIPT, NUDGE_NO_REPLY,
  NUDGE_SENT, NUDGE_SINCE, NUDGE_TURN_OFF, nudgeHeading, nudgePreheader, nudgeSetting, nudgeSubject,
  WEEKLY_COMING, WEEKLY_CTA, WEEKLY_HAPPENED, WEEKLY_OUT, WEEKLY_QUIET, WEEKLY_REQUESTS, WEEKLY_TURN_OFF,
  comingNudge, comingReplies, comingSend, happenedNo, happenedOffer, happenedRequest, happenedSent,
  weeklyHeading, weeklyPreheader, weeklyRequestsValue, weeklySubject,
  TRIAL_CTA, TRIAL_HAPPY, TRIAL_KEEPS, TRIAL_KEEPS_HEADING, TRIAL_PREHEADER, TRIAL_READ_ONLY,
  TRIAL_READ_ONLY_HEADING, trialHeading, trialLead, trialPro, trialSubject,
  PLAN_CTA, PLAN_ENDS, PLAN_FINISHED, PLAN_LABEL, PLAN_STOP, PLAN_THEN, planEndingHeading, planEndingLead,
  planEndingPreheader, planEndingSubject, planStopValue, planThenValue, planValue,
} from "./emailCopy";

/* ══════════════ Refusal ══════════════ */

export type Prepared =
  | { ok: true; email: RenderedEmail }
  /** `missing` names the values that were absent, for the log. Never shown to a reader. */
  | { ok: false; missing: string[] };

/* ══════════════ Images ══════════════ */

/** Paths under the public origin. The version is the first eight hex digits of the file's md5. */
/* The pass, the headings and the signature as images (privacy page v1, phase 2): email clients load no
   web fonts, so the typewriter fell back to Courier. Built by scripts/email-images/build.mjs. */
import { EMAIL_IMAGES, type EmailImage } from "./emailImageManifest";

export const EMAIL_LOGO = { path: "/images/email/queryhawk-logo-60.png", version: "54b8f898", width: 30, height: 30 };
export const EMAIL_BIRD = { path: "/images/founding-pass-bird-email.png", version: "3f3032f7", width: 170, height: 120 };

const asset = (cfg: MailConfig, a: { path: string; version: string }): string | null => {
  if (!cfg.publicUrl) return null;
  try {
    const url = new URL(a.path, cfg.publicUrl);
    if (a.version) url.searchParams.set("v", a.version);
    return url.toString();
  } catch {
    return null;
  }
};

/* ══════════════ Tokens of the look ══════════════ */

const INK = "#1c130f";
/** rgba(28,19,15,.74) on the card #fffefb. */
const BODY = "#57504c";
/** rgba(28,19,15,.55) on the card. */
const MUTED = "#827d79";
/** rgba(28,19,15,.6) and .5 on the ground #f2eee8. */
const FOOT_INK = "#726b66";
const FOOT_FAINT = "#87807c";
/** rgba(28,19,15,.22) on the card: the tear line. */
const TEAR = "#cdcac7";
const GROUND = "#f2eee8";
const CARD = "#fffefb";
const NAVY = "#2a3a52";
const PANEL = "#f7ece6";
const BLUSH = "#e8b4a3";
const STUB_INK = "#7a3420";
const RUST = "#a2452a";

const TYPE = "'Special Elite','Courier New',Courier,monospace";
const SERIF = "'Source Serif 4',Georgia,'Times New Roman',serif";
const SANS = "'Source Sans 3',Helvetica,Arial,sans-serif";

/** ⚠️ Copy is ours, but it is still interpolated into markup — escape it rather than trust it. */
const esc = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const TABLE = `role="presentation" cellpadding="0" cellspacing="0" border="0"`;

/* ══════════════ Parts ══════════════ */

const para = (html: string, o: { size?: number; colour?: string; margin?: string } = {}) =>
  `<p style="margin:${o.margin ?? "0 0 16px"};font-family:${SERIF};font-size:${o.size ?? 16.5}px;` +
  `line-height:1.6;color:${o.colour ?? BODY}">${html}</p>`;

/** A heading, as its image (the typewriter line and the navy rule are in the picture); the alt is the text. */
const headingImg = (cfg: MailConfig, img: EmailImage) =>
  `<img src="${esc(asset(cfg, img)!)}" width="${img.width}" height="${img.height}" alt="${esc(img.alt)}" ` +
  `style="display:block;width:100%;max-width:${img.width}px;height:auto;border:0;margin:0 0 20px;` +
  `font-family:${SERIF};font-size:24px;font-weight:700;line-height:1.25;color:${INK}">`;

/** ⚠️ IN THE SERIF, NOT THE TYPEWRITER (privacy page v1): a live typewriter line is Courier in every email
   client (EM-7), and these two have no image of their own. */
const subheading = (text: string, margin = "0 0 8px") =>
  `<h2 style="margin:${margin};font-family:${SERIF};font-size:18px;line-height:1.3;font-weight:600;color:${INK}">` +
  `${esc(text)}</h2>`;

const button = (href: string, label: string) =>
  `<table ${TABLE} style="margin:6px 0 10px"><tr><td bgcolor="${NAVY}" style="background:${NAVY};border-radius:12px">` +
  `<a href="${esc(href)}" style="display:inline-block;padding:16px 30px;font-family:${SERIF};font-size:17px;` +
  `font-weight:600;line-height:1.2;color:#ffffff;text-decoration:none;border-radius:12px">${esc(label)}</a>` +
  `</td></tr></table>`;

const note = (bold: string, rest: string) =>
  `<table ${TABLE} width="100%" style="margin:8px 0 22px"><tr><td bgcolor="${PANEL}" ` +
  `style="background:${PANEL};border-radius:14px;padding:16px 18px">` +
  `<p style="margin:0;font-family:${SERIF};font-size:15.5px;line-height:1.6;color:${INK}">` +
  `<b>${esc(bold)}</b>${esc(rest)}</p></td></tr></table>`;

/** ⚠️ THE SIGN-OFF IS AN IMAGE (privacy page v1): "Nick" in the typewriter face, which no client loads as
   text. Its alt is "Nick", so it still reads with images off. */
const signature = (cfg: MailConfig, margin = "0 0 2px") => {
  const img = EMAIL_IMAGES["signature-nick"];
  return `<img src="${esc(asset(cfg, img)!)}" width="${img.width}" height="${img.height}" alt="${esc(img.alt)}" ` +
    `style="display:block;border:0;margin:${margin};font-family:${SERIF};font-size:20px;color:${INK}">` +
    `<p style="margin:0;font-family:${SERIF};font-size:14px;line-height:1.6;color:${MUTED}">${esc(SIGNATURE_ROLE)}</p>`;
};

/** "✓" in rust in its own cell: no SVG and no image, so it survives every client. */
const ticks = (rows: readonly (readonly [string, string])[]) =>
  `<table ${TABLE} style="margin:0 0 20px">` +
  rows.map(([b, rest]) =>
    `<tr><td valign="top" style="padding:5px 10px 5px 0;font-family:${SANS};font-size:16px;line-height:1.45;` +
    `font-weight:700;color:${RUST}">&#10003;</td>` +
    `<td style="padding:5px 0;font-family:${SERIF};font-size:16px;line-height:1.45;color:${INK}">` +
    `<b>${esc(b)}</b>${esc(rest)}</td></tr>`).join("") +
  `</table>`;

/**
 * The pass at the top of the card: a blush stub with the label and the big line on the left and the
 * bird on the right, in table cells. ⚠️ THE BIRD IS FULLY INSIDE THE STUB — its own cell, 14px from
 * the right and 6px from the bottom — because an email cannot position it over the edge and crop it
 * the way the page does (Outlook ignores absolute positioning and overflow).
 */
const pass = (cfg: MailConfig, big: string, small: string | null) => {
  const bird = asset(cfg, EMAIL_BIRD)!;
  return (
    `<tr><td bgcolor="${BLUSH}" style="background:${BLUSH};border-radius:18px 18px 0 0">` +
    `<table ${TABLE} width="100%"><tr>` +
    `<td valign="top" style="padding:22px 8px 18px 26px">` +
    /* The label in sentence case, in the serif: no small capitals anywhere on the pass. */
    `<p style="margin:0 0 6px;font-family:${SERIF};font-size:15px;line-height:1.2;font-weight:600;` +
    `color:${STUB_INK}">${esc(PASS_LABEL)}</p>` +
    `<p style="margin:0;font-family:${TYPE};font-size:46px;line-height:1.05;color:${INK}">` +
    (small ? `<span style="white-space:nowrap">${esc(big)}</span>` : esc(big)) +
    (small ? ` <span style="font-family:${SANS};font-size:15px;font-weight:600;color:${STUB_INK};white-space:nowrap">${esc(small)}</span>` : "") +
    `</p></td>` +
    /* 40% of the card, the bird at most 170px inside it: 170 on a desktop, ~125 on a 375px phone,
       where a fixed 184px cell would leave "No. 14" no room. Outlook reads the width attribute. */
    `<td width="40%" height="134" valign="bottom" align="right" style="height:134px;padding:0 14px 6px 0">` +
    `<img src="${esc(bird)}" width="${EMAIL_BIRD.width}" height="${EMAIL_BIRD.height}" alt="" ` +
    `style="display:block;width:100%;max-width:${EMAIL_BIRD.width}px;height:auto;border:0"></td>` +
    `</tr></table></td></tr>` +
    `<tr><td style="padding:0 18px"><div style="height:0;border-top:2px dashed ${TEAR};font-size:0;line-height:0">&nbsp;</div></td></tr>`
  );
};

/** The pass as its image, the full card width, then the dashed tear. With images off the alt reads on blush. */
const passImg = (cfg: MailConfig, img: EmailImage) =>
  `<tr><td bgcolor="${BLUSH}" style="background:${BLUSH};border-radius:18px 18px 0 0;line-height:0;font-size:0">` +
  `<img src="${esc(asset(cfg, img)!)}" width="${img.width}" height="${img.height}" alt="${esc(img.alt)}" ` +
  `style="display:block;width:100%;max-width:${img.width}px;height:auto;border:0;border-radius:18px 18px 0 0;` +
  `font-family:${SERIF};font-size:16px;font-weight:600;line-height:1.5;color:${INK}"></td></tr>` +
  `<tr><td style="padding:0 18px"><div style="height:0;border-top:2px dashed ${TEAR};font-size:0;line-height:0">&nbsp;</div></td></tr>`;

/** The writer's numbered pass, or null when the number has no image (outside 1–50). */
export const passImageFor = (n: number): EmailImage | null =>
  Number.isInteger(n) && n >= 1 && n <= 50 ? EMAIL_IMAGES[`pass-${String(n).padStart(2, "0")}`] ?? null : null;

const preheader = (text: string) =>
  `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${GROUND}">` +
  `${esc(text)}${"&#8199;&#847;".repeat(40)}</div>`;

const footer = (cfg: MailConfig, unsubUrl: string, unsubNote: string) => {
  const [a, addr, b] = contactLine(cfg.contactEmail);
  return (
    `<tr><td style="padding:18px 26px 0">` +
    `<p style="margin:0 0 8px;font-family:${SERIF};font-size:13.5px;line-height:1.6;color:${FOOT_INK}">` +
    `${esc(a)}<a href="mailto:${esc(addr)}" style="color:${FOOT_INK};text-decoration:underline">${esc(addr)}</a>${esc(b)}</p>` +
    `<p style="margin:0;font-family:${SANS};font-size:12.5px;line-height:1.55;color:${FOOT_FAINT}">` +
    `<a href="${esc(unsubUrl)}" style="color:${FOOT_FAINT};text-decoration:underline">${esc(UNSUBSCRIBE_LABEL)}</a>` +
    ` · ${esc(unsubNote)}<br>${esc(FOOT_LINE)}</p></td></tr>`
  );
};

/** The whole message: ground, logo row, card (with an optional pass), footer. `foot` replaces the founding footer. */
const shell = (cfg: MailConfig, o: {
  preheader: string; pass?: string; body: string; unsubUrl?: string; unsubNote?: string; foot?: string;
}) => {
  const logo = asset(cfg, EMAIL_LOGO)!;
  return (
    `<!doctype html><html lang="en-GB"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<meta name="x-apple-disable-message-reformatting"><title></title></head>` +
    `<body style="margin:0;padding:0;background:${GROUND}">` +
    preheader(o.preheader) +
    `<table ${TABLE} width="100%" bgcolor="${GROUND}" style="background:${GROUND}"><tr><td align="center" style="padding:26px 14px 30px">` +
    `<!--[if mso]><table ${TABLE} width="560" align="center"><tr><td><![endif]-->` +
    `<table ${TABLE} width="100%" style="max-width:560px;margin:0 auto">` +
    `<tr><td style="padding:0 6px 14px"><table ${TABLE}><tr>` +
    `<td valign="middle" style="padding-right:8px"><img src="${esc(logo)}" width="${EMAIL_LOGO.width}" height="${EMAIL_LOGO.height}" alt="" style="display:block;border:0"></td>` +
    `<td valign="middle" style="font-family:Georgia,serif;font-size:19px;font-weight:600;color:${INK}">${esc(BRAND_NAME)}</td>` +
    `</tr></table></td></tr>` +
    `<tr><td bgcolor="${CARD}" style="background:${CARD};border-radius:18px">` +
    `<table ${TABLE} width="100%">` + (o.pass ?? "") +
    `<tr><td style="padding:30px 28px 28px">${o.body}</td></tr></table>` +
    `</td></tr>` +
    (o.foot ?? footer(cfg, o.unsubUrl!, o.unsubNote!)) +
    `</table>` +
    `<!--[if mso]></td></tr></table><![endif]-->` +
    `</td></tr></table></body></html>`
  );
};

const textFoot = (cfg: MailConfig, unsubUrl: string, unsubNote: string) =>
  `\n\n---\n${contactText(cfg.contactEmail)}\n\n${UNSUBSCRIBE_LABEL}: ${unsubUrl}\n${unsubNote}\n${FOOT_LINE}\n`;

const textSignature = `${SIGNATURE_NAME}\n${SIGNATURE_ROLE}`;

const needsImages = (cfg: MailConfig) =>
  asset(cfg, EMAIL_LOGO) && asset(cfg, EMAIL_BIRD) ? [] : ["imageUrl"];

/**
 * RFC 2369 + RFC 8058 (launch readiness, 2 Nov): the message's own unsubscribe link as a header, and the
 * one-click POST marker. A mail client's Unsubscribe button POSTs `List-Unsubscribe=One-Click` to the
 * URL, which the waitlist function accepts (as it does a GET from the link in the footer).
 */
export const listUnsubscribe = (unsubUrl: string): Record<string, string> => ({
  "List-Unsubscribe": `<${unsubUrl}>`,
  "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
});

/* ══════════════ 1 · Confirm your place ══════════════ */

export const prepareConfirm = (
  cfg: MailConfig, verifyToken: string, unsubToken: string,
): Prepared => {
  const verifyUrl = verifyLink(cfg, verifyToken);
  const unsubUrl = unsubscribeLink(cfg, unsubToken);
  const missing = [
    ...(verifyUrl ? [] : ["verifyUrl"]),
    ...(unsubUrl ? [] : ["unsubscribeUrl"]),
    ...needsImages(cfg),
  ];
  /* ⚠️ EITHER LINK MISSING REFUSES THE WHOLE MESSAGE. A confirmation with no verify link asks for
     an action it does not offer; one with no unsubscribe link is not a message we may lawfully
     send. Neither degrades — both refuse. */
  if (missing.length) return { ok: false, missing };

  /* confirm-email-v2 (privacy page v1): the pending pass, the heading as an image, the button with its arrow,
     the note, the sign-off, then under a hairline the "didn't ask" line and the link as text for when the
     button won't work (the bare link no longer sits under the button). */
  const body =
    headingImg(cfg, EMAIL_IMAGES["heading-confirm"]) +
    para(esc(CONFIRM_LEAD)) +
    button(verifyUrl!, `${CONFIRM_CTA}\u00a0 →`) +
    para(esc(CONFIRM_EXPIRY), { size: 14, colour: MUTED, margin: "0 0 22px" }) +
    note(CONFIRM_NOT_HELD[0], CONFIRM_NOT_HELD[1]) +
    para(esc(CONFIRM_NEXT)) +
    signature(cfg, "18px 0 2px") +
    `<table ${TABLE} width="100%" style="margin:22px 0 0"><tr><td style="border-top:1px solid #ece6de;padding-top:14px">` +
    para(esc(CONFIRM_NOT_YOU), { size: 14, colour: MUTED, margin: "0 0 10px" }) +
    `<p style="margin:0;font-family:${SANS};font-size:12.5px;line-height:1.5;color:${MUTED}">${esc(CONFIRM_LINK_HELP)}<br>` +
    `<a href="${esc(verifyUrl!)}" style="color:${NAVY};text-decoration:none;word-break:break-all">${esc(verifyUrl!)}</a></p>` +
    `</td></tr></table>`;

  return {
    ok: true,
    email: {
      headers: listUnsubscribe(unsubUrl!),
      subject: CONFIRM_SUBJECT,
      html: shell(cfg, {
        preheader: CONFIRM_PREHEADER, pass: passImg(cfg, EMAIL_IMAGES["pass-pending"]),
        body, unsubUrl: unsubUrl!, unsubNote: UNSUBSCRIBE_NOTE,
      }),
      text: [
        CONFIRM_HEADING, "", CONFIRM_LEAD, "",
        `${CONFIRM_CTA}: ${verifyUrl}`, "",
        CONFIRM_EXPIRY, "", CONFIRM_NOT_HELD.join(""), "", CONFIRM_NEXT, "", textSignature, "", CONFIRM_NOT_YOU,
      ].join("\n") + textFoot(cfg, unsubUrl!, UNSUBSCRIBE_NOTE),
    },
  };
};

/* ══════════════ 2 · You're in ══════════════ */

/** `position` is the writer's STORED founding number, as the verify transaction returned it. */
export const prepareWelcome = (
  cfg: MailConfig, position: number, cap: number, unsubToken: string,
): Prepared => {
  const unsubUrl = unsubscribeLink(cfg, unsubToken);
  const missing = [...(unsubUrl ? [] : ["unsubscribeUrl"]), ...needsImages(cfg)];
  if (missing.length) return { ok: false, missing };

  /* ⚠️ THE PASS IMAGE IS THE STORED NUMBER'S OWN FILE. A number with no image (outside 1–50) falls back to
     the HTML pass, logged, rather than showing somebody else's number. */
  const passImage = passImageFor(position);
  if (!passImage) console.warn(`[email] welcome: no pass image for No. ${position}; using the HTML pass`);
  const body =
    headingImg(cfg, EMAIL_IMAGES["heading-welcome"]) +
    para(esc(WELCOME_LEAD), { margin: "0 0 20px" }) +
    `<table ${TABLE} width="100%" style="margin:6px 0 24px"><tr>` +
    `<td style="border-left:3px solid ${BLUSH};padding:2px 0 2px 18px">` +
    WELCOME_NOTE.map((t, i) => para(esc(t), { colour: INK, margin: i === WELCOME_NOTE.length - 1 ? "0 0 10px" : "0 0 12px" })).join("") +
    signature(cfg) +
    `</td></tr></table>` +
    subheading(WELCOME_GET_HEADING) +
    ticks(WELCOME_PERKS) +
    subheading(WELCOME_NEXT_HEADING, "6px 0 8px") +
    WELCOME_NEXT.map((t) => para(esc(t))).join("");

  return {
    ok: true,
    email: {
      headers: listUnsubscribe(unsubUrl!),
      subject: welcomeSubject(position),
      html: shell(cfg, {
        preheader: WELCOME_PREHEADER,
        pass: passImage ? passImg(cfg, passImage) : pass(cfg, passNumber(position), passOf(cap)),
        body, unsubUrl: unsubUrl!, unsubNote: UNSUBSCRIBE_NOTE,
      }),
      text: [
        `${PASS_LABEL}: ${passNumber(position)} ${passOf(cap)}`, "",
        WELCOME_HEADING, "", WELCOME_LEAD, "",
        ...WELCOME_NOTE.flatMap((t) => [t, ""]), textSignature, "",
        WELCOME_GET_HEADING, ...WELCOME_PERKS.map(([b, r]) => `✓ ${b}${r}`), "",
        WELCOME_NEXT_HEADING, ...WELCOME_NEXT.flatMap((t) => [t, ""]),
      ].join("\n").trimEnd() + textFoot(cfg, unsubUrl!, UNSUBSCRIBE_NOTE),
    },
  };
};

/* ══════════════ 3 · Waiting list ══════════════ */

export const prepareWaiting = (cfg: MailConfig, unsubToken: string): Prepared => {
  const unsubUrl = unsubscribeLink(cfg, unsubToken);
  const missing = [...(unsubUrl ? [] : ["unsubscribeUrl"]), ...needsImages(cfg)];
  if (missing.length) return { ok: false, missing };

  const body =
    headingImg(cfg, EMAIL_IMAGES["heading-waiting"]) +
    para(esc(WAITING_LEAD)) +
    note(WAITING_NOTE[0], WAITING_NOTE[1]) +
    para(esc(WAITING_NOTHING_TO_DO)) +
    para(esc(WAITING_SORRY), { margin: "8px 0 4px" }) +
    signature(cfg, "0 0 4px");

  return {
    ok: true,
    email: {
      headers: listUnsubscribe(unsubUrl!),
      subject: WAITING_SUBJECT,
      html: shell(cfg, {
        preheader: WAITING_PREHEADER, pass: passImg(cfg, EMAIL_IMAGES["pass-waiting"]),
        body, unsubUrl: unsubUrl!, unsubNote: UNSUBSCRIBE_NOTE_WAITING,
      }),
      text: [
        `${PASS_LABEL}: ${WAITING_PASS}`, "",
        WAITING_HEADING, "", WAITING_LEAD, "", WAITING_NOTE.join(""), "",
        WAITING_NOTHING_TO_DO, "", WAITING_SORRY, "", textSignature,
      ].join("\n") + textFoot(cfg, unsubUrl!, UNSUBSCRIBE_NOTE_WAITING),
    },
  };
};


/* ══════════════════════════════════════════════════════════════════════════════════════════════════════
   NON-WORKSPACE v1 (12 Nov): nine more, on the same shell (ref design-refs/emails-v1.html).
   ⚠️ THE HEADINGS ARE LIVE SERIF TEXT, NOT THE REF'S TYPEWRITER. EM-7 holds for every email: a live typewriter
      line is Courier in every client, and these headings carry names and dates, so they cannot be pre-drawn
      images the way the founding headings are. The navy rule under each is the ref's, as a table cell.
   ⚠️ THE ACTION LINK IS PRINTED UNDER THE EXPIRY LINE, small and muted, as the ref draws it.
   ══════════════════════════════════════════════════════════════════════════════════════════════════════ */

const heading1 = (text: string) =>
  `<h1 style="margin:0 0 14px;font-family:${SERIF};font-size:27px;line-height:1.25;font-weight:600;color:${INK}">${esc(text)}</h1>` +
  `<table ${TABLE} style="margin:0 0 20px"><tr><td width="44" height="3" bgcolor="${NAVY}" ` +
  `style="width:44px;height:3px;background:${NAVY};border-radius:3px;font-size:0;line-height:0">&nbsp;</td></tr></table>`;

const small = (text: string, margin = "0 0 4px") => para(esc(text), { size: 14.5, colour: MUTED, margin });

const linkLine = (url: string) =>
  `<p style="margin:0 0 20px;font-family:${SANS};font-size:11.5px;line-height:1.5;color:${MUTED};word-break:break-all">` +
  `<a href="${esc(url)}" style="color:${MUTED};text-decoration:none;word-break:break-all">${esc(url)}</a></p>`;

/** A list: "✓" or "•" in rust in its own cell, then an optional bold lead and the rest. */
const list = (rows: readonly (readonly [string, string])[], mark: "tick" | "dot") =>
  `<table ${TABLE} style="margin:0 0 20px">` +
  rows.map(([b, rest]) =>
    `<tr><td valign="top" style="padding:5px 10px 5px 0;font-family:${SANS};font-size:16px;line-height:1.45;` +
    `font-weight:700;color:${RUST}">${mark === "tick" ? "&#10003;" : "&#8226;"}</td>` +
    `<td style="padding:5px 0;font-family:${SERIF};font-size:16px;line-height:1.45;color:${INK}">` +
    `${b ? `<b>${esc(b)}</b>` : ""}${esc(rest)}</td></tr>`).join("") +
  `</table>`;
const textList = (rows: readonly (readonly [string, string])[], mark: "tick" | "dot") =>
  rows.map(([b, r]) => `${mark === "tick" ? "✓" : "•"} ${b}${r}`);

/** The facts table: a hairline box, label left in muted serif, value right; the value is already-escaped HTML. */
const facts = (rows: readonly (readonly [string, string])[]) =>
  `<table ${TABLE} width="100%" style="margin:4px 0 20px;border:1px solid #e6e0d8;border-radius:14px">` +
  `<tr><td style="padding:6px 18px"><table ${TABLE} width="100%">` +
  rows.map(([label, value], i) => {
    const rule = i ? "border-top:1px solid #efeae3;" : "";
    return `<tr><td valign="top" width="38%" style="padding:9px 10px 9px 0;font-family:${SERIF};font-size:15px;` +
      `line-height:1.45;color:${MUTED};${rule}">${esc(label)}</td>` +
      `<td valign="top" style="padding:9px 0;font-family:${SERIF};font-size:15.5px;line-height:1.45;color:${INK};${rule}">${value}</td></tr>`;
  }).join("") +
  `</table></td></tr></table>`;
const textFacts = (rows: readonly (readonly [string, string])[]) => rows.map(([l, v]) => `${l}: ${v}`);

const footLink = (url: string, label: string) =>
  `<a href="${esc(url)}" style="color:${FOOT_FAINT};text-decoration:underline">${esc(label)}</a>`;

/** The product's footer: the short contact line, then (account emails) why it came, or (reminders) the switches. */
const productFoot = (cfg: MailConfig, o: { reason: boolean; links: readonly (readonly [string, string])[] }) => {
  const [a, addr, b] = accountContactLine(cfg.contactEmail);
  return (
    `<tr><td style="padding:18px 26px 0">` +
    `<p style="margin:0 0 8px;font-family:${SERIF};font-size:13.5px;line-height:1.6;color:${FOOT_INK}">` +
    `${esc(a)}<a href="mailto:${esc(addr)}" style="color:${FOOT_INK};text-decoration:underline">${esc(addr)}</a>${esc(b)}</p>` +
    `<p style="margin:0;font-family:${SANS};font-size:12.5px;line-height:1.55;color:${FOOT_FAINT}">` +
    (o.reason ? `${esc(ACCOUNT_REASON)} ` : "") +
    o.links.map(([label, url]) => footLink(url, label)).join(" · ") +
    `<br>${esc(FOOT_LINE)}</p></td></tr>`
  );
};
const productTextFoot = (cfg: MailConfig, o: { reason: boolean; links: readonly (readonly [string, string])[] }) =>
  `\n\n---\n${accountContactText(cfg.contactEmail)}\n\n` +
  (o.reason ? `${ACCOUNT_REASON}\n` : "") +
  o.links.map(([label, url]) => `${label}: ${url}`).join("\n") + `\n${FOOT_LINE}\n`;

const needsLogo = (cfg: MailConfig) => (asset(cfg, EMAIL_LOGO) ? [] : ["imageUrl"]);
const need = (pairs: Record<string, unknown>): string[] => Object.entries(pairs).filter(([, v]) => !v).map(([k]) => k);

/* ══════════════ Shared helpers for names and dates ══════════════ */

/** "m•••@newmail.example": the first character, three dots, the whole domain. The old inbox sees enough to recognise it. */
export const maskEmail = (email: string): string => {
  const e = email.trim();
  const at = e.lastIndexOf("@");
  if (at < 1) return "•••";
  return `${e.charAt(0)}•••${e.slice(at)}`;
};

/** "Thursday 12 November, 6.47pm", in UK time. */
export const formatWhen = (ms: number): string => {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London", weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit", hour12: false,
  }).formatToParts(new Date(ms)).map((p) => [p.type, p.value]));
  const h24 = Number(parts.hour) % 24;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${parts.weekday} ${parts.day} ${parts.month}, ${h12}.${parts.minute}${h24 < 12 ? "am" : "pm"}`;
};

/** An agent as the emails name one: "Eleanor Whitfield, Greenfield Literary", or the name alone. */
export interface AgentRef { name: string; agency?: string | null }
const agentText = (a: AgentRef): string => (a.agency ? `${a.name}, ${a.agency}` : a.name);

/* ══════════════ 4 · The invite (founding; from Nick) ══════════════ */

export interface InviteArgs {
  /** The founder's code, already normalised: QH-XXXX-XXXX. */
  code: string;
  /** The writer's stored founding number, or null (then the email has no pass). */
  foundingNo: number | null;
  cap: number;
  /** The writer's waitlist unsubscribe token (`unsubscribeToken(docId, salt)`). */
  unsubToken: string;
}

export const prepareInvite = (cfg: MailConfig, a: InviteArgs): Prepared => {
  const joinUrl = inviteLink(cfg, a.code);
  const unsubUrl = unsubscribeLink(cfg, a.unsubToken);
  const missing = [...need({ joinUrl, unsubscribeUrl: unsubUrl }), ...needsImages(cfg)];
  if (missing.length) return { ok: false, missing };

  const n = a.foundingNo;
  const passImage = n != null ? passImageFor(n) : null;
  const passHtml = n == null ? undefined : passImage ? passImg(cfg, passImage) : pass(cfg, passNumber(n), passOf(a.cap));
  const [codeBold, codeRest] = inviteCodeNote(a.code);
  const body =
    heading1(INVITE_HEADING) +
    para(esc(INVITE_LEAD)) +
    button(joinUrl!, INVITE_CTA) +
    small(INVITE_EXPIRY, "0 0 6px") +
    linkLine(joinUrl!) +
    note(codeBold, codeRest) +
    subheading(INVITE_FIRST_HEADING) +
    list(INVITE_FIRST, "dot") +
    subheading(INVITE_THEN_HEADING, "6px 0 8px") +
    para(esc(INVITE_THEN), { margin: "0 0 4px" });

  return {
    ok: true,
    email: {
      headers: listUnsubscribe(unsubUrl!),
      subject: INVITE_SUBJECT,
      html: shell(cfg, { preheader: INVITE_PREHEADER, pass: passHtml, body, unsubUrl: unsubUrl!, unsubNote: UNSUBSCRIBE_NOTE_INVITE }),
      text: [
        ...(n != null ? [`${PASS_LABEL}: ${passNumber(n)} ${passOf(a.cap)}`, ""] : []),
        INVITE_HEADING, "", INVITE_LEAD, "",
        `${INVITE_CTA}: ${joinUrl}`, "", INVITE_EXPIRY, "",
        `${codeBold}${codeRest}`, "",
        INVITE_FIRST_HEADING, ...textList(INVITE_FIRST, "dot"), "",
        INVITE_THEN_HEADING, INVITE_THEN,
      ].join("\n") + textFoot(cfg, unsubUrl!, UNSUBSCRIBE_NOTE_INVITE),
    },
  };
};

/* ══════════════ 5–7 · The three action-link account emails ══════════════ */

interface ActionCopy {
  subject: string; preheader: string; heading: string; lead: string; cta: string; expiry: string; notYou: string;
}

const actionEmail = (cfg: MailConfig, c: ActionCopy, link: string | null): Prepared => {
  const settingsUrl = appLink(cfg, APP_PATHS.emailSettings);
  const missing = [...need({ link, settingsUrl }), ...needsLogo(cfg)];
  if (missing.length) return { ok: false, missing };
  const foot = { reason: true, links: [[EMAIL_SETTINGS_LABEL, settingsUrl!]] as const };
  const body =
    heading1(c.heading) + para(esc(c.lead)) + button(link!, c.cta) +
    small(c.expiry, "0 0 6px") + linkLine(link!) + small(c.notYou);
  return {
    ok: true,
    email: {
      subject: c.subject,
      html: shell(cfg, { preheader: c.preheader, body, foot: productFoot(cfg, foot) }),
      text: [c.heading, "", c.lead, "", `${c.cta}: ${link}`, "", c.expiry, "", c.notYou].join("\n") + productTextFoot(cfg, foot),
    },
  };
};

/** `link` is the Firebase action link the Admin SDK generated. */
export const prepareSignIn = (cfg: MailConfig, link: string | null): Prepared => actionEmail(cfg, {
  subject: SIGNIN_SUBJECT, preheader: SIGNIN_PREHEADER, heading: SIGNIN_HEADING, lead: SIGNIN_LEAD,
  cta: SIGNIN_CTA, expiry: SIGNIN_EXPIRY, notYou: SIGNIN_NOT_YOU,
}, link);

export const prepareReset = (cfg: MailConfig, link: string | null): Prepared => actionEmail(cfg, {
  subject: RESET_SUBJECT, preheader: RESET_PREHEADER, heading: RESET_HEADING, lead: RESET_LEAD,
  cta: RESET_CTA, expiry: RESET_EXPIRY, notYou: RESET_NOT_YOU,
}, link);

export const prepareNewEmail = (cfg: MailConfig, link: string | null): Prepared => actionEmail(cfg, {
  subject: NEW_EMAIL_SUBJECT, preheader: NEW_EMAIL_PREHEADER, heading: NEW_EMAIL_HEADING, lead: NEW_EMAIL_LEAD,
  cta: NEW_EMAIL_CTA, expiry: NEW_EMAIL_EXPIRY, notYou: NEW_EMAIL_NOT_YOU,
}, link);

/* ══════════════ 8 · The address was changed (to the OLD address) ══════════════ */

export interface EmailChangedArgs { oldEmail: string; newEmail: string; whenMs: number }

export const prepareEmailChanged = (cfg: MailConfig, a: EmailChangedArgs): Prepared => {
  const settingsUrl = appLink(cfg, APP_PATHS.emailSettings);
  const missing = [...need({ oldEmail: a.oldEmail, newEmail: a.newEmail, settingsUrl }), ...needsLogo(cfg)];
  if (missing.length) return { ok: false, missing };
  /* ⚠️ THE NEW ADDRESS IS PART-HIDDEN ON PURPOSE: this goes to an inbox that may no longer be the writer's. */
  const rows = [
    [EMAIL_CHANGED_FROM, a.oldEmail], [EMAIL_CHANGED_TO, maskEmail(a.newEmail)], [EMAIL_CHANGED_WHEN, formatWhen(a.whenMs)],
  ] as const;
  const foot = { reason: true, links: [[EMAIL_SETTINGS_LABEL, settingsUrl!]] as const };
  const body =
    heading1(EMAIL_CHANGED_HEADING) + para(esc(EMAIL_CHANGED_LEAD)) +
    facts(rows.map(([l, v]) => [l, esc(v)] as const)) +
    para(esc(EMAIL_CHANGED_FINE)) +
    note(EMAIL_CHANGED_NOT_YOU[0], EMAIL_CHANGED_NOT_YOU[1]).replace("margin:8px 0 22px", "margin:8px 0 4px");
  return {
    ok: true,
    email: {
      subject: EMAIL_CHANGED_SUBJECT,
      html: shell(cfg, { preheader: EMAIL_CHANGED_PREHEADER, body, foot: productFoot(cfg, foot) }),
      text: [
        EMAIL_CHANGED_HEADING, "", EMAIL_CHANGED_LEAD, "", ...textFacts(rows), "",
        EMAIL_CHANGED_FINE, "", EMAIL_CHANGED_NOT_YOU.join(""),
      ].join("\n") + productTextFoot(cfg, foot),
    },
  };
};

/* ══════════════ 9 · A nudge is due ══════════════ */

/** One query whose nudge falls due today. Every date is a phrase the scheduler has already formatted ("5 November"). */
export interface NudgeItem {
  agent: AgentRef;
  manuscriptTitle: string;
  sentOn: string;
  replyExpectedBy: string;
  /** Absolute link to this query in the app. */
  queryUrl: string;
}

export interface NudgeArgs {
  items: readonly NudgeItem[];
  /** The writer's own setting, as a phrase: "one week". */
  nudgeAfter: string;
  turnOffUrl: string;
  changeWhenUrl: string;
  /** Optional RFC 8058 target. Pass it only when that URL accepts the one-click POST. */
  listUnsubscribeUrl?: string;
}

export const prepareNudge = (cfg: MailConfig, a: NudgeArgs): Prepared => {
  const settingsUrl = appLink(cfg, APP_PATHS.emailSettings);
  const missing = [
    ...(a.items.length ? [] : ["items"]),
    ...(a.items.every((i) => i.queryUrl) ? [] : ["queryUrl"]),
    ...need({ nudgeAfter: a.nudgeAfter, turnOffUrl: a.turnOffUrl, changeWhenUrl: a.changeWhenUrl, settingsUrl }),
    ...needsLogo(cfg),
  ];
  if (missing.length) return { ok: false, missing };

  const names = a.items.map((i) => i.agent.name);
  const rowsOf = (i: NudgeItem) => [
    [NUDGE_AGENT, i.agent], [NUDGE_MANUSCRIPT, i.manuscriptTitle], [NUDGE_SENT, i.sentOn],
    [NUDGE_EXPECTED, i.replyExpectedBy], [NUDGE_SINCE, NUDGE_NO_REPLY],
  ] as const;
  const htmlRows = (i: NudgeItem) => rowsOf(i).map(([l, v]) => [l, typeof v === "string" ? esc(v)
    : `<b>${esc(v.name)}</b>${v.agency ? `<br>${esc(v.agency)}` : ""}`] as const);
  const textRows = (i: NudgeItem) => rowsOf(i).map(([l, v]) => [l, typeof v === "string" ? v : agentText(v)] as const);
  const setting = nudgeSetting(a.nudgeAfter);
  const one = a.items.length === 1;
  const body = heading1(nudgeHeading(names)) + (one
    ? facts(htmlRows(a.items[0])) + para(esc(setting)) + button(a.items[0].queryUrl, NUDGE_CTA)
    : a.items.map((i) => facts(htmlRows(i)) + button(i.queryUrl, NUDGE_CTA).replace("margin:6px 0 10px", "margin:-6px 0 26px")).join("") +
      para(esc(setting))) +
    small(NUDGE_HEARD);
  const foot = { reason: false, links: [[NUDGE_TURN_OFF, a.turnOffUrl], [NUDGE_CHANGE_WHEN, a.changeWhenUrl], [EMAIL_SETTINGS_LABEL, settingsUrl!]] as const };
  const textItems = a.items.flatMap((i) => [...textFacts(textRows(i)), `${NUDGE_CTA}: ${i.queryUrl}`, ""]);
  return {
    ok: true,
    email: {
      ...(a.listUnsubscribeUrl ? { headers: listUnsubscribe(a.listUnsubscribeUrl) } : {}),
      subject: nudgeSubject(names),
      html: shell(cfg, { preheader: nudgePreheader(a.items.map((i) => i.replyExpectedBy)), body, foot: productFoot(cfg, foot) }),
      text: [nudgeHeading(names), "", ...textItems, setting, "", NUDGE_HEARD].join("\n") + productTextFoot(cfg, foot),
    },
  };
};

/* ══════════════ 10 · The weekly summary ══════════════ */

/** What came in, or went out, last week. The counts in the subject and heading are DERIVED from this list. */
export type WeeklyHappened =
  | { kind: "request"; stage: "partial" | "full"; agent: AgentRef }
  | { kind: "no"; agent: AgentRef }
  | { kind: "offer"; agent: AgentRef }
  | { kind: "sent"; agentNames: readonly string[] };

/** What is due this week. Dates are phrases ("Friday 13 November"). */
export type WeeklyComing =
  | { kind: "send"; stage: "partial" | "full"; agentName: string; by: string }
  | { kind: "nudge"; agentName: string; on: string }
  | { kind: "replies"; agentNames: readonly string[] };

export interface WeeklyArgs {
  /** "Monday 2 to Sunday 8 November". */
  weekPhrase: string;
  happened: readonly WeeklyHappened[];
  coming: readonly WeeklyComing[];
  /** Where the campaign stands: plain counts. */
  standing: { queriesOut: number; requests: number; sent: number; quiet: number };
  turnOffUrl: string;
  listUnsubscribeUrl?: string;
}

const happenedLine = (h: WeeklyHappened): [string, string] => {
  switch (h.kind) {
    case "request": return happenedRequest(h.stage, agentText(h.agent));
    case "no": return happenedNo(agentText(h.agent));
    case "offer": return happenedOffer(agentText(h.agent));
    case "sent": return happenedSent(h.agentNames);
    default: { const unhandled: never = h; throw new Error(`unknown weekly line ${JSON.stringify(unhandled)}`); }
  }
};
const comingLine = (c: WeeklyComing): [string, string] => {
  switch (c.kind) {
    case "send": return comingSend(c.stage, c.agentName, c.by);
    case "nudge": return comingNudge(c.agentName, c.on);
    case "replies": return comingReplies(c.agentNames);
    default: { const unhandled: never = c; throw new Error(`unknown weekly line ${JSON.stringify(unhandled)}`); }
  }
};

export const prepareWeekly = (cfg: MailConfig, a: WeeklyArgs): Prepared => {
  const settingsUrl = appLink(cfg, APP_PATHS.emailSettings);
  const dashboardUrl = appLink(cfg, APP_PATHS.dashboard);
  const missing = [
    ...(a.happened.length || a.coming.length ? [] : ["happenedOrComing"]),
    ...need({ weekPhrase: a.weekPhrase, turnOffUrl: a.turnOffUrl, settingsUrl, dashboardUrl }),
    ...needsLogo(cfg),
  ];
  if (missing.length) return { ok: false, missing };

  const replies = a.happened.filter((h) => h.kind !== "sent").length;
  const requests = a.happened.filter((h) => h.kind === "request").length;
  const happened = a.happened.map(happenedLine);
  const coming = a.coming.map(comingLine);
  const s = a.standing;
  const standing = [[WEEKLY_OUT, String(s.queriesOut)], [WEEKLY_REQUESTS, weeklyRequestsValue(s.requests, s.sent)], [WEEKLY_QUIET, String(s.quiet)]] as const;
  const heading = weeklyHeading(replies, requests);
  const body =
    heading1(heading) +
    para(esc(a.weekPhrase), { size: 14.5, colour: MUTED, margin: "0 0 18px" }) +
    (happened.length ? subheading(WEEKLY_HAPPENED) + list(happened, "dot") : "") +
    (coming.length ? subheading(WEEKLY_COMING) + list(coming, "dot") : "") +
    facts(standing.map(([l, v]) => [l, esc(v)] as const)) +
    button(dashboardUrl!, WEEKLY_CTA);
  const foot = { reason: false, links: [[WEEKLY_TURN_OFF, a.turnOffUrl], [EMAIL_SETTINGS_LABEL, settingsUrl!]] as const };
  return {
    ok: true,
    email: {
      ...(a.listUnsubscribeUrl ? { headers: listUnsubscribe(a.listUnsubscribeUrl) } : {}),
      subject: weeklySubject(replies, requests),
      html: shell(cfg, { preheader: weeklyPreheader(coming.length), body, foot: productFoot(cfg, foot) }),
      text: [
        heading, a.weekPhrase, "",
        ...(happened.length ? [WEEKLY_HAPPENED, ...textList(happened, "dot"), ""] : []),
        ...(coming.length ? [WEEKLY_COMING, ...textList(coming, "dot"), ""] : []),
        ...textFacts(standing), "", `${WEEKLY_CTA}: ${dashboardUrl}`,
      ].join("\n") + productTextFoot(cfg, foot),
    },
  };
};

/* ══════════════ 11 · The trial is ending (for launch; template only, no sender) ══════════════ */

export interface TrialEndingArgs {
  /** "Thursday" — the day the 14 days end. */
  endsWeekday: string;
  /** "Thursday 26 November" — the first day on Free. */
  freeFrom: string;
  /** The cheapest Pro price, as the Pricing page states it: "£3.75". */
  fromPrice: string;
}

export const prepareTrialEnding = (cfg: MailConfig, a: TrialEndingArgs): Prepared => {
  const settingsUrl = appLink(cfg, APP_PATHS.emailSettings);
  const plansUrl = appLink(cfg, APP_PATHS.plans);
  const missing = [...need({ endsWeekday: a.endsWeekday, freeFrom: a.freeFrom, fromPrice: a.fromPrice, settingsUrl, plansUrl }), ...needsLogo(cfg)];
  if (missing.length) return { ok: false, missing };
  const keeps = TRIAL_KEEPS.map((t) => ["", t] as const);
  const readOnly = TRIAL_READ_ONLY.map((t) => ["", t] as const);
  const foot = { reason: true, links: [[EMAIL_SETTINGS_LABEL, settingsUrl!]] as const };
  const body =
    heading1(trialHeading(a.endsWeekday)) + para(esc(trialLead(a.freeFrom))) +
    subheading(TRIAL_KEEPS_HEADING) + list(keeps, "tick") +
    subheading(TRIAL_READ_ONLY_HEADING, "6px 0 8px") + list(readOnly, "dot") +
    para(esc(trialPro(a.fromPrice))) + button(plansUrl!, TRIAL_CTA) + small(TRIAL_HAPPY);
  return {
    ok: true,
    email: {
      subject: trialSubject(a.endsWeekday),
      html: shell(cfg, { preheader: TRIAL_PREHEADER, body, foot: productFoot(cfg, foot) }),
      text: [
        trialHeading(a.endsWeekday), "", trialLead(a.freeFrom), "",
        TRIAL_KEEPS_HEADING, ...textList(keeps, "tick"), "",
        TRIAL_READ_ONLY_HEADING, ...textList(readOnly, "dot"), "",
        trialPro(a.fromPrice), "", `${TRIAL_CTA}: ${plansUrl}`, "", TRIAL_HAPPY,
      ].join("\n") + productTextFoot(cfg, foot),
    },
  };
};

/* ══════════════ 12 · The plan is ending (for launch; template only, no sender) ══════════════ */

export interface PlanEndingArgs {
  /** "6-month". */
  plan: string;
  /** "6 months". */
  duration: string;
  /** "19 May". */
  ends: string;
  /** "Wednesday 19 May". */
  endsLong: string;
  /** "£7.99". */
  monthly: string;
  /** "19th". */
  chargeDay: string;
}

export const preparePlanEnding = (cfg: MailConfig, a: PlanEndingArgs): Prepared => {
  const settingsUrl = appLink(cfg, APP_PATHS.emailSettings);
  const manageUrl = appLink(cfg, APP_PATHS.plan);
  const missing = [...need({ ...a, settingsUrl, manageUrl }), ...needsLogo(cfg)];
  if (missing.length) return { ok: false, missing };
  const rows = [
    [PLAN_LABEL, planValue(a.duration)], [PLAN_ENDS, a.endsLong],
    [PLAN_THEN, planThenValue(a.monthly, a.chargeDay)], [PLAN_STOP, planStopValue(a.ends)],
  ] as const;
  const foot = { reason: true, links: [[EMAIL_SETTINGS_LABEL, settingsUrl!]] as const };
  const body =
    heading1(planEndingHeading(a.plan, a.ends)) + para(esc(planEndingLead(a.monthly))) +
    facts(rows.map(([l, v]) => [l, esc(v)] as const)) + button(manageUrl!, PLAN_CTA) + small(PLAN_FINISHED);
  return {
    ok: true,
    email: {
      subject: planEndingSubject(a.plan, a.ends),
      html: shell(cfg, { preheader: planEndingPreheader(a.monthly), body, foot: productFoot(cfg, foot) }),
      text: [
        planEndingHeading(a.plan, a.ends), "", planEndingLead(a.monthly), "", ...textFacts(rows), "",
        `${PLAN_CTA}: ${manageUrl}`, "", PLAN_FINISHED,
      ].join("\n") + productTextFoot(cfg, foot),
    },
  };
};
