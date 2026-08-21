/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Terms and Privacy copy — verbatim from design-refs/scriptally-terms.html and
 * design-refs/scriptally-privacy.html.
 *
 * ⚠️ IT IS A WORKING DRAFT AND IT SAYS SO ON THE PAGE. `LEGAL_COPY_REVIEWED` is false; the ribbon
 * renders because of that one flag, and setting it true removes the ribbon and changes nothing
 * else — no copy, no geometry, no route. Do not set it until a lawyer has read both documents.
 *
 * ⚠️ THE BRACKETED VALUES ARE DELIBERATE AND MUST NOT BE FILLED IN BY GUESSING. They come from
 * `companyInfo.ts` and render brackets and all, so the page visibly has holes rather than quietly
 * asserting an entity, an address, an ICO number or a retention period that nobody has confirmed.
 * A legal page that looks finished and is not is worse than an obviously unfinished one.
 *
 * ⚠️ PRIVACY §4 IS NOT OPTIONAL. Three features send content the writer supplies to Anthropic's
 * API: Smart Import (functions/src/smartImport.ts) sends the CONTENTS of the uploaded spreadsheet,
 * the email drop (functions/src/emailImport.ts) sends the body of an agent's reply, and the comps
 * suggester (functions/src/suggestComps.ts) sends the manuscript's details. Trimming that section
 * would leave the product doing something no surface discloses.
 *
 * ⚠️ PRIVACY §6 SAYS THERE IS NO COOKIE BANNER, AND THERE MUST NOT BE ONE. The claim is only true
 * while the app sets nothing but auth tokens and interface preferences; adding analytics or any
 * third-party tracker makes this paragraph false before it makes a banner necessary.
 *
 * ⚠️ PRIVACY §7 PROMISES DELETION IN [30] DAYS AND NO CODE ENFORCES IT. Account deletion ships
 * disabled behind `ACCOUNT_DELETION_ENABLED`. The disagreement is recorded rather than papered
 * over — see the run report.
 */

import { CopyRun } from "./CopyRuns";
import {
  DATA_REGION, DELETION_WINDOW_DAYS, ICO_REGISTRATION_NOTE, LEGAL_ENTITY_NAME,
  LEGAL_LAST_UPDATED, REGISTERED_ADDRESS, SUPPORT_EMAIL, supportMailto,
} from "../lib/companyInfo";

/**
 * ⚠️ ONE FLAG, ONE EFFECT. False = both documents carry the working-draft ribbon. Setting it true
 * takes the ribbon away and touches nothing else.
 */
export const LEGAL_COPY_REVIEWED = false;

/** The ribbon's mono tag, shared by both documents. */
export const DRAFT_TAG = "Working draft";

export type LegalDocumentKey = "terms" | "privacy";

export type LegalBlock =
  | { kind: "p"; runs: CopyRun[] }
  | { kind: "list"; items: CopyRun[][] }
  | { kind: "callout"; runs: CopyRun[] };

export interface LegalSection {
  heading: string;
  blocks: LegalBlock[];
}

export interface LegalDocument {
  documentTitle: string;
  eyebrow: string;
  title: string;
  lastUpdated: string;
  /** The sentence on the working-draft ribbon. */
  draftBody: string;
  /** The plain-English summary above the numbered sections. */
  lede: string;
  sections: LegalSection[];
}

const p = (...runs: CopyRun[]): LegalBlock => ({ kind: "p", runs });
const list = (...items: CopyRun[][]): LegalBlock => ({ kind: "list", items });
const callout = (...runs: CopyRun[]): LegalBlock => ({ kind: "callout", runs });

const privacyLink = (label = "privacy policy"): CopyRun => ({ link: label, to: "privacy" });
const supportLink = (subject?: string): CopyRun => ({
  link: SUPPORT_EMAIL,
  mailto: supportMailto(subject),
});

