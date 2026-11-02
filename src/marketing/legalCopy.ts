/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Terms and Privacy copy — verbatim from design-refs/scriptally-terms.html and
 * design-refs/scriptally-privacy.html.
 *
 * ⚠️ THE TERMS ARE A WORKING DRAFT AND SAY SO ON THE PAGE. `LEGAL_COPY_REVIEWED` is false; the ribbon
 * renders because of that one flag. The PRIVACY policy left that state on 2 Nov (privacy page v1): it
 * names its controller (Nick, no surname), states the checked region, and carries no ribbon and no
 * bracketed text (`ribbonOff`; PRIV-1).
 *
 * ⚠️ THE TERMS' BRACKETED VALUES ARE DELIBERATE AND MUST NOT BE FILLED IN BY GUESSING. They come from
 * `companyInfo.ts` and render brackets and all, so the page visibly has holes rather than quietly
 * asserting an entity or an address nobody has confirmed.
 *
 * ⚠️ PRIVACY §4 ("How we use AI") IS NOT OPTIONAL, AND THE TERMS POINT AT IT BY NUMBER. Four features
 * send content the writer supplies to Anthropic's API (Smart Import, the email drop, comps, agent
 * details). Trimming it would leave the product doing something no surface discloses.
 *
 * ⚠️ PRIVACY §6 SAYS THERE IS NO COOKIE BANNER AND NAMES CLOUDFLARE WEB ANALYTICS (privacy page v1).
 * Both stay true only while the app sets nothing but auth tokens and interface preferences and the
 * public site counts visits with Cloudflare's cookieless beacon; any other tracker makes it false.
 *
 * ⚠️ PRIVACY §7 PROMISES DELETION IN [30] DAYS AND NO CODE ENFORCES IT. Account deletion ships
 * disabled behind `ACCOUNT_DELETION_ENABLED`. The disagreement is recorded rather than papered
 * over — see the run report.
 */

import { CopyRun } from "./CopyRuns";
import {
  DATA_REGION, DELETION_WINDOW_DAYS, LEGAL_ENTITY_NAME, LEGAL_LAST_UPDATED, PRIVACY_LAST_UPDATED,
  REGISTERED_ADDRESS, SUPPORT_EMAIL, supportMailto,
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
  | { kind: "callout"; runs: CopyRun[]; tone?: "navy" };

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
  /** Privacy only (privacy page v1): "The short version" as ticks, drawn in place of the lede. */
  shortVersion?: string[];
  /** Privacy only: true = no working-draft ribbon, whatever `LEGAL_COPY_REVIEWED` says. */
  ribbonOff?: boolean;
  sections: LegalSection[];
}

const p = (...runs: CopyRun[]): LegalBlock => ({ kind: "p", runs });
const list = (...items: CopyRun[][]): LegalBlock => ({ kind: "list", items });
const callout = (...runs: CopyRun[]): LegalBlock => ({ kind: "callout", runs });
const navyCallout = (...runs: CopyRun[]): LegalBlock => ({ kind: "callout", runs, tone: "navy" });

const privacyLink = (label = "privacy policy"): CopyRun => ({ link: label, to: "privacy" });
const supportLink = (subject?: string): CopyRun => ({
  link: SUPPORT_EMAIL,
  mailto: supportMailto(subject),
});

