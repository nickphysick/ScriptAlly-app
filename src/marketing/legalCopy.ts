/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Terms and Privacy copy. Privacy is privacy page v1's (2 Nov; design-refs/privacy-v1.html). The Terms
 * are design-refs/contact-terms-unsubscribe-v1.html's (12 Nov), in the privacy page's layout: "The
 * short version", then ten numbered sections, six of them opening "In plain words".
 *
 * ⚠️ THE TERMS ARE A WORKING DRAFT AND SAY SO ON THE PAGE. `LEGAL_COPY_REVIEWED` is false; the ribbon
 * renders because of that one flag. The PRIVACY policy left that state on 2 Nov (privacy page v1): it
 * names its controller (Nick, no surname), states the checked region, and carries no ribbon and no
 * bracketed text (`ribbonOff`; PRIV-1).
 *
 * ⚠️ THE TERMS NO LONGER READ THE ENTITY AND ADDRESS PLACEHOLDERS (12 Nov). The ref names who runs
 * QueryHawk the way Privacy does — Nick, in London — so no bracket renders on /terms. The placeholders
 * in `companyInfo.ts` are untouched; nothing on the public pages reads them now.
 *
 * ⚠️ PRIVACY §4 ("How we use AI") IS NOT OPTIONAL. Four features
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
  DATA_REGION, DELETION_WINDOW_DAYS, PRIVACY_LAST_UPDATED, SUPPORT_EMAIL, supportMailto,
} from "../lib/companyInfo";
import { DELETION_GRACE_DAYS } from "../lib/accountDeletion";
import { PLAN_LENGTHS_LINE, TRIAL_DAYS } from "../lib/planRules";

/**
 * ⚠️ ONE FLAG, ONE EFFECT. False = the Terms carry the working-draft ribbon (Privacy is `ribbonOff`).
 * Setting it true takes the ribbon away and touches nothing else.
 */
export const LEGAL_COPY_REVIEWED = false;

/** The ribbon's tag. */
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
  title: string;
  lastUpdated: string;
  /** The sentence on the working-draft ribbon. */
  draftBody: string;
  /** "The short version" as ticks, in the navy drawer under the date. */
  shortVersion?: string[];
  /** Privacy only: true = no working-draft ribbon, whatever `LEGAL_COPY_REVIEWED` says. */
  ribbonOff?: boolean;
  sections: LegalSection[];
}

const p = (...runs: CopyRun[]): LegalBlock => ({ kind: "p", runs });
const list = (...items: CopyRun[][]): LegalBlock => ({ kind: "list", items });
const callout = (...runs: CopyRun[]): LegalBlock => ({ kind: "callout", runs });
const navyCallout = (...runs: CopyRun[]): LegalBlock => ({ kind: "callout", runs, tone: "navy" });
/** The Terms' "In plain words:" line — the blush callout, its lead in bold. */
const plain = (rest: string): LegalBlock => callout({ b: "In plain words:" }, " " + rest);

/**
 * The Terms' own date. ⚠️ NOT `companyInfo.LEGAL_LAST_UPDATED` ("31 Oct 2026"): the wording changed on
 * 12 Nov and that file is outside this change, so the date lives with the words it dates. The old
 * constant is now read by nothing.
 */
