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
 * ⚠️ NO BAND NAMES A PERSON ANY MORE, AND PROFILE'S IS THE ONE THAT CHANGED. It used to substitute
 * the writer's name and email at render, so the identity was repeated on every section card — and
 * the only element that could have stayed still while you navigated was the one that moved most.
 * Identity appears ONCE now, in the account header above the grid; every band is a fixed label
 * about a SECTION rather than about the reader.
 *
 * ⚠️ AND THE MONO PRE-LABEL IS GONE with the old band anatomy. "Account · Settings" above every
 * section name was a third statement of where you are, beneath a header that says it and beside a
 * rail that shows it.
 */
import React from "react";
import { User as UserIcon, Shield, CreditCard, Bell, SlidersHorizontal, ListChecks, Database } from "lucide-react";
import { AccountSectionId } from "../../lib/accountRoutes";

export interface SectionBand {
  /** The Playfair line — the SECTION's name, always. */
  name: string;
  /** The one-line sub-line beneath it. */
  sub: string;
  /** The section's mark. Worn by the rail item, and by the body watermark where there is one. */
  Icon: React.ComponentType<any>;
}

/**
 * ⚠️ PLAN'S SUB-LINE IS NOT THE REF'S. The ref reads "Your current plan and where you stand
 * against it", which promises the usage-against-limits block this build deliberately does not
 * have — the card answers "what do I get", and nothing else. A sub-line that advertises a
 * missing section is a worse fault than a plainer sentence.
 */
export const SECTION_BANDS: Record<AccountSectionId, SectionBand> = {
  profile: { name: "Profile", sub: "Your name and where you write from", Icon: UserIcon },
  security: { name: "Sign-in & security", sub: "How you access your account", Icon: Shield },
  plan: { name: "Plan & billing", sub: "What your plan includes", Icon: CreditCard },
  notifications: { name: "Notifications", sub: "What ScriptAlly emails you about", Icon: Bell },
  preferences: { name: "Preferences", sub: "How your workspace behaves", Icon: SlidersHorizontal },
  tasks: { name: "Tasks", sub: "What reaches your to-do list", Icon: ListChecks },
  data: { name: "Your data", sub: "Export or remove what's stored", Icon: Database },
};

/* ⚠️ NO INITIALS HELPER LIVES HERE. `initialsOf` in `lib/searchSuggestionsCore` is the app's one
   source, and `AvatarChip` is the one avatar that renders it — "parchment fill, burgundy Playfair
   initials (Baked 11)". A second implementation in this file would be a settings page whose
   monogram could come to disagree with the same person's monogram in the rail foot, four
   centimetres away. */