export const LEGAL_DOCUMENTS: Record<LegalDocumentKey, LegalDocument> = {
  /* ⚠️ PRIVACY PAGE v1 (2 Nov; ref design-refs/privacy-v1.html). No bracketed placeholder renders on
     /privacy and it carries no working-draft ribbon (PRIV-1). The entity, address and ICO placeholders
     are not read here any more; the Terms still read the first two. */
  privacy: {
    documentTitle: "Privacy Policy — QueryHawk",
    eyebrow: "",
    title: "Privacy",
    lastUpdated: PRIVACY_LAST_UPDATED,
    draftBody: "",
    lede: "",
    shortVersion: [
      "Your querying records and your writing belong to you.",
      "We collect only what the app needs to work.",
      "We don't sell it, and we don't run advertising.",
      "AI only does the admin. It never writes for you, and nothing you store trains it.",
    ],
    ribbonOff: true,
    sections: [
      {
        heading: "Who we are",
        blocks: [
          p(
            "QueryHawk is run by ", { b: "Nick" }, ", an aspiring writer in London, UK, with a background " +
            "in using data to tell stories (\"we\", \"us\"). We are the data controller for the " +
            "personal data described in this policy, and you can reach us at ", supportLink("Privacy"), ".",
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
      /* ⚠️ §4 STAYS §4: the Terms' "section 4 of the privacy policy" points here. Each bullet was
         checked against the code (2 Nov): Smart Import (functions/src/smartImport.ts), the email drop
         (emailImport.ts, writes nothing until accepted), comps (suggestComps.ts, reads the
         manuscript's details) and agent details (assistAgentData.ts, public facts with their sources;
         switched off behind ASSIST_LIVE, listed because the page describes the product). Smart Import
         accepts spreadsheets only today; "or notes" is kept at Nick's ruling. */
      {
        heading: "How we use AI",
        blocks: [
          navyCallout(
            { b: "AI does the admin, never the art." },
            " QueryHawk uses AI models only for menial, behind-the-scenes tasks: reading and sorting " +
            "information you give it, so you don't have to retype it. It never writes your query " +
            "letters, synopses or pages, never edits your work, and never creates or designs anything for you.",
          ),
          p("AI is used only when you run one of these features, never in the background:"),
          list(
            [{ b: "Smart Import" }, " — reads the spreadsheet or notes you upload and turns them into your agents and queries."],
            [{ b: "Smart Email Drop" }, " — reads an email you paste in and suggests the updates to make. Nothing changes until you accept them."],
            [{ b: "Comparable title suggestions" }, " — looks at the details you've entered about your manuscript and suggests published titles you might compare it to."],
            [{ b: "Finding agent details" }, " — looks up an agent's public submission information and shows you where each detail came from, for you to check."],
          ),
          p(
            "These tasks are processed on our behalf by ", { b: "Anthropic" },
            " (the maker of the Claude AI models). Under the commercial terms we use, Anthropic does " +
            "not use this data to train its models. The results are stored in your account; the " +
            "processing itself is transient.",
          ),
          callout(
            "Your manuscripts, pitches and notes stored in QueryHawk are ", { b: "not" },
            " sent to any AI service unless you run one of the features above.",
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
            "QueryHawk uses only what's strictly necessary to work: authentication tokens that " +
            "keep you signed in, and local storage that remembers interface preferences (like a " +
            "collapsed sidebar) on your own device. There are no advertising cookies and no " +
            "cross-site trackers, which is why you won't find a cookie banner here. We count " +
            "visits with Cloudflare Web Analytics, which doesn't use cookies or track you across sites.",
          ),
          p(
            "When you join the founding writers' waiting list, we note which link brought you " +
            "to the site (for example, our Instagram page), so we know where our writers come " +
            "from. It's stored with your sign-up and nowhere else.",
          ),
        ],
      },
      {
        heading: "Retention and deletion",
        blocks: [
          p(
            "Your records are kept for as long as your account exists. If you delete your account, " +
            "your data is deleted from our systems within ", { b: String(DELETION_WINDOW_DAYS) },
            " days, allowing for backup cycles.",
          ),
          /* ⚠️ THE 30 DAYS ABOVE (after ACCOUNT deletion) AND THE 24 MONTHS BELOW (an untouched waitlist
             entry) ARE DIFFERENT PROMISES ABOUT DIFFERENT THINGS; `waitlistRetention` enforces the second. */
          p(
            "If you join the founding writers' list we keep your email address, the page you signed " +
            "up from, and a one-way hash of your IP address — we never store the address itself. We " +
            "use it only to send you founding-access email: a confirmation, and your invite. It is " +
            "never sold, never shared, and never used for anything else.",
          ),
          p(
            "You can leave at any time using the unsubscribe link in any of those emails. It takes " +
            "effect immediately and frees your founding place. We also delete a waitlist entry " +
            "automatically ", { b: "24 months" }, " after we last heard from you, and within ",
            { b: "30 days" }, " of you unsubscribing. If you would rather we removed you sooner, email ",
            supportLink("Privacy"), " and we will.",
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
          p("QueryHawk is not directed at children and is intended for users aged 16 and over."),
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
    documentTitle: "Terms of Service — QueryHawk",
    eyebrow: "Legal · Terms",
    title: "Terms of Service",
    lastUpdated: LEGAL_LAST_UPDATED,
    draftBody:
      "These terms are a working draft and have not yet been legally reviewed. Bracketed items " +
      "are pending confirmation.",
    lede:
      "The plain-English promise underneath the legal text: you own everything you put into " +
      "QueryHawk, we'll be straight with you about what the service does, and neither of us " +
      "should need a lawyer to understand this page.",
    sections: [
      {
        heading: "Who we are and what you're agreeing to",
        blocks: [
          p(
            "These terms are an agreement between you and ", { b: LEGAL_ENTITY_NAME }, " of ",
            { b: REGISTERED_ADDRESS },
            ", United Kingdom. By creating an account or using QueryHawk, you accept them. How we " +
            "handle your personal data is set out separately in the ", privacyLink(), ".",
          ),
        ],
      },
      {
        heading: "The service",
        blocks: [
          p(
            "QueryHawk is a tool for tracking your literary agent querying process: your agents, " +
            "queries, manuscripts, submission packages, and the history of each exchange. It's a " +
            "record-keeper, not an adviser — it reports what you've recorded, and it doesn't " +
            "guarantee any outcome with any agent or publisher.",
          ),
          callout(
            { b: "Early-access notice." },
            " QueryHawk is newly launched and actively developed. Features may change, and " +
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
            "Everything you put into QueryHawk — manuscripts, pitches, notes, querying records — " +
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
            ["Don't use QueryHawk to store or transmit anything unlawful, or content you don't have the right to hold."],
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
            "QueryHawk is currently free to use. A paid Pro tier is planned; when it arrives, its " +
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
            "We work to keep QueryHawk available and your data safe, but as a small, early-stage " +
            "service it's provided \"as is\" — we can't promise uninterrupted availability. Nothing " +
            "in these terms excludes liability that can't legally be excluded (such as for death " +
            "or personal injury caused by negligence, or fraud). Beyond that, our total liability " +
            "to you is limited to the greater of £100 or the amount you've paid us in the twelve " +
            "months before the claim. You should keep your own copies of any manuscript files: " +
            "QueryHawk tracks your querying, it is not your manuscript's only home.",
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
