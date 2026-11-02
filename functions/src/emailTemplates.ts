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
import { MailConfig, unsubscribeLink, verifyLink } from "./emailConfig";
import {
  BRAND_NAME, CONFIRM_CTA, CONFIRM_EXPIRY, CONFIRM_HEADING, CONFIRM_LEAD, CONFIRM_NEXT,
  CONFIRM_LINK_HELP, CONFIRM_NOT_HELD, CONFIRM_NOT_YOU, CONFIRM_PREHEADER, CONFIRM_SUBJECT, FOOT_LINE, PASS_LABEL,
  SIGNATURE_NAME, SIGNATURE_ROLE, UNSUBSCRIBE_LABEL, UNSUBSCRIBE_NOTE, UNSUBSCRIBE_NOTE_WAITING,
  WAITING_HEADING, WAITING_LEAD, WAITING_NOTE, WAITING_NOTHING_TO_DO, WAITING_PASS,
  WAITING_PREHEADER, WAITING_SORRY, WAITING_SUBJECT, WELCOME_GET_HEADING, WELCOME_HEADING,
  WELCOME_LEAD, WELCOME_NEXT, WELCOME_NEXT_HEADING, WELCOME_NOTE, WELCOME_PERKS, WELCOME_PREHEADER,
  contactLine, contactText, passNumber, passOf, welcomeSubject,
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

/** The whole message: ground, logo row, card (with an optional pass), footer. */
const shell = (cfg: MailConfig, o: {
  preheader: string; pass?: string; body: string; unsubUrl: string; unsubNote: string;
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
    footer(cfg, o.unsubUrl, o.unsubNote) +
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
