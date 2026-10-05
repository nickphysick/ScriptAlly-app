/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * D5 · CLOSE A QUERY (design-refs/query-actions-v11.html §3.13).
 * Where it stands → (details) → Check and close.
 *
 * "They said no" is a response, not a close: it hands the drawer to D2 with Pass chosen. The three
 * closes write through `recordQueryResponse` (the one path), so the closure is a rung in the log and
 * the status is derived from it:
 *   No reply                     → No Response · `closingReason` noResponseAfterWindow · closed_no_reply
 *   I'm withdrawing              → Withdrawn   · `closingReason` withdrew              · withdrawn
 *   They've stopped taking queries → Withdrawn · `closingReason` agent_closed          · closed_agent_gone
 * Any planned nudge and "Consider closing" come off; a "Your move" request is dropped with the
 * status. The agent stays on the Contact list.
 */
import React, { useState } from "react";
import { deleteField } from "firebase/firestore";
import { useScriptAllyDb } from "../../../lib/db";
import { QueryStatus, type EventKey, type Query } from "../../../types";
import { recordQueryResponse, type RecordResponseData } from "../../../lib/recordResponse";
import { addDays, dayDiff, dayIso, dm, fmt, offWeekend, pastAnchors, rel, toDay, type Anchor } from "../../../lib/queryActions/dates";
import type { TrackPoint } from "../../../lib/queryActions/track";
import { Chips, DateField, Fl, Note, PlanTrack, Radios, TextBox, Toggle, Who } from "../controls";
import type { JourneyProps } from "../QueryDrawer";
import type { Guard, JourneyStep, JourneyView } from "../journey";
import { emptyView } from "./ResponseJourney";
import { nudgeDays } from "./NudgeJourney";
import { agentName, dayIn, dayOut, firstName, lastSendDay, nrmnOf, owes, seedOf, whoLine, windowDay } from "./common";

type Why = "noreply" | "said" | "withdraw" | "gone";
const WHY: Record<Why, [string, string]> = {
  noreply: ["No reply", "The window has passed and it’s gone quiet"],
  said: ["They said no", "A pass is a response — we’ll record it as one"],
  withdraw: ["I’m withdrawing", "You’re taking it off their desk"],
  gone: ["They’ve stopped taking queries", "Closed to queries, or left the agency"],
};

/** Parking (§6.4): every answer as plain data, days as `YYYY-MM-DD`. */
interface CloseAnswers {
  why: Why | null; on: string | null; wd: "offer" | "revise" | "other"; told: boolean; remindTell: boolean;
  recheck: "3m" | "6m" | "no"; note: string;
}

