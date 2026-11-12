/**
 * The fresh invite after a link has run out (redeemInviteCode, mode "fresh").
 *
 * ⚠️ NON-WORKSPACE v1, 9d: it now renders the invite (`renderInvite`, the same one the founder's script uses) and
 *    sends it through `sendEmail` — the one transport — as kind "invite", which `SENDER_OF` gives Nick's sender.
 *    The link's new 48 hours were written before this is called, so a send that fails or refuses loses nothing: the
 *    writer can ask again, and the code and place are unchanged. Nothing here throws.
 */
import { sendEmail } from "./email";
import { resolveMailConfig } from "./emailConfig";
import { renderInvite } from "./inviteEmail";
import { IP_HASH_SALT } from "./waitlistMail";

export async function sendFreshInvite(to: { email: string; name: string | null; code: string; foundingNo: number | null }): Promise<void> {
  const cfg = resolveMailConfig(process.env);
  let salt = "";
  try { salt = IP_HASH_SALT.value(); } catch { salt = ""; }
  const prepared = renderInvite(cfg, { email: to.email, code: to.code, foundingNo: to.foundingNo }, salt);
  if (!prepared.ok) {
    console.error(JSON.stringify({ event: "email.refused", template: "invite", code: to.code, missing: prepared.missing }));
    return;
  }
  const out = await sendEmail(to.email, "invite", prepared.email);
  console.info(JSON.stringify({ event: "invite.fresh.requested", code: to.code, sent: out.ok }));
}
