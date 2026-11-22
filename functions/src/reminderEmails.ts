/**
 * Nudge reminders and the weekly summary — scheduled (non-workspace v1, Phase 9e).
 *
 * ⚠️ ONE SERVER FLAG, OFF: `REMINDER_EMAILS` must equal "on" in the function's environment for anything to send. It is
 *    set in no env file, on dev or prod, so both schedulers run, plan, log what they WOULD send, and send nothing.
 * ⚠️ EACH WRITER'S OWN SETTINGS: Settings › Emails' toggles (`notifyPrefs.nudges`, `notifyPrefs.weeklyDigest`, default
 *    on — the client's NOTIFY_DEFAULT) and the writer's query clock (`workspacePrefs.clock`, defaults below = the
 *    client's CLOCK_DEFAULTS, held equal by reminderEmails.test.ts).
 * ⚠️ SEVERAL NUDGES DUE ON ONE DAY ARE ONE EMAIL. A weekly with nothing in it is skipped.
 * ⚠️ PLANNING IS PURE (`planNudge`, `planWeekly`) so the rules are tested without a database or a send.
 * Days are UTC calendar days; reply dates come from the query's stored `responseDeadline`, else its send date plus the
 * agent's stated weeks, else the clock's reply window.
 */
import { onSchedule } from "firebase-functions/v2/scheduler";
import type { Firestore } from "firebase-admin/firestore";
import { db } from "./firestore";
import { prepareNudge, prepareWeekly, type NudgeItem, type WeeklyComing, type WeeklyHappened } from "./emailTemplates";
import { resolveMailConfig, appLink, emailSettingsLink, APP_PATHS, type MailConfig } from "./emailConfig";
import { sendEmail, RESEND_API_KEY } from "./email";
import { makeSettingsToken } from "./emailSettingsCore";

/* The secret that signs the email settings link — waitlistMail's IP_HASH_SALT, bound by NAME and read from the
   environment, because importing waitlistMail would pull the waitlist's mail chain into src/lib/queryClock.test.ts's
   type-check (it imports this module for the clock parity). */
const SETTINGS_SECRET = "WAITLIST_IP_SALT";

const DAY = 86_400_000;
export const SERVER_CLOCK_DEFAULTS = { replyWeeks: 8, nudgeAfterWeeks: 2, checkBackWeeks: 2, quietWeeks: 4 } as const;
export const REMINDER_FLAG_ENV = "REMINDER_EMAILS";
export const remindersOn = (env: NodeJS.ProcessEnv = process.env) => env[REMINDER_FLAG_ENV] === "on";

const AGENTS_COURT = new Set(["Queried", "Partial Sent", "Full Sent", "Resubmitted"]);
const REQUESTS = new Set(["Partial Requested", "Full Requested"]);

export interface RUser { uid: string; email: string | null; notifyPrefs?: { nudges?: unknown; weeklyDigest?: unknown }; workspacePrefs?: { clock?: Record<string, unknown> } }
export interface RQuery { id: string; status: string; agentId: string; manuscriptId: string; dateSent?: string; responseDeadline?: string; lastNudgeSentDate?: string }
export interface RAgent { id: string; name?: string; agency?: string | null; responseTimeWeeks?: number }
export interface RManuscript { id: string; title?: string }

const on = (v: unknown) => (typeof v === "boolean" ? v : true);
const weeks = (v: unknown, d: number) => (typeof v === "number" && v >= 0 && v <= 52 ? v : d);
const dayKey = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const longDay = (ms: number) => new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "long", timeZone: "UTC" });
const WORDS = ["no", "one", "two", "three", "four"];
const weekWord = (n: number) => `${WORDS[n] ?? n} week${n === 1 ? "" : "s"}`;

export function clockOf(u: RUser) {
  const c = u.workspacePrefs?.clock ?? {};
  return {
    replyWeeks: weeks(c.replyWeeks, SERVER_CLOCK_DEFAULTS.replyWeeks),
    nudgeAfterWeeks: weeks(c.nudgeAfterWeeks, SERVER_CLOCK_DEFAULTS.nudgeAfterWeeks),
    checkBackWeeks: weeks(c.checkBackWeeks, SERVER_CLOCK_DEFAULTS.checkBackWeeks),
    quietWeeks: weeks(c.quietWeeks, SERVER_CLOCK_DEFAULTS.quietWeeks),
  };
}

