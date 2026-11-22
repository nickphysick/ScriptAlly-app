/**
 * inviteEmail — the founder's invite, rendered, and the founder's code, made (non-workspace v1, 9d).
 *
 * Pure: no Firebase, no network. The callable's fresh-link path (`inviteSend.ts`) and the founder-only script
 * (`scripts/founding-invite.ts`) both render through `renderInvite`, so there is one invite, not two.
 *
 * ⚠️ THE UNSUBSCRIBE LINK IS THE WRITER'S WAITLIST ONE (`unsubscribeToken(emailHash(email), salt)`), the same signed,
 *    permanent token emails 1–3 carry — "This gives up your founding place" is exactly what that link does.
 * ⚠️ A MISSING SALT REFUSES, as it does in waitlistMail: an unsigned unsubscribe link is never emailed.
 */
import { randomInt } from "crypto";
import type { MailConfig } from "./emailConfig";
import { Prepared, prepareInvite } from "./emailTemplates";
import { DEFAULT_CAP, emailHash, normaliseEmail, unsubscribeToken } from "./waitlistModel";

/** No 0/O, 1/I/L: a code someone may have to type from a phone screen. 31 characters. */
export const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const CODE_RE = /^QH-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}$/;

/** QH-XXXX-XXXX: eight characters, each drawn uniformly (`randomInt` rejects the modulo bias). */
export const newFounderCode = (pick: (n: number) => number = (n) => randomInt(n)): string => {
  const ch = () => CODE_ALPHABET[pick(CODE_ALPHABET.length)];
  const four = () => ch() + ch() + ch() + ch();
  return `QH-${four()}-${four()}`;
};

export interface InviteTo { email: string; code: string; foundingNo: number | null; cap?: number }

export const renderInvite = (cfg: MailConfig, to: InviteTo, salt: string): Prepared => {
  const email = normaliseEmail(to.email);
  if (!salt || !email) return { ok: false, missing: [...(salt ? [] : ["salt"]), ...(email ? [] : ["recipient"])] };
  return prepareInvite(cfg, {
    code: to.code,
    foundingNo: to.foundingNo,
    cap: to.cap ?? DEFAULT_CAP,
    unsubToken: unsubscribeToken(emailHash(email), salt),
  });
};
