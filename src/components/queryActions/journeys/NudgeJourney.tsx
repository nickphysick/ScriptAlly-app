/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * D4 · NUDGE (design-refs/query-actions-v11.html §3.12, "where it stands" variant A).
 * Where it stands → (The nudge → If it's still quiet) or (When to nudge) → Check and log / schedule.
 *
 * K4 — the nudge fields keep their recorded meaning. Logging a nudge writes a NON-STATUS "Nudge
 * sent" row (both stores, one id) and sets `lastNudgeSentDate`; it never touches status or
 * `responseDeadline`. "Remind me to send one" is `nudgeDate`. "Consider closing on …" is
 * `closePlan`, which `replyTask` reads. The drawer writes NO task or dismissal document — the old
 * `logNudge` wrote a task flag, which is why it is not called here.
 */
import React, { useState } from "react";
import { deleteField, doc, setDoc } from "firebase/firestore";
import { db as fsdb } from "../../../lib/firebase";
import { useScriptAllyDb } from "../../../lib/db";
import { ActivityType, SubmissionMethod, type Query } from "../../../types";
import { buildNudgeWrites } from "../../../lib/logNudge";
import {
  addDays, dayDiff, dayIso, fmt, futureWeeks, pastAnchors, reminderAnchors, rel, sameDay, toDay, up, type Anchor,
} from "../../../lib/queryActions/dates";
import type { TrackPoint } from "../../../lib/queryActions/track";
import { Chips, DateField, Fl, Note, PlanTrack, Radios, TextBox, Who } from "../controls";
import type { JourneyProps } from "../QueryDrawer";
import type { Guard, JourneyStep, JourneyView } from "../journey";
import { emptyView } from "./ResponseJourney";
import { agentName, firstName, lastSendDay, nrmnOf, viaLabel, viaOptions, whoLine, windowDay } from "./common";

type Tab = "sent" | "plan";

export function nudgeDays(q: Query, activities: { queryId: string; activityType: string; date: string }[]): Date[] {
  const fromFeed = activities.filter((a) => a.queryId === q.id && a.activityType === ActivityType.NUDGE_SENT).map((a) => toDay(a.date)).filter(Boolean) as Date[];
  const last = toDay(q.lastNudgeSentDate);
  const all = last && !fromFeed.some((d) => sameDay(d, last)) ? [...fromFeed, last] : fromFeed;
  return all.sort((a, b) => a.getTime() - b.getTime());
}

export function NudgeJourney({ req, today, children, switchTo }: JourneyProps) {
  const db = useScriptAllyDb();
  const q = db.queries.find((x) => x.id === req.queryId) || null;
  const agent = q ? db.agents.find((a) => a.id === q.agentId) || null : null;
  const [tabPick, setTabPick] = useState<Tab | null>(req.preset?.nudgeTab ?? null);
  const [sent, setSent] = useState<Date>(today);
  const [via, setVia] = useState<SubmissionMethod>((agent?.submissionMethod as SubmissionMethod) || (q?.sendMethod as SubmissionMethod) || SubmissionMethod.EMAIL);
  const [said, setSaid] = useState("");
  const [thenMode, setThenMode] = useState("4w");
  const [thenCustom, setThenCustom] = useState<Date | null>(null);
  const [whenMode, setWhenMode] = useState<string | null>(null);
  const [whenCustom, setWhenCustom] = useState<Date | null>(null);
  const [touched, setTouched] = useState(false);

  if (!q) return children(emptyView("NUDGE", "Nudge"));
  const first = firstName(agent);
  const start = lastSendDay(q) ?? today;
  const fs = !!toDay(q.fullSentDate);
  const win = windowDay(q, agent) ?? addDays(start, 56);
  const past = dayDiff(today, win);
  const nudges = nudgeDays(q, db.activities);
  const lastN = nudges.length ? nudges[nudges.length - 1] : null;
  const nrmn = nrmnOf(q, agent);
  const planned = toDay(q.nudgeDate);
  const plannedAhead = planned && dayDiff(planned, today) >= 0 ? planned : null;

  /* the suggestion (nudgeRec) */
  const rc = past < 0 ? { tab: "plan" as Tab, rec: "plan" }
    : nudges.length ? { tab: "sent" as Tab, rec: "close" }
    : nrmn ? { tab: "sent" as Tab, rec: "close" }
    : { tab: "sent" as Tab, rec: "sent" };
  const tab: Tab = tabPick ?? rc.tab;
  const closeOffered = rc.rec === "close" || past >= 28;

  const wksN = Math.max(1, Math.round(dayDiff(win, start) / 7));
  const winTxt = past > 0 ? `closed ${past === 1 ? "yesterday" : rel(win, today)}` : past === 0 ? "closes today" : `closes ${rel(win, today)}`;
  const soFar: TrackPoint[] = [
    ...(fs ? [{ l: "Queried", d: toDay(q.dateSent) ?? start, c: "done" as const }] : []),
    { l: fs ? "Full sent" : "Queried", d: start, c: "done" },
    { l: past >= 0 ? "Window closed" : "Window closes", d: win, c: past >= 0 ? "done" : "fut" },
    ...nudges.map((n) => ({ l: "Nudged", d: n, c: "nudge" as const })),
  ];
  const lastPt = soFar.reduce((m, p) => (p.d > m ? p.d : m), soFar[0].d);
  if (dayDiff(today, lastPt) > 0) soFar.push({ l: "Today", d: today, c: "today" });

  const paths = [
    { k: "sent" as const, title: "I’ve sent a nudge", sub: "Record it, and plan what happens if it’s still quiet" },
    { k: "plan" as const, title: "Remind me to send one", sub: "Put it on your to-do list for the right day" },
    ...(closeOffered ? [{ k: "close" as const, title: "Close it instead", sub: "If it’s time to move on" }] : []),
  ].map((p) => ({ ...p, tag: rc.rec === p.k ? "SUGGESTED" : undefined }));

  const steps: JourneyStep[] = [{
    title: "Where it stands",
    summary: tab === "sent" ? "Logging a nudge" : "Reminder to nudge",
    body: (
      <>
        <PlanTrack plan={{ title: "SO FAR", points: soFar }} className="qad-wsa" />
        <p className="qad-wsl">{first}'s {wksN}-week {fs ? "reading " : ""}window {winTxt}, and {lastN ? `you nudged on ${fmt(lastN)}` : "you haven't nudged yet"}.</p>
        {plannedAhead ? <Note kind="info" tag="PLANNED">You planned to nudge on <b>{fmt(plannedAhead)}</b>.</Note> : null}
        <Fl>WHAT WOULD YOU LIKE TO DO?</Fl>
        <Radios value={tab} options={paths}
          onPick={(k) => { if (k === "close") { switchTo("close"); return; } setTabPick(k); setTouched(true); }} />
      </>
    ),
  }];

  const ear: Guard | null = past < 0 ? { level: "check", msg: `Earlier than ${first}'s window — it closes ${fmt(win)}` }
    : nudges.length ? { level: "check", msg: `A second nudge — you last nudged ${fmt(lastN!)}` }
    : nrmn ? { level: "check", msg: `${first}'s guidelines say no reply means no` } : null;

  const thenAnch: Anchor[] = futureWeeks(sent, [["2w", "In two weeks", 14], ["4w", "In four weeks", 28], ["6w", "In six weeks", 42]])
    .map((x) => (x.k === "4w" ? { ...x, label: "In four weeks · usual" } : x));
  const then: Date = thenMode === "custom" && thenCustom ? thenCustom : (thenAnch.find((x) => x.k === thenMode) || thenAnch[1]).d!;
  const wAnch = past >= 0
    ? reminderAnchors(today, [["tm", "Tomorrow", 1], ["1w", "In a week", 7], ["2w", "In two weeks", 14]])
    : reminderAnchors(win, [["w0", "When the window closes", 0], ["week", "A week after", 7], ["2w", "Two weeks after", 14]]);
  const wKey = whenMode ?? (wAnch.find((x) => x.k === "week") || wAnch[0]).k;
  const wHit = wAnch.find((x) => x.k === wKey);
  const when: Date = wKey === "custom" && whenCustom ? whenCustom : (wHit || wAnch[0]).d!;
  const wShift = wKey !== "custom" && !!wHit && !sameDay(wHit.raw, wHit.d);

  let view: JourneyView;
  if (tab === "sent") {
    const bad: Guard | null = dayDiff(sent, toDay(q.dateSent) ?? start) < 0 ? { level: "block", msg: "That date is before you queried" } : ear;
    steps.push({
      title: "The nudge",
      summary: `${fmt(sent)} · ${viaLabel(via)}`,
      guard: bad,
      body: (
        <>
          <DateField id="nSent" label="NUDGED ON" value={sent} anchors={pastAnchors(today)} dir="past" onPick={(d) => { if (d) { setSent(d); setTouched(true); } }} />
          <Fl>VIA</Fl>
          <Chips<SubmissionMethod> name="via" options={viaOptions(agent)} value={via} onPick={(k) => { setVia(k); setTouched(true); }} />
          <Fl>WHAT YOU SAID · OPTIONAL</Fl>
          <TextBox value={said} onChange={(v) => { setSaid(v); setTouched(true); }} placeholder="Paste it in if you want it on the record." />
        </>
      ),
    });
    steps.push({
      title: "If it's still quiet",
      summary: `Consider closing ${fmt(then)}`,
      plan: {
        title: "THE PLAN",
        points: [
          { l: "Queried", d: toDay(q.dateSent) ?? start, c: "done" },
          { l: past >= 0 ? "Window closed" : "Window closes", d: win, c: past >= 0 ? "done" : "fut" },
          ...nudges.map((n) => ({ l: "Nudged", d: n, c: "nudge" as const })),
          { l: nudges.length ? "Nudged again" : "Nudged", d: sent, c: "nudge" },
          { l: "Consider closing", d: then, c: "close" },
        ],
      },
      body: (
        <>
          <p className="qad-secs">A nudge usually gets an answer within a month, or never.</p>
          <DateField id="nThen" label="CONSIDER CLOSING ON" value={then} anchors={thenAnch} dir="future" forceKey={thenMode === "custom" ? null : thenMode}
            onPick={(d, k) => { if (!d) return; if (k === "custom") { setThenMode("custom"); setThenCustom(d); } else setThenMode(k); setTouched(true); }} />
        </>
      ),
    });
    view = {
      eyebrow: "NUDGE", title: "Nudge", verb: "log", verbDone: "logged", button: "Log nudge", ok: true, steps,
      saves: [
        { text: <><b>Nudge sent</b> to {agentName(agent)}, {fmt(sent)}, via {viaLabel(via)}</>, dot: "var(--qad-blush)" },
        { text: `The overdue flag clears; the row reads “Nudged ${up(sent)}”` },
        { text: `“Consider closing” lands on your to-do on ${fmt(then)}`, dot: "var(--qad-stone)" },
        ...(plannedAhead ? [{ text: `Your planned reminder for ${fmt(plannedAhead)} is done — it comes off your to-do` }] : []),
      ],
      who: <Who name={agentName(agent)} sub={whoLine(agent, q)} nrmn={nrmn} />,
      dirty: touched, touched: () => [q.id],
      commit: async () => {
        if (!db.currentUser) throw new Error("Signed out");
        const uid = db.currentUser.id;
        const w = buildNudgeWrites(q, agent, { checkBackDate: dayIso(then), note: said, eventDate: dayIso(sent) } as never, new Date());
        const id = "act-" + Math.random().toString(36).slice(2, 11);
        const details = `${w.activity.details} · via ${viaLabel(via)}`;
        await setDoc(doc(fsdb, "users", uid, "queries", q.id, "activity", id), { ...w.nested, note: details, eventKey: "nudge_sent" });
        await setDoc(doc(fsdb, "users", uid, "activities", id), { ...w.activity, details, id, userId: uid, eventKey: "nudge_sent" });
        await db.updateQuery(q.id, { lastNudgeSentDate: w.queryUpdates.lastNudgeSentDate, closePlan: dayIso(then), nudgeDate: deleteField() } as unknown as Partial<Query>);
        return { queryId: q.id, message: `Nudge logged · ${agentName(agent)}`, sub: `CONSIDER CLOSING ${up(then)}`, touched: [q.id] };
      },
    };
  } else {
    const early: Guard | null = dayDiff(when, win) < 0 ? { level: "check", msg: `Before ${first}'s window closes on ${fmt(win)}` } : null;
    steps.push({
      title: "When to nudge",
      summary: fmt(when),
      guard: early,
      ownWarn: !!early,
      plan: {
        title: "THE PLAN",
        points: [
          { l: "Queried", d: toDay(q.dateSent) ?? start, c: "done" },
          { l: past >= 0 ? "Window closed" : "Window closes", d: win, c: past >= 0 ? "done" : "fut" },
          { l: "Nudge", d: when, c: "nudge" },
          { l: "Consider closing", d: addDays(when, 28), c: "close", s: "4 WKS ON" },
        ],
      },
      body: (
        <>
          <p className="qad-secs">{past >= 0 ? "The window has passed, so any day from now is fair." : "Most agents say to wait until the window closes, then give it a week."}</p>
          <DateField id="nWhen" label="REMIND ME ON" value={when} anchors={wAnch} dir="future" shift={wShift} forceKey={wKey === "custom" ? null : wKey}
            onPick={(d, k) => { if (!d) return; if (k === "custom") { setWhenMode("custom"); setWhenCustom(d); } else setWhenMode(k); setTouched(true); }} />
          {early ? <Note kind="warn" tag="EARLY">That's before {first}'s window closes on {fmt(win)}. An early nudge can read as impatient.</Note> : null}
        </>
      ),
    });
    view = {
      eyebrow: "NUDGE", title: "Nudge", verb: "schedule", verbDone: "scheduled", button: "Schedule nudge", ok: true, steps,
      saves: [
        { text: `“Nudge ${first}” on your to-do for ${fmt(when)} — tapping it opens this drawer, ready to log the nudge`, dot: "var(--qad-blush)" },
        { text: `The row reads “Nudge planned ${up(when)}” until then, instead of overdue` },
        { text: "If they reply first, the reminder cancels itself" },
      ],
      who: <Who name={agentName(agent)} sub={whoLine(agent, q)} nrmn={nrmn} />,
      dirty: touched, touched: () => [q.id],
      commit: async () => {
        await db.updateQuery(q.id, { nudgeDate: dayIso(when) });
        return { queryId: q.id, message: `Nudge planned · ${agentName(agent)}`, sub: `REMINDER ON ${up(when)}`, touched: [q.id] };
      },
    };
  }
  return children(view, req.preset?.nudgeTab === "sent" ? 1 : undefined);
}
