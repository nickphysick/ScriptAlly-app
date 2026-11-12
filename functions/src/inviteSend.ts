/**
 * The fresh invite after a link has run out (redeemInviteCode, mode "fresh").
 *
 * ⚠️ PHASE 1 HOLDS THE SEAM ONLY. The invite email's copy and template are Phase 9's (emails-v1.html); until they
 *    land this records the request and sends nothing. The link's new 48 hours are written either way, so the
 *    writer's place and code are never lost.
 */
export async function sendFreshInvite(to: { email: string; name: string | null; code: string; foundingNo: number | null }): Promise<void> {
  console.info(JSON.stringify({ event: "invite.fresh.requested", code: to.code, sent: false }));
}
