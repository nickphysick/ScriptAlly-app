/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Terms and Privacy copy.
 *
 * ⚠️ THIS IS A PLACEHOLDER AND IT IS MARKED AS ONE ON THE PAGE ITSELF. Drafting the actual policy
 * is not a build task. What this file gives you is the shape — headings a reader expects, and a
 * visible notice saying the words are not final — so replacing it is an edit to this one file with
 * no component work at all.
 *
 * ⚠️ THE PRIVACY POLICY MUST COVER THIRD-PARTY PROCESSING, AND NOTHING ON ANY LIVE SURFACE DOES.
 * Three features send the writer's own content to Anthropic's API:
 *   - Smart Import (functions/src/smartImport.ts) — the CONTENTS of the spreadsheet they upload,
 *     which is their whole agent list and querying history;
 *   - Smart email drop (functions/src/emailImport.ts) — the body of an agent's reply;
 *   - Comparable-title suggestions (functions/src/suggestComps.ts) — their manuscript's details.
 * The `SECTIONS` below name that gap rather than papering over it, so the draft cannot quietly ship
 * without it.
 */

export type LegalDocumentKey = "terms" | "privacy";

export interface LegalSection {
  heading: string;
  paragraphs: string[];
}

export interface LegalDocument {
  documentTitle: string;
  eyebrow: string;
  title: string;
  noticeHeading: string;
  noticeBody: string;
  sections: LegalSection[];
}

const DRAFT_NOTICE_HEADING = "This is a placeholder, not the final wording.";

export const LEGAL_DOCUMENTS: Record<LegalDocumentKey, LegalDocument> = {
  terms: {
    documentTitle: "ScriptAlly — Terms",
    eyebrow: "Legal",
    title: "Terms of use",
    noticeHeading: DRAFT_NOTICE_HEADING,
    noticeBody:
      "ScriptAlly's terms of use have not been finalised. This page exists so that the links to it " +
      "work and so the sections a reader should expect are visible. Please do not rely on it.",
    sections: [
      {
        heading: "Who provides ScriptAlly",
        paragraphs: ["To be completed — the operating entity, its registered address, and how to contact it."],
      },
      {
        heading: "Your account",
        paragraphs: [
          "To be completed — eligibility, account security, and what happens if an account is closed.",
        ],
      },
      {
        heading: "Your content",
        paragraphs: [
          "To be completed. The substance is settled even if the wording is not: your manuscripts, " +
          "your agent list and your correspondence are yours. ScriptAlly stores them so it can show " +
          "them back to you.",
        ],
      },
      {
        heading: "Plans and payment",
        paragraphs: [
          "To be completed. At the time of writing there is no payment path in the product: every " +
          "account is on the free tier, and nothing in the app charges anyone.",
        ],
      },
      {
        heading: "Availability, and ending your use",
        paragraphs: ["To be completed — service availability, suspension, termination, and how to export your data."],
      },
    ],
  },

  privacy: {
    documentTitle: "ScriptAlly — Privacy",
    eyebrow: "Legal",
    title: "Privacy policy",
    noticeHeading: DRAFT_NOTICE_HEADING,
    noticeBody:
      "ScriptAlly's privacy policy has not been finalised. This page exists so that the links to it " +
      "work and so the sections a reader should expect are visible. Please do not rely on it.",
    sections: [
      {
        heading: "What is stored, and where",
        paragraphs: [
          "To be completed — the account record, manuscripts, agents, queries and notes, held in " +
          "Google Firebase, and the regions they are held in.",
        ],
      },
      {
        heading: "Features that send your content to a third party",
        paragraphs: [
          "To be completed, and this section must not be omitted. Three features send content you " +
          "supply to Anthropic's API so it can be read and structured: Smart Import sends the " +
          "contents of the spreadsheet you upload; Smart email drop sends the body of the message " +
          "you paste; comparable-title suggestions send your manuscript's details.",
          "Each is something you start deliberately, and none of them runs on its own — but a " +
          "writer is entitled to know before they upload, and to know what is retained afterwards.",
        ],
      },
      {
        heading: "Cookies and analytics",
        paragraphs: ["To be completed — what is set, by whom, and what it is for."],
      },
      {
        heading: "Your rights, and how to exercise them",
        paragraphs: ["To be completed — access, correction, export, deletion, and who to contact."],
      },
    ],
  },
};
