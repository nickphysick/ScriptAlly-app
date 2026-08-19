/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The settings section bands — what each sage header says, and the mark it wears.
 *
 * ⚠️ ONE ICON PER SECTION, RENDERED TWICE. The design ref draws the disc glyph and the faint
 * right-hand motif as two separate inline SVGs carrying the same path data at different sizes —
 * so every section shipped its outline twice, and the day one of them was corrected the other
 * would quietly disagree. Both come from the same lucide component here: 16px / 1.8 stroke /
 * burgundy in the disc, 62px / 0.9 stroke / 30% ink as the motif. That is the ref's own
 * specification, reached from one source rather than two.
 *
 * ⚠️ THE PROFILE BAND IS THE ONE THAT NAMES A PERSON. Its `name`/`sub` are the writer's own name
 * and email, passed in at render; the static entry below carries only the words around them. The
 * other five are fixed labels about the app, not about the reader.
 */
import React from "react";
import { User as UserIcon, Shield, CreditCard, Bell, SlidersHorizontal, Database } from "lucide-react";
import { AccountSectionId } from "../../lib/accountRoutes";

export interface SectionBand {
  /** The mono pre-label above the name. */
  pre: string;
  /** The Playfair line. Profile substitutes the writer's name. */
  name: string;
  /** The one-line sub-line. Profile substitutes the account email. */
  sub: string;
  Icon: React.ComponentType<any>;
}

/**
 * ⚠️ PLAN'S SUB-LINE IS NOT THE REF'S. The ref reads "Your current plan and where you stand
 * against it", which promises the usage-against-limits block this build deliberately does not
 * have — the card answers "what do I get", and nothing else. A sub-line that advertises a
 * missing section is a worse fault than a plainer sentence.
 */
export const SECTION_BANDS: Record<AccountSectionId, SectionBand> = {
  profile: { pre: "Account settings for", name: "", sub: "", Icon: UserIcon },
  security: { pre: "Account · Settings", name: "Sign-in & security", sub: "How you access your account", Icon: Shield },
  plan: { pre: "Account · Settings", name: "Plan & billing", sub: "What your plan includes", Icon: CreditCard },
  notifications: { pre: "Account · Settings", name: "Notifications", sub: "What ScriptAlly emails you about", Icon: Bell },
  preferences: { pre: "Account · Settings", name: "Preferences", sub: "How your workspace behaves", Icon: SlidersHorizontal },
  data: { pre: "Account · Settings", name: "Your data", sub: "Export or remove what's stored", Icon: Database },
};

/* ⚠️ NO INITIALS HELPER LIVES HERE. `initialsOf` in `lib/searchSuggestionsCore` is the app's one
   source, and `AvatarChip` is the one avatar that renders it — "parchment fill, burgundy Playfair
   initials (Baked 11)". A second implementation in this file would be a settings page whose
   monogram could come to disagree with the same person's monogram in the rail foot, four
   centimetres away. */