export const TERMS_LAST_UPDATED = "12 November 2026";

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
    title: "Privacy",
    lastUpdated: PRIVACY_LAST_UPDATED,
    draftBody: "",
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
            { b: "We only use AI for admin." },
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
          /* Crash reporting v1 (8 Nov): every claim below is enforced in lib/sentryScrub.ts — the page
             without its query string, the error, the browser's name and version, and the Firebase uid. */
          p(
            "We use Sentry (Functional Software, Inc.) to tell us when something in QueryHawk breaks. " +
            "When an error happens, Sentry receives the page it happened on, the error itself, your " +
            "browser type and a random account ID, and stores them in the EU. It never receives what " +
            "you've written, your email address or your IP address.",
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

  /* ⚠️ TERMS v2 (12 Nov; design-refs/contact-terms-unsubscribe-v1.html), word for word except where the
     code says otherwise: the deletion window is `DELETION_GRACE_DAYS` (14), not the ref's 30, and the
     trial and plan lengths are read from `planRules`. Still a working draft: `LEGAL_COPY_REVIEWED` is
     false and the ribbon says so. Each "In plain words" line is the pulled-out callout Privacy uses. */
  terms: {
    documentTitle: "Terms of Service — QueryHawk",
    title: "Terms",
    lastUpdated: TERMS_LAST_UPDATED,
    draftBody: "These terms are a working draft and have not yet been legally reviewed.",
    shortVersion: [
      "Your writing and your querying records stay yours.",
      "QueryHawk keeps records and reminds you. It never writes for you or contacts agents.",
      "Nothing is charged unless you choose a plan.",
      "You can take a copy of your data, or leave, at any time.",
    ],
    sections: [
      {
        heading: "Who we are and what you're agreeing to",
        blocks: [
          plain("this is the deal between you and QueryHawk."),
          p(
            "These terms are an agreement between you and QueryHawk, which is run by Nick in London, " +
            "UK. By creating an account or using QueryHawk, you accept them.",
          ),
          p("How we handle your personal data is set out separately in the ", privacyLink("Privacy policy"), "."),
        ],
      },
      {
        heading: "The service",
        blocks: [
          plain("QueryHawk keeps your querying records and reminds you. You do the querying."),
          p(
            "QueryHawk helps you record the literary agents you approach, what you sent, and what came " +
            "back, and reminds you when something needs you.",
          ),
          p(
            "It does not contact agents for you, and it cannot promise any agent will reply or offer " +
            "representation.",
          ),
        ],
      },
      {
        heading: "Your account",
        blocks: [
          p("Keep your sign-in details to yourself, and tell us if you think someone else has used your account."),
        ],
      },
      {
        heading: "Your content",
        blocks: [
          plain("what you write is yours."),
          p(
            "Your manuscripts, query letters, notes and records remain yours. You give us permission to " +
            "store and display them to you so the service can work, and for nothing else.",
          ),
        ],
      },
      {
        heading: "Acceptable use",
        blocks: [
          p(
            "Use QueryHawk for your own querying. Don't try to break it, copy it wholesale, or use it to " +
            "send unsolicited messages.",
          ),
        ],
      },
      {
        heading: "Automated features",
        blocks: [
          plain("automation does the admin. It never writes for you."),
          p(
            "Smart Import and Smart email drop read what you give them and file it in your records. " +
            "Nothing you store is used to train any model.",
          ),
        ],
      },
      {
        heading: "Plans and fees",
        blocks: [
          plain("nothing is charged unless you choose a plan."),
          p("Founding writers use QueryHawk free for their whole querying campaign."),
          p(
            `After launch, new accounts begin with ${TRIAL_DAYS} days of Pro and then continue on the Free ` +
            `plan. Paid plans run for ${PLAN_LENGTHS_LINE} and then roll on to monthly until you stop ` +
            "them. We remind you a week before a plan ends.",
          ),
        ],
      },
      {
        heading: "Availability, and things going wrong",
        blocks: [
          p(
            "We work hard to keep QueryHawk running and your records safe, but we can't promise it will " +
            "never be unavailable.",
          ),
        ],
      },
      {
        heading: "Ending things",
        blocks: [
          plain("you can leave at any time and take your records with you."),
          p(
            "You can take a copy of your data or delete your account from Settings › Your data. " +
            `Deletion has a ${DELETION_GRACE_DAYS}-day window in which you can change your mind.`,
          ),
        ],
      },
      {
        heading: "Changes and governing law",
        blocks: [
          p(
            "If these terms change in a way that matters, we'll tell you by email before the change " +
            "takes effect. These terms are governed by the law of England and Wales.",
          ),
        ],
      },
    ],
  },
};
