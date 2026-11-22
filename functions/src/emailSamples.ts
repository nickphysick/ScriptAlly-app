/**
 * emailSamples — all twelve emails rendered with the ref's own sample data (design-refs/emails-v1.html), under the
 * production configuration. Read by the verbatim locks (foundingEmails.test.ts) and by the renderer that writes
 * reports/non-workspace-v1/emails/ (scripts/render-emails.ts). Inputs only: the locks type their expected words
 * themselves.
 *
 * ⚠️ NOTHING HERE SENDS. Every value is a sample; the founder's code is the ref's, which exists nowhere.
 */
import { EmailKind, MailConfig, resolveMailConfig } from "./emailConfig";
import {
  Prepared, prepareConfirm, prepareEmailChanged, prepareInvite, prepareNewEmail, prepareNudge, preparePlanEnding,
  prepareReset, prepareSignIn, prepareTrialEnding, prepareWaiting, prepareWeekly, prepareWelcome,
} from "./emailTemplates";

export const SAMPLE_CFG: MailConfig = resolveMailConfig({
  WAITLIST_PUBLIC_URL: "https://queryhawk.net",
  APP_PUBLIC_URL: "https://scriptally-app.web.app",
});

const APP = "https://scriptally-app.web.app";
/** What Firebase's Admin SDK returns: its own action handler, with the continue URL inside. */
const FB = "https://scriptally-app.firebaseapp.com/__/auth/action";
export const SAMPLE_LINKS = {
  signin: `${FB}?apiKey=sample&mode=signIn&oobCode=SAMPLE-CODE&continueUrl=${encodeURIComponent(`${APP}/signin-link`)}&lang=en`,
  reset: `${FB}?apiKey=sample&mode=resetPassword&oobCode=SAMPLE-CODE&continueUrl=${encodeURIComponent(`${APP}/`)}&lang=en`,
  newEmail: `${FB}?apiKey=sample&mode=verifyAndChangeEmail&oobCode=SAMPLE-CODE&continueUrl=${encodeURIComponent(`${APP}/account/profile`)}&lang=en`,
};
/** Thursday 12 November 2026, 6.47pm in London (GMT). */
export const SAMPLE_WHEN = Date.UTC(2026, 10, 12, 18, 47);

export interface Sample { id: string; kind: EmailKind; prepared: Prepared }

export const renderSamples = (cfg: MailConfig = SAMPLE_CFG): Sample[] => [
  { id: "01-confirm", kind: "confirm", prepared: prepareConfirm(cfg, "sample-verify-token", "sample-unsub-token") },
  { id: "02-welcome", kind: "welcome", prepared: prepareWelcome(cfg, 14, 50, "sample-unsub-token") },
  { id: "03-reserve", kind: "waiting", prepared: prepareWaiting(cfg, "sample-unsub-token") },
  { id: "04-invite", kind: "invite", prepared: prepareInvite(cfg, { code: "QH-7K2M-9XTD", foundingNo: 14, cap: 50, unsubToken: "sample-unsub-token" }) },
  { id: "05-signin", kind: "signin", prepared: prepareSignIn(cfg, SAMPLE_LINKS.signin) },
  { id: "06-reset", kind: "reset", prepared: prepareReset(cfg, SAMPLE_LINKS.reset) },
  { id: "07-new-email", kind: "newEmail", prepared: prepareNewEmail(cfg, SAMPLE_LINKS.newEmail) },
  { id: "08-email-changed", kind: "emailChanged", prepared: prepareEmailChanged(cfg, { oldEmail: "maya.ellison@example.com", newEmail: "maya@newmail.example", whenMs: SAMPLE_WHEN }) },
  {
    id: "09-nudge", kind: "nudge", prepared: prepareNudge(cfg, {
      items: [{
        agent: { name: "Eleanor Whitfield", agency: "Greenfield Literary" }, manuscriptTitle: "The Salt Road",
        sentOn: "10 September", replyExpectedBy: "5 November", queryUrl: `${APP}/queries?query=sample`,
      }],
      nudgeAfter: "one week",
      turnOffUrl: `${APP}/account/emails?off=nudges`,
      changeWhenUrl: `${APP}/account/preferences`,
    }),
  },
  {
    id: "10-weekly", kind: "weekly", prepared: prepareWeekly(cfg, {
      weekPhrase: "Monday 2 to Sunday 8 November",
      happened: [
        { kind: "request", stage: "full", agent: { name: "Eleanor Whitfield", agency: "Greenfield Literary" } },
        { kind: "no", agent: { name: "Tom Aldous", agency: "Aldous & Finch" } },
        { kind: "sent", agentNames: ["Priya Raman", "James Okafor", "Clare Mott"] },
      ],
      coming: [
        { kind: "send", stage: "full", agentName: "Eleanor Whitfield", by: "Friday 13 November" },
        { kind: "nudge", agentName: "Hannah Reyes", on: "Thursday 12 November" },
        { kind: "replies", agentNames: ["Daniel Shaw", "Lucy Marsh"] },
      ],
      standing: { queriesOut: 14, requests: 3, sent: 22, quiet: 2 },
      turnOffUrl: `${APP}/account/emails?off=weekly`,
    }),
  },
  { id: "11-trial-ending", kind: "trialEnding", prepared: prepareTrialEnding(cfg, { endsWeekday: "Thursday", freeFrom: "Thursday 26 November", fromPrice: "£3.75" }) },
  {
    id: "12-plan-ending", kind: "planEnding", prepared: preparePlanEnding(cfg, {
      plan: "6-month", duration: "6 months", ends: "19 May", endsLong: "Wednesday 19 May", monthly: "£7.99", chargeDay: "19th",
    }),
  },
];