export function CloseJourney({ req, today, children, switchTo }: JourneyProps) {
  const db = useScriptAllyDb();
  const S = seedOf<CloseAnswers>(req);
  const q = db.queries.find((x) => x.id === req.queryId) || null;
  const agent = q ? db.agents.find((a) => a.id === q.agentId) || null : null;
  const initialWhy = (): Why | null => {
    if (req.preset?.closeWhy) return req.preset.closeWhy;
    if (!q) return null;
    const w = windowDay(q, agent);
    return w && dayDiff(today, w) > 0 && !owes(q) ? "noreply" : null;
  };
  const [why, setWhy] = useState<Why | null>(S.why !== undefined ? () => S.why ?? null : initialWhy);
  const [on, setOn] = useState<Date>(dayIn(S.on) ?? today);
  const [wd, setWd] = useState<"offer" | "revise" | "other">(S.wd ?? "offer");
  const [told, setTold] = useState(S.told ?? false);
  const [remindTell, setRemindTell] = useState(S.remindTell ?? true);
  const [recheck, setRecheck] = useState<"3m" | "6m" | "no">(S.recheck ?? "3m");
  const [note, setNote] = useState(S.note ?? "");
  /* a resumed journey was parked WITH answers, so it starts answered */
  const [touched, setTouched] = useState(!!req.seed);

  if (!q) return children(emptyView("CLOSE QUERY", "Close query"));
  const first = firstName(agent);
  const owe = owes(q);
  const start = lastSendDay(q) ?? today;
  const win = windowDay(q, agent);
  const past = win ? dayDiff(today, win) : -1;
  const nudges = nudgeDays(q, db.activities);
  const planned = toDay(q.nudgeDate);
  const closePlan = toDay(q.closePlan);
  const sug: Why | null = past > 0 && !owe ? "noreply" : null;
  const due = toDay(q.expectedSendDate);

  const soFarPts = (extra: TrackPoint[] = []): TrackPoint[] => {
    if (owe) {
      const reqOn = (q.status === QueryStatus.FULL_REQUESTED ? toDay(q.fullRequestedDate) : toDay(q.partialRequestedDate)) ?? toDay(q.lastStatusChange) ?? today;
      return [
        { l: "Queried", d: toDay(q.dateSent) ?? reqOn, c: "done" },
        { l: q.status === QueryStatus.FULL_REQUESTED ? "Full requested" : q.status === QueryStatus.REVISE_RESUBMIT ? "Revise & resubmit" : "Partial requested", d: reqOn, c: "done" },
        ...(due ? [{ l: "Send by", d: due, c: "fut" as const }] : []),
        ...(extra.length ? extra : [{ l: "Today", d: today, c: "today" as const }]),
      ];
    }
    const pts: TrackPoint[] = [
      { l: toDay(q.fullSentDate) ? "Full sent" : "Queried", d: start, c: "done" },
      ...(win ? [{ l: past >= 0 ? "Window closed" : "Window closes", d: win, c: (past >= 0 ? "done" : "fut") as TrackPoint["c"] }] : []),
      ...nudges.map((n) => ({ l: "Nudged", d: n, c: "nudge" as const })),
      ...extra,
    ];
    return pts;
  };

  const whatOwed = q.status === QueryStatus.FULL_REQUESTED ? "full manuscript" : q.status === QueryStatus.PARTIAL_REQUESTED ? "partial" : "revision";
  const steps: JourneyStep[] = [{
    title: "Where it stands",
    summary: why ? WHY[why][0] : "Choose a reason",
    guard: why ? null : { level: "block", msg: "Choose why it’s closing" },
    body: (
      <>
        <PlanTrack plan={{ title: "SO FAR", points: soFarPts() }} className="qad-wsa" />
        {owe ? (
          <>
            <p className="qad-wsl">{first} asked for the {whatOwed}{due ? `, and it's due by ${fmt(due)}` : ""}.</p>
            <Note kind="warn" tag="YOUR MOVE">{first} is waiting on you. Closing drops the request — if you're not sending it, it's courteous to let {first} know.</Note>
          </>
        ) : (
          <p className="qad-wsl">
            {first}'s {win ? `${Math.max(1, Math.round(dayDiff(win, start) / 7))}-week ` : ""}window {win ? (past > 0 ? `closed ${rel(win, today)}` : past === 0 ? "closes today" : `closes ${rel(win, today)}`) : "isn't on record"}{nudges.length ? `, and you nudged on ${fmt(nudges[nudges.length - 1])}` : ""}.
          </p>
        )}
        <Fl>WHY IS IT CLOSING?</Fl>
        <Radios value={why}
          options={(Object.keys(WHY) as Why[]).filter((k) => !(owe && k === "noreply")).map((k) => ({
            k, title: WHY[k][0], sub: WHY[k][1],
            tag: sug === k ? "SUGGESTED" : k === "said" ? "RECORD A PASS →" : undefined, tagGo: k === "said",
          }))}
          onPick={(k) => { if (k === "said") { switchTo("resp", { respType: "pass", step: 1 }); return; } setWhy(k); setTouched(true); }} />
      </>
    ),
  }];

  if (why && why !== "said") {
    const early: Guard | null = why === "noreply" && win && past < 0 ? { level: "check", msg: `${first}'s window doesn't close until ${fmt(win)}` } : null;
    const bad: Guard | null = dayDiff(on, toDay(q.dateSent) ?? start) < 0 ? { level: "block", msg: "That date is before you queried" } : early;
    const anch: Anchor[] = pastAnchors(today);
    if (why === "noreply" && win && past > 0) anch.push({ k: "win", label: "When the window closed", d: win, sub: dm(win) });
    const title = why === "noreply" ? "Calling it" : why === "withdraw" ? "Withdrawing" : "Their status";
    const wdLabel = { offer: "Offer elsewhere", revise: "Revising the book", other: "Other reason" }[wd];
    steps.push({
      title,
      summary: why === "withdraw" ? `${wdLabel} · ${fmt(on)}` : fmt(on),
      guard: bad,
      plan: { title: "THE RECORD", points: soFarPts([{ l: "Closed", d: on, c: "close" }]) },
      body: (
        <>
          {why === "noreply" ? (
            <>
              <DateField id="closeOn" label="CLOSED ON" value={on} anchors={anch} dir="past" onPick={(d) => { if (d) { setOn(d); setTouched(true); } }} />
              <Note kind="info" tag="FOR THE RECORD">{dayDiff(on, start)} days of silence{nudges.length ? ` and ${nudges.length === 1 ? "one nudge" : `${nudges.length} nudges`}` : ""}. Analytics counts this as “no reply”, not a pass.</Note>
            </>
          ) : null}
          {why === "withdraw" ? (
            <>
              <Fl>WHY</Fl>
              <Chips<"offer" | "revise" | "other"> name="wd" value={wd} onPick={(k) => { setWd(k); setTouched(true); }}
                options={[["offer", "An offer elsewhere"], ["revise", "I’m revising the book"], ["other", "Something else"]]} />
              {wd === "offer" ? <Note kind="info" tag="TIP">Recording the offer on that agent's query sets up “tell the others” for every agent at once — including {first}.</Note> : null}
              <DateField id="closeOn" label="WITHDRAWN ON" value={on} anchors={anch} dir="past" onPick={(d) => { if (d) { setOn(d); setTouched(true); } }} />
              <Toggle testId="told" on={told} onClick={() => { setTold(!told); setTouched(true); }} style={{ marginTop: 16 }}>I’ve told {first}</Toggle>
              {!told ? <Toggle testId="remind" on={remindTell} onClick={() => { setRemindTell(!remindTell); setTouched(true); }} small="TOMORROW">Remind me to tell {first}</Toggle> : null}
            </>
          ) : null}
          {why === "gone" ? (
            <>
              <DateField id="closeOn" label="CLOSED ON" value={on} anchors={anch} dir="past" onPick={(d) => { if (d) { setOn(d); setTouched(true); } }} />
              <Fl>CHECK BACK ON {first.toUpperCase()}</Fl>
              <Chips<"3m" | "6m" | "no"> name="recheck" value={recheck} onPick={(k) => { setRecheck(k); setTouched(true); }} options={[["3m", "In 3 months"], ["6m", "In 6 months"], ["no", "No need"]]} />
              <p className="qad-secs" style={{ marginTop: 8 }}>A reminder to see whether they've reopened, or where they've moved to.</p>
            </>
          ) : null}
          <Fl>NOTE · OPTIONAL</Fl>
          <TextBox value={note} onChange={(v) => { setNote(v); setTouched(true); }} placeholder="A line for future you." />
        </>
      ),
    });
  }

  const rsn = why === "noreply" ? "no reply" : why === "withdraw" ? "withdrawn" : "closed to queries";
  const recheckOn = recheck === "no" ? null : addDays(today, recheck === "3m" ? 91 : 182);
  const view: JourneyView = {
    eyebrow: "CLOSE QUERY", title: "Close query", verb: "close", verbDone: "closed", button: "Close query",
    ok: true, steps,
    saves: why && why !== "said" ? [
      { text: `Query closed · ${rsn} · ${fmt(on)}`, dot: "var(--qad-stone)" },
      { text: "It leaves your active queries and the Birds-eye view; the full history stays on the query" },
      ...(planned ? [{ text: `Your planned nudge (${fmt(planned)}) comes off your to-do` }] : []),
      ...(closePlan ? [{ text: `“Consider closing” (${fmt(closePlan)}) is done — it comes off your to-do` }] : []),
      ...(owe ? [{ text: `The ${String(q.status).toLowerCase()} is dropped from “Your move”` }] : []),
      ...(why === "withdraw" && !told && remindTell ? [{ text: `“Tell ${first} you've withdrawn” on your to-do for ${fmt(offWeekend(addDays(today, 1)))}`, dot: "var(--qad-blush)" }] : []),
      ...(why === "gone" && recheckOn ? [{ text: `“Check on ${first}” on your to-do in ${recheck === "3m" ? "3" : "6"} months`, dot: "var(--qad-blush)" }] : []),
      { text: `${first} stays on your Contact list, marked as queried for this book — free to query with your next book` },
    ] : [],
    who: <Who name={agentName(agent)} sub={whoLine(agent, q)} nrmn={nrmnOf(q, agent)} />,
    dirty: touched,
    snapshot: (): CloseAnswers => ({ why, on: dayOut(on), wd, told, remindTell, recheck, note }),
    touched: () => [q.id],
    commit: async () => {
      if (!why || why === "said" || !db.currentUser) throw new Error("No reason chosen");
      const ms = db.manuscripts.find((m) => m.id === q.manuscriptId) || null;
      const key: EventKey = why === "noreply" ? "closed_no_reply" : why === "withdraw" ? "withdrawn" : "closed_agent_gone";
      const data: RecordResponseData = {
        responseType: "close",
        materialsType: "Pages", materialsQuantity: 0, materialsOtherText: "", expectedBy: "", sendReminderDate: "",
        dateReceived: dayIso(on), rrNotes: "", feedbackType: "Form", feedbackText: "", privateReflection: "", rejectionLesson: "",
        requeryPreference: "", offerDate: "", offerDeadline: "", offerNotes: "",
        closingReason: why === "noreply" ? "No response after expected window" : why === "withdraw" ? "Withdrew my submission" : "Agent no longer accepting queries",
        closingNotes: [why === "withdraw" ? `${{ offer: "An offer elsewhere", revise: "Revising the book", other: "Something else" }[wd]}` : "", note.trim()].filter(Boolean).join(" · "),
        eventKey: key,
        ...(why === "gone" ? { closeAs: "withdrawn" as const, closingToken: "agent_closed" } : {}),
      };
      await recordQueryResponse({ userId: db.currentUser.id, query: q, agent, manuscript: ms }, data);
      const extra: Record<string, unknown> = {};
      if (q.nudgeDate) extra.nudgeDate = deleteField();
      if (q.closePlan) extra.closePlan = deleteField();
      if (why === "withdraw" && !told && remindTell) extra.withdrawTold = false;
      if (why === "gone" && recheckOn) extra.agentRecheckOn = dayIso(recheckOn);
      if (Object.keys(extra).length) await db.updateQuery(q.id, extra as Partial<Query>);
      return { queryId: q.id, message: `Query closed · ${agentName(agent)}`, sub: "AGENT STAYS ON YOUR CONTACT LIST", touched: [q.id] };
    },
  };
  return children(view);
}