/** When the reply is expected and when a nudge is suggested, for a query in the agent's court that has not been nudged. */
export function nudgeDate(q: RQuery, agent: RAgent | undefined, u: RUser): { replyMs: number; nudgeMs: number } | null {
  if (!AGENTS_COURT.has(q.status) || !q.dateSent || q.lastNudgeSentDate) return null;
  const clock = clockOf(u);
  const sent = Date.parse(q.dateSent);
  if (Number.isNaN(sent)) return null;
  const stored = q.responseDeadline ? Date.parse(q.responseDeadline) : NaN;
  const replyMs = !Number.isNaN(stored) ? stored : sent + weeks(agent?.responseTimeWeeks, clock.replyWeeks) * 7 * DAY;
  return { replyMs, nudgeMs: replyMs + clock.nudgeAfterWeeks * 7 * DAY };
}

export interface Facts { user: RUser; queries: RQuery[]; agents: Map<string, RAgent>; manuscripts: Map<string, RManuscript> }

/** Today's nudges for one writer, or null when the toggle is off or nothing is due today. */
export function planNudge(f: Facts, nowMs: number, cfg: MailConfig): { items: NudgeItem[]; nudgeAfter: string } | null {
  if (!on(f.user.notifyPrefs?.nudges) || !f.user.email) return null;
  const today = dayKey(nowMs);
  const items: NudgeItem[] = [];
  for (const q of f.queries) {
    const d = nudgeDate(q, f.agents.get(q.agentId), f.user);
    if (!d || dayKey(d.nudgeMs) !== today) continue;
    const a = f.agents.get(q.agentId);
    items.push({
      agent: { name: a?.name ?? "the agent", agency: a?.agency ?? null },
      manuscriptTitle: f.manuscripts.get(q.manuscriptId)?.title ?? "your manuscript",
      sentOn: longDay(Date.parse(q.dateSent!)),
      replyExpectedBy: longDay(d.replyMs),
      queryUrl: appLink(cfg, `/queries?q=${encodeURIComponent(q.id)}`) ?? "",
    });
  }
  return items.length ? { items, nudgeAfter: weekWord(clockOf(f.user).nudgeAfterWeeks) } : null;
}

/** The past week and the week ahead, or null when the toggle is off or there is nothing to say. */
export function planWeekly(f: Facts, nowMs: number): { happened: WeeklyHappened[]; coming: WeeklyComing[]; standing: { queriesOut: number; requests: number; sent: number; quiet: number }; weekPhrase: string } | null {
  if (!on(f.user.notifyPrefs?.weeklyDigest) || !f.user.email) return null;
  const weekAgo = nowMs - 7 * DAY, weekOn = nowMs + 7 * DAY;
  const name = (q: RQuery) => f.agents.get(q.agentId)?.name ?? "an agent";
  const sentThisWeek = f.queries.filter((q) => q.dateSent && Date.parse(q.dateSent) >= weekAgo && Date.parse(q.dateSent) < nowMs);
  const happened: WeeklyHappened[] = sentThisWeek.length ? [{ kind: "sent", agentNames: sentThisWeek.map(name) }] : [];
  const coming: WeeklyComing[] = [];
  const clock = clockOf(f.user);
  let quiet = 0;
  for (const q of f.queries) {
    const d = nudgeDate(q, f.agents.get(q.agentId), f.user);
    if (!d) continue;
    if (d.nudgeMs >= nowMs && d.nudgeMs < weekOn) coming.push({ kind: "nudge", agentName: name(q), on: longDay(d.nudgeMs) });
    if (nowMs - d.replyMs > clock.quietWeeks * 7 * DAY) quiet++;
  }
  if (!happened.length && !coming.length) return null;
  const standing = {
    queriesOut: f.queries.filter((q) => AGENTS_COURT.has(q.status)).length,
    requests: f.queries.filter((q) => REQUESTS.has(q.status)).length,
    sent: f.queries.filter((q) => q.dateSent).length,
    quiet,
  };
  return { happened, coming, standing, weekPhrase: `${longDay(weekAgo)} to ${longDay(nowMs - DAY)}` };
}

