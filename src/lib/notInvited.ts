/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * A refused account (App site v1, Phase 1). The server's invite check, `inviteGate` (functions/src/inviteGate.ts),
 * refuses any new account whose email no unused founder's code names. The Auth SDK hands that back as an
 * `auth/internal-error` whose message carries the marker below; every door that can make an account (db.tsx
 * `signup`, and `signInWithGoogle` / `finishSignInLink` in authActions.ts) turns it into `NotInvitedError`, and the
 * sign-up screen draws the message with a link to the waitlist.
 *
 * No imports on purpose: db.tsx and authActions.ts both read this, and neither may import the other.
 */

/** The server's marker. Mirrored, byte for byte, as `NOT_INVITED` in functions/src/inviteGateCore.ts. */
export const NOT_INVITED_MARK = "QH_NOT_INVITED";

export const NOT_INVITED_COPY =
  "We can't find an invitation for this email address. If you were invited, use the address your invitation was sent to.";
export const NOT_INVITED_LEAD = "If not, QueryHawk is opening to its first writers a few at a time, so ";
export const NOT_INVITED_LINK = "join the waitlist";

export class NotInvitedError extends Error {
  readonly notInvited = true;
  constructor() {
    super(NOT_INVITED_COPY);
    this.name = "NotInvitedError";
  }
}

export const isNotInvited = (err: unknown): boolean => {
  if (err instanceof NotInvitedError) return true;
  const m = (err as { message?: unknown } | null)?.message;
  return typeof m === "string" && m.includes(NOT_INVITED_MARK);
};

/**
 * The waitlist lives on the landing site's home page. Its origin comes from the build (`VITE_LANDING_URL`); a build
 * without one (local, the emulator) links to this site's own home, which is the same landing in the whole app.
 */
export const waitlistHref = (landing: string | undefined = import.meta.env.VITE_LANDING_URL): string => {
  if (!landing) return "/";
  try {
    return new URL("/", landing).href;
  } catch {
    return "/";
  }
};