export const LEGAL_DOCUMENTS: Record<LegalDocumentKey, LegalDocument> = {
  privacy: {
    documentTitle: "Privacy Policy — ScriptAlly",
    eyebrow: "Legal · Privacy",
    title: "Privacy Policy",
    lastUpdated: LEGAL_LAST_UPDATED,
    draftBody:
      "This policy is a working draft and has not yet been legally reviewed. Bracketed items are " +
      "pending confirmation.",
    lede:
      "The short version: your querying records and your writing belong to you. We collect only " +
      "what the app needs to work, we don't sell it, we don't run advertising, and nothing you " +
      "store is used to train AI models.",
    sections: [
      {
        heading: "Who we are",
        blocks: [
          p(
            "ScriptAlly is operated by ", { b: LEGAL_ENTITY_NAME }, " of ", { b: REGISTERED_ADDRESS },
            ", United Kingdom (\"we\", \"us\"). We are the data controller for the personal data " +
            "described in this policy. You can reach us at ", supportLink("Privacy"), ". ",
            ICO_REGISTRATION_NOTE,
          ),
        ],
      },
      {
        heading: "What we collect",
        blocks: [
          list(
            [{ b: "Account details" }, " — your email address, display name, and authentication credentials, handled by Firebase Authentication."],
            [{ b: "Your querying records" }, " — the agents, queries, manuscripts, submission packages, notes, and activity history you create in the app."],
            [{ b: "Documents you import" }, " — files you choose to upload through Smart Import (for example a querying spreadsheet), processed as described in section 4."],
            [{ b: "Waitlist emails" }, " — if you join the waitlist on our holding page, the email address you give us."],
            [{ b: "Support correspondence" }, " — anything you send us by email."],
          ),
          p(
            "We do not collect payment details at present. If paid plans launch, payments will be " +
            "handled by a payment processor and this policy will be updated first.",
          ),
        ],
      },
      {
        heading: "How we use it, and on what basis",
        blocks: [
          list(
            [{ b: "To run the service" }, " — storing and displaying your records is the entire product (performance of a contract)."],
            [{ b: "To keep it working and secure" }, " — authentication, abuse prevention, and diagnosing faults (legitimate interests)."],
            [{ b: "To reply to you" }, " — when you contact us or join the waitlist (legitimate interests / consent)."],
          ),
          p(
            "We do not sell personal data, share it with advertisers, or send marketing you " +
            "haven't asked for.",
          ),
        ],
      },
      {
        heading: "Smart Import and AI processing",
        blocks: [
          p(
            "When you use Smart Import, the contents of the file you upload are transmitted to ",
            { b: "Anthropic" },
            " (the maker of the Claude AI models), which processes them on our behalf to extract " +
            "your agents and queries into structured records. This happens only when you actively " +
            "run an import — never in the background.",
          ),
          p(
            "Under the commercial API terms we use, Anthropic does not use this data to train its " +
            "models. The extracted records are stored in your account; the processing itself is " +
            "transient.",
          ),
          callout(
            "Your manuscripts, pitches, and notes stored in ScriptAlly are ", { b: "not" },
            " sent to any AI service unless you explicitly run a feature that says so on its face.",
          ),
        ],
      },
      {
        heading: "Where your data lives",
        blocks: [
          p(
            "Your data is stored on Google's Firebase platform (Firestore, Authentication, and " +
            "Hosting) in the ", { b: DATA_REGION }, " region. Google acts as our data processor " +
            "under its Cloud Data Processing Addendum. Where any processing involves a transfer " +
            "outside the UK, it is protected by recognised safeguards such as the UK Addendum to " +
            "the EU Standard Contractual Clauses.",
          ),
        ],
      },
      {
        heading: "Cookies and local storage",
        blocks: [
          p(
            "ScriptAlly uses only what's strictly necessary to work: authentication tokens that " +
            "keep you signed in, and local storage that remembers interface preferences (like a " +
            "collapsed sidebar) on your own device. There are no advertising cookies, no " +
            "cross-site trackers, and no third-party analytics — which is why you won't find a " +
            "cookie banner here.",
          ),
        ],
      },
      {
        heading: "Retention and deletion",
        blocks: [
          p(
            "Your records are kept for as long as your account exists. If you delete your account, " +
            "your data is deleted from our systems within ", { b: String(DELETION_WINDOW_DAYS) },
            " days, allowing for backup cycles. Waitlist emails are deleted once launch " +
            "invitations have gone out or on request, whichever is sooner.",
          ),
        ],
      },
      {
        heading: "Your rights",
        blocks: [
          p(
            "Under UK GDPR you can ask us to access, correct, delete, or export your personal " +
            "data, to restrict or object to processing, and to withdraw consent where consent is " +
            "the basis. Email ", supportLink("Privacy"),
            " with \"Privacy\" in the subject line and we'll respond within one month.",
          ),
          p(
            "If you're unhappy with how we've handled your data, you can complain to the " +
            "Information Commissioner's Office at ",
            { link: "ico.org.uk", href: "https://ico.org.uk" },
            " — though we'd appreciate the chance to put it right first.",
          ),
        ],
      },
      {
        heading: "Children",
        blocks: [
          p("ScriptAlly is not directed at children and is intended for users aged 16 and over."),
        ],
      },
      {
        heading: "Changes to this policy",
        blocks: [
          p(
            "If we change this policy in any way that matters, we'll update the date at the top " +
            "and, for significant changes, tell you in the app or by email before they take effect.",
          ),
        ],
      },
    ],
  },

  terms: {
    documentTitle: "Terms of Service — ScriptAlly",
    eyebrow: "Legal · Terms",
    title: "Terms of Service",
    lastUpdated: LEGAL_LAST_UPDATED,
    draftBody:
      "These terms are a working draft and have not yet been legally reviewed. Bracketed items " +
      "are pending confirmation.",
    lede:
      "The plain-English promise underneath the legal text: you own everything you put into " +
      "ScriptAlly, we'll be straight with you about what the service does, and neither of us " +
      "should need a lawyer to understand this page.",
    sections: [
      {
        heading: "Who we are and what you're agreeing to",
        blocks: [
          p(
            "These terms are an agreement between you and ", { b: LEGAL_ENTITY_NAME }, " of ",
            { b: REGISTERED_ADDRESS },
            ", United Kingdom. By creating an account or using ScriptAlly, you accept them. How we " +
            "handle your personal data is set out separately in the ", privacyLink(), ".",
          ),
        ],
      },
      {
        heading: "The service",
        blocks: [
          p(
            "ScriptAlly is a tool for tracking your literary agent querying process: your agents, " +
            "queries, manuscripts, submission packages, and the history of each exchange. It's a " +
            "record-keeper, not an adviser — it reports what you've recorded, and it doesn't " +
            "guarantee any outcome with any agent or publisher.",
          ),
          callout(
            { b: "Early-access notice." },
            " ScriptAlly is newly launched and actively developed. Features may change, and " +
            "occasional rough edges are part of the deal at this stage. We'll flag significant " +
            "changes rather than spring them on you.",
          ),
        ],
      },
      {
        heading: "Your account",
        blocks: [
          p(
            "You need to be 16 or over, give us accurate account details, and keep your sign-in " +
            "credentials to yourself. You're responsible for what happens under your account; tell " +
            "us straight away if you think it's been compromised.",
          ),
        ],
      },
      {
        heading: "Your content",
        blocks: [
          p(
            "Everything you put into ScriptAlly — manuscripts, pitches, notes, querying records — " +
            "remains yours. You grant us only the limited licence needed to store, process, and " +
            "display it back to you, which is what running the service means. We claim no other " +
            "rights in your writing, and we do not use your content to train AI models.",
          ),
        ],
      },
      {
        heading: "Acceptable use",
        blocks: [
          list(
            ["Don't use ScriptAlly to store or transmit anything unlawful, or content you don't have the right to hold."],
            ["Don't attempt to breach, probe, or overload the service, or access another user's data."],
            ["Don't resell or scrape the service."],
          ),
          p("Breaching these lets us suspend or close the account involved."),
        ],
      },
      {
        heading: "AI-assisted features",
        blocks: [
          p(
            "Some features, such as Smart Import, use third-party AI models to process content you " +
            "explicitly submit to them — the details are in section 4 of the ", privacyLink(),
            ". AI-extracted output can contain mistakes; each of these features gives you a review " +
            "step, and you're responsible for checking the results before relying on them.",
          ),
        ],
      },
      {
        heading: "Fees",
        blocks: [
          p(
            "ScriptAlly is currently free to use. A paid Pro tier is planned; when it arrives, its " +
            "price and what it includes will be stated clearly before you're asked to pay " +
            "anything, and the free tier will remain genuinely useful. These terms will be updated " +
            "before any payment is taken.",
          ),
        ],
      },
      {
        heading: "Availability, and things going wrong",
        blocks: [
          p(
            "We work to keep ScriptAlly available and your data safe, but as a small, early-stage " +
            "service it's provided \"as is\" — we can't promise uninterrupted availability. Nothing " +
            "in these terms excludes liability that can't legally be excluded (such as for death " +
            "or personal injury caused by negligence, or fraud). Beyond that, our total liability " +
            "to you is limited to the greater of £100 or the amount you've paid us in the twelve " +
            "months before the claim. You should keep your own copies of any manuscript files: " +
            "ScriptAlly tracks your querying, it is not your manuscript's only home.",
          ),
        ],
      },
      {
        heading: "Ending things",
        blocks: [
          p(
            "You can close your account at any time, and your data will be deleted as described in " +
            "the privacy policy. We can suspend or close accounts that breach these terms, and " +
            "we'll give reasonable notice if we ever discontinue the service — with a way to " +
            "export your records first.",
          ),
        ],
      },
      {
        heading: "Changes and governing law",
        blocks: [
          p(
            "If we change these terms in a way that matters, we'll tell you in the app or by email " +
            "before the change takes effect. These terms are governed by the laws of England and " +
            "Wales, and any disputes belong to the courts of England and Wales — though if you use " +
            "the service as a consumer elsewhere in the UK, you keep the protections of your home " +
            "nation's law.",
          ),
          p("Questions about any of this: ", supportLink(), "."),
        ],
      },
    ],
  },
};