export interface RunDeps {
  listUsers: () => Promise<RUser[]>;
  facts: (u: RUser) => Promise<Facts>;
  send: (to: string, kind: "nudge" | "weekly", email: unknown) => Promise<{ ok: boolean }>;
  flagOn: boolean;
  cfg: MailConfig;
  nowMs: number;
  /** The account's signed email-settings token (emailSettingsCore), or null — then the links need sign-in. */
  settingsToken?: (uid: string) => string | null;
}

/** Plan every writer, and send only when the flag is on. Returns what was planned and what was sent. */
export async function runReminders(kind: "nudge" | "weekly", deps: RunDeps): Promise<{ planned: number; sent: number }> {
  let planned = 0, sent = 0;
  const plainSettings = appLink(deps.cfg, APP_PATHS.emailSettings) ?? "";
  const changeWhenUrl = appLink(deps.cfg, "/account/preferences") ?? "";
  for (const u of await deps.listUsers()) {
    const f = await deps.facts(u);
    /* ⚠️ THIS writer's token: "Turn off" and "Email settings" open the no-sign-in page for this account only. The
       turn-off link also takes the RFC 8058 one-click POST, so it is the List-Unsubscribe target too. */
    const token = deps.settingsToken?.(u.uid) ?? null;
    const signedOff = emailSettingsLink(deps.cfg, token, kind === "nudge" ? "nudges" : "weekly");
    const settingsUrl = emailSettingsLink(deps.cfg, token);
    const turnOffUrl = signedOff ?? plainSettings;
    const signed = signedOff ? { settingsUrl, listUnsubscribeUrl: signedOff } : {};
    const prepared = kind === "nudge"
      ? (() => { const p = planNudge(f, deps.nowMs, deps.cfg); return p ? prepareNudge(deps.cfg, { ...p, turnOffUrl, changeWhenUrl, ...signed }) : null; })()
      : (() => { const p = planWeekly(f, deps.nowMs); return p ? prepareWeekly(deps.cfg, { ...p, turnOffUrl, ...signed }) : null; })();
    if (!prepared || !prepared.ok) continue;
    planned++;
    if (!deps.flagOn) continue;
    if ((await deps.send(u.email!, kind, prepared.email)).ok) sent++;
  }
  console.info(JSON.stringify({ event: `reminders.${kind}`, planned, sent, flagOn: deps.flagOn }));
  return { planned, sent };
}

/** Read one writer's records for planning. */
export async function factsFromStore(store: Firestore, u: RUser): Promise<Facts> {
  const [qs, as, ms] = await Promise.all(["queries", "agents", "manuscripts"].map((c) => store.collection(`users/${u.uid}/${c}`).get()));
  return {
    user: u,
    queries: qs.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<RQuery, "id">) })),
    agents: new Map(as.docs.map((d) => [d.id, { id: d.id, ...(d.data() as Omit<RAgent, "id">) }])),
    manuscripts: new Map(ms.docs.map((d) => [d.id, { id: d.id, ...(d.data() as Omit<RManuscript, "id">) }])),
  };
}

async function usersFromStore(store: Firestore): Promise<RUser[]> {
  const snap = await store.collection("users").get();
  return snap.docs.map((d) => ({ uid: d.id, email: (d.get("email") as string | undefined) ?? null, notifyPrefs: d.get("notifyPrefs"), workspacePrefs: d.get("workspacePrefs") }));
}

const schedule = (kind: "nudge" | "weekly") => async () => {
  const secret = process.env[SETTINGS_SECRET] ?? "";
  const nowMs = Date.now();
  await runReminders(kind, {
    settingsToken: (uid) => makeSettingsToken(uid, secret, nowMs),
    listUsers: () => usersFromStore(db),
    facts: (u) => factsFromStore(db, u),
    send: (to, k, email) => sendEmail(to, k, email as never),
    flagOn: remindersOn(),
    cfg: resolveMailConfig(process.env),
    nowMs,
  });
};

export const nudgeReminders = onSchedule(
  { schedule: "0 8 * * *", timeZone: "Europe/London", region: "europe-west2", timeoutSeconds: 300, memory: "256MiB", secrets: [RESEND_API_KEY, SETTINGS_SECRET] },
  schedule("nudge"),
);
export const weeklySummary = onSchedule(
  { schedule: "0 8 * * 1", timeZone: "Europe/London", region: "europe-west2", timeoutSeconds: 300, memory: "256MiB", secrets: [RESEND_API_KEY, SETTINGS_SECRET] },
  schedule("weekly"),
);
